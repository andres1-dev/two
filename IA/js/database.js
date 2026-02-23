// ============================================
// MASTER LLM RETRIEVER - VERSIÓN INTEGRADA
// ============================================

const MASTER_API_KEY = "AIzaSyDvtBUmhS_f3SvQzHN2Qz3molW0nEEM01A";

// Configuración de Sheets (tomada de main_logic.js)
const MASTER_CONFIG = {
    // DATA2
    spreadsheetId_DATA2: "133NiyjNApZGkEFs4jUvpJ9So-cSEzRVeW2FblwOCrjI",
    sheetName_DATA2: "DATA2",
    column_DATA2: "S",
    
    // SIESA
    spreadsheetId_SIESA: "1FcQhVIKtWy4O-aGTNfA6l4C5Q4_u1LZErpj3CMglfQM",
    sheetName_SIESA: "SIESA",
    sheetName_SIESA_V2: "SIESA_V2",
    
    // REC
    spreadsheetId_REC: "1esc5REq0c03nHLpGcLwZRW29yq2gZnrpbz75gCCjrqc",
    sheetName_REC: "DataBase",
    
    // SOPORTES
    spreadsheetId_SOPORTES: "1VaPBwgRu1QWhmsV_Qgf7cgraSxiAWRX6-wBEyUlGoJw",
    sheetName_SOPORTES: "SOPORTES",
    baseImageUrl: "https://lh3.googleusercontent.com/d/"
};

// Mapeo de clientes (de config.js)
const MASTER_CLIENTS_MAP = {
    "INVERSIONES URBANA SAS": "901920844",
    "EL TEMPLO DE LA MODA FRESCA SAS": "900047252",
    "EL TEMPLO DE LA MODA SAS": "805027653",
    "ARISTIZABAL LOPEZ JESUS MARIA": "70825517",
    "QUINTERO ORTIZ JOSE ALEXANDER": "14838951",
    "QUINTERO ORTIZ PATRICIA YAMILET": "67006141",
    "ZULUAGA GOMEZ RUBEN ESTEBAN": "1007348825",
    "SON Y LIMON SAS": "900355664"
};

/**
 * FUNCIÓN MAESTRA: Obtiene todos los datos homologados para LLM
 * @returns {Promise<Object>} Datos completos y optimizados
 */
async function getMasterLLMData() {
    console.log("🚀 Iniciando Master LLM Retriever...");
    
    try {
        // 1. Obtener todas las fuentes de datos en paralelo
        const [
            datosData2,
            datosSiesa,
            datosSoportes,
            datosRec
        ] = await Promise.all([
            obtenerDatosDeData2_MASTER(),
            obtenerDatosSiesa_MASTER(),
            obtenerDatosSoportes_MASTER(),
            obtenerDatosRecFiltrados_MASTER()
        ]);

        console.log("📊 Estadísticas de fuentes:", {
            data2: datosData2.length,
            siesa: datosSiesa.length,
            soportes: Object.keys(datosSoportes).length,
            rec: datosRec.length
        });

        // 2. Combinar y homologar datos
        const datosCombinados = combinarDatosMaestro(datosData2, datosSiesa, datosSoportes, datosRec);
        
        // 3. Transformar a formato optimizado para LLM
        const datosLLM = transformarParaLLM(datosCombinados);
        
        // 4. Generar métricas y resúmenes
        const metricas = generarMetricasLLM(datosLLM);
        
        return {
            success: true,
            timestamp: new Date().toISOString(),
            metadata: {
                totalDocumentos: datosCombinados.length,
                totalFacturas: datosLLM.length,
                facturasEntregadas: datosLLM.filter(f => f.estado_entrega === "ENTREGADO").length,
                facturasPendientes: datosLLM.filter(f => f.estado_entrega !== "ENTREGADO").length,
                clientes: [...new Set(datosLLM.map(f => f.cliente))].length,
                proveedores: [...new Set(datosLLM.map(f => f.proveedor))].length,
                rangoFechasFactura: obtenerRangoFechas(datosLLM, 'fecha_factura'),
                rangoFechasEntrega: obtenerRangoFechas(datosLLM, 'fecha_entrega')
            },
            metricas: metricas,
            data: datosLLM, // Datos planos para LLM
            data_raw: datosCombinados, // Datos originales por si se necesitan
            resumen: generarResumenTexto(datosLLM, metricas)
        };
        
    } catch (error) {
        console.error("❌ Error en Master LLM Retriever:", error);
        return {
            success: false,
            error: error.message,
            timestamp: new Date().toISOString()
        };
    }
}

