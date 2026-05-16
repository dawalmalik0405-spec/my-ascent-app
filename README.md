# AegisOps

**AegisOps** is the product-facing name for this autonomous operations platform (the repository and Python package may still use internal identifiers such as `ascent-platform`, Docker service names, and database user `ascent`). It is **not a chatbot**: it is a distributed AI operational stack for **incident response**, **support intelligence**, and **strategic research**, wired with **Temporal**, **LangGraph**, **Qdrant**, and **MCP**.

---

## What’s included

| Area | Description |
|------|-------------|
| **Incidents** | Alert ingestion, correlation with semantic memory, LangGraph investigations, MCP-backed evidence, HITL approvals, Temporal workflows |
| **Support** | Ticket and complaint intake, AI-assisted handling, correlation with incidents (demo storefront posts complaints to the API) |
| **Research** | Industry scans, dashboard analytics (charts/KPIs), analyst-style briefings |
| **Frontend** | Next.js operations console, marketing landing (reference stack strip, 3D hero), SVG shield mark with agent-style robot glyph, Markdown-rich reports where applicable |
| **Demo apps** | Optional ecommerce-style app to trigger incidents and support flows end-to-end |

---

## Architecture

| Layer | Technology |
|-------|------------|
| API | FastAPI |
| Agent orchestration | LangGraph |
| Durable workflows | Temporal |
| Semantic memory | Qdrant |
| State | PostgreSQL |
| Event bus | Redis Streams |
| LLM routing | OpenRouter → NVIDIA NIM failover |
| Tools | MCP ecosystem (`backend/config/mcp_servers.json`) |
| Frontend | Next.js 14 + Tailwind + Recharts |
| Observability | Prometheus, Grafana, OpenTelemetry (optional OTLP endpoint) |

**Reference stack (also shown on the landing page):** Temporal · LangGraph · Qdrant · MCP.

Deeper design: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) · MCP notes: [docs/MCP_SETUP.md](docs/MCP_SETUP.md) · Diagrams: [docs/diagrams/](docs/diagrams/).

---

## Repository layout

```
backend/                  # FastAPI app, Temporal worker, LangGraph graphs, DB models
  src/db/schema.sql       # PostgreSQL DDL (used by Docker Postgres init)
  config/mcp_servers.json # MCP server definitions
frontend/                 # Next.js dashboard + landing + brand components
demo-apps/
  incident-demo-webapp/   # Northwind-style demo (checkout metrics → incidents; /support → API)
mcp-servers/              # Isolated MCP tool servers (as configured)
infrastructure/           # Prometheus, Grafana, Alertmanager, probes, K8s skeleton
scripts/
  start.ps1               # Windows: Docker infra + API + worker + frontend (one terminal)
  stop.ps1                # Stop Docker services started for dev
docs/                     # Architecture and setup guides
docker-compose.yml        # Full stack (infra + optional api/worker/frontend/grafana/...)
.gitignore                # Ignores .env, build artifacts, .venv — keeps .env.example tracked
```

Kubernetes skeleton: `infrastructure/k8s/deployment.yaml`.

---

## Prerequisites

- **Python** 3.11+ (venv recommended at repo root: `.venv`)
- **Node.js** 20+ (for frontend and root `concurrently` scripts)
- **Docker Desktop** (or compatible engine) for Postgres, Redis, Qdrant, Temporal, optional Prometheus stack

---

## Quick start (Windows, recommended)

From the repository root:

```powershell
# 1) Environment — commit only .env.example; keep real secrets in .env (gitignored)
copy .env.example .env
# Edit .env — at minimum LLM keys unless using mocks (see below).

# 2) Create venv and install backend (from repo root)
py -3.11 -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -e ./backend

# 3) One terminal — Docker infra + API + worker + frontend
.\scripts\start.ps1
```

`start.ps1` loads `.env`, forces **localhost** URLs for Postgres/Redis/Qdrant/Temporal (matching Docker port mappings), starts **postgres, redis, qdrant, temporal, temporal-ui**, then runs API + worker + Next dev server via `concurrently`.

