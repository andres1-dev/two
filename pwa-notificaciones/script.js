// ============================================
// SCRIPT PRINCIPAL CON RUTAS RELATIVAS - CORREGIDO
// ============================================

// Base URL relativa al lugar donde está este archivo
const BASE = (new URL('.', import.meta.url)).href;
console.log('📍 BASE URL:', BASE);

// ============================================
// CONFIGURACIÓN
// ============================================
const CONFIG = {
    // IMPORTANTE: Reemplaza con tu URL de Google Apps Script
    GAS_URL: 'https://script.google.com/macros/s/AKfycbwreGMo-ZITm8PUkGJfMVu1cwKMsnUhfD1BZO18qFBa9CFcWd50VzBDKwDMKCubYhg5Cg/exec',
    DEBUG: true, // Cambiar a false en producción
    BASE_URL: BASE
};

// ============================================
// ESTADO GLOBAL
// ============================================
let swRegistration = null;
let vapidPublicKey = null;
let isSubscribed = false;
let initializationAttempts = 0;
const MAX_ATTEMPTS = 3;

// ============================================
// ELEMENTOS DEL DOM
// ============================================
const elements = {
    status: document.getElementById('status'),
    subscribeBtn: document.getElementById('subscribeButton'),
    unsubscribeBtn: document.getElementById('unsubscribeButton'),
    sendBtn: document.getElementById('sendNotificationButton'),
    platform: document.getElementById('platform'),
    browser: document.getElementById('browser'),
    pwaStatus: document.getElementById('pwaStatus'),
    iosInstallMessage: document.getElementById('iosInstallMessage'),
    subscribersCount: document.getElementById('subscribersCount'),
    lastSent: document.getElementById('lastSent'),
    notificationTitle: document.getElementById('notificationTitle'),
    notificationBody: document.getElementById('notificationBody'),
    notificationUrl: document.getElementById('notificationUrl')
};

// ============================================
// UTILIDADES
// ============================================

// Convertir base64 a Uint8Array (necesario para VAPID)
function urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
        .replace(/\-/g, '+')
        .replace(/_/g, '/');

    try {
        const rawData = window.atob(base64);
        const outputArray = new Uint8Array(rawData.length);

        for (let i = 0; i < rawData.length; ++i) {
            outputArray[i] = rawData.charCodeAt(i);
        }
        return outputArray;
    } catch (error) {
        console.error('Error converting base64:', error);
        return new Uint8Array([]);
    }
}

// Función mejorada para llamar a GAS
async function callGAS(path, method = 'GET', data = null) {
    // Construir URL con el path como parámetro
    const url = new URL(CONFIG.GAS_URL);
    url.searchParams.append('path', path);

    // Añadir información del dispositivo
    url.searchParams.append('platform', getPlatform());
    url.searchParams.append('browser', getBrowser());
    url.searchParams.append('isPWA', isRunningAsPWA());
    url.searchParams.append('base_url', CONFIG.BASE_URL);
    url.searchParams.append('timestamp', Date.now());

    const options = {
        method: method,
        mode: 'cors',
        headers: {
            'Content-Type': 'application/json',
        }
    };

    if (data) {
        // Añadir el path también en el body para POST
        data._path = path;
        data._base_url = CONFIG.BASE_URL;
        options.body = JSON.stringify(data);
    }

    try {
        if (CONFIG.DEBUG) console.log(`📡 Llamando a GAS: ${path}`, data);

        // Añadir timeout para evitar que se cuelgue
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 segundos timeout

        options.signal = controller.signal;

        const response = await fetch(url.toString(), options);
        clearTimeout(timeoutId);

        // GAS a veces devuelve texto plano en lugar de JSON
        const responseText = await response.text();

        try {
            return JSON.parse(responseText);
        } catch (e) {
            if (CONFIG.DEBUG) console.log('Respuesta no es JSON:', responseText);
            return { message: responseText, status: response.status };
        }
    } catch (error) {
        if (error.name === 'AbortError') {
            console.error('Timeout en llamada GAS');
            throw new Error('Timeout - El servidor no responde');
        }
        console.error('Error en llamada GAS:', error);
        throw error;
    }
}

// Detectar plataforma
function getPlatform() {
    const ua = navigator.userAgent;
    if (ua.match(/iPhone|iPad|iPod/i)) return 'iOS';
    if (ua.match(/Android/i)) return 'Android';
    if (ua.match(/Windows/i)) return 'Windows';
    if (ua.match(/Mac/i)) return 'macOS';
    if (ua.match(/Linux/i)) return 'Linux';
    return 'Desconocido';
}

