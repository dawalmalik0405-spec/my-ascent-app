"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { triggerDemoAlert } from "@/lib/api";
import { Zap } from "lucide-react";

export function DemoTrigger() {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleClick() {
    setLoading(true);
    try {
      const incident = await triggerDemoAlert();
      router.push(`/incidents/${incident.id}`);
      router.refresh();
    } catch (e) {
      console.error(e);
      alert("Failed to trigger demo. Is the API running?");
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
    >
      <Zap className="h-4 w-4" />
      {loading ? "Investigating..." : "Trigger Demo Incident"}
    </button>
  );
}
