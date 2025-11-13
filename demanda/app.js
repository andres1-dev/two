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
let currentFilters = {};

// Elementos DOM
const loadDataBtn = document.getElementById('loadDataBtn');
const exportCSVBtn = document.getElementById('exportCSVBtn');
const exportSinSemanasBtn = document.getElementById('exportSinSemanasBtn');
const statusMessage = document.getElementById('statusMessage');
const loadingElement = document.getElementById('loading');
const summaryElement = document.getElementById('summary');
const resetFiltersBtn = document.getElementById('resetFiltersBtn');
const saveFiltersBtn = document.getElementById('saveFiltersBtn');

// Elementos de filtros
const fechaInicioInput = document.getElementById('fechaInicio');
const fechaFinInput = document.getElementById('fechaFin');
const tipoDocumentoSelect = document.getElementById('tipoDocumento');
const fuenteDatosSelect = document.getElementById('fuenteDatos');
const clientesSelect = document.getElementById('clientes');
const proveedoresSelect = document.getElementById('proveedores');
const estadosSelect = document.getElementById('estados');
const clasesSelect = document.getElementById('clases');

// Inicialización
document.addEventListener('DOMContentLoaded', function() {
    // Inicializar datepickers
    flatpickr(".datepicker", {
        locale: "es",
        dateFormat: "Y-m-d",
        allowInput: true
    });
    
    // Establecer fechas por defecto (último mes)
    const rangoFechas = calcularRangoFechas();
    fechaInicioInput.value = rangoFechas.fechaInicio;
    fechaFinInput.value = rangoFechas.fechaFin;
    
    // Cargar configuración guardada si existe
    cargarConfiguracionGuardada();
    
    // Event Listeners
    loadDataBtn.addEventListener('click', loadData);
    exportCSVBtn.addEventListener('click', exportCSV);
    exportSinSemanasBtn.addEventListener('click', exportSinSemanas);
    resetFiltersBtn.addEventListener('click', resetFilters);
    saveFiltersBtn.addEventListener('click', guardarConfiguracion);
});

// Funciones de configuración
function obtenerFiltrosActuales() {
    return {
        fechaInicio: fechaInicioInput.value,
        fechaFin: fechaFinInput.value,
        tiposDocumento: Array.from(tipoDocumentoSelect.selectedOptions).map(opt => opt.value),
        fuentesDatos: Array.from(fuenteDatosSelect.selectedOptions).map(opt => opt.value),
        clientes: Array.from(clientesSelect.selectedOptions).map(opt => opt.value),
        proveedores: Array.from(proveedoresSelect.selectedOptions).map(opt => opt.value),
        estados: Array.from(estadosSelect.selectedOptions).map(opt => opt.value),
        clases: Array.from(clasesSelect.selectedOptions).map(opt => opt.value)
    };
}

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


function resetFilters() {
    // Restablecer fechas
    const rangoFechas = calcularRangoFechas();
    fechaInicioInput.value = rangoFechas.fechaInicio;
    fechaFinInput.value = rangoFechas.fechaFin;
    
    // Restablecer selects múltiples
    Array.from(tipoDocumentoSelect.options).forEach(opt => {
        opt.selected = opt.value === "FULL";
    });
    
    Array.from(fuenteDatosSelect.options).forEach(opt => {
        opt.selected = ["SISPRO", "BUSINT"].includes(opt.value);
    });
    
    Array.from(clientesSelect.options).forEach(opt => {
        opt.selected = ["900047252", "805027653"].includes(opt.value);
    });
    
    Array.from(proveedoresSelect.options).forEach(opt => {
        opt.selected = true;
    });
    
    Array.from(estadosSelect.options).forEach(opt => {
        opt.selected = true;
    });
    
    Array.from(clasesSelect.options).forEach(opt => {
        opt.selected = true;
    });
    
    showStatus('success', 'Filtros restablecidos a valores por defecto');
}

function guardarConfiguracion() {
    const configuracion = obtenerFiltrosActuales();
    localStorage.setItem('configuracionFiltros', JSON.stringify(configuracion));
    showStatus('success', 'Configuración guardada correctamente');
}

function cargarConfiguracionGuardada() {
    const configuracionGuardada = localStorage.getItem('configuracionFiltros');
    if (configuracionGuardada) {
        try {
            const config = JSON.parse(configuracionGuardada);
            
            // Aplicar configuración guardada
            if (config.fechaInicio) fechaInicioInput.value = config.fechaInicio;
            if (config.fechaFin) fechaFinInput.value = config.fechaFin;
            
            // Aplicar selects múltiples
            if (config.tiposDocumento) {
                Array.from(tipoDocumentoSelect.options).forEach(opt => {
                    opt.selected = config.tiposDocumento.includes(opt.value);
                });
            }
            
            if (config.fuentesDatos) {
                Array.from(fuenteDatosSelect.options).forEach(opt => {
                    opt.selected = config.fuentesDatos.includes(opt.value);
                });
            }
            
            if (config.clientes) {
                Array.from(clientesSelect.options).forEach(opt => {
                    opt.selected = config.clientes.includes(opt.value);
                });
            }
            
            if (config.proveedores) {
                Array.from(proveedoresSelect.options).forEach(opt => {
                    opt.selected = config.proveedores.includes(opt.value);
                });
            }
            
            if (config.estados) {
                Array.from(estadosSelect.options).forEach(opt => {
                    opt.selected = config.estados.includes(opt.value);
                });
            }
            
            if (config.clases) {
                Array.from(clasesSelect.options).forEach(opt => {
                    opt.selected = config.clases.includes(opt.value);
                });
            }
            
            showStatus('success', 'Configuración cargada correctamente');
        } catch (e) {
            console.error('Error cargando configuración:', e);
            showStatus('error', 'Error al cargar la configuración guardada');
        }
    }
}

