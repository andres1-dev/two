/**
 * PWA Service Worker and Installation Logic
 */

let deferredPrompt;

if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('sw.js')
            .then(reg => console.log('SW registered'))
            .catch(err => console.log('SW failed', err));
    });
}

window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    showInstallPromotion();
});

function showInstallPromotion() {
    const installBtn = document.getElementById('installBtn');
    if (installBtn) {
        installBtn.classList.remove('hidden');
        installBtn.addEventListener('click', async () => {
            if (deferredPrompt) {
                deferredPrompt.prompt();
                const { outcome } = await deferredPrompt.userChoice;
                if (outcome === 'accepted') console.log('User installed');
                deferredPrompt = null;
                installBtn.classList.add('hidden');
            }
        });
    }
}

// Three-finger swipe to refresh
let touchStartY = 0;
let touchCount = 0;

window.addEventListener('touchstart', (e) => {
    touchCount = e.touches.length;
    if (touchCount === 3) touchStartY = e.touches[0].pageY;
}, { passive: true });

window.addEventListener('touchmove', (e) => {
    if (touchCount === 3) {
        let touchMoveY = e.touches[0].pageY;
        if (touchMoveY - touchStartY > 200) {
            showRefreshIndicator();
            setTimeout(() => location.reload(), 1000);
        }
    }
}, { passive: true });

function showRefreshIndicator() {
    let indicator = document.querySelector('.swipe-refresh-indicator');
    if (!indicator) {
        indicator = document.createElement('div');
        indicator.className = 'swipe-refresh-indicator';
        indicator.innerHTML = '<i class="fas fa-sync-alt"></i><span>Actualizando datos...</span>';
        document.body.appendChild(indicator);
    }
}
