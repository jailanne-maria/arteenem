// NINA — Glossário de Inteligência Artificial (A a Z)
// Termos explicados de forma simples, para estudantes do Ensino Médio.

const GLOSSARIO = [
  // ---------- A ----------
  { termo: "Algoritmo", en: "", def: "Uma sequência de passos e regras que o computador segue para resolver um problema. É como uma receita de bolo, mas para o computador." },
  { termo: "Aprendizado de Máquina", en: "Machine Learning", def: "Quando o computador aprende com exemplos, em vez de ser programado regra por regra. Ele vê muitos casos e descobre os padrões sozinho." },
  { termo: "Alucinação", en: "Hallucination", def: "Quando a IA 'inventa' uma informação errada com cara de verdade. Por isso é sempre bom conferir as respostas em fontes confiáveis." },
  { termo: "API", en: "", def: "Uma 'ponte' que permite um programa conversar com outro. É por meio dela que o NINA conversa com a IA." },

  // ---------- B ----------
  { termo: "Big Data", en: "", def: "Conjunto gigantesco de dados, grande demais para uma pessoa analisar sozinha. É o 'combustível' da IA." },
  { termo: "Bot", en: "", def: "Programa que executa tarefas automáticas. Pode responder mensagens, agendar coisas ou jogar." },

  // ---------- C ----------
  { termo: "Chatbot", en: "", def: "Programa que conversa por texto. O NINA tem uma parte assim, que ajuda a criar revisões e atividades." },
  { termo: "Computação em nuvem", en: "Cloud Computing", def: "Usar computadores potentes de empresas pela internet, sem precisar ter a máquina no seu aparelho." },
  { termo: "Código aberto", en: "Open Source", def: "Programa cujo código qualquer pessoa pode ver, estudar e melhorar. É o caso do NINA!" },
  { termo: "Corpus", en: "", def: "Conjunto de textos usado para treinar uma IA. Quanto maior e mais variado, melhor ela aprende." },

  // ---------- D ----------
  { termo: "Dados", en: "Data", def: "Informações em forma de números, textos, imagens ou sons. É a matéria-prima da IA." },
  { termo: "Aprendizado Profundo", en: "Deep Learning", def: "Tipo de IA que usa muitas camadas de neurônios artificiais. É o que permite reconhecer imagens, vozes e gerar textos." },
  { termo: "Deepfake", en: "", def: "Vídeo, áudio ou imagem falsa criada por IA, imitando uma pessoa real. Um alerta importante contra a desinformação." },
  { termo: "Dados de treinamento", en: "Training Data", def: "Os exemplos que a IA usa para aprender. Se os dados têm preconceito, a IA também aprende o preconceito." },

  // ---------- E ----------
  { termo: "Ética em IA", en: "AI Ethics", def: "Conjunto de princípios sobre como usar IA de forma justa, segura e respeitosa com as pessoas." },
  { termo: "Embedding", en: "", def: "Transformar palavras ou imagens em números que o computador consegue comparar e entender." },

  // ---------- F ----------
  { termo: "Ajuste fino", en: "Fine-tuning", def: "Pegar uma IA que já é boa em geral e treiná-la mais um pouco para uma tarefa específica, como responder sobre arte." },
  { termo: "Fake News", en: "", def: "Notícia falsa. Com IA, ela pode ser criada e espalhada muito rápido — por isso o pensamento crítico é essencial." },

  // ---------- G ----------
  { termo: "GPT", en: "Generative Pre-trained Transformer", def: "Um tipo de modelo de linguagem que gera texto. É a base de vários assistentes de IA que conversam com a gente." },
  { termo: "IA Generativa", en: "Generative AI", def: "IA que cria conteúdo novo: textos, imagens, músicas, vídeos. É a que o NINA usa para gerar revisões e atividades." },
  { termo: "GPU", en: "", def: "Placa de vídeo potente. Nasceu para jogos, mas hoje é usada para treinar e rodar IA." },

  // ---------- H ----------
  { termo: "Hiperparâmetros", en: "Hyperparameters", def: "Ajustes que a pessoa define antes do treino, como 'quantas vezes a IA vai estudar o material'." },
  { termo: "IA Humanizada", en: "", def: "Ideia de fazer a IA se comunicar de um jeito mais próximo e acolhedor. O nome NINA é um exemplo disso: IA falada com carinho." },

  // ---------- I ----------
  { termo: "Inteligência Artificial", en: "Artificial Intelligence (AI)", def: "Sistemas de computador que imitam capacidades humanas, como aprender, entender linguagem e tomar decisões." },
  { termo: "Inferência", en: "Inference", def: "O momento em que a IA já treinada recebe um pedido e produz uma resposta. É o 'usar', não o 'aprender'." },
  { termo: "IA Responsável", en: "Responsible AI", def: "Usar IA com transparência, sem preconceito, respeitando a privacidade e avisando quando algo é gerado por máquina." },

  // ---------- J ----------
  { termo: "Jailbreak de prompt", en: "", def: "Tentar burlar as regras de segurança de uma IA com pedidos espertos. É como tentar 'driblar' o sistema — e geralmente é bloqueado." },

  // ---------- K ----------
  { termo: "KNN", en: "K-Nearest Neighbors", def: "Algoritmo simples que classifica algo olhando os 'vizinhos mais próximos'. Ex.: descobrir o gênero de um filme pelos filmes parecidos." },

  // ---------- L ----------
  { termo: "LLM", en: "Large Language Model", def: "Modelo de linguagem grande, treinado com uma quantidade enorme de texto. É o que permite a IA conversar e escrever." },
  { termo: "Linguagem Natural", en: "Natural Language", def: "O jeito que a gente fala e escreve no dia a dia — diferente da linguagem de programação." },

  // ---------- M ----------
  { termo: "Modelo", en: "Model", def: "O 'cérebro' treinado da IA. É o resultado de todo o aprendizado, guardado e pronto para usar." },
  { termo: "Multimodal", en: "", def: "IA que entende mais de um tipo de conteúdo ao mesmo tempo: texto, imagem, som e vídeo juntos." },

  // ---------- N ----------
  { termo: "NINA", en: "", def: "O nome do nosso app! Vem do jeitinho afetuoso de dizer que ele foi desenvolvido com IA — Inteligência Artificial." },
  { termo: "Neurônio artificial", en: "", def: "A unidade básica de uma rede neural. Recebe informações, faz uma continha e passa adiante." },
  { termo: "Processamento de Linguagem Natural", en: "NLP", def: "Área da IA que ensina o computador a entender e produzir a língua humana." },

  // ---------- O ----------
  { termo: "Overfitting", en: "Superajuste", def: "Quando a IA 'decora' os exemplos do treino e não consegue ir bem em casos novos. É como decorar a prova sem entender a matéria." },
  { termo: "Open Source", en: "Código aberto", def: "Programa cujo código qualquer pessoa pode ver, estudar e melhorar. É o caso do NINA!" },

  // ---------- P ----------
  { termo: "Prompt", en: "", def: "O pedido ou a instrução que você dá para a IA. Um bom prompt é claro, específico e diz o que você quer." },
  { termo: "Engenharia de Prompt", en: "Prompt Engineering", def: "A arte de escrever bons pedidos para a IA. Pequenas mudanças na pergunta mudam muito a resposta." },
  { termo: "Privacidade", en: "Privacy", def: "Proteção dos seus dados pessoais. Nunca coloque informações sensíveis em ferramentas de IA sem necessidade." },

  // ---------- Q ----------
  { termo: "Q-learning", en: "", def: "Algoritmo de aprendizado por reforço: a IA aprende tentando, errando e recebendo 'recompensas' até acertar. É assim que robôs aprendem a andar." },
  { termo: "IA Quântica", en: "Quantum AI", def: "Uso de computadores quânticos para tarefas de IA. Ainda está no começo, mas promete resolver problemas muito complexos." },

  // ---------- R ----------
  { termo: "Rede Neural", en: "Neural Network", def: "Sistema inspirado no cérebro humano, com camadas de neurônios artificiais que processam informações." },
  { termo: "Reconhecimento de imagem", en: "Computer Vision", def: "IA que identifica o que aparece numa foto: objetos, pessoas, animais, cores." },
  { termo: "Recomendação", en: "Recommendation", def: "IA que sugere coisas para você — vídeos, músicas, filmes. É o que existe por trás dos 'para você'." },

  // ---------- S ----------
  { termo: "Aprendizado Supervisionado", en: "Supervised Learning", def: "Quando a IA aprende com exemplos que já vêm com a resposta certa, como um gabarito." },
  { termo: "Supercomputador", en: "Supercomputer", def: "Computador extremamente potente, usado para pesquisa e para treinar modelos gigantes de IA." },

  // ---------- T ----------
  { termo: "Token", en: "", def: "Pedaço de palavra que a IA usa para processar texto. 'Inteligência' pode virar 'Inteli' + 'gência'." },
  { termo: "Transformer", en: "", def: "Arquitetura de rede neural que deu origem ao GPT e a outros modelos modernos de linguagem." },
  { termo: "Treinamento", en: "Training", def: "Processo em que a IA estuda milhões de exemplos e ajusta seus números internos para aprender." },

  // ---------- U ----------
  { termo: "Uso responsável", en: "", def: "Usar IA com ética, pensamento crítico e transparência. É sempre bom dizer quando um conteúdo foi gerado por IA." },
  { termo: "Usabilidade", en: "Usability", def: "O quanto uma ferramenta é fácil e agradável de usar. É o que faz o NINA ser simples para todo mundo." },

  // ---------- V ----------
  { termo: "Viés", en: "Bias", def: "Quando a IA reproduz preconceitos que estavam nos dados. Ex.: um sistema que erra mais com mulheres negras." },
  { termo: "Visão Computacional", en: "Computer Vision", def: "Área da IA que faz o computador 'enxergar' e interpretar imagens e vídeos." },
  { termo: "Assistente de voz", en: "Voice Assistant", def: "IA que entende a fala e responde com voz, como a Siri, a Alexa e o Google Assistente." },

  // ---------- W ----------
  { termo: "Whisper", en: "", def: "Modelo de IA que transforma áudio em texto. É um exemplo de IA de código aberto para reconhecimento de fala." },

  // ---------- X ----------
  { termo: "XAI", en: "IA Explicável — Explainable AI", def: "IA que consegue explicar como chegou àquela resposta. Muito importante na educação e na saúde." },

  // ---------- Y ----------
  { termo: "YOLO", en: "You Only Look Once", def: "Modelo de visão computacional que detecta objetos em imagens muito rápido, olhando a imagem apenas uma vez." },

  // ---------- Z ----------
  { termo: "Zero-shot", en: "", def: "Quando a IA resolve uma tarefa que nunca viu no treinamento, só com a instrução que você deu. É 'aprender sem exemplos'." },
];

const LETRAS_GLOSSARIO = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

// Letra inicial de cada termo (ignora acentos: Á -> A)
function letraDoTermo(t) {
  return (t.termo.normalize("NFD").replace(/[\u0300-\u036f]/g, "")[0] || "").toUpperCase();
}

if (typeof module !== "undefined") {
  module.exports = { GLOSSARIO, LETRAS_GLOSSARIO, letraDoTermo };
}
