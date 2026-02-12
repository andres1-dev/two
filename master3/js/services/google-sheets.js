// ============================================
// CACHE Y CONFIGURACIÓN DE PERFORMANCE
// ============================================

const sheetCache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutos
const BATCH_SIZE = 1000; // Procesamiento por lotes para mejor performance

// ============================================
// FUNCIONES BASE DE CONSULTA OPTIMIZADAS
// ============================================

async function fetchSheetData(range, useCache = true) {
    const cacheKey = `${SPREADSHEET_ID}:${range}`;
    
    // Verificar caché
    if (useCache) {
        const cached = sheetCache.get(cacheKey);
        if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
            console.log(`📦 Cache hit para: ${range}`);
            return cached.data;
        }
    }
    
    // Fetch desde API
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${range}?key=${API_KEY}`;
    const startTime = performance.now();
    
    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        const fetchTime = performance.now() - startTime;
        console.log(`🌐 Fetch completado en ${fetchTime.toFixed(0)}ms: ${range}`);
        
        // Guardar en caché
        if (useCache && data.values) {
            sheetCache.set(cacheKey, {
                data,
                timestamp: Date.now()
            });
        }
        
        return data;
    } catch (error) {
        console.error(`❌ Error fetchSheetData para ${range}:`, error);
        
        // Intentar usar caché expirada como fallback
        const cached = sheetCache.get(cacheKey);
        if (cached) {
            console.warn(`⚠️ Usando caché expirada como fallback para: ${range}`);
            return cached.data;
        }
        
        throw error;
    }
}

// ============================================
// CARGA DE DATOS PRINCIPALES
// ============================================

/**
 * Carga los datos de usuarios (escaners) desde la hoja USUARIOS
 * Estructura: USUARIO | NOMBRE | ESTADO (TRUE/FALSE)
 */
async function loadUsuariosData() {
    const data = await fetchSheetData(CONFIG_SHEETS.USUARIOS);
    const usuariosMap = new Map();
    
    if (data.values && data.values.length > 0) {
        const startTime = performance.now();
        
        // Omitir header row (índice 0)
        for (let i = 1; i < data.values.length; i += BATCH_SIZE) {
            const end = Math.min(i + BATCH_SIZE, data.values.length);
            for (let j = i; j < end; j++) {
                const row = data.values[j];
                if (row.length >= 3) {
                    const usuario = (row[0] || '').trim();
                    const nombre = (row[1] || '').trim();
                    const estado = (row[2] || '').toString().toUpperCase().trim();
                    
                    // Solo agregar si el estado es TRUE o si no se especifica estado (por compatibilidad)
                    if (usuario && nombre && (estado === 'TRUE' || estado === '')) {
                        usuariosMap.set(usuario, nombre);
                    }
                }
            }
            if (i % (BATCH_SIZE * 10) === 0) {
                await new Promise(resolve => setTimeout(resolve, 0));
            }
        }
        
        const loadTime = performance.now() - startTime;
        console.log(`✅ USUARIOS cargados: ${usuariosMap.size} usuarios activos en ${loadTime.toFixed(0)}ms`);
    }
    
    setEscanersMap(usuariosMap);
    return usuariosMap;
}

/**
 * Carga los datos de proveedores desde la hoja PROVEEDORES
 * Estructura: CODIGO | NOMBRE | ESTADO (TRUE/FALSE)
 */
async function loadProveedoresData() {
    const data = await fetchSheetData(CONFIG_SHEETS.PROVEEDORES);
    const proveedoresMap = new Map();
    
    if (data.values && data.values.length > 0) {
        const startTime = performance.now();
        
        for (let i = 1; i < data.values.length; i += BATCH_SIZE) {
            const end = Math.min(i + BATCH_SIZE, data.values.length);
            for (let j = i; j < end; j++) {
                const row = data.values[j];
                if (row.length >= 3) {
                    const codigo = (row[0] || '').trim();
                    const nombre = (row[1] || '').trim();
                    const estado = (row[2] || '').toString().toUpperCase().trim();
                    
                    if (codigo && nombre && (estado === 'TRUE' || estado === '')) {
                        proveedoresMap.set(codigo, nombre);
                    }
                }
            }
            if (i % (BATCH_SIZE * 10) === 0) {
                await new Promise(resolve => setTimeout(resolve, 0));
            }
        }
        
        const loadTime = performance.now() - startTime;
        console.log(`✅ PROVEEDORES cargados: ${proveedoresMap.size} proveedores activos en ${loadTime.toFixed(0)}ms`);
    }
    
    setProveedoresMap(proveedoresMap);
    return proveedoresMap;
}

/**
 * Carga los datos de auditores desde la hoja AUDITORES
 * Estructura: CODIGO | NOMBRE | ESTADO (TRUE/FALSE)
 */
async function loadAuditoresData() {
    const data = await fetchSheetData(CONFIG_SHEETS.AUDITORES);
    const auditoresMap = new Map();
    
    if (data.values && data.values.length > 0) {
        const startTime = performance.now();
        
        for (let i = 1; i < data.values.length; i += BATCH_SIZE) {
            const end = Math.min(i + BATCH_SIZE, data.values.length);
            for (let j = i; j < end; j++) {
                const row = data.values[j];
                if (row.length >= 3) {
                    const codigo = (row[0] || '').trim();
                    const nombre = (row[1] || '').trim();
                    const estado = (row[2] || '').toString().toUpperCase().trim();
                    
                    if (codigo && nombre && (estado === 'TRUE' || estado === '')) {
                        auditoresMap.set(codigo, nombre);
                    }
                }
            }
            if (i % (BATCH_SIZE * 10) === 0) {
                await new Promise(resolve => setTimeout(resolve, 0));
            }
        }
        
        const loadTime = performance.now() - startTime;
        console.log(`✅ AUDITORES cargados: ${auditoresMap.size} auditores activos en ${loadTime.toFixed(0)}ms`);
    }
    
    setAuditoresMap(auditoresMap);
    return auditoresMap;
}

/**
 * Carga los datos de gestores desde la hoja GESTORES
 * Estructura: CODIGO | NOMBRE | ESTADO (TRUE/FALSE)
 */
async function loadGestoresData() {
    const data = await fetchSheetData(CONFIG_SHEETS.GESTORES);
    const gestoresMap = new Map();
    
    if (data.values && data.values.length > 0) {
        const startTime = performance.now();
        
        for (let i = 1; i < data.values.length; i += BATCH_SIZE) {
            const end = Math.min(i + BATCH_SIZE, data.values.length);
            for (let j = i; j < end; j++) {
                const row = data.values[j];
                if (row.length >= 3) {
                    const codigo = (row[0] || '').trim();
                    const nombre = (row[1] || '').trim();
                    const estado = (row[2] || '').toString().toUpperCase().trim();
                    
                    if (codigo && nombre && (estado === 'TRUE' || estado === '')) {
                        gestoresMap.set(codigo, nombre);
                    }
                }
            }
            if (i % (BATCH_SIZE * 10) === 0) {
                await new Promise(resolve => setTimeout(resolve, 0));
            }
        }
        
        const loadTime = performance.now() - startTime;
        console.log(`✅ GESTORES cargados: ${gestoresMap.size} gestores activos en ${loadTime.toFixed(0)}ms`);
    }
    
    setGestoresMap(gestoresMap);
    return gestoresMap;
}

/**
 * Carga todos los datos de configuración dinámica
 */
async function loadAllConfigData() {
    console.log('🔄 Cargando datos de configuración dinámica...');
    
    const startTime = performance.now();
    
    await Promise.all([
        loadUsuariosData(),
        loadProveedoresData(),
        loadAuditoresData(),
        loadGestoresData()
    ]);
    
    const loadTime = performance.now() - startTime;
    console.log(`✅ Todos los datos de configuración cargados en ${loadTime.toFixed(0)}ms`);
}

// ============================================
// FUNCIONES EXISTENTES PARA CARGA DE DATOS
// ============================================

async function loadColoresData() {
    const data = await fetchSheetData('COLORES');
    if (data.values && data.values.length > 0) {
        coloresMap.clear();
        const startTime = performance.now();
        
        for (let i = 1; i < data.values.length; i += BATCH_SIZE) {
            const end = Math.min(i + BATCH_SIZE, data.values.length);
            for (let j = i; j < end; j++) {
                const row = data.values[j];
                if (row.length >= 2) {
                    const codigo = row[0] || '';
                    const color = row[1] || '';
                    if (codigo && color) {
                        coloresMap.set(codigo.trim(), color.trim());
                    }
                }
            }
            if (i % (BATCH_SIZE * 10) === 0) {
                await new Promise(resolve => setTimeout(resolve, 0));
            }
        }
        
        const loadTime = performance.now() - startTime;
        console.log(`✅ COLORES cargados: ${coloresMap.size} registros en ${loadTime.toFixed(0)}ms`);
    }
    return coloresMap;
}

async function loadData2Data() {
    const data = await fetchSheetData('DATA2');
    if (data.values && data.values.length > 0) {
        data2Map.clear();
        const startTime = performance.now();
        
        for (let i = 1; i < data.values.length; i++) {
            const row = data.values[i];
            if (row.length >= 1) {
                const op = row[0] || '';
                if (op) data2Map.set(op.trim(), true);
            }
        }
        
        const loadTime = performance.now() - startTime;
        console.log(`✅ DATA2 cargada: ${data2Map.size} OPs en ${loadTime.toFixed(0)}ms`);
    }
    return data2Map;
}

async function loadPreciosData() {
    const data = await fetchSheetData('PRECIOS');
    if (data.values && data.values.length > 0) {
        preciosMap.clear();
        const startTime = performance.now();
        
        for (let i = 1; i < data.values.length; i += BATCH_SIZE) {
            const end = Math.min(i + BATCH_SIZE, data.values.length);
            for (let j = i; j < end; j++) {
                const row = data.values[j];
                if (row.length >= 2) {
                    const referencia = row[0] || '';
                    const pvp = row[1] || '';
                    if (referencia && pvp) {
                        preciosMap.set(referencia.trim(), pvp.trim());
                    }
                }
            }
            if (i % (BATCH_SIZE * 10) === 0) {
                await new Promise(resolve => setTimeout(resolve, 0));
            }
        }
        
        const loadTime = performance.now() - startTime;
        console.log(`✅ PRECIOS cargados: ${preciosMap.size} referencias en ${loadTime.toFixed(0)}ms`);
    }
    return preciosMap;
}

async function loadSisproData() {
    const data = await fetchSheetData('SISPROWEB');
    if (data.values && data.values.length > 0) {
        sisproMap.clear();
        const startTime = performance.now();
        
        for (let i = 1; i < data.values.length; i += BATCH_SIZE) {
            const end = Math.min(i + BATCH_SIZE, data.values.length);
            for (let j = i; j < end; j++) {
                const row = data.values[j];
                if (row.length >= 4) {
                    const op = row[0] || '';
                    if (op) {
                        sisproMap.set(op.trim(), {
                            PRENDA: (row[1] || '').trim(),
                            LINEA: (row[2] || '').trim(),
                            GENERO: (row[3] || '').trim()
                        });
                    }
                }
            }
            if (i % (BATCH_SIZE * 10) === 0) {
                await new Promise(resolve => setTimeout(resolve, 0));
            }
        }
        
        const loadTime = performance.now() - startTime;
        console.log(`✅ SISPROWEB cargado: ${sisproMap.size} productos en ${loadTime.toFixed(0)}ms`);
    }
    return sisproMap;
}

async function loadHistoricasData() {
    const data = await fetchSheetData('HISTORICAS');
    if (data.values && data.values.length > 0) {
        historicasMap.clear();
        const startTime = performance.now();
        
        for (let i = 1; i < data.values.length; i++) {
            const row = data.values[i];
            if (row.length >= 2) {
                const refprov = row[0] || '';
                const referencia = row[1] || '';
                if (refprov) historicasMap.set(refprov.trim(), referencia.trim());
            }
        }
        
        const loadTime = performance.now() - startTime;
        console.log(`✅ HISTORICAS cargadas: ${historicasMap.size} referencias en ${loadTime.toFixed(0)}ms`);
    }
    return historicasMap;
}

async function loadClientesData() {
    const data = await fetchSheetData('CLIENTES');
    if (data.values && data.values.length > 0) {
        clientesMap.clear();
        console.log('📥 Cargando CLIENTES desde Google Sheets...');
        const startTime = performance.now();

        for (let i = 1; i < data.values.length; i += BATCH_SIZE) {
            const end = Math.min(i + BATCH_SIZE, data.values.length);
            for (let j = i; j < end; j++) {
                const row = data.values[j];
                const id = row[0] || '';

                if (id && id.trim()) {
                    clientesMap.set(id.trim(), {
                        ID: id.trim(),
                        RAZON_SOCIAL: (row[1] || '').trim(),
                        NOMBRE_CORTO: (row[2] || '').trim(),
                        TIPO_CLIENTE: (row[3] || '').trim(),
                        ESTADO: (row[4] || '').trim(),
                        DIRECCION: (row[5] || '').trim(),
                        TELEFONO: (row[6] || '').trim(),
                        EMAIL: (row[7] || '').trim(),
                        TIPO_EMPRESA: (row[8] || '').trim()
                    });
                }
            }
            if (i % (BATCH_SIZE * 10) === 0) {
                await new Promise(resolve => setTimeout(resolve, 0));
            }
        }
        
        const loadTime = performance.now() - startTime;
        console.log(`✅ CLIENTES cargados: ${clientesMap.size} clientes en ${loadTime.toFixed(0)}ms`);
    }
    return clientesMap;
}

// ============================================
// CONSULTAS ESPECÍFICAS PARA DISTRIBUCIÓN
// ============================================

async function fetchDistributionSheet(range) {
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${DISTRIBUTION_SPREADSHEET_ID}/values/${range}?key=${DISTRIBUTION_API_KEY}`;
    const response = await fetch(url);
    return await response.json();
}

