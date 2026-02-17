// ============================================
// ESTILOS CSS EMBEBIDOS
// ============================================

const resultsGridCSS = `
.results-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 16px;
    margin-bottom: 20px;
}

.result-card {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 16px;
    border: 1px solid var(--border);
    border-radius: 4px;
    background-color: var(--sidebar);
}

.result-icon {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
}

.result-icon.success { background-color: var(--success); }
.result-icon.info { background-color: var(--info); }
.result-icon.warning { background-color: var(--warning); }
.result-icon.error { background-color: var(--error); }

.result-info {
    flex: 1;
}

.result-value {
    font-size: 24px;
    font-weight: 600;
    line-height: 1;
    margin-bottom: 4px;
}

.result-label {
    font-size: 12px;
    color: var(--text-secondary);
}

.results-details {
    border-top: 1px solid var(--border);
    padding-top: 16px;
}

.detail-item {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 0;
    color: var(--text-secondary);
}
`;

const notificationsCSS = `
.notification-container {
    position: fixed;
    top: 20px;
    right: 20px;
    z-index: 10000;
    display: flex;
    flex-direction: column;
    gap: 10px;
    max-width: 400px;
}

.notification {
    background: var(--editor);
    border: 1px solid var(--border);
    border-radius: 4px;
    padding: 12px 16px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    display: flex;
    align-items: flex-start;
    gap: 12px;
    animation: slideInRight 0.2s ease-out;
    max-width: 400px;
    border-left: 3px solid transparent;
}

.notification.success { border-left-color: var(--success); }
.notification.error { border-left-color: var(--error); }
.notification.warning { border-left-color: var(--warning); }
.notification.info { border-left-color: var(--info); }

.notification.fade-out {
    animation: slideOutRight 0.2s ease-in forwards;
}

.notification-icon {
    flex-shrink: 0;
    margin-top: 2px;
}

.notification.success .notification-icon { color: var(--success); }
.notification.error .notification-icon { color: var(--error); }
.notification.warning .notification-icon { color: var(--warning); }
.notification.info .notification-icon { color: var(--info); }

.loading-notification .notification-icon {
    color: var(--info) !important;
}

.notification-content {
    flex: 1;
    min-width: 0;
}

.notification-message {
    margin: 0;
    font-size: 13px;
    line-height: 1.4;
    color: var(--text);
    word-wrap: break-word;
}

.notification-close {
    background: none;
    border: none;
    color: var(--text-secondary);
    cursor: pointer;
    padding: 4px;
    border-radius: 3px;
    flex-shrink: 0;
    margin-top: -2px;
}

.notification-close:hover {
    background: var(--hover);
    color: var(--text);
}

@keyframes slideInRight {
    from { transform: translateX(100%); opacity: 0; }
    to { transform: translateX(0); opacity: 1; }
}

@keyframes slideOutRight {
    from { transform: translateX(0); opacity: 1; }
    to { transform: translateX(100%); opacity: 0; }
}
`;

const iconAdjustmentsCSS = `
.codicon {
    font-size: 16px !important;
    width: 16px !important;
    height: 16px !important;
    line-height: 16px !important;
    vertical-align: middle !important;
}

.activity-icon .codicon {
    font-size: 20px !important;
    width: 20px !important;
    height: 20px !important;
}

.tab .codicon {
    margin-right: 6px;
}

.btn-primary .codicon,
.btn-secondary .codicon,
.btn-success .codicon {
    margin-right: 6px;
}

.btn-icon .codicon {
    margin-right: 0 !important;
}

.form-group label .codicon {
    margin-right: 6px;
    opacity: 0.8;
}

.status-item .codicon {
    margin-right: 6px;
}

.modal-header .codicon {
    margin-right: 8px;
}

.loading-spinner {
    width: 14px !important;
    height: 14px !important;
    border-width: 2px !important;
}

.btn-primary .loading-spinner,
.btn-secondary .loading-spinner,
.btn-success .loading-spinner {
    margin-right: 6px;
}

#themeToggle .codicon {
    font-size: 18px !important;
}

.upload-box .codicon {
    font-size: 48px !important;
    width: 48px !important;
    height: 48px !important;
    margin-bottom: 16px;
}

.result-icon .codicon {
    font-size: 18px !important;
    width: 18px !important;
    height: 18px !important;
}
`;

const successStateCSS = `
.success-state {
    text-align: center;
    padding: 40px 20px;
    background: var(--editor);
    border-radius: 6px;
    border: 2px solid var(--success);
}

.success-state h3 {
    color: var(--success);
    margin-bottom: 16px;
}

.success-state p {
    color: var(--text-secondary);
    margin-bottom: 8px;
}

.success-state .codicon {
    font-size: 64px;
    margin-bottom: 24px;
    color: var(--success);
}
`;

const alertModalCSS = `
.alert-icon {
    width: 64px;
    height: 64px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    margin: 0 auto 20px;
    background-color: rgba(0, 120, 212, 0.1);
}

.alert-modal-icon {
    font-size: 40px !important;
    width: 40px !important;
    height: 40px !important;
    line-height: 40px !important;
}

.modal-content {
    background-color: var(--editor);
    border: 1px solid var(--border);
}

.modal-body {
    background-color: var(--editor);
}

.choice-option:hover {
    background: var(--hover) !important;
    border-color: var(--primary) !important;
    transform: translateY(-1px);
}
`;

function injectAllCSS() {
    const style = document.createElement('style');
    style.textContent = `
        ${resultsGridCSS}
        ${notificationsCSS}
        ${iconAdjustmentsCSS}
        ${successStateCSS}
        ${alertModalCSS}
    `;
    document.head.appendChild(style);
}