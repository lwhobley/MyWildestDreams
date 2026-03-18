/**
 * My Wildest Dreams — Service Worker v2
 * Caching + Push Notifications + Background Sync
 */

const STATIC_CACHE  = 'mwd-static-v2';
const DYNAMIC_CACHE = 'mwd-dynamic-v2';

const PRECACHE_URLS = ['/', '/capture', '/library', '/offline.html', '/manifest.json'];

const NEVER_CACHE = ['supabase.co', 'stripe.com', 'api.openai.com', 'runwayml.com'];

// ─── Install ──────────────────────────────────────────────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then(cache => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting()),
  );
});

// ─── Activate ─────────────────────────────────────────────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys
          .filter(k => k !== STATIC_CACHE && k !== DYNAMIC_CACHE)
          .map(k => caches.delete(k)),
      ))
      .then(() => self.clients.claim()),
  );
});

// ─── Fetch ────────────────────────────────────────────────────────────────────
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (request.method !== 'GET') return;
  if (NEVER_CACHE.some(d => url.hostname.includes(d))) return;
  if (url.protocol === 'chrome-extension:') return;

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then(res => { cacheResponse(request, res.clone()); return res; })
        .catch(() => caches.match(request).then(c => c || caches.match('/offline.html'))),
    );
    return;
  }

  if (/\.(js|css|woff2?|ttf|png|jpg|jpeg|svg|ico|webp)$/.test(url.pathname)) {
    event.respondWith(
      caches.match(request).then(cached => {
        if (cached) return cached;
        return fetch(request).then(res => { cacheResponse(request, res.clone()); return res; });
      }),
    );
    return;
  }

  event.respondWith(
    fetch(request)
      .then(res => { cacheResponse(request, res.clone()); return res; })
      .catch(() => caches.match(request)),
  );
});

async function cacheResponse(request, response) {
  const cache = await caches.open(DYNAMIC_CACHE);
  cache.put(request, response);
}

// ─── Push Notifications ───────────────────────────────────────────────────────
self.addEventListener('push', (event) => {
  if (!event.data) return;

  let payload;
  try {
    payload = event.data.json();
  } catch {
    payload = { title: 'My Wildest Dreams', body: event.data.text() };
  }

  const {
    title    = 'My Wildest Dreams 🌙',
    body     = "Your dream is ready to be captured.",
    icon     = '/icons/icon-192x192.png',
    badge    = '/icons/icon-72x72.png',
    image,
    url      = '/capture',
    actions  = [{ action: 'open', title: 'Open' }],
    tag      = 'mwd-default',
    vibrate  = [100, 50, 100],
    renotify = false,
    requireInteraction = false,
  } = payload;

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon,
      badge,
      image,
      data: { url },
      actions,
      tag,
      vibrate,
      renotify,
      requireInteraction,
      silent: false,
    }),
  );
});

// ─── Notification Click ───────────────────────────────────────────────────────
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  let targetUrl = event.notification.data?.url || '/';

  // Handle action buttons
  if (event.action === 'capture') targetUrl = '/capture';
  else if (event.action === 'watch')   targetUrl = event.notification.data?.url || '/library';
  else if (event.action === 'library') targetUrl = '/library';
  else if (event.action === 'dismiss') return; // just close

  event.waitUntil(
    clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then(clientList => {
        // Focus existing tab if open
        for (const client of clientList) {
          if (new URL(client.url).pathname === new URL(targetUrl, self.location.origin).pathname) {
            return client.focus();
          }
        }
        // Otherwise open new tab
        return clients.openWindow(targetUrl);
      }),
  );
});

// ─── Notification Close (analytics hook) ─────────────────────────────────────
self.addEventListener('notificationclose', (event) => {
  const { tag } = event.notification;
  // Can send dismissed event to analytics endpoint here
  console.log('[SW] Notification dismissed:', tag);
});

// ─── Background Sync ──────────────────────────────────────────────────────────
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-dreams') {
    event.waitUntil(syncPendingDreams());
  }
});

async function syncPendingDreams() {
  const cache = await caches.open(DYNAMIC_CACHE);
  const keys  = await cache.keys();
  const pendingKeys = keys.filter(k => k.url.includes('/pending-dreams/'));

  for (const key of pendingKeys) {
    const response = await cache.match(key);
    if (!response) continue;
    try {
      const data = await response.json();
      const res  = await fetch('/api/sync-dream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (res.ok) await cache.delete(key);
    } catch {
      // Retry on next sync
    }
  }
}

// ─── Push subscription change ─────────────────────────────────────────────────
self.addEventListener('pushsubscriptionchange', (event) => {
  // Re-subscribe and sync new subscription to server
  event.waitUntil(
    self.registration.pushManager.subscribe({ userVisibleOnly: true })
      .then(sub => fetch('/api/push-resubscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sub),
      })),
  );
});
