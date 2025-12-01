// Variables globales del módulo
const DIS_API_KEY = "AIzaSyC7hjbRc0TGLgImv8gVZg8tsOeYWgXlPcM";
const SOURCE_SPREADSHEET_ID = "1esc5REq0c03nHLpGcLwZRW29yq2gZnrpbz75gCCjrqc";
const SECONDARY_SPREADSHEET_ID = "133NiyjNApZGkEFs4jUvpJ9So-cSEzRVeW2FblwOCrjI";

let allRecData = [];
let allConfigData = {};
let activeMayoristas = [];
let empresasData = [];
let currentRecData = null;
let colorOptions = [];
let tallaOptions = [];
let mayoristaFilters = {};

// Configuración fija de clientes
const CLIENTES_CONFIG = {
    "67006141": { "id": "67006141", "razonSocial": "QUINTERO ORTIZ PATRICIA YAMILET", "nombreCorto": "Yamilet", "tipoCliente": "Mayorista", "estado": "Activo", "direccion": "CL 26 # 7 - 21", "telefono": "3122441788", "email": "p.yamiletquino@hotmail.com" },
    "805027653": { "id": "805027653", "razonSocial": "EL TEMPLO DE LA MODA S.A.S.", "nombreCorto": "Templo", "tipoCliente": "Empresa", "estado": "Activo", "direccion": "CALLE 26 # 7 - 21", "telefono": "3143927031", "email": "auxiliarcdi@eltemplodelamoda.com.co", "tipoEmpresa": "Principal" },
    "900021825": { "id": "900021825", "razonSocial": "INDUALPES S.A.S", "nombreCorto": "Indualpes", "tipoCliente": "Mayorista", "estado": "Activo", "direccion": "CR 52 29 A 111 BG 205", "telefono": "", "email": "gerencia@indualpes.com" },
    "900047252": { "id": "900047252", "razonSocial": "EL TEMPLO DE LA MODA FRESCA S.A.S.", "nombreCorto": "Shopping", "tipoCliente": "Empresa", "estado": "Activo", "direccion": "CALLE 26 # 7 - 21", "telefono": "3185859934", "email": "bodega@eltemplodelamodafresca.com", "tipoEmpresa": "Secundaria" },
    "900616124": { "id": "900616124", "razonSocial": "TEXTILES Y CREACIONES EL UNIVERSO S.A.S.", "nombreCorto": "Universo", "tipoCliente": "Mayorista", "estado": "Activo", "direccion": "CALLE 26 # 7 - 21", "telefono": "3168007979", "email": "coordinadorlogistico@eltemplodelamoda.com.co" },
    "900692469": { "id": "900692469", "razonSocial": "TEXTILES Y CREACIONES LOS ANGELES S.A.S.", "nombreCorto": "Ángeles", "tipoCliente": "Proveedor", "estado": "Activo", "direccion": "CALLE 26 # 7 - 21", "telefono": "3154799895", "email": "gerencia@tclosangeles.com" },
    "901920844": { "id": "901920844", "razonSocial": "INVERSIONES URBANA SAS", "nombreCorto": "Ruben", "tipoCliente": "Mayorista", "estado": "Activo", "direccion": "CALLE 26 # 7 - 21", "telefono": "3103944800", "email": "contabilidad@eltemplodelamoda.com.co" },
    "1007348825": { "id": "1007348825", "razonSocial": "ZULUAGA GOMEZ RUBEN ESTEBAN", "nombreCorto": "Esteban", "tipoCliente": "Mayorista", "estado": "Activo", "direccion": "CONDOMINIO CAMPESTRE LAS MERCEDES", "telefono": "3205702698", "email": "contabilidad@eltemplodelamoda.com.co" },
    "900616124-1": { "id": "900616124", "razonSocial": "TEXTILES Y CREACIONES EL UNIVERSO S.A.S.", "nombreCorto": "Universo", "tipoCliente": "Proveedor", "estado": "Activo", "direccion": "CALLE 26 # 7 - 21", "telefono": "3168007979", "email": "coordinadorlogistico@eltemplodelamoda.com.co" },
    "70825517-1": { "id": "70825517", "razonSocial": "ARISTIZABAL LOPES JESUS MARIA", "nombreCorto": "Jesús", "tipoCliente": "Mayorista", "estado": "Activo", "direccion": "CL 26 # 7 - 21", "telefono": "3122441788", "email": "p.yamiletquino@hotmail.com" },
    "70825517-2": { "id": "14838951", "razonSocial": "QUINTERO ORTIZ JOSE ALEXANDER", "nombreCorto": "Alex", "tipoCliente": "Mayorista", "estado": "Activo", "direccion": "CL 26 # 7 - 21", "telefono": "3104624213", "email": "alexander511933@hotmail.com" }
};

// Inicializar el módulo
document.addEventListener('DOMContentLoaded', function() {
    initializeDistribution();
    setupDistributionEventListeners();
});

// Configurar event listeners
function setupDistributionEventListeners() {
    // Botón de recarga
    document.getElementById('reloadDataBtn').addEventListener('click', reloadAllData);
    
    // Botón de guardar
    document.getElementById('saveDistributionsBtn').addEventListener('click', saveAllDistributionsFast);
    
    // Botón de configuración
    document.getElementById('moduleConfigBtn').addEventListener('click', showModuleSettings);
    
    // Atajo de teclado Ctrl+Q para guardar
    document.addEventListener('keydown', function(event) {
        if ((event.ctrlKey || event.metaKey) && (event.key === 'q' || event.key === 'Q')) {
            event.preventDefault();
            saveAllDistributionsFast();
        }
    });
}

// Cargar datos al iniciar
function initializeDistribution() {
    // Mostrar loading
    document.getElementById('distribution-loading').style.display = 'flex';
    document.getElementById('distribution-main').style.display = 'none';

    Promise.all([
        cargarTodosLosDatos(),
        cargarConfiguraciones()
    ]).then(([recData, configData]) => {
        console.log('Datos cargados:', recData.length, 'registros');
        console.log('Configuración cargada:', configData.length, 'clientes');
        
        handleRecData(recData);
        handleConfigData(configData);
        
        // Ocultar loading y mostrar contenido principal
        document.getElementById('distribution-loading').style.display = 'none';
        document.getElementById('distribution-main').style.display = 'block';
        
        // Actualizar contadores
        updateCounters();
    }).catch(handleError);
}

