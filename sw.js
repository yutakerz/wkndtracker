// This file listens for the "push" event from the cloud
self.addEventListener('push', function(event) {
  const data = event.data ? event.data.json() : { title: 'WM Tracker Update', body: 'New transaction added!' };
  
  const options = {
    body: data.body,
    icon: 'logo.jpg', // Path to your logo
    badge: 'logo.jpg',
    vibrate: [100, 50, 100],
    data: { url: self.location.origin }
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// When the user taps the notification, open the app
self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  event.waitUntil(
    clients.openWindow('/')
  );
});