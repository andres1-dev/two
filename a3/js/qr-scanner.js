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

    // Inicialización pre-emptive (como en funcional.js)
    // Inicializamos la instancia asociada al ID del contenedor
    this.html5QrCode = new Html5Qrcode(this.videoContainerId, { verbose: false });

    console.log("QR Scanner Module Initialized (Funcional JS Logic)");
  }

  async handleOpen() {
    console.log("Opening Scanner...");
    this.modal.style.display = 'flex';
    this.barcodeInput.blur(); // Ocultar teclado

    try {
      // 1. Obtener cámaras (Lógica de funcional.js)
      if (this.cameras.length === 0) {
        const devices = await Html5Qrcode.getCameras();
        if (devices && devices.length > 0) {
          this.cameras = devices;
        } else {
          throw new Error('No se encontraron cámaras');
        }
      }

      // 2. Seleccionar cámara trasera (Lógica de funcional.js)
      const backCamera = this.cameras.find(device =>
        device.label.toLowerCase().includes('back') ||
        device.label.toLowerCase().includes('rear') ||
        device.label.toLowerCase().includes('environment')
      );

      const cameraId = backCamera ? backCamera.id : this.cameras[0].id;
      this.currentCameraId = cameraId;

      // 3. Iniciar Escaneo
      await this.startScanning(cameraId);

    } catch (err) {
      console.error("Error al abrir escáner", err);
      alert("Error: " + err.message);
      this.handleClose();
    }
  }

  handleClose() {
    console.log("Closing Scanner...");
    this.stopScanning();
    this.modal.style.display = 'none';

    // Restaurar foco (como funcional.js)
    setTimeout(() => {
      if (this.barcodeInput) this.barcodeInput.focus();
    }, 300);
  }

  async startScanning(cameraId) {
    if (this.isScanning) await this.stopScanning(false);

    // Configuración exacta de funcional.js
    const config = {
      fps: 10,
      qrbox: { width: 250, height: 250 },
      aspectRatio: 1.0,
      disableFlip: false, // funcional.js default
      rememberLastUsedCamera: false // funcional.js explicit
    };

    try {
      await this.html5QrCode.start(
        cameraId,
        config,
        this.onScanSuccess,
        (errorMessage) => {
          // Ignore errors as per funcional.js (except critical logic)
        }
      );
      this.isScanning = true;

      // CSS Force (Para mantener el estilo full screen)
      this.applyVideoStyles();

    } catch (err) {
      console.error("Error starting scanner", err);
      // Retry logic could go here, but funcional.js just throws
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
    window.qrScannerModule = new QRScanner();
  }, 500);
});