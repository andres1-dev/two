// Módulo Manual - EXACTO al código original pero sin foco persistente

// Configuración (igual al original)
const spreadsheetId = '1EDZ3uRjIDe2oi9F88qBNjHxuy5_S1Se4IwIDlS4EsZE';
const sheetName = 'JSON_Result';
const range = 'A:Y';
const apiKey = 'AIzaSyC7hjbRc0TGLgImv8gVZg8tsOeYWgXlPcM';

const headers = ['DOCUMENTO','FECHA','LOTE','REFPROV','DESCRIPCIÓN','REFERENCIA','TIPO','PVP','PRENDA','GENERO','PROVEEDOR','CLASE','FUENTE','NIT','CLIENTE','CANT','FACTURA','SOPORTE','ESTADO','FACTURA_2','FECHA_FACT','CANT_FACTURA','ESTADO','SEMANAS','KEY'];

// Estado (igual al original)
let dataCache = null;
let cacheTimestamp = null;
const CACHE_DURATION = 5 * 60 * 1000;
let isProcessing = false;
let lastCode = '';
let currentEstado = 'PENDIENTE';

// Variables cámara (igual al original)
let stream = null;
let currentFacingMode = 'environment';
let isScanning = false;
let scannerMode = null;
let html5QrCode = null;
let codeReader = null;
let audioContext = null;

// VARIABLES GLOBALES (igual al original)
let zxingReader = null;
let zxingDecodeInterval = null;
let lastDecodeTime = 0;
const DECODE_COOLDOWN = 500;

// Referencias UI (igual al original)
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

// Toggles (igual al original)
const toggles = {
    sound: {el: document.getElementById('toggle-sound'), key: 'pda_sound', default: true},
    auto: {el: document.getElementById('toggle-auto'), key: 'pda_auto', default: true},
    thumb: {el: document.getElementById('toggle-thumb'), key: 'pda_thumb', default: true},
    camera: {el: document.getElementById('toggle-camera'), key: 'pda_camera', default: true},
    focus: {el: document.getElementById('toggle-focus'), key: 'pda_focus', default: true}
};

// Funciones de audio (iguales al original)
function getAudioContext() {
    if (!audioContext) {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioContext.state === 'suspended') {
        audioContext.resume();
    }
    return audioContext;
}

function playSuccessSound() {
    if (!getSetting('pda_sound')) return;
    try {
        const ctx = getAudioContext();
        const osc = ctx.createOscillator();
        const gainNode = ctx.createGain();
        
        osc.connect(gainNode);
        gainNode.connect(ctx.destination);
        
        osc.frequency.value = 800;
        gainNode.gain.value = 0.5;
        
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.1);
    } catch (e) {
        console.log("Error al reproducir sonido de éxito:", e);
    }
}

function playErrorSound() {
    if (!getSetting('pda_sound')) return;
    try {
        const ctx = getAudioContext();
        const osc = ctx.createOscillator();
        const gainNode = ctx.createGain();
        
        osc.connect(gainNode);
        gainNode.connect(ctx.destination);
        
        osc.frequency.value = 300;
        gainNode.gain.value = 0.5;
        
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.3);
    } catch (e) {
        console.log("Error al reproducir sonido de error:", e);
    }
}

function playChimeSound() {
    if (!getSetting('pda_sound')) return;
    try {
        const ctx = getAudioContext();
        const now = ctx.currentTime;
        
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        
        osc.type = 'sine';
        osc.frequency.setValueAtTime(523.25, now);
        osc.frequency.setValueAtTime(659.25, now + 0.1);
        osc.frequency.setValueAtTime(783.99, now + 0.2);
        
        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(0.3, now + 0.05);
        gain.gain.linearRampToValueAtTime(0, now + 0.3);
        
        osc.connect(gain);
        gain.connect(ctx.destination);
        
        osc.start(now);
        osc.stop(now + 0.3);
    } catch (e) {
        console.log("Error al reproducir sonido de carga:", e);
    }
}

