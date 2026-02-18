// Service Worker para notificaciones push
const CACHE_NAME = 'push-tester-v1';

self.addEventListener('install', (event) => {
    self.skipWaiting();
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(['index.html', 'manifest.json']);
        })
    );
});

self.addEventListener('activate', (event) => {
    event.waitUntil(clients.claim());
});

// Manejar notificaciones push
self.addEventListener('push', (event) => {
    console.log('Push recibido:', event);
    
    let data = { title: 'Notificación', body: 'Mensaje nuevo', icon: '' };
    
    if (event.data) {
        try {
            // Intentar parsear como JSON
            data = event.data.json();
        } catch (e) {
            // Si falla, usar texto plano
            data.body = event.data.text();
        }
    }
    
    const options = {
        body: data.body,
        icon: data.icon || 'https://via.placeholder.com/128',
        badge: 'https://via.placeholder.com/128',
        vibrate: [200, 100, 200],
        data: {
            timestamp: data.timestamp || Date.now(),
            url: data.url || '/'
        },
        actions: [
            { action: 'open', title: 'Abrir app' },
            { action: 'close', title: 'Cerrar' }
        ]
    };
    
    event.waitUntil(
        self.registration.showNotification(data.title || 'Notificación', options)
    );
});

// Manejar clic en notificación
self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    
    if (event.action === 'close') return;
    
    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true })
            .then((clientList) => {
                if (clientList.length > 0) {
                    return clientList[0].focus();
                }
                return clients.openWindow('/');
            })
    );
});

// Fetch event para cache
self.addEventListener('fetch', (event) => {
    event.respondWith(
        caches.match(event.request)
            .then((response) => response || fetch(event.request))
    );
});