// ============================================
// SERVICE WORKER CON RUTAS RELATIVAS
// ============================================

// Base URL relativa al lugar donde está este archivo sw.js
const BASE = (new URL('.', self.location)).href;
const CACHE_NAME = 'pwa-notifications-v1';

// URLs para cachear (con rutas relativas al BASE)
const urlsToCache = [
    './',
    './index.html',
    './manifest.json',
    './script.js',
    './sw.js',
    './icon-192.png',
    './icon-512.png'
];

// Instalación del Service Worker
self.addEventListener('install', event => {
    console.log('🔧 Service Worker instalado');
    console.log('📍 BASE URL:', BASE);

    // Forzar activación inmediata
    self.skipWaiting();

    // Cachear archivos
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('✅ Cacheando archivos desde:', BASE);
                return cache.addAll(urlsToCache.map(url => new URL(url, BASE).href));
            })
            .catch(error => {
                console.error('❌ Error cacheando:', error);
            })
    );
});

// Activación del Service Worker
self.addEventListener('activate', event => {
    console.log('⚡ Service Worker activado');
    console.log('📍 Scope:', self.registration.scope);

    // Limpiar caches antiguos
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheName !== CACHE_NAME) {
                        console.log('🗑️ Eliminando cache antiguo:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => {
            // Tomar control inmediato de todos los clientes
            return clients.claim();
        })
    );
});

// Manejar notificaciones push
self.addEventListener('push', event => {
    console.log('📨 Notificación push recibida');

    let data = {
        title: 'Nueva notificación',
        body: 'Tienes un mensaje nuevo',
        icon: new URL('./icon-192.png', BASE).href,
        badge: new URL('./icon-192.png', BASE).href,
        vibrate: [200, 100, 200],
        data: {
            url: BASE, // URL base de la app
            timestamp: Date.now()
        },
        requireInteraction: true,
        actions: [
            {
                action: 'open',
                title: 'Abrir'
            },
            {
                action: 'close',
                title: 'Cerrar'
            }
        ]
    };

    // Procesar datos recibidos
    if (event.data) {
        try {
            const receivedData = event.data.json();
            data = { ...data, ...receivedData };
            // Asegurar que las URLs sean absolutas
            if (data.icon) {
                data.icon = new URL(data.icon, BASE).href;
            }
            if (data.badge) {
                data.badge = new URL(data.badge, BASE).href;
            }
        } catch (e) {
            // Si no es JSON, usar como texto
            data.body = event.data.text();
        }
    }

    // Mostrar la notificación
    event.waitUntil(
        self.registration.showNotification(data.title, {
            body: data.body,
            icon: data.icon,
            badge: data.badge,
            vibrate: data.vibrate,
            data: data.data,
            actions: data.actions,
            requireInteraction: data.requireInteraction,
            tag: 'notification-' + Date.now(),
            renotify: false
        })
    );
});

// Manejar clic en notificación
self.addEventListener('notificationclick', event => {
    console.log('👆 Notificación clickeada');

    const notification = event.notification;
    const action = event.action;
    const urlToOpen = notification.data?.url || BASE;

    notification.close();

    // Manejar acciones
    if (action === 'close') {
        return;
    }

    event.waitUntil(
        (async () => {
            // Buscar cliente existente
            const allClients = await clients.matchAll({
                includeUncontrolled: true,
                type: 'window'
            });

            // Verificar si ya hay una ventana abierta con la URL
            for (const client of allClients) {
                if (client.url === urlToOpen && 'focus' in client) {
                    await client.focus();
                    return;
                }
            }

            // Si no, abrir nueva ventana
            if (clients.openWindow) {
                await clients.openWindow(urlToOpen);
            }
        })()
    );
});

// Manejar cierre de notificación
self.addEventListener('notificationclose', event => {
    console.log('❌ Notificación cerrada');
});

// Manejar mensajes desde la página
self.addEventListener('message', event => {
    console.log('📩 Mensaje recibido:', event.data);

    if (event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
});

// Estrategia de cache: Network First, fallback a cache
self.addEventListener('fetch', event => {
    // Ignorar peticiones a Google Analytics u otros dominios externos
    if (!event.request.url.startsWith(self.location.origin)) {
        return;
    }

    event.respondWith(
        fetch(event.request)
            .then(response => {
                // Clonar la respuesta
                const responseClone = response.clone();

                // Actualizar cache
                caches.open(CACHE_NAME).then(cache => {
                    cache.put(event.request, responseClone);
                });

                return response;
            })
            .catch(() => {
                // Fallback a cache
                return caches.match(event.request);
            })
    );
});

// Manejar errores
self.addEventListener('error', event => {
    console.error('❌ Error en Service Worker:', event.error);
});

self.addEventListener('unhandledrejection', event => {
    console.error('❌ Promesa rechazada:', event.reason);
});