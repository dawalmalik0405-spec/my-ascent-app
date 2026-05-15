"use client";

import { useCallback, useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ApprovalButton } from "@/components/approval-button";
import {
  fetchIncident,
  fetchIncidentTrace,
  type Incident,
  type IncidentTrace,
} from "@/lib/api";

const TERMINAL = new Set(["resolved", "cancelled", "failed"]);

function isActive(status: string) {
  return !TERMINAL.has(status);
}

type ToolResult = {
  tool?: string;
  success?: boolean;
  error?: string | null;
  data?: unknown;
};

function investigationPayload(trace: IncidentTrace): {
  tool_results: ToolResult[];
  investigation_findings: string[];
  root_cause?: string;
} {
  const fromStep = trace.workflow_steps.find((s) => s.step === "investigation")?.output;
  const stepObj =
    fromStep && typeof fromStep === "object" ? (fromStep as Record<string, unknown>) : {};
  const inv = trace.investigation ?? {};
  const tool_results = [
    ...(Array.isArray(inv.tool_results) ? inv.tool_results : []),
    ...(Array.isArray(stepObj.tool_results) ? (stepObj.tool_results as ToolResult[]) : []),
  ];
  const investigation_findings = [
    ...(Array.isArray(inv.investigation_findings) ? inv.investigation_findings : []),
    ...(Array.isArray(stepObj.investigation_findings)
      ? (stepObj.investigation_findings as string[])
      : []),
  ];
  const root_cause =
    (typeof inv.root_cause === "string" ? inv.root_cause : undefined) ??
    (typeof stepObj.root_cause === "string" ? stepObj.root_cause : undefined);
  return { tool_results, investigation_findings, root_cause };
}

function githubToolsFromTrace(trace: IncidentTrace): ToolResult[] {
  return investigationPayload(trace).tool_results.filter((r) =>
    (r.tool ?? "").startsWith("github.")
  );
}

function statusNarrative(status: string): string {
  const map: Record<string, string> = {
    received: "Alert received. Starting autonomous investigation…",
    triaging: "Agents are triaging the alert and gathering context.",
    correlating: "Checking for similar past incidents.",
    investigating: "Running root cause analysis (GitHub, logs, metrics, search).",
    awaiting_approval: "Investigation complete. Human approval required before remediation.",
    executing: "Executing approved remediation actions.",
    validating: "Validating that the service recovered.",
    reporting: "Generating incident report.",
    resolved: "Incident resolved. See findings and root cause below.",
    cancelled: "Incident was cancelled or approval was rejected.",
    failed: "Workflow failed. Check worker logs and Temporal UI.",
  };
  return map[status] ?? `Status: ${status}`;
}

function formatCommits(data: unknown): string[] {
  if (!data) return [];
  if (Array.isArray(data)) {
    return data.slice(0, 5).map((c) => {
      if (typeof c === "object" && c !== null) {
        const o = c as Record<string, unknown>;
        const sha = String(o.sha ?? o.id ?? "").slice(0, 7);
        const msg =
          (o.commit as Record<string, unknown> | undefined)?.message ??
          o.message ??
          o.title ??
          "";
        return sha ? `${sha}: ${String(msg).split("\n")[0]}` : String(msg).split("\n")[0];
      }
      return String(c);
    });
  }
  if (typeof data === "object" && data !== null) {
    const o = data as Record<string, unknown>;
    const items = o.commits ?? o.items ?? o.data;
    if (Array.isArray(items)) return formatCommits(items);
  }
  return [];
}

