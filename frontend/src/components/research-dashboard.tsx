"use client";

import { useEffect, useState } from "react";
import type { ComponentType } from "react";
import { useRouter } from "next/navigation";
import {
  Activity,
  ArrowRight,
  BookOpen,
  Layers,
  LineChart as LineChartIcon,
  Newspaper,
  RefreshCw,
  Sparkles,
  Target,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MarkdownReport } from "@/components/markdown-report";
import { ResearchAnalyticsCharts } from "@/components/research-analytics-charts";
import { askResearch, runResearchScan, type ResearchDashboard } from "@/lib/api";
import { RESEARCH_LIVE_POLL_MS, useResearchLive } from "@/context/research-live-context";
import { cn } from "@/lib/utils";

function sectorVariant(sector?: string): string {
  const s = (sector || "other").toLowerCase();
  if (s === "ai") return "critical";
  if (s === "security") return "critical";
  if (s === "chips") return "high";
  if (s === "cloud") return "medium";
  if (s === "devtools") return "low";
  return "default";
}

function impactVariant(impact?: string): string {
  const i = (impact || "").toLowerCase();
  if (i === "high") return "critical";
  if (i === "medium") return "medium";
  return "low";
}

function formatRelative(iso: string | null): string {
  if (!iso) return "—";
  const then = new Date(iso).getTime();
  const diff = Date.now() - then;
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 48) return `${h}h ago`;
  return new Date(iso).toLocaleDateString();
}

