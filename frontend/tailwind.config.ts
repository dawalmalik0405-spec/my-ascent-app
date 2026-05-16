import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
      },
      colors: {
        border: "hsl(var(--border))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        destructive: "hsl(var(--destructive))",
        success: "hsl(var(--success))",
        warning: "hsl(var(--warning))",
      },
      borderRadius: {
        xl: "calc(var(--radius-lg) + 4px)",
        "2xl": "calc(var(--radius-lg) + 8px)",
      },
      boxShadow: {
        glow: "0 0 60px -15px hsl(var(--primary) / 0.45)",
        card: "0 25px 50px -25px hsl(var(--foreground) / 0.12)",
      },
      keyframes: {
        "agent-icon-nudge": {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-2px)" },
        },
        "shimmer-bar": {
          "0%": { opacity: "0.45", transform: "scaleX(0.6)" },
          "50%": { opacity: "1", transform: "scaleX(1)" },
          "100%": { opacity: "0.45", transform: "scaleX(0.6)" },
        },
        "flow-dot": {
          "0%": { transform: "translateX(0)", opacity: "0.2" },
          "40%": { opacity: "1" },
          "100%": { transform: "translateX(220%)", opacity: "0.2" },
        },
        "feed-line": {
          "0%": { opacity: "0", transform: "translateX(-6px)" },
          "100%": { opacity: "1", transform: "translateX(0)" },
        },
      },
      animation: {
        "agent-icon-nudge": "agent-icon-nudge 2.2s ease-in-out infinite",
        "shimmer-bar": "shimmer-bar 1.4s ease-in-out infinite",
        "flow-dot": "flow-dot 1.1s linear infinite",
        "feed-line": "feed-line 0.45s ease-out forwards",
      },
    },
  },
  plugins: [],
};

export default config;
