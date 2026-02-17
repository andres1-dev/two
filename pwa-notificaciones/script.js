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
    notifTitle: document.getElementById('notificationTitle'),
    notifBody: document.getElementById('notificationBody')
};

let swRegistration = null;
let vapidPublicKey = null;
let isSubscribed = false;

// ============================================
// DETECCIÓN DE PLATAFORMA
// ============================================
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
    if (/Edg/i.test(ua)) return 'Edge';
    if (/CriOS/i.test(ua)) return 'Chrome iOS';
    if (/FxiOS/i.test(ua)) return 'Firefox iOS';
    if (/Chrome/i.test(ua)) return 'Chrome';
    if (/Firefox/i.test(ua)) return 'Firefox';
    if (/Safari/i.test(ua)) return 'Safari';
    return 'Desconocido';
}

function isRunningAsPWA() {
    return window.matchMedia('(display-mode: standalone)').matches ||
        window.navigator.standalone === true;
}

// ============================================
// iOS: REQUISITOS ESPECÍFICOS
//
// 1. Solo funciona en Safari (no Chrome/Firefox en iOS)
// 2. DEBE estar instalada como PWA (Add to Home Screen)
// 3. Requiere iOS 16.4+ 
// 4. Notification.requestPermission() debe llamarse
//    desde un gesto directo del usuario (click)
// ============================================
function checkiOSCompatibility() {
    const platform = getPlatform();
    const browser = getBrowser();
    const isPWA = isRunningAsPWA();

    if (platform !== 'iOS') return { ok: true };

    // En iOS, Chrome/Firefox son wrappers de WebKit y NO soportan push
    if (browser === 'Chrome iOS' || browser === 'Firefox iOS') {
        return {
            ok: false,
            reason: 'ios-wrong-browser',
            message: 'En iPhone/iPad debes usar Safari para las notificaciones.'
        };
    }

    // Debe ser PWA instalada
    if (!isPWA) {
        return {
            ok: false,
            reason: 'ios-not-pwa',
            message: 'En iPhone/iPad debes añadir esta app a la pantalla de inicio primero.'
        };
    }

    // Verificar iOS 16.4+
    const match = navigator.userAgent.match(/OS (\d+)_(\d+)/);
    if (match) {
        const major = parseInt(match[1]);
        const minor = parseInt(match[2]);
        if (major < 16 || (major === 16 && minor < 4)) {
            return {
                ok: false,
                reason: 'ios-version',
                message: 'Necesitas iOS 16.4 o superior. Tu versión: ' + major + '.' + minor
            };
        }
    }

    return { ok: true };
}

// ============================================
// UTILIDADES
// ============================================
function log(...args) {
    if (CONFIG.DEBUG) console.log('[PWA]', ...args);
}

function setStatus(html) {
    if (elements.status) elements.status.innerHTML = html;
}

function showError(msg, detail = '') {
    setStatus('❌ ' + msg);
    if (detail && elements.errorDetails) {
        elements.errorDetails.textContent = detail;
        elements.errorDetails.classList.add('show');
    }
    if (elements.retryBtn) elements.retryBtn.style.display = 'flex';
}

function updateUI(subscribed) {
    isSubscribed = subscribed;
    if (elements.subscribeBtn) elements.subscribeBtn.style.display = subscribed ? 'none' : 'flex';
    if (elements.unsubscribeBtn) elements.unsubscribeBtn.style.display = subscribed ? 'flex' : 'none';
}

function urlBase64ToUint8Array(b64) {
    const pad = '='.repeat((4 - b64.length % 4) % 4);
    const base = (b64 + pad).replace(/-/g, '+').replace(/_/g, '/');
    const raw = atob(base);
    return Uint8Array.from(raw, c => c.charCodeAt(0));
}

// ============================================
// LLAMAR A GAS
// ============================================
async function callGAS(action, method = 'GET', data = null) {
    if (method === 'GET') {
        const res = await fetch(CONFIG.GAS_URL + '?action=' + action, { mode: 'cors' });
        const text = await res.text();
        try { return JSON.parse(text); } catch { return text; }
    }

    const form = new URLSearchParams();
    form.append('action', action);
    if (data) {
        form.append('data', JSON.stringify(data));
        if (data.endpoint) form.append('endpoint', data.endpoint);
        if (data.keys) {
            if (data.keys.p256dh) form.append('p256dh', data.keys.p256dh);
            if (data.keys.auth) form.append('auth', data.keys.auth);
        }
        if (data.title) form.append('title', data.title);
        if (data.body) form.append('body', data.body);
        if (data.icon) form.append('icon', data.icon);
    }

    const res = await fetch(CONFIG.GAS_URL, {
        method: 'POST', mode: 'cors', body: form,
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });
    const text = await res.text();
    try { return JSON.parse(text); } catch { return text; }
}

