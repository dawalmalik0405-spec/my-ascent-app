import { IncidentInvestigationView } from "@/components/incident-investigation-view";
import { fetchIncident, fetchIncidentTrace } from "@/lib/api";

export const dynamic = "force-dynamic";

export default async function IncidentDetailPage({
  params,
}: {
  params: { id: string };
}) {
  let incident = null;
  let trace = null;
  try {
    [incident, trace] = await Promise.all([
      fetchIncident(params.id),
      fetchIncidentTrace(params.id),
    ]);
  } catch {
    /* API offline */
  }

  if (!incident || !trace) {
    return <p className="text-muted-foreground">Incident not found or API unavailable.</p>;
  }

  return (
    <IncidentInvestigationView
      incidentId={params.id}
      initialIncident={incident}
      initialTrace={trace}
    />
  );
}
