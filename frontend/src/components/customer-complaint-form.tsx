"use client";

import { useState } from "react";
import { submitCustomerComplaint, type SupportTicket } from "@/lib/api";

export function CustomerComplaintForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<SupportTicket | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const ticket = await submitCustomerComplaint({
        customer_email: email,
        customer_name: name || undefined,
        subject,
        body,
      });
      setResult(ticket);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Submission failed");
    } finally {
      setLoading(false);
    }
  }

  if (result) {
    return (
      <div className="rounded-lg border border-border bg-card p-6">
        <h2 className="text-xl font-semibold text-green-400">Complaint received</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Reference: <span className="font-mono">{result.id}</span>
        </p>
        {result.email_status === "sent" ? (
          <p className="mt-4 text-sm">
            A response has been sent to <strong>{result.customer_email}</strong>. Please check
            your inbox (and spam folder).
          </p>
        ) : result.email_status === "skipped" ? (
          <p className="mt-4 text-sm text-amber-400">
            Your complaint was processed, but email is not configured on this server yet. An
            operator will follow up manually. Preview of our response:
          </p>
        ) : (
          <p className="mt-4 text-sm text-red-400">
            Email delivery failed: {result.email_error || "unknown error"}. Your ticket was still
            created — our team will contact you.
          </p>
        )}
        {result.suggested_response && (
          <div className="mt-4 rounded border border-border bg-muted/30 p-4 text-sm whitespace-pre-wrap">
            {result.suggested_response}
          </div>
        )}
        <button
          type="button"
          className="mt-6 text-sm text-primary underline"
          onClick={() => {
            setResult(null);
            setSubject("");
            setBody("");
          }}
        >
          Submit another complaint
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5 rounded-lg border border-border bg-card p-6">
      <label className="block space-y-1">
        <span className="text-sm font-medium">Your email *</span>
        <input
          type="email"
          required
          className="w-full rounded border border-border bg-background px-3 py-2 text-sm"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@company.com"
        />
      </label>
      <label className="block space-y-1">
        <span className="text-sm font-medium">Your name</span>
        <input
          className="w-full rounded border border-border bg-background px-3 py-2 text-sm"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Optional"
        />
      </label>
      <label className="block space-y-1">
        <span className="text-sm font-medium">Subject *</span>
        <input
          required
          className="w-full rounded border border-border bg-background px-3 py-2 text-sm"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          placeholder="Brief summary of the issue"
        />
      </label>
      <label className="block space-y-1">
        <span className="text-sm font-medium">Details *</span>
        <textarea
          required
          minLength={10}
          rows={6}
          className="w-full rounded border border-border bg-background px-3 py-2 text-sm"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Describe what happened, when, and any order or account IDs…"
        />
      </label>
      {error && <p className="text-sm text-red-400">{error}</p>}
      <button
        type="submit"
        disabled={loading}
        className="w-full rounded bg-primary py-3 text-sm font-medium text-primary-foreground disabled:opacity-50"
      >
        {loading ? "Processing your complaint…" : "Submit complaint"}
      </button>
      <p className="text-xs text-muted-foreground">
        By submitting, you agree that we may use AI to analyze your message and email you a
        response.
      </p>
    </form>
  );
}
