/**
 * dataFilter.js - DeepScope Internal Search & Filter Engine
 * Versión con detección inteligente de tipo de consulta
 */

window.DataFilterEngine = {
    // Cache de datos LLM
    llmData: null,
    
    /**
     * Inicializar el motor con datos
     */
    async init() {
        try {
            if (!this.llmData) {
                console.log("🔍 DataFilterEngine: Cargando datos maestros...");
                const result = await getMasterLLMData();
                if (result.success) {
                    this.llmData = result;
                    console.log(`✅ DataFilterEngine: ${result.metadata.totalFacturas} facturas cargadas`);
                    console.log(`   📅 Rango facturas: ${result.metadata.rangoFechasFactura?.min} a ${result.metadata.rangoFechasFactura?.max}`);
                    console.log(`   📦 Rango entregas: ${result.metadata.rangoFechasEntrega?.min} a ${result.metadata.rangoFechasEntrega?.max}`);
                } else {
                    console.error("❌ Error cargando datos:", result.error);
                }
            }
            return this.llmData;
        } catch (error) {
            console.error("❌ DataFilterEngine.init error:", error);
            return null;
        }
    },

    /**
     * Determina el tipo de consulta del usuario
     * @param {string} query - La pregunta del usuario
     * @returns {Object} Tipo de consulta y parámetros
     */
    detectQueryType(query) {
        const queryLower = query.toLowerCase();
        
        // Palabras clave para detectar tipo de consulta
        const palabrasEntrega = [
            'entrega', 'entregado', 'entregadas', 'entregados',
            'soporte', 'foto', 'fotografía', 'captura',
            'despacho', 'despachado', 'enviado'
        ];
        
        const palabrasFactura = [
            'factura', 'facturado', 'facturadas', 'facturados',
            'documento', 'rec', 'remisión', 'remision'
        ];
        
        const palabrasTiempo = [
            'hoy', 'ayer', 'semana', 'mes', 'año',
            'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
            'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'
        ];
        
        // Detectar si pregunta por entregas
        const esConsultaEntrega = palabrasEntrega.some(p => queryLower.includes(p));
        
        // Detectar si pregunta por facturación (por defecto, si no menciona entregas)
        const esConsultaFactura = !esConsultaEntrega || palabrasFactura.some(p => queryLower.includes(p));
        
        // Detectar período
        let periodo = null;
        let fechaEspecifica = null;
        
        // Detectar "hoy"
        if (queryLower.includes('hoy')) {
            const hoy = new Date();
            fechaEspecifica = hoy.toISOString().split('T')[0];
            periodo = 'dia';
        }
        // Detectar "ayer"
        else if (queryLower.includes('ayer')) {
            const ayer = new Date(Date.now() - 86400000);
            fechaEspecifica = ayer.toISOString().split('T')[0];
            periodo = 'dia';
        }
        // Detectar fecha específica (YYYY-MM-DD)
        else {
            const dateMatch = query.match(/(\d{4})-(\d{2})-(\d{2})/);
            if (dateMatch) {
                fechaEspecifica = dateMatch[0];
                periodo = 'dia';
            }
        }
        
        // Detectar año
        const yearMatch = query.match(/\b(202[4-9]|2030)\b/);
        if (yearMatch && !periodo) {
            periodo = 'año';
        }
        
        // Detectar mes
        const meses = ['enero','febrero','marzo','abril','mayo','junio',
                      'julio','agosto','septiembre','octubre','noviembre','diciembre'];
        const mesDetectado = meses.find(m => queryLower.includes(m));
        if (mesDetectado && !periodo) {
            periodo = 'mes';
        }
        
        return {
            tipo: esConsultaEntrega ? 'entrega' : 'factura',
            periodo: periodo,
            fechaEspecifica: fechaEspecifica,
            año: yearMatch ? parseInt(yearMatch[1]) : null,
            mes: mesDetectado ? meses.indexOf(mesDetectado) + 1 : null,
            esConsultaEntrega,
            esConsultaFactura
        };
    },

    /**
     * Filtra la base de datos según la consulta
     * @param {string} query - La pregunta del usuario
     * @returns {Promise<Object>} Contexto filtrado
     */
    async search(query) {
        if (!query || !query.trim()) {
            return { context: "", metrics: null, filteredData: [] };
        }

        // Asegurar que los datos estén cargados
        if (!this.llmData) {
            await this.init();
        }

        const data = this.llmData;
        if (!data || !data.data || data.data.length === 0) {
            return { 
                context: "No hay datos disponibles en el sistema.", 
                metrics: null, 
                filteredData: [] 
            };
        }

        // Detectar tipo de consulta
        const queryType = this.detectQueryType(query);
        console.log("📊 Tipo de consulta detectado:", queryType);

        const queryLower = query.toLowerCase();
        
        // Detectar cliente
        const clientes = Object.keys(MASTER_CLIENTS_MAP);
        const clienteDetectado = clientes.find(c => queryLower.includes(c.toLowerCase()));
        
        // Detectar estado
        const buscaEntregadas = queryLower.includes("entregada") || 
                                queryLower.includes("entregado") || 
                                queryLower.includes("completada");
        const buscaPendientes = queryLower.includes("pendiente") || 
                               queryLower.includes("sin entregar") || 
                               queryLower.includes("no entregado");

        // Detectar métricas específicas
        const buscaTotales = queryLower.includes("total") || 
                            queryLower.includes("suma") || 
                            queryLower.includes("cuántas") ||
                            queryLower.includes("cuánto");
        
        const buscaValor = queryLower.includes("valor") || 
                          queryLower.includes("plata") || 
                          queryLower.includes("dinero") ||
                          queryLower.includes("pesos");
        
        const buscaUnidades = queryLower.includes("unidade") || 
                             queryLower.includes("cantidad") ||
                             queryLower.includes("productos");

        // Filtrar datos según el tipo de consulta
        let filteredData = [...data.data];
        
        // APLICAR FILTROS DE FECHA SEGÚN TIPO DE CONSULTA
        if (queryType.fechaEspecifica) {
            // Fecha específica (ej: "2026-02-23")
            if (queryType.tipo === 'entrega') {
                filteredData = filteredData.filter(f => 
                    f.fecha_entrega === queryType.fechaEspecifica
                );
            } else {
                filteredData = filteredData.filter(f => 
                    f.fecha_factura === queryType.fechaEspecifica
                );
            }
        } 
        else if (queryType.periodo === 'año' && queryType.año) {
            // Año específico
            if (queryType.tipo === 'entrega') {
                filteredData = filteredData.filter(f => f.anio_entrega === queryType.año);
            } else {
                filteredData = filteredData.filter(f => f.anio_factura === queryType.año);
            }
        }
        else if (queryType.periodo === 'mes' && queryType.mes) {
            // Mes específico
            if (queryType.tipo === 'entrega') {
                filteredData = filteredData.filter(f => f.mes_entrega === queryType.mes);
            } else {
                filteredData = filteredData.filter(f => f.mes_factura === queryType.mes);
            }
        }
        
        // Filtro por cliente
        if (clienteDetectado) {
            filteredData = filteredData.filter(f => f.cliente === clienteDetectado);
        }
        
        // Filtro por estado
        if (buscaEntregadas) {
            filteredData = filteredData.filter(f => f.estado_entrega === "ENTREGADO");
        } else if (buscaPendientes) {
            filteredData = filteredData.filter(f => f.estado_entrega !== "ENTREGADO");
        }

        // GENERAR CONTEXTO SEGÚN TIPO DE CONSULTA
        let context = "";
        const tipoDisplay = queryType.tipo === 'entrega' ? 'ENTREGAS' : 'FACTURACIÓN';
        
        if (filteredData.length === 0) {
            if (queryType.fechaEspecifica) {
                context = `No se encontraron ${tipoDisplay} para la fecha ${queryType.fechaEspecifica}.`;
            } else {
                context = `No se encontraron ${tipoDisplay} que coincidan con los criterios de búsqueda.`;
            }
        } else if (buscaTotales) {
            // Calcular totales
            const totalFacturas = filteredData.length;
            const totalEntregadas = filteredData.filter(f => f.estado_entrega === "ENTREGADO").length;
            const totalValor = filteredData.reduce((sum, f) => sum + (f.valor_bruto || 0), 0);
            const totalUnidades = filteredData.reduce((sum, f) => sum + (f.cantidad || 0), 0);
            
            // Calcular días promedio si es consulta de entregas
            let diasPromedio = 0;
            if (queryType.tipo === 'entrega') {
                const entregasConFecha = filteredData.filter(f => 
                    f.estado_entrega === "ENTREGADO" && f.fecha_factura && f.fecha_entrega
                );
                
                if (entregasConFecha.length > 0) {
                    const sumaDias = entregasConFecha.reduce((sum, f) => {
                        const factura = new Date(f.fecha_factura);
                        const entrega = new Date(f.fecha_entrega);
                        const diff = Math.round((entrega - factura) / (1000 * 60 * 60 * 24));
                        return sum + diff;
                    }, 0);
                    diasPromedio = Math.round(sumaDias / entregasConFecha.length);
                }
            }
            
            context = `📊 **RESUMEN DE ${tipoDisplay}**\n\n`;
            context += `• Total registros: ${totalFacturas.toLocaleString('es-CO')}\n`;
            context += `• Entregados: ${totalEntregadas.toLocaleString('es-CO')}\n`;
            context += `• Pendientes: ${(totalFacturas - totalEntregadas).toLocaleString('es-CO')}\n`;
            context += `• Valor total: $${totalValor.toLocaleString('es-CO')}\n`;
            context += `• Unidades totales: ${totalUnidades.toLocaleString('es-CO')}\n`;
            
            if (queryType.tipo === 'entrega' && diasPromedio > 0) {
                context += `• Días promedio factura→entrega: ${diasPromedio} días\n`;
            }
            
            // Mostrar distribución por cliente
            const porCliente = {};
            filteredData.forEach(f => {
                if (!porCliente[f.cliente]) {
                    porCliente[f.cliente] = { 
                        facturas: 0, 
                        valor: 0, 
                        unidades: 0,
                        entregadas: 0 
                    };
                }
                porCliente[f.cliente].facturas++;
                porCliente[f.cliente].valor += f.valor_bruto || 0;
                porCliente[f.cliente].unidades += f.cantidad || 0;
                if (f.estado_entrega === "ENTREGADO") {
                    porCliente[f.cliente].entregadas++;
                }
            });
            
            context += `\n📋 **DISTRIBUCIÓN POR CLIENTE**\n`;
            Object.entries(porCliente).forEach(([cliente, stats]) => {
                context += `\n**${cliente}**\n`;
                context += `  • Facturas: ${stats.facturas}\n`;
                context += `  • Entregadas: ${stats.entregadas}\n`;
                context += `  • Valor: $${stats.valor.toLocaleString('es-CO')}\n`;
                context += `  • Unidades: ${stats.unidades.toLocaleString('es-CO')}\n`;
            });
            
        } else {
            // Contexto detallado
            context = `📋 **DETALLE DE ${tipoDisplay}**\n\n`;
            context += `Se encontraron **${filteredData.length}** registros.\n\n`;
            
            // Agrupar por fecha
            const porFecha = {};
            filteredData.forEach(f => {
                const fecha = queryType.tipo === 'entrega' ? 
                    (f.fecha_entrega || 'Sin fecha') : 
                    (f.fecha_factura || 'Sin fecha');
                
                if (!porFecha[fecha]) {
                    porFecha[fecha] = { count: 0, valor: 0, unidades: 0 };
                }
                porFecha[fecha].count++;
                porFecha[fecha].valor += f.valor_bruto || 0;
                porFecha[fecha].unidades += f.cantidad || 0;
            });
            
            context += `**Resumen por fecha:**\n`;
            Object.entries(porFecha)
                .sort((a, b) => b[0].localeCompare(a[0]))
                .slice(0, 10)
                .forEach(([fecha, stats]) => {
                    context += `• ${fecha}: ${stats.count} facturas, $${stats.valor.toLocaleString('es-CO')}, ${stats.unidades} unidades\n`;
                });
            
            // Mostrar primeros 20 registros
            context += `\n**Primeros registros:**\n\n`;
            filteredData.slice(0, 20).forEach((f, i) => {
                const fecha = queryType.tipo === 'entrega' ? 
                    (f.fecha_entrega || 'N/A') : 
                    (f.fecha_factura || 'N/A');
                
                context += `${i+1}. Factura **${f.factura}**\n`;
                context += `   • Cliente: ${f.cliente}\n`;
                context += `   • Fecha: ${fecha}\n`;
                context += `   • Estado: ${f.estado_entrega}\n`;
                context += `   • Valor: $${f.valor_bruto?.toLocaleString('es-CO')}\n`;
                context += `   • Unidades: ${f.cantidad}\n`;
                context += `   • Lote: ${f.lote}\n\n`;
            });
            
            if (filteredData.length > 20) {
                context += `... y ${filteredData.length - 20} más.\n`;
            }
        }

        return {
            context,
            metrics: data.metricas,
            filteredData: filteredData.slice(0, 50),
            metadata: data.metadata,
            queryType: queryType
        };
    },

    /**
     * Obtener KPI de tiempo de entrega para un período específico
     */
    async getDeliveryTimeKPI(cliente = null, fechaInicio = null, fechaFin = null) {
        if (!this.llmData) await this.init();
        
        let datos = this.llmData.data;
        
        // Aplicar filtros
        if (cliente) {
            datos = datos.filter(f => f.cliente === cliente);
        }
        
        if (fechaInicio) {
            datos = datos.filter(f => f.fecha_entrega >= fechaInicio);
        }
        
        if (fechaFin) {
            datos = datos.filter(f => f.fecha_entrega <= fechaFin);
        }
        
        // Solo facturas entregadas con ambas fechas
        const entregasCompletas = datos.filter(f => 
            f.estado_entrega === "ENTREGADO" && 
            f.fecha_factura && 
            f.fecha_entrega
        );
        
        if (entregasCompletas.length === 0) {
            return "No hay suficientes datos para calcular KPI de tiempo de entrega.";
        }
        
        // Calcular métricas de tiempo
        const tiempos = entregasCompletas.map(f => {
            const factura = new Date(f.fecha_factura);
            const entrega = new Date(f.fecha_entrega);
            const diffMs = entrega - factura;
            const diffDias = Math.round(diffMs / (1000 * 60 * 60 * 24));
            const diffHoras = Math.round(diffMs / (1000 * 60 * 60));
            const diffMinutos = Math.round(diffMs / (1000 * 60));
            
            return {
                factura: f.factura,
                cliente: f.cliente,
                dias: diffDias,
                horas: diffHoras,
                minutos: diffMinutos,
                fechaFactura: f.fecha_factura,
                fechaEntrega: f.fecha_entrega
            };
        });
        
        const sumaDias = tiempos.reduce((sum, t) => sum + t.dias, 0);
        const promedioDias = sumaDias / tiempos.length;
        
        const masRapido = tiempos.reduce((min, t) => t.dias < min.dias ? t : min, tiempos[0]);
        const masLento = tiempos.reduce((max, t) => t.dias > max.dias ? t : max, tiempos[0]);
        
        let resultado = `📊 **KPI - TIEMPO DE ENTREGA**\n\n`;
        resultado += `Basado en ${tiempos.length} entregas:\n`;
        resultado += `• Promedio: ${promedioDias.toFixed(1)} días\n`;
        resultado += `• Entrega más rápida: ${masRapido.dias} días (Factura ${masRapido.factura})\n`;
        resultado += `• Entrega más lenta: ${masLento.dias} días (Factura ${masLento.factura})\n\n`;
        
        resultado += `**Distribución:**\n`;
        const rangos = {
            '0-1 días': tiempos.filter(t => t.dias <= 1).length,
            '2-3 días': tiempos.filter(t => t.dias >= 2 && t.dias <= 3).length,
            '4-7 días': tiempos.filter(t => t.dias >= 4 && t.dias <= 7).length,
            '8-15 días': tiempos.filter(t => t.dias >= 8 && t.dias <= 15).length,
            '+15 días': tiempos.filter(t => t.dias > 15).length
        };
        
        Object.entries(rangos).forEach(([rango, cantidad]) => {
            const porcentaje = ((cantidad / tiempos.length) * 100).toFixed(1);
            resultado += `• ${rango}: ${cantidad} (${porcentaje}%)\n`;
        });
        
        return resultado;
    },

    /**
     * Obtener resumen ejecutivo del sistema
     */
    getExecutiveSummary() {
        if (!this.llmData) return "Datos no disponibles";
        return this.llmData.resumen;
    },

    /**
     * Resetear cache y recargar datos
     */
    async refresh() {
        this.llmData = null;
        return await this.init();
    }
};

// Inicializar automáticamente al cargar
if (typeof window !== 'undefined') {
    setTimeout(() => {
        DataFilterEngine.init().catch(console.error);
    }, 500);
}