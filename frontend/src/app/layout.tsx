import type { Metadata } from "next";
import { AppShell } from "@/components/app-shell";
import "./globals.css";

export const metadata: Metadata = {
  title: "Ascent Platform",
  description: "Enterprise Autonomous Operations",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
