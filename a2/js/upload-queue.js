// Clase para gestionar la cola de carga - VERSION MEJORADA
class UploadQueue {
  constructor() {
    this.queue = this.loadQueue();
    this.isProcessing = false;
    this.completedCount = 0;
    this.initEventListeners();
    this.updateQueueUI();
    this.processQueue(); // Intentar procesar cola al iniciar

    // Inicializar eventos para la nueva UI
    document.getElementById('queueCounter').addEventListener('click', this.toggleQueueModal.bind(this));
    document.getElementById('closeQueueModal').addEventListener('click', this.hideQueueModal.bind(this));
    document.getElementById('processQueueBtn').addEventListener('click', () => this.processQueue());
    document.getElementById('retryFailedBtn').addEventListener('click', () => this.retryFailedJobs());

    // Cerrar modal al hacer clic fuera
    document.addEventListener('click', (e) => {
      const modal = document.getElementById('queueModal');
      const counter = document.getElementById('queueCounter');

      if (modal.style.display === 'block' &&
          e.target !== modal &&
          !modal.contains(e.target) &&
          e.target !== counter &&
          !counter.contains(e.target)) {
        this.hideQueueModal();
      }
    });
  }

  loadQueue() {
    try {
      const saved = localStorage.getItem(UPLOAD_QUEUE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      console.error("Error al cargar la cola:", e);
      return [];
    }
  }

  saveQueue() {
    localStorage.setItem(UPLOAD_QUEUE_KEY, JSON.stringify(this.queue));
  }

  addJob(job) {
    this.queue.push({
      ...job,
      id: Date.now() + Math.random().toString(36).substr(2, 9),
      retries: 0,
      timestamp: new Date().toISOString(),
      status: 'pending',
      addedAt: new Date().toLocaleTimeString()
    });
    this.saveQueue();
    this.updateQueueUI();
    this.processQueue();
    
    // Mostrar notificación toast
    this.showNotification('Elemento agregado a la cola', 'info');
  }

  initEventListeners() {
    window.addEventListener('online', () => {
      if (this.queue.length > 0) {
        this.processQueue();
        this.showNotification('Conexión restablecida, procesando cola...', 'success');
      }
    });

    window.addEventListener('offline', () => {
      this.showNotification('Sin conexión, los elementos se guardarán en cola', 'warning');
    });
  }

updateQueueUI() {
  const counter = document.getElementById('queueCounter');
  const badge = counter.querySelector('.queue-counter-badge');
  const icon = counter.querySelector('i'); // Cambiado porque ya no hay .queue-counter-icon
  const statusBadge = document.querySelector('.queue-status-text'); // Cambiado de .queue-status-badge
  const pendingStat = document.querySelector('.stat-item:nth-child(1) .stat-value');
  const processingStat = document.querySelector('.stat-item:nth-child(2) .stat-value');
  const completedStat = document.querySelector('.stat-item:nth-child(3) .stat-value');

  // Verifica si los elementos existen
  if (!counter || !badge || !statusBadge) {
    console.warn('Elementos de UI de cola no encontrados');
    return;
  }

  // Actualizar contador
  const pendingJobs = this.queue.filter(job => job.status === 'pending').length;
  const processingJobs = this.queue.filter(job => job.status === 'processing').length;

  badge.textContent = pendingJobs + processingJobs;
  
  if (this.queue.length === 0) {
    counter.classList.add('empty');
    counter.classList.remove('processing');
    if (icon) icon.style.color = '';
    statusBadge.textContent = 'Sin actividad';
    statusBadge.style.color = 'var(--text-tertiary)';
  } else {
    counter.classList.remove('empty');
    if (this.isProcessing) {
      counter.classList.add('processing');
      if (icon) icon.style.color = 'var(--primary)';
      statusBadge.textContent = 'Procesando';
      statusBadge.style.color = 'var(--primary)';
    } else {
      counter.classList.remove('processing');
      if (icon) icon.style.color = '';
      statusBadge.textContent = `${pendingJobs} pendientes`;
      statusBadge.style.color = 'var(--text-tertiary)';
    }
  }

  // Actualizar estadísticas solo si existen
  if (pendingStat) pendingStat.textContent = pendingJobs;
  if (processingStat) processingStat.textContent = processingJobs;
  if (completedStat) completedStat.textContent = this.completedCount;

  // Actualizar lista de items
  this.updateQueueItemsList();
}

// ... código anterior se mantiene igual ...

updateQueueItemsList() {
  const queueItemsList = document.getElementById('queueItemsList');

  if (this.queue.length === 0) {
    queueItemsList.innerHTML = `
      <div class="queue-empty-state">
        <i class="fas fa-check-circle"></i>
        <p>Sin elementos pendientes</p>
      </div>
    `;
    return;
  }

  queueItemsList.innerHTML = '';

  this.queue.forEach((item, index) => {
    const itemElement = document.createElement('div');
    
    let statusClass = '';
    let statusIcon = '';

    if (item.status === 'processing') {
      statusClass = 'processing';
      statusIcon = '<i class="fas fa-sync-alt fa-spin"></i>';
    } else if (item.retries >= MAX_RETRIES) {
      statusClass = 'error';
      statusIcon = '<i class="fas fa-exclamation-circle"></i>';
    } else if (item.status === 'retrying') {
      statusClass = 'retrying';
      statusIcon = `<i class="fas fa-redo"></i><span>${item.retries}/${MAX_RETRIES}</span>`;
    } else {
      statusClass = 'pending';
      statusIcon = '<i class="fas fa-clock"></i>';
    }

    itemElement.className = `queue-item-card ${statusClass}`;

    let previewContent = '';
    if (item.type === 'photo') {
      const factura = item.factura || 'Sin factura';
      previewContent = `📷 ${factura}`;
    } else if (item.type === 'data') {
      previewContent = `📄 ${item.data.documento || 'Sin ID'}`;
    }

    itemElement.innerHTML = `
      <div class="queue-item-main">
        <div class="queue-item-icon">${statusIcon}</div>
        <div class="queue-item-content">
          <div class="queue-item-title">${previewContent}</div>
          <div class="queue-item-time">${item.addedAt}</div>
        </div>
      </div>
    `;

    queueItemsList.appendChild(itemElement);
  });
}

// ... resto del código se mantiene igual ...

  toggleQueueModal() {
    const modal = document.getElementById('queueModal');
    
    if (modal.style.display === 'block') {
      this.hideQueueModal();
    } else {
      this.showQueueModal();
    }
  }

  showQueueModal() {
    const modal = document.getElementById('queueModal');
    const overlay = document.getElementById('queueModalOverlay');
    
    modal.style.display = 'block';
    overlay.style.display = 'block';
    
    // Actualizar UI antes de mostrar
    this.updateQueueUI();
    
    // Animar entrada
    modal.style.animation = 'modal-slide-up 0.3s ease-out';
  }

  hideQueueModal() {
    const modal = document.getElementById('queueModal');
    const overlay = document.getElementById('queueModalOverlay');
    
    if (modal) modal.style.display = 'none';
    if (overlay) overlay.style.display = 'none';
  }

  showNotification(message, type = 'info') {
    // Crear notificación toast
    const toast = document.createElement('div');
    toast.className = `queue-toast ${type}`;
    toast.innerHTML = `
      <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
      <span>${message}</span>
    `;
    
    document.body.appendChild(toast);
    
    // Mostrar
    setTimeout(() => toast.classList.add('show'), 10);
    
    // Ocultar después de 3 segundos
    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => {
        if (toast.parentNode) {
          document.body.removeChild(toast);
        }
      }, 300);
    }, 3000);
  }

  async processQueue() {
    if (this.isProcessing || this.queue.length === 0 || !navigator.onLine) {
      return;
    }

    this.isProcessing = true;
    this.updateQueueUI();

    while (this.queue.length > 0 && navigator.onLine) {
      const job = this.queue[0];
      
      // Marcar como procesando
      job.status = 'processing';
      this.updateQueueUI();

      try {
        if (job.type === 'photo') {
          await this.processPhotoJob(job);
        } else if (job.type === 'data') {
          await this.processDataJob(job);
        }

        // Éxito - eliminar trabajo completado
        this.queue.shift();
        this.completedCount++;
        this.saveQueue();
        
        // Mostrar notificación de éxito
        this.showNotification(`Carga completada: ${job.factura || 'Elemento'}`, 'success');

      } catch (error) {
        console.error("Error al procesar trabajo:", error);
        
        // Manejar error
        job.retries++;
        job.lastError = error.message;
        job.lastAttempt = new Date().toISOString();
        job.status = 'pending'; // Volver a pendiente para reintento

        if (job.retries >= MAX_RETRIES) {
          // Máximo de reintentos alcanzado - eliminar
          this.queue.shift();
          this.showNotification(`Error máximo en: ${job.factura || 'Elemento'}`, 'error');
        } else {
          // Mover al final de la cola para reintentar más tarde
          this.queue.push(this.queue.shift());
          job.status = 'retrying';
          this.showNotification(`Reintentando: ${job.factura || 'Elemento'} (${job.retries}/${MAX_RETRIES})`, 'warning');
        }

        this.saveQueue();
        break; // Pausar procesamiento temporalmente
      }

      this.updateQueueUI();
      
      // Pequeña pausa entre trabajos
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    this.isProcessing = false;
    this.updateQueueUI();
    
    if (this.queue.length === 0) {
      this.showNotification('Todas las cargas completadas', 'success');
    }
  }

  retryFailedJobs() {
    let retried = 0;
    this.queue.forEach(job => {
      if (job.retries > 0 && job.retries < MAX_RETRIES) {
        job.retries = 0;
        job.status = 'pending';
        retried++;
      }
    });
    
    if (retried > 0) {
      this.saveQueue();
      this.updateQueueUI();
      this.showNotification(`${retried} trabajos reiniciados para reintento`, 'info');
      this.processQueue();
    }
  }

  async processPhotoJob(job) {
    const formData = new FormData();
    Object.keys(job.data).forEach(key => {
      // No enviar la propiedad esSinFactura al servidor
      if (key !== 'esSinFactura') {
        formData.append(key, job.data[key]);
      }
    });

    const response = await fetch(API_URL_POST, {
      method: 'POST',
      body: formData
    });

    if (!response.ok) {
      throw new Error(`HTTP error: ${response.status}`);
    }

    const result = await response.json();
    if (!result.success) {
      throw new Error(result.message || "Error en la respuesta del servidor");
    }

    // Actualizar UI si el elemento todavía está visible
    if (job.btnElementId) {
      // Buscar el elemento por data-factura (puede ser button o div ahora)
      const element = document.querySelector(`[data-factura="${job.btnElementId}"]`);

      // Solo actualizar si el elemento existe y no es una entrega sin factura
      if (element && !job.esSinFactura) {
        if (element.tagName === 'BUTTON') {
          // Si aun es un boton, lo reemplazamos por el icono de exito
          const successIcon = document.createElement('div');
          successIcon.className = 'status-icon-only success';
          successIcon.innerHTML = '<i class="fas fa-check-circle"></i>';
          successIcon.setAttribute('data-factura', job.btnElementId);

          if (element.parentNode) {
            element.parentNode.replaceChild(successIcon, element);
          }
        } else {
          // Si ya es un div (icono), actualizamos clase y contenido
          element.className = 'status-icon-only success';
          element.innerHTML = '<i class="fas fa-check-circle"></i>';
        }

        // ACTUALIZACIÓN VISUAL TARJETA: Cambiar a VERDE (Entregado)
        const card = element.closest('.siesa-item');
        if (card) {
          card.classList.remove('status-processing', 'status-pendiente', 'status-nofacturado');
          card.classList.add('status-entregado');
        }
      }
    }

    // Actualizar base de datos local para persistencia inmediata (sin recarga)
    this.updateLocalDatabase(job.factura);
  }

  async processDataJob(job) {
    // Implementación para trabajos de datos
    throw new Error("Trabajos de datos no implementados");
  }

  // Método para actualizar la BD local en memoria y caché
  updateLocalDatabase(factura) {
    if (typeof database !== 'undefined' && Array.isArray(database)) {
      let updated = false;
      for (const doc of database) {
        if (doc.datosSiesa && Array.isArray(doc.datosSiesa)) {
          const item = doc.datosSiesa.find(s => s.factura === factura);
          if (item) {
            item.confirmacion = "ENTREGADO"; // Marcamos como entregado
            updated = true;
            break;
          }
        }
      }

      // Si hubo cambios, invalidar/actualizar caché
      if (updated && typeof cacheData === 'function') {
        console.log("Base de datos local actualizada para factura:", factura);
        cacheData(database);
      }
    }
  }
}