// Configuración
const API_KEY = 'AIzaSyC7hjbRc0TGLgImv8gVZg8tsOeYWgXlPcM';
const SPREADSHEET_IDS = {
    DATA2: "133NiyjNApZGkEFs4jUvpJ9So-cSEzRVeW2FblwOCrjI",
    REC: "1esc5REq0c03nHLpGcLwZRW29yq2gZnrpbz75gCCjrqc",
    DISTRIBUCION: "1d5dCCCgiWXfM6vHu3zGGKlvK2EycJtT7Uk4JqUjDOfE",
    SOPORTES: "1VaPBwgRu1QWhmsV_Qgf7cgraSxiAWRX6-wBEyUlGoJw",
    DESTINO: "1EDZ3uRjIDe2oi9F88qBNjHxuy5_S1Se4IwIDlS4EsZE",
    SIESA: "1FcQhVIKtWy4O-aGTNfA6l4C5Q4_u1LZErpj3CMglfQM"
};

// URLs de Web Apps
const WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbyk5SZiTTJm6GYXEe5RWvvmihHALfnKD6m95gfrZ2D-om2Tu3Hyuz-nsPMc-r46sUdg/exec';
const WEB_APP_SEMANAS_URL = 'https://script.google.com/macros/s/AKfycbwM-E3tv2Yt2cl20k3-Ss_dQKwWo8G4YoNzLm1OfnQNTE9lY-XUsuKyflCavcN3RTg7hQ/exec'; // Reemplazar con tu URL real

// Filtros predeterminados
const DEFAULT_FILTERS = {
    fechaInicio: '',
    fechaFin: '',
    tiposDocumento: ['FULL'],
    fuentesDatos: ['SISPRO', 'BUSINT'],
    clientes: ['900047252', '805027653'],
    proveedores: ['ANGELES', 'UNIVERSO'],
    estados: ['ENTREGADO', 'PENDIENTE', 'VALIDAR', 'SIN DATOS'],
    clases: ['LINEA', 'MODA', 'PRONTAMODA']
};

// Definición de clientes
const CLIENTES = [
    { nombre: "INVERSIONES URBANA SAS", nit: "901920844" },
    { nombre: "EL TEMPLO DE LA MODA FRESCA SAS", nit: "900047252" },
    { nombre: "EL TEMPLO DE LA MODA SAS", nit: "805027653" },
    { nombre: "ARISTIZABAL LOPEZ JESUS MARIA", nit: "70825517" },
    { nombre: "ZULUAGA GOMEZ RUBEN ESTEBAN", nit: "1007348825" },
    { nombre: "QUINTERO ORTIZ JOSE ALEXANDER", nit: "14838951" },
    { nombre: "QUINTERO ORTIZ PATRICIA YAMILET", nit: "67006141" }
];

// Mapeo de nombres SIESA a NITs unificados
const MAPEO_NOMBRES_SIESA = {
    "ARISTIZABAL LOPEZ JESUS MARIA": "70825517",
    "EL TEMPLO DE LA MODA FRESCA S.A.S.": "900047252",
    "EL TEMPLO DE LA MODA FRESCA SAS": "900047252",
    "EL TEMPLO DE LA MODA S.A.S.": "805027653",
    "EL TEMPLO DE LA MODA SAS": "805027653",
    "INVERSIONES URBANA S.A.S": "901920844",
    "INVERSIONES URBANA SAS": "901920844",
    "QUINTERO ORTIZ JOSE ALEXANDER": "14838951",
    "QUINTERO ORTIZ PATRICIA YAMILET": "67006141",
    "ZULUAGA GOMEZ RUBEN ESTEBAN": "1007348825"
};

// Variables globales
let currentData = [];
let semanasData = {};
let currentFilters = { ...DEFAULT_FILTERS };
let registrosSinSemanas = [];
let registrosFiltrados = [];

// Elementos DOM
const loadDataBtn = document.getElementById('loadDataBtn');
const exportCSVBtn = document.getElementById('exportCSVBtn');
const exportSinSemanasBtn = document.getElementById('exportSinSemanasBtn');
const enviarPostBtn = document.getElementById('enviarPostBtn');
const asignarSemanasBtn = document.getElementById('asignarSemanasBtn');
const statusMessage = document.getElementById('statusMessage');
const loadingElement = document.getElementById('loading');
const summaryElement = document.getElementById('summary');

// Inicialización
document.addEventListener('DOMContentLoaded', function() {
    // Ocultar botón de cargar datos inicialmente
    loadDataBtn.style.display = 'none';
    
    // Establecer fechas por defecto (último mes)
    const rangoFechas = calcularRangoFechas();
    currentFilters.fechaInicio = rangoFechas.fechaInicio;
    currentFilters.fechaFin = rangoFechas.fechaFin;
    
    // Event Listeners
    loadDataBtn.addEventListener('click', loadData);
    exportCSVBtn.addEventListener('click', exportCSV);
    exportSinSemanasBtn.addEventListener('click', exportSinSemanas);
    enviarPostBtn.addEventListener('click', enviarDatosPost);
    asignarSemanasBtn.addEventListener('click', mostrarModalSemanas);
    
    // Event Listeners del modal
    document.querySelector('.close').addEventListener('click', cerrarModal);
    
    // Cerrar modal al hacer click fuera
    window.addEventListener('click', function(event) {
        if (event.target === document.getElementById('semanasModal')) {
            cerrarModal();
        }
    });
    
    // Cargar datos automáticamente al iniciar
    setTimeout(() => {
        loadData();
    }, 0);
});

// Funciones principales
async function loadData() {
    try {
        showLoading(true);
        showStatus('info', 'Iniciando carga de datos...');
        
        await cargarDatosSemanas();
        const data = await obtenerDatosConDistribucion();
        currentData = data.data;
        
        showStatus('success', `Proceso completado: ${data.registros} registros encontrados`);
        displaySummary(data);
        
        // Mostrar botones incluyendo el de recargar datos
        loadDataBtn.style.display = 'inline-block';
        exportCSVBtn.style.display = 'inline-block';
        exportSinSemanasBtn.style.display = 'inline-block';
        enviarPostBtn.style.display = 'inline-block';
        asignarSemanasBtn.style.display = 'inline-block';
        
    } catch (error) {
        console.error('Error:', error);
        showStatus('error', `Error: ${error.message}`);
    } finally {
        showLoading(false);
    }
}

function mostrarModalSemanas() {
    if (currentData.length === 0) {
        showStatus('error', 'No hay datos cargados');
        return;
    }
    
    // Filtrar registros sin semanas DESDE CURRENTDATA ACTUALIZADO
    registrosSinSemanas = currentData.filter(registro => 
        !registro.SEMANAS || registro.SEMANAS === ""
    );
    
    if (registrosSinSemanas.length === 0) {
        showStatus('info', 'No hay registros sin asignación de semanas');
        return;
    }
    
    // Actualizar contadores
    document.getElementById('countSinSemanas').textContent = registrosSinSemanas.length;
    
    // Obtener clientes únicos
    const clientesUnicos = [...new Set(registrosSinSemanas.map(r => r.CLIENTE))].sort();
    
    document.getElementById('countClientes').textContent = clientesUnicos.length;
    
    // Llenar select de filtro de cliente
    const selectCliente = document.getElementById('filtroCliente');
    selectCliente.innerHTML = '<option value="">Todos los clientes</option>';
    
    clientesUnicos.forEach(cliente => {
        const option = document.createElement('option');
        option.value = cliente;
        option.textContent = cliente;
        selectCliente.appendChild(option);
    });
    
    // Configurar event listeners del modal
    configurarEventListenersModal();
    
    // Mostrar todos los registros inicialmente
    registrosFiltrados = [...registrosSinSemanas];
    actualizarListaRegistros();
    
    // Mostrar modal
    document.getElementById('semanasModal').style.display = 'block';
}

function configurarEventListenersModal() {
    // Limpiar event listeners anteriores
    const selectCliente = document.getElementById('filtroCliente');
    const nuevoSelect = selectCliente.cloneNode(true);
    selectCliente.parentNode.replaceChild(nuevoSelect, selectCliente);
    
    const guardarBtn = document.getElementById('guardarSemanas');
    const nuevoGuardarBtn = guardarBtn.cloneNode(true);
    guardarBtn.parentNode.replaceChild(nuevoGuardarBtn, guardarBtn);
    
    // Configurar nuevos event listeners
    document.getElementById('filtroCliente').addEventListener('change', aplicarFiltroSemanas);
    document.getElementById('guardarSemanas').addEventListener('click', guardarSemanasEnSheets);
}

function aplicarFiltroSemanas() {
    const clienteFiltro = document.getElementById('filtroCliente').value;
    
    // Usar la variable actualizada registrosSinSemanas
    registrosFiltrados = registrosSinSemanas.filter(registro => {
        return !clienteFiltro || registro.CLIENTE === clienteFiltro;
    });
    
    actualizarListaRegistros();
}

