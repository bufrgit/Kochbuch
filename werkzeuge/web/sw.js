/* Offline-Unterstützung: erst Netz, bei Funkloch die zuletzt geladene Fassung. */
const CACHE = "kochbuch-v1";
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));
self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  e.respondWith(
    fetch(req).then((res) => {
      if (res.ok && (new URL(req.url).origin === location.origin || req.url.startsWith("https://fonts."))) {
        const kopie = res.clone();
        caches.open(CACHE).then((c) => c.put(req, kopie));
      }
      return res;
    }).catch(() => caches.match(req, { ignoreSearch: true }))
  );
});
