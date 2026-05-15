# Ascent Platform — Enterprise Autonomous Operations Architecture

## 1. High-Level System Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           INGESTION & API LAYER                              │
│  FastAPI │ Webhooks │ Schedulers │ REST │ WebSocket (live workflow feeds)   │
└───────────────────────────────────┬─────────────────────────────────────────┘
                                    │
┌───────────────────────────────────▼─────────────────────────────────────────┐
│                         EVENT BUS (Redis Streams + Pub/Sub)                  │
│  alert.received │ incident.created │ workflow.step │ support.ticket │ ...     │
└───────────────────────────────────┬─────────────────────────────────────────┘
                                    │
        ┌───────────────────────────┼───────────────────────────┐
        ▼                           ▼                           ▼
┌───────────────┐         ┌─────────────────┐         ┌─────────────────┐
│   TEMPORAL    │         │   LANGGRAPH     │         │  MCP REGISTRY   │
│ Durable WF    │◄───────►│ Agent Graphs    │◄───────►│ Tool Ecosystem  │
│ Checkpoints   │         │ Per-module      │         │ Dynamic discovery│
└───────┬───────┘         └────────┬────────┘         └────────┬────────┘
        │                          │                           │
        └──────────────────────────┼───────────────────────────┘
                                   ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                    SEMANTIC MEMORY (Qdrant) + STATE (PostgreSQL)             │
│  incidents │ support │ research │ workflow embeddings + operational records  │
└─────────────────────────────────────────────────────────────────────────────┘
                                   │
┌──────────────────────────────────▼──────────────────────────────────────────┐
│  OBSERVABILITY: OpenTelemetry + Omium SDK + Prometheus + Grafana             │
└─────────────────────────────────────────────────────────────────────────────┘
```

## 2. Component Architecture

| Layer | Responsibility | Technology |
|-------|----------------|------------|
| API Gateway | Auth-ready REST, webhooks, HITL approvals | FastAPI |
| Orchestration Runtime | Durable long-running workflows | Temporal |
| Agent Runtime | Multi-agent reasoning graphs | LangGraph |
| Event Bus | Async correlation, DLQ, retries | Redis Streams |
| Structured State | Incidents, workflows, audit | PostgreSQL |
| Semantic Memory | Similarity, cross-module intel | Qdrant |
| LLM Router | Failover, task-based selection | OpenRouter → NVIDIA NIM |
| Tools | Enterprise integrations | MCP servers |
| UI | Ops dashboard, timelines, approvals | Next.js + shadcn |

## 3. Folder Structure

```
ascent-platform/
├── backend/                 # Python FastAPI + workers
├── frontend/                # Next.js dashboard
├── mcp-servers/             # Isolated MCP tool servers
├── infrastructure/          # Prometheus, Grafana, Temporal config
├── docs/                    # Architecture, diagrams
├── docker-compose.yml
└── .env.example
```

## 4. Database Schema (PostgreSQL)

See `backend/src/db/schema.sql` for DDL. Core entities:

- **organizations** — multi-tenant root
- **incidents** — lifecycle, severity, status, correlation_id
- **incident_events** — timeline audit trail
- **workflows** — Temporal workflow_id, module, state
- **workflow_steps** — per-step status, retries, traces
- **approvals** — HITL checkpoints
- **support_tickets** — support module records
- **research_signals** — R&D module records
- **agent_executions** — agent run metadata
- **tool_invocations** — MCP call audit

## 5. Qdrant Collection Design

| Collection | Vector dim | Payload fields | Purpose |
|------------|------------|----------------|---------|
| incidents_collection | 1536 | incident_id, severity, service, root_cause, resolved_at | Similar incident RCA |
| support_collection | 1536 | ticket_id, category, correlated_incident_id | KB + spike detection |
| research_collection | 1536 | source, competitor, technology, published_at | Strategic intel |
| workflow_collection | 1536 | workflow_id, module, outcome, steps_summary | Pattern learning |

## 6. LangGraph Workflow Graphs

### Incident Intelligence (Primary)

```
START → alert_triage → incident_correlation → [parallel: rca, memory_retrieval]
      → remediation_plan → [HITL if high_risk] → remediation_execute
      → validation → reporting → END
