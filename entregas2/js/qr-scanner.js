// QR Scanner Module para PandaDash
class QRScanner {
  constructor() {
    this.scanner = null;
    this.isScanning = false;
    this.currentCameraId = null;
    this.cameras = [];
    this.cameraIndex = 0;
    
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
  }

  initEventListeners() {
    // Icono QR para abrir escáner
    this.qrScannerIcon.addEventListener('click', () => this.openScanner());
    
    // Botones para cerrar
    this.closeQrScanner.addEventListener('click', () => this.closeScanner());
    this.cancelQrScan.addEventListener('click', () => this.closeScanner());
    
    // Botón para cambiar cámara
    this.toggleCameraBtn.addEventListener('click', () => this.toggleCamera());
    
    // Cerrar al hacer clic fuera
    this.qrScannerOverlay.addEventListener('click', () => this.closeScanner());
  }

  async openScanner() {
    try {
      // Mostrar modal y overlay
      this.qrScannerModal.style.display = 'flex';
      this.qrScannerOverlay.style.display = 'block';
      
      // Ocultar teclado si está visible
      this.barcodeInput.blur();
      
      // Inicializar escáner
      await this.initScanner();
      
      // Actualizar estado
      this.statusDiv.className = 'loading';
      this.statusDiv.innerHTML = '<i class="fas fa-qrcode fa-spin"></i> ESCANEANDO QR...';
      
    } catch (error) {
      console.error('Error al abrir escáner:', error);
      this.showError('No se pudo acceder a la cámara');
      this.closeScanner();
    }
  }

  async initScanner() {
    try {
      // Crear nuevo escáner
      this.scanner = new Html5Qrcode(this.qrReader.id);
      
      // Obtener cámaras disponibles
      const devices = await Html5Qrcode.getCameras();
      
      if (devices && devices.length > 0) {
        this.cameras = devices;
        
        // Usar cámara trasera por defecto si está disponible
        const backCamera = devices.find(device => 
          device.label.toLowerCase().includes('back') || 
          device.label.toLowerCase().includes('rear') ||
          device.label.toLowerCase().includes('environment')
        );
        
        const cameraId = backCamera ? backCamera.id : devices[0].id;
        this.currentCameraId = cameraId;
        
        // Iniciar escaneo
        await this.startScanning(cameraId);
      } else {
        throw new Error('No se encontraron cámaras disponibles');
      }
      
    } catch (error) {
      console.error('Error al inicializar escáner:', error);
      throw error;
    }
  }

  async startScanning(cameraId) {
    try {
      const config = {
        fps: 10,
        qrbox: { width: 250, height: 250 },
        aspectRatio: 1.0,
        rememberLastUsedCamera: false
      };

      await this.scanner.start(
        cameraId,
        config,
        (decodedText) => this.onScanSuccess(decodedText),
        (errorMessage) => this.onScanError(errorMessage)
      );
      
      this.isScanning = true;
      
      // Crear indicador visual de escaneo
      this.createScanIndicator();
      
    } catch (error) {
      console.error('Error al iniciar escaneo:', error);
      throw error;
    }
  }

  createScanIndicator() {
    // Eliminar indicador anterior si existe
    const existingIndicator = document.querySelector('.scan-indicator');
    if (existingIndicator) {
      existingIndicator.remove();
    }
    
    // Crear nuevo indicador
    const indicator = document.createElement('div');
    indicator.className = 'scan-indicator';
    indicator.innerHTML = '<div class="scan-line"></div>';
    
    // Crear mensaje
    const message = document.createElement('div');
    message.className = 'scan-message';
    message.textContent = 'Enfoca el código QR dentro del marco';
    
    this.qrReader.appendChild(indicator);
    this.qrReader.appendChild(message);
  }

  onScanSuccess(decodedText) {
    console.log('QR escaneado:', decodedText);
    
    // Reproducir sonido de éxito
    this.playScanSuccessSound();
    
    // Aplicar efecto visual de éxito
    const indicator = document.querySelector('.scan-indicator');
    if (indicator) {
      indicator.classList.add('scan-success');
    }
    
    // Actualizar estado
    this.statusDiv.className = 'ready';
    this.statusDiv.innerHTML = '<i class="fas fa-check-circle"></i> QR ESCANEADO';
    
    // Insertar código en el input
    this.barcodeInput.value = decodedText;
    this.barcodeInput.focus();
    
    // Simular evento input para procesar el código
    const inputEvent = new Event('input', { bubbles: true });
    this.barcodeInput.dispatchEvent(inputEvent);
    
    // Cerrar escáner después de un breve retraso
    setTimeout(() => {
      this.closeScanner();
    }, 1000);
  }

  onScanError(errorMessage) {
    // Solo mostrar errores importantes
    if (!errorMessage.includes('NotFoundException') && 
        !errorMessage.includes('NotAllowedError')) {
      console.warn('Error de escaneo:', errorMessage);
    }
  }

