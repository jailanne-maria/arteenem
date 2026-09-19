/* ===== Enviar notificação push para todos os usuários do NINA =====
 *
 * COMO USAR:
 *   1) Baixe a chave de serviço no Firebase Console:
 *      Configurações do projeto > Contas de serviço > Gerar nova chave privada
 *      Salve como "serviceAccount.json" nesta pasta (scripts/).
 *      NUNCA suba esse arquivo para o GitHub (já está no .gitignore).
 *
 *   2) Envie a última novidade publicada no app:
 *        node scripts/enviar-push.js --ultima
 *
 *      Ou envie uma mensagem personalizada:
 *        node scripts/enviar-push.js "Título" "Mensagem"
 *
 *   3) Opcional: link que abre ao clicar (padrão: o app do NINA)
 *        node scripts/enviar-push.js "Título" "Mensagem" "https://..."
 */

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const PROJECT_ID = "arteenem-1691d";
const APP_URL = "https://jailanne-maria.github.io/arteenem/";
const ICONE = APP_URL + "img/nina-logo.png";

const CAMINHO_CHAVE = process.env.NINA_CHAVE || path.join(__dirname, "serviceAccount.json");

function b64url(input) {
  return Buffer.from(input)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

// Gera um JWT assinado (RS256) com a chave de serviço
function criarJWT(chave, escopos) {
  const agora = Math.floor(Date.now() / 1000);
  const header = b64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claims = b64url(JSON.stringify({
    iss: chave.client_email,
    scope: escopos.join(" "),
    aud: "https://oauth2.googleapis.com/token",
    iat: agora,
    exp: agora + 3600,
  }));
  const assinatura = crypto.createSign("RSA-SHA256").update(`${header}.${claims}`).sign(chave.private_key);
  return `${header}.${claims}.${b64url(assinatura)}`;
}

async function obterToken(chave, escopos) {
  const jwt = criarJWT(chave, escopos);
  const r = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });
  if (!r.ok) throw new Error("Falha ao autenticar: " + (await r.text()));
  return (await r.json()).access_token;
}

// Lê os tokens de push de todos os usuários
async function lerTokens(accessToken) {
  const base = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/usuarios`;
  const tokens = [];
  let pageToken = "";
  do {
    const url = pageToken ? `${base}?pageSize=300&pageToken=${encodeURIComponent(pageToken)}` : `${base}?pageSize=300`;
    const r = await fetch(url, { headers: { Authorization: "Bearer " + accessToken } });
    if (!r.ok) throw new Error("Falha ao ler usuários: " + (await r.text()));
    const d = await r.json();
    for (const doc of d.documents || []) {
      const campo = doc.fields && doc.fields.pushTokens;
      const valores = campo && campo.arrayValue && campo.arrayValue.values;
      if (Array.isArray(valores)) {
        valores.forEach((v) => { if (v.stringValue) tokens.push(v.stringValue); });
      }
    }
    pageToken = d.nextPageToken || "";
  } while (pageToken);
  return [...new Set(tokens)];
}

// Lê a novidade mais recente publicada no app
async function lerUltimaNovidade(accessToken) {
  const url = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents:runQuery`;
  const r = await fetch(url, {
    method: "POST",
    headers: { Authorization: "Bearer " + accessToken, "Content-Type": "application/json" },
    body: JSON.stringify({
      structuredQuery: {
        from: [{ collectionId: "novidades" }],
        orderBy: [{ field: { fieldPath: "criadoEm" }, direction: "DESCENDING" }],
        limit: 1,
      },
    }),
  });
  if (!r.ok) throw new Error("Falha ao ler novidades: " + (await r.text()));
  const linhas = await r.json();
  const doc = linhas.find((l) => l.document);
  if (!doc) return null;
  const f = doc.document.fields || {};
  return {
    titulo: (f.titulo && f.titulo.stringValue) || "Novidade no NINA",
    texto: (f.texto && f.texto.stringValue) || "Abra o app para ver o que mudou.",
    link: (f.link && f.link.stringValue) || APP_URL,
  };
}

async function enviarUma(accessToken, token, titulo, corpo, link) {
  const url = `https://fcm.googleapis.com/v1/projects/${PROJECT_ID}/messages:send`;
  const r = await fetch(url, {
    method: "POST",
    headers: { Authorization: "Bearer " + accessToken, "Content-Type": "application/json" },
    body: JSON.stringify({
      message: {
        token,
        notification: { title: titulo, body: corpo },
        data: { url: link },
        webpush: {
          notification: { icon: ICONE, badge: ICONE },
          fcm_options: { link },
        },
      },
    }),
  });
  return r.ok;
}

(async () => {
  if (!fs.existsSync(CAMINHO_CHAVE)) {
    console.error(`\n❌ Chave de serviço não encontrada em:\n   ${CAMINHO_CHAVE}\n`);
    console.error("Baixe no Firebase Console > Configurações do projeto > Contas de serviço > Gerar nova chave privada");
    console.error("e salve como scripts/serviceAccount.json\n");
    process.exit(1);
  }

  const chave = JSON.parse(fs.readFileSync(CAMINHO_CHAVE, "utf8"));
  const escopos = [
    "https://www.googleapis.com/auth/datastore",
    "https://www.googleapis.com/auth/firebase.messaging",
  ];

  console.log("🔐 Autenticando...");
  const accessToken = await obterToken(chave, escopos);

  let titulo = process.argv[2];
  let corpo = process.argv[3];
  let link = process.argv[4];

  if (!titulo || titulo === "--ultima") {
    console.log("📰 Buscando a última novidade publicada...");
    const novidade = await lerUltimaNovidade(accessToken);
    if (!novidade) {
      console.error("❌ Nenhuma novidade publicada ainda. Publique no Admin do app primeiro.");
      process.exit(1);
    }
    titulo = novidade.titulo;
    corpo = novidade.texto;
    link = link || novidade.link;
    console.log(`   → "${titulo}"`);
  }
  link = link || APP_URL;
  corpo = corpo || "Abra o app para ver o que mudou.";

  console.log("📱 Lendo dispositivos cadastrados...");
  const tokens = await lerTokens(accessToken);
  if (!tokens.length) {
    console.log("⚠️  Nenhum dispositivo cadastrado ainda.");
    console.log("   Peça para os usuários abrirem Novidades > Ativar notificações.");
    process.exit(0);
  }
  console.log(`   ${tokens.length} dispositivo(s) encontrado(s).`);

  console.log("🚀 Enviando...");
  let ok = 0, falha = 0;
  for (const t of tokens) {
    try {
      if (await enviarUma(accessToken, t, titulo, corpo, link)) ok++;
      else falha++;
    } catch {
      falha++;
    }
  }

  console.log(`\n✅ Enviadas: ${ok}   ❌ Falhas: ${falha}`);
  console.log(`   Título: ${titulo}`);
  console.log(`   Corpo:  ${corpo}\n`);
  process.exit(0);
})().catch((e) => {
  console.error("❌ Erro:", e.message);
  process.exit(1);
});
