function print_buscarPorREC() {
    let recBuscado = document.getElementById("printRecInput").value;
    if (!recBuscado) {
        document.getElementById("printResultContainer").innerHTML = "<p>Ingrese un documento para buscar.</p>";
        return;
    }

    // Verificar si es una búsqueda múltiple
    if (recBuscado.includes(',')) {
        print_buscarMultiplesRECs();
        return;
    }

    if (!window.printingDatosGlobales) {
        document.getElementById("printResultContainer").innerHTML = "<p>Datos no cargados. Por favor espere o recargue la página.</p>";
        return;
    }

    let resultado = window.printingDatosGlobales.find(item => item.REC == recBuscado);

    if (resultado) {
        // Verificar si tiene colaborador asignado
        if (!resultado.COLABORADOR || resultado.COLABORADOR.trim() === "") {
            document.getElementById("printResultContainer").innerHTML = `
                <div style="color: var(--error); padding: 1rem; border-radius: 6px; border: 1px solid var(--error);">
                    <p><strong>No se puede imprimir:</strong> El documento ${recBuscado} no tiene colaborador/responsable asignado.</p>
                    <p>Por favor, asigne un colaborador en la hoja DATA antes de imprimir.</p>
                </div>
            `;
            return;
        }

        // Abrir plantilla principal solamente (petición usuario)
        print_abrirPlantillaImpresion(resultado, {
            modo: 'completo',
            soloImpresionPrincipal: true
        });

        // Nota: Se ha desactivado la impresión automática de todos los clientes individuales
        // para cumplir con el requerimiento de "solo módulo principal".
        /*
        if (resultado.DISTRIBUCION && resultado.DISTRIBUCION.Clientes) {
            const clientes = Object.keys(resultado.DISTRIBUCION.Clientes);
            clientes.forEach(cliente => {
                print_abrirPlantillaImpresion(resultado, {
                    modo: 'cliente',
                    clienteNombre: cliente
                });
            });
        }
        */

        document.getElementById("printResultContainer").innerHTML = `
            <div style="color: var(--success); padding: 1rem; border-radius: 6px; border: 1px solid var(--success);">
                <p>Documento ${recBuscado} encontrado. Se abrió la plantilla de impresión.</p>
                <p>Colaborador asignado: <strong>${resultado.COLABORADOR}</strong></p>
            </div>
        `;
    } else {
        document.getElementById("printResultContainer").innerHTML = `<div style="color: var(--warning); padding: 1rem;"><p>No se encontró el documento ${recBuscado}.</p></div>`;
    }
}

