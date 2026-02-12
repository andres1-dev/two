function formatJSON() {
    const jsonContent = document.getElementById('jsonContent');
    try {
        const jsonData = JSON.parse(jsonContent.textContent);
        jsonContent.textContent = JSON.stringify(jsonData, null, 2);
        showMessage('JSON formateado correctamente', 'success', 1500);
    } catch (e) {
        showMessage('Error al formatear JSON: ' + e.message, 'error', 2000);
    }
}

function copyJSON() {
    const jsonContent = document.getElementById('jsonContent');
    navigator.clipboard.writeText(jsonContent.textContent).then(() => {
        showMessage('JSON copiado al portapapeles', 'success', 1500);
    }).catch(() => {
        showMessage('Error al copiar JSON', 'error', 2000);
    });
}

function clearJSON() {
    const jsonContent = document.getElementById('jsonContent');
    jsonContent.textContent = '{\n  "mensaje": "Genera un JSON desde la pestaña de OPs Pendientes"\n}';
    showMessage('Editor limpiado', 'info', 1500);
}