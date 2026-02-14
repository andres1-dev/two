// Service Worker para PandaDash - Versión optimizada para PWA
const CACHE_NAME = 'pandadash-v9.2';

// Base URL relativa al lugar donde está este archivo sw.js
const BASE = (new URL('.', self.location)).href;

// Lista COMPLETA de assets locales
const RELATIVE_ASSETS = [
  '',
  'index.html',
  'css/estilos_base.css',
  'css/estilos_interfaz.css',
  'css/estilos_contenido.css',
  'css/estilos_qr_escaner.css',
  /* scripts principales */
  'js/configuracion.js',
  'js/sonidos.js',
  'js/interfaz.js',
  'js/renderizado.js',
  'js/principal.js',
  'js/datos.js',
  'js/lector_qr.js',
  'js/camara.js',
  'js/qr_escaner.js',
  'js/cola_carga.js',
  'js/inicio.js',
  /* icons */
  'icons/icon-192.png',
  'icons/icon-256.png',
  'icons/icon-384.png',
  'icons/icon-512.png',
  'icons/icon-512-maskable.png',
  'icons/icon-1024.png',
  'icons/favicon.ico',
  /*'manifest.json'*/
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
  console.log('[SW] 🔧 Instalando Service Worker v9.2...');
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

  // Ignorar requests a APIs de Google (Sheets y Script) para garantizar datos frescos
  if (url.hostname.includes('sheets.googleapis.com') ||
    url.hostname.includes('script.google.com')) {
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

  // Para scripts JS críticos (incluyendo qr_escaner.js): Cache First con network update en background
  if (url.pathname.includes('.js') || url.pathname.includes('qr_escaner')) {
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
            }).catch(() => { });

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

// Manejar click en la notificación
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Intentar enfocar una ventana existente
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          return client.focus();
        }
      }
      // Si no hay ventana abierta, abrir una nueva
      if (clients.openWindow) {
        return clients.openWindow('./');
      }
    })
  );
});

// --- POLLING DE NOTIFICACIONES (SOLUCIÓN INTERNA) ---
let lastCheckedNotif = 0;
const GAS_URL = 'https://script.google.com/macros/s/AKfycbyOwBp1er4nu9Uth2nS5rY2tYfvY-NMdWJkA3dIjmuaVUTLvnUyKtJIG62ACK22RpNWRQ/exec';

async function checkBackgroundNotifications() {
  try {
    console.log('[SW] 🔍 Revisando servidor para notificaciones...');

    // Añadimos cache: 'no-store' para evitar respuestas viejas del navegador
    const response = await fetch(`${GAS_URL}?action=check_notification&t=${Date.now()}`, {
      cache: 'no-store'
    });
    const data = await response.json();

    if (data.success && data.notification) {
      const ts = data.notification.timestamp;

      // Si es la primera vez que arranca el SW, ignoramos las viejas para no molestar
      if (lastCheckedNotif === 0) {
        lastCheckedNotif = ts;
        console.log('[SW] Marcador inicial establecido:', ts);
        return;
      }

      if (ts > lastCheckedNotif) {
        lastCheckedNotif = ts;

        console.log('[SW] 🔔 Notificación nueva detectada:', data.notification.title);

        const options = {
          body: data.notification.body,
          icon: 'icons/icon-192.png',
          badge: 'icons/icon-192.png',
          vibrate: [200, 100, 200, 100, 200],
          tag: 'panda-global-push',
          renotify: true,
          requireInteraction: true,
          data: {
            url: self.location.origin
          }
        };

        if (self.registration && self.registration.showNotification) {
          await self.registration.showNotification(data.notification.title, options);
        }
      }
    }
  } catch (e) {
    console.error('[SW] Error en polling:', e);
  }
}

// Iniciar polling
setInterval(checkBackgroundNotifications, 30000); // Cada 30 segundos

// Iniciar una revisión inmediata al cargar
checkBackgroundNotifications();

console.log('[SW] 📱 Service Worker cargado - Versión:', CACHE_NAME);