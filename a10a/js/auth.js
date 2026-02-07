// Gestión de autenticación y sesiones
const AUTH_KEY = 'pandaDashUser';

// Estado de usuario
let currentUser = null;

// Inicializar sistema de autenticación
function initAuth() {
    // Escuchar submit del form
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }

    // Toggle password
    const togglePassword = document.getElementById('togglePassword');
    const passwordInput = document.getElementById('loginPassword');

    if (togglePassword && passwordInput) {
        togglePassword.addEventListener('click', function () {
            const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
            passwordInput.setAttribute('type', type);
            this.classList.toggle('fa-eye');
            this.classList.toggle('fa-eye-slash');
        });
    }

    // Verificar sesión existente
    checkSession();
}

// Verificar si hay sesión activa
function checkSession() {
    try {
        const storedUser = localStorage.getItem(AUTH_KEY);
        if (storedUser) {
            currentUser = JSON.parse(storedUser);
            console.log("Sesión restaurada para:", currentUser.nombre);

            // Ocultar login, mostrar app
            showApp();
        } else {
            // Mostrar login
            showLogin();
        }
    } catch (e) {
        console.error("Error al restaurar sesión:", e);
        showLogin();
    }
}

// Manejar intento de login
async function handleLogin(e) {
    e.preventDefault();

    const idInput = document.getElementById('loginId');
    const passInput = document.getElementById('loginPassword');
    const btnLogin = document.getElementById('btnLogin');
    const errorMsg = document.getElementById('loginError');
    const btnText = btnLogin.querySelector('.btn-text');
    const btnLoader = btnLogin.querySelector('.btn-loader');

    const id = idInput.value.trim();
    const password = passInput.value.trim();

    if (!id || !password) {
        showLoginError("Por favor ingrese ID y contraseña");
        return;
    }

    // UI Loading
    btnLogin.disabled = true;
    btnText.style.display = 'none';
    btnLoader.style.display = 'block';
    errorMsg.style.display = 'none';

    try {
        const formData = new FormData();
        formData.append('action', 'login');
        formData.append('id', id);
        formData.append('password', password);

        const response = await fetch(API_URL_POST, {
            method: 'POST',
            body: formData
        });

        if (!response.ok) throw new Error("Error de conexión");

        const result = await response.json();

        if (result.success && result.user) {
            // Login exitoso
            currentUser = result.user;
            localStorage.setItem(AUTH_KEY, JSON.stringify(currentUser));

            // Limpiar form
            idInput.value = '';
            passInput.value = '';

            // Iniciar app
            showApp();
        } else {
            showLoginError(result.message || "Credenciales incorrectas");
        }

    } catch (error) {
        console.error("Login error:", error);
        showLoginError("Error de conexión. Intente nuevamente.");
    } finally {
        btnLogin.disabled = false;
        btnText.style.display = 'block';
        btnLoader.style.display = 'none';
    }
}

function showLoginError(msg) {
    const errorDiv = document.getElementById('loginError');
    const errorSpan = errorDiv.querySelector('span');
    errorSpan.textContent = msg;
    errorDiv.style.display = 'flex';
}

function showLogin() {
    const loginScreen = document.getElementById('login-screen');
    const scanner = document.getElementById('scanner');
    const loadingScreen = document.getElementById('loadingScreen');

    if (loadingScreen) loadingScreen.style.display = 'none';
    if (scanner) scanner.style.display = 'none';
    if (loginScreen) {
        loginScreen.style.display = 'flex';
        // Focus en ID
        setTimeout(() => document.getElementById('loginId')?.focus(), 100);
    }
}

function showApp() {
    const loginScreen = document.getElementById('login-screen');
    const scanner = document.getElementById('scanner');
    const barcodeInput = document.getElementById('barcode');

    if (loginScreen) {
        loginScreen.style.opacity = '0';
        setTimeout(() => {
            loginScreen.style.display = 'none';
            loginScreen.style.opacity = '1';
        }, 300);
    }

    if (scanner) {
        scanner.style.display = 'flex';
        // Ajustar UI según rol
        applyRolePermissions();

        // Iniciar listeners normales de la app si no se han iniciado
        // (Esto se maneja en inicio.js, pero aseguramos foco)
        if (barcodeInput) barcodeInput.focus();
    }
}

function logout() {
    currentUser = null;
    localStorage.removeItem(AUTH_KEY);
    window.location.reload();
}

// Aplicar permisos según rol
function applyRolePermissions() {
    if (!currentUser) return;

    document.body.classList.remove('role-admin', 'role-delivery');

    if (currentUser.rol === 'ADMIN') {
        document.body.classList.add('role-admin');
    } else {
        document.body.classList.add('role-delivery');
    }

    // Actualizar UI existente (ocultar botones de eliminar si ya hay renderizados)
    updateDeleteButtonsVisibility();
}

function updateDeleteButtonsVisibility() {
    const isAdmin = currentUser && currentUser.rol === 'ADMIN';
    const deleteBtns = document.querySelectorAll('.btn-delete');

    deleteBtns.forEach(btn => {
        if (!isAdmin) {
            btn.style.display = 'none';
        } else {
            btn.style.display = 'flex';
        }
    });

    // CSS global rule helper (opcional, pero mejor manejado por JS dinámico en renderizado)
}

// Llamar al inicio
document.addEventListener('DOMContentLoaded', initAuth);
