const CACHE_NAME = 'ielts-vocab-v5';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './manifest.json',
  './css/variables.css',
  './css/base.css',
  './css/components.css',
  './css/screens.css',
  './css/animations.css',
  './js/app.js',
  'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap',
  'https://cdn.jsdelivr.net/npm/dexie@4/dist/dexie.min.js'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS_TO_CACHE))
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.filter(name => name !== CACHE_NAME)
          .map(name => caches.delete(name))
      );
    })
  );
  self.clients.claim();
});

// Network-first for our own files so a new deploy always wins; the cache is
// only a fallback when offline. Cross-origin (fonts, CDN) stays cache-first.
self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  const sameOrigin = url.origin === self.location.origin;

  // Only these third parties are static enough to cache. Anything else —
  // notably the sync API — must go straight to the network, or a stale
  // cached response would silently roll progress back.
  const CACHEABLE_HOSTS = ['fonts.googleapis.com', 'fonts.gstatic.com', 'cdn.jsdelivr.net'];
  if (!sameOrigin && !CACHEABLE_HOSTS.includes(url.hostname)) return;

  if (sameOrigin) {
    // 'no-cache' forces a conditional request, so the browser's own HTTP
    // cache (GitHub Pages sends max-age=600) can never mask a new deploy.
    const fresh = new Request(req.url, {
      cache: 'no-cache',
      credentials: 'same-origin',
      headers: req.headers,
      mode: req.mode === 'navigate' ? 'same-origin' : req.mode,
      redirect: 'follow'
    });
    event.respondWith(
      fetch(fresh)
        .then(response => {
          if (response && response.status === 200) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(req, copy));
          }
          return response;
        })
        .catch(() => caches.match(req).then(hit => hit || caches.match('./index.html')))
    );
    return;
  }

  event.respondWith(
    caches.match(req).then(hit => hit || fetch(req).then(response => {
      if (response && response.status === 200) {
        const copy = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(req, copy));
      }
      return response;
    }))
  );
});
