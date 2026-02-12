let notificationContainer = null;

function initializeNotifications() {
    if (!document.getElementById('notificationContainer')) {
        const container = document.createElement('div');
        container.id = 'notificationContainer';
        container.className = 'notification-container';
        document.body.appendChild(container);
        notificationContainer = container;
    }
}

function showMessage(message, type = 'info', duration = 2000) {
    initializeNotifications();

    const container = document.getElementById('notificationContainer');
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;

    const iconName = getNotificationIcon(type);

    notification.innerHTML = `
        <div class="notification-icon">
            <i class="codicon codicon-${iconName}"></i>
        </div>
        <div class="notification-content">
            <p class="notification-message">${message}</p>
        </div>
        <button class="notification-close" onclick="this.parentElement.remove()">
            <i class="codicon codicon-close"></i>
        </button>
    `;

    container.appendChild(notification);

    if (duration > 0) {
        setTimeout(() => {
            if (notification.parentElement) {
                notification.classList.add('fade-out');
                setTimeout(() => {
                    if (notification.parentElement) {
                        notification.remove();
                    }
                }, 250);
            }
        }, duration);
    }

    return notification;
}

function showQuickLoading(message = 'Procesando...') {
    const notification = showMessage(message, 'info', 0);
    notification.classList.add('loading-notification');

    const icon = notification.querySelector('.notification-icon');
    icon.innerHTML = '<span class="loading-spinner"></span>';

    return {
        close: () => {
            if (notification.parentElement) {
                notification.classList.add('fade-out');
                setTimeout(() => {
                    if (notification.parentElement) {
                        notification.remove();
                    }
                }, 250);
            }
        }
    };
}

function getNotificationIcon(type) {
    const icons = {
        'info': 'info',
        'success': 'check',
        'warning': 'warning',
        'error': 'error'
    };
    return icons[type] || 'info';
}