// Configuración
const spreadsheetId = '1EDZ3uRjIDe2oi9F88qBNjHxuy5_S1Se4IwIDlS4EsZE';
const sheetName = 'JSON_Result';
const range = 'A:Y';
const apiKey = 'AIzaSyC7hjbRc0TGLgImv8gVZg8tsOeYWgXlPcM';

const headers = ['DOCUMENTO','FECHA','LOTE','REFPROV','DESCRIPCIÓN','REFERENCIA','TIPO','PVP','PRENDA','GENERO','PROVEEDOR','CLASE','FUENTE','NIT','CLIENTE','CANT','FACTURA','SOPORTE','ESTADO','FACTURA_2','FECHA_FACT','CANT_FACTURA','ESTADO','SEMANAS','KEY'];

// Estado
let dataCache = null;
let cacheTimestamp = null;
const CACHE_DURATION = 5 * 60 * 1000;
let isProcessing = false;
let lastCode = '';
let currentEstado = 'PENDIENTE';

// Referencias UI
const qrInput = document.getElementById('qrInput');
const lastScanned = document.getElementById('lastScanned');
const weekNumber = document.getElementById('weekNumber');
const resultArea = document.getElementById('resultArea');
const cacheCount = document.getElementById('cacheCount');
const cacheAge = document.getElementById('cacheAge');
const pillStatus = document.getElementById('pill-status');
const statusText = document.getElementById('status-text');
const pillCount = document.getElementById('pill-count');
const modal = document.getElementById('modal');
const modalImg = document.getElementById('modalImg');
const closeModal = document.querySelector('.close-modal');
const cameraModal = document.getElementById('cameraModal');
const openCamera = document.getElementById('openCamera');
const closeCamera = document.getElementById('closeCamera');
const switchCamera = document.getElementById('switchCamera');
const configCard = document.getElementById('configCard');
const configHeader = document.getElementById('configHeader');

// Toggles
const toggles = {
    sound: {el: document.getElementById('toggle-sound'), key: 'pda_sound', default: true},
    auto: {el: document.getElementById('toggle-auto'), key: 'pda_auto', default: true},
    thumb: {el: document.getElementById('toggle-thumb'), key: 'pda_thumb', default: true},
    camera: {el: document.getElementById('toggle-camera'), key: 'pda_camera', default: true},
    focus: {el: document.getElementById('toggle-focus'), key: 'pda_focus', default: true}
};

// Sonidos BIOS (los mismos que antes)
function playSuccessSound() {
    if (!getSetting('pda_sound')) return;
    try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)(); 
        const osc = ctx.createOscillator(); 
        const gainNode = ctx.createGain(); 
        osc.type = "sine"; 
        osc.frequency.value = 800; 
        gainNode.gain.value = 1; 
        osc.connect(gainNode); 
        gainNode.connect(ctx.destination); 
        osc.start(); 
        osc.stop(ctx.currentTime + 0.25);
    } catch (e) {
        console.log("Error al reproducir sonido de éxito:", e);
    }
}

function playErrorSound() {
    if (!getSetting('pda_sound')) return;
    try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)(); 
        const osc = ctx.createOscillator(); 
        const gainNode = ctx.createGain(); 
        osc.type = "sawtooth"; 
        osc.frequency.setValueAtTime(300, ctx.currentTime); 
        osc.frequency.exponentialRampToValueAtTime(80, ctx.currentTime + 0.5); 
        gainNode.gain.value = 0.8; 
        gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5); 
        osc.connect(gainNode); 
        gainNode.connect(ctx.destination); 
        osc.start(); 
        osc.stop(ctx.currentTime + 0.5);
    } catch (e) {
        console.log("Error al reproducir sonido de error:", e);
    }
}

function playChimeSound() {
    if (!getSetting('pda_sound')) return;
    try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const now = ctx.currentTime;
        const freqs = [880, 1320, 1760];
        freqs.forEach((f, i) => {
            const osc = ctx.createOscillator();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(f, now + i * 0.1);
            const gain = ctx.createGain();
            gain.gain.setValueAtTime(0.0001, now + i * 0.1);
            gain.gain.exponentialRampToValueAtTime(0.9, now + i * 0.1 + 0.02);
            gain.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.1 + 0.6);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(now + i * 0.1);
            osc.stop(now + i * 0.1 + 0.6);
        });
    } catch (e) {
        console.log("Error al reproducir sonido de carga (chime):", e);
    }
}

