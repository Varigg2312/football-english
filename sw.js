const CACHE_NAME = 'gaffer-pro-v4';
const OFFLINE_URL = '/offline.html';

// Core shell + content precached at install so lessons already seen
// (and the app itself) keep working with no network at all.
const PRECACHE_URLS = [
    '/', '/index.html', '/offline.html',
    '/football.css', '/app.js', '/i18n.js', '/manifest.json', '/lessons.json',
    '/favicon-96.png', '/apple-touch-icon.png', '/icon-192.png', '/icon-512.png',
    '/audio/whistle.mp3', '/audio/correct.mp3', '/audio/wrong.mp3', '/audio/win.mp3'
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => cache.addAll(PRECACHE_URLS))
    );
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys()
            .then(keys => Promise.all(
                keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
            ))
            .then(() => clients.claim())
    );
});

self.addEventListener('fetch', (event) => {
    const req = event.request;
    if (req.method !== 'GET') return;

    // Page navigations: network-first so updates show up immediately,
    // falling back to the cached shell, then the offline page.
    // ignoreSearch matters here: the installed PWA opens '/?source=pwa',
    // which must still match the precached '/' entry.
    if (req.mode === 'navigate') {
        event.respondWith(
            fetch(req)
                .then(res => { cachePut(req, res.clone()); return res; })
                .catch(() => caches.match(req, { ignoreSearch: true })
                    .then(cached => cached || caches.match(OFFLINE_URL)))
        );
        return;
    }

    const url = new URL(req.url);
    if (url.origin !== self.location.origin) return; // let cross-origin CDN requests pass through untouched

    // lessons.json: network-first so new/edited lessons show up when online,
    // but still readable offline from the last successful fetch.
    if (url.pathname.endsWith('/lessons.json')) {
        event.respondWith(
            fetch(req)
                .then(res => { cachePut(req, res.clone()); return res; })
                .catch(() => caches.match(req))
        );
        return;
    }

    // Everything else same-origin (css/js/images/audio): cache-first,
    // filling the cache in the background for anything not precached yet.
    event.respondWith(
        caches.match(req).then(cached => {
            if (cached) return cached;
            return fetch(req).then(res => { cachePut(req, res.clone()); return res; });
        })
    );
});

function cachePut(request, response) {
    if (!response || !response.ok) return;
    caches.open(CACHE_NAME).then(cache => cache.put(request, response));
}
