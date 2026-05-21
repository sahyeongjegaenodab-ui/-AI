const CACHE_NAME = "nodapbot-cache-v2";
const ASSETS_TO_CACHE = [
  "/",
  "/index.html",
  "/manifest.json",
  "/icon.svg",
  "/icon_192.svg",
  "/icon_512.svg"
];

// On install, skip waiting and cache essentials
self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE).catch((err) => {
        console.warn("Pre-caching found minor issues (some routes might run dynamically):", err);
      });
    })
  );
});

// Clean up stale caches and activate client claim
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            return caches.delete(cache);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Intelligent fetch handling: Bypass API routes, database synclists, and third-party APIs
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // Bypass API actions & firebase/firestore transactions to avoid offline locks
  if (
    url.pathname.startsWith("/api") ||
    url.pathname.startsWith("/analyze") ||
    url.pathname.startsWith("/chat") ||
    url.hostname.includes("firebase") ||
    url.hostname.includes("googleapis") ||
    event.request.method !== "GET"
  ) {
    return;
  }

  // Stale-While-Revalidate pattern for standard static file fetches
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      const fetchPromise = fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseToCache);
            });
          }
          return networkResponse;
        })
        .catch((err) => {
          console.log("Fetch failed, servicing cached resource if available:", err);
        });

      return cachedResponse || fetchPromise;
    })
  );
});
