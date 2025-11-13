// Módulo Manual - SIN CACHE DE DATOS
class ManualModule {
    constructor() {
        // Referencias UI
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
        this.openCamera = document.getElementById('openCamera');
        
        this.isProcessing = false;
        this.lastCode = '';
        
        this.init();
    }
    
    init() {
        console.log('🔄 Inicializando módulo Manual - SIN CACHE...');
        
        // Configurar toggles (eliminar toggle de cache)
        this.setupToggles();
        
        // Cargar datos iniciales FRESCOS
        this.loadInitialData();
        
        // Configurar eventos
        this.setupEventListeners();
        
        // Actualizar información inicial
        this.updateWeekNumber();
        this.updateLoadInfo();
        
        console.log('✅ Módulo Manual inicializado - SIN CACHE');
    }
    
    setupToggles() {
        // Solo mantener sonido y thumb - ELIMINAR CACHE
        const toggles = {
            sound: document.getElementById('toggle-sound'),
            thumb: document.getElementById('toggle-thumb'),
            camera: document.getElementById('toggle-camera')
        };
        
        Object.keys(toggles).forEach(key => {
            const toggle = toggles[key];
            const settingKey = `pda_${key}`;
            const isOn = window.app.getSetting(settingKey);
            
            if (isOn) toggle.classList.add('on');
            
            toggle.addEventListener('click', () => {
                const curr = toggle.classList.toggle('on');
                window.app.setSetting(settingKey, curr);
                window.app.playConfirmArpeggio();
                
                if (key === 'camera') {
                    this.openCamera.style.display = curr ? 'flex' : 'none';
                }
            });
        });
        
        // ELIMINAR toggle de cache y foco
        const cacheToggle = document.getElementById('toggle-auto');
        const focusToggle = document.getElementById('toggle-focus');
        if (cacheToggle) cacheToggle.style.display = 'none';
        if (focusToggle) focusToggle.style.display = 'none';
        
        // Configuración colapsable
        const configHeader = document.getElementById('configHeader');
        if (configHeader) {
            configHeader.addEventListener('click', () => {
                const configCard = document.getElementById('configCard');
                const isCollapsed = configCard.classList.toggle('collapsed');
                const icon = configHeader.querySelector('.fa-chevron-down');
                if (icon) {
                    icon.className = isCollapsed ? 'fas fa-chevron-down' : 'fas fa-chevron-up';
                }
            });
        }
    }
    
    setupEventListeners() {
        // Escanear código manual
        this.qrInput.addEventListener('input', (e) => {
            const code = e.target.value.trim();
            console.log('📥 Código ingresado manualmente:', code);
            
            if (code && code !== this.lastCode) {
                this.handleScannedCode(code);
            }
        });
        
        // Actualizar datos - SIEMPRE FRESCO
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
        this.updateStatus('CARGANDO DATOS FRESCOS', 'info');
        
        try {
            await window.app.loadAllData();
            this.updateStatus('LISTO - DATOS FRESCOS', 'success');
            this.updateDataCount();
            this.updateLoadInfo();
            window.app.playSuccessSound();
        } catch (error) {
            console.error('❌ Error cargando datos frescos:', error);
            this.updateStatus('ERROR CARGA', 'danger');
            window.app.playErrorSound();
        }
    }
    
