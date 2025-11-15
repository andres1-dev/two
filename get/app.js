// app.js
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
    "ZULUAGA GOMEZ RUBEN ESTEBAN": "1007348825"
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
    // Establecer fechas por defecto (último mes)
    const rangoFechas = calcularRangoFechas();
    currentFilters.fechaInicio = rangoFechas.fechaInicio;
    currentFilters.fechaFin = rangoFechas.fechaFin;
    
    // Event Listeners
    downloadBtn.addEventListener('click', downloadCSV);
});

// Función principal para descargar CSV
async function downloadCSV() {
    try {
        showLoading(true);
        showStatus('info', 'Iniciando carga de datos...');
        
        const data = await obtenerDatosConDistribucion();
        currentData = data.data;
        
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

// Función para obtener datos con distribución - VERSIÓN COMPLETA CORREGIDA
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
    const promosMultiplesPorDocumento = {}; // SOLO para promos con múltiples referencias

    // Procesar DATA2
    const data2Resp = await fetchSheetData(SPREADSHEET_IDS.DATA2, "DATA2!S2:S");
    (data2Resp.values || []).forEach(r => {
        try {
            const j = JSON.parse(r[0]);
            const tipo = j.TIPO || "";
            
            if (!currentFilters.tiposDocumento.includes(tipo.toUpperCase())) return;
            
            const fecha = normalizeDate(j.FECHA || "");
            if (!estaDentroDelRango(fecha, rangoFechas)) return;
            
            const pvp = parseFloat(normalizePVP(j.PVP || ""));
            const linea = normalizeLinea(j.LINEA || "");
            const documento = "REC" + normalizeDocumento(j.A || "");
            const lote = Number(j.LOTE) || 0;
            const referencia = j.REFERENCIA || "";
            const refprov = String(j.REFPROV || "");
            const descripcion = j.DESCRIPCIÓN || "";
            const prenda = j.PRENDA || "";
            const genero = j.GENERO || "";
            
            // PROCESAR ANEXOS PROMO SI EXISTEN
            if (j.ANEXOS && Array.isArray(j.ANEXOS)) {
                const promos = j.ANEXOS.filter(anexo => anexo.TIPO === "PROMO");
                
                if (promos.length > 0) {
                    // SOLO AGRUPAR SI HAY MÚLTIPLES REFERENCIAS DIFERENTES
                    const referenciasUnicas = [...new Set(promos.map(promo => promo.DOCUMENTO || documento))];
                    
                    if (referenciasUnicas.length > 1) {
                        console.log(`📦 Documento ${documento} tiene ${referenciasUnicas.length} referencias PROMO:`, referenciasUnicas);
                        
                        // AGRUPAR PARA MÚLTIPLES REFERENCIAS
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
                        
                        // Agregar cada promo al grupo
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
                        
                        console.log(`✅ Agrupado documento ${documento}:`, promosMultiplesPorDocumento[documento]);
                        
                    } else {
                        // UNA SOLA REFERENCIA - PROCESAR INDIVIDUALMENTE
                        const refPromoUnica = referenciasUnicas[0];
                        const cantidadTotalUnica = promos.reduce((sum, promo) => sum + (Number(promo.CANTIDAD) || 0), 0);
                        
                        if (cantidadTotalUnica > 0) {
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
                                REFPROV: refPromoUnica, // REFERENCIA INDIVIDUAL
                                DESCRIPCION: descripcion,
                                REFERENCIA: refPromoUnica, // REFERENCIA INDIVIDUAL
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
                            console.log(`✅ PROMO individual agregada: ${documento} - ${refPromoUnica} - ${cantidadTotalUnica}`);
                        }
                    }
                }
            }
            
            // PROCESAR REGISTRO FULL PRINCIPAL (solo si es FULL)
            if (tipo.toUpperCase() === "FULL") {
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
                            
                            if (!currentFilters.estados.includes(estado)) continue;
                            
                            const tipoDocumento = obtenerTipoDocumento(siesaInfo ? siesaInfo.nro_documento : "");
                            
                            const key = `${documento}-${infoCliente.nit}`;
                            const validacion = calcularValidacion(lote, siesaInfo ? siesaInfo.lote : "");
                            
                            const clase = getClaseByPVP(pvp);
                            if (!currentFilters.clases.includes(clase)) continue;
                            
                            const proveedor = getProveedorByLinea(linea);
                            const proveedorFiltro = proveedor.includes("ANGELES") ? "ANGELES" : "UNIVERSO";
                            if (!currentFilters.proveedores.includes(proveedorFiltro)) continue;
                            
                            registros.push({
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
                            });
                        }
                    }
                }
            }
            
        } catch (e) {
            console.error('Error procesando registro DATA2:', e);
        }
    });

    // PROCESAR PROMOS MÚLTIPLES AGRUPADAS DE DATA2
    console.log(`🔍 Procesando ${Object.keys(promosMultiplesPorDocumento).length} documentos con promos múltiples:`, Object.keys(promosMultiplesPorDocumento));
    
    for (const [documento, promoAgrupada] of Object.entries(promosMultiplesPorDocumento)) {
        const referenciasConcatenadas = Object.entries(promoAgrupada.referencias)
            .map(([ref, cant]) => `${ref}-${cant}`)
            .join(',');
        
        console.log(`📊 Procesando promo múltiple ${documento}:`, promoAgrupada.referencias, `-> ${referenciasConcatenadas}`);
        
        const soporteInfo = buscarSoporte(soportesData, documento, promoAgrupada.cantidadTotal, promoAgrupada.datosBase.nitPromo);
        
        // Para SIESA, usar la primera referencia
        const primeraRef = Object.keys(promoAgrupada.referencias)[0];
        const siesaInfo = buscarSiesa(siesaData, primeraRef, promoAgrupada.datosBase.nitPromo, promoAgrupada.cantidadTotal, promoAgrupada.lote);
        
        const estado = calcularEstado(
            soporteInfo ? soporteInfo.factura : "", 
            siesaInfo ? siesaInfo.nro_documento : ""
        );
        
        if (!currentFilters.estados.includes(estado)) {
            console.log(`❌ Filtro estado: ${documento} con estado ${estado} no pasa filtros`);
            continue;
        }
        
        const tipoDocumento = obtenerTipoDocumento(siesaInfo ? siesaInfo.nro_documento : "");
        
        const key = `${documento}-${promoAgrupada.datosBase.nitPromo}`;
        const validacion = calcularValidacion(promoAgrupada.lote, siesaInfo ? siesaInfo.lote : "");
        
        const clase = promoAgrupada.datosBase.clase;
        if (!currentFilters.clases.includes(clase)) {
            console.log(`❌ Filtro clase: ${documento} con clase ${clase} no pasa filtros`);
            continue;
        }
        
        const proveedor = promoAgrupada.datosBase.proveedor;
        const proveedorFiltro = proveedor.includes("ANGELES") ? "ANGELES" : "UNIVERSO";
        if (!currentFilters.proveedores.includes(proveedorFiltro)) {
            console.log(`❌ Filtro proveedor: ${documento} con proveedor ${proveedorFiltro} no pasa filtros`);
            continue;
        }
        
        const registroPromoAgrupada = {
            DOCUMENTO: documento,
            FECHA: promoAgrupada.fecha,
            LOTE: promoAgrupada.lote,
            REFPROV: "RefVar", // REFVAR SOLO PARA MÚLTIPLES
            DESCRIPCION: promoAgrupada.descripcion,
            REFERENCIA: referenciasConcatenadas, // REFERENCIAS CONCATENADAS
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
        
        registros.push(registroPromoAgrupada);
        console.log(`✅ PROMO MÚLTIPLE AGREGADA: ${documento} - RefVar - ${referenciasConcatenadas} - ${promoAgrupada.cantidadTotal}`);
    }

    // Procesar REC (DataBase) - COMPLETO CON FULL Y PROMO
    const recResp = await fetchSheetData(SPREADSHEET_IDS.REC, "DataBase!A2:AF");
    (recResp.values || []).forEach(row => {
        const tipo = row[27] || "";
        
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
        const descripcion = row[9] || "";
        const prenda = row[29] || "";
        const genero = row[30] || "";
        
        // PROCESAR REGISTROS PROMO DE DATABASE - MANTENER ORIGINAL (NO AGRUPAR)
        if (tipo.toUpperCase() === "PROMO") {
            let documentoPrincipal = documento;
            
            const mismoLote = Number(row[8]) || 0;
            if (mismoLote > 0) {
                const registroFullMismoLote = recResp.values.find(r => {
                    const rLote = Number(r[8]) || 0;
                    const rTipo = r[27] || "";
                    return rLote === mismoLote && rTipo.toUpperCase() === "FULL";
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
            
            if (!currentFilters.estados.includes(estado)) return;
            
            const tipoDocumento = obtenerTipoDocumento(siesaInfo ? siesaInfo.nro_documento : "");
            
            const key = `${documentoPrincipal}-${nitPromo}`;
            const validacion = calcularValidacion(lote, siesaInfo ? siesaInfo.lote : "");
            
            const clase = getClaseByPVP(pvp);
            if (!currentFilters.clases.includes(clase)) return;
            
            const proveedor = getProveedorByLinea(linea);
            const proveedorFiltro = proveedor.includes("ANGELES") ? "ANGELES" : "UNIVERSO";
            if (!currentFilters.proveedores.includes(proveedorFiltro)) return;
            
            if (!currentFilters.fuentesDatos.includes("BUSINT")) return;
            
            registros.push({
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
            });
        } 
        // PROCESAR REGISTROS FULL DE DATABASE - COMPLETO
        else if (tipo.toUpperCase() === "FULL") {
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
                        
                        if (!currentFilters.estados.includes(estado)) continue;
                        
                        const tipoDocumento = obtenerTipoDocumento(siesaInfo ? siesaInfo.nro_documento : "");
                        
                        const key = `${documento}-${infoCliente.nit}`;
                        const validacion = calcularValidacion(lote, siesaInfo ? siesaInfo.lote : "");
                        
                        const clase = getClaseByPVP(pvp);
                        if (!currentFilters.clases.includes(clase)) continue;
                        
                        const proveedor = getProveedorByLinea(linea);
                        const proveedorFiltro = proveedor.includes("ANGELES") ? "ANGELES" : "UNIVERSO";
                        if (!currentFilters.proveedores.includes(proveedorFiltro)) continue;
                        
                        if (!currentFilters.fuentesDatos.includes("BUSINT")) continue;
                        
                        registros.push({
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
                        });
                    }
                }
            }
        }
    });

    console.log(`📈 Total registros procesados: ${registros.length} (Promos múltiples agrupadas: ${Object.keys(promosMultiplesPorDocumento).length})`);
    console.log(`📋 Desglose promos múltiples:`, Object.keys(promosMultiplesPorDocumento));
    
    return {
        status: "success",
        registros: registros.length,
        rangoFechas: rangoFechas,
        data: registros
    };
}

