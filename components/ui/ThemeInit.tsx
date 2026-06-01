"use client";
import { useEffect } from "react";
import { useApp } from "@/store";
export default function ThemeInit() {
  const theme = useApp(s => s.theme);
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);
  return null;
}
