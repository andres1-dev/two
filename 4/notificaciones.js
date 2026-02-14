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
        console.log('🔔 Configurando UI de notificaciones...');
        const notifToggle = document.getElementById('notifToggle');
        const summaryBtn = document.getElementById('sendSummaryBtn');
        const broadcastBtn = document.getElementById('broadcastNotificationBtn');

        if (notifToggle) {
            notifToggle.onchange = (e) => {
                if (notifToggle.checked) {
                    this.requestPermission(true);
                } else {
                    alert('Para desactivar totalmente las notificaciones, debes quitarlas desde la configuración del sitio en tu navegador.');
                    if (this.pollingInterval) clearInterval(this.pollingInterval);
                }
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
        // El botón de reporte ahora se inyecta en la sección de Administración de interfaz.js
        // No necesitamos mostrar adminNotifSection si el botón está en otro lugar, 
        // pero podemos usarlo para activar/desactivar el botón inyectado.

        const adminNotifSection = document.getElementById('adminNotifSection');
        if (adminNotifSection) adminNotifSection.style.display = 'none'; // Ya no lo usamos por separado

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

        // La visibilidad del botón de reporte se maneja ahora en interfaz.js/refreshSettingsUI
        // para estar junto al de usuarios.
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

            // 3. Procesar datos (Detección inteligente de entregas)
            const hoy = new Date();
            const d = hoy.getDate();
            const m = hoy.getMonth() + 1;
            const y = hoy.getFullYear();

            const hoyStr1 = `${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')}/${y}`;
            const hoyStr2 = `${d}/${m}/${y}`;

            console.log(`🔍 Buscando entregas. Hoy es: ${hoyStr1}`);

            let facturasHoy = new Set();
            let unidadesHoy = 0;
            let valorHoy = 0;

            // También rastreamos la fecha más reciente encontrada por si "hoy" no tiene datos
            let ultimaFechaEncontrada = "";
            let backupData = { facturas: new Set(), unidades: 0, valor: 0 };

            result.data.forEach(item => {
                const itemsAProcesar = item.datosSiesa || (item.factura ? [item] : []);

                itemsAProcesar.forEach(f => {
                    const esEntregado = f.confirmacion && f.confirmacion.includes('ENTREGADO');
                    if (!esEntregado) return;

                    // Intentar obtener fecha de múltiples campos posibles
                    const fEntrega = f.fechaEntrega || f.fecha || "";
                    if (!fEntrega) return;

                    // 1. Prioridad: Hoy
                    if (fEntrega.includes(hoyStr1) || fEntrega.includes(hoyStr2)) {
                        facturasHoy.add(f.factura);
                        unidadesHoy += parseFloat(f.cantidad) || 0;
                        valorHoy += parseFloat(f.valorBruto) || 0;
                    }

                    // 2. Backup: Rastrear la fecha más reciente para el reporte si hoy está vacío
                    // Extraer solo la parte de la fecha (DD/MM/YYYY)
                    const fechaLimpiaMatch = fEntrega.match(/(\d{1,2}\/\d{1,2}\/\d{4})/);
                    if (fechaLimpiaMatch) {
                        const fechaLimpia = fechaLimpiaMatch[1];
                        if (fechaLimpia > ultimaFechaEncontrada) {
                            ultimaFechaEncontrada = fechaLimpia;
                            backupData.facturas = new Set([f.factura]);
                            backupData.unidades = parseFloat(f.cantidad) || 0;
                            backupData.valor = parseFloat(f.valorBruto) || 0;
                        } else if (fechaLimpia === ultimaFechaEncontrada) {
                            backupData.facturas.add(f.factura);
                            backupData.unidades += parseFloat(f.cantidad) || 0;
                            backupData.valor += parseFloat(f.valorBruto) || 0;
                        }
                    }
                });
            });

            // Decidir qué datos usar
            let tituloFecha = hoyStr1;
            if (facturasHoy.size === 0) {
                if (backupData.facturas.size > 0) {
                    console.log(`⚠️ No hay datos de hoy. Usando datos más recientes del: ${ultimaFechaEncontrada}`);
                    facturasHoy = backupData.facturas;
                    unidadesHoy = backupData.unidades;
                    valorHoy = backupData.valor;
                    tituloFecha = ultimaFechaEncontrada;
                } else {
                    alert('No se encontraron registros de entregas recientes en el sistema.');
                    return;
                }
            }

            // 4. Formatear Mensaje Profesional
            const formatter = new Intl.NumberFormat('es-CO', {
                style: 'currency',
                currency: 'COP',
                minimumFractionDigits: 0
            });

            const titulo = `REPORTE DE ENTREGAS | ${tituloFecha}`;
            const cuerpo = `Entregas: ${facturasHoy.size} | Unidades: ${unidadesHoy.toLocaleString('es-CO')} | Total: ${formatter.format(valorHoy)}`;

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
        // Función deshabilitada por petición del usuario
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
