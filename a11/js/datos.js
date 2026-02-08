// Gestión de Datos (Carga, Caché, Errores)

function loadDataFromServer() {
    const statusDiv = document.getElementById('status');
    const dataStats = document.getElementById('data-stats');

    if (statusDiv) {
        statusDiv.className = 'loading';
        statusDiv.innerHTML = '<i class="fas fa-sync fa-spin"></i> CARGANDO DATOS...';
    }
    if (dataStats) {
        dataStats.innerHTML = '<i class="fas fa-server"></i> Procesando datos locales...';
    }

    // Usamos la función de main.js en lugar del fetch
    if (typeof obtenerDatosFacturados === 'function') {
        obtenerDatosFacturados()
            .then(serverData => handleDataLoadSuccess(serverData))
            .catch(error => handleDataLoadError(error));
    } else {
        console.error("main.js no cargado correctamente");
        handleDataLoadError(new Error("Error de integración: main.js no disponible"));
    }
}

function handleDataLoadSuccess(serverData) {
    const statusDiv = document.getElementById('status');
    const dataStats = document.getElementById('data-stats');
    const resultsDiv = document.getElementById('results');
    const offlineBanner = document.getElementById('offline-banner');

    if (serverData && serverData.success && serverData.data) {
        database = serverData.data;
        dataLoaded = true;
        cacheData(database);

        // Actualizar UI de estado
        if (statusDiv) {
            statusDiv.className = 'ready';
            statusDiv.innerHTML = `
        <i class="fas fa-check-circle"></i> SISTEMA LISTO
        `;
        }
        if (dataStats) {
            dataStats.innerHTML = `
        <i class="fas fa-database"></i> ${database.length} registros | ${new Date().toLocaleTimeString()}
        `;
        }

        // Mostrar contenido principal con nuevo diseño
        if (resultsDiv) {
            resultsDiv.innerHTML = `
        <div class="result-item" style="text-align: center; padding: 40px 20px;">
            <div style="margin-bottom: 30px;">
            <div style="width: 70px; height: 70px; background: linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%); border-radius: 18px; display: flex; align-items: center; justify-content: center; margin: 0 auto 20px; box-shadow: 0 8px 20px rgba(37, 99, 235, 0.2);">
                <i class="fas fa-qrcode" style="font-size: 2.25rem; color: white;"></i>
            </div>
            <h1 style="font-size: 2rem; font-weight: 800; margin: 0 0 8px; background: linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%); -webkit-background-clip: text; background-clip: text; color: transparent;">PandaDash</h1>
            <p style="color: var(--text-secondary); font-size: 13px; margin: 0;">Professional QR Delivery System</p>
            </div>
            
            <div style="background: var(--surface); border-radius: 16px; padding: 20px; margin: 25px 0; border: 1px solid var(--border);">
            <p style="font-size: 13px; color: var(--text-main); margin: 0 0 12px; font-weight: 600;"><i class="fas fa-info-circle" style="color: var(--primary); margin-right: 8px;"></i> Sistema listo para escanear</p>
            <p style="font-size: 12px; color: var(--text-secondary); margin: 0;">Escanea un código QR para comenzar</p>
            </div>
            
            <!-- Nuevo footer integrado -->
            <div style="margin-top: 40px; padding-top: 25px; border-top: 1px solid var(--border);">
            <p style="font-size: 12px; color: var(--text-secondary); margin-bottom: 15px; line-height: 1.4;">
                Developed by <strong style="color: var(--text-main); font-weight: 600;">Andrés Mendoza</strong><br>
                © 2026 · Supported by GrupoTDM
            </p>
            
            <div style="display: flex; justify-content: center; gap: 12px;">
                <a href="https://www.facebook.com/templodelamoda/" target="_blank" style="width: 36px; height: 36px; border-radius: 50%; background: var(--background); display: flex; align-items: center; justify-content: center; color: var(--text-secondary); text-decoration: none; transition: all 0.2s; border: 1px solid var(--border);">
                <i class="fab fa-facebook-f" style="font-size: 14px;"></i>
                </a>
                <a href="https://www.instagram.com/eltemplodelamoda/" target="_blank" style="width: 36px; height: 36px; border-radius: 50%; background: var(--background); display: flex; align-items: center; justify-content: center; color: var(--text-secondary); text-decoration: none; transition: all 0.2s; border: 1px solid var(--border);">
                <i class="fab fa-instagram" style="font-size: 14px;"></i>
                </a>
                <a href="https://wa.me/573168007979" target="_blank" style="width: 36px; height: 36px; border-radius: 50%; background: var(--background); display: flex; align-items: center; justify-content: center; color: var(--text-secondary); text-decoration: none; transition: all 0.2s; border: 1px solid var(--border);">
                <i class="fab fa-whatsapp" style="font-size: 14px;"></i>
                </a>
            </div>
            </div>
        </div>
        `;
        }

        if (hideLoadingScreen && typeof hideLoadingScreen === 'function') hideLoadingScreen();
        if (playSuccessSound && typeof playSuccessSound === 'function') playSuccessSound();
    } else {
        handleDataLoadError(new Error('Formato de datos incorrecto'));
    }
}

