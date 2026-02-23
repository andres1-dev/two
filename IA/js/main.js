// --- MAIN ENTRY POINT & EVENT LISTENERS ---

document.getElementById('tempRange').oninput = (e) => {
    document.getElementById('tempValueDisplay').textContent = e.target.value;
    updateStatusDisplay();
};

document.getElementById('topPRange').oninput = (e) => {
    document.getElementById('topPValueDisplay').textContent = e.target.value;
    updateStatusDisplay();
};

document.getElementById('topKSelect').onchange = updateStatusDisplay;

document.getElementById('userInput').onkeydown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
    }
};

// Initialize the application
init();
window.contextData.boot();