function playConfirmArpeggio() {
    if (!getSetting('pda_sound')) return;
    try {
        const ctx = getAudioContext();
        const now = ctx.currentTime;
        
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        
        osc.type = 'sine';
        osc.frequency.setValueAtTime(523.25, now);
        osc.frequency.setValueAtTime(659.25, now + 0.1);
        osc.frequency.setValueAtTime(783.99, now + 0.2);
        
        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(0.4, now + 0.05);
        gain.gain.linearRampToValueAtTime(0, now + 0.3);
        
        osc.connect(gain);
        gain.connect(ctx.destination);
        
        osc.start(now);
        osc.stop(now + 0.3);
    } catch (e) {
        console.log("Error al reproducir sonido de confirmación:", e);
    }
}

// Función initImageZoom (igual al original)
function initImageZoom() {
    const modalImg = document.getElementById('modalImg');
    let currentScale = 1;
    let startDistance = 0;
    
    modalImg.addEventListener('touchstart', function(e) {
        if (e.touches.length === 2) {
            startDistance = Math.hypot(
                e.touches[0].clientX - e.touches[1].clientX,
                e.touches[0].clientY - e.touches[1].clientY
            );
        }
    });
    
    modalImg.addEventListener('touchmove', function(e) {
        if (e.touches.length === 2) {
            e.preventDefault();
            const currentDistance = Math.hypot(
                e.touches[0].clientX - e.touches[1].clientX,
                e.touches[0].clientY - e.touches[1].clientY
            );
            
            if (startDistance > 0) {
                const scale = currentDistance / startDistance;
                currentScale = Math.max(1, Math.min(scale * currentScale, 5));
                
                this.style.transform = `scale(${currentScale})`;
                this.style.cursor = 'zoom-out';
            }
        }
    });
    
    modalImg.addEventListener('touchend', function() {
        startDistance = 0;
    });
    
    modalImg.addEventListener('click', function(e) {
        if (currentScale > 1) {
            e.stopPropagation();
            currentScale = 1;
            this.style.transform = 'scale(1)';
            this.style.cursor = 'zoom-in';
        }
    });
}

