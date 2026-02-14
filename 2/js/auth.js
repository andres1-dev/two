// Gestión de autenticación y sesiones
const AUTH_KEY = 'pandaDashUser';

// Estado de usuario
window.currentUser = null;
let currentUser = null; // Mantener local para compatibilidad con código existente en este archivo

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

    // Link recuperación
    const forgotLinks = document.getElementById('forgotPasswordLink');
    if (forgotLinks) {
        forgotLinks.addEventListener('click', (e) => {
            e.preventDefault();
            showRecoveryDialog();
        });
    }

    // Checking session
    checkSession();
}

// Verificar si hay sesión activa
function checkSession() {
    try {
        // Cambiado de sessionStorage a localStorage para persistencia al cerrar app
        const storedUser = localStorage.getItem(AUTH_KEY);
        if (storedUser) {
            window.currentUser = JSON.parse(storedUser);
            console.log("Sesión restaurada para:", window.currentUser.nombre);

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
        showLoginMessage("Por favor ingrese ID y contraseña", 'error');
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
            window.currentUser = result.user;
            localStorage.setItem(AUTH_KEY, JSON.stringify(window.currentUser));

            // Inicializar tiempo de actividad
            updateActivityTime();

            // Limpiar form
            idInput.value = '';
            passInput.value = '';

            // Iniciar app
            showApp();
        } else {
            showLoginMessage(result.message || "Credenciales incorrectas", 'error');
        }

    } catch (error) {
        console.error("Login error:", error);
        showLoginMessage("Error de conexión. Intente nuevamente.", 'error');
    } finally {
        btnLogin.disabled = false;
        btnText.style.display = 'block';
        btnLoader.style.display = 'none';
    }
}

function showLoginError(msg) {
    showLoginMessage(msg, 'error');
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

        // Actualizar UI de usuario (Header)
        if (typeof window.updateUserUI === 'function') {
            window.updateUserUI();
        }

        // Iniciar listeners normales de la app si no se han iniciado
        // (Esto se maneja en inicio.js, pero aseguramos foco)
        if (barcodeInput) barcodeInput.focus();

        // Iniciar monitor de inactividad
        initInactivityMonitoring();
    }
}

function logout() {
    currentUser = null;
    localStorage.removeItem(AUTH_KEY);
    localStorage.removeItem(ACTIVITY_KEY);
    window.location.reload();
}

// --- LOGICA DE INACTIVIDAD ---
const ACTIVITY_KEY = 'last_activity_timestamp';
const INACTIVITY_LIMIT_MS = 60 * 60 * 1000; // 1 hora

function updateActivityTime() {
    localStorage.setItem(ACTIVITY_KEY, Date.now().toString());
}

let inactivityInterval = null;

function initInactivityMonitoring() {
    if (inactivityInterval) return; // Ya iniciado

    // Actualizar timestamp al iniciar
    updateActivityTime();

    // Eventos que reinician el contador
    const activityEvents = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart'];

    // Usar throttle para no escribir en localStorage constantemente
    let lastUpdateStr = 0;

    const recordActivity = () => {
        const now = Date.now();
        if (now - lastUpdateStr > 5000) { // Actualizar máximo cada 5 segundos
            updateActivityTime();
            lastUpdateStr = now;
        }
    };

    activityEvents.forEach(evt => {
        window.addEventListener(evt, recordActivity, { passive: true });
    });

    // Chequear inactividad cada minuto
    inactivityInterval = setInterval(checkInactivity, 60000);
}

function checkInactivity() {
    const lastActivity = parseInt(localStorage.getItem(ACTIVITY_KEY) || '0');
    const now = Date.now();

    // Si ha pasado el tiempo límite
    if (now - lastActivity > INACTIVITY_LIMIT_MS) {

        // VERIFICAR COLA DE CARGA
        // Si hay elementos pendientes o procesando, NO cerrar sesión
        if (window.uploadQueue) {
            const hasPending = window.uploadQueue.queue.length > 0;
            const isProcessing = window.uploadQueue.isProcessing;

            if (hasPending || isProcessing) {
                console.log("Inactividad detectada, pero hay elementos en cola. Sesión mantenida.");
                // Opcional: Actualizar actividad para dar más tiempo sin checkear inmediatamente? 
                // No, mejor dejamos que siga checkeando. Mientras haya cola, no cierra.
                return;
            }
        }

        console.log("Cerrando sesión por inactividad (> 1h)");
        logout();
    }
}

