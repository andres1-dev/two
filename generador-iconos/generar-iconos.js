{
  "name": "generador-iconos-pwa",
  "version": "1.0.0",
  "description": "Generador de iconos para PWA con soporte iOS",
  "main": "generar-iconos.js",
  "scripts": {
    "start": "node generar-iconos.js",
    "generar": "node generar-iconos.js",
    "ios": "node generar-iconos.js --ios",
    "android": "node generar-iconos.js --android"
  },
  "keywords": ["pwa", "icons", "ios", "android", "generator"],
  "author": "",
  "license": "MIT",
  "dependencies": {
    "sharp": "^0.33.0",
    "fs-extra": "^11.1.1",
    "chalk": "^4.1.2",
    "ora": "^5.4.1"
  }
}