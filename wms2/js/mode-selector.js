// Selector de modo - Página principal
class ModeSelector {
    constructor() {
        this.pdaModeBtn = document.getElementById('pdaMode');
        this.manualModeBtn = document.getElementById('manualMode');
        
        this.init();
    }
    
    init() {
        console.log('Inicializando selector de modo...');
        
        this.setupEventListeners();
        this.applyUserPreferences();
        
        console.log('Selector de modo inicializado');
    }
    
    setupEventListeners() {
        // Modo PDA
        this.pdaModeBtn.addEventListener('click', () => {
            this.selectMode('pda');
        });
        
        // Modo Manual
        this.manualModeBtn.addEventListener('click', () => {
            this.selectMode('manual');
        });
        
        // Teclas rápidas
        document.addEventListener('keydown', (e) => {
            if (e.key === '1') {
                this.selectMode('pda');
            } else if (e.key === '2') {
                this.selectMode('manual');
            }
        });
    }
    
    selectMode(mode) {
        console.log(`Seleccionando modo: ${mode}`);
        
        // Guardar preferencia del usuario
        localStorage.setItem('preferredMode', mode);
        
        // Redirigir a la vista correspondiente
        if (mode === 'pda') {
            window.location.href = 'pda.html';
        } else if (mode === 'manual') {
            window.location.href = 'manual.html';
        }
    }
    
    applyUserPreferences() {
        // Cargar modo preferido si existe
        const preferredMode = localStorage.getItem('preferredMode');
        
        if (preferredMode) {
            // Resaltar el modo preferido
            if (preferredMode === 'pda') {
                this.pdaModeBtn.style.transform = 'scale(1.02)';
                this.pdaModeBtn.style.boxShadow = '0 15px 30px rgba(33, 150, 243, 0.3)';
            } else if (preferredMode === 'manual') {
                this.manualModeBtn.style.transform = 'scale(1.02)';
                this.manualModeBtn.style.boxShadow = '0 15px 30px rgba(76, 175, 80, 0.3)';
            }
        }
    }
}

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    new ModeSelector();
});