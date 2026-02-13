// js/main.js - PUNTO DE ENTRADA ÚNICO

// ============================================
// INICIALIZACIÓN - CUANDO EL DOM ESTÉ LISTO
// ============================================
document.addEventListener('DOMContentLoaded', function () {
    console.log('🚀 Inicializando aplicación...');

    // 1. Inyectar CSS
    injectAllCSS();

    // 2. Configurar tema
    setupTheme();

    // 3. Configurar sistema de pestañas
    setupTabSystem();

    // 4. Configurar TODOS los event listeners
    setupAllEventListeners();

    // 5. Inicializar la aplicación
    initializeApp();

    // 6. Cargar traslados cancelados desde localStorage
    if (typeof loadCancelledTransfersFromStorage === 'function') {
        loadCancelledTransfersFromStorage();
    }

    console.log('✅ Aplicación inicializada');
});

// ============================================
// CONFIGURACIÓN DE TODOS LOS EVENT LISTENERS
// ============================================
function setupAllEventListeners() {
    console.log('🔧 Configurando event listeners...');

    // ---- CSV Processor ----
    const processBtn = document.getElementById('processBtn');
    if (processBtn) {
        processBtn.addEventListener('click', processCSV);
    }

    const exportBtn = document.getElementById('exportBtn');
    if (exportBtn) {
        exportBtn.addEventListener('click', exportToCSV);
    }

    // ---- File Upload ----
    const fileInput = document.getElementById('csvFile');
    const uploadBox = document.getElementById('uploadBox');

    if (fileInput) {
        fileInput.addEventListener('change', function (e) {
            if (e.target.files.length > 0) {
                const fileName = e.target.files[0].name;
                updateStatus(`Archivo seleccionado: ${fileName}`, 'success');
                showMessage(`Archivo "${fileName}" cargado.`, 'success', 2000);
                setTimeout(() => processCSV(), 500);
            }
        });
    }

    if (uploadBox) {
        uploadBox.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadBox.style.borderColor = 'var(--primary)';
            uploadBox.style.backgroundColor = 'var(--hover)';
        });

        uploadBox.addEventListener('dragleave', (e) => {
            e.preventDefault();
            uploadBox.style.borderColor = 'var(--border)';
            uploadBox.style.backgroundColor = 'transparent';
        });

        uploadBox.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadBox.style.borderColor = 'var(--border)';
            uploadBox.style.backgroundColor = 'transparent';

            if (e.dataTransfer.files.length && fileInput) {
                fileInput.files = e.dataTransfer.files;
                const fileName = e.dataTransfer.files[0].name;
                updateStatus(`Archivo listo: ${fileName}`, 'success');
                showMessage(`Archivo "${fileName}" cargado.`, 'success', 2000);
                setTimeout(() => processCSV(), 500);
            }
        });
    }

    // ---- Pending OPs ----
    const selectOP = document.getElementById('selectOP');
    if (selectOP) {
        selectOP.addEventListener('change', loadOPData);
    }

    const generateJSONBtn = document.getElementById('generateJSONBtn');
    if (generateJSONBtn) {
        generateJSONBtn.addEventListener('click', generateJSONForOP);
    }

    const saveBtn = document.getElementById('saveBtn');
    if (saveBtn) {
        saveBtn.addEventListener('click', saveToSheets);
    }

    // ---- OP Editor Controls ----
    const bolsasUpBtn = document.getElementById('bolsasUpBtn');
    if (bolsasUpBtn) {
        bolsasUpBtn.addEventListener('click', () => adjustBolsas(1));
    }

    const bolsasDownBtn = document.getElementById('bolsasDownBtn');
    if (bolsasDownBtn) {
        bolsasDownBtn.addEventListener('click', () => adjustBolsas(-1));
    }

    const pvpUpBtn = document.getElementById('pvpUpBtn');
    if (pvpUpBtn) {
        pvpUpBtn.addEventListener('click', () => adjustPVP(1000));
    }

    const pvpDownBtn = document.getElementById('pvpDownBtn');
    if (pvpDownBtn) {
        pvpDownBtn.addEventListener('click', () => adjustPVP(-1000));
    }

    const generateJSONFromEditorBtn = document.getElementById('generateJSONFromEditorBtn');
    if (generateJSONFromEditorBtn) {
        generateJSONFromEditorBtn.addEventListener('click', generateJSONFromEditor);
    }

    // ---- JSON Editor ----
    const formatJSONBtn = document.getElementById('formatJSONBtn');
    if (formatJSONBtn) {
        formatJSONBtn.addEventListener('click', formatJSON);
    }

    const copyJSONBtn = document.getElementById('copyJSONBtn');
    if (copyJSONBtn) {
        copyJSONBtn.addEventListener('click', copyJSON);
    }

    const clearJSONBtn = document.getElementById('clearJSONBtn');
    if (clearJSONBtn) {
        clearJSONBtn.addEventListener('click', clearJSON);
    }

    const saveBtnToolbar = document.getElementById('saveBtnToolbar');
    if (saveBtnToolbar) {
        saveBtnToolbar.addEventListener('click', saveToSheets);
    }

    // ---- Theme & Settings ----
    const themeToggle = document.getElementById('themeToggle');
    if (themeToggle) {
        themeToggle.addEventListener('click', setupTheme);
    }

    const settingsBtn = document.getElementById('settingsBtn');
    if (settingsBtn) {
        settingsBtn.addEventListener('click', showSettingsModal);
    }

    // ---- Distribution ----
    const recInput = document.getElementById('recInput');
    if (recInput) {
        recInput.addEventListener('input', searchDistributionRec);
        setupRecInputKeyboardSupport();
    }

    const clearSearchBtn = document.getElementById('clearSearchBtn');
    if (clearSearchBtn) {
        clearSearchBtn.addEventListener('click', function () {
            if (recInput) {
                recInput.value = '';
                searchDistributionRec();
                recInput.focus();
            }
        });
    }

    const moduleConfigBtn = document.getElementById('moduleConfigBtn');
    if (moduleConfigBtn) {
        moduleConfigBtn.addEventListener('click', showModuleSettings);
    }

    const reloadDataBtn = document.getElementById('reloadDataBtn');
    if (reloadDataBtn) {
        reloadDataBtn.addEventListener('click', reloadAllDistributionData);
    }

    const saveDistributionsBtn = document.getElementById('saveDistributionsBtn');
    if (saveDistributionsBtn) {
        saveDistributionsBtn.addEventListener('click', saveDistributionToSheets);
    }

    const distributeEmpresasBtn = document.getElementById('distributeEmpresasBtn');
    if (distributeEmpresasBtn) {
        distributeEmpresasBtn.addEventListener('click', distributeEmpresasEqually);
    }

    const clearEmpresasBtn = document.getElementById('clearEmpresasBtn');
    if (clearEmpresasBtn) {
        clearEmpresasBtn.addEventListener('click', clearEmpresasValues);
    }

    const selectAllMayoristasBtn = document.getElementById('selectAllMayoristasBtn');
    if (selectAllMayoristasBtn) {
        selectAllMayoristasBtn.addEventListener('click', selectAllMayoristas);
    }

    const deselectAllMayoristasBtn = document.getElementById('deselectAllMayoristasBtn');
    if (deselectAllMayoristasBtn) {
        deselectAllMayoristasBtn.addEventListener('click', deselectAllMayoristas);
    }

    // ---- Printing ----
    const printSearchBtn = document.getElementById('printSearchBtn');
    if (printSearchBtn) {
        printSearchBtn.addEventListener('click', function () {
            if (window.print_buscarPorREC) window.print_buscarPorREC();
        });
    }

    const printReloadBtn = document.getElementById('printReloadBtn');
    if (printReloadBtn) {
        printReloadBtn.addEventListener('click', function () {
            if (window.print_cargarDatos) window.print_cargarDatos();
        });
    }

    const printMultipleBtn = document.getElementById('printMultipleBtn');
    if (printMultipleBtn) {
        printMultipleBtn.addEventListener('click', function () {
            if (window.print_buscarMultiplesRECs) window.print_buscarMultiplesRECs();
        });
    }

    const printOnlyClientsBtn = document.getElementById('printOnlyClientsBtn');
    if (printOnlyClientsBtn) {
        printOnlyClientsBtn.addEventListener('click', function () {
            if (window.print_imprimirSoloClientes) window.print_imprimirSoloClientes();
        });
    }

    const printOptionsBtn = document.getElementById('printOptionsBtn');
    if (printOptionsBtn) {
        printOptionsBtn.addEventListener('click', function () {
            if (window.print_mostrarOpcionesImpresion) window.print_mostrarOpcionesImpresion();
        });
    }

    const printRecInput = document.getElementById('printRecInput');
    if (printRecInput) {
        printRecInput.addEventListener('keydown', function (e) {
            if (e.key === 'Enter' && window.print_buscarPorREC) {
                window.print_buscarPorREC();
            }
        });
    }

    console.log('✅ Event listeners configurados');
}

