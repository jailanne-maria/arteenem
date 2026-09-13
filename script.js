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
  const nomeTopo = document.getElementById("usuario-nome");

  if (!user) {
    usuario = null;
    minhaTurma = null;
    esconder(btnSair);
    esconder(btnMural);
    esconder(btnPerfil);
    esconder(btnExplorar);
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
      card.innerHTML = `
        <div class="turma-card-corpo">
          <span class="turma-nome">${t.nome}</span>
          <span class="turma-meta">${membros.length} estudante(s)</span>
          <span class="turma-cod">${t.codigo}</span>
        </div>
        ${controles}
      `;
      if (!modoOrganizar) {
        card.style.cursor = "pointer";
        card.addEventListener("click", () => abrirTurmaProfessor(t));
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
        .map((m) => `<span class="membro-tag clicavel" data-uid="${m.uid}">${m.nome}</span>`)
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
        </div>
      `;
      exibir(blocoInfo);
      esconder(blocoEntrar);
      return;
    }
  }
  minhaTurma = null;
  esconder(blocoInfo);
  exibir(blocoEntrar);
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
  const base = QUESTOES.filter((q) => areasSelecionadas.includes(q.area));
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
  return `
    <div class="recado ${d.fixado ? "fixado" : ""}">
      <div class="recado-avatar">${avatar}</div>
      <div class="recado-corpo">
        <div class="recado-cabeca">
          <span class="recado-nome clicavel" data-uid="${d.uid}">${d.fixado ? "📌 " : ""}${d.nome || "Anônimo"}</span>
          <span class="recado-tempo">${quando}</span>
        </div>
        <p class="recado-texto">${escaparHTML(d.texto || "")}</p>
        ${botaoFixar}
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

// Clique num colega da turma (abre o perfil)
document.getElementById("membros-turma").addEventListener("click", (e) => {
  const alvo = e.target.closest(".membro-tag.clicavel");
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

function renderMapaFases() {
  const mapa = document.getElementById("mapa-fases");
  mapa.innerHTML = "";
  FASES.forEach((f, i) => {
    const liberada = faseLiberada(i);
    const concluida = faseConcluida(f.id);
    const node = document.createElement("button");
    node.className = "fase-node" + (liberada ? "" : " bloqueada") + (concluida ? " concluida" : "");
    node.innerHTML = `
      <span class="fase-node-emoji">${liberada ? f.emoji : "🔒"}</span>
      <span class="fase-node-info">
        <span class="fase-node-nome">${f.nome}</span>
        <span class="fase-node-periodo">${f.periodo}</span>
      </span>
      <span class="fase-node-status">${concluida ? "✅ Concluída" : liberada ? "▶️ Jogar" : "Bloqueada"}</span>
    `;
    if (liberada) node.addEventListener("click", () => iniciarFase(f));
    mapa.appendChild(node);
  });
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
