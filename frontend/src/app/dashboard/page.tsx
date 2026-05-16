import type { ComponentType } from "react";
import Link from "next/link";
import { BrandLockup, BrandMark } from "@/components/brand-logo";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DemoTrigger } from "@/components/demo-trigger";
import { fetchIncidents, fetchMcpTools } from "@/lib/api";
import { DISPLAY_PRODUCT } from "@/lib/brand";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  ArrowUpRight,
  Bot,
  ExternalLink,
  Layers,
  Network,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Operations Console — AegisOps",
};

export default async function DashboardPage() {
  let incidents: Awaited<ReturnType<typeof fetchIncidents>> = [];
  let tools: unknown[] = [];
  try {
    [incidents, tools] = await Promise.all([fetchIncidents(), fetchMcpTools()]);
  } catch {
    /* API may be offline during build */
  }

  const active = incidents.filter((i) => i.status !== "resolved" && i.status !== "cancelled");
  const critical = incidents.filter((i) => i.severity === "critical");
  const resolvedPct =
    incidents.length === 0
      ? "—"
      : `${Math.round((incidents.filter((i) => i.status === "resolved").length / incidents.length) * 100)}%`;

  return (
    <div className="space-y-8 pb-10">
      {/* Executive hero */}
      <section className="relative overflow-hidden rounded-3xl border border-border/70 bg-card shadow-card">
        <div className="pointer-events-none absolute -left-24 top-0 h-72 w-72 rounded-full bg-primary/18 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-16 right-0 h-56 w-96 rounded-full bg-purple-500/10 blur-3xl dark:bg-purple-600/15" />
        <div className="relative border-b border-border/50 px-6 py-8 sm:px-8">
          <div className="flex flex-col gap-8 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex gap-5 sm:gap-6">
              <BrandMark size={52} />
              <div className="min-w-0 pt-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-primary/15 px-3 py-0.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-primary">
                    {DISPLAY_PRODUCT}
                  </span>
                  <span className="hidden rounded-full border border-border/80 px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground sm:inline-flex">
                    Live fabric
                  </span>
                </div>
                <h1 className="mt-3 text-balance text-3xl font-bold tracking-tight sm:text-4xl lg:text-[2.35rem]">
                  Operational command overview
                </h1>
                <p className="mt-3 max-w-2xl text-pretty text-sm leading-relaxed text-muted-foreground sm:text-[15px]">
                  Cross-incident posture, fleet tooling breadth, and one-click activation for demos — wired through a
                  single Temporal-backed mesh across incidents, support, and intelligence pipelines.
                </p>
              </div>
            </div>
            <div className="flex shrink-0 flex-col gap-3 sm:flex-row sm:items-center lg:flex-col lg:items-stretch">
              <DemoTrigger />
              <Link
                href="/incidents"
                prefetch
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-muted/25 px-4 py-2.5 text-center text-sm font-semibold transition hover:border-primary/35 hover:bg-muted/45"
              >
                Incident workspace
                <ArrowRight className="h-4 w-4 text-primary" />
              </Link>
            </div>
          </div>
        </div>
        <div className="relative flex flex-wrap items-center gap-3 px-6 py-4 sm:px-8">
          <FabricPill icon={Layers} label="Temporal workflows" />
          <FabricPill icon={Network} label="LangGraph agents" />
          <FabricPill icon={Bot} label={`${tools.length} MCP surfaces`} />
          <FabricPill
            icon={Activity}
            label={
              incidents.length === 0 ? "Fleet posture · awaiting intake" : `Fleet clearance · ${resolvedPct} resolved`
            }
          />
        </div>
      </section>

      {/* KPI strip */}
      <section aria-label="Key metrics">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard icon={AlertTriangle} label="Active incidents" value={String(active.length)} hint="Investigations open" />
          <StatCard icon={Zap} label="Critical signals" value={String(critical.length)} variant="critical" hint="Highest urgency" />
          <StatCard icon={Bot} label="Tool integrations" value={String(tools.length)} hint="MCP endpoints wired" />
          <StatCard icon={Activity} label="Incident archives" value={String(incidents.length)} hint="Historical corpus" />
        </div>
      </section>

      {/* Split workspace */}
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="relative overflow-hidden border-border/65 lg:col-span-2">
          <div className="pointer-events-none absolute right-0 top-0 h-40 w-40 rounded-full bg-primary/[0.07] blur-3xl" />
          <div className="relative mb-6 flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold tracking-tight">Incident runway</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Latest items routed through autonomous investigation — drill through for agent timelines & approvals.
              </p>
            </div>
            <Link
              href="/incidents"
              prefetch
              className="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline"
            >
              View queue
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          {incidents.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border/80 bg-muted/15 px-6 py-14 text-center">
              <p className="font-medium text-foreground">No incidents synchronized yet</p>
              <p className="mt-2 max-w-md mx-auto text-sm text-muted-foreground">
                Fire the demo circuit breaker alert — AegisOps promotes findings live across MCP-backed RCA threads.
              </p>
            </div>
          ) : (
            <div className="space-y-1">
              {incidents.slice(0, 6).map((inc, idx) => (
                <Link
                  key={inc.id}
                  href={`/incidents/${inc.id}`}
                  prefetch
                  className={cn(
                    "group flex flex-col gap-3 rounded-2xl border border-transparent px-4 py-4 transition sm:flex-row sm:items-center sm:justify-between",
                    "hover:border-primary/25 hover:bg-muted/35",
                    idx !== Math.min(5, incidents.length - 1) && "border-b border-border/40"
                  )}
                >
                  <div className="flex min-w-0 flex-1 items-start gap-3">
                    <span className="mt-1 h-8 w-1 shrink-0 rounded-full bg-primary/55 opacity-70 transition group-hover:opacity-100" />
                    <div className="min-w-0">
                      <p className="truncate font-medium leading-snug">{inc.title}</p>
                      <p className="mt-1 font-mono text-[11px] text-muted-foreground">
                        {inc.service ?? "unknown"} · {inc.correlation_id}
                      </p>
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-wrap gap-2 pl-4 sm:justify-end sm:pl-0">
                    <Badge variant={inc.severity}>{inc.severity}</Badge>
                    <Badge variant={inc.status === "resolved" ? "resolved" : "default"}>{inc.status}</Badge>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </Card>

        <div className="flex flex-col gap-6">
          <ShortcutsCard />
          <Card className="border-border/65 bg-muted/[0.12] dark:bg-muted/[0.08]">
            <BrandLockup size="sm" className="mb-4 opacity-95" />
            <p className="text-sm leading-relaxed text-muted-foreground">
              Investigations orchestrate as LangGraph nodes, persisted via Temporal. Evidence aggregates across MCP into the
              live traces shown inside each incident.
            </p>
            <ul className="mt-5 space-y-3 border-t border-border/50 pt-5 text-xs font-medium text-muted-foreground">
              <li className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-primary" /> Human gates before remediation
              </li>
              <li className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-primary" /> Vector correlation & similarity recall
              </li>
              <li className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-primary" /> Workflow replay & audit-friendly timelines
              </li>
            </ul>
          </Card>
        </div>
      </div>

      {/* Modules */}
      <section aria-label="Intelligence modules">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold tracking-tight">Operations intelligence surfaces</h2>
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
              Structured modules share navigation, guardrails, and presentation polish — optimized for judges and operators.
            </p>
          </div>
        </div>
        <div className="grid gap-5 md:grid-cols-3">
          <ModuleCard
            step="01"
            href="/incidents"
            title="Incident intelligence"
            desc="Agent pipeline from alert intake through RCA, remediation, validation, and narrative reporting."
            primary
          />
          <ModuleCard
            step="02"
            href="/support"
            title="Support intelligence"
            desc="Northwind-path complaints transform into classified tickets with KB grounding and contextual drafts."
          />
          <ModuleCard
            step="03"
            href="/research"
            title="R&D intelligence"
            desc="Sector-aware scans with merged dashboards that refresh while presenting executive narratives."
          />
        </div>
      </section>
    </div>
  );
}

function FabricPill({
  icon: Icon,
  label,
}: {
  icon: ComponentType<{ className?: string }>;
  label: string;
}) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-background/55 px-3 py-1.5 text-xs font-medium text-foreground backdrop-blur-sm dark:bg-background/25">
      <Icon className="h-3.5 w-3.5 text-primary" />
      {label}
    </span>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  variant,
  hint,
}: {
  icon: ComponentType<{ className?: string }>;
  label: string;
  value: string;
  variant?: string;
  hint?: string;
}) {
  return (
    <Card
      className={cn(
        "relative overflow-hidden border-border/65 pt-1 shadow-card transition hover:border-primary/25",
        variant === "critical" && "border-destructive/30"
      )}
    >
      <div className="mx-auto mb-4 h-1 w-[calc(100%-2rem)] rounded-full bg-gradient-to-r from-primary via-purple-500 to-fuchsia-500 opacity-90 dark:opacity-[0.85]" />
      <div className="flex items-start gap-4 px-1 pb-1">
        <div
          className={cn(
            "flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/12 text-primary",
            variant === "critical" && "bg-destructive/15 text-destructive"
          )}
        >
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-3xl font-bold tabular-nums tracking-tight">{value}</p>
          <p className="mt-1 text-xs font-medium text-muted-foreground">{label}</p>
          {hint ? <p className="mt-2 text-[11px] uppercase tracking-wider text-muted-foreground/80">{hint}</p> : null}
        </div>
      </div>
    </Card>
  );
}

function ShortcutsCard() {
  const links = [
    { href: "/workflows", label: "Workflow orchestration", desc: "Temporal topology & durability narrative", internal: true },
    { href: "/tools", label: "MCP catalog", desc: "Integration breadth surfaced to agents", internal: true },
    {
      href: "http://localhost:8080",
      label: "Temporal UI",
      desc: "Inspect schedules & histories",
      internal: false,
    },
  ];
  return (
    <Card className="border-border/65">
      <h2 className="text-base font-semibold tracking-tight">Operational shortcuts</h2>
      <p className="mt-1 text-xs text-muted-foreground">Jump to orchestration surfaces without breaking flow.</p>
      <ul className="mt-5 space-y-2">
        {links.map((item) =>
          item.internal ? (
            <li key={item.href}>
              <Link
                href={item.href}
                prefetch
                className="group flex items-start justify-between gap-3 rounded-xl border border-transparent px-3 py-3 transition hover:border-primary/20 hover:bg-muted/40"
              >
                <ShortcutInner item={item} />
              </Link>
            </li>
          ) : (
            <li key={item.href}>
              <a
                href={item.href}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex items-start justify-between gap-3 rounded-xl border border-transparent px-3 py-3 transition hover:border-primary/20 hover:bg-muted/40"
              >
                <ShortcutInner item={item} />
              </a>
            </li>
          )
        )}
      </ul>
    </Card>
  );
}

function ShortcutInner({
  item,
}: {
  item: { label: string; desc: string; internal: boolean };
}) {
  return (
    <div>
      <p className="flex items-center gap-1 text-sm font-semibold">
        {item.label}
        {!item.internal ? (
          <ExternalLink className="h-3.5 w-3.5 shrink-0 text-muted-foreground opacity-60 transition group-hover:text-primary" />
        ) : (
          <ArrowUpRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground opacity-0 transition group-hover:translate-x-px group-hover:opacity-100 group-hover:text-primary" />
        )}
      </p>
      <p className="mt-0.5 text-xs text-muted-foreground">{item.desc}</p>
    </div>
  );
}

function ModuleCard({
  step,
  href,
  title,
  desc,
  primary,
}: {
  step: string;
  href: string;
  title: string;
  desc: string;
  primary?: boolean;
}) {
  return (
    <Link
      href={href}
      prefetch
      className="group block rounded-3xl outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-primary"
    >
      <Card
        className={cn(
          "relative h-full overflow-hidden border-border/65 shadow-card transition duration-300 hover:border-primary/40 hover:shadow-glow",
          primary && "border-primary/35 bg-gradient-to-br from-card via-card to-primary/[0.07]"
        )}
      >
        <span className="absolute right-5 top-5 font-mono text-4xl font-bold tabular-nums text-muted-foreground/20 transition group-hover:text-primary/25">
          {step}
        </span>
        <div className="relative pr-14">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">Surface · {step}</p>
          <h3 className="mt-3 text-lg font-semibold tracking-tight transition group-hover:text-primary">{title}</h3>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{desc}</p>
          <div className="mt-6 flex flex-wrap items-center gap-2">
            {primary ? <Badge variant="medium">Flagship</Badge> : null}
            <span className="inline-flex items-center gap-1 text-sm font-semibold text-primary">
              Enter workspace
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </span>
          </div>
        </div>
      </Card>
    </Link>
  );
}