// ============================================
// FUNCIONES AUXILIARES PARA OBTENER DATOS
// ============================================

/**
 * Obtener datos de Google Sheets
 */
async function obtenerDatosDeSheet_MASTER(spreadsheetId, range) {
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}?key=${MASTER_API_KEY}&t=${Date.now()}`;
    
    try {
        const response = await fetch(url, { cache: 'no-store' });
        if (!response.ok) {
            throw new Error(`HTTP ${response.status} en ${range}`);
        }
        const data = await response.json();
        return data.values || [];
    } catch (error) {
        console.error(`Error obteniendo datos de ${spreadsheetId} - ${range}:`, error);
        return [];
    }
}

/**
 * Obtener datos de DATA2 (Documentos)
 */
async function obtenerDatosDeData2_MASTER() {
    try {
        const range = `${MASTER_CONFIG.sheetName_DATA2}!${MASTER_CONFIG.column_DATA2}:${MASTER_CONFIG.column_DATA2}`;
        const allValues = await obtenerDatosDeSheet_MASTER(MASTER_CONFIG.spreadsheetId_DATA2, range);
        
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
                // Ignorar filas que no son JSON
            }
            return filtrados;
        }, []);
        
    } catch (error) {
        console.error("Error en obtenerDatosDeData2_MASTER:", error);
        return [];
    }
}

/**
 * Obtener datos de REC filtrados
 */
async function obtenerDatosRecFiltrados_MASTER() {
    try {
        const rangeRec = `${MASTER_CONFIG.sheetName_REC}!A2:AB`;
        const allValuesRec = await obtenerDatosDeSheet_MASTER(MASTER_CONFIG.spreadsheetId_REC, rangeRec);
        
        return allValuesRec
            .filter(row => {
                const tieneReferencia = row[6] && row[6].trim() !== '';
                const esFULL = row[27] && row[27].trim().toUpperCase() === 'FULL';
                const tieneLote = row[8] && row[8].trim() !== '';
                return tieneReferencia && esFULL && tieneLote;
            })
            .map(row => [
                row[0] || '',    // Documento
                row[6] || '',    // Referencia
                row[8] || '',    // Lote
                row[3] || ''     // Proveedor
            ]);
            
    } catch (error) {
        console.error("Error en obtenerDatosRecFiltrados_MASTER:", error);
        return [];
    }
}

/**
 * Obtener datos de SIESA (facturas)
 */
async function obtenerDatosSiesa_MASTER() {
    try {
        const [siesaData, siesaV2Data] = await Promise.all([
            obtenerDatosDeSheet_MASTER(MASTER_CONFIG.spreadsheetId_SIESA, `${MASTER_CONFIG.sheetName_SIESA}!A:G`),
            obtenerDatosDeSheet_MASTER(MASTER_CONFIG.spreadsheetId_SIESA, `${MASTER_CONFIG.sheetName_SIESA_V2}!A:D`)
        ]);
        
        // Procesar agregaciones de SIESA_V2
        const agregaciones = {};
        siesaV2Data.forEach(row => {
            if (row.length >= 3) {
                const key = String(row[0] || '').trim();
                const valor1 = parseFloat(row[1]) || 0;
                const valor2 = String(row[2] || '').trim();
                const valor3 = parseFloat(row[3]) || 0;
                
                if (key) {
                    if (!agregaciones[key]) {
                        agregaciones[key] = {
                            sumValor1: valor1,
                            itemsValor2: [valor2],
                            sumValor3: valor3
                        };
                    } else {
                        agregaciones[key].sumValor1 += valor1;
                        agregaciones[key].itemsValor2.push(valor2);
                        agregaciones[key].sumValor3 += valor3;
                    }
                }
            }
        });
        
        // Estados a excluir
        const estadosExcluir = ["Anuladas", "En elaboración"];
        const prefijosFactura = ["017", "FEV", "029", "FVE"];
        const clientesPermitidos = new Set(Object.keys(MASTER_CLIENTS_MAP));
        
        // Filtrar y mapear SIESA
        return siesaData
            .filter(row => row.length >= 4)
            .filter(row => !estadosExcluir.includes(row[0] || ''))
            .filter(row => prefijosFactura.some(prefijo => (row[1] || '').startsWith(prefijo)))
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
                const agregacion = agregaciones[factura] || {
                    sumValor1: 0,
                    itemsValor2: [],
                    sumValor3: 0
                };
                
                return [
                    row[0],                    // Estado
                    factura,                   // Factura
                    formatearFecha_MASTER(row[2]), // Fecha formateada
                    lote,                      // Lote
                    codProveedor,              // Código proveedor
                    clienteNormalizado,         // Cliente normalizado
                    agregacion.sumValor1,       // Valor agregado
                    agregacion.itemsValor2,     // Array de referencias
                    agregacion.sumValor3,       // Cantidad agregada
                    MASTER_CLIENTS_MAP[clienteNormalizado] || "" // NIT
                ];
            })
            .filter(row => row !== null);
            
    } catch (error) {
        console.error("Error en obtenerDatosSiesa_MASTER:", error);
        return [];
    }
}

/**
 * Obtener datos de SOPORTES (entregas)
 */
async function obtenerDatosSoportes_MASTER() {
    try {
        const rangeSoportes = `${MASTER_CONFIG.sheetName_SOPORTES}!A:H`;
        const allValuesSoportes = await obtenerDatosDeSheet_MASTER(MASTER_CONFIG.spreadsheetId_SOPORTES, rangeSoportes);
        
        if (!allValuesSoportes || allValuesSoportes.length <= 1) {
            return {};
        }
        
        const mapaSoportes = {};
        
        allValuesSoportes.slice(1).forEach((row, index) => {
            if (row.length >= 7) {
                const fechaEntrega = row[0] || '';
                const documento = String(row[1] || '').trim();
                const lote = String(row[2] || '').trim();
                const referencia = String(row[3] || '').trim();
                const cantidad = String(row[4] || '').trim();
                const factura = String(row[5] || '').trim();
                const nit = String(row[6] || '').trim();
                const imageId = row.length >= 8 ? String(row[7] || '').trim() : '';
                
                if (factura) {
                    if (mapaSoportes[factura]) {
                        console.warn(`Factura duplicada en soportes: ${factura}`);
                    }
                    
                    mapaSoportes[factura] = {
                        fechaEntrega,
                        imageId,
                        estado: 'ENTREGADO',
                        documento,
                        lote,
                        referencia,
                        cantidad,
                        nit,
                        _fila: index + 2,
                        _timestamp: new Date().toISOString()
                    };
                }
            }
        });
        
        console.log(`📊 Soportes cargados: ${Object.keys(mapaSoportes).length} facturas entregadas`);
        return mapaSoportes;
        
    } catch (error) {
        console.error("Error en obtenerDatosSoportes_MASTER:", error);
        return {};
    }
}

// ============================================
// FUNCIONES DE COMBINACIÓN Y TRANSFORMACIÓN
// ============================================

/**
 * Combinar todas las fuentes de datos
 */
function combinarDatosMaestro(datosData2, datosSiesa, datosSoportes, datosRec) {
    const datosCombinados = [];
    const lotesProcesados = new Set();
    const facturasProcesadasSiesa = new Set();
    
    console.log("🔄 Combinando datos maestros...");
    
    // Procesar DATA2
    datosData2.forEach(item => {
        const documento = "REC" + item.documento;
        const referencia = item.referencia;
        const lote = item.lote;
        const loteKey = `${documento}_${lote}`;
        
        if (lotesProcesados.has(loteKey)) return;
        
        const facturasSiesa = datosSiesa.filter(fila => 
            String(fila[3]).trim() === String(lote).trim()
        );
        
        if (facturasSiesa.length > 0) {
            lotesProcesados.add(loteKey);
            
            const datosRelacionados = facturasSiesa.map(factura => {
                const numFactura = factura[1];
                if (numFactura) facturasProcesadasSiesa.add(numFactura);
                
                return construirObjetoFactura_MASTER(
                    factura, documento, lote, referencia, datosSoportes
                );
            });
            
            datosCombinados.push({
                documento: documento,
                referencia: referencia,
                lote: lote,
                fuente: "DATA2",
                datosSiesa: datosRelacionados
            });
        }
    });
    
    // Procesar REC
    datosRec.forEach(item => {
        const documento = item[0];
        const referencia = item[1];
        const lote = item[2];
        const loteKey = `${documento}_${lote}`;
        
        if (lotesProcesados.has(loteKey)) return;
        
        const facturasSiesa = datosSiesa.filter(fila => 
            String(fila[3]).trim() === String(lote).trim()
        );
        
        if (facturasSiesa.length > 0) {
            lotesProcesados.add(loteKey);
            
            const datosRelacionados = facturasSiesa.map(factura => {
                const numFactura = factura[1];
                if (numFactura) facturasProcesadasSiesa.add(numFactura);
                
                return construirObjetoFactura_MASTER(
                    factura, documento, lote, referencia, datosSoportes
                );
            });
            
            datosCombinados.push({
                documento: documento,
                referencia: referencia,
                lote: lote,
                fuente: "REC",
                datosSiesa: datosRelacionados
            });
        }
    });
    
    // Procesar facturas huérfanas de SIESA
    datosSiesa.forEach(filaSiesa => {
        const factura = filaSiesa[1];
        if (factura && !facturasProcesadasSiesa.has(factura)) {
            const loteSiesa = filaSiesa[3];
            const objFactura = construirObjetoFactura_MASTER(
                filaSiesa, "SIN_DOC", loteSiesa, "SIN_REF", datosSoportes
            );
            
            datosCombinados.push({
                documento: "SIN_DOC",
                referencia: "SIN_REF",
                lote: loteSiesa || "",
                fuente: "SIESA (Sin origen)",
                datosSiesa: [objFactura]
            });
            
            facturasProcesadasSiesa.add(factura);
        }
    });
    
    return datosCombinados;
}

/**
 * Construir objeto de factura completo
 */
function construirObjetoFactura_MASTER(filaSiesa, documento, loteDoc, referenciaDoc, datosSoportes) {
    const codProveedor = Number(filaSiesa[4]);
    let nombreProveedor = filaSiesa[4];
    
    if (codProveedor === 5) {
        nombreProveedor = "TEXTILES Y CREACIONES EL UNIVERSO SAS";
    } else if (codProveedor === 3) {
        nombreProveedor = "TEXTILES Y CREACIONES LOS ANGELES SAS";
    }
    
    const factura = filaSiesa[1];
    const fechaFactura = filaSiesa[2];
    const loteSiesa = filaSiesa[3];
    const cliente = filaSiesa[5];
    const nitCliente = filaSiesa[9] || '';
    
    const referenciasArray = Array.isArray(filaSiesa[7]) ? filaSiesa[7] : [];
    const cantidadTotal = filaSiesa[8] || 0;
    const valorBruto = filaSiesa[6] || 0;
    
    let referenciaFinal;
    if (referenciasArray.length === 1) {
        referenciaFinal = referenciasArray[0];
    } else if (referenciasArray.length > 1) {
        referenciaFinal = "RefVar";
    } else {
        referenciaFinal = referenciaDoc;
    }
    
    let confirmacion = "";
    let ih3 = "";
    let fechaEntrega = "";
    
    if (factura && datosSoportes && datosSoportes[factura]) {
        const soporte = datosSoportes[factura];
        confirmacion = "ENTREGADO";
        ih3 = soporte.imageId ? MASTER_CONFIG.baseImageUrl + soporte.imageId : "";
        fechaEntrega = soporte.fechaEntrega || "";
    }
    
    return {
        estado: filaSiesa[0],
        factura: factura,
        fecha: fechaFactura,
        fechaEntrega: fechaEntrega,
        lote: loteSiesa || loteDoc,
        proovedor: nombreProveedor,
        cliente: cliente,
        nit: nitCliente,
        valorBruto: valorBruto,
        referencia: referenciaFinal,
        cantidad: cantidadTotal,
        confirmacion: confirmacion,
        Ih3: ih3
    };
}

// ============================================
// TRANSFORMACIÓN PARA LLM
// ============================================

/**
 * Transformar datos combinados a formato optimizado para LLM
 */
function transformarParaLLM(datosCombinados) {
    const facturasLLM = [];
    
    datosCombinados.forEach(documento => {
        if (!documento.datosSiesa || !Array.isArray(documento.datosSiesa)) return;
        
        documento.datosSiesa.forEach(factura => {
            if (!factura.factura || factura.factura.trim() === '') return;
            
            // Normalizar fechas
            const fechaFacturaObj = parseFecha_MASTER(factura.fecha);
            const fechaFacturaStr = fechaFacturaObj ? fechaFacturaObj.toISOString().split('T')[0] : null;
            
            const fechaEntregaObj = parseFecha_MASTER(factura.fechaEntrega);
            const fechaEntregaStr = fechaEntregaObj ? fechaEntregaObj.toISOString().split('T')[0] : null;
            const fechaEntregaISO = fechaEntregaObj ? fechaEntregaObj.toISOString() : null;
            
            // Extraer año, mes, día de AMBAS fechas
            const anioFactura = fechaFacturaObj ? fechaFacturaObj.getFullYear() : null;
            const mesFactura = fechaFacturaObj ? fechaFacturaObj.getMonth() + 1 : null;
            const diaFactura = fechaFacturaObj ? fechaFacturaObj.getDate() : null;
            
            const anioEntrega = fechaEntregaObj ? fechaEntregaObj.getFullYear() : null;
            const mesEntrega = fechaEntregaObj ? fechaEntregaObj.getMonth() + 1 : null;
            const diaEntrega = fechaEntregaObj ? fechaEntregaObj.getDate() : null;
            
            const cliente = factura.cliente || '';
            const proveedor = factura.proovedor || '';
            const referencia = factura.referencia || documento.referencia || '';
            const lote = factura.lote || documento.lote || '';
            const cantidad = factura.cantidad || 0;
            const valor = factura.valorBruto || 0;
            const estadoEntrega = factura.confirmacion || 'PENDIENTE';
            const estadoSiesa = factura.estado || '';
            
            // Calcular tiempo de entrega si aplica
            let diasEntrega = null;
            let horasEntrega = null;
            let minutosEntrega = null;
            
            if (fechaFacturaObj && fechaEntregaObj && estadoEntrega === "ENTREGADO") {
                const diffMs = fechaEntregaObj - fechaFacturaObj;
                diasEntrega = Math.round(diffMs / (1000 * 60 * 60 * 24));
                horasEntrega = Math.round(diffMs / (1000 * 60 * 60));
                minutosEntrega = Math.round(diffMs / (1000 * 60));
            }
            
            // Texto completo para embeddings semánticos
            const textoCompleto = `Factura ${factura.factura} del cliente ${cliente}. ` +
                `Lote ${lote}. Referencia ${referencia}. Cantidad: ${cantidad} unidades. ` +
                `Valor bruto: $${valor.toLocaleString('es-CO')}. Estado de la factura: ${estadoSiesa}. ` +
                `Estado de entrega: ${estadoEntrega}. Proveedor: ${proveedor}. ` +
                `Documento origen: ${documento.documento}. ` +
                `Fecha factura: ${fechaFacturaStr || 'N/A'}. ` +
                `Fecha entrega: ${fechaEntregaStr || 'N/A'}. ` +
                (diasEntrega ? `Tiempo de entrega: ${diasEntrega} días.` : '');
            
            facturasLLM.push({
                // IDs
                id_unico: `${factura.factura}_${documento.documento}`,
                factura: factura.factura,
                documento_origen: documento.documento,
                
                // Datos Siesa
                estado_siesa: estadoSiesa,
                fecha_factura: fechaFacturaStr,
                fecha_factura_obj: fechaFacturaObj ? fechaFacturaObj.toISOString() : null,
                lote: lote,
                cliente: cliente,
                nit_cliente: factura.nit || '',
                proveedor: proveedor,
                valor_bruto: valor,
                referencia: referencia,
                cantidad: cantidad,
                
                // Datos Entrega
                estado_entrega: estadoEntrega,
                fecha_entrega: fechaEntregaStr,
                fecha_entrega_obj: fechaEntregaISO,
                url_soporte: factura.Ih3 || '',
                
                // Métricas de tiempo
                dias_entrega: diasEntrega,
                horas_entrega: horasEntrega,
                minutos_entrega: minutosEntrega,
                
                // Metadatos para filtrado (FACTURA)
                anio_factura: anioFactura,
                mes_factura: mesFactura,
                dia_factura: diaFactura,
                
                // Metadatos para filtrado (ENTREGA)
                anio_entrega: anioEntrega,
                mes_entrega: mesEntrega,
                dia_entrega: diaEntrega,
                
                cliente_keywords: cliente.toLowerCase().split(/\s+/).filter(k => k.length > 2),
                proveedor_keywords: proveedor.toLowerCase().split(/\s+/).filter(k => k.length > 2),
                lote_numerico: parseInt(lote, 10) || null,
                valor_bruto_numerico: valor,
                cantidad_numerica: cantidad,
                
                // Texto para embeddings
                texto_completo: textoCompleto
            });
        });
    });
    
    // Eliminar duplicados por factura
    const unicos = new Map();
    facturasLLM.forEach(f => {
        if (!unicos.has(f.factura)) {
            unicos.set(f.factura, f);
        } else {
            console.log(`📌 Factura duplicada omitida: ${f.factura}`);
        }
    });
    
    const resultado = Array.from(unicos.values());
    console.log(`✅ Transformación completada: ${resultado.length} facturas únicas`);
    return resultado;
}

// ============================================
// FUNCIONES DE ANÁLISIS Y MÉTRICAS
// ============================================

/**
 * Generar métricas para LLM
 */
function generarMetricasLLM(datosLLM) {
    const metricas = {
        por_estado: {},
        por_cliente: {},
        por_proveedor: {},
        por_mes_factura: {},
        por_mes_entrega: {},
        por_dia_entrega: {},
        totales: {
            facturas: datosLLM.length,
            entregadas: 0,
            pendientes: 0,
            valor_total: 0,
            unidades_totales: 0,
            entregas_hoy: 0,
            entregas_ayer: 0,
            tiempo_promedio_entrega: 0
        }
    };
    
    const hoy = new Date().toISOString().split('T')[0];
    const ayer = new Date(Date.now() - 86400000).toISOString().split('T')[0];
    
    let sumaDiasEntrega = 0;
    let entregasConTiempo = 0;
    
    datosLLM.forEach(f => {
        // Totales
        metricas.totales.valor_total += f.valor_bruto || 0;
        metricas.totales.unidades_totales += f.cantidad || 0;
        
        if (f.estado_entrega === "ENTREGADO") {
            metricas.totales.entregadas++;
            
            // Calcular tiempo de entrega
            if (f.dias_entrega !== null) {
                sumaDiasEntrega += f.dias_entrega;
                entregasConTiempo++;
            }
            
            // Contar entregas de hoy y ayer
            if (f.fecha_entrega === hoy) {
                metricas.totales.entregas_hoy++;
            }
            if (f.fecha_entrega === ayer) {
                metricas.totales.entregas_ayer++;
            }
        } else {
            metricas.totales.pendientes++;
        }
        
        // Por estado
        const estado = f.estado_entrega;
        metricas.por_estado[estado] = (metricas.por_estado[estado] || 0) + 1;
        
        // Por cliente
        const cliente = f.cliente;
        if (!metricas.por_cliente[cliente]) {
            metricas.por_cliente[cliente] = {
                total: 0,
                entregadas: 0,
                pendientes: 0,
                valor_total: 0,
                unidades_total: 0,
                entregas_hoy: 0,
                tiempo_promedio: 0,
                suma_tiempo: 0,
                entregas_con_tiempo: 0
            };
        }
        metricas.por_cliente[cliente].total++;
        metricas.por_cliente[cliente].valor_total += f.valor_bruto || 0;
        metricas.por_cliente[cliente].unidades_total += f.cantidad || 0;
        
        if (f.estado_entrega === "ENTREGADO") {
            metricas.por_cliente[cliente].entregadas++;
            if (f.fecha_entrega === hoy) {
                metricas.por_cliente[cliente].entregas_hoy++;
            }
            if (f.dias_entrega !== null) {
                metricas.por_cliente[cliente].suma_tiempo += f.dias_entrega;
                metricas.por_cliente[cliente].entregas_con_tiempo++;
            }
        } else {
            metricas.por_cliente[cliente].pendientes++;
        }
        
        // Por mes (factura)
        if (f.anio_factura && f.mes_factura) {
            const key = `${f.anio_factura}-${String(f.mes_factura).padStart(2, '0')}`;
            metricas.por_mes_factura[key] = (metricas.por_mes_factura[key] || 0) + 1;
        }
        
        // Por mes (entrega)
        if (f.anio_entrega && f.mes_entrega && f.estado_entrega === "ENTREGADO") {
            const key = `${f.anio_entrega}-${String(f.mes_entrega).padStart(2, '0')}`;
            metricas.por_mes_entrega[key] = (metricas.por_mes_entrega[key] || 0) + 1;
        }
        
        // Por día (entrega)
        if (f.fecha_entrega && f.estado_entrega === "ENTREGADO") {
            metricas.por_dia_entrega[f.fecha_entrega] = (metricas.por_dia_entrega[f.fecha_entrega] || 0) + 1;
        }
    });
    
    // Calcular promedios por cliente
    Object.keys(metricas.por_cliente).forEach(cliente => {
        const c = metricas.por_cliente[cliente];
        if (c.entregas_con_tiempo > 0) {
            c.tiempo_promedio = Math.round(c.suma_tiempo / c.entregas_con_tiempo);
        }
        delete c.suma_tiempo;
        delete c.entregas_con_tiempo;
    });
    
    // Calcular tiempo promedio general
    if (entregasConTiempo > 0) {
        metricas.totales.tiempo_promedio_entrega = Math.round(sumaDiasEntrega / entregasConTiempo);
    }
    
    return metricas;
}

/**
 * Generar resumen en texto para LLM
 */
function generarResumenTexto(datosLLM, metricas) {
    const entregadas = metricas.totales.entregadas;
    const pendientes = metricas.totales.pendientes;
    const total = metricas.totales.facturas;
    const pctEntregado = total > 0 ? ((entregadas / total) * 100).toFixed(1) : 0;
    
    const topClientes = Object.entries(metricas.por_cliente)
        .sort((a, b) => b[1].total - a[1].total)
        .slice(0, 5)
        .map(([cliente, data]) => {
            const tiempoStr = data.tiempo_promedio ? `, ⏱️ ${data.tiempo_promedio} días promedio` : '';
            return `${cliente}: ${data.total} facturas (${data.entregadas} entregadas, ${data.entregas_hoy || 0} hoy)${tiempoStr}`;
        });
    
    // Obtener entregas de hoy y ayer
    const hoy = new Date().toISOString().split('T')[0];
    const ayer = new Date(Date.now() - 86400000).toISOString().split('T')[0];
    
    const entregasHoy = metricas.por_dia_entrega?.[hoy] || 0;
    const entregasAyer = metricas.por_dia_entrega?.[ayer] || 0;
    
    // Clientes con entregas hoy
    const clientesHoy = Object.entries(metricas.por_cliente)
        .filter(([_, data]) => data.entregas_hoy > 0)
        .map(([cliente, data]) => `${cliente} (${data.entregas_hoy})`)
        .join(', ');
    
    return `
