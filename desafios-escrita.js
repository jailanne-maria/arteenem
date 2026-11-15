// ============================================================
// DESAFIOS DE ESCRITA — perguntas por competência da BNCC
// Coleção Firestore: escritas/{uid}_{id}
// ============================================================

const DESAFIOS_ESCRITA = [
  {
    id: "d1",
    competencia: "Língua Portuguesa · leitura e escrita",
    titulo: "Por que é importante ler e escrever?",
    pergunta: "Por que é importante ler e escrever? Responda com um exemplo da sua vida.",
    dica: "Comece pelo que muda na prática: o que você consegue fazer quando entende um texto?",
  },
  {
    id: "d2",
    competencia: "Compreensão leitora",
    titulo: "O que é compreensão?",
    pergunta: "O que é compreensão? Cite pelo menos dois exemplos.",
    dica: "Compreender não é decorar: é conseguir explicar com as suas palavras e usar em outra situação.",
  },
  {
    id: "d3",
    competencia: "BNCC 1 · Conhecimento",
    titulo: "Conhecimento e vida real",
    pergunta: "Como o conhecimento escolar pode mudar a vida de uma comunidade? Dê um exemplo concreto.",
    dica: "Escolha um problema do seu bairro e mostre o que saber mais sobre ele mudaria.",
  },
  {
    id: "d4",
    competencia: "BNCC 2 · Pensamento científico",
    titulo: "Uma pergunta de pesquisa",
    pergunta: "Escolha um assunto e formule uma pergunta que poderia ser investigada com dados. Como você coletaria esses dados?",
    dica: "Pergunta boa é respondível: diga onde, com quem e como você mediria.",
  },
  {
    id: "d5",
    competencia: "BNCC 3 · Repertório cultural",
    titulo: "Arte e repertório",
    pergunta: "O que uma obra de arte pode dizer que um texto não diz? Use uma obra que você conhece.",
    dica: "Fale do que você viu, ouviu ou sentiu — não do que 'significa' em geral.",
  },
  {
    id: "d6",
    competencia: "BNCC 4 · Comunicação",
    titulo: "Explicar para quem não sabe",
    pergunta: "Explique um conceito que você aprendeu este ano para alguém que nunca ouviu falar dele. Use no máximo cinco linhas.",
    dica: "Sem palavra difícil. Se precisar usar, explique antes.",
  },
  {
    id: "d7",
    competencia: "BNCC 5 · Cultura digital",
    titulo: "Informação e desinformação",
    pergunta: "Como você decide se uma informação que circula nas redes é confiável? Descreva o caminho que você usa.",
    dica: "Liste os passos na ordem: origem, data, autor, outra fonte independente.",
  },
  {
    id: "d8",
    competencia: "BNCC 7 · Argumentação",
    titulo: "Defender uma ideia",
    pergunta: "Escolha um tema polêmico da sua escola e defenda uma posição em três argumentos e um contra-argumento.",
    dica: "Antecipar a objeção do outro é o que separa opinião de argumento.",
  },
  {
    id: "d9",
    competencia: "BNCC 9 · Empatia e cooperação",
    titulo: "O lugar do outro",
    pergunta: "Conte uma situação em que você mudou de opinião ao escutar alguém. O que te fez mudar?",
    dica: "Narre o antes, o momento da escuta e o depois.",
  },
  {
    id: "d10",
    competencia: "BNCC 10 · Responsabilidade e cidadania",
    titulo: "Uma ação possível",
    pergunta: "Que ação coletiva poderia melhorar a sua escola em um mês? Quem precisaria participar e o que você faria primeiro?",
    dica: "Proposta que depende de outra pessoa precisa dizer quem e como.",
  },
  {
    id: "d11",
    competencia: "Arte · processo de criação",
    titulo: "Do erro ao método",
    pergunta: "Descreva um erro que você cometeu em um trabalho e o que aprendeu com ele. O que faria diferente?",
    dica: "Erro sem consequência é anedota; conte o que mudou no seu jeito de fazer.",
  },
  {
    id: "d12",
    competencia: "Leitura literária",
    titulo: "O que ficou do texto",
    pergunta: "Escolha um texto, livro ou música e conte o que ficou com você depois de terminar.",
    dica: "Não resuma: diga o que ficou, mesmo que seja uma imagem ou uma frase.",
  },
];

const ESCRITA_MIN = 120;

