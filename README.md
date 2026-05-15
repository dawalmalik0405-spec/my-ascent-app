# Ascent Platform

Enterprise-grade autonomous multi-agent operations platform. Not a chatbot — a distributed AI operational workforce for incident response, support intelligence, and strategic research.

## Architecture

| Layer | Technology |
|-------|------------|
| API | FastAPI |
| Agent Orchestration | LangGraph |
| Durable Workflows | Temporal |
| Semantic Memory | Qdrant |
| State | PostgreSQL |
| Event Bus | Redis Streams |
| LLM Routing | OpenRouter → NVIDIA NIM failover |
| Tools | MCP ecosystem |
| Frontend | Next.js + Tailwind |
| Observability | Prometheus, Grafana, OpenTelemetry |

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for full system design.

## Quick Start

```bash
# Copy environment
cp .env.example .env

# One terminal — Docker infra + API + worker + frontend
.\scripts\start.ps1

# Dashboard: http://localhost:3000
# API docs:   http://localhost:8000/docs
# Temporal:   http://localhost:8080
```

Stop Docker: `.\scripts\stop.ps1` (Ctrl+C in the same terminal stops API/worker/web first)

### Demo Incident

```bash
curl -X POST http://localhost:8000/api/v1/webhooks/alerts \
  -H "Content-Type: application/json" \
  -d '{
    "status": "firing",
    "labels": {"alertname": "PaymentAPILatencyHigh", "severity": "critical", "service": "payment-api"},
    "annotations": {"summary": "Payment API P99 latency > 2s", "description": "Post-deploy regression"}
  }'
```

Or click **Trigger Demo Incident** in the dashboard.

## Primary Module: Incident Intelligence

Autonomous SRE workflow:

1. **Alert Triage** — severity, service classification
2. **Incident Correlation** — Qdrant similarity search
3. **Root Cause Analysis** — K8s logs, GitHub deploys, metrics via MCP
4. **Remediation** — rollback, scale, notify (HITL for high-risk)
5. **Validation** — health checks, latency verification
6. **Reporting** — postmortem + semantic memory storage

## Project Structure

```
backend/          Python API + Temporal worker + LangGraph agents
frontend/         Next.js operations dashboard
mcp-servers/      Isolated MCP tool servers
infrastructure/   Prometheus, Grafana, K8s manifests
docs/             Architecture and diagrams
```

## Development

```bash
# Backend (local)
cd backend && pip install -r requirements.txt
uvicorn src.main:app --reload

# Worker
python -m src.workers.main

# Frontend
cd frontend && npm install && npm run dev
```

Set `ENABLE_LLM_MOCK=true` for development without API keys.

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/v1/webhooks/alerts` | Ingest monitoring alert |
| GET | `/api/v1/incidents` | List incidents |
| GET | `/api/v1/workflows/incident/{id}/trace` | Execution timeline |
| POST | `/api/v1/incidents/{id}/approve` | HITL approval |
| POST | `/api/v1/support/tickets` | Support ticket intake |
| POST | `/api/v1/research/scan` | Run research scan |
| GET | `/api/v1/tools/mcp` | List MCP tools |

## License

MIT
# my-ascent-app