RESUMEN GENERAL DEL SISTEMA:
📊 Total facturas: ${total.toLocaleString('es-CO')}
✅ Entregadas: ${entregadas.toLocaleString('es-CO')} (${pctEntregado}%)
⏳ Pendientes: ${pendientes.toLocaleString('es-CO')}
💰 Valor total: $${metricas.totales.valor_total.toLocaleString('es-CO')}
📦 Unidades totales: ${metricas.totales.unidades_totales.toLocaleString('es-CO')}
⏱️ Tiempo promedio entrega: ${metricas.totales.tiempo_promedio_entrega} días

ENTREGAS RECIENTES:
📅 Hoy (${hoy}): ${entregasHoy} entregas
📅 Ayer (${ayer}): ${entregasAyer} entregas
${clientesHoy ? `👥 Clientes con entregas hoy: ${clientesHoy}` : ''}

PRINCIPALES CLIENTES:
${topClientes.map(c => `• ${c}`).join('\n')}

RANGOS DE FECHAS:
📆 Facturas: ${metricas.rangoFechasFactura?.min || 'N/A'} a ${metricas.rangoFechasFactura?.max || 'N/A'}
📦 Entregas: ${metricas.rangoFechasEntrega?.min || 'N/A'} a ${metricas.rangoFechasEntrega?.max || 'N/A'}
    `.trim();
}

/**
 * Obtener rango de fechas
 */
function obtenerRangoFechas(datosLLM, campo) {
    const fechas = datosLLM
        .map(f => f[campo])
        .filter(f => f)
        .sort();
    
    if (fechas.length === 0) return null;
    
    return {
        min: fechas[0],
        max: fechas[fechas.length - 1]
    };
}

/**
 * Formatear fecha (DD/MM/YYYY -> MM/DD/YYYY para JS)
 */
function formatearFecha_MASTER(fechaStr) {
    if (!fechaStr || typeof fechaStr !== 'string') return fechaStr;
    const partes = fechaStr.split('/');
    return partes.length === 3 ? `${partes[1]}/${partes[0]}/${partes[2]}` : fechaStr;
}

/**
 * Parsear fecha desde string
 */
function parseFecha_MASTER(fechaStr) {
    if (!fechaStr) return null;
    
    try {
        if (fechaStr instanceof Date) return fechaStr;
        
        if (typeof fechaStr === 'string') {
            // Intentar formato YYYY-MM-DD (ISO)
            if (fechaStr.match(/^\d{4}-\d{2}-\d{2}/)) {
                return new Date(fechaStr);
            }
            
            const partes = fechaStr.split(' ');
            const fechaPartes = partes[0].split('/');
            
            if (fechaPartes.length === 3) {
                const dia = parseInt(fechaPartes[0], 10);
                const mes = parseInt(fechaPartes[1], 10) - 1;
                const anio = parseInt(fechaPartes[2], 10);
                
                let hora = 0, minuto = 0, segundo = 0;
                if (partes.length > 1) {
                    const tiempoPartes = partes[1].split(':');
                    hora = parseInt(tiempoPartes[0] || 0, 10);
                    minuto = parseInt(tiempoPartes[1] || 0, 10);
                    segundo = parseInt(tiempoPartes[2] || 0, 10);
                }
                
                return new Date(anio, mes, dia, hora, minuto, segundo);
            }
        }
        
        const timestamp = Date.parse(fechaStr);
        if (!isNaN(timestamp)) return new Date(timestamp);
        
    } catch (e) {
        console.warn('Error parseando fecha:', fechaStr);
    }
    
    return null;
}

// ============================================
// EXPORTAR FUNCIONES
// ============================================

// Para uso en navegador
if (typeof window !== 'undefined') {
    window.getMasterLLMData = getMasterLLMData;
    window.MASTER_API_KEY = MASTER_API_KEY;
    window.MASTER_CLIENTS_MAP = MASTER_CLIENTS_MAP;
    console.log("✅ Master LLM Retriever cargado. Usa getMasterLLMData() para obtener datos optimizados.");
}

// Para uso en Node.js
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        getMasterLLMData,
        MASTER_API_KEY,
        MASTER_CONFIG,
        MASTER_CLIENTS_MAP
    };
}