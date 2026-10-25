// Minimal service worker so the app can be installed. Network always first.
self.addEventListener('install', e => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));
self.addEventListener('fetch', e => { e.respondWith(fetch(e.request).catch(() => new Response('You are offline.', { status: 503 }))); });