// Función para cargar datos unificados
async function cargarTodosLosDatos() {
    try {
        console.log('Cargando datos de Google Sheets...');
        const [json1, json2] = await Promise.all([
            getSheetDataAsJSON_1(),  // DATA2
            getSheetDataAsJSON_2()   // DataBase
        ]);

        const arr1 = JSON.parse(json1);
        console.log('Datos de DATA2:', arr1.length, 'registros');
        
        const arr2 = JSON.parse(json2);
        console.log('Datos de DataBase:', arr2.length, 'registros');
        
        const unified = arr1.concat(arr2);
        console.log('Datos unificados:', unified.length, 'registros');
        
        return unified;
    } catch (error) {
        console.error('Error cargando datos:', error);
        throw error;
    }
}

// Obtener datos de DATA2
async function getSheetDataAsJSON_1() {
    try {
        const SPREADSHEET_ID = "133NiyjNApZGkEFs4jUvpJ9So-cSEzRVeW2FblwOCrjI";
        const SHEET_NAME = "DATA2";
        const RANGE = `${SHEET_NAME}!S2:S`;

        const url = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${RANGE}?key=${DIS_API_KEY}`;
        
        console.log('Fetching DATA2 desde:', url);
        
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Error HTTP DATA2: ${response.status}`);
        }

        const data = await response.json();

        if (!data.values || data.values.length === 0) {
            console.warn('No data found in DATA2');
            return JSON.stringify([]);
        }

        const jsonEntries = data.values.map(row => row[0]).filter(val => val && val.trim() !== "");
        const finalJsonString = `[${jsonEntries.join(",")}]`;
        
        return finalJsonString;
    } catch (error) {
        console.error('Error en getSheetDataAsJSON_1:', error);
        return JSON.stringify([]);
    }
}

