function formatJSON() {
    const jsonContent = document.getElementById('jsonContent');
    try {
        const jsonData = JSON.parse(jsonContent.textContent);
        const jsonStr = JSON.stringify(jsonData, null, 2);
        jsonContent.innerHTML = syntaxHighlightJSON(jsonStr);
        showMessage('JSON formateado y resaltado', 'success', 1500);
    } catch (e) {
        showMessage('Error al formatear JSON: ' + e.message, 'error', 2000);
    }
}

function copyJSON() {
    const jsonContent = document.getElementById('jsonContent');
    // Usar textContent para obtener el JSON puro sin etiquetas HTML de resaltado
    navigator.clipboard.writeText(jsonContent.textContent).then(() => {
        showMessage('JSON copiado al portapapeles', 'success', 1500);
    }).catch(() => {
        showMessage('Error al copiar JSON', 'error', 2000);
    });
}

function clearJSON() {
    const jsonContent = document.getElementById('jsonContent');
    jsonContent.innerHTML = syntaxHighlightJSON({ "mensaje": "Genera un JSON desde el Editor OP" });

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

/**
 * Aplica resaltado de sintaxis HTML a una cadena JSON
 */
function syntaxHighlightJSON(json) {
    if (typeof json !== 'string') {
        json = JSON.stringify(json, undefined, 2);
    }

    // Escapar caracteres HTML básicos
    json = json.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

    // Expresión regular para encontrar tokens JSON
    return json.replace(/("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g, function (match) {
        let cls = 'json-number';
        if (/^"/.test(match)) {
            if (/:$/.test(match)) {
                cls = 'json-key';
            } else {
                cls = 'json-string';
            }
        } else if (/true|false/.test(match)) {
            cls = 'json-boolean';
        } else if (/null/.test(match)) {
            cls = 'json-null';
        }

        if (cls === 'json-key') {
            return '<span class="' + cls + '">' + match.slice(0, -1) + '</span>:';
        }

        return '<span class="' + cls + '">' + match + '</span>';
    });
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
