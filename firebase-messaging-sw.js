/* ===== Service Worker do NINA — notificações push (Firebase Cloud Messaging) =====
   Este arquivo precisa ficar na RAIZ do site (junto do index.html). */

importScripts("https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js");

firebase.initializeApp({
  apiKey: "AIzaSyDRaBwtkSkXnAC1IddJVSGbHjziDmx0pzs",
  authDomain: "arteenem-1691d.firebaseapp.com",
  projectId: "arteenem-1691d",
  storageBucket: "arteenem-1691d.firebasestorage.app",
  messagingSenderId: "939048251715",
  appId: "1:939048251715:web:bc11362b4ca73754903ff6",
});

const messaging = firebase.messaging();

// Notificação recebida com o app fechado / em segundo plano
messaging.onBackgroundMessage((payload) => {
  const n = payload.notification || {};
  const dados = payload.data || {};
  self.registration.showNotification(n.title || "NINA", {
    body: n.body || "Tem novidade no NINA!",
    icon: "img/nina-logo.png",
    badge: "img/nina-logo.png",
    tag: dados.tag || "nina",
    data: { url: dados.url || "./" },
  });
});

// Ao clicar na notificação, abre o app
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || "./";
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((lista) => {
      for (const c of lista) {
        if (c.url.includes("/arteenem/") && "focus" in c) return c.focus();
      }
      return clients.openWindow(url);
    })
  );
});
