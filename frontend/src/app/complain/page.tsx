import { CustomerComplaintForm } from "@/components/customer-complaint-form";

export const metadata = {
  title: "Submit a complaint — Ascent Support",
};

export default function ComplainPage() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card px-6 py-8">
        <div className="mx-auto max-w-2xl">
          <p className="text-sm font-medium text-primary">Customer Support</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight">Submit your complaint</h1>
          <p className="mt-2 text-muted-foreground">
            Describe your issue below. Our AI support system will analyze it and send a reply to
            your email address — usually within a few minutes.
          </p>
        </div>
      </header>
      <main className="mx-auto max-w-2xl px-6 py-10">
        <CustomerComplaintForm />
        <p className="mt-8 text-center text-xs text-muted-foreground">
          For internal operations, staff use the{" "}
          <a href="/" className="text-primary underline">
            operations dashboard
          </a>
          .
        </p>
      </main>
    </div>
  );
}

