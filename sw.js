const CACHE_NAME = 'alpha-track-v2';
const STATIC_CACHE = 'alpha-track-static-v2';
const DYNAMIC_CACHE = 'alpha-track-dynamic-v2';

const ASSETS_TO_CACHE = [
    './',
    'index.html',
    'auth.html',
    'style.css',
    'app.js',
    'auth.js',
    'firebase-config.js',
    'logo.png',
    'manifest.json'
];

const EXTERNAL_ASSETS = [
    'https://unpkg.com/lucide@latest',
    'https://cdn.jsdelivr.net/npm/chart.js',
    'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js',
    'https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.5.23/jspdf.plugin.autotable.min.js',
    'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Outfit:wght@400;600;700&display=swap',
    'https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js',
    'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth-compat.js',
    'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore-compat.js'
];

// Install Service Worker
self.addEventListener('install', (event) => {
    event.waitUntil(
        Promise.all([
            caches.open(STATIC_CACHE).then((cache) => {
                return cache.addAll(ASSETS_TO_CACHE);
            }),
            caches.open(DYNAMIC_CACHE).then((cache) => {
                return cache.addAll(EXTERNAL_ASSETS).catch(() => {
                    console.log('Some external assets could not be cached');
                });
            })
        ])
    );
    self.skipWaiting();
});

// Activate Service Worker
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cache) => {
                    if (cache !== STATIC_CACHE && cache !== DYNAMIC_CACHE && cache !== CACHE_NAME) {
                        return caches.delete(cache);
                    }
                })
            );
        })
    );
    self.clients.claim();
});

// Fetch Strategy: Cache first for assets, Network first for API
self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);

    // Skip non-GET requests
    if (request.method !== 'GET') {
        return;
    }

    // Firebase/API calls - Network first
    if (url.hostname.includes('firebase') || url.pathname.includes('/api')) {
        event.respondWith(
            fetch(request).then((response) => {
                if (response.ok) {
                    const clonedResponse = response.clone();
                    caches.open(DYNAMIC_CACHE).then((cache) => {
                        cache.put(request, clonedResponse);
                    });
                }
                return response;
            }).catch(() => {
                return caches.match(request).catch(() => {
                    return new Response('Offline - Service unavailable', { status: 503 });
                });
            })
        );
    } else {
        // Static assets - Cache first
        event.respondWith(
            caches.match(request).then((response) => {
                return response || fetch(request).then((response) => {
                    if (!response || response.status !== 200 || response.type === 'error') {
                        return response;
                    }
                    const clonedResponse = response.clone();
                    caches.open(DYNAMIC_CACHE).then((cache) => {
                        cache.put(request, clonedResponse);
                    });
                    return response;
                }).catch(() => {
                    return caches.match(request);
                });
            })
        );
    }
});

// Handle background sync for offline trades
self.addEventListener('sync', (event) => {
    if (event.tag === 'sync-trades') {
        event.waitUntil(
            // Sync trades when connection is restored
            fetch('/api/sync-trades', { method: 'POST' })
                .then(response => response.json())
                .catch(err => console.log('Sync failed:', err))
        );
    }
});
