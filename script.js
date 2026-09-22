// ArteENEM — autenticação, turmas, ranking e diagnóstico

const LETRAS = ["A", "B", "C", "D", "E"];
const CHAVE_RESULTADO = "arteenem_resultado";

// E-mails com permissão de administração (fixar recados)
const ADMIN_EMAILS = [
  "jailanne.almeida@gmail.com",
  "jailanne.maria@gmail.com",
];

function ehAdmin() {
  return !!usuario && ADMIN_EMAILS.includes((usuario.email || "").toLowerCase());
}

// Só administra quem é admin E não está com o papel de estudante
function podeAdministrar() {
  return ehAdmin() && !!usuario && usuario.papel !== "estudante";
}

// ---------- Estado global ----------
let usuario = null;       // { uid, nome, email, foto, papel }
let minhaTurma = null;    // { id, nome, codigo } do estudante
let minhasTurmas = [];    // todas as turmas do estudante
let turmaAtualProf = null; // turma aberta no painel do professor

// Quiz
let fila = [];
let indice = 0;
let respostas = [];

// Perguntas contribuídas por professores (carregadas do Firestore)
let perguntasExtras = [];

// Banco completo (fixas + Arte + contribuídas), usado no diagnóstico
function bancoDePerguntas() {
  const arte = typeof QUESTOES_ARTE !== "undefined" ? QUESTOES_ARTE : [];
  return QUESTOES.concat(arte, perguntasExtras);
}

