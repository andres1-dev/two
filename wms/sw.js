// sw.js - Service Worker optimizado para iOS PWA
const CACHE_NAME = 'wms-cdi-cache-v2-ios';
const BASE = (new URL('.', self.location)).href;

// Assets críticos para caching
const CRITICAL_ASSETS = [
  './',
  './index.html',
  './css/styles.css',
  './js/app.js',
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
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css',
  'https://fonts.googleapis.com/icon?family=Material+Icons',
  'https://cdn.jsdelivr.net/npm/quagga@0.12.1/dist/quagga.min.js',
  'https://unpkg.com/html5-qrcode@2.3.8/html5-qrcode.min.js',
  'https://unpkg.com/@zxing/library@latest'
];

// Instalación optimizada para iOS
self.addEventListener('install', (event) => {
  console.log('🟢 Service Worker instalando...');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('📦 Cacheando assets críticos...');
        // Cachear solo assets críticos primero para instalación rápida
        return cache.addAll(CRITICAL_ASSETS)
          .then(() => {
            console.log('✅ Assets críticos cacheados');
            // Cachear iconos en segundo plano
            return cache.addAll(ICON_ASSETS);
          })
          .then(() => {
            console.log('✅ Iconos cacheados');
          })
          .catch(err => {
            console.log('⚠️ Error cacheando algunos assets:', err);
            // No fallar la instalación por errores de cache
          });
      })
      .then(() => {
        console.log('🚀 Service Worker instalado - Saltando espera');
        return self.skipWaiting();
      })
  );
});

// Activación y limpieza
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
      console.log('✅ Service Worker activado - Reclamando clientes');
      return self.clients.claim();
    })
  );
});

// Estrategia de fetch optimizada para iOS
self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);

  // Evitar cachear requests de cámara y APIs externas
  if (request.url.includes('googleapis.com') || 
      request.url.includes('zxing') ||
      request.url.includes('quagga') ||
      request.url.includes('html5-qrcode') ||
      request.destination === 'video' ||
      request.method !== 'GET') {
    return; // Dejar que pasen directamente a network
  }

  // Para navegación (HTML) - Network First
  if (request.mode === 'navigate' || request.destination === 'document') {
    event.respondWith(
      fetch(request)
        .then(response => {
          // Cachear solo si la respuesta es válida
          if (response.status === 200) {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then(cache => {
              cache.put(request, responseClone);
            });
          }
          return response;
        })
        .catch(() => {
          // Fallback a cache para offline
          return caches.match(request)
            .then(cached => {
              if (cached) return cached;
              // Fallback a index.html si no hay cache
              return caches.match(new URL('./index.html', BASE).href);
            });
        })
    );
    return;
  }

  // Para CSS, JS, imágenes - Cache First con actualización
  if (request.destination === 'style' || 
      request.destination === 'script' || 
      request.destination === 'image') {
    
    event.respondWith(
      caches.match(request)
        .then(cachedResponse => {
          // Devolver cacheado inmediatamente
          if (cachedResponse) {
            // Actualizar cache en segundo plano
            fetchAndCache(request);
            return cachedResponse;
          }
          
          // Si no está en cache, buscar en network
          return fetchAndCache(request)
            .catch(() => {
              // Fallback para iconos
              if (request.destination === 'image') {
                return caches.match(new URL('icons/icon-192.png', BASE).href);
              }
              return new Response('Offline', { 
                status: 408, 
                statusText: 'Offline' 
              });
            });
        })
    );
    return;
  }

  // Para recursos externos (FontAwesome, Google Fonts, etc.)
  if (EXTERNAL_ASSETS.some(asset => request.url.includes(asset))) {
    event.respondWith(
      caches.match(request)
        .then(cached => {
          if (cached) return cached;
          return fetchAndCache(request);
        })
        .catch(() => {
          // Para fuentes, devolver respuesta vacía en lugar de error
          if (request.destination === 'font') {
            return new Response('', { status: 200, statusText: 'OK' });
          }
          throw new Error('Offline');
        })
    );
    return;
  }

  // Estrategia por defecto: Network First
  event.respondWith(
    fetch(request)
      .then(response => {
        // Cachear respuestas exitosas
        if (response.status === 200) {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(request, responseClone);
          });
        }
        return response;
      })
      .catch(() => {
        return caches.match(request);
      })
  );
});

// Función helper para fetch y cache
function fetchAndCache(request) {
  return fetch(request)
    .then(response => {
      // Solo cachear respuestas válidas
      if (!response || response.status !== 200 || response.type === 'opaque') {
        return response;
      }
      
      const responseToCache = response.clone();
      caches.open(CACHE_NAME)
        .then(cache => {
          cache.put(request, responseToCache);
        });
      
      return response;
    });
}

// Manejar mensajes del cliente
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Manejar sync en background (para futuras funcionalidades)
self.addEventListener('sync', (event) => {
  console.log('🔄 Background sync:', event.tag);
});

// Manejar push notifications (para futuras funcionalidades)
self.addEventListener('push', (event) => {
  if (!event.data) return;
  
  const data = event.data.json();
  const options = {
    body: data.body || 'Notificación WMS',
    icon: new URL('icons/icon-192.png', BASE).href,
    badge: new URL('icons/icon-192.png', BASE).href,
    vibrate: [100, 50, 100],
    data: {
      url: data.url || './'
    }
  };
  
  event.waitUntil(
    self.registration.showNotification(data.title || 'WMS', options)
  );
});

// Manejar clics en notificaciones
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  event.waitUntil(
    clients.matchAll({ type: 'window' })
      .then(clientList => {
        // Buscar ventana existente
        for (const client of clientList) {
          if (client.url === event.notification.data.url && 'focus' in client) {
            return client.focus();
          }
        }
        
        // Abrir nueva ventana si no existe
        if (clients.openWindow) {
          return clients.openWindow(event.notification.data.url);
        }
      })
  );
});

console.log('🎯 Service Worker cargado - Optimizado para iOS PWA');