import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

const VARIANT = {
  default: "bg-primary text-primary-foreground hover:opacity-90 shadow-lg shadow-primary/25",
  outline: "border border-border bg-transparent hover:bg-muted",
  ghost: "bg-transparent hover:bg-muted",
};

export function Button({
  children,
  className,
  variant = "default",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: keyof typeof VARIANT }) {
  return (
    <button
      type="button"
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all active:scale-[0.98] disabled:pointer-events-none disabled:opacity-45",
        VARIANT[variant],
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}
