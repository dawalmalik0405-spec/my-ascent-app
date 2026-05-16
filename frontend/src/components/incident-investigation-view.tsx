"use client";

import { useCallback, useEffect, useState } from "react";
import type { LucideIcon } from "lucide-react";
import {
  Boxes,
  CheckCircle2,
  Cloud,
  Cpu,
  Github,
  MessageSquare,
  Search,
  Wrench,
  XCircle,
} from "lucide-react";
import { IncidentAgentPipeline } from "@/components/incident-agent-pipeline";
import { ApprovalButton } from "@/components/approval-button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { MarkdownReport } from "@/components/markdown-report";
import {
  fetchIncident,
  fetchIncidentTrace,
  type Incident,
  type IncidentTrace,
} from "@/lib/api";
import { cn } from "@/lib/utils";

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
    resolved: "Incident resolved. See findings and structured reports below.",
    cancelled: "Incident was cancelled or approval was rejected.",
    failed: "Workflow failed. Check worker logs and Temporal UI.",
  };
  return map[status] ?? `Status: ${status}`;
}

function evidenceLooksOk(line: string): boolean {
  const l = line.toLowerCase();
  if (l.includes("failed") || l.includes("failure")) return false;
  return l.includes(": ok") || /\bok\s*\(/.test(l);
}

function iconForEvidence(line: string): LucideIcon {
  const l = line.toLowerCase();
  if (l.includes("kubernetes")) return Boxes;
  if (l.includes("github")) return Github;
  if (l.includes("cloud.") || l.includes("metrics")) return Cloud;
  if (l.includes("search.")) return Search;
  if (l.includes("slack")) return MessageSquare;
  return Cpu;
}

function iconForTool(toolKey?: string): LucideIcon {
  const t = (toolKey ?? "").toLowerCase();
  if (t.startsWith("kubernetes")) return Boxes;
  if (t.startsWith("github")) return Github;
  if (t.startsWith("cloud")) return Cloud;
  if (t.startsWith("search")) return Search;
  if (t.startsWith("slack")) return MessageSquare;
  if (t.startsWith("invoke") || t.includes("scale")) return Wrench;
  return Cpu;
}

function RemediationContent({ text }: { text: string }) {
  const t = text.trim();
  if ((t.startsWith("[") || t.startsWith("{")) && t.length > 2) {
    try {
      const parsed = JSON.parse(t);
      return (
        <pre className="overflow-x-auto rounded-xl border border-border/70 bg-muted/40 p-4 font-mono text-xs leading-relaxed text-foreground dark:bg-muted/20">
          {JSON.stringify(parsed, null, 2)}
        </pre>
      );
    } catch {
      /* markdown fallback */
    }
  }
  return <MarkdownReport content={text} />;
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
    const id = window.setInterval(refresh, 2500);
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
    <div className="space-y-8 pb-12">
      <div className="relative overflow-hidden rounded-2xl border border-border/70 bg-gradient-to-br from-card via-card to-primary/[0.07] p-6 shadow-[0_20px_60px_-30px_hsl(var(--primary)/0.35)]">
        <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-primary/10 blur-3xl" />
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-primary/90">
              Incident investigation · AegisOps
            </p>
            <h1 className="mt-1 text-3xl font-bold tracking-tight sm:text-4xl">{incident.title}</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {incident.service ?? "unknown"} · <span className="text-foreground">{incident.severity}</span> ·{" "}
              <span className="font-mono text-xs text-primary/90">{incident.correlation_id}</span>
            </p>
            <p className="mt-1 font-mono text-[11px] text-muted-foreground/80">{incident.id}</p>
          </div>
          <div className="flex flex-col items-start gap-3 sm:items-end">
            <Badge variant={trace.status === "resolved" ? "resolved" : incident.severity} className="text-sm">
              {trace.status}
            </Badge>
            {isActive(trace.status) && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span
                  className={cn(
                    "h-2 w-2 rounded-full bg-primary",
                    refreshing ? "animate-ping" : "animate-pulse"
                  )}
                />
                {refreshing ? "Syncing trace…" : "Live · polling every 2.5s"}
              </div>
            )}
            {lastUpdated && (
              <p className="text-xs text-muted-foreground">Last sync {lastUpdated.toLocaleTimeString()}</p>
            )}
            {trace.status === "awaiting_approval" && (
              <ApprovalButton incidentId={incidentId} onApproved={refresh} />
            )}
          </div>
        </div>
        <div className="relative mt-8">
          <IncidentAgentPipeline trace={trace} />
        </div>
      </div>

      <Card className="border-primary/25 bg-primary/[0.04] transition-shadow duration-300 hover:shadow-lg hover:shadow-primary/5">
        <h2 className="mb-2 text-lg font-semibold">How this works</h2>
        <p className="text-sm leading-relaxed text-muted-foreground">
          This module does <strong className="text-foreground">not</strong> scan your repo continuously.
          A <strong className="text-foreground">monitoring alert</strong> starts an incident; agents investigate via MCP
          (GitHub, Kubernetes, metrics, search). Evidence below is normalized into readable artifacts — conclusions render as rich Markdown reports for demos.
        </p>
      </Card>

      {(incident.last_error || trace.last_error) && (
        <Card className="border-destructive/50 bg-destructive/10">
          <h2 className="mb-2 text-lg font-semibold text-destructive">Investigation error</h2>
          <p className="text-sm text-destructive/90">{incident.last_error || trace.last_error}</p>
          <p className="mt-2 text-xs text-muted-foreground">
            Common cause: LLM request timed out (Temporal heartbeat). Restart the worker after updating; evidence below may still show MCP results gathered before the failure.
          </p>
        </Card>
      )}

      <Card className="transition-colors duration-300 hover:border-border">
        <h2 className="mb-2 text-lg font-semibold">What happened</h2>
        <p className="text-sm leading-relaxed transition-all duration-500">{statusNarrative(trace.status)}</p>
        {failedTools.length > 0 && (
          <div className="mt-4 rounded-xl border border-destructive/40 bg-destructive/10 p-4">
            <p className="text-sm font-medium text-destructive">{failedTools.length} tool call(s) failed</p>
            <ul className="mt-2 space-y-1.5 text-sm text-destructive/90">
              {failedTools.map((t) => (
                <li key={t.tool} className="flex gap-2 font-mono text-xs">
                  <XCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>
                    {t.tool}: {t.error ?? "unknown error"}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </Card>

      {findings.length > 0 && (
        <Card className="border-border/65">
          <h2 className="mb-1 text-lg font-semibold">What we checked (evidence)</h2>
          <p className="mb-5 text-sm text-muted-foreground">
            Parsed investigator checkpoints — passes calm styling; failures highlight in destructive violet/red cues with MCP/tool glyphs.
          </p>
          <ul className="space-y-3">
            {findings.map((f) => {
              const ok = evidenceLooksOk(f);
              const Icon = iconForEvidence(f);
              return (
                <li
                  key={f}
                  className={cn(
                    "flex gap-4 rounded-2xl border px-4 py-4 transition-colors sm:items-start",
                    ok
                      ? "border-border/70 bg-muted/15 hover:border-primary/20 dark:bg-muted/10"
                      : "border-destructive/35 bg-destructive/[0.06]"
                  )}
                >
                  <div
                    className={cn(
                      "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border",
                      ok
                        ? "border-success/30 bg-success/10 text-success"
                        : "border-destructive/35 bg-destructive/10 text-destructive"
                    )}
                  >
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant={ok ? "resolved" : "critical"}>{ok ? "Pass" : "Fail"}</Badge>
                      {!ok && <span className="text-[11px] font-medium uppercase text-destructive/90">Needs attention</span>}
                    </div>
                    <p className="mt-2 font-mono text-[13px] leading-relaxed text-foreground">{f}</p>
                  </div>
                  <div className="hidden shrink-0 sm:block">
                    {ok ? (
                      <CheckCircle2 className="h-6 w-6 text-success/90" />
                    ) : (
                      <XCircle className="h-6 w-6 text-destructive/90" />
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </Card>
      )}

      {allTools.length > 0 && (
        <Card className="border-border/65">
          <h2 className="mb-1 text-lg font-semibold">Tools run during investigation</h2>
          <p className="mb-5 text-sm text-muted-foreground">Structured executor ledger mapped one row per MCP/tool invocation.</p>
          <div className="space-y-3">
            {allTools.map((r, i) => {
              const Icon = iconForTool(r.tool);
              return (
                <div
                  key={`${r.tool}-${i}`}
                  className="flex flex-col gap-3 rounded-2xl border border-border/65 bg-muted/10 px-4 py-4 sm:flex-row sm:items-center sm:justify-between dark:bg-muted/5"
                >
                  <div className="flex min-w-0 items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/12 text-primary">
                      <Icon className="h-5 w-5" />
                    </div>
                    <span className="break-all font-mono text-xs leading-snug text-foreground">{r.tool}</span>
                  </div>
                  <Badge variant={r.success ? "resolved" : "critical"}>{r.success ? "ok" : "failed"}</Badge>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      <Card className="border-border/65">
        <h2 className="mb-3 text-lg font-semibold">GitHub repository check</h2>
        <p className="text-sm text-muted-foreground">
          Repo:{" "}
          <span className="font-mono text-foreground">{trace.github_repo ?? "not configured"}</span>
          {!trace.github_configured && (
            <span className="ml-2 text-warning"> — GITHUB_TOKEN missing in .env</span>
          )}
        </p>
        <p className="mt-2 text-xs text-muted-foreground">
          Runs during <strong className="text-foreground">root_cause_analysis</strong> (not on every commit). Push a commit,
          then start a new incident to see it in recent commits.
        </p>
        {githubTools.length === 0 && isActive(trace.status) && (
          <p className="mt-3 text-sm text-muted-foreground">
            Waiting for RCA agent… refresh will update when GitHub tools run.
          </p>
        )}
        {githubTools.length === 0 && !isActive(trace.status) && (
          <p className="mt-3 text-sm text-muted-foreground">
            No GitHub tool results stored. Workflow may have failed before RCA, or this incident predates evidence logging.
          </p>
        )}
        <div className="mt-4 space-y-3">
          {githubTools.map((r, i) => {
            const commits = r.tool === "github.list_commits" ? formatCommits(r.data) : [];
            return (
              <div
                key={`${r.tool}-${i}`}
                className={cn(
                  "rounded-2xl border p-4",
                  r.success ? "border-border/70 bg-muted/10 dark:bg-muted/5" : "border-destructive/35 bg-destructive/[0.06]"
                )}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2 font-mono text-sm">
                    <Github className="h-4 w-4 shrink-0 text-primary" />
                    {r.tool}
                  </div>
                  <Badge variant={r.success ? "resolved" : "critical"}>{r.success ? "ok" : "failed"}</Badge>
                </div>
                {r.error && <p className="mt-2 text-sm text-destructive">Error: {r.error}</p>}
                {commits.length > 0 && (
                  <ul className="mt-3 space-y-1 border-t border-border/50 pt-3 font-mono text-xs text-muted-foreground">
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
      </Card>

      {trace.temporal_workflow_id && (
        <Card className="border-primary/25 bg-primary/[0.04]">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-primary">Temporal Workflow</p>
              <p className="mt-2 font-mono text-sm text-foreground">{trace.temporal_workflow_id}</p>
            </div>
            <a
              href="http://localhost:8080"
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground shadow-md shadow-primary/20 hover:opacity-90"
            >
              Open Temporal UI
            </a>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">Paste or search this workflow id in Temporal Web UI.</p>
        </Card>
      )}

      {incident.root_cause && (
        <Card className="border-border/65 overflow-hidden">
          <div className="border-b border-border/60 bg-muted/20 px-6 py-3 dark:bg-muted/10">
            <h2 className="text-lg font-semibold tracking-tight">Root cause (conclusion)</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">Rendered Markdown · headings, tables, and citations preserved.</p>
          </div>
          <div className="px-6 pb-6 pt-5">
            <MarkdownReport content={incident.root_cause} />
          </div>
        </Card>
      )}

      {incident.incident_report && (
        <Card className="border-border/65 overflow-hidden">
          <div className="border-b border-border/60 bg-muted/20 px-6 py-3 dark:bg-muted/10">
            <h2 className="text-lg font-semibold tracking-tight">Incident report</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">Executive-ready Markdown narrative generated post-incident.</p>
          </div>
          <div className="px-6 pb-6 pt-5">
            <MarkdownReport content={incident.incident_report} />
          </div>
        </Card>
      )}

      {incident.remediation_summary && (
        <Card className="border-border/65 overflow-hidden">
          <div className="border-b border-border/60 bg-muted/20 px-6 py-3 dark:bg-muted/10">
            <h2 className="text-lg font-semibold tracking-tight">Remediation</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">Structured payloads prettified automatically.</p>
          </div>
          <div className="px-6 pb-6 pt-5">
            <RemediationContent text={incident.remediation_summary} />
          </div>
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
                <div
                  key={`${event.type}-${event.timestamp}-${i}`}
                  className="flex gap-4 pb-6 timeline-row-enter"
                  style={{ animationDelay: `${Math.min(i, 12) * 40}ms` }}
                >
                  <div className="flex flex-col items-center">
                    <div
                      className={`h-3 w-3 rounded-full transition-all duration-300 ${
                        isLatest && isActive(trace.status)
                          ? "scale-110 animate-pulse bg-primary shadow-[0_0_12px_hsl(var(--primary)/0.6)]"
                          : "bg-primary"
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
          <h2 className="mb-4 text-lg font-semibold">Workflow steps</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {trace.workflow_steps.map((step, i) => (
              <div
                key={i}
                className="flex items-center justify-between gap-3 rounded-xl border border-border/65 bg-muted/15 px-4 py-3 dark:bg-muted/10"
              >
                <span className="font-medium capitalize">{step.step.replace(/_/g, " ")}</span>
                <Badge variant={step.status === "completed" ? "resolved" : "default"}>{step.status}</Badge>
              </div>
            ))}
          </div>
        </Card>
      )}

      {investigationRootCause && !incident.root_cause && (
        <Card className="border-border/65 overflow-hidden">
          <div className="border-b border-border/60 bg-muted/20 px-6 py-3 dark:bg-muted/10">
            <h2 className="mb-0 text-lg font-semibold">Investigation output</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">Interim RCA Markdown synced from the investigation activity.</p>
          </div>
          <div className="px-6 pb-6 pt-5">
            <MarkdownReport content={investigationRootCause} />
          </div>
        </Card>
      )}
    </div>
  );
}
