// ============================================
// CONFIGURACIÓN
// ============================================
const CONFIG = {
    // IMPORTANTE: Reemplaza con tu URL de Google Apps Script
    GAS_URL: 'https://script.google.com/macros/s/AKfycbwreGMo-ZITm8PUkGJfMVu1cwKMsnUhfD1BZO18qFBa9CFcWd50VzBDKwDMKCubYhg5Cg/exec',
    DEBUG: true // Poner en false en producción
};

// ============================================
// ESTADO GLOBAL
// ============================================
let swRegistration = null;
let vapidPublicKey = null;
let isSubscribed = false;

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

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
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
        options.body = JSON.stringify(data);
    }

    try {
        if (CONFIG.DEBUG) console.log(`📡 Llamando a GAS: ${path}`, data);

        const response = await fetch(url.toString(), options);

        // GAS a veces devuelve texto plano en lugar de JSON
        const responseText = await response.text();

        try {
            return JSON.parse(responseText);
        } catch (e) {
            if (CONFIG.DEBUG) console.log('Respuesta no es JSON:', responseText);
            return { message: responseText };
        }
    } catch (error) {
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
    if (ua.match(/Chrome/i)) return 'Chrome';
    if (ua.match(/Firefox/i)) return 'Firefox';
    if (ua.match(/Safari/i)) return 'Safari';
    if (ua.match(/Edge/i)) return 'Edge';
    return 'Desconocido';
}

// Detectar si está ejecutándose como PWA instalada
function isRunningAsPWA() {
    return window.matchMedia('(display-mode: standalone)').matches ||
        window.navigator.standalone === true;
}

// Detectar soporte de notificaciones
async function checkNotificationSupport() {
    // Verificar soporte básico
    if (!('serviceWorker' in navigator)) {
        elements.status.innerHTML = '❌ Tu navegador no soporta Service Workers';
        return false;
    }

    if (!('PushManager' in window)) {
        elements.status.innerHTML = '❌ Tu navegador no soporta Push Notifications';
        return false;
    }

    // Verificar permisos
    const permission = await Notification.requestPermission();
    if (permission === 'denied') {
        elements.status.innerHTML = '❌ Has bloqueado las notificaciones';
        return false;
    }

    return true;
}

// ============================================
// FUNCIONES PRINCIPALES
// ============================================

// Inicializar la aplicación
async function initialize() {
    try {
        elements.status.innerHTML = '🔄 Inicializando...';

        // Mostrar información del dispositivo
        elements.platform.innerHTML = `📱 ${getPlatform()}`;
        elements.browser.innerHTML = `🌐 ${getBrowser()}`;

        // Detectar si es PWA instalada
        if (isRunningAsPWA()) {
            elements.pwaStatus.innerHTML = '📲 Modo PWA';
            elements.pwaStatus.style.backgroundColor = '#28a745';
        } else {
            elements.pwaStatus.innerHTML = '🌐 Modo Web';
            // Mostrar mensaje para iOS si corresponde
            if (getPlatform() === 'iOS') {
                elements.iosInstallMessage.classList.add('show');
            }
        }

        // Verificar soporte
        const hasSupport = await checkNotificationSupport();
        if (!hasSupport) {
            elements.subscribeBtn.style.display = 'none';
            return;
        }

        // Registrar Service Worker
        elements.status.innerHTML = '🔄 Registrando Service Worker...';
        swRegistration = await navigator.serviceWorker.register('sw.js', {
            scope: '/'
        });

        console.log('✅ Service Worker registrado:', swRegistration);

        // Esperar a que el SW esté activo
        await navigator.serviceWorker.ready;

        // Obtener clave VAPID
        elements.status.innerHTML = '🔄 Obteniendo clave de seguridad...';
        vapidPublicKey = await callGAS('vapid-public-key', 'GET');

        if (!vapidPublicKey) {
            throw new Error('No se pudo obtener la clave VAPID');
        }

        console.log('✅ Clave VAPID obtenida');

        // Verificar suscripción actual
        await checkSubscription();

        // Escuchar mensajes del Service Worker
        navigator.serviceWorker.addEventListener('message', event => {
            if (event.data.type === 'SUBSCRIBED') {
                updateUI(true);
            } else if (event.data.type === 'UNSUBSCRIBED') {
                updateUI(false);
            }
        });

        // Obtener estadísticas
        await updateStats();

        elements.status.innerHTML = '✅ Listo para recibir notificaciones';

    } catch (error) {
        console.error('Error en inicialización:', error);
        elements.status.innerHTML = '❌ Error al inicializar: ' + error.message;
    }
}

