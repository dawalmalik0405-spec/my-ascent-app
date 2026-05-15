import os
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.db.models import Incident, IncidentEvent, Workflow, WorkflowStep
from src.db.session import get_db
from src.mcp.tool_map import github_repo

router = APIRouter(prefix="/workflows", tags=["workflows"])


@router.get("/incident/{incident_id}/trace")
async def get_incident_trace(incident_id: UUID, db: AsyncSession = Depends(get_db)):
    incident = await db.get(Incident, incident_id)
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")

    events = await db.execute(
        select(IncidentEvent)
        .where(IncidentEvent.incident_id == incident_id)
        .order_by(IncidentEvent.created_at)
    )
    event_list = events.scalars().all()

    wf_result = await db.execute(
        select(Workflow).where(Workflow.incident_id == incident_id)
    )
    workflow = wf_result.scalar_one_or_none()
    steps = []
    if workflow:
        step_result = await db.execute(
            select(WorkflowStep)
            .where(WorkflowStep.workflow_id == workflow.id)
            .order_by(WorkflowStep.created_at)
        )
        steps = step_result.scalars().all()

    owner, repo = github_repo()
    investigation_output: dict | None = None
    if workflow:
        for s in steps:
            if s.step_name == "investigation" and s.output_payload:
                investigation_output = s.output_payload
                break

    partial = (incident.incident_metadata or {}).get("investigation_partial") or {}
    if partial:
        investigation_output = {**(investigation_output or {}), **partial}

    return {
        "incident_id": str(incident_id),
        "status": incident.status.value if hasattr(incident.status, "value") else incident.status,
        "temporal_workflow_id": incident.temporal_workflow_id,
        "github_repo": f"{owner}/{repo}",
        "github_configured": bool(os.environ.get("GITHUB_TOKEN")),
        "investigation": investigation_output,
        "last_error": (incident.incident_metadata or {}).get("last_error"),
        "timeline": [
            {
                "type": e.event_type,
                "agent": e.agent_name,
                "payload": e.payload,
                "timestamp": e.created_at.isoformat(),
            }
            for e in event_list
        ],
        "workflow_steps": [
            {
                "step": s.step_name,
                "agent": s.agent_name,
                "status": s.status,
                "duration_ms": s.duration_ms,
                "output": s.output_payload,
            }
            for s in steps
        ],
    }
