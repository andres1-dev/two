// Configuración y constantes globales
const CONFIG = {
    VERSION: "5.0.0", // Updated version
    CACHE_TTL: 24 * 60 * 60 * 1000, // 24 horas en milisegundos
    MAX_IMAGE_SIZE: 800, // Tamaño máximo para redimensionar imágenes
    MAX_CHUNK_SIZE: 50000, // ~50KB por solicitud
};

// Mapeo de clientes a NIT (Movido aquí para acceso global)
const CLIENTS_MAP = {
    "INVERSIONES URBANA SAS": "901920844",
    "EL TEMPLO DE LA MODA FRESCA SAS": "900047252",
    "EL TEMPLO DE LA MODA SAS": "805027653",
    "ARISTIZABAL LOPEZ JESUS MARIA": "70825517",
    "QUINTERO ORTIZ JOSE ALEXANDER": "14838951",
    "QUINTERO ORTIZ PATRICIA YAMILET": "67006141",
    "ZULUAGA GOMEZ RUBEN ESTEBAN": "1007348825",
    "SON Y LIMON SAS": "900355664"
};

// Configuración de Usuario (con persistencia)
const DEFAULT_SETTINGS = {
    persistentFocus: true,
    filterEnabled: false,
    selectedClient: ""
};

let USER_SETTINGS = { ...DEFAULT_SETTINGS };

// Cargar configuración guardada
try {
    const savedSettings = localStorage.getItem('pdaUserSettings');
    if (savedSettings) {
        // Cargar ajustes pero siempre resetear persistentFocus a false al inicio
        const parsed = JSON.parse(savedSettings);
        USER_SETTINGS = { ...DEFAULT_SETTINGS, ...parsed };
    }
} catch (e) {
    console.error("Error cargando configuración usuario:", e);
}

// SIEMPRE iniciar desactivado para no afectar otros inputs
USER_SETTINGS.persistentFocus = false;

function saveUserSettings() {
    try {
        // Guardamos todo para mantener otras prefs, pero al cargar se ignora el focus
        localStorage.setItem('pdaUserSettings', JSON.stringify(USER_SETTINGS));
    } catch (e) {
        console.error("Error guardando configuración:", e);
    }
}

// API_URL
const API_URL_POST = "https://script.google.com/macros/s/AKfycbyOwBp1er4nu9Uth2nS5rY2tYfvY-NMdWJkA3dIjmuaVUTLvnUyKtJIG62ACK22RpNWRQ/exec";

// Variables globales de estado
let database = [];
let cameraStream = null;
let currentDocumentData = null;
let photoBlob = null;
let preventKeyboardTimer = null;
let currentQRParts = null;
let dataLoaded = false;

// Constantes para la cola de carga
const UPLOAD_QUEUE_KEY = 'pdaUploadQueue';
const MAX_RETRIES = 9999; // Ilimitados intentos

// La cola de carga se inicializa globalmente en cola_carga.js (window.uploadQueue)
// ya que cola_carga.js se cargará después de este archivo de configuración.
