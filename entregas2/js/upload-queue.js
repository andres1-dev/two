// Clase para gestionar la cola de carga
class UploadQueue {
  constructor() {
    this.queue = this.loadQueue();
    this.isProcessing = false;
    this.initEventListeners();
    this.updateQueueCounter();
    this.processQueue(); // Intentar procesar cola al iniciar

    // Inicializar eventos para el contador de cola
    document.getElementById('queueCounter').addEventListener('click', this.toggleQueueDetails.bind(this));
    document.getElementById('closeQueueDetails').addEventListener('click', this.hideQueueDetails.bind(this));

    // Cerrar detalles al hacer clic fuera
    document.addEventListener('click', (e) => {
      const queueDetails = document.getElementById('queueDetails');
      const queueCounter = document.getElementById('queueCounter');

      if (queueDetails.style.display === 'block' &&
        e.target !== queueDetails &&
        !queueDetails.contains(e.target) &&
        e.target !== queueCounter) {
        this.hideQueueDetails();
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
      retries: 0,
      timestamp: new Date().toISOString(),
      status: 'pending'
    });
    this.saveQueue();
    this.updateQueueCounter();
    this.processQueue();
  }

  initEventListeners() {
    window.addEventListener('online', () => {
      if (this.queue.length > 0) {
        this.processQueue();
      }
    });
  }

  updateQueueCounter() {
    const counter = document.getElementById('queueCounter');
    const queueItemsList = document.getElementById('queueItemsList');

    if (this.queue.length === 0) {
      counter.textContent = '0';
      counter.className = 'empty';
      counter.title = 'No hay elementos en cola';
      queueItemsList.innerHTML = '<div class="queue-no-items">No hay elementos pendientes</div>';
    } else {
      counter.textContent = this.queue.length;
      counter.className = this.isProcessing ? 'processing' : '';
      counter.title = `${this.queue.length} elementos pendientes`;

      // Actualizar la lista de elementos
      this.updateQueueItemsList();
    }
  }

  updateQueueItemsList() {
    const queueItemsList = document.getElementById('queueItemsList');

    if (this.queue.length === 0) {
      queueItemsList.innerHTML = '<div class="queue-no-items">No hay elementos pendientes</div>';
      return;
    }

    queueItemsList.innerHTML = '';

    this.queue.forEach((item, index) => {
      const itemElement = document.createElement('div');
      itemElement.className = `queue-item-card ${item.status === 'retrying' ? 'retrying' : ''} ${item.retries >= MAX_RETRIES ? 'error' : ''}`;

      let previewContent = '';
      let thumbnail = '';

      if (item.type === 'photo') {
        previewContent = `Factura: ${item.factura || 'N/A'}`;
        if (item.data.fotoBase64) {
          thumbnail = `<img src="data:image/jpeg;base64,${item.data.fotoBase64}" class="queue-thumbnail">`;
        }
      } else if (item.type === 'data') {
        previewContent = `Datos: ${JSON.stringify(item.data).substring(0, 50)}...`;
      }

      let statusInfo = '';
      if (item.status === 'retrying') {
        statusInfo = `<div class="queue-item-status retrying">Reintentando (${item.retries}/${MAX_RETRIES})</div>`;
      } else if (item.retries >= MAX_RETRIES) {
        statusInfo = `<div class="queue-item-status error">Error: ${item.lastError || 'Error desconocido'}</div>`;
      } else {
        statusInfo = `<div class="queue-item-status">En espera</div>`;
      }

      itemElement.innerHTML = `
        <div class="queue-item-header">
          <span>${item.type === 'photo' ? 'Foto' : 'Datos'}</span>
          <span class="queue-item-type">${new Date(item.timestamp).toLocaleTimeString()}</span>
        </div>
        <div class="queue-item-preview">${previewContent}</div>
        ${thumbnail}
        ${statusInfo}
      `;

      // Mostrar miniaturas al pasar el ratón
      itemElement.addEventListener('mouseenter', () => {
        const thumbnail = itemElement.querySelector('.queue-thumbnail');
        if (thumbnail) thumbnail.style.display = 'block';
      });

      itemElement.addEventListener('mouseleave', () => {
        const thumbnail = itemElement.querySelector('.queue-thumbnail');
        if (thumbnail) thumbnail.style.display = 'none';
      });

      queueItemsList.appendChild(itemElement);
    });
  }

  toggleQueueDetails() {
    const details = document.getElementById('queueDetails');
    if (details.style.display === 'block') {
      this.hideQueueDetails();
    } else {
      this.showQueueDetails();
    }
  }

  showQueueDetails() {
    const details = document.getElementById('queueDetails');
    details.style.display = 'block';
    this.updateQueueItemsList();
  }

  hideQueueDetails() {
    const details = document.getElementById('queueDetails');
    details.style.display = 'none';
  }

  async processQueue() {
    if (this.isProcessing || this.queue.length === 0 || !navigator.onLine) {
      this.updateQueueCounter();
      return;
    }

    this.isProcessing = true;
    this.updateQueueCounter();

    while (this.queue.length > 0 && navigator.onLine) {
      const job = this.queue[0];

      try {
        if (job.type === 'photo') {
          await this.processPhotoJob(job);
        } else if (job.type === 'data') {
          await this.processDataJob(job);
        }

        // Eliminar trabajo completado
        this.queue.shift();
        this.saveQueue();
        this.updateQueueCounter();
      } catch (error) {
        console.error("Error al procesar trabajo:", error);
        job.retries++;
        job.lastError = error.message;
        job.lastAttempt = new Date().toISOString();

        if (job.retries >= MAX_RETRIES) {
          // Eliminar después de máximos reintentos
          this.queue.shift();
        } else {
          job.status = 'retrying';
          // Mover al final de la cola para reintentar más tarde
          this.queue.push(this.queue.shift());
        }

        this.saveQueue();
        this.updateQueueCounter();
        break;
      }
    }

    this.isProcessing = false;
    this.updateQueueCounter();
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