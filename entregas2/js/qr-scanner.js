// QR Scanner Module para PandaDash - VERSIÓN OPTIMIZADA
class QRScanner {
  constructor() {
    this.scanner = null;
    this.isScanning = false;
    this.currentCameraId = null;
    this.cameras = [];
    this.cameraIndex = -1; // -1 indica que no se ha seleccionado cámara aún
    
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
    
    // Mejorar el icono de QR
    if (this.qrScannerIcon) {
      this.qrScannerIcon.style.cursor = 'pointer';
      this.qrScannerIcon.title = 'Escanear código QR';
      this.qrScannerIcon.style.transition = 'color 0.2s, transform 0.2s';
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
    
    // Botón para cambiar cámara (mantenemos pero sin notificación)
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
  }

  async openScanner() {
    try {
      // Mostrar modal y overlay
      this.qrScannerModal.style.display = 'flex';
      this.qrScannerOverlay.style.display = 'block';
      
      // Ocultar teclado
      if (this.barcodeInput) this.barcodeInput.blur();
      
      // Limpiar contenedor anterior
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
      }, 300);
      
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
      
      // BUSCAR CÁMARA TRASERA POR DEFECTO (SIEMPRE)
      let selectedCameraId = devices[0].id;
      let selectedCameraIndex = 0;
      
      // Prioridad 1: Cámara con "environment" o "back" en el label
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
      
      // Prioridad 2: Si no hay "back", buscar cámara que NO sea frontal
      if (selectedCameraIndex === 0) {
        for (let i = 0; i < devices.length; i++) {
          const label = devices[i].label.toLowerCase();
          if (!label.includes('front') && 
              !label.includes('user') && 
              !label.includes('selfie')) {
            selectedCameraId = devices[i].id;
            selectedCameraIndex = i;
            break;
          }
        }
      }
      
      this.currentCameraId = selectedCameraId;
      this.cameraIndex = selectedCameraIndex;
      
      // Configuración del escáner
      const config = {
        fps: 10,
        qrbox: { width: 250, height: 250 },
        aspectRatio: 1.0,
        rememberLastUsedCamera: false,
        showTorchButtonIfSupported: false,
        showZoomSliderIfSupported: false
      };
      
      // Quitar loading
      this.hideLoading();
      
      // Iniciar escaneo con cámara seleccionada
      await this.startScanning(selectedCameraId, config);
      
      // Actualizar icono del botón de cambiar cámara
      this.updateToggleButton();
      
    } catch (error) {
      console.error('Error al inicializar escáner:', error);
      this.hideLoading();
      throw error;
    }
  }

  async startScanning(cameraId, config) {
    try {
      // Ajustar qrbox según el tamaño de pantalla
      const adjustedConfig = { ...config };
      const isMobile = window.innerWidth <= 500;
      const isSmallScreen = window.innerHeight <= 700;
      
      if (isSmallScreen) {
        adjustedConfig.qrbox = { width: 200, height: 200 };
      } else if (isMobile) {
        adjustedConfig.qrbox = { width: 220, height: 220 };
      }
      
      await this.scanner.start(
        cameraId,
        adjustedConfig,
        (decodedText) => this.onScanSuccess(decodedText),
        (errorMessage) => this.onScanError(errorMessage)
      );
      
      this.isScanning = true;
      
      // Crear indicador visual de escaneo (alineado con el canvas del plugin)
      this.createScanIndicator(adjustedConfig.qrbox.width);
      
      // Actualizar estado
      this.updateStatus('ready', '<i class="fas fa-camera"></i> ESCANEANDO QR...');
      
    } catch (error) {
      console.error('Error al iniciar escaneo:', error);
      throw error;
    }
  }

  createScanIndicator(qrboxSize) {
    // Eliminar indicadores anteriores
    this.removeExistingIndicators();
    
    // Calcular tamaño del indicador (qrbox + bordes)
    const indicatorSize = qrboxSize + 6; // +6 por el borde de 3px a cada lado
    
    // Crear contenedor del indicador
    const indicator = document.createElement('div');
    indicator.className = 'scan-indicator';
    indicator.style.width = `${indicatorSize}px`;
    indicator.style.height = `${indicatorSize}px`;
    
    // Crear línea de escaneo
    const scanLine = document.createElement('div');
    scanLine.className = 'scan-line';
    scanLine.style.width = `${qrboxSize - 50}px`; // Un poco más pequeño que el qrbox
    
    // Crear esquinas
    const cornerTR = document.createElement('div');
    cornerTR.className = 'corner-tr';
    
    const cornerBL = document.createElement('div');
    cornerBL.className = 'corner-bl';
    
    // Ensamblar
    indicator.appendChild(scanLine);
    indicator.appendChild(cornerTR);
    indicator.appendChild(cornerBL);
    
    // Crear mensaje
    const message = document.createElement('div');
    message.className = 'scan-message';
    message.textContent = 'Apunta el código QR al marco';
    
    // Agregar al DOM
    this.qrReader.appendChild(indicator);
    this.qrReader.appendChild(message);
  }

  removeExistingIndicators() {
    const indicators = this.qrReader.querySelectorAll('.scan-indicator, .scan-message');
    indicators.forEach(el => el.remove());
  }

  onScanSuccess(decodedText) {
    console.log('✅ QR escaneado:', decodedText);
    
    // Reproducir sonido de éxito
    this.playScanSuccessSound();
    
    // Efecto visual de éxito
    const indicator = this.qrReader.querySelector('.scan-indicator');
    if (indicator) {
      indicator.classList.add('scan-success');
    }
    
    // Actualizar estado
    this.updateStatus('success', '<i class="fas fa-check-circle"></i> QR DETECTADO');
    
    // Insertar código en el input
    if (this.barcodeInput) {
      this.barcodeInput.value = decodedText;
    }
    
    // Cerrar escáner inmediatamente
    this.closeScanner();
    
    // Procesar el código después de cerrar
    setTimeout(() => {
      if (this.barcodeInput) {
        // Disparar evento input para procesar automáticamente
        const inputEvent = new Event('input', { bubbles: true });
        this.barcodeInput.dispatchEvent(inputEvent);
        
        // Enfocar el input
        this.barcodeInput.focus();
        
        // Limpiar después de procesar
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
      // NO mostrar notificación, solo actualizar el botón
      this.updateToggleButton();
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
      
      // Actualizar botón (SIN NOTIFICACIÓN)
      this.updateToggleButton();
      
      // Reiniciar escaneo
      const config = {
        fps: 10,
        qrbox: { width: 250, height: 250 },
        aspectRatio: 1.0
      };
      
      await this.startScanning(nextCameraId, config);
      
    } catch (error) {
      console.error('Error al cambiar cámara:', error);
      // NO mostrar notificación de error
    }
  }

  updateToggleButton() {
    if (!this.toggleCameraBtn || this.cameras.length < 2) {
      // Ocultar botón si solo hay una cámara
      if (this.toggleCameraBtn) {
        this.toggleCameraBtn.style.display = 'none';
      }
      return;
    }
    
    // Mostrar botón
    this.toggleCameraBtn.style.display = 'flex';
    
    // Actualizar icono según la cámara actual
    const icon = this.toggleCameraBtn.querySelector('i');
    const label = this.cameras[this.cameraIndex]?.label.toLowerCase() || '';
    
    if (label.includes('front') || label.includes('user') || label.includes('selfie')) {
      // Cámara frontal -> mostrar icono para cambiar a trasera
      icon.className = 'fas fa-camera-rotate';
      this.toggleCameraBtn.title = 'Cambiar a cámara trasera';
    } else {
      // Cámara trasera u otra -> mostrar icono para cambiar a frontal
      icon.className = 'fas fa-camera';
      this.toggleCameraBtn.title = 'Cambiar a cámara frontal';
    }
  }

  async closeScanner() {
    try {
      // Detener escáner si está activo
      if (this.scanner && this.isScanning) {
        await this.scanner.stop();
        this.isScanning = false;
      }
      
      // Limpiar
      this.scanner = null;
      this.qrReader.innerHTML = '';
      
      // Ocultar modal
      this.qrScannerModal.style.display = 'none';
      this.qrScannerOverlay.style.display = 'none';
      
      // Restaurar estado normal
      this.updateStatus('ready', '<i class="fas fa-check-circle"></i> SISTEMA LISTO');
      
      // Restaurar foco
      setTimeout(() => {
        if (this.barcodeInput) {
          this.barcodeInput.focus();
        }
      }, 300);
      
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
      <p style="margin: 10px 0 0; font-size: 14px; color: rgba(255,255,255,0.8);">Preparando cámara...</p>
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
      // Usar sistema de sonido existente de app.js
      if (typeof playSuccessSound === 'function') {
        playSuccessSound();
      } else {
        // Fallback simple
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
      // Silenciar error de sonido
    }
  }

  updateStatus(type, html) {
    if (!this.statusDiv) return;
    
    this.statusDiv.className = type;
    this.statusDiv.innerHTML = html;
  }

  showSimpleAlert(message) {
    // Alert simple sin notificaciones invasivas
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

// Inicialización optimizada
document.addEventListener('DOMContentLoaded', () => {
  const initScanner = () => {
    if (typeof Html5Qrcode !== 'undefined') {
      try {
        window.qrScanner = new QRScanner();
        console.log('✅ Escáner QR optimizado inicializado');
        
        // Asegurar que el icono sea visible
        const qrIcon = document.getElementById('qrScannerIcon');
        if (qrIcon) {
          qrIcon.style.display = 'inline-block';
        }
      } catch (error) {
        console.error('Error al inicializar escáner:', error);
      }
    } else {
      // Ocultar icono si no hay soporte
      const qrIcon = document.getElementById('qrScannerIcon');
      if (qrIcon) {
        qrIcon.style.display = 'none';
      }
    }
  };
  
  // Intentar inicializar
  initScanner();
  
  // Reintentar si es necesario
  if (document.readyState === 'complete') {
    setTimeout(initScanner, 500);
  }
});

// API global minimalista
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