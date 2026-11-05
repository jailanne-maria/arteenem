// ============================================================
// BINGO ÉTNICO-RACIAL — mediação do professor + cartelas no celular
// Depende de: firebase-config.js (firebase compat), bingo-conceitos.js
// Coleções: bingo/{codigo}  ·  bingo_cartelas/{codigo_uid}
// ============================================================

const BINGO_COL_SESSAO = "bingo";
const BINGO_COL_CARTELA = "bingo_cartelas";
const BINGO_LADOS = 5;
const BINGO_CENTRO = 12;

const bingoEstado = {
  codigo: null,
  papel: null,
  unsubSessao: null,
  unsubCartelas: null,
  cartela: null,
  sessao: null,
  girando: false,
};

const bingoEl = (id) => document.getElementById(id);

// ---------- utilidades ----------
function bingoEmbaralhar(lista) {
  const a = lista.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function bingoGerarCartela() {
  const indices = bingoEmbaralhar(CONCEITOS_BINGO.map((_, i) => i)).slice(0, BINGO_LADOS * BINGO_LADOS - 1);
  indices.splice(BINGO_CENTRO, 0, -1);
  return indices;
}

// combinações vencedoras (linhas, colunas, diagonais)
const BINGO_COMBINACOES = (() => {
  const c = [];
  for (let l = 0; l < BINGO_LADOS; l++) c.push([...Array(BINGO_LADOS)].map((_, k) => l * BINGO_LADOS + k));
  for (let k = 0; k < BINGO_LADOS; k++) c.push([...Array(BINGO_LADOS)].map((_, l) => l * BINGO_LADOS + k));
  c.push([...Array(BINGO_LADOS)].map((_, i) => i * BINGO_LADOS + i));
  c.push([...Array(BINGO_LADOS)].map((_, i) => i * BINGO_LADOS + (BINGO_LADOS - 1 - i)));
  return c;
})();

function bingoLinhaCompleta(celulas, marcados) {
  for (let i = 0; i < BINGO_COMBINACOES.length; i++) {
    const combo = BINGO_COMBINACOES[i];
    const ok = combo.every((pos) => celulas[pos] === -1 || marcados[pos]);
    if (ok) return i;
  }
  return -1;
}

function bingoComboNome(indice) {
  if (indice < 0) return "";
  if (indice < BINGO_LADOS) return "linha " + (indice + 1);
  if (indice < BINGO_LADOS * 2) return "coluna " + (indice - BINGO_LADOS + 1);
  return indice === BINGO_LADOS * 2 ? "diagonal principal" : "diagonal secundária";
}

function bingoCodigoValido(txt) {
  return /^[A-Z0-9]{6}$/.test(String(txt || "").toUpperCase());
}

// ---------- abertura da tela ----------
function bingoAbrirTela() {
  const codigo = (typeof minhaTurma !== "undefined" && minhaTurma && minhaTurma.codigo) ? minhaTurma.codigo : "";
  const campo = bingoEl("bingo-codigo");
  if (campo && !campo.value) campo.value = codigo;
  bingoEl("bingo-entrada").classList.remove("escondido");
  bingoEl("bingo-professor").classList.add("escondido");
  bingoEl("bingo-aluno").classList.add("escondido");
  bingoAviso("");
  if (typeof mostrarTela === "function") mostrarTela("tela-bingo");
}

function bingoAviso(msg, tipo) {
  const el = bingoEl("bingo-aviso");
  if (!el) return;
  el.textContent = msg || "";
  el.className = "bingo-aviso" + (tipo ? " " + tipo : "");
}

function bingoDesconectar() {
  if (bingoEstado.unsubSessao) { bingoEstado.unsubSessao(); bingoEstado.unsubSessao = null; }
  if (bingoEstado.unsubCartelas) { bingoEstado.unsubCartelas(); bingoEstado.unsubCartelas = null; }
}

// ---------- professor ----------
async function bingoAbrirSala() {
  const codigo = String(bingoEl("bingo-codigo").value || "").trim().toUpperCase();
  if (!bingoCodigoValido(codigo)) return bingoAviso("Informe o código da turma (6 caracteres).", "erro");

  const user = typeof usuarioAtual === "function" ? usuarioAtual() : null;
  if (!user) return bingoAviso("Entre com a sua conta para abrir a sala.", "erro");

  const db = firebase.firestore();
  const sessaoRef = db.collection(BINGO_COL_SESSAO).doc(codigo);
  try {
    const snap = await sessaoRef.get();
    if (!snap.exists) {
      await sessaoRef.set({
        codigo,
        professorUid: user.uid,
        professorNome: (typeof usuario !== "undefined" && usuario && usuario.nome) ? usuario.nome : (user.displayName || "Professor(a)"),
        ativa: true,
        abertaEm: firebase.firestore.FieldValue.serverTimestamp(),
        atual: null,
        sorteados: [],
      });
    } else if (!snap.data().ativa) {
      await sessaoRef.update({
        ativa: true,
        atual: null,
        sorteados: [],
        reabertaEm: firebase.firestore.FieldValue.serverTimestamp(),
      });
    }
  } catch (e) {
    return bingoAviso("Não foi possível abrir a sala: " + e.message, "erro");
  }

  bingoEstado.codigo = codigo;
  bingoEstado.papel = "professor";
  bingoEl("bingo-entrada").classList.add("escondido");
  bingoEl("bingo-professor").classList.remove("escondido");
  bingoEl("bingo-aluno").classList.add("escondido");
  bingoEscutarSessao();
  bingoEscutarCartelas();
}

async function bingoGirar() {
  if (bingoEstado.girando) return;
  const codigo = bingoEstado.codigo;
  if (!codigo) return bingoAviso("Abra a sala primeiro.", "erro");

  bingoEstado.girando = true;
  const globo = bingoEl("bingo-globo");
  if (globo) globo.classList.add("girando");
  bingoEl("bingo-girar").disabled = true;

  try {
    const db = firebase.firestore();
    const ref = db.collection(BINGO_COL_SESSAO).doc(codigo);
    const sorteado = await db.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      const dados = snap.data() || {};
      if (!dados.ativa) throw new Error("A rodada está encerrada.");
      const sorteados = dados.sorteados || [];
      const usados = new Set(sorteados.map((s) => s.i));
      const livres = CONCEITOS_BINGO.map((_, i) => i).filter((i) => !usados.has(i));
      if (!livres.length) throw new Error("Todos os conceitos já foram sorteados.");
      const i = livres[Math.floor(Math.random() * livres.length)];
      const s = {
        i,
        termo: CONCEITOS_BINGO[i].termo,
        def: CONCEITOS_BINGO[i].def,
        em: Date.now(),
      };
      tx.update(ref, { atual: s, sorteados: sorteados.concat([s]) });
      return s;
    });
    bingoMostrarSorteado(sorteado);
  } catch (e) {
    bingoAviso(e.message, "erro");
  } finally {
    setTimeout(() => {
      if (globo) globo.classList.remove("girando");
      const btn = bingoEl("bingo-girar");
      if (btn) btn.disabled = false;
      bingoEstado.girando = false;
    }, 900);
  }
}

