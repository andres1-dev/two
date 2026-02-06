// Configuración y constantes
const CONFIG = {
  VERSION: "4.0.0",
  CACHE_TTL: 24 * 60 * 60 * 1000, // 24 horas en milisegundos
  MAX_IMAGE_SIZE: 800, // Tamaño máximo para redimensionar imágenes
  MAX_CHUNK_SIZE: 50000, // ~50KB por solicitud
};

// API_URL
const API_URL_POST = "https://script.google.com/macros/s/AKfycbwgnkjVCMWlWuXnVaxSBD18CGN3rXGZtQZIvX9QlBXSgbQndWC4uqQ2sc00DuNH6yrb/exec";

// Variables globales
let database = [];
let cameraStream = null;
let currentDocumentData = null;
let photoBlob = null;
let preventKeyboardTimer = null;
let currentQRParts = null;
let dataLoaded = false;

// Constantes para la cola de carga
const UPLOAD_QUEUE_KEY = 'pdaUploadQueue';
const MAX_RETRIES = 3;

// Elementos del DOM
const loadingScreen = document.getElementById('loadingScreen');
const scanner = document.getElementById('scanner');
const barcodeInput = document.getElementById('barcode');
const statusDiv = document.getElementById('status');
const resultsDiv = document.getElementById('results');
const dataStats = document.getElementById('data-stats');
const offlineBanner = document.getElementById('offline-banner');
const installBtn = document.getElementById('installBtn');

// Inicializar la cola de carga
const uploadQueue = new UploadQueue();

// Función para convertir Blob a Base64
function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result.split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

// Función para extraer datos de la UI
// Función para extraer datos de la UI - ADAPTADA A NUEVO DISEÑO
function extractDataFromUI(factura) {
  let lote = '', referencia = '', cantidad = 0;

  // Buscar contenedor de la factura
  const facturaContainer = document.querySelector(`.siesa-item button[data-factura="${factura}"]`)?.closest('.siesa-item');

  if (facturaContainer) {
    // Buscar en los detalles miniatura
    const details = facturaContainer.querySelectorAll('.mini-detail');

    details.forEach(detail => {
      const label = detail.querySelector('.mini-label')?.textContent.trim();
      const value = detail.querySelector('.mini-value')?.textContent.trim();

      if (!label || !value) return;

      if (label.includes('LOTE')) lote = value;
      else if (label.includes('REFERENCIA')) referencia = value; // Siesa item referencia
    });

    // Cantidad esta en el header secundario ahora? 
    // En el nuevo diseño la cantidad está en el detalle grid tambien o en el header?
    // Vamos a mirar displayItemData abajo.
    // En el codigo viejo estaba en header secundario.
    // Revisemos el DOM generado nuevo...
    // La cantidad suele estar en .mini-detail con label CANTIDAD o similar.

    // Fallback: buscar en todo el texto del contenedor si no se encuentra
    if (!cantidad) {
      // Buscar especificamente el campo cantidad
      details.forEach(detail => {
        const label = detail.querySelector('.mini-label')?.textContent.trim();
        if (label && label.includes('CANTIDAD')) {
          cantidad = parseFloat(detail.querySelector('.mini-value')?.textContent.trim()) || 0;
        }
      });
    }
  }

  return { lote, referencia, cantidad };
}

// Funciones para sonidos de feedback
function playSuccessSound() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = 800;
    gainNode.gain.value = 1;
    osc.connect(gainNode);
    gainNode.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.25);
  } catch (e) {
    console.log("Error al reproducir sonido de éxito:", e);
  }
}

function playErrorSound() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(300, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(80, ctx.currentTime + 0.5);
    gainNode.gain.value = 0.8;
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
    osc.connect(gainNode);
    gainNode.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.5);
  } catch (e) {
    console.log("Error al reproducir sonido de error:", e);
  }
}