// ---------- Navegação ----------
function mostrarTela(id) {
  document.querySelectorAll(".tela").forEach((t) => t.classList.remove("ativa"));
  const el = document.getElementById(id);
  if (el) el.classList.add("ativa");
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function esconder(el) { el.classList.add("escondido"); }
function exibir(el) { el.classList.remove("escondido"); }

// ============================================================
// AUTENTICAÇÃO
// ============================================================
processarRedirect();

aoMudarUsuario(async (user) => {
  const btnSair = document.getElementById("btn-sair");
  const btnMural = document.getElementById("btn-mural");
  const btnPerfil = document.getElementById("btn-perfil");
  const btnExplorar = document.getElementById("btn-explorar");
  const btnEca = document.getElementById("btn-eca");
  const btnJogo = document.getElementById("btn-jogo");
  const btnNoticias = document.getElementById("btn-noticias");
  const btnNovidades = document.getElementById("btn-novidades");
  const btnSintese = document.getElementById("btn-sintese");
  const btnCurriculo = document.getElementById("btn-curriculo");
  const btnRevisoes = document.getElementById("btn-revisoes");
  const btnAtividades = document.getElementById("btn-atividades");
  const btnSimulado = document.getElementById("btn-simulado");
  const btnBiblioteca = document.getElementById("btn-biblioteca");
  const btnChat = document.getElementById("btn-chat");
  const btnChatTurma = document.getElementById("btn-chat-turma");
  const btnSuporte = document.getElementById("btn-suporte");
  const btnAdmin = document.getElementById("btn-admin");
  const btnInicio = document.getElementById("btn-inicio");
  const btnMenu = document.getElementById("btn-menu");
  const nomeTopo = document.getElementById("usuario-nome");

  if (!user) {
    usuario = null;
    minhaTurma = null;
    esconder(btnSair);
    esconder(btnMural);
    esconder(btnPerfil);
    esconder(btnExplorar);
    esconder(btnEca);
    esconder(btnJogo);
    esconder(btnNoticias);
    esconder(btnNovidades);
    esconder(btnSintese);
    esconder(btnCurriculo);
    esconder(btnRevisoes);
    esconder(btnAtividades);
    esconder(btnSimulado);
    esconder(btnBiblioteca);
    esconder(btnChat);
    esconder(btnChatTurma);
    esconder(btnSuporte);
    esconder(btnAdmin);
    esconder(btnInicio);
    esconder(btnMenu);
    esconder(nomeTopo);
    esconder(document.getElementById("menu-extra"));
    mostrarTela("tela-login");
    return;
  }

  // Carrega (ou cria) o perfil no Firestore
  let perfil = await carregarUsuario(user.uid);
  if (!perfil) {
    perfil = {
      uid: user.uid,
      nome: user.displayName || "Usuário",
      email: user.email || "",
      foto: user.photoURL || "",
      papel: null,
      turmaAtual: null,
    };
    await salvarUsuario(user.uid, perfil).catch(() => {});
  }

  usuario = perfil;

  // Usuário bloqueado pela moderação
  if (usuario.bloqueado) {
    usuario = null;
    await logout().catch(() => {});
    alert("Sua conta foi bloqueada pela moderação. Fale com a professora responsável.");
    mostrarTela("tela-login");
    return;
  }

  nomeTopo.textContent = usuario.nome.split(" ")[0];
  exibir(nomeTopo);
  exibir(btnSair);
  exibir(btnMural);
  exibir(btnPerfil);
  exibir(btnExplorar);
  exibir(btnEca);
  exibir(btnJogo);
  exibir(btnNoticias);
  exibir(btnNovidades);
  exibir(btnSintese);
  exibir(btnCurriculo);
  exibir(btnRevisoes);
  exibir(btnAtividades);
  exibir(btnSimulado);
  exibir(btnBiblioteca);
  exibir(btnInicio);
  exibir(btnMenu);

  // Chat da escola (somente professores)
  if (usuario.papel === "professor") exibir(btnChat); else esconder(btnChat);
  // Chat da turma (professor e estudantes)
  exibir(btnChatTurma);
  // Falar com a professora (todos, menos a própria admin)
  if (ehAdmin()) esconder(btnSuporte); else exibir(btnSuporte);
  // Painel de administração (SOMENTE os e-mails autorizados e fora do papel de estudante)
  if (podeAdministrar()) exibir(btnAdmin); else esconder(btnAdmin);

  // Aviso do ECA a cada login (uma vez por sessão)
  mostrarAvisoECA();

  // Carrega as perguntas contribuídas (banco compartilhado)
  listarPerguntas()
    .then((ps) => { perguntasExtras = ps; })
    .catch(() => {});

  // Novidades (avisos para todos os usuários)
  carregarNovidades(true);
  // Registra o token de push se a permissão já foi concedida antes
  registrarPushSilencioso();

  if (!usuario.papel) {
    mostrarTela("tela-papel");
  } else if (usuario.papel === "professor") {
    if (!usuario.area || !usuario.disciplina) abrirEscolhaArea();
    else abrirPainelProfessor();
  } else {
    abrirInicioEstudante();
  }

  // Tour de primeiro acesso (só na primeira vez)
  if (!usuario.tourVisto && usuario.papel) {
    setTimeout(() => {
      iniciarTour(usuario.papel === "professor" ? TOUR_PROFESSOR : TOUR_ESTUDANTE);
    }, 1400);
  }
});

document.getElementById("btn-google").addEventListener("click", async () => {
  try {
    await loginGoogle();
  } catch (e) {
    alert("Não foi possível entrar: " + e.message);
  }
});

document.getElementById("btn-sair").addEventListener("click", () => logout());

// Escolha de papel
document.querySelectorAll(".papel-card").forEach((card) => {
  card.addEventListener("click", async () => {
    const papel = card.dataset.papel;
    usuario.papel = papel;
    await salvarUsuario(usuario.uid, { papel }).catch(() => {});
    if (papel === "professor") abrirEscolhaArea();
    else abrirInicioEstudante();
  });
});

// ============================================================
// PROFESSOR
// ============================================================
async function abrirPainelProfessor() {
  const areaInfo = usuario.area && AREAS[usuario.area]
    ? `Área: ${AREAS[usuario.area].curto}${usuario.disciplina ? " · " + usuario.disciplina : ""}`
    : "Escolha sua área e disciplina.";
  document.getElementById("prof-saudacao").innerHTML =
    `Bem-vindo(a), <strong>${escaparHTML(usuario.nome.split(" ")[0])}</strong>!<br><span class="prof-area">${escaparHTML(areaInfo)}</span>`;

  const resumo = document.getElementById("prof-escola-resumo");
  if (resumo) {
    const partes = [];
    partes.push(usuario.escola
      ? `Escola: <strong>${escaparHTML(usuario.escola)}</strong>`
      : "Você ainda não informou o código da escola.");
    if (Array.isArray(usuario.series) && usuario.series.length) {
      partes.push(`Séries: ${escaparHTML(usuario.series.join(", "))}`);
    }
    resumo.innerHTML = partes.join(" · ");
  }

  mostrarTela("tela-professor");
  if (typeof renderMascote === "function") renderMascote("mascote-prof", "inicio");
  await carregarTurmasProfessor();
}

async function carregarTurmasProfessor() {
  const lista = document.getElementById("lista-turmas-prof");
  lista.innerHTML = "<p class='vazio'>Carregando…</p>";
  try {
    let turmas = await listarTurmasDoProfessor(usuario.uid);
    if (!turmas.length) {
      lista.innerHTML = "<p class='vazio'>Você ainda não criou turmas. Crie a primeira acima!</p>";
      return;
    }
    // Ordena conforme a ordem salva pelo professor
    const ordem = usuario.ordemTurmas || [];
    turmas.sort((a, b) => {
      const ia = ordem.indexOf(a.codigo);
      const ib = ordem.indexOf(b.codigo);
      if (ia === -1 && ib === -1) return 0;
      if (ia === -1) return 1;
      if (ib === -1) return -1;
      return ia - ib;
    });

    lista.innerHTML = "";
    for (let i = 0; i < turmas.length; i++) {
      const t = turmas[i];
      const membros = await listarMembros(t.codigo).catch(() => []);
      const card = document.createElement("div");
      card.className = "turma-card";
      const controles = modoOrganizar
        ? `<div class="turma-organizar">
             <button class="mover" data-dir="up" data-codigo="${t.codigo}" ${i === 0 ? "disabled" : ""}>▲</button>
             <button class="mover" data-dir="down" data-codigo="${t.codigo}" ${i === turmas.length - 1 ? "disabled" : ""}>▼</button>
           </div>`
        : "";
      const editar = modoOrganizar
        ? ""
        : `<button class="turma-editar" data-codigo="${t.codigo}" data-nome="${(t.nome || "").replace(/"/g, "&quot;")}" title="Renomear turma">✏️</button>`;
      card.innerHTML = `
        <div class="turma-card-corpo">
          <span class="turma-nome">${t.nome} ${editar}</span>
          <span class="turma-meta">${membros.length} estudante(s)</span>
          <span class="turma-cod">${t.codigo}</span>
        </div>
        ${controles}
      `;
      if (!modoOrganizar) {
        card.style.cursor = "pointer";
        card.addEventListener("click", (ev) => {
          if (ev.target.closest(".turma-editar")) return;
          abrirTurmaProfessor(t);
        });
      }
      lista.appendChild(card);
    }
  } catch (e) {
    lista.innerHTML = `<p class='vazio'>Erro ao carregar turmas: ${e.message}</p>`;
  }
}

// ---------- Organizar turmas (professor) ----------
let modoOrganizar = false;

document.getElementById("btn-organizar").addEventListener("click", () => {
  modoOrganizar = !modoOrganizar;
  const btn = document.getElementById("btn-organizar");
  btn.textContent = modoOrganizar ? "✅ Concluir" : "↕️ Organizar";
  carregarTurmasProfessor();
});

// Move uma turma para cima/baixo e salva a ordem no perfil
document.getElementById("lista-turmas-prof").addEventListener("click", async (e) => {
  const editar = e.target.closest(".turma-editar");
  if (editar) {
    const atual = editar.dataset.nome || "";
    const novo = prompt("Novo nome da turma:", atual);
    if (novo === null) return;
    const nome = novo.trim();
    if (!nome || nome === atual) return;
    try {
      await renomearTurma(editar.dataset.codigo, nome);
      await carregarTurmasProfessor();
    } catch (err) {
      alert("Erro ao renomear: " + err.message);
    }
    return;
  }

  const botao = e.target.closest(".mover");
  if (!botao) return;
  e.stopPropagation();
  const codigo = botao.dataset.codigo;
  const dir = botao.dataset.dir;

  const turmas = await listarTurmasDoProfessor(usuario.uid);
  const ordem = usuario.ordemTurmas && usuario.ordemTurmas.length
    ? usuario.ordemTurmas.filter((c) => turmas.some((t) => t.codigo === c))
    : turmas.map((t) => t.codigo);
  // Garante que todas as turmas estejam na lista
  turmas.forEach((t) => { if (!ordem.includes(t.codigo)) ordem.push(t.codigo); });

  const pos = ordem.indexOf(codigo);
  const nova = pos + (dir === "up" ? -1 : 1);
  if (nova < 0 || nova >= ordem.length) return;
  [ordem[pos], ordem[nova]] = [ordem[nova], ordem[pos]];

  usuario.ordemTurmas = ordem;
  await salvarUsuario(usuario.uid, { ordemTurmas: ordem }).catch(() => {});
  await carregarTurmasProfessor();
});

document.getElementById("btn-criar-turma").addEventListener("click", async () => {
  const nome = document.getElementById("input-nome-turma").value.trim();
  const aviso = document.getElementById("turma-criada");
  if (!nome) {
    aviso.className = "aviso erro";
    aviso.textContent = "Digite um nome para a turma.";
    exibir(aviso);
    return;
  }
  try {
    const turma = await criarTurma(nome, usuario);
    aviso.className = "aviso ok";
    aviso.innerHTML = `✅ Turma <strong>${turma.nome}</strong> criada! Código: <strong>${turma.codigo}</strong> — compartilhe com os estudantes.`;
    exibir(aviso);
    document.getElementById("input-nome-turma").value = "";
    await carregarTurmasProfessor();
  } catch (e) {
    aviso.className = "aviso erro";
    aviso.textContent = "Erro ao criar turma: " + e.message;
    exibir(aviso);
  }
});

async function abrirTurmaProfessor(turma) {
  turmaAtualProf = turma;
  document.getElementById("turma-titulo").textContent = turma.nome;
  document.getElementById("turma-codigo").textContent = "Código: " + turma.codigo;
  mostrarTela("tela-turma");

  const stats = document.getElementById("turma-stats");
  const rankingDiv = document.getElementById("ranking-turma");
  const mapaDiv = document.getElementById("mapa-turma");
  const membrosDiv = document.getElementById("membros-turma");
  stats.innerHTML = "<p class='vazio'>Carregando…</p>";
  rankingDiv.innerHTML = "";
  mapaDiv.innerHTML = "";
  membrosDiv.innerHTML = "";

  try {
    const [membros, ranking] = await Promise.all([
      listarMembros(turma.codigo),
      rankingDaTurma(turma.codigo).catch(() => []),
    ]);

    const media = ranking.length
      ? Math.round(ranking.reduce((s, r) => s + r.pct, 0) / ranking.length)
      : 0;

    stats.innerHTML = `
      <div class="stat-card"><span class="stat-num">${membros.length}</span><span class="stat-label">Estudantes</span></div>
      <div class="stat-card"><span class="stat-num">${ranking.length}</span><span class="stat-label">Fizeram o diagnóstico</span></div>
      <div class="stat-card"><span class="stat-num">${media}%</span><span class="stat-label">Média da turma</span></div>
    `;

    renderRanking(rankingDiv, ranking, null);
    renderMapaDificuldades(mapaDiv, ranking);

    if (membros.length) {
      membrosDiv.innerHTML = membros
        .map((m) => `<span class="membro-tag"><span class="membro-nome clicavel" data-uid="${m.uid}">${m.nome}</span><button class="btn-remover" data-uid="${m.uid}" data-nome="${(m.nome || "").replace(/"/g, "&quot;")}" title="Remover da turma">✖</button></span>`)
        .join("");
    } else {
      membrosDiv.innerHTML = "<p class='vazio'>Nenhum estudante entrou ainda.</p>";
    }
  } catch (e) {
    stats.innerHTML = `<p class='vazio'>Erro: ${e.message}</p>`;
  }
}

// Média da turma por área (onde a turma tem mais dificuldade)
function renderMapaDificuldades(container, ranking) {
  if (!ranking.length) {
    container.innerHTML = "<p class='vazio'>Sem resultados para analisar ainda.</p>";
    return;
  }
  const soma = {};
  const cont = {};
  ranking.forEach((r) => {
    Object.entries(r.areas || {}).forEach(([area, pct]) => {
      soma[area] = (soma[area] || 0) + pct;
      cont[area] = (cont[area] || 0) + 1;
    });
  });
  const medias = Object.keys(soma)
    .map((area) => ({ area, pct: Math.round(soma[area] / cont[area]) }))
    .sort((a, b) => a.pct - b.pct); // mais difícil primeiro

  container.innerHTML = medias
    .map((m) => {
      const area = AREAS[m.area] || { icone: "", curto: m.area };
      const cor = m.pct < 50 ? "var(--error)" : m.pct < 75 ? "var(--warning)" : "var(--success)";
      return `
        <div class="mapa-item">
          <div class="mapa-topo">
            <strong>${area.icone} ${area.curto}</strong>
            <span>${m.pct}%</span>
          </div>
          <div class="mapa-track"><div class="mapa-fill" style="width:${m.pct}%;background:${cor}"></div></div>
        </div>
      `;
    })
    .join("");
}

document.getElementById("btn-voltar-prof").addEventListener("click", () => {
  abrirPainelProfessor();
});

// ============================================================
// ESTUDANTE
// ============================================================
async function abrirInicioEstudante() {
  document.getElementById("aluno-nome").textContent = usuario.nome.split(" ")[0];
  renderAreas();
  renderAnterior();
  carregarCursoDoUsuario();
  await carregarTurmasEstudante();
  mostrarTela("tela-inicio");
  if (typeof renderMascote === "function") renderMascote("mascote-inicio", "inicio");
}

// Códigos das turmas do estudante (para buscar revisões/atividades de todas)
function codigosDasMinhasTurmas() {
  return (minhasTurmas || []).map((t) => t.codigo);
}

// Carrega TODAS as turmas do estudante (ele pode participar de várias)
async function carregarTurmasEstudante() {
  // migra do modelo antigo (turmaAtual única) para lista de turmas
  if (!Array.isArray(usuario.turmas)) {
    usuario.turmas = usuario.turmaAtual ? [usuario.turmaAtual] : [];
    await salvarUsuario(usuario.uid, { turmas: usuario.turmas }).catch(() => {});
  }

  const lista = await listarTurmasPorCodigos(usuario.turmas);
  minhasTurmas = lista;

  // limpa códigos de turmas que não existem mais
  const validos = lista.map((t) => t.codigo);
  if (validos.length !== usuario.turmas.length) {
    usuario.turmas = validos;
    await salvarUsuario(usuario.uid, { turmas: validos }).catch(() => {});
  }

  // turma ativa (usada no mural, ranking e chat)
  const sel = usuario.turmaAtual && validos.includes(usuario.turmaAtual)
    ? usuario.turmaAtual
    : (validos[0] || null);
  usuario.turmaAtual = sel;
  minhaTurma = lista.find((t) => t.codigo === sel) || null;

  renderTurmasAluno();
}

function renderTurmasAluno() {
  const blocoInfo = document.getElementById("bloco-turma-aluno");
  const blocoEntrar = document.getElementById("bloco-entrar-turma");
  const info = document.getElementById("turma-aluno-info");
  if (!info) return;

  if (!minhasTurmas.length) {
    esconder(blocoInfo);
    exibir(blocoEntrar);
    return;
  }

  info.innerHTML = minhasTurmas.map((t) => {
    const ativa = t.codigo === usuario.turmaAtual;
    return `
      <div class="turma-aluno ${ativa ? "ativa" : ""}">
        <div class="turma-aluno-dados">
          <strong>${escaparHTML(t.nome)}</strong><br>
          <span class="turma-cod">${escaparHTML(t.codigo)}</span>
        </div>
        <div class="turma-aluno-acoes">
          ${ativa
            ? `<span class="turma-selo">✔ ativa</span>`
            : `<button class="btn-secundario compacto btn-usar-turma" data-cod="${escaparHTML(t.codigo)}">Usar esta</button>`}
          <button class="btn-ghost compacto btn-sair-turma" data-cod="${escaparHTML(t.codigo)}">🚪 Sair</button>
        </div>
      </div>`;
  }).join("");

  info.querySelectorAll(".btn-usar-turma").forEach((b) =>
    b.addEventListener("click", () => selecionarTurma(b.dataset.cod))
  );
  info.querySelectorAll(".btn-sair-turma").forEach((b) =>
    b.addEventListener("click", () => sairDaTurma(b.dataset.cod))
  );

  exibir(blocoInfo);
  exibir(blocoEntrar);
}

// Define qual turma está ativa (mural, ranking, chat)
async function selecionarTurma(codigo) {
  usuario.turmaAtual = codigo;
  minhaTurma = minhasTurmas.find((t) => t.codigo === codigo) || null;
  await salvarUsuario(usuario.uid, { turmaAtual: codigo }).catch(() => {});
  renderTurmasAluno();
  mostrarToast(`Turma ativa: ${minhaTurma ? minhaTurma.nome : codigo}`);
}

async function sairDaTurma(codigo) {
  const t = minhasTurmas.find((x) => x.codigo === codigo);
  if (!t) return;
  if (!confirm(`Sair da turma "${t.nome}"?`)) return;
  try {
    await removerMembro(t.codigo, usuario.uid);
    usuario.turmas = (usuario.turmas || []).filter((c) => c !== t.codigo);
    if (usuario.turmaAtual === t.codigo) usuario.turmaAtual = usuario.turmas[0] || null;
    await salvarUsuario(usuario.uid, {
      turmas: usuario.turmas,
      turmaAtual: usuario.turmaAtual,
    }).catch(() => {});
    await carregarTurmasEstudante();
  } catch (e) {
    alert("Erro ao sair da turma: " + e.message);
  }
}

document.getElementById("btn-entrar-turma").addEventListener("click", async () => {
  const codigo = document.getElementById("input-codigo").value.trim();
  const aviso = document.getElementById("entrar-aviso");
  if (!codigo) return;
  try {
    const turma = await entrarNaTurma(codigo, usuario);
    usuario.turmas = Array.isArray(usuario.turmas) ? usuario.turmas.slice() : [];
    if (!usuario.turmas.includes(turma.codigo)) usuario.turmas.push(turma.codigo);
    usuario.turmaAtual = turma.codigo;
    await salvarUsuario(usuario.uid, {
      turmas: usuario.turmas,
      turmaAtual: turma.codigo,
    }).catch(() => {});
    minhaTurma = turma;
    aviso.className = "aviso ok";
    aviso.textContent = `✅ Você entrou na turma ${turma.nome}!`;
    exibir(aviso);
    document.getElementById("input-codigo").value = "";
    await carregarTurmasEstudante();
  } catch (e) {
    aviso.className = "aviso erro";
    aviso.textContent = e.message;
    exibir(aviso);
  }
});

// ============================================================
// QUIZ / DIAGNÓSTICO
// ============================================================
function renderAreas() {
  const container = document.getElementById("lista-areas");
  container.innerHTML = "";
  Object.entries(AREAS).forEach(([chave, area]) => {
    const btn = document.createElement("button");
    btn.className = "area-card";
    btn.innerHTML = `
      <span class="area-icone">${area.icone}</span>
      <span class="area-nome">${area.curto}</span>
      <span class="area-desc">${area.descricao}</span>
    `;
    btn.addEventListener("click", () => iniciarQuiz([chave]));
    container.appendChild(btn);
  });
}

function iniciarQuiz(areasSelecionadas) {
  const base = bancoDePerguntas().filter((q) => areasSelecionadas.includes(q.area));
  embaralhar(base);
  fila = base.map(prepararQuestao);
  indice = 0;
  respostas = [];
  mostrarTela("tela-quiz");
  renderQuestao();
}

function prepararQuestao(q) {
  const idx = q.alternativas.map((_, i) => i);
  embaralhar(idx);
  return {
    ...q,
    alternativas: idx.map((i) => q.alternativas[i]),
    correta: idx.indexOf(q.correta),
  };
}

function embaralhar(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}

function renderQuestao() {
  const q = fila[indice];
  const area = AREAS[q.area];

  document.getElementById("progresso-area").textContent = `${area.icone} ${area.curto}`;
  document.getElementById("progresso-contagem").textContent = `${indice + 1} de ${fila.length}`;
  document.getElementById("progresso-fill").style.width = `${(indice / fila.length) * 100}%`;
  document.getElementById("questao-tema").textContent = q.tema;

  const imgDiv = document.getElementById("questao-imagem");
  if (q.imagem) { imgDiv.innerHTML = q.imagem; exibir(imgDiv); }
  else { imgDiv.innerHTML = ""; esconder(imgDiv); }

  const apoioDiv = document.getElementById("questao-apoio");
  if (q.apoio) { apoioDiv.textContent = q.apoio; exibir(apoioDiv); }
  else { apoioDiv.textContent = ""; esconder(apoioDiv); }

  document.getElementById("questao-enunciado").textContent = q.enunciado;

  const alts = document.getElementById("questao-alternativas");
  alts.innerHTML = "";
  q.alternativas.forEach((texto, i) => {
    const btn = document.createElement("button");
    btn.className = "alt";
    btn.innerHTML = `<span class="alt-letra">${LETRAS[i]}</span><span>${texto}</span>`;
    btn.addEventListener("click", () => responder(i));
    alts.appendChild(btn);
  });

  esconder(document.getElementById("questao-feedback"));
  esconder(document.getElementById("btn-proxima"));
}

function responder(escolha) {
  const q = fila[indice];
  const acertou = escolha === q.correta;
  respostas.push({ area: q.area, acertou, tema: q.tema });

  document.querySelectorAll(".alt").forEach((b, i) => {
    b.classList.add("travada");
    if (i === q.correta) b.classList.add("correta");
    else if (i === escolha) b.classList.add("errada");
  });

  const fb = document.getElementById("questao-feedback");
  fb.className = "feedback " + (acertou ? "ok" : "nao");
  fb.innerHTML = acertou
    ? `<strong>✅ Acertou!</strong>${q.explicacao}`
    : `<strong>❌ Não foi essa.</strong>${q.explicacao}`;
  exibir(fb);

  const btn = document.getElementById("btn-proxima");
  btn.textContent = indice + 1 < fila.length ? "Próxima →" : "Ver resultado →";
  exibir(btn);
}

document.getElementById("btn-proxima").addEventListener("click", () => {
  indice++;
  if (indice < fila.length) renderQuestao();
  else finalizar();
});

async function finalizar() {
  const stats = {};
  Object.keys(AREAS).forEach((k) => (stats[k] = { total: 0, acertos: 0 }));
  respostas.forEach((r) => {
    stats[r.area].total++;
    if (r.acertou) stats[r.area].acertos++;
  });

  const areasFeitas = Object.entries(stats).filter(([, s]) => s.total > 0);
  const totalGeral = respostas.length;
  const acertosGeral = respostas.filter((r) => r.acertou).length;
  const pctGeral = Math.round((acertosGeral / totalGeral) * 100);

  document.getElementById("resultado-resumo").textContent =
    `Você acertou ${acertosGeral} de ${totalGeral} questões.`;

  const circulo = document.querySelector(".score-circulo");
  circulo.style.setProperty("--pct", `${pctGeral}%`);
  document.getElementById("score-numero").textContent = `${pctGeral}%`;

  let nivel;
  if (pctGeral >= 80) nivel = "Excelente! Você tem uma base muito sólida.";
  else if (pctGeral >= 60) nivel = "Bom desempenho! Dá pra afinar os pontos fracos.";
  else if (pctGeral >= 40) nivel = "Você está no caminho — foque nos temas que errou.";
  else nivel = "Hora de reforçar a base. Vamos com um plano de estudo!";
  document.getElementById("score-texto").textContent = nivel;

  const barras = document.getElementById("barras-areas");
  barras.innerHTML = "";
  areasFeitas.forEach(([k, s]) => {
    const area = AREAS[k];
    const pct = Math.round((s.acertos / s.total) * 100);
    barras.innerHTML += `
      <div class="barra-item">
        <div class="barra-topo"><strong>${area.icone} ${area.curto}</strong><span>${s.acertos}/${s.total} · ${pct}%</span></div>
        <div class="barra-track"><div class="barra-fill" style="width:${pct}%;background:${corDaBarra(pct)}"></div></div>
      </div>
    `;
  });

  const ordenadas = areasFeitas
    .map(([k, s]) => ({ k, pct: (s.acertos / s.total) * 100 }))
    .sort((a, b) => b.pct - a.pct);
  const forte = ordenadas[0];
  const fraco = ordenadas[ordenadas.length - 1];

  document.getElementById("destaque-forte").innerHTML = forte
    ? `<span class="area-nome-destaque">${AREAS[forte.k].icone} ${AREAS[forte.k].curto}</span><p>${Math.round(forte.pct)}% de acerto. Continue praticando para manter o nível!</p>`
    : "<p>Sem dados.</p>";
  document.getElementById("destaque-fraco").innerHTML =
    fraco && ordenadas.length > 1
      ? `<span class="area-nome-destaque">${AREAS[fraco.k].icone} ${AREAS[fraco.k].curto}</span><p>${Math.round(fraco.pct)}% de acerto. É aqui que um pouco de estudo rende mais!</p>`
      : `<span class="area-nome-destaque">${AREAS[fraco.k].icone} ${AREAS[fraco.k].curto}</span><p>Refaça o diagnóstico completo para comparar as áreas.</p>`;

  const rec = document.getElementById("recomendacoes");
  rec.innerHTML = "";
  ordenadas.slice().reverse().forEach((o) => {
    const area = AREAS[o.k];
    const dica = o.pct >= 80 ? "revisão leve para não esquecer" :
                 o.pct >= 50 ? "praticar questões e revisar erros" :
                 "estudar a teoria e resolver questões fáceis primeiro";
    rec.innerHTML += `<li><strong>${area.icone} ${area.curto}</strong> — ${dica}.</li>`;
  });

  // Plano de estudos personalizado
  const areasMapa = ordenadas.reduce((acc, o) => ({ ...acc, [o.k]: Math.round(o.pct) }), {});
  const plano = gerarPlano({ pct: pctGeral, areas: areasMapa }, cursoEscolhido);
  renderPlano(document.getElementById("plano-estudos"), plano);

  // Salva localmente
  const resultado = {
    data: new Date().toISOString(),
    pct: pctGeral,
    areas: ordenadas.map((o) => ({ area: o.k, pct: Math.round(o.pct) })),
  };
  try { localStorage.setItem(CHAVE_RESULTADO, JSON.stringify(resultado)); } catch {}

  // Salva no ranking da turma (se o estudante tiver turma)
  const blocoRank = document.getElementById("resultado-ranking");
  if (usuario && usuario.papel === "estudante" && minhaTurma) {
    try {
      await salvarResultado(minhaTurma.codigo, usuario, {
        pct: pctGeral,
        acertos: acertosGeral,
        total: totalGeral,
        areas: ordenadas.reduce((acc, o) => ({ ...acc, [o.k]: Math.round(o.pct) }), {}),
      });
      const ranking = await rankingDaTurma(minhaTurma.codigo);
      renderRanking(document.getElementById("ranking-resultado"), ranking, usuario.uid);
      exibir(blocoRank);
    } catch (e) {
      esconder(blocoRank);
    }
  } else {
    esconder(blocoRank);
  }

  mostrarTela("tela-resultado");
}

function corDaBarra(pct) {
  if (pct >= 70) return "var(--success)";
  if (pct >= 40) return "var(--warning)";
  return "var(--error)";
}

// ---------- Plano de estudos ----------
function renderPlano(container, plano) {
  if (!container) return;
  const prioridades = plano.prioridades
    .map((p) => {
      const area = AREAS[p.area] || { icone: "", curto: p.area };
      const topicos = p.topicos
        .map((t) => `<li><strong>${t.nome}</strong> — ${t.desc}<br><em>💡 ${t.dica}</em></li>`)
        .join("");
      const recursos = p.recursos
        .map((r) => `<a class="recurso-link" href="${r.url}" target="_blank" rel="noopener">${r.nome} ↗</a>`)
        .join("");
      return `
        <div class="plano-area" style="border-left:4px solid ${p.cor}">
          <div class="plano-area-topo">
            <span class="plano-area-nome">${area.icone} ${area.curto}</span>
            <span class="plano-tag" style="background:${p.cor}">${p.etiqueta} · ${p.pct}%</span>
          </div>
          <ul class="plano-topicos">${topicos}</ul>
          <div class="plano-recursos">${recursos}</div>
        </div>
      `;
    })
    .join("");

  const cronograma = plano.cronograma
    .map((c) => `<div class="crono-dia"><span class="crono-nome">${c.dia}</span><span class="crono-foco">${c.foco}</span></div>`)
    .join("");

  container.innerHTML = `
    ${plano.curso ? `
      <div class="plano-objetivo">
        🎯 Objetivo: <strong>${plano.curso.icone} ${escaparHTML(plano.curso.nome)}</strong>
        — as áreas de maior peso aparecem primeiro.
      </div>` : `
      <div class="plano-objetivo vazio-objetivo">
        🎯 Você ainda não escolheu um curso. <strong>Escolha seu objetivo</strong> para o plano ficar personalizado!
      </div>`}
    <p class="plano-intro">Seu roteiro foi montado a partir do seu desempenho: comece pelas áreas com prioridade mais alta.</p>
    <div class="plano-grid">${prioridades}</div>
    ${plano.redacaoPeso === 3 ? `
      <div class="plano-area" style="border-left:4px solid #6b3fd4">
        <div class="plano-area-topo">
          <span class="plano-area-nome">✍️ Redação</span>
          <span class="plano-tag" style="background:#6b3fd4">⭐ Peso máximo</span>
        </div>
        <ul class="plano-topicos">
          <li><strong>Treine toda semana</strong> — escreva pelo menos 1 redação por semana.<br><em>💡 Use os temas de redação do NINA (aba Notícias) e os textos motivadores.</em></li>
          <li><strong>As 5 competências</strong> — domínio da norma culta, compreensão do tema, argumentação, coesão e proposta de intervenção.<br><em>💡 Decore o que cada competência pede e revise sua redação com a lista.</em></li>
          <li><strong>Repertório sociocultural</strong> — use dados, leis, obras de arte e fatos históricos.<br><em>💡 Anote 3 repertórios por tema que você estudar.</em></li>
        </ul>
        <div class="plano-recursos">
          <a class="recurso-link" href="https://www.gov.br/inep/pt-br/areas-de-atuacao/avaliacao-e-exames-educacionais/enem" target="_blank" rel="noopener">INEP — Cartilha do participante ↗</a>
        </div>
      </div>` : ""}
    <h4 class="plano-subtitulo">🗓️ Sugestão de rotina semanal</h4>
    <div class="cronograma">${cronograma}</div>
  `;
}

// ============================================================
// TEMA CLARO / ESCURO
// ============================================================
function temaAtual() {
  try { return localStorage.getItem("nina_tema") || "claro"; } catch { return "claro"; }
}

function aplicarTema(tema) {
  const escuro = tema === "escuro";
  document.documentElement.setAttribute("data-tema", escuro ? "escuro" : "");
  const btn = document.getElementById("btn-tema");
  if (btn) {
    btn.textContent = escuro ? "☀️" : "🌙";
    btn.title = escuro ? "Mudar para o modo claro" : "Mudar para o modo escuro";
  }
  try { localStorage.setItem("nina_tema", tema); } catch {}
}

document.getElementById("btn-tema").addEventListener("click", () => {
  aplicarTema(temaAtual() === "escuro" ? "claro" : "escuro");
});

// aplica o tema salvo assim que a página abre
aplicarTema(temaAtual());

// ============================================================
// TOUR DE PRIMEIRO ACESSO
// ============================================================
const TOUR_ESTUDANTE = [
  { alvo: "#bloco-objetivo", titulo: "🎯 Meu objetivo", texto: "Escolha o curso que você quer fazer. O NINA monta um plano com as disciplinas de maior peso pra você se destacar!" },
  { alvo: "#lista-areas", titulo: "📝 Diagnóstico", texto: "Comece por aqui: responda questões das 4 áreas do ENEM e descubra onde você está forte e onde precisa melhorar." },
  { alvo: "#btn-novidades", titulo: "🔔 Novidades", texto: "Aqui aparecem os avisos e as melhorias do NINA. Toque para ativar as notificações no seu celular." },
  { alvo: "#btn-menu", titulo: "☰ Menu", texto: "No menu tem o jogo, a biblioteca, o simulado, o mural e muito mais. Explore tudo!" },
];

const TOUR_PROFESSOR = [
  { alvo: "#input-nome-turma", titulo: "👩‍🏫 Criar turma", texto: "Comece criando uma turma. O NINA gera um código — seus estudantes usam esse código para entrar." },
  { alvo: "#lista-turmas-prof", titulo: "🏆 Suas turmas", texto: "Aqui ficam suas turmas. Clique em uma para ver o ranking, as dificuldades e os estudantes." },
  { alvo: "#btn-ir-atividades", titulo: "📋 Atividades", texto: "Crie atividades e exercícios com o banco de questões ou geradas por IA a partir do seu material." },
  { alvo: "#btn-ir-revisao", titulo: "📖 Revisão com IA", texto: "Suba um material de aula e a IA gera mapa conceitual, revisão, flash cards e atividade." },
  { alvo: "#btn-novidades", titulo: "🔔 Novidades", texto: "Publique avisos para todos os usuários do NINA. O push chega no celular de cada um." },
];

let tourPassos = [];
let tourIndice = 0;
let tourEl = null;

function iniciarTour(passos) {
  if (!passos || !passos.length) return;
  tourPassos = passos.filter((p) => document.querySelector(p.alvo));
  if (!tourPassos.length) return;
  tourIndice = 0;
  criarElementosTour();
  mostrarPassoTour();
}

function criarElementosTour() {
  if (document.getElementById("tour-overlay")) return;
  const overlay = document.createElement("div");
  overlay.id = "tour-overlay";
  overlay.className = "tour-overlay";
  overlay.innerHTML = `
    <div id="tour-balao" class="tour-balao">
      <h4 id="tour-titulo"></h4>
      <p id="tour-texto"></p>
      <div class="tour-acoes">
        <span id="tour-contador" class="tour-contador"></span>
        <button id="tour-pular" class="btn-ghost compacto" type="button">Pular</button>
        <button id="tour-proximo" class="btn-principal compacto" type="button">Próximo →</button>
      </div>
    </div>`;
  document.body.appendChild(overlay);
  document.getElementById("tour-pular").addEventListener("click", encerrarTour);
  document.getElementById("tour-proximo").addEventListener("click", proximoPassoTour);
}

function mostrarPassoTour() {
  const passo = tourPassos[tourIndice];
  const alvo = document.querySelector(passo.alvo);
  if (!alvo) return proximoPassoTour();

  alvo.scrollIntoView({ behavior: "smooth", block: "center" });

  setTimeout(() => {
    if (tourEl) tourEl.classList.remove("tour-destaque");
    tourEl = alvo;
    alvo.classList.add("tour-destaque");

    const r = alvo.getBoundingClientRect();
    const balao = document.getElementById("tour-balao");
    const largura = Math.min(340, window.innerWidth - 32);

    document.getElementById("tour-titulo").textContent = passo.titulo;
    document.getElementById("tour-texto").textContent = passo.texto;
    document.getElementById("tour-contador").textContent = `${tourIndice + 1} de ${tourPassos.length}`;
    document.getElementById("tour-proximo").textContent =
      tourIndice === tourPassos.length - 1 ? "Concluir ✅" : "Próximo →";

    balao.style.width = largura + "px";
    let top = r.bottom + 14;
    if (top + 210 > window.innerHeight) top = Math.max(14, r.top - 210);
    let left = Math.min(Math.max(16, r.left), window.innerWidth - largura - 16);
    balao.style.top = top + "px";
    balao.style.left = left + "px";
  }, 380);
}

function proximoPassoTour() {
  tourIndice++;
  if (tourIndice >= tourPassos.length) return encerrarTour();
  mostrarPassoTour();
}

async function encerrarTour() {
  if (tourEl) { tourEl.classList.remove("tour-destaque"); tourEl = null; }
  const overlay = document.getElementById("tour-overlay");
  if (overlay) overlay.remove();
  if (usuario) {
    usuario.tourVisto = true;
    await salvarUsuario(usuario.uid, { tourVisto: true }).catch(() => {});
  }
}

// Botão "ver o tour de novo" (no perfil)
document.getElementById("btn-ver-tour").addEventListener("click", () => {
  iniciarTour(usuario && usuario.papel === "professor" ? TOUR_PROFESSOR : TOUR_ESTUDANTE);
});

// ============================================================
// CURSOS / OBJETIVO DO ESTUDANTE
// ============================================================
let cursoEscolhido = null;
let filtroUfac = false;
let topicosFeitos = [];   // ex.: ["linguagens:Interpretação de texto", ...]

function carregarCursoDoUsuario() {
  const id = usuario && usuario.curso;
  cursoEscolhido = (typeof CURSOS !== "undefined" && CURSOS.find((c) => c.id === id)) || null;
  topicosFeitos = (usuario && Array.isArray(usuario.topicosFeitos)) ? usuario.topicosFeitos.slice() : [];
  renderCursoEscolhido();
}

// Marca/desmarca um tópico estudado
async function marcarTopico(el, chave, feito) {  if (feito) {
    if (!topicosFeitos.includes(chave)) topicosFeitos.push(chave);
  } else {
    topicosFeitos = topicosFeitos.filter((x) => x !== chave);
  }
  if (el) {
    const li = el.closest("li");
    if (li) li.classList.toggle("feito", feito);
  }
  if (usuario) await salvarUsuario(usuario.uid, { topicosFeitos }).catch(() => {});
}

// Mostra o objetivo (curso + prontidão) no perfil do estudante
function renderPerfilObjetivo(mostrar) {
  const div = document.getElementById("perfil-objetivo");
  if (!div) return;
  if (!mostrar || !cursoEscolhido) { esconder(div); return; }

  let salvo = null;
  try { salvo = JSON.parse(localStorage.getItem(CHAVE_RESULTADO)); } catch {}
  const areasMapa = {};
  if (salvo && salvo.areas) salvo.areas.forEach((a) => { areasMapa[a.area] = a.pct; });
  const plano = Object.keys(areasMapa).length ? gerarPlanoObjetivo(areasMapa, cursoEscolhido) : null;

  div.innerHTML = `
    <h4 class="perfil-rotulo">🎯 Meu objetivo</h4>
    <div class="perfil-objetivo-card">
      <span class="curso-icone">${cursoEscolhido.icone}</span>
      <div class="perfil-objetivo-dados">
        <strong>${escaparHTML(cursoEscolhido.nome)}</strong>
        <span class="curso-meta">${cursoEscolhido.ufac
          ? `🎓 UFAC · ${escaparHTML(cursoEscolhido.campus || "")}`
          : "🏫 Outra universidade"}</span>
        <span class="perfil-prontidao">${plano
          ? `Prontidão: <strong>${plano.prontidao}%</strong>`
          : "Faça o diagnóstico para ver sua prontidão"}</span>
      </div>
    </div>`;
  exibir(div);
}

function renderCursoEscolhido() {
  const div = document.getElementById("curso-escolhido");
  if (!div) return;
  if (!cursoEscolhido) {
    div.innerHTML = `<p class="vazio">Você ainda não escolheu um curso.</p>`;
    return;
  }
  const areas = areasDePeso(cursoEscolhido).filter((a) => a.peso >= 2);
  div.innerHTML = `
    <div class="curso-card ativo">
      <span class="curso-icone">${cursoEscolhido.icone}</span>
      <div class="curso-dados">
        <strong>${escaparHTML(cursoEscolhido.nome)}</strong>
        <span class="curso-desc">${escaparHTML(cursoEscolhido.descricao || "")}</span>
        ${cursoEscolhido.corte ? `<span class="curso-corte">📊 Nota de corte SISU 2025: <strong>${cursoEscolhido.corte}</strong></span>` : ""}
        <div class="curso-pesos">
          ${areas.map((a) => `<span class="peso-tag peso-${a.peso}">${escaparHTML(a.nome)} ${"⭐".repeat(a.peso)}</span>`).join("")}
        </div>
      </div>
    </div>`;
}

function abrirCursos() {
  mostrarTela("tela-cursos");
  const busca = document.getElementById("cursos-busca");
  if (busca) busca.value = "";
  renderCursos("");
}

function renderCursos(termo) {
  const div = document.getElementById("cursos-lista");
  if (!div) return;
  const t = (termo || "").trim().toLowerCase();
  const grupos = {};
  CURSOS
    .filter((c) => !filtroUfac || c.ufac)
    .filter((c) => !t || (c.nome + " " + (c.descricao || "") + " " + c.grupo + " " + (c.campus || "") + " " + (c.grau || "")).toLowerCase().includes(t))
    .forEach((c) => { (grupos[c.grupo] = grupos[c.grupo] || []).push(c); });

  if (!Object.keys(grupos).length) {
    div.innerHTML = `<p class="vazio">Nenhum curso encontrado${filtroUfac ? " na UFAC" : ""}.</p>`;
    return;
  }

  div.innerHTML = GRUPOS_CURSOS.filter((g) => grupos[g]).map((g) => `
    <h4 class="curriculo-sub">${escaparHTML(g)}</h4>
    <div class="cursos-grid">
      ${grupos[g].map((c) => `
        <button class="curso-card ${cursoEscolhido && cursoEscolhido.id === c.id ? "ativo" : ""}" data-curso="${c.id}" type="button">
          <span class="curso-icone">${c.icone}</span>
          <div class="curso-dados">
            <strong>${escaparHTML(c.nome)}</strong>
            <span class="curso-meta">
              ${c.ufac ? `🎓 UFAC · ${escaparHTML(c.campus || "")}` : "🏫 Outra universidade"}
              ${c.grau ? ` · ${escaparHTML(c.grau)}` : ""}
            </span>
            <span class="curso-desc">${escaparHTML(c.descricao || "")}</span>
            ${c.corte ? `<span class="curso-corte">📊 Nota de corte SISU 2025: <strong>${c.corte}</strong></span>` : ""}
            <div class="curso-pesos">
              ${areasDePeso(c).filter((a) => a.peso === 3).map((a) => `<span class="peso-tag peso-3">${escaparHTML(a.nome)} ⭐⭐⭐</span>`).join("")}
            </div>
          </div>
        </button>
      `).join("")}
    </div>
  `).join("");

  div.querySelectorAll(".curso-card").forEach((b) => {
    b.addEventListener("click", () => escolherCurso(b.dataset.curso));
  });
}

async function escolherCurso(id) {
  const c = CURSOS.find((x) => x.id === id);
  if (!c) return;
  cursoEscolhido = c;
  if (usuario) {
    usuario.curso = id;
    await salvarUsuario(usuario.uid, { curso: id }).catch(() => {});
  }
  renderCursoEscolhido();
  const busca = document.getElementById("cursos-busca");
  renderCursos(busca ? busca.value : "");
  mostrarToast(`Objetivo: ${c.nome} 🎯`);
}

document.getElementById("btn-escolher-curso").addEventListener("click", abrirCursos);
document.getElementById("btn-meu-plano").addEventListener("click", abrirPlanoObjetivo);
document.getElementById("btn-voltar-plano").addEventListener("click", () => {
  if (usuario && usuario.papel === "professor") abrirPainelProfessor();
  else abrirInicioEstudante();
});

// Filtro "só UFAC"
document.querySelectorAll(".filtro-btn").forEach((b) => {
  b.addEventListener("click", () => {
    filtroUfac = b.dataset.filtro === "ufac";
    document.querySelectorAll(".filtro-btn").forEach((x) => x.classList.toggle("ativa", x === b));
    const busca = document.getElementById("cursos-busca");
    renderCursos(busca ? busca.value : "");
  });
});
document.getElementById("btn-voltar-cursos").addEventListener("click", () => {
  if (usuario && usuario.papel === "professor") abrirPainelProfessor();
  else abrirInicioEstudante();
});
document.getElementById("cursos-busca").addEventListener("input", (e) => renderCursos(e.target.value));

// ============================================================
// PLANO PARA ALCANÇAR O OBJETIVO
// ============================================================
function abrirPlanoObjetivo() {
  mostrarTela("tela-plano-objetivo");
  renderPlanoObjetivo();
}

function renderPlanoObjetivo() {
  const div = document.getElementById("plano-objetivo-conteudo");
  const sub = document.getElementById("plano-objetivo-sub");
  if (!div) return;

  let salvo = null;
  try { salvo = JSON.parse(localStorage.getItem(CHAVE_RESULTADO)); } catch {}

  if (!cursoEscolhido) {
    if (sub) sub.textContent = "";
    div.innerHTML = `
      <div class="plano-objetivo vazio-objetivo">🎯 Escolha primeiro o seu curso para eu montar o plano.</div>
      <button class="btn-principal" id="btn-ir-escolher">🎯 Escolher meu curso</button>`;
    const b = document.getElementById("btn-ir-escolher");
    if (b) b.addEventListener("click", abrirCursos);
    return;
  }

  if (sub) sub.innerHTML = `Objetivo: <strong>${cursoEscolhido.icone} ${escaparHTML(cursoEscolhido.nome)}</strong>`;

  if (!salvo || !salvo.areas) {
    div.innerHTML = `
      <div class="plano-objetivo vazio-objetivo">
        📝 Faça o <strong>diagnóstico</strong> primeiro — ele mostra sua nota atual em cada área
        e eu monto o caminho até a meta.
      </div>
      <button class="btn-principal" id="btn-ir-diag">🚀 Fazer o diagnóstico</button>`;
    const b = document.getElementById("btn-ir-diag");
    if (b) b.addEventListener("click", abrirInicioEstudante);
    return;
  }

  const areasMapa = {};
  salvo.areas.forEach((a) => { areasMapa[a.area] = a.pct; });

  const plano = gerarPlanoObjetivo(areasMapa, cursoEscolhido);

  // Progresso do checklist de tópicos
  const totalTopicos = plano.areas.reduce((s, a) => s + Math.min(3, a.topicos.length), 0);
  const feitosNaLista = plano.areas.reduce((s, a) =>
    s + a.topicos.slice(0, 3).filter((t) => topicosFeitos.includes(`${a.area}:${t.nome}`)).length, 0);
  const pctTopicos = totalTopicos ? Math.round((feitosNaLista / totalTopicos) * 100) : 0;

  const cards = plano.areas.map((a) => {
    const are = AREAS[a.area] || { icone: "", curto: a.area };
    const topicos = a.topicos.slice(0, 3)
      .map((t) => {
        const chave = `${a.area}:${t.nome}`;
        const feito = topicosFeitos.includes(chave);
        return `<li class="${feito ? "feito" : ""}">
          <label class="topico-check">
            <input type="checkbox" class="topico-box" data-chave="${escaparHTML(chave)}" ${feito ? "checked" : ""}>
            <span><strong>${escaparHTML(t.nome)}</strong> — ${escaparHTML(t.desc)}<br><em>💡 ${escaparHTML(t.dica)}</em></span>
          </label>
        </li>`;
      })
      .join("");
    const recursos = a.recursos
      .map((r) => `<a class="recurso-link" href="${r.url}" target="_blank" rel="noopener">${escaparHTML(r.nome)} ↗</a>`)
      .join("");
    return `
      <div class="objetivo-card" style="border-left:6px solid ${a.cor}">
        <div class="objetivo-topo">
          <span class="objetivo-area">${are.icone} ${escaparHTML(are.curto)}</span>
          <span class="peso-tag peso-${a.peso}">peso ${a.peso}</span>
        </div>
        <div class="objetivo-barra">
          <div class="objetivo-barra-fill" style="width:${Math.min(100, a.pct)}%;background:${a.cor}"></div>
          <div class="objetivo-meta" style="left:${a.meta}%" title="Meta ${a.meta}%"></div>
        </div>
        <div class="objetivo-numeros">
          <span>Sua nota: <strong>${a.pct}%</strong></span>
          <span>Meta: <strong>${a.meta}%</strong></span>
          <span style="color:${a.cor}">${a.emoji} ${a.situacao}${a.falta > 0 ? ` · faltam ${a.falta} pts` : ""}</span>
        </div>
        <ul class="plano-topicos">${topicos}</ul>
        <div class="plano-recursos">${recursos}</div>
      </div>`;
  }).join("");

  const cardRedacao = plano.redacaoPeso >= 2 ? `
    <div class="objetivo-card" style="border-left:6px solid #6b3fd4">
      <div class="objetivo-topo">
        <span class="objetivo-area">✍️ Redação</span>
        <span class="peso-tag peso-${plano.redacaoPeso}">peso ${plano.redacaoPeso}</span>
      </div>
      <div class="objetivo-numeros">
        <span style="color:#6b3fd4">⭐ Sua redação vale muito neste curso</span>
      </div>
      <ul class="plano-topicos">
        <li><strong>Escreva 1 redação por semana</strong> — treino constante é o que faz diferença.</li>
        <li><strong>Domine as 5 competências</strong> — norma culta, tema, argumentação, coesão e intervenção.</li>
        <li><strong>Monte um repertório</strong> — 3 referências por tema (dados, leis, arte, história).</li>
      </ul>
      <div class="plano-recursos">
        <a class="recurso-link" href="https://www.gov.br/inep/pt-br/areas-de-atuacao/avaliacao-e-exames-educacionais/enem" target="_blank" rel="noopener">INEP — Cartilha do participante ↗</a>
      </div>
    </div>` : "";

  const frase = plano.prontidao >= 80
    ? "Você está muito perto! Mantenha o ritmo. 💪"
    : plano.prontidao >= 50
      ? "Você está no caminho. Foque nas áreas de maior peso! 🎯"
      : "Vamos começar! Priorize as áreas de peso máximo. 🚀";

  div.innerHTML = `
    <div class="prontidao">
      <div class="prontidao-num">${plano.prontidao}%</div>
      <div class="prontidao-txt">
        <strong>Prontidão para ${escaparHTML(cursoEscolhido.nome)}</strong>
        <p>${frase}</p>
        ${cursoEscolhido.corte ? `<p class="corte-info">📊 <strong>Nota de corte SISU 2025:</strong> ${cursoEscolhido.corte} pontos (ampla concorrência)</p>` : ""}
      </div>
    </div>
    <p class="plano-intro">As áreas estão na ordem de prioridade para o seu objetivo. A linha marca a <strong>meta</strong> de cada uma.</p>
    <div class="progresso-topicos">
      <div class="progresso-topo">
        <span>✅ Tópicos estudados</span>
        <strong>${feitosNaLista} de ${totalTopicos} (${pctTopicos}%)</strong>
      </div>
      <div class="relatorio-barra"><div class="relatorio-barra-fill" style="width:${pctTopicos}%"></div></div>
    </div>
    <div class="objetivo-lista">${cards}${cardRedacao}</div>
    <h4 class="plano-subtitulo">🗓️ Rotina semanal sugerida</h4>
    <div class="cronograma">${plano.cronograma.map((c) => `<div class="crono-dia"><span class="crono-nome">${c.dia}</span><span class="crono-foco">${c.foco}</span></div>`).join("")}</div>
    <p class="dica">✅ Marque os tópicos que você já estudou — fica salvo no seu perfil.</p>
  `;

  // Checklist de tópicos estudados
  div.querySelectorAll(".topico-box").forEach((cb) => {
    cb.addEventListener("change", () => marcarTopico(cb, cb.dataset.chave, cb.checked));
  });
}

function renderRanking(container, ranking, uidAtual) {  if (!ranking.length) {
    container.innerHTML = "<p class='vazio'>Ainda não há resultados nesta turma.</p>";
    return;
  }
  container.innerHTML = "";
  ranking.forEach((r) => {
    const eu = uidAtual && r.uid === uidAtual;
    const medalha = r.posicao === 1 ? "🥇" : r.posicao === 2 ? "🥈" : r.posicao === 3 ? "🥉" : r.posicao + "º";
    container.innerHTML += `
      <div class="rank-item ${eu ? "eu" : ""}">
        <span class="rank-pos">${medalha}</span>
        <div class="rank-info">
          <div class="rank-nome">${r.nome}${eu ? " (você)" : ""}</div>
          <div class="rank-areas">${r.acertos}/${r.total} acertos</div>
        </div>
        <span class="rank-pct">${r.pct}%</span>
      </div>
    `;
  });
}

// ---------- Resultado anterior ----------
function renderAnterior() {
  let salvo;
  try { salvo = JSON.parse(localStorage.getItem(CHAVE_RESULTADO)); } catch {}
  if (!salvo) return;
  const div = document.getElementById("resultado-anterior");
  const data = new Date(salvo.data).toLocaleDateString("pt-BR");
  const partes = salvo.areas.map((a) => `${AREAS[a.area].curto} ${a.pct}%`).join(" · ");
  div.innerHTML = `📌 <strong>Último diagnóstico</strong> (${data}): média ${salvo.pct}% — ${partes}`;
  exibir(div);
}

// ============================================================
// MURAL DE RECADOS (ORKUT)
// ============================================================
let muralAba = "turma"; // "turma" | "geral"

async function abrirMural() {
  mostrarTela("tela-mural");
  // Se não tiver turma, força a aba coletiva
  if (!minhaTurma || !minhaTurma.codigo) muralAba = "geral";
  atualizarAbasMural();
  await carregarDepoimentos();
}

function atualizarAbasMural() {
  document.querySelectorAll(".mural-aba").forEach((b) => {
    b.classList.toggle("ativa", b.dataset.aba === muralAba);
  });
  const titulo = document.getElementById("mural-titulo");
  if (titulo) titulo.textContent = muralAba === "turma" ? "Recados da turma" : "Recados coletivos";
}

document.querySelectorAll(".mural-aba").forEach((b) => {
  b.addEventListener("click", async () => {
    muralAba = b.dataset.aba;
    atualizarAbasMural();
    await carregarDepoimentos();
  });
});

function turmaDoMural() {
  return muralAba === "turma" ? (minhaTurma && minhaTurma.codigo) : null;
}

async function carregarDepoimentos() {
  const lista = document.getElementById("mural-lista");
  lista.innerHTML = "<p class='vazio'>Carregando recados…</p>";
  try {
    const depoimentos = await listarDepoimentos(turmaDoMural());
    if (!depoimentos.length) {
      lista.innerHTML = `<p class='vazio'>${muralAba === "turma" ? "Nenhum recado na turma ainda." : "Nenhum recado coletivo ainda."} Seja a primeira pessoa a escrever! ✍️</p>`;
      return;
    }
    // Fixados primeiro, depois por data
    depoimentos.sort((a, b) => {
      const fa = a.fixado ? 1 : 0;
      const fb = b.fixado ? 1 : 0;
      if (fa !== fb) return fb - fa;
      return b.ms - a.ms;
    });
    lista.innerHTML = depoimentos.map(renderRecado).join("");
  } catch (e) {
    lista.innerHTML = `<p class='vazio'>Erro ao carregar: ${e.message}</p>`;
  }
}

function renderRecado(d) {
  const quando = tempoRelativo(d.ms);
  const avatar = d.foto
    ? `<img src="${d.foto}" alt="" referrerpolicy="no-referrer">`
    : "🙂";
  const admin = podeAdministrar();
  const botaoFixar = admin
    ? `<button class="recado-fixar" data-id="${d.id}" data-fixado="${d.fixado ? "1" : "0"}">${d.fixado ? "📌 Desafixar" : "📌 Fixar"}</button>`
    : "";

  const curtidas = d.curtidas || [];
  const curtiu = usuario && curtidas.includes(usuario.uid);
  const botaoCurtir = `<button class="recado-curtir ${curtiu ? "curtido" : ""}" data-id="${d.id}" data-curtiu="${curtiu ? "1" : "0"}">
      <span class="coracao">💚</span>
      <span class="curtidas-num">${curtidas.length}</span>
    </button>`;

  const podeExcluir = usuario && (d.uid === usuario.uid || admin);
  const botaoExcluir = podeExcluir
    ? `<button class="recado-excluir" data-id="${d.id}" title="Apagar recado">🗑️ Apagar</button>`
    : "";

  return `
    <div class="recado ${d.fixado ? "fixado" : ""}">
      <div class="recado-avatar">${avatar}</div>
      <div class="recado-corpo">
        <div class="recado-cabeca">
          <span class="recado-nome clicavel" data-uid="${d.uid}">${d.fixado ? "📌 " : ""}${d.nome || "Anônimo"}</span>
          <span class="recado-tempo">${quando}</span>
        </div>
        <p class="recado-texto">${escaparHTML(d.texto || "")}</p>
        <div class="recado-acoes">
          ${botaoCurtir}
          ${botaoFixar}
          ${botaoExcluir}
        </div>
      </div>
    </div>
  `;
}

function tempoRelativo(ms) {
  const diff = Date.now() - ms;
  const min = Math.floor(diff / 60000);
  if (min < 1) return "agora mesmo";
  if (min < 60) return `há ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `há ${h}h`;
  const dias = Math.floor(h / 24);
  if (dias < 30) return `há ${dias} dia(s)`;
  return new Date(ms).toLocaleDateString("pt-BR");
}

function escaparHTML(s) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

document.getElementById("btn-mural").addEventListener("click", abrirMural);

document.getElementById("btn-voltar-mural").addEventListener("click", () => {
  if (usuario && usuario.papel === "professor") abrirPainelProfessor();
  else abrirInicioEstudante();
});

document.getElementById("mural-texto").addEventListener("input", (e) => {
  document.getElementById("mural-contador").textContent = `${e.target.value.length}/300`;
});

document.getElementById("btn-postar").addEventListener("click", async () => {
  const campo = document.getElementById("mural-texto");
  const aviso = document.getElementById("mural-aviso");
  const texto = campo.value.trim();
  if (!texto) {
    aviso.className = "aviso erro";
    aviso.textContent = "Escreva algo antes de postar. 😊";
    exibir(aviso);
    return;
  }
  try {
    await postarDepoimento(usuario, texto, turmaDoMural());
    campo.value = "";
    document.getElementById("mural-contador").textContent = "0/300";
    aviso.className = "aviso ok";
    aviso.textContent = "✅ Recado publicado!";
    exibir(aviso);
    setTimeout(() => esconder(aviso), 2500);
    await carregarDepoimentos();
  } catch (e) {
    aviso.className = "aviso erro";
    aviso.textContent = "Erro ao postar: " + e.message;
    exibir(aviso);
  }
});

// ============================================================
// PERFIL
// ============================================================
let perfilEmEdicao = false;
let perfilEhMeu = false;

function preencherPerfil(p) {
  document.getElementById("perfil-nome").textContent = p.nome || "Usuário";
  let papel = p.papel === "professor" ? "👩🏽‍🏫 Professor(a)" : "🎒 Estudante";
  if (p.papel === "professor" && p.disciplina) papel += ` · ${p.disciplina}`;
  document.getElementById("perfil-papel").textContent = papel;

  // Estrelas de bonificação
  const estrelas = p.estrelas || 0;
  const elEstrelas = document.getElementById("perfil-estrelas");
  if (elEstrelas) {
    if (estrelas > 0) {
      elEstrelas.innerHTML = `⭐ ${estrelas} estrela(s) · Perfil Destaque`;
      elEstrelas.classList.remove("escondido");
    } else {
      elEstrelas.innerHTML = "";
      elEstrelas.classList.add("escondido");
    }
  }

  const avatar = document.getElementById("perfil-avatar");
  avatar.innerHTML = p.foto
    ? `<img src="${p.foto}" alt="" referrerpolicy="no-referrer">`
    : "🙂";

  document.getElementById("perfil-bio-view").textContent = p.bio || "";
  document.getElementById("perfil-sonho-view").textContent = p.sonho || "";
  document.getElementById("perfil-gostos-view").textContent = p.gostos || "";

  document.getElementById("perfil-bio").value = p.bio || "";
  document.getElementById("perfil-sonho").value = p.sonho || "";
  document.getElementById("perfil-gostos").value = p.gostos || "";
}

// Ganha uma estrela de bonificação (perfil destaque)
async function ganharEstrela() {
  if (!usuario) return;
  const estrelas = (usuario.estrelas || 0) + 1;
  usuario.estrelas = estrelas;
  await salvarUsuario(usuario.uid, { estrelas }).catch(() => {});
}

function modoPerfil(editando) {
  perfilEmEdicao = editando;
  const btnPapel = document.getElementById("btn-trocar-papel");
  const btnApoiador = document.getElementById("btn-apoiador");
  const ehProf = usuario && usuario.papel === "professor";
  if (editando) {
    exibir(document.getElementById("perfil-edit"));
    esconder(document.getElementById("perfil-view"));
    exibir(document.getElementById("btn-editar-perfil"));
    document.getElementById("btn-editar-perfil").textContent = "Cancelar";
    if (btnPapel) esconder(btnPapel);
    if (btnApoiador) esconder(btnApoiador);
    const btnGloss = document.getElementById("btn-glossario-perfil");
    if (btnGloss) esconder(btnGloss);
  } else {
    esconder(document.getElementById("perfil-edit"));
    exibir(document.getElementById("perfil-view"));
    exibir(document.getElementById("btn-editar-perfil"));
    document.getElementById("btn-editar-perfil").textContent = "✏️ Editar perfil";
    if (btnPapel) { if (perfilEhMeu) exibir(btnPapel); else esconder(btnPapel); }
    if (btnApoiador) { if (perfilEhMeu && ehProf) exibir(btnApoiador); else esconder(btnApoiador); }
    const btnGloss = document.getElementById("btn-glossario-perfil");
    if (btnGloss) { if (perfilEhMeu && ehProf) exibir(btnGloss); else esconder(btnGloss); }
  }
}

function abrirMeuPerfil() {
  perfilEhMeu = true;
  preencherPerfil(usuario);
  exibir(document.getElementById("btn-editar-perfil"));
  atualizarBotaoPapel();
  exibir(document.getElementById("btn-trocar-papel"));
  if (usuario.papel === "professor") exibir(document.getElementById("btn-apoiador"));
  else esconder(document.getElementById("btn-apoiador"));
  // Glossários: só para professores
  if (usuario.papel === "professor") exibir(document.getElementById("btn-glossario-perfil"));
  else esconder(document.getElementById("btn-glossario-perfil"));
  renderPerfilObjetivo(true);
  modoPerfil(false);
  carregarAtividadesPerfil(usuario.uid);
  mostrarTela("tela-perfil");
}

// Mostra o rótulo do botão de troca de papel conforme o papel atual
function atualizarBotaoPapel() {
  const btn = document.getElementById("btn-trocar-papel");
  if (!btn || !usuario) return;
  btn.textContent = usuario.papel === "professor"
    ? "🎒 Trocar para conta de estudante"
    : "👩🏽‍🏫 Trocar para conta de professor(a)";
}

// Alterna entre professor e estudante mantendo os dados do perfil
async function trocarPapel() {
  if (!usuario) return;
  const novo = usuario.papel === "professor" ? "estudante" : "professor";
  const msg = novo === "estudante"
    ? "Trocar para conta de estudante?\n\nSuas turmas continuam salvas. Para aparecer no ranking, entre numa turma com o código do professor."
    : "Trocar para conta de professor(a)?\n\nVocê poderá criar turmas e acompanhar os estudantes.";
  if (!confirm(msg)) return;
  usuario.papel = novo;
  await salvarUsuario(usuario.uid, { papel: novo }).catch(() => {});
  atualizarBotaoPapel();
  if (novo === "professor") {
    if (!usuario.area || !usuario.disciplina) abrirEscolhaArea();
    else abrirPainelProfessor();
    mostrarToast("Agora você está como professor(a).");
  } else {
    abrirInicioEstudante();
    mostrarToast("Agora você está como estudante. Entre numa turma com o código do professor para ver o ranking.");
  }
}

document.getElementById("btn-trocar-papel").addEventListener("click", trocarPapel);

// Tela do apoiador (professor)
document.getElementById("btn-apoiador").addEventListener("click", () => {
  mostrarTela("tela-apoiador");
});
document.getElementById("btn-voltar-apoiador").addEventListener("click", () => {
  mostrarTela("tela-perfil");
});

// Mostra as atividades feitas (visível para o aluno e para o professor que abrir o perfil)
async function carregarAtividadesPerfil(uid) {
  const bloco = document.getElementById("perfil-atividades");
  const lista = document.getElementById("perfil-atividades-lista");
  if (!bloco || !lista) return;
  try {
    const respostas = await listarRespostasQuizDoAluno(uid);
    if (!respostas.length) {
      bloco.classList.add("escondido");
      return;
    }
    respostas.sort((a, b) => {
      const ma = a.criadaEm && a.criadaEm.toMillis ? a.criadaEm.toMillis() : 0;
      const mb = b.criadaEm && b.criadaEm.toMillis ? b.criadaEm.toMillis() : 0;
      return mb - ma;
    });
    lista.innerHTML = respostas.map((r) => {
      const pct = r.total ? Math.round((r.acertos / r.total) * 100) : 0;
      const estrela = pct === 100 ? " ⭐" : "";
      return `<div class="perfil-atividade-item">
        <span>📋 ${escaparHTML(r.atividadeTitulo || "Atividade")}</span>
        <span class="perfil-atividade-pct">${r.acertos}/${r.total} · ${pct}%${estrela}</span>
      </div>`;
    }).join("");
    bloco.classList.remove("escondido");
  } catch {
    bloco.classList.add("escondido");
  }
}

async function abrirPerfilDe(uid) {
  if (uid === usuario.uid) return abrirMeuPerfil();
  perfilEhMeu = false;
  const p = await carregarUsuario(uid).catch(() => null);
  if (!p) return;
  preencherPerfil(p);
  esconder(document.getElementById("btn-editar-perfil"));
  modoPerfil(false);
  carregarAtividadesPerfil(uid);
  mostrarTela("tela-perfil");
}

document.getElementById("btn-perfil").addEventListener("click", abrirMeuPerfil);

// ---------- Foto de perfil ----------
let fotoPendente = null;

function redimensionarImagem(file, maxLado = 256) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;
        if (width > height) {
          if (width > maxLado) { height = Math.round((height * maxLado) / width); width = maxLado; }
        } else {
          if (height > maxLado) { width = Math.round((width * maxLado) / height); height = maxLado; }
        }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        canvas.getContext("2d").drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", 0.82));
      };
      img.onerror = reject;
      img.src = reader.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

document.getElementById("perfil-foto-input").addEventListener("change", async (e) => {
  const file = e.target.files && e.target.files[0];
  if (!file) return;
  try {
    fotoPendente = await redimensionarImagem(file);
    const prev = document.getElementById("perfil-foto-preview");
    prev.src = fotoPendente;
    prev.classList.remove("escondido");
  } catch {
    alert("Não foi possível carregar a imagem.");
  }
});

document.getElementById("btn-editar-perfil").addEventListener("click", () => {
  if (perfilEmEdicao) {
    // Cancelar
    preencherPerfil(usuario);
    modoPerfil(false);
  } else {
    fotoPendente = null;
    const prev = document.getElementById("perfil-foto-preview");
    if (prev) prev.classList.add("escondido");
    modoPerfil(true);
  }
});

document.getElementById("btn-salvar-perfil").addEventListener("click", async () => {
  const aviso = document.getElementById("perfil-aviso");
  const dados = {
    bio: document.getElementById("perfil-bio").value.trim(),
    sonho: document.getElementById("perfil-sonho").value.trim(),
    gostos: document.getElementById("perfil-gostos").value.trim(),
  };
  if (fotoPendente) dados.foto = fotoPendente;
  try {
    await salvarUsuario(usuario.uid, dados);
    Object.assign(usuario, dados);
    aviso.className = "aviso ok";
    aviso.textContent = "✅ Perfil salvo!";
    exibir(aviso);
    setTimeout(() => esconder(aviso), 2500);
    fotoPendente = null;
    preencherPerfil(usuario);
    modoPerfil(false);
  } catch (e) {
    aviso.className = "aviso erro";
    aviso.textContent = "Erro ao salvar: " + e.message;
    exibir(aviso);
  }
});

document.getElementById("btn-voltar-perfil").addEventListener("click", () => {
  if (usuario && usuario.papel === "professor") abrirPainelProfessor();
  else abrirInicioEstudante();
});

// Cliques no mural: nome do autor (abre perfil) e botão fixar (admin)
document.getElementById("mural-lista").addEventListener("click", async (e) => {
  const curtir = e.target.closest(".recado-curtir");
  if (curtir) {
    try {
      const jaCurtiu = curtir.dataset.curtiu === "1";
      await curtirDepoimento(curtir.dataset.id, usuario.uid, !jaCurtiu);
      await carregarDepoimentos();
    } catch (err) {
      alert("Não foi possível curtir: " + err.message);
    }
    return;
  }

  const fixar = e.target.closest(".recado-fixar");
  if (fixar) {
    try {
      const agora = fixar.dataset.fixado === "1";
      await fixarDepoimento(fixar.dataset.id, !agora);
      await carregarDepoimentos();
    } catch (err) {
      alert("Não foi possível fixar: " + err.message);
    }
    return;
  }

  const excluir = e.target.closest(".recado-excluir");
  if (excluir) {
    if (!confirm("Apagar este recado?")) return;
    try {
      await excluirDepoimento(excluir.dataset.id);
      await carregarDepoimentos();
    } catch (err) {
      alert("Não foi possível apagar: " + err.message);
    }
    return;
  }

  const alvo = e.target.closest(".recado-nome.clicavel");
  if (alvo && alvo.dataset.uid) abrirPerfilDe(alvo.dataset.uid);
});

// Clique num colega da turma (abre o perfil) e botão remover (professor)
document.getElementById("membros-turma").addEventListener("click", async (e) => {
  const remover = e.target.closest(".btn-remover");
  if (remover) {
    if (!turmaAtualProf) return;
    if (!confirm(`Remover ${remover.dataset.nome} da turma?`)) return;
    try {
      await removerMembro(turmaAtualProf.codigo, remover.dataset.uid);
      await abrirTurmaProfessor(turmaAtualProf);
    } catch (err) {
      alert("Erro ao remover: " + err.message);
    }
    return;
  }
  const alvo = e.target.closest(".membro-nome.clicavel");
  if (alvo && alvo.dataset.uid) abrirPerfilDe(alvo.dataset.uid);
});

// ============================================================
// EXPLORAR (JOGO CONTRA A DESINFORMAÇÃO)
// ============================================================
const MAX_VIDAS = 5;
let explorarEstado = { avatarId: null, fasesConcluidas: [] };
let faseAtual = null;
let desafioAtual = 0;
let vidas = MAX_VIDAS;
let respondido = false;

function carregarEstadoExplorar() {
  explorarEstado = {
    avatarId: (usuario && usuario.avatarId) || null,
    fasesConcluidas: (usuario && usuario.fasesConcluidas) || [],
  };
}

function avatarPorId(id) {
  return AVATARES.find((a) => a.id === id) || AVATARES[0];
}

function salvarExplorar() {
  if (!usuario) return Promise.resolve();
  return salvarUsuario(usuario.uid, {
    avatarId: explorarEstado.avatarId,
    fasesConcluidas: explorarEstado.fasesConcluidas,
  }).catch(() => {});
}

function abrirExplorar() {
  carregarEstadoExplorar();
  renderAvatar();
  renderMapaFases();
  mostrarTela("tela-explorar");
}

function renderAvatar() {
  const av = explorarEstado.avatarId ? avatarPorId(explorarEstado.avatarId) : null;
  document.getElementById("avatar-atual").textContent = av ? av.emoji : "❓";
  document.getElementById("avatar-nome").textContent = av
    ? `Seu aventureiro (${av.genero})`
    : "Escolha seu aventureiro";

  // Grade de escolha
  const grade = document.getElementById("avatar-grade");
  grade.innerHTML = "";
  AVATARES.forEach((a) => {
    const btn = document.createElement("button");
    btn.className = "avatar-opcao" + (a.id === explorarEstado.avatarId ? " escolhido" : "");
    btn.textContent = a.emoji;
    btn.title = a.genero;
    btn.addEventListener("click", async () => {
      explorarEstado.avatarId = a.id;
      await salvarExplorar();
      esconder(document.getElementById("avatar-escolha"));
      renderAvatar();
    });
    grade.appendChild(btn);
  });

  // Se ainda não escolheu, mostra a grade
  if (!explorarEstado.avatarId) exibir(document.getElementById("avatar-escolha"));
  else esconder(document.getElementById("avatar-escolha"));
}

function faseConcluida(id) {
  return explorarEstado.fasesConcluidas.includes(id);
}

function faseLiberada(i) {
  if (i === 0) return true;
  return faseConcluida(FASES[i - 1].id);
}

// Posições (x%, y%) das fases no mapa estilo Super Mario
const POSICOES_FASES = [
  { x: 16, y: 82 },
  { x: 40, y: 72 },
  { x: 20, y: 58 },
  { x: 45, y: 46 },
  { x: 70, y: 56 },
  { x: 82, y: 38 },
  { x: 58, y: 22 },
];
const POS_CASTELO = { x: 82, y: 11 };
let posicaoAvatarIndex = 0; // posição atual da bonequinha no mapa

function todasConcluidas() {
  return FASES.every((f) => faseConcluida(f.id));
}

function indiceFaseAtual() {
  for (let i = 0; i < FASES.length; i++) {
    if (faseLiberada(i) && !faseConcluida(FASES[i].id)) return i;
  }
  return FASES.length - 1;
}

function renderMapaFases() {
  const mapa = document.getElementById("mapa-fases");
  const av = explorarEstado.avatarId ? avatarPorId(explorarEstado.avatarId).emoji : "🧑🏽";

  const pontos = POSICOES_FASES.map((p) => `${p.x},${p.y}`).join(" ");
  const trilha = `${pontos} ${POS_CASTELO.x},${POS_CASTELO.y}`;

  let nodesHtml = "";
  FASES.forEach((f, i) => {
    const liberada = faseLiberada(i);
    const concluida = faseConcluida(f.id);
    const pos = POSICOES_FASES[i];
    const flag = concluida ? '<span class="node-flag">⭐</span>' : "";
    nodesHtml += `<button class="mario-node ${liberada ? "" : "bloqueada"} ${concluida ? "concluida" : ""}" data-i="${i}" style="left:${pos.x}%;top:${pos.y}%" title="${f.nome}">${liberada ? f.emoji : "🔒"}${flag}</button>`;
  });

  // Nuvens e pássaros (céu de Rio Branco)
  const nuvens = `
    <g fill="#fff3d6" opacity="0.95">
      <ellipse cx="18" cy="14" rx="10" ry="3.6"/>
      <ellipse cx="28" cy="12" rx="7" ry="3"/>
      <ellipse cx="82" cy="22" rx="11" ry="3.8"/>
      <ellipse cx="74" cy="20" rx="6" ry="2.6"/>
    </g>`;
  const passaros = `
    <g fill="none" stroke="#2b2340" stroke-width="0.7" stroke-linecap="round">
      <path d="M12,26 q2.2,-2 4.4,0 q2.2,-2 4.4,0"/>
      <path d="M24,32 q1.8,-1.6 3.6,0 q1.8,-1.6 3.6,0"/>
      <path d="M86,12 q1.8,-1.6 3.6,0 q1.8,-1.6 3.6,0"/>
    </g>`;

  // Reflexos do sol no rio
  let reflexos = "";
  for (let i = 0; i < 8; i++) {
    const y = 74 + i * 3;
    const w = 14 - i;
    reflexos += `<line x1="${58 - w / 2}" y1="${y}" x2="${58 + w / 2}" y2="${y}" stroke="#f9c46b" stroke-width="0.8" opacity="0.7"/>`;
  }

  // Ilha verde (margem do Rio Acre)
  const ilha = "M 12,86 C 6,76 10,60 14,50 C 8,38 14,24 26,18 C 40,10 62,10 76,18 C 88,26 92,42 88,54 C 94,66 90,80 80,86 C 62,94 30,94 12,86 Z";

  // Árvores da floresta
  const arvores = `
    <g>
      <circle cx="30" cy="80" r="2.6" fill="#3f7a35"/><circle cx="30" cy="78" r="2.2" fill="#4fae4f"/>
      <circle cx="54" cy="70" r="2.4" fill="#3f7a35"/><circle cx="54" cy="68.5" r="2" fill="#4fae4f"/>
      <circle cx="24" cy="54" r="2.6" fill="#3f7a35"/><circle cx="24" cy="52" r="2.2" fill="#4fae4f"/>
      <circle cx="64" cy="66" r="2.4" fill="#3f7a35"/><circle cx="64" cy="64.5" r="2" fill="#4fae4f"/>
      <circle cx="78" cy="50" r="2.6" fill="#3f7a35"/><circle cx="78" cy="48" r="2.2" fill="#4fae4f"/>
      <circle cx="68" cy="30" r="2.4" fill="#3f7a35"/><circle cx="68" cy="28.5" r="2" fill="#4fae4f"/>
      <circle cx="26" cy="32" r="2.4" fill="#3f7a35"/><circle cx="26" cy="30.5" r="2" fill="#4fae4f"/>
    </g>`;

  const posAvatar = todasConcluidas() ? POS_CASTELO : POSICOES_FASES[indiceFaseAtual()];
  posicaoAvatarIndex = todasConcluidas() ? FASES.length : indiceFaseAtual();

  mapa.innerHTML = `
    <svg class="mario-cenario" viewBox="0 0 100 100" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="ceuAcre" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#3b3a6b"/>
          <stop offset="42%" stop-color="#9c6a9a"/>
          <stop offset="70%" stop-color="#f2a35e"/>
          <stop offset="100%" stop-color="#f9d36b"/>
        </linearGradient>
        <linearGradient id="rioAcre" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#e8955a"/>
          <stop offset="100%" stop-color="#2e5f96"/>
        </linearGradient>
      </defs>
      <rect width="100" height="100" fill="url(#ceuAcre)"/>
      <circle cx="58" cy="42" r="24" fill="#f9c46b" opacity="0.45"/>
      <circle cx="58" cy="42" r="13" fill="#fde9a8" opacity="0.85"/>
      ${nuvens}
      ${passaros}
      <rect y="70" width="100" height="30" fill="url(#rioAcre)"/>
      ${reflexos}
      <path d="${ilha}" fill="#6aa84f" stroke="#3f7a35" stroke-width="1.2"/>
      ${arvores}
      <polyline points="${trilha}" fill="none" stroke="#f3e2b3" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>
      <polyline points="${trilha}" fill="none" stroke="#c9a86a" stroke-width="1" stroke-dasharray="1 3" stroke-linecap="round"/>
    </svg>
    ${nodesHtml}
    <span class="mario-castelo" style="left:${POS_CASTELO.x}%;top:${POS_CASTELO.y}%">🏰</span>
    <span class="mario-avatar" id="mario-avatar" style="left:${posAvatar.x}%;top:${posAvatar.y}%">${av}</span>
  `;

  mapa.querySelectorAll(".mario-node").forEach((node) => {
    const i = parseInt(node.dataset.i, 10);
    if (!faseLiberada(i)) {
      node.addEventListener("click", () => alert("Conclua a fase anterior para desbloquear esta! 🔒"));
      return;
    }
    node.addEventListener("click", () => caminharEIniciar(i));
  });
}

function caminharEIniciar(i) {
  const avatar = document.getElementById("mario-avatar");
  if (!avatar) return iniciarFase(FASES[i]);
  avatar.classList.add("pulando");

  const passo = () => {
    if (posicaoAvatarIndex === i) {
      avatar.classList.remove("pulando");
      setTimeout(() => iniciarFase(FASES[i]), 250);
      return;
    }
    // Anda um ponto por vez, seguindo a rota (para frente ou para trás)
    posicaoAvatarIndex += i > posicaoAvatarIndex ? 1 : -1;
    const pos = POSICOES_FASES[posicaoAvatarIndex];
    avatar.style.left = pos.x + "%";
    avatar.style.top = pos.y + "%";
    setTimeout(passo, 460);
  };
  passo();
}

document.getElementById("btn-explorar").addEventListener("click", abrirExplorar);
document.getElementById("btn-trocar-avatar").addEventListener("click", () => {
  const bloco = document.getElementById("avatar-escolha");
  if (bloco.classList.contains("escondido")) exibir(bloco);
  else esconder(bloco);
});
document.getElementById("btn-voltar-explorar").addEventListener("click", abrirExplorar);
document.getElementById("btn-sair-fase").addEventListener("click", abrirExplorar);

function iniciarFase(fase) {
  if (!explorarEstado.avatarId) {
    alert("Escolha seu aventureiro primeiro! 🧑🏽");
    abrirExplorar();
    return;
  }
  faseAtual = fase;
  desafioAtual = 0;
  vidas = MAX_VIDAS;
  respondido = false;

  document.getElementById("fase-periodo").textContent = fase.periodo;
  document.getElementById("fase-titulo").textContent = `${fase.emoji} ${fase.nome}`;
  document.getElementById("fase-intro-texto").textContent = fase.intro;

  // Mergulho visual: cena da fase
  const cenaDiv = document.getElementById("fase-cena");
  if (cenaDiv) {
    if (CENAS && CENAS[fase.cena]) {
      cenaDiv.innerHTML = CENAS[fase.cena];
      cenaDiv.classList.remove("escondido");
    } else {
      cenaDiv.innerHTML = "";
      cenaDiv.classList.add("escondido");
    }
  }

  document.getElementById("fase-intro").classList.remove("escondido");
  document.getElementById("fase-jogo").classList.add("escondido");
  document.getElementById("fase-fim").classList.add("escondido");
  document.getElementById("btn-voltar-explorar").classList.remove("escondido");
  renderVidas();
  mostrarTela("tela-fase");
}

function renderVidas() {
  let html = "";
  for (let i = 0; i < MAX_VIDAS; i++) html += i < vidas ? "❤️" : "🖤";
  document.getElementById("fase-vidas").textContent = html;
}

document.getElementById("btn-comecar-fase").addEventListener("click", () => {
  document.getElementById("fase-intro").classList.add("escondido");
  document.getElementById("fase-jogo").classList.remove("escondido");
  renderDesafio();
});

function renderDesafio() {
  const d = faseAtual.desafios[desafioAtual];
  const area = AREAS[d.area] || { icone: "", curto: d.area };
  respondido = false;

  document.getElementById("fase-progresso-texto").textContent =
    `Desafio ${desafioAtual + 1} de ${faseAtual.desafios.length}`;
  document.getElementById("fase-progresso-fill").style.width =
    `${(desafioAtual / faseAtual.desafios.length) * 100}%`;

  document.getElementById("noticia-tag").textContent = `${area.icone} ${area.curto}`;
  document.getElementById("noticia-texto").textContent = `"${d.noticia}"`;

  const fb = document.getElementById("noticia-feedback");
  fb.className = "noticia-feedback escondido";
  fb.textContent = "";
  esconder(document.getElementById("btn-proximo-desafio"));

  const bV = document.getElementById("btn-verdadeira");
  const bF = document.getElementById("btn-falsa");
  bV.disabled = false;
  bF.disabled = false;
  bV.classList.remove("escondido");
  bF.classList.remove("escondido");

  const vilao = document.getElementById("vilao");
  vilao.classList.remove("derrotado");
  vilao.style.visibility = "visible";
}

function responderVF(achouVerdadeira) {
  if (respondido) return;
  respondido = true;
  const d = faseAtual.desafios[desafioAtual];
  // Acertou se: a notícia é fake e o jogador marcou "Falsa",
  // ou a notícia é verdadeira e o jogador marcou "Verdadeira".
  const acertou = achouVerdadeira !== d.fake;

  document.getElementById("btn-verdadeira").disabled = true;
  document.getElementById("btn-falsa").disabled = true;

  const fb = document.getElementById("noticia-feedback");
  if (acertou) {
    fb.className = "noticia-feedback ok";
    fb.innerHTML = `⚔️ <strong>Você derrotou a Desinformação!</strong><br>${d.explica}`;
    const vilao = document.getElementById("vilao");
    vilao.classList.add("derrotado");
    setTimeout(() => { vilao.style.visibility = "hidden"; }, 600);
  } else {
    vidas--;
    renderVidas();
    fb.className = "noticia-feedback erro";
    fb.innerHTML = `💔 <strong>Você foi enganado(a)! Perdeu um coração.</strong><br>${d.explica}`;
  }
  exibir(fb);

  const btn = document.getElementById("btn-proximo-desafio");
  btn.textContent = desafioAtual + 1 < faseAtual.desafios.length ? "Próximo →" : "Ver resultado →";
  exibir(btn);
}

document.getElementById("btn-verdadeira").addEventListener("click", () => responderVF(true));
document.getElementById("btn-falsa").addEventListener("click", () => responderVF(false));

document.getElementById("btn-proximo-desafio").addEventListener("click", () => {
  if (vidas <= 0) return fimDeFase(false);
  desafioAtual++;
  if (desafioAtual < faseAtual.desafios.length) renderDesafio();
  else fimDeFase(true);
});

document.getElementById("btn-repetir-fase").addEventListener("click", () => iniciarFase(faseAtual));

document.getElementById("btn-proxima-fase").addEventListener("click", () => {
  const idx = FASES.findIndex((f) => f.id === faseAtual.id);
  const proxima = FASES[idx + 1];
  if (proxima) iniciarFase(proxima);
  else abrirExplorar();
});

function fimDeFase(ganhou) {
  const fim = document.getElementById("fase-fim");
  const emoji = document.getElementById("fase-fim-emoji");
  const titulo = document.getElementById("fase-fim-titulo");
  const texto = document.getElementById("fase-fim-texto");

  if (ganhou) {
    if (!explorarEstado.fasesConcluidas.includes(faseAtual.id)) {
      explorarEstado.fasesConcluidas.push(faseAtual.id);
      salvarExplorar();
    }
    emoji.textContent = "🏆";
    titulo.textContent = "Fase concluída!";
    texto.textContent = `Você venceu a Desinformação na ${faseAtual.nome} e salvou ${vidas} coração(ões)!`;
    const idx = FASES.findIndex((f) => f.id === faseAtual.id);
    const temProxima = !!FASES[idx + 1];
    document.getElementById("btn-proxima-fase").style.display = temProxima ? "block" : "none";
  } else {
    emoji.textContent = "💀";
    titulo.textContent = "Você perdeu todos os corações!";
    texto.textContent = "A Desinformação venceu desta vez. Revise as explicações e tente de novo — a verdade é o seu poder!";
    document.getElementById("btn-proxima-fase").style.display = "none";
  }

  esconder(document.getElementById("fase-jogo"));
  document.getElementById("fase-intro").classList.add("escondido");
  exibir(fim);
}

// ============================================================
// CONTRIBUIR COM PERGUNTAS (PROFESSOR)
// ============================================================
function abrirContribuir() {
  limparFormularioPergunta();
  carregarMinhasPerguntas();
  mostrarTela("tela-contribuir");
}

function limparFormularioPergunta() {
  document.getElementById("perg-tema").value = "";
  document.getElementById("perg-apoio").value = "";
  document.getElementById("perg-enunciado").value = "";
  for (let i = 0; i < 5; i++) document.getElementById("perg-alt" + i).value = "";
  document.getElementById("perg-correta").value = "0";
  document.getElementById("perg-explicacao").value = "";
  esconder(document.getElementById("perg-aviso"));
}

async function carregarMinhasPerguntas() {
  const lista = document.getElementById("lista-perguntas");
  lista.innerHTML = "<p class='vazio'>Carregando…</p>";
  try {
    const perguntas = await listarPerguntasDoProfessor(usuario.uid);
    if (!perguntas.length) {
      lista.innerHTML = "<p class='vazio'>Você ainda não contribuiu com perguntas.</p>";
      return;
    }
    lista.innerHTML = perguntas.map(renderPerguntaCard).join("");
  } catch (e) {
    lista.innerHTML = `<p class='vazio'>Erro: ${e.message}</p>`;
  }
}

function renderPerguntaCard(p) {
  const area = AREAS[p.area] || { icone: "", curto: p.area };
  const letras = ["A", "B", "C", "D", "E"];
  return `
    <div class="pergunta-card">
      <div class="pergunta-topo">
        <span class="pergunta-tag">${area.icone} ${area.curto} · ${p.tema || "—"}</span>
        <button class="pergunta-excluir" data-id="${p.id}" title="Excluir">🗑️</button>
      </div>
      <p class="pergunta-enunciado">${escaparHTML(p.enunciado || "")}</p>
      <p class="pergunta-resposta">✅ Correta: <strong>${letras[p.correta]})</strong> ${escaparHTML(p.alternativas[p.correta] || "")}</p>
    </div>
  `;
}

document.getElementById("btn-ir-contribuir").addEventListener("click", abrirContribuir);
document.getElementById("btn-voltar-contribuir").addEventListener("click", abrirPainelProfessor);

document.getElementById("btn-salvar-pergunta").addEventListener("click", async () => {
  const aviso = document.getElementById("perg-aviso");
  const area = document.getElementById("perg-area").value;
  const tema = document.getElementById("perg-tema").value.trim();
  const apoio = document.getElementById("perg-apoio").value.trim();
  const enunciado = document.getElementById("perg-enunciado").value.trim();
  const alternativas = [0, 1, 2, 3, 4].map((i) => document.getElementById("perg-alt" + i).value.trim());
  const correta = parseInt(document.getElementById("perg-correta").value, 10);
  const explicacao = document.getElementById("perg-explicacao").value.trim();

  const faltando = [];
  if (!tema) faltando.push("tema");
  if (!enunciado) faltando.push("enunciado");
  if (alternativas.some((a) => !a)) faltando.push("todas as 5 alternativas");
  if (!explicacao) faltando.push("explicação");

  if (faltando.length) {
    aviso.className = "aviso erro";
    aviso.textContent = "Preencha: " + faltando.join(", ") + ".";
    exibir(aviso);
    return;
  }

  try {
    await criarPergunta(usuario, {
      area, tema, apoio, enunciado, alternativas, correta, explicacao,
    });
    // Atualiza o banco local para o diagnóstico
    perguntasExtras = await listarPerguntas().catch(() => perguntasExtras);
    aviso.className = "aviso ok";
    aviso.textContent = "✅ Pergunta adicionada ao banco!";
    exibir(aviso);
    limparFormularioPergunta();
    await carregarMinhasPerguntas();
  } catch (e) {
    aviso.className = "aviso erro";
    aviso.textContent = "Erro ao salvar: " + e.message;
    exibir(aviso);
  }
});

document.getElementById("lista-perguntas").addEventListener("click", async (e) => {
  const btn = e.target.closest(".pergunta-excluir");
  if (!btn) return;
  if (!confirm("Excluir esta pergunta do banco?")) return;
  try {
    await excluirPergunta(btn.dataset.id);
    perguntasExtras = await listarPerguntas().catch(() => perguntasExtras);
    await carregarMinhasPerguntas();
  } catch (err) {
    alert("Erro ao excluir: " + err.message);
  }
});

// ============================================================
// ECA (ESTATUTO DA CRIANÇA E DO ADOLESCENTE)
// ============================================================
function mostrarAvisoECA() {
  // Mostra uma vez por sessão de navegação
  let jaViu = false;
  try { jaViu = sessionStorage.getItem("eca_aviso_visto") === "1"; } catch {}
  if (!jaViu) {
    exibir(document.getElementById("modal-eca"));
  }
}

function fecharAvisoECA() {
  try { sessionStorage.setItem("eca_aviso_visto", "1"); } catch {}
  esconder(document.getElementById("modal-eca"));
}

function abrirECA() {
  mostrarTela("tela-eca");
}

document.getElementById("btn-eca").addEventListener("click", abrirECA);
document.getElementById("btn-voltar-eca").addEventListener("click", () => {
  if (usuario && usuario.papel === "professor") abrirPainelProfessor();
  else abrirInicioEstudante();
});
document.getElementById("btn-eca-aceitar").addEventListener("click", fecharAvisoECA);
document.getElementById("btn-eca-ler").addEventListener("click", () => {
  fecharAvisoECA();
  abrirECA();
});

// ============================================================
// JOGO: ROLETA DE FIGURINHAS
// ============================================================
let anguloRoleta = 0;
let girando = false;
let jogoAreaAtual = null;
let jogoQuestaoAtual = null;
let jogoRespondido = false;
let setoresRoleta = [];
let jogoUsadas = new Set();
let jogoNivel = 2; // 1 = fácil, 2 = intermediário, 3 = difícil (padrão: intermediário)
let jogoDisciplinaAtual = null;
let enemPorArea = {}; // cache das questões reais do ENEM por área

// Disciplinas cobradas no ENEM (para a roleta)
const DISCIPLINAS_ROLETA = [
  { id: "Arte", area: "linguagens", icone: "🎨" },
  { id: "Língua Portuguesa", area: "linguagens", icone: "📖" },
  { id: "Literatura", area: "linguagens", icone: "📚" },
  { id: "Educação Física", area: "linguagens", icone: "🏃" },
  { id: "Língua Inglesa", area: "linguagens", icone: "🇬🇧" },
  { id: "Língua Espanhola", area: "linguagens", icone: "🇪🇸" },
  { id: "História", area: "humanas", icone: "🏛️" },
  { id: "Geografia", area: "humanas", icone: "🗺️" },
  { id: "Filosofia", area: "humanas", icone: "💭" },
  { id: "Sociologia", area: "humanas", icone: "👥" },
  { id: "Biologia", area: "natureza", icone: "🧬" },
  { id: "Física", area: "natureza", icone: "⚛️" },
  { id: "Química", area: "natureza", icone: "🧪" },
  { id: "Matemática", area: "matematica", icone: "📐" },
];

// Estatísticas do jogo (acertos por disciplina, salvas no navegador)
const CHAVE_JOGO_STATS = "nina_jogo_stats";

function registrarJogo(disc, acertou) {
  if (!disc) return;
  let stats = {};
  try { stats = JSON.parse(localStorage.getItem(CHAVE_JOGO_STATS)) || {}; } catch {}
  if (!stats[disc.id]) stats[disc.id] = { total: 0, acertos: 0 };
  stats[disc.id].total++;
  if (acertou) stats[disc.id].acertos++;
  try { localStorage.setItem(CHAVE_JOGO_STATS, JSON.stringify(stats)); } catch {}
}

function renderEstatisticasJogo() {
  const div = document.getElementById("jogo-estatisticas");
  if (!div) return;
  let stats = {};
  try { stats = JSON.parse(localStorage.getItem(CHAVE_JOGO_STATS)) || {}; } catch {}
  const entradas = Object.entries(stats)
    .filter(([, s]) => s.total > 0)
    .sort((a, b) => b[1].acertos / b[1].total - a[1].acertos / a[1].total);
  if (!entradas.length) { div.innerHTML = ""; return; }
  div.innerHTML =
    `<h3 class="secao-titulo">📊 Seu desempenho por disciplina</h3>` +
    entradas.map(([id, s]) => {
      const pct = Math.round((s.acertos / s.total) * 100);
      const cor = pct >= 70 ? "var(--green)" : pct >= 40 ? "var(--yellow)" : "var(--red)";
      return `<div class="barra-item">
        <div class="barra-topo"><strong>${escaparHTML(id)}</strong><span>${s.acertos}/${s.total} · ${pct}%</span></div>
        <div class="barra-track"><div class="barra-fill" style="width:${pct}%;background:${cor}"></div></div>
      </div>`;
    }).join("");
}

// Nível de dificuldade de cada questão fixa (1 fácil, 2 médio, 3 difícil)
const NIVEIS = {
  lin1: 2, lin2: 3, lin3: 2, lin4: 1, lin5: 1, lin6: 2, lin7: 3, lin8: 2, lin9: 2, lin10: 1, lin11: 1, lin12: 2,
  hum1: 2, hum2: 3, hum3: 2, hum4: 2, hum5: 2, hum6: 3,
  nat1: 2, nat2: 1, nat3: 2, nat4: 1, nat5: 1, nat6: 2,
  mat1: 1, mat2: 2, mat3: 1, mat4: 1, mat5: 1, mat6: 1,
};

function nivelDaQuestao(q) {
  if (q.id && NIVEIS[q.id] != null) return NIVEIS[q.id];
  // Questões contribuídas: estima pelo tamanho do enunciado/apoio
  const tam = (q.enunciado || "").length + (q.apoio || "").length;
  if (tam > 320) return 3;
  if (tam > 180) return 2;
  return 1;
}

// Disciplina de cada questão fixa
const DISCIPLINA_QUESTAO = {
  lin1: "Arte", lin2: "Arte", lin3: "Literatura", lin4: "Língua Portuguesa", lin5: "Língua Inglesa", lin6: "Língua Portuguesa",
  lin7: "Língua Espanhola", lin8: "Língua Espanhola", lin9: "Língua Espanhola", lin10: "Educação Física", lin11: "Educação Física", lin12: "Educação Física",
  hum1: "História", hum2: "Geografia", hum3: "Filosofia", hum4: "Sociologia", hum5: "Sociologia", hum6: "Geografia",
  nat1: "Biologia", nat2: "Física", nat3: "Química", nat4: "Biologia", nat5: "Física", nat6: "Química",
  mat1: "Matemática", mat2: "Matemática", mat3: "Matemática", mat4: "Matemática", mat5: "Matemática", mat6: "Matemática",
};

function disciplinaDaQuestao(q) {
  if (q.disciplina) return q.disciplina;
  if (q.id && DISCIPLINA_QUESTAO[q.id]) return DISCIPLINA_QUESTAO[q.id];
  return null;
}

// Série sugerida de cada questão (segundo as competências/habilidades da BNCC)
const SERIE_QUESTAO = {
  lin1: "3ª", lin2: "3ª", lin3: "2ª", lin4: "1ª", lin5: "1ª", lin6: "1ª",
  lin7: "1ª", lin8: "2ª", lin9: "2ª", lin10: "1ª", lin11: "2ª", lin12: "3ª",
  hum1: "1ª", hum2: "2ª", hum3: "3ª", hum4: "1ª", hum5: "2ª", hum6: "2ª",
  nat1: "1ª", nat2: "1ª", nat3: "1ª", nat4: "2ª", nat5: "3ª", nat6: "2ª",
  mat1: "1ª", mat2: "1ª", mat3: "1ª", mat4: "2ª", mat5: "2ª", mat6: "1ª",
};

function serieDaQuestao(q) {
  if (q.serie) return q.serie;
  if (q.id && SERIE_QUESTAO[q.id]) return SERIE_QUESTAO[q.id];
  return "1ª";
}

document.querySelectorAll(".nivel-btn").forEach((b) => {
  b.addEventListener("click", () => {
    jogoNivel = parseInt(b.dataset.nivel, 10);
    document.querySelectorAll(".nivel-btn").forEach((x) => x.classList.toggle("ativa", x === b));
    jogoUsadas = new Set(); // recomeça as perguntas usadas ao trocar o nível
  });
});

function minhasFigurinhas() {
  return (usuario && usuario.figurinhas) || [];
}

// Pesos: áreas em que o aluno tem MAIS DIFICULDADE saem mais na roleta
function pesosRoleta() {
  let resultado = null;
  try { resultado = JSON.parse(localStorage.getItem(CHAVE_RESULTADO)); } catch {}

  if (resultado && Array.isArray(resultado.areas) && resultado.areas.length) {
    const mapa = {};
    resultado.areas.forEach((a) => { mapa[a.area] = a.pct; });
    return ORDEM_ROLETA.map((area) => {
      const pct = mapa[area];
      if (pct == null) return 3; // sem dado: peso médio
      // quanto MENOR o desempenho, MAIOR o peso (1 a 6)
      return Math.max(1, Math.min(6, Math.round((100 - pct) / 18) + 1));
    });
  }

  // Sem diagnóstico ainda: dá mais chance a quem tem menos figurinhas
  const tenho = minhasFigurinhas();
  return ORDEM_ROLETA.map(
    (area) => 1 + figurinhasDaArea(area).filter((f) => !tenho.includes(f.id)).length
  );
}

// Pesos das disciplinas: áreas em que o aluno tem mais dificuldade têm mais chance
function pesosDisciplinas() {
  let resultado = null;
  try { resultado = JSON.parse(localStorage.getItem(CHAVE_RESULTADO)); } catch {}
  const pesoArea = {};
  ORDEM_ROLETA.forEach((a) => (pesoArea[a] = 3));
  if (resultado && Array.isArray(resultado.areas) && resultado.areas.length) {
    resultado.areas.forEach((a) => {
      pesoArea[a.area] = Math.max(1, Math.min(6, Math.round((100 - a.pct) / 18) + 1));
    });
  }
  return DISCIPLINAS_ROLETA.map((d) => pesoArea[d.area] || 3);
}

// Desenha a roleta com as DISCIPLINAS, com setores proporcionais à dificuldade
function renderRoleta() {
  const pesos = pesosDisciplinas();
  const soma = pesos.reduce((a, b) => a + b, 0);
  let acc = 0;
  setoresRoleta = DISCIPLINAS_ROLETA.map((d, i) => {
    const graus = (pesos[i] / soma) * 360;
    const inicio = acc;
    acc += graus;
    return { disc: d, inicio, fim: acc };
  });

  const partes = setoresRoleta.map((s) => `${CORES_AREA[s.disc.area]} ${s.inicio}deg ${s.fim}deg`);
  const face = document.getElementById("roleta-face");
  face.style.background = `conic-gradient(${partes.join(", ")})`;
  face.innerHTML = setoresRoleta.map((s) => {
    const meio = (s.inicio + s.fim) / 2;
    return `<span class="roleta-item" style="--ang:${meio}deg" title="${escaparHTML(s.disc.id)}">${s.disc.icone}</span>`;
  }).join("");
}

function abrirJogo() {
  renderRoleta();
  renderAlbum();
  renderEstatisticasJogo();
  esconder(document.getElementById("jogo-painel"));
  const btn = document.getElementById("btn-girar");
  btn.disabled = false;
  btn.textContent = "🎡 Girar a roleta";
  mostrarTela("tela-jogo");
}

document.getElementById("btn-jogo").addEventListener("click", abrirJogo);

document.getElementById("btn-girar").addEventListener("click", () => {
  if (girando) return;
  girando = true;
  esconder(document.getElementById("jogo-painel"));
  const btn = document.getElementById("btn-girar");
  btn.disabled = true;
  btn.textContent = "🎡 Girando...";

  // Sorteio ponderado (disciplinas de áreas com mais dificuldade saem mais)
  const pesos = pesosDisciplinas();
  const soma = pesos.reduce((a, b) => a + b, 0);
  let r = Math.random() * soma;
  let idx = 0;
  for (let i = 0; i < pesos.length; i++) {
    if (r < pesos[i]) { idx = i; break; }
    r -= pesos[i];
  }
  const s = setoresRoleta[idx];
  const p = s.inicio + Math.random() * (s.fim - s.inicio);
  const alvo = (360 - p + 360) % 360;
  anguloRoleta += 5 * 360 + (((alvo - (anguloRoleta % 360)) % 360) + 360) % 360;
  document.getElementById("roleta").style.transform = `rotate(${anguloRoleta}deg)`;

  setTimeout(() => {
    girando = false;
    btn.disabled = false;
    btn.textContent = "🎡 Girar a roleta";
    jogoDisciplinaAtual = s.disc;
    mostrarPerguntaDaDisciplina(jogoDisciplinaAtual);
  }, 4200);
});

// Busca questões reais do ENEM por área (vários anos) — com cache
const ENEM_ANOS = [2023, 2022, 2021];

async function carregarENEMArea(area) {
  if (enemPorArea[area]) return enemPorArea[area];
  const mapa = { linguagens: "linguagens", humanas: "ciencias-humanas", natureza: "ciencias-natureza", matematica: "matematica" };
  const apiArea = mapa[area];
  let todas = [];
  for (const ano of ENEM_ANOS) {
    for (let offset = 0; offset < 200; offset += 50) {
      try {
        const r = await fetch(`https://api.enem.dev/v1/exams/${ano}/questions?limit=50&offset=${offset}`);
        if (!r.ok) break;
        const data = await r.json();
        todas = todas.concat((data.questions || []).filter((q) => q.discipline === apiArea).map((q) => ({ ...q, year: q.year || ano })));
        if (!data.metadata || !data.metadata.hasMore) break;
      } catch {
        break;
      }
    }
  }
  const mapeadas = todas
    .map((q, i) => ({
      id: "enem_" + area + "_" + (q.year || "") + "_" + (q.index || i),
      area,
      disciplina: null,
      tema: "ENEM " + (q.year || ""),
      apoio: q.context || "",
      enunciado: q.alternativesIntroduction || "",
      alternativas: (q.alternatives || []).map((a) => a.text || ""),
      correta: (q.alternatives || []).findIndex((a) => a.letter === q.correctAlternative),
      explicacao: "",
    }))
    .filter((q) => q.alternativas.length >= 4 && q.correta >= 0);
  enemPorArea[area] = mapeadas;
  return mapeadas;
}

