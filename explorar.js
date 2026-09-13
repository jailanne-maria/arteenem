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

const FASES = [
  {
    id: "prehistoria",
    nome: "Pré-História",
    periodo: "até 4000 a.C.",
    emoji: "🦴",
    cor: "#8a5a2b",
    intro: "Nas cavernas, os primeiros humanos pintam, contam histórias, observam a natureza e criam padrões. A Desinformação sussurra mentiras nas sombras...",
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
  module.exports = { FASES, AVATARES };
}
