// Banco de questões do ArteENEM
// Cada questão tem: apoio (texto/contexto para leitura), enunciado, alternativas (A–E)
// imagem: SVG embutido (opcional) para interpretação visual

const AREAS = {
  linguagens: {
    nome: "Linguagens, Códigos e suas Tecnologias",
    curto: "Linguagens",
    icone: "🎨",
    cor: "#E07A5F",
    descricao: "Arte, Educação Física, Literatura, Língua Portuguesa, Inglês e Espanhol.",
  },
  humanas: {
    nome: "Ciências Humanas e suas Tecnologias",
    curto: "Humanas",
    icone: "🌍",
    cor: "#81B29A",
    descricao: "História, Geografia, Filosofia e Sociologia.",
  },
  natureza: {
    nome: "Ciências da Natureza e suas Tecnologias",
    curto: "Natureza",
    icone: "🧪",
    cor: "#F2CC8F",
    descricao: "Biologia, Física e Química.",
  },
  matematica: {
    nome: "Matemática e suas Tecnologias",
    curto: "Matemática",
    icone: "📐",
    cor: "#5C8D89",
    descricao: "Raciocínio lógico, álgebra, geometria e estatística.",
  },
};

// SVG simples de apoio visual (arte abstrata / gráficos)
const SVG = {
  modernismo: `<svg viewBox="0 0 400 200" xmlns="http://www.w3.org/2000/svg"><rect width="400" height="200" fill="#f0ebe1"/><circle cx="100" cy="100" r="55" fill="#e07a5f"/><rect x="170" y="50" width="70" height="100" fill="#81b29a"/><polygon points="300,40 360,160 240,160" fill="#f2cc8f"/><line x1="0" y1="100" x2="400" y2="100" stroke="#332f2c" stroke-width="2" stroke-dasharray="6 6"/></svg>`,
  tela: `<svg viewBox="0 0 400 200" xmlns="http://www.w3.org/2000/svg"><rect width="400" height="200" fill="#f9f8f6"/><rect x="20" y="20" width="360" height="160" rx="8" fill="none" stroke="#332f2c" stroke-width="3"/><rect x="40" y="45" width="120" height="90" fill="#e07a5f"/><rect x="180" y="45" width="80" height="40" fill="#81b29a"/><rect x="180" y="95" width="80" height="40" fill="#f2cc8f"/></svg>`,
  graficoClima: `<svg viewBox="0 0 400 200" xmlns="http://www.w3.org/2000/svg"><rect width="400" height="200" fill="#f9f8f6"/><polyline points="20,160 80,120 140,140 200,70 260,90 320,40 380,60" fill="none" stroke="#d95d39" stroke-width="4"/><line x1="20" y1="180" x2="380" y2="180" stroke="#332f2c" stroke-width="2"/><line x1="20" y1="20" x2="20" y2="180" stroke="#332f2c" stroke-width="2"/><text x="200" y="195" font-size="12" fill="#5c5752" text-anchor="middle">tempo →</text></svg>`,
  floresta: `<svg viewBox="0 0 400 200" xmlns="http://www.w3.org/2000/svg"><rect width="400" height="200" fill="#eef5f0"/><polygon points="80,40 40,140 120,140" fill="#81b29a"/><polygon points="150,20 100,150 200,150" fill="#5c8d89"/><polygon points="230,50 180,150 280,150" fill="#81b29a"/><polygon points="320,30 270,150 370,150" fill="#5c8d89"/><rect x="0" y="150" width="400" height="50" fill="#c9b79c"/></svg>`,
};