function chaveQuestao(q) {
  return q.id || (q.enunciado || "").slice(0, 40);
}

async function mostrarPerguntaDaDisciplina(disc) {
  const area = disc.area;
  // Banco local da disciplina (+ nível), complementado com questões reais do ENEM
  let banco = bancoDePerguntas().filter((q) => disciplinaDaQuestao(q) === disc.id && nivelDaQuestao(q) === jogoNivel);
  if (!banco.length) banco = bancoDePerguntas().filter((q) => disciplinaDaQuestao(q) === disc.id);
  const enem = await carregarENEMArea(area);
  banco = banco.concat(enem);
  if (!banco.length) banco = bancoDePerguntas().filter((q) => q.area === area);
  if (!banco.length) {
    alert("Ainda não há perguntas dessa disciplina.");
    return;
  }

  // Evita repetir a mesma pergunta; quando esgotar, reinicia a lista
  let disponiveis = banco.filter((q) => !jogoUsadas.has(chaveQuestao(q)));
  if (!disponiveis.length) {
    jogoUsadas = new Set();
    disponiveis = banco;
  }
  const escolhida = disponiveis[Math.floor(Math.random() * disponiveis.length)];
  jogoUsadas.add(chaveQuestao(escolhida));

  // EMBARALHA as alternativas
  jogoQuestaoAtual = prepararQuestao(escolhida);
  jogoRespondido = false;

  document.getElementById("jogo-area-tag").textContent = `${disc.icone} ${disc.id}`;

  // Imagem de apoio (se houver)
  const imgDiv = document.getElementById("jogo-imagem");
  if (jogoQuestaoAtual.imagem) {
    imgDiv.innerHTML = jogoQuestaoAtual.imagem;
    exibir(imgDiv);
  } else {
    imgDiv.innerHTML = "";
    esconder(imgDiv);
  }

  // Texto de apoio (com markdown: imagens, negrito)
  const apoioDiv = document.getElementById("jogo-apoio");
  if (jogoQuestaoAtual.apoio) {
    apoioDiv.innerHTML = renderApoioSimulado(jogoQuestaoAtual.apoio);
    exibir(apoioDiv);
  } else {
    apoioDiv.innerHTML = "";
    esconder(apoioDiv);
  }

  document.getElementById("jogo-enunciado").innerHTML = renderApoioSimulado(jogoQuestaoAtual.enunciado);

  const alts = document.getElementById("jogo-alternativas");
  alts.innerHTML = "";
  jogoQuestaoAtual.alternativas.forEach((texto, i) => {
    const b = document.createElement("button");
    b.className = "alt";
    b.innerHTML = `<span class="alt-letra">${LETRAS[i]}</span><span>${renderApoioSimulado(texto)}</span>`;
    b.addEventListener("click", () => responderJogo(i));
    alts.appendChild(b);
  });

  esconder(document.getElementById("jogo-feedback"));
  document.getElementById("jogo-painel").classList.remove("escondido");
}

