"use client";

export function LandingHero3D() {
  return (
    <div className="hero-3d-scene relative mx-auto flex h-[min(480px,55vh)] w-full max-w-lg items-center justify-center md:h-[520px]">
      {/* Ambient glow */}
      <div
        className="hero-glow-pulse pointer-events-none absolute inset-10 rounded-full bg-gradient-to-br from-primary/35 via-purple-500/25 to-violet-600/15 blur-3xl dark:from-primary/40 dark:via-fuchsia-600/20 dark:to-violet-900/25"
        aria-hidden
      />

      <div className="hero-3d-pivot relative h-full w-full">
        {/* Outer wireframe ring */}
        <div
          className="hero-ring-spin hero-float-z absolute left-1/2 top-1/2 h-[min(85%,380px)] w-[min(85%,380px)] -translate-x-1/2 -translate-y-1/2 rounded-[40%] border-2 border-dashed border-primary/35 shadow-[inset_0_0_40px_hsl(var(--primary)/0.12)]"
          style={{ transform: "translate(-50%, -50%) rotateX(72deg)" }}
          aria-hidden
        />

        {/* Mid glass plate */}
        <div
          className="hero-float-z absolute left-1/2 top-1/2 w-[72%] max-w-[340px] -translate-x-1/2 -translate-y-1/2 rounded-3xl border border-primary/25 bg-gradient-to-br from-card/90 via-card/40 to-primary/10 p-px shadow-card backdrop-blur-md dark:border-primary/35 dark:from-card/80 dark:via-card/30"
          style={{
            animationDelay: "-2s",
            transform: "translate(-50%, -50%) translateZ(36px) rotateX(8deg)",
          }}
          aria-hidden
        >
          <div className="rounded-[calc(1.5rem-1px)] bg-card/60 p-8 dark:bg-card/40">
            <div className="flex gap-3">
              <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-primary to-purple-600 opacity-90 shadow-lg dark:to-violet-700" />
              <div className="flex flex-1 flex-col gap-2 pt-1">
                <div className="h-2 w-3/4 rounded-full bg-muted" />
                <div className="h-2 w-1/2 rounded-full bg-muted/70" />
              </div>
            </div>
            <div className="mt-6 space-y-2">
              <div className="h-2 rounded-full bg-primary/20" />
              <div className="h-2 rounded-full bg-primary/15" />
              <div className="h-2 w-5/6 rounded-full bg-muted/80" />
            </div>
          </div>
        </div>

        {/* Floating orbit shards */}
        <div
          className="pointer-events-none absolute left-[8%] top-[22%] h-16 w-16 rounded-2xl bg-gradient-to-br from-primary/80 to-purple-700 opacity-90 shadow-lg dark:to-violet-800"
          style={{
            transform: "rotateY(-18deg) rotateX(12deg) translateZ(80px)",
            animation: "hero-float-z 5s ease-in-out infinite",
          }}
          aria-hidden
        />
        <div
          className="pointer-events-none absolute bottom-[18%] right-[6%] h-14 w-14 rounded-full bg-gradient-to-tr from-fuchsia-500/90 to-primary opacity-95 shadow-lg dark:from-fuchsia-600/80"
          style={{
            transform: "rotateX(-20deg) translateZ(60px)",
            animation: "hero-float-z 5.5s ease-in-out infinite",
            animationDelay: "-1.2s",
          }}
          aria-hidden
        />
        <div
          className="pointer-events-none absolute right-[14%] top-[30%] h-10 w-24 skew-x-[-12deg] rounded-lg bg-primary/30 backdrop-blur-sm dark:bg-primary/35"
          style={{
            transform: "translateZ(100px) rotateY(25deg)",
            animation: "hero-float-z 7s ease-in-out infinite",
            animationDelay: "-3s",
          }}
          aria-hidden
        />
      </div>
    </div>
  );
}
