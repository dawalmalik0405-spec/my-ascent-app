import hashlib
import json

from fastapi import APIRouter, Depends
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from src.api.routes.incidents import IncidentResponse, _to_response
from src.db.models import Incident
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


class AlertmanagerAlert(BaseModel):
    """Subset of Alertmanager webhook alert object (extra fields ignored)."""

    model_config = ConfigDict(extra="ignore")

    status: str = "firing"
    labels: dict = Field(default_factory=dict)
    annotations: dict = Field(default_factory=dict)
    fingerprint: str = ""
    # RFC3339 — new value when alert starts a new firing cycle (e.g. after heal + trip again).
    startsAt: str = ""


class AlertmanagerWebhook(BaseModel):
    """Alertmanager webhook payload (v4); only `alerts` is required for ingestion."""

    model_config = ConfigDict(extra="ignore")

    status: str = "firing"
    alerts: list[AlertmanagerAlert] = Field(default_factory=list)


def _alertmanager_correlation_id(alert: AlertmanagerAlert) -> str:
    fp = (alert.fingerprint or "").strip()
    if not fp:
        stable = json.dumps(alert.labels, sort_keys=True, default=str).encode()
        fp = hashlib.sha256(stable).hexdigest()[:32]
    # Include startsAt so repeat demos get new rows after heal (fingerprint alone dedupes forever).
    st = (alert.startsAt or "").strip()
    if st:
        st_sig = hashlib.sha256(st.encode()).hexdigest()[:14]
        cid = f"am-{fp}-{st_sig}"
    else:
        cid = f"am-{fp}"
    return cid[:128]


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


@router.post("/alertmanager", status_code=200)
async def ingest_alertmanager_payload(
    body: AlertmanagerWebhook,
    db: AsyncSession = Depends(get_db),
) -> dict:
    """
    Production-style ingress: Prometheus evaluates a rule → Alertmanager POSTs here.
    Idempotent per alert fingerprint so repeat notifications do not duplicate incidents.
    """
    out: list[IncidentResponse] = []
    service = IncidentService(db)

    for a in body.alerts:
        if a.status != "firing":
            continue

        correlation_id = _alertmanager_correlation_id(a)
        existing = await db.execute(
            select(Incident).where(Incident.correlation_id == correlation_id)
        )
        found = existing.scalar_one_or_none()
        if found:
            out.append(_to_response(found))
            continue

        payload = {
            "correlation_id": correlation_id,
            "title": a.annotations.get("summary")
            or a.labels.get("alertname", "Alertmanager alert"),
            "description": a.annotations.get("description", ""),
            "severity": (a.labels.get("severity") or "high").lower(),
            "service": a.labels.get("service") or a.labels.get("job"),
            "environment": a.labels.get("environment", "production"),
            "source": "alertmanager",
            "status": a.status,
            "labels": dict(a.labels),
            "annotations": dict(a.annotations),
        }
        try:
            incident = await service.ingest_alert(payload)
            out.append(_to_response(incident))
        except IntegrityError:
            await db.rollback()
            retry = await db.execute(
                select(Incident).where(Incident.correlation_id == correlation_id)
            )
            row = retry.scalar_one_or_none()
            if row:
                out.append(_to_response(row))

    return {"incidents": [m.model_dump() for m in out], "count": len(out)}