// ---------- temas de redação (repertório a partir do noticiário) ----------
const TEMAS_REDACAO = [
  {
    titulo: "SUS e a privatização da saúde",
    contexto: "O Sistema Único de Saúde é direito de todos e dever do Estado (art. 196 da Constituição) e atende a maior parte da população. Em períodos eleitorais, volta ao noticiário a proposta de ampliar planos privados e terceirizar serviços.",
    disputa: "Saúde como direito universal x saúde como serviço comprado; subfinanciamento crônico x alegação de má gestão; filas e desigualdade de acesso x promessa de eficiência do setor privado.",
    repertorio: "CF/88, arts. 196 a 200 · Lei nº 8.080/1990 (Lei Orgânica da Saúde) · Cobertura Universal de Saúde (OMS) · Pesquisa Nacional de Saúde (IBGE).",
    perguntas: [
      "Quem paga a conta quando o atendimento passa para a iniciativa privada?",
      "O que a privatização resolveria e o que ela agravaria no seu município?",
      "Como o subfinanciamento aparece na sua cidade: fila, falta de insumo ou ausência de profissional?",
    ],
  },
  {
    titulo: "Desinformação e inteligência artificial",
    contexto: "Conteúdo gerado por IA circula em escala e com aparência de verdade. A escola passou a ser um dos lugares de checagem.",
    disputa: "Liberdade de expressão x responsabilidade por dano; velocidade da informação x verificação; regulação x inovação.",
    repertorio: "Lei nº 15.211/2025 (ECA Digital) · LGPD (Lei nº 13.709/2018) · Marco Legal dos Jogos Eletrônicos (Lei nº 14.852/2024) · manuais de checagem de agências de fact-checking.",
    perguntas: [
      "Que caminho você usa para decidir se uma informação é confiável?",
      "O que deveria ser obrigatório informar quando um conteúdo é gerado por IA?",
    ],
  },
  {
    titulo: "Justiça climática e Amazônia",
    contexto: "Seca, fumaça e cheias atingem primeiro quem tem menos infraestrutura. O debate saiu do campo ambiental e entrou no social.",
    disputa: "Proteção ambiental x atividade econômica; responsabilidade histórica dos países ricos x financiamento da adaptação; direito territorial x exploração.",
    repertorio: "Política Nacional sobre Mudança do Clima (Lei nº 12.187/2009) · Acordo de Paris · SNUC (Lei nº 9.985/2000) · relatórios do IPCC.",
    perguntas: [
      "Quem sofre primeiro os efeitos do clima na sua cidade e por quê?",
      "Como garantir renda para quem preserva a floresta?",
    ],
  },
  {
    titulo: "Cotas, permanência e escola pública",
    contexto: "A Lei de Cotas foi revisada e ampliada em 2023. A discussão deixou de ser só sobre entrada e passou a ser sobre permanência.",
    disputa: "Ação afirmativa x mérito individual; acesso x conclusão do curso; bolsa e moradia x evasão.",
    repertorio: "Lei nº 12.711/2012, revista pela Lei nº 14.723/2023 · Lei nº 10.639/2003 · Lei nº 11.645/2008 · dados do Censo da Educação Superior (INEP).",
    perguntas: [
      "O que faz um estudante cotista permanecer até o fim?",
      "Como a política de cotas aparece na sua escola ou na sua família?",
    ],
  },
  {
    titulo: "Trabalho por aplicativo e renda",
    contexto: "Entregadores e motoristas passaram a ser pauta de debate sobre vínculo, jornada e proteção social.",
    disputa: "Autonomia x precarização; custo do trabalhador x preço ao consumidor; regulação x modelo de negócio.",
    repertorio: "CLT (Decreto-Lei nº 5.452/1943) · Constituição, art. 7º · IBGE/PNAD Contínua · estudos sobre plataformas digitais.",
    perguntas: [
      "Quem assume o risco do acidente no trabalho por aplicativo?",
      "O que mudaria com um contrato mínimo de proteção?",
    ],
  },
  {
    titulo: "Cultura e direito à cidade",
    contexto: "Espaços culturais, feiras e patrimônios são disputados por projetos de revitalização e por quem já mora ali.",
    disputa: "Preservação x especulação imobiliária; patrimônio oficial x memória do bairro; acesso gratuito x financeirização da cultura.",
    repertorio: "Estatuto da Cidade (Lei nº 10.257/2001) · Lei nº 14.017/2020 (Aldir Blanc) · Constituição, arts. 215 e 216 · Currículo Único do Acre.",
    perguntas: [
      "Que lugar da sua cidade conta a história do bairro e está em risco?",
      "Como política cultural pode gerar renda sem expulsar quem já mora?",
    ],
  },
];

