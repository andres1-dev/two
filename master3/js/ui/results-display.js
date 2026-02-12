function displayResultsSummary(data) {
    const resultsContent = document.getElementById('resultsContent');

    const pendientes = data.filter(item => item.ESTADO === 'PENDIENTE');
    const unidadesPendientes = pendientes.reduce((sum, item) => sum + item.CANTIDAD, 0);
    const opsPendientes = [...new Set(pendientes.map(item => item.OP))];

    const confirmados = data.filter(item => item.ESTADO === 'CONFIRMADA');
    const unidadesConfirmadas = confirmados.reduce((sum, item) => sum + item.CANTIDAD, 0);
    const totalUnidades = data.reduce((sum, item) => sum + item.CANTIDAD, 0);

    resultsContent.innerHTML = `
        <div class="results-grid">
            <div class="result-card">
                <div class="result-icon success"><i class="codicon codicon-symbol-numeric"></i></div>
                <div class="result-info">
                    <div class="result-value">${data.length}</div>
                    <div class="result-label">Total Registros</div>
                </div>
            </div>
            <div class="result-card">
                <div class="result-icon info"><i class="codicon codicon-check"></i></div>
                <div class="result-info">
                    <div class="result-value">${confirmados.length}</div>
                    <div class="result-label">Confirmados</div>
                </div>
            </div>
            <div class="result-card">
                <div class="result-icon warning"><i class="codicon codicon-warning"></i></div>
                <div class="result-info">
                    <div class="result-value">${pendientes.length}</div>
                    <div class="result-label">Pendientes</div>
                </div>
            </div>
            <div class="result-card">
                <div class="result-icon error"><i class="codicon codicon-symbol-array"></i></div>
                <div class="result-info">
                    <div class="result-value">${unidadesPendientes}</div>
                    <div class="result-label">Unidades Pend.</div>
                </div>
            </div>
        </div>
        <div class="results-details">
            <div class="detail-item">
                <i class="codicon codicon-symbol-enum"></i>
                <span><strong>${opsPendientes.length} OPs únicas pendientes</strong> de procesar</span>
            </div>
            <div class="detail-item">
                <i class="codicon codicon-symbol-numeric"></i>
                <span><strong>${totalUnidades}</strong> unidades totales procesadas</span>
            </div>
        </div>
    `;
}

function setupPendientesSection(pendientes) {
    const selectOP = document.getElementById('selectOP');
    selectOP.innerHTML = '<option value="">Seleccione una OP...</option>';

    const opGroups = {};
    pendientes.forEach(item => {
        if (!opGroups[item.OP]) {
            opGroups[item.OP] = { cantidad: 0, total: parseInt(item.TOTAL) || 0, items: [] };
        }
        opGroups[item.OP].cantidad += item.CANTIDAD;
        opGroups[item.OP].items.push(item);
    });

    Object.keys(opGroups).forEach(op => {
        const grupo = opGroups[op];
        const diferencia = grupo.total - grupo.cantidad;

        const option = document.createElement('option');
        option.value = op;

        const itemPrincipal = getRepresentativeItem(grupo.items);
        const tieneSispro = sisproMap.has(op.trim());
        const tieneColor = !itemPrincipal.COD_COLOR || coloresMap.has(itemPrincipal.COD_COLOR.trim());

        let estadoIcono = diferencia === 0 ? '✓ ' : '';

        if (!tieneSispro || !tieneColor) {
            option.disabled = true;
            option.textContent = `✗ OP: ${op} - DESHABILITADA - Datos incompletos`;
            option.style.color = '#f44747';
            option.style.fontStyle = 'italic';
        } else {
            const diferenciaTexto = diferencia !== 0 ? ` ${diferencia > 0 ? '-' : '+'}${Math.abs(diferencia)}` : '';
            option.textContent = `${estadoIcono}OP: ${op} | FECHA: ${itemPrincipal.FECHA} | REFPROV: ${itemPrincipal.REFERENCIA} | ${itemPrincipal.PRENDA} | USUARIO: ${itemPrincipal.USUARIO} | PROGRESO: ${grupo.cantidad}/${grupo.total}${diferenciaTexto}`;
        }

        option.dataset.items = JSON.stringify(grupo.items);
        selectOP.appendChild(option);
    });
}