// Inicialización al cargar el documento
document.addEventListener('DOMContentLoaded', () => {
  // Cargar datos desde el servidor
  loadDataFromServer();

  setupEventListeners();

  // Agregar eventos para prevenir el teclado virtual en la cámara
  document.addEventListener('focusin', function (e) {
    if (document.getElementById('cameraModal').style.display === 'flex' &&
      e.target.id !== 'dummyInput') {
      e.preventDefault();
      e.target.blur();
    }
  });

  // Inicializar botón flotante de QR
  const qrFloatingBtn = document.getElementById('qrScannerFloatingBtn');
  if (qrFloatingBtn) {
    qrFloatingBtn.addEventListener('click', function(e) {
      e.preventDefault();
      e.stopPropagation();
      
      // Verificar si hay escáner QR disponible
      if (typeof Html5Qrcode !== 'undefined' && window.qrScanner) {
        window.qrScanner.scanQRCode();
      } else if (typeof openQRScanner === 'function') {
        openQRScanner();
      } else {
        // Alternativa: abrir cámara para foto y usar OCR (si implementado)
        alert('Escáner QR no disponible. Usa el campo de texto para ingresar manualmente.');
      }
    });
  }

  // Detectar si estamos en modo PWA
function isRunningAsPWA() {
  return window.matchMedia('(display-mode: standalone)').matches || 
         window.navigator.standalone === true ||
         document.referrer.includes('android-app://');
}

// Función para ajustar el botón en PWA
function adjustUIForPWA() {
  if (isRunningAsPWA()) {
    console.log('App running in PWA mode');
    document.body.classList.add('standalone');
    
    // Ajustes adicionales para PWA
    const qrBtn = document.getElementById('qrScannerFloatingBtn');
    if (qrBtn) {
      // Forzar visibilidad
      qrBtn.style.display = 'flex';
      qrBtn.style.visibility = 'visible';
      qrBtn.style.opacity = '1';
    }
    
    // Prevenir comportamiento por defecto del navegador en PWA
    document.addEventListener('touchmove', function(e) {
      if (e.target.id === 'qrScannerFloatingBtn') {
        e.preventDefault();
      }
    }, { passive: false });
  }
}

// Llamar después de cargar
document.addEventListener('DOMContentLoaded', () => {
  adjustUIForPWA();
  
  // También detectar cambios
  window.addEventListener('resize', adjustUIForPWA);
  
  // Verificar periódicamente (por si la app cambia de modo)
  setTimeout(adjustUIForPWA, 1000);
  setTimeout(adjustUIForPWA, 3000);
});

  // Manejar el cambio de orientación en dispositivos móviles
  window.addEventListener('orientationchange', function () {
    if (document.getElementById('cameraModal').style.display === 'flex') {
      setTimeout(() => {
        document.activeElement.blur();
      }, 300);
    }
  });

  // Verificar si estamos en modo offline
  window.addEventListener('online', function () {
    offlineBanner.style.display = 'none';
    statusDiv.className = 'reconnected';
    statusDiv.innerHTML = '<i class="fas fa-wifi"></i> CONEXIÓN RESTABLECIDA';
    // Si los datos aún no se han cargado, intentar cargarlos de nuevo
    if (!dataLoaded) {
      setTimeout(() => loadDataFromServer(), 1000);
    }
  });

  window.addEventListener('offline', function () {
    offlineBanner.style.display = 'block';
    statusDiv.className = 'offline';
    statusDiv.innerHTML = `
      <div style="display: flex; align-items: center; justify-content: center; gap: 10px; text-align: center;">
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" class="bi bi-wifi-off" viewBox="0 0 16 16">
          <path d="M10.706 3.294A12.6 12.6 0 0 0 8 3C5.259 3 2.723 3.882.663 5.379a.485.485 0 0 0-.048.736.52.52 0 0 0 .668.05A11.45 11.45 0 0 1 8 4q.946 0 1.852.148zM8 6c-1.905 0-3.68.56-5.166 1.526a.48.48 0 0 0-.063.745.525.525 0 0 0 .652.065 8.45 8.45 0 0 1 3.51-1.27zm2.596 1.404.785-.785q.947.362 1.785.907a.482.482 0 0 1 .063.745.525.525 0 0 1-.652.065 8.5 8.5 0 0 0-1.98-.932zM8 10l.933-.933a6.5 6.5 0 0 1 2.013.637c.285.145.326.524.1.75l-.015.015a.53.53 0 0 1-.611.09A5.5 5.5 0 0 0 8 10m4.905-4.905.747-.747q.886.451 1.685 1.03a.485.485 0 0 1 .047.737.52.52 0 0 1-.668.05 11.5 11.5 0 0 0-1.811-1.07M9.02 11.78c.238.14.236.464.04.66l-.707.706a.5.5 0 0 1-.707 0l-.707-.707c-.195-.195-.197-.518.04-.66A2 2 0 0 1 8 11.5c.374 0 .723.102 1.021.28zm4.355-9.905a.53.53 0 0 1 .75.75l-10.75 10.75a.53.53 0 0 1-.75-.75z"/>
        </svg>
        <span>MODO OFFLINE ACTIVO</span>
      </div>
    `;
  });
});

