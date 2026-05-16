import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Card({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-border/70 bg-card/95 p-6 shadow-card backdrop-blur-sm dark:bg-card/90",
        className
      )}
    >
      {children}
    </div>
  );
}
