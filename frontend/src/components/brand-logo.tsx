"use client";

import { useId } from "react";
import { cn } from "@/lib/utils";
import { BRAND_NAME, TAGLINE_UPPER } from "@/lib/brand";

type BrandMarkProps = {
  size?: number;
  className?: string;
};

/**
 * AegisOps mark — shield badge with layered gradients plus a compact agent-robot
 * glyph (antenna, visor, twin sensors, side swarm nodes). No text monogram.
 */
export function BrandMark({ size = 44, className }: BrandMarkProps) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "") || "brand";
  const bg = `${uid}-shield-fill`;
  const inner = `${uid}-inner-facet`;
  const rim = `${uid}-rim`;
  const glow = `${uid}-core-glow`;
  const gem = `${uid}-gem`;
  const helmetGlass = `${uid}-helmet-glass`;
  const visorDark = `${uid}-visor`;
  const eyeGlow = `${uid}-eye-glow`;
  const robotShadow = `${uid}-robot-shadow`;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      className={cn(
        "brand-mark-svg shrink-0 overflow-visible drop-shadow-[0_3px_14px_hsl(var(--primary)/0.45)] dark:drop-shadow-[0_4px_18px_hsl(var(--primary)/0.35)]",
        className
      )}
      aria-hidden
    >
      <defs>
        <linearGradient id={bg} x1="8%" y1="92%" x2="92%" y2="8%">
          <stop offset="0%" stopColor="#3730a3" />
          <stop offset="42%" stopColor="#7c3aed" />
          <stop offset="78%" stopColor="#a78bfa" />
          <stop offset="100%" stopColor="#ddd6fe" />
        </linearGradient>
        <linearGradient id={inner} x1="50%" y1="100%" x2="50%" y2="0%">
          <stop offset="0%" stopColor="#1e1b4b" stopOpacity="0.55" />
          <stop offset="100%" stopColor="#faf5ff" stopOpacity="0.22" />
        </linearGradient>
        <linearGradient id={rim} x1="50%" y1="0%" x2="50%" y2="100%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.55" />
          <stop offset="35%" stopColor="#ffffff" stopOpacity="0.08" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
        </linearGradient>
        <linearGradient id={helmetGlass} x1="50%" y1="0%" x2="50%" y2="100%">
          <stop offset="0%" stopColor="#faf5ff" stopOpacity="0.5" />
          <stop offset="45%" stopColor="#ddd6fe" stopOpacity="0.22" />
          <stop offset="100%" stopColor="#5b21b6" stopOpacity="0.12" />
        </linearGradient>
        <linearGradient id={visorDark} x1="50%" y1="0%" x2="50%" y2="100%">
          <stop offset="0%" stopColor="#312e81" />
          <stop offset="100%" stopColor="#1e1039" />
        </linearGradient>
        <radialGradient id={glow} cx="32%" cy="28%" r="55%">
          <stop offset="0%" stopColor="#faf5ff" stopOpacity="0.55" />
          <stop offset="45%" stopColor="#a78bfa" stopOpacity="0.18" />
          <stop offset="100%" stopColor="#7c3aed" stopOpacity="0" />
        </radialGradient>
        <radialGradient id={gem} cx="40%" cy="35%" r="65%">
          <stop offset="0%" stopColor="#fae8ff" />
          <stop offset="100%" stopColor="#8b5cf6" />
        </radialGradient>
        <radialGradient id={eyeGlow} cx="32%" cy="28%" r="70%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="35%" stopColor="#e0e7ff" />
          <stop offset="100%" stopColor="#818cf8" />
        </radialGradient>
        <filter id={robotShadow} x="-40%" y="-40%" width="180%" height="180%">
          <feDropShadow dx="0" dy="1.5" stdDeviation="1.2" floodColor="#1e1b4b" floodOpacity="0.5" />
        </filter>
      </defs>

      {/* Outer shield */}
      <path
        fill={`url(#${bg})`}
        d="M24 3.2c6.9 0 12.8 2.6 16.2 6.7 1.7 2 2.7 4.4 2.7 7v12.4c0 6.4-4.4 12.4-11.3 15.7l-7 3.4c-.4.2-.9.2-1.3 0l-7-3.4C9.4 41.7 5 35.7 5 29.1V16.9c0-2.6 1-5 2.7-7C11.2 5.8 17.1 3.2 24 3.2z"
      />
      <path
        fill={`url(#${inner})`}
        d="M24 8.5 36.2 15.2v11.4c0 4.9-3.3 9.5-8.5 12l-3.7 1.8-3.7-1.8c-5.2-2.5-8.5-7.1-8.5-12V15.2L24 8.5z"
      />
      <ellipse className="brand-mark-svg-glow" cx="23.5" cy="19" rx="13" ry="10" fill={`url(#${glow})`} />
      <ellipse
        cx="24"
        cy="22"
        rx="12"
        ry="7.2"
        fill="none"
        stroke="white"
        strokeOpacity={0.14}
        strokeWidth={0.85}
      />
      <path
        fill="none"
        stroke={`url(#${rim})`}
        strokeWidth={1.35}
        strokeLinecap="round"
        d="M11.5 15.8c3.6-3.5 8.2-5.4 12.5-5.4s8.9 1.9 12.5 5.4"
      />

      {/* Agent / robot glyph */}
      <g filter={`url(#${robotShadow})`}>
        {/* Uplink */}
        <line x1="24" y1="13.2" x2="24" y2="10.4" stroke="white" strokeOpacity={0.55} strokeWidth={1.15} strokeLinecap="round" />
        <circle cx="24" cy="9.1" r="1.85" fill={`url(#${gem})`} />
        <circle cx="23.35" cy="8.55" r="0.55" fill="white" opacity={0.65} />

        {/* Helmet */}
        <rect
          x="16.35"
          y="13.25"
          width="15.3"
          height="17.8"
          rx="5.15"
          ry="5.15"
          fill={`url(#${helmetGlass})`}
          stroke="white"
          strokeOpacity={0.38}
          strokeWidth={1.05}
        />

        {/* Visor */}
        <rect
          x="17.85"
          y="18.95"
          width="12.3"
          height="9.35"
          rx="2.85"
          ry="2.85"
          fill={`url(#${visorDark})`}
          stroke="#c4b5fd"
          strokeOpacity={0.45}
          strokeWidth={0.75}
        />
        {/* Scan line */}
        <line x1="19.2" y1="23.15" x2="28.8" y2="23.15" stroke="#a78bfa" strokeOpacity={0.35} strokeWidth={0.55} strokeLinecap="round" />

        {/* Twin sensors */}
        <circle cx="20.85" cy="23.55" r="2.05" fill={`url(#${eyeGlow})`} />
        <circle cx="27.15" cy="23.55" r="2.05" fill={`url(#${eyeGlow})`} />
        <circle cx="21.35" cy="23.05" r="0.75" fill="white" opacity={0.92} />
        <circle cx="27.65" cy="23.05" r="0.75" fill="white" opacity={0.92} />

        {/* Vent ticks */}
        <line x1="20" y1="30.6" x2="22.2" y2="30.6" stroke="white" strokeOpacity={0.22} strokeWidth={0.85} strokeLinecap="round" />
        <line x1="25.8" y1="30.6" x2="28" y2="30.6" stroke="white" strokeOpacity={0.22} strokeWidth={0.85} strokeLinecap="round" />

        {/* Side agent nodes + sync arc */}
        <path
          d="M14.3 25.3 Q16.8 23.8 17.8 22.7"
          fill="none"
          stroke="#ddd6fe"
          strokeOpacity={0.35}
          strokeWidth={0.65}
          strokeLinecap="round"
        />
        <path
          d="M33.7 25.3 Q31.2 23.8 30.2 22.7"
          fill="none"
          stroke="#ddd6fe"
          strokeOpacity={0.35}
          strokeWidth={0.65}
          strokeLinecap="round"
        />
        <circle cx="13.15" cy="26.05" r="1.35" fill="#ede9fe" fillOpacity={0.92} />
        <circle cx="34.85" cy="26.05" r="1.35" fill="#ede9fe" fillOpacity={0.92} />
        <circle cx="13.35" cy="25.85" r="0.45" fill="#7c3aed" fillOpacity={0.55} />
        <circle cx="35.05" cy="25.85" r="0.45" fill="#7c3aed" fillOpacity={0.55} />
      </g>

      {/* Status pulse (bottom of shield) */}
      <circle cx="24" cy="39.2" r="2.35" fill={`url(#${gem})`} opacity={0.95} />
      <circle cx="23.2" cy="38.5" r="0.65" fill="white" opacity={0.55} />
    </svg>
  );
}

type BrandLockupProps = {
  size?: "sm" | "md";
  className?: string;
};

export function BrandLockup({ size = "md", className }: BrandLockupProps) {
  const markSize = size === "sm" ? 38 : 46;
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