// Detectar navegador
function getBrowser() {
    const ua = navigator.userAgent;
    if (ua.match(/Chrome/i) && !ua.match(/Edg/i)) return 'Chrome';
    if (ua.match(/Firefox/i)) return 'Firefox';
    if (ua.match(/Safari/i) && !ua.match(/Chrome/i)) return 'Safari';
    if (ua.match(/Edg/i)) return 'Edge';
    if (ua.match(/OPR/i)) return 'Opera';
    return 'Desconocido';
}

// Detectar si está ejecutándose como PWA instalada
function isRunningAsPWA() {
    return window.matchMedia('(display-mode: standalone)').matches ||
        window.navigator.standalone === true;
}

// Verificar soporte de notificaciones - VERSIÓN CORREGIDA
async function checkNotificationSupport() {
    try {
        console.log('🔍 Verificando soporte de notificaciones...');

        // Verificar soporte básico
        if (!('serviceWorker' in navigator)) {
            elements.status.innerHTML = '❌ Tu navegador no soporta Service Workers';
            return false;
        }

        if (!('PushManager' in window)) {
            elements.status.innerHTML = '❌ Tu navegador no soporta Push Notifications';
            return false;
        }

        // Verificar si las notificaciones están soportadas
        if (!('Notification' in window)) {
            elements.status.innerHTML = '❌ Tu navegador no soporta Notificaciones';
            return false;
        }

        // Verificar el estado actual de los permisos (sin solicitar)
        const permissionStatus = Notification.permission;
        console.log('📝 Estado del permiso:', permissionStatus);

        if (permissionStatus === 'denied') {
            elements.status.innerHTML = '❌ Has bloqueado las notificaciones. Para activarlas, ve a ajustes del sitio.';
            return false;
        }

        // Si el permiso es 'granted' o 'default', podemos continuar
        return true;

    } catch (error) {
        console.error('Error verificando soporte:', error);
        elements.status.innerHTML = '❌ Error verificando soporte: ' + error.message;
        return false;
    }
}

// Función de diagnóstico mejorada
async function diagnosticarServiceWorker() {
    console.log('🔍 DIAGNÓSTICO SERVICE WORKER');
    console.log('📍 BASE URL:', CONFIG.BASE_URL);
    console.log('📍 URL actual:', window.location.href);
    console.log('📍 Pathname:', window.location.pathname);
    console.log('📍 Origen:', window.location.origin);
    console.log('📍 User Agent:', navigator.userAgent);
    console.log('📍 Plataforma:', getPlatform());
    console.log('📍 Navegador:', getBrowser());
    console.log('📍 Modo PWA:', isRunningAsPWA());
    console.log('📍 Permiso Notificaciones:', Notification.permission);

    // Verificar soporte
    console.log('✅ Soporte SW:', 'serviceWorker' in navigator);
    console.log('✅ Soporte Push:', 'PushManager' in window);
    console.log('✅ Soporte Notifications:', 'Notification' in window);

    // Verificar registros existentes
    try {
        const registrations = await navigator.serviceWorker.getRegistrations();
        console.log('📊 Registros encontrados:', registrations.length);

        for (const reg of registrations) {
            console.log('  - Scope:', reg.scope);
            console.log('  - Activo:', reg.active ? 'sí' : 'no');
            console.log('  - Esperando:', reg.waiting ? 'sí' : 'no');
            console.log('  - Instalando:', reg.installing ? 'sí' : 'no');
        }
    } catch (error) {
        console.error('Error obteniendo registros:', error);
    }

    // Verificar archivo sw.js
    try {
        const swUrl = new URL('sw.js', window.location.href).href;
        const response = await fetch(swUrl, { method: 'HEAD' });
        console.log(`✅ sw.js accesible en ${swUrl}:`, response.status);
    } catch (e) {
        console.error('❌ sw.js NO accesible:', e);
    }

    // Verificar manifest.json
    try {
        const manifestUrl = new URL('manifest.json', window.location.href).href;
        const response = await fetch(manifestUrl, { method: 'HEAD' });
        console.log(`✅ manifest.json accesible en ${manifestUrl}:`, response.status);
    } catch (e) {
        console.error('❌ manifest.json NO accesible:', e);
    }
}

// ============================================
// FUNCIONES PRINCIPALES
// ============================================

