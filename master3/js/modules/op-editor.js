// ============================================
// CARGAR OPCIONES DINÁMICAS EN LOS SELECTS
// ============================================

/**
 * Carga las opciones de proveedores en el select
 */
function loadProveedoresOptions() {
    const select = document.getElementById('proveedor');
    if (!select) return;
    
    // Guardar valor seleccionado actual
    const currentValue = select.value;
    
    // Limpiar opciones
    select.innerHTML = '<option value="">Seleccione...</option>';
    
    // Cargar desde el mapa dinámico
    const sortedProveedores = Array.from(proveedoresMap.entries())
        .sort((a, b) => a[1].localeCompare(b[1]));
    
    let primerValor = null;
    
    sortedProveedores.forEach(([codigo, nombre], index) => {
        const option = document.createElement('option');
        option.value = nombre;
        option.textContent = nombre;
        
        // Si no hay valor seleccionado actualmente Y es el primer elemento
        if (!currentValue && index === 0) {
            option.selected = true;
            primerValor = nombre;
        }
        // Si hay valor seleccionado actualmente y coincide
        else if (nombre === currentValue) {
            option.selected = true;
        }
        
        select.appendChild(option);
    });
    
    // Si no había valor seleccionado y hay al menos un proveedor
    if (!currentValue && sortedProveedores.length > 0) {
        console.log(`✅ Proveedor por defecto seleccionado: ${primerValor}`);
    }
    
    console.log(`📋 Select de proveedores cargado con ${proveedoresMap.size} opciones`);
}

/**
 * Carga las opciones de auditores en el select
 */
function loadAuditoresOptions() {
    const select = document.getElementById('auditor');
    if (!select) return;
    
    const currentValue = select.value;
    
    select.innerHTML = '<option value="">Seleccione...</option>';
    
    const sortedAuditores = Array.from(auditoresMap.entries())
        .sort((a, b) => a[1].localeCompare(b[1]));
    
    sortedAuditores.forEach(([codigo, nombre]) => {
        const option = document.createElement('option');
        option.value = nombre;
        option.textContent = nombre;
        if (nombre === currentValue) {
            option.selected = true;
        }
        select.appendChild(option);
    });
    
    console.log(`📋 Select de auditores cargado con ${auditoresMap.size} opciones`);
}

/**
 * Carga las opciones de gestores en el select
 */
function loadGestoresOptions() {
    const select = document.getElementById('gestor');
    if (!select) return;
    
    const currentValue = select.value;
    
    select.innerHTML = '<option value="">Seleccione...</option>';
    
    const sortedGestores = Array.from(gestoresMap.entries())
        .sort((a, b) => a[1].localeCompare(b[1]));
    
    sortedGestores.forEach(([codigo, nombre]) => {
        const option = document.createElement('option');
        option.value = nombre;
        option.textContent = nombre;
        if (nombre === currentValue) {
            option.selected = true;
        }
        select.appendChild(option);
    });
    
    console.log(`📋 Select de gestores cargado con ${gestoresMap.size} opciones`);
}

/**
 * Carga todas las opciones dinámicas
 */
function loadAllDynamicOptions() {
    loadProveedoresOptions();
    loadAuditoresOptions();
    loadGestoresOptions();
}

// ============================================
// FUNCIONES EXISTENTES MODIFICADAS
// ============================================

function loadOPData() {
    const selectOP = document.getElementById('selectOP');
    const selectedOption = selectOP.options[selectOP.selectedIndex];

    if (!selectedOption.value) return;

    const items = JSON.parse(selectedOption.dataset.items);
    setCurrentOPData(items);

    const primerItem = getRepresentativeItem(items);

    const pvpField = document.getElementById('pvpEdit');
    if (pvpField) pvpField.value = primerItem.PVP || '';

    // Limpiar selects y recargar opciones dinámicas
    ['proveedor', 'auditor', 'gestor'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = '';
    });
    
    // Cargar opciones dinámicas
    loadAllDynamicOptions();

    const bolsasField = document.getElementById('bolsas');
    if (bolsasField) bolsasField.value = '0';

    loadOPEditor();
    switchToEditorTab();
    updateStatus(`Datos cargados para OP: ${primerItem.OP}`, 'success');
}

// ============================================
// FUNCIONES DE GENERACIÓN JSON (ACTUALIZADAS)
// ============================================

