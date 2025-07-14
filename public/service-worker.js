// Lisa AI Service Worker
// Update this version string on each deploy to invalidate old caches
const CACHE_VERSION = 'v2';
const CACHE_NAME = `lisa-cache-${CACHE_VERSION}`;

// Assets to cache for offline use
const assetsToCache = [
  '/',
  '/index.html',
  '/favicon.ico',
  '/manifest.json',
  '/offline.html'
];

// Install event - cache assets
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        return cache.addAll(assetsToCache);
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
  event.respondWith(
    caches.match(event.request).then(cachedResponse => {
      if (cachedResponse) {
        return cachedResponse;
      }

      return fetch(event.request)
        .then(response => {
          if (!response || response.status !== 200 || response.type !== 'basic') {
            return response;
          }

          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, responseToCache);
          });

          return response;
        })
        .catch(() => {
          return (
            caches.match('/offline.html') ||
            new Response('Erreur réseau', {
              status: 503,
              statusText: 'Service Unavailable'
            })
          );
        });
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
