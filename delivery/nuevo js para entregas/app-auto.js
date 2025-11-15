// app-auto.js - APP AUTOEJECUTABLE CON PROMOCIONES Y DATOS PW
const API_KEY = 'AIzaSyC7hjbRc0TGLgImv8gVZg8tsOeYWgXlPcM';
const SPREADSHEET_IDS = {
    DATA2: "133NiyjNApZGkEFs4jUvpJ9So-cSEzRVeW2FblwOCrjI",
    REC: "1esc5REq0c03nHLpGcLwZRW29yq2gZnrpbz75gCCjrqc",
    DISTRIBUCION: "1d5dCCCgiWXfM6vHu3zGGKlvK2EycJtT7Uk4JqUjDOfE",
    SOPORTES: "1VaPBwgRu1QWhmsV_Qgf7cgraSxiAWRX6-wBEyUlGoJw",
    DESTINO: "1EDZ3uRjIDe2oi9F88qBNjHxuy5_S1Se4IwIDlS4EsZE", // LIBRO PW
    SIESA: "1FcQhVIKtWy4O-aGTNfA6l4C5Q4_u1LZErpj3CMglfQM"
};

// Filtros predeterminados - INCLUIR TODOS LOS CLIENTES
const DEFAULT_FILTERS = {
    fechaInicio: '',
    fechaFin: '',
    tiposDocumento: ['FULL', 'PROMO'],
    fuentesDatos: ['SISPRO', 'BUSINT'],
    clientes: ['900047252', '805027653', '901920844', '70825517', '1007348825', '14838951', '67006141'], // TODOS LOS CLIENTES
    proveedores: ['ANGELES', 'UNIVERSO'],
    estados: ['ENTREGADO', 'PENDIENTE', 'VALIDAR', 'SIN DATOS', 'ELABORACION'], // INCLUIR ELABORACION
    clases: ['LINEA', 'MODA', 'PRONTAMODA']
};

// Definición de clientes (COMPLETA)
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
let currentFilters = { ...DEFAULT_FILTERS };
let datosPW = {}; // Almacenará los datos de la hoja PW

// EJECUCIÓN AUTOMÁTICA AL CARGAR LA PÁGINA
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Iniciando app autoejecutable para JSON completo...');
    initializeApp();
});

async function initializeApp() {
    try {
        showStatus('⏳ Iniciando carga automática de datos completos...', 'info');
        
        // Establecer fechas por defecto
        const rangoFechas = calcularRangoFechas();
        currentFilters.fechaInicio = rangoFechas.fechaInicio;
        currentFilters.fechaFin = rangoFechas.fechaFin;
        
        // Ejecutar generación de JSON automáticamente
        await generateAndDownloadJSON();
        
    } catch (error) {
        console.error('Error en app autoejecutable:', error);
        showStatus(`❌ Error: ${error.message}`, 'error');
    }
}

// FUNCIÓN PRINCIPAL AUTOEJECUTABLE
async function generateAndDownloadJSON() {
    try {
        showStatus('📥 Cargando datos desde Google Sheets...', 'info');
        
        // CARGAR TODOS LOS DATOS EN PARALELO (INCLUYENDO PW)
        const [distribucionData, soportesData, siesaData, data2Resp, recResp, pwData] = await Promise.all([
            obtenerDatosDistribucion(),
            obtenerDatosSoportes(),
            obtenerDatosSIESA(),
            fetchSheetDataOptimized(SPREADSHEET_IDS.DATA2, "DATA2!S2:S", true),
            fetchSheetDataOptimized(SPREADSHEET_IDS.REC, "DataBase!A2:AF", false),
            obtenerDatosPW() // NUEVA FUNCIÓN PARA DATOS PW
        ]);

        // Almacenar datos PW globalmente
        datosPW = pwData;

        showStatus('🔧 Procesando datos para JSON completo...', 'info');
        
        const jsonData = await generarEstructuraJSONCompleta(
            data2Resp.values || [],
            recResp.values || [],
            distribucionData,
            soportesData,
            siesaData
        );

        if (jsonData.length === 0) {
            showStatus('⚠️ No hay datos para generar JSON', 'warning');
            return;
        }

        showStatus('💾 Generando y descargando archivo JSON...', 'info');
        
        // Descargar automáticamente
        descargarJSON(jsonData);
        
        showStatus('✅ JSON generado y descargado exitosamente!', 'success');
        
    } catch (error) {
        console.error('Error generando JSON:', error);
        showStatus(`❌ Error: ${error.message}`, 'error');
        throw error;
    }
}

// NUEVA FUNCIÓN PARA OBTENER DATOS DE LA HOJA PW
async function obtenerDatosPW() {
    try {
        showStatus('📋 Cargando datos de planificación semanal...', 'info');
        
        const pwResp = await fetchSheetDataOptimized(SPREADSHEET_IDS.DESTINO, "PW!B:D", false);
        const pwData = {};
        
        (pwResp.values || []).forEach(row => {
            const cliente = String(row[0] || "").trim();
            const referencia = String(row[1] || "").trim();
            const semana = String(row[2] || "").trim();
            
            if (cliente && referencia) {
                const clave = `${cliente}-${referencia}`;
                const numeroSemana = extraerNumeroSemana(semana);
                
                if (numeroSemana) {
                    pwData[clave] = numeroSemana;
                }
            }
        });
        
        console.log(`📊 Datos PW cargados: ${Object.keys(pwData).length} registros`);
        return pwData;
        
    } catch (error) {
        console.error("Error obteniendo datos de PW:", error);
        return {};
    }
}

