from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from src.db.session import get_db
from src.modules.incident.service import IncidentService

router = APIRouter(prefix="/incidents", tags=["incidents"])


class AlertWebhook(BaseModel):
    title: str | None = None
    summary: str | None = None
    description: str | None = None
    severity: str = "high"
    service: str | None = None
    environment: str = "production"
    correlation_id: str | None = None
    labels: dict = Field(default_factory=dict)
    annotations: dict = Field(default_factory=dict)


class ApprovalRequest(BaseModel):
    approved_by: str = "operator@enterprise.com"


class IncidentResponse(BaseModel):
    id: str
    correlation_id: str
    title: str
    severity: str
    status: str
    service: str | None
    root_cause: str | None
    remediation_summary: str | None = None
    incident_report: str | None = None
    last_error: str | None = None
    temporal_workflow_id: str | None
    created_at: str

    class Config:
        from_attributes = True


def _to_response(incident) -> IncidentResponse:
    return IncidentResponse(
        id=str(incident.id),
        correlation_id=incident.correlation_id,
        title=incident.title,
        severity=incident.severity.value if hasattr(incident.severity, "value") else incident.severity,
        status=incident.status.value if hasattr(incident.status, "value") else incident.status,
        service=incident.service,
        root_cause=incident.root_cause,
        remediation_summary=incident.remediation_summary,
        incident_report=(incident.incident_metadata or {}).get("report"),
        last_error=(incident.incident_metadata or {}).get("last_error"),
        temporal_workflow_id=incident.temporal_workflow_id,
        created_at=incident.created_at.isoformat(),
    )


@router.post("", response_model=IncidentResponse, status_code=201)
async def create_incident_from_alert(
    alert: AlertWebhook,
    db: AsyncSession = Depends(get_db),
):
    service = IncidentService(db)
    incident = await service.ingest_alert(alert.model_dump(exclude_none=True))
    return _to_response(incident)


@router.get("", response_model=list[IncidentResponse])
async def list_incidents(
    status: str | None = None,
    limit: int = 50,
    offset: int = 0,
    db: AsyncSession = Depends(get_db),
):
    service = IncidentService(db)
    incidents = await service.list_incidents(status=status, limit=limit, offset=offset)
    return [_to_response(i) for i in incidents]


@router.get("/{incident_id}", response_model=IncidentResponse)
async def get_incident(incident_id: UUID, db: AsyncSession = Depends(get_db)):
    service = IncidentService(db)
    incident = await service.get_incident(incident_id)
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")
    return _to_response(incident)


@router.post("/{incident_id}/approve")
async def approve_incident(
    incident_id: UUID,
    body: ApprovalRequest,
    db: AsyncSession = Depends(get_db),
):
    service = IncidentService(db)
    approval = await service.approve(incident_id, body.approved_by)
    if not approval:
        raise HTTPException(
            status_code=404,
            detail="Incident not found or workflow record missing for approval",
        )
    return {"status": "approved", "incident_id": str(incident_id)}
