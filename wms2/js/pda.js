// Módulo PDA - Corregido y mejorado
class PDAModule {
    constructor() {
        // Referencias UI - Usando los mismos IDs del HTML original
        this.qrInput = document.getElementById('qrInput');
        this.lastScanned = document.getElementById('lastScanned');
        this.weekNumber = document.getElementById('weekNumber');
        this.resultArea = document.getElementById('resultArea');
        this.pillStatus = document.getElementById('pill-status');
        this.statusText = document.getElementById('status-text');
        this.pillCount = document.getElementById('pill-count');
        this.cacheCount = document.getElementById('cacheCount');
        this.cacheAge = document.getElementById('cacheAge');
        this.refreshBtn = document.getElementById('refreshData');
        this.goHomeBtn = document.getElementById('goHome');
        
        this.isProcessing = false;
        this.lastCode = '';
        
        this.init();
    }
    
    init() {
        console.log('🔄 Inicializando módulo PDA...');
        
        // Configurar foco persistente
        this.setupPersistentFocus();
        
        // Cargar datos iniciales
        this.loadInitialData();
        
        // Configurar eventos
        this.setupEventListeners();
        
        // Actualizar información inicial
        this.updateWeekNumber();
        this.updateCacheInfo();
        
        console.log('✅ Módulo PDA inicializado correctamente');
    }
    
    setupPersistentFocus() {
        console.log('🎯 Configurando foco persistente...');
        
        // Enfocar el input inmediatamente
        setTimeout(() => {
            this.qrInput.focus();
            console.log('✅ Input enfocado');
        }, 100);
        
        // Reenfocar cuando se pierda el foco
        this.qrInput.addEventListener('blur', () => {
            console.log('⚠️ Input perdió foco, reenfocando...');
            setTimeout(() => {
                this.qrInput.focus();
            }, 10);
        });
        
        // Reenfocar en cualquier interacción
        document.addEventListener('click', (e) => {
            if (e.target !== this.qrInput) {
                setTimeout(() => {
                    this.qrInput.focus();
                }, 50);
            }
        });
        
        // Prevenir que el formulario se envíe
        document.addEventListener('submit', (e) => {
            e.preventDefault();
            this.qrInput.focus();
        });
    }
    