// Inicializar la aplicación - VERSIÓN CORREGIDA
async function initialize() {
    try {
        initializationAttempts++;
        console.log(`🔄 Intento de inicialización #${initializationAttempts}`);

        elements.status.innerHTML = '🔄 Inicializando...';

        // Diagnóstico inicial
        await diagnosticarServiceWorker();

        // Mostrar información del dispositivo
        if (elements.platform) elements.platform.innerHTML = `📱 ${getPlatform()}`;
        if (elements.browser) elements.browser.innerHTML = `🌐 ${getBrowser()}`;

        // Detectar si es PWA instalada
        if (isRunningAsPWA()) {
            if (elements.pwaStatus) {
                elements.pwaStatus.innerHTML = '📲 Modo PWA';
                elements.pwaStatus.style.backgroundColor = '#28a745';
            }
        } else {
            if (elements.pwaStatus) elements.pwaStatus.innerHTML = '🌐 Modo Web';
            // Mostrar mensaje para iOS si corresponde
            if (getPlatform() === 'iOS' && elements.iosInstallMessage) {
                elements.iosInstallMessage.classList.add('show');
            }
        }

        // Verificar soporte (sin solicitar permiso aún)
        const hasSupport = await checkNotificationSupport();
        if (!hasSupport) {
            if (elements.subscribeBtn) elements.subscribeBtn.style.display = 'none';
            return;
        }

        // Mostrar botón de suscripción si el permiso es default o granted
        if (Notification.permission === 'granted') {
            // Ya tiene permiso, verificamos suscripción
            await setupServiceWorker();
        } else if (Notification.permission === 'default') {
            // Aún no ha decidido, mostramos botón para solicitar permiso
            if (elements.subscribeBtn) {
                elements.subscribeBtn.style.display = 'flex';
                elements.status.innerHTML = '🔔 Haz clic en "Activar Notificaciones" para comenzar';
            }
        }

    } catch (error) {
        console.error('❌ Error en inicialización:', error);
        elements.status.innerHTML = '❌ Error al inicializar: ' + error.message;

        // Reintentar si no hemos excedido el máximo de intentos
        if (initializationAttempts < MAX_ATTEMPTS) {
            console.log(`🔄 Reintentando en 2 segundos... (Intento ${initializationAttempts}/${MAX_ATTEMPTS})`);
            setTimeout(initialize, 2000);
        }
    }
}

// Configurar Service Worker - VERSIÓN CORREGIDA
async function setupServiceWorker() {
    try {
        elements.status.innerHTML = '🔄 Configurando Service Worker...';

        // Limpiar registros antiguos del Service Worker
        const registrations = await navigator.serviceWorker.getRegistrations();
        for (let registration of registrations) {
            await registration.unregister();
            console.log('🗑️ Service Worker anterior desregistrado:', registration.scope);
        }

        // Registrar Service Worker con el scope correcto (relativo)
        elements.status.innerHTML = '🔄 Registrando Service Worker...';

        // Calcular el scope basado en la ubicación actual
        const swPath = new URL('sw.js', window.location.href).href;
        const scope = new URL('./', window.location.href).href;

        console.log('📍 Registrando SW desde:', swPath);
        console.log('📍 Con scope:', scope);

        swRegistration = await navigator.serviceWorker.register('sw.js', {
            scope: './'
        });

        console.log('✅ Service Worker registrado:', swRegistration);
        console.log('📍 Scope final:', swRegistration.scope);

        // Esperar a que el SW esté activo
        elements.status.innerHTML = '🔄 Activando Service Worker...';

        // Esperar a que el SW esté listo
        const registration = await navigator.serviceWorker.ready;
        console.log('✅ Service Worker listo');

        // Verificar si ya hay una suscripción
        const subscription = await registration.pushManager.getSubscription();

        if (subscription) {
            // Ya está suscrito, verificamos en el servidor
            updateUI(true);
            elements.status.innerHTML = '✅ Ya estás suscrito a las notificaciones';
        } else {
            // No está suscrito, mostramos botón
            if (Notification.permission === 'granted') {
                // Tiene permiso pero no suscripción, puede suscribirse
                if (elements.subscribeBtn) {
                    elements.subscribeBtn.style.display = 'flex';
                    elements.status.innerHTML = '🔔 Haz clic para activar las notificaciones';
                }
            } else {
                // No tiene permiso
                if (elements.subscribeBtn) {
                    elements.subscribeBtn.style.display = 'flex';
                    elements.status.innerHTML = '🔔 Haz clic para solicitar permiso';
                }
            }
        }

        // Obtener clave VAPID si es necesario
        if (!vapidPublicKey) {
            elements.status.innerHTML = '🔄 Obteniendo clave de seguridad...';
            try {
                vapidPublicKey = await callGAS('vapid-public-key', 'GET');
                console.log('✅ Clave VAPID obtenida');
            } catch (error) {
                console.error('Error obteniendo VAPID:', error);
                // Continuamos igual, se obtendrá al suscribirse
            }
        }

        // Escuchar mensajes del Service Worker
        navigator.serviceWorker.addEventListener('message', event => {
            console.log('📩 Mensaje del SW:', event.data);
            if (event.data && event.data.type === 'SUBSCRIBED') {
                updateUI(true);
            } else if (event.data && event.data.type === 'UNSUBSCRIBED') {
                updateUI(false);
            }
        });

        // Obtener estadísticas
        await updateStats();

    } catch (error) {
        console.error('❌ Error en setupServiceWorker:', error);
        elements.status.innerHTML = '❌ Error configurando Service Worker: ' + error.message;
        throw error;
    }
}

