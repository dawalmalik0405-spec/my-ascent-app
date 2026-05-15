import { API_URL } from "./utils";

export interface Incident {
  id: string;
  correlation_id: string;
  title: string;
  severity: string;
  status: string;
  service: string | null;
  root_cause: string | null;
  remediation_summary?: string | null;
  incident_report?: string | null;
  last_error?: string | null;
  temporal_workflow_id: string | null;
  created_at: string;
}

export interface McpToolResult {
  tool?: string;
  success?: boolean;
  error?: string | null;
  data?: unknown;
  server?: string;
}

export interface IncidentTrace {
  incident_id: string;
  status: string;
  temporal_workflow_id: string | null;
  github_repo?: string;
  github_configured?: boolean;
  investigation?: {
    investigation_findings?: string[];
    tool_results?: McpToolResult[];
    root_cause?: string;
  } | null;
  last_error?: string | null;
  timeline: Array<{
    type: string;
    agent: string | null;
    payload: Record<string, unknown>;
    timestamp: string;
  }>;
  workflow_steps: Array<{
    step: string;
    agent: string | null;
    status: string;
    duration_ms: number | null;
    output: Record<string, unknown>;
  }>;
}

export async function fetchIncidents(): Promise<Incident[]> {
  const res = await fetch(`${API_URL}/api/v1/incidents`, { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to fetch incidents");
  return res.json();
}

export async function fetchIncident(id: string): Promise<Incident> {
  const res = await fetch(`${API_URL}/api/v1/incidents/${id}`, { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to fetch incident");
  return res.json();
}

export async function fetchIncidentTrace(id: string): Promise<IncidentTrace> {
  const res = await fetch(`${API_URL}/api/v1/workflows/incident/${id}/trace`, {
    cache: "no-store",
  });
  if (!res.ok) throw new Error("Failed to fetch trace");
  return res.json();
}

export async function triggerDemoAlert(): Promise<Incident> {
  const res = await fetch(`${API_URL}/api/v1/webhooks/alerts`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      status: "firing",
      labels: {
        alertname: "PaymentAPILatencyHigh",
        severity: "critical",
        service: "payment-api",
        environment: "production",
      },
      annotations: {
        summary: "Payment API P99 latency > 2s",
        description: "Autonomous investigation triggered from dashboard demo",
      },
    }),
  });
  if (!res.ok) throw new Error("Failed to trigger alert");
  return res.json();
}

export async function approveIncident(id: string): Promise<void> {
  const res = await fetch(`${API_URL}/api/v1/incidents/${id}/approve`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ approved_by: "dashboard-operator" }),
  });
  if (!res.ok) {
    const detail = await res.text();
    throw new Error(detail || "Approval failed");
  }
}

export async function fetchMcpTools() {
  const res = await fetch(`${API_URL}/api/v1/tools/mcp`, { cache: "no-store" });
  if (!res.ok) return [];
  return res.json();
}

export interface SupportTicket {
  id: string;
  subject: string;
  category: string | null;
  priority: string | null;
  status: string;
  correlated_incident_id: string | null;
  customer_email?: string | null;
  suggested_response?: string | null;
  email_status?: string | null;
  email_error?: string | null;
}

export async function submitCustomerComplaint(body: {
  customer_email: string;
  customer_name?: string;
  subject: string;
  body: string;
}): Promise<SupportTicket> {
  const res = await fetch(`${API_URL}/api/v1/support/complaints`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || "Failed to submit complaint");
  }
  return res.json();
}

export async function fetchSupportTickets(): Promise<SupportTicket[]> {
  const res = await fetch(`${API_URL}/api/v1/support/tickets`, { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to fetch support tickets");
  return res.json();
}

export async function submitSupportTicket(body: {
  subject: string;
  body: string;
  priority?: string;
  customer_email?: string;
}): Promise<SupportTicket> {
  const res = await fetch(`${API_URL}/api/v1/support/tickets`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error("Failed to submit ticket");
  return res.json();
}

export interface ResearchTrend {
  name: string;
  summary: string;
  impact: string;
  sector?: string;
}

export interface ResearchNewsItem {
  title: string;
  url?: string;
  snippet?: string;
  summary?: string;
  watch_topic?: string;
}

export interface ResearchSignal {
  id: string;
  source: string;
  title: string;
  summary: string;
  signal_type: string;
  created_at: string;
  metadata?: Record<string, unknown>;
}

export interface ResearchDashboard {
  last_scan_at: string | null;
  last_scan_source: string | null;
  last_query: string | null;
  trends: ResearchTrend[];
  news: ResearchNewsItem[];
  competitor_intel: Array<{ name: string; move: string; relevance?: string }>;
  strategic_summary: string;
  signals: ResearchSignal[];
  auto_scan_enabled: boolean;
  auto_scan_interval_hours: number;
  default_query: string;
  analysis_snapshot?: string | null;
  pulse_highlights?: string[];
  aggregated_news_count?: number;
  aggregated_trends_count?: number;
  signal_count?: number;
  sectors_monitored?: string[];
  watch_queries?: string[];
}

export interface ResearchScanResult {
  query: string;
  trends: ResearchTrend[];
  news: ResearchNewsItem[];
  strategic_insights: string;
  competitor_intel: Array<Record<string, unknown>>;
  signal_id?: string;
}

export interface ResearchAskResult {
  query: string;
  answer: string;
  trends: ResearchTrend[];
  news: ResearchNewsItem[];
}

export async function fetchResearchDashboard(): Promise<ResearchDashboard | null> {
  const res = await fetch(`${API_URL}/api/v1/research/dashboard`, { cache: "no-store" });
  if (!res.ok) return null;
  return res.json();
}

export async function askResearch(query: string): Promise<ResearchAskResult> {
  const res = await fetch(`${API_URL}/api/v1/research/ask`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query }),
  });
  if (!res.ok) throw new Error("Research question failed");
  return res.json();
}

export async function fetchResearchSignals(): Promise<ResearchSignal[]> {
  const res = await fetch(`${API_URL}/api/v1/research/signals`, { cache: "no-store" });
  if (!res.ok) return [];
  return res.json();
}

export async function runResearchScan(query: string): Promise<ResearchScanResult> {
  const res = await fetch(`${API_URL}/api/v1/research/scan`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query }),
  });
  if (!res.ok) throw new Error("Research scan failed");
  return res.json();
}
