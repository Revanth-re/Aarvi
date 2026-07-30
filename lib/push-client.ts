"use client";

// Client-side half of Web Push — registering the service worker,
// asking for permission, and telling the server which device to send
// to. Server side lives in lib/push.ts + app/api/push/subscribe.

export function pushSupported(): boolean {
  return typeof window !== "undefined"
    && "serviceWorker" in navigator
    && "PushManager" in window
    && "Notification" in window;
}

// Shared with InstallPrompt.tsx and SettingsScreen.tsx so the two
// "why isn't this working on my phone" explanations (install nudge,
// push toggle) agree with each other instead of drifting.
export function isIOS(): boolean {
  if (typeof navigator === "undefined") return false;
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

export function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia?.("(display-mode: standalone)").matches
    || (window.navigator as unknown as { standalone?: boolean }).standalone === true;
}

// The Push API wants the VAPID public key as a Uint8Array, not the
// base64url string it's normally shared as.
function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(b64);
  const arr = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
  return arr;
}

export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!pushSupported()) return null;
  try {
    return await navigator.serviceWorker.register("/sw.js");
  } catch {
    return null;
  }
}

/** Returns true if permission was granted and the subscription saved. */
export async function enablePush(userId: string): Promise<boolean> {
  if (!pushSupported()) return false;
  const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  if (!vapidKey) return false; // not configured server-side either — nothing to subscribe to

  const permission = await Notification.requestPermission();
  if (permission !== "granted") return false;

  const reg = await registerServiceWorker();
  if (!reg) return false;

  const sub = await reg.pushManager.subscribe({
    userVisibleOnly: true,
    // The DOM lib's BufferSource type is fussy about ArrayBuffer vs.
    // SharedArrayBuffer generics; a plain Uint8Array is exactly what
    // the Push API expects at runtime regardless.
    applicationServerKey: urlBase64ToUint8Array(vapidKey) as unknown as BufferSource,
  });

  await fetch("/api/push/subscribe", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId, subscription: sub.toJSON() }),
  });

  return true;
}

export async function disablePush(userId: string): Promise<void> {
  if (!pushSupported()) return;
  try {
    const reg = await navigator.serviceWorker.getRegistration();
    const sub = await reg?.pushManager.getSubscription();
    if (!sub) return;

    await fetch("/api/push/subscribe", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, endpoint: sub.endpoint }),
    });
    await sub.unsubscribe();
  } catch {
    // Best-effort — worst case the subscription lingers server-side and
    // gets pruned automatically the next time a push to it 404s/410s.
  }
}
