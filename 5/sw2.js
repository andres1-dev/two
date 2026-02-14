// Service Worker para PandaDash - Versión optimizada para PWA
const CACHE_NAME = 'pandadash-v9.2';

// Base URL relativa al lugar donde está este archivo sw.js
const BASE = (new URL('.', self.location)).href;

// Lista de assets locales (SOLO ICONOS)
const RELATIVE_ASSETS = [
  'icons/icon-192.png',
  'icons/icon-256.png',
  'icons/icon-384.png',
  'icons/icon-512.png',
  'icons/icon-512-maskable.png',
  'icons/icon-1024.png',
  'icons/favicon.ico'
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
        console.log('[SW] Cacheando assets locales...');
        // Cachear assets locales primero
        return cache.addAll(ASSETS_TO_CACHE)
          .then(() => {
            console.log('[SW] Assets locales cacheados');
            // Cachear CDNs externos uno por uno (sin fallar si alguno falla)
            return Promise.allSettled(
              EXTERNAL_ASSETS.map(url =>
                cache.add(url)
                  .then(() => console.log(`[SW] Cacheado: ${url}`))
                  .catch(err => {
                    console.warn(`[SW] No se pudo cachear ${url}:`, err.message);
                    return null;
                  })
              )
            );
          });
      })
      .then(() => {
        console.log('[SW] Instalación completada');
        return self.skipWaiting();
      })
      .catch(err => {
        console.error('[SW] Error durante instalación:', err);
      })
  );
});

// Activación y limpieza de versiones antiguas
self.addEventListener('activate', (event) => {
  console.log('[SW] Activando Service Worker...');
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cache => {
          if (cache !== CACHE_NAME) {
            console.log('[SW] Eliminando cache antiguo:', cache);
            return caches.delete(cache);
          }
        })
      );
    }).then(() => {
      console.log('[SW] Service Worker activado');
      return self.clients.claim();
    })
  );
});

// Estrategia de fetch: Solo cache para Icons y CDNs externos
self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // Ignorar requests no-HTTP o no-GET
  if (!req.url.startsWith('http') || req.method !== 'GET') return;

  // Ignorar APIs decididamente
  if (url.hostname.includes('sheets.googleapis.com') || url.hostname.includes('script.google.com')) return;

  // Determinar si es un recurso que queremos en cache (ICONOS o CDNS)
  const isIcon = url.pathname.includes('/icons/') || url.pathname.includes('favicon.ico');
  const isExternal = EXTERNAL_ASSETS.some(cdn => req.url.startsWith(cdn));

  if (isIcon || isExternal) {
    // Estrategia: Cache First (para assets que casi nunca cambian)
    event.respondWith(
      caches.match(req).then(cached => {
        return cached || fetch(req).then(response => {
          if (response && response.status === 200) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(req, copy));
          }
          return response;
        });
      })
    );
  } else {
    // Estrategia: Network Only para todo lo demás (HTML, JS locales, CSS locales)
    // Esto garantiza que siempre se use la última versión del código
    event.respondWith(fetch(req).catch(() => {
      // Si falla la red, intentar buscar en cache antiguo como último recurso
      return caches.match(req);
    }));
  }
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

console.log('[SW] Service Worker cargado - Versión:', CACHE_NAME);

// --- PUSH NOTIFICATIONS & BACKGROUND POLLING ---

let API_URL_POLLING = null;
let lastNotifTs = 0;

// Escuchar URL de polling desde el cliente
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SET_POLLING_CONFIG') {
    API_URL_POLLING = event.data.url;
    lastNotifTs = event.data.lastTs || 0;
    console.log('[SW] URL de Polling configurada');

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
  console.log('[SW] Push Recibido');

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
  console.log('[SW] Click en notificación', event.notification.tag);

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