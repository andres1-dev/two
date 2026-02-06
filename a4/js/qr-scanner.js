// QR Scanner Module para PandaDash - VERSIÓN FUNCIONAL RESTAURADA
// Basado en la lógica validada de funcional.js

class QRScanner {
  constructor() {
    this.html5QrCode = null;
    this.isScanning = false;
    this.cameras = [];
    this.currentCameraId = null;
    this.cameraIndex = 0;

    // Elementos (Mapeados a los IDs actuales de index.html)
    this.modal = document.getElementById('qrScannerModal');
    // funcional.js usaba 'qrReader', nosotros usamos 'qr-video-container'
    this.videoContainerId = 'qr-video-container';

    this.btnOpen = document.getElementById('qrScannerIcon');
    this.btnClose = document.getElementById('closeQrScanner');
    this.barcodeInput = document.getElementById('barcode');

    // Bindings
    this.handleOpen = this.handleOpen.bind(this);
    this.handleClose = this.handleClose.bind(this);
    this.onScanSuccess = this.onScanSuccess.bind(this);

    this.init();
  }

  init() {
    // Event Listeners
    if (this.btnOpen) this.btnOpen.addEventListener('click', this.handleOpen);
    if (this.btnClose) this.btnClose.addEventListener('click', this.handleClose);

    // NO inicializamos aquí para evitar problemas con contenedores ocultos (display: none)
    console.log("QR Scanner Logic Ready (Waiting for user action)");
  }

  async handleOpen() {
    console.log("Opening Scanner...");
    // 1. Mostrar primero el contenedor para que tenga dimensiones reales
    this.modal.style.display = 'flex';
    this.barcodeInput.blur();

    // 2. Instanciar la librería AHORA que el div es visible
    if (!this.html5QrCode) {
      this.html5QrCode = new Html5Qrcode(this.videoContainerId, { verbose: false });
    }

    try {
      // 3. Obtener cámaras y seleccionar trasera
      if (this.cameras.length === 0) {
        try {
          const devices = await Html5Qrcode.getCameras();
          if (devices && devices.length > 0) {
            this.cameras = devices;
          }
        } catch (e) {
          console.warn("Error getting cameras", e);
          // Continuar intentando iniciar sin lista explícita si falla
        }
      }

      // 4. Lógica de selección robusta
      let cameraId = null;
      if (this.cameras.length > 0) {
        const backCamera = this.cameras.find(device =>
          device.label.toLowerCase().includes('back') ||
          device.label.toLowerCase().includes('rear') ||
          device.label.toLowerCase().includes('environment')
        );
        cameraId = backCamera ? backCamera.id : this.cameras[0].id;
      }

      this.currentCameraId = cameraId;

      // 5. Iniciar Escaneo
      // Si tenemos ID, usamos ID. Si no, usamos config genérica 'environment'
      const cameraConfig = cameraId ? cameraId : { facingMode: "environment" };
      await this.startScanning(cameraConfig);

    } catch (err) {
      console.error("Error al abrir escáner", err);
      alert("Error: " + (err.message || err));
      this.handleClose();
    }
  }

  handleClose() {
    console.log("Closing Scanner...");
    this.stopScanning().then(() => {
      this.modal.style.display = 'none';

      // DESTROY instance to prevent conflicts on reopen
      // funcional.js might not do this, but it's safer for SPA navigation
      if (this.html5QrCode) {
        // this.html5QrCode.clear(); // Optional
      }
    });

    setTimeout(() => {
      if (this.barcodeInput) this.barcodeInput.focus();
    }, 300);
  }

  async startScanning(cameraConfig) {
    // Si ya está escaneando, parar primero
    if (this.isScanning) await this.stopScanning(false);

    const config = {
      fps: 10,
      qrbox: { width: 250, height: 250 },
      aspectRatio: 1.0,
      disableFlip: false
    };

    try {
      await this.html5QrCode.start(
        cameraConfig,
        config,
        this.onScanSuccess,
        (errorMessage) => { }
      );
      this.isScanning = true;
      this.applyVideoStyles();

    } catch (err) {
      console.error("Error starting scanner", err);
      // Fallback simple si falla la ID específica
      if (typeof cameraConfig === 'string') {
        console.warn("Retrying with generic environment mode...");
        await this.html5QrCode.start(
          { facingMode: "environment" },
          config,
          this.onScanSuccess,
          () => { }
        );
        this.isScanning = true;
        this.applyVideoStyles();
      } else {
        throw err;
      }
    }
  }

  applyVideoStyles() {
    const videoElement = document.querySelector(`#${this.videoContainerId} video`);
    if (videoElement) {
      videoElement.style.width = '100%';
      videoElement.style.height = '100%';
      videoElement.style.objectFit = 'cover';
    }
  }

  async stopScanning(forRestart = false) {
    if (this.html5QrCode && this.isScanning) {
      try {
        await this.html5QrCode.stop();
        // funcional.js clears scanner logic on close
        if (!forRestart) {
          // await this.html5QrCode.clear(); // Opcional, funcional.js hace setScanner = null
        }
      } catch (e) {
        console.error("Failed to stop", e);
      }
      this.isScanning = false;
    }
  }

  onScanSuccess(decodedText) {
    console.log(`Scan result: ${decodedText}`);

    // 1. Feedback (funcional.js logic)
    if (navigator.vibrate) navigator.vibrate(200);
    this.playSuccessSound();

    // 2. Input Logic (funcional.js logic)
    if (this.barcodeInput) {
      this.barcodeInput.value = decodedText;
      this.barcodeInput.focus();
      // Simular evento input
      const inputEvent = new Event('input', { bubbles: true });
      this.barcodeInput.dispatchEvent(inputEvent);
    }

    // 3. Close Logic (funcional.js: wait 1000ms)
    // User wants FAST input, reduced to 300ms for UX, or keep 1000ms if preferred.
    // Let's use 500ms as a happy medium.
    setTimeout(() => {
      this.handleClose();
    }, 500);
  }

  // Método de compatibilidad para app.js
  scanQRCode() {
    this.handleOpen();
  }

  // Método de compatibilidad
  isScannerAvailable() {
    return true; // Si la clase existe, la librería cargó
  }

  playSuccessSound() {
    // Lógica idéntica a funcional.js
    try {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      oscillator.frequency.value = 800;
      gainNode.gain.value = 0.3; // Vol de funcional.js
      oscillator.start();
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
      oscillator.stop(audioContext.currentTime + 0.1);
    } catch (e) { }
  }
}

// Inicialización Global
document.addEventListener('DOMContentLoaded', () => {
  // Delay como en funcional.js por seguridad
  setTimeout(() => {
    // Usamos 'qrScanner' que es lo que busca app.js
    window.qrScanner = new QRScanner();
    // Mantener también el alias antiguo por si acaso
    window.qrScannerModule = window.qrScanner;
  }, 500);
});