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
import { BrandLockup } from "@/components/brand-logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { cn } from "@/lib/utils";

const nav = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/incidents", label: "Incidents", icon: AlertTriangle },
  { href: "/workflows", label: "Workflows", icon: Activity },
  { href: "/support", label: "Support", icon: Headphones },
  { href: "/research", label: "Research", icon: BookOpen },
  { href: "/tools", label: "MCP Tools", icon: Wrench },
];

function navItemActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="relative z-20 flex h-screen w-64 shrink-0 flex-col border-r border-border/80 bg-card/90 shadow-[4px_0_40px_-20px_hsl(var(--primary)/0.15)] backdrop-blur-xl supports-[backdrop-filter]:bg-card/75">
      <div className="border-b border-border/60 bg-gradient-to-br from-primary/[0.07] to-transparent px-5 py-5">
        <Link href="/" className="group block rounded-xl outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-primary">
          <BrandLockup size="md" />
          <p className="mt-3 text-[11px] text-muted-foreground transition group-hover:text-primary">
            ← Landing page
          </p>
        </Link>
      </div>
      <nav className="flex-1 space-y-1 overflow-y-auto p-4">
        {nav.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            prefetch
            className={cn(
              "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all",
              navItemActive(pathname, href)
                ? "bg-gradient-to-r from-primary/18 to-primary/5 text-primary shadow-sm shadow-primary/10"
                : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
            )}
          >
            <Icon className="h-4 w-4 shrink-0 opacity-90" />
            {label}
          </Link>
        ))}
      </nav>
      <div className="border-t border-border/60 p-4">
        <div className="flex items-center justify-between gap-2">
          <p className="text-[10px] leading-snug text-muted-foreground">
            Temporal · LangGraph · Qdrant
          </p>
          <ThemeToggle />
        </div>
      </div>
    </aside>
  );
}
