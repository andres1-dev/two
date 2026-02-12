function setupTabSystem() {
    setupActivityBarTabs();
    setupMainTabs();
    setupTabCloseButtons();
}

function setupActivityBarTabs() {
    document.querySelectorAll('.activity-icon').forEach(btn => {
        btn.addEventListener('click', function () {
            const tabName = this.dataset.tab;

            document.querySelectorAll('.activity-icon').forEach(icon => {
                icon.classList.remove('active');
            });
            this.classList.add('active');

            document.querySelectorAll('.sidebar').forEach(sidebar => {
                sidebar.classList.remove('active');
            });
            const sidebar = document.getElementById(tabName);
            if (sidebar) sidebar.classList.add('active');

            document.querySelectorAll('.tab').forEach(tab => {
                if (tab.dataset.tab === tabName) {
                    tab.click();
                }
            });
        });
    });
}

function setupMainTabs() {
    document.querySelectorAll('.tab').forEach(tab => {
        tab.addEventListener('click', function () {
            const tabName = this.dataset.tab;

            document.querySelectorAll('.tab').forEach(t => {
                t.classList.remove('active');
            });
            this.classList.add('active');

            document.querySelectorAll('.tab-content').forEach(content => {
                content.classList.remove('active');
            });
            document.getElementById(`${tabName}-content`).classList.add('active');

            handleTabActivation(tabName);
        });
    });
}

function handleTabActivation(tabName) {
    if (tabName === 'cancel-transfers') {
        console.log('=== Pestaña Anular Traslados activada ===');
        if (processedData.length === 0) {
            const transferList = document.getElementById('transferList');
            if (transferList) {
                transferList.innerHTML = `
                    <div class="empty-state">
                        <i class="codicon codicon-info"></i>
                        <h5>Sin datos para mostrar</h5>
                        <p>Primero procesa un archivo CSV para ver los traslados</p>
                    </div>
                `;
            }
        } else {
            loadTransferList();
            updateCancelledTransfersTable();
        }
    }

    if (tabName === 'distribution' && !window.distributionInitialized) {
        console.log('=== Pestaña Distribución activada ===');
        initializeDistribution();
        setupDistributionEventListeners();
        window.distributionInitialized = true;
    }
}

function setupTabCloseButtons() {
    document.querySelectorAll('.tab-close').forEach(btn => {
        btn.addEventListener('click', function (e) {
            e.stopPropagation();
            const tab = this.parentElement;
            tab.style.display = 'none';

            if (tab.classList.contains('active')) {
                const remainingTabs = document.querySelectorAll('.tab:not([style*="display: none"])');
                if (remainingTabs.length > 0) {
                    remainingTabs[0].click();
                }
            }
        });
    });
}