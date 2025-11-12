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
let audioContext = null;

// VARIABLES GLOBALES - Agregar estas al inicio del archivo
let zxingReader = null;
let zxingDecodeInterval = null;
let lastDecodeTime = 0;
const DECODE_COOLDOWN = 500; // ms entre escaneos

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

// Agregar esta función después de las variables globales
function clearResultsImmediately() {
    console.log('🧹 Limpiando resultados inmediatamente');
    
    // Limpiar área de resultados
    resultArea.innerHTML = `
        <div style="padding:30px 20px;text-align:center;color:var(--muted)">
            <i class="material-icons" style="font-size:32px;margin-bottom:12px;opacity:0.5">qr_code_2</i>
            <div>Escanee un código QR para ver los detalles</div>
        </div>
    `;
    
    // Resetear semana
    weekNumber.innerText = '—';
    
    // Resetear último escaneo
    lastScanned.innerText = '—';
    
    // Forzar re-render del DOM
    resultArea.style.display = 'none';
    setTimeout(() => {
        resultArea.style.display = 'block';
    }, 10);
}

function getAudioContext() {
    if (!audioContext) {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioContext.state === 'suspended') {
        audioContext.resume();
    }
    return audioContext;
}

// Reemplazar todas las funciones de sonido:
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
        
        // Sonido simple de carga
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        
        osc.type = 'sine';
        osc.frequency.setValueAtTime(523.25, now); // Do
        osc.frequency.setValueAtTime(659.25, now + 0.1); // Mi
        osc.frequency.setValueAtTime(783.99, now + 0.2); // Sol
        
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
        osc.frequency.setValueAtTime(523.25, now); // Do
        osc.frequency.setValueAtTime(659.25, now + 0.1); // Mi  
        osc.frequency.setValueAtTime(783.99, now + 0.2); // Sol
        
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

/*
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

// Reemplazar la función playChimeSound
function playChimeSound() {
    if (!getSetting('pda_sound')) return;
    try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const now = ctx.currentTime;
        
        // Sonido más simple y confiable
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        
        osc.type = 'sine';
        osc.frequency.setValueAtTime(440, now);
        osc.frequency.setValueAtTime(880, now + 0.1);
        
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
}*/

// Agregar funcionalidad de zoom táctil al modal de imagen
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
    
    // Click para resetear zoom
    modalImg.addEventListener('click', function(e) {
        if (currentScale > 1) {
            e.stopPropagation();
            currentScale = 1;
            this.style.transform = 'scale(1)';
            this.style.cursor = 'zoom-in';
        }
    });
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

// ============================================
// FUNCIÓN INICIAR CÁMARA MODIFICADA
// ============================================
let cameraPermissionGranted = false;

// REEMPLAZAR LA FUNCIÓN startCamera()
async function startCamera() {
    try {
        scanningOverlay.style.display = 'flex';
        scanningOverlay.innerHTML = '<i class="fas fa-camera" style="margin-right:8px"></i> Iniciando cámara...';
        
        console.log('=== INICIANDO CÁMARA iOS PWA ===');
        
        // En iOS PWA, usar un enfoque más simple
        let constraints = {
            video: { 
                facingMode: 'environment',
                width: { ideal: 1280 },
                height: { ideal: 720 }
            },
            audio: false
        };
        
        // Intentar primero sin 'exact' que causa problemas en iOS
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
        
        // Esperar a que el video esté listo
        await new Promise((resolve, reject) => {
            cameraVideo.onloadedmetadata = () => {
                cameraVideo.play().then(resolve).catch(reject);
            };
            cameraVideo.onerror = reject;
            setTimeout(resolve, 1000); // Timeout más corto para iOS
        });
        
        await startZXingScanning();
        
    } catch (err) {
        console.error('❌ Error crítico en iOS:', err);
        handleCameraError(err);
    }
}

function isIOSPWA() {
    return (
        /iPhone|iPad|iPod/i.test(navigator.userAgent) && 
        navigator.standalone !== undefined && 
        navigator.standalone
    );
}

