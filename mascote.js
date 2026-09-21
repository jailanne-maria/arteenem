// NINA — mascote DONC (do grafite da Jailanne)
// Ele aparece em várias telas com um balão de fala dando dicas.

const MASCOTE_IMG = "img/mascote/donc.png";
const MASCOTE_NOME = "DONC";

const MASCOTE_FALAS = {
  inicio: [
    "Oi! Eu sou o DONC 🍄 Vamos começar pelo diagnóstico?",
    "Bora treinar? Cada questão é um passo pra sua vaga!",
    "Já escolheu seu curso? Isso muda tudo no seu plano!",
    "Estudar um pouquinho todo dia vale mais que estudar muito de uma vez.",
  ],
  objetivo: [
    "Escolhe seu curso que eu monto o plano com as disciplinas de maior peso!",
    "O peso de cada área muda conforme o curso. Escolha o seu!",
  ],
  diagnostico: [
    "Sem medo! O diagnóstico serve pra descobrir onde você está. 💪",
    "Responda com calma. Não é prova, é um mapa do seu momento.",
  ],
  resultado: [
    "Olha só seu resultado! Vamos montar o plano pra melhorar?",
    "Vi que você mandou bem em algumas áreas! Bora focar nas outras?",
  ],
  plano: [
    "Marque os tópicos que você já estudou — assim a gente vê o progresso!",
    "Foca primeiro nas áreas de peso máximo. É ali que a vaga é decidida!",
  ],
  jogo: [
    "Bora jogar? Cada acerto é um passo pra sua vaga! 🎡",
    "Errou? Sem problema — errar aqui é melhor que errar na prova!",
  ],
  biblioteca: [
    "Ler também é treino! 📚 Escolhe um livro e vem!",
    "Tem clássicos e revistas da UFAC aqui. Aproveita!",
  ],
  atividades: [
    "Faz a atividade e me conta o que achou!",
    "A professora pode te dar um feedback por aqui. 👀",
  ],
  revisao: [
    "Os flash cards são ótimos pra memorizar. Vira e revira! 🃏",
    "Leia a revisão, vira os cards e depois faz a atividade.",
  ],
  simulado: [
    "Simulado é treino de verdade. Foca no tempo! ⏱️",
    "Leia a redação com calma — ela vale muito!",
  ],
  noticias: [
    "De olho na coisa! 📰 Ler notícia ajuda na redação e na interpretação.",
  ],
  curriculo: [
    "Aqui estão as habilidades da BNCC e os temas do Acre. 📚",
  ],
  suporte: [
    "Precisa de ajuda? Escreve aqui que a professora responde!",
  ],
};

// Escolhe uma fala (varia a cada vez que abre)
function falaDoMascote(chave) {
  const lista = MASCOTE_FALAS[chave] || MASCOTE_FALAS.inicio;
  return lista[Math.floor(Math.random() * lista.length)];
}

// Desenha o mascote com o balão dentro do container
function renderMascote(idContainer, chave, textoForcado) {
  const div = document.getElementById(idContainer);
  if (!div) return;
  const texto = textoForcado || falaDoMascote(chave);
  // O botão "Falar com a professora" aparece para todo mundo,
  // menos para a própria professora-admin (que não vai falar consigo mesma)
  const podeFalar = typeof podeAdministrar === "function" ? !podeAdministrar() : true;
  div.innerHTML = `
    <img class="mascote-img" src="${MASCOTE_IMG}" alt="${MASCOTE_NOME}, o mascote do NINA" loading="lazy">
    <div class="mascote-balao">
      <span class="mascote-nome">${MASCOTE_NOME}</span>
      <p>${escaparHTML(texto)}</p>
      ${podeFalar ? `<button class="mascote-acao" type="button">💬 Falar com a professora</button>` : ""}
      <button class="mascote-fechar" type="button" aria-label="Fechar">✖</button>
    </div>`;
  const fechar = div.querySelector(".mascote-fechar");
  if (fechar) fechar.addEventListener("click", () => esconder(div));
  const falar = div.querySelector(".mascote-acao");
  if (falar) {
    falar.addEventListener("click", () => {
      if (typeof abrirSuporte === "function") abrirSuporte();
    });
  }
  exibir(div);
}

if (typeof module !== "undefined") {
  module.exports = { MASCOTE_FALAS, falaDoMascote, MASCOTE_IMG };
}
