// Service Worker para PWA Notificaciones
const CACHE_NAME = 'pwa-notifications-v1';
const BASE_URL = self.location.origin + self.location.pathname.replace(/[^/]*$/, '');

// Archivos para cachear
const urlsToCache = [
    BASE_URL,
    BASE_URL + 'index.html',
    BASE_URL + 'manifest.json',
    BASE_URL + 'script.js',
    BASE_URL + 'icon-192.png',
    BASE_URL + 'icon-512.png'
].map(url => url.replace(/([^:]\/)\/+/g, '$1')); // Limpiar URLs duplicadas

// Instalación
self.addEventListener('install', event => {
    console.log('🔧 Service Worker instalado');
    console.log('📍 Base URL:', BASE_URL);

    // Forzar activación inmediata
    self.skipWaiting();

    // Cachear archivos
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('✅ Cacheando archivos...');
                return cache.addAll(urlsToCache).catch(error => {
                    console.error('❌ Error cacheando:', error);
                    // Continuar aunque falle el cache
                });
            })
    );
});

// Activación
self.addEventListener('activate', event => {
    console.log('⚡ Service Worker activado');
    console.log('📍 Scope:', self.registration.scope);

    // Limpiar caches antiguos
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheName !== CACHE_NAME) {
                        console.log('🗑️ Eliminando cache:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => {
            // Tomar control inmediato
            return self.clients.claim();
        })
    );
});

// Notificaciones push
self.addEventListener('push', event => {
    console.log('📨 Push recibido');

    let data = {
        title: 'Nueva notificación',
        body: 'Tienes un mensaje nuevo',
        icon: BASE_URL + 'icon-192.png',
        badge: BASE_URL + 'icon-192.png',
        data: {
            url: BASE_URL,
            timestamp: Date.now()
        }
    };

    if (event.data) {
        try {
            const receivedData = event.data.json();
            data = { ...data, ...receivedData };
        } catch (e) {
            data.body = event.data.text();
        }
    }

    event.waitUntil(
        self.registration.showNotification(data.title, {
            body: data.body,
            icon: data.icon,
            badge: data.badge,
            vibrate: [200, 100, 200],
            data: data.data,
            requireInteraction: true,
            actions: [
                { action: 'open', title: 'Abrir' },
                { action: 'close', title: 'Cerrar' }
            ]
        })
    );
});

// Click en notificación
self.addEventListener('notificationclick', event => {
    const notification = event.notification;
    const urlToOpen = notification.data?.url || BASE_URL;
    notification.close();

    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true })
            .then(clientList => {
                for (const client of clientList) {
                    if (client.url === urlToOpen && 'focus' in client) {
                        return client.focus();
                    }
                }
                return clients.openWindow(urlToOpen);
            })
    );
});

// Fetch con fallback a cache
self.addEventListener('fetch', event => {
    // Ignorar peticiones a otros dominios
    if (!event.request.url.startsWith(self.location.origin)) {
        return;
    }

    event.respondWith(
        fetch(event.request)
            .then(response => {
                // Cachear respuestas exitosas
                if (response.status === 200) {
                    const responseClone = response.clone();
                    caches.open(CACHE_NAME).then(cache => {
                        cache.put(event.request, responseClone);
                    });
                }
                return response;
            })
            .catch(() => {
                return caches.match(event.request);
            })
    );
});