| URL | Purpose |
|-----|---------|
| http://localhost:3000 | Dashboard & landing |
| http://localhost:8000/docs | OpenAPI |
| http://localhost:8080 | Temporal UI |

Stop infra (separate command): `.\scripts\stop.ps1` — **Ctrl+C** in the same terminal as `start.ps1` stops API/worker/web first.

---

## Quick start (alternative)

### Root npm scripts (after venv + `.env` exist)

```powershell
npm install
npm run infra:up          # postgres redis qdrant temporal temporal-ui
# Then ensure DATABASE_URL etc. point at localhost (see start.ps1)
npm start                 # API + worker + frontend (uses concurrently)
```

### Backend / frontend only (manual)

```powershell
# Backend — set PYTHONPATH to backend, DATABASE_URL, REDIS_URL, QDRANT_URL, TEMPORAL_HOST
cd backend
pip install -e .
uvicorn src.main:app --reload --host 0.0.0.0 --port 8000

# Worker (separate terminal)
python -m src.workers.main

# Frontend
cd frontend
npm install
npm run dev
```

### Production frontend build (local check)

```powershell
cd frontend
npm install
npm run build
npm run start
```

Ensure `NEXT_PUBLIC_API_URL` (and optional `NEXT_PUBLIC_TEMPORAL_UI_URL`) match how browsers reach your API before building.

### Full Docker Compose (API + worker + frontend + extras)

```bash
docker compose up -d --build
```

Compose overrides DB/Redis/Qdrant/Temporal hosts for in-network services. Set **`NEXT_PUBLIC_API_URL`** to the URL browsers use to reach the API when deploying; rebuild the frontend image after changing it.

See service list in `docker-compose.yml` (Prometheus, Grafana, Alertmanager, demo-webapp, synthetic-probe, etc.).

---

## Environment configuration

Copy `.env.example` to **`.env`** (your local file is **not** committed; **`.env.example`** stays in git as the template).

| Group | Purpose |
|-------|---------|
| `DATABASE_URL` | Async SQLAlchemy URL (`postgresql+asyncpg://...`) |
| `REDIS_URL`, `QDRANT_URL` | Cache / vectors |
| `TEMPORAL_*` | Worker & workflow connectivity |
| `OPENROUTER_*`, `NVIDIA_NIM_*`, `LLM_*` | Models and failover |
| `ENABLE_HITL`, `ENABLE_LLM_MOCK`, `SIMULATE_ENTERPRISE_TOOLS`, … | Feature flags |
| `SMTP_*`, `COMPANY_NAME` | Support email replies |
| `GITHUB_*`, `SLACK_*`, `AWS_*`, `K8S_*` | MCP integrations as enabled |
| Research | `ENABLE_RESEARCH_AUTO_SCAN`, `RESEARCH_AUTO_SCAN_HOURS`, `RESEARCH_DEFAULT_QUERY` |

**Frontend-only:**

- `NEXT_PUBLIC_API_URL` — browser-facing API base (default `http://localhost:8000`)
- `NEXT_PUBLIC_TEMPORAL_UI_URL` — optional footer link on landing (defaults to localhost Temporal UI)

**First-time database:** apply `backend/src/db/schema.sql` to your Postgres if not using Docker init scripts.

**Development without LLM keys:** set `ENABLE_LLM_MOCK=true` in `.env`.

---

## Incident pipeline (high level)

1. **Triage** — severity and service classification  
2. **Correlation** — Qdrant similarity vs past incidents  
3. **Investigation** — logs, deploys, metrics via MCP  
4. **Remediation** — proposed actions; **HITL** when enabled for high-risk steps  
5. **Validation** — health / latency checks  
6. **Reporting** — structured output + memory updates  

---

## API surface (selected)

Base path: **`/api/v1`** (health at `/health`, metrics at `/metrics`).

