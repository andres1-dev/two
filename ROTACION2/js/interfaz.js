// Lógica de Interfaz de Usuario y DOM - SOLO MÓVIL

// Función para extracción de datos de la UI
function extractDataFromUI(factura) {
    let lote = '', referencia = '', cantidad = 0;
    const facturaContainer = document.querySelector(`.siesa-item button[data-factura="${factura}"]`)?.closest('.siesa-item');
    
    if (facturaContainer) {
        const details = facturaContainer.querySelectorAll('.mini-detail');
        details.forEach(detail => {
            const label = detail.querySelector('.mini-label')?.textContent.trim();
            const value = detail.querySelector('.mini-value')?.textContent.trim();
            if (!label || !value) return;
            if (label.includes('LOTE')) lote = value;
            else if (label.includes('REFERENCIA')) referencia = value;
            else if (label.includes('CANTIDAD')) cantidad = parseFloat(value) || 0;
        });
    }
    return { lote, referencia, cantidad };
}

// Pantalla de carga
function hideLoadingScreen() {
    const scanner = document.getElementById('scanner');
    const loadingScreen = document.getElementById('loadingScreen');
    const barcodeInput = document.getElementById('barcode');

    if (scanner) scanner.style.display = 'flex';
    if (loadingScreen) {
        loadingScreen.style.opacity = '0';
        setTimeout(() => {
            loadingScreen.style.display = 'none';
            if (barcodeInput) barcodeInput.focus();
        }, 400);
    }
}

// Imágenes
function mostrarImagenCompleta(imageUrl) {
    let modal = document.getElementById('ih3Modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'ih3Modal';
        modal.className = 'ih3-modal';
        modal.innerHTML = `
            <span class="close-modal" onclick="cerrarImagenCompleta()">&times;</span>
            <img class="ih3-modal-img" src="" alt="Comprobante completo">
        `;
        document.body.appendChild(modal);
        modal.addEventListener('click', function (e) {
            if (e.target === modal) cerrarImagenCompleta();
        });
    }
    const img = modal.querySelector('.ih3-modal-img');
    img.src = imageUrl;
    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
}

function cerrarImagenCompleta() {
    const modal = document.getElementById('ih3Modal');
    if (modal) {
        modal.style.display = 'none';
        document.body.style.overflow = '';
    }
}

// Items Siesa (Acordeones)
function toggleSiesaItem(index) {
    const item = document.getElementById(`siesa-item-${index}`);
    if (item) {
        if (item.classList.contains('collapsed')) {
            item.classList.remove('collapsed');
            item.classList.add('expanded');
        } else {
            item.classList.remove('expanded');
            item.classList.add('collapsed');
        }
    }
}

function expandAllSiesaItems() {
    document.querySelectorAll('.siesa-item.collapsed').forEach(item => {
        const index = item.id.replace('siesa-item-', '');
        toggleSiesaItem(index);
    });
}

function collapseAllSiesaItems() {
    document.querySelectorAll('.siesa-item.expanded').forEach(item => {
        const index = item.id.replace('siesa-item-', '');
        toggleSiesaItem(index);
    });
}

