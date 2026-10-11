/* tayyorr.uz — push bildirishnomalar service worker */

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { title: "tayyorr.uz", body: event.data ? event.data.text() : "" };
  }

  const title = data.title || "tayyorr.uz";
  const url = data.url || "/messages";
  const options = {
    body: data.body || "",
    tag: data.tag || url,
    renotify: true,
    icon: "/icon-192.png",
    // Android holat satridagi kichik oq belgi (shaffof fonda oq "T")
    badge: "/badge-96.png",
    data: { url },
  };

  event.waitUntil(
    (async () => {
      // agar shu suhbat oynasi ochiq va ko'rinib tursa — bildirishnoma bermaymiz
      const clientsArr = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });
      const focusedOnThis = clientsArr.some(
        (c) => c.visibilityState === "visible" && c.url.includes(url),
      );
      if (focusedOnThis) return;
      await self.registration.showNotification(title, options);
    })(),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || "/messages";
  event.waitUntil(
    (async () => {
      const all = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });
      for (const c of all) {
        if (c.url.includes(url) && "focus" in c) return c.focus();
      }
      for (const c of all) {
        if ("focus" in c) {
          await c.focus();
          if ("navigate" in c) return c.navigate(url);
        }
      }
      if (self.clients.openWindow) return self.clients.openWindow(url);
    })(),
  );
});
