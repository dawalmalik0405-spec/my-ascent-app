"use client";

import Link from "next/link";
import { BrandLockup } from "@/components/brand-logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { cn } from "@/lib/utils";

export function LandingNav({ className }: { className?: string }) {
  return (
    <header
      className={cn(
        "sticky top-0 z-50 border-b border-border/50 bg-background/75 backdrop-blur-xl supports-[backdrop-filter]:bg-background/55",
        className
      )}
    >
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-4">
        <Link href="/" className="group rounded-xl outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-primary">
          <BrandLockup size="sm" />
        </Link>

        <nav className="hidden items-center gap-8 text-sm font-medium text-muted-foreground md:flex">
          <a href="#platform" className="transition-colors hover:text-foreground">
            Platform
          </a>
          <a href="#modules" className="transition-colors hover:text-foreground">
            Modules
          </a>
          <a href="#stack" className="transition-colors hover:text-foreground">
            Stack
          </a>
        </nav>

        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Link
            href="/dashboard"
            className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/25 transition hover:opacity-90"
          >
            Launch operations console
          </Link>
        </div>
      </div>
    </header>
  );
}
