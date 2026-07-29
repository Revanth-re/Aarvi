"use client";
import { useCallback, useEffect, useState } from "react";
import { useApp, useToast } from "@/store";
import { Gamification, BadgeDef } from "@/types";
import { BADGE_BY_KEY } from "@/lib/gamification";

// Client-side access to streak / coins / level / badges.
//
// Two things live here so no screen has to reimplement them:
//   • `refresh()` — a plain read, used by Home and Profile.
//   • `heartbeat(seconds)` — reports listening time, which is what
//     actually advances the streak and unlocks badges. Any newly
//     earned badge gets toasted once, here, rather than in five
//     different components.

export function useGamification() {
  const user = useApp(s => s.user);
  const showToast = useToast(s => s.show);

  const [data, setData] = useState<Gamification | null>(null);
  const [catalog, setCatalog] = useState<BadgeDef[]>([]);

  const userId = user?._id;

  // Bumping this re-runs the fetch effect. Callers get `refresh()`,
  // which just increments it — that keeps the actual fetch (and its
  // setState calls) inside the effect, instead of in a callback the
  // effect invokes synchronously.
  const [reloadKey, setReloadKey] = useState(0);
  const refresh = useCallback(() => setReloadKey(k => k + 1), []);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;

    fetch(`/api/users/${userId}/gamification`)
      .then(r => r.json())
      .then(d => {
        if (cancelled) return;
        if (d.gamification) setData(d.gamification);
        if (Array.isArray(d.catalog)) setCatalog(d.catalog);
      })
      .catch(() => {
        // Silent: gamification is decorative. A network blip here should
        // never surface an error over whatever the user is listening to.
      });

    return () => { cancelled = true; };
  }, [userId, reloadKey]);

  // Both derived, not stored. Keeping `loading` as state would mean a
  // setState in the effect body before the first await, which causes a
  // cascading render — and it's redundant anyway, since "no data yet
  // but we do have a user" is exactly what loading means here.
  const visible = userId ? data : null;
  const loading = !!userId && data === null;

  const heartbeat = useCallback(async (seconds: number) => {
    if (!userId || seconds <= 0) return;
    try {
      const r = await fetch(`/api/users/${userId}/gamification`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ seconds }),
      });
      const d = await r.json();
      if (d.gamification) setData(d.gamification);

      if (d.checkedIn && d.gamification) {
        showToast(`🔥 Day ${d.gamification.streak} streak! +${d.coinsAwarded} coins`, "success");
      }
      for (const key of (d.newBadges ?? [])) {
        const def = BADGE_BY_KEY[key];
        if (def) showToast(`🏅 Badge unlocked — ${def.name}`, "success");
      }
    } catch { /* see note in refresh() */ }
  }, [userId, showToast]);

  return { data: visible, catalog, loading, refresh, heartbeat };
}
