function updateStatus(message, type = 'info') {
    const statusMessage = document.getElementById('statusMessage');
    if (statusMessage) {
        statusMessage.textContent = message;

        const statusIcon = statusMessage.previousElementSibling;
        if (statusIcon) {
            statusIcon.className = `codicon codicon-${getStatusIcon(type)}`;
        }
    }
}

function getStatusIcon(type) {
    const icons = {
        'info': 'info',
        'success': 'check',
        'warning': 'warning',
        'error': 'error',
        'loading': 'sync~spin'
    };
    return icons[type] || 'info';
}