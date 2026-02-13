// =========================================
// SOPORTES GRID - VERSIÓN PROFESIONAL
// Mobile First, Ultra Rápido, Sin Dependencias
// =========================================

const SoportesGrid = {
  // Estado
  entregas: [],
  filteredEntregas: [],
  currentPage: 1,
  itemsPerPage: 20,
  isLoading: false,
  hasMore: true,
  
  // Elementos DOM
  container: null,
  loadingEl: null,
  emptyEl: null,
  
  // Inicializar
  init: async function() {
    console.log('📱 Inicializando Soportes Grid...');
    this.container = document.getElementById('soportesGridContainer');
    this.loadingEl = document.getElementById('soportesGridLoading');
    this.emptyEl = document.getElementById('soportesGridEmpty');
    
    await this.cargarDatos();
    this.initEventListeners();
    this.initInfiniteScroll();
  },
  
  // Cargar datos desde Google Sheets
  cargarDatos: async function() {
    this.showLoading();
    
    try {
      // Usar tu función existente
      if (typeof obtenerDatosSoportes !== 'function') {
        throw new Error('obtenerDatosSoportes no está disponible');
      }
      
      const soportesMap = await obtenerDatosSoportes();
      this.entregas = this.mapToGridItems(soportesMap);
      this.filteredEntregas = [...this.entregas];
      this.hasMore = this.filteredEntregas.length > this.itemsPerPage;
      this.currentPage = 1;
      
      this.render();
      
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
      return items;
    }
    
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
      
      // Procesar fecha
      let fecha = new Date();
      let fechaObj = new Date(0);
      let fechaFormateada = '';
      let fechaRelativa = '';
      
      if (soporte.fechaEntrega) {
        fecha = new Date(soporte.fechaEntrega);
        if (!isNaN(fecha.getTime())) {
          fechaObj = fecha;
          fechaFormateada = this.formatearFecha(fecha);
          fechaRelativa = this.getTiempoRelativo(fecha);
        }
      }
      
      // Determinar color basado en el cliente
      const colorScheme = this.getColorForClient(nit);
      
      // Buscar nombre del cliente
      let nombreCliente = nit;
      if (typeof CLIENTS_MAP !== 'undefined') {
        const clientesInvertido = Object.fromEntries(
          Object.entries(CLIENTS_MAP).map(([k, v]) => [v, k])
        );
        nombreCliente = clientesInvertido[nit] || nit;
      }
      
      items.push({
        id: `${documento}_${lote}_${referencia}`,
        documento: documento,
        factura: soporte.factura || 'SIN FACTURA',
        lote: lote,
        referencia: referencia,
        cantidad: cantidad,
        nit: nit,
        cliente: nombreCliente,
        clienteCorto: nombreCliente,
        ih3: soporte.imageId || '',
        fecha: fechaFormateada,
        fechaObj: fechaObj,
        fechaRelativa: fechaRelativa,
        timestamp: fechaObj.getTime(),
        color: colorScheme.color,
        bgColor: colorScheme.bgColor,
        tieneImagen: !!soporte.imageId
      });
    });
    
    // Ordenar por fecha (más reciente primero)
    return items.sort((a, b) => b.timestamp - a.timestamp);
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
    const index = Math.abs(this.hashCode(nit)) % colors.length;
    return colors[index];
  },
  
  // Hash simple para colores consistentes
  hashCode: function(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) - hash) + str.charCodeAt(i);
      hash |= 0;
    }
    return hash;
  },
  
  // Abreviar nombre de cliente
  abreviarCliente: function(nombre) {
    if (!nombre) return 'N/A';
    if (nombre.length <= 20) return nombre;
    
    // Extraer siglas
    const palabras = nombre.split(' ');
    if (palabras.length > 2) {
      return palabras[0] + ' ' + palabras[1].charAt(0) + '.';
    }
    return nombre.substring(0, 18) + '...';
  },
  
  // Formatear fecha
  formatearFecha: function(date) {
    if (!date) return '---';
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${day}/${month}/${year} ${hours}:${minutes}`;
  },
  
  // Tiempo relativo
  getTiempoRelativo: function(date) {
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
    return this.formatearFecha(date).split(' ')[0];
  },
  
  // Renderizar grid
  render: function() {
    if (!this.container) return;
    
    const start = 0;
    const end = this.currentPage * this.itemsPerPage;
    const itemsToShow = this.filteredEntregas.slice(start, end);
    
    if (this.currentPage === 1) {
      this.container.innerHTML = '';
    }
    
    itemsToShow.forEach(item => {
      this.container.appendChild(this.createGridItem(item));
    });
    
    this.hasMore = end < this.filteredEntregas.length;
  },
  
  // Crear item del grid
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
    
    // Template del item
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
          <div class="cliente-badge" style="background: ${item.bgColor}; color: ${item.color};">
            <i class="fas fa-building"></i>
            <span>${item.clienteCorto}</span>
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
  
  // Filtros
  aplicarFiltros: function(filtros = {}) {
    let resultados = [...this.entregas];
    
    // Filtro por fecha
    if (filtros.fechaInicio && filtros.fechaFin) {
      const inicio = new Date(filtros.fechaInicio);
      const fin = new Date(filtros.fechaFin);
      fin.setHours(23, 59, 59, 999);
      
      resultados = resultados.filter(item => 
        item.fechaObj >= inicio && item.fechaObj <= fin
      );
    }
    
    // Filtro por cliente
    if (filtros.cliente) {
      resultados = resultados.filter(item => 
        item.nit === filtros.cliente || item.cliente.includes(filtros.cliente)
      );
    }
    
    // Filtro por búsqueda
    if (filtros.busqueda) {
      const busqueda = filtros.busqueda.toLowerCase();
      resultados = resultados.filter(item =>
        item.factura.toLowerCase().includes(busqueda) ||
        item.documento.toLowerCase().includes(busqueda) ||
        item.lote.toLowerCase().includes(busqueda) ||
        item.referencia.toLowerCase().includes(busqueda)
      );
    }
    
    this.filteredEntregas = resultados;
    this.currentPage = 1;
    this.hasMore = this.filteredEntregas.length > this.itemsPerPage;
    this.container.innerHTML = '';
    this.render();
    
    // Mostrar/ocultar empty state
    if (this.filteredEntregas.length === 0) {
      this.showEmpty();
    } else {
      this.hideEmpty();
    }
  },
  
  // Reset filtros
  resetFiltros: function() {
    this.filteredEntregas = [...this.entregas];
    this.currentPage = 1;
    this.hasMore = this.filteredEntregas.length > this.itemsPerPage;
    this.container.innerHTML = '';
    this.render();
    this.hideEmpty();
  },
  
  // Infinite Scroll
  initInfiniteScroll: function() {
    const sentinel = document.getElementById('grid-sentinel');
    if (!sentinel) return;
    
    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && this.hasMore && !this.isLoading) {
        this.currentPage++;
        this.render();
      }
    });
    
    observer.observe(sentinel);
  },
  
  // Vista previa de imagen
  previewImage: function(imageId, factura) {
    if (!imageId) return;
    
    const url = `https://lh3.googleusercontent.com/d/${imageId}`;
    
    if (typeof mostrarImagenCompleta === 'function') {
      mostrarImagenCompleta(url);
    } else {
      // Modal nativo
      const modal = document.getElementById('soportesImageModal');
      const modalImg = document.getElementById('soportesModalImage');
      const modalFactura = document.getElementById('soportesModalFactura');
      
      if (modal && modalImg) {
        modalImg.src = url;
        if (modalFactura) modalFactura.textContent = factura;
        modal.style.display = 'flex';
      } else {
        window.open(url, '_blank');
      }
    }
  },
  
  // Mostrar detalles
  showDetails: function(itemId) {
    const item = this.filteredEntregas.find(i => i.id === itemId);
    if (!item) return;
    
    // Dispatch evento personalizado
    const event = new CustomEvent('soporte:details', { detail: item });
    document.dispatchEvent(event);
    
    // También puedes implementar un modal de detalles
    alert(`
      Factura: ${item.factura}
      Documento: ${item.documento}
      Lote: ${item.lote}
      Referencia: ${item.referencia}
      Cantidad: ${item.cantidad}
      Cliente: ${item.cliente}
      Fecha: ${item.fecha}
    `);
  },
  
  // UI Helpers
  showLoading: function() {
    this.isLoading = true;
    if (this.loadingEl) this.loadingEl.style.display = 'flex';
  },
  
  hideLoading: function() {
    this.isLoading = false;
    if (this.loadingEl) this.loadingEl.style.display = 'none';
  },
  
  showEmpty: function() {
    if (this.emptyEl) this.emptyEl.style.display = 'flex';
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
  }
};

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', function() {
  // Esperar a que las dependencias estén listas
  const checkDeps = setInterval(function() {
    if (typeof obtenerDatosSoportes === 'function') {
      clearInterval(checkDeps);
      SoportesGrid.init();
      window.SoportesGrid = SoportesGrid;
    }
  }, 100);
  
  // Timeout de seguridad
  setTimeout(function() {
    clearInterval(checkDeps);
    if (!window.SoportesGrid) {
      console.warn('Inicializando SoportesGrid sin dependencias');
      SoportesGrid.init();
      window.SoportesGrid = SoportesGrid;
    }
  }, 5000);
});