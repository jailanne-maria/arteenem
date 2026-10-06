// NINA — Explorar: motor do jogo de plataforma 2D (canvas)
// Andar, pular, quebrar tijolos (sai cogumelo: +1 vida e forma grande),
// blocos "?" com as perguntas de verdadeiro/falso e a Desinformação como inimigo.
const PLATAFORMA = (() => {
  const TILE = 32;
  const VW = 25 * TILE; // 800
  const VH = 14 * TILE; // 448
  const ALTURA = 14;
  const GRAV = 0.62, MAX_Q = 13, ACC = 0.62, MAX_V = 3.55, FRIC = 0.76, JUMP = 10.9;

  const VAZIO = 0, CHAO = 1, PLAT = 2, TIJOLO = 3, INTERROGACAO = 4, USADO = 5;

  // Estrutura fixa da fase (conforme o roteiro: casos, checkpoint e bandeira)
  const TILES_CASOS = [30, 70, 115, 155];
  const TILE_CHECKPOINT = 95;
  const TILE_BANDEIRA = 184;
  const MAX_CORACOES = 5;

  let cv, ctx, mapa, largTiles;
  let jog, cam, inimigos, cogumelos, particulas, bandeira;
  let vidas = 3, pontos = 0, cogumelosPegos = 0, grande = false, invuln = 0;
  let rodando = false, pausado = false, raf = null, ultimo = 0, flash = 0;
  let fase = null, emojiJog = "🧑🏽", cbs = {};
  let respondidas = {}, perguntaPendente = null, acertos = 0, perguntaDoBloco = {};
  let puloAntes = false, pulos = 0;
  let checkpointX = 0, checkpointAtivo = false;
  let quebrados = new Set(), inimigosMortos = new Set();
  let cogumeloEm = new Set();
  const teclas = {};
  const input = { esq: false, dir: false, pulo: false };
  const controlesLigados = [];

  // ---------- utilidades ----------
  function semente(txt) {
    let h = 2166136261;
    for (let i = 0; i < txt.length; i++) { h ^= txt.charCodeAt(i); h = Math.imul(h, 16777619); }
    return h >>> 0;
  }
  function rng(s) {
    let a = s;
    return () => {
      a |= 0; a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  const tile = (tx, ty) => (tx < 0 || tx >= largTiles || ty < 0 || ty >= ALTURA ? CHAO : mapa[ty][tx]);
  const porTile = (v) => Math.floor(v / TILE);

  const SOLIDO = (t) => t === CHAO || t === PLAT || t === TIJOLO || t === INTERROGACAO || t === USADO;

  function mistura(hexA, hexB, f) {
    const a = parseInt(hexA.replace("#", ""), 16);
    const b = parseInt(hexB.replace("#", ""), 16);
    const r = Math.round(((a >> 16) & 255) * (1 - f) + ((b >> 16) & 255) * f);
    const g = Math.round(((a >> 8) & 255) * (1 - f) + ((b >> 8) & 255) * f);
    const bl = Math.round((a & 255) * (1 - f) + (b & 255) * f);
    return "rgb(" + r + "," + g + "," + bl + ")";
  }

  // ---------- personagem (boneco inteiro, em pixel) ----------
  const BONECO = [
    "....HHHH....",
    "...HHHHHH...",
    "...HSSSSH...",
    "...SESSES...",
    "...SSSSSS...",
    "....SSSS....",
    "...CCCCCC...",
    "..CCCCCCCC..",
    ".ACCCCCCCA..",
    ".ACCCCCCCA..",
    "..BBBBBBBB..",
    "..BBB..BBB..",
    "..SSS..SSS..",
    "..FFF..FFF..",
  ];
  const CORES_BONECO = { H: "#2b1a12", S: "#e0b088", E: "#14142b", C: "#e52521", A: "#e0b088", B: "#14142b", F: "#0b0b16" };
  const PELE = {
    menino1: "#f3d3b3", menina1: "#f3d3b3",
    menino2: "#cf9463", menina2: "#cf9463", neutro1: "#cf9463",
    menino3: "#8a5a34", menina3: "#8a5a34", neutro2: "#8a5a34",
  };
  const CAMISA = {
    menino1: "#e52521", menina1: "#6b3fd4", menino2: "#3b7dd8",
    menina2: "#e52521", menino3: "#43b047", menina3: "#fbd000",
    neutro1: "#43b047", neutro2: "#6b3fd4",
  };
  let peleAtual = PELE.menino2, camisaAtual = CAMISA.menino2;

  function definirCores(avatarId) {
    peleAtual = PELE[avatarId] || PELE.menino2;
    camisaAtual = CAMISA[avatarId] || CAMISA.menino2;
  }

  function corDaCelula(ch) {
    if (ch === "S" || ch === "A") return peleAtual;
    if (ch === "C") return camisaAtual;
    return CORES_BONECO[ch] || "#14142b";
  }

  // Desenha o boneco inteiro no canvas (anda, olha para o lado e mexe as pernas)
  function desenharBoneco(px, py, w, h, dir, andando, noChao, tempo) {
    const cw = w / 12, ch = h / 14;
    const passo = andando && noChao ? (Math.floor(tempo / 7) % 2 === 0 ? 1 : -1) : 0;
    ctx.save();
    if (dir < 0) {
      ctx.translate(px + w, py);
      ctx.scale(-1, 1);
    } else {
      ctx.translate(px, py);
    }
    for (let ly = 0; ly < BONECO.length; ly++) {
      for (let lx = 0; lx < BONECO[ly].length; lx++) {
        const celula = BONECO[ly][lx];
        if (celula === ".") continue;
        let x = lx;
        if (ly >= 11) x += passo * 0.5; // pernas balançando
        ctx.fillStyle = corDaCelula(celula);
        ctx.fillRect(Math.round(x * cw), Math.round(ly * ch), Math.ceil(cw) + 0.4, Math.ceil(ch) + 0.4);
      }
    }
    ctx.restore();
  }

  // Mesmo boneco em SVG (usado no mapa das fases)
  function svgBoneco(avatarId, escala) {
    const e = escala || 2;
    const peleAntes = peleAtual, camisaAntes = camisaAtual;
    definirCores(avatarId);
    let s = '<svg width="' + 12 * e + '" height="' + 14 * e + '" viewBox="0 0 12 14" xmlns="http://www.w3.org/2000/svg" shape-rendering="crispEdges">';
    for (let ly = 0; ly < BONECO.length; ly++) {
      for (let lx = 0; lx < BONECO[ly].length; lx++) {
        const celula = BONECO[ly][lx];
        if (celula === ".") continue;
        s += '<rect x="' + lx + '" y="' + ly + '" width="1" height="1" fill="' + corDaCelula(celula) + '"/>';
      }
    }
    s += "</svg>";
    peleAtual = peleAntes; camisaAtual = camisaAntes;
    return s;
  }

  function vivaCogumelos() { return cogumelos.length; }

  // ---------- montagem da fase ----------
  function montarMapa() {
    const r = rng(semente(fase.id));
    largTiles = 190;
    mapa = [];
    for (let y = 0; y < ALTURA; y++) mapa.push(new Array(largTiles).fill(VAZIO));
    for (let x = 0; x < largTiles; x++) { mapa[12][x] = CHAO; mapa[13][x] = CHAO; }

    const dif = fase.dificuldade || {};
    const nBuracos = Math.max(1, dif.buracos != null ? dif.buracos : 2);
    const nInimigos = Math.max(2, dif.inimigos != null ? dif.inimigos : 3);

    // Zonas seguras: em volta dos 4 casos, do checkpoint, do início e da bandeira
    const seguro = (x) =>
      TILES_CASOS.some((t) => Math.abs(x - t) <= 3) ||
      Math.abs(x - TILE_CHECKPOINT) <= 4 ||
      Math.abs(x - TILE_BANDEIRA) <= 4 ||
      x < 8 || x > largTiles - 8;

    // buracos (poços) — sempre longe dos casos e do checkpoint
    const buracos = [];
    let tentB = 0;
    while (buracos.length < nBuracos && tentB++ < 300) {
      const bx = 22 + Math.floor(r() * (largTiles - 55));
      const larg = 2 + Math.floor(r() * 2);
      let ok = bx + larg < largTiles - 10;
      for (let x = bx - 2; x < bx + larg + 2; x++) if (seguro(x)) ok = false;
      buracos.forEach((b) => { if (bx + larg + 2 > b.x - 2 && bx - 2 < b.x + b.larg + 2) ok = false; });
      if (!ok) continue;
      for (let x = bx; x < bx + larg; x++) { mapa[12][x] = VAZIO; mapa[13][x] = VAZIO; }
      buracos.push({ x: bx, larg });
    }
    const dentroBuraco = (x, w) => buracos.some((b) => x + w > b.x - 2 && x < b.x + b.larg + 2);

    // plataformas flutuantes (linhas 7 a 10 — alcançáveis)
    for (let i = 0; i < 9; i++) {
      const px = 12 + Math.floor(r() * (largTiles - 32));
      const py = 7 + Math.floor(r() * 4);
      const larg = 3 + Math.floor(r() * 3);
      if (dentroBuraco(px, larg)) continue;
      if (TILES_CASOS.some((t) => px - 1 <= t && t <= px + larg)) continue;
      for (let x = px; x < px + larg; x++) if (mapa[py][x] === VAZIO) mapa[py][x] = PLAT;
    }

    // Os 4 casos ficam sempre nos mesmos lugares (blocos 30, 70, 115 e 155)
    perguntaDoBloco = {};
    TILES_CASOS.forEach((tx, i) => {
      if (tx >= largTiles - 6) return;
      const ty = i % 2 === 0 ? 8 : 9;
      for (let y = 6; y <= 11; y++) if (mapa[y][tx] !== CHAO) mapa[y][tx] = VAZIO;
      mapa[ty][tx] = INTERROGACAO;
      perguntaDoBloco[tx + ":" + ty] = i;
      if (mapa[ty][tx - 1] === VAZIO) mapa[ty][tx - 1] = TIJOLO;
      if (mapa[ty][tx + 1] === VAZIO) mapa[ty][tx + 1] = TIJOLO;
    });

    // 2 tijolos com cogumelo (colados num caso, sempre alcançáveis)
    cogumeloEm = new Set();
    [[TILES_CASOS[0] + 2, 8], [TILES_CASOS[2] + 2, 8]].forEach(([x, y]) => {
      if (x < largTiles - 4 && mapa[y][x] === VAZIO) { mapa[y][x] = TIJOLO; cogumeloEm.add(x + ":" + y); }
    });
    let guard = 0;
    while (cogumeloEm.size < 2 && guard++ < 300) {
      const x = 16 + Math.floor(r() * (largTiles - 30));
      const y = 8 + Math.floor(r() * 2);
      if (mapa[y][x] === TIJOLO) cogumeloEm.add(x + ":" + y);
    }

    // checkpoint (bloco 95)
    checkpointX = TILE_CHECKPOINT * TILE;
    checkpointAtivo = false;

    // inimigos (Desinformação) — a quantidade cresce a cada fase
    inimigos = [];
    let criados = 0, tentI = 0;
    while (criados < nInimigos && tentI++ < 400) {
      const ex = 18 + Math.floor(r() * (largTiles - 40));
      if (seguro(ex) || dentroBuraco(ex - 2, 5)) continue;
      if (inimigos.some((e) => Math.abs(e.x - ex * TILE) < 5 * TILE)) continue;
      inimigos.push({
        x: ex * TILE, y: 12 * TILE - 24, w: 26, h: 24,
        dir: r() < 0.5 ? -1 : 1,
        min: Math.max(TILE, (ex - 3) * TILE),
        max: Math.min((largTiles - 8) * TILE, (ex + 3) * TILE),
        viva: true, id: "nuvem" + criados,
      });
      criados++;
    }

    cogumelos = [];
    particulas = [];
    quebrados = new Set();
    inimigosMortos = new Set();
    bandeira = { x: TILE_BANDEIRA * TILE, y: 0 };
    jog.x = 2 * TILE; jog.y = 10 * TILE; jog.vx = 0; jog.vy = 0; jog.noChao = false;
    if (jog.h !== 28) { jog.h = 28; }
    cam.x = 0;
  }

  // ---------- colisão ----------
  function colide(x, y, w, h) {
    const x0 = porTile(x), x1 = porTile(x + w - 1);
    const y0 = porTile(y), y1 = porTile(y + h - 1);
    for (let ty = y0; ty <= y1; ty++) {
      for (let tx = x0; tx <= x1; tx++) {
        if (SOLIDO(tile(tx, ty))) return true;
      }
    }
    return false;
  }

  function baterNoBloco(tx, ty) {
    const t = tile(tx, ty);
    if (t === INTERROGACAO) {
      const chave = tx + ":" + ty;
      if (respondidas[chave]) { mapa[ty][tx] = USADO; return; }
      return abrirPergunta(chave);
    }
    if (t === TIJOLO) {
      mapa[ty][tx] = VAZIO;
      quebrados.add(tx + ":" + ty);
      for (let i = 0; i < 6; i++) {
        particulas.push({ x: tx * TILE + 16, y: ty * TILE + 16, vx: (Math.random() - 0.5) * 5, vy: -3 - Math.random() * 3, vida: 30 });
      }
      if (cogumeloEm.has(tx + ":" + ty)) {
        cogumeloEm.delete(tx + ":" + ty);
        cogumelos.push({ x: tx * TILE + 3, y: ty * TILE - 30, w: 26, h: 26, vx: 1.3, vy: 0 });
      }
    }
  }

  // ---------- perguntas ----------
  function abrirPergunta(chave) {
    const partes = chave.split(":");
    const idx = perguntaDoBloco[chave] != null ? perguntaDoBloco[chave] : 0;
    perguntaPendente = { chave, tx: +partes[0], ty: +partes[1], idx };
    pausado = true;
    if (typeof cbs.aoPerguntar === "function") cbs.aoPerguntar(idx);
  }

  function responder(acertou) {
    const p = perguntaPendente;
    if (p) {
      respondidas[p.chave] = true;
      mapa[p.ty][p.tx] = USADO;
      perguntaPendente = null;
    }
    if (acertou) { pontos += 100; acertos++; }
    pausado = false;
    atualizarHudExterno();
  }

  // ---------- ciclo ----------
  function atualizar() {
    const j = jog;
    const alvoEsq = input.esq || teclas["ArrowLeft"] || teclas["a"] || teclas["A"];
    const alvoDir = input.dir || teclas["ArrowRight"] || teclas["d"] || teclas["D"];

    if (alvoEsq && !alvoDir) j.vx -= ACC;
    else if (alvoDir && !alvoEsq) j.vx += ACC;
    else j.vx *= FRIC;
    j.vx = Math.max(-MAX_V, Math.min(MAX_V, j.vx));
    if (Math.abs(j.vx) < 0.06) j.vx = 0;
    if (j.vx > 0.25) j.dir = 1;
    else if (j.vx < -0.25) j.dir = -1;

    const pulando = !!(input.pulo || teclas["ArrowUp"] || teclas["w"] || teclas["W"] || teclas[" "]);
    // Só pula quando APERTA (não vale ficar segurando): evita pular sem parar
    if (pulando && !puloAntes) j.puloBuffer = 7;
    else j.puloBuffer = Math.max(0, j.puloBuffer - 1);
    puloAntes = pulando;
    if (j.noChao) j.coyote = 7; else j.coyote = Math.max(0, j.coyote - 1);
    if (j.puloBuffer > 0 && j.coyote > 0) {
      j.vy = -JUMP; j.noChao = false; j.coyote = 0; j.puloBuffer = 0; j.y -= 2; pulos++;
    }
    if (!pulando && j.vy < -4) j.vy += 0.5; // pulo variável

    // horizontal
    const nx = j.x + j.vx;
    if (colide(nx, j.y, j.w, j.h)) {
      if (j.vx > 0) j.x = porTile(nx + j.w) * TILE - j.w - 0.01;
      else if (j.vx < 0) j.x = (porTile(nx) + 1) * TILE + 0.01;
      j.vx = 0;
    } else j.x = nx;

    // vertical: se já está apoiado no chão, fica parado (evita o boneco "quicando")
    const apoiado = colide(j.x, j.y + 1, j.w, j.h);
    if (apoiado && j.vy >= 0) {
      j.vy = 0;
      j.noChao = true;
    } else {
      j.noChao = false;
      j.vy = Math.min(MAX_Q, j.vy + GRAV);
      const ny = j.y + j.vy;
      if (colide(j.x, ny, j.w, j.h)) {
        if (j.vy > 0) {
          // pousou: alinha os PÉS no topo do bloco
          j.y = porTile(ny + j.h) * TILE - j.h;
          j.noChao = true;
        } else {
          // bateu a cabeça: alinha a cabeça embaixo do bloco
          const linhaTeto = porTile(ny);
          j.y = (linhaTeto + 1) * TILE;
          const tx = porTile(j.x + j.w / 2);
          for (let dx = -1; dx <= 1; dx++) {
            const t = tile(tx + dx, linhaTeto);
            if (t === TIJOLO || t === INTERROGACAO) { baterNoBloco(tx + dx, linhaTeto); break; }
          }
        }
        j.vy = 0;
      } else j.y = ny;
    }

    if (j.y > ALTURA * TILE + 40) return cairNoBuraco();

    // checkpoint (bloco 95): ao passar, vira o ponto de retomada
    if (!checkpointAtivo && j.x + j.w >= checkpointX) checkpointAtivo = true;

    // inimigos (pisado = eliminado até reiniciar a fase)
    for (const e of inimigos) {
      if (!e.viva) continue;
      e.x += e.dir * 1.05;
      if (e.x < e.min) { e.x = e.min; e.dir = 1; }
      if (e.x > e.max) { e.x = e.max; e.dir = -1; }
      if (intersecta(j, e)) {
        const porCima = j.vy > 1 && j.y + j.h - e.y < 20;
        if (porCima) {
          e.viva = false;
          if (e.id) inimigosMortos.add(e.id);
          j.vy = -7.5;
          pontos += 50;
        } else levarDano();
      }
    }

    // cogumelos
    for (const c of cogumelos) {
      c.vy = Math.min(MAX_Q, c.vy + GRAV);
      const cny = c.y + c.vy;
      if (colide(c.x, cny, c.w, c.h)) {
        if (c.vy > 0) { c.y = porTile(cny + c.h) * TILE - c.h - 0.01; c.vy = 0; } else c.vy = 0;
      } else c.y = cny;
      const cnx = c.x + c.vx;
      if (colide(cnx, c.y, c.w, c.h)) c.vx *= -1; else c.x = cnx;
      if (intersecta(j, c)) {
        c.pego = true;
        cogumelosPegos++;
        pontos += 50;
        // recupera um coração até o limite e concede a proteção (que não acumula)
        vidas = Math.min(MAX_CORACOES, vidas + 1);
        atualizarHudExterno();
        if (!grande) { grande = true; j.y -= 12; j.h = 40; }
      }
    }
    cogumelos = cogumelos.filter((c) => !c.pego && c.y < ALTURA * TILE + 80);

    for (const p of particulas) { p.x += p.vx; p.y += p.vy; p.vy += 0.4; p.vida--; }
    particulas = particulas.filter((p) => p.vida > 0);
    if (invuln > 0) invuln--;
    if (flash > 0) flash--;

    const alvoCam = Math.max(0, Math.min(largTiles * TILE - VW, j.x + j.w / 2 - VW * 0.42));
    cam.x += (alvoCam - cam.x) * 0.14;

    if (j.x + j.w >= bandeira.x) {
      const pendentes = fase.desafios.length - Object.keys(respondidas).length;
      if (pendentes > 0 && typeof cbs.aoCasosPendentes === "function") {
        pausado = true;
        return cbs.aoCasosPendentes(pendentes);
      }
      return terminarFase(true);
    }
  }

  const intersecta = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;

  // pequeno recuo (o jogador continua no lugar, não volta ao começo)
  function recuar() {
    jog.vx = (jog.dir > 0 ? -1 : 1) * 4;
    jog.vy = -4.5;
  }

  function levarDano() {
    if (invuln > 0) return;
    if (grande) {
      // perde a proteção e volta ao tamanho normal, continuando no lugar
      grande = false;
      if (jog.h !== 28) { jog.h = 28; jog.y += 12; }
      invuln = 90; flash = 18;
      recuar();
      return;
    }
    vidas--;
    atualizarHudExterno();
    if (vidas <= 0) return terminarFase(false);
    invuln = 90; flash = 18;
    recuar();
  }

  function cairNoBuraco() {
    // queda no poço: perde um coração mesmo com proteção, que é removida
    grande = false;
    if (jog.h !== 28) jog.h = 28;
    vidas--;
    atualizarHudExterno();
    if (vidas <= 0) return terminarFase(false);
    irParaCheckpoint();
  }

  function irParaCheckpoint() {
    const x = checkpointAtivo ? checkpointX + TILE : 2 * TILE;
    jog.x = x; jog.y = 10 * TILE;
    jog.vx = 0; jog.vy = 0; jog.noChao = false;
    cam.x = Math.max(0, Math.min(largTiles * TILE - VW, x - VW * 0.42));
    invuln = 90;
  }

  // leva o jogador até o próximo caso ainda não investigado
  function irParaCasoPendente() {
    const chave = Object.keys(perguntaDoBloco).find((k) => !respondidas[k]);
    if (chave) {
      const tx = parseInt(chave.split(":")[0], 10);
      jog.x = Math.max(TILE, (tx - 3) * TILE);
      jog.y = 10 * TILE;
      jog.vx = 0; jog.vy = 0; jog.noChao = false;
      cam.x = Math.max(0, Math.min(largTiles * TILE - VW, jog.x - VW * 0.42));
    }
    invuln = 90;
    pausado = false;
  }

  function retomarDoCheckpoint() {
    grande = false;
    if (jog.h !== 28) jog.h = 28;
    vidas = MAX_CORACOES;
    atualizarHudExterno();
    irParaCheckpoint();
  }

  function terminarFase(ganhou) {
    rodando = false;
    cancelAnimationFrame(raf);
    if (typeof cbs.aoTerminar === "function") {
      cbs.aoTerminar({
        ganhou, pontos, vidas, acertos,
        cogumelos: cogumelosPegos,
        casos: Object.keys(respondidas).length,
        totalCasos: fase.desafios.length,
      });
    }
  }

  function atualizarHudExterno() {
    if (typeof cbs.aoMudarVidas === "function") cbs.aoMudarVidas(vidas);
  }

  // ---------- desenho ----------
  function desenhar() {
    ctx.imageSmoothingEnabled = false;
    const ceu = ctx.createLinearGradient(0, 0, 0, VH);
    const tinta = fase.cor || "#5c94fc";
    ceu.addColorStop(0, mistura("#5c94fc", tinta, 0.32));
    ceu.addColorStop(0.6, mistura("#bcdcff", tinta, 0.22));
    ceu.addColorStop(1, "#eaf5ff");
    ctx.fillStyle = ceu;
    ctx.fillRect(0, 0, VW, VH);

    ctx.fillStyle = "rgba(255,255,255,0.85)";
    const off = (cam.x * 0.25) % 600;
    for (let i = -1; i < 3; i++) {
      const bx = i * 600 - off;
      ctx.fillRect(bx + 60, 60, 90, 22);
      ctx.fillRect(bx + 80, 44, 50, 22);
      ctx.fillRect(bx + 360, 112, 70, 18);
      ctx.fillRect(bx + 380, 100, 34, 18);
    }

    const x0 = Math.max(0, porTile(cam.x) - 1);
    const x1 = Math.min(largTiles - 1, porTile(cam.x + VW) + 1);
    for (let ty = 0; ty < ALTURA; ty++) {
      for (let tx = x0; tx <= x1; tx++) {
        const t = mapa[ty][tx];
        if (!t) continue;
        const px = Math.round(tx * TILE - cam.x), py = ty * TILE;
        if (t === CHAO) {
          ctx.fillStyle = "#8a5a2b";
          ctx.fillRect(px, py, TILE, TILE);
          ctx.fillStyle = "#a9743c";
          ctx.fillRect(px + 3, py + 7, 8, 8);
          ctx.fillRect(px + 19, py + 18, 9, 8);
          if (ty === 0 || mapa[ty - 1][tx] === VAZIO) {
            ctx.fillStyle = "#43b047";
            ctx.fillRect(px, py, TILE, 9);
            ctx.fillStyle = "#2e7d32";
            ctx.fillRect(px, py + 9, TILE, 3);
          }
        } else if (t === PLAT) {
          ctx.fillStyle = "#a9743c";
          ctx.fillRect(px, py, TILE, TILE);
          ctx.fillStyle = "#43b047";
          ctx.fillRect(px, py, TILE, 8);
          ctx.strokeStyle = "#14142b";
          ctx.lineWidth = 3;
          ctx.strokeRect(px + 1.5, py + 1.5, TILE - 3, TILE - 3);
        } else if (t === TIJOLO) {
          ctx.fillStyle = "#c1662f";
          ctx.fillRect(px, py, TILE, TILE);
          ctx.strokeStyle = "#14142b";
          ctx.lineWidth = 3;
          ctx.strokeRect(px + 1.5, py + 1.5, TILE - 3, TILE - 3);
          ctx.fillStyle = "#8f451c";
          ctx.fillRect(px + 4, py + 12, TILE - 8, 3);
          ctx.fillRect(px + 12, py + 4, 3, 8);
          ctx.fillRect(px + 18, py + 18, 3, 10);
        } else if (t === INTERROGACAO) {
          const pulso = Math.sin(performance.now() / 220) * 2;
          ctx.fillStyle = "#fbd000";
          ctx.fillRect(px, py + pulso * 0, TILE, TILE);
          ctx.strokeStyle = "#14142b";
          ctx.lineWidth = 3;
          ctx.strokeRect(px + 1.5, py + 1.5, TILE - 3, TILE - 3);
          ctx.fillStyle = "#14142b";
          ctx.font = "bold 20px Verdana";
          ctx.textAlign = "center";
          ctx.fillText("?", px + TILE / 2, py + 24);
        } else if (t === USADO) {
          ctx.fillStyle = "#9a9ab5";
          ctx.fillRect(px, py, TILE, TILE);
          ctx.strokeStyle = "#14142b";
          ctx.lineWidth = 3;
          ctx.strokeRect(px + 1.5, py + 1.5, TILE - 3, TILE - 3);
        }
      }
    }

    // bandeira
    const bx = Math.round(bandeira.x - cam.x);
    ctx.fillStyle = "#14142b";
    ctx.fillRect(bx, 4 * TILE, 6, 8 * TILE);
    ctx.fillStyle = "#43b047";
    ctx.beginPath();
    ctx.moveTo(bx + 6, 4 * TILE + 6);
    ctx.lineTo(bx + 54, 4 * TILE + 20);
    ctx.lineTo(bx + 6, 4 * TILE + 34);
    ctx.closePath();
    ctx.fill();

    // cogumelos
    for (const c of cogumelos) {
      const px = Math.round(c.x - cam.x), py = c.y;
      ctx.fillStyle = "#e52521";
      ctx.beginPath();
      ctx.ellipse(px + 13, py + 13, 13, 12, 0, Math.PI, 0);
      ctx.fill();
      ctx.fillStyle = "#fff8e7";
      ctx.fillRect(px + 5, py + 5, 6, 6);
      ctx.fillRect(px + 16, py + 9, 5, 5);
      ctx.fillStyle = "#fff8e7";
      ctx.fillRect(px + 3, py + 13, 20, 13);
      ctx.fillStyle = "#14142b";
      ctx.fillRect(px + 7, py + 17, 4, 5);
      ctx.fillRect(px + 15, py + 17, 4, 5);
    }

    // inimigos
    for (const e of inimigos) {
      if (!e.viva) continue;
      const px = Math.round(e.x - cam.x), py = e.y;
      ctx.fillStyle = "#3b3b6b";
      ctx.beginPath();
      ctx.arc(px + 7, py + 9, 7, 0, Math.PI * 2);
      ctx.arc(px + 19, py + 9, 7, 0, Math.PI * 2);
      ctx.ellipse(px + 13, py + 16, 14, 11, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#fff";
      ctx.fillRect(px + 5, py + 12, 5, 5);
      ctx.fillRect(px + 16, py + 12, 5, 5);
      ctx.fillStyle = "#e52521";
      ctx.fillRect(px + 7, py + 14, 3, 3);
      ctx.fillRect(px + 18, py + 14, 3, 3);
    }

    ctx.fillStyle = "#c1662f";
    for (const p of particulas) ctx.fillRect(Math.round(p.x - cam.x), p.y, 7, 7);

    // jogador
    const px = Math.round(jog.x - cam.x);
    const piscando = invuln > 0 && Math.floor(invuln / 5) % 2 === 0;
    if (!piscando) {
      ctx.save();
      ctx.globalAlpha = 0.18;
      ctx.fillStyle = "#000";
      ctx.beginPath();
      ctx.ellipse(px + jog.w / 2, jog.y + jog.h + 2, jog.w * 0.45, 4, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      const andando = Math.abs(jog.vx) > 0.25;
      desenharBoneco(px, jog.y, jog.w, jog.h, jog.dir || 1, andando, jog.noChao, performance.now());
    }

    // HUD
    ctx.fillStyle = "rgba(20,20,43,0.75)";
    ctx.fillRect(0, 0, VW, 38);
    ctx.textAlign = "left";
    ctx.font = "bold 17px Verdana";
    ctx.fillStyle = "#fff8e7";
    let coracoes = "";
    for (let i = 0; i < Math.min(vidas, 6); i++) coracoes += "❤";
    ctx.fillText(coracoes || "❤", 14, 26);
    ctx.fillText("🍄 " + cogumelosPegos, 165, 26);
    ctx.textAlign = "right";
    ctx.fillText("PONTOS " + pontos, VW - 14, 26);
  }

  let acumulado = 0;
  function loop(t) {
    if (!rodando) return;
    const dt = Math.min(60, t - ultimo);
    ultimo = t;
    if (!pausado) {
      acumulado += dt;
      let passos = 0;
      while (acumulado >= 16.67 && passos < 4) { acumulado -= 16.67; passos++; atualizar(); }
    }
    desenhar();
    raf = requestAnimationFrame(loop);
  }

  // ---------- controles ----------
  function ligarControles(c) {
    desligarControles();
    const marcar = (el, campo) => {
      if (!el) return;
      const on = (e) => { e.preventDefault(); input[campo] = true; el.classList.add("ativo"); };
      const off = (e) => { e.preventDefault(); input[campo] = false; el.classList.remove("ativo"); };
      el.addEventListener("pointerdown", on);
      el.addEventListener("pointerup", off);
      el.addEventListener("pointercancel", off);
      el.addEventListener("pointerleave", off);
      el._limpar = () => {
        el.removeEventListener("pointerdown", on);
        el.removeEventListener("pointerup", off);
        el.removeEventListener("pointercancel", off);
        el.removeEventListener("pointerleave", off);
      };
      controlesLigados.push(el);
    };
    marcar(c.esq, "esq");
    marcar(c.dir, "dir");
    marcar(c.pulo, "pulo");
  }

  function desligarControles() {
    controlesLigados.forEach((el) => { if (el._limpar) el._limpar(); });
    controlesLigados.length = 0;
    input.esq = input.dir = input.pulo = false;
  }

  function aoTecla(e, baixou) {
    if (!rodando) return;
    const k = e.key;
    if (["ArrowLeft", "ArrowRight", "ArrowUp", " ", "ArrowDown"].indexOf(k) >= 0 && e.preventDefault) e.preventDefault();
    teclas[k] = baixou;
  }
  window.addEventListener("keydown", (e) => aoTecla(e, true));
  window.addEventListener("keyup", (e) => aoTecla(e, false));
  // Se a janela perder o foco, solta tudo (evita o boneco andando/pulando sozinho)
  window.addEventListener("blur", () => {
    input.esq = input.dir = input.pulo = false;
    Object.keys(teclas).forEach((k) => { teclas[k] = false; });
    controlesLigados.forEach((el) => el.classList.remove("ativo"));
    puloAntes = true;
  });

  // ---------- sessão (salvar / retomar) ----------
  function salvarSessao() {
    return {
      pontos: pontos,
      cogumelos: cogumelosPegos,
      acertos: acertos,
      vidas: vidas,
      grande: grande,
      checkpoint: checkpointAtivo,
      casos: Object.keys(respondidas),
      quebrados: Array.from(quebrados),
      mortos: Array.from(inimigosMortos),
    };
  }

  function aplicarSessao(s) {
    if (!s) return;
    pontos = s.pontos || 0;
    cogumelosPegos = s.cogumelos || 0;
    acertos = s.acertos || 0;
    vidas = Math.min(MAX_CORACOES, s.vidas || MAX_CORACOES);
    (s.casos || []).forEach((k) => {
      const p = k.split(":");
      const tx = +p[0], ty = +p[1];
      if (mapa[ty] && mapa[ty][tx] === INTERROGACAO) { mapa[ty][tx] = USADO; respondidas[k] = true; }
    });
    (s.quebrados || []).forEach((k) => {
      const p = k.split(":");
      if (mapa[+p[1]]) { mapa[+p[1]][+p[0]] = VAZIO; quebrados.add(k); }
    });
    (s.mortos || []).forEach((id) => {
      inimigos.forEach((e) => { if (e.id === id) e.viva = false; });
      inimigosMortos.add(id);
    });
    checkpointAtivo = !!s.checkpoint;
    if (s.grande) { grande = true; jog.h = 40; jog.y -= 12; }
    if (checkpointAtivo) jog.x = checkpointX + TILE;
  }

  // ---------- API ----------
  function iniciar(opcoes) {
    cv = opcoes.canvas;
    ctx = cv.getContext("2d");
    fase = opcoes.fase;
    emojiJog = opcoes.emoji || "🧑🏽";
    definirCores(opcoes.avatarId);
    cbs = opcoes.callbacks || {};
    vidas = opcoes.vidas || MAX_CORACOES;
    pontos = 0; cogumelosPegos = 0; grande = false; invuln = 0; flash = 0;
    respondidas = {}; perguntaPendente = null; acertos = 0; pausado = false; acumulado = 0;
    puloAntes = false; pulos = 0;
    jog = { x: 0, y: 0, vx: 0, vy: 0, w: 22, h: 28, noChao: false, puloBuffer: 0, coyote: 0, dir: 1 };
    cam = { x: 0 };
    montarMapa();
    if (opcoes.sessao) aplicarSessao(opcoes.sessao);
    ligarControles(opcoes.controles || {});
    rodando = true;
    ultimo = performance.now();
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(loop);
    atualizarHudExterno();
  }

  function parar() { rodando = false; cancelAnimationFrame(raf); desligarControles(); }

  return {
    iniciar,
    parar,
    responder,
    svgBoneco,
    salvarSessao,
    irParaCasoPendente,
    retomarDoCheckpoint,
    _estado: () => ({
      x: jog ? Math.round(jog.x) : 0, y: jog ? Math.round(jog.y) : 0,
      vidas, pontos, grande, pausado, rodando, acertos, pulos,
      noChao: jog ? !!jog.noChao : false, vy: jog ? Math.round(jog.vy * 100) / 100 : 0,
      respondidas: Object.keys(respondidas).length,
      cogumelos: vivaCogumelos(), inimigos: inimigos ? inimigos.length : 0, largTiles,
      perguntas: Object.keys(perguntaDoBloco).length,
      checkpoint: checkpointAtivo, checkpointX: Math.round(checkpointX / TILE),
      casos: Object.keys(respondidas).length,
      totalCasos: fase ? fase.desafios.length : 0,
      pendentes: fase ? fase.desafios.length - Object.keys(respondidas).length : 0,
    }),
    _teclas: teclas,
    _passo: (n) => { for (let i = 0; i < (n || 1); i++) { if (rodando) atualizar(); } desenhar(); },
    _teleporte: (x, y) => {
      if (!jog) return;
      jog.x = x;
      if (y != null) jog.y = y;
      jog.vx = 0; jog.vy = 0;
      cam.x = Math.max(0, Math.min(largTiles * TILE - VW, x - VW * 0.42));
    },
    _dano: () => levarDano(),
    _inimigos: () => inimigos.map((e) => ({ id: e.id, viva: e.viva, x: Math.round(e.x) })),
    _cogumelos: () => cogumelos.map((c) => ({ x: Math.round(c.x), y: Math.round(c.y) })),
    _pendente: () => perguntaPendente,
    _blocosPergunta: () => Object.keys(perguntaDoBloco),
    _cogumeloEm: () => Array.from(cogumeloEm),
    _quebrar: (tx, ty) => baterNoBloco(tx, ty),
    _irParaBandeira: () => { if (jog) jog.x = bandeira.x - 8; },
    _irParaCaso: (i) => { const ch = Object.keys(perguntaDoBloco).find((k) => perguntaDoBloco[k] === i); if (ch) { jog.x = (parseInt(ch.split(":")[0], 10) - 3) * TILE; jog.y = 10 * TILE; } },
    _session: salvarSessao,
  };
})();

if (typeof module !== "undefined") module.exports = { PLATAFORMA };
