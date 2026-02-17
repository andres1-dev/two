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
        BASE_URL + 'script.js'
    ];

    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => {
            // addAll falla si alguna URL da error — usamos add individual
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
// iOS FIX: NO usar estas opciones en iOS porque las ignora
// o lanza error silencioso:
//   - vibrate        → ignorado en iOS
//   - requireInteraction → ignorado en iOS
//   - actions        → NO soportado en iOS (causa error)
//   - badge          → soporte limitado
//
// iOS SÍ requiere:
//   - title (obligatorio, no vacío)
//   - body  (recomendado)
//   - icon  (ruta ABSOLUTA con https://)
//   - data  (para saber qué URL abrir al tocar)
// ============================================
self.addEventListener('push', event => {
    console.log('[SW] Push recibido');

    var title = 'Nueva notificación';
    var body = 'Tienes un mensaje nuevo';
    var icon = BASE_URL + 'icon-192.png';
    var url = BASE_URL;

    if (event.data) {
        try {
            var d = event.data.json();
            if (d.title) title = d.title;
            if (d.body) body = d.body;
            if (d.icon) icon = d.icon;
            if (d.url) url = d.url;
        } catch (e) {
            // Si no es JSON, usar el texto como body
            try { body = event.data.text(); } catch (e2) { }
        }
    }

    // ⭐ iOS: el título NO puede estar vacío
    if (!title || title.trim() === '') title = 'Notificación';

    // Opciones COMPATIBLES con iOS Safari
    var options = {
        body: body,
        icon: icon,
        data: { url: url, timestamp: Date.now() }
        // NO incluir: vibrate, requireInteraction, actions
        // en iOS esas propiedades causan que la notificación falle silenciosamente
    };

    event.waitUntil(
        self.registration.showNotification(title, options)
            .then(function () {
                console.log('[SW] Notificación mostrada OK');
            })
            .catch(function (err) {
                console.error('[SW] Error mostrando notificación:', err);
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
    // No interceptar peticiones POST (GAS calls)
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