// Service Worker para PandaDash - Versión optimizada para PWA
const CACHE_NAME = 'pandadash-v9.3'; // Incrementar versión

const BASE = (new URL('.', self.location)).href;

const RELATIVE_ASSETS = [
  'icons/icon-192.png',
  'icons/icon-256.png',
  'icons/icon-384.png',
  'icons/icon-512.png',
  'icons/icon-512-maskable.png',
  'icons/icon-1024.png',
  'icons/favicon.ico'
];

const EXTERNAL_ASSETS = [
  'https://cdn.jsdelivr.net/npm/html5-qrcode@latest/dist/html5-qrcode.min.js',
  'https://fonts.googleapis.com/css2?family=Roboto:wght@300;400;500;700&display=swap',
  'https://fonts.googleapis.com/css2?family=Inter:wght@500;700&display=swap',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css'
];

const ASSETS_TO_CACHE = [
  ...RELATIVE_ASSETS.map(p => new URL(p, BASE).href)
];

let API_URL_POLLING = null;
let USER_ID_POLLING = null;

const DB_NAME = 'PandaDashNotifications';
const DB_VERSION = 1;

// Inicializar IndexedDB
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

// Instalación
self.addEventListener('install', (event) => {
  console.log('[SW] 🔧 Instalando Service Worker...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[SW] Cacheando assets locales...');
        return cache.addAll(ASSETS_TO_CACHE)
          .then(() => {
            console.log('[SW] Assets locales cacheados');
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

// Activación
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

// Fetch strategy
self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);

  if (!req.url.startsWith('http') || req.method !== 'GET') return;

  if (url.hostname.includes('sheets.googleapis.com') || url.hostname.includes('script.google.com')) return;

  const isIcon = url.pathname.includes('/icons/') || url.pathname.includes('favicon.ico');
  const isExternal = EXTERNAL_ASSETS.some(cdn => req.url.startsWith(cdn));

  if (isIcon || isExternal) {
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
    event.respondWith(fetch(req).catch(() => {
      return caches.match(req);
    }));
  }
});

// Mensajes del cliente
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }

  if (event.data && event.data.type === 'CHECK_VERSION') {
    event.ports[0].postMessage({ version: CACHE_NAME });
  }

  if (event.data && event.data.type === 'SET_POLLING_CONFIG') {
    const url = event.data.url;
    const userId = event.data.userId;
    const ts = event.data.lastTs || 0;

    setPersistentValue('pollingUrl', url);
    setPersistentValue('pollingUserId', userId);

    const currentTs = getPersistentValue('lastNotifTs') || 0;
    if (ts > currentTs) {
      setPersistentValue('lastNotifTs', ts);
    }

    API_URL_POLLING = url;
    USER_ID_POLLING = userId;
    console.log('[SW] URL de Polling y User ID configurados');
    startBackgroundPolling();
  }

  if (event.data && event.data.type === 'CHECK_NOW') {
    checkNotifications();
  }
});

let pollingActive = false;

async function startBackgroundPolling() {
  if (pollingActive) return;
  pollingActive = true;

  if (!API_URL_POLLING) {
    API_URL_POLLING = await getPersistentValue('pollingUrl');
  }
  if (!USER_ID_POLLING) {
    USER_ID_POLLING = await getPersistentValue('pollingUserId');
  }

  console.log('[SW] Iniciando ciclo de polling en segundo plano...');

  setInterval(async () => {
    await checkNotifications();
  }, 60000);

  await checkNotifications();
}

async function checkNotifications() {
  const url = API_URL_POLLING || await getPersistentValue('pollingUrl');
  const userId = USER_ID_POLLING || await getPersistentValue('pollingUserId');

  if (!url || !userId) {
    console.log('[SW Polling] Sin URL o User ID, abortando check.');
    return;
  }

  try {
    const lastTs = await getPersistentValue('lastNotifTs') || 0;
    const fetchUrl = `${url}${url.includes('?') ? '&' : '?'}action=check_notification&userId=${encodeURIComponent(userId)}&_cb=${Date.now()}`;

    console.log(`[SW Polling] Consultando servidor para usuario ${userId}...`);
    const res = await fetch(fetchUrl);
    const data = await res.json();

    if (data.success && data.notification) {
      const notif = data.notification;
      const ts = parseInt(notif.timestamp);

      if (ts > lastTs) {
        console.log(`[SW Polling] ¡Nueva notificación para usuario ${userId}!`);
        await setPersistentValue('lastNotifTs', ts);

        self.registration.showNotification(notif.title || 'PandaDash', {
          body: notif.body || 'Nuevo aviso del sistema',
          icon: './icons/icon-192.png',
          badge: './icons/icon-192.png',
          tag: 'panda-notif',
          vibrate: [200, 100, 200],
          data: { url: './' }
        });
      } else {
        console.log('[SW Polling] Sin cambios (TS no ha incrementado)');
      }
    }
  } catch (e) {
    console.warn('[SW Polling] Error de conexión:', e.message);
  }
}

// Push real
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

// Click en notificación
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

// Periodic Sync
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'check-notif') {
    event.waitUntil(checkNotifications());
  }
});

console.log('[SW] Service Worker cargado - Versión:', CACHE_NAME);

// INICIO AUTOMÁTICO
startBackgroundPolling();