// Generador dinámico de iconos para PWA - PandaDash con React Logo
const IconGenerator = {
    // Configuración de iconos - TODOS los tamaños requeridos
    sizes: [192, 256, 384, 512, 1024],
    
    // Colores del tema React
    backgroundColor: '#ffffff',
    primaryColor: '#61dafb', // Azul React
    secondaryColor: '#282c34', // Gris oscuro React
    iconColor: '#61dafb',
    
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
        console.log('[PWA] Generando iconos dinámicos con React...');
        
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
        
        console.log(`[PWA] ✓ ${icons.length} iconos de React generados`);
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
                this.drawMaskableIcon(size);
            } else {
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
        
        // Círculo de fondo con gradiente
        const padding = size * 0.1;
        const circleSize = size - (padding * 2);
        
        // Gradiente radial para el fondo
        const gradient = this.ctx.createRadialGradient(
            size/2, size/2, 0,
            size/2, size/2, circleSize/2
        );
        gradient.addColorStop(0, '#f0f9ff');
        gradient.addColorStop(1, '#e6f3ff');
        
        this.ctx.beginPath();
        this.ctx.arc(size/2, size/2, circleSize/2, 0, Math.PI * 2);
        this.ctx.fillStyle = gradient;
        this.ctx.fill();
        
        // Borde sutil
        this.ctx.beginPath();
        this.ctx.arc(size/2, size/2, circleSize/2, 0, Math.PI * 2);
        this.ctx.strokeStyle = '#b0e0ff';
        this.ctx.lineWidth = size * 0.01;
        this.ctx.stroke();
        
        // Dibujar logo de React
        this.drawReactLogo(size);
    },
    
    // Dibuja icono maskable (área segura para Android)
    drawMaskableIcon(size) {
        // Fondo de color sólido
        this.ctx.fillStyle = this.backgroundColor;
        this.ctx.fillRect(0, 0, size, size);
        
        // Área segura (80% del centro)
        const safeArea = size * 0.8;
        
        // Gradiente para maskable
        const gradient = this.ctx.createRadialGradient(
            size/2, size/2, 0,
            size/2, size/2, safeArea/2
        );
        gradient.addColorStop(0, '#f0f9ff');
        gradient.addColorStop(1, '#d9eeff');
        
        // Fondo circular dentro del área segura
        this.ctx.beginPath();
        this.ctx.arc(size/2, size/2, safeArea/2 * 0.9, 0, Math.PI * 2);
        this.ctx.fillStyle = gradient;
        this.ctx.fill();
        
        // Borde con color primario
        this.ctx.beginPath();
        this.ctx.arc(size/2, size/2, safeArea/2 * 0.9, 0, Math.PI * 2);
        this.ctx.strokeStyle = this.primaryColor;
        this.ctx.lineWidth = size * 0.015;
        this.ctx.stroke();
        
        // Logo React más grande para maskable
        this.drawReactLogo(size, 0.6); // 60% del tamaño
    },
    
    // Dibuja el logo de React (átomo)
    drawReactLogo(size, scaleFactor = 0.5) {
        const iconSize = size * scaleFactor;
        const centerX = size / 2;
        const centerY = size / 2;
        
        // === NÚCLEO CENTRAL ===
        // Círculo central con gradiente
        const coreGradient = this.ctx.createRadialGradient(
            centerX - iconSize * 0.02, centerY - iconSize * 0.02, 0,
            centerX, centerY, iconSize * 0.15
        );
        coreGradient.addColorStop(0, '#61dafb');
        coreGradient.addColorStop(1, '#4fa8c9');
        
        this.ctx.fillStyle = coreGradient;
        this.ctx.beginPath();
        this.ctx.arc(centerX, centerY, iconSize * 0.15, 0, Math.PI * 2);
        this.ctx.fill();
        
        // Reflejo en el núcleo
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
        this.ctx.beginPath();
        this.ctx.arc(centerX - iconSize * 0.03, centerY - iconSize * 0.03, iconSize * 0.04, 0, Math.PI * 2);
        this.ctx.fill();
        
        // === ANILLOS ORBITALES ===
        this.ctx.lineWidth = iconSize * 0.06;
        this.ctx.lineCap = 'round';
        
        // Anillo 1 - Horizontal (0°)
        this.ctx.strokeStyle = '#61dafb';
        this.ctx.beginPath();
        this.ctx.ellipse(centerX, centerY, iconSize * 0.4, iconSize * 0.12, 0, 0, Math.PI * 2);
        this.ctx.stroke();
        
        // Anillo 2 - Rotado 60°
        this.ctx.strokeStyle = '#4fa8c9';
        this.ctx.beginPath();
        this.ctx.ellipse(centerX, centerY, iconSize * 0.4, iconSize * 0.12, Math.PI / 3, 0, Math.PI * 2);
        this.ctx.stroke();
        
        // Anillo 3 - Rotado 120°
        this.ctx.strokeStyle = '#3d8caa';
        this.ctx.beginPath();
        this.ctx.ellipse(centerX, centerY, iconSize * 0.4, iconSize * 0.12, Math.PI / 1.5, 0, Math.PI * 2);
        this.ctx.stroke();
        
        // === ELECTRONES ===
        // Pequeñas esferas en los anillos para dar sensación de movimiento
        this.ctx.fillStyle = '#61dafb';
        
        // Electrón 1 (anillo horizontal)
        this.ctx.beginPath();
        this.ctx.arc(centerX + iconSize * 0.4, centerY, iconSize * 0.06, 0, Math.PI * 2);
        this.ctx.fill();
        
        // Electrón 2 (anillo 60°)
        const angle60 = Math.PI / 3;
        this.ctx.beginPath();
        this.ctx.arc(
            centerX + iconSize * 0.4 * Math.cos(angle60),
            centerY + iconSize * 0.12 * Math.sin(angle60),
            iconSize * 0.06, 0, Math.PI * 2
        );
        this.ctx.fill();
        
        // Electrón 3 (anillo 120°)
        const angle120 = Math.PI / 1.5;
        this.ctx.beginPath();
        this.ctx.arc(
            centerX + iconSize * 0.4 * Math.cos(angle120),
            centerY + iconSize * 0.12 * Math.sin(angle120),
            iconSize * 0.06, 0, Math.PI * 2
        );
        this.ctx.fill();
        
        // Brillo adicional
        this.ctx.shadowColor = '#61dafb';
        this.ctx.shadowBlur = iconSize * 0.1;
        this.ctx.strokeStyle = '#61dafb';
        this.ctx.lineWidth = iconSize * 0.04;
        this.ctx.beginPath();
        this.ctx.ellipse(centerX, centerY, iconSize * 0.4, iconSize * 0.12, 0, 0, Math.PI * 2);
        this.ctx.stroke();
        this.ctx.shadowBlur = 0;
    },
    
    // Actualiza el manifest.json con iconos dinámicos
    async updateManifest() {
        try {
            const icons = await this.generateAllIcons();
            
            const manifest = {
                name: "PandaDash",
                short_name: "PandaDash",
                description: "Sistema de gestión y escaneo de códigos QR para entregas",
                start_url: "./",
                scope: "./",
                display: "standalone",
                background_color: "#ffffff",
                theme_color: "#61dafb", // Color React
                lang: "es-ES",
                dir: "ltr",
                orientation: "portrait",
                categories: ["business", "productivity", "utilities", "developer-tools"],
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
            
            if (window.manifestObjectURL) {
                URL.revokeObjectURL(window.manifestObjectURL);
            }
            
            manifestLink.href = manifestURL;
            window.manifestObjectURL = manifestURL;
            
            console.log('[PWA] ✓ Manifest actualizado con iconos de React');
            
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

// Auto-ejecutar al cargar la página
if (typeof window !== 'undefined') {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            IconGenerator.updateManifest();
        });
    } else {
        IconGenerator.updateManifest();
    }
}