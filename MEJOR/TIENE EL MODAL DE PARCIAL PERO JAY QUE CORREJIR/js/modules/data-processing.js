let currentFileInput = null;
let lastCsvRows = null; // Guardar las filas para re-procesar sin recargar archivo

async function processCSV() {
    const fileInput = document.getElementById('csvFile');
    currentFileInput = fileInput;

    // Si no hay archivos y tenemos datos previos, re-procesamos lo que ya tenemos
    if (!fileInput.files.length && lastCsvRows) {
        return reprocessLastCsv();
    }

    if (!fileInput.files.length) {
        showMessage('Por favor selecciona un archivo CSV para procesar', 'error', 2000);
        return;
    }

    const loading = showQuickLoading('Procesando archivo CSV...');
    const processBtn = document.getElementById('processBtn');

    // Reset de estado visual antes de empezar
    if (processBtn) {
        processBtn.disabled = true;
        processBtn.innerHTML = '<span class="loading-spinner"></span> Procesando...';
    }

    updateStatus('Procesando archivo CSV...', 'loading');

    const file = fileInput.files[0];
    const reader = new FileReader();

    reader.onload = async function (e) {
        // Limpiar inputs para permitir re-carga del mismo archivo
        fileInput.value = '';

        try {
            // Limpiar datos previos
            setCurrentOPData(null);

            // Ocultar paneles previos para un "nuevo" procesamiento
            const resultsPanel = document.getElementById('resultsPanel');
            const exportBtn = document.getElementById('exportBtn');
            const pendientesSection = document.getElementById('pendientesSection');
            const opPreview = document.getElementById('opPreview');
            const opForm = document.getElementById('opForm');
            const opEditorContainer = document.getElementById('opEditorContainer');
            const opEditorEmptyState = document.getElementById('opEditorEmptyState');

            if (resultsPanel) resultsPanel.style.display = 'none';
            if (exportBtn) exportBtn.style.display = 'none';
            if (pendientesSection) pendientesSection.style.display = 'none';
            if (opEditorContainer) opEditorContainer.style.display = 'none';
            if (opEditorEmptyState) opEditorEmptyState.style.display = 'block';

            // Reset de contenido de previsualización
            if (opPreview) {
                opPreview.innerHTML = `
                    <div class="preview-placeholder">
                        <i class="codicon codicon-info"></i>
                        Selecciona una OP para ver los detalles
                    </div>
                `;
            }
            if (opForm) opForm.style.display = 'none';

            const csvContent = e.target.result;
            const rows = parseCSV(csvContent);
            lastCsvRows = rows; // Guardar para futuros re-procesamientos

            if (rows.length === 0) {
                throw new Error('El archivo CSV está vacío o no tiene datos válidos');
            }

            const completed = await processCSVData(rows);

            if (completed) {
                const isReprocess = loading._isReprocess;
                showMessage(
                    isReprocess
                        ? `CSV reprocesado - ${processedData.length} registros actualizados`
                        : `Procesamiento completado - ${processedData.length} registros procesados`,
                    'success', 2000
                );
            }

        } catch (error) {
            console.error('Error procesando CSV:', error);
            showMessage('Error al procesar archivo: ' + error.message, 'error', 3000);
        } finally {
            loading.close();
            if (processBtn) {
                processBtn.disabled = false;
                processBtn.innerHTML = '<i class="codicon codicon-play"></i> Procesar CSV';
            }
        }
    };

    reader.onerror = function () {
        loading.close();
        showMessage('Error de lectura - No se pudo leer el archivo CSV', 'error', 3000);
        if (processBtn) {
            processBtn.disabled = false;
            processBtn.innerHTML = '<i class="codicon codicon-play"></i> Procesar CSV';
        }
    };

    try {
        reader.readAsText(file, 'UTF-8');
    } catch (err) {
        console.error('Error al iniciar lectura:', err);
        loading.close();
        if (processBtn) {
            processBtn.disabled = false;
            processBtn.innerHTML = '<i class="codicon codicon-play"></i> Procesar CSV';
        }
    }
}

