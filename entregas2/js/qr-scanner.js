// QR Scanner Module para PandaDash - VERSIÓN SIMPLIFICADA Y ARMÓNICA
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
      // Mostrar modal
      this.qrScannerModal.style.display = 'flex';
      this.qrScannerOverlay.style.display = 'block';
      
      // Limpiar input
      if (this.barcodeInput) this.barcodeInput.blur();
      
      // Limpiar contenedor
      this.qrReader.innerHTML = '<div class="scanner-loading"><div class="spinner"></div><p>Iniciando cámara...</p></div>';
      
      // Inicializar
      setTimeout(async () => {
        try {
          await this.initScanner();
        } catch (error) {
          console.error('Error:', error);
          this.closeScanner();
          this.showAlert('Error de cámara', 'No se pudo acceder a la cámara. Verifica los permisos.');
        }
      }, 300);
      
    } catch (error) {
      console.error('Error al abrir:', error);
      this.closeScanner();
    }
  }

  async initScanner() {
    try {
      this.scanner = new Html5Qrcode(this.qrReader.id);
      
      // Obtener cámaras
      const devices = await Html5Qrcode.getCameras();
      if (!devices || devices.length === 0) {
        throw new Error('No hay cámaras disponibles');
      }
      
      this.cameras = devices;
      
      // Seleccionar cámara trasera
      let selectedCameraId = devices[0].id;
      for (let i = 0; i < devices.length; i++) {
        const label = devices[i].label.toLowerCase();
        if (label.includes('back') || label.includes('rear') || label.includes('environment')) {
          selectedCameraId = devices[i].id;
          this.cameraIndex = i;
          break;
        }
      }
      
      this.currentCameraId = selectedCameraId;
      
      // Configuración MINIMAL
      const config = {
        fps: 10,
        qrbox: { width: 250, height: 250 },
        aspectRatio: 1.0,
        rememberLastUsedCamera: false
      };
      
      // Limpiar loading
      this.qrReader.innerHTML = '';
      
      // Iniciar
      await this.scanner.start(
        selectedCameraId,
        config,
        (decodedText) => this.onScanSuccess(decodedText),
        (errorMessage) => console.debug('Escaneando...')
      );
      
      this.isScanning = true;
      
      // Aplicar estilos ARMÓNICOS después de que el plugin se renderice
      setTimeout(() => this.applyHarmoniousStyles(), 500);
      
    } catch (error) {
      console.error('Error en init:', error);
      throw error;
    }
  }

  applyHarmoniousStyles() {
    // 1. Ocultar TODOS los elementos del plugin que no necesitamos
    this.hidePluginElements();
    
    // 2. Aplicar estilos al contenedor principal
    const container = document.getElementById('html5-qrcode-container');
    if (container) {
      container.style.cssText = `
        width: 100% !important;
        height: 100% !important;
        position: relative !important;
        background: #000 !important;
      `;
    }
    
    // 3. Estilizar el video
    const video = container?.querySelector('video');
    if (video) {
      video.style.cssText = `
        width: 100% !important;
        height: 100% !important;
        object-fit: cover !important;
        transform: scaleX(1) !important;
        filter: brightness(1.1) contrast(1.1) !important;
      `;
    }
    
    // 4. Crear overlay ARMÓNICO con PandaDash
    this.createHarmoniousOverlay();
  }

  hidePluginElements() {
    // Ocultar botones y controles del plugin
    const elementsToHide = [
      '#html5-qrcode-anchor-scan-type-change',
      '#html5-qrcode-button-camera-permission',
      '#html5-qrcode-button-camera-start',
      '#html5-qrcode-button-camera-stop',
      '#html5-qrcode-select-camera',
      '#html5-qrcode-camera-selection',
      '#html5qr-code-full-region',
      '.html5-qrcode-element'
    ];
    
    elementsToHide.forEach(selector => {
      const el = document.querySelector(selector);
      if (el) el.style.display = 'none';
    });
  }

  createHarmoniousOverlay() {
    // Eliminar overlay anterior si existe
    const oldOverlay = document.getElementById('pandadash-scanner-overlay');
    if (oldOverlay) oldOverlay.remove();
    
    // Crear overlay que combine con PandaDash
    const overlay = document.createElement('div');
    overlay.id = 'pandadash-scanner-overlay';
    overlay.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
      z-index: 10;
    `;
    
    // Marco de escaneo (armonioso con PandaDash)
    const frame = document.createElement('div');
    frame.className = 'scanner-frame';
    frame.style.cssText = `
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      width: 280px;
      height: 280px;
      border: 3px solid var(--primary);
      border-radius: 24px;
      box-shadow: 
        0 0 0 1000px rgba(0, 0, 0, 0.7),
        0 0 30px rgba(37, 99, 235, 0.3),
        inset 0 0 30px rgba(37, 99, 235, 0.1);
      pointer-events: none;
    `;
    
    // Esquinas decorativas (coherentes con PandaDash)
    const corners = ['tl', 'tr', 'bl', 'br'];
    corners.forEach(pos => {
      const corner = document.createElement('div');
      corner.className = `corner-${pos}`;
      corner.style.cssText = `
        position: absolute;
        width: 24px;
        height: 24px;
        border: 3px solid var(--primary);
      `;
      
      switch(pos) {
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
      
      frame.appendChild(corner);
    });
    
    // Línea de escaneo animada
    const scanLine = document.createElement('div');
    scanLine.className = 'scan-line';
    scanLine.style.cssText = `
      position: absolute;
      top: 0;
      left: 50%;
      transform: translateX(-50%);
      width: 220px;
      height: 3px;
      background: linear-gradient(to right, transparent, var(--primary), transparent);
      animation: scanMove 2s infinite ease-in-out;
      box-shadow: 0 0 10px var(--primary);
      border-radius: 3px;
    `;
    
    // Instrucciones (estilo PandaDash)
    const instructions = document.createElement('div');
    instructions.className = 'scanner-instructions';
    instructions.style.cssText = `
      position: absolute;
      bottom: 100px;
      left: 50%;
      transform: translateX(-50%);
      color: white;
      text-align: center;
      font-family: var(--font-main);
      font-size: 14px;
      font-weight: 500;
      background: rgba(0, 0, 0, 0.7);
      padding: 12px 24px;
      border-radius: 20px;
      backdrop-filter: blur(10px);
      border: 1px solid rgba(255, 255, 255, 0.1);
      white-space: nowrap;
    `;
    instructions.textContent = 'Apunta el código QR al marco';
    
    // Ensamblar
    overlay.appendChild(frame);
    frame.appendChild(scanLine);
    overlay.appendChild(instructions);
    
    // Agregar al DOM
    this.qrReader.appendChild(overlay);
    
    // Agregar animación CSS
    this.addScannerAnimations();
  }

  addScannerAnimations() {
    if (!document.getElementById('scanner-animations')) {
      const style = document.createElement('style');
      style.id = 'scanner-animations';
      style.textContent = `
        @keyframes scanMove {
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
        
        @keyframes scanSuccess {
          0% { 
            border-color: var(--primary);
            box-shadow: 0 0 30px rgba(37, 99, 235, 0.3);
          }
          50% { 
            border-color: var(--success);
            box-shadow: 0 0 40px rgba(16, 185, 129, 0.5);
          }
          100% { 
            border-color: var(--primary);
            box-shadow: 0 0 30px rgba(37, 99, 235, 0.3);
          }
        }
      `;
      document.head.appendChild(style);
    }
  }

  onScanSuccess(decodedText) {
    console.log('✅ QR detectado:', decodedText);
    
    // Efecto visual de éxito
    const frame = this.qrReader.querySelector('.scanner-frame');
    if (frame) {
      frame.style.animation = 'scanSuccess 0.8s ease-in-out';
    }
    
    // Sonido
    if (typeof playSuccessSound === 'function') {
      playSuccessSound();
    }
    
    // Insertar en input
    if (this.barcodeInput) {
      this.barcodeInput.value = decodedText;
      const inputEvent = new Event('input', { bubbles: true });
      this.barcodeInput.dispatchEvent(inputEvent);
    }
    
    // Cerrar después de breve pausa
    setTimeout(() => {
      this.closeScanner();
      // Limpiar input después
      setTimeout(() => {
        if (this.barcodeInput) {
          this.barcodeInput.value = '';
          this.barcodeInput.focus();
        }
      }, 100);
    }, 500);
  }

  async toggleCamera() {
    if (this.cameras.length < 2) return;
    
    try {
      // Detener actual
      if (this.scanner && this.isScanning) {
        await this.scanner.stop();
        this.isScanning = false;
      }
      
      // Cambiar cámara
      this.cameraIndex = (this.cameraIndex + 1) % this.cameras.length;
      this.currentCameraId = this.cameras[this.cameraIndex].id;
      
      // Reiniciar
      const config = {
        fps: 10,
        qrbox: { width: 250, height: 250 },
        aspectRatio: 1.0
      };
      
      await this.scanner.start(
        this.currentCameraId,
        config,
        (decodedText) => this.onScanSuccess(decodedText),
        (errorMessage) => console.debug('Escaneando...')
      );
      
      this.isScanning = true;
      
      // Reaplicar estilos
      setTimeout(() => this.applyHarmoniousStyles(), 300);
      
    } catch (error) {
      console.error('Error al cambiar cámara:', error);
    }
  }

  async closeScanner() {
    try {
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
      
      // Restaurar foco
      setTimeout(() => {
        if (this.barcodeInput) {
          this.barcodeInput.focus();
        }
      }, 200);
      
    } catch (error) {
      console.error('Error al cerrar:', error);
      // Forzar cierre
      this.qrScannerModal.style.display = 'none';
      this.qrScannerOverlay.style.display = 'none';
      this.qrReader.innerHTML = '';
    }
  }

  showAlert(title, message) {
    // Alert simple pero estilizado
    const alertDiv = document.createElement('div');
    alertDiv.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: var(--surface);
      color: var(--text-main);
      padding: 20px;
      border-radius: 16px;
      box-shadow: var(--shadow-floating);
      z-index: 10010;
      max-width: 300px;
      text-align: center;
      font-family: var(--font-main);
    `;
    
    alertDiv.innerHTML = `
      <h3 style="margin: 0 0 10px; color: var(--danger);">${title}</h3>
      <p style="margin: 0; color: var(--text-secondary);">${message}</p>
      <button style="
        margin-top: 15px;
        padding: 8px 20px;
        background: var(--primary);
        color: white;
        border: none;
        border-radius: 12px;
        font-weight: 600;
        cursor: pointer;
      " onclick="this.parentElement.remove()">Aceptar</button>
    `;
    
    document.body.appendChild(alertDiv);
  }
}

// Inicialización simple
document.addEventListener('DOMContentLoaded', () => {
  if (typeof Html5Qrcode !== 'undefined') {
    try {
      window.qrScanner = new QRScanner();
      console.log('🔄 QR Scanner listo');
    } catch (error) {
      console.error('Error al inicializar scanner:', error);
    }
  }
});