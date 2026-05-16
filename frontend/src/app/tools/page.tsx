import { Card } from "@/components/ui/card";
import { fetchMcpTools } from "@/lib/api";

export const dynamic = "force-dynamic";

export default async function ToolsPage() {
  let tools: Array<{ key: string; server: string; name: string; description: string }> = [];
  try {
    tools = await fetchMcpTools();
  } catch {
    /* API offline */
  }

  const byServer = tools.reduce<Record<string, typeof tools>>((acc, t) => {
    (acc[t.server] ??= []).push(t);
    return acc;
  }, {});

  return (
    <div className="space-y-8">
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-primary">Integrations</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">MCP tool ecosystem</h1>
        <p className="mt-3 text-muted-foreground">
          Discover MCP-backed capabilities surfaced to autonomous agents across incidents and research workflows.
        </p>
        <p className="mt-2 text-sm font-medium text-foreground">
          {tools.length} tools across {Object.keys(byServer).length} servers
        </p>
      </div>

      {Object.entries(byServer).map(([server, serverTools]) => (
        <Card key={server} className="border-border/60">
          <h2 className="mb-4 text-lg font-semibold capitalize">{server}</h2>
          <div className="grid gap-2 md:grid-cols-2">
            {serverTools.map((t) => (
              <div key={t.key} className="rounded-xl border border-border/70 bg-muted/10 p-3 dark:bg-muted/5">
                <p className="font-mono text-sm font-medium text-primary">{t.name}</p>
                <p className="mt-1 text-sm text-muted-foreground">{t.description}</p>
              </div>
            ))}
          </div>
        </Card>
      ))}
    </div>
  );
}
