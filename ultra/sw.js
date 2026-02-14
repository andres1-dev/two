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
const DB_NAME = 'PandaDashNotifications';
const DB_VERSION = 1;

// Inicializar IndexedDB para persistencia (las variables en SW mueren al cerrarse)
async function getDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains('config')) {
        db.createObjectStore('config');
      }
    };
    request.onsuccess = (e) => resolve(e.target.result);
    request.onerror = (e) => reject(e.target.error);
  });
}

async function setPersistentValue(key, value) {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('config', 'readwrite');
    tx.objectStore('config').put(value, key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function getPersistentValue(key) {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('config', 'readonly');
    const req = tx.objectStore('config').get(key);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

// Escuchar URL de polling desde el cliente
self.addEventListener('message', async (event) => {
  if (event.data && event.data.type === 'SET_POLLING_CONFIG') {
    const url = event.data.url;
    const ts = event.data.lastTs || 0;

    await setPersistentValue('pollingUrl', url);
    // Solo actualizar TS si el que viene es mayor al guardado
    const currentTs = await getPersistentValue('lastNotifTs') || 0;
    if (ts > currentTs) {
      await setPersistentValue('lastNotifTs', ts);
    }

    API_URL_POLLING = url;
    console.log('[SW] URL de Polling configurada y persistida');
    startBackgroundPolling();
  }
});

let pollingActive = false;
async function startBackgroundPolling() {
  if (pollingActive) return;
  pollingActive = true;

  // Intentar recuperar URL si no está en memoria
  if (!API_URL_POLLING) {
    API_URL_POLLING = await getPersistentValue('pollingUrl');
  }

  // Intervalo de polling (Ajustado a 1 minuto para Android)
  // Nota: iOS matará este proceso rápidamente al cerrar la app.
  setInterval(async () => {
    await checkNotifications();
  }, 60000);
}

async function checkNotifications() {
  const url = API_URL_POLLING || await getPersistentValue('pollingUrl');
  if (!url) return;

  try {
    const lastTs = await getPersistentValue('lastNotifTs') || 0;
    const fetchUrl = `${url}${url.includes('?') ? '&' : '?'}action=check_notification&_cb=${Date.now()}`;

    const res = await fetch(fetchUrl);
    const data = await res.json();

    if (data.success && data.notification) {
      const notif = data.notification;
      const ts = parseInt(notif.timestamp);

      if (ts > lastTs) {
        await setPersistentValue('lastNotifTs', ts);

        self.registration.showNotification(notif.title || 'PandaDash', {
          body: notif.body || 'Nuevo aviso del sistema',
          icon: './icons/icon-192.png',
          badge: './icons/icon-192.png',
          tag: 'panda-notif-' + ts,
          vibrate: [200, 100, 200],
          data: { url: './' }
        });
      }
    }
  } catch (e) {
    console.warn('[SW Polling] Error:', e.message);
  }
}

// Evento Push (Background Real - Wakes up SW on Android/iOS)
self.addEventListener('push', (event) => {
  console.log('[SW] Push real recibido');
  let data = { title: 'PandaDash', body: 'Nueva notificación recibida' };

  try {
    if (event.data) {
      data = event.data.json();
    }
  } catch (e) {
    if (event.data) data.body = event.data.text();
  }

  const options = {
    body: data.body,
    icon: './icons/icon-192.png',
    badge: './icons/icon-192.png',
    vibrate: [200, 100, 200],
    tag: data.tag || 'push-notif',
    data: { url: data.url || './' }
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// Click en Notificación
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const urlToOpen = (event.notification.data && event.notification.data.url) ? event.notification.data.url : './';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((windowClients) => {
        for (let client of windowClients) {
          if (client.url === urlToOpen && 'focus' in client) {
            return client.focus();
          }
        }
        if (clients.openWindow) {
          return clients.openWindow(urlToOpen);
        }
      })
  );
});

// Periodic Sync (Android Chrome Bridge)
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'check-notif') {
    event.waitUntil(checkNotifications());
  }
});