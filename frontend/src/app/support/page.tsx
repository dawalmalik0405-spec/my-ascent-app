import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SupportTicketForm } from "@/components/support-ticket-form";
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
        <h1 className="text-3xl font-bold">Support Intelligence</h1>
        <a
          href="/complain"
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-primary underline"
        >
          Customer portal → /complain
        </a>
      </div>
      <Card>
        <h2 className="mb-3 text-lg font-semibold">Submit ticket</h2>
        <p className="mb-4 text-sm text-muted-foreground">
          Runs the support LangGraph pipeline: intake → classification → KB retrieval → escalation → response.
        </p>
        <SupportTicketForm />
      </Card>
      <Card>
        <h2 className="mb-4 text-lg font-semibold">Recent tickets</h2>
        {tickets.length === 0 ? (
          <p className="text-sm text-muted-foreground">No tickets yet. Submit one above.</p>
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
