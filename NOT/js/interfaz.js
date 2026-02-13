// Lógica de Interfaz de Usuario y DOM

// Función para extracción de datos de la UI
function extractDataFromUI(factura) {
    let lote = '', referencia = '', cantidad = 0;

    // Buscar contenedor de la factura
    const facturaContainer = document.querySelector(`.siesa-item button[data-factura="${factura}"]`)?.closest('.siesa-item');

    if (facturaContainer) {
        // Buscar en los detalles miniatura
        const details = facturaContainer.querySelectorAll('.mini-detail');

        details.forEach(detail => {
            const label = detail.querySelector('.mini-label')?.textContent.trim();
            const value = detail.querySelector('.mini-value')?.textContent.trim();

            if (!label || !value) return;

            if (label.includes('LOTE')) lote = value;
            else if (label.includes('REFERENCIA')) referencia = value;
        });

        if (!cantidad) {
            details.forEach(detail => {
                const label = detail.querySelector('.mini-label')?.textContent.trim();
                if (label && label.includes('CANTIDAD')) {
                    cantidad = parseFloat(detail.querySelector('.mini-value')?.textContent.trim()) || 0;
                }
            });
        }
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
            if (barcodeInput) {
                barcodeInput.focus();
            }
        }, 500);
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
            if (e.target === modal) {
                cerrarImagenCompleta();
            }
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

// Utilidades UI
function esMovil() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

