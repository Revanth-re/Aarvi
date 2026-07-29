"use client";
import { useEffect, useRef } from "react";
import { usePlayer, useApp } from "@/store";
import { useGamification } from "@/lib/useGamification";

// Headless component. Watches the shared player state and reports
// listening time to the gamification endpoint, which is what advances
// the daily streak, accumulates hours toward the listener level, and
// unlocks badges.
//
// It lives in ClientRoot rather than inside MiniPlayer so the Shorts
// feed (which owns its own <audio> element) isn't the only thing that
// can move the streak, and so MiniPlayer's already-large component
// doesn't grow another responsibility.

const REPORT_INTERVAL_MS = 30_000;

export default function ListeningTracker() {
  const playing = usePlayer(s => s.playing);
  const ep = usePlayer(s => s.ep);
  const user = useApp(s => s.user);
  const { heartbeat } = useGamification();

  // Seconds played but not yet reported. A ref (not state) because
  // updating it must not trigger a re-render 30 times a minute.
  const pending = useRef(0);
  const lastTick = useRef<number | null>(null);

  useEffect(() => {
    if (!playing || !ep || !user) {
      lastTick.current = null;
      return;
    }

    lastTick.current = Date.now();

    const id = setInterval(() => {
      const now = Date.now();
      const elapsed = lastTick.current ? (now - lastTick.current) / 1000 : 0;
      lastTick.current = now;

      // Guard against a backgrounded tab: browsers throttle timers, so
      // a "30 second" interval can fire after 10 minutes. Crediting
      // that whole gap as listening would be wrong — cap it at roughly
      // one interval's worth.
      pending.current += Math.min(elapsed, REPORT_INTERVAL_MS / 1000 + 5);

      if (pending.current >= REPORT_INTERVAL_MS / 1000) {
        const secs = Math.round(pending.current);
        pending.current = 0;
        heartbeat(secs);
      }
    }, REPORT_INTERVAL_MS);

    return () => {
      clearInterval(id);
      lastTick.current = null;
    };
  }, [playing, ep?._id, user?._id, heartbeat]);

  // Flush whatever's left when playback stops, so a 25-second listen
  // still counts toward the day's check-in.
  useEffect(() => {
    if (playing) return;
    if (pending.current >= 5) {
      const secs = Math.round(pending.current);
      pending.current = 0;
      heartbeat(secs);
    }
  }, [playing, heartbeat]);

  return null;
}