async function responderJogo(escolha) {
  if (jogoRespondido) return;
  jogoRespondido = true;
  const q = jogoQuestaoAtual;
  const acertou = escolha === q.correta;

  document.querySelectorAll("#jogo-alternativas .alt").forEach((b, i) => {
    b.classList.add("travada");
    if (i === q.correta) b.classList.add("correta");
    else if (i === escolha) b.classList.add("errada");
  });

  const fb = document.getElementById("jogo-feedback");
  fb.className = "jogo-feedback " + (acertou ? "ok" : "erro");

  if (acertou) {
    const areaFig = jogoDisciplinaAtual ? jogoDisciplinaAtual.area : jogoAreaAtual;
    const nova = await ganharFigurinha(areaFig);
    if (nova) {
      fb.innerHTML = `🎉 <strong>Acertou! Você ganhou ${nova.emoji} ${nova.nome}!</strong><br><em>${nova.historia || ""}</em>`;
    } else {
      fb.innerHTML = `🎉 <strong>Acertou!</strong> Você já tem todas as figurinhas dessa área! 🌟<br>${q.explicacao || ""}`;
    }
  } else {
    fb.innerHTML = `❌ <strong>Não foi essa.</strong> Tente de novo girando a roleta!<br>${q.explicacao || ""}`;
  }
  fb.classList.remove("escondido");
  registrarJogo(jogoDisciplinaAtual, acertou);
  renderAlbum();
  renderEstatisticasJogo();
}

// Sorteia uma figurinha ainda não colecionada da área
async function ganharFigurinha(area) {
  const tenho = minhasFigurinhas();
  const disponiveis = figurinhasDaArea(area).filter((f) => !tenho.includes(f.id));
  if (!disponiveis.length) return null;

  // Dá preferência às mais comuns; as raras/lendárias são mais difíceis
  const peso = (f) => (f.raridade === "lendaria" ? 1 : f.raridade === "rara" ? 2 : 3);
  const pool = [];
  disponiveis.forEach((f) => { for (let i = 0; i < peso(f); i++) pool.push(f); });
  const nova = pool[Math.floor(Math.random() * pool.length)];

  const lista = tenho.concat(nova.id);
  usuario.figurinhas = lista;
  await salvarUsuario(usuario.uid, { figurinhas: lista }).catch(() => {});
  return nova;
}

function renderAlbum() {
  const album = document.getElementById("album");
  const tenho = minhasFigurinhas();
  album.innerHTML = FIGURINHAS.map((f) => {
    const tem = tenho.includes(f.id);
    const info = AREAS[f.area] || { icone: "", curto: f.area };
    return `
      <div class="figurinha ${f.raridade} area-${f.area} ${tem ? "clicavel" : "bloqueada"}" data-id="${f.id}">
        <span class="fig-emoji">${tem ? f.emoji : "❓"}</span>
        <span class="fig-nome">${tem ? f.nome : "???"}</span>
        <span class="fig-raridade ${f.raridade}">${tem ? f.raridade : info.curto}</span>
      </div>
    `;
  }).join("");

  const total = FIGURINHAS.length;
  const qtd = tenho.length;
  document.getElementById("album-resumo").textContent =
    `Você colecionou ${qtd} de ${total} figurinhas. Cada acerto na roleta revela uma nova!`;

  // Destaques por área (quantas figurinhas em cada)
  const porArea = {};
  ORDEM_ROLETA.forEach((a) => {
    porArea[a] = { total: figurinhasDaArea(a).length, tenho: figurinhasDaArea(a).filter((f) => tenho.includes(f.id)).length };
  });
}

// Clique numa figurinha coletada: mostra a história
document.getElementById("album").addEventListener("click", (e) => {
  const card = e.target.closest(".figurinha.clicavel");
  if (!card) return;
  const f = figurinhaPorId(card.dataset.id);
  if (!f) return;
  document.getElementById("fig-modal-emoji").textContent = f.emoji;
  document.getElementById("fig-modal-nome").textContent = f.nome;
  const rar = document.getElementById("fig-modal-raridade");
  rar.textContent = f.raridade;
  rar.className = "fig-modal-raridade " + f.raridade;
  document.getElementById("fig-modal-historia").textContent = f.historia || "";
  document.getElementById("modal-figurinha").classList.remove("escondido");
});

document.getElementById("btn-fechar-figurinha").addEventListener("click", () => {
  document.getElementById("modal-figurinha").classList.add("escondido");
});

// ============================================================
// DUELO DE FIGURINHAS
// ============================================================
let dueloAtual = null;
let dueloQuestoes = [];
let dueloIndice = 0;
let dueloRespostas = [];
let dueloRespondido = false;

function abrirDuelo() {
  mostrarTela("tela-duelo");
  esconder(document.getElementById("duelo-jogo"));
  const temTurma = !!(minhaTurma && minhaTurma.codigo);
  if (temTurma) {
    exibir(document.getElementById("duelo-conteudo"));
    esconder(document.getElementById("duelo-sem-turma"));
    renderDuelo();
  } else {
    esconder(document.getElementById("duelo-conteudo"));
    exibir(document.getElementById("duelo-sem-turma"));
  }
}

document.getElementById("btn-ir-duelo").addEventListener("click", abrirDuelo);
document.getElementById("btn-voltar-duelo").addEventListener("click", () => { abrirJogo(); });

async function renderDuelo() {
  const colegasDiv = document.getElementById("duelo-colegas");
  const pendDiv = document.getElementById("duelo-pendentes");
  const meusDiv = document.getElementById("duelo-meus");
  colegasDiv.innerHTML = "<p class='vazio'>Carregando colegas…</p>";
  pendDiv.innerHTML = "";
  meusDiv.innerHTML = "";

  try {
    const membros = await listarMembros(minhaTurma.codigo);
    const outros = membros.filter((m) => m.uid !== usuario.uid);
    if (outros.length) {
      colegasDiv.innerHTML = outros
        .map((m) => `<button class="duelo-colega" data-uid="${m.uid}" data-nome="${(m.nome || "").replace(/"/g, "&quot;")}">⚔️ ${m.nome}</button>`)
        .join("");
    } else {
      colegasDiv.innerHTML = "<p class='vazio'>Nenhum colega na turma ainda.</p>";
    }

    const pendentes = await duelosPendentesPara(usuario.uid).catch(() => []);
    if (pendentes.length) {
      pendDiv.innerHTML = pendentes
        .map((d) => {
          const euJa = d.respostas && d.respostas[usuario.uid];
          const acao = euJa ? "Ver resultado" : "Aceitar e responder";
          return `<div class="duelo-item">
            <span>⚔️ Desafio de <strong>${d.criadorNome}</strong></span>
            <button class="btn-principal compacto duelo-abrir" data-id="${d.id}">${acao}</button>
          </div>`;
        })
        .join("");
    } else {
      pendDiv.innerHTML = "<p class='vazio'>Nenhum desafio no momento.</p>";
    }

    const meus = await duelosDoUsuario(usuario.uid).catch(() => []);
    if (meus.length) {
      meusDiv.innerHTML = meus
        .map((d) => {
          const status = d.status === "finalizado" ? "Finalizado" : "Aguardando oponente";
          return `<div class="duelo-item">
            <span>vs <strong>${d.oponenteNome}</strong> · ${status}</span>
            <button class="btn-secundario compacto duelo-abrir" data-id="${d.id}">Abrir</button>
          </div>`;
        })
        .join("");
    } else {
      meusDiv.innerHTML = "<p class='vazio'>Você ainda não desafiou ninguém.</p>";
    }
  } catch (e) {
    colegasDiv.innerHTML = `<p class='vazio'>Erro: ${e.message}</p>`;
  }
}

// Cria um desafio com 5 perguntas das áreas de dificuldade do desafiante
document.getElementById("duelo-colegas").addEventListener("click", async (e) => {
  const btn = e.target.closest(".duelo-colega");
  if (!btn) return;
  const oponente = { uid: btn.dataset.uid, nome: btn.dataset.nome };

  const pesos = pesosRoleta();
  const areas = [];
  ORDEM_ROLETA.forEach((a, i) => { for (let k = 0; k < pesos[i]; k++) areas.push(a); });

  const perguntas = [];
  const usadas = new Set();
  let tentativas = 0;
  while (perguntas.length < 5 && tentativas < 200) {
    tentativas++;
    const area = areas[Math.floor(Math.random() * areas.length)];
    const banco = bancoDePerguntas().filter((q) => q.area === area && !usadas.has(chaveQuestao(q)));
    if (!banco.length) continue;
    const q = prepararQuestao(banco[Math.floor(Math.random() * banco.length)]);
    usadas.add(chaveQuestao(q));
    perguntas.push(q);
  }
  if (perguntas.length < 5) {
    alert("Ainda não há perguntas suficientes para um duelo.");
    return;
  }

  try {
    await criarDuelo({
      turma: minhaTurma.codigo,
      criadorId: usuario.uid,
      criadorNome: usuario.nome,
      criadorFoto: usuario.foto || "",
      oponenteId: oponente.uid,
      oponenteNome: oponente.nome,
      oponenteFoto: "",
      perguntas,
    });
    alert(`Desafio enviado para ${oponente.nome}! Agora responda suas perguntas.`);
    renderDuelo();
  } catch (err) {
    alert("Erro ao criar duelo: " + err.message);
  }
});

// Abre um duelo existente (aceitar/responder/ver)
document.getElementById("duelo-pendentes").addEventListener("click", (e) => {
  const btn = e.target.closest(".duelo-abrir");
  if (!btn) return;
  abrirDueloJogo(btn.dataset.id);
});
document.getElementById("duelo-meus").addEventListener("click", (e) => {
  const btn = e.target.closest(".duelo-abrir");
  if (!btn) return;
  abrirDueloJogo(btn.dataset.id);
});

async function abrirDueloJogo(dueloId) {
  const duelo = await new Promise((resolve) => {
    const unsub = ouvirDuelo(dueloId, (d) => { unsub && unsub(); resolve(d); });
  });
  if (!duelo) return;

  const euJa = duelo.respostas && duelo.respostas[usuario.uid];
  if (duelo.status === "finalizado" || euJa) {
    mostrarResultadoDuelo(duelo);
    return;
  }

  dueloAtual = duelo;
  dueloQuestoes = duelo.perguntas || [];
  dueloIndice = 0;
  dueloRespostas = [];
  document.getElementById("duelo-conteudo").classList.add("escondido");
  document.getElementById("duelo-jogo").classList.remove("escondido");
  renderQuestaoDuelo();
}

function renderQuestaoDuelo() {
  const q = dueloQuestoes[dueloIndice];
  dueloRespondido = false;
  document.getElementById("duelo-placar").textContent =
    `Pergunta ${dueloIndice + 1} de ${dueloQuestoes.length} · Você acertou ${dueloRespostas.filter((x) => x).length}`;

  // Imagem de apoio (se houver)
  const imgDiv = document.getElementById("duelo-imagem");
  if (q.imagem) {
    imgDiv.innerHTML = q.imagem;
    exibir(imgDiv);
  } else {
    imgDiv.innerHTML = "";
    esconder(imgDiv);
  }

  // Texto de apoio (se houver)
  const apoioDiv = document.getElementById("duelo-apoio");
  if (q.apoio) {
    apoioDiv.textContent = q.apoio;
    exibir(apoioDiv);
  } else {
    apoioDiv.textContent = "";
    esconder(apoioDiv);
  }

  document.getElementById("duelo-enunciado").textContent = q.enunciado;
  const alts = document.getElementById("duelo-alternativas");
  alts.innerHTML = "";
  q.alternativas.forEach((texto, i) => {
    const b = document.createElement("button");
    b.className = "alt";
    b.innerHTML = `<span class="alt-letra">${LETRAS[i]}</span><span>${texto}</span>`;
    b.addEventListener("click", () => responderDuelo(i));
    alts.appendChild(b);
  });
  esconder(document.getElementById("duelo-feedback"));
}

async function responderDuelo(escolha) {
  if (dueloRespondido) return;
  dueloRespondido = true;
  const q = dueloQuestoes[dueloIndice];
  const acertou = escolha === q.correta;
  dueloRespostas.push(acertou ? 1 : 0);

  document.querySelectorAll("#duelo-alternativas .alt").forEach((b, i) => {
    b.classList.add("travada");
    if (i === q.correta) b.classList.add("correta");
    else if (i === escolha) b.classList.add("errada");
  });

  setTimeout(async () => {
    dueloIndice++;
    if (dueloIndice < dueloQuestoes.length) {
      renderQuestaoDuelo();
    } else {
      await terminarMinhasRespostas();
    }
  }, 900);
}

async function terminarMinhasRespostas() {
  try {
    await salvarRespostaDuelo(dueloAtual.id, usuario.uid, dueloRespostas);
    // Recarrega para ver se o outro já respondeu
    const atualizado = await new Promise((resolve) => {
      const unsub = ouvirDuelo(dueloAtual.id, (d) => { unsub && unsub(); resolve(d); });
    });
    await checarFinalizacao(atualizado);
    mostrarResultadoDuelo(atualizado);
  } catch (e) {
    alert("Erro ao enviar respostas: " + e.message);
  }
}

async function checarFinalizacao(duelo) {
  const r = duelo.respostas || {};
  if (!r[duelo.criadorId] || !r[duelo.oponenteId]) return duelo;
  const acC = r[duelo.criadorId].reduce((a, b) => a + b, 0);
  const acO = r[duelo.oponenteId].reduce((a, b) => a + b, 0);
  let vencedorId = null;
  if (acC > acO) vencedorId = duelo.criadorId;
  else if (acO > acC) vencedorId = duelo.oponenteId;
  if (duelo.status !== "finalizado") {
    await finalizarDuelo(duelo.id, vencedorId, { [duelo.criadorId]: acC, [duelo.oponenteId]: acO }).catch(() => {});
  }
  return { ...duelo, status: "finalizado", vencedorId, placar: { [duelo.criadorId]: acC, [duelo.oponenteId]: acO } };
}

async function mostrarResultadoDuelo(duelo) {
  duelo = await checarFinalizacao(duelo);
  const r = duelo.respostas || {};
  const acC = (r[duelo.criadorId] || []).reduce((a, b) => a + b, 0);
  const acO = (r[duelo.oponenteId] || []).reduce((a, b) => a + b, 0);
  const souCriador = duelo.criadorId === usuario.uid;
  const meus = souCriador ? acC : acO;
  const dele = souCriador ? acO : acC;
  const oponenteNome = souCriador ? duelo.oponenteNome : duelo.criadorNome;

  let msg;
  if (duelo.status === "finalizado" || duelo.vencedorId !== undefined) {
    if (duelo.vencedorId === usuario.uid) {
      msg = `🏆 Você venceu ${oponenteNome}! (${meus} x ${dele})`;
      // Premia só uma vez
      if (!duelo.premiado) {
        await premiarVencedor(duelo);
        const area = ORDEM_ROLETA[Math.floor(Math.random() * ORDEM_ROLETA.length)];
        const nova = await ganharFigurinha(area);
        if (nova) msg += ` Ganhou ${nova.emoji} ${nova.nome}!`;
      }
    } else if (duelo.vencedorId === null) {
      msg = `🤝 Empate com ${oponenteNome}! (${meus} x ${dele})`;
    } else {
      msg = `😅 ${oponenteNome} venceu desta vez. (${meus} x ${dele})`;
    }
  } else {
    msg = `Você respondeu ${meus} corretas. Aguardando ${oponenteNome} responder...`;
  }

  document.getElementById("duelo-placar").textContent = msg;
  document.getElementById("duelo-enunciado").textContent = "";
  document.getElementById("duelo-alternativas").innerHTML = "";
  const fb = document.getElementById("duelo-feedback");
  fb.className = "jogo-feedback ok";
  fb.innerHTML = `Volte ao jogo para girar a roleta e ganhar mais figurinhas!`;
  exibir(fb);
  document.getElementById("duelo-jogo").classList.remove("escondido");
  document.getElementById("duelo-conteudo").classList.add("escondido");
  renderAlbum();
}

// Marca o duelo como premiado (evita dar figurinha mais de uma vez)
async function premiarVencedor(duelo) {
  if (duelo.premiado) return;
  await firebase.firestore().collection("duelos").doc(duelo.id).update({ premiado: true }).catch(() => {});
}

// ============================================================
// NOTÍCIAS DO MEC + TEMAS DE REDAÇÃO
// ============================================================
const TEMAS_REDACAO = [
  { tema: "Educação e desigualdade social", eixo: "Cidadania" },
  { tema: "Inteligência artificial e o futuro do trabalho", eixo: "Tecnologia" },
  { tema: "Saúde mental dos jovens", eixo: "Saúde" },
  { tema: "Emergência climática e justiça ambiental", eixo: "Meio ambiente" },
  { tema: "Democratização do acesso à cultura", eixo: "Cultura" },
  { tema: "Segurança alimentar e combate à fome", eixo: "Direitos" },
  { tema: "Inclusão de pessoas com deficiência", eixo: "Direitos" },
  { tema: "Violência e cultura de paz nas escolas", eixo: "Educação" },
  { tema: "Desinformação e o direito à informação", eixo: "Comunicação" },
  { tema: "Valorização dos povos indígenas e tradicionais", eixo: "Cidadania" },
];

const ENEM_CONTEUDOS = {
  linguagens: {
    nome: "Linguagens, Códigos e suas Tecnologias",
    itens: [
      "Interpretação de texto",
      "Literatura brasileira",
      "Arte e patrimônio cultural",
      "Educação Física e cultura corporal",
      "Gramática e variação linguística",
      "Língua Inglesa ou Espanhola",
      "Redação (proposta de intervenção)",
    ],
  },
  humanas: {
    nome: "Ciências Humanas e suas Tecnologias",
    itens: [
      "História do Brasil e Geral",
      "Geografia (clima, urbanização, globalização)",
      "Filosofia",
      "Sociologia",
      "Atualidades e cidadania",
    ],
  },
  natureza: {
    nome: "Ciências da Natureza e suas Tecnologias",
    itens: [
      "Biologia (ecologia, genética, citologia, evolução)",
      "Física (mecânica, energia, eletricidade, ondas)",
      "Química (estequiometria, soluções, orgânica)",
      "Ciência, tecnologia e meio ambiente",
    ],
  },
  matematica: {
    nome: "Matemática e suas Tecnologias",
    itens: [
      "Aritmética e porcentagem",
      "Funções e gráficos",
      "Geometria plana e espacial",
      "Estatística e probabilidade",
      "Razão, proporção e grandezas",
    ],
  },
};

function renderEnemConteudos() {
  const div = document.getElementById("enem-conteudos");
  if (!div) return;
  div.innerHTML = Object.entries(ENEM_CONTEUDOS).map(([area, d]) => {
    const info = AREAS[area] || { icone: "", curto: area };
    return `
      <div class="enem-area">
        <span class="enem-area-nome">${info.icone} ${escaparHTML(info.curto)}</span>
        <ul>${d.itens.map((i) => `<li>${escaparHTML(i)}</li>`).join("")}</ul>
      </div>
    `;
  }).join("");
}

function abrirNoticias() {
  mostrarTela("tela-noticias");
  renderEnemConteudos();
  carregarNoticias();
}

async function carregarNoticias() {
  const lista = document.getElementById("noticias-lista");
  lista.innerHTML = "<p class='vazio'>Carregando notícias…</p>";
  try {
    const resp = await fetch("noticias.json?v=" + Date.now());
    const dados = await resp.json();
    window.__temasIA = dados.temasRedacao || [];
    const quando = dados.atualizadoEm
      ? new Date(dados.atualizadoEm).toLocaleString("pt-BR")
      : "—";
    document.getElementById("noticias-atualizado").textContent =
      `Atualizado em ${quando} · Fontes: ${(dados.fontes || ["MEC"]).join(" · ")}`;

    if (!dados.noticias || !dados.noticias.length) {
      lista.innerHTML = "<p class='vazio'>Nenhuma notícia disponível no momento.</p>";
    } else {
      lista.innerHTML = dados.noticias.map((n) => `
        <a class="noticia-item" href="${n.link}" target="_blank" rel="noopener">
          <span class="noticia-data">${n.fonte ? n.fonte + " · " : ""}${n.data || ""}</span>
          <span class="noticia-titulo">${escaparHTML(n.titulo)}</span>
          <span class="noticia-link">Ler a notícia ↗</span>
        </a>
      `).join("");
    }

    // Temas de redação: usa os gerados por IA; senão, os fixos
    if (dados.temasRedacao && dados.temasRedacao.length) {
      renderTemasIA(dados.temasRedacao);
    } else {
      renderTemasRedacao();
    }
  } catch (e) {
    lista.innerHTML = `<p class='vazio'>Erro ao carregar notícias: ${e.message}</p>`;
    renderTemasRedacao();
  }
}

function renderTemasIA(temas) {
  const div = document.getElementById("temas-redacao");
  div.innerHTML = temas.map((t) => {
    const motivadores = Array.isArray(t.textosMotivadores) ? t.textosMotivadores : [];
    const blocoMotivadores = motivadores.length
      ? `<details class="tema-motivadores">
           <summary>📄 Textos motivadores (${motivadores.length})</summary>
           ${motivadores.map((tx) => `<p class="texto-motivador">${escaparHTML(tx)}</p>`).join("")}
         </details>`
      : "";
    return `
      <div class="tema-card">
        <span class="tema-eixo">${escaparHTML(t.eixo || "Tema")}</span>
        <span class="tema-nome">${escaparHTML(t.tema)}</span>
        ${t.argumento ? `<span class="tema-argumento">${escaparHTML(t.argumento)}</span>` : ""}
        ${blocoMotivadores}
      </div>
    `;
  }).join("");
}

function renderTemasRedacao() {
  const div = document.getElementById("temas-redacao");
  div.innerHTML = TEMAS_REDACAO.map((t) => `
    <div class="tema-card">
      <span class="tema-eixo">${t.eixo}</span>
      <span class="tema-nome">${t.tema}</span>
    </div>
  `).join("");
}

document.getElementById("btn-noticias").addEventListener("click", abrirNoticias);
document.getElementById("btn-voltar-noticias").addEventListener("click", () => {
  if (usuario && usuario.papel === "professor") abrirPainelProfessor();
  else abrirInicioEstudante();
});

// ============================================================
// DESAFIO DE SÍNTESE (pesquisa 10 min + fala 1 min)
// ============================================================
const TEMAS_SINTESE = [
  "Redes sociais e saúde mental dos jovens",
  "Inteligência artificial na educação",
  "Mudanças climáticas e o futuro da Amazônia",
  "Desigualdade social no Brasil",
  "O papel da escola na formação cidadã",
  "Combate à desinformação",
  "Cultura e identidade brasileira",
  "Segurança pública e juventude",
  "Tecnologia e o futuro do trabalho",
  "Preservação dos povos indígenas",
  "Esporte como ferramenta de inclusão",
  "Alimentação saudável nas escolas",
  "Bullying e cultura de paz",
  "Economia circular e consumo consciente",
  "Leitura e o hábito de ler no Brasil",
  "Direitos da criança e do adolescente",
  "Mobilidade urbana nas cidades brasileiras",
];

const TEMPO_PESQUISA = 10 * 60;
const TEMPO_FALA = 60;
let sinteseTimer = null;
let sinteseSegundos = TEMPO_PESQUISA;

function abrirSintese() {
  pararTimerSintese();
  sinteseSegundos = TEMPO_PESQUISA;
  document.getElementById("sintese-tema").textContent = 'Clique em "Sortear tema" para começar';
  document.getElementById("sintese-timer").textContent = "10:00";
  document.getElementById("sintese-fase").textContent = "Fase de pesquisa";
  esconder(document.getElementById("btn-iniciar-sintese"));
  esconder(document.getElementById("btn-falar"));
  esconder(document.getElementById("btn-reiniciar-sintese"));
  exibir(document.getElementById("btn-sortear-tema"));
  mostrarTela("tela-sintese");
}

function pararTimerSintese() {
  if (sinteseTimer) { clearInterval(sinteseTimer); sinteseTimer = null; }
}

function formatarTempo(seg) {
  const m = Math.floor(seg / 60);
  const s = seg % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function sortearTema() {
  const ia = (window.__temasIA || []).map((t) => t.tema);
  const lista = TEMAS_SINTESE.concat(ia);
  const tema = lista[Math.floor(Math.random() * lista.length)];
  document.getElementById("sintese-tema").textContent = tema;
  document.getElementById("sintese-timer").textContent = "10:00";
  document.getElementById("sintese-fase").textContent = "Fase de pesquisa";
  exibir(document.getElementById("btn-iniciar-sintese"));
  esconder(document.getElementById("btn-sortear-tema"));
}

function rodarTimer(aoTerminar) {
  pararTimerSintese();
  document.getElementById("sintese-timer").textContent = formatarTempo(sinteseSegundos);
  sinteseTimer = setInterval(() => {
    sinteseSegundos--;
    document.getElementById("sintese-timer").textContent = formatarTempo(Math.max(0, sinteseSegundos));
    if (sinteseSegundos <= 0) {
      pararTimerSintese();
      if (aoTerminar) aoTerminar();
    }
  }, 1000);
}

document.getElementById("btn-sintese").addEventListener("click", abrirSintese);

document.getElementById("btn-sortear-tema").addEventListener("click", sortearTema);

document.getElementById("btn-iniciar-sintese").addEventListener("click", () => {
  sinteseSegundos = TEMPO_PESQUISA;
  document.getElementById("sintese-fase").textContent = "🔎 Fase de pesquisa (10 min)";
  esconder(document.getElementById("btn-iniciar-sintese"));
  exibir(document.getElementById("btn-falar"));
  rodarTimer(() => {
    document.getElementById("sintese-fase").textContent = "⏰ Tempo de pesquisa esgotado! Hora de falar.";
  });
});

document.getElementById("btn-falar").addEventListener("click", () => {
  sinteseSegundos = TEMPO_FALA;
  document.getElementById("sintese-fase").textContent = "🎤 Fale agora! (1 min)";
  esconder(document.getElementById("btn-falar"));
  rodarTimer(() => {
    document.getElementById("sintese-fase").textContent = "✅ Parabéns! Você completou o desafio de síntese.";
    exibir(document.getElementById("btn-reiniciar-sintese"));
  });
});

document.getElementById("btn-reiniciar-sintese").addEventListener("click", abrirSintese);
document.getElementById("btn-voltar-sintese").addEventListener("click", () => {
  pararTimerSintese();
  if (usuario && usuario.papel === "professor") abrirPainelProfessor();
  else abrirInicioEstudante();
});

// ============================================================
// CURRÍCULO (BNCC + ACRE) POR SÉRIE
// ============================================================
let curriculoSerie = "1ª";
let curriculoArea = "linguagens";

function abrirCurriculo() {
  renderCurriculo();
  mostrarTela("tela-curriculo");
}

document.getElementById("btn-curriculo").addEventListener("click", abrirCurriculo);
document.getElementById("btn-voltar-curriculo").addEventListener("click", () => {
  if (usuario && usuario.papel === "professor") abrirPainelProfessor();
  else abrirInicioEstudante();
});

document.querySelectorAll(".serie-btn").forEach((b) => {
  b.addEventListener("click", () => {
    curriculoSerie = b.dataset.serie;
    document.querySelectorAll(".serie-btn").forEach((x) => x.classList.toggle("ativa", x === b));
    renderCurriculo();
  });
});

document.querySelectorAll(".area-btn").forEach((b) => {
  b.addEventListener("click", () => {
    curriculoArea = b.dataset.area;
    document.querySelectorAll(".area-btn").forEach((x) => x.classList.toggle("ativa", x === b));
    renderCurriculo();
  });
});

function renderCurriculo() {
  const dados = CURRICULO[curriculoArea];
  if (!dados) return;
  const div = document.getElementById("curriculo-conteudo");

  const habilidades = dados.habilidades.filter((h) => h.series.includes(curriculoSerie));

  // Índice de códigos (chips separados)
  const chips = habilidades.map((h) => `<span class="hab-chip">${h.codigo}</span>`).join("");

  // Agrupa por competência
  const grupos = {};
  habilidades.forEach((h) => {
    (grupos[h.competencia] = grupos[h.competencia] || []).push(h);
  });
  const comps = Object.keys(grupos).map(Number).sort((a, b) => a - b);

  const gruposHtml = comps.map((n) => {
    const habs = grupos[n].map((h) => `
      <div class="hab-item">
        <span class="hab-codigo">${h.codigo}</span>
        <p class="hab-desc">${escaparHTML(h.descricao)}</p>
      </div>
    `).join("");
    return `
      <div class="comp-bloco">
        <div class="comp-cabeca">
          <span class="comp-num">Competência ${n}</span>
          <p class="comp-texto">${escaparHTML(dados.competencias[n - 1] || "")}</p>
        </div>
        <div class="hab-lista">${habs}</div>
      </div>
    `;
  }).join("");

  const temasHtml = dados.temasAcre.map((t) => `<li>${escaparHTML(t)}</li>`).join("");

  div.innerHTML = `
    <h3 class="secao-titulo">${dados.nome} · ${curriculoSerie} série</h3>

    <p class="curriculo-info">${habilidades.length} habilidade(s) nesta série. Os códigos EM13 valem para as três séries do Ensino Médio; a distribuição por série é uma sugestão.</p>

    <h4 class="curriculo-sub">🔖 Códigos desta série</h4>
    <div class="hab-chips">${chips || "<p class='vazio'>—</p>"}</div>

    <h4 class="curriculo-sub">🎯 Competências e habilidades</h4>
    ${gruposHtml || "<p class='vazio'>—</p>"}

    <h4 class="curriculo-sub">🌳 Temas regionais do Acre</h4>
    <ul class="temas-acre">${temasHtml}</ul>
  `;
}

// ============================================================
// REVISÃO COM IA (PROFESSOR)
// ============================================================
const CHAVE_IA = "nina_gemini_key";
if (window.pdfjsLib) {
  pdfjsLib.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
}

function abrirRevisao() {
  document.getElementById("revisao-chave").value = localStorage.getItem(CHAVE_IA) || "";
  esconder(document.getElementById("revisao-aviso"));
  esconder(document.getElementById("revisao-resultado"));
  mostrarTela("tela-revisao");
}

document.getElementById("btn-ir-revisao").addEventListener("click", abrirRevisao);
document.getElementById("btn-voltar-revisao").addEventListener("click", abrirPainelProfessor);

async function extrairTextoArquivo(file) {
  const nome = file.name.toLowerCase();
  if (nome.endsWith(".txt") || nome.endsWith(".md")) return await file.text();
  if (nome.endsWith(".pdf")) {
    const buf = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: buf }).promise;
    let texto = "";
    const max = Math.min(pdf.numPages, 30);
    for (let i = 1; i <= max; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      texto += content.items.map((it) => it.str).join(" ") + "\n";
    }
    return texto;
  }
  if (nome.endsWith(".docx")) {
    const buf = await file.arrayBuffer();
    const res = await mammoth.extractRawText({ arrayBuffer: buf });
    return res.value;
  }
  throw new Error("Formato não suportado. Use PDF, Word (.docx) ou texto (.txt).");
}

