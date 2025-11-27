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
let currentOPData = null;

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
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

async function initializeApp() {
    setupEventListeners();
    setupTabSystem();
    setupTheme();
    initializeNotifications();
    await loadDataFromSheets();
    updateStatus('Sistema inicializado correctamente', 'info');
}

// UI Management
function setupEventListeners() {
    // File upload
    const fileInput = document.getElementById('csvFile');
    const uploadBox = document.getElementById('uploadBox');
    
    fileInput.addEventListener('change', function(e) {
        if (e.target.files.length > 0) {
            const fileName = e.target.files[0].name;
            updateStatus(`Archivo seleccionado: ${fileName}`, 'success');
            showMessage(`Archivo "${fileName}" listo para procesar`, 'success', 2000);
        }
    });
    
    uploadBox.addEventListener('dragover', function(e) {
        e.preventDefault();
        uploadBox.style.borderColor = 'var(--primary)';
        uploadBox.style.backgroundColor = 'var(--hover)';
    });
    
    uploadBox.addEventListener('dragleave', function(e) {
        e.preventDefault();
        uploadBox.style.borderColor = 'var(--border)';
        uploadBox.style.backgroundColor = 'transparent';
    });
    
    uploadBox.addEventListener('drop', function(e) {
        e.preventDefault();
        uploadBox.style.borderColor = 'var(--border)';
        uploadBox.style.backgroundColor = 'transparent';
        
        if (e.dataTransfer.files.length) {
            fileInput.files = e.dataTransfer.files;
            const fileName = e.dataTransfer.files[0].name;
            updateStatus(`Archivo listo: ${fileName}`, 'success');
            showMessage(`Archivo "${fileName}" cargado por drag & drop`, 'success', 2000);
        }
    });

    // Settings button
    document.getElementById('settingsBtn').addEventListener('click', function() {
        showSettingsModal();
    });
}