async function bingoEncerrar() {
  const codigo = bingoEstado.codigo;
  if (!codigo) return;
  if (!confirm("Encerrar a rodada? As cartelas continuam salvas.")) return;
  try {
    await firebase.firestore().collection(BINGO_COL_SESSAO).doc(codigo).update({
      ativa: false,
      encerradaEm: firebase.firestore.FieldValue.serverTimestamp(),
    });
    bingoAviso("Rodada encerrada.", "ok");
  } catch (e) {
    bingoAviso("Erro ao encerrar: " + e.message, "erro");
  }
}

function bingoMostrarSorteado(s) {
  const caixa = bingoEl("bingo-sorteado");
  if (!caixa) return;
  if (!s) {
    caixa.innerHTML = '<p class="bingo-vazio">O globo ainda não girou nesta rodada.</p>';
    return;
  }
  caixa.innerHTML =
    '<p class="bingo-rotulo">Conceito sorteado</p>' +
    '<h2 class="bingo-termo">' + bingoEsc(s.termo) + "</h2>" +
    '<p class="bingo-def">' + bingoEsc(s.def) + "</p>";
}

function bingoEsc(t) {
  return String(t == null ? "" : t)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function bingoEscutarSessao() {
  if (bingoEstado.unsubSessao) bingoEstado.unsubSessao();
  const ref = firebase.firestore().collection(BINGO_COL_SESSAO).doc(bingoEstado.codigo);
  bingoEstado.unsubSessao = ref.onSnapshot((snap) => {
    if (!snap.exists) return;
    const dados = snap.data();
    bingoEstado.sessao = dados;
    if (bingoEstado.papel === "professor") {
      bingoRenderProfessor(dados);
    } else {
      bingoRenderAluno(dados);
    }
  }, (erro) => bingoAviso("Sem conexão com a sala: " + erro.message, "erro"));
}

function bingoRenderProfessor(dados) {
  const sorteados = dados.sorteados || [];
  bingoMostrarSorteado(dados.atual);
  const pend = bingoEl("bingo-pendentes");
  if (pend) pend.textContent = sorteados.length + " de " + CONCEITOS_BINGO.length + " conceitos sorteados";

  const hist = bingoEl("bingo-historico");
  if (hist) {
    hist.innerHTML = sorteados.slice().reverse().map((s, k) =>
      "<li><strong>" + bingoEsc(s.termo) + "</strong> <span class=\"bingo-ordem\">" + (sorteados.length - k) + "º</span></li>"
    ).join("") || "<li class='bingo-vazio'>Nada sorteado ainda.</li>";
  }

  const btnGirar = bingoEl("bingo-girar");
  if (btnGirar) btnGirar.disabled = !dados.ativa || sorteados.length >= CONCEITOS_BINGO.length;
  const btnEncerrar = bingoEl("bingo-encerrar");
  if (btnEncerrar) btnEncerrar.disabled = !dados.ativa;
  const globo = bingoEl("bingo-globo");
  if (globo) globo.disabled = !dados.ativa;
  const status = bingoEl("bingo-prof-status");
  if (status) status.textContent = dados.ativa ? "Rodada aberta" : "Rodada encerrada";
}

function bingoEscutarCartelas() {
  if (bingoEstado.unsubCartelas) bingoEstado.unsubCartelas();
  const db = firebase.firestore();
  bingoEstado.unsubCartelas = db.collection(BINGO_COL_CARTELA)
    .where("codigo", "==", bingoEstado.codigo)
    .onSnapshot((snap) => {
      const cartelas = [];
      snap.forEach((d) => cartelas.push(d.data()));
      const total = bingoEl("bingo-participantes");
      if (total) total.textContent = cartelas.length + (cartelas.length === 1 ? " cartela em jogo" : " cartelas em jogo");

      const venc = bingoEl("bingo-vencedores");
      if (venc) {
        const ganhadores = cartelas.filter((c) => c.bingo);
        if (bingoEstado.vencedoresVistos === null) bingoEstado.vencedoresVistos = ganhadores.length;
        else if (ganhadores.length > bingoEstado.vencedoresVistos) {
          const ultimo = ganhadores[ganhadores.length - 1];
          bingoEstado.vencedoresVistos = ganhadores.length;
          bingoFesta(ultimo.nome || "Um estudante", ultimo.padrao);
        }
        venc.innerHTML = ganhadores.length
          ? ganhadores.map((c) => "<li><strong>" + bingoEsc(c.nome || "Estudante") + "</strong> — " + bingoEsc(c.padrao || "bingo") + "</li>").join("")
          : "<li class='bingo-vazio'>Ninguém cantou bingo ainda.</li>";
      }
    }, (erro) => bingoAviso("Não foi possível ler as cartelas: " + erro.message, "erro"));
}

// ---------- estudante ----------
async function bingoEntrarAluno() {
  const codigo = String(bingoEl("bingo-codigo").value || "").trim().toUpperCase();
  if (!bingoCodigoValido(codigo)) return bingoAviso("Informe o código da turma (6 caracteres).", "erro");

  const user = typeof usuarioAtual === "function" ? usuarioAtual() : null;
  if (!user) return bingoAviso("Entre com a sua conta para pegar a cartela.", "erro");

  const db = firebase.firestore();
  const sessaoSnap = await db.collection(BINGO_COL_SESSAO).doc(codigo).get();
  if (!sessaoSnap.exists) return bingoAviso("A sala ainda não foi aberta pelo professor.", "erro");

  const ref = db.collection(BINGO_COL_CARTELA).doc(codigo + "_" + user.uid);
  try {
    const snap = await ref.get();
    if (!snap.exists) {
      const celulas = bingoGerarCartela();
      await ref.set({
        codigo,
        uid: user.uid,
        nome: (typeof usuario !== "undefined" && usuario && usuario.nome) ? usuario.nome : (user.displayName || "Estudante"),
        celulas,
        marcados: celulas.map(() => false),
        bingo: false,
        criadaEm: firebase.firestore.FieldValue.serverTimestamp(),
      });
    }
    bingoEstado.cartela = null;
  } catch (e) {
    return bingoAviso("Não foi possível criar a cartela: " + e.message, "erro");
  }

  bingoEstado.codigo = codigo;
  bingoEstado.papel = "aluno";
  bingoEl("bingo-entrada").classList.add("escondido");
  bingoEl("bingo-professor").classList.add("escondido");
  bingoEl("bingo-aluno").classList.remove("escondido");
  bingoEscutarSessao();
  bingoEscutarMinhaCartela();
}

function bingoEscutarMinhaCartela() {
  const user = typeof usuarioAtual === "function" ? usuarioAtual() : null;
  if (!user) return;
  if (bingoEstado.unsubCartelas) bingoEstado.unsubCartelas();
  const ref = firebase.firestore().collection(BINGO_COL_CARTELA).doc(bingoEstado.codigo + "_" + user.uid);
  bingoEstado.unsubCartelas = ref.onSnapshot((snap) => {
    if (!snap.exists) return;
    bingoEstado.cartela = snap.data();
    bingoRenderAluno(bingoEstado.sessao);
  }, (erro) => bingoAviso("Sem conexão com a cartela: " + erro.message, "erro"));
}

function bingoRenderAluno(sessao) {
  const cartela = bingoEstado.cartela;
  const grade = bingoEl("bingo-cartela");
  if (!grade || !cartela) return;

  const sorteados = (sessao && sessao.sorteados) || [];
  const sorteadosIdx = new Set(sorteados.map((s) => s.i));

  // marca automaticamente quem já saiu
  const marcados = (cartela.marcados || []).slice();
  let mudou = false;
  cartela.celulas.forEach((conceito, pos) => {
    if (conceito !== -1 && sorteadosIdx.has(conceito) && !marcados[pos]) { marcados[pos] = true; mudou = true; }
  });

  grade.innerHTML = cartela.celulas.map((conceito, pos) => {
    const livre = conceito === -1;
    const nome = livre ? "LIVRE" : CONCEITOS_BINGO[conceito].termo;
    const marcado = livre || marcados[pos];
    return '<button class="bingo-celula' + (marcado ? " marcada" : "") + (livre ? " livre" : "") +
      '" data-pos="' + pos + '"' + (livre ? " disabled" : "") + '>' + bingoEsc(nome) + "</button>";
  }).join("");

  const linha = bingoLinhaCompleta(cartela.celulas, marcados);
  const status = bingoEl("bingo-aluno-status");
  if (status) {
    if (!sessao || !sessao.ativa) status.textContent = "A rodada ainda não começou. Aguarde o professor.";
    else if (sessao.atual) status.textContent = "Último sorteio: " + sessao.atual.termo;
    else status.textContent = "Sala aberta. Aguardando o primeiro sorteio…";
  }
  const btn = bingoEl("bingo-bingo");
  if (btn) {
    btn.disabled = linha < 0 || cartela.bingo;
    btn.textContent = cartela.bingo ? "Bingo registrado ✓" : "BINGO!";
  }

  if (cartela.bingo && !bingoEstado.festaMostrada) {
    bingoEstado.festaMostrada = true;
    bingoFesta("", cartela.padrao);
  }

  if (mudou && !cartela.bingo) bingoSalvarMarcados(marcados);
  if (linha >= 0 && !cartela.bingo && !bingoEstado.avisouLinha) {
    bingoEstado.avisouLinha = true;
    if (typeof mostrarToast === "function") mostrarToast("Linha completa! Cante BINGO.", "ok");
  }
}

async function bingoSalvarMarcados(marcados) {
  const user = typeof usuarioAtual === "function" ? usuarioAtual() : null;
  if (!user || !bingoEstado.codigo) return;
  try {
    await firebase.firestore().collection(BINGO_COL_CARTELA)
      .doc(bingoEstado.codigo + "_" + user.uid)
      .update({ marcados, atualizadoEm: firebase.firestore.FieldValue.serverTimestamp() });
  } catch (e) { /* silencioso: a próxima marcação tenta de novo */ }
}

async function bingoClicarCelula(pos) {
  const cartela = bingoEstado.cartela;
  if (!cartela) return;
  const conceito = cartela.celulas[pos];
  if (conceito === -1) return;
  const marcados = (cartela.marcados || []).slice();
  marcados[pos] = !marcados[pos];
  cartela.marcados = marcados;
  bingoRenderAluno(bingoEstado.sessao);
  bingoSalvarMarcados(marcados);
}

async function bingoGritar() {
  const cartela = bingoEstado.cartela;
  if (!cartela) return;
  const linha = bingoLinhaCompleta(cartela.celulas, cartela.marcados || []);
  if (linha < 0) {
    if (typeof mostrarToast === "function") mostrarToast("Ainda não há linha completa.", "erro");
    return;
  }
  const user = typeof usuarioAtual === "function" ? usuarioAtual() : null;
  try {
    await firebase.firestore().collection(BINGO_COL_CARTELA)
      .doc(bingoEstado.codigo + "_" + user.uid)
      .update({
        bingo: true,
        padrao: bingoComboNome(linha),
        bingoEm: firebase.firestore.FieldValue.serverTimestamp(),
      });
    if (typeof mostrarToast === "function") mostrarToast("Bingo registrado! Aguarde a conferência do professor.", "ok");
  } catch (e) {
    bingoAviso("Não foi possível registrar o bingo: " + e.message, "erro");
  }
}

// ---------- festa do bingo ----------
function bingoFesta(nome, padrao) {
  const caixa = bingoEl("bingo-festa");
  if (!caixa) return;
  const titulo = bingoEl("bingo-festa-titulo");
  const texto = bingoEl("bingo-festa-texto");
  if (titulo) titulo.textContent = "BINGO!";
  if (texto) {
    texto.textContent = (nome ? nome + " completou " : "Você completou ") + (padrao || "a cartela") + "!";
  }
  caixa.classList.remove("escondido");
  const btn = bingoEl("bingo-festa-fechar");
  if (btn) btn.focus();
}

function bingoFecharFesta() {
  const caixa = bingoEl("bingo-festa");
  if (caixa) caixa.classList.add("escondido");
}

// ---------- ligações de interface ----------
document.addEventListener("DOMContentLoaded", () => {
  const ligar = (id, evento, fn) => {
    const el = bingoEl(id);
    if (el) el.addEventListener(evento, fn);
  };

  ligar("bingo-sou-professor", "click", bingoAbrirSala);
  ligar("bingo-sou-aluno", "click", bingoEntrarAluno);
  ligar("bingo-girar", "click", bingoGirar);
  ligar("bingo-globo", "click", bingoGirar);
  ligar("bingo-encerrar", "click", bingoEncerrar);
  ligar("bingo-bingo", "click", bingoGritar);
  ligar("bingo-festa-fechar", "click", bingoFecharFesta);
  ligar("bingo-festa", "click", (ev) => { if (ev.target && ev.target.id === "bingo-festa") bingoFecharFesta(); });

  const grade = bingoEl("bingo-cartela");
  if (grade) {
    grade.addEventListener("click", (ev) => {
      const alvo = ev.target.closest(".bingo-celula");
      if (alvo) bingoClicarCelula(Number(alvo.dataset.pos));
    });
  }
});
