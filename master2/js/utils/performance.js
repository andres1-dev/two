// ============================================
// OPTIMIZACIONES DE PERFORMANCE
// ============================================

/**
 * Debounce function para optimizar eventos frecuentes
 * @param {Function} func - Función a ejecutar
 * @param {number} wait - Tiempo de espera en ms
 * @returns {Function} Función debounced
 */
function debounce(func, wait = 100) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

/**
 * Throttle function para limitar ejecuciones
 * @param {Function} func - Función a ejecutar
 * @param {number} limit - Límite de tiempo en ms
 * @returns {Function} Función throttled
 */
function throttle(func, limit = 100) {
    let inThrottle;
    return function(...args) {
        if (!inThrottle) {
            func.apply(this, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}

/**
 * Memoization para funciones costosas
 * @param {Function} fn - Función a memoizar
 * @returns {Function} Función memoizada
 */
function memoize(fn) {
    const cache = new Map();
    return function(...args) {
        const key = JSON.stringify(args);
        if (cache.has(key)) {
            return cache.get(key);
        }
        const result = fn.apply(this, args);
        cache.set(key, result);
        return result;
    };
}

/**
 * Batch processor para operaciones en lote
 * @param {Array} items - Array de items a procesar
 * @param {Function} processor - Función procesadora
 * @param {number} batchSize - Tamaño del lote
 * @returns {Promise<Array>} Resultados procesados
 */
async function processInBatches(items, processor, batchSize = 100) {
    const results = [];
    for (let i = 0; i < items.length; i += batchSize) {
        const batch = items.slice(i, i + batchSize);
        const batchResults = await Promise.all(
            batch.map(item => processor(item))
        );
        results.push(...batchResults);
        
        // Yield para no bloquear el event loop
        if (i % (batchSize * 10) === 0) {
            await new Promise(resolve => setTimeout(resolve, 0));
        }
    }
    return results;
}

/**
 * Lazy loader para carga diferida de recursos
 * @param {string} selector - Selector CSS
 * @param {Function} callback - Callback cuando el elemento es visible
 * @param {Object} options - Opciones de IntersectionObserver
 */
function lazyLoad(selector, callback, options = {}) {
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                callback(entry.target);
                observer.unobserve(entry.target);
            }
        });
    }, {
        rootMargin: '50px',
        threshold: 0.1,
        ...options
    });
    
    document.querySelectorAll(selector).forEach(el => observer.observe(el));
}

/**
 * Optimized event delegation
 * @param {string} parentSelector - Selector del padre
 * @param {string} childSelector - Selector del hijo
 * @param {string} event - Tipo de evento
 * @param {Function} handler - Manejador del evento
 */
function delegateEvent(parentSelector, childSelector, event, handler) {
    document.addEventListener(event, function(e) {
        let target = e.target;
        const parent = document.querySelector(parentSelector);
        
        // Verificar si el target está dentro del padre
        while (target && target !== parent) {
            if (target.matches(childSelector)) {
                handler.call(target, e);
                break;
            }
            target = target.parentNode;
        }
    });
}

/**
 * Memory management: limpiar objetos grandes
 * @param {Object} obj - Objeto a limpiar
 * @param {Array} keepKeys - Keys a mantener (opcional)
 */
function cleanupLargeObject(obj, keepKeys = null) {
    if (keepKeys) {
        const newObj = {};
        keepKeys.forEach(key => {
            if (obj.hasOwnProperty(key)) {
                newObj[key] = obj[key];
            }
        });
        return newObj;
    }
    
    // Limpiar propiedades que no se usan frecuentemente
    for (const key in obj) {
        if (typeof obj[key] === 'object' && obj[key] !== null) {
            obj[key] = cleanupLargeObject(obj[key]);
        }
    }
    return obj;
}

/**
 * Performance timer para debugging
 * @param {string} label - Etiqueta para el timer
 * @returns {Function} Función para detener el timer
 */
function startTimer(label) {
    const start = performance.now();
    console.log(`⏱️  ${label} iniciado...`);
    
    return function() {
        const end = performance.now();
        const duration = end - start;
        console.log(`⏱️  ${label} completado en ${duration.toFixed(2)}ms`);
        return duration;
    };
}

/**
 * Batch DOM updates para reducir reflows
 * @param {Function} updateFn - Función que actualiza el DOM
 */
function batchDOMUpdates(updateFn) {
    // Usar requestAnimationFrame para batch updates
    requestAnimationFrame(() => {
        // Forzar layout antes de los cambios
        document.body.offsetHeight;
        
        // Ejecutar actualizaciones
        updateFn();
        
        // Otro requestAnimationFrame para cambios posteriores
        requestAnimationFrame(() => {
            // Cualquier limpieza o actualización adicional
        });
    });
}

/**
 * Optimized string concatenation para grandes cantidades
 * @param {Array} strings - Array de strings
 * @returns {string} String concatenado
 */
function concatStrings(strings) {
    // Usar join para mejor performance que +=
    return strings.join('');
}

/**
 * Cache con expiración para cualquier tipo de dato
 * @param {string} key - Clave del cache
 * @param {Function} fetchFn - Función para obtener datos si no hay cache
 * @param {number} ttl - Tiempo de vida en ms
 * @returns {Promise<any>} Datos cacheados o frescos
 */
async function getWithCache(key, fetchFn, ttl = 300000) {
    const cacheKey = `cache_${key}`;
    const cached = localStorage.getItem(cacheKey);
    
    if (cached) {
        const { data, timestamp } = JSON.parse(cached);
        if (Date.now() - timestamp < ttl) {
            return data;
        }
    }
    
    const freshData = await fetchFn();
    localStorage.setItem(cacheKey, JSON.stringify({
        data: freshData,
        timestamp: Date.now()
    }));
    
    return freshData;
}

// Exportar funciones para uso global
window.performanceUtils = {
    debounce,
    throttle,
    memoize,
    processInBatches,
    lazyLoad,
    delegateEvent,
    cleanupLargeObject,
    startTimer,
    batchDOMUpdates,
    concatStrings,
    getWithCache
};

console.log('✅ Performance utilities cargadas');