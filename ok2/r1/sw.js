// Service Worker - Compatible iOS Safari 16.4+
const CACHE_NAME = 'pwa-v2';
const BASE_URL = self.location.origin + self.location.pathname.replace(/[^/]*$/, '');

// ============================================
// INSTALL
// ============================================
self.addEventListener('install', event => {
    console.log('[SW] Install');
    self.skipWaiting();

    const urls = [
        BASE_URL,
        BASE_URL + 'index.html',
        BASE_URL + 'manifest.json',
        BASE_URL + 'script.js',
        BASE_URL + 'icons/icon-192x192.png'  // Añadido icono al cache
    ];

    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => {
            return Promise.allSettled(urls.map(url => cache.add(url)));
        })
    );
});

// ============================================
// ACTIVATE
// ============================================
self.addEventListener('activate', event => {
    console.log('[SW] Activate');
    event.waitUntil(
        caches.keys().then(keys => {
            return Promise.all(
                keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
            );
        }).then(() => self.clients.claim())
    );
});

// ============================================
// PUSH
// ============================================
const GAS_URL = 'https://script.google.com/macros/s/AKfycbwreGMo-ZITm8PUkGJfMVu1cwKMsnUhfD1BZO18qFBa9CFcWd50VzBDKwDMKCubYhg5Cg/exec';

self.addEventListener('push', event => {
    console.log('[SW] Push recibido');

    const getPayload = new Promise((resolve, reject) => {
        if (event.data) {
            try {
                const json = event.data.json();
                if (json && json.title) {
                    console.log('[SW] Datos recibidos en payload');
                    resolve(json);
                    return;
                }
            } catch (e) {
                console.log('[SW] Payload no es JSON válido');
            }
        }

        console.log('[SW] Sin payload, obteniendo de servidor...');
        const cacheBuster = '&t=' + Date.now();
        fetch(GAS_URL + '?action=get-latest-notification' + cacheBuster)
            .then(res => res.json())
            .then(data => {
                if (data.success && data.notification) {
                    resolve(data.notification);
                } else {
                    reject('No hay notificaciones recientes');
                }
            })
            .catch(err => reject(err));
    });

    event.waitUntil(
        getPayload
            .then(payload => {
                const title = payload.title || 'Nueva notificación';
                const options = {
                    body: payload.body || 'Tienes un mensaje nuevo',
                    icon: payload.icon || (BASE_URL + 'icons/icon-192x192.png'),  // Ruta actualizada
                    data: { url: payload.url || BASE_URL, timestamp: Date.now() },
                    tag: 'pwa-notification'
                };

                return self.registration.showNotification(title, options);
            })
            .catch(err => {
                console.error('[SW] Error:', err);
                return self.registration.showNotification('Nueva notificación', {
                    body: 'Abre la app para ver el mensaje',
                    icon: BASE_URL + 'icons/icon-192x192.png',  // Ruta actualizada
                    data: { url: BASE_URL }
                });
            })
    );
});

// ============================================
// NOTIFICATION CLICK
// ============================================
self.addEventListener('notificationclick', event => {
    console.log('[SW] Notificationclick');
    var notification = event.notification;
    var urlToOpen = (notification.data && notification.data.url) ? notification.data.url : BASE_URL;
    notification.close();

    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true })
            .then(function (clientList) {
                for (var i = 0; i < clientList.length; i++) {
                    var client = clientList[i];
                    if (client.url === urlToOpen && 'focus' in client) {
                        return client.focus();
                    }
                }
                return clients.openWindow(urlToOpen);
            })
    );
});

// ============================================
// FETCH
// ============================================
self.addEventListener('fetch', event => {
    if (!event.request.url.startsWith(self.location.origin)) return;
    if (event.request.method !== 'GET') return;

    event.respondWith(
        fetch(event.request)
            .then(function (response) {
                if (response && response.status === 200) {
                    var clone = response.clone();
                    caches.open(CACHE_NAME).then(function (cache) { cache.put(event.request, clone); });
                }
                return response;
            })
            .catch(function () {
                return caches.match(event.request);
            })
    );
});