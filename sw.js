// Version bump on every release makes offline updates predictable.
const CACHE = "berzerk-web-v28";
const ASSETS = [
  "./",
  "./index.html",
  "./style.css",
  "./engine.js",
  "./game.js",
  "./icon.png",
  "./manifest.webmanifest",
  "./assets/sounds/laser.wav",
  "./assets/sounds/robot_hit.wav",
  "./assets/sounds/player_hit.wav",
  "./assets/sounds/room.wav",
  "./assets/sounds/otto.wav",
];
self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(ASSETS)));
  self.skipWaiting();
});
self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((key) => key.startsWith("berzerk-web-") && key !== CACHE)
          .map((key) => caches.delete(key)),
      );
      await self.clients.claim();
    })(),
  );
});
self.addEventListener("fetch", (event) => {
  if (
    event.request.method !== "GET" ||
    new URL(event.request.url).origin !== self.location.origin
  )
    return;
  event.respondWith(
    (async () => {
      // Navigation: prefer the current online page; fall back to cached shell offline.
      if (event.request.mode === "navigate") {
        try {
          const response = await fetch(event.request);
          if (response.ok) {
            const cache = await caches.open(CACHE);
            await cache.put("./index.html", response.clone());
          }
          return response;
        } catch (_) {
          return (await caches.match("./index.html")) || Response.error();
        }
      }
      const cached = await caches.match(event.request);
      if (cached) return cached;
      const response = await fetch(event.request);
      if (response.ok) {
        const cache = await caches.open(CACHE);
        cache.put(event.request, response.clone());
      }
      return response;
    })(),
  );
});
