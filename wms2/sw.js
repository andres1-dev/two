// Service Worker optimizado para múltiples vistas
const CACHE_NAME = 'wms-multi-view-cache-v3';
const BASE = (new URL('.', self.location)).href;

// Assets críticos para caching
const CRITICAL_ASSETS = [
    './',
    './index.html',
    './pda.html', 
    './manual.html',
    './config.html',
    './css/styles.css',
    './css/pda.css',
    './css/manual.css',
    './css/mode-selector.css',
    './js/app.js',
    './js/pda.js',
    './js/manual.js',
    './js/config.js',
    './js/camera.js',
    './js/mode-selector.js',
    './manifest.json'
].map(url => new URL(url, BASE).href);

// Assets de iconos
const ICON_ASSETS = [
    'icons/icon-192.png',
    'icons/icon-256.png', 
    'icons/icon-384.png',
    'icons/icon-512.png',
    'icons/icon-512-maskable.png',
    'icons/icon-1024.png',
    'icons/favicon.ico'
].map(p => new URL(p, BASE).href);

// Recursos externos para cache
const EXTERNAL_ASSETS = [
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.2/css/all.min.css',
    'https://unpkg.com/@zxing/library@latest'
];

// Instalación
self.addEventListener('install', (event) => {
    console.log('🟢 Service Worker instalando...');
    
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('📦 Cacheando assets críticos...');
                return cache.addAll(CRITICAL_ASSETS)
                    .then(() => cache.addAll(ICON_ASSETS))
                    .then(() => {
                        console.log('✅ Assets cacheados');
                        return self.skipWaiting();
                    });
            })
            .catch(err => {
                console.log('⚠️ Error cacheando assets:', err);
                return self.skipWaiting();
            })
    );
});

// Activación
self.addEventListener('activate', (event) => {
    console.log('🔵 Service Worker activando...');
    
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cache => {
                    if (cache !== CACHE_NAME) {
                        console.log('🗑️ Eliminando cache antiguo:', cache);
                        return caches.delete(cache);
                    }
                })
            );
        })
        .then(() => {
            console.log('✅ Service Worker activado');
            return self.clients.claim();
        })
    );
});

// Estrategia de fetch
self.addEventListener('fetch', (event) => {
    const request = event.request;
    const url = new URL(request.url);

    // Evitar cachear requests de APIs y cámara
    if (request.url.includes('googleapis.com') || 
        request.url.includes('zxing') ||
        request.destination === 'video' ||
        request.method !== 'GET') {
        return;
    }

    // Para navegación - Network First
    if (request.mode === 'navigate') {
        event.respondWith(
            fetch(request)
                .then(response => {
                    if (response.status === 200) {
                        const responseClone = response.clone();
                        caches.open(CACHE_NAME).then(cache => {
                            cache.put(request, responseClone);
                        });
                    }
                    return response;
                })
                .catch(() => {
                    return caches.match(request)
                        .then(cached => {
                            if (cached) return cached;
                            // Fallback a index.html
                            return caches.match(new URL('./index.html', BASE).href);
                        });
                })
        );
        return;
    }

    // Para recursos estáticos - Cache First
    event.respondWith(
        caches.match(request)
            .then(cachedResponse => {
                if (cachedResponse) {
                    // Actualizar en segundo plano
                    fetch(request).then(response => {
                        if (response.status === 200) {
                            caches.open(CACHE_NAME).then(cache => {
                                cache.put(request, response);
                            });
                        }
                    });
                    return cachedResponse;
                }
                
                return fetch(request)
                    .then(response => {
                        if (response.status === 200) {
                            const responseClone = response.clone();
                            caches.open(CACHE_NAME).then(cache => {
                                cache.put(request, responseClone);
                            });
                        }
                        return response;
                    })
                    .catch(() => {
                        // Fallback para iconos
                        if (request.destination === 'image') {
                            return caches.match(new URL('icons/icon-192.png', BASE).href);
                        }
                        return new Response('', { status: 408 });
                    });
            })
    );
});

// Manejar mensajes
self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
});

console.log('🎯 Service Worker cargado - Soporte multi-vista');