    async refreshData() {
        this.updateStatus('RECARGANDO...', 'warning');
        
        try {
            // Forzar recarga COMPLETA
            await window.app.forceReloadData();
            this.updateStatus('DATOS ACTUALIZADOS', 'success');
            this.updateDataCount();
            this.updateLoadInfo();
            window.app.playSuccessSound();
        } catch (error) {
            console.error('❌ Error actualizando datos:', error);
            this.updateStatus('ERROR ACTUALIZACIÓN', 'danger');
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
        this.updateStatus('BUSCANDO...', 'warning');
        
        console.log('🔍 Buscando código en datos FRESCOS:', code);
        
        try {
            // SIEMPRE usar datos frescos
            const result = await window.app.searchData(code);
            
            if (result) {
                console.log('✅ Resultado encontrado (DATOS FRESCOS):', result.DOCUMENTO);
                this.renderCompleteResult(result);
                this.updateStatus(result.ESTADO || 'ENCONTRADO', 'success');
                
                if (result.SEMANAS && result.SEMANAS.toString().trim() !== '') {
                    this.updateWeekNumber(result.SEMANAS);
                }
                
                window.app.playSuccessSound();
            } else {
                console.log('❌ Código no encontrado en datos frescos:', code);
                this.showNotFound(code);
                this.updateStatus('NO ENCONTRADO', 'danger');
                window.app.playErrorSound();
            }
        } catch (error) {
            console.error('❌ Error en búsqueda:', error);
            this.updateStatus('ERROR BÚSQUEDA', 'danger');
            window.app.playErrorSound();
        } finally {
            this.isProcessing = false;
            this.lastScanned.innerHTML = `<strong>${code}</strong>`;
        }
    }
    
    renderCompleteResult(data) {
        console.log('🎨 Renderizando resultado completo:', data);
        
        const supportHtml = data.SOPORTE && window.app.getSetting('pda_thumb') ? 
            `<img src="${data.SOPORTE}" class="support-thumb" onclick="manualModule.openSupportImage('${data.SOPORTE}')" alt="Soporte">` : '';
        
        const html = `
            <div class="manual-result-complete">
                <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:12px;margin-bottom:16px;">
                    <div style="flex:1;min-width:0;">
                        <div style="font-weight:900;font-size:16px;line-height:1.2">${data.DOCUMENTO || 'Sin documento'} — ${data.REFERENCIA || 'Sin referencia'}</div>
                        <div style="color:var(--muted);font-size:13px;margin-top:6px">${data.DESCRIPCIÓN || ''}</div>
                    </div>
                    <span class="manual-status-badge ${this.getStatusClass(data.ESTADO)}">
                        ${data.ESTADO || 'PENDIENTE'}
                    </span>
                </div>

                <div class="manual-priority">
                    <div class="manual-mini">
                        <div class="manual-mini-label">CLASE</div>
                        <div class="manual-mini-value">${data.CLASE || '—'}</div>
                    </div>
                    <div class="manual-mini">
                        <div class="manual-mini-label">GÉNERO</div>
                        <div class="manual-mini-value">${data.GENERO || '—'}</div>
                    </div>
                    <div class="manual-mini">
                        <div class="manual-mini-label">PRENDA</div>
                        <div class="manual-mini-value">${data.PRENDA || '—'}</div>
                    </div>
                    <div class="manual-mini">
                        <div class="manual-mini-label">PROVEEDOR</div>
                        <div class="manual-mini-value">${data.PROVEEDOR || '—'}</div>
                    </div>
                </div>

                ${supportHtml}

                <div class="detail-grid">
                    ${this.generateDetailItems(data)}
                </div>
                
                <div style="margin-top:16px;padding:12px;background:var(--glass);border-radius:8px;font-size:11px;color:var(--muted);text-align:center;">
                    <i class="fas fa-sync-alt"></i> Datos actualizados: ${new Date().toLocaleTimeString()}
                </div>
            </div>
        `;
        
        this.resultArea.innerHTML = html;
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
                        <div class="detail-label">${field}</div>
                        <div class="detail-value">${data[field]}</div>
                    </div>
                `;
            }
            return '';
        }).filter(item => item !== '').join('');
    }
    
    showNotFound(code) {
        this.resultArea.innerHTML = `
            <div class="manual-not-found">
                <i class="material-icons">search_off</i>
                <div style="font-size:14px;margin-top:8px">No se encontró: <strong>${code}</strong></div>
                <div style="font-size:11px;color:var(--muted);margin-top:4px">Datos actualizados: ${new Date().toLocaleTimeString()}</div>
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
        this.pillStatus.className = 'pill ' + type;
    }
    
    updateDataCount() {
        if (window.app.dataCache) {
            const count = Object.keys(window.app.dataCache).length;
            this.pillCount.innerHTML = `<i class="fas fa-database"></i> ${count}`;
        }
    }
    
    // Actualizar información de carga (reemplaza cache info)
    updateLoadInfo() {
        const loadInfo = window.app.getLastLoadInfo();
        if (loadInfo.time) {
            const timeStr = loadInfo.time.toLocaleTimeString();
            this.cacheCount.textContent = loadInfo.recordCount;
            this.cacheAge.textContent = timeStr;
        } else {
            this.cacheCount.textContent = '0';
            this.cacheAge.textContent = '—';
        }
    }
    
    updateWeekNumber(weekData = null) {
        let weekDisplay = '—';
        
        if (weekData) {
            const extractedWeek = window.app.extractWeekNumber(weekData);
            if (extractedWeek && extractedWeek !== '—') {
                weekDisplay = extractedWeek;
                console.log('📅 Semana desde datos:', weekDisplay);
            }
        }
        
        this.weekNumber.textContent = weekDisplay;
    }
    
    openSupportImage(src) {
        const modal = document.getElementById('modal');
        const modalImg = document.getElementById('modalImg');
        if (modal && modalImg) {
            modalImg.src = src;
            modal.classList.add('show');
        }
    }
}

// Hacer disponible globalmente
window.manualModule = new ManualModule();

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        window.manualModule.init();
    }, 100);
});