// Inicializar toggles (igual al original)
function initToggles() {
    const configHeaderIcon = configHeader.querySelector('.material-icons');
    if (configHeaderIcon) {
        configHeaderIcon.classList.remove('material-icons');
        configHeaderIcon.classList.add('fas', 'fa-cogs');
    }
    
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
            
            // QUITADO: Comportamiento de foco persistente
            // if (t.key === 'pda_focus') {
            //     if (curr) {
            //         qrInput.focus();
            //     } else {
            //         qrInput.blur();
            //     }
            // }
            
            if (t.key === 'pda_auto' && !curr) {
                dataCache = null;
                cacheTimestamp = null;
                updateCacheInfo();
                console.log('🗑️ Caché deshabilitado - Datos limpiados');
            }
            
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

// Cargar datos desde Sheets (igual al original)
async function loadAllData() {
    updateStatus('CARGANDO');
    playChimeSound();
    
    try {
        const cacheEnabled = getSetting('pda_auto');
        
        if (!cacheEnabled) {
            console.log('🔄 Caché deshabilitado - Cargando datos frescos');
            dataCache = null;
            cacheTimestamp = null;
        }
        
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
        playSuccessSound();
        
        return dataCache;
    } catch (e) {
        console.error('Error cargando datos:', e);
        updateStatus('ERROR');
        playErrorSound();
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

// Eventos principales (igual al original)
qrInput.addEventListener('input', function() {
    const v = this.value.trim();
    console.log('Input detectado:', v);
    if (v) {
        searchData(v);
        this.value = ''; // Limpiar inmediatamente para el siguiente escaneo
    }
});

// Configuración colapsable (igual al original)
configHeader.addEventListener('click', function() {
    const isCollapsed = configCard.classList.toggle('collapsed');
    const icon = configHeader.querySelector('.material-icons:last-child');
    icon.textContent = isCollapsed ? 'expand_more' : 'expand_less';
});

// EVENTOS DE CÁMARA (iguales al original)
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

// Modal (igual al original)
closeModal.addEventListener('click', () => {
    modal.classList.remove('show');
    modalImg.src = '';
});

modal.addEventListener('click', (e) => {
    if (e.target === modal) {
        modal.classList.remove('show');
    }
});

// ===== FUNCIONES DE CÁMARA (iguales al original) =====
let cameraPermissionGranted = false;

async function startCamera() {
    try {
        scanningOverlay.style.display = 'flex';
        scanningOverlay.innerHTML = '<i class="fas fa-camera" style="margin-right:8px"></i> Iniciando cámara...';
        
        console.log('=== INICIANDO CÁMARA ===');
        
        let constraints = {
            video: { 
                facingMode: 'environment',
                width: { ideal: 1280 },
                height: { ideal: 720 }
            },
            audio: false
        };
        
        try {
            stream = await navigator.mediaDevices.getUserMedia(constraints);
            console.log('✅ Cámara iniciada con environment');
        } catch (envError) {
            console.log('⚠️ Falló environment, intentando user:', envError);
            constraints.video.facingMode = 'user';
            stream = await navigator.mediaDevices.getUserMedia(constraints);
            console.log('✅ Cámara iniciada con user');
        }
        
        cameraVideo.srcObject = stream;
        
        await new Promise((resolve, reject) => {
            cameraVideo.onloadedmetadata = () => {
                cameraVideo.play().then(resolve).catch(reject);
            };
            cameraVideo.onerror = reject;
            setTimeout(resolve, 1000);
        });
        
        await startZXingScanning();
        
    } catch (err) {
        console.error('❌ Error crítico en cámara:', err);
        handleCameraError(err);
    }
}

function handleCameraError(err) {
    let errorMsg = 'Error desconocido';
    let errorIcon = 'exclamation-triangle';
    let errorColor = '#ff6b6b';
    
    if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        errorMsg = 'Permiso de cámara denegado';
        errorIcon = 'ban';
    } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        errorMsg = 'No se encontró cámara';
        errorIcon = 'video-slash';
    } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
        errorMsg = 'Cámara en uso por otra app';
        errorIcon = 'lock';
    } else if (err.name === 'OverconstrainedError') {
        errorMsg = 'Configuración de cámara no soportada';
        errorIcon = 'cog';
    } else if (err.message.includes('ZXing')) {
        errorMsg = 'ZXing no está cargado';
        errorIcon = 'code';
    } else {
        errorMsg = err.message || 'Error al iniciar cámara';
    }
    
    scanningOverlay.innerHTML = 
        `<div style="text-align:center;color:${errorColor};padding:20px">` +
        `<i class="fas fa-${errorIcon}" style="font-size:48px;margin-bottom:16px"></i>` +
        `<div style="font-size:16px;font-weight:bold;margin-bottom:8px">Error de Cámara</div>` +
        `<div style="font-size:14px;margin-bottom:16px">${errorMsg}</div>` +
        `<div style="font-size:12px;color:#999;line-height:1.6">` +
        `Soluciones:<br>` +
        `• Permite acceso a la cámara<br>` +
        `• Cierra otras apps que la usen<br>` +
        `• Verifica que ZXing esté cargado<br>` +
        `• Recarga la página` +
        `</div>` +
        `</div>`;
    
    setTimeout(() => {
        stopCamera();
        cameraModal.classList.remove('show');
    }, 5000);
}

