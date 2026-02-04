let allData = null;
let filteredData = null;
let separator = ';';

// Función para convertir fecha a zona horaria de Colombia
function toColombiaDate(dateString) {
    if (!dateString) return null;
    const [year, month, day] = dateString.split('-').map(Number);
    const date = new Date(Date.UTC(year, month - 1, day, 5, 0, 0));
    return date;
}

// Inicializar Flatpickr
const datePicker = flatpickr("#dateRange", {
    mode: "range",
    dateFormat: "Y-m-d",
    locale: {
        firstDayOfWeek: 1,
        weekdays: {
            shorthand: ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"],
            longhand: [
                "Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"
            ]
        },
        months: {
            shorthand: [
                "Ene", "Feb", "Mar", "Abr", "May", "Jun",
                "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"
            ],
            longhand: [
                "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
                "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
            ]
        }
    }
});

// Toggle panels
document.getElementById('filterBtn').addEventListener('click', () => {
    const panel = document.getElementById('filtersPanel');
    const configPanel = document.getElementById('configPanel');
    panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
    configPanel.style.display = 'none';
});

document.getElementById('configBtn').addEventListener('click', () => {
    const panel = document.getElementById('configPanel');
    const filterPanel = document.getElementById('filtersPanel');
    panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
    filterPanel.style.display = 'none';
});

// Configurar separadores
document.querySelectorAll('.config-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.config-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        separator = btn.dataset.sep;
    });
});

// Función para cargar datos
async function loadData() {
    const status = document.getElementById('status');

    try {
        const response = await fetch('https://script.google.com/macros/s/AKfycbz67OzWNpeM9SJR-Tx8A-4quLGLie5VXy8At4kG4qylhDRQHoE4zfgrpgk0N7aFs-glzw/exec');
        allData = await response.json();
        applyFilters();
        status.textContent = `✓ ${filteredData.length} registros cargados`;
        document.getElementById('downloadBtn').disabled = false;
    } catch (error) {
        status.textContent = '✗ Error al cargar datos';
    }
}

// Cargar datos automáticamente al iniciar
loadData();

// Función para aplicar filtros
function applyFilters() {
    if (!allData) return;

    filteredData = [...allData];

    // Filtrar por descripción
    const filterDesc = document.getElementById('filterDesc').checked;
    if (filterDesc) {
        filteredData = filteredData.filter(item => {
            const desc = item['DESCRIPCIÓN'] || '';
            return desc.toString().trim() !== '';
        });
    }

    // Filtrar por rango de fechas
    const selectedDates = datePicker.selectedDates;
    if (selectedDates.length === 2) {
        const startDate = new Date(selectedDates[0]);
        const endDate = new Date(selectedDates[1]);

        startDate.setHours(0, 0, 0, 0);
        endDate.setHours(23, 59, 59, 999);

        filteredData = filteredData.filter(item => {
            if (!item['FECHA']) return false;
            const itemDate = toColombiaDate(item['FECHA']);
            if (!itemDate) return false;
            return itemDate >= startDate && itemDate <= endDate;
        });
    }

    // Actualizar estado
    const status = document.getElementById('status');
    if (allData) {
        status.textContent = `✓ ${filteredData.length} de ${allData.length} registros`;
    }
}

// Listeners para filtros
document.getElementById('filterDesc').addEventListener('change', applyFilters);
datePicker.config.onChange.push(() => {
    setTimeout(applyFilters, 100);
});

