// quagga-config.js
// Archivo que define la configuración de Quagga2
// Se carga como módulo (type="module" en index), pero la librería Quagga fue cargada previamente como UMD
export const quaggaConfig = {
  inputStream: {
    type: "LiveStream",
    constraints: {
      width: { min: 640 },
      height: { min: 480 },
      facingMode: "environment", // cámara trasera
      aspectRatio: { ideal: 1.777 }
    },
    area: { // define una zona de interés (porcentual)
      top: "20%",    // top offset
      right: "10%",
      left: "10%",
      bottom: "20%"
    },
    target: "cameraContainer", // id del contenedor en el DOM
    singleChannel: false // color
  },
  locator: {
    patchSize: "medium",
    halfSample: true
  },
  numOfWorkers: navigator.hardwareConcurrency ? Math.max(1, Math.floor(navigator.hardwareConcurrency / 2)) : 2,
  decoder: {
    readers: [
      "code_128_reader",
      "ean_reader",
      "ean_8_reader",
      "code_39_reader",
      "upc_reader",
      "upc_e_reader",
      "codabar_reader",
      "i2of5_reader",
      "2of5_reader"
    ],
    multiple: false
  },
  locate: true,
  debug: {
    drawBoundingBox: false,
    showFrequency: false,
    drawScanline: false,
    showPattern: false
  }
};
