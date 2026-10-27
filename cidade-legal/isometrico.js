/* ══════════════════════════════════════════════════════════════════════════
   CIDADE LEGAL — Renderizador isométrico (2.5D) em canvas
   Tudo é desenhado em coordenadas de grade (linha r, coluna c, altura z),
   projetadas na tela por pt(). Objetos são ordenados por profundidade (r + c)
   para que o que está "na frente" seja pintado por último.
══════════════════════════════════════════════════════════════════════════ */

const Iso = (() => {
  let cv, ctx, W = 0, H = 0, dpr = 1, TW = 40, TH = 20, ox = 0, oy = 0;
  let zoom = 1, pan = { x: 0, y: 0 };
  let hover = -1, cursor = -1, aoClicar = () => {};
  let noite = false, mostrarPlacas = true, reduzido = false;
  const brotando = {};      // lote → instante em que foi construído
  const carros = [];
  const estrelas = Array.from({ length: 50 }, () => [Math.random(), Math.random() * .45, Math.random()]);
  const nuvens = [[.1, .08, 1], [.55, .04, .8], [.85, .12, 1.2]];
  let arraste = null;

  /* ── Projeção e utilidades de cor ───────────────────────────────────────── */
  const pt = (r, c, z = 0) => ({ x: ox + (c - r) * TW / 2, y: oy + (c + r) * TH / 2 - z * TW });

  function tom(hex, k) { // k > 0 clareia, k < 0 escurece
    const n = parseInt(hex.slice(1), 16);
    let rr = n >> 16, gg = (n >> 8) & 255, bb = n & 255;
    const alvo = k > 0 ? 255 : 0, f = Math.abs(k);
    rr = Math.round(rr + (alvo - rr) * f); gg = Math.round(gg + (alvo - gg) * f); bb = Math.round(bb + (alvo - bb) * f);
    return `rgb(${rr},${gg},${bb})`;
  }
  const cor = (hex, k = 0) => noite ? tom(hex, k - .42 * (1 - Math.max(0, k))) : tom(hex, k);

  function poli(pts, fill, stroke) {
    ctx.beginPath();
    pts.forEach((p, i) => i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y));
    ctx.closePath();
    if (fill) { ctx.fillStyle = fill; ctx.fill(); }
    if (stroke) { ctx.strokeStyle = stroke; ctx.stroke(); }
  }

  /* ── Primitivas 3D ──────────────────────────────────────────────────────── */
  // Caixa com base em [r0,r1]×[c0,c1], elevada em z, de altura h (em unidades de TW)
  function caixa(r0, c0, r1, c1, z, h, base) {
    poli([pt(r1, c0, z), pt(r1, c1, z), pt(r1, c1, z + h), pt(r1, c0, z + h)], cor(base, 0));       // face esquerda
    poli([pt(r1, c1, z), pt(r0, c1, z), pt(r0, c1, z + h), pt(r1, c1, z + h)], cor(base, -.2));      // face direita
    poli([pt(r0, c0, z + h), pt(r0, c1, z + h), pt(r1, c1, z + h), pt(r1, c0, z + h)], cor(base, .18)); // topo
  }
  function telhado(r0, c0, r1, c1, z, h, base) { // duas águas, cumeeira ao longo de c
    const rm = (r0 + r1) / 2;
    poli([pt(r0, c0, z), pt(r0, c1, z), pt(rm, c1, z + h), pt(rm, c0, z + h)], cor(base, .1));
    poli([pt(r1, c0, z), pt(r1, c1, z), pt(rm, c1, z + h), pt(rm, c0, z + h)], cor(base, 0));
    poli([pt(r1, c1, z), pt(r0, c1, z), pt(rm, c1, z + h)], cor('#F1E6D2', -.12));
  }
  function piramide(r0, c0, r1, c1, z, h, base) {
    const a = pt((r0 + r1) / 2, (c0 + c1) / 2, z + h);
    poli([pt(r0, c0, z), pt(r0, c1, z), a], cor(base, .15));
    poli([pt(r1, c0, z), pt(r0, c0, z), a], cor(base, .05));
    poli([pt(r1, c0, z), pt(r1, c1, z), a], cor(base, 0));
    poli([pt(r1, c1, z), pt(r0, c1, z), a], cor(base, -.2));
  }
  function cupula(r, c, z, raio, base) {
    const p = pt(r, c, z), R = raio * TW;
    const g = ctx.createRadialGradient(p.x - R * .4, p.y - R * .6, R * .1, p.x, p.y, R * 1.1);
    g.addColorStop(0, cor(base, .45)); g.addColorStop(1, cor(base, -.25));
    ctx.beginPath(); ctx.ellipse(p.x, p.y, R, R * .5, 0, 0, Math.PI); ctx.arc(p.x, p.y, R, Math.PI, 0); ctx.fillStyle = g; ctx.fill();
  }
  // Retângulos sobre as faces visíveis: u ao longo da face (0..1), z em unidades de TW
  function naFaceEsq(r1, c0, c1, u0, u1, z0, z1, fill) {
    const a = c0 + (c1 - c0) * u0, b = c0 + (c1 - c0) * u1;
    poli([pt(r1, a, z0), pt(r1, b, z0), pt(r1, b, z1), pt(r1, a, z1)], fill);
  }
  function naFaceDir(c1, r1, r0, u0, u1, z0, z1, fill) {
    const a = r1 + (r0 - r1) * u0, b = r1 + (r0 - r1) * u1;
    poli([pt(a, c1, z0), pt(b, c1, z0), pt(b, c1, z1), pt(a, c1, z1)], fill);
  }
  function janelas(b, z, h, cols, linhas, acesa) {
    const vidroE = acesa ? '#FFD86B' : cor('#BFE3F7', .05), vidroD = acesa ? '#F2C24F' : cor('#9CCDEB', -.05);
    for (let i = 0; i < cols; i++) for (let j = 0; j < linhas; j++) {
      const u0 = (i + .25) / cols, u1 = (i + .75) / cols;
      const z0 = z + h * (j + .3) / linhas, z1 = z + h * (j + .75) / linhas;
      const luz = acesa && ((i * 7 + j * 3 + b.r0 * 5) % 4 !== 0);
      naFaceEsq(b.r1, b.c0, b.c1, u0, u1, z0, z1, luz || !acesa ? vidroE : cor('#33415A'));
      naFaceDir(b.c1, b.r1, b.r0, u0, u1, z0, z1, luz || !acesa ? vidroD : cor('#2A3549'));
    }
  }
  function arvore(r, c, esc = 1, tipo = 0) {
    caixa(r - .03 * esc, c - .03 * esc, r + .03 * esc, c + .03 * esc, 0, .12 * esc, '#7A5134');
    const p = pt(r, c, .14 * esc), R = .13 * esc * TW;
    if (tipo === 1) { // pinheiro
      poli([{ x: p.x, y: p.y - R * 2.6 }, { x: p.x + R, y: p.y + R * .3 }, { x: p.x - R, y: p.y + R * .3 }], cor('#2E7D4F'));
      poli([{ x: p.x, y: p.y - R * 2.6 }, { x: p.x + R, y: p.y + R * .3 }, { x: p.x, y: p.y + R * .3 }], cor('#2E7D4F', -.15));
      return;
    }
    ctx.fillStyle = cor('#3F9B4A', -.05); ctx.beginPath(); ctx.arc(p.x, p.y - R * .4, R, 0, 7); ctx.fill();
    ctx.fillStyle = cor('#5DBB5A', .05); ctx.beginPath(); ctx.arc(p.x - R * .25, p.y - R * .75, R * .65, 0, 7); ctx.fill();
  }
  const limites = (g, f) => { const m = (1 - f) / 2; return { r0: g.r + m, c0: g.c + m, r1: g.r + 1 - m, c1: g.c + 1 - m }; };
  const porta = (b, cr = '#6B4B32') => naFaceEsq(b.r1, b.c0, b.c1, .4, .6, 0, .14, cor(cr));

  /* ── Prédios ────────────────────────────────────────────────────────────── */
  // Cada função desenha o prédio no lote g = {r, c} com fator de crescimento k (0..1+)
  const t = () => performance.now() / 1000;
  const CORES_CASA = ['#F4E1C1', '#CDE7F0', '#F6D6D6', '#E2F0CB', '#FFF1B8'];
  const PREDIOS_ISO = {
    prefeitura(g, k) {
      const b = limites(g, .9); caixa(b.r0, b.c0, b.r1, b.c1, 0, .05, '#CFC6B4');
      const m = limites(g, .74), h = .42 * k;
      caixa(m.r0, m.c0, m.r1, m.c1, .05, h, '#F3EBDD');
      for (let i = 0; i < 5; i++) naFaceEsq(m.r1, m.c0, m.c1, i / 5 + .07, i / 5 + .13, .05, .05 + h * .92, cor('#D8CCB4'));
      janelas(m, .05, h, 3, 2, noite);
      telhado(m.r0, m.c0, m.r1, m.c1, .05 + h, .1 * k, '#C9B48A');
      cupula(g.r + .5, g.c + .5, .05 + h + .1 * k, .17 * k, '#E2B33C');
      // bandeira
      const base = pt(m.r0 + .05, m.c1 - .05, .05 + h), topo = pt(m.r0 + .05, m.c1 - .05, .05 + h + .45 * k);
      ctx.strokeStyle = cor('#555555'); ctx.lineWidth = Math.max(1, TW / 40);
      ctx.beginPath(); ctx.moveTo(base.x, base.y); ctx.lineTo(topo.x, topo.y); ctx.stroke();
      const o = reduzido ? 0 : Math.sin(t() * 4) * TW * .02;
      poli([topo, { x: topo.x + TW * .2, y: topo.y + o }, { x: topo.x + TW * .2, y: topo.y + TW * .12 + o }, { x: topo.x, y: topo.y + TW * .12 }], cor('#1E9E5A'));
      ctx.fillStyle = cor('#F2D20F'); ctx.beginPath(); ctx.arc(topo.x + TW * .1, topo.y + TW * .06 + o / 2, TW * .035, 0, 7); ctx.fill();
    },
    casa(g, k) {
      const b = limites(g, .6), h = .28 * k, cr = CORES_CASA[(g.r * 3 + g.c) % CORES_CASA.length];
      caixa(b.r0 + .12, b.c1 - .14, b.r0 + .22, b.c1 - .04, 0, .58 * k, '#9C6B4E'); // chaminé
      caixa(b.r0, b.c0, b.r1, b.c1, 0, h, cr);
      porta(b);
      naFaceDir(b.c1, b.r1, b.r0, .3, .7, .1, .22, noite ? '#FFD86B' : cor('#9CCDEB'));
      telhado(b.r0 - .04, b.c0 - .04, b.r1 + .04, b.c1 + .04, h, .22 * k, (g.c % 2) ? '#C9553F' : '#3F6FB5');
    },
    aluguel(g, k) {
      const b = limites(g, .66), h = 1.05 * k;
      caixa(b.r0, b.c0, b.r1, b.c1, 0, h, '#8FA7C7');
      janelas(b, 0, h, 3, 6, noite);
      porta(b, '#40536E');
      caixa(b.r0 + .08, b.c0 + .1, b.r0 + .25, b.c0 + .27, h, .12 * k, '#B9C4D2');
    },
    mercado(g, k) {
      const b = limites(g, .8), h = .3 * k;
      caixa(b.r0, b.c0, b.r1, b.c1, 0, h, '#F7F1E3');
      naFaceEsq(b.r1, b.c0, b.c1, .08, .92, .02, h * .6, noite ? '#FFE9A8' : cor('#A8D8F0'));
      for (let i = 0; i < 6; i++) naFaceEsq(b.r1 + .06, b.c0, b.c1, i / 6, (i + 1) / 6, h * .62, h * .82, cor(i % 2 ? '#FFFFFF' : '#E07B2A'));
      naFaceDir(b.c1, b.r1, b.r0, .15, .85, .04, h * .6, noite ? '#F5D98A' : cor('#8CC6E4'));
      caixa(b.r0 + .2, b.c0 + .15, b.r0 + .3, b.c1 - .15, h, .14 * k, '#E07B2A');
    },
    fabrica(g, k) {
      const b = limites(g, .82), h = .34 * k;
      const ch = { r0: b.r0 + .05, c0: b.c1 - .2, r1: b.r0 + .2, c1: b.c1 - .05 };
      caixa(ch.r0, ch.c0, ch.r1, ch.c1, 0, .95 * k, '#8C5A3C');
      caixa(ch.r0, ch.c0, ch.r1, ch.c1, .82 * k, .05, '#F4F4F4');
      caixa(b.r0 + .25, b.c0, b.r1, b.c1, 0, h, '#B98C6A');
      for (let i = 0; i < 3; i++) telhado(b.r0 + .25, b.c0 + i * (b.c1 - b.c0) / 3, b.r1, b.c0 + (i + 1) * (b.c1 - b.c0) / 3, h, .12 * k, '#7D8794');
      janelas({ r0: b.r0 + .25, c0: b.c0, r1: b.r1, c1: b.c1 }, 0, h, 4, 1, noite);
      // fumaça
      if (k >= 1) for (let i = 0; i < 4; i++) {
        const f = ((reduzido ? i * .25 : t() * .35) + i * .25) % 1;
        const p = pt((ch.r0 + ch.r1) / 2, (ch.c0 + ch.c1) / 2, .9 + f * .7);
        ctx.fillStyle = `rgba(${noite ? '150,160,175' : '235,235,235'},${.75 * (1 - f)})`;
        ctx.beginPath(); ctx.arc(p.x + f * TW * .25, p.y, TW * (.07 + f * .1), 0, 7); ctx.fill();
      }
    },
    escola(g, k) {
      const b = limites(g, .84), h = .36 * k;
      caixa(b.r0, b.c0, b.r1, b.c1, 0, h, '#F2C14E');
      janelas(b, 0, h, 4, 2, noite);
      porta(b, '#8E3B2E');
      telhado(b.r0, b.c0, b.r1, b.c1, h, .16 * k, '#C0392B');
      const relogio = pt(b.r1 - .02, (b.c0 + b.c1) / 2, h + .06 * k);
      ctx.fillStyle = cor('#FFFFFF'); ctx.beginPath(); ctx.ellipse(relogio.x, relogio.y, TW * .06, TW * .05, 0, 0, 7); ctx.fill();
    },
    saude(g, k) {
      const b = limites(g, .76), h = .44 * k;
      caixa(b.r0, b.c0, b.r1, b.c1, 0, h, '#FFFFFF');
      janelas(b, 0, h * .7, 3, 2, noite);
      naFaceEsq(b.r1, b.c0, b.c1, .44, .56, h * .72, h * .96, '#E53935');
      naFaceEsq(b.r1, b.c0, b.c1, .36, .64, h * .8, h * .88, '#E53935');
      caixa(b.r0, b.c0, b.r1, b.c1, h, .03, '#D0D7DE');
      const c = pt(g.r + .5, g.c + .5, h + .03);
      ctx.strokeStyle = cor('#E53935'); ctx.lineWidth = Math.max(1, TW / 30);
      ctx.beginPath(); ctx.ellipse(c.x, c.y, TW * .14, TW * .07, 0, 0, 7); ctx.stroke();
    },
    parque(g, k) {
      const b = limites(g, .96);
      caixa(b.r0, b.c0, b.r1, b.c1, 0, .03, '#58B04F');
      poli([pt(g.r + .45, g.c + .02, .03), pt(g.r + .45, g.c + .98, .03), pt(g.r + .55, g.c + .98, .03), pt(g.r + .55, g.c + .02, .03)], cor('#E8D8A8'));
      const f = pt(g.r + .5, g.c + .5, .03);
      ctx.fillStyle = cor('#9AA3AE'); ctx.beginPath(); ctx.ellipse(f.x, f.y, TW * .16, TW * .08, 0, 0, 7); ctx.fill();
      ctx.fillStyle = cor('#5EC4F0'); ctx.beginPath(); ctx.ellipse(f.x, f.y, TW * .12, TW * .06, 0, 0, 7); ctx.fill();
      const jato = reduzido ? 0 : Math.abs(Math.sin(t() * 3)) * .04;
      ctx.fillStyle = 'rgba(190,235,255,.85)'; ctx.beginPath(); ctx.ellipse(f.x, f.y - TW * (.08 + jato), TW * .025, TW * (.07 + jato), 0, 0, 7); ctx.fill();
      arvore(g.r + .22, g.c + .22, .9 * k, 0); arvore(g.r + .22, g.c + .78, .8 * k, 1);
      arvore(g.r + .8, g.c + .22, .85 * k, 1); arvore(g.r + .8, g.c + .8, 1 * k, 0);
    },
    delegacia(g, k) {
      const b = limites(g, .74), h = .36 * k;
      caixa(b.r0, b.c0, b.r1, b.c1, 0, h, '#2F4E7E');
      naFaceEsq(b.r1, b.c0, b.c1, 0, 1, h * .78, h * .88, cor('#FFFFFF'));
      naFaceDir(b.c1, b.r1, b.r0, 0, 1, h * .78, h * .88, cor('#E6E6E6'));
      janelas(b, 0, h * .7, 3, 1, noite);
      porta(b, '#1B2E4B');
      const pisca = reduzido ? 0 : Math.floor(t() * 3) % 2;
      caixa(g.r + .44, g.c + .36, g.r + .56, g.c + .5, h, .07, pisca ? '#E53935' : '#7A2A2A');
      caixa(g.r + .44, g.c + .5, g.r + .56, g.c + .64, h, .07, pisca ? '#1E40AF' : '#2F6BFF');
    },
    forum(g, k) {
      const b = limites(g, .9);
      caixa(b.r0, b.c0, b.r1, b.c1, 0, .04, '#C9C6BE'); caixa(b.r0 + .04, b.c0 + .04, b.r1 - .04, b.c1 - .04, .04, .04, '#D8D5CD');
      const m = limites(g, .72), h = .4 * k, z = .08;
      caixa(m.r0, m.c0, m.r1 - .1, m.c1 - .1, z, h, '#E1DCD0');
      for (let i = 0; i < 4; i++) { const cc = m.c0 + .04 + i * (m.c1 - m.c0 - .16) / 3; caixa(m.r1 - .08, cc, m.r1 - .02, cc + .06, z, h, '#F5F2EA'); }
      for (let i = 1; i < 4; i++) { const rr = m.r1 - .06 - i * (m.r1 - m.r0 - .12) / 3; caixa(rr, m.c1 - .08, rr + .06, m.c1 - .02, z, h, '#F5F2EA'); }
      telhado(m.r0, m.c0, m.r1, m.c1, z + h, .14 * k, '#D2CCBC');
    },
    camara(g, k) {
      const b = limites(g, .8), h = .34 * k;
      caixa(b.r0, b.c0, b.r1, b.c1, 0, h, '#E8D9B5');
      janelas(b, 0, h, 4, 2, noite);
      porta(b, '#7A5A2E');
      caixa(g.r + .3, g.c + .3, g.r + .7, g.c + .7, h, .08 * k, '#D9C79E');
      cupula(g.r + .5, g.c + .5, h + .08 * k, .2 * k, '#3A6EA5');
    },
    cartorio(g, k) {
      const b = limites(g, .66), h = .44 * k;
      caixa(b.r0, b.c0, b.r1, b.c1, 0, h, '#B5523B');
      janelas(b, 0, h, 2, 2, noite);
      porta(b, '#5A2A1C');
      telhado(b.r0 - .03, b.c0 - .03, b.r1 + .03, b.c1 + .03, h, .2 * k, '#6E3324');
    },
    dados(g, k) {
      const b = limites(g, .76), h = .5 * k;
      caixa(b.r0, b.c0, b.r1, b.c1, 0, h, '#2B2F3A');
      for (let i = 0; i < 5; i++) for (let j = 0; j < 4; j++) {
        const on = reduzido || ((i * 13 + j * 7 + Math.floor(t() * 4)) % 5) > 1;
        const c1 = on ? (j % 2 ? '#3DF5C8' : '#5EE36B') : '#1F3A33';
        naFaceEsq(b.r1, b.c0, b.c1, i / 5 + .06, i / 5 + .12, h * (j + .4) / 4, h * (j + .55) / 4, c1);
        naFaceDir(b.c1, b.r1, b.r0, i / 5 + .06, i / 5 + .12, h * (j + .4) / 4, h * (j + .55) / 4, c1);
      }
      const a = pt(g.r + .4, g.c + .4, h), a2 = pt(g.r + .4, g.c + .4, h + .3 * k);
      ctx.strokeStyle = cor('#AAB4C3'); ctx.lineWidth = Math.max(1, TW / 45); ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(a2.x, a2.y); ctx.stroke();
      ctx.fillStyle = (reduzido || Math.floor(t() * 2) % 2) ? '#FF4D4D' : '#661A1A'; ctx.beginPath(); ctx.arc(a2.x, a2.y, TW * .025, 0, 7); ctx.fill();
    },
    terminal(g, k) {
      const b = limites(g, .92);
      caixa(b.r0, b.c0, b.r1, b.c1, 0, .04, '#9AA3AE');
      poli([pt(b.r1 - .05, b.c0, .041), pt(b.r1 - .05, b.c1, .041), pt(b.r1 - .12, b.c1, .041), pt(b.r1 - .12, b.c0, .041)], cor('#F2D20F'));
      const z = .04, h = .26 * k;
      [[b.r0 + .1, b.c0 + .1], [b.r0 + .1, b.c1 - .14], [b.r1 - .3, b.c0 + .1], [b.r1 - .3, b.c1 - .14]].forEach(([r, c]) => caixa(r, c, r + .04, c + .04, z, h, '#59626E'));
      caixa(b.r0 + .02, b.c0 + .04, b.r1 - .2, b.c1 - .04, z + h, .05, '#0D7896');
      caixa(b.r0 + .25, b.c0 + .25, b.r0 + .35, b.c1 - .25, z, .08, '#8C5A3C'); // banco
    },
    fazenda(g, k) {
      const b = limites(g, .72), h = .52 * k;
      caixa(b.r0, b.c0, b.r1, b.c1, 0, h, '#3E7C59');
      janelas(b, 0, h, 3, 3, noite);
      porta(b, '#24493A');
      const p = pt(g.r + .5, g.c + .5, h + .2 * k), gira = reduzido ? 1 : Math.abs(Math.cos(t() * 2));
      ctx.fillStyle = cor('#F2B705'); ctx.beginPath(); ctx.ellipse(p.x, p.y, TW * .12 * gira + 1, TW * .12, 0, 0, 7); ctx.fill();
      ctx.fillStyle = cor('#B98A00'); ctx.font = `bold ${TW * .14}px sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      if (gira > .4) ctx.fillText('$', p.x, p.y + 1);
    },
  };
  const ALTURAS = { prefeitura: .75, casa: .52, aluguel: 1.2, mercado: .46, fabrica: 1, escola: .54, saude: .48, parque: .35,
    delegacia: .45, forum: .62, camara: .66, cartorio: .66, dados: .85, terminal: .32, fazenda: .85 };

  /* ── Carros ─────────────────────────────────────────────────────────────── */
  const CORES_CARRO = ['#E53935', '#1E88E5', '#FDD835', '#43A047', '#FB8C00', '#8E24AA', '#ECEFF1'];
  function sincronizarCarros() {
    const desejado = [];
    const n = 1 + Math.min(5, Math.floor((s.pop || 0) / 25));
    for (let i = 0; i < n; i++) desejado.push('carro');
    if (conta(s, 'terminal')) desejado.push('onibus');
    if (conta(s, 'delegacia')) desejado.push('policia');
    while (carros.length > desejado.length) carros.pop();
    desejado.forEach((tipo, i) => {
      if (carros[i] && carros[i].tipo === tipo) return;
      const ida = i % 2 === 0;
      carros[i] = { tipo, ida, c: Math.random() * LARGURA, v: (tipo === 'onibus' ? .55 : .8 + Math.random() * .5) * (ida ? 1 : -1),
        cor: CORES_CARRO[i % CORES_CARRO.length] };
    });
  }
  function desenharCarro(k) {
    const r = LINHA_RUA + (k.ida ? .68 : .32), c = k.c;
    const L = k.tipo === 'onibus' ? .38 : .2, Wd = .11;
    if (k.tipo === 'onibus') {
      caixa(r - Wd, c - L, r + Wd, c + L, .02, .17, '#F2B705');
      naFaceEsq(r + Wd, c - L, c + L, .08, .92, .1, .16, noite ? '#FFE9A8' : '#BFE3F7');
      return;
    }
    const base = k.tipo === 'policia' ? '#F4F4F4' : k.cor;
    caixa(r - Wd, c - L, r + Wd, c + L, .02, .07, base);
    caixa(r - Wd * .8, c - L * .45, r + Wd * .8, c + L * .5, .09, .06, k.tipo === 'policia' ? '#1E3A8A' : '#CFE8F5');
    if (k.tipo === 'policia') caixa(r - .03, c - .03, r + .03, c + .03, .15, .03, Math.floor(t() * 4) % 2 ? '#E53935' : '#2F6BFF');
    if (noite) { // faróis
      const f = pt(r, c + (k.ida ? L : -L), .05);
      ctx.fillStyle = 'rgba(255,240,170,.9)'; ctx.beginPath(); ctx.arc(f.x, f.y, TW * .025, 0, 7); ctx.fill();
    }
  }

  /* ── Chão ───────────────────────────────────────────────────────────────── */
  function desenharChao() {
    const d = .32; // espessura da "ilha"
    const T = pt(0, 0), R = pt(0, LARGURA), B = pt(ALTURA, LARGURA), L = pt(ALTURA, 0);
    const desce = p => ({ x: p.x, y: p.y + d * TW });
    poli([L, B, desce(B), desce(L)], cor('#8A5A3B'));
    poli([B, R, desce(R), desce(B)], cor('#6E452C'));
    poli([desce(L), desce(B), { x: B.x, y: B.y + d * TW + TW * .08 }, { x: L.x, y: L.y + d * TW + TW * .08 }], cor('#5C3A24'));
    poli([L, B, { x: B.x, y: B.y + TW * .07 }, { x: L.x, y: L.y + TW * .07 }], cor('#5FA348'));
    poli([B, R, { x: R.x, y: R.y + TW * .07 }, { x: B.x, y: B.y + TW * .07 }], cor('#4E8C3B'));

    const agora = t();
    for (let r = 0; r < ALTURA; r++) for (let c = 0; c < LARGURA; c++) {
      const i = r * LARGURA + c, lote = s.mapa[i];
      const q = [pt(r, c), pt(r, c + 1), pt(r + 1, c + 1), pt(r + 1, c)];
      const tipo = lote && lote.tipo;
      if (tipo === 'agua') {
        poli(q, cor('#3FA7DE'));
        const o = reduzido ? 0 : Math.sin(agora * 1.5 + r + c) * .12;
        ctx.strokeStyle = noite ? 'rgba(160,210,255,.35)' : 'rgba(255,255,255,.55)'; ctx.lineWidth = Math.max(1, TW / 40);
        const a = pt(r + .35 + o * .3, c + .25), b = pt(r + .35 + o * .3, c + .6);
        ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
        const a2 = pt(r + .7 - o * .3, c + .45), b2 = pt(r + .7 - o * .3, c + .8);
        ctx.beginPath(); ctx.moveTo(a2.x, a2.y); ctx.lineTo(b2.x, b2.y); ctx.stroke();
      } else if (tipo === 'rua' || tipo === 'ponte') {
        poli(q, cor(tipo === 'ponte' ? '#A0774F' : '#C9CDD3'));
        poli([pt(r + .12, c), pt(r + .12, c + 1), pt(r + .88, c + 1), pt(r + .88, c)], cor(tipo === 'ponte' ? '#8A6440' : '#4E5663'));
        if (tipo === 'ponte') {
          caixa(r + .02, c, r + .08, c + 1, 0, .1, '#7A5134');
        } else {
          poli([pt(r + .48, c + .15), pt(r + .48, c + .55), pt(r + .52, c + .55), pt(r + .52, c + .15)], cor('#F4F4F4'));
        }
      } else {
        const claro = (r + c) % 2 === 0;
        poli(q, cor(claro ? '#8FD16F' : '#84C765'));
        if (lote && PREDIOS[lote.tipo] && lote.tipo !== 'parque') {
          poli([pt(r + .06, c + .06), pt(r + .06, c + .94), pt(r + .94, c + .94), pt(r + .94, c + .06)], cor('#D9D2C3')); // calçada
        }
      }
      if (s.bairros && !s.bairros[bairroDe(i).id]) poli(q, 'rgba(14,26,16,.4)'); // bairro ainda não comprado
    }
  }

  /* ── Céu ────────────────────────────────────────────────────────────────── */
  function desenharCeu() {
    const g = ctx.createLinearGradient(0, 0, 0, H);
    if (noite) { g.addColorStop(0, '#081226'); g.addColorStop(1, '#1B2F55'); }
    else { g.addColorStop(0, '#7CC8F5'); g.addColorStop(1, '#DDF2FF'); }
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    if (noite) {
      estrelas.forEach(([x, y, f]) => {
        ctx.fillStyle = `rgba(255,255,255,${.4 + .6 * Math.abs(Math.sin(t() * (1 + f) + f * 9))})`;
        ctx.fillRect(x * W, y * H, 1.6, 1.6);
      });
      ctx.fillStyle = '#F5F0D0'; ctx.beginPath(); ctx.arc(W * .88, H * .12, TW * .35, 0, 7); ctx.fill();
      ctx.fillStyle = '#081226'; ctx.beginPath(); ctx.arc(W * .88 + TW * .15, H * .12 - TW * .08, TW * .3, 0, 7); ctx.fill();
    } else {
      ctx.fillStyle = 'rgba(255,236,150,.9)'; ctx.beginPath(); ctx.arc(W * .1, H * .12, TW * .4, 0, 7); ctx.fill();
    }
    nuvens.forEach(([x, y, e], i) => {
      const px = ((x + (reduzido ? 0 : t() * .008 * (1 + i * .3))) % 1.3 - .15) * W, py = y * H + 20, R = TW * .35 * e;
      ctx.fillStyle = noite ? 'rgba(180,195,225,.18)' : 'rgba(255,255,255,.92)';
      [[0, 0, 1], [R * .9, R * .15, .8], [-R * .9, R * .2, .7], [R * .3, -R * .4, .8]].forEach(([dx, dy, f]) => {
        ctx.beginPath(); ctx.arc(px + dx, py + dy, R * f, 0, 7); ctx.fill();
      });
    });
  }

  /* ── Sobreposições: placas, balões, destaque ────────────────────────────── */
  function balao(x, y, texto, fundo, tam) {
    ctx.font = `${tam}px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = 'rgba(0,0,0,.2)'; ctx.beginPath(); ctx.arc(x + 1, y + 2, tam * .75, 0, 7); ctx.fill();
    ctx.fillStyle = fundo; ctx.beginPath(); ctx.arc(x, y, tam * .75, 0, 7); ctx.fill();
    ctx.fillText(texto, x, y + tam * .05);
  }
  function etiqueta(x, y, texto) {
    ctx.font = `700 ${Math.max(11, TW * .2)}px Nunito, sans-serif`;
    const w = ctx.measureText(texto).width + 14, h = Math.max(20, TW * .34);
    ctx.fillStyle = 'rgba(18,35,58,.88)';
    ctx.beginPath(); ctx.roundRect ? ctx.roundRect(x - w / 2, y - h, w, h, 8) : ctx.rect(x - w / 2, y - h, w, h); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(texto, x, y - h / 2);
  }
  function contorno(i, corLinha, preench) {
    const r = Math.floor(i / LARGURA), c = i % LARGURA;
    ctx.lineWidth = Math.max(2, TW / 18);
    poli([pt(r, c), pt(r, c + 1), pt(r + 1, c + 1), pt(r + 1, c)], preench, corLinha);
  }

  /* ── Quadro ─────────────────────────────────────────────────────────────── */
  function quadro() {
    requestAnimationFrame(quadro);
    if (!s || !W) return;
    noite = document.documentElement.dataset.theme
      ? document.documentElement.dataset.theme === 'dark'
      : matchMedia('(prefers-color-scheme: dark)').matches;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    desenharCeu();
    desenharChao();

    const agora = performance.now();
    const pend = {};
    (s.pendentes || []).forEach(p => { pend[p.tile] = true; });
    const objs = [];
    s.mapa.forEach((lote, i) => {
      const r = Math.floor(i / LARGURA), c = i % LARGURA;
      if (lote && PREDIOS_ISO[lote.tipo]) {
        let k = 1;
        if (brotando[i]) {
          const x = Math.min(1, (agora - brotando[i]) / 550);
          k = x >= 1 ? 1 : 1 + 2.2 * Math.pow(x - 1, 3) + 1.2 * Math.pow(x - 1, 2); // easeOutBack
          if (x >= 1) delete brotando[i];
        }
        objs.push({ d: r + c + 1, f: () => PREDIOS_ISO[lote.tipo]({ r, c }, Math.max(.05, k)) });
      } else if (!lote) {
        const fantasma = s.selecionado && i === hover;
        if (fantasma) {
          objs.push({ d: r + c + 1, f: () => { ctx.globalAlpha = .6; PREDIOS_ISO[s.selecionado]({ r, c }, 1); ctx.globalAlpha = 1; } });
        } else {
          const h = (i * 37 + 11) % 13;
          if (h < 2) objs.push({ d: r + c + 1, f: () => arvore(r + .5, c + .5, .9, h) });
          else if (h === 2) objs.push({ d: r + c + 1, f: () => { arvore(r + .3, c + .35, .6, 0); arvore(r + .65, c + .7, .7, 1); } });
        }
      }
    });
    sincronizarCarros();
    carros.forEach(k => {
      if (!reduzido) { k.c += k.v * .016; if (k.c > LARGURA + 1) k.c = -1; if (k.c < -1) k.c = LARGURA + 1; }
      if (k.c > .3 && k.c < LARGURA - .3) objs.push({ d: LINHA_RUA + (k.ida ? .68 : .32) + k.c, f: () => desenharCarro(k) });
    });

    // destaque do lote sob o mouse/cursor (antes dos objetos, no chão)
    const foco = hover >= 0 ? hover : cursor;
    if (foco >= 0) {
      const lote = s.mapa[foco];
      const livre = !lote;
      const corLinha = s.selecionado ? (livre ? (Math.abs(Math.floor(foco / LARGURA) - LINHA_RUA) === 1 ? '#F2B705' : '#FFFFFF') : '#E53935') : 'rgba(255,255,255,.9)';
      contorno(foco, corLinha, s.selecionado && livre ? 'rgba(255,255,255,.25)' : null);
    }
    objs.sort((a, b) => a.d - b.d).forEach(o => o.f());

    // placas e balões de cidadãos
    s.mapa.forEach((lote, i) => {
      if (!lote || !PREDIOS[lote.tipo]) return;
      const r = Math.floor(i / LARGURA), c = i % LARGURA;
      const a = pt(r + .5, c + .5, ALTURAS[lote.tipo] + .12);
      if (pend[i]) {
        const pulo = reduzido ? 0 : Math.abs(Math.sin(agora / 260)) * TW * .12;
        balao(a.x, a.y - TW * .2 - pulo, '❗', '#FFFFFF', Math.max(12, TW * .3));
      } else if (mostrarPlacas && TW > 26) {
        balao(a.x, a.y, PREDIOS[lote.tipo].icone, 'rgba(255,255,255,.85)', Math.max(9, TW * .18));
      }
    });
    if (foco >= 0 && s.mapa[foco] && PREDIOS[s.mapa[foco].tipo]) {
      const r = Math.floor(foco / LARGURA), c = foco % LARGURA, lote = s.mapa[foco];
      const a = pt(r + .5, c + .5, ALTURAS[lote.tipo] + .3);
      etiqueta(a.x, a.y - TW * .2, `${PREDIOS[lote.tipo].icone} ${PREDIOS[lote.tipo].nome}`);
    }
  }

  /* ── Geometria da tela ──────────────────────────────────────────────────── */
  function redimensionar() {
    const larg = cv.parentElement.clientWidth;
    if (!larg) return;
    W = larg;
    H = Math.round(Math.min(W * .68, Math.max(320, window.innerHeight * .78)));
    dpr = window.devicePixelRatio || 1;
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
    cv.style.width = W + 'px'; cv.style.height = H + 'px';
    calcularOrigem();
  }
  function calcularOrigem() {
    TW = Math.min(W * .95 / ((LARGURA + ALTURA) / 2), (H - 40) / 6.6) * zoom;
    TH = TW / 2;
    const maxX = W * (zoom - 1) / 2 + 20, maxY = H * (zoom - 1) / 2 + 20;
    pan.x = Math.max(-maxX, Math.min(maxX, pan.x)); pan.y = Math.max(-maxY, Math.min(maxY, pan.y));
    ox = W / 2 - (LARGURA - ALTURA) * TW / 4 + pan.x;
    oy = H / 2 - (LARGURA + ALTURA) * TH / 4 + TW * .55 + pan.y;
  }
  function loteEm(x, y) {
    // primeiro os prédios, da frente para trás (o topo de um prédio alto cobre lotes atrás dele)
    const ordem = s.mapa.map((l, i) => i).filter(i => s.mapa[i] && PREDIOS[s.mapa[i].tipo])
      .sort((a, b) => (Math.floor(b / LARGURA) + b % LARGURA) - (Math.floor(a / LARGURA) + a % LARGURA));
    for (const i of ordem) {
      const r = Math.floor(i / LARGURA), c = i % LARGURA, h = ALTURAS[s.mapa[i].tipo];
      const base = pt(r + 1, c + 1), topo = pt(r + .5, c + .5, h);
      if (Math.abs(x - base.x) < TW * .34 && y <= base.y && y >= topo.y - TW * .15) return i;
    }
    const u = (x - ox) / (TW / 2), v = (y - oy) / (TH / 2);
    const c = Math.floor((u + v) / 2), r = Math.floor((v - u) / 2);
    return (r >= 0 && r < ALTURA && c >= 0 && c < LARGURA) ? r * LARGURA + c : -1;
  }

  /* ── Interface pública ──────────────────────────────────────────────────── */
  function init(canvas, clique) {
    cv = canvas; ctx = cv.getContext('2d'); aoClicar = clique;
    reduzido = matchMedia('(prefers-reduced-motion: reduce)').matches;
    try { mostrarPlacas = localStorage.getItem('cidade-legal-placas') !== '0'; } catch (e) { /* ignora */ }
    new ResizeObserver(redimensionar).observe(cv.parentElement);
    redimensionar();

    const local = e => { const b = cv.getBoundingClientRect(); return { x: e.clientX - b.left, y: e.clientY - b.top }; };
    cv.addEventListener('pointerdown', e => { arraste = { ...local(e), px: pan.x, py: pan.y, moveu: false }; });
    cv.addEventListener('pointermove', e => {
      const p = local(e);
      if (arraste && zoom > 1 && (Math.abs(p.x - arraste.x) + Math.abs(p.y - arraste.y) > 8 || arraste.moveu)) {
        arraste.moveu = true; cv.style.cursor = 'grabbing';
        pan.x = arraste.px + p.x - arraste.x; pan.y = arraste.py + p.y - arraste.y; calcularOrigem();
        return;
      }
      if (e.pointerType === 'mouse') {
        hover = loteEm(p.x, p.y);
        const l = hover >= 0 && s.mapa[hover];
        cv.style.cursor = hover >= 0 && (!l || PREDIOS[l.tipo]) ? 'pointer' : 'default';
      }
    });
    cv.addEventListener('pointerleave', () => { hover = -1; arraste = null; });
    cv.addEventListener('pointerup', e => {
      const p = local(e), moveu = arraste && arraste.moveu;
      arraste = null; cv.style.cursor = '';
      if (moveu) return;
      const i = loteEm(p.x, p.y);
      if (i >= 0) { if (e.pointerType !== 'mouse') hover = i; aoClicar(i); }
    });

    // teclado: setas movem o cursor, Enter/Espaço age no lote
    cv.addEventListener('focus', () => { if (cursor < 0) cursor = s.mapa.findIndex(l => l && l.tipo === 'prefeitura'); anunciar(); });
    cv.addEventListener('blur', () => { cursor = -1; });
    cv.addEventListener('keydown', e => {
      const mov = { ArrowUp: -LARGURA, ArrowDown: LARGURA, ArrowLeft: -1, ArrowRight: 1 }[e.key];
      if (mov) {
        e.preventDefault();
        const n = cursor + mov;
        if (n >= 0 && n < LARGURA * ALTURA && !(Math.abs(mov) === 1 && Math.floor(n / LARGURA) !== Math.floor(cursor / LARGURA))) cursor = n;
        hover = -1; anunciar();
      } else if ((e.key === 'Enter' || e.key === ' ') && cursor >= 0) { e.preventDefault(); aoClicar(cursor); }
    });
    requestAnimationFrame(quadro);
  }
  function anunciar() {
    if (cursor < 0) return;
    const l = s.mapa[cursor], r = Math.floor(cursor / LARGURA) + 1, c = cursor % LARGURA + 1;
    const nome = !l ? 'terreno vazio' : PREDIOS[l.tipo] ? PREDIOS[l.tipo].nome : { agua: 'rio', rua: 'rua', ponte: 'ponte' }[l.tipo];
    document.getElementById('anuncio').textContent = `Linha ${r}, coluna ${c}: ${nome}${(s.pendentes || []).some(p => p.tile === cursor) ? ', cidadão esperando' : ''}`;
  }

  return {
    init,
    atualizar() {},
    brotar(i) { brotando[i] = performance.now(); },
    zoom(delta) { zoom = Math.max(1, Math.min(2.5, delta === 0 ? 1 : zoom + delta)); if (delta === 0) pan = { x: 0, y: 0 }; calcularOrigem(); return zoom; },
    alternarPlacas() { mostrarPlacas = !mostrarPlacas; try { localStorage.setItem('cidade-legal-placas', mostrarPlacas ? '1' : '0'); } catch (e) { /* ignora */ } return mostrarPlacas; },
    placas: () => mostrarPlacas,
    posTela(i) { // posição (na janela) do topo do lote, para efeitos flutuantes
      const b = cv.getBoundingClientRect(), r = Math.floor(i / LARGURA), c = i % LARGURA;
      const l = s.mapa[i], h = l && ALTURAS[l.tipo] ? ALTURAS[l.tipo] : .2;
      const p = pt(r + .5, c + .5, h);
      return { x: b.left + p.x, y: b.top + p.y };
    },
  };
})();
