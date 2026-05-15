export const metadata = {
  title: "Complaints — Northwind demo store",
};

/** Customer complaints are submitted from the demo ecommerce app only (Ascent dashboard lists them under Support). */
export default function ComplainPage() {
  const demoSupportUrl = "http://localhost:9110/support";

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card px-6 py-8">
        <div className="mx-auto max-w-2xl">
          <p className="text-sm font-medium text-primary">Customer Support</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight">Complaints use the demo store</h1>
          <p className="mt-2 text-muted-foreground">
            Submit complaints from the Northwind Goods demo storefront so they flow through the same path as a
            real customer browser session.
          </p>
        </div>
      </header>
      <main className="mx-auto max-w-2xl px-6 py-10">
        <a
          href={demoSupportUrl}
          className="inline-flex rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
        >
          Open {demoSupportUrl}
        </a>
        <p className="mt-8 text-center text-xs text-muted-foreground">
          Processed tickets appear on the Ascent{" "}
          <a href="/support" className="text-primary underline">
            Support
          </a>{" "}
          page.
        </p>
      </main>
    </div>
  );
}
