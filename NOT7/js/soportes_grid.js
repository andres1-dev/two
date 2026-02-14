// =========================================
// SOPORTES GRID - INFINITE SCROLL CORREGIDO
// Ahora carga todos los registros progresivamente
// =========================================

const SoportesGrid = {
  // Estado
  entregas: [],
  filteredEntregas: [],
  currentPage: 1,
  itemsPerPage: 10,
  isLoading: true,
  hasMore: true,
  isLoadingMore: false,

  // Elementos DOM
  container: null,
  loadingEl: null,
  emptyEl: null,
  sentinelEl: null,
  intersectionObserver: null,

  // Inicializar
  init: async function () {
    console.log('📱 Inicializando Soportes Grid...');
    this.container = document.getElementById('soportesGridContainer');
    this.loadingEl = document.getElementById('soportesGridLoading');
    this.emptyEl = document.getElementById('soportesGridEmpty');
    this.sentinelEl = document.getElementById('grid-sentinel');

    // Elementos del Modal
    this.modal = document.getElementById('soportesGridModal');
    this.openBtn = document.getElementById('openSoportesGridBtn');
    this.closeBtn = document.getElementById('closeSoportesGridBtn');
    this.refreshBtn = document.getElementById('refreshSoportesBtn');

    // Filtros
    this.filterTodayBtn = document.getElementById('filterTodayBtn');
    this.filterWeekBtn = document.getElementById('filterWeekBtn');
    this.btnNotifyToday = document.getElementById('btnNotifyToday');
    this.resetFilterBtn = document.getElementById('resetFilterBtn');
    this.searchInput = document.getElementById('soportesGridSearch');

    this.bindEvents();

    // Carga inicial (opcional, se hará al abrir)
    // await this.cargarDatos(); 
    this.initInfiniteScroll();
  },

  bindEvents: function () {
    // Abrir/Cerrar
    if (this.openBtn) this.openBtn.addEventListener('click', () => this.open());
    if (this.closeBtn) this.closeBtn.addEventListener('click', () => this.close());

    // Refresh
    if (this.refreshBtn) {
      this.refreshBtn.addEventListener('click', () => {
        this.cargarDatos();
      });
    }

    // Filtros
    if (this.filterTodayBtn) {
      this.filterTodayBtn.addEventListener('click', () => {
        const hoy = new Date();
        this.aplicarFiltros({ fechaInicio: hoy, fechaFin: hoy });
      });
    }

    if (this.filterWeekBtn) {
      this.filterWeekBtn.addEventListener('click', () => {
        const hoy = new Date();
        const hace7dias = new Date();
        hace7dias.setDate(hoy.getDate() - 7);
        this.aplicarFiltros({ fechaInicio: hace7dias, fechaFin: hoy });
      });
    }

    if (this.btnNotifyToday) {
      this.btnNotifyToday.addEventListener('click', () => this.enviarResumenHoy());
    }

    if (this.resetFilterBtn) {
      this.resetFilterBtn.addEventListener('click', () => this.resetFiltros());
    }

    // Búsqueda
    if (this.searchInput) {
      this.searchInput.addEventListener('input', (e) => {
        clearTimeout(this.searchTimeout);
        this.searchTimeout = setTimeout(() => {
          this.aplicarFiltros({ busqueda: e.target.value });
        }, 300);
      });
    }
  },

  open: function () {
    if (this.modal) {
      if (typeof PushManager !== 'undefined') PushManager.solicitarPermisos();
      this.modal.style.display = 'flex';
      // Cargar datos al abrir como pidió el usuario
      this.cargarDatos();
    }
  },

  close: function () {
    if (this.modal) {
      this.modal.style.display = 'none';
    }
  },

  // Cargar datos desde Google Sheets
  cargarDatos: async function () {
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

      console.log(`Total entregas: ${this.entregas.length}`);
      console.log(`Mostrando inicialmente: ${this.itemsPerPage}`);

      // Limpiar contenedor y renderizar primera página
      this.container.innerHTML = '';
      this.render();
      this.updateStats();

    } catch (error) {
      console.error('Error cargando soportes:', error);
      this.showError(error.message);
    }

    this.hideLoading();
  },

  // Convertir mapa de soportes a items del grid
  mapToGridItems: function (soportesMap) {
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

      // Procesar fecha
      let fechaObj = null;
      let fechaFormateada = '';
      let fechaRelativa = '';

      if (soporte.fechaEntrega) {
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

      // Buscar nombre del cliente
      let nombreCliente = nit;
      if (typeof CLIENTS_MAP !== 'undefined') {
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
        cliente: nombreCliente,
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
    console.log(`${ordenados.length} entregas procesadas y ordenadas`);
    return ordenados;
  },

  // PARSEAR FECHA
  parseFecha: function (fechaStr) {
    if (!fechaStr) return null;

    try {
      if (fechaStr instanceof Date) return fechaStr;

      if (typeof fechaStr === 'string') {
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

      const timestamp = Date.parse(fechaStr);
      if (!isNaN(timestamp)) return new Date(timestamp);

    } catch (e) {
      console.warn('Error parseando fecha:', fechaStr, e);
    }

    return null;
  },

  // Obtener color por cliente
  getColorForClient: function (nit) {
    const colors = [
      { color: '#2563eb', bgColor: '#dbeafe' },
      { color: '#7c3aed', bgColor: '#ede9fe' },
      { color: '#db2777', bgColor: '#fce7f3' },
      { color: '#059669', bgColor: '#d1fae5' },
      { color: '#d97706', bgColor: '#fef3c7' },
      { color: '#dc2626', bgColor: '#fee2e2' },
      { color: '#6b7280', bgColor: '#f3f4f6' }
    ];

    const index = Math.abs(this.hashCode(nit || '')) % colors.length;
    return colors[index];
  },

  hashCode: function (str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) - hash) + str.charCodeAt(i);
      hash |= 0;
    }
    return hash;
  },

  // Formatear fecha
  formatearFecha: function (date) {
    if (!date || !(date instanceof Date) || isNaN(date.getTime())) return '---';
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${day}/${month}/${year} ${hours}:${minutes}`;
  },

  // Tiempo relativo
  getTiempoRelativo: function (date) {
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

  // =========================================
  // RENDERIZAR - CORREGIDO PARA INFINITE SCROLL
  // =========================================
  render: function () {
    if (!this.container) return;

    const start = (this.currentPage - 1) * this.itemsPerPage;
    const end = this.currentPage * this.itemsPerPage;
    const itemsToShow = this.filteredEntregas.slice(start, end);

    console.log(`Página ${this.currentPage}: mostrando items ${start}-${end} de ${this.filteredEntregas.length}`);
    console.log(`Items en esta página: ${itemsToShow.length}`);

    if (itemsToShow.length === 0) {
      console.log('No hay items para mostrar en esta página');
      return;
    }

    // Crear fragment para mejor rendimiento
    const fragment = document.createDocumentFragment();

    itemsToShow.forEach(item => {
      fragment.appendChild(this.createGridItem(item));
    });

    // APPEND (no reemplazar) - esto es clave para infinite scroll
    this.container.appendChild(fragment);

    // Actualizar estado de "hasMore"
    this.hasMore = end < this.filteredEntregas.length;

    console.log(`   Has more: ${this.hasMore} (${end} < ${this.filteredEntregas.length})`);

    // Mostrar/ocultar sentinel
    if (this.sentinelEl) {
      this.sentinelEl.style.display = this.hasMore ? 'flex' : 'none';
    }

    // Actualizar contador
    this.updateStats();
  },

  // Crear item del grid
  createGridItem: function (item) {
    const div = document.createElement('div');
    div.className = 'grid-item';
    div.setAttribute('data-id', item.id);
    div.setAttribute('data-factura', item.factura);

    // Determinar si es ancho
    const shouldBeWide = item.tieneImagen || parseInt(item.cantidad) > 30;
    if (shouldBeWide) {
      div.classList.add('wide');
    }

    // Template del item
    div.innerHTML = `
      ${item.tieneImagen ? `
        <div class="grid-item-image" onclick="SoportesGrid.previewImage('${item.ih3}', '${item.factura}')">
          <img src="https://lh3.googleusercontent.com/d/${item.ih3}=s600-c" alt="Soporte" loading="lazy">
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

  // =========================================
  // INFINITE SCROLL - CORREGIDO
  // =========================================
  initInfiniteScroll: function () {
    if (!this.sentinelEl) {
      console.warn('Sentinel no encontrado');
      return;
    }

    // Limpiar observer anterior si existe
    if (this.intersectionObserver) {
      this.intersectionObserver.disconnect();
    }

    console.log('Configurando Intersection Observer');

    this.intersectionObserver = new IntersectionObserver((entries) => {
      const entry = entries[0];

      console.log('Sentinel visible:', entry.isIntersecting);
      console.log('Has more:', this.hasMore);
      console.log('Is loading:', this.isLoadingMore);

      if (entry.isIntersecting && this.hasMore && !this.isLoadingMore) {
        console.log('✅ Cargando más items...');
        this.loadMore();
      }
    }, {
      threshold: 0.1,
      rootMargin: '200px' // Cargar antes de llegar al final
    });

    this.intersectionObserver.observe(this.sentinelEl);
    console.log('Observer configurado y observando sentinel');
  },

  // =========================================
  // CARGAR MÁS ITEMS - CORREGIDO
  // =========================================
  loadMore: function () {
    if (this.isLoadingMore || !this.hasMore) {
      console.log('No se puede cargar más:', {
        isLoadingMore: this.isLoadingMore,
        hasMore: this.hasMore
      });
      return;
    }

    console.log('Iniciando carga de más items...');
    this.isLoadingMore = true;

    // Mostrar indicador en el sentinel
    if (this.sentinelEl) {
      this.sentinelEl.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i> Cargando más entregas...';
    }

    // Simular carga async (puedes ajustar el delay o removerlo)
    setTimeout(() => {
      this.currentPage++;
      console.log(`Nueva página: ${this.currentPage}`);

      this.render();
      this.isLoadingMore = false;

      console.log(`Carga completada. Página ${this.currentPage}`);

      // Restaurar sentinel si aún hay más
      if (this.sentinelEl && this.hasMore) {
        this.sentinelEl.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i> Cargando más...';
      }
    }, 300);
  },

  // =========================================
  // FILTROS - CORREGIDO
  // =========================================
  aplicarFiltros: function (filtros = {}) {
    console.log('Aplicando filtros:', filtros);

    let resultados = [...this.entregas];

    // Filtro por fecha
    if (filtros.fechaInicio && filtros.fechaFin) {
      const inicio = this.normalizarFecha(filtros.fechaInicio);
      const fin = this.normalizarFecha(filtros.fechaFin);
      fin.setHours(23, 59, 59, 999);

      console.log('Filtrando fechas:', inicio, 'a', fin);

      resultados = resultados.filter(item => {
        if (!item.fechaObj) return false;
        return item.fechaObj >= inicio && item.fechaObj <= fin;
      });

      console.log(`   Resultados después de filtro fecha: ${resultados.length}`);
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

      console.log(`   Resultados después de búsqueda: ${resultados.length}`);
    }

    this.filteredEntregas = resultados;
    this.currentPage = 1;
    this.hasMore = this.filteredEntregas.length > this.itemsPerPage;

    // Limpiar contenedor y renderizar desde cero
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

  // Normalizar fecha para comparación
  normalizarFecha: function (fecha) {
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
  resetFiltros: function () {
    console.log('Reseteando filtros');
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
  updateStats: function () {
    const totalMostrados = Math.min(
      this.currentPage * this.itemsPerPage,
      this.filteredEntregas.length
    );

    const countEl = document.getElementById('soportesGridCount');
    if (countEl) {
      countEl.textContent = `${totalMostrados} de ${this.filteredEntregas.length} entregas`;
    }

    const badge = document.getElementById('soportesGridBadge');
    if (badge) {
      const now = new Date();
      const timeStr = now.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });
      badge.innerHTML = `<i class="fas fa-check-circle"></i> ${timeStr}`;
    }
  },

  // Vista previa de imagen
  previewImage: function (imageId, factura) {
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
  showDetails: function (itemId) {
    const item = this.filteredEntregas.find(i => i.id === itemId);
    if (!item) return;

    alert(`
      FACTURA: ${item.factura}
      DOCUMENTO: ${item.documento}
      LOTE: ${item.lote}
      REFERENCIA: ${item.referencia}
      CANTIDAD: ${item.cantidad}
      CLIENTE: ${item.cliente}
      FECHA: ${item.fecha}
    `);
  },

  // UI Helpers
  showLoading: function () {
    this.isLoading = true;
    if (this.loadingEl) this.loadingEl.style.display = 'flex';
    if (this.sentinelEl) this.sentinelEl.style.display = 'none';
  },

  hideLoading: function () {
    this.isLoading = false;
    if (this.loadingEl) this.loadingEl.style.display = 'none';
    if (this.sentinelEl && this.hasMore) this.sentinelEl.style.display = 'flex';
  },

  showEmpty: function () {
    if (this.emptyEl) this.emptyEl.style.display = 'flex';
    if (this.sentinelEl) this.sentinelEl.style.display = 'none';
  },

  hideEmpty: function () {
    if (this.emptyEl) this.emptyEl.style.display = 'none';
  },

  showError: function (message) {
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
  exportarExcel: function () {
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
      XLSX.writeFile(wb, `entregas_${new Date().toISOString().slice(0, 10)}.xlsx`);
    } catch (e) {
      console.error('Error exportando Excel:', e);
      alert('Error al exportar');
    }
  },

  // =========================================
  // ENVIAR RESUMEN DE HOY - NUEVO
  // =========================================
  enviarResumenHoy: async function () {
    console.log('Calculando resumen de hoy...');

    // 1. Mostrar loading en el botón
    const originalContent = this.btnNotifyToday.innerHTML;
    this.btnNotifyToday.disabled = true;
    this.btnNotifyToday.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Procesando...';

    try {
      // 2. Obtener datos frescos con costos (desde principal.js)
      if (typeof obtenerDatosFacturados !== 'function') {
        throw new Error('Función de datos principales no disponible');
      }

      const snapshot = await obtenerDatosFacturados();
      if (!snapshot.success) throw new Error(snapshot.error);

      // 3. Filtrar entregas de HOY
      const hoy = new Date();
      const hoyStr = hoy.toLocaleDateString('es-CO');

      // Encontrar facturas que tengan confirmación (entregadas) y sean de hoy
      // Nota: SoportesGrid ya tiene las entregas cacheadas, pero necesitamos el valorBruto.
      // Así que cruzamos snapshot.data con this.entregas filtradas por hoy.

      const inicio = new Date();
      inicio.setHours(0, 0, 0, 0);
      const fin = new Date();
      fin.setHours(23, 59, 59, 999);

      const entregasHoy = this.entregas.filter(item => {
        return item.fechaObj >= inicio && item.fechaObj <= fin;
      });

      if (entregasHoy.length === 0) {
        alert('No se encontraron entregas hoy para enviar en el resumen.');
        return;
      }

      // 4. Calcular estadísticas
      const facturasUnicas = new Set();
      let totalUnidades = 0;
      const costosPorCliente = {};

      // Crear mapa de facturas de hoy para búsqueda rápida
      const facturasHoyIds = new Set(entregasHoy.map(e => e.factura));

      // Recorrer datos principales para sumar valores
      snapshot.data.forEach(doc => {
        if (!doc.datosSiesa) return;

        doc.datosSiesa.forEach(f => {
          if (facturasHoyIds.has(f.factura)) {
            facturasUnicas.add(f.factura);
            totalUnidades += parseFloat(f.cantidad) || 0;

            const cliente = f.cliente || 'Desconocido';
            const valor = parseFloat(f.valorBruto) || 0;

            if (!costosPorCliente[cliente]) {
              costosPorCliente[cliente] = { unidades: 0, costo: 0 };
            }
            costosPorCliente[cliente].unidades += parseFloat(f.cantidad) || 0;
            costosPorCliente[cliente].costo += valor;
          }
        });
      });

      // 5. Construir mensaje
      const fechaCorta = hoy.toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric' });
      let mensaje = `*📦 RESUMEN DE ENTREGAS - ${fechaCorta}*\n\n`;
      mensaje += `✅ *Total Facturas:* ${facturasUnicas.size}\n`;
      mensaje += `👕 *Total Unidades:* ${totalUnidades.toLocaleString('es-CO')}\n`;
      mensaje += `💰 *Costo Total:* $${Object.values(costosPorCliente).reduce((s, c) => s + c.costo, 0).toLocaleString('es-CO')}\n\n`;

      mensaje += `*DETALLE POR CLIENTE:*\n`;
      Object.entries(costosPorCliente).forEach(([cliente, stats]) => {
        mensaje += `\n🏢 *${cliente}*\n`;
        mensaje += `   • Und: ${stats.unidades.toLocaleString('es-CO')}\n`;
        mensaje += `   • Costo: $${stats.costo.toLocaleString('es-CO')}\n`;
      });

      mensaje += `\n_Enviado desde PandaDash PWA_`;

      // 6. Enviar Notificaciones Internas (Web Push)
      if (typeof PushManager !== 'undefined' && typeof PushManager.notificarATodos === 'function') {
        const titulo = `📦 Resumen ${fechaCorta}`;
        const miniCuerpo = `Facturas: ${facturasUnicas.size} | Und: ${totalUnidades.toLocaleString('es-CO')} | $${Object.values(costosPorCliente).reduce((s, c) => s + c.costo, 0).toLocaleString('es-CO')}`;

        const success = await PushManager.notificarATodos(titulo, miniCuerpo);

        if (success) {
          alert('✅ Notificación enviada a todos los usuarios.');
        } else {
          // Fallback si falla el Push (ej. no hay suscritos o llaves no configuradas)
          if (confirm('El sistema de Push no está configurado o falló. ¿Deseas compartir por WhatsApp?')) {
            const encodedMsg = encodeURIComponent(mensaje);
            window.open(`https://wa.me/?text=${encodedMsg}`, '_blank');
          }
        }
      } else {
        // Fallback original si no existe PushManager
        if (navigator.share) {
          await navigator.share({ title: 'Resumen Hoy', text: mensaje });
        } else {
          window.open(`https://wa.me/?text=${encodeURIComponent(mensaje)}`, '_blank');
        }
      }

    } catch (error) {
      console.error('Error al enviar resumen:', error);
      alert('Error al calcular el resumen: ' + error.message);
    } finally {
      this.btnNotifyToday.disabled = false;
      this.btnNotifyToday.innerHTML = originalContent;
    }
  }
};

// =========================================
// INICIALIZACIÓN CON RETRY
// =========================================
function initSoportesGrid() {
  if (typeof obtenerDatosSoportes === 'function') {
    SoportesGrid.init();
    window.SoportesGrid = SoportesGrid;
    console.log('SoportesGrid inicializado correctamente');
    return true;
  }
  console.log('Esperando obtenerDatosSoportes...');
  return false;
}

// Intentar inicializar cada 500ms hasta 10 segundos
let attempts = 0;
const maxAttempts = 20;
const initInterval = setInterval(() => {
  attempts++;
  console.log(`🔄 Intento ${attempts}/${maxAttempts} de inicialización`);

  if (initSoportesGrid() || attempts >= maxAttempts) {
    clearInterval(initInterval);
    if (attempts >= maxAttempts) {
      console.error('❌ No se pudo inicializar SoportesGrid - timeout');
    }
  }
}, 500);