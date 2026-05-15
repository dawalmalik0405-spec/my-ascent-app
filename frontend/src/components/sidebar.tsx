"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  AlertTriangle,
  BookOpen,
  Headphones,
  LayoutDashboard,
  Wrench,
} from "lucide-react";
import { cn } from "@/lib/utils";

const nav = [
  { href: "/", label: "Overview", icon: LayoutDashboard },
  { href: "/incidents", label: "Incidents", icon: AlertTriangle },
  { href: "/workflows", label: "Workflows", icon: Activity },
  { href: "/support", label: "Support", icon: Headphones },
  { href: "/research", label: "Research", icon: BookOpen },
  { href: "/tools", label: "MCP Tools", icon: Wrench },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex h-screen w-64 flex-col border-r border-border bg-card">
      <div className="border-b border-border p-6">
        <h1 className="text-lg font-bold tracking-tight">Ascent</h1>
        <p className="text-xs text-muted-foreground">Autonomous Operations</p>
      </div>
      <nav className="flex-1 space-y-1 p-4">
        {nav.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
              pathname === href
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            <Icon className="h-4 w-4" />
            {label}
          </Link>
        ))}
      </nav>
      <div className="border-t border-border p-4 text-xs text-muted-foreground">
        Temporal · LangGraph · Qdrant
      </div>
    </aside>
  );
}
