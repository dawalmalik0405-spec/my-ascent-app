import { ResearchDashboard } from "@/components/research-dashboard";
import { fetchResearchDashboard } from "@/lib/api";

export const dynamic = "force-dynamic";

export default async function ResearchPage() {
  let dashboard = null;
  try {
    dashboard = await fetchResearchDashboard();
  } catch {
    /* API offline */
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">R&D / Market Intelligence</h1>
        <p className="mt-1 text-muted-foreground">
          Live tech industry news, trend analysis, and strategic summaries — refreshed every 24 hours.
        </p>
      </div>
      <ResearchDashboard initial={dashboard} />
    </div>
  );
}
