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

console.log('[SW] 📱 Service Worker cargado - Versión:', CACHE_NAME);

// --- PUSH NOTIFICATIONS & BACKGROUND POLLING ---

let API_URL_POLLING = null;
let lastNotifTs = 0;

// Escuchar URL de polling desde el cliente
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SET_POLLING_CONFIG') {
    API_URL_POLLING = event.data.url;
    lastNotifTs = event.data.lastTs || 0;
    console.log('[SW] 📡 URL de Polling configurada');

    // Iniciar polling si no ha iniciado
    startBackgroundPolling();
  }
});

let pollingStarted = false;
function startBackgroundPolling() {
  if (pollingStarted) return;
  pollingStarted = true;

  // Chequeo cada 2 minutos en background (para no agotar batería/GAS)
  setInterval(async () => {
    if (!API_URL_POLLING) return;

    try {
      const res = await fetch(`${API_URL_POLLING}?action=check_notification`);
      const data = await res.json();

      if (data.success && data.notification) {
        const ts = parseInt(data.notification.timestamp);
        if (ts > lastNotifTs) {
          lastNotifTs = ts;
          self.registration.showNotification(data.notification.title || 'Aviso PandaDash', {
            body: data.notification.body || 'Nueva notificación en segundo plano',
            icon: './icons/icon-192.png',
            badge: './icons/icon-192.png',
            data: { url: './' }
          });
        }
      }
    } catch (e) { }
  }, 120000);
}

// Evento Push (Background Real)
self.addEventListener('push', (event) => {
  console.log('[SW] 🔔 Push Recibido');

  let data = { title: 'Nueva Notificación', body: 'Revisa la aplicación para más detalles.' };

  try {
    if (event.data) {
      data = event.data.json();
    }
  } catch (e) {
    if (event.data) {
      data.body = event.data.text();
    }
  }

  const options = {
    body: data.body,
    icon: './icons/icon-192.png',
    badge: './icons/icon-192.png',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1,
      targetUrl: data.url || './'
    },
    actions: [
      { action: 'explore', title: 'Ver Detalles', icon: './icons/checkmark.png' },
      { action: 'close', title: 'Cerrar', icon: './icons/xmark.png' },
    ]
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// Click en Notificación
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] 👆 Click en notificación', event.notification.tag);

  event.notification.close();

  if (event.action === 'close') {
    return;
  }

  // Abrir o enfocar ventana
  event.waitUntil(
    clients.matchAll({
      type: 'window',
      includeUncontrolled: true
    }).then((windowClients) => {
      // Si ya hay una ventana abierta, enfocarla
      if (windowClients.length > 0) {
        const client = windowClients[0];
        if (client.url && 'focus' in client) {
          return client.focus();
        }
      }
      // Si no, abrir una nueva
      if (clients.openWindow) {
        return clients.openWindow('./');
      }
    })
  );
});