function generateJSONForOP() {
    if (!currentOPData || currentOPData.length === 0) {
        showMessage('No hay datos de OP cargados', 'error', 2000);
        return;
    }

    const proveedor = document.getElementById('proveedor').value;
    const auditor = document.getElementById('auditor').value;
    const gestor = document.getElementById('gestor').value;
    const bolsas = parseInt(document.getElementById('bolsas').value) || 0;
    const pvpEdit = document.getElementById('pvpEdit').value;

    if (!proveedor || !auditor || !gestor || !pvpEdit) {
        showMessage('Por favor complete todos los campos requeridos', 'error', 2000);
        return;
    }

    const primerItem = getRepresentativeItem(currentOPData);
    const items = currentOPData;
    const cantidad = parseInt(primerItem.TOTAL) || 0;

    let cantidadFull = 0, cantidadPromo = 0, cantidadCobros = 0, cantidadSinConfeccionar = 0;
    let costoTotal = 0;
    const hr = [];
    const anexos = [];

    items.forEach(item => {
        const costoUnitario = parseInt(item.COSTO) || 0;
        const costoTOTAL = costoUnitario * item.CANTIDAD;
        costoTotal += costoTOTAL;

        if (item.BODEGA === 'PRIMERAS') {
            cantidadFull += item.CANTIDAD;
            hr.push([item.COD_COLOR, item.COLORES, item.TALLA, item.CANTIDAD]);
        }
        else if (item.BODEGA === 'PROMOCIONES') {
            cantidadPromo += item.CANTIDAD;
            anexos.push({ DOCUMENTO: item.REFERENCIA, TALLA: item.TALLA, COLOR: item.COLORES, TIPO: 'PROMO', CANTIDAD: item.CANTIDAD, COSTO_UNITARIO: costoUnitario, COSTO_TOTAL: costoTOTAL, BODEGA: item.BODEGA, TRASLADO: item.TRASLADO });
        }
        else if (item.BODEGA === 'COBROS') {
            cantidadCobros += item.CANTIDAD;
            anexos.push({ DOCUMENTO: item.REFERENCIA, TALLA: item.TALLA, COLOR: item.COLORES, TIPO: 'COBRO', CANTIDAD: item.CANTIDAD, COSTO_UNITARIO: costoUnitario, COSTO_TOTAL: costoTOTAL, BODEGA: item.BODEGA, TRASLADO: item.TRASLADO });
        }
        else if (item.BODEGA === 'SIN CONFECCIONAR') {
            cantidadSinConfeccionar += item.CANTIDAD;
            anexos.push({ DOCUMENTO: item.REFERENCIA, TALLA: item.TALLA, COLOR: item.COLORES, TIPO: 'SIN_CONFECCIONAR', CANTIDAD: item.CANTIDAD, COSTO_UNITARIO: costoUnitario, COSTO_TOTAL: costoTOTAL, BODEGA: item.BODEGA, TRASLADO: item.TRASLADO });
        }
    });

    const totalRelativo = cantidadFull + cantidadPromo + cantidadCobros;
    const totalGeneral = cantidadFull + cantidadPromo + cantidadCobros + cantidadSinConfeccionar;
    const diferencia = cantidad - totalGeneral;
    const costoUnitario = cantidad > 0 ? Math.round(costoTotal / cantidad) : 0;
    const sumatoria = cantidadFull + cantidadPromo + cantidadCobros + cantidadSinConfeccionar;

    const referenciaHistorica = getReferenciaHistorica(primerItem.REFERENCIA);
    const marca = getMarca(primerItem.GENERO);
    const clase = getClaseByPVP(pvpEdit);
    const descripcion = getDescripcion(primerItem.PRENDA, primerItem.GENERO, marca, referenciaHistorica);

    const auditoriaNum = parseInt(primerItem.CC) || 0;
    const osNum = parseInt(primerItem.OS) || 0;
    const trasladoNum = parseInt(primerItem.TRASLADO) || 0;
    const pvpString = pvpEdit;
    const loteNum = parseInt(primerItem.OP) || 0;

    const jsonData = {
        "A": primerItem.OP,
        "FECHA": primerItem.FECHA,
        "TALLER": primerItem.TALLER,
        "LINEA": primerItem.LINEA,
        "AUDITOR": auditor,
        "GESTOR": gestor,
        "ESCANER": primerItem.USUARIO,
        "LOTE": loteNum,
        "REFPROV": primerItem.REFERENCIA,
        "DESCRIPCIÓN": descripcion,
        "DESCRIPCIÓN_LARGA": primerItem.DESCRIPCION_LARGA,
        "CANTIDAD": cantidad,
        "TOTAL_RELATIVO": totalRelativo,
        "COSTO_UNITARIO": costoUnitario,
        "COSTO_TOTAL": costoTotal,
        "TOTAL_GENERAL": totalGeneral,
        "DIFERENCIA": diferencia,
        "AUDITORIA": auditoriaNum,
        "ORDEN_SERVICIO": osNum,
        "TRASLADO": trasladoNum,
        "REFERENCIA": referenciaHistorica,
        "TIPO": "FULL",
        "PVP": pvpString,
        "CLASE": clase,
        "PRENDA": primerItem.PRENDA,
        "GENERO": primerItem.GENERO,
        "MARCA": marca,
        "PROVEEDOR": proveedor,
        "BOLSAS": bolsas,
        "ANEXOS": anexos,
        "HR": hr,
        "DETALLE_CANTIDADES": {
            "TOTAL": sumatoria,
            "FULL": cantidadFull,
            "PROMO": cantidadPromo,
            "COBRO": cantidadCobros,
            "SIN_CONFECCIONAR": cantidadSinConfeccionar
        }
    };

    document.getElementById('jsonContent').textContent = JSON.stringify(jsonData, null, 2);
    document.getElementById('saveBtn').style.display = 'inline-flex';
    document.getElementById('saveBtnToolbar').style.display = 'flex';

    document.querySelector('[data-tab="json-editor"]').click();
    showMessage(`JSON generado exitosamente para OP: ${primerItem.OP}`, 'success', 2000);
}

