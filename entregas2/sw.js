// Service Worker para PandaDash - Versión optimizada para PWA
const CACHE_NAME = 'pandadash-v8.1';

// Base URL relativa al lugar donde está este archivo sw.js
const BASE = (new URL('.', self.location)).href;

// Lista COMPLETA de assets locales
const RELATIVE_ASSETS = [
  '',
  'index2.html',
  'css/styles.css',
  'css/qr-scanner-styles.css',
  'js/app.js',
  'js/camera.js',
  'js/main.js',
  'js/upload-queue.js',
  'js/qr-scanner.js',
  'icons/icon-192.png',
  'icons/icon-256.png',
  'icons/icon-384.png',
  'icons/icon-512.png',
  'icons/icon-512-maskable.png',
  'icons/icon-1024.png',
  'icons/favicon.ico',
  'manifest.json'
];

// URLs externas críticas (CDNs)
const EXTERNAL_ASSETS = [
  'https://cdn.jsdelivr.net/npm/html5-qrcode@latest/dist/html5-qrcode.min.js',
  'https://fonts.googleapis.com/css2?family=Roboto:wght@300;400;500;700&display=swap',
  'https://fonts.googleapis.com/css2?family=Inter:wght@500;700&display=swap',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css'
];

// Convierte a URLs absolutas usando la ubicación del sw.js
const ASSETS_TO_CACHE = [
  ...RELATIVE_ASSETS.map(p => new URL(p, BASE).href)
];

// Instalación y cacheo inicial
self.addEventListener('install', (event) => {
  console.log('[SW] 🔧 Instalando Service Worker v8.1...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[SW] 📦 Cacheando assets locales...');
        // Cachear assets locales primero
        return cache.addAll(ASSETS_TO_CACHE)
          .then(() => {
            console.log('[SW] ✅ Assets locales cacheados');
            // Cachear CDNs externos uno por uno (sin fallar si alguno falla)
            return Promise.allSettled(
              EXTERNAL_ASSETS.map(url => 
                cache.add(url)
                  .then(() => console.log(`[SW] ✅ Cacheado: ${url}`))
                  .catch(err => {
                    console.warn(`[SW] ⚠️ No se pudo cachear ${url}:`, err.message);
                    return null;
                  })
              )
            );
          });
      })
      .then(() => {
        console.log('[SW] ✅ Instalación completada');
        return self.skipWaiting();
      })
      .catch(err => {
        console.error('[SW] ❌ Error durante instalación:', err);
      })
  );
});

// Activación y limpieza de versiones antiguas
self.addEventListener('activate', (event) => {
  console.log('[SW] 🚀 Activando Service Worker...');
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cache => {
          if (cache !== CACHE_NAME) {
            console.log('[SW] 🗑️ Eliminando cache antiguo:', cache);
            return caches.delete(cache);
          }
        })
      );
    }).then(() => {
      console.log('[SW] ✅ Service Worker activado');
      return self.clients.claim();
    })
  );
});

// Estrategia de fetch optimizada
self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // Ignorar requests no-HTTP (chrome-extension, etc)
  if (!req.url.startsWith('http')) {
    return;
  }

  // Ignorar requests de API/POST
  if (req.method !== 'GET') {
    return;
  }

  // Para navegación (HTML): Network First con cache fallback
  if (req.mode === 'navigate' || req.destination === 'document') {
    event.respondWith(
      fetch(req)
        .then(response => {
          // Guardar en cache para offline
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(req, responseClone));
          return response;
        })
        .catch(() => {
          // Si falla la red, usar cache
          return caches.match(req)
            .then(cached => cached || caches.match(new URL('./', BASE).href));
        })
    );
    return;
  }

  // Para scripts JS críticos (incluyendo qr-scanner.js): Cache First con network update en background
  if (url.pathname.includes('.js') || url.pathname.includes('qr-scanner')) {
    event.respondWith(
      caches.match(req)
        .then(cachedResponse => {
          // Actualizar en background
          const fetchPromise = fetch(req)
            .then(response => {
              if (response && response.status === 200) {
                const responseToCache = response.clone();
                caches.open(CACHE_NAME).then(cache => cache.put(req, responseToCache));
              }
              return response;
            })
            .catch(() => null);

          // Retornar cached inmediatamente si existe, sino esperar fetch
          return cachedResponse || fetchPromise;
        })
    );
    return;
  }

  // Para CSS: Cache First con network fallback
  if (url.pathname.includes('.css')) {
    event.respondWith(
      caches.match(req)
        .then(cachedResponse => {
          if (cachedResponse) {
            // Actualizar en background
            fetch(req).then(response => {
              if (response && response.status === 200) {
                caches.open(CACHE_NAME).then(cache => cache.put(req, response.clone()));
              }
            }).catch(() => {});
            
            return cachedResponse;
          }
          
          return fetch(req).then(response => {
            if (response && response.status === 200) {
              const responseToCache = response.clone();
              caches.open(CACHE_NAME).then(cache => cache.put(req, responseToCache));
            }
            return response;
          });
        })
    );
    return;
  }

  // Para otros recursos (imágenes, fuentes, etc): Cache First
  event.respondWith(
    caches.match(req)
      .then(cachedResponse => {
        if (cachedResponse) {
          return cachedResponse;
        }
        
        return fetch(req)
          .then(response => {
            // Solo cachear respuestas válidas
            if (!response || response.status !== 200 || response.type === 'opaque') {
              return response;
            }
            
            const responseToCache = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(req, responseToCache));
            return response;
          })
          .catch(() => {
            // Fallback para imágenes
            if (req.destination === 'image') {
              return caches.match(new URL('icons/icon-192.png', BASE).href);
            }
            return null;
          });
      })
  );
});

// Manejar mensajes del cliente
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'CHECK_VERSION') {
    event.ports[0].postMessage({ version: CACHE_NAME });
  }
});

console.log('[SW] 📱 Service Worker cargado - Versión:', CACHE_NAME);