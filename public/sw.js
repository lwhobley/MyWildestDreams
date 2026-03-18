/**
 * My Wildest Dreams — Service Worker
 * Strategy: Cache-first for assets, Network-first for API calls
 */

const CACHE_NAME = 'mwd-v1';
const STATIC_CACHE = 'mwd-static-v1';
const DYNAMIC_CACHE = 'mwd-dynamic-v1';

// Assets to pre-cache on install
const PRECACHE_URLS = [
  '/',
  '/capture',
  '/library',
  '/offline',
  '/manifest.json',
];

// Never cache these
const NEVER_CACHE = [
  'supabase.co',
  'stripe.com',
  'api.openai.com',
  'runwayml.com',
];

// ─── Install ──────────────────────────────────────────────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      return cache.addAll(PRECACHE_URLS);
    }).then(() => self.skipWaiting())
  );
});

// ─── Activate — clean old caches ─────────────────────────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== STATIC_CACHE && key !== DYNAMIC_CACHE)
          .map((key) => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

// ─── Fetch — routing strategy ─────────────────────────────────────────────────
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET and external API calls
  if (request.method !== 'GET') return;
  if (NEVER_CACHE.some((domain) => url.hostname.includes(domain))) return;
  if (url.protocol === 'chrome-extension:') return;

  // Network-first for navigation (always fresh HTML)
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((res) => {
          const clone = res.clone();
          caches.open(DYNAMIC_CACHE).then((cache) => cache.put(request, clone));
          return res;
        })
        .catch(() =>
          caches.match(request).then((cached) => cached || caches.match('/offline'))
        )
    );
    return;
  }

  // Cache-first for static assets (JS, CSS, fonts, images)
  if (
    url.pathname.match(/\.(js|css|woff2?|ttf|png|jpg|jpeg|svg|ico|webp)$/)
  ) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((res) => {
          const clone = res.clone();
          caches.open(STATIC_CACHE).then((cache) => cache.put(request, clone));
          return res;
        });
      })
    );
    return;
  }

  // Default: network with dynamic cache fallback
  event.respondWith(
    fetch(request)
      .then((res) => {
        const clone = res.clone();
        caches.open(DYNAMIC_CACHE).then((cache) => cache.put(request, clone));
        return res;
      })
      .catch(() => caches.match(request))
  );
});

// ─── Push Notifications ───────────────────────────────────────────────────────
self.addEventListener('push', (event) => {
  if (!event.data) return;

  const data = event.data.json();
  event.waitUntil(
    self.registration.showNotification(data.title || 'My Wildest Dreams', {
      body: data.body || "Your dream is ready to be captured.",
      icon: '/icons/icon-192x192.png',
      badge: '/icons/icon-72x72.png',
      vibrate: [100, 50, 100],
      data: { url: data.url || '/capture' },
      actions: [
        { action: 'capture', title: '🎙️ Record Now' },
        { action: 'dismiss', title: 'Later' },
      ],
    })
  );
});

// ─── Notification Click ───────────────────────────────────────────────────────
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const url = event.action === 'capture'
    ? '/capture'
    : event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url === url && 'focus' in client) return client.focus();
      }
      return clients.openWindow(url);
    })
  );
});

// ─── Background Sync (queue dream saves when offline) ────────────────────────
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-dreams') {
    event.waitUntil(syncPendingDreams());
  }
});

async function syncPendingDreams() {
  // Reads from IndexedDB pending queue, retries Supabase upload
  // Full implementation in src/lib/offlineQueue.ts
  const cache = await caches.open(DYNAMIC_CACHE);
  const keys = await cache.keys();
  const pendingKeys = keys.filter(k => k.url.includes('/pending-dreams/'));

  for (const key of pendingKeys) {
    const response = await cache.match(key);
    if (response) {
      const data = await response.json();
      try {
        await fetch('/api/sync-dream', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        });
        await cache.delete(key);
      } catch {
        // Will retry on next sync event
      }
    }
  }
}