function aplicarSemanasMasivas() {
    const semanasInput = document.getElementById('semanasBulkInput').value.trim();
    
    if (!semanasInput) {
        showStatus('error', 'Por favor ingresa las semanas para asignación masiva');
        return;
    }
    
    if (registrosFiltrados.length === 0) {
        showStatus('error', 'No hay registros filtrados para asignar semanas');
        return;
    }
    
    // Aplicar a todos los registros filtrados
    registrosFiltrados.forEach(registro => {
        registro.SEMANAS_ASIGNADAS = semanasInput;
    });
    
    // Actualizar la vista
    actualizarListaRegistros();
    
    showStatus('success', `Semanas aplicadas a ${registrosFiltrados.length} registros`);
    
    // Limpiar el input
    document.getElementById('semanasBulkInput').value = '';
}

function actualizarListaRegistros() {
    const lista = document.getElementById('listaRegistros');
    lista.innerHTML = '';
    
    if (registrosFiltrados.length === 0) {
        lista.innerHTML = `
            <div style="text-align: center; padding: 40px; color: #6b7280;">
                <i class="fas fa-inbox" style="font-size: 48px; margin-bottom: 16px;"></i>
                <p>No hay registros que coincidan con el filtro</p>
            </div>
        `;
        return;
    }
    
    registrosFiltrados.forEach((registro, index) => {
        const item = document.createElement('div');
        item.className = 'registro-item';
        item.dataset.index = index;
        
        item.innerHTML = `
            <div class="registro-cliente">${registro.CLIENTE}</div>
            <div class="registro-referencia">${registro.REFERENCIA}</div>
            <div class="registro-cantidad">${registro.CANTIDAD}</div>
            <div class="registro-semanas">
                <input type="number" 
                       class="registro-semanas-input" 
                       placeholder="1-52"
                       min="1"
                       max="52"
                       value="${registro.SEMANAS_ASIGNADAS || ''}"
                       onchange="actualizarSemanasRegistro(${index}, this.value)"
                       onblur="actualizarSemanasRegistro(${index}, this.value)">
            </div>
        `;
        
        lista.appendChild(item);
    });
}

function validarInputSemanas(input) {
    // Permitir solo números, guiones, comas y espacios
    input.value = input.value.replace(/[^\d\-, ]/g, '');
    
    // Obtener el índice del registro
    const registroItem = input.closest('.registro-item');
    if (registroItem) {
        const index = parseInt(registroItem.dataset.index);
        // Actualizar automáticamente al escribir
        actualizarSemanasRegistro(index, input.value);
    }
}

async function cargarDatosSemanas() {
    try {
        showStatus('info', 'Cargando datos de semanas...');
        const semanasResp = await fetchSheetData(SPREADSHEET_IDS.DESTINO, "PW!A:D");
        
        semanasData = {};
        
        (semanasResp.values || []).forEach(row => {
            if (row.length >= 4) {
                const referencia = String(row[0] || "").trim();
                const cliente = String(row[1] || "").trim();
                const semanas = String(row[3] || "").trim();
                
                if (referencia && cliente && semanas) {
                    const clave = `${referencia}_${cliente}`;
                    semanasData[clave] = semanas;
                    
                    if (!semanasData[referencia]) {
                        semanasData[referencia] = semanas;
                    }
                }
            }
        });
        
        console.log(`Datos de semanas cargados: ${Object.keys(semanasData).length} registros`);
        
    } catch (error) {
        console.error("Error cargando datos de semanas:", error);
        showStatus('info', 'Continuando sin datos de semanas...');
    }
}

async function obtenerDatosConDistribucion() {
    const rangoFechas = {
        fechaInicio: currentFilters.fechaInicio,
        fechaFin: currentFilters.fechaFin,
        descripcion: `Desde ${currentFilters.fechaInicio} hasta ${currentFilters.fechaFin}`
    };
    
    const distribucionData = await obtenerDatosDistribucion();
    const soportesData = await obtenerDatosSoportes();
    const siesaData = await obtenerDatosSIESA();
    
    const registros = [];

    // Procesar DATA2
    const data2Resp = await fetchSheetData(SPREADSHEET_IDS.DATA2, "DATA2!S2:S");
    (data2Resp.values || []).forEach(r => {
        try {
            const j = JSON.parse(r[0]);
            const tipo = j.TIPO || "";
            
            // Aplicar filtro de tipo
            if (!currentFilters.tiposDocumento.includes(tipo.toUpperCase())) return;
            
            const fecha = normalizeDate(j.FECHA || "");
            if (!estaDentroDelRango(fecha, rangoFechas)) return;
            
            const pvp = parseFloat(normalizePVP(j.PVP || ""));
            const linea = normalizeLinea(j.LINEA || "");
            const documento = "REC" + normalizeDocumento(j.A || "");
            const lote = Number(j.LOTE) || 0;
            const referencia = j.REFERENCIA || "";
            const refprov = String(j.REFPROV || "");
            
            const distribucionDoc = distribucionData[documento];
            
            if (distribucionDoc && distribucionDoc.clientes) {
                for (const [nombreCliente, infoCliente] of Object.entries(distribucionDoc.clientes)) {
                    if (infoCliente.cantidad_total > 0 && currentFilters.clientes.includes(infoCliente.nit)) {
                        
                        const soporteInfo = buscarSoporte(soportesData, documento, infoCliente.cantidad_total, infoCliente.nit);
                        const siesaInfo = buscarSiesa(siesaData, refprov, infoCliente.nit, infoCliente.cantidad_total, lote);
                        const estado = calcularEstado(
                            soporteInfo ? soporteInfo.factura : "", 
                            siesaInfo ? siesaInfo.nro_documento : ""
                        );
                        
                        // Aplicar filtro de estado
                        if (!currentFilters.estados.includes(estado)) return;
                        
                        const semanas = obtenerSemanasPorReferenciaYCliente(referencia, nombreCliente);
                        const key = `${documento}-${infoCliente.nit}`;
                        const validacion = calcularValidacion(lote, siesaInfo ? siesaInfo.lote : "");
                        
                        // Aplicar filtro de clase
                        const clase = getClaseByPVP(pvp);
                        if (!currentFilters.clases.includes(clase)) return;
                        
                        // Aplicar filtro de proveedor
                        const proveedor = getProveedorByLinea(linea);
                        const proveedorFiltro = proveedor.includes("ANGELES") ? "ANGELES" : "UNIVERSO";
                        if (!currentFilters.proveedores.includes(proveedorFiltro)) return;
                        
                        registros.push({
                            DOCUMENTO: documento,
                            FECHA: fecha,
                            LOTE: lote,
                            REFPROV: refprov,
                            DESCRIPCION: j.DESCRIPCIÓN || "",
                            REFERENCIA: referencia,
                            TIPO: tipo,
                            PVP: pvp,
                            PRENDA: j.PRENDA || "",
                            GENERO: j.GENERO || "",
                            PROVEEDOR: proveedor,
                            CLASE: clase, 
                            FUENTE: "SISPRO",
                            NIT: infoCliente.nit,
                            CLIENTE: nombreCliente,
                            CANTIDAD: infoCliente.cantidad_total,
                            FACTURA: soporteInfo ? soporteInfo.factura : "",
                            URL_IH3: soporteInfo ? soporteInfo.url_ih3 : "",
                            SIESA_ESTADO: siesaInfo ? siesaInfo.estado : "",
                            SIESA_NRO_DOCUMENTO: siesaInfo ? siesaInfo.nro_documento : "",
                            SIESA_FECHA: siesaInfo ? siesaInfo.fecha : "",
                            SIESA_CANTIDAD_INV: siesaInfo ? siesaInfo.cantidad_inv : 0,
                            SIESA_LOTE: siesaInfo ? siesaInfo.lote : "",
                            ESTADO: estado,
                            SEMANAS: semanas,
                            KEY: key,
                            VALIDACION: validacion
                        });
                    }
                }
            }
        } catch (e) {
            // Ignorar registros con error
        }
    });

    // Procesar REC
    const recResp = await fetchSheetData(SPREADSHEET_IDS.REC, "DataBase!A2:AF");
    (recResp.values || []).forEach(row => {
        const tipo = row[27] || "";
        
        // Aplicar filtro de tipo
        if (!currentFilters.tiposDocumento.includes(tipo.toUpperCase())) return;
        
        const cantidad = Number(row[18]) || 0;
        if (cantidad <= 0) return;
        
        const fecha = normalizeDate(row[1] || "");
        if (!estaDentroDelRango(fecha, rangoFechas)) return;
        
        const pvp = parseFloat(normalizePVP(row[31] || ""));
        const linea = normalizeLinea(row[3] || "");
        const documento = "REC" + normalizeDocumento(String(row[0] || ""));
        const lote = Number(row[8]) || 0;
        const referencia = row[26] || "";
        const refprov = String(row[6] || "");
        
        const distribucionDoc = distribucionData[documento];
        
        if (distribucionDoc && distribucionDoc.clientes) {
            for (const [nombreCliente, infoCliente] of Object.entries(distribucionDoc.clientes)) {
                if (infoCliente.cantidad_total > 0 && currentFilters.clientes.includes(infoCliente.nit)) {
                    
                    const soporteInfo = buscarSoporte(soportesData, documento, infoCliente.cantidad_total, infoCliente.nit);
                    const siesaInfo = buscarSiesa(siesaData, refprov, infoCliente.nit, infoCliente.cantidad_total, lote);
                    const estado = calcularEstado(
                        soporteInfo ? soporteInfo.factura : "", 
                        siesaInfo ? siesaInfo.nro_documento : ""
                    );
                    
                    // Aplicar filtro de estado
                    if (!currentFilters.estados.includes(estado)) return;
                    
                    const semanas = obtenerSemanasPorReferenciaYCliente(referencia, nombreCliente);
                    const key = `${documento}-${infoCliente.nit}`;
                    const validacion = calcularValidacion(lote, siesaInfo ? siesaInfo.lote : "");
                    
                    // Aplicar filtro de clase
                    const clase = getClaseByPVP(pvp);
                    if (!currentFilters.clases.includes(clase)) return;
                    
                    // Aplicar filtro de proveedor
                    const proveedor = getProveedorByLinea(linea);
                    const proveedorFiltro = proveedor.includes("ANGELES") ? "ANGELES" : "UNIVERSO";
                    if (!currentFilters.proveedores.includes(proveedorFiltro)) return;
                    
                    // Aplicar filtro de fuente
                    if (!currentFilters.fuentesDatos.includes("BUSINT")) return;
                    
                    registros.push({
                        DOCUMENTO: documento,
                        FECHA: fecha,
                        LOTE: lote,
                        REFPROV: refprov,
                        DESCRIPCION: row[9] || "",
                        REFERENCIA: referencia,
                        TIPO: tipo,
                        PVP: pvp,
                        PRENDA: row[29] || "",
                        GENERO: row[30] || "",
                        PROVEEDOR: proveedor,
                        CLASE: clase,
                        FUENTE: "BUSINT",
                        NIT: infoCliente.nit,
                        CLIENTE: nombreCliente,
                        CANTIDAD: infoCliente.cantidad_total,
                        FACTURA: soporteInfo ? soporteInfo.factura : "",
                        URL_IH3: soporteInfo ? soporteInfo.url_ih3 : "",
                        SIESA_ESTADO: siesaInfo ? siesaInfo.estado : "",
                        SIESA_NRO_DOCUMENTO: siesaInfo ? siesaInfo.nro_documento : "",
                        SIESA_FECHA: siesaInfo ? siesaInfo.fecha : "",
                        SIESA_CANTIDAD_INV: siesaInfo ? siesaInfo.cantidad_inv : 0,
                        SIESA_LOTE: siesaInfo ? siesaInfo.lote : "",
                        ESTADO: estado,
                        SEMANAS: semanas,
                        KEY: key,
                        VALIDACION: validacion
                    });
                }
            }
        }
    });

    return {
        status: "success",
        registros: registros.length,
        rangoFechas: rangoFechas,
        data: registros
    };
}