async function startZXingScanning() {
    scannerMode = 'zxing';
    isScanning = true;
    
    try {
        zxingReader = new ZXing.BrowserMultiFormatReader();
        
        const hints = new Map();
        const formats = [
            ZXing.BarcodeFormat.QR_CODE,
            ZXing.BarcodeFormat.CODE_128,
            ZXing.BarcodeFormat.CODE_39,
            ZXing.BarcodeFormat.CODE_93,
            ZXing.BarcodeFormat.EAN_13,
            ZXing.BarcodeFormat.EAN_8,
            ZXing.BarcodeFormat.UPC_A,
            ZXing.BarcodeFormat.UPC_E,
            ZXing.BarcodeFormat.CODABAR,
            ZXing.BarcodeFormat.ITF,
            ZXing.BarcodeFormat.DATA_MATRIX,
            ZXing.BarcodeFormat.AZTEC,
            ZXing.BarcodeFormat.PDF_417
        ];
        hints.set(ZXing.DecodeHintType.POSSIBLE_FORMATS, formats);
        hints.set(ZXing.DecodeHintType.TRY_HARDER, true);
        hints.set(ZXing.DecodeHintType.CHARACTER_SET, 'UTF-8');
        
        zxingReader.hints = hints;
        zxingReader.timeBetweenScansMillis = 150;
        zxingReader.timeBetweenDecodingAttempts = 100;
        
        const videoInputDevices = await zxingReader.listVideoInputDevices();
        console.log('📷 Cámaras disponibles:', videoInputDevices.length);
        
        let selectedDeviceId = videoInputDevices[0]?.deviceId;
        
        const backCamera = videoInputDevices.find(device => {
            const label = device.label.toLowerCase();
            return label.includes('back') || 
                   label.includes('rear') || 
                   label.includes('trasera') || 
                   label.includes('environment') ||
                   label.includes('posterior');
        });
        
        if (backCamera) {
            selectedDeviceId = backCamera.deviceId;
            console.log('✅ Cámara trasera seleccionada:', backCamera.label);
        } else {
            console.log('⚠️ Usando cámara por defecto');
        }
        
        scanningOverlay.innerHTML = 
            '<div style="text-align:center">' +
            '<i class="fas fa-qrcode" style="font-size:32px;margin-bottom:12px;animation:pulse 2s infinite"></i>' +
            '<div style="font-size:14px;font-weight:600">Escaneando...</div>' +
            '<div style="font-size:12px;margin-top:8px;color:#999">QR + Barcodes + 2D Codes</div>' +
            '</div>';
        
        await zxingReader.decodeFromVideoDevice(
            selectedDeviceId,
            cameraVideo,
            (result, error) => {
                if (result) {
                    const now = Date.now();
                    if (now - lastDecodeTime < DECODE_COOLDOWN) {
                        return;
                    }
                    lastDecodeTime = now;
                    
                    const code = result.getText();
                    const format = result.getBarcodeFormat();
                    const formatName = ZXing.BarcodeFormat[format];
                    
                    console.log('✅ CÓDIGO DETECTADO:');
                    console.log('  Contenido:', code);
                    console.log('  Formato:', formatName);
                    
                    scanningOverlay.innerHTML = 
                        '<div style="text-align:center;color:#4ade80">' +
                        '<i class="fas fa-check-circle" style="font-size:48px;margin-bottom:12px"></i>' +
                        '<div style="font-size:16px;font-weight:bold">¡Escaneado!</div>' +
                        '<div style="font-size:13px;margin-top:8px">' + formatName + '</div>' +
                        '</div>';
                    
                    setTimeout(() => {
                        handleScannedCode(code);
                    }, 300);
                }
                
                if (error && !(error instanceof ZXing.NotFoundException)) {
                    console.log('Error de decodificación:', error.message);
                }
            }
        );
        
        console.log('✅ ZXing iniciado correctamente');
        
        setTimeout(() => {
            if (isScanning) {
                scanningOverlay.style.display = 'none';
            }
        }, 2000);
        
    } catch (err) {
        console.error('❌ Error iniciando ZXing:', err);
        throw err;
    }
}

function handleScannedCode(code) {
    console.log('🎯 Procesando código escaneado:', code);
    searchData(code);
    stopCamera();
    cameraModal.classList.remove('show');
}

