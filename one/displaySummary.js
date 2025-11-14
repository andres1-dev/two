function displaySummary(data) {
    const estados = currentData.reduce((acc, registro) => {
        const estado = registro.ESTADO || 'SIN DATOS';
        acc[estado] = (acc[estado] || 0) + 1;
        return acc;
    }, {});

    const validaciones = currentData.reduce((acc, registro) => {
        const clave = registro.VALIDACION ? 'VERDADERO' : 'FALSO';
        acc[clave] = (acc[clave] || 0) + 1;
        return acc;
    }, {});

    // Calcular estadísticas de semanas
    const conSemanas = currentData.filter(r => r.SEMANAS && r.SEMANAS !== "").length;
    const sinSemanas = currentData.length - conSemanas;

    // Calcular estadísticas por clase (LINEA, MODA, PRONTAMODA)
    const clases = currentData.reduce((acc, registro) => {
        const clase = registro.CLASE || 'SIN CLASE';
        acc[clase] = (acc[clase] || 0) + 1;
        return acc;
    }, {});

    // Calcular estadísticas por PVP (rangos)
    const pvpRanges = currentData.reduce((acc, registro) => {
        const pvp = registro.PVP || 0;
        if (pvp <= 39900) acc.LINEA = (acc.LINEA || 0) + 1;
        else if (pvp <= 59900) acc.MODA = (acc.MODA || 0) + 1;
        else if (pvp > 59900) acc.PRONTAMODA = (acc.PRONTAMODA || 0) + 1;
        return acc;
    }, {});

    // Calcular total de cantidad
    const totalCantidad = currentData.reduce((acc, registro) => acc + (registro.CANTIDAD || 0), 0);

    // Calcular porcentajes
    function calculatePercentage(part, total) {
        if (total === 0) return 0;
        return Math.round((part / total) * 100);
    }

    // Formatear números grandes
    function formatNumber(num) {
        return new Intl.NumberFormat('es-ES').format(num);
    }

    // Obtener el estado con mayor cantidad
    const estadoMayor = Object.entries(estados).reduce((max, [estado, count]) => 
        count > max.count ? {estado, count} : max, {estado: '', count: 0}
    );

    summaryElement.innerHTML = `
        <h3><i class="fas fa-chart-bar"></i> Resumen del Proceso</h3>
        <div class="summary-grid">
            <div class="summary-card">
                <h4><i class="fas fa-chart-pie"></i> Distribución por Estado y Clase</h4>
                <div class="dual-chart-container">
                    <div class="chart-section">
                        <h5>Estados</h5>
                        <div class="progress-bars-compact">
                            ${Object.entries(estados).map(([estado, count]) => {
                                const porcentaje = calculatePercentage(count, currentData.length);
                                const claseEstado = estado.toLowerCase().replace(/\s+/g, '-');
                                return `
                                    <div class="progress-compact-item">
                                        <div class="progress-compact-info">
                                            <span class="progress-label-compact">${estado}</span>
                                            <span class="progress-count">${count}</span>
                                            <span class="progress-percentage">${porcentaje}%</span>
                                        </div>
                                        <div class="progress-bar-compact">
                                            <div class="progress-fill-compact progress-estado-${claseEstado}" style="width: ${porcentaje}%"></div>
                                        </div>
                                    </div>
                                `;
                            }).join('')}
                        </div>
                    </div>
                    <div class="chart-section">
                        <h5>Clases por PVP</h5>
                        <div class="pvp-chart-container">
                            <div class="pvp-chart">
                                <div class="pvp-bar-container">
                                    <div class="pvp-bar-label">LÍNEA</div>
                                    <div class="pvp-bar-wrapper">
                                        <div class="pvp-bar" style="width: ${calculatePercentage(pvpRanges.LINEA || 0, currentData.length)}%">
                                            <span class="pvp-bar-value">${pvpRanges.LINEA || 0}</span>
                                        </div>
                                    </div>
                                    <div class="pvp-percentage">${calculatePercentage(pvpRanges.LINEA || 0, currentData.length)}%</div>
                                </div>
                                <div class="pvp-bar-container">
                                    <div class="pvp-bar-label">MODA</div>
                                    <div class="pvp-bar-wrapper">
                                        <div class="pvp-bar pvp-moda" style="width: ${calculatePercentage(pvpRanges.MODA || 0, currentData.length)}%">
                                            <span class="pvp-bar-value">${pvpRanges.MODA || 0}</span>
                                        </div>
                                    </div>
                                    <div class="pvp-percentage">${calculatePercentage(pvpRanges.MODA || 0, currentData.length)}%</div>
                                </div>
                                <div class="pvp-bar-container">
                                    <div class="pvp-bar-label">PRONTAMODA</div>
                                    <div class="pvp-bar-wrapper">
                                        <div class="pvp-bar pvp-prontamoda" style="width: ${calculatePercentage(pvpRanges.PRONTAMODA || 0, currentData.length)}%">
                                            <span class="pvp-bar-value">${pvpRanges.PRONTAMODA || 0}</span>
                                        </div>
                                    </div>
                                    <div class="pvp-percentage">${calculatePercentage(pvpRanges.PRONTAMODA || 0, currentData.length)}%</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            
            <div class="summary-card">
                <h4><i class="fas fa-calendar-week"></i> Asignación de Semanas</h4>
                <div class="semanas-stats">
                    <div class="semanas-metric">
                        <div class="semanas-number">${conSemanas}</div>
                        <div class="semanas-label">Con semanas</div>
                    </div>
                    <div class="semanas-metric">
                        <div class="semanas-number sin-semanas">${sinSemanas}</div>
                        <div class="semanas-label">Sin semanas</div>
                    </div>
                </div>
                <div class="chart-container">
                    <div class="chart">
                        <div class="chart-circle" style="background: conic-gradient(#10b981 0% ${calculatePercentage(conSemanas, currentData.length)}%, #e5e7eb ${calculatePercentage(conSemanas, currentData.length)}% 100%);">
                            <div class="chart-value">${calculatePercentage(conSemanas, currentData.length)}%</div>
                        </div>
                        <div class="chart-label">Progreso</div>
                    </div>
                </div>
                <div class="semanas-detail">
                    <div class="detail-item">
                        <span class="detail-label">Porcentaje completado:</span>
                        <span class="detail-value">${calculatePercentage(conSemanas, currentData.length)}%</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Total por asignar:</span>
                        <span class="detail-value">${sinSemanas} registros</span>
                    </div>
                </div>
            </div>
            
            <div class="summary-card">
                <h4><i class="fas fa-check-circle"></i> Validaciones</h4>
                <div class="validation-container">
                    <div class="validation-metric">
                        <div class="validation-number valid">${validaciones.VERDADERO || 0}</div>
                        <div class="validation-label">Validados</div>
                        <div class="validation-percentage">${calculatePercentage(validaciones.VERDADERO || 0, currentData.length)}%</div>
                    </div>
                    <div class="validation-metric">
                        <div class="validation-number invalid">${validaciones.FALSO || 0}</div>
                        <div class="validation-label">No validados</div>
                        <div class="validation-percentage">${calculatePercentage(validaciones.FALSO || 0, currentData.length)}%</div>
                    </div>
                </div>
                <div class="validation-chart">
                    <div class="validation-bar">
                        <div class="validation-fill valid-fill" style="width: ${calculatePercentage(validaciones.VERDADERO || 0, currentData.length)}%"></div>
                        <div class="validation-fill invalid-fill" style="width: ${calculatePercentage(validaciones.FALSO || 0, currentData.length)}%"></div>
                    </div>
                </div>
                <div class="validation-summary">
                    <div class="summary-item">
                        <i class="fas fa-check-circle" style="color: #10b981;"></i>
                        <span>Tasa de validación: ${calculatePercentage(validaciones.VERDADERO || 0, currentData.length)}%</span>
                    </div>
                </div>
            </div>
            
            <div class="summary-card">
                <h4><i class="fas fa-tachometer-alt"></i> Métricas Generales</h4>
                <div class="metrics-grid">
                    <div class="metric-card">
                        <div class="metric-value">${formatNumber(currentData.length)}</div>
                        <div class="metric-label">Total Registros</div>
                    </div>
                    <div class="metric-card">
                        <div class="metric-value">${formatNumber(totalCantidad)}</div>
                        <div class="metric-label">Total Cantidad</div>
                    </div>
                    <div class="metric-card">
                        <div class="metric-value">${estadoMayor.count}</div>
                        <div class="metric-label">${estadoMayor.estado}</div>
                    </div>
                    <div class="metric-card">
                        <div class="metric-value">${Object.keys(clases).length}</div>
                        <div class="metric-label">Clases Únicas</div>
                    </div>
                </div>
                <div class="general-info">
                    <div class="info-item">
                        <i class="fas fa-calendar"></i>
                        <span>${data.rangoFechas.descripcion}</span>
                    </div>
                    <div class="info-item">
                        <i class="fas fa-bolt" style="color: #10b981;"></i>
                        <span>Proceso: ${data.status}</span>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    summaryElement.style.display = 'block';
}