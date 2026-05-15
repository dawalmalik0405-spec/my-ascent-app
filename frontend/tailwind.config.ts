import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
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
    },
  },
  plugins: [],
};

export default config;