function loadDataFromServer() {
  statusDiv.className = 'loading';
  statusDiv.innerHTML = '<i class="fas fa-sync fa-spin"></i> CARGANDO DATOS...';
  dataStats.innerHTML = '<i class="fas fa-server"></i> Procesando datos locales...';

  // Usamos la función de main.js en lugar del fetch
  if (typeof obtenerDatosFacturados === 'function') {
    obtenerDatosFacturados()
      .then(serverData => handleDataLoadSuccess(serverData))
      .catch(error => handleDataLoadError(error));
  } else {
    console.error("main.js no cargado correctamente");
    handleDataLoadError(new Error("Error de integración: main.js no disponible"));
  }
}

// REEMPLAZAR la función handleDataLoadSuccess (aproximadamente línea 132)
function handleDataLoadSuccess(serverData) {
  if (serverData && serverData.success && serverData.data) {
    database = serverData.data;
    dataLoaded = true;
    cacheData(database);

    // Actualizar UI de estado
    statusDiv.className = 'ready';
    statusDiv.innerHTML = `
      <i class="fas fa-check-circle"></i> SISTEMA LISTO
    `;
    dataStats.innerHTML = `
      <i class="fas fa-database"></i> ${database.length} registros | ${new Date().toLocaleTimeString()}
    `;

    // Mostrar contenido principal con nuevo diseño
    resultsDiv.innerHTML = `
      <div class="result-item" style="text-align: center; padding: 40px 20px;">
        <div style="margin-bottom: 30px;">
          <div style="width: 70px; height: 70px; background: linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%); border-radius: 18px; display: flex; align-items: center; justify-content: center; margin: 0 auto 20px; box-shadow: 0 8px 20px rgba(37, 99, 235, 0.2);">
            <i class="fas fa-qrcode" style="font-size: 2.25rem; color: white;"></i>
          </div>
          <h1 style="font-size: 2rem; font-weight: 800; margin: 0 0 8px; background: linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%); -webkit-background-clip: text; background-clip: text; color: transparent;">PandaDash</h1>
          <p style="color: var(--text-secondary); font-size: 13px; margin: 0;">Professional QR Delivery System</p>
        </div>
        
        <div style="background: var(--surface); border-radius: 16px; padding: 20px; margin: 25px 0; border: 1px solid var(--border);">
          <p style="font-size: 13px; color: var(--text-main); margin: 0 0 12px; font-weight: 600;"><i class="fas fa-info-circle" style="color: var(--primary); margin-right: 8px;"></i> Sistema listo para escanear</p>
          <p style="font-size: 12px; color: var(--text-secondary); margin: 0;">Escanea un código QR para comenzar</p>
        </div>
        
        <!-- Nuevo footer integrado -->
        <div style="margin-top: 40px; padding-top: 25px; border-top: 1px solid var(--border);">
          <p style="font-size: 12px; color: var(--text-secondary); margin-bottom: 15px; line-height: 1.4;">
            Developed by <strong style="color: var(--text-main); font-weight: 600;">Andrés Mendoza</strong><br>
            © 2025 · Supported by GrupoTDM
          </p>
          
          <div style="display: flex; justify-content: center; gap: 12px;">
            <a href="https://www.facebook.com/templodelamoda/" target="_blank" style="width: 36px; height: 36px; border-radius: 50%; background: var(--background); display: flex; align-items: center; justify-content: center; color: var(--text-secondary); text-decoration: none; transition: all 0.2s; border: 1px solid var(--border);">
              <i class="fab fa-facebook-f" style="font-size: 14px;"></i>
            </a>
            <a href="https://www.instagram.com/eltemplodelamoda/" target="_blank" style="width: 36px; height: 36px; border-radius: 50%; background: var(--background); display: flex; align-items: center; justify-content: center; color: var(--text-secondary); text-decoration: none; transition: all 0.2s; border: 1px solid var(--border);">
              <i class="fab fa-instagram" style="font-size: 14px;"></i>
            </a>
            <a href="https://wa.me/573168007979" target="_blank" style="width: 36px; height: 36px; border-radius: 50%; background: var(--background); display: flex; align-items: center; justify-content: center; color: var(--text-secondary); text-decoration: none; transition: all 0.2s; border: 1px solid var(--border);">
              <i class="fab fa-whatsapp" style="font-size: 14px;"></i>
            </a>
          </div>
        </div>
      </div>
    `;

    hideLoadingScreen();
    playSuccessSound();
  } else {
    handleDataLoadError(new Error('Formato de datos incorrecto'));
  }
}

