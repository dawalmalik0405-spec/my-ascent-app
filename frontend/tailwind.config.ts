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
        border: "hsl(217 33% 17%)",
        background: "hsl(222 47% 6%)",
        foreground: "hsl(210 40% 98%)",
        card: "hsl(222 47% 9%)",
        primary: { DEFAULT: "hsl(217 91% 60%)", foreground: "hsl(222 47% 6%)" },
        muted: { DEFAULT: "hsl(217 33% 17%)", foreground: "hsl(215 20% 65%)" },
        destructive: "hsl(0 84% 60%)",
        success: "hsl(142 76% 36%)",
        warning: "hsl(38 92% 50%)",
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
