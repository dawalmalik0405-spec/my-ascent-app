import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  Brain,
  Cpu,
  Layers,
  Shield,
  Sparkles,
  Workflow,
  Zap,
} from "lucide-react";
import { LandingHero3D } from "@/components/landing/landing-hero-3d";
import { LandingNav } from "@/components/landing/landing-nav";

export const metadata: Metadata = {
  title: "AegisOps — Autonomous enterprise operations",
  description:
    "AegisOps unifies multi-agent incident response, support intelligence, and research — orchestrated with Temporal and LangGraph.",
};

const features = [
  {
    icon: Zap,
    title: "Incident autopilot",
    body: "LangGraph agents triage alerts, run RCA across GitHub & observability, propose remediation, and validate recovery.",
  },
  {
    icon: Brain,
    title: "Human-in-the-loop",
    body: "Policy-aware approvals before risky actions — surfaced clearly in the console without slowing responders.",
  },
  {
    icon: Shield,
    title: "Enterprise-grade wiring",
    body: "Temporal durability, MCP tool fabric, and structured evidence so every step is traceable for auditors.",
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      <LandingNav />

      <main>
        <section className="relative overflow-hidden border-b border-border/40">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_70%_55%_at_50%_-10%,hsl(var(--primary)/0.16),transparent)]" />
          <div className="relative mx-auto grid max-w-6xl gap-12 px-6 py-16 lg:grid-cols-2 lg:items-center lg:py-24">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                <Sparkles className="h-3.5 w-3.5" />
                Hackathon-ready demo stack
              </div>
              <h1 className="mt-6 text-4xl font-bold leading-[1.08] tracking-tight sm:text-5xl lg:text-[3.25rem]">
                Operations that think —{" "}
                <span className="bg-gradient-to-r from-primary via-purple-500 to-fuchsia-500 bg-clip-text text-transparent dark:to-violet-400">
                  agents that ship
                </span>
                .
              </h1>
              <p className="mt-6 max-w-lg text-lg text-muted-foreground">
                <strong className="font-semibold text-foreground">AegisOps</strong> unifies autonomous ops —
                incidents resolve through transparent agent pipelines, support tickets enrich via MCP-backed retrieval,
                and research scans synthesize live intelligence in one console.
              </p>
              <div className="mt-10 flex flex-wrap gap-3">
                <Link
                  href="/dashboard"
                  className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/30 transition hover:opacity-90"
                >
                  Open operations console
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <a
                  href="#modules"
                  className="inline-flex items-center gap-2 rounded-xl border border-border bg-card/60 px-6 py-3 text-sm font-semibold backdrop-blur-sm transition hover:border-primary/35 hover:bg-muted/40"
                >
                  Explore modules
                </a>
              </div>
              <dl className="mt-12 grid grid-cols-3 gap-6 border-t border-border/50 pt-10 text-center sm:text-left">
                <div>
                  <dt className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Agents</dt>
                  <dd className="mt-1 text-2xl font-bold tabular-nums text-foreground">6+</dd>
                </div>
                <div>
                  <dt className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Orchestration</dt>
                  <dd className="mt-1 text-2xl font-bold tabular-nums text-foreground">Temporal</dd>
                </div>
                <div>
                  <dt className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Tools</dt>
                  <dd className="mt-1 text-2xl font-bold tabular-nums text-foreground">MCP</dd>
                </div>
              </dl>
            </div>
            <LandingHero3D />
          </div>
        </section>

        <section id="platform" className="mx-auto max-w-6xl px-6 py-20">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight">Built like a product, wired like a platform</h2>
            <p className="mt-4 text-muted-foreground">
              Every surface is designed for demos and judges: crisp hierarchy, purple accent discipline, light/dark
              parity, and motion that explains orchestration — not decoration.
            </p>
          </div>
          <div className="mt-14 grid gap-6 md:grid-cols-3">
            {features.map(({ icon: Icon, title, body }) => (
              <div
                key={title}
                className="rounded-2xl border border-border/60 bg-card/80 p-6 shadow-card backdrop-blur-sm transition hover:border-primary/25 hover:shadow-glow"
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/12 text-primary">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="mt-5 font-semibold">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{body}</p>
              </div>
            ))}
          </div>
        </section>

        <section id="modules" className="border-y border-border/40 bg-muted/20 py-20 dark:bg-muted/10">
          <div className="mx-auto max-w-6xl px-6">
            <h2 className="text-center text-3xl font-bold tracking-tight">End-to-end intelligence modules</h2>
            <p className="mx-auto mt-4 max-w-2xl text-center text-muted-foreground">
              Same chrome and routing across incidents, support, research, and tools — jump into live workflows from the
              console.
            </p>
            <div className="mt-12 grid gap-6 md:grid-cols-3">
              {[
                {
                  href: "/incidents",
                  title: "Incidents",
                  desc: "Live agent pipeline, traces, GitHub evidence, approvals.",
                },
                {
                  href: "/support",
                  title: "Support",
                  desc: "Tickets from the demo storefront with AI drafts and correlations.",
                },
                {
                  href: "/research",
                  title: "Research",
                  desc: "Multi-sector scans with dashboards that refresh while you present.",
                },
              ].map((m) => (
                <Link
                  key={m.href}
                  href={m.href}
                  prefetch
                  className="group rounded-2xl border border-border/60 bg-card p-6 shadow-card transition hover:border-primary/35 hover:shadow-glow"
                >
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-lg font-semibold">{m.title}</h3>
                    <ArrowRight className="h-5 w-5 text-primary opacity-0 transition group-hover:translate-x-0.5 group-hover:opacity-100" />
                  </div>
                  <p className="mt-3 text-sm text-muted-foreground">{m.desc}</p>
                </Link>
              ))}
            </div>
          </div>
        </section>

        <section id="stack" className="mx-auto max-w-6xl px-6 py-20">
          <div className="rounded-3xl border border-border/60 bg-gradient-to-br from-card via-card to-primary/[0.06] p-10 shadow-card md:p-14 dark:to-primary/[0.09]">
            <div className="flex flex-col gap-10 lg:flex-row lg:items-center lg:justify-between">
              <div className="max-w-xl">
                <div className="flex items-center gap-2 text-primary">
                  <Layers className="h-5 w-5" />
                  <span className="text-sm font-semibold uppercase tracking-widest">Reference stack</span>
                </div>
                <h2 className="mt-4 text-3xl font-bold tracking-tight">Temporal · LangGraph · Qdrant · MCP</h2>
                <p className="mt-4 text-muted-foreground">
                  Durable workflows coordinate investigations; vector memory backs correlation; MCP exposes GitHub,
                  Kubernetes, search, and more — all visible from the AegisOps console.
                </p>
              </div>
              <ul className="grid gap-4 text-sm font-medium sm:grid-cols-2 lg:flex lg:flex-col">
                <li className="flex items-center gap-3 rounded-xl border border-border/50 bg-background/60 px-4 py-3 backdrop-blur-sm">
                  <Workflow className="h-5 w-5 shrink-0 text-primary" />
                  Temporal workflows & signals
                </li>
                <li className="flex items-center gap-3 rounded-xl border border-border/50 bg-background/60 px-4 py-3 backdrop-blur-sm">
                  <Cpu className="h-5 w-5 shrink-0 text-primary" />
                  LangGraph multi-agent graphs
                </li>
                <li className="flex items-center gap-3 rounded-xl border border-border/50 bg-background/60 px-4 py-3 backdrop-blur-sm">
                  <Brain className="h-5 w-5 shrink-0 text-primary" />
                  Qdrant similarity & recall
                </li>
                <li className="flex items-center gap-3 rounded-xl border border-border/50 bg-background/60 px-4 py-3 backdrop-blur-sm">
                  <Sparkles className="h-5 w-5 shrink-0 text-primary" />
                  MCP tool catalog & policies
                </li>
              </ul>
            </div>
          </div>
        </section>

        <section className="border-t border-border/40 bg-muted/15 px-6 py-16 dark:bg-muted/5">
          <div className="mx-auto flex max-w-6xl flex-col items-center gap-6 text-center md:flex-row md:justify-between md:text-left">
            <div>
              <h2 className="text-2xl font-bold tracking-tight">Ready when the judges arrive.</h2>
              <p className="mt-2 max-w-lg text-sm text-muted-foreground">
                Trigger a demo incident from the console and watch the purple pipeline advance step-by-step.
              </p>
            </div>
            <Link
              href="/dashboard"
              className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-primary px-8 py-3 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/30 transition hover:opacity-90"
            >
              Open operations console
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </section>

        <footer className="border-t border-border/60 px-6 py-10">
          <div className="mx-auto flex max-w-6xl flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="font-semibold">AegisOps</p>
              <p className="mt-1 text-xs text-muted-foreground">Autonomous Ops · Demo presentation stack</p>
            </div>
            <div className="flex flex-wrap gap-x-8 gap-y-2 text-sm text-muted-foreground">
              <Link href="/dashboard" className="transition hover:text-primary">
                Console
              </Link>
              <Link href="/complain" className="transition hover:text-primary">
                Customer portal
              </Link>
              <a href="http://localhost:8080" target="_blank" rel="noopener noreferrer" className="transition hover:text-primary">
                Temporal UI
              </a>
            </div>
          </div>
        </footer>
      </main>
    </div>
  );
}
