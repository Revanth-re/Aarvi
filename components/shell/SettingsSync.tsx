"use client";
import { useEffect, useRef } from "react";
import { useApp } from "@/store";

// Pushes settings changes to the server in the background so they
// follow the account to other devices.
//
// The local store is the source of truth for the UI — a toggle applies
// instantly and this just catches up. A failed save therefore never
// loses the user's choice, it only fails to sync it, which is the right
// trade for something as low-stakes as a preference.
const DEBOUNCE_MS = 800;

export default function SettingsSync() {
  const user = useApp(s => s.user);
  const settings = useApp(s => s.settings);

  // Skip the very first run: that's the store hydrating from
  // localStorage, not the user changing anything.
  const hydrated = useRef(false);

  useEffect(() => {
    if (!hydrated.current) { hydrated.current = true; return; }
    if (!user) return;

    const t = setTimeout(() => {
      fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user._id, settings }),
      }).catch(() => { /* see note above — local state already applied */ });
    }, DEBOUNCE_MS);

    return () => clearTimeout(t);
  }, [settings, user?._id]);

  return null;
}