// Inicialización de Listeners UI (SOLO MÓVIL)
function initUIListeners() {
    const barcodeInput = document.getElementById('barcode');
    initPDAModes();
    initSettingsUI();

    // Prevenir teclado virtual en cámara
    document.addEventListener('touchstart', function (e) {
        const cameraModal = document.getElementById('cameraModal');
        if (cameraModal && cameraModal.style.display === 'flex' &&
            e.target.tagName !== 'BUTTON') {
            e.preventDefault();
            if (document.activeElement) document.activeElement.blur();
        }
    }, { passive: false });

    // Estado Global para Modos
    window.APP_MODE = 'PDA';

    function initPDAModes() {
        const btnCamera = document.querySelector('.mode-option-card.btn-camera');
        const btnManual = document.querySelector('.mode-option-card.btn-keyboard');
        const btnPDA = document.querySelector('.mode-option-card.btn-pda');
        const barcodeInput = document.getElementById('barcode');
        const inputIcon = document.getElementById('inputIcon');
        const statusDiv = document.getElementById('status');
        const keypadModal = document.getElementById('virtualKeypadModal');
        const keypadDisplay = document.getElementById('keypadDisplay');
        const closeKeypadBtn = document.getElementById('closeKeypadBtn');
        const keypadOverlay = document.getElementById('keypadOverlay');
        const keyBtns = document.querySelectorAll('.key-btn');

        // Actualizar UI de usuario
        window.updateUserUI = function () {
            if (typeof currentUser !== 'undefined' && currentUser) {
                const nameEl = document.getElementById('settingsUserName');
                const roleEl = document.getElementById('settingsUserRole');
                if (nameEl) nameEl.textContent = currentUser.nombre || 'Usuario';
                if (roleEl) roleEl.textContent = currentUser.rol || 'Rol';

                // Visibilidad Admin Nav en móvil (botón en settings)
                const adminSection = document.getElementById('adminSection');
                if (adminSection) {
                    adminSection.style.display = currentUser.rol === 'ADMIN' ? 'block' : 'none';
                }

                // Visibilidad Historial (ocultar para USER)
                const navHistory = document.getElementById('navHistoryItem');
                if (navHistory) {
                    navHistory.style.display = currentUser.rol !== 'USER' ? 'flex' : 'none';
                }

                // Visibilidad Upload (Admin/Moderator)
                const navUpload = document.getElementById('navUploadItem');
                if (navUpload) {
                    navUpload.style.display = (currentUser.rol === 'ADMIN' || currentUser.rol === 'MODERATOR') ? 'flex' : 'none';
                }
            }

            // Deshabilitar modo manual si no hay cliente
            const hasClient = (typeof USER_SETTINGS !== 'undefined' && USER_SETTINGS.filterEnabled && USER_SETTINGS.selectedClient);
            if (btnManual) {
                if (!hasClient) {
                    btnManual.classList.add('card-disabled');
                    btnManual.title = "Seleccione un cliente primero";
                } else {
                    btnManual.classList.remove('card-disabled');
                    btnManual.title = "Modo Manual";
                }
            }
        };
        window.updateUserUI();

        // --- LÓGICA DE MODOS ---
        function setMode(mode) {
            if (mode === 'MANUAL') {
                const hasClient = (typeof USER_SETTINGS !== 'undefined' && USER_SETTINGS.filterEnabled && USER_SETTINGS.selectedClient);
                if (!hasClient) {
                    alert("⚠️ Para usar el modo manual, selecciona un cliente en Configuración.");
                    return;
                }
            }

            window.APP_MODE = mode;
            if (typeof saveAppMode === 'function') saveAppMode(mode);

            document.querySelectorAll('.mode-option-card').forEach(b => b.classList.remove('active'));
            document.body.classList.remove('manual-mode-active');

            if (barcodeInput) {
                barcodeInput.readOnly = false;
                barcodeInput.removeAttribute("inputmode");
                barcodeInput.value = "";
            }

            if (mode === 'PDA') {
                if (btnPDA) btnPDA.classList.add('active');
                if (barcodeInput) barcodeInput.placeholder = "Escanear con PDA (Laser)...";
                if (inputIcon) {
                    inputIcon.className = "fa-solid fa-barcode";
                    inputIcon.title = USER_SETTINGS?.persistentFocus ? "Foco Activo" : "Foco Inactivo";
                    inputIcon.style.color = USER_SETTINGS?.persistentFocus ? "var(--primary)" : "var(--text-secondary)";
                }
                if (statusDiv) statusDiv.textContent = "Modo PDA";
                enforceFocusLoop();
            } else if (mode === 'MANUAL') {
                if (btnManual) btnManual.classList.add('active');
                document.body.classList.add('manual-mode-active');
                if (barcodeInput) {
                    barcodeInput.placeholder = "Tocar para ingresar LOTE...";
                    barcodeInput.readOnly = true;
                }
                if (inputIcon) {
                    inputIcon.className = "fas fa-keyboard";
                    inputIcon.title = "Abrir teclado";
                }
                if (statusDiv) statusDiv.textContent = `Modo Manual: ${USER_SETTINGS?.selectedClient?.substring(0, 15) || ''}...`;
            } else if (mode === 'CAMERA') {
                if (btnCamera) btnCamera.classList.add('active');
                if (barcodeInput) {
                    barcodeInput.placeholder = "Tocar para escanear...";
                    barcodeInput.readOnly = true;
                }
                if (inputIcon) {
                    inputIcon.className = "fas fa-camera";
                    inputIcon.title = "Abrir cámara";
                }
                if (statusDiv) statusDiv.textContent = "Modo Cámara";
            }
        }

        // Manejar interacción con ícono
        function handleInputInteraction(e) {
            if (window.APP_MODE === 'PDA') {
                if (typeof USER_SETTINGS !== 'undefined') {
                    USER_SETTINGS.persistentFocus = !USER_SETTINGS.persistentFocus;
                    if (statusDiv) {
                        statusDiv.textContent = USER_SETTINGS.persistentFocus ? "Foco ACTIVADO" : "Foco DESACTIVADO";
                        setTimeout(() => { if (window.APP_MODE === 'PDA') statusDiv.textContent = "Modo PDA"; }, 2000);
                    }
                    if (inputIcon) {
                        inputIcon.title = USER_SETTINGS.persistentFocus ? "Foco Activo" : "Foco Inactivo";
                        inputIcon.style.color = USER_SETTINGS.persistentFocus ? "var(--primary)" : "var(--text-secondary)";
                    }
                    if (USER_SETTINGS.persistentFocus && barcodeInput) barcodeInput.focus();
                }
            } else if (window.APP_MODE === 'MANUAL') {
                openKeypad();
            } else if (window.APP_MODE === 'CAMERA') {
                if (typeof QRScanner !== 'undefined' && window.qrScanner) {
                    window.qrScanner.openScanner();
                } else if (typeof openQRScanner === 'function') {
                    openQRScanner();
                }
            }
        }

        if (inputIcon) inputIcon.addEventListener('click', handleInputInteraction);
        if (barcodeInput) {
            barcodeInput.addEventListener('click', (e) => {
                if (window.APP_MODE === 'MANUAL' || window.APP_MODE === 'CAMERA') {
                    handleInputInteraction(e);
                }
            });
        }

        // --- VIRTUAL KEYPAD ---
        let keypadValue = "";
        function openKeypad() {
            keypadValue = "";
            updateKeypadDisplay();
            if (keypadModal) keypadModal.style.display = 'flex';
        }
        function closeKeypad() {
            if (keypadModal) keypadModal.style.display = 'none';
        }
        function updateKeypadDisplay() {
            if (keypadDisplay) keypadDisplay.textContent = keypadValue || "---";
        }
        function handleKeypadInput(key) {
            if (key === 'clear') keypadValue = "";
            else if (key === 'backspace') keypadValue = keypadValue.slice(0, -1);
            else if (key === 'enter') { submitKeypad(); return; }
            else if (keypadValue.length < 20) keypadValue += key;
            updateKeypadDisplay();
        }
        function submitKeypad() {
            if (!keypadValue) return;
            closeKeypad();
            if (barcodeInput) {
                barcodeInput.value = keypadValue;
                setTimeout(() => {
                    if (window.APP_MODE === 'MANUAL') {
                        const event = new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', keyCode: 13, bubbles: true });
                        barcodeInput.dispatchEvent(event);
                    }
                }, 100);
            }
        }

        if (keyBtns) {
            keyBtns.forEach(btn => {
                btn.addEventListener('touchstart', (e) => {
                    e.preventDefault();
                    const key = btn.getAttribute('data-key');
                    handleKeypadInput(key);
                    btn.classList.add('active-key');
                    setTimeout(() => btn.classList.remove('active-key'), 100);
                }, { passive: false });
                btn.addEventListener('click', (e) => {
                    const key = btn.getAttribute('data-key');
                    handleKeypadInput(key);
                });
            });
        }
        if (closeKeypadBtn) closeKeypadBtn.addEventListener('click', closeKeypad);
        if (keypadOverlay) keypadOverlay.addEventListener('click', closeKeypad);

        // Botones de modo
        if (btnPDA) btnPDA.addEventListener('click', () => setMode('PDA'));
        if (btnManual) btnManual.addEventListener('click', () => setMode('MANUAL'));
        if (btnCamera) btnCamera.addEventListener('click', () => setMode('CAMERA'));

        // Logout
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => {
                if (confirm("¿Cerrar sesión?")) {
                    if (typeof logout === 'function') logout();
                    else window.location.reload();
                }
            });
        }

        // Inactividad (30 min)
        let inactivityTimer;
        function resetInactivityTimer() {
            clearTimeout(inactivityTimer);
            inactivityTimer = setTimeout(() => {
                alert("Sesión cerrada por inactividad (30 min)");
                if (typeof logout === 'function') logout();
                else window.location.reload();
            }, 30 * 60 * 1000);
        }
        ['click', 'touchstart', 'mousemove', 'keydown'].forEach(evt =>
            document.addEventListener(evt, resetInactivityTimer)
        );
        resetInactivityTimer();

        // Focus persistente (solo PDA)
        function enforceFocusLoop() {
            if (window.APP_MODE !== 'PDA') return;
            if (typeof USER_SETTINGS !== 'undefined' && !USER_SETTINGS.persistentFocus) return;
            const activeElement = document.activeElement;
            const isInput = activeElement?.tagName === 'INPUT' || activeElement?.tagName === 'TEXTAREA';
            const cameraModal = document.getElementById('cameraModal');
            const settingsModal = document.getElementById('settingsModal');
            const virtualKeypad = document.getElementById('virtualKeypadModal');
            const isModalOpen = (cameraModal?.style.display === 'flex') ||
                               (settingsModal?.style.display === 'block') ||
                               (virtualKeypad?.style.display !== 'none');
            if (!isModalOpen && activeElement !== barcodeInput && !isInput) {
                if (barcodeInput) barcodeInput.focus();
            }
            if (window.APP_MODE === 'PDA') {
                setTimeout(enforceFocusLoop, 500);
            }
        }

        // Modo por defecto
        const savedMode = (typeof getSavedAppMode === 'function') ? getSavedAppMode() : 'PDA';
        if (savedMode === 'MANUAL') {
            const hasClient = (typeof USER_SETTINGS !== 'undefined' && USER_SETTINGS.filterEnabled && USER_SETTINGS.selectedClient);
            setMode(hasClient ? 'MANUAL' : 'PDA');
        } else {
            setMode(savedMode);
        }
    }

    // Eventos adicionales móvil
    window.addEventListener('orientationchange', function () {
        const cameraModal = document.getElementById('cameraModal');
        if (cameraModal && cameraModal.style.display === 'flex') {
            setTimeout(() => document.activeElement?.blur(), 300);
        }
    });

    // Bloqueo de zoom
    document.addEventListener('gesturestart', function (e) { e.preventDefault(); });
    let lastTouchEnd = 0;
    document.addEventListener('touchend', function (e) {
        const now = Date.now();
        if (now - lastTouchEnd <= 300) e.preventDefault();
        lastTouchEnd = now;
    }, { passive: false });
    document.addEventListener('keydown', function (e) {
        if (e.ctrlKey && (e.key === '+' || e.key === '-' || e.key === '0')) e.preventDefault();
    });
}

