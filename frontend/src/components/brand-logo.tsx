"use client";

import { cn } from "@/lib/utils";
import { BRAND_NAME, TAGLINE_UPPER } from "@/lib/brand";

type BrandMarkProps = {
  size?: number;
  className?: string;
};

/** Flat circular badge — AO monogram for AegisOps */
export function BrandMark({ size = 44, className }: BrandMarkProps) {
  const fontPx = Math.round(size * 0.32);
  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full bg-[#6d28d9] font-black leading-none tracking-tighter text-white shadow-none outline outline-1 outline-black/5 dark:bg-[#7c3aed] dark:outline-white/10",
        className
      )}
      style={{
        width: size,
        height: size,
        fontSize: fontPx,
      }}
      aria-hidden
    >
      AO
    </div>
  );
}

type BrandLockupProps = {
  size?: "sm" | "md";
  className?: string;
};

export function BrandLockup({ size = "md", className }: BrandLockupProps) {
  const markSize = size === "sm" ? 36 : 44;
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <BrandMark size={markSize} />
      <div className="min-w-0 leading-tight">
        <span
          className={cn(
            "block font-bold tracking-tight text-foreground",
            size === "sm" ? "text-base" : "text-lg"
          )}
        >
          {BRAND_NAME}
        </span>
        <p className="mt-0.5 text-[10px] font-medium uppercase tracking-[0.22em] text-muted-foreground">
          {TAGLINE_UPPER}
        </p>
      </div>
    </div>
  );
}
