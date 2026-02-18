// =========================================
// DASHBOARD DE ENTREGAS — KPIs & Analytics
// Calcula avance de entregas en tiempo real
// =========================================

const Dashboard = {
  modal: null,
  body: null,
  isLoaded: false,
  allData: [], // Almacena todos los datos sin filtrar
  fp: null,    // Instancia de flatpickr
  dateRange: { start: null, end: null },

  // =========================================
  // INICIALIZACIÓN
  // =========================================
  init() {
    this.modal = document.getElementById('dashboardModal');
    this.body = document.getElementById('dashboardBody');
    const closeBtn = document.getElementById('closeDashboardBtn');
    const openBtn = document.getElementById('openDashboardBtn');

    if (closeBtn) closeBtn.onclick = () => this.close();
    if (openBtn) openBtn.onclick = () => this.open();

    // Inicializar Flatpickr
    const dateInput = document.getElementById('dashboardDateRange');
    if (dateInput) {
      const today = new Date();
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

      this.fp = flatpickr(dateInput, {
        mode: "range",
        dateFormat: "d/m/Y",
        defaultDate: [startOfMonth, today],
        locale: "es",
        onChange: (selectedDates) => {
          if (selectedDates.length === 2) {
            this.dateRange.start = selectedDates[0];
            this.dateRange.end = selectedDates[1];
            this.dateRange.end.setHours(23, 59, 59, 999);
            this.updateDashboard();
          }
        }
      });

      // Set initial range
      this.dateRange.start = startOfMonth;
      this.dateRange.end = today;
      this.dateRange.end.setHours(23, 59, 59, 999);
    }

    console.log('📊 Dashboard inicializado');
  },

  open() {
    if (this.modal) {
      this.modal.style.display = 'flex';
      this.loadData();
    }
  },

  close() {
    if (this.modal) this.modal.style.display = 'none';
  },

  // =========================================
  // CARGAR Y PROCESAR DATOS
  // =========================================
  async loadData() {
    if (!this.body) return;

    this.body.innerHTML = `
      <div class="dashboard-loading">
        <div class="loader-ring"></div>
        <span>Analizando datos...</span>
      </div>`;

    try {
      const result = await window.obtenerDatosFacturados();
      if (!result || !result.success) throw new Error('No se pudieron obtener los datos');

      this.allData = result.data;
      this.updateDashboard();
      this.isLoaded = true;
    } catch (e) {
      console.error('Dashboard error:', e);
      this.body.innerHTML = `
        <div class="dashboard-loading">
          <i class="fas fa-exclamation-triangle" style="font-size:2rem;color:#ef4444"></i>
          <span>${e.message}</span>
        </div>`;
    }
  },

  updateDashboard() {
    if (!this.allData || this.allData.length === 0) return;
    const stats = this.calcularEstadisticas(this.allData);
    this.renderDashboard(stats);
  },

  // =========================================
  // CÁLCULO DE ESTADÍSTICAS
  // =========================================
  calcularEstadisticas(data) {
    const stats = {
      totalFacturas: new Set(),
      totalUnidades: 0,
      totalValor: 0,
      entregadoFacturas: new Set(),
      entregadoUnidades: 0,
      entregadoValor: 0,
      pendienteFacturas: new Set(),
      pendienteUnidades: 0,
      pendienteValor: 0,
      porCliente: {},
      totalLotes: new Set(),
      ultimaFechaEntrega: null,
      fechaMasAntiguaPendiente: null,
      sumDiasPendiente: 0,
      countPendientesConFecha: 0
    };

    const clientColorMap = [
      '#2563eb', '#7c3aed', '#db2777', '#059669',
      '#d97706', '#dc2626', '#0891b2', '#6366f1'
    ];
    let colorIdx = 0;

    data.forEach(item => {
      const facturas = item.datosSiesa || (item.factura ? [item] : []);

      facturas.forEach(f => {
        // Filtro por fecha
        const fechaFactura = this.parseDate(f.fecha);
        if (this.dateRange.start && this.dateRange.end) {
          if (fechaFactura && (fechaFactura < this.dateRange.start || fechaFactura > this.dateRange.end)) {
            return; // Fuera de rango
          }
        }

        const factura = f.factura || '';
        const cantidad = parseFloat(f.cantidad) || 0;
        const valor = parseFloat(f.valorBruto) || 0;
        const esEntregado = f.confirmacion && f.confirmacion.includes('ENTREGADO');
        const clienteRaw = f.cliente || 'Sin cliente';
        const lote = f.lote || '';

        // Buscar nombre corto del cliente
        let clienteNombre = clienteRaw;
        if (typeof CLIENTS_MAP !== 'undefined') {
          for (const [nombre, nit] of Object.entries(CLIENTS_MAP)) {
            if (nombre === clienteRaw || nit === f.nit) {
              clienteNombre = nombre;
              break;
            }
          }
        }

        // Totales Generales
        stats.totalFacturas.add(factura);
        if (lote) stats.totalLotes.add(lote);
        stats.totalUnidades += cantidad;
        stats.totalValor += valor;

        // Entregados vs Pendientes
        if (esEntregado) {
          stats.entregadoFacturas.add(factura);
          stats.entregadoUnidades += cantidad;
          stats.entregadoValor += valor;

          if (fechaFactura) {
            if (!stats.ultimaFechaEntrega || fechaFactura > stats.ultimaFechaEntrega) {
              stats.ultimaFechaEntrega = fechaFactura;
            }
          }
        } else {
          stats.pendienteFacturas.add(factura);
          stats.pendienteUnidades += cantidad;
          stats.pendienteValor += valor;

          if (fechaFactura) {
            // Más antigua
            if (!stats.fechaMasAntiguaPendiente || fechaFactura < stats.fechaMasAntiguaPendiente) {
              stats.fechaMasAntiguaPendiente = fechaFactura;
            }

            // Días pendiente
            const dias = this.daysSince(f.fecha);
            stats.sumDiasPendiente += dias;
            stats.countPendientesConFecha++;
          }
        }

        // Por cliente
        if (!stats.porCliente[clienteNombre]) {
          stats.porCliente[clienteNombre] = {
            nombre: clienteNombre,
            color: clientColorMap[colorIdx % clientColorMap.length],
            totalFacturas: new Set(),
            totalUnidades: 0,
            totalValor: 0,
            entregadoFacturas: new Set(),
            entregadoUnidades: 0,
            entregadoValor: 0,
            pendientesDetalle: []
          };
          colorIdx++;
        }

        const cl = stats.porCliente[clienteNombre];
        cl.totalFacturas.add(factura);
        cl.totalUnidades += cantidad;
        cl.totalValor += valor;
        if (esEntregado) {
          cl.entregadoFacturas.add(factura);
          cl.entregadoUnidades += cantidad;
          cl.entregadoValor += valor;
        } else {
          cl.pendientesDetalle.push({
            factura: factura,
            fecha: f.fecha,
            valor: valor,
            cantidad: cantidad,
            referencia: f.referencia || 'N/A',
            lote: f.lote || 'N/A',
            dias: this.daysSince(f.fecha)
          });
        }
      });
    });

    return stats;
  },

  parseDate(dateStr) {
    if (!dateStr) return null;
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? null : d;
  },

  daysSince(dateStr) {
    const d = this.parseDate(dateStr);
    if (!d) return 0;
    const now = new Date();
    // Normalizar a medianoche para cálculo correcto de días calendario
    d.setHours(0, 0, 0, 0);
    now.setHours(0, 0, 0, 0);

    const diff = now - d;
    return Math.floor(diff / (1000 * 60 * 60 * 24));
  },

  // =========================================
  // EXPORTAR A CSV
  // =========================================
  exportToCSV() {
    if (!this.allData || this.allData.length === 0) {
      alert("No hay datos para exportar");
      return;
    }

    const rows = [
      ["Factura", "Fecha Factura", "Cliente", "NIT", "Lote", "Referencia", "Cantidad", "Valor", "Estado", "Días Diferencia", "IH3 (Evidencia)", "Fecha Entrega"]
    ];

    this.allData.forEach(item => {
      const facturas = item.datosSiesa || (item.factura ? [item] : []);

      facturas.forEach(f => {
        // Exportar TODOS los datos sin filtrar por fecha
        const esEntregado = f.confirmacion && f.confirmacion.includes('ENTREGADO');
        const diasDiff = this.daysSince(f.fecha);

        rows.push([
          f.factura || '',
          f.fecha || '',
          f.cliente || '',
          f.nit || '',
          f.lote || '',
          f.referencia || '',
          f.cantidad || 0,
          f.valorBruto || 0,
          esEntregado ? "ENTREGADO" : "PENDIENTE",
          diasDiff,
          f.Ih3 || '',
          f.fechaEntrega || ''
        ]);
      });
    });

    let csvContent = "data:text/csv;charset=utf-8,"
      + rows.map(e => e.join(";")).join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `reporte_dashboard_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  },

  // =========================================
  // RENDER DASHBOARD
  // =========================================
  renderDashboard(s) {
    const fmt = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0, maximumFractionDigits: 0 });
    const fmtNum = new Intl.NumberFormat('es-CO');

    // Cálculos para cards principales
    const entFact = s.entregadoFacturas.size;
    const pendFact = s.pendienteFacturas.size;
    const totalFact = s.totalFacturas.size;
    const pctEntregado = totalFact > 0 ? Math.round((entFact / totalFact) * 100) : 0;

    const diasPromedioPendiente = s.countPendientesConFecha > 0 ? Math.round(s.sumDiasPendiente / s.countPendientesConFecha) : 0;

    // Fechas formateadas
    const formatDate = (d) => d ? d.toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric' }) : 'N/A';
    const ultimaEntregaStr = formatDate(s.ultimaFechaEntrega);
    const masAntiguaStr = formatDate(s.fechaMasAntiguaPendiente);

    // Cálculos de Promedio Diario
    // Determinar días en el rango seleccionado
    const now = new Date();
    const start = this.dateRange.start || new Date(now.getFullYear(), now.getMonth(), 1);
    const end = this.dateRange.end || now;

    // Asegurar que end no sea futuro para el promedio si estamos filtrando
    const calcEnd = end > now ? now : end;
    const diffTime = Math.abs(calcEnd - start);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) || 1;

    // Promedios
    // Promedio de Facturas y Lotes
    // Si hay menos de 1 día, tomar como 1
    const daysDivisor = diffDays < 1 ? 1 : diffDays;

    const promFacturasDia = Math.round(entFact / daysDivisor);
    const promLotesDia = (s.totalLotes.size / daysDivisor).toFixed(1);
    const promValorDia = s.entregadoValor / daysDivisor;
    const promUnidadesDia = Math.round(s.entregadoUnidades / daysDivisor);

    const rangoStr = `${formatDate(start)} - ${formatDate(end)}`;

    // Renderizado de clientes
    const clientes = Object.values(s.porCliente).sort((a, b) => b.totalValor - a.totalValor);

    this.body.innerHTML = `
      <!-- TARJETAS RESUMEN DEL MES -->
      <div class="dash-summary-cards">
        
        <!-- CARD 1: FACTURAS ENTREGADAS -->
        <div class="summary-card card-entregadas">
            <div class="card-header-simple">
                <div class="card-icon-circle green"><i class="fas fa-check-double"></i></div>
                <span class="card-title">Facturas Entregadas</span>
            </div>
            <div class="card-main-value">${fmtNum.format(entFact)}</div>
            
            <div class="card-details-grid">
                <div class="detail-row">
                    <span class="lbl">Valor total:</span>
                    <span class="val highlight-green">${fmt.format(s.entregadoValor)}</span>
                </div>
                <div class="detail-row">
                    <span class="lbl">Unidades:</span>
                    <span class="val">${fmtNum.format(s.entregadoUnidades)}</span>
                </div>
                <div class="detail-row">
                    <span class="lbl">Porcentaje:</span>
                    <span class="val">${pctEntregado}%</span>
                </div>
            </div>
            
            <div class="card-footer-info">
                <i class="far fa-calendar-check"></i> Última entrega: ${ultimaEntregaStr}
            </div>
        </div>

        <!-- CARD 2: FACTURAS PENDIENTES -->
        <div class="summary-card card-pendientes">
            <div class="card-header-simple">
                <div class="card-icon-circle amber"><i class="fas fa-clock"></i></div>
                <span class="card-title">Facturas Pendientes</span>
            </div>
            <div class="card-main-value">${fmtNum.format(pendFact)}</div>
            
            <div class="card-details-grid">
                <div class="detail-row">
                    <span class="lbl">Valor pendiente:</span>
                    <span class="val highlight-amber">${fmt.format(s.pendienteValor)}</span>
                </div>
                <div class="detail-row">
                    <span class="lbl">Unidades:</span>
                    <span class="val">${fmtNum.format(s.pendienteUnidades)}</span>
                </div>
                <div class="detail-row">
                    <span class="lbl">Días promedio:</span>
                    <span class="val">${diasPromedioPendiente}</span>
                </div>
            </div>
            
            <div class="card-footer-info warning">
                <i class="far fa-calendar-times"></i> Más antigua: ${masAntiguaStr}
            </div>
        </div>

        <!-- CARD 3: PROMEDIO DIARIO -->
        <div class="summary-card card-promedio">
            <div class="card-header-simple">
                <div class="card-icon-circle blue"><i class="fas fa-chart-line"></i></div>
                <span class="card-title">Promedio Diario</span>
            </div>
            <div class="card-main-value">${promFacturasDia} <span class="sub-unit">fact/día</span></div>
            
            <div class="card-details-grid">
                <div class="detail-row">
                    <span class="lbl">Lotes por día:</span>
                    <span class="val">${promLotesDia}</span>
                </div>
                <div class="detail-row">
                    <span class="lbl">Valor promedio:</span>
                    <span class="val highlight-blue">${fmt.format(promValorDia)}</span>
                </div>
                <div class="detail-row">
                    <span class="lbl">Unidades por día:</span>
                    <span class="val">${fmtNum.format(promUnidadesDia)}</span>
                </div>
            </div>
            
            <div class="card-footer-info">
                <i class="far fa-calendar-alt"></i> ${rangoStr}
            </div>
        </div>

      </div>

      <!-- Barra de progreso en pesos (Simplificada) -->
      <div class="dash-progress-section" style="margin-top:-10px;">
        <div class="dash-progress-header">
          <span class="dash-progress-title"><i class="fas fa-wallet"></i> Valor Total del Periodo</span>
          <span class="dash-progress-pct">${pctEntregado}%</span>
        </div>
        <div class="dash-progress-bar">
          <div class="dash-progress-fill" style="width:${pctEntregado}%"></div>
        </div>
        <div class="dash-progress-labels">
            <span>Entregado: ${fmt.format(s.entregadoValor)}</span>
            <span>Total: ${fmt.format(s.totalValor)}</span>
        </div>
      </div>

      <!-- Detalles por Cliente (Unificado) -->
      <div class="dash-clients-section">
        <div class="dash-clients-header-row" style="display:flex; justify-content:space-between; align-items:center;">
             <div class="dash-clients-title" style="margin-bottom:0; border-bottom:none;">
                <i class="fas fa-users" style="color:#2563eb"></i> Detalles por Cliente
            </div>
            <button class="dash-csv-btn" onclick="window.Dashboard.exportToCSV()">
                <i class="fas fa-file-csv"></i> Exportar Datos
            </button>
        </div>
       
        <div class="dash-pending-list" style="display:flex; flex-direction:column; gap:12px; margin-top:16px;">
            ${clientes.map(cl => {
      const clPct = cl.totalUnidades > 0 ? Math.round((cl.entregadoUnidades / cl.totalUnidades) * 100) : 0;
      const initials = cl.nombre.split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase();
      const pendUn = cl.totalUnidades - cl.entregadoUnidades;
      const pendVal = cl.totalValor - cl.entregadoValor;

      // Preparar detalles de pendientes si existen
      let detallesHTML = '';
      if (cl.pendientesDetalle.length > 0) {
        cl.pendientesDetalle.sort((a, b) => b.dias - a.dias);
        detallesHTML = `
                        <div class="pend-body-inner">
                            <div class="pend-list-header">Facturas Pendientes (${cl.pendientesDetalle.length})</div>
                            ${cl.pendientesDetalle.map(p => `
                                <div class="pend-card-item">
                                    <div class="pend-card-top">
                                        <span class="pend-card-invoice">
                                            <i class="fas fa-file-invoice"></i> ${p.factura}
                                        </span>
                                        <span class="pend-card-age ${p.dias > 30 ? 'c-red' : (p.dias > 7 ? 'c-amber' : 'c-green')}">
                                            <i class="far fa-clock"></i> ${p.dias} días
                                        </span>
                                    </div>
                                    <div class="pend-card-center">
                                        <div class="pend-detail-chip">
                                            <span class="chip-label">Lote</span>
                                            <span class="chip-val">${p.lote}</span>
                                        </div>
                                        <div class="pend-detail-chip">
                                            <span class="chip-label">Ref</span>
                                            <span class="chip-val">${p.referencia}</span>
                                        </div>
                                    </div>
                                    <div class="pend-card-bottom">
                                        <div class="pend-detail-qty">
                                            <span class="qty-label">Cant:</span>
                                            <span class="qty-val">${fmtNum.format(p.cantidad)}</span>
                                        </div>
                                        <div class="pend-card-value">${fmt.format(p.valor)}</div>
                                    </div>
                                </div>
                            `).join('')}
                        </div>`;
      } else {
        detallesHTML = `
                        <div class="pend-body-inner" style="text-align:center; padding: 20px; color:#10b981;">
                            <i class="fas fa-check-circle" style="font-size: 2rem; margin-bottom: 8px;"></i>
                            <div>¡Todo entregado!</div>
                            <small style="color:#64748b">No hay facturas pendientes para este cliente</small>
                        </div>`;
      }

      return `
                <div class="pend-card" style="border-left: 4px solid ${cl.color}">
                    <div class="pend-header" onclick="this.nextElementSibling.classList.toggle('expanded'); this.querySelector('.fa-chevron-down').classList.toggle('rotated')">
                        <div style="flex:1; display:flex; gap:12px; align-items:center;">
                            <div class="dash-client-avatar" style="background:${cl.color}">${initials}</div>
                            <div style="flex:1; min-width:0;">
                                <div class="pend-client-name">${cl.nombre}</div>
                                <div class="dash-client-meta">
                                    ${cl.entregadoFacturas.size}/${cl.totalFacturas.size} fact · 
                                    <span style="${pendVal > 0 ? 'color:#ef4444; font-weight:600;' : 'color:#10b981;'}">
                                        ${pendVal > 0 ? 'Pend: ' + fmt.format(pendVal) : 'Completado'}
                                    </span>
                                </div>
                                <div class="dash-client-bar-mini" style="margin-top:6px; background:#f1f5f9; height:6px;">
                                    <div class="dash-client-bar-fill" style="width:${clPct}%; background:${cl.color}"></div>
                                </div>
                            </div>
                        </div>
                        <div style="display:flex; flex-direction:column; align-items:flex-end; gap:4px; margin-left:8px;">
                            <div class="dash-client-pct" style="font-size:0.9rem;">${clPct}%</div>
                            <i class="fas fa-chevron-down" style="font-size:0.8rem; color:#94a3b8; transition:transform 0.3s"></i>
                        </div>
                    </div>
                    <div class="pend-body">
                        ${detallesHTML}
                        ${pendVal > 0 ? `
                        <div class="pend-total">
                            <span>Total Pendiente:</span>
                            <span>${fmt.format(pendVal)}</span>
                        </div>` : ''}
                    </div>
                </div>`;
    }).join('') || '<span style="color:#94a3b8;font-size:0.8rem;text-align:center;">Sin datos para mostrar</span>'}
        </div>
      </div>
    `;

    // Actualizar footer
    const footerTime = document.getElementById('dashboardFooterTime');
    if (footerTime) {
      footerTime.textContent = new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });
    }
  },

  // Formato corto para valores grandes (ej: $12.5M)
  formateoCorto(valor) {
    if (valor >= 1e9) return '$' + (valor / 1e9).toFixed(1) + 'B';
    if (valor >= 1e6) return '$' + (valor / 1e6).toFixed(1) + 'M';
    if (valor >= 1e3) return '$' + (valor / 1e3).toFixed(0) + 'K';
    return '$' + valor.toFixed(0);
  }
};

// =========================================
// MEJORAR LA STATS BAR DEL GRID (soportesGridCount)
// =========================================
function actualizarGridStats(entregas) {
  const countEl = document.getElementById('soportesGridCount');
  if (!countEl || !entregas || entregas.length === 0) return;

  const fmt = new Intl.NumberFormat('es-CO');

  // Calcular totales
  let totalUnidades = 0;
  const clientes = {};
  const facturas = new Set();

  entregas.forEach(item => {
    const cant = parseFloat(item.cantidad) || 0;
    totalUnidades += cant;
    facturas.add(item.factura);

    const cl = item.cliente || 'Otro';
    if (!clientes[cl]) clientes[cl] = { unidades: 0, facturas: new Set() };
    clientes[cl].unidades += cant;
    clientes[cl].facturas.add(item.factura);
  });

  // Construir pills
  const statsRow = document.getElementById('soportesGridStatsRow');
  if (statsRow) {
    let pills = `
      <span class="dash-stats-pill primary">
        <i class="fas fa-file-invoice"></i> ${facturas.size} fact
      </span>
      <span class="dash-stats-pill success">
        <i class="fas fa-box"></i> ${fmt.format(totalUnidades)} uds
      </span>`;

    // Top 2 clientes como pills
    const topClientes = Object.entries(clientes)
      .sort((a, b) => b[1].unidades - a[1].unidades)
      .slice(0, 2);

    topClientes.forEach(([nombre, data]) => {
      const short = nombre.length > 12 ? nombre.substring(0, 10) + '…' : nombre;
      pills += `
        <span class="dash-stats-pill">
          <i class="fas fa-building"></i> ${short}: ${data.facturas.size}
        </span>`;
    });

    statsRow.innerHTML = pills;
  }

  // Actualizar el texto del counter original
  countEl.textContent = `${entregas.length} entregas`;
}

// =========================================
// INICIALIZACIÓN
// =========================================
document.addEventListener('DOMContentLoaded', () => {
  // Dashboard init
  Dashboard.init();
  window.Dashboard = Dashboard;

  // Interceptar updateStats del SoportesGrid para agregar nuestro enrichment
  const originalUpdateStats = window.SoportesGrid && window.SoportesGrid.updateStats;
  if (window.SoportesGrid) {
    const origRender = SoportesGrid.updateStats.bind(SoportesGrid);
    SoportesGrid.updateStats = function () {
      origRender();
      actualizarGridStats(this.filteredEntregas);
    };
  }
});
