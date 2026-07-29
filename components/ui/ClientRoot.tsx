"use client";
import { useEffect } from "react";
import { useApp } from "@/store";
import Navbar from "./Navbar";
import MiniPlayer from "./MiniPlayer";
import ToastHost from "./ToastHost";
import BottomNav from "./BottomNav";
import ListeningTracker from "./ListeningTracker";
export default function ClientRoot({ children }: { children: React.ReactNode }) {
  const theme = useApp(s => s.theme);
  useEffect(() => { document.documentElement.setAttribute("data-theme", theme); }, [theme]);
  return (
    <>
      <Navbar/>
      <main style={{ paddingBottom: 80 }}>{children}</main>
      <MiniPlayer/>
      {/* Mobile-only tab bar; hidden above 768px via `.bottom-nav` CSS. */}
      <BottomNav/>
      {/* Headless — turns playback time into streak/badge progress. */}
      <ListeningTracker/>
      <ToastHost/>
    </>
  );
}
