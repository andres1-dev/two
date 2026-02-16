// ============================================
// CARGAR OPCIONES DINÁMICAS EN LOS SELECTS
// ============================================

/**
 * Carga las opciones de proveedores en el select
 * SOLO ESTE SELECT SELECCIONA EL PRIMER VALOR POR DEFECTO
 */
function loadProveedoresOptions() {
    const select = document.getElementById('proveedor');
    if (!select) return;

    const currentValue = select.value;

    select.innerHTML = '<option value="">Seleccione...</option>';

    const sortedProveedores = Array.from(proveedoresMap.entries())
        .sort((a, b) => a[1].localeCompare(b[1]));

    sortedProveedores.forEach(([codigo, nombre], index) => {
        const option = document.createElement('option');
        option.value = nombre;
        option.textContent = nombre;

        if (!currentValue && index === 0) {
            option.selected = true;
        } else if (nombre === currentValue) {
            option.selected = true;
        }

        select.appendChild(option);
    });

    console.log(`📋 Select de proveedores cargado con ${proveedoresMap.size} opciones`);
}

/**
 * Carga las opciones de auditores en el select - SIN SELECCIÓN AUTOMÁTICA
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
 * Carga las opciones de gestores en el select - SIN SELECCIÓN AUTOMÁTICA
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
 * NUEVO: Carga las opciones de usuarios/escaners en el select
 * Cargado desde escanersMap (hoja USUARIOS)
 */
function loadUsuariosOptions() {
    const select = document.getElementById('escanerEdit');
    if (!select) return;

    const currentValue = select.value;

    select.innerHTML = '';

    // Agregar opción por defecto
    const defaultOption = document.createElement('option');
    defaultOption.value = '';
    defaultOption.textContent = 'Seleccione un usuario...';
    select.appendChild(defaultOption);

    // Cargar desde el mapa dinámico de usuarios activos
    const sortedUsuarios = Array.from(escanersMap.entries())
        .sort((a, b) => a[1].localeCompare(b[1]));

    sortedUsuarios.forEach(([codigo, nombre]) => {
        const option = document.createElement('option');
        option.value = nombre; // Guardamos el nombre completo
        option.textContent = `${nombre}`; // Mostramos: NOMBRE
        option.dataset.codigo = codigo;

        // Si hay un valor actual y coincide, seleccionar
        if (nombre === currentValue) {
            option.selected = true;
        }

        select.appendChild(option);
    });

    console.log(`📋 Select de usuarios cargado con ${escanersMap.size} opciones`);
}

function loadAllDynamicOptions() {
    loadProveedoresOptions();
    loadAuditoresOptions();
    loadGestoresOptions();
    loadUsuariosOptions(); // NUEVO
}

// ============================================
// FUNCIONES PRINCIPALES DEL EDITOR
// ============================================

function loadOPData() {
    const selectOP = document.getElementById('selectOP');
    const selectedOption = selectOP.options[selectOP.selectedIndex];

    if (!selectedOption.value) return;

    const items = JSON.parse(selectedOption.dataset.items);
    setCurrentOPData(items);

    const primerItem = getRepresentativeItem(items);

    // Cargar PVP
    const pvpField = document.getElementById('pvpEdit');
    if (pvpField) pvpField.value = primerItem.PVP || '';

    // Limpiar selects de cabecera
    ['proveedor', 'auditor', 'gestor', 'escanerEdit'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = '';
    });

    // Cargar opciones dinámicas
    loadAllDynamicOptions();

    // NUEVO: Seleccionar el usuario del CSV en el select
    const escanerSelect = document.getElementById('escanerEdit');
    if (escanerSelect && primerItem.USUARIO) {
        // Buscar la opción que coincide con el nombre del usuario
        const options = Array.from(escanerSelect.options);
        const matchingOption = options.find(opt => opt.value === primerItem.USUARIO);

        if (matchingOption) {
            matchingOption.selected = true;
        } else {
            // Si no existe, crear opción temporal
            const tempOption = document.createElement('option');
            tempOption.value = primerItem.USUARIO;
            tempOption.textContent = `${primerItem.USUARIO} (del CSV)`;
            tempOption.selected = true;
            escanerSelect.appendChild(tempOption);
        }
    }

    const bolsasField = document.getElementById('bolsas');
    if (bolsasField) bolsasField.value = '0';

    loadOPEditor();
    switchToEditorTab();
    updateStatus(`Datos cargados para OP: ${primerItem.OP}`, 'success');
}