  async toggleCamera() {
    if (this.cameras.length < 2) {
      this.showError('Solo hay una cámara disponible');
      return;
    }
    
    try {
      // Detener escáner actual
      if (this.scanner && this.isScanning) {
        await this.scanner.stop();
        this.isScanning = false;
      }
      
      // Cambiar a siguiente cámara
      this.cameraIndex = (this.cameraIndex + 1) % this.cameras.length;
      const nextCameraId = this.cameras[this.cameraIndex].id;
      this.currentCameraId = nextCameraId;
      
      // Reiniciar escaneo con nueva cámara
      await this.startScanning(nextCameraId);
      
      // Mostrar mensaje
      this.showMessage(`Cámara: ${this.cameras[this.cameraIndex].label}`);
      
    } catch (error) {
      console.error('Error al cambiar cámara:', error);
      this.showError('Error al cambiar cámara');
    }
  }

  async closeScanner() {
    try {
      // Detener escáner si está activo
      if (this.scanner && this.isScanning) {
        await this.scanner.stop();
        this.isScanning = false;
      }
      
      // Limpiar escáner
      this.scanner = null;
      
      // Limpiar indicadores visuales
      const indicator = document.querySelector('.scan-indicator');
      const message = document.querySelector('.scan-message');
      if (indicator) indicator.remove();
      if (message) message.remove();
      
      // Ocultar modal
      this.qrScannerModal.style.display = 'none';
      this.qrScannerOverlay.style.display = 'none';
      
      // Limpiar contenedor del lector
      this.qrReader.innerHTML = '';
      
      // Restaurar foco al input
      setTimeout(() => {
        this.barcodeInput.focus();
      }, 300);
      
      // Actualizar estado
      this.statusDiv.className = 'ready';
      this.statusDiv.innerHTML = '<i class="fas fa-check-circle"></i> SISTEMA LISTO';
      
    } catch (error) {
      console.error('Error al cerrar escáner:', error);
      // Forzar cierre
      this.qrScannerModal.style.display = 'none';
      this.qrScannerOverlay.style.display = 'none';
      this.qrReader.innerHTML = '';
    }
  }

  playScanSuccessSound() {
    try {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.value = 800;
      oscillator.type = 'sine';
      gainNode.gain.value = 0.3;
      
      oscillator.start();
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
      oscillator.stop(audioContext.currentTime + 0.1);
      
    } catch (error) {
      console.log('No se pudo reproducir sonido:', error);
    }
  }

  showError(message) {
    // Mostrar mensaje de error temporal
    const errorDiv = document.createElement('div');
    errorDiv.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: var(--danger);
      color: white;
      padding: 15px 25px;
      border-radius: 12px;
      z-index: 10002;
      font-weight: 600;
      box-shadow: 0 5px 15px rgba(239, 68, 68, 0.3);
      animation: fade-in 0.3s ease-out;
    `;
    errorDiv.textContent = message;
    
    document.body.appendChild(errorDiv);
    
    setTimeout(() => {
      if (errorDiv.parentNode) {
        errorDiv.parentNode.removeChild(errorDiv);
      }
    }, 3000);
  }

  showMessage(message) {
    // Mostrar mensaje informativo temporal
    const messageDiv = document.createElement('div');
    messageDiv.style.cssText = `
      position: fixed;
      top: 20px;
      left: 50%;
      transform: translateX(-50%);
      background: var(--primary);
      color: white;
      padding: 10px 20px;
      border-radius: 8px;
      z-index: 10002;
      font-weight: 600;
      box-shadow: 0 3px 10px rgba(37, 99, 235, 0.3);
      animation: slide-down 0.3s ease-out;
    `;
    messageDiv.textContent = message;
    
    document.body.appendChild(messageDiv);
    
    setTimeout(() => {
      if (messageDiv.parentNode) {
        messageDiv.parentNode.removeChild(messageDiv);
      }
    }, 2000);
  }

  // Método para escanear programáticamente (desde otros módulos)
  scanQRCode() {
    this.openScanner();
  }

  // Método para verificar si el escáner está disponible
  isScannerAvailable() {
    return typeof Html5Qrcode !== 'undefined';
  }

  // Método para obtener el último código escaneado
  getLastScannedCode() {
    return this.barcodeInput ? this.barcodeInput.value : '';
  }
}

// Inicializar escáner QR cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
  // Esperar a que se cargue completamente la aplicación
  setTimeout(() => {
    if (typeof Html5Qrcode !== 'undefined') {
      window.qrScanner = new QRScanner();
      console.log('Escáner QR inicializado correctamente');
    } else {
      console.warn('Biblioteca QR no cargada. El escáner no estará disponible.');
      // Ocultar icono de escáner si la biblioteca no está disponible
      const qrIcon = document.getElementById('qrScannerIcon');
      if (qrIcon) {
        qrIcon.style.display = 'none';
      }
    }
  }, 1000);
});

// Exponer funciones globales para uso externo
window.openQRScanner = function() {
  if (window.qrScanner && window.qrScanner.isScannerAvailable()) {
    window.qrScanner.scanQRCode();
  } else {
    alert('El escáner QR no está disponible. Asegúrate de tener conexión a internet.');
  }
};

window.closeQRScanner = function() {
  if (window.qrScanner) {
    window.qrScanner.closeScanner();
  }
};