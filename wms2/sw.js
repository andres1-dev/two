// sw.js - Service Worker SIN CACHE DE DATOS
const CACHE_NAME = 'wms-static-cache-v1';
const BASE = (new URL('.', self.location)).href;

// Solo assets críticos estáticos - NO DATOS
const STATIC_ASSETS = [
    './',
    './index.html',
    './pda.html',
    './manual.html',
    './css/styles.css',
    './css/pda.css',
    './css/manual.css',
    './css/index.css',
    './js/app.js',
    './js/pda.js',
    './js/manual.js',
    './js/index.js',
    './manifest.json'
].map(url => new URL(url, BASE).href);

// Solo iconos - NO DATOS
const ICON_ASSETS = [
    'icons/icon-192.png',
    'icons/icon-256.png',
    'icons/icon-384.png',
    'icons/icon-512.png',
    'icons/icon-512-maskable.png',
    'icons/icon-1024.png',
    'icons/favicon.ico'
].map(p => new URL(p, BASE).href);

// Recursos externos
const EXTERNAL_ASSETS = [
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.2/css/all.min.css',
    'https://unpkg.com/@zxing/library@latest'
];

// Instalación - Solo assets estáticos
self.addEventListener('install', (event) => {
    console.log('🟢 Service Worker instalando (SIN CACHE DE DATOS)...');
    
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('📦 Cacheando solo assets estáticos...');
                return cache.addAll([...STATIC_ASSETS, ...ICON_ASSETS])
                    .then(() => {
                        console.log('✅ Assets estáticos cacheados');
                        return self.skipWaiting();
                    });
            })
            .catch(err => {
                console.log('⚠️ Error cacheando assets estáticos:', err);
                return self.skipWaiting();
            })
    );
});

// Activación - Limpiar caches antiguos
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
            console.log('✅ Service Worker activado - SIN CACHE DE DATOS');
            return self.clients.claim();
        })
    );
});

// Estrategia de fetch - NO CACHEAR DATOS
self.addEventListener('fetch', (event) => {
    const request = event.request;
    const url = new URL(request.url);

    // BLOQUEAR COMPLETAMENTE el cache de Google Sheets y APIs de datos
    if (request.url.includes('googleapis.com') || 
        request.url.includes('spreadsheets') ||
        request.url.includes('/data/') ||
        request.url.includes('/api/') ||
        request.method !== 'GET') {
        // Pasar directamente a network - SIN CACHE
        console.log('🚫 Bloqueando cache para:', request.url);
        return;
    }

    // Para navegación - Network Only (si falla, usar cache estático)
    if (request.mode === 'navigate') {
        event.respondWith(
            fetch(request)
                .catch(() => {
                    return caches.match(request)
                        .then(cached => {
                            if (cached) return cached;
                            return caches.match(new URL('./index.html', BASE).href);
                        });
                })
        );
        return;
    }

    // Para recursos estáticos - Cache First
    if (request.destination === 'style' || 
        request.destination === 'script' || 
        request.destination === 'image' ||
        request.destination === 'font') {
        
        event.respondWith(
            caches.match(request)
                .then(cachedResponse => {
                    if (cachedResponse) {
                        return cachedResponse;
                    }
                    
                    return fetch(request)
                        .then(response => {
                            // Solo cachear si es un asset estático válido
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
        return;
    }

    // Estrategia por defecto: Network Only
    event.respondWith(fetch(request));
});

// Manejar mensajes
self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
});

console.log('🎯 Service Worker cargado - SIN CACHE DE DATOS');