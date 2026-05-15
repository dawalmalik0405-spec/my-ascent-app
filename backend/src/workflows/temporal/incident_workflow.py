from dataclasses import dataclass
from datetime import timedelta
from typing import Any

from temporalio import workflow
from temporalio.common import RetryPolicy

with workflow.unsafe.imports_passed_through():
    from src.workflows.temporal.activities import (
        emit_cross_module_event,
        generate_incident_report,
        persist_workflow_step,
        run_langgraph_investigation,
        update_incident_status,
        validate_recovery,
    )


@dataclass
class IncidentWorkflowInput:
    incident_id: str
    correlation_id: str
    alert_payload: dict[str, Any]
    title: str
    service: str | None = None
    severity: str = "high"


@dataclass
class IncidentWorkflowResult:
    incident_id: str
    status: str
    root_cause: str | None
    report: str | None
    requires_approval: bool


@workflow.defn
class IncidentResponseWorkflow:
    """Durable incident response workflow — survives crashes and retries intelligently."""

    def __init__(self) -> None:
        self._approval_granted: bool = False
        self._approval_rejected: bool = False

    @workflow.signal
    async def approve(self, approved_by: str) -> None:
        self._approval_granted = True
        workflow.logger.info(f"Approval granted by {approved_by}")

    @workflow.signal
    async def reject(self, reason: str) -> None:
        self._approval_rejected = True
        workflow.logger.info(f"Approval rejected: {reason}")

    @workflow.query
    def approval_status(self) -> dict[str, bool]:
        return {
            "granted": self._approval_granted,
            "rejected": self._approval_rejected,
        }

    @workflow.run
    async def run(self, input: IncidentWorkflowInput) -> IncidentWorkflowResult:
        retry_policy = RetryPolicy(
            initial_interval=timedelta(seconds=2),
            maximum_interval=timedelta(seconds=60),
            maximum_attempts=5,
            backoff_coefficient=2.0,
        )

        await workflow.execute_activity(
            update_incident_status,
            args=[input.incident_id, "triaging", "workflow_started"],
            start_to_close_timeout=timedelta(seconds=30),
            retry_policy=retry_policy,
        )

        investigation = await workflow.execute_activity(
            run_langgraph_investigation,
            args=[
                input.incident_id,
                input.correlation_id,
                input.alert_payload,
                input.title,
                input.service,
            ],
            start_to_close_timeout=timedelta(minutes=10),
            heartbeat_timeout=timedelta(minutes=5),
            retry_policy=retry_policy,
        )

        await workflow.execute_activity(
            persist_workflow_step,
            args=[input.incident_id, "investigation", investigation],
            start_to_close_timeout=timedelta(seconds=30),
            retry_policy=retry_policy,
        )

        if investigation.get("requires_approval") and not investigation.get("approval_granted"):
            await workflow.execute_activity(
                update_incident_status,
                args=[input.incident_id, "awaiting_approval", "hitl_required"],
                start_to_close_timeout=timedelta(seconds=30),
            )

            try:
                await workflow.wait_condition(
                    lambda: self._approval_granted or self._approval_rejected,
                    timeout=timedelta(hours=4),
                )
            except TimeoutError:
                return IncidentWorkflowResult(
                    incident_id=input.incident_id,
                    status="cancelled",
                    root_cause=investigation.get("root_cause"),
                    report=None,
                    requires_approval=True,
                )

            if self._approval_rejected:
                await workflow.execute_activity(
                    update_incident_status,
                    args=[input.incident_id, "cancelled", "approval_rejected"],
                    start_to_close_timeout=timedelta(seconds=30),
                )
                return IncidentWorkflowResult(
                    incident_id=input.incident_id,
                    status="cancelled",
                    root_cause=investigation.get("root_cause"),
                    report=None,
                    requires_approval=True,
                )

            investigation = await workflow.execute_activity(
                run_langgraph_investigation,
                args=[
                    input.incident_id,
                    input.correlation_id,
                    input.alert_payload,
                    input.title,
                    input.service,
                    True,
                ],
                start_to_close_timeout=timedelta(minutes=10),
                heartbeat_timeout=timedelta(minutes=5),
                retry_policy=retry_policy,
            )

        validation = await workflow.execute_activity(
            validate_recovery,
            args=[input.incident_id, investigation],
            start_to_close_timeout=timedelta(minutes=5),
            retry_policy=retry_policy,
        )

        if not validation.get("passed"):
            workflow.logger.warning("Validation failed, retrying remediation")
            investigation = await workflow.execute_activity(
                run_langgraph_investigation,
                args=[
                    input.incident_id,
                    input.correlation_id,
                    input.alert_payload,
                    input.title,
                    input.service,
                    True,
                ],
                start_to_close_timeout=timedelta(minutes=10),
                retry_policy=retry_policy,
            )

        report = await workflow.execute_activity(
            generate_incident_report,
            args=[input.incident_id, investigation],
            start_to_close_timeout=timedelta(minutes=5),
            retry_policy=retry_policy,
        )

        await workflow.execute_activity(
            update_incident_status,
            args=[input.incident_id, "resolved", "workflow_completed"],
            start_to_close_timeout=timedelta(seconds=30),
        )

        await workflow.execute_activity(
            emit_cross_module_event,
            args=[input.incident_id, investigation, report],
            start_to_close_timeout=timedelta(seconds=30),
        )

        return IncidentWorkflowResult(
            incident_id=input.incident_id,
            status="resolved",
            root_cause=investigation.get("root_cause"),
            report=report.get("content"),
            requires_approval=investigation.get("requires_approval", False),
        )