function handleDataLoadError(error) {
    console.error("Error al cargar datos:", error);
    const statusDiv = document.getElementById('status');
    const dataStats = document.getElementById('data-stats');
    const resultsDiv = document.getElementById('results');
    const offlineBanner = document.getElementById('offline-banner');

    // Verificar si hay datos en caché
    const cachedData = getCachedData();
    if (cachedData) {
        database = cachedData.data;
        dataLoaded = true;

        if (statusDiv) statusDiv.innerHTML = '<i class="fas fa-database"></i> SISTEMA LISTO (DATOS CACHEADOS)';
        if (dataStats) dataStats.innerHTML = `${database.length} registros | Última actualización: ${new Date(cachedData.timestamp).toLocaleString()}`;

        if (resultsDiv) {
            resultsDiv.innerHTML = `
        <div class="result-item" style="text-align: center; color: var(--gray);">
            <img 
            src="https://raw.githubusercontent.com/iLogisticsCoordinator/o/main/icons/logo.png" 
            alt="PandaDash Logo" 
            class="logo" 
            style="width: 4rem; height: 4rem; margin-bottom: 0.15rem;"
            >
            <h1 style="margin: 0;">PandaDash</h1>
            <div style="margin-top: 6px; font-size: 13px; line-height: 1.3;">
            <p style="margin: 2px 0;">Developed by Andrés Mendoza © 2026</p>
            <p style="margin: 2px 0;">
                Supported by 
                <a href="https://www.eltemplodelamoda.com/" target="_blank" style="color: var(--primary); text-decoration: none; font-weight: 500;">
                GrupoTDM
                </a>
            </p>
            <div style="display: flex; justify-content: center; gap: 8px; margin-top: 6px;">
                <a href="https://www.facebook.com/templodelamoda/" target="_blank" style="color: var(--primary);"><i class="fab fa-facebook"></i></a>
                <a href="https://www.instagram.com/eltemplodelamoda/" target="_blank" style="color: var(--primary);"><i class="fab fa-instagram"></i></a>
                <a href="https://wa.me/573168007979" target="_blank" style="color: var(--primary);"><i class="fab fa-whatsapp"></i></a>
            </div>
            </div>
        </div>
        `;
        }

        if (offlineBanner) offlineBanner.style.display = 'block';

        // Ocultar pantalla de carga ya que tenemos datos en caché
        if (hideLoadingScreen && typeof hideLoadingScreen === 'function') hideLoadingScreen();
    } else {
        if (statusDiv) {
            statusDiv.className = 'error';
            statusDiv.innerHTML = '<span style="color: var(--danger)">ERROR AL CARGAR DATOS</span>';
        }
        if (dataStats) dataStats.textContent = error.message || 'Error desconocido';
        if (resultsDiv) resultsDiv.innerHTML = `<div class="error"><i class="fas fa-exclamation-circle"></i> No se pudo cargar la base de datos: ${error.message || 'Error desconocido'}</div>`;

        // Mostrar mensaje de error en la pantalla de carga pero no ocultarla
        const loadingName = document.querySelector('#loadingScreen .version-text');
        if (loadingName) {
            loadingName.innerHTML = 'Error al cargar datos<br>Comprueba tu conexión';
            loadingName.style.color = '#ef4444';
            loadingName.style.fontWeight = '600';

            // Añadir botón de reintento
            const retryButton = document.createElement('button');
            retryButton.innerHTML = '<i class="fas fa-redo"></i> Reintentar';
            retryButton.style.marginTop = '15px';
            retryButton.style.padding = '8px 16px';
            retryButton.style.background = 'var(--danger)';
            retryButton.style.color = 'white';
            retryButton.style.border = 'none';
            retryButton.style.borderRadius = '12px';
            retryButton.style.fontWeight = '600';
            retryButton.style.fontSize = '13px';
            retryButton.style.cursor = 'pointer';
            retryButton.addEventListener('click', () => {
                location.reload();
            });

            loadingName.parentNode.appendChild(retryButton);
        }

        if (playErrorSound && typeof playErrorSound === 'function') playErrorSound();
    }
}

function getCachedData() {
    const cache = localStorage.getItem('pdaScannerCache');
    if (!cache) return null;

    try {
        const parsed = JSON.parse(cache);
        if (Date.now() - parsed.timestamp > CONFIG.CACHE_TTL) return null;
        return parsed;
    } catch (e) {
        console.error("Error al parsear cache:", e);
        return null;
    }
}

function cacheData(data) {
    const cache = {
        data: data,
        timestamp: Date.now(),
        version: CONFIG.VERSION
    };

    try {
        localStorage.setItem('pdaScannerCache', JSON.stringify(cache));
    } catch (e) {
        console.error("Error al guardar en cache:", e);
        if (e.name === 'QuotaExceededError') {
            clearOldCache();
            cacheData(data);
        }
    }
}

function clearOldCache() {
    const keys = Object.keys(localStorage);
    for (const key of keys) {
        if (key.startsWith('pdaScannerCache')) {
            localStorage.removeItem(key);
        }
    }
}