// ============================================
// OBTENER CLAVE VAPID
// ============================================
async function getVapidKey() {
    try {
        setStatus('🔄 Obteniendo configuración...');
        const res = await fetch(CONFIG.GAS_URL + '?action=vapid-public-key', { mode: 'cors' });
        const text = (await res.text()).trim();

        if (text.startsWith('{')) {
            const obj = JSON.parse(text);
            throw new Error(obj.error || obj.message || 'Error VAPID');
        }
        if (text.length > 20) {
            vapidPublicKey = text;
            return true;
        }
        throw new Error('Clave VAPID inválida');
    } catch (err) {
        showError('Error de configuración', err.message);
        return false;
    }
}

// ============================================
// REGISTRAR SERVICE WORKER
// ============================================
async function registerServiceWorker() {
    try {
        setStatus('🔄 Preparando...');
        swRegistration = await navigator.serviceWorker.register('sw.js', { scope: './' });
        await navigator.serviceWorker.ready;
        log('SW listo, scope:', swRegistration.scope);
        return true;
    } catch (err) {
        showError('Error interno', err.message);
        return false;
    }
}

// ============================================
// VERIFICAR SUSCRIPCIÓN
// ============================================
async function checkSubscription() {
    if (!swRegistration) return false;
    try {
        const sub = await swRegistration.pushManager.getSubscription();
        isSubscribed = !!sub;
        if (isSubscribed) {
            updateUI(true);
            setStatus('✅ Notificaciones activas');
        } else {
            updateUI(false);
            setStatus('🔔 Toca el botón para activar');
        }
        return isSubscribed;
    } catch (err) {
        log('checkSubscription error:', err);
        return false;
    }
}

// ============================================
// SUSCRIBIR
// iOS FIX: requestPermission() DEBE ser llamado
// directamente desde un handler de click del usuario.
// NO puede estar dentro de un await previo o setTimeout.
// ============================================
async function subscribeToNotifications() {
    try {
        // iOS: verificar compatibilidad primero
        const iosCheck = checkiOSCompatibility();
        if (!iosCheck.ok) {
            showError(iosCheck.message);
            mostrarGuiaIOS(iosCheck.reason);
            return;
        }

        setStatus('🔄 Solicitando permiso...');

        // ⭐ iOS FIX: requestPermission debe llamarse lo más
        // directamente posible desde el evento click.
        // Evitar awaits innecesarios antes de esta llamada.
        let permission;
        try {
            // Algunos iOS devuelven Promise, otros usan callback
            const result = Notification.requestPermission();
            permission = (result && typeof result.then === 'function')
                ? await result
                : await new Promise(resolve => Notification.requestPermission(resolve));
        } catch (permErr) {
            // iOS Safari a veces lanza si no está en contexto seguro
            showError('No se pudo solicitar permiso', permErr.message);
            return;
        }

        log('Permiso resultado:', permission);

        if (permission !== 'granted') {
            if (getPlatform() === 'iOS') {
                showError('Permiso denegado. Ve a Ajustes → ' + document.title + ' → Notificaciones.');
            } else {
                showError('Permiso denegado. Actívalo en ajustes del navegador.');
            }
            return;
        }

        if (!vapidPublicKey) {
            const ok = await getVapidKey();
            if (!ok) return;
        }

        setStatus('🔄 Activando notificaciones...');

        const subscription = await swRegistration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(vapidPublicKey)
        });

        log('Suscripción creada OK');
        setStatus('🔄 Guardando...');

        const result = await callGAS('subscribe', 'POST', subscription.toJSON());

        if (result && result.success) {
            updateUI(true);
            setStatus('✅ ¡Notificaciones activadas!');
        } else {
            throw new Error(result?.error || result?.message || 'Error al guardar');
        }

    } catch (err) {
        log('Error subscribe:', err);
        // iOS: error específico de pushManager
        if (err.name === 'NotAllowedError') {
            showError('Permiso denegado por el sistema.');
        } else if (err.name === 'AbortError') {
            showError('Operación cancelada. Inténtalo de nuevo.');
        } else {
            showError('Error al activar', err.message);
        }
    }
}

// ============================================
// DESUSCRIBIR
// ============================================
async function unsubscribeFromNotifications() {
    try {
        setStatus('🔄 Desactivando...');
        const sub = await swRegistration.pushManager.getSubscription();
        if (sub) {
            await callGAS('unsubscribe', 'POST', { endpoint: sub.endpoint });
            await sub.unsubscribe();
        }
        updateUI(false);
        setStatus('✅ Notificaciones desactivadas');
    } catch (err) {
        showError('Error al desactivar', err.message);
    }
}