document.getElementById("btn-gerar-revisao").addEventListener("click", async () => {
  const aviso = document.getElementById("revisao-aviso");
  const btn = document.getElementById("btn-gerar-revisao");
  const chave = document.getElementById("revisao-chave").value.trim();
  const input = document.getElementById("revisao-arquivo");
  const arquivos = input.files ? Array.from(input.files) : [];

  if (!chave) {
    aviso.className = "aviso erro";
    aviso.textContent = "Cole a chave da IA (Gemini).";
    exibir(aviso);
    return;
  }
  if (!arquivos.length) {
    aviso.className = "aviso erro";
    aviso.textContent = "Selecione um ou mais arquivos (PDF, Word ou texto).";
    exibir(aviso);
    return;
  }
  localStorage.setItem(CHAVE_IA, chave);
  btn.disabled = true;
  btn.textContent = "⏳ Processando...";

  try {
    aviso.className = "aviso ok";
    let texto = "";
    for (let i = 0; i < arquivos.length; i++) {
      aviso.textContent = `📖 Lendo arquivo ${i + 1} de ${arquivos.length}: ${arquivos[i].name}...`;
      exibir(aviso);
      const t = await extrairTextoArquivo(arquivos[i]);
      if (t) texto += `\n\n### Arquivo: ${arquivos[i].name}\n${t}`;
    }
    if (!texto || texto.trim().length < 50) throw new Error("Não consegui ler o texto dos arquivos.");

    aviso.textContent = `🤖 Gerando mapa conceitual, revisão e atividade a partir de ${arquivos.length} arquivo(s)... (pode levar alguns segundos)`;
    const resultado = await chamarIARevisao(chave, texto.replace(/\s+/g, " ").slice(0, 20000));
    renderRevisao(resultado);
    esconder(aviso);
  } catch (e) {
    aviso.className = "aviso erro";
    aviso.textContent = "Erro: " + e.message;
    exibir(aviso);
  } finally {
    btn.disabled = false;
    btn.textContent = "✨ Gerar revisão";
  }
});

async function chamarIARevisao(chave, texto) {
  const prompt = `Você é um professor do Ensino Médio. A partir do conteúdo abaixo, produza uma revisão didática para os estudantes.
Responda em JSON puro, no formato:
{
  "mapa": [{"conceito":"conceito principal","relacoes":["relação com outro conceito","..."]}],
  "revisao": ["tópico essencial 1","tópico 2"],
  "flashcards": [{"conceito":"termo ou pergunta curta","explicacao":"explicação clara em 1 ou 2 frases"}],
  "atividade": [{"pergunta":"...","resposta":"..."}]
}
Inclua de 6 a 10 conceitos no mapa, 5 a 8 tópicos na revisão, de 6 a 10 flash cards (um lado o conceito, o outro a explicação) e 5 questões na atividade (com gabarito).
Nos flash cards, o "conceito" deve ser curto (máx. 60 caracteres) e a "explicacao" deve ser objetiva e completa.

Conteúdo:
${texto}`;

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${chave}`;
  const corpo = JSON.stringify({
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: { maxOutputTokens: 4000 },
  });

  let ultimoStatus = null;
  // Até 4 tentativas (a IA pode estar sobrecarregada — erro 503)
  for (let tentativa = 1; tentativa <= 4; tentativa++) {
    let resp;
    try {
      resp = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: corpo });
    } catch (e) {
      ultimoStatus = "rede";
      await new Promise((r) => setTimeout(r, 1500 * tentativa));
      continue;
    }
    if (resp.ok) {
      const data = await resp.json();
      let t = (data?.candidates?.[0]?.content?.parts || []).map((p) => p.text || "").join("");
      t = t.replace(/```json|```/g, "").trim();
      const i = t.indexOf("{");
      const f = t.lastIndexOf("}");
      if (i >= 0 && f > i) t = t.slice(i, f + 1);
      return JSON.parse(t);
    }
    ultimoStatus = resp.status;
    // 503 (sobrecarregada) e 429 (limite) merecem nova tentativa
    if (resp.status === 503 || resp.status === 429 || resp.status === 500) {
      await new Promise((r) => setTimeout(r, 2000 * tentativa));
      continue;
    }
    throw new Error("IA retornou erro " + resp.status);
  }
  throw new Error("A IA está sobrecarregada no momento. Aguarde alguns instantes e tente novamente.");
}

// Monta os flash cards (um lado o conceito, o outro a explicação)
function montarFlashcards(lista) {
  return (lista || []).map((f, i) => {
    const conceito = f.conceito || f.frente || "";
    const explicacao = f.explicacao || f.verso || "";
    if (!conceito && !explicacao) return "";
    return `<button class="flash-card" data-flash="${i}" type="button">
      <span class="flash-num">${i + 1}</span>
      <span class="flash-conteudo">
        <span class="flash-frente">${escaparHTML(conceito)}</span>
        <span class="flash-verso escondido">${escaparHTML(explicacao)}</span>
      </span>
      <span class="flash-dica">toque para virar 🔄</span>
    </button>`;
  }).join("");
}

// Vira o flash card ao clicar
document.addEventListener("click", (e) => {
  const card = e.target.closest(".flash-card");
  if (!card) return;
  const frente = card.querySelector(".flash-frente");
  const verso = card.querySelector(".flash-verso");
  const virado = !card.classList.contains("virado");
  card.classList.toggle("virado", virado);
  if (frente) frente.classList.toggle("escondido", virado);
  if (verso) verso.classList.toggle("escondido", !virado);
});

let revisaoAtual = null;

// Envia o feedback do professor para o estudante (nas atividades)
document.addEventListener("click", async (e) => {
  const btn = e.target.closest(".feedback-enviar");
  if (!btn) return;
  const item = btn.closest(".rank-item");
  const input = item ? item.querySelector(".feedback-input") : null;
  const texto = input ? input.value.trim() : "";
  try {
    await salvarComentarioQuiz(btn.dataset.atividade, btn.dataset.aluno, texto);
    mostrarToast("Feedback enviado ao estudante! ✅");
  } catch (err) {
    mostrarToast("Erro ao enviar: " + err.message, "erro");
  }
});

async function renderRevisao(r) {
  revisaoAtual = r;
  const div = document.getElementById("revisao-resultado");
  const mapa = (r.mapa || []).map((m) => `
    <div class="mapa-conceito">
      <span class="mapa-conceito-nome">${escaparHTML(m.conceito)}</span>
      <ul>${(m.relacoes || []).map((x) => `<li>${escaparHTML(x)}</li>`).join("")}</ul>
    </div>
  `).join("");
  const revisao = (r.revisao || []).map((x) => `<li>${escaparHTML(x)}</li>`).join("");
  const flashcardsHtml = montarFlashcards(r.flashcards);
  const atividade = (r.atividade || []).map((a, i) => `
    <div class="ativ-item">
      <p class="ativ-pergunta"><strong>${i + 1}.</strong> ${escaparHTML(a.pergunta)}</p>
      <details><summary>Ver resposta</summary><p>${escaparHTML(a.resposta)}</p></details>
    </div>
  `).join("");

  // Turmas do professor
  let turmas = [];
  try { turmas = await listarTurmasDoProfessor(usuario.uid); } catch {}
  const turmasHtml = turmas.length
    ? turmas.map((t) => `
        <label class="turma-check">
          <input type="checkbox" class="revisao-turma-check" value="${t.codigo}">
          <span>${escaparHTML(t.nome)} <small>(${t.codigo})</small></span>
        </label>`).join("")
    : "<p class='vazio'>Você ainda não criou turmas. Crie uma turma para publicar revisões.</p>";

  div.innerHTML = `
    <div class="painel-bloco">
      <h3 class="secao-titulo">🧠 Mapa conceitual</h3>
      <div class="mapa-lista">${mapa || "<p class='vazio'>—</p>"}</div>
    </div>
    <div class="painel-bloco">
      <h3 class="secao-titulo">📖 Revisão</h3>
      <ul class="revisao-lista">${revisao || "<li>—</li>"}</ul>
    </div>
    <div class="painel-bloco">
      <h3 class="secao-titulo">🃏 Flash cards</h3>
      <p class="texto-ajuda">Um lado traz o <strong>conceito</strong>, o outro a <strong>explicação</strong>. Clique para virar.</p>
      <div class="flash-lista">${flashcardsHtml || "<p class='vazio'>—</p>"}</div>
    </div>
    <div class="painel-bloco">
      <h3 class="secao-titulo">✍️ Atividade de fixação</h3>
      <div class="ativ-lista">${atividade || "<p class='vazio'>—</p>"}</div>
    </div>
    <div class="painel-bloco">
      <h3 class="secao-titulo">📢 Publicar para as turmas</h3>
      <div class="campo">
        <label class="perfil-rotulo" for="revisao-titulo-input">Título da revisão</label>
        <input id="revisao-titulo-input" type="text" maxlength="80" placeholder="Ex.: Modernismo — Arte">
      </div>
      <div class="campo">
        <label class="perfil-rotulo" for="revisao-tipo">Organizar como</label>
        <select id="revisao-tipo">
          <option value="atividade">📋 Atividade (entrega / avaliação)</option>
          <option value="exercicio">✏️ Exercício (treino e revisão)</option>
        </select>
      </div>
      <div class="turmas-checks">${turmasHtml}</div>
      <div id="revisao-pub-aviso" class="aviso escondido"></div>
      <button class="btn-principal" id="btn-publicar-revisao">📢 Publicar para as turmas selecionadas</button>
    </div>
    <button class="btn-secundario" id="btn-imprimir-revisao">🖨️ Imprimir / salvar em PDF</button>
  `;
  document.getElementById("btn-imprimir-revisao").addEventListener("click", () => window.print());
  document.getElementById("btn-publicar-revisao").addEventListener("click", publicarRevisaoAtual);
  div.classList.remove("escondido");
  div.scrollIntoView({ behavior: "smooth" });
}

async function publicarRevisaoAtual() {
  const aviso = document.getElementById("revisao-pub-aviso");
  const marcadas = Array.from(document.querySelectorAll(".revisao-turma-check:checked")).map((c) => c.value);
  if (!marcadas.length) {
    aviso.className = "aviso erro";
    aviso.textContent = "Selecione pelo menos uma turma.";
    exibir(aviso);
    return;
  }
  const titulo = (document.getElementById("revisao-titulo-input").value.trim()) || "Revisão";
  const campoTipo = document.getElementById("revisao-tipo");
  const tipo = campoTipo ? campoTipo.value : "atividade";
  try {
    await publicarRevisao(usuario, {
      titulo,
      tipo,
      mapa: revisaoAtual.mapa || [],
      revisao: revisaoAtual.revisao || [],
      flashcards: revisaoAtual.flashcards || [],
      atividade: revisaoAtual.atividade || [],
      turmas: marcadas,
    });
    aviso.className = "aviso ok";
    aviso.textContent = `✅ Revisão publicada para ${marcadas.length} turma(s)! Os estudantes já podem ver.`;
    exibir(aviso);
  } catch (e) {
    aviso.className = "aviso erro";
    aviso.textContent = "Erro ao publicar: " + e.message;
    exibir(aviso);
  }
}

// ============================================================
// REVISÕES DA TURMA (ALUNO)
// ============================================================
async function abrirRevisoes() {
  const div = document.getElementById("revisoes-lista");
  mostrarTela("tela-revisoes");
  div.innerHTML = "<p class='vazio'>Carregando revisões…</p>";
  try {
    let revisoes = [];
    if (usuario.papel === "professor") {
      revisoes = await listarRevisoesDoProfessor(usuario.uid);
    } else if (codigosDasMinhasTurmas().length) {
      revisoes = await listarRevisoesDasTurmas(codigosDasMinhasTurmas());
    }
    if (!revisoes.length) {
      div.innerHTML = `<p class='vazio'>${usuario.papel === "professor" ? "Você ainda não publicou revisões." : "Nenhuma revisão publicada para sua turma ainda."}</p>`;
      return;
    }
    revisoes.sort((a, b) => (b.ms || 0) - (a.ms || 0));
    div.innerHTML = revisoes.map(renderRevisaoCard).join("");
    // Carrega as respostas dos alunos (para revisões do professor) e as minhas (para o aluno)
    carregarRespostasAlunos();
    carregarMinhasRespostas();
  } catch (e) {
    div.innerHTML = `<p class='vazio'>Erro ao carregar: ${e.message}</p>`;
  }
}

function renderRevisaoCard(r) {
  // Considera "professor" quem tem o papel OU quem é o dono da revisão
  const ehProf = usuario.papel === "professor" || (r.professorId && r.professorId === usuario.uid);
  const mapa = (r.mapa || []).map((m) => `
    <div class="mapa-conceito">
      <span class="mapa-conceito-nome">${escaparHTML(m.conceito)}</span>
      <ul>${(m.relacoes || []).map((x) => `<li>${escaparHTML(x)}</li>`).join("")}</ul>
    </div>`).join("");
  const revisao = (r.revisao || []).map((x) => `<li>${escaparHTML(x)}</li>`).join("");
  const flashcardsHtml = montarFlashcards(r.flashcards);
  const tipoBadge = r.tipo === "exercicio" ? "✏️ Exercício" : "📋 Atividade";

  const atividade = (r.atividade || []).map((a, i) => {
    if (ehProf) {
      return `
        <div class="ativ-item">
          <p class="ativ-pergunta"><strong>${i + 1}.</strong> ${escaparHTML(a.pergunta)}</p>
          <div class="ativ-gabarito"><strong>Gabarito:</strong> ${escaparHTML(a.resposta)}</div>
        </div>`;
    }
    return `
      <div class="ativ-item" data-revisao="${r.id}" data-index="${i}">
        <p class="ativ-pergunta"><strong>${i + 1}.</strong> ${escaparHTML(a.pergunta)}</p>
        <textarea class="ativ-resposta-aluno" rows="2" placeholder="Escreva sua resposta e envie para ver o gabarito..."></textarea>
        <button class="ativ-enviar" disabled>📤 Enviar resposta</button>
        <div class="ativ-gabarito escondido"><strong>Gabarito:</strong> ${escaparHTML(a.resposta)}</div>
        <div class="ativ-comentario-prof escondido"></div>
      </div>`;
  }).join("");

  const blocoRespostas = ehProf
    ? `<h4 class="curriculo-sub">🧑🏽‍🎓 Respostas dos estudantes</h4>
       <div class="respostas-contador" data-revisao="${r.id}"></div>
       <div class="respostas-alunos" data-revisao="${r.id}"><p class="vazio">Carregando…</p></div>`
    : "";

  return `
    <details class="revisao-card">
      <summary>📖 ${escaparHTML(r.titulo || "Revisão")} <small>· ${escaparHTML(r.professorNome || "")}</small> <span class="tipo-badge">${tipoBadge}</span></summary>
      <div class="revisao-card-corpo">
        <h4 class="curriculo-sub">🧠 Mapa conceitual</h4>
        <div class="mapa-lista">${mapa || "<p class='vazio'>—</p>"}</div>
        <h4 class="curriculo-sub">📖 Revisão</h4>
        <ul class="revisao-lista">${revisao || "<li>—</li>"}</ul>
        ${flashcardsHtml ? `
          <h4 class="curriculo-sub">🃏 Flash cards</h4>
          <p class="texto-ajuda">Um lado traz o <strong>conceito</strong>, o outro a <strong>explicação</strong>. Toque para virar.</p>
          <div class="flash-lista">${flashcardsHtml}</div>` : ""}
        <h4 class="curriculo-sub">✍️ Atividade</h4>
        <div class="ativ-lista">${atividade || "<p class='vazio'>—</p>"}</div>
        ${blocoRespostas}
      </div>
    </details>
  `;
}

// Carrega as respostas dos alunos (visão do professor) + contador + comentários
async function carregarRespostasAlunos() {
  const blocos = document.querySelectorAll(".respostas-alunos");
  for (const bloco of blocos) {
    const revisaoId = bloco.dataset.revisao;
    const contador = document.querySelector(`.respostas-contador[data-revisao="${revisaoId}"]`);
    try {
      const respostas = await listarRespostasDaRevisao(revisaoId);

      // Contador de quantos alunos responderam
      if (contador) {
        contador.innerHTML = `✅ <strong>${respostas.length}</strong> estudante(s) responderam esta atividade.`;
        contador.classList.remove("escondido");
      }

      if (!respostas.length) {
        bloco.innerHTML = "<p class='vazio'>Nenhum estudante respondeu ainda.</p>";
        continue;
      }

      bloco.innerHTML = respostas.map((resp) => {
        const itens = Object.entries(resp.respostas || {})
          .sort((a, b) => Number(a[0]) - Number(b[0]))
          .map(([idx, txt]) => {
            const comentario = (resp.comentarios || {})[idx] || "";
            return `
              <div class="resp-item">
                <p><strong>${Number(idx) + 1}.</strong> ${escaparHTML(txt)}</p>
                <div class="resp-comentario">
                  <input class="resp-comentario-input" data-resposta="${resp.id}" data-index="${idx}" value="${escaparHTML(comentario)}" placeholder="Comentar / devolver para o aluno...">
                  <button class="resp-comentario-btn" data-resposta="${resp.id}" data-index="${idx}">💬 Enviar</button>
                </div>
              </div>`;
          })
          .join("");
        return `
          <div class="resp-aluno">
            <span class="resp-aluno-nome">🧑🏽‍🎓 ${escaparHTML(resp.alunoNome || "Estudante")}</span>
            ${itens || "<p class='vazio'>Sem respostas.</p>"}
          </div>`;
      }).join("");
    } catch (e) {
      bloco.innerHTML = `<p class='vazio'>Erro: ${e.message}</p>`;
    }
  }
}

// Carrega as respostas do próprio aluno (pré-preenche e mostra comentários do professor)
async function carregarMinhasRespostas() {
  const itens = document.querySelectorAll(".ativ-item[data-revisao]");
  for (const item of itens) {
    const revisaoId = item.dataset.revisao;
    const idx = item.dataset.index;
    try {
      const minha = await buscarMinhaResposta(revisaoId, usuario.uid);
      if (!minha) continue;
      const txt = (minha.respostas || {})[idx];
      if (txt) {
        const ta = item.querySelector(".ativ-resposta-aluno");
        const btn = item.querySelector(".ativ-enviar");
        const gab = item.querySelector(".ativ-gabarito");
        ta.value = txt;
        ta.disabled = true;
        btn.disabled = true;
        btn.textContent = "✅ Resposta enviada";
        gab.classList.remove("escondido");
        const comentario = (minha.comentarios || {})[idx];
        if (comentario) {
          const c = item.querySelector(".ativ-comentario-prof");
          c.innerHTML = `<strong>💬 Comentário do professor:</strong> ${escaparHTML(comentario)}`;
          c.classList.remove("escondido");
        }
      }
    } catch {}
  }
}

document.getElementById("btn-revisoes").addEventListener("click", abrirRevisoes);
document.getElementById("btn-voltar-revisoes").addEventListener("click", () => {
  if (usuario && usuario.papel === "professor") abrirPainelProfessor();
  else abrirInicioEstudante();
});

// O aluno só vê o gabarito depois de ENVIAR a própria resposta
document.getElementById("revisoes-lista").addEventListener("input", (e) => {
  const ta = e.target.closest(".ativ-resposta-aluno");
  if (!ta) return;
  const item = ta.closest(".ativ-item");
  const btn = item && item.querySelector(".ativ-enviar");
  if (btn) btn.disabled = ta.value.trim().length < 3;
});

document.getElementById("revisoes-lista").addEventListener("click", async (e) => {
  // Enviar resposta do aluno
  const enviar = e.target.closest(".ativ-enviar");
  if (enviar) {
    if (enviar.disabled) return;
    const item = enviar.closest(".ativ-item");
    const texto = (item.querySelector(".ativ-resposta-aluno").value || "").trim();
    enviar.disabled = true;
    enviar.textContent = "⏳ Enviando...";
    try {
      await salvarRespostaAtividade(item.dataset.revisao, usuario, minhaTurma && minhaTurma.codigo, item.dataset.index, texto);
      item.querySelector(".ativ-gabarito").classList.remove("escondido");
      item.querySelector(".ativ-resposta-aluno").disabled = true;
      enviar.textContent = "✅ Resposta enviada";
    } catch (err) {
      enviar.disabled = false;
      enviar.textContent = "📤 Enviar resposta";
      alert("Não foi possível enviar sua resposta: " + err.message);
    }
    return;
  }

  // Comentário do professor
  const comentar = e.target.closest(".resp-comentario-btn");
  if (comentar) {
    const input = document.querySelector(`.resp-comentario-input[data-resposta="${comentar.dataset.resposta}"][data-index="${comentar.dataset.index}"]`);
    const texto = (input.value || "").trim();
    comentar.disabled = true;
    comentar.textContent = "⏳";
    try {
      await salvarComentarioAtividade(comentar.dataset.resposta, comentar.dataset.index, texto);
      comentar.textContent = "✅ Enviado";
    } catch (err) {
      comentar.disabled = false;
      comentar.textContent = "💬 Enviar";
      alert("Erro ao enviar comentário: " + err.message);
    }
  }
});

// ============================================================
// MENU (mostra/esconde os botões) + INÍCIO
// ============================================================
document.getElementById("btn-menu").addEventListener("click", () => {
  const m = document.getElementById("menu-extra");
  if (m.classList.contains("escondido")) exibir(m);
  else esconder(m);
});

// Fecha o menu ao clicar em qualquer botão de dentro
document.getElementById("menu-extra").addEventListener("click", (e) => {
  if (e.target.closest("button")) esconder(document.getElementById("menu-extra"));
});

document.getElementById("btn-inicio").addEventListener("click", () => {
  esconder(document.getElementById("menu-extra"));
  if (usuario && usuario.papel === "professor") abrirPainelProfessor();
  else abrirInicioEstudante();
});

// ============================================================
// ATIVIDADES (PROFESSOR CRIA · ALUNO RESPONDE · ESTATÍSTICAS)
// ============================================================
let atividadeJogoAtual = null;
let atividadeIndice = 0;
let atividadeRespostas = [];
let atividadeRespondido = false;
let atividadesCache = [];

// ---------- PROFESSOR ----------
async function abrirAtividadesProf() {
  esconder(document.getElementById("ativ-aviso"));
  document.getElementById("lista-atividades-prof").innerHTML = "<p class='vazio'>Carregando…</p>";

  // Pré-seleciona a área e mostra a disciplina do professor
  const info = document.getElementById("ativ-prof-info");
  if (info) {
    info.textContent = usuario.area && AREAS[usuario.area]
      ? `Sua área: ${AREAS[usuario.area].curto}${usuario.disciplina ? " · " + usuario.disciplina : ""}`
      : "";
  }
  const tituloInput = document.getElementById("ativ-titulo");
  if (tituloInput && usuario.disciplina) tituloInput.placeholder = `Ex.: ${usuario.disciplina} — Revisão`;

  mostrarTela("tela-atividades-prof");
  await renderTurmasAtividade();
  await carregarAtividadesProf();
}

async function renderTurmasAtividade() {
  const div = document.getElementById("ativ-turmas");
  try {
    const turmas = await listarTurmasDoProfessor(usuario.uid);
    div.innerHTML = turmas.length
      ? turmas.map((t) => `<label class="turma-check"><input type="checkbox" class="ativ-turma-check" value="${t.codigo}"> <span>${escaparHTML(t.nome)} <small>(${t.codigo})</small></span></label>`).join("")
      : "<p class='vazio'>Você ainda não criou turmas.</p>";
  } catch {
    div.innerHTML = "<p class='vazio'>Erro ao carregar turmas.</p>";
  }
}

document.getElementById("btn-ir-atividades").addEventListener("click", abrirAtividadesProf);
document.getElementById("btn-voltar-atividades").addEventListener("click", abrirPainelProfessor);

let ativModo = "banco";
document.querySelectorAll(".modo-opcao").forEach((b) => {
  b.addEventListener("click", () => {
    ativModo = b.dataset.modo;
    document.querySelectorAll(".modo-opcao").forEach((x) => x.classList.toggle("ativa", x === b));
    if (ativModo === "banco") {
      exibir(document.getElementById("ativ-campos-banco"));
      esconder(document.getElementById("ativ-campos-ia"));
    } else {
      esconder(document.getElementById("ativ-campos-banco"));
      exibir(document.getElementById("ativ-campos-ia"));
    }
  });
});

document.getElementById("btn-criar-atividade").addEventListener("click", async () => {
  const aviso = document.getElementById("ativ-aviso");
  const btn = document.getElementById("btn-criar-atividade");
  const titulo = (document.getElementById("ativ-titulo").value.trim()) || "Atividade";
  const turmas = Array.from(document.querySelectorAll(".ativ-turma-check:checked")).map((c) => c.value);

  if (!turmas.length) {
    aviso.className = "aviso erro";
    aviso.textContent = "Selecione pelo menos uma turma.";
    exibir(aviso);
    return;
  }

  btn.disabled = true;
  btn.textContent = "⏳ Gerando...";
  try {
    let perguntas = [];
    let area = usuario.area || "todas";
    let serie = "todas";

    if (ativModo === "banco") {
      const nivel = parseInt(document.getElementById("ativ-nivel").value, 10);
      const qtd = Math.max(1, Math.min(20, parseInt(document.getElementById("ativ-qtd").value, 10) || 5));
      serie = document.getElementById("ativ-serie").value;
      area = usuario.area || "todas";

      const todas = bancoDePerguntas();
      const ids = new Set();
      const banco = [];
      const adicionar = (lista) => {
        for (const q of lista) {
          const k = chaveQuestao(q);
          if (!ids.has(k)) { ids.add(k); banco.push(q); }
        }
      };
      const daSerie = (q) => serie === "todas" || serieDaQuestao(q) === serie;
      const doNivel = (q) => nivel === 0 || nivelDaQuestao(q) === nivel;

      if (usuario.disciplina) {
        // SOMENTE a disciplina do professor (sem misturar outras)
        adicionar(todas.filter((q) => disciplinaDaQuestao(q) === usuario.disciplina && daSerie(q) && doNivel(q)));
        adicionar(todas.filter((q) => disciplinaDaQuestao(q) === usuario.disciplina && daSerie(q)));
        adicionar(todas.filter((q) => disciplinaDaQuestao(q) === usuario.disciplina));
      } else {
        // Sem disciplina definida: usa a área do professor
        adicionar(todas.filter((q) => (area === "todas" || q.area === area) && daSerie(q) && doNivel(q)));
        adicionar(todas.filter((q) => (area === "todas" || q.area === area) && daSerie(q)));
        adicionar(todas.filter((q) => area === "todas" || q.area === area));
      }

      if (!banco.length) {
        throw new Error(
          usuario.disciplina
            ? `Ainda não há questões de ${usuario.disciplina} no banco. Use o modo "Com IA" com um material.`
            : "Não há questões com esse filtro."
        );
      }
      embaralhar(banco);
      perguntas = banco.slice(0, qtd).map(prepararQuestao);
    } else {
      // Modo IA: gera a partir do material enviado
      const chave = document.getElementById("ativ-chave").value.trim() || localStorage.getItem(CHAVE_IA) || "";
      const arquivos = Array.from(document.getElementById("ativ-arquivo").files || []);
      const qtd = Math.max(1, Math.min(15, parseInt(document.getElementById("ativ-qtd-ia").value, 10) || 5));
      if (!chave) throw new Error("Cole a chave da IA (Gemini).");
      if (!arquivos.length) throw new Error("Envie um ou mais arquivos do material.");
      localStorage.setItem(CHAVE_IA, chave);

      aviso.className = "aviso ok";
      aviso.textContent = "📖 Lendo o material...";
      exibir(aviso);
      let texto = "";
      for (const arq of arquivos) {
        aviso.textContent = `📖 Lendo ${arq.name}...`;
        texto += "\n\n### " + arq.name + "\n" + (await extrairTextoArquivo(arq));
      }
      aviso.textContent = "🤖 Gerando questões com a IA...";
      perguntas = await gerarQuestoesIA(chave, texto.replace(/\s+/g, " ").slice(0, 20000), qtd, usuario.disciplina, area);
    }

    await criarAtividade(usuario, {
      titulo,
      tipo: (document.getElementById("ativ-tipo") || {}).value || "atividade",
      area,
      serie,
      disciplina: usuario.disciplina || null,
      perguntas,
      turmas,
    });
    aviso.className = "aviso ok";
    const pedidas = ativModo === "banco"
      ? parseInt(document.getElementById("ativ-qtd").value, 10) || 5
      : parseInt(document.getElementById("ativ-qtd-ia").value, 10) || 5;
    aviso.textContent =
      `✅ Atividade "${titulo}" com ${perguntas.length} questão(ões) enviada para ${turmas.length} turma(s)!` +
      (perguntas.length < pedidas
        ? ` ⚠️ Você pediu ${pedidas}, mas só havia ${perguntas.length} de ${usuario.disciplina || "sua área"} no banco. Use o modo "Com IA" para gerar mais.`
        : "");
    exibir(aviso);
    document.getElementById("ativ-titulo").value = "";
    await carregarAtividadesProf();
  } catch (e) {
    aviso.className = "aviso erro";
    aviso.textContent = "Erro: " + e.message;
    exibir(aviso);
  } finally {
    btn.disabled = false;
    btn.textContent = "📋 Criar e enviar para as turmas";
  }
});

// Gera questões com IA a partir de um material (com texto de apoio)
async function gerarQuestoesIA(chave, texto, qtd, disciplina, area) {
  const prompt = `Você é um professor de ${disciplina || "Ensino Médio"}. Crie ${qtd} questões de múltipla escolha para estudantes do Ensino Médio, baseadas no material abaixo.
Cada questão DEVE ter um texto de apoio ("apoio") com dados, fatos, leis ou citações que ajudem o estudante a interpretar.
Responda em JSON puro, no formato:
{"questoes":[{"apoio":"texto de apoio","enunciado":"pergunta","alternativas":["A","B","C","D","E"],"correta":0,"explicacao":"por que a correta está certa"}]}
A "correta" é o índice (0 a 4) da alternativa correta.

Material:
${texto}`;

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${chave}`;
  const corpo = JSON.stringify({
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: { maxOutputTokens: 5000 },
  });

  for (let tentativa = 1; tentativa <= 4; tentativa++) {
    let resp;
    try {
      resp = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: corpo });
    } catch {
      await new Promise((r) => setTimeout(r, 1500 * tentativa));
      continue;
    }
    if (resp.ok) {
      const data = await resp.json();
      let t = (data?.candidates?.[0]?.content?.parts || []).map((p) => p.text || "").join("");
      t = t.replace(/```json|```/g, "").trim();
      const i = t.indexOf("{");
      const f = t.lastIndexOf("}");
      if (i >= 0 && f > i) t = t.slice(i, f + 1);
      const parsed = JSON.parse(t);
      const questoes = (parsed.questoes || []).filter((q) => q.enunciado && Array.isArray(q.alternativas) && q.alternativas.length >= 4);
      if (!questoes.length) throw new Error("A IA não gerou questões válidas.");
      return questoes.map((q, idx) => ({
        id: "ia_" + Date.now() + "_" + idx,
        area: area && area !== "todas" ? area : (usuario.area || "linguagens"),
        disciplina: disciplina || null,
        tema: disciplina || "Atividade",
        apoio: q.apoio || "",
        enunciado: q.enunciado,
        alternativas: q.alternativas,
        correta: typeof q.correta === "number" ? q.correta : 0,
        explicacao: q.explicacao || "",
      }));
    }
    if (resp.status === 503 || resp.status === 429 || resp.status === 500) {
      await new Promise((r) => setTimeout(r, 2000 * tentativa));
      continue;
    }
    throw new Error("IA retornou erro " + resp.status);
  }
  throw new Error("A IA está sobrecarregada. Tente novamente em instantes.");
}