// Obtener datos de DataBase
async function getSheetDataAsJSON_2() {
    try {
        const range = "DataBase!A:HR";
        const url = `https://sheets.googleapis.com/v4/spreadsheets/${SOURCE_SPREADSHEET_ID}/values/${range}?key=${DIS_API_KEY}`;
        
        console.log('Fetching DataBase desde:', url);
        
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Error HTTP DataBase: ${response.status}`);
        }

        const data = await response.json();

        if (!data.values) {
            console.warn('No data found in DataBase');
            return JSON.stringify([]);
        }

        const datos = data.values;
        let result = [];
        let lotesAnexos = {};
        let lotesHrPendientes = {};

        for (let i = 0; i < datos.length; i++) {
            if (datos[i][0]) {
                const valueA = datos[i][0].toString().trim();

                if (valueA.startsWith("REC")) {
                    const numberPart = valueA.replace("REC", "").trim();

                    let proveedor = "TEXTILES Y CREACIONES EL UNIVERSO S.A.S.";
                    if (datos[i][3] && datos[i][3].toString().trim() === "LINEA ANGELES") {
                        proveedor = "TEXTILES Y CREACIONES LOS ANGELES S.A.S.";
                    }

                    let loteActual = datos[i][8] || "";
                    let tipoActual = datos[i][27] || "";

                    if (!lotesAnexos[loteActual]) {
                        lotesAnexos[loteActual] = [];
                        lotesHrPendientes[loteActual] = [];
                    }

                    if (tipoActual !== "FULL") {
                        lotesAnexos[loteActual].push({
                            "DOCUMENTO": numberPart,
                            "TIPO": tipoActual,
                            "CANTIDAD": datos[i][18] || ""
                        });

                        if (tipoActual === "PENDIENTES" && datos[i][225]) {
                            const hrPendiente = datos[i][225].toString().split("☬").map(row => row.split("∞"));
                            lotesHrPendientes[loteActual] = lotesHrPendientes[loteActual].concat(hrPendiente);
                        }
                    }

                    if (tipoActual === "FULL") {
                        let extensiones = [];
                        if (datos[i][225]) {
                            extensiones = datos[i][225].toString().split("☬").map(row => row.split("∞"));
                        }

                        result.push({
                            "A": numberPart,
                            "FECHA": datos[i][1] || "",
                            "TALLER": datos[i][2] || "",
                            "LINEA": datos[i][3] || "",
                            "AUDITOR": datos[i][4] || "",
                            "ESCANER": datos[i][5] || "",
                            "LOTE": loteActual,
                            "REFERENCIA": datos[i][6] || "",
                            "DESCRIPCIÓN": datos[i][9] || "",
                            "CANTIDAD": datos[i][18] || "",
                            "TEMPLO": datos[i][26] || "",
                            "TIPO": tipoActual,
                            "PVP": datos[i][28] || "",
                            "PRENDA": datos[i][29] || "",
                            "GENERO": datos[i][30] || "",
                            "HR": extensiones,
                            "PROVEEDOR": proveedor,
                            "ANEXO": []
                        });
                    }
                }
            }
        }

        // Combinar HRs y anexos
        result.forEach(item => {
            if (lotesAnexos[item.LOTE]) {
                item.ANEXO = lotesAnexos[item.LOTE];
            }

            if (lotesHrPendientes[item.LOTE] && lotesHrPendientes[item.LOTE].length > 0) {
                const hrPrincipal = item.HR;
                const hrPendientes = lotesHrPendientes[item.LOTE];

                const combinedHrMap = {};

                hrPrincipal.forEach(itemHr => {
                    const codigo = itemHr[0];
                    if (codigo) combinedHrMap[codigo] = [...itemHr];
                });

                hrPendientes.forEach(itemHr => {
                    const codigo = itemHr[0];
                    if (codigo) {
                        if (combinedHrMap[codigo]) {
                            const cantidadExistente = parseInt(combinedHrMap[codigo][3]) || 0;
                            const cantidadNueva = parseInt(itemHr[3]) || 0;
                            combinedHrMap[codigo][3] = (cantidadExistente + cantidadNueva).toString();
                        } else {
                            combinedHrMap[codigo] = [...itemHr];
                        }
                    }
                });

                item.HR = Object.values(combinedHrMap);
            }
        });

        console.log('DataBase procesado:', result.length, 'registros');
        return JSON.stringify(result, null, 2);
        
    } catch (error) {
        console.error('Error en getSheetDataAsJSON_2:', error);
        return JSON.stringify([]);
    }
}

// Cargar configuraciones desde objeto fijo
function cargarConfiguraciones() {
    return new Promise((resolve) => {
        // Convertir el objeto CLIENTES_CONFIG al formato esperado
        const configArray = Object.entries(CLIENTES_CONFIG).map(([id, config]) => ({
            id: id,
            ...config
        }));
        console.log('Configuración cargada:', configArray.length, 'clientes');
        resolve(configArray);
    });
}

function handleRecData(recData) {
    allRecData = recData;
    console.log('REC data procesada:', recData.length, 'registros');
    if (allConfigData) {
        refreshUI();
    }
}

function handleConfigData(configData) {
    allConfigData = configData.reduce((acc, config) => {
        acc[config.id] = config;
        return acc;
    }, {});
    console.log('Config data procesada:', Object.keys(allConfigData).length, 'clientes');
    processConfigData();
    if (allRecData) {
        refreshUI();
    }
}

function processConfigData() {
    // Procesar empresas
    empresasData = Object.entries(allConfigData)
        .filter(([id, config]) => config.tipoEmpresa)
        .sort((a, b) => {
            if (a[1].tipoEmpresa !== b[1].tipoEmpresa) {
                return a[1].tipoEmpresa === "Principal" ? -1 : 1;
            }
            return a[1].nombreCorto.localeCompare(b[1].nombreCorto);
        });

    console.log('Empresas procesadas:', empresasData.length);

    // Inicializar filtros para mayoristas
    Object.entries(allConfigData)
        .filter(([id, config]) => config.tipoCliente === "Mayorista")
        .forEach(([id, config]) => {
            mayoristaFilters[id] = {
                excludedColors: [],
                excludedTallas: []
            };
        });

    console.log('Filtros inicializados para', Object.keys(mayoristaFilters).length, 'mayoristas');
}

// Funciones de UI
function selectAllMayoristas() {
    document.querySelectorAll('#mayoristasContainer input[type="checkbox"]').forEach(checkbox => {
        checkbox.checked = true;
        checkbox.dispatchEvent(new Event('change'));
    });
}

function deselectAllMayoristas() {
    document.querySelectorAll('#mayoristasContainer input[type="checkbox"]').forEach(checkbox => {
        checkbox.checked = false;
        checkbox.dispatchEvent(new Event('change'));
    });
}

// Actualizar contadores
function updateCounters() {
    const empresasCount = empresasData.length;
    const mayoristasCount = Object.keys(allConfigData).filter(id => 
        allConfigData[id].tipoCliente === "Mayorista"
    ).length;
    
    document.getElementById('empresas-count').textContent = empresasCount;
    document.getElementById('mayoristas-count').textContent = mayoristasCount;
}

function refreshUI() {
    console.log('Refrescando UI...');
    
    document.getElementById('distribution-loading').style.display = 'none';
    document.getElementById('distribution-main').style.display = 'block';
    
    // Actualizar contadores
    updateCounters();
    
    // Limpiar y regenerar UI
    document.getElementById('empresasContainer').innerHTML = '';
    document.getElementById('mayoristasContainer').innerHTML = '';
    
    generateEmpresasUI();
    generateMayoristasUI();
    
    const recNumber = document.getElementById('recInput').value.trim();
    if (recNumber) {
        searchRec();
    }
    
    console.log('UI refrescada');
}

function generateEmpresasUI() {
    const container = document.getElementById('empresasContainer');
    container.innerHTML = '';

    if (empresasData.length === 0) {
        container.innerHTML = '<p>No hay empresas configuradas</p>';
        return;
    }

    empresasData.forEach(([id, config]) => {
        const item = document.createElement('div');
        item.className = 'empresa-item';

        const label = document.createElement('label');
        label.htmlFor = `empresa-${id}`;
        label.textContent = config.nombreCorto + ':';

        const input = document.createElement('input');
        input.type = 'number';
        input.id = `empresa-${id}`;
        input.min = '0';
        input.max = '100';
        input.value = config.tipoEmpresa === "Principal" ? '100' : '0';
        input.dataset.tipo = config.tipoEmpresa;
        input.dataset.id = id;

        if (config.tipoEmpresa === "Principal") {
            input.readOnly = true;
            input.classList.add('principal-input');
        } else {
            input.addEventListener('input', updateEmpresaPercentage);
        }

        item.appendChild(label);
        item.appendChild(input);
        container.appendChild(item);
    });
}

function generateMayoristasUI() {
    const container = document.getElementById('mayoristasContainer');
    const mayoristas = Object.entries(allConfigData)
        .filter(([id, config]) => config.tipoCliente === "Mayorista")
        .sort((a, b) => a[1].nombreCorto.localeCompare(b[1].nombreCorto));

    if (mayoristas.length === 0) {
        container.innerHTML = '<p>No hay mayoristas configurados</p>';
        return;
    }

    mayoristas.forEach(([id, config]) => {
        const div = document.createElement('div');
        div.className = 'mayorista-item';

        const checkboxInput = document.createElement('input');
        checkboxInput.type = 'checkbox';
        checkboxInput.id = `mayorista-${id}`;
        checkboxInput.value = id;
        checkboxInput.dataset.nombre = config.nombreCorto;
        checkboxInput.addEventListener('change', updateHrColumns);

        const label = document.createElement('label');
        label.htmlFor = `mayorista-${id}`;
        label.textContent = config.nombreCorto;

        div.appendChild(checkboxInput);
        div.appendChild(label);
        container.appendChild(div);
    });
}

// Función principal para actualizar valores
function updateAllValues() {
    if (!currentRecData || !currentRecData.HR) return;

    console.log('Actualizando valores...');

    currentRecData.HR.forEach((row, rowIndex) => {
        const tr = document.querySelector(`tbody tr:nth-child(${rowIndex + 1})`);
        if (!tr) return;

        const total = parseInt(tr.cells[3].textContent) || 0;

        // 1. Calcular total asignado a mayoristas
        let assignedToMayoristas = 0;
        activeMayoristas.forEach(mayorista => {
            const input = tr.querySelector(`.mayorista-input[data-mayorista="${mayorista.id}"]`);
            assignedToMayoristas += parseInt(input?.value) || 0;
        });

        // 2. Validar que no se exceda el total
        if (assignedToMayoristas > total) {
            // Ajustar proporcionalmente los valores de mayoristas
            const ratio = total / assignedToMayoristas;
            activeMayoristas.forEach(mayorista => {
                const input = tr.querySelector(`.mayorista-input[data-mayorista="${mayorista.id}"]`);
                if (input && input.value > 0) {
                    input.value = Math.max(1, Math.floor(parseInt(input.value) * ratio));
                }
            });
            assignedToMayoristas = total;
        }

        // 3. Calcular disponible para empresas
        const availableForCompanies = total - assignedToMayoristas;

        // 4. Asignar a empresas secundarias
        empresasData.forEach(([id, config]) => {
            if (config.tipoEmpresa === "Secundaria") {
                const input = document.getElementById(`empresa-${id}`);
                const porcentaje = input ? parseInt(input.value) || 0 : 0;
                const valorSecundaria = Math.round(availableForCompanies * porcentaje / 100);

                const secundariaCell = tr.querySelector(`.secundaria-cell[data-empresa="${id}"]`);
                if (secundariaCell) secundariaCell.textContent = valorSecundaria;
            }
        });

        // 5. Calcular valor para principal
        let asignadoSecundarias = 0;
        empresasData.forEach(([id, config]) => {
            if (config.tipoEmpresa === "Secundaria") {
                const secundariaCell = tr.querySelector(`.secundaria-cell[data-empresa="${id}"]`);
                asignadoSecundarias += parseInt(secundariaCell?.textContent) || 0;
            }
        });

        const principalValue = Math.max(0, availableForCompanies - asignadoSecundarias);
        const principalCell = tr.querySelector('.principal-cell');
        if (principalCell) principalCell.textContent = principalValue;
    });

    updateTotals();
}

function updateEmpresaPercentage(event) {
    const input = event.target;
    let value = parseInt(input.value) || 0;
    value = Math.max(0, Math.min(100, value));
    input.value = value;
    updatePrincipalValue();
    updateAllValues();
}

function updatePrincipalValue() {
    const principal = empresasData.find(([id, config]) => config.tipoEmpresa === "Principal");
    if (!principal) return;

    const principalInput = document.getElementById(`empresa-${principal[0]}`);
    if (!principalInput) return;

    let totalSecundarias = 0;
    empresasData.forEach(([id, config]) => {
        if (config.tipoEmpresa === "Secundaria") {
            const input = document.getElementById(`empresa-${id}`);
            if (input) totalSecundarias += parseInt(input.value) || 0;
        }
    });

    principalInput.value = 100 - totalSecundarias;
}

function updateMayoristaInput(event) {
    const input = event.target;
    const rowIndex = input.dataset.row;
    const mayoristaId = input.dataset.mayorista;
    const value = parseInt(input.value) || 0;
    
    const row = document.querySelector(`tbody tr:nth-child(${parseInt(rowIndex) + 1})`);
    if (!row) return;
    
    const total = parseInt(row.cells[3].textContent) || 0;

    // Calcular lo asignado a otros mayoristas
    let assignedToOthers = 0;
    activeMayoristas.forEach(m => {
        if (m.id !== mayoristaId) {
            const otherInput = document.querySelector(`.mayorista-input[data-row="${rowIndex}"][data-mayorista="${m.id}"]`);
            assignedToOthers += parseInt(otherInput?.value) || 0;
        }
    });

    // Validar que no se exceda el total
    if (value + assignedToOthers > total) {
        input.value = Math.max(0, total - assignedToOthers);
    }

    updateAllValues();
}

function distributeGlobalQuantity(event) {
    const btn = event.target.closest('.distribute-btn');
    const mayoristaId = btn.dataset.mayorista;
    const input = document.querySelector(`.global-mayorista-input[data-mayorista="${mayoristaId}"]`);
    let totalToDistribute = parseInt(input.value) || 0;

    if (totalToDistribute <= 0) return;

    // Obtener filtros actuales para este mayorista
    const filters = mayoristaFilters[mayoristaId] || { excludedColors: [], excludedTallas: [] };

    // Obtener filas disponibles
    const rows = Array.from(document.querySelectorAll('tbody tr:not(.total-row)'))
        .filter(row => {
            const color = row.cells[1].textContent;
            const talla = row.cells[2].textContent;
            const total = parseInt(row.cells[3].textContent) || 0;
            return total > 0 &&
                !filters.excludedColors.includes(color) &&
                !filters.excludedTallas.includes(talla);
        });

    if (rows.length === 0) {
        alert('No hay filas disponibles para distribuir');
        return;
    }

    // Limpiar valores previos de este mayorista
    document.querySelectorAll(`.mayorista-input[data-mayorista="${mayoristaId}"]`).forEach(input => {
        input.value = '0';
    });

    // Preparar datos para distribución
    const availableRows = rows.map(row => {
        const rowIndex = Array.from(row.parentNode.children).indexOf(row);
        const total = parseInt(row.cells[3].textContent) || 0;

        // Calcular ya asignado a otros mayoristas
        let assignedToOthers = 0;
        activeMayoristas.forEach(m => {
            if (m.id !== mayoristaId) {
                const otherInput = row.querySelector(`.mayorista-input[data-mayorista="${m.id}"]`);
                assignedToOthers += parseInt(otherInput?.value) || 0;
            }
        });

        const disponible = Math.max(0, total - assignedToOthers);

        return {
            row: row,
            tdm: disponible,
            rowIndex: rowIndex
        };
    });

    // Ejecutar distribución inteligente
    const result = smartDistribution(availableRows, totalToDistribute);

    // Aplicar la distribución
    let totalAsignado = 0;
    result.forEach(item => {
        const input = item.row.querySelector(`.mayorista-input[data-mayorista="${mayoristaId}"]`);
        if (item.assigned > 0) {
            input.value = item.assigned;
            totalAsignado += item.assigned;
        }
    });

    // Ajustar el input global con lo realmente distribuido
    input.value = totalAsignado;

    // Actualizar valores de empresas con lo restante
    updateAllValues();
}

function updateTotals() {
    if (!currentRecData) return;

    const totalCantidad = currentRecData.HR.reduce((sum, row) => sum + (parseFloat(row[3]) || 0), 0);

    // Totales para mayoristas
    activeMayoristas.forEach(mayorista => {
        let total = 0;
        document.querySelectorAll(`.mayorista-input[data-mayorista="${mayorista.id}"]`).forEach(input => {
            total += parseInt(input.value) || 0;
        });
        const totalElement = document.querySelector(`.mayorista-total[data-mayorista="${mayorista.id}"]`);
        if (totalElement) totalElement.textContent = total;
    });

    // Totales para empresas
    empresasData.forEach(([id, config]) => {
        if (config.tipoEmpresa === "Principal") {
            let totalPrincipal = 0;
            document.querySelectorAll('.principal-cell').forEach(cell => {
                totalPrincipal += parseInt(cell.textContent) || 0;
            });
            const principalTotalElement = document.querySelector('.principal-total');
            if (principalTotalElement) {
                principalTotalElement.textContent = totalPrincipal;
                principalTotalElement.classList.toggle('valor-negativo', totalPrincipal < 0);
            }
        } else {
            let totalSecundaria = 0;
            document.querySelectorAll(`.secundaria-cell[data-empresa="${id}"]`).forEach(cell => {
                totalSecundaria += parseInt(cell.textContent) || 0;
            });
            const totalElement = document.querySelector(`.secundaria-total[data-empresa="${id}"]`);
            if (totalElement) totalElement.textContent = totalSecundaria;
        }
    });
}

function updateHrColumns(event) {
    const changedCheckbox = event.target;
    const mayoristaId = changedCheckbox.value;
    const isNowChecked = changedCheckbox.checked;

    console.log('Cambio en mayorista:', mayoristaId, 'checked:', isNowChecked);

    // Guardar valores actuales de otros mayoristas
    const savedMayoristaValues = {};
    activeMayoristas.forEach(mayorista => {
        if (mayorista.id !== mayoristaId) {
            savedMayoristaValues[mayorista.id] = [];
            document.querySelectorAll(`.mayorista-input[data-mayorista="${mayorista.id}"]`).forEach((input, index) => {
                savedMayoristaValues[mayorista.id][index] = input.value;
            });
        }
    });

    // Guardar valores de empresas
    const savedEmpresaValues = {};
    empresasData.forEach(([id, config]) => {
        const input = document.getElementById(`empresa-${id}`);
        if (input) savedEmpresaValues[id] = input.value;
    });

    // Si se está deshabilitando un mayorista, limpiar sus valores
    if (!isNowChecked) {
        const globalInput = document.querySelector(`.global-mayorista-input[data-mayorista="${mayoristaId}"]`);
        if (globalInput) globalInput.value = '0';

        document.querySelectorAll(`.mayorista-input[data-mayorista="${mayoristaId}"]`).forEach(input => {
            input.value = '0';
        });
    }

    // Actualizar lista de mayoristas activos
    activeMayoristas = [];
    document.querySelectorAll('#mayoristasContainer input[type="checkbox"]:checked').forEach(checkbox => {
        activeMayoristas.push({
            id: checkbox.value,
            nombre: checkbox.dataset.nombre
        });
    });

    console.log('Mayoristas activos:', activeMayoristas.length);

    // Refrescar UI preservando valores
    refreshDisplayPreservingValues({
        empresas: savedEmpresaValues,
        mayoristas: savedMayoristaValues
    });

    // Actualizar totales
    updateTotals();
}

function refreshDisplayPreservingValues(savedValues = {}) {
    const recNumber = document.getElementById('recInput').value.trim();
    if (!recNumber) return;

    if (currentRecData) {
        // Mostrar resultados preservando valores
        const resultDiv = document.getElementById('result');
        resultDiv.innerHTML = generateResultsHTML(currentRecData);
        attachInputEvents();

        // Restaurar valores de empresas
        if (savedValues.empresas) {
            Object.keys(savedValues.empresas).forEach(id => {
                const input = document.getElementById(`empresa-${id}`);
                if (input) {
                    input.value = savedValues.empresas[id];
                    if (input.dataset.tipo === "Secundaria") {
                        const event = new Event('input');
                        input.dispatchEvent(event);
                    }
                }
            });
        }

        // Restaurar valores de mayoristas
        if (savedValues.mayoristas) {
            Object.keys(savedValues.mayoristas).forEach(mayoristaId => {
                const values = savedValues.mayoristas[mayoristaId];
                values.forEach((value, rowIndex) => {
                    const input = document.querySelector(`.mayorista-input[data-row="${rowIndex}"][data-mayorista="${mayoristaId}"]`);
                    if (input) {
                        input.value = value;
                    }
                });
            });
        }

        updateAllValues();
    }
}

function searchRec() {
    const recNumber = document.getElementById('recInput').value.trim();
    const resultDiv = document.getElementById('result');

    if (!recNumber) {
        resultDiv.innerHTML = '<div class="empty-state"><i class="codicon codicon-dashboard"></i><h5>Sin datos para mostrar</h5><p>Ingrese un número de REC y configure la distribución para ver los resultados.</p></div>';
        return;
    }

    console.log('Buscando REC:', recNumber);
    
    // Buscar el REC (quitar ceros iniciales si es necesario)
    const recNumClean = recNumber.replace(/^0+/, '');
    currentRecData = allRecData.find(item => item.A === recNumClean);
    
    if (!currentRecData) {
        // Intentar buscar con el formato original
        currentRecData = allRecData.find(item => item.A === recNumber);
    }
    
    displayResults(currentRecData);
}

function displayResults(recData) {
    const resultDiv = document.getElementById('result');

    if (!recData) {
        resultDiv.innerHTML = '<p class="error-message">No se encontró el REC especificado</p>';
        return;
    }

    console.log('REC encontrado:', recData.A);
    console.log('Extensiones HR:', recData.HR ? recData.HR.length : 0);
    
    resultDiv.innerHTML = generateResultsHTML(recData);
    attachInputEvents();
    updateAllValues();
}

function generateResultsHTML(recData) {
    let html = '<h3>REC: ' + recData.A + '</h3>';

    if (!recData.HR || recData.HR.length === 0) {
        return html + '<p>No hay extensiones para este REC</p>';
    }

    html += '<table><thead><tr>';

    // Columnas fijas
    html += '<th>Código</th>';
    html += '<th>Color</th>';
    html += '<th>Talla</th>';
    html += '<th>Cantidad</th>';

    // Columnas de empresas
    empresasData.forEach(([id, config]) => {
        html += `<th>${config.nombreCorto}</th>`;
    });

    // Columnas de mayoristas
    activeMayoristas.forEach(mayorista => {
        html += `
            <th>
                <div class="mayorista-column-header">
                    <div class="header-title">${mayorista.nombre}</div>
                    <div class="header-controls">
                        <div class="btn-group">
                            <button class="btn-sm distribute-btn" data-mayorista="${mayorista.id}" title="Distribuir cantidad">
                                <i class="codicon codicon-symbol-array"></i>
                            </button>
                            <button class="btn-sm filter-btn" data-mayorista="${mayorista.id}" title="Filtrar colores/tallas" onclick="openFilterModal(event)">
                                <i class="codicon codicon-filter"></i>
                            </button>
                            <button class="btn-sm clear-btn" data-mayorista="${mayorista.id}" title="Limpiar valores">
                                <i class="codicon codicon-clear-all"></i>
                            </button>
                        </div>
                        <input type="number" min="0" class="global-mayorista-input" 
                                data-mayorista="${mayorista.id}" value="0" placeholder="0">
                    </div>
                </div>
            </th>
        `;
    });

    html += '</tr></thead><tbody>';

    // Filas de datos
    recData.HR.forEach((row, rowIndex) => {
        const codigo = formatCellValue(row[0]);
        const color = formatCellValue(row[1]);
        const talla = formatCellValue(row[2]);
        const cantidad = parseFloat(row[3]) || 0;

        html += `<tr>`;
        html += `<td>${codigo}</td>`;
        html += `<td>${color}</td>`;
        html += `<td>${talla}</td>`;
        html += `<td>${cantidad}</td>`;

        // Valores para empresas
        empresasData.forEach(([id, config]) => {
            if (config.tipoEmpresa === "Principal") {
                html += `<td class="principal-cell" data-row="${rowIndex}">${cantidad}</td>`;
            } else {
                html += `<td class="secundaria-cell" data-row="${rowIndex}" data-empresa="${id}">0</td>`;
            }
        });

        // Inputs para mayoristas
        activeMayoristas.forEach(mayorista => {
            html += `
                <td>
                    <input type="number" min="0" max="${cantidad}" 
                            class="mayorista-input" 
                            data-row="${rowIndex}" 
                            data-mayorista="${mayorista.id}"
                            value="0"
                            data-color="${color}"
                            data-talla="${talla}">
                </td>
            `;
        });

        html += '</tr>';
    });

    // Fila de totales
    html += '<tr class="total-row">';
    html += '<td colspan="3"><strong>Total</strong></td>';

    const totalCantidad = recData.HR.reduce((sum, row) => sum + (parseFloat(row[3]) || 0), 0);
    html += `<td><strong>${totalCantidad}</strong></td>`;

    // Totales empresas
    empresasData.forEach(([id, config]) => {
        if (config.tipoEmpresa === "Principal") {
            html += `<td><strong class="principal-total">${totalCantidad}</strong></td>`;
        } else {
            html += `<td><strong class="secundaria-total" data-empresa="${id}">0</strong></td>`;
        }
    });

    // Totales mayoristas
    activeMayoristas.forEach(mayorista => {
        html += `<td><strong class="mayorista-total" data-mayorista="${mayorista.id}">0</strong></td>`;
    });

    html += '</tr></tbody></table>';

    return html;
}

function attachInputEvents() {
    // Eventos para inputs de mayoristas por fila
    document.querySelectorAll('.mayorista-input').forEach(input => {
        input.addEventListener('input', updateMayoristaInput);
    });

    // Eventos para inputs globales
    document.querySelectorAll('.global-mayorista-input').forEach(input => {
        input.addEventListener('input', updateGlobalMayoristaValue);
        input.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                const mayoristaId = this.dataset.mayorista;
                const distributeBtn = document.querySelector(`.distribute-btn[data-mayorista="${mayoristaId}"]`);
                if (distributeBtn) {
                    distributeBtn.click();
                }
            }
        });
    });

    // Botones de distribución
    document.querySelectorAll('.distribute-btn').forEach(btn => {
        btn.addEventListener('click', distributeGlobalQuantity);
    });

    // Botones de limpieza
    document.querySelectorAll('.clear-btn').forEach(btn => {
        btn.addEventListener('click', clearMayoristaValues);
    });

    // Botones de filtro
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', openFilterModal);
    });
}

function updateGlobalMayoristaValue(event) {
    const input = event.target;
    const mayoristaId = input.dataset.mayorista;
    const value = parseInt(input.value) || 0;

    if (!currentRecData || !currentRecData.HR) return;

    // Validar contra el total disponible
    const totalDisponible = currentRecData.HR.reduce((sum, row) => sum + (parseFloat(row[3]) || 0), 0);

    // Calcular ya asignado a otros mayoristas
    let assignedToOthers = 0;
    activeMayoristas.forEach(m => {
        if (m.id !== mayoristaId) {
            const globalInput = document.querySelector(`.global-mayorista-input[data-mayorista="${m.id}"]`);
            assignedToOthers += parseInt(globalInput?.value) || 0;
        }
    });

    if (value + assignedToOthers > totalDisponible) {
        input.value = Math.max(0, totalDisponible - assignedToOthers);
    }
}

function clearMayoristaValues(event) {
    const btn = event.target.closest('.clear-btn');
    const mayoristaId = btn.dataset.mayorista;

    // Limpiar input global
    const globalInput = document.querySelector(`.global-mayorista-input[data-mayorista="${mayoristaId}"]`);
    if (globalInput) globalInput.value = '0';

    // Limpiar inputs por fila
    document.querySelectorAll(`.mayorista-input[data-mayorista="${mayoristaId}"]`).forEach(input => {
        input.value = '0';
    });

    // Restablecer filtros
    if (mayoristaFilters[mayoristaId]) {
        mayoristaFilters[mayoristaId].excludedColors = [];
        mayoristaFilters[mayoristaId].excludedTallas = [];
    }

    updateAllValues();
}

function openFilterModal(event) {
    const btn = event.target.closest('.filter-btn');
    const mayoristaId = btn.dataset.mayorista;
    const mayorista = allConfigData[mayoristaId];

    if (!currentRecData || !currentRecData.HR || currentRecData.HR.length === 0) {
        showMessage('Primero busque un REC para configurar los filtros', 'error', 3000);
        return;
    }

    // Extraer opciones únicas de colores y tallas
    const colors = new Set();
    const tallas = new Set();

    currentRecData.HR.forEach(row => {
        if (row[1]) colors.add(row[1]);
        if (row[2]) tallas.add(row[2]);
    });

    colorOptions = Array.from(colors);
    tallaOptions = Array.from(tallas);

    // Asegurar estructura de filtros
    if (!mayoristaFilters[mayoristaId]) {
        mayoristaFilters[mayoristaId] = {
            excludedColors: [],
            excludedTallas: []
        };
    }

    // Crear modal
    const modal = document.createElement('div');
    modal.className = 'filter-modal';
    modal.innerHTML = `
        <div class="filter-modal-content">
            <div class="filter-modal-header">
                <h3>
                    <i class="codicon codicon-filter"></i>
                    Filtros para ${mayorista.nombreCorto}
                </h3>
                <button class="filter-modal-close" onclick="closeFilterModal(this)">
                    <i class="codicon codicon-close"></i>
                </button>
            </div>
            <div class="filter-modal-body">
                <div class="filter-section">
                    <h5>
                        <i class="codicon codicon-symbol-color"></i>
                        Excluir Colores
                    </h5>
                    <div id="colorFilters-${mayoristaId}" class="filter-options"></div>
                </div>
                <div class="filter-section">
                    <h5>
                        <i class="codicon codicon-symbol-ruler"></i>
                        Excluir Tallas
                    </h5>
                    <div id="tallaFilters-${mayoristaId}" class="filter-options"></div>
                </div>
            </div>
            <div class="filter-modal-footer">
                <button class="btn-secondary" onclick="closeFilterModal(this)">
                    Cancelar
                </button>
                <button class="btn-primary" onclick="applyFilters('${mayoristaId}')">
                    <i class="codicon codicon-check"></i>
                    Aplicar Filtros
                </button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    // Llenar opciones de colores
    const colorContainer = document.getElementById(`colorFilters-${mayoristaId}`);
    colorOptions.forEach(color => {
        const div = document.createElement('div');
        div.className = 'filter-option';

        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.id = `color-${mayoristaId}-${color}`;
        checkbox.value = color;
        checkbox.checked = mayoristaFilters[mayoristaId].excludedColors.includes(color);

        const label = document.createElement('label');
        label.htmlFor = `color-${mayoristaId}-${color}`;
        label.textContent = color;

        div.appendChild(checkbox);
        div.appendChild(label);
        colorContainer.appendChild(div);
    });

    // Llenar opciones de tallas
    const tallaContainer = document.getElementById(`tallaFilters-${mayoristaId}`);
    tallaOptions.forEach(talla => {
        const div = document.createElement('div');
        div.className = 'filter-option';

        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.id = `talla-${mayoristaId}-${talla}`;
        checkbox.value = talla;
        checkbox.checked = mayoristaFilters[mayoristaId].excludedTallas.includes(talla);

        const label = document.createElement('label');
        label.htmlFor = `talla-${mayoristaId}-${talla}`;
        label.textContent = talla;

        div.appendChild(checkbox);
        div.appendChild(label);
        tallaContainer.appendChild(div);
    });

    // Mostrar modal con animación
    setTimeout(() => {
        modal.classList.add('show');
    }, 10);

    // Cerrar modal al hacer clic fuera
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            closeFilterModal(modal);
        }
    });

    // Guardar referencia al modal
    modal.dataset.mayoristaId = mayoristaId;
}

