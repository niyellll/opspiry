const CACHE = "bsm-shell-v3";
self.addEventListener("install", event => { event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(["/", "/logo.svg", "/bsm-logo.png", "/manifest.webmanifest"]))); self.skipWaiting(); });
self.addEventListener("activate", event => { event.waitUntil(caches.keys().then(names => Promise.all(names.filter(name => name !== CACHE).map(name => caches.delete(name))))); self.clients.claim(); });
self.addEventListener("fetch", event => {
  if (event.request.method !== "GET" || new URL(event.request.url).origin !== self.location.origin) return;
  if (event.request.mode === "navigate") {
    event.respondWith(fetch(event.request).catch(() => caches.match("/")));
  }
});