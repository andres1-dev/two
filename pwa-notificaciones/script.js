// ============================================
// CONFIGURACIÓN
// ============================================
const CONFIG = {
    GAS_URL: 'https://script.google.com/macros/s/AKfycbwreGMo-ZITm8PUkGJfMVu1cwKMsnUhfD1BZO18qFBa9CFcWd50VzBDKwDMKCubYhg5Cg/exec',
    DEBUG: true
};

// ============================================
// ELEMENTOS DEL DOM
// ============================================
const elements = {
    status: document.getElementById('status'),
    subscribeBtn: document.getElementById('subscribeButton'),
    unsubscribeBtn: document.getElementById('unsubscribeButton'),
    retryBtn: document.getElementById('retryButton'),
    sendBtn: document.getElementById('sendNotificationButton'),
    platform: document.getElementById('platform'),
    browser: document.getElementById('browser'),
    pwaStatus: document.getElementById('pwaStatus'),
    iosInstallMessage: document.getElementById('iosInstallMessage'),
    errorDetails: document.getElementById('errorDetails'),
    notificationTitle: document.getElementById('notificationTitle'),
    notificationBody: document.getElementById('notificationBody')
};

// ============================================
// ESTADO GLOBAL
// ============================================
let swRegistration = null;
let vapidPublicKey = null;
let isSubscribed = false;

// ============================================
// FUNCIONES UTILITARIAS
// ============================================

function log(...args) {
    if (CONFIG.DEBUG) {
        console.log('[PWA]', ...args);
    }
}

function showError(message, details = '') {
    elements.status.innerHTML = `❌ ${message}`;
    if (details && elements.errorDetails) {
        elements.errorDetails.innerHTML = details;
        elements.errorDetails.classList.add('show');
    }
    if (elements.retryBtn) {
        elements.retryBtn.style.display = 'flex';
    }
}

function getPlatform() {
    const ua = navigator.userAgent;
    if (/iPhone|iPad|iPod/i.test(ua)) return 'iOS';
    if (/Android/i.test(ua)) return 'Android';
    if (/Windows/i.test(ua)) return 'Windows';
    if (/Mac/i.test(ua)) return 'macOS';
    return 'Desconocido';
}

function getBrowser() {
    const ua = navigator.userAgent;
    if (/Chrome/i.test(ua) && !/Edg/i.test(ua)) return 'Chrome';
    if (/Firefox/i.test(ua)) return 'Firefox';
    if (/Safari/i.test(ua) && !/Chrome/i.test(ua)) return 'Safari';
    if (/Edg/i.test(ua)) return 'Edge';
    return 'Desconocido';
}

function isRunningAsPWA() {
    return window.matchMedia('(display-mode: standalone)').matches ||
        window.navigator.standalone === true;
}

function urlBase64ToUint8Array(base64String) {
    try {
        const padding = '='.repeat((4 - base64String.length % 4) % 4);
        const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
        const rawData = window.atob(base64);
        const outputArray = new Uint8Array(rawData.length);
        for (let i = 0; i < rawData.length; ++i) {
            outputArray[i] = rawData.charCodeAt(i);
        }
        return outputArray;
    } catch (error) {
        log('Error converting base64:', error);
        return new Uint8Array();
    }
}

// Función simplificada para llamar a GAS
async function callGAS(action, method = 'GET', data = null) {
    const url = new URL(CONFIG.GAS_URL);
    url.searchParams.append('action', action);

    const options = {
        method: method,
        mode: 'cors'
    };

    if (method === 'POST' && data) {
        const formData = new URLSearchParams();
        formData.append('action', action);
        formData.append('data', JSON.stringify(data));
        if (data.endpoint) formData.append('endpoint', data.endpoint);
        if (data.title) formData.append('title', data.title);
        if (data.body) formData.append('body', data.body);

        options.body = formData;
        options.headers = {
            'Content-Type': 'application/x-www-form-urlencoded'
        };
    }

    try {
        const response = await fetch(url.toString(), options);
        const text = await response.text();

        // Intentar parsear JSON
        try {
            return JSON.parse(text);
        } catch {
            return text; // Es texto plano (como la clave VAPID)
        }
    } catch (error) {
        console.error('Error:', error);
        throw error;
    }
}

