const sharp = require('sharp');
const fs = require('fs-extra');
const path = require('path');

// Configuración de tamaños
const CONFIG = {
    android: [
        { size: 72, name: 'icon-72x72.png' },
        { size: 96, name: 'icon-96x96.png' },
        { size: 128, name: 'icon-128x128.png' },
        { size: 144, name: 'icon-144x144.png' },
        { size: 152, name: 'icon-152x152.png' },
        { size: 192, name: 'icon-192x192.png' },
        { size: 384, name: 'icon-384x384.png' },
        { size: 512, name: 'icon-512x512.png' },
        { size: 1024, name: 'icon-1024x1024.png' }
    ],
    ios: [
        { size: 120, name: 'icon-ios-120x120.png' },
        { size: 152, name: 'icon-ios-152x152.png' },
        { size: 167, name: 'icon-ios-167x167.png' },
        { size: 180, name: 'icon-ios-180x180.png' }
    ],
    notifications: [
        { size: 72, name: 'icon-notification-72x72.png' }
    ],
    web: [
        { size: 16, name: 'favicon-16x16.png' },
        { size: 32, name: 'favicon-32x32.png' },
        { size: 48, name: 'favicon-48x48.png' }
    ]
};

async function generarIconos() {
    console.log('🔄 GENERADOR DE ICONOS PWA\n');
    
    // Verificar archivo original
    const originalPath = path.join(__dirname, 'original', 'logo.png');
    const originalExists = await fs.pathExists(originalPath);
    
    if (!originalExists) {
        console.log('❌ No se encontró el archivo original/logo.png');
        console.log('📌 Por favor, coloca tu archivo PNG en:');
        console.log(`   ${originalPath}\n`);
        return;
    }
    
    console.log('✅ Archivo original encontrado\n');
    
    // Cargar imagen original
    const originalImage = sharp(originalPath);
    const metadata = await originalImage.metadata();
    console.log(`📊 Imagen cargada: ${metadata.width}x${metadata.height}\n`);

    // Generar iconos Android
    console.log('📱 Generando iconos Android...');
    for (const config of CONFIG.android) {
        try {
            const outputPath = path.join(__dirname, 'output', 'android', config.name);
            
            await sharp(originalPath)
                .resize(config.size, config.size, {
                    fit: 'contain',
                    background: { r: 255, g: 255, b: 255, alpha: 1 }
                })
                .png()
                .toFile(outputPath);
            
            console.log(`   ✅ ${config.name} (${config.size}x${config.size})`);
        } catch (err) {
            console.log(`   ❌ Error con ${config.name}: ${err.message}`);
        }
    }

    // Generar iconos iOS
    console.log('\n🍎 Generando iconos iOS...');
    for (const config of CONFIG.ios) {
        try {
            const outputPath = path.join(__dirname, 'output', 'ios', config.name);
            
            await sharp(originalPath)
                .resize(config.size, config.size, {
                    fit: 'contain',
                    background: { r: 255, g: 255, b: 255, alpha: 1 }
                })
                .png()
                .toFile(outputPath);
            
            console.log(`   ✅ ${config.name} (${config.size}x${config.size})`);
        } catch (err) {
            console.log(`   ❌ Error con ${config.name}: ${err.message}`);
        }
    }

    // Generar icono de notificaciones (monocromático)
    console.log('\n🔔 Generando icono de notificaciones...');
    for (const config of CONFIG.notifications) {
        try {
            const outputPath = path.join(__dirname, 'output', 'ios', config.name);
            
            await sharp(originalPath)
                .resize(config.size, config.size, {
                    fit: 'contain',
                    background: { r: 255, g: 255, b: 255, alpha: 0 }
                })
                .greyscale()
                .modulate({ brightness: 1.5 })
                .png()
                .toFile(outputPath);
            
            console.log(`   ✅ ${config.name} (${config.size}x${config.size} - monocromático)`);
        } catch (err) {
            console.log(`   ❌ Error con ${config.name}: ${err.message}`);
        }
    }

    // Generar favicons
    console.log('\n🌐 Generando favicons...');
    for (const config of CONFIG.web) {
        try {
            const outputPath = path.join(__dirname, 'output', 'web', config.name);
            
            await sharp(originalPath)
                .resize(config.size, config.size, {
                    fit: 'contain',
                    background: { r: 255, g: 255, b: 255, alpha: 1 }
                })
                .png()
                .toFile(outputPath);
            
            console.log(`   ✅ ${config.name} (${config.size}x${config.size})`);
        } catch (err) {
            console.log(`   ❌ Error con ${config.name}: ${err.message}`);
        }
    }

    // Resumen final
    console.log('\n✨ ¡GENERACIÓN COMPLETADA!\n');
    console.log('📁 Los iconos se han guardado en:');
    console.log('   📱 Android: output/android/');
    console.log('   🍎 iOS: output/ios/');
    console.log('   🌐 Web: output/web/');
    
    console.log('\n📌 ICONOS PRINCIPALES:');
    console.log('   • Android: output/android/icon-192x192.png');
    console.log('   • Android (grande): output/android/icon-512x512.png');
    console.log('   • iOS: output/ios/icon-ios-180x180.png');
    console.log('   • Notificaciones: output/ios/icon-notification-72x72.png\n');
}

// Ejecutar
generarIconos().catch(console.error);