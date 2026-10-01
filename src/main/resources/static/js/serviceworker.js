/**
 * CURA PWA - Service Worker
 * Handles background offline caching and native follow-up notifications.
 */

self.addEventListener('install', (event) => {
    console.log('Cura SW Installed');
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    console.log('Cura SW Activated');
    event.waitUntil(self.clients.claim());
});

// Handle Notification Clicks
self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    
    // Open or focus on the clinic portal when user clicks the notification
    event.waitUntil(
        clients.matchAll({ type: 'window' }).then((clientList) => {
            for (const client of clientList) {
                if (client.url.includes('patient-dashboard.html') && 'focus' in client) {
                    return client.focus();
                }
            }
            if (clients.openWindow) {
                return clients.openWindow('patient-dashboard.html');
            }
        })
    );
});