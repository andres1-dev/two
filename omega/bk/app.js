// Constants and Global Variables
const API_KEY = 'AIzaSyC7hjbRc0TGLgImv8gVZg8tsOeYWgXlPcM';
const SPREADSHEET_ID = '133NiyjNApZGkEFs4jUvpJ9So-cSEzRVeW2FblwOCrjI';
const GAS_URL = 'https://script.google.com/macros/s/AKfycbyM5AsR4WOLdfPWBp4uW_diONnaiaAThobOUE1Q4kwgSMXSsuorpdsmT8c52CeDXPgI/exec';

let processedData = [];
let coloresMap = new Map();
let data2Map = new Map();
let preciosMap = new Map();
let sisproMap = new Map();
let historicasMap = new Map();
let clientesMap = new Map();
let currentOPData = null;
let cancelledTransfers = new Set();
let transferListData = [];

// Configuration Objects
const escanersMap = {
    "LORTIZ": "LEIDY TATIANA ORTIZ",
    "PSANCHEZ": "PAULA VANESSA SANCHEZ ERAZO",
    "APOLO": "ANGIE LIZETH POLO CAPERA",
    "KFERNANDEZ": "KELLY TATIANA FERNANDEZ ASTUDILLO",
    "MONCALEANO": "NICOLE VALERIA MONCALEANO DIAZ",
    "LOCHOA": "LESLY CAMILA OCHOA PEDRAZA",
    "PJARAMILLO": "PILAR CRISTINA JARAMILLO SANCHEZ",
    "CMENDOZA": "CARLOS ANDRES MENDOZA ARIAS"
};

const bodegasMap = {
    "DI": "PRIMERAS",
    "ZY": "SIN CONFECCIONAR",
    "ZZ": "PROMOCIONES",
    "BP": "COBROS",
    "XT": "TRANSITO",
    "PR": "CONTABLE"
};

const tiposMap = {
    "AT": "AJUSTE TALLAS",
    "EC": "ENTRADA CORTE",
    "SA": "SALIDA ALMACEN",
    "SC": "SALIDA COBRO",
    "ST": "SALIDA AJUSTE",
    "TR": "TRASLADO"
};

// Initialize application
document.addEventListener('DOMContentLoaded', function () {
    initializeApp();
});

// Modificar la función initializeApp para inicializar también el módulo de distribución
// Busca la función initializeApp y reemplázala con esta versión:
function initializeApp() {
    setupEventListeners();
    setupTabSystem();
    setupTheme();
    initializeNotifications();

    // Marcamos esto como true desde el inicio para evitar recargas accidentales
    window.distributionInitialized = true;

    // Cargamos TODOS los datos (incluyendo distribución)
    loadDataFromSheets();

    updateStatus('Sistema inicializado correctamente', 'info');
}

// UI Management
function setupEventListeners() {
    // File upload
    const fileInput = document.getElementById('csvFile');
    const uploadBox = document.getElementById('uploadBox');

    fileInput.addEventListener('change', async function (e) {
        if (e.target.files.length > 0) {
            const fileName = e.target.files[0].name;
            updateStatus(`Archivo seleccionado: ${fileName}`, 'success');
            showMessage(`Archivo "${fileName}" cargado. Procesando automáticamente...`, 'success', 2000);

            // Procesar automáticamente después de un breve delay
            setTimeout(() => {
                processCSV();
            }, 500);
        }
    });

    uploadBox.addEventListener('dragover', function (e) {
        e.preventDefault();
        uploadBox.style.borderColor = 'var(--primary)';
        uploadBox.style.backgroundColor = 'var(--hover)';
    });

    uploadBox.addEventListener('dragleave', function (e) {
        e.preventDefault();
        uploadBox.style.borderColor = 'var(--border)';
        uploadBox.style.backgroundColor = 'transparent';
    });

    uploadBox.addEventListener('drop', function (e) {
        e.preventDefault();
        uploadBox.style.borderColor = 'var(--border)';
        uploadBox.style.backgroundColor = 'transparent';

        if (e.dataTransfer.files.length) {
            fileInput.files = e.dataTransfer.files;
            const fileName = e.dataTransfer.files[0].name;
            updateStatus(`Archivo listo: ${fileName}`, 'success');
            showMessage(`Archivo "${fileName}" cargado. Procesando automáticamente...`, 'success', 2000);

            // Procesar automáticamente después de un breve delay
            setTimeout(() => {
                processCSV();
            }, 500);
        }
    });

    // Settings button
    document.getElementById('settingsBtn').addEventListener('click', function () {
        showSettingsModal();
    });

    // Export cancelled transfers button
    const exportBtn = document.getElementById('exportCancelledBtn');
    if (exportBtn) {
        exportBtn.addEventListener('click', exportCancelledTransfers);
    }

    // Import cancelled transfers button
    const importBtn = document.getElementById('importCancelledBtn');
    if (importBtn) {
        importBtn.addEventListener('click', importCancelledTransfers);
    }
}

function setupTabSystem() {
    // Activity bar buttons
    document.querySelectorAll('.activity-icon').forEach(btn => {
        btn.addEventListener('click', function () {
            const tabName = this.dataset.tab;

            // Update activity icons
            document.querySelectorAll('.activity-icon').forEach(icon => {
                icon.classList.remove('active');
            });
            this.classList.add('active');

            // Show corresponding sidebar if it exists
            document.querySelectorAll('.sidebar').forEach(sidebar => {
                sidebar.classList.remove('active');
            });
            const sidebar = document.getElementById(tabName);
            if (sidebar) sidebar.classList.add('active');

            // Activate corresponding tab
            document.querySelectorAll('.tab').forEach(tab => {
                if (tab.dataset.tab === tabName) {
                    tab.click();
                }
            });
        });
    });

    // Tab buttons
    document.querySelectorAll('.tab').forEach(tab => {
        tab.addEventListener('click', function () {
            const tabName = this.dataset.tab;

            // Update tabs
            document.querySelectorAll('.tab').forEach(t => {
                t.classList.remove('active');
            });
            this.classList.add('active');

            // Update tab contents
            document.querySelectorAll('.tab-content').forEach(content => {
                content.classList.remove('active');
            });
            document.getElementById(`${tabName}-content`).classList.add('active');

            // Cargar automáticamente la lista de traslados si es la pestaña de anulación
            if (tabName === 'cancel-transfers') {
                console.log('=== Pestaña Anular Traslados activada ===');

                // Verificar si hay datos procesados
                if (processedData.length === 0) {
                    console.log('No hay datos procesados, mostrando mensaje');
                    const transferList = document.getElementById('transferList');
                    if (transferList) {
                        transferList.innerHTML = `
                            <div class="empty-state">
                                <i class="codicon codicon-info"></i>
                                <h5>Sin datos para mostrar</h5>
                                <p>Primero procesa un archivo CSV para ver los traslados</p>
                            </div>
                        `;
                    }
                } else {
                    console.log('Datos procesados disponibles, cargando lista');
                    loadTransferList();
                    updateCancelledTransfersTable();
                }
            }

            // Inicializar módulo de distribución si es necesario
            if (tabName === 'distribution' && !window.distributionInitialized) {
                console.log('=== Pestaña Distribución activada ===');
                initializeDistribution();
                setupDistributionEventListeners();
                window.distributionInitialized = true;
            }
        });
    });

    // Close tab buttons
    document.querySelectorAll('.tab-close').forEach(btn => {
        btn.addEventListener('click', function (e) {
            e.stopPropagation();
            const tab = this.parentElement;
            tab.style.display = 'none';

            // If this was the active tab, activate another one
            if (tab.classList.contains('active')) {
                const remainingTabs = document.querySelectorAll('.tab:not([style*="display: none"])');
                if (remainingTabs.length > 0) {
                    remainingTabs[0].click();
                }
            }
        });
    });
}

function setupTheme() {
    const themeToggle = document.getElementById('themeToggle');
    const savedTheme = localStorage.getItem('vscode-theme') || 'light';

    // Apply saved theme
    document.body.className = `vscode-${savedTheme}`;
    updateThemeIcon(savedTheme);

    themeToggle.addEventListener('click', function () {
        const currentTheme = document.body.classList.contains('vscode-dark') ? 'dark' : 'light';
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';

        document.body.className = `vscode-${newTheme}`;
        localStorage.setItem('vscode-theme', newTheme);
        updateThemeIcon(newTheme);

        showMessage(`Tema cambiado a ${newTheme === 'dark' ? 'oscuro' : 'claro'}`, 'info', 1500);
    });
}

function updateThemeIcon(theme) {
    const icon = document.querySelector('#themeToggle i');
    icon.className = theme === 'dark' ? 'codicon codicon-sun' : 'codicon codicon-moon';
}

// Status Management
function updateStatus(message, type = 'info') {
    const statusMessage = document.getElementById('statusMessage');
    if (statusMessage) {
        statusMessage.textContent = message;

        // Update icon based on type
        const statusIcon = statusMessage.previousElementSibling;
        if (statusIcon) {
            statusIcon.className = `codicon codicon-${getStatusIcon(type)}`;
        }
    }
}