// FUNCIÓN PARA EXTRAER NÚMERO DE SEMANA
function extraerNumeroSemana(semanaTexto) {
    if (!semanaTexto) return null;
    
    // Buscar patrones como "SEMANA 3", "SEMANA 12", etc.
    const match = semanaTexto.match(/SEMANA\s*(\d+)/i);
    if (match && match[1]) {
        return parseInt(match[1], 10);
    }
    
    // Si no encuentra el patrón, intentar extraer solo números
    const soloNumeros = semanaTexto.replace(/\D/g, "");
    if (soloNumeros) {
        const numero = parseInt(soloNumeros, 10);
        if (!isNaN(numero) && numero > 0 && numero <= 52) {
            return numero;
        }
    }
    
    return null;
}

// FUNCIÓN PARA OBTENER SEMANA DESDE DATOS PW
function obtenerSemanaPW(cliente, referencia) {
    if (!cliente || !referencia) return null;
    
    const clave = `${cliente}-${referencia}`;
    return datosPW[clave] || null;
}

// FUNCIÓN PRINCIPAL MODIFICADA CON PROMOCIONES Y DATOS DE SEMANA
async function generarEstructuraJSONCompleta(data2Values, recValues, distribucionData, soportesData, siesaData) {
    const jsonEstructura = [];
    const documentosProcesados = new Set();

    // PROCESAR DATA2 EN PARALELO
    const procesamientosData2 = data2Values.map(async (r) => {
        try {
            const j = r[0];
            const tipo = j.TIPO || "";
            const documento = "REC" + normalizeDocumento(j.A || "");
            
            if (documentosProcesados.has(documento)) return null;
            if (!currentFilters.tiposDocumento.includes(tipo.toUpperCase())) return null;
            
            const fecha = normalizeDate(j.FECHA || "");
            if (!estaDentroDelRango(fecha, { fechaInicio: currentFilters.fechaInicio, fechaFin: currentFilters.fechaFin })) return null;
            
            documentosProcesados.add(documento);
            
            const lote = Number(j.LOTE) || 0;
            const refprov = String(j.REFPROV || "");
            const referencia = j.REFERENCIA || "";
            const descripcion = j.DESCRIPCIÓN || "";
            const pvp = parseFloat(normalizePVP(j.PVP || ""));
            const linea = normalizeLinea(j.LINEA || "");
            const prenda = j.PRENDA || "";
            const genero = j.GENERO || "";
            
            if (!refprov || lote === 0) return null;
            
            const proveedor = getProveedorByLinea(linea);
            const clase = getClaseByPVP(pvp);
            if (!currentFilters.clases.includes(clase)) return null;
            
            const proveedorFiltro = proveedor.includes("ANGELES") ? "ANGELES" : "UNIVERSO";
            if (!currentFilters.proveedores.includes(proveedorFiltro)) return null;
            
            // OBTENER DATOS SIESA COMPLETOS (INCLUYENDO PROMOCIONES)
            const datosSiesa = await obtenerDatosSiesaCompletosConPromos(
                documento, refprov, referencia, lote, distribucionData, soportesData, siesaData,
                proveedor, pvp, descripcion, tipo, clase, prenda, genero, "SISPRO", j.ANEXOS
            );
            
            if (datosSiesa.length === 0) return null;
            
            return {
                documento: documento,
                refprov: refprov,
                referencia: referencia,
                lote: lote.toString(),
                pvp: pvp,
                clase: clase,
                prenda: prenda,
                genero: genero,
                fuente: "SISPRO",
                datosSiesa: datosSiesa
            };
            
        } catch (e) {
            console.error('Error procesando DATA2 para JSON:', e);
            return null;
        }
    });

    // PROCESAR REC EN PARALELO
    const procesamientosRec = recValues.map(async (row) => {
        try {
            const tipo = row[27] || "";
            const documento = "REC" + normalizeDocumento(String(row[0] || ""));
            
            if (documentosProcesados.has(documento)) return null;
            if (!currentFilters.tiposDocumento.includes(tipo.toUpperCase())) return null;
            
            const fecha = normalizeDate(row[1] || "");
            if (!estaDentroDelRango(fecha, { fechaInicio: currentFilters.fechaInicio, fechaFin: currentFilters.fechaFin })) return null;
            
            documentosProcesados.add(documento);
            
            const lote = Number(row[8]) || 0;
            const refprov = String(row[6] || "");
            const referencia = row[26] || "";
            const descripcion = row[9] || "";
            const pvp = parseFloat(normalizePVP(row[31] || ""));
            const linea = normalizeLinea(row[3] || "");
            const prenda = row[29] || "";
            const genero = row[30] || "";
            
            if (!refprov || lote === 0) return null;
            
            const proveedor = getProveedorByLinea(linea);
            const clase = getClaseByPVP(pvp);
            if (!currentFilters.clases.includes(clase)) return null;
            
            const proveedorFiltro = proveedor.includes("ANGELES") ? "ANGELES" : "UNIVERSO";
            if (!currentFilters.proveedores.includes(proveedorFiltro)) return null;
            
            if (!currentFilters.fuentesDatos.includes("BUSINT")) return null;
            
            // OBTENER DATOS SIESA COMPLETOS (INCLUYENDO PROMOCIONES)
            const datosSiesa = await obtenerDatosSiesaCompletosConPromos(
                documento, refprov, referencia, lote, distribucionData, soportesData, siesaData,
                proveedor, pvp, descripcion, tipo, clase, prenda, genero, "BUSINT", null, row
            );
            
            if (datosSiesa.length === 0) return null;
            
            return {
                documento: documento,
                refprov: refprov,
                referencia: referencia,
                lote: lote.toString(),
                pvp: pvp,
                clase: clase,
                prenda: prenda,
                genero: genero,
                fuente: "BUSINT",
                datosSiesa: datosSiesa
            };
            
        } catch (e) {
            console.error('Error procesando REC para JSON:', e);
            return null;
        }
    });

    // EJECUTAR TODOS LOS PROCESAMIENTOS EN PARALELO
    const [resultadosData2, resultadosRec] = await Promise.all([
        Promise.allSettled(procesamientosData2),
        Promise.allSettled(procesamientosRec)
    ]);
    
    // FILTRAR RESULTADOS VÁLIDOS
    const agregarResultados = (resultados) => {
        resultados.forEach(resultado => {
            if (resultado.status === 'fulfilled' && resultado.value) {
                jsonEstructura.push(resultado.value);
            }
        });
    };
    
    agregarResultados(resultadosData2);
    agregarResultados(resultadosRec);

    console.log(`📊 JSON completo generado con ${jsonEstructura.length} documentos`);
    return jsonEstructura;
}

