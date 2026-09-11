const CACHE_NAME = "financplantoes-shell-v1";

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("push", (event) => {
  let data = {};

  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { body: event.data?.text() };
  }

  const title = data.title || "FinancPlantões";
  const options = {
    body: data.body || "Você tem plantões amanhã.",
    icon: `${self.registration.scope}icons/icon-192.png`,
    badge: `${self.registration.scope}icons/icon-192.png`,
    data: { url: data.url || self.registration.scope },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || self.registration.scope;

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      const client = clients.find((item) => "focus" in item);
      if (client) {
        return client.focus();
      }
      return self.clients.openWindow?.(url);
    }),
  );
});