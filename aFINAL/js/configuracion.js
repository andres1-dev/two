// Configuración y constantes globales
const CONFIG = {
    VERSION: "4.0.0",
    CACHE_TTL: 24 * 60 * 60 * 1000, // 24 horas en milisegundos
    MAX_IMAGE_SIZE: 800, // Tamaño máximo para redimensionar imágenes
    MAX_CHUNK_SIZE: 50000, // ~50KB por solicitud
};

// API_URL NOMBRE EN GAS : doPost NEW [ PandaDash ]
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
const MAX_RETRIES = 5;