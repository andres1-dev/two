// QR Scanner Module para PandaDash - VERSIÓN PANTALLA COMPLETA
class QRScanner {
  constructor() {
    this.scanner = null;
    this.isScanning = false;
    this.currentCameraId = null;
    this.cameras = [];
    this.cameraIndex = -1;
    
    this.initElements();
    this.initEventListeners();
  }

  initElements() {
    this.qrScannerIcon = document.getElementById('qrScannerIcon');
    this.qrScannerModal = document.getElementById('qrScannerModal');
    this.qrScannerOverlay = document.getElementById('qrScannerOverlay');
    this.qrReader = document.getElementById('qrReader');
    this.closeQrScanner = document.getElementById('closeQrScanner');
    this.cancelQrScan = document.getElementById('cancelQrScan');
    this.toggleCameraBtn = document.getElementById('toggleCameraBtn');
    this.barcodeInput = document.getElementById('barcode');
    this.statusDiv = document.getElementById('status');
    
    if (this.qrScannerIcon) {
      this.qrScannerIcon.style.cursor = 'pointer';
      this.qrScannerIcon.title = 'Escanear código QR';
    }
  }

  initEventListeners() {
    if (this.qrScannerIcon) {
      this.qrScannerIcon.addEventListener('click', (e) => {
        e.stopPropagation();
        this.openScanner();
      });
    }
    
    this.closeQrScanner.addEventListener('click', (e) => {
      e.stopPropagation();
      this.closeScanner();
    });
    
    this.cancelQrScan.addEventListener('click', (e) => {
      e.stopPropagation();
      this.closeScanner();
    });
    
    this.toggleCameraBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.toggleCamera();
    });
    
    this.qrScannerOverlay.addEventListener('click', (e) => {
      if (e.target === this.qrScannerOverlay) {
        this.closeScanner();
      }
    });
  }

  async openScanner() {
    try {
      // Ocultar teclado
      if (this.barcodeInput) this.barcodeInput.blur();
      
      // Mostrar modal a pantalla completa
      this.qrScannerModal.style.display = 'flex';
      this.qrScannerOverlay.style.display = 'block';
      
      // Forzar pantalla completa visual
      this.qrScannerModal.style.position = 'fixed';
      this.qrScannerModal.style.top = '0';
      this.qrScannerModal.style.left = '0';
      this.qrScannerModal.style.width = '100vw';
      this.qrScannerModal.style.height = '100vh';
      this.qrScannerModal.style.zIndex = '10001';
      this.qrScannerModal.style.background = '#000';
      
      // Configurar contenedor QR
      this.qrReader.style.width = '100%';
      this.qrReader.style.height = '100%';
      this.qrReader.style.position = 'relative';
      
      // Limpiar contenedor
      this.qrReader.innerHTML = '';
      
      // Mostrar loading
      this.showLoading();
      
      // Inicializar escáner
      setTimeout(async () => {
        try {
          await this.initScanner();
        } catch (error) {
          console.error('Error al iniciar escáner:', error);
          this.closeScanner();
          this.showSimpleAlert('No se pudo acceder a la cámara. Asegúrate de dar los permisos necesarios.');
        }
      }, 100);
      
      // Actualizar estado
      this.updateStatus('loading', '<i class="fas fa-qrcode fa-spin"></i> INICIANDO ESCÁNER...');
      
    } catch (error) {
      console.error('Error al abrir escáner:', error);
      this.closeScanner();
    }
  }

  async initScanner() {
    try {
      // Crear nuevo escáner
      this.scanner = new Html5Qrcode(this.qrReader.id);
      
      // Obtener cámaras disponibles
      const devices = await Html5Qrcode.getCameras();
      
      if (!devices || devices.length === 0) {
        throw new Error('No se encontraron cámaras');
      }
      
      this.cameras = devices;
      
      // BUSCAR CÁMARA TRASERA
      let selectedCameraId = devices[0].id;
      let selectedCameraIndex = 0;
      
      for (let i = 0; i < devices.length; i++) {
        const label = devices[i].label.toLowerCase();
        if (label.includes('back') || 
            label.includes('rear') || 
            label.includes('environment') ||
            label.includes('traser') ||
            label.includes('posterior')) {
          selectedCameraId = devices[i].id;
          selectedCameraIndex = i;
          break;
        }
      }
      
      this.currentCameraId = selectedCameraId;
      this.cameraIndex = selectedCameraIndex;
      
      // Quitar loading
      this.hideLoading();
      
      // Iniciar escaneo PANTALLA COMPLETA
      await this.startFullScreenScanning(selectedCameraId);
      
      // Actualizar botón de cámara
      this.updateToggleButton();
      
    } catch (error) {
      console.error('Error al inicializar escáner:', error);
      this.hideLoading();
      throw error;
    }
  }

  async startFullScreenScanning(cameraId) {
    try {
      // Configuración para pantalla completa
      const config = {
        fps: 20,
        qrbox: { width: 250, height: 250 },
        aspectRatio: 1.777778, // 16:9 ratio
        rememberLastUsedCamera: false,
        showTorchButtonIfSupported: false,
        showZoomSliderIfSupported: false
      };
      
      // Agregar estilos para pantalla completa
      this.addFullScreenStyles();
      
      // Iniciar escáner
      await this.scanner.start(
        cameraId,
        config,
        (decodedText) => this.onScanSuccess(decodedText),
        (errorMessage) => this.onScanError(errorMessage)
      );
      
      this.isScanning = true;
      
      // Crear overlay visual para el área de escaneo
      this.createScanOverlay();
      
      // Actualizar estado
      this.updateStatus('ready', '<i class="fas fa-camera"></i> ESCANEANDO QR...');
      
    } catch (error) {
      console.error('Error al iniciar escaneo:', error);
      throw error;
    }
  }

  addFullScreenStyles() {
    // Inyectar estilos CSS para pantalla completa
    const style = document.createElement('style');
    style.id = 'qr-fullscreen-styles';
    style.textContent = `
      /* Video de la cámara a pantalla completa */
      #html5-qrcode-container {
        width: 100vw !important;
        height: 100vh !important;
        position: fixed !important;
        top: 0 !important;
        left: 0 !important;
        background: #000 !important;
      }
      
      /* Video fullscreen */
      #html5-qrcode-container video {
        width: 100vw !important;
        height: 100vh !important;
        object-fit: cover !important;
        position: fixed !important;
        top: 0 !important;
        left: 0 !important;
      }
      
      /* Canvas de escaneo - centrado */
      #html5-qrcode-container canvas {
        position: fixed !important;
        top: 50% !important;
        left: 50% !important;
        transform: translate(-50%, -50%) !important;
        width: 280px !important;
        height: 280px !important;
        border: 3px solid var(--primary) !important;
        border-radius: 20px !important;
        box-shadow: 0 0 0 1000px rgba(0, 0, 0, 0.85),
                    0 0 40px rgba(37, 99, 235, 0.6) !important;
        pointer-events: none !important;
        z-index: 100 !important;
      }
      
      /* Ocultar elementos innecesarios */
      #html5-qrcode-anchor-scan-type-change,
      #html5-qrcode-button-camera-permission,
      #html5-qrcode-button-camera-start,
      #html5-qrcode-button-camera-stop,
      #html5-qrcode-select-camera,
      #html5-qrcode-camera-selection,
      #html5qr-code-full-region__dashboard_section {
        display: none !important;
      }
      
      /* Overlay personalizado */
      .qr-scan-overlay {
        position: fixed;
        top: 0;
        left: 0;
        width: 100vw;
        height: 100vh;
        pointer-events: none;
        z-index: 50;
      }
      
      /* Línea de escaneo */
      .qr-scan-line {
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        width: 240px;
        height: 3px;
        background: linear-gradient(90deg, transparent, var(--primary), transparent);
        box-shadow: 0 0 15px var(--primary);
        border-radius: 3px;
        animation: qr-scan-animation 2s infinite ease-in-out;
        z-index: 101;
      }
      
      /* Esquinas */
      .qr-corner {
        position: fixed;
        width: 30px;
        height: 30px;
        border: 3px solid var(--primary);
        z-index: 101;
      }
      
      .qr-corner-tl {
        top: calc(50% - 140px);
        left: calc(50% - 140px);
        border-right: none;
        border-bottom: none;
        border-radius: 12px 0 0 0;
      }
      
      .qr-corner-tr {
        top: calc(50% - 140px);
        right: calc(50% - 140px);
        border-left: none;
        border-bottom: none;
        border-radius: 0 12px 0 0;
      }
      
      .qr-corner-bl {
        bottom: calc(50% - 140px);
        left: calc(50% - 140px);
        border-right: none;
        border-top: none;
        border-radius: 0 0 0 12px;
      }
      
      .qr-corner-br {
        bottom: calc(50% - 140px);
        right: calc(50% - 140px);
        border-left: none;
        border-top: none;
        border-radius: 0 0 12px 0;
      }
      
      /* Animación */
      @keyframes qr-scan-animation {
        0% {
          top: calc(50% - 120px);
          opacity: 1;
        }
        50% {
          top: calc(50% + 120px);
          opacity: 0.7;
        }
        100% {
          top: calc(50% - 120px);
          opacity: 1;
        }
      }
      
      /* Mensaje */
      .qr-instruction {
        position: fixed;
        bottom: 120px;
        left: 50%;
        transform: translateX(-50%);
        color: white;
        font-size: 16px;
        font-weight: 500;
        text-align: center;
        background: rgba(0, 0, 0, 0.7);
        padding: 12px 24px;
        border-radius: 20px;
        backdrop-filter: blur(10px);
        border: 1px solid rgba(255, 255, 255, 0.2);
        z-index: 101;
        white-space: nowrap;
      }
    `;
    
    document.head.appendChild(style);
  }

  createScanOverlay() {
    // Crear overlay contenedor
    const overlay = document.createElement('div');
    overlay.className = 'qr-scan-overlay';
    
    // Crear línea de escaneo
    const scanLine = document.createElement('div');
    scanLine.className = 'qr-scan-line';
    
    // Crear esquinas
    const corners = ['tl', 'tr', 'bl', 'br'];
    corners.forEach(corner => {
      const cornerEl = document.createElement('div');
      cornerEl.className = `qr-corner qr-corner-${corner}`;
      overlay.appendChild(cornerEl);
    });
    
    // Crear mensaje de instrucción
    const instruction = document.createElement('div');
    instruction.className = 'qr-instruction';
    instruction.textContent = 'Apunta el código QR al marco';
    
    // Agregar al overlay
    overlay.appendChild(scanLine);
    overlay.appendChild(instruction);
    
    // Agregar al DOM
    document.body.appendChild(overlay);
    
    // Guardar referencia
    this.scanOverlay = overlay;
  }

  onScanSuccess(decodedText) {
    console.log('✅ QR escaneado:', decodedText);
    
    // Efecto visual de éxito
    if (this.scanOverlay) {
      const corners = this.scanOverlay.querySelectorAll('.qr-corner');
      corners.forEach(corner => {
        corner.style.borderColor = 'var(--success)';
        corner.style.boxShadow = '0 0 15px var(--success)';
      });
    }
    
    // Sonido de éxito
    this.playScanSuccessSound();
    
    // Actualizar estado
    this.updateStatus('success', '<i class="fas fa-check-circle"></i> QR DETECTADO');
    
    // Insertar código
    if (this.barcodeInput) {
      this.barcodeInput.value = decodedText;
    }
    
    // Cerrar escáner
    this.closeScanner();
    
    // Procesar automáticamente
    setTimeout(() => {
      if (this.barcodeInput) {
        const inputEvent = new Event('input', { bubbles: true });
        this.barcodeInput.dispatchEvent(inputEvent);
        this.barcodeInput.focus();
        
        setTimeout(() => {
          this.barcodeInput.value = '';
        }, 100);
      }
    }, 300);
  }

  onScanError(errorMessage) {
    // Solo loguear errores importantes
    if (!errorMessage.includes('NotFoundException')) {
      console.debug('Escaneo:', errorMessage);
    }
  }

  async toggleCamera() {
    if (this.cameras.length < 2) {
      this.updateToggleButton();
      return;
    }
    
    try {
      // Remover overlay
      this.removeScanOverlay();
      
      // Detener escáner
      if (this.scanner && this.isScanning) {
        await this.scanner.stop();
        this.isScanning = false;
      }
      
      // Cambiar cámara
      this.cameraIndex = (this.cameraIndex + 1) % this.cameras.length;
      const nextCameraId = this.cameras[this.cameraIndex].id;
      this.currentCameraId = nextCameraId;
      
      // Actualizar botón
      this.updateToggleButton();
      
      // Reiniciar escaneo
      await this.startFullScreenScanning(nextCameraId);
      
    } catch (error) {
      console.error('Error al cambiar cámara:', error);
      // Reintentar
      try {
        const prevCameraIndex = (this.cameraIndex - 1 + this.cameras.length) % this.cameras.length;
        this.cameraIndex = prevCameraIndex;
        this.currentCameraId = this.cameras[prevCameraIndex].id;
        
        await this.startFullScreenScanning(this.currentCameraId);
      } catch (retryError) {
        console.error('Error al reintentar cámara:', retryError);
        this.closeScanner();
      }
    }
  }

  removeScanOverlay() {
    if (this.scanOverlay) {
      this.scanOverlay.remove();
      this.scanOverlay = null;
    }
  }

  updateToggleButton() {
    if (!this.toggleCameraBtn || this.cameras.length < 2) {
      if (this.toggleCameraBtn) {
        this.toggleCameraBtn.style.display = 'none';
      }
      return;
    }
    
    this.toggleCameraBtn.style.display = 'flex';
    
    const icon = this.toggleCameraBtn.querySelector('i');
    const label = this.cameras[this.cameraIndex]?.label.toLowerCase() || '';
    
    if (label.includes('front') || label.includes('user') || label.includes('selfie')) {
      icon.className = 'fas fa-camera-rotate';
      this.toggleCameraBtn.title = 'Cambiar a cámara trasera';
    } else {
      icon.className = 'fas fa-camera';
      this.toggleCameraBtn.title = 'Cambiar a cámara frontal';
    }
  }

  async closeScanner() {
    try {
      // Remover overlay
      this.removeScanOverlay();
      
      // Remover estilos
      const styles = document.getElementById('qr-fullscreen-styles');
      if (styles) styles.remove();
      
      // Detener escáner
      if (this.scanner && this.isScanning) {
        await this.scanner.stop();
        this.isScanning = false;
      }
      
      // Limpiar
      this.scanner = null;
      this.qrReader.innerHTML = '';
      
      // Restaurar estilos del modal
      this.qrScannerModal.style.display = 'none';
      this.qrScannerOverlay.style.display = 'none';
      
      // Restaurar posición normal (por si acaso)
      this.qrScannerModal.style.position = '';
      this.qrScannerModal.style.top = '';
      this.qrScannerModal.style.left = '';
      this.qrScannerModal.style.width = '';
      this.qrScannerModal.style.height = '';
      this.qrScannerModal.style.background = '';
      
      // Restaurar estado
      this.updateStatus('ready', '<i class="fas fa-check-circle"></i> SISTEMA LISTO');
      
      // Restaurar foco
      setTimeout(() => {
        if (this.barcodeInput) {
          this.barcodeInput.focus();
        }
      }, 300);
      
    } catch (error) {
      console.error('Error al cerrar escáner:', error);
      // Forzar limpieza
      this.qrScannerModal.style.display = 'none';
      this.qrScannerOverlay.style.display = 'none';
      this.qrReader.innerHTML = '';
      this.removeScanOverlay();
      
      const styles = document.getElementById('qr-fullscreen-styles');
      if (styles) styles.remove();
    }
  }

  showLoading() {
    const loadingDiv = document.createElement('div');
    loadingDiv.className = 'qr-scanner-loading';
    loadingDiv.innerHTML = `
      <div style="
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        text-align: center;
        color: white;
        z-index: 1000;
      ">
        <i class="fas fa-spinner fa-spin" style="font-size: 40px; margin-bottom: 16px; color: var(--primary);"></i>
        <p style="margin: 0; font-size: 16px; color: rgba(255,255,255,0.9);">Cargando cámara...</p>
      </div>
    `;
    this.qrReader.appendChild(loadingDiv);
  }

  hideLoading() {
    const loadingDiv = this.qrReader.querySelector('.qr-scanner-loading');
    if (loadingDiv) {
      loadingDiv.remove();
    }
  }

  playScanSuccessSound() {
    try {
      if (typeof playSuccessSound === 'function') {
        playSuccessSound();
      } else {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.value = 800;
        oscillator.type = 'sine';
        gainNode.gain.value = 0.1;
        
        oscillator.start();
        gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.1);
        oscillator.stop(audioContext.currentTime + 0.1);
      }
    } catch (error) {
      // Silenciar
    }
  }

  updateStatus(type, html) {
    if (!this.statusDiv) return;
    
    this.statusDiv.className = type;
    this.statusDiv.innerHTML = html;
  }

  showSimpleAlert(message) {
    alert(message);
  }

  // Método público
  scanQRCode() {
    this.openScanner();
  }

  isScannerAvailable() {
    return typeof Html5Qrcode !== 'undefined';
  }
}

// Inicialización
document.addEventListener('DOMContentLoaded', () => {
  const initScanner = () => {
    if (typeof Html5Qrcode !== 'undefined') {
      try {
        window.qrScanner = new QRScanner();
        console.log('✅ Escáner QR pantalla completa inicializado');
        
        const qrIcon = document.getElementById('qrScannerIcon');
        if (qrIcon) {
          qrIcon.style.display = 'inline-block';
        }
      } catch (error) {
        console.error('Error al inicializar escáner:', error);
      }
    } else {
      const qrIcon = document.getElementById('qrScannerIcon');
      if (qrIcon) {
        qrIcon.style.display = 'none';
      }
    }
  };
  
  initScanner();
  
  if (document.readyState === 'complete') {
    setTimeout(initScanner, 500);
  }
});

// API global
window.openQRScanner = function() {
  if (window.qrScanner && window.qrScanner.isScannerAvailable()) {
    window.qrScanner.scanQRCode();
  }
};

window.closeQRScanner = function() {
  if (window.qrScanner) {
    window.qrScanner.closeScanner();
  }
};