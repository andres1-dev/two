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

// REEMPLAZAR COMPLETAMENTE LA FUNCIÓN startCamera()
async function startCamera() {
    try {
        scanningOverlay.style.display = 'flex';
        scanningOverlay.innerHTML = '<i class="fas fa-camera" style="margin-right:8px"></i> Iniciando cámara trasera...';
        
        console.log('Solicitando cámara trasera...');
        
        // OPCION 1: Intentar con facingMode exact (cámara trasera)
        let constraints = {
            video: { 
                facingMode: { exact: 'environment' },
                width: { ideal: 1280 },
                height: { ideal: 720 }
            },
            audio: false
        };
        
        try {
            stream = await navigator.mediaDevices.getUserMedia(constraints);
            console.log('✅ Cámara trasera accedida con facingMode exact');
        } catch (exactError) {
            console.log('❌ facingMode exact falló, intentando sin exact...', exactError);
            
            // OPCION 2: Intentar sin 'exact' (algunos navegadores)
            constraints = {
                video: { 
                    facingMode: 'environment',
                    width: { ideal: 1280 },
                    height: { ideal: 720 }
                },
                audio: false
            };
            
            try {
                stream = await navigator.mediaDevices.getUserMedia(constraints);
                console.log('✅ Cámara accedida con facingMode normal');
            } catch (normalError) {
                console.log('❌ facingMode normal falló, intentando sin restricciones...', normalError);
                
                // OPCION 3: Sin restricciones (último recurso)
                constraints = {
                    video: { 
                        width: { ideal: 1280 },
                        height: { ideal: 720 }
                    },
                    audio: false
                };
                
                stream = await navigator.mediaDevices.getUserMedia(constraints);
                console.log('✅ Cámara accedida sin restricciones');
            }
        }
        
        cameraVideo.srcObject = stream;
        
        // Esperar a que el video esté listo
        await new Promise((resolve) => {
            cameraVideo.onloadedmetadata = () => {
                cameraVideo.play();
                resolve();
            };
        });
        
        console.log('✅ Video listo, iniciando escáner...');
        
        // Solo usar Quagga2 y Html5-QRCode (sin ZXing)
        if (typeof Quagga !== 'undefined') {
            console.log('🚀 Intentando con Quagga2...');
            await startQuaggaScanning();
            return;
        }
        
        if (typeof Html5Qrcode !== 'undefined') {
            console.log('🔄 Quagga2 no disponible, usando Html5-QRCode...');
            await startHtml5QrCode();
            return;
        }
        
        throw new Error('No hay bibliotecas de escaneo disponibles');
        
    } catch (err) {
        console.error('❌ Error crítico con la cámara:', err);
        scanningOverlay.innerHTML = 
            '<div style="text-align:center;color:#ff6b6b">' +
            '<i class="fas fa-camera-slash" style="font-size:48px;margin-bottom:16px"></i>' +
            '<div style="font-size:16px;font-weight:bold">Error de Cámara</div>' +
            '<div style="font-size:14px;margin-top:8px">' + err.message + '</div>' +
            '<div style="font-size:12px;margin-top:16px;color:#ccc">Verifique permisos y recargue</div>' +
            '</div>';
        
        setTimeout(() => {
            stopCamera();
            cameraModal.classList.remove('show');
        }, 4000);
    }
}


// REEMPLAZAR COMPLETAMENTE LA FUNCIÓN startQuaggaScanning()
async function startQuaggaScanning() {
    return new Promise((resolve, reject) => {
        if (isScanning) {
            resolve();
            return;
        }
        
        isScanning = true;
        scannerMode = 'quagga';
        scanningOverlay.innerHTML = '<i class="fas fa-qrcode" style="margin-right:8px"></i> Escaneando códigos de barras...';

        const config = {
            inputStream: {
                name: "Live",
                type: "LiveStream", 
                target: cameraVideo,
                constraints: {
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
                    "upc_reader",
                    "upc_e_reader"
                ]
            },
            locate: true,
            numOfWorkers: Math.min(navigator.hardwareConcurrency || 2, 4),
            frequency: 10
        };

        Quagga.init(config, function(err) {
            if (err) {
                console.error('❌ Error inicializando Quagga:', err);
                isScanning = false;
                reject(err);
                return;
            }
            Quagga.start();
            console.log('✅ Quagga2 iniciado correctamente');
            resolve();
        });

        Quagga.onDetected(function(result) {
            if (result && result.codeResult && result.codeResult.code) {
                const code = result.codeResult.code;
                console.log('✅ Código detectado (Quagga2):', code);
                handleScannedCode(code);
            }
        });
    });
}