// Configuración UI
function initSettingsUI() {
    const minBtn = document.getElementById('openSettingsBtn');
    const modal = document.getElementById('settingsModal');
    const closeBtn = document.getElementById('closeSettingsBtn');
    const overlay = document.getElementById('settingsOverlay');
    const clientSelect = document.getElementById('clientSelect');
    const focusToggle = document.getElementById('persistentFocusToggle');
    const filterToggle = document.getElementById('clientFilterToggle');
    const clientContainer = document.getElementById('clientSelectContainer');

    if (!minBtn || !modal) return;

    // Poblar clientes
    if (clientSelect && typeof CLIENTS_MAP !== 'undefined') {
        clientSelect.innerHTML = '<option value="">-- Seleccionar Cliente --</option>';
        Object.keys(CLIENTS_MAP).forEach(clientName => {
            const option = document.createElement('option');
            option.value = clientName;
            option.textContent = clientName;
            clientSelect.appendChild(option);
        });
    }

    function loadToUI() {
        if (focusToggle) {
            focusToggle.checked = USER_SETTINGS?.persistentFocus || false;
        }
        if (filterToggle) filterToggle.checked = USER_SETTINGS?.filterEnabled || false;
        if (clientSelect) clientSelect.value = USER_SETTINGS?.selectedClient || '';
        if (clientContainer) {
            clientContainer.style.display = USER_SETTINGS?.filterEnabled ? 'block' : 'none';
        }

        // Botón Admin en settings (móvil)
        const settingsBody = document.querySelector('.settings-body');
        let adminSection = document.getElementById('adminSection');
        if (typeof currentUser !== 'undefined' && currentUser && currentUser.rol === 'ADMIN') {
            if (!adminSection) {
                adminSection = document.createElement('div');
                adminSection.id = 'adminSection';
                adminSection.className = 'setting-item';
                adminSection.style.borderTop = '1px solid var(--border)';
                adminSection.style.marginTop = '20px';
                adminSection.style.paddingTop = '20px';
                adminSection.innerHTML = `
                    <div class="setting-info">
                        <span class="setting-title"><i class="fas fa-shield-alt"></i> Administración</span>
                        <span class="setting-desc">Panel de control de usuarios</span>
                    </div>
                    <button id="adminUsersBtn" class="btn-primary" style="width: 100%;">
                        <i class="fas fa-users-cog"></i> Gestionar Usuarios
                    </button>
                `;
                settingsBody.appendChild(adminSection);
                document.getElementById('adminUsersBtn').addEventListener('click', () => {
                    closeModal();
                    if (typeof openUserAdmin === 'function') openUserAdmin();
                });
            }
            adminSection.style.display = 'block';
        } else {
            if (adminSection) adminSection.style.display = 'none';
        }
    }

    function openModal() {
        if (!modal) return;
        loadToUI();
        modal.style.display = 'flex';
        if (overlay) overlay.style.display = 'block';
    }

    function closeModal() {
        if (modal) modal.style.display = 'none';
        if (overlay) overlay.style.display = 'none';
        const barcodeInput = document.getElementById('barcode');
        if (barcodeInput && USER_SETTINGS?.persistentFocus) barcodeInput.focus();
    }

    minBtn.addEventListener('click', openModal);
    if (closeBtn) closeBtn.addEventListener('click', closeModal);
    if (overlay) overlay.addEventListener('click', closeModal);

    const updateSettings = () => {
        if (!USER_SETTINGS) return;
        if (focusToggle) USER_SETTINGS.persistentFocus = focusToggle.checked;
        if (filterToggle) USER_SETTINGS.filterEnabled = filterToggle.checked;
        if (clientSelect) USER_SETTINGS.selectedClient = clientSelect.value;
        if (typeof saveUserSettings === 'function') saveUserSettings();

        const statusEl = document.getElementById('status');
        if (statusEl) {
            if (USER_SETTINGS.filterEnabled && USER_SETTINGS.selectedClient) {
                statusEl.textContent = `${USER_SETTINGS.selectedClient.substring(0, 20)}...`;
            } else {
                statusEl.textContent = 'Sistema Listo';
            }
        }
        if (typeof window.updateUserUI === 'function') window.updateUserUI();
    };

    if (focusToggle) focusToggle.addEventListener('change', updateSettings);
    if (filterToggle) {
        filterToggle.addEventListener('change', (e) => {
            if (clientContainer) clientContainer.style.display = e.target.checked ? 'block' : 'none';
            updateSettings();
        });
    }
    if (clientSelect) clientSelect.addEventListener('change', updateSettings);
}