// FUNCIÓN PRINCIPAL ACTUALIZADA - UNIFICACIÓN DE PROMOCIONES
async function obtenerDatosSiesaCompletosConPromos(documento, refprov, referencia, lote, distribucionData, soportesData, siesaData, proveedor, pvp, descripcion, tipo, clase, prenda, genero, fuente, anexosData2, rowRec) {
    const datosSiesaArray = [];
    
    // OBTENER CLIENTES DE DISTRIBUCIÓN
    const distribucionDoc = distribucionData[documento];
    let clientesDistribucion = [];
    
    if (distribucionDoc?.clientes) {
        // USAR CLIENTES DE DISTRIBUCIÓN
        clientesDistribucion = Object.entries(distribucionDoc.clientes);
    } else {
        // SI NO HAY DISTRIBUCIÓN, USAR TODOS LOS CLIENTES CONFIGURADOS
        clientesDistribucion = CLIENTES
            .filter(cliente => currentFilters.clientes.includes(cliente.nit))
            .map(cliente => [cliente.nombre, { 
                nit: cliente.nit, 
                cantidad_total: 1
            }]);
    }
    
    // PROCESAR CLIENTES DE DISTRIBUCIÓN NORMAL
    const procesamientosClientes = clientesDistribucion.map(async ([nombreCliente, infoCliente]) => {
        try {
            const nit = infoCliente.nit;
            const cantidad = infoCliente.cantidad_total || 1;
            
            if (!nit || !currentFilters.clientes.includes(nit)) return null;
            
            return await procesarClienteParaJSON(
                documento, refprov, referencia, lote, soportesData, siesaData,
                proveedor, pvp, nombreCliente, nit, cantidad, "FULL"
            );
            
        } catch (e) {
            console.error(`Error procesando cliente ${nombreCliente} para documento ${documento}:`, e);
            return null;
        }
    });
    
    // PROCESAR PROMOCIONES - UNIFICAR POR REFERENCIA (DE AMBAS FUENTES)
    const promosUnificadas = await unificarPromociones(
        documento, refprov, referencia, lote, soportesData, siesaData,
        proveedor, pvp, anexosData2, rowRec, tipo, fuente
    );
    
    // AGREGAR PROMOCIONES UNIFICADAS AL ARRAY PRINCIPAL
    if (promosUnificadas && promosUnificadas.length > 0) {
        datosSiesaArray.push(...promosUnificadas);
    }
    
    // EJECUTAR PROCESAMIENTOS DE CLIENTES NORMALES
    const resultadosClientes = await Promise.allSettled(procesamientosClientes);
    
    // FILTRAR Y AGREGAR CLIENTES NORMALES
    resultadosClientes.forEach(resultado => {
        if (resultado.status === 'fulfilled' && resultado.value) {
            datosSiesaArray.push(resultado.value);
        }
    });
    
    return datosSiesaArray;
}

