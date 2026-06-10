"use client";
import { useEffect } from "react";
import { useApp } from "@/store";
export default function ThemeInit() {
  const { theme } = useApp();
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);
  return null;
}
