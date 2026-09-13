const CACHE = 'lincsafe-v7';
const ASSETS = ['./', './index.html', './manifest.json', './icon-192.png', './icon-512.png',
  './icon-192-maskable.png', './icon-512-maskable.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  // HTML-pagina's: eerst netwerk proberen zodat updates direct zichtbaar zijn,
  // met de cache als offline-fallback.
  if (e.request.mode === 'navigate' || e.request.destination === 'document') {
    e.respondWith(
      fetch(e.request)
        .then(r => { caches.open(CACHE).then(c => c.put(e.request, r.clone())); return r; })
        .catch(() => caches.match(e.request).then(r => r || caches.match('./index.html')))
    );
    return;
  }
  // Afbeeldingen uit de images/ map: cache-first, bij miss ophalen en cachen.
  if (e.request.url.includes('/images/')) {
    e.respondWith(
      caches.match(e.request).then(r => {
        if (r) return r;
        return fetch(e.request).then(nr => {
          caches.open(CACHE).then(c => c.put(e.request, nr.clone()));
          return nr;
        }).catch(() => new Response('', { status: 404 }));
      })
    );
    return;
  }
  // Overige assets (iconen, manifest): cache-first, met netwerk als fallback.
  e.respondWith(
    caches.match(e.request).then(r => r || fetch(e.request))
  );
});