async function unificarPromociones(documento, refprov, referencia, lote, soportesData, siesaData, proveedor, pvp, anexosData2, rowRec, tipo, fuente) {
    const promosUnificadas = [];
    const promosPorReferencia = {}; // AGRUPAR POR REFERENCIA
    let cantidadTotalGlobal = 0;

    // PROCESAR PROMOCIONES DE DATA2 (ANEXOS)
    if (anexosData2 && Array.isArray(anexosData2)) {
        const promosData2 = anexosData2.filter(anexo => anexo.TIPO === "PROMO");
        
        promosData2.forEach(promo => {
            const refPromo = promo.DOCUMENTO || documento;
            const cantidadPromo = Number(promo.CANTIDAD) || 0;
            
            if (cantidadPromo <= 0) return;
            
            // AGRUPAR POR REFERENCIA
            const claveReferencia = refPromo;
            if (!promosPorReferencia[claveReferencia]) {
                promosPorReferencia[claveReferencia] = {
                    referencia: refPromo,
                    cantidadTotal: 0,
                    promosIndividuales: [],
                    fuentes: new Set()
                };
            }
            
            promosPorReferencia[claveReferencia].cantidadTotal += cantidadPromo;
            cantidadTotalGlobal += cantidadPromo;
            promosPorReferencia[claveReferencia].promosIndividuales.push({
                cantidad: cantidadPromo,
                fuente: "DATA2",
                tipo: "ANEXO"
            });
            promosPorReferencia[claveReferencia].fuentes.add("DATA2");
        });
    }
    
    // PROCESAR PROMOCIONES DE REC (DATABASE) - REGISTROS CON TIPO "PROMO"
    if (rowRec) {
        const tipoRec = String(rowRec[27] || "").toUpperCase();
        const cantidadRec = Number(rowRec[18]) || 0;
        
        // SI ES REGISTRO PROMO EN REC
        if (tipoRec === "PROMO" && cantidadRec > 0) {
            const refPromoRec = String(rowRec[6] || ""); // REFPROV de REC
            
            // AGRUPAR POR REFERENCIA
            const claveReferencia = refPromoRec;
            if (!promosPorReferencia[claveReferencia]) {
                promosPorReferencia[claveReferencia] = {
                    referencia: refPromoRec,
                    cantidadTotal: 0,
                    promosIndividuales: [],
                    fuentes: new Set()
                };
            }
            
            promosPorReferencia[claveReferencia].cantidadTotal += cantidadRec;
            cantidadTotalGlobal += cantidadRec;
            promosPorReferencia[claveReferencia].promosIndividuales.push({
                cantidad: cantidadRec,
                fuente: "REC",
                tipo: "REGISTRO"
            });
            promosPorReferencia[claveReferencia].fuentes.add("REC");
        }
    }
    
    // TAMBIÉN PROCESAR SI EL DOCUMENTO ACTUAL ES PROMO (PARA DATA2)
    if (tipo && tipo.toUpperCase() === "PROMO" && !rowRec) {
        // ESTO ES PARA CUANDO DATA2 TIENE REGISTROS PROMO DIRECTOS
        const cantidadData2 = 1; // O LA CANTIDAD APROPIADA DE DATA2
        
        // AGRUPAR POR REFERENCIA
        const claveReferencia = refprov;
        if (!promosPorReferencia[claveReferencia]) {
            promosPorReferencia[claveReferencia] = {
                referencia: refprov,
                cantidadTotal: 0,
                promosIndividuales: [],
                fuentes: new Set()
            };
        }
        
        promosPorReferencia[claveReferencia].cantidadTotal += cantidadData2;
        cantidadTotalGlobal += cantidadData2;
        promosPorReferencia[claveReferencia].promosIndividuales.push({
            cantidad: cantidadData2,
            fuente: "DATA2",
            tipo: "REGISTRO"
        });
        promosPorReferencia[claveReferencia].fuentes.add("DATA2");
    }
    
    // SI NO HAY PROMOCIONES, RETORNAR ARRAY VACÍO
    if (Object.keys(promosPorReferencia).length === 0) {
        return promosUnificadas;
    }
    
    console.log(`📦 Procesando ${Object.keys(promosPorReferencia).length} grupos de promociones para documento ${documento}:`, promosPorReferencia);
    console.log(`🔢 Cantidad total global de promociones: ${cantidadTotalGlobal}`);
    
    // DETERMINAR SI HAY MÚLTIPLES REFERENCIAS DIFERENTES
    const referenciasUnicas = Object.keys(promosPorReferencia);
    let tieneMultiplesReferencias = referenciasUnicas.length > 1;
    
    // SI HAY MÚLTIPLES REFERENCIAS, CREAR UN SOLO REGISTRO RefVar
    if (tieneMultiplesReferencias) {
        await procesarRefVar(promosUnificadas, documento, lote, soportesData, siesaData, proveedor, pvp, referencia, promosPorReferencia, cantidadTotalGlobal);
    } else {
        // PROCESAR REFERENCIAS INDIVIDUALES
        await procesarReferenciasIndividuales(promosUnificadas, documento, lote, soportesData, siesaData, proveedor, pvp, referencia, promosPorReferencia);
    }
    
    console.log(`✅ Promociones unificadas para ${documento}: ${promosUnificadas.length} registros`);
    return promosUnificadas;
}

