// main.js - FUNCIONES AUXILIARES COMPLETAS PARA APP AUTOEJECUTABLE

// ============================
// FUNCIONES DE LA API SHEETS
// ============================

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

// ============================
// FUNCIONES DE OBTENCIÓN DE DATOS
// ============================

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

async function obtenerDatosSIESA() {
    try {
        const [siesaResp, siesaV2Resp] = await Promise.all([
            fetchSheetDataOptimized(SPREADSHEET_IDS.SIESA, "SIESA!A2:G", false),
            fetchSheetDataOptimized(SPREADSHEET_IDS.SIESA, "SIESA_V2!A2:D", false)
        ]);
        
        const siesaData = {};
        const siesaV2Data = {};
        
        // Procesar SIESA principal
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
        
        // Procesar SIESA_V2
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
        
        // Procesar unificación
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

// ============================
// FUNCIONES DE BÚSQUEDA Y CÁLCULO
// ============================

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

// ============================
// FUNCIONES DE NORMALIZACIÓN
// ============================

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

// ============================
// FUNCIONES ADICIONALES DE UTILIDAD
// ============================

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

function calcularValidacion(lote, siesaLote) {
    if (!lote || !siesaLote) return false;
    
    const loteLimpio = String(lote).trim().replace(/\D/g, '');
    const siesaLoteLimpio = String(siesaLote).trim().replace(/\D/g, '');
    
    return loteLimpio === siesaLoteLimpio;
}

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

// ============================
// FUNCIONES DE INTERFAZ MEJORADAS
// ============================

function updateProgress(percent, message = '') {
    const progressElement = document.getElementById('progress');
    const statusElement = document.getElementById('currentStatus');
    
    if (progressElement) {
        progressElement.textContent = percent + '%';
    }
    
    if (statusElement && message) {
        statusElement.textContent = message;
    }
    
    // Actualizar barra de progreso visual si existe
    const progressBar = document.getElementById('progressBar');
    if (progressBar) {
        progressBar.style.width = percent + '%';
    }
}

function updateDocCount(count) {
    const docCountElement = document.getElementById('docCount');
    if (docCountElement) {
        docCountElement.textContent = count;
    }
}

function showStatus(message, type = 'info') {
    const statusElement = document.getElementById('statusMessage');
    if (statusElement) {
        statusElement.textContent = message;
        statusElement.className = `status ${type}`;
        statusElement.style.display = 'block';
        
        // Actualizar también el estado actual
        updateProgress(Math.min(95, parseInt(document.getElementById('progress')?.textContent || '0') + 5), message);
        
        console.log(`[${type.toUpperCase()}] ${message}`);
    }
}

// ============================
// FUNCIONES DE VALIDACIÓN
// ============================

function validarEstructuraJSON(jsonData) {
    if (!Array.isArray(jsonData)) {
        console.error('JSON debe ser un array');
        return false;
    }
    
    for (const item of jsonData) {
        if (!item.documento || !item.referencia || !item.lote || !Array.isArray(item.datosSiesa)) {
            console.error('Estructura inválida en item:', item);
            return false;
        }
        
        for (const siesaItem of item.datosSiesa) {
            const camposRequeridos = ['estado', 'factura', 'fecha', 'lote', 'proovedor', 'cliente', 'valorBruto', 'referencia', 'cantidad', 'nit', 'confirmacion'];
            for (const campo of camposRequeridos) {
                if (siesaItem[campo] === undefined) {
                    console.error(`Campo requerido faltante: ${campo}`, siesaItem);
                    return false;
                }
            }
        }
    }
    
    console.log('✅ Estructura JSON validada correctamente');
    return true;
}

// ============================
// FUNCIONES DE ESTADÍSTICAS
// ============================

function generarEstadisticas(jsonData) {
    const estadisticas = {
        totalDocumentos: jsonData.length,
        totalRegistrosSiesa: jsonData.reduce((sum, doc) => sum + doc.datosSiesa.length, 0),
        clientesUnicos: new Set(),
        estados: {},
        proveedores: new Set()
    };
    
    jsonData.forEach(doc => {
        doc.datosSiesa.forEach(siesa => {
            estadisticas.clientesUnicos.add(siesa.cliente);
            estadisticas.proveedores.add(siesa.proovedor);
            
            if (!estadisticas.estados[siesa.confirmacion]) {
                estadisticas.estados[siesa.confirmacion] = 0;
            }
            estadisticas.estados[siesa.confirmacion]++;
        });
    });
    
    estadisticas.clientesUnicos = Array.from(estadisticas.clientesUnicos);
    estadisticas.proveedores = Array.from(estadisticas.proveedores);
    
    console.log('📊 Estadísticas generadas:', estadisticas);
    return estadisticas;
}

// ============================
// INICIALIZACIÓN GLOBAL
// ============================

// Variable global para seguimiento del progreso
window.appProgress = {
    current: 0,
    total: 100,
    update: function(percent, message) {
        this.current = percent;
        updateProgress(percent, message);
    }
};

console.log('✅ main.js cargado correctamente');