function updateDataStats() {
    const statsElement = document.getElementById('dataStats');
    if (statsElement) {
        statsElement.textContent =
            `${coloresMap.size} colores | ${data2Map.size} OPs | ${preciosMap.size} precios | ${sisproMap.size} productos | ${clientesMap.size} clientes`;
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

// Notification System
function initializeNotifications() {
    if (!document.getElementById('notificationContainer')) {
        const container = document.createElement('div');
        container.id = 'notificationContainer';
        container.className = 'notification-container';
        document.body.appendChild(container);
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

function getNotificationIcon(type) {
    const icons = {
        'info': 'info',
        'success': 'check',
        'warning': 'warning',
        'error': 'error'
    };
    return icons[type] || 'info';
}

function showQuickConfirm(title, message, confirmText = 'Confirmar', cancelText = 'Cancelar', type = 'warning', tableData = null) {
    return new Promise((resolve) => {
        const iconConfig = {
            'warning': {
                icon: 'codicon-warning',
                color: 'var(--warning)'
            },
            'error': {
                icon: 'codicon-error',
                color: 'var(--error)'
            },
            'info': {
                icon: 'codicon-info',
                color: 'var(--info)'
            },
            'success': {
                icon: 'codicon-check',
                color: 'var(--success)'
            }
        };

        const config = iconConfig[type] || iconConfig.warning;

        // Construir la tabla si hay datos
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

        // Agregar el CSS específico para el icono de la alerta
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
            // Remover el estilo cuando se cierre el modal
            if (style && style.parentNode) {
                style.remove();
            }
            if (modal && modal.parentNode) {
                modal.remove();
            }
            resolve(result);
        };
    });
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

// Modal System
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
    const currentTheme = document.body.classList.contains('vscode-dark') ? 'dark' : 'light';

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

// JSON Editor Functions
function formatJSON() {
    const jsonContent = document.getElementById('jsonContent');
    try {
        const jsonData = JSON.parse(jsonContent.textContent);
        jsonContent.textContent = JSON.stringify(jsonData, null, 2);
        showMessage('JSON formateado correctamente', 'success', 1500);
    } catch (e) {
        showMessage('Error al formatear JSON: ' + e.message, 'error', 2000);
    }
}

function copyJSON() {
    const jsonContent = document.getElementById('jsonContent');
    navigator.clipboard.writeText(jsonContent.textContent).then(() => {
        showMessage('JSON copiado al portapapeles', 'success', 1500);
    }).catch(() => {
        showMessage('Error al copiar JSON', 'error', 2000);
    });
}

function clearJSON() {
    const jsonContent = document.getElementById('jsonContent');
    jsonContent.textContent = '{\n  "mensaje": "Genera un JSON desde la pestaña de OPs Pendientes"\n}';
    showMessage('Editor limpiado', 'info', 1500);
}

// Data Loading Functions
// Busca la función loadDataFromSheets y actualiza el Promise.all:
async function loadDataFromSheets() {
    updateStatus('Cargando datos desde Google Sheets...', 'loading');
    const processBtn = document.getElementById('processBtn');
    if (processBtn) {
        processBtn.disabled = true;
        processBtn.innerHTML = '<span class="loading-spinner"></span> Cargando datos...';
    }

    const loading = showQuickLoading('Cargando datos globales y distribución...');

    try {
        // AÑADIDO: initializeDistribution() al array de promesas
        // 1. Cargar datos base primero (incluyendo CLIENTES)
        await Promise.all([
            loadColoresData(),
            loadData2Data(),
            loadPreciosData(),
            loadSisproData(),
            loadHistoricasData(),
            loadClientesData()
        ]);

        // 2. Una vez cargados los clientes, inicializar distribución
        console.log('Datos base cargados, inicializando distribución...');
        await initializeDistribution();

        updateDataStats();
        updateStatus('Datos cargados correctamente', 'success');

        if (!loading._isReload) {
            // Actualizamos el mensaje para reflejar que todo cargó
            showMessage(`Sistema listo - Datos base y Módulo de Distribución cargados`, 'success', 2000);
        }

    } catch (error) {
        console.error('Error cargando datos:', error);
        updateStatus('Error cargando datos', 'error');
        showMessage('Error al cargar datos: ' + error.message, 'error', 3000);
    } finally {
        loading.close();
        if (processBtn) {
            processBtn.disabled = false;
            processBtn.innerHTML = '<i class="codicon codicon-play"></i> Procesar CSV';
        }
    }
}

async function loadColoresData() {
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/COLORES?key=${API_KEY}`;
    const response = await fetch(url);
    const data = await response.json();

    if (data.values && data.values.length > 0) {
        coloresMap.clear();
        for (let i = 1; i < data.values.length; i++) {
            const row = data.values[i];
            if (row.length >= 2) {
                const codigo = row[0] || '';
                const color = row[1] || '';
                if (codigo && color) {
                    coloresMap.set(codigo.trim(), color.trim());
                }
            }
        }
    }
}

async function loadData2Data() {
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/DATA2?key=${API_KEY}`;
    const response = await fetch(url);
    const data = await response.json();

    if (data.values && data.values.length > 0) {
        data2Map.clear();
        for (let i = 1; i < data.values.length; i++) {
            const row = data.values[i];
            if (row.length >= 1) {
                const op = row[0] || '';
                if (op) {
                    data2Map.set(op.trim(), true);
                }
            }
        }
    }
}

async function loadPreciosData() {
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/PRECIOS?key=${API_KEY}`;
    const response = await fetch(url);
    const data = await response.json();

    if (data.values && data.values.length > 0) {
        preciosMap.clear();
        for (let i = 1; i < data.values.length; i++) {
            const row = data.values[i];
            if (row.length >= 2) {
                const referencia = row[0] || '';
                const pvp = row[1] || '';
                if (referencia && pvp) {
                    preciosMap.set(referencia.trim(), pvp.trim());
                }
            }
        }
    }
}

async function loadSisproData() {
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/SISPROWEB?key=${API_KEY}`;
    const response = await fetch(url);
    const data = await response.json();

    if (data.values && data.values.length > 0) {
        sisproMap.clear();
        for (let i = 1; i < data.values.length; i++) {
            const row = data.values[i];
            if (row.length >= 4) {
                const op = row[0] || '';
                const prenda = row[1] || '';
                const linea = row[2] || '';
                const genero = row[3] || '';
                if (op) {
                    sisproMap.set(op.trim(), {
                        PRENDA: prenda.trim(),
                        LINEA: linea.trim(),
                        GENERO: genero.trim()
                    });
                }
            }
        }
    }
}

async function loadHistoricasData() {
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/HISTORICAS?key=${API_KEY}`;
    const response = await fetch(url);
    const data = await response.json();

    if (data.values && data.values.length > 0) {
        historicasMap.clear();
        for (let i = 1; i < data.values.length; i++) {
            const row = data.values[i];
            if (row.length >= 2) {
                const refprov = row[0] || '';
                const referencia = row[1] || '';
                if (refprov) {
                    historicasMap.set(refprov.trim(), referencia.trim());
                }
            }
        }
    }
}

async function loadClientesData() {
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/CLIENTES?key=${API_KEY}`;
    const response = await fetch(url);
    const data = await response.json();

    if (data.values && data.values.length > 0) {
        clientesMap.clear();
        console.log('📥 Cargando CLIENTES desde Google Sheets...');
        console.log('Total de filas (incluyendo encabezado):', data.values.length);

        // Skip header row (i = 1)
        for (let i = 1; i < data.values.length; i++) {
            const row = data.values[i];

            // Solo requerimos que exista el ID (columna 0)
            const id = row[0] || '';

            if (id && id.trim()) {
                const razonSocial = row[1] || '';
                const nombreCorto = row[2] || '';
                const tipoCliente = row[3] || '';
                const estado = row[4] || '';
                const direccion = row[5] || '';
                const telefono = row[6] || '';
                const email = row[7] || '';
                const tipoEmpresa = row[8] || '';

                clientesMap.set(id.trim(), {
                    ID: id.trim(),
                    RAZON_SOCIAL: razonSocial.trim(),
                    NOMBRE_CORTO: nombreCorto.trim(),
                    TIPO_CLIENTE: tipoCliente.trim(),
                    ESTADO: estado.trim(),
                    DIRECCION: direccion.trim(),
                    TELEFONO: telefono.trim(),
                    EMAIL: email.trim(),
                    TIPO_EMPRESA: tipoEmpresa.trim()
                });

                console.log(`  ✓ Cliente ${i}: ${nombreCorto.trim()} (${tipoCliente.trim()}) - Columnas: ${row.length}`);
            } else {
                console.log(`  ⊘ Fila ${i}: Sin ID, saltando...`);
            }
        }

        console.log(`✅ Total clientes cargados: ${clientesMap.size}`);
    }
}

// Utility Functions
function getSisproData(op) {
    if (!op) return { PRENDA: '', LINEA: '', GENERO: '' };
    return sisproMap.get(op.trim()) || { PRENDA: '', LINEA: '', GENERO: '' };
}

function getColorName(codigo) {
    if (!codigo) return '';
    return coloresMap.get(codigo.trim()) || codigo;
}

function getPvp(referencia) {
    if (!referencia) return '';
    return preciosMap.get(referencia.trim()) || '';
}

function getReferenciaHistorica(refprov) {
    if (!refprov) return refprov;
    return historicasMap.get(refprov.trim()) || refprov;
}

function getClienteData(id) {
    if (!id) return null;
    return clientesMap.get(id.trim()) || null;
}

function getMarca(genero) {
    if (!genero) return '';
    const generoUpper = genero.toUpperCase();
    if (generoUpper.includes('DAMA') || generoUpper.includes('NIÑA')) {
        return 'CHICA CHIC';
    } else if (generoUpper.includes('HOMBRE') || generoUpper.includes('NIÑO')) {
        return '80 GRADOS';
    }
    return '';
}

function getClaseByPVP(pvp) {
    const valor = parseFloat(pvp);
    if (isNaN(valor)) return "";
    if (valor <= 39900) return "LINEA";
    if (valor <= 59900) return "MODA";
    if (valor > 59900) return "PRONTAMODA";
}

function getDescripcion(prenda, genero, marca, refprov) {
    const partes = [];
    if (prenda) partes.push(prenda);
    if (genero) partes.push(genero);
    if (marca) partes.push(marca);
    if (refprov) partes.push(refprov);

    return partes.join(' ');
}

function normalizeTipo(tipoCode) {
    return tiposMap[tipoCode] || tipoCode;
}

function extractTrasladoNumber(traslado) {
    if (!traslado) return '';
    return traslado.replace(/\D/g, '').replace(/^0+/, '');
}

function extractOSNumber(os) {
    if (!os) return '';
    return os.replace(/\D/g, '').replace(/^0+/, '');
}

function validarEstado(op) {
    if (!op) return 'PENDIENTE';
    return data2Map.has(op.trim()) ? 'CONFIRMADA' : 'PENDIENTE';
}

function normalizeBodega(bodegaCode) {
    return bodegasMap[bodegaCode] || bodegaCode.toUpperCase();
}

function normalizeText(text) {
    if (!text) return '';
    return text
        .replace(/�/g, 'Ñ')
        .replace(/Ã‘/g, 'Ñ')
        .replace(/Ã±/g, 'ñ')
        .replace(/Ã/g, 'Ó')
        .replace(/Ã³/g, 'ó')
        .replace(/Ã/g, 'Í')
        .replace(/Ã­/g, 'í')
        .replace(/Ã©/g, 'é')
        .replace(/Ã¡/g, 'á')
        .replace(/Ãº/g, 'ú')
        .replace(/Ã/g, 'Ú');
}

// Función para limpiar texto de promoción
function limpiarTextoPromocion(texto) {
    if (!texto) return texto;

    // Eliminar la palabra "PROMOCION" y variantes
    return texto
        .replace(/PROMOCION/gi, '')
        .replace(/PROMO/gi, '')
        .replace(/\s+/g, ' ') // Eliminar espacios múltiples
        .trim();
}

function formatDate(dateString) {
    if (!dateString) return '';
    return dateString.split(' ')[0];
}

function formatCosto(costo) {
    return Math.floor(costo).toString();
}

// Bolsas Adjustment
function adjustBolsas(amount) {
    const bolsasInput = document.getElementById('bolsas');
    let currentValue = parseInt(bolsasInput.value) || 0;
    currentValue += amount;

    if (currentValue < 0) currentValue = 0;

    bolsasInput.value = currentValue;
}

// CSV Processing
async function processCSV() {
    const fileInput = document.getElementById('csvFile');
    const processBtn = document.getElementById('processBtn');

    if (!fileInput.files.length) {
        showMessage('Por favor selecciona un archivo CSV para procesar', 'error', 2000);
        return;
    }

    const loading = showQuickLoading('Procesando archivo CSV...');
    processBtn.disabled = true;
    processBtn.innerHTML = '<span class="loading-spinner"></span> Procesando...';
    updateStatus('Procesando archivo CSV...', 'loading');

    const file = fileInput.files[0];
    const reader = new FileReader();

    reader.onload = async function (e) {
        try {
            const csvContent = e.target.result;
            const rows = parseCSV(csvContent);

            if (rows.length === 0) {
                throw new Error('El archivo CSV está vacío o no tiene datos válidos');
            }

            await processCSVData(rows);

            // Verificar si es un reprocesamiento después de guardar
            const isReprocess = loading._isReprocess;
            if (isReprocess) {
                showMessage(`CSV reprocesado - ${processedData.length} registros actualizados`, 'success', 2000);
            } else {
                showMessage(`Procesamiento completado - ${processedData.length} registros procesados`, 'success', 2000);
            }

        } catch (error) {
            console.error('Error procesando CSV:', error);
            showMessage('Error al procesar archivo: ' + error.message, 'error', 3000);
        } finally {
            loading.close();
            processBtn.disabled = false;
            processBtn.innerHTML = '<i class="codicon codicon-play"></i> Procesar CSV';
        }
    };

    reader.onerror = function () {
        loading.close();
        showMessage('Error de lectura - No se pudo leer el archivo CSV', 'error', 3000);
        processBtn.disabled = false;
        processBtn.innerHTML = '<i class="codicon codicon-play"></i> Procesar CSV';
    };

    reader.readAsText(file, 'UTF-8');
}

function parseCSV(csvContent) {
    const rows = [];
    const lines = csvContent.split('\n');

    for (let line of lines) {
        line = line.trim();
        if (!line) continue;

        const columns = [];
        let current = '';
        let inQuotes = false;

        for (let i = 0; i < line.length; i++) {
            const char = line[i];

            if (char === '"') {
                inQuotes = !inQuotes;
            } else if (char === ';' && !inQuotes) {
                columns.push(current.trim());
                current = '';
            } else {
                current += char;
            }
        }

        columns.push(current.trim());
        rows.push(columns);
    }

    return rows;
}

// Reemplaza la función processCSVData actual con esta versión corregida
async function processCSVData(rows) {
    console.log(`Iniciando procesamiento de CSV. Traslados anulados cargados: ${cancelledTransfers.size}`);
    const prDataMap = new Map();

    // First pass: collect PR data
    rows.forEach(row => {
        if (row.length >= 38) {
            const usuario = row[1] || '';
            const bodega = row[14] || '';
            const tipo = row[3] || '';

            if (escanersMap[usuario] && bodega === 'PR' && tipo === 'TR') {
                const key = `${row[2]}|${row[11]}|${row[12]}`;
                prDataMap.set(key, {
                    COSTO: parseFloat(row[10]) || 0,
                    OS: extractOSNumber(row[13] || ''),
                    CC: row[37] || ''
                });
            }
        }
    });

    // Map temporal para agrupar registros duplicados
    const groupedDataMap = new Map();
    const opErrors = new Map();

    // Second pass: process TR data and group duplicates
    rows.forEach(row => {
        if (row.length >= 38) {
            const usuario = row[1] || '';
            const bodega = row[14] || '';
            const tipo = row[3] || '';

            // EXCLUIR TRASLADOS ANULADOS - Verificar tanto el valor original como el extraído
            const trasladoOriginal = row[7] || '';
            const trasladoExtraido = extractTrasladoNumber(trasladoOriginal);
            const estaAnulado = cancelledTransfers.has(trasladoOriginal) || cancelledTransfers.has(trasladoExtraido);

            if (estaAnulado) {
                console.log(`Traslado anulado detectado y excluido: ${trasladoOriginal} (Extraído: ${trasladoExtraido})`);
            }

            if (escanersMap[usuario] && bodega !== 'PR' && tipo === 'TR' && !estaAnulado) {
                const op = row[2] || '';
                const codColorOriginal = row[12] || '';
                const talla = row[11] || '';
                const referencia = row[0] || '';

                // Validar existencia de datos críticos
                const errors = [];

                if (!sisproMap.has(op.trim())) {
                    errors.push(`OP ${op} no encontrada en SISPROWEB`);
                }

                if (codColorOriginal && !coloresMap.has(codColorOriginal.trim())) {
                    errors.push(`Color ${codColorOriginal} no encontrado en COLORES`);
                }

                if (errors.length > 0) {
                    if (!opErrors.has(op)) {
                        opErrors.set(op, errors);
                    }
                    return;
                }

                // Crear clave única para agrupar: OP + Referencia + Talla + Color + Bodega
                const groupKey = `${op}|${referencia}|${talla}|${codColorOriginal}|${bodega}`;

                const key = `${row[2]}|${row[11]}|${row[12]}`;
                const prData = prDataMap.get(key);
                const sisproInfo = getSisproData(op);

                let costo = 0;
                if (bodega !== 'ZY' && prData) {
                    costo = prData.COSTO;
                }

                const cantidad = parseFloat(row[9]) || 0;

                if (groupedDataMap.has(groupKey)) {
                    // Si ya existe, sumar la cantidad
                    const existing = groupedDataMap.get(groupKey);
                    existing.CANTIDAD += cantidad;

                    // Sumar también el costo si corresponde
                    if (bodega !== 'ZY' && prData) {
                        existing.COSTO = formatCosto(parseFloat(existing.COSTO) + costo);
                    }
                } else {
                    // Si no existe, crear nuevo registro
                    const estado = validarEstado(op);
                    const pvp = getPvp(referencia);
                    const marca = getMarca(sisproInfo.GENERO);
                    const clase = getClaseByPVP(pvp);
                    const descripcion = getDescripcion(
                        sisproInfo.PRENDA || normalizeText(row[23] || ''),
                        sisproInfo.GENERO,
                        marca,
                        referencia
                    );

                    groupedDataMap.set(groupKey, {
                        REFERENCIA: referencia,
                        USUARIO: escanersMap[usuario] || usuario,
                        OP: op,
                        TIPO: normalizeTipo(tipo),
                        FECHA: formatDate(row[4]),
                        TRASLADO: extractTrasladoNumber(row[7] || ''),
                        CANTIDAD: cantidad,
                        COSTO: formatCosto(costo),
                        TOTAL: row[19] || '',
                        PVP: pvp,
                        TALLA: talla,
                        COLORES: getColorName(codColorOriginal),
                        COD_COLOR: codColorOriginal,
                        OS: prData ? prData.OS : extractOSNumber(row[13] || ''),
                        BODEGA: normalizeBodega(bodega),
                        TALLER: normalizeText(row[18] || ''),
                        DESCRIPCION_LARGA: normalizeText(row[21] || ''),
                        PRENDA: sisproInfo.PRENDA || normalizeText(row[23] || ''),
                        LINEA: sisproInfo.LINEA || '',
                        GENERO: sisproInfo.GENERO || '',
                        CC: prData ? prData.CC : (row[37] || ''),
                        ESTADO: estado,
                        MARCA: marca,
                        CLASE: clase,
                        DESCRIPCION: descripcion
                    });
                }
            }
        }
    });

    // Convertir el Map a array
    processedData = Array.from(groupedDataMap.values());

    // Mostrar notificaciones de errores
    if (opErrors.size > 0) {
        let errorMessage = `Se encontraron ${opErrors.size} OPs con errores:`;

        opErrors.forEach((errors, op) => {
            errorMessage += `\n• OP ${op}: ${errors.join(', ')}`;
        });

        showMessage(errorMessage, 'error', 5000);
        updateStatus(`${opErrors.size} OPs deshabilitadas por datos faltantes`, 'warning');
    }

    if (processedData.length === 0) {
        throw new Error('No se encontraron datos válidos para los usuarios especificados con tipo TR');
    }

    displayResultsSummary(processedData);
    document.getElementById('resultsPanel').style.display = 'block';
    document.getElementById('exportBtn').style.display = 'inline-block';

    const pendientes = processedData.filter(item => item.ESTADO === 'PENDIENTE');
    if (pendientes.length > 0) {
        setupPendientesSection(pendientes);
        document.getElementById('pendientesSection').style.display = 'block';
        updateStatus(`${pendientes.length} OPs pendientes listas para procesar`, 'success');

        // Switch to pending OPs tab
        document.querySelector('[data-tab="pending-ops"]').click();
    }
}

// Results Display
function displayResultsSummary(data) {
    const resultsContent = document.getElementById('resultsContent');

    const pendientes = data.filter(item => item.ESTADO === 'PENDIENTE');
    const unidadesPendientes = pendientes.reduce((sum, item) => sum + item.CANTIDAD, 0);
    const opsPendientes = [...new Set(pendientes.map(item => item.OP))];

    const confirmados = data.filter(item => item.ESTADO === 'CONFIRMADA');
    const unidadesConfirmadas = confirmados.reduce((sum, item) => sum + item.CANTIDAD, 0);
    const totalUnidades = data.reduce((sum, item) => sum + item.CANTIDAD, 0);

    resultsContent.innerHTML = `
        <div class="results-grid">
            <div class="result-card">
                <div class="result-icon success">
                    <i class="codicon codicon-symbol-numeric"></i>
                </div>
                <div class="result-info">
                    <div class="result-value">${data.length}</div>
                    <div class="result-label">Total Registros</div>
                </div>
            </div>
            <div class="result-card">
                <div class="result-icon info">
                    <i class="codicon codicon-check"></i>
                </div>
                <div class="result-info">
                    <div class="result-value">${confirmados.length}</div>
                    <div class="result-label">Confirmados</div>
                </div>
            </div>
            <div class="result-card">
                <div class="result-icon warning">
                    <i class="codicon codicon-warning"></i>
                </div>
                <div class="result-info">
                    <div class="result-value">${pendientes.length}</div>
                    <div class="result-label">Pendientes</div>
                </div>
            </div>
            <div class="result-card">
                <div class="result-icon error">
                    <i class="codicon codicon-symbol-array"></i>
                </div>
                <div class="result-info">
                    <div class="result-value">${unidadesPendientes}</div>
                    <div class="result-label">Unidades Pend.</div>
                </div>
            </div>
        </div>
        <div class="results-details">
            <div class="detail-item">
                <i class="codicon codicon-symbol-enum"></i>
                <span><strong>${opsPendientes.length} OPs únicas pendientes</strong> de procesar</span>
            </div>
            <div class="detail-item">
                <i class="codicon codicon-symbol-numeric"></i>
                <span><strong>${totalUnidades}</strong> unidades totales procesadas</span>
            </div>
        </div>
    `;
}


// Pending OPs Management - Solo ✓ y ✗ con diferencia con signo
function setupPendientesSection(pendientes) {
    const selectOP = document.getElementById('selectOP');
    selectOP.innerHTML = '<option value="">Seleccione una OP...</option>';

    const opGroups = {};
    pendientes.forEach(item => {
        if (!opGroups[item.OP]) {
            opGroups[item.OP] = {
                referencia: item.REFERENCIA,
                prenda: item.PRENDA,
                usuario: item.USUARIO,
                fecha: item.FECHA,
                cantidad: 0,
                total: parseInt(item.TOTAL) || 0,
                items: []
            };
        }
        opGroups[item.OP].cantidad += item.CANTIDAD;
        opGroups[item.OP].items.push(item);
    });

    Object.keys(opGroups).forEach(op => {
        const grupo = opGroups[op];

        // Calcular la diferencia
        const diferencia = grupo.total - grupo.cantidad;

        const option = document.createElement('option');
        option.value = op;

        // Verificar si la OP tiene todos los datos necesarios
        const primerItem = grupo.items[0];
        const tieneSispro = sisproMap.has(op.trim());
        const tieneColor = !primerItem.COD_COLOR || coloresMap.has(primerItem.COD_COLOR.trim());

        // Determinar el icono - Solo ✓ para completas, sin icono para las demás
        let estadoIcono = '';

        if (diferencia === 0) {
            estadoIcono = '✓ '; // Solo las completas llevan ✓
        }
        // Las demás no llevan icono

        if (!tieneSispro || !tieneColor) {
            option.disabled = true;
            option.textContent = `✗ OP: ${op} - DESHABILITADA - Datos incompletos`;
            option.style.color = '#f44747'; // Rojo para deshabilitadas
            option.style.fontStyle = 'italic';
        } else {
            // Mostrar diferencia con signo (+ para exceso, - para faltante)
            const diferenciaTexto = diferencia !== 0 ? ` ${diferencia > 0 ? '-' : '+'}${Math.abs(diferencia)}` : '';

            option.textContent = `${estadoIcono}OP: ${op} | FECHA: ${grupo.fecha} | REFPROV: ${grupo.referencia} | ${grupo.prenda} | USUARIO: ${grupo.usuario} | PROGRESO: ${grupo.cantidad}/${grupo.total}${diferenciaTexto}`;

            // Color normal del tema
            option.style.color = '';
            option.style.fontWeight = 'normal';
        }

        option.dataset.items = JSON.stringify(grupo.items);
        selectOP.appendChild(option);
    });
}

function loadOPData() {
    const selectOP = document.getElementById('selectOP');
    const opForm = document.getElementById('opForm');
    const opPreview = document.getElementById('opPreview');
    const selectedOption = selectOP.options[selectOP.selectedIndex];

    if (!selectedOption.value) {
        opForm.style.display = 'none';
        opPreview.innerHTML = '<div class="preview-placeholder"><i class="codicon codicon-info"></i> Selecciona una OP para ver los detalles</div>';
        return;
    }

    const items = JSON.parse(selectedOption.dataset.items);
    currentOPData = items;

    const primerItem = items[0];
    const totalCantidad = items.reduce((sum, item) => sum + item.CANTIDAD, 0);

    // Update preview
    opPreview.innerHTML = `
        <div class="op-details">
            <div class="detail-row">
                <span class="detail-label">OP:</span>
                <span class="detail-value">${primerItem.OP}</span>
            </div>
            <div class="detail-row">
                <span class="detail-label">Referencia:</span>
                <span class="detail-value">${primerItem.REFERENCIA}</span>
            </div>
            <div class="detail-row">
                <span class="detail-label">Prenda:</span>
                <span class="detail-value">${primerItem.PRENDA}</span>
            </div>
            <div class="detail-row">
                <span class="detail-label">Usuario:</span>
                <span class="detail-value">${primerItem.USUARIO}</span>
            </div>
            <div class="detail-row">
                <span class="detail-label">Cantidad Total:</span>
                <span class="detail-value">${totalCantidad}</span>
            </div>
            <div class="detail-row">
                <span class="detail-label">Fecha:</span>
                <span class="detail-value">${primerItem.FECHA}</span>
            </div>
        </div>
    `;

    // Fill form with OP data
    document.getElementById('pvpEdit').value = primerItem.PVP || '';

    opForm.style.display = 'block';
    updateStatus(`Datos cargados para OP: ${primerItem.OP}`, 'success');
}

// PVP Adjustment
function adjustPVP(amount) {
    const pvpInput = document.getElementById('pvpEdit');
    let currentValue = parseInt(pvpInput.value.replace(/\./g, '')) || 0;
    currentValue += amount;

    if (currentValue < 0) currentValue = 0;

    // Format with thousand separators
    pvpInput.value = currentValue.toLocaleString('es-CO');
}

// JSON Generation
function generateJSONForOP() {
    if (!currentOPData || currentOPData.length === 0) {
        showMessage('No hay datos de OP cargados', 'error', 2000);
        return;
    }

    const proveedor = document.getElementById('proveedor').value;
    const auditor = document.getElementById('auditor').value;
    const gestor = document.getElementById('gestor').value;
    const bolsas = parseInt(document.getElementById('bolsas').value) || 0;
    const pvpEdit = document.getElementById('pvpEdit').value;

    if (!proveedor || !auditor || !gestor || !pvpEdit) {
        showMessage('Por favor complete todos los campos requeridos', 'error', 2000);
        return;
    }

    const primerItem = currentOPData[0];
    const items = currentOPData;

    // CANTIDAD = TOTAL del CSV (índice 19)
    const cantidad = parseInt(primerItem.TOTAL) || 0;

    // Calculate quantities by warehouse type
    let cantidadFull = 0;
    let cantidadPromo = 0;
    let cantidadCobros = 0;
    let cantidadSinConfeccionar = 0;
    let costoTotal = 0;
    const hr = [];
    const anexos = [];

    items.forEach(item => {
        const costoUnitario = parseInt(item.COSTO) || 0;
        const costoTOTAL = costoUnitario * item.CANTIDAD;
        costoTotal += costoTOTAL;

        // Classify by warehouse and accumulate quantities
        if (item.BODEGA === 'PRIMERAS') {
            cantidadFull += item.CANTIDAD;
            // Only PRIMERAS go to HR
            hr.push([
                item.COD_COLOR,
                item.COLORES,
                item.TALLA,
                item.CANTIDAD
            ]);
        }
        else if (item.BODEGA === 'PROMOCIONES') {
            cantidadPromo += item.CANTIDAD;
            anexos.push({
                DOCUMENTO: item.REFERENCIA,
                TALLA: item.TALLA,
                COLOR: item.COLORES,
                TIPO: 'PROMO',
                CANTIDAD: item.CANTIDAD,
                COSTO_UNITARIO: costoUnitario,
                COSTO_TOTAL: costoTOTAL,
                BODEGA: item.BODEGA,
                TRASLADO: item.TRASLADO
            });
        }
        else if (item.BODEGA === 'COBROS') {
            cantidadCobros += item.CANTIDAD;
            anexos.push({
                DOCUMENTO: item.REFERENCIA,
                TALLA: item.TALLA,
                COLOR: item.COLORES,
                TIPO: 'COBRO',
                CANTIDAD: item.CANTIDAD,
                COSTO_UNITARIO: costoUnitario,
                COSTO_TOTAL: costoTOTAL,
                BODEGA: item.BODEGA,
                TRASLADO: item.TRASLADO
            });
        }
        else if (item.BODEGA === 'SIN CONFECCIONAR') {
            cantidadSinConfeccionar += item.CANTIDAD;
            anexos.push({
                DOCUMENTO: item.REFERENCIA,
                TALLA: item.TALLA,
                COLOR: item.COLORES,
                TIPO: 'SIN_CONFECCIONAR',
                CANTIDAD: item.CANTIDAD,
                COSTO_UNITARIO: costoUnitario,
                COSTO_TOTAL: costoTOTAL,
                BODEGA: item.BODEGA,
                TRASLADO: item.TRASLADO
            });
        }
    });

    // Apply correct logic
    const totalRelativo = cantidadFull + cantidadPromo + cantidadCobros;
    const totalGeneral = cantidadFull + cantidadPromo + cantidadCobros + cantidadSinConfeccionar;
    const diferencia = cantidad - totalGeneral;

    const costoUnitario = cantidad > 0 ? Math.round(costoTotal / cantidad) : 0;

    // Calculate sum for DETALLE_CANTIDADES
    const sumatoria = cantidadFull + cantidadPromo + cantidadCobros + cantidadSinConfeccionar;

    // Get historical reference
    const referenciaHistorica = getReferenciaHistorica(primerItem.REFERENCIA);

    // Get brand, class and description
    const marca = getMarca(primerItem.GENERO);
    const clase = getClaseByPVP(pvpEdit);
    const descripcion = getDescripcion(
        primerItem.PRENDA,
        primerItem.GENERO,
        marca,
        referenciaHistorica
    );

    // Convertir valores numéricos
    const auditoriaNum = parseInt(primerItem.CC) || 0;
    const osNum = parseInt(primerItem.OS) || 0;
    const trasladoNum = parseInt(primerItem.TRASLADO) || 0;
    /*const pvpNum = parseInt(pvpEdit.replace(/\./g, '')) || 0;*/
    const pvpString = pvpEdit; // ← MANTENER COMO STRING "26.900"
    const loteNum = parseInt(primerItem.OP) || 0;

    const jsonData = {
        "A": primerItem.OP,
        "FECHA": primerItem.FECHA,
        "TALLER": primerItem.TALLER,
        "LINEA": primerItem.LINEA,
        "AUDITOR": auditor,
        "GESTOR": gestor,
        "ESCANER": primerItem.USUARIO,
        "LOTE": loteNum,
        "REFPROV": primerItem.REFERENCIA,
        "DESCRIPCIÓN": descripcion,
        "DESCRIPCIÓN_LARGA": primerItem.DESCRIPCION_LARGA,
        "CANTIDAD": cantidad,
        "TOTAL_RELATIVO": totalRelativo,
        "COSTO_UNITARIO": costoUnitario,
        "COSTO_TOTAL": costoTotal,
        "TOTAL_GENERAL": totalGeneral,
        "DIFERENCIA": diferencia,
        "AUDITORIA": auditoriaNum,
        /*"ORDEN_SERVICIO": `S0${osNum}`,
        "TRASLADO": `T000${trasladoNum}`,*/
        "ORDEN_SERVICIO": osNum,
        "TRASLADO": trasladoNum,
        "REFERENCIA": referenciaHistorica,
        "TIPO": "FULL",
        "PVP": pvpString,
        "CLASE": clase,
        "PRENDA": primerItem.PRENDA,
        "GENERO": primerItem.GENERO,
        "MARCA": marca,
        "PROVEEDOR": proveedor,
        "BOLSAS": bolsas,
        "ANEXOS": anexos,
        "HR": hr,
        "DETALLE_CANTIDADES": {
            "TOTAL": sumatoria,
            "FULL": cantidadFull,
            "PROMO": cantidadPromo,
            "COBRO": cantidadCobros,
            "SIN_CONFECCIONAR": cantidadSinConfeccionar
        }
    };

    const jsonContent = document.getElementById('jsonContent');
    const saveBtn = document.getElementById('saveBtn');
    const saveBtnToolbar = document.getElementById('saveBtnToolbar');

    jsonContent.textContent = JSON.stringify(jsonData, null, 2);
    saveBtn.style.display = 'inline-flex';
    saveBtnToolbar.style.display = 'flex';

    // Switch to JSON editor tab
    document.querySelector('[data-tab="json-editor"]').click();

    showMessage(`JSON generado exitosamente para OP: ${primerItem.OP}`, 'success', 2000);
}



// Save to Google Sheets
async function saveToSheets() {
    const saveBtn = document.getElementById('saveBtn');
    const saveBtnToolbar = document.getElementById('saveBtnToolbar');
    const jsonContent = document.getElementById('jsonContent');
    const fileInput = document.getElementById('csvFile');

    if (!currentOPData || currentOPData.length === 0) {
        showMessage('No hay datos de OP cargados', 'error', 2000);
        return;
    }

    // Obtener los datos JSON para verificar la diferencia
    let jsonData;
    try {
        jsonData = JSON.parse(jsonContent.textContent);
    } catch (e) {
        showMessage('Error al leer los datos JSON', 'error', 2000);
        return;
    }

    // Verificar si hay diferencia (unidades faltantes)
    const diferencia = jsonData.DIFERENCIA || 0;

    // Preparar datos para la tabla
    const tableData = [
        { label: 'Primeras (DI)', value: jsonData.DETALLE_CANTIDADES?.FULL || 0 },
        { label: 'Promociones (ZZ)', value: jsonData.DETALLE_CANTIDADES?.PROMO || 0 },
        { label: 'Cobros (BP)', value: jsonData.DETALLE_CANTIDADES?.COBRO || 0 },
        { label: 'Sin Confeccionar (ZY)', value: jsonData.DETALLE_CANTIDADES?.SIN_CONFECCIONAR || 0 }
    ];

    if (diferencia > 0) {
        // Si hay diferencia, mostrar alerta de advertencia
        const confirmed = await showQuickConfirm(
            'Unidades Faltantes',
            `Hay <strong>${diferencia} unidades faltantes</strong> en esta orden de producción.<br><br>Detalle de unidades procesadas:`,
            'Sí, Guardar',
            'Cancelar',
            'warning',
            tableData
        );

        if (!confirmed) return;
    } else {
        // Si NO hay diferencia, mostrar alerta de éxito pero igual preguntar
        const confirmed = await showQuickConfirm(
            'Confirmar Guardado',
            `La orden de producción está <strong>completa</strong> (sin unidades faltantes).<br><br>Detalle de unidades:`,
            'Sí, Guardar',
            'Cancelar',
            'success',
            tableData
        );

        if (!confirmed) return;
    }

    const loading = showQuickLoading('Guardando en Google Sheets...');
    saveBtn.disabled = true;
    saveBtn.innerHTML = '<span class="loading-spinner"></span> Guardando...';
    saveBtnToolbar.disabled = true;
    saveBtnToolbar.innerHTML = '<span class="loading-spinner"></span>';
    saveBtnToolbar.title = "Guardando...";

    try {
        // Prepare data to send
        const formData = new URLSearchParams();
        formData.append('action', 'guardarOP');
        formData.append('datos', JSON.stringify(jsonData));

        // Use XMLHttpRequest to avoid CORS issues
        const xhr = new XMLHttpRequest();

        xhr.open('POST', GAS_URL, true);
        xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');

        xhr.onload = async function () {
            loading.close();

            if (xhr.status === 200) {
                try {
                    const response = JSON.parse(xhr.responseText);
                    if (response.success) {
                        // Mensaje diferente según si hubo diferencia o no
                        if (diferencia > 0) {
                            showMessage(`OP ${jsonData.A} guardada con ${diferencia} unidades faltantes`, 'warning', 3000);
                        } else {
                            showMessage(`OP ${jsonData.A} guardada correctamente (completa)`, 'success', 2000);
                        }

                        // Recargar datos desde Google Sheets
                        const reloadLoading = showQuickLoading('Recargando datos desde Google Sheets...');
                        try {
                            await loadDataFromSheets();

                            // Si hay archivo CSV cargado, reprocesar automáticamente
                            if (fileInput.files.length > 0) {
                                updateStatus('Reprocesando CSV con datos actualizados...', 'loading');
                                setTimeout(() => {
                                    processCSV();
                                }, 1000);
                            }

                            reloadLoading.close();

                        } catch (reloadError) {
                            reloadLoading.close();
                            console.error('Error recargando datos:', reloadError);
                            showMessage('OP guardada pero error al recargar datos', 'warning', 3000);
                        }

                        // Limpiar formulario y resetear para nueva OP
                        document.getElementById('opForm').style.display = 'none';
                        document.getElementById('selectOP').value = '';
                        document.getElementById('auditor').value = '';
                        document.getElementById('gestor').value = '';
                        document.getElementById('bolsas').value = '0';
                        document.getElementById('pvpEdit').value = '';

                        saveBtn.style.display = 'none';

                        // Limpiar JSON editor
                        document.getElementById('jsonContent').textContent = '{\n  "mensaje": "Genera un JSON desde la pestaña de OPs Pendientes"\n}';

                        if (diferencia > 0) {
                            updateStatus(`OP ${jsonData.A} guardada con ${diferencia} unidades faltantes. Datos recargados.`, 'warning');
                        } else {
                            updateStatus(`OP ${jsonData.A} guardada exitosamente. Datos recargados y CSV reprocesado.`, 'success');
                        }

                    } else {
                        showMessage('Error al guardar: ' + response.message, 'error', 3000);
                    }
                } catch (e) {
                    showMessage('Error al procesar respuesta del servidor', 'error', 3000);
                }
            } else {
                showMessage(`Error HTTP ${xhr.status} al conectar con el servidor`, 'error', 3000);
            }
            saveBtn.disabled = false;
            saveBtn.innerHTML = '<i class="codicon codicon-save"></i> Guardar en Sheets';
            saveBtnToolbar.disabled = false;
            saveBtnToolbar.innerHTML = '<i class="codicon codicon-cloud-upload"></i>';
            saveBtnToolbar.title = "Guardar en Google Sheets";
        };

        xhr.onerror = function () {
            loading.close();
            showMessage('Error de conexión con Google Apps Script', 'error', 3000);
            saveBtn.disabled = false;
            saveBtn.innerHTML = '<i class="codicon codicon-save"></i> Guardar en Sheets';
            saveBtnToolbar.disabled = false;
            saveBtnToolbar.innerHTML = '<i class="codicon codicon-cloud-upload"></i>';
            saveBtnToolbar.title = "Guardar en Google Sheets";
        };

        xhr.send(formData);

    } catch (error) {
        loading.close();
        console.error('Error:', error);
        showMessage('Error: ' + error.message, 'error', 3000);
        saveBtn.disabled = false;
        saveBtn.innerHTML = '<i class="codicon codicon-save"></i> Guardar en Sheets';
        saveBtnToolbar.disabled = false;
        saveBtnToolbar.innerHTML = '<i class="codicon codicon-cloud-upload"></i>';
        saveBtnToolbar.title = "Guardar en Google Sheets";
    }
}

// Export to CSV
function exportToCSV() {
    if (processedData.length === 0) {
        showMessage('No hay datos para exportar', 'error', 2000);
        return;
    }

    const loading = showQuickLoading('Generando archivo CSV...');

    try {
        const headers = [
            'REFERENCIA', 'USUARIO', 'OP', 'TIPO', 'FECHA', 'TRASLADO',
            'CANTIDAD', 'COSTO', 'TOTAL', 'PVP', 'TALLA', 'COLORES', 'COD_COLOR', 'OS', 'BODEGA',
            'TALLER', 'DESCRIPCION_LARGA', 'PRENDA', 'LINEA', 'GENERO', 'CC', 'ESTADO', 'MARCA', 'CLASE', 'DESCRIPCION'
        ];

        let csvContent = '\uFEFF' + headers.join(';') + '\n';

        processedData.forEach(item => {
            const row = headers.map(header => {
                let value = item[header];
                if (typeof value === 'string' && (value.includes(';') || value.includes('"') || value.includes('\n') || value.includes('\r'))) {
                    value = '"' + value.replace(/"/g, '""') + '"';
                }
                return value;
            }).join(';');
            csvContent += row + '\n';
        });

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        const timestamp = new Date().toISOString().split('T')[0];

        link.setAttribute('href', url);
        link.setAttribute('download', `datos_procesados_${timestamp}.csv`);
        link.style.visibility = 'hidden';

        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        loading.close();
        showMessage('Archivo CSV exportado correctamente', 'success', 2000);

    } catch (error) {
        loading.close();
        showMessage('Error al exportar CSV: ' + error.message, 'error', 3000);
    }
}

// ============================================
// PERSISTENCIA DE TRASLADOS ANULADOS
// ============================================

// Clave para localStorage
const CANCELLED_TRANSFERS_KEY = 'omega_cancelled_transfers';

// Guardar traslados anulados en localStorage
function saveCancelledTransfers() {
    const data = {
        transfers: Array.from(cancelledTransfers),
        lastUpdated: new Date().toISOString()
    };
    localStorage.setItem(CANCELLED_TRANSFERS_KEY, JSON.stringify(data));
    console.log('Traslados anulados guardados en localStorage:', data.transfers.length);
}

// Cargar traslados anulados desde localStorage
function loadCancelledTransfersFromStorage() {
    try {
        const stored = localStorage.getItem(CANCELLED_TRANSFERS_KEY);
        if (stored) {
            const data = JSON.parse(stored);
            cancelledTransfers = new Set(data.transfers || []);
            console.log('Traslados anulados cargados desde localStorage:', cancelledTransfers.size);
            return true;
        }
    } catch (error) {
        console.error('Error cargando traslados anulados desde localStorage:', error);
    }
    return false;
}

// Limpiar localStorage de traslados anulados
function clearCancelledTransfersStorage() {
    localStorage.removeItem(CANCELLED_TRANSFERS_KEY);
    console.log('Almacenamiento de traslados anulados limpiado');
}

// Exportar traslados anulados a archivo JSON
function exportCancelledTransfers() {
    if (cancelledTransfers.size === 0) {
        showMessage('No hay traslados anulados para exportar', 'warning', 2000);
        return;
    }

    try {
        const data = {
            transfers: Array.from(cancelledTransfers),
            exportDate: new Date().toISOString(),
            version: '1.0',
            totalCount: cancelledTransfers.size
        };

        const jsonString = JSON.stringify(data, null, 2);
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);

        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
        const filename = `traslados_anulados_${timestamp}.json`;

        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        link.style.display = 'none';

        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        URL.revokeObjectURL(url);

        showMessage(`Exportados ${cancelledTransfers.size} traslados anulados a ${filename}`, 'success', 3000);
        console.log('Traslados anulados exportados:', filename);

    } catch (error) {
        console.error('Error exportando traslados anulados:', error);
        showMessage('Error al exportar traslados anulados: ' + error.message, 'error', 3000);
    }
}

// Importar traslados anulados desde archivo JSON
function importCancelledTransfers() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.style.display = 'none';

    input.onchange = async (event) => {
        const file = event.target.files[0];
        if (!file) return;

        try {
            const text = await file.text();
            const data = JSON.parse(text);

            // Validar estructura del archivo
            if (!data.transfers || !Array.isArray(data.transfers)) {
                throw new Error('Formato de archivo inválido. Debe contener un array "transfers".');
            }

            // Preguntar al usuario si desea reemplazar o combinar
            const currentCount = cancelledTransfers.size;
            const importCount = data.transfers.length;

            let action = 'replace';
            if (currentCount > 0) {
                const message = `Tienes ${currentCount} traslados anulados actualmente.\n\n` +
                    `El archivo contiene ${importCount} traslados.\n\n` +
                    `¿Qué deseas hacer?\n\n` +
                    `OK = Combinar (mantener actuales + agregar nuevos)\n` +
                    `Cancelar = Reemplazar (eliminar actuales y usar solo del archivo)`;

                action = confirm(message) ? 'merge' : 'replace';
            }

            // Aplicar la acción
            if (action === 'replace') {
                cancelledTransfers.clear();
            }

            // Agregar los traslados del archivo
            let addedCount = 0;
            data.transfers.forEach(traslado => {
                if (!cancelledTransfers.has(traslado)) {
                    cancelledTransfers.add(traslado);
                    addedCount++;
                }
            });

            // Guardar en localStorage
            saveCancelledTransfers();

            // Actualizar UI
            updateCancelledTransfersTable();
            loadTransferList();

            if (cancelledTransfers.size > 0) {
                document.getElementById('restoreAllBtn').style.display = 'inline-flex';
                document.getElementById('cancelledTransfers').style.display = 'block';
            }

            const actionText = action === 'merge' ? 'combinados' : 'importados';
            showMessage(`${addedCount} traslados ${actionText} exitosamente. Total: ${cancelledTransfers.size}`, 'success', 3000);
            console.log('Traslados importados:', addedCount, 'Total:', cancelledTransfers.size);

        } catch (error) {
            console.error('Error importando traslados anulados:', error);
            showMessage('Error al importar archivo: ' + error.message, 'error', 3000);
        }
    };

    document.body.appendChild(input);
    input.click();
    document.body.removeChild(input);
}

// ============================================
// GESTIÓN DE LISTA DE TRASLADOS
// ============================================

function loadTransferList() {
    console.log('=== loadTransferList called ===');

    const transferList = document.getElementById('transferList');
    if (!transferList) {
        console.error('Elemento transferList no encontrado');
        return;
    }

    // Limpiar contenido anterior
    transferList.innerHTML = '';

    // Verificar si hay datos procesados
    if (!processedData || processedData.length === 0) {
        transferList.innerHTML = `
            <div class="empty-state">
                <i class="codicon codicon-info"></i>
                <p>No hay datos procesados. Procesa un CSV primero.</p>
            </div>
        `;
        return;
    }

    console.log('Procesando', processedData.length, 'items de datos');

    // Agrupar traslados únicos
    const transferMap = new Map();

    processedData.forEach(item => {
        if (!item.TRASLADO) return;

        const trasladoNum = extractTrasladoNumber(item.TRASLADO);
        if (!trasladoNum) return;

        // Saltar traslados anulados
        if (cancelledTransfers.has(trasladoNum)) return;

        if (!transferMap.has(trasladoNum)) {
            transferMap.set(trasladoNum, {
                numero: item.TRASLADO, // Mostrar el número original
                clave: trasladoNum,    // Usar para comparación
                op: item.OP || 'N/A',
                referencia: item.REFERENCIA || 'N/A',
                usuario: item.USUARIO || 'N/A',
                fecha: item.FECHA || 'N/A',
                cantidad: 0
            });
        }

        transferMap.get(trasladoNum).cantidad += item.CANTIDAD || 0;
    });

    const transfers = Array.from(transferMap.values());
    console.log('Traslados únicos encontrados:', transfers.length);

    if (transfers.length === 0) {
        transferList.innerHTML = `
            <div class="empty-state">
                <i class="codicon codicon-info"></i>
                <p>No se encontraron traslados para anular</p>
            </div>
        `;
        return;
    }

    // Mostrar los traslados
    transfers.forEach(transfer => {
        const div = document.createElement('div');
        div.className = 'transfer-item';
        div.innerHTML = `
            <label class="checkbox-container">
                <input type="checkbox" value="${transfer.clave}" class="transfer-checkbox">
                <span class="checkmark"></span>
                <div class="transfer-info">
                    <strong>Traslado: ${transfer.numero}</strong>
                    <div class="transfer-details">
                        OP: ${transfer.op} | Ref: ${transfer.referencia}<br>
                        Usuario: ${transfer.usuario} | Fecha: ${transfer.fecha}<br>
                        Cantidad: ${transfer.cantidad} unidades
                    </div>
                </div>
            </label>
        `;
        transferList.appendChild(div);
    });

    console.log('Lista de traslados cargada correctamente');
}

function cancelSelectedTransfers() {
    const checkboxes = document.querySelectorAll('.transfer-checkbox:checked');
    if (checkboxes.length === 0) {
        showMessage('Selecciona al menos un traslado para anular', 'warning', 2000);
        return;
    }

    const transfersToCancel = Array.from(checkboxes).map(cb => cb.value);

    transfersToCancel.forEach(traslado => {
        cancelledTransfers.add(traslado);
    });

    // Guardar en localStorage
    saveCancelledTransfers();

    showMessage(`${transfersToCancel.length} traslados anulados. Haz clic en "Aplicar Cambios al CSV" para actualizar los resultados.`, 'success', 4000);

    // Actualizar la interfaz
    updateCancelledTransfersTable();
    document.getElementById('restoreAllBtn').style.display = 'inline-flex';
    document.getElementById('cancelledTransfers').style.display = 'block';

    // SOLO recargar la lista (NO reprocesar automáticamente)
    loadTransferList();
}

function updateCancelledTransfersTable() {
    const table = document.getElementById('cancelledTransferTable');

    if (cancelledTransfers.size === 0) {
        table.innerHTML = '<div class="empty-state"><i class="codicon codicon-info"></i> No hay traslados anulados</div>';
        return;
    }

    let tableHTML = `
        <table style="width: 100%; border-collapse: collapse; margin-top: 10px;">
            <thead>
                <tr style="background-color: var(--sidebar);">
                    <th style="padding: 8px; text-align: left; border-bottom: 1px solid var(--border);">Traslado</th>
                    <th style="padding: 8px; text-align: left; border-bottom: 1px solid var(--border);">Estado</th>
                    <th style="padding: 8px; text-align: left; border-bottom: 1px solid var(--border);">Acciones</th>
                </tr>
            </thead>
            <tbody>
    `;

    cancelledTransfers.forEach(traslado => {
        tableHTML += `
            <tr>
                <td style="padding: 8px; border-bottom: 1px solid var(--border);">${traslado}</td>
                <td style="padding: 8px; border-bottom: 1px solid var(--border); color: var(--error);">Anulado</td>
                <td style="padding: 8px; border-bottom: 1px solid var(--border);">
                    <button class="btn-icon" onclick="restoreTransfer('${traslado}')" title="Restaurar traslado">
                        <i class="codicon codicon-undo"></i>
                    </button>
                </td>
            </tr>
        `;
    });

    tableHTML += '</tbody></table>';
    table.innerHTML = tableHTML;
}

function restoreTransfer(traslado) {
    cancelledTransfers.delete(traslado);

    // Actualizar localStorage
    saveCancelledTransfers();

    showMessage(`Traslado ${traslado} restaurado`, 'success', 2000);
    updateCancelledTransfersTable();
    loadTransferList();

    if (cancelledTransfers.size === 0) {
        document.getElementById('restoreAllBtn').style.display = 'none';
        document.getElementById('cancelledTransfers').style.display = 'none';
    }
}

function restoreAllCancelledTransfers() {
    if (cancelledTransfers.size === 0) {
        showMessage('No hay traslados anulados para restaurar', 'info', 2000);
        return;
    }

    if (!confirm('¿Estás seguro de que deseas restaurar TODOS los traslados anulados?')) {
        return;
    }

    cancelledTransfers.clear();

    // Limpiar localStorage
    clearCancelledTransfersStorage();

    showMessage('Todos los traslados anulados han sido restaurados', 'success', 2000);

    // Actualizar la interfaz
    updateCancelledTransfersTable();
    document.getElementById('restoreAllBtn').style.display = 'none';

    // Recargar la lista
    loadTransferList();
}

function applyCancellationsToCSV() {
    const fileInput = document.getElementById('csvFile');
    if (fileInput.files.length > 0) {
        updateStatus('Aplicando anulaciones al CSV...', 'loading');
        processCSV();
    } else {
        showMessage('No hay un archivo CSV cargado para procesar', 'warning', 3000);
    }
}

// Inject additional CSS
const additionalCSS = `
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

.op-details {
    display: flex;
    flex-direction: column;
    gap: 8px;
}

.detail-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 4px 0;
}

.detail-label {
    font-weight: 500;
    color: var(--text-secondary);
}

.detail-value {
    font-weight: 600;
    color: var(--text);
}

/* Notificaciones rápidas */
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

.notification.success {
    border-left-color: var(--success);
}

.notification.error {
    border-left-color: var(--error);
}

.notification.warning {
    border-left-color: var(--warning);
}

.notification.info {
    border-left-color: var(--info);
}

.notification.fade-out {
    animation: slideOutRight 0.2s ease-in forwards;
}

.notification-icon {
    flex-shrink: 0;
    margin-top: 2px;
}

.notification.success .notification-icon {
    color: var(--success);
}

.notification.error .notification-icon {
    color: var(--error);
}

.notification.warning .notification-icon {
    color: var(--warning);
}

.notification.info .notification-icon {
    color: var(--info);
}

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
    from {
        transform: translateX(100%);
        opacity: 0;
    }
    to {
        transform: translateX(0);
        opacity: 1;
    }
}

@keyframes slideOutRight {
    from {
        transform: translateX(0);
        opacity: 1;
    }
    to {
        transform: translateX(100%);
        opacity: 0;
    }
}

/* Ajustes de iconos */
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

.json-editor-container .codicon {
    margin-right: 0 !important;
}

.tab .codicon {
    margin-right: 6px;
    opacity: 0.9;
}

.sidebar-header .codicon {
    margin-right: 0 !important;
}

.tree-item .codicon {
    margin-right: 6px;
    opacity: 0.8;
}
`;

const style = document.createElement('style');
style.textContent = additionalCSS;
document.head.appendChild(style);

// Función para filtrar traslados según la búsqueda
function filterTransfers() {
    const searchTerm = document.getElementById('transferSearch').value.toLowerCase().trim();
    const transferItems = document.querySelectorAll('.transfer-item');

    console.log('Filtrando traslados con término:', searchTerm);

    if (!searchTerm) {
        // Si no hay término de búsqueda, mostrar todos
        transferItems.forEach(item => {
            item.classList.remove('hidden');
            item.classList.remove('highlight');
        });
        return;
    }

    let foundCount = 0;
    transferItems.forEach(item => {
        const trasladoText = item.textContent.toLowerCase();

        if (trasladoText.includes(searchTerm)) {
            item.classList.remove('hidden');
            item.classList.add('highlight');
            foundCount++;
        } else {
            item.classList.add('hidden');
            item.classList.remove('highlight');
        }
    });

    console.log('Traslados encontrados:', foundCount);
}

// Función para limpiar la búsqueda
function clearSearch() {
    document.getElementById('transferSearch').value = '';
    filterTransfers();
    document.getElementById('transferSearch').focus();
}

// ============================================
// MÓDULO DE DISTRIBUCIÓN
// ============================================

// Variables globales del módulo
const DIS_API_KEY = "AIzaSyC7hjbRc0TGLgImv8gVZg8tsOeYWgXlPcM";
const SOURCE_SPREADSHEET_ID = "1esc5REq0c03nHLpGcLwZRW29yq2gZnrpbz75gCCjrqc";

let allRecData = [];
let allConfigData = {};
let activeMayoristas = [];
let empresasData = [];
let currentRecData = null;
let colorOptions = [];
let tallaOptions = [];
let mayoristaFilters = {};

// NOTA: Los datos de clientes ahora se cargan dinámicamente desde Google Sheets
// a través de clientesMap. Ver función loadClientesData() y cargarConfiguraciones()


// Inicializar módulo de distribución
// Busca la función initializeDistribution y reemplázala con esta versión mejorada:
function initializeDistribution() {
    // UI Setup
    const loadingElem = document.getElementById('distribution-loading');
    const mainElem = document.getElementById('distribution-main');

    if (loadingElem) loadingElem.style.display = 'flex';
    if (mainElem) mainElem.style.display = 'none';

    setupDistributionEventListeners(); // Configuramos los listeners una sola vez

    // Retornamos la promesa para que loadDataFromSheets espere a que termine
    return Promise.all([
        cargarTodosLosDatos(),
        cargarConfiguraciones()
    ]).then(([recData, configData]) => {
        console.log('Datos de distribución cargados:', recData.length, 'registros');
        console.log('Configuración cargada:', configData.length, 'clientes');

        handleRecData(recData);
        handleConfigData(configData);

        if (loadingElem) loadingElem.style.display = 'none';
        if (mainElem) mainElem.style.display = 'block';

        updateCounters();
        return true; // Éxito
    }).catch(error => {
        handleError(error);
        throw error; // Propagar error al manejador principal
    });
}

// Función para cargar datos unificados
async function cargarTodosLosDatos() {
    try {
        console.log('Cargando datos de distribución desde Google Sheets...');
        const [json1, json2] = await Promise.all([
            getSheetDataAsJSON_1(),  // DATA2
            getSheetDataAsJSON_2()   // DataBase
        ]);

        const arr1 = JSON.parse(json1);
        console.log('Datos de DATA2:', arr1.length, 'registros');

        const arr2 = JSON.parse(json2);
        console.log('Datos de DataBase:', arr2.length, 'registros');

        const unified = arr1.concat(arr2);
        console.log('Datos unificados:', unified.length, 'registros');

        return unified;
    } catch (error) {
        console.error('Error cargando datos de distribución:', error);
        throw error;
    }
}

// Obtener datos de DATA2
async function getSheetDataAsJSON_1() {
    try {
        const SPREADSHEET_ID = "133NiyjNApZGkEFs4jUvpJ9So-cSEzRVeW2FblwOCrjI";
        const SHEET_NAME = "DATA2";
        const RANGE = `${SHEET_NAME}!S2:S`;

        const url = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${RANGE}?key=${DIS_API_KEY}`;

        console.log('Fetching DATA2 desde:', url);

        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Error HTTP DATA2: ${response.status}`);
        }

        const data = await response.json();

        if (!data.values || data.values.length === 0) {
            console.warn('No data found in DATA2');
            return JSON.stringify([]);
        }

        const jsonEntries = data.values.map(row => row[0]).filter(val => val && val.trim() !== "");
        const finalJsonString = `[${jsonEntries.join(",")}]`;

        return finalJsonString;
    } catch (error) {
        console.error('Error en getSheetDataAsJSON_1:', error);
        return JSON.stringify([]);
    }
}

// Obtener datos de DataBase
async function getSheetDataAsJSON_2() {
    try {
        const range = "DataBase!A:HR";
        const url = `https://sheets.googleapis.com/v4/spreadsheets/${SOURCE_SPREADSHEET_ID}/values/${range}?key=${DIS_API_KEY}`;

        console.log('Fetching DataBase desde:', url);

        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Error HTTP DataBase: ${response.status}`);
        }

        const data = await response.json();

        if (!data.values) {
            console.warn('No data found in DataBase');
            return JSON.stringify([]);
        }

        const datos = data.values;
        let result = [];
        let lotesAnexos = {};
        let lotesHrPendientes = {};

        for (let i = 0; i < datos.length; i++) {
            if (datos[i][0]) {
                const valueA = datos[i][0].toString().trim();

                if (valueA.startsWith("REC")) {
                    const numberPart = valueA.replace("REC", "").trim();

                    let proveedor = "TEXTILES Y CREACIONES EL UNIVERSO S.A.S.";
                    if (datos[i][3] && datos[i][3].toString().trim() === "LINEA ANGELES") {
                        proveedor = "TEXTILES Y CREACIONES LOS ANGELES S.A.S.";
                    }

                    let loteActual = datos[i][8] || "";
                    let tipoActual = datos[i][27] || "";

                    if (!lotesAnexos[loteActual]) {
                        lotesAnexos[loteActual] = [];
                        lotesHrPendientes[loteActual] = [];
                    }

                    if (tipoActual !== "FULL") {
                        lotesAnexos[loteActual].push({
                            "DOCUMENTO": numberPart,
                            "TIPO": tipoActual,
                            "CANTIDAD": datos[i][18] || ""
                        });

                        if (tipoActual === "PENDIENTES" && datos[i][225]) {
                            const hrPendiente = datos[i][225].toString().split("☬").map(row => row.split("∞"));
                            lotesHrPendientes[loteActual] = lotesHrPendientes[loteActual].concat(hrPendiente);
                        }
                    }

                    if (tipoActual === "FULL") {
                        let extensiones = [];
                        if (datos[i][225]) {
                            extensiones = datos[i][225].toString().split("☬").map(row => row.split("∞"));
                        }

                        result.push({
                            "A": numberPart,
                            "FECHA": datos[i][1] || "",
                            "TALLER": datos[i][2] || "",
                            "LINEA": datos[i][3] || "",
                            "AUDITOR": datos[i][4] || "",
                            "ESCANER": datos[i][5] || "",
                            "LOTE": loteActual,
                            "REFERENCIA": datos[i][6] || "",
                            "DESCRIPCIÓN": datos[i][9] || "",
                            "CANTIDAD": datos[i][18] || "",
                            "TEMPLO": datos[i][26] || "",
                            "TIPO": tipoActual,
                            "PVP": datos[i][28] || "",
                            "PRENDA": datos[i][29] || "",
                            "GENERO": datos[i][30] || "",
                            "HR": extensiones,
                            "PROVEEDOR": proveedor,
                            "ANEXO": []
                        });
                    }
                }
            }
        }

        // Combinar HRs y anexos
        result.forEach(item => {
            if (lotesAnexos[item.LOTE]) {
                item.ANEXO = lotesAnexos[item.LOTE];
            }

            if (lotesHrPendientes[item.LOTE] && lotesHrPendientes[item.LOTE].length > 0) {
                const hrPrincipal = item.HR;
                const hrPendientes = lotesHrPendientes[item.LOTE];

                const combinedHrMap = {};

                hrPrincipal.forEach(itemHr => {
                    const codigo = itemHr[0];
                    if (codigo) combinedHrMap[codigo] = [...itemHr];
                });

                hrPendientes.forEach(itemHr => {
                    const codigo = itemHr[0];
                    if (codigo) {
                        if (combinedHrMap[codigo]) {
                            const cantidadExistente = parseInt(combinedHrMap[codigo][3]) || 0;
                            const cantidadNueva = parseInt(itemHr[3]) || 0;
                            combinedHrMap[codigo][3] = (cantidadExistente + cantidadNueva).toString();
                        } else {
                            combinedHrMap[codigo] = [...itemHr];
                        }
                    }
                });

                item.HR = Object.values(combinedHrMap);
            }
        });

        console.log('DataBase procesado:', result.length, 'registros');
        return JSON.stringify(result, null, 2);

    } catch (error) {
        console.error('Error en getSheetDataAsJSON_2:', error);
        return JSON.stringify([]);
    }
}

// Cargar configuraciones desde clientesMap (Google Sheets)
function cargarConfiguraciones() {
    return new Promise((resolve) => {
        // Convertir el clientesMap al formato esperado por el módulo de distribución
        const configArray = Array.from(clientesMap.values()).map(cliente => ({
            id: cliente.ID,
            razonSocial: cliente.RAZON_SOCIAL,
            nombreCorto: cliente.NOMBRE_CORTO,
            tipoCliente: cliente.TIPO_CLIENTE,
            estado: cliente.ESTADO,
            direccion: cliente.DIRECCION,
            telefono: cliente.TELEFONO,
            email: cliente.EMAIL,
            tipoEmpresa: cliente.TIPO_EMPRESA || ''
        }));

        console.log('✅ Configuración cargada desde Google Sheets:', configArray.length, 'clientes');
        console.log('📊 Desglose:', {
            total: configArray.length,
            activos: configArray.filter(c => c.estado === 'Activo').length,
            inactivos: configArray.filter(c => c.estado === 'Inactivo').length,
            empresas: configArray.filter(c => c.tipoEmpresa).length,
            mayoristas: configArray.filter(c => c.tipoCliente === 'Mayorista').length
        });

        resolve(configArray);
    });
}

function handleRecData(recData) {
    allRecData = recData;
    console.log('REC data procesada:', recData.length, 'registros');
    if (allConfigData) {
        refreshDistributionUI();
    }
}

function handleConfigData(configData) {
    allConfigData = configData.reduce((acc, config) => {
        acc[config.id] = config;
        return acc;
    }, {});
    console.log('Config data procesada:', Object.keys(allConfigData).length, 'clientes');
    processConfigData();
    if (allRecData) {
        refreshDistributionUI();
    }
}

function processConfigData() {
    console.log('🔍 Procesando configuración de clientes...');

    // Procesar empresas (filtrar por tipoEmpresa no vacío Y estado Activo)
    empresasData = Object.entries(allConfigData)
        .filter(([id, config]) => {
            const isActive = config.estado && config.estado.toString().toUpperCase().trim() === 'ACTIVO';
            const isEmpresa = config.tipoEmpresa && config.tipoEmpresa.trim() !== '';

            if (isEmpresa && !isActive) {
                console.log(`❌ Filtrando empresa inactiva: ${config.nombreCorto} (${config.estado})`);
            }

            return isEmpresa && isActive;
        })
        .sort((a, b) => {
            if (a[1].tipoEmpresa !== b[1].tipoEmpresa) {
                return a[1].tipoEmpresa === "Principal" ? -1 : 1;
            }
            return a[1].nombreCorto.localeCompare(b[1].nombreCorto);
        });

    console.log('✅ Empresas activas procesadas:', empresasData.length);

    // Inicializar filtros para mayoristas (filtrar por Mayorista Y estado Activo)
    const mayoristas = Object.entries(allConfigData)
        .filter(([id, config]) => {
            const isActive = config.estado && config.estado.toString().toUpperCase().trim() === 'ACTIVO';
            const isMayorista = config.tipoCliente === "Mayorista";

            if (isMayorista && !isActive) {
                console.log(`❌ Filtrando mayorista inactivo: ${config.nombreCorto} (${config.estado})`);
            }

            return isMayorista && isActive;
        });

    mayoristaFilters = {}; // Limpiar filtros anteriores
    mayoristas.forEach(([id, config]) => {
        mayoristaFilters[id] = {
            excludedColors: [],
            excludedTallas: []
        };
    });

    console.log('✅ Filtros inicializados para', Object.keys(mayoristaFilters).length, 'mayoristas activos');
}

// Funciones de UI
function selectAllMayoristas() {
    document.querySelectorAll('#mayoristasContainer input[type="checkbox"]').forEach(checkbox => {
        checkbox.checked = true;
        checkbox.dispatchEvent(new Event('change'));
    });
}

function deselectAllMayoristas() {
    document.querySelectorAll('#mayoristasContainer input[type="checkbox"]').forEach(checkbox => {
        checkbox.checked = false;
        checkbox.dispatchEvent(new Event('change'));
    });
}

// Actualizar contadores
function updateCounters() {
    const empresasCount = empresasData.length;
    const mayoristasCount = Object.keys(allConfigData).filter(id =>
        allConfigData[id].tipoCliente === "Mayorista"
    ).length;

    document.getElementById('empresas-count').textContent = empresasCount;
    document.getElementById('mayoristas-count').textContent = mayoristasCount;
}

function refreshDistributionUI() {
    console.log('Refrescando UI de distribución...');

    document.getElementById('distribution-loading').style.display = 'none';
    document.getElementById('distribution-main').style.display = 'block';

    // Actualizar contadores
    updateCounters();

    // Limpiar y regenerar UI
    document.getElementById('empresasContainer').innerHTML = '';
    document.getElementById('mayoristasContainer').innerHTML = '';

    generateEmpresasUI();
    generateMayoristasUI();

    const recNumber = document.getElementById('recInput').value.trim();
    if (recNumber) {
        searchDistributionRec();
    }

    console.log('UI de distribución refrescada');
}

function generateEmpresasUI() {
    const container = document.getElementById('empresasContainer');
    container.innerHTML = '';

    if (empresasData.length === 0) {
        container.innerHTML = '<p>No hay empresas configuradas</p>';
        return;
    }

    empresasData.forEach(([id, config]) => {
        const item = document.createElement('div');
        item.className = 'empresa-item';

        const label = document.createElement('label');
        label.htmlFor = `empresa-${id}`;
        label.textContent = config.nombreCorto + ':';

        // --- INICIO CAMBIO: Estructura input-group ---
        const groupDiv = document.createElement('div');
        groupDiv.className = 'input-group';

        const input = document.createElement('input');
        input.type = 'number';
        input.id = `empresa-${id}`;
        input.min = '0';
        input.max = '100';
        input.value = config.tipoEmpresa === "Principal" ? '100' : '0';
        input.dataset.tipo = config.tipoEmpresa;
        input.dataset.id = id;

        // Eventos del input
        if (config.tipoEmpresa === "Principal") {
            input.readOnly = true;
            input.classList.add('principal-input');
        } else {
            input.addEventListener('input', updateEmpresaPercentage);
        }

        groupDiv.appendChild(input);

        // Solo agregar controles si NO es la empresa principal
        if (config.tipoEmpresa !== "Principal") {
            const controlsDiv = document.createElement('div');
            controlsDiv.className = 'number-controls';

            // Botón Subir
            const btnUp = document.createElement('button');
            btnUp.type = 'button';
            btnUp.className = 'number-btn';
            btnUp.innerHTML = '<i class="codicon codicon-chevron-up"></i>';
            btnUp.onclick = () => adjustEmpresaValue(id, 1);

            // Botón Bajar
            const btnDown = document.createElement('button');
            btnDown.type = 'button';
            btnDown.className = 'number-btn';
            btnDown.innerHTML = '<i class="codicon codicon-chevron-down"></i>';
            btnDown.onclick = () => adjustEmpresaValue(id, -1);

            controlsDiv.appendChild(btnUp);
            controlsDiv.appendChild(btnDown);
            groupDiv.appendChild(controlsDiv);
        }
        // --- FIN CAMBIO ---

        item.appendChild(label);
        item.appendChild(groupDiv); // Añadimos el grupo en lugar del input directo
        container.appendChild(item);
    });
}

// Función para controles del Input Global de Mayorista
function adjustGlobalValue(mayoristaId, delta) {
    const input = document.getElementById(`global-input-${mayoristaId}`);
    if (!input) return;

    let currentValue = parseInt(input.value) || 0;
    let newValue = Math.max(0, currentValue + delta); // Solo validar min=0

    if (newValue !== currentValue) {
        input.value = newValue;
        // Disparar evento para validaciones existentes
        const event = new Event('input', { bubbles: true });
        input.dispatchEvent(event);
    }
}

// Función para controles de Empresas
function adjustEmpresaValue(empresaId, delta) {
    const input = document.getElementById(`empresa-${empresaId}`);
    if (!input || input.readOnly) return;

    let currentValue = parseInt(input.value) || 0;
    let newValue = currentValue + delta;

    // Validar límites 0-100
    if (newValue > 100) newValue = 100;
    if (newValue < 0) newValue = 0;

    if (newValue !== currentValue) {
        input.value = newValue;
        // Disparar evento para recalcular porcentajes
        const event = new Event('input', { bubbles: true });
        input.dispatchEvent(event);
    }
}

function generateMayoristasUI() {
    const container = document.getElementById('mayoristasContainer');
    const mayoristas = Object.entries(allConfigData)
        .filter(([id, config]) => {
            return config.tipoCliente === "Mayorista" &&
                config.estado &&
                config.estado.toString().toUpperCase().trim() === 'ACTIVO';
        })
        .sort((a, b) => a[1].nombreCorto.localeCompare(b[1].nombreCorto));

    if (mayoristas.length === 0) {
        container.innerHTML = '<p>No hay mayoristas configurados</p>';
        return;
    }

    mayoristas.forEach(([id, config]) => {
        const div = document.createElement('div');
        div.className = 'mayorista-item';

        const checkboxInput = document.createElement('input');
        checkboxInput.type = 'checkbox';
        checkboxInput.id = `mayorista-${id}`;
        checkboxInput.value = id;
        checkboxInput.dataset.nombre = config.nombreCorto;
        checkboxInput.addEventListener('change', updateHrColumns);

        const label = document.createElement('label');
        label.htmlFor = `mayorista-${id}`;
        label.textContent = config.nombreCorto;

        div.appendChild(checkboxInput);
        div.appendChild(label);
        container.appendChild(div);
    });
}

// Función principal para actualizar valores
function updateAllDistributionValues() {
    if (!currentRecData || !currentRecData.HR) return;

    console.log('Actualizando valores de distribución...');

    currentRecData.HR.forEach((row, rowIndex) => {
        const tr = document.querySelector(`#distribution-result tbody tr:nth-child(${rowIndex + 1})`);
        if (!tr) return;

        const total = parseInt(tr.cells[3].textContent) || 0;

        // 1. Calcular total asignado a mayoristas
        let assignedToMayoristas = 0;
        activeMayoristas.forEach(mayorista => {
            const input = tr.querySelector(`.mayorista-input[data-mayorista="${mayorista.id}"]`);
            assignedToMayoristas += parseInt(input?.value) || 0;
        });

        // 2. Validar que no se exceda el total
        if (assignedToMayoristas > total) {
            // Ajustar proporcionalmente los valores de mayoristas
            const ratio = total / assignedToMayoristas;
            activeMayoristas.forEach(mayorista => {
                const input = tr.querySelector(`.mayorista-input[data-mayorista="${mayorista.id}"]`);
                if (input && input.value > 0) {
                    input.value = Math.max(1, Math.floor(parseInt(input.value) * ratio));
                }
            });
            assignedToMayoristas = total;
        }

        // 3. Calcular disponible para empresas
        const availableForCompanies = total - assignedToMayoristas;

        // 4. Asignar a empresas secundarias
        empresasData.forEach(([id, config]) => {
            if (config.tipoEmpresa === "Secundaria") {
                const input = document.getElementById(`empresa-${id}`);
                const porcentaje = input ? parseInt(input.value) || 0 : 0;
                const valorSecundaria = Math.round(availableForCompanies * porcentaje / 100);

                const secundariaCell = tr.querySelector(`.secundaria-cell[data-empresa="${id}"]`);
                if (secundariaCell) secundariaCell.textContent = valorSecundaria;
            }
        });

        // 5. Calcular valor para principal
        let asignadoSecundarias = 0;
        empresasData.forEach(([id, config]) => {
            if (config.tipoEmpresa === "Secundaria") {
                const secundariaCell = tr.querySelector(`.secundaria-cell[data-empresa="${id}"]`);
                asignadoSecundarias += parseInt(secundariaCell?.textContent) || 0;
            }
        });

        const principalValue = Math.max(0, availableForCompanies - asignadoSecundarias);
        const principalCell = tr.querySelector('.principal-cell');
        if (principalCell) principalCell.textContent = principalValue;
    });

    updateDistributionTotals();
}

