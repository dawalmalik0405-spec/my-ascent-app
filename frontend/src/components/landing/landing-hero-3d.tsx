"use client";

import { Activity, AlertTriangle, CheckCircle2, Clock, Shield } from "lucide-react";

const steps = [
  { label: "Triage", state: "done" as const },
  { label: "Investigate", state: "active" as const },
  { label: "Remediate", state: "queued" as const },
  { label: "Validate", state: "queued" as const },
];

function ConsolePreviewPanel() {
  return (
    <div className="landing-console-preview relative overflow-hidden rounded-2xl border border-primary/25 bg-gradient-to-br from-card/95 via-card/85 to-primary/[0.08] shadow-[0_24px_80px_-24px_hsl(var(--primary)/0.35)] backdrop-blur-md dark:border-primary/35 dark:from-card/85 dark:via-card/70 dark:to-primary/[0.12] dark:shadow-[0_28px_90px_-28px_hsl(var(--primary)/0.45)]">
      <div className="flex items-center justify-between border-b border-border/50 bg-muted/30 px-4 py-3 dark:bg-muted/20">
        <div className="flex items-center gap-2">
          <span className="flex gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-red-400/90" />
            <span className="h-2.5 w-2.5 rounded-full bg-amber-400/90" />
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-400/90" />
          </span>
          <span className="hidden text-[11px] font-medium text-muted-foreground sm:inline">AegisOps · Operations</span>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/25 bg-emerald-500/10 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-400">
          <span className="relative flex h-1.5 w-1.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
          </span>
          Live
        </span>
      </div>

      <div className="flex min-h-[260px] flex-col sm:min-h-[300px] lg:min-h-[340px] lg:flex-row">
        <aside className="hidden w-[38%] shrink-0 border-r border-border/40 bg-muted/15 p-3 dark:bg-muted/10 sm:block lg:w-[32%]">
          <p className="mb-2 px-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Views</p>
          <ul className="space-y-1">
            {["Incidents", "Support", "Research", "Workflows"].map((item, i) => (
              <li
                key={item}
                className={`rounded-lg px-2 py-2 text-xs font-medium ${i === 0 ? "bg-primary/15 text-primary" : "text-muted-foreground"}`}
              >
                {item}
              </li>
            ))}
          </ul>
          <div className="mt-4 rounded-lg border border-dashed border-border/60 p-2">
            <p className="text-[10px] font-medium text-muted-foreground">Temporal run</p>
            <p className="mt-1 font-mono text-[10px] text-foreground">inv-wf · ns/default</p>
          </div>
        </aside>

        <div className="flex flex-1 flex-col p-4 sm:p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1 rounded-md bg-destructive/12 px-2 py-0.5 text-[11px] font-semibold text-destructive">
                  <AlertTriangle className="h-3 w-3" aria-hidden />
                  Critical
                </span>
                <span className="text-[11px] text-muted-foreground">payment-api · prod</span>
              </div>
              <h3 className="mt-2 text-sm font-semibold leading-snug text-foreground sm:text-base">
                Checkout latency regression after deploy
              </h3>
            </div>
            <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <Clock className="h-3.5 w-3.5 shrink-0" aria-hidden />
              <span className="tabular-nums">Open · 12m</span>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-3 gap-2 sm:gap-3">
            <div className="rounded-xl border border-border/50 bg-background/60 p-2.5 dark:bg-background/40">
              <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Agents</p>
              <p className="mt-1 text-lg font-bold tabular-nums text-foreground">6</p>
            </div>
            <div className="rounded-xl border border-border/50 bg-background/60 p-2.5 dark:bg-background/40">
              <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Tool calls</p>
              <p className="mt-1 text-lg font-bold tabular-nums text-foreground">24</p>
            </div>
            <div className="rounded-xl border border-border/50 bg-background/60 p-2.5 dark:bg-background/40">
              <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Evidence</p>
              <p className="mt-1 text-lg font-bold tabular-nums text-foreground">11</p>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {steps.map(({ label, state }) => (
              <span
                key={label}
                className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium ${
                  state === "done"
                    ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300"
                    : state === "active"
                      ? "border-primary/35 bg-primary/10 text-primary"
                      : "border-border/60 bg-muted/30 text-muted-foreground"
                }`}
              >
                {state === "done" ? (
                  <CheckCircle2 className="h-3.5 w-3.5 shrink-0" aria-hidden />
                ) : state === "active" ? (
                  <Activity className="h-3.5 w-3.5 shrink-0 animate-pulse" aria-hidden />
                ) : (
                  <span className="h-3.5 w-3.5 shrink-0 rounded-full border border-muted-foreground/40" aria-hidden />
                )}
                {label}
              </span>
            ))}
          </div>

          <div className="mt-auto pt-4">
            <div className="flex items-center gap-2 rounded-xl border border-border/50 bg-muted/20 px-3 py-2.5 dark:bg-muted/15">
              <Shield className="h-4 w-4 shrink-0 text-primary" aria-hidden />
              <p className="text-[11px] leading-relaxed text-muted-foreground">
                HITL gate armed for rollback · MCP evidence attached to workflow trace
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function LandingHero3D() {
  return (
    <div className="hero-3d-scene relative mx-auto flex h-[min(520px,62vh)] w-full max-w-lg items-center justify-center lg:h-[min(560px,68vh)] lg:max-w-none xl:h-[min(580px,70vh)]">
      {/* Ambient glow */}
      <div
        className="hero-glow-pulse pointer-events-none absolute inset-6 rounded-full bg-gradient-to-br from-primary/35 via-purple-500/25 to-violet-600/15 blur-3xl dark:from-primary/40 dark:via-fuchsia-600/20 dark:to-violet-900/25 lg:inset-10"
        aria-hidden
      />

      <div className="hero-3d-pivot relative h-full w-full max-w-xl lg:max-w-2xl">
        {/* Outer wireframe ring — static tilt wrapper so spin animation stays pure rotateY */}
        <div
          className="pointer-events-none absolute left-1/2 top-1/2 z-0"
          style={{ transform: "translate(-50%, -50%) rotateX(72deg)" }}
          aria-hidden
        >
          <div className="hero-ring-spin h-[min(88%,400px)] w-[min(88%,400px)] rounded-[40%] border-2 border-dashed border-primary/35 shadow-[inset_0_0_40px_hsl(var(--primary)/0.12)]" />
        </div>

        {/* Floating orbit shards */}
        <div
          className="landing-hero-shard pointer-events-none absolute left-[6%] top-[18%] z-20 h-14 w-14 rounded-2xl bg-gradient-to-br from-primary/85 to-purple-700 opacity-95 shadow-lg dark:to-violet-800 lg:h-16 lg:w-16"
          style={{
            transform: "rotateY(-18deg) rotateX(12deg) translateZ(80px)",
            animation: "hero-float-z 5s ease-in-out infinite",
          }}
          aria-hidden
        />
        <div
          className="landing-hero-shard pointer-events-none absolute bottom-[14%] right-[4%] z-20 h-12 w-12 rounded-full bg-gradient-to-tr from-fuchsia-500/90 to-primary opacity-95 shadow-lg dark:from-fuchsia-600/80 lg:h-14 lg:w-14"
          style={{
            transform: "rotateX(-20deg) translateZ(60px)",
            animation: "hero-float-z 5.5s ease-in-out infinite",
            animationDelay: "-1.2s",
          }}
          aria-hidden
        />
        <div
          className="landing-hero-shard pointer-events-none absolute right-[10%] top-[26%] z-20 h-9 w-20 skew-x-[-12deg] rounded-lg bg-primary/35 backdrop-blur-sm dark:bg-primary/40"
          style={{
            transform: "translateZ(100px) rotateY(25deg)",
            animation: "hero-float-z 7s ease-in-out infinite",
            animationDelay: "-3s",
          }}
          aria-hidden
        />

        {/* Glass plate + realistic console (subtle float on inner wrapper) */}
        <div
          className="absolute left-1/2 top-1/2 z-10 w-[min(94%,440px)] px-1"
          style={{
            transform: "translate(-50%, -50%) translateZ(40px) rotateX(8deg)",
          }}
        >
          <div className="hero-float-z rounded-[calc(1rem+2px)] p-px" style={{ animationDelay: "-2s" }}>
            <ConsolePreviewPanel />
          </div>
        </div>
      </div>
    </div>
  );
}
