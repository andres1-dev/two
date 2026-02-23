/**
 * mainData.js - DeepScope Autonomous Data Engine
 * Replicación exacta de la lógica de normalización de Sheets para IA.
 * Totalmente independiente de módulos externos.
 */

window.contextData = {
    config: {
        DATA2_ID: "133NiyjNApZGkEFs4jUvpJ9So-cSEzRVeW2FblwOCrjI",
        SIESA_ID: "1FcQhVIKtWy4O-aGTNfA6l4C5Q4_u1LZErpj3CMglfQM",
        REC_ID: "1esc5REq0c03nHLpGcLwZRW29yq2gZnrpbz75gCCjrqc",
        SOPORTES_ID: "1VaPBwgRu1QWhmsV_Qgf7cgraSxiAWRX6-wBEyUlGoJw",
        CLIENTS: {
            "INVERSIONES URBANA SAS": "901920844",
            "EL TEMPLO DE LA MODA FRESCA SAS": "900047252",
            "EL TEMPLO DE LA MODA SAS": "805027653",
            "ARISTIZABAL LOPEZ JESUS MARIA": "70825517",
            "QUINTERO ORTIZ JOSE ALEXANDER": "14838951",
            "QUINTERO ORTIZ PATRICIA YAMILET": "67006141",
            "ZULUAGA GOMEZ RUBEN ESTEBAN": "1007348825",
            "SON Y LIMON SAS": "900355664"
        }
    },

    isContextActive: false,
    isFetching: false,
    preparedContext: null,
    lastUpdate: null,
    errorLog: [],

    /**
     * Carga inicial silenciosa (desde caché o API)
     */
    async boot() {
        console.log("🚀 DeepScope: Engine Booting (Sin Cache Local)...");
        // Forzar siempre una actualización desde la API
        this.refresh();
    },

    /**
     * Alterna el estado del contexto maestro
     * Ya no descarga datos aquí, solo activa/desactiva el filtro de IA.
     */
    async toggleContext() {
        this.isContextActive = !this.isContextActive;
        const btn = document.getElementById('contextBtn');
        const icon = btn.querySelector('i');

        if (this.isContextActive) {
            btn.classList.add('active');
            // Si el motor nunca ha cargado datos, intentar una carga inicial
            if (!this.preparedContext || !this.preparedContext.db.length) {
                await this.refresh();
            }
        } else {
            btn.classList.remove('active');
        }
    },

    /**
     * Helper para peticiones directas a Google Sheets V4
     */
    async fetchSheet(id, range) {
        const apiKey = document.getElementById('apiKeyInput').value;
        if (!apiKey) {
            this.errorLog.push(`No hay API Key configurada para ${range.split('!')[0]}`);
            return [];
        }

        const url = `https://sheets.googleapis.com/v4/spreadsheets/${id}/values/${range}?key=${apiKey}`;
        try {
            console.log(`📥 Cargando: ${range.split('!')[0]}...`);
            const res = await fetch(url, { cache: 'no-store' });
            if (!res.ok) {
                const err = await res.json();
                const errorMsg = err.error?.message || `Error HTTP ${res.status}`;
                throw new Error(`${errorMsg} (Verifica que la hoja sea pública y la API Key esté activa)`);
            }
            const data = await res.json();
            const values = data.values || [];
            console.log(`✅ OK: ${range.split('!')[0]} (${values.length} filas)`);
            return values;
        } catch (e) {
            const msg = `❌ Error en ${range.split('!')[0]}: ${e.message}`;
            console.error(msg);
            this.errorLog.push(msg);
            return [];
        }
    },

    /**
     * Motor de normalización y combinación de datos (Core Logic)
     */
    async refresh() {
        if (this.isFetching) return;
        this.isFetching = true;
        this.errorLog = [];
        console.log("⚙️ DeepScope Engine: Iniciando obtención y cruce de datos...");

        try {
            const btn = document.getElementById('contextBtn');
            const icon = btn ? btn.querySelector('i') : null;
            if (icon) icon.className = 'fas fa-sync fa-spin';

            // 1. Descarga paralela de todas las fuentes necesarias
            const [d2Raw, siesaRaw, siesaV2Raw, recRaw, soportRaw] = await Promise.all([
                this.fetchSheet(this.config.DATA2_ID, "DATA2!S:S"),
                this.fetchSheet(this.config.SIESA_ID, "SIESA!A:G"),
                this.fetchSheet(this.config.SIESA_ID, "SIESA_V2!A:D"),
                this.fetchSheet(this.config.REC_ID, "DataBase!A2:AB"),
                this.fetchSheet(this.config.SOPORTES_ID, "SOPORTES!A:H")
            ]);

            // ... (resto de la lógica de procesamiento igual para mantener la integridad)
            // [Nota: El procesamiento sigue aquí, no lo corto para no romper el objeto]

            // 2. Mapear Soportes de Entrega (por Factura)
            const mapSop = {};
            soportRaw.slice(1).forEach(row => {
                const f = String(row[5] || '').trim();
                if (f) mapSop[f] = { date: row[0], delivered: true };
            });

            // 3. Mapear Agregaciones Siesa V2 (Valores, Referencias y Cantidades por Factura)
            const mapAgg = {};
            siesaV2Raw.forEach(row => {
                const f = String(row[0] || '').trim();
                if (!f) return;
                if (!mapAgg[f]) mapAgg[f] = { val: 0, refs: [], cant: 0 };

                mapAgg[f].val += parseFloat(row[1]) || 0;
                const ref = String(row[2] || '').trim();
                if (ref && !mapAgg[f].refs.includes(ref)) mapAgg[f].refs.push(ref);
                mapAgg[f].cant += parseFloat(row[3]) || 0;
            });

            // 4. Agrupar Datos de Siesa por Lote (Filtros aplicados)
            const siesaByLote = {};
            const prefijosValidos = ["017", "FEV", "029", "FVE"];
            const clientesValidos = new Set(Object.keys(this.config.CLIENTS));

            siesaRaw.forEach(row => {
                if (row.length < 4 || ["Anuladas", "En elaboración"].includes(row[0])) return;

                const factura = String(row[1] || '').trim();
                if (!prefijosValidos.some(p => factura.startsWith(p))) return;

                const cliRaw = (row[3] || '').replace(/S\.A\.S\.?/g, 'SAS').replace(/\s+/g, ' ').trim();
                if (!clientesValidos.has(cliRaw)) return;

                const codProv = Number(row[6]);
                const lote = String(codProv === 5 ? row[4] : (codProv === 3 ? row[5] : '')).trim();
                if (!lote) return;

                const agg = mapAgg[factura] || { val: parseFloat(row[6]) || 0, refs: [], cant: 0 };
                const sop = mapSop[factura] || { delivered: false };

                const factItem = {
                    f: factura,
                    cli: cliRaw,
                    date: row[2],
                    val: Math.round(agg.val),
                    cant: agg.cant,
                    ref: agg.refs.length > 1 ? "RefVar" : (agg.refs[0] || "N/A"),
                    ent: sop.delivered,
                    fEnt: sop.date || null
                };

                if (!siesaByLote[lote]) siesaByLote[lote] = [];
                siesaByLote[lote].push(factItem);
            });

            // 5. Construir Lista Maestra consolidando DATA2 y REC con Ultra-Compresión
            const masterDB = [];
            const lotesProcesados = new Set();

            const fastMap = (data, recId, lt, ref, dateStr = "") => {
                const facts = siesaByLote[lt] || [];
                // Intentar convertir fecha a timestamp para ordenamiento
                let ts = 0;
                if (dateStr) {
                    const d = new Date(dateStr);
                    ts = isNaN(d.getTime()) ? 0 : d.getTime();
                } else if (facts.length > 0 && facts[0].date) {
                    const d = new Date(facts[0].date);
                    ts = isNaN(d.getTime()) ? 0 : d.getTime();
                }

                return {
                    rec: recId,
                    lote: lt,
                    referencia: ref,
                    timestamp: ts,
                    facturas: facts.map(f => ({
                        factura: f.f,
                        cliente: f.cli,
                        valor: f.val,
                        entregado: f.ent ? true : false
                    })),
                    index: `${recId} ${lt} ${ref} ${facts.map(f => f.cli).join(' ')}`.toLowerCase()
                };
            };

            // Fuente A: DATA2
            d2Raw.forEach(row => {
                try {
                    if (!row[0]) return;
                    const jsonStr = row[0].replace(/&quot;/g, '"');
                    const data = JSON.parse(jsonStr);
                    const lt = String(data.LOTE).trim();

                    if (data.TIPO === "FULL" && lt && siesaByLote[lt]) {
                        masterDB.push(fastMap(data, "REC" + data.A, lt, data.REFERENCIA, data.FECHA));
                        lotesProcesados.add(lt);
                    }
                } catch (e) { }
            });

            // Fuente B: REC Base
            recRaw.forEach(row => {
                const lt = String(row[8] || '').trim();
                const esFull = String(row[27] || '').toUpperCase() === 'FULL';

                if (esFull && lt && siesaByLote[lt] && !lotesProcesados.has(lt)) {
                    masterDB.push(fastMap(null, row[0], lt, row[6], row[1])); // row[1] suele ser la fecha en REC
                    lotesProcesados.add(lt);
                }
            });

            this.preparedContext = {
                ts: new Date().toLocaleString(),
                count: masterDB.length,
                db: masterDB
            };
            this.lastUpdate = Date.now();

            console.log("✅ DeepScope: Base de datos sincronizada con éxito.");
            if (icon) icon.className = 'fas fa-database';

        } catch (error) {
            console.error("❌ DeepScope Engine Error:", error);
            this.errorLog.push(error.message);
            this.preparedContext = { db: [] };
            const btn = document.getElementById('contextBtn');
            const icon = btn ? btn.querySelector('i') : null;
            if (icon) icon.className = 'fas fa-exclamation-triangle';
        } finally {
            this.isFetching = false;
        }
    },

    /**
     * Genera un prompt filtrado delegando la lógica al DataFilterEngine interno.
     */
    getContextPrompt(query = "") {
        if (!this.isContextActive) return "";

        if (this.isFetching && (!this.preparedContext || !this.preparedContext.db.length)) {
            return "\n[SISTEMA: Cargando datos maestros...]\n";
        }

        if (!this.preparedContext || !this.preparedContext.db.length) {
            return "\n[SISTEMA: No hay datos cargados.]\n";
        }

        const now = new Date();
        const currentDate = now.toLocaleDateString('es-CO');

        // 1. Usar el motor interno de filtrado (Estricto por fechas)
        const filteredResults = window.DataFilterEngine.search(this.preparedContext.db, query);

        // 2. Preparar los datos
        const finalDB = window.DataFilterEngine.prepareForAI(filteredResults);

        if (finalDB.length === 0) {
            return `
--- CONTROL DE SEGURIDAD DE CONTEXTO ---
FECHA ACTUAL: ${currentDate}
ESTADO: No se ha especificado una fecha válida en la consulta o no hay datos para ese día.

INSTRUCCIÓN OBLIGATORIA: 
No tienes acceso a los datos de inventario/facturación sin una fecha. 
PIDE al usuario que especifique la fecha de consulta (ejemplo: "hoy", "ayer" o una fecha en formato AAAA-MM-DD). 
No inventes datos.
--- FIN ---
`;
        }

        return `
--- DATOS LOCALES FILTRADOS POR FECHA ---
FECHA DE CONSULTA DETECTADA EN: ${query}
Resultados: ${finalDB.length}
${JSON.stringify(finalDB)}

Instrucciones: Responde basándote solo en estos datos para la fecha solicitada.
--- FIN ---
`;
    }
};
