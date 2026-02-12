// ============================================
// INICIALIZACIÓN DE LA APP - 100% MÓVIL
// ============================================

document.addEventListener('DOMContentLoaded', () => {
    // Service Worker
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('./sw.js')
                .then(registration => console.log('SW registrado:', registration.scope))
                .catch(err => console.log('Fallo registro SW:', err));
        });
    }
    
    // Forzar landscape
    if (screen.orientation && screen.orientation.lock) {
        screen.orientation.lock('landscape').catch(() => {});
    }
    
    // Inicializar listeners
    initUIListeners();
    initQRListeners();
    
    // Eventos online/offline
    const offlineBanner = document.getElementById('offline-banner');
    const statusDiv = document.getElementById('status');
    
    window.addEventListener('online', function() {
        if (offlineBanner) offlineBanner.style.display = 'none';
        if (statusDiv) {
            statusDiv.className = 'ready';
            statusDiv.innerHTML = '<i class="fas fa-wifi"></i> CONECTADO';
        }
        if (!dataLoaded) setTimeout(() => loadDataFromServer(), 1000);
    });
    
    window.addEventListener('offline', function() {
        if (offlineBanner) offlineBanner.style.display = 'block';
        if (statusDiv) {
            statusDiv.className = 'offline';
            statusDiv.innerHTML = '<i class="fas fa-wifi-slash"></i> MODO OFFLINE';
        }
    });
    
    // Pull-to-refresh
    initPullToRefresh();
    
    // Prevenir teclado en cámara
    const cameraModal = document.getElementById('cameraModal');
    if (cameraModal) {
        document.addEventListener('focusin', function(e) {
            if (cameraModal.style.display === 'flex' && e.target.id !== 'dummyInput') {
                e.preventDefault();
            }
        });
    }
    
    // Cargar datos
    loadDataFromServer();
});

function initPullToRefresh() {
    const statusDiv = document.getElementById('status');
    let startY = 0;
    let isPulling = false;
    
    document.addEventListener('touchstart', function(e) {
        if (window.scrollY === 0 && e.touches.length === 1) {
            startY = e.touches[0].clientY;
            isPulling = true;
        }
    }, { passive: true });
    
    document.addEventListener('touchend', function(e) {
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
                        handleDataLoadSuccess(serverData);
                        if (currentQRParts) processQRCodeParts(currentQRParts);
                    })
                    .catch(error => handleDataLoadError(error));
            }
        }
        isPulling = false;
    });
}