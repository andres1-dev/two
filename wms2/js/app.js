// Módulo principal de la aplicación - Funcionalidades comunes
class WMSApp {
    constructor() {
        // Configuración
        this.spreadsheetId = '1EDZ3uRjIDe2oi9F88qBNjHxuy5_S1Se4IwIDlS4EsZE';
        this.sheetName = 'POST';
        this.range = 'A:Y';
        this.apiKey = 'AIzaSyC7hjbRc0TGLgImv8gVZg8tsOeYWgXlPcM';
        
        this.headers = ['DOCUMENTO','FECHA','LOTE','REFPROV','DESCRIPCIÓN','REFERENCIA','TIPO','PVP','PRENDA','GENERO','PROVEEDOR','CLASE','FUENTE','NIT','CLIENTE','CANT','FACTURA','SOPORTE','ESTADO','FACTURA_2','FECHA_FACT','CANT_FACTURA','ESTADO','SEMANAS','KEY'];
        
        // Estado
        this.dataCache = null;
        this.cacheTimestamp = null;
        this.CACHE_DURATION = 5 * 60 * 1000; // 5 minutos
        
        // Audio
        this.audioContext = null;
        
        console.log('Aplicación WMS inicializada');
    }
    
    // Funcionalidades de audio (comunes a todos los módulos)
    getAudioContext() {
        if (!this.audioContext) {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        }
        if (this.audioContext.state === 'suspended') {
            this.audioContext.resume();
        }
        return this.audioContext;
    }
    
    playSuccessSound() {
        if (!this.getSetting('pda_sound')) return;
        try {
            const ctx = this.getAudioContext();
            const osc = ctx.createOscillator();
            const gainNode = ctx.createGain();
            
            osc.connect(gainNode);
            gainNode.connect(ctx.destination);
            
            osc.frequency.value = 800;
            gainNode.gain.value = 0.5;
            
            osc.start(ctx.currentTime);
            osc.stop(ctx.currentTime + 0.1);
        } catch (e) {
            console.log("Error al reproducir sonido de éxito:", e);
        }
    }
    
    playErrorSound() {
        if (!this.getSetting('pda_sound')) return;
        try {
            const ctx = this.getAudioContext();
            const osc = ctx.createOscillator();
            const gainNode = ctx.createGain();
            
            osc.connect(gainNode);
            gainNode.connect(ctx.destination);
            
            osc.frequency.value = 300;
            gainNode.gain.value = 0.5;
            
            osc.start(ctx.currentTime);
            osc.stop(ctx.currentTime + 0.3);
        } catch (e) {
            console.log("Error al reproducir sonido de error:", e);
        }
    }
    
    playChimeSound() {
        if (!this.getSetting('pda_sound')) return;
        try {
            const ctx = this.getAudioContext();
            const now = ctx.currentTime;
            
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            
            osc.type = 'sine';
            osc.frequency.setValueAtTime(523.25, now);
            osc.frequency.setValueAtTime(659.25, now + 0.1);
            osc.frequency.setValueAtTime(783.99, now + 0.2);
            
            gain.gain.setValueAtTime(0, now);
            gain.gain.linearRampToValueAtTime(0.3, now + 0.05);
            gain.gain.linearRampToValueAtTime(0, now + 0.3);
            
            osc.connect(gain);
            gain.connect(ctx.destination);
            
            osc.start(now);
            osc.stop(now + 0.3);
        } catch (e) {
            console.log("Error al reproducir sonido de carga:", e);
        }
    }
    
    playConfirmArpeggio() {
        if (!this.getSetting('pda_sound')) return;
        try {
            const ctx = this.getAudioContext();
            const now = ctx.currentTime;
            
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            
            osc.type = 'sine';
            osc.frequency.setValueAtTime(523.25, now);
            osc.frequency.setValueAtTime(659.25, now + 0.1);
            osc.frequency.setValueAtTime(783.99, now + 0.2);
            
            gain.gain.setValueAtTime(0, now);
            gain.gain.linearRampToValueAtTime(0.4, now + 0.05);
            gain.gain.linearRampToValueAtTime(0, now + 0.3);
            
            osc.connect(gain);
            gain.connect(ctx.destination);
            
            osc.start(now);
            osc.stop(now + 0.3);
        } catch (e) {
            console.log("Error al reproducir sonido de confirmación:", e);
        }
    }
    
    // Gestión de configuración
    getSetting(key) {
        return JSON.parse(localStorage.getItem(key) ?? JSON.stringify(true));
    }
    
    setSetting(key, value) {
        localStorage.setItem(key, JSON.stringify(value));
    }
    
    // Carga de datos
    async loadAllData() {
        console.log('Cargando datos desde Google Sheets...');
        
        try {
            const url = `https://sheets.googleapis.com/v4/spreadsheets/${this.spreadsheetId}/values/${this.sheetName}!${this.range}?key=${this.apiKey}`;
            const response = await fetch(url);
            
            if (!response.ok) throw new Error('Error: ' + response.status);
            
            const data = await response.json();
            
            if (!data.values || data.values.length < 2) throw new Error('Sin datos');
            
            const rows = data.values.slice(1);
            this.dataCache = {};
            
            rows.forEach(row => {
                if (row.length > 24 && row[24]) {
                    const key = row[24].toString().trim();
                    const rowData = {};
                    this.headers.forEach((h, i) => rowData[h] = row[i] || '');
                    this.dataCache[key] = rowData;
                }
            });
            
            this.cacheTimestamp = Date.now();
            console.log(`✅ Datos cargados: ${Object.keys(this.dataCache).length} registros`);
            
            return this.dataCache;
        } catch (e) {
            console.error('Error cargando datos:', e);
            throw e;
        }
    }
    
    isCacheExpired() {
        return !this.cacheTimestamp || (Date.now() - this.cacheTimestamp) > this.CACHE_DURATION;
    }
    
    // Búsqueda de datos
    async searchData(code) {
        console.log('Buscando código:', code);
        
        // Verificar caché
        if (!this.dataCache || this.isCacheExpired()) {
            if (this.getSetting('pda_auto')) {
                await this.loadAllData();
            }
        }
        
        // Buscar en caché
        const found = this.dataCache ? this.dataCache[code] : null;
        
        if (found) {
            console.log('✅ Resultado encontrado:', found.DOCUMENTO);
            return found;
        } else {
            console.log('❌ Código no encontrado:', code);
            return null;
        }
    }
    
    // Utilidades
    extractWeekNumber(weekText) {
        if (!weekText) return '—';
        const match = weekText.toString().match(/\d+/);
        return match ? match[0] : weekText;
    }
    
    getWeekNumber() {
        const now = new Date();
        const start = new Date(now.getFullYear(), 0, 1);
        const days = Math.floor((now - start) / (24 * 60 * 60 * 1000));
        return Math.ceil(days / 7);
    }
}

// Hacer disponible globalmente
window.app = new WMSApp();

// Inicializar audio en iOS
document.addEventListener('DOMContentLoaded', () => {
    // Activar audio en iOS al primer toque
    const activateAudio = () => {
        if (window.app) {
            window.app.getAudioContext();
        }
        document.removeEventListener('click', activateAudio);
        document.removeEventListener('touchstart', activateAudio);
    };
    
    document.addEventListener('click', activateAudio);
    document.addEventListener('touchstart', activateAudio);
});