function temasRender() {
  const alvo = document.getElementById("temas-lista");
  if (!alvo) return;
  alvo.innerHTML = TEMAS_REDACAO.map((t) => `
    <article class="tema-card">
      <h3 class="escrita-titulo">${escritaEsc(t.titulo)}</h3>
      <p class="tema-contexto">${escritaEsc(t.contexto)}</p>
      <p class="tema-linha"><strong>O que está em disputa:</strong> ${escritaEsc(t.disputa)}</p>
      <p class="tema-linha"><strong>Repertório:</strong> ${escritaEsc(t.repertorio)}</p>
      <ul class="tema-perguntas">${t.perguntas.map((p) => `<li>${escritaEsc(p)}</li>`).join("")}</ul>
    </article>`).join("");
}
function escritaEsc(t) {
  return String(t == null ? "" : t)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function escritaAbrirTela() {
  escritaRender();
  if (typeof mostrarTela === "function") mostrarTela("tela-escrita");
  escritaCarregar();
}

function escritaRender() {
  const alvo = document.getElementById("escrita-lista");
  if (!alvo) return;
  alvo.innerHTML = DESAFIOS_ESCRITA.map((d, i) => `
    <article class="escrita-card" data-id="${d.id}">
      <p class="escrita-comp">${escritaEsc(d.competencia)}</p>
      <h3 class="escrita-titulo">${i + 1}. ${escritaEsc(d.titulo)}</h3>
      <p class="escrita-pergunta">${escritaEsc(d.pergunta)}</p>
      <p class="escrita-dica">${escritaEsc(d.dica)}</p>
      <textarea id="escrita-${d.id}" class="campo-texto escrita-texto" rows="6" maxlength="2000"
        placeholder="Escreva com as suas palavras..."></textarea>
      <div class="escrita-rodape">
        <span id="escrita-cont-${d.id}" class="escrita-cont">0 caracteres</span>
        <span id="escrita-msg-${d.id}" class="escrita-msg" role="status" aria-live="polite"></span>
        <button class="btn-principal escrita-salvar" data-id="${d.id}" type="button">Salvar resposta</button>
      </div>
    </article>`).join("");

  DESAFIOS_ESCRITA.forEach((d) => {
    const txt = document.getElementById("escrita-" + d.id);
    if (!txt) return;
    txt.addEventListener("input", () => {
      const c = document.getElementById("escrita-cont-" + d.id);
      if (c) c.textContent = txt.value.length + " caracteres";
    });
  });

  alvo.querySelectorAll(".escrita-salvar").forEach((b) => {
    b.addEventListener("click", () => escritaSalvar(b.dataset.id));
  });
}

async function escritaCarregar() {
  const user = typeof usuarioAtual === "function" ? usuarioAtual() : null;
  if (!user) return;
  try {
    const snap = await firebase.firestore().collection("escritas").where("uid", "==", user.uid).get();
    snap.forEach((doc) => {
      const d = doc.data();
      const txt = document.getElementById("escrita-" + d.id);
      if (txt) {
        txt.value = d.resposta || "";
        const c = document.getElementById("escrita-cont-" + d.id);
        if (c) c.textContent = txt.value.length + " caracteres";
        const m = document.getElementById("escrita-msg-" + d.id);
        if (m) { m.textContent = "resposta salva"; m.className = "escrita-msg ok"; }
      }
    });
  } catch (e) { /* silencioso: o aluno ainda pode escrever e salvar */ }
}

async function escritaSalvar(id) {
  const user = typeof usuarioAtual === "function" ? usuarioAtual() : null;
  if (!user) return;
  const txt = document.getElementById("escrita-" + id);
  const msg = document.getElementById("escrita-msg-" + id);
  if (!txt) return;
  const resposta = txt.value.trim();
  if (resposta.length < ESCRITA_MIN) {
    if (msg) { msg.textContent = "escreva pelo menos " + ESCRITA_MIN + " caracteres"; msg.className = "escrita-msg erro"; }
    txt.focus();
    return;
  }
  if (msg) { msg.textContent = "salvando..."; msg.className = "escrita-msg"; }
  try {
    await firebase.firestore().collection("escritas").doc(user.uid + "_" + id).set({
      uid: user.uid,
      id,
      nome: (typeof usuario !== "undefined" && usuario && usuario.nome) ? usuario.nome : (user.displayName || "Estudante"),
      codigo: (typeof minhaTurma !== "undefined" && minhaTurma && minhaTurma.codigo) ? minhaTurma.codigo : null,
      competencia: (DESAFIOS_ESCRITA.find((d) => d.id === id) || {}).competencia || null,
      pergunta: (DESAFIOS_ESCRITA.find((d) => d.id === id) || {}).pergunta || null,
      resposta,
      atualizadoEm: firebase.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });
    if (msg) { msg.textContent = "resposta salva ✓"; msg.className = "escrita-msg ok"; }
    if (typeof mostrarToast === "function") mostrarToast("Resposta salva.", "ok");
  } catch (e) {
    if (msg) { msg.textContent = "não foi possível salvar: " + e.message; msg.className = "escrita-msg erro"; }
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const btn = document.getElementById("btn-escrita");
  if (btn) btn.addEventListener("click", escritaAbrirTela);
  const voltar = document.getElementById("btn-voltar-escrita");
  if (voltar) voltar.addEventListener("click", () => {
    if (typeof mostrarTela === "function") mostrarTela("tela-inicio");
  });
});
