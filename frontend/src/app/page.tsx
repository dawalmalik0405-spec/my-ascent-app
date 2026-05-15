import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DemoTrigger } from "@/components/demo-trigger";
import { fetchIncidents, fetchMcpTools } from "@/lib/api";
import { Activity, AlertTriangle, ArrowRight, Bot, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function OverviewPage() {
  let incidents: Awaited<ReturnType<typeof fetchIncidents>> = [];
  let tools: unknown[] = [];
  try {
    [incidents, tools] = await Promise.all([fetchIncidents(), fetchMcpTools()]);
  } catch {
    /* API may be offline during build */
  }

  const active = incidents.filter((i) => i.status !== "resolved" && i.status !== "cancelled");
  const critical = incidents.filter((i) => i.severity === "critical");

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Operations Command Center</h1>
          <p className="mt-1 text-muted-foreground">
            Autonomous multi-agent platform for enterprise operations
          </p>
        </div>
        <DemoTrigger />
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <StatCard icon={AlertTriangle} label="Active Incidents" value={String(active.length)} />
        <StatCard icon={Zap} label="Critical" value={String(critical.length)} variant="critical" />
        <StatCard icon={Bot} label="MCP Tools" value={String(tools.length)} />
        <StatCard icon={Activity} label="Total Incidents" value={String(incidents.length)} />
      </div>

      <Card>
        <h2 className="mb-4 text-lg font-semibold">Recent Incidents</h2>
        {incidents.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No incidents yet. Trigger a demo alert to start autonomous investigation.
          </p>
        ) : (
          <div className="space-y-3">
            {incidents.slice(0, 5).map((inc) => (
              <div
                key={inc.id}
                className="flex items-center justify-between rounded-md border border-border p-4"
              >
                <div>
                  <p className="font-medium">{inc.title}</p>
                  <p className="text-sm text-muted-foreground">{inc.service ?? "unknown"} · {inc.correlation_id}</p>
                </div>
                <div className="flex gap-2">
                  <Badge variant={inc.severity}>{inc.severity}</Badge>
                  <Badge variant={inc.status === "resolved" ? "resolved" : "default"}>{inc.status}</Badge>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <div className="grid gap-4 md:grid-cols-3">
        <ModuleCard
          href="/incidents"
          title="Incident Intelligence"
          desc="Autonomous SRE — triage, RCA, remediation, validation"
          primary
        />
        <ModuleCard
          href="/support"
          title="Support Intelligence"
          desc="Ticket classification, KB retrieval, incident correlation"
        />
        <ModuleCard
          href="/research"
          title="R&D Intelligence"
          desc="Trend analysis, competitor intel, strategic insights"
        />
      </div>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  variant,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  variant?: string;
}) {
  return (
    <Card className={variant === "critical" ? "border-destructive/30" : ""}>
      <div className="flex items-center gap-3">
        <Icon className="h-5 w-5 text-primary" />
        <div>
          <p className="text-2xl font-bold">{value}</p>
          <p className="text-xs text-muted-foreground">{label}</p>
        </div>
      </div>
    </Card>
  );
}

function ModuleCard({
  href,
  title,
  desc,
  primary,
}: {
  href: string;
  title: string;
  desc: string;
  primary?: boolean;
}) {
  return (
    <Link
      href={href}
      prefetch
      className="group block rounded-lg outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-primary"
    >
      <Card
        className={cn(
          "h-full cursor-pointer transition-colors hover:border-primary/50 hover:bg-muted/20",
          primary ? "border-primary/40" : ""
        )}
      >
        <h3 className="font-semibold group-hover:text-primary">{title}</h3>
        <p className="mt-2 text-sm text-muted-foreground">{desc}</p>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          {primary ? (
            <Badge variant="medium">Primary Module</Badge>
          ) : null}
          <span className="inline-flex items-center gap-1 text-sm font-medium text-primary">
            Open
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </span>
        </div>
      </Card>
    </Link>
  );
}