function updateEmpresaPercentage(event) {
    const input = event.target;
    let value = parseInt(input.value) || 0;
    value = Math.max(0, Math.min(100, value));
    input.value = value;
    updatePrincipalValue();
    updateAllDistributionValues();
}

function updatePrincipalValue() {
    const principal = empresasData.find(([id, config]) => config.tipoEmpresa === "Principal");
    if (!principal) return;

    const principalInput = document.getElementById(`empresa-${principal[0]}`);
    if (!principalInput) return;

    let totalSecundarias = 0;
    empresasData.forEach(([id, config]) => {
        if (config.tipoEmpresa === "Secundaria") {
            const input = document.getElementById(`empresa-${id}`);
            if (input) totalSecundarias += parseInt(input.value) || 0;
        }
    });

    principalInput.value = 100 - totalSecundarias;
}

function updateMayoristaInput(event) {
    const input = event.target;
    const rowIndex = input.dataset.row;
    const mayoristaId = input.dataset.mayorista;
    const value = parseInt(input.value) || 0;

    const row = document.querySelector(`#distribution-result tbody tr:nth-child(${parseInt(rowIndex) + 1})`);
    if (!row) return;

    const total = parseInt(row.cells[3].textContent) || 0;

    // Calcular lo asignado a otros mayoristas
    let assignedToOthers = 0;
    activeMayoristas.forEach(m => {
        if (m.id !== mayoristaId) {
            const otherInput = document.querySelector(`.mayorista-input[data-row="${rowIndex}"][data-mayorista="${m.id}"]`);
            assignedToOthers += parseInt(otherInput?.value) || 0;
        }
    });

    // Validar que no se exceda el total
    if (value + assignedToOthers > total) {
        input.value = Math.max(0, total - assignedToOthers);
    }

    updateAllDistributionValues();
}

