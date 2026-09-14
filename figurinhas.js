// NINA — Figurinhas colecionáveis por área
// Cada figurinha homenageia uma pessoa (ou coletivo) e conta um pouco da sua história.
// Referências negras, indígenas e femininas valorizadas (Lei 11.645/08).

const FIGURINHAS = [
  // ================= LINGUAGENS =================
  { id: "machado", area: "linguagens", nome: "Machado de Assis", emoji: "📖", raridade: "rara",
    historia: "Escritor negro, fundador da Academia Brasileira de Letras. Escreveu 'Dom Casmurro' e 'Memórias Póstumas de Brás Cubas', revolucionando a literatura brasileira." },
  { id: "carolina", area: "linguagens", nome: "Carolina Maria de Jesus", emoji: "📔", raridade: "rara",
    historia: "Catadora de papel que virou escritora. Seu diário 'Quarto de Despejo' retratou a favela e a fome, tornando-se best-seller mundial." },
  { id: "conceicao", area: "linguagens", nome: "Conceição Evaristo", emoji: "✒️", raridade: "lendaria",
    historia: "Escritora e linguista mineira. Criou o conceito de 'escrevivência', unindo literatura e vivência negra. Autora de 'Ponciá Vicêncio'." },
  { id: "firmina", area: "linguagens", nome: "Maria Firmina dos Reis", emoji: "📜", raridade: "rara",
    historia: "Primeira romancista negra do Brasil. Em 1859 publicou 'Úrsula', com personagens negros humanizados — antes da abolição." },
  { id: "abdias", area: "linguagens", nome: "Abdias do Nascimento", emoji: "🎭", raridade: "lendaria",
    historia: "Artista, ativista e senador. Fundou o Teatro Experimental do Negro (1944), dando palco e voz a artistas negros no Brasil." },
  { id: "ruth", area: "linguagens", nome: "Ruth de Souza", emoji: "🎬", raridade: "lendaria",
    historia: "Atriz pioneira negra do teatro, da TV e do cinema. Abriu portas para gerações de artistas negros no audiovisual brasileiro." },
  { id: "tais", area: "linguagens", nome: "Taís Araújo", emoji: "📺", raridade: "rara",
    historia: "Atriz e apresentadora. Primeira protagonista negra de novela na TV brasileira, é voz ativa pela representatividade racial." },
  { id: "lazaro", area: "linguagens", nome: "Lázaro Ramos", emoji: "🎥", raridade: "rara",
    historia: "Ator, diretor e escritor. Protagonista do cinema e da TV, é referência de representatividade negra no audiovisual." },
  { id: "frida", area: "linguagens", nome: "Frida Kahlo", emoji: "🌺", raridade: "comum",
    historia: "Pintora mexicana que transformou dor e identidade em arte. Ícone do feminismo e da cultura latino-americana." },
  { id: "krenak", area: "linguagens", nome: "Ailton Krenak", emoji: "🌿", raridade: "lendaria",
    historia: "Líder indígena e escritor. Autor de 'Ideias para adiar o fim do mundo', defende os povos originários e a floresta." },

  // ================= HUMANAS =================
  { id: "chico", area: "humanas", nome: "Chico Mendes", emoji: "🌳", raridade: "lendaria",
    historia: "Seringueiro e sindicalista acreano. Liderou a defesa da floresta e dos povos da Amazônia. Assassinado em 1988." },
  { id: "marielle", area: "humanas", nome: "Marielle Franco", emoji: "✊🏽", raridade: "lendaria",
    historia: "Socióloga, vereadora do Rio e defensora dos direitos humanos. Assassinada em 2018; sua luta segue viva." },
  { id: "milton", area: "humanas", nome: "Milton Santos", emoji: "🗺️", raridade: "rara",
    historia: "Geógrafo negro, um dos maiores intelectuais do Brasil. Estudou a urbanização e a globalização vista do Sul." },
  { id: "lelia", area: "humanas", nome: "Lélia Gonzalez", emoji: "🖤", raridade: "lendaria",
    historia: "Filósofa e antropóloga. Pioneira do feminismo negro no Brasil, denunciou o racismo e o machismo na sociedade." },
  { id: "darcy", area: "humanas", nome: "Darcy Ribeiro", emoji: "📚", raridade: "rara",
    historia: "Antropólogo e educador. Defendeu a educação pública e os povos indígenas, e idealizou projetos de universidade." },
  { id: "freire", area: "humanas", nome: "Paulo Freire", emoji: "🎓", raridade: "rara",
    historia: "Educador pernambucano, patrono da educação brasileira. Criou a pedagogia libertadora: ensinar a ler o mundo." },

  // ================= NATUREZA =================
  { id: "chagas", area: "natureza", nome: "Carlos Chagas", emoji: "🔬", raridade: "rara",
    historia: "Médico e cientista. Descreveu a doença de Chagas e seu transmissor, o barbeiro — façanha única na história da medicina." },
  { id: "oswaldo", area: "natureza", nome: "Oswaldo Cruz", emoji: "💉", raridade: "comum",
    historia: "Médico sanitarista. Combateu a febre amarela e a varíola, e fundou o instituto que leva seu nome." },
  { id: "bertha", area: "natureza", nome: "Bertha Lutz", emoji: "🐸", raridade: "rara",
    historia: "Bióloga e feminista. Estudou anfíbios e liderou a luta pelo voto feminino no Brasil." },
  { id: "johanna", area: "natureza", nome: "Johanna Döbereiner", emoji: "🌱", raridade: "lendaria",
    historia: "Cientista que revolucionou a agricultura ao estudar bactérias que fixam nitrogênio no solo, reduzindo fertilizantes." },
  { id: "vital", area: "natureza", nome: "Vital Brazil", emoji: "🐍", raridade: "comum",
    historia: "Médico e pesquisador. Criou os soros antiofídicos e fundou o Instituto Butantan." },
  { id: "graziela", area: "natureza", nome: "Graziela Barroso", emoji: "🌻", raridade: "rara",
    historia: "Botânica, a 'primeira-dama da botânica brasileira'. Catalogou plantas e formou gerações de cientistas." },

  // ================= MATEMÁTICA =================
  { id: "pitagoras", area: "matematica", nome: "Pitágoras", emoji: "📐", raridade: "comum",
    historia: "Filósofo e matemático grego. O teorema de Pitágoras é um dos mais famosos da geometria." },
  { id: "turing", area: "matematica", nome: "Alan Turing", emoji: "💻", raridade: "lendaria",
    historia: "Matemático inglês, pai da computação. Decifrou códigos na 2ª Guerra e lançou as bases dos computadores." },
  { id: "katherine", area: "matematica", nome: "Katherine Johnson", emoji: "🚀", raridade: "rara",
    historia: "Matemática negra da NASA. Calculou trajetórias que levaram o ser humano à Lua." },
  { id: "enedina", area: "matematica", nome: "Enedina Alves Marques", emoji: "👷🏿‍♀️", raridade: "lendaria",
    historia: "Primeira engenheira negra do Brasil. Formada em 1945, abriu caminho para mulheres negras nas exatas." },
  { id: "malba", area: "matematica", nome: "Malba Tahan", emoji: "🔢", raridade: "comum",
    historia: "Pseudônimo de Júlio César de Mello e Souza, professor que ensinava matemática com histórias, como 'O Homem que Calculava'." },
  { id: "tatiana", area: "matematica", nome: "Tatiana Roque", emoji: "🧮", raridade: "rara",
    historia: "Matemática brasileira, autora de 'História da Matemática' e voz ativa sobre ciência e sociedade." },
];

// Ordem das áreas na roleta (começando no topo, sentido horário)
const ORDEM_ROLETA = ["linguagens", "humanas", "natureza", "matematica"];

// Cor de cada área
const CORES_AREA = {
  linguagens: "#e52521",
  humanas: "#43b047",
  natureza: "#d4a017",
  matematica: "#1b7ea6",
};

function figurinhaPorId(id) {
  return FIGURINHAS.find((f) => f.id === id) || null;
}

function figurinhasDaArea(area) {
  return FIGURINHAS.filter((f) => f.area === area);
}

if (typeof module !== "undefined") {
  module.exports = { FIGURINHAS, ORDEM_ROLETA, CORES_AREA, figurinhaPorId, figurinhasDaArea };
}
