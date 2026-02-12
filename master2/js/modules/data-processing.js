let currentFileInput = null;

async function processCSV() {
    const fileInput = document.getElementById('csvFile');
    currentFileInput = fileInput;

    if (!fileInput.files.length) {
        showMessage('Por favor selecciona un archivo CSV para procesar', 'error', 2000);
        return;
    }

    const loading = showQuickLoading('Procesando archivo CSV...');
    const processBtn = document.getElementById('processBtn');
    if (processBtn) {
        processBtn.disabled = true;
        processBtn.innerHTML = '<span class="loading-spinner"></span> Procesando...';
    }
    updateStatus('Procesando archivo CSV...', 'loading');

    const file = fileInput.files[0];
    const reader = new FileReader();

    reader.onload = async function (e) {
        try {
            const csvContent = e.target.result;
            const rows = parseCSV(csvContent);

            if (rows.length === 0) {
                throw new Error('El archivo CSV está vacío o no tiene datos válidos');
            }

            await processCSVData(rows);

            const isReprocess = loading._isReprocess;
            showMessage(
                isReprocess
                    ? `CSV reprocesado - ${processedData.length} registros actualizados`
                    : `Procesamiento completado - ${processedData.length} registros procesados`,
                'success', 2000
            );

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

    reader.readAsText(file, 'UTF-8');
}

async function processCSVData(rows) {
    console.log(`Iniciando procesamiento de CSV. Traslados anulados cargados: ${cancelledTransfers.size}`);

    const prDataMap = new Map();
    const groupedDataMap = new Map();
    const opErrors = new Map();
    
    // Cache de consultas frecuentes
    const sisproCache = new Map();
    const colorCache = new Map();
    const pvpCache = new Map();
    const estadoCache = new Map();
    const marcaCache = new Map();
    const claseCache = new Map();

    // First pass: collect PR data - OPTIMIZADO con early exit
    for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        if (row.length < 38) continue;
        
        const usuario = row[1] || '';
        const bodega = row[14] || '';
        const tipo = row[3] || '';
        
        // Early exit si no cumple condiciones básicas
        if (!escanersMap[usuario] || bodega !== 'PR' || tipo !== 'TR') continue;
        
        const key = `${row[2]}|${row[11]}|${row[12]}`;
        prDataMap.set(key, {
            COSTO: parseFloat(row[10]) || 0,
            OS: extractOSNumber(row[13] || ''),
            CC: row[37] || ''
        });
    }

    // Second pass: process TR data and group duplicates - OPTIMIZADO
    for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        if (row.length < 38) continue;
        
        const usuario = row[1] || '';
        const bodega = row[14] || '';
        const tipo = row[3] || '';
        
        // Early exit: verificar condiciones básicas primero
        if (!escanersMap[usuario] || bodega === 'PR' || tipo !== 'TR') continue;
        
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
        
        // Validaciones con cache
        let errors = null;
        
        // Validar OP en SISPROWEB con cache
        if (!sisproCache.has(op)) {
            sisproCache.set(op, sisproMap.has(op));
        }
        if (!sisproCache.get(op)) {
            errors = errors || [];
            errors.push(`OP ${op} no encontrada en SISPROWEB`);
        }
        
        // Validar color con cache
        if (codColorOriginal && !colorCache.has(codColorOriginal)) {
            colorCache.set(codColorOriginal, coloresMap.has(codColorOriginal));
        }
        if (codColorOriginal && !colorCache.get(codColorOriginal)) {
            errors = errors || [];
            errors.push(`Color ${codColorOriginal} no encontrado en COLORES`);
        }
        
        if (errors) {
            if (!opErrors.has(op)) opErrors.set(op, errors);
            continue;
        }
        
        const groupKey = `${op}|${referencia}|${talla}|${codColorOriginal}|${bodega}`;
        const prKey = `${row[2]}|${row[11]}|${row[12]}`;
        const prData = prDataMap.get(prKey);
        
        // Obtener datos con cache
        let sisproInfo;
        if (sisproCache.has(op + '_data')) {
            sisproInfo = sisproCache.get(op + '_data');
        } else {
            sisproInfo = getSisproData(op);
            sisproCache.set(op + '_data', sisproInfo);
        }
        
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
            // Cache para cálculos frecuentes
            let estado;
            if (estadoCache.has(op)) {
                estado = estadoCache.get(op);
            } else {
                estado = validarEstado(op);
                estadoCache.set(op, estado);
            }
            
            let pvp;
            if (pvpCache.has(referencia)) {
                pvp = pvpCache.get(referencia);
            } else {
                pvp = getPvp(referencia);
                pvpCache.set(referencia, pvp);
            }
            
            let marca;
            const generoKey = sisproInfo.GENERO || '';
            if (marcaCache.has(generoKey)) {
                marca = marcaCache.get(generoKey);
            } else {
                marca = getMarca(generoKey);
                marcaCache.set(generoKey, marca);
            }
            
            let clase;
            if (claseCache.has(pvp)) {
                clase = claseCache.get(pvp);
            } else {
                clase = getClaseByPVP(pvp);
                claseCache.set(pvp, clase);
            }
            
            const descripcion = getDescripcion(
                sisproInfo.PRENDA || normalizeText(row[23] || ''),
                sisproInfo.GENERO,
                marca,
                referencia
            );
            
            groupedDataMap.set(groupKey, {
                REFERENCIA: referencia,
                USUARIO: escanersMap[usuario] || usuario,
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
    if (pendientes.length > 0) {
        setupPendientesSection(pendientes);
        document.getElementById('pendientesSection').style.display = 'block';
        updateStatus(`${pendientes.length} OPs pendientes listas para procesar`, 'success');
        document.querySelector('[data-tab="pending-ops"]').click();
    }
}