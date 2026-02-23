// --- UTILS & HELPERS ---

function addCodeActions(element) {
    element.querySelectorAll('pre').forEach(pre => {
        if (pre.querySelector('.code-header')) return;
        const code = pre.querySelector('code');
        const langMatch = code.className.match(/language-(\w+)/);
        const lang = langMatch ? langMatch[1] : 'code';

        let fileName = `script.${lang === 'javascript' ? 'js' : lang}`;
        if (lang === 'html') fileName = 'index.html';
        if (lang === 'python') fileName = 'main.py';
        if (lang === 'css') fileName = 'style.css';

        const header = document.createElement('div');
        header.className = 'code-header';
        header.innerHTML = `
            <span><i class="fas fa-code"></i> ${lang.toUpperCase()}</span>
            <div class="code-actions">
                <button class="code-action-btn" onclick="copyCode(this)"><i class="far fa-copy"></i> Copiar</button>
                <button class="code-action-btn" onclick="downloadCode(this, '${fileName}')"><i class="fas fa-download"></i> Descargar</button>
            </div>
        `;
        pre.prepend(header);
    });
}

async function copyCode(btn) {
    const pre = btn.closest('pre');
    const code = pre.querySelector('code').innerText;
    await navigator.clipboard.writeText(code);
    btn.innerHTML = '<i class="fas fa-check"></i> ¡Copiado!';
    setTimeout(() => btn.innerHTML = '<i class="far fa-copy"></i> Copiar', 2000);
}

function downloadCode(btn, defaultName) {
    const pre = btn.closest('pre');
    const codeContent = pre.querySelector('code').innerText;
    const blob = new Blob([codeContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = defaultName;
    a.click();
    URL.revokeObjectURL(url);
}

function setPreset(p) {
    const temp = document.getElementById('tempRange');
    const topP = document.getElementById('topPRange');
    const topK = document.getElementById('topKSelect');
    const tokens = document.getElementById('tokensSelect');

    if (p === 'balanced') { temp.value = 0.3; topP.value = 0.95; topK.value = "40"; tokens.value = "2048"; }
    if (p === 'creative') { temp.value = 0.8; topP.value = 0.95; topK.value = "60"; tokens.value = "2048"; }
    if (p === 'precise') { temp.value = 0.1; topP.value = 0.8; topK.value = "20"; tokens.value = "1024"; }
    if (p === 'fast') { temp.value = 0.5; topP.value = 0.9; topK.value = "40"; tokens.value = "512"; }

    updateStatusDisplay();
    document.getElementById('tempValueDisplay').textContent = temp.value;
    document.getElementById('topPValueDisplay').textContent = topP.value;
    document.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('active'));
    if (event) event.target.closest('.preset-btn').classList.add('active');
}