export function IncidentInvestigationView({
  incidentId,
  initialIncident,
  initialTrace,
}: {
  incidentId: string;
  initialIncident: Incident;
  initialTrace: IncidentTrace;
}) {
  const [incident, setIncident] = useState(initialIncident);
  const [trace, setTrace] = useState(initialTrace);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const [inc, tr] = await Promise.all([
        fetchIncident(incidentId),
        fetchIncidentTrace(incidentId),
      ]);
      setIncident(inc);
      setTrace(tr);
      setLastUpdated(new Date());
    } catch {
      /* keep last good data */
    } finally {
      setRefreshing(false);
    }
  }, [incidentId]);

  useEffect(() => {
    if (!isActive(trace.status)) return;
    const id = window.setInterval(refresh, 5000);
    return () => window.clearInterval(id);
  }, [trace.status, refresh]);

  const { tool_results: allTools, investigation_findings: findings } =
    investigationPayload(trace);
  const githubTools = githubToolsFromTrace(trace);
  const failedTools = allTools.filter((r) => r.success === false);

  const investigationStep = trace.workflow_steps.find((s) => s.step === "investigation");
  const investigationRootCause =
    investigationStep?.output &&
    typeof investigationStep.output === "object" &&
    "root_cause" in investigationStep.output
      ? String((investigationStep.output as { root_cause?: string }).root_cause ?? "")
      : "";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Incident Investigation</h1>
          <p className="mt-1 text-lg">{incident.title}</p>
          <p className="text-sm text-muted-foreground">
            {incident.service ?? "unknown"} · {incident.severity} ·{" "}
            <span className="font-mono text-xs">{incident.correlation_id}</span>
          </p>
          <p className="font-mono text-xs text-muted-foreground">{incident.id}</p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <Badge variant={trace.status === "resolved" ? "resolved" : incident.severity}>
            {trace.status}
          </Badge>
          {isActive(trace.status) && (
            <p className="text-xs text-muted-foreground">
              {refreshing ? "Updating…" : "Auto-refresh every 5s"}
            </p>
          )}
          {lastUpdated && (
            <p className="text-xs text-muted-foreground">
              Updated {lastUpdated.toLocaleTimeString()}
            </p>
          )}
          {trace.status === "awaiting_approval" && (
            <ApprovalButton incidentId={incidentId} onApproved={refresh} />
          )}
        </div>
      </div>

      <Card className="border-primary/30 bg-primary/5">
        <h2 className="mb-2 text-lg font-semibold">How incident intelligence works</h2>
        <p className="text-sm leading-relaxed text-muted-foreground">
          This module does <strong className="text-foreground">not</strong> scan your repo continuously.
          A <strong className="text-foreground">monitoring alert</strong> starts an incident; then agents
          investigate using GitHub, Kubernetes, metrics, and search. Results appear in the sections below.
        </p>
      </Card>

      {(incident.last_error || trace.last_error) && (
        <Card className="border-destructive/50 bg-destructive/10">
          <h2 className="mb-2 text-lg font-semibold text-destructive">Investigation error</h2>
          <p className="text-sm text-destructive/90">
            {incident.last_error || trace.last_error}
          </p>
          <p className="mt-2 text-xs text-muted-foreground">
            Common cause: LLM request timed out (Temporal heartbeat). Restart the worker after
            updating; evidence below may still show GitHub/MCP results gathered before the failure.
          </p>
        </Card>
      )}

      <Card>
        <h2 className="mb-2 text-lg font-semibold">What happened</h2>
        <p className="text-sm leading-relaxed">{statusNarrative(trace.status)}</p>
        {failedTools.length > 0 && (
          <div className="mt-3 rounded border border-destructive/40 bg-destructive/10 p-3">
            <p className="text-sm font-medium text-destructive">
              {failedTools.length} tool call(s) failed
            </p>
            <ul className="mt-1 list-inside list-disc text-sm text-destructive/90">
              {failedTools.map((t) => (
                <li key={t.tool}>
                  {t.tool}: {t.error ?? "unknown error"}
                </li>
              ))}
            </ul>
          </div>
        )}
      </Card>

      {findings.length > 0 && (
        <Card>
          <h2 className="mb-3 text-lg font-semibold">What we checked (evidence)</h2>
          <ul className="space-y-2">
            {findings.map((f) => (
              <li
                key={f}
                className={`rounded border px-3 py-2 font-mono text-xs ${
                  f.includes(": ok") || f.endsWith("ok")
                    ? "border-border text-muted-foreground"
                    : "border-destructive/40 text-destructive"
                }`}
              >
                {f}
              </li>
            ))}
          </ul>
        </Card>
      )}

      {allTools.length > 0 && (
        <Card>
          <h2 className="mb-3 text-lg font-semibold">Tools run during investigation</h2>
          <div className="space-y-2">
            {allTools.map((r, i) => (
              <div
                key={`${r.tool}-${i}`}
                className="flex flex-wrap items-center justify-between gap-2 rounded border border-border px-3 py-2"
              >
                <span className="font-mono text-xs">{r.tool}</span>
                <Badge variant={r.success ? "resolved" : "critical"}>
                  {r.success ? "ok" : "failed"}
                </Badge>
              </div>
            ))}
          </div>
        </Card>
      )}

      <Card>
        <h2 className="mb-3 text-lg font-semibold">GitHub repository check</h2>
        <p className="text-sm text-muted-foreground">
          Repo:{" "}
          <span className="font-mono text-foreground">
            {trace.github_repo ?? "not configured"}
          </span>
          {!trace.github_configured && (
            <span className="ml-2 text-warning"> — GITHUB_TOKEN missing in .env</span>
          )}
        </p>
        <p className="mt-2 text-xs text-muted-foreground">
          Runs during <strong className="text-foreground">root_cause_analysis</strong> (not on every
          commit). Push a commit, then start a new incident to see it in recent commits.
        </p>
        {githubTools.length === 0 && isActive(trace.status) && (
          <p className="mt-3 text-sm text-muted-foreground">
            Waiting for RCA agent… refresh will update when GitHub tools run.
          </p>
        )}
        {githubTools.length === 0 && !isActive(trace.status) && (
          <p className="mt-3 text-sm text-muted-foreground">
            No GitHub tool results stored. Workflow may have failed before RCA, or this incident
            predates evidence logging.
          </p>
        )}
        <div className="mt-4 space-y-3">
          {githubTools.map((r, i) => {
            const commits = r.tool === "github.list_commits" ? formatCommits(r.data) : [];
            return (
              <div key={`${r.tool}-${i}`} className="rounded border border-border p-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-sm">{r.tool}</span>
                  <Badge variant={r.success ? "resolved" : "critical"}>
                    {r.success ? "ok" : "failed"}
                  </Badge>
                </div>
                {r.error && (
                  <p className="mt-2 text-sm text-destructive">Error: {r.error}</p>
                )}
                {commits.length > 0 && (
                  <ul className="mt-2 list-inside list-disc text-sm text-muted-foreground">
                    {commits.map((c) => (
                      <li key={c}>{c}</li>
                    ))}
                  </ul>
                )}
                {r.success && commits.length === 0 && r.tool === "github.list_commits" && (
                  <p className="mt-2 text-sm text-muted-foreground">
                    Call succeeded; no commits parsed (empty repo or API shape).
                  </p>
                )}
              </div>
            );
          })}
        </div>
        {findings.filter((f) => f.includes("github.")).length > 0 && (
          <ul className="mt-3 list-inside list-disc text-xs text-muted-foreground">
            {findings.filter((f) => f.includes("github.")).map((f) => (
              <li key={f}>{f}</li>
            ))}
          </ul>
        )}
      </Card>

      {trace.temporal_workflow_id && (
        <Card>
          <p className="text-sm text-muted-foreground">Temporal Workflow</p>
          <p className="font-mono text-sm">{trace.temporal_workflow_id}</p>
          <p className="mt-2 text-xs text-muted-foreground">
            <a href="http://localhost:8080" target="_blank" rel="noopener noreferrer" className="text-primary underline">
              Open Temporal UI
            </a>{" "}
            and search this id.
          </p>
        </Card>
      )}
      {incident.root_cause && (
        <Card>
          <h2 className="mb-2 text-lg font-semibold">Root cause (conclusion)</h2>
          <p className="whitespace-pre-wrap text-sm leading-relaxed">{incident.root_cause}</p>
        </Card>
      )}
      {incident.incident_report && (
        <Card>
          <h2 className="mb-2 text-lg font-semibold">Incident report</h2>
          <p className="whitespace-pre-wrap text-sm leading-relaxed">{incident.incident_report}</p>
        </Card>
      )}
      {incident.remediation_summary && (
        <Card>
          <h2 className="mb-2 text-lg font-semibold">Remediation</h2>
          <p className="whitespace-pre-wrap font-mono text-xs text-muted-foreground">
            {incident.remediation_summary}
          </p>
        </Card>
      )}
      <Card>
        <h2 className="mb-4 text-lg font-semibold">Execution Timeline</h2>
        {trace.timeline.length === 0 ? (
          <p className="text-sm text-muted-foreground">No events yet.</p>
        ) : (
          <div className="space-y-0">
            {trace.timeline.map((event, i) => {
              const summary =
                typeof event.payload?.summary === "string" ? event.payload.summary : null;
              const isLatest = i === trace.timeline.length - 1;
              return (
                <div key={`${event.type}-${event.timestamp}-${i}`} className="flex gap-4 pb-6">
                  <div className="flex flex-col items-center">
                    <div
                      className={`h-3 w-3 rounded-full ${
                        isLatest && isActive(trace.status) ? "animate-pulse bg-primary" : "bg-primary"
                      }`}
                    />
                    {i < trace.timeline.length - 1 && <div className="w-px flex-1 bg-border" />}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">{event.type}</p>
                    {event.agent && <p className="text-sm text-primary">Agent: {event.agent}</p>}
                    {summary && <p className="mt-1 text-sm text-muted-foreground">{summary}</p>}
                    <p className="mt-1 text-xs text-muted-foreground">
                      {new Date(event.timestamp).toLocaleString()}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>
      {trace.workflow_steps.length > 0 && (
        <Card>
          <h2 className="mb-4 text-lg font-semibold">Workflow Steps</h2>
          <div className="space-y-3">
            {trace.workflow_steps.map((step, i) => (
              <div key={i} className="rounded border border-border p-3">
                <div className="flex justify-between">
                  <span className="font-medium">{step.step}</span>
                  <Badge>{step.status}</Badge>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
      {investigationRootCause && !incident.root_cause && (
        <Card>
          <h2 className="mb-2 text-lg font-semibold">Investigation output</h2>
          <p className="whitespace-pre-wrap text-sm leading-relaxed">{investigationRootCause}</p>
        </Card>
      )}
    </div>
  );
}
