// ============================================================
// TEATRO DO OPRIMIDO — jogos por categoria + mediação do professor
// Base: Augusto Boal, "Jogos para atores e não-atores" e "Teatro do Oprimido"
// ============================================================

const TEATRO_INTRO = "No Teatro do Oprimido ninguém é só espectador: todo mundo joga. O professor não dirige a cena, ele é curinga — provoca, pergunta, segura o tempo e protege o grupo. A regra de ouro é simples: primeiro se joga, depois se conversa sobre o que apareceu.";

const TEATRO_CATEGORIAS = [
  {
    nome: "1 · Aquecimento e sentidos",
    resumo: "Tirar o corpo do lugar comum antes de qualquer cena. Cinco a dez minutos bastam.",
    jogos: [
      {
        nome: "Sentir o que se toca",
        objetivo: "Despertar a percepção pelo tato e pelo espaço.",
        duracao: "8 a 10 min",
        materiais: "Nenhum",
        passos: [
          "Todos de olhos fechados, caminham devagar ocupando o espaço sem se chocar.",
          "Ao sinal, tocam o ombro de alguém e continuam, trocando de par a cada sinal.",
          "Depois, tocando um objeto da sala, descrevem em uma palavra o que sentiram.",
        ],
        mediacao: "Fale baixo, dê sinais curtos e não corrija. O objetivo é desacelerar, não acertar.",
      },
      {
        nome: "Ocupar o espaço",
        objetivo: "Perceber o coletivo e o próprio corpo em relação ao outro.",
        duracao: "5 a 8 min",
        materiais: "Nenhum",
        passos: [
          "Todos andam em ritmo normal, preenchendo os espaços vazios.",
          "O professor muda o ritmo: lento, rápido, parado, congelado.",
          "Ao comando 'grupo de três', formam trios e se olham por dez segundos.",
        ],
        mediacao: "Observe quem evita olhar. Depois pergunte: 'o que foi mais difícil, andar ou ser visto?'",
      },
      {
        nome: "Espelho",
        objetivo: "Escuta, atenção e confiança na dupla.",
        duracao: "8 min",
        materiais: "Nenhum",
        passos: [
          "Em duplas, um é o modelo e o outro o espelho.",
          "O modelo se move devagar; o espelho reproduz sem falar.",
          "Trocam de papel a cada dois minutos, sem aviso prévio.",
        ],
        mediacao: "Peça que o espelho não antecipe. A tentação de liderar é o assunto da conversa.",
      },
    ],
  },
  {
    nome: "2 · Jogos de imagem",
    resumo: "O corpo vira escultura e a escultura vira pergunta. É a base do Teatro-Imagem.",
    jogos: [
      {
        nome: "Estátua",
        objetivo: "Traduzir ideia em corpo, sem palavras.",
        duracao: "10 min",
        materiais: "Nenhum",
        passos: [
          "Um participante modela o corpo de outro até formar uma imagem de um tema (ex.: medo).",
          "O grupo olha em silêncio por 20 segundos e diz uma palavra.",
          "Quem foi modelado fala primeiro: 'eu senti...'.",
        ],
        mediacao: "Nunca toque no corpo de ninguém sem perguntar. Modelagem com permissão é regra.",
      },
      {
        nome: "Imagem do grupo",
        objetivo: "Construir uma leitura coletiva de um problema real.",
        duracao: "15 a 20 min",
        materiais: "Nenhum",
        passos: [
          "Divida em grupos de cinco e sorteie um tema (desmatamento, racismo, evasão escolar).",
          "Cada grupo monta uma imagem congelada, sem texto.",
          "Os outros grupos 'leem' a imagem em voz alta; depois o grupo explica a intenção.",
        ],
        mediacao: "A diferença entre o que se quis dizer e o que foi lido é o conteúdo da aula.",
      },
      {
        nome: "Imagem e contra-imagem",
        objetivo: "Ensaio da transformação: como seria se fosse diferente?",
        duracao: "20 min",
        materiais: "Nenhum",
        passos: [
          "Montada a imagem de opressão, peça a contra-imagem: a mesma cena em que a opressão não existe.",
          "Compare as duas em silêncio.",
          "Pergunte: qual é o primeiro passo, na vida real, entre uma e outra?",
        ],
        mediacao: "Não aceite solução mágica. A pergunta é sobre o passo possível, não sobre o final feliz.",
      },
    ],
  },
  {
    nome: "3 · Ritmo e movimento",
    resumo: "Ritmo coletivo cria pertencimento antes de qualquer discussão.",
    jogos: [
      {
        nome: "Ritmo do nome",
        objetivo: "Memorizar nomes e entrar em sintonia.",
        duracao: "10 min",
        materiais: "Nenhum",
        passos: [
          "Em roda, cada pessoa diz o nome marcando o ritmo com palmas.",
          "O grupo repete o nome e o ritmo.",
          "Na segunda volta, o nome é acompanhado de um gesto.",
        ],
        mediacao: "Bom para o primeiro dia. Quem esquece o nome paga uma prenda curta (um gesto).",
      },
      {
        nome: "Máquina de ritmos",
        objetivo: "Escuta e cooperação sem fala.",
        duracao: "12 min",
        materiais: "Nenhum",
        passos: [
          "Uma pessoa entra no centro com um movimento e um som repetido.",
          "Outra se acopla com movimento e som compatíveis; seguem até formar uma máquina.",
          "Depois, a máquina acelera, desacelera e para.",
        ],
        mediacao: "Interrompa quando vir alguém atropelando o outro. O exercício é sobre encaixar, não competir.",
      },
    ],
  },
  {
    nome: "4 · Máscara e ritual",
    resumo: "Quando o rosto não expressa, o corpo é obrigado a falar.",
    jogos: [
      {
        nome: "Máscara neutra",
        objetivo: "Suspender a expressão facial e ampliar a linguagem do corpo.",
        duracao: "15 min",
        materiais: "Uma máscara neutra ou um pedaço de papelão com dois buracos",
        passos: [
          "Quem usa a máscara caminha, senta, pega um objeto, sempre sem expressão.",
          "O grupo descreve o que entendeu do corpo.",
          "Troca quem usa a máscara a cada dois minutos.",
        ],
        mediacao: "Explique que máscara não é esconderijo: é lente. O corpo passa a ser lido em detalhe.",
      },
    ],
  },
  {
    nome: "5 · Improvisação, Teatro-Jornal e Teatro-Fórum",
    resumo: "A cena deixa de ser espetáculo e passa a ser ensaio de mudança.",
    jogos: [
      {
        nome: "Teatro-Jornal",
        objetivo: "Transformar notícia em cena e notícia em pergunta.",
        duracao: "1 aula",
        materiais: "Recortes de jornal ou notícias do celular",
        passos: [
          "Cada grupo escolhe uma notícia e a encena em três minutos, sem opinar.",
          "Depois, encena a mesma notícia com o desfecho que gostaria que tivesse.",
          "Compare: o que mudou no meio da cena?",
        ],
        mediacao: "Cuidado com exposição de pessoas reais. Use nomes fictícios e evite casos da própria turma.",
      },
      {
        nome: "Teatro-Fórum",
        objetivo: "Ensaar coletivamente uma saída para uma opressão apresentada.",
        duracao: "1 a 2 aulas",
        materiais: "Nenhum",
        passos: [
          "Um grupo apresenta uma cena curta (3 a 5 min) em que alguém é oprimido.",
          "A cena se repete; qualquer pessoa da plateia grita 'stop' e substitui o oprimido.",
          "A cena continua a partir dali, tentando uma ação diferente.",
        ],
        mediacao: "O professor é curinga: interrompe se a solução for violenta ou humilhante e devolve a pergunta ao grupo.",
      },
      {
        nome: "Teatro Invisível",
        objetivo: "Levar o tema para fora da sala, sem anunciar que é teatro.",
        duracao: "Projeto de 2 semanas",
        materiais: "Autorização da escola",
        passos: [
          "Escolha um tema do cotidiano (fila, assédio, desperdício).",
          "Prepare uma cena curta que caiba no recreio.",
          "Realize com autorização e combine como encerrar sem constranger ninguém.",
        ],
        mediacao: "Só faça com autorização da gestão e nunca em situação de risco. Se não houver segurança, troque por Teatro-Fórum.",
      },
    ],
  },
];