function playConfirmArpeggio() {
    if (!getSetting('pda_sound')) return;
    try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const now = ctx.currentTime;
        const freqs = [523, 659, 784]; // C5, E5, G5
        freqs.forEach((f, i) => {
            const osc = ctx.createOscillator();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(f, now + i * 0.12);
            const gain = ctx.createGain();
            gain.gain.setValueAtTime(0.0001, now + i * 0.12);
            gain.gain.exponentialRampToValueAtTime(0.8, now + i * 0.12 + 0.01);
            gain.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.12 + 0.4);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(now + i * 0.12);
            osc.stop(now + i * 0.12 + 0.4);
        });
    } catch (e) {
        console.log("Error al reproducir sonido de confirmación:", e);
    }
}

// Actualizar estado visual
function updateStatus(estado) {
    currentEstado = estado || 'PENDIENTE';
    statusText.textContent = currentEstado;
    
    // Actualizar clases según el estado
    pillStatus.className = 'pill ';
    if (estado === 'ENTREGADO') {
        pillStatus.classList.add('success');
    } else if (estado === 'CANCELADO') {
        pillStatus.classList.add('danger');
    } else if (estado === 'PENDIENTE') {
        pillStatus.classList.add('info');
    } else {
        pillStatus.classList.add('warning');
    }
}

// Inicializar toggles
function initToggles() {
    Object.values(toggles).forEach(t => {
        const on = JSON.parse(localStorage.getItem(t.key) ?? JSON.stringify(t.default));
        if (on) t.el.classList.add('on');
        else t.el.classList.remove('on');
        
        t.el.addEventListener('click', () => {
            const curr = t.el.classList.toggle('on');
            localStorage.setItem(t.key, curr);
            
            if (t.key === 'pda_camera') {
                openCamera.style.display = curr ? 'flex' : 'none';
            }
            
            if (t.key === 'pda_focus') {
                if (curr) {
                    qrInput.focus();
                } else {
                    qrInput.blur();
                }
            }
            
            // Reproducir sonido de confirmación al cambiar configuración
            playConfirmArpeggio();
        });
    });
}

function getSetting(k) {
    return JSON.parse(localStorage.getItem(k) ?? JSON.stringify(true));
}

function extractWeekNumber(weekText) {
    if (!weekText) return '—';
    const match = weekText.toString().match(/\d+/);
    return match ? match[0] : weekText;
}