export function ResearchDashboard({ initial }: { initial: ResearchDashboard | null }) {
  const router = useRouter();
  const live = useResearchLive();
  const data = live.dashboard ?? initial;

  const [query, setQuery] = useState("");
  const [scanQuery, setScanQuery] = useState(
    initial?.default_query || "latest AI agents cloud cybersecurity semiconductor trends"
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [answer, setAnswer] = useState<string | null>(null);

  useEffect(() => {
    if (initial?.default_query) setScanQuery(initial.default_query);
  }, [initial?.default_query]);

  async function handleAsk(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;
    setLoading(true);
    setError(null);
    setAnswer(null);
    try {
      const res = await askResearch(query.trim());
      setAnswer(res.answer);
      router.refresh();
      await live.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Question failed");
    } finally {
      setLoading(false);
    }
  }

  async function handleScan() {
    setLoading(true);
    setError(null);
    try {
      await runResearchScan(scanQuery.trim());
      router.refresh();
      await live.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Scan failed");
    } finally {
      setLoading(false);
    }
  }

  const pulse = data?.pulse_highlights?.length ? data.pulse_highlights : [];
  const sectors = data?.sectors_monitored || [];

  const newsCount = data?.aggregated_news_count ?? data?.news?.length ?? 0;
  const trendsCount = data?.aggregated_trends_count ?? data?.trends?.length ?? 0;
  const signalsCount = data?.signal_count ?? data?.signals?.length ?? 0;

  return (
    <div className="space-y-10 pb-8">
      {/* Command strip */}
      <Card className="overflow-hidden border-border/65 bg-gradient-to-br from-card via-card to-primary/[0.04] p-5 shadow-card sm:p-6">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-3 rounded-xl border border-border/60 bg-background/50 px-4 py-2 backdrop-blur-sm">
              <span className="relative flex h-2.5 w-2.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-45" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-success" />
              </span>
              <div>
                <p className="text-sm font-semibold text-foreground">Live intelligence fabric</p>
                <p className="text-xs text-muted-foreground">
                  Last ingest {formatRelative(data?.last_scan_at ?? null)}
                  {live.refreshing ? " · syncing…" : ""} · poll {Math.round(RESEARCH_LIVE_POLL_MS / 1000)}s
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => void live.refresh()}
              disabled={live.refreshing}
              className="inline-flex items-center gap-2 rounded-xl border border-border bg-muted/30 px-4 py-2 text-xs font-semibold transition hover:bg-muted/50 disabled:opacity-50"
            >
              <RefreshCw className={cn("h-3.5 w-3.5", live.refreshing && "animate-spin")} />
              Refresh now
            </button>
          </div>

          <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-center lg:max-w-xl">
            <input
              className="min-h-[44px] flex-1 rounded-xl border border-border/80 bg-background px-4 py-2 text-sm shadow-inner"
              value={scanQuery}
              onChange={(e) => setScanQuery(e.target.value)}
              placeholder="Multi-sector scan query…"
            />
            <button
              type="button"
              onClick={() => void handleScan()}
              disabled={loading}
              className="inline-flex min-h-[44px] shrink-0 items-center justify-center gap-2 rounded-xl bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/25 transition hover:opacity-90 disabled:opacity-50"
            >
              <Activity className="h-4 w-4" />
              {loading ? "Scanning…" : "Run industry scan"}
            </button>
          </div>
        </div>
      </Card>

      {/* KPI deck */}
      <section aria-label="Key metrics">
        <div className="mb-4 flex items-center gap-2">
          <LineChartIcon className="h-5 w-5 text-primary" />
          <h2 className="text-base font-semibold tracking-tight">Signal overview</h2>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <KpiTile
            icon={Newspaper}
            label="News corpus"
            value={newsCount}
            caption="Merged headlines & snippets"
            accent
          />
          <KpiTile icon={Layers} label="Trend themes" value={trendsCount} caption="Sector-aware radar rows" />
          <KpiTile icon={Sparkles} label="Intel signals" value={signalsCount} caption="Persisted scan snapshots" />
          <KpiTile
            icon={BookOpen}
            label="Auto scans"
            value={data?.auto_scan_enabled ? `${data.auto_scan_interval_hours}h` : "Off"}
            caption={data?.last_query ? `Last: ${data.last_query.slice(0, 42)}…` : "Background cadence"}
            valueIsText
          />
        </div>
        {sectors.length > 0 && (
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Coverage</span>
            {sectors.map((s) => (
              <Badge key={s} variant="medium" className="capitalize">
                {s}
              </Badge>
            ))}
          </div>
        )}
      </section>

      {/* Charts */}
      <ResearchAnalyticsCharts data={data} />

      {/* Strategy plays */}
      {(!!data?.competitor_intel?.length || !!data?.trends?.length) && (
        <section aria-label="Strategy radar">
          <div className="mb-4 flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold tracking-tight">Strategy & competitive radar</h2>
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            <Card className="border-border/65 p-5">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Emerging plays</h3>
              <ul className="mt-4 space-y-3">
                {(data?.trends ?? []).slice(0, 6).map((t, i) => (
                  <li key={i} className="flex gap-3 rounded-xl border border-border/50 bg-muted/10 px-3 py-3 dark:bg-muted/5">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium leading-snug">{t.name}</p>
                      <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{t.summary}</p>
                    </div>
                    <div className="flex shrink-0 flex-col gap-1">
                      <Badge variant={impactVariant(t.impact)} className="text-[10px]">
                        {t.impact || "—"}
                      </Badge>
                      {t.sector && (
                        <Badge variant={sectorVariant(t.sector)} className="capitalize text-[10px]">
                          {t.sector}
                        </Badge>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
              {!data?.trends?.length && (
                <p className="mt-4 text-sm text-muted-foreground">Trend-backed strategies populate after LLM synthesis.</p>
              )}
            </Card>
            <Card className="border-border/65 p-5">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Competitor motion</h3>
              <div className="mt-4 space-y-3">
                {(data?.competitor_intel ?? []).slice(0, 8).map((c, i) => (
                  <div key={i} className="rounded-xl border border-primary/15 bg-primary/[0.04] px-4 py-3">
                    <p className="font-semibold">{c.name}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{c.move}</p>
                    {c.relevance && (
                      <Badge variant="medium" className="mt-2 capitalize">
                        {c.relevance}
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
              {!data?.competitor_intel?.length && (
                <p className="mt-4 text-sm text-muted-foreground">Competitive intel cards appear post-scan.</p>
              )}
            </Card>
          </div>
        </section>
      )}

      {/* Pulse */}
      {pulse.length > 0 && (
        <Card className="border-success/25 bg-gradient-to-r from-success/[0.06] to-transparent py-4">
          <p className="mb-3 px-4 text-xs font-semibold uppercase tracking-wider text-success">Executive pulse</p>
          <div className="flex flex-wrap gap-2 px-4">
            {pulse.map((line, i) => (
              <span
                key={i}
                className="rounded-full border border-border/60 bg-card/90 px-3 py-1.5 text-xs font-medium text-muted-foreground shadow-sm"
              >
                {line}
              </span>
            ))}
          </div>
        </Card>
      )}

      {/* Ask */}
      <Card className="border-border/65 p-6 shadow-card">
        <div className="mb-4 flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          <div>
            <h2 className="font-semibold tracking-tight">Analyst copilot</h2>
            <p className="text-xs text-muted-foreground">Pose synthesis questions against the living graph.</p>
          </div>
        </div>
        <form onSubmit={(e) => void handleAsk(e)} className="flex flex-col gap-3 sm:flex-row">
          <input
            className="min-h-[44px] flex-1 rounded-xl border border-border/80 bg-background px-4 py-2 text-sm"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="e.g. Which semiconductor bottlenecks surface across recent scans?"
          />
          <button
            type="submit"
            disabled={loading}
            className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl border border-primary bg-transparent px-5 py-2 text-sm font-semibold text-primary transition hover:bg-primary/10 disabled:opacity-50"
          >
            Ask
            <ArrowRight className="h-4 w-4" />
          </button>
        </form>
        {answer && (
          <div className="mt-6 rounded-2xl border border-border/60 bg-muted/15 p-5 dark:bg-muted/10">
            <MarkdownReport content={answer} />
          </div>
        )}
      </Card>

      {error && (
        <p className="rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </p>
      )}

      {/* Narratives */}
      <section aria-label="Strategic narratives" className="grid gap-6 lg:grid-cols-2">
        {data?.analysis_snapshot ? (
          <Card className="border-border/65 p-6 shadow-card">
            <h2 className="mb-3 text-lg font-semibold">Executive snapshot</h2>
            <MarkdownReport content={data.analysis_snapshot} />
          </Card>
        ) : null}
        <Card className={cn("border-border/65 p-6 shadow-card", !data?.analysis_snapshot && "lg:col-span-2")}>
          <h2 className="mb-3 text-lg font-semibold">Full strategic brief</h2>
          <div className="max-h-[480px] overflow-y-auto pr-1">
            <MarkdownReport
              content={
                data?.strategic_summary ||
                "*Run an industry scan to populate strategic analysis — charts above refresh automatically.*"
              }
            />
          </div>
        </Card>
      </section>

      {/* Qualitative feeds */}
      <section aria-label="News and trends">
        <div className="mb-4 flex items-center gap-2">
          <Newspaper className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold tracking-tight">Qualitative intelligence layer</h2>
        </div>
        <div className="grid gap-8 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-4">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Industry headlines</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              {(data?.news || []).map((n, i) => (
                <Card
                  key={i}
                  className="flex flex-col border-border/65 p-4 transition hover:border-primary/30 hover:shadow-md"
                >
                  <h4 className="font-semibold leading-snug">{n.title}</h4>
                  {n.watch_topic && (
                    <p className="mt-2 text-[10px] uppercase tracking-wide text-muted-foreground">
                      Watch · {n.watch_topic}
                    </p>
                  )}
                  {n.url && (
                    <a
                      href={n.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                    >
                      Source
                      <ArrowRight className="h-3 w-3" />
                    </a>
                  )}
                  <p className="mt-3 flex-1 text-xs leading-relaxed text-muted-foreground line-clamp-5">
                    {n.summary || n.snippet}
                  </p>
                </Card>
              ))}
            </div>
            {!data?.news?.length && (
              <p className="text-sm text-muted-foreground">
                Headlines merge after parallel sector searches complete.
              </p>
            )}
          </div>

          <div className="space-y-4">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Deep trend cards</h3>
            <div className="space-y-3">
              {(data?.trends || []).map((t, i) => (
                <Card key={i} className="border-border/65 p-4">
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <h4 className="font-semibold leading-tight">{t.name}</h4>
                    <Badge variant={impactVariant(t.impact)}>{t.impact}</Badge>
                    {t.sector && (
                      <Badge variant={sectorVariant(t.sector)} className="capitalize">
                        {t.sector}
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">{t.summary}</p>
                </Card>
              ))}
            </div>
            {!data?.trends?.length && (
              <p className="text-sm text-muted-foreground">Trends populate once synthesis finishes.</p>
            )}
            {!!data?.watch_queries?.length && (
              <Card className="border-dashed border-primary/25 bg-primary/[0.03] p-4">
                <p className="text-xs font-semibold uppercase text-primary">Parallel watch queries</p>
                <ul className="mt-3 space-y-2 text-xs text-muted-foreground">
                  {data.watch_queries.slice(0, 8).map((q, i) => (
                    <li key={i} className="flex gap-2">
                      <span className="text-primary">▹</span>
                      <span>{q}</span>
                    </li>
                  ))}
                </ul>
              </Card>
            )}
          </div>
        </div>
      </section>

      {/* History */}
      <details className="group rounded-2xl border border-border/65 bg-muted/10 p-4 dark:bg-muted/5">
        <summary className="cursor-pointer text-sm font-semibold text-foreground hover:text-primary">
          Scan history ({data?.signals?.length ?? 0})
        </summary>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {(data?.signals || []).map((s) => (
            <Card key={s.id} className="border-border/60 p-4">
              <p className="font-medium">{s.title}</p>
              <p className="text-xs text-muted-foreground">
                {s.source} · {new Date(s.created_at).toLocaleString()}
              </p>
              <p className="mt-2 line-clamp-3 text-sm text-muted-foreground">{s.summary}</p>
            </Card>
          ))}
          {!data?.signals?.length && (
            <p className="text-sm text-muted-foreground sm:col-span-2">No archived runs yet.</p>
          )}
        </div>
      </details>
    </div>
  );
}

function KpiTile({
  icon: Icon,
  label,
  value,
  caption,
  accent,
  valueIsText,
}: {
  icon: ComponentType<{ className?: string }>;
  label: string;
  value: number | string;
  caption: string;
  accent?: boolean;
  valueIsText?: boolean;
}) {
  return (
    <Card
      className={cn(
        "relative overflow-hidden border-border/65 p-5 shadow-card transition hover:border-primary/25",
        accent && "border-primary/25 bg-gradient-to-br from-primary/[0.07] to-transparent"
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
          <p className={cn("mt-2 font-bold tracking-tight text-foreground", valueIsText ? "text-xl" : "text-3xl")}>
            {value}
          </p>
          <p className="mt-2 text-xs leading-snug text-muted-foreground">{caption}</p>
        </div>
        <div className="rounded-xl bg-primary/12 p-2.5 text-primary">
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </Card>
  );
}
