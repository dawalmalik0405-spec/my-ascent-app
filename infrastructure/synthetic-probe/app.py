"""Tiny demo service: bump a Prometheus counter so Prometheus → Alertmanager → Ascent fires automatically."""

from fastapi import FastAPI
from fastapi.responses import Response
from prometheus_client import CONTENT_TYPE_LATEST, Counter, generate_latest

errors_simulated = Counter(
    "synthetic_errors_simulated_total",
    "Incremented when /simulate-error is called (demo: user-facing errors).",
)

app = FastAPI(title="Synthetic error probe", version="1.0.0")


@app.post("/simulate-error")
async def simulate_error():
    """Call this once to simulate bad UX / elevated errors — Prometheus picks it up within ~30–60s."""
    errors_simulated.inc()
    return {"ok": True, "hint": "Wait for Prometheus evaluation + Alertmanager; check Ascent incidents."}


@app.get("/metrics")
async def metrics():
    return Response(content=generate_latest(), media_type=CONTENT_TYPE_LATEST)


@app.get("/health")
async def health():
    return {"status": "ok"}