// Obtener clave VAPID
async function getVapidKey() {
    try {
        elements.status.innerHTML = '🔄 Obteniendo clave VAPID...';

        // Usar fetch directo para mejor control
        const response = await fetch(`${CONFIG.GAS_URL}?action=vapid-public-key`, {
            method: 'GET',
            mode: 'cors'
        });

        const text = await response.text();
        console.log('Respuesta VAPID:', text.substring(0, 50));

        // Verificar si es un error JSON
        if (text.startsWith('{')) {
            try {
                const error = JSON.parse(text);
                if (error.error) {
                    throw new Error(error.error);
                }
            } catch (e) { }
        }

        // Verificar que es una clave válida
        if (text && text.length > 20 && text.startsWith('B')) {
            vapidPublicKey = text.trim();
            elements.status.innerHTML = '✅ Clave VAPID obtenida';
            return true;
        } else {
            throw new Error('Respuesta inválida: ' + text.substring(0, 30));
        }

    } catch (error) {
        console.error('Error VAPID:', error);
        elements.status.innerHTML = '❌ Error clave VAPID: ' + error.message;
        return false;
    }
}

// Función de suscripción corregida
async function subscribeToNotifications() {
    try {
        elements.status.innerHTML = '🔄 Solicitando permiso...';

        const permission = await Notification.requestPermission();
        if (permission !== 'granted') {
            elements.status.innerHTML = '❌ Permiso denegado';
            return;
        }

        if (!vapidPublicKey) {
            const ok = await getVapidKey();
            if (!ok) return;
        }

        elements.status.innerHTML = '🔄 Creando suscripción...';

        const subscription = await swRegistration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(vapidPublicKey)
        });

        elements.status.innerHTML = '🔄 Guardando en servidor...';

        const result = await callGAS('subscribe', 'POST', subscription);

        if (result && result.success) {
            updateUI(true);
            elements.status.innerHTML = '✅ ¡Notificaciones activadas!';
        } else {
            throw new Error(result?.error || 'Error al guardar');
        }

    } catch (error) {
        console.error('Error:', error);
        elements.status.innerHTML = '❌ Error: ' + error.message;
    }
}


// ============================================
// FUNCIONES PRINCIPALES
// ============================================

async function registerServiceWorker() {
    try {
        elements.status.innerHTML = '🔄 Registrando Service Worker...';

        // Desregistrar cualquier SW existente
        const registrations = await navigator.serviceWorker.getRegistrations();
        for (let reg of registrations) {
            await reg.unregister();
            log('SW desregistrado:', reg.scope);
        }

        // Registrar nuevo SW
        swRegistration = await navigator.serviceWorker.register('sw.js', {
            scope: './'
        });

        log('SW registrado con scope:', swRegistration.scope);

        // Esperar a que esté activo
        await navigator.serviceWorker.ready;
        elements.status.innerHTML = '✅ Service Worker listo';

        return true;
    } catch (error) {
        log('Error registrando SW:', error);
        showError('Error registrando Service Worker', error.message);
        return false;
    }
}

async function checkPermission() {
    try {
        if (!('Notification' in window)) {
            showError('Notificaciones no soportadas');
            return false;
        }

        const permission = Notification.permission;
        log('Permiso actual:', permission);

        if (permission === 'denied') {
            showError('Permiso denegado. Desbloquea en ajustes.');
            return false;
        }

        return true;
    } catch (error) {
        log('Error checking permission:', error);
        return false;
    }
}

async function checkSubscription() {
    try {
        if (!swRegistration) return false;

        const subscription = await swRegistration.pushManager.getSubscription();
        isSubscribed = !!subscription;

        if (isSubscribed) {
            elements.subscribeBtn.style.display = 'none';
            elements.unsubscribeBtn.style.display = 'flex';
            elements.status.innerHTML = '✅ Notificaciones activadas';
        } else {
            elements.subscribeBtn.style.display = 'flex';
            elements.unsubscribeBtn.style.display = 'none';
            elements.status.innerHTML = '🔔 Haz clic para activar';
        }

        return isSubscribed;
    } catch (error) {
        log('Error checking subscription:', error);
        return false;
    }
}

