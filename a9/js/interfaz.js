// Lógica de Interfaz de Usuario y DOM

// Función para extracción de datos de la UI
function extractDataFromUI(factura) {
    let lote = '', referencia = '', cantidad = 0;

    // Buscar contenedor de la factura
    const facturaContainer = document.querySelector(`.siesa-item button[data-factura="${factura}"]`)?.closest('.siesa-item');

    if (facturaContainer) {
        // Buscar en los detalles miniatura
        const details = facturaContainer.querySelectorAll('.mini-detail');

        details.forEach(detail => {
            const label = detail.querySelector('.mini-label')?.textContent.trim();
            const value = detail.querySelector('.mini-value')?.textContent.trim();

            if (!label || !value) return;

            if (label.includes('LOTE')) lote = value;
            else if (label.includes('REFERENCIA')) referencia = value; // Siesa item referencia
        });

        // Fallback: buscar en todo el texto del contenedor si no se encuentra
        if (!cantidad) {
            // Buscar especificamente el campo cantidad
            details.forEach(detail => {
                const label = detail.querySelector('.mini-label')?.textContent.trim();
                if (label && label.includes('CANTIDAD')) {
                    cantidad = parseFloat(detail.querySelector('.mini-value')?.textContent.trim()) || 0;
                }
            });
        }
    }

    return { lote, referencia, cantidad };
}

// Pantalla de carga
function hideLoadingScreen() {
    const scanner = document.getElementById('scanner');
    const loadingScreen = document.getElementById('loadingScreen');
    const barcodeInput = document.getElementById('barcode');

    if (scanner) scanner.style.display = 'flex';

    if (loadingScreen) {
        loadingScreen.style.opacity = '0';

        setTimeout(() => {
            loadingScreen.style.display = 'none';
            // Enfocar el campo de entrada
            if (barcodeInput) {
                barcodeInput.focus();
            }
        }, 500);
    }
}

// Imágenes
function mostrarImagenCompleta(imageUrl) {
    let modal = document.getElementById('ih3Modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'ih3Modal';
        modal.className = 'ih3-modal';
        modal.innerHTML = `
      <span class="close-modal" onclick="cerrarImagenCompleta()">&times;</span>
      <img class="ih3-modal-img" src="" alt="Comprobante completo">
    `;
        document.body.appendChild(modal);

        modal.addEventListener('click', function (e) {
            if (e.target === modal) {
                cerrarImagenCompleta();
            }
        });
    }

    const img = modal.querySelector('.ih3-modal-img');
    img.src = imageUrl;
    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
}

function cerrarImagenCompleta() {
    const modal = document.getElementById('ih3Modal');
    if (modal) {
        modal.style.display = 'none';
        document.body.style.overflow = '';
    }
}

// Items Siesa (Acordeones)
function toggleSiesaItem(index) {
    const item = document.getElementById(`siesa-item-${index}`);
    if (item) {
        if (item.classList.contains('collapsed')) {
            item.classList.remove('collapsed');
            item.classList.add('expanded');
        } else {
            item.classList.remove('expanded');
            item.classList.add('collapsed');
        }
    }
}

function expandAllSiesaItems() {
    document.querySelectorAll('.siesa-item.collapsed').forEach(item => {
        const index = item.id.replace('siesa-item-', '');
        toggleSiesaItem(index);
    });
}

function collapseAllSiesaItems() {
    document.querySelectorAll('.siesa-item.expanded').forEach(item => {
        const index = item.id.replace('siesa-item-', '');
        toggleSiesaItem(index);
    });
}

// Utilidades UI
function esMovil() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

// Inicialización de Listeners UI (llamado desde inicio.js)
function initUIListeners() {
    const barcodeInput = document.getElementById('barcode');

    // Foco persistente excepto cuando la cámara está abierta
    function enforceFocus() {
        const cameraModal = document.getElementById('cameraModal');
        // Solo aplicar foco si la cámara no está abierta
        if (document.activeElement !== barcodeInput &&
            cameraModal && cameraModal.style.display !== 'flex') {
            if (barcodeInput) barcodeInput.focus();
        }
        setTimeout(enforceFocus, 100);
    }
    enforceFocus();

    // Detector para deshabilitar el teclado virtual en dispositivos móviles
    document.addEventListener('touchstart', function (e) {
        const cameraModal = document.getElementById('cameraModal');
        if (cameraModal && cameraModal.style.display === 'flex' &&
            e.target.tagName !== 'BUTTON') {
            e.preventDefault();
            if (document.activeElement) {
                document.activeElement.blur();
            }
        }
    }, { passive: false });

    // Manejar el cambio de orientación en dispositivos móviles
    window.addEventListener('orientationchange', function () {
        const cameraModal = document.getElementById('cameraModal');
        if (cameraModal && cameraModal.style.display === 'flex') {
            setTimeout(() => {
                document.activeElement.blur();
            }, 300);
        }
    });

    // Bloqueo de orientacion
    if (screen.orientation && screen.orientation.lock) {
        screen.orientation.lock('portrait').catch(function (error) {
            console.log('Rotación no bloqueada:', error);
        });
    }

    // Prevenir gestos de zoom
    document.addEventListener('gesturestart', function (e) {
        e.preventDefault();
    });

    // Prevenir doble toque para zoom
    let lastTouchEnd = 0;
    document.addEventListener('touchend', function (e) {
        const now = Date.now();
        if (now - lastTouchEnd <= 300) e.preventDefault();
        lastTouchEnd = now;
    }, { passive: false });

    // Prevenir zoom con teclado (Ctrl + +/-)
    document.addEventListener('keydown', function (e) {
        if (e.ctrlKey && (e.key === '+' || e.key === '-' || e.key === '0')) {
            e.preventDefault();
        }
    });
}
