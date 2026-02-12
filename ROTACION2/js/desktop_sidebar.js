// js/desktop_sidebar.js - SOLO SE CARGA EN ESCRITORIO
(function() {
    'use strict';
    
    if (!window.IS_DESKTOP) return;
    
    document.addEventListener('DOMContentLoaded', function() {
        const sidebar = document.getElementById('desktopSidebar');
        if (sidebar) sidebar.style.display = 'flex';
    });
})();