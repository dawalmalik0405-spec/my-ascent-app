import uuid
from datetime import datetime, timezone
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from temporalio.client import Client

from src.core.config import get_settings, get_temporal_host
from src.core.logging import get_logger
from src.db.models import Approval, ApprovalStatus, Incident, IncidentEvent, IncidentSeverity, IncidentStatus, Workflow, WorkflowStatus
from src.events.bus import get_event_bus
from src.observability.metrics import active_incidents, workflow_started_total
from src.workflows.temporal.incident_workflow import IncidentResponseWorkflow, IncidentWorkflowInput

logger = get_logger(__name__)


class IncidentService:
    def __init__(self, session: AsyncSession):
        self.session = session
        self.settings = get_settings()

    async def ingest_alert(self, alert: dict[str, Any]) -> Incident:
        correlation_id = alert.get("correlation_id") or f"alert-{uuid.uuid4().hex[:12]}"
        severity_str = alert.get("severity", "high").lower()
        try:
            severity = IncidentSeverity(severity_str)
        except ValueError:
            severity = IncidentSeverity.HIGH

        incident = Incident(
            correlation_id=correlation_id,
            title=alert.get("title", alert.get("summary", "Operational Alert")),
            description=alert.get("description"),
            severity=severity,
            status=IncidentStatus.RECEIVED,
            service=alert.get("service"),
            environment=alert.get("environment", "production"),
            alert_payload=alert,
        )
        self.session.add(incident)
        await self.session.flush()

        self.session.add(
            IncidentEvent(
                incident_id=incident.id,
                event_type="alert.received",
                payload=alert,
            )
        )

        workflow_record = Workflow(
            module="incident",
            status=WorkflowStatus.PENDING,
            incident_id=incident.id,
            input_payload=alert,
        )
        self.session.add(workflow_record)
        await self.session.flush()

        bus = await get_event_bus()
        await bus.publish(
            "alerts",
            "alert.received",
            {"incident_id": str(incident.id), "correlation_id": correlation_id, **alert},
        )

        temporal_id = await self._start_temporal_workflow(incident, workflow_record)
        incident.temporal_workflow_id = temporal_id
        workflow_record.temporal_workflow_id = temporal_id
        workflow_record.status = WorkflowStatus.RUNNING
        workflow_record.started_at = datetime.now(timezone.utc)
        incident.status = IncidentStatus.TRIAGING

        active_incidents.labels(severity=severity.value).inc()
        workflow_started_total.labels(module="incident").inc()

        await self.session.commit()
        await self.session.refresh(incident)
        logger.info("incident_created", incident_id=str(incident.id), correlation_id=correlation_id)
        return incident

    async def _start_temporal_workflow(self, incident: Incident, workflow: Workflow) -> str:
        workflow_id = f"incident-{incident.correlation_id}"
        try:
            client = await Client.connect(
                get_temporal_host(),
                namespace=self.settings.temporal_namespace,
            )
            await client.start_workflow(
                IncidentResponseWorkflow.run,
                IncidentWorkflowInput(
                    incident_id=str(incident.id),
                    correlation_id=incident.correlation_id,
                    alert_payload=incident.alert_payload,
                    title=incident.title,
                    service=incident.service,
                    severity=incident.severity.value,
                ),
                id=workflow_id,
                task_queue=self.settings.temporal_task_queue,
            )
            return workflow_id
        except Exception as e:
            logger.warning("temporal_unavailable_fallback", error=str(e))
            await self._run_inline_workflow(incident)
            return f"inline-{workflow_id}"

    async def _run_inline_workflow(self, incident: Incident) -> None:
        from src.workflows.temporal.activities import (
            emit_cross_module_event,
            generate_incident_report,
            run_langgraph_investigation,
            update_incident_status,
            validate_recovery,
        )

        inv = run_langgraph_investigation
        investigation = await inv(
            str(incident.id),
            incident.correlation_id,
            incident.alert_payload,
            incident.title,
            incident.service,
        )
        await validate_recovery(str(incident.id), investigation)
        report = await generate_incident_report(str(incident.id), investigation)
        await update_incident_status(str(incident.id), "resolved", "inline_completed")
        await emit_cross_module_event(str(incident.id), investigation, report)

    async def get_incident(self, incident_id: uuid.UUID) -> Incident | None:
        return await self.session.get(Incident, incident_id)

    async def list_incidents(
        self, status: str | None = None, limit: int = 50, offset: int = 0
    ) -> list[Incident]:
        q = select(Incident).order_by(Incident.created_at.desc()).limit(limit).offset(offset)
        if status:
            q = q.where(Incident.status == IncidentStatus(status))
        result = await self.session.execute(q)
        return list(result.scalars().all())

    async def _get_workflow_for_incident(self, incident: Incident) -> Workflow | None:
        from sqlalchemy import select

        result = await self.session.execute(
            select(Workflow)
            .where(Workflow.incident_id == incident.id)
            .order_by(Workflow.created_at.desc())
            .limit(1)
        )
        return result.scalar_one_or_none()

    async def approve(self, incident_id: uuid.UUID, approved_by: str) -> Approval | None:
        incident = await self.get_incident(incident_id)
        if not incident or not incident.temporal_workflow_id:
            return None

        workflow_record = await self._get_workflow_for_incident(incident)
        if not workflow_record:
            return None

        approval = Approval(
            workflow_id=workflow_record.id,
            incident_id=incident.id,
            action_type="remediation",
            action_payload={"approved_by": approved_by},
            status=ApprovalStatus.APPROVED,
            approved_by=approved_by,
            resolved_at=datetime.now(timezone.utc),
        )
        self.session.add(approval)
        incident.status = IncidentStatus.EXECUTING

        try:
            client = await Client.connect(
                get_temporal_host(),
                namespace=self.settings.temporal_namespace,
            )
            handle = client.get_workflow_handle(incident.temporal_workflow_id)
            await handle.signal(IncidentResponseWorkflow.approve, approved_by)
        except Exception as e:
            logger.warning("temporal_signal_failed", error=str(e))
            await self._run_inline_workflow(incident)

        await self.session.commit()
        return approval
