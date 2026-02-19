// Service Worker para PandaDash - Versión optimizada para PWA
const CACHE_NAME = 'pandadash-v9.5'; // Incrementar versión

const BASE = (new URL('.', self.location)).href;

const RELATIVE_ASSETS = [
  /*'',
  'index.html',
  'css/estilos_admin.css',
  'css/estilos_base.css',
  'css/estilos_contenido.css',
  'css/estilos_interfaz.css',
  'css/estilos_qr_escaner.css',
  'css/estilos_soporte_grid.css',
  'css/estilos_soporte.css',
  'css/estilos_upload.css', */
  /* scripts principales */
  /*'js/admin_usuarios.js',
  'js/auth.js',
  'js/camara.js',
  'js/cola_carga.js',
  'js/configuracion.js',
  'js/datos.js',
  'js/historial.js',
  'js/inicio.js',
  'js/interfaz.js',
  'js/lector_qr.js',
  'js/principal.js',
  'js/qr_escaner.js',
  'js/renderizado.js',
  'js/sonidos.js',
  'js/soporte_grid.js',
  'js/upload_siesa.js',*/
  /* icons */
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

// ============================================
// sw.js (Fragmento modificado)
// ============================================

async function checkNotifications() {
  const url = API_URL_POLLING || await getPersistentValue('pollingUrl');

  if (!url) {
    console.log('[SW Polling] Sin URL configurada, abortando check.');
    return;
  }

  try {
    const lastTs = (await getPersistentValue('lastNotifTs')) || 0;
    // ⭐ r1 usa action=get-latest-notification vía GET
    const fetchUrl = `${url}?action=get-latest-notification&_cb=${Date.now()}`;

    console.log('[SW Polling] Consultando servidor r1...');
    const res = await fetch(fetchUrl);
    const data = await res.json();

    if (data.success && data.notification) {
      const notif = data.notification;
      const ts = parseInt(notif.timestamp) || 0;

      // --- INICIO DE LA MODIFICACIÓN ---
      // Obtener la hora actual en milisegundos
      const now = Date.now();

      // Calcular la diferencia de tiempo (timestamp de la notificación vs ahora)
      // El timestamp de la notificación podría ser más antiguo, pero la diferencia será pequeña.
      const timeDiff = now - ts;

      // Si la notificación es MUY reciente (menos de 5 segundos/5000 ms), la ignoramos.
      // Esto evita que el polling muestre la notificación que acaba de ser enviada por el push real.
      if (timeDiff < 5000) {
        console.log('[SW Polling] Notificación reciente ignorada para evitar duplicado. Diferencia de tiempo:', timeDiff, 'ms');
        return;
      }
      // --- FIN DE LA MODIFICACIÓN ---

      if (ts > lastTs) {
        console.log('[SW Polling] ¡Nueva notificación recibida de r1!');
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

// Push real — compatible con r1 (payload directo en Android, tickle vacío en iOS)
const R1_GAS_URL = 'https://script.google.com/macros/s/AKfycbwreGMo-ZITm8PUkGJfMVu1cwKMsnUhfD1BZO18qFBa9CFcWd50VzBDKwDMKCubYhg5Cg/exec';

self.addEventListener('push', (event) => {
  console.log('[SW] Push real recibido');

  const getPayload = new Promise((resolve, reject) => {
    // Intentar leer payload directo (Android/Chrome)
    if (event.data) {
      try {
        const json = event.data.json();
        if (json && json.title) {
          console.log('[SW] Datos recibidos en payload directo');
          resolve(json);
          return;
        }
      } catch (e) {
        console.log('[SW] Payload no es JSON válido');
      }
    }

    // Sin payload (iOS tickle) → fetch desde r1
    console.log('[SW] Sin payload, obteniendo de r1...');
    const cacheBuster = '&t=' + Date.now();
    fetch(R1_GAS_URL + '?action=get-latest-notification' + cacheBuster)
      .then(res => res.json())
      .then(data => {
        if (data.success && data.notification) {
          resolve(data.notification);
        } else {
          reject('No hay notificaciones recientes');
        }
      })
      .catch(err => reject(err));
  });

  event.waitUntil(
    getPayload
      .then(payload => {
        const title = payload.title || 'PandaDash';
        const options = {
          body: payload.body || 'Tienes un mensaje nuevo',
          icon: './icons/icon-192.png',
          badge: './icons/icon-192.png',
          vibrate: [200, 100, 200],
          tag: 'push-notif',
          data: { url: payload.url || './', timestamp: Date.now() }
        };
        return self.registration.showNotification(title, options);
      })
      .catch(err => {
        console.error('[SW] Error procesando push:', err);
        return self.registration.showNotification('PandaDash', {
          body: 'Abre la app para ver el mensaje',
          icon: './icons/icon-192.png',
          data: { url: './' }
        });
      })
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