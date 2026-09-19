/* ===== Enviar notificação push para todos os usuários do NINA =====
 *
 * COMO USAR (no seu computador):
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
 *      Opcional: link que abre ao clicar
 *        node scripts/enviar-push.js "Título" "Mensagem" "https://..."
 *
 * MODO AUTOMÁTICO (usado pelo GitHub Action):
 *      node scripts/enviar-push.js --auto
 *   Envia só se houver uma novidade NOVA (guarda o controle em ultimo-push.json).
 *   A chave de serviço vem da variável de ambiente NINA_SERVICE_ACCOUNT.
 */

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const PROJECT_ID = "arteenem-1691d";
const APP_URL = "https://jailanne-maria.github.io/arteenem/";
const ICONE = APP_URL + "img/icon-512.png";
const ARQUIVO_CONTROLE = path.join(__dirname, "..", "ultimo-push.json");

function b64url(input) {
  return Buffer.from(input)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function carregarChave() {
  if (process.env.NINA_SERVICE_ACCOUNT) {
    return JSON.parse(process.env.NINA_SERVICE_ACCOUNT);
  }
  const caminho = process.env.NINA_CHAVE || path.join(__dirname, "serviceAccount.json");
  if (!fs.existsSync(caminho)) {
    console.error(`\n❌ Chave de serviço não encontrada em:\n   ${caminho}\n`);
    console.error("Baixe no Firebase Console > Configurações do projeto > Contas de serviço");
    console.error("> Gerar nova chave privada, e salve como scripts/serviceAccount.json\n");
    process.exit(1);
  }
  return JSON.parse(fs.readFileSync(caminho, "utf8"));
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
    const url = pageToken
      ? `${base}?pageSize=300&pageToken=${encodeURIComponent(pageToken)}`
      : `${base}?pageSize=300`;
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
  const item = linhas.find((l) => l.document);
  if (!item) return null;
  const f = item.document.fields || {};
  const partes = item.document.name.split("/");
  return {
    id: partes[partes.length - 1],
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

async function enviarParaTodos(accessToken, titulo, corpo, link) {
  console.log("📱 Lendo dispositivos cadastrados...");
  const tokens = await lerTokens(accessToken);
  if (!tokens.length) {
    console.log("⚠️  Nenhum dispositivo cadastrado ainda.");
    console.log("   Peça para os usuários abrirem Novidades > Ativar notificações.");
    return 0;
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
  return ok;
}

function lerControle() {
  try { return JSON.parse(fs.readFileSync(ARQUIVO_CONTROLE, "utf8")); } catch { return {}; }
}

function salvarControle(dados) {
  fs.writeFileSync(ARQUIVO_CONTROLE, JSON.stringify(dados, null, 2) + "\n", "utf8");
}

(async () => {
  const chave = carregarChave();
  const escopos = [
    "https://www.googleapis.com/auth/datastore",
    "https://www.googleapis.com/auth/firebase.messaging",
  ];

  const modoAuto = process.argv.includes("--auto");

  console.log("🔐 Autenticando...");
  const accessToken = await obterToken(chave, escopos);

  // ---------- MODO AUTOMÁTICO ----------
  if (modoAuto) {
    const novidade = await lerUltimaNovidade(accessToken);
    if (!novidade) {
      console.log("ℹ️  Nenhuma novidade publicada ainda. Nada a enviar.");
      process.exit(0);
    }
    const controle = lerControle();
    if (controle.ultimoId === novidade.id) {
      console.log(`ℹ️  A novidade "${novidade.titulo}" já foi notificada. Nada a enviar.`);
      process.exit(0);
    }
    console.log(`🆕 Novidade nova: "${novidade.titulo}"`);
    const enviadas = await enviarParaTodos(accessToken, novidade.titulo, novidade.texto, novidade.link);
    if (enviadas > 0) {
      salvarControle({
        ultimoId: novidade.id,
        titulo: novidade.titulo,
        enviadoEm: new Date().toISOString(),
      });
      console.log("📝 Controle atualizado (ultimo-push.json).");
    }
    process.exit(0);
  }

  // ---------- MODO MANUAL ----------
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

  await enviarParaTodos(accessToken, titulo, corpo, link);
  process.exit(0);
})().catch((e) => {
  console.error("❌ Erro:", e.message);
  process.exit(1);
});
