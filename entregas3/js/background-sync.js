// Archivo nuevo: background-sync.js
class BackgroundSync {
  constructor() {
    this.syncQueue = [];
    this.isSyncing = false;
    this.syncInterval = null;
    
    // Usar IndexedDB para persistencia offline
    this.dbName = 'pandadash_sync';
    this.dbVersion = 1;
    
    this.initDatabase();
    this.startSyncService();
  }
  
  initDatabase() {
    if ('indexedDB' in window) {
      const request = indexedDB.open(this.dbName, this.dbVersion);
      
      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        
        // Crear store para entregas pendientes
        if (!db.objectStoreNames.contains('pending_deliveries')) {
          const store = db.createObjectStore('pending_deliveries', { 
            keyPath: 'id',
            autoIncrement: true 
          });
          store.createIndex('factura', 'factura', { unique: true });
          store.createIndex('timestamp', 'timestamp');
          store.createIndex('retries', 'retries');
        }
        
        // Crear store para entregas completadas
        if (!db.objectStoreNames.contains('completed_deliveries')) {
          const store = db.createObjectStore('completed_deliveries', { 
            keyPath: 'id' 
          });
          store.createIndex('factura', 'factura', { unique: true });
          store.createIndex('timestamp', 'timestamp');
        }
      };
    }
  }
  
  // Método para agregar entrega al sistema de sync
  async addDelivery(factura, data) {
    // 1. Guardar inmediatamente en IndexedDB (no bloqueante)
    this.saveToIndexedDB(factura, data);
    
    // 2. Intentar sincronización en background
    this.scheduleSync();
  }
  
  saveToIndexedDB(factura, data) {
    if (!('indexedDB' in window)) return;
    
    const request = indexedDB.open(this.dbName, this.dbVersion);
    
    request.onsuccess = (event) => {
      const db = event.target.result;
      const transaction = db.transaction(['pending_deliveries'], 'readwrite');
      const store = transaction.objectStore('pending_deliveries');
      
      const deliveryRecord = {
        factura: factura,
        data: data,
        timestamp: new Date().toISOString(),
        retries: 0,
        lastAttempt: null,
        status: 'pending'
      };
      
      store.put(deliveryRecord);
    };
  }
  
  scheduleSync() {
    // Si ya hay un sync programado, no hacer nada
    if (this.syncInterval) return;
    
    // Esperar 2 segundos antes de intentar sync (dar tiempo a otras operaciones)
    this.syncInterval = setTimeout(() => {
      this.performSync();
      this.syncInterval = null;
    }, 2000);
  }
  
  async performSync() {
    if (this.isSyncing || !navigator.onLine) return;
    
    this.isSyncing = true;
    
    try {
      // Obtener entregas pendientes de IndexedDB
      const pendingDeliveries = await this.getPendingDeliveries();
      
      for (const delivery of pendingDeliveries) {
        // Intentar subir cada entrega
        const success = await this.uploadDelivery(delivery);
        
        if (success) {
          // Mover a completadas
          await this.markAsCompleted(delivery);
        } else {
          // Incrementar reintentos
          await this.incrementRetries(delivery);
        }
        
        // Pequeña pausa entre entregas para no bloquear
        await this.sleep(100);
      }
    } catch (error) {
      console.error("Error en sync background:", error);
    } finally {
      this.isSyncing = false;
    }
  }
  
  async uploadDelivery(delivery) {
    try {
      const formData = new FormData();
      Object.keys(delivery.data).forEach(key => {
        if (key !== 'esSinFactura') {
          formData.append(key, delivery.data[key]);
        }
      });
      
      // Timeout corto para no bloquear
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      const response = await fetch(API_URL_POST, {
        method: 'POST',
        body: formData,
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      return response.ok;
    } catch (error) {
      console.warn("Error subiendo entrega en background:", error);
      return false;
    }
  }
  
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  
  // Iniciar el servicio de sincronización
  startSyncService() {
    // Sincronizar cada 30 segundos si hay conexión
    setInterval(() => {
      if (navigator.onLine && this.hasPendingDeliveries()) {
        this.performSync();
      }
    }, 30000);
    
    // Sincronizar cuando se recupera conexión
    window.addEventListener('online', () => {
      setTimeout(() => this.performSync(), 1000);
    });
  }
  
  hasPendingDeliveries() {
    // Verificar si hay entregas pendientes
    return new Promise((resolve) => {
      if (!('indexedDB' in window)) resolve(false);
      
      const request = indexedDB.open(this.dbName, this.dbVersion);
      
      request.onsuccess = (event) => {
        const db = event.target.result;
        const transaction = db.transaction(['pending_deliveries'], 'readonly');
        const store = transaction.objectStore('pending_deliveries');
        const countRequest = store.count();
        
        countRequest.onsuccess = () => {
          resolve(countRequest.result > 0);
        };
        
        countRequest.onerror = () => resolve(false);
      };
      
      request.onerror = () => resolve(false);
    });
  }
}

// Inicializar singleton
const backgroundSync = new BackgroundSync();