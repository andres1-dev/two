self.addEventListener('push', (event) => {
    let data = { title: 'Notificación', body: '', icon: '' };
    
    if (event.data) {
        try {
            data = event.data.json();
        } catch (e) {
            data.body = event.data.text();
        }
    }
    
    event.waitUntil(
        self.registration.showNotification(data.title, {
            body: data.body,
            icon: data.icon || 'https://via.placeholder.com/128',
            badge: 'https://via.placeholder.com/128',
            vibrate: [200, 100, 200]
        })
    );
});

self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    event.waitUntil(clients.openWindow('/'));
});