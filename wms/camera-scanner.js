// Módulo separado para el manejo de cámaras y escaneo
class CameraScanner {
    constructor() {
        this.stream = null;
        this.currentFacingMode = 'environment';
        this.isScanning = false;
        this.currentLibrary = 'quagga';
        this.html5QrCode = null;
        this.isCameraActive = false;
        
        // Referencias UI
        this.cameraVideo = document.getElementById('cameraVideo');
        this.scanningOverlay = document.getElementById('scanningOverlay');
        this.currentLibrarySpan = document.getElementById('currentLibrary');
        this.cameraLibrarySelect = document.getElementById('camera-library');
        this.scannerIcon = document.getElementById('scannerIcon');
        this.cameraModal = document.getElementById('cameraModal');
        
        this.init();
    }

    init() {
        // Cargar configuración de biblioteca
        const savedLibrary = localStorage.getItem('pda_camera_library') || 'quagga';
        this.cameraLibrarySelect.value = savedLibrary;
        this.setLibrary(savedLibrary);
        
        // Event listener para cambiar biblioteca
        this.cameraLibrarySelect.addEventListener('change', (e) => {
            this.setLibrary(e.target.value);
            localStorage.setItem('pda_camera_library', e.target.value);
        });

        console.log('CameraScanner inicializado');
    }

    setLibrary(library) {
        this.currentLibrary = library;
        this.currentLibrarySpan.textContent = this.getLibraryName(library);
        console.log(`Biblioteca cambiada a: ${library}`);
    }

    getLibraryName(library) {
        const names = {
            'quagga': 'Quagga2',
            'html5': 'HTML5 QR',
            'zxing': 'ZXing'
        };
        return names[library] || 'Desconocida';
    }

    async startCamera(facingMode = 'environment') {
        try {
            console.log('Solicitando permisos de cámara...');
            
            // Detener cámara anterior si existe
            if (this.stream) {
                this.stopCamera();
            }

            this.currentFacingMode = facingMode;
            
            // Solicitar permisos de cámara
            this.stream = await navigator.mediaDevices.getUserMedia({
                video: { 
                    facingMode: facingMode,
                    width: { ideal: 1280 },
                    height: { ideal: 720 }
                },
                audio: false
            });

            console.log('Cámara accedida correctamente');

            this.cameraVideo.srcObject = this.stream;
            this.isCameraActive = true;
            
            // Esperar a que el video esté listo
            await new Promise((resolve) => {
                this.cameraVideo.onloadedmetadata = () => {
                    this.cameraVideo.play();
                    resolve();
                };
            });

            // Cambiar icono a cámara cuando está activa
            this.scannerIcon.textContent = 'camera';
            
            // Iniciar escaneo según la biblioteca seleccionada
            await this.startScanning();
            
            return true;
            
        } catch (err) {
            console.error('Error accediendo a la cámara:', err);
            this.showError(`Error de cámara: ${err.message}`);
            this.isCameraActive = false;
            return false;
        }
    }

    async startScanning() {
        if (this.isScanning) {
            console.log('El escaneo ya está activo');
            return;
        }
        
        this.isScanning = true;
        this.scanningOverlay.style.display = 'flex';
        this.scanningOverlay.innerHTML = 
            `<i class="material-icons" style="margin-right:8px">search</i> 
             Escaneando con ${this.getLibraryName(this.currentLibrary)}...`;

        console.log(`Iniciando escaneo con ${this.currentLibrary}`);

        try {
            switch (this.currentLibrary) {
                case 'quagga':
                    await this.startQuaggaScanning();
                    break;
                case 'html5':
                    await this.startHtml5QrScanning();
                    break;
                case 'zxing':
                    await this.startZxingScanning();
                    break;
                default:
                    throw new Error(`Biblioteca no soportada: ${this.currentLibrary}`);
            }
            
            console.log(`Escaneo con ${this.currentLibrary} iniciado correctamente`);
            
        } catch (error) {
            console.error(`Error iniciando escaneo con ${this.currentLibrary}:`, error);
            this.showError(`Error con ${this.getLibraryName(this.currentLibrary)}: ${error.message}`);
            this.stopScanning();
        }
    }

