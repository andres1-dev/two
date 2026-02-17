// Módulo wrapper para conectar con los scripts legacy de impresión
// Estos scripts (printing-main.js, printing-search.js) cargan sus funciones en el objeto window global

function print_cargarDatos() {
    if (typeof window.print_cargarDatos === 'function') {
        return window.print_cargarDatos();
    }
    console.warn('Función global print_cargarDatos no encontrada');
    return Promise.resolve();
}

function print_buscarPorREC() {
    if (typeof window.print_buscarPorREC === 'function') {
        return window.print_buscarPorREC();
    }
    console.warn('Función global print_buscarPorREC no encontrada');
}

function print_buscarMultiplesRECs() {
    if (typeof window.print_buscarMultiplesRECs === 'function') {
        return window.print_buscarMultiplesRECs();
    }
    console.warn('Función global print_buscarMultiplesRECs no encontrada');
}

function print_imprimirSoloClientes() {
    if (typeof window.print_imprimirSoloClientes === 'function') {
        return window.print_imprimirSoloClientes();
    }
    console.warn('Función global print_imprimirSoloClientes no encontrada');
}

function print_mostrarOpcionesImpresion() {
    if (typeof window.print_mostrarOpcionesImpresion === 'function') {
        return window.print_mostrarOpcionesImpresion();
    }
    console.warn('Función global print_mostrarOpcionesImpresion no encontrada');
}