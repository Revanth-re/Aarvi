"use client";
import { useApp } from "@/store";

// Wraps fetch for admin mutation calls, attaching the logged-in user's email
// so the server can check it against the admin allow-list. See lib/admin.ts
// and lib/requireAdmin.ts for the server-side half of this check.
export function adminFetch(url: string, options: RequestInit = {}) {
  const email = useApp.getState().user?.email || "";
  return fetch(url, {
    ...options,
    headers: {
      ...(options.headers || {}),
      "x-user-email": email,
    },
  });
}
