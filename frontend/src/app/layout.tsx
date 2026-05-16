import type { Metadata } from "next";
import type { ReactNode } from "react";
import Script from "next/script";
import { Plus_Jakarta_Sans, JetBrains_Mono } from "next/font/google";
import { AppShell } from "@/components/app-shell";
import { ThemeProvider } from "@/context/theme-context";
import "./globals.css";

const sans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const mono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

const themeInitScript = `
(function(){
  try {
    var k = 'aegisops-theme';
    var legacy = 'ascent-theme';
    var t = localStorage.getItem(k) || localStorage.getItem(legacy);
    var r = document.documentElement;
    if (t === 'light') r.classList.remove('dark');
    else if (t === 'dark') r.classList.add('dark');
    else if (window.matchMedia('(prefers-color-scheme: dark)').matches) r.classList.add('dark');
    else r.classList.remove('dark');
  } catch (e) {}
})();
`;

export const metadata: Metadata = {
  title: "AegisOps",
  description: "Defense-grade autonomous operations — incidents, support, research",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className={`${sans.variable} ${mono.variable}`}>
      <body className="min-h-screen font-sans">
        <Script
          id="aegisops-theme-init"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{ __html: themeInitScript }}
        />
        <ThemeProvider>
          <AppShell>{children}</AppShell>
        </ThemeProvider>
      </body>
    </html>
  );
}