// REEMPLAZAR COMPLETAMENTE LA FUNCIÓN startHtml5QrCode()
async function startHtml5QrCode() {
    scannerMode = 'html5qrcode';
    isScanning = true;
    scanningOverlay.innerHTML = '<i class="fas fa-qrcode" style="margin-right:8px"></i> Escaneando códigos QR...';
    
    // Ocultar video nativo y usar el contenedor de Html5Qrcode
    cameraVideo.style.display = 'none';
    
    const qrReader = document.createElement('div');
    qrReader.id = 'qr-reader';
    qrReader.style.width = '100%';
    qrReader.style.height = '300px';
    qrReader.style.background = '#000';
    cameraVideo.parentElement.appendChild(qrReader);
    
    html5QrCode = new Html5Qrcode("qr-reader");
    
    const config = {
        fps: 10,
        qrbox: { width: 250, height: 250 },
        aspectRatio: 1.0,
        disableFlip: false
    };
    
    try {
        await html5QrCode.start(
            { facingMode: "environment" }, // Forzar cámara trasera
            config,
            (decodedText) => {
                console.log('✅ Código detectado (Html5-QRCode):', decodedText);
                handleScannedCode(decodedText);
            },
            (errorMessage) => {
                // Esto es normal durante el escaneo, no es un error
            }
        );
        console.log('✅ Html5-QRCode iniciado correctamente');
    } catch (err) {
        console.error('❌ Error con Html5-QRCode:', err);
        cleanupHtml5QrCode();
        throw err;
    }
}


// AGREGAR ESTA NUEVA FUNCIÓN (si no existe)
function cleanupHtml5QrCode() {
    const qrReader = document.getElementById('qr-reader');
    if (qrReader) {
        qrReader.remove();
    }
    cameraVideo.style.display = 'block';
}

// AGREGAR ESTA FUNCIÓN (si no existe)
function handleScannedCode(code) {
    console.log('🎯 Procesando código escaneado:', code);
    searchData(code);
    stopCamera();
    cameraModal.classList.remove('show');
}

function stopCamera() {
    console.log('🛑 Deteniendo cámara, modo:', scannerMode);
    
    if (scannerMode === 'quagga' && typeof Quagga !== 'undefined') {
        try {
            Quagga.stop();
            Quagga.offDetected();
            console.log('✅ Quagga2 detenido');
        } catch (e) {
            console.log('⚠️ Error deteniendo Quagga:', e);
        }
    }
    
    if (scannerMode === 'html5qrcode' && html5QrCode) {
        try {
            html5QrCode.stop().then(() => {
                html5QrCode.clear();
                cleanupHtml5QrCode();
                console.log('✅ Html5-QRCode detenido');
            }).catch(e => console.log('⚠️ Error deteniendo Html5-QRCode:', e));
        } catch (e) {
            console.log('⚠️ Error deteniendo Html5-QRCode:', e);
            cleanupHtml5QrCode();
        }
        html5QrCode = null;
    }
    
    // Limpiar stream de cámara
    if (stream) {
        stream.getTracks().forEach(track => {
            track.stop();
            console.log('✅ Track de cámara detenido:', track.kind);
        });
        stream = null;
    }
    
    isScanning = false;
    scannerMode = null;
    scanningOverlay.style.display = 'none';
    cameraVideo.srcObject = null;
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
        
        // Reproducir sonido de carga exitosa
        playChimeSound();
        
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

// Eventos principales
qrInput.addEventListener('input', function() {
    const v = this.value.trim();
    console.log('Input detectado:', v);
    if (v) {
        searchData(v);
        this.value = ''; // Limpiar inmediatamente para el siguiente escaneo
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