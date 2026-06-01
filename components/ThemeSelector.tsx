"use client";

import { useApp } from "@/store";
import { Theme } from "@/types";
import { useEffect } from "react";

const themes: { id: Theme; label: string; accent: string; bg: string }[] = [
  { id: "midnight", label: "Midnight", accent: "#a78bfa", bg: "#0d0d14" },
  { id: "forest", label: "Forest", accent: "#4ade80", bg: "#0a120d" },
  { id: "desert", label: "Desert", accent: "#f59e0b", bg: "#12100a" },
  { id: "ocean", label: "Ocean", accent: "#38bdf8", bg: "#050e18" },
  { id: "rose", label: "Rose", accent: "#fb7185", bg: "#120a0e" },
  { id: "mono", label: "Mono", accent: "#1a1a1a", bg: "#f8f7f5" },
];

export default function ThemeSelector({ onClose }: { onClose?: () => void }) {
  const { theme, setTheme } = useApp();

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  const handleTheme = (t: Theme) => {
    setTheme(t);
    document.documentElement.setAttribute("data-theme", t);
    onClose?.();
  };

  return (
    <div
      className="glass rounded-xl p-3 shadow-2xl"
      style={{ background: "var(--color-surface)" }}
    >
      <p className="text-xs mb-2 px-1" style={{ color: "var(--color-text-muted)" }}>Color Theme</p>
      <div className="flex flex-row flex-wrap gap-2">
        {themes.map((t) => (
          <button
            key={t.id}
            onClick={() => handleTheme(t.id)}
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs transition-all"
            style={{
              background: theme === t.id ? "var(--color-surface-2)" : "transparent",
              border: `1px solid ${theme === t.id ? t.accent : "var(--color-border)"}`,
              color: "var(--color-text)",
            }}
            title={t.label}
          >
            <div className="flex gap-0.5">
              <div className="w-3 h-3 rounded-sm" style={{ background: t.bg, border: "1px solid #333" }} />
              <div className="w-3 h-3 rounded-sm" style={{ background: t.accent }} />
            </div>
            <span>{t.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