// NUEVA FUNCIÓN PARA PROCESAR RefVar (MÚLTIPLES REFERENCIAS)
async function procesarRefVar(promosUnificadas, documento, lote, soportesData, siesaData, proveedor, pvp, referencia, promosPorReferencia, cantidadTotalGlobal) {
    const nombreCliente = "EL TEMPLO DE LA MODA SAS";
    const nit = "805027653";
    
    // CALCULAR CANTIDAD TOTAL CORRECTA
    const cantidadTotalCalculada = Object.values(promosPorReferencia).reduce((total, grupo) => total + grupo.cantidadTotal, 0);
    
    console.log(`🔢 RefVar - Cantidad total calculada: ${cantidadTotalCalculada} (global: ${cantidadTotalGlobal})`);
    
    // BUSCAR EN SIESA CON RefVar Y CANTIDAD TOTAL
    const siesaInfo = buscarSiesa(siesaData, "RefVar", nit, cantidadTotalCalculada, lote);
    
    // BUSCAR SOPORTE
    const soporteInfo = buscarSoporte(soportesData, documento, cantidadTotalCalculada, nit);
    
    // BUSCAR SEMANA PW
    const semanaPW = obtenerSemanaPW(nombreCliente, referencia);
    
    // DETERMINAR ESTADO
    let estado, factura, fecha, soporte, confirmacion;
    
    if (siesaInfo && soporteInfo && soporteInfo.factura) {
        estado = siesaInfo.estado || "Aprobadas";
        factura = siesaInfo.nro_documento || "";
        fecha = formatearFechaDDMMYYYY(siesaInfo.fecha);
        soporte = soporteInfo.url_ih3 || "";
        confirmacion = calcularEstado(soporteInfo.factura, siesaInfo.nro_documento);
    } else if (siesaInfo && !soporteInfo) {
        estado = siesaInfo.estado || "Aprobadas";
        factura = siesaInfo.nro_documento || "";
        fecha = formatearFechaDDMMYYYY(siesaInfo.fecha);
        soporte = "";
        confirmacion = "PENDIENTE";
    } else {
        estado = "Elaboración";
        factura = "";
        fecha = "";
        soporte = "";
        confirmacion = "ELABORACION";
    }
    
    // VERIFICAR FILTRO DE ESTADOS
    if (!currentFilters.estados.includes(confirmacion)) return;
    
    // CALCULAR VALOR BRUTO CORRECTO
    const valorBruto = confirmacion !== "ELABORACION" ? Math.round(pvp * cantidadTotalCalculada) : 0;
    
    // CREAR REGISTRO RefVar UNIFICADO
    const registroRefVar = {
        estado: estado,
        factura: factura,
        fecha: fecha,
        lote: lote.toString(),
        proovedor: proveedor,
        cliente: nombreCliente,
        valorBruto: valorBruto,
        referencia: "RefVar",
        cantidad: cantidadTotalCalculada, // CANTIDAD TOTAL CORRECTA
        nit: nit,
        soporte: soporte,
        confirmacion: confirmacion,
        semana: semanaPW,
        tipo: "PROMO",
        esRefVar: true,
        fuentes: Array.from(new Set(Object.values(promosPorReferencia).flatMap(grupo => Array.from(grupo.fuentes)))),
        detalleReferencias: Object.entries(promosPorReferencia)
            .map(([clave, datos]) => `${datos.referencia}-${datos.cantidadTotal}`)
            .join(',')
    };
    
    promosUnificadas.push(registroRefVar);
    console.log(`🎯 RefVar creado: ${cantidadTotalCalculada} unidades, valor bruto: ${valorBruto}`);
}

// NUEVA FUNCIÓN PARA PROCESAR REFERENCIAS INDIVIDUALES
async function procesarReferenciasIndividuales(promosUnificadas, documento, lote, soportesData, siesaData, proveedor, pvp, referencia, promosPorReferencia) {
    const nombreCliente = "EL TEMPLO DE LA MODA SAS";
    const nit = "805027653";
    
    for (const [claveReferencia, grupo] of Object.entries(promosPorReferencia)) {
        if (grupo.cantidadTotal <= 0) continue;
        
        // BUSCAR EN SIESA CON LA REFERENCIA ESPECÍFICA
        const siesaInfo = buscarSiesa(siesaData, grupo.referencia, nit, grupo.cantidadTotal, lote);
        
        // BUSCAR SOPORTE
        const soporteInfo = buscarSoporte(soportesData, documento, grupo.cantidadTotal, nit);
        
        // BUSCAR SEMANA PW
        const semanaPW = obtenerSemanaPW(nombreCliente, referencia);
        
        // DETERMINAR ESTADO
        let estado, factura, fecha, soporte, confirmacion;
        
        if (siesaInfo && soporteInfo && soporteInfo.factura) {
            estado = siesaInfo.estado || "Aprobadas";
            factura = siesaInfo.nro_documento || "";
            fecha = formatearFechaDDMMYYYY(siesaInfo.fecha);
            soporte = soporteInfo.url_ih3 || "";
            confirmacion = calcularEstado(soporteInfo.factura, siesaInfo.nro_documento);
        } else if (siesaInfo && !soporteInfo) {
            estado = siesaInfo.estado || "Aprobadas";
            factura = siesaInfo.nro_documento || "";
            fecha = formatearFechaDDMMYYYY(siesaInfo.fecha);
            soporte = "";
            confirmacion = "PENDIENTE";
        } else {
            estado = "Elaboración";
            factura = "";
            fecha = "";
            soporte = "";
            confirmacion = "ELABORACION";
        }
        
        // VERIFICAR FILTRO DE ESTADOS
        if (!currentFilters.estados.includes(confirmacion)) continue;
        
        // CALCULAR VALOR BRUTO
        const valorBruto = confirmacion !== "ELABORACION" ? Math.round(pvp * grupo.cantidadTotal) : 0;
        
        // CREAR REGISTRO INDIVIDUAL
        const registroIndividual = {
            estado: estado,
            factura: factura,
            fecha: fecha,
            lote: lote.toString(),
            proovedor: proveedor,
            cliente: nombreCliente,
            valorBruto: valorBruto,
            referencia: grupo.referencia,
            cantidad: grupo.cantidadTotal,
            nit: nit,
            soporte: soporte,
            confirmacion: confirmacion,
            semana: semanaPW,
            tipo: "PROMO",
            esRefVar: false,
            fuentes: Array.from(grupo.fuentes),
            detallePromos: grupo.promosIndividuales.map(promo => 
                `${promo.fuente}-${promo.tipo}-${promo.cantidad}`
            ).join(',')
        };
        
        promosUnificadas.push(registroIndividual);
        console.log(`🎯 Promo individual ${grupo.referencia}: ${grupo.cantidadTotal} unidades, valor bruto: ${valorBruto}`);
    }
}