/**
 * Re-procesa las últimas filas del CSV cargado
 * Útil después de guardar una OP o corregir datos
 */
async function reprocessLastCsv() {
    if (!lastCsvRows) return false;

    const loading = showQuickLoading('Actualizando lista de OPs...');
    try {
        const completed = await processCSVData(lastCsvRows);
        return completed;
    } catch (error) {
        console.error('Error al re-procesar CSV:', error);
        return false;
    } finally {
        loading.close();
    }
}

async function processCSVData(rows) {
    console.log(`Iniciando procesamiento de CSV. Traslados anulados cargados: ${cancelledTransfers.size}`);
    console.log(`Usuarios activos cargados: ${escanersMap.size}`);

    const prDataMap = new Map();
    const groupedDataMap = new Map();
    const opErrors = new Map();

    // First pass: collect PR data - OPTIMIZADO con early exit
    for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        if (row.length < 38) continue;

        const usuario = row[1] || '';
        const bodega = row[14] || '';
        const tipo = row[3] || '';

        // Verificar si el usuario existe en el mapa de escaners
        const usuarioValido = escanersMap.has(usuario);

        if (!usuarioValido || bodega !== 'PR' || tipo !== 'TR') continue;

        const key = `${row[2]}|${row[11]}|${row[12]}`;
        prDataMap.set(key, {
            COSTO: parseFloat(row[10]) || 0,
            OS: extractOSNumber(row[13] || ''),
            CC: row[37] || ''
        });
    }

    const missingOPs = new Set();
    const missingColors = new Set();

    // Second pass: process TR data and group duplicates - OPTIMIZADO
    for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        if (row.length < 38) continue;

        const usuario = row[1] || '';
        const bodega = row[14] || '';
        const tipo = row[3] || '';

        // Verificar si el usuario existe en el mapa de escaners
        const usuarioValido = escanersMap.has(usuario);

        // Early exit: verificar condiciones básicas primero
        if (!usuarioValido || bodega === 'PR' || tipo !== 'TR') continue;

        // Verificar traslado anulado
        const trasladoOriginal = row[7] || '';
        const trasladoExtraido = extractTrasladoNumber(trasladoOriginal);
        if (cancelledTransfers.has(trasladoOriginal) || cancelledTransfers.has(trasladoExtraido)) {
            console.log(`Traslado anulado detectado y excluido: ${trasladoOriginal}`);
            continue;
        }

        const op = (row[2] || '').trim();
        const codColorOriginal = (row[12] || '').trim();
        const talla = row[11] || '';
        const referencia = (row[0] || '').trim();

        // Validaciones directas (sin cache)
        let hasError = false;

        // Validar OP en SISPROWEB
        if (!sisproMap.has(op)) {
            missingOPs.add(op);
            hasError = true;
        }

        // Validar color
        if (codColorOriginal && !coloresMap.has(codColorOriginal)) {
            missingColors.add(codColorOriginal);
            hasError = true;
        }

        if (hasError) {
            // No agregamos errores a opErrors aquí para permitir el flujo del modal
            continue;
        }

        const groupKey = `${op}|${referencia}|${talla}|${codColorOriginal}|${bodega}`;
        const prKey = `${row[2]}|${row[11]}|${row[12]}`;
        const prData = prDataMap.get(prKey);

        // Obtener datos
        const sisproInfo = getSisproData(op);

        let costo = 0;
        if (bodega !== 'ZY' && prData) costo = prData.COSTO;

        const cantidad = parseFloat(row[9]) || 0;

        if (groupedDataMap.has(groupKey)) {
            const existing = groupedDataMap.get(groupKey);
            existing.CANTIDAD += cantidad;
            if (bodega !== 'ZY' && prData) {
                existing.COSTO = formatCosto(parseFloat(existing.COSTO) + costo);
            }
        } else {
            // Cálculos directos (sin cache)
            const estado = validarEstado(op);
            const pvp = getPvp(referencia);
            const generoKey = sisproInfo.GENERO || '';
            const marca = getMarca(generoKey);
            const clase = getClaseByPVP(pvp);

            const descripcion = getDescripcion(
                sisproInfo.PRENDA || normalizeText(row[23] || ''),
                sisproInfo.GENERO,
                marca,
                referencia
            );

            groupedDataMap.set(groupKey, {
                REFERENCIA: referencia,
                USUARIO: escanersMap.get(usuario) || usuario, // Usar mapa dinámico
                OP: op,
                TIPO: normalizeTipo(tipo),
                FECHA: formatDate(row[4]),
                TRASLADO: extractTrasladoNumber(row[7] || ''),
                CANTIDAD: cantidad,
                COSTO: formatCosto(costo),
                TOTAL: row[19] || '',
                PVP: pvp,
                TALLA: talla,
                COLORES: getColorName(codColorOriginal),
                COD_COLOR: codColorOriginal,
                OS: prData ? prData.OS : extractOSNumber(row[13] || ''),
                BODEGA: normalizeBodega(bodega),
                TALLER: normalizeText(row[18] || ''),
                DESCRIPCION_LARGA: normalizeText(row[21] || ''),
                PRENDA: sisproInfo.PRENDA || normalizeText(row[23] || ''),
                LINEA: sisproInfo.LINEA || '',
                GENERO: sisproInfo.GENERO || '',
                CC: prData ? prData.CC : (row[37] || ''),
                ESTADO: estado,
                MARCA: marca,
                CLASE: clase,
                DESCRIPCION: descripcion
            });
        }
    }

    // Si se detectaron datos faltantes, mostrar modal y detener procesamiento actual
    if (missingOPs.size > 0 || missingColors.size > 0) {
        showMissingDataModal(
            Array.from(missingOPs),
            Array.from(missingColors),
            async () => {
                const loading = showQuickLoading('Registros guardados. Re-validando CSV...');
                try {
                    const success = await processCSVData(rows);
                    if (success) {
                        showMessage(`CSV re-procesado exitosamente - ${processedData.length} registros listos`, 'success', 2000);
                    }
                } finally {
                    loading.close();
                }
            }
        );
        return false;
    }

    setProcessedData(Array.from(groupedDataMap.values()));

    if (opErrors.size > 0) {
        let errorMessage = `Se encontraron ${opErrors.size} OPs con errores:`;
        opErrors.forEach((errors, op) => {
            errorMessage += `\n• OP ${op}: ${errors.join(', ')}`;
        });
        showMessage(errorMessage, 'error', 5000);
        updateStatus(`${opErrors.size} OPs deshabilitadas por datos faltantes`, 'warning');
    }

    if (processedData.length === 0) {
        throw new Error('No se encontraron datos válidos para los usuarios especificados con tipo TR');
    }

    displayResultsSummary(processedData);
    document.getElementById('resultsPanel').style.display = 'block';
    document.getElementById('exportBtn').style.display = 'inline-block';

    const pendientes = processedData.filter(item => item.ESTADO === 'PENDIENTE');
    const pendientesSection = document.getElementById('pendientesSection');

    if (pendientes.length > 0) {
        setupPendientesSection(pendientes);
        if (pendientesSection) pendientesSection.style.display = 'block';
        updateStatus(`${pendientes.length} OPs pendientes listas para procesar`, 'success');
        switchToPendingOpsTab();
    } else {
        if (pendientesSection) pendientesSection.style.display = 'none';
        updateStatus('Procesamiento completado - Sin OPs pendientes', 'success');
    }


    // El mensaje de éxito se maneja en los llamadores (processCSV o el callback del modal)
    // para evitar duplicidad, ya que processCSV tiene su propia lógica de mensajes.


    return true;
}