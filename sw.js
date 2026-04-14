// EDOS MUSIC Service Worker
const CACHE_NAME = 'edosmusic-v3';

const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './screenshot-narrow.png',
  './screenshot-wide.png'
];

self.addEventListener('install', (event) => {
  console.log('[SW] Installing...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[SW] Caching app shell');
        return cache.addAll(ASSETS_TO_CACHE);
      })
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  console.log('[SW] Activating...');
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames
          .filter(name => name !== CACHE_NAME)
          .map(name => {
            console.log('[SW] Deleting old cache:', name);
            return caches.delete(name);
          })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  if (event.request.method !== 'GET') return;
  if (url.hostname.includes('google') || url.hostname.includes('googleapis')) return;
  if (url.hostname.includes('anthropic')) return;
  if (url.hostname.includes('youtube') || url.hostname.includes('ytimg')) return;

  if (url.pathname.endsWith('.html') || url.pathname.endsWith('manifest.json')) {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          return response;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then(cached => {
        if (cached) return cached;
        return fetch(event.request).then(response => {
          if (response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          }
          return response;
        });
      })
      .catch(() => {
        return new Response('Offline - EDOSMUSIC tidak tersedia tanpa koneksi internet', {
          headers: { 'Content-Type': 'text/plain' }
        });
      })
  );
});

self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-music') {
    console.log('[SW] Background sync triggered');
  }
});

self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : {};
  self.registration.showNotification(data.title || 'EDOS MUSIC', {
    body: data.body || 'Ada lagu baru!',
    icon: './icon-192.png',
    badge: './icon-192.png'
  });
});
