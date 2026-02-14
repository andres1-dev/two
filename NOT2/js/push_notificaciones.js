const PushManager = {
    // Inicializar
    init: async function () {
        if (!('serviceWorker' in navigator)) {
            console.warn('Este navegador no soporta Service Workers');
            return;
        }

        // Solicitar permisos al inicio si no se tienen
        if (Notification.permission === 'default') {
            Notification.requestPermission();
        }
    },

    // Notificar a todos (Solo para Administradores)
    notificarATodos: async function (titulo, mensaje) {
        if (typeof currentUser === 'undefined' || !currentUser || currentUser.rol !== 'ADMIN') {
            alert('Solo el administrador puede enviar notificaciones globales.');
            return false;
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
    }
};

// Auto-inicializar
document.addEventListener('DOMContentLoaded', () => PushManager.init());