async function carregarAtividadesProf() {
  const div = document.getElementById("lista-atividades-prof");
  try {
    const atividades = await listarAtividadesDoProfessor(usuario.uid);
    if (!atividades.length) {
      div.innerHTML = "<p class='vazio'>Você ainda não criou atividades.</p>";
      return;
    }
    div.innerHTML = atividades.map((a) => {
      const questoesHtml = (a.perguntas || []).map((q, i) => `
        <div class="ativ-item">
          <p class="ativ-pergunta"><strong>${i + 1}.</strong> ${escaparHTML(q.enunciado)}</p>
          ${q.apoio ? `<div class="apoio">${escaparHTML(q.apoio)}</div>` : ""}
          <div class="ativ-gabarito"><strong>Gabarito:</strong> ${LETRAS[q.correta] || "?"}) ${escaparHTML((q.alternativas && q.alternativas[q.correta]) || "")}</div>
        </div>
      `).join("");
      return `
        <details class="revisao-card">
          <summary>
            📋 ${escaparHTML(a.titulo)}
            <small>· ${(a.perguntas || []).length} questões${a.serie && a.serie !== "todas" ? " · " + a.serie + " série" : ""} · ${(a.turmas || []).length} turma(s)</small>
            <button class="ativ-excluir" data-id="${a.id}" title="Excluir atividade">🗑️ Excluir</button>
          </summary>
          <div class="revisao-card-corpo">
            <h4 class="curriculo-sub">📝 Questões</h4>
            <div class="ativ-lista">${questoesHtml || "<p class='vazio'>Sem questões.</p>"}</div>
            <h4 class="curriculo-sub">📊 Estatísticas por turma</h4>
            <div class="ativ-stats" data-atividade="${a.id}"><p class="vazio">Carregando…</p></div>
          </div>
        </details>
      `;
    }).join("");

    // Botões de excluir
    div.querySelectorAll(".ativ-excluir").forEach((btn) => {
      btn.addEventListener("click", async (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (!confirm("Excluir esta atividade? Os estudantes não verão mais.")) return;
        try {
          await excluirAtividade(btn.dataset.id);
          await carregarAtividadesProf();
        } catch (err) {
          alert("Erro ao excluir: " + err.message);
        }
      });
    });

    // Estatísticas
    for (const a of atividades) {
      const alvo = div.querySelector(`.ativ-stats[data-atividade="${a.id}"]`);
      if (alvo) carregarEstatisticasAtividade(a, alvo);
    }
  } catch (e) {
    div.innerHTML = `<p class='vazio'>Erro: ${e.message}</p>`;
  }
}

async function carregarEstatisticasAtividade(atividade, corpo) {
  try {
    const respostas = await listarRespostasQuiz(atividade.id);
    if (!respostas.length) {
      corpo.innerHTML = "<p class='vazio'>Nenhum estudante respondeu ainda.</p>";
      return;
    }
    // Agrupa por turma
    const porTurma = {};
    respostas.forEach((r) => {
      const t = r.turma || "—";
      (porTurma[t] = porTurma[t] || []).push(r);
    });

    let html = "";
    for (const [turma, lista] of Object.entries(porTurma)) {
      lista.sort((a, b) => (b.acertos || 0) - (a.acertos || 0));
      const media = Math.round(lista.reduce((s, r) => s + (r.total ? (r.acertos / r.total) * 100 : 0), 0) / lista.length);
      const perfeitos = lista.filter((r) => r.total && r.acertos === r.total).length;
      html += `<h4 class="curriculo-sub">👥 Turma ${escaparHTML(turma)} · média ${media}% · ${perfeitos} com ⭐</h4>`;
      html += `<div class="ranking">`;
      html += lista.map((r, i) => {
        const pct = r.total ? Math.round((r.acertos / r.total) * 100) : 0;
        const medalha = i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : i + 1 + "º";
        const estrela = r.total && r.acertos === r.total ? " ⭐" : "";
        return `<div class="rank-item"><span class="rank-pos">${medalha}</span><div class="rank-info"><div class="rank-nome">${escaparHTML(r.alunoNome)}${estrela}</div><div class="rank-areas">${r.acertos}/${r.total} acertos</div>
          <div class="feedback-box">
            <input class="feedback-input" type="text" maxlength="300" placeholder="Escreva um feedback para o estudante..." value="${escaparHTML(r.comentario || "")}">
            <button class="btn-secundario compacto feedback-enviar" data-atividade="${atividade.id}" data-aluno="${r.alunoId}">💬 Enviar</button>
          </div>
        </div><span class="rank-pct">${pct}%</span></div>`;
      }).join("");
      html += `</div>`;
    }
    corpo.innerHTML = html;
  } catch (e) {
    corpo.innerHTML = `<p class='vazio'>Erro: ${e.message}</p>`;
  }
}

// ---------- ALUNO ----------
async function abrirAtividadesAluno() {
  const div = document.getElementById("atividades-aluno-lista");
  esconder(document.getElementById("ativ-jogo"));
  div.classList.remove("escondido");
  mostrarTela("tela-atividades-aluno");
  div.innerHTML = "<p class='vazio'>Carregando atividades…</p>";
  try {
    let atividades = [];
    if (codigosDasMinhasTurmas().length) {
      atividades = await listarAtividadesDasTurmas(codigosDasMinhasTurmas());
    }
    if (!atividades.length) {
      div.innerHTML = "<p class='vazio'>Nenhuma atividade para sua turma ainda.</p>";
      return;
    }
    const minhas = await listarRespostasQuizDoAluno(usuario.uid).catch(() => []);
    const feitas = {};
    minhas.forEach((r) => (feitas[r.atividadeId] = r));
    atividadesCache = atividades;

    const cardAtividade = (a) => {
      const feita = feitas[a.id];
      const pct = feita && feita.total ? Math.round((feita.acertos / feita.total) * 100) : null;
      const estrela = pct === 100 ? " ⭐" : "";
      return `<div class="atividade-card">
        <div class="atividade-info">
          <strong>${escaparHTML(a.titulo)}</strong>
          <small>${(a.perguntas || []).length} questões · ${escaparHTML(a.professorNome || "")}</small>
          ${feita ? `<span class="atividade-feita">✅ Feita: ${feita.acertos}/${feita.total} (${pct}%)${estrela}</span>` : ""}
          ${feita && feita.comentario ? `<div class="feedback-prof">💬 <strong>Feedback da professora:</strong> ${escaparHTML(feita.comentario)}</div>` : ""}
        </div>
        <button class="btn-principal compacto ativ-responder" data-id="${a.id}" ${feita ? "disabled" : ""}>${feita ? "Respondida" : "Responder"}</button>
      </div>`;
    };

    const listaAtividades = atividades.filter((a) => a.tipo !== "exercicio");
    const listaExercicios = atividades.filter((a) => a.tipo === "exercicio");
    let htmlLista = "";
    if (listaAtividades.length) {
      htmlLista += `<h4 class="curriculo-sub">📋 Atividades</h4>` + listaAtividades.map(cardAtividade).join("");
    }
    if (listaExercicios.length) {
      htmlLista += `<h4 class="curriculo-sub">✏️ Exercícios</h4>` + listaExercicios.map(cardAtividade).join("");
    }
    div.innerHTML = htmlLista || "<p class='vazio'>Nenhuma atividade para sua turma ainda.</p>";
  } catch (e) {
    div.innerHTML = `<p class='vazio'>Erro: ${e.message}</p>`;
  }
}

document.getElementById("btn-voltar-atividades-aluno").addEventListener("click", () => {
  if (usuario.papel === "professor") abrirPainelProfessor();
  else abrirInicioEstudante();
});

document.getElementById("atividades-aluno-lista").addEventListener("click", (e) => {
  const btn = e.target.closest(".ativ-responder");
  if (!btn || btn.disabled) return;
  const a = atividadesCache.find((x) => x.id === btn.dataset.id);
  if (a) iniciarAtividade(a);
});

function iniciarAtividade(a) {
  atividadeJogoAtual = a;
  atividadeIndice = 0;
  atividadeRespostas = [];
  document.getElementById("atividades-aluno-lista").classList.add("escondido");
  document.getElementById("ativ-jogo").classList.remove("escondido");
  renderAtividadeQuestao();
}

function renderAtividadeQuestao() {
  const q = atividadeJogoAtual.perguntas[atividadeIndice];
  atividadeRespondido = false;
  document.getElementById("ativ-jogo-titulo").textContent =
    `Questão ${atividadeIndice + 1} de ${atividadeJogoAtual.perguntas.length}`;

  const imgDiv = document.getElementById("ativ-jogo-imagem");
  if (q.imagem) { imgDiv.innerHTML = q.imagem; exibir(imgDiv); }
  else { imgDiv.innerHTML = ""; esconder(imgDiv); }

  const apoioDiv = document.getElementById("ativ-jogo-apoio");
  if (q.apoio) { apoioDiv.textContent = q.apoio; exibir(apoioDiv); }
  else { apoioDiv.textContent = ""; esconder(apoioDiv); }

  document.getElementById("ativ-jogo-enunciado").textContent = q.enunciado;
  const alts = document.getElementById("ativ-jogo-alternativas");
  alts.innerHTML = "";
  q.alternativas.forEach((texto, i) => {
    const b = document.createElement("button");
    b.className = "alt";
    b.innerHTML = `<span class="alt-letra">${LETRAS[i]}</span><span>${texto}</span>`;
    b.addEventListener("click", () => responderAtividade(i));
    alts.appendChild(b);
  });
  esconder(document.getElementById("ativ-jogo-feedback"));
}

function responderAtividade(escolha) {
  if (atividadeRespondido) return;
  atividadeRespondido = true;
  const q = atividadeJogoAtual.perguntas[atividadeIndice];
  const acertou = escolha === q.correta;
  atividadeRespostas.push({ escolha, acertou });

  document.querySelectorAll("#ativ-jogo-alternativas .alt").forEach((b, i) => {
    b.classList.add("travada");
    if (i === q.correta) b.classList.add("correta");
    else if (i === escolha) b.classList.add("errada");
  });
  const fb = document.getElementById("ativ-jogo-feedback");
  fb.className = "jogo-feedback " + (acertou ? "ok" : "erro");
  fb.innerHTML = acertou ? "✅ Acertou!" : "❌ Não foi essa.";
  exibir(fb);

  setTimeout(() => {
    atividadeIndice++;
    if (atividadeIndice < atividadeJogoAtual.perguntas.length) renderAtividadeQuestao();
    else finalizarAtividade();
  }, 900);
}

async function finalizarAtividade() {
  const total = atividadeJogoAtual.perguntas.length;
  const acertos = atividadeRespostas.filter((r) => r.acertou).length;
  const respostasMap = {};
  atividadeRespostas.forEach((r, i) => (respostasMap[i] = r.escolha));
  const perfeito = acertos === total;

  try {
    await salvarRespostaQuiz(atividadeJogoAtual.id, usuario, minhaTurma && minhaTurma.codigo, respostasMap, acertos, total, atividadeJogoAtual.titulo);
    if (perfeito) await ganharEstrela();
  } catch {}

  const fb = document.getElementById("ativ-jogo-feedback");
  fb.className = "jogo-feedback " + (perfeito ? "ok" : "erro");
  fb.innerHTML = perfeito
    ? `🏆 <strong>Parabéns! Você acertou TODAS as ${total} questões e ganhou uma ⭐ estrela de bonificação!</strong>`
    : `Você acertou <strong>${acertos} de ${total}</strong> (${Math.round((acertos / total) * 100)}%). Tente de novo depois!`;
  exibir(fb);

  document.getElementById("ativ-jogo-alternativas").innerHTML = "";
  document.getElementById("ativ-jogo-enunciado").textContent = "";
  esconder(document.getElementById("ativ-jogo-imagem"));
  esconder(document.getElementById("ativ-jogo-apoio"));
  document.getElementById("ativ-jogo-titulo").textContent = "Resultado";
  setTimeout(() => abrirAtividadesAluno(), 3000);
}

// Botão do menu
document.getElementById("btn-atividades").addEventListener("click", () => {
  if (usuario.papel === "professor") abrirAtividadesProf();
  else abrirAtividadesAluno();
});

// ============================================================
// ÁREA E DISCIPLINA DO PROFESSOR
// ============================================================
const DISCIPLINAS = {
  linguagens: ["Arte", "Língua Portuguesa", "Literatura", "Educação Física", "Língua Inglesa", "Língua Espanhola"],
  humanas: ["História", "Geografia", "Filosofia", "Sociologia"],
  natureza: ["Biologia", "Física", "Química"],
  matematica: ["Matemática"],
};

let areaEscolhida = null;
let disciplinaEscolhida = null;
const SERIES_ENSINO = ["1ª", "2ª", "3ª"];
let seriesEscolhidas = [];

// Padroniza o código da escola (ex.: "eefm ac 01" -> "EEFM-AC-01")
function normalizarEscola(txt) {
  return (txt || "").trim().toUpperCase().replace(/\s+/g, "-");
}

function abrirEscolhaArea() {
  areaEscolhida = usuario.area || null;
  disciplinaEscolhida = usuario.disciplina || null;
  seriesEscolhidas = Array.isArray(usuario.series) ? usuario.series.slice() : [];
  document.getElementById("prof-escola").value = usuario.escola || "";
  renderAreaOpcoes();
  renderDisciplinaOpcoes();
  renderSeriesOpcoes();
  esconder(document.getElementById("area-aviso"));
  mostrarTela("tela-area-professor");
}

function renderSeriesOpcoes() {
  const div = document.getElementById("series-opcoes");
  div.innerHTML = SERIES_ENSINO.map((s) => `
    <button class="disciplina-opcao ${seriesEscolhidas.includes(s) ? "ativa" : ""}" data-serie="${s}">${s} série</button>
  `).join("");
  div.querySelectorAll(".disciplina-opcao").forEach((b) => {
    b.addEventListener("click", () => {
      const s = b.dataset.serie;
      if (seriesEscolhidas.includes(s)) seriesEscolhidas = seriesEscolhidas.filter((x) => x !== s);
      else seriesEscolhidas.push(s);
      renderSeriesOpcoes();
    });
  });
}

function renderAreaOpcoes() {
  const div = document.getElementById("area-opcoes");
  div.innerHTML = Object.entries(AREAS).map(([chave, a]) => `
    <button class="area-opcao ${areaEscolhida === chave ? "ativa" : ""}" data-area="${chave}">
      <span class="area-opcao-icone">${a.icone}</span>
      <span class="area-opcao-nome">${escaparHTML(a.curto)}</span>
      <span class="area-opcao-desc">${escaparHTML(a.nome)}</span>
    </button>
  `).join("");
  div.querySelectorAll(".area-opcao").forEach((b) => {
    b.addEventListener("click", () => {
      areaEscolhida = b.dataset.area;
      disciplinaEscolhida = null;
      renderAreaOpcoes();
      renderDisciplinaOpcoes();
    });
  });
}

function renderDisciplinaOpcoes() {
  const campo = document.getElementById("disciplina-campo");
  const div = document.getElementById("disciplina-opcoes");
  if (!areaEscolhida) { campo.classList.add("escondido"); return; }
  campo.classList.remove("escondido");
  const lista = DISCIPLINAS[areaEscolhida] || [];
  div.innerHTML = lista.map((d) => `
    <button class="disciplina-opcao ${disciplinaEscolhida === d ? "ativa" : ""}" data-disciplina="${escaparHTML(d)}">${escaparHTML(d)}</button>
  `).join("");
  div.querySelectorAll(".disciplina-opcao").forEach((b) => {
    b.addEventListener("click", () => {
      disciplinaEscolhida = b.dataset.disciplina;
      renderDisciplinaOpcoes();
    });
  });
}

document.getElementById("btn-salvar-area").addEventListener("click", async () => {
  const aviso = document.getElementById("area-aviso");
  const escola = normalizarEscola(document.getElementById("prof-escola").value);
  if (!areaEscolhida || !disciplinaEscolhida) {
    aviso.className = "aviso erro";
    aviso.textContent = "Escolha a área e a disciplina.";
    exibir(aviso);
    return;
  }
  if (!escola) {
    aviso.className = "aviso erro";
    aviso.textContent = "Informe o código da escola (ex.: EEFM-AC-01).";
    exibir(aviso);
    return;
  }
  if (!seriesEscolhidas.length) {
    aviso.className = "aviso erro";
    aviso.textContent = "Escolha pelo menos uma série que você dá aula.";
    exibir(aviso);
    return;
  }
  usuario.area = areaEscolhida;
  usuario.disciplina = disciplinaEscolhida;
  usuario.escola = escola;
  usuario.series = seriesEscolhidas.slice();
  await salvarUsuario(usuario.uid, {
    area: areaEscolhida,
    disciplina: disciplinaEscolhida,
    escola,
    series: seriesEscolhidas.slice(),
  }).catch(() => {});
  abrirPainelProfessor();
});

// ============================================================
// SIMULADO ENEM (questões reais da API pública enem.dev)
// ============================================================
const SIM_AREAS = [
  { id: "linguagens", nome: "Linguagens", icone: "📖", cor: "#1b7ea6" },
  { id: "ciencias-humanas", nome: "Humanas", icone: "🌍", cor: "#fbd000" },
  { id: "ciencias-natureza", nome: "Natureza", icone: "🧪", cor: "#43b047" },
  { id: "matematica", nome: "Matemática", icone: "📐", cor: "#e52521" },
];
const SIM_ANO = 2023;
const SIM_POR_AREA = 10; // metade aproximada de cada área (ajustável)

const REDACOES_ENEM = [
  {
    tema: "Desafios para o enfrentamento da invisibilidade do trabalho de cuidado realizado pela mulher no Brasil",
    motivadores: [
      "O trabalho de cuidado — cuidar de crianças, idosos e da casa — é realizado majoritariamente por mulheres e muitas vezes não é reconhecido nem remunerado.",
      "Segundo o IBGE, as mulheres dedicam quase o dobro do tempo dos homens aos afazeres domésticos e ao cuidado de pessoas.",
      "A Constituição de 1988 garante a igualdade entre homens e mulheres, mas a divisão desigual do trabalho de cuidado ainda persiste.",
    ],
  },
  {
    tema: "Democratização do acesso ao cinema no Brasil",
    motivadores: [
      "O cinema é uma manifestação cultural e um direito previsto no artigo 215 da Constituição, que garante o acesso à cultura.",
      "Grande parte dos municípios brasileiros não possui sala de cinema, o que limita o acesso à produção audiovisual.",
      "A Lei Paulo Gustavo (2022) destinou recursos emergenciais ao setor cultural, afetado pela pandemia.",
    ],
  },
  {
    tema: "Caminhos para combater a desinformação no Brasil",
    motivadores: [
      "As fake news se espalham rapidamente nas redes sociais e afetam a saúde pública, a democracia e a convivência social.",
      "A educação midiática — saber checar fontes e identificar notícias falsas — é uma ferramenta essencial de cidadania.",
      "O Marco Civil da Internet (2014) estabelece princípios para o uso da internet no Brasil, incluindo a responsabilidade e a transparência.",
    ],
  },
];

let simIdioma = null;
let simQuestoesENEM = [];
let simOrdemIndex = 0;
let simAreaAtual = null;
let simFila = [];
let simIndice = 0;
let simRespostas = [];
let simRespondido = false;
let simPorArea = {};

function abrirSimulado() {
  simIdioma = null;
  simQuestoesENEM = [];
  simOrdemIndex = 0;
  simRespostas = [];
  simPorArea = {};
  document.querySelectorAll(".idioma-opcao").forEach((b) => b.classList.remove("ativa"));
  exibir(document.getElementById("simulado-idioma"));
  esconder(document.getElementById("simulado-roleta-wrap"));
  esconder(document.getElementById("simulado-questoes"));
  esconder(document.getElementById("simulado-redacao"));
  esconder(document.getElementById("simulado-resultado"));
  mostrarTela("tela-simulado");
}

document.getElementById("btn-simulado").addEventListener("click", abrirSimulado);
document.getElementById("btn-voltar-simulado").addEventListener("click", () => {
  if (usuario && usuario.papel === "professor") abrirPainelProfessor();
  else abrirInicioEstudante();
});

document.querySelectorAll(".idioma-opcao").forEach((b) => {
  b.addEventListener("click", async () => {
    simIdioma = b.dataset.idioma;
    document.querySelectorAll(".idioma-opcao").forEach((x) => x.classList.toggle("ativa", x === b));
    await carregarQuestoesSimulado();
  });
});

async function carregarQuestoesSimulado() {
  const aviso = document.getElementById("simulado-idioma");
  const info = aviso.querySelector(".dica") || aviso;
  info.textContent = "⏳ Carregando questões do ENEM...";
  try {
    // A API limita 50 por página — busca em páginas, em vários anos
    let todas = [];
    for (const ano of ENEM_ANOS) {
      for (let offset = 0; offset < 250; offset += 50) {
        const r = await fetch(`https://api.enem.dev/v1/exams/${ano}/questions?limit=50&offset=${offset}`);
        if (!r.ok) break;
        const data = await r.json();
        const qs = (data.questions || []).map((q) => ({ ...q, year: q.year || ano }));
        todas = todas.concat(qs);
        if (!data.metadata || !data.metadata.hasMore || qs.length < 50) break;
      }
    }
    simQuestoesENEM = todas;
    if (!simQuestoesENEM.length) throw new Error("Não foi possível carregar as questões.");

    // Monta a fila por área (metade de cada, respeitando a língua em Linguagens)
    simPorArea = {};
    SIM_AREAS.forEach((a) => {
      let qs = simQuestoesENEM.filter((q) => q.discipline === a.id);
      if (a.id === "linguagens" && simIdioma) {
        qs = qs.filter((q) => !q.language || q.language === simIdioma);
      }
      embaralhar(qs);
      simPorArea[a.id] = qs.slice(0, SIM_POR_AREA);
    });
    esconder(document.getElementById("simulado-idioma"));
    renderRoletaSimulado();
    exibir(document.getElementById("simulado-roleta-wrap"));
    document.getElementById("sim-roleta-info").textContent =
      `Ordem oficial: ${SIM_AREAS.map((a) => a.nome).join(" → ")}`;
  } catch (e) {
    info.textContent = "Erro ao carregar: " + e.message;
  }
}

function renderRoletaSimulado() {
  const face = document.getElementById("sim-roleta-face");
  const n = SIM_AREAS.length;
  const passo = 360 / n;
  const partes = SIM_AREAS.map((a, i) => `${a.cor} ${i * passo}deg ${(i + 1) * passo}deg`);
  face.style.background = `conic-gradient(${partes.join(", ")})`;
}

document.getElementById("btn-sim-girar").addEventListener("click", () => {
  if (simOrdemIndex >= SIM_AREAS.length) return;
  const btn = document.getElementById("btn-sim-girar");
  btn.disabled = true;
  btn.textContent = "🎡 Girando...";

  // A roleta para na área da vez (seguindo a ordem oficial)
  const idx = simOrdemIndex;
  const alvo = (360 - (idx * (360 / SIM_AREAS.length) + 360 / SIM_AREAS.length / 2) + 360) % 360;
  const roleta = document.getElementById("sim-roleta");
  const atual = parseFloat(roleta.dataset.rot || "0");
  const novo = atual + 5 * 360 + (((alvo - (atual % 360)) % 360) + 360) % 360;
  roleta.dataset.rot = novo;
  roleta.style.transform = `rotate(${novo}deg)`;

  setTimeout(() => {
    btn.disabled = false;
    btn.textContent = "🎡 Girar a roleta";
    const area = SIM_AREAS[idx];
    simAreaAtual = area;
    simFila = simPorArea[area.id] || [];
    simIndice = 0;
    if (!simFila.length) {
      // sem questões nessa área: pula
      simOrdemIndex++;
      if (simOrdemIndex >= SIM_AREAS.length) abrirRedacaoSimulado();
      return;
    }
    esconder(document.getElementById("simulado-roleta-wrap"));
    exibir(document.getElementById("simulado-questoes"));
    renderQuestaoSimulado();
  }, 4000);
});

// Converte o markdown simples das questões do ENEM em HTML (imagens e negrito)
function renderApoioSimulado(texto) {
  let t = escaparHTML(texto || "");
  // imagens: ![alt](url)
  t = t.replace(
    /!\[[^\]]*\]\((https?:\/\/[^)]+)\)/g,
    '<img src="$1" alt="" referrerpolicy="no-referrer" style="max-width:100%;height:auto;margin:8px 0;border:2px solid #14142b;border-radius:6px">'
  );
  // links markdown: [texto](url)
  t = t.replace(/\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
  // negrito
  t = t.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  // quebras de linha
  t = t.replace(/\n/g, "<br>");
  return t;
}

function renderQuestaoSimulado() {
  const q = simFila[simIndice];
  simRespondido = false;
  const area = simAreaAtual;
  document.getElementById("sim-area-tag").textContent = `${area.icone} ${area.nome}`;
  document.getElementById("sim-contagem").textContent =
    `${simIndice + 1}/${simFila.length} · ${simRespostas.filter((r) => r.acertou).length} acertos`;
  document.getElementById("sim-progresso-fill").style.width = `${(simIndice / simFila.length) * 100}%`;

  const ctx = q.context || "";
  const temImagemNoCtx = /!\[[^\]]*\]\(/.test(ctx);

  // Imagens soltas (só quando o contexto não traz imagem em markdown)
  const imgDiv = document.getElementById("sim-imagem");
  const arquivos = Array.isArray(q.files) ? q.files : [];
  if (!temImagemNoCtx && arquivos.length) {
    imgDiv.innerHTML = arquivos.map((u) => `<img src="${u}" alt="" referrerpolicy="no-referrer" style="width:100%;height:auto">`).join("");
    exibir(imgDiv);
  } else {
    imgDiv.innerHTML = "";
    esconder(imgDiv);
  }

  // Texto de apoio (com imagens em markdown renderizadas)
  const apoioDiv = document.getElementById("sim-apoio");
  if (ctx) {
    apoioDiv.innerHTML = renderApoioSimulado(ctx);
    exibir(apoioDiv);
  } else {
    apoioDiv.innerHTML = "";
    esconder(apoioDiv);
  }

  document.getElementById("sim-enunciado").innerHTML =
    renderApoioSimulado(q.alternativesIntroduction || "Analise as alternativas e escolha a correta.");

  const alts = document.getElementById("sim-alternativas");
  alts.innerHTML = "";
  (q.alternatives || []).forEach((a, i) => {
    const b = document.createElement("button");
    b.className = "alt";
    b.innerHTML = `<span class="alt-letra">${a.letter || LETRAS[i]}</span><span>${renderApoioSimulado(a.text || "")}${a.file ? `<img src="${a.file}" referrerpolicy="no-referrer" style="max-width:100%;height:auto;margin-top:6px" alt="">` : ""}</span>`;
    b.addEventListener("click", () => responderSimulado(i, a));
    alts.appendChild(b);
  });

  esconder(document.getElementById("sim-feedback"));
  esconder(document.getElementById("btn-sim-proxima"));
}

function responderSimulado(i, alternativa) {
  if (simRespondido) return;
  simRespondido = true;
  const q = simFila[simIndice];
  const acertou = !!(alternativa && (alternativa.isCorrect || alternativa.letter === q.correctAlternative));
  simRespostas.push({ area: simAreaAtual.id, acertou });

  document.querySelectorAll("#sim-alternativas .alt").forEach((b, idx) => {
    b.classList.add("travada");
    const alt = (q.alternatives || [])[idx];
    if (alt && (alt.isCorrect || alt.letter === q.correctAlternative)) b.classList.add("correta");
    else if (idx === i) b.classList.add("errada");
  });

  const fb = document.getElementById("sim-feedback");
  fb.className = "feedback " + (acertou ? "ok" : "nao");
  fb.innerHTML = acertou ? "<strong>✅ Acertou!</strong>" : "<strong>❌ Não foi essa.</strong>";
  exibir(fb);

  const btn = document.getElementById("btn-sim-proxima");
  btn.textContent = simIndice + 1 < simFila.length ? "Próxima →" : "Concluir área →";
  exibir(btn);
}

document.getElementById("btn-sim-proxima").addEventListener("click", () => {
  simIndice++;
  if (simIndice < simFila.length) {
    renderQuestaoSimulado();
  } else {
    // Concluiu a área: volta para a roleta da próxima
    simOrdemIndex++;
    esconder(document.getElementById("simulado-questoes"));
    if (simOrdemIndex >= SIM_AREAS.length) {
      abrirRedacaoSimulado();
    } else {
      exibir(document.getElementById("simulado-roleta-wrap"));
      const proxima = SIM_AREAS[simOrdemIndex];
      document.getElementById("sim-roleta-info").textContent = `Próxima área: ${proxima.icone} ${proxima.nome}`;
    }
  }
});

function abrirRedacaoSimulado() {
  const r = REDACOES_ENEM[Math.floor(Math.random() * REDACOES_ENEM.length)];
  document.getElementById("sim-redacao-tema").textContent = r.tema;
  document.getElementById("sim-redacao-motivadores").innerHTML =
    "<h4 class='curriculo-sub'>📄 Textos motivadores</h4>" +
    r.motivadores.map((t) => `<p class="texto-motivador">${escaparHTML(t)}</p>`).join("");
  window.__simRedacaoTema = r.tema;
  esconder(document.getElementById("simulado-roleta-wrap"));
  esconder(document.getElementById("simulado-questoes"));
  exibir(document.getElementById("simulado-redacao"));
}

document.getElementById("btn-sim-finalizar").addEventListener("click", () => {
  const arq = document.getElementById("sim-redacao-arquivo").files;
  const temRedacao = arq && arq.length > 0;
  mostrarResultadoSimulado(temRedacao);
});

function mostrarResultadoSimulado(temRedacao) {
  const porArea = {};
  SIM_AREAS.forEach((a) => (porArea[a.id] = { total: 0, acertos: 0 }));
  simRespostas.forEach((r) => {
    if (porArea[r.area]) {
      porArea[r.area].total++;
      if (r.acertou) porArea[r.area].acertos++;
    }
  });

  const total = simRespostas.length;
  const acertos = simRespostas.filter((r) => r.acertou).length;
  const pct = total ? Math.round((acertos / total) * 100) : 0;
  const estimativa = Math.round((acertos / total) * 1000) || 0;

  const barras = SIM_AREAS.map((a) => {
    const s = porArea[a.id];
    if (!s.total) return "";
    const p = Math.round((s.acertos / s.total) * 100);
    return `<div class="barra-item">
      <div class="barra-topo"><strong>${a.icone} ${a.nome}</strong><span>${s.acertos}/${s.total} · ${p}%</span></div>
      <div class="barra-track"><div class="barra-fill" style="width:${p}%;background:${a.cor}"></div></div>
    </div>`;
  }).join("");

  const div = document.getElementById("simulado-resultado");
  div.innerHTML = `
    <div class="resultado-header">
      <h2>Resultado do Simulado</h2>
      <p>ENEM ${ENEM_ANOS[ENEM_ANOS.length - 1]}–${ENEM_ANOS[0]} · Língua: ${simIdioma === "espanhol" ? "Espanhol" : "Inglês"}</p>
    </div>
    <div class="score-geral">
      <div class="score-circulo" style="--pct:${pct}%"><span>${pct}%</span></div>
      <p>Você acertou <strong>${acertos} de ${total}</strong> questões objetivas.</p>
    </div>
    <div class="painel-bloco">
      <h3 class="secao-titulo">📊 Desempenho por área</h3>
      <div class="barras">${barras || "<p class='vazio'>—</p>"}</div>
    </div>
    <div class="painel-bloco">
      <h3 class="secao-titulo">🎯 Estimativa de nota</h3>
      <p class="texto-ajuda">Nota estimada nas objetivas: <strong>${estimativa} pontos</strong> (de 1000).</p>
      <p class="texto-ajuda">${temRedacao ? "📎 Sua redação foi anexada! A correção detalhada (por competência) pode ser feita pela IA ou pelo professor." : "Você não anexou a redação desta vez."}</p>
      <p class="texto-ajuda">Tema da redação: <em>${escaparHTML(window.__simRedacaoTema || "")}</em></p>
    </div>
    <div class="resultado-acoes">
      <button class="btn-principal" onclick="abrirSimulado()">🔁 Fazer outro simulado</button>
    </div>
  `;
  esconder(document.getElementById("simulado-redacao"));
  exibir(div);
  div.scrollIntoView({ behavior: "smooth" });
}

