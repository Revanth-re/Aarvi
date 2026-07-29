"use client";
import { useEffect } from "react";
import { useApp, resolveTheme } from "@/store";

// Applies the stored palette + mode to <html data-theme>, and — when
// the mode is "system" — keeps following the OS if the user changes it
// while the app is open.
export default function ThemeSync() {
  const themeColor = useApp(s => s.settings.themeColor);
  const themeMode = useApp(s => s.settings.themeMode);

  useEffect(() => {
    const apply = () =>
      document.documentElement.setAttribute("data-theme", resolveTheme(themeColor, themeMode));

    apply();
    if (themeMode !== "system") return;

    const mql = window.matchMedia("(prefers-color-scheme: dark)");
    mql.addEventListener("change", apply);
    return () => mql.removeEventListener("change", apply);
  }, [themeColor, themeMode]);

  return null;
}
