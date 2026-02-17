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

async function callGAS(path, method = 'GET', data = null) {
    const url = new URL(CONFIG.GAS_URL);
    url.searchParams.append('path', path);

    const options = {
        method: method,
        mode: 'cors',
        headers: { 'Content-Type': 'application/json' }
    };

    if (data) {
        options.body = JSON.stringify(data);
    }

    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);
        options.signal = controller.signal;

        const response = await fetch(url.toString(), options);
        clearTimeout(timeoutId);

        const text = await response.text();
        try {
            return JSON.parse(text);
        } catch {
            return { message: text };
        }
    } catch (error) {
        log('Error calling GAS:', error);
        throw error;
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

async function getVapidKey() {
    try {
        elements.status.innerHTML = '🔄 Obteniendo clave VAPID...';

        // Construir URL correctamente
        const url = new URL(CONFIG.GAS_URL);
        url.searchParams.append('path', 'vapid-public-key');

        log('Llamando a GAS:', url.toString());

        const response = await fetch(url.toString(), {
            method: 'GET',
            mode: 'cors',
            headers: {
                'Content-Type': 'application/json',
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        const text = await response.text();
        log('Respuesta GAS (texto):', text);

        // Intentar parsear como JSON
        let data;
        try {
            data = JSON.parse(text);
        } catch (e) {
            // Si no es JSON, podría ser la clave directamente
            data = text;
        }

        log('Respuesta parseada:', data);

        // Si es un objeto con error
        if (data && data.error) {
            throw new Error(data.error);
        }

        // Si es un string, es la clave
        if (typeof data === 'string' && data.length > 20) {
            vapidPublicKey = data;
            elements.status.innerHTML = '✅ Clave VAPID obtenida';
            log('✅ VAPID key:', vapidPublicKey.substring(0, 20) + '...');
            return true;
        }

        // Si es un objeto con la clave
        if (data && data.publicKey) {
            vapidPublicKey = data.publicKey;
            elements.status.innerHTML = '✅ Clave VAPID obtenida';
            return true;
        }

        throw new Error('Formato de respuesta inválido');

    } catch (error) {
        log('❌ Error obteniendo VAPID:', error);
        elements.status.innerHTML = '❌ Error clave VAPID: ' + error.message;

        // Mostrar detalles del error
        if (elements.errorDetails) {
            elements.errorDetails.innerHTML = `
                <strong>Error:</strong> ${error.message}<br>
                <strong>URL:</strong> ${CONFIG.GAS_URL}<br>
                <strong>Verifica:</strong> 
                <ul>
                    <li>¿El GAS está desplegado como "Aplicación web"?</li>
                    <li>¿El acceso es "Cualquier persona"?</li>
                    <li>¿La hoja "vapid_keys" tiene las claves?</li>
                </ul>
            `;
            elements.errorDetails.classList.add('show');
        }

        if (elements.retryBtn) {
            elements.retryBtn.style.display = 'flex';
        }

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