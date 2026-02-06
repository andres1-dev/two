// QR Scanner Module para PandaDash - VERSIÓN IOS STYLE (Minimalista & Funcional)
// Basado en original.txt para garantizar funcionalidad perfecta

class QRScanner {
  constructor() {
    this.html5QrCode = null;
    this.isScanning = false;

    // Elements
    this.modal = document.getElementById('qrScannerModal');
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

    // Inicializar la instancia de la librería
    // Usamos verbose: false para limpieza
    this.html5QrCode = new Html5Qrcode(this.videoContainerId, { verbose: false });

    console.log("QR Scanner Module Initialized (Functional Core)");
  }

  async handleOpen() {
    console.log("Opening Scanner...");
    this.modal.style.display = 'flex'; // Mostrar modal antes de iniciar

    try {
      // Configuración exacta de original.txt + manejo de errores
      const config = {
        fps: 10,
        qrbox: 250 // Usar entero simple como en original.txt
      };

      // Iniciar escáner con cámara trasera
      await this.html5QrCode.start(
        { facingMode: "environment" },
        config,
        this.onScanSuccess,
        (errorMessage) => {
          // Ignorar errores de frame vacío
        }
      );

      this.isScanning = true;
      this.applyVideoStyles(); // Asegurar que el video llene el contenedor

    } catch (err) {
      console.error("Error starting scanner", err);
      alert("Error al iniciar cámara: " + err);
      this.handleClose();
    }
  }

  handleClose() {
    console.log("Closing Scanner...");
    if (this.isScanning) {
      this.html5QrCode.stop().then(() => {
        this.isScanning = false;
        this.modal.style.display = 'none';
      }).catch(err => {
        console.error("Failed to stop", err);
        this.modal.style.display = 'none'; // Forzar cierre visual
      });
    } else {
      this.modal.style.display = 'none';
    }
  }

  applyVideoStyles() {
    // Forzar que el elemento video ocupe todo el espacio manteniendo ratio
    // Esto es puramente estético y no afecta la lógica de escaneo de la librería
    const videoElement = document.querySelector(`#${this.videoContainerId} video`);
    if (videoElement) {
      videoElement.style.width = '100%';
      videoElement.style.height = '100%';
      videoElement.style.objectFit = 'cover';
    }
  }

  onScanSuccess(decodedText, decodedResult) {
    console.log(`Scan result: ${decodedText}`);

    // Feedback visual/auditivo
    if (navigator.vibrate) navigator.vibrate(200);
    this.playSuccessSound();

    // Colocar valor en input
    if (this.barcodeInput) {
      this.barcodeInput.value = decodedText;
      this.barcodeInput.dispatchEvent(new Event('input', { bubbles: true }));
      this.barcodeInput.focus();
    }

    // Cerrar inmediatamente como en original.txt
    this.handleClose();
  }

  playSuccessSound() {
    try {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      oscillator.frequency.value = 800;
      gainNode.gain.value = 0.1;
      oscillator.start();
      gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.1);
      oscillator.stop(audioContext.currentTime + 0.1);
    } catch (e) { /* Ignore audio errors */ }
  }
}

// Inicialización
document.addEventListener('DOMContentLoaded', () => {
  window.qrScannerModule = new QRScanner();
});