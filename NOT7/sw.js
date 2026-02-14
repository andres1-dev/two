// Service Worker para PandaDash - Versión optimizada para PWA
const CACHE_NAME = 'pandadash-v10.4';

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
  'js/push_notificaciones.js',
  /* icons */
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
  console.log('[SW] 🔧 Instalando Service Worker v10.3...');
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[SW] 📦 Cacheando assets...');
        return cache.addAll(ASSETS_TO_CACHE)
          .then(() => {
            return Promise.allSettled(
              EXTERNAL_ASSETS.map(url =>
                cache.add(url).catch(err => console.warn(`[SW] CDN Falló: ${url}`))
              )
            );
          });
      })
  );
});

// Activación y limpieza
self.addEventListener('activate', (event) => {
  console.log('[SW] 🚀 Activando Service Worker...');
  event.waitUntil(
    Promise.all([
      self.clients.claim(),
      caches.keys().then(cacheNames => {
        return Promise.all(
          cacheNames.map(cache => {
            if (cache !== CACHE_NAME) return caches.delete(cache);
          })
        );
      })
    ])
  );
});

// Estrategia de fetch
self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  event.respondWith(
    caches.match(req).then(cached => {
      return cached || fetch(req).then(res => {
        if (!res || res.status !== 200 || res.type === 'opaque') return res;
        const clone = res.clone();
        caches.open(CACHE_NAME).then(c => c.put(req, clone));
        return res;
      }).catch(() => null);
    })
  );
});

// Manejar click en la notificación
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      for (const c of list) {
        if (c.url.includes(self.location.origin) && 'focus' in c) return c.focus();
      }
      if (clients.openWindow) return clients.openWindow('./');
    })
  );
});

// --- POLLING DE NOTIFICACIONES (BYPASS GET/DOGET) ---
let lastCheckedNotif = 0;
const GAS_URL = 'https://script.google.com/macros/s/AKfycbyOwBp1er4nu9Uth2nS5rY2tYfvY-NMdWJkA3dIjmuaVUTLvnUyKtJIG62ACK22RpNWRQ/exec';

async function checkBackgroundNotifications() {
  try {
    console.log('[SW] 🔍 Revisando servidor (GET) para notificaciones...');

    // Volvemos a GET porque el usuario GARANTIZÓ que modificará el GAS con doGet
    const response = await fetch(`${GAS_URL}?action=check_notification&t=${Date.now()}`, {
      method: 'GET',
      mode: 'cors',
      cache: 'no-store'
    });

    const data = await response.json();

    if (data.success && data.notification) {
      const ts = data.notification.timestamp;
      const now = Date.now();

      // Si es la primera vez, solo marcamos el tiempo actual
      if (lastCheckedNotif === 0) {
        lastCheckedNotif = ts;
        return;
      }

      if (ts > lastCheckedNotif) {
        lastCheckedNotif = ts;
        console.log('[SW] 🔔 Notificación detectada:', data.notification.title);

        const options = {
          body: data.notification.body,
          icon: 'icons/icon-192.png',
          badge: 'icons/icon-192.png',
          vibrate: [200, 100, 200, 100, 200],
          tag: 'panda-global-push',
          renotify: true,
          requireInteraction: true,
          data: { url: self.location.origin }
        };

        await self.registration.showNotification(data.notification.title, options);
      }
    }
  } catch (e) {
    console.error('[SW] Polling error:', e);
  }
}

// Iniciar revisión cada 10 segundos
setInterval(checkBackgroundNotifications, 10000);
checkBackgroundNotifications();

console.log('[SW] 📱 PWA Ready - v10.3');