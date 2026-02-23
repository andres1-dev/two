// --- API LOGIC ---

// --- API LOGIC ---

async function sendMessage() {
    const input = document.getElementById('userInput');
    const text = input.value.trim();
    if (!text || isProcessing) return;

    const chat = chats.find(c => c.id === currentChatId);
    if (chat.messages.length === 0) {
        chat.title = text.substring(0, 30) + (text.length > 30 ? '...' : '');
        renderChatList();
    }

    chat.messages.push({ role: 'user', content: text });
    appendUIMessage(text, true);
    input.value = '';
    input.style.height = 'auto';

    isProcessing = true;
    document.getElementById('sendBtn').disabled = true;

    try {
        const apiKey = document.getElementById('apiKeyInput').value;
        localStorage.setItem('apiKey', apiKey);

        const temp = document.getElementById('tempRange').value;
        const topP = document.getElementById('topPRange').value;
        const topK = document.getElementById('topKSelect').value;
        const tokens = document.getElementById('tokensSelect').value;

        const startTime = performance.now();

        // --- NUEVA LÓGICA DE CONTEXTO INTEGRADA ---
        let userMessage = text;
        
        // Si el contexto está activo, enriquecer el mensaje
        if (window.ContextManager && window.ContextManager.isActive) {
            userMessage = await window.ContextManager.generatePrompt(text);
        }

        // Preparar historial con el mensaje (enriquecido o normal)
        let history = [];
        
        // Añadir mensajes anteriores (sin incluir el último que acabamos de añadir)
        for (let i = 0; i < chat.messages.length - 1; i++) {
            const msg = chat.messages[i];
            history.push({
                role: msg.role === 'user' ? 'user' : 'model',
                parts: [{ text: msg.content }]
            });
        }
        
        // Añadir el mensaje actual (ya enriquecido si aplica)
        history.push({
            role: 'user',
            parts: [{ text: userMessage }]
        });

        // Llamada a la API
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/${MODEL}:streamGenerateContent?key=${apiKey}&alt=sse`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: history,
                generationConfig: {
                    temperature: parseFloat(temp),
                    topP: parseFloat(topP),
                    topK: parseInt(topK),
                    maxOutputTokens: parseInt(tokens)
                }
            })
        });

        if (!response.ok) {
            const errJson = await response.json().catch(() => ({}));
            throw new Error(errJson.error?.message || `Error ${response.status}: Respuesta inválida de la API`);
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let fullResponse = '';
        let streamingDiv = null;

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value);
            const lines = chunk.split('\n');
            for (const line of lines) {
                if (line.startsWith('data: ')) {
                    try {
                        const data = JSON.parse(line.slice(5));
                        const delta = data.candidates[0].content.parts[0].text;
                        fullResponse += delta;
                        streamingDiv = appendUIMessage(fullResponse, false, true);
                    } catch (e) { }
                }
            }
        }

        if (streamingDiv) {
            streamingDiv.id = '';
            const bubble = streamingDiv.querySelector('.bubble');
            bubble.innerHTML = marked.parse(fullResponse);
            addCodeActions(streamingDiv);
            streamingDiv.querySelectorAll('pre code').forEach(el => hljs.highlightElement(el));
        }
        
        // Guardar la respuesta original (sin el contexto inyectado)
        chat.messages.push({ role: 'model', content: fullResponse });

        document.getElementById('latencyDisplay').textContent = ((performance.now() - startTime) / 1000).toFixed(2) + 's';
        saveChats();

    } catch (error) {
        appendUIMessage('❌ Error: ' + error.message, false);
    } finally {
        isProcessing = false;
        document.getElementById('sendBtn').disabled = false;
    }
}
