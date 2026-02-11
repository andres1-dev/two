// principal.js - Datos con Factura Optimizado
// Configuración de Sheets
const API_KEY = 'AIzaSyC7hjbRc0TGLgImv8gVZg8tsOeYWgXlPcM';

// Fuentes de datos
const SOURCE_SPREADSHEET_ID_DATA2 = "133NiyjNApZGkEFs4jUvpJ9So-cSEzRVeW2FblwOCrjI";
const SOURCE_SHEET_NAME_DATA2 = "DATA2";
const SOURCE_DATA2_COLUMN = "S";

const SOURCE_SPREADSHEET_ID_SIESA = "1FcQhVIKtWy4O-aGTNfA6l4C5Q4_u1LZErpj3CMglfQM";
const SOURCE_SHEET_NAME_SIESA = "SIESA";
const SOURCE_SHEET_NAME_SIESA_2 = "SIESA_V2";

const SOURCE_SPREADSHEET_ID_REC = "1esc5REq0c03nHLpGcLwZRW29yq2gZnrpbz75gCCjrqc";
const SOURCE_SHEET_NAME_REC = "DataBase";

const SOPORTES_SPREADSHEET_ID = "1VaPBwgRu1QWhmsV_Qgf7cgraSxiAWRX6-wBEyUlGoJw";
const SOPORTES_SHEET_NAME = "SOPORTES";
const BASE_IMAGE_URL = "https://lh3.googleusercontent.com/d/";

// Función principal para obtener datos
async function obtenerDatosFacturados() {
    try {
        console.log("Iniciando obtención de datos facturados...");

        const [datosData2, datosSiesa, datosSoportes, datosRec] = await Promise.all([
            obtenerDatosDeData2(),
            obtenerDatosSiesa(),
            obtenerDatosSoportes(),
            obtenerDatosRecFiltrados()
        ]);

        console.log("Estadísticas iniciales:");
        console.log("- DATA2:", datosData2.length, "registros");
        console.log("- SIESA:", datosSiesa.length, "facturas");
        console.log("- REC:", datosRec.length, "registros FULL");
        console.log("- SOPORTES:", Object.keys(datosSoportes).length, "confirmaciones");

        const resultado = combinarDatosFacturados(datosData2, datosSiesa, datosSoportes, datosRec);

        console.log("Proceso completado exitosamente");
        console.log("Resultado:", resultado.metadata.estadisticas);

        return resultado;

    } catch (error) {
        console.error("Error en obtenerDatosFacturados:", error);
        return {
            success: false,
            error: error.message,
            timestamp: new Date().toISOString()
        };
    }
}

// Función principal de combinación
function combinarDatosFacturados(datosData2, datosSiesa, datosSoportes, datosRec) {
    const datosCombinados = [];
    const lotesProcesados = new Set();

    // Paso 1: Procesar DATA2 (fuente principal)
    const resultadosData2 = procesarFuenteDATA2(datosData2, datosSiesa, datosSoportes, lotesProcesados);
    datosCombinados.push(...resultadosData2);

    // Paso 2: Procesar REC (fuente complementaria)
    const resultadosREC = procesarFuenteREC(datosRec, datosSiesa, datosSoportes, lotesProcesados);
    datosCombinados.push(...resultadosREC);

    // Estadísticas
    const totalFacturas = datosCombinados.reduce((sum, item) =>
        sum + (item.datosSiesa?.length || 0), 0);

    const desdeDATA2 = resultadosData2.length;
    const desdeREC = resultadosREC.length;

    return {
        success: true,
        data: datosCombinados,
        timestamp: new Date().toISOString(),
        count: datosCombinados.length,
        metadata: {
            totalFacturas: totalFacturas,
            documentosDesdeDATA2: desdeDATA2,
            documentosDesdeREC: desdeREC,
            lotesProcesados: lotesProcesados.size,
            estadisticas: `Documentos: ${datosCombinados.length} (${desdeDATA2} de DATA2, ${desdeREC} de REC) | Facturas: ${totalFacturas}`
        }
    };
}

// Procesar fuente DATA2
function procesarFuenteDATA2(datosData2, datosSiesa, datosSoportes, lotesProcesados) {
    const resultados = [];

    datosData2.forEach(item => {
        const documento = "REC" + item.documento;
        const referencia = item.referencia;
        const lote = item.lote;
        const loteKey = `${documento}_${lote}`;

        if (lotesProcesados.has(loteKey)) return;

        const facturasSiesa = buscarFacturasPorLote(datosSiesa, lote);

        if (facturasSiesa.length > 0) {
            lotesProcesados.add(loteKey);

            const datosRelacionados = facturasSiesa.map(factura =>
                construirObjetoFactura(factura, documento, lote, referencia, datosSoportes)
            );

            resultados.push({
                documento: documento,
                referencia: referencia,
                lote: lote,
                fuente: "DATA2",
                datosSiesa: datosRelacionados
            });
        }
    });

    return resultados;
}

