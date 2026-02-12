function setupEventListeners() {
    setupFileUploadListeners();
    setupButtonListeners();
}

function setupFileUploadListeners() {
    const fileInput = document.getElementById('csvFile');
    const uploadBox = document.getElementById('uploadBox');

    if (!fileInput || !uploadBox) return;

    fileInput.addEventListener('change', async function (e) {
        if (e.target.files.length > 0) {
            const fileName = e.target.files[0].name;
            updateStatus(`Archivo seleccionado: ${fileName}`, 'success');
            showMessage(`Archivo "${fileName}" cargado. Procesando automáticamente...`, 'success', 2000);
            setTimeout(() => processCSV(), 500);
        }
    });

    uploadBox.addEventListener('dragover', function (e) {
        e.preventDefault();
        uploadBox.style.borderColor = 'var(--primary)';
        uploadBox.style.backgroundColor = 'var(--hover)';
    });

    uploadBox.addEventListener('dragleave', function (e) {
        e.preventDefault();
        uploadBox.style.borderColor = 'var(--border)';
        uploadBox.style.backgroundColor = 'transparent';
    });

    uploadBox.addEventListener('drop', function (e) {
        e.preventDefault();
        uploadBox.style.borderColor = 'var(--border)';
        uploadBox.style.backgroundColor = 'transparent';

        if (e.dataTransfer.files.length) {
            fileInput.files = e.dataTransfer.files;
            const fileName = e.dataTransfer.files[0].name;
            updateStatus(`Archivo listo: ${fileName}`, 'success');
            showMessage(`Archivo "${fileName}" cargado. Procesando automáticamente...`, 'success', 2000);
            setTimeout(() => processCSV(), 500);
        }
    });
}

function setupButtonListeners() {
    const settingsBtn = document.getElementById('settingsBtn');
    if (settingsBtn) {
        settingsBtn.addEventListener('click', showSettingsModal);
    }

    const exportBtn = document.getElementById('exportCancelledBtn');
    if (exportBtn) {
        exportBtn.addEventListener('click', exportCancelledTransfers);
    }

    const importBtn = document.getElementById('importCancelledBtn');
    if (importBtn) {
        importBtn.addEventListener('click', importCancelledTransfers);
    }
}