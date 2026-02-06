// QR Scanner Module para PandaDash - VERSIÓN MEJORADA (Adaptada de otroFuncionalccsandjs.js)

class QRScanner {
  constructor() {
    this.scanner = null;
    this.isScanning = false;
    this.currentCameraId = null;
    this.cameras = [];
    this.cameraIndex = 0;

    this.initElements();
    this.initEventListeners();

    console.log("QR Scanner Module Initialized (Reference Version)");
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

    // Hacer el icono de QR más atractivo
    if (this.qrScannerIcon) {
      this.qrScannerIcon.style.cursor = 'pointer';
      this.qrScannerIcon.title = 'Escanear código QR';
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

    // Botón para cambiar cámara
    if (this.toggleCameraBtn) {
      this.toggleCameraBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.toggleCamera();
      });
    }

    // Cerrar al hacer clic fuera (si existe el overlay)
    if (this.qrScannerOverlay) {
      this.qrScannerOverlay.addEventListener('click', (e) => {
        if (e.target === this.qrScannerOverlay) {
          this.closeScanner();
        }
      });
    }
  }

  // Compatibilidad con app.js
  scanQRCode() {
    this.openScanner();
  }

  async openScanner() {
    try {
      // Mostrar modal y overlay
      if (this.qrScannerModal) this.qrScannerModal.style.display = 'flex';
      if (this.qrScannerOverlay) this.qrScannerOverlay.style.display = 'block';

      // Ocultar teclado si está visible
      if (this.barcodeInput) this.barcodeInput.blur();

      // Limpiar contenedor anterior
      if (this.qrReader) this.qrReader.innerHTML = '';

      // Mostrar loading
      this.showLoading();

      // Inicializar escáner después de un breve retraso
      setTimeout(async () => {
        try {
          await this.initScanner();
        } catch (error) {
          console.error('Error al iniciar escáner:', error);
          alert('Error al iniciar la cámara: ' + error.message);
          this.closeScanner();
        }
      }, 300);

    } catch (error) {
      console.error('Error al abrir escáner:', error);
      alert('No se pudo abrir el escáner');
      this.closeScanner();
    }
  }

  async initScanner() {
    try {
      if (!this.qrReader) throw new Error("No qrReader element found");

      // Crear nuevo escáner
      this.scanner = new Html5Qrcode(this.qrReader.id);

      // Configuración del escáner
      const config = {
        fps: 10,
        qrbox: { width: 250, height: 250 },
        aspectRatio: 1.0,
        rememberLastUsedCamera: true
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

      // Indicador visual eliminado para interfaz limpia

    } catch (error) {
      console.error('Error al iniciar escaneo:', error);
      throw error;
    }
  }

  // createScanIndicator eliminado

  onScanSuccess(decodedText) {
    console.log('✅ QR escaneado:', decodedText);

    // Reproducir sonido de éxito
    this.playScanSuccessSound();

    // Indicador visual eliminado

    // Insertar código en el input
    if (this.barcodeInput) {
      this.barcodeInput.value = decodedText;
    }

    // Cerrar escáner inmediatamente
    this.closeScanner();

    // Procesar el código después de cerrar el escáner
    setTimeout(() => {
      if (this.barcodeInput) {
        // Simular entrada del usuario
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
    // Ignorar errores comunes de "no code found"
  }

  async toggleCamera() {
    if (this.cameras.length < 2) {
      alert('Solo hay una cámara disponible');
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
      const config = {
        fps: 10,
        qrbox: { width: 250, height: 250 },
        aspectRatio: 1.0
      };
      // Limpiar UI visual para que no se duplique
      if (this.qrReader) this.qrReader.innerHTML = '';

      await this.startScanning(nextCameraId, config);

    } catch (error) {
      console.error('Error al cambiar cámara:', error);
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
      if (this.qrReader) this.qrReader.innerHTML = '';

      // Ocultar modal
      if (this.qrScannerModal) this.qrScannerModal.style.display = 'none';
      if (this.qrScannerOverlay) this.qrScannerOverlay.style.display = 'none';

      // Restaurar foco al input después de un breve retraso
      setTimeout(() => {
        if (this.barcodeInput) {
          this.barcodeInput.focus();
        }
      }, 400);

    } catch (error) {
      console.error('Error al cerrar escáner:', error);
      // Forzar cierre visual
      if (this.qrScannerModal) this.qrScannerModal.style.display = 'none';
    }
  }

  showLoading() {
    // Simple loading indicator logic if needed
    if (this.qrReader) {
      this.qrReader.innerHTML = '<div class="qr-scanner-loading"><i class="fas fa-spinner fa-spin" style="font-size: 30px; color: white;"></i><p>Iniciando...</p></div>';
    }
  }

  hideLoading() {
    // Se limpia al iniciar el scan
  }

  playScanSuccessSound() {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.frequency.value = 1200;
      gain.gain.value = 0.1;

      osc.start();
      gain.gain.exponentialRampToValueAtTime(0.00001, ctx.currentTime + 0.1);
      osc.stop(ctx.currentTime + 0.1);
    } catch (e) { /* ignore */ }
  }
}

// Inicialización Global
document.addEventListener('DOMContentLoaded', () => {
  setTimeout(() => {
    window.qrScanner = new QRScanner();
    window.qrScannerModule = window.qrScanner; // Alias
  }, 500);
});