// nuevo-ui.js - Gestión de la nueva interfaz de usuario
class DataSyncUI {
    constructor() {
        this.init();
    }

    init() {
        this.setupTabNavigation();
        this.setupEventListeners();
        this.initializeDashboard();
        this.setDefaultDates();
    }

    setupTabNavigation() {
        const tabButtons = document.querySelectorAll('.tab-button');
        const contentSections = document.querySelectorAll('.content-section');

        tabButtons.forEach(button => {
            button.addEventListener('click', () => {
                const targetTab = button.getAttribute('data-tab');
                
                // Actualizar botones activos
                tabButtons.forEach(btn => btn.classList.remove('active'));
                button.classList.add('active');
                
                // Mostrar sección activa
                contentSections.forEach(section => {
                    section.classList.remove('active');
                    if (section.id === `${targetTab}-section`) {
                        section.classList.add('active');
                    }
                });

                // Scroll suave a la sección en móviles
                if (window.innerWidth < 768) {
                    section.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
            });
        });
    }

    setupEventListeners() {
        // Integración con los eventos existentes de app.js
        // Los botones mantienen sus listeners originales
        
        // Eventos adicionales para la nueva UI
        this.setupFilterActions();
        this.setupResponsiveBehavior();
    }

    setupFilterActions() {
        // Acciones específicas de filtros
        const filterCards = document.querySelectorAll('.filter-card');
        
        filterCards.forEach(card => {
            card.addEventListener('mouseenter', () => {
                card.style.transform = 'translateY(-2px)';
            });
            
            card.addEventListener('mouseleave', () => {
                card.style.transform = 'translateY(0)';
            });
        });
    }

    setupResponsiveBehavior() {
        // Ajustar comportamiento en diferentes tamaños de pantalla
        window.addEventListener('resize', this.handleResize.bind(this));
        this.handleResize(); // Ejecutar inicialmente
    }

    handleResize() {
        const isMobile = window.innerWidth < 768;
        const tabsContainer = document.querySelector('.tabs-container');
        
        if (isMobile) {
            tabsContainer.style.overflowX = 'auto';
            tabsContainer.style.flexWrap = 'nowrap';
        } else {
            tabsContainer.style.overflowX = 'visible';
            tabsContainer.style.flexWrap = 'wrap';
        }
    }

    initializeDashboard() {
        // Inicializar estadísticas del dashboard
        this.updateDashboardStats({
            totalRecords: 0,
            processedRecords: 0,
            syncStatus: 'Offline'
        });
    }

    updateDashboardStats(stats) {
        document.getElementById('totalRecords').textContent = stats.totalRecords;
        document.getElementById('processedRecords').textContent = stats.processedRecords;
        document.getElementById('syncStatus').textContent = stats.syncStatus;
        
        // Actualizar color del estado
        const statusElement = document.getElementById('syncStatus');
        if (stats.syncStatus === 'Online') {
            statusElement.style.color = 'var(--success-color)';
        } else {
            statusElement.style.color = 'var(--error-color)';
        }
    }

    setDefaultDates() {
        // Sincronizar con las fechas por defecto de app.js
        setTimeout(() => {
            const fechaInicio = document.getElementById('fechaInicio');
            const fechaFin = document.getElementById('fechaFin');
            
            if (fechaInicio && fechaFin && !fechaInicio.value) {
                // Usar las fechas calculadas por app.js
                const rangoFechas = calcularRangoFechas();
                fechaInicio.value = rangoFechas.fechaInicio;
                fechaFin.value = rangoFechas.fechaFin;
            }
        }, 100);
    }

    // Métodos para actualizar la UI con datos de app.js
    updateResultsSummary(data) {
        const summaryElement = document.getElementById('summary');
        
        if (!data || data.registros === 0) {
            summaryElement.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-database"></i>
                    <h3>No hay datos para mostrar</h3>
                    <p>Ejecute la carga de datos para ver los resultados</p>
                </div>
            `;
            return;
        }

        // Calcular estadísticas para el dashboard
        const estados = data.data.reduce((acc, registro) => {
            acc[registro.ESTADO] = (acc[registro.ESTADO] || 0) + 1;
            return acc;
        }, {});

        const validaciones = data.data.reduce((acc, registro) => {
            const clave = registro.VALIDACION ? 'VERDADERO' : 'FALSO';
            acc[clave] = (acc[clave] || 0) + 1;
            return acc;
        }, {});

        const conSemanas = data.data.filter(r => r.SEMANAS && r.SEMANAS !== "").length;
        const sinSemanas = data.data.length - conSemanas;

        // Actualizar dashboard
        this.updateDashboardStats({
            totalRecords: data.registros,
            processedRecords: data.registros,
            syncStatus: 'Online'
        });

        // Generar HTML del resumen
        const estadosHTML = Object.entries(estados).map(([estado, count]) => 
            `<div class="result-stat">
                <h4>${estado}</h4>
                <div class="value">${count}</div>
            </div>`
        ).join('');

        const validacionesHTML = Object.entries(validaciones).map(([validacion, count]) => 
            `<div class="result-stat">
                <h4>Validación ${validacion}</h4>
                <div class="value">${count}</div>
            </div>`
        ).join('');

        summaryElement.innerHTML = `
            <h3>Resumen del Procesamiento</h3>
            <div class="results-info">
                <div class="info-item">
                    <strong>Registros procesados:</strong> ${data.registros}
                </div>
                <div class="info-item">
                    <strong>Rango de fechas:</strong> ${data.rangoFechas.descripcion}
                </div>
                <div class="info-item">
                    <strong>Estado del proceso:</strong> <span class="status-success">${data.status}</span>
                </div>
            </div>
            
            <div class="results-grid">
                <div class="result-stat">
                    <h4>Total Registros</h4>
                    <div class="value">${data.registros}</div>
                </div>
                <div class="result-stat">
                    <h4>Con Semanas</h4>
                    <div class="value">${conSemanas}</div>
                </div>
                <div class="result-stat">
                    <h4>Sin Semanas</h4>
                    <div class="value">${sinSemanas}</div>
                </div>
                ${estadosHTML}
                ${validacionesHTML}
            </div>
        `;
    }

    showLoading(show) {
        const loadingElement = document.getElementById('loading');
        if (show) {
            loadingElement.style.display = 'flex';
            document.body.style.overflow = 'hidden';
        } else {
            loadingElement.style.display = 'none';
            document.body.style.overflow = 'auto';
        }
    }

    showStatus(type, message) {
        const statusElement = document.getElementById('statusMessage');
        statusElement.textContent = message;
        statusElement.className = `status-message ${type}`;
        statusElement.style.display = 'flex';
        
        // Auto-ocultar mensajes de éxito
        if (type === 'success') {
            setTimeout(() => {
                statusElement.style.display = 'none';
            }, 5000);
        }
    }

    // Método para integrar con app.js existente
    integrateWithAppJS() {
        // Sobrescribir funciones de UI de app.js para usar las nuevas
        const originalShowLoading = window.showLoading;
        const originalShowStatus = window.showStatus;
        const originalDisplaySummary = window.displaySummary;

        window.showLoading = (show) => {
            this.showLoading(show);
            // Mantener funcionalidad original si existe
            if (originalShowLoading) originalShowLoading(show);
        };

        window.showStatus = (type, message) => {
            this.showStatus(type, message);
            if (originalShowStatus) originalShowStatus(type, message);
        };

        window.displaySummary = (data) => {
            this.updateResultsSummary(data);
            if (originalDisplaySummary) originalDisplaySummary(data);
        };
    }
}

// Inicialización cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', function() {
    // Inicializar la nueva UI
    window.dataSyncUI = new DataSyncUI();
    
    // Integrar con app.js existente
    window.dataSyncUI.integrateWithAppJS();
    
    // Asegurar que flatpickr se inicialice correctamente
    setTimeout(() => {
        if (typeof flatpickr !== 'undefined') {
            flatpickr(".datepicker", {
                locale: "es",
                dateFormat: "Y-m-d",
                allowInput: true
            });
        }
    }, 100);
});

// Utilidades adicionales
function formatNumber(number) {
    return new Intl.NumberFormat('es-ES').format(number);
}

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}