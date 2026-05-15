import asyncio
from datetime import datetime, timezone
from typing import Any
from uuid import UUID

from temporalio import activity

from src.core.logging import get_logger
from src.db.models import Incident, IncidentEvent, IncidentStatus, Workflow, WorkflowStatus, WorkflowStep
from src.db.session import get_session_factory
from src.events.bus import get_event_bus
from src.modules.incident.graph import get_incident_graph
from src.modules.incident.state import IncidentState
from src.observability.metrics import workflow_completed_total

logger = get_logger(__name__)


async def _persist_investigation_snapshot(
    incident_id: str,
    result: dict[str, Any],
    *,
    error: str | None,
    partial: bool,
) -> None:
    from src.modules.incident.persist import persist_investigation_evidence

    for msg in result.get("agent_messages", []):
        if msg.get("from"):
            await persist_investigation_evidence(
                incident_id,
                agent_name=msg.get("from"),
                agent_summary=msg.get("summary", f"{msg.get('from')} completed"),
            )

    if result.get("tool_results") or result.get("investigation_findings"):
        await persist_investigation_evidence(
            incident_id,
            tool_results=result.get("tool_results"),
            investigation_findings=result.get("investigation_findings"),
            root_cause=result.get("root_cause"),
            last_error=error if partial else None,
        )
    elif error:
        await persist_investigation_evidence(incident_id, last_error=error)

    if not partial and not error:
        factory = get_session_factory()
        async with factory() as session:
            incident = await session.get(Incident, UUID(incident_id))
            if incident and result.get("status"):
                try:
                    incident.status = IncidentStatus(result["status"])
                except ValueError:
                    pass
                meta = dict(incident.incident_metadata or {})
                meta.pop("last_error", None)
                incident.incident_metadata = meta
                await session.commit()


@activity.defn
async def update_incident_status(incident_id: str, status: str, event_type: str) -> None:
    factory = get_session_factory()
    async with factory() as session:
        incident = await session.get(Incident, UUID(incident_id))
        if incident:
            incident.status = IncidentStatus(status)
            if status == "resolved":
                incident.resolved_at = datetime.now(timezone.utc)
            session.add(
                IncidentEvent(
                    incident_id=incident.id,
                    event_type=event_type,
                    payload={"status": status},
                )
            )
            await session.commit()


@activity.defn
async def persist_workflow_step(incident_id: str, step_name: str, output: dict) -> None:
    factory = get_session_factory()
    async with factory() as session:
        incident = await session.get(Incident, UUID(incident_id))
        if not incident or not incident.temporal_workflow_id:
            return
        from sqlalchemy import select

        result = await session.execute(
            select(Workflow).where(Workflow.temporal_workflow_id == incident.temporal_workflow_id)
        )
        wf = result.scalar_one_or_none()
        if wf:
            session.add(
                WorkflowStep(
                    workflow_id=wf.id,
                    step_name=step_name,
                    status="completed",
                    output_payload=output,
                    completed_at=datetime.now(timezone.utc),
                )
            )
            await session.commit()


@activity.defn
async def run_langgraph_investigation(
    incident_id: str,
    correlation_id: str,
    alert_payload: dict,
    title: str,
    service: str | None,
    approval_granted: bool = False,
) -> dict[str, Any]:
    activity.heartbeat("starting_langgraph_investigation")

    initial_state: IncidentState = {
        "incident_id": incident_id,
        "correlation_id": correlation_id,
        "alert_payload": alert_payload,
        "title": title,
        "service": service or alert_payload.get("service"),
        "environment": alert_payload.get("environment", "production"),
        "approval_granted": approval_granted,
        "agent_messages": [],
        "tool_results": [],
        "errors": [],
    }

    graph = get_incident_graph()
    activity.heartbeat("running_graph")

    async def _heartbeat_keepalive() -> None:
        while True:
            await asyncio.sleep(20)
            activity.heartbeat("investigation_in_progress")

    hb = asyncio.create_task(_heartbeat_keepalive())
    result: dict[str, Any] = dict(initial_state)
    try:
        async for chunk in graph.astream(initial_state, stream_mode="updates"):
            activity.heartbeat("graph_progress")
            if isinstance(chunk, dict):
                for node_update in chunk.values():
                    if isinstance(node_update, dict):
                        result = {**result, **node_update}
                        msgs = node_update.get("agent_messages")
                        if msgs:
                            result.setdefault("agent_messages", [])
                            result["agent_messages"] = [
                                *result.get("agent_messages", []),
                                *msgs,
                            ]
    except Exception as exc:
        hb.cancel()
        await _persist_investigation_snapshot(
            incident_id, result, error=str(exc), partial=True
        )
        raise
    finally:
        hb.cancel()
        try:
            await hb
        except asyncio.CancelledError:
            pass

    activity.heartbeat("graph_complete")
    await _persist_investigation_snapshot(incident_id, result, error=None, partial=False)

    return {
        "root_cause": result.get("root_cause"),
        "severity": result.get("severity"),
        "service": result.get("service"),
        "remediation_plan": result.get("remediation_plan", []),
        "remediation_results": result.get("remediation_results", []),
        "validation_result": result.get("validation_result"),
        "requires_approval": result.get("requires_approval", False),
        "approval_granted": result.get("approval_granted", approval_granted),
        "investigation_findings": result.get("investigation_findings", []),
        "tool_results": result.get("tool_results", []),
        "status": result.get("status"),
        "agent_messages": result.get("agent_messages", []),
    }


@activity.defn
async def validate_recovery(incident_id: str, investigation: dict) -> dict[str, Any]:
    from src.modules.incident.agents import validation_agent

    state: IncidentState = {
        "incident_id": incident_id,
        "service": investigation.get("service"),
        **investigation,
    }
    result = await validation_agent(state)
    return result.get("validation_result", {"passed": True})


@activity.defn
async def generate_incident_report(incident_id: str, investigation: dict) -> dict[str, Any]:
    from src.modules.incident.agents import reporting_agent

    factory = get_session_factory()
    state: IncidentState = {
        "incident_id": incident_id,
        **investigation,
    }
    result = await reporting_agent(state)

    async with factory() as session:
        incident = await session.get(Incident, UUID(incident_id))
        if incident:
            incident.root_cause = investigation.get("root_cause")
            incident.remediation_summary = str(investigation.get("remediation_results", []))
            if result.get("incident_report"):
                incident.incident_metadata = {
                    **(incident.incident_metadata or {}),
                    "report": result["incident_report"],
                }
            await session.commit()

    return {"content": result.get("incident_report", "")}


@activity.defn
async def emit_cross_module_event(incident_id: str, investigation: dict, report: dict) -> None:
    bus = await get_event_bus()
    await bus.publish(
        "incidents",
        "incident.resolved",
        {
            "incident_id": incident_id,
            "service": investigation.get("service"),
            "severity": investigation.get("severity"),
            "root_cause": investigation.get("root_cause"),
            "report_summary": (report.get("content") or "")[:500],
        },
    )
    workflow_completed_total.labels(module="incident", status="success").inc()