function closeFilterModal(element) {
    const modal = element.closest('.filter-modal');
    if (modal) {
        modal.classList.remove('show');
        setTimeout(() => {
            if (document.body.contains(modal)) {
                document.body.removeChild(modal);
            }
        }, 300);
    }
}

function applyFilters(mayoristaId) {
    // Guardar filtros
    mayoristaFilters[mayoristaId].excludedColors = Array.from(
        document.querySelectorAll(`#colorFilters-${mayoristaId} input[type="checkbox"]:checked`)
    ).map(cb => cb.value);

    mayoristaFilters[mayoristaId].excludedTallas = Array.from(
        document.querySelectorAll(`#tallaFilters-${mayoristaId} input[type="checkbox"]:checked`)
    ).map(cb => cb.value);

    // Cerrar modal
    const modal = document.querySelector('.filter-modal');
    if (modal) {
        closeFilterModal(modal);
    }

    // Mostrar mensaje de confirmación
    const excludedColorsCount = mayoristaFilters[mayoristaId].excludedColors.length;
    const excludedTallasCount = mayoristaFilters[mayoristaId].excludedTallas.length;
    
    let message = 'Filtros aplicados';
    if (excludedColorsCount > 0 || excludedTallasCount > 0) {
        message += ` - Excluidos: ${excludedColorsCount} colores, ${excludedTallasCount} tallas`;
    }
    
    showMessage(message, 'success', 2000);

    // Si hay valor global, redistribuir
    const globalInput = document.querySelector(`.global-mayorista-input[data-mayorista="${mayoristaId}"]`);
    const valorGlobal = parseInt(globalInput?.value) || 0;

    if (valorGlobal > 0) {
        const distributeBtn = document.querySelector(`.distribute-btn[data-mayorista="${mayoristaId}"]`);
        if (distributeBtn) {
            distributeBtn.click();
        }
    }
}

