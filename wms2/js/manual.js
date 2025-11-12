// Módulo Manual - Vista completa con todas las funcionalidades
class ManualModule {
    constructor() {
        this.scannerInput = document.getElementById('manualScannerInput');
        this.lastScanned = document.getElementById('manualLastScanned');
        this.weekNumber = document.getElementById('manualWeekNumber');
        this.resultsArea = document.getElementById('manualResultsArea');
        this.statusPill = document.getElementById('manualStatus');
        this.dataCount = document.getElementById('dataCount');
        this.cacheCount = document.getElementById('manualCacheCount');
        this.cacheAge = document.getElementById('manualCacheAge');
        this.cameraBtn = document.getElementById('manualCameraBtn');
        
        this.isProcessing = false;
        this.lastCode = '';
        
        this.init();
    }
    
    init() {
        console.log('Inicializando módulo Manual...');
        
        // Configurar toggles rápidos
        this.setupQuickToggles();
        
        // Cargar datos iniciales
        this.loadInitialData();
        
        // Configurar eventos
        this.setupEventListeners();
        
        // Actualizar información
        this.updateWeekNumber();
        this.updateCacheInfo();
        
        console.log('Módulo Manual inicializado correctamente');
    }
    
    setupQuickToggles() {
        const soundToggle = document.getElementById('quickSoundToggle');
        const cacheToggle = document.getElementById('quickCacheToggle');
        
        // Cargar estado actual
        const soundEnabled = window.app.getSetting('pda_sound');
        const cacheEnabled = window.app.getSetting('pda_auto');
        
        if (soundEnabled) soundToggle.classList.add('on');
        if (cacheEnabled) cacheToggle.classList.add('on');
        
        // Configurar eventos
        soundToggle.addEventListener('click', () => {
            const isOn = soundToggle.classList.toggle('on');
            localStorage.setItem('pda_sound', isOn);
            window.app.playConfirmArpeggio();
        });
        
        cacheToggle.addEventListener('click', () => {
            const isOn = cacheToggle.classList.toggle('on');
            localStorage.setItem('pda_auto', isOn);
            
            if (!isOn) {
                // Limpiar caché si se desactiva
                window.app.dataCache = null;
                window.app.cacheTimestamp = null;
                this.updateCacheInfo();
            }
            
            window.app.playConfirmArpeggio();
        });
    }
    
    setupEventListeners() {
        // Escanear código
        this.scannerInput.addEventListener('input', (e) => {
            const code = e.target.value.trim();
            if (code && code !== this.lastCode) {
                this.handleScannedCode(code);
            }
        });
        
        // Cámara
        this.cameraBtn.addEventListener('click', () => {
            this.openCamera();
        });
        
        // Actualizar información de caché periódicamente
        setInterval(() => {
            this.updateCacheInfo();
        }, 30000);
    }
    
    async loadInitialData() {
        this.updateStatus('CARGANDO', 'info');
        
        try {
            await window.app.loadAllData();
            this.updateStatus('LISTO', 'success');
            this.updateDataCount();
        } catch (error) {
            console.error('Error cargando datos:', error);
            this.updateStatus('ERROR', 'danger');
        }
    }
    
    async handleScannedCode(code) {
        if (this.isProcessing) return;
        
        this.isProcessing = true;
        this.lastCode = code;
        this.updateStatus('BUSCANDO', 'warning');
        
        try {
            const result = await window.app.searchData(code);
            
            if (result) {
                this.renderDetailedResult(result);
                this.updateStatus(result.ESTADO || 'ENCONTRADO', 'success');
                window.app.playSuccessSound();
            } else {
                this.showNotFound(code);
                this.updateStatus('NO ENCONTRADO', 'danger');
                window.app.playErrorSound();
            }
        } catch (error) {
            console.error('Error en búsqueda:', error);
            this.updateStatus('ERROR', 'danger');
            window.app.playErrorSound();
        } finally {
            this.isProcessing = false;
            this.lastScanned.textContent = code;
        }
    }
    