function handleDataLoadError(error) {
  console.error("Error al cargar datos:", error);

  // Verificar si hay datos en caché
  const cachedData = getCachedData();
  if (cachedData) {
    database = cachedData.data;
    dataLoaded = true;

    statusDiv.innerHTML = '<i class="fas fa-database"></i> SISTEMA LISTO (DATOS CACHEADOS)';
    dataStats.innerHTML = `${database.length} registros | Última actualización: ${new Date(cachedData.timestamp).toLocaleString()}`;

    resultsDiv.innerHTML = `
      <div class="result-item" style="text-align: center; color: var(--gray);">
        <img 
          src="https://raw.githubusercontent.com/iLogisticsCoordinator/o/main/icons/logo.png" 
          alt="PandaDash Logo" 
          class="logo" 
          style="width: 4rem; height: 4rem; margin-bottom: 0.15rem;"
        >
        <h1 style="margin: 0;">PandaDash</h1>
        <div style="margin-top: 6px; font-size: 13px; line-height: 1.3;">
          <p style="margin: 2px 0;">Developed by Andrés Mendoza © 2025</p>
          <p style="margin: 2px 0;">
            Supported by 
            <a href="https://www.eltemplodelamoda.com/" target="_blank" style="color: var(--primary); text-decoration: none; font-weight: 500;">
              GrupoTDM
            </a>
          </p>
          <div style="display: flex; justify-content: center; gap: 8px; margin-top: 6px;">
            <a href="https://www.facebook.com/templodelamoda/" target="_blank" style="color: var(--primary);"><i class="fab fa-facebook"></i></a>
            <a href="https://www.instagram.com/eltemplodelamoda/" target="_blank" style="color: var(--primary);"><i class="fab fa-instagram"></i></a>
            <a href="https://wa.me/573168007979" target="_blank" style="color: var(--primary);"><i class="fab fa-whatsapp"></i></a>
          </div>
        </div>
      </div>
    `;

    offlineBanner.style.display = 'block';

    // Ocultar pantalla de carga ya que tenemos datos en caché
    hideLoadingScreen();
  } else {
    statusDiv.className = 'error';
    statusDiv.innerHTML = '<span style="color: var(--danger)">ERROR AL CARGAR DATOS</span>';
    dataStats.textContent = error.message || 'Error desconocido';
    resultsDiv.innerHTML = `<div class="error"><i class="fas fa-exclamation-circle"></i> No se pudo cargar la base de datos: ${error.message || 'Error desconocido'}</div>`;

    // Mostrar mensaje de error en la pantalla de carga pero no ocultarla
    const loadingName = document.querySelector('#loadingScreen .version-text');
    if (loadingName) {
      loadingName.innerHTML = 'Error al cargar datos<br>Comprueba tu conexión';
      loadingName.style.color = '#ef4444';
      loadingName.style.fontWeight = '600';
      
      // Añadir botón de reintento
      const retryButton = document.createElement('button');
      retryButton.innerHTML = '<i class="fas fa-redo"></i> Reintentar';
      retryButton.style.marginTop = '15px';
      retryButton.style.padding = '8px 16px';
      retryButton.style.background = 'var(--danger)';
      retryButton.style.color = 'white';
      retryButton.style.border = 'none';
      retryButton.style.borderRadius = '12px';
      retryButton.style.fontWeight = '600';
      retryButton.style.fontSize = '13px';
      retryButton.style.cursor = 'pointer';
      retryButton.addEventListener('click', () => {
        location.reload();
      });
      
      loadingName.parentNode.appendChild(retryButton);
    }

    playErrorSound();
  }
}

// Función para ocultar la pantalla de carga
function hideLoadingScreen() {
  // Mostrar el contenido principal
  scanner.style.display = 'flex';

  // Desvanecer la pantalla de carga
  loadingScreen.style.opacity = '0';

  // Eliminar la pantalla de carga después de la transición
  setTimeout(() => {
    loadingScreen.style.display = 'none';

    // Enfocar el campo de entrada
    if (barcodeInput) {
      barcodeInput.focus();
    }
  }, 500);
}

function getCachedData() {
  const cache = localStorage.getItem('pdaScannerCache');
  if (!cache) return null;

  try {
    const parsed = JSON.parse(cache);
    if (Date.now() - parsed.timestamp > CONFIG.CACHE_TTL) return null;
    return parsed;
  } catch (e) {
    console.error("Error al parsear cache:", e);
    return null;
  }
}