function formatCellValue(value) {
    if (value == null) return '';
    if (Array.isArray(value)) return value.join(', ');
    if (typeof value === 'object') return JSON.stringify(value);
    return String(value);
}

function handleError(error) {
    console.error("Error:", error);
    
    // Ocultar loading
    document.getElementById('distribution-loading').style.display = 'none';
    document.getElementById('distribution-main').style.display = 'block';
    
    // Mostrar error en la UI
    document.getElementById('result').innerHTML = `
        <div class="error-state">
            <i class="codicon codicon-error"></i>
            <h5>Error al cargar datos</h5>
            <p>${error.message}</p>
            <button class="btn-primary" onclick="initializeDistribution()">Reintentar</button>
        </div>
    `;
}

function reloadAllData() {
    document.getElementById('distribution-loading').style.display = 'flex';
    document.getElementById('distribution-main').style.display = 'none';
    document.getElementById('result').innerHTML = '<div class="empty-state"><i class="codicon codicon-dashboard"></i><h5>Actualizando datos...</h5><p>Por favor espere...</p></div>';
    
    initializeDistribution();
}

// Funciones de distribución inteligente
function smartDistribution(availableRows, totalQty) {
    const totalAvailable = availableRows.reduce((sum, row) => sum + row.tdm, 0);
    const uniqueItems = availableRows.length;
    const scenario = classifyScenario(totalQty, uniqueItems, totalAvailable);

    switch (scenario) {
        case 'LOW_QUANTITY': return distributeLowQuantity(availableRows, totalQty);
        case 'BALANCED': return distributeBalanced(availableRows, totalQty);
        case 'HIGH_QUANTITY': return distributeHighQuantity(availableRows, totalQty);
        case 'LIMITED_STOCK': return distributeLimitedStock(availableRows, totalQty);
        default: return distributeDefault(availableRows, totalQty);
    }
}

