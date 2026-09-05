const CACHE = 'maker-services-v22';
const ASSETS = [
  './manifest.json',
  './icon-192.svg',
  './icon-512.svg'
];

// Install: cache static assets only (not index.html)
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(cache => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

// Activate: clean up old caches
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch strategy:
// index.html → network-first (always try to get latest, fall back to cache)
// everything else → cache-first
self.addEventListener('fetch', e => {
  if(e.request.method !== 'GET') return;
  const url = new URL(e.request.url);
  const isIndex = url.pathname === '/' || url.pathname.endsWith('/index.html') || url.pathname.endsWith('/maker-services/');

  if(isIndex){
    // network-first for the app shell
    e.respondWith(
      fetch(e.request).then(response => {
        const clone = response.clone();
        caches.open(CACHE).then(cache => cache.put(e.request, clone));
        return response;
      }).catch(() => caches.match(e.request))
    );
  } else {
    // cache-first for assets
    e.respondWith(
      caches.match(e.request).then(cached => {
        if(cached) return cached;
        return fetch(e.request).then(response => {
          if(response && response.status === 200){
            const clone = response.clone();
            caches.open(CACHE).then(cache => cache.put(e.request, clone));
          }
          return response;
        });
      })
    );
  }
});