// Cargar datos desde Sheets
async function loadAllData() {
    updateStatus('CARGANDO');
    try {
        const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${sheetName}!${range}?key=${apiKey}`;
        const response = await fetch(url);
        
        if (!response.ok) throw new Error('Error: ' + response.status);
        
        const data = await response.json();
        
        if (!data.values || data.values.length < 2) throw new Error('Sin datos');
        
        const rows = data.values.slice(1);
        dataCache = {};
        
        rows.forEach(row => {
            if (row.length > 24 && row[24]) {
                const key = row[24].toString().trim();
                const rowData = {};
                headers.forEach((h, i) => rowData[h] = row[i] || '');
                dataCache[key] = rowData;
            }
        });
        
        cacheTimestamp = Date.now();
        updateCacheInfo();
        updateStatus('PENDIENTE');
        pillCount.innerHTML = `<i class="fas fa-database"></i> ${Object.keys(dataCache).length}`;
        
        // Reproducir sonido de carga
        playChimeSound();
        
        return dataCache;
    } catch (e) {
        console.error('Error cargando datos:', e);
        updateStatus('ERROR');
        return null;
    }
}

function isCacheExpired() {
    return !cacheTimestamp || (Date.now() - cacheTimestamp) > CACHE_DURATION;
}

function updateCacheInfo() {
    if (dataCache && cacheTimestamp) {
        cacheCount.innerText = Object.keys(dataCache).length;
        const age = Math.floor((Date.now() - cacheTimestamp) / 1000 / 60);
        cacheAge.innerText = age + ' min';
    }
}

async function searchData(val) {
    if (isProcessing || val === lastCode) return;
    
    isProcessing = true;
    lastCode = val;
    updateStatus('BUSCANDO');
    
    try {
        if (!dataCache || isCacheExpired()) {
            if (getSetting('pda_auto')) await loadAllData();
        }
        
        const found = dataCache ? dataCache[val] : null;
        
        if (found) {
            renderResult(found);
            updateStatus(found.ESTADO || 'ENCONTRADO');
            playSuccessSound();
        } else {
            resultArea.innerHTML = `<div style="padding:20px;text-align:center;color:var(--muted)">No se encontró: ${val}</div>`;
            updateStatus('NO ENCONTRADO');
            playErrorSound();
        }
    } catch (e) {
        console.error('Error en búsqueda:', e);
        updateStatus('ERROR');
    } finally {
        isProcessing = false;
        setTimeout(() => {
            qrInput.value = '';
            lastScanned.innerText = val;
        }, 120);
    }
}

function renderResult(row) {
    weekNumber.innerText = extractWeekNumber(row.SEMANAS);
    const estado = (row.ESTADO || 'PENDIENTE').toUpperCase();
    updateStatus(estado);
    
    let html = `
        <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:12px;margin-bottom:16px;">
            <div style="flex:1;min-width:0;">
                <div style="font-weight:900;font-size:16px;line-height:1.2">${row.DOCUMENTO || 'Sin documento'} — ${row.REFERENCIA || 'Sin referencia'}</div>
                <div style="color:var(--muted);font-size:13px;margin-top:6px">${row.DESCRIPCIÓN || ''}</div>
            </div>
        </div>
    `;

    html += '<div class="priority">';
    const priorityFields = [
        { label: 'CLASE', value: row.CLASE || '—' },
        { label: 'GÉNERO', value: row.GENERO || '—' },
        { label: 'PRENDA', value: row.PRENDA || '—' },
        { label: 'PROVEEDOR', value: row.PROVEEDOR || '—' }
    ];
    
    priorityFields.forEach(field => {
        html += `
            <div class="mini">
                <div class="mini-label">${field.label}</div>
                <div class="mini-value">${field.value}</div>
            </div>
        `;
    });
    html += '</div>';

    if (row.SOPORTE && getSetting('pda_thumb')) {
        html += `<img src="${row.SOPORTE}" class="support-thumb" id="supportThumb" alt="Soporte">`;
    }

    html += '<div class="detail-grid">';
    const detailFields = ['DOCUMENTO', 'FECHA', 'LOTE', 'REFPROV', 'TIPO', 'PVP', 'CANT', 'FACTURA', 'FECHA_FACT', 'CLIENTE'];
    
    detailFields.forEach(k => {
        if (row[k]) {
            html += `
                <div class="detail-item">
                    <div class="detail-label">${k}</div>
                    <div class="detail-value">${row[k]}</div>
                </div>
            `;
        }
    });
    html += '</div>';

    resultArea.innerHTML = html;

    const thumb = document.getElementById('supportThumb');
    if (thumb) {
        thumb.addEventListener('click', () => {
            modalImg.src = thumb.src;
            modal.classList.add('show');
        });
    }
}

// Eventos principales
qrInput.addEventListener('input', function() {
    const v = this.value.trim();
    console.log('Input detectado:', v);
    if (v) searchData(v);
});

// Escuchar eventos de código escaneado desde camera-scanner.js
document.addEventListener('codeScanned', function(e) {
    const code = e.detail.code;
    console.log('Código recibido desde cámara:', code, 'con biblioteca:', e.detail.library);
    searchData(code);
});

// Configuración colapsable
configHeader.addEventListener('click', function() {
    const isCollapsed = configCard.classList.toggle('collapsed');
    const icon = configHeader.querySelector('.material-icons:last-child');
    icon.textContent = isCollapsed ? 'expand_more' : 'expand_less';
});

// Cámara events
openCamera.addEventListener('click', () => {
    if (getSetting('pda_camera')) {
        cameraModal.classList.add('show');
        if (window.cameraScanner) {
            window.cameraScanner.startCamera();
        }
    }
});

closeCamera.addEventListener('click', () => {
    if (window.cameraScanner) {
        window.cameraScanner.stopCamera();
    }
    cameraModal.classList.remove('show');
});

switchCamera.addEventListener('click', () => {
    if (window.cameraScanner) {
        window.cameraScanner.switchCamera();
    }
});

// Modal
closeModal.addEventListener('click', () => {
    modal.classList.remove('show');
    modalImg.src = '';
});

modal.addEventListener('click', (e) => {
    if (e.target === modal) {
        modal.classList.remove('show');
    }
});

// Inicialización
document.addEventListener('DOMContentLoaded', function() {
    initToggles();
    loadAllData();
    setInterval(updateCacheInfo, 30000);

    // Mostrar/ocultar botón cámara según configuración
    openCamera.style.display = getSetting('pda_camera') ? 'flex' : 'none';

    // Manejar foco persistente según configuración
    if (getSetting('pda_focus')) {
        qrInput.focus();
        
        // Reenfocar cuando se pierde el foco
        document.addEventListener('click', function() {
            if (getSetting('pda_focus')) {
                qrInput.focus();
            }
        });
    }

    // Estado inicial
    updateStatus('PENDIENTE');

    // Debug
    console.log('Aplicación iniciada correctamente');
    console.log('Input disponible (oculto):', qrInput);
});

// Service Worker Registration
if ('serviceWorker' in navigator) {
    window.addEventListener('load', function() {
        navigator.serviceWorker.register('sw.js')
            .then(function(registration) {
                console.log('Service Worker registrado con éxito:', registration.scope);
            })
            .catch(function(error) {
                console.log('Error registrando Service Worker:', error);
            });
    });
}