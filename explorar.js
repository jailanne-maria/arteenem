// ArteENEM — Explorar: jogo de fases contra a Desinformação
// Cada fase = um período histórico. Cada desafio = uma "notícia"
// que pode ser verdadeira ou falsa (desinformação).

const AVATARES = [
  { id: "menino1", emoji: "👦🏻", genero: "menino" },
  { id: "menino2", emoji: "👦🏽", genero: "menino" },
  { id: "menino3", emoji: "👦🏿", genero: "menino" },
  { id: "menina1", emoji: "👧🏻", genero: "menina" },
  { id: "menina2", emoji: "👧🏽", genero: "menina" },
  { id: "menina3", emoji: "👧🏿", genero: "menina" },
  { id: "neutro1", emoji: "🧑🏽", genero: "neutro" },
  { id: "neutro2", emoji: "🧑🏿", genero: "neutro" },
];

// Cenas visuais de cada fase (mergulho visual inspirado em Rio Branco/Acre)
const CENAS = {
  prehistoria: `<svg viewBox="0 0 400 150" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid slice"><defs><linearGradient id="c1" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#6a5a8f"/><stop offset="0.55" stop-color="#e8955a"/><stop offset="1" stop-color="#f9d36b"/></linearGradient></defs><rect width="400" height="150" fill="url(#c1)"/><circle cx="300" cy="72" r="30" fill="#fde9a8" opacity="0.75"/><path d="M0,150 L0,38 Q80,8 160,50 Q210,75 225,150 Z" fill="#5c4433"/><path d="M225,150 Q265,78 325,68 Q380,62 400,88 L400,150 Z" fill="#6b4f3a"/><g stroke="#e8d5b7" stroke-width="3" fill="none" stroke-linecap="round"><circle cx="58" cy="80" r="7"/><path d="M95,70 l8,26 M95,70 l-8,26 M95,70 l0,22"/><path d="M122,78 l8,20 M122,78 l-6,18"/></g><rect y="120" width="400" height="30" fill="#2e5f96"/><g stroke="#f9c46b" stroke-width="2" opacity="0.6"><line x1="275" y1="128" x2="330" y2="128"/><line x1="290" y1="137" x2="320" y2="137"/></g></svg>`,
  antiguidade: `<svg viewBox="0 0 400 150" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid slice"><defs><linearGradient id="c2" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#4a3f7a"/><stop offset="0.6" stop-color="#e08a4a"/><stop offset="1" stop-color="#f9d36b"/></linearGradient></defs><rect width="400" height="150" fill="url(#c2)"/><circle cx="90" cy="66" r="26" fill="#fde9a8" opacity="0.8"/><polygon points="230,110 300,40 370,110" fill="#c9a86a"/><polygon points="150,115 200,65 250,115" fill="#d9b26a"/><rect y="112" width="400" height="38" fill="#e0c58a"/><g fill="#a8865a"><rect x="40" y="80" width="12" height="34"/><rect x="60" y="80" width="12" height="34"/><rect x="80" y="80" width="12" height="34"/></g><rect x="36" y="74" width="62" height="8" fill="#c9a86a"/></svg>`,
  medieval: `<svg viewBox="0 0 400 150" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid slice"><defs><linearGradient id="c3" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1f2447"/><stop offset="0.6" stop-color="#5a4a7a"/><stop offset="1" stop-color="#c98a5a"/></linearGradient></defs><rect width="400" height="150" fill="url(#c3)"/><circle cx="320" cy="40" r="18" fill="#fdf3c0"/><g fill="#fff" opacity="0.8"><circle cx="60" cy="30" r="1.6"/><circle cx="140" cy="22" r="1.2"/><circle cx="220" cy="40" r="1.4"/><circle cx="100" cy="55" r="1.2"/></g><g fill="#3a3552"><rect x="60" y="70" width="30" height="55"/><rect x="100" y="55" width="26" height="70"/><rect x="135" y="70" width="30" height="55"/></g><polygon points="55,70 75,48 95,70" fill="#4a4368"/><polygon points="95,55 113,32 131,55" fill="#4a4368"/><polygon points="130,70 150,48 170,70" fill="#4a4368"/><rect y="122" width="400" height="28" fill="#2e5f96"/></svg>`,
  renascimento: `<svg viewBox="0 0 400 150" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid slice"><defs><linearGradient id="c4" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3b3a6b"/><stop offset="0.55" stop-color="#e8955a"/><stop offset="1" stop-color="#f9d36b"/></linearGradient></defs><rect width="400" height="150" fill="url(#c4)"/><circle cx="300" cy="60" r="26" fill="#fde9a8" opacity="0.8"/><rect y="105" width="400" height="45" fill="#2e5f96"/><g stroke="#f9c46b" stroke-width="2" opacity="0.55"><line x1="250" y1="115" x2="330" y2="115"/><line x1="270" y1="126" x2="315" y2="126"/></g><g><rect x="150" y="92" width="90" height="16" fill="#6b4a2b"/><polygon points="150,92 195,70 240,92" fill="#8a5a2b"/><line x1="195" y1="70" x2="195" y2="20" stroke="#4a3520" stroke-width="3"/><polygon points="195,24 230,36 195,48" fill="#e07a5f"/></g></svg>`,
  iluminismo: `<svg viewBox="0 0 400 150" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid slice"><defs><linearGradient id="c5" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#5aa0d8"/><stop offset="1" stop-color="#cfe8f5"/></linearGradient><radialGradient id="luz" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="#fff3b0"/><stop offset="0.5" stop-color="#f9a03f"/><stop offset="1" stop-color="#f9a03f" stop-opacity="0"/></radialGradient></defs><rect width="400" height="150" fill="url(#c5)"/><circle cx="200" cy="60" r="60" fill="url(#luz)"/><g stroke="#2b2340" stroke-width="4" fill="none"><path d="M160,120 Q200,20 240,120"/><path d="M160,120 Q200,30 240,120"/></g><rect x="180" y="115" width="40" height="18" rx="6" fill="#5c5752"/><path d="M185,120 Q200,80 215,120 Z" fill="#f9c46b"/><path d="M197,95 Q200,70 203,95 Z" fill="#fff3b0"/></svg>`,
  seculo20: `<svg viewBox="0 0 400 150" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid slice"><defs><linearGradient id="c6" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2b3a67"/><stop offset="0.6" stop-color="#7c5cff"/><stop offset="1" stop-color="#f2a35e"/></linearGradient></defs><rect width="400" height="150" fill="url(#c6)"/><g fill="#2a2740"><rect x="40" y="70" width="34" height="60"/><rect x="84" y="52" width="30" height="78"/><rect x="124" y="80" width="40" height="50"/><rect x="176" y="44" width="34" height="86"/><rect x="220" y="72" width="44" height="58"/><rect x="276" y="60" width="34" height="70"/><rect x="320" y="84" width="46" height="46"/></g><g fill="#fbd000" opacity="0.9"><rect x="92" y="62" width="6" height="6"/><rect x="104" y="62" width="6" height="6"/><rect x="184" y="56" width="6" height="6"/><rect x="196" y="56" width="6" height="6"/><rect x="286" y="72" width="6" height="6"/></g><g stroke="#fff3b0" stroke-width="2" fill="none" opacity="0.8"><path d="M200,40 q-14,-10 -28,0"/><path d="M200,40 q14,-10 28,0"/><path d="M200,28 q-20,-14 -40,0"/><path d="M200,28 q20,-14 40,0"/></g></svg>`,
  atuais: `<svg viewBox="0 0 400 150" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid slice"><defs><linearGradient id="c7" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1a2b6b"/><stop offset="0.6" stop-color="#3a5fa0"/><stop offset="1" stop-color="#6aa0c8"/></linearGradient></defs><rect width="400" height="150" fill="url(#c7)"/><g stroke="#8fc0e8" stroke-width="2.5" fill="none" opacity="0.7"><path d="M40,60 q20,-24 44,-4 q22,18 42,-2"/><path d="M260,40 q22,-26 48,-4 q22,18 44,-2"/><path d="M150,90 q18,-20 40,-2 q18,16 38,-2"/></g><circle cx="330" cy="45" r="22" fill="#fde9a8" opacity="0.85"/><g stroke="#fff3b0" stroke-width="1.6" opacity="0.8"><circle cx="90" cy="35" r="4" fill="#fde9a8"/><circle cx="210" cy="30" r="3" fill="#fde9a8"/></g><g><line x1="200" y1="110" x2="200" y2="52" stroke="#4a3520" stroke-width="3"/><polygon points="200,54 250,64 200,80" fill="#e8b23a"/><polygon points="200,80 250,64 250,84 200,100" fill="#43b047"/><circle cx="228" cy="72" r="4" fill="#e52521"/></g><rect y="132" width="400" height="18" fill="#2e5f96"/></svg>`,
};