function isSafari() {
    return /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
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

async function diagnosticZXing() {
    console.log('=== DIAGNÓSTICO ZXING ===');
    
    if (typeof ZXing === 'undefined') {
        console.error('❌ ZXing NO está cargado!');
        console.error('Agrega: <script src="https://unpkg.com/@zxing/library@latest"></script>');
        return false;
    }
    
    console.log('✅ ZXing cargado correctamente');
    console.log('Versión:', ZXing.version || 'No disponible');
    
    // Listar formatos disponibles
    console.log('Formatos disponibles:');
    Object.keys(ZXing.BarcodeFormat).forEach(format => {
        if (typeof ZXing.BarcodeFormat[format] === 'number') {
            console.log(`  - ${format}: ${ZXing.BarcodeFormat[format]}`);
        }
    });
    
    // Verificar MediaDevices API
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        console.error('❌ getUserMedia no soportado en este navegador');
        return false;
    }
    
    console.log('✅ getUserMedia soportado');
    
    // Listar cámaras
    try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const cameras = devices.filter(d => d.kind === 'videoinput');
        console.log(`✅ ${cameras.length} cámara(s) disponible(s):`);
        cameras.forEach((cam, i) => {
            console.log(`  ${i + 1}. ${cam.label || 'Cámara sin nombre'}`);
        });
    } catch (e) {
        console.log('⚠️ No se pueden listar cámaras (necesita permisos)');
    }
    
    return true;
}

// ============================================
// EJECUTAR DIAGNÓSTICO AL CARGAR
// ============================================
setTimeout(() => {
    diagnosticZXing();
}, 1000);


