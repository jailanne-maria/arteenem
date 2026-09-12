// ArteENEM — lógica do diagnóstico

const LETRAS = ["A", "B", "C", "D", "E"];
const CHAVE_RESULTADO = "arteenem_resultado";

let fila = [];            // questões da sessão atual
let indice = 0;           // questão atual
let respostas = [];       // { area, acertou }
let modoCompleto = true;  // se percorre todas as áreas

// ---------- Navegação entre telas ----------
function mostrarTela(id) {
  document.querySelectorAll(".tela").forEach((t) => t.classList.remove("ativa"));
  document.getElementById(id).classList.add("ativa");
  window.scrollTo({ top: 0, behavior: "smooth" });
}

// ---------- Tela inicial ----------
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

// ---------- Início do quiz ----------
function iniciarQuiz(areasSelecionadas) {
  modoCompleto = areasSelecionadas.length > 1;
  const base = QUESTOES.filter((q) => areasSelecionadas.includes(q.area));
  embaralhar(base);
  fila = base.map(prepararQuestao);
  indice = 0;
  respostas = [];
  document.getElementById("btn-reiniciar").classList.remove("escondido");
  mostrarTela("tela-quiz");
  renderQuestao();
}

// Cria uma cópia da questão com alternativas embaralhadas
// e o índice da correta remapeado — evita "a certa é sempre A"
function prepararQuestao(q) {
  const indices = q.alternativas.map((_, i) => i);
  embaralhar(indices);
  const novasAlternativas = indices.map((i) => q.alternativas[i]);
  const novaCorreta = indices.indexOf(q.correta);
  return { ...q, alternativas: novasAlternativas, correta: novaCorreta };
}

function embaralhar(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}

// ---------- Renderização da questão ----------
function renderQuestao() {
  const q = fila[indice];
  const area = AREAS[q.area];

  document.getElementById("progresso-area").textContent = `${area.icone} ${area.curto}`;
  document.getElementById("progresso-contagem").textContent = `${indice + 1} de ${fila.length}`;
  document.getElementById("progresso-fill").style.width = `${(indice / fila.length) * 100}%`;

  document.getElementById("questao-tema").textContent = q.tema;

  // Imagem de apoio (se houver)
  const imgDiv = document.getElementById("questao-imagem");
  if (q.imagem) {
    imgDiv.innerHTML = q.imagem;
    imgDiv.classList.remove("escondido");
  } else {
    imgDiv.innerHTML = "";
    imgDiv.classList.add("escondido");
  }

  // Texto de apoio (se houver)
  const apoioDiv = document.getElementById("questao-apoio");
  if (q.apoio) {
    apoioDiv.textContent = q.apoio;
    apoioDiv.classList.remove("escondido");
  } else {
    apoioDiv.textContent = "";
    apoioDiv.classList.add("escondido");
  }

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

  document.getElementById("questao-feedback").classList.add("escondido");
  document.getElementById("btn-proxima").classList.add("escondido");
}

// ---------- Resposta ----------
function responder(escolha) {
  const q = fila[indice];
  const acertou = escolha === q.correta;
  respostas.push({ area: q.area, acertou });

  const botoes = document.querySelectorAll(".alt");
  botoes.forEach((b, i) => {
    b.classList.add("travada");
    if (i === q.correta) b.classList.add("correta");
    else if (i === escolha) b.classList.add("errada");
  });

  const fb = document.getElementById("questao-feedback");
  fb.className = "feedback " + (acertou ? "ok" : "nao");
  fb.innerHTML = acertou
    ? `<strong>✅ Acertou!</strong>${q.explicacao}`
    : `<strong>❌ Não foi essa.</strong>${q.explicacao}`;
  fb.classList.remove("escondido");

  const btn = document.getElementById("btn-proxima");
  btn.textContent = indice + 1 < fila.length ? "Próxima →" : "Ver resultado →";
  btn.classList.remove("escondido");
}

// ---------- Próxima ----------
function proxima() {
  indice++;
  if (indice < fila.length) {
    renderQuestao();
  } else {
    finalizar();
  }
}

