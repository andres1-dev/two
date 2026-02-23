// --- UI RENDERING & INTERACTIONS ---

function init() {
    // Cargar API Key guardada
    const savedKey = localStorage.getItem('apiKey');
    if (savedKey) {
        document.getElementById('apiKeyInput').value = savedKey;
    }

    // Escuchar cambios en la API Key para persistir
    document.getElementById('apiKeyInput').addEventListener('change', (e) => {
        localStorage.setItem('apiKey', e.target.value);
    });

    if (chats.length === 0) startNewChat();
    else selectChat(chats[0].id);
    renderChatList();
    updateStatusDisplay();
}

function renderChatList() {
    const list = document.getElementById('chatList');
    list.innerHTML = '';
    chats.forEach(chat => {
        const item = document.createElement('div');
        item.className = `chat-item ${currentChatId === chat.id ? 'active' : ''}`;
        item.onclick = () => selectChat(chat.id);
        item.innerHTML = `
            <i class="far fa-comment-alt"></i>
            <span class="chat-item-text">${chat.title}</span>
            <i class="fas fa-trash-alt chat-item-delete" onclick="deleteChat('${chat.id}', event)"></i>
        `;
        list.appendChild(item);
    });
}

function renderMessages() {
    const container = document.getElementById('messages');
    container.innerHTML = '';
    const chat = chats.find(c => c.id === currentChatId);
    if (chat.messages.length === 0) {
        appendUIMessage('Hola, soy DeepScope. Estoy listo para asistirte con el análisis de datos e inventario. ¿En qué puedo ayudarte hoy?', false);
    } else {

        chat.messages.forEach(m => appendUIMessage(m.content, m.role === 'user'));
    }
    container.scrollTop = container.scrollHeight;
}

function appendUIMessage(content, isUser, isStreaming = false) {
    const container = document.getElementById('messages');
    let msgDiv = isStreaming ? document.getElementById('streaming-msg') : null;

    if (isStreaming && msgDiv) {
        const bubble = msgDiv.querySelector('.bubble');
        let renderContent = content;
        const codeBlockMatches = content.match(/```/g);
        const isInsideCode = codeBlockMatches && codeBlockMatches.length % 2 !== 0;

        if (isInsideCode) renderContent += '\n\n```';

        bubble.innerHTML = marked.parse(renderContent) + (isInsideCode ? '' : '<span class="streaming-cursor"></span>');

        const now = Date.now();
        if (now - lastHighlightUpdate > 200) {
            msgDiv.querySelectorAll('pre code').forEach(el => hljs.highlightElement(el));
            lastHighlightUpdate = now;
        }
    } else {
        msgDiv = document.createElement('div');
        msgDiv.className = `message ${isUser ? 'user' : 'ai'}`;
        if (isStreaming) msgDiv.id = 'streaming-msg';

        const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const icon = isUser ? 'fa-user' : 'fa-robot';

        msgDiv.innerHTML = `
            <div class="avatar"><i class="fas ${icon}"></i></div>
            <div class="bubble-container" style="min-width: 0; flex: 1;">
                <div class="bubble">${marked.parse(content)}</div>
                <div class="timestamp">${time}</div>
            </div>
        `;

        container.appendChild(msgDiv);

        if (!isStreaming && !isUser) {
            addCodeActions(msgDiv);
            msgDiv.querySelectorAll('pre code').forEach(el => hljs.highlightElement(el));
        }
    }

    const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 200;
    if (isNearBottom || isStreaming) {
        container.scrollTo({ top: container.scrollHeight, behavior: isStreaming ? 'auto' : 'smooth' });
    }
    return msgDiv;
}

function updateStatusDisplay() {
    document.getElementById('statusTemp').textContent = document.getElementById('tempRange').value;
    document.getElementById('statusP').textContent = document.getElementById('topPRange').value;
    document.getElementById('statusK').textContent = document.getElementById('topKSelect').value;
}

function openModal() { document.getElementById('configModal').classList.add('active'); }
function closeModal(e) { if (!e || e.target.id === 'configModal' || e.target.closest('.modal-close')) document.getElementById('configModal').classList.remove('active'); }
