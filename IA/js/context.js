/**
 * context.js - DeepScope Context Manager
 * Maneja la activación del contexto y la generación de prompts enriquecidos
 */

window.ContextManager = {
    isActive: false,
    
    /**
     * Inicializar el gestor de contexto
     */
    init() {
        // Configurar botón de contexto
        const contextBtn = document.getElementById('contextBtn');
        if (contextBtn) {
            contextBtn.addEventListener('click', () => this.toggleContext());
        }
        
        // Actualizar UI inicial
        this.updateUI();
        
        console.log("✅ ContextManager inicializado");
    },
    
    /**
     * Activar/desactivar contexto
     */
    toggleContext() {
        this.isActive = !this.isActive;
        this.updateUI();
        
        // Mostrar mensaje de estado
        const statusMsg = this.isActive ? 
            "✅ Contexto activado - Usando datos del sistema" : 
            "ℹ️ Contexto desactivado - Modo chat normal";
        
        // Mostrar notificación temporal
        this.showNotification(statusMsg);
        
        return this.isActive;
    },
    
    /**
     * Actualizar UI del botón
     */
    updateUI() {
        const contextBtn = document.getElementById('contextBtn');
        if (!contextBtn) return;
        
        const icon = contextBtn.querySelector('i');
        const span = contextBtn.querySelector('span');
        
        if (this.isActive) {
            contextBtn.classList.add('active');
            if (icon) icon.className = 'fas fa-database';
            if (span) span.textContent = 'Contexto Activo';
        } else {
            contextBtn.classList.remove('active');
            if (icon) icon.className = 'far fa-database';
            if (span) span.textContent = 'Contexto';
        }
    },
    
    /**
     * Generar prompt enriquecido con contexto
     * @param {string} userQuery - Pregunta del usuario
     * @returns {Promise<string>} Prompt completo para el LLM
     */
    async generatePrompt(userQuery) {
        if (!this.isActive) {
            return userQuery; // Modo normal, sin contexto
        }
        
        try {
            // Mostrar indicador de carga
            this.showNotification("🔍 Buscando en base de datos...", "info", 1000);
            
            // Buscar datos relevantes
            const result = await DataFilterEngine.search(userQuery);
            
            if (!result.context || result.context === "No se encontraron facturas") {
                return `${userQuery}\n\n[Contexto: No se encontraron datos relevantes en el sistema para esta consulta.]`;
            }
            
            // Construir prompt enriquecido
            const prompt = `[CONTEXTO DEL SISTEMA DEEPSCOPE]
${result.context}

[METADATOS]
- Total facturas en sistema: ${DataFilterEngine.llmData?.metadata?.totalFacturas || 'N/A'}
- Rango fechas: ${DataFilterEngine.llmData?.metadata?.rangoFechas?.min || 'N/A'} a ${DataFilterEngine.llmData?.metadata?.rangoFechas?.max || 'N/A'}
- Clientes activos: ${DataFilterEngine.llmData?.metadata?.clientes || 'N/A'}

[PREGUNTA DEL USUARIO]
${userQuery}

Por favor, responde la pregunta basándote en el contexto proporcionado. Si la información no está disponible en el contexto, indícalo claramente.`;
            
            return prompt;
            
        } catch (error) {
            console.error("Error generando prompt con contexto:", error);
            return `${userQuery}\n\n[Error al cargar contexto: ${error.message}]`;
        }
    },
    
    /**
     * Mostrar notificación temporal
     */
    showNotification(message, type = "info", duration = 2000) {
        // Crear elemento de notificación si no existe
        let notif = document.getElementById('context-notification');
        if (!notif) {
            notif = document.createElement('div');
            notif.id = 'context-notification';
            notif.style.cssText = `
                position: fixed;
                bottom: 80px;
                left: 50%;
                transform: translateX(-50%);
                background: #1e293b;
                color: white;
                padding: 8px 16px;
                border-radius: 30px;
                font-size: 13px;
                font-weight: 500;
                z-index: 10000;
                box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                transition: opacity 0.3s;
                opacity: 0;
                pointer-events: none;
            `;
            document.body.appendChild(notif);
        }
        
        // Configurar icono según tipo
        const icon = type === 'success' ? '✅' : type === 'error' ? '❌' : 'ℹ️';
        notif.innerHTML = `${icon} ${message}`;
        
        // Mostrar y luego ocultar
        notif.style.opacity = '1';
        setTimeout(() => {
            notif.style.opacity = '0';
        }, duration);
    },
    
    /**
     * Obtener resumen del sistema
     */
    getSystemSummary() {
        return DataFilterEngine.getExecutiveSummary();
    },
    
    /**
     * Refrescar datos
     */
    async refreshData() {
        this.showNotification("🔄 Recargando datos...", "info");
        await DataFilterEngine.refresh();
        this.showNotification("✅ Datos actualizados", "success");
    }
};

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    window.ContextManager.init();
});