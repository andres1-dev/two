// QR Scanner Module para PandaDash - VERSIÓN MEJORADA Y CORREGIDA
class QRScanner {
  constructor() {
    this.scanner = null;
    this.isScanning = false;
    this.currentCameraId = null;
    this.cameras = [];
    this.cameraIndex = -1;
    
    // Elementos personalizados para overlay
    this.customIndicator = null;
    this.customMessage = null;
    this.indicatorStyle = null;
    
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
    
    // Manejar redimensionamiento de ventana
    window.addEventListener('resize', () => {
      if (this.isScanning) {
        this.updateIndicatorPosition();
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
      
      // BUSCAR CÁMARA TRASERA POR DEFECTO
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
      
      // Configuración del escáner optimizada
      const config = {
        fps: 15,
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
      
      // Agregar estilos personalizados para el plugin
      this.addCustomStyles();
      
      // Iniciar el escáner
      await this.scanner.start(
        cameraId,
        adjustedConfig,
        (decodedText) => this.onScanSuccess(decodedText),
        (errorMessage) => this.onScanError(errorMessage)
      );
      
      this.isScanning = true;
      
      // Esperar un momento y luego crear el indicador
      setTimeout(() => {
        this.createScanIndicator(adjustedConfig.qrbox.width);
      }, 800);
      
      // Actualizar estado
      this.updateStatus('ready', '<i class="fas fa-camera"></i> ESCANEANDO QR...');
      
    } catch (error) {
      console.error('Error al iniciar escaneo:', error);
      throw error;
    }
  }

  addCustomStyles() {
    // Remover estilos anteriores si existen
    if (this.indicatorStyle) {
      this.indicatorStyle.remove();
    }
    
    // Crear nuevos estilos para el plugin
    this.indicatorStyle = document.createElement('style');
    this.indicatorStyle.textContent = `
      /* Estilos para el canvas del plugin */
      #html5-qrcode-container canvas {
        border-radius: 24px !important;
        overflow: hidden !important;
      }
      
      /* Región sombreada del plugin */
      #html5-qrcode-container .qr-shaded-region {
        stroke-width: 3px !important;
        stroke: var(--primary) !important;
        stroke-dasharray: none !important;
        fill-opacity: 0.7 !important;
      }
      
      /* Video de la cámara */
      #html5-qrcode-container video {
        object-fit: cover !important;
        width: 100% !important;
        height: 100% !important;
      }
    `;
    
    document.head.appendChild(this.indicatorStyle);
  }

  createScanIndicator(qrboxSize) {
    // Eliminar indicadores anteriores
    this.removeExistingIndicators();
    
    // Buscar el canvas del plugin
    const findCanvas = () => {
      return document.querySelector('#html5-qrcode-container canvas, #qr-canvas, canvas');
    };
    
    let attempts = 0;
    const maxAttempts = 10;
    
    const tryCreateIndicator = () => {
      const canvas = findCanvas();
      
      if (canvas) {
        const canvasRect = canvas.getBoundingClientRect();
        
        // Solo crear si el canvas tiene dimensiones válidas
        if (canvasRect.width > 10 && canvasRect.height > 10) {
          // Crear contenedor del indicador
          const indicator = document.createElement('div');
          indicator.className = 'scan-indicator';
          indicator.style.position = 'fixed';
          indicator.style.left = `${canvasRect.left}px`;
          indicator.style.top = `${canvasRect.top}px`;
          indicator.style.width = `${canvasRect.width}px`;
          indicator.style.height = `${canvasRect.height}px`;
          indicator.style.pointerEvents = 'none';
          indicator.style.zIndex = '100';
          indicator.style.boxSizing = 'border-box';
          indicator.style.border = '3px solid var(--primary)';
          indicator.style.borderRadius = '24px';
          indicator.style.boxShadow = '0 0 30px rgba(37, 99, 235, 0.5)';
          
          // Crear línea de escaneo
          const scanLine = document.createElement('div');
          scanLine.className = 'scan-line';
          scanLine.style.position = 'absolute';
          scanLine.style.left = '10%';
          scanLine.style.width = '80%';
          scanLine.style.height = '3px';
          scanLine.style.background = 'linear-gradient(to right, transparent, var(--primary), transparent)';
          scanLine.style.boxShadow = '0 0 10px var(--primary)';
          scanLine.style.borderRadius = '3px';
          scanLine.style.animation = 'scan-line-move 2s infinite ease-in-out';
          
          // Crear esquinas
          const createCorner = (position) => {
            const corner = document.createElement('div');
            corner.className = `corner-${position}`;
            corner.style.position = 'absolute';
            corner.style.width = '24px';
            corner.style.height = '24px';
            corner.style.border = '3px solid var(--primary)';
            
            switch(position) {
              case 'tl':
                corner.style.top = '-3px';
                corner.style.left = '-3px';
                corner.style.borderRight = 'none';
                corner.style.borderBottom = 'none';
                corner.style.borderRadius = '8px 0 0 0';
                break;
              case 'tr':
                corner.style.top = '-3px';
                corner.style.right = '-3px';
                corner.style.borderLeft = 'none';
                corner.style.borderBottom = 'none';
                corner.style.borderRadius = '0 8px 0 0';
                break;
              case 'bl':
                corner.style.bottom = '-3px';
                corner.style.left = '-3px';
                corner.style.borderRight = 'none';
                corner.style.borderTop = 'none';
                corner.style.borderRadius = '0 0 0 8px';
                break;
              case 'br':
                corner.style.bottom = '-3px';
                corner.style.right = '-3px';
                corner.style.borderLeft = 'none';
                corner.style.borderTop = 'none';
                corner.style.borderRadius = '0 0 8px 0';
                break;
            }
            
            return corner;
          };
          
          // Agregar elementos
          indicator.appendChild(scanLine);
          indicator.appendChild(createCorner('tl'));
          indicator.appendChild(createCorner('tr'));
          indicator.appendChild(createCorner('bl'));
          indicator.appendChild(createCorner('br'));
          
          // Crear mensaje
          const message = document.createElement('div');
          message.className = 'scan-message';
          message.textContent = 'Apunta el código QR al marco';
          message.style.position = 'fixed';
          message.style.top = `${canvasRect.bottom + 20}px`;
          message.style.left = '50%';
          message.style.transform = 'translateX(-50%)';
          message.style.color = 'white';
          message.style.fontSize = '14px';
          message.style.fontWeight = '500';
          message.style.background = 'rgba(0, 0, 0, 0.8)';
          message.style.padding = '12px 24px';
          message.style.borderRadius = '20px';
          message.style.border = '1px solid rgba(255, 255, 255, 0.2)';
          message.style.backdropFilter = 'blur(10px)';
          message.style.zIndex = '101';
          
          // Agregar al DOM
          document.body.appendChild(indicator);
          document.body.appendChild(message);
          
          // Guardar referencias
          this.customIndicator = indicator;
          this.customMessage = message;
          
          // Agregar animación CSS si no existe
          this.addScanLineAnimation();
          
          return true;
        }
      }
      
      return false;
    };
    
    // Intentar crear el indicador
    const interval = setInterval(() => {
      attempts++;
      
      if (tryCreateIndicator() || attempts >= maxAttempts) {
        clearInterval(interval);
        
        if (attempts >= maxAttempts && !this.customIndicator) {
          console.warn('No se pudo crear el indicador después de múltiples intentos');
        }
      }
    }, 200);
  }

  addScanLineAnimation() {
    // Agregar animación CSS si no existe
    if (!document.querySelector('#scan-line-animation')) {
      const style = document.createElement('style');
      style.id = 'scan-line-animation';
      style.textContent = `
        @keyframes scan-line-move {
          0% {
            top: 0;
            opacity: 1;
          }
          50% {
            top: calc(100% - 3px);
            opacity: 0.8;
          }
          100% {
            top: 0;
            opacity: 1;
          }
        }
      `;
      document.head.appendChild(style);
    }
  }

  updateIndicatorPosition() {
    if (!this.customIndicator) return;
    
    const canvas = document.querySelector('#html5-qrcode-container canvas, #qr-canvas, canvas');
    if (canvas) {
      const canvasRect = canvas.getBoundingClientRect();
      
      this.customIndicator.style.left = `${canvasRect.left}px`;
      this.customIndicator.style.top = `${canvasRect.top}px`;
      this.customIndicator.style.width = `${canvasRect.width}px`;
      this.customIndicator.style.height = `${canvasRect.height}px`;
      
      if (this.customMessage) {
        this.customMessage.style.top = `${canvasRect.bottom + 20}px`;
      }
    }
  }

  removeExistingIndicators() {
    // Remover elementos personalizados
    if (this.customIndicator) {
      this.customIndicator.remove();
      this.customIndicator = null;
    }
    if (this.customMessage) {
      this.customMessage.remove();
      this.customMessage = null;
    }
    
    // Remover cualquier elemento antiguo
    const oldIndicators = document.querySelectorAll('.scan-indicator, .scan-message, .corner-tl, .corner-tr, .corner-bl, .corner-br');
    oldIndicators.forEach(el => el.remove());
  }

  onScanSuccess(decodedText) {
    console.log('✅ QR escaneado:', decodedText);
    
    // Reproducir sonido de éxito
    this.playScanSuccessSound();
    
    // Efecto visual de éxito
    if (this.customIndicator) {
      this.customIndicator.style.animation = 'scan-success 0.8s ease-in-out';
      setTimeout(() => {
        if (this.customIndicator) {
          this.customIndicator.style.animation = '';
        }
      }, 800);
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
      this.updateToggleButton();
      return;
    }
    
    try {
      // Remover indicadores actuales
      this.removeExistingIndicators();
      
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
      
      // Reiniciar escaneo
      const config = {
        fps: 15,
        qrbox: { width: 250, height: 250 },
        aspectRatio: 1.0
      };
      
      await this.startScanning(nextCameraId, config);
      
    } catch (error) {
      console.error('Error al cambiar cámara:', error);
      // Reintentar con la cámara anterior
      try {
        const config = {
          fps: 15,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1.0
        };
        
        const prevCameraIndex = (this.cameraIndex - 1 + this.cameras.length) % this.cameras.length;
        this.cameraIndex = prevCameraIndex;
        this.currentCameraId = this.cameras[prevCameraIndex].id;
        
        await this.startScanning(this.currentCameraId, config);
      } catch (retryError) {
        console.error('Error al reintentar cámara:', retryError);
        this.closeScanner();
      }
    }
  }

  updateToggleButton() {
    if (!this.toggleCameraBtn || this.cameras.length < 2) {
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
      icon.className = 'fas fa-camera-rotate';
      this.toggleCameraBtn.title = 'Cambiar a cámara trasera';
    } else {
      icon.className = 'fas fa-camera';
      this.toggleCameraBtn.title = 'Cambiar a cámara frontal';
    }
  }

  async closeScanner() {
    try {
      // Remover indicadores
      this.removeExistingIndicators();
      
      // Remover estilos personalizados
      if (this.indicatorStyle) {
        this.indicatorStyle.remove();
        this.indicatorStyle = null;
      }
      
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
      this.removeExistingIndicators();
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