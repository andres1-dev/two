function setupTheme() {
    const themeToggle = document.getElementById('themeToggle');
    const savedTheme = localStorage.getItem('vscode-theme') || 'light';

    document.body.className = `vscode-${savedTheme}`;
    updateThemeIcon(savedTheme);

    themeToggle.addEventListener('click', function () {
        const currentTheme = document.body.classList.contains('vscode-dark') ? 'dark' : 'light';
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';

        document.body.className = `vscode-${newTheme}`;
        localStorage.setItem('vscode-theme', newTheme);
        updateThemeIcon(newTheme);

        showMessage(`Tema cambiado a ${newTheme === 'dark' ? 'oscuro' : 'claro'}`, 'info', 1500);
    });
}

function updateThemeIcon(theme) {
    const icon = document.querySelector('#themeToggle i');
    icon.className = theme === 'dark' ? 'codicon codicon-sun' : 'codicon codicon-moon';
}

function getCurrentTheme() {
    return document.body.classList.contains('vscode-dark') ? 'dark' : 'light';
}