// Funciones principales
async function loadData() {
    try {
        showLoading(true);
        showStatus('info', 'Iniciando carga de datos...');
        
        // Obtener filtros actuales
        currentFilters = obtenerFiltrosActuales();
        
        await cargarDatosSemanas();
        const data = await obtenerDatosConDistribucion();
        currentData = data.data;
        
        showStatus('success', `Proceso completado: ${data.registros} registros encontrados`);
        displaySummary(data);
        
        exportCSVBtn.style.display = 'inline-block';
        exportSinSemanasBtn.style.display = 'inline-block';
        
    } catch (error) {
        console.error('Error:', error);
        showStatus('error', `Error: ${error.message}`);
    } finally {
        showLoading(false);
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

async function obtenerDatosConDistribucion() {
    const rangoFechas = {
        fechaInicio: currentFilters.fechaInicio,
        fechaFin: currentFilters.fechaFin,
        descripcion: `Desde ${currentFilters.fechaInicio} hasta ${currentFilters.fechaFin}`
    };
    
    const distribucionData = await obtenerDatosDistribucion();
    const soportesData = await obtenerDatosSoportes();
    const siesaData = await obtenerDatosSIESA();
    
    const CLIENTES_FILTRADOS = currentFilters.clientes;
    
    const data2Resp = await fetchSheetData(SPREADSHEET_IDS.DATA2, "DATA2!S2:S");
    const recResp = await fetchSheetData(SPREADSHEET_IDS.REC, "DataBase!A2:AF");

    const registros = [];

    // Procesar DATA2
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
                    if (infoCliente.cantidad_total > 0 && CLIENTES_FILTRADOS.includes(infoCliente.nit)) {
                        
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
                if (infoCliente.cantidad_total > 0 && CLIENTES_FILTRADOS.includes(infoCliente.nit)) {
                    
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

// [El resto de las funciones se mantienen igual que en el código original...]
// Incluyendo: obtenerDatosSIESA, buscarSiesa, exportCSV, exportSinSemanas, 
// generarYDescargarCSV, displaySummary, showLoading, showStatus, etc.

// FUNCIONES DE DESCARGA
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
        // BOM para UTF-8 y headers
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
    ].join('\r\n'); // Usar \r\n para compatibilidad Windows

    // Crear y descargar archivo
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

// FUNCIONES AUXILIARES PARA CSV
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

// FUNCIONES DE UI
function displaySummary(data) {
    const estados = currentData.reduce((acc, registro) => {
        acc[registro.ESTADO] = (acc[registro.ESTADO] || 0) + 1;
        return acc;
    }, {});

    const estadosHTML = Object.entries(estados).map(([estado, count]) => 
        `<div style="margin: 5px 0;"><strong>${estado}:</strong> ${count}</div>`
    ).join('');

    const validaciones = currentData.reduce((acc, registro) => {
        const clave = registro.VALIDACION ? 'VERDADERO' : 'FALSO';
        acc[clave] = (acc[clave] || 0) + 1;
        return acc;
    }, {});

    const validacionesHTML = Object.entries(validaciones).map(([validacion, count]) => 
        `<div style="margin: 5px 0;"><strong>VALIDACIÓN ${validacion}:</strong> ${count}</div>`
    ).join('');

    // Calcular estadísticas de semanas
    const conSemanas = currentData.filter(r => r.SEMANAS && r.SEMANAS !== "").length;
    const sinSemanas = currentData.length - conSemanas;

    const semanasHTML = `
        <div style="margin: 5px 0;"><strong>CON SEMANAS:</strong> ${conSemanas}</div>
        <div style="margin: 5px 0;"><strong>SIN SEMANAS:</strong> ${sinSemanas}</div>
    `;

    summaryElement.innerHTML = `
        <h3 style="margin-top: 0;">Resumen del Proceso</h3>
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 20px;">
            <div>
                <div style="font-size: 1.2em; margin-bottom: 10px;"><strong>Estadísticas Generales</strong></div>
                <div><strong>Registros procesados:</strong> ${data.registros}</div>
                <div><strong>Rango de fechas:</strong> ${data.rangoFechas.descripcion}</div>
                <div><strong>Estado del proceso:</strong> <span style="color: #34a853;">${data.status}</span></div>
            </div>
            <div>
                <div style="font-size: 1.2em; margin-bottom: 10px;"><strong>Distribución por Estado</strong></div>
                ${estadosHTML}
            </div>
            <div>
                <div style="font-size: 1.2em; margin-bottom: 10px;"><strong>Semanas</strong></div>
                ${semanasHTML}
            </div>
            <div>
                <div style="font-size: 1.2em; margin-bottom: 10px;"><strong>Validaciones</strong></div>
                ${validacionesHTML}
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

// [Las funciones restantes se mantienen igual...]
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
    if (isNaN(valor)) return "NO DEFINIDO";
    if (valor <= 39900) return "LINEA";
    if (valor > 39900 && valor <= 59900) return "MODA";
    if (valor > 59900) return "PRONTAMODA";
    return "NO DEFINIDO";
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