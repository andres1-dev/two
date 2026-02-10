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
            else if (label.includes('REFERENCIA')) referencia = value; // Siesa item referencia
        });

        // Fallback: buscar en todo el texto del contenedor si no se encuentra
        if (!cantidad) {
            // Buscar especificamente el campo cantidad
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
            // Enfocar el campo de entrada
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

                // Sidebar Update
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
                        bgColor = '#ef4444'; // Red
                    } else if (role === 'MODERATOR') {
                        iconClass = 'fas fa-user-cog';
                        bgColor = '#f59e0b'; // Amber
                    } else if (role === 'GUEST') {
                        iconClass = 'fas fa-user-tag';
                        bgColor = '#6b7280'; // Gray
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

                // Admin Nav Item Visibility
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

            // Show/Hide Upload based on role (Admin only or similar, let's say Admin/Moderator)
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
        };

        // Initial Update
        window.updateUserUI();

        // --- DESKTOP VIEW SWITCHER ---
        window.switchDesktopView = function (viewName) {
            // Only works if we are in desktop mode (checked via media query or JS check)
            if (window.innerWidth < 1024) return; // Ignore on mobile

            // Hide all potential views
            const scanner = document.getElementById('scanner');
            const adminModal = document.getElementById('userAdminModal');
            const settingsModal = document.getElementById('settingsModal');
            const historyView = document.getElementById('historyView');
            const uploadView = document.getElementById('uploadSiesaView');

            // Remove active class from all
            if (scanner) scanner.style.display = 'none';
            if (historyView) historyView.style.display = 'none';
            if (uploadView) uploadView.style.display = 'none';
            if (adminModal) adminModal.classList.remove('desktop-view-active');
            if (settingsModal) settingsModal.classList.remove('desktop-view-active');

            // Reset Nav Active State
            document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
            const activeNav = document.querySelector(`.nav-item[data-view="${viewName}"]`);
            if (activeNav) activeNav.classList.add('active');

            // Show selected view
            if (viewName === 'scanner') {
                if (scanner) scanner.style.display = 'flex';
            } else if (viewName === 'admin') {
                if (adminModal) {
                    adminModal.classList.add('desktop-view-active');
                    // Load data if needed
                    if (typeof loadUsersList === 'function') loadUsersList();
                }
            } else if (viewName === 'settings') {
                if (settingsModal) {
                    settingsModal.classList.add('desktop-view-active');
                    // Refresh settings data if function available
                    if (typeof window.refreshSettingsUI === 'function') window.refreshSettingsUI();
                }
            } else if (viewName === 'history') {
                const historyView = document.getElementById('historyView');
                if (historyView) {
                    historyView.style.display = 'block';
                    // Load data only if needed or first time
                    if (typeof loadHistoryData === 'function') {
                        loadHistoryData();
                    }
                }
            } else if (viewName === 'upload') {
                const uploadView = document.getElementById('uploadSiesaView');
                if (uploadView) {
                    uploadView.style.display = 'block';
                    if (typeof initUploadSiesa === 'function') initUploadSiesa();
                }
            }
        };

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

            // Visual Updates (Grid Cards)
            document.querySelectorAll('.mode-option-card').forEach(b => b.classList.remove('active'));
            document.body.classList.remove('manual-mode-active');

            // Hide Trigger Btn by default
            const triggerBtn = document.getElementById('triggerCameraBtn');
            const triggerIcon = triggerBtn ? triggerBtn.querySelector('i') : null;

            if (triggerBtn) {
                triggerBtn.style.display = 'none';
                triggerBtn.className = 'input-action-btn'; // Reset classes
            }
            if (barcodeInput) {
                barcodeInput.readOnly = false; // Reset readonly
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
                    barcodeInput.readOnly = true; // Use virtual keypad
                }
                if (inputIcon) {
                    inputIcon.className = "fas fa-keyboard";
                    inputIcon.title = "Tocar para abrir teclado";
                }
                if (statusDiv) statusDiv.textContent = `Modo Manual: ${USER_SETTINGS.selectedClient.substring(0, 15)}...`;

            } else if (mode === 'CAMERA') {
                if (btnCamera) btnCamera.classList.add('active');

                // Camera Mode enables trigger button
                if (triggerBtn) {
                    triggerBtn.style.display = 'flex';
                    if (triggerIcon) triggerIcon.className = "fas fa-camera"; // Camera Icon
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

        // --- Interaction Handler ---
        function handleInputInteraction(e) {

            if (window.APP_MODE === 'PDA') {
                // Toggle Persistent Focus (Restaurado)
                if (typeof USER_SETTINGS !== 'undefined') {
                    USER_SETTINGS.persistentFocus = !USER_SETTINGS.persistentFocus;

                    // Visual Feedback
                    const msg = USER_SETTINGS.persistentFocus ? "Foco Persistente: ACTIVADO" : "Foco Persistente: DESACTIVADO";
                    if (statusDiv) {
                        statusDiv.textContent = msg;
                    }

                    setTimeout(() => {
                        if (window.APP_MODE === 'PDA') {
                            statusDiv.textContent = "Modo PDA: Escaneo rápido";
                        }
                    }, 2000);

                    // No guardamos persistentemente esta preferencia específica para la próxima sesión
                    // pero aplicamos inmediatamente

                    // Update Title
                    if (inputIcon) {
                        inputIcon.title = USER_SETTINGS.persistentFocus ? "Foco Activo (Tocar para desactivar)" : "Foco Inactivo (Tocar para activar)";
                        inputIcon.style.color = USER_SETTINGS.persistentFocus ? "var(--primary)" : "var(--text-secondary)";
                    }

                    // If activated, focus immediately
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

        // Trigger Button Logic (Keep for Camera fallback/button usage)
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

        // --- Virtual Keypad Logic ---
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
                if (keypadValue.length < 20) { // Max length safety (increased)
                    keypadValue += key;
                }
            }
            updateKeypadDisplay();
        }

        function submitKeypad() {
            if (!keypadValue) return;

            closeKeypad();

            // Set value to hidden input and trigger processing
            if (barcodeInput) {
                barcodeInput.value = keypadValue;

                // Wait a tick for value to set
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
                    // Prevenir doble disparo y zoom/selección
                    if (e.type === 'touchstart') {
                        e.preventDefault();
                    }
                    const key = btn.getAttribute('data-key');
                    handleKeypadInput(key);

                    // Feedback visual (opcional)
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

        // Logout Logic for new button
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => {
                if (confirm("¿Cerrar sesión?")) {
                    if (typeof logout === 'function') logout();
                    else window.location.reload();
                }
            });
        }

        // --- 30 Min Inactivity Timeout ---
        let inactivityTimer;
        function resetInactivityTimer() {
            clearTimeout(inactivityTimer);
            inactivityTimer = setTimeout(() => {
                alert("Sesión cerrada por inactividad (30 min)");
                if (typeof logout === 'function') logout();
                else window.location.reload();
            }, 30 * 60 * 1000); // 30 minutes
        }

        // Listen for activity
        ['click', 'touchstart', 'mousemove', 'keydown'].forEach(evt =>
            document.addEventListener(evt, resetInactivityTimer)
        );
        resetInactivityTimer(); // Start timer

        // Persistent Focus Logic (Only for PDA Mode)
        function enforceFocusLoop() {
            if (window.APP_MODE !== 'PDA') return;
            if (typeof USER_SETTINGS !== 'undefined' && !USER_SETTINGS.persistentFocus) return;

            const activeElement = document.activeElement;
            const isInput = activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA';
            const cameraModal = document.getElementById('cameraModal');
            const settingsModal = document.getElementById('settingsModal');
            const virtualKeypad = document.getElementById('virtualKeypadModal');

            // Logic update: Settings modal is where we pick modes now.
            // When settings modal is open, we do NOT want to steal focus back to barcode input.
            const isModalOpen = (cameraModal && cameraModal.style.display === 'flex') ||
                (settingsModal && settingsModal.style.display === 'block') ||
                (virtualKeypad && virtualKeypad.style.display !== 'none');

            if (!isModalOpen && activeElement !== barcodeInput && !isInput) {
                if (barcodeInput) barcodeInput.focus();
            }

            if (window.APP_MODE === 'PDA') {
                setTimeout(enforceFocusLoop, 500);
            }
        }

        // Input Handling
        if (barcodeInput) {
            barcodeInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    const val = barcodeInput.value.trim();
                    if (!val) return;

                    // Logic for MANUAL mode only processing on Enter
                    if (window.APP_MODE === 'MANUAL') {
                        // Transform LOTE to FULL CODE
                        e.preventDefault(); // Stop default submit

                        if (!USER_SETTINGS || !USER_SETTINGS.selectedClient) {
                            alert("Error: No has seleccionado cliente");
                            return;
                        }

                        // CLIENTS_MAP might be in datos.js or similar
                        // Use global variable or look it up
                        const nit = (typeof CLIENTS_MAP !== 'undefined') ? CLIENTS_MAP[USER_SETTINGS.selectedClient] : null;

                        if (!nit) {
                            alert("Error: Cliente sin NIT configurado");
                            return;
                        }

                        // Construct Code
                        const fullCode = `REC${val}-${nit}`;

                        // Direct call
                        barcodeInput.value = ""; // Clear visual

                        // Simulate processing
                        if (typeof parseQRCode === 'function') {
                            // Global function from principal.js
                            const parts = parseQRCode(fullCode);
                            if (parts) {
                                processQRCodeParts(parts);
                            } else {
                                if (typeof showError === 'function') showError(fullCode, "Error formato generado manual");
                            }
                        }
                    }
                    // PDA Mode usually handles input via 'input' event or specialized scanner drivers, 
                    // but sometimes they send Enter. If so, logic in principal.js usually catches it?
                    // principal.js usually listens to 'input' or 'change'. 
                    // Let's assume principal.js handles the actual data processing for PDA.
                }
            });
        }

        // Start Default
        setMode('PDA');

        // Hook into settings save
        const saveBtn = document.getElementById('saveSettingsBtn');
        if (saveBtn) {
            saveBtn.addEventListener('click', () => {
                setTimeout(updateClientBadge, 100);
            });
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
    const saveBtn = document.getElementById('saveSettingsBtn');
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
            focusToggle.disabled = false; // Permitir cambiar
            if (focusToggle.parentElement) focusToggle.parentElement.style.opacity = "1";
        }
        if (filterToggle) filterToggle.checked = USER_SETTINGS.filterEnabled;
        if (clientSelect) clientSelect.value = USER_SETTINGS.selectedClient;

        if (clientContainer) {
            clientContainer.style.display = USER_SETTINGS.filterEnabled ? 'block' : 'none';
        }

        // We no longer need to inject Admin Button here for Desktop, 
        // but for Mobile it might still be useful if we want consistency.
        // However, User requested "Mobile productive, PC admin panel".
        // Let's keep the Mobile Admin Button logic BUT hide it on Desktop via CSS if needed,
        // or just rely on the Sidebar for Desktop.

        // --- ADMIN BUTTON LOGIC (Mobile mostly) ---
        const settingsBody = document.querySelector('.settings-body');
        let adminSection = document.getElementById('adminSection');

        // Check if user is admin (currentUser is global from auth.js)
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
                    closeModal(); // Close settings modal
                    if (typeof openUserAdmin === 'function') openUserAdmin();
                    else alert("Módulo de administración no cargado");
                });
            }
            adminSection.style.display = 'block';
        } else {
            if (adminSection) adminSection.style.display = 'none';
        }
    }

    // Expose for desktop switcher
    window.refreshSettingsUI = loadToUI;

    // Open Modal
    function openModal(modal) {
        if (!modal) return;

        // Desktop override for settings
        if (modal.id === 'settingsModal' && window.innerWidth >= 1024) {
            if (typeof window.switchDesktopView === 'function') window.switchDesktopView('settings');
            return;
        }

        modal.style.display = 'flex'; // Changed from 'block' to 'flex' to preserve CSS flex layout
        setTimeout(() => modal.classList.add('active'), 10);

        if (overlay && modal.id === 'settingsModal') overlay.style.display = 'block';
        // Assuming manualOverlay is defined elsewhere if needed for manualInputModal
        // if (manualOverlay && modal.id === 'manualInputModal') manualOverlay.style.display = 'block'; // Ensure overlay shows for manual
    }

    minBtn.addEventListener('click', () => {
        loadToUI();
        openModal(modal);
    });

    // Close Modal
    function closeModal() {
        modal.style.display = 'none';
        modal.classList.remove('active'); // Remove active class
        overlay.style.display = 'none';

        // Re-focus barcode if persistent focus is on
        const barcodeInput = document.getElementById('barcode');
        if (barcodeInput && USER_SETTINGS.persistentFocus) barcodeInput.focus();
    }

    closeBtn.addEventListener('click', closeModal);
    overlay.addEventListener('click', closeModal);

    // Toggle Logic
    filterToggle.addEventListener('change', (e) => {
        clientContainer.style.display = e.target.checked ? 'block' : 'none';
    });

    // Save Logic
    saveBtn.addEventListener('click', () => {
        USER_SETTINGS.persistentFocus = focusToggle.checked;
        USER_SETTINGS.filterEnabled = filterToggle.checked;
        USER_SETTINGS.selectedClient = clientSelect.value;

        saveUserSettings();

        // Update display needed?
        if (USER_SETTINGS.filterEnabled && USER_SETTINGS.selectedClient) {
            document.getElementById('status').textContent = `FILTRO: ${USER_SETTINGS.selectedClient.substring(0, 15)}...`;
        } else {
            document.getElementById('status').textContent = 'Sistema Listo';
        }

        closeModal();

        // Show success toast?
        // alert("Configuración guardada");
    });
}