// Procesar fuente REC
function procesarFuenteREC(datosRec, datosSiesa, datosSoportes, lotesProcesados) {
    const resultados = [];

    datosRec.forEach(item => {
        const documento = item[0];
        const referencia = item[1];
        const lote = item[2];
        const loteKey = `${documento}_${lote}`;

        if (lotesProcesados.has(loteKey)) return;

        const facturasSiesa = buscarFacturasPorLote(datosSiesa, lote);

        if (facturasSiesa.length > 0) {
            lotesProcesados.add(loteKey);

            const datosRelacionados = facturasSiesa.map(factura =>
                construirObjetoFactura(factura, documento, lote, referencia, datosSoportes)
            );

            resultados.push({
                documento: documento,
                referencia: referencia,
                lote: lote,
                fuente: "REC",
                datosSiesa: datosRelacionados
            });
        }
    });

    return resultados;
}

// Buscar facturas por lote en SIESA
function buscarFacturasPorLote(datosSiesa, loteBuscado) {
    return datosSiesa.filter(fila => {
        const loteSiesa = fila[3];
        return String(loteSiesa).trim() === String(loteBuscado).trim();
    });
}

// Construir objeto de factura completo
function construirObjetoFactura(filaSiesa, documento, lote, referencia, datosSoportes) {
    const codProveedor = Number(filaSiesa[4]);
    let nombreProveedor = filaSiesa[4];

    if (codProveedor === 5) {
        nombreProveedor = "TEXTILES Y CREACIONES EL UNIVERSO SAS";
    } else if (codProveedor === 3) {
        nombreProveedor = "TEXTILES Y CREACIONES LOS ANGELES SAS";
    }

    const nitCliente = filaSiesa[9] || '';
    const referenciaItem = filaSiesa[7] || referencia;
    const cantidadItem = String(filaSiesa[8] || '');
    const { confirmacion, ih3 } = obtenerConfirmacionIh3(
        datosSoportes,
        documento,
        lote,
        referenciaItem,
        cantidadItem,
        nitCliente
    );

    return {
        estado: filaSiesa[0],
        factura: filaSiesa[1],
        fecha: filaSiesa[2],
        lote: filaSiesa[3],
        proovedor: nombreProveedor,
        cliente: filaSiesa[5],
        valorBruto: filaSiesa[6],
        referencia: referenciaItem,
        cantidad: cantidadItem,
        nit: nitCliente,
        confirmacion: confirmacion,
        Ih3: ih3
    };
}

