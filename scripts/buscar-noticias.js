// Busca notícias de educação (MEC + Agência Brasil) e gera ideias de redação com IA.
// Roda automaticamente via GitHub Action (sem problema de CORS).

const fs = require("node:fs");

const FONTES_HTML = [
  { nome: "MEC", url: "https://www.gov.br/mec/pt-br/assuntos/noticias" },
];
const FONTES_RSS = [
  { nome: "Agência Brasil", url: "http://agenciabrasil.ebc.com.br/rss/educacao/feed.xml" },
  { nome: "Agência Brasil", url: "http://agenciabrasil.ebc.com.br/rss/geral/feed.xml" },
];

function limpar(t) {
  return String(t || "")
    .replace(/<!\[CDATA\[|\]\]>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/<[^>]+>/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function dataBR(d) {
  if (!d) return "";
  try {
    return new Date(d).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
  } catch {
    return "";
  }
}

async function buscarHTML(fonte) {
  const resp = await fetch(fonte.url, { headers: { "User-Agent": "Mozilla/5.0 (NINA)" } });
  if (!resp.ok) throw new Error(`${fonte.nome} HTTP ${resp.status}`);
  const html = await resp.text();
  const re = /<a[^>]+href="(https:\/\/www\.gov\.br\/mec\/pt-br\/assuntos\/noticias\/(\d{4})\/([a-zç]+)\/([^"]+))"[^>]*>([^<]{12,220})<\/a>/gi;
  const vistos = new Set();
  const out = [];
  let m;
  while ((m = re.exec(html)) !== null) {
    const link = m[1];
    const titulo = limpar(m[5]);
    if (!titulo || titulo.length < 12) continue;
    if (/^(Notícias|Mais|Todos|Ver)/i.test(titulo)) continue;
    if (vistos.has(link)) continue;
    vistos.add(link);
    out.push({ titulo, link, fonte: fonte.nome, data: `${m[3]}/${m[2]}` });
  }
  return out;
}

async function buscarRSS(fonte) {
  const resp = await fetch(fonte.url, { headers: { "User-Agent": "Mozilla/5.0 (NINA)" } });
  if (!resp.ok) throw new Error(`${fonte.nome} HTTP ${resp.status}`);
  const xml = await resp.text();
  const itens = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/gi)];
  return itens.map((it) => {
    const bloco = it[1];
    const titulo = limpar((bloco.match(/<title>([\s\S]*?)<\/title>/i) || [])[1]);
    const link = limpar((bloco.match(/<link>([\s\S]*?)<\/link>/i) || [])[1]);
    const pub = (bloco.match(/<pubDate>([\s\S]*?)<\/pubDate>/i) || [])[1];
    return { titulo, link, fonte: fonte.nome, data: dataBR(pub) };
  }).filter((n) => n.titulo && n.link);
}

async function gerarIdeiasIA(noticias) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) {
    console.log("Sem GEMINI_API_KEY — pulando ideias de redação com IA.");
    return [];
  }
  const manchetes = noticias.slice(0, 18).map((n) => `- ${n.titulo} (${n.fonte})`).join("\n");
  const prompt = `Aqui estão as principais notícias de educação da semana no Brasil:

${manchetes}

Com base nelas, sugira 5 possíveis temas de redação do ENEM. Para cada tema, informe:
- o tema (curto)
- o eixo temático (ex.: Cidadania, Tecnologia, Meio ambiente)
- uma linha de argumentação

Responda em JSON puro, no formato:
{"temas":[{"tema":"...","eixo":"...","argumento":"..."}]}`;

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${key}`;
  const resp = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
  });
  if (!resp.ok) throw new Error("IA HTTP " + resp.status);
  const data = await resp.json();
  let texto = (data?.candidates?.[0]?.content?.parts || []).map((p) => p.text || "").join("");
  texto = texto.replace(/```json|```/g, "").trim();
  const ini = texto.indexOf("{");
  const fim = texto.lastIndexOf("}");
  if (ini >= 0 && fim > ini) texto = texto.slice(ini, fim + 1);
  const parsed = JSON.parse(texto);
  return Array.isArray(parsed.temas) ? parsed.temas.slice(0, 6) : [];
}

async function main() {
  const noticias = [];

  for (const f of FONTES_HTML) {
    try {
      const itens = await buscarHTML(f);
      console.log(`${f.nome}: ${itens.length} notícias`);
      noticias.push(...itens);
    } catch (e) {
      console.error(`Falha em ${f.nome}: ${e.message}`);
    }
  }

  for (const f of FONTES_RSS) {
    try {
      const itens = await buscarRSS(f);
      console.log(`${f.nome} (${f.url.split("/").slice(-2, -1)[0]}): ${itens.length} notícias`);
      noticias.push(...itens);
    } catch (e) {
      console.error(`Falha em ${f.nome}: ${e.message}`);
    }
  }

  // Remove duplicadas por título
  const vistos = new Set();
  const unicas = [];
  for (const n of noticias) {
    const chave = n.titulo.toLowerCase().slice(0, 60);
    if (vistos.has(chave)) continue;
    vistos.add(chave);
    unicas.push(n);
  }

  let temas = [];
  try {
    temas = await gerarIdeiasIA(unicas);
    console.log(`Ideias de redação geradas: ${temas.length}`);
  } catch (e) {
    console.error("Falha ao gerar ideias:", e.message);
  }

  const saida = {
    atualizadoEm: new Date().toISOString(),
    fontes: ["MEC", "Agência Brasil"],
    noticias: unicas.slice(0, 24),
    temasRedacao: temas,
  };

  fs.writeFileSync("noticias.json", JSON.stringify(saida, null, 2), "utf8");
  console.log(`OK — ${saida.noticias.length} notícias e ${temas.length} temas salvos.`);
}

main().catch((e) => {
  console.error("Falha geral:", e.message);
  process.exit(1);
});
