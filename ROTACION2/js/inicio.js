// Script de Inicialización y Encendido de la App - MODO MÓVIL ESTRICTO

document.addEventListener('DOMContentLoaded', () => {
    // 0. BLOQUEO DE ROTACIÓN - FORZAR PORTRAIT
    if (screen.orientation && screen.orientation.lock) {
        screen.orientation.lock('portrait')
            .then(() => console.log('✅ Orientación bloqueada a portrait'))
            .catch(err => console.log('⚠️ No se pudo bloquear orientación:', err));
    }

    // PREVENIR ROTACIÓN MANUAL (REDIRECT)
    window.addEventListener('orientationchange', function(e) {
        if (window.orientation === 90 || window.orientation === -90) {
            // Si está en landscape, forzar portrait
            if (screen.orientation && screen.orientation.lock) {
                screen.orientation.lock('portrait');
            }
            // Forzar recarga para reajustar
            setTimeout(() => {
                window.scrollTo(0, 0);
                document.body.style.transform = 'rotate(0deg)';
            }, 100);
        }
    });

    // 1. Registrar Service Worker
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('./sw.js')
                .then(registration => {
                    console.log('✅ SW registrado:', registration.scope);
                })
                .catch(err => {
                    console.log('❌ Fallo registro SW:', err);
                });
        });
    }

    // 2. Inicializar Listeners UI (sin desktop)
    if (typeof initUIListeners === 'function') {
        initUIListeners();
    }

    // 3. Inicializar Listeners QR
    if (typeof initQRListeners === 'function') {
        initQRListeners();
    }

    // 4. Referencias DOM
    const offlineBanner = document.getElementById('offline-banner');
    const statusDiv = document.getElementById('status');

    // Eventos Online/Offline
    window.addEventListener('online', function () {
        if (offlineBanner) offlineBanner.style.display = 'none';
        if (statusDiv) {
            statusDiv.className = 'reconnected';
            statusDiv.innerHTML = '<i class="fas fa-wifi"></i> CONEXIÓN RESTABLECIDA';
        }
        if (typeof dataLoaded !== 'undefined' && !dataLoaded) {
            setTimeout(() => {
                if (typeof loadDataFromServer === 'function') loadDataFromServer();
            }, 1000);
        }
    });

    window.addEventListener('offline', function () {
        if (offlineBanner) offlineBanner.style.display = 'block';
        if (statusDiv) {
            statusDiv.className = 'offline';
            statusDiv.innerHTML = '<i class="fas fa-wifi-slash"></i> MODO OFFLINE';
        }
    });

    // 5. Pull-to-refresh (solo móvil)
    initPullToRefresh();

    // 6. Prevenir teclado virtual en cámara
    const cameraModal = document.getElementById('cameraModal');
    if (cameraModal) {
        document.addEventListener('focusin', function (e) {
            if (cameraModal.style.display === 'flex' &&
                e.target.id !== 'dummyInput') {
                e.preventDefault();
            }
        });
    }

    // 7. Cargar datos iniciales
    if (typeof loadDataFromServer === 'function') {
        loadDataFromServer();
    }

    // 8. ELIMINAR CUALQUIER REFERENCIA A DESKTOP
    const desktopElements = document.querySelectorAll('#desktopSidebar, .desktop-only, [class*="desktop"], [id*="desktop"]');
    desktopElements.forEach(el => el.remove());
});

function initPullToRefresh() {
    const statusDiv = document.getElementById('status');
    let startY = 0;
    let isPulling = false;

    document.addEventListener('touchstart', function (e) {
        if (window.scrollY === 0 && e.touches.length === 1) {
            startY = e.touches[0].clientY;
            isPulling = true;
        }
    }, { passive: true });

    document.addEventListener('touchmove', function (e) {
        // Solo tracking, sin acción
    }, { passive: true });

    document.addEventListener('touchend', function (e) {
        if (!isPulling) return;
        const endY = e.changedTouches[0].clientY;
        const pullDistance = endY - startY;

        if (pullDistance > 80 && window.scrollY === 0) {
            if (statusDiv) {
                statusDiv.className = 'loading';
                statusDiv.innerHTML = '<i class="fas fa-sync fa-spin"></i> ACTUALIZANDO...';
            }

            if (typeof obtenerDatosFacturados === 'function') {
                obtenerDatosFacturados()
                    .then(serverData => {
                        if (typeof handleDataLoadSuccess === 'function') {
                            handleDataLoadSuccess(serverData);
                        }
                        if (typeof currentQRParts !== 'undefined' && currentQRParts) {
                            if (typeof processQRCodeParts === 'function') {
                                processQRCodeParts(currentQRParts);
                            }
                        }
                    })
                    .catch(error => {
                        if (typeof handleDataLoadError === 'function') {
                            handleDataLoadError(error);
                        }
                    });
            }
        }
        isPulling = false;
    }, { passive: true });
}

// FORZAR PORTRAIT EN CADA CARGA
window.addEventListener('load', function() {
    if (screen.orientation && screen.orientation.lock) {
        screen.orientation.lock('portrait').catch(() => {});
    }
});