function stopCamera() {
    console.log('🛑 Deteniendo cámara, modo:', scannerMode);
    
    if (scannerMode === 'zxing' && zxingReader) {
        try {
            zxingReader.reset();
            console.log('✅ ZXing reseteado');
        } catch (e) {
            console.log('⚠️ Error reseteando ZXing:', e);
        }
        zxingReader = null;
    }
    
    if (zxingDecodeInterval) {
        clearInterval(zxingDecodeInterval);
        zxingDecodeInterval = null;
    }
    
    if (stream) {
        stream.getTracks().forEach(track => {
            track.stop();
            console.log('✅ Track detenido:', track.kind);
        });
        stream = null;
    }
    
    if (cameraVideo) {
        cameraVideo.srcObject = null;
        cameraVideo.load();
    }
    
    isScanning = false;
    scannerMode = null;
    lastDecodeTime = 0;
    scanningOverlay.style.display = 'none';
}

// Ocultar botón de cambiar cámara completamente
switchCamera.style.display = 'none';

// Actualizar estado visual (igual al original)
function updateStatus(estado) {
    currentEstado = estado || 'PENDIENTE';
    statusText.textContent = currentEstado;
    
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

async function checkCameraPermissions() {
    try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const hasCameraAccess = devices.some(device => 
            device.kind === 'videoinput' && device.label !== ''
        );
        
        if (hasCameraAccess) {
            cameraPermissionGranted = true;
            console.log('✅ Permisos de cámara ya concedidos');
        }
    } catch (error) {
        console.log('ℹ️ Aún no hay permisos de cámara');
    }
}

// Inicialización (igual al original pero SIN foco automático)
document.addEventListener('DOMContentLoaded', function() {
    console.log('Inicializando aplicación Manual...');
    
    initToggles();
    checkCameraPermissions();
    loadAllData();
    initAudioActivator();
    setInterval(updateCacheInfo, 30000);
    initImageZoom();

    // Mostrar/ocultar botón cámara según configuración
    openCamera.style.display = getSetting('pda_camera') ? 'flex' : 'none';

    // QUITADO: Manejar foco persistente según configuración
    // if (getSetting('pda_focus')) {
    //     qrInput.focus();
    //     
    //     document.addEventListener('click', function() {
    //         if (getSetting('pda_focus')) {
    //             qrInput.focus();
    //         }
    //     });
    // }

    // Estado inicial
    updateStatus('PENDIENTE');

    console.log('Aplicación Manual iniciada correctamente');
});

// Audio activator (igual al original)
function initAudioActivator() {
    const audioActivator = document.getElementById('audioActivator');
    
    if (/iPhone|iPad|iPod/i.test(navigator.userAgent) || 
        (navigator.standalone !== undefined && navigator.standalone)) {
        audioActivator.style.display = 'block';
        
        audioActivator.addEventListener('click', function() {
            const ctx = new (window.AudioContext || window.webkitAudioContext)();
            
            const oscillator = ctx.createOscillator();
            const gainNode = ctx.createGain();
            gainNode.gain.value = 0;
            oscillator.connect(gainNode);
            gainNode.connect(ctx.destination);
            
            oscillator.start();
            setTimeout(() => {
                oscillator.stop();
                ctx.close();
            }, 100);
            
            window.audioActivated = true;
            
            playSuccessSound();
            
            this.style.display = 'none';
            
            console.log('✅ Audio activado en iOS PWA');
        });
    } else {
        audioActivator.style.display = 'none';
        getAudioContext();
    }
}

// Service Worker Registration (igual al original)
if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1')) {
    window.addEventListener('load', function() {
        navigator.serviceWorker.register('sw.js')
            .then(function(registration) {
                console.log('Service Worker registrado con éxito:', registration.scope);
            })
            .catch(function(error) {
                console.log('Error registrando Service Worker:', error);
            });
    });
} else {
    console.log('Service Worker no registrado - Entorno no compatible:', location.protocol);
}