function cacheData(data) {
  const cache = {
    data: data,
    timestamp: Date.now(),
    version: CONFIG.VERSION
  };

  try {
    localStorage.setItem('pdaScannerCache', JSON.stringify(cache));
  } catch (e) {
    console.error("Error al guardar en cache:", e);
    if (e.name === 'QuotaExceededError') {
      clearOldCache();
      cacheData(data);
    }
  }
}

function clearOldCache() {
  const keys = Object.keys(localStorage);
  for (const key of keys) {
    if (key.startsWith('pdaScannerCache')) {
      localStorage.removeItem(key);
    }
  }
}

function setupEventListeners() {
  // Foco persistente excepto cuando la cámara está abierta
  function enforceFocus() {
    // Solo aplicar foco si la cámara no está abierta
    if (document.activeElement !== barcodeInput &&
      document.getElementById('cameraModal').style.display !== 'flex') {
      barcodeInput.focus();
    }
    setTimeout(enforceFocus, 100);
  }
  enforceFocus();

  // Detector para deshabilitar el teclado virtual en dispositivos móviles
  document.addEventListener('touchstart', function (e) {
    if (document.getElementById('cameraModal').style.display === 'flex' &&
      e.target.tagName !== 'BUTTON') {
      e.preventDefault();
      if (document.activeElement) {
        document.activeElement.blur();
      }
    }
  }, { passive: false });

  // Detectar escaneo
  barcodeInput.addEventListener('input', function () {
    const code = this.value.trim();
    if (code.length < 5) return; // Un código válido debe tener al menos 5 caracteres

    // Analizar el formato del código: DOCUMENTO-NIT
    const parts = parseQRCode(code);

    if (parts) {
      currentQRParts = parts; // Guardar las partes para uso posterior
      const startTime = Date.now();
      processQRCodeParts(parts);
      const searchTime = Date.now() - startTime;

      statusDiv.className = 'processed';
      statusDiv.textContent = `REGISTRO PROCESADO (${searchTime}ms)`;
    } else {
      showError(code, "Formato de código QR no válido. Use formato: DOCUMENTO-NIT");
      playErrorSound();
      statusDiv.textContent = `FORMATO INVÁLIDO`;
    }

    setTimeout(() => {
      this.value = '';
      this.focus();
    }, 50);
  });
}

// Función para analizar el código QR
function parseQRCode(code) {
  // Buscamos un formato como "REC58101-805027653"
  const regex = /^([A-Za-z0-9-]+)-([0-9]+)$/;
  const match = code.match(regex);

  if (match) {
    return {
      documento: match[1],
      nit: match[2]
    };
  }

  return null;
}

// Procesa las partes del código QR y muestra los resultados
function processQRCodeParts(parts) {
  const { documento, nit } = parts;

  // Buscar un registro que coincida con el documento
  const result = database.find(item =>
    item.documento && item.documento.toString() === documento
  );

  if (result) {
    // Filtramos los datosSiesa para mostrar solo los que coinciden con el NIT
    const filteredItem = JSON.parse(JSON.stringify(result));

    if (filteredItem.datosSiesa && Array.isArray(filteredItem.datosSiesa)) {
      // Filtramos por NIT en lugar de por cliente
      filteredItem.datosSiesa = filteredItem.datosSiesa.filter(siesa => {
        // Extraemos solo dígitos del NIT para comparar (por si acaso viene con formato)
        const siesaNitDigits = siesa.nit ? siesa.nit.toString().replace(/\D/g, '') : '';
        const scanNitDigits = nit.replace(/\D/g, '');

        return siesaNitDigits.includes(scanNitDigits) || scanNitDigits.includes(siesaNitDigits);
      });

      displayFullResult(filteredItem, parts);
      playSuccessSound();
    } else {
      displayFullResult(filteredItem, parts);
      playSuccessSound();
    }
  } else {
    showError(`${documento}-${nit}`, "Documento no encontrado en la base de datos");
    playErrorSound();
  }
}

