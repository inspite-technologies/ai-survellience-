importScripts('https://www.gstatic.com/firebasejs/8.10.1/firebase-app.js');
importScripts('https://www.gstatic.com/firebasejs/8.10.1/firebase-messaging.js');

firebase.initializeApp({
  apiKey: "AIzaSyBFQOv1mnKdPz8-GVseluohrC1kRKLnLJ8",
  authDomain: "ai-survellience.firebaseapp.com",
  projectId: "ai-survellience",
  storageBucket: "ai-survellience.firebasestorage.app",
  messagingSenderId: "778995047406",
  appId: "1:778995047406:web:af56c2f1b367fb77698cff",
  measurementId: "G-0BK6GB649E"
});

const messaging = firebase.messaging();

// Handle background messages
messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);
  
  const notificationTitle = payload.notification?.title || "New Notification";
  const notificationOptions = {
    body: payload.notification?.body || "You have a new update.",
    icon: '/vite.svg', // Use existing vite.svg as fallback icon
    badge: '/vite.svg',
    data: payload.data
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
