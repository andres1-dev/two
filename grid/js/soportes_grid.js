// =========================================
// SOPORTES GRID - VERSIÓN CORREGIDA
// Con infinite scroll funcional y filtros de fecha arreglados
// =========================================

const SoportesGrid = {
  // Estado
  entregas: [],
  filteredEntregas: [],
  currentPage: 1,
  itemsPerPage: 30, // Aumentado para mejor prueba
  isLoading: true,
  hasMore: true,
  isLoadingMore: true,
  
  // Elementos DOM
  container: null,
  loadingEl: null,
  emptyEl: null,
  sentinelEl: null,
  
  // Inicializar
  init: async function() {
    console.log('📱 Inicializando Soportes Grid...');
    this.container = document.getElementById('soportesGridContainer');
    this.loadingEl = document.getElementById('soportesGridLoading');
    this.emptyEl = document.getElementById('soportesGridEmpty');
    this.sentinelEl = document.getElementById('grid-sentinel');
    
    await this.cargarDatos();
    this.initEventListeners();
    this.initInfiniteScroll();
  },
  
  // Cargar datos desde Google Sheets
  cargarDatos: async function() {
    this.showLoading();
    
    try {
      if (typeof obtenerDatosSoportes !== 'function') {
        throw new Error('obtenerDatosSoportes no está disponible');
      }
      
      const soportesMap = await obtenerDatosSoportes();
      this.entregas = this.mapToGridItems(soportesMap);
      this.filteredEntregas = [...this.entregas];
      this.currentPage = 1;
      this.hasMore = this.filteredEntregas.length > this.itemsPerPage;
      
      // Limpiar contenedor y renderizar
      this.container.innerHTML = '';
      this.render();
      
      // Actualizar contador
      this.updateStats();
      
    } catch (error) {
      console.error('Error cargando soportes:', error);
      this.showError(error.message);
    }
    
    this.hideLoading();
  },
  
  // Convertir mapa de soportes a items del grid
  mapToGridItems: function(soportesMap) {
    const items = [];
    
    if (!soportesMap || typeof soportesMap !== 'object') {
      console.warn('Mapa de soportes vacío');
      return items;
    }
    
    console.log('Procesando soportes:', Object.keys(soportesMap).length);
    
    Object.keys(soportesMap).forEach(key => {
      // Saltar entradas BY_FACTURA_ y vacías
      if (key.startsWith('BY_FACTURA_') || !key || key === 'undefined') return;
      
      const soporte = soportesMap[key];
      if (!soporte) return;
      
      const partes = key.split('_');
      
      // Extraer datos
      const documento = partes[0] || '';
      const lote = partes[1] || '';
      const referencia = partes[2] || '';
      const cantidad = partes[3] || '';
      const nit = partes.slice(4).join('_') || '';
      
      // Procesar fecha - CORREGIDO
      let fechaObj = null;
      let fechaFormateada = '';
      let fechaRelativa = '';
      
      if (soporte.fechaEntrega) {
        // Intentar parsear la fecha correctamente
        fechaObj = this.parseFecha(soporte.fechaEntrega);
        if (fechaObj) {
          fechaFormateada = this.formatearFecha(fechaObj);
          fechaRelativa = this.getTiempoRelativo(fechaObj);
        }
      }
      
      // Si no hay fecha válida, usar fecha actual
      if (!fechaObj) {
        fechaObj = new Date();
        fechaFormateada = this.formatearFecha(fechaObj);
        fechaRelativa = 'Reciente';
      }
      
      // Determinar color basado en el cliente
      const colorScheme = this.getColorForClient(nit);
      
      // Buscar nombre del cliente - COMPLETO, no abreviado
      let nombreCliente = nit;
      if (typeof CLIENTS_MAP !== 'undefined') {
        // Invertir el mapa para buscar por NIT
        for (const [nombre, nitCliente] of Object.entries(CLIENTS_MAP)) {
          if (nitCliente === nit) {
            nombreCliente = nombre;
            break;
          }
        }
      }
      
      items.push({
        id: `${documento}_${lote}_${referencia}_${Date.now()}_${Math.random()}`,
        documento: documento,
        factura: soporte.factura || 'SIN FACTURA',
        lote: lote,
        referencia: referencia,
        cantidad: cantidad,
        nit: nit,
        cliente: nombreCliente, // NOMBRE COMPLETO
        ih3: soporte.imageId || '',
        fecha: fechaFormateada,
        fechaObj: fechaObj,
        fechaRelativa: fechaRelativa,
        timestamp: fechaObj ? fechaObj.getTime() : Date.now(),
        color: colorScheme.color,
        bgColor: colorScheme.bgColor,
        tieneImagen: !!soporte.imageId
      });
    });
    
    // Ordenar por fecha (más reciente primero)
    const ordenados = items.sort((a, b) => b.timestamp - a.timestamp);
    console.log(`✅ ${ordenados.length} entregas procesadas`);
    return ordenados;
  },
  
  // PARSEAR FECHA - CORREGIDO
  parseFecha: function(fechaStr) {
    if (!fechaStr) return null;
    
    try {
      // Si ya es un objeto Date
      if (fechaStr instanceof Date) return fechaStr;
      
      // Formato: "DD/MM/YYYY HH:MM:SS" o "DD/MM/YYYY"
      if (typeof fechaStr === 'string') {
        // Separar fecha y hora
        const partes = fechaStr.split(' ');
        const fechaPartes = partes[0].split('/');
        
        if (fechaPartes.length === 3) {
          const dia = parseInt(fechaPartes[0], 10);
          const mes = parseInt(fechaPartes[1], 10) - 1;
          const anio = parseInt(fechaPartes[2], 10);
          
          let hora = 0, minuto = 0, segundo = 0;
          
          if (partes.length > 1) {
            const tiempoPartes = partes[1].split(':');
            hora = parseInt(tiempoPartes[0] || 0, 10);
            minuto = parseInt(tiempoPartes[1] || 0, 10);
            segundo = parseInt(tiempoPartes[2] || 0, 10);
          }
          
          return new Date(anio, mes, dia, hora, minuto, segundo);
        }
      }
      
      // Intentar con Date.parse
      const timestamp = Date.parse(fechaStr);
      if (!isNaN(timestamp)) return new Date(timestamp);
      
    } catch (e) {
      console.warn('Error parseando fecha:', fechaStr, e);
    }
    
    return null;
  },
  
  // Obtener color por cliente
  getColorForClient: function(nit) {
    const colors = [
      { color: '#2563eb', bgColor: '#dbeafe' }, // Azul
      { color: '#7c3aed', bgColor: '#ede9fe' }, // Púrpura
      { color: '#db2777', bgColor: '#fce7f3' }, // Rosa
      { color: '#059669', bgColor: '#d1fae5' }, // Verde
      { color: '#d97706', bgColor: '#fef3c7' }, // Ámbar
      { color: '#dc2626', bgColor: '#fee2e2' }, // Rojo
      { color: '#6b7280', bgColor: '#f3f4f6' }  // Gris
    ];
    
    // Usar el NIT para generar un índice consistente
    const index = Math.abs(this.hashCode(nit || '')) % colors.length;
    return colors[index];
  },
  
  hashCode: function(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) - hash) + str.charCodeAt(i);
      hash |= 0;
    }
    return hash;
  },
  
  // Formatear fecha
  formatearFecha: function(date) {
    if (!date || !(date instanceof Date) || isNaN(date.getTime())) return '---';
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${day}/${month}/${year} ${hours}:${minutes}`;
  },
  
  // Tiempo relativo - CORREGIDO
  getTiempoRelativo: function(date) {
    if (!date || !(date instanceof Date) || isNaN(date.getTime())) return 'Fecha desconocida';
    
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 1) return 'Ahora';
    if (diffMins < 60) return `Hace ${diffMins} min`;
    if (diffHours < 24) return `Hace ${diffHours} h`;
    if (diffDays === 1) return 'Ayer';
    if (diffDays < 7) return `Hace ${diffDays} días`;
    if (diffDays < 30) return `Hace ${diffDays} días`;
    return date.toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric' });
  },
  
  // Renderizar grid - CORREGIDO
  render: function() {
    if (!this.container) return;
    
    const start = 0;
    const end = this.currentPage * this.itemsPerPage;
    const itemsToShow = this.filteredEntregas.slice(start, end);
    
    console.log(`Renderizando página ${this.currentPage}: ${itemsToShow.length} items (total: ${this.filteredEntregas.length})`);
    
    // Limpiar solo si es primera página
    if (this.currentPage === 1) {
      this.container.innerHTML = '';
    }
    
    // Crear fragment para mejor rendimiento
    const fragment = document.createDocumentFragment();
    
    itemsToShow.forEach(item => {
      fragment.appendChild(this.createGridItem(item));
    });
    
    this.container.appendChild(fragment);
    
    // Actualizar estado de "hasMore"
    this.hasMore = end < this.filteredEntregas.length;
    
    // Mostrar/ocultar sentinel
    if (this.sentinelEl) {
      this.sentinelEl.style.display = this.hasMore ? 'flex' : 'none';
    }
    
    // Actualizar contador
    this.updateStats();
  },
  
  // Crear item del grid - CORREGIDO (sin abreviar)
  createGridItem: function(item) {
    const div = document.createElement('div');
    div.className = 'grid-item';
    div.setAttribute('data-id', item.id);
    div.setAttribute('data-factura', item.factura);
    
    // Determinar si es ancho (destacar algunos)
    const shouldBeWide = item.tieneImagen || parseInt(item.cantidad) > 30;
    if (shouldBeWide) {
      div.classList.add('wide');
    }
    
    // Template del item - CON NOMBRE COMPLETO
    div.innerHTML = `
      ${item.tieneImagen ? `
        <div class="grid-item-image" onclick="SoportesGrid.previewImage('${item.ih3}', '${item.factura}')">
          <img src="https://lh3.googleusercontent.com/d/${item.ih3}=s200" alt="Soporte" loading="lazy">
          <div class="image-overlay">
            <span>${item.factura}</span>
          </div>
          <div class="image-badge">
            <i class="fas fa-camera"></i>
          </div>
        </div>
      ` : `
        <div class="grid-item-noimage" style="background: ${item.bgColor};">
          <div class="noimage-content">
            <i class="fas fa-file-invoice" style="color: ${item.color};"></i>
            <span class="noimage-factura">${item.factura}</span>
          </div>
        </div>
      `}
      
      <div class="grid-item-content">
        <div class="grid-item-header">
          <div class="cliente-badge" style="background: ${item.bgColor}; color: ${item.color};" title="${item.cliente}">
            <i class="fas fa-building"></i>
            <span class="cliente-nombre">${item.cliente}</span>
          </div>
          <div class="item-time">
            <i class="far fa-clock"></i>
            ${item.fechaRelativa}
          </div>
        </div>
        
        <div class="grid-item-details">
          <div class="detail-chip">
            <i class="fas fa-cube"></i>
            <span>${item.lote}</span>
          </div>
          <div class="detail-chip">
            <i class="fas fa-hashtag"></i>
            <span>${item.referencia}</span>
          </div>
          <div class="detail-chip highlight">
            <i class="fas fa-box"></i>
            <span>${item.cantidad}</span>
          </div>
        </div>
        
        <div class="grid-item-footer">
          <div class="documento-badge">
            <i class="fas fa-file-alt"></i>
            ${item.documento}
          </div>
          <div class="item-actions">
            <button class="grid-action-btn" onclick="SoportesGrid.showDetails('${item.id}')" title="Ver detalles">
              <i class="fas fa-info-circle"></i>
            </button>
          </div>
        </div>
      </div>
    `;
    
    return div;
  },
  
  // INFINITE SCROLL - CORREGIDO
  initInfiniteScroll: function() {
    if (!this.sentinelEl) {
      console.warn('Sentinel no encontrado');
      return;
    }
    
    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && this.hasMore && !this.isLoadingMore) {
        this.loadMore();
      }
    }, {
      threshold: 0.1,
      rootMargin: '100px' // Cargar antes de llegar al final
    });
    
    observer.observe(this.sentinelEl);
    this.intersectionObserver = observer;
  },
  
  // Cargar más items - CORREGIDO
  loadMore: function() {
    if (this.isLoadingMore || !this.hasMore) return;
    
    this.isLoadingMore = true;
    
    // Mostrar indicador en el sentinel
    if (this.sentinelEl) {
      this.sentinelEl.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i> Cargando más entregas...';
    }
    
    // Simular carga async
    setTimeout(() => {
      this.currentPage++;
      this.render();
      this.isLoadingMore = false;
      
      // Restaurar sentinel
      if (this.sentinelEl && this.hasMore) {
        this.sentinelEl.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i> Cargando más...';
      }
    }, 300); // Pequeño delay para feedback visual
  },
  
  // FILTROS - CORREGIDO
  aplicarFiltros: function(filtros = {}) {
    console.log('Aplicando filtros:', filtros);
    
    let resultados = [...this.entregas];
    
    // Filtro por fecha - CORREGIDO
    if (filtros.fechaInicio && filtros.fechaFin) {
      const inicio = this.normalizarFecha(filtros.fechaInicio);
      const fin = this.normalizarFecha(filtros.fechaFin);
      fin.setHours(23, 59, 59, 999);
      
      console.log('Filtrando fechas:', inicio, 'a', fin);
      
      resultados = resultados.filter(item => {
        if (!item.fechaObj) return false;
        return item.fechaObj >= inicio && item.fechaObj <= fin;
      });
      
      console.log(`Filtro de fecha: ${resultados.length} resultados`);
    }
    
    // Filtro por búsqueda
    if (filtros.busqueda && filtros.busqueda.trim() !== '') {
      const busqueda = filtros.busqueda.toLowerCase().trim();
      resultados = resultados.filter(item =>
        item.factura.toLowerCase().includes(busqueda) ||
        item.documento.toLowerCase().includes(busqueda) ||
        item.lote.toLowerCase().includes(busqueda) ||
        item.referencia.toLowerCase().includes(busqueda) ||
        item.cliente.toLowerCase().includes(busqueda)
      );
    }
    
    this.filteredEntregas = resultados;
    this.currentPage = 1;
    this.hasMore = this.filteredEntregas.length > this.itemsPerPage;
    
    // Limpiar contenedor y renderizar
    this.container.innerHTML = '';
    this.render();
    
    // Mostrar/ocultar empty state
    if (this.filteredEntregas.length === 0) {
      this.showEmpty();
    } else {
      this.hideEmpty();
    }
    
    // Actualizar sentinel
    if (this.sentinelEl) {
      this.sentinelEl.style.display = this.hasMore ? 'flex' : 'none';
    }
    
    this.updateStats();
  },
  
  // Normalizar fecha para comparación - CORREGIDO
  normalizarFecha: function(fecha) {
    if (fecha instanceof Date) {
      return new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate());
    }
    if (typeof fecha === 'string') {
      const date = this.parseFecha(fecha);
      if (date) {
        return new Date(date.getFullYear(), date.getMonth(), date.getDate());
      }
    }
    return new Date();
  },
  
  // Reset filtros
  resetFiltros: function() {
    this.filteredEntregas = [...this.entregas];
    this.currentPage = 1;
    this.hasMore = this.filteredEntregas.length > this.itemsPerPage;
    this.container.innerHTML = '';
    this.render();
    this.hideEmpty();
    
    if (this.sentinelEl) {
      this.sentinelEl.style.display = this.hasMore ? 'flex' : 'none';
    }
    
    this.updateStats();
  },
  
  // Actualizar estadísticas
  updateStats: function() {
    const countEl = document.getElementById('soportesGridCount');
    if (countEl) {
      countEl.textContent = `${this.filteredEntregas.length} entregas`;
    }
    
    const badge = document.getElementById('soportesGridBadge');
    if (badge) {
      const now = new Date();
      const timeStr = now.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });
      badge.innerHTML = `<i class="fas fa-check-circle"></i> ${timeStr}`;
    }
  },
  
  // Vista previa de imagen
  previewImage: function(imageId, factura) {
    if (!imageId) return;
    
    const url = `https://lh3.googleusercontent.com/d/${imageId}`;
    const modal = document.getElementById('soportesImageModal');
    const modalImg = document.getElementById('soportesModalImage');
    
    if (modal && modalImg) {
      modalImg.src = url;
      modal.style.display = 'flex';
    } else {
      window.open(url, '_blank');
    }
  },
  
  // Mostrar detalles
  showDetails: function(itemId) {
    const item = this.filteredEntregas.find(i => i.id === itemId);
    if (!item) return;
    
    // Formatear mensaje de detalles
    alert(`
📄 FACTURA: ${item.factura}
📦 DOCUMENTO: ${item.documento}
🏷️ LOTE: ${item.lote}
🔖 REFERENCIA: ${item.referencia}
📊 CANTIDAD: ${item.cantidad}
🏢 CLIENTE: ${item.cliente}
📅 FECHA: ${item.fecha}
    `);
  },
  
  // UI Helpers
  showLoading: function() {
    this.isLoading = true;
    if (this.loadingEl) this.loadingEl.style.display = 'flex';
    if (this.sentinelEl) this.sentinelEl.style.display = 'none';
  },
  
  hideLoading: function() {
    this.isLoading = false;
    if (this.loadingEl) this.loadingEl.style.display = 'none';
    if (this.sentinelEl && this.hasMore) this.sentinelEl.style.display = 'flex';
  },
  
  showEmpty: function() {
    if (this.emptyEl) this.emptyEl.style.display = 'flex';
    if (this.sentinelEl) this.sentinelEl.style.display = 'none';
  },
  
  hideEmpty: function() {
    if (this.emptyEl) this.emptyEl.style.display = 'none';
  },
  
  showError: function(message) {
    if (this.container) {
      this.container.innerHTML = `
        <div class="grid-error">
          <i class="fas fa-exclamation-triangle"></i>
          <h4>Error al cargar</h4>
          <p>${message}</p>
          <button onclick="SoportesGrid.cargarDatos()" class="btn-retry">
            <i class="fas fa-redo"></i> Reintentar
          </button>
        </div>
      `;
    }
  },
  
  // Exportar a Excel
  exportarExcel: function() {
    if (typeof XLSX === 'undefined') {
      alert('Excel export no disponible');
      return;
    }
    
    try {
      const data = this.filteredEntregas.map(item => ({
        'Fecha': item.fecha,
        'Factura': item.factura,
        'Documento': item.documento,
        'Lote': item.lote,
        'Referencia': item.referencia,
        'Cantidad': item.cantidad,
        'Cliente': item.cliente,
        'NIT': item.nit,
        'Soporte': item.ih3 ? `https://lh3.googleusercontent.com/d/${item.ih3}` : ''
      }));
      
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(data);
      XLSX.utils.book_append_sheet(wb, ws, 'Entregas');
      XLSX.writeFile(wb, `entregas_${new Date().toISOString().slice(0,10)}.xlsx`);
    } catch (e) {
      console.error('Error exportando Excel:', e);
      alert('Error al exportar');
    }
  }
};

// Inicialización con retry
function initSoportesGrid() {
  if (typeof obtenerDatosSoportes === 'function') {
    SoportesGrid.init();
    window.SoportesGrid = SoportesGrid;
    console.log('✅ SoportesGrid inicializado');
    return true;
  }
  return false;
}

// Intentar inicializar cada 500ms hasta 10 segundos
let attempts = 0;
const maxAttempts = 20;
const initInterval = setInterval(() => {
  attempts++;
  if (initSoportesGrid() || attempts >= maxAttempts) {
    clearInterval(initInterval);
  }
}, 500);