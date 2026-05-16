"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { triggerDemoAlert } from "@/lib/api";
import { Zap } from "lucide-react";
import { Button } from "@/components/ui/button";

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
    <Button onClick={handleClick} disabled={loading} className="rounded-xl px-5 py-2.5">
      <Zap className="h-4 w-4" />
      {loading ? "Investigating…" : "Trigger demo incident"}
    </Button>
  );
}