// Función para obtener datos de Sheets API
async function obtenerDatosDeSheet(spreadsheetId, range) {
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}?key=${API_KEY}&_t=${Date.now()}`;

    try {
        const response = await fetch(url, { cache: 'no-store' });
        if (!response.ok) {
            throw new Error(`Error HTTP ${response.status} en ${range}`);
        }
        const data = await response.json();
        return data.values || [];
    } catch (error) {
        console.error(`Error obteniendo datos de ${spreadsheetId} - ${range}:`, error);
        return [];
    }
}

// Obtener datos de DATA2
async function obtenerDatosDeData2() {
    try {
        const range = `${SOURCE_SHEET_NAME_DATA2}!${SOURCE_DATA2_COLUMN}:${SOURCE_DATA2_COLUMN}`;
        const allValues = await obtenerDatosDeSheet(SOURCE_SPREADSHEET_ID_DATA2, range);

        return allValues.reduce((filtrados, cellValue, index) => {
            if (!cellValue || !cellValue[0]) return filtrados;

            try {
                const data = JSON.parse(cellValue[0]);
                if (data.TIPO === "FULL") {
                    filtrados.push({
                        documento: data.A?.toString() || '',
                        referencia: data.REFERENCIA || '',
                        lote: data.LOTE?.toString() || '',
                        proveedor: data.PROVEEDOR || '',
                        anexos: data.ANEXOS || [],
                        tipo: data.TIPO
                    });
                }
            } catch (e) {
                console.warn(`Fila ${index + 1} DATA2 no es JSON válido`);
            }
            return filtrados;
        }, []);

    } catch (error) {
        console.error("Error en obtenerDatosDeData2:", error);
        return [];
    }
}

// Obtener datos de REC filtrados
async function obtenerDatosRecFiltrados() {
    try {
        const rangeRec = `${SOURCE_SHEET_NAME_REC}!A2:AB`;
        const allValuesRec = await obtenerDatosDeSheet(SOURCE_SPREADSHEET_ID_REC, rangeRec);

        return allValuesRec
            .filter(row => {
                const tieneReferencia = row[6] && row[6].trim() !== '';
                const esFULL = row[27] && row[27].trim().toUpperCase() === 'FULL';
                const tieneLote = row[8] && row[8].trim() !== '';
                return tieneReferencia && esFULL && tieneLote;
            })
            .map(row => [
                row[0] || '',
                row[6] || '',
                row[8] || '',
                row[3] || ''
            ]);

    } catch (error) {
        console.error("Error en obtenerDatosRecFiltrados:", error);
        return [];
    }
}

// Obtener datos de SOPORTES
async function obtenerDatosSoportes() {
    try {
        const rangeSoportes = `${SOPORTES_SHEET_NAME}!A:H`;
        const allValuesSoportes = await obtenerDatosDeSheet(SOPORTES_SPREADSHEET_ID, rangeSoportes);

        if (!allValuesSoportes || allValuesSoportes.length <= 1) {
            return {};
        }

        return allValuesSoportes.slice(1).reduce((map, row) => {
            if (row.length >= 7) {
                const documento = String(row[1] || '').trim();
                const lote = String(row[2] || '').trim();
                const referencia = String(row[3] || '').trim();
                const cantidad = String(row[4] || '').trim();
                const factura = row[5] || '';
                const nit = String(row[6] || '').trim();
                const imageId = row.length >= 8 ? String(row[7] || '').trim() : '';

                if (documento && lote && referencia && cantidad && nit) {
                    const fechaEntrega = row[0] || ''; // Columna A es Timestamp
                    const clave = `${documento}_${lote}_${referencia}_${cantidad}_${nit}`;
                    map[clave] = { factura, imageId, fechaEntrega };

                    // Mapa auxiliar por factura para búsqueda rápida en reporte
                    if (factura && factura.trim() !== '') {
                        if (!map['BY_FACTURA_' + factura.trim()]) {
                            map['BY_FACTURA_' + factura.trim()] = { fechaEntrega, imageId, estado: 'ENTREGADO' };
                        }
                    }
                }
            }
            return map;
        }, {});

    } catch (error) {
        console.error("Error en obtenerDatosSoportes:", error);
        return {};
    }
}

// Obtener datos de SIESA (principal fuente de facturas)
async function obtenerDatosSiesa() {
    try {
        const [siesaData, siesaV2Data] = await Promise.all([
            obtenerDatosDeSheet(SOURCE_SPREADSHEET_ID_SIESA, `${SOURCE_SHEET_NAME_SIESA}!A:G`),
            obtenerDatosDeSheet(SOURCE_SPREADSHEET_ID_SIESA, `${SOURCE_SHEET_NAME_SIESA_2}!A:D`)
        ]);

        // Procesar agregaciones de SIESA_V2
        const agregaciones = {};
        siesaV2Data.forEach(row => {
            if (row.length >= 3) {
                const key = row[0] || '';
                const valor1 = parseFloat(row[1]) || 0;
                const valor2 = row[2] || '';
                const valor3 = parseFloat(row[3]) || 0;

                if (key) {
                    if (!agregaciones[key]) {
                        agregaciones[key] = { sumValor1: valor1, itemsValor2: [valor2], sumValor3: valor3 };
                    } else {
                        agregaciones[key].sumValor1 += valor1;
                        agregaciones[key].itemsValor2.push(valor2);
                        agregaciones[key].sumValor3 += valor3;
                    }
                }
            }
        });

        // Configuración de filtros
        const estadosExcluir = ["Anuladas", "En elaboración"];
        const prefijosFactura = ["017", "FEV", "029", "FVE"];

        // Mapeo de clientes a NIT
        // Usar la constante global definida en configuracion.js
        const mapaClientes = typeof CLIENTS_MAP !== 'undefined' ? CLIENTS_MAP : {
            "INVERSIONES URBANA SAS": "901920844",
            "EL TEMPLO DE LA MODA FRESCA SAS": "900047252",
            "EL TEMPLO DE LA MODA SAS": "805027653",
            "ARISTIZABAL LOPEZ JESUS MARIA": "70825517",
            "QUINTERO ORTIZ JOSE ALEXANDER": "14838951",
            "QUINTERO ORTIZ PATRICIA YAMILET": "67006141",
            "ZULUAGA GOMEZ RUBEN ESTEBAN": "1007348825",
            "SON Y LIMON SAS": "900355664"
        };

        const clientesPermitidos = new Set(Object.keys(mapaClientes));

        return siesaData
            .filter(row => row.length >= 4)
            .filter(row => {
                const estado = row[0] || '';
                return !estadosExcluir.includes(estado);
            })
            .filter(row => {
                const factura = row[1] || '';
                return prefijosFactura.some(prefijo => factura.startsWith(prefijo));
            })
            .map(row => {
                const clienteOriginal = row[3] || '';
                const clienteNormalizado = clienteOriginal
                    .replace(/S\.A\.S\.?/g, 'SAS')
                    .replace(/\s+/g, ' ')
                    .trim();

                if (!clientesPermitidos.has(clienteNormalizado)) {
                    return null;
                }

                const codProveedor = row[6] || '';
                const lote = codProveedor === "5" ? (row[4] || '') :
                    codProveedor === "3" ? (row[5] || '') : '';

                const factura = row[1] || '';
                const agregacion = agregaciones[factura] || { sumValor1: 0, itemsValor2: [], sumValor3: 0 };

                const referencia = agregacion.itemsValor2.length === 1 ?
                    agregacion.itemsValor2[0] :
                    (agregacion.itemsValor2.length > 1 ? "RefVar" : "");

                return [
                    row[0],
                    factura,
                    formatearFecha(row[2]),
                    lote,
                    codProveedor,
                    clienteNormalizado,
                    agregacion.sumValor1,
                    referencia,
                    agregacion.sumValor3,
                    mapaClientes[clienteNormalizado] || ""
                ];
            })
            .filter(row => row !== null);

    } catch (error) {
        console.error("Error en obtenerDatosSiesa:", error);
        return [];
    }
}

// Funciones helper
function formatearFecha(fechaStr) {
    if (!fechaStr || typeof fechaStr !== 'string') return fechaStr;
    const partes = fechaStr.split('/');
    return partes.length === 3 ? `${partes[1]}/${partes[0]}/${partes[2]}` : fechaStr;
}

function obtenerConfirmacionIh3(soportesMap, documento, lote, referencia, cantidad, nit) {
    const clave = `${documento}_${lote}_${referencia}_${cantidad}_${nit}`.trim();

    if (!soportesMap[clave]) {
        return { confirmacion: "", ih3: "" };
    }

    const soporte = soportesMap[clave];
    const confirmacion = soporte.factura ? "ENTREGADO" : "ENTREGADO, PENDIENTE FACTURA";
    const ih3 = soporte.imageId ? BASE_IMAGE_URL + soporte.imageId : "";

    return { confirmacion, ih3 };
}

// Función para exportar datos
function exportarDatosComoJSON(datos) {
    try {
        const jsonStr = JSON.stringify(datos, null, 2);
        const blob = new Blob([jsonStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `datos_facturados_${new Date().toISOString().slice(0, 10)}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        return true;
    } catch (error) {
        console.error("Error exportando datos:", error);
        return false;
    }
}

