import Link from "next/link";
import { ThemeToggle } from "@/components/theme-toggle";

export const metadata = {
  title: "Complaints — Northwind demo store",
};

/** Customer complaints use the demo storefront; tickets appear in AegisOps under Support. */
export default function ComplainPage() {
  const demoSupportUrl = "http://localhost:9110/support";

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/60 bg-card/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-2xl items-start justify-between gap-4 px-6 py-10">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-primary">Customer portal</p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight">Complaints use the demo store</h1>
            <p className="mt-3 text-muted-foreground">
              Submit complaints from the Northwind Goods demo storefront so they flow through the same path as a real
              customer browser session.
            </p>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-2">
            <ThemeToggle />
            <Link href="/" className="text-xs font-medium text-primary underline-offset-4 hover:underline">
              Back to landing
            </Link>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-2xl px-6 py-12">
        <a
          href={demoSupportUrl}
          className="inline-flex rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/25 transition hover:opacity-90"
        >
          Open {demoSupportUrl}
        </a>
        <p className="mt-10 text-center text-xs text-muted-foreground">
          Processed tickets appear on the AegisOps{" "}
          <Link href="/support" className="font-medium text-primary underline underline-offset-4">
            Support
          </Link>{" "}
          page.
        </p>
      </main>
    </div>
  );
}