// FUNCIÓN PARA PROCESAR UN CLIENTE/PROMO INDIVIDUAL (MANTENIDA)
async function procesarClienteParaJSON(documento, refprov, referencia, lote, soportesData, siesaData, proveedor, pvp, nombreCliente, nit, cantidad, tipo) {
    
    // BUSCAR EN SIESA
    const siesaInfo = buscarSiesa(siesaData, refprov, nit, cantidad, lote);
    
    // BUSCAR SOPORTE
    const soporteInfo = buscarSoporte(soportesData, documento, cantidad, nit);
    
    // BUSCAR SEMANA PW
    const semanaPW = obtenerSemanaPW(nombreCliente, referencia);
    
    // DETERMINAR ESTADO
    let estado, factura, fecha, soporte, confirmacion;
    
    if (siesaInfo && soporteInfo && soporteInfo.factura) {
        // CASO: ENTREGADO O VALIDAR
        estado = siesaInfo.estado || "Aprobadas";
        factura = siesaInfo.nro_documento || "";
        fecha = formatearFechaDDMMYYYY(siesaInfo.fecha);
        soporte = soporteInfo.url_ih3 || "";
        confirmacion = calcularEstado(soporteInfo.factura, siesaInfo.nro_documento);
    } else if (siesaInfo && !soporteInfo) {
        // CASO: PENDIENTE
        estado = siesaInfo.estado || "Aprobadas";
        factura = siesaInfo.nro_documento || "";
        fecha = formatearFechaDDMMYYYY(siesaInfo.fecha);
        soporte = "";
        confirmacion = "PENDIENTE";
    } else {
        // CASO: ELABORACIÓN (no tiene datos en SIESA ni soporte)
        estado = "Elaboración";
        factura = "";
        fecha = "";
        soporte = "";
        confirmacion = "ELABORACION";
    }
    
    // VERIFICAR FILTRO DE ESTADOS
    if (!currentFilters.estados.includes(confirmacion)) return null;
    
    // CALCULAR VALOR BRUTO (solo si no es elaboración)
    const valorBruto = confirmacion !== "ELABORACION" ? Math.round(pvp * cantidad) : 0;
    
    return {
        estado: estado,
        factura: factura,
        fecha: fecha,
        lote: lote.toString(),
        proovedor: proveedor,
        cliente: nombreCliente,
        valorBruto: valorBruto,
        referencia: refprov,
        cantidad: cantidad,
        nit: nit,
        soporte: soporte,
        confirmacion: confirmacion,
        semana: semanaPW,
        tipo: tipo
    };
}

async function procesarClienteParaJSON(documento, refprov, referencia, lote, soportesData, siesaData, proveedor, pvp, nombreCliente, nit, cantidad, tipo) {
    
    // BUSCAR EN SIESA
    const siesaInfo = buscarSiesa(siesaData, refprov, nit, cantidad, lote);
    
    // BUSCAR SOPORTE
    const soporteInfo = buscarSoporte(soportesData, documento, cantidad, nit);
    
    // BUSCAR SEMANA PW
    const semanaPW = obtenerSemanaPW(nombreCliente, referencia);
    
    // DETERMINAR ESTADO
    let estado, factura, fecha, soporte, confirmacion;
    
    if (siesaInfo && soporteInfo && soporteInfo.factura) {
        // CASO: ENTREGADO O VALIDAR
        estado = siesaInfo.estado || "Aprobadas";
        factura = siesaInfo.nro_documento || "";
        fecha = formatearFechaDDMMYYYY(siesaInfo.fecha);
        soporte = soporteInfo.url_ih3 || "";
        confirmacion = calcularEstado(soporteInfo.factura, siesaInfo.nro_documento);
    } else if (siesaInfo && !soporteInfo) {
        // CASO: PENDIENTE
        estado = siesaInfo.estado || "Aprobadas";
        factura = siesaInfo.nro_documento || "";
        fecha = formatearFechaDDMMYYYY(siesaInfo.fecha);
        soporte = "";
        confirmacion = "PENDIENTE";
    } else {
        // CASO: ELABORACIÓN (no tiene datos en SIESA ni soporte)
        estado = "Elaboración";
        factura = "";
        fecha = "";
        soporte = "";
        confirmacion = "ELABORACION";
    }
    
    // VERIFICAR FILTRO DE ESTADOS
    if (!currentFilters.estados.includes(confirmacion)) return null;
    
    // CALCULAR VALOR BRUTO (solo si no es elaboración)
    const valorBruto = confirmacion !== "ELABORACION" ? Math.round(pvp * cantidad) : 0;
    
    return {
        estado: estado,
        factura: factura,
        fecha: fecha,
        lote: lote.toString(),
        proovedor: proveedor,
        cliente: nombreCliente,
        valorBruto: valorBruto,
        referencia: refprov,
        cantidad: cantidad,
        nit: nit,
        soporte: soporte,
        confirmacion: confirmacion,
        semana: semanaPW, // NUEVO CAMPO - SEMANA PW
        tipo: tipo.toUpperCase() // INDICAR SI ES FULL O PROMO
    };
}


