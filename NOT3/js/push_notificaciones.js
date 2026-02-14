const PushManager = {
    // Inicializar
    init: function () {
        console.log('PushManager inicializado');

        // Verificar si es un entorno seguro (HTTPS)
        if (window.location.protocol !== 'https:' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
            console.warn('⚠️ La PWA requiere HTTPS para notificaciones nativas.');
        }

        this.checkInitialPermissions();
    },

    // Verificar estado inicial
    checkInitialPermissions: function () {
        if (!('Notification' in window)) {
            console.warn('Este dispositivo no soporta notificaciones.');
            return;
        }

        console.log('Estado actual de permisos:', Notification.permission);
        if (Notification.permission === 'granted') {
            this.statusFeedback('✅ Notificaciones Activas');
        }
    },

    // Solicitar permisos con feedback
    solicitarPermisos: async function () {
        if (!('Notification' in window)) {
            alert('Notificaciones no soportadas en este equipo.');
            return false;
        }

        try {
            console.log('Pidiendo permiso al usuario...');
            const permission = await Notification.requestPermission();

            if (permission === 'granted') {
                console.log('Permiso concedido por el usuario.');
                this.statusFeedback('✅ Notificaciones Habilitadas');

                // Notificación local inmediata para confirmar
                this.enviarNotificacionLocal("Sistema Configurado", "Recibirás aquí los resúmenes de PandaDash.");
                return true;
            } else {
                console.warn('Permiso denegado:', permission);
                this.statusFeedback('❌ Notificaciones Bloqueadas');
                return false;
            }
        } catch (error) {
            console.error('Error solicitando permisos:', error);
            return false;
        }
    },

    // Enviar notificación local (confirmación rápida)
    enviarNotificacionLocal: function (titulo, mensaje) {
        if (!('serviceWorker' in navigator)) return;

        navigator.serviceWorker.ready.then(registration => {
            registration.showNotification(titulo, {
                body: mensaje,
                icon: 'icons/icon-192.png',
                vibrate: [100, 50, 100],
                tag: 'panda-local-check'
            });
        });
    },

    // Actualizar UI si existe algún indicador
    statusFeedback: function (text) {
        const indicator = document.getElementById('notif-status-badge');
        if (indicator) {
            indicator.textContent = text;
            indicator.className = 'status-badge ' + (text.includes('✅') ? 'active' : 'inactive');
        }
    },

    // Notificar a todos (Llamada a GAS)
    notificarATodos: async function (titulo, mensaje) {
        if (typeof currentUser === 'undefined' || !currentUser || currentUser.rol !== 'ADMIN') {
            alert('Solo el administrador puede enviar notificaciones.');
            return false;
        }

        try {
            console.log('Enviando notificación global a través de GAS...');
            const formData = new FormData();
            formData.append('action', 'send_push_notification');
            formData.append('title', titulo);
            formData.append('body', mensaje);

            const response = await fetch(API_URL_POST, {
                method: 'POST',
                body: formData
            });

            const result = await response.json();
            if (result.success) {
                console.log('Notificación procesada en el servidor.');
                return true;
            }
            return false;
        } catch (error) {
            console.error('Error en notificarATodos:', error);
            return false;
        }
    }
};

// Auto-inicializar
document.addEventListener('DOMContentLoaded', () => PushManager.init());
