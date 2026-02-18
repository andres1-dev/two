class NotificationManager {
    constructor() {
        this.swRegistration = null;
        this.isSubscribed = false;
        this.vapidPublicKey = 'BCmC8fdwQf-J8GzQJ902q-gA';
        this.lastNotificationTimestamp = 0;

        console.log('🔔 NotificationManager Constructor iniciado');
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
            const cuerpo = `Entregas: ${finalStats.facturas.size} | Unidades: ${finalStats.unidades.toLocaleString('es-CO')} | Total: ${formatter.format(finalStats.valor)}`;

            const urlToUse = typeof API_URL_POST !== 'undefined' ? API_URL_POST : (window.CONFIG ? window.CONFIG.API_URL_POST : null);
            const formData = new FormData();
            formData.append('action', 'send_push_notification');
            formData.append('title', titulo);
            formData.append('body', cuerpo);

            const res = await fetch(urlToUse, { method: 'POST', body: formData });
            const resData = await res.json();

            if (resData.success) {
                alert('✅ Resumen diario enviado correctamente.');
                if (this.swRegistration && this.swRegistration.active) {
                    this.swRegistration.active.postMessage({ type: 'CHECK_NOW' });
                }
            } else {
                throw new Error(resData.message);
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

    async subscribeToPush() {
        if (!this.vapidPublicKey || this.vapidPublicKey.length < 10 || !this.swRegistration) return;

        try {
            const applicationServerKey = this.urlBase64ToUint8Array(this.vapidPublicKey);
            const subscription = await this.swRegistration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: applicationServerKey
            });
            this.isSubscribed = true;
            await this.saveSubscriptionToBackend(subscription);
        } catch (e) {
            console.warn('Push manual no soportado o configurado:', e.message);
        }
    }

    async saveSubscriptionToBackend(subscription) {
        const urlToUse = typeof API_URL_POST !== 'undefined' ? API_URL_POST : (window.CONFIG ? window.CONFIG.API_URL_POST : null);
        if (!urlToUse) return;

        let userId = window.currentUser ? window.currentUser.id : 'anonimo';

        const formData = new FormData();
        formData.append('action', 'save_push_subscription');
        formData.append('userId', userId);
        formData.append('subscription', JSON.stringify(subscription));

        try {
            fetch(urlToUse, { method: 'POST', body: formData });
        } catch (e) { }
    }

    sendPollingConfigToSW() {
        const urlToUse = typeof API_URL_POST !== 'undefined' ? API_URL_POST : (window.CONFIG ? window.CONFIG.API_URL_POST : null);
        const userId = window.currentUser ? window.currentUser.id : 'anonimo';

        if (this.swRegistration && this.swRegistration.active && urlToUse) {
            this.swRegistration.active.postMessage({
                type: 'SET_POLLING_CONFIG',
                url: urlToUse,
                userId: userId,
                lastTs: this.lastNotificationTimestamp
            });
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