const QUESTOES = [
  // ================= LINGUAGENS =================
  {
    id: "lin1",
    area: "linguagens",
    tema: "Arte e Modernismo",
    apoio: "Leia o trecho:\n\n“Queremos criar uma arte que seja nossa, feita por brasileiros e para brasileiros. Não mais copiar o que vem da Europa, mas olhar para o nosso povo, a nossa terra e a nossa cultura.”\n— inspirado nos ideais da Semana de Arte Moderna de 1922",
    imagem: SVG.modernismo,
    enunciado:
      "A partir do texto e da obra visual acima, a principal proposta da Semana de Arte Moderna de 1922 foi:",
    alternativas: [
      "Valorizar temas e identidade nacionais, rompendo com padrões acadêmicos europeus.",
      "Defender o academicismo e a arte realista clássica.",
      "Recusar totalmente qualquer influência estrangeira.",
      "Buscar uma arte exclusivamente religiosa e barroca.",
      "Priorizar temas mitológicos greco-romanos.",
    ],
    correta: 0,
    explicacao:
      "A Semana de 1922 rompeu com o academicismo e valorizou a identidade brasileira, misturando vanguardas europeias com temas nacionais.",
  },
  {
    id: "lin2",
    area: "linguagens",
    tema: "Arte contemporânea",
    apoio: "Observe a descrição de uma instalação artística:\n\n“Na sala, o artista espalhou objetos do cotidiano — panelas, roupas e retratos antigos — e convidou o público a caminhar entre eles. Não havia moldura nem tela: a própria sala era a obra.”",
    imagem: SVG.tela,
    enunciado:
      "Essa descrição representa uma característica marcante da arte contemporânea. Que característica é essa?",
    alternativas: [
      "A mistura de linguagens e o uso de materiais e suportes diversos, inclusive do cotidiano.",
      "O compromisso com a representação fiel da realidade.",
      "A obrigatoriedade do uso de pintura a óleo sobre tela.",
      "A recusa de qualquer crítica ou mensagem social.",
      "A busca pela perfeição anatômica e pelo equilíbrio clássico.",
    ],
    correta: 0,
    explicacao:
      "A arte contemporânea rompe fronteiras: instalações, performance, objetos cotidianos e a participação do público integram a obra.",
  },
  {
    id: "lin3",
    area: "linguagens",
    tema: "Literatura brasileira",
    apoio: "Leia:\n\n“Era um índio forte, de corpo pintado, que vivia livre nas matas. Ele amava a terra em que nasceu e lutava por ela. Assim o Romantismo brasileiro o retratava: como o herói de uma nação jovem.”",
    enunciado:
      "A representação idealizada do indígena, presente no Romantismo brasileiro, tinha como função principal:",
    alternativas: [
      "Criar um herói nacional que valorizasse a identidade e o território brasileiros.",
      "Criticar abertamente a monarquia e a escravidão.",
      "Retratar com precisão científica a vida dos povos indígenas.",
      "Defender o realismo e a objetividade científica.",
      "Incentivar a imigração europeia para o Brasil.",
    ],
    correta: 0,
    explicacao:
      "O indianismo romântico idealizava o indígena como símbolo de nacionalidade, valorizando a terra e a cultura local.",
  },
  {
    id: "lin4",
    area: "linguagens",
    tema: "Variação linguística",
    apoio: "Leia as duas falas:\n\nA) “Nós vai à feira amanhã, quer ir com nós?”\nB) “Nós iremos à feira amanhã; você gostaria de ir conosco?”\n\nAs duas formas comunicam a mesma ideia, mas de maneiras diferentes.",
    enunciado:
      "A diferença entre as falas A e B é um exemplo de:",
    alternativas: [
      "Variação linguística, característica natural e legítima de toda língua viva.",
      "Erro gramatical que empobrece a língua.",
      "Problema exclusivo da fala informal.",
      "Incapacidade de comunicação do falante.",
      "Ausência de regras gramaticais na língua portuguesa.",
    ],
    correta: 0,
    explicacao:
      "Toda língua viva varia conforme região, grupo social e contexto. As variedades são legítimas e não representam erro.",
  },
  {
    id: "lin5",
    area: "linguagens",
    tema: "Inglês",
    apoio: "Read the comment:\n\n“The show was amazing! But I couldn't hear the singer because the crowd was too loud.”",
    enunciado: "What was the problem at the show?",
    alternativas: [
      "The crowd was too loud to hear the singer.",
      "The singer did not show up.",
      "The show was cancelled.",
      "The tickets were too expensive.",
      "The concert started too late.",
    ],
    correta: 0,
    explicacao:
      "'I couldn't hear the singer because the crowd was too loud' indica que a multidão estava barulhenta demais.",
  },
  {
    id: "lin6",
    area: "linguagens",
    tema: "Interpretação de texto",
    apoio: "Leia o poema:\n\n“No meio do caminho tinha uma pedra\ntinha uma pedra no meio do caminho\ntinha uma pedra\nno meio do caminho tinha uma pedra.”\n— Carlos Drummond de Andrade",
    enunciado:
      "A repetição do verso no poema de Drummond tem como principal efeito:",
    alternativas: [
      "Criar um ritmo marcante e reforçar a ideia de obstáculo que se repete.",
      "Informar objetivamente sobre um caminho real.",
      "Convencer o leitor a evitar estradas.",
      "Testar se o leitor está prestando atenção.",
      "Descrever uma paisagem natural com riqueza de detalhes.",
    ],
    correta: 0,
    explicacao:
      "A repetição é recurso estético (função poética): cria musicalidade e reforça a ideia do obstáculo que insiste em reaparecer.",
  },
  {
    id: "lin7",
    area: "linguagens",
    tema: "Espanhol",
    apoio: "Lee el texto:\n\n“Buenos Aires es una ciudad que nunca duerme. Sus calles mezclan el tango, el café y una arquitectura que recuerda a Europa. Por la noche, los teatros y las librerías siguen abiertos hasta tarde.”",
    enunciado: "Según el texto, Buenos Aires se caracteriza por:",
    alternativas: [
      "Una vida cultural intensa, con tango, cafés y librerías abiertas hasta tarde.",
      "Ser una ciudad silenciosa y tranquila por la noche.",
      "No tener ninguna influencia europea.",
      "Cerrar todos los teatros al anochecer.",
      "Ser una ciudad exclusivamente industrial.",
    ],
    correta: 0,
    explicacao:
      "O texto destaca a vida cultural (tango, cafés, teatros e livrarias) e a arquitetura de influência europeia.",
  },
  {
    id: "lin8",
    area: "linguagens",
    tema: "Espanhol — falsos amigos",
    apoio: "Atenção aos 'falsos amigos' (falsos cognatos) entre português e espanhol:\n\n“rato” em espanhol significa un momento; “largo” significa longo; “embarazada” significa grávida.",
    enunciado:
      "Na frase “La película fue muy larga”, a palavra “larga” significa:",
    alternativas: [
      "Longa (com muita duração).",
      "Larga (largura grande).",
      "Rápida.",
      "Chata.",
      "Curta.",
    ],
    correta: 0,
    explicacao:
      "Em espanhol, 'largo' significa 'longo/comprido' (duração ou comprimento). Já 'ancho' é 'largo' no sentido de largura.",
  },
  {
    id: "lin9",
    area: "linguagens",
    tema: "Espanhol — gramática",
    apoio: "Lee la frase:\n\n“Cuando era niño, yo ______ a la escuela todos los días.”",
    enunciado: "A forma verbal que completa corretamente a frase é:",
    alternativas: ["iba", "voy", "iré", "iría", "he ido"],
    correta: 0,
    explicacao:
      "'Cuando era niño' indica uma ação habitual no passado, então usa-se o pretérito imperfeito: 'iba'.",
  },
  {
    id: "lin10",
    area: "linguagens",
    tema: "Educação Física — esporte",
    apoio: "Leia:\n\n“O esporte pode ser praticado de diferentes formas: como rendimento (competição de alto nível), como participação (lazer e saúde) e como educação (nas aulas de Educação Física).”",
    enunciado: "Uma caminhada no parque no fim de semana, pelo prazer de se movimentar, é um exemplo de:",
    alternativas: [
      "Esporte de participação, voltado ao lazer e à saúde.",
      "Esporte de rendimento, com foco na competição.",
      "Esporte profissional de alto nível.",
      "Treinamento olímpico.",
      "Competição de alto desempenho.",
    ],
    correta: 0,
    explicacao:
      "O esporte de participação é praticado no tempo livre, com finalidade de bem-estar físico e psicológico — diferente do rendimento, que busca superação e vitória.",
  },
  {
    id: "lin11",
    area: "linguagens",
    tema: "Educação Física — saúde",
    apoio: "Leia:\n\n“A Organização Mundial da Saúde (OMS) recomenda pelo menos 150 minutos de atividade física moderada por semana para adultos.”",
    enunciado: "A prática regular de atividade física tem como principal benefício:",
    alternativas: [
      "A melhora da saúde física e mental, prevenindo doenças.",
      "O aumento do sedentarismo.",
      "O prejuízo ao coração e à circulação.",
      "A redução da disposição e do sono.",
      "O isolamento social.",
    ],
    correta: 0,
    explicacao:
      "A atividade física regular melhora a saúde cardiovascular, fortalece músculos e ossos e contribui para o bem-estar mental.",
  },
  {
    id: "lin12",
    area: "linguagens",
    tema: "Educação Física — cultura corporal",
    apoio: "Leia:\n\n“As danças, lutas, jogos e brincadeiras fazem parte da cultura corporal de um povo e expressam sua identidade e sua história.”",
    enunciado: "A capoeira é um exemplo de manifestação da cultura corporal que reúne, ao mesmo tempo:",
    alternativas: [
      "Luta, dança e música, com raízes afro-brasileiras.",
      "Apenas corrida de velocidade.",
      "Apenas natação e mergulho.",
      "Apenas ginástica de academia.",
      "Apenas futebol de campo.",
    ],
    correta: 0,
    explicacao:
      "A capoeira une luta, dança, música e cultura afro-brasileira, sendo reconhecida como patrimônio cultural do Brasil.",
  },

  // ================= HUMANAS =================
  {
    id: "hum1",
    area: "humanas",
    tema: "História do Brasil",
    apoio: "Leia o trecho:\n\n“A Lei Áurea libertou os escravizados, mas não lhes deu terra, escola nem trabalho. A liberdade veio sem reparação, e a desigualdade atravessou gerações.”",
    enunciado:
      "Segundo o texto, a abolição de 1888 não garantiu inclusão social da população negra porque:",
    alternativas: [
      "Não houve políticas de reparação, terra ou educação para os libertos.",
      "A lei proibia o trabalho assalariado.",
      "Os libertos foram enviados de volta à África.",
      "A lei nunca chegou a ser aplicada.",
      "A lei determinava o retorno à escravidão após cinco anos.",
    ],
    correta: 0,
    explicacao:
      "A abolição veio sem reparação ou políticas de inclusão, deixando a população negra em situação de vulnerabilidade — raiz das desigualdades atuais.",
  },
  {
    id: "hum2",
    area: "humanas",
    tema: "Geografia e clima",
    apoio: "Observe o gráfico que representa a variação do nível do Rio Acre ao longo dos anos.",
    imagem: SVG.graficoClima,
    enunciado:
      "Eventos climáticos extremos, como as cheias históricas do Rio Acre, estão associados principalmente a:",
    alternativas: [
      "Mudanças climáticas globais somadas a fatores locais de uso do solo e desmatamento.",
      "Apenas ao ciclo natural das marés.",
      "Exclusivamente à ação de El Niño, sem relação humana.",
      "A terremotos na região amazônica.",
      "Ao aumento descontrolado da população das cidades.",
    ],
    correta: 0,
    explicacao:
      "A emergência climática potencializa eventos extremos; no Acre, somam-se desmatamento, queimadas e a variabilidade do El Niño.",
  },
  {
    id: "hum3",
    area: "humanas",
    tema: "Filosofia",
    apoio: "Leia:\n\n“Há muito tempo percebi que, desde criança, eu havia tomado por verdadeiro um grande número de opiniões falsas. Era preciso, uma vez na vida, duvidar de tudo para encontrar algo de sólido.”\n— inspirado em René Descartes",
    enunciado:
      "A frase 'Penso, logo existo', de Descartes, marca o início da filosofia moderna ao:",
    alternativas: [
      "Fundamentar o conhecimento na razão e na dúvida metódica.",
      "Defender que os sentidos são a única fonte de verdade.",
      "Negar a existência do pensamento.",
      "Afirmar que a fé substitui a razão.",
      "Valorizar a tradição como única fonte de conhecimento.",
    ],
    correta: 0,
    explicacao:
      "Descartes parte da dúvida metódica e encontra no 'cogito' (o pensamento) a primeira certeza indubitável.",
  },
  {
    id: "hum4",
    area: "humanas",
    tema: "Sociologia",
    apoio: "Leia:\n\n“Quando nascemos, já encontramos prontos a língua, a moral, as leis e os costumes da sociedade. Mesmo sem perceber, seguimos regras que existem fora de nós e que nos pressionam a agir de certo modo.”\n— inspirado em Émile Durkheim",
    enunciado:
      "O conceito de 'fato social', desenvolvido por Durkheim, refere-se a:",
    alternativas: [
      "Maneiras de agir, pensar e sentir externas ao indivíduo e dotadas de poder de coerção.",
      "Escolhas puramente individuais e subjetivas.",
      "Leis escritas apenas pelo Estado.",
      "Costumes exclusivamente religiosos.",
      "Fenômenos puramente biológicos e hereditários.",
    ],
    correta: 0,
    explicacao:
      "Para Durkheim, fatos sociais são externos ao indivíduo, gerais e coercitivos — como a educação, a moral e as normas.",
  },
  {
    id: "hum5",
    area: "humanas",
    tema: "Cidadania",
    apoio: "Leia o trecho da Constituição de 1988:\n\n“Todos são iguais perante a lei, sem distinção de qualquer natureza, garantindo-se aos brasileiros e aos estrangeiros residentes no País a inviolabilidade do direito à vida, à liberdade, à igualdade, à segurança e à propriedade.”",
    enunciado:
      "A Constituição de 1988, conhecida como 'Constituição Cidadã', é marcada por:",
    alternativas: [
      "Ampla garantia de direitos sociais, individuais e coletivos.",
      "Restrição do voto a proprietários de terra.",
      "Fim das eleições diretas.",
      "Redução dos direitos trabalhistas.",
      "Centralização de todo o poder no Executivo.",
    ],
    correta: 0,
    explicacao:
      "A Carta de 1988 ampliou direitos fundamentais e sociais, sendo um marco da redemocratização brasileira.",
  },
  {
    id: "hum6",
    area: "humanas",
    tema: "Geografia",
    apoio: "Leia:\n\n“A floresta não é apenas um depósito de árvores: ela bombeia água para o céu, forma os chamados ‘rios voadores’ e regula as chuvas de boa parte do Brasil.”",
    enunciado:
      "Cientificamente, a principal contribuição climática da Amazônia está em:",
    alternativas: [
      "Regular o ciclo das chuvas e armazenar grande quantidade de carbono.",
      "Produzir a maior parte do oxigênio da atmosfera.",
      "Impedir terremotos na América do Sul.",
      "Aumentar a temperatura global.",
      "Impedir a formação de chuvas na região Sul do Brasil.",
    ],
    correta: 0,
    explicacao:
      "O mito do 'pulmão do mundo' é impreciso: a floresta consome quase todo o oxigênio que produz. Sua real importância é no ciclo hidrológico e no estoque de carbono.",
  },

  // ================= NATUREZA =================
  {
    id: "nat1",
    area: "natureza",
    tema: "Biologia",
    apoio: "Observe a ilustração de uma área de floresta e outra desmatada.",
    imagem: SVG.floresta,
    enunciado:
      "O desmatamento da Amazônia afeta diretamente o ciclo da água porque:",
    alternativas: [
      "As árvores liberam vapor d'água pela transpiração, alimentando as chuvas.",
      "As árvores absorvem todo o oxigênio da atmosfera.",
      "O desmatamento aumenta a umidade do ar.",
      "A floresta impede a formação de nuvens.",
      "As raízes impedem que a água da chuva infiltre no solo.",
    ],
    correta: 0,
    explicacao:
      "A transpiração das árvores (evapotranspiração) lança água na atmosfera e forma os 'rios voadores', essenciais às chuvas.",
  },
  {
    id: "nat2",
    area: "natureza",
    tema: "Física",
    apoio: "Leia a situação-problema:\n\n“Uma pessoa empurra uma caixa com uma força de 50 N, e a caixa se desloca 4 metros na mesma direção da força.”",
    enunciado: "Qual é o trabalho realizado pela força?",
    alternativas: ["200 J", "54 J", "12,5 J", "0 J", "100 J"],
    correta: 0,
    explicacao: "Trabalho = força × deslocamento = 50 N × 4 m = 200 J.",
  },
  {
    id: "nat3",
    area: "natureza",
    tema: "Química",
    apoio: "Leia:\n\n“A queima de combustíveis fósseis libera gases que reagem com a água da atmosfera, formando substâncias ácidas que caem com a chuva, prejudicando solos, rios e construções.”",
    enunciado: "A chuva ácida é causada principalmente pela emissão de:",
    alternativas: [
      "Óxidos de enxofre e nitrogênio provenientes da queima de combustíveis.",
      "Gás nobre hélio.",
      "Vapor de água puro.",
      "Oxigênio molecular.",
      "Gás carbônico liberado pela respiração das plantas.",
    ],
    correta: 0,
    explicacao:
      "SO₂ e NOₓ reagem com a água na atmosfera formando ácidos (sulfúrico e nítrico), que caem com a chuva.",
  },
  {
    id: "nat4",
    area: "natureza",
    tema: "Biologia e saúde",
    apoio: "Leia:\n\n“Durante a estiagem, a fumaça das queimadas cobre as cidades e a qualidade do ar atinge níveis não recomendados pela OMS.”",
    enunciado: "Um efeito direto dessa fumaça à saúde humana é:",
    alternativas: [
      "Agravamento de doenças respiratórias, como asma e bronquite.",
      "Aumento da acuidade visual.",
      "Melhora da capacidade pulmonar.",
      "Fortalecimento do sistema imunológico.",
      "Redução das alergias respiratórias.",
    ],
    correta: 0,
    explicacao:
      "O material particulado agride as vias respiratórias e agrava doenças como asma, bronquite e DPOC.",
  },
  {
    id: "nat5",
    area: "natureza",
    tema: "Física",
    apoio: "Leia:\n\n“Painéis solares convertem a luz do Sol em energia elétrica. Diferente do petróleo, o Sol não se esgota na escala de tempo humana.”",
    enunciado: "A energia solar é considerada uma fonte renovável porque:",
    alternativas: [
      "É naturalmente reabastecida e não se esgota na escala humana.",
      "Só funciona em dias nublados.",
      "Produz gases do efeito estufa em grande escala.",
      "Depende de combustíveis fósseis.",
      "É mais barata que qualquer outra fonte de energia.",
    ],
    correta: 0,
    explicacao:
      "Fontes renováveis, como solar e eólica, se reabastecem continuamente e emitem pouco carbono na operação.",
  },
  {
    id: "nat6",
    area: "natureza",
    tema: "Química e clima",
    apoio: "Leia:\n\n“Sem o efeito estufa natural, a temperatura média da Terra seria cerca de 33 °C mais baixa, tornando a vida difícil. O problema surge quando ele se intensifica.”",
    enunciado: "Sobre o efeito estufa, é correto afirmar que:",
    alternativas: [
      "É natural e mantém a Terra habitável; em excesso, causa aquecimento global.",
      "É totalmente prejudicial e não deveria existir.",
      "Resfria o planeta permanentemente.",
      "É causado apenas por vulcões.",
      "Impede completamente a entrada de luz solar.",
    ],
    correta: 0,
    explicacao:
      "Sem o efeito estufa natural a Terra seria congelante. O problema é sua intensificação por gases emitidos pela atividade humana.",
  },

  // ================= MATEMÁTICA =================
  {
    id: "mat1",
    area: "matematica",
    tema: "Porcentagem",
    apoio: "Leia a situação:\n\n“Uma blusa custava R$ 80,00 e entrou em promoção com 25% de desconto.”",
    enunciado: "Qual é o preço final da blusa?",
    alternativas: ["R$ 60,00", "R$ 55,00", "R$ 20,00", "R$ 75,00", "R$ 65,00"],
    correta: 0,
    explicacao: "25% de 80 = 20. Logo, 80 − 20 = R$ 60,00.",
  },
  {
    id: "mat2",
    area: "matematica",
    tema: "Função do 1º grau",
    apoio: "Leia:\n\n“Um táxi cobra R$ 5,00 de bandeirada (valor fixo) mais R$ 2,00 por quilômetro rodado.”",
    enunciado:
      "A função que representa o valor V em função dos quilômetros x é:",
    alternativas: [
      "V = 5 + 2x",
      "V = 2 + 5x",
      "V = 7x",
      "V = 5x − 2",
      "V = 2x − 5",
    ],
    correta: 0,
    explicacao:
      "A bandeirada é o valor fixo (5) e o preço por km é o coeficiente angular (2): V = 5 + 2x.",
  },
  {
    id: "mat3",
    area: "matematica",
    tema: "Geometria",
    apoio: "Leia:\n\n“Um retângulo tem 8 cm de comprimento e 5 cm de largura.”",
    enunciado: "Qual é a área desse retângulo?",
    alternativas: ["40 cm²", "13 cm²", "26 cm²", "80 cm²", "20 cm²"],
    correta: 0,
    explicacao: "Área do retângulo = comprimento × largura = 8 × 5 = 40 cm².",
  },
  {
    id: "mat4",
    area: "matematica",
    tema: "Estatística",
    apoio: "Leia:\n\n“As notas de um aluno em quatro provas foram: 6, 7, 8 e 7.”",
    enunciado: "Qual é a média aritmética dessas notas?",
    alternativas: ["7", "6,5", "7,5", "8", "6"],
    correta: 0,
    explicacao: "Média = (6 + 7 + 8 + 7) / 4 = 28 / 4 = 7.",
  },
  {
    id: "mat5",
    area: "matematica",
    tema: "Probabilidade",
    apoio: "Leia:\n\n“Um dado comum tem 6 faces, numeradas de 1 a 6, todas com a mesma chance.”",
    enunciado: "Ao lançar o dado, qual é a probabilidade de sair um número par?",
    alternativas: ["1/2", "1/3", "1/6", "2/3", "1/4"],
    correta: 0,
    explicacao:
      "Pares: 2, 4 e 6 → 3 casos favoráveis em 6 possíveis = 3/6 = 1/2.",
  },
  {
    id: "mat6",
    area: "matematica",
    tema: "Razão e proporção",
    apoio: "Leia:\n\n“Em uma papelaria, 3 cadernos iguais custam R$ 45,00.”",
    enunciado: "Quanto custariam 5 cadernos do mesmo tipo?",
    alternativas: ["R$ 75,00", "R$ 60,00", "R$ 90,00", "R$ 70,00", "R$ 80,00"],
    correta: 0,
    explicacao:
      "Cada caderno custa 45 / 3 = R$ 15. Então 5 × 15 = R$ 75,00.",
  },
];

if (typeof module !== "undefined") {
  module.exports = { AREAS, QUESTOES, SVG };
}