function distributeGlobalQuantity(event) {
    const btn = event.target.closest('.distribute-btn');
    const mayoristaId = btn.dataset.mayorista;
    const input = document.querySelector(`.global-mayorista-input[data-mayorista="${mayoristaId}"]`);
    let totalToDistribute = parseInt(input.value) || 0;

    if (totalToDistribute <= 0) return;

    // Obtener filtros actuales para este mayorista
    const filters = mayoristaFilters[mayoristaId] || { excludedColors: [], excludedTallas: [] };

    // Obtener filas disponibles
    const rows = Array.from(document.querySelectorAll('#distribution-result tbody tr:not(.total-row)'))
        .filter(row => {
            const color = row.cells[1].textContent;
            const talla = row.cells[2].textContent;
            const total = parseInt(row.cells[3].textContent) || 0;
            return total > 0 &&
                !filters.excludedColors.includes(color) &&
                !filters.excludedTallas.includes(talla);
        });

    if (rows.length === 0) {
        showMessage('No hay filas disponibles para distribuir', 'error', 3000);
        return;
    }

    // Limpiar valores previos de este mayorista
    document.querySelectorAll(`.mayorista-input[data-mayorista="${mayoristaId}"]`).forEach(input => {
        input.value = '0';
    });

    // Preparar datos para distribución
    const availableRows = rows.map(row => {
        const rowIndex = Array.from(row.parentNode.children).indexOf(row);
        const total = parseInt(row.cells[3].textContent) || 0;

        // Calcular ya asignado a otros mayoristas
        let assignedToOthers = 0;
        activeMayoristas.forEach(m => {
            if (m.id !== mayoristaId) {
                const otherInput = row.querySelector(`.mayorista-input[data-mayorista="${m.id}"]`);
                assignedToOthers += parseInt(otherInput?.value) || 0;
            }
        });

        const disponible = Math.max(0, total - assignedToOthers);

        return {
            row: row,
            tdm: disponible,
            rowIndex: rowIndex
        };
    });

    // Ejecutar distribución inteligente
    const result = smartDistribution(availableRows, totalToDistribute);

    // Aplicar la distribución
    let totalAsignado = 0;
    result.forEach(item => {
        const input = item.row.querySelector(`.mayorista-input[data-mayorista="${mayoristaId}"]`);
        if (item.assigned > 0) {
            input.value = item.assigned;
            totalAsignado += item.assigned;
        }
    });

    // Ajustar el input global con lo realmente distribuido
    input.value = totalAsignado;

    // Actualizar valores de empresas con lo restante
    updateAllDistributionValues();
}