// ============================================
// FUNCIÓN ZXING CON TODAS LAS OPCIONES
// ============================================
async function startZXingScanning() {
    scannerMode = 'zxing';
    isScanning = true;
    
    try {
        // CREAR READER CON CONFIGURACIÓN COMPLETA
        zxingReader = new ZXing.BrowserMultiFormatReader();
        
        // ===== CONFIGURAR HINTS (Opciones de decodificación) =====
        const hints = new Map();
        
        // 1. FORMATOS SOPORTADOS (todos los disponibles)
        const formats = [
            ZXing.BarcodeFormat.QR_CODE,           // QR Codes
            ZXing.BarcodeFormat.CODE_128,          // Code 128 (común en logística)
            ZXing.BarcodeFormat.CODE_39,           // Code 39
            ZXing.BarcodeFormat.CODE_93,           // Code 93
            ZXing.BarcodeFormat.EAN_13,            // EAN-13 (productos retail)
            ZXing.BarcodeFormat.EAN_8,             // EAN-8
            ZXing.BarcodeFormat.UPC_A,             // UPC-A (productos USA)
            ZXing.BarcodeFormat.UPC_E,             // UPC-E (compacto)
            ZXing.BarcodeFormat.CODABAR,           // Codabar (farmacia, logística)
            ZXing.BarcodeFormat.ITF,               // Interleaved 2 of 5
            ZXing.BarcodeFormat.RSS_14,            // GS1 DataBar
            ZXing.BarcodeFormat.RSS_EXPANDED,      // GS1 DataBar Expandido
            ZXing.BarcodeFormat.DATA_MATRIX,       // Data Matrix (2D)
            ZXing.BarcodeFormat.AZTEC,             // Aztec Code (2D)
            ZXing.BarcodeFormat.PDF_417,           // PDF417 (2D, documentos)
            ZXing.BarcodeFormat.MAXICODE           // MaxiCode (UPS)
        ];
        hints.set(ZXing.DecodeHintType.POSSIBLE_FORMATS, formats);
        
        // 2. TRY_HARDER - Más exhaustivo pero más lento
        hints.set(ZXing.DecodeHintType.TRY_HARDER, true);
        
        // 3. PURE_BARCODE - Si es una imagen limpia sin ruido
        // hints.set(ZXing.DecodeHintType.PURE_BARCODE, false);
        
        // 4. CHARACTER_SET - Encoding de caracteres
        hints.set(ZXing.DecodeHintType.CHARACTER_SET, 'UTF-8');
        
        // 5. ASSUME_GS1 - Para códigos GS1
        // hints.set(ZXing.DecodeHintType.ASSUME_GS1, false);
        
        // 6. RETURN_CODABAR_START_END - Incluir start/stop en Codabar
        // hints.set(ZXing.DecodeHintType.RETURN_CODABAR_START_END, false);
        
        // Aplicar hints al reader
        zxingReader.hints = hints;
        
        // ===== CONFIGURAR TIMINGS =====
        zxingReader.timeBetweenScansMillis = 150; // Tiempo entre intentos de escaneo
        zxingReader.timeBetweenDecodingAttempts = 100; // Tiempo entre decodificaciones
        
        // Listar cámaras disponibles
        const videoInputDevices = await zxingReader.listVideoInputDevices();
        console.log('📷 Cámaras disponibles:', videoInputDevices.length);
        
        videoInputDevices.forEach((device, index) => {
            console.log(`  ${index}: ${device.label} (${device.deviceId})`);
        });
        
        // Seleccionar cámara trasera
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
        
        // ===== MODO DE ESCANEO CONTINUO =====
        scanningOverlay.innerHTML = 
            '<div style="text-align:center">' +
            '<i class="fas fa-qrcode" style="font-size:32px;margin-bottom:12px;animation:pulse 2s infinite"></i>' +
            '<div style="font-size:14px;font-weight:600">Escaneando...</div>' +
            '<div style="font-size:12px;margin-top:8px;color:#999">QR + Barcodes + 2D Codes</div>' +
            '</div>';
        
        // Iniciar decodificación continua
        await zxingReader.decodeFromVideoDevice(
            selectedDeviceId,
            cameraVideo,
            (result, error) => {
                if (result) {
                    // Evitar escaneos duplicados rápidos
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
                    console.log('  Puntos:', result.getResultPoints()?.length || 0);
                    
                    // Feedback visual
                    scanningOverlay.innerHTML = 
                        '<div style="text-align:center;color:#4ade80">' +
                        '<i class="fas fa-check-circle" style="font-size:48px;margin-bottom:12px"></i>' +
                        '<div style="font-size:16px;font-weight:bold">¡Escaneado!</div>' +
                        '<div style="font-size:13px;margin-top:8px">' + formatName + '</div>' +
                        '</div>';
                    
                    // Procesar código
                    setTimeout(() => {
                        handleScannedCode(code);
                    }, 300);
                }
                
                // Los errores durante el escaneo son normales
                if (error && !(error instanceof ZXing.NotFoundException)) {
                    console.log('Error de decodificación:', error.message);
                }
            }
        );
        
        console.log('✅ ZXing iniciado correctamente');
        
        // Ocultar overlay después de 2 segundos
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
    // Limpiar antes de buscar
    clearResultsImmediately();
    searchData(code);
    stopCamera();
    cameraModal.classList.remove('show');
    // Re-enfocar después de cerrar cámara
    setTimeout(forceFocus, 200);
}

function stopCamera() {
    console.log('🛑 Deteniendo cámara, modo:', scannerMode);
    
    // Limpiar ZXing
    if (scannerMode === 'zxing' && zxingReader) {
        try {
            zxingReader.reset();
            console.log('✅ ZXing reseteado');
        } catch (e) {
            console.log('⚠️ Error reseteando ZXing:', e);
        }
        zxingReader = null;
    }
    
    // Limpiar intervalo si existe
    if (zxingDecodeInterval) {
        clearInterval(zxingDecodeInterval);
        zxingDecodeInterval = null;
    }
    
    // Detener stream
    if (stream) {
        stream.getTracks().forEach(track => {
            track.stop();
            console.log('✅ Track detenido:', track.kind);
        });
        stream = null;
    }
    
    // Limpiar video
    if (cameraVideo) {
        cameraVideo.srcObject = null;
        cameraVideo.load();
    }
    
    // Resetear variables
    isScanning = false;
    scannerMode = null;
    lastDecodeTime = 0;
    scanningOverlay.style.display = 'none';
}

// Ocultar botón de cambiar cámara completamente
switchCamera.style.display = 'none';

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

async function checkCameraPermissions() {
    try {
        // Verificar si ya tenemos permisos
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

// Inicializar toggles
function initToggles() {
    // Reemplazar íconos Material Icons por FontAwesome en los toggles
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
            
            // En la función initToggles, mejorar la parte del foco
            if (t.key === 'pda_focus') {
                if (curr) {
                    setTimeout(forceFocus, 100);
                    
                    // Agregar listeners adicionales cuando se activa
                    document.addEventListener('visibilitychange', function() {
                        if (!document.hidden && getSetting('pda_focus')) {
                            setTimeout(forceFocus, 100);
                        }
                    });
                } else {
                    qrInput.blur();
                }
            }
            
            // Si se desactiva el caché, limpiar datos actuales
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

// Cargar datos desde Sheets
async function loadAllData() {
    updateStatus('CARGANDO');
    
    // Reproducir sonido de carga al inicio
    playChimeSound();
    
    try {
        // Verificar si el caché está deshabilitado
        const cacheEnabled = getSetting('pda_auto');
        
        if (!cacheEnabled) {
            console.log('🔄 Caché deshabilitado - Cargando datos frescos');
            // Forzar recarga ignorando caché
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
        
        // Reproducir sonido de éxito
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
    if (isProcessing) return;
    
    // LIMPIAR INMEDIATAMENTE antes de procesar
    clearResultsImmediately();
    
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
            // ENFOCAR INMEDIATAMENTE después del procesamiento
            forceFocus();
        }, 50);
    }
}

// Agregar esta función para foco extremo
function forceFocus() {
    if (!getSetting('pda_focus')) return;
    
    console.log('🎯 Forzando foco al input');
    
    // Método 1: Enfocar directamente
    qrInput.focus();
    
    // Método 2: Timeout adicional para casos difíciles
    setTimeout(() => {
        qrInput.focus();
    }, 100);
    
    // Método 3: Para iOS/Safari - crear y destruir un input temporal
    if (/iPhone|iPad|iPod/i.test(navigator.userAgent)) {
        setTimeout(() => {
            const tempInput = document.createElement('input');
            tempInput.style.position = 'absolute';
            tempInput.style.opacity = '0';
            tempInput.style.height = '0';
            tempInput.style.fontSize = '16px'; // Previene zoom
            document.body.appendChild(tempInput);
            tempInput.focus();
            
            setTimeout(() => {
                qrInput.focus();
                document.body.removeChild(tempInput);
            }, 50);
        }, 150);
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

// REEMPLAZAR el event listener existente del qrInput
qrInput.addEventListener('input', function() {
    const v = this.value.trim();
    console.log('Input detectado:', v);
    if (v) {
        // Limpiar inmediatamente antes de buscar
        this.value = '';
        searchData(v);
    }
});

// AGREGAR event listener para keydown (captura más rápida)
qrInput.addEventListener('keydown', function(e) {
    // Si presiona Enter manualmente
    if (e.key === 'Enter') {
        const v = this.value.trim();
        if (v) {
            e.preventDefault();
            this.value = '';
            searchData(v);
        }
    }
});

// Configuración colapsable
configHeader.addEventListener('click', function() {
    const isCollapsed = configCard.classList.toggle('collapsed');
    const icon = configHeader.querySelector('.material-icons:last-child');
    icon.textContent = isCollapsed ? 'expand_more' : 'expand_less';
});

// EVENTOS DE CÁMARA - Reemplazar estos eventos
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

// En la sección de inicialización, modificar el evento DOMContentLoaded
document.addEventListener('DOMContentLoaded', function() {
    console.log('Inicializando aplicación...');
    
    initToggles();
    checkCameraPermissions();
    loadAllData();
    initAudioActivator();
    setInterval(updateCacheInfo, 30000);
    initImageZoom();

    // Mostrar/ocultar botón cámara según configuración
    openCamera.style.display = getSetting('pda_camera') ? 'flex' : 'none';

    // FOCO PERSISTENTE EXTREMO
    if (getSetting('pda_focus')) {
        // Enfocar inmediatamente
        setTimeout(() => {
            forceFocus();
        }, 500);
        
        // Múltiples estrategias de re-foco
        document.addEventListener('click', function() {
            if (getSetting('pda_focus')) {
                setTimeout(forceFocus, 10);
            }
        });
        
        document.addEventListener('touchstart', function() {
            if (getSetting('pda_focus')) {
                setTimeout(forceFocus, 10);
            }
        });
        
        // Re-foco periódico por si acaso
        setInterval(() => {
            if (getSetting('pda_focus') && document.activeElement !== qrInput) {
                forceFocus();
            }
        }, 2000);
        
        // Re-foco cuando se cierra la cámara
        closeCamera.addEventListener('click', () => {
            setTimeout(forceFocus, 100);
        });
        
        // Re-foco cuando se cierra el modal de imagen
        closeModal.addEventListener('click', () => {
            setTimeout(forceFocus, 100);
        });
    }

    // Estado inicial
    updateStatus('PENDIENTE');

    console.log('Aplicación iniciada correctamente');
});

// Agregar después de las funciones de sonido
function initAudioActivator() {
    const audioActivator = document.getElementById('audioActivator');
    
    // Siempre mostrar en iOS, incluso si no es móvil genérico
    if (/iPhone|iPad|iPod/i.test(navigator.userAgent) || 
        (navigator.standalone !== undefined && navigator.standalone)) {
        audioActivator.style.display = 'block';
        
        audioActivator.addEventListener('click', function() {
            // Crear y destruir un contexto de audio para activar
            const ctx = new (window.AudioContext || window.webkitAudioContext)();
            
            // Crear un oscilador silencioso
            const oscillator = ctx.createOscillator();
            const gainNode = ctx.createGain();
            gainNode.gain.value = 0; // Silencioso
            oscillator.connect(gainNode);
            gainNode.connect(ctx.destination);
            
            oscillator.start();
            setTimeout(() => {
                oscillator.stop();
                ctx.close();
            }, 100);
            
            // Marcar como activado globalmente
            window.audioActivated = true;
            
            // Reproducir sonido de prueba
            playSuccessSound();
            
            // Ocultar botón
            this.style.display = 'none';
            
            console.log('✅ Audio activado en iOS PWA');
        });
    } else {
        audioActivator.style.display = 'none';
        // En otros navegadores, activar inmediatamente
        getAudioContext();
    }
}

// Service Worker Registration - Solo registrar en HTTPS o localhost
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