const FASES = [
  {
    id: "prehistoria",
    nome: "Pré-História",
    periodo: "até 4000 a.C.",
    emoji: "🦴",
    cor: "#8a5a2b",
    cena: "prehistoria",
    intro: "Nas cavernas às margens do rio, os primeiros humanos pintam, contam histórias, observam a natureza e criam padrões. A Desinformação sussurra mentiras nas sombras...",
    desafios: [
      { area: "linguagens", noticia: "As pinturas rupestres serviam apenas para decorar as cavernas.", fake: true, explica: "FALSA! As pinturas rupestres eram formas de comunicação, registro e ritual — uma das primeiras linguagens da humanidade." },
      { area: "humanas", noticia: "A agricultura começou no período Neolítico, há cerca de 10 mil anos.", fake: false, explica: "VERDADEIRA! A Revolução Agrícola no Neolítico transformou a vida humana e deu origem às primeiras aldeias." },
      { area: "natureza", noticia: "O domínio do fogo ajudou os humanos a cozinhar alimentos e se aquecer.", fake: false, explica: "VERDADEIRA! O fogo foi uma das primeiras grandes tecnologias humanas." },
      { area: "matematica", noticia: "Os povos pré-históricos não tinham nenhuma forma de contar.", fake: true, explica: "FALSA! Eles faziam marcas em ossos e pedras para contar — uma matemática primitiva." },
    ],
  },
  {
    id: "antiguidade",
    nome: "Antiguidade",
    periodo: "4000 a.C. – 476 d.C.",
    emoji: "🏛️",
    cor: "#c9a000",
    cena: "antiguidade",
    intro: "Surgem as cidades, as escritas e os grandes impérios. Egito, Mesopotâmia, Grécia e Roma constroem conhecimento — e a Desinformação tenta reescrever a História.",
    desafios: [
      { area: "linguagens", noticia: "A escrita cuneiforme foi criada pelos sumérios na Mesopotâmia.", fake: false, explica: "VERDADEIRA! A cuneiforme, feita com placas de argila, é uma das escritas mais antigas do mundo." },
      { area: "humanas", noticia: "A democracia ateniense incluía mulheres, escravizados e estrangeiros.", fake: true, explica: "FALSA! Em Atenas, só homens livres e cidadãos podiam votar." },
      { area: "natureza", noticia: "Arquimedes estudou a força de empuxo na Grécia Antiga.", fake: false, explica: "VERDADEIRA! O princípio de Arquimedes explica por que os corpos flutuam." },
      { area: "matematica", noticia: "Os egípcios usavam geometria para medir terras e construir pirâmides.", fake: false, explica: "VERDADEIRA! A geometria nasceu de necessidades práticas como medir terras." },
    ],
  },
  {
    id: "medieval",
    nome: "Idade Média",
    periodo: "476 – 1453",
    emoji: "🏰",
    cor: "#5c8d89",
    cena: "medieval",
    intro: "Castelos, mosteiros e universidades. Muito se inventa sobre essa época — e a Desinformação adora espalhar exageros.",
    desafios: [
      { area: "linguagens", noticia: "Na Idade Média, ninguém sabia ler nem escrever.", fake: true, explica: "FALSA! Mosteiros e universidades preservaram e copiaram livros; muita gente sabia ler." },
      { area: "humanas", noticia: "As primeiras universidades surgiram na Europa medieval.", fake: false, explica: "VERDADEIRA! Bolonha, Oxford e Paris nasceram nesse período." },
      { area: "natureza", noticia: "Na Idade Média acreditava-se que a Terra era plana e isso nunca mudou até Colombo.", fake: true, explica: "FALSA! Desde a Grécia Antiga já se sabia que a Terra é esférica." },
      { area: "matematica", noticia: "Os algarismos que usamos hoje chegaram à Europa via mundo árabe.", fake: false, explica: "VERDADEIRA! Por isso são chamados de 'algarismos arábicos'." },
    ],
  },
  {
    id: "renascimento",
    nome: "Renascimento e Navegações",
    periodo: "1453 – 1600",
    emoji: "🚢",
    cor: "#e07a5f",
    cena: "renascimento",
    intro: "Arte, ciência e mares desconhecidos. Leonardo, Copérnico e os navegadores misturam as quatro áreas — e a Desinformação tenta afundar as descobertas.",
    desafios: [
      { area: "linguagens", noticia: "Leonardo da Vinci foi artista e também estudou anatomia e engenharia.", fake: false, explica: "VERDADEIRA! Leonardo é o símbolo do artista-cientista renascentista." },
      { area: "humanas", noticia: "As Grandes Navegações só foram possíveis sem nenhum conhecimento de cartografia.", fake: true, explica: "FALSA! Mapas, bússolas e astronomia foram essenciais para navegar." },
      { area: "natureza", noticia: "Copérnico propôs que a Terra gira em torno do Sol.", fake: false, explica: "VERDADEIRA! O heliocentrismo mudou para sempre nossa visão de mundo." },
      { area: "matematica", noticia: "No Renascimento, a matemática da perspectiva revolucionou a pintura.", fake: false, explica: "VERDADEIRA! A perspectiva usa geometria para dar profundidade às obras." },
    ],
  },
  {
    id: "iluminismo",
    nome: "Iluminismo e Revolução Industrial",
    periodo: "séc. XVIII – XIX",
    emoji: "⚙️",
    cor: "#43b047",
    cena: "iluminismo",
    intro: "A razão ilumina o mundo e as máquinas mudam tudo. A Desinformação tenta frear o progresso com mentiras.",
    desafios: [
      { area: "linguagens", noticia: "O Iluminismo valorizava a razão e a liberdade de pensamento.", fake: false, explica: "VERDADEIRA! 'Sapere aude' — ouse saber — era o lema iluminista." },
      { area: "humanas", noticia: "A Revolução Francesa ocorreu em 1789.", fake: false, explica: "VERDADEIRA! 1789 marcou o fim do Antigo Regime na França." },
      { area: "natureza", noticia: "A máquina a vapor foi inventada muito antes da Revolução Industrial.", fake: true, explica: "FALSA! O aperfeiçoamento da máquina a vapor impulsionou a Revolução Industrial." },
      { area: "matematica", noticia: "A estatística não tem nenhuma relação com a ciência e a indústria.", fake: true, explica: "FALSA! A estatística passou a ser usada para medir, prever e melhorar a produção." },
    ],
  },
  {
    id: "seculo20",
    nome: "Século XX",
    periodo: "1900 – 2000",
    emoji: "🎬",
    cor: "#7c5cff",
    cena: "seculo20",
    intro: "Guerras, revoluções, arte moderna e tecnologia. A Desinformação se torna arma — e você precisa desmascará-la.",
    desafios: [
      { area: "linguagens", noticia: "A Semana de Arte Moderna ocorreu em 1922 no Brasil.", fake: false, explica: "VERDADEIRA! Ela rompeu com o academicismo e valorizou a cultura brasileira." },
      { area: "humanas", noticia: "A Segunda Guerra Mundial terminou em 1935.", fake: true, explica: "FALSA! A Segunda Guerra terminou em 1945." },
      { area: "natureza", noticia: "A penicilina foi descoberta por Alexander Fleming.", fake: false, explica: "VERDADEIRA! A penicilina revolucionou a medicina e salvou milhões." },
      { area: "matematica", noticia: "A computação moderna se desenvolveu a partir da matemática e da lógica.", fake: false, explica: "VERDADEIRA! Turing e outros matemáticos lançaram as bases dos computadores." },
    ],
  },
  {
    id: "atuais",
    nome: "Dias Atuais",
    periodo: "2000 – hoje",
    emoji: "🌐",
    cor: "#e52521",
    cena: "atuais",
    intro: "Internet, redes sociais e emergência climática. É o covil da Desinformação — as fake news se espalham mais rápido que a verdade. Enfrente-as!",
    desafios: [
      { area: "linguagens", noticia: "Toda notícia compartilhada nas redes sociais é verdadeira.", fake: true, explica: "FALSA! É preciso checar a fonte antes de compartilhar. Desconfie de manchetes alarmistas." },
      { area: "humanas", noticia: "A Constituição de 1988 é chamada de 'Constituição Cidadã'.", fake: false, explica: "VERDADEIRA! Ela ampliou direitos sociais e individuais no Brasil." },
      { area: "natureza", noticia: "As mudanças climáticas estão ligadas à emissão de gases do efeito estufa.", fake: false, explica: "VERDADEIRA! A ciência é clara: a atividade humana intensifica o efeito estufa." },
      { area: "matematica", noticia: "Gráficos e estatísticas nunca podem ser usados para enganar.", fake: true, explica: "FALSA! Gráficos com escalas manipuladas podem distorcer a informação. Leia com atenção!" },
    ],
  },
];

if (typeof module !== "undefined") {
  module.exports = { FASES, AVATARES, CENAS };
}