function setupTabSystem() {
    // Activity bar buttons
    document.querySelectorAll('.activity-icon').forEach(btn => {
        btn.addEventListener('click', function() {
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
        tab.addEventListener('click', function() {
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
        });
    });
    
    // Close tab buttons
    document.querySelectorAll('.tab-close').forEach(btn => {
        btn.addEventListener('click', function(e) {
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
    
    themeToggle.addEventListener('click', function() {
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
            `${coloresMap.size} colores | ${data2Map.size} OPs | ${preciosMap.size} precios | ${sisproMap.size} productos`;
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

function showQuickConfirm(title, message, confirmText = 'Confirmar', cancelText = 'Cancelar') {
    return new Promise((resolve) => {
        const modal = createModal(title, `
            <div style="padding: 16px 0;">
                <p style="margin: 0 0 16px 0; line-height: 1.5;">${message}</p>
                <div style="display: flex; gap: 8px; justify-content: flex-end;">
                    <button class="btn-secondary" onclick="closeQuickModal(false)">${cancelText}</button>
                    <button class="btn-primary" onclick="closeQuickModal(true)">${confirmText}</button>
                </div>
            </div>
        `, false);
        
        window.closeQuickModal = function(result) {
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
    
    modal.addEventListener('click', function(e) {
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
async function loadDataFromSheets() {
    updateStatus('Cargando datos desde Google Sheets...', 'loading');
    const processBtn = document.getElementById('processBtn');
    if (processBtn) {
        processBtn.disabled = true;
        processBtn.innerHTML = '<span class="loading-spinner"></span> Cargando datos...';
    }

    const loading = showQuickLoading('Cargando datos desde Google Sheets...');

    try {
        await Promise.all([
            loadColoresData(),
            loadData2Data(),
            loadPreciosData(),
            loadSisproData(),
            loadHistoricasData()
        ]);

        updateDataStats();
        updateStatus('Datos cargados correctamente', 'success');
        showMessage(`Sistema listo - ${coloresMap.size} colores, ${data2Map.size} OPs, ${preciosMap.size} precios cargados`, 'success', 2000);

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

function formatDate(dateString) {
    if (!dateString) return '';
    return dateString.split(' ')[0];
}

function formatCosto(costo) {
    return Math.floor(costo).toString();
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

    reader.onload = async function(e) {
        try {
            const csvContent = e.target.result;
            const rows = parseCSV(csvContent);
            
            if (rows.length === 0) {
                throw new Error('El archivo CSV está vacío o no tiene datos válidos');
            }

            await processCSVData(rows);
            showMessage(`Procesamiento completado - ${processedData.length} registros procesados`, 'success', 2000);

        } catch (error) {
            console.error('Error procesando CSV:', error);
            showMessage('Error al procesar archivo: ' + error.message, 'error', 3000);
        } finally {
            loading.close();
            processBtn.disabled = false;
            processBtn.innerHTML = '<i class="codicon codicon-play"></i> Procesar CSV';
        }
    };

    reader.onerror = function() {
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

async function processCSVData(rows) {
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

    processedData = [];
    
    // Second pass: process TR data
    rows.forEach(row => {
        if (row.length >= 38) {
            const usuario = row[1] || '';
            const bodega = row[14] || '';
            const tipo = row[3] || '';
            
            if (escanersMap[usuario] && bodega !== 'PR' && tipo === 'TR') {
                const key = `${row[2]}|${row[11]}|${row[12]}`;
                const prData = prDataMap.get(key);
                const sisproInfo = getSisproData(row[2] || '');
                
                let costo = 0;
                if (bodega !== 'ZY' && prData) {
                    costo = prData.COSTO;
                }
                
                const op = row[2] || '';
                const referencia = row[0] || '';
                const estado = validarEstado(op);
                const pvp = getPvp(referencia);
                const codColorOriginal = row[12] || '';
                const marca = getMarca(sisproInfo.GENERO);
                const clase = getClaseByPVP(pvp);
                const descripcion = getDescripcion(
                    sisproInfo.PRENDA || normalizeText(row[23] || ''),
                    sisproInfo.GENERO,
                    marca,
                    referencia
                );
                
                const processedRow = {
                    REFERENCIA: referencia,
                    USUARIO: escanersMap[usuario] || usuario,
                    OP: op,
                    TIPO: normalizeTipo(tipo),
                    FECHA: formatDate(row[4]),
                    TRASLADO: extractTrasladoNumber(row[7] || ''),
                    CANTIDAD: parseFloat(row[9]) || 0,
                    COSTO: formatCosto(costo),
                    TOTAL: row[19] || '',
                    PVP: pvp,
                    TALLA: row[11] || '',
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
                };
                processedData.push(processedRow);
            }
        }
    });

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

// Pending OPs Management
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
                cantidad: 0,
                items: []
            };
        }
        opGroups[item.OP].cantidad += item.CANTIDAD;
        opGroups[item.OP].items.push(item);
    });

    Object.keys(opGroups).forEach(op => {
        const grupo = opGroups[op];
        const option = document.createElement('option');
        option.value = op;
        option.textContent = `OP: ${op} - Ref: ${grupo.referencia} - ${grupo.prenda} - Usuario: ${grupo.usuario} - Cant: ${grupo.cantidad}`;
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

    const jsonData = {
        "A": primerItem.OP,
        "FECHA": primerItem.FECHA,
        "TALLER": primerItem.TALLER,
        "LINEA": primerItem.LINEA,
        "AUDITOR": auditor,
        "GESTOR": gestor,
        "ESCANER": primerItem.USUARIO,
        "LOTE": parseInt(primerItem.OP) || 0,
        "REFPROV": primerItem.REFERENCIA,
        "DESCRIPCION_LARGA": primerItem.DESCRIPCION_LARGA,
        "CANTIDAD": cantidad,
        "TOTAL_RELATIVO": totalRelativo,
        "COSTO_UNITARIO": costoUnitario,
        "COSTO_TOTAL": costoTotal,
        "TOTAL_GENERAL": totalGeneral,
        "DIFERENCIA": diferencia,
        "AUDITORIA": primerItem.CC,
        "ORDEN_SERVICIO": `S0${primerItem.OS}`,
        "TRASLADO": `T000${primerItem.TRASLADO}`,
        "REFERENCIA": referenciaHistorica,
        "TIPO": "FULL",
        "PVP": pvpEdit,
        "PRENDA": primerItem.PRENDA,
        "GENERO": primerItem.GENERO,
        "PROVEEDOR": proveedor,
        "ANEXOS": anexos,
        "HR": hr,
        "BOLSAS": bolsas,
        "MARCA": marca,
        "CLASE": clase,
        "DESCRIPCION": descripcion,
        "DETALLE_CANTIDADES": {
            "SUMATORIA": sumatoria,
            "FULL": cantidadFull,
            "PROMO": cantidadPromo,
            "COBRO": cantidadCobros,
            "SIN_CONFECCIONAR": cantidadSinConfeccionar
        }
    };

    const jsonContent = document.getElementById('jsonContent');
    const saveBtn = document.getElementById('saveBtn');
    
    jsonContent.textContent = JSON.stringify(jsonData, null, 2);
    saveBtn.style.display = 'inline-block';
    
    // Switch to JSON editor tab
    document.querySelector('[data-tab="json-editor"]').click();
    
    showMessage(`JSON generado exitosamente para OP: ${primerItem.OP}`, 'success', 2000);
}

// Save to Google Sheets
async function saveToSheets() {
    const saveBtn = document.getElementById('saveBtn');
    const jsonContent = document.getElementById('jsonContent');
    
    if (!currentOPData || currentOPData.length === 0) {
        showMessage('No hay datos de OP cargados', 'error', 2000);
        return;
    }

    const confirmed = await showQuickConfirm(
        'Guardar Orden de Producción', 
        '¿Estás seguro de que deseas guardar esta OP en Google Sheets?',
        'Sí, Guardar',
        'Cancelar'
    );
    
    if (!confirmed) return;

    const loading = showQuickLoading('Guardando en Google Sheets...');
    saveBtn.disabled = true;
    saveBtn.innerHTML = '<span class="loading-spinner"></span> Guardando...';

    try {
        const jsonData = JSON.parse(jsonContent.textContent);
        
        // Prepare data to send
        const formData = new URLSearchParams();
        formData.append('action', 'guardarOP');
        formData.append('datos', JSON.stringify(jsonData));
        
        // Use XMLHttpRequest to avoid CORS issues
        const xhr = new XMLHttpRequest();
        
        xhr.open('POST', GAS_URL, true);
        xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
        
        xhr.onload = function() {
            loading.close();
            
            if (xhr.status === 200) {
                try {
                    const response = JSON.parse(xhr.responseText);
                    if (response.success) {
                        showMessage(`OP ${jsonData.A} guardada correctamente`, 'success', 2000);
                        
                        // Update OP status in data2Map to mark as confirmed
                        data2Map.set(jsonData.A, true);
                        
                        // Update visualization if necessary
                        const pendientes = processedData.filter(item => item.ESTADO === 'PENDIENTE');
                        if (pendientes.length === 0) {
                            document.getElementById('pendientesSection').style.display = 'none';
                        } else {
                            setupPendientesSection(pendientes);
                        }
                        
                        // Hide current form and reset
                        document.getElementById('opForm').style.display = 'none';
                        document.getElementById('selectOP').value = '';
                        document.getElementById('saveBtn').style.display = 'none';
                        
                        updateStatus(`OP ${jsonData.A} guardada exitosamente`, 'success');
                        
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
        };
        
        xhr.onerror = function() {
            loading.close();
            showMessage('Error de conexión con Google Apps Script', 'error', 3000);
            saveBtn.disabled = false;
            saveBtn.innerHTML = '<i class="codicon codicon-save"></i> Guardar en Sheets';
        };
        
        xhr.send(formData);
        
    } catch (error) {
        loading.close();
        console.error('Error:', error);
        showMessage('Error: ' + error.message, 'error', 3000);
        saveBtn.disabled = false;
        saveBtn.innerHTML = '<i class="codicon codicon-save"></i> Guardar en Sheets';
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