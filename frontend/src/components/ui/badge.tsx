import { cn } from "@/lib/utils";

const variants: Record<string, string> = {
  critical: "bg-destructive/20 text-destructive border-destructive/30",
  high: "bg-warning/20 text-warning border-warning/30",
  medium: "bg-primary/20 text-primary border-primary/30",
  low: "bg-muted text-muted-foreground border-border",
  resolved: "bg-success/20 text-success border-success/30",
  default: "bg-muted text-muted-foreground border-border",
};

export function Badge({
  children,
  variant = "default",
  className,
}: {
  children: React.ReactNode;
  variant?: string;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium",
        variants[variant] || variants.default,
        className
      )}
    >
      {children}
    </span>
  );
}
