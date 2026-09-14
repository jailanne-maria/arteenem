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

// ---------- Estado global ----------
let usuario = null;       // { uid, nome, email, foto, papel }
let minhaTurma = null;    // { id, nome, codigo } do estudante
let turmaAtualProf = null; // turma aberta no painel do professor

// Quiz
let fila = [];
let indice = 0;
let respostas = [];

// Perguntas contribuídas por professores (carregadas do Firestore)
let perguntasExtras = [];

// Banco completo (fixas + contribuídas), usado no diagnóstico
function bancoDePerguntas() {
  return QUESTOES.concat(perguntasExtras);
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
    esconder(nomeTopo);
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
  nomeTopo.textContent = usuario.nome.split(" ")[0];
  exibir(nomeTopo);
  exibir(btnSair);
  exibir(btnMural);
  exibir(btnPerfil);
  exibir(btnExplorar);
  exibir(btnEca);
  exibir(btnJogo);

  // Aviso do ECA a cada login (uma vez por sessão)
  mostrarAvisoECA();

  // Carrega as perguntas contribuídas (banco compartilhado)
  listarPerguntas()
    .then((ps) => { perguntasExtras = ps; })
    .catch(() => {});

  if (!usuario.papel) {
    mostrarTela("tela-papel");
  } else if (usuario.papel === "professor") {
    abrirPainelProfessor();
  } else {
    abrirInicioEstudante();
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
    if (papel === "professor") abrirPainelProfessor();
    else abrirInicioEstudante();
  });
});

// ============================================================
// PROFESSOR
// ============================================================
async function abrirPainelProfessor() {
  document.getElementById("prof-saudacao").textContent =
    `Gerencie suas turmas e acompanhe o desempenho da turma, ${usuario.nome.split(" ")[0]}.`;
  mostrarTela("tela-professor");
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
  await carregarTurmaEstudante();
  mostrarTela("tela-inicio");
}

async function carregarTurmaEstudante() {
  const blocoInfo = document.getElementById("bloco-turma-aluno");
  const blocoEntrar = document.getElementById("bloco-entrar-turma");

  if (usuario.turmaAtual) {
    const turma = await buscarTurma(usuario.turmaAtual).catch(() => null);
    if (turma) {
      minhaTurma = turma;
      document.getElementById("turma-aluno-info").innerHTML = `
        <div class="turma-aluno">
          <div>
            <strong>${turma.nome}</strong><br>
            <span class="turma-cod">${turma.codigo}</span>
          </div>
          <button class="btn-sair-turma" id="btn-sair-turma">🚪 Sair da turma</button>
        </div>
      `;
      document.getElementById("btn-sair-turma").addEventListener("click", sairDaTurma);
      exibir(blocoInfo);
      esconder(blocoEntrar);
      return;
    }
  }
  minhaTurma = null;
  esconder(blocoInfo);
  exibir(blocoEntrar);
}

