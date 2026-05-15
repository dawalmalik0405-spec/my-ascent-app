-- Ascent Platform PostgreSQL Schema

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TYPE incident_status AS ENUM (
    'received', 'triaging', 'correlating', 'investigating',
    'planning', 'awaiting_approval', 'executing', 'validating',
    'reporting', 'resolved', 'cancelled', 'failed'
);

CREATE TYPE incident_severity AS ENUM ('critical', 'high', 'medium', 'low', 'info');

CREATE TYPE workflow_status AS ENUM (
    'pending', 'running', 'paused', 'completed', 'failed', 'cancelled'
);

CREATE TYPE approval_status AS ENUM ('pending', 'approved', 'rejected', 'expired');

CREATE TABLE organizations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE incidents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID REFERENCES organizations(id),
    correlation_id VARCHAR(128) UNIQUE NOT NULL,
    title VARCHAR(512) NOT NULL,
    description TEXT,
    severity incident_severity NOT NULL DEFAULT 'medium',
    status incident_status NOT NULL DEFAULT 'received',
    service VARCHAR(255),
    environment VARCHAR(64) DEFAULT 'production',
    alert_payload JSONB DEFAULT '{}',
    root_cause TEXT,
    remediation_summary TEXT,
    temporal_workflow_id VARCHAR(255),
    langgraph_thread_id VARCHAR(255),
    metadata JSONB DEFAULT '{}',
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    resolved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_incidents_status ON incidents(status);
CREATE INDEX idx_incidents_service ON incidents(service);
CREATE INDEX idx_incidents_correlation ON incidents(correlation_id);

CREATE TABLE incident_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    incident_id UUID NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
    event_type VARCHAR(128) NOT NULL,
    agent_name VARCHAR(128),
    payload JSONB DEFAULT '{}',
    trace_id VARCHAR(128),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_incident_events_incident ON incident_events(incident_id);

CREATE TABLE workflows (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID REFERENCES organizations(id),
    module VARCHAR(64) NOT NULL,
    temporal_workflow_id VARCHAR(255) UNIQUE,
    temporal_run_id VARCHAR(255),
    status workflow_status NOT NULL DEFAULT 'pending',
    input_payload JSONB DEFAULT '{}',
    output_payload JSONB DEFAULT '{}',
    incident_id UUID REFERENCES incidents(id),
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE workflow_steps (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workflow_id UUID NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
    step_name VARCHAR(128) NOT NULL,
    agent_name VARCHAR(128),
    status VARCHAR(64) NOT NULL DEFAULT 'pending',
    attempt INT NOT NULL DEFAULT 0,
    input_payload JSONB DEFAULT '{}',
    output_payload JSONB DEFAULT '{}',
    error_message TEXT,
    duration_ms INT,
    trace_id VARCHAR(128),
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_workflow_steps_workflow ON workflow_steps(workflow_id);

CREATE TABLE approvals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workflow_id UUID NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
    incident_id UUID REFERENCES incidents(id),
    action_type VARCHAR(128) NOT NULL,
    action_payload JSONB NOT NULL,
    risk_level VARCHAR(32) NOT NULL DEFAULT 'high',
    status approval_status NOT NULL DEFAULT 'pending',
    requested_by VARCHAR(128),
    approved_by VARCHAR(128),
    rejection_reason TEXT,
    expires_at TIMESTAMPTZ,
    resolved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE support_tickets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID REFERENCES organizations(id),
    external_id VARCHAR(255),
    subject VARCHAR(512) NOT NULL,
    body TEXT,
    category VARCHAR(128),
    priority VARCHAR(32),
    status VARCHAR(64) DEFAULT 'open',
    correlated_incident_id UUID REFERENCES incidents(id),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE research_signals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID REFERENCES organizations(id),
    source VARCHAR(128) NOT NULL,
    title VARCHAR(512) NOT NULL,
    summary TEXT,
    url VARCHAR(1024),
    signal_type VARCHAR(64),
    relevance_score FLOAT,
    correlated_incident_id UUID REFERENCES incidents(id),
    metadata JSONB DEFAULT '{}',
    published_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE agent_executions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    incident_id UUID REFERENCES incidents(id),
    workflow_id UUID REFERENCES workflows(id),
    agent_name VARCHAR(128) NOT NULL,
    module VARCHAR(64) NOT NULL,
    model_used VARCHAR(128),
    input_tokens INT,
    output_tokens INT,
    duration_ms INT,
    status VARCHAR(64) NOT NULL,
    output_summary TEXT,
    trace_id VARCHAR(128),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE tool_invocations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    incident_id UUID REFERENCES incidents(id),
    workflow_id UUID REFERENCES workflows(id),
    tool_server VARCHAR(128) NOT NULL,
    tool_name VARCHAR(128) NOT NULL,
    arguments JSONB DEFAULT '{}',
    result_summary TEXT,
    status VARCHAR(64) NOT NULL,
    duration_ms INT,
    trace_id VARCHAR(128),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO organizations (id, name) VALUES
    ('00000000-0000-0000-0000-000000000001', 'Default Organization');
