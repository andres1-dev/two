// Generador dinámico de iconos para PWA - PandaDash
// Versión estable con soporte completo para instalación PWA
const IconGenerator = {
    // Configuración de iconos - TODOS los tamaños requeridos
    sizes: [192, 256, 384, 512, 1024],
    
    // Colores del tema PandaDash
    backgroundColor: '#ffffff',
    primaryColor: '#4361ee', // Azul principal
    secondaryColor: '#3a0ca3', // Azul oscuro para detalles
    iconColor: '#4361ee',
    
    // Canvas oculto
    canvas: null,
    ctx: null,
    
    init() {
        this.canvas = document.createElement('canvas');
        this.ctx = this.canvas.getContext('2d', { 
            alpha: true,
            antialias: true 
        });
    },
    
    // Genera TODOS los iconos necesarios para PWA
    async generateAllIcons() {
        this.init();
        console.log('[PWA] Generando iconos dinámicos para instalación...');
        
        const icons = [];
        
        for (const size of this.sizes) {
            // Icono normal (any purpose)
            const normalIcon = await this.generateIcon(size, 'any');
            icons.push({
                src: normalIcon,
                sizes: `${size}x${size}`,
                type: 'image/png',
                purpose: 'any'
            });
            
            // Icono maskable para Android 512x512
            if (size === 512) {
                const maskableIcon = await this.generateIcon(size, 'maskable');
                icons.push({
                    src: maskableIcon,
                    sizes: `${size}x${size}`,
                    type: 'image/png',
                    purpose: 'maskable'
                });
            }
        }
        
        // Icono adicional para Apple Touch (180x180)
        const appleIcon = await this.generateIcon(180, 'any');
        icons.push({
            src: appleIcon,
            sizes: '180x180',
            type: 'image/png',
            purpose: 'any'
        });
        
        console.log(`[PWA] ✓ ${icons.length} iconos generados correctamente`);
        return icons;
    },
    
    // Genera un icono individual con propósito específico
    generateIcon(size, purpose = 'any') {
        return new Promise((resolve) => {
            this.canvas.width = size;
            this.canvas.height = size;
            
            // Limpiar canvas
            this.ctx.clearRect(0, 0, size, size);
            
            if (purpose === 'maskable') {
                // Para maskable: el icono debe llenar el área segura (80% del canvas)
                this.drawMaskableIcon(size);
            } else {
                // Para any: icono normal con padding
                this.drawStandardIcon(size);
            }
            
            // Convertir a PNG de alta calidad
            resolve(this.canvas.toDataURL('image/png', 1.0));
        });
    },
    
    // Dibuja icono estándar con padding
    drawStandardIcon(size) {
        // Fondo blanco
        this.ctx.fillStyle = this.backgroundColor;
        this.ctx.fillRect(0, 0, size, size);
        
        // Círculo de fondo suave
        const padding = size * 0.1;
        const circleSize = size - (padding * 2);
        
        this.ctx.beginPath();
        this.ctx.arc(size/2, size/2, circleSize/2, 0, Math.PI * 2);
        this.ctx.fillStyle = '#f8fafc';
        this.ctx.fill();
        
        // Borde sutil
        this.ctx.beginPath();
        this.ctx.arc(size/2, size/2, circleSize/2, 0, Math.PI * 2);
        this.ctx.strokeStyle = '#e2e8f0';
        this.ctx.lineWidth = size * 0.01;
        this.ctx.stroke();
        
        // Dibujar logo QR
        this.drawQRLogo(size);
    },
    
    // Dibuja icono maskable (área segura para Android)
    drawMaskableIcon(size) {
        // Fondo de color sólido (llenar todo el canvas)
        this.ctx.fillStyle = this.backgroundColor;
        this.ctx.fillRect(0, 0, size, size);
        
        // Área segura (80% del centro)
        const safeArea = size * 0.8;
        const startX = (size - safeArea) / 2;
        const startY = (size - safeArea) / 2;
        
        // Fondo circular dentro del área segura
        this.ctx.beginPath();
        this.ctx.arc(size/2, size/2, safeArea/2 * 0.9, 0, Math.PI * 2);
        this.ctx.fillStyle = '#f8fafc';
        this.ctx.fill();
        
        // Borde
        this.ctx.beginPath();
        this.ctx.arc(size/2, size/2, safeArea/2 * 0.9, 0, Math.PI * 2);
        this.ctx.strokeStyle = this.primaryColor;
        this.ctx.lineWidth = size * 0.02;
        this.ctx.stroke();
        
        // Logo más grande para maskable
        this.drawQRLogo(size, 0.6); // 60% del tamaño
    },
    
    // Dibuja el logo de QR de FontAwesome
    drawQRLogo(size, scaleFactor = 0.5) {
        const iconSize = size * scaleFactor;
        const startX = (size - iconSize) / 2;
        const startY = (size - iconSize) / 2;
        const cellSize = iconSize / 9; // Grid 9x9 para más detalle
        
        this.ctx.fillStyle = this.primaryColor;
        
        // Dibujar cuadrícula de QR estilizada
        for (let i = 0; i < 9; i++) {
            for (let j = 0; j < 9; j++) {
                // Patrón de QR reconocible
                if ((i < 3 && j < 3) || // Esquina superior izquierda
                    (i < 3 && j > 5) || // Esquina superior derecha
                    (i > 5 && j < 3) || // Esquina inferior izquierda
                    (i === 4 || j === 4) || // Línea central
                    (i === j) || // Diagonal principal
                    (i + j === 8) || // Diagonal secundaria
                    (i % 2 === 0 && j % 2 === 0)) { // Patrón de puntos
                    
                    this.ctx.fillRect(
                        startX + j * cellSize,
                        startY + i * cellSize,
                        cellSize * 0.8,
                        cellSize * 0.8
                    );
                }
            }
        }
        
        // Detalle central
        this.ctx.fillStyle = this.secondaryColor;
        this.ctx.beginPath();
        this.ctx.arc(size/2, size/2, cellSize * 0.8, 0, Math.PI * 2);
        this.ctx.fill();
    },
    
    // Actualiza el manifest.json con iconos dinámicos
    async updateManifest() {
        try {
            const icons = await this.generateAllIcons();
            
            // Manifest completo con TODOS los campos requeridos para PWA
            const manifest = {
                name: "PandaDash",
                short_name: "PandaDash",
                description: "Sistema de gestión y escaneo de códigos QR para entregas",
                start_url: "./",
                scope: "./",
                display: "standalone",
                background_color: "#ffffff",
                theme_color: "#4361ee", // Color primario para la barra
                lang: "es-ES",
                dir: "ltr",
                orientation: "portrait",
                categories: ["business", "productivity", "utilities"],
                prefer_related_applications: false,
                icons: icons
            };
            
            // Crear blob y URL
            const manifestJSON = JSON.stringify(manifest, null, 2);
            const blob = new Blob([manifestJSON], { type: 'application/json' });
            const manifestURL = URL.createObjectURL(blob);
            
            // Actualizar link manifest
            let manifestLink = document.querySelector('link[rel="manifest"]');
            if (!manifestLink) {
                manifestLink = document.createElement('link');
                manifestLink.rel = 'manifest';
                document.head.appendChild(manifestLink);
            }
            
            // Asignar nueva URL y limpiar anterior
            if (window.manifestObjectURL) {
                URL.revokeObjectURL(window.manifestObjectURL);
            }
            
            manifestLink.href = manifestURL;
            window.manifestObjectURL = manifestURL;
            
            console.log('[PWA] ✓ Manifest actualizado - App instalable lista');
            
            // También generar favicon y apple touch icons
            this.generateAppleIcons();
            this.generateFavicon();
            
            return true;
        } catch (error) {
            console.error('[PWA] Error actualizando manifest:', error);
            return false;
        }
    },
    
    // Genera iconos específicos para Apple
    generateAppleIcons() {
        const appleSizes = [120, 152, 167, 180];
        
        appleSizes.forEach(size => {
            this.generateIcon(size, 'any').then(dataUrl => {
                let link = document.querySelector(`link[rel="apple-touch-icon"][sizes="${size}x${size}"]`);
                if (!link) {
                    link = document.createElement('link');
                    link.rel = 'apple-touch-icon';
                    link.sizes = `${size}x${size}`;
                    document.head.appendChild(link);
                }
                link.href = dataUrl;
            });
        });
    },
    
    // Genera favicon
    generateFavicon() {
        const favicon = document.querySelector('link[rel="icon"]');
        if (favicon) {
            this.generateIcon(32, 'any').then(dataUrl => {
                favicon.href = dataUrl;
            });
        }
    }
};

// Iniciar generación automáticamente
window.IconGenerator = IconGenerator;