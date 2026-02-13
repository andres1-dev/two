// js/push_notificaciones.js - Sistema de Notificaciones Internas (Web Push)

const PushManager = {
    // LLAVE PÚBLICA VAPID (Placeholder - El usuario debe generar la suya o usar una fija para pruebas)
    // Se recomienda generar una y guardarla en configuracion.js
    PUBLIC_URL_SAFE_KEY: 'BIp55Uu1q_pW3uE2X9N1wGg-2c3b_s4v_xWw_Placeholder_Key',

    // Inicializar
    init: async function () {
        if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
            console.warn('Este navegador no soporta Notificaciones Push');
            return;
        }

        // Registrar suscripción automáticamente si está logueado
        if (typeof currentUser !== 'undefined' && currentUser) {
            this.suscribirUsuario();
        }
    },

    // Suscribir al usuario actual
    suscribirUsuario: async function () {
        try {
            const registration = await navigator.serviceWorker.ready;

            // Verificar si ya está suscrito
            let subscription = await registration.pushManager.getSubscription();

            if (subscription) {
                console.log('Usuario ya suscrito a Push');
                return subscription;
            }

            // Suscribir
            console.log('Suscribiendo usuario a notificaciones...');
            subscription = await registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: this.urlBase64ToUint8Array(this.PUBLIC_URL_SAFE_KEY)
            });

            console.log('Suscripción generada:', subscription);

            // Enviar suscripción al servidor (GAS)
            await this.enviarSuscripcionAlServidor(subscription);

            return subscription;
        } catch (error) {
            console.error('Error suscribiendo a Push:', error);
        }
    },

    // Enviar la suscripción a Google Apps Script
    enviarSuscripcionAlServidor: async function (subscription) {
        if (!typeof currentUser !== 'undefined' || !currentUser) return;

        try {
            const formData = new FormData();
            formData.append('action', 'save_push_subscription');
            formData.append('userId', currentUser.id);
            formData.append('subscription', JSON.stringify(subscription));

            const response = await fetch(API_URL_POST, {
                method: 'POST',
                body: formData
            });

            const result = await response.json();
            if (result.success) {
                console.log('Suscripción guardada en el servidor');
            }
        } catch (error) {
            console.error('Error enviando suscripción al servidor:', error);
        }
    },

    // Notificar a todos (Función para el Administrador)
    notificarATodos: async function (titulo, mensaje) {
        if (currentUser.rol !== 'ADMIN') {
            alert('Solo el administrador puede enviar notificaciones globales.');
            return;
        }

        try {
            const formData = new FormData();
            formData.append('action', 'send_push_notification');
            formData.append('title', titulo);
            formData.append('body', mensaje);

            const response = await fetch(API_URL_POST, {
                method: 'POST',
                body: formData
            });

            const result = await response.json();
            return result.success;
        } catch (error) {
            console.error('Error enviando notificación global:', error);
            return false;
        }
    },

    // Utilidad para convertir la llave VAPID
    urlBase64ToUint8Array: function (base64String) {
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
};

// Auto-inicializar cuando el documento esté listo
document.addEventListener('DOMContentLoaded', () => PushManager.init());
