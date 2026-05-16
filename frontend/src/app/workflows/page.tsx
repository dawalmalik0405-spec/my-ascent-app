import { Card } from "@/components/ui/card";

export default function WorkflowsPage() {
  return (
    <div className="space-y-8">
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-primary">Orchestration</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">Workflow fabric</h1>
        <p className="mt-3 max-w-2xl text-muted-foreground">
          Durable execution guarantees autonomous investigations survive retries, approvals, and infrastructure churn.
        </p>
      </div>

      <Card className="border-border/60">
        <p className="text-muted-foreground">
          Powered by Temporal. Incident workflows survive crashes, support human-in-the-loop approval signals, and retry
          intelligently across LangGraph activities.
        </p>
        <ul className="mt-6 list-inside list-disc space-y-2 text-sm leading-relaxed">
          <li>IncidentResponseWorkflow — flagship production workflow</li>
          <li>LangGraph investigation activity with heartbeats</li>
          <li>Validation retry loop on failure</li>
          <li>Cross-module event emission on resolution</li>
        </ul>
        <p className="mt-8 text-sm">
          Temporal UI:{" "}
          <a href="http://localhost:8080" className="font-medium text-primary hover:underline" target="_blank" rel="noopener noreferrer">
            localhost:8080
          </a>
        </p>
      </Card>
    </div>
  );
}