    renderDetailedResult(data) {
        const html = `
            <div class="manual-result-detailed">
                <div class="result-header">
                    <div class="result-title">
                        <h4>${data.DOCUMENTO || 'Sin documento'} — ${data.REFERENCIA || 'Sin referencia'}</h4>
                        <p class="result-description">${data.DESCRIPCIÓN || ''}</p>
                    </div>
                    <div class="result-status-badge ${this.getStatusClass(data.ESTADO)}">
                        ${data.ESTADO || 'PENDIENTE'}
                    </div>
                </div>
                
                <div class="result-priority">
                    <div class="priority-item">
                        <label>CLASE</label>
                        <span>${data.CLASE || '—'}</span>
                    </div>
                    <div class="priority-item">
                        <label>GÉNERO</label>
                        <span>${data.GENERO || '—'}</span>
                    </div>
                    <div class="priority-item">
                        <label>PRENDA</label>
                        <span>${data.PRENDA || '—'}</span>
                    </div>
                    <div class="priority-item">
                        <label>PROVEEDOR</label>
                        <span>${data.PROVEEDOR || '—'}</span>
                    </div>
                </div>
                
                ${data.SOPORTE ? `
                <div class="result-support">
                    <img src="${data.SOPORTE}" class="support-image" alt="Soporte" onclick="manualModule.openSupportImage('${data.SOPORTE}')">
                </div>
                ` : ''}
                
                <div class="result-details">
                    <h5>Detalles Completos</h5>
                    <div class="details-grid">
                        ${this.generateDetailItems(data)}
                    </div>
                </div>
            </div>
        `;
        
        this.resultsArea.innerHTML = html;
    }
    
    generateDetailItems(data) {
        const fields = [
            'DOCUMENTO', 'FECHA', 'LOTE', 'REFPROV', 'TIPO', 'PVP', 
            'CANT', 'FACTURA', 'FECHA_FACT', 'CLIENTE', 'NIT', 'FUENTE'
        ];
        
        return fields.map(field => {
            if (data[field]) {
                return `
                    <div class="detail-item">
                        <span class="detail-label">${field}</span>
                        <span class="detail-value">${data[field]}</span>
                    </div>
                `;
            }
            return '';
        }).join('');
    }
    
    showNotFound(code) {
        this.resultsArea.innerHTML = `
            <div class="manual-not-found">
                <i class="fas fa-search"></i>
                <h4>No se encontraron resultados</h4>
                <p>El código <strong>${code}</strong> no existe en la base de datos.</p>
            </div>
        `;
    }
    
    getStatusClass(status) {
        const statusMap = {
            'ENTREGADO': 'success',
            'CANCELADO': 'danger', 
            'PENDIENTE': 'warning',
            'PROCESADO': 'info'
        };
        return statusMap[status] || 'info';
    }
    
    updateStatus(text, type = 'info') {
        const statusText = this.statusPill.querySelector('span');
        statusText.textContent = text;
        
        // Actualizar clases
        this.statusPill.className = 'status-pill ' + type;
    }
    
    updateDataCount() {
        if (window.app.dataCache) {
            const count = Object.keys(window.app.dataCache).length;
            const countText = this.dataCount.querySelector('span');
            countText.textContent = count;
        }
    }
    
    updateCacheInfo() {
        if (window.app.dataCache && window.app.cacheTimestamp) {
            this.cacheCount.textContent = Object.keys(window.app.dataCache).length;
            const age = Math.floor((Date.now() - window.app.cacheTimestamp) / 1000 / 60);
            this.cacheAge.textContent = age;
        }
    }
    
    updateWeekNumber() {
        const now = new Date();
        const start = new Date(now.getFullYear(), 0, 1);
        const days = Math.floor((now - start) / (24 * 60 * 60 * 1000));
        const weekNumber = Math.ceil(days / 7);
        
        this.weekNumber.textContent = weekNumber;
    }
    
    openCamera() {
        // Usar el módulo de cámara
        if (window.cameraModule) {
            window.cameraModule.openCamera();
        }
    }
    
    openSupportImage(src) {
        // Abrir imagen de soporte en modal
        const modal = document.createElement('div');
        modal.className = 'support-modal';
        modal.innerHTML = `
            <div class="support-modal-content">
                <button class="close-support-modal">
                    <i class="fas fa-times"></i>
                </button>
                <img src="${src}" alt="Soporte completo">
            </div>
        `;
        
        document.body.appendChild(modal);
        
        const closeBtn = modal.querySelector('.close-support-modal');
        closeBtn.addEventListener('click', () => {
            document.body.removeChild(modal);
        });
        
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                document.body.removeChild(modal);
            }
        });
    }
}

// Hacer disponible globalmente
window.manualModule = new ManualModule();

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    window.manualModule.init();
});