function classifyScenario(totalQty, uniqueItems, totalAvailable) {
    const avgPerItem = totalQty / uniqueItems;
    const stockRatio = totalQty / totalAvailable;

    if (totalQty <= uniqueItems) return 'LOW_QUANTITY';
    else if (avgPerItem < 3 && stockRatio < 0.3) return 'BALANCED';
    else if (stockRatio > 0.7) return 'HIGH_QUANTITY';
    else if (totalAvailable / uniqueItems < 2) return 'LIMITED_STOCK';
    return 'DEFAULT';
}

function distributeLowQuantity(availableRows, totalQty) {
    const prioritized = [...availableRows].sort((a, b) => {
        const priorityA = (a.tdm * 0.7) + (a.historicRotation || 0.3);
        const priorityB = (b.tdm * 0.7) + (b.historicRotation || 0.3);
        return priorityB - priorityA;
    });

    return prioritized.map((row, index) => ({
        ...row,
        assigned: index < totalQty ? 1 : 0
    })).filter(row => row.assigned > 0);
}

function distributeBalanced(availableRows, totalQty) {
    const basePerItem = Math.floor(totalQty / availableRows.length);
    let remaining = totalQty - (basePerItem * availableRows.length);

    let distributed = availableRows.map(row => {
        const assigned = Math.min(basePerItem, row.tdm);
        return { ...row, assigned };
    });

    if (remaining > 0) {
        distributed.sort((a, b) => (b.tdm - b.assigned) - (a.tdm - a.assigned));

        for (let i = 0; i < distributed.length && remaining > 0; i++) {
            const available = distributed[i].tdm - distributed[i].assigned;
            if (available > 0) {
                distributed[i].assigned += 1;
                remaining -= 1;
            }
        }
    }

    return distributed;
}