function print_mostrarOpcionesImpresion() {
    let recBuscado = document.getElementById("printRecInput").value;
    if (!recBuscado) {
        document.getElementById("printResultContainer").innerHTML = "<p>Ingrese un documento para buscar.</p>";
        return;
    }

    if (recBuscado.includes(',')) {
        document.getElementById("printResultContainer").innerHTML = `
            <div style="color: var(--error); padding: 1rem; border-radius: 6px;">
                <p>Esta función solo funciona con un documento a la vez.</p>
            </div>
        `;
        return;
    }

    if (!window.printingDatosGlobales) return;
    let resultado = window.printingDatosGlobales.find(item => item.REC == recBuscado);

    if (!resultado) {
        document.getElementById("printResultContainer").innerHTML = "<p>No se encontró el documento especificado.</p>";
        return;
    }

    if (!resultado.COLABORADOR || resultado.COLABORADOR.trim() === "") {
        document.getElementById("printResultContainer").innerHTML = `
            <div style="color: var(--error); padding: 1rem; border-radius: 6px;">
                <p><strong>No se puede imprimir:</strong> El documento ${recBuscado} no tiene colaborador/responsable asignado.</p>
            </div>
        `;
        return;
    }

    // Crear interfaz de selección mejorada con estilos VS Code
    let html = `
        <div class="editor-section" style="border: 1px solid var(--border); border-radius: 6px; padding: 1rem; margin-top: 1rem;">
            <div class="section-header" style="margin-bottom: 1rem; padding-bottom: 0.5rem;">
                <h4 style="margin: 0;">Opciones de impresión para REC${recBuscado}</h4>
            </div>
            <div class="section-content">
                <div style="margin-bottom: 1rem;">
                    <div class="btn-group" style="margin-bottom: 1rem; display: flex; gap: 0.5rem;">
                        <button onclick="print_seleccionarTodasOpciones(true)" class="btn-primary" style="padding: 0.25rem 0.5rem; font-size: 0.85rem;">
                            <i class="codicon codicon-check-all"></i> Seleccionar todo
                        </button>
                        <button onclick="print_seleccionarTodasOpciones(false)" class="btn-secondary" style="padding: 0.25rem 0.5rem; font-size: 0.85rem;">
                            <i class="codicon codicon-clear-all"></i> Deseleccionar todo
                        </button>
                    </div>
                    <label style="display: block; margin-bottom: 0.5rem; font-weight: 500;">Seleccione qué imprimir:</label>
                    <div style="display: flex; flex-direction: column; gap: 0.5rem;">
                        <label style="display: flex; align-items: center; gap: 0.5rem; cursor: pointer;">
                            <input type="checkbox" id="impPrincipal" class="opcion-impresion">
                            Plantilla Principal
                        </label>`;

    // Agregar opciones para cada cliente si existen
    if (resultado.DISTRIBUCION && resultado.DISTRIBUCION.Clientes) {
        const clientes = Object.keys(resultado.DISTRIBUCION.Clientes);
        clientes.forEach(cliente => {
            html += `
                        <label style="display: flex; align-items: center; gap: 0.5rem; cursor: pointer;">
                            <input type="checkbox" id="impCliente_${cliente.replace(/\s+/g, '_')}" class="opcion-impresion">
                            Cliente: ${cliente}
                        </label>`;
        });
    }

    html += `
                    </div>
                </div>
                <div class="btn-group" style="display: flex; gap: 0.5rem;">
                    <button onclick="print_confirmarImpresionSelectiva('${recBuscado}')" class="btn-primary">
                        <i class="codicon codicon-print"></i> Imprimir Selección
                    </button>
                    <button onclick="document.getElementById('printResultContainer').innerHTML = ''" class="btn-secondary">
                        <i class="codicon codicon-close"></i> Cancelar
                    </button>
                </div>
            </div>
        </div>`;

    document.getElementById("printResultContainer").innerHTML = html;
}

// Nueva función para seleccionar/deseleccionar todas las opciones
function print_seleccionarTodasOpciones(seleccionar) {
    const checkboxes = document.querySelectorAll('.opcion-impresion');
    checkboxes.forEach(checkbox => {
        checkbox.checked = seleccionar;
    });
}

function print_confirmarImpresionSelectiva(recBuscado) {
    if (!window.printingDatosGlobales) return;
    const resultado = window.printingDatosGlobales.find(item => item.REC == recBuscado);
    if (!resultado) return;

    // Verificar si al menos una opción está seleccionada
    const checkboxes = document.querySelectorAll('.opcion-impresion:checked');
    if (checkboxes.length === 0) {
        alert("Por favor seleccione al menos una opción para imprimir");
        return;
    }

    // Obtener opciones seleccionadas
    const impPrincipal = document.getElementById("impPrincipal").checked;

    // Imprimir plantilla principal si está seleccionada
    if (impPrincipal) {
        print_abrirPlantillaImpresion(resultado, {
            modo: 'completo',
            soloImpresionPrincipal: true
        });
    }

    // Imprimir plantillas de clientes seleccionados
    if (resultado.DISTRIBUCION && resultado.DISTRIBUCION.Clientes) {
        const clientes = Object.keys(resultado.DISTRIBUCION.Clientes);
        clientes.forEach(cliente => {
            const checkbox = document.getElementById(`impCliente_${cliente.replace(/\s+/g, '_')}`);
            if (checkbox && checkbox.checked) {
                print_abrirPlantillaImpresion(resultado, {
                    modo: 'cliente',
                    clienteNombre: cliente
                });
            }
        });
    }

    // Mostrar confirmación
    document.getElementById("printResultContainer").innerHTML = `
        <div style="color: var(--success); padding: 1rem; border-radius: 6px; border: 1px solid var(--success);">
            <p>Documento ${recBuscado} - Impresión iniciada para las opciones seleccionadas.</p>
            <p>Total de plantillas generadas: ${checkboxes.length}</p>
        </div>
    `;
}

function print_buscarMultiplesRECs() {
    let recsInput = document.getElementById("printRecInput").value;
    if (!recsInput) {
        document.getElementById("printResultContainer").innerHTML = "<p>Ingrese uno o más documentos para buscar.</p>";
        return;
    }

    // Separar los RECs por comas y limpiar espacios
    let recsArray = recsInput.split(',')
        .map(rec => rec.trim())
        .filter(rec => rec !== '');

    if (recsArray.length === 0) {
        document.getElementById("printResultContainer").innerHTML = "<p>No se ingresaron documentos válidos.</p>";
        return;
    }

    if (!window.printingDatosGlobales) return;

    document.getElementById("printResultContainer").innerHTML = `<p>Buscando ${recsArray.length} documento(s)...</p>`;

    let foundCount = 0;

    // Buscar cada REC y abrir solo la plantilla principal
    recsArray.forEach(rec => {
        let resultado = window.printingDatosGlobales.find(item => item.REC == rec);

        if (resultado) {
            // Usamos modo: 'completo' pero con soloImpresionPrincipal: true para mostrar todas las distribuciones
            print_abrirPlantillaImpresion(resultado, {
                modo: 'completo',
                soloImpresionPrincipal: true
            });
            document.getElementById("printResultContainer").innerHTML += `<p style="color: var(--success);">✔ REC ${rec} encontrado. Se abrió la plantilla principal.</p>`;
            foundCount++;
        } else {
            document.getElementById("printResultContainer").innerHTML += `<p style="color: var(--error);">❌ No se encontró el documento ${rec}.</p>`;
        }
    });

    if (foundCount > 0) {
        document.getElementById("printResultContainer").innerHTML += `<p><strong>Proceso finalizado.</strong></p>`;
    }
}

function print_imprimirSoloClientes() {
    let recBuscado = document.getElementById("printRecInput").value;
    if (!recBuscado) {
        document.getElementById("printResultContainer").innerHTML = "<p>Ingrese un documento para buscar.</p>";
        return;
    }

    // Verificar si es una búsqueda múltiple
    if (recBuscado.includes(',')) {
        document.getElementById("printResultContainer").innerHTML = `
            <div style="color: var(--error); padding: 1rem; border-radius: 6px;">
                <p>Esta función solo funciona con un documento a la vez.</p>
            </div>
        `;
        return;
    }

    if (!window.printingDatosGlobales) return;
    let resultado = window.printingDatosGlobales.find(item => item.REC == recBuscado);

    if (resultado) {
        // Verificar si tiene colaborador asignado
        if (!resultado.COLABORADOR || resultado.COLABORADOR.trim() === "") {
            document.getElementById("printResultContainer").innerHTML = `
                <div style="color: var(--error); padding: 1rem; border-radius: 6px;">
                    <p><strong>No se puede imprimir:</strong> El documento ${recBuscado} no tiene colaborador/responsable asignado.</p>
                </div>
            `;
            return;
        }

        // Verificar si tiene clientes asignados
        if (!resultado.DISTRIBUCION || !resultado.DISTRIBUCION.Clientes || Object.keys(resultado.DISTRIBUCION.Clientes).length === 0) {
            document.getElementById("printResultContainer").innerHTML = `
                <div style="color: var(--error); padding: 1rem; border-radius: 6px;">
                    <p><strong>No se puede imprimir:</strong> El documento ${recBuscado} no tiene clientes asignados.</p>
                </div>
            `;
            return;
        }

        // Abrir solo las plantillas de clientes
        const clientes = Object.keys(resultado.DISTRIBUCION.Clientes);
        clientes.forEach(cliente => {
            print_abrirPlantillaImpresion(resultado, {
                modo: 'cliente',
                clienteNombre: cliente
            });
        });

        document.getElementById("printResultContainer").innerHTML = `
            <div style="color: var(--success); padding: 1rem; border-radius: 6px; border: 1px solid var(--success);">
                <p>Documento ${recBuscado} - Impresión iniciada para:</p>
                <ul>
                    ${clientes.map(cliente => `<li>${cliente}</li>`).join('')}
                </ul>
                <p>Total clientes: <strong>${clientes.length}</strong></p>
            </div>
        `;
    } else {
        document.getElementById("printResultContainer").innerHTML = "<p>No se encontró el documento especificado.</p>";
    }
}
