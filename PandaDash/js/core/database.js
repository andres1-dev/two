// Gestión de Datos (Carga, Caché, Errores)

function loadDataFromServer() {
    const statusDiv = document.getElementById('status');
    const dataStats = document.getElementById('data-stats');

    // Usar el sistema de prioridad dinámica para el estado principal
    if (typeof window.updateStatusDisplay === 'function') {
        window.updateStatusDisplay("SINCRONIZANDO CON SERVIDOR...", "loading");
    }

    if (dataStats) {
        dataStats.innerHTML = '<i class="fas fa-sync fa-spin"></i> Actualizando base de datos...';
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
        if (typeof window.updateStatusDisplay === 'function') {
            window.updateStatusDisplay("SISTEMA ACTUALIZADO");
        }
        if (dataStats) {
            dataStats.innerHTML = `
        <i class="fas fa-database"></i> ${database.length} | 
        <i class="fas fa-clock"></i> ${new Date().toLocaleTimeString()}
    `;
        }

        // Mostrar contenido principal SOLO si NO hay resultados activos (background friendly)
        const resultsDiv = document.getElementById('results');
        if (resultsDiv && (!window.currentDocumentData)) {
            resultsDiv.innerHTML = `
        <div class="result-item" style="text-align: center; padding: 40px 20px;">
            <div style="margin-bottom: 30px;">
                <!-- REEMPLAZADO: Logo SVG oficial - CON COLORES ORIGINALES, FONDO TRANSPARENTE -->
                <div style="width: 70px; height: 70px; display: flex; align-items: center; justify-content: center; margin: 0 auto 20px;">
                    <svg width="70" height="70" viewBox="0 0 500 500" preserveAspectRatio="xMidYMid meet">
                        <path d="M118.123,348.231h69.323h12.2h88.173l-23.295-40.363H231.98h-21.291h-46.392v0.013H63.876 l55.329-95.83l0.656-1.058l36.706-63.568l-0.039-0.013l19.3-33.426l19.252,33.341l0.047,0.098l8.474,14.675l0.291,0.497 c3.473,6.094,6.941,12.2,10.414,18.332l0.073-0.146l23.222-40.218l0.021-0.047l-7.609-13.172l-0.047-0.094l-36.707-63.568 c-5.558-9.626-17.882-12.902-27.508-7.331c-3.554,2.064-6.248,5.062-7.948,8.496l-36.039,62.425l-0.039-0.021L85.022,190.82 l-0.604,1.126L12.581,316.367c-2.342,3.302-3.725,7.331-3.725,11.686c0,11.146,9.044,20.177,20.186,20.177h88.85H118.123z" fill="#3B82F6"/>
                        <path d="M357.541,348.231l-0.039-0.086l-17.428-30.176l-0.013-0.026l-5.764-9.99l-0.052-0.073 l-13.193-22.854l-0.047-0.086l-17.638-30.553l-0.039,0.026l-19.24-33.332l-23.376,40.492c2.599,4.346,5.22,8.68,7.854,12.975 l-0.039,0.026l19.227,33.293l17.479,30.275l5.828,10.089l50.105,86.786h-38.513v0.073H175.841v-0.073h-38.5l38.475-66.664h-46.474 l-44.32,76.753l-0.253,0.45l-0.244,0.458l-0.231,0.462l-0.218,0.462l-0.193,0.463l-0.197,0.471l-0.18,0.475l-0.158,0.471 l-0.158,0.475l-0.133,0.484h-0.013l-0.12,0.475l-0.124,0.484l-0.094,0.484l-0.099,0.488l-0.073,0.484l-0.073,0.488l-0.047,0.484 l-0.052,0.484l-0.021,0.488l-0.026,0.484v0.488v0.484l0.013,0.484l0.025,0.488h0.009l0.039,0.484l0.047,0.475l0.06,0.484 l0.073,0.475l0.086,0.484l0.099,0.475l0.111,0.458l0.12,0.475l0.12,0.462h0.013l0.133,0.458l0.146,0.462h0.013l0.158,0.463 l0.171,0.449l0.18,0.445h0.013l0.18,0.437h0.013l0.197,0.441h0.008l0.21,0.437l0.231,0.424l0.24,0.424l0.244,0.424l0.266,0.415 l0.27,0.398l0.278,0.403l0.291,0.398l0.291,0.39l0.317,0.377l0.313,0.377l0.33,0.364h0.013l0.338,0.364l0.339,0.351l0.364,0.338 l0.368,0.343h0.009l0.377,0.325l0.389,0.33l0.398,0.313l0.403,0.304l0.424,0.291l0.424,0.283l0.437,0.278l0.45,0.266l0.449,0.257 l0.146,0.073l0.304,0.158l0.013,0.009l0.45,0.219l0.013,0.013l0.292,0.133l0.158,0.073h0.009l0.137,0.064l0.313,0.133l0.013,0.013 l0.45,0.18l0.026,0.013l0.133,0.047l0.159,0.06l0.158,0.064l0.021,0.009l0.133,0.039l0.146,0.06l0.159,0.047l0.038,0.013 l0.12,0.051l0.159,0.047l0.158,0.047l0.034,0.013h0.026l0.266,0.086l0.158,0.038l0.039,0.009l0.12,0.038l0.291,0.086h0.026 l0.034,0.013l0.124,0.021l0.154,0.038l0.158,0.047l0.052,0.013l0.107,0.026l0.159,0.021l0.171,0.039l0.047,0.013l0.111,0.021 l0.154,0.026l0.158,0.034l0.06,0.013l0.098,0.013l0.171,0.026l0.158,0.021l0.06,0.013l0.094,0.013l0.171,0.026l0.158,0.021 l0.06,0.013l0.099,0.013l0.317,0.039h0.073l0.094,0.009l0.158,0.013l0.159,0.013l0.073,0.013h0.098l0.154,0.013l0.159,0.013h0.073 h0.085l0.171,0.009l0.158,0.013h0.073h0.086h0.154h0.171h0.073h0.086v0.051h73.4v-0.073h146.813v0.073h73.4 c11.142,0,20.173-9.031,20.173-20.177c0-4.175-1.259-8.046-3.434-11.262L357.541,348.231z" fill="#2563EB"/>
                        <path d="M489.627,327.45v-0.026l-0.009-0.39v-0.022l-0.013-0.171l-0.013-0.206l-0.013-0.137v-0.06 l-0.034-0.398l-0.013-0.051l-0.038-0.351l-0.013-0.158l-0.008-0.034l-0.026-0.193l-0.025-0.21l-0.013-0.06l-0.021-0.133 l-0.026-0.193l-0.034-0.171v-0.026l-0.038-0.193l-0.034-0.193l-0.026-0.085l-0.013-0.099l-0.047-0.193l-0.039-0.197l-0.013-0.008 l-0.034-0.184l-0.047-0.184l-0.025-0.12l-0.026-0.073l-0.094-0.377l-0.013-0.021l-0.052-0.158l-0.047-0.197l-0.047-0.12 l-0.013-0.06l-0.06-0.184l-0.06-0.18l-0.013-0.051l-0.052-0.133l-0.06-0.18l-0.06-0.158l-0.013-0.026l-0.06-0.18l-0.073-0.184 l-0.026-0.073l-0.047-0.107l-0.073-0.171l-0.073-0.171v-0.013l-0.073-0.18l-0.085-0.171l-0.034-0.086l-0.039-0.081l-0.158-0.355 l-0.013-0.008l-0.154-0.33l-0.064-0.107l-0.034-0.064l-0.086-0.167l-0.085-0.171l-0.021-0.026l-0.073-0.146l-0.085-0.158 l-0.073-0.133l-0.026-0.034l-0.098-0.171l-0.094-0.158l-0.124-0.18l-0.167-0.283l-0.013-0.021l-0.111-0.158l-0.094-0.158 l-0.052-0.06l-0.06-0.098l-0.107-0.159l-0.111-0.146v-0.009c-23.95-41.477-47.544-84.859-72.466-125.526l0.038-0.021 l-73.28-126.905c-0.621-1.105-1.336-2.15-2.163-3.135l-0.081-0.094l-0.27-0.304l-0.021-0.026l-0.304-0.325l-0.013-0.026 l-0.231-0.231l-0.12-0.133l-0.218-0.219l-0.137-0.124l-0.227-0.227l-0.026-0.013l-0.33-0.304l-0.034-0.026l-0.291-0.266 l-0.112-0.086c-1.032-0.874-2.137-1.627-3.314-2.269l-0.021-0.013c-0.304-0.171-0.608-0.317-0.925-0.471l-0.351-0.171 l-0.107-0.047 l-0.33-0.146h-0.034c-2.248-0.972-4.603-1.495-6.945-1.606h-0.06l-0.317-0.013h-0.167l-0.317-0.009h-0.171l-0.313,0.009h-0.171 l-0.317,0.013h-0.06c-2.342,0.111-4.698,0.634-6.941,1.606h-0.038l-0.325,0.146l-0.111,0.047l-0.351,0.171 c-0.317,0.154-0.621,0.3-0.925,0.471l-0.021,0.013c-1.177,0.642-2.282,1.396-3.314,2.269l-0.112,0.086l-0.291,0.266l-0.034,0.026 l-0.33,0.304l-0.021,0.013l-0.231,0.227l-0.133,0.124l-0.218,0.219l-0.124,0.133l-0.231,0.231l-0.009,0.026l-0.304,0.325 l-0.026,0.026l-0.265,0.304l-0.086,0.094c-0.826,0.985-1.542,2.03-2.163,3.135l-32.022,55.458l-23.826,41.284l-0.026,0.034 l-17.394,30.129l-0.013,0.013l-5.811,10.072l-0.197,0.343l0.026,0.047l-49.912,86.448h46.393l26.618-46.11l0.026,0.034 l17.651-30.574l0.06-0.098l55.98-96.973l55.993,96.973l0.026-0.013l55.946,96.9h-38.552h-38.573l23.291,40.35h15.283h73.4 c11.142,0,20.173-9.031,20.173-20.177v-0.206v-0.206v-0.111L489.627,327.45z" fill="#2563eb"/>
                    </svg>
                </div>
                <h1 style="font-size: 2rem; font-weight: 800; margin: 0 0 8px; background: linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%); -webkit-background-clip: text; background-clip: text; color: transparent;">PandaDash</h1>
                <p style="color: var(--text-secondary); font-size: 13px; margin: 0;">Professional QR Delivery System</p>
            </div>
            
            <div style="background: var(--surface); border-radius: 16px; padding: 20px; margin: 25px 0; border: 1px solid var(--border);">
                <p style="font-size: 13px; color: var(--text-main); margin: 0 0 12px; font-weight: 600;">
                    <i class="fas fa-info-circle" style="color: var(--primary); margin-right: 8px;"></i> Sistema listo
                </p>
                <p style="font-size: 12px; color: var(--text-secondary); margin: 0;">Escanea un código QR para comenzar</p>
            </div>
            
            <div style="margin-top: 40px; padding-top: 2px; border-top: 1px solid var(--border);">
                <p style="font-size: 12px; color: var(--text-secondary); margin-bottom: 15px; line-height: 1.4;">
                    Developed by <strong style="color: var(--text-main); font-weight: 600;">Andrés Mendoza</strong><br>
                    © 2026 · Supported by GrupoTDM
                </p>
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

        if (typeof window.updateStatusDisplay === 'function') {
            window.updateStatusDisplay("SISTEMA LISTO (DATOS CACHEADOS)", "ready");
        }
        if (dataStats) dataStats.innerHTML = `${database.length} Reg | Última actualización: ${new Date(cachedData.timestamp).toLocaleString()}`;

        // En handleDataLoadError, dentro del else (caché)
        if (resultsDiv) {
            resultsDiv.innerHTML = `
        <div class="result-item" style="text-align: center; color: var(--gray);">
            <!-- REEMPLAZADO: Logo SVG oficial - Tamaño 4rem (64px) -->
            <div style="width: 4rem; height: 4rem; margin: 0 auto 0.15rem auto; background: linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%); border-radius: 18px; display: flex; align-items: center; justify-content: center; box-shadow: 0 8px 20px rgba(37, 99, 235, 0.25);">
            <svg id="design-icon" width="100%" height="100%" viewBox="0 0 500 500">
                <path d="M118.123,348.231h69.323h12.2h88.173l-23.295-40.363H231.98h-21.291h-46.392v0.013H63.876 l55.329-95.83l0.656-1.058l36.706-63.568l-0.039-0.013l19.3-33.426l19.252,33.341l0.047,0.098l8.474,14.675l0.291,0.497 c3.473,6.094,6.941,12.2,10.414,18.332l0.073-0.146l23.222-40.218l0.021-0.047l-7.609-13.172l-0.047-0.094l-36.707-63.568 c-5.558-9.626-17.882-12.902-27.508-7.331c-3.554,2.064-6.248,5.062-7.948,8.496l-36.039,62.425l-0.039-0.021L85.022,190.82 l-0.604,1.126L12.581,316.367c-2.342,3.302-3.725,7.331-3.725,11.686c0,11.146,9.044,20.177,20.186,20.177h88.85H118.123z" style="fill: rgb(59, 130, 246);"/>
                <path d="M357.541,348.231l-0.039-0.086l-17.428-30.176l-0.013-0.026l-5.764-9.99l-0.052-0.073 l-13.193-22.854l-0.047-0.086l-17.638-30.553l-0.039,0.026l-19.24-33.332l-23.376,40.492c2.599,4.346,5.22,8.68,7.854,12.975 l-0.039,0.026l19.227,33.293l17.479,30.275l5.828,10.089l50.105,86.786h-38.513v0.073H175.841v-0.073h-38.5l38.475-66.664h-46.474 l-44.32,76.753l-0.253,0.45l-0.244,0.458l-0.231,0.462l-0.218,0.462l-0.193,0.463l-0.197,0.471l-0.18,0.475l-0.158,0.471 l-0.158,0.475l-0.133,0.484h-0.013l-0.12,0.475l-0.124,0.484l-0.094,0.484l-0.099,0.488l-0.073,0.484l-0.073,0.488l-0.047,0.484 l-0.052,0.484l-0.021,0.488l-0.026,0.484v0.488v0.484l0.013,0.484l0.025,0.488h0.009l0.039,0.484l0.047,0.475l0.06,0.484 l0.073,0.475l0.086,0.484l0.099,0.475l0.111,0.458l0.12,0.475l0.12,0.462h0.013l0.133,0.458l0.146,0.462h0.013l0.158,0.463 l0.171,0.449l0.18,0.445h0.013l0.18,0.437h0.013l0.197,0.441h0.008l0.21,0.437l0.231,0.424l0.24,0.424l0.244,0.424l0.266,0.415 l0.27,0.398l0.278,0.403l0.291,0.398l0.291,0.39l0.317,0.377l0.313,0.377l0.33,0.364h0.013l0.338,0.364l0.339,0.351l0.364,0.338 l0.368,0.343h0.009l0.377,0.325l0.389,0.33l0.398,0.313l0.403,0.304l0.424,0.291l0.424,0.283l0.437,0.278l0.45,0.266l0.449,0.257 l0.146,0.073l0.304,0.158l0.013,0.009l0.45,0.219l0.013,0.013l0.292,0.133l0.158,0.073h0.009l0.137,0.064l0.313,0.133l0.013,0.013 l0.45,0.18l0.026,0.013l0.133,0.047l0.159,0.06l0.158,0.064l0.021,0.009l0.133,0.039l0.146,0.06l0.159,0.047l0.038,0.013 l0.12,0.051l0.159,0.047l0.158,0.047l0.034,0.013h0.026l0.266,0.086l0.158,0.038l0.039,0.009l0.12,0.038l0.291,0.086h0.026 l0.034,0.013l0.124,0.021l0.154,0.038l0.158,0.047l0.052,0.013l0.107,0.026l0.159,0.021l0.171,0.039l0.047,0.013l0.111,0.021 l0.154,0.026l0.158,0.034l0.06,0.013l0.098,0.013l0.171,0.026l0.158,0.021l0.06,0.013l0.094,0.013l0.171,0.026l0.158,0.021 l0.06,0.013l0.099,0.013l0.317,0.039h0.073l0.094,0.009l0.158,0.013l0.159,0.013l0.073,0.013h0.098l0.154,0.013l0.159,0.013h0.073 h0.085l0.171,0.009l0.158,0.013h0.073h0.086h0.154h0.171h0.073h0.086v0.051h73.4v-0.073h146.813v0.073h73.4 c11.142,0,20.173-9.031,20.173-20.177c0-4.175-1.259-8.046-3.434-11.262L357.541,348.231z" style="fill: rgb(37, 99, 235);"/>
                <path d="M489.627,327.45v-0.026l-0.009-0.39v-0.022l-0.013-0.171l-0.013-0.206l-0.013-0.137v-0.06 l-0.034-0.398l-0.013-0.051l-0.038-0.351l-0.013-0.158l-0.008-0.034l-0.026-0.193l-0.025-0.21l-0.013-0.06l-0.021-0.133 l-0.026-0.193l-0.034-0.171v-0.026l-0.038-0.193l-0.034-0.193l-0.026-0.085l-0.013-0.099l-0.047-0.193l-0.039-0.197l-0.013-0.008 l-0.034-0.184l-0.047-0.184l-0.025-0.12l-0.026-0.073l-0.094-0.377l-0.013-0.021l-0.052-0.158l-0.047-0.197l-0.047-0.12 l-0.013-0.06l-0.06-0.184l-0.06-0.18l-0.013-0.051l-0.052-0.133l-0.06-0.18l-0.06-0.158l-0.013-0.026l-0.06-0.18l-0.073-0.184 l-0.026-0.073l-0.047-0.107l-0.073-0.171l-0.073-0.171v-0.013l-0.073-0.18l-0.085-0.171l-0.034-0.086l-0.039-0.081l-0.158-0.355 l-0.013-0.008l-0.154-0.33l-0.064-0.107l-0.034-0.064l-0.086-0.167l-0.085-0.171l-0.021-0.026l-0.073-0.146l-0.085-0.158 l-0.073-0.133l-0.026-0.034l-0.098-0.171l-0.094-0.158l-0.124-0.18l-0.167-0.283l-0.013-0.021l-0.111-0.158l-0.094-0.158 l-0.052-0.06l-0.06-0.098l-0.107-0.159l-0.111-0.146v-0.009c-23.95-41.477-47.544-84.859-72.466-125.526l0.038-0.021 l-73.28-126.905c-0.621-1.105-1.336-2.15-2.163-3.135l-0.081-0.094l-0.27-0.304l-0.021-0.026l-0.304-0.325l-0.013-0.026 l-0.231-0.231l-0.12-0.133l-0.218-0.219l-0.137-0.124l-0.227-0.227l-0.026-0.013l-0.33-0.304l-0.034-0.026l-0.291-0.266 l-0.112-0.086c-1.032-0.874-2.137-1.627-3.314-2.269l-0.021-0.013c-0.304-0.171-0.608-0.317-0.925-0.471l-0.351-0.171 l-0.107-0.047 l-0.33-0.146h-0.034c-2.248-0.972-4.603-1.495-6.945-1.606h-0.06l-0.317-0.013h-0.167l-0.317-0.009h-0.171l-0.313,0.009h-0.171 l-0.317,0.013h-0.06c-2.342,0.111-4.698,0.634-6.941,1.606h-0.038l-0.325,0.146l-0.111,0.047l-0.351,0.171 c-0.317,0.154-0.621,0.3-0.925,0.471l-0.021,0.013c-1.177,0.642-2.282,1.396-3.314,2.269l-0.112,0.086l-0.291,0.266l-0.034,0.026 l-0.33,0.304l-0.021,0.013l-0.231,0.227l-0.133,0.124l-0.218,0.219l-0.124,0.133l-0.231,0.231l-0.009,0.026l-0.304,0.325 l-0.026,0.026l-0.265,0.304l-0.086,0.094c-0.826,0.985-1.542,2.03-2.163,3.135l-32.022,55.458l-23.826,41.284l-0.026,0.034 l-17.394,30.129l-0.013,0.013l-5.811,10.072l-0.197,0.343l0.026,0.047l-49.912,86.448h46.393l26.618-46.11l0.026,0.034 l17.651-30.574l0.06-0.098l55.98-96.973l55.993,96.973l0.026-0.013l55.946,96.9h-38.552h-38.573l23.291,40.35h15.283h73.4 c11.142,0,20.173-9.031,20.173-20.177v-0.206v-0.206v-0.111L489.627,327.45z" style="fill: rgb(59, 130, 246);"/>
            </svg>
            </div>
            <h1 style="margin: 0; font-size: 1.8rem; margin-top: 0.5rem;">PandaDash™</h1>
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

// Función para recargar datos silenciosamente (sin borrar la UI)
async function silentReloadData() {
    console.log("🔄 Iniciando actualización silenciosa de datos...");

    if (typeof obtenerDatosFacturados !== 'function') {
        console.warn("obtenerDatosFacturados no disponible");
        return;
    }

    try {
        const serverData = await obtenerDatosFacturados();

        if (serverData && serverData.success && serverData.data) {
            // Actualizar base de datos global
            database = serverData.data;

            // Actualizar caché
            cacheData(database);

            console.log(`✅ Datos actualizados silenciosamente: ${database.length} registros`);

            // Actualizar estadísticas si existen en pantalla
            const dataStats = document.getElementById('data-stats');
            if (dataStats) {
                const timeStr = new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });
                dataStats.innerHTML = `<i class="fas fa-database"></i> ${database.length} reg | ${timeStr}`;
            }

            return true;
        }
    } catch (e) {
        console.error("Error en actualización silenciosa:", e);
        return false;
    }
}