// ============================================================
// BIBLIOTECA — estante virtual
// Clássicos e modernos: Wikisource (domínio público)
// Artigos: Wikipédia (textos de estudo)
// ============================================================
const ESTANTES = [
  {
    id: "regional-artigos",
    nome: "🌳 Regional — Artigos em destaque",
    desc: "Artigos escolhidos das revistas da UFAC: teatro acreano, arte indígena, racismo ambiental e educação antirracista.",
    cor: "#2e7d32",
    unidade: "artigo",
    itens: [
      { titulo: "Breve histórico do teatro de grupo no Acre", autor: "Elderson Melo · TXAI", genero: "Teatro acreano", url: "https://periodicos.ufac.br/index.php/txai/article/view/5164" },
      { titulo: "Atuações da Federação de Teatro do Acre – FETAC", autor: "Maiara Pinho · TXAI", genero: "Teatro acreano", url: "https://periodicos.ufac.br/index.php/txai/article/view/5175" },
      { titulo: "Teatro político a partir das histórias de mulheres indígenas", autor: "Annie Martins · TXAI", genero: "Teatro indígena", url: "https://periodicos.ufac.br/index.php/txai/article/view/5163" },
      { titulo: "A presença indígena em circuitos de arte: Urutau Guajajara e Potyra Kricati", autor: "Flavia Meireles · TXAI", genero: "Arte indígena", url: "https://periodicos.ufac.br/index.php/txai/article/view/5167" },
      { titulo: "Encenações do invisível: performance e o silenciamento da presença negra", autor: "Adelmar Santos de Araújo · TXAI", genero: "Performance e memória negra", url: "https://periodicos.ufac.br/index.php/txai/article/view/8832" },
      { titulo: "Diálogo entre o Teatro do Sentenciado de Abdias do Nascimento e a Rede Escrevivências", autor: "Valdelei Silva e Flavio Conceição · TXAI", genero: "Teatro negro", url: "https://periodicos.ufac.br/index.php/txai/article/view/9502" },
      { titulo: "Vestir o sentido: o método PIPA no figurino de Abajur Lilás", autor: "Silvio Paradiso · TXAI", genero: "Figurino e cena", url: "https://periodicos.ufac.br/index.php/txai/article/view/9373" },
      { titulo: "Bruxas e monstras: o grotesco como caminho criativo", autor: "Jéssica Ribeiro Fernandes · TXAI", genero: "Processo criativo", url: "https://periodicos.ufac.br/index.php/txai/article/view/9408" },
      { titulo: "Nascentes misteriosas do moderno teatro brasileiro", autor: "Osmar Vanio Fernandes · TXAI", genero: "História do teatro", url: "https://periodicos.ufac.br/index.php/txai/article/view/9755" },
      { titulo: "Impactos das mudanças climáticas e do Racismo Ambiental na Amazônia", autor: "Gisely Nahum e David Silva · Das Amazônias", genero: "Racismo ambiental", url: "https://periodicos.ufac.br/index.php/amazonicas/article/view/9710" },
      { titulo: "Narrativas da Amazônia Acreana: fronteiras, trajetórias e resistências", autor: "Emilly Nayra Albuquerque · Das Amazônias", genero: "História do Acre", url: "https://periodicos.ufac.br/index.php/amazonicas/article/view/9452" },
      { titulo: "Anatomia de um grito: o punk feminino das Mercenárias (1986)", autor: "Mariana Ferreira Maia · Das Amazônias", genero: "Música e contracultura", url: "https://periodicos.ufac.br/index.php/amazonicas/article/view/9821" },
      { titulo: "Decolonialidade e subjetividade no cotidiano escolar", autor: "Tiago Boruch · Das Amazônias", genero: "Educação", url: "https://periodicos.ufac.br/index.php/amazonicas/article/view/9705" },
      { titulo: "Infâncias tradicionais e originárias da Amazônia", autor: "Luis Sidney Fiel e Jacqueline Guimarães · Das Amazônias", genero: "Povos originários", url: "https://periodicos.ufac.br/index.php/amazonicas/article/view/8964" },
      { titulo: "A construção de Ajuricaba na historiografia amazônica (1925-1939)", autor: "Davi Lincon de Oliveira Santos · Das Amazônias", genero: "Historiografia", url: "https://periodicos.ufac.br/index.php/amazonicas/article/view/8760" },
      { titulo: "Educação antirracista em movimento: o LABODR/NEABI/UFAC", autor: "Maycon Pereira e outros · Em Favor de Igualdade Racial", genero: "Educação antirracista", url: "https://periodicos.ufac.br/index.php/RFIR/article/view/9950" },
      { titulo: "A Lei nº 10.639/2003 e os projetos de extensão da UFAC", autor: "Karen Vasconcelos e outras · Em Favor de Igualdade Racial", genero: "Lei 10.639/2003", url: "https://periodicos.ufac.br/index.php/RFIR/article/view/9951" },
      { titulo: "Tecendo fios antirracistas na extensão universitária", autor: "Geovanna Almeida e outros · Em Favor de Igualdade Racial", genero: "Antirracismo", url: "https://periodicos.ufac.br/index.php/RFIR/article/view/9952" },
      { titulo: "O Observatório de Discriminação Racial da UFAC – LABODR", autor: "Andressa Queiroz e outras · Em Favor de Igualdade Racial", genero: "Movimento negro", url: "https://periodicos.ufac.br/index.php/RFIR/article/view/9948" },
      { titulo: "Educação e resistência no movimento negro educador", autor: "Ellen Setubal Brito e outros · Em Favor de Igualdade Racial", genero: "Educação e resistência", url: "https://periodicos.ufac.br/index.php/RFIR/article/view/9953" },
    ],
  },
  {
    id: "regional-revistas",
    nome: "📚 Revistas da UFAC",
    desc: "Todas as revistas científicas da universidade — acesso livre e gratuito, para pesquisar por conta própria.",
    cor: "#00838f",
    unidade: "revista",
    itens: [
      { titulo: "Revista Das Amazônias", autor: "UFAC · História", genero: "História da Amazônia", url: "https://periodicos.ufac.br/index.php/amazonicas" },
      { titulo: "Revista TXAI", autor: "UFAC · Artes Cênicas", genero: "Teatro e performance", url: "https://periodicos.ufac.br/index.php/txai" },
      { titulo: "NAWA", autor: "UFAC · Extensão e Cultura", genero: "Arte e cultura", url: "https://periodicos.ufac.br/index.php/nawa" },
      { titulo: "Muiraquitã", autor: "UFAC · Letras e Humanidades", genero: "Literatura e artes", url: "https://periodicos.ufac.br/index.php/mui" },
      { titulo: "Em Favor de Igualdade Racial", autor: "UFAC · Educação", genero: "Educação antirracista", url: "https://periodicos.ufac.br/index.php/RFIR" },
      { titulo: "SHUBUÃ Pesquisas Indígenas", autor: "UFAC · Licenciatura Indígena", genero: "Povos originários", url: "https://periodicos.ufac.br/index.php/shubua" },
      { titulo: "TROPOS", autor: "UFAC · Comunicação e Cultura", genero: "Comunicação e cultura", url: "https://periodicos.ufac.br/index.php/tropos" },
      { titulo: "Jamaxi", autor: "UFAC · História e Humanidades", genero: "História", url: "https://periodicos.ufac.br/index.php/jamaxi" },
      { titulo: "Anthesis", autor: "UFAC · Ensino e Linguagens", genero: "Ensino e educação", url: "https://periodicos.ufac.br/index.php/anthesis" },
      { titulo: "UÁQUIRI", autor: "UFAC · Geografia", genero: "Geografia da Amazônia", url: "https://periodicos.ufac.br/index.php/Uaquiri" },
      { titulo: "Communitas", autor: "UFAC · Educação", genero: "Educação", url: "https://periodicos.ufac.br/index.php/COMMUNITAS" },
      { titulo: "Portal de Periódicos da UFAC", autor: "UFAC · todas as revistas", genero: "Acervo completo", url: "https://periodicos.ufac.br/" },
    ],
  },
  {
    id: "classicos",
    nome: "📜 Clássicos",
    desc: "Literatura brasileira e portuguesa em domínio público — do Romantismo ao Realismo.",
    cor: "#8b5e3c",
    itens: [
      { titulo: "Dom Casmurro", autor: "Machado de Assis", ano: 1899, genero: "Romance", wiki: "Dom Casmurro" },
      { titulo: "Memórias Póstumas de Brás Cubas", autor: "Machado de Assis", ano: 1881, genero: "Romance", wiki: "Memórias Póstumas de Brás Cubas" },
      { titulo: "O Alienista", autor: "Machado de Assis", ano: 1882, genero: "Novela", wiki: "O Alienista" },
      { titulo: "Quincas Borba", autor: "Machado de Assis", ano: 1891, genero: "Romance", wiki: "Quincas Borba" },
      { titulo: "Helena", autor: "Machado de Assis", ano: 1876, genero: "Romance", wiki: "Helena" },
      { titulo: "Esaú e Jacó", autor: "Machado de Assis", ano: 1904, genero: "Romance", wiki: "Esaú e Jacó" },
      { titulo: "A Mão e a Luva", autor: "Machado de Assis", ano: 1874, genero: "Romance", wiki: "A mão e a luva" },
      { titulo: "Conto de Escola", autor: "Machado de Assis", ano: 1884, genero: "Conto", wiki: "Conto de Escola" },
      { titulo: "O Cortiço", autor: "Aluísio Azevedo", ano: 1890, genero: "Naturalismo", wiki: "O Cortiço" },
      { titulo: "Casa de Pensão", autor: "Aluísio Azevedo", ano: 1884, genero: "Naturalismo", wiki: "Casa de Pensão" },
      { titulo: "O Mulato", autor: "Aluísio Azevedo", ano: 1881, genero: "Naturalismo", wiki: "O Mulato" },
      { titulo: "Iracema", autor: "José de Alencar", ano: 1865, genero: "Romantismo", wiki: "Iracema" },
      { titulo: "O Guarani", autor: "José de Alencar", ano: 1857, genero: "Romantismo", wiki: "O Guarani" },
      { titulo: "Senhora", autor: "José de Alencar", ano: 1875, genero: "Romantismo", wiki: "Senhora" },
      { titulo: "Lucíola", autor: "José de Alencar", ano: 1862, genero: "Romantismo", wiki: "Lucíola" },
      { titulo: "Diva", autor: "José de Alencar", ano: 1864, genero: "Romantismo", wiki: "Diva" },
      { titulo: "Til", autor: "José de Alencar", ano: 1872, genero: "Romantismo", wiki: "Til" },
      { titulo: "Ubirajara", autor: "José de Alencar", ano: 1874, genero: "Romantismo", wiki: "Ubirajara" },
      { titulo: "As Minas de Prata", autor: "José de Alencar", ano: 1865, genero: "Romantismo", wiki: "As Minas de Prata" },
      { titulo: "O Sertanejo", autor: "José de Alencar", ano: 1875, genero: "Romantismo", wiki: "O Sertanejo" },
      { titulo: "O Gaúcho", autor: "José de Alencar", ano: 1870, genero: "Romantismo", wiki: "O Gaúcho" },
      { titulo: "A Escrava Isaura", autor: "Bernardo Guimarães", ano: 1875, genero: "Romantismo", wiki: "A escrava Isaura" },
      { titulo: "A Moreninha", autor: "Joaquim M. de Macedo", ano: 1844, genero: "Romantismo", wiki: "A Moreninha" },
      { titulo: "Memórias de um Sargento de Milícias", autor: "Manuel Antônio de Almeida", ano: 1853, genero: "Romantismo", wiki: "Memórias de um Sargento de Milícias" },
      { titulo: "O Ateneu", autor: "Raul Pompeia", ano: 1888, genero: "Realismo", wiki: "O Ateneu" },
      { titulo: "A Carne", autor: "Júlio Ribeiro", ano: 1888, genero: "Naturalismo", wiki: "A Carne" },
      { titulo: "Bom Crioulo", autor: "Adolfo Caminha", ano: 1895, genero: "Naturalismo", wiki: "Bom Crioulo" },
      { titulo: "Úrsula", autor: "Maria Firmina dos Reis", ano: 1859, genero: "Romantismo", wiki: "Úrsula" },
      { titulo: "O Navio Negreiro", autor: "Castro Alves", ano: 1869, genero: "Poesia", wiki: "O Navio Negreiro" },
      { titulo: "Os Escravos", autor: "Castro Alves", ano: 1870, genero: "Poesia", wiki: "Os Escravos" },
      { titulo: "Espumas Flutuantes", autor: "Castro Alves", ano: 1870, genero: "Poesia", wiki: "Espumas Flutuantes (1913)" },
      { titulo: "O Primo Basílio", autor: "Eça de Queirós", ano: 1878, genero: "Realismo", wiki: "O Primo Basílio" },
      { titulo: "Os Maias", autor: "Eça de Queirós", ano: 1888, genero: "Realismo", wiki: "Os Maias" },
      { titulo: "O Crime do Padre Amaro", autor: "Eça de Queirós", ano: 1875, genero: "Realismo", wiki: "O Crime do Padre Amaro" },
      { titulo: "A Cidade e as Serras", autor: "Eça de Queirós", ano: 1901, genero: "Realismo", wiki: "A cidade e as serras" },
      { titulo: "Amor de Perdição", autor: "Camilo Castelo Branco", ano: 1862, genero: "Romantismo", wiki: "Amor de Perdição" },
      { titulo: "Os Lusíadas", autor: "Luís de Camões", ano: 1572, genero: "Épico", wiki: "Os Lusíadas" },
      { titulo: "Auto da Barca do Inferno", autor: "Gil Vicente", ano: 1517, genero: "Teatro", wiki: "Auto da Barca do Inferno" },
    ],
  },
  {
    id: "modernos",
    nome: "✨ Modernos e Contemporâneos",
    desc: "Obras do século XX já em domínio público — Pré-Modernismo, Modernismo e Regionalismo.",
    cor: "#6b3fd4",
    itens: [
      { titulo: "Macunaíma", autor: "Mário de Andrade", ano: 1928, genero: "Modernismo", wiki: "Macunaíma" },
      { titulo: "Vidas Secas", autor: "Graciliano Ramos", ano: 1938, genero: "Regionalismo", wiki: "Vidas Secas" },
      { titulo: "Os Sertões", autor: "Euclides da Cunha", ano: 1902, genero: "Pré-Modernismo", wiki: "Os Sertões" },
      { titulo: "À Margem da História", autor: "Euclides da Cunha", ano: 1909, genero: "Pré-Modernismo", wiki: "À Margem da História" },
      { titulo: "Triste Fim de Policarpo Quaresma", autor: "Lima Barreto", ano: 1915, genero: "Pré-Modernismo", wiki: "Triste Fim de Policarpo Quaresma" },
      { titulo: "Recordações do Escrivão Isaías Caminha", autor: "Lima Barreto", ano: 1909, genero: "Pré-Modernismo", wiki: "Recordações do Escrivão Isaías Caminha" },
      { titulo: "Clara dos Anjos", autor: "Lima Barreto", ano: 1948, genero: "Pré-Modernismo", wiki: "Clara dos Anjos" },
      { titulo: "Urupês", autor: "Monteiro Lobato", ano: 1918, genero: "Contos", wiki: "Urupês" },
      { titulo: "Negrinha", autor: "Monteiro Lobato", ano: 1920, genero: "Contos", wiki: "Negrinha" },
      { titulo: "Cidades Mortas", autor: "Monteiro Lobato", ano: 1919, genero: "Contos", wiki: "Cidades Mortas" },
    ],
  },
  {
    id: "artigos",
    nome: "📰 Artigos e textos",
    desc: "Textos sobre arte, história, cultura e educação para aprofundar os estudos e as aulas.",
    cor: "#1b7ea6",
    itens: [
      { titulo: "Semana de Arte Moderna", autor: "Wikipédia", genero: "Modernismo", wiki: "Semana de Arte Moderna" },
      { titulo: "Modernismo no Brasil", autor: "Wikipédia", genero: "Modernismo", wiki: "Modernismo no Brasil" },
      { titulo: "Vanguarda", autor: "Wikipédia", genero: "Vanguardas", wiki: "Vanguarda" },
      { titulo: "Arte moderna", autor: "Wikipédia", genero: "Vanguardas", wiki: "Arte moderna" },
      { titulo: "Cubismo", autor: "Wikipédia", genero: "Vanguardas", wiki: "Cubismo" },
      { titulo: "Futurismo", autor: "Wikipédia", genero: "Vanguardas", wiki: "Futurismo" },
      { titulo: "Dadaísmo", autor: "Wikipédia", genero: "Vanguardas", wiki: "Dadaísmo" },
      { titulo: "Surrealismo", autor: "Wikipédia", genero: "Vanguardas", wiki: "Surrealismo" },
      { titulo: "Expressionismo", autor: "Wikipédia", genero: "Vanguardas", wiki: "Expressionismo" },
      { titulo: "Expressionismo alemão", autor: "Wikipédia", genero: "Cinema", wiki: "Expressionismo alemão" },
      { titulo: "Arte contemporânea", autor: "Wikipédia", genero: "Contemporânea", wiki: "Arte contemporânea" },
      { titulo: "Arte conceptual", autor: "Wikipédia", genero: "Contemporânea", wiki: "Arte conceptual" },
      { titulo: "Pop art", autor: "Wikipédia", genero: "Contemporânea", wiki: "Pop art" },
      { titulo: "Minimalismo", autor: "Wikipédia", genero: "Contemporânea", wiki: "Minimalismo" },
      { titulo: "Fluxus", autor: "Wikipédia", genero: "Contemporânea", wiki: "Fluxus" },
      { titulo: "Neoconcretismo", autor: "Wikipédia", genero: "Contemporânea", wiki: "Neoconcretismo" },
      { titulo: "Arte cinética", autor: "Wikipédia", genero: "Contemporânea", wiki: "Arte cinética" },
      { titulo: "Instalação (arte)", autor: "Wikipédia", genero: "Contemporânea", wiki: "Instalação (arte)" },
      { titulo: "Arte digital", autor: "Wikipédia", genero: "Arte digital", wiki: "Arte digital" },
      { titulo: "Grafite", autor: "Wikipédia", genero: "Arte urbana", wiki: "Grafite" },
      { titulo: "Hip-hop", autor: "Wikipédia", genero: "Arte urbana", wiki: "Hip-hop" },
      { titulo: "Tarsila do Amaral", autor: "Wikipédia", genero: "Artistas", wiki: "Tarsila do Amaral" },
      { titulo: "Anita Malfatti", autor: "Wikipédia", genero: "Artistas", wiki: "Anita Malfatti" },
      { titulo: "Di Cavalcanti", autor: "Wikipédia", genero: "Artistas", wiki: "Di Cavalcanti" },
      { titulo: "Candido Portinari", autor: "Wikipédia", genero: "Artistas", wiki: "Candido Portinari" },
      { titulo: "Lygia Clark", autor: "Wikipédia", genero: "Artistas", wiki: "Lygia Clark" },
      { titulo: "Hélio Oiticica", autor: "Wikipédia", genero: "Artistas", wiki: "Hélio Oiticica" },
      { titulo: "Aleijadinho", autor: "Wikipédia", genero: "Artistas", wiki: "Aleijadinho" },
      { titulo: "Heitor Villa-Lobos", autor: "Wikipédia", genero: "Artistas", wiki: "Heitor Villa-Lobos" },
      { titulo: "Abaporu", autor: "Wikipédia", genero: "Obras", wiki: "Abaporu" },
      { titulo: "O Grito", autor: "Wikipédia", genero: "Obras", wiki: "O Grito" },
      { titulo: "Guernica", autor: "Wikipédia", genero: "Obras", wiki: "Guernica (quadro)" },
      { titulo: "Arte pré-colombiana", autor: "Wikipédia", genero: "América Latina", wiki: "Arte pré-colombiana" },
      { titulo: "Civilização asteca", autor: "Wikipédia", genero: "América Latina", wiki: "Civilização asteca" },
      { titulo: "Civilização maia", autor: "Wikipédia", genero: "América Latina", wiki: "Civilização maia" },
      { titulo: "Olmecas", autor: "Wikipédia", genero: "América Latina", wiki: "Olmecas" },
      { titulo: "Dia dos Mortos", autor: "Wikipédia", genero: "América Latina", wiki: "Dia dos Mortos" },
      { titulo: "Muralismo", autor: "Wikipédia", genero: "América Latina", wiki: "Muralismo" },
      { titulo: "Frida Kahlo", autor: "Wikipédia", genero: "América Latina", wiki: "Frida Kahlo" },
      { titulo: "Arte de África", autor: "Wikipédia", genero: "África e diáspora", wiki: "Arte de África" },
      { titulo: "Arte indígena brasileira", autor: "Wikipédia", genero: "Povos originários", wiki: "Arte indígena brasileira" },
      { titulo: "Arte plumária", autor: "Wikipédia", genero: "Povos originários", wiki: "Arte plumária" },
      { titulo: "Racismo ambiental", autor: "Wikipédia", genero: "Arte e sociedade", wiki: "Racismo ambiental" },
      { titulo: "Teatro do oprimido", autor: "Wikipédia", genero: "Arte e sociedade", wiki: "Teatro do oprimido" },
      { titulo: "Barroco no Brasil", autor: "Wikipédia", genero: "Arte brasileira", wiki: "Barroco no Brasil" },
      { titulo: "Literatura de cordel", autor: "Wikipédia", genero: "Arte brasileira", wiki: "Literatura de cordel" },
      { titulo: "Tropicália", autor: "Wikipédia", genero: "Arte brasileira", wiki: "Tropicália" },
      { titulo: "Bossa nova", autor: "Wikipédia", genero: "Arte brasileira", wiki: "Bossa nova" },
      { titulo: "Cinema Novo", autor: "Wikipédia", genero: "Cinema", wiki: "Cinema Novo" },
      { titulo: "Cinema do Brasil", autor: "Wikipédia", genero: "Cinema", wiki: "Cinema do Brasil" },
      { titulo: "Fotografia", autor: "Wikipédia", genero: "Linguagens", wiki: "Fotografia" },
      { titulo: "História da arte", autor: "Wikipédia", genero: "Estudos", wiki: "História da arte" },
      { titulo: "Artes visuais", autor: "Wikipédia", genero: "Estudos", wiki: "Artes visuais" },
      { titulo: "Ensino de arte", autor: "Wikipédia", genero: "Educação", wiki: "Ensino de arte" },
      { titulo: "Museu de Arte Moderna de São Paulo", autor: "Wikipédia", genero: "Museus", wiki: "Museu de Arte Moderna de São Paulo" },
      { titulo: "Bienal de São Paulo", autor: "Wikipédia", genero: "Museus", wiki: "Bienal de São Paulo" },
    ],
  },
];

function abrirBiblioteca() {
  esconder(document.getElementById("leitor"));
  const busca = document.getElementById("biblioteca-busca");
  if (busca) busca.value = "";
  renderEstantes("");
  renderAcreanesLetras();
  renderAcreanes();
  mostrarTela("tela-biblioteca");
  if (typeof renderMascote === "function") renderMascote("mascote-biblioteca", "biblioteca");
}

// Desenha as estantes (com filtro opcional pela busca)
function renderEstantes(termo) {
  const div = document.getElementById("biblioteca-lista");
  const t = (termo || "").trim().toLowerCase();

  const filtradas = ESTANTES.map((e, ei) => {
    const itens = e.itens
      .map((b, i) => ({ b, i }))
      .filter(({ b }) => !t || (b.titulo + " " + b.autor + " " + (b.genero || "")).toLowerCase().includes(t));
    return { e, ei, itens };
  }).filter((x) => x.itens.length);

  if (!filtradas.length) {
    div.innerHTML = `<p class="vazio">Nenhuma obra encontrada para "${escaparHTML(termo)}".</p>`;
    return;
  }

  div.innerHTML = filtradas.map(({ e, ei, itens }) => `
    <section class="estante">
      <div class="estante-topo">
        <div>
          <h3 class="estante-titulo">${e.nome}</h3>
          <p class="estante-desc">${e.desc}</p>
        </div>
        <span class="estante-contador">${itens.length} ${itens.length === 1 ? (e.unidade || "obra") : (e.unidade ? e.unidade + "s" : "obras")}</span>
      </div>
      <div class="estante-prateleira">
        ${itens.map(({ b, i }) => `
          <button class="livro" data-estante="${ei}" data-i="${i}" style="--lombada:${e.cor}">
            <span class="livro-titulo">${escaparHTML(b.titulo)}</span>
            <span class="livro-autor">${escaparHTML(b.autor)}${b.ano ? " · " + b.ano : ""}</span>
            <span class="livro-genero">${escaparHTML(b.genero || "")}</span>
          </button>
        `).join("")}
      </div>
    </section>
  `).join("");

  div.querySelectorAll(".livro").forEach((btn) => {
    btn.addEventListener("click", () => {
      const e = ESTANTES[parseInt(btn.dataset.estante, 10)];
      abrirLivro(e.itens[parseInt(btn.dataset.i, 10)]);
    });
  });
}

document.getElementById("biblioteca-busca").addEventListener("input", (e) => renderEstantes(e.target.value));

function abrirLivro(b) {
  let url;
  if (b.url) {
    url = b.url;
  } else {
    const base = b.autor === "Wikipédia"
      ? "https://pt.wikipedia.org/wiki/"
      : "https://pt.wikisource.org/wiki/";
    url = base + encodeURIComponent(b.wiki);
  }
  document.getElementById("leitor-titulo").textContent = `${b.titulo} — ${b.autor}`;
  document.getElementById("leitor-frame").src = url;
  document.getElementById("leitor-link").href = url;
  exibir(document.getElementById("leitor"));
  document.getElementById("leitor").scrollIntoView({ behavior: "smooth" });
}

document.getElementById("btn-biblioteca").addEventListener("click", abrirBiblioteca);
document.getElementById("btn-voltar-biblioteca").addEventListener("click", () => {
  esconder(document.getElementById("leitor"));
  document.getElementById("leitor-frame").src = "";
  if (usuario && usuario.papel === "professor") abrirPainelProfessor();
  else abrirInicioEstudante();
});
document.getElementById("btn-fechar-leitor").addEventListener("click", () => {
  esconder(document.getElementById("leitor"));
  document.getElementById("leitor-frame").src = "";
});

// ---------- Eventos gerais ----------
document.getElementById("btn-completo").addEventListener("click", () =>
  iniciarQuiz(Object.keys(AREAS))
);
document.getElementById("btn-refazer").addEventListener("click", () =>
  iniciarQuiz(Object.keys(AREAS))
);
document.getElementById("btn-voltar").addEventListener("click", () => {
  if (usuario && usuario.papel === "professor") abrirPainelProfessor();
  else abrirInicioEstudante();
});

// ============================================================
// AVISO RÁPIDO (toast)
// ============================================================
let toastTimer = null;
function mostrarToast(msg, tipo) {
  let el = document.getElementById("nina-toast");
  if (!el) {
    el = document.createElement("div");
    el.id = "nina-toast";
    el.className = "toast";
    document.body.appendChild(el);
  }
  el.textContent = msg;
  el.className = "toast visivel" + (tipo ? " " + tipo : "");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove("visivel"), 4000);
}

// ============================================================
// CHAT DA ESCOLA (professores da mesma escola)
// ============================================================
let chatUnsub = null;

function abrirChat() {
  if (!usuario || usuario.papel !== "professor") return;
  const nomeEscola = document.getElementById("chat-escola-nome");
  const btnConfig = document.getElementById("btn-chat-config");
  const lista = document.getElementById("chat-lista");

  if (!usuario.escola) {
    nomeEscola.textContent = "Você ainda não definiu sua escola.";
    lista.innerHTML = `<p class="vazio">Defina o <strong>código da escola</strong> para conversar com os colegas.</p>`;
    if (btnConfig) exibir(btnConfig);
    mostrarTela("tela-chat");
    return;
  }

  if (btnConfig) esconder(btnConfig);
  nomeEscola.innerHTML =
    `Escola: <strong>${escaparHTML(usuario.escola)}</strong> — conversa entre os professores da mesma escola.`;
  mostrarTela("tela-chat");
  ouvirChat();
}

function ouvirChat() {
  if (chatUnsub) { chatUnsub(); chatUnsub = null; }
  const lista = document.getElementById("chat-lista");
  lista.innerHTML = `<p class="vazio">Carregando mensagens...</p>`;
  chatUnsub = ouvirMensagensEscola(usuario.escola, (msgs) => {
    if (!msgs) {
      lista.innerHTML = `<p class="vazio">Não foi possível carregar o chat agora.</p>`;
      return;
    }
    if (!msgs.length) {
      lista.innerHTML = `<p class="vazio">Nenhuma mensagem ainda. Comece a conversa!</p>`;
      return;
    }
    lista.innerHTML = msgs.map((m) => {
      const meu = m.uid === usuario.uid;
      const hora = m.ms
        ? new Date(m.ms).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })
        : "";
      return `<div class="chat-msg ${meu ? "minha" : ""}">
        <div class="chat-msg-topo"><strong>${escaparHTML(meu ? "Você" : (m.nome || "Professor"))}</strong><span>${hora}</span></div>
        <p>${escaparHTML(m.texto || "")}</p>
      </div>`;
    }).join("");
    lista.scrollTop = lista.scrollHeight;
  });
}

function fecharChat() {
  if (chatUnsub) { chatUnsub(); chatUnsub = null; }
}

async function enviarChat() {
  const input = document.getElementById("chat-input");
  const texto = input.value.trim();
  if (!texto || !usuario || !usuario.escola) return;
  input.value = "";
  try {
    await enviarMensagemEscola(usuario, texto);
  } catch (e) {
    mostrarToast("Erro ao enviar: " + e.message, "erro");
    input.value = texto;
  }
}

document.getElementById("btn-chat").addEventListener("click", abrirChat);
document.getElementById("btn-voltar-chat").addEventListener("click", () => {
  fecharChat();
  if (usuario && usuario.papel === "professor") abrirPainelProfessor();
  else abrirInicioEstudante();
});
document.getElementById("btn-chat-enviar").addEventListener("click", enviarChat);
document.getElementById("chat-input").addEventListener("keydown", (e) => {
  if (e.key === "Enter") { e.preventDefault(); enviarChat(); }
});
document.getElementById("btn-chat-config").addEventListener("click", () => {
  fecharChat();
  abrirEscolhaArea();
});
document.getElementById("btn-ir-escola").addEventListener("click", abrirEscolhaArea);

// ============================================================
// CHAT DA TURMA (professor + estudantes da turma)
// ============================================================
let chatTurmaUnsub = null;
let chatTurmaCodigo = null;

// Código da turma ativa (do professor ou do estudante)
function codigoDaTurmaAtiva() {
  if (!usuario) return null;
  if (usuario.papel === "professor") return turmaAtualProf ? turmaAtualProf.codigo : null;
  return minhaTurma ? minhaTurma.codigo : null;
}

function abrirChatTurma() {
  if (!usuario) return;
  const codigo = codigoDaTurmaAtiva();
  const nome = document.getElementById("chat-turma-nome");
  const lista = document.getElementById("chat-turma-lista");

  if (!codigo) {
    nome.textContent = "Nenhuma turma ativa.";
    lista.innerHTML = `<p class="vazio">${usuario.papel === "professor"
      ? "Abra uma turma no painel para conversar com os estudantes."
      : "Entre numa turma para conversar com a turma."}</p>`;
    mostrarTela("tela-chat-turma");
    return;
  }

  const nomeTurma = usuario.papel === "professor"
    ? (turmaAtualProf && turmaAtualProf.nome)
    : (minhaTurma && minhaTurma.nome);
  nome.innerHTML = `<strong>${escaparHTML(nomeTurma || "")}</strong> · ${escaparHTML(codigo)}`;
  mostrarTela("tela-chat-turma");
  ouvirChatTurma(codigo);
}

function ouvirChatTurma(codigo) {
  if (chatTurmaUnsub) { chatTurmaUnsub(); chatTurmaUnsub = null; }
  chatTurmaCodigo = codigo;
  const lista = document.getElementById("chat-turma-lista");
  lista.innerHTML = `<p class="vazio">Carregando mensagens...</p>`;
  chatTurmaUnsub = ouvirMensagensTurma(codigo, (msgs) => {
    if (!msgs) {
      lista.innerHTML = `<p class="vazio">Não foi possível carregar o chat agora.</p>`;
      return;
    }
    if (!msgs.length) {
      lista.innerHTML = `<p class="vazio">Nenhuma mensagem ainda. Comece a conversa!</p>`;
      return;
    }
    lista.innerHTML = msgs.map((m) => {
      const meu = m.uid === usuario.uid;
      const ehProf = m.papel === "professor";
      const hora = m.ms
        ? new Date(m.ms).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })
        : "";
      return `<div class="chat-msg ${meu ? "minha" : ""} ${ehProf ? "prof" : ""}">
        <div class="chat-msg-topo"><strong>${escaparHTML(meu ? "Você" : (m.nome || "Usuário"))}${ehProf ? " 👩🏽‍🏫" : ""}</strong><span>${hora}</span></div>
        <p>${escaparHTML(m.texto || "")}</p>
      </div>`;
    }).join("");
    lista.scrollTop = lista.scrollHeight;
  });
}

function fecharChatTurma() {
  if (chatTurmaUnsub) { chatTurmaUnsub(); chatTurmaUnsub = null; }
  chatTurmaCodigo = null;
}

async function enviarChatTurma() {
  const input = document.getElementById("chat-turma-input");
  const texto = input.value.trim();
  const codigo = chatTurmaCodigo || codigoDaTurmaAtiva();
  if (!texto || !codigo) return;
  input.value = "";
  try {
    await enviarMensagemTurma(usuario, codigo, texto);
  } catch (e) {
    mostrarToast("Erro ao enviar: " + e.message, "erro");
    input.value = texto;
  }
}

document.getElementById("btn-chat-turma").addEventListener("click", abrirChatTurma);
document.getElementById("btn-voltar-chat-turma").addEventListener("click", () => {
  fecharChatTurma();
  if (usuario && usuario.papel === "professor") abrirPainelProfessor();
  else abrirInicioEstudante();
});
document.getElementById("btn-chat-turma-enviar").addEventListener("click", enviarChatTurma);
document.getElementById("chat-turma-input").addEventListener("keydown", (e) => {
  if (e.key === "Enter") { e.preventDefault(); enviarChatTurma(); }
});

// ============================================================
// GLOSSÁRIO DE IA (A a Z)
// ============================================================
let letraGlossario = "";
let buscaGlossario = "";

function abrirGlossario() {
  mostrarTela("tela-glossario");
  const busca = document.getElementById("glossario-busca");
  if (busca) busca.value = "";
  buscaGlossario = "";
  letraGlossario = "";
  renderLetrasGlossario();
  renderGlossario();
  if (typeof renderMascote === "function") renderMascote("mascote-glossario", "curriculo");
}

function renderLetrasGlossario() {
  const div = document.getElementById("glossario-letras");
  if (!div) return;
  const usadas = new Set(GLOSSARIO.map((g) => letraDoTermo(g)));
  div.innerHTML =
    `<button class="letra-btn ${letraGlossario === "" ? "ativa" : ""}" data-letra="" type="button">Todos</button>` +
    LETRAS_GLOSSARIO.map((l) =>
      `<button class="letra-btn ${letraGlossario === l ? "ativa" : ""} ${usadas.has(l) ? "" : "vazia"}" data-letra="${l}" type="button">${l}</button>`
    ).join("");
  div.querySelectorAll(".letra-btn").forEach((b) => {
    b.addEventListener("click", () => {
      letraGlossario = b.dataset.letra;
      renderLetrasGlossario();
      renderGlossario();
    });
  });
}

function renderGlossario() {
  const div = document.getElementById("glossario-lista");
  if (!div) return;
  const t = buscaGlossario.trim().toLowerCase();
  const itens = GLOSSARIO.filter((g) => {
    if (letraGlossario && letraDoTermo(g) !== letraGlossario) return false;
    if (!t) return true;
    return (g.termo + " " + (g.en || "") + " " + g.def).toLowerCase().includes(t);
  });

  if (!itens.length) {
    div.innerHTML = `<p class="vazio">Nenhum termo encontrado${letraGlossario ? " na letra " + letraGlossario : ""}.</p>`;
    return;
  }

  div.innerHTML = itens.map((g) => `
    <details class="glossario-card">
      <summary>
        <span class="glossario-letra">${letraDoTermo(g)}</span>
        <span class="glossario-termo">${escaparHTML(g.termo)}</span>
        ${g.en ? `<span class="glossario-en">${escaparHTML(g.en)}</span>` : ""}
      </summary>
      <p>${escaparHTML(g.def)}</p>
    </details>
  `).join("");
}

document.getElementById("btn-glossario-perfil").addEventListener("click", abrirGlossario);
document.getElementById("btn-voltar-glossario").addEventListener("click", () => {
  if (usuario && usuario.papel === "professor") abrirMeuPerfil();
  else abrirInicioEstudante();
});
document.getElementById("glossario-busca").addEventListener("input", (e) => {
  buscaGlossario = e.target.value;
  renderGlossario();
});

// ============================================================
// DICIONÁRIO ACREANÊS (dentro da Biblioteca)
// ============================================================
let letraAcreanes = "";

function renderAcreanesLetras() {
  const div = document.getElementById("acreanes-letras");
  if (!div || typeof ACREANES === "undefined") return;
  const usadas = new Set(ACREANES.map((a) => letraDoTermo({ termo: a.p })));
  div.innerHTML = LETRAS_GLOSSARIO.map((l) =>
    `<button class="letra-btn ${letraAcreanes === l ? "ativa" : ""} ${usadas.has(l) ? "" : "vazia"}" data-letra="${l}" type="button">${l}</button>`
  ).join("");
  div.querySelectorAll(".letra-btn").forEach((b) => {
    b.addEventListener("click", () => {
      letraAcreanes = b.dataset.letra;
      renderAcreanesLetras();
      renderAcreanes();
      const lista = document.getElementById("acreanes-lista");
      if (lista) lista.scrollIntoView({ behavior: "smooth", block: "nearest" });
    });
  });
}

