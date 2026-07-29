"use client";
import { useApp } from "@/store";

// Wraps fetch for creator mutation calls (posting your own series,
// episodes, and Shorts), attaching the logged-in user's id so the
// server can check ownership. See lib/requireUser.ts for the
// server-side half of this check. Mirrors lib/adminFetch.ts, which
// does the same thing for the admin allow-list.
export function creatorFetch(url: string, options: RequestInit = {}) {
  const userId = useApp.getState().user?._id || "";
  return fetch(url, {
    ...options,
    headers: {
      ...(options.headers || {}),
      "x-user-id": userId,
    },
  });
}
