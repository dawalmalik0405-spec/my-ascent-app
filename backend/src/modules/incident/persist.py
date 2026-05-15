"""Persist investigation evidence so the UI can show progress even if the workflow retries."""

from typing import Any
from uuid import UUID

from src.db.models import Incident, IncidentEvent
from src.db.session import get_session_factory


async def persist_investigation_evidence(
    incident_id: str,
    *,
    tool_results: list[dict[str, Any]] | None = None,
    investigation_findings: list[str] | None = None,
    root_cause: str | None = None,
    last_error: str | None = None,
    agent_name: str | None = None,
    agent_summary: str | None = None,
) -> None:
    factory = get_session_factory()
    async with factory() as session:
        incident = await session.get(Incident, UUID(incident_id))
        if not incident:
            return

        meta = dict(incident.incident_metadata or {})
        partial = dict(meta.get("investigation_partial") or {})
        if tool_results is not None:
            partial["tool_results"] = tool_results
        if investigation_findings is not None:
            partial["investigation_findings"] = investigation_findings
        if root_cause:
            partial["root_cause"] = root_cause
        meta["investigation_partial"] = partial
        if last_error:
            meta["last_error"] = last_error
        incident.incident_metadata = meta

        if root_cause:
            incident.root_cause = root_cause

        if agent_name and agent_summary:
            session.add(
                IncidentEvent(
                    incident_id=incident.id,
                    event_type="agent.completed",
                    agent_name=agent_name,
                    payload={"summary": agent_summary},
                )
            )

        if last_error:
            session.add(
                IncidentEvent(
                    incident_id=incident.id,
                    event_type="workflow.error",
                    payload={"error": last_error[:2000]},
                )
            )

        await session.commit()