// Inicialización de Listeners UI (llamado desde inicio.js)
function initUIListeners() {
    const barcodeInput = document.getElementById('barcode');

    // Inicializar Modos de Interacción (PDA, Manual, Cámara)
    initPDAModes();

    // Inicializar UI de Configuracion
    initSettingsUI();

    // Detector para deshabilitar el teclado virtual en dispositivos móviles
    document.addEventListener('touchstart', function (e) {
        const cameraModal = document.getElementById('cameraModal');
        if (cameraModal && cameraModal.style.display === 'flex' &&
            e.target.tagName !== 'BUTTON') {
            e.preventDefault();
            if (document.activeElement) {
                document.activeElement.blur();
            }
        }
    }, { passive: false });

    // Global State for Modes
    window.APP_MODE = 'PDA'; // 'PDA', 'MANUAL', 'CAMERA'

    function initPDAModes() {
        let focusTimer = null; // Timer para control de foco

        // Selectors for new modal cards
        const btnCamera = document.querySelector('.mode-option-card.btn-camera');
        const btnManual = document.querySelector('.mode-option-card.btn-keyboard');
        const btnPDA = document.querySelector('.mode-option-card.btn-pda');

        const barcodeInput = document.getElementById('barcode');
        const inputIcon = document.getElementById('inputIcon');
        const statusDiv = document.getElementById('status');
        const clientBadge = document.getElementById('clientStatusBadge');
        const clientNameDisplay = document.getElementById('clientNameDisplay');

        // Keypad Selectors
        const keypadModal = document.getElementById('virtualKeypadModal');
        const keypadDisplay = document.getElementById('keypadDisplay');
        const closeKeypadBtn = document.getElementById('closeKeypadBtn');
        const keypadOverlay = document.getElementById('keypadOverlay');
        const keyBtns = document.querySelectorAll('.key-btn');

        // Update User Info & Client Status
        window.updateUserUI = function () {
            // Update User Info in Settings
            if (typeof currentUser !== 'undefined' && currentUser) {
                const nameEl = document.getElementById('settingsUserName');
                const roleEl = document.getElementById('settingsUserRole');
                if (nameEl) nameEl.textContent = currentUser.nombre || 'Usuario';
                if (roleEl) roleEl.textContent = currentUser.rol || 'Rol';

                // Sidebar Update - ELIMINADO (solo móvil, ya no hay sidebar desktop)
                // Se mantiene solo para compatibilidad con otras partes del código
                const sidebarName = document.getElementById('sidebarUserName');
                const sidebarRole = document.getElementById('sidebarUserRole');
                const sidebarAvatar = document.getElementById('sidebarAvatar');

                if (sidebarName) sidebarName.textContent = currentUser.nombre || 'Usuario';
                if (sidebarRole) sidebarRole.textContent = currentUser.rol || 'Rol';

                if (sidebarAvatar) {
                    const role = currentUser.rol || 'USER';
                    let iconClass = 'fas fa-user';
                    let bgColor = 'var(--primary)';

                    if (role === 'ADMIN') {
                        iconClass = 'fas fa-user-shield';
                        bgColor = '#ef4444';
                    } else if (role === 'MODERATOR') {
                        iconClass = 'fas fa-user-cog';
                        bgColor = '#f59e0b';
                    } else if (role === 'GUEST') {
                        iconClass = 'fas fa-user-tag';
                        bgColor = '#6b7280';
                    }

                    sidebarAvatar.style.background = bgColor;
                    sidebarAvatar.innerHTML = `<i class="${iconClass}"></i>`;
                }

                // Mobile/Settings Avatar Update
                const mobileAvatar = document.querySelector('.user-profile-section .user-avatar');
                if (mobileAvatar) {
                    const role = currentUser.rol || 'USER';
                    let iconClass = 'fas fa-user';
                    let bgColor = 'var(--primary)';

                    if (role === 'ADMIN') {
                        iconClass = 'fas fa-user-shield';
                        bgColor = '#ef4444';
                    } else if (role === 'MODERATOR') {
                        iconClass = 'fas fa-user-cog';
                        bgColor = '#f59e0b';
                    } else if (role === 'GUEST') {
                        iconClass = 'fas fa-user-tag';
                        bgColor = '#6b7280';
                    }

                    mobileAvatar.style.background = bgColor;
                    mobileAvatar.innerHTML = `<i class="${iconClass}"></i>`;
                }

                // Admin Nav Item Visibility - MOBILE VERSION
                const navAdmin = document.getElementById('navAdminItem');
                if (navAdmin) {
                    if (currentUser.rol === 'ADMIN') navAdmin.style.display = 'flex';
                    else navAdmin.style.display = 'none';
                }
            }

            // Update Client Badge (Hidden per request)
            if (clientBadge) clientBadge.style.display = 'none';

            // Disable Manual Mode if No Client Selected
            const hasClient = (typeof USER_SETTINGS !== 'undefined' && USER_SETTINGS.filterEnabled && USER_SETTINGS.selectedClient);
            const _btnManual = document.querySelector('.mode-option-card.btn-keyboard');

            if (_btnManual) {
                if (!hasClient) {
                    _btnManual.classList.add('card-disabled');
                    _btnManual.title = "Seleccione un cliente primero";
                } else {
                    _btnManual.classList.remove('card-disabled');
                    _btnManual.title = "Modo Manual";
                }
            }

            // Show/Hide History based on role (Not for USER)
            const navHistory = document.getElementById('navHistoryItem');
            if (navHistory) {
                if (typeof currentUser !== 'undefined' && currentUser) {
                    if (currentUser.rol !== 'USER') {
                        navHistory.style.display = 'flex';
                        navHistory.style.pointerEvents = 'auto';
                        navHistory.style.opacity = '1';
                    } else {
                        navHistory.style.display = 'none';
                    }
                } else {
                    navHistory.style.display = 'none';
                }
            }

            // Show/Hide Upload based on role (Admin/Moderator)
            const navUpload = document.getElementById('navUploadItem');
            if (navUpload) {
                if (typeof currentUser !== 'undefined' && currentUser) {
                    if (currentUser.rol === 'ADMIN' || currentUser.rol === 'MODERATOR') {
                        navUpload.style.display = 'flex';
                    } else {
                        navUpload.style.display = 'none';
                    }
                } else {
                    navUpload.style.display = 'none';
                }
            }

            // Show/Hide Notification Button for Admin only (Soportes Grid)
            const btnNotify = document.getElementById('btnNotifyToday');
            if (btnNotify) {
                btnNotify.style.display = (currentUser && currentUser.rol === 'ADMIN') ? 'flex' : 'none';
            }
        };

        // Initial Update
        window.updateUserUI();

        // --- ELIMINADO: switchDesktopView (ahora mobile-only) ---

        // Mode Switchers
        function setMode(mode) {
            // Prevent entering Manual if disabled
            if (mode === 'MANUAL') {
                const hasClient = (typeof USER_SETTINGS !== 'undefined' && USER_SETTINGS.filterEnabled && USER_SETTINGS.selectedClient);
                if (!hasClient) {
                    alert("⚠️ Para usar el modo manual, DEBES seleccionar un cliente en Configuración.");
                    return;
                }
            }

            window.APP_MODE = mode;
            if (typeof saveAppMode === 'function') saveAppMode(mode);

            // Visual Updates (Grid Cards)
            document.querySelectorAll('.mode-option-card').forEach(b => b.classList.remove('active'));
            document.body.classList.remove('manual-mode-active');

            // Hide Trigger Btn by default
            const triggerBtn = document.getElementById('triggerCameraBtn');
            const triggerIcon = triggerBtn ? triggerBtn.querySelector('i') : null;

            if (triggerBtn) {
                triggerBtn.style.display = 'none';
                triggerBtn.className = 'input-action-btn';
            }
            if (barcodeInput) {
                barcodeInput.readOnly = false;
                barcodeInput.removeAttribute("inputmode");
                barcodeInput.removeAttribute("pattern");
                barcodeInput.value = "";
            }

            if (mode === 'PDA') {
                if (btnPDA) btnPDA.classList.add('active');
                if (barcodeInput) {
                    barcodeInput.placeholder = "Escanear con PDA (Laser)...";
                }
                if (inputIcon) {
                    inputIcon.className = "fa-solid fa-barcode";
                    inputIcon.title = USER_SETTINGS.persistentFocus ? "Foco Activo (Tocar para desactivar)" : "Foco Inactivo (Tocar para activar)";
                    inputIcon.style.color = USER_SETTINGS.persistentFocus ? "var(--primary)" : "var(--text-secondary)";
                }
                if (statusDiv) statusDiv.textContent = "Modo PDA: Escaneo rápido";
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
                    inputIcon.title = "Tocar para abrir teclado";
                }
                if (statusDiv) statusDiv.textContent = `${USER_SETTINGS.selectedClient.substring(0, 200)}`;

            } else if (mode === 'CAMERA') {
                if (btnCamera) btnCamera.classList.add('active');

                if (triggerBtn) {
                    triggerBtn.style.display = 'flex';
                    if (triggerIcon) triggerIcon.className = "fas fa-camera";
                    triggerBtn.title = "Abrir Cámara";
                }

                if (barcodeInput) {
                    barcodeInput.placeholder = "Tocar para escanear...";
                    barcodeInput.value = "";
                    barcodeInput.readOnly = true;
                }
                if (inputIcon) {
                    inputIcon.className = "fas fa-camera";
                    inputIcon.title = "Tocar para abrir cámara";
                }
                if (statusDiv) statusDiv.textContent = "Modo Cámara: Listo";
            }
        }

        // Interaction Handler
        function handleInputInteraction(e) {
            if (window.APP_MODE === 'PDA') {
                if (typeof USER_SETTINGS !== 'undefined') {
                    USER_SETTINGS.persistentFocus = !USER_SETTINGS.persistentFocus;

                    const msg = USER_SETTINGS.persistentFocus ? "Foco Persistente: ACTIVADO" : "Foco Persistente: DESACTIVADO";
                    if (statusDiv) {
                        statusDiv.textContent = msg;
                    }

                    setTimeout(() => {
                        if (window.APP_MODE === 'PDA') {
                            statusDiv.textContent = "Modo PDA: Escaneo rápido";
                        }
                    }, 2000);

                    if (inputIcon) {
                        inputIcon.title = USER_SETTINGS.persistentFocus ? "Foco Activo (Tocar para desactivar)" : "Foco Inactivo (Tocar para activar)";
                        inputIcon.style.color = USER_SETTINGS.persistentFocus ? "var(--primary)" : "var(--text-secondary)";
                    }

                    if (USER_SETTINGS.persistentFocus && barcodeInput) barcodeInput.focus();
                }
            }
            else if (window.APP_MODE === 'MANUAL') {
                openKeypad();
            }
            else if (window.APP_MODE === 'CAMERA') {
                if (typeof QRScanner !== 'undefined' && window.qrScanner) {
                    window.qrScanner.openScanner();
                } else if (typeof openQRScanner === 'function') openQRScanner();
                else alert("Escáner no disponible");
            }
        }

        // Attach Interaction Listeners
        if (inputIcon) inputIcon.addEventListener('click', handleInputInteraction);
        if (barcodeInput) {
            barcodeInput.addEventListener('click', (e) => {
                if (window.APP_MODE === 'MANUAL' || window.APP_MODE === 'CAMERA') {
                    handleInputInteraction(e);
                }
            });
        }

        // Trigger Button Logic
        const triggerBtn = document.getElementById('triggerCameraBtn');
        if (triggerBtn) {
            triggerBtn.addEventListener('click', (e) => {
                e.preventDefault();
                if (window.APP_MODE === 'CAMERA') {
                    if (typeof QRScanner !== 'undefined' && window.qrScanner) {
                        window.qrScanner.openScanner();
                    } else if (typeof openQRScanner === 'function') openQRScanner();
                    else alert("Escáner no disponible");
                }
            });
        }

        // Virtual Keypad Logic
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
            if (key === 'clear') {
                keypadValue = "";
            } else if (key === 'backspace') {
                keypadValue = keypadValue.slice(0, -1);
            } else if (key === 'enter') {
                submitKeypad();
                return;
            } else {
                if (keypadValue.length < 20) {
                    keypadValue += key;
                }
            }
            updateKeypadDisplay();
        }

        function submitKeypad() {
            if (!keypadValue) return;

            closeKeypad();

            if (barcodeInput) {
                barcodeInput.value = keypadValue;

                setTimeout(() => {
                    if (window.APP_MODE === 'MANUAL') {
                        const event = new KeyboardEvent('keydown', {
                            key: 'Enter',
                            code: 'Enter',
                            which: 13,
                            keyCode: 13,
                            bubbles: true,
                            cancelable: true
                        });
                        barcodeInput.dispatchEvent(event);
                    }
                }, 100);
            }
        }

        // Keypad Listeners
        if (keyBtns) {
            keyBtns.forEach(btn => {
                const handleInput = (e) => {
                    if (e.type === 'touchstart') {
                        e.preventDefault();
                    }
                    const key = btn.getAttribute('data-key');
                    handleKeypadInput(key);

                    btn.classList.add('active-key');
                    setTimeout(() => btn.classList.remove('active-key'), 100);
                };

                btn.addEventListener('touchstart', handleInput, { passive: false });
                btn.addEventListener('click', handleInput);
            });
        }
        if (closeKeypadBtn) closeKeypadBtn.addEventListener('click', closeKeypad);
        if (keypadOverlay) keypadOverlay.addEventListener('click', closeKeypad);

        // Listeners for mode buttons
        if (btnPDA) btnPDA.addEventListener('click', () => setMode('PDA'));
        if (btnManual) btnManual.addEventListener('click', () => setMode('MANUAL'));
        if (btnCamera) btnCamera.addEventListener('click', () => setMode('CAMERA'));

        // Logout Logic
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => {
                if (confirm("¿Cerrar sesión?")) {
                    if (typeof logout === 'function') logout();
                    else window.location.reload();
                }
            });
        }

        // 30 Min Inactivity Timeout
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

        // Persistent Focus Logic (Only for PDA Mode) - EXTREMADAMENTE INSISTENTE
        function enforceFocusLoop() {
            clearTimeout(focusTimer);

            if (window.APP_MODE !== 'PDA') return;
            if (typeof USER_SETTINGS !== 'undefined' && !USER_SETTINGS.persistentFocus) return;

            const barcodeInput = document.getElementById('barcode');
            if (!barcodeInput) return;

            const activeElement = document.activeElement;
            const isInput = activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA';

            // Check for ANY open modal or overlay view
            const cameraModal = document.getElementById('cameraModal');
            const settingsModal = document.getElementById('settingsModal');
            const virtualKeypad = document.getElementById('virtualKeypadModal');
            const soportesModal = document.getElementById('soportesGridModal');
            const historyView = document.getElementById('historyView');
            const uploadSiesaView = document.getElementById('uploadSiesaView');
            const qrScannerModal = document.getElementById('qrScannerModal');
            const ih3Modal = document.getElementById('ih3Modal');
            const queueModal = document.getElementById('queueModal');
            const loginScreen = document.getElementById('login-screen');

            // Determine if flow is blocked by UI
            const isOverlayOpen =
                (cameraModal && getComputedStyle(cameraModal).display !== 'none') ||
                (settingsModal && getComputedStyle(settingsModal).display !== 'none') ||
                (virtualKeypad && getComputedStyle(virtualKeypad).display !== 'none') ||
                (soportesModal && getComputedStyle(soportesModal).display !== 'none') ||
                (historyView && getComputedStyle(historyView).display !== 'none') ||
                (uploadSiesaView && getComputedStyle(uploadSiesaView).display !== 'none') ||
                (qrScannerModal && getComputedStyle(qrScannerModal).display !== 'none') ||
                (ih3Modal && getComputedStyle(ih3Modal).display !== 'none') ||
                (queueModal && getComputedStyle(queueModal).display !== 'none') ||
                (loginScreen && getComputedStyle(loginScreen).display !== 'none');

            if (!isOverlayOpen) {
                // If main screen active and focus lost, FORCE IT BACK
                if (activeElement !== barcodeInput) {
                    barcodeInput.focus();
                }
            }

            // Extremely fast loop (100ms) for high responsiveness with Laser Scanners
            if (window.APP_MODE === 'PDA') {
                focusTimer = setTimeout(enforceFocusLoop, 100);
            }
        }

        // Immediate refocus on blur (Aggressive)
        if (barcodeInput) {
            barcodeInput.addEventListener('blur', (e) => {
                if (window.APP_MODE === 'PDA' && USER_SETTINGS.persistentFocus) {
                    // Wait slightly to allow legitimate clicks (like buttons)
                    setTimeout(() => {
                        // Check again if we should refocus by calling the smart loop
                        enforceFocusLoop();
                    }, 50);
                }
            });

            // Re-focus on click outside
            document.addEventListener('click', (e) => {
                if (window.APP_MODE === 'PDA' && USER_SETTINGS.persistentFocus) {
                    const target = e.target;
                    const isButton = target.tagName === 'BUTTON' || target.closest('button') || target.tagName === 'A';
                    const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA';

                    if (!isButton && !isInput) {
                        setTimeout(() => enforceFocusLoop(), 10);
                    }
                }
            });
        }

        // Input Handling
        if (barcodeInput) {
            barcodeInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    const val = barcodeInput.value.trim();
                    if (!val) return;

                    if (window.APP_MODE === 'MANUAL') {
                        e.preventDefault();

                        if (!USER_SETTINGS || !USER_SETTINGS.selectedClient) {
                            alert("Error: No has seleccionado cliente");
                            return;
                        }

                        const nit = (typeof CLIENTS_MAP !== 'undefined') ? CLIENTS_MAP[USER_SETTINGS.selectedClient] : null;

                        if (!nit) {
                            alert("Error: Cliente sin NIT configurado");
                            return;
                        }

                        const fullCode = `REC${val}-${nit}`;

                        barcodeInput.value = "";

                        if (typeof parseQRCode === 'function') {
                            const parts = parseQRCode(fullCode);
                            if (parts) {
                                processQRCodeParts(parts);
                            } else {
                                if (typeof showError === 'function') showError(fullCode, "Error formato generado manual");
                            }
                        }
                    }
                }
            });
        }

        // Start Default: Recobrar modo anterior o PDA por defecto
        const savedMode = (typeof getSavedAppMode === 'function') ? getSavedAppMode() : 'PDA';
        if (savedMode === 'MANUAL') {
            const hasClient = (typeof USER_SETTINGS !== 'undefined' && USER_SETTINGS.filterEnabled && USER_SETTINGS.selectedClient);
            if (hasClient) {
                setMode('MANUAL');
            } else {
                setMode('PDA');
            }
        } else {
            setMode(savedMode);
        }
    }

    // Manejar el cambio de orientación en dispositivos móviles
    window.addEventListener('orientationchange', function () {
        const cameraModal = document.getElementById('cameraModal');
        if (cameraModal && cameraModal.style.display === 'flex') {
            setTimeout(() => {
                document.activeElement.blur();
            }, 300);
        }
    });

    // Bloqueo de orientacion
    if (screen.orientation && screen.orientation.lock) {
        screen.orientation.lock('portrait').catch(function (error) {
            console.log('Rotación no bloqueada:', error);
        });
    }

    // Prevenir gestos de zoom
    document.addEventListener('gesturestart', function (e) {
        e.preventDefault();
    });

    // Prevenir doble toque para zoom
    let lastTouchEnd = 0;
    document.addEventListener('touchend', function (e) {
        const now = Date.now();
        if (now - lastTouchEnd <= 300) e.preventDefault();
        lastTouchEnd = now;
    }, { passive: false });

    // Prevenir zoom con teclado (Ctrl + +/-)
    document.addEventListener('keydown', function (e) {
        if (e.ctrlKey && (e.key === '+' || e.key === '-' || e.key === '0')) {
            e.preventDefault();
        }
    });
}

