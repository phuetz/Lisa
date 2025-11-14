// Lisa AI Service Worker - Enhanced Version
// Update this version string on each deploy to invalidate old caches
const CACHE_VERSION = 'v3';
const CACHE_NAME = `lisa-cache-${CACHE_VERSION}`;
const RUNTIME_CACHE = `lisa-runtime-${CACHE_VERSION}`;
const MODEL_CACHE = `lisa-models-${CACHE_VERSION}`;

// Assets to cache for offline use
const assetsToCache = [
  '/',
  '/index.html',
  '/favicon.ico',
  '/manifest.json',
  '/offline.html'
];

// Cache strategies
const CACHE_STRATEGIES = {
  CACHE_FIRST: 'cache-first',
  NETWORK_FIRST: 'network-first',
  STALE_WHILE_REVALIDATE: 'stale-while-revalidate',
  NETWORK_ONLY: 'network-only',
  CACHE_ONLY: 'cache-only'
};

// Route patterns and their strategies
const ROUTE_STRATEGIES = [
  { pattern: /\.(js|css|woff2|woff|ttf)$/, strategy: CACHE_STRATEGIES.CACHE_FIRST },
  { pattern: /\.(png|jpg|jpeg|svg|gif|webp)$/, strategy: CACHE_STRATEGIES.CACHE_FIRST },
  { pattern: /\/api\//, strategy: CACHE_STRATEGIES.NETWORK_FIRST },
  { pattern: /\.wasm$/, strategy: CACHE_STRATEGIES.CACHE_FIRST },
  { pattern: /models\/.*\.bin$/, strategy: CACHE_STRATEGIES.CACHE_FIRST, cache: MODEL_CACHE },
];

// Install event - cache assets and skip waiting
self.addEventListener('install', event => {
  console.log('[SW] Installing service worker v3');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[SW] Caching static assets');
        return cache.addAll(assetsToCache);
      })
      .then(() => {
        console.log('[SW] Skip waiting');
        return self.skipWaiting();
      })
      .catch(err => {
        console.error('[SW] Install failed:', err);
        throw err;
      })
  );
});

// Listen for messages from client
self.addEventListener('message', (event) => {
  if (!event.data) return;

  switch (event.data.type) {
    case 'SKIP_WAITING':
      console.log('[SW] Skip waiting requested');
      self.skipWaiting();
      break;

    case 'CLAIM_CLIENTS':
      console.log('[SW] Claiming clients');
      self.clients.claim();
      break;

    case 'CLEAR_CACHE':
      console.log('[SW] Clearing caches');
      event.waitUntil(
        caches.keys().then(names => {
          return Promise.all(names.map(name => caches.delete(name)));
        })
      );
      break;

    case 'CACHE_URLS':
      console.log('[SW] Caching URLs:', event.data.urls);
      event.waitUntil(
        caches.open(RUNTIME_CACHE).then(cache => {
          return cache.addAll(event.data.urls);
        })
      );
      break;
  }
});

// Activate event - clean up old caches and claim clients
self.addEventListener('activate', event => {
  console.log('[SW] Activating service worker v3');
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames
          .filter(name => {
            return name.startsWith('lisa-') &&
                   name !== CACHE_NAME &&
                   name !== RUNTIME_CACHE &&
                   name !== MODEL_CACHE;
          })
          .map(name => {
            console.log('[SW] Deleting old cache:', name);
            return caches.delete(name);
          })
      );
    }).then(() => {
      console.log('[SW] Claiming clients');
      return self.clients.claim();
    })
  );
});

// Get cache strategy for a request
function getCacheStrategy(request) {
  const url = new URL(request.url);

  for (const route of ROUTE_STRATEGIES) {
    if (route.pattern.test(url.pathname)) {
      return {
        strategy: route.strategy,
        cache: route.cache || RUNTIME_CACHE
      };
    }
  }

  // Default strategy
  return {
    strategy: CACHE_STRATEGIES.STALE_WHILE_REVALIDATE,
    cache: RUNTIME_CACHE
  };
}

// Cache-first strategy
async function cacheFirst(request, cacheName) {
  const cached = await caches.match(request);
  if (cached) {
    return cached;
  }

  const response = await fetch(request);
  if (response.ok) {
    const cache = await caches.open(cacheName);
    cache.put(request, response.clone());
  }
  return response;
}

// Network-first strategy
async function networkFirst(request, cacheName) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    const cached = await caches.match(request);
    if (cached) {
      return cached;
    }
    throw error;
  }
}

// Stale-while-revalidate strategy
async function staleWhileRevalidate(request, cacheName) {
  const cached = await caches.match(request);

  const fetchPromise = fetch(request).then(response => {
    if (response.ok) {
      const cache = caches.open(cacheName);
      cache.then(c => c.put(request, response.clone()));
    }
    return response;
  });

  return cached || fetchPromise;
}

// Fetch event - enhanced with multiple strategies
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Skip chrome extensions
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    return;
  }

  const { strategy, cache } = getCacheStrategy(request);

  event.respondWith(
    (async () => {
      try {
        switch (strategy) {
          case CACHE_STRATEGIES.CACHE_FIRST:
            return await cacheFirst(request, cache);

          case CACHE_STRATEGIES.NETWORK_FIRST:
            return await networkFirst(request, cache);

          case CACHE_STRATEGIES.STALE_WHILE_REVALIDATE:
            return await staleWhileRevalidate(request, cache);

          case CACHE_STRATEGIES.NETWORK_ONLY:
            return await fetch(request);

          case CACHE_STRATEGIES.CACHE_ONLY:
            return await caches.match(request) || new Response('Not found', { status: 404 });

          default:
            return await staleWhileRevalidate(request, cache);
        }
      } catch (error) {
        console.error('[SW] Fetch failed:', error);

        // Try to return offline page for navigation requests
        if (request.mode === 'navigate') {
          const offlinePage = await caches.match('/offline.html');
          if (offlinePage) {
            return offlinePage;
          }
        }

        return new Response('Network error', {
          status: 503,
          statusText: 'Service Unavailable'
        });
      }
    })()
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

// Background Sync event - sync queued operations
self.addEventListener('sync', event => {
  console.log('[SW] Background sync triggered:', event.tag);

  if (event.tag === 'sync-operations') {
    event.waitUntil(
      (async () => {
        try {
          // Notify all clients to perform sync
          const clients = await self.clients.matchAll();
          clients.forEach(client => {
            client.postMessage({
              type: 'BACKGROUND_SYNC',
              tag: event.tag
            });
          });

          console.log('[SW] Background sync completed');
        } catch (error) {
          console.error('[SW] Background sync failed:', error);
          throw error;
        }
      })()
    );
  }
});

// Periodic background sync (if available)
self.addEventListener('periodicsync', event => {
  console.log('[SW] Periodic sync triggered:', event.tag);

  if (event.tag === 'periodic-sync') {
    event.waitUntil(
      (async () => {
        try {
          const clients = await self.clients.matchAll();
          clients.forEach(client => {
            client.postMessage({
              type: 'PERIODIC_SYNC',
              tag: event.tag
            });
          });

          console.log('[SW] Periodic sync completed');
        } catch (error) {
          console.error('[SW] Periodic sync failed:', error);
        }
      })()
    );
  }
});
