// SWARA FM service worker — handles Web Push AND gives the app real
// (if modest) offline behavior: navigations fall back to a friendly
// offline page instead of the browser's default error, and the icons
// PWABuilder/Android look for are pre-cached so installability checks
// pass. Deliberately does NOT cache API responses, uploaded media, or
// hashed Next.js build assets — those are either auth-sensitive,
// large, or must always come from the network to avoid stale bundles
// after a deploy.

const CACHE = "swara-shell-v1";
const SHELL_ASSETS = [
  "/offline.html",
  "/icon-192.png",
  "/icon-512.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE)
      .then((cache) => cache.addAll(SHELL_ASSETS))
      .catch(() => {}) // best-effort — a failed precache shouldn't block install
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return; // never intercept mutations

  // Page navigations: go to the network first (always want fresh
  // content/auth state); only fall back to the cached offline page if
  // that fails, i.e. no connection at all.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(() => caches.match("/offline.html"))
    );
    return;
  }

  // The app's own icons: cache-first, since they never change without
  // a new filename/version.
  const url = new URL(request.url);
  if (url.origin === self.location.origin && SHELL_ASSETS.includes(url.pathname)) {
    event.respondWith(
      caches.match(request).then((cached) => cached || fetch(request))
    );
  }

  // Everything else (API calls, audio, uploaded images, JS/CSS
  // bundles) is intentionally left to the network, untouched.
});

// The server (lib/push.ts) sends a JSON payload: { title, body, url }.
self.addEventListener("push", (event) => {
  let data = { title: "SWARA FM", body: "You have a new notification", url: "/" };
  try {
    if (event.data) data = { ...data, ...event.data.json() };
  } catch {
    // Fall back to the default above if the payload isn't valid JSON.
  }

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: "/icon-192.png",
      badge: "/icon-192.png",
      data: { url: data.url },
      tag: data.url, // stacking multiple pushes from the same thread replaces, not piles up
    })
  );
});

// Tapping the notification focuses an already-open tab if there is
// one, otherwise opens a new one at the relevant page.
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/";

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if ("focus" in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      return self.clients.openWindow(url);
    })
  );
});
