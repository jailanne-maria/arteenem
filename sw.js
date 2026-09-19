/* ===== Service Worker do NINA =====
   - Guarda o app em cache (funciona offline)
   - Também cuida das notificações push (Firebase Cloud Messaging)
   Precisa ficar na RAIZ do site (junto do index.html). */

const VERSAO = "nina-v1";

// Arquivos do próprio app (essenciais para abrir offline)
const SHELL = [
  "./",
  "./index.html",
  "./manifest.json",
  "./style.css",
  "./script.js",
  "./firebase-config.js",
  "./questoes.js",
  "./questoes-arte.js",
  "./plano.js",
  "./explorar.js",
  "./figurinhas.js",
  "./curriculo.js",
  "./noticias.json",
  "./img/icon-192.png",
  "./img/icon-512.png",
  "./img/nina/ctrl-art-banner.png",
];

// Bibliotecas externas (para o app conseguir iniciar sem internet)
const EXTERNOS = [
  "https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js",
  "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth-compat.js",
  "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore-compat.js",
  "https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js",
  "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js",
  "https://cdnjs.cloudflare.com/ajax/libs/mammoth/1.6.0/mammoth.browser.min.js",
  "https://fonts.googleapis.com/css2?family=Press+Start+2P&family=VT323&display=swap",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(VERSAO)
      .then((cache) => {
        // cada arquivo é adicionado individualmente (um erro não derruba tudo)
        return Promise.all(
          SHELL.concat(EXTERNOS).map((url) =>
            cache.add(url).catch(() => null)
          )
        );
      })
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((chaves) => Promise.all(chaves.filter((k) => k !== VERSAO).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);

  // Só mexe em http(s)
  if (!url.protocol.startsWith("http")) return;

  const ehNavegacao = req.mode === "navigate" ||
    (req.headers.get("accept") || "").includes("text/html");

  // Páginas: tenta a rede primeiro (para pegar atualizações), senão usa o cache
  if (ehNavegacao) {
    event.respondWith(
      fetch(req)
        .then((resp) => {
          const copia = resp.clone();
          caches.open(VERSAO).then((c) => c.put(req, copia));
          return resp;
        })
        .catch(() => caches.match(req).then((r) => r || caches.match("./index.html")))
    );
    return;
  }

  // Demais arquivos: cache primeiro
  event.respondWith(
    caches.match(req).then((cacheado) => {
      if (cacheado) return cacheado;
      return fetch(req)
        .then((resp) => {
          // guarda cópias de arquivos do próprio site e das bibliotecas conhecidas
          const podeGuardar = url.origin === location.origin ||
            EXTERNOS.some((e) => req.url.startsWith(e.split("?")[0])) ||
            req.url.includes("gstatic.com") ||
            req.url.includes("cloudflare.com") ||
            req.url.includes("googleapis.com") ||
            req.url.includes("gstatic");
          if (podeGuardar && resp && resp.status === 200) {
            const copia = resp.clone();
            caches.open(VERSAO).then((c) => c.put(req, copia)).catch(() => {});
          }
          return resp;
        })
        .catch(() => cacheado);
    })
  );
});

/* ===== Notificações push (Firebase Cloud Messaging) ===== */
try {
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

  messaging.onBackgroundMessage((payload) => {
    const n = payload.notification || {};
    const dados = payload.data || {};
    self.registration.showNotification(n.title || "NINA", {
      body: n.body || "Tem novidade no NINA!",
      icon: "img/icon-512.png",
      badge: "img/icon-192.png",
      tag: dados.tag || "nina",
      data: { url: dados.url || "./" },
    });
  });
} catch (e) {
  // sem internet na instalação: segue só com o cache
}

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
