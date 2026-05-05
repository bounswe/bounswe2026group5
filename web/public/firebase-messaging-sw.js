importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyAqbWe661kFB8DqCXXfRx3Vvja4MP3Gy40",
  authDomain: "campus-neighborhood-mentorship.firebaseapp.com",
  projectId: "campus-neighborhood-mentorship",
  storageBucket: "campus-neighborhood-mentorship.firebasestorage.app",
  messagingSenderId: "433439752805",
  appId: "1:433439752805:web:d7dd0e4fd80e01f85abc8c",
  measurementId: "G-PTSVSM2JSL"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);
  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: '/favicon.ico',
    data: payload.data
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
