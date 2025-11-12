// Módulo de cámara compartido - Para uso futuro si es necesario
class CameraModule {
    constructor() {
        this.isScanning = false;
        this.currentStream = null;
    }
    
    // Métodos de cámara pueden ser compartidos entre módulos
}

window.cameraModule = new CameraModule();