// Descargar CSV
document.getElementById('downloadBtn').addEventListener('click', () => {
    if (!filteredData || filteredData.length === 0) {
        document.getElementById('status').textContent = '✗ No hay datos';
        return;
    }

    const headers = [
        'DOCUMENTO', 'FECHA', 'TALLER', 'LINEA', 'AUDITOR',
        'ESCANER', 'LOTE', 'REFPROV', 'DESCRIPCIÓN', 'CANTIDAD',
        'REFERENCIA', 'TIPO', 'PVP', 'PRENDA', 'GENERO', 'GESTOR',
        'PROVEEDOR', 'CLASE', 'FUENTE'
    ];

    let finalHeaders = headers.map(h => h === 'DESCRIPCIÓN' ? 'DESCRIPCION' : h);
    let csv = finalHeaders.join(separator) + '\n';

    filteredData.forEach(item => {
        const row = headers.map(header => {
            let value = item[header] || '';
            if (typeof value === 'number') value = value.toString();
            if (value.includes(separator) || value.includes('"') || value.includes('\n')) {
                value = `"${value.replace(/"/g, '""')}"`;
            }
            return value;
        });
        csv += row.join(separator) + '\n';
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');

    const dateStr = new Date().toISOString().slice(0, 10);
    link.download = `datos_${dateStr}.csv`;
    link.href = url;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    document.getElementById('status').textContent = '✓ CSV exportado';
});






// === PWA INSTALLATION ===
let deferredPrompt;
const installBtn = document.getElementById('installBtn');
const installToast = document.getElementById('installToast');
const toastInstallBtn = document.getElementById('toastInstallBtn');
const toastDismissBtn = document.getElementById('toastDismissBtn');

// Evento antes de instalar
window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;

    // Mostrar botón de instalación en header
    installBtn.style.display = 'flex';

    // Mostrar toast después de 3 segundos
    setTimeout(() => {
        if (deferredPrompt) {
            installToast.classList.add('show');
        }
    }, 3000);

    // Botón de instalación en header
    installBtn.addEventListener('click', () => {
        showInstallPrompt();
    });

    // Botón de instalación en toast
    toastInstallBtn.addEventListener('click', () => {
        showInstallPrompt();
    });
});

// Mostrar prompt de instalación
function showInstallPrompt() {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();

    deferredPrompt.userChoice.then((choiceResult) => {
        if (choiceResult.outcome === 'accepted') {
            console.log('Usuario aceptó la instalación');
            installBtn.style.display = 'none';
            installToast.classList.remove('show');
        } else {
            console.log('Usuario rechazó la instalación');
        }

        deferredPrompt = null;
        installToast.classList.remove('show');
    });
}

// Cerrar toast
toastDismissBtn.addEventListener('click', () => {
    installToast.classList.remove('show');
});

// Evento después de instalar
window.addEventListener('appinstalled', () => {
    console.log('Aplicación instalada');
    installBtn.style.display = 'none';
    installToast.classList.remove('show');
});

// El Service Worker se registra ahora en index.html

// Detectar si ya está instalado
if (window.matchMedia('(display-mode: standalone)').matches) {
    console.log('App en modo standalone');
    installBtn.style.display = 'none';
}

// Initialize particles
if (typeof tsParticles !== 'undefined') {
    tsParticles.load('tsparticles', {
        particles: {
            number: {
                value: 100,
                density: {
                    enable: true,
                    value_area: 800
                }
            },
            color: {
                value: "#ffffff"
            },
            shape: {
                type: "circle"
            },
            opacity: {
                value: 0.5,
                random: false
            },
            size: {
                value: 3,
                random: true
            },
            links: {
                enable: true,
                distance: 150,
                color: "#ffffff",
                opacity: 0.4,
                width: 1
            },
            move: {
                enable: true,
                speed: 6,
                direction: "none",
                random: false,
                straight: false,
                outModes: "out"
            }
        },
        interactivity: {
            events: {
                onHover: {
                    enable: true,
                    mode: "repulse"
                },
                onClick: {
                    enable: true,
                    mode: "push"
                },
                resize: true
            },
            modes: {
                repulse: {
                    distance: 200,
                    duration: 0.4
                },
                push: {
                    quantity: 4
                }
            }
        },
        detectRetina: true
    }).catch(error => {
        console.error("Error loading particles:", error);
    });
}