function updateDistributionTotals() {
    if (!currentRecData) return;

    const totalCantidad = currentRecData.HR.reduce((sum, row) => sum + (parseFloat(row[3]) || 0), 0);

    // Totales para mayoristas
    activeMayoristas.forEach(mayorista => {
        let total = 0;
        document.querySelectorAll(`.mayorista-input[data-mayorista="${mayorista.id}"]`).forEach(input => {
            total += parseInt(input.value) || 0;
        });
        const totalElement = document.querySelector(`.mayorista-total[data-mayorista="${mayorista.id}"]`);
        if (totalElement) totalElement.textContent = total;
    });

    // Totales para empresas
    empresasData.forEach(([id, config]) => {
        if (config.tipoEmpresa === "Principal") {
            let totalPrincipal = 0;
            document.querySelectorAll('.principal-cell').forEach(cell => {
                totalPrincipal += parseInt(cell.textContent) || 0;
            });
            const principalTotalElement = document.querySelector('.principal-total');
            if (principalTotalElement) {
                principalTotalElement.textContent = totalPrincipal;
                principalTotalElement.classList.toggle('valor-negativo', totalPrincipal < 0);
            }
        } else {
            let totalSecundaria = 0;
            document.querySelectorAll(`.secundaria-cell[data-empresa="${id}"]`).forEach(cell => {
                totalSecundaria += parseInt(cell.textContent) || 0;
            });
            const totalElement = document.querySelector(`.secundaria-total[data-empresa="${id}"]`);
            if (totalElement) totalElement.textContent = totalSecundaria;
        }
    });
}

