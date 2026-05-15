"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { askResearch, fetchResearchDashboard, runResearchScan, type ResearchDashboard } from "@/lib/api";

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

const POLL_MS = 45_000;

export function ResearchDashboard({ initial }: { initial: ResearchDashboard | null }) {
  const router = useRouter();
  const [data, setData] = useState<ResearchDashboard | null>(initial);
  const [query, setQuery] = useState("");
  const [scanQuery, setScanQuery] = useState(
    initial?.default_query || "latest AI agents cloud cybersecurity semiconductor trends"
  );
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [answer, setAnswer] = useState<string | null>(null);

  useEffect(() => {
    setData(initial);
  }, [initial]);

  const refreshDashboard = useCallback(async () => {
    setRefreshing(true);
    try {
      const next = await fetchResearchDashboard();
      if (next) setData(next);
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (!initial) void refreshDashboard();
  }, [initial, refreshDashboard]);

  useEffect(() => {
    const id = window.setInterval(() => {
      void refreshDashboard();
    }, POLL_MS);
    return () => window.clearInterval(id);
  }, [refreshDashboard]);

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
      await refreshDashboard();
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
      await refreshDashboard();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Scan failed");
    } finally {
      setLoading(false);
    }
  }

  const pulse = data?.pulse_highlights?.length ? data.pulse_highlights : [];
  const sectors = data?.sectors_monitored || [];

  return (
    <div className="space-y-8">
      {/* Live toolbar */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex flex-wrap items-center gap-3">
          <span className="relative flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
          </span>
          <span className="text-sm font-medium text-emerald-600 dark:text-emerald-400">Live dashboard</span>
          <span className="text-xs text-muted-foreground">
            Auto-refresh every {Math.round(POLL_MS / 1000)}s · Last ingest {formatRelative(data?.last_scan_at ?? null)}
            {refreshing ? " · Updating…" : ""}
          </span>
          <button
            type="button"
            onClick={() => void refreshDashboard()}
            disabled={refreshing}
            className="rounded-md border border-border px-3 py-1 text-xs font-medium hover:bg-muted disabled:opacity-50"
          >
            Refresh now
          </button>
        </div>

        <div className="flex flex-wrap gap-2">
          <input
            className="min-w-[200px] flex-1 rounded-md border border-border bg-background px-3 py-2 text-sm lg:max-w-xs"
            value={scanQuery}
            onChange={(e) => setScanQuery(e.target.value)}
            placeholder="Multi-topic scan…"
          />
          <button
            type="button"
            onClick={() => void handleScan()}
            disabled={loading}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
          >
            {loading ? "Scanning…" : "Run industry scan"}
          </button>
        </div>
      </div>

      {/* KPI strip */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">News feed</p>
          <p className="mt-1 text-2xl font-bold">{data?.aggregated_news_count ?? data?.news?.length ?? 0}</p>
          <p className="text-xs text-muted-foreground">Articles merged from recent scans</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Trend themes</p>
          <p className="mt-1 text-2xl font-bold">{data?.aggregated_trends_count ?? data?.trends?.length ?? 0}</p>
          <p className="text-xs text-muted-foreground">Sector-aware signals</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Intel snapshots</p>
          <p className="mt-1 text-2xl font-bold">{data?.signal_count ?? data?.signals?.length ?? 0}</p>
          <p className="text-xs text-muted-foreground">Stored research runs</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Background scans</p>
          <p className="mt-1 text-sm font-semibold">
            {data?.auto_scan_enabled ? `Every ${data.auto_scan_interval_hours}h` : "Off"}
          </p>
          <p className="text-xs text-muted-foreground truncate" title={data?.last_query || ""}>
            Last query: {data?.last_query ? `${data.last_query.slice(0, 56)}…` : "—"}
          </p>
        </Card>
      </div>

      {/* Sectors */}
      {sectors.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <span className="text-xs text-muted-foreground self-center mr-1">Coverage:</span>
          {sectors.map((s) => (
            <Badge key={s} variant="medium">
              {s}
            </Badge>
          ))}
        </div>
      )}

      {/* Pulse ticker */}
      {pulse.length > 0 && (
        <Card className="overflow-hidden border-emerald-500/20 bg-muted/20 py-3">
          <div className="flex animate-none gap-4 overflow-x-auto px-4 scrollbar-thin md:flex-wrap md:overflow-visible">
            {pulse.map((line, i) => (
              <span
                key={i}
                className="whitespace-nowrap rounded-full border border-border bg-background/80 px-3 py-1 text-xs text-muted-foreground md:whitespace-normal"
              >
                {line}
              </span>
            ))}
          </div>
        </Card>
      )}

      {/* Ask */}
      <Card className="p-4">
        <h2 className="mb-3 text-sm font-semibold">Ask the research graph</h2>
        <form onSubmit={(e) => void handleAsk(e)} className="flex flex-col gap-2 sm:flex-row">
          <input
            className="flex-1 rounded-md border border-border bg-background px-3 py-2 text-sm"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="e.g. How is enterprise AI ops changing in 2026?"
          />
          <button
            type="submit"
            disabled={loading}
            className="rounded-md border border-primary px-4 py-2 text-sm font-medium text-primary disabled:opacity-50"
          >
            Ask
          </button>
        </form>
        {answer && (
          <div className="mt-4 rounded-md border border-border bg-muted/30 p-4 text-sm leading-relaxed">{answer}</div>
        )}
      </Card>

      {error && <p className="text-sm text-red-400">{error}</p>}

      {/* Executive snapshot */}
      {(data?.analysis_snapshot || data?.strategic_summary) && (
        <div className={`grid gap-4 ${data?.analysis_snapshot ? "lg:grid-cols-2" : ""}`}>
          {data?.analysis_snapshot ? (
            <Card className="p-5">
              <h2 className="mb-2 text-lg font-semibold">Executive snapshot</h2>
              <p className="text-sm leading-relaxed text-muted-foreground whitespace-pre-wrap">
                {data.analysis_snapshot}
              </p>
            </Card>
          ) : null}
          <Card className={`p-5 ${!data?.analysis_snapshot ? "lg:col-span-2" : ""}`}>
            <h2 className="mb-2 text-lg font-semibold">Full strategic brief</h2>
            <p className="max-h-[360px] overflow-y-auto text-sm leading-relaxed text-muted-foreground whitespace-pre-wrap">
              {data?.strategic_summary || "Run an industry scan to populate strategic analysis."}
            </p>
          </Card>
        </div>
      )}

      {/* News + Trends */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-3">
          <h2 className="text-lg font-semibold">Latest industry headlines</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {(data?.news || []).map((n, i) => (
              <Card key={i} className="flex flex-col p-4 transition-colors hover:border-primary/30">
                <h3 className="font-semibold leading-snug">{n.title}</h3>
                {n.watch_topic && (
                  <p className="mt-1 text-[10px] uppercase tracking-wide text-muted-foreground">
                    Via watch · {n.watch_topic}
                  </p>
                )}
                {n.url && (
                  <a
                    href={n.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 truncate text-xs text-primary underline-offset-2 hover:underline"
                  >
                    Source link
                  </a>
                )}
                <p className="mt-2 flex-1 text-xs leading-relaxed text-muted-foreground line-clamp-4">
                  {n.summary || n.snippet}
                </p>
              </Card>
            ))}
          </div>
          {!data?.news?.length && (
            <p className="text-sm text-muted-foreground">
              No headlines yet — run a scan (queries AI, cloud, chips, security & devtools in parallel).
            </p>
          )}
        </div>

        <div className="space-y-3">
          <h2 className="text-lg font-semibold">Trend radar</h2>
          <div className="space-y-3">
            {(data?.trends || []).map((t, i) => (
              <Card key={i} className="p-4">
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <h3 className="font-semibold leading-tight">{t.name}</h3>
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
            <p className="text-sm text-muted-foreground">Trends appear after the LLM analyzes web results.</p>
          )}
          {!!data?.watch_queries?.length && (
            <Card className="p-4">
              <p className="text-xs font-semibold uppercase text-muted-foreground">Parallel watch queries</p>
              <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
                {data.watch_queries.slice(0, 6).map((q, i) => (
                  <li key={i}>· {q}</li>
                ))}
              </ul>
            </Card>
          )}
        </div>
      </div>

      {/* Competitors */}
      {!!data?.competitor_intel?.length && (
        <div>
          <h2 className="mb-3 text-lg font-semibold">Competitive moves</h2>
          <div className="flex gap-3 overflow-x-auto pb-2">
            {data.competitor_intel.map((c, i) => (
              <Card key={i} className="min-w-[240px] shrink-0 p-4">
                <p className="font-medium">{c.name}</p>
                <p className="mt-2 text-sm text-muted-foreground">{c.move}</p>
                {c.relevance && (
                  <Badge variant="medium" className="mt-2 capitalize">
                    {c.relevance}
                  </Badge>
                )}
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* History */}
      <details className="group">
        <summary className="cursor-pointer text-sm font-semibold text-muted-foreground hover:text-foreground">
          Scan history ({data?.signals?.length ?? 0})
        </summary>
        <div className="mt-4 space-y-3">
          {(data?.signals || []).map((s) => (
            <Card key={s.id} className="p-3">
              <p className="font-medium">{s.title}</p>
              <p className="text-xs text-muted-foreground">
                {s.source} · {new Date(s.created_at).toLocaleString()}
              </p>
              <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{s.summary}</p>
            </Card>
          ))}
          {!data?.signals?.length && (
            <p className="text-sm text-muted-foreground">No history yet.</p>
          )}
        </div>
      </details>
    </div>
  );
}
