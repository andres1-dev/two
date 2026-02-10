// Script de Inicialización y Encendido de la App

document.addEventListener('DOMContentLoaded', () => {
    // 0. Registrar Service Worker
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('./sw.js')
                .then(registration => {
                    console.log('SW registrado con éxito:', registration.scope);
                })
                .catch(err => {
                    console.log('Fallo registro SW:', err);
                });
        });
    }

    // Bloquear rotación de pantalla (Forzar Portrait)
    if (screen.orientation && screen.orientation.lock) {
        screen.orientation.lock('portrait').catch(function (error) {
            console.log('La orientación no pudo ser bloqueada por JS: ' + error);
        });
    }

    // 1. Inicializar Listeners UI
    initUIListeners();

    // 2. Inicializar Listeners QR
    initQRListeners();

    // 3. Referencias DOM para eventos online/offline
    const offlineBanner = document.getElementById('offline-banner');
    const statusDiv = document.getElementById('status');

    // Verificar si estamos en modo offline
    window.addEventListener('online', function () {
        if (offlineBanner) offlineBanner.style.display = 'none';
        if (statusDiv) {
            statusDiv.className = 'reconnected';
            statusDiv.innerHTML = '<i class="fas fa-wifi"></i> CONEXIÓN RESTABLECIDA';
        }
        // Si los datos aún no se han cargado, intentar cargarlos de nuevo
        if (!dataLoaded) {
            setTimeout(() => loadDataFromServer(), 1000);
        }
    });

    window.addEventListener('offline', function () {
        if (offlineBanner) offlineBanner.style.display = 'block';
        if (statusDiv) {
            statusDiv.className = 'offline';
            statusDiv.innerHTML = `
        <div style="display: flex; align-items: center; justify-content: center; gap: 10px; text-align: center;">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" class="bi bi-wifi-off" viewBox="0 0 16 16">
            <path d="M10.706 3.294A12.6 12.6 0 0 0 8 3C5.259 3 2.723 3.882.663 5.379a.485.485 0 0 0-.048.736.52.52 0 0 0 .668.05A11.45 11.45 0 0 1 8 4q.946 0 1.852.148zM8 6c-1.905 0-3.68.56-5.166 1.526a.48.48 0 0 0-.063.745.525.525 0 0 0 .652.065 8.45 8.45 0 0 1 3.51-1.27zm2.596 1.404.785-.785q.947.362 1.785.907a.482.482 0 0 1 .063.745.525.525 0 0 1-.652.065 8.5 8.5 0 0 0-1.98-.932zM8 10l.933-.933a6.5 6.5 0 0 1 2.013.637c.285.145.326.524.1.75l-.015.015a.53.53 0 0 1-.611.09A5.5 5.5 0 0 0 8 10m4.905-4.905.747-.747q.886.451 1.685 1.03a.485.485 0 0 1 .047.737.52.52 0 0 1-.668.05 11.5 11.5 0 0 0-1.811-1.07M9.02 11.78c.238.14.236.464.04.66l-.707.706a.5.5 0 0 1-.707 0l-.707-.707c-.195-.195-.197-.518.04-.66A2 2 0 0 1 8 11.5c.374 0 .723.102 1.021.28zm4.355-9.905a.53.53 0 0 1 .75.75l-10.75 10.75a.53.53 0 0 1-.75-.75z"/>
            </svg>
            <span>MODO OFFLINE ACTIVO</span>
        </div>
        `;
        }
    });

    // Pull-to-refresh
    initPullToRefresh();

    // Agregar eventos para prevenir teclado virtual en cámara de forma segura
    const cameraModal = document.getElementById('cameraModal');
    if (cameraModal) {
        document.addEventListener('focusin', function (e) {
            if (cameraModal.style.display === 'flex' &&
                e.target.id !== 'dummyInput') {
                e.preventDefault();
            }
        });
    }

    // 4. Cargar datos
    loadDataFromServer();


});

function initPullToRefresh() {
    const statusDiv = document.getElementById('status');
    let startY = 0;
    let isPulling = false;

    document.addEventListener('touchstart', function (e) {
        // Standard 1-finger pull to refresh
        if (window.scrollY === 0 && e.touches.length === 1) {
            startY = e.touches[0].clientY;
            isPulling = true;
        }
    }, { passive: true });

    document.addEventListener('touchmove', function (e) {
        if (!isPulling) return;
    }, { passive: true });

    document.addEventListener('touchend', function (e) {
        if (!isPulling) return;
        const endY = e.changedTouches[0].clientY;
        const pullDistance = endY - startY;

        if (pullDistance > 100 && window.scrollY === 0) {
            if (statusDiv) {
                statusDiv.className = 'loading';
                statusDiv.innerHTML = '<i class="fas fa-sync fa-spin"></i> ACTUALIZANDO...';
            }

            if (typeof obtenerDatosFacturados === 'function') {
                obtenerDatosFacturados()
                    .then(serverData => {
                        handleDataLoadSuccess(serverData);
                        if (currentQRParts) {
                            processQRCodeParts(currentQRParts);
                        }
                    })
                    .catch(error => handleDataLoadError(error));
            }
        }
        isPulling = false;
    });
}