// ============================================
// RESTO DE FUNCIONES SIN CAMBIOS
// ============================================

function loadOPEditor() {
    if (!currentOPData || currentOPData.length === 0) {
        hideEditor();
        return;
    }

    showEditor();
    updateEditorHeader();
    renderEditorTable();
    updateEditorStats();
}

function showEditor() {
    const container = document.getElementById('opEditorContainer');
    const emptyState = document.getElementById('opEditorEmptyState');
    if (container) container.style.display = 'block';
    if (emptyState) emptyState.style.display = 'none';
}

function hideEditor() {
    const container = document.getElementById('opEditorContainer');
    const emptyState = document.getElementById('opEditorEmptyState');
    if (container) container.style.display = 'none';
    if (emptyState) emptyState.style.display = 'block';
}

function updateEditorHeader() {
    const primerItem = getRepresentativeItem(currentOPData);
    const infoDiv = document.getElementById('opEditorInfo');
    if (infoDiv) {
        infoDiv.innerHTML = `
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px;">
                <div class="info-group">
                    <label style="font-size: 11px; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.5px;">OP</label>
                    <div style="font-weight: 600; font-size: 16px;">${primerItem.OP}</div>
                </div>
                <div class="info-group">
                    <label style="font-size: 11px; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.5px;">Referencia</label>
                    <div style="font-weight: 600;">${primerItem.REFERENCIA}</div>
                </div>
                <div class="info-group">
                    <label style="font-size: 11px; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.5px;">Prenda</label>
                    <div>${primerItem.PRENDA}</div>
                </div>
                <div class="info-group">
                    <label style="font-size: 11px; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.5px;">Usuario</label>
                    <div>${primerItem.USUARIO}</div>
                </div>
            </div>
        `;
    }
}

function renderEditorTable() {
    const tbody = document.getElementById('opEditorTableBody');
    if (!tbody) return;
    tbody.innerHTML = '';

    currentOPData.forEach((item, index) => {
        const tr = document.createElement('tr');

        const bodegaOptions = Object.keys(bodegasMap).map(code => {
            const name = bodegasMap[code];
            const isSelected = (item.BODEGA === name) || (item.BODEGA === code);
            return `<option value="${name}" ${isSelected ? 'selected' : ''}>${name}</option>`;
        }).join('');

        tr.innerHTML = `
            <td><div style="font-weight: 500;">${item.TALLA}</div></td>
            <td>${item.COLORES || item.COD_COLOR}</td>
            <td>
                <select class="form-control" style="padding: 4px; height: 30px; font-size: 13px;" onchange="window.handleEditorChange(${index}, 'BODEGA', this.value)">
                    ${bodegaOptions}
                </select>
            </td>
            <td>
                <input type="number" class="form-control" style="padding: 4px; height: 30px; width: 100px;" 
                       value="${item.CANTIDAD}" min="0" onchange="window.handleEditorChange(${index}, 'CANTIDAD', this.value)">
            </td>
            <td>
                <input type="number" class="form-control" style="padding: 4px; height: 30px; width: 120px;" 
                       value="${item.COSTO}" min="0" onchange="window.handleEditorChange(${index}, 'COSTO', this.value)">
            </td>
            <td><span style="font-family: monospace; font-size: 12px;">${item.TRASLADO}</span></td>
            <td>
                <button class="btn-icon" style="color: #f44747;" onclick="window.deleteEditorRow(${index})" title="Eliminar fila">
                    <i class="codicon codicon-trash"></i>
                </button>
            </td>
        `;

        tbody.appendChild(tr);
    });

    window.handleEditorChange = handleEditorChange;
    window.deleteEditorRow = deleteEditorRow;
}

