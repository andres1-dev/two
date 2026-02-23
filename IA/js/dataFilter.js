/**
 * dataFilter.js - DeepScope Internal Search & Filter Engine
 * Se encarga de procesar la base de datos local para extraer solo
 * los fragmentos relevantes para la consulta del usuario, ahorrando tokens.
 */

window.DataFilterEngine = {
    /**
     * Filtra la base de datos basándose en una consulta de texto natural.
     * @param {Array} database - La base de datos maestra (formato comprimido).
     * @param {string} targetDate - La fecha objetivo en formato YYYY-MM-DD.
     * @returns {Array} - Los registros más relevantes.
     */
    search(database, query = "") {
        if (!database || !Array.isArray(database)) return [];
        if (!query.trim()) return [];

        const now = new Date();
        const todayStr = now.toISOString().split('T')[0];
        const yesterday = new Date(now);
        yesterday.setDate(now.getDate() - 1);
        const yesterdayStr = yesterday.toISOString().split('T')[0];

        let targetDate = "";

        // Detección directa de fechas o palabras clave temporales
        const dateMatch = query.match(/(\d{4}-\d{2}-\d{2})/);
        if (dateMatch) {
            targetDate = dateMatch[1];
        } else if (query.toLowerCase().includes("hoy")) {
            targetDate = todayStr;
        } else if (query.toLowerCase().includes("ayer")) {
            targetDate = yesterdayStr;
        }

        // Si se detectó una fecha, filtrar por ella
        if (targetDate) {
            const results = database.filter(item => {
                const itemDate = new Date(item.timestamp).toISOString().split('T')[0];
                return itemDate === targetDate;
            });
            return results.slice(0, 100);
        }

        // Si no hay fecha clara, podemos hacer una búsqueda por palabras clave básica como respaldo
        // o simplemente devolver vacío para obligar a la precisión cronológica
        return [];
    },

    /**
     * Prepara el resultado final conservando los nombres originales.
     */
    prepareForAI(filteredResults) {
        return filteredResults.map(item => ({
            rec: item.rec,
            lote: item.lote,
            referencia: item.referencia,
            facturas: item.facturas
        }));
    }
};
