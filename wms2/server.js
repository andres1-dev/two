// server.js - Servidor local simple
const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const port = 3000;

const mimeTypes = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon',
  '.svg': 'image/svg+xml',
  '.json': 'application/json',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2'
};

const server = http.createServer((req, res) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  
  // Parsear la URL
  const parsedUrl = url.parse(req.url);
  let pathname = `./${parsedUrl.pathname}`;
  
  // Si es la raíz, servir index.html
  if (pathname === './') {
    pathname = './index.html';
  }
  
  // Obtener la extensión del archivo
  const ext = path.parse(pathname).ext;
  
  // Leer el archivo
  fs.readFile(pathname, (err, data) => {
    if (err) {
      console.log(`File not found: ${pathname}`);
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('404 Not Found');
      return;
    }
    
    // Configurar headers CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    
    // Configurar el tipo MIME
    const mimeType = mimeTypes[ext] || 'text/plain';
    res.writeHead(200, { 'Content-Type': mimeType });
    
    // Enviar el archivo
    res.end(data);
  });
});

server.listen(port, () => {
  console.log(`🚀 Servidor ejecutándose en http://localhost:${port}`);
  console.log(`📁 Sirviendo archivos desde: ${process.cwd()}`);
});

// Manejar cierre graceful
process.on('SIGINT', () => {
  console.log('\n🛑 Cerrando servidor...');
  server.close(() => {
    console.log('✅ Servidor cerrado');
    process.exit(0);
  });
});