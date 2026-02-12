// ============================================
// CONFIGURACIÓN Y CONSTANTES GLOBALES
// ============================================

// API Keys y URLs
const API_KEY = 'AIzaSyC7hjbRc0TGLgImv8gVZg8tsOeYWgXlPcM';
const SPREADSHEET_ID = '133NiyjNApZGkEFs4jUvpJ9So-cSEzRVeW2FblwOCrjI';
const GAS_URL = 'https://script.google.com/macros/s/AKfycbyM5AsR4WOLdfPWBp4uW_diONnaiaAThobOUE1Q4kwgSMXSsuorpdsmT8c52CeDXPgI/exec';

// Constantes de Distribución
const DIS_API_KEY = API_KEY;
const DISTRIBUTION_API_KEY = DIS_API_KEY;
const SOURCE_SPREADSHEET_ID = "1esc5REq0c03nHLpGcLwZRW29yq2gZnrpbz75gCCjrqc";
const DISTRIBUTION_SPREADSHEET_ID = '1d5dCCCgiWXfM6vHu3zGGKlvK2EycJtT7Uk4JqUjDOfE';
const DISTRIBUTION_SHEET_NAME = 'DATA';
const DISTRIBUTION_GAS_URL = 'https://script.google.com/macros/s/AKfycbzjzmTx_vvl_wGYY9A1_7kP13XH30BGhxgtvf5EXpGDwJ5Wat8DhSOEHM-kx6J2j51DmA/exec';

// ============================================
// MAPAS DE CONFIGURACIÓN
// ============================================

const escanersMap = {
    "LORTIZ": "LEIDY TATIANA ORTIZ",
    "PESCOBEDO": "PAOLA ANDREA ESCOBEDO JUSPIAN",
    "PSANCHEZ": "PAULA VANESSA SANCHEZ ERAZO",
    "APOLO": "ANGIE LIZETH POLO CAPERA",
    "KFERNANDEZ": "KELLY TATIANA FERNANDEZ ASTUDILLO",
    "MONCALEANO": "NICOLE VALERIA MONCALEANO DIAZ",
    "LOCHOA": "LESLY CAMILA OCHOA PEDRAZA",
    "PJARAMILLO": "PILAR CRISTINA JARAMILLO SANCHEZ",
    "CMENDOZA": "CARLOS ANDRES MENDOZA ARIAS"
};

const bodegasMap = {
    "DI": "PRIMERAS",
    "ZY": "SIN CONFECCIONAR",
    "ZZ": "PROMOCIONES",
    "BP": "COBROS",
    "XT": "TRANSITO",
    "PR": "CONTABLE"
};

const tiposMap = {
    "AT": "AJUSTE TALLAS",
    "EC": "ENTRADA CORTE",
    "SA": "SALIDA ALMACEN",
    "SC": "SALIDA COBRO",
    "ST": "SALIDA AJUSTE",
    "TR": "TRASLADO"
};

// ============================================
// VARIABLES GLOBALES DE ESTADO (singleton)
// ============================================

// Datos principales
let processedData = [];
let coloresMap = new Map();
let data2Map = new Map();
let preciosMap = new Map();
let sisproMap = new Map();
let historicasMap = new Map();
let clientesMap = new Map();
let currentOPData = null;
let cancelledTransfers = new Set();
let transferListData = [];

// Variables de distribución
let allRecData = [];
let allConfigData = {};
let activeMayoristas = [];
let empresasData = [];
let currentRecData = null;
let colorOptions = [];
let tallaOptions = [];
let mayoristaFilters = {};

// Estado de distribución
let empresasDistributionState = -1;

// ============================================
// FUNCIONES DE ACCESO A VARIABLES GLOBALES
// ============================================

function setProcessedData(data) {
    processedData = data;
}

function setCurrentOPData(data) {
    currentOPData = data;
}

function addCancelledTransfer(transfer) {
    cancelledTransfers.add(transfer);
}

function removeCancelledTransfer(transfer) {
    cancelledTransfers.delete(transfer);
}

function clearCancelledTransfers() {
    cancelledTransfers.clear();
}

// Setters para variables de distribución
function setAllRecData(data) {
    allRecData = data;
}

function setAllConfigData(data) {
    allConfigData = data;
}

function setActiveMayoristas(data) {
    activeMayoristas = data;
}

function setEmpresasData(data) {
    empresasData = data;
}

function setCurrentRecData(data) {
    currentRecData = data;
}

function setColorOptions(data) {
    colorOptions = data;
}

function setTallaOptions(data) {
    tallaOptions = data;
}

function setMayoristaFilters(data) {
    mayoristaFilters = data;
}

function setMayoristaFilter(id, filter) {
    mayoristaFilters[id] = filter;
}

function setEmpresasDistributionState(state) {
    empresasDistributionState = state;
}