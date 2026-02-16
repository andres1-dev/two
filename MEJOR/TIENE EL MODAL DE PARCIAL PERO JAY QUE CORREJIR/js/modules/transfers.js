function loadTransferList() {
    const transferList = document.getElementById('transferList');
    if (!transferList) return;

    if (!processedData || processedData.length === 0) {
        transferList.innerHTML = '<div class="empty-state">No hay datos procesados</div>';
        return;
    }

    const uniqueTransfers = new Map();

    processedData.forEach(item => {
        if (item.TRASLADO) {
            const key = item.TRASLADO;
            if (!uniqueTransfers.has(key)) {
                uniqueTransfers.set(key, {
                    traslado: item.TRASLADO,
                    op: item.OP,
                    fecha: item.FECHA,
                    usuario: item.USUARIO,
                    cantidad: 0
                });
            }
            const transfer = uniqueTransfers.get(key);
            transfer.cantidad += item.CANTIDAD || 0;
        }
    });

    const sortedTransfers = Array.from(uniqueTransfers.values()).sort((a, b) =>
        parseInt(b.traslado) - parseInt(a.traslado)
    );

    transferList.innerHTML = sortedTransfers.map(t => `
        <div class="transfer-item ${cancelledTransfers.has(t.traslado) ? 'cancelled' : ''}">
            <div style="display: flex; align-items: center; gap: 12px;">
                <i class="codicon codicon-${cancelledTransfers.has(t.traslado) ? 'circle-slash' : 'check-circle'}" 
                   style="color: ${cancelledTransfers.has(t.traslado) ? 'var(--error)' : 'var(--success)'};"></i>
                <div style="flex: 1;">
                    <div style="display: flex; align-items: baseline; gap: 16px;">
                        <span style="font-weight: 600; font-family: monospace; font-size: 14px;">
                            ${t.traslado}
                        </span>
                        <span style="color: var(--text-secondary); font-size: 12px;">
                            OP: ${t.op}
                        </span>
                        <span style="color: var(--text-secondary); font-size: 12px;">
                            ${t.fecha}
                        </span>
                        <span style="color: var(--text-secondary); font-size: 12px;">
                            ${t.usuario}
                        </span>
                        <span style="color: var(--text-secondary); font-size: 12px;">
                            Cant: ${t.cantidad}
                        </span>
                    </div>
                </div>
                <button class="btn-icon" onclick="window.toggleTransferCancellation('${t.traslado}')" 
                        title="${cancelledTransfers.has(t.traslado) ? 'Restaurar traslado' : 'Anular traslado'}">
                    <i class="codicon codicon-${cancelledTransfers.has(t.traslado) ? 'sync' : 'trash'}"></i>
                </button>
            </div>
        </div>
    `).join('');

    // Exponer función globalmente
    window.toggleTransferCancellation = toggleTransferCancellation;
}

function toggleTransferCancellation(traslado) {
    if (cancelledTransfers.has(traslado)) {
        removeCancelledTransfer(traslado);
        showMessage(`Traslado ${traslado} restaurado`, 'success', 1500);
    } else {
        addCancelledTransfer(traslado);
        showMessage(`Traslado ${traslado} anulado`, 'warning', 1500);
    }

    loadTransferList();
    updateCancelledTransfersTable();
    saveCancelledTransfersToStorage();

    const restoreAllBtn = document.getElementById('restoreAllBtn');
    if (restoreAllBtn) {
        restoreAllBtn.style.display = cancelledTransfers.size > 0 ? 'inline-flex' : 'none';
    }
}

function restoreAllCancelledTransfers() {
    if (cancelledTransfers.size === 0) {
        showMessage('No hay traslados anulados para restaurar', 'info', 2000);
        return;
    }

    if (confirm(`¿Restaurar todos los ${cancelledTransfers.size} traslados anulados?`)) {
        clearCancelledTransfers();
        saveCancelledTransfersToStorage();
        loadTransferList();
        updateCancelledTransfersTable();

        const restoreAllBtn = document.getElementById('restoreAllBtn');
        if (restoreAllBtn) restoreAllBtn.style.display = 'none';

        showMessage('Todos los traslados han sido restaurados', 'success', 2000);
    }
}

