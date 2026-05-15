from prometheus_client import Counter, Gauge, Histogram

# Workflow metrics
workflow_started_total = Counter(
    "ascent_workflow_started_total",
    "Workflows started",
    ["module"],
)
workflow_completed_total = Counter(
    "ascent_workflow_completed_total",
    "Workflows completed",
    ["module", "status"],
)
workflow_duration_seconds = Histogram(
    "ascent_workflow_duration_seconds",
    "Workflow duration",
    ["module"],
    buckets=[1, 5, 15, 30, 60, 120, 300, 600, 1800],
)

# Agent metrics
agent_executions_total = Counter(
    "ascent_agent_executions_total",
    "Agent executions",
    ["agent", "status"],
)
agent_duration_seconds = Histogram(
    "ascent_agent_duration_seconds",
    "Agent execution duration",
    ["agent"],
    buckets=[0.1, 0.5, 1, 2, 5, 10, 30, 60, 120],
)

# LLM metrics
llm_requests_total = Counter(
    "ascent_llm_requests_total",
    "LLM API requests",
    ["provider", "status"],
)
llm_latency_seconds = Histogram(
    "ascent_llm_latency_seconds",
    "LLM request latency",
    ["provider"],
    buckets=[0.5, 1, 2, 5, 10, 30, 60, 120],
)

# Tool metrics
tool_invocations_total = Counter(
    "ascent_tool_invocations_total",
    "MCP tool invocations",
    ["server", "tool", "status"],
)

# Incident metrics
active_incidents = Gauge(
    "ascent_active_incidents",
    "Currently active incidents",
    ["severity"],
)
incidents_resolved_total = Counter(
    "ascent_incidents_resolved_total",
    "Incidents resolved",
    ["service"],
)