// ============================================
// EXPONER FUNCIONES GLOBALMENTE PARA COMPATIBILIDAD
// ============================================
window.processCSV = processCSV;
window.exportToCSV = exportToCSV;
window.loadOPData = loadOPData;
window.adjustPVP = adjustPVP;
window.adjustBolsas = adjustBolsas;
window.generateJSONForOP = generateJSONForOP;
window.generateJSONFromEditor = generateJSONFromEditor;
window.saveToSheets = saveToSheets;
window.formatJSON = formatJSON;
window.copyJSON = copyJSON;
window.clearJSON = clearJSON;
window.loadOPEditor = loadOPEditor;
window.handleEditorChange = handleEditorChange;
window.deleteEditorRow = deleteEditorRow;
window.updateEditorStats = updateEditorStats;
window.saveSettings = saveSettings;
window.toggleTransferCancellation = toggleTransferCancellation;
window.restoreAllCancelledTransfers = restoreAllCancelledTransfers;
window.filterTransfers = filterTransfers;
window.clearSearch = clearSearch;
window.exportCancelledTransfers = exportCancelledTransfers;
window.importCancelledTransfers = importCancelledTransfers;
window.adjustRecInput = adjustRecInput;
window.selectAllMayoristas = selectAllMayoristas;
window.deselectAllMayoristas = deselectAllMayoristas;
window.adjustEmpresaValue = adjustEmpresaValue;
window.adjustGlobalValue = adjustGlobalValue;
window.adjustDistValue = adjustDistValue;
window.resetEmpresas = resetEmpresas;
window.distributeEmpresasEqually = distributeEmpresasEqually;
window.clearEmpresasValues = clearEmpresasValues;
window.reloadAllDistributionData = reloadAllDistributionData;
window.saveAllDistributionsFast = saveAllDistributionsFast;
window.showModuleSettings = showModuleSettings;
window.searchDistributionRec = searchDistributionRec;
window.saveDistributionToSheets = saveDistributionToSheets;

// ============================================
// EXPONER FUNCIONES DE CONFIGURACIÓN DINÁMICA
// ============================================
window.loadProveedoresData = loadProveedoresData;
window.loadAuditoresData = loadAuditoresData;
window.loadGestoresData = loadGestoresData;
window.loadUsuariosData = loadUsuariosData;
window.loadAllConfigData = loadAllConfigData;
window.loadAllDynamicOptions = loadAllDynamicOptions;
window.refreshDynamicOptions = refreshDynamicOptions;
window.getActiveProveedores = getActiveProveedores;
window.getActiveAuditores = getActiveAuditores;
window.getActiveGestores = getActiveGestores;