// ---------- Resultado ----------
function finalizar() {
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

  // Cabeçalho
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

  // Barras por área
  const barras = document.getElementById("barras-areas");
  barras.innerHTML = "";
  areasFeitas.forEach(([k, s]) => {
    const area = AREAS[k];
    const pct = Math.round((s.acertos / s.total) * 100);
    const item = document.createElement("div");
    item.className = "barra-item";
    item.innerHTML = `
      <div class="barra-topo">
        <strong>${area.icone} ${area.curto}</strong>
        <span>${s.acertos}/${s.total} · ${pct}%</span>
      </div>
      <div class="barra-track">
        <div class="barra-fill" style="width:${pct}%;background:${corDaBarra(pct)}"></div>
      </div>
    `;
    barras.appendChild(item);
  });

  // Destaque forte e fraco
  const ordenadas = areasFeitas
    .map(([k, s]) => ({ k, pct: (s.acertos / s.total) * 100 }))
    .sort((a, b) => b.pct - a.pct);

  const forte = ordenadas[0];
  const fraco = ordenadas[ordenadas.length - 1];

  document.getElementById("destaque-forte").innerHTML = forte
    ? `<span class="area-nome-destaque">${AREAS[forte.k].icone} ${AREAS[forte.k].curto}</span>
       <p>${Math.round(forte.pct)}% de acerto. Continue praticando para manter o nível!</p>`
    : "<p>Sem dados.</p>";

  document.getElementById("destaque-fraco").innerHTML =
    fraco && ordenadas.length > 1
      ? `<span class="area-nome-destaque">${AREAS[fraco.k].icone} ${AREAS[fraco.k].curto}</span>
         <p>${Math.round(fraco.pct)}% de acerto. É aqui que um pouco de estudo rende mais!</p>`
      : `<span class="area-nome-destaque">${AREAS[fraco.k].icone} ${AREAS[fraco.k].curto}</span>
         <p>Refaça o diagnóstico completo para comparar as áreas.</p>`;

  // Recomendações
  const rec = document.getElementById("recomendacoes");
  rec.innerHTML = "";
  ordenadas
    .slice()
    .reverse()
    .forEach((o) => {
      const area = AREAS[o.k];
      const dica = o.pct >= 80 ? "revisão leve para não esquecer" :
                   o.pct >= 50 ? "praticar questões e revisar erros" :
                   "estudar a teoria e resolver questões fáceis primeiro";
      const li = document.createElement("li");
      li.innerHTML = `<strong>${area.icone} ${area.curto}</strong> — ${dica}.`;
      rec.appendChild(li);
    });

  // Salva para mostrar na tela inicial
  const resultado = {
    data: new Date().toISOString(),
    pct: pctGeral,
    areas: ordenadas.map((o) => ({ area: o.k, pct: Math.round(o.pct) })),
  };
  try { localStorage.setItem(CHAVE_RESULTADO, JSON.stringify(resultado)); } catch {}

  mostrarTela("tela-resultado");
}

function corDaBarra(pct) {
  if (pct >= 70) return "var(--success)";
  if (pct >= 40) return "var(--warning)";
  return "var(--error)";
}

// ---------- Resultado anterior (tela inicial) ----------
function renderAnterior() {
  let salvo;
  try { salvo = JSON.parse(localStorage.getItem(CHAVE_RESULTADO)); } catch {}
  if (!salvo) return;

  const div = document.getElementById("resultado-anterior");
  const data = new Date(salvo.data).toLocaleDateString("pt-BR");
  const partes = salvo.areas
    .map((a) => `${AREAS[a.area].curto} ${a.pct}%`)
    .join(" · ");
  div.innerHTML = `📌 <strong>Último diagnóstico</strong> (${data}): média ${salvo.pct}% — ${partes}`;
  div.classList.remove("escondido");
}

// ---------- Reiniciar ----------
function reiniciar() {
  document.getElementById("btn-reiniciar").classList.add("escondido");
  renderAnterior();
  mostrarTela("tela-inicio");
}

// ---------- Eventos ----------
document.addEventListener("DOMContentLoaded", () => {
  renderAreas();
  renderAnterior();

  document.getElementById("btn-completo").addEventListener("click", () =>
    iniciarQuiz(Object.keys(AREAS))
  );
  document.getElementById("btn-proxima").addEventListener("click", proxima);
  document.getElementById("btn-reiniciar").addEventListener("click", reiniciar);
  document.getElementById("btn-refazer").addEventListener("click", () =>
    iniciarQuiz(Object.keys(AREAS))
  );
  document.getElementById("btn-voltar").addEventListener("click", reiniciar);
});
