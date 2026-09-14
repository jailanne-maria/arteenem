// NINA — Figurinhas colecionáveis por área
// Cada acerto na roleta rende uma figurinha da área sorteada.
// Referências negras e indígenas valorizadas (Lei 11.645/08).

const FIGURINHAS = [
  // ---- Linguagens ----
  { id: "machado", area: "linguagens", nome: "Machado de Assis", emoji: "📖", raridade: "rara" },
  { id: "carolina", area: "linguagens", nome: "Carolina Maria de Jesus", emoji: "📔", raridade: "rara" },
  { id: "conceicao", area: "linguagens", nome: "Conceição Evaristo", emoji: "✒️", raridade: "lendaria" },
  { id: "firmina", area: "linguagens", nome: "Maria Firmina dos Reis", emoji: "📜", raridade: "rara" },
  { id: "frida", area: "linguagens", nome: "Frida Kahlo", emoji: "🌺", raridade: "comum" },
  { id: "krenak", area: "linguagens", nome: "Ailton Krenak", emoji: "🌿", raridade: "lendaria" },

  // ---- Humanas ----
  { id: "chico", area: "humanas", nome: "Chico Mendes", emoji: "🌳", raridade: "lendaria" },
  { id: "marielle", area: "humanas", nome: "Marielle Franco", emoji: "✊🏽", raridade: "lendaria" },
  { id: "milton", area: "humanas", nome: "Milton Santos", emoji: "🗺️", raridade: "rara" },
  { id: "lelia", area: "humanas", nome: "Lélia Gonzalez", emoji: "🖤", raridade: "lendaria" },
  { id: "darcy", area: "humanas", nome: "Darcy Ribeiro", emoji: "📚", raridade: "rara" },
  { id: "freire", area: "humanas", nome: "Paulo Freire", emoji: "🎓", raridade: "rara" },

  // ---- Natureza ----
  { id: "chagas", area: "natureza", nome: "Carlos Chagas", emoji: "🔬", raridade: "rara" },
  { id: "oswaldo", area: "natureza", nome: "Oswaldo Cruz", emoji: "💉", raridade: "comum" },
  { id: "bertha", area: "natureza", nome: "Bertha Lutz", emoji: "🐸", raridade: "rara" },
  { id: "johanna", area: "natureza", nome: "Johanna Döbereiner", emoji: "🌱", raridade: "lendaria" },
  { id: "vital", area: "natureza", nome: "Vital Brazil", emoji: "🐍", raridade: "comum" },
  { id: "graziela", area: "natureza", nome: "Graziela Barroso", emoji: "🌻", raridade: "rara" },

  // ---- Matemática ----
  { id: "pitagoras", area: "matematica", nome: "Pitágoras", emoji: "📐", raridade: "comum" },
  { id: "turing", area: "matematica", nome: "Alan Turing", emoji: "💻", raridade: "lendaria" },
  { id: "katherine", area: "matematica", nome: "Katherine Johnson", emoji: "🚀", raridade: "rara" },
  { id: "enedina", area: "matematica", nome: "Enedina Alves Marques", emoji: "👷🏿‍♀️", raridade: "lendaria" },
  { id: "malba", area: "matematica", nome: "Malba Tahan", emoji: "🔢", raridade: "comum" },
  { id: "tatiana", area: "matematica", nome: "Tatiana Roque", emoji: "🧮", raridade: "rara" },
];

// Ordem das áreas na roleta (começando no topo, sentido horário)
const ORDEM_ROLETA = ["linguagens", "humanas", "natureza", "matematica"];

// Cor de cada área (usada na roleta, no álbum e nas barras)
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
