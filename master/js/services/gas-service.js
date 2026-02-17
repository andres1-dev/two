function saveOPToSheets(jsonData) {
    return new Promise((resolve, reject) => {
        const formData = new URLSearchParams();
        formData.append('action', 'guardarOP');
        formData.append('datos', JSON.stringify(jsonData));

        const xhr = new XMLHttpRequest();
        xhr.open('POST', GAS_URL, true);
        xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');

        xhr.onload = function () {
            if (xhr.status === 200) {
                try {
                    const response = JSON.parse(xhr.responseText);
                    resolve(response);
                } catch (e) {
                    reject(new Error('Error al procesar respuesta del servidor'));
                }
            } else {
                reject(new Error(`Error HTTP ${xhr.status}`));
            }
        };

        xhr.onerror = function () {
            reject(new Error('Error de conexión con Google Apps Script'));
        };

        xhr.ontimeout = function () {
            reject(new Error('Timeout de conexión'));
        };

        xhr.timeout = 30000;
        xhr.send(formData);
    });
}

function sendToDistributionGAS(data) {
    return new Promise((resolve) => {
        const xhr = new XMLHttpRequest();
        xhr.open('POST', DISTRIBUTION_GAS_URL, true);
        xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
        xhr.timeout = 10000;

        xhr.onload = function () {
            console.log('GAS respondió (ignorando contenido):', xhr.status);
            resolve({ success: true, message: 'Datos enviados al servidor', httpStatus: xhr.status });
        };

        xhr.onerror = function () {
            console.log('Error de conexión con GAS (ignorado)');
            resolve({ success: true, message: 'Datos enviados (error de conexión ignorado)' });
        };

        xhr.ontimeout = function () {
            console.log('Timeout con GAS (ignorado)');
            resolve({ success: true, message: 'Datos enviados (timeout ignorado)' });
        };

        const params = new URLSearchParams();
        params.append('datos', JSON.stringify(data));
        console.log('Enviando datos al GAS:', data.Documento);
        xhr.send(params.toString());
    });
}