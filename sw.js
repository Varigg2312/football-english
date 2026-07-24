const CACHE_NAME = 'gaffer-pro-v8';
const OFFLINE_URL = '/offline.html';

// Core shell + content precached at install so lessons already seen
// (and the app itself) keep working with no network at all.
const PRECACHE_URLS = [
    '/', '/index.html', '/offline.html',
    '/football.css', '/app.js', '/i18n.js', '/manifest.json', '/lessons.json',
    '/favicon-96.png', '/apple-touch-icon.png', '/icon-192.png', '/icon-512.png', '/icon-512-maskable.png',
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

    // Auth/session endpoints must never be cached: a stale cached /api/auth/me
    // would instantly hand back a logged-in-as-someone-else (or logged-out)
    // response before the real network answer arrives, flashing the wrong
    // account state on every load. Bypass the SW entirely for these.
    if (url.pathname.startsWith('/api/')) return;

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

    // Everything else same-origin (css/js/images/audio): stale-while-revalidate.
    // Serves the cached copy immediately (or waits for the network if nothing's
    // cached yet), but always refetches in the background and updates the
    // cache for next time — so a deploy that changes app.js/football.css/i18n.js
    // reaches returning users within one extra load, with no need to remember
    // to bump CACHE_NAME (this already broke prod once without it).
    event.respondWith(
        caches.match(req).then(cached => {
            const network = fetch(req)
                .then(res => { cachePut(req, res.clone()); return res; })
                .catch(() => cached);
            return cached || network;
        })
    );
});

function cachePut(request, response) {
    if (!response || !response.ok) return;
    caches.open(CACHE_NAME).then(cache => cache.put(request, response));
}