async function sairDaTurma() {
  if (!minhaTurma) return;
  if (!confirm(`Sair da turma "${minhaTurma.nome}"?`)) return;
  try {
    await removerMembro(minhaTurma.codigo, usuario.uid);
    usuario.turmaAtual = null;
    await salvarUsuario(usuario.uid, { turmaAtual: null }).catch(() => {});
    minhaTurma = null;
    await carregarTurmaEstudante();
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
    usuario.turmaAtual = turma.codigo;
    await salvarUsuario(usuario.uid, { turmaAtual: turma.codigo }).catch(() => {});
    minhaTurma = turma;
    aviso.className = "aviso ok";
    aviso.textContent = `✅ Você entrou na turma ${turma.nome}!`;
    exibir(aviso);
    document.getElementById("input-codigo").value = "";
    await carregarTurmaEstudante();
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
  const plano = gerarPlano({ pct: pctGeral, areas: areasMapa });
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
    <p class="plano-intro">Seu roteiro foi montado a partir do seu desempenho: comece pelas áreas com prioridade mais alta.</p>
    <div class="plano-grid">${prioridades}</div>
    <h4 class="plano-subtitulo">🗓️ Sugestão de rotina semanal</h4>
    <div class="cronograma">${cronograma}</div>
  `;
}

function renderRanking(container, ranking, uidAtual) {
  if (!ranking.length) {
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
async function abrirMural() {
  mostrarTela("tela-mural");
  await carregarDepoimentos();
}

async function carregarDepoimentos() {
  const lista = document.getElementById("mural-lista");
  lista.innerHTML = "<p class='vazio'>Carregando recados…</p>";
  try {
    const depoimentos = await listarDepoimentos();
    if (!depoimentos.length) {
      lista.innerHTML = "<p class='vazio'>Nenhum recado ainda. Seja a primeira pessoa a escrever! ✍️</p>";
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
  const admin = ehAdmin();
  const botaoFixar = admin
    ? `<button class="recado-fixar" data-id="${d.id}" data-fixado="${d.fixado ? "1" : "0"}">${d.fixado ? "📌 Desafixar" : "📌 Fixar"}</button>`
    : "";

  const curtidas = d.curtidas || [];
  const curtiu = usuario && curtidas.includes(usuario.uid);
  const botaoCurtir = `<button class="recado-curtir ${curtiu ? "curtido" : ""}" data-id="${d.id}" data-curtiu="${curtiu ? "1" : "0"}">
      <span class="coracao">💚</span>
      <span class="curtidas-num">${curtidas.length}</span>
    </button>`;

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
    await postarDepoimento(usuario, texto);
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

function preencherPerfil(p) {
  document.getElementById("perfil-nome").textContent = p.nome || "Usuário";
  const papel = p.papel === "professor" ? "👩🏽‍🏫 Professor(a)" : "🎒 Estudante";
  document.getElementById("perfil-papel").textContent = papel;

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

function modoPerfil(editando) {
  perfilEmEdicao = editando;
  if (editando) {
    exibir(document.getElementById("perfil-edit"));
    esconder(document.getElementById("perfil-view"));
    exibir(document.getElementById("btn-editar-perfil"));
    document.getElementById("btn-editar-perfil").textContent = "Cancelar";
  } else {
    esconder(document.getElementById("perfil-edit"));
    exibir(document.getElementById("perfil-view"));
    exibir(document.getElementById("btn-editar-perfil"));
    document.getElementById("btn-editar-perfil").textContent = "✏️ Editar perfil";
  }
}

function abrirMeuPerfil() {
  preencherPerfil(usuario);
  exibir(document.getElementById("btn-editar-perfil"));
  modoPerfil(false);
  mostrarTela("tela-perfil");
}

async function abrirPerfilDe(uid) {
  if (uid === usuario.uid) return abrirMeuPerfil();
  const p = await carregarUsuario(uid).catch(() => null);
  if (!p) return;
  preencherPerfil(p);
  esconder(document.getElementById("btn-editar-perfil"));
  modoPerfil(false);
  mostrarTela("tela-perfil");
}

document.getElementById("btn-perfil").addEventListener("click", abrirMeuPerfil);

document.getElementById("btn-editar-perfil").addEventListener("click", () => {
  if (perfilEmEdicao) {
    // Cancelar
    preencherPerfil(usuario);
    modoPerfil(false);
  } else {
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
  try {
    await salvarUsuario(usuario.uid, dados);
    Object.assign(usuario, dados);
    aviso.className = "aviso ok";
    aviso.textContent = "✅ Perfil salvo!";
    exibir(aviso);
    setTimeout(() => esconder(aviso), 2500);
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

function minhasFigurinhas() {
  return (usuario && usuario.figurinhas) || [];
}

function abrirJogo() {
  renderAlbum();
  esconder(document.getElementById("jogo-painel"));
  document.getElementById("btn-girar").disabled = false;
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

  const s = Math.floor(Math.random() * 4); // setor sorteado
  const alvo = (315 - s * 90 + 360) % 360;
  anguloRoleta += 5 * 360 + (((alvo - (anguloRoleta % 360)) % 360) + 360) % 360;
  document.getElementById("roleta").style.transform = `rotate(${anguloRoleta}deg)`;

  setTimeout(() => {
    girando = false;
    btn.disabled = false;
    btn.textContent = "🎡 Girar a roleta";
    jogoAreaAtual = ORDEM_ROLETA[s];
    mostrarPerguntaDaArea(jogoAreaAtual);
  }, 4200);
});

function mostrarPerguntaDaArea(area) {
  const banco = bancoDePerguntas().filter((q) => q.area === area);
  if (!banco.length) {
    alert("Ainda não há perguntas dessa área.");
    return;
  }
  jogoQuestaoAtual = banco[Math.floor(Math.random() * banco.length)];
  jogoRespondido = false;

  const info = AREAS[area] || { icone: "", curto: area };
  document.getElementById("jogo-area-tag").textContent = `${info.icone} ${info.curto}`;
  document.getElementById("jogo-enunciado").textContent = jogoQuestaoAtual.enunciado;

  const alts = document.getElementById("jogo-alternativas");
  alts.innerHTML = "";
  jogoQuestaoAtual.alternativas.forEach((texto, i) => {
    const b = document.createElement("button");
    b.className = "alt";
    b.innerHTML = `<span class="alt-letra">${LETRAS[i]}</span><span>${texto}</span>`;
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
    const nova = await ganharFigurinha(jogoAreaAtual);
    if (nova) {
      fb.innerHTML = `🎉 <strong>Acertou! Você ganhou a figurinha ${nova.emoji} ${nova.nome}!</strong><br>${q.explicacao || ""}`;
    } else {
      fb.innerHTML = `🎉 <strong>Acertou!</strong> Você já tem todas as figurinhas dessa área! 🌟<br>${q.explicacao || ""}`;
    }
  } else {
    fb.innerHTML = `❌ <strong>Não foi essa.</strong> Tente de novo girando a roleta!<br>${q.explicacao || ""}`;
  }
  fb.classList.remove("escondido");
  renderAlbum();
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
      <div class="figurinha ${f.raridade} area-${f.area} ${tem ? "" : "bloqueada"}">
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
