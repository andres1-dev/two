function parseCSV(csvContent) {
    const rows = [];
    const lines = csvContent.split('\n');

    for (let line of lines) {
        line = line.trim();
        if (!line) continue;

        const columns = [];
        let current = '';
        let inQuotes = false;

        for (let i = 0; i < line.length; i++) {
            const char = line[i];

            if (char === '"') {
                inQuotes = !inQuotes;
            } else if (char === ';' && !inQuotes) {
                columns.push(current.trim());
                current = '';
            } else {
                current += char;
            }
        }

        columns.push(current.trim());
        rows.push(columns);
    }

    return rows;
}

function exportToCSV(data, filename = 'datos_procesados') {
    if (!data || data.length === 0) {
        throw new Error('No hay datos para exportar');
    }

    const headers = [
        'REFERENCIA', 'USUARIO', 'OP', 'TIPO', 'FECHA', 'TRASLADO',
        'CANTIDAD', 'COSTO', 'TOTAL', 'PVP', 'TALLA', 'COLORES', 'COD_COLOR', 'OS', 'BODEGA',
        'TALLER', 'DESCRIPCION_LARGA', 'PRENDA', 'LINEA', 'GENERO', 'CC', 'ESTADO', 'MARCA', 'CLASE', 'DESCRIPCION'
    ];

    let csvContent = '\uFEFF' + headers.join(';') + '\n';

    data.forEach(item => {
        const row = headers.map(header => {
            let value = item[header] || '';
            if (typeof value === 'string' && (value.includes(';') || value.includes('"') || value.includes('\n'))) {
                value = '"' + value.replace(/"/g, '""') + '"';
            }
            return value;
        }).join(';');
        csvContent += row + '\n';
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    const timestamp = new Date().toISOString().split('T')[0];

    link.setAttribute('href', url);
    link.setAttribute('download', `${filename}_${timestamp}.csv`);
    link.style.visibility = 'hidden';

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    return true;
}