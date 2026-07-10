"use client";
import { useEffect } from "react";
import { useApp } from "@/store";
import Navbar from "./Navbar";
import MiniPlayer from "./MiniPlayer";
import ToastHost from "./ToastHost";
export default function ClientRoot({ children }: { children: React.ReactNode }) {
  const theme = useApp(s => s.theme);
  useEffect(() => { document.documentElement.setAttribute("data-theme", theme); }, [theme]);
  return (
    <>
      <Navbar/>
      <main style={{ paddingBottom: 80 }}>{children}</main>
      <MiniPlayer/>
      <ToastHost/>
    </>
  );
}
