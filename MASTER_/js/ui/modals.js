function createModal(title, content, showCloseButton = true) {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h3>${title}</h3>
                ${showCloseButton ? '<button class="btn-icon" onclick="this.closest(\'.modal\').remove()"><i class="codicon codicon-close"></i></button>' : ''}
            </div>
            <div class="modal-body">
                ${content}
            </div>
        </div>
    `;

    modal.addEventListener('click', function (e) {
        if (e.target === modal) {
            modal.remove();
        }
    });

    document.getElementById('modalContainer').appendChild(modal);
    return modal;
}

function showSettingsModal() {
    const currentTheme = getCurrentTheme();

    createModal('Configuración', `
        <div style="padding: 16px 0;">
            <div class="form-group">
                <label for="settingTheme">Tema de la interfaz</label>
                <select id="settingTheme" class="form-control">
                    <option value="light" ${currentTheme === 'light' ? 'selected' : ''}>Claro</option>
                    <option value="dark" ${currentTheme === 'dark' ? 'selected' : ''}>Oscuro</option>
                </select>
            </div>
            <div class="form-group">
                <label for="settingApiKey">API Key de Google Sheets</label>
                <input type="password" id="settingApiKey" class="form-control" value="${API_KEY}" readonly>
                <small style="color: var(--text-secondary);">API Key de solo lectura</small>
            </div>
            <div class="form-group">
                <label for="settingSpreadsheetId">ID de la Hoja de Cálculo</label>
                <input type="text" id="settingSpreadsheetId" class="form-control" value="${SPREADSHEET_ID}" readonly>
            </div>
            <div style="display: flex; gap: 8px; justify-content: flex-end; margin-top: 20px;">
                <button class="btn-secondary" onclick="this.closest('.modal').remove()">Cerrar</button>
                <button class="btn-primary" onclick="saveSettings()">Guardar</button>
            </div>
        </div>
    `, true);
}

function saveSettings() {
    const themeSelect = document.getElementById('settingTheme');
    const newTheme = themeSelect.value;

    document.body.className = `vscode-${newTheme}`;
    localStorage.setItem('vscode-theme', newTheme);
    updateThemeIcon(newTheme);

    document.querySelector('.modal').remove();
    showMessage('Configuración guardada correctamente', 'success', 1500);
}