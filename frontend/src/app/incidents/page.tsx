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
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Incidents</h1>
      <Card>
        <div className="space-y-2">
          {incidents.length === 0 ? (
            <p className="text-muted-foreground">No incidents recorded.</p>
          ) : (
            incidents.map((inc) => (
              <Link
                key={inc.id}
                href={`/incidents/${inc.id}`}
                className="flex items-center justify-between rounded-md border border-border p-4 hover:bg-muted/50"
              >
                <div>
                  <p className="font-medium">{inc.title}</p>
                  <p className="text-sm text-muted-foreground">
                    {inc.service} · {new Date(inc.created_at).toLocaleString()}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Badge variant={inc.severity}>{inc.severity}</Badge>
                  <Badge>{inc.status}</Badge>
                </div>
              </Link>
            ))
          )}
        </div>
      </Card>
    </div>
  );
}
