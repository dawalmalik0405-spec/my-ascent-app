"use client";

import { useMemo } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { ResearchDashboard } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { BarChart3, PieChart as PieChartIcon, TrendingUp } from "lucide-react";

const PALETTE = ["#8b5cf6", "#a78bfa", "#c4b5fd", "#7c3aed", "#6d28d9", "#c084fc", "#5b21b6", "#ede9fe"];

const tooltipDark = {
  backgroundColor: "hsl(285 26% 10%)",
  border: "1px solid hsl(285 18% 22%)",
  borderRadius: "10px",
  fontSize: "12px",
};

const tooltipLight = {
  backgroundColor: "hsl(0 0% 100%)",
  border: "1px solid hsl(275 22% 88%)",
  borderRadius: "10px",
  fontSize: "12px",
};

function tooltipStyle(): Record<string, string | number> {
  if (typeof document === "undefined") return tooltipDark;
  return document.documentElement.classList.contains("dark") ? tooltipDark : tooltipLight;
}

export function ResearchAnalyticsCharts({ data }: { data: ResearchDashboard | null }) {
  const ttStyle = tooltipStyle();

  const newsCount = data?.aggregated_news_count ?? data?.news?.length ?? 0;
  const trendsCount = data?.aggregated_trends_count ?? data?.trends?.length ?? 0;
  const signalsCount = data?.signal_count ?? data?.signals?.length ?? 0;
  const competitorCount = data?.competitor_intel?.length ?? 0;

  const volumeData = useMemo(
    () => [
      { name: "News articles", value: newsCount },
      { name: "Trend themes", value: trendsCount },
      { name: "Intel signals", value: signalsCount },
      { name: "Competitive moves", value: competitorCount },
    ],
    [newsCount, trendsCount, signalsCount, competitorCount]
  );

  const sectorPieData = useMemo(() => {
    const map = new Map<string, number>();
    for (const t of data?.trends ?? []) {
      const sec = (t.sector || "general").toLowerCase();
      map.set(sec, (map.get(sec) ?? 0) + 1);
    }
    const sectors = data?.sectors_monitored ?? [];
    if (map.size === 0 && sectors.length > 0) {
      sectors.forEach((s) => map.set(s.toLowerCase(), 1));
    }
    return Array.from(map.entries())
      .map(([name, value]) => ({ name: name.charAt(0).toUpperCase() + name.slice(1), value }))
      .sort((a, b) => b.value - a.value);
  }, [data?.trends, data?.sectors_monitored]);

  const impactData = useMemo(() => {
    const trends = data?.trends ?? [];
    let high = 0,
      medium = 0,
      low = 0,
      unk = 0;
    for (const t of trends) {
      const i = (t.impact || "").toLowerCase();
      if (i === "high") high++;
      else if (i === "medium") medium++;
      else if (i === "low") low++;
      else unk++;
    }
    return [
      { name: "High impact", value: high },
      { name: "Medium", value: medium },
      { name: "Low", value: low },
      { name: "Unclassified", value: unk },
    ].filter((r) => r.value > 0);
  }, [data?.trends]);

  const signalsTimeline = useMemo(() => {
    const signals = data?.signals ?? [];
    const byDay = new Map<string, number>();
    for (const s of signals) {
      const d = new Date(s.created_at);
      if (Number.isNaN(d.getTime())) continue;
      const key = d.toISOString().slice(0, 10);
      byDay.set(key, (byDay.get(key) ?? 0) + 1);
    }
    return Array.from(byDay.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, count]) => ({
        date: date.slice(5),
        fullDate: date,
        scans: count,
      }));
  }, [data?.signals]);

  const hasAnySignal = volumeData.some((d) => d.value > 0);
  const emptyCharts = !hasAnySignal && sectorPieData.length === 0;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold tracking-tight">Research analytics</h2>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          Quantitative view of ingestion volume, sector concentration, impact-weighted themes, and scan cadence —
          structured like an enterprise intelligence cockpit.
        </p>
      </div>

      {emptyCharts ? (
        <Card className="border-dashed border-primary/30 bg-primary/[0.03] p-10 text-center">
          <BarChart3 className="mx-auto h-10 w-10 text-primary/60" />
          <p className="mt-4 font-medium text-foreground">Charts activate after data ingest</p>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
            Run <strong className="text-foreground">Run industry scan</strong> — volume bars, sector donut, impact bars,
            and a signal timeline populate from merged news, trends, and stored runs.
          </p>
        </Card>
      ) : (
        <div className="grid gap-6 xl:grid-cols-2">
          <Card className="border-border/65 p-5 shadow-card">
            <div className="mb-4 flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-primary" />
              <div>
                <h3 className="font-semibold tracking-tight">Ingestion volume</h3>
                <p className="text-xs text-muted-foreground">Depth across merged pipelines</p>
              </div>
            </div>
            <div className="h-[280px] w-full min-h-[260px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={volumeData} margin={{ top: 8, right: 12, left: -8, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border) / 0.45)" vertical={false} />
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                    interval={0}
                    angle={-16}
                    textAnchor="end"
                    height={56}
                  />
                  <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} allowDecimals={false} />
                  <Tooltip contentStyle={ttStyle} cursor={{ fill: "hsl(var(--primary) / 0.08)" }} />
                  <Bar dataKey="value" radius={[6, 6, 0, 0]} fill="#8b5cf6" maxBarSize={52} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <Card className="border-border/65 p-5 shadow-card">
            <div className="mb-4 flex items-center gap-2">
              <PieChartIcon className="h-5 w-5 text-primary" />
              <div>
                <h3 className="font-semibold tracking-tight">Sector allocation</h3>
                <p className="text-xs text-muted-foreground">Trend mix by sector tag</p>
              </div>
            </div>
            <div className="h-[280px] w-full min-h-[260px]">
              {sectorPieData.length === 0 ? (
                <p className="flex h-full items-center justify-center text-sm text-muted-foreground">
                  No sector-tagged trends yet.
                </p>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={sectorPieData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={56}
                      outerRadius={96}
                      paddingAngle={2}
                    >
                      {sectorPieData.map((_, i) => (
                        <Cell key={i} fill={PALETTE[i % PALETTE.length]} stroke="hsl(var(--card))" strokeWidth={2} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={ttStyle} />
                    <Legend wrapperStyle={{ fontSize: "11px" }} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
          </Card>

          <Card className="border-border/65 p-5 shadow-card xl:col-span-2">
            <div className="mb-4 flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              <div>
                <h3 className="font-semibold tracking-tight">Impact-weighted themes</h3>
                <p className="text-xs text-muted-foreground">Severity distribution across radar items</p>
              </div>
            </div>
            <div className="h-[220px] w-full min-h-[200px]">
              {impactData.length === 0 ? (
                <p className="flex h-full items-center justify-center text-sm text-muted-foreground">
                  Impact labels populate after the analyst model scores trends.
                </p>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart layout="vertical" data={impactData} margin={{ top: 4, right: 24, left: 8, bottom: 4 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border) / 0.45)" horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} allowDecimals={false} />
                    <YAxis
                      type="category"
                      dataKey="name"
                      width={112}
                      tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                    />
                    <Tooltip contentStyle={ttStyle} />
                    <Bar dataKey="value" radius={[0, 6, 6, 0]} fill="#a78bfa" maxBarSize={28} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </Card>

          <Card className="border-border/65 p-5 shadow-card xl:col-span-2">
            <div className="mb-4 flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              <div>
                <h3 className="font-semibold tracking-tight">Signal velocity & cadence</h3>
                <p className="text-xs text-muted-foreground">Intel snapshots persisted per day (UTC)</p>
              </div>
            </div>
            <div className="h-[260px] w-full min-h-[240px]">
              {signalsTimeline.length === 0 ? (
                <p className="flex h-full items-center justify-center text-sm text-muted-foreground">
                  Multiple scan days build the velocity curve — keep background scans enabled for richer trends.
                </p>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={signalsTimeline} margin={{ top: 8, right: 12, left: -8, bottom: 0 }}>
                    <defs>
                      <linearGradient id="researchAreaFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.35} />
                        <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border) / 0.45)" />
                    <XAxis dataKey="date" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                    <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} allowDecimals={false} />
                    <Tooltip
                      contentStyle={ttStyle}
                      labelFormatter={(_, payload) =>
                        String((payload?.[0]?.payload as { fullDate?: string } | undefined)?.fullDate ?? "")
                      }
                    />
                    <Area type="monotone" dataKey="scans" stroke="#8b5cf6" strokeWidth={2} fill="url(#researchAreaFill)" />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