    setupEventListeners() {
        // Escanear código - INPUT event para captura inmediata
        this.qrInput.addEventListener('input', (e) => {
            const code = e.target.value.trim();
            console.log('📥 Código ingresado:', code);
            
            if (code && code !== this.lastCode) {
                this.handleScannedCode(code);
                // Limpiar inmediatamente para siguiente escaneo
                setTimeout(() => {
                    e.target.value = '';
                }, 100);
            }
        });
        
        // Actualizar datos
        this.refreshBtn.addEventListener('click', () => {
            this.refreshData();
        });
        
        // Volver al inicio
        this.goHomeBtn.addEventListener('click', () => {
            window.location.href = 'index.html';
        });
        
        // Teclas rápidas
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                window.location.href = 'index.html';
            }
            if (e.key === 'F5' || (e.ctrlKey && e.key === 'r')) {
                e.preventDefault();
                this.refreshData();
            }
        });
    }
    
    async loadInitialData() {
        this.updateStatus('CARGANDO', 'info');
        
        try {
            await window.app.loadAllData();
            this.updateStatus('LISTO', 'success');
            this.updateDataCount();
            this.updateCacheInfo();
            window.app.playSuccessSound();
        } catch (error) {
            console.error('❌ Error cargando datos:', error);
            this.updateStatus('ERROR', 'danger');
            window.app.playErrorSound();
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
            this.updateDataCount();
            this.updateCacheInfo();
            window.app.playSuccessSound();
        } catch (error) {
            console.error('❌ Error actualizando datos:', error);
            this.updateStatus('ERROR', 'danger');
            window.app.playErrorSound();
        }
    }
    
    async handleScannedCode(code) {
        if (this.isProcessing) {
            console.log('⚠️ Ya procesando código, ignorando:', code);
            return;
        }
        
        this.isProcessing = true;
        this.lastCode = code;
        this.updateStatus('BUSCANDO', 'warning');
        
        console.log('🔍 Buscando código:', code);
        
        try {
            const result = await window.app.searchData(code);
            
            if (result) {
                console.log('✅ Resultado encontrado:', result.DOCUMENTO);
                this.renderSimplifiedResult(result);
                this.updateStatus(result.ESTADO || 'ENCONTRADO', 'success');
                this.updateWeekNumber(result.SEMANAS); // Actualizar semana con datos reales
                window.app.playSuccessSound();
            } else {
                console.log('❌ Código no encontrado:', code);
                this.showNotFound(code);
                this.updateStatus('NO ENCONTRADO', 'danger');
                window.app.playErrorSound();
            }
        } catch (error) {
            console.error('❌ Error en búsqueda:', error);
            this.updateStatus('ERROR', 'danger');
            window.app.playErrorSound();
        } finally {
            this.isProcessing = false;
            this.lastScanned.innerHTML = `<strong>${code}</strong>`;
            
            // Mantener el foco en el input
            setTimeout(() => {
                this.qrInput.focus();
            }, 100);
        }
    }
    
    renderSimplifiedResult(data) {
        console.log('🎨 Renderizando resultado simplificado:', data);
        
        const html = `
            <div class="pda-simplified-result">
                <div style="margin-bottom: 16px;">
                    <div style="font-weight:900;font-size:16px;line-height:1.2">
                        ${data.DOCUMENTO || 'Sin documento'} — ${data.REFERENCIA || 'Sin referencia'}
                    </div>
                    <div style="color:var(--muted);font-size:13px;margin-top:4px">
                        ${data.DESCRIPCIÓN || ''}
                    </div>
                </div>
                
                <div class="pda-essentials">
                    <div class="pda-essential-item">
                        <span class="pda-essential-label">CLASE</span>
                        <span class="pda-essential-value">${data.CLASE || '—'}</span>
                    </div>
                    <div class="pda-essential-item">
                        <span class="pda-essential-label">GÉNERO</span>
                        <span class="pda-essential-value">${data.GENERO || '—'}</span>
                    </div>
                    <div class="pda-essential-item">
                        <span class="pda-essential-label">PRENDA</span>
                        <span class="pda-essential-value">${data.PRENDA || '—'}</span>
                    </div>
                    <div class="pda-essential-item">
                        <span class="pda-essential-label">CANTIDAD</span>
                        <span class="pda-essential-value">${data.CANT || '—'}</span>
                    </div>
                </div>
                
                <div style="text-align:center;margin-top:12px">
                    <span class="pda-status-badge ${this.getStatusClass(data.ESTADO)}">
                        ${data.ESTADO || 'PENDIENTE'}
                    </span>
                </div>
            </div>
        `;
        
        this.resultArea.innerHTML = html;
    }
    
    showNotFound(code) {
        this.resultArea.innerHTML = `
            <div class="pda-not-found">
                <i class="material-icons">error_outline</i>
                <div style="font-size:14px;margin-top:8px">No se encontró: <strong>${code}</strong></div>
            </div>
        `;
    }
    
    getStatusClass(status) {
        if (!status) return 'info';
        
        const statusMap = {
            'ENTREGADO': 'success',
            'CANCELADO': 'danger', 
            'PENDIENTE': 'warning',
            'PROCESADO': 'info'
        };
        
        return statusMap[status.toUpperCase()] || 'info';
    }
    
    updateStatus(text, type = 'info') {
        console.log('🔄 Actualizando estado:', text, type);
        
        this.statusText.textContent = text;
        
        // Actualizar clases según el tipo
        this.pillStatus.className = 'pill ' + type;
    }
    
    updateDataCount() {
        if (window.app.dataCache) {
            const count = Object.keys(window.app.dataCache).length;
            this.pillCount.innerHTML = `<i class="fas fa-database"></i> ${count}`;
        }
    }
    
    updateCacheInfo() {
        if (window.app.dataCache && window.app.cacheTimestamp) {
            this.cacheCount.textContent = Object.keys(window.app.dataCache).length;
            const age = Math.floor((Date.now() - window.app.cacheTimestamp) / 1000 / 60);
            this.cacheAge.textContent = age + ' min';
        } else {
            this.cacheCount.textContent = '0';
            this.cacheAge.textContent = '—';
        }
    }
    
    updateWeekNumber(weekData = null) {
        let weekDisplay = '—';
        
        if (weekData) {
            // Usar la semana de los datos
            weekDisplay = window.app.extractWeekNumber(weekData);
            console.log('📅 Semana desde datos:', weekDisplay);
        } else {
            // Calcular semana actual como fallback
            const now = new Date();
            const start = new Date(now.getFullYear(), 0, 1);
            const days = Math.floor((now - start) / (24 * 60 * 60 * 1000));
            const weekNumber = Math.ceil(days / 7);
            weekDisplay = weekNumber.toString();
            console.log('📅 Semana calculada:', weekDisplay);
        }
        
        this.weekNumber.textContent = weekDisplay;
    }
}

// Inicializar módulo PDA cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    // Esperar a que la app principal esté lista
    setTimeout(() => {
        window.pdaModule = new PDAModule();
    }, 100);
});

// También inicializar cuando la página esté completamente cargada
window.addEventListener('load', () => {
    if (!window.pdaModule) {
        window.pdaModule = new PDAModule();
    }
});