// Módulo PDA - Vista optimizada para escaneo rápido
class PDAModule {
    constructor() {
        this.scannerInput = document.getElementById('pdaScannerInput');
        this.lastScanned = document.getElementById('pdaLastScanned');
        this.weekNumber = document.getElementById('pdaWeekNumber');
        this.resultsArea = document.getElementById('pdaResultsArea');
        this.statusPill = document.getElementById('pdaStatus');
        this.statusText = this.statusPill.querySelector('span');
        this.backBtn = document.getElementById('pdaBackBtn');
        this.refreshBtn = document.getElementById('pdaRefreshBtn');
        
        this.isProcessing = false;
        this.lastCode = '';
        
        this.init();
    }
    
    init() {
        console.log('Inicializando módulo PDA...');
        
        // Configurar foco persistente
        this.setupPersistentFocus();
        
        // Cargar datos iniciales
        this.loadInitialData();
        
        // Configurar eventos
        this.setupEventListeners();
        
        // Actualizar semana actual
        this.updateWeekNumber();
        
        console.log('Módulo PDA inicializado correctamente');
    }
    
    setupPersistentFocus() {
        // Enfocar el input al cargar
        this.scannerInput.focus();
        
        // Reenfocar cuando se pierda el foco
        document.addEventListener('click', () => {
            setTimeout(() => {
                this.scannerInput.focus();
            }, 100);
        });
        
        // Prevenir que otros elementos tomen el foco
        this.scannerInput.addEventListener('blur', () => {
            setTimeout(() => {
                this.scannerInput.focus();
            }, 50);
        });
    }
    
    setupEventListeners() {
        // Escanear código
        this.scannerInput.addEventListener('input', (e) => {
            const code = e.target.value.trim();
            if (code && code !== this.lastCode) {
                this.handleScannedCode(code);
                e.target.value = ''; // Limpiar inmediatamente
            }
        });
        
        // Navegación
        this.backBtn.addEventListener('click', () => {
            window.location.href = 'index.html';
        });
        
        this.refreshBtn.addEventListener('click', () => {
            this.refreshData();
        });
        
        // Teclas rápidas
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                window.location.href = 'index.html';
            }
        });
    }
    
    async loadInitialData() {
        this.updateStatus('CARGANDO', 'info');
        
        try {
            await window.app.loadAllData();
            this.updateStatus('LISTO', 'success');
        } catch (error) {
            console.error('Error cargando datos:', error);
            this.updateStatus('ERROR', 'danger');
        }
    }
    
    async refreshData() {
        this.updateStatus('ACTUALIZANDO', 'warning');
        
        try {
            // Forzar recarga ignorando caché
            window.app.dataCache = null;
            window.app.cacheTimestamp = null;
            
            await window.app.loadAllData();
            this.updateStatus('LISTO', 'success');
            window.app.playSuccessSound();
        } catch (error) {
            console.error('Error actualizando datos:', error);
            this.updateStatus('ERROR', 'danger');
            window.app.playErrorSound();
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
                this.renderSimplifiedResult(result);
                this.updateStatus('ENCONTRADO', 'success');
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
    
    renderSimplifiedResult(data) {
        const html = `
            <div class="pda-result-simplified">
                <div class="result-main">
                    <div class="result-doc">${data.DOCUMENTO || '—'}</div>
                    <div class="result-ref">${data.REFERENCIA || '—'}</div>
                </div>
                
                <div class="result-essentials">
                    <div class="essential-item">
                        <span class="essential-label">CLASE</span>
                        <span class="essential-value">${data.CLASE || '—'}</span>
                    </div>
                    <div class="essential-item">
                        <span class="essential-label">GÉNERO</span>
                        <span class="essential-value">${data.GENERO || '—'}</span>
                    </div>
                    <div class="essential-item">
                        <span class="essential-label">PRENDA</span>
                        <span class="essential-value">${data.PRENDA || '—'}</span>
                    </div>
                    <div class="essential-item">
                        <span class="essential-label">CANTIDAD</span>
                        <span class="essential-value">${data.CANT || '—'}</span>
                    </div>
                </div>
                
                <div class="result-status">
                    <span class="status-badge ${this.getStatusClass(data.ESTADO)}">
                        ${data.ESTADO || 'PENDIENTE'}
                    </span>
                </div>
            </div>
        `;
        
        this.resultsArea.innerHTML = html;
    }
    
    showNotFound(code) {
        this.resultsArea.innerHTML = `
            <div class="pda-not-found">
                <i class="fas fa-exclamation-triangle"></i>
                <p>No se encontró: ${code}</p>
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
        this.statusText.textContent = text;
        
        // Actualizar clases
        this.statusPill.className = 'status-pill ' + type;
    }
    
    updateWeekNumber() {
        // Obtener número de semana actual
        const now = new Date();
        const start = new Date(now.getFullYear(), 0, 1);
        const days = Math.floor((now - start) / (24 * 60 * 60 * 1000));
        const weekNumber = Math.ceil(days / 7);
        
        this.weekNumber.textContent = weekNumber;
    }
}

// Inicializar módulo PDA cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    new PDAModule();
});