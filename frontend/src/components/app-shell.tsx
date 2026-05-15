"use client";

import { usePathname } from "next/navigation";
import { Sidebar } from "@/components/sidebar";
import { ResearchLiveProvider } from "@/context/research-live-context";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isCustomerPortal = pathname.startsWith("/complain");

  if (isCustomerPortal) {
    return <>{children}</>;
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <ResearchLiveProvider>
        <main className="flex-1 overflow-auto p-6 sm:p-8">
          <div className="mx-auto max-w-6xl">{children}</div>
        </main>
      </ResearchLiveProvider>
    </div>
  );
}

