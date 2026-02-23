/* ai_assistant.js - DeepScope AI Logic */

class DeepScopeAI {
    constructor() {
        this.isOpen = false;
        this.messages = JSON.parse(localStorage.getItem('ai_chat_history')) || [
            { role: 'ai', content: '¡Hola! Soy **DeepScope AI**, tu experto en logística. ¿En qué puedo ayudarte a optimizar tu operación hoy?' }
        ];
        this.init();
    }

    init() {
        this.createUI();
        this.renderMessages();
        this.setupEventListeners();
    }

    createUI() {
        // Create Floating Button
        const btn = document.createElement('div');
        btn.id = 'ai-assistant-btn';
        btn.innerHTML = '<i class="fas fa-sparkles"></i>';
        btn.title = 'DeepScope AI Analyst';
        document.body.appendChild(btn);

        // Create Chat Window
        const window = document.createElement('div');
        window.id = 'ai-assistant-window';
        window.innerHTML = `
            <div class="ai-header">
                <div class="ai-header-title">
                    <i class="fas fa-robot"></i>
                    <h3>DeepScope AI <small style="font-size:9px; color:#58a6ff; margin-left:5px;">BETA</small></h3>
                </div>
                <div class="ai-close-btn"><i class="fas fa-times"></i></div>
            </div>
            <div class="ai-messages" id="ai-messages-container"></div>
            <div class="typing" id="ai-typing">Analizando datos...</div>
            <div class="ai-suggestions">
                <div class="suggestion-chip" data-prompt="Analiza la eficiencia de hoy">Eficiencia hoy</div>
                <div class="suggestion-chip" data-prompt="¿Qué facturas están pendientes?">Pendientes</div>
                <div class="suggestion-chip" data-prompt="Resumen para el CEO">Resumen Ejecutivo</div>
            </div>
            <div class="ai-input-area">
                <input type="text" id="ai-input" placeholder="Pregunta sobre tu logística...">
                <div id="ai-send-btn"><i class="fas fa-paper-plane"></i></div>
            </div>
        `;
        document.body.appendChild(window);

        this.ui = {
            btn,
            window,
            container: document.getElementById('ai-messages-container'),
            input: document.getElementById('ai-input'),
            sendBtn: document.getElementById('ai-send-btn'),
            typing: document.getElementById('ai-typing')
        };
    }

    setupEventListeners() {
        this.ui.btn.onclick = () => this.toggleWindow();
        document.querySelector('.ai-close-btn').onclick = () => this.toggleWindow();

        this.ui.sendBtn.onclick = () => this.handleSendMessage();
        this.ui.input.onkeypress = (e) => {
            if (e.key === 'Enter') this.handleSendMessage();
        };

        // Suggestion chips
        document.querySelectorAll('.suggestion-chip').forEach(chip => {
            chip.onclick = () => {
                this.ui.input.value = chip.getAttribute('data-prompt');
                this.handleSendMessage();
            };
        });
    }

    toggleWindow() {
        this.isOpen = !this.isOpen;
        this.ui.window.style.display = this.isOpen ? 'flex' : 'none';
        if (this.isOpen) {
            this.ui.input.focus();
            this.scrollToBottom();
        }
    }

    renderMessages() {
        this.ui.container.innerHTML = '';
        this.messages.forEach(msg => {
            this.addMessageToUI(msg.role, msg.content, false);
        });
        this.scrollToBottom();
    }

    addMessageToUI(role, content, save = true) {
        const msgDiv = document.createElement('div');
        msgDiv.className = `message ${role}`;

        // Formateo Premium: Soporte para negritas, saltos de línea y TABLAS Markdown
        let formattedContent = content
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\n/g, '<br>')
            .replace(/^\* (.*)/gm, '• $1');

        // Procesar tablas si existen (formato | col1 | col2 |)
        if (formattedContent.includes('|')) {
            const lines = content.split('\n');
            let tableHtml = '<table>';
            let inTable = false;
            let finalContent = '';
            let currentTable = '';

            lines.forEach(line => {
                if (line.trim().startsWith('|')) {
                    if (!inTable) {
                        inTable = true;
                    }
                    const cells = line.split('|').filter(c => c.trim() !== '' || line.indexOf('|') !== line.lastIndexOf('|'));
                    // Ignorar líneas separadoras like |---|
                    if (line.includes('---')) return;

                    currentTable += '<tr>' + cells.map(c => `<td>${c.trim()}</td>`).join('') + '</tr>';
                } else {
                    if (inTable) {
                        finalContent += `<table>${currentTable}</table>`;
                        currentTable = '';
                        inTable = false;
                    }
                    finalContent += line + '\n';
                }
            });

            if (inTable) {
                finalContent += `<table>${currentTable}</table>`;
            }

            // Aplicar negritas y saltos al finalContent
            formattedContent = finalContent
                .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                .replace(/\n/g, '<br>');
        }

        msgDiv.innerHTML = formattedContent;
        this.ui.container.appendChild(msgDiv);

        if (save) {
            this.messages.push({ role, content });
            localStorage.setItem('ai_chat_history', JSON.stringify(this.messages));
        }