function displayFullResult(item, qrParts) {
  const totalRegistros = item.datosSiesa ? item.datosSiesa.length : 0;

  // Renderizar
  let html = `<div class="result-item">`;

  // 1. Cabecera Principal (Datos del Documento)
  html += `
    <div class="result-header-main">
      <div class="document-title">Documento REC</div>
      <div class="document-id">${item.documento || qrParts.documento}</div>
      <div class="main-details-grid">
  `;

  // Campos Clave Principales
  const mainFields = ['lote', 'referencia'];
  mainFields.forEach(key => {
    if (item[key]) {
      html += `
         <div class="detail-box">
           <div class="detail-box-label">${key}</div>
           <div class="detail-box-value">${item[key]}</div>
         </div>
       `;
    }
  });

  // Otros campos (si existen y no son siesa)
  for (const key in item) {
    if (key !== 'datosSiesa' && key !== 'documento' && !mainFields.includes(key)) {
      // Opcional: mostrar mas datos si es necesario, por ahora mantenemos limpio
    }
  }

  html += `</div></div>`; // Cierre grid y header

  // 2. Lista de Facturas
  if (item.datosSiesa && Array.isArray(item.datosSiesa)) {
    const count = item.datosSiesa.length;
    html += `
       <div class="siesa-list-header">
         Facturas Relacionadas <span class="badge-count">${count}</span>
       </div>
    `;

    item.datosSiesa.forEach((siesa, index) => {
      const tieneFactura = siesa.factura && siesa.factura.trim() !== "";
      const referencia = siesa.referencia || item.referencia || 'Sin referencia';
      const cantidad = siesa.cantidad || 0;
      
      // Verificar si hay imagen IH3
      const tieneIh3 = siesa.Ih3 && siesa.Ih3.trim() !== '' && siesa.Ih3.includes('googleusercontent.com/d/');

      // Estado Lógica
      let estadoConf = "PENDIENTE";
      let statusClass = "status-pendiente";
      let statusTagClass = "status-tag-pendiente";
      let isProcessing = false;

      // Verificar si está en cola de subida
      const inQueue = uploadQueue.queue.find(q => q.factura === siesa.factura);
      if (inQueue) {
        isProcessing = true;
        estadoConf = "PROCESANDO";
        statusClass = "status-processing";
        statusTagClass = "status-tag-processing";
      } else if (siesa.confirmacion && siesa.confirmacion.trim() === "ENTREGADO") {
        estadoConf = "ENTREGADO";
        statusClass = "status-entregado";
        statusTagClass = "status-tag-entregado";
      } else if (!tieneFactura) {
        estadoConf = "NO FACTURADO";
        statusClass = "status-nofacturado";
        statusTagClass = "status-tag-error";
      } else if (siesa.confirmacion && siesa.confirmacion.includes("PENDIENTE FACTURA")) {
        estadoConf = "PENDIENTE FACTURA";
        statusClass = "status-pendiente";
        statusTagClass = "status-tag-pendiente";
      }

      // Nombre Proveedor Clean
      let proveedor = siesa.proovedor || "Desconocido";
      if (proveedor.length > 20) proveedor = proveedor.substring(0, 20) + "...";

      html += `
        <div class="siesa-item collapsed ${statusClass}" id="siesa-item-${index}">
           <!-- Solapa de Estado (Barra superior) -->
           <div class="status-solapa"></div>

           <!-- Header Clickable -->
           <div class="card-header">
              <div class="factura-main-click" onclick="toggleSiesaItem(${index})" style="flex:1;">
                  <div class="factura-info">
                     <div class="factura-id">${tieneFactura ? siesa.factura : 'SIN FACTURA'}</div>
                     <div class="factura-meta-line">
                        <span class="meta-item"><i class="fas fa-box"></i> ${cantidad}</span>
                        <span class="meta-separator">•</span>
                        <span class="meta-item"><i class="fas fa-tags"></i><span class="reference-highlight">${referencia}</span></span>
                        ${tieneIh3 ? `<span class="meta-separator">•</span><span class="meta-item"><i class="fas fa-image"></i> Soporte</span>` : ''}
                     </div>
                  </div>
              </div>
              
              <div class="card-header-actions">
                 ${isProcessing ?
        `<div class="status-icon-only processing"><i class="fas fa-sync fa-spin"></i></div>` :
        estadoConf === "ENTREGADO" ?
          `<div class="status-icon-only success"><i class="fas fa-check-circle"></i></div>` :
          estadoConf === "NO FACTURADO" ?
            `<div class="status-icon-only error"><i class="fas fa-exclamation-triangle"></i></div>` :
            estadoConf === "PENDIENTE" ?
              `<button class="action-btn-mini btn-scan" 
                        data-factura="${siesa.factura}" 
                        onclick="event.stopPropagation(); procesarEntrega('${item.documento}', '${siesa.lote || item.lote}', '${siesa.referencia}', '${siesa.cantidad}', '${siesa.factura}', '${siesa.nit || qrParts.nit}', this)">
                        <i class="fas fa-camera"></i>
                     </button>` : ''
      }
                 
                 <i class="fas fa-chevron-down card-chevron" onclick="toggleSiesaItem(${index})"></i>
              </div>
           </div>

           <!-- Content Grid -->
           <div class="collapsible-content">
              <div class="details-grid adaptive">
      `;

      // Renderizar TODOS los campos disponibles del objeto siesa
      const priorityKeys = ['proovedor', 'cliente', 'nit', 'lote', 'referencia', 'cantidad', 'fecha', 'valorBruto'];
      const hiddenKeys = ['factura', 'confirmacion', 'Ih3', 'estado']; // Ocultar Ih3 de la lista normal

      priorityKeys.forEach(key => {
        if (siesa[key]) {
          // Determinar si es texto largo (cliente o proovedor)
          const esTextoLargo = key === 'cliente' || key === 'proovedor';
          const valor = formatSiesaValue(siesa[key]);
          
          html += `
            <div class="mini-detail ${esTextoLargo ? 'full-width' : ''}">
               <div class="mini-label">${key}</div>
               <div class="mini-value">${valor}</div>
            </div>
          `;
        }
      });

      // Campos adicionales (no prioridad)
      for (const key in siesa) {
        if (!priorityKeys.includes(key) && !hiddenKeys.includes(key) && siesa[key]) {
          const esTextoLargo = key.toLowerCase().includes('nombre') || 
                              key.toLowerCase().includes('descripcion') ||
                              siesa[key].length > 30;
          
          html += `
            <div class="mini-detail ${esTextoLargo ? 'full-width' : ''}">
               <div class="mini-label">${formatKey(key)}</div>
               <div class="mini-value">${formatSiesaValue(siesa[key])}</div>
            </div>
          `;
        }
      }

      // Mostrar imagen ih3 si existe (en lugar del enlace)
      if (tieneIh3) {
        const imageId = siesa.Ih3.split('/').pop();
        const thumbnailUrl = `https://lh3.googleusercontent.com/d/${imageId}=s200`; // Tamaño miniatura
        
        html += `
          <div class="ih3-thumbnail-container">
            <img src="${thumbnailUrl}" 
                 class="ih3-thumbnail" 
                 alt="Comprobante de entrega"
                 onclick="mostrarImagenCompleta('${siesa.Ih3}')">
          </div>
        `;
      }

      html += `
              </div>
              <div style="height: 10px;"></div>
           </div>
        </div>`; // Cierre item
    });
  }

  html += `</div>`; // Cierre result-item
  resultsDiv.innerHTML = html;
}