// Verificar suscripción actual
async function checkSubscription() {
    try {
        if (!swRegistration) {
            console.log('⚠️ No hay registro de SW para verificar suscripción');
            return false;
        }

        const subscription = await swRegistration.pushManager.getSubscription();
        updateUI(!!subscription);

        if (subscription) {
            console.log('✅ Usuario suscrito:', subscription.endpoint);
        } else {
            console.log('ℹ️ Usuario no suscrito');
        }

        return !!subscription;
    } catch (error) {
        console.error('Error verificando suscripción:', error);
        return false;
    }
}

// Actualizar interfaz según estado
function updateUI(subscribed) {
    isSubscribed = subscribed;

    if (subscribed) {
        if (elements.subscribeBtn) elements.subscribeBtn.style.display = 'none';
        if (elements.unsubscribeBtn) elements.unsubscribeBtn.style.display = 'flex';
        if (elements.status) elements.status.innerHTML = '✅ Notificaciones activadas';
    } else {
        if (elements.subscribeBtn) elements.subscribeBtn.style.display = 'flex';
        if (elements.unsubscribeBtn) elements.unsubscribeBtn.style.display = 'none';
        if (elements.status) elements.status.innerHTML = '⏸️ Notificaciones desactivadas';
    }
}

// Suscribirse a notificaciones - VERSIÓN CORREGIDA
async function subscribeToNotifications() {
    try {
        elements.status.innerHTML = '🔄 Solicitando permiso...';

        // Solicitar permiso de forma segura
        let permission;
        try {
            permission = await Notification.requestPermission();
        } catch (error) {
            // Algunos navegadores antiguos no devuelven promesa
            permission = await new Promise((resolve) => {
                Notification.requestPermission(resolve);
            });
        }

        console.log('📝 Permiso resultado:', permission);

        if (permission !== 'granted') {
            elements.status.innerHTML = '❌ Permiso denegado. Para activar, ve a ajustes del sitio.';
            return;
        }

        elements.status.innerHTML = '🔄 Creando suscripción...';

        // Verificar que tenemos el SW activo
        if (!swRegistration || !swRegistration.active) {
            swRegistration = await navigator.serviceWorker.ready;
        }

        // Obtener clave VAPID si no la tenemos
        if (!vapidPublicKey) {
            elements.status.innerHTML = '🔄 Obteniendo clave de seguridad...';
            vapidPublicKey = await callGAS('vapid-public-key', 'GET');
        }

        if (!vapidPublicKey) {
            throw new Error('No se pudo obtener la clave VAPID');
        }

        // Crear suscripción
        const subscription = await swRegistration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(vapidPublicKey)
        });

        console.log('✅ Suscripción creada:', subscription);

        elements.status.innerHTML = '🔄 Guardando en servidor...';

        // Guardar en servidor
        const result = await callGAS('subscribe', 'POST', subscription);

        if (result && result.message) {
            updateUI(true);
            await updateStats();

            // Enviar mensaje al Service Worker
            if (swRegistration.active) {
                swRegistration.active.postMessage({
                    type: 'SUBSCRIBED',
                    subscription: subscription
                });
            }

            elements.status.innerHTML = '✅ ¡Notificaciones activadas!';
        } else {
            throw new Error('Error en el servidor');
        }

    } catch (error) {
        console.error('❌ Error al suscribir:', error);
        elements.status.innerHTML = '❌ Error al activar notificaciones: ' + error.message;

        // Si el error es por la clave VAPID, mostramos mensaje más claro
        if (error.message.includes('VAPID') || error.message.includes('key')) {
            elements.status.innerHTML = '❌ Error de configuración: Verifica las claves VAPID en Google Sheets';
        }
    }
}

