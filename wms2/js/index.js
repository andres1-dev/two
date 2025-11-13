// Módulo para la página de inicio
class IndexModule {
    constructor() {
        this.totalScans = localStorage.getItem('totalScans') || 0;
        this.cacheSize = localStorage.getItem('cacheSize') || 0;
        this.statusModal = document.getElementById('statusModal');
        
        this.init();
    }
    
    init() {
        console.log('🎯 Inicializando página de inicio...');
        
        this.updateStats();
        this.setupEventListeners();
        this.loadSystemInfo();
        
        console.log('✅ Página de inicio inicializada');
    }
    
    updateStats() {
        // Actualizar estadísticas en la UI
        document.getElementById('totalScans').textContent = this.totalScans;
        document.getElementById('cacheSize').textContent = this.cacheSize;
        
        // Actualizar en modal de estado
        document.getElementById('cacheStatus').textContent = `${this.cacheSize} registros`;
    }
    
    setupEventListeners() {
        // Teclas rápidas
        document.addEventListener('keydown', (e) => {
            if (e.key === '1') {
                this.selectMode('pda');
            } else if (e.key === '2') {
                this.selectMode('manual');
            } else if (e.key === 'F1') {
                e.preventDefault();
                this.checkSystemStatus();
            }
        });
        
        // Efectos hover en tarjetas
        const modeCards = document.querySelectorAll('.mode-card');
        modeCards.forEach(card => {
            card.addEventListener('mouseenter', () => {
                card.style.transform = 'translateY(-4px)';
            });
            
            card.addEventListener('mouseleave', () => {
                card.style.transform = 'translateY(0)';
            });
        });
    }
    
    loadSystemInfo() {
        // Cargar información del sistema desde localStorage
        const cacheData = localStorage.getItem('wmsCache');
        if (cacheData) {
            try {
                const data = JSON.parse(cacheData);
                this.cacheSize = Object.keys(data).length;
                this.updateStats();
            } catch (e) {
                console.log('No hay datos de caché previos');
            }
        }
        
        // Simular carga de información de conexión
        setTimeout(() => {
            document.getElementById('dbStatus').textContent = 'Conectada';
        }, 1000);
    }
    
    selectMode(mode) {
        console.log(`🎯 Seleccionando modo: ${mode}`);
        
        // Guardar preferencia
        localStorage.setItem('preferredMode', mode);
        localStorage.setItem('lastModeSelection', new Date().toISOString());
        
        // Incrementar contador de selecciones
        let modeSelections = JSON.parse(localStorage.getItem('modeSelections') || '{}');
        modeSelections[mode] = (modeSelections[mode] || 0) + 1;
        localStorage.setItem('modeSelections', JSON.stringify(modeSelections));
        
        // Redirigir
        if (mode === 'pda') {
            window.location.href = 'pda.html';
        } else if (mode === 'manual') {
            window.location.href = 'manual.html';
        }
    }
    
    checkSystemStatus() {
        console.log('🔍 Verificando estado del sistema...');
        
        // Actualizar información en tiempo real
        const cacheData = localStorage.getItem('wmsCache');
        const cacheSize = cacheData ? Object.keys(JSON.parse(cacheData)).length : 0;
        document.getElementById('cacheStatus').textContent = `${cacheSize} registros`;
        
        // Mostrar modal
        this.statusModal.classList.add('show');
        
        // Efecto visual
        setTimeout(() => {
            const statusItems = document.querySelectorAll('.status-item');
            statusItems.forEach((item, index) => {
                setTimeout(() => {
                    item.style.opacity = '1';
                    item.style.transform = 'translateX(0)';
                }, index * 100);
            });
        }, 100);
    }
    
    closeStatusModal() {
        this.statusModal.classList.remove('show');
    }
    
    clearCache() {
        console.log('🗑️ Limpiando caché...');
        
        if (confirm('¿Está seguro de que desea limpiar toda la caché del sistema?')) {
            localStorage.removeItem('wmsCache');
            localStorage.removeItem('cacheTimestamp');
            this.cacheSize = 0;
            this.updateStats();
            
            // Mostrar feedback
            this.showToast('Caché limpiada correctamente', 'success');
        }
    }
    
    showSettings() {
        console.log('⚙️ Mostrando configuración...');
        // En una implementación real, esto abriría un modal de configuración
        this.showToast('Funcionalidad en desarrollo', 'info');
    }
    
    showHelp() {
        console.log('❓ Mostrando ayuda...');
        // En una implementación real, esto abriría un modal de ayuda
        this.showToast('Centro de ayuda en desarrollo', 'info');
    }
    
    showToast(message, type = 'info') {
        // Crear toast notification
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.innerHTML = `
            <div class="toast-content">
                <i class="fas fa-${this.getToastIcon(type)}"></i>
                <span>${message}</span>
            </div>
        `;
        
        document.body.appendChild(toast);
        
        // Animación de entrada
        setTimeout(() => toast.classList.add('show'), 100);
        
        // Remover después de 3 segundos
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => {
                if (toast.parentNode) {
                    toast.parentNode.removeChild(toast);
                }
            }, 300);
        }, 3000);
    }
    
    getToastIcon(type) {
        const icons = {
            'success': 'check-circle',
            'error': 'exclamation-circle',
            'warning': 'exclamation-triangle',
            'info': 'info-circle'
        };
        return icons[type] || 'info-circle';
    }
}

// Funciones globales para los botones
function selectMode(mode) {
    window.indexModule.selectMode(mode);
}

function checkSystemStatus() {
    window.indexModule.checkSystemStatus();
}

function closeStatusModal() {
    window.indexModule.closeStatusModal();
}

function clearCache() {
    window.indexModule.clearCache();
}

function showSettings() {
    window.indexModule.showSettings();
}

function showHelp() {
    window.indexModule.showHelp();
}

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    window.indexModule = new IndexModule();
});

// CSS adicional para toast notifications (agregar al CSS)
const toastCSS = `
.toast {
    position: fixed;
    top: 20px;
    right: 20px;
    background: white;
    border-radius: 12px;
    padding: 16px 20px;
    box-shadow: 0 8px 24px rgba(13,24,48,0.15);
    border: 1px solid rgba(15,23,42,0.04);
    transform: translateX(100%);
    opacity: 0;
    transition: all 0.3s ease;
    z-index: 1000;
    max-width: 300px;
}

.toast.show {
    transform: translateX(0);
    opacity: 1;
}

.toast-content {
    display: flex;
    align-items: center;
    gap: 12px;
    font-weight: 600;
}

.toast-success {
    border-left: 4px solid #10b981;
}

.toast-success i {
    color: #10b981;
}

.toast-error {
    border-left: 4px solid #ef4444;
}

.toast-error i {
    color: #ef4444;
}

.toast-warning {
    border-left: 4px solid #f59e0b;
}

.toast-warning i {
    color: #f59e0b;
}

.toast-info {
    border-left: 4px solid #2563eb;
}

.toast-info i {
    color: #2563eb;
}
`;

// Injectar CSS de toast
const style = document.createElement('style');
style.textContent = toastCSS;
document.head.appendChild(style);