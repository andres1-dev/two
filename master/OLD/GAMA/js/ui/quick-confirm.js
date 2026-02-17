function showQuickConfirm(title, message, confirmText = 'Confirmar', cancelText = 'Cancelar', type = 'warning', tableData = null) {
    return new Promise((resolve) => {
        const iconConfig = {
            'warning': { icon: 'codicon-warning', color: 'var(--warning)' },
            'error': { icon: 'codicon-error', color: 'var(--error)' },
            'info': { icon: 'codicon-info', color: 'var(--info)' },
            'success': { icon: 'codicon-check', color: 'var(--success)' }
        };

        const config = iconConfig[type] || iconConfig.warning;

        let tableHTML = '';
        if (tableData) {
            tableHTML = `
                <div style="margin: 16px 0; border-radius: 8px; padding: 16px; border: 1px solid var(--border);">
                    <table style="width: 100%; border-collapse: collapse; font-size: 13px; font-family: 'Segoe UI', sans-serif;">
                        <thead>
                            <tr style="border-bottom: 2px solid var(--border);">
                                <th style="text-align: center; padding: 8px 12px; color: var(--text-secondary); font-weight: 600; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px;">Tipo de Bodega</th>
                                <th style="text-align: center; padding: 8px 12px; color: var(--text-secondary); font-weight: 600; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px;">Unidades</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${tableData.map(row => `
                                <tr style="border-bottom: 1px solid var(--border);">
                                    <td style="text-align: center; padding: 10px 12px; color: var(--text); font-weight: 500;">${row.label}</td>
                                    <td style="text-align: center; padding: 10px 12px; color: var(--text); font-weight: 600;">${row.value}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                        <tfoot>
                            <tr style="border-top: 2px solid var(--border);">
                                <td style="text-align: center; padding: 12px; color: var(--text); font-weight: 700; font-size: 13px;">TOTAL GENERAL</td>
                                <td style="text-align: center; padding: 12px; color: var(--text); font-weight: 700; font-size: 14px;">${tableData.reduce((sum, row) => sum + row.value, 0)}</td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            `;
        }

        const modal = createModal('', `
            <div style="padding: 24px; text-align: center;">
                <div class="alert-icon" style="margin: 0 auto 20px;">
                    <i class="codicon ${config.icon} alert-modal-icon" style="color: ${config.color};"></i>
                </div>
                <h3 style="margin: 0 0 16px 0; color: var(--text); font-size: 20px; font-weight: 600; line-height: 1.3;">${title}</h3>
                <p style="margin: 0 0 20px 0; color: var(--text-secondary); line-height: 1.5; font-size: 14px;">${message}</p>
                ${tableHTML}
                <div style="display: flex; gap: 12px; justify-content: center; margin-top: 24px;">
                    <button class="btn-secondary" onclick="closeQuickModal(false)" style="min-width: 100px; padding: 10px 20px;">${cancelText}</button>
                    <button class="btn-primary" onclick="closeQuickModal(true)" style="min-width: 120px; padding: 10px 20px; background-color: ${config.color}; border-color: ${config.color};">
                        <i class="codicon codicon-check"></i>
                        ${confirmText}
                    </button>
                </div>
            </div>
        `, false);

        modal.style.display = 'flex';
        modal.alignItems = 'center';
        modal.justifyContent = 'center';

        const modalContent = modal.querySelector('.modal-content');
        modalContent.style.maxWidth = '480px';
        modalContent.style.borderRadius = '12px';
        modalContent.style.boxShadow = '0 10px 40px rgba(0, 0, 0, 0.3)';

        const style = document.createElement('style');
        style.textContent = `
            .alert-modal-icon {
                font-size: 40px !important;
                width: 40px !important;
                height: 40px !important;
                line-height: 40px !important;
            }
        `;
        document.head.appendChild(style);

        window.closeQuickModal = function (result) {
            if (style && style.parentNode) style.remove();
            if (modal && modal.parentNode) modal.remove();
            resolve(result);
        };
    });
}

function showQuickChoice(title, message, options) {
    return new Promise((resolve) => {
        const modal = createModal(title, `
            <div style="padding: 24px; max-width: 500px;">
                <div style="margin-bottom: 20px;">
                    <h3 style="margin: 0 0 16px 0; color: var(--text);">${title}</h3>
                    <div style="color: var(--text-secondary); line-height: 1.5;">${message}</div>
                </div>
                
                <div style="display: flex; flex-direction: column; gap: 8px; margin-bottom: 24px;">
                    ${options.map(option => `
                        <button class="choice-option" data-choice="${option.id}" 
                                style="text-align: left; padding: 12px 16px; border: 1px solid var(--border); 
                                       border-radius: 6px; background: var(--sidebar); cursor: pointer;
                                       transition: all 0.2s;">
                            <div style="display: flex; align-items: center; gap: 12px;">
                                <div style="color: ${option.color};">
                                    <i class="codicon ${option.icon}"></i>
                                </div>
                                <div style="flex: 1;">
                                    <div style="font-weight: 600; color: var(--text);">${option.text}</div>
                                    <div style="font-size: 12px; color: var(--text-secondary); margin-top: 4px;">
                                        ${option.description}
                                    </div>
                                </div>
                                <i class="codicon codicon-chevron-right" style="color: var(--text-secondary);"></i>
                            </div>
                        </button>
                    `).join('')}
                </div>
                
                <div style="display: flex; justify-content: flex-end;">
                    <button class="btn-secondary" onclick="closeChoiceModal(null)">Cancelar</button>
                </div>
            </div>
        `, false);

        modal.querySelectorAll('.choice-option').forEach(button => {
            button.addEventListener('click', function () {
                const choice = this.dataset.choice;
                closeChoiceModal(choice);
            });
        });

        window.closeChoiceModal = function (choice) {
            if (modal && modal.parentNode) modal.remove();
            resolve(choice);
        };
    });
}