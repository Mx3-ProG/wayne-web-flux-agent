const CACHE_NAME = "wayne-flux-shell-v2";
const OFFLINE_URL = "/offline.html";

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      cache.addAll([OFFLINE_URL, "/flux-symbol-light.png"]),
    ),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key.startsWith("wayne-flux-shell-") && key !== CACHE_NAME)
          .map((key) => caches.delete(key)),
      ),
    ),
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (event.request.mode !== "navigate") return;

  event.respondWith(
    fetch(event.request).catch(async () => {
      const cache = await caches.open(CACHE_NAME);
      return cache.match(OFFLINE_URL);
    }),
  );
});

// ------------------------------------------------------------------ Web Push
// Payload envoyé par /api/cron/push-deliveries : { title, body, url, type, badge }.
self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (_) {
    data = {};
  }
  const title = data.title || "FLUX";
  const options = {
    body: data.body || "",
    icon: "/flux-symbol-light.png",
    badge: "/flux-symbol-light.png",
    tag: data.type || undefined,
    data: { url: data.url || "/notifications" },
  };
  const tasks = [self.registration.showNotification(title, options)];
  if (typeof data.badge === "number" && "setAppBadge" in self.navigator) {
    tasks.push(
      data.badge > 0
        ? self.navigator.setAppBadge(data.badge).catch(() => {})
        : self.navigator.clearAppBadge().catch(() => {}),
    );
  }
  event.waitUntil(Promise.all(tasks));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || "/notifications";
  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          if ("focus" in client) {
            client.navigate(url);
            return client.focus();
          }
        }
        return self.clients.openWindow(url);
      }),
  );
});