function distributeHighQuantity(availableRows, totalQty) {
    const totalStock = availableRows.reduce((sum, row) => sum + row.tdm, 0);
    let remaining = totalQty;

    let distributed = availableRows.map(row => {
        const proportion = row.tdm / totalStock;
        let assigned = Math.max(1, Math.floor(proportion * totalQty));
        assigned = Math.min(assigned, row.tdm);
        remaining -= assigned;
        return { ...row, assigned };
    });

    if (remaining !== 0) {
        distributed.sort((a, b) => {
            const deviationA = (a.assigned / a.tdm) - (totalQty / totalStock);
            const deviationB = (b.assigned / b.tdm) - (totalQty / totalStock);
            return Math.abs(deviationB) - Math.abs(deviationA);
        });

        for (let i = 0; i < distributed.length && remaining !== 0; i++) {
            const row = distributed[i];
            const canAdd = remaining > 0 ? row.tdm - row.assigned : row.assigned;

            if (canAdd > 0) {
                const adjustment = remaining > 0 ? 1 : -1;
                row.assigned += adjustment;
                remaining -= adjustment;
            }
        }
    }

    return distributed;
}

function distributeLimitedStock(availableRows, totalQty) {
    const totalStock = availableRows.reduce((sum, row) => sum + row.tdm, 0);
    let remaining = totalQty;

    let distributed = availableRows.map(row => {
        let assigned = Math.min(1, row.tdm);
        remaining -= assigned;
        return { ...row, assigned };
    });

    if (remaining > 0) {
        const remainingStock = totalStock - availableRows.length;
        distributed.forEach(row => {
            if (remaining <= 0) return;

            const additional = Math.min(
                Math.floor((row.tdm - 1) / remainingStock * remaining),
                row.tdm - row.assigned
            );

            if (additional > 0) {
                row.assigned += additional;
                remaining -= additional;
            }
        });
    }

    if (remaining > 0) {
        distributed.sort((a, b) => b.tdm - a.tdm);
        for (let i = 0; i < distributed.length && remaining > 0; i++) {
            const available = distributed[i].tdm - distributed[i].assigned;
            if (available > 0) {
                const toAdd = Math.min(available, remaining);
                distributed[i].assigned += toAdd;
                remaining -= toAdd;
            }
        }
    }

    return distributed;
}