| Method | Path | Description |
|--------|------|-------------|
| POST | `/webhooks/alerts` | Prometheus-style monitoring alert → incident |
| POST | `/webhooks/grafana` | Grafana webhook → incident |
| POST | `/webhooks/alertmanager` | Alertmanager webhook |
| POST | `/incidents` | Create incident from generic alert payload |
| GET | `/incidents` | List incidents |
| GET | `/incidents/{id}` | Incident detail |
| POST | `/incidents/{id}/approve` | HITL approval |
| GET | `/workflows/incident/{id}/trace` | Workflow / timeline trace |
| GET | `/support/tickets` | List support tickets |
| GET | `/support/tickets/{id}` | Ticket detail |
| POST | `/support/tickets` | Create ticket (ops) |
| POST | `/support/complaints` | Demo/customer complaint intake |
| GET | `/research/dashboard` | Research dashboard payload |
| POST | `/research/scan` | Run research scan |
| POST | `/research/ask` | Analyst-style question |
| GET | `/research/signals` | Research signals |
| GET | `/tools/mcp` | MCP tool catalog |
| GET | `/tools/mcp/status` | MCP status |

OpenAPI: **`http://localhost:8000/docs`** when the API is running.

---

## Demo incident (curl)

```bash
curl -X POST http://localhost:8000/api/v1/webhooks/alerts \
  -H "Content-Type: application/json" \
  -d '{
    "status": "firing",
    "labels": {"alertname": "PaymentAPILatencyHigh", "severity": "critical", "service": "payment-api"},
    "annotations": {"summary": "Payment API P99 latency > 2s", "description": "Post-deploy regression"}
  }'
```

Or use **Trigger Demo Incident** (or equivalent) from the dashboard.

---

## Demo web app (Northwind-style)

Located under `demo-apps/incident-demo-webapp/`.

- Run via Compose (`demo-webapp` service) or locally; configure **`ASCENT_API_BASE_URL`** to your API (Compose uses `host.docker.internal:8000` when the API runs on the host).  
- **http://localhost:9110** — storefront, checkout flow can drive Prometheus/Alertmanager → webhook → incident (when that stack is up).  
- **http://localhost:9110/support** — submits to **`POST /api/v1/support/complaints`**; configure **`SMTP_*`** for outbound reply mail.

Details and timings are commented in `.env.example`.

---

## Deployment

This stack expects **long-running** API + **worker** plus **Postgres**, **Redis**, **Qdrant**, and **Temporal**.

### Common patterns

- **Docker Compose** on a VM (`docker-compose.yml`; tighten secrets and remove dev-only mounts).  
- **PaaS** (Render, Railway, Fly): managed Postgres/Redis; **Temporal Cloud** + **Qdrant Cloud** (or self-hosted); separate services for API, worker, and Next.js with correct **`NEXT_PUBLIC_*`** at image build time.  
- **Kubernetes**: see `infrastructure/k8s/deployment.yaml` as a starting skeleton.

### Google Cloud (outline)

Typical layout:

1. Enable **Artifact Registry**, **Cloud Run**, **Cloud SQL Admin**, **Secret Manager**, **Serverless VPC Access** (for **Memorystore** / private DB).  
2. **Cloud SQL (PostgreSQL)** + apply `backend/src/db/schema.sql`.  
3. **Memorystore (Redis)** in the same region; attach a **VPC connector** to Cloud Run services that need it.  
4. Use **Temporal Cloud** and **Qdrant Cloud** (or run those on GKE/GCE if you operate them yourself).  
5. Build/push images (`backend/Dockerfile`, `frontend/Dockerfile`) with **`NEXT_PUBLIC_API_URL`** passed into the frontend build.  
6. Deploy **Cloud Run** service for FastAPI (`uvicorn` on **`$PORT`**), second Cloud Run service for **`python -m src.workers.main`** with **minimum instances ≥ 1** and CPU always allocated, third for Next.js (or static hosting + CDN).  
7. Store secrets in **Secret Manager**; use **`postgresql+asyncpg://`** for `DATABASE_URL`.

Production checklist: strong `APP_SECRET_KEY`, real DB credentials, TLS at the edge, review **CORS**, and never commit `.env`.

---

## License

MIT
