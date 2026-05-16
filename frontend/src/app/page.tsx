import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  Brain,
  Check,
  Cpu,
  Layers,
  LifeBuoy,
  Lock,
  Newspaper,
  Radar,
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
    body: "From alert to validated recovery — specialized agents triage, correlate with memory, run RCA across GitHub and observability tooling, and propose remediation with receipts.",
  },
  {
    icon: Brain,
    title: "Human-in-the-loop",
    body: "Policy-aware approvals before high-impact actions. Operators see structured evidence and tool output without digging through raw logs.",
  },
  {
    icon: Shield,
    title: "Audit-ready execution",
    body: "Durable orchestration plus tool-attributed steps gives you a timeline that stands up to production reviews — not a black-box chat transcript.",
  },
];

const workflowSteps = [
  {
    step: "01",
    title: "Ingest & correlate",
    body: "Alerts, tickets, and scans enter one pipeline. Vector memory surfaces related incidents so responders start with context.",
  },
  {
    step: "02",
    title: "Agents run with tools",
    body: "Investigation steps call GitHub, Kubernetes, metrics, and search through the tool fabric — bounded by workflow policy and timeouts.",
  },
  {
    step: "03",
    title: "Approve, ship, validate",
    body: "Risky remediation waits for explicit approval. Recovery checks close the loop and persist outcomes for the next event.",
  },
];

/** Shown only below hero — wording avoids repeating the front-desk stack strip */
const trustPoints = [
  { icon: Lock, label: "Evidence-first timelines", sub: "Attributed agent steps for reviewers" },
  { icon: BarChart3, label: "Operator visibility", sub: "Live traces & console KPIs" },
  { icon: Shield, label: "Policy gates", sub: "HITL before risky remediation" },
  { icon: Cpu, label: "Multi-model routing", sub: "OpenRouter · NIM fallback" },
];

const FRONTDESK_STACK = [
  { label: "Orchestration", value: "Temporal" },
  { label: "Agents", value: "LangGraph" },
  { label: "Memory", value: "Qdrant" },
  { label: "Tools", value: "MCP" },
] as const;