// Ejemplo de uso
async function ejecutarYMostrarResultados() {
    console.log("=== EJECUTANDO OBTENCIÓN DE DATOS FACTURADOS ===");
    const resultado = await obtenerDatosFacturados();

    if (resultado.success) {
        console.log("✅ Proceso completado exitosamente");
        console.log(`📊 Documentos procesados: ${resultado.count}`);
        console.log(`🧾 Facturas encontradas: ${resultado.metadata.totalFacturas}`);
        console.log(`📈 Origen: ${resultado.metadata.estadisticas}`);
        console.log("📝 Estructura del resultado:");
        console.log(resultado);

        // Opcional: exportar automáticamente
        // exportarDatosComoJSON(resultado);

        return resultado;
    } else {
        console.error("❌ Error en el proceso:", resultado.error);
        return resultado;
    }
}

// Si se ejecuta directamente (Node.js o navegador)
if (typeof window !== 'undefined') {
    // Navegador - exponer funciones globalmente
    window.obtenerDatosFacturados = obtenerDatosFacturados;
    window.ejecutarYMostrarResultados = ejecutarYMostrarResultados;
    window.exportarDatosComoJSON = exportarDatosComoJSON;

    console.log("principal.js cargado - funciones disponibles:");
    console.log("- obtenerDatosFacturados()");
    console.log("- ejecutarYMostrarResultados()");
    console.log("- exportarDatosComoJSON(datos)");
}

// Export para Node.js (si se usa con módulos)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        obtenerDatosFacturados,
        ejecutarYMostrarResultados,
        exportarDatosComoJSON,
        combinarDatosFacturados,
        obtenerDatosDeData2,
        obtenerDatosSiesa,
        obtenerDatosRecFiltrados,
        obtenerDatosSoportes
    };
}
