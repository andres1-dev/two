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

// Variables cámara
let stream = null;
let currentFacingMode = 'environment';
let isScanning = false;
let scannerMode = null;
let html5QrCode = null;
let codeReader = null;

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
const cameraVideo = document.getElementById('cameraVideo');
const scanningOverlay = document.getElementById('scanningOverlay');
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

// Sonidos BIOS
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

// Funcionalidad Cámara con múltiples bibliotecas (CÓDIGO MEJORADO)
async function startCamera(facingMode = 'environment') {
    try {
        scanningOverlay.style.display = 'flex';
        scanningOverlay.innerHTML = '<i class="material-icons" style="margin-right:8px">camera</i> Iniciando cámara...';
        
        // Primero obtener acceso a la cámara
        stream = await navigator.mediaDevices.getUserMedia({
            video: { 
                facingMode: facingMode,
                width: { ideal: 1280 },
                height: { ideal: 720 }
            },
            audio: false
        });
        
        cameraVideo.srcObject = stream;
        currentFacingMode = facingMode;
        
        // Esperar a que el video esté listo
        await new Promise((resolve) => {
            cameraVideo.onloadedmetadata = () => {
                cameraVideo.play();
                resolve();
            };
        });
        
        // Cambiar icono a cámara activa
        document.getElementById('scannerIcon').textContent = 'camera';
        
        // Intentar con diferentes bibliotecas en orden
        if (typeof Quagga !== 'undefined') {
            console.log('Intentando con Quagga2...');
            await startQuaggaScanning(facingMode);
            return;
        }
        
        if (typeof Html5Qrcode !== 'undefined') {
            console.log('Quagga2 no disponible, usando Html5-QRCode...');
            await startHtml5QrCode(facingMode);
            return;
        }
        
        if (typeof ZXing !== 'undefined') {
            console.log('Html5-QRCode no disponible, usando ZXing...');
            await startZXingScanning(facingMode);
            return;
        }
        
        throw new Error('No hay bibliotecas de escaneo disponibles');
        
    } catch (err) {
        console.error('Error accediendo a la cámara:', err);
        scanningOverlay.innerHTML = '<i class="material-icons" style="margin-right:8px;color:#ff6b6b">error</i> Error: ' + err.message;
        setTimeout(() => {
            stopCamera();
            cameraModal.classList.remove('show');
        }, 3000);
    }
}

async function startQuaggaScanning(facingMode) {
    return new Promise((resolve, reject) => {
        if (isScanning) {
            resolve();
            return;
        }
        
        isScanning = true;
        scannerMode = 'quagga';
        scanningOverlay.innerHTML = '<i class="material-icons" style="margin-right:8px">search</i> Escaneando (Quagga2)...';

        const config = {
            inputStream: {
                name: "Live",
                type: "LiveStream",
                target: cameraVideo,
                constraints: {
                    facingMode: facingMode,
                    width: { ideal: 1280 },
                    height: { ideal: 720 }
                }
            },
            decoder: {
                readers: [
                    "code_128_reader",
                    "ean_reader",
                    "ean_8_reader",
                    "code_39_reader",
                    "code_39_vin_reader",
                    "codabar_reader",
                    "upc_reader",
                    "upc_e_reader",
                    "i2of5_reader",
                    "2of5_reader",
                    "code_93_reader"
                ]
            },
            locate: true,
            numOfWorkers: navigator.hardwareConcurrency || 4,
            frequency: 10
        };

        Quagga.init(config, function(err) {
            if (err) {
                console.error('Error inicializando Quagga:', err);
                reject(err);
                return;
            }
            Quagga.start();
            console.log('Quagga2 iniciado correctamente');
            resolve();
        });

        Quagga.onDetected(function(result) {
            if (result && result.codeResult && result.codeResult.code) {
                const code = result.codeResult.code;
                console.log('Código detectado (Quagga2):', code);
                handleScannedCode(code);
            }
        });
    });
}

