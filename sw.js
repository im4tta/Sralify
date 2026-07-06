// Minimal app-shell cache: makes Sralify installable and usable offline
// once it's been opened at least once. Only same-origin assets are
// precached — CDN libraries (PDF.js etc.) are loaded on demand and cached
// by the browser's normal HTTP cache, not duplicated here.
const CACHE = 'sralify-v3';
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './css/sral.css',
  './js/app.js',
  './js/i18n.js',
  './js/lazy-loader.js',
  './js/pdf-compressor.js',
  './js/image-compressor.js',
  './js/share-card.js',
  './locales/en.json',
  './locales/km.json',
  './assets/favicon-192.png',
  './assets/favicon-512.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(ASSETS)).catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return; // let CDN requests pass through normally

  event.respondWith(
    caches.match(event.request).then((cached) => {
      const network = fetch(event.request)
        .then((resp) => {
          if (resp && resp.status === 200) {
            const clone = resp.clone();
            caches.open(CACHE).then((cache) => cache.put(event.request, clone));
          }
          return resp;
        })
        .catch(() => cached);
      return cached || network;
    })
  );
});
