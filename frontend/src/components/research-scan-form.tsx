"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { runResearchScan } from "@/lib/api";

export function ResearchScanForm() {
  const router = useRouter();
  const [query, setQuery] = useState("AI agent orchestration enterprise trends");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await runResearchScan(query);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Scan failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <label className="block space-y-1">
        <span className="text-sm text-muted-foreground">Research query</span>
        <input
          className="w-full rounded border border-border bg-background px-3 py-2 text-sm"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          required
        />
      </label>
      {error && <p className="text-sm text-red-400">{error}</p>}
      <button
        type="submit"
        disabled={loading}
        className="rounded bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
      >
        {loading ? "Scanning…" : "Run research scan"}
      </button>
    </form>
  );
}
