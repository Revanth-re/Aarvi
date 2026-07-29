"use client";
import { usePathname } from "next/navigation";
import BottomNav from "./BottomNav";
import ToastHost from "./ToastHost";
import ThemeSync from "./ThemeSync";
import SettingsSync from "./SettingsSync";
import Player from "./Player";
import ListeningTracker from "./ListeningTracker";

export default function ClientRoot({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const isAdmin = path.startsWith("/admin");

  return (
    <>
      <ThemeSync/>
      <SettingsSync/>
      <div className={isAdmin ? "app-frame admin-root" : "app-frame"}>
        {children}
      </div>
      {!isAdmin && (
        <>
          <Player/>
          <BottomNav/>
          {/* Headless — turns playback time into streak progress. */}
          <ListeningTracker/>
        </>
      )}
      <ToastHost/>
    </>
  );
}