// Funciones de exportación
function exportCSV() {
    if (currentData.length === 0) {
        showStatus('error', 'No hay datos para exportar');
        return;
    }

    showStatus('info', 'Generando archivo CSV completo...');
    generarYDescargarCSV(currentData, 'completo');
}

function exportSinSemanas() {
    if (currentData.length === 0) {
        showStatus('error', 'No hay datos para exportar');
        return;
    }

    // Filtrar datos que NO tienen semanas asignadas
    const datosSinSemanas = currentData.filter(registro => !registro.SEMANAS || registro.SEMANAS === "");
    
    if (datosSinSemanas.length === 0) {
        showStatus('info', 'No hay registros sin asignación de semanas');
        return;
    }

    showStatus('info', `Generando CSV con ${datosSinSemanas.length} registros sin semanas...`);
    generarYDescargarCSV(datosSinSemanas, 'sin_semanas');
}

function generarYDescargarCSV(datos, tipo) {
    const headers = [
        'DOCUMENTO', 'FECHA', 'LOTE', 'REFPROV', 'DESCRIPCION', 'REFERENCIA', 
        'TIPO', 'PVP', 'PRENDA', 'GENERO', 'PROVEEDOR', 'CLASE', 'FUENTE', 
        'NIT', 'CLIENTE', 'CANTIDAD', 'FACTURA', 'URL_IH3', 'SIESA_ESTADO', 
        'SIESA_NRO_DOCUMENTO', 'SIESA_FECHA', 'SIESA_CANTIDAD_INV', 'ESTADO', 
        'SEMANAS', 'KEY', 'VALIDACION', 'SIESA_LOTE'
    ];

    const csvContent = [
        '\uFEFF' + headers.join(';'),
        ...datos.map(registro => [
            registro.DOCUMENTO,
            registro.FECHA,
            registro.LOTE,
            registro.REFPROV,
            limpiarTextoCSV(registro.DESCRIPCION || ''),
            registro.REFERENCIA,
            registro.TIPO,
            formatoNumeroExcel(registro.PVP),
            registro.PRENDA,
            registro.GENERO,
            registro.PROVEEDOR,
            registro.CLASE,
            registro.FUENTE,
            registro.NIT,
            limpiarTextoCSV(registro.CLIENTE || ''),
            registro.CANTIDAD,
            registro.FACTURA,
            registro.URL_IH3,
            registro.SIESA_ESTADO,
            registro.SIESA_NRO_DOCUMENTO,
            registro.SIESA_FECHA,
            registro.SIESA_CANTIDAD_INV,
            registro.ESTADO,
            registro.SEMANAS,
            registro.KEY,
            registro.VALIDACION ? 'VERDADERO' : 'FALSO',
            registro.SIESA_LOTE
        ].join(';'))
    ].join('\r\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    const fecha = new Date().toISOString().split('T')[0];
    const nombreArchivo = tipo === 'sin_semanas' 
        ? `datos_sin_semanas_${fecha}.csv` 
        : `datos_completo_${fecha}.csv`;
        
    link.setAttribute('href', url);
    link.setAttribute('download', nombreArchivo);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    showStatus('success', `Archivo ${tipo === 'sin_semanas' ? 'sin semanas' : 'completo'} generado correctamente`);
}

function actualizarSemanasRegistro(index, semanas) {
    if (registrosFiltrados[index]) {
        // Convertir a número y validar
        const numeroSemanas = parseInt(semanas);
        
        // Asignar automáticamente si es un número válido entre 1 y 52
        if (!isNaN(numeroSemanas) && numeroSemanas >= 1 && numeroSemanas <= 52) {
            registrosFiltrados[index].SEMANAS_ASIGNADAS = numeroSemanas.toString();
        } else {
            // Si no es válido, eliminar la asignación
            delete registrosFiltrados[index].SEMANAS_ASIGNADAS;
        }
        
        // Actualizar visualmente el input
        const input = document.querySelector(`.registro-item[data-index="${index}"] .registro-semanas-input`);
        if (input) {
            if (registrosFiltrados[index].SEMANAS_ASIGNADAS) {
                input.classList.add('assigned');
                input.value = registrosFiltrados[index].SEMANAS_ASIGNADAS;
            } else {
                input.classList.remove('assigned');
                input.value = ''; // Limpiar completamente si no es válido
            }
        }
    }
}

async function guardarSemanasEnSheets() {
    // Recolectar todos los registros que tienen semanas asignadas
    const todosRegistrosConSemanas = [];
    
    // Revisar todos los registros sin semanas (no solo los filtrados)
    registrosSinSemanas.forEach(registro => {
        if (registro.SEMANAS_ASIGNADAS && registro.SEMANAS_ASIGNADAS.trim()) {
            todosRegistrosConSemanas.push(registro);
        }
    });
    
    if (todosRegistrosConSemanas.length === 0) {
        showStatus('error', 'No hay semanas asignadas para guardar');
        return;
    }
    
    showLoading(true);
    showStatus('info', `Guardando ${todosRegistrosConSemanas.length} registros en Sheets...`);
    
    try {
        // Preparar datos para enviar
        const datosParaEnviar = todosRegistrosConSemanas.map(registro => ({
            CLIENTE: String(registro.CLIENTE || '').trim(),
            REFERENCIA: String(registro.REFERENCIA || '').trim(),
            SEMANAS: String(registro.SEMANAS_ASIGNADAS || '').trim()
        })).filter(dato => dato.CLIENTE && dato.REFERENCIA && dato.SEMANAS);
        
        console.log('Datos a enviar a POSTMAN:', datosParaEnviar);
        
        if (datosParaEnviar.length === 0) {
            showStatus('error', 'No hay datos válidos para guardar');
            showLoading(false);
            return;
        }
        
        // Enviar via POST
        const formData = new FormData();
        formData.append('action', 'guardarSemanas');
        formData.append('datos', JSON.stringify(datosParaEnviar));

        const response = await fetch(WEB_APP_SEMANAS_URL, {
            method: 'POST',
            body: formData
        });

        const result = await response.json();
        console.log('Respuesta del servidor de semanas:', result);

        if (result.success) {
            showStatus('success', `✓ ${result.message}`);
            
            // ACTUALIZACIÓN EN TIEMPO REAL - SIN CERRAR MODAL
            await actualizarDatosEnTiempoReal(todosRegistrosConSemanas);
            
        } else {
            showStatus('error', `✗ Error: ${result.message}`);
        }
        
    } catch (error) {
        console.error('Error guardando semanas:', error);
        showStatus('error', `Error de conexión: ${error.message}`);
    } finally {
        showLoading(false);
    }
}

// Nueva función para actualizar datos en tiempo real
async function actualizarDatosEnTiempoReal(registrosActualizados) {
    try {
        // 1. Recargar datos de semanas desde Sheets para obtener los más recientes
        await cargarDatosSemanas();
        
        // 2. Actualizar currentData con las semanas asignadas
        registrosActualizados.forEach(registroActualizado => {
            // Buscar y actualizar en currentData
            const indexInCurrentData = currentData.findIndex(r => 
                r.CLIENTE === registroActualizado.CLIENTE && 
                r.REFERENCIA === registroActualizado.REFERENCIA &&
                r.DOCUMENTO === registroActualizado.DOCUMENTO
            );
            
            if (indexInCurrentData !== -1 && registroActualizado.SEMANAS_ASIGNADAS) {
                currentData[indexInCurrentData].SEMANAS = registroActualizado.SEMANAS_ASIGNADAS;
            }
        });
        
        // 3. ACTUALIZAR CRÍTICO: Re-filtrar los registros sin semanas desde currentData
        registrosSinSemanas = currentData.filter(registro => 
            !registro.SEMANAS || registro.SEMANAS === ""
        );
        
        console.log(`Registros actualizados. Quedan ${registrosSinSemanas.length} sin semanas`);
        
        // 4. Actualizar contadores en tiempo real
        document.getElementById('countSinSemanas').textContent = registrosSinSemanas.length;
        
        // 5. Actualizar clientes únicos
        const clientesUnicos = [...new Set(registrosSinSemanas.map(r => r.CLIENTE))].sort();
        document.getElementById('countClientes').textContent = clientesUnicos.length;
        
        // 6. Actualizar select de filtro de cliente
        const selectCliente = document.getElementById('filtroCliente');
        const clienteSeleccionado = selectCliente.value;
        selectCliente.innerHTML = '<option value="">Todos los clientes</option>';
        
        clientesUnicos.forEach(cliente => {
            const option = document.createElement('option');
            option.value = cliente;
            option.textContent = cliente;
            if (cliente === clienteSeleccionado) {
                option.selected = true;
            }
            selectCliente.appendChild(option);
        });
        
        // 7. Re-aplicar filtros y actualizar vista
        aplicarFiltroSemanas();
        
        // 8. Actualizar resumen principal
        displaySummary({ 
            status: "success", 
            registros: currentData.length, 
            rangoFechas: currentFilters 
        });
        
        showStatus('success', `Datos actualizados en tiempo real. Quedan ${registrosSinSemanas.length} registros sin semanas.`);
        
    } catch (error) {
        console.error('Error en actualización en tiempo real:', error);
        showStatus('error', 'Error al actualizar datos en tiempo real');
    }
}

function cerrarModal() {
    document.getElementById('semanasModal').style.display = 'none';
    // Limpiar inputs
    document.getElementById('semanasBulkInput').value = '';
}

// Modificar la función de enviar datos POST para que también actualice en tiempo real
async function enviarDatosPost() {
    if (currentData.length === 0) {
        showStatus('error', 'No hay datos para enviar');
        return;
    }

    showLoading(true);
    showStatus('info', 'Enviando datos a Google Sheets...');

    try {
        // Preparar datos para enviar
        const datosParaEnviar = currentData.map(registro => ({
            DOCUMENTO: registro.DOCUMENTO,
            FECHA: registro.FECHA,
            LOTE: registro.LOTE,
            REFPROV: registro.REFPROV,
            DESCRIPCION: registro.DESCRIPCION,
            REFERENCIA: registro.REFERENCIA,
            TIPO: registro.TIPO,
            PVP: registro.PVP,
            PRENDA: registro.PRENDA,
            GENERO: registro.GENERO,
            PROVEEDOR: registro.PROVEEDOR,
            CLASE: registro.CLASE,
            FUENTE: registro.FUENTE,
            NIT: registro.NIT,
            CLIENTE: registro.CLIENTE,
            CANTIDAD: registro.CANTIDAD,
            FACTURA: registro.FACTURA,
            URL_IH3: registro.URL_IH3,
            SIESA_ESTADO: registro.SIESA_ESTADO,
            SIESA_NRO_DOCUMENTO: registro.SIESA_NRO_DOCUMENTO,
            SIESA_FECHA: registro.SIESA_FECHA,
            SIESA_CANTIDAD_INV: registro.SIESA_CANTIDAD_INV,
            ESTADO: registro.ESTADO,
            SEMANAS: registro.SEMANAS,
            KEY: registro.KEY,
            VALIDACION: registro.VALIDACION,
            SIESA_LOTE: registro.SIESA_LOTE
        }));

        // Crear form data para el POST
        const formData = new FormData();
        formData.append('action', 'pegarDatos');
        formData.append('datos', JSON.stringify(datosParaEnviar));

        // Enviar via POST
        const response = await fetch(WEB_APP_URL, {
            method: 'POST',
            body: formData
        });

        const result = await response.json();

        if (result.success) {
            showStatus('success', `✓ ${result.message} - ${result.data.registrosPegados} registros enviados`);
            
            // Recargar datos para mantener consistencia
            setTimeout(() => {
                loadData();
            }, 1000);
            
        } else {
            showStatus('error', `✗ Error: ${result.message}`);
        }

    } catch (error) {
        console.error('Error enviando datos POST:', error);
        showStatus('error', `Error de conexión: ${error.message}`);
    } finally {
        showLoading(false);
    }
}

/*
function displaySummary(data) {
    const estados = currentData.reduce((acc, registro) => {
        const estado = registro.ESTADO || 'SIN DATOS';
        acc[estado] = (acc[estado] || 0) + 1;
        return acc;
    }, {});

    const validaciones = currentData.reduce((acc, registro) => {
        const clave = registro.VALIDACION ? 'VERDADERO' : 'FALSO';
        acc[clave] = (acc[clave] || 0) + 1;
        return acc;
    }, {});

    // Calcular estadísticas de semanas
    const conSemanas = currentData.filter(r => r.SEMANAS && r.SEMANAS !== "").length;
    const sinSemanas = currentData.length - conSemanas;

    // Calcular estadísticas por proveedor
    const proveedores = currentData.reduce((acc, registro) => {
        const proveedor = registro.PROVEEDOR || 'Sin proveedor';
        // Acortar nombres largos de proveedores
        const proveedorCorto = proveedor.includes('ANGELES') ? 'LOS ANGELES' : 
                              proveedor.includes('UNIVERSO') ? 'EL UNIVERSO' : proveedor;
        acc[proveedorCorto] = (acc[proveedorCorto] || 0) + 1;
        return acc;
    }, {});

    // Calcular estadísticas por clase
    const clases = currentData.reduce((acc, registro) => {
        const clase = registro.CLASE || 'Sin clase';
        acc[clase] = (acc[clase] || 0) + 1;
        return acc;
    }, {});

    // Calcular estadísticas por fuente
    const fuentes = currentData.reduce((acc, registro) => {
        const fuente = registro.FUENTE || 'Sin fuente';
        acc[fuente] = (acc[fuente] || 0) + 1;
        return acc;
    }, {});

    // Calcular total de cantidad
    const totalCantidad = currentData.reduce((acc, registro) => acc + (registro.CANTIDAD || 0), 0);

    // Calcular porcentajes
    function calculatePercentage(part, total) {
        if (total === 0) return 0;
        return Math.round((part / total) * 100);
    }

    // Formatear números grandes
    function formatNumber(num) {
        return new Intl.NumberFormat('es-ES').format(num);
    }

    summaryElement.innerHTML = `
        <h3><i class="fas fa-chart-bar"></i> Resumen del Proceso</h3>
        <div class="summary-grid">
            <div class="summary-card">
                <h4><i class="fas fa-chart-pie"></i> Distribución por Estado</h4>
                <div class="stats-grid">
                    ${Object.entries(estados).map(([estado, count]) => {
                        const porcentaje = calculatePercentage(count, currentData.length);
                        const estadoFormateado = estado.split(' ').map(word => 
                            word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
                        ).join(' ');
                        return `
                            <div class="stat-item">
                                <span class="stat-label">${estadoFormateado}:</span>
                                <span class="stat-value">${count} (${porcentaje}%)</span>
                            </div>
                        `;
                    }).join('')}
                </div>
                <div class="progress-container">
                    ${Object.entries(estados).map(([estado, count]) => {
                        const porcentaje = calculatePercentage(count, currentData.length);
                        const claseEstado = estado.toLowerCase().replace(/\s+/g, '-');
                        return `
                            <div class="progress-item">
                                <div class="progress-label">
                                    <span>${estado}</span>
                                    <span>${porcentaje}%</span>
                                </div>
                                <div class="progress-bar">
                                    <div class="progress-fill progress-estado-${claseEstado}" style="width: ${porcentaje}%"></div>
                                </div>
                            </div>
                        `;
                    }).join('')}
                </div>
            </div>
            
            <div class="summary-card">
                <h4><i class="fas fa-calendar-week"></i> Asignación de Semanas</h4>
                <div class="stats-grid">
                    <div class="stat-item">
                        <span class="stat-label">Con semanas:</span>
                        <span class="stat-value" style="color: #10b981;">${conSemanas}</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Sin semanas:</span>
                        <span class="stat-value" style="color: #ef4444;">${sinSemanas}</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Porcentaje completado:</span>
                        <span class="stat-value" style="color: #3b82f6;">${calculatePercentage(conSemanas, currentData.length)}%</span>
                    </div>
                </div>
                <div class="chart-container">
                    <div class="chart">
                        <div class="chart-circle" style="background: conic-gradient(#10b981 0% ${calculatePercentage(conSemanas, currentData.length)}%, #e5e7eb ${calculatePercentage(conSemanas, currentData.length)}% 100%);">
                            <div class="chart-value">${calculatePercentage(conSemanas, currentData.length)}%</div>
                        </div>
                        <div class="chart-label">Con semanas</div>
                    </div>
                    <div class="chart">
                        <div class="chart-circle" style="background: conic-gradient(#ef4444 0% ${calculatePercentage(sinSemanas, currentData.length)}%, #e5e7eb ${calculatePercentage(sinSemanas, currentData.length)}% 100%);">
                            <div class="chart-value">${calculatePercentage(sinSemanas, currentData.length)}%</div>
                        </div>
                        <div class="chart-label">Sin semanas</div>
                    </div>
                </div>
            </div>
            
            <div class="summary-card">
                <h4><i class="fas fa-check-circle"></i> Validaciones</h4>
                <div class="stats-grid">
                    ${Object.entries(validaciones).map(([validacion, count]) => {
                        const porcentaje = calculatePercentage(count, currentData.length);
                        const label = validacion === 'VERDADERO' ? 'Validados' : 'No validados';
                        return `
                            <div class="stat-item">
                                <span class="stat-label">${label}:</span>
                                <span class="stat-value">${count} (${porcentaje}%)</span>
                            </div>
                        `;
                    }).join('')}
                </div>
                <div class="chart-container">
                    <div class="chart">
                        <div class="chart-circle" style="background: conic-gradient(#10b981 0% ${calculatePercentage(validaciones.VERDADERO || 0, currentData.length)}%, #e5e7eb ${calculatePercentage(validaciones.VERDADERO || 0, currentData.length)}% 100%);">
                            <div class="chart-value">${calculatePercentage(validaciones.VERDADERO || 0, currentData.length)}%</div>
                        </div>
                        <div class="chart-label">Validados</div>
                    </div>
                    <div class="chart">
                        <div class="chart-circle" style="background: conic-gradient(#ef4444 0% ${calculatePercentage(validaciones.FALSO || 0, currentData.length)}%, #e5e7eb ${calculatePercentage(validaciones.FALSO || 0, currentData.length)}% 100%);">
                            <div class="chart-value">${calculatePercentage(validaciones.FALSO || 0, currentData.length)}%</div>
                        </div>
                        <div class="chart-label">No validados</div>
                    </div>
                </div>
            </div>
            
            <div class="summary-card">
                <h4><i class="fas fa-tachometer-alt"></i> Métricas Generales</h4>
                <div class="metrics-grid">
                    <div class="metric-card">
                        <div class="metric-value">${formatNumber(currentData.length)}</div>
                        <div class="metric-label">Total Registros</div>
                    </div>
                    <div class="metric-card">
                        <div class="metric-value">${formatNumber(totalCantidad)}</div>
                        <div class="metric-label">Total Cantidad</div>
                    </div>
                    <div class="metric-card">
                        <div class="metric-value">${Object.keys(proveedores).length}</div>
                        <div class="metric-label">Proveedores</div>
                    </div>
                    <div class="metric-card">
                        <div class="metric-value">${Object.keys(clases).length}</div>
                        <div class="metric-label">Clases</div>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    summaryElement.style.display = 'block';
} */
/*
function displaySummary(data) {
    const estados = currentData.reduce((acc, registro) => {
        const estado = registro.ESTADO || 'SIN DATOS';
        acc[estado] = (acc[estado] || 0) + 1;
        return acc;
    }, {});

    const validaciones = currentData.reduce((acc, registro) => {
        const clave = registro.VALIDACION ? 'VERDADERO' : 'FALSO';
        acc[clave] = (acc[clave] || 0) + 1;
        return acc;
    }, {});

    // Calcular estadísticas de semanas
    const conSemanas = currentData.filter(r => r.SEMANAS && r.SEMANAS !== "").length;
    const sinSemanas = currentData.length - conSemanas;

    // Calcular estadísticas por proveedor
    const proveedores = currentData.reduce((acc, registro) => {
        const proveedor = registro.PROVEEDOR || 'Sin proveedor';
        const proveedorCorto = proveedor.includes('ANGELES') ? 'LOS ANGELES' : 
                              proveedor.includes('UNIVERSO') ? 'EL UNIVERSO' : proveedor;
        acc[proveedorCorto] = (acc[proveedorCorto] || 0) + 1;
        return acc;
    }, {});

    // Calcular estadísticas por clase
    const clases = currentData.reduce((acc, registro) => {
        const clase = registro.CLASE || 'Sin clase';
        acc[clase] = (acc[clase] || 0) + 1;
        return acc;
    }, {});

    // Calcular estadísticas por fuente
    const fuentes = currentData.reduce((acc, registro) => {
        const fuente = registro.FUENTE || 'Sin fuente';
        acc[fuente] = (acc[fuente] || 0) + 1;
        return acc;
    }, {});

    // NUEVAS MÉTRICAS DE PRECIOS Y VALORES
    const totalCantidad = currentData.reduce((acc, registro) => acc + (registro.CANTIDAD || 0), 0);
    
    // Calcular valor total de inventario (PVP * CANTIDAD)
    const valorTotalInventario = currentData.reduce((acc, registro) => {
        const pvp = parseFloat(registro.PVP) || 0;
        const cantidad = registro.CANTIDAD || 0;
        return acc + (pvp * cantidad);
    }, 0);

    // Valor promedio por unidad
    const valorPromedioUnidad = totalCantidad > 0 ? valorTotalInventario / totalCantidad : 0;

    // Valor por estado
    const valorPorEstado = currentData.reduce((acc, registro) => {
        const estado = registro.ESTADO || 'SIN DATOS';
        const pvp = parseFloat(registro.PVP) || 0;
        const cantidad = registro.CANTIDAD || 0;
        const valor = pvp * cantidad;
        
        if (!acc[estado]) {
            acc[estado] = { valor: 0, cantidad: 0 };
        }
        acc[estado].valor += valor;
        acc[estado].cantidad += cantidad;
        return acc;
    }, {});

    // Valor por clase
    const valorPorClase = currentData.reduce((acc, registro) => {
        const clase = registro.CLASE || 'Sin clase';
        const pvp = parseFloat(registro.PVP) || 0;
        const cantidad = registro.CANTIDAD || 0;
        const valor = pvp * cantidad;
        
        if (!acc[clase]) {
            acc[clase] = { valor: 0, cantidad: 0 };
        }
        acc[clase].valor += valor;
        acc[clase].cantidad += cantidad;
        return acc;
    }, {});

    // Valor por proveedor
    const valorPorProveedor = currentData.reduce((acc, registro) => {
        const proveedor = registro.PROVEEDOR || 'Sin proveedor';
        const proveedorCorto = proveedor.includes('ANGELES') ? 'LOS ANGELES' : 
                              proveedor.includes('UNIVERSO') ? 'EL UNIVERSO' : proveedor;
        const pvp = parseFloat(registro.PVP) || 0;
        const cantidad = registro.CANTIDAD || 0;
        const valor = pvp * cantidad;
        
        if (!acc[proveedorCorto]) {
            acc[proveedorCorto] = { valor: 0, cantidad: 0 };
        }
        acc[proveedorCorto].valor += valor;
        acc[proveedorCorto].cantidad += cantidad;
        return acc;
    }, {});

    // Estadísticas de PVP
    const precios = currentData.map(r => parseFloat(r.PVP) || 0).filter(p => p > 0);
    const pvpMin = precios.length > 0 ? Math.min(...precios) : 0;
    const pvpMax = precios.length > 0 ? Math.max(...precios) : 0;
    const pvpPromedio = precios.length > 0 ? precios.reduce((a, b) => a + b, 0) / precios.length : 0;

    // Calcular porcentajes
    function calculatePercentage(part, total) {
        if (total === 0) return 0;
        return Math.round((part / total) * 100);
    }

    // Formatear números
    function formatNumber(num) {
        return new Intl.NumberFormat('es-ES').format(Math.round(num));
    }

    // Formatear moneda
    function formatCurrency(num) {
        return new Intl.NumberFormat('es-CO', { 
            style: 'currency', 
            currency: 'COP',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(num);
    }
*/


function displaySummary(data) {
    const estados = currentData.reduce((acc, registro) => {
        const estado = registro.ESTADO || 'SIN DATOS';
        acc[estado] = (acc[estado] || 0) + 1;
        return acc;
    }, {});

    const validaciones = currentData.reduce((acc, registro) => {
        const clave = registro.VALIDACION ? 'VERDADERO' : 'FALSO';
        acc[clave] = (acc[clave] || 0) + 1;
        return acc;
    }, {});

    // Calcular estadísticas de semanas
    const conSemanas = currentData.filter(r => r.SEMANAS && r.SEMANAS !== "").length;
    const sinSemanas = currentData.length - conSemanas;

    // Calcular estadísticas por proveedor
    const proveedores = currentData.reduce((acc, registro) => {
        const proveedor = registro.PROVEEDOR || 'Sin proveedor';
        const proveedorCorto = proveedor.includes('ANGELES') ? 'LOS ANGELES' : 
                              proveedor.includes('UNIVERSO') ? 'EL UNIVERSO' : proveedor;
        acc[proveedorCorto] = (acc[proveedorCorto] || 0) + 1;
        return acc;
    }, {});

    // Calcular estadísticas por clase
    const clases = currentData.reduce((acc, registro) => {
        const clase = registro.CLASE || 'Sin clase';
        acc[clase] = (acc[clase] || 0) + 1;
        return acc;
    }, {});

    // Calcular estadísticas por fuente
    const fuentes = currentData.reduce((acc, registro) => {
        const fuente = registro.FUENTE || 'Sin fuente';
        acc[fuente] = (acc[fuente] || 0) + 1;
        return acc;
    }, {});

    // NUEVAS MÉTRICAS DE PRECIOS Y VALORES
    const totalCantidad = currentData.reduce((acc, registro) => acc + (registro.CANTIDAD || 0), 0);
    
    // Calcular valor total de inventario (PVP * CANTIDAD)
    const valorTotalInventario = currentData.reduce((acc, registro) => {
        const pvp = parseFloat(registro.PVP) || 0;
        const cantidad = registro.CANTIDAD || 0;
        return acc + (pvp * cantidad);
    }, 0);

    // Valor promedio por unidad
    const valorPromedioUnidad = totalCantidad > 0 ? valorTotalInventario / totalCantidad : 0;

    // Valor por estado
    const valorPorEstado = currentData.reduce((acc, registro) => {
        const estado = registro.ESTADO || 'SIN DATOS';
        const pvp = parseFloat(registro.PVP) || 0;
        const cantidad = registro.CANTIDAD || 0;
        const valor = pvp * cantidad;
        
        if (!acc[estado]) {
            acc[estado] = { valor: 0, cantidad: 0 };
        }
        acc[estado].valor += valor;
        acc[estado].cantidad += cantidad;
        return acc;
    }, {});

    // Valor por clase
    const valorPorClase = currentData.reduce((acc, registro) => {
        const clase = registro.CLASE || 'Sin clase';
        const pvp = parseFloat(registro.PVP) || 0;
        const cantidad = registro.CANTIDAD || 0;
        const valor = pvp * cantidad;
        
        if (!acc[clase]) {
            acc[clase] = { valor: 0, cantidad: 0 };
        }
        acc[clase].valor += valor;
        acc[clase].cantidad += cantidad;
        return acc;
    }, {});
    
    // Valor por proveedor
    const valorPorProveedor = currentData.reduce((acc, registro) => {
        const proveedor = registro.PROVEEDOR || 'Sin proveedor';
        const proveedorCorto = proveedor.includes('ANGELES') ? 'LOS ANGELES' : 
                              proveedor.includes('UNIVERSO') ? 'EL UNIVERSO' : proveedor;
        const pvp = parseFloat(registro.PVP) || 0;
        const cantidad = registro.CANTIDAD || 0;
        const valor = pvp * cantidad;
        
        if (!acc[proveedorCorto]) {
            acc[proveedorCorto] = { valor: 0, cantidad: 0 };
        }
        acc[proveedorCorto].valor += valor;
        acc[proveedorCorto].cantidad += cantidad;
        return acc;
    }, {});

    // Estadísticas de PVP
    const precios = currentData.map(r => parseFloat(r.PVP) || 0).filter(p => p > 0);
    const pvpMin = precios.length > 0 ? Math.min(...precios) : 0;
    const pvpMax = precios.length > 0 ? Math.max(...precios) : 0;
    const pvpPromedio = precios.length > 0 ? precios.reduce((a, b) => a + b, 0) / precios.length : 0;

    // Calcular porcentajes
    function calculatePercentage(part, total) {
        if (total === 0) return 0;
        return Math.round((part / total) * 100);
    }

    // Formatear números
    function formatNumber(num) {
        return new Intl.NumberFormat('es-ES').format(Math.round(num));
    }

    // Formatear moneda
    function formatCurrency(num) {
        return new Intl.NumberFormat('es-CO', { 
            style: 'currency', 
            currency: 'COP',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(num);
    }

    summaryElement.innerHTML = `
        <h3><i class="fas fa-chart-bar"></i> Resumen del Proceso</h3>
        
        <div class="summary-grid">
            <!-- ESTADOS CON ESTILO DE TARJETA DE INVENTARIO -->
            <div class="summary-card highlight-card">
                <h4><i class="fas fa-clipboard-list"></i> Distribución por Estado</h4>
                <div class="metrics-grid">
                    ${Object.entries(valorPorEstado)
                        .sort((a, b) => b[1].valor - a[1].valor)
                        .map(([estado, info]) => {
                            const estadoFormateado = estado.split(' ').map(word => 
                                word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
                            ).join(' ');
                            return `
                                <div class="metric-card">
                                    <div class="metric-value">${formatCurrency(info.valor)}</div>
                                    <div class="metric-label">${estadoFormateado}</div>
                                    <div class="metric-sublabel">${formatNumber(info.cantidad)} unidades</div>
                                </div>
                            `;
                        }).join('')}
                </div>
            </div>

            <!-- VALOR POR PROVEEDOR -->
            <div class="summary-card">
                <h4><i class="fas fa-truck"></i> Valor por Proveedor</h4>
                <div class="chart-container">
                    ${Object.entries(valorPorProveedor)
                        .sort((a, b) => b[1].valor - a[1].valor)
                        .map(([proveedor, info]) => {
                            const porcentaje = calculatePercentage(info.valor, valorTotalInventario);
                            return `
                                <div class="chart">
                                    <div class="chart-circle" style="background: conic-gradient(#3b82f6 0% ${porcentaje}%, #e5e7eb ${porcentaje}% 100%);">
                                        <div class="chart-value">${porcentaje}%</div>
                                    </div>
                                    <div class="chart-label">${proveedor}</div>
                                    <div class="chart-sublabel">${formatCurrency(info.valor)}</div>
                                    <div class="chart-sublabel">${formatNumber(info.cantidad)} unidades</div>
                                </div>
                            `;
                        }).join('')}
                </div>
            </div>
            
            <!-- ASIGNACIÓN DE SEMANAS -->
            <div class="summary-card">
                <h4><i class="fas fa-calendar-week"></i> Asignación de Semanas</h4>
                <div class="stats-grid">
                    <div class="stat-item">
                        <span class="stat-label">Con semanas:</span>
                        <span class="stat-value" style="color: #10b981;">${conSemanas}</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Sin semanas:</span>
                        <span class="stat-value" style="color: #ef4444;">${sinSemanas}</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Porcentaje completado:</span>
                        <span class="stat-value" style="color: #3b82f6;">${calculatePercentage(conSemanas, currentData.length)}%</span>
                    </div>
                </div>
                <div class="chart-container">
                    <div class="chart">
                        <div class="chart-circle" style="background: conic-gradient(#10b981 0% ${calculatePercentage(conSemanas, currentData.length)}%, #e5e7eb ${calculatePercentage(conSemanas, currentData.length)}% 100%);">
                            <div class="chart-value">${calculatePercentage(conSemanas, currentData.length)}%</div>
                        </div>
                        <div class="chart-label">Con semanas</div>
                    </div>
                    <div class="chart">
                        <div class="chart-circle" style="background: conic-gradient(#ef4444 0% ${calculatePercentage(sinSemanas, currentData.length)}%, #e5e7eb ${calculatePercentage(sinSemanas, currentData.length)}% 100%);">
                            <div class="chart-value">${calculatePercentage(sinSemanas, currentData.length)}%</div>
                        </div>
                        <div class="chart-label">Sin semanas</div>
                    </div>
                </div>
            </div>
            
            <!-- VALIDACIONES -->
            <div class="summary-card">
                <h4><i class="fas fa-check-circle"></i> Validaciones</h4>
                <div class="stats-grid">
                    ${Object.entries(validaciones).map(([validacion, count]) => {
                        const porcentaje = calculatePercentage(count, currentData.length);
                        const label = validacion === 'VERDADERO' ? 'Validados' : 'No validados';
                        return `
                            <div class="stat-item">
                                <span class="stat-label">${label}:</span>
                                <span class="stat-value">${count} (${porcentaje}%)</span>
                            </div>
                        `;
                    }).join('')}
                </div>
                <div class="chart-container">
                    <div class="chart">
                        <div class="chart-circle" style="background: conic-gradient(#10b981 0% ${calculatePercentage(validaciones.VERDADERO || 0, currentData.length)}%, #e5e7eb ${calculatePercentage(validaciones.VERDADERO || 0, currentData.length)}% 100%);">
                            <div class="chart-value">${calculatePercentage(validaciones.VERDADERO || 0, currentData.length)}%</div>
                        </div>
                        <div class="chart-label">Validados</div>
                    </div>
                    <div class="chart">
                        <div class="chart-circle" style="background: conic-gradient(#ef4444 0% ${calculatePercentage(validaciones.FALSO || 0, currentData.length)}%, #e5e7eb ${calculatePercentage(validaciones.FALSO || 0, currentData.length)}% 100%);">
                            <div class="chart-value">${calculatePercentage(validaciones.FALSO || 0, currentData.length)}%</div>
                        </div>
                        <div class="chart-label">No validados</div>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    summaryElement.style.display = 'block';
}

function showLoading(show) {
    loadingElement.style.display = show ? 'block' : 'none';
    loadDataBtn.disabled = show;
}

function showStatus(type, message) {
    statusMessage.textContent = message;
    statusMessage.className = `status ${type}`;
    statusMessage.style.display = 'block';
    
    if (type === 'success') {
        setTimeout(() => {
            statusMessage.style.display = 'none';
        }, 5000);
    }
}

// [Todas las funciones auxiliares existentes se mantienen igual...]
// obtenerDatosSIESA, buscarSiesa, calcularEstado, etc.

// Funciones auxiliares (mantener las existentes)
async function obtenerDatosSIESA() {
    try {
        const siesaResp = await fetchSheetData(SPREADSHEET_IDS.SIESA, "SIESA!A2:G");
        const siesaV2Resp = await fetchSheetData(SPREADSHEET_IDS.SIESA, "SIESA_V2!A2:D");
        
        const siesaData = {};
        const siesaV2Data = {};
        
        // Procesar SIESA principal - CALCULAR LOTE SIESA
        (siesaResp.values || []).forEach((row) => {
            const nroDocumento = String(row[1] || "").trim();
            if (nroDocumento) {
                const razonSocial = String(row[3] || "").trim();
                const nit = normalizarNitDesdeRazonSocial(razonSocial);
                const fechaSiesa = normalizarFechaSiesa(String(row[2] || ""));
                const doctoReferencia = String(row[4] || "").trim();
                const notas = String(row[5] || "").trim();
                const compaa = String(row[6] || "").trim();
                
                const loteSiesa = calcularLoteSiesa(compaa, doctoReferencia, notas);
                
                siesaData[nroDocumento] = {
                    estado: String(row[0] || "").trim(),
                    nro_documento: nroDocumento,
                    fecha: fechaSiesa,
                    razon_social: razonSocial,
                    nit: nit,
                    docto_referencia: doctoReferencia,
                    notas: notas,
                    compaa: compaa,
                    lote: loteSiesa
                };
            }
        });
        
        // Procesar SIESA_V2 - SUMAR cantidades
        (siesaV2Resp.values || []).forEach(row => {
            const nroDocumento = String(row[0] || "").trim();
            if (nroDocumento) {
                if (!siesaV2Data[nroDocumento]) {
                    siesaV2Data[nroDocumento] = {};
                }
                
                const referencia = String(row[2] || "").trim();
                const cantidad = Number(row[3]) || 0;
                
                if (referencia) {
                    if (!siesaV2Data[nroDocumento][referencia]) {
                        siesaV2Data[nroDocumento][referencia] = 0;
                    }
                    siesaV2Data[nroDocumento][referencia] += cantidad;
                }
            }
        });
        
        const datosUnificados = {};
        
        // Combinar datos - USAR SOLO LOTE SIESA PARA LAS CLAVES
        for (const [nroDocumento, datosSiesa] of Object.entries(siesaData)) {
            const itemsV2 = siesaV2Data[nroDocumento] || {};
            const loteSiesa = datosSiesa.lote;
            
            for (const [referencia, cantidadTotal] of Object.entries(itemsV2)) {
                const nit = String(datosSiesa.nit || "").trim();
                
                if (referencia && nit && cantidadTotal > 0 && loteSiesa) {
                    const clave = `${referencia}_${nit}_${cantidadTotal}_${loteSiesa}`;
                    
                    datosUnificados[clave] = {
                        estado: datosSiesa.estado,
                        nro_documento: datosSiesa.nro_documento,
                        fecha: datosSiesa.fecha,
                        cantidad_inv: cantidadTotal,
                        referencia: referencia,
                        nit: nit,
                        lote: loteSiesa,
                        docto_referencia: datosSiesa.docto_referencia,
                        notas: datosSiesa.notas,
                        compaa: datosSiesa.compaa
                    };
                }
            }
        }
        
        console.log(`Datos SIESA unificados: ${Object.keys(datosUnificados).length} registros`);
        return datosUnificados;
        
    } catch (error) {
        console.error("Error obteniendo datos de SIESA:", error);
        return {};
    }
}

function buscarSiesa(siesaData, refprov, nit, cantidad, lote) {
    const CLIENTES_FILTRADOS = ["900047252", "805027653"];
    if (!CLIENTES_FILTRADOS.includes(nit)) {
        return null;
    }
    
    const refprovLimpio = String(refprov || "").trim();
    const nitLimpio = String(nit || "").trim();
    const cantidadLimpia = Number(cantidad) || 0;
    const loteLimpio = String(lote || "").trim().replace(/\D/g, "");
    
    if (!refprovLimpio || !nitLimpio || cantidadLimpia <= 0 || !loteLimpio) {
        return null;
    }
    
    const clave = `${refprovLimpio}_${nitLimpio}_${cantidadLimpia}_${loteLimpio}`;
    
    console.log(`Buscando SIESA con clave: ${clave}`);
    
    if (siesaData[clave]) {
        console.log(`✓ Encontrado en SIESA`);
        return siesaData[clave];
    }
    
    console.log(`✗ No encontrado en SIESA`);
    return null;
}

function calcularEstado(factura, siesaNroDocumento) {
    const facturaLimpia = String(factura || "").trim();
    const siesaLimpio = String(siesaNroDocumento || "").trim();
    
    if (!facturaLimpia && !siesaLimpio) {
        return "SIN DATOS";
    }
    
    if (facturaLimpia && siesaLimpio) {
        if (facturaLimpia === siesaLimpio) {
            return "ENTREGADO";
        } else {
            return "VALIDAR";
        }
    }
    
    if (siesaLimpio && !facturaLimpia) {
        return "PENDIENTE";
    }
    
    return "VALIDAR";
}

function calcularValidacion(lote, siesaLote) {
    if (!lote || !siesaLote) return false;
    
    const loteLimpio = String(lote).trim().replace(/\D/g, '');
    const siesaLoteLimpio = String(siesaLote).trim().replace(/\D/g, '');
    
    return loteLimpio === siesaLoteLimpio;
}

function obtenerSemanasPorReferenciaYCliente(referencia, cliente) {
    if (!referencia || !cliente) return "";
    
    const refLimpia = String(referencia).trim();
    const clienteLimpio = String(cliente).trim();
    
    const claveCompleta = `${refLimpia}_${clienteLimpio}`;
    if (semanasData[claveCompleta]) {
        return semanasData[claveCompleta];
    }
    
    if (semanasData[refLimpia]) {
        return semanasData[refLimpia];
    }
    
    const refSoloNumeros = refLimpia.replace(/[^0-9]/g, '');
    if (refSoloNumeros && refSoloNumeros !== refLimpia) {
        const claveNumerica = `${refSoloNumeros}_${clienteLimpio}`;
        if (semanasData[claveNumerica]) {
            return semanasData[claveNumerica];
        }
        if (semanasData[refSoloNumeros]) {
            return semanasData[refSoloNumeros];
        }
    }
    
    return "";
}

async function obtenerDatosDistribucion() {
    try {
        const distribucionResp = await fetchSheetData(SPREADSHEET_IDS.DISTRIBUCION, "DATA!A1:C");
        const distribucionData = {};
        
        (distribucionResp.values || []).forEach((row, index) => {
            if (index === 0) return;
            
            const documento = "REC" + String(row[0] || "").trim();
            const jsonData = row[2] || "";
            
            if (jsonData) {
                try {
                    const parsedData = JSON.parse(jsonData);
                    distribucionData[documento] = procesarDistribucionCliente(parsedData);
                } catch (e) {
                    console.log(`Error parseando JSON para documento ${documento}:`, e);
                }
            }
        });
        
        return distribucionData;
    } catch (error) {
        console.error("Error obteniendo datos de distribución:", error);
        return {};
    }
}

async function obtenerDatosSoportes() {
    try {
        const soportesResp = await fetchSheetData(SPREADSHEET_IDS.SOPORTES, "SOPORTES!A2:I");
        const soportesData = {};
        
        (soportesResp.values || []).forEach(row => {
            const documento = String(row[1] || "").trim();
            const cantidad = Number(row[4]) || 0;
            const nit = String(row[6] || "").trim();
            const factura = String(row[5] || "").trim();
            const url_ih3 = String(row[8] || "").trim();
            
            const clave = `${documento}_${cantidad}_${nit}`;
            
            if (documento && cantidad > 0 && nit) {
                soportesData[clave] = {
                    documento: documento,
                    cantidad: cantidad,
                    nit: nit,
                    factura: factura,
                    url_ih3: url_ih3
                };
            }
        });
        
        return soportesData;
    } catch (error) {
        console.error("Error obteniendo datos de soportes:", error);
        return {};
    }
}

function procesarDistribucionCliente(data) {
    const resultado = {
        documento: data.Documento || "",
        clientes: {}
    };
    
    const CLIENTES_FILTRADOS = currentFilters.clientes;
    
    if (data.Clientes) {
        for (const [nombreCliente, infoCliente] of Object.entries(data.Clientes)) {
            if (!CLIENTES_FILTRADOS.includes(infoCliente.id)) {
                continue;
            }
            
            const clienteInfo = CLIENTES.find(c => c.nit === infoCliente.id);
            const nombreReal = clienteInfo ? clienteInfo.nombre : nombreCliente;
            
            let cantidadTotal = 0;
            if (infoCliente.distribucion && Array.isArray(infoCliente.distribucion)) {
                cantidadTotal = infoCliente.distribucion.reduce((sum, item) => sum + (item.cantidad || 0), 0);
            }
            
            if (cantidadTotal > 0) {
                resultado.clientes[nombreReal] = {
                    nit: infoCliente.id,
                    porcentaje: infoCliente.porcentaje,
                    cantidad_total: cantidadTotal
                };
            }
        }
    }
    
    return resultado;
}

function buscarSoporte(soportesData, documento, cantidad, nit) {
    const claves = [
        `${documento}_${cantidad}_${nit}`,
        `${documento.replace(/^REC/, "")}_${cantidad}_${nit}`,
        `${documento}_${cantidad}_`
    ];
    
    for (const clave of claves) {
        if (soportesData[clave]) {
            return soportesData[clave];
        }
    }
    
    return null;
}

function calcularRangoFechas() {
    const ahora = new Date();
    const añoActual = ahora.getFullYear();
    const mesActual = ahora.getMonth();
    
    let añoInicio = añoActual;
    let mesInicio = mesActual - 1;
    
    if (mesInicio < 0) {
        añoInicio--;
        mesInicio = 11;
    }
    
    const fechaInicio = new Date(añoInicio, mesInicio, 1);
    const fechaFin = new Date(añoActual, mesActual + 1, 0);
    
    const rango = {
        fechaInicio: formatDate(fechaInicio),
        fechaFin: formatDate(fechaFin),
        descripcion: `Desde ${formatDate(fechaInicio, 'MMMM yyyy')} hasta ${formatDate(fechaFin, 'MMMM yyyy')}`
    };
    
    return rango;
}

function formatDate(date, format = 'yyyy-MM-dd') {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    
    if (format === 'MMMM yyyy') {
        const monthNames = [
            'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
            'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
        ];
        return `${monthNames[date.getMonth()]} ${year}`;
    }
    
    return `${year}-${month}-${day}`;
}

function estaDentroDelRango(fecha, rangoFechas) {
    if (!fecha) return false;
    
    const fechaObj = new Date(fecha);
    const inicio = new Date(rangoFechas.fechaInicio);
    const fin = new Date(rangoFechas.fechaFin);
    
    return fechaObj >= inicio && fechaObj <= fin;
}

function normalizeLinea(linea) {
    return String(linea).replace(/^LINEA\s*/i, "").replace(/\s+/g, "").toUpperCase();
}

function normalizePVP(pvp) {
    return String(pvp).replace(/\$\s*/g, "").replace(/\./g, "").trim();
}

function normalizeDocumento(documento) {
    return String(documento).replace(/^REC/i, "");
}

function normalizeDate(date) {
    if (!date) return "";
    if (Object.prototype.toString.call(date) === "[object Date]") {
        return formatDate(date);
    }
    if (date.includes("/")) {
        const [d, m, y] = date.split("/");
        return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
    }
    if (date.includes("-")) return date;
    return "";
}

function getProveedorByLinea(linea) {
    return normalizeLinea(linea).includes("ANGELES")
        ? "TEXTILES Y CREACIONES LOS ANGELES SAS"
        : "TEXTILES Y CREACIONES EL UNIVERSO SAS";
}

function getClaseByPVP(pvp) {
    const valor = parseFloat(pvp);
    if (isNaN(valor)) return;
    if (valor <= 39900) return "LINEA";
    if (valor <= 59900) return "MODA";
    if (valor > 59900) return "PRONTAMODA";
}

function normalizarNitDesdeRazonSocial(razonSocial) {
    if (!razonSocial) return "";
    
    const razonSocialNormalizada = razonSocial.toUpperCase().trim();
    
    for (const [nombre, nit] of Object.entries(MAPEO_NOMBRES_SIESA)) {
        if (razonSocialNormalizada.includes(nombre.toUpperCase())) {
            return nit;
        }
    }
    
    const nombresBusqueda = Object.keys(MAPEO_NOMBRES_SIESA);
    for (const nombre of nombresBusqueda) {
        if (razonSocialNormalizada.includes(nombre.toUpperCase())) {
            return MAPEO_NOMBRES_SIESA[nombre];
        }
    }
    
    return "";
}

function normalizarFechaSiesa(fechaSiesa) {
    if (!fechaSiesa) return "";
    
    if (fechaSiesa.includes("-") && fechaSiesa.length === 10) {
        return fechaSiesa;
    }
    
    if (fechaSiesa.includes("/")) {
        const partes = fechaSiesa.split("/");
        if (partes.length === 3) {
            let [mes, dia, año] = partes;
            
            mes = mes.padStart(2, "0");
            dia = dia.padStart(2, "0");
            
            if (año.length === 2) {
                año = "20" + año;
            }
            
            return `${año}-${mes}-${dia}`;
        }
    }
    
    try {
        const fechaObj = new Date(fechaSiesa);
        if (!isNaN(fechaObj.getTime())) {
            return formatDate(fechaObj);
        }
    } catch (e) {
        console.log(`No se pudo parsear fecha SIESA: ${fechaSiesa}`);
    }
    
    return "";
}

function calcularLoteSiesa(compaa, doctoReferencia, notas) {
    const compaaNormalizado = String(compaa).trim().replace(/\s+/g, "");
    const doctoReferenciaLimpio = String(doctoReferencia).trim().replace(/\s+/g, "");
    const notasLimpio = String(notas).trim().replace(/\s+/g, "");
    
    if (compaaNormalizado === "5") {
        const loteNumerico = extraerNumeroLote(doctoReferenciaLimpio);
        if (loteNumerico) {
            return loteNumerico;
        }
    }
    
    if (compaaNormalizado === "3") {
        const loteNumerico = extraerNumeroLote(notasLimpio);
        if (loteNumerico) {
            return loteNumerico;
        }
    }
    
    return "";
}

function extraerNumeroLote(texto) {
    if (!texto) return "";
    
    const soloNumeros = texto.replace(/\D/g, "");
    
    if (soloNumeros && soloNumeros.length > 0 && soloNumeros.length <= 10) {
        const numero = parseInt(soloNumeros, 10);
        if (!isNaN(numero) && numero > 0) {
            return String(numero);
        }
    }
    
    return "";
}

function limpiarTextoCSV(texto) {
    if (!texto) return '';
    return String(texto)
        .replace(/"/g, '""')
        .replace(/;/g, ',')
        .replace(/\n/g, ' ')
        .replace(/\r/g, ' ')
        .replace(/\t/g, ' ');
}

function formatoNumeroExcel(numero) {
    if (numero === null || numero === undefined) return '';
    return String(numero).replace(',', '.');
}

async function fetchSheetData(spreadsheetId, range) {
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}?key=${API_KEY}`;
    
    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Error HTTP: ${response.status}`);
        }
        return await response.json();
    } catch (error) {
        console.error(`Error obteniendo datos de ${spreadsheetId}:`, error);
        throw error;
    }
}