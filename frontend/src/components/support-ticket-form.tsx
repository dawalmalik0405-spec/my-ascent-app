"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { submitSupportTicket } from "@/lib/api";

export function SupportTicketForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("Payment failed after checkout");
  const [body, setBody] = useState(
    "Customer reports duplicate charges and timeout errors on payment-api since 14:00 UTC."
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await submitSupportTicket({
        subject,
        body,
        priority: "high",
        customer_email: email || undefined,
      });
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit ticket");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <label className="block space-y-1">
        <span className="text-sm text-muted-foreground">Customer email (for reply)</span>
        <input
          type="email"
          className="w-full rounded border border-border bg-background px-3 py-2 text-sm"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="customer@company.com"
        />
      </label>
      <label className="block space-y-1">
        <span className="text-sm text-muted-foreground">Subject</span>
        <input
          className="w-full rounded border border-border bg-background px-3 py-2 text-sm"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          required
        />
      </label>
      <label className="block space-y-1">
        <span className="text-sm text-muted-foreground">Description</span>
        <textarea
          className="min-h-[100px] w-full rounded border border-border bg-background px-3 py-2 text-sm"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          required
        />
      </label>
      {error && <p className="text-sm text-red-400">{error}</p>}
      <button
        type="submit"
        disabled={loading}
        className="rounded bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
      >
        {loading ? "Processing…" : "Submit ticket"}
      </button>
    </form>
  );
}
