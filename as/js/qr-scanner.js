// QR Scanner Module para PandaDash - VERSIÓN IOS STYLE
// Simplificado para mejor rendimiento y estética

class QRScanner {
  constructor() {
    this.html5QrCode = null;
    this.cameraId = null;
    this.isScanning = false;
    this.cameras = [];
    this.cameraIndex = 0;

    // Elements
    this.modal = document.getElementById('qrScannerModal');
    this.videoContainerId = 'qr-video-container';
    this.btnOpen = document.getElementById('qrScannerIcon');
    this.btnClose = document.getElementById('closeQrScanner');
    this.btnSwitch = document.getElementById('toggleCameraBtn');
    this.barcodeInput = document.getElementById('barcode');

    // Bindings
    this.handleOpen = this.handleOpen.bind(this);
    this.handleClose = this.handleClose.bind(this);
    this.handleSwitch = this.handleSwitch.bind(this);
    this.onScanSuccess = this.onScanSuccess.bind(this);

    this.init();
  }

  init() {
    // Event Listeners
    if (this.btnOpen) this.btnOpen.addEventListener('click', this.handleOpen);
    if (this.btnClose) this.btnClose.addEventListener('click', this.handleClose);
    if (this.btnSwitch) this.btnSwitch.addEventListener('click', this.handleSwitch);

    console.log("QR Scanner Module Initialized (iOS Style)");
  }

  async handleOpen() {
    console.log("Opening Scanner...");
    this.modal.style.display = 'flex';

    try {
      // 1. Get Cameras
      if (this.cameras.length === 0) {
        this.cameras = await Html5Qrcode.getCameras();
        // Sort: Environment (Back) cameras first
        this.cameras.sort((a, b) => {
          const labelA = a.label.toLowerCase();
          if (labelA.includes('back') || labelA.includes('environment')) return -1;
          return 1;
        });
      }

      if (this.cameras && this.cameras.length > 0) {
        this.cameraId = this.cameras[this.cameraIndex].id;
        this.startScanning(this.cameraId);
      } else {
        alert("No cameras found.");
        this.handleClose();
      }
    } catch (err) {
      console.error("Camera permissions not granted", err);
      alert("Por favor habilita los permisos de cámara.");
      this.handleClose();
    }
  }

  handleClose() {
    console.log("Closing Scanner...");
    this.stopScanning();
    this.modal.style.display = 'none';
    this.resetUI();
  }

  handleSwitch() {
    if (this.cameras.length < 2) return;

    this.stopScanning().then(() => {
      this.cameraIndex = (this.cameraIndex + 1) % this.cameras.length;
      this.cameraId = this.cameras[this.cameraIndex].id;
      this.startScanning(this.cameraId);
    });
  }

  async startScanning(cameraId) {
    if (this.isScanning) await this.stopScanning();

    this.html5QrCode = new Html5Qrcode(this.videoContainerId);

    const config = {
      fps: 10,
      qrbox: { width: 250, height: 250 },
      aspectRatio: 1.0,
      disableFlip: false
    };

    try {
      await this.html5QrCode.start(
        cameraId,
        config,
        this.onScanSuccess,
        (errorMessage) => { /* ignore per-frame errors */ }
      );
      this.isScanning = true;

      // Hide the messy library UI if it injects any (it mostly shouldn't in this mode)
      // Adjust video object fit manually if needed
      const video = document.querySelector(`#${this.videoContainerId} video`);
      if (video) video.style.objectFit = "cover";

    } catch (err) {
      console.error("Error starting scanner", err);
      // Retry logic or user notification could go here
    }
  }

  async stopScanning() {
    if (this.html5QrCode && this.isScanning) {
      try {
        await this.html5QrCode.stop();
        await this.html5QrCode.clear();
      } catch (e) {
        console.error("Failed to stop", e);
      }
      this.isScanning = false;
    }
  }

  onScanSuccess(decodedText, decodedResult) {
    console.log(`Scan result: ${decodedText}`, decodedResult);

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

  resetUI() {
    const scanArea = document.querySelector('.qr-scan-area');
    if (scanArea) scanArea.classList.remove('success');
  }

  playSuccessSound() {
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
}

// Global Auto-Init
document.addEventListener('DOMContentLoaded', () => {
  window.qrScannerModule = new QRScanner();
});