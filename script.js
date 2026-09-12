// ArteENEM — autenticação, turmas, ranking e diagnóstico

const LETRAS = ["A", "B", "C", "D", "E"];
const CHAVE_RESULTADO = "arteenem_resultado";

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
  const nomeTopo = document.getElementById("usuario-nome");

  if (!user) {
    usuario = null;
    minhaTurma = null;
    esconder(btnSair);
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
    const turmas = await listarTurmasDoProfessor(usuario.uid);
    if (!turmas.length) {
      lista.innerHTML = "<p class='vazio'>Você ainda não criou turmas. Crie a primeira acima!</p>";
      return;
    }
    lista.innerHTML = "";
    for (const t of turmas) {
      const membros = await listarMembros(t.codigo).catch(() => []);
      const btn = document.createElement("button");
      btn.className = "turma-card";
      btn.innerHTML = `
        <span class="turma-nome">${t.nome}</span>
        <span class="turma-meta">${membros.length} estudante(s)</span>
        <span class="turma-cod">${t.codigo}</span>
      `;
      btn.addEventListener("click", () => abrirTurmaProfessor(t));
      lista.appendChild(btn);
    }
  } catch (e) {
    lista.innerHTML = `<p class='vazio'>Erro ao carregar turmas: ${e.message}</p>`;
  }
}

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
  const membrosDiv = document.getElementById("membros-turma");
  stats.innerHTML = "<p class='vazio'>Carregando…</p>";
  rankingDiv.innerHTML = "";
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

    if (membros.length) {
      membrosDiv.innerHTML = membros
        .map((m) => `<span class="membro-tag">${m.nome}</span>`)
        .join("");
    } else {
      membrosDiv.innerHTML = "<p class='vazio'>Nenhum estudante entrou ainda.</p>";
    }
  } catch (e) {
    stats.innerHTML = `<p class='vazio'>Erro: ${e.message}</p>`;
  }
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
  respostas.push({ area: q.area, acertou });

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
