import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      // Single standard font everywhere — "display" and "body" both
      // alias the same sans stack now (no separate logo/wordmark font).
      fontFamily: {
        display: ["var(--ff-sans)", "sans-serif"],
        body: ["var(--ff-sans)", "sans-serif"],
        mono: ["var(--font-mono)", "monospace"],
      },
      colors: {
        accent:         "var(--color-accent)",
        "accent-2":     "var(--color-accent-2)",
        surface:        "var(--color-surface)",
        "surface-2":    "var(--color-surface-2)",
        border:         "var(--color-border)",
        "text-base":    "var(--color-text)",
        "text-muted":   "var(--color-text-muted)",
        bg:             "var(--color-bg)",
      },
      animation: {
        "spin-slow":    "spin 3s linear infinite",
        "equalizer":    "equalizerAnim 0.6s ease-in-out infinite alternate",
      },
    },
  },
  plugins: [],
};
export default config;
