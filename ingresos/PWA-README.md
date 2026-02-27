# PWA - Sistema de Ingresos de Marca Propia

## Características de la PWA

Esta aplicación está configurada como una Progressive Web App (PWA) completamente funcional con:

✅ **Instalable**: Se puede instalar en cualquier dispositivo (móvil, tablet, desktop)
✅ **Offline**: Funciona sin conexión gracias al Service Worker
✅ **Rutas Relativas**: Funciona en cualquier ruta de GitHub Pages o servidor
✅ **Iconos Adaptativos**: Incluye iconos para todas las plataformas
✅ **Actualización Automática**: El Service Worker se actualiza automáticamente

## Estructura de Archivos PWA

```
/
├── manifest.json          # Configuración de la PWA
├── sw.js                  # Service Worker (cache y offline)
├── js/pwa/sw_init.js     # Inicialización del SW
└── icons/                 # Iconos de la aplicación
    ├── icon-192.png      # Icono principal
    ├── icon-256.png
    ├── icon-384.png
    ├── icon-512.png      # Icono de alta resolución
    └── icon-512-maskable.png  # Icono adaptativo
```

## Cómo Funciona

### 1. Manifest.json
- Define el nombre, colores y comportamiento de la app
- Usa rutas relativas (`./`) para funcionar en cualquier ubicación
- Especifica los iconos en diferentes tamaños

### 2. Service Worker (sw.js)
- Cachea los archivos esenciales para funcionamiento offline
- Estrategia: Network First con fallback a Cache
- Se actualiza automáticamente cuando hay cambios

### 3. Inicialización (sw_init.js)
- Registra el Service Worker con la ruta correcta
- Detecta el evento de instalación
- Muestra el botón de instalación cuando está disponible

## Instalación en Diferentes Dispositivos

### Android (Chrome/Edge)
1. Abre la aplicación en el navegador
2. Aparecerá un banner "Agregar a pantalla de inicio"
3. O toca el menú (⋮) > "Instalar aplicación"

### iOS (Safari)
1. Abre la aplicación en Safari
2. Toca el botón de compartir (□↑)
3. Selecciona "Agregar a pantalla de inicio"
4. Confirma el nombre y toca "Agregar"

### Desktop (Chrome/Edge)
1. Abre la aplicación en el navegador
2. Verás un icono de instalación (+) en la barra de direcciones
3. O ve a menú (⋮) > "Instalar [nombre de la app]"

## Despliegue en GitHub Pages

La PWA funciona automáticamente en cualquier ruta de GitHub Pages:

```
https://usuario.github.io/repositorio/
https://usuario.github.io/repositorio/carpeta/
https://usuario.github.io/repositorio/cualquier/ruta/
```

No necesitas cambiar ninguna configuración, las rutas son relativas.

## Actualización de la PWA

Cuando hagas cambios en el código:

1. Actualiza la versión en `sw.js`:
   ```javascript
   const CACHE_NAME = 'ingresos-mp-v2'; // Incrementa el número
   ```

2. El Service Worker detectará el cambio automáticamente
3. Los usuarios recibirán la actualización en su próxima visita

## Verificación

Para verificar que la PWA funciona correctamente:

1. Abre Chrome DevTools (F12)
2. Ve a la pestaña "Application"
3. Verifica:
   - ✅ Manifest: Debe mostrar todos los datos
   - ✅ Service Workers: Debe estar "activated and running"
   - ✅ Cache Storage: Debe mostrar los archivos cacheados

## Características Adicionales

### Gesto de Actualización
- Desliza con 3 dedos hacia abajo para forzar actualización
- Útil para recargar datos sin cerrar la app

### Colores del Tema
- Color principal: `#2563eb` (azul)
- Se aplica a la barra de estado en móviles
- Coincide con el diseño de la aplicación

## Soporte de Navegadores

| Navegador | Instalación | Offline | Notificaciones |
|-----------|-------------|---------|----------------|
| Chrome    | ✅          | ✅      | ✅             |
| Edge      | ✅          | ✅      | ✅             |
| Safari    | ✅          | ✅      | ❌             |
| Firefox   | ⚠️          | ✅      | ✅             |

⚠️ Firefox soporta PWAs pero no muestra el prompt de instalación automáticamente

## Troubleshooting

### La PWA no se instala
- Verifica que estés usando HTTPS (GitHub Pages lo usa automáticamente)
- Asegúrate de que el manifest.json sea accesible
- Revisa la consola de DevTools por errores

### El Service Worker no se registra
- Verifica que sw.js esté en la raíz del proyecto
- Revisa que no haya errores de sintaxis en sw.js
- Limpia el cache del navegador y recarga

### Los iconos no se muestran
- Verifica que la carpeta `icons/` exista
- Asegúrate de que los archivos PNG sean válidos
- Revisa las rutas en manifest.json

## Mantenimiento

Para mantener la PWA actualizada:

1. **Agregar nuevos archivos al cache**: Edita `urlsToCache` en `sw.js`
2. **Cambiar iconos**: Reemplaza los archivos en `/icons/`
3. **Actualizar información**: Edita `manifest.json`
4. **Incrementar versión**: Cambia `CACHE_NAME` en `sw.js`

---

**Desarrollado por**: Andrés Mendoza © 2026
**Versión**: 1.0.0
