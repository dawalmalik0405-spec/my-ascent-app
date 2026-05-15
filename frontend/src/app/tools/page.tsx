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
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">MCP Tool Ecosystem</h1>
      <p className="text-muted-foreground">{tools.length} tools across {Object.keys(byServer).length} servers</p>
      {Object.entries(byServer).map(([server, serverTools]) => (
        <Card key={server}>
          <h2 className="mb-4 text-lg font-semibold capitalize">{server}</h2>
          <div className="grid gap-2 md:grid-cols-2">
            {serverTools.map((t) => (
              <div key={t.key} className="rounded border border-border p-3">
                <p className="font-mono text-sm text-primary">{t.name}</p>
                <p className="mt-1 text-sm text-muted-foreground">{t.description}</p>
              </div>
            ))}
          </div>
        </Card>
      ))}
    </div>
  );
}
