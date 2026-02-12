function initializeApp() {
    setupEventListeners();
    setupTabSystem();
    setupTheme();
    initializeNotifications();

    window.distributionInitialized = true;
    loadDataFromSheets();
    updateStatus('Sistema inicializado correctamente', 'info');
}

async function loadDataFromSheets() {
    updateStatus('Cargando datos desde Google Sheets...', 'loading');
    const processBtn = document.getElementById('processBtn');
    if (processBtn) {
        processBtn.disabled = true;
        processBtn.innerHTML = '<span class="loading-spinner"></span> Cargando datos...';
    }

    const loading = showQuickLoading('Cargando datos globales y distribución...');

    try {
        await Promise.all([
            loadColoresData(),
            loadData2Data(),
            loadPreciosData(),
            loadSisproData(),
            loadHistoricasData(),
            loadClientesData()
        ]);

        console.log('Datos base cargados, inicializando distribución e impresión...');

        await Promise.all([
            initializeDistribution(),
            print_cargarDatos().catch(err => {
                console.error("Error cargando módulo de impresión:", err);
            })
        ]);

        updateDataStats();
        updateStatus('Datos cargados correctamente', 'success');

        if (!loading._isReload) {
            showMessage('Sistema listo - Todos los módulos cargados', 'success', 2000);
        }

    } catch (error) {
        console.error('Error cargando datos:', error);
        updateStatus('Error cargando datos', 'error');
        showMessage('Error al cargar datos: ' + error.message, 'error', 3000);
    } finally {
        loading.close();
        if (processBtn) {
            processBtn.disabled = false;
            processBtn.innerHTML = '<i class="codicon codicon-play"></i> Procesar CSV';
        }
    }
}

function updateDataStats() {
    const statsElement = document.getElementById('dataStats');
    if (statsElement) {
        statsElement.textContent = 
            `${coloresMap.size} colores | ${data2Map.size} OPs | ${preciosMap.size} precios | ${sisproMap.size} productos | ${clientesMap.size} clientes`;
    }
}