function teatroEsc(t) {
  return String(t == null ? "" : t)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function teatroRender() {
  const alvo = document.getElementById("teatro-lista");
  if (!alvo) return;
  alvo.innerHTML = TEATRO_CATEGORIAS.map((cat, i) => {
    const jogos = cat.jogos.map((j) => `
      <details class="teatro-jogo">
        <summary>
          <strong>${teatroEsc(j.nome)}</strong>
          <span class="teatro-meta">${teatroEsc(j.duracao)}</span>
        </summary>
        <p class="teatro-objetivo"><strong>Objetivo:</strong> ${teatroEsc(j.objetivo)}</p>
        <p class="teatro-materiais"><strong>Materiais:</strong> ${teatroEsc(j.materiais)}</p>
        <ol class="teatro-passos">${j.passos.map((p) => `<li>${teatroEsc(p)}</li>`).join("")}</ol>
        <p class="teatro-mediacao"><strong>Como conduzir:</strong> ${teatroEsc(j.mediacao)}</p>
      </details>`).join("");

    return `
      <section class="teatro-categoria">
        <h3 class="secao-titulo">${teatroEsc(cat.nome)}</h3>
        <p class="teatro-resumo">${teatroEsc(cat.resumo)}</p>
        ${jogos}
      </section>`;
  }).join("");
}

// ---------- fichamento do professor ----------
const NOMES_JOGOS = (() => {
  const lista = [];
  TEATRO_CATEGORIAS.forEach((c) => c.jogos.forEach((j) => lista.push(j.nome)));
  return lista;
})();

function fichaPreencherSelect() {
  const sel = document.getElementById("ficha-jogo");
  if (!sel || sel.options.length) return;
  sel.innerHTML = NOMES_JOGOS.map((n) => `<option value="${teatroEsc(n)}">${teatroEsc(n)}</option>`).join("");
}

function fichaDataHoje() {
  const campo = document.getElementById("ficha-data");
  if (campo && !campo.value) campo.value = new Date().toISOString().slice(0, 10);
}

function fichaTurmaPadrao() {
  const campo = document.getElementById("ficha-turma");
  if (campo && !campo.value && typeof minhaTurma !== "undefined" && minhaTurma && minhaTurma.nome) {
    campo.value = minhaTurma.nome;
  }
}

function fichaMsg(texto, tipo) {
  const m = document.getElementById("ficha-msg");
  if (!m) return;
  m.textContent = texto || "";
  m.className = "escrita-msg" + (tipo ? " " + tipo : "");
}

async function fichaSalvar() {
  const user = typeof usuarioAtual === "function" ? usuarioAtual() : null;
  if (!user) return fichaMsg("entre na sua conta para salvar", "erro");

  const jogo = (document.getElementById("ficha-jogo") || {}).value || "";
  const data = (document.getElementById("ficha-data") || {}).value || "";
  const turma = (document.getElementById("ficha-turma") || {}).value || "";
  const fiz = (document.getElementById("ficha-fiz") || {}).value || "";
  const funcionou = (document.getElementById("ficha-funcionou") || {}).value || "";
  const ajustar = (document.getElementById("ficha-ajustar") || {}).value || "";

  if (!jogo) return fichaMsg("escolha o jogo aplicado", "erro");
  if (fiz.trim().length < 20) return fichaMsg("descreva o que você fez (mínimo 20 caracteres)", "erro");

  fichaMsg("salvando...");
  try {
    await firebase.firestore().collection("fichamentos").add({
      uid: user.uid,
      professor: (typeof usuario !== "undefined" && usuario && usuario.nome) ? usuario.nome : (user.displayName || "Professor(a)"),
      codigo: (typeof minhaTurma !== "undefined" && minhaTurma && minhaTurma.codigo) ? minhaTurma.codigo : null,
      jogo,
      data,
      turma,
      oQueFiz: fiz.trim(),
      oQueFuncionou: funcionou.trim(),
      oQueAjustar: ajustar.trim(),
      criadoEm: firebase.firestore.FieldValue.serverTimestamp(),
    });
    fichaMsg("fichamento salvo ✓", "ok");
    ["ficha-fiz", "ficha-funcionou", "ficha-ajustar"].forEach((id) => {
      const el = document.getElementById(id);
      if (el) el.value = "";
    });
    fichaListar();
  } catch (e) {
    fichaMsg("não foi possível salvar: " + e.message, "erro");
  }
}

async function fichaListar() {
  const alvo = document.getElementById("ficha-lista");
  const user = typeof usuarioAtual === "function" ? usuarioAtual() : null;
  if (!alvo || !user) return;
  try {
    const snap = await firebase.firestore().collection("fichamentos")
      .where("uid", "==", user.uid).limit(20).get();
    const itens = [];
    snap.forEach((doc) => itens.push(doc.data()));
    itens.sort((a, b) => String(b.data || "").localeCompare(String(a.data || "")));
    alvo.innerHTML = itens.length
      ? itens.slice(0, 8).map((f) => `
          <li>
            <strong>${teatroEsc(f.jogo)}</strong>
            <span class="ficha-meta">${teatroEsc(f.data || "")}${f.turma ? " · " + teatroEsc(f.turma) : ""}</span>
            <p>${teatroEsc(f.oQueFiz)}</p>
          </li>`).join("")
      : "<li class=\"bingo-vazio\">Nenhum fichamento ainda.</li>";
  } catch (e) {
    alvo.innerHTML = "<li class=\"bingo-vazio\">Não foi possível carregar os fichamentos.</li>";
  }
}
function teatroAbrirTela() {
  teatroRender();
  if (typeof mostrarTela === "function") mostrarTela("tela-teatro");
}

document.addEventListener("DOMContentLoaded", () => {
  const btn = document.getElementById("btn-teatro");
  if (btn) btn.addEventListener("click", teatroAbrirTela);
  const voltar = document.getElementById("btn-voltar-teatro");
  if (voltar) voltar.addEventListener("click", () => {
    if (typeof mostrarTela === "function") mostrarTela("tela-inicio");
  });
  const intro = document.getElementById("teatro-intro");
  if (intro) intro.textContent = TEATRO_INTRO;
});