/*
// FUNCIÓN PARA PROCESAR ANEXOS PROMO DE DATA2
async function procesarAnexosPromoParaJSON(anexos, documento, lote, proveedor, pvp, clase, prenda, genero, fuente) {
    const anexosPromo = [];
    const promos = anexos.filter(anexo => anexo.TIPO === "PROMO");
    
    if (promos.length === 0) return anexosPromo;
    
    // PARA PROMOS MÚLTIPLES, AGRUPAR
    const referenciasUnicas = [...new Set(promos.map(promo => promo.DOCUMENTO || documento))];
    
    if (referenciasUnicas.length > 1) {
        // AGRUPAR MÚLTIPLES REFERENCIAS
        const referenciasConcatenadas = referenciasUnicas.join(',');
        const cantidadTotal = promos.reduce((sum, promo) => sum + (Number(promo.CANTIDAD) || 0), 0);
        
        anexosPromo.push({
            tipo: "PROMO",
            refprov: "RefVar",
            referencia: referenciasConcatenadas,
            cantidad: cantidadTotal,
            pvp: pvp,
            clase: clase,
            prenda: prenda,
            genero: genero,
            proveedor: proveedor,
            fuente: fuente,
            lote: lote.toString(),
            cliente: "EL TEMPLO DE LA MODA SAS", // SIEMPRE TEMPLO PARA PROMOS
            nit: "805027653"
        });
    } else {
        // PROMOS INDIVIDUALES
        promos.forEach(promo => {
            const refPromo = promo.DOCUMENTO || documento;
            const cantidadPromo = Number(promo.CANTIDAD) || 0;
            
            if (cantidadPromo > 0) {
                anexosPromo.push({
                    tipo: "PROMO",
                    refprov: refPromo,
                    referencia: refPromo,
                    cantidad: cantidadPromo,
                    pvp: pvp,
                    clase: clase,
                    prenda: prenda,
                    genero: genero,
                    proveedor: proveedor,
                    fuente: fuente,
                    lote: lote.toString(),
                    cliente: "EL TEMPLO DE LA MODA SAS", // SIEMPRE TEMPLO PARA PROMOS
                    nit: "805027653"
                });
            }
        });
    }
    
    return anexosPromo;
}*/

// FUNCIÓN PARA PROCESAR PROMOS DE REC (DATABASE)
async function procesarPromoRecParaJSON(row, documento, refprov, referencia, lote, descripcion, pvp, prenda, genero, linea, clase) {
    const anexosPromo = [];
    
    const cantidad = Number(row[18]) || 0;
    if (cantidad <= 0) return anexosPromo;
    
    const proveedor = getProveedorByLinea(linea);
    
    // BUSCAR DOCUMENTO FULL ASOCIADO (POR LOTE)
    let documentoPrincipal = documento;
    const mismoLote = Number(row[8]) || 0;
    
    if (mismoLote > 0) {
        // EN LA LÓGICA ORIGINAL SE BUSCARÍA EL FULL DEL MISMO LOTE
        // POR AHORA USAMOS EL DOCUMENTO ACTUAL
        documentoPrincipal = documento;
    }
    
    anexosPromo.push({
        tipo: "PROMO",
        refprov: refprov,
        referencia: referencia,
        cantidad: cantidad,
        pvp: pvp,
        clase: clase,
        prenda: prenda,
        genero: genero,
        proveedor: proveedor,
        fuente: "BUSINT",
        lote: lote.toString(),
        cliente: "EL TEMPLO DE LA MODA SAS", // SIEMPRE TEMPLO PARA PROMOS
        nit: "805027653",
        documentoPrincipal: documentoPrincipal !== documento ? documentoPrincipal : undefined
    });
    
    return anexosPromo;
}

