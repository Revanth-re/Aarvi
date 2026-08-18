"use client";
import { useEffect } from "react";
import { usePathname } from "next/navigation";
import BottomNav from "./BottomNav";
import ToastHost from "./ToastHost";
import ThemeSync from "./ThemeSync";
import SettingsSync from "./SettingsSync";
import Player from "./Player";
import ListeningTracker from "./ListeningTracker";
import InstallPrompt from "./InstallPrompt";
import { registerServiceWorker } from "@/lib/push-client";

export default function ClientRoot({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const isAdmin = path.startsWith("/admin");

  // Registered unconditionally on every load — not gated behind the
  // user opting into push. A service worker only counts toward PWA
  // installability (Chrome's beforeinstallprompt, PWABuilder's audit,
  // "Add to Home Screen" everywhere) if it's actually controlling the
  // page, which never happens if registration waits for a Settings
  // toggle nobody's touched yet.
  useEffect(() => {
    registerServiceWorker();
  }, []);

  return (
    <>
      <ThemeSync/>
      <SettingsSync/>
      <div className={isAdmin ? "app-frame admin-root" : "app-frame"}>
        {children}
      </div>
      {!isAdmin && (
        <>
          {/* .dock (see globals.css) stacks these with a real flexbox
              gap on mobile — structurally impossible for them to
              overlap, unlike two independently `position: fixed`
              elements each computing their own offset. */}
          <div className="dock">
            <Player/>
            <BottomNav/>
          </div>
          {/* Headless — turns playback time into streak progress. */}
          <ListeningTracker/>
        </>
      )}
      <ToastHost/>
      {!isAdmin && <InstallPrompt/>}
    </>
  );
}
