// --- CHAT MANAGEMENT ---

function startNewChat() {
    const id = Date.now().toString();
    const newChat = { id, title: 'Nuevo Chat', messages: [], timestamp: Date.now() };
    chats.unshift(newChat);
    saveChats();
    selectChat(id);
    renderChatList();
}

function selectChat(id) {
    currentChatId = id;
    const chat = chats.find(c => c.id === id);
    document.getElementById('chatTitleDisplay').textContent = chat.title;
    renderMessages();
    renderChatList();
}

function deleteChat(id, e) {
    e.stopPropagation();
    chats = chats.filter(c => c.id !== id);
    if (currentChatId === id) {
        if (chats.length > 0) selectChat(chats[0].id);
        else startNewChat();
    }
    saveChats();
    renderChatList();
}

function saveChats() {
    localStorage.setItem('gemma_chats', JSON.stringify(chats));
}

function exportHistory() {
    const blob = new Blob([JSON.stringify(chats, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `historial_gemma_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
}

function importHistory(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (re) => {
        try {
            const data = JSON.parse(re.target.result);
            if (Array.isArray(data)) {
                chats = data;
                saveChats();
                init();
                alert('Historial importado!');
            }
        } catch (err) { alert('Archivo inválido'); }
    };
    reader.readAsText(file);
}