// ============================================
// ENVIAR NOTIFICACIÓN
// ============================================
async function sendNotification() {
    const title = elements.notifTitle?.value?.trim();
    const body = elements.notifBody?.value?.trim();
    if (!title || !body) { alert('Completa título y mensaje'); return; }
    if (!confirm('¿Enviar notificación a todos?')) return;

    elements.sendBtn.disabled = true;
    elements.sendBtn.textContent = '⏳ Enviando...';

    try {
        setStatus('🔄 Enviando...');
        const result = await callGAS('send-notification', 'POST', {
            title, body,
            icon: location.origin + location.pathname.replace(/[^/]*$/, '') + 'icon-192.png'
        });

        if (result && result.success) {
            alert('✅ ' + (result.message || 'Enviado'));
            setStatus('✅ ' + (result.message || 'Enviado'));
        } else {
            throw new Error(result?.error || result?.message || 'Error desconocido');
        }
    } catch (err) {
        alert('❌ Error: ' + err.message);
        setStatus('❌ Error al enviar');
    } finally {
        elements.sendBtn.disabled = false;
        elements.sendBtn.textContent = '📨 Enviar Notificación';
    }
}

// ============================================
// GUÍA VISUAL PARA iOS
// ============================================
function mostrarGuiaIOS(reason) {
    const box = elements.iosInstallMessage;
    if (!box) return;

    if (reason === 'ios-not-pwa') {
        box.innerHTML = `
            <strong>📲 Instalar en iPhone/iPad:</strong><br>
            1. Toca el botón <strong>Compartir</strong> (cuadrado con flecha ↑)<br>
            2. Selecciona <strong>"Añadir a pantalla de inicio"</strong><br>
            3. Toca <strong>Añadir</strong><br>
            4. Abre la app desde tu pantalla de inicio<br>
            5. Vuelve a tocar "Activar Notificaciones"
        `;
        box.classList.add('show');
    } else if (reason === 'ios-wrong-browser') {
        box.innerHTML = `
            <strong>⚠️ Usa Safari en iPhone/iPad</strong><br>
            Chrome y Firefox en iOS no soportan notificaciones push.<br>
            Abre esta página en <strong>Safari</strong> e instálala.
        `;
        box.classList.add('show');
    } else if (reason === 'ios-version') {
        box.innerHTML = `
            <strong>⚠️ Actualiza iOS</strong><br>
            Las notificaciones requieren iOS 16.4 o superior.<br>
            Ve a Ajustes → General → Actualización de software.
        `;
        box.classList.add('show');
    }
}

// ============================================
// INICIALIZAR
// ============================================
async function initialize() {
    try {
        log('Iniciando...');
        const platform = getPlatform();
        const browser = getBrowser();
        const isPWA = isRunningAsPWA();

        if (elements.platform) elements.platform.textContent = '📱 ' + platform;
        if (elements.browser) elements.browser.textContent = '🌐 ' + browser;
        if (elements.pwaStatus) elements.pwaStatus.textContent = isPWA ? '📲 PWA' : '🌐 Web';

        // Soporte básico
        if (!('serviceWorker' in navigator)) {
            showError('Service Worker no soportado');
            return;
        }
        if (!('PushManager' in window)) {
            if (platform === 'iOS' && !isPWA) {
                // En iOS sin PWA, PushManager no existe — mostrar guía
                mostrarGuiaIOS('ios-not-pwa');
                setStatus('📲 Instala la app primero (ver instrucciones abajo)');
                if (elements.subscribeBtn) elements.subscribeBtn.style.display = 'none';
            } else if (platform === 'iOS') {
                const iosCheck = checkiOSCompatibility();
                if (!iosCheck.ok) {
                    setStatus('⚠️ ' + iosCheck.message);
                    mostrarGuiaIOS(iosCheck.reason);
                } else {
                    showError('Push no soportado en este dispositivo');
                }
            } else {
                showError('Notificaciones push no soportadas en este navegador');
            }
            return;
        }

        if (Notification.permission === 'denied') {
            if (platform === 'iOS') {
                showError('Permiso bloqueado. Ve a Ajustes → ' + document.title + ' → Notificaciones.');
            } else {
                showError('Permiso bloqueado. Actívalo en ajustes del navegador.');
            }
            return;
        }

        // Registrar SW y obtener VAPID en paralelo
        const swOk = await registerServiceWorker();
        if (!swOk) return;

        await Promise.all([getVapidKey(), checkSubscription()]);

        if (!isSubscribed) {
            elements.subscribeBtn.style.display = 'flex';
            if (platform === 'iOS') {
                setStatus('🔔 Toca el botón para activar (requiere iOS 16.4+ y Safari)');
            }
        }

        log('Listo ✅  plataforma:', platform, '| PWA:', isPWA);

    } catch (err) {
        showError('Error al iniciar', err.message);
    }
}

// ============================================
// EVENTOS
// ============================================
elements.subscribeBtn?.addEventListener('click', subscribeToNotifications);
elements.unsubscribeBtn?.addEventListener('click', unsubscribeFromNotifications);
elements.sendBtn?.addEventListener('click', sendNotification);
elements.retryBtn?.addEventListener('click', () => {
    elements.errorDetails?.classList.remove('show');
    if (elements.retryBtn) elements.retryBtn.style.display = 'none';
    initialize();
});

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialize);
} else {
    initialize();
}