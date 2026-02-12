// js/desktop_views.js - SOLO SE CARGA EN ESCRITORIO
window.switchDesktopView = function(viewName) {
    if (!window.IS_DESKTOP) return;
    
    // Lógica de cambio de vista en escritorio
    console.log('Cambiando a vista:', viewName);
    
    // Ocultar todas las vistas
    const views = ['scanner', 'historyView', 'uploadSiesaView'];
    views.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.style.display = 'none';
    });
    
    // Mostrar vista seleccionada
    if (viewName === 'scanner') {
        const scanner = document.getElementById('scanner');
        if (scanner) scanner.style.display = 'flex';
    } else if (viewName === 'history') {
        const history = document.getElementById('historyView');
        if (history) {
            history.style.display = 'block';
            if (typeof loadHistoryData === 'function') loadHistoryData();
        }
    } else if (viewName === 'upload') {
        const upload = document.getElementById('uploadSiesaView');
        if (upload) {
            upload.style.display = 'block';
            if (typeof initUploadSiesa === 'function') initUploadSiesa();
        }
    }
};