```

Agents map to nodes with shared `IncidentState` TypedDict.

## 7. Temporal Workflow Design

**IncidentResponseWorkflow** (flagship):
1. `persist_incident` — idempotent create
2. `run_langgraph_investigation` — activity with heartbeat
3. `execute_remediation_steps` — retryable, per-step
4. `wait_for_approval` — signal-based HITL
5. `validate_recovery` — health checks
6. `generate_report` — finalize + embed to Qdrant
7. `emit_cross_module_events` — support/R&D correlation

Child workflows: `RemediationStepWorkflow`, `ValidationWorkflow`

## 8. Event Bus Architecture

Redis Streams:
- `stream:alerts` — monitoring webhooks
- `stream:incidents` — incident lifecycle
- `stream:support` — ticket events
- `stream:research` — intel signals
- `stream:dlq` — failed events after max retries

Consumer groups: `incident-processor`, `support-processor`, `correlation-engine`

## 9. MCP Server Architecture

Each server runs as isolated process (stdio/SSE). Registry discovers tools via manifest JSON.

Servers: github, slack, email, browser, search, kubernetes, cloud, code-exec

## 10. Agent Communication Protocol

Messages use `AgentEnvelope`:
```json
{
  "correlation_id": "uuid",
  "from_agent": "rca_agent",
  "to_agent": "remediation_agent",
  "intent": "remediation_plan",
  "payload": {},
  "trace_id": "otel-trace-id"
}
```

Passed via LangGraph state + Redis pub/sub for cross-workflow signals.

## 11. Memory Retrieval Pipeline

1. Embed query (incident summary + alert payload)
2. Qdrant search with metadata filters (service, severity, time window)
3. Rerank top-k by recency + similarity score
4. Inject into agent context as `historical_context`

## 12. LLM Routing Architecture

```
TaskClassifier → RoutePolicy → ProviderChain[OpenRouter, NVIDIA NIM]
                              → CircuitBreaker per provider
                              → Retry with exponential backoff
                              → Cost/health-aware model selection
```

Task types: `triage` (fast/cheap), `reasoning` (premium), `summarization` (balanced)

## 13. Retry / Failure Recovery

| Layer | Strategy |
|-------|----------|
| Temporal | Automatic activity retries, workflow continue-as-new |
| LangGraph | Node-level retry policies, checkpoint resume |
| LLM | Provider failover, model downgrade |
| MCP | Timeout + circuit breaker + DLQ |
| Events | At-least-once + idempotent handlers |

## 14–17. Deployment

- **Local/Dev**: `docker-compose up` — all services
- **K8s**: Helm chart pattern — API, workers, Temporal, Qdrant, Redis, PG as stateful sets
- See `infrastructure/k8s/` for deployment manifests skeleton

## 18. API Contracts

Base: `/api/v1`

- `POST /webhooks/alerts` — ingest monitoring alert
- `GET /incidents` — list/filter incidents
- `GET /incidents/{id}` — detail + timeline
- `POST /incidents/{id}/approve` — HITL approval
- `GET /workflows/{id}` — workflow status
- `GET /workflows/{id}/trace` — execution timeline
- `POST /support/tickets` — support ingestion
- `GET /research/signals` — research feed
- `GET /health` — liveness
- `GET /metrics` — Prometheus

## 19. Frontend Dashboard

Pages: Overview, Incidents (detail + timeline), Workflows, Approvals, Support, Research, Observability

Real-time: SSE `/api/v1/stream/workflows`

## 20–22. Diagrams

See `docs/diagrams/` for Mermaid sequence and lifecycle diagrams.

## 23–30. Operations

- **Security**: env-based secrets, RBAC-ready roles in JWT claims (stub), sandboxed code-exec MCP
- **CI/CD**: GitHub Actions — lint, test, build images, deploy
- **Monitoring**: RED metrics per service, workflow SLA dashboards
- **Testing**: unit (agents), integration (API), workflow (Temporal test server)
- **Scalability**: horizontal API/worker replicas, Temporal task queue partitioning
- **Cost**: route lightweight tasks to small models; cache embeddings in Redis
- **Extensibility**: module registry pattern — register new `ModulePlugin` with graph + temporal defs