function distributeDefault(availableRows, totalQty) {
    const totalStock = availableRows.reduce((sum, row) => sum + row.tdm, 0);
    let remaining = totalQty;

    let distributed = availableRows.map(row => {
        const proportion = row.tdm / totalStock;
        let assigned = Math.floor(proportion * totalQty);
        assigned = Math.min(assigned, row.tdm);
        remaining -= assigned;
        return { ...row, assigned };
    });

    if (remaining > 0) {
        distributed.sort((a, b) => (b.tdm - b.assigned) - (a.tdm - a.assigned));

        for (let i = 0; i < distributed.length && remaining > 0; i++) {
            const available = distributed[i].tdm - distributed[i].assigned;
            if (available > 0) {
                distributed[i].assigned += 1;
                remaining -= 1;
            }
        }
    }

    return distributed;
}

// Funciones auxiliares
function showMessage(message, type = 'info', duration = 2000) {
    console.log(`${type.toUpperCase()}: ${message}`);
    alert(`${type.toUpperCase()}: ${message}`);
}

function showModuleSettings() {
    alert('Configuración del módulo de distribución');
}

function saveAllDistributionsFast() {
    showMessage('Función de guardar no implementada en esta versión', 'info');
}

function distributeEqually() {
    showMessage('Función de distribución equitativa', 'info');
}

function resetEmpresas() {
    empresasData.forEach(([id, config]) => {
        const input = document.getElementById(`empresa-${id}`);
        if (input && config.tipoEmpresa === "Secundaria") {
            input.value = '0';
        }
    });
    updatePrincipalValue();
    updateAllValues();
}

function exportToCSV() {
    showMessage('Función de exportar a CSV', 'info');
}

// Exportar funciones para uso externo si es necesario
window.DistributionModule = {
    initialize: initializeDistribution,
    searchRec: searchRec,
    selectAllMayoristas: selectAllMayoristas,
    deselectAllMayoristas: deselectAllMayoristas,
    saveDistributions: saveAllDistributionsFast,
    reloadData: reloadAllData
};