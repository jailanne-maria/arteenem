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
