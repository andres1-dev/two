// ============================================
// NotificationManager — Adaptado para usar GAS (VAPID/JWT)
// ============================================
class NotificationManager {
    constructor() {
        this.swRegistration = null;
        this.isSubscribed = false;
        this.vapidPublicKey = null; // Se obtiene dinámicamente
        this.lastNotificationTimestamp = 0;

        // URL del GAS de notificaciones
        this.notifApiUrl = (typeof API_URL_NOTIF !== 'undefined')
            ? API_URL_NOTIF
            : 'https://script.google.com/macros/s/AKfycbwreGMo-ZITm8PUkGJfMVu1cwKMsnUhfD1BZO18qFBa9CFcWd50VzBDKwDMKCubYhg5Cg/exec';

        console.log('🔔 NotificationManager Constructor iniciado (API)');
        this.setupUI();
        this.init();
    }

    async init() {
        console.log('🔔 NotificationManager.init() ejecutándose...');

        if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
            console.warn('❌ Notificaciones Push no soportadas por este navegador');
            this.updateUIForState('unsupported');
            return;
        }

        try {
            this.swRegistration = await navigator.serviceWorker.getRegistration() || await navigator.serviceWorker.ready;

            if (this.swRegistration) {
                console.log('✅ Service Worker vinculado a Notificaciones');
                this.updateUIForState(Notification.permission);

                // Enviar la URL al SW para polling
                this.sendPollingConfigToSW();

                if ('periodicSync' in this.swRegistration) {
                    try {
                        const status = await navigator.permissions.query({
                            name: 'periodic-background-sync',
                        });
                        if (status.state === 'granted') {
                            await this.swRegistration.periodicSync.register('check-notif', {
                                minInterval: 60 * 60 * 1000,
                            });
                            console.log('✅ Periodic Sync registrado');
                        }
                    } catch (e) {
                        console.warn('Periodic Sync no disponible:', e.message);
                    }
                }

                if (Notification.permission === 'granted') {
                    this.subscribeToPush();
                }
            } else {
                console.warn('⚠️ No se encontró Service Worker registrado.');
            }
        } catch (e) {
            console.error('❌ Error en NotificationManager.init():', e);
        }
    }

    setupUI() {
        console.log('🔔 Configurando UI de notificaciones...');
        const notifToggle = document.getElementById('notifToggle');
        const summaryBtn = document.getElementById('sendSummaryBtn');

        if (notifToggle) {
            notifToggle.onchange = (e) => {
                if (notifToggle.checked) {
                    this.requestPermission(true);
                } else {
                    alert('Para desactivar totalmente las notificaciones, debes quitarlas desde la configuración del sitio en tu navegador.');
                }
            };
        }

        if (summaryBtn) {
            summaryBtn.onclick = (e) => {
                e.preventDefault();
                this.sendDailySummary();
            };
        }

        setTimeout(() => this.applyRolePermissions(), 1000);
    }

    applyRolePermissions() {
        const adminNotifSection = document.getElementById('adminNotifSection');
        if (adminNotifSection) adminNotifSection.style.display = 'none';

        let role = null;
        if (window.currentUser && window.currentUser.rol) {
            role = window.currentUser.rol.toUpperCase();
        } else {
            const stored = localStorage.getItem('pandaDashUser');
            if (stored) {
                try {
                    const parsed = JSON.parse(stored);
                    const rawRole = parsed.user ? parsed.user.rol : parsed.rol;
                    if (rawRole) role = rawRole.toUpperCase();
                } catch (e) { }
            }
        }

        console.log(`🔔 NotificationManager: Verificando acceso para rol [${role}]`);
    }

    // ============================================
    // Llamar al GAS de Notificaciones (VAPID/JWT)
    // ============================================
    async callNotifAPI(action, method = 'GET', data = null) {
        if (method === 'GET') {
            const res = await fetch(this.notifApiUrl + '?action=' + action, { mode: 'cors' });
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

        const res = await fetch(this.notifApiUrl, {
            method: 'POST', mode: 'cors', body: form,
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
        });
        const text = await res.text();
        try { return JSON.parse(text); } catch { return text; }
    }

    // ============================================
    // Obtener la clave VAPID pública
    // ============================================
    async fetchVapidKey() {
        try {
            const res = await fetch(this.notifApiUrl + '?action=vapid-public-key', { mode: 'cors' });
            const text = (await res.text()).trim();

            if (text.startsWith('{')) {
                const obj = JSON.parse(text);
                throw new Error(obj.error || obj.message || 'Error VAPID');
            }
            if (text.length > 20) {
                this.vapidPublicKey = text;
                console.log('✅ Clave VAPID obtenida');
                return true;
            }
            throw new Error('Clave VAPID inválida');
        } catch (err) {
            console.error('❌ Error obteniendo VAPID key:', err.message);
            return false;
        }
    }

    // ============================================
    // ENVIAR REPORTE DIARIO → send-notification
    // ============================================
    async sendDailySummary() {
        const btn = document.getElementById('sendSummaryBtn');
        const originalHtml = btn.innerHTML;

        if (!confirm('¿Deseas generar y enviar el resumen de entregas a todos los usuarios?\n(Se enviará el reporte del último día con datos registrados)')) return;

        try {
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Analizando...';
            btn.disabled = true;

            const result = await window.obtenerDatosFacturados();
            if (!result || !result.success) throw new Error('No se pudieron obtener los datos');

            let maxDateVal = 0;
            let finalDateStr = "";
            let finalStats = { facturas: new Set(), unidades: 0, valor: 0 };

            console.log(`🔍 Analizando ${result.data.length} documentos para el reporte...`);

            result.data.forEach((item, idx) => {
                const itemsAProcesar = item.datosSiesa || (item.factura ? [item] : []);

                itemsAProcesar.forEach(f => {
                    const esEntregado = f.confirmacion && f.confirmacion.includes('ENTREGADO');
                    if (!esEntregado) return;

                    const rawDate = f.fechaEntrega || f.fecha || "";
                    if (!rawDate) return;

                    let day, month, year;
                    const match = rawDate.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);

                    if (match) {
                        if (f.fechaEntrega) {
                            day = parseInt(match[1]);
                            month = parseInt(match[2]);
                        } else {
                            day = parseInt(match[2]);
                            month = parseInt(match[1]);
                        }
                        year = parseInt(match[3]);

                        const dateVal = (year * 10000) + (month * 100) + day;
                        const dateStr = `${String(day).padStart(2, '0')}/${String(month).padStart(2, '0')}/${year}`;

                        if (dateVal > maxDateVal) {
                            maxDateVal = dateVal;
                            finalDateStr = dateStr;
                            finalStats.facturas = new Set([f.factura]);
                            finalStats.unidades = parseFloat(f.cantidad) || 0;
                            finalStats.valor = parseFloat(f.valorBruto) || 0;
                        } else if (dateVal === maxDateVal) {
                            finalStats.facturas.add(f.factura);
                            finalStats.unidades += parseFloat(f.cantidad) || 0;
                            finalStats.valor += parseFloat(f.valorBruto) || 0;
                        }
                    }
                });
            });

            if (maxDateVal === 0) {
                alert('No se encontraron registros de entregas recientes en el sistema.');
                return;
            }

            console.log(`✅ Reporte generado para la fecha: ${finalDateStr} (${finalStats.facturas.size} facturas)`);

            const formatter = new Intl.NumberFormat('es-CO', {
                style: 'currency',
                currency: 'COP',
                minimumFractionDigits: 0
            });

            const titulo = `REPORTE DE ENTREGAS | ${finalDateStr}`;
            const cuerpo = `Facturas: ${finalStats.facturas.size} | Unidades: ${finalStats.unidades.toLocaleString('es-CO')} | Total: ${formatter.format(finalStats.valor)}`;

            // ⭐ Enviar al GAS con action=send-notification
            const resData = await this.callNotifAPI('send-notification', 'POST', {
                title: titulo,
                body: cuerpo,
                icon: ''
            });

            if (resData && resData.success) {
                alert(`✅ Resumen enviado correctamente.\n${resData.message || ''}`);
                // Disparar check inmediato en el SW
                if (this.swRegistration && this.swRegistration.active) {
                    this.swRegistration.active.postMessage({ type: 'CHECK_NOW' });
                }
            } else {
                throw new Error(resData.message || resData.error || 'Error desconocido');
            }

        } catch (e) {
            console.error(e);
            alert('❌ Error al generar resumen: ' + e.message);
        } finally {
            btn.innerHTML = originalHtml;
            btn.disabled = false;
        }
    }

    updateUIForState(state) {
        const notifToggle = document.getElementById('notifToggle');
        const notifDesc = document.getElementById('notifDesc');
        if (!notifToggle) return;

        console.log('🔔 Actualizando UI de notificaciones: ' + state);
        if (state === 'granted') {
            notifToggle.checked = true;
            if (notifDesc) notifDesc.innerText = 'Estado: Activo';
        } else if (state === 'denied') {
            notifToggle.checked = false;
            if (notifDesc) notifDesc.innerText = 'Estado: Bloqueado';
        } else {
            notifToggle.checked = false;
            if (notifDesc) notifDesc.innerText = 'Estado: Desactivado';
        }
    }

    async requestPermission(isManual = false) {
        try {
            console.log('🔔 Solicitando permisos de notificación...');
            const permission = await Notification.requestPermission();
            this.updateUIForState(permission);

            if (permission === 'granted' && isManual) {
                this.sendTestNotification('¡Notificaciones activadas correctamente!');
                await this.subscribeToPush();
            }
            return permission === 'granted';
        } catch (e) {
            console.error('Error solicitando permiso:', e);
        }
        return false;
    }

    // ============================================
    // Suscribir — usa (VAPID key dinámica + subscribe)
    // ============================================
    async subscribeToPush() {
        if (!this.swRegistration) return;

        try {
            // Obtener la clave VAPID si no la tenemos
            if (!this.vapidPublicKey) {
                const ok = await this.fetchVapidKey();
                if (!ok) {
                    console.warn('⚠️ No se pudo obtener VAPID key, push no disponible');
                    return;
                }
            }

            const applicationServerKey = this.urlBase64ToUint8Array(this.vapidPublicKey);
            const subscription = await this.swRegistration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: applicationServerKey
            });

            this.isSubscribed = true;

            // ⭐ Guardar suscripción en con action=subscribe
            const subJSON = subscription.toJSON();
            const result = await this.callNotifAPI('subscribe', 'POST', subJSON);

            if (result && result.success) {
                console.log('✅ Suscripción guardada:', result.message);
            } else {
                console.warn('⚠️ Respuesta al suscribir:', result);
            }

        } catch (e) {
            console.warn('Push subscribe error:', e.message);
        }
    }

    // ============================================
    // Enviar configuración de polling al SW
    // ============================================
    sendPollingConfigToSW() {
        const userId = window.currentUser ? window.currentUser.id : 'anonimo';

        if (this.swRegistration && this.swRegistration.active) {
            this.swRegistration.active.postMessage({
                type: 'SET_POLLING_CONFIG',
                url: this.notifApiUrl,
                userId: userId,
                lastTs: this.lastNotificationTimestamp
            });
            console.log('🔔 Polling configurado → API');
        }
    }

    sendTestNotification(msg = 'Prueba de notificación local') {
        if (Notification.permission === 'granted') {
            if (this.swRegistration) {
                this.swRegistration.showNotification('PandaDash', {
                    body: msg,
                    icon: 'icons/icon-192.png',
                    badge: 'icons/icon-192.png',
                    vibrate: [100, 50, 100],
                    tag: 'test-notification'
                });
            } else {
                new Notification('PandaDash', { body: msg });
            }
        } else {
            this.requestPermission(false);
        }
    }

    urlBase64ToUint8Array(base64String) {
        const padding = '='.repeat((4 - base64String.length % 4) % 4);
        const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
        const rawData = window.atob(base64);
        const outputArray = new Uint8Array(rawData.length);
        for (let i = 0; i < rawData.length; ++i) outputArray[i] = rawData.charCodeAt(i);
        return outputArray;
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.notificationManager = new NotificationManager();
    });
} else {
    window.notificationManager = new NotificationManager();
}