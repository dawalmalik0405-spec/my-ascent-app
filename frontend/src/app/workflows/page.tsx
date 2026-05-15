import { Card } from "@/components/ui/card";

export default function WorkflowsPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Workflow Orchestration</h1>
      <Card>
        <p className="text-muted-foreground">
          Durable workflows powered by Temporal. Incident workflows survive crashes,
          support HITL approval signals, and retry intelligently.
        </p>
        <ul className="mt-4 list-inside list-disc space-y-1 text-sm">
          <li>IncidentResponseWorkflow — flagship production workflow</li>
          <li>LangGraph investigation activity with heartbeats</li>
          <li>Validation retry loop on failure</li>
          <li>Cross-module event emission on resolution</li>
        </ul>
        <p className="mt-4 text-sm">
          Temporal UI: <a href="http://localhost:8080" className="text-primary hover:underline">localhost:8080</a>
        </p>
      </Card>
    </div>
  );
}
