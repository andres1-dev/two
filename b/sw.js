// Service Worker para PandaDash - Versión optimizada para PWA con iconos dinámicos
const CACHE_NAME = 'pandadash-v10.0';

// Base URL relativa
const BASE = (new URL('.', self.location)).href;

// Assets locales - SIN DEPENDENCIA DE ICONOS FÍSICOS
const RELATIVE_ASSETS = [
  '',
  'index.html',
  'manifest.json', // Mantenemos el manifest.json aunque sea dinámico
  'css/estilos_base.css',
  'css/estilos_interfaz.css',
  'css/estilos_contenido.css',
  'css/estilos_qr_escaner.css',
  'css/estilos_admin.css',
  'css/estilos_upload.css',
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
  'js/auth.js',
  'js/admin_usuarios.js',
  'js/historial.js',
  'js/upload_siesa.js',
  'js/generador_iconos.js', // CRÍTICO para PWA
  /* icons - OPCIONALES, ya no son necesarios físicamente */
  'icons/icon-192.png',
  'icons/icon-256.png',
  'icons/icon-384.png',
  'icons/icon-512.png',
  'icons/icon-512-maskable.png',
  'icons/icon-1024.png',
  'icons/favicon.ico'
];

// URLs externas críticas
const EXTERNAL_ASSETS = [
  'https://cdn.jsdelivr.net/npm/html5-qrcode@latest/dist/html5-qrcode.min.js',
  'https://fonts.googleapis.com/css2?family=Roboto:wght@300;400;500;700&display=swap',
  'https://fonts.googleapis.com/css2?family=Inter:wght@500;700&display=swap',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css',
  'https://code.jquery.com/jquery-3.7.0.min.js',
  'https://cdn.datatables.net/1.13.6/css/jquery.dataTables.min.css',
  'https://cdn.datatables.net/responsive/2.5.0/css/responsive.dataTables.min.css',
  'https://cdn.datatables.net/1.13.6/js/jquery.dataTables.min.js',
  'https://cdn.datatables.net/responsive/2.5.0/js/dataTables.responsive.min.js'
];

// Convertir a URLs absolutas
const ASSETS_TO_CACHE = [
  ...RELATIVE_ASSETS.map(p => new URL(p, BASE).href)
];

// Instalación
self.addEventListener('install', (event) => {
  console.log('[SW] Instalando Service Worker v10.0...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[SW] Cacheando assets...');
        return cache.addAll(ASSETS_TO_CACHE)
          .then(() => {
            console.log('[SW] Assets cacheados correctamente');
            return Promise.allSettled(
              EXTERNAL_ASSETS.map(url =>
                cache.add(url).catch(err => {
                  console.warn(`[SW] No se pudo cachear ${url}:`, err.message);
                })
              )
            );
          });
      })
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
            console.log('[SW] Eliminando cache antiguo:', cache);
            return caches.delete(cache);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Estrategia de fetch
self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // Solo GET requests
  if (req.method !== 'GET') return;
  
  // Ignorar APIs de Google
  if (url.hostname.includes('sheets.googleapis.com') ||
      url.hostname.includes('script.google.com')) {
    return;
  }

  // Para data URLs (iconos dinámicos) - NO CACHEAR
  if (req.url.startsWith('data:')) {
    return;
  }

  // Para blob URLs (manifest dinámico)
  if (req.url.startsWith('blob:')) {
    event.respondWith(fetch(req));
    return;
  }

  // Estrategia: Network First para HTML, Cache First para assets
  if (req.mode === 'navigate' || req.destination === 'document') {
    event.respondWith(
      fetch(req)
        .then(response => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(req, clone));
          return response;
        })
        .catch(() => caches.match(req).then(cached => 
          cached || caches.match(new URL('./', BASE).href)
        ))
    );
  } else {
    // Cache First para assets estáticos
    event.respondWith(
      caches.match(req).then(cached => {
        if (cached) {
          // Actualizar en background
          fetch(req).then(response => {
            if (response && response.status === 200) {
              caches.open(CACHE_NAME).then(cache => cache.put(req, response.clone()));
            }
          }).catch(() => {});
          return cached;
        }
        return fetch(req).then(response => {
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(req, clone));
          }
          return response;
        });
      })
    );
  }
});

// Mensajes
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

console.log('[SW] Service Worker cargado - Versión:', CACHE_NAME);