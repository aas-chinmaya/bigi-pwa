const V = "biginex-v1";
const STATIC = V + "-static";
self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(STATIC).then((c) => c.addAll(["/manifest.webmanifest", "/offline.html"])).then(() => self.skipWaiting()));
});
self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(
    ks.filter((k) => (k.startsWith("invoiceflow-v") || k.startsWith("biginex-v")) && k !== STATIC).map((k) => caches.delete(k))
  )).then(() => self.clients.claim()));
});
self.addEventListener("message", (e) => {
  if (e.data?.type === "CLEAR_APP_CACHE") {
    e.waitUntil(caches.open(STATIC).then(async (cache) => {
      const requests = await cache.keys();
      await Promise.all(requests.filter((request) => {
        const pathname = new URL(request.url).pathname;
        return pathname.startsWith("/invoices") || pathname.startsWith("/business");
      }).map((request) => cache.delete(request)));
    }));
  }
});
self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  const isNavigation = req.mode === "navigate";
  const isRsc = req.headers.get("RSC") === "1" || req.headers.get("Accept")?.includes("text/x-component");
  if (isNavigation || isRsc) {
    e.respondWith(fetch(req).then((res) => {
      if (res.ok) {
        const copy = res.clone();
        void caches.open(STATIC).then((c) => c.put(req, copy)).catch((error) => {
          console.error("Could not cache app page", error);
        });
      }
      return res;
    }).catch(async () => {
      const cached = await caches.open(STATIC).then((c) => c.match(req));
      if (cached) return cached;
      if (isNavigation) {
        const offlinePage = new URL("/offline.html", self.location.origin).toString();
        return caches.open(STATIC).then((c) => c.match(offlinePage));
      }
      return new Response("This page is not available offline yet.", {
        status: 503,
        headers: { "Content-Type": "text/plain; charset=utf-8" },
      });
    }));
    return;
  }
  if (url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/icons/")) {
    e.respondWith(caches.open(STATIC).then((c) => c.match(req)).then((h) => h || fetch(req).then((res) => {
      if (res.ok) { const c = res.clone(); caches.open(STATIC).then((x) => x.put(req, c)); }
      return res;
    })).catch((error) => {
      console.error("Could not load cached app asset", error);
      return new Response("App asset unavailable offline", { status: 503 });
    }));
  }
});
