const CACHE_NAME = "study-flow-v3";
const APP_SHELL = [
  "/",
  "/manifest.webmanifest",
  "/pwa-icon.svg",
  "/studei-icon-32.png",
  "/studei-icon-180.png",
  "/studei-icon-192.png",
  "/studei-icon-512.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))),
    ),
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  const requestUrl = new URL(event.request.url);
  const isAppShellAsset = APP_SHELL.includes(requestUrl.pathname);
  const isNavigation = event.request.mode === "navigate";
  const isSourceOrBuildAsset =
    requestUrl.pathname.startsWith("/src/") ||
    requestUrl.pathname.startsWith("/assets/");

  // Never serve stale app code/HTML on refresh.
  if (isNavigation || isSourceOrBuildAsset) {
    event.respondWith(
      fetch(event.request).catch(() => caches.match(event.request).then((cached) => cached || caches.match("/"))),
    );
    return;
  }

  if (!isAppShellAsset) return;

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;

      return fetch(event.request)
        .then((response) => {
          if (!response || response.status !== 200 || response.type !== "basic") {
            return response;
          }

          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseClone));
          return response;
        })
        .catch(() => caches.match("/"));
    }),
  );
});