// Verificar suscripción actual
async function checkSubscription() {
    try {
        const subscription = await swRegistration.pushManager.getSubscription();
        updateUI(!!subscription);

        if (subscription) {
            console.log('✅ Usuario suscrito:', subscription.endpoint);
        } else {
            console.log('ℹ️ Usuario no suscrito');
        }
    } catch (error) {
        console.error('Error verificando suscripción:', error);
    }
}

// Actualizar interfaz según estado
function updateUI(subscribed) {
    isSubscribed = subscribed;

    if (subscribed) {
        elements.subscribeBtn.style.display = 'none';
        elements.unsubscribeBtn.style.display = 'flex';
        elements.status.innerHTML = '✅ Notificaciones activadas';
    } else {
        elements.subscribeBtn.style.display = 'flex';
        elements.unsubscribeBtn.style.display = 'none';
        elements.status.innerHTML = '⏸️ Notificaciones desactivadas';
    }
}

// Suscribirse a notificaciones
async function subscribeToNotifications() {
    try {
        elements.status.innerHTML = '🔄 Solicitando permiso...';

        // Solicitar permiso
        const permission = await Notification.requestPermission();
        if (permission !== 'granted') {
            elements.status.innerHTML = '❌ Permiso denegado';
            return;
        }

        elements.status.innerHTML = '🔄 Creando suscripción...';

        // Crear suscripción
        const subscription = await swRegistration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(vapidPublicKey)
        });

        console.log('✅ Suscripción creada:', subscription);

        elements.status.innerHTML = '🔄 Guardando en servidor...';

        // Guardar en servidor
        const result = await callGAS('subscribe', 'POST', subscription);

        if (result.message) {
            updateUI(true);
            await updateStats();

            // Enviar mensaje al Service Worker
            if (swRegistration.active) {
                swRegistration.active.postMessage({
                    type: 'SUBSCRIBED',
                    subscription: subscription
                });
            }
        } else {
            throw new Error('Error en el servidor');
        }

    } catch (error) {
        console.error('Error al suscribir:', error);
        elements.status.innerHTML = '❌ Error al activar notificaciones: ' + error.message;
    }
}

// Desuscribirse
async function unsubscribeFromNotifications() {
    try {
        elements.status.innerHTML = '🔄 Desactivando notificaciones...';

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
        }
    } catch (error) {
        console.error('Error al desuscribir:', error);
        elements.status.innerHTML = '❌ Error al desactivar: ' + error.message;
    }
}

// Enviar notificación (admin)
async function sendNotification() {
    const title = elements.notificationTitle.value.trim();
    const body = elements.notificationBody.value.trim();
    const url = elements.notificationUrl.value.trim();

    if (!title || !body) {
        alert('❌ Título y mensaje son requeridos');
        return;
    }

    // Confirmar envío
    if (!confirm(`¿Enviar notificación "${title}" a todos los suscriptores?`)) {
        return;
    }

    elements.sendBtn.disabled = true;
    elements.sendBtn.innerHTML = '<span>⏳</span> Enviando...';

    try {
        const result = await callGAS('send-notification', 'POST', {
            title: title,
            body: body,
            icon: '/icon-192.png',
            url: url
        });

        if (result.results) {
            const { success, failed } = result.results;
            alert(`✅ Notificaciones enviadas:
            • Exitosas: ${success.length}
            • Fallidas: ${failed.length}`);

            // Actualizar último envío
            elements.lastSent.innerHTML = new Date().toLocaleTimeString();
        } else {
            alert('✅ ' + result.message);
        }

    } catch (error) {
        console.error('Error:', error);
        alert('❌ Error al enviar: ' + error.message);
    } finally {
        elements.sendBtn.disabled = false;
        elements.sendBtn.innerHTML = '<span>📨</span> Enviar Notificación a Todos';
    }
}

// Actualizar estadísticas
async function updateStats() {
    try {
        // Esta función requeriría un endpoint adicional en GAS
        // Por ahora simulamos
        elements.subscribersCount.innerHTML = Math.floor(Math.random() * 10) + 1;
    } catch (error) {
        console.error('Error actualizando stats:', error);
    }
}

// ============================================
// EVENT LISTENERS
// ============================================
elements.subscribeBtn.addEventListener('click', subscribeToNotifications);
elements.unsubscribeBtn.addEventListener('click', unsubscribeFromNotifications);
elements.sendBtn.addEventListener('click', sendNotification);

// Detectar cambios en el modo de visualización (instalación PWA)
window.matchMedia('(display-mode: standalone)').addListener((media) => {
    if (media.matches) {
        elements.pwaStatus.innerHTML = '📲 Modo PWA';
        elements.pwaStatus.style.backgroundColor = '#28a745';
        elements.iosInstallMessage.classList.remove('show');
    }
});

// ============================================
// INICIAR APLICACIÓN
// ============================================
document.addEventListener('DOMContentLoaded', initialize);