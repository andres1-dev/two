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
    jsonContent.textContent = '{\n  "mensaje": "Genera un JSON desde el Editor OP"\n}';

    // Ocultar botón de guardar
    const saveBtnToolbar = document.getElementById('saveBtnToolbar');
    if (saveBtnToolbar) saveBtnToolbar.style.display = 'none';

    const saveBtn = document.getElementById('saveBtn');
    if (saveBtn) saveBtn.style.display = 'none';

    // Ocultar badge
    const badge = document.getElementById('jsonViewerBadge');
    if (badge) badge.style.display = 'none';

    showMessage('Editor limpiado', 'info', 1500);
}

// ============================================
// VISOR JSON INTEGRADO (COLAPSABLE)
// ============================================

/**
 * Toggle del visor JSON colapsable
 */
function toggleJsonViewer() {
    const body = document.getElementById('jsonViewerBody');
    const icon = document.getElementById('jsonViewerToggleIcon');

    if (!body || !icon) return;

    const isExpanded = body.style.display !== 'none';

    if (isExpanded) {
        body.style.display = 'none';
        icon.style.transform = 'rotate(0deg)';
    } else {
        body.style.display = 'block';
        icon.style.transform = 'rotate(90deg)';
    }
}

/**
 * Muestra y expande automáticamente el visor JSON
 * Se llama después de generar un JSON exitosamente
 */
function showJsonViewer() {
    const section = document.getElementById('jsonViewerSection');
    const body = document.getElementById('jsonViewerBody');
    const icon = document.getElementById('jsonViewerToggleIcon');
    const badge = document.getElementById('jsonViewerBadge');

    if (section) section.style.display = 'block';

    // Expandir automáticamente
    if (body) body.style.display = 'block';
    if (icon) icon.style.transform = 'rotate(90deg)';

    // Mostrar badge de "Listo"
    if (badge) {
        badge.style.display = 'inline-block';
        badge.textContent = 'Listo para guardar';
        badge.style.background = 'var(--success)';
    }

    // Scroll suave hacia la sección
    setTimeout(() => {
        if (section) {
            section.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
    }, 100);
}

/**
 * Colapsa y oculta el visor JSON
 * Se llama después de resetear la UI post-guardado
 */
function collapseJsonViewer() {
    const section = document.getElementById('jsonViewerSection');
    const body = document.getElementById('jsonViewerBody');
    const icon = document.getElementById('jsonViewerToggleIcon');
    const badge = document.getElementById('jsonViewerBadge');
    const saveBtnToolbar = document.getElementById('saveBtnToolbar');

    if (body) body.style.display = 'none';
    if (icon) icon.style.transform = 'rotate(0deg)';
    if (section) section.style.display = 'none';
    if (badge) badge.style.display = 'none';
    if (saveBtnToolbar) saveBtnToolbar.style.display = 'none';
}