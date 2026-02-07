# PandaDash - Sistema de Gestión Logística & Escáner QR

Este proyecto es una **Progressive Web App (PWA)** diseñada para la gestión logística de entregas. Permite a los operarios escanear códigos QR de documentos de remisión, verificar las facturas asociadas y capturar evidencia fotográfica de la entrega, sincronizando todo con Google Sheets.

## 🚀 Características Principales

*   **PWA con Soporte Offline**: Funciona sin conexión gracias a una estrategia robusta de Service Workers (`sw.js`).
*   **Escáner QR Integrado**: Soporte para cámara del dispositivo y entrada manual (Lector USB).
*   **Gestión de Evidencia**: Captura de fotos con **marca de agua automática** (Fecha, Lote, Factura).
*   **Cola de Carga Resiliente**: Las fotos se guardan localmente si no hay internet y se suben automáticamente cuando la conexión se restablece.
*   **Arquitectura Modular**: Código JavaScript organizado en módulos funcionales para facilitar el mantenimiento.

---

## 📂 Estructura del Proyecto

El proyecto sigue una estructura limpia separando lógica, estilos y recursos:

```
/
├── index.html              # Punto de entrada de la aplicación
├── sw.js                   # Service Worker (Caché y soporte Offline)
├── manifest.json           # Manifiesto de la PWA (Iconos, colores, nombre)
├── css/                    # Estilos CSS
│   ├── estilos_base.css    # Variables globales y reset
│   ├── estilos_interfaz.css# Componentes UI (Tarjetas, modales)
│   └── ...
└── js/                     # Lógica de la Aplicación (Módulos)
    ├── configuracion.js    # Constantes globales y variables de entorno
    ├── inicio.js           # Inicialización y registro del Service Worker
    ├── principal.js        # Lógica central de datos (Integración Google Sheets)
    ├── datos.js            # Manejo de caché y persistencia de datos
    ├── renderizado.js      # Generación dinámica del DOM (HTML)
    ├── interfaz.js         # Interacciones de UI (Loading, Modales)
    ├── cola_carga.js       # Sistema de cola de subida (UploadQueue)
    ├── camara.js           # Lógica de cámara y procesamiento de imagen
    ├── qr_escaner.js       # Integración con librería html5-qrcode
    └── sonidos.js          # Feedback auditivo
```

---

## 🛠️ Descripción de Módulos (JavaScript)

### 1. Núcleo de Datos (`js/principal.js`)
Es el cerebro de datos de la aplicación. Se encarga de:
*   Conectarse a la API de Google Sheets (usando una API Key pública/restringida).
*   Obtener datos de múltiples fuentes (`DATA2`, `SIESA`, `REC`, `SOPORTES`).
*   **Algoritmo de Combinación**: Cruza los datos basándose en el número de `Lote` y `Documento` para agrupar múltiples facturas bajo un mismo registro de recepción (REC).

### 2. Cola de Carga (`js/cola_carga.js`)
Garantiza que ninguna foto se pierda. Implementa la clase `UploadQueue`:
*   **Persistencia**: Guarda los trabajos de subida en `localStorage`.
*   **Reintentos**: Si una subida falla, se reintenta hasta 3 veces.
*   **Sincronización**: Detecta eventos `online` para procesar la cola pendiente automáticamente.

### 3. Cámara y Procesamiento (`js/camara.js`)
Maneja la API `navigator.mediaDevices`:
*   Abre la cámara trasera (`environment`).
*   Captura el frame en un `<canvas>`.
*   **Marca de Agua**: Dibuja texto sobre la imagen (Factura, Lote, Fecha) antes de subirla.
*   Convierte la imagen a `Blob` y luego a `Base64` para el envío.

### 4. Renderizado (`js/renderizado.js`)
Separa la lógica de presentación de los datos. Contiene funciones que reciben objetos JSON y devuelven cadenas HTML template literals para insertar en el DOM.

---

## 💾 Estructura de Datos

A continuación, se detalla la estructura de los objetos principales utilizados en la aplicación.

### 📦 Objeto "Documento" (Registro Combinado)
Es el objeto principal que se visualiza tras un escaneo exitoso.

```javascript
{
  "documento": "REC58101",     // ID del documento escaneado
  "lote": "12345",             // Lote de producción
  "referencia": "REF-ABC",     // Referencia principal
  "fuente": "DATA2",           // Origen del dato (DATA2 o REC)
  "datosSiesa": [              // Array de facturas asociadas
    {
      "factura": "FEV1000",
      "nit": "900123456",
      "cliente": "NOMBRE CLIENTE SAS",
      "cantidad": 50,
      "estado": "Aprobado",
      "confirmacion": "ENTREGADO", // Estado local de entrega
      "Ih3": "https://..."         // URL de la foto (si ya existe)
    },
    // ... más facturas
  ]
}
```

### 📤 Objeto "Job" (Cola de Subida)
Este objeto se crea cuando se toma una foto y se añade a la cola.

```javascript
{
  "id": "x7z9y1...",           // ID único generado
  "type": "photo",             // Tipo de trabajo
  "timestamp": "2023-10-...",  // Fecha de creación
  "status": "pending",         // pending | processing | retrying | error
  "retries": 0,                // Contador de intentos
  "factura": "FEV1000",        // ID de referencia
  "data": {                    // Payload para el servidor
    "documento": "REC58101",
    "factura": "FEV1000",
    "lote": "12345",
    "fotoBase64": "...",       // String base64 de la imagen
    "fotoNombre": "FEV1000_123.jpg",
    "fotoTipo": "image/jpeg"
  }
}
```

---

## 🌐 API Integración

La aplicación se comunica con un backend ligero desplegado en **Google Apps Script**.

*   **GET (Sheets API)**: Lectura directa de las hojas de cálculo para velocidad.
*   **POST (Apps Script URL)**: Endpoint (`API_URL_POST` en `configuracion.js`) que recibe el JSON de la imagen, la decodifica y la guarda en Google Drive, actualizando la hoja de `SOPORTES`.

## 📦 Instalación y Despliegue

1.  **Requisitos**: Servidor Web (Apache, Nginx, o Hosting Estático).
2.  **HTTPS**: **Obligatorio** para usar la cámara y Service Workers.
3.  **Configuración**:
    *   Editar `js/configuracion.js` si cambian las URLs de las APIs.
    *   Asegurar que los archivos en `js/` se carguen en el orden correcto en `index.html` (Configuración antes que dependencias).

---
*Desarrollado para optimizar procesos logísticos internos.*
