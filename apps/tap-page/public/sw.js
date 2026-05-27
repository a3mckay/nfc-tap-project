// Minimal TapShelf service worker.
// Registers a fetch handler so Chrome fires beforeinstallprompt,
// enabling the native "Add to Home Screen" prompt on Android.
// Assets: cache-first for static files, network-first for pages.

const CACHE = "tapshelf-v1";
const STATIC_EXTS = /\.(?:js|css|woff2?|png|jpg|jpeg|webp|svg|ico)$/;

self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Only handle same-origin GET requests
  if (request.method !== "GET" || url.origin !== self.location.origin) return;

  // Auth routes: always network (never cache tokens)
  if (url.pathname.startsWith("/auth/")) return;

  if (STATIC_EXTS.test(url.pathname)) {
    // Static assets: cache-first
    event.respondWith(
      caches.match(request).then(
        (cached) => cached ?? fetch(request).then((res) => {
          if (res.ok) {
            const clone = res.clone();
            caches.open(CACHE).then((c) => c.put(request, clone));
          }
          return res;
        })
      )
    );
  } else {
    // Pages: network-first, fall back to cache
    event.respondWith(
      fetch(request)
        .then((res) => {
          if (res.ok) {
            const clone = res.clone();
            caches.open(CACHE).then((c) => c.put(request, clone));
          }
          return res;
        })
        .catch(() => caches.match(request))
    );
  }
});