// Desuscribirse
async function unsubscribeFromNotifications() {
    try {
        elements.status.innerHTML = '🔄 Desactivando notificaciones...';

        if (!swRegistration) {
            swRegistration = await navigator.serviceWorker.ready;
        }

        const subscription = await swRegistration.pushManager.getSubscription();
        if (subscription) {
            // Eliminar del servidor
            await callGAS('unsubscribe', 'POST', { endpoint: subscription.endpoint });

            // Desuscribir localmente
            await subscription.unsubscribe();

            updateUI(false);
            await updateStats();

            // Enviar mensaje al Service Worker
            if (swRegistration.active) {
                swRegistration.active.postMessage({
                    type: 'UNSUBSCRIBED'
                });
            }

            elements.status.innerHTML = '✅ Notificaciones desactivadas';
        } else {
            updateUI(false);
            elements.status.innerHTML = 'ℹ️ No estabas suscrito';
        }
    } catch (error) {
        console.error('❌ Error al desuscribir:', error);
        elements.status.innerHTML = '❌ Error al desactivar: ' + error.message;
    }
}

// Enviar notificación (admin)
async function sendNotification() {
    const title = elements.notificationTitle ? elements.notificationTitle.value.trim() : 'Notificación';
    const body = elements.notificationBody ? elements.notificationBody.value.trim() : 'Mensaje de prueba';
    const url = elements.notificationUrl ? elements.notificationUrl.value.trim() : './';

    if (!title || !body) {
        alert('❌ Título y mensaje son requeridos');
        return;
    }

    // Confirmar envío
    if (!confirm(`¿Enviar notificación "${title}" a todos los suscriptores?`)) {
        return;
    }

    if (elements.sendBtn) {
        elements.sendBtn.disabled = true;
        elements.sendBtn.innerHTML = '<span>⏳</span> Enviando...';
    }

    try {
        const result = await callGAS('send-notification', 'POST', {
            title: title,
            body: body,
            icon: new URL('./icon-192.png', CONFIG.BASE_URL).href,
            url: url
        });

        if (result && result.results) {
            const { success, failed } = result.results;
            alert(`✅ Notificaciones enviadas:
            • Exitosas: ${success.length}
            • Fallidas: ${failed.length}`);

            // Actualizar último envío
            if (elements.lastSent) {
                elements.lastSent.innerHTML = new Date().toLocaleTimeString();
            }
        } else if (result && result.message) {
            alert('✅ ' + result.message);
        } else {
            alert('✅ Notificaciones enviadas');
        }

    } catch (error) {
        console.error('❌ Error:', error);
        alert('❌ Error al enviar: ' + error.message);
    } finally {
        if (elements.sendBtn) {
            elements.sendBtn.disabled = false;
            elements.sendBtn.innerHTML = '<span>📨</span> Enviar Notificación a Todos';
        }
    }
}

// Actualizar estadísticas
async function updateStats() {
    try {
        // Esta función requeriría un endpoint adicional en GAS
        // Por ahora simulamos
        if (elements.subscribersCount) {
            elements.subscribersCount.innerHTML = Math.floor(Math.random() * 10) + 1;
        }
    } catch (error) {
        console.error('Error actualizando stats:', error);
    }
}

// ============================================
// EVENT LISTENERS
// ============================================
if (elements.subscribeBtn) {
    elements.subscribeBtn.addEventListener('click', subscribeToNotifications);
}

if (elements.unsubscribeBtn) {
    elements.unsubscribeBtn.addEventListener('click', unsubscribeFromNotifications);
}

if (elements.sendBtn) {
    elements.sendBtn.addEventListener('click', sendNotification);
}

// Detectar cambios en el modo de visualización (instalación PWA)
if (window.matchMedia) {
    window.matchMedia('(display-mode: standalone)').addEventListener('change', (media) => {
        if (media.matches && elements.pwaStatus) {
            elements.pwaStatus.innerHTML = '📲 Modo PWA';
            elements.pwaStatus.style.backgroundColor = '#28a745';
            if (elements.iosInstallMessage) {
                elements.iosInstallMessage.classList.remove('show');
            }
        }
    });
}

// ============================================
// INICIAR APLICACIÓN
// ============================================
// Asegurar que el DOM está cargado
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialize);
} else {
    // DOM ya está cargado
    initialize();
}