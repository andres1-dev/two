// Módulo separado para el manejo de cámaras y escaneo
class CameraScanner {
    constructor() {
        this.stream = null;
        this.currentFacingMode = 'environment';
        this.isScanning = false;
        this.currentLibrary = 'quagga';
        this.html5QrCode = null;
        
        // Referencias UI
        this.cameraVideo = document.getElementById('cameraVideo');
        this.scanningOverlay = document.getElementById('scanningOverlay');
        this.currentLibrarySpan = document.getElementById('currentLibrary');
        this.cameraLibrarySelect = document.getElementById('camera-library');
        this.scannerIcon = document.getElementById('scannerIcon');
        
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
    }

    setLibrary(library) {
        this.currentLibrary = library;
        this.currentLibrarySpan.textContent = this.getLibraryName(library);
        
        // Detener escaneo actual si está activo
        if (this.isScanning) {
            this.stopScanning();
        }
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
            // Detener cámara anterior si existe
            if (this.stream) {
                this.stopCamera();
            }

            this.currentFacingMode = facingMode;
            
            const constraints = {
                video: { 
                    facingMode: facingMode,
                    width: { ideal: 1280 },
                    height: { ideal: 720 }
                }
            };

            this.stream = await navigator.mediaDevices.getUserMedia(constraints);
            this.cameraVideo.srcObject = this.stream;
            
            // Cambiar icono a cámara cuando está activa
            this.scannerIcon.textContent = 'camera';
            
            // Iniciar escaneo según la biblioteca seleccionada
            await this.startScanning();
            
        } catch (err) {
            console.error('Error accediendo a la cámara:', err);
            this.showError('No se pudo acceder a la cámara. Verifique los permisos.');
            throw err;
        }
    }

    async startScanning() {
        if (this.isScanning) return;
        
        this.isScanning = true;
        this.scanningOverlay.style.display = 'flex';
        this.scanningOverlay.innerHTML = `<i class="material-icons" style="margin-right:8px">search</i> Escaneando con ${this.getLibraryName(this.currentLibrary)}...`;

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
            }
        } catch (error) {
            console.error(`Error iniciando escaneo con ${this.currentLibrary}:`, error);
            this.showError(`Error con ${this.getLibraryName(this.currentLibrary)}`);
        }
    }

    async startQuaggaScanning() {
        return new Promise((resolve, reject) => {
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
                numOfWorkers: 2
            };

            Quagga.init(config, (err) => {
                if (err) {
                    reject(err);
                    return;
                }
                Quagga.start();
                resolve();
            });

            Quagga.onDetected((result) => {
                if (result && result.codeResult && result.codeResult.code) {
                    this.onCodeDetected(result.codeResult.code);
                }
            });
        });
    }

    async startHtml5QrScanning() {
        // HTML5 QR Code scanning
        const canvas = document.getElementById('qrCanvas');
        const context = canvas.getContext('2d');
        
        const scanFrame = () => {
            if (!this.isScanning) return;
            
            try {
                // Configurar canvas con las dimensiones del video
                canvas.width = this.cameraVideo.videoWidth;
                canvas.height = this.cameraVideo.videoHeight;
                
                // Dibujar frame actual en el canvas
                context.drawImage(this.cameraVideo, 0, 0, canvas.width, canvas.height);
                
                // Aquí iría la lógica de detección de QR con HTML5
                // Por ahora simulamos la detección
                this.simulateQrDetection();
                
            } catch (error) {
                console.error('Error en escaneo HTML5:', error);
            }
            
            // Continuar escaneo
            requestAnimationFrame(scanFrame);
        };
        
        scanFrame();
    }

    async startZxingScanning() {
        // ZXing scanning (simulado por ahora)
        console.log('Iniciando escaneo ZXing (simulado)');
        this.simulateQrDetection();
    }

    simulateQrDetection() {
        // Simulación de detección para bibliotecas no implementadas
        setTimeout(() => {
            if (this.isScanning) {
                // Solo simular si sigue escaneando
                console.log('Simulación de detección de código');
            }
        }, 2000);
    }

    onCodeDetected(code) {
        console.log('Código detectado:', code, 'con biblioteca:', this.currentLibrary);
        
        // Disparar evento personalizado para que app.js lo capture
        const event = new CustomEvent('codeScanned', { detail: { code, library: this.currentLibrary } });
        document.dispatchEvent(event);
        
        // Detener escaneo después de detectar
        this.stopScanning();
    }

    stopScanning() {
        this.isScanning = false;
        this.scanningOverlay.style.display = 'none';
        
        // Restaurar icono a pistola de escáner
        this.scannerIcon.textContent = 'qr_code_scanner';
        
        // Detener bibliotecas específicas
        switch (this.currentLibrary) {
            case 'quagga':
                if (typeof Quagga !== 'undefined') {
                    Quagga.stop();
                }
                break;
            case 'html5':
                // Limpiar cualquier intervalo o timeout de HTML5
                break;
        }
    }

    stopCamera() {
        if (this.stream) {
            this.stream.getTracks().forEach(track => track.stop());
            this.stream = null;
        }
        this.stopScanning();
        this.scannerIcon.textContent = 'qr_code_scanner';
    }

    switchCamera() {
        const newFacingMode = this.currentFacingMode === 'environment' ? 'user' : 'environment';
        this.stopCamera();
        return this.startCamera(newFacingMode);
    }

    showError(message) {
        this.scanningOverlay.innerHTML = `<i class="material-icons" style="margin-right:8px;color:#ff6b6b">error</i> ${message}`;
        this.scanningOverlay.style.display = 'flex';
    }

    // Método para probar bibliotecas
    testLibrary(library) {
        const originalLibrary = this.currentLibrary;
        this.setLibrary(library);
        
        return new Promise((resolve) => {
            setTimeout(() => {
                const success = Math.random() > 0.3; // 70% de éxito simulado
                resolve(success);
            }, 1000);
        });
    }
}

// Inicializar cuando el DOM esté listo
let cameraScanner;
document.addEventListener('DOMContentLoaded', () => {
    cameraScanner = new CameraScanner();
});