async function startHtml5QrCode(facingMode) {
    scannerMode = 'html5qrcode';
    isScanning = true;
    scanningOverlay.innerHTML = '<i class="material-icons" style="margin-right:8px">search</i> Escaneando (Html5-QRCode)...';
    
    cameraVideo.style.display = 'none';
    
    const qrReader = document.createElement('div');
    qrReader.id = 'qr-reader';
    qrReader.style.width = '100%';
    qrReader.style.height = '300px';
    cameraVideo.parentElement.appendChild(qrReader);
    
    html5QrCode = new Html5Qrcode("qr-reader");
    
    const config = {
        fps: 10,
        qrbox: { width: 250, height: 250 },
        aspectRatio: 1.0
    };
    
    try {
        await html5QrCode.start(
            { facingMode: facingMode },
            config,
            (decodedText) => {
                console.log('Código detectado (Html5-QRCode):', decodedText);
                handleScannedCode(decodedText);
            },
            (errorMessage) => {
                // Error de escaneo continuo, no es crítico
                console.log('Html5-QRCode escaneando...', errorMessage);
            }
        );
        console.log('Html5-QRCode iniciado correctamente');
    } catch (err) {
        console.error('Error con Html5-QRCode:', err);
        // Limpiar en caso de error
        const qrReader = document.getElementById('qr-reader');
        if (qrReader) qrReader.remove();
        cameraVideo.style.display = 'block';
        throw err;
    }
}

async function startZXingScanning(facingMode) {
    scannerMode = 'zxing';
    isScanning = true;
    scanningOverlay.innerHTML = '<i class="material-icons" style="margin-right:8px">search</i> Escaneando (ZXing)...';
    
    codeReader = new ZXing.BrowserMultiFormatReader();
    
    try {
        const videoInputDevices = await codeReader.listVideoInputDevices();
        let selectedDeviceId = videoInputDevices[0].deviceId;
        
        if (facingMode === 'environment') {
            const backCamera = videoInputDevices.find(device => 
                device.label.toLowerCase().includes('back') || 
                device.label.toLowerCase().includes('rear')
            );
            if (backCamera) {
                selectedDeviceId = backCamera.deviceId;
            }
        }
        
        codeReader.decodeFromVideoDevice(selectedDeviceId, cameraVideo, (result, err) => {
            if (result) {
                console.log('Código detectado (ZXing):', result.text);
                handleScannedCode(result.text);
            }
            if (err && !(err instanceof ZXing.NotFoundException)) {
                console.log('ZXing error:', err);
            }
        });
        
        console.log('ZXing iniciado correctamente');
    } catch (err) {
        console.error('Error con ZXing:', err);
        throw err;
    }
}

function handleScannedCode(code) {
    console.log('Manejando código escaneado:', code);
    searchData(code);
    stopCamera();
    cameraModal.classList.remove('show');
}

function stopCamera() {
    console.log('Deteniendo cámara, modo:', scannerMode);
    
    // Restaurar icono a pistola de escáner
    document.getElementById('scannerIcon').textContent = 'qr_code_scanner';
    
    if (scannerMode === 'quagga' && typeof Quagga !== 'undefined') {
        try {
            Quagga.stop();
            Quagga.offDetected();
            console.log('Quagga detenido');
        } catch (e) {
            console.log('Error deteniendo Quagga:', e);
        }
    }
    
    if (scannerMode === 'html5qrcode' && html5QrCode) {
        try {
            html5QrCode.stop().then(() => {
                html5QrCode.clear();
                const qrReader = document.getElementById('qr-reader');
                if (qrReader) qrReader.remove();
                cameraVideo.style.display = 'block';
                console.log('Html5-QRCode detenido');
            }).catch(e => console.log('Error deteniendo Html5-QRCode:', e));
        } catch (e) {
            console.log('Error deteniendo Html5-QRCode:', e);
        }
        html5QrCode = null;
    }
    
    if (scannerMode === 'zxing' && codeReader) {
        try {
            codeReader.reset();
            console.log('ZXing detenido');
        } catch (e) {
            console.log('Error deteniendo ZXing:', e);
        }
        codeReader = null;
    }
    
    if (stream) {
        stream.getTracks().forEach(track => {
            track.stop();
            console.log('Track de cámara detenido:', track.kind);
        });
        stream = null;
    }
    
    isScanning = false;
    scannerMode = null;
    scanningOverlay.style.display = 'none';
    cameraVideo.srcObject = null;
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
        startCamera();
    }
});

closeCamera.addEventListener('click', () => {
    stopCamera();
    cameraModal.classList.remove('show');
});

switchCamera.addEventListener('click', () => {
    const newFacingMode = currentFacingMode === 'environment' ? 'user' : 'environment';
    stopCamera();
    startCamera(newFacingMode);
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
    console.log('Inicializando aplicación...');
    
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

    console.log('Aplicación iniciada correctamente');
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