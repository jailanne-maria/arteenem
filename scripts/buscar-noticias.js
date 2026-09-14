// Busca as notícias do MEC e salva em noticias.json
// Roda automaticamente via GitHub Action (sem problema de CORS).

const fs = require("node:fs");

const URL_MEC = "https://www.gov.br/mec/pt-br/assuntos/noticias";

const MESES = {
  janeiro: 1, fevereiro: 2, marco: 3, "março": 3, abril: 4, maio: 5, junho: 6,
  julho: 7, agosto: 8, setembro: 9, outubro: 10, novembro: 11, dezembro: 12,
};

function limpar(t) {
  return t
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

async function buscar() {
  const resp = await fetch(URL_MEC, {
    headers: { "User-Agent": "Mozilla/5.0 (NINA noticias bot)" },
  });
  if (!resp.ok) throw new Error("HTTP " + resp.status);
  const html = await resp.text();

  const re = /<a[^>]+href="(https:\/\/www\.gov\.br\/mec\/pt-br\/assuntos\/noticias\/(\d{4})\/([a-zç]+)\/([^"]+))"[^>]*>([^<]{12,220})<\/a>/gi;
  const vistos = new Set();
  const noticias = [];
  let m;
  while ((m = re.exec(html)) !== null) {
    const link = m[1];
    const ano = parseInt(m[2], 10);
    const mes = m[3];
    const titulo = limpar(m[5]);
    if (!titulo || titulo.length < 12) continue;
    if (/^(Notícias|Mais|Todos|Ver)/i.test(titulo)) continue;
    if (vistos.has(link)) continue;
    vistos.add(link);
    noticias.push({
      titulo,
      link,
      ano,
      mes,
      data: `${String(MESES[mes] || 1).padStart(2, "0")}/${ano}`,
    });
  }

  const saida = {
    atualizadoEm: new Date().toISOString(),
    fonte: URL_MEC,
    noticias: noticias.slice(0, 24),
  };

  fs.writeFileSync("noticias.json", JSON.stringify(saida, null, 2), "utf8");
  console.log(`OK — ${saida.noticias.length} notícias salvas em noticias.json`);
}

buscar().catch((e) => {
  console.error("Falha ao buscar notícias:", e.message);
  process.exit(1);
});