function handleEditorChange(index, field, value) {
    if (index >= 0 && index < currentOPData.length) {
        const item = currentOPData[index];
        if (field === 'CANTIDAD') item.CANTIDAD = parseInt(value) || 0;
        else if (field === 'COSTO') item.COSTO = parseFloat(value) || 0;
        else if (field === 'BODEGA') item.BODEGA = value;
        updateEditorStats();
    }
}

function deleteEditorRow(index) {
    if (confirm('¿Estás seguro de eliminar este registro? Esta acción es irreversible para la sesión actual.')) {
        currentOPData.splice(index, 1);
        renderEditorTable();
        updateEditorStats();
    }
}

function updateEditorStats() {
    if (!currentOPData) return;

    const totalUnits = currentOPData.reduce((sum, item) => sum + (parseInt(item.CANTIDAD) || 0), 0);
    const totalCost = currentOPData.reduce((sum, item) =>
        sum + ((parseInt(item.CANTIDAD) || 0) * (parseFloat(item.COSTO) || 0)), 0);

    const unitsEl = document.getElementById('editorTotalUnits');
    const costEl = document.getElementById('editorTotalCost');

    if (unitsEl) unitsEl.textContent = totalUnits;
    if (costEl) costEl.textContent = totalCost.toLocaleString('es-CO');
}

function switchToEditorTab() {
    const editorTabBtn = document.querySelector('.activity-icon[data-tab="op-editor"]') ||
        document.querySelector('.tab[data-tab="op-editor"]');
    if (editorTabBtn) editorTabBtn.click();
}

function adjustPVP(amount) {
    const pvpInput = document.getElementById('pvpEdit');
    let currentValue = parseInt(pvpInput.value.replace(/\./g, '')) || 0;
    currentValue += amount;
    if (currentValue < 0) currentValue = 0;
    pvpInput.value = currentValue.toLocaleString('es-CO');
}

function generateJSONFromEditor() {
    const proveedor = document.getElementById('proveedor').value;
    const auditor = document.getElementById('auditor').value;
    const gestor = document.getElementById('gestor').value;
    const pvpEdit = document.getElementById('pvpEdit').value;

    if (!proveedor || !auditor || !gestor || !pvpEdit) {
        showMessage('Por favor complete la información de cabecera en la pestaña "OPs Pendientes"', 'warning', 4000);
        return;
    }

    generateJSONForOP();
}

