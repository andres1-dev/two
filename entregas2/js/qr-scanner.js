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

  // CRÍTICO: Solicitar permisos ANTES de abrir modal
  async requestCameraPermissions() {
    try {
      // En PWA iOS, necesitamos pedir permisos explícitamente
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
      return true;
    } catch (error) {
      console.error('Error al solicitar permisos de cámara:', error);
      this.permissionsGranted = false;
      
      // Mostrar mensaje específico según el error
      if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        this.showSimpleAlert('Por favor, permite el acceso a la cámara en la configuración de tu dispositivo.');
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
      // PASO 1: Solicitar permisos PRIMERO
      const hasPermissions = await this.requestCameraPermissions();
      if (!hasPermissions) {
        console.error('Permisos de cámara denegados');
        return;
      }

      // PASO 2: Ocultar teclado
      if (this.barcodeInput) this.barcodeInput.blur();
      
      // PASO 3: Mostrar modal a pantalla completa
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
      
      // PASO 4: Inicializar escáner con delay para PWA
      setTimeout(async () => {
        try {
          await this.initScanner();
        } catch (error) {
          console.error('Error al iniciar escáner:', error);
          this.closeScanner();
          this.showSimpleAlert('No se pudo iniciar el escáner. Intenta nuevamente.');
        }
      }, 200); // Aumentado de 100ms a 200ms para PWA
      
      // Actualizar estado
      this.updateStatus('loading', '<i class="fas fa-qrcode fa-spin"></i> INICIANDO ESCÁNER...');
      
    } catch (error) {
      console.error('Error al abrir escáner:', error);
      this.closeScanner();
    }
  }

  async initScanner() {
    try {
      // Verificar que Html5Qrcode esté disponible
      if (typeof Html5Qrcode === 'undefined') {
        throw new Error('Librería Html5Qrcode no disponible. Verifica tu conexión.');
      }

      // Crear nuevo escáner
      this.scanner = new Html5Qrcode(this.qrReader.id);
      
      // Obtener cámaras disponibles - CRÍTICO para PWA
      let devices;
      try {
        devices = await Html5Qrcode.getCameras();
      } catch (error) {
        console.error('Error al obtener cámaras:', error);
        // Reintentar con método alternativo
        devices = await navigator.mediaDevices.enumerateDevices()
          .then(deviceList => deviceList.filter(device => device.kind === 'videoinput'));
      }
      
      if (!devices || devices.length === 0) {
        throw new Error('No se encontraron cámaras disponibles');
      }
      
      this.cameras = devices;
      console.log(`✅ Cámaras detectadas: ${devices.length}`, devices);
      
      // BUSCAR CÁMARA TRASERA con prioridad
      let selectedCameraId = devices[0].id;
      let selectedCameraIndex = 0;
      
      for (let i = 0; i < devices.length; i++) {
        const label = (devices[i].label || '').toLowerCase();
        console.log(`Cámara ${i}: ${devices[i].label}`);
        
        if (label.includes('back') || 
            label.includes('rear') || 
            label.includes('environment') ||
            label.includes('trasera') ||
            label.includes('posterior') ||
            label.includes('trasero')) {
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
      // Configuración optimizada para PWA y dispositivos móviles
      const config = {
        fps: 15, // Reducido de 20 a 15 para mejor rendimiento en PWA
        qrbox: { width: 250, height: 250 },
        aspectRatio: 1.777778, // 16:9 ratio
        rememberLastUsedCamera: false,
        showTorchButtonIfSupported: true, // Activado para PWA
        showZoomSliderIfSupported: false,
        // NUEVO: Configuraciones adicionales para PWA
        videoConstraints: {
          facingMode: 'environment',
          advanced: [{ focusMode: 'continuous' }]
        }
      };
      
      // Agregar estilos para pantalla completa
      this.addFullScreenStyles();
      
      console.log('🎥 Iniciando escáner con cámara:', cameraId);
      
      // Iniciar escáner
      await this.scanner.start(
        cameraId,
        config,
        (decodedText) => this.onScanSuccess(decodedText),
        (errorMessage) => this.onScanError(errorMessage)
      );
      
      this.isScanning = true;
      console.log('✅ Escáner iniciado exitosamente');
      
      // Crear overlay visual para el área de escaneo
      this.createScanOverlay();
      
      // Actualizar estado
      this.updateStatus('ready', '<i class="fas fa-camera"></i> ESCANEANDO QR...');
      
    } catch (error) {
      console.error('❌ Error al iniciar escaneo:', error);
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
        z-index: 10000 !important;
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
        border: 3px solid var(--primary, #2563eb) !important;
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
      #html5qr-code-full-region__dashboard_section,
      #html5qr-code-full-region__dashboard_section_csr {
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
      
      /* Línea de escaneo animada */
      .qr-scan-line {
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        width: 240px;
        height: 3px;
        background: linear-gradient(90deg, transparent, var(--primary, #2563eb), transparent);
        animation: qr-scan-animation 2s ease-in-out infinite;
        opacity: 0.7;
      }
      
      @keyframes qr-scan-animation {
        0%, 100% {
          transform: translate(-50%, -120px);
        }
        50% {
          transform: translate(-50%, 120px);
        }
      }
      
      /* Instrucciones */
      .qr-scan-instructions {
        position: fixed;
        bottom: 120px;
        left: 50%;
        transform: translateX(-50%);
        color: white;
        text-align: center;
        font-size: 14px;
        background: rgba(0, 0, 0, 0.7);
        padding: 12px 24px;
        border-radius: 20px;
        backdrop-filter: blur(10px);
        z-index: 200;
      }
    `;
    
    // Remover estilos anteriores si existen
    const oldStyle = document.getElementById('qr-fullscreen-styles');
    if (oldStyle) oldStyle.remove();
    
    document.head.appendChild(style);
  }

  createScanOverlay() {
    // Crear overlay visual
    this.scanOverlay = document.createElement('div');
    this.scanOverlay.className = 'qr-scan-overlay';
    this.scanOverlay.innerHTML = `
      <div class="qr-scan-line"></div>
      <div class="qr-scan-instructions">
        <i class="fas fa-qrcode" style="font-size: 24px; margin-bottom: 8px; display: block;"></i>
        <strong>Apunta al código QR</strong><br>
        <small style="opacity: 0.8;">Se detectará automáticamente</small>
      </div>
    `;
    this.qrScannerModal.appendChild(this.scanOverlay);
  }

  onScanSuccess(decodedText) {
    console.log('✅ QR escaneado exitosamente:', decodedText);
    
    // Reproducir sonido de éxito
    this.playScanSuccessSound();
    
    // Vibrar si está disponible
    if (navigator.vibrate) {
      navigator.vibrate([100, 50, 100]);
    }
    
    // Actualizar estado visual
    this.updateStatus('success', '<i class="fas fa-check-circle"></i> ¡QR DETECTADO!');
    
    // Insertar el código en el input
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
      
      console.log('🔄 Cambiando a cámara:', this.cameras[this.cameraIndex].label);
      
      // Actualizar botón
      this.updateToggleButton();
      
      // Reiniciar escaneo
      await this.startFullScreenScanning(nextCameraId);
      
    } catch (error) {
      console.error('Error al cambiar cámara:', error);
      // Reintentar con cámara anterior
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
    const label = (this.cameras[this.cameraIndex]?.label || '').toLowerCase();
    
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
      
      // Restaurar estilos del modal
      this.qrScannerModal.style.display = 'none';
      this.qrScannerOverlay.style.display = 'none';
      
      // Restaurar posición normal
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
      
      console.log('✅ Escáner cerrado');
      
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
        <i class="fas fa-spinner fa-spin" style="font-size: 40px; margin-bottom: 16px; color: var(--primary, #2563eb);"></i>
        <p style="margin: 0; font-size: 16px; color: rgba(255,255,255,0.9);">Iniciando cámara...</p>
        <p style="margin: 8px 0 0 0; font-size: 12px; color: rgba(255,255,255,0.6);">Esto puede tardar unos segundos</p>
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