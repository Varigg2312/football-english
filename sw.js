const CACHE_NAME = 'gaffer-pro-v1';

self.addEventListener('install', (event) => {
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(clients.claim());
});

self.addEventListener('fetch', (event) => {
    event.respondWith(
        fetch(event.request).catch(() => {
            return new Response("Estás sin conexión. Revisa tu red para hablar con The Gaffer.");
        })
    );
});
