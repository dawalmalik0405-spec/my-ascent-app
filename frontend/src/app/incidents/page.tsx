import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { fetchIncidents } from "@/lib/api";

export const dynamic = "force-dynamic";

export default async function IncidentsPage() {
  let incidents: Awaited<ReturnType<typeof fetchIncidents>> = [];
  try {
    incidents = await fetchIncidents();
  } catch {
    /* API offline */
  }

  return (
    <div className="space-y-8">
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-primary">Incidents</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">Investigation queue</h1>
        <p className="mt-2 max-w-2xl text-muted-foreground">
          Select an incident to open the live agent pipeline, evidence bundle, and Temporal-backed workflow trace.
        </p>
      </div>

      <Card className="border-border/60">
        <div className="space-y-2">
          {incidents.length === 0 ? (
            <p className="text-muted-foreground">No incidents recorded.</p>
          ) : (
            incidents.map((inc) => (
              <Link
                key={inc.id}
                href={`/incidents/${inc.id}`}
                prefetch
                className="flex flex-col gap-3 rounded-2xl border border-transparent p-4 transition hover:border-primary/25 hover:bg-muted/35 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="font-medium">{inc.title}</p>
                  <p className="text-sm text-muted-foreground">
                    {inc.service} · {new Date(inc.created_at).toLocaleString()}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Badge variant={inc.severity}>{inc.severity}</Badge>
                  <Badge variant={inc.status === "resolved" ? "resolved" : "default"}>{inc.status}</Badge>
                </div>
              </Link>
            ))
          )}
        </div>
      </Card>
    </div>
  );
}
