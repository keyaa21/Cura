/**
 * CURA PWA Service Worker
 * Implements Network-First for HTML navigation and static scripts/styles
 * so updates are seen immediately while preserving full offline capability.
 */

const CACHE_NAME = 'cura-clinic-pwa-v6';
const ASSETS_TO_CACHE = [
    '/',
    '/index.html',
    '/dashboard.html',
    '/patient-dashboard.html',
    '/doctor-dashboard.html',
    '/assistant-dashboard.html',
    '/css/style.css',
    '/js/app.js',
    '/js/patient.js',
    '/js/doctor.js',
    '/js/assistant.js',
    '/js/firebase-config.js',
    '/manifest.json'
];

self.addEventListener('install', (event) => {
    self.skipWaiting();
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            console.log('🌿 Cura Service Worker: Pre-caching app shell assets');
            return cache.addAll(ASSETS_TO_CACHE);
        })
    );
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cache) => {
                    if (cache !== CACHE_NAME) {
                        console.log('🌿 Cura Service Worker: Clearing old cache:', cache);
                        return caches.delete(cache);
                    }
                })
            );
        }).then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', (event) => {
    // Skip non-GET requests and API calls
    if (event.request.method !== 'GET' || event.request.url.includes('/api/')) {
        return;
    }

    // 1. HTML Navigation Requests -> NETWORK FIRST (Always get latest UI updates)
    const acceptHeader = event.request.headers.get('accept') || '';
    if (acceptHeader.includes('text/html')) {
        event.respondWith(
            fetch(event.request)
                .then((networkResponse) => {
                    if (networkResponse && networkResponse.status === 200) {
                        const copy = networkResponse.clone();
                        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
                    }
                    return networkResponse;
                })
                .catch(() => {
                    // Offline fallback: try cache, else fallback to index
                    return caches.match(event.request).then((cached) => cached || caches.match('/index.html'));
                })
        );
        return;
    }

    // 2. Scripts, Styles & Static Assets -> NETWORK FIRST with Cache Fallback
    // Ensures updates are served live immediately, falling back to cache when offline
    event.respondWith(
        fetch(event.request)
            .then((networkResponse) => {
                if (networkResponse && networkResponse.status === 200) {
                    const copy = networkResponse.clone();
                    caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
                }
                return networkResponse;
            })
            .catch(() => {
                return caches.match(event.request);
            })
    );
});
