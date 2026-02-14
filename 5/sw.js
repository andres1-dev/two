// Service Worker para PandaDash - Versión optimizada para PWA
const CACHE_NAME = 'pandadash-v9.3';

// Base URL relativa
const BASE = (new URL('.', self.location)).href;

// Assets locales COMPLETOS
const RELATIVE_ASSETS = [
  '',
  'index.html',

  // CSS
  'css/estilos_base.css',
  'css/estilos_interfaz.css',
  'css/estilos_contenido.css',
  'css/estilos_qr_escaner.css',

  // JS
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

  // Icons
  'icons/icon-192.png',
  'icons/icon-256.png',
  'icons/icon-384.png',
  'icons/icon-512.png',
  'icons/icon-512-maskable.png',
  'icons/icon-1024.png',
  'icons/favicon.ico'
];

// CDNs externos
const EXTERNAL_ASSETS = [
  'https://cdn.jsdelivr.net/npm/html5-qrcode@latest/dist/html5-qrcode.min.js',
  'https://fonts.googleapis.com/css2?family=Roboto:wght@300;400;500;700&display=swap',
  'https://fonts.googleapis.com/css2?family=Inter:wght@500;700&display=swap',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css'
];

const ASSETS_TO_CACHE = [
  ...RELATIVE_ASSETS.map(p => new URL(p, BASE).href)
];

// ================= INSTALL =================
self.addEventListener('install', event => {
  console.log('[SW] Instalando v9.3...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        return cache.addAll(ASSETS_TO_CACHE)
          .then(() => {
            return Promise.allSettled(
              EXTERNAL_ASSETS.map(url => cache.add(url))
            );
          });
      })
      .then(() => self.skipWaiting())
  );
});

// ================= ACTIVATE =================
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(names =>
      Promise.all(
        names.map(name => {
          if (name !== CACHE_NAME) {
            return caches.delete(name);
          }
        })
      )
    ).then(() => self.clients.claim())
  );
});

// ================= FETCH =================
self.addEventListener('fetch', event => {

  const req = event.request;
  const url = new URL(req.url);

  if (!req.url.startsWith('http') || req.method !== 'GET') return;

  // Ignorar APIs Google
  if (
    url.hostname.includes('sheets.googleapis.com') ||
    url.hostname.includes('script.google.com')
  ) return;

  // -------- HTML → Network First --------
  if (req.mode === 'navigate' || req.destination === 'document') {
    event.respondWith(
      fetch(req)
        .then(res => {
          const copy = res.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(req, copy));
          return res;
        })
        .catch(() =>
          caches.match(req).then(cached =>
            cached || caches.match(new URL('./', BASE).href)
          )
        )
    );
    return;
  }

  // -------- JS → Cache First + Update --------
  if (url.pathname.endsWith('.js')) {
    event.respondWith(
      caches.match(req).then(cached => {

        const fetchPromise = fetch(req)
          .then(res => {
            if (res && res.status === 200) {
              const copy = res.clone();
              caches.open(CACHE_NAME).then(cache => cache.put(req, copy));
            }
            return res;
          })
          .catch(() => null);

        return cached || fetchPromise;
      })
    );
    return;
  }

  // -------- CSS → Cache First + Update --------
  if (url.pathname.endsWith('.css')) {
    event.respondWith(
      caches.match(req).then(cached => {

        if (cached) {
          fetch(req).then(res => {
            if (res && res.status === 200) {
              caches.open(CACHE_NAME).then(cache =>
                cache.put(req, res.clone())
              );
            }
          }).catch(() => { });
          return cached;
        }

        return fetch(req).then(res => {
          if (res && res.status === 200) {
            caches.open(CACHE_NAME).then(cache =>
              cache.put(req, res.clone())
            );
          }
          return res;
        });
      })
    );
    return;
  }

  // -------- Otros recursos → Cache First --------
  event.respondWith(
    caches.match(req).then(cached => {

      if (cached) return cached;

      return fetch(req)
        .then(res => {
          if (!res || res.status !== 200 || res.type === 'opaque') {
            return res;
          }

          caches.open(CACHE_NAME).then(cache =>
            cache.put(req, res.clone())
          );

          return res;
        })
        .catch(() => {
          if (req.destination === 'image') {
            return caches.match(new URL('icons/icon-192.png', BASE).href);
          }
        });
    })
  );
});

// ================= PUSH & BACKGROUND =================

let pollingConfig = {
  url: null,
  lastTs: 0
};

// Escuchar configuración desde la app
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SET_POLLING_CONFIG') {
    pollingConfig.url = event.data.url;
    pollingConfig.lastTs = event.data.lastTs || 0;
    console.log('[SW] Configuración de polling recibida');
    startPolling();
  }
});

let pollingActive = false;
function startPolling() {
  if (pollingActive) return;
  pollingActive = true;

  // Polling en segundo plano (cada 5 minutos para ahorrar batería)
  setInterval(async () => {
    if (!pollingConfig.url) return;

    try {
      const url = `${pollingConfig.url}${pollingConfig.url.includes('?') ? '&' : '?'}action=check_notification`;
      const res = await fetch(url);
      const data = await res.json();

      if (data.success && data.notification) {
        const ts = parseInt(data.notification.timestamp);
        if (ts > pollingConfig.lastTs) {
          pollingConfig.lastTs = ts;

          self.registration.showNotification(data.notification.title || 'PandaDash', {
            body: data.notification.body || 'Nuevas entregas registradas',
            icon: 'icons/icon-192.png',
            badge: 'icons/icon-192.png',
            vibrate: [200, 100, 200],
            data: { url: './' }
          });
        }
      }
    } catch (e) {
      console.warn('[SW] Error en polling:', e);
    }
  }, 300000); // 5 minutos
}

// Escuchar eventos PUSH reales (Ideal para Android e iOS PWA)
self.addEventListener('push', event => {
  console.log('[SW] Push recibido');

  let payload = {
    title: 'PandaDash',
    body: 'Nuevos movimientos en el sistema',
    url: './'
  };

  try {
    if (event.data) {
      payload = event.data.json();
    }
  } catch (e) {
    if (event.data) payload.body = event.data.text();
  }

  const options = {
    body: payload.body,
    icon: 'icons/icon-192.png',
    badge: 'icons/icon-192.png',
    vibrate: [200, 100, 200],
    data: { url: payload.url || './' },
    actions: [
      { action: 'open', title: 'Abrir App' }
    ]
  };

  event.waitUntil(
    self.registration.showNotification(payload.title, options)
  );
});

// Manejar click en la notificación
self.addEventListener('notificationclick', event => {
  event.notification.close();

  const targetUrl = (event.notification.data && event.notification.data.url) ? event.notification.data.url : './';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
      for (const client of clientList) {
        if (client.url === targetUrl && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});