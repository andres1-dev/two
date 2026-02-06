// QR Scanner Module para PandaDash - VERSIÓN OPTIMIZADA PARA PWA
class QRScanner {
  constructor() {
    this.scanner = null;
    this.isScanning = false;
    this.currentCameraId = null;
    this.cameras = [];
    this.cameraIndex = -1;
    this.permissionsGranted = false;
    
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
    
    if (this.closeQrScanner) {
      this.closeQrScanner.addEventListener('click', (e) => {
        e.stopPropagation();
        this.closeScanner();
      });
    }
    
    if (this.cancelQrScan) {
      this.cancelQrScan.addEventListener('click', (e) => {
        e.stopPropagation();
        this.closeScanner();
      });
    }
    
    if (this.toggleCameraBtn) {
      this.toggleCameraBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.toggleCamera();
      });
    }
    
    if (this.qrScannerOverlay) {
      this.qrScannerOverlay.addEventListener('click', (e) => {
        if (e.target === this.qrScannerOverlay) {
          this.closeScanner();
        }
      });
    }
  }

  // CRÍTICO: Solicitar permisos ANTES de abrir modal (necesario para PWA)
  async requestCameraPermissions() {
    try {
      console.log('🎥 Solicitando permisos de cámara...');
      
      const constraints = {
        video: {
          facingMode: 'environment' // Cámara trasera por defecto
        },
        audio: false
      };

      // Solicitar acceso temporal para verificar permisos
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      
      // Detener el stream inmediatamente - solo queríamos verificar permisos
      stream.getTracks().forEach(track => track.stop());
      
      this.permissionsGranted = true;
      console.log('✅ Permisos de cámara concedidos');
      return true;
    } catch (error) {
      console.error('❌ Error al solicitar permisos de cámara:', error);
      this.permissionsGranted = false;
      
      // Mostrar mensaje específico según el error
      if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        this.showSimpleAlert('Por favor, permite el acceso a la cámara en la configuración de tu dispositivo para usar el escáner QR.');
      } else if (error.name === 'NotFoundError') {
        this.showSimpleAlert('No se encontró ninguna cámara en tu dispositivo.');
      } else {
        this.showSimpleAlert('No se pudo acceder a la cámara. Error: ' + error.name);
      }
      
      return false;
    }
  }

  async openScanner() {
    try {
      console.log('🚀 Abriendo escáner QR...');
      
      // PASO 1: Solicitar permisos PRIMERO (CRÍTICO para PWA)
      const hasPermissions = await this.requestCameraPermissions();
      if (!hasPermissions) {
        console.error('⚠️ Permisos de cámara denegados');
        return;
      }

      // PASO 2: Ocultar teclado
      if (this.barcodeInput) this.barcodeInput.blur();
      
      // PASO 3: Mostrar modal
      this.qrScannerModal.style.display = 'flex';
      this.qrScannerOverlay.style.display = 'block';
      
      // Limpiar contenedor
      this.qrReader.innerHTML = '';
      
      // Mostrar loading
      this.showLoading();
      
      // PASO 4: Inicializar escáner con delay (importante para PWA)
      setTimeout(async () => {
        try {
          await this.initScanner();
        } catch (error) {
          console.error('❌ Error al iniciar escáner:', error);
          this.closeScanner();
          this.showSimpleAlert('No se pudo iniciar el escáner. Por favor, intenta nuevamente.');
        }
      }, 200); // Delay de 200ms para PWA
      
      // Actualizar estado
      this.updateStatus('loading', '<i class="fas fa-qrcode fa-spin"></i> INICIANDO ESCÁNER...');
      
    } catch (error) {
      console.error('❌ Error al abrir escáner:', error);
      this.closeScanner();
    }
  }

  async initScanner() {
    try {
      console.log('🔧 Inicializando escáner...');
      
      // Verificar que Html5Qrcode esté disponible
      if (typeof Html5Qrcode === 'undefined') {
        throw new Error('Librería Html5Qrcode no disponible. Verifica tu conexión.');
      }

      // Crear nuevo escáner
      this.scanner = new Html5Qrcode(this.qrReader.id);
      
      // Obtener cámaras disponibles
      let devices;
      try {
        devices = await Html5Qrcode.getCameras();
      } catch (error) {
        console.warn('⚠️ Usando método alternativo para obtener cámaras');
        // Método alternativo
        devices = await navigator.mediaDevices.enumerateDevices()
          .then(deviceList => deviceList.filter(device => device.kind === 'videoinput'));
      }
      
      if (!devices || devices.length === 0) {
        throw new Error('No se encontraron cámaras disponibles');
      }
      
      this.cameras = devices;
      console.log(`✅ Cámaras detectadas: ${devices.length}`);
      
      // BUSCAR CÁMARA TRASERA con prioridad
      let selectedCameraId = devices[0].id;
      let selectedCameraIndex = 0;
      
      for (let i = 0; i < devices.length; i++) {
        const label = (devices[i].label || '').toLowerCase();
        console.log(`📷 Cámara ${i}: ${devices[i].label || 'Sin nombre'}`);
        
        if (label.includes('back') || 
            label.includes('rear') || 
            label.includes('environment') ||
            label.includes('trasera') ||
            label.includes('posterior')) {
          selectedCameraId = devices[i].id;
          selectedCameraIndex = i;
          console.log(`✅ Cámara trasera seleccionada: ${devices[i].label}`);
          break;
        }
      }
      
      this.currentCameraId = selectedCameraId;
      this.cameraIndex = selectedCameraIndex;
      
      // Quitar loading
      this.hideLoading();
      
      // Iniciar escaneo
      await this.startScanning(selectedCameraId);
      
      // Actualizar botón de cámara
      this.updateToggleButton();
      
    } catch (error) {
      console.error('❌ Error al inicializar escáner:', error);
      this.hideLoading();
      throw error;
    }
  }

  async startScanning(cameraId) {
    try {
      console.log('🎥 Iniciando escaneo con cámara:', cameraId);
      
      // Configuración optimizada para PWA
      const config = {
        fps: 15, // Reducido para mejor rendimiento
        qrbox: { width: 250, height: 250 },
        aspectRatio: 1.0,
        rememberLastUsedCamera: false,
        showTorchButtonIfSupported: true,
        showZoomSliderIfSupported: false,
        videoConstraints: {
          facingMode: 'environment',
          advanced: [{ focusMode: 'continuous' }]
        }
      };
      
      // Agregar estilos dinámicos
      this.addScannerStyles();
      
      // Iniciar escáner
      await this.scanner.start(
        cameraId,
        config,
        (decodedText) => this.onScanSuccess(decodedText),
        (errorMessage) => this.onScanError(errorMessage)
      );
      
      this.isScanning = true;
      console.log('✅ Escáner iniciado exitosamente');
      
      // Crear overlay visual
      this.createScanOverlay();
      
      // Actualizar estado
      this.updateStatus('ready', '<i class="fas fa-camera"></i> ESCANEANDO QR...');
      
    } catch (error) {
      console.error('❌ Error al iniciar escaneo:', error);
      throw error;
    }
  }

  addScannerStyles() {
    // Remover estilos anteriores si existen
    const oldStyle = document.getElementById('qr-fullscreen-styles');
    if (oldStyle) oldStyle.remove();
    
    // Crear estilos dinámicos
    const style = document.createElement('style');
    style.id = 'qr-fullscreen-styles';
    style.textContent = `
      /* Ocultar elementos innecesarios de la librería */
      #html5-qrcode-anchor-scan-type-change,
      #html5-qrcode-button-camera-permission,
      #html5-qrcode-button-camera-start,
      #html5-qrcode-button-camera-stop,
      #html5qr-code-full-region__dashboard_section,
      #html5qr-code-full-region__dashboard_section_csr {
        display: none !important;
      }
      
      /* Contenedor de la librería */
      #html5-qrcode-container {
        width: 100% !important;
        height: 100% !important;
        position: relative !important;
        background: #000 !important;
      }
      
      /* Video de la cámara */
      #html5-qrcode-container video {
        width: 100% !important;
        height: 100% !important;
        object-fit: cover !important;
      }
    `;
    
    document.head.appendChild(style);
  }

  createScanOverlay() {
    // Crear overlay contenedor
    const overlay = document.createElement('div');
    overlay.className = 'qr-scan-overlay-custom';
    overlay.innerHTML = `
      <div class="qr-scan-frame">
        <div class="qr-corner qr-corner-tl"></div>
        <div class="qr-corner qr-corner-tr"></div>
        <div class="qr-corner qr-corner-bl"></div>
        <div class="qr-corner qr-corner-br"></div>
        <div class="qr-scan-line"></div>
      </div>
      <div class="qr-instruction">
        <i class="fas fa-qrcode"></i>
        Apunta el código QR al marco
      </div>
    `;
    
    // Agregar al modal
    this.qrScannerModal.appendChild(overlay);
    
    // Guardar referencia
    this.scanOverlay = overlay;
  }

  onScanSuccess(decodedText) {
    console.log('✅ QR escaneado exitosamente:', decodedText);
    
    // Efecto visual de éxito
    if (this.scanOverlay) {
      const corners = this.scanOverlay.querySelectorAll('.qr-corner');
      corners.forEach(corner => {
        corner.style.borderColor = '#10b981';
        corner.style.boxShadow = '0 0 20px #10b981';
      });
    }
    
    // Sonido de éxito
    this.playScanSuccessSound();
    
    // Vibración
    if (navigator.vibrate) {
      navigator.vibrate([100, 50, 100]);
    }
    
    // Actualizar estado
    this.updateStatus('success', '<i class="fas fa-check-circle"></i> ¡QR DETECTADO!');
    
    // Insertar código en el input
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
    // Solo loguear errores importantes (no NotFoundException que es normal)
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
      console.log('🔄 Cambiando de cámara...');
      
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
      
      console.log('📷 Usando cámara:', this.cameras[this.cameraIndex].label);
      
      // Actualizar botón
      this.updateToggleButton();
      
      // Reiniciar escaneo
      await this.startScanning(nextCameraId);
      
    } catch (error) {
      console.error('❌ Error al cambiar cámara:', error);
      // Reintentar con cámara anterior
      try {
        const prevCameraIndex = (this.cameraIndex - 1 + this.cameras.length) % this.cameras.length;
        this.cameraIndex = prevCameraIndex;
        this.currentCameraId = this.cameras[prevCameraIndex].id;
        
        await this.startScanning(this.currentCameraId);
      } catch (retryError) {
        console.error('❌ Error al reintentar cámara:', retryError);
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
    const label = (this.cameras[this.cameraIndex]?.label || '').toLowerCase();
    
    if (label.includes('front') || label.includes('user') || label.includes('selfie')) {
      if (icon) icon.className = 'fas fa-camera-rotate';
      this.toggleCameraBtn.title = 'Cambiar a cámara trasera';
    } else {
      if (icon) icon.className = 'fas fa-camera';
      this.toggleCameraBtn.title = 'Cambiar a cámara frontal';
    }
  }

  async closeScanner() {
    try {
      console.log('🔴 Cerrando escáner...');
      
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
      
      // Ocultar modal
      this.qrScannerModal.style.display = 'none';
      this.qrScannerOverlay.style.display = 'none';
      
      // Restaurar estado
      this.updateStatus('ready', '<i class="fas fa-check-circle"></i> SISTEMA LISTO');
      
      // Restaurar foco
      setTimeout(() => {
        if (this.barcodeInput) {
          this.barcodeInput.focus();
        }
      }, 300);
      
      console.log('✅ Escáner cerrado');
      
    } catch (error) {
      console.error('❌ Error al cerrar escáner:', error);
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
      <div class="qr-loading-content">
        <i class="fas fa-spinner fa-spin"></i>
        <p>Iniciando cámara...</p>
        <small>Esto puede tardar unos segundos</small>
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
      console.debug('No se pudo reproducir sonido');
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

  // Método público para abrir desde código externo
  scanQRCode() {
    this.openScanner();
  }

  // Verificar disponibilidad
  isScannerAvailable() {
    return typeof Html5Qrcode !== 'undefined';
  }
}

// Inicialización mejorada con reintentos
document.addEventListener('DOMContentLoaded', () => {
  let initAttempts = 0;
  const maxAttempts = 5;
  
  const initScanner = () => {
    if (typeof Html5Qrcode !== 'undefined') {
      try {
        window.qrScanner = new QRScanner();
        console.log('✅ Escáner QR inicializado correctamente');
        
        const qrIcon = document.getElementById('qrScannerIcon');
        if (qrIcon) {
          qrIcon.style.display = 'inline-block';
          qrIcon.style.opacity = '1';
        }
      } catch (error) {
        console.error('❌ Error al inicializar escáner:', error);
      }
    } else {
      initAttempts++;
      console.log(`⏳ Esperando librería Html5Qrcode... intento ${initAttempts}/${maxAttempts}`);
      
      if (initAttempts < maxAttempts) {
        // Reintentar cada 500ms
        setTimeout(initScanner, 500);
      } else {
        console.error('❌ No se pudo cargar la librería Html5Qrcode después de varios intentos');
        const qrIcon = document.getElementById('qrScannerIcon');
        if (qrIcon) {
          qrIcon.style.display = 'none';
        }
      }
    }
  };
  
  // Inicializar inmediatamente
  initScanner();
  
  // Reintentar después de que todo cargue
  if (document.readyState === 'complete') {
    setTimeout(initScanner, 1000);
  } else {
    window.addEventListener('load', () => {
      setTimeout(initScanner, 1000);
    });
  }
});

// API global para compatibilidad
window.openQRScanner = function() {
  if (window.qrScanner && window.qrScanner.isScannerAvailable()) {
    window.qrScanner.scanQRCode();
  } else {
    console.error('Escáner QR no disponible');
    alert('El escáner QR no está disponible. Por favor, recarga la aplicación.');
  }
};

window.closeQRScanner = function() {
  if (window.qrScanner) {
    window.qrScanner.closeScanner();
  }
};