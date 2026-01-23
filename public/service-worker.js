// Lisa AI Service Worker
// Update this version string on each deploy to invalidate old caches
const CACHE_VERSION = 'v3';
const CACHE_NAME = `lisa-cache-${CACHE_VERSION}`;
const STATIC_CACHE = `lisa-static-${CACHE_VERSION}`;
const DYNAMIC_CACHE = `lisa-dynamic-${CACHE_VERSION}`;

// Skip service worker in development (check common dev ports)
const isDevelopment = self.location.hostname === 'localhost' && 
  (self.location.port === '5173' || self.location.port === '5180' || self.location.port === '3000');

if (isDevelopment) {
  console.log('[Service Worker] Mode hors ligne désactivé en développement');
  // Skip all service worker functionality in development
  self.addEventListener('install', event => {
    self.skipWaiting();
  });
  self.addEventListener('activate', event => {
    event.waitUntil(clients.claim());
  });
  self.addEventListener('fetch', () => {});
} else {
  // Production mode - enhanced service worker for mobile
  
  // Static assets to cache immediately (App Shell)
  const staticAssets = [
    '/',
    '/index.html',
    '/manifest.json',
    '/icon-192x192.svg',
    '/icon-512x512.svg',
    '/badge-96x96.svg'
  ];

  // API routes to cache with network-first strategy
  const apiRoutes = ['/api/'];

  // Assets to cache for offline use
  const assetsToCache = [
    '/',
    '/index.html',
    '/favicon.ico',
    '/manifest.json'
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

  // Activate event - clean up old caches (keep current version caches)
  self.addEventListener('activate', event => {
    event.waitUntil(
      caches.keys().then(cacheNames => {
        return Promise.all(
          cacheNames
            .filter(name => !name.includes(CACHE_VERSION))
            .map(name => caches.delete(name))
        );
      }).then(() => self.clients.claim())
    );
  });

  // Fetch event - smart caching strategies
  self.addEventListener('fetch', event => {
    const { request } = event;
    const url = new URL(request.url);

    // Skip non-GET requests
    if (request.method !== 'GET') return;

    // Skip chrome-extension and other non-http(s) requests
    if (!url.protocol.startsWith('http')) return;

    // API requests: Network first, cache fallback
    if (apiRoutes.some(route => url.pathname.startsWith(route))) {
      event.respondWith(
        fetch(request)
          .then(response => {
            // Clone and cache successful responses
            if (response.ok) {
              const clonedResponse = response.clone();
              caches.open(DYNAMIC_CACHE).then(cache => {
                cache.put(request, clonedResponse);
              });
            }
            return response;
          })
          .catch(() => caches.match(request))
      );
      return;
    }

    // Static assets: Cache first, network fallback
    if (staticAssets.some(asset => url.pathname === asset) || 
        url.pathname.match(/\.(js|css|woff2?|ttf|svg|png|jpg|jpeg|gif|ico)$/)) {
      event.respondWith(
        caches.match(request)
          .then(response => {
            if (response) return response;
            
            return fetch(request).then(networkResponse => {
              // Cache the new resource
              const clonedResponse = networkResponse.clone();
              caches.open(STATIC_CACHE).then(cache => {
                cache.put(request, clonedResponse);
              });
              return networkResponse;
            });
          })
          .catch(() => {
            // Fallback for images
            if (request.destination === 'image') {
              return caches.match('/icon-192x192.svg');
            }
            return null;
          })
      );
      return;
    }

    // Navigation requests: Network first with offline fallback
    if (request.mode === 'navigate') {
      event.respondWith(
        fetch(request)
          .then(response => {
            // Cache successful navigation responses
            const clonedResponse = response.clone();
            caches.open(DYNAMIC_CACHE).then(cache => {
              cache.put(request, clonedResponse);
            });
            return response;
          })
          .catch(() => {
            // Offline: serve cached page or app shell
            return caches.match(request)
              .then(cachedResponse => cachedResponse || caches.match('/index.html'));
          })
      );
      return;
    }

    // Default: Stale-while-revalidate
    event.respondWith(
      caches.match(request)
        .then(response => {
          const fetchPromise = fetch(request).then(networkResponse => {
            caches.open(DYNAMIC_CACHE).then(cache => {
              cache.put(request, networkResponse.clone());
            });
            return networkResponse;
          });
          return response || fetchPromise;
        })
        .catch(() => null)
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
}