        this.scrollToBottom();
    }

    scrollToBottom() {
        this.ui.container.scrollTop = this.ui.container.scrollHeight;
    }

    async handleSendMessage() {
        const text = this.ui.input.value.trim();
        if (!text) return;

        this.ui.input.value = '';
        this.addMessageToUI('user', text);
        this.ui.typing.style.display = 'block';

        try {
            // PROACTIVIDAD: Si no hay datos, intentar cargar silenciosamente antes de preguntar
            if ((!window.database || window.database.length === 0) && typeof window.silentReloadData === 'function') {
                this.ui.typing.innerText = "Sincronizando base de datos para análisis...";
                await window.silentReloadData();
                this.ui.typing.innerText = "Analizando datos...";
            }

            const context = this.getLogisticsContext();
            const response = await this.askGemini(text, context);

            this.ui.typing.style.display = 'none';
            this.ui.typing.innerText = "Analizando datos..."; // Reset text

            if (response.success) {
                this.addMessageToUI('ai', response.answer);
            } else {
                const errorMsg = response.message || "Lo siento, tuve un problema analizando los datos.";
                this.addMessageToUI('ai', `⚠️ **Error:** ${errorMsg}\n\n*Asegúrate de haber configurado la GEMINI_API_KEY en las propiedades del script de Google Apps.*`);
            }
        } catch (error) {
            this.ui.typing.style.display = 'none';
            this.addMessageToUI('ai', "Error de conexión con el núcleo de inteligencia.");
            console.error("AI Error:", error);
        }
    }

    getLogisticsContext() {
        // Obtener identificación del usuario
        const userName = window.currentUser ? window.currentUser.nombre : "Usuario Desconocido";
        const userRole = window.currentUser ? window.currentUser.rol : "N/A";

        // Obtener métricas visuales
        const stats = document.querySelector('.metrics-container')?.innerText || "Dashboard no cargado";

        let contextText = `[SESIÓN ACTIVA]\nUsuario: ${userName}\nRol: ${userRole}\n\n[MÉTRICAS DEL DASHBOARD]\n${stats}\n\n`;

        // Procesar datos normalizados del frontend (window.database)
        if (window.database && window.database.length > 0) {
            contextText += `[DATOS NORMALIZADOS DE LA APP - TOTAL: ${window.database.length} REGISTROS]\n`;

            // Enviamos una muestra representativa (últimos 20 registros procesados)
            const sample = window.database.slice(0, 20).map(item => {
                return `- Factura: ${item.factura} | Cliente: ${item.cliente} | Lote: ${item.lote} | Estado: ${item.confirmacion || 'PENDIENTE'} | Cantidad: ${item.cantidad}`;
            }).join('\n');

            contextText += `${sample}\n\nNota: Estos datos ya han sido cruzados y ajustados por la lógica del frontend (main_logic.js).`;
        } else {
            contextText += "Aviso: No hay datos cargados en el frontend en este momento.";
        }

        return contextText;
    }

    async askGemini(prompt, dataContext) {
        const apiKey = localStorage.getItem('apiKey');
        if (!apiKey) {
            console.error("No API Key found in localStorage");
            return { success: false, message: 'API Key no configurada. Por favor, re-inicie sesión.' };
        }

        // Modelo preferido: gemini-1.5-flash para balance velocidad/precisión
        const model = "gemini-1.5-flash";
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

        // Obtener nombre de usuario para personalizar
        const welcomeUser = window.currentUser ? window.currentUser.nombre : "Usuario";

        // Mapear historial al formato de Gemini (user -> user, ai -> model)
        // Solo enviamos los últimos 10 mensajes para ahorrar tokens y mantener relevancia
        const history = this.messages.slice(-10).map(msg => ({
            role: msg.role === 'ai' ? 'model' : 'user',
            parts: [{ text: msg.content }]
        }));

        // Construir el prompt del sistema con el contexto logístico actual
        const systemPrompt = `Eres DeepScope AI, el asistente experto en logística de la plataforma DeepScope. 
Estás hablando con ${welcomeUser}. 

Tu fuente PRIMARIA de verdad es el Contexto de la App proporcionado por el usuario. Estos datos han sido normalizados y validados por la lógica de negocio.

Directrices:
1. Sé extremadamente profesional y analítico (Senior Logistics Manager).
2. Usa Markdown para resaltar números, estados y crear tablas si es necesario.
3. Si los datos están incompletos, menciónalo profesionalmente.
4. Responde SIEMPRE en español.

Contexto Actual del Sistema:
${dataContext}`;

        const payload = {
            system_instruction: {
                parts: [{ text: systemPrompt }]
            },
            contents: history,
            generationConfig: {
                temperature: 0.7,
                topK: 40,
                topP: 0.95,
                maxOutputTokens: 1024,
            }
        };

        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error?.message || `HTTP Error ${response.status}`);
            }

            const result = await response.json();

            if (result.candidates && result.candidates[0]?.content?.parts?.[0]?.text) {
                return {
                    success: true,
                    answer: result.candidates[0].content.parts[0].text
                };
            } else {
                return { success: false, message: 'No recibí una respuesta clara de la IA.' };
            }

        } catch (error) {
            console.error("Direct Gemini Error:", error);
            return { success: false, message: error.message };
        }
    }
}

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    window.deepScopeAI = new DeepScopeAI();
});
