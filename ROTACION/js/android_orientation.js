// js/android_orientation.js - Solución específica para Android

(function() {
    'use strict';
    
    // Detectar Android
    const isAndroid = /Android/i.test(navigator.userAgent);
    
    if (!isAndroid) return;
    
    console.log('📱 Android Orientation Lock activado');
    
    // Variables de control
    let lastOrientation = window.innerWidth > window.innerHeight ? 'landscape' : 'portrait';
    let orientationLocked = true;
    
    // Función para corregir la orientación
    function correctOrientation() {
        if (!orientationLocked) return;
        
        const isLandscape = window.innerWidth > window.innerHeight;
        
        if (isLandscape) {
            // Forzar scroll al inicio
            window.scrollTo(0, 0);
            
            // Prevenir scroll horizontal
            document.body.style.overflowX = 'hidden';
            document.body.style.position = 'relative';
            
            // Mostrar mensaje de advertencia
            let warning = document.querySelector('.orientation-warning');
            if (!warning) {
                warning = document.createElement('div');
                warning.className = 'orientation-warning';
                warning.innerHTML = '<i class="fas fa-rotate-left"></i> Por favor, gira el dispositivo a vertical';
                document.body.prepend(warning);
            }
            warning.style.display = 'block';
            
            // Forzar el tamaño correcto
            document.documentElement.style.setProperty('--vh', window.innerHeight * 0.01 + 'px');
            
        } else {
            // Ocultar advertencia
            const warning = document.querySelector('.orientation-warning');
            if (warning) warning.style.display = 'none';
            
            // Restaurar normalidad
            document.body.style.overflowX = '';
            document.body.style.position = '';
        }
    }
    
    // Observar cambios de tamaño (más confiable que orientationchange en Android)
    let resizeTimer;
    window.addEventListener('resize', function() {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(function() {
            const currentOrientation = window.innerWidth > window.innerHeight ? 'landscape' : 'portrait';
            
            if (currentOrientation !== lastOrientation) {
                lastOrientation = currentOrientation;
                correctOrientation();
                
                // Forzar redibujado
                document.body.style.display = 'none';
                document.body.offsetHeight;
                document.body.style.display = '';
            }
        }, 100);
    }, { passive: true });
    
    // Corregir al cargar
    window.addEventListener('load', correctOrientation);
    document.addEventListener('DOMContentLoaded', correctOrientation);
    
    // Corregir después de un pequeño retraso
    setTimeout(correctOrientation, 300);
    setTimeout(correctOrientation, 1000);
    
    // Prevenir eventos de orientación que puedan causar problemas
    window.addEventListener('orientationchange', function(e) {
        e.preventDefault();
        setTimeout(correctOrientation, 50);
        return false;
    });
    
    // Variables CSS personalizadas para altura del viewport
    function setVH() {
        let vh = window.innerHeight * 0.01;
        document.documentElement.style.setProperty('--vh', vh + 'px');
    }
    
    setVH();
    window.addEventListener('resize', setVH);
    window.addEventListener('orientationchange', setVH);
})();