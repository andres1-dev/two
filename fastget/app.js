// app.js - VERSIÓN OPTIMIZADA
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

// Filtros predeterminados
const DEFAULT_FILTERS = {
    fechaInicio: '',
    fechaFin: '',
    tiposDocumento: ['FULL', 'PROMO'],
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
    "ZULUAGA GOMEZ RUBEN ESTEBAN": "1007348825",
};

// Variables globales
let currentData = [];
let currentFilters = { ...DEFAULT_FILTERS };

// Elementos DOM
const downloadBtn = document.getElementById('downloadBtn');
const statusMessage = document.getElementById('statusMessage');
const loadingElement = document.getElementById('loading');

// Inicialización
document.addEventListener('DOMContentLoaded', function() {
    const rangoFechas = calcularRangoFechas();
    currentFilters.fechaInicio = rangoFechas.fechaInicio;
    currentFilters.fechaFin = rangoFechas.fechaFin;
    
    downloadBtn.addEventListener('click', downloadCSV);
});

// FUNCIÓN PRINCIPAL OPTIMIZADA - PARALELIZACIÓN MASIVA
async function downloadCSV() {
    try {
        showLoading(true);
        showStatus('info', 'Iniciando carga de datos optimizada...');
        
        // CARGAR TODOS LOS DATOS EN PARALELO
        const [dataResult, distribucionData, soportesData, siesaData] = await Promise.all([
            obtenerDatosConDistribucion(),
            obtenerDatosDistribucion(),
            obtenerDatosSoportes(),
            obtenerDatosSIESA()
        ]);
        
        currentData = dataResult.data;
        
        if (currentData.length === 0) {
            showStatus('error', 'No hay datos para exportar');
            return;
        }

        showStatus('info', 'Generando archivo CSV...');
        generarYDescargarCSV(currentData, 'completo');
        
    } catch (error) {
        console.error('Error:', error);
        showStatus('error', `Error: ${error.message}`);
    } finally {
        showLoading(false);
    }
}

// VERSIÓN HIPER-OPTIMIZADA DE obtenerDatosConDistribucion
async function obtenerDatosConDistribucion() {
    const rangoFechas = {
        fechaInicio: currentFilters.fechaInicio,
        fechaFin: currentFilters.fechaFin,
        descripcion: `Desde ${currentFilters.fechaInicio} hasta ${currentFilters.fechaFin}`
    };
    
    // CARGAR TODAS LAS HOJAS EN PARALELO
    const [distribucionData, soportesData, siesaData, data2Resp, recResp] = await Promise.all([
        obtenerDatosDistribucion(),
        obtenerDatosSoportes(),
        obtenerDatosSIESA(),
        fetchSheetDataOptimized(SPREADSHEET_IDS.DATA2, "DATA2!S2:S", true),
        fetchSheetDataOptimized(SPREADSHEET_IDS.REC, "DataBase!A2:AF", false)
    ]);

    const registros = [];
    const promosMultiplesPorDocumento = {};

    // PROCESAR DATA2 CON OPTIMIZACIÓN MASIVA
    await procesarData2Optimizado(data2Resp.values || [], distribucionData, soportesData, siesaData, rangoFechas, registros, promosMultiplesPorDocumento);
    
    // PROCESAR PROMOS MÚLTIPLES AGRUPADAS
    await procesarPromosMultiplesOptimizado(promosMultiplesPorDocumento, soportesData, siesaData, registros);
    
    // PROCESAR REC (DATABASE) OPTIMIZADO
    await procesarRecOptimizado(recResp.values || [], distribucionData, soportesData, siesaData, rangoFechas, registros);

    return {
        status: "success",
        registros: registros.length,
        rangoFechas: rangoFechas,
        data: registros
    };
}