// Función para formatear nombres de campos (ej: "valorBruto" -> "Valor Bruto")
function formatKey(key) {
  return key
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, str => str.toUpperCase())
    .replace(/_/g, ' ')
    .trim();
}

// Función para mostrar imagen completa
function mostrarImagenCompleta(imageUrl) {
  // Crear modal si no existe
  let modal = document.getElementById('ih3Modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'ih3Modal';
    modal.className = 'ih3-modal';
    modal.innerHTML = `
      <span class="close-modal" onclick="cerrarImagenCompleta()">&times;</span>
      <img class="ih3-modal-img" src="" alt="Comprobante completo">
    `;
    document.body.appendChild(modal);
    
    // Cerrar al hacer clic fuera de la imagen
    modal.addEventListener('click', function(e) {
      if (e.target === modal) {
        cerrarImagenCompleta();
      }
    });
  }
  
  // Establecer la imagen y mostrar
  const img = modal.querySelector('.ih3-modal-img');
  img.src = imageUrl;
  modal.style.display = 'flex';
  
  // Prevenir scroll del body
  document.body.style.overflow = 'hidden';
}

// Función para cerrar imagen completa
function cerrarImagenCompleta() {
  const modal = document.getElementById('ih3Modal');
  if (modal) {
    modal.style.display = 'none';
    document.body.style.overflow = '';
  }
}

// Función dummy para mantener compatibilidad si algo llama a displayItemData directamente
function displayItemData(data, title, qrParts) {
  // Esta función ya no se usa directamente en el nuevo flujo simplificado, 
  // pero la mantenemos vacía o redirigiendo por si acaso.
  return "";
}

// Helper para formatear valores
function formatSiesaValue(val) {
  if (typeof val === 'number') return val.toLocaleString('es-CO');
  return val;
}

// Función para expandir/colapsar tarjetas
// Función para expandir/colapsar tarjetas de facturas - ADAPTADA
function toggleSiesaItem(index) {
  const item = document.getElementById(`siesa-item-${index}`);

  if (item.classList.contains('collapsed')) {
    item.classList.remove('collapsed');
    item.classList.add('expanded');
  } else {
    item.classList.remove('expanded');
    item.classList.add('collapsed');
  }
}

