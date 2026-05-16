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
    <div className="space-y-8">
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-primary">Research</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">Tech industry intelligence</h1>
        <p className="mt-3 max-w-3xl text-sm leading-relaxed text-muted-foreground">
          Multi-topic scans across AI/agents, cloud, semiconductors, security, and developer platforms — merged into a
          live news feed, trend radar, executive snapshot, and strategic brief. Data refreshes automatically and after each
          manual scan or question.
        </p>
      </div>
      <ResearchDashboard initial={dashboard} />
    </div>
  );
}
