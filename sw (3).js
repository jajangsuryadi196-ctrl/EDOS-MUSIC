// EDOS MUSIC Service Worker
// Versi cache — naikkan angka ini setiap kali update app
const CACHE_NAME = 'edosmusic-v1';

// File yang di-cache untuk offline
const ASSETS_TO_CACHE = [
  './EDOSMUSIC.html',
  './manifest.json'
];

// Install: cache semua aset utama
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

// Activate: hapus cache lama
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

// Fetch: Cache-first strategy untuk aset lokal, Network-first untuk API
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Skip untuk Google API dan request non-GET
  if (event.request.method !== 'GET') return;
  if (url.hostname.includes('google') || url.hostname.includes('googleapis')) return;
  if (url.hostname.includes('anthropic')) return;

  // Untuk file HTML dan manifest: Network-first (selalu ambil terbaru jika online)
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

  // Untuk aset lain: Cache-first
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
        // Offline fallback
        return new Response('Offline - EDOSMUSIC tidak tersedia tanpa koneksi internet', {
          headers: { 'Content-Type': 'text/plain' }
        });
      })
  );
});

// Background sync untuk saat offline
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-music') {
    console.log('[SW] Background sync triggered');
  }
});

// Push notification support
self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : {};
  self.registration.showNotification(data.title || 'EDOS MUSIC', {
    body: data.body || 'Ada lagu baru!',
    icon: './icon-192.png',
    badge: './icon-192.png'
  });
});