// Función para expandir todas las tarjetas
function expandAllSiesaItems() {
  document.querySelectorAll('.siesa-item.collapsed').forEach(item => {
    const index = item.id.replace('siesa-item-', '');
    toggleSiesaItem(index);
  });
}

// Función para colapsar todas las tarjetas
function collapseAllSiesaItems() {
  document.querySelectorAll('.siesa-item.expanded').forEach(item => {
    const index = item.id.replace('siesa-item-', '');
    toggleSiesaItem(index);
  });
}


function formatKey(key) {
  return key
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, str => str.toUpperCase())
    .replace('columna', '')
    .trim();
}

function formatValue(value, key = '') {
  if (value === null || value === undefined) {
    return '<span class="no-data">N/A</span>';
  }

  if (typeof value === 'object') {
    return '<span class="no-data">[Datos complejos]</span>';
  }

  if (typeof value === 'number') {
    if (key.toLowerCase().includes('valor') || key.toLowerCase().includes('suma')) {
      return `<span class="numeric-value">${value.toLocaleString('es-CO')}</span>`;
    }
    return value.toString();
  }

  if (typeof value === 'boolean') {
    return value ? 'Sí' : 'No';
  }

  return value.toString();
}

function showError(barcode, message = "Código no encontrado") {
  resultsDiv.innerHTML = `
    <div class="error">
      <i class="fas fa-times-circle"></i> ${message}: <strong>${barcode}</strong>
    </div>
  `;
}

// Bloqueo de zoom con JavaScript (para mayor seguridad)
document.addEventListener('DOMContentLoaded', function () {
  // Prevenir gestos de zoom
  document.addEventListener('gesturestart', function (e) {
    e.preventDefault();
  });

  // Prevenir doble toque para zoom
  let lastTouchEnd = 0;
  document.addEventListener('touchend', function (e) {
    const now = Date.now();
    if (now - lastTouchEnd <= 300) e.preventDefault();
    lastTouchEnd = now;
  }, { passive: false });

  // Prevenir zoom con teclado (Ctrl + +/-)
  document.addEventListener('keydown', function (e) {
    if (e.ctrlKey && (e.key === '+' || e.key === '-' || e.key === '0')) {
      e.preventDefault();
    }
  });
});

// Detectar si es móvil para ajustes específicos
function esMovil() {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

// Pull-to-Refresh extremadamente simplificado, con dos dedos, sin banners ni notificaciones
document.addEventListener('DOMContentLoaded', () => {
  // Referencias a elementos clave
  const statusDiv = document.getElementById('status');
  const dataStats = document.getElementById('data-stats');
  const resultsDiv = document.getElementById('results');

  // Variables de control
  let startY = 0;
  let isPulling = false;

  // Manejador para touchstart (inicio del gesto)
  document.addEventListener('touchstart', function (e) {
    if (window.scrollY === 0 && e.touches.length === 2) { // 1 dedo y arriba del todo
      startY = e.touches[0].clientY;
      isPulling = true;
    }
  }, { passive: true });

  // Manejador para touchmove (movimiento durante el gesto)
  document.addEventListener('touchmove', function (e) {
    if (!isPulling) return;

    const currentY = e.touches[0].clientY;
    const pullDistance = currentY - startY;

    if (pullDistance > 0 && window.scrollY === 0) {
      // Visual feedback could be added here (e.g. pulling down icon)
    }
  }, { passive: true });

  // Manejador para touchend (fin del gesto)
  document.addEventListener('touchend', function (e) {
    if (!isPulling) return;
    const endY = e.changedTouches[0].clientY;
    const pullDistance = endY - startY;

    if (pullDistance > 100 && window.scrollY === 0) { // Umbral de 100px
      refreshData();
    }
    isPulling = false;
  });

  // Función para refrescar los datos
  function refreshData() {
    statusDiv.className = 'loading';
    statusDiv.innerHTML = '<i class="fas fa-sync fa-spin"></i> ACTUALIZANDO...';

    // Usar la funcion de main.js
    if (typeof obtenerDatosFacturados === 'function') {
      obtenerDatosFacturados()
        .then(serverData => {
          handleDataLoadSuccess(serverData);
          // Si hay QR activo, reprocesarlo para ver actualizaciones
          if (currentQRParts) {
            processQRCodeParts(currentQRParts);
          }
        })
        .catch(error => handleDataLoadError(error));
    } else {
      // Fallback or error
      console.error("main.js no cargado");
      statusDiv.className = 'error';
      statusDiv.textContent = "Error de conexión";
    }
  }
});