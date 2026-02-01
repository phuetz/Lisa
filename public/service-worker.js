// Lisa AI Service Worker
// Update this version string on each deploy to invalidate old caches
const CACHE_VERSION = 'v2';
const CACHE_NAME = `lisa-cache-${CACHE_VERSION}`;

// Assets to cache for offline use
const assetsToCache = [
  '/',
  '/index.html',
  '/favicon.ico',
  '/manifest.json'
];

// Install event - cache assets (gracefully handle failures)
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        // Use individual add() calls to handle failures gracefully
        return Promise.allSettled(
          assetsToCache.map(url =>
            cache.add(url).catch(err => {
              console.warn(`[SW] Failed to cache ${url}:`, err.message);
            })
          )
        );
      })
      .then(() => self.skipWaiting())
  );
});

// Listen for 'skipWaiting' message from client to activate new SW immediately
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames
          .filter(name => name !== CACHE_NAME)
          .map(name => caches.delete(name))
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch event - serve from cache if available
self.addEventListener('fetch', event => {
  // Skip external URLs - let the browser handle them directly
  // This avoids CSP violations when service worker tries to fetch cross-origin resources
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) {
    return; // Don't intercept, let browser handle normally
  }

  event.respondWith(
    caches.match(event.request)
      .then(response => {
        return response || fetch(event.request);
      })
      .catch(() => {
        // Fallback for offline navigation
        if (event.request.mode === 'navigate') {
          return caches.match('/index.html');
        }
        return null;
      })
  );
});

// Push event - show notification
self.addEventListener('push', event => {
  const data = event.data ? event.data.json() : {};
  
  const title = data.title || 'Lisa AI Notification';
  const options = {
    body: data.body || 'You have a new notification',
    icon: data.icon || '/icon-192x192.png',
    badge: '/badge-96x96.png',
    data: {
      url: data.url || '/'
    },
    actions: data.actions || [],
    timestamp: data.timestamp || Date.now()
  };
  
  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

// Notification click event - focus or open window
self.addEventListener('notificationclick', event => {
  event.notification.close();
  
  const url = event.notification.data.url;
  
  event.waitUntil(
    clients.matchAll({type: 'window'})
      .then(windowClients => {
        // Check if a window is already open
        for (const client of windowClients) {
          if (client.url === url && 'focus' in client) {
            return client.focus();
          }
        }
        // If no window is open, open one
        if (clients.openWindow) {
          return clients.openWindow(url);
        }
      })
  );
});

// Notification close event
self.addEventListener('notificationclose', event => {
  // Analytics or logging could be done here
  console.log('Notification was closed', event.notification);
});
