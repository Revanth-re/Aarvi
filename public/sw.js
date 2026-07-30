// SWARA FM service worker — currently only handles Web Push. It
// intentionally does NOT cache pages/assets or intercept fetch(): this
// isn't an offline-mode service worker, just the minimum needed for
// push notifications and PWA installability to work at all (Chrome
// requires an active service worker for beforeinstallprompt to fire).

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

// A passthrough fetch handler — some browsers only count a PWA as
// "installable" once a service worker actually controls fetches, even
// if (like here) it does nothing but hand every request straight to
// the network. No caching/offline behavior is implemented on purpose.
self.addEventListener("fetch", () => {});

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