// Función para generar y descargar CSV
function generarYDescargarCSV(datos, tipo) {
    const headers = [
        'DOCUMENTO', 'FECHA', 'LOTE', 'REFPROV', 'DESCRIPCION', 'REFERENCIA', 
        'TIPO', 'PVP', 'PRENDA', 'GENERO', 'PROVEEDOR', 'CLASE', 'FUENTE', 
        'NIT', 'CLIENTE', 'CANTIDAD', 'FACTURA', 'URL_IH3', 'SIESA_ESTADO', 
        'SIESA_NRO_DOCUMENTO', 'SIESA_FECHA', 'SIESA_CANTIDAD_INV', 'ESTADO', 
        'KEY', 'VALIDACION', 'SIESA_LOTE', 'ES_PROMO', 'DOCUMENTO_PROMO', 
        'DOCUMENTO_PADRE', 'DOCUMENTO_ORIGINAL', 'TIPO_DOCUMENTO'
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
            registro.KEY,
            registro.VALIDACION ? 'VERDADERO' : 'FALSO',
            registro.SIESA_LOTE,
            registro.ES_PROMO ? 'SI' : 'NO',
            registro.DOCUMENTO_PROMO || '',
            registro.DOCUMENTO_PADRE || '',
            registro.DOCUMENTO_ORIGINAL || '',
            registro.TIPO_DOCUMENTO || ''
        ].join(';'))
    ].join('\r\n');

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
    
    // Mostrar estadísticas
    const totalPromos = datos.filter(r => r.ES_PROMO).length;
    const promosMultiples = datos.filter(r => r.ES_PROMO && r.REFPROV === "RefVar").length;
    const promosIndividuales = totalPromos - promosMultiples;
    
    showStatus('success', `Archivo generado: ${datos.length} registros (${totalPromos} PROMOS - ${promosMultiples} múltiples, ${promosIndividuales} individuales)`);
}

// ============================
// FUNCIONES AUXILIARES
// ============================

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
    
    if (siesaData[clave]) {
        return siesaData[clave];
    }
    
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