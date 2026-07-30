"use client";
import { useSyncExternalStore } from "react";

// Matches the 768px breakpoint the rest of the app already uses in
// app/globals.css, so JS-driven and CSS-driven layout decisions can
// never disagree about what "mobile" means.
export const MOBILE_BREAKPOINT = 768;

const QUERY = `(max-width:${MOBILE_BREAKPOINT}px)`;

function subscribe(onChange: () => void) {
  if (typeof window === "undefined") return () => {};
  const mql = window.matchMedia(QUERY);
  mql.addEventListener("change", onChange);
  return () => mql.removeEventListener("change", onChange);
}

function getSnapshot() {
  return window.matchMedia(QUERY).matches;
}

// The server has no viewport, so it renders the desktop tree. On a
// phone the client immediately corrects to mobile during hydration.
// useSyncExternalStore (rather than useEffect + useState) is what keeps
// React from warning about the mismatch, and means there's exactly one
// re-render rather than a flash of the wrong layout on every resize.
function getServerSnapshot() {
  return false;
}

export function useIsMobile(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