// FUNCIÓN ACTUALIZADA CON BÚSQUEDA DE SEMANA PW
async function obtenerDatosSiesaCompletos(documento, refprov, referencia, lote, distribucionData, soportesData, siesaData, proveedor, pvp, descripcion, tipo, clase, prenda, genero, fuente) {
    const datosSiesaArray = [];
    
    // OBTENER CLIENTES DE DISTRIBUCIÓN
    const distribucionDoc = distribucionData[documento];
    let clientes = [];
    
    if (distribucionDoc?.clientes) {
        // USAR CLIENTES DE DISTRIBUCIÓN
        clientes = Object.entries(distribucionDoc.clientes);
    } else {
        // SI NO HAY DISTRIBUCIÓN, USAR TODOS LOS CLIENTES CONFIGURADOS
        clientes = CLIENTES
            .filter(cliente => currentFilters.clientes.includes(cliente.nit))
            .map(cliente => [cliente.nombre, { 
                nit: cliente.nit, 
                cantidad_total: tipo.toUpperCase() === "PROMO" ? 1 : 0 // Para promos usar cantidad 1
            }]);
    }
    
    // PROCESAR CADA CLIENTE EN PARALELO
    const procesamientosClientes = clientes.map(async ([nombreCliente, infoCliente]) => {
        try {
            const nit = infoCliente.nit;
            const cantidad = infoCliente.cantidad_total || 1;
            
            if (!nit || !currentFilters.clientes.includes(nit)) return null;
            
            // BUSCAR EN SIESA
            const siesaInfo = buscarSiesa(siesaData, refprov, nit, cantidad, lote);
            
            // BUSCAR SOPORTE
            const soporteInfo = buscarSoporte(soportesData, documento, cantidad, nit);
            
            // BUSCAR SEMANA PW
            const semanaPW = obtenerSemanaPW(nombreCliente, referencia);
            
            // DETERMINAR ESTADO
            let estado, factura, fecha, soporte, confirmacion;
            
            if (siesaInfo && soporteInfo && soporteInfo.factura) {
                // CASO: ENTREGADO O VALIDAR
                estado = siesaInfo.estado || "Aprobadas";
                factura = siesaInfo.nro_documento || "";
                fecha = formatearFechaDDMMYYYY(siesaInfo.fecha);
                soporte = soporteInfo.url_ih3 || "";
                confirmacion = calcularEstado(soporteInfo.factura, siesaInfo.nro_documento);
            } else if (siesaInfo && !soporteInfo) {
                // CASO: PENDIENTE
                estado = siesaInfo.estado || "Aprobadas";
                factura = siesaInfo.nro_documento || "";
                fecha = formatearFechaDDMMYYYY(siesaInfo.fecha);
                soporte = "";
                confirmacion = "PENDIENTE";
            } else {
                // CASO: ELABORACIÓN (no tiene datos en SIESA ni soporte)
                estado = "Elaboración";
                factura = "";
                fecha = "";
                soporte = "";
                confirmacion = "ELABORACION";
            }
            
            // VERIFICAR FILTRO DE ESTADOS
            if (!currentFilters.estados.includes(confirmacion)) return null;
            
            // CALCULAR VALOR BRUTO (solo si no es elaboración)
            const valorBruto = confirmacion !== "ELABORACION" ? Math.round(pvp * cantidad) : 0;
            
            return {
                estado: estado,
                factura: factura,
                fecha: fecha,
                lote: lote.toString(),
                proovedor: proveedor,
                cliente: nombreCliente,
                valorBruto: valorBruto,
                referencia: refprov,
                cantidad: cantidad,
                nit: nit,
                soporte: soporte,
                confirmacion: confirmacion,
                semana: semanaPW // NUEVO CAMPO - SEMANA PW
            };
            
        } catch (e) {
            console.error(`Error procesando cliente ${nombreCliente} para documento ${documento}:`, e);
            return null;
        }
    });
    
    const resultados = await Promise.allSettled(procesamientosClientes);
    
    resultados.forEach(resultado => {
        if (resultado.status === 'fulfilled' && resultado.value) {
            datosSiesaArray.push(resultado.value);
        }
    });
    
    return datosSiesaArray;
}

// FUNCIÓN PARA DESCARGAR JSON
function descargarJSON(jsonData) {
    const jsonContent = JSON.stringify(jsonData, null, 2);
    const blob = new Blob([jsonContent], { type: 'application/json;charset=utf-8' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    const fecha = new Date().toISOString().split('T')[0];
    const nombreArchivo = `datos_completos_siesa_${fecha}.json`;
    
    link.setAttribute('href', url);
    link.setAttribute('download', nombreArchivo);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    // ESTADÍSTICAS MEJORADAS
    const totalDocumentos = jsonData.length;
    const totalRegistrosSiesa = jsonData.reduce((sum, doc) => sum + doc.datosSiesa.length, 0);
    const documentosConPromos = jsonData.filter(doc => doc.anexos && doc.anexos.length > 0).length;
    const totalPromos = jsonData.reduce((sum, doc) => sum + (doc.anexos ? doc.anexos.length : 0), 0);
    const registrosConSemana = jsonData.reduce((sum, doc) => 
        sum + doc.datosSiesa.filter(s => s.semana !== null).length, 0
    );
    
    console.log(`📦 JSON descargado: ${totalDocumentos} documentos, ${totalRegistrosSiesa} registros SIESA`);
    console.log(`🎁 Promociones: ${documentosConPromos} docs con ${totalPromos} promos`);
    console.log(`📊 Detalle: ${registrosConSemana} con semana PW`);
    
    showStatus(`✅ JSON descargado: ${totalDocumentos} docs, ${totalRegistrosSiesa} registros, ${totalPromos} promos`, 'success');
}

// ============================
// FUNCIONES AUXILIARES (se mantienen igual)
// ============================

function showStatus(message, type = 'info') {
    const statusElement = document.getElementById('statusMessage');
    if (statusElement) {
        statusElement.textContent = message;
        statusElement.className = `status ${type}`;
        statusElement.style.display = 'block';
        console.log(`[${type.toUpperCase()}] ${message}`);
    }
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

function formatearFechaDDMMYYYY(fecha) {
    if (!fecha) return "";
    
    try {
        const fechaObj = new Date(fecha);
        if (isNaN(fechaObj.getTime())) return fecha;
        
        const dia = String(fechaObj.getDate()).padStart(2, '0');
        const mes = String(fechaObj.getMonth() + 1).padStart(2, '0');
        const año = fechaObj.getFullYear();
        
        return `${dia}/${mes}/${año}`;
    } catch (e) {
        return fecha;
    }
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

function estaDentroDelRango(fecha, rangoFechas) {
    if (!fecha) return false;
    
    const fechaObj = new Date(fecha);
    const inicio = new Date(rangoFechas.fechaInicio);
    const fin = new Date(rangoFechas.fechaFin);
    
    return fechaObj >= inicio && fechaObj <= fin;
}