async function checkIfRecExists(recNumber) {
    try {
        console.log(`Consultando si REC ${recNumber} existe...`);
        const range = `${DISTRIBUTION_SHEET_NAME}!A:A`;
        const data = await fetchDistributionSheet(range);

        if (!data.values) {
            return { exists: false, documents: [] };
        }

        const documentos = data.values.flat();
        const matchingDocuments = documentos.filter(doc => {
            if (!doc) return false;
            const docStr = doc.toString();
            const recStr = recNumber.toString();
            if (docStr === recStr) return true;
            if (docStr.startsWith(recStr + '.')) return true;
            return false;
        });

        return {
            exists: matchingDocuments.length > 0,
            documents: matchingDocuments,
            count: matchingDocuments.length
        };
    } catch (error) {
        console.error('Error consultando REC:', error);
        return { exists: false, error: error.message, documents: [] };
    }
}

async function verifyDocumentSavedExhaustive(recNumber, maxRetries = 5, initialDelay = 1000) {
    console.log(`Verificación exhaustiva para ${recNumber}...`);
    let delay = initialDelay;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            await new Promise(resolve => setTimeout(resolve, delay));
            const range = `${DISTRIBUTION_SHEET_NAME}!A:E`;
            const data = await fetchDistributionSheet(range);

            if (data.values) {
                for (let i = 0; i < data.values.length; i++) {
                    const row = data.values[i];
                    if (row[0] && row[0].toString() === recNumber.toString()) {
                        console.log(`✅ Documento encontrado en fila ${i + 1}`);
                        return {
                            success: true,
                            verified: true,
                            fila: i + 1,
                            documento: recNumber,
                            estado: row[3] || 'DESCONOCIDO',
                            comentarios: row[4] || '',
                            timestamp: new Date().toISOString(),
                            verificationMethod: 'Google Sheets API',
                            attempt: attempt
                        };
                    }
                }
            }
            console.log(`Documento ${recNumber} no encontrado en intento ${attempt}`);
            delay *= 2;
        } catch (error) {
            console.error(`Error en intento ${attempt}:`, error);
            if (attempt === maxRetries) {
                return { success: false, verified: false, error: `Error: ${error.message}` };
            }
            delay *= 2;
        }
    }

    return { success: false, verified: false, error: `No encontrado después de ${maxRetries} intentos` };
}