function loadOPEditor() {
    if (!currentOPData || currentOPData.length === 0) {
        hideEditor();
        return;
    }

    showEditor();
    updateEditorHeader();
    updateEditorStats();
    renderResumenBodegas();
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
                    <label style="font-size: 11px; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.5px;">Total OP</label>
                    <div style="font-weight: 600;">${primerItem.TOTAL || '0'} unds</div>
                </div>
            </div>
        `;
    }
}

// ============================================
// VISTA ÚNICA: RESUMEN POR BODEGA CON DETALLE EDITABLE
// ============================================

function renderResumenBodegas() {
    const tbody = document.getElementById('opEditorTableBody');
    if (!tbody) return;

    // Agrupar por bodega
    const resumen = {};
    currentOPData.forEach(item => {
        const bodega = item.BODEGA || 'SIN BODEGA';
        if (!resumen[bodega]) {
            resumen[bodega] = {
                bodega: bodega,
                cantidad: 0,
                costoTotal: 0,
                items: []
            };
        }
        resumen[bodega].cantidad += parseInt(item.CANTIDAD) || 0;
        resumen[bodega].costoTotal += (parseInt(item.CANTIDAD) || 0) * (parseFloat(item.COSTO) || 0);
        resumen[bodega].items.push(item);
    });

    // Ordenar: PRIMERAS, PROMOCIONES, COBROS, SIN CONFECCIONAR, resto
    const resumenArray = Object.values(resumen).sort((a, b) => {
        const orden = {
            'PRIMERAS': 1,
            'PROMOCIONES': 2,
            'COBROS': 3,
            'SIN CONFECCIONAR': 4
        };
        return (orden[a.bodega] || 99) - (orden[b.bodega] || 99);
    });

    tbody.innerHTML = resumenArray.map((grupo, index) => {
        // Color de fondo según bodega
        const bgColor = grupo.bodega === 'PRIMERAS' ? 'rgba(55, 162, 85, 0.08)' :
            grupo.bodega === 'PROMOCIONES' ? 'rgba(255, 193, 7, 0.08)' :
                grupo.bodega === 'COBROS' ? 'rgba(244, 71, 71, 0.08)' :
                    grupo.bodega === 'SIN CONFECCIONAR' ? 'rgba(0, 120, 212, 0.08)' : 'transparent';

        return `
            <tr class="resumen-row" data-bodega="${grupo.bodega}" data-index="${index}" 
                style="cursor: pointer; background-color: ${bgColor}; border-bottom: 2px solid var(--border); transition: background-color 0.2s;"
                onmouseover="this.style.backgroundColor='${bgColor.replace('0.08', '0.15')}'"
                onmouseout="this.style.backgroundColor='${bgColor}'">
                <td colspan="2" style="font-weight: 700; padding: 16px 12px;">
                    <i class="codicon codicon-chevron-right toggle-icon" id="toggle-icon-${index}" style="margin-right: 10px; font-size: 18px; transition: transform 0.2s;"></i>
                    <span style="text-transform: uppercase; font-size: 14px; letter-spacing: 0.5px;">${grupo.bodega}</span>
                    <span style="margin-left: 12px; font-size: 12px; color: var(--text-secondary); background: var(--sidebar); padding: 4px 10px; border-radius: 20px;">
                        ${grupo.items.length} ${grupo.items.length === 1 ? 'registro' : 'registros'}
                    </span>
                </td>
                <td></td>
                <td style="font-weight: 700; padding: 16px 12px; text-align: right; font-size: 15px;">
                    ${grupo.cantidad.toLocaleString('es-CO')}
                </td>
                <td style="font-weight: 700; padding: 16px 12px; text-align: right; font-size: 15px; color: var(--text);">
                    $ ${grupo.costoTotal.toLocaleString('es-CO')}
                </td>
                <td></td>
                <td></td>
            </tr>
            <tr id="detalle-${index}" class="detalle-row" style="display: none;">
                <td colspan="7" style="padding: 0;">
                    <div style="background-color: var(--editor); padding: 24px; border: 1px solid var(--border); border-radius: 8px; margin: 16px; box-shadow: 0 2px 8px rgba(0,0,0,0.05);">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                            <h5 style="margin: 0; font-size: 15px; color: var(--text); display: flex; align-items: center; gap: 10px;">
                                <span style="background: var(--primary); color: white; padding: 4px 12px; border-radius: 20px; font-size: 12px;">
                                    <i class="codicon codicon-edit" style="margin-right: 4px;"></i> EDITANDO
                                </span>
                                <span style="font-weight: 600;">${grupo.bodega}</span>
                            </h5>
                            <button class="btn-icon" onclick="window.colapsarDetalle('${index}')" 
                                    style="border: 1px solid var(--border); padding: 8px; border-radius: 6px; background: var(--sidebar);"
                                    title="Cerrar detalle">
                                <i class="codicon codicon-chevron-up"></i>
                            </button>
                        </div>
                        ${renderDetalleEditable(grupo.items)}
                    </div>
                </td>
            </tr>
        `;
    }).join('');

    // Agregar event listeners a las filas de resumen
    setTimeout(() => {
        document.querySelectorAll('.resumen-row').forEach((row, idx) => {
            row.removeEventListener('click', window.handleResumenClick);
            row.addEventListener('click', window.handleResumenClick);
        });
    }, 0);
}

/**
 * Renderiza la tabla de detalle COMPLETAMENTE EDITABLE
 */
function renderDetalleEditable(items) {
    return `
        <div style="overflow-x: auto; border-radius: 6px; border: 1px solid var(--border);">
            <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
                <thead>
                    <tr style="border-bottom: 2px solid var(--border); background-color: var(--sidebar);">
                        <th style="text-align: left; padding: 14px 12px; font-weight: 600; color: var(--text-secondary);">Talla</th>
                        <th style="text-align: left; padding: 14px 12px; font-weight: 600; color: var(--text-secondary);">Color</th>
                        <th style="text-align: left; padding: 14px 12px; font-weight: 600; color: var(--text-secondary);">Bodega</th>
                        <th style="text-align: right; padding: 14px 12px; font-weight: 600; color: var(--text-secondary);">Cantidad</th>
                        <th style="text-align: right; padding: 14px 12px; font-weight: 600; color: var(--text-secondary);">Costo Unit.</th>
                        <th style="text-align: left; padding: 14px 12px; font-weight: 600; color: var(--text-secondary);">Traslado</th>
                        <th style="text-align: center; padding: 14px 12px; font-weight: 600; color: var(--text-secondary);">Acciones</th>
                    </tr>
                </thead>
                <tbody>
                    ${items.map((item, itemIdx) => {
        const globalIndex = currentOPData.indexOf(item);
        const bodegaOptions = Object.keys(bodegasMap).map(code => {
            const name = bodegasMap[code];
            const isSelected = (item.BODEGA === name) || (item.BODEGA === code);
            return `<option value="${name}" ${isSelected ? 'selected' : ''}>${name}</option>`;
        }).join('');

        return `
                            <tr style="border-bottom: 1px solid var(--border);">
                                <td style="padding: 12px; font-weight: 500;">${item.TALLA}</td>
                                <td style="padding: 12px;">${item.COLORES || item.COD_COLOR}</td>
                                <td style="padding: 12px;">
                                    <select class="form-control" 
                                            style="padding: 8px; height: 38px; font-size: 13px; width: 170px; border-radius: 6px; border: 1px solid var(--border); background: var(--input-bg);" 
                                            onchange="window.handleEditorChange(${globalIndex}, 'BODEGA', this.value)">
                                        ${bodegaOptions}
                                    </select>
                                </td>
                                <td style="padding: 12px;">
                                    <input type="number" 
                                           class="form-control" 
                                           style="padding: 8px; height: 38px; width: 100px; text-align: right; border-radius: 6px; border: 1px solid var(--border); background: var(--input-bg);" 
                                           value="${item.CANTIDAD}" 
                                           min="0" 
                                           step="1"
                                           onchange="window.handleEditorChange(${globalIndex}, 'CANTIDAD', this.value)">
                                </td>
                                <td style="padding: 12px;">
                                    <input type="number" 
                                           class="form-control" 
                                           style="padding: 8px; height: 38px; width: 130px; text-align: right; border-radius: 6px; border: 1px solid var(--border); background: var(--input-bg);" 
                                           value="${item.COSTO}" 
                                           min="0" 
                                           step="1"
                                           onchange="window.handleEditorChange(${globalIndex}, 'COSTO', this.value)">
                                </td>
                                <td style="padding: 12px; font-family: monospace; font-size: 12px;">${item.TRASLADO}</td>
                                <td style="padding: 12px; text-align: center;">
                                    <button class="btn-icon" 
                                            style="color: #f44747; padding: 8px; border-radius: 6px; border: 1px solid var(--border); background: var(--sidebar);" 
                                            onclick="window.deleteEditorRow(${globalIndex})" 
                                            title="Eliminar fila">
                                        <i class="codicon codicon-trash" style="font-size: 16px;"></i>
                                    </button>
                                </td>
                            </tr>
                        `;
    }).join('')}
                </tbody>
            </table>
        </div>
    `;
}

// ============================================
// MANEJADORES DE EVENTOS
// ============================================

function handleResumenClick(e) {
    // Prevenir que clicks en botones, selects o inputs expandan/contraigan
    if (e.target.closest('button') || e.target.closest('select') || e.target.closest('input')) {
        e.stopPropagation();
        return;
    }

    const row = e.currentTarget;
    const index = row.dataset.index;
    toggleDetalle(index);
}

function toggleDetalle(index) {
    const detalleRow = document.getElementById(`detalle-${index}`);
    const icon = document.getElementById(`toggle-icon-${index}`);

    if (detalleRow) {
        if (detalleRow.style.display === 'none') {
            detalleRow.style.display = 'table-row';
            if (icon) icon.style.transform = 'rotate(90deg)';
        } else {
            detalleRow.style.display = 'none';
            if (icon) icon.style.transform = 'rotate(0deg)';
        }
    }
}

function colapsarDetalle(index) {
    const detalleRow = document.getElementById(`detalle-${index}`);
    const icon = document.getElementById(`toggle-icon-${index}`);

    if (detalleRow) {
        detalleRow.style.display = 'none';
        if (icon) icon.style.transform = 'rotate(0deg)';
    }
}

function expandirTodo() {
    document.querySelectorAll('[id^="detalle-"]').forEach((row) => {
        const match = row.id.match(/\d+$/);
        if (match) {
            row.style.display = 'table-row';
            const icon = document.getElementById(`toggle-icon-${match[0]}`);
            if (icon) icon.style.transform = 'rotate(90deg)';
        }
    });
}

function colapsarTodo() {
    document.querySelectorAll('[id^="detalle-"]').forEach((row) => {
        const match = row.id.match(/\d+$/);
        if (match) {
            row.style.display = 'none';
            const icon = document.getElementById(`toggle-icon-${match[0]}`);
            if (icon) icon.style.transform = 'rotate(0deg)';
        }
    });
}

// ============================================
// ACTUALIZAR ESTADÍSTICAS (TOTALES SUPERIORES)
// ============================================

function updateEditorStats() {
    if (!currentOPData) return;

    const totalUnits = currentOPData.reduce((sum, item) => sum + (parseInt(item.CANTIDAD) || 0), 0);
    const totalCost = currentOPData.reduce((sum, item) =>
        sum + ((parseInt(item.CANTIDAD) || 0) * (parseFloat(item.COSTO) || 0)), 0);

    const unitsEl = document.getElementById('editorTotalUnits');
    const costEl = document.getElementById('editorTotalCost');

    if (unitsEl) unitsEl.textContent = totalUnits.toLocaleString('es-CO');
    if (costEl) costEl.textContent = totalCost.toLocaleString('es-CO');
}

// ============================================
// MANEJADORES DE EDICIÓN
// ============================================

function handleEditorChange(index, field, value) {
    if (index >= 0 && index < currentOPData.length) {
        const item = currentOPData[index];

        if (field === 'CANTIDAD') {
            item.CANTIDAD = parseInt(value) || 0;
        } else if (field === 'COSTO') {
            item.COSTO = parseFloat(value) || 0;
        } else if (field === 'BODEGA') {
            item.BODEGA = value;
        }

        updateEditorStats();

        const expandedStates = {};
        document.querySelectorAll('[id^="detalle-"]').forEach((row) => {
            const match = row.id.match(/\d+$/);
            if (match) {
                expandedStates[match[0]] = row.style.display !== 'none';
            }
        });

        renderResumenBodegas();

        setTimeout(() => {
            Object.keys(expandedStates).forEach(index => {
                if (expandedStates[index]) {
                    const detalleRow = document.getElementById(`detalle-${index}`);
                    const icon = document.getElementById(`toggle-icon-${index}`);
                    if (detalleRow) detalleRow.style.display = 'table-row';
                    if (icon) icon.style.transform = 'rotate(90deg)';
                }
            });
        }, 0);
    }
}

function deleteEditorRow(index) {
    if (confirm('¿Estás seguro de eliminar este registro? Esta acción es irreversible para la sesión actual.')) {
        currentOPData.splice(index, 1);
        updateEditorStats();

        const expandedStates = {};
        document.querySelectorAll('[id^="detalle-"]').forEach((row) => {
            const match = row.id.match(/\d+$/);
            if (match) {
                expandedStates[match[0]] = row.style.display !== 'none';
            }
        });

        renderResumenBodegas();

        setTimeout(() => {
            Object.keys(expandedStates).forEach(index => {
                if (expandedStates[index]) {
                    const detalleRow = document.getElementById(`detalle-${index}`);
                    const icon = document.getElementById(`toggle-icon-${index}`);
                    if (detalleRow) detalleRow.style.display = 'table-row';
                    if (icon) icon.style.transform = 'rotate(90deg)';
                }
            });
        }, 0);
    }
}

// Helpers de cambio de pestaña movidos a tabs.js (global)

// ============================================
// AJUSTES DE CAMPOS
// ============================================

function adjustPVP(amount) {
    const pvpInput = document.getElementById('pvpEdit');
    let currentValue = parseInt(pvpInput.value.replace(/\./g, '')) || 0;
    currentValue += amount;
    if (currentValue < 0) currentValue = 0;
    pvpInput.value = currentValue.toLocaleString('es-CO');
}

function adjustBolsas(amount) {
    const bolsasInput = document.getElementById('bolsas');
    let currentValue = parseInt(bolsasInput.value) || 0;
    currentValue += amount;
    if (currentValue < 0) currentValue = 0;
    bolsasInput.value = currentValue;
}

// ============================================
// GENERACIÓN DE JSON
// ============================================

function generateJSONForOP() {
    if (!currentOPData || currentOPData.length === 0) {
        showMessage('No hay datos de OP cargados', 'error', 2000);
        return;
    }

    const proveedor = document.getElementById('proveedor').value;
    const auditor = document.getElementById('auditor').value;
    const gestor = document.getElementById('gestor').value;
    const escanerSelect = document.getElementById('escanerEdit');
    const escaner = escanerSelect ? escanerSelect.value : '';
    const bolsas = parseInt(document.getElementById('bolsas').value) || 0;
    const pvpEdit = document.getElementById('pvpEdit').value;

    if (!proveedor || !auditor || !gestor || !pvpEdit) {
        showMessage('Por favor complete todos los campos requeridos', 'error', 2000);
        return;
    }

    if (!escaner) {
        showMessage('Debe seleccionar un Usuario/Escaner', 'error', 2000);
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
            anexos.push({
                DOCUMENTO: item.REFERENCIA,
                TALLA: item.TALLA,
                COLOR: item.COLORES,
                TIPO: 'PROMO',
                CANTIDAD: item.CANTIDAD,
                COSTO_UNITARIO: costoUnitario,
                COSTO_TOTAL: costoTOTAL,
                BODEGA: item.BODEGA,
                TRASLADO: item.TRASLADO
            });
        }
        else if (item.BODEGA === 'COBROS') {
            cantidadCobros += item.CANTIDAD;
            anexos.push({
                DOCUMENTO: item.REFERENCIA,
                TALLA: item.TALLA,
                COLOR: item.COLORES,
                TIPO: 'COBRO',
                CANTIDAD: item.CANTIDAD,
                COSTO_UNITARIO: costoUnitario,
                COSTO_TOTAL: costoTOTAL,
                BODEGA: item.BODEGA,
                TRASLADO: item.TRASLADO
            });
        }
        else if (item.BODEGA === 'SIN CONFECCIONAR') {
            cantidadSinConfeccionar += item.CANTIDAD;
            anexos.push({
                DOCUMENTO: item.REFERENCIA,
                TALLA: item.TALLA,
                COLOR: item.COLORES,
                TIPO: 'SIN_CONFECCIONAR',
                CANTIDAD: item.CANTIDAD,
                COSTO_UNITARIO: costoUnitario,
                COSTO_TOTAL: costoTOTAL,
                BODEGA: item.BODEGA,
                TRASLADO: item.TRASLADO
            });
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
        "ESCANER": escaner,
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

    // Mostrar y expandir el visor JSON integrado
    showJsonViewer();
    showMessage(`JSON generado exitosamente para OP: ${primerItem.OP}`, 'success', 2000);
}

function generateJSONFromEditor() {
    const proveedor = document.getElementById('proveedor').value;
    const auditor = document.getElementById('auditor').value;
    const gestor = document.getElementById('gestor').value;
    const escanerSelect = document.getElementById('escanerEdit');
    const escaner = escanerSelect ? escanerSelect.value : '';
    const pvpEdit = document.getElementById('pvpEdit').value;

    if (!proveedor || !auditor || !gestor || !pvpEdit) {
        showMessage('Por favor complete la información de cabecera', 'warning', 4000);
        return;
    }

    if (!escaner) {
        showMessage('Debe seleccionar un Usuario/Escaner', 'warning', 4000);
        return;
    }

    generateJSONForOP();
}

// ============================================
// GUARDAR EN SHEETS
// ============================================

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
            try {
                // Notificar éxito del guardado
                showMessage(`OP ${jsonData.A} guardada exitosamente`, 'success', 2000);

                // OPTIMIZACIÓN: Añadir manualmente al mapa local para que el re-procesamiento inmediato la vea como CONFIRMADA
                if (typeof data2Map !== 'undefined' && jsonData.A) {
                    data2Map.set(jsonData.A.toString().trim(), true);
                }

                // Recargar datos en segundo plano (silenciosamente)
                await loadDataFromSheets(true);

                updateStatus('Reprocesando CSV...', 'loading');
                await processCSV();
            } catch (reloadError) {
                console.error('Error recargando datos:', reloadError);
                showMessage('OP guardada pero error al recargar datos locales', 'warning', 3000);
            }

            resetUIAfterSave();
            switchToPendingOpsTab();

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
    document.getElementById('escanerEdit').innerHTML = '<option value="">Seleccione un usuario...</option>';
    document.getElementById('bolsas').value = '0';
    document.getElementById('pvpEdit').value = '';
    document.getElementById('saveBtn').style.display = 'none';
    document.getElementById('jsonContent').textContent = '{\n  "mensaje": "Genera un JSON desde el Editor OP"\n}';
    collapseJsonViewer();
    hideEditor();
}

// ============================================
// REFRESCAR OPCIONES DINÁMICAS
// ============================================

async function refreshDynamicOptions() {
    console.log('🔄 Recargando opciones dinámicas...');

    const loading = showQuickLoading('Recargando configuración...');

    try {
        // Cargar datos silenciosamente para evitar doble notificación
        await loadDataFromSheets(true);
        showMessage('Configuración recargada correctamente', 'success', 2000);
    } catch (error) {
        console.error('Error recargando configuración:', error);
        showMessage('Error al recargar configuración', 'error', 3000);
    } finally {
        loading.close();
    }
}

// ============================================
// EXPONER FUNCIONES GLOBALMENTE
// ============================================

window.handleEditorChange = handleEditorChange;
window.deleteEditorRow = deleteEditorRow;
window.toggleDetalle = toggleDetalle;
window.colapsarDetalle = colapsarDetalle;
window.expandirTodo = expandirTodo;
window.colapsarTodo = colapsarTodo;
window.handleResumenClick = handleResumenClick;
window.refreshDynamicOptions = refreshDynamicOptions;
window.loadAllDynamicOptions = loadAllDynamicOptions;
window.loadUsuariosOptions = loadUsuariosOptions;