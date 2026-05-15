"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { askResearch, runResearchScan, type ResearchDashboard } from "@/lib/api";

type Tab = "trends" | "news" | "strategy" | "history";

export function ResearchDashboard({ initial }: { initial: ResearchDashboard | null }) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("trends");
  const [query, setQuery] = useState("");
  const [scanQuery, setScanQuery] = useState(
    initial?.default_query || "latest AI and cloud infrastructure trends"
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [answer, setAnswer] = useState<string | null>(null);
  const data = initial;

  async function handleAsk(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;
    setLoading(true);
    setError(null);
    setAnswer(null);
    try {
      const res = await askResearch(query.trim());
      setAnswer(res.answer);
      setTab("strategy");
      router.refresh();
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
      setTab("trends");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Scan failed");
    } finally {
      setLoading(false);
    }
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: "trends", label: "Trends" },
    { id: "news", label: "News" },
    { id: "strategy", label: "Strategy" },
    { id: "history", label: "History" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <p className="text-sm text-muted-foreground">
          {data?.auto_scan_enabled
            ? `Auto-refresh every ${data.auto_scan_interval_hours}h`
            : "Auto-refresh disabled"}
          {data?.last_scan_at && <> · Last scan {new Date(data.last_scan_at).toLocaleString()}</>}
        </p>
        <div className="flex gap-2">
          <input
            className="w-64 rounded border border-border bg-background px-3 py-2 text-sm"
            value={scanQuery}
            onChange={(e) => setScanQuery(e.target.value)}
            placeholder="Scan topic…"
          />
          <button
            type="button"
            onClick={handleScan}
            disabled={loading}
            className="rounded bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
          >
            {loading ? "Scanning…" : "Run scan"}
          </button>
        </div>
      </div>

      <Card>
        <h2 className="mb-2 text-lg font-semibold">Ask about tech news & trends</h2>
        <form onSubmit={handleAsk} className="flex gap-2">
          <input
            className="flex-1 rounded border border-border bg-background px-3 py-2 text-sm"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="e.g. What are the latest trends in AI agents for enterprise?"
            required
          />
          <button
            type="submit"
            disabled={loading}
            className="rounded border border-primary px-4 py-2 text-sm font-medium text-primary disabled:opacity-50"
          >
            Ask
          </button>
        </form>
        {answer && (
          <div className="mt-4 rounded border border-border bg-muted/30 p-4 text-sm leading-relaxed">
            {answer}
          </div>
        )}
      </Card>

      {error && <p className="text-sm text-red-400">{error}</p>}

      <div className="flex gap-2 border-b border-border">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`px-4 py-2 text-sm font-medium ${
              tab === t.id
                ? "border-b-2 border-primary text-primary"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "trends" && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {(data?.trends || []).map((t, i) => (
            <Card key={i}>
              <div className="mb-2 flex items-center justify-between">
                <h3 className="font-semibold">{t.name}</h3>
                <Badge variant={t.impact === "high" ? "critical" : "medium"}>{t.impact}</Badge>
              </div>
              <p className="text-sm text-muted-foreground">{t.summary}</p>
            </Card>
          ))}
          {!data?.trends?.length && (
            <p className="col-span-full text-sm text-muted-foreground">
              No trends yet. Run a scan or ask a question.
            </p>
          )}
        </div>
      )}

      {tab === "news" && (
        <div className="grid gap-4 md:grid-cols-2">
          {(data?.news || []).map((n, i) => (
            <Card key={i}>
              <h3 className="font-semibold">{n.title}</h3>
              {n.url && (
                <a
                  href={n.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-1 block truncate text-xs text-primary"
                >
                  {n.url}
                </a>
              )}
              <p className="mt-2 text-sm text-muted-foreground">{n.summary || n.snippet}</p>
            </Card>
          ))}
          {!data?.news?.length && (
            <p className="text-sm text-muted-foreground">No news items yet. Run a scan.</p>
          )}
        </div>
      )}

      {tab === "strategy" && (
        <Card>
          <h2 className="mb-3 text-lg font-semibold">Strategic summary</h2>
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
            {data?.strategic_summary || "Run a full scan to generate strategic intelligence."}
          </p>
          {!!data?.competitor_intel?.length && (
            <div className="mt-6">
              <h3 className="mb-2 font-semibold">Competitor moves</h3>
              <ul className="space-y-2">
                {data.competitor_intel.map((c, i) => (
                  <li key={i} className="rounded border border-border p-3 text-sm">
                    <span className="font-medium">{c.name}</span> — {c.move}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Card>
      )}

      {tab === "history" && (
        <div className="space-y-3">
          {(data?.signals || []).map((s) => (
            <Card key={s.id}>
              <p className="font-medium">{s.title}</p>
              <p className="text-xs text-muted-foreground">
                {s.source} · {new Date(s.created_at).toLocaleString()}
              </p>
              <p className="mt-2 line-clamp-3 text-sm text-muted-foreground">{s.summary}</p>
            </Card>
          ))}
          {!data?.signals?.length && (
            <p className="text-sm text-muted-foreground">No scan history yet.</p>
          )}
        </div>
      )}
    </div>
  );
}