function renderAcreanes() {
  const div = document.getElementById("acreanes-lista");
  if (!div || typeof ACREANES === "undefined") return;

  if (!letraAcreanes) {
    div.innerHTML = `<p class="vazio">👆 Escolha uma letra acima para ver as palavras acreanesas.</p>`;
    return;
  }

  const itens = ACREANES.filter((a) => letraDoTermo({ termo: a.p }) === letraAcreanes);
  if (!itens.length) {
    div.innerHTML = `<p class="vazio">Nenhuma palavra com a letra ${letraAcreanes}.</p>`;
    return;
  }

  div.innerHTML = itens.map((a) => `
    <details class="glossario-card">
      <summary>
        <span class="glossario-letra">${letraAcreanes}</span>
        <span class="glossario-termo">${escaparHTML(a.p)}</span>
        ${a.c ? `<span class="glossario-en">${escaparHTML(a.c)}</span>` : ""}
      </summary>
      <p>${escaparHTML(a.d)}</p>
    </details>
  `).join("");
}

// ============================================================
// FALAR COM A PROFESSORA (mensagens diretas)
// ============================================================
let suporteUnsub = null;

function abrirSuporte() {
  if (!usuario) return;
  mostrarTela("tela-suporte");
  ouvirSuporte();
}

function ouvirSuporte() {
  if (suporteUnsub) { suporteUnsub(); suporteUnsub = null; }
  const lista = document.getElementById("suporte-lista");
  lista.innerHTML = `<p class="vazio">Carregando mensagens...</p>`;
  suporteUnsub = ouvirMinhasMensagens(usuario.uid, (msgs) => {
    if (!msgs) { lista.innerHTML = `<p class="vazio">Não foi possível carregar agora.</p>`; return; }
    if (!msgs.length) {
      lista.innerHTML = `<p class="vazio">Nenhuma mensagem ainda. Escreva a primeira! 👇</p>`;
      return;
    }
    lista.innerHTML = msgs.map((m) => {
      const daProf = m.de === "professora";
      const hora = m.ms
        ? new Date(m.ms).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })
        : "";
      return `<div class="chat-msg ${daProf ? "prof" : "minha"}">
        <div class="chat-msg-topo"><strong>${daProf ? "👩🏽‍🏫 Professora" : "Você"}</strong><span>${hora}</span></div>
        <p>${escaparHTML(m.texto || "")}</p>
      </div>`;
    }).join("");
    lista.scrollTop = lista.scrollHeight;
  });
}

function fecharSuporte() {
  if (suporteUnsub) { suporteUnsub(); suporteUnsub = null; }
}

async function enviarSuporte() {
  const input = document.getElementById("suporte-input");
  const texto = input.value.trim();
  if (!texto || !usuario) return;
  input.value = "";
  try {
    await enviarMensagemSuporte(usuario, texto);
  } catch (e) {
    mostrarToast("Erro ao enviar: " + e.message, "erro");
    input.value = texto;
  }
}

document.getElementById("btn-suporte").addEventListener("click", abrirSuporte);
document.getElementById("btn-voltar-suporte").addEventListener("click", () => {
  fecharSuporte();
  if (usuario && usuario.papel === "professor") abrirPainelProfessor();
  else abrirInicioEstudante();
});
document.getElementById("btn-suporte-enviar").addEventListener("click", enviarSuporte);
document.getElementById("suporte-input").addEventListener("keydown", (e) => {
  if (e.key === "Enter") { e.preventDefault(); enviarSuporte(); }
});

// ============================================================
// NOVIDADES (avisos para todos os usuários)
// ============================================================
let novidadesCache = [];
let novidadesNaoLidas = 0;

async function carregarNovidades(mostrarBanner) {
  try {
    novidadesCache = await listarNovidades();
  } catch {
    novidadesCache = [];
  }
  const visto = (usuario && usuario.novidadeVistaMs) || 0;
  novidadesNaoLidas = novidadesCache.filter((n) => n.ms > visto).length;
  atualizarBadgeNovidades();
  if (mostrarBanner && novidadesNaoLidas > 0) mostrarBannerNovidades();
}

function atualizarBadgeNovidades() {
  const badge = document.getElementById("novidades-badge");
  if (!badge) return;
  if (novidadesNaoLidas > 0) {
    badge.textContent = novidadesNaoLidas;
    badge.classList.remove("escondido");
  } else {
    badge.classList.add("escondido");
  }
}

function mostrarBannerNovidades() {
  const b = document.getElementById("novidades-banner");
  const t = document.getElementById("novidades-banner-texto");
  if (!b) return;
  if (t) {
    t.innerHTML = novidadesNaoLidas === 1
      ? "🆕 <strong>1 novidade</strong> no NINA!"
      : `🆕 <strong>${novidadesNaoLidas} novidades</strong> no NINA!`;
  }
  exibir(b);
}

function esconderBannerNovidades() {
  const b = document.getElementById("novidades-banner");
  if (b) esconder(b);
}

async function abrirNovidades() {
  esconderBannerNovidades();
  const div = document.getElementById("novidades-lista");
  mostrarTela("tela-novidades");
  atualizarStatusPush();
  div.innerHTML = "<p class='vazio'>Carregando novidades...</p>";
  try {
    novidadesCache = await listarNovidades();
  } catch {
    div.innerHTML = "<p class='vazio'>Não foi possível carregar agora.</p>";
    return;
  }
  if (!novidadesCache.length) {
    div.innerHTML = "<p class='vazio'>Nenhuma novidade publicada ainda.</p>";
    return;
  }
  div.innerHTML = novidadesCache.map((n) => `
    <div class="novidade-card">
      <div class="novidade-topo">
        <strong>${escaparHTML(n.titulo || "Novidade")}</strong>
        <span>${n.ms ? new Date(n.ms).toLocaleDateString("pt-BR") : ""}</span>
      </div>
      <p>${escaparHTML(n.texto || "")}</p>
      ${n.link ? `<a class="btn-secundario compacto" href="${escaparHTML(n.link)}" target="_blank" rel="noopener">Abrir link ↗</a>` : ""}
      <small class="novidade-autor">por ${escaparHTML(n.autorNome || "equipe NINA")}</small>
    </div>
  `).join("");
  await marcarNovidadesVistas();
}

async function marcarNovidadesVistas() {
  if (!usuario || !novidadesCache.length) return;
  const maiorMs = novidadesCache[0].ms || Date.now();
  usuario.novidadeVistaMs = maiorMs;
  novidadesNaoLidas = 0;
  atualizarBadgeNovidades();
  await salvarUsuario(usuario.uid, { novidadeVistaMs: maiorMs }).catch(() => {});
}

document.getElementById("btn-novidades").addEventListener("click", abrirNovidades);
document.getElementById("btn-ver-novidades").addEventListener("click", abrirNovidades);
document.getElementById("btn-fechar-novidades").addEventListener("click", esconderBannerNovidades);
document.getElementById("btn-voltar-novidades").addEventListener("click", () => {
  if (usuario && usuario.papel === "professor") abrirPainelProfessor();
  else abrirInicioEstudante();
});

// ============================================================
// SERVICE WORKER (offline + notificações)
// ============================================================
let swRegistro = null;

async function registrarSW() {
  if (!("serviceWorker" in navigator)) return null;
  try {
    swRegistro = swRegistro || await navigator.serviceWorker.register("sw.js");
    return swRegistro;
  } catch {
    return null;
  }
}

// Aviso de "sem internet"
function atualizarStatusRede() {
  const aviso = document.getElementById("offline-banner");
  if (!aviso) return;
  if (navigator.onLine) esconder(aviso);
  else exibir(aviso);
}
window.addEventListener("online", atualizarStatusRede);
window.addEventListener("offline", atualizarStatusRede);

// ============================================================
// NOTIFICAÇÕES PUSH (Firebase Cloud Messaging)
// ============================================================
let pushTokenAtual = null;

function pushSuportado() {
  return typeof Notification !== "undefined" &&
    "serviceWorker" in navigator &&
    typeof firebase !== "undefined" &&
    !!firebase.messaging;
}

function estaEmNavegadorDeApp() {
  const ua = navigator.userAgent || "";
  if (/FBAN|FBAV|Instagram|Line\/|WhatsApp|Twitter|LinkedInApp|Snapchat|Pinterest/i.test(ua)) return true;
  return /Android/i.test(ua) && /;\s*wv\)/i.test(ua);
}

function ehIOS() {
  return /iPhone|iPad|iPod/i.test(navigator.userAgent || "") ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
}

function estaInstaladoComoApp() {
  return (window.matchMedia && window.matchMedia("(display-mode: standalone)").matches) ||
    navigator.standalone === true;
}

function motivoSemPush() {
  if (typeof firebase === "undefined" || !firebase.messaging) return "sdk";
  if (typeof Notification === "undefined" || !("serviceWorker" in navigator)) {
    if (estaEmNavegadorDeApp()) return "app";
    if (ehIOS() && !estaInstaladoComoApp()) return "ios";
    return "navegador";
  }
  return "ok";
}

function textoBotaoPush() {
  const motivo = motivoSemPush();
  if (motivo === "app") return "📲 Abra o NINA no Chrome para ativar as notificações";
  if (motivo === "ios") return "📲 Instale o NINA na Tela de Início para ativar";
  if (motivo === "sdk") return "🔕 Notificações indisponíveis agora — atualize a página";
  return "🔕 Este navegador não suporta notificações";
}

function atualizarStatusPush() {
  const btn = document.getElementById("btn-ativar-push");
  if (!btn) return;
  if (!pushSuportado()) {
    btn.textContent = textoBotaoPush();
    btn.disabled = true;
    return;
  }
  btn.disabled = false;
  if (Notification.permission === "denied") {
    btn.textContent = "🔕 Notificações bloqueadas — libere nas configurações do navegador";
    return;
  }
  if (Notification.permission === "granted" && pushTokenAtual) {
    btn.textContent = "🔔 Notificações ativadas ✅";
    btn.classList.remove("btn-principal");
    btn.classList.add("btn-secundario");
  } else {
    btn.textContent = "🔔 Ativar notificações";
    btn.classList.remove("btn-secundario");
    btn.classList.add("btn-principal");
  }
}

async function ativarNotificacoes() {
  if (!pushSuportado()) {
    const motivo = motivoSemPush();
    const aviso = motivo === "app"
      ? "Abra o NINA no Chrome para ativar as notificações."
      : motivo === "ios"
        ? "No iPhone, instale o NINA na Tela de Início e abra por lá para ativar."
        : "Este navegador não suporta notificações.";
    mostrarToast(aviso, "erro");
    return;
  }
  if (typeof VAPID_KEY === "undefined" || !VAPID_KEY) {
    mostrarToast("A chave VAPID ainda não foi configurada no app.", "erro");
    return;
  }
  try {
    const permissao = await Notification.requestPermission();
    if (permissao !== "granted") {
      mostrarToast("Permissão de notificação não concedida.", "erro");
      atualizarStatusPush();
      return;
    }
    const reg = await registrarSW();
    const messaging = firebase.messaging();
    const token = await messaging.getToken({ vapidKey: VAPID_KEY, serviceWorkerRegistration: reg });
    if (!token) {
      mostrarToast("Não foi possível gerar o token de notificação.", "erro");
      return;
    }
    pushTokenAtual = token;
    await salvarTokenPush(usuario.uid, token).catch(() => {});
    atualizarStatusPush();
    mostrarToast("Notificações ativadas! Você vai receber os avisos. 🔔");
  } catch (e) {
    mostrarToast("Erro ao ativar: " + e.message, "erro");
  }
}

// Tenta registrar o token silenciosamente (só se a permissão já foi dada)
async function registrarPushSilencioso() {
  if (!pushSuportado() || Notification.permission !== "granted") return;
  if (typeof VAPID_KEY === "undefined" || !VAPID_KEY) return;
  try {
    const reg = await registrarSW();
    const messaging = firebase.messaging();
    const token = await messaging.getToken({ vapidKey: VAPID_KEY, serviceWorkerRegistration: reg });
    if (token) {
      pushTokenAtual = token;
      await salvarTokenPush(usuario.uid, token).catch(() => {});
    }
  } catch {}
}

document.getElementById("btn-ativar-push").addEventListener("click", ativarNotificacoes);

// ============================================================
// ADMINISTRAÇÃO / MODERAÇÃO
// ============================================================
let adminAba = "usuarios";
let adminDados = { usuarios: [], mural: [], perguntas: [], mensagens: [], mensagensTurma: [], novidades: [], conversas: [] };
let conversaUid = null;
let conversaUnsub = null;

function abrirAdmin() {
  // SOMENTE os e-mails de administração (e fora do papel de estudante) entram aqui
  if (!podeAdministrar()) {
    const btn = document.getElementById("btn-admin");
    if (btn) esconder(btn);
    mostrarToast("Acesso restrito à administração.", "erro");
    return;
  }
  document.querySelectorAll(".admin-aba").forEach((b) => b.classList.toggle("ativa", b.dataset.admin === adminAba));
  mostrarTela("tela-admin");
  carregarAdmin();
}

async function carregarAdmin() {
  if (!podeAdministrar()) return;
  const div = document.getElementById("admin-conteudo");
  div.innerHTML = `<p class="vazio">Carregando...</p>`;
  try {
    if (adminAba === "usuarios") adminDados.usuarios = await listarTodosUsuarios();
    else if (adminAba === "mural") adminDados.mural = await listarTodosDepoimentos();
    else if (adminAba === "perguntas") adminDados.perguntas = await listarPerguntas();
    else if (adminAba === "mensagensTurma") adminDados.mensagensTurma = await listarTodasMensagensTurma();
    else if (adminAba === "novidades") adminDados.novidades = await listarNovidades();
    else if (adminAba === "conversas") adminDados.conversas = await listarConversasSuporte();
    else if (adminAba === "relatorio") return renderRelatorio(div);
    else adminDados.mensagens = await listarTodasMensagens();
  } catch (e) {
    div.innerHTML = `<p class="vazio">Erro ao carregar: ${escaparHTML(e.message)}</p>`;
    return;
  }
  renderAdmin();
}

function renderAdmin() {
  const div = document.getElementById("admin-conteudo");
  if (adminAba === "usuarios") return renderAdminUsuarios(div);
  if (adminAba === "mural") return renderAdminMural(div);
  if (adminAba === "perguntas") return renderAdminPerguntas(div);
  if (adminAba === "mensagensTurma") return renderAdminMensagensTurma(div);
  if (adminAba === "novidades") return renderAdminNovidades(div);
  if (adminAba === "conversas") return renderAdminConversas(div);
  return renderAdminMensagens(div);
}

function renderAdminConversas(div) {
  if (conversaUid) return renderConversaDetalhe(div);
  const lista = adminDados.conversas || [];
  div.innerHTML = `
    <p class="admin-resumo">${lista.length} conversa(s)</p>
    ${lista.map((c) => {
      const papelTxt = c.papel === "professor" ? "👩🏽‍🏫 Professor(a)"
        : c.papel === "estudante" ? "🎒 Estudante"
        : "❓ Sem papel definido";
      return `
        <div class="admin-item">
          <div class="admin-item-info">
            <strong>${escaparHTML(c.nome || "Sem nome")} · ${papelTxt}</strong>
            <span class="admin-sub">${escaparHTML(c.email || "")} · ${escaparHTML(c.ultimaTexto || "")}</span>
          </div>
          <div class="admin-acoes">
            <button class="btn-ghost compacto" data-acao="abrir-conversa" data-id="${c.uid}">💬 Abrir</button>
            <button class="btn-ghost compacto" data-acao="excluir-conversa" data-id="${c.uid}">🗑️</button>
          </div>
        </div>`;
    }).join("") || `<p class="vazio">Nenhuma conversa ainda.</p>`}
  `;
}

function renderConversaDetalhe(div) {
  const c = (adminDados.conversas || []).find((x) => x.uid === conversaUid);
  div.innerHTML = `
    <button class="btn-ghost compacto" data-acao="voltar-conversas" type="button">← Voltar para as conversas</button>
    <p class="admin-resumo">Conversa com <strong>${escaparHTML(c ? c.nome : "")}</strong> ${c && c.email ? "· " + escaparHTML(c.email) : ""}</p>
    <div id="admin-conversa-msgs" class="chat-lista admin-chat"></div>
    <div class="chat-envio">
      <input id="admin-conversa-input" type="text" maxlength="600" placeholder="Responder ao estudante...">
      <button id="admin-conversa-enviar" class="btn-principal compacto" type="button">Enviar</button>
    </div>
  `;

  const enviar = async () => {
    const input = document.getElementById("admin-conversa-input");
    const texto = input.value.trim();
    if (!texto) return;
    input.value = "";
    try {
      await responderSuporte(conversaUid, texto);
      carregarConversaMsgs();
    } catch (e) {
      mostrarToast("Erro: " + e.message, "erro");
    }
  };

  document.getElementById("admin-conversa-enviar").addEventListener("click", enviar);
  document.getElementById("admin-conversa-input").addEventListener("keydown", (e) => {
    if (e.key === "Enter") { e.preventDefault(); enviar(); }
  });

  carregarConversaMsgs();
}

// ---------- Relatório de uso ----------
function cardRelatorio(icone, rotulo, valor) {
  return `<div class="relatorio-card">
    <span class="relatorio-icone">${icone}</span>
    <span class="relatorio-valor">${valor}</span>
    <span class="relatorio-rotulo">${rotulo}</span>
  </div>`;
}

async function renderRelatorio(div) {
  div.innerHTML = `<p class="vazio">Carregando relatório...</p>`;
  try {
    const [usuarios, turmas, resultados, atividades, revisoes, respostas, conversas, novidades] = await Promise.all([
      listarTodosUsuarios().catch(() => []),
      listarTodasTurmas().catch(() => []),
      listarTodosResultados().catch(() => []),
      listarTodasAtividades().catch(() => []),
      listarTodasRevisoes().catch(() => []),
      listarTodasRespostasQuiz().catch(() => []),
      listarConversasSuporte().catch(() => []),
      listarNovidades().catch(() => []),
    ]);

    const profs = usuarios.filter((u) => u.papel === "professor");
    const alunos = usuarios.filter((u) => u.papel === "estudante");
    const semPapel = usuarios.filter((u) => !u.papel);
    const bloqueados = usuarios.filter((u) => u.bloqueado);
    const comPush = usuarios.filter((u) => Array.isArray(u.pushTokens) && u.pushTokens.length).length;

    const escolas = {};
    profs.forEach((u) => { if (u.escola) escolas[u.escola] = (escolas[u.escola] || 0) + 1; });
    const listaEscolas = Object.entries(escolas).sort((a, b) => b[1] - a[1]);

    const media = respostas.length
      ? Math.round(respostas.reduce((s, r) => s + (r.total ? (r.acertos / r.total) * 100 : 0), 0) / respostas.length)
      : 0;

    const recentes = usuarios.slice().sort((a, b) => {
      const ma = a.criadoEm && a.criadoEm.toMillis ? a.criadoEm.toMillis() : 0;
      const mb = b.criadoEm && b.criadoEm.toMillis ? b.criadoEm.toMillis() : 0;
      return mb - ma;
    }).slice(0, 6);

    div.innerHTML = `
      <p class="admin-resumo">📊 Resumo geral do NINA</p>
      <div class="relatorio-grid">
        ${cardRelatorio("👥", "Usuários", usuarios.length)}
        ${cardRelatorio("👩🏽‍🏫", "Professores", profs.length)}
        ${cardRelatorio("🎒", "Estudantes", alunos.length)}
        ${cardRelatorio("❓", "Sem papel", semPapel.length)}
        ${cardRelatorio("🏫", "Escolas", listaEscolas.length)}
        ${cardRelatorio("🏫", "Turmas", turmas.length)}
        ${cardRelatorio("📝", "Diagnósticos", resultados.length)}
        ${cardRelatorio("📋", "Atividades", atividades.length)}
        ${cardRelatorio("✅", "Respostas", respostas.length)}
        ${cardRelatorio("📖", "Revisões", revisoes.length)}
        ${cardRelatorio("💬", "Conversas", conversas.length)}
        ${cardRelatorio("🔔", "Novidades", novidades.length)}
        ${cardRelatorio("📲", "Com push", comPush)}
        ${cardRelatorio("🚫", "Bloqueados", bloqueados.length)}
      </div>

      <h4 class="curriculo-sub">📈 Média de acertos nas atividades</h4>
      <div class="relatorio-barra"><div class="relatorio-barra-fill" style="width:${media}%"></div></div>
      <p class="admin-sub">Média: <strong>${media}%</strong> em ${respostas.length} resposta(s)</p>

      <h4 class="curriculo-sub">🏫 Professores por escola</h4>
      ${listaEscolas.length
        ? listaEscolas.map(([esc, n]) => `
          <div class="admin-item">
            <div class="admin-item-info"><strong>🏫 ${escaparHTML(esc)}</strong></div>
            <div class="admin-acoes"><span class="admin-sub">${n} professor(es)</span></div>
          </div>`).join("")
        : `<p class="vazio">Nenhuma escola cadastrada ainda.</p>`}

      <h4 class="curriculo-sub">🆕 Últimos cadastros</h4>
      ${recentes.map((u) => `
        <div class="admin-item">
          <div class="admin-item-info">
            <strong>${escaparHTML(u.nome || "Sem nome")}</strong>
            <span class="admin-sub">${escaparHTML(u.email || "")} · ${u.papel || "sem papel"}${u.escola ? " · 🏫 " + escaparHTML(u.escola) : ""}</span>
          </div>
        </div>`).join("") || `<p class="vazio">Nenhum usuário ainda.</p>`}
    `;
  } catch (e) {
    div.innerHTML = `<p class="vazio">Erro ao gerar relatório: ${escaparHTML(e.message)}</p>`;
  }
}

function carregarConversaMsgs() {  if (conversaUnsub) { conversaUnsub(); conversaUnsub = null; }
  const div = document.getElementById("admin-conversa-msgs");
  if (!div || !conversaUid) return;
  div.innerHTML = `<p class="vazio">Carregando...</p>`;
  conversaUnsub = ouvirMinhasMensagens(conversaUid, (msgs) => {
    if (!msgs) { div.innerHTML = `<p class="vazio">Erro ao carregar.</p>`; return; }
    if (!msgs.length) { div.innerHTML = `<p class="vazio">Sem mensagens.</p>`; return; }
    div.innerHTML = msgs.map((m) => {
      const daProf = m.de === "professora";
      const hora = m.ms
        ? new Date(m.ms).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })
        : "";
      return `<div class="chat-msg ${daProf ? "minha" : ""}">
        <div class="chat-msg-topo"><strong>${daProf ? "Você (professora)" : "Usuário"}</strong><span>${hora}</span></div>
        <p>${escaparHTML(m.texto || "")}</p>
      </div>`;
    }).join("");
    div.scrollTop = div.scrollHeight;
  });
}

function renderAdminUsuarios(div) {
  const lista = adminDados.usuarios.slice().sort((a, b) => (a.nome || "").localeCompare(b.nome || ""));
  const profs = lista.filter((u) => u.papel === "professor");
  const alunos = lista.filter((u) => u.papel === "estudante");
  const outros = lista.filter((u) => u.papel !== "professor" && u.papel !== "estudante");
  const escolas = new Set(lista.map((u) => u.escola).filter(Boolean)).size;

  const card = (u) => `
      <div class="admin-item">
        <div class="admin-item-info">
          <strong>${escaparHTML(u.nome || "Sem nome")}${u.bloqueado ? " 🚫" : ""}</strong>
          <span class="admin-sub">${escaparHTML(u.email || "")}${u.escola ? " · 🏫 " + escaparHTML(u.escola) : ""}${Array.isArray(u.series) && u.series.length ? " · " + escaparHTML(u.series.join(", ")) : ""}</span>
        </div>
        <div class="admin-acoes">
          <button class="btn-ghost compacto" data-acao="bloquear" data-id="${u.uid}" data-valor="${u.bloqueado ? "0" : "1"}">${u.bloqueado ? "✅ Desbloquear" : "🚫 Bloquear"}</button>
          <button class="btn-ghost compacto" data-acao="excluir-usuario" data-id="${u.uid}">🗑️ Excluir</button>
        </div>
      </div>`;

  div.innerHTML = `
    <p class="admin-resumo">${lista.length} usuário(s) · ${profs.length} professor(es) · ${alunos.length} estudante(s) · ${escolas} escola(s)</p>
    <div class="admin-colunas">
      <div class="admin-coluna">
        <h4 class="admin-coluna-titulo">🎒 Estudantes <span>${alunos.length}</span></h4>
        <div class="admin-lista">${alunos.map(card).join("") || `<p class="vazio">Nenhum estudante ainda.</p>`}</div>
      </div>
      <div class="admin-coluna">
        <h4 class="admin-coluna-titulo">👩🏽‍🏫 Professores <span>${profs.length}</span></h4>
        <div class="admin-lista">${profs.map(card).join("") || `<p class="vazio">Nenhum professor ainda.</p>`}</div>
      </div>
    </div>
    ${outros.length ? `
      <h4 class="admin-coluna-titulo">❓ Sem papel definido <span>${outros.length}</span></h4>
      <div class="admin-lista">${outros.map(card).join("")}</div>
    ` : ""}
  `;
}

function renderAdminMural(div) {
  const lista = adminDados.mural;
  div.innerHTML = `
    <p class="admin-resumo">${lista.length} mensagem(ns) no mural</p>
    ${lista.map((d) => `
      <div class="admin-item">
        <div class="admin-item-info">
          <strong>${escaparHTML(d.nome || "Anônimo")}${d.fixado ? " 📌" : ""}</strong>
          <span class="admin-sub">${d.turma ? "Turma " + escaparHTML(d.turma) : "Mural coletivo"} · ${escaparHTML((d.texto || "").slice(0, 140))}</span>
        </div>
        <div class="admin-acoes">
          <button class="btn-ghost compacto" data-acao="excluir-depoimento" data-id="${d.id}">🗑️ Apagar</button>
        </div>
      </div>
    `).join("") || `<p class="vazio">Nenhuma mensagem no mural.</p>`}
  `;
}

function renderAdminPerguntas(div) {
  const lista = adminDados.perguntas;
  div.innerHTML = `
    <p class="admin-resumo">${lista.length} pergunta(s) contribuída(s)</p>
    ${lista.map((p) => `
      <div class="admin-item">
        <div class="admin-item-info">
          <strong>${escaparHTML((p.enunciado || "Sem enunciado").slice(0, 120))}</strong>
          <span class="admin-sub">${escaparHTML(p.autorNome || "Autor desconhecido")}${p.tema ? " · " + escaparHTML(p.tema) : ""}</span>
        </div>
        <div class="admin-acoes">
          <button class="btn-ghost compacto" data-acao="excluir-pergunta" data-id="${p.id}">🗑️ Excluir</button>
        </div>
      </div>
    `).join("") || `<p class="vazio">Nenhuma pergunta contribuída ainda.</p>`}
  `;
}

function renderAdminMensagens(div) {
  const lista = adminDados.mensagens;
  div.innerHTML = `
    <p class="admin-resumo">${lista.length} mensagem(ns) no chat</p>
    ${lista.map((m) => `
      <div class="admin-item">
        <div class="admin-item-info">
          <strong>${escaparHTML(m.nome || "Professor")} · 🏫 ${escaparHTML(m.escola || "—")}</strong>
          <span class="admin-sub">${escaparHTML((m.texto || "").slice(0, 140))}</span>
        </div>
        <div class="admin-acoes">
          <button class="btn-ghost compacto" data-acao="excluir-mensagem" data-id="${m.id}">🗑️ Apagar</button>
        </div>
      </div>
    `).join("") || `<p class="vazio">Nenhuma mensagem no chat ainda.</p>`}
  `;
}

function renderAdminMensagensTurma(div) {
  const lista = adminDados.mensagensTurma;
  div.innerHTML = `
    <p class="admin-resumo">${lista.length} mensagem(ns) no chat das turmas</p>
    ${lista.map((m) => `
      <div class="admin-item">
        <div class="admin-item-info">
          <strong>${escaparHTML(m.nome || "Usuário")} · 👥 ${escaparHTML(m.turma || "—")}</strong>
          <span class="admin-sub">${escaparHTML((m.texto || "").slice(0, 140))}</span>
        </div>
        <div class="admin-acoes">
          <button class="btn-ghost compacto" data-acao="excluir-mensagem-turma" data-id="${m.id}">🗑️ Apagar</button>
        </div>
      </div>
    `).join("") || `<p class="vazio">Nenhuma mensagem no chat das turmas ainda.</p>`}
  `;
}

function renderAdminNovidades(div) {
  const lista = adminDados.novidades;
  div.innerHTML = `
    <div class="painel-bloco">
      <h3 class="secao-titulo">📢 Publicar novidade</h3>
      <p class="texto-ajuda">Todos os usuários verão um aviso e uma bolinha no menu até abrirem as novidades.</p>
      <div class="campo">
        <label class="perfil-rotulo" for="nov-titulo">Título</label>
        <input id="nov-titulo" type="text" maxlength="80" placeholder="Ex.: Novo: flash cards nas revisões!">
      </div>
      <div class="campo">
        <label class="perfil-rotulo" for="nov-texto">Mensagem</label>
        <textarea id="nov-texto" rows="3" maxlength="600" placeholder="Explique a novidade em poucas palavras..."></textarea>
      </div>
      <div class="campo">
        <label class="perfil-rotulo" for="nov-link">Link (opcional)</label>
        <input id="nov-link" type="text" maxlength="300" placeholder="https://...">
      </div>
      <div id="nov-aviso" class="aviso escondido"></div>
      <button id="btn-publicar-novidade" class="btn-principal">📢 Publicar para todos</button>
    </div>
    <p class="admin-resumo">${lista.length} novidade(s) publicada(s)</p>
    ${lista.map((n) => `
      <div class="admin-item">
        <div class="admin-item-info">
          <strong>${escaparHTML(n.titulo || "Novidade")}</strong>
          <span class="admin-sub">${escaparHTML((n.texto || "").slice(0, 140))}${n.link ? " · 🔗 tem link" : ""}</span>
        </div>
        <div class="admin-acoes">
          <button class="btn-ghost compacto" data-acao="excluir-novidade" data-id="${n.id}">🗑️ Apagar</button>
        </div>
      </div>
    `).join("") || `<p class="vazio">Nenhuma novidade publicada ainda.</p>`}
  `;

  const btn = document.getElementById("btn-publicar-novidade");
  if (btn) {
    btn.addEventListener("click", async () => {
      const aviso = document.getElementById("nov-aviso");
      const titulo = document.getElementById("nov-titulo").value.trim();
      const texto = document.getElementById("nov-texto").value.trim();
      const link = document.getElementById("nov-link").value.trim();
      if (!titulo || !texto) {
        aviso.className = "aviso erro";
        aviso.textContent = "Preencha o título e a mensagem.";
        exibir(aviso);
        return;
      }
      btn.disabled = true;
      try {
        await publicarNovidade(usuario, { titulo, texto, link });
        mostrarToast("Novidade publicada! 🔔 O push sai automaticamente em alguns minutos.");
        await carregarAdmin();
        carregarNovidades(false);
      } catch (e) {
        aviso.className = "aviso erro";
        aviso.textContent = "Erro ao publicar: " + e.message;
        exibir(aviso);
        btn.disabled = false;
      }
    });
  }
}

document.querySelectorAll(".admin-aba").forEach((b) => {
  b.addEventListener("click", () => {
    adminAba = b.dataset.admin;
    document.querySelectorAll(".admin-aba").forEach((x) => x.classList.toggle("ativa", x === b));
    carregarAdmin();
  });
});

document.getElementById("admin-conteudo").addEventListener("click", async (e) => {
  const btn = e.target.closest("button[data-acao]");
  if (!btn) return;
  // Trava de segurança: só admin (fora do papel de estudante) executa ações
  if (!podeAdministrar()) {
    mostrarToast("Acesso restrito à administração.", "erro");
    return;
  }
  const acao = btn.dataset.acao;
  const id = btn.dataset.id;
  try {
    if (acao === "bloquear") {
      const bloquear = btn.dataset.valor === "1";
      await atualizarUsuarioAdmin(id, { bloqueado: bloquear });
      mostrarToast(bloquear ? "Usuário bloqueado." : "Usuário desbloqueado.");
    } else if (acao === "excluir-usuario") {
      if (!confirm("Excluir o perfil deste usuário? Ele perderá o acesso aos dados.")) return;
      await excluirUsuarioAdmin(id);
      mostrarToast("Usuário excluído.");
    } else if (acao === "excluir-depoimento") {
      if (!confirm("Apagar esta mensagem do mural?")) return;
      await excluirDepoimento(id);
      mostrarToast("Mensagem do mural apagada.");
    } else if (acao === "excluir-pergunta") {
      if (!confirm("Excluir esta pergunta do banco?")) return;
      await excluirPergunta(id);
      mostrarToast("Pergunta excluída.");
    } else if (acao === "excluir-mensagem") {
      if (!confirm("Apagar esta mensagem do chat?")) return;
      await excluirMensagemEscola(id);
      mostrarToast("Mensagem do chat apagada.");
    } else if (acao === "excluir-mensagem-turma") {
      if (!confirm("Apagar esta mensagem do chat da turma?")) return;
      await excluirMensagemTurma(id);
      mostrarToast("Mensagem do chat da turma apagada.");
    } else if (acao === "excluir-novidade") {
      if (!confirm("Apagar esta novidade?")) return;
      await excluirNovidade(id);
      mostrarToast("Novidade apagada.");
    } else if (acao === "abrir-conversa") {
      conversaUid = id;
      renderAdmin();
      return;
    } else if (acao === "voltar-conversas") {
      if (conversaUnsub) { conversaUnsub(); conversaUnsub = null; }
      conversaUid = null;
      renderAdmin();
      return;
    } else if (acao === "excluir-conversa") {
      if (!confirm("Apagar esta conversa e todas as mensagens?")) return;
      await excluirConversaSuporte(id);
      mostrarToast("Conversa apagada.");
    } else {
      return;
    }
    await carregarAdmin();
  } catch (err) {
    mostrarToast("Erro: " + err.message, "erro");
  }
});

document.getElementById("btn-admin").addEventListener("click", abrirAdmin);
document.getElementById("btn-voltar-admin").addEventListener("click", () => {
  if (usuario && usuario.papel === "professor") abrirPainelProfessor();
  else abrirInicioEstudante();
});

// ============================================================
// MODO OFFLINE
// ============================================================
// Registra o service worker assim que o app abre (deixa o app funcionar sem internet)
registrarSW().then(() => atualizarStatusRede());