function updateHrColumns(event) {
    const changedCheckbox = event.target;
    const mayoristaId = changedCheckbox.value;
    const isNowChecked = changedCheckbox.checked;

    console.log('Cambio en mayorista:', mayoristaId, 'checked:', isNowChecked);

    // Guardar valores actuales de otros mayoristas
    const savedMayoristaValues = {};
    activeMayoristas.forEach(mayorista => {
        if (mayorista.id !== mayoristaId) {
            savedMayoristaValues[mayorista.id] = [];
            document.querySelectorAll(`.mayorista-input[data-mayorista="${mayorista.id}"]`).forEach((input, index) => {
                savedMayoristaValues[mayorista.id][index] = input.value;
            });
        }
    });

    // Guardar valores de empresas
    const savedEmpresaValues = {};
    empresasData.forEach(([id, config]) => {
        const input = document.getElementById(`empresa-${id}`);
        if (input) savedEmpresaValues[id] = input.value;
    });

    // Si se está deshabilitando un mayorista, limpiar sus valores
    if (!isNowChecked) {
        const globalInput = document.querySelector(`.global-mayorista-input[data-mayorista="${mayoristaId}"]`);
        if (globalInput) globalInput.value = '0';

        document.querySelectorAll(`.mayorista-input[data-mayorista="${mayoristaId}"]`).forEach(input => {
            input.value = '0';
        });
    }

    // Actualizar lista de mayoristas activos
    activeMayoristas = [];
    document.querySelectorAll('#mayoristasContainer input[type="checkbox"]:checked').forEach(checkbox => {
        activeMayoristas.push({
            id: checkbox.value,
            nombre: checkbox.dataset.nombre
        });
    });

    console.log('Mayoristas activos:', activeMayoristas.length);

    // Refrescar UI preservando valores
    refreshDistributionDisplayPreservingValues({
        empresas: savedEmpresaValues,
        mayoristas: savedMayoristaValues
    });

    // Actualizar totales
    updateDistributionTotals();
}

