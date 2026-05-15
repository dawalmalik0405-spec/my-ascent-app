from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from src.api.routes.incidents import IncidentResponse, _to_response
from src.db.session import get_db
from src.modules.incident.service import IncidentService

router = APIRouter(prefix="/webhooks", tags=["webhooks"])


class PrometheusAlert(BaseModel):
    status: str = "firing"
    labels: dict = Field(default_factory=dict)
    annotations: dict = Field(default_factory=dict)


class GrafanaWebhook(BaseModel):
    title: str
    message: str
    state: str = "alerting"
    ruleName: str | None = None
    tags: dict = Field(default_factory=dict)


@router.post("/alerts", response_model=IncidentResponse, status_code=201)
async def ingest_monitoring_alert(
    alert: PrometheusAlert,
    db: AsyncSession = Depends(get_db),
):
    payload = {
        "title": alert.annotations.get("summary", alert.labels.get("alertname", "Monitoring Alert")),
        "description": alert.annotations.get("description", ""),
        "severity": alert.labels.get("severity", "high"),
        "service": alert.labels.get("service", alert.labels.get("job")),
        "environment": alert.labels.get("environment", "production"),
        "source": "prometheus",
        "status": alert.status,
        "labels": alert.labels,
        "annotations": alert.annotations,
    }
    service = IncidentService(db)
    incident = await service.ingest_alert(payload)
    return _to_response(incident)


@router.post("/grafana", response_model=IncidentResponse, status_code=201)
async def ingest_grafana_alert(
    alert: GrafanaWebhook,
    db: AsyncSession = Depends(get_db),
):
    payload = {
        "title": alert.title,
        "description": alert.message,
        "severity": "high" if alert.state == "alerting" else "info",
        "service": alert.tags.get("service"),
        "source": "grafana",
        "rule": alert.ruleName,
    }
    service = IncidentService(db)
    incident = await service.ingest_alert(payload)
    return _to_response(incident)