// Inicialización de Lógica de Configuración
function initSettingsUI() {
    const minBtn = document.getElementById('openSettingsBtn');
    const modal = document.getElementById('settingsModal');
    const closeBtn = document.getElementById('closeSettingsBtn');
    const overlay = document.getElementById('settingsOverlay');

    const clientSelect = document.getElementById('clientSelect');

    // Toggles
    const focusToggle = document.getElementById('persistentFocusToggle');
    const filterToggle = document.getElementById('clientFilterToggle');
    const clientContainer = document.getElementById('clientSelectContainer');

    if (!minBtn || !modal) return;

    // Poblar dropdown de clientes
    if (clientSelect && typeof CLIENTS_MAP !== 'undefined') {
        clientSelect.innerHTML = '<option value="">-- Seleccionar Cliente --</option>';
        Object.keys(CLIENTS_MAP).forEach(clientName => {
            const option = document.createElement('option');
            option.value = clientName;
            option.textContent = clientName;
            clientSelect.appendChild(option);
        });
    }

    // Load Settings to UI
    function loadToUI() {
        if (focusToggle) {
            focusToggle.checked = USER_SETTINGS.persistentFocus;
            focusToggle.disabled = false;
            if (focusToggle.parentElement) focusToggle.parentElement.style.opacity = "1";
        }
        if (filterToggle) filterToggle.checked = USER_SETTINGS.filterEnabled;
        if (clientSelect) clientSelect.value = USER_SETTINGS.selectedClient;

        if (clientContainer) {
            clientContainer.style.display = USER_SETTINGS.filterEnabled ? 'block' : 'none';
        }

        // Admin Button Logic (Mobile)
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
                    <div class="setting-info" style="margin-bottom: 12px;">
                        <span class="setting-title" style="color: var(--text-main);"><i class="fas fa-shield-alt" style="color: var(--primary); margin-right: 8px;"></i>Administración</span>
                        <span class="setting-desc">Panel de control de usuarios</span>
                    </div>
                    <button id="adminUsersBtn" class="btn-primary" style="width: 100%; display: flex; align-items: center; justify-content: center; gap: 8px; padding: 12px; border-radius: 12px; font-weight: 600;">
                        <i class="fas fa-users-cog"></i> Gestionar Usuarios
                    </button>
                `;
                settingsBody.appendChild(adminSection);

                document.getElementById('adminUsersBtn').addEventListener('click', () => {
                    closeModal();
                    if (typeof openUserAdmin === 'function') openUserAdmin();
                    else alert("Módulo de administración no cargado");
                });
            }
            adminSection.style.display = 'block';
        } else {
            if (adminSection) adminSection.style.display = 'none';
        }
    }

    // Expose for refresh
    window.refreshSettingsUI = loadToUI;

    // Open Modal
    function openModal(modal) {
        if (!modal) return;

        modal.style.display = 'flex';
        setTimeout(() => modal.classList.add('active'), 10);

        if (overlay && modal.id === 'settingsModal') overlay.style.display = 'block';
    }

    minBtn.addEventListener('click', () => {
        loadToUI();
        openModal(modal);
    });

    // Close Modal
    function closeModal() {
        modal.style.display = 'none';
        modal.classList.remove('active');
        overlay.style.display = 'none';

        const barcodeInput = document.getElementById('barcode');
        if (barcodeInput && USER_SETTINGS.persistentFocus) barcodeInput.focus();
    }

    closeBtn.addEventListener('click', closeModal);
    overlay.addEventListener('click', closeModal);

    // Auto-guardado
    const updateSettings = () => {
        USER_SETTINGS.persistentFocus = focusToggle.checked;
        USER_SETTINGS.filterEnabled = filterToggle.checked;
        USER_SETTINGS.selectedClient = clientSelect.value;

        saveUserSettings();

        const statusEl = document.getElementById('status');
        if (statusEl) {
            if (USER_SETTINGS.filterEnabled && USER_SETTINGS.selectedClient) {
                statusEl.textContent = `${USER_SETTINGS.selectedClient.substring(0, 1000)}`;
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