async function subscribeToNotifications() {
    try {
        elements.status.innerHTML = '🔄 Solicitando permiso...';

        // Solicitar permiso
        const permission = await Notification.requestPermission();
        log('Permiso resultado:', permission);

        if (permission !== 'granted') {
            showError('Permiso denegado');
            return;
        }

        // Obtener VAPID key si no la tenemos
        if (!vapidPublicKey) {
            const success = await getVapidKey();
            if (!success) return;
        }

        elements.status.innerHTML = '🔄 Creando suscripción...';

        // Crear suscripción
        const subscription = await swRegistration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(vapidPublicKey)
        });

        log('Suscripción creada:', subscription);

        elements.status.innerHTML = '🔄 Guardando en servidor...';

        // Guardar en servidor
        const result = await callGAS('subscribe', 'POST', subscription);
        log('Resultado servidor:', result);

        if (result && result.message) {
            isSubscribed = true;
            elements.subscribeBtn.style.display = 'none';
            elements.unsubscribeBtn.style.display = 'flex';
            elements.status.innerHTML = '✅ ¡Notificaciones activadas!';

            // Notificar al SW
            if (swRegistration.active) {
                swRegistration.active.postMessage({ type: 'SUBSCRIBED' });
            }
        } else {
            throw new Error('Error en servidor');
        }

    } catch (error) {
        log('Error subscribing:', error);
        showError('Error al activar', error.message);
    }
}

async function unsubscribeFromNotifications() {
    try {
        elements.status.innerHTML = '🔄 Desactivando...';

        const subscription = await swRegistration.pushManager.getSubscription();
        if (subscription) {
            await callGAS('unsubscribe', 'POST', { endpoint: subscription.endpoint });
            await subscription.unsubscribe();

            isSubscribed = false;
            elements.subscribeBtn.style.display = 'flex';
            elements.unsubscribeBtn.style.display = 'none';
            elements.status.innerHTML = '✅ Notificaciones desactivadas';
        }
    } catch (error) {
        log('Error unsubscribing:', error);
        showError('Error al desactivar', error.message);
    }
}

async function sendNotification() {
    const title = elements.notificationTitle.value.trim();
    const body = elements.notificationBody.value.trim();

    if (!title || !body) {
        alert('Completa todos los campos');
        return;
    }

    if (!confirm('¿Enviar notificación a todos?')) return;

    elements.sendBtn.disabled = true;
    elements.sendBtn.innerHTML = '⏳ Enviando...';

    try {
        const result = await callGAS('send-notification', 'POST', {
            title, body,
            icon: window.location.origin + window.location.pathname + 'icon-192.png'
        });

        if (result && result.message) {
            alert('✅ Notificaciones enviadas');
        } else {
            alert('✅ Enviado');
        }
    } catch (error) {
        alert('❌ Error: ' + error.message);
    } finally {
        elements.sendBtn.disabled = false;
        elements.sendBtn.innerHTML = '📨 Enviar Notificación';
    }
}

async function initialize() {
    try {
        log('Inicializando PWA...');
        log('URL:', window.location.href);

        // Mostrar información del dispositivo
        elements.platform.innerHTML = `📱 ${getPlatform()}`;
        elements.browser.innerHTML = `🌐 ${getBrowser()}`;
        elements.pwaStatus.innerHTML = isRunningAsPWA() ? '📲 PWA' : '🌐 Web';

        // Verificar soporte básico
        if (!('serviceWorker' in navigator)) {
            showError('Service Worker no soportado');
            return;
        }

        if (!('PushManager' in window)) {
            showError('Push notificaciones no soportadas');
            return;
        }

        // Verificar permiso
        const hasPermission = await checkPermission();
        if (!hasPermission) return;

        // Registrar Service Worker
        const swRegistered = await registerServiceWorker();
        if (!swRegistered) return;

        // Verificar suscripción actual
        await checkSubscription();

        // Si el permiso es granted pero no hay suscripción, mostrar botón
        if (Notification.permission === 'granted' && !isSubscribed) {
            elements.subscribeBtn.style.display = 'flex';
        }

        // Mensaje para iOS
        if (getPlatform() === 'iOS' && !isRunningAsPWA()) {
            elements.iosInstallMessage.classList.add('show');
        }

        log('Inicialización completa');

    } catch (error) {
        log('Error en inicialización:', error);
        showError('Error crítico', error.message);
    }
}

// ============================================
// EVENT LISTENERS
// ============================================
elements.subscribeBtn.addEventListener('click', subscribeToNotifications);
elements.unsubscribeBtn.addEventListener('click', unsubscribeFromNotifications);
elements.sendBtn.addEventListener('click', sendNotification);

if (elements.retryBtn) {
    elements.retryBtn.addEventListener('click', () => {
        elements.errorDetails.classList.remove('show');
        elements.retryBtn.style.display = 'none';
        initialize();
    });
}

// ============================================
// INICIAR
// ============================================
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialize);
} else {
    initialize();
}