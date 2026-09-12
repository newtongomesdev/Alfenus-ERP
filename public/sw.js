const CACHE_NAME = "juris-erp-v1";
const STATIC_ASSETS = [
  "/",
  "/favicon.png",
  "/manifest.json",
];

const OFFLINE_PAGE = "/";

// Install: pre-cache static assets
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

// Activate: clean up old caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    })
  );
  self.clients.claim();
});

// Fetch: cache-first for static assets, network-first for API calls
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Network-first for API calls and server actions
  if (
    url.pathname.startsWith("/api/") ||
    request.method !== "GET" ||
    request.headers.get("Next-Router-State-Tree") ||
    request.headers.get("RSC") ||
    request.headers.get("Next-URL")
  ) {
    event.respondWith(
      fetch(request).catch(() => {
        return new Response("Offline", { status: 503 });
      })
    );
    return;
  }

  // Cache-first for static assets and navigation
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      if (cachedResponse) {
        // Return cache, but also update in background
        event.waitUntil(
          fetch(request)
            .then((networkResponse) => {
              if (networkResponse.ok) {
                caches.open(CACHE_NAME).then((cache) => {
                  cache.put(request, networkResponse);
                });
              }
            })
            .catch(() => {})
        );
        return cachedResponse;
      }

      return fetch(request)
        .then((networkResponse) => {
          if (networkResponse.ok) {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, responseClone);
            });
          }
          return networkResponse;
        })
        .catch(() => {
          // Return offline page for navigation requests
          if (request.mode === "navigate") {
            return caches.match(OFFLINE_PAGE);
          }
          return new Response("Offline", { status: 503 });
        });
    })
  );
});