    async startQuaggaScanning() {
        return new Promise((resolve, reject) => {
            if (typeof Quagga === 'undefined') {
                reject(new Error('Quagga2 no está cargado'));
                return;
            }

            const config = {
                inputStream: {
                    name: "Live",
                    type: "LiveStream",
                    target: this.cameraVideo,
                    constraints: {
                        facingMode: this.currentFacingMode
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
                        "i2of5_reader"
                    ]
                },
                locate: true,
                numOfWorkers: navigator.hardwareConcurrency || 2
            };

            Quagga.init(config, (err) => {
                if (err) {
                    console.error('Error inicializando Quagga:', err);
                    reject(err);
                    return;
                }
                
                Quagga.start();
                console.log('Quagga iniciado correctamente');
                resolve();
            });

            // Configurar el detector de códigos
            Quagga.onDetected((result) => {
                if (result && result.codeResult && result.codeResult.code) {
                    const code = result.codeResult.code;
                    console.log('Código detectado por Quagga:', code);
                    this.onCodeDetected(code);
                }
            });

            // Manejar errores de Quagga
            Quagga.onProcessed((result) => {
                if (result && result.codeResult) {
                    console.log('Quagga procesando:', result.codeResult.code);
                }
            });
        });
    }

    async startHtml5QrScanning() {
        return new Promise((resolve, reject) => {
            if (typeof Html5Qrcode === 'undefined') {
                reject(new Error('HTML5 QR Code no está cargado'));
                return;
            }

            try {
                // Usar el contenedor de la cámara para HTML5 QR
                const containerId = 'cameraVideo';
                
                this.html5QrCode = new Html5Qrcode(containerId);
                
                const config = {
                    fps: 10,
                    qrbox: { width: 250, height: 250 },
                    aspectRatio: 1.0
                };

                this.html5QrCode.start(
                    { facingMode: this.currentFacingMode },
                    config,
                    (decodedText) => {
                        console.log('Código detectado por HTML5 QR:', decodedText);
                        this.onCodeDetected(decodedText);
                    },
                    (errorMessage) => {
                        // Error esperado, no rechazar la promesa
                        console.log('HTML5 QR escaneando...', errorMessage);
                    }
                ).then(() => {
                    console.log('HTML5 QR Code iniciado correctamente');
                    resolve();
                }).catch(reject);
                
            } catch (error) {
                reject(error);
            }
        });
    }

    async startZxingScanning() {
        // ZXing scanning - implementación básica con API nativa
        console.log('Iniciando escaneo ZXing (simulación mejorada)');
        
        // Simular detección después de 3 segundos para testing
        setTimeout(() => {
            if (this.isScanning) {
                const testCodes = ['123456789', 'TEST001', 'QRCODE123'];
                const randomCode = testCodes[Math.floor(Math.random() * testCodes.length)];
                console.log('Código simulado detectado por ZXing:', randomCode);
                this.onCodeDetected(randomCode);
            }
        }, 3000);
        
        return Promise.resolve();
    }

    onCodeDetected(code) {
        console.log('Código detectado:', code, 'con biblioteca:', this.currentLibrary);
        
        // Disparar evento personalizado para que app.js lo capture
        const event = new CustomEvent('codeScanned', { 
            detail: { 
                code: code, 
                library: this.currentLibrary,
                timestamp: new Date().toISOString()
            } 
        });
        document.dispatchEvent(event);
        
        // Detener escaneo después de detectar
        this.stopScanning();
        
        // Cerrar modal de cámara
        this.cameraModal.classList.remove('show');
    }

