import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { fetchSupportTickets } from "@/lib/api";

export const dynamic = "force-dynamic";

export default async function SupportPage() {
  let tickets: Awaited<ReturnType<typeof fetchSupportTickets>> = [];
  try {
    tickets = await fetchSupportTickets();
  } catch {
    /* API offline */
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Support Intelligence</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Tickets created by customers through the{" "}
            <strong>Northwind demo store</strong> appear below after Ascent processes them (classification,
            KB retrieval, AI draft reply, optional email).
          </p>
        </div>
        <a
          href="http://localhost:9110/support"
          target="_blank"
          rel="noopener noreferrer"
          className="shrink-0 text-sm text-primary underline"
        >
          Open demo store → Submit complaint
        </a>
      </div>

      <Card>
        <h2 className="mb-4 text-lg font-semibold">Recent tickets</h2>
        {tickets.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No tickets yet. Submit a complaint from the demo store at{" "}
            <a
              href="http://localhost:9110/support"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary underline"
            >
              localhost:9110/support
            </a>
            .
          </p>
        ) : (
          <ul className="space-y-3">
            {tickets.map((t) => (
              <li key={t.id} className="rounded border border-border p-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-medium">{t.subject}</p>
                    <p className="font-mono text-xs text-muted-foreground">{t.id}</p>
                    {t.category && (
                      <p className="mt-1 text-sm text-muted-foreground">Category: {t.category}</p>
                    )}
                    {t.customer_email && (
                      <p className="mt-1 text-sm text-muted-foreground">Email: {t.customer_email}</p>
                    )}
                    {t.email_status && (
                      <p className="mt-1 text-xs text-muted-foreground">
                        Email: {t.email_status}
                        {t.email_error ? ` (${t.email_error})` : ""}
                      </p>
                    )}
                    {t.suggested_response && (
                      <p className="mt-2 line-clamp-3 text-sm text-muted-foreground">
                        {t.suggested_response}
                      </p>
                    )}
                    {t.correlated_incident_id && (
                      <p className="mt-1 text-sm text-primary">
                        Escalated to incident {t.correlated_incident_id}
                      </p>
                    )}
                  </div>
                  <Badge>{t.status}</Badge>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
