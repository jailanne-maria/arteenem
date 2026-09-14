// NINA — Figurinhas colecionáveis por área
// Cada acerto na roleta rende uma figurinha da área sorteada.

const FIGURINHAS = [
  // ---- Linguagens ----
  { id: "frida", area: "linguagens", nome: "Frida Kahlo", emoji: "🌺", raridade: "comum" },
  { id: "tarsila", area: "linguagens", nome: "Tarsila do Amaral", emoji: "🌴", raridade: "comum" },
  { id: "machado", area: "linguagens", nome: "Machado de Assis", emoji: "📖", raridade: "rara" },
  { id: "clarice", area: "linguagens", nome: "Clarice Lispector", emoji: "✍️", raridade: "rara" },
  { id: "drummond", area: "linguagens", nome: "Carlos Drummond", emoji: "🪨", raridade: "lendaria" },

  // ---- Humanas ----
  { id: "chico", area: "humanas", nome: "Chico Mendes", emoji: "🌳", raridade: "lendaria" },
  { id: "darcy", area: "humanas", nome: "Darcy Ribeiro", emoji: "📚", raridade: "rara" },
  { id: "freire", area: "humanas", nome: "Paulo Freire", emoji: "🎓", raridade: "rara" },
  { id: "marielle", area: "humanas", nome: "Marielle Franco", emoji: "✊🏽", raridade: "lendaria" },
  { id: "milton", area: "humanas", nome: "Milton Santos", emoji: "🗺️", raridade: "comum" },

  // ---- Natureza ----
  { id: "chagas", area: "natureza", nome: "Carlos Chagas", emoji: "🔬", raridade: "rara" },
  { id: "oswaldo", area: "natureza", nome: "Oswaldo Cruz", emoji: "💉", raridade: "comum" },
  { id: "bertha", area: "natureza", nome: "Bertha Lutz", emoji: "🐸", raridade: "rara" },
  { id: "vital", area: "natureza", nome: "Vital Brazil", emoji: "🐍", raridade: "comum" },
  { id: "johanna", area: "natureza", nome: "Johanna Döbereiner", emoji: "🌱", raridade: "lendaria" },

  // ---- Matemática ----
  { id: "pitagoras", area: "matematica", nome: "Pitágoras", emoji: "📐", raridade: "comum" },
  { id: "turing", area: "matematica", nome: "Alan Turing", emoji: "💻", raridade: "lendaria" },
  { id: "katherine", area: "matematica", nome: "Katherine Johnson", emoji: "🚀", raridade: "rara" },
  { id: "malba", area: "matematica", nome: "Malba Tahan", emoji: "🔢", raridade: "comum" },
  { id: "tatiana", area: "matematica", nome: "Tatiana Roque", emoji: "🧮", raridade: "rara" },
];

// Ordem das áreas na roleta (começando no topo, sentido horário)
const ORDEM_ROLETA = ["linguagens", "humanas", "natureza", "matematica"];

function figurinhaPorId(id) {
  return FIGURINHAS.find((f) => f.id === id) || null;
}

function figurinhasDaArea(area) {
  return FIGURINHAS.filter((f) => f.area === area);
}

if (typeof module !== "undefined") {
  module.exports = { FIGURINHAS, ORDEM_ROLETA, figurinhaPorId, figurinhasDaArea };
}
