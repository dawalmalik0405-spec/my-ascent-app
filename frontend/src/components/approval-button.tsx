"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { approveIncident } from "@/lib/api";

export function ApprovalButton({
  incidentId,
  onApproved,
}: {
  incidentId: string;
  onApproved?: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function handleApprove() {
    setLoading(true);
    setError(null);
    try {
      await approveIncident(incidentId);
      onApproved?.();
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Approval failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        onClick={handleApprove}
        disabled={loading}
        className="rounded-md bg-success px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
      >
        {loading ? "Approving..." : "Approve Remediation"}
      </button>
      {error && <p className="max-w-xs text-right text-xs text-red-400">{error}</p>}
    </div>
  );
}