// Aplicar permisos según rol
function applyRolePermissions() {
    if (!currentUser) return;

    // Remove old classes
    document.body.classList.remove('role-admin', 'role-moderator', 'role-user', 'role-guest', 'role-delivery');

    // Add new class based on role (normalized to lowercase)
    const roleClass = `role-${currentUser.rol.toLowerCase()}`;
    document.body.classList.add(roleClass);

    // Backward compatibility for 'role-delivery' logic if any
    if (currentUser.rol === 'USER' || currentUser.rol === 'DELIVERY') {
        document.body.classList.add('role-delivery'); // Keep using role-delivery styles if they exist
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
}

// Recuperación de contraseña (Directo al Email)
async function showRecoveryDialog() {
    const idInput = document.getElementById('loginId');
    const id = idInput.value.trim();
    const errorDiv = document.getElementById('loginError');

    // Resetear error/success previo
    if (errorDiv) errorDiv.style.display = 'none';

    if (!id) {
        showLoginMessage("Para recuperar tu contraseña, escribe tu ID en el campo de identificación.", "error");
        idInput.focus();
        return;
    }

    // Mostrar carga
    const loadingDiv = document.createElement('div');
    loadingDiv.id = 'recovery-loading';
    loadingDiv.style.cssText = 'position:fixed;inset:0;background:rgba(255,255,255,0.8);z-index:9999;display:flex;justify-content:center;align-items:center;color:var(--primary);flex-direction:column;gap:15px;backdrop-filter:blur(5px);';
    loadingDiv.innerHTML = '<i class="fas fa-paper-plane fa-bounce fa-3x"></i><span style="font-weight:700; font-size:1.2rem; color:var(--text-main);">Enviando correo...</span>';
    document.body.appendChild(loadingDiv);

    try {
        const formData = new FormData();
        formData.append('action', 'recover');
        formData.append('id', id);
        formData.append('method', 'email');

        const response = await fetch(API_URL_POST, {
            method: 'POST',
            body: formData
        });

        const result = await response.json();

        // Remover loading
        if (loadingDiv.parentNode) document.body.removeChild(loadingDiv);

        if (result.success) {
            showLoginMessage('Contraseña enviada a tu correo registrado', 'success');
        } else {
            showLoginMessage(result.message || 'Error al recuperar contraseña', 'error');
        }

    } catch (error) {
        if (document.getElementById('recovery-loading')) document.body.removeChild(document.getElementById('recovery-loading'));
        console.error(error);
        showLoginMessage('Error de conexión. Intenta nuevamente.', 'error');
    }
}

function showLoginMessage(msg, type) {
    const errorDiv = document.getElementById('loginError');
    const errorSpan = errorDiv.querySelector('span');
    const icon = errorDiv.querySelector('i');

    errorSpan.textContent = msg;
    errorDiv.style.display = 'flex';

    if (type === 'success') {
        errorDiv.style.background = '#dcfce7'; // green-100
        errorDiv.style.color = '#15803d';      // green-700
        errorDiv.style.border = '1px solid #86efac';// green-300
        if (icon) icon.className = 'fas fa-check-circle';
    } else {
        // Estilo error (default / rojo)
        errorDiv.style.background = '#fee2e2'; // red-100
        errorDiv.style.color = '#b91c1c';      // red-700
        errorDiv.style.border = '1px solid #fca5a5';// red-300
        if (icon) icon.className = 'fas fa-exclamation-circle';
    }
}

// Llamar al inicio
document.addEventListener('DOMContentLoaded', initAuth);
