"use client";

import type { IncidentTrace } from "@/lib/api";
import {
  Bell,
  Bot,
  FileText,
  GitBranch,
  Search,
  ShieldCheck,
  UserCheck,
  Wrench,
} from "lucide-react";
import { cn } from "@/lib/utils";

const TERMINAL = new Set(["resolved", "cancelled", "failed"]);

type AgentDef = {
  id: string;
  label: string;
  caption: string;
  icon: typeof Bell;
};

const AGENTS: AgentDef[] = [
  { id: "alert_triage", label: "Triage", caption: "Classify alert & severity", icon: Bell },
  { id: "incident_correlation", label: "Correlation", caption: "Memory & similar incidents", icon: GitBranch },
  { id: "root_cause_analysis", label: "RCA", caption: "Tools, logs, GitHub", icon: Search },
  { id: "remediation", label: "Remediate", caption: "Plan & apply fixes", icon: Wrench },
  { id: "validation", label: "Validate", caption: "Recovery checks", icon: ShieldCheck },
  { id: "reporting", label: "Report", caption: "Incident narrative", icon: FileText },
];

function incidentIsActive(status: string) {
  return !TERMINAL.has(status);
}

function activeAgentFromStatus(status: string): string | null {
  switch (status) {
    case "received":
    case "triaging":
      return "alert_triage";
    case "correlating":
      return "incident_correlation";
    case "investigating":
      return "root_cause_analysis";
    case "planning":
    case "executing":
      return "remediation";
    case "validating":
      return "validation";
    case "reporting":
      return "reporting";
    case "awaiting_approval":
      return null;
    default:
      return null;
  }
}

function completedAgentsFromTimeline(trace: IncidentTrace): Set<string> {
  const done = new Set<string>();
  for (const e of trace.timeline) {
    if (e.type === "agent.completed" && e.agent) done.add(e.agent);
  }
  return done;
}

function AgentNode({
  def,
  state,
}: {
  def: AgentDef;
  state: "pending" | "active" | "done";
}) {
  const Icon = def.icon;
  return (
    <div
      className={cn(
        "relative flex min-w-[92px] flex-1 flex-col items-center gap-2 rounded-xl border px-2.5 py-3 text-center transition-all duration-500",
        state === "done" &&
          "border-success/35 bg-success/5 shadow-[0_0_24px_-8px_hsl(142_76%_36%_/_0.35)]",
        state === "active" &&
          "border-primary/60 bg-primary/10 shadow-[0_0_32px_-6px_hsl(217_91%_60%_/_0.45)] incident-node-active",
        state === "pending" && "border-border/80 bg-card/40 opacity-55"
      )}
    >
      <div
        className={cn(
          "flex h-10 w-10 items-center justify-center rounded-lg border transition-colors duration-300",
          state === "done" && "border-success/40 bg-success/15 text-success",
          state === "active" && "border-primary/50 bg-primary/20 text-primary",
          state === "pending" && "border-border bg-muted/30 text-muted-foreground"
        )}
      >
        {state === "done" ? (
          <span className="text-lg leading-none text-success">✓</span>
        ) : (
          <Icon
            className={cn(
              "h-5 w-5",
              state === "active" && "animate-[agent-icon-nudge_2.2s_ease-in-out_infinite]"
            )}
          />
        )}
      </div>
      <div>
        <p className="text-xs font-semibold tracking-tight">{def.label}</p>
        <p className="mt-0.5 hidden text-[10px] leading-tight text-muted-foreground sm:block">{def.caption}</p>
      </div>
      {state === "active" && (
        <span className="absolute -bottom-1 left-1/2 h-1 w-12 -translate-x-1/2 rounded-full bg-primary/70 animate-[shimmer-bar_1.4s_ease-in-out_infinite]" />
      )}
    </div>
  );
}

function Connector({ flowActive, filled }: { flowActive: boolean; filled: boolean }) {
  return (
    <div
      className={cn(
        "relative mx-0.5 hidden h-0.5 min-w-[12px] max-w-[40px] flex-[0.2] self-center sm:block",
        filled ? "bg-success/35" : "bg-border"
      )}
      aria-hidden
    >
      {flowActive && filled && (
        <span className="absolute inset-y-0 left-0 w-2/5 rounded-full bg-success/70 opacity-90 animate-[flow-dot_1.1s_linear_infinite]" />
      )}
      {flowActive && !filled && (
        <span className="absolute inset-y-0 left-0 w-2/5 rounded-full bg-primary/60 opacity-90 animate-[flow-dot_1.1s_linear_infinite]" />
      )}
    </div>
  );
}

function HumanGate({ live }: { live: boolean }) {
  return (
    <div
      className={cn(
        "flex min-w-[120px] max-w-[160px] shrink-0 flex-col items-center justify-center rounded-xl border px-2 py-3 text-center transition-all duration-500",
        live
          ? "border-warning/50 bg-warning/10 text-warning shadow-[0_0_28px_-8px_hsl(38_92%_50%_/_0.35)]"
          : "border-dashed border-border/70 bg-muted/10 text-muted-foreground"
      )}
    >
      <UserCheck className={cn("mb-1 h-6 w-6", live && "animate-pulse")} />
      <p className="text-[11px] font-semibold uppercase tracking-wide">Human gate</p>
      <p className="mt-1 text-[10px] leading-snug text-muted-foreground">
        {live ? "Approve to continue automation" : "Policy may bypass this step"}
      </p>
    </div>
  );
}