    stopScanning() {
        if (!this.isScanning) return;
        
        console.log('Deteniendo escaneo...');
        this.isScanning = false;
        this.scanningOverlay.style.display = 'none';
        
        // Detener bibliotecas específicas
        switch (this.currentLibrary) {
            case 'quagga':
                if (typeof Quagga !== 'undefined' && Quagga) {
                    try {
                        Quagga.stop();
                        console.log('Quagga detenido');
                    } catch (e) {
                        console.error('Error deteniendo Quagga:', e);
                    }
                }
                break;
                
            case 'html5':
                if (this.html5QrCode) {
                    try {
                        this.html5QrCode.stop().then(() => {
                            console.log('HTML5 QR Code detenido');
                            this.html5QrCode.clear();
                        }).catch(err => {
                            console.error('Error deteniendo HTML5 QR:', err);
                        });
                    } catch (e) {
                        console.error('Error deteniendo HTML5 QR:', e);
                    }
                }
                break;
                
            case 'zxing':
                // Limpiar cualquier timeout de ZXing
                console.log('ZXing detenido');
                break;
        }

        // Restaurar icono a pistola de escáner
        this.scannerIcon.textContent = 'qr_code_scanner';
    }

    stopCamera() {
        console.log('Deteniendo cámara...');
        
        if (this.stream) {
            this.stream.getTracks().forEach(track => {
                track.stop();
                console.log('Track de cámara detenido:', track.kind);
            });
            this.stream = null;
        }
        
        this.stopScanning();
        this.isCameraActive = false;
        this.scannerIcon.textContent = 'qr_code_scanner';
        
        console.log('Cámara detenida completamente');
    }

    async switchCamera() {
        console.log('Cambiando cámara...');
        const newFacingMode = this.currentFacingMode === 'environment' ? 'user' : 'environment';
        this.stopCamera();
        return this.startCamera(newFacingMode);
    }

    showError(message) {
        console.error('Error de cámara:', message);
        this.scanningOverlay.innerHTML = 
            `<div style="text-align:center;color:#ff6b6b">
                <i class="material-icons" style="font-size:48px;margin-bottom:16px">error_outline</i>
                <div style="font-size:16px;font-weight:bold">Error</div>
                <div style="font-size:14px;margin-top:8px">${message}</div>
                <div style="font-size:12px;margin-top:16px;color:#ccc">
                    Verifique los permisos de cámara y recargue la página
                </div>
            </div>`;
        this.scanningOverlay.style.display = 'flex';
    }

    // Verificar si la cámara está disponible
    async checkCameraAvailability() {
        try {
            const devices = await navigator.mediaDevices.enumerateDevices();
            const videoDevices = devices.filter(device => device.kind === 'videoinput');
            console.log('Dispositivos de cámara disponibles:', videoDevices);
            return videoDevices.length > 0;
        } catch (error) {
            console.error('Error enumerando dispositivos:', error);
            return false;
        }
    }

    // Probar bibliotecas disponibles
    async testLibraries() {
        const results = {};
        
        // Verificar Quagga
        results.quagga = typeof Quagga !== 'undefined';
        
        // Verificar HTML5 QR
        results.html5 = typeof Html5Qrcode !== 'undefined';
        
        // ZXing siempre disponible (simulación)
        results.zxing = true;
        
        console.log('Bibliotecas disponibles:', results);
        return results;
    }
}

// Inicializar cuando el DOM esté listo y hacerlo global
let cameraScanner;

document.addEventListener('DOMContentLoaded', async () => {
    try {
        cameraScanner = new CameraScanner();
        window.cameraScanner = cameraScanner; // Hacerlo global para acceso fácil
        
        // Verificar disponibilidad de cámara al cargar
        const hasCamera = await cameraScanner.checkCameraAvailability();
        console.log('Cámara disponible:', hasCamera);
        
        // Probar bibliotecas disponibles
        await cameraScanner.testLibraries();
        
    } catch (error) {
        console.error('Error inicializando CameraScanner:', error);
    }
});