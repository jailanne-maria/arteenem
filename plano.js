// ArteENEM — conteúdo do plano de estudos personalizado

// Rótulos das áreas (independente do questoes.js)
const ROTULOS_AREAS = {
  linguagens: { icone: "🎨", curto: "Linguagens" },
  humanas: { icone: "🌍", curto: "Humanas" },
  natureza: { icone: "🧪", curto: "Natureza" },
  matematica: { icone: "📐", curto: "Matemática" },
};

// Tópicos por área, com dica de estudo e recurso gratuito
const CONTEUDOS = {
  linguagens: {
    topicos: [
      { nome: "Interpretação de texto", desc: "Gêneros textuais, ideia central, inferência e ironia.", dica: "Leia notícias e crônicas e escreva, em uma frase, a ideia principal de cada uma." },
      { nome: "Literatura", desc: "Movimentos literários brasileiros e seus autores.", dica: "Faça uma linha do tempo dos movimentos: Barroco, Romantismo, Realismo, Modernismo." },
      { nome: "Arte e patrimônio", desc: "Vanguardas, arte brasileira e leitura de imagens.", dica: "Pratique descrever uma obra: contexto, cores, formas e mensagem." },
      { nome: "Gramática e variação linguística", desc: "Norma culta, variedades e figuras de linguagem.", dica: "Estude gênero, concordância e regência resolvendo questões do ENEM." },
      { nome: "Inglês / Espanhol", desc: "Leitura e compreensão de textos em língua estrangeira.", dica: "Treine 'skimming' (ideia geral) e 'scanning' (informação específica) em textos curtos." },
    ],
    recursos: [
      { nome: "Khan Academy — Português", url: "https://pt.khanacademy.org/humanities/grammar" },
      { nome: "Brasil Escola — Literatura", url: "https://brasilescola.uol.com.br/literatura" },
    ],
  },
  humanas: {
    topicos: [
      { nome: "História do Brasil", desc: "Colônia, Império, República, Era Vargas e Ditadura.", dica: "Estude por grandes períodos e relacione com questões atuais." },
      { nome: "História Geral", desc: "Revoluções, guerras e formação do mundo contemporâneo.", dica: "Compare causas e consequências de cada revolução." },
      { nome: "Geografia", desc: "Clima, relevo, urbanização e globalização.", dica: "Use mapas e gráficos para entender os processos geográficos." },
      { nome: "Filosofia", desc: "Principais filósofos e correntes de pensamento.", dica: "Resuma cada filósofo em uma pergunta que ele tentou responder." },
      { nome: "Sociologia", desc: "Clássicos (Durkheim, Weber, Marx) e movimentos sociais.", dica: "Relacione os conceitos com notícias e o seu cotidiano." },
      { nome: "Atualidades", desc: "Clima, cidadania e questões sociais.", dica: "Leia notícias 15 min por dia e conecte com o que estudou." },
    ],
    recursos: [
      { nome: "Khan Academy — História", url: "https://pt.khanacademy.org/humanities/world-history" },
      { nome: "Brasil Escola — Geografia", url: "https://brasilescola.uol.com.br/geografia" },
    ],
  },
  natureza: {
    topicos: [
      { nome: "Biologia", desc: "Ecologia, genética, citologia e evolução.", dica: "Faça mapas mentais ligando os sistemas e processos." },
      { nome: "Física", desc: "Mecânica, termologia, eletricidade e ondas.", dica: "Antes de decorar fórmulas, entenda o fenômeno e as unidades." },
      { nome: "Química", desc: "Estequiometria, soluções, reações e química orgânica.", dica: "Pratique balanceamento e cálculos passo a passo." },
      { nome: "Ciência e ambiente", desc: "Clima, energia e impactos ambientais.", dica: "Relacione os conteúdos com notícias sobre clima e Amazônia." },
    ],
    recursos: [
      { nome: "Khan Academy — Biologia", url: "https://pt.khanacademy.org/science/biology" },
      { nome: "Khan Academy — Física", url: "https://pt.khanacademy.org/science/physics" },
    ],
  },
  matematica: {
    topicos: [
      { nome: "Aritmética e porcentagem", desc: "Operações, razão, proporção e porcentagem.", dica: "Resolva 5 questões de porcentagem por dia, com contexto real." },
      { nome: "Funções", desc: "Função do 1º e 2º grau, gráficos.", dica: "Esboce o gráfico de cada função para visualizar o comportamento." },
      { nome: "Geometria", desc: "Áreas, volumes e relações métricas.", dica: "Desenhe as figuras e anote as fórmulas com um exemplo ao lado." },
      { nome: "Estatística e probabilidade", desc: "Média, mediana, moda e probabilidade.", dica: "Treine com dados de tabelas e gráficos do dia a dia." },
      { nome: "Razão, proporção e grandezas", desc: "Regra de três e escalas.", dica: "Monte a regra de três sempre identificando as grandezas." },
    ],
    recursos: [
      { nome: "Khan Academy — Matemática", url: "https://pt.khanacademy.org/math" },
      { nome: "Brasil Escola — Matemática", url: "https://brasilescola.uol.com.br/matematica" },
    ],
  },
};

// Gera o plano personalizado a partir do resultado do diagnóstico
// resultado: { pct, areas: { linguagens: 70, ... } }
// curso (opcional): { nome, pesos: { linguagens: 3, redacao: 3, ... } }
function gerarPlano(resultado, curso) {
  const pesos = (curso && curso.pesos) || {};

  const itens = Object.entries(resultado.areas || {})
    .map(([area, pct]) => ({ area, pct, peso: pesos[area] || 2 }));

  // Ordena: área de MAIOR PESO primeiro; empate desempata por pior desempenho
  itens.sort((a, b) => (b.peso - a.peso) || (a.pct - b.pct));

  const prioridades = itens.map(({ area, pct, peso }) => {
    let nivel, cor, etiqueta;
    if (peso === 3 && pct < 75) { nivel = 1; cor = "#d95d39"; etiqueta = "⭐ Peso máximo"; }
    else if (pct < 50) { nivel = 1; cor = "#d95d39"; etiqueta = "Prioridade alta"; }
    else if (pct < 75) { nivel = 2; cor = "#e0a94f"; etiqueta = "Prioridade média"; }
    else { nivel = 3; cor = "#81b29a"; etiqueta = "Manutenção"; }

    const conteudo = CONTEUDOS[area] || { topicos: [], recursos: [] };
    return {
      area,
      pct,
      peso,
      nivel,
      cor,
      etiqueta,
      topicos: conteudo.topicos,
      recursos: conteudo.recursos,
    };
  });

  // Cronograma: áreas de maior peso aparecem mais vezes na semana
  const pool = [];
  prioridades.forEach((p) => {
    const vezes = Math.max(1, p.peso || 1);
    for (let i = 0; i < vezes; i++) pool.push(p.area);
  });
  const lista = pool.length ? pool : prioridades.map((p) => p.area);
  const dias = ["Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado", "Domingo"];
  let k = 0;
  const cronograma = dias.map((dia, i) => {
    if (i === 6) return { dia, foco: "Revisão geral e descanso" };
    const area = lista[k % lista.length];
    k++;
    const rot = ROTULOS_AREAS[area];
    return { dia, foco: rot ? `${rot.icone} ${rot.curto}` : area };
  });

  const redacaoPeso = pesos.redacao || 0;

  return { prioridades, cronograma, redacaoPeso, curso: curso || null };
}

if (typeof module !== "undefined") {
  module.exports = { CONTEUDOS, gerarPlano };
}