/** Ordered segments: four agents, gate, two agents — connectors between consecutive segments */
export function IncidentAgentPipeline({
  trace,
  className,
}: {
  trace: IncidentTrace;
  className?: string;
}) {
  const active = incidentIsActive(trace.status);
  const activeId = activeAgentFromStatus(trace.status);
  const completed = completedAgentsFromTimeline(trace);
  const gateLive = trace.status === "awaiting_approval";
  const workflowResolved = trace.status === "resolved";

  function agentState(id: string): "pending" | "active" | "done" {
    const isDone = completed.has(id) || (!active && workflowResolved);
    const isActiveNode = active && !isDone && activeId === id;
    if (isDone) return "done";
    if (isActiveNode) return "active";
    return "pending";
  }

  const segments: Array<{ kind: "agent"; def: AgentDef } | { kind: "gate" }> = [
    ...AGENTS.slice(0, 4).map((def) => ({ kind: "agent" as const, def })),
    { kind: "gate" },
    ...AGENTS.slice(4).map((def) => ({ kind: "agent" as const, def })),
  ];

  /** Progress has crossed the segment to the left of index `idx`. */
  function connectorFilledBefore(idx: number): boolean {
    if (idx <= 0) return false;
    if (workflowResolved) return true;
    const prev = segments[idx - 1];
    const cur = segments[idx];
    if (prev.kind === "agent" && cur?.kind === "gate") {
      return agentState(prev.def.id) === "done";
    }
    if (prev.kind === "gate" && cur?.kind === "agent") {
      if (gateLive) return false;
      const downstreamActive = ["validating", "reporting", "executing"].includes(trace.status);
      const downstreamTouched = AGENTS.slice(4).some((a) => agentState(a.id) !== "pending");
      return downstreamActive || downstreamTouched;
    }
    if (prev.kind === "agent" && cur?.kind === "agent") {
      return agentState(prev.def.id) === "done";
    }
    return false;
  }

  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-2 rounded-full border border-border/80 bg-muted/20 px-3 py-1 text-xs text-muted-foreground">
          <Bot className={cn("h-3.5 w-3.5", active && "animate-pulse text-primary")} />
          <span>
            {active
              ? "Agents run in sequence — this board updates as each step completes"
              : "Workflow finished — timeline below is the full record"}
          </span>
        </div>
      </div>

      <div className="relative rounded-2xl border border-border/60 bg-gradient-to-br from-card via-card to-primary/[0.03] p-3 shadow-inner sm:p-4">
        <div className="flex min-w-0 flex-wrap items-stretch justify-center gap-y-4 sm:flex-nowrap sm:overflow-x-auto sm:pb-1">
          {segments.map((seg, idx) => (
            <div key={seg.kind === "agent" ? seg.def.id : `gate-${idx}`} className="flex flex-1 items-stretch sm:flex-none">
              {idx > 0 && (
                <Connector flowActive={active} filled={connectorFilledBefore(idx)} />
              )}
              {seg.kind === "agent" ? (
                <AgentNode def={seg.def} state={agentState(seg.def.id)} />
              ) : (
                <HumanGate live={gateLive} />
              )}
            </div>
          ))}
        </div>
      </div>

      <LiveTimelineRibbon timeline={trace.timeline} active={active} />
    </div>
  );
}

function LiveTimelineRibbon({
  timeline,
  active,
}: {
  timeline: IncidentTrace["timeline"];
  active: boolean;
}) {
  const interesting = [...timeline]
    .filter((e) => e.type === "agent.completed" || e.type === "workflow.error" || e.type === "alert.received")
    .slice(-8);

  if (interesting.length === 0) {
    return (
      <div className="rounded-xl border border-border/60 bg-muted/10 px-4 py-3 font-mono text-xs text-muted-foreground">
        <span className="text-primary/90">{">"}</span> Waiting for first agent telemetry…
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-border/60 bg-[hsl(222_47%_7%)]">
      <div className="flex items-center gap-2 border-b border-border/50 px-4 py-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
        <span className={cn("h-2 w-2 rounded-full bg-primary", active && "animate-pulse")} />
        Live trace
      </div>
      <ul className="max-h-[220px] space-y-0 overflow-y-auto px-2 py-2 font-mono text-[11px] leading-relaxed sm:text-xs">
        {interesting.map((e, i) => {
          const summary =
            typeof e.payload?.summary === "string"
              ? e.payload.summary
              : typeof e.payload?.error === "string"
                ? e.payload.error
                : e.type;
          const isLatest = i === interesting.length - 1 && active;
          return (
            <li
              key={`${e.timestamp}-${e.type}-${i}`}
              className={cn(
                "feed-line-enter flex gap-3 border-l-2 py-2 pl-3 pr-2 transition-colors duration-300",
                e.type === "workflow.error"
                  ? "border-destructive/60 bg-destructive/[0.06]"
                  : isLatest
                    ? "border-primary/70 bg-primary/[0.06]"
                    : "border-transparent hover:border-border"
              )}
            >
              <span className="shrink-0 text-[10px] text-muted-foreground">
                {new Date(e.timestamp).toLocaleTimeString()}
              </span>
              <span className="min-w-0 flex-1">
                <span className="text-primary/90">{e.agent ?? "system"}</span>
                <span className="text-muted-foreground"> · </span>
                <span className="text-foreground/90">{summary}</span>
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
