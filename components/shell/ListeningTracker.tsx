"use client";
import { useEffect, useRef } from "react";
import { usePlayer, useApp, useToast } from "@/store";

// Headless. Turns playback time into streak + level progress.
//
// It lives in the shell rather than inside the player so the streak
// isn't tied to one component's lifecycle, and so the player doesn't
// grow another responsibility.
const REPORT_MS = 30_000;

export default function ListeningTracker() {
  const playing = usePlayer(s => s.playing);
  const ep = usePlayer(s => s.ep);
  const user = useApp(s => s.user);
  const showToast = useToast(s => s.show);

  // Refs, not state: these change every tick and must not re-render.
  const pending = useRef(0);
  const lastTick = useRef<number | null>(null);

  useEffect(() => {
    if (!playing || !ep || !user) { lastTick.current = null; return; }
    lastTick.current = Date.now();

    const id = setInterval(() => {
      const now = Date.now();
      const elapsed = lastTick.current ? (now - lastTick.current) / 1000 : 0;
      lastTick.current = now;

      // Browsers throttle timers in background tabs, so a "30 second"
      // interval can fire after ten minutes. Crediting that whole gap
      // as listening would be wrong, so it's capped near one interval.
      pending.current += Math.min(elapsed, REPORT_MS / 1000 + 5);

      if (pending.current >= REPORT_MS / 1000) {
        const secs = Math.round(pending.current);
        pending.current = 0;

        fetch(`/api/users/${user._id}/gamification`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ seconds: secs }),
        })
          .then(r => r.json())
          .then(d => {
            if (d?.checkedIn) {
              showToast(`🔥 Day ${d.streak} streak · +${d.coinsAwarded} coins`, "success");
            }
          })
          .catch(() => { /* decorative — never interrupt playback */ });
      }
    }, REPORT_MS);

    return () => { clearInterval(id); lastTick.current = null; };
  }, [playing, ep?._id, user?._id, showToast]);

  return null;
}
