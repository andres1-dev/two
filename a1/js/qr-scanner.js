// QR Scanner Module para PandaDash - VERSIÓN IOS STYLE
// Optimizado: Mejor selección de cámara y ajuste de pantalla

class QRScanner {
  constructor() {
    this.html5QrCode = null;
    this.isScanning = false;

    // Elements
    this.modal = document.getElementById('qrScannerModal');
    this.videoContainerId = 'qr-video-container'; // Container ID

    this.btnOpen = document.getElementById('qrScannerIcon');
    this.btnClose = document.getElementById('closeQrScanner');
    this.btnSwitch = document.getElementById('toggleCameraBtn');
    this.barcodeInput = document.getElementById('barcode');

    // Bindings
    this.handleOpen = this.handleOpen.bind(this);
    this.handleClose = this.handleClose.bind(this);
    this.handleSwitch = this.handleSwitch.bind(this);
    this.onScanSuccess = this.onScanSuccess.bind(this);
    this.onScanFailure = this.onScanFailure.bind(this);

    this.init();
  }

  init() {
    // Event Listeners
    if (this.btnOpen) this.btnOpen.addEventListener('click', this.handleOpen);
    if (this.btnClose) this.btnClose.addEventListener('click', this.handleClose);
    if (this.btnSwitch) this.btnSwitch.addEventListener('click', this.handleSwitch);

    // Initialize library instance once
    // Verbose false for production cleanliness
    this.html5QrCode = new Html5Qrcode(this.videoContainerId, { verbose: false });

    console.log("QR Scanner Module Initialized (Revised)");
  }

  async handleOpen() {
    console.log("Opening Scanner...");
    this.modal.style.display = 'flex';

    // Start scanning with environment camera preferences
    // We use the direct config method which is cleaner than manual ID selection
    this.startScanning({ facingMode: "environment" });
  }

  handleClose() {
    console.log("Closing Scanner...");
    this.stopScanning();
    this.modal.style.display = 'none';
    this.resetUI();
  }

  handleSwitch() {
    // To toggle, we basically stop and restart without specific preference 
    // (or we could track current mode, but Html5Qrcode doesn't expose easy toggle for raw constraints)
    // Strategy: If we were using environment, switch to user, and vice versa.
    // However, getting the CURRENT constraint is tricky. 
    // Simple approach: Toggle between environment and user if we can.

    // NOTE: For simplicity and reliability in this specific prompt, let's keep it simple.
    // If the user wants to switch, we might need to enumerate. 
    // checking internal state

    if (this.isScanning) {
      this.stopScanning().then(() => {
        // Toggle logic would go here. For now let's just re-start to ensure stability
        // A true toggle requires tracking state.
        // Let's assume we want to switch to 'user' if we were 'environment'
        const nextMode = (this.currentFacingMode === "environment") ? "user" : "environment";
        this.startScanning({ facingMode: nextMode });
      });
    }
  }

  async startScanning(cameraConfig) {
    if (this.isScanning) await this.stopScanning();

    this.currentFacingMode = cameraConfig.facingMode || "environment";

    // Dynamic configuration for full screen
    const width = window.innerWidth;
    const height = window.innerHeight;
    const aspectRatio = width / height;

    const config = {
      fps: 10,
      // Make the QR Box slightly smaller than the visual frame to ensure 
      // the user really centers it.
      qrbox: { width: 200, height: 200 },
      aspectRatio: aspectRatio,
      disableFlip: false
    };

    try {
      await this.html5QrCode.start(
        cameraConfig,
        config,
        this.onScanSuccess,
        this.onScanFailure
      );
      this.isScanning = true;

      // CORRECTION: Force video styles AFTER start
      this.applyVideoStyles();

    } catch (err) {
      console.error("Error starting scanner", err);
      if (err?.name === "NotAllowedError") {
        alert("Permiso de cámara denegado.");
        this.handleClose();
      } else {
        // Fallback: try default settings if specific constraints fail
        if (cameraConfig.facingMode === "environment") {
          console.warn("Retrying with any camera...");
          // Try without constraints
          this.html5QrCode.start(
            { facingMode: "user" },
            config,
            this.onScanSuccess,
            this.onScanFailure
          ).catch(e => {
            alert("No se pudo iniciar la cámara: " + e);
            this.handleClose();
          });
        }
      }
    }
  }

  applyVideoStyles() {
    // The library creates a video element. We want to force it to cover.
    const videoElement = document.querySelector(`#${this.videoContainerId} video`);
    if (videoElement) {
      videoElement.style.width = '100%';
      videoElement.style.height = '100%';
      videoElement.style.objectFit = 'cover';
      videoElement.style.borderRadius = '0'; // Ensure no weird borders
    }
  }

  async stopScanning() {
    if (this.html5QrCode && this.isScanning) {
      try {
        await this.html5QrCode.stop();
        // Note: .clear() removes the video element, which is good for cleanup
        // await this.html5QrCode.clear(); 
      } catch (e) {
        console.error("Failed to stop", e);
      }
      this.isScanning = false;
    }
  }

  onScanSuccess(decodedText, decodedResult) {
    console.log(`Scan result: ${decodedText}`, decodedResult);

    // Ignore spammy duplicates if needed, or debouncing
    // But since we close immediately, it's fine.

    // Visual Feedback
    const scanArea = document.querySelector('.qr-scan-area');
    if (scanArea) scanArea.classList.add('success');

    // Vibrate
    if (navigator.vibrate) navigator.vibrate(200);

    // Sound
    this.playSuccessSound();

    // Input Value
    if (this.barcodeInput) {
      this.barcodeInput.value = decodedText;
      // Trigger generic input logic
      this.barcodeInput.dispatchEvent(new Event('input', { bubbles: true }));
      this.barcodeInput.focus();
    }

    // Close after delay
    setTimeout(() => {
      this.handleClose();
    }, 600);
  }

  onScanFailure(error) {
    // This fires continually when no QR is found. 
    // Keep it empty or log only specific errors to avoid console spam.
    // console.warn(`Code scan error = ${error}`);
  }

  resetUI() {
    const scanArea = document.querySelector('.qr-scan-area');
    if (scanArea) scanArea.classList.remove('success');
  }

  playSuccessSound() {
    try {
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
    } catch (e) {
      console.warn("Audio context not supported");
    }
  }
}

// Global Auto-Init
document.addEventListener('DOMContentLoaded', () => {
  window.qrScannerModule = new QRScanner();
});