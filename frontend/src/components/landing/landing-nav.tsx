"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { BrandLockup } from "@/components/brand-logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { cn } from "@/lib/utils";

const NAV_LINKS = [
  { href: "#platform", label: "Platform" },
  { href: "#frontdesk-stack", label: "Stack" },
  { href: "#workflow", label: "Workflow" },
  { href: "#modules", label: "Modules" },
] as const;

export function LandingNav({ className }: { className?: string }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  return (
    <header
      className={cn(
        "sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60",
        className
      )}
    >
      <div className="relative mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3.5 sm:px-6 lg:px-8 lg:py-4">
        <Link
          href="/"
          className="group shrink-0 rounded-xl outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-primary"
        >
          <BrandLockup size="sm" />
        </Link>

        <nav className="hidden items-center gap-8 text-sm font-medium text-muted-foreground lg:flex">
          {NAV_LINKS.map(({ href, label }) => (
            <a key={href} href={href} className="transition-colors hover:text-foreground">
              {label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-1.5 sm:gap-2">
          <ThemeToggle />
          <Link
            href="/dashboard"
            className="hidden rounded-xl border border-border/80 bg-card/80 px-3 py-2 text-sm font-semibold text-foreground shadow-sm transition hover:border-primary/30 hover:bg-muted/40 sm:inline-flex"
          >
            Console
          </Link>
          <Link
            href="/dashboard"
            className="inline-flex rounded-xl bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/25 transition hover:opacity-90 sm:px-4"
          >
            <span className="hidden sm:inline">Launch console</span>
            <span className="sm:hidden">Launch</span>
          </Link>
          <button
            type="button"
            aria-expanded={open}
            aria-controls="landing-mobile-nav"
            className="inline-flex rounded-lg border border-border/70 p-2 text-foreground lg:hidden"
            onClick={() => setOpen((v) => !v)}
          >
            {open ? <X className="h-5 w-5" aria-hidden /> : <Menu className="h-5 w-5" aria-hidden />}
            <span className="sr-only">{open ? "Close menu" : "Open menu"}</span>
          </button>
        </div>

        {open ? (
          <>
            <button
              type="button"
              className="fixed inset-0 z-40 bg-background/50 backdrop-blur-[2px] lg:hidden"
              aria-hidden
              onClick={() => setOpen(false)}
            />
            <div
              id="landing-mobile-nav"
              className="absolute left-0 right-0 top-full z-50 border-b border-border/60 bg-background/98 px-4 py-5 shadow-xl backdrop-blur-xl lg:hidden"
            >
              <nav className="mx-auto flex max-w-7xl flex-col gap-1">
                {NAV_LINKS.map(({ href, label }) => (
                  <a
                    key={href}
                    href={href}
                    className="rounded-lg px-3 py-3 text-base font-medium text-foreground transition hover:bg-muted/80"
                    onClick={() => setOpen(false)}
                  >
                    {label}
                  </a>
                ))}
                <Link
                  href="/dashboard"
                  className="mt-4 rounded-xl bg-primary px-4 py-3 text-center text-sm font-semibold text-primary-foreground"
                  onClick={() => setOpen(false)}
                >
                  Open operations console
                </Link>
              </nav>
            </div>
          </>
        ) : null}
      </div>
    </header>
  );
}
