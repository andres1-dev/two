// Service Worker para PandaDash - v9.6 ULTRA OPTIMIZADO
const CACHE_NAME = 'pandadash-v9.65';

const ASSETS_TO_CACHE = [
  'icons/icon-192.png',
  'icons/icon-256.png',
  'icons/icon-384.png',
  'icons/icon-512.png',
  'icons/icon-512-maskable.png',
  'icons/icon-1024.png',
  'icons/favicon.ico'
];

// Configuración de polling
let API_URL_POLLING = null;
let USER_ID_POLLING = null;
let POLLING_INTERVAL = 60000; // 1 minuto
let lastNotifTimestamp = 0;
let pollingTimer = null;

// IndexedDB optimizado
const DB_NAME = 'PandaDashNotifications';
const DB_VERSION = 1;

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
  try {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('config', 'readwrite');
      tx.objectStore('config').put(value, key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (e) {
    console.warn('[SW] IndexedDB error:', e);
  }
}

async function getPersistentValue(key) {
  try {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('config', 'readonly');
      const req = tx.objectStore('config').get(key);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  } catch (e) {
    return null;
  }
}

// Instalación
self.addEventListener('install', (event) => {
  console.log('[SW] Instalando...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(ASSETS_TO_CACHE))
      .then(() => self.skipWaiting())
  );
});

// Activación
self.addEventListener('activate', (event) => {
  console.log('[SW] Activando...');
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cache => {
          if (cache !== CACHE_NAME) {
            console.log('[SW] Eliminando cache:', cache);
            return caches.delete(cache);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch básico (solo assets estáticos)
self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (!req.url.startsWith('http') || req.method !== 'GET') return;

  // Solo cachear assets locales
  if (req.url.includes('/icons/') || req.url.includes('favicon.ico')) {
    event.respondWith(
      caches.match(req).then(cached => cached || fetch(req))
    );
  }
});

// Mensajes del cliente
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }

  if (event.data && event.data.type === 'SET_POLLING_CONFIG') {
    API_URL_POLLING = event.data.url;
    USER_ID_POLLING = event.data.userId;
    if (event.data.interval) POLLING_INTERVAL = event.data.interval;

    setPersistentValue('pollingUrl', API_URL_POLLING);
    setPersistentValue('pollingUserId', USER_ID_POLLING);

    console.log('[SW] Polling configurado:', API_URL_POLLING);
    startPolling();
  }
});

// Push real
self.addEventListener('push', (event) => {
  console.log('[SW] Push recibido');

  // Intentar parsear datos directamente
  let notificationData = null;

  if (event.data) {
    try {
      notificationData = event.data.json();
    } catch (e) {
      try {
        // Intentar como texto plano
        const text = event.data.text();
        if (text && text.length > 0) {
          notificationData = { body: text };
        }
      } catch (e2) { }
    }
  }

  if (notificationData && notificationData.title) {
    // Push completo
    event.waitUntil(
      self.registration.showNotification(notificationData.title, {
        body: notificationData.body || 'Nueva notificación',
        icon: notificationData.icon || '/icons/icon-192.png',
        badge: '/icons/icon-192.png',
        vibrate: [200, 100, 200],
        data: { url: notificationData.url || './', timestamp: Date.now() }
      })
    );
  } else {
    // Push vacío (tickle iOS) - obtener del servidor
    event.waitUntil(
      fetchLatestNotification().then(notif => {
        if (notif) {
          return self.registration.showNotification(notif.title || 'PandaDash', {
            body: notif.body || 'Nuevo mensaje',
            icon: '/icons/icon-192.png',
            badge: '/icons/icon-192.png',
            vibrate: [200, 100, 200],
            data: { url: notif.url || './' }
          });
        }
      }).catch(() => {
        // Fallback silencioso
        return self.registration.showNotification('PandaDash', {
          body: 'Tienes un nuevo mensaje',
          icon: '/icons/icon-192.png'
        });
      })
    );
  }
});

// Click en notificación
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const urlToOpen = (event.notification.data && event.notification.data.url) || './';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((windowClients) => {
        for (let client of windowClients) {
          if (client.url.includes(urlToOpen) && 'focus' in client) {
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

// ============================================
// FUNCIONES DE POLLING OPTIMIZADAS
// ============================================

async function startPolling() {
  if (pollingTimer) clearInterval(pollingTimer);

  // Cargar valores persistentes si no están
  if (!API_URL_POLLING) {
    API_URL_POLLING = await getPersistentValue('pollingUrl');
  }

  if (!API_URL_POLLING) {
    console.log('[SW] No hay URL de polling');
    return;
  }

  // Cargar último timestamp
  lastNotifTimestamp = (await getPersistentValue('lastNotifTs')) || 0;

  console.log('[SW] Iniciando polling cada', POLLING_INTERVAL / 1000, 'segundos');

  // Ejecutar inmediatamente
  checkNotifications();

  // Configurar intervalo
  pollingTimer = setInterval(checkNotifications, POLLING_INTERVAL);
}

async function checkNotifications() {
  if (!API_URL_POLLING) return;

  try {
    const fetchUrl = `${API_URL_POLLING}?action=get-latest-notification&_cb=${Date.now()}`;

    const res = await fetch(fetchUrl, {
      cache: 'no-store',
      timeout: 5000 // Timeout implícito
    });

    const data = await res.json();

    if (data.success && data.notification) {
      const ts = parseInt(data.notification.timestamp) || 0;

      if (ts > lastNotifTimestamp) {
        console.log('[SW] Nueva notificación por polling');
        lastNotifTimestamp = ts;
        setPersistentValue('lastNotifTs', ts);

        // Mostrar notificación
        self.registration.showNotification(
          data.notification.title || 'PandaDash',
          {
            body: data.notification.body || 'Nuevo mensaje',
            icon: '/icons/icon-192.png',
            badge: '/icons/icon-192.png',
            vibrate: [200, 100, 200],
            data: { url: data.notification.url || './', polling: true }
          }
        );
      }
    }
  } catch (e) {
    // Silencioso - no loguear errores comunes
    if (!e.message.includes('timeout') && !e.message.includes('network')) {
      console.warn('[SW] Polling error:', e.message);
    }
  }
}

async function fetchLatestNotification() {
  if (!API_URL_POLLING) return null;

  try {
    const res = await fetch(API_URL_POLLING + '?action=get-latest-notification&_cb=' + Date.now(), {
      cache: 'no-store',
      timeout: 3000
    });
    const data = await res.json();
    return data.success ? data.notification : null;
  } catch (e) {
    return null;
  }
}

console.log('[SW] Service Worker v9.6 Optimizado');