function refreshDistributionDisplayPreservingValues(savedValues = {}) {
    const recNumber = document.getElementById('recInput').value.trim();
    if (!recNumber) return;

    if (currentRecData) {
        // Mostrar resultados preservando valores
        const resultDiv = document.getElementById('distribution-result');
        resultDiv.innerHTML = generateDistributionResultsHTML(currentRecData);
        attachDistributionInputEvents();

        // Restaurar valores de empresas
        if (savedValues.empresas) {
            Object.keys(savedValues.empresas).forEach(id => {
                const input = document.getElementById(`empresa-${id}`);
                if (input) {
                    input.value = savedValues.empresas[id];
                    if (input.dataset.tipo === "Secundaria") {
                        const event = new Event('input');
                        input.dispatchEvent(event);
                    }
                }
            });
        }

        // Restaurar valores de mayoristas
        if (savedValues.mayoristas) {
            Object.keys(savedValues.mayoristas).forEach(mayoristaId => {
                const values = savedValues.mayoristas[mayoristaId];
                values.forEach((value, rowIndex) => {
                    const input = document.querySelector(`.mayorista-input[data-row="${rowIndex}"][data-mayorista="${mayoristaId}"]`);
                    if (input) {
                        input.value = value;
                    }
                });
            });
        }

        updateAllDistributionValues();
    }
}

function searchDistributionRec() {
    const recNumber = document.getElementById('recInput').value.trim();
    const resultDiv = document.getElementById('distribution-result');

    if (!recNumber) {
        resultDiv.innerHTML = '<div class="empty-state"><i class="codicon codicon-dashboard"></i><h5>Sin datos para mostrar</h5><p>Ingrese un número de REC y configure la distribución para ver los resultados.</p></div>';
        return;
    }

    console.log('Buscando REC de distribución:', recNumber);

    // Buscar el REC (quitar ceros iniciales si es necesario)
    const recNumClean = recNumber.replace(/^0+/, '');
    currentRecData = allRecData.find(item => item.A === recNumClean);

    if (!currentRecData) {
        // Intentar buscar con el formato original
        currentRecData = allRecData.find(item => item.A === recNumber);
    }

    displayDistributionResults(currentRecData);
}

function displayDistributionResults(recData) {
    const resultDiv = document.getElementById('distribution-result');

    if (!recData) {
        resultDiv.innerHTML = '<p class="error-message">No se encontró el REC especificado</p>';
        return;
    }

    console.log('REC encontrado:', recData.A);
    console.log('Extensiones HR:', recData.HR ? recData.HR.length : 0);

    resultDiv.innerHTML = generateDistributionResultsHTML(recData);
    attachDistributionInputEvents();
    updateAllDistributionValues();
}

function generateDistributionResultsHTML(recData) {
    let html = '';

    if (!recData.HR || recData.HR.length === 0) {
        return '<p>No hay extensiones para este REC</p>';
    }

    html += '<table><thead><tr>';

    // Columnas fijas
    html += '<th>Código</th>';
    html += '<th>Color</th>';
    html += '<th>Talla</th>';
    html += '<th>Cantidad</th>';

    // Columnas de empresas
    empresasData.forEach(([id, config]) => {
        html += `<th>${config.nombreCorto}</th>`;
    });

    // Columnas de mayoristas
    activeMayoristas.forEach(mayorista => {
        html += `
            <th>
                <div class="mayorista-column-header">
                    <div class="header-title">${mayorista.nombre}</div>
                    <div class="header-controls-single-row">
                        <div class="input-group global-input-group">
                            <input type="number" min="0" class="global-mayorista-input" 
                                    id="global-input-${mayorista.id}"
                                    data-mayorista="${mayorista.id}" value="0" placeholder="0">
                            <div class="number-controls global-number-controls">
                                <button type="button" class="number-btn" 
                                        onclick="adjustGlobalValue('${mayorista.id}', 1)" 
                                        title="Aumentar">
                                    <i class="codicon codicon-chevron-up"></i>
                                </button>
                                <button type="button" class="number-btn" 
                                        onclick="adjustGlobalValue('${mayorista.id}', -1)" 
                                        title="Disminuir">
                                    <i class="codicon codicon-chevron-down"></i>
                                </button>
                            </div>
                        </div>
                        <button class="btn-sm distribute-btn" data-mayorista="${mayorista.id}" title="Distribuir cantidad">
                            <i class="codicon codicon-symbol-array"></i>
                        </button>
                        <button class="btn-sm filter-btn" data-mayorista="${mayorista.id}" title="Filtrar colores/tallas" onclick="openFilterModal(event)">
                            <i class="codicon codicon-filter"></i>
                        </button>
                        <button class="btn-sm clear-btn" data-mayorista="${mayorista.id}" title="Limpiar valores">
                            <i class="codicon codicon-clear-all"></i>
                        </button>
                    </div>
                </div>
            </th>
        `;
    });

    html += '</tr></thead><tbody>';

    // Filas de datos
    recData.HR.forEach((row, rowIndex) => {
        const codigo = formatCellValue(row[0]);
        const color = formatCellValue(row[1]);
        const talla = formatCellValue(row[2]);
        const cantidad = parseFloat(row[3]) || 0;

        html += `<tr>`;
        html += `<td>${codigo}</td>`;
        html += `<td>${color}</td>`;
        html += `<td>${talla}</td>`;
        html += `<td>${cantidad}</td>`;

        // Valores para empresas
        empresasData.forEach(([id, config]) => {
            if (config.tipoEmpresa === "Principal") {
                html += `<td class="principal-cell" data-row="${rowIndex}">${cantidad}</td>`;
            } else {
                html += `<td class="secundaria-cell" data-row="${rowIndex}" data-empresa="${id}">0</td>`;
            }
        });

        // Inputs para mayoristas
        // Inputs para mayoristas (CON CONTROLES PERSONALIZADOS)
        activeMayoristas.forEach(mayorista => {
            html += `
                <td>
                    <div class="input-group item-input-group">
                        <input type="number" min="0" max="${cantidad}" 
                                class="mayorista-input" 
                                id="input-${mayorista.id}-${rowIndex}"
                                data-row="${rowIndex}" 
                                data-mayorista="${mayorista.id}"
                                value="0"
                                data-color="${color}"
                                data-talla="${talla}">
                        <div class="number-controls item-number-controls">
                            <button type="button" class="number-btn" 
                                    onclick="adjustDistValue('${mayorista.id}', ${rowIndex}, 1)" 
                                    title="Aumentar">
                                <i class="codicon codicon-chevron-up"></i>
                            </button>
                            <button type="button" class="number-btn" 
                                    onclick="adjustDistValue('${mayorista.id}', ${rowIndex}, -1)" 
                                    title="Disminuir">
                                <i class="codicon codicon-chevron-down"></i>
                            </button>
                        </div>
                    </div>
                </td>
            `;
        });

        html += '</tr>';
    });

    // Fila de totales
    html += '<tr class="total-row">';
    html += '<td colspan="3"><strong>Total</strong></td>';

    const totalCantidad = recData.HR.reduce((sum, row) => sum + (parseFloat(row[3]) || 0), 0);
    html += `<td><strong>${totalCantidad}</strong></td>`;

    // Totales empresas
    empresasData.forEach(([id, config]) => {
        if (config.tipoEmpresa === "Principal") {
            html += `<td><strong class="principal-total">${totalCantidad}</strong></td>`;
        } else {
            html += `<td><strong class="secundaria-total" data-empresa="${id}">0</strong></td>`;
        }
    });

    // Totales mayoristas
    activeMayoristas.forEach(mayorista => {
        html += `<td><strong class="mayorista-total" data-mayorista="${mayorista.id}">0</strong></td>`;
    });

    html += '</tr></tbody></table>';

    return html;
}

// Función para manejar los controles numéricos de la tabla de distribución
function adjustDistValue(mayoristaId, rowIndex, delta) {
    // 1. Encontrar el input específico
    const inputSelector = `.mayorista-input[data-row="${rowIndex}"][data-mayorista="${mayoristaId}"]`;
    const input = document.querySelector(inputSelector);

    if (!input) return;

    // 2. Calcular nuevo valor
    let currentValue = parseInt(input.value) || 0;
    let newValue = currentValue + delta;

    // 3. Validar límites (min y max)
    const max = parseInt(input.getAttribute('max')) || 999999;
    const min = parseInt(input.getAttribute('min')) || 0;

    if (newValue > max) newValue = max;
    if (newValue < min) newValue = min;

    // 4. Si el valor cambió, actualizar y disparar eventos
    if (newValue !== currentValue) {
        input.value = newValue;

        // Crear y despachar el evento 'input' manualmente para que 
        // updateMayoristaInput detecte el cambio y recalcule totales
        const event = new Event('input', { bubbles: true });
        input.dispatchEvent(event);
    }
}

function attachDistributionInputEvents() {
    // Eventos para inputs de mayoristas por fila
    document.querySelectorAll('.mayorista-input').forEach(input => {
        input.addEventListener('input', updateMayoristaInput);
    });

    // Eventos para inputs globales
    document.querySelectorAll('.global-mayorista-input').forEach(input => {
        input.addEventListener('input', updateGlobalMayoristaValue);
        input.addEventListener('keypress', function (e) {
            if (e.key === 'Enter') {
                const mayoristaId = this.dataset.mayorista;
                const distributeBtn = document.querySelector(`.distribute-btn[data-mayorista="${mayoristaId}"]`);
                if (distributeBtn) {
                    distributeBtn.click();
                }
            }
        });
    });

    // Botones de distribución
    document.querySelectorAll('.distribute-btn').forEach(btn => {
        btn.addEventListener('click', distributeGlobalQuantity);
    });

    // Botones de limpieza
    document.querySelectorAll('.clear-btn').forEach(btn => {
        btn.addEventListener('click', clearMayoristaValues);
    });

    // Botones de filtro
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', openFilterModal);
    });
}

function updateGlobalMayoristaValue(event) {
    const input = event.target;
    const mayoristaId = input.dataset.mayorista;
    const value = parseInt(input.value) || 0;

    if (!currentRecData || !currentRecData.HR) return;

    // Validar contra el total disponible
    const totalDisponible = currentRecData.HR.reduce((sum, row) => sum + (parseFloat(row[3]) || 0), 0);

    // Calcular ya asignado a otros mayoristas
    let assignedToOthers = 0;
    activeMayoristas.forEach(m => {
        if (m.id !== mayoristaId) {
            const globalInput = document.querySelector(`.global-mayorista-input[data-mayorista="${m.id}"]`);
            assignedToOthers += parseInt(globalInput?.value) || 0;
        }
    });

    if (value + assignedToOthers > totalDisponible) {
        input.value = Math.max(0, totalDisponible - assignedToOthers);
    }
}

function clearMayoristaValues(event) {
    const btn = event.target.closest('.clear-btn');
    const mayoristaId = btn.dataset.mayorista;

    // Limpiar input global
    const globalInput = document.querySelector(`.global-mayorista-input[data-mayorista="${mayoristaId}"]`);
    if (globalInput) globalInput.value = '0';

    // Limpiar inputs por fila
    document.querySelectorAll(`.mayorista-input[data-mayorista="${mayoristaId}"]`).forEach(input => {
        input.value = '0';
    });

    // Restablecer filtros
    if (mayoristaFilters[mayoristaId]) {
        mayoristaFilters[mayoristaId].excludedColors = [];
        mayoristaFilters[mayoristaId].excludedTallas = [];
    }

    updateAllDistributionValues();
}