export default function LandingPage() {
  const temporalUiUrl = process.env.NEXT_PUBLIC_TEMPORAL_UI_URL ?? "http://localhost:8080";

  return (
    <div className="min-h-screen bg-background">
      <LandingNav />

      <main>
        {/* Hero */}
        <section className="relative overflow-hidden border-b border-border/40">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_-15%,hsl(var(--primary)/0.14),transparent_55%)]" />
          <div className="pointer-events-none absolute right-0 top-1/4 h-72 w-72 rounded-full bg-purple-500/10 blur-3xl dark:bg-fuchsia-900/20 md:h-96 md:w-96" aria-hidden />

          <div className="relative mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:gap-12 sm:px-6 sm:py-20 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] lg:items-start lg:gap-14 lg:px-8 lg:py-24 xl:gap-20">
            <div>
              <div className="inline-flex flex-wrap items-center gap-2 rounded-full border border-primary/20 bg-primary/[0.07] px-3 py-1.5 text-xs font-semibold text-primary">
                <Sparkles className="h-3.5 w-3.5 shrink-0" aria-hidden />
                Autonomous operations platform
              </div>
              <h1 className="mt-5 text-[2rem] font-bold leading-[1.12] tracking-tight text-balance sm:text-5xl lg:text-[3.35rem] xl:text-[3.5rem]">
                Keep production calm when{" "}
                <span className="bg-gradient-to-r from-primary via-purple-600 to-fuchsia-500 bg-clip-text text-transparent dark:via-purple-400 dark:to-violet-400">
                  incidents spike
                </span>
                .
              </h1>
              <p className="mt-5 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
                <strong className="font-semibold text-foreground">AegisOps</strong> is the control plane for agent-driven
                operations — incidents, customer support, and research intelligence share one durable orchestration layer,
                transparent tooling, and a console your team can trust under pressure.
              </p>

              <ul className="mt-6 flex flex-col gap-2.5 text-sm text-muted-foreground sm:mt-7">
                {[
                  "Single pane for incidents, tickets, and exec-ready research",
                  "Workflow-native agents — not ad-hoc scripts tied to chat",
                  "Light / dark parity for SOC-style monitoring rooms",
                ].map((line) => (
                  <li key={line} className="flex gap-2">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
                    <span>{line}</span>
                  </li>
                ))}
              </ul>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
                <Link
                  href="/dashboard"
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3.5 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/25 transition hover:opacity-90"
                >
                  Open operations console
                  <ArrowRight className="h-4 w-4" aria-hidden />
                </Link>
                <a
                  href="#modules"
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-card/70 px-6 py-3.5 text-sm font-semibold backdrop-blur-sm transition hover:border-primary/35 hover:bg-muted/50"
                >
                  Explore product modules
                </a>
              </div>
            </div>

            <div className="lg:pl-4 xl:pl-8">
              <LandingHero3D />
            </div>

            {/* Reference stack — full-width front desk only (below copy + 3D) */}
            <div id="frontdesk-stack" className="relative z-[1] lg:col-span-2">
              <div className="landing-frontdesk-stack px-4 py-6 sm:px-8 sm:py-7">
                <p className="mb-4 text-center text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground lg:text-left">
                  Reference stack
                </p>
                <dl className="relative grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-4 sm:gap-x-8">
                  {FRONTDESK_STACK.map(({ label, value }) => (
                    <div key={label} className="text-center sm:text-left">
                      <dt className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</dt>
                      <dd className="mt-1 text-lg font-bold tracking-tight text-foreground sm:text-xl">{value}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            </div>
          </div>
        </section>

        {/* Trust strip */}
        <section className="border-b border-border/40 bg-muted/[0.35] py-8 dark:bg-muted/10">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <p className="mb-5 text-center text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              Built for teams who need receipts, not vibes
            </p>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4 md:gap-6">
              {trustPoints.map(({ icon: Icon, label, sub }) => (
                <div
                  key={label}
                  className="flex flex-col items-center rounded-2xl border border-border/50 bg-card/80 px-4 py-4 text-center shadow-sm backdrop-blur-sm sm:flex-row sm:items-start sm:gap-3 sm:text-left"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/12 text-primary">
                    <Icon className="h-5 w-5" aria-hidden />
                  </div>
                  <div className="mt-3 sm:mt-0">
                    <p className="text-sm font-semibold text-foreground">{label}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">{sub}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Platform */}
        <section id="platform" className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-24 lg:px-8 lg:py-28">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-balance sm:text-4xl">
              One console. Three operational workloads.
            </h2>
            <p className="mt-4 text-base leading-relaxed text-muted-foreground sm:text-lg">
              The same navigation model and visual language from landing through live workflows — tuned for demos,
              desk checks, and stakeholder walkthroughs on desktop or tablet.
            </p>
          </div>
          <div className="mt-12 grid gap-5 sm:gap-6 lg:grid-cols-3">
            {features.map(({ icon: Icon, title, body }) => (
              <div
                key={title}
                className="rounded-2xl border border-border/60 bg-card/85 p-6 shadow-card backdrop-blur-sm transition hover:border-primary/28 hover:shadow-[0_20px_60px_-28px_hsl(var(--primary)/0.35)] sm:p-7"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-primary/20 to-purple-500/10 text-primary">
                  <Icon className="h-6 w-6" aria-hidden />
                </div>
                <h3 className="mt-5 text-lg font-semibold">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Workflow */}
        <section
          id="workflow"
          className="border-y border-border/40 bg-gradient-to-b from-muted/25 via-muted/15 to-transparent py-16 dark:from-muted/15 dark:via-muted/8 dark:to-transparent sm:py-20 lg:py-24"
        >
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-3xl font-bold tracking-tight text-balance sm:text-4xl">How a run flows end-to-end</h2>
              <p className="mt-4 text-muted-foreground">
                Every serious automation needs durability and attribution — here is the backbone operators recognize.
              </p>
            </div>
            <div className="mt-12 grid gap-8 lg:grid-cols-3 lg:gap-6">
              {workflowSteps.map(({ step, title, body }) => (
                <div key={step} className="relative rounded-2xl border border-border/55 bg-card/70 p-6 backdrop-blur-sm sm:p-8">
                  <span className="font-mono text-xs font-bold text-primary">{step}</span>
                  <h3 className="mt-3 text-lg font-semibold">{title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Modules */}
        <section id="modules" className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-24 lg:px-8 lg:py-28">
          <h2 className="text-center text-3xl font-bold tracking-tight text-balance sm:text-4xl">Product modules</h2>
          <p className="mx-auto mt-4 max-w-2xl text-center text-muted-foreground">
            Jump into live surfaces — incidents with traces and approvals, support with correlated tickets, research with
            scans that refresh while you present.
          </p>
          <div className="mt-12 grid gap-5 sm:gap-6 md:grid-cols-3">
            {[
              {
                href: "/incidents",
                title: "Incidents",
                desc: "Alert intake, multi-agent investigation, GitHub & observability evidence, HITL remediation gates.",
                icon: Radar,
                accent: "from-orange-500/20 to-amber-500/5",
              },
              {
                href: "/support",
                title: "Support",
                desc: "Ticket enrichment, AI-assisted drafts, and bridges from demo storefront flows into the console.",
                icon: LifeBuoy,
                accent: "from-sky-500/20 to-blue-500/5",
              },
              {
                href: "/research",
                title: "Research",
                desc: "Executive scans, competitor motion, and analyst-style briefings with dashboard-grade visuals.",
                icon: Newspaper,
                accent: "from-violet-500/20 to-purple-500/5",
              },
            ].map(({ href, title, desc, icon: Icon, accent }) => (
              <Link
                key={href}
                href={href}
                prefetch
                className="group relative overflow-hidden rounded-2xl border border-border/60 bg-card p-6 shadow-card transition hover:border-primary/35 hover:shadow-[0_24px_70px_-30px_hsl(var(--primary)/0.4)] sm:p-7"
              >
                <div
                  className={`pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-gradient-to-br ${accent} blur-2xl transition-opacity group-hover:opacity-100`}
                  aria-hidden
                />
                <div className="relative flex items-start justify-between gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/12 text-primary">
                    <Icon className="h-5 w-5" aria-hidden />
                  </div>
                  <ArrowRight className="h-5 w-5 shrink-0 text-primary opacity-60 transition group-hover:translate-x-0.5 group-hover:opacity-100" aria-hidden />
                </div>
                <h3 className="relative mt-4 text-lg font-semibold">{title}</h3>
                <p className="relative mt-2 text-sm leading-relaxed text-muted-foreground">{desc}</p>
              </Link>
            ))}
          </div>
        </section>

        {/* Stack */}
        <section id="stack" className="mx-auto max-w-7xl px-4 pb-16 sm:px-6 sm:pb-24 lg:px-8 lg:pb-28">
          <div className="overflow-hidden rounded-3xl border border-border/60 bg-gradient-to-br from-card via-card to-primary/[0.07] shadow-card dark:to-primary/[0.1]">
            <div className="grid gap-10 p-8 md:p-12 lg:grid-cols-[1fr_auto] lg:items-center lg:gap-16 xl:p-14">
              <div className="max-w-xl">
                <div className="flex items-center gap-2 text-primary">
                  <Layers className="h-5 w-5 shrink-0" aria-hidden />
                  <span className="text-xs font-semibold uppercase tracking-widest">Reference architecture</span>
                </div>
                <h2 className="mt-4 text-3xl font-bold tracking-tight text-balance sm:text-4xl">
                  Architecture depth beyond the front desk
                </h2>
                <p className="mt-4 leading-relaxed text-muted-foreground">
                  Durable orchestration coordinates investigations; embeddings back semantic correlation; an extensible tool
                  fabric reaches GitHub, Kubernetes, cloud metrics, and messaging — with structured results in the console.
                  The named stack appears once above — here we focus on how those layers behave together.
                </p>
              </div>
              <ul className="grid gap-3 text-sm font-medium sm:grid-cols-2 lg:grid-cols-1 lg:gap-3.5 xl:min-w-[280px]">
                {[
                  { icon: Workflow, text: "Task queues & workflow durability" },
                  { icon: Cpu, text: "Multi-agent graphs & handoffs" },
                  { icon: Brain, text: "Vector similarity & incident recall" },
                  { icon: Sparkles, text: "Tool servers & execution policy" },
                ].map(({ icon: Icon, text }) => (
                  <li
                    key={text}
                    className="flex items-center gap-3 rounded-xl border border-border/50 bg-background/70 px-4 py-3 backdrop-blur-sm dark:bg-background/50"
                  >
                    <Icon className="h-5 w-5 shrink-0 text-primary" aria-hidden />
                    {text}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <figure className="mx-auto mt-12 max-w-3xl rounded-2xl border border-border/50 bg-muted/20 px-6 py-8 text-center dark:bg-muted/10 sm:px-10">
            <blockquote className="text-base font-medium leading-relaxed text-foreground sm:text-lg">
              &ldquo;Demos fail when nobody can explain what the agents did. AegisOps is structured around attributed steps
              — so compliance and engineering both stay in the room.&rdquo;
            </blockquote>
            <figcaption className="mt-4 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Positioning narrative · pilot-ready messaging
            </figcaption>
          </figure>
        </section>

        {/* CTA */}
        <section className="border-t border-border/40 bg-muted/20 px-4 py-14 dark:bg-muted/8 sm:px-6 sm:py-16 lg:px-8">
          <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-8 rounded-2xl border border-border/50 bg-card/80 px-6 py-10 shadow-card backdrop-blur-sm sm:flex-row sm:gap-10 sm:px-10 lg:px-12">
            <div className="text-center sm:text-left">
              <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">See the purple pipeline in motion.</h2>
              <p className="mt-2 max-w-lg text-sm leading-relaxed text-muted-foreground">
                Trigger a demo incident or open support — watch each stage advance with evidence your judges can follow on a
                projector or laptop.
              </p>
            </div>
            <Link
              href="/dashboard"
              className="inline-flex w-full shrink-0 items-center justify-center gap-2 rounded-xl bg-primary px-8 py-3.5 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/25 transition hover:opacity-90 sm:w-auto"
            >
              Launch console
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
          </div>
        </section>

        {/* Footer */}
        <footer className="border-t border-border/60 px-4 py-12 sm:px-6 lg:px-8">
          <div className="mx-auto grid max-w-7xl gap-10 md:grid-cols-2 lg:grid-cols-4 lg:gap-8">
            <div className="lg:col-span-2">
              <p className="text-lg font-semibold">AegisOps</p>
              <p className="mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
                Autonomous operations for incidents, customer support, and strategic research — one durable stack, one
                operator-grade console.
              </p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Product</p>
              <ul className="mt-3 flex flex-col gap-2 text-sm text-muted-foreground">
                <li>
                  <Link href="/dashboard" className="transition hover:text-primary">
                    Dashboard
                  </Link>
                </li>
                <li>
                  <Link href="/incidents" className="transition hover:text-primary">
                    Incidents
                  </Link>
                </li>
                <li>
                  <Link href="/support" className="transition hover:text-primary">
                    Support
                  </Link>
                </li>
                <li>
                  <Link href="/research" className="transition hover:text-primary">
                    Research
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Resources</p>
              <ul className="mt-3 flex flex-col gap-2 text-sm text-muted-foreground">
                <li>
                  <Link href="/complain" className="transition hover:text-primary">
                    Customer portal (demo)
                  </Link>
                </li>
                <li>
                  <Link href="/tools" className="transition hover:text-primary">
                    MCP tools
                  </Link>
                </li>
                <li>
                  <a
                    href={`${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000"}/docs`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="transition hover:text-primary"
                  >
                    API docs
                  </a>
                </li>
                <li>
                  <a href={temporalUiUrl} target="_blank" rel="noopener noreferrer" className="transition hover:text-primary">
                    Temporal UI
                  </a>
                </li>
              </ul>
            </div>
          </div>
          <div className="mx-auto mt-10 flex max-w-7xl flex-col gap-3 border-t border-border/40 pt-8 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
            <p>© {new Date().getFullYear()} AegisOps demo stack.</p>
            <p className="max-w-xl text-[11px] leading-relaxed">
              Temporal UI link uses <code className="rounded bg-muted px-1 py-0.5 font-mono">NEXT_PUBLIC_TEMPORAL_UI_URL</code>{" "}
              when set; API docs use <code className="rounded bg-muted px-1 py-0.5 font-mono">NEXT_PUBLIC_API_URL</code>.
            </p>
          </div>
        </footer>
      </main>
    </div>
  );
}