// FUNCIÓN DE FETCH OPTIMIZADA - BATCH Y COMPRESIÓN
async function fetchSheetDataOptimized(spreadsheetId, range, isJsonColumn = false) {
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}?key=${API_KEY}&valueRenderOption=UNFORMATTED_VALUE&dateTimeRenderOption=FORMATTED_STRING`;
    
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000);
        
        const response = await fetch(url, {
            signal: controller.signal,
            headers: {
                'Accept': 'application/json',
                'Accept-Encoding': 'gzip'
            }
        });
        
        clearTimeout(timeoutId);
        
        if (!response.ok) {
            throw new Error(`Error HTTP: ${response.status} - ${response.statusText}`);
        }
        
        const data = await response.json();
        
        // Procesamiento optimizado para columnas JSON
        if (isJsonColumn && data.values) {
            data.values = data.values.map(row => {
                try {
                    if (row[0] && typeof row[0] === 'string') {
                        return [JSON.parse(row[0])];
                    }
                    return row;
                } catch (e) {
                    console.warn('Error parsing JSON:', e);
                    return [{}];
                }
            });
        }
        
        return data;
    } catch (error) {
        console.error(`Error obteniendo datos de ${spreadsheetId}:`, error);
        throw error;
    }
}

// PROCESAMIENTO PARALELO DE DATA2
async function procesarData2Optimizado(data2Values, distribucionData, soportesData, siesaData, rangoFechas, registros, promosMultiplesPorDocumento) {
    const procesamientos = data2Values.map(async (r) => {
        try {
            const j = r[0];
            const tipo = j.TIPO || "";
            
            if (!currentFilters.tiposDocumento.includes(tipo.toUpperCase())) return null;
            
            const fecha = normalizeDate(j.FECHA || "");
            if (!estaDentroDelRango(fecha, rangoFechas)) return null;
            
            const pvp = parseFloat(normalizePVP(j.PVP || ""));
            const linea = normalizeLinea(j.LINEA || "");
            const documento = "REC" + normalizeDocumento(j.A || "");
            const lote = Number(j.LOTE) || 0;
            const referencia = j.REFERENCIA || "";
            const refprov = String(j.REFPROV || "");
            const descripcion = j.DESCRIPCIÓN || "";
            const prenda = j.PRENDA || "";
            const genero = j.GENERO || "";
            
            // Procesar anexos PROMO optimizado
            if (j.ANEXOS && Array.isArray(j.ANEXOS)) {
                await procesarAnexosPromoOptimizado(j.ANEXOS, documento, fecha, lote, descripcion, pvp, prenda, genero, linea, soportesData, siesaData, registros, promosMultiplesPorDocumento);
            }
            
            // Procesar FULL optimizado
            if (tipo.toUpperCase() === "FULL") {
                await procesarFullOptimizado(documento, fecha, lote, refprov, descripcion, referencia, tipo, pvp, prenda, genero, linea, distribucionData, soportesData, siesaData, registros);
            }
            
            return true;
        } catch (e) {
            console.error('Error procesando registro DATA2:', e);
            return null;
        }
    });

    await Promise.allSettled(procesamientos);
}

// PROCESAMIENTO OPTIMIZADO DE ANEXOS PROMO
async function procesarAnexosPromoOptimizado(anexos, documento, fecha, lote, descripcion, pvp, prenda, genero, linea, soportesData, siesaData, registros, promosMultiplesPorDocumento) {
    const promos = anexos.filter(anexo => anexo.TIPO === "PROMO");
    
    if (promos.length === 0) return;
    
    const referenciasUnicas = [...new Set(promos.map(promo => promo.DOCUMENTO || documento))];
    
    if (referenciasUnicas.length > 1) {
        // AGRUPAR MÚLTIPLES REFERENCIAS
        if (!promosMultiplesPorDocumento[documento]) {
            promosMultiplesPorDocumento[documento] = {
                documento: documento,
                fecha: fecha,
                lote: lote,
                descripcion: descripcion,
                pvp: pvp,
                prenda: prenda,
                genero: genero,
                linea: linea,
                referencias: {},
                cantidadTotal: 0,
                datosBase: {
                    proveedor: getProveedorByLinea(linea),
                    clase: getClaseByPVP(pvp),
                    clientePromo: "EL TEMPLO DE LA MODA SAS",
                    nitPromo: "805027653"
                }
            };
        }
        
        promos.forEach(promo => {
            const refPromo = promo.DOCUMENTO || documento;
            const cantidadPromo = Number(promo.CANTIDAD) || 0;
            
            if (cantidadPromo > 0) {
                if (!promosMultiplesPorDocumento[documento].referencias[refPromo]) {
                    promosMultiplesPorDocumento[documento].referencias[refPromo] = 0;
                }
                promosMultiplesPorDocumento[documento].referencias[refPromo] += cantidadPromo;
                promosMultiplesPorDocumento[documento].cantidadTotal += cantidadPromo;
            }
        });
    } else {
        // UNA SOLA REFERENCIA
        const refPromoUnica = referenciasUnicas[0];
        const cantidadTotalUnica = promos.reduce((sum, promo) => sum + (Number(promo.CANTIDAD) || 0), 0);
        
        if (cantidadTotalUnica > 0) {
            await crearRegistroPromoIndividual(documento, fecha, lote, descripcion, pvp, prenda, genero, linea, refPromoUnica, cantidadTotalUnica, soportesData, siesaData, registros);
        }
    }
}

// PROCESAMIENTO OPTIMIZADO DE FULL
async function procesarFullOptimizado(documento, fecha, lote, refprov, descripcion, referencia, tipo, pvp, prenda, genero, linea, distribucionData, soportesData, siesaData, registros) {
    const distribucionDoc = distribucionData[documento];
    
    if (!distribucionDoc || !distribucionDoc.clientes) return;
    
    const procesamientosClientes = Object.entries(distribucionDoc.clientes)
        .filter(([_, infoCliente]) => infoCliente.cantidad_total > 0 && currentFilters.clientes.includes(infoCliente.nit))
        .map(async ([nombreCliente, infoCliente]) => {
            const soporteInfo = buscarSoporte(soportesData, documento, infoCliente.cantidad_total, infoCliente.nit);
            const siesaInfo = buscarSiesa(siesaData, refprov, infoCliente.nit, infoCliente.cantidad_total, lote);
            const estado = calcularEstado(soporteInfo ? soporteInfo.factura : "", siesaInfo ? siesaInfo.nro_documento : "");
            
            if (!currentFilters.estados.includes(estado)) return null;
            
            const tipoDocumento = obtenerTipoDocumento(siesaInfo ? siesaInfo.nro_documento : "");
            const key = `${documento}-${infoCliente.nit}`;
            const validacion = calcularValidacion(lote, siesaInfo ? siesaInfo.lote : "");
            const clase = getClaseByPVP(pvp);
            const proveedor = getProveedorByLinea(linea);
            const proveedorFiltro = proveedor.includes("ANGELES") ? "ANGELES" : "UNIVERSO";
            
            if (!currentFilters.clases.includes(clase) || !currentFilters.proveedores.includes(proveedorFiltro)) {
                return null;
            }
            
            return {
                DOCUMENTO: documento,
                FECHA: fecha,
                LOTE: lote,
                REFPROV: refprov,
                DESCRIPCION: descripcion,
                REFERENCIA: referencia,
                TIPO: tipo,
                PVP: pvp,
                PRENDA: prenda,
                GENERO: genero,
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
                KEY: key,
                VALIDACION: validacion,
                ES_PROMO: false,
                DOCUMENTO_PADRE: documento,
                TIPO_DOCUMENTO: tipoDocumento
            };
        });
    
    const resultados = await Promise.allSettled(procesamientosClientes);
    resultados.forEach(resultado => {
        if (resultado.status === 'fulfilled' && resultado.value) {
            registros.push(resultado.value);
        }
    });
}

// PROCESAMIENTO OPTIMIZADO DE PROMOS MÚLTIPLES
async function procesarPromosMultiplesOptimizado(promosMultiplesPorDocumento, soportesData, siesaData, registros) {
    const procesamientos = Object.entries(promosMultiplesPorDocumento).map(async ([documento, promoAgrupada]) => {
        const referenciasConcatenadas = Object.entries(promoAgrupada.referencias)
            .map(([ref, cant]) => `${ref}-${cant}`)
            .join(',');
        
        const soporteInfo = buscarSoporte(soportesData, documento, promoAgrupada.cantidadTotal, promoAgrupada.datosBase.nitPromo);
        const primeraRef = Object.keys(promoAgrupada.referencias)[0];
        const siesaInfo = buscarSiesa(siesaData, primeraRef, promoAgrupada.datosBase.nitPromo, promoAgrupada.cantidadTotal, promoAgrupada.lote);
        const estado = calcularEstado(soporteInfo ? soporteInfo.factura : "", siesaInfo ? siesaInfo.nro_documento : "");
        
        if (!currentFilters.estados.includes(estado)) return null;
        
        const tipoDocumento = obtenerTipoDocumento(siesaInfo ? siesaInfo.nro_documento : "");
        const key = `${documento}-${promoAgrupada.datosBase.nitPromo}`;
        const validacion = calcularValidacion(promoAgrupada.lote, siesaInfo ? siesaInfo.lote : "");
        const clase = promoAgrupada.datosBase.clase;
        const proveedor = promoAgrupada.datosBase.proveedor;
        const proveedorFiltro = proveedor.includes("ANGELES") ? "ANGELES" : "UNIVERSO";
        
        if (!currentFilters.clases.includes(clase) || !currentFilters.proveedores.includes(proveedorFiltro)) {
            return null;
        }
        
        return {
            DOCUMENTO: documento,
            FECHA: promoAgrupada.fecha,
            LOTE: promoAgrupada.lote,
            REFPROV: "RefVar",
            DESCRIPCION: promoAgrupada.descripcion,
            REFERENCIA: referenciasConcatenadas,
            TIPO: "PROMO",
            PVP: promoAgrupada.pvp,
            PRENDA: promoAgrupada.prenda,
            GENERO: promoAgrupada.genero,
            PROVEEDOR: proveedor,
            CLASE: clase,
            FUENTE: "SISPRO",
            NIT: promoAgrupada.datosBase.nitPromo,
            CLIENTE: promoAgrupada.datosBase.clientePromo,
            CANTIDAD: promoAgrupada.cantidadTotal,
            FACTURA: soporteInfo ? soporteInfo.factura : "",
            URL_IH3: soporteInfo ? soporteInfo.url_ih3 : "",
            SIESA_ESTADO: siesaInfo ? siesaInfo.estado : "",
            SIESA_NRO_DOCUMENTO: siesaInfo ? siesaInfo.nro_documento : "",
            SIESA_FECHA: siesaInfo ? siesaInfo.fecha : "",
            SIESA_CANTIDAD_INV: siesaInfo ? siesaInfo.cantidad_inv : 0,
            SIESA_LOTE: siesaInfo ? siesaInfo.lote : "",
            ESTADO: estado,
            KEY: key,
            VALIDACION: validacion,
            ES_PROMO: true,
            DOCUMENTO_PROMO: referenciasConcatenadas,
            DOCUMENTO_PADRE: documento,
            TIPO_DOCUMENTO: tipoDocumento
        };
    });
    
    const resultados = await Promise.allSettled(procesamientos);
    resultados.forEach(resultado => {
        if (resultado.status === 'fulfilled' && resultado.value) {
            registros.push(resultado.value);
        }
    });
}

// PROCESAMIENTO OPTIMIZADO DE REC (DATABASE)
async function procesarRecOptimizado(recValues, distribucionData, soportesData, siesaData, rangoFechas, registros) {
    // Pre-procesar datos para búsquedas más eficientes
    const recDataPorLote = {};
    recValues.forEach(row => {
        const lote = Number(row[8]) || 0;
        if (lote > 0) {
            if (!recDataPorLote[lote]) {
                recDataPorLote[lote] = [];
            }
            recDataPorLote[lote].push(row);
        }
    });

    const procesamientos = recValues.map(async (row) => {
        try {
            const tipo = row[27] || "";
            if (!currentFilters.tiposDocumento.includes(tipo.toUpperCase())) return null;
            
            const cantidad = Number(row[18]) || 0;
            if (cantidad <= 0) return null;
            
            const fecha = normalizeDate(row[1] || "");
            if (!estaDentroDelRango(fecha, rangoFechas)) return null;
            
            const pvp = parseFloat(normalizePVP(row[31] || ""));
            const linea = normalizeLinea(row[3] || "");
            const documento = "REC" + normalizeDocumento(String(row[0] || ""));
            const lote = Number(row[8]) || 0;
            const referencia = row[26] || "";
            const refprov = String(row[6] || "");
            const descripcion = row[9] || "";
            const prenda = row[29] || "";
            const genero = row[30] || "";
            
            if (tipo.toUpperCase() === "PROMO") {
                const registroPromo = await procesarPromoRecOptimizado(row, documento, fecha, lote, refprov, descripcion, referencia, tipo, pvp, prenda, genero, linea, cantidad, soportesData, siesaData, recDataPorLote);
                if (registroPromo) {
                    registros.push(registroPromo);
                }
                return registroPromo;
            } else if (tipo.toUpperCase() === "FULL") {
                return await procesarFullRecOptimizado(documento, fecha, lote, refprov, descripcion, referencia, tipo, pvp, prenda, genero, linea, distribucionData, soportesData, siesaData, registros);
            }
            
            return null;
        } catch (e) {
            console.error('Error procesando registro REC:', e);
            return null;
        }
    });
    
    await Promise.allSettled(procesamientos);
}

// FUNCIONES AUXILIARES OPTIMIZADAS (se mantienen igual pero con procesamiento paralelo donde sea posible)

// Las funciones auxiliares restantes se mantienen igual que en tu código original:
// obtenerTipoDocumento, crearRegistroPromoIndividual, obtenerDatosSIESA, buscarSiesa, 
// calcularEstado, calcularValidacion, obtenerDatosDistribucion, obtenerDatosSoportes,
// procesarDistribucionCliente, buscarSoporte, calcularRangoFechas, formatDate,
// estaDentroDelRango, normalizeLinea, normalizePVP, normalizeDocumento, normalizeDate,
// getProveedorByLinea, getClaseByPVP, normalizarNitDesdeRazonSocial, normalizarFechaSiesa,
// calcularLoteSiesa, extraerNumeroLote, limpiarTextoCSV, formatoNumeroExcel,
// showLoading, showStatus, normalizarReferencia

// GENERACIÓN DE CSV OPTIMIZADA
function generarYDescargarCSV(datos, tipo) {
    const headers = [
        'DOCUMENTO', 'FECHA', 'LOTE', 'REFPROV', 'DESCRIPCION', 'REFERENCIA', 
        'TIPO', 'PVP', 'PRENDA', 'GENERO', 'PROVEEDOR', 'CLASE', 'FUENTE', 
        'NIT', 'CLIENTE', 'CANTIDAD', 'FACTURA', 'URL_IH3', 'SIESA_ESTADO', 
        'SIESA_NRO_DOCUMENTO', 'SIESA_FECHA', 'SIESA_CANTIDAD_INV', 'ESTADO', 
        'KEY', 'VALIDACION', 'SIESA_LOTE', 'ES_PROMO', 'DOCUMENTO_PROMO', 
        'DOCUMENTO_PADRE', 'DOCUMENTO_ORIGINAL', 'TIPO_DOCUMENTO'
    ];

    // Usar Array.join para mejor performance en grandes volúmenes
    const csvRows = datos.map(registro => 
        headers.map(header => {
            const value = registro[header];
            if (header === 'DESCRIPCION' || header === 'CLIENTE') {
                return limpiarTextoCSV(value || '');
            } else if (header === 'PVP') {
                return formatoNumeroExcel(value);
            } else if (header === 'VALIDACION') {
                return value ? 'VERDADERO' : 'FALSO';
            } else if (header === 'ES_PROMO') {
                return value ? 'SI' : 'NO';
            }
            return value || '';
        }).join(';')
    );

    const csvContent = '\uFEFF' + headers.join(';') + '\r\n' + csvRows.join('\r\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    const fecha = new Date().toISOString().split('T')[0];
    const nombreArchivo = `datos_completo_${fecha}.csv`;
        
    link.setAttribute('href', url);
    link.setAttribute('download', nombreArchivo);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    const totalPromos = datos.filter(r => r.ES_PROMO).length;
    const promosMultiples = datos.filter(r => r.ES_PROMO && r.REFPROV === "RefVar").length;
    const promosIndividuales = totalPromos - promosMultiples;
    
    showStatus('success', `Archivo generado: ${datos.length} registros (${totalPromos} PROMOS - ${promosMultiples} múltiples, ${promosIndividuales} individuales)`);
}

// FUNCIÓN CORREGIDA PARA OBTENER TIPO DE DOCUMENTO BASADO EN FACTURA SIESA
function obtenerTipoDocumento(facturaSiesa) {
    const facturaString = String(facturaSiesa || "").toUpperCase().trim();
    
    if (!facturaString) {
        return ""; // Espacio en blanco si no hay factura SIESA
    }
    
    if (facturaString.startsWith('008') || facturaString.startsWith('034')) {
        return "DEVOLUCIONES";
    } else if (facturaString.startsWith('017') || facturaString.startsWith('029')) {
        return "REMISIONES";
    } else if (facturaString.startsWith('FEV') || facturaString.startsWith('FVE')) {
        return "OFICIALES";
    } else if (facturaString.startsWith('NEC')) {
        return "NOTA CREDITO";
    } else {
        return ""; // Espacio en blanco si no coincide con ninguno
    }
}

// CREAR REGISTRO PROMO INDIVIDUAL OPTIMIZADO
async function crearRegistroPromoIndividual(documento, fecha, lote, descripcion, pvp, prenda, genero, linea, refPromoUnica, cantidadTotalUnica, soportesData, siesaData, registros) {
    const clientePromo = "EL TEMPLO DE LA MODA SAS";
    const nitPromo = "805027653";
    
    const soporteInfo = buscarSoporte(soportesData, documento, cantidadTotalUnica, nitPromo);
    const siesaInfo = buscarSiesa(siesaData, refPromoUnica, nitPromo, cantidadTotalUnica, lote);
    const estado = calcularEstado(
        soporteInfo ? soporteInfo.factura : "", 
        siesaInfo ? siesaInfo.nro_documento : ""
    );
    
    if (!currentFilters.estados.includes(estado)) return;
    
    const tipoDocumento = obtenerTipoDocumento(siesaInfo ? siesaInfo.nro_documento : "");
    
    const key = `${documento}-${nitPromo}`;
    const validacion = calcularValidacion(lote, siesaInfo ? siesaInfo.lote : "");
    
    const clase = getClaseByPVP(pvp);
    if (!currentFilters.clases.includes(clase)) return;
    
    const proveedor = getProveedorByLinea(linea);
    const proveedorFiltro = proveedor.includes("ANGELES") ? "ANGELES" : "UNIVERSO";
    if (!currentFilters.proveedores.includes(proveedorFiltro)) return;
    
    const registroPromo = {
        DOCUMENTO: documento,
        FECHA: fecha,
        LOTE: lote,
        REFPROV: refPromoUnica,
        DESCRIPCION: descripcion,
        REFERENCIA: refPromoUnica,
        TIPO: "PROMO",
        PVP: pvp,
        PRENDA: prenda,
        GENERO: genero,
        PROVEEDOR: proveedor,
        CLASE: clase, 
        FUENTE: "SISPRO",
        NIT: nitPromo,
        CLIENTE: clientePromo,
        CANTIDAD: cantidadTotalUnica,
        FACTURA: soporteInfo ? soporteInfo.factura : "",
        URL_IH3: soporteInfo ? soporteInfo.url_ih3 : "",
        SIESA_ESTADO: siesaInfo ? siesaInfo.estado : "",
        SIESA_NRO_DOCUMENTO: siesaInfo ? siesaInfo.nro_documento : "",
        SIESA_FECHA: siesaInfo ? siesaInfo.fecha : "",
        SIESA_CANTIDAD_INV: siesaInfo ? siesaInfo.cantidad_inv : 0,
        SIESA_LOTE: siesaInfo ? siesaInfo.lote : "",
        ESTADO: estado,
        KEY: key,
        VALIDACION: validacion,
        ES_PROMO: true,
        DOCUMENTO_PROMO: refPromoUnica,
        DOCUMENTO_PADRE: documento,
        TIPO_DOCUMENTO: tipoDocumento
    };
    
    registros.push(registroPromo);
}

// PROCESAR PROMO REC OPTIMIZADO
async function procesarPromoRecOptimizado(row, documento, fecha, lote, refprov, descripcion, referencia, tipo, pvp, prenda, genero, linea, cantidad, soportesData, siesaData, recDataPorLote) {
    let documentoPrincipal = documento;
    
    const mismoLote = Number(row[8]) || 0;
    
    // BÚSQUEDA OPTIMIZADA POR LOTE
    if (mismoLote > 0 && recDataPorLote[mismoLote]) {
        const registroFullMismoLote = recDataPorLote[mismoLote].find(r => {
            const rTipo = r[27] || "";
            return rTipo.toUpperCase() === "FULL";
        });
        
        if (registroFullMismoLote) {
            documentoPrincipal = "REC" + normalizeDocumento(String(registroFullMismoLote[0] || ""));
        }
    }
    
    const clientePromo = "EL TEMPLO DE LA MODA SAS";
    const nitPromo = "805027653";
    
    const soporteInfo = buscarSoporte(soportesData, documentoPrincipal, cantidad, nitPromo);
    const siesaInfo = buscarSiesa(siesaData, refprov, nitPromo, cantidad, lote);
    const estado = calcularEstado(
        soporteInfo ? soporteInfo.factura : "", 
        siesaInfo ? siesaInfo.nro_documento : ""
    );
    
    if (!currentFilters.estados.includes(estado)) return null;
    
    const tipoDocumento = obtenerTipoDocumento(siesaInfo ? siesaInfo.nro_documento : "");
    
    const key = `${documentoPrincipal}-${nitPromo}`;
    const validacion = calcularValidacion(lote, siesaInfo ? siesaInfo.lote : "");
    
    const clase = getClaseByPVP(pvp);
    if (!currentFilters.clases.includes(clase)) return null;
    
    const proveedor = getProveedorByLinea(linea);
    const proveedorFiltro = proveedor.includes("ANGELES") ? "ANGELES" : "UNIVERSO";
    if (!currentFilters.proveedores.includes(proveedorFiltro)) return null;
    
    if (!currentFilters.fuentesDatos.includes("BUSINT")) return null;
    
    return {
        DOCUMENTO: documentoPrincipal,
        FECHA: fecha,
        LOTE: lote,
        REFPROV: refprov,
        DESCRIPCION: descripcion,
        REFERENCIA: referencia,
        TIPO: tipo,
        PVP: pvp,
        PRENDA: prenda,
        GENERO: genero,
        PROVEEDOR: proveedor,
        CLASE: clase,
        FUENTE: "BUSINT",
        NIT: nitPromo,
        CLIENTE: clientePromo,
        CANTIDAD: cantidad,
        FACTURA: soporteInfo ? soporteInfo.factura : "",
        URL_IH3: soporteInfo ? soporteInfo.url_ih3 : "",
        SIESA_ESTADO: siesaInfo ? siesaInfo.estado : "",
        SIESA_NRO_DOCUMENTO: siesaInfo ? siesaInfo.nro_documento : "",
        SIESA_FECHA: siesaInfo ? siesaInfo.fecha : "",
        SIESA_CANTIDAD_INV: siesaInfo ? siesaInfo.cantidad_inv : 0,
        SIESA_LOTE: siesaInfo ? siesaInfo.lote : "",
        ESTADO: estado,
        KEY: key,
        VALIDACION: validacion,
        ES_PROMO: true,
        DOCUMENTO_PROMO: referencia,
        DOCUMENTO_PADRE: documentoPrincipal,
        DOCUMENTO_ORIGINAL: documento,
        TIPO_DOCUMENTO: tipoDocumento
    };
}

// PROCESAR FULL REC OPTIMIZADO
async function procesarFullRecOptimizado(documento, fecha, lote, refprov, descripcion, referencia, tipo, pvp, prenda, genero, linea, distribucionData, soportesData, siesaData, registros) {
    const distribucionDoc = distribucionData[documento];
    
    if (!distribucionDoc || !distribucionDoc.clientes) return null;
    
    const procesamientos = Object.entries(distribucionDoc.clientes)
        .filter(([_, infoCliente]) => infoCliente.cantidad_total > 0 && currentFilters.clientes.includes(infoCliente.nit))
        .map(async ([nombreCliente, infoCliente]) => {
            const soporteInfo = buscarSoporte(soportesData, documento, infoCliente.cantidad_total, infoCliente.nit);
            const siesaInfo = buscarSiesa(siesaData, refprov, infoCliente.nit, infoCliente.cantidad_total, lote);
            const estado = calcularEstado(
                soporteInfo ? soporteInfo.factura : "", 
                siesaInfo ? siesaInfo.nro_documento : ""
            );
            
            if (!currentFilters.estados.includes(estado)) return null;
            
            const tipoDocumento = obtenerTipoDocumento(siesaInfo ? siesaInfo.nro_documento : "");
            
            const key = `${documento}-${infoCliente.nit}`;
            const validacion = calcularValidacion(lote, siesaInfo ? siesaInfo.lote : "");
            
            const clase = getClaseByPVP(pvp);
            if (!currentFilters.clases.includes(clase)) return null;
            
            const proveedor = getProveedorByLinea(linea);
            const proveedorFiltro = proveedor.includes("ANGELES") ? "ANGELES" : "UNIVERSO";
            if (!currentFilters.proveedores.includes(proveedorFiltro)) return null;
            
            if (!currentFilters.fuentesDatos.includes("BUSINT")) return null;
            
            const registro = {
                DOCUMENTO: documento,
                FECHA: fecha,
                LOTE: lote,
                REFPROV: refprov,
                DESCRIPCION: descripcion,
                REFERENCIA: referencia,
                TIPO: tipo,
                PVP: pvp,
                PRENDA: prenda,
                GENERO: genero,
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
                KEY: key,
                VALIDACION: validacion,
                ES_PROMO: false,
                DOCUMENTO_PADRE: documento,
                DOCUMENTO_ORIGINAL: documento,
                TIPO_DOCUMENTO: tipoDocumento
            };
            
            registros.push(registro);
            return registro;
        });
    
    const resultados = await Promise.allSettled(procesamientos);
    return resultados.filter(r => r.status === 'fulfilled' && r.value).length > 0;
}

// OBTENER DATOS SIESA OPTIMIZADO
async function obtenerDatosSIESA() {
    try {
        // Cargar ambas hojas en paralelo
        const [siesaResp, siesaV2Resp] = await Promise.all([
            fetchSheetDataOptimized(SPREADSHEET_IDS.SIESA, "SIESA!A2:G", false),
            fetchSheetDataOptimized(SPREADSHEET_IDS.SIESA, "SIESA_V2!A2:D", false)
        ]);
        
        const siesaData = {};
        const siesaV2Data = {};
        
        // Procesar SIESA principal en paralelo
        const procesamientosSiesa = (siesaResp.values || []).map(async (row) => {
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
        
        // Procesar SIESA_V2 en paralelo
        const procesamientosSiesaV2 = (siesaV2Resp.values || []).map(async row => {
            const nroDocumento = String(row[0] || "").trim();
            if (nroDocumento) {
                if (!siesaV2Data[nroDocumento]) {
                    siesaV2Data[nroDocumento] = {};
                }
                
                const referencia = normalizarReferencia(row[2]);
                const cantidad = Number(row[3]) || 0;
                
                if (referencia) {
                    if (!siesaV2Data[nroDocumento][referencia]) {
                        siesaV2Data[nroDocumento][referencia] = 0;
                    }
                    siesaV2Data[nroDocumento][referencia] += cantidad;
                }
            }
        });
        
        await Promise.allSettled([...procesamientosSiesa, ...procesamientosSiesaV2]);
        
        const datosUnificados = {};
        
        // Procesar unificación en paralelo
        const procesamientosUnificacion = Object.entries(siesaData).map(async ([nroDocumento, datosSiesa]) => {
            const itemsV2 = siesaV2Data[nroDocumento] || {};
            const loteSiesa = datosSiesa.lote;
            const nit = String(datosSiesa.nit || "").trim();
            
            if (!nit || !loteSiesa) return;
            
            const referencias = Object.keys(itemsV2);
            const cantidadReferencias = referencias.length;
            
            if (cantidadReferencias === 0) return;
            
            if (cantidadReferencias === 1) {
                const referencia = referencias[0];
                const cantidadTotal = itemsV2[referencia];
                
                if (cantidadTotal > 0) {
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
                        compaa: datosSiesa.compaa,
                        es_refvar: false
                    };
                }
            } else {
                const cantidadTotal = Object.values(itemsV2).reduce((sum, cant) => sum + cant, 0);
                
                if (cantidadTotal > 0) {
                    const clave = `RefVar_${nit}_${cantidadTotal}_${loteSiesa}`;
                    
                    const referenciasConcatenadas = referencias
                        .map(ref => `${ref}-${itemsV2[ref]}`)
                        .join(',');
                    
                    datosUnificados[clave] = {
                        estado: datosSiesa.estado,
                        nro_documento: datosSiesa.nro_documento,
                        fecha: datosSiesa.fecha,
                        cantidad_inv: cantidadTotal,
                        referencia: "RefVar",
                        referencias_detalle: referenciasConcatenadas,
                        nit: nit,
                        lote: loteSiesa,
                        docto_referencia: datosSiesa.docto_referencia,
                        notas: datosSiesa.notas,
                        compaa: datosSiesa.compaa,
                        es_refvar: true,
                        cantidad_referencias: cantidadReferencias
                    };
                }
            }
        });
        
        await Promise.allSettled(procesamientosUnificacion);
        
        console.log(`Datos SIESA unificados: ${Object.keys(datosUnificados).length} registros`);
        
        return datosUnificados;
        
    } catch (error) {
        console.error("Error obteniendo datos de SIESA:", error);
        return {};
    }
}

// BUSCAR SIESA OPTIMIZADO
function buscarSiesa(siesaData, refprov, nit, cantidad, lote) {
    const CLIENTES_FILTRADOS = ["900047252", "805027653"];
    if (!CLIENTES_FILTRADOS.includes(nit)) {
        return null;
    }
    
    const refprovLimpio = normalizarReferencia(refprov);
    const nitLimpio = String(nit || "").trim();
    const cantidadLimpia = Number(cantidad) || 0;
    const loteLimpio = String(lote || "").trim().replace(/\D/g, "");
    
    if (!refprovLimpio || !nitLimpio || cantidadLimpia <= 0 || !loteLimpio) {
        return null;
    }

    // BUSCAR CON REFERENCIA ORIGINAL NORMALIZADA
    const claveOriginal = `${refprovLimpio}_${nitLimpio}_${cantidadLimpia}_${loteLimpio}`;
    
    if (siesaData[claveOriginal]) {
        return siesaData[claveOriginal];
    }
    
    // BUSCAR CON "RefVar" (para múltiples referencias)
    const claveRefVar = `RefVar_${nitLimpio}_${cantidadLimpia}_${loteLimpio}`;
    
    if (siesaData[claveRefVar]) {
        return siesaData[claveRefVar];
    }
    
    return null;
}

// FUNCIONES DE CÁLCULO OPTIMIZADAS
function calcularEstado(factura, siesaNroDocumento) {
    const facturaLimpia = String(factura || "").trim();
    const siesaLimpio = String(siesaNroDocumento || "").trim();
    
    if (!facturaLimpia && !siesaLimpio) {
        return "SIN DATOS";
    }
    
    if (facturaLimpia && siesaLimpio) {
        return facturaLimpia === siesaLimpio ? "ENTREGADO" : "VALIDAR";
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

// OBTENER DATOS DISTRIBUCIÓN OPTIMIZADO
async function obtenerDatosDistribucion() {
    try {
        const distribucionResp = await fetchSheetDataOptimized(SPREADSHEET_IDS.DISTRIBUCION, "DATA!A1:C", false);
        const distribucionData = {};
        
        const procesamientos = (distribucionResp.values || []).map(async (row, index) => {
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
        
        await Promise.allSettled(procesamientos);
        
        return distribucionData;
    } catch (error) {
        console.error("Error obteniendo datos de distribución:", error);
        return {};
    }
}

// OBTENER DATOS SOPORTES OPTIMIZADO
async function obtenerDatosSoportes() {
    try {
        const soportesResp = await fetchSheetDataOptimized(SPREADSHEET_IDS.SOPORTES, "SOPORTES!A2:I", false);
        const soportesData = {};
        
        const procesamientos = (soportesResp.values || []).map(async row => {
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
        
        await Promise.allSettled(procesamientos);
        
        return soportesData;
    } catch (error) {
        console.error("Error obteniendo datos de soportes:", error);
        return {};
    }
}

// PROCESAR DISTRIBUCIÓN CLIENTE OPTIMIZADO
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

// BUSCAR SOPORTE OPTIMIZADO
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

// FUNCIONES DE NORMALIZACIÓN Y FORMATO
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

function showLoading(show) {
    loadingElement.style.display = show ? 'block' : 'none';
    downloadBtn.disabled = show;
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

function normalizarReferencia(ref) {
    if (!ref) return "";
    
    const refString = String(ref).trim();
    
    if (/^\d+[A-Za-z]*$/.test(refString)) {
        const parteNumerica = refString.match(/^\d+/);
        if (parteNumerica) {
            const numerosSinCeros = String(Number(parteNumerica[0]));
            const parteLetras = refString.substring(parteNumerica[0].length);
            return numerosSinCeros + parteLetras;
        }
    }
    
    return refString;
}