class NotificationManager {
    constructor() {
        this.swRegistration = null;
        this.isSubscribed = false;
        this.vapidPublicKey = 'BCmC8fdwQf-J8GzQJ902q-gA';
        this.lastNotificationTimestamp = parseInt(localStorage.getItem('last_push_notif_ts')) || 0;
        this.pollingInterval = null;

        console.log('🔔 NotificationManager Constructor iniciado');

        // Configurar UI de inmediato
        this.setupUI();

        // Inicializar SW y Polling
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
            // Intentar obtener el registro del SW
            this.swRegistration = await navigator.serviceWorker.getRegistration() || await navigator.serviceWorker.ready;

            if (this.swRegistration) {
                console.log('✅ Service Worker vinculado a Notificaciones');
                this.updateUIForState(Notification.permission);
                this.startPolling(30000);
                this.sendPollingConfigToSW();
            } else {
                console.warn('⚠️ No se encontró Service Worker registrado. Las notificaciones push no funcionarán.');
            }
        } catch (e) {
            console.error('❌ Error en NotificationManager.init():', e);
        }
    }

    setupUI() {
        console.log('🔔 Configurando botones de notificaciones en UI');
        const testBtn = document.getElementById('testNotificationBtn');
        const broadcastBtn = document.getElementById('broadcastNotificationBtn');
        const reqPermBtn = document.getElementById('reqPermissionBtn');
        const summaryBtn = document.getElementById('sendSummaryBtn');

        if (testBtn) {
            testBtn.onclick = (e) => {
                e.preventDefault();
                this.sendTestNotification();
            };
        }

        if (broadcastBtn) {
            broadcastBtn.onclick = (e) => {
                e.preventDefault();
                this.sendBroadcast();
            };
        }

        if (reqPermBtn) {
            reqPermBtn.onclick = (e) => {
                e.preventDefault();
                this.requestPermission(true);
            };
        }

        if (summaryBtn) {
            summaryBtn.onclick = (e) => {
                e.preventDefault();
                this.sendDailySummary();
            };
        }

        // Aplicar permisos de rol después de una pequeña espera
        setTimeout(() => this.applyRolePermissions(), 1000);
    }

    applyRolePermissions() {
        const broadcastBtn = document.getElementById('broadcastNotificationBtn');
        const summaryBtn = document.getElementById('sendSummaryBtn');

        let role = null;
        if (window.currentUser) {
            role = window.currentUser.rol;
        } else {
            const stored = localStorage.getItem('pandaDashUser');
            if (stored) {
                try {
                    role = JSON.parse(stored).rol;
                } catch (e) { }
            }
        }

        if (role === 'ADMIN') {
            if (broadcastBtn) broadcastBtn.style.display = 'flex';
            if (summaryBtn) summaryBtn.style.display = 'flex';
        } else {
            if (broadcastBtn) broadcastBtn.style.display = 'none';
            if (summaryBtn) summaryBtn.style.display = 'none';
        }
    }

    async sendDailySummary() {
        const btn = document.getElementById('sendSummaryBtn');
        const originalHtml = btn.innerHTML;

        if (!confirm('¿Deseas generar y enviar el resumen de entregas de hoy a todos los usuarios?')) return;

        try {
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Analizando...';
            btn.disabled = true;

            // 1. Obtener datos frescos
            const result = await window.obtenerDatosFacturados();
            if (!result || !result.success) throw new Error('No se pudieron obtener los datos');

            // 2. Preparar filtros de "hoy" (Ajustado a formato local)
            const hoy = new Date();
            const hoyStr = hoy.toLocaleDateString('es-CO'); // Formato DD/MM/YYYY o similar según OS

            // Alternativa: obtener día, mes, año manual para comparar
            const d = hoy.getDate();
            const m = hoy.getMonth() + 1;
            const y = hoy.getFullYear();

            let facturasHoy = new Set();
            let unidadesHoy = 0;
            let valorHoy = 0;

            // 3. Procesar datos
            result.data.forEach(item => {
                if (item.datosSiesa) {
                    item.datosSiesa.forEach(f => {
                        if (f.fechaEntrega && f.confirmacion.includes('ENTREGADO')) {
                            // Validar si la fecha de entrega es hoy
                            // Soportes suele traer "DD/MM/YYYY HH:mm:ss" o similar
                            if (f.fechaEntrega.includes(`${d}/${m}/${y}`) ||
                                f.fechaEntrega.includes(`${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')}/${y}`)) {

                                facturasHoy.add(f.factura);
                                unidadesHoy += parseFloat(f.cantidad) || 0;
                                valorHoy += parseFloat(f.valorBruto) || 0;
                            }
                        }
                    });
                }
            });

            if (facturasHoy.size === 0) {
                alert('No se encontraron entregas registradas con fecha de hoy.');
                return;
            }

            // 4. Formatear Mensaje Profesional (Sin emojis, usando separadores |)
            const formatter = new Intl.NumberFormat('es-CO', {
                style: 'currency',
                currency: 'COP',
                minimumFractionDigits: 0
            });

            const titulo = `REPORTE DE ENTREGAS | ${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')}/${y}`;
            const cuerpo = `Facturas: ${facturasHoy.size} | Unidades: ${unidadesHoy.toLocaleString('es-CO')} | Total: ${formatter.format(valorHoy)}`;

            // 5. Enviar vía Broadcast
            const urlToUse = typeof API_URL_POST !== 'undefined' ? API_URL_POST : (window.CONFIG ? window.CONFIG.API_URL_POST : null);
            const formData = new FormData();
            formData.append('action', 'send_push_notification');
            formData.append('title', titulo);
            formData.append('body', cuerpo);

            const res = await fetch(urlToUse, { method: 'POST', body: formData });
            const resData = await res.json();

            if (resData.success) {
                alert('✅ Resumen diario enviado correctamente.');
                this.checkBackendNotifications();
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
        const reqPermBtn = document.getElementById('reqPermissionBtn');
        if (!reqPermBtn) return;

        console.log('🔔 Actualizando UI de notificaciones: ' + state);
        if (state === 'granted') {
            reqPermBtn.innerHTML = '<i class="fas fa-check-circle"></i> Notificaciones Activas';
            reqPermBtn.style.color = '#10b981';
            reqPermBtn.disabled = true;
        } else if (state === 'denied') {
            reqPermBtn.innerHTML = '<i class="fas fa-exclamation-triangle"></i> Permisos Bloqueados';
            reqPermBtn.style.color = '#ef4444';
        } else if (state === 'unsupported') {
            reqPermBtn.innerHTML = '<i class="fas fa-times-circle"></i> No Soportado';
            reqPermBtn.style.display = 'none';
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
        // CORRECCIÓN: Usar API_URL_POST global en lugar de CONFIG.API_URL_POST
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
        if (this.swRegistration && this.swRegistration.active && urlToUse) {
            this.swRegistration.active.postMessage({
                type: 'SET_POLLING_CONFIG',
                url: urlToUse,
                lastTs: this.lastNotificationTimestamp
            });
        }
    }

    async sendBroadcast() {
        const urlToUse = typeof API_URL_POST !== 'undefined' ? API_URL_POST : (window.CONFIG ? window.CONFIG.API_URL_POST : null);
        if (!urlToUse) {
            alert('Error: URL de API no configurada');
            return;
        }

        const title = prompt('Título de la notificación:', 'Aviso PandaDash');
        if (!title) return;
        const body = prompt('Mensaje del broadcast:', 'Hay una nueva actualización disponible.');
        if (!body) return;

        const btn = document.getElementById('broadcastNotificationBtn');
        const originalHtml = btn.innerHTML;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Enviando...';
        btn.disabled = true;

        const formData = new FormData();
        formData.append('action', 'send_push_notification');
        formData.append('title', title);
        formData.append('body', body);

        try {
            const res = await fetch(urlToUse, { method: 'POST', body: formData });
            const data = await res.json();
            if (data.success) {
                alert('✅ Broadcast enviado a todos los usuarios');
                // Auto-refresh polling to see it ourselves
                this.checkBackendNotifications();
            } else {
                alert('❌ Error: ' + data.message);
            }
        } catch (e) {
            alert('❌ Error de conexión al servidor');
        } finally {
            btn.innerHTML = originalHtml;
            btn.disabled = false;
        }
    }

    sendTestNotification(msg = 'Prueba de notificación local') {
        if (Notification.permission === 'granted') {
            if (this.swRegistration) {
                this.swRegistration.showNotification('PandaDash Pro', {
                    body: msg,
                    icon: 'icons/icon-192.png',
                    badge: 'icons/icon-192.png',
                    vibrate: [100, 50, 100],
                    tag: 'test-notification'
                });
            } else {
                new Notification('PandaDash Pro', { body: msg });
            }
        } else {
            // Si no tiene permiso, lo pedimos, pero sin disparar el test auto de nuevo para evitar bucles
            this.requestPermission(false);
        }
    }

    startPolling(ms) {
        if (this.pollingInterval) clearInterval(this.pollingInterval);
        this.pollingInterval = setInterval(() => this.checkBackendNotifications(), ms);
        this.checkBackendNotifications();
    }

    async checkBackendNotifications() {
        const urlToUse = typeof API_URL_POST !== 'undefined' ? API_URL_POST : (window.CONFIG ? window.CONFIG.API_URL_POST : null);
        if (!urlToUse || Notification.permission !== 'granted') return;

        try {
            const res = await fetch(`${urlToUse}${urlToUse.includes('?') ? '&' : '?'}action=check_notification`);
            const data = await res.json();

            if (data.success && data.notification) {
                const notif = data.notification;
                const ts = parseInt(notif.timestamp);

                if (ts > this.lastNotificationTimestamp) {
                    this.lastNotificationTimestamp = ts;
                    localStorage.setItem('last_push_notif_ts', ts);
                    this.sendTestNotification(notif.body);
                }
            }
        } catch (e) { }
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

// Inicializar cuando el DOM esté listo o de inmediato si ya lo está
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.notificationManager = new NotificationManager();
    });
} else {
    window.notificationManager = new NotificationManager();
}