function openFilterModal(event) {
    const btn = event.target.closest('.filter-btn');
    const mayoristaId = btn.dataset.mayorista;
    const mayorista = allConfigData[mayoristaId];

    if (!currentRecData || !currentRecData.HR || currentRecData.HR.length === 0) {
        showMessage('Primero busque un REC para configurar los filtros', 'error', 3000);
        return;
    }

    // Extraer opciones únicas de colores y tallas
    const colors = new Set();
    const tallas = new Set();

    currentRecData.HR.forEach(row => {
        if (row[1]) colors.add(row[1]);
        if (row[2]) tallas.add(row[2]);
    });

    colorOptions = Array.from(colors);
    tallaOptions = Array.from(tallas);

    // Asegurar estructura de filtros
    if (!mayoristaFilters[mayoristaId]) {
        mayoristaFilters[mayoristaId] = {
            excludedColors: [],
            excludedTallas: []
        };
    }

    // Remover modal existente si hay uno (prevenir duplicados)
    const existingModal = document.querySelector('.filter-modal');
    if (existingModal) {
        document.body.removeChild(existingModal);
    }

    // Crear modal
    const modal = document.createElement('div');
    modal.className = 'filter-modal';
    modal.innerHTML = `
        <div class="filter-modal-content">
            <div class="filter-modal-header">
                <h3>
                    <i class="codicon codicon-filter"></i>
                    Filtros para ${mayorista.nombreCorto}
                </h3>
                <button class="filter-modal-close" onclick="closeFilterModal(this)">
                    <i class="codicon codicon-close"></i>
                </button>
            </div>
            <div class="filter-modal-body">
                <div class="filter-section">
                    <h5>
                        <i class="codicon codicon-symbol-color"></i>
                        Excluir Colores
                    </h5>
                    <div id="colorFilters-${mayoristaId}" class="filter-options"></div>
                </div>
                <div class="filter-section">
                    <h5>
                        <i class="codicon codicon-symbol-ruler"></i>
                        Excluir Tallas
                    </h5>
                    <div id="tallaFilters-${mayoristaId}" class="filter-options"></div>
                </div>
            </div>
            <div class="filter-modal-footer">
                <button class="btn-secondary" onclick="closeFilterModal(this)">
                    Cancelar
                </button>
                <button class="btn-primary" onclick="applyFilters('${mayoristaId}')">
                    <i class="codicon codicon-check"></i>
                    Aplicar Filtros
                </button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    // Llenar opciones de colores
    const colorContainer = document.getElementById(`colorFilters-${mayoristaId}`);
    colorOptions.forEach(color => {
        const div = document.createElement('div');
        div.className = 'filter-option';

        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.id = `color-${mayoristaId}-${color}`;
        checkbox.value = color;
        checkbox.checked = mayoristaFilters[mayoristaId].excludedColors.includes(color);

        const label = document.createElement('label');
        label.htmlFor = `color-${mayoristaId}-${color}`;
        label.textContent = color;

        div.appendChild(checkbox);
        div.appendChild(label);
        colorContainer.appendChild(div);
    });

    // Llenar opciones de tallas
    const tallaContainer = document.getElementById(`tallaFilters-${mayoristaId}`);
    tallaOptions.forEach(talla => {
        const div = document.createElement('div');
        div.className = 'filter-option';

        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.id = `talla-${mayoristaId}-${talla}`;
        checkbox.value = talla;
        checkbox.checked = mayoristaFilters[mayoristaId].excludedTallas.includes(talla);

        const label = document.createElement('label');
        label.htmlFor = `talla-${mayoristaId}-${talla}`;
        label.textContent = talla;

        div.appendChild(checkbox);
        div.appendChild(label);
        tallaContainer.appendChild(div);
    });

    // Mostrar modal con animación
    setTimeout(() => {
        modal.classList.add('show');
    }, 10);

    // Cerrar modal al hacer clic fuera
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            closeFilterModal(modal);
        }
    });

    // Guardar referencia al modal
    modal.dataset.mayoristaId = mayoristaId;
}

function closeFilterModal(element) {
    const modal = element.closest('.filter-modal');
    if (modal) {
        modal.classList.remove('show');
        setTimeout(() => {
            if (document.body.contains(modal)) {
                document.body.removeChild(modal);
            }
        }, 300);
    }
}

function applyFilters(mayoristaId) {
    // Guardar filtros
    mayoristaFilters[mayoristaId].excludedColors = Array.from(
        document.querySelectorAll(`#colorFilters-${mayoristaId} input[type="checkbox"]:checked`)
    ).map(cb => cb.value);

    mayoristaFilters[mayoristaId].excludedTallas = Array.from(
        document.querySelectorAll(`#tallaFilters-${mayoristaId} input[type="checkbox"]:checked`)
    ).map(cb => cb.value);

    // Cerrar modal
    const modal = document.querySelector('.filter-modal');
    if (modal) {
        closeFilterModal(modal);
    }

    // Mostrar mensaje de confirmación
    const excludedColorsCount = mayoristaFilters[mayoristaId].excludedColors.length;
    const excludedTallasCount = mayoristaFilters[mayoristaId].excludedTallas.length;

    let message = 'Filtros aplicados';
    if (excludedColorsCount > 0 || excludedTallasCount > 0) {
        message += ` - Excluidos: ${excludedColorsCount} colores, ${excludedTallasCount} tallas`;
    }

    showMessage(message, 'success', 2000);

    // Si hay valor global, redistribuir
    const globalInput = document.querySelector(`.global-mayorista-input[data-mayorista="${mayoristaId}"]`);
    const valorGlobal = parseInt(globalInput?.value) || 0;

    if (valorGlobal > 0) {
        const distributeBtn = document.querySelector(`.distribute-btn[data-mayorista="${mayoristaId}"]`);
        if (distributeBtn) {
            distributeBtn.click();
        }
    }
}

function formatCellValue(value) {
    if (value == null) return '';
    if (Array.isArray(value)) return value.join(', ');
    if (typeof value === 'object') return JSON.stringify(value);
    return String(value);
}

function handleError(error) {
    console.error("Error en módulo de distribución:", error);

    // Ocultar loading
    document.getElementById('distribution-loading').style.display = 'none';
    document.getElementById('distribution-main').style.display = 'block';

    // Mostrar error en la UI
    document.getElementById('distribution-result').innerHTML = `
        <div class="error-state">
            <i class="codicon codicon-error"></i>
            <h5>Error al cargar datos</h5>
            <p>${error.message}</p>
            <button class="btn-primary" onclick="initializeDistribution()">Reintentar</button>
        </div>
    `;
}

function reloadAllDistributionData() {
    document.getElementById('distribution-loading').style.display = 'flex';
    document.getElementById('distribution-main').style.display = 'none';
    document.getElementById('distribution-result').innerHTML = '<div class="empty-state"><i class="codicon codicon-dashboard"></i><h5>Actualizando datos...</h5><p>Por favor espere...</p></div>';

    initializeDistribution();
}

// Funciones de distribución inteligente
function smartDistribution(availableRows, totalQty) {
    const totalAvailable = availableRows.reduce((sum, row) => sum + row.tdm, 0);
    const uniqueItems = availableRows.length;
    const scenario = classifyDistributionScenario(totalQty, uniqueItems, totalAvailable);

    switch (scenario) {
        case 'LOW_QUANTITY': return distributeLowQuantity(availableRows, totalQty);
        case 'BALANCED': return distributeBalanced(availableRows, totalQty);
        case 'HIGH_QUANTITY': return distributeHighQuantity(availableRows, totalQty);
        case 'LIMITED_STOCK': return distributeLimitedStock(availableRows, totalQty);
        default: return distributeDefault(availableRows, totalQty);
    }
}

function classifyDistributionScenario(totalQty, uniqueItems, totalAvailable) {
    const avgPerItem = totalQty / uniqueItems;
    const stockRatio = totalQty / totalAvailable;

    if (totalQty <= uniqueItems) return 'LOW_QUANTITY';
    else if (avgPerItem < 3 && stockRatio < 0.3) return 'BALANCED';
    else if (stockRatio > 0.7) return 'HIGH_QUANTITY';
    else if (totalAvailable / uniqueItems < 2) return 'LIMITED_STOCK';
    return 'DEFAULT';
}

function distributeLowQuantity(availableRows, totalQty) {
    const prioritized = [...availableRows].sort((a, b) => {
        const priorityA = (a.tdm * 0.7) + (a.historicRotation || 0.3);
        const priorityB = (b.tdm * 0.7) + (b.historicRotation || 0.3);
        return priorityB - priorityA;
    });

    return prioritized.map((row, index) => ({
        ...row,
        assigned: index < totalQty ? 1 : 0
    })).filter(row => row.assigned > 0);
}

function distributeBalanced(availableRows, totalQty) {
    const basePerItem = Math.floor(totalQty / availableRows.length);
    let remaining = totalQty - (basePerItem * availableRows.length);

    let distributed = availableRows.map(row => {
        const assigned = Math.min(basePerItem, row.tdm);
        return { ...row, assigned };
    });

    if (remaining > 0) {
        distributed.sort((a, b) => (b.tdm - b.assigned) - (a.tdm - a.assigned));

        for (let i = 0; i < distributed.length && remaining > 0; i++) {
            const available = distributed[i].tdm - distributed[i].assigned;
            if (available > 0) {
                distributed[i].assigned += 1;
                remaining -= 1;
            }
        }
    }

    return distributed;
}

function distributeHighQuantity(availableRows, totalQty) {
    const totalStock = availableRows.reduce((sum, row) => sum + row.tdm, 0);
    let remaining = totalQty;

    let distributed = availableRows.map(row => {
        const proportion = row.tdm / totalStock;
        let assigned = Math.max(1, Math.floor(proportion * totalQty));
        assigned = Math.min(assigned, row.tdm);
        remaining -= assigned;
        return { ...row, assigned };
    });

    if (remaining !== 0) {
        distributed.sort((a, b) => {
            const deviationA = (a.assigned / a.tdm) - (totalQty / totalStock);
            const deviationB = (b.assigned / b.tdm) - (totalQty / totalStock);
            return Math.abs(deviationB) - Math.abs(deviationA);
        });

        for (let i = 0; i < distributed.length && remaining !== 0; i++) {
            const row = distributed[i];
            const canAdd = remaining > 0 ? row.tdm - row.assigned : row.assigned;

            if (canAdd > 0) {
                const adjustment = remaining > 0 ? 1 : -1;
                row.assigned += adjustment;
                remaining -= adjustment;
            }
        }
    }

    return distributed;
}

function distributeLimitedStock(availableRows, totalQty) {
    const totalStock = availableRows.reduce((sum, row) => sum + row.tdm, 0);
    let remaining = totalQty;

    let distributed = availableRows.map(row => {
        let assigned = Math.min(1, row.tdm);
        remaining -= assigned;
        return { ...row, assigned };
    });

    if (remaining > 0) {
        const remainingStock = totalStock - availableRows.length;
        distributed.forEach(row => {
            if (remaining <= 0) return;

            const additional = Math.min(
                Math.floor((row.tdm - 1) / remainingStock * remaining),
                row.tdm - row.assigned
            );

            if (additional > 0) {
                row.assigned += additional;
                remaining -= additional;
            }
        });
    }

    if (remaining > 0) {
        distributed.sort((a, b) => b.tdm - a.tdm);
        for (let i = 0; i < distributed.length && remaining > 0; i++) {
            const available = distributed[i].tdm - distributed[i].assigned;
            if (available > 0) {
                const toAdd = Math.min(available, remaining);
                distributed[i].assigned += toAdd;
                remaining -= toAdd;
            }
        }
    }

    return distributed;
}

function distributeDefault(availableRows, totalQty) {
    const totalStock = availableRows.reduce((sum, row) => sum + row.tdm, 0);
    let remaining = totalQty;

    let distributed = availableRows.map(row => {
        const proportion = row.tdm / totalStock;
        let assigned = Math.floor(proportion * totalQty);
        assigned = Math.min(assigned, row.tdm);
        remaining -= assigned;
        return { ...row, assigned };
    });

    if (remaining > 0) {
        distributed.sort((a, b) => (b.tdm - b.assigned) - (a.tdm - a.assigned));

        for (let i = 0; i < distributed.length && remaining > 0; i++) {
            const available = distributed[i].tdm - distributed[i].assigned;
            if (available > 0) {
                distributed[i].assigned += 1;
                remaining -= 1;
            }
        }
    }

    return distributed;
}

// Funciones auxiliares
function showModuleSettings() {
    createModal('Configuración del Módulo de Distribución', `
        <div style="padding: 16px 0;">
            <div class="form-group">
                <label for="moduleApiKey">API Key de Google Sheets</label>
                <input type="text" id="moduleApiKey" class="form-control" value="${DIS_API_KEY}" readonly>
            </div>
            <div class="form-group">
                <label for="moduleSpreadsheetId">ID de la Hoja de Cálculo Principal</label>
                <input type="text" id="moduleSpreadsheetId" class="form-control" value="${SOURCE_SPREADSHEET_ID}" readonly>
            </div>
            <div style="display: flex; gap: 8px; justify-content: flex-end; margin-top: 20px;">
                <button class="btn-secondary" onclick="this.closest('.modal').remove()">Cerrar</button>
                <button class="btn-primary" onclick="saveModuleSettings()">Guardar</button>
            </div>
        </div>
    `, true);
}

function saveModuleSettings() {
    // Aquí iría la lógica para guardar las configuraciones
    showMessage('Configuración guardada correctamente', 'success', 1500);
    document.querySelector('.modal').remove();
}

function saveAllDistributionsFast() {
    showMessage('Función de guardar no implementada en esta versión', 'info');
}

function resetEmpresas() {
    empresasData.forEach(([id, config]) => {
        const input = document.getElementById(`empresa-${id}`);
        if (input && config.tipoEmpresa === "Secundaria") {
            input.value = '0';
        }
    });
    updatePrincipalValue();
    updateAllDistributionValues();
}

// Configurar event listeners del módulo
function setupDistributionEventListeners() {
    // Botón de recarga
    document.getElementById('reloadDataBtn').addEventListener('click', reloadAllDistributionData);

    // Botón de guardar
    document.getElementById('saveDistributionsBtn').addEventListener('click', saveAllDistributionsFast);

    // Botón de configuración
    document.getElementById('moduleConfigBtn').addEventListener('click', showModuleSettings);

    // Atajo de teclado Ctrl+Q para guardar
    document.addEventListener('keydown', function (event) {
        if ((event.ctrlKey || event.metaKey) && (event.key === 'q' || event.key === 'Q')) {
            event.preventDefault();
            saveAllDistributionsFast();
        }
    });
}

// ============================================
// INICIALIZACIÓN DE TRASLADOS ANULADOS
// ============================================

// Cargar traslados anulados al iniciar la aplicación
(function initializeCancelledTransfers() {
    if (loadCancelledTransfersFromStorage()) {
        // Si hay traslados anulados guardados, actualizar la UI
        if (cancelledTransfers.size > 0) {
            // Esperar a que el DOM esté listo
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', () => {
                    updateCancelledTransfersTable();
                    document.getElementById('restoreAllBtn').style.display = 'inline-flex';
                });
            } else {
                // DOM ya está listo
                updateCancelledTransfersTable();
                const restoreAllBtn = document.getElementById('restoreAllBtn');
                if (restoreAllBtn) restoreAllBtn.style.display = 'inline-flex';
            }
        }
    }
})();

// ============================================
// FUNCIONES DE DISTRIBUCIÓN DE EMPRESAS
// ============================================

// Variable para rastrear el estado del ciclo de distribución
let empresasDistributionState = 0; // 0 = inicial, 1 = 30%, 2 = 0%, 3 = 100%

/**
 * Distribuye equitativamente entre empresas
 * Cicla entre: 30% -> 0% -> 100% -> 30% ...
 */
function distributeEmpresasEqually() {
    // Buscar el input de la segunda empresa (secundaria)
    const empresaInputs = document.querySelectorAll('.empresa-item input[type="number"]:not(.principal-input)');

    if (empresaInputs.length === 0) {
        console.log('No hay empresas secundarias para distribuir');
        return;
    }

    // Tomar el primer input secundario (segunda empresa)
    const secondEmpresaInput = empresaInputs[0];

    // Ciclar entre los valores: 30 -> 0 -> 100 -> 30
    const values = [30, 0, 100];
    empresasDistributionState = (empresasDistributionState + 1) % values.length;
    const newValue = values[empresasDistributionState];

    // Asignar el valor
    secondEmpresaInput.value = newValue;

    // Disparar el evento de cambio para actualizar los cálculos
    const event = new Event('input', { bubbles: true });
    secondEmpresaInput.dispatchEvent(event);

    console.log(`Distribución de empresas: ${newValue}%`);
}

/**
 * Limpia todos los valores de empresas secundarias
 */
function clearEmpresasValues() {
    // Buscar todos los inputs de empresas secundarias
    const empresaInputs = document.querySelectorAll('.empresa-item input[type="number"]:not(.principal-input)');

    empresaInputs.forEach(input => {
        input.value = 0;
        // Disparar el evento de cambio
        const event = new Event('input', { bubbles: true });
        input.dispatchEvent(event);
    });

    // Resetear el estado del ciclo
    empresasDistributionState = 0;

    console.log('Valores de empresas limpiados');
}