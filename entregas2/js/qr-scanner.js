// QR Scanner Module para PandaDash - VERSIÓN MEJORADA
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
    
    // Hacer el icono de QR más atractivo
    if (this.qrScannerIcon) {
      this.qrScannerIcon.style.cursor = 'pointer';
      this.qrScannerIcon.title = 'Escanear código QR';
      this.qrScannerIcon.addEventListener('mouseenter', () => {
        this.qrScannerIcon.style.color = 'var(--primary)';
      });
      this.qrScannerIcon.addEventListener('mouseleave', () => {
        this.qrScannerIcon.style.color = '';
      });
    }
  }

  initEventListeners() {
    // Icono QR para abrir escáner
    if (this.qrScannerIcon) {
      this.qrScannerIcon.addEventListener('click', (e) => {
        e.stopPropagation();
        this.openScanner();
      });
    }
    
    // Botones para cerrar
    this.closeQrScanner.addEventListener('click', (e) => {
      e.stopPropagation();
      this.closeScanner();
    });
    
    this.cancelQrScan.addEventListener('click', (e) => {
      e.stopPropagation();
      this.closeScanner();
    });
    
    // Botón para cambiar cámara
    this.toggleCameraBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.toggleCamera();
    });
    
    // Cerrar al hacer clic fuera
    this.qrScannerOverlay.addEventListener('click', (e) => {
      if (e.target === this.qrScannerOverlay) {
        this.closeScanner();
      }
    });
    
    // Prevenir gestos de zoom en el escáner
    this.qrReader.addEventListener('gesturestart', (e) => e.preventDefault());
    this.qrReader.addEventListener('gesturechange', (e) => e.preventDefault());
    this.qrReader.addEventListener('gestureend', (e) => e.preventDefault());
  }

  async openScanner() {
    try {
      // Mostrar modal y overlay
      this.qrScannerModal.style.display = 'flex';
      this.qrScannerOverlay.style.display = 'block';
      
      // Ocultar teclado si está visible
      this.barcodeInput.blur();
      
      // Limpiar contenedor anterior
      this.qrReader.innerHTML = '';
      
      // Mostrar loading
      this.showLoading();
      
      // Inicializar escáner después de un breve retraso
      setTimeout(async () => {
        try {
          await this.initScanner();
        } catch (error) {
          console.error('Error al iniciar escáner:', error);
          this.showError('Error al iniciar la cámara');
          this.closeScanner();
        }
      }, 300);
      
      // Actualizar estado
      this.updateStatus('loading', '<i class="fas fa-qrcode fa-spin"></i> INICIANDO ESCÁNER...');
      
    } catch (error) {
      console.error('Error al abrir escáner:', error);
      this.showError('No se pudo abrir el escáner');
      this.closeScanner();
    }
  }

  async initScanner() {
    try {
      // Crear nuevo escáner
      this.scanner = new Html5Qrcode(this.qrReader.id);
      
      // Configuración del escáner
      const config = {
        fps: 10,
        qrbox: { width: 250, height: 250 },
        aspectRatio: 1.0,
        rememberLastUsedCamera: true,
        showTorchButtonIfSupported: true,
        showZoomSliderIfSupported: true,
        defaultZoomValueIfSupported: 2
      };
      
      // Obtener cámaras disponibles
      const devices = await Html5Qrcode.getCameras();
      
      if (devices && devices.length > 0) {
        this.cameras = devices;
        
        // Encontrar cámara trasera por defecto
        let cameraId = devices[0].id;
        
        // Priorizar cámara trasera
        const backCamera = devices.find(device => 
          device.label.toLowerCase().includes('back') || 
          device.label.toLowerCase().includes('rear') ||
          device.label.toLowerCase().includes('environment')
        );
        
        if (backCamera) {
          cameraId = backCamera.id;
          this.cameraIndex = devices.findIndex(d => d.id === backCamera.id);
        }
        
        this.currentCameraId = cameraId;
        
        // Quitar loading
        this.hideLoading();
        
        // Iniciar escaneo
        await this.startScanning(cameraId, config);
        
      } else {
        throw new Error('No se encontraron cámaras disponibles');
      }
      
    } catch (error) {
      console.error('Error al inicializar escáner:', error);
      this.hideLoading();
      throw error;
    }
  }

  async startScanning(cameraId, config) {
    try {
      await this.scanner.start(
        cameraId,
        config,
        (decodedText) => this.onScanSuccess(decodedText),
        (errorMessage) => this.onScanError(errorMessage)
      );
      
      this.isScanning = true;
      
      // Crear indicador visual de escaneo
      this.createScanIndicator();
      
      // Actualizar estado
      this.updateStatus('ready', '<i class="fas fa-camera"></i> ESCANEANDO...');
      
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
    
    // Agregar línea de escaneo
    const scanLine = document.createElement('div');
    scanLine.className = 'scan-line';
    
    // Agregar esquinas
    const cornerTR = document.createElement('div');
    cornerTR.className = 'corner-tr';
    
    const cornerBL = document.createElement('div');
    cornerBL.className = 'corner-bl';
    
    indicator.appendChild(scanLine);
    indicator.appendChild(cornerTR);
    indicator.appendChild(cornerBL);
    
    // Crear mensaje
    const message = document.createElement('div');
    message.className = 'scan-message';
    message.textContent = 'Enfoca el código QR dentro del marco';
    
    this.qrReader.appendChild(indicator);
    this.qrReader.appendChild(message);
  }

  onScanSuccess(decodedText) {
    console.log('✅ QR escaneado:', decodedText);
    
    // Reproducir sonido de éxito
    this.playScanSuccessSound();
    
    // Aplicar efecto visual de éxito
    const indicator = document.querySelector('.scan-indicator');
    if (indicator) {
      indicator.classList.add('scan-success');
    }
    
    // Actualizar estado
    this.updateStatus('success', '<i class="fas fa-check-circle"></i> QR DETECTADO');
    
    // Insertar código en el input
    this.barcodeInput.value = decodedText;
    
    // Cerrar escáner inmediatamente
    this.closeScanner();
    
    // Procesar el código después de cerrar el escáner
    setTimeout(() => {
      // Simular entrada del usuario
      const inputEvent = new Event('input', { bubbles: true });
      this.barcodeInput.dispatchEvent(inputEvent);
      
      // Enfocar el input
      this.barcodeInput.focus();
      
      // Limpiar después de procesar
      setTimeout(() => {
        this.barcodeInput.value = '';
      }, 100);
    }, 300);
  }

  onScanError(errorMessage) {
    // Ignorar errores de "no se encontró código QR"
    if (errorMessage.includes('NotFoundException')) {
      return;
    }
    
    // Mostrar otros errores importantes
    if (!errorMessage.includes('NotAllowedError') && 
        !errorMessage.includes('NotReadableError')) {
      console.warn('⚠️ Error de escaneo:', errorMessage);
    }
  }

  async toggleCamera() {
    if (this.cameras.length < 2) {
      this.showToast('Solo hay una cámara disponible', 'warning');
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
      
      // Actualizar botón
      this.updateToggleButton();
      
      // Reiniciar escaneo con nueva cámara
      const config = {
        fps: 10,
        qrbox: { width: 250, height: 250 },
        aspectRatio: 1.0
      };
      
      await this.startScanning(nextCameraId, config);
      
      // Mostrar mensaje
      const cameraName = this.getCameraName(this.cameras[this.cameraIndex].label);
      this.showToast(`Cámara: ${cameraName}`, 'info');
      
    } catch (error) {
      console.error('Error al cambiar cámara:', error);
      this.showToast('Error al cambiar cámara', 'error');
    }
  }

  getCameraName(label) {
    if (label.toLowerCase().includes('back') || label.toLowerCase().includes('rear')) {
      return 'Trasera';
    } else if (label.toLowerCase().includes('front') || label.toLowerCase().includes('user')) {
      return 'Frontal';
    }
    
    // Extraer nombre corto
    const match = label.match(/Camera (\d+)|\((.*?)\)/);
    if (match && match[1]) {
      return match[1];
    } else if (match && match[2]) {
      return match[2];
    }
    
    return label.substring(0, 20);
  }

  updateToggleButton() {
    const icon = this.toggleCameraBtn.querySelector('i');
    if (this.cameraIndex % 2 === 0) {
      // Cámara trasera -> mostrar icono de cambiar a frontal
      icon.className = 'fas fa-camera';
      this.toggleCameraBtn.title = 'Cambiar a cámara frontal';
    } else {
      // Cámara frontal -> mostrar icono de cambiar a trasera
      icon.className = 'fas fa-camera-rotate';
      this.toggleCameraBtn.title = 'Cambiar a cámara trasera';
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
      
      // Limpiar contenedor
      this.qrReader.innerHTML = '';
      
      // Ocultar modal
      this.qrScannerModal.style.display = 'none';
      this.qrScannerOverlay.style.display = 'none';
      
      // Restaurar estado normal
      this.updateStatus('ready', '<i class="fas fa-check-circle"></i> SISTEMA LISTO');
      
      // Restaurar foco al input después de un breve retraso
      setTimeout(() => {
        if (this.barcodeInput) {
          this.barcodeInput.focus();
        }
      }, 400);
      
    } catch (error) {
      console.error('Error al cerrar escáner:', error);
      // Forzar cierre
      this.qrScannerModal.style.display = 'none';
      this.qrScannerOverlay.style.display = 'none';
      this.qrReader.innerHTML = '';
    }
  }

  showLoading() {
    const loadingDiv = document.createElement('div');
    loadingDiv.className = 'qr-scanner-loading';
    loadingDiv.innerHTML = `
      <i class="fas fa-spinner fa-spin"></i>
      <p style="margin: 0; font-size: 14px;">Iniciando cámara...</p>
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
      // Usar el sistema de sonido existente si está disponible
      if (typeof playSuccessSound === 'function') {
        playSuccessSound();
        return;
      }
      
      // Fallback: crear sonido simple
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.value = 800;
      oscillator.type = 'sine';
      gainNode.gain.value = 0.2;
      
      oscillator.start();
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
      oscillator.stop(audioContext.currentTime + 0.1);
      
    } catch (error) {
      console.log('No se pudo reproducir sonido:', error);
    }
  }

  updateStatus(type, html) {
    if (!this.statusDiv) return;
    
    this.statusDiv.className = type;
    this.statusDiv.innerHTML = html;
  }

  showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = 'queue-toast show';
    toast.style.cssText = `
      position: fixed;
      top: 20px;
      left: 50%;
      transform: translateX(-50%);
      background: ${type === 'error' ? 'var(--danger)' : 
                   type === 'warning' ? 'var(--warning)' : 
                   type === 'success' ? 'var(--success)' : 
                   'var(--primary)'};
      color: white;
      padding: 12px 24px;
      border-radius: 12px;
      z-index: 10002;
      font-weight: 600;
      box-shadow: var(--shadow-floating);
      animation: slideDown 0.3s ease-out;
    `;
    
    const icon = type === 'error' ? 'exclamation-circle' :
                 type === 'warning' ? 'exclamation-triangle' :
                 type === 'success' ? 'check-circle' : 'info-circle';
    
    toast.innerHTML = `<i class="fas fa-${icon}"></i> ${message}`;
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
      if (toast.parentNode) {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(-50%) translateY(-20px)';
        setTimeout(() => {
          if (toast.parentNode) {
            toast.parentNode.removeChild(toast);
          }
        }, 300);
      }
    }, 3000);
  }

  showError(message) {
    this.showToast(message, 'error');
  }

  // Método público para escanear programáticamente
  scanQRCode() {
    this.openScanner();
  }

  // Método para verificar si el escáner está disponible
  isScannerAvailable() {
    return typeof Html5Qrcode !== 'undefined';
  }
}

// Inicializar escáner QR cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
  // Esperar a que se cargue completamente la aplicación
  const initScanner = () => {
    if (typeof Html5Qrcode !== 'undefined') {
      try {
        window.qrScanner = new QRScanner();
        console.log('✅ Escáner QR inicializado correctamente');
        
        // Asegurar que el icono sea visible y funcional
        const qrIcon = document.getElementById('qrScannerIcon');
        if (qrIcon) {
          qrIcon.style.display = 'inline-block';
          qrIcon.style.cursor = 'pointer';
          qrIcon.style.transition = 'color 0.2s';
        }
      } catch (error) {
        console.error('❌ Error al inicializar escáner QR:', error);
      }
    } else {
      console.warn('⚠️ Biblioteca QR no cargada. El escáner no estará disponible.');
      // Ocultar icono de escáner si la biblioteca no está disponible
      const qrIcon = document.getElementById('qrScannerIcon');
      if (qrIcon) {
        qrIcon.style.display = 'none';
      }
    }
  };
  
  // Intentar inicializar inmediatamente
  initScanner();
  
  // También intentar después de que se cargue completamente
  if (document.readyState === 'complete') {
    setTimeout(initScanner, 1000);
  }
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