function updateCancelledTransfersTable() {
    const tableBody = document.getElementById('cancelledTransfersBody');
    const exportBtn = document.getElementById('exportCancelledBtn');
    const importBtn = document.getElementById('importCancelledBtn');
    const restoreAllBtn = document.getElementById('restoreAllBtn');

    if (!tableBody) return;

    const cancelledArray = Array.from(cancelledTransfers).sort((a, b) =>
        parseInt(b) - parseInt(a)
    );

    if (cancelledArray.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="4" class="empty-state">No hay traslados anulados</td></tr>';
        if (exportBtn) exportBtn.disabled = true;
        if (importBtn) importBtn.disabled = false;
        if (restoreAllBtn) restoreAllBtn.style.display = 'none';
        return;
    }

    if (exportBtn) exportBtn.disabled = false;
    if (restoreAllBtn) restoreAllBtn.style.display = 'inline-flex';

    tableBody.innerHTML = cancelledArray.map(traslado => `
        <tr>
            <td><span style="font-family: monospace;">${traslado}</span></td>
            <td><span class="badge badge-error">Anulado</span></td>
            <td>${new Date().toLocaleDateString()}</td>
            <td>
                <button class="btn-icon" onclick="window.restoreTransfer('${traslado}')" title="Restaurar">
                    <i class="codicon codicon-sync"></i>
                </button>
            </td>
        </tr>
    `).join('');

    window.restoreTransfer = function (traslado) {
        removeCancelledTransfer(traslado);
        saveCancelledTransfersToStorage();
        updateCancelledTransfersTable();
        loadTransferList();
        showMessage(`Traslado ${traslado} restaurado`, 'success', 1500);

        if (cancelledTransfers.size === 0) {
            document.getElementById('restoreAllBtn').style.display = 'none';
        }
    };
}

function exportCancelledTransfers() {
    if (cancelledTransfers.size === 0) {
        showMessage('No hay traslados anulados para exportar', 'warning', 2000);
        return;
    }

    const data = JSON.stringify(Array.from(cancelledTransfers), null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const timestamp = new Date().toISOString().split('T')[0];

    link.href = url;
    link.download = `traslados_anulados_${timestamp}.json`;
    link.click();
    URL.revokeObjectURL(url);

    showMessage(`${cancelledTransfers.size} traslados anulados exportados`, 'success', 2000);
}

function importCancelledTransfers() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';

    input.onchange = async function (e) {
        const file = e.target.files[0];
        const reader = new FileReader();

        reader.onload = function (e) {
            try {
                const imported = JSON.parse(e.target.result);
                if (Array.isArray(imported)) {
                    imported.forEach(transfer => addCancelledTransfer(String(transfer)));
                    saveCancelledTransfersToStorage();
                    updateCancelledTransfersTable();
                    loadTransferList();
                    showMessage(`${imported.length} traslados anulados importados`, 'success', 2000);
                }
            } catch (error) {
                showMessage('Error al importar archivo', 'error', 2000);
            }
        };

        reader.readAsText(file);
    };

    input.click();
}

function saveCancelledTransfersToStorage() {
    try {
        localStorage.setItem('cancelledTransfers', JSON.stringify(Array.from(cancelledTransfers)));
        updateStatus(`${cancelledTransfers.size} traslados anulados guardados`, 'info');
    } catch (e) {
        console.error('Error guardando traslados anulados:', e);
    }
}

function loadCancelledTransfersFromStorage() {
    try {
        const saved = localStorage.getItem('cancelledTransfers');
        if (saved) {
            const parsed = JSON.parse(saved);
            parsed.forEach(transfer => addCancelledTransfer(transfer));
            return true;
        }
    } catch (e) {
        console.error('Error cargando traslados anulados:', e);
    }
    return false;
}

function filterTransfers() {
    const searchTerm = document.getElementById('transferSearch').value.toLowerCase().trim();
    const transferItems = document.querySelectorAll('.transfer-item');

    if (!searchTerm) {
        transferItems.forEach(item => {
            item.classList.remove('hidden', 'highlight');
        });
        return;
    }

    let foundCount = 0;
    transferItems.forEach(item => {
        const trasladoText = item.textContent.toLowerCase();
        if (trasladoText.includes(searchTerm)) {
            item.classList.remove('hidden');
            item.classList.add('highlight');
            foundCount++;
        } else {
            item.classList.add('hidden');
            item.classList.remove('highlight');
        }
    });
}

function clearSearch() {
    document.getElementById('transferSearch').value = '';
    filterTransfers();
    document.getElementById('transferSearch').focus();
}