async function saveToSheets() {
    const jsonContent = document.getElementById('jsonContent');
    const fileInput = document.getElementById('csvFile');

    if (!currentOPData || currentOPData.length === 0) {
        showMessage('No hay datos de OP cargados', 'error', 2000);
        return;
    }

    let jsonData;
    try {
        jsonData = JSON.parse(jsonContent.textContent);
    } catch (e) {
        showMessage('Error al leer los datos JSON', 'error', 2000);
        return;
    }

    const diferencia = jsonData.DIFERENCIA || 0;
    const tableData = [
        { label: 'Primeras (DI)', value: jsonData.DETALLE_CANTIDADES?.FULL || 0 },
        { label: 'Promociones (ZZ)', value: jsonData.DETALLE_CANTIDADES?.PROMO || 0 },
        { label: 'Cobros (BP)', value: jsonData.DETALLE_CANTIDADES?.COBRO || 0 },
        { label: 'Sin Confeccionar (ZY)', value: jsonData.DETALLE_CANTIDADES?.SIN_CONFECCIONAR || 0 }
    ];

    const confirmed = await showQuickConfirm(
        diferencia > 0 ? 'Unidades Faltantes' : 'Confirmar Guardado',
        diferencia > 0
            ? `Hay <strong>${diferencia} unidades faltantes</strong> en esta orden de producción.<br><br>Detalle de unidades procesadas:`
            : `La orden de producción está <strong>completa</strong> (sin unidades faltantes).<br><br>Detalle de unidades:`,
        diferencia > 0 ? 'Sí, Guardar' : 'Sí, Guardar',
        'Cancelar',
        diferencia > 0 ? 'warning' : 'success',
        tableData
    );

    const modalAbierto = document.querySelector('.modal');
    if (modalAbierto) {
        modalAbierto.remove();
    }

    if (!confirmed) return;

    const loading = showQuickLoading('Guardando en Google Sheets...');
    const saveBtn = document.getElementById('saveBtn');
    const saveBtnToolbar = document.getElementById('saveBtnToolbar');

    if (saveBtn) {
        saveBtn.disabled = true;
        saveBtn.innerHTML = '<span class="loading-spinner"></span> Guardando...';
    }
    if (saveBtnToolbar) {
        saveBtnToolbar.disabled = true;
        saveBtnToolbar.innerHTML = '<span class="loading-spinner"></span>';
    }

    try {
        const response = await saveOPToSheets(jsonData);

        if (response.success) {
            showMessage(
                diferencia > 0
                    ? `OP ${jsonData.A} guardada con ${diferencia} unidades faltantes`
                    : `OP ${jsonData.A} guardada correctamente (completa)`,
                diferencia > 0 ? 'warning' : 'success',
                3000
            );

            const reloadLoading = showQuickLoading('Recargando datos desde Google Sheets...');
            try {
                await loadDataFromSheets();
                if (fileInput.files.length > 0) {
                    updateStatus('Reprocesando CSV con datos actualizados...', 'loading');
                    setTimeout(() => processCSV(), 1000);
                }
                reloadLoading.close();
            } catch (reloadError) {
                reloadLoading.close();
                console.error('Error recargando datos:', reloadError);
                showMessage('OP guardada pero error al recargar datos', 'warning', 3000);
            }

            resetUIAfterSave();
            updateStatus(
                diferencia > 0
                    ? `OP ${jsonData.A} guardada con ${diferencia} unidades faltantes. Datos recargados.`
                    : `OP ${jsonData.A} guardada exitosamente. Datos recargados y CSV reprocesado.`,
                diferencia > 0 ? 'warning' : 'success'
            );
        } else {
            showMessage('Error al guardar: ' + response.message, 'error', 3000);
        }
    } catch (error) {
        showMessage('Error: ' + error.message, 'error', 3000);
    } finally {
        loading.close();
        if (saveBtn) {
            saveBtn.disabled = false;
            saveBtn.innerHTML = '<i class="codicon codicon-save"></i> Guardar en Sheets';
        }
        if (saveBtnToolbar) {
            saveBtnToolbar.disabled = false;
            saveBtnToolbar.innerHTML = '<i class="codicon codicon-cloud-upload"></i>';
        }
    }
}

function resetUIAfterSave() {
    document.getElementById('opForm').style.display = 'none';
    document.getElementById('selectOP').value = '';
    document.getElementById('auditor').value = '';
    document.getElementById('gestor').value = '';
    document.getElementById('bolsas').value = '0';
    document.getElementById('pvpEdit').value = '';
    document.getElementById('saveBtn').style.display = 'none';
    document.getElementById('jsonContent').textContent = '{\n  "mensaje": "Genera un JSON desde la pestaña de OPs Pendientes"\n}';
    hideEditor();
}

function adjustBolsas(amount) {
    const bolsasInput = document.getElementById('bolsas');
    let currentValue = parseInt(bolsasInput.value) || 0;
    currentValue += amount;
    if (currentValue < 0) currentValue = 0;
    bolsasInput.value = currentValue;
}

// ============================================
// FUNCIONES DE REFRESCO DE SELECTS
// ============================================

/**
 * Recarga las opciones dinámicas desde Google Sheets
 */
async function refreshDynamicOptions() {
    console.log('🔄 Recargando opciones dinámicas...');
    
    const loading = showQuickLoading('Recargando configuración...');
    
    try {
        await Promise.all([
            loadProveedoresData(),
            loadAuditoresData(),
            loadGestoresData()
        ]);
        
        loadAllDynamicOptions();
        showMessage('Configuración recargada correctamente', 'success', 2000);
    } catch (error) {
        console.error('Error recargando configuración:', error);
        showMessage('Error al recargar configuración', 'error', 3000);
    } finally {
        loading.close();
    }
}