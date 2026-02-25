/**
 * UI Capture and Sharing Logic
 * Matching backup.html exactly
 */

async function captureAndDownloadCards() {
    const cardsContainer = document.querySelector('.cards-container');
    const captureBtn = document.getElementById('captureBtn');
    const loadingOverlay = document.getElementById('loadingOverlay');
    const loadingText = document.getElementById('loadingText');

    try {
        if (loadingOverlay) loadingOverlay.classList.add('active');
        if (loadingText) loadingText.textContent = "Procesando informe visual...";
        if (captureBtn) captureBtn.classList.add('hidden');

        cardsContainer.classList.add('capture-mode');
        openAllCards();
        await new Promise(r => setTimeout(r, 1000));

        const canvas = await html2canvas(cardsContainer, {
            scale: 2,
            useCORS: true,
            logging: false,
            backgroundColor: "#f8f9fa",
            onclone: (doc) => {
                const clones = doc.querySelector('.cards-container');
                clones.style.padding = "20px";
                clones.style.maxWidth = "1200px";
            }
        });

        const imageData = canvas.toDataURL('image/png');
        const blob = await (await fetch(imageData)).blob();

        // Link download
        const link = document.createElement('a');
        link.href = imageData;
        link.download = `Informe_Ingresos_${formatDate(new Date()).replace(/\//g, '-')}.png`;
        link.click();

        // WhatsApp sharing logic
        const response = await uploadImageToDrive(imageData);
        if (response.success && response.url) {
            const message = generateWhatsAppMessage(response.url);
            openWhatsApp(message);
        } else {
            const message = generateWhatsAppMessage();
            openWhatsApp(message);
        }

    } catch (e) {
        console.error("Capture error:", e);
        alert("Error al generar el informe visual.");
    } finally {
        cardsContainer.classList.remove('capture-mode');
        if (captureBtn) captureBtn.classList.remove('hidden');
        if (loadingOverlay) loadingOverlay.classList.remove('active');
    }
}

function openAllCards() {
    document.querySelectorAll('.card-header').forEach(header => {
        const cardContent = header.nextElementSibling;
        const indicator = header.querySelector('.collapse-indicator');

        if (cardContent && !cardContent.classList.contains('expanded')) {
            cardContent.classList.add('expanded');
            if (indicator) indicator.classList.add('expanded');
        }
    });
}

// WhatsApp message - matching backup.html exactly
function generateWhatsAppMessage(imageUrl = "") {
    if (!currentReportData) return "";

    const diaData = currentReportData.dia.actual;
    const mesData = currentReportData.mes.actual;
    const fechaObj = parseDate(diaData.fecha);

    // Formatear fechas
    const dias = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
    const meses = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

    const diaNombre = dias[fechaObj.getDay()];
    const diaNumero = fechaObj.getDate();
    const mesNombre = meses[fechaObj.getMonth()];
    const año = fechaObj.getFullYear();

    // Datos de semanas
    const semanaActual = getWeekNumber(fechaObj);
    const semanaAnterior = semanaActual - 1 > 0 ? semanaActual - 1 : 52;

    // Preparar comparativo
    let comparativoAnterior = '';
    if (currentReportData.dia.anterior) {
        const fechaAnterior = parseDate(currentReportData.filtros.anterior);
        comparativoAnterior = `(vs ${fechaAnterior.getDate()} ${meses[fechaAnterior.getMonth()]} ${año - 1})`;
    }

    // Determinar flecha de gestión
    let flechaGestion = '';
    if (diaData.gestion) {
        const valorGestion = parseFloat(diaData.gestion);
        flechaGestion = valorGestion < 0 ? '↓' : '↑';
    }

    // Obtener la tendencia global
    const tendenciaGlobal = getGlobalTrend();
    let textoTendencia = '';

    switch (tendenciaGlobal) {
        case 'positive':
            textoTendencia = '↑ Tendencia a la alza';
            break;
        case 'negative':
            textoTendencia = '↓ Tendencia a la baja';
            break;
        default:
            textoTendencia = 'Tendencia Estable';
    }

    // Construir el mensaje base
    let mensaje = `¡Bendiciones para todos!

Adjunto el Cierre de Ingresos del Día:
\`${diaNombre}, ${diaNumero} de ${mesNombre} del ${año}\`

*${formatoCantidad(diaData.ingreso)}* unidades | Cumplimiento *${diaData.porcentaje}*
Meta: *${formatoCantidad(diaData.meta)}* ${comparativoAnterior}

${textoTendencia}

Muestra Semanal (S${semanaActual}/S${semanaAnterior}) Gestión ${flechaGestion} *${diaData.gestion || 'N/A'}*
* Promedio: *${formatoCantidad(diaData.promedio)}*
* Ponderado: *${formatoCantidad(diaData.ponderado)}*
* Desviación: *${formatoCantidad(diaData.desvest)}*
* Máximo: *${formatoCantidad(diaData.max)}*`;

    // Agregar enlaces
    mensaje += `\n\nEnlaces importantes:
☆ Link a la aplicación: https://andres1-dev.github.io/one/ingresos/informe/generar
☆ Link de ingresos vs despacho: https://andres1-dev.github.io/two/vs/index`;

    if (imageUrl) {
        mensaje += `\n★ Resumen visual: ${imageUrl}`;
    }

    // Cierre del mensaje
    mensaje += `\n\nQuedo atento a sus comentarios.`;

    return encodeURIComponent(mensaje);
}

// Función para abrir WhatsApp - compatible con iOS
function openWhatsApp(message) {
    const phoneNumber = "573168007979";
    const url = `https://wa.me/${phoneNumber}?text=${message}`;

    // Solución universal que funciona en iOS
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.target = '_blank';
    anchor.rel = 'noopener noreferrer';

    // Crear un evento de click confiable
    const event = document.createEvent('MouseEvents');
    event.initEvent('click', true, true);

    // Disparar el evento
    anchor.dispatchEvent(event);

    // Forzar apertura en iOS si aún no funciona
    setTimeout(() => {
        window.location.href = url;
    }, 500);
}

async function uploadImageToDrive(base64Image) {
    const webAppUrl = 'https://script.google.com/macros/s/AKfycbx7fU6_eYkE3gEqR-9B_Rk_X5Wj3YjYyYjYyYjYyYjY/exec';
    try {
        const response = await fetch(webAppUrl, {
            method: 'POST',
            body: JSON.stringify({ image: base64Image, folderId: '1_X_X_X_X_X_X_X_X_X_X_X_X_X_X' })
        });
        return await response.json();
    } catch (e) {
        return { success: false };
    }
}
