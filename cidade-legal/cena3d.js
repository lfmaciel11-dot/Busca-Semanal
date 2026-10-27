/* ══════════════════════════════════════════════════════════════════════════
   CIDADE LEGAL — Cena 3D (Three.js r147, em vendor/)
   Cada lote mede 1×1 unidade. O chão, as ruas e a água usam InstancedMesh;
   cada prédio é um THREE.Group montado com primitivas (caixas, cilindros,
   cones, esferas) e fachadas com janelas desenhadas em canvas.
   Há um relógio próprio: o sol cruza o céu, anoitece (janelas e postes
   acendem) e cada "Próximo mês" passa um dia acelerado. O mês do calendário
   define a estação (cor das árvores e da grama, ipês floridos). Bairros não
   comprados ficam sombreados, com mata e placa de preço.
   Mesma interface pública do renderizador isométrico.
══════════════════════════════════════════════════════════════════════════ */

const Cena = (() => {
  let renderer, scene, camera, controls, cv, aoClicar, aoClicarPessoa, pessoaSobMouse = -1;
  let sol, lua, hemi, estrelas, plano, destaque, rotulo, relogioEl, ceuMat, solDisco, luaDisco, grama;
  let mostrarPlacas = true, reduzido = false;
  let hora = 9, lapso = null, estacaoAtual = '', bairrosDesenhados = '', voo = null;
  const pessoas = [], zonas = {};
  const predios = {};      // lote → THREE.Group
  const tiposNoLote = {};  // lote → tipo desenhado (para detectar mudanças)
  const vias = {}, viasNoLote = {}; // dispositivos de trânsito sobre as ruas
  const emendas = {}, emendasNoLote = {}; // abertura da calçada da avenida onde chega uma rua local
  const acessos = {}, acessosNoLote = {}; // acessibilidade sobre as ruas (vários por trecho)
  const enfeites = {};     // lote → árvore decorativa
  const baloes = {};       // lote → sprite ❗
  const brotando = {};     // lote → instante da construção
  const carros = [], nuvens = [], postes = [];
  let fantasma = null, fantasmaTipo = null, hover = -1, cursor = -1;
  let moverPorTeclado = () => {};
  let texAgua = [], matRua, matCruz, matAvenida, matGrama, matCampo, chuva, pmrem, envCena, envAlvo, envDia = -1, envChuva = null, diaAtual = 1;
  const relogio = () => performance.now() / 1000;

  const posX = c => c - LARGURA / 2 + .5;
  const posZ = r => r - ALTURA / 2 + .5;

  /* ── Materiais e texturas (com cache) ───────────────────────────────────── */
  const cacheMat = {};
  function mat(cor, extra = {}) {
    const k = cor + JSON.stringify(extra);
    if (cacheMat[k]) return cacheMat[k];
    const m = cacheMat[k] = new THREE.MeshStandardMaterial({ color: cor, roughness: .85, metalness: 0, ...extra });
    if (extra.metalness || extra.roughness < .3) materiaisReflexo.push(m);
    return m;
  }
  const materiaisNoturnos = []; // materiais que acendem à noite
  const materiaisReflexo = [];  // vidros, água e metais: refletem o céu

  function canvasTex(w, h, desenhar, linear = false) {
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    desenhar(c.getContext('2d'), w, h);
    const t = new THREE.CanvasTexture(c);
    t.anisotropy = anisoMax; if (!linear) t.encoding = THREE.sRGBEncoding;
    return t;
  }

  /* ── Texturas PBR geradas (texturas.js): cor + relevo ───────────────────── */
  const IMG = {};
  let pronto = false, anisoMax = 4;
  function carregarImagens() {
    if (typeof TEXTURAS === 'undefined') return Promise.resolve(); // const global não fica em window
    const tarefas = [];
    Object.entries(TEXTURAS).forEach(([nome, tx]) => ['cor', 'relevo'].forEach(tipo => tarefas.push(new Promise(ok => {
      const im = new Image();
      im.onload = () => { IMG[nome + '_' + tipo] = im; ok(); };
      im.onerror = ok; im.src = tx[tipo];
    }))));
    return Promise.all(tarefas);
  }
  function texImagem(nome, tipo, rx = 1, ry = rx) {
    const im = IMG[nome + '_' + tipo];
    if (!im) return null;
    const tx = new THREE.Texture(im);
    tx.needsUpdate = true; tx.wrapS = tx.wrapT = THREE.RepeatWrapping; tx.repeat.set(rx, ry); tx.anisotropy = anisoMax;
    if (tipo === 'cor') tx.encoding = THREE.sRGBEncoding;
    return tx;
  }
  const cachePbr = {};
  // Material com textura de cor e de relevo; "extra.color" tinge a textura
  function pbr(nome, rx = 1, ry = rx, extra = {}) {
    const k = [nome, rx, ry, JSON.stringify(extra)].join('|');
    if (cachePbr[k]) return cachePbr[k];
    const m = new THREE.MeshStandardMaterial({ roughness: .9, ...extra });
    const cor = texImagem(nome, 'cor', rx, ry), rel = texImagem(nome, 'relevo', rx, ry);
    if (cor) m.map = cor; else if (!extra.color) m.color.set('#9A9A9A');
    if (rel) m.normalMap = rel;
    return (cachePbr[k] = m);
  }
  // Desenha a imagem repetida rep×rep vezes no retângulo
  function ladrilhar(ctx, nome, tipo, x, y, w, h, rep = 1) {
    const im = IMG[nome + '_' + tipo];
    if (!im) return false;
    for (let i = 0; i < rep; i++) for (let j = 0; j < rep; j++) ctx.drawImage(im, x + i * w / rep, y + j * h / rep, w / rep, h / rep);
    return true;
  }

  // Texturas de parede desenhadas em canvas: reboco, tijolo, concreto, madeira e vidro espelhado
  function pintarParede(ctx, W, H, cor, tipo) {
    ctx.fillStyle = cor; ctx.fillRect(0, 0, W, H);
    const pontilhar = (n, a) => { for (let k = 0; k < n; k++) { ctx.fillStyle = Math.random() < .5 ? `rgba(0,0,0,${a})` : `rgba(255,255,255,${a})`; ctx.fillRect(Math.random() * W, Math.random() * H, 2, 2); } };
    if (tipo === 'tijolo') {
      for (let y = 0, l = 0; y < H; y += 8, l++) for (let x = (l % 2) * -8; x < W; x += 16) {
        const v = Math.random() * .16 - .08;
        ctx.fillStyle = v > 0 ? `rgba(255,255,255,${v})` : `rgba(0,0,0,${-v})`; ctx.fillRect(x + 1, y + 1, 14, 6);
        ctx.fillStyle = 'rgba(235,225,210,.55)'; ctx.fillRect(x, y, 1, 8);
      }
      ctx.fillStyle = 'rgba(235,225,210,.55)'; for (let y = 0; y < H; y += 8) ctx.fillRect(0, y, W, 1);
    } else if (tipo === 'concreto') {
      pontilhar(500, .06);
      ctx.fillStyle = 'rgba(0,0,0,.12)'; for (let x = 0; x < W; x += 32) ctx.fillRect(x, 0, 1, H); for (let y = 0; y < H; y += 32) ctx.fillRect(0, y, W, 1);
    } else if (tipo === 'madeira') {
      for (let x = 0; x < W; x += 10) { ctx.fillStyle = 'rgba(0,0,0,.18)'; ctx.fillRect(x, 0, 1, H); ctx.fillStyle = 'rgba(0,0,0,.05)'; ctx.fillRect(x + 4, 0, 1, H); }
    } else if (tipo === 'vidro') {
      const g = ctx.createLinearGradient(0, 0, W, H); g.addColorStop(0, tom(cor, .35)); g.addColorStop(.5, cor); g.addColorStop(1, tom(cor, -.25));
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    } else pontilhar(350, .05); // reboco
  }
  function tom(hex, k) {
    const c = new THREE.Color(hex); return '#' + (k > 0 ? c.lerp(new THREE.Color('#FFFFFF'), k) : c.lerp(new THREE.Color('#000000'), -k)).getHexString();
  }
  // Repetição de textura para telhados (telhas de barro) e pisos
  const texRepetida = (w, h, desenhar, rx, ry) => { const tx = canvasTex(w, h, desenhar); tx.wrapS = tx.wrapT = THREE.RepeatWrapping; tx.repeat.set(rx, ry); return tx; };
  let texTelha, texPedra, texPiso;
  function texturasBase() {
    // folhagem: manchas de folhas claras e escuras (a cor vem da estação)
    const folhas = (claro) => texRepetida(128, 128, (ctx) => {
      ctx.fillStyle = claro ? '#E2E2E2' : '#C8C8C8'; ctx.fillRect(0, 0, 128, 128);
      for (let k = 0; k < 900; k++) {
        const v = 150 + Math.floor(Math.random() * 105);
        ctx.fillStyle = `rgb(${v},${v},${v})`;
        ctx.save(); ctx.translate(Math.random() * 128, Math.random() * 128); ctx.rotate(Math.random() * 3.2);
        ctx.beginPath(); ctx.ellipse(0, 0, 3.2, 1.6, 0, 0, 7); ctx.fill(); ctx.restore();
      }
    }, 2, 2);
    const tf = folhas(true), tp = folhas(false);
    [FOLHAS.copa, FOLHAS.clara, FOLHAS.ipe].forEach(m => { m.map = tf; m.needsUpdate = true; });
    FOLHAS.pinho.map = tp; FOLHAS.pinho.needsUpdate = true;
    texTelha = texRepetida(64, 64, (ctx) => {
      ctx.fillStyle = '#F2F2F2'; ctx.fillRect(0, 0, 64, 64);
      for (let y = 0; y < 64; y += 10) for (let x = (y / 10 % 2) * -6; x < 64; x += 12) {
        const g = ctx.createLinearGradient(x, 0, x + 12, 0); g.addColorStop(0, '#BDBDBD'); g.addColorStop(.5, '#FFFFFF'); g.addColorStop(1, '#A8A8A8');
        ctx.fillStyle = g; ctx.fillRect(x, y, 12, 9);
        ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.fillRect(x, y + 9, 12, 1);
      }
    }, 3, 3);
    texPedra = texRepetida(128, 128, (ctx) => { // calçadão de pedra portuguesa em ondas
      ctx.fillStyle = '#F4F1EA'; ctx.fillRect(0, 0, 128, 128);
      ctx.strokeStyle = '#2B2B2B'; ctx.lineWidth = 9;
      for (let k = -1; k < 4; k++) { ctx.beginPath(); for (let x = 0; x <= 128; x += 4) { const y = k * 40 + 20 + Math.sin(x / 128 * Math.PI * 2) * 14; x ? ctx.lineTo(x, y) : ctx.moveTo(x, y); } ctx.stroke(); }
      for (let k = 0; k < 400; k++) { ctx.fillStyle = 'rgba(0,0,0,.06)'; ctx.fillRect(Math.random() * 128, Math.random() * 128, 2, 2); }
    }, 2, 2);
    texPiso = texRepetida(64, 64, (ctx) => {
      ctx.fillStyle = '#E2DDD2'; ctx.fillRect(0, 0, 64, 64);
      ctx.fillStyle = 'rgba(0,0,0,.12)'; for (let x = 0; x < 64; x += 16) ctx.fillRect(x, 0, 1, 64); for (let y = 0; y < 64; y += 16) ctx.fillRect(0, y, 64, 1);
    }, 4, 4);
  }
  const cacheTelha = {};
  function matTelha(cor) {
    if (cacheTelha[cor]) return cacheTelha[cor];
    const m = IMG.telha_cor ? pbr('telha', 2.4, 2.4, { color: cor, roughness: .75 }) : new THREE.MeshStandardMaterial({ color: cor, map: texTelha, roughness: .8 });
    [m.map, m.normalMap].forEach(tx => { if (tx) { tx.center.set(.5, .5); tx.rotation = Math.PI / 2; } });
    return (cacheTelha[cor] = m);
  }

  // Fachada: parede com textura (tijolo, reboco, concreto, madeira ou vidro) e janelas
  // com moldura, vidro e reflexo; o emissiveMap acende as janelas à noite
  const PAREDES = { tijolo: { rep: 2, tingir: 0 }, reboco: { rep: 1, tingir: 1 }, concreto: { rep: 1, tingir: .45 }, madeira: { rep: 1, tingir: 0 } };
  const cacheFachada = {};
  function fachada(cor, cols, linhas, opc = {}) {
    const parede = opc.parede || 'reboco', vidro = opc.vidro || '#7FA9C4';
    const k = [cor, cols, linhas, vidro, parede].join('|');
    if (cacheFachada[k]) return cacheFachada[k];
    const cortina = parede === 'vidro', cfg = PAREDES[parede];
    const janelas = (ctx, W, modo) => {
      for (let i = 0; i < cols; i++) for (let j = 0; j < linhas; j++) {
        const x = W * (i + (cortina ? .03 : .24)) / cols, y = W * (j + (cortina ? .04 : .2)) / linhas;
        const w = W * (cortina ? .94 : .52) / cols, h = W * (cortina ? .9 : .52) / linhas, m = W / 100;
        if (modo === 'luz') { ctx.fillStyle = ((i * 7 + j * 5) % 4) ? '#FFD27A' : '#000'; ctx.fillRect(x, y, w, h); continue; }
        if (modo === 'relevo') { ctx.fillStyle = 'rgb(128,128,255)'; ctx.fillRect(x - m, y - m, w + 2 * m, h + 3 * m); continue; }
        if (!cortina) { ctx.fillStyle = '#E9E6DF'; ctx.fillRect(x - m, y - m, w + 2 * m, h + 2 * m); } // moldura
        const g = ctx.createLinearGradient(x, y, x + w * .4, y + h);
        g.addColorStop(0, tom(vidro, .35)); g.addColorStop(.45, vidro); g.addColorStop(1, tom(vidro, -.55));
        ctx.fillStyle = g; ctx.fillRect(x, y, w, h);
        ctx.fillStyle = 'rgba(255,255,255,.16)'; // reflexo do céu
        ctx.beginPath(); ctx.moveTo(x, y + h * .75); ctx.lineTo(x + w * .55, y); ctx.lineTo(x + w * .8, y); ctx.lineTo(x, y + h); ctx.fill();
        ctx.fillStyle = cortina ? 'rgba(40,50,60,.8)' : '#E9E6DF';             // caixilhos
        const e = cortina ? Math.max(1, m * .5) : m * .7;
        ctx.fillRect(x + w / 2 - e / 2, y, e, h); if (!cortina) ctx.fillRect(x, y + h * .45, w, e);
        if (!cortina) { ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.fillRect(x - m, y + h + m, w + 2 * m, m * 1.4); } // peitoril
      }
    };
    // Desgaste: sujeira junto ao chão, sombra sob o beiral, escorridos sob as janelas e manchas
    const envelhecer = (ctx, S, vidro) => {
      let g = ctx.createLinearGradient(0, S, 0, S * .8);
      g.addColorStop(0, 'rgba(55,42,30,.38)'); g.addColorStop(1, 'rgba(55,42,30,0)');
      ctx.fillStyle = g; ctx.fillRect(0, S * .8, S, S * .2);
      g = ctx.createLinearGradient(0, 0, 0, S * .07);
      g.addColorStop(0, 'rgba(0,0,0,.22)'); g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g; ctx.fillRect(0, 0, S, S * .07);
      if (vidro) return;
      for (let i = 0; i < cols; i++) for (let j = 0; j < linhas; j++) {
        const x = S * (i + .24) / cols, y = S * (j + .2) / linhas + S * .55 / linhas, w = S * .52 / cols, h = S * .4 / linhas;
        g = ctx.createLinearGradient(0, y, 0, y + h);
        g.addColorStop(0, 'rgba(40,35,30,.16)'); g.addColorStop(1, 'rgba(40,35,30,0)');
        ctx.fillStyle = g; ctx.fillRect(x + w * .15, y, w * .7, h);
      }
      for (let k = 0; k < 7; k++) {
        const x = Math.random() * S, y = Math.random() * S, r = S * (.05 + Math.random() * .12);
        g = ctx.createRadialGradient(x, y, 0, x, y, r);
        g.addColorStop(0, `rgba(${Math.random() < .5 ? '60,50,40' : '255,255,255'},.07)`); g.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = g; ctx.fillRect(x - r, y - r, r * 2, r * 2);
      }
    };
    const W = 512;
    const map = canvasTex(W, W, (ctx) => {
      if (cortina) { ctx.fillStyle = tom(cor, -.3); ctx.fillRect(0, 0, W, W); }
      else if (cfg && ladrilhar(ctx, parede, 'cor', 0, 0, W, W, cfg.rep)) {
        if (cfg.tingir) { ctx.globalCompositeOperation = 'multiply'; ctx.globalAlpha = cfg.tingir; ctx.fillStyle = cor; ctx.fillRect(0, 0, W, W); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; }
      } else pintarParede(ctx, W, W, cor, parede);
      janelas(ctx, W, 'cor');
      envelhecer(ctx, W, cortina);
    });
    const normalMap = canvasTex(256, 256, (ctx) => {
      if (cortina || !cfg || !ladrilhar(ctx, parede, 'relevo', 0, 0, 256, 256, cfg.rep)) { ctx.fillStyle = 'rgb(128,128,255)'; ctx.fillRect(0, 0, 256, 256); }
      janelas(ctx, 256, 'relevo');
    }, true);
    const emissiveMap = canvasTex(256, 256, (ctx) => { ctx.fillStyle = '#000'; ctx.fillRect(0, 0, 256, 256); janelas(ctx, 256, 'luz'); });
    const lateral = new THREE.MeshStandardMaterial({ map, normalMap, emissiveMap, emissive: 0xffffff, emissiveIntensity: 0,
      roughness: cortina ? .18 : .88, metalness: cortina ? .35 : 0 });
    materiaisNoturnos.push(lateral);
    if (cortina) materiaisReflexo.push(lateral);
    const topo = mat(tom(cor, -.1));
    return (cacheFachada[k] = [lateral, lateral, topo, topo, lateral, lateral]);
  }

  /* ── Construtores de geometria ──────────────────────────────────────────── */
  function malha(geo, material, x = 0, y = 0, z = 0) {
    const m = new THREE.Mesh(geo, material);
    m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true;
    return m;
  }
  const caixa = (w, h, d, material, x = 0, y = 0, z = 0) =>
    malha(new THREE.BoxGeometry(w, h, d), typeof material === 'string' ? mat(material) : material, x, y + h / 2, z);
  const cilindro = (rt, rb, h, cor, x = 0, y = 0, z = 0, seg = 16) =>
    malha(new THREE.CylinderGeometry(rt, rb, h, seg), typeof cor === 'string' ? mat(cor) : cor, x, y + h / 2, z);
  function cupula(r, cor, x, y, z, extra) {
    return malha(new THREE.SphereGeometry(r, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2), mat(cor, extra), x, y, z);
  }
  function duasAguas(w, h, d, cor, y) { // cumeeira ao longo de z
    const forma = new THREE.Shape();
    forma.moveTo(-w / 2, 0); forma.lineTo(w / 2, 0); forma.lineTo(0, h); forma.lineTo(-w / 2, 0);
    const geo = new THREE.ExtrudeGeometry(forma, { depth: d, bevelEnabled: false });
    geo.translate(0, 0, -d / 2);
    return malha(geo, matTelha(cor), 0, y, 0);
  }
  // Materiais de folhagem compartilhados: mudam de cor conforme a estação
  const FOLHAS = {
    copa: new THREE.MeshStandardMaterial({ color: '#4FA64C', roughness: .85 }),
    clara: new THREE.MeshStandardMaterial({ color: '#66BF5C', roughness: .85 }),
    pinho: new THREE.MeshStandardMaterial({ color: '#2E7D4F', roughness: .85 }),
    ipe: new THREE.MeshStandardMaterial({ color: '#4FA64C', roughness: .85 }),
  };
  const ESTACOES = {
    verao: { copa: '#3F9A45', clara: '#5DB956', pinho: '#2C7A4B', grama: '#5FAE45', tinta: '#BFD0B0' },
    outono: { copa: '#8FA43E', clara: '#C9A23D', pinho: '#3B7A4E', grama: '#7AA84A', tinta: '#CBBF8E' },
    inverno: { copa: '#6E9346', clara: '#88A85A', pinho: '#3A6E4C', grama: '#8AAA55', tinta: '#C2B98C' },
    primavera: { copa: '#4BAE4E', clara: '#7CCB5A', pinho: '#2E7D4F', grama: '#5DB847', tinta: '#C4D8B2' },
  };
  // Árvore: copa em tufos arredondados com textura de folhas (tinta da estação); pinheiro em camadas
  function arvore(tipo = 0, esc = 1) {
    const g = new THREE.Group();
    const tronco = cilindro(.022 * esc, .038 * esc, .26 * esc, '#6D4C35', 0, 0, 0, 8); g.add(tronco);
    if (tipo === 1) {
      [[.17, .24, .2], [.13, .2, .33], [.085, .16, .45]].forEach(([r, h, y]) => g.add(malha(new THREE.ConeGeometry(r * esc, h * esc, 12), FOLHAS.pinho, 0, y * esc, 0)));
    } else {
      const m1 = tipo === 2 ? FOLHAS.ipe : FOLHAS.copa, m2 = tipo === 2 ? FOLHAS.ipe : FOLHAS.clara;
      [[0, .36, 0, .165, m1], [.095, .32, .05, .115, m2], [-.085, .33, -.045, .12, m1], [.02, .46, -.02, .115, m2], [-.03, .3, .09, .1, m2]]
        .forEach(([x, y, z, r, m]) => g.add(malha(new THREE.SphereGeometry(r * esc, 11, 8), m, x * esc, y * esc, z * esc)));
    }
    return g;
  }
  function aplicarEstacao(mesIdx) {
    const nome = [11, 0, 1].includes(mesIdx) ? 'verao' : mesIdx <= 4 ? 'outono' : mesIdx <= 7 ? 'inverno' : 'primavera';
    const chave = nome + mesIdx;
    if (chave === estacaoAtual) return;
    estacaoAtual = chave;
    const e = ESTACOES[nome];
    FOLHAS.copa.color.set(e.copa); FOLHAS.clara.color.set(e.clara); FOLHAS.pinho.color.set(e.pinho);
    // ipê-roxo floresce em junho/julho; ipê-amarelo em agosto/setembro
    FOLHAS.ipe.color.set(mesIdx === 5 || mesIdx === 6 ? '#B45FCB' : mesIdx === 7 || mesIdx === 8 ? '#F2C51C' : e.copa);
    if (matGrama) matGrama.color.set(IMG.grama_cor ? e.tinta : e.grama);
    if (matCampo) matCampo.color.copy(matGrama.color).multiplyScalar(.86); // campo de fora um pouco mais escuro que a cidade
  }
  function calcada(g, tam = .94) { const c = caixa(tam, .03, tam, IMG.piso_cor ? pbr('piso', 1) : new THREE.MeshStandardMaterial({ color: '#E6E0D4', map: texPiso })); c.castShadow = false; g.add(c); }
  function porta(g, d, cor = '#6B4B32', y = .03) { g.add(caixa(.12, .2, .02, cor, 0, y, d / 2 + .005)); }
  function luzPiscante(cor) {
    const m = new THREE.MeshStandardMaterial({ color: cor, emissive: cor, emissiveIntensity: 1 });
    return m;
  }

  /* ── Prédios ────────────────────────────────────────────────────────────── */
  // Cada construtor devolve um Group; userData.tick(t) anima partes; userData.altura posiciona a placa
  const CORES_CASA = ['#F4E1C1', '#CDE7F0', '#F6D6D6', '#E2F0CB', '#FFF1B8'];
  const CORES_TELHA = ['#C8643C', '#B4502F', '#9A5B3C', '#6F6A66'];
  const MODELOS = {
    prefeitura(g) {
      g.add(caixa(.92, .06, .92, '#CFC6B4')); g.add(caixa(.84, .05, .84, '#DDD5C4', 0, .06));
      g.add(caixa(.74, .55, .56, fachada('#F3EBDD', 4, 2), 0, .11, -.04));
      for (let i = 0; i < 6; i++) g.add(cilindro(.028, .028, .55, '#FFFFFF', -.3 + i * .12, .11, .3, 8));
      g.add(caixa(.8, .05, .66, '#E6DCC6', 0, .66));
      g.add(duasAguas(.8, .16, .66, '#C9B48A', .71));
      g.add(cilindro(.17, .17, .12, '#F3EBDD', 0, .8, -.04));
      g.add(cupula(.18, '#E2B33C', 0, .92, -.04, { metalness: .5, roughness: .35 }));
      g.add(cilindro(.012, .012, .7, '#666666', .32, .66, -.28, 6));
      const bandeira = new THREE.Group();
      bandeira.add(caixa(.24, .15, .01, '#1E9E5A', .12, 0, 0));
      const losango = caixa(.09, .09, .012, '#F2D20F', .12, .03, 0); losango.rotation.z = Math.PI / 4; bandeira.add(losango);
      const ceu = cilindro(.03, .03, .014, '#2347A8', .12, .067, 0, 12); ceu.rotation.x = Math.PI / 2; ceu.position.y = .075; bandeira.add(ceu);
      bandeira.position.set(.32, 1.2, -.28); g.add(bandeira);
      g.userData.tick = t => { bandeira.rotation.y = Math.sin(t * 2.5) * .25; };
      g.userData.altura = 1.4;
    },
    casa(g, n, i) {
      const nivel = i >= 0 && s.mapa[i] ? (s.mapa[i].nivel || 1) : 1, v = n % 3;
      calcada(g, .88);
      const cor = CORES_CASA[n % CORES_CASA.length], telha = CORES_TELHA[n % CORES_TELHA.length];
      const andares = nivel >= 2 ? 2 : 1, h = andares === 2 ? .64 : .4;
      const w = nivel >= 2 ? .5 : .54, x0 = nivel >= 2 ? -.1 : 0;
      const corpo = new THREE.Group(); corpo.position.x = x0; g.add(corpo);
      corpo.add(caixa(w, h, .48, fachada(cor, 2, andares, { parede: 'reboco' }), 0, .03));
      porta(corpo, .48);
      if (v === 0) { // duas águas com chaminé
        corpo.add(caixa(.09, .3, .09, '#9C6B4E', .13, h + .02, -.12));
        corpo.add(duasAguas(w + .1, .3, .58, telha, h + .03));
      } else if (v === 1) { // quatro águas
        const r = Math.max(w, .48) * .78 + .04;
        const tel = malha(new THREE.ConeGeometry(r, .26, 4), matTelha(telha), 0, h + .16, 0);
        tel.rotation.y = Math.PI / 4; tel.scale.set(w / .48 > 1 ? 1 : 1, 1, .48 / Math.max(w, .48) + .04); corpo.add(tel);
      } else { // moderna: laje com platibanda e painel de madeira
        corpo.add(caixa(w + .04, .06, .52, '#ECEFF1', 0, h + .03));
        corpo.add(caixa(w * .38, h * .82, .012, IMG.madeira_cor ? pbr('madeira', 1) : mat('#8D6E63'), w * .25, .03, .245));
        corpo.add(caixa(.16, .1, .12, '#CFD8DC', -.1, h + .09, -.1)); // caixa d'água
      }
      if (nivel >= 2) { // garagem com portão
        const portao = canvasTex(64, 64, ctx => { ctx.fillStyle = '#ECEFF1'; ctx.fillRect(0, 0, 64, 64); ctx.fillStyle = '#B0BEC5'; for (let y = 4; y < 64; y += 7) ctx.fillRect(0, y, 64, 2); });
        g.add(caixa(.26, .24, .42, mat(tom(cor, -.06)), x0 + w / 2 + .13, .03, .02));
        g.add(caixa(.2, .17, .006, new THREE.MeshStandardMaterial({ map: portao }), x0 + w / 2 + .13, .03, .233));
        g.add(caixa(.3, .03, .46, '#ECEFF1', x0 + w / 2 + .13, .27, .02));
      }
      if (nivel >= 3) { // piscina com deque e cerca
        g.add(caixa(.36, .02, .22, IMG.madeira_cor ? pbr('madeira', 1) : mat('#A1887F'), .22, .03, -.33));
        const p = caixa(.28, .012, .15, mat('#4FC3F7', { roughness: .08, metalness: .1, emissive: '#06425E' }), .22, .045, -.33); p.castShadow = false; g.add(p);
        for (let k = 0; k < 6; k++) g.add(cilindro(.006, .006, .1, '#ECEFF1', -.42 + k * .17, .03, .43, 5));
      } else if (n % 4 === 1) { const a = arvore(0, .7); a.position.set(-.36, .03, .3); g.add(a); }
      g.userData.altura = h + .38;
    },
    aluguel(g, n) {
      calcada(g);
      g.add(caixa(.66, 1.8, .66, fachada(['#9AA9BC', '#C9B8A6', '#A7B9A0'][n % 3], 3, 7, { parede: 'concreto' }), 0, .03));
      g.add(cilindro(.008, .008, .3, '#90A4AE', .2, 1.89, .2, 5));
      g.add(caixa(.7, .06, .7, '#6F86A8', 0, 1.83));
      g.add(cilindro(.09, .09, .18, '#B9C4D2', -.15, 1.89, -.15, 10));
      porta(g, .66, '#40536E');
      g.userData.altura = 2.1;
    },
    mercado(g, n) {
      calcada(g);
      const corToldo = ['#E07B2A', '#2E7D32', '#C62828', '#1565C0'][n % 4];
      g.add(caixa(.8, .48, .72, fachada('#F7F1E3', 3, 1, { vidro: '#B8E2F5' }), 0, .03));
      const listras = canvasTex(64, 16, (ctx) => { for (let i = 0; i < 8; i++) { ctx.fillStyle = i % 2 ? '#FFFFFF' : corToldo; ctx.fillRect(i * 8, 0, 8, 16); } });
      const toldo = caixa(.84, .03, .22, new THREE.MeshStandardMaterial({ map: listras }), 0, .36, .44);
      toldo.rotation.x = .35; g.add(toldo);
      g.add(caixa(.5, .16, .06, '#E07B2A', 0, .51, .2));
      g.userData.altura = .8;
    },
    fabrica(g) {
      calcada(g);
      g.add(caixa(.84, .5, .6, fachada('#A8553A', 4, 1, { parede: 'tijolo' }), 0, .03, .1));
      for (let i = 0; i < 3; i++) {
        const tel = duasAguas(.28, .16, .6, '#7D8794', .53); tel.position.x = -.28 + i * .28; tel.position.z = .1; g.add(tel);
      }
      g.add(cilindro(.07, .1, 1.3, '#8C5A3C', .28, .03, -.3, 12));
      g.add(cilindro(.075, .075, .06, '#F4F4F4', .28, 1.15, -.3, 12));
      const fumaca = [];
      for (let i = 0; i < 5; i++) {
        const b = malha(new THREE.SphereGeometry(.09, 10, 8), new THREE.MeshStandardMaterial({ color: '#EEEEEE', transparent: true, opacity: .7, roughness: 1 }));
        b.castShadow = false; fumaca.push(b); g.add(b);
      }
      g.userData.tick = t => fumaca.forEach((b, i) => {
        const f = (t * .3 + i / fumaca.length) % 1;
        b.position.set(.28 + f * .35, 1.35 + f * 1.1, -.3 - f * .15);
        b.scale.setScalar(.6 + f * 1.6); b.material.opacity = .7 * (1 - f);
      });
      g.userData.altura = 1.5;
    },
    escola(g) {
      calcada(g);
      g.add(caixa(.86, .52, .6, fachada('#F2C14E', 4, 2, { parede: 'reboco' }), 0, .03));
      g.add(duasAguas(.94, .2, .68, '#C0392B', .55));
      g.add(caixa(.18, .28, .18, '#F2C14E', 0, .6, 0));
      const torre = malha(new THREE.ConeGeometry(.15, .18, 4), mat('#C0392B'), 0, .97, 0); torre.rotation.y = Math.PI / 4; g.add(torre);
      const rel = cilindro(.06, .06, .02, '#FFFFFF', 0, .0, 0, 16); rel.rotation.x = Math.PI / 2; rel.position.set(0, .76, .1); g.add(rel);
      porta(g, .6, '#8E3B2E');
      g.add(cilindro(.01, .01, .7, '#777777', .5, .03, .4, 6));
      g.add(caixa(.18, .1, .01, '#1E9E5A', .6, .63, .4));
      g.userData.altura = 1.15;
    },
    saude(g) {
      calcada(g);
      g.add(caixa(.78, .7, .7, fachada('#FFFFFF', 3, 2, { vidro: '#A9DDF2' }), 0, .03));
      const vermelho = new THREE.MeshStandardMaterial({ color: '#E53935', emissive: '#7A1010' });
      g.add(caixa(.08, .26, .02, vermelho, 0, .4, .36)); g.add(caixa(.26, .08, .02, vermelho, 0, .49, .36));
      g.add(cilindro(.26, .26, .02, '#9AA3AE', 0, .73, 0, 24));
      const anel = malha(new THREE.TorusGeometry(.2, .015, 6, 32), vermelho, 0, .76, 0); anel.rotation.x = Math.PI / 2; g.add(anel);
      g.userData.altura = 1;
    },
    parque(g) {
      g.add(caixa(.96, .04, .96, IMG.grama_cor ? pbr('grama', 1, 1, { color: '#DDF5C8' }) : mat('#58B04F')));
      g.add(caixa(.96, .045, .14, '#E8D8A8')); g.add(caixa(.14, .045, .96, '#E8D8A8'));
      g.add(cilindro(.16, .18, .08, '#9AA3AE', 0, .04, 0, 20));
      g.add(cilindro(.14, .14, .02, mat('#5EC4F0', { emissive: '#0E3A55' }), 0, .1, 0, 20));
      const jato = cilindro(.02, .04, .2, mat('#BFEFFF', { transparent: true, opacity: .8 }), 0, .1, 0, 8);
      g.add(jato);
      [[-.3, -.3, 0, 1], [.3, -.32, 1, .9], [-.32, .3, 1, .85], [.3, .3, 0, 1.05]].forEach(([x, z, t, e]) => {
        const a = arvore(t, e); a.position.set(x, .04, z); g.add(a);
      });
      g.add(caixa(.2, .05, .06, '#8C5A3C', .3, .1, .08));
      g.userData.tick = t => { jato.scale.y = .8 + Math.abs(Math.sin(t * 3)) * .6; };
      g.userData.altura = .7;
    },
    delegacia(g) {
      calcada(g);
      g.add(caixa(.76, .58, .7, fachada('#2F4E7E', 3, 2, { parede: 'concreto' }), 0, .03));
      g.add(caixa(.78, .07, .72, '#FFFFFF', 0, .46));
      porta(g, .7, '#1B2E4B');
      const r = luzPiscante('#FF3030'), a = luzPiscante('#2F6BFF');
      g.add(caixa(.14, .07, .1, r, -.08, .61)); g.add(caixa(.14, .07, .1, a, .08, .61));
      g.userData.tick = t => { const on = Math.floor(t * 3) % 2; r.emissiveIntensity = on ? 1.6 : .1; a.emissiveIntensity = on ? .1 : 1.6; };
      g.userData.altura = .9;
    },
    forum(g) {
      g.add(caixa(.94, .05, .94, '#C9C6BE')); g.add(caixa(.86, .05, .86, '#D8D5CD', 0, .05));
      g.add(caixa(.62, .6, .5, fachada('#E1DCD0', 3, 2, { parede: 'concreto' }), 0, .1, -.08));
      for (let i = 0; i < 6; i++) g.add(cilindro(.03, .03, .6, '#F7F4EC', -.3 + i * .12, .1, .27, 10));
      for (let i = 0; i < 4; i++) g.add(cilindro(.03, .03, .6, '#F7F4EC', .38, .1, -.3 + i * .18, 10));
      g.add(caixa(.84, .05, .7, '#E8E3D6', 0, .7));
      g.add(duasAguas(.84, .18, .7, '#D2CCBC', .75));
      g.userData.altura = 1.1;
    },
    camara(g) {
      calcada(g);
      g.add(caixa(.8, .52, .7, fachada('#E8D9B5', 4, 2), 0, .03));
      g.add(cilindro(.22, .22, .12, '#D9C79E', 0, .55, 0, 24));
      g.add(cupula(.22, '#3A6EA5', 0, .67, 0, { metalness: .3, roughness: .4 }));
      g.add(cilindro(.02, .02, .14, '#E2B33C', 0, .88, 0, 6));
      porta(g, .7, '#7A5A2E');
      g.userData.altura = 1.15;
    },
    cartorio(g) {
      calcada(g, .82);
      g.add(caixa(.62, .68, .6, fachada('#A9472F', 2, 2, { vidro: '#F4EAD8', parede: 'tijolo' }), 0, .03));
      g.add(duasAguas(.7, .26, .68, '#6E3324', .71));
      porta(g, .6, '#5A2A1C');
      g.userData.altura = 1.15;
    },
    dados(g) {
      calcada(g);
      const leds = canvasTex(64, 64, (ctx) => {
        ctx.fillStyle = '#2B2F3A'; ctx.fillRect(0, 0, 64, 64);
        for (let i = 0; i < 6; i++) for (let j = 0; j < 8; j++) { ctx.fillStyle = (i + j) % 3 ? '#3DF5C8' : '#5EE36B'; ctx.fillRect(4 + i * 10, 4 + j * 7.5, 5, 2); }
      });
      const m = new THREE.MeshStandardMaterial({ map: leds, emissiveMap: leds, emissive: '#FFFFFF', emissiveIntensity: .8 });
      g.add(caixa(.76, .85, .76, [m, m, mat('#2B2F3A'), mat('#2B2F3A'), m, m], 0, .03));
      g.add(cilindro(.012, .012, .5, '#AAB4C3', -.2, .88, -.2, 6));
      const ponta = malha(new THREE.SphereGeometry(.035, 8, 6), luzPiscante('#FF4D4D'), -.2, 1.4, -.2); g.add(ponta);
      const antena = cupula(.14, '#DDE3EA', .15, .92, .15); antena.rotation.x = -2.2; g.add(antena);
      g.userData.tick = t => { m.emissiveIntensity = .6 + Math.abs(Math.sin(t * 5)) * .5; ponta.material.emissiveIntensity = Math.floor(t * 2) % 2 ? 1.5 : .1; };
      g.userData.altura = 1.5;
    },
    terminal(g) {
      g.add(caixa(.94, .05, .94, '#9AA3AE'));
      g.add(caixa(.94, .052, .08, '#F2D20F', 0, 0, .38));
      [[-.38, -.3], [.38, -.3], [-.38, .2], [.38, .2]].forEach(([x, z]) => g.add(cilindro(.02, .02, .4, '#59626E', x, .05, z, 6)));
      g.add(caixa(.9, .04, .66, mat('#0D7896', { metalness: .2 }), 0, .45, -.05));
      g.add(caixa(.4, .06, .1, '#8C5A3C', 0, .14, -.3));
      const onibus = criarVeiculo('onibus'); onibus.scale.setScalar(.85); onibus.position.set(0, .05, .2); g.add(onibus);
      g.userData.altura = .75;
    },
    fazenda(g) {
      calcada(g);
      g.add(caixa(.72, .9, .72, fachada('#3E7C59', 3, 4, { parede: 'concreto' }), 0, .03));
      porta(g, .72, '#24493A');
      const moeda = cilindro(.14, .14, .03, mat('#F2B705', { metalness: .6, roughness: .3, emissive: '#3A2A00' }), 0, 0, 0, 24);
      moeda.rotation.x = Math.PI / 2; moeda.position.set(0, 1.2, 0); g.add(moeda);
      g.userData.tick = t => { moeda.rotation.z = t * 2; moeda.position.y = 1.2 + Math.sin(t * 2) * .04; };
      g.userData.altura = 1.5;
    },
  };

  function bandeiraBrasil(g, x, y, z) {
    g.add(cilindro(.012, .012, .7, '#777777', x, y, z, 6));
    const b = new THREE.Group();
    b.add(caixa(.24, .15, .01, '#1E9E5A', .12, 0, 0));
    const losango = caixa(.09, .09, .012, '#F2D20F', .12, .03, 0); losango.rotation.z = Math.PI / 4; b.add(losango);
    b.position.set(x, y + .55, z); g.add(b);
    return b;
  }
  function texEmoji(emoji, fundo) {
    return canvasTex(128, 128, (ctx) => {
      ctx.fillStyle = fundo; ctx.fillRect(0, 0, 128, 128);
      ctx.font = '84px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(emoji, 64, 70);
    });
  }
  function orientacaoRua(i) {
    const r = Math.floor(i / LARGURA), c = i % LARGURA;
    const rua = j => j >= 0 && j < LARGURA * ALTURA && s.mapa[j] && ['rua', 'ponte', 'ruaLocal'].includes(s.mapa[j].tipo);
    const h = (c > 0 && rua(i - 1)) || (c < LARGURA - 1 && rua(i + 1));
    const v = (r > 0 && rua(i - LARGURA)) || (r < ALTURA - 1 && rua(i + LARGURA));
    return h && v ? 'x' : v ? 'v' : 'h';
  }
  Object.assign(MODELOS, {
    banco(g) {
      calcada(g);
      g.add(caixa(.82, .62, .62, fachada('#ECEAE4', 4, 2, { parede: 'concreto', vidro: '#7FB8D6' }), 0, .03, -.04));
      for (let i = 0; i < 4; i++) g.add(cilindro(.035, .035, .62, '#FAFAF7', -.27 + i * .18, .03, .3, 12));
      g.add(caixa(.86, .1, .7, '#1F6F8B', 0, .65));
      g.add(caixa(.86, .04, .7, '#F2B705', 0, .75));
      const atm = caixa(.1, .2, .06, '#37474F', .36, .03, .34); g.add(atm);
      g.add(caixa(.06, .04, .005, luzPiscante('#4FC3F7'), .36, .17, .372));
      g.userData.altura = 1;
    },
    inss(g) {
      calcada(g);
      g.add(caixa(.8, .55, .62, fachada('#F4F6FA', 4, 2, { parede: 'concreto' }), 0, .03));
      g.add(caixa(.82, .1, .64, '#1F4E9A', 0, .42));
      porta(g, .62, '#1F4E9A');
      const rampa = caixa(.36, .02, .2, '#B0BEC5', -.18, .03, .4); rampa.rotation.x = -.18; g.add(rampa);
      const b = bandeiraBrasil(g, .34, .03, .36);
      g.userData.tick = t => { b.rotation.y = Math.sin(t * 2.5) * .25; };
      g.userData.altura = .95;
    },
    condominio(g) {
      calcada(g);
      g.add(caixa(.86, .1, .86, '#D7CCC8', 0, .03)); // muro
      const torre = new THREE.Group();
      torre.add(caixa(.5, 2.1, .5, fachada('#D9C9B9', 3, 9, { parede: 'reboco' }), 0, .03));
      for (let k = 1; k < 9; k++) torre.add(caixa(.52, .015, .06, mat('#B3E5FC', { transparent: true, opacity: .55 }), 0, .03 + k * 2.1 / 9, .28));
      torre.add(caixa(.54, .06, .54, '#A1887F', 0, 2.13));
      torre.add(cilindro(.08, .08, .14, '#ECEFF1', .1, 2.19, -.1, 10));
      torre.position.set(-.14, 0, -.14); g.add(torre);
      g.add(caixa(.34, .02, .2, '#E0E0E0', .22, .03, .26));
      const piscina = caixa(.28, .015, .15, mat('#4FC3F7', { emissive: '#06425E', roughness: .1 }), .22, .045, .26); g.add(piscina);
      g.userData.altura = 2.4;
    },
    templo(g) {
      calcada(g);
      g.add(caixa(.46, .5, .66, fachada('#F5F1E8', 1, 2, { parede: 'reboco', vidro: '#B39DDB' }), 0, .03, -.06));
      g.add(duasAguas(.54, .26, .72, '#8D6E63', .53));
      const torre = caixa(.2, .82, .2, fachada('#F5F1E8', 1, 3, { parede: 'reboco', vidro: '#B39DDB' }), 0, .03, .32); g.add(torre);
      const pin = malha(new THREE.ConeGeometry(.15, .36, 4), matTelha('#8D6E63'), 0, 1.03, .32); pin.rotation.y = Math.PI / 4; g.add(pin);
      g.add(malha(new THREE.SphereGeometry(.035, 10, 8), mat('#E2B33C', { metalness: .6, roughness: .3 }), 0, 1.24, .32));
      const rosa = cilindro(.07, .07, .01, mat('#9575CD', { emissive: '#311B92', emissiveIntensity: .4 }), 0, 0, 0, 16);
      rosa.rotation.x = Math.PI / 2; rosa.position.set(0, .42, .235); g.add(rosa);
      porta(g, .44, '#5D4037', .03); g.children[g.children.length - 1].position.z = .43;
      g.userData.altura = 1.3;
    },
    empresa(g) {
      calcada(g);
      g.add(caixa(.86, .24, .86, fachada('#CFD8DC', 6, 1, { parede: 'concreto', vidro: '#90CAF9' }), 0, .03));
      g.add(caixa(.6, 2.5, .6, fachada('#5D8AA8', 4, 12, { parede: 'vidro', vidro: '#8EC3E6' }), 0, .27));
      g.add(caixa(.5, .14, .5, '#455A64', 0, 2.77));
      g.add(caixa(.3, .08, .02, mat('#2B6CB0', { emissive: '#2B6CB0', emissiveIntensity: .6 }), 0, 2.8, .26));
      g.add(cilindro(.01, .01, .35, '#B0BEC5', .15, 2.91, -.15, 6));
      g.userData.altura = 3.05;
    },
    bombeiros(g) {
      calcada(g);
      g.add(caixa(.86, .5, .62, fachada('#B23A2E', 3, 1, { parede: 'tijolo' }), 0, .03, -.08));
      const portao = canvasTex(64, 64, ctx => { ctx.fillStyle = '#ECEFF1'; ctx.fillRect(0, 0, 64, 64); ctx.fillStyle = '#B0BEC5'; for (let y = 4; y < 64; y += 8) ctx.fillRect(0, y, 64, 2); });
      [-.2, .2].forEach(x => g.add(caixa(.3, .32, .01, new THREE.MeshStandardMaterial({ map: portao }), x, .03, .235)));
      g.add(caixa(.88, .06, .64, '#FFFFFF', 0, .38, -.08));
      g.add(caixa(.18, 1.1, .18, fachada('#B23A2E', 1, 4, { parede: 'tijolo' }), .32, .03, -.28));
      const caminhao = new THREE.Group();
      caminhao.add(caixa(.36, .14, .16, '#D32F2F', 0, .04));
      caminhao.add(caixa(.1, .1, .15, '#B71C1C', .14, .18));
      caminhao.add(caixa(.28, .02, .04, '#CFD8DC', -.04, .19)); // escada
      caminhao.add(caixa(.04, .03, .1, luzPiscante('#FF5252'), .14, .28));
      caminhao.position.set(-.18, 0, .38); caminhao.rotation.y = -.2; g.add(caminhao);
      g.userData.altura = 1.3;
    },
    ecoponto(g) {
      g.add(caixa(.94, .04, .94, IMG.concreto_cor ? pbr('concreto', 1, 1, { color: '#D8D8D8' }) : mat('#BDBDBD')));
      const cores = ['#1E63C4', '#D32F2F', '#2E7D32', '#F9C80E', '#6D4C41']; // papel, plástico, vidro, metal, orgânico
      cores.forEach((c, k) => { g.add(caixa(.12, .2, .14, c, -.32 + k * .16, .04, .25)); g.add(caixa(.13, .03, .15, tom(c, -.25), -.32 + k * .16, .24, .25)); });
      g.add(caixa(.5, .32, .32, fachada('#7CB342', 2, 1, { parede: 'madeira' }), -.1, .04, -.2));
      const placa = caixa(.3, .3, .02, [mat('#2E7D32'), mat('#2E7D32'), mat('#2E7D32'), mat('#2E7D32'), new THREE.MeshStandardMaterial({ map: texEmoji('♻️', '#E8F5E9') }), mat('#2E7D32')], .3, .2, -.12);
      g.add(placa); g.add(cilindro(.012, .012, .2, '#555555', .3, .04, -.13, 6));
      g.userData.altura = .75;
    },
    cultura(g) {
      calcada(g);
      const parede = fachada('#F8BBD0', 6, 2, { parede: 'concreto', vidro: '#CE93D8' })[0];
      g.add(cilindro(.38, .38, .58, parede, 0, .03, -.04, 24));
      g.add(cilindro(.41, .41, .05, '#AD1457', 0, .61, -.04, 24));
      g.add(caixa(.62, .07, .2, mat('#C2185B', { emissive: '#4A0E2A' }), 0, .34, .38));
      const poster = new THREE.MeshStandardMaterial({ map: texEmoji('🎭', '#FFF3E0') });
      [-.22, .22].forEach(x => g.add(caixa(.16, .22, .02, [mat('#333333'), mat('#333333'), mat('#333333'), mat('#333333'), poster, mat('#333333')], x, .06, .43)));
      g.userData.altura = .9;
    },
    arvore(g, n) {
      const a = arvore(n % 3 === 2 ? 2 : n % 2, 1.15); g.add(a);
      g.add(cilindro(.12, .12, .02, '#6D4C41', 0, 0, 0, 12));
      g.userData.altura = .7;
    },
    canteiro(g, n) {
      g.add(caixa(.72, .06, .72, '#9E9E9E'));
      g.add(caixa(.64, .07, .64, '#5D4037', 0, .01));
      const cores = ['#E91E63', '#FFEB3B', '#FF5722', '#9C27B0', '#FFFFFF', '#F06292'];
      for (let k = 0; k < 16; k++) {
        const x = ((k % 4) - 1.5) * .15, z = (Math.floor(k / 4) - 1.5) * .15;
        g.add(malha(new THREE.IcosahedronGeometry(.045, 0), FOLHAS.clara, x, .1, z));
        g.add(malha(new THREE.SphereGeometry(.03, 8, 6), mat(cores[(k + n) % cores.length]), x + .01, .15, z));
      }
      g.userData.altura = .3;
    },
    praca(g) {
      const piso = caixa(.98, .03, .98, IMG.pedra_cor ? pbr('pedra', 1) : new THREE.MeshStandardMaterial({ map: texPedra })); piso.castShadow = false; g.add(piso);
      g.add(cilindro(.14, .16, .07, '#B0BEC5', 0, .03, 0, 20));
      g.add(cilindro(.12, .12, .02, mat('#4FC3F7', { emissive: '#06425E' }), 0, .09, 0, 20));
      const jato = cilindro(.015, .03, .16, mat('#E1F5FE', { transparent: true, opacity: .8 }), 0, .09, 0, 8); g.add(jato);
      [[-.3, .3, 0], [.3, -.3, Math.PI]].forEach(([x, z, r]) => { const b = caixa(.22, .05, .07, '#8D6E63', x, .08, z); b.rotation.y = r; g.add(b); g.add(caixa(.02, .05, .05, '#455A64', x - .09, .03, z)); g.add(caixa(.02, .05, .05, '#455A64', x + .09, .03, z)); });
      const a = arvore(2, .9); a.position.set(.3, .03, .3); g.add(a);
      const lamp = new THREE.MeshStandardMaterial({ color: '#FFF6D0', emissive: '#FFD27A', emissiveIntensity: 0 });
      materiaisNoturnos.push(lamp); lamp.userData = { farol: true };
      g.add(cilindro(.012, .016, .45, '#37474F', -.32, .03, -.32, 6)); g.add(malha(new THREE.SphereGeometry(.04, 8, 6), lamp, -.32, .5, -.32));
      const pombos = [0, 1, 2].map(k => { const p = malha(new THREE.SphereGeometry(.018, 6, 5), mat('#90A4AE'), -.1 + k * .09, .045, .18); p.castShadow = false; g.add(p); return p; });
      g.userData.tick = t => { jato.scale.y = .8 + Math.abs(Math.sin(t * 3)) * .5; pombos.forEach((p, k) => { p.position.y = .045 + Math.max(0, Math.sin(t * 6 + k * 2)) * .012; }); };
      g.userData.altura = .55;
    },
  });

  /* ── Ruas locais com formato (reta, curva, T, cruzamento, balão) e dispositivos de trânsito ── */
  const DIRV = [[0, -1], [1, 0], [0, 1], [-1, 0]]; // norte, leste, sul, oeste em (x, z)
  const conexoesDe = i => (i >= 0 ? conexoes(i) : null);
  function anel(r0, r1, ini, comp, material, cx, cz, y) {
    const m = malha(new THREE.RingGeometry(r0, r1, 28, 1, ini, comp), material, cx, y, cz);
    m.rotation.x = -Math.PI / 2; m.castShadow = false; return m;
  }
  const matAsfalto = () => IMG.asfalto_cor ? pbr('asfalto', 2, 2, { color: '#FFFFFF', roughness: .92 }) : mat('#3A3D42');
  const matPiso = () => IMG.piso_cor ? pbr('piso', 2) : mat('#E6E0D4');
  function curvaRua(g, con, avenida = false) {
    const sx = con.includes(1) ? 1 : -1, sz = con.includes(2) ? 1 : -1, cx = sx * .5, cz = sz * .5;
    // o quarto de círculo aponta para dentro do lote; ângulos no plano antes de deitar a peça (y → −z)
    const a1 = Math.atan2(0, -sx), a2 = Math.atan2(sz, 0);
    const norm = a => ((a % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
    const ini = Math.abs(norm(a2 - a1) - Math.PI / 2) < .01 ? a1 : a2, q = Math.PI / 2;
    g.add(anel(.001, .11, ini, q, matPiso(), cx, cz, .006));
    g.add(anel(.11, .89, ini, q, matAsfalto(), cx, cz, .004));
    g.add(anel(.89, 1, ini, q, matPiso(), cx, cz, .006));
    const amarelo = mat('#E2B71A'), branco = mat('#EEEEEA');
    if (avenida) {
      g.add(anel(.483, .495, ini, q, amarelo, cx, cz, .007)); g.add(anel(.505, .517, ini, q, amarelo, cx, cz, .007));
      for (let k = 0; k < 4; k++) [.305, .69].forEach(rr => g.add(anel(rr, rr + .009, ini + (k + .2) * q / 4, q / 8, branco, cx, cz, .007)));
    } else for (let k = 0; k < 4; k++) g.add(anel(.494, .506, ini + (k + .2) * q / 4, q / 8, amarelo, cx, cz, .007));
  }
  function balaoRua(g, d) {
    const r = caixa(.5, .012, 1, matRua, 0, 0, 0); r.castShadow = false;
    const [dx, dz] = DIRV[d]; r.position.x = dx * .25; r.position.z = dz * .25; r.rotation.y = dz ? Math.PI / 2 : 0; g.add(r);
    const disco = cilindro(.39, .39, .015, matAsfalto(), 0, 0, 0, 36); disco.castShadow = false; g.add(disco);
    g.add(anel(.39, .47, 0, Math.PI * 2, matPiso(), 0, 0, .016));
    g.add(cilindro(.06, .06, .03, '#BDBDBD', 0, 0, 0, 16)); g.add(cilindro(.05, .05, .034, '#6FB14F', 0, 0, 0, 16));
  }
  // placas: textura desenhada em canvas, na face voltada para +z
  const cacheTexPlaca = {};
  function texPlaca(tipo) {
    if (cacheTexPlaca[tipo]) return cacheTexPlaca[tipo];
    const seta = (ctx, cor, W) => { // seta em U de retorno à esquerda
      ctx.strokeStyle = cor; ctx.fillStyle = cor; ctx.lineWidth = W * .1; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(W * .62, W * .8); ctx.lineTo(W * .62, W * .45); ctx.arc(W * .5, W * .45, W * .12, 0, Math.PI, true); ctx.lineTo(W * .38, W * .6); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(W * .26, W * .58); ctx.lineTo(W * .5, W * .58); ctx.lineTo(W * .38, W * .76); ctx.closePath(); ctx.fill();
    };
    return (cacheTexPlaca[tipo] = canvasTex(256, 256, (ctx, W) => {
      if (tipo === 'proibido') {
        ctx.fillStyle = '#FFFFFF'; ctx.beginPath(); ctx.arc(W / 2, W / 2, W * .48, 0, Math.PI * 2); ctx.fill();
        seta(ctx, '#111111', W);
        ctx.strokeStyle = '#D32F2F'; ctx.lineWidth = W * .09; ctx.beginPath(); ctx.arc(W / 2, W / 2, W * .42, 0, Math.PI * 2); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(W * .22, W * .22); ctx.lineTo(W * .78, W * .78); ctx.stroke();
      } else if (tipo === 'permitido') {
        ctx.fillStyle = '#1565C0'; ctx.fillRect(0, 0, W, W); ctx.strokeStyle = '#FFFFFF'; ctx.lineWidth = 8; ctx.strokeRect(10, 10, W - 20, W - 20);
        seta(ctx, '#FFFFFF', W);
      } else if (tipo === 'preferencia') { // R-2: dê a preferência
        ctx.fillStyle = '#D32F2F'; ctx.beginPath(); ctx.moveTo(W * .04, W * .1); ctx.lineTo(W * .96, W * .1); ctx.lineTo(W / 2, W * .92); ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#FFFFFF'; ctx.beginPath(); ctx.moveTo(W * .2, W * .2); ctx.lineTo(W * .8, W * .2); ctx.lineTo(W / 2, W * .74); ctx.closePath(); ctx.fill();
      } else if (tipo === 'chao') { // seta pintada no asfalto
        ctx.clearRect(0, 0, W, W); seta(ctx, 'rgba(245,245,245,.95)', W);
      }
    }));
  }
  function placaVia(g, tipo, x, z, rot = 0) {
    g.add(cilindro(.009, .009, .4, '#455A64', x, 0, z, 6));
    const cinza = mat('#90A4AE'), face = new THREE.MeshStandardMaterial({ map: texPlaca(tipo), transparent: tipo !== 'permitido', roughness: .6 });
    const p = caixa(.13, .13, .008, [cinza, cinza, cinza, cinza, face, cinza], x, .33, z + .01);
    p.rotation.y = rot; g.add(p);
  }
  Object.assign(MODELOS, {
    ruaLocal(g, n, i) {
      const con = conexoesDe(i) || [1, 3];
      if (con.length === 2 && (con[0] + 2) % 4 !== con[1]) curvaRua(g, con);
      else if (con.length === 1) balaoRua(g, con[0]);
      else {
        const cruz = con.length >= 3;
        const r = caixa(1, .012, 1, cruz ? matCruz : matRua, 0, 0, 0);
        r.castShadow = false; r.rotation.y = !cruz && (con.includes(0) || con.includes(2)) ? Math.PI / 2 : 0; g.add(r);
        if (cruz) [0, 1, 2, 3].filter(d => !con.includes(d)).forEach(d => { // lado fechado do T vira calçada
          const [dx, dz] = DIRV[d];
          g.add(caixa(dx ? .16 : 1, .02, dz ? .16 : 1, matPiso(), dx * .42, 0, dz * .42));
        });
      }
      if (i >= 0) { const av = lotesAvenida(); con.forEach(d => {
        const j = vizinhoNa(i, d); if (j < 0 || !av.has(j)) return;
        const [hx, hz] = DIRV[d], rx = -hz, rz = hx; // lado direito de quem sai da rua local
        g.add(caixa(hx ? .03 : .36, .006, hz ? .03 : .36, '#F5F5F5', hx * .44 + rx * .2, .012, hz * .44 + rz * .2));
        placaSinal(g, 'pare', hx * .42 + rx * .46, hz * .42 + rz * .46);
      }); }
      g.userData.altura = .1;
    },
    rotatoria(g, n, i) {
      const con = conexoesDe(i) || [0, 1, 2, 3];
      const base = caixa(1, .006, 1, matAsfalto(), 0, 0, 0); base.castShadow = false; g.add(base);
      [0, 1, 2, 3].filter(d => !con.includes(d)).forEach(d => {
        const [dx, dz] = DIRV[d];
        g.add(caixa(dx ? .12 : 1, .02, dz ? .12 : 1, matPiso(), dx * .44, 0, dz * .44));
      });
      [[1, 1], [1, -1], [-1, 1], [-1, -1]].forEach(([x, z]) => g.add(caixa(.12, .02, .12, matPiso(), x * .44, 0, z * .44)));
      for (let k = 0; k < 16; k++) g.add(anel(.45, .465, k * Math.PI / 8, Math.PI / 14, mat('#F5F5F5'), 0, 0, .008));
      g.add(cilindro(.19, .2, .04, '#BDBDBD', 0, 0, 0, 32)); g.add(cilindro(.175, .175, .045, '#6FB14F', 0, 0, 0, 32));
      const a = arvore(1, .75); a.position.y = .04; g.add(a);
      for (let k = 0; k < 6; k++) g.add(caixa(.03, .03, .03, ['#E91E63', '#FDD835', '#FFFFFF'][k % 3], Math.cos(k) * .13, .045, Math.sin(k) * .13));
      con.forEach(d => { // linha de "dê a preferência" em cada entrada e a placa R-2
        const [dx, dz] = DIRV[d], [rx, rz] = [-(-dz), -dx]; // lado direito de quem entra
        for (let k = 0; k < 4; k++) g.add(caixa(dx ? .015 : .05, .004, dz ? .015 : .05, '#F5F5F5', dx * .47 + rx * (.06 + k * .09), .006, dz * .47 + rz * (.06 + k * .09)));
      });
      if (con.includes(2) || con.includes(1)) placaVia(g, 'preferencia', .44, .44);
      g.userData.altura = .45;
    },
    retorno(g, n, i) {
      const con = conexoesDe(i) || [1, 3];
      const grp = new THREE.Group(); g.add(grp);
      if (con.includes(0) || con.includes(2)) grp.rotation.y = Math.PI / 2;
      grp.add(caixa(.6, .004, .07, matAsfalto(), 0, 0, 0));
      for (let x = -.25; x <= .25; x += .1) grp.add(caixa(.05, .005, .012, '#E2B71A', x, 0, 0));
      [[.2, 0], [-.2, Math.PI]].forEach(([z, rot]) => {
        const m = new THREE.Mesh(new THREE.PlaneGeometry(.22, .22), new THREE.MeshStandardMaterial({ map: texPlaca('chao'), transparent: true, depthWrite: false }));
        m.rotation.set(-Math.PI / 2, 0, rot + Math.PI / 2); m.position.set(0, .008, z); grp.add(m);
      });
      placaVia(g, 'permitido', .44, .44);
      g.userData.altura = .5;
    },
    placaRetorno(g) {
      placaVia(g, 'proibido', .44, .44);
      g.userData.altura = .5;
    },
  });


  /* ── Infraestrutura, saneamento e enfeites com água ─────────────────────── */
  const matAguaLimpa = () => mat('#3FA7DE', { roughness: .08, metalness: .15 });
  function orientacaoPonte(i) {
    const r = Math.floor(i / LARGURA), c = i % LARGURA;
    const agua = j => j >= 0 && j < LARGURA * ALTURA && s.mapa[j] && ['agua', 'ponte', 'ponteLocal'].includes(s.mapa[j].tipo);
    const v = (r > 0 && agua(i - LARGURA)) || (r < ALTURA - 1 && agua(i + LARGURA));
    const h = (c > 0 && agua(i - 1)) || (c < LARGURA - 1 && agua(i + 1));
    return v && !h ? 'h' : h && !v ? 'v' : orientacaoRua(i) === 'v' ? 'v' : 'h'; // a ponte atravessa a água
  }
  Object.assign(MODELOS, {
    estacaoAgua(g) {
      calcada(g);
      const concreto = IMG.concreto_cor ? pbr('concreto', 1, 1, { color: '#E0E0E0' }) : mat('#BDBDBD');
      [[-.2, .15], [.2, .15]].forEach(([x, z]) => {
        g.add(caixa(.34, .12, .3, concreto, x, .03, z));
        g.add(caixa(.3, .01, .26, matAguaLimpa(), x, .13, z));
      });
      g.add(caixa(.36, .3, .26, fachada('#E3F2FD', 3, 1, { parede: 'concreto' }), -.18, .03, -.26));
      [[.16, -.14], [.36, -.14], [.16, -.34], [.36, -.34]].forEach(([x, z]) => g.add(cilindro(.012, .012, .42, '#78909C', x, .03, z, 6)));
      g.add(cilindro(.13, .13, .22, '#ECEFF1', .26, .45, -.24, 20));
      g.add(cilindro(.135, .135, .04, '#1E88E5', .26, .58, -.24, 20));
      g.add(malha(new THREE.ConeGeometry(.14, .07, 20), mat('#B0BEC5'), .26, .7, -.24));
      const cano = cilindro(.025, .025, .4, '#1E88E5', 0, 0, 0, 10); cano.rotation.z = Math.PI / 2; cano.position.set(0, .1, -.02); g.add(cano);
      g.userData.altura = .8;
    },
    esgoto(g) {
      g.add(caixa(.96, .04, .96, IMG.concreto_cor ? pbr('concreto', 1, 1, { color: '#CFCFCF' }) : mat('#BDBDBD')));
      const bracos = [];
      [[-.2, .18], [.22, -.16]].forEach(([x, z]) => {
        g.add(cilindro(.21, .22, .12, '#B0BEC5', x, .04, z, 28));
        g.add(cilindro(.19, .19, .01, mat('#6B7B3A', { roughness: .3 }), x, .155, z, 28));
        g.add(cilindro(.03, .03, .05, '#607D8B', x, .15, z, 10));
        const braco = new THREE.Group(); braco.add(caixa(.4, .02, .04, '#FFB300', 0, 0, 0)); braco.position.set(x, .18, z); g.add(braco); bracos.push(braco);
      });
      g.add(caixa(.3, .26, .24, fachada('#DCE775', 2, 1, { parede: 'concreto' }), .24, .04, .26));
      const vapor = [];
      for (let k = 0; k < 6; k++) {
        const b = malha(new THREE.SphereGeometry(.05, 10, 8), new THREE.MeshStandardMaterial({ color: '#F5F5F5', transparent: true, opacity: .4, roughness: 1, depthWrite: false }));
        b.castShadow = false; vapor.push(b); g.add(b);
      }
      g.userData.tick = t => {
        bracos.forEach((b, k) => { b.rotation.y = t * (.5 + k * .2); });
        vapor.forEach((b, k) => {
          const f = (t * .18 + k / vapor.length) % 1, c = k % 2 ? [-.2, .18] : [.22, -.16];
          b.position.set(c[0] + Math.sin(k * 3) * .08, .17 + f * .45, c[1] + Math.cos(k * 3) * .08);
          b.scale.setScalar(.6 + f * 1.4); b.material.opacity = .35 * (1 - f);
        });
      };
      g.userData.altura = .5;
    },
    usina(g) {
      g.add(caixa(.96, .03, .96, '#9E9E8E'));
      const celulas = canvasTex(128, 128, (ctx) => {
        const gr = ctx.createLinearGradient(0, 0, 128, 128); gr.addColorStop(0, '#2B4C8C'); gr.addColorStop(1, '#122650');
        ctx.fillStyle = gr; ctx.fillRect(0, 0, 128, 128);
        ctx.strokeStyle = 'rgba(200,220,255,.45)'; ctx.lineWidth = 2;
        for (let k = 0; k <= 128; k += 21) { ctx.beginPath(); ctx.moveTo(k, 0); ctx.lineTo(k, 128); ctx.stroke(); ctx.beginPath(); ctx.moveTo(0, k); ctx.lineTo(128, k); ctx.stroke(); }
      });
      const painel = new THREE.MeshStandardMaterial({ map: celulas, roughness: .22, metalness: .5 });
      materiaisReflexo.push(painel);
      for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) {
        const x = -.3 + c * .3, z = -.3 + r * .27;
        const p = caixa(.26, .012, .17, [mat('#90A4AE'), mat('#90A4AE'), painel, mat('#455A64'), mat('#90A4AE'), mat('#90A4AE')], 0, 0, 0);
        p.rotation.x = -.45; p.position.set(x, .13, z); g.add(p);
        g.add(caixa(.02, .1, .02, '#78909C', x, .03, z + .04));
      }
      g.add(caixa(.12, .14, .08, '#ECEFF1', .38, .03, .42));
      g.userData.altura = .45;
    },
    iluminacao(g) {
      calcada(g, .7);
      const lamp = new THREE.MeshStandardMaterial({ color: '#FFF6D0', emissive: '#FFD27A', emissiveIntensity: 0 });
      materiaisNoturnos.push(lamp); lamp.userData = { farol: true };
      [[-.22, -.22], [.22, .22], [-.22, .22], [.22, -.22]].forEach(([x, z]) => {
        g.add(cilindro(.014, .02, .7, '#263238', x, .03, z, 8));
        g.add(cilindro(.06, .03, .05, '#263238', x, .72, z, 10));
        g.add(malha(new THREE.SphereGeometry(.035, 10, 8), lamp, x, .7, z));
      });
      g.add(caixa(.24, .05, .07, IMG.madeira_cor ? pbr('madeira', 1) : mat('#8D6E63'), 0, .08, 0));
      g.userData.altura = .9;
    },
    telecom(g) {
      g.add(caixa(.6, .03, .6, '#B0BEC5'));
      const trelica = (cor, y, h, rb, rt) => {
        const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, 4, 5, true), new THREE.MeshBasicMaterial({ color: cor, wireframe: true }));
        m.position.set(0, y + h / 2, 0); m.rotation.y = Math.PI / 4; g.add(m);
      };
      trelica('#E53935', .03, .6, .16, .11); trelica('#ECEFF1', .63, .6, .11, .07); trelica('#E53935', 1.23, .6, .07, .03);
      [0, Math.PI / 2, Math.PI, -Math.PI / 2].forEach(a => { const ant = caixa(.03, .12, .015, '#ECEFF1', Math.cos(a) * .06, 1.5, Math.sin(a) * .06); ant.rotation.y = -a; g.add(ant); });
      const luz = luzPiscante('#FF1744'); g.add(malha(new THREE.SphereGeometry(.025, 8, 6), luz, 0, 1.86, 0));
      g.add(caixa(.18, .14, .14, '#CFD8DC', .2, .03, .2));
      g.userData.tick = t => { luz.emissiveIntensity = Math.floor(t * 1.5) % 2 ? 2 : .1; };
      g.userData.altura = 1.9;
    },
    piscinao(g) {
      const concreto = IMG.concreto_cor ? pbr('concreto', 1, 1, { color: '#D6D6D6' }) : mat('#BDBDBD');
      g.add(caixa(.96, .02, .96, concreto));
      [[0, -.45, .96, .06], [0, .45, .96, .06], [-.45, 0, .06, .84], [.45, 0, .06, .84]].forEach(([x, z, w, d]) => g.add(caixa(w, .14, d, concreto, x, .02, z)));
      const agua = caixa(.84, .01, .84, mat('#4E8A8A', { roughness: .15, metalness: .1 }), 0, .06, 0); agua.castShadow = false; g.add(agua);
      for (let k = 0; k < 5; k++) g.add(caixa(.12, .02, .04, concreto, .34, .03 + k * .025, -.3 + k * .04));
      for (let k = 0; k < 6; k++) g.add(cilindro(.008, .008, .12, '#455A64', -.46 + k * .184, .16, .48, 5));
      g.add(caixa(.94, .01, .01, '#455A64', 0, .26, .48));
      g.userData.tick = t => { agua.position.y = .055 + Math.sin(t * .4) * .015; };
      g.userData.altura = .35;
    },
    ponteLocal(g, n, i) {
      const o = orientacaoPonte(i);
      const deck = new THREE.Group();
      deck.add(caixa(1, .06, .8, IMG.madeira_cor ? pbr('madeira', 1) : mat('#A0774F'), 0, -.02));
      const pista = caixa(1, .012, .62, matRua, 0, .04); pista.castShadow = false; deck.add(pista);
      deck.add(caixa(1, .1, .03, '#ECEFF1', 0, .04, .4)); deck.add(caixa(1, .1, .03, '#ECEFF1', 0, .04, -.4));
      [-.3, .3].forEach(x => [-.32, .32].forEach(z => deck.add(cilindro(.03, .03, .16, '#9E9E9E', x, -.18, z, 8))));
      deck.rotation.y = o === 'v' ? Math.PI / 2 : 0; g.add(deck);
      g.userData.altura = .25;
    },
    lagoa(g, n) {
      g.add(cilindro(.47, .47, .015, '#D7C49E', 0, 0, 0, 32));
      const espelho = cilindro(.4, .4, .012, matAguaLimpa(), 0, .006, 0, 32); espelho.castShadow = false; g.add(espelho);
      for (let k = 0; k < 10; k++) {
        const a = k / 10 * Math.PI * 2 + n;
        if (k % 3 === 0) { const junco = malha(new THREE.ConeGeometry(.02, .16, 5), FOLHAS.pinho, Math.cos(a) * .43, .08, Math.sin(a) * .43); junco.castShadow = false; g.add(junco); }
        if (k % 4 === 1) { const folha = cilindro(.045, .045, .004, '#4CAF50', Math.cos(a) * .22, .02, Math.sin(a) * .22, 12); folha.castShadow = false; g.add(folha); }
      }
      const patos = [0, 1].map(k => {
        const p = new THREE.Group();
        p.add(malha(new THREE.SphereGeometry(.035, 10, 8), mat(k ? '#FFFFFF' : '#FFD54F'), 0, .03, 0));
        p.add(malha(new THREE.SphereGeometry(.02, 8, 6), mat(k ? '#FFFFFF' : '#FFD54F'), .03, .065, 0));
        p.add(malha(new THREE.ConeGeometry(.008, .02, 6), mat('#FF8F00'), .052, .065, 0)).children.slice(-1)[0].rotation.z = -Math.PI / 2;
        g.add(p); return p;
      });
      g.userData.tick = t => patos.forEach((p, k) => {
        const a = t * (.35 + k * .1) + k * Math.PI;
        p.position.set(Math.cos(a) * (.18 + k * .08), .015 + Math.sin(t * 3 + k) * .004, Math.sin(a) * (.18 + k * .08));
        p.rotation.y = -a - Math.PI / 2;
      });
      g.userData.altura = .3;
    },
    pontoAcessivel(g) {
      calcada(g);
      g.add(caixa(.84, .05, .28, '#C9C9C9', 0, .03, .3));                       // plataforma no nível do piso do ônibus
      g.add(caixa(.84, .052, .03, '#F2C200', 0, .03, .43));                     // piso tátil de alerta na borda
      g.add(caixa(.2, .03, .12, '#BDBDBD', -.3, .03, .1)); g.add(caixa(.04, .032, .12, '#F2C200', -.3, .03, .1)); // rampa de acesso
      const vidro = mat('#B3E5FC', { transparent: true, opacity: .45, roughness: .1, metalness: .2 });
      g.add(caixa(.6, .3, .02, vidro, .05, .08, .2)); g.add(caixa(.68, .03, .2, '#0D7896', .05, .39, .28));
      [-.25, .35].forEach(x => g.add(cilindro(.012, .012, .32, '#455A64', x, .08, .2, 6)));
      g.add(caixa(.3, .04, .07, IMG.madeira_cor ? pbr('madeira', 1) : mat('#8D6E63'), .05, .15, .25));
      g.add(caixa(.1, .14, .02, '#ECEFF1', .38, .08, .22)); for (let k = 0; k < 6; k++) g.add(caixa(.008, .008, .006, '#90A4AE', .35 + (k % 3) * .03, .15 + Math.floor(k / 3) * .03, .232)); // mapa em braile
      placaSinal(g, 'pcd', -.42, .44);
      g.userData.altura = .55;
    },
    pontoOnibus(g) {
      calcada(g, .8);
      const vidro = mat('#B3E5FC', { transparent: true, opacity: .45, roughness: .1, metalness: .2 });
      g.add(caixa(.5, .3, .02, vidro, 0, .03, -.18));
      g.add(caixa(.56, .03, .22, '#0D7896', 0, .34, -.1));
      [-.26, .26].forEach(x => g.add(cilindro(.012, .012, .32, '#455A64', x, .03, -.18, 6)));
      g.add(caixa(.36, .04, .08, IMG.madeira_cor ? pbr('madeira', 1) : mat('#8D6E63'), 0, .1, -.12));
      g.add(cilindro(.01, .01, .45, '#455A64', .34, .03, .2, 6));
      const placa = caixa(.12, .12, .01, [mat('#1565C0'), mat('#1565C0'), mat('#1565C0'), mat('#1565C0'), new THREE.MeshStandardMaterial({ map: texEmoji('🚏', '#1565C0') }), mat('#1565C0')], .34, .4, .2);
      g.add(placa);
      g.userData.altura = .55;
    },
    // ── zona rural ──
    lavoura(g, n) {
      g.add(caixa(.94, .03, .94, IMG.terra_cor ? pbr('terra', 1) : mat('#7B5B3A')));
      const [cor, alt, topo] = [['#4E8B2F', .14, '#E5C04A'], ['#5FA33A', .06, null], ['#D9B44A', .1, null]][n % 3]; // milho, soja ou trigo
      for (let k = 0; k < 7; k++) {
        const z = -.39 + k * .13;
        g.add(caixa(.66, alt, .06, cor, -.1, .03, z));
        if (topo) for (let x = -.38; x < .2; x += .12) g.add(caixa(.025, .03, .03, topo, x, .03 + alt, z));
      }
      g.add(cilindro(.08, .08, .36, mat('#B0BEC5', { metalness: .5, roughness: .35 }), .35, .03, -.3, 14));
      g.add(cupula(.08, '#90A4AE', .35, .39, -.3, { metalness: .5, roughness: .35 }));
      g.add(cilindro(.06, .06, .26, mat('#B0BEC5', { metalness: .5, roughness: .35 }), .35, .03, -.08, 14));
      g.add(cupula(.06, '#90A4AE', .35, .29, -.08, { metalness: .5, roughness: .35 }));
      const trator = criarVeiculo('trator'); trator.position.set(.33, .03, .28); trator.rotation.y = -Math.PI / 2; g.add(trator);
      g.userData.altura = .5;
    },
    pecuaria(g, n) {
      const madeira = '#8D6E63';
      for (let k = 0; k <= 5; k++) {
        const v = -.44 + k * .176;
        [[v, -.44], [v, .44], [-.44, v], [.44, v]].forEach(([x, z]) => g.add(cilindro(.009, .009, .16, madeira, x, 0, z, 5)));
      }
      [.07, .13].forEach(y => {
        g.add(caixa(.9, .012, .012, madeira, 0, y, -.44)); g.add(caixa(.9, .012, .012, madeira, 0, y, .44));
        g.add(caixa(.012, .012, .9, madeira, -.44, y, 0)); g.add(caixa(.012, .012, .9, madeira, .44, y, 0));
      });
      g.add(caixa(.3, .2, .24, fachada('#B23A2E', 1, 1), -.24, 0, -.24));
      const telhado = duasAguas(.34, .12, .28, '#5D4037', .2); telhado.position.set(-.24, .2, -.24); g.add(telhado);
      g.add(caixa(.08, .12, .01, '#FFF3E0', -.24, 0, -.117));
      g.add(caixa(.22, .04, .06, '#78909C', .22, 0, -.3)); g.add(caixa(.2, .01, .05, mat('#4FC3F7', { roughness: .1 }), .22, .035, -.3));
      const vaca = (x, z, rot, malhada) => {
        const v = new THREE.Group(), pelo = malhada ? '#FAFAFA' : '#8D5A3B';
        v.add(caixa(.15, .07, .065, pelo, 0, .055, 0));
        if (malhada) { v.add(caixa(.05, .072, .067, '#263238', .02, .054, 0)); v.add(caixa(.03, .072, .067, '#263238', -.05, .054, 0)); }
        v.add(caixa(.05, .045, .045, pelo, .09, .085, 0)); v.add(caixa(.02, .02, .03, '#F8BBD0', .12, .088, 0));
        [[.05, .022], [.05, -.022], [-.05, .022], [-.05, -.022]].forEach(([a, b]) => v.add(cilindro(.008, .008, .056, pelo, a, 0, b, 5)));
        v.position.set(x, 0, z); v.rotation.y = rot; g.add(v); return v;
      };
      const gado = [vaca(.15, .1, .4, true), vaca(-.12, .22, 2.6, n % 2 === 0), vaca(.25, .3, -1.2, false)];
      g.userData.tick = t => gado.forEach((v, k) => { v.rotation.y += Math.sin(t * .3 + k * 2) * .002; });
      g.userData.altura = .45;
    },
    cooperativa(g) {
      calcada(g);
      g.add(caixa(.6, .3, .36, fachada('#E8DCC4', 3, 1), 0, .03, -.2));
      const telhado = duasAguas(.4, .14, .64, '#2E7D32', .33); telhado.rotation.y = Math.PI / 2; telhado.position.z = -.2; g.add(telhado);
      ['#E53935', '#FB8C00', '#1E88E5'].forEach((cor, k) => {
        const x = -.28 + k * .28;
        g.add(caixa(.2, .07, .12, IMG.madeira_cor ? pbr('madeira', 1) : mat('#8D6E63'), x, .03, .26));
        [['#FF7043', -.05], ['#7CB342', 0], ['#FDD835', .05]].forEach(([c, dx]) => g.add(caixa(.04, .025, .08, c, x + dx, .1, .26)));
        g.add(caixa(.22, .012, .16, cor, x, .25, .26));
        [-.1, .1].forEach(dx => g.add(cilindro(.006, .006, .22, '#ECEFF1', x + dx, .03, .33, 5)));
      });
      g.userData.altura = .55;
    },

    // ── indústria e logística ──
    galpao(g, n) {
      g.add(caixa(.94, .03, .94, '#9AA3AE'));
      g.add(caixa(.82, .34, .5, fachada('#CFD8DC', 1, 1), 0, .03, -.18));
      const telhado = duasAguas(.54, .08, .86, '#78909C', .37); telhado.rotation.y = Math.PI / 2; telhado.position.z = -.18; g.add(telhado);
      for (let k = 0; k < 4; k++) g.add(caixa(.14, .18, .012, '#455A64', -.3 + k * .2, .03, .072));
      const cores = ['#C62828', '#1565C0', '#2E7D32', '#EF6C00'];
      [[-.32, .3, 2], [-.32, .18, 1], [.32, .3, 1]].forEach(([x, z, alto], k) => {
        for (let a = 0; a < alto; a++) g.add(caixa(.26, .1, .1, cores[(k + a + n) % 4], x, .03 + a * .1, z));
      });
      const cam = criarVeiculo('caminhao', cores[n % 4]); cam.position.set(.02, .03, .3); cam.rotation.y = Math.PI / 2; g.add(cam);
      g.userData.altura = .6;
    },
    industria(g) {
      g.add(caixa(.94, .03, .94, '#8E9AA6'));
      g.add(caixa(.5, .42, .42, fachada('#78909C', 3, 2), -.15, .03, .05));
      const metal = mat('#CFD8DC', { metalness: .6, roughness: .3 });
      [[.28, .25], [.28, -.05]].forEach(([x, z]) => { g.add(cilindro(.11, .11, .4, metal, x, .03, z, 18)); g.add(cupula(.11, '#B0BEC5', x, .43, z, { metalness: .6, roughness: .3 })); });
      g.add(caixa(.3, .03, .03, metal, .14, .3, .1)); g.add(caixa(.03, .03, .3, metal, .28, .38, .1));
      [[-.3, -.32], [-.08, -.34]].forEach(([x, z]) => {
        g.add(cilindro(.05, .07, 1.15, '#8D6E63', x, .03, z, 12));
        [.8, 1.0].forEach(y => g.add(cilindro(.056, .056, .06, y === .8 ? '#E53935' : '#FAFAFA', x, y, z, 12)));
      });
      const fumaca = [];
      for (let k = 0; k < 8; k++) {
        const b = malha(new THREE.SphereGeometry(.09, 10, 8), new THREE.MeshStandardMaterial({ color: '#E0E0E0', transparent: true, opacity: .7, roughness: 1 }));
        b.castShadow = false; fumaca.push(b); g.add(b);
      }
      g.userData.tick = t => fumaca.forEach((b, k) => {
        const f = (t * .28 + k / 4) % 1, x = k % 2 ? -.3 : -.08, z = k % 2 ? -.32 : -.34;
        b.position.set(x + f * .4, 1.2 + f * 1.1, z - f * .2);
        b.scale.setScalar(.6 + f * 1.7); b.material.opacity = .65 * (1 - f);
      });
      g.userData.altura = 1.4;
    },
    aterro(g) {
      [[.92, '#6D4C41'], [.74, '#7CB342'], [.54, '#8D6E63'], [.34, '#7CB342']].forEach(([w, cor], k) => g.add(caixa(w, .06, w, cor, 0, k * .06, 0)));
      [[-.2, -.2], [.18, .1], [-.05, .25]].forEach(([x, z]) => g.add(cilindro(.012, .012, .1, '#9E9E9E', x, .18, z, 6)));
      g.add(caixa(.18, .1, .12, '#ECEFF1', .34, .06, .36)); g.add(caixa(.2, .02, .14, '#6D8B3A', .34, .16, .36));
      const trator = new THREE.Group();
      trator.add(caixa(.11, .05, .07, '#F9A825', 0, .02, 0)); trator.add(caixa(.05, .04, .06, '#F9A825', -.02, .07, 0));
      trator.add(caixa(.015, .04, .09, '#616161', .065, .01, 0)); trator.add(caixa(.12, .025, .08, '#37474F', 0, 0, 0));
      trator.position.set(-.05, .24, .02); g.add(trator);
      g.userData.altura = .4;
    },

    // ── transporte ──
    pontoTaxi(g) {
      calcada(g);
      g.add(caixa(.2, .18, .16, fachada('#FFF8E1', 1, 1), -.28, .03, -.28));
      g.add(caixa(.24, .03, .2, '#F9A825', -.28, .21, -.28));
      [[.05, -.05], [.05, .2]].forEach(([x, z]) => { const t = criarVeiculo('taxi'); t.position.set(x + .12, .03, z); g.add(t); });
      g.add(caixa(.5, .005, .02, '#F9A825', .17, .03, .34));
      g.userData.altura = .4;
    },
    estacionamento(g, n) {
      g.add(caixa(.94, .03, .94, IMG.asfalto_cor ? pbr('asfalto', 1) : mat('#3A3D42')));
      for (let k = 0; k < 5; k++) [-.25, .25].forEach(z => g.add(caixa(.012, .003, .22, '#F5F5F5', -.36 + k * .18, .03, z)));
      g.add(caixa(.16, .003, .2, '#1565C0', .27, .03, .25));
      for (let k = 0; k < 4; k++) [-.25, .25].forEach((z, f) => {
        if ((k + f + n) % 3 === 2) return; // algumas vagas livres
        const c = criarVeiculo('carro', CORES_CARRO[(k * 2 + f + n) % CORES_CARRO.length]);
        c.position.set(-.27 + k * .18, .03, z); c.rotation.y = f ? -Math.PI / 2 : Math.PI / 2; g.add(c);
      });
      g.add(caixa(.1, .13, .09, fachada('#ECEFF1', 1, 1), .42, .03, 0));
      g.add(cilindro(.01, .01, .42, '#455A64', .42, .03, .42, 6));
      const p = mat('#1565C0');
      g.add(caixa(.13, .13, .012, [p, p, p, p, new THREE.MeshStandardMaterial({ map: texEmoji('🅿️', '#1565C0') }), p], .42, .4, .42));
      g.userData.altura = .5;
    },
    posto(g) {
      g.add(caixa(.94, .03, .94, '#B0BEC5'));
      [[-.06, -.04], [.4, -.04], [-.06, .3], [.4, .3]].forEach(([x, z]) => g.add(cilindro(.016, .016, .32, '#ECEFF1', x, .03, z, 8)));
      g.add(caixa(.56, .03, .44, '#C62828', .17, .33, .13)); g.add(caixa(.54, .03, .42, '#FAFAFA', .17, .36, .13));
      [.08, .26].forEach(x => { g.add(caixa(.07, .03, .2, '#ECEFF1', x, .03, .13)); g.add(caixa(.05, .12, .04, '#C62828', x, .06, .13)); g.add(caixa(.052, .03, .042, '#FAFAFA', x, .18, .13)); });
      g.add(caixa(.28, .2, .4, fachada('#FFE7C2', 2, 1), -.3, .03, .05)); g.add(caixa(.3, .03, .42, '#C62828', -.3, .23, .05));
      g.add(cilindro(.012, .012, .3, '#455A64', .4, .03, -.36, 6)); g.add(caixa(.1, .2, .03, '#C62828', .4, .3, -.36));
      g.userData.altura = .55;
    },
    estacaoTrem(g) {
      g.add(caixa(.94, .02, .94, '#BDBDBD'));
      for (let x = -.42; x <= .42; x += .08) g.add(caixa(.025, .01, .26, '#6D4C41', x, .02, 0));
      [-.07, .07].forEach(z => g.add(caixa(.94, .015, .015, mat('#90A4AE', { metalness: .6, roughness: .35 }), 0, .03, z)));
      g.add(caixa(.94, .06, .18, '#E0E0E0', 0, .02, -.28)); g.add(caixa(.94, .006, .02, '#FDD835', 0, .08, -.2));
      g.add(caixa(.9, .03, .24, '#00897B', 0, .36, -.28));
      [-.38, 0, .38].forEach(x => g.add(cilindro(.012, .012, .28, '#ECEFF1', x, .08, -.33, 6)));
      const vlt = new THREE.Group();
      vlt.add(caixa(.74, .16, .14, fachada('#00897B', 6, 1, { vidro: '#CFE9F7' }), 0, .045, 0));
      vlt.add(caixa(.7, .02, .12, '#ECEFF1', 0, .205, 0)); vlt.add(caixa(.01, .08, .08, '#455A64', 0, .225, 0));
      g.add(vlt);
      g.add(caixa(.5, .22, .18, fachada('#E0F2F1', 3, 1), 0, .02, .34)); g.add(caixa(.54, .03, .22, '#00897B', 0, .24, .34));
      g.userData.altura = .6;
    },

    // ── porto e aeroporto ──
    porto(g, n) {
      g.add(caixa(.96, .07, .96, IMG.concreto_cor ? pbr('concreto', 1) : mat('#9E9E9E'), 0, -.04));
      for (let k = 0; k < 5; k++) g.add(cilindro(.018, .022, .04, '#37474F', -.4 + k * .2, .03, .44, 8));
      const cores = ['#C62828', '#1565C0', '#2E7D32', '#EF6C00', '#6A1B9A', '#F9A825'];
      [-.34, -.14, .06].forEach((x, a) => [-.32, -.18].forEach((z, b) => {
        const alto = 1 + (a + b + n) % 3;
        for (let k = 0; k < alto; k++) g.add(caixa(.18, .08, .12, cores[(a * 2 + b + k + n) % cores.length], x, .03 + k * .08, z));
      }));
      const laranja = mat('#E65100', { metalness: .3, roughness: .5 });
      [[.22, .06], [.42, .06], [.22, .34], [.42, .34]].forEach(([x, z]) => g.add(cilindro(.014, .014, .62, laranja, x, .03, z, 6)));
      g.add(caixa(.26, .05, .05, laranja, .32, .62, .06)); g.add(caixa(.26, .05, .05, laranja, .32, .62, .34));
      g.add(caixa(.06, .04, .78, laranja, .32, .67, .2)); g.add(caixa(.08, .06, .08, '#FAFAFA', .32, .57, .3));
      g.add(cilindro(.004, .004, .3, '#263238', .32, .27, .3, 4));
      g.userData.altura = .9;
    },
    aeroporto(g) {
      g.add(caixa(.96, .02, .3, '#37474F', 0, .01, .22));
      for (let x = -.38; x <= .38; x += .12) g.add(caixa(.06, .003, .012, '#FAFAFA', x, .03, .22));
      [-.44, .44].forEach(x => { for (let z = .12; z <= .32; z += .04) g.add(caixa(.03, .003, .015, '#FAFAFA', x, .03, z)); });
      g.add(caixa(.96, .02, .06, '#455A64', 0, .01, .02));
      g.add(caixa(.46, .16, .18, fachada('#ECEFF1', 5, 1, { vidro: '#90CAF9' }), -.16, .01, -.3));
      g.add(caixa(.5, .03, .22, '#283593', -.16, .17, -.3));
      g.add(cilindro(.035, .05, .5, '#ECEFF1', .3, .01, -.3, 12));
      g.add(cilindro(.08, .065, .08, mat('#4FC3F7', { roughness: .1, metalness: .5 }), .3, .5, -.3, 12));
      g.add(cilindro(.09, .09, .02, '#283593', .3, .58, -.3, 12));
      const aviao = criarAviao(); aviao.scale.setScalar(.8); aviao.position.set(.02, .05, -.04); aviao.rotation.y = .3; g.add(aviao);
      g.userData.altura = .7;
    },
  });

  /* ── Folhas caindo no outono ────────────────────────────────────────────── */
  const folhasCaindo = [];
  function montarFolhas() {
    const cores = ['#D2691E', '#E0A030', '#B5452B', '#C8A23D'];
    for (let k = 0; k < 70; k++) {
      const f = new THREE.Mesh(new THREE.PlaneGeometry(.035, .022), new THREE.MeshStandardMaterial({ color: cores[k % 4], side: THREE.DoubleSide, roughness: .9 }));
      f.castShadow = false; f.userData = { x: (Math.random() - .5) * LARGURA, z: (Math.random() - .5) * ALTURA, y: Math.random() * .7, v: .05 + Math.random() * .06, fase: Math.random() * 6 };
      scene.add(f); folhasCaindo.push(f);
    }
  }
  function moverFolhas(dt, t) {
    const outono = estacaoAtual.startsWith('outono');
    folhasCaindo.forEach(f => {
      f.visible = outono;
      if (!outono || reduzido) return;
      const u = f.userData;
      u.y -= u.v * dt;
      if (u.y < 0) { u.y = .6 + Math.random() * .3; u.x = (Math.random() - .5) * LARGURA; u.z = (Math.random() - .5) * ALTURA; }
      f.position.set(u.x + Math.sin(t * 1.3 + u.fase) * .08, u.y, u.z + Math.cos(t * 1.1 + u.fase) * .06);
      f.rotation.set(t * 2 + u.fase, t + u.fase, 0);
    });
  }

  /* ── Barcos no rio e bando de pássaros ──────────────────────────────────── */
  const barcos = [], passaros = [];
  function montarBarcosEPassaros() {
    const caminho = CURSO_RIO.map((c, r) => new THREE.Vector3(posX(c), 0, posZ(r)));
    [['#FFFFFF', '#C62828', 0, 1], ['#FFD54F', '#1565C0', .55, -1]].forEach(([casco, faixa, t0, dir]) => {
      const b = new THREE.Group(), corpo = new THREE.Group();
      corpo.add(caixa(.32, .05, .13, casco, 0, 0, 0));
      corpo.add(caixa(.33, .012, .135, faixa, 0, .035, 0));
      corpo.add(caixa(.12, .06, .1, '#ECEFF1', -.04, .05, 0));
      corpo.add(caixa(.13, .01, .11, faixa, -.04, .11, 0));
      b.add(corpo); b.position.y = -.08; scene.add(b);
      barcos.push({ obj: b, corpo, t: t0, dir, caminho });
    });
    for (let k = 0; k < 7; k++) {
      const p = new THREE.Group();
      const asa = x => { const a = caixa(.07, .004, .025, '#37474F', x, 0, 0); a.castShadow = false; a.geometry.translate(x > 0 ? .035 : -.035, 0, 0); a.position.x = 0; p.add(a); return a; };
      const e = asa(1), d = asa(-1);
      p.userData = { e, d, ang: k * .35, raio: 6 + (k % 3) * .4, alt: 3.2 + (k % 2) * .3, fase: k };
      scene.add(p); passaros.push(p);
    }
  }
  // navio de carga no rio quando há porto; avião circulando quando há aeroporto
  let navio = null, aviaoCeu = null;
  function sincronizarNavioEAviao() {
    const temPorto = conta(s, 'porto') > 0;
    if (temPorto && !navio) {
      const b = new THREE.Group(), corpo = new THREE.Group();
      corpo.add(caixa(.62, .06, .17, '#37474F', 0, -.02, 0)); corpo.add(caixa(.63, .014, .172, '#C62828', 0, -.03, 0));
      ['#C62828', '#1565C0', '#2E7D32', '#EF6C00'].forEach((c, k) => corpo.add(caixa(.1, .07, .13, c, .17 - k * .11, .04, 0)));
      corpo.add(caixa(.09, .12, .14, '#ECEFF1', -.25, .04, 0)); corpo.add(caixa(.1, .015, .15, '#37474F', -.25, .16, 0));
      b.add(corpo); b.position.y = -.08; scene.add(b);
      navio = { obj: b, corpo, t: .3, dir: 1, caminho: barcos[0].caminho, lento: true };
      barcos.push(navio);
    } else if (!temPorto && navio) { scene.remove(navio.obj); barcos.splice(barcos.indexOf(navio), 1); navio = null; }
    const i = s.mapa.findIndex(l => l && l.tipo === 'aeroporto');
    if (i >= 0 && !aviaoCeu) { const obj = criarAviao(); obj.scale.setScalar(2.4); scene.add(obj); aviaoCeu = { obj, ang: 0, i }; }
    else if (i < 0 && aviaoCeu) { scene.remove(aviaoCeu.obj); aviaoCeu = null; }
    if (aviaoCeu) aviaoCeu.i = i;
  }
  function moverAviao(dt) {
    if (!aviaoCeu) return;
    const a = aviaoCeu, cx = posX(a.i % LARGURA), cz = posZ(Math.floor(a.i / LARGURA)), R = 5.5;
    if (!reduzido) a.ang += dt * .12;
    a.obj.position.set(cx + Math.cos(a.ang) * R, 2 + Math.sin(a.ang * 2) * .4, cz + Math.sin(a.ang) * R * .7);
    a.obj.rotation.set(0, Math.atan2(-Math.cos(a.ang) * .7, -Math.sin(a.ang)), 0);
    a.obj.rotateX(.25); // inclina na curva
  }
  function moverBarcosEPassaros(dt, t) {
    sincronizarNavioEAviao();
    moverAviao(dt);
    barcos.forEach(b => {
      if (!reduzido) b.t = (b.t + dt * (b.lento ? .011 : .018) * b.dir + 1) % 1;
      const n = b.caminho.length - 1, f = b.t * n, k = Math.min(n - 1, Math.floor(f)), u = f - k;
      const a = b.caminho[k], c = b.caminho[k + 1];
      b.obj.position.x = a.x + (c.x - a.x) * u; b.obj.position.z = a.z + (c.z - a.z) * u;
      b.obj.rotation.y = Math.atan2(-(c.z - a.z) * b.dir, (c.x - a.x) * b.dir);
      b.corpo.position.y = Math.sin(t * 2 + b.dir) * .006; b.corpo.rotation.z = Math.sin(t * 1.4) * .03;
      const r = Math.round(b.obj.position.z + ALTURA / 2 - .5), col = Math.round(b.obj.position.x + LARGURA / 2 - .5);
      const lote = s.mapa[r * LARGURA + col];
      b.obj.visible = !(lote && ['ponte', 'ponteLocal'].includes(lote.tipo)); // passa por baixo da ponte
    });
    const voando = diaAtual > .35 && !s.chuva;
    passaros.forEach(p => {
      p.visible = voando;
      if (!voando) return;
      const u = p.userData;
      if (!reduzido) u.ang += dt * .12;
      p.position.set(Math.cos(u.ang) * u.raio, u.alt + Math.sin(t + u.fase) * .15, Math.sin(u.ang) * u.raio * .7);
      p.rotation.y = -u.ang;
      const bate = reduzido ? 0 : Math.sin(t * 9 + u.fase) * .6;
      u.e.rotation.z = bate; u.d.rotation.z = -bate;
    });
  }

  /* ── Semáforos nos cruzamentos ──────────────────────────────────────────── */
  // ciclo de 14 s: avenida horizontal verde → amarelo → todos vermelhos → vertical verde → amarelo
  function estadoSemaforo(t) {
    const p = t % 14;
    return {
      h: p < 5.5 ? 'verde' : p < 7 ? 'amarelo' : 'vermelho',
      v: p >= 7.5 && p < 12.5 ? 'verde' : p >= 12.5 ? 'amarelo' : 'vermelho',
    };
  }
  const LUZES = {};
  ['h', 'v'].forEach(eixo => {
    LUZES[eixo] = {};
    [['vermelho', '#FF1744'], ['amarelo', '#FFC400'], ['verde', '#00E676']].forEach(([nome, cor]) => {
      LUZES[eixo][nome] = new THREE.MeshStandardMaterial({ color: cor, emissive: cor, emissiveIntensity: .05 });
    });
  });
  const semaforos = {};
  function criarSemaforo(i) {
    const g = new THREE.Group();
    const cabeca = (eixo, x, z, rot) => {
      g.add(cilindro(.012, .014, .5, '#37474F', x, 0, z, 6));
      const c = new THREE.Group();
      c.add(caixa(.05, .15, .045, '#212121', 0, 0, 0));
      ['vermelho', 'amarelo', 'verde'].forEach((nome, k) => {
        const l = malha(new THREE.SphereGeometry(.015, 10, 8), LUZES[eixo][nome], 0, .122 - k * .045, .024); l.castShadow = false; c.add(l);
      });
      c.position.set(x, .44, z); c.rotation.y = rot; g.add(c);
    };
    cabeca('h', -.46, .46, -Math.PI / 2); cabeca('h', .46, -.46, Math.PI / 2);
    cabeca('v', .46, .46, 0); cabeca('v', -.46, -.46, Math.PI);
    g.position.set(posX(i % LARGURA), 0, posZ(Math.floor(i / LARGURA)));
    return g;
  }
  function sincronizarSemaforos() {
    const tipoRua = j => s.mapa[j] && ['rua', 'ruaLocal'].includes(s.mapa[j].tipo);
    const quer = new Set();
    s.mapa.forEach((l, i) => { if (tipoRua(i) && temSemaforo(i)) quer.add(i); });
    Object.keys(semaforos).forEach(i => { if (!quer.has(+i)) { scene.remove(semaforos[i]); delete semaforos[i]; } });
    quer.forEach(i => { if (!semaforos[i]) { semaforos[i] = criarSemaforo(i); scene.add(semaforos[i]); } });
  }
  function acenderSemaforos(t) {
    const e = estadoSemaforo(t);
    ['h', 'v'].forEach(eixo => Object.entries(LUZES[eixo]).forEach(([nome, m]) => { m.emissiveIntensity = e[eixo] === nome ? 2.2 : .04; }));
    return e;
  }

  /* ── Veículos ───────────────────────────────────────────────────────────── */
  const CORES_CARRO = ['#E53935', '#1E88E5', '#FDD835', '#43A047', '#FB8C00', '#8E24AA', '#ECEFF1'];
  function criarVeiculo(tipo, cor = '#E53935') {
    const g = new THREE.Group();
    const roda = (x, z) => {
      const r = cilindro(.032, .032, .026, '#1E1E1E', x, 0, z, 14); r.rotation.x = Math.PI / 2; r.position.y = .034; g.add(r);
      const c = cilindro(.016, .016, .028, '#B0BEC5', x, 0, z, 10); c.rotation.x = Math.PI / 2; c.position.y = .034; g.add(c);
    };
    if (tipo === 'onibus') { // piso baixo, símbolo de acessibilidade e rampa na porta da direita (+z)
      g.add(caixa(.62, .22, .2, fachada('#F2B705', 5, 1, { vidro: '#CFE9F7' }), 0, .04));
      [-.2, .2].forEach(x => { roda(x, .1); roda(x, -.1); });
      g.add(caixa(.07, .15, .004, '#263238', .2, .045, .101));
      const sim = new THREE.Mesh(new THREE.PlaneGeometry(.06, .06), new THREE.MeshStandardMaterial({ map: texSinal('pcd') })); sim.position.set(.08, .19, .103); g.add(sim);
      const rampa = new THREE.Group(); rampa.position.set(.2, .045, .1); rampa.rotation.x = .35;
      rampa.add(caixa(.07, .006, .14, '#90A4AE', 0, 0, .07)); rampa.add(caixa(.07, .007, .02, '#F2C200', 0, 0, .13));
      rampa.visible = false; rampa.scale.z = .02; g.add(rampa); g.userData.rampa = rampa;
      return g;
    }
    const vidroCab = mat('#1C2836', { roughness: .1, metalness: .5 });
    const sirene = cor => { const m = luzPiscante(cor); g.userData.sirene = m; return m; };
    if (['caminhao', 'bombeiro', 'lixo'].includes(tipo)) { // caminhões: cabine na frente (+x) e carga atrás
      const cabine = { caminhao: cor, bombeiro: '#C62828', lixo: '#2E7D32' }[tipo];
      g.add(caixa(.52, .03, .15, '#37474F', 0, .04, 0));
      g.add(caixa(.13, .15, .16, mat(cabine, { roughness: .35, metalness: .3 }), .18, .05, 0));
      g.add(caixa(.004, .06, .13, vidroCab, .247, .13, 0));
      if (tipo === 'caminhao') g.add(caixa(.36, .17, .16, ['#ECEFF1', '#C62828', '#1565C0', '#EF6C00'][Math.floor(Math.random() * 4)], -.07, .07, 0));
      if (tipo === 'lixo') { g.add(caixa(.34, .16, .16, '#ECEFF1', -.07, .07, 0)); g.add(caixa(.34, .03, .162, '#2E7D32', -.07, .12, 0)); }
      if (tipo === 'bombeiro') {
        g.add(caixa(.34, .12, .16, '#C62828', -.07, .07, 0)); g.add(caixa(.34, .015, .162, '#FAFAFA', -.07, .12, 0));
        g.add(caixa(.36, .015, .05, '#CFD8DC', -.06, .2, 0));
        g.add(caixa(.04, .02, .12, sirene('#FF3030'), .18, .2, 0));
      }
      [.17, -.09, -.17].forEach(x => { roda(x, .08); roda(x, -.08); });
      return g;
    }
    if (tipo === 'ambulancia') {
      g.add(caixa(.36, .17, .15, mat('#FAFAFA', { roughness: .35, metalness: .2 }), 0, .04, 0));
      g.add(caixa(.004, .06, .12, vidroCab, .181, .13, 0));
      g.add(caixa(.36, .025, .152, '#E53935', 0, .1, 0));
      g.add(caixa(.04, .02, .1, sirene('#FF3030'), .12, .21, 0));
      [.11, -.11].forEach(x => { roda(x, .075); roda(x, -.075); });
      return g;
    }
    if (tipo === 'trator') {
      const verde = mat('#2E7D32', { roughness: .45, metalness: .2 });
      g.add(caixa(.14, .07, .09, verde, .04, .05, 0)); g.add(caixa(.08, .05, .1, verde, -.05, .05, 0));
      [[-.04, .05], [-.04, -.05], [.03, .05], [.03, -.05]].forEach(([x, z]) => g.add(cilindro(.004, .004, .1, '#263238', x, .1, z, 4)));
      g.add(caixa(.1, .01, .12, '#FAFAFA', -.005, .2, 0)); g.add(cilindro(.008, .008, .06, '#263238', .08, .12, 0, 6));
      [[-.06, .065, .055], [-.06, -.065, .055], [.07, .055, .032], [.07, -.055, .032]].forEach(([x, z, r]) => {
        const p = cilindro(r, r, .028, '#1E1E1E', x, 0, z, 14); p.rotation.x = Math.PI / 2; p.position.y = r; g.add(p);
        const c = cilindro(r * .5, r * .5, .03, '#F9A825', x, 0, z, 10); c.rotation.x = Math.PI / 2; c.position.y = r; g.add(c);
      });
      return g;
    }
    // carroceria: perfil lateral com curvas, extrudado com chanfro (cantos arredondados)
    const perfil = new THREE.Shape();
    perfil.moveTo(-.15, .035); perfil.lineTo(.15, .035); perfil.quadraticCurveTo(.17, .035, .17, .06); perfil.lineTo(.168, .082);
    perfil.quadraticCurveTo(.16, .095, .125, .097); perfil.lineTo(.07, .1); perfil.quadraticCurveTo(.05, .145, .02, .148);
    perfil.lineTo(-.08, .148); perfil.quadraticCurveTo(-.11, .146, -.125, .115); perfil.lineTo(-.155, .1);
    perfil.quadraticCurveTo(-.17, .095, -.17, .07); perfil.lineTo(-.17, .055); perfil.quadraticCurveTo(-.17, .035, -.15, .035);
    const geo = new THREE.ExtrudeGeometry(perfil, { depth: .12, bevelEnabled: true, bevelThickness: .016, bevelSize: .012, bevelSegments: 3, curveSegments: 6 });
    geo.translate(0, 0, -.06);
    g.add(malha(geo, mat(tipo === 'policia' || tipo === 'taxi' ? '#F4F4F4' : cor, { roughness: .3, metalness: .35 })));
    const vidro = mat('#1C2836', { roughness: .1, metalness: .5 });
    [-.077, .077].forEach(z => g.add(caixa(.13, .036, .004, vidro, -.035, .104, z)));                    // janelas laterais
    const para = caixa(.004, .042, .11, vidro, .045, .1, 0); para.rotation.z = .78; g.add(para);       // para-brisa
    const tras = caixa(.004, .036, .11, vidro, -.105, .1, 0); tras.rotation.z = -.7; g.add(tras);      // vidro traseiro
    [-.095, .095].forEach(x => { roda(x, .075); roda(x, -.075); });
    if (tipo === 'taxi') {
      [-.077, .077].forEach(z => g.add(caixa(.3, .014, .004, '#E65100', 0, .066, z)));
      const placa = new THREE.MeshStandardMaterial({ color: '#FDD835', emissive: '#FFB300', emissiveIntensity: .25 });
      g.add(caixa(.06, .025, .05, placa, -.03, .147, 0));
    }
    if (tipo === 'policia') {
      [-.077, .077].forEach(z => g.add(caixa(.12, .02, .004, '#1E3A8A', .02, .055, z)));
      const sir = luzPiscante('#FF3030'); g.add(caixa(.05, .025, .09, sir, -.03, .16)); g.userData.sirene = sir;
    }
    const farol = new THREE.MeshStandardMaterial({ color: '#FFF6C8', emissive: '#FFF0A0', emissiveIntensity: 0 });
    materiaisNoturnos.push(farol); farol.userData = { farol: true };
    g.add(caixa(.01, .02, .03, farol, .182, .065, .045)); g.add(caixa(.01, .02, .03, farol, .182, .065, -.045));
    const lanterna = mat('#B71C1C', { emissive: '#5A0000' });
    g.add(caixa(.008, .018, .03, lanterna, -.183, .07, .045)); g.add(caixa(.008, .018, .03, lanterna, -.183, .07, -.045));
    return g;
  }
  // avião: nariz para +x
  function criarAviao() {
    const g = new THREE.Group(), branco = mat('#FAFAFA', { roughness: .35, metalness: .3 }), azul = mat('#283593');
    const fus = cilindro(.035, .03, .42, branco, 0, 0, 0, 14); fus.rotation.z = Math.PI / 2; fus.position.set(0, .05, 0); g.add(fus);
    const nariz = malha(new THREE.SphereGeometry(.035, 14, 10), branco, .21, .05, 0); nariz.scale.set(1.4, 1, 1); g.add(nariz);
    g.add(caixa(.4, .012, .072, azul, 0, .047, 0).translateZ(0));
    g.add(caixa(.11, .008, .52, branco, -.01, .04, 0));
    g.add(caixa(.06, .006, .18, branco, -.19, .06, 0));
    g.add(caixa(.07, .1, .008, azul, -.19, .06, 0));
    [-.13, .13].forEach(z => { const m = cilindro(.016, .016, .07, '#B0BEC5', .02, 0, z, 10); m.rotation.z = Math.PI / 2; m.position.y = .025; g.add(m); });
    g.add(caixa(.3, .014, .004, mat('#1C2836', { roughness: .1, metalness: .5 }), .03, .058, .034));
    g.add(caixa(.3, .014, .004, mat('#1C2836', { roughness: .1, metalness: .5 }), .03, .058, -.034));
    return g;
  }
  // tamanho de cada veículo na faixa (para manter distância do da frente)
  const COMPRIMENTO = { onibus: .62, caminhao: .54, bombeiro: .54, lixo: .54, ambulancia: .38, trator: .24 };
  function sincronizarCarros() {
    const desejado = [];
    const n = 2 + Math.min(8, Math.floor((s.pop || 0) / 20));
    for (let i = 0; i < n; i++) desejado.push('carro');
    const vezes = (tipo, q) => { for (let i = 0; i < q; i++) desejado.push(tipo); };
    vezes('onibus', Math.min(3, conta(s, 'terminal') + conta(s, 'estacaoTrem')));
    vezes('taxi', Math.min(4, conta(s, 'pontoTaxi') * 2));
    vezes('caminhao', Math.min(4, conta(s, 'fabrica') + conta(s, 'galpao') * 2 + conta(s, 'industria') + conta(s, 'porto') * 2));
    if (conta(s, 'delegacia')) desejado.push('policia');
    if (conta(s, 'saude')) desejado.push('ambulancia');
    if (conta(s, 'bombeiros')) desejado.push('bombeiro');
    if (conta(s, 'aterro') || conta(s, 'ecoponto')) desejado.push('lixo');
    if (conta(s, 'lavoura') + conta(s, 'pecuaria') + conta(s, 'cooperativa')) desejado.push('trator');
    while (carros.length > desejado.length) scene.remove(carros.pop().obj);
    desejado.forEach((tipo, i) => {
      if (carros[i] && carros[i].tipo === tipo) return;
      if (carros[i]) scene.remove(carros[i].obj);
      const horizontal = i % 2 === 0, sentido = i % 4 < 2 ? 1 : -1;
      const obj = criarVeiculo(tipo, CORES_CARRO[i % CORES_CARRO.length]);
      scene.add(obj);
      const v = { onibus: .6, trator: .35, caminhao: .75, lixo: .55, bombeiro: 1.1, ambulancia: 1.1 }[tipo] || .9 + Math.random() * .6;
      // a posição é a distância percorrida no trajeto da avenida, que segue pela estrada além da cidade
      const faixa = LENTOS.includes(tipo) || i % 3 === 0 ? 1 : 0;
      carros[i] = { tipo, obj, horizontal, sentido, comp: COMPRIMENTO[tipo] || .34, p: Math.random() * trajetoAvenida(horizontal ? 'h' : 'v').len, v, faixa, lat: FAIXAS_AV[faixa] };
    });
  }
  // dispositivos instalados nas avenidas, como posições ao longo de cada eixo
  function posicionarCarro(k, faixa) {
    const [px, pz, tx, tz] = pontoNoTrajeto(trajetoAvenida(k.horizontal ? 'h' : 'v'), k.p);
    const x = px - tz * faixa, z = pz + tx * faixa; // faixa > 0: à direita de quem anda no sentido do trajeto
    const dx = x - k.obj.position.x, dz = z - k.obj.position.z;
    if (Math.hypot(dx, dz) > 1e-4 && Math.hypot(dx, dz) < .5) k.obj.rotation.y = Math.atan2(-dz, dx);
    else if (Math.hypot(dx, dz) >= .5) k.obj.rotation.y = Math.atan2(-tz * k.sentido, tx * k.sentido);
    k.obj.position.set(x, 0, z);
  }
  function viasNasAvenidas() {
    const novo = () => ({ rot: [], ret: [], faixa: [], radar: [], onibus: [], paradas: [], juncoes: [] }), v = { h: novo(), v: novo() }, av = lotesAvenida();
    ['h', 'v'].forEach(e => { const tr = trajetoAvenida(e); tr.lotes.forEach(i => {
      const l = s.mapa[i]; if (l && l.via === 'rotatoria') v[e].rot.push(tr.tileS[i]); if (l && l.via === 'retorno') v[e].ret.push(tr.tileS[i]);
      if (l && l.via === 'faixaPedestre') v[e].faixa.push({ s: tr.tileS[i], i }); if (l && l.via === 'radar') v[e].radar.push(tr.tileS[i]);
      if (l && l.via === 'faixaOnibus') v[e].onibus.push(tr.tileS[i]);
      [0, 1, 2, 3].forEach(d => { // pontos de ônibus e ruas locais ao lado da avenida
        const j = vizinhoNa(i, d); if (j < 0 || av.has(j)) return;
        if (s.mapa[j] && ['pontoOnibus', 'pontoAcessivel', 'terminal'].includes(s.mapa[j].tipo)) v[e].paradas.push({ s: tr.tileS[i], d });
        if (ehLocal(j)) v[e].juncoes.push({ s: tr.tileS[i], i, d });
      });
    }); });
    return v;
  }
  // avenidas com duas faixas em cada sentido: interna (esquerda, mais rápida) e externa (direita, ônibus e caminhões)
  const FAIXAS_AV = [.1, .29];
  const LENTOS = ['onibus', 'caminhao', 'lixo', 'trator', 'bombeiro'];
  function moverCarros(dt, sinal) {
    const vias = viasNasAvenidas(), agora = relogio();
    const cruzRot = s.mapa[LINHA_RUA * LARGURA + COLUNA_RUA].via === 'rotatoria';
    const CRUZ = LINHA_RUA * LARGURA + COLUNA_RUA, centroDe = o => trajetoAvenida(o.horizontal ? 'h' : 'v').tileS[CRUZ];
    // carros que vieram das ruas locais andam junto com os da avenida
    const frota = carros.concat(carrosLocais.filter(c => c.av && !c.manobra).map(c => c.av));
    frota.forEach(k => {
      const eixo = k.horizontal ? 'h' : 'v', tr = trajetoAvenida(eixo);
      if (k.lat === undefined) k.lat = FAIXAS_AV[k.faixa || 0];
      if (k.volta) { // meia-volta no retorno, da faixa interna para a interna do outro sentido
        const f = (k.volta.f = Math.min(1, k.volta.f + (reduzido ? 0 : k.v * .6 * dt / (Math.PI * .1))));
        const ang = f * Math.PI, s0 = k.volta.s0;
        k.p = k.volta.c + s0 * .1 * Math.sin(ang);
        posicionarCarro(k, s0 * .1 * Math.cos(ang));
        if (f >= 1) { k.sentido = -s0; k.p = k.volta.c; k.volta = null; k.lat = .1; }
        return;
      }
      if (k.parado > 0) { // ônibus no ponto: baixa a rampa, espera e recolhe
        k.parado -= reduzido ? 0 : dt;
        const r = k.obj.userData.rampa;
        if (r) { const a = Math.min(1, Math.min(2.8 - k.parado, k.parado) * 2.5); r.visible = a > .02; r.scale.z = Math.max(.02, a); }
        posicionarCarro(k, k.sentido * k.lat);
        return;
      }
      let passo = reduzido ? 0 : k.v * k.sentido * dt;
      // semáforo do cruzamento das avenidas; com rotatória, cede a vez a quem já está nela
      const ate = ((centroDe(k) - k.sentido * .66) - k.p) * k.sentido;
      if (cruzRot) {
        const naRotatoria = frota.some(o => o.horizontal !== k.horizontal && Math.abs(o.p - centroDe(o)) < .5);
        if (naRotatoria && ate >= 0 && ate < .3) passo = 0;
      } else if (sinal[eixo] !== 'verde' && ate >= 0 && ate < .3) passo = 0;
      // perto do radar todos reduzem; na faixa de pedestres, param enquanto alguém atravessa
      if (vias[eixo].radar.some(r => Math.abs(r - k.p) < 1.6)) passo *= .55;
      vias[eixo].faixa.forEach(f => { const a = ((f.s - k.sentido * .55) - k.p) * k.sentido; if (a >= 0 && a < .3 && travessia(f.i, agora) >= 0) passo = 0; });
      // faixa da direita para os lentos; na faixa exclusiva, só ônibus
      let alvo = LENTOS.includes(k.tipo) ? 1 : (k.faixa || 0);
      if (k.tipo !== 'onibus' && vias[eixo].onibus.some(sO => Math.abs(sO - k.p) < 1)) alvo = 0;
      if (k.plano) alvo = 0; // vai converter à esquerda: aproxima-se do eixo da via
      const dLat = FAIXAS_AV[alvo] - k.lat; k.lat += Math.sign(dLat) * Math.min(Math.abs(dLat), dt * .35);
      // não encosta no carro da frente na mesma faixa
      frota.forEach(o => {
        if (o === k || o.horizontal !== k.horizontal || o.sentido !== k.sentido || Math.abs((o.lat ?? .1) - k.lat) > .12) return;
        const folga = (o.p - k.p) * k.sentido;
        if (folga > 0 && folga < (k.comp + o.comp) / 2 + .12) passo = 0;
      });
      // ônibus para no ponto que fica à sua direita
      if (k.tipo === 'onibus' && passo) {
        const par = vias[eixo].paradas.find(pa => (pa.s - k.p) * k.sentido > 0 && (pa.s - k.p - passo) * k.sentido <= 0 && ladoDireito(tr, pa.s, k.sentido) === pa.d);
        if (par) { k.p = par.s; k.parado = 2.8; posicionarCarro(k, k.sentido * k.lat); return; }
      }
      // retorno permitido: às vezes o carro da faixa interna dá meia-volta, se o outro sentido estiver livre
      const ret = vias[eixo].ret.find(c => (c - k.p) * k.sentido > 0 && (c - k.p - passo) * k.sentido <= 0);
      if (ret !== undefined && passo && !LENTOS.includes(k.tipo) && k.lat < .15 && Math.random() < .45 &&
          !frota.some(o => o !== k && o.horizontal === k.horizontal && o.sentido !== k.sentido && Math.abs(o.p - ret) < .9)) {
        k.p = ret; k.volta = { c: ret, f: 0, s0: k.sentido }; return;
      }
      // quem veio de uma rua local pode sair por outra, virando à direita
      if (k.dono) {
        k.desde += Math.abs(passo);
        // conversão à esquerda: escolhe a rua com antecedência, passa para a faixa da esquerda
        // e, na hora de virar, cede passagem a quem vem no sentido contrário (CTB, art. 38, parágrafo único)
        if (k.desde > 1.5 && !k.plano) {
          const jn = vias[eixo].juncoes.find(x => { const a = (x.s - k.p) * k.sentido; return a > .8 && a < 2.5 && x.s !== k.recusou && ladoDireito(tr, x.s, -k.sentido) === x.d; });
          if (jn) { if (Math.random() < .5) k.plano = jn; else k.recusou = jn.s; }
        }
        if (k.plano) {
          if ((k.plano.s - k.p - passo) * k.sentido <= 0) {
            const vem = frota.some(o => o !== k && o.horizontal === k.horizontal && o.sentido !== k.sentido && Math.abs(o.p - k.plano.s) < 1.3);
            if (vem || k.lat > .15) { k.p = k.plano.s; passo = 0; }
            else { const j = k.plano; k.plano = null; sairDaAvenida(k, j); return; }
          }
        }
        const j = !k.plano && k.desde > 1.5 && vias[eixo].juncoes.find(jn => (jn.s - k.p) * k.sentido > 0 && (jn.s - k.p - passo) * k.sentido <= 0 && ladoDireito(tr, jn.s, k.sentido) === jn.d);
        if (j && Math.random() < .6) { sairDaAvenida(k, j); return; }
        if (k.p + passo < .6 || k.p + passo > tr.len - .6) { k.dono.av = null; reposicionar(k.dono); return; }
      }
      k.p += passo;
      if (k.p > tr.len) k.p -= tr.len;
      if (k.p < 0) k.p += tr.len;
      // na rotatória as duas faixas viram uma só, contornando a ilha central
      let w = 0;
      vias[eixo].rot.forEach(c => { const d = k.p - c; if (Math.abs(d) < .5) w = Math.max(w, (1 + Math.cos(Math.PI * d / .5)) / 2); });
      posicionarCarro(k, k.sentido * (k.lat + (.37 - k.lat) * w));
      k.obj.visible = k.p > .15 && k.p < tr.len - .15;
      if (k.obj.userData.sirene) k.obj.userData.sirene.emissiveIntensity = Math.floor(agora * 4) % 2 ? 1.6 : .1;
    });
  }
  // lado do lote (0 a 3) que fica à direita de quem anda no trajeto na posição p
  function ladoDireito(tr, p, sentido) {
    const [, , tx, tz] = pontoNoTrajeto(tr, p), hx = tx * sentido, hz = tz * sentido, rx = -hz, rz = hx;
    return DIRV.findIndex(([dx, dz]) => dx * rx + dz * rz > .9);
  }
  // curva de manobra (entrar ou sair da avenida): Bézier de E até X passando pela "esquina" C
  function manobra(c, E, h, X, fim) {
    const d = (X[0] - E[0]) * h[0] + (X[1] - E[1]) * h[1], C = [E[0] + h[0] * d, E[1] + h[1] * d];
    c.manobra = { P: [E, C, X], u: 0, len: Math.hypot(C[0] - E[0], C[1] - E[1]) + Math.hypot(X[0] - C[0], X[1] - C[1]) || .1, fim };
  }
  function moverManobra(c, dt) {
    const m = c.manobra, [E, C, X] = m.P;
    m.u = Math.min(1, m.u + (reduzido ? 0 : c.v * dt / m.len));
    const u = m.u, a = 1 - u;
    c.obj.position.set(a * a * E[0] + 2 * a * u * C[0] + u * u * X[0], .013, a * a * E[1] + 2 * a * u * C[1] + u * u * X[1]);
    const dx = 2 * a * (C[0] - E[0]) + 2 * u * (X[0] - C[0]), dz = 2 * a * (C[1] - E[1]) + 2 * u * (X[1] - C[1]);
    if (Math.hypot(dx, dz) > 1e-6) c.obj.rotation.y = Math.atan2(-dz, dx);
    if (m.u >= 1) { const f = m.fim; delete c.manobra; f(); }
  }
  // rua local → avenida: para no PARE, espera um espaço e entra virando à direita, na faixa da direita
  function entrarNaAvenida(c, A, dt) {
    const eixo = caminhoAvenida('h').includes(A) ? 'h' : 'v', tr = trajetoAvenida(eixo), sA = tr.tileS[A];
    const h = DIRV[c.sai];
    if (!c.vira) c.vira = Math.random() < .5 ? 'esquerda' : 'direita';
    const esq = c.vira === 'esquerda', novo = esq ? [h[1], -h[0]] : [-h[1], h[0]]; // direção depois da conversão
    const sentidoDe = (() => { const [, , tx, tz] = pontoNoTrajeto(tr, sA); return novo[0] * tx + novo[1] * tz > 0 ? 1 : -1; })();
    c.pare = (c.pare || 0) + dt;
    if (c.pare < .9) return; // parada obrigatória
    // à direita basta o sentido em que vai entrar estar livre; à esquerda cruza a avenida: os dois sentidos precisam estar livres
    const frota = carros.concat(carrosLocais.filter(o => o.av).map(o => o.av));
    if (frota.some(o => o.horizontal === (eixo === 'h') && (esq || o.sentido === sentidoDe) && Math.abs(o.p - sA) < (esq ? 1.5 : 1.2))) { if (c.pare > 8) reposicionar(c); return; }
    const lat = FAIXAS_AV[esq ? 0 : 1], pDest = sA + sentidoDe * (esq ? .55 : .4), [px, pz, tx, tz] = pontoNoTrajeto(tr, pDest);
    const X = [px - tz * sentidoDe * lat, pz + tx * sentidoDe * lat];
    manobra(c, [c.obj.position.x, c.obj.position.z], h, X, () => {
      c.av = { tipo: 'carro', obj: c.obj, horizontal: eixo === 'h', sentido: sentidoDe, p: pDest, comp: .3, v: .8 + Math.random() * .3, faixa: esq ? 0 : (Math.random() < .5 ? 1 : 0), lat, dono: c, desde: 0 };
      c.tile = -2; c.pare = 0; c.vira = null;
    });
  }
  // avenida → rua local, virando à direita
  function sairDaAvenida(k, j) {
    const c = k.dono, L = vizinhoNa(j.i, j.d), ent = (j.d + 2) % 4, h = DIRV[j.d];
    const [cx, cz] = centroLote(L), X = [cx - h[0] * .35 - h[1] * FAIXA_LOCAL, cz - h[1] * .35 + h[0] * FAIXA_LOCAL];
    const [, , tx, tz] = pontoNoTrajeto(trajetoAvenida(k.horizontal ? 'h' : 'v'), k.p);
    c.av = null;
    manobra(c, [c.obj.position.x, c.obj.position.z], [tx * k.sentido, tz * k.sentido], X, () => { entrarNoLote(c, L, ent); c.s = Math.min(.15, c.tr.len); });
  }


  /* ── Estacionamento e sinalização sobre as ruas ── */
  const cacheSinal = {};
  function texSinal(tipo) {
    if (cacheSinal[tipo]) return cacheSinal[tipo];
    const cadeirante = (ctx, cor, W) => {
      ctx.fillStyle = cor; ctx.strokeStyle = cor; ctx.lineWidth = W * .07; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.arc(W * .44, W * .2, W * .07, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.moveTo(W * .42, W * .32); ctx.lineTo(W * .42, W * .55); ctx.lineTo(W * .62, W * .55); ctx.lineTo(W * .72, W * .76); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(W * .42, W * .42); ctx.lineTo(W * .58, W * .42); ctx.stroke();
      ctx.beginPath(); ctx.arc(W * .44, W * .66, W * .17, .35 * Math.PI, 1.85 * Math.PI); ctx.stroke();
    };
    const circulo = (ctx, W, fundo, aro) => {
      ctx.fillStyle = fundo; ctx.beginPath(); ctx.arc(W / 2, W / 2, W * .47, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = aro; ctx.lineWidth = W * .09; ctx.beginPath(); ctx.arc(W / 2, W / 2, W * .42, 0, Math.PI * 2); ctx.stroke();
    };
    const texto = (ctx, W, t, cor, tam, y = .5) => { ctx.fillStyle = cor; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.font = `900 ${W * tam}px Nunito, "Segoe UI", sans-serif`; ctx.fillText(t, W / 2, W * y); };
    return (cacheSinal[tipo] = canvasTex(256, 256, (ctx, W) => {
      if (tipo === 'r6a' || tipo === 'r6b') { // proibido estacionar / estacionamento regulamentado
        circulo(ctx, W, '#FFFFFF', '#D32F2F'); texto(ctx, W, 'E', '#111111', .5, .53);
        if (tipo === 'r6a') { ctx.strokeStyle = '#D32F2F'; ctx.lineWidth = W * .09; ctx.beginPath(); ctx.moveTo(W * .2, W * .2); ctx.lineTo(W * .8, W * .8); ctx.stroke(); }
      } else if (tipo === 'r6c') { // proibido parar e estacionar
        circulo(ctx, W, '#1565C0', '#D32F2F');
        ctx.strokeStyle = '#D32F2F'; ctx.lineWidth = W * .09;
        ctx.beginPath(); ctx.moveTo(W * .22, W * .22); ctx.lineTo(W * .78, W * .78); ctx.moveTo(W * .78, W * .22); ctx.lineTo(W * .22, W * .78); ctx.stroke();
      } else if (tipo === 'vel60' || tipo === 'vel30') {
        circulo(ctx, W, '#FFFFFF', '#D32F2F'); texto(ctx, W, tipo.slice(3), '#111111', .36, .5); texto(ctx, W, 'km/h', '#111111', .1, .72);
      } else if (tipo === 'pcd' || tipo === 'pedestre') {
        ctx.fillStyle = '#1565C0'; ctx.fillRect(0, 0, W, W); ctx.strokeStyle = '#FFFFFF'; ctx.lineWidth = 8; ctx.strokeRect(10, 10, W - 20, W - 20);
        if (tipo === 'pcd') cadeirante(ctx, '#FFFFFF', W);
        else { // pedestre na faixa
          ctx.fillStyle = '#FFFFFF'; ctx.beginPath(); ctx.moveTo(W * .5, W * .12); ctx.lineTo(W * .9, W * .85); ctx.lineTo(W * .1, W * .85); ctx.closePath(); ctx.fill();
          ctx.fillStyle = '#111111'; ctx.beginPath(); ctx.arc(W * .5, W * .36, W * .05, 0, Math.PI * 2); ctx.fill();
          ctx.strokeStyle = '#111111'; ctx.lineWidth = W * .05; ctx.lineCap = 'round';
          ctx.beginPath(); ctx.moveTo(W * .5, W * .43); ctx.lineTo(W * .48, W * .6); ctx.lineTo(W * .4, W * .75); ctx.moveTo(W * .48, W * .6); ctx.lineTo(W * .58, W * .75); ctx.moveTo(W * .4, W * .5); ctx.lineTo(W * .6, W * .52); ctx.stroke();
          for (let k = 0; k < 4; k++) { ctx.fillStyle = '#111111'; ctx.fillRect(W * (.3 + k * .11), W * .78, W * .07, W * .04); }
        }
      } else if (tipo === 'zona' || tipo === 'idoso') {
        ctx.fillStyle = '#1565C0'; ctx.fillRect(0, 0, W, W); ctx.strokeStyle = '#FFFFFF'; ctx.lineWidth = 8; ctx.strokeRect(10, 10, W - 20, W - 20);
        if (tipo === 'zona') { texto(ctx, W, 'E', '#FFFFFF', .42, .38); texto(ctx, W, 'ZONA AZUL', '#FFFFFF', .13, .76); }
        else { texto(ctx, W, '60+', '#FFFFFF', .34, .4); texto(ctx, W, 'IDOSO', '#FFFFFF', .15, .76); }
      } else if (tipo === 'pare') { // R-1: parada obrigatória
        ctx.fillStyle = '#D32F2F'; ctx.beginPath();
        for (let k = 0; k < 8; k++) { const a = Math.PI / 8 + k * Math.PI / 4; ctx.lineTo(W / 2 + Math.cos(a) * W * .47, W / 2 + Math.sin(a) * W * .47); }
        ctx.closePath(); ctx.fill(); ctx.strokeStyle = '#FFFFFF'; ctx.lineWidth = W * .03; ctx.stroke();
        texto(ctx, W, 'PARE', '#FFFFFF', .26);
      } else if (tipo === 'busFaixa') {
        ctx.fillStyle = '#1565C0'; ctx.fillRect(0, 0, W, W); ctx.strokeStyle = '#FFFFFF'; ctx.lineWidth = 8; ctx.strokeRect(10, 10, W - 20, W - 20);
        texto(ctx, W, '🚌', '#FFFFFF', .36, .4); texto(ctx, W, 'EXCLUSIVO', '#FFFFFF', .13, .78);
      } else if (tipo === 'chaoOnibus') { ctx.clearRect(0, 0, W, W); texto(ctx, W, 'ÔNIBUS', 'rgba(250,250,250,.95)', .2); }
      else if (tipo === 'chaoPcd') { ctx.clearRect(0, 0, W, W); cadeirante(ctx, 'rgba(250,250,250,.95)', W); }
      else if (tipo === 'chaoIdoso') { ctx.clearRect(0, 0, W, W); texto(ctx, W, 'IDOSO', 'rgba(250,250,250,.95)', .22); }
    }));
  }
  function placaSinal(g, tipo, x, z) {
    g.add(cilindro(.009, .009, .4, '#455A64', x, 0, z, 6));
    const cinza = mat('#90A4AE'), face = new THREE.MeshStandardMaterial({ map: texSinal(tipo), transparent: ['r6a', 'r6b', 'r6c', 'vel60', 'vel30', 'pare'].includes(tipo), roughness: .6 });
    g.add(caixa(.13, .13, .008, [cinza, cinza, cinza, cinza, face, cinza], x, .33, z + .01));
  }
  function eixoRua(g, i) {
    const grp = new THREE.Group(), con = conexoesDe(i) || [1, 3];
    if (con.includes(0) || con.includes(2)) grp.rotation.y = Math.PI / 2;
    g.add(grp); return grp; // dentro do grupo, a rua corre ao longo de x
  }
  // baias na beira da rua (sobre a calçada), com carros estacionados que mudam a cada mês
  function baias(grp, i, lados, especial) {
    lados.forEach(lado => {
      grp.add(caixa(.84, .004, .12, matAsfalto(), 0, 0, lado * .445));
      [-.42, 0, .42].forEach(x => grp.add(caixa(.012, .006, .11, '#F5F5F5', x, 0, lado * .445)));
      [-.21, .21].forEach((x, k) => {
        const reservada = especial && lado === 1 && k === 0;
        if (reservada) {
          grp.add(caixa(.4, .005, .1, '#1E63B5', x, 0, lado * .445));
          const m = new THREE.Mesh(new THREE.PlaneGeometry(.1, .1), new THREE.MeshStandardMaterial({ map: texSinal(especial === 'pcd' ? 'chaoPcd' : 'chaoIdoso'), transparent: true, depthWrite: false }));
          m.rotation.x = -Math.PI / 2; m.position.set(x, .008, lado * .445); grp.add(m);
        }
        const h = (Math.abs(i) * 7 + k * 13 + (lado + 1) * 5 + (s.mes || 1) * 3) % 10;
        if (h < (reservada ? 3 : 6)) {
          const c = criarVeiculo('carro', CORES_CARRO[h % CORES_CARRO.length]);
          c.scale.setScalar(.85); c.position.set(x, 0, lado * .44); c.rotation.y = lado > 0 ? 0 : Math.PI; grp.add(c);
        }
      });
    });
  }
  // travessia na faixa de pedestres: de tempos em tempos alguém atravessa (0 a 1), senão −1
  function travessia(i, t) {
    const f = (t + (Math.abs(i) * 1.37) % 10) % 10;
    return f < 3.2 ? f / 3.2 : -1;
  }
  const linhaAmarela = grp => [-.38, .38].forEach(z => grp.add(caixa(.98, .005, .03, '#F2C200', 0, 0, z)));
  Object.assign(MODELOS, {
    faixaOnibus(g, n, i) {
      const grp = eixoRua(g, i);
      [1, -1].forEach(lado => {
        grp.add(caixa(1, .004, .17, '#A93226', 0, 0, lado * .29));
        const m = new THREE.Mesh(new THREE.PlaneGeometry(.18, .18), new THREE.MeshStandardMaterial({ map: texSinal('chaoOnibus'), transparent: true, depthWrite: false }));
        m.rotation.set(-Math.PI / 2, 0, lado > 0 ? -Math.PI / 2 : Math.PI / 2); m.position.set(0, .007, lado * .29); grp.add(m);
      });
      placaSinal(g, 'busFaixa', .47, .47); g.userData.altura = .5;
    },
    zonaAzul(g, n, i) { baias(eixoRua(g, i), i, [1, -1]); placaSinal(g, 'zona', .47, .47); g.userData.altura = .5; },
    vagaPcd(g, n, i) { baias(eixoRua(g, i), i, [1], 'pcd'); placaSinal(g, 'pcd', .47, .47); g.userData.altura = .5; },
    vagaIdoso(g, n, i) { baias(eixoRua(g, i), i, [1], 'idoso'); placaSinal(g, 'idoso', .47, .47); g.userData.altura = .5; },
    proibidoEstacionar(g, n, i) { linhaAmarela(eixoRua(g, i)); placaSinal(g, 'r6a', .47, .47); g.userData.altura = .5; },
    proibidoParar(g, n, i) { linhaAmarela(eixoRua(g, i)); placaSinal(g, 'r6c', .47, .47); g.userData.altura = .5; },
    faixaPedestre(g, n, i) {
      const grp = eixoRua(g, i);
      for (let z = -.33; z <= .34; z += .11) grp.add(caixa(.24, .005, .06, '#F5F5F5', 0, 0, z));
      placaSinal(g, 'pedestre', .47, .47);
      const p = criarPessoa(Math.abs(i) * 3 + 1, false); p.visible = false; grp.add(p);
      g.userData.tick = t => {
        const u = travessia(i, t);
        p.visible = u >= 0;
        if (u < 0) return;
        const ida = Math.floor((t + (Math.abs(i) * 1.37) % 10) / 10) % 2 ? 1 : -1;
        p.position.set(-.05, 0, ida * (-.47 + .94 * u)); p.rotation.y = ida > 0 ? 0 : Math.PI;
        animarPasso(p, t * 9, true);
      };
      g.userData.altura = .5;
    },
    radar(g, n, i) {
      g.add(cilindro(.014, .016, .55, '#455A64', .47, 0, .47, 8));
      g.add(caixa(.22, .016, .016, '#455A64', .37, .5, .47));
      g.add(caixa(.07, .05, .05, '#37474F', .27, .44, .47)); g.add(cilindro(.014, .014, .012, '#1C2836', .27, .455, .5, 10).rotateX(Math.PI / 2));
      placaSinal(g, i >= 0 && s.mapa[i] && s.mapa[i].tipo === 'rua' ? 'vel60' : 'vel30', -.47, .47);
      g.userData.altura = .6;
    },
  });

  /* ── Acessibilidade sobre as ruas: ciclofaixa, rampas, piso tátil e semáforo sonoro ── */
  function criarBicicleta(n) {
    const g = new THREE.Group(), quadro = mat(['#1565C0', '#C62828', '#2E7D32', '#F9A825'][n % 4], { metalness: .4, roughness: .4 });
    const rodas = [-.045, .045].map(x => { const r = malha(new THREE.TorusGeometry(.028, .004, 6, 18), mat('#212121'), x, .032, 0); r.castShadow = false; g.add(r); return r; });
    g.add(caixa(.09, .006, .006, quadro, 0, .045, 0)); g.add(caixa(.006, .03, .006, quadro, -.015, .045, 0));
    g.add(caixa(.02, .005, .012, '#212121', -.018, .078, 0)); g.add(caixa(.006, .006, .04, '#9E9E9E', .04, .08, 0));
    const ciclista = criarPessoa(n * 3 + 2, false); ciclista.scale.setScalar(.75); ciclista.position.set(-.012, .012, 0); ciclista.rotation.y = Math.PI / 2;
    ciclista.userData.br1.rotation.x = ciclista.userData.br2.rotation.x = -1.1; g.add(ciclista);
    g.userData = { rodas, ciclista };
    return g;
  }
  function criarCadeirante(n) {
    const g = new THREE.Group(), cadeira = mat('#37474F', { metalness: .4, roughness: .45 });
    g.add(caixa(.05, .008, .05, cadeira, 0, .05, 0)); g.add(caixa(.05, .05, .006, cadeira, 0, .055, -.025));
    const rodas = [-.031, .031].map(x => {
      const w = new THREE.Group(); w.position.set(x, .033, -.004); w.rotation.y = Math.PI / 2;
      const t = malha(new THREE.TorusGeometry(.03, .0045, 6, 18), mat('#212121')); t.castShadow = false; w.add(t);
      w.add(caixa(.055, .003, .003, '#B0BEC5', 0, -.0015, 0)); g.add(w); return w;
    });
    [-.02, .02].forEach(x => g.add(cilindro(.008, .008, .006, '#212121', x, .002, .025, 8)));
    const camisa = mat(CAMISAS[n % CAMISAS.length]), pele = mat(PELES[n % PELES.length]);
    const corpo = malha(new THREE.CapsuleGeometry(.022, .03, 3, 10), camisa, 0, .09, -.006); corpo.castShadow = false; g.add(corpo);
    const coxas = caixa(.04, .014, .04, '#37474F', 0, .056, .014); g.add(coxas); g.add(caixa(.036, .035, .012, '#37474F', 0, .022, .034));
    const cabeca = malha(new THREE.SphereGeometry(.02, 14, 10), pele, 0, .142, -.006); cabeca.castShadow = false; g.add(cabeca);
    g.add(malha(new THREE.SphereGeometry(.0215, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2.1), mat(CABELOS[n % CABELOS.length]), 0, .146, -.008));
    const alvo = new THREE.Mesh(new THREE.BoxGeometry(.14, .22, .14), new THREE.MeshBasicMaterial({ visible: false }));
    alvo.position.y = .09; alvo.userData.alvoPessoa = true; g.add(alvo);
    g.userData = { rodas, cadeirante: true };
    return g;
  }
  let matTatil = null;
  function pisoTatilMat() {
    if (matTatil) return matTatil;
    const t = canvasTex(64, 64, (ctx, W) => {
      ctx.fillStyle = '#F2C200'; ctx.fillRect(0, 0, W, W);
      ctx.fillStyle = '#C79A00'; for (let y = 6; y < W; y += 16) ctx.fillRect(0, y, W, 5); // relevo direcional, em linhas
    });
    t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(8, 1);
    return (matTatil = new THREE.MeshStandardMaterial({ map: t, roughness: .7 }));
  }
  Object.assign(MODELOS, {
    ciclovia(g, n, i) {
      const grp = eixoRua(g, i), bikes = [];
      [1, -1].forEach((lado, k) => {
        grp.add(caixa(1, .004, .07, '#C0392B', 0, 0, lado * .335));
        grp.add(caixa(1, .005, .008, '#F5F5F5', 0, 0, lado * .296));
        for (let x = -.4; x < .5; x += .4) grp.add(caixa(.06, .005, .02, '#F5F5F5', x, 0, lado * .335)); // símbolo da faixa
        const b = criarBicicleta(Math.abs(i) + k); b.rotation.y = lado > 0 ? 0 : Math.PI; b.position.z = lado * .335; grp.add(b);
        bikes.push({ b, lado, fase: (Math.abs(i) * .37 + k * .5) % 1 });
      });
      g.userData.tick = t => bikes.forEach(({ b, lado, fase }) => {
        const u = (t * .22 + fase) % 1;
        b.position.x = lado * (-.5 + u); b.visible = u > .04 && u < .96;
        b.userData.rodas.forEach(r => { r.rotation.z = -t * 9; });
        animarPasso(b.userData.ciclista, t * 10, true);
      });
      g.userData.altura = .3;
    },
    rampa(g, n, i) {
      const con = conexoesDe(i) || [0, 1, 2, 3], cinza = mat('#B0BEC5'), alerta = mat('#F2C200');
      if (con.length >= 3) [[1, 1], [1, -1], [-1, 1], [-1, -1]].forEach(([x, z]) => {
        const r = caixa(.1, .008, .1, cinza, x * .43, 0, z * .43); r.rotation.y = Math.PI / 4; g.add(r);
        const a = caixa(.05, .01, .05, alerta, x * .4, 0, z * .4); a.rotation.y = Math.PI / 4; g.add(a);
      });
      else {
        const grp = eixoRua(g, i);
        [1, -1].forEach(lado => { grp.add(caixa(.26, .008, .1, cinza, 0, 0, lado * .445)); grp.add(caixa(.26, .01, .025, alerta, 0, 0, lado * .405)); });
      }
      g.userData.altura = .2;
    },
    pisoTatil(g, n, i) {
      const grp = eixoRua(g, i);
      [1, -1].forEach(lado => grp.add(caixa(1, .005, .03, pisoTatilMat(), 0, 0, lado * .458)));
      g.userData.altura = .2;
    },
    semaforoSonoro(g, n, i) {
      const ondas = [];
      [[.46, .46], [-.46, -.46], [.46, -.46], [-.46, .46]].forEach(([x, z], k) => {
        g.add(caixa(.03, .05, .025, '#212121', x, .24, z));
        g.add(caixa(.016, .016, .003, mat('#E53935', { emissive: '#B71C1C', emissiveIntensity: .8 }), x, .265, z + .013));
        g.add(caixa(.016, .016, .003, mat('#43A047', { emissive: '#1B5E20', emissiveIntensity: .8 }), x, .245, z + .013));
        g.add(caixa(.03, .04, .02, '#F2C200', x, .14, z)); g.add(cilindro(.007, .007, .003, '#212121', x, .165, z + .011, 10).rotateX(Math.PI / 2));
        if (k < 2) {
          const o = new THREE.Mesh(new THREE.TorusGeometry(.03, .003, 6, 20), new THREE.MeshBasicMaterial({ color: '#43A047', transparent: true, depthWrite: false }));
          o.position.set(x, .26, z); g.add(o); ondas.push(o);
        }
      });
      g.userData.tick = t => ondas.forEach((o, k) => { const f = (t * 1.2 + k * .5) % 1; o.scale.setScalar(1 + f * 2.5); o.material.opacity = .7 * (1 - f); });
      g.userData.altura = .5;
    },
  });

  /* ── Trajeto das avenidas: centro de cada lote, com arcos nas curvas e a estrada além da borda ── */
  const centroLote = i => [posX(i % LARGURA), posZ(Math.floor(i / LARGURA))];
  // lados do lote ligados a outro lote da mesma avenida (ruas locais não entram)
  function ligacoesAvenida(i) {
    const av = new Set([...caminhoAvenida('h'), ...caminhoAvenida('v')]);
    if (!av.has(i)) return conexoes(i);
    return [0, 1, 2, 3].filter(d => { const j = vizinhoNa(i, d); return j >= 0 && av.has(j); })
      .concat(['h', 'v'].flatMap(e => { const t = caminhoAvenida(e); return [t[0], t[t.length - 1]].includes(i) ? [ladoBorda(i)] : []; }));
  }
  function ladoBorda(i) { const r = Math.floor(i / LARGURA), c = i % LARGURA; return r === 0 ? 0 : c === LARGURA - 1 ? 1 : r === ALTURA - 1 ? 2 : 3; }
  // ponto na borda do mapa onde cada ponta de avenida vira estrada, e a direção para fora
  function saidasAvenidas() {
    return ['h', 'v'].flatMap(e => { const t = caminhoAvenida(e); return [t[0], t[t.length - 1]]; }).map(i => {
      const [dx, dz] = DIRV[ladoBorda(i)], [x, z] = centroLote(i);
      return { x: x + dx * .5, z: z + dz * .5, dx, dz };
    });
  }
  const trajetos = {};
  function trajetoAvenida(eixo) {
    const chave = eixo + (s.avenidas || 'curvas');
    if (trajetos[chave]) return trajetos[chave];
    const lotes = caminhoAvenida(eixo), pts = [], tileS = {}, FORA = 10.5;
    const acum = [0], soma = () => { const k = pts.length - 1; if (k > 0) acum.push(acum[k - 1] + Math.hypot(pts[k][0] - pts[k - 1][0], pts[k][1] - pts[k - 1][1])); };
    const add = p => { pts.push(p); soma(); };
    const [x0, z0] = centroLote(lotes[0]), [dx0, dz0] = DIRV[ladoBorda(lotes[0])];
    add([x0 + dx0 * FORA, z0 + dz0 * FORA]);
    lotes.forEach((i, k) => {
      const c = centroLote(i), ant = k ? centroLote(lotes[k - 1]) : null, prox = k < lotes.length - 1 ? centroLote(lotes[k + 1]) : null;
      const curva = ant && prox && (ant[0] - c[0]) * (prox[0] - c[0]) + (ant[1] - c[1]) * (prox[1] - c[1]) === 0;
      if (!curva) { add(c); tileS[i] = acum[acum.length - 1]; return; }
      const E = [(ant[0] + c[0]) / 2, (ant[1] + c[1]) / 2], X = [(prox[0] + c[0]) / 2, (prox[1] + c[1]) / 2];
      for (let n = 0; n <= 8; n++) { const u = n / 8, a = 1 - u; add([a * a * E[0] + 2 * a * u * c[0] + u * u * X[0], a * a * E[1] + 2 * a * u * c[1] + u * u * X[1]]); if (n === 4) tileS[i] = acum[acum.length - 1]; }
    });
    const ul = lotes[lotes.length - 1], [x1, z1] = centroLote(ul), [dx1, dz1] = DIRV[ladoBorda(ul)];
    add([x1 + dx1 * FORA, z1 + dz1 * FORA]);
    return (trajetos[chave] = { pts, acum, len: acum[acum.length - 1], tileS, lotes });
  }
  // ponto e direção do trajeto na distância p
  function pontoNoTrajeto(tr, p) {
    let a = 0, b = tr.acum.length - 1;
    while (b - a > 1) { const m = (a + b) >> 1; if (tr.acum[m] < p) a = m; else b = m; }
    const P = tr.pts[a], Q = tr.pts[b], seg = (tr.acum[b] - tr.acum[a]) || 1, u = Math.max(0, Math.min(1, (p - tr.acum[a]) / seg));
    return [P[0] + (Q[0] - P[0]) * u, P[1] + (Q[1] - P[1]) * u, (Q[0] - P[0]) / seg, (Q[1] - P[1]) / seg];
  }

  /* ── Carros nas ruas locais: seguem curvas, giram na rotatória e retornam onde é permitido ── */
  const carrosLocais = [];
  const FAIXA_LOCAL = .17;
  const ehLocal = i => i >= 0 && i < LARGURA * ALTURA && s.mapa[i] && ['ruaLocal', 'ponteLocal'].includes(s.mapa[i].tipo);
  function vizinhoNa(i, d) {
    const r = Math.floor(i / LARGURA) + PASSOS[d][0], c = i % LARGURA + PASSOS[d][1];
    return r >= 0 && r < ALTURA && c >= 0 && c < LARGURA ? r * LARGURA + c : -1;
  }
  // trajeto dentro do lote (coordenadas locais), entrando pelo lado "ent" e saindo pelo lado "sai"
  function trajetoLocal(i, ent, sai) {
    const hin = [-DIRV[ent][0], -DIRV[ent][1]], hout = DIRV[sai];
    const borda = (d, h) => [DIRV[d][0] * .5 - h[1] * FAIXA_LOCAL, DIRV[d][1] * .5 + h[0] * FAIXA_LOCAL]; // mão direita
    const E = borda(ent, hin), X = borda(sai, hout), pts = [];
    const bez = (P, n = 14) => { for (let k = 0; k <= n; k++) { const u = k / n, a = 1 - u;
      pts.push(P.length === 3 ? [a * a * P[0][0] + 2 * a * u * P[1][0] + u * u * P[2][0], a * a * P[0][1] + 2 * a * u * P[1][1] + u * u * P[2][1]]
        : [a * a * a * P[0][0] + 3 * a * a * u * P[1][0] + 3 * a * u * u * P[2][0] + u * u * u * P[3][0], a * a * a * P[0][1] + 3 * a * a * u * P[1][1] + 3 * a * u * u * P[2][1] + u * u * u * P[3][1]]); } };
    if (s.mapa[i].via === 'rotatoria') { // gira com a ilha à esquerda (sentido anti-horário visto de cima)
      const te = Math.atan2(E[1], E[0]), tx = Math.atan2(X[1], X[0]);
      let delta = ((te - tx) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI); if (delta < .3) delta += 2 * Math.PI;
      pts.push(E);
      for (let k = 0; k <= 20; k++) { const a = te - delta * k / 20; pts.push([Math.cos(a) * .31, Math.sin(a) * .31]); }
      pts.push(X);
    } else if (sai === ent) { const L = conexoes(i).length === 1 ? .62 : .5; bez([E, [E[0] + hin[0] * L, E[1] + hin[1] * L], [X[0] + hin[0] * L, X[1] + hin[1] * L], X]); }
    else if (sai === (ent + 2) % 4) pts.push(E, X);
    else bez([E, hin[0] === 0 ? [E[0], X[1]] : [X[0], E[1]], X]);
    const acum = [0];
    for (let k = 1; k < pts.length; k++) acum.push(acum[k - 1] + Math.hypot(pts[k][0] - pts[k - 1][0], pts[k][1] - pts[k - 1][1]));
    return { pts, acum, len: acum[acum.length - 1] };
  }
  function escolherSaida(i, ent) {
    const opcoes = conexoes(i).filter(d => d !== ent);
    if (!opcoes.length) return ent;                                         // rua sem saída: volta pelo balão
    if (s.mapa[i].via === 'retorno' && Math.random() < .4) return ent;      // retorno permitido
    return opcoes[Math.floor(Math.random() * opcoes.length)];
  }
  function entrarNoLote(c, i, ent) {
    c.tile = i; c.ent = ent; c.sai = escolherSaida(i, ent); c.tr = trajetoLocal(i, ent, c.sai); c.s = 0; c.vira = null;
  }
  function reposicionar(c) {
    const lotes = [];
    s.mapa.forEach((l, i) => { if (ehLocal(i) && conexoes(i).length) lotes.push(i); });
    if (!lotes.length) { c.obj.visible = false; c.tile = -1; return; }
    const i = lotes[Math.floor(Math.random() * lotes.length)], con = conexoes(i);
    entrarNoLote(c, i, con[Math.floor(Math.random() * con.length)]);
    c.s = Math.random() * c.tr.len * .5; c.obj.visible = true; c.surgindo = 0;
  }
  function moverCarrosLocais(dt, sinal) {
    let n = 0;
    s.mapa.forEach((l, i) => { if (ehLocal(i)) n++; });
    const desejado = Math.min(10, Math.floor(n / 3));
    while (carrosLocais.length > desejado) scene.remove(carrosLocais.pop().obj);
    while (carrosLocais.length < desejado) {
      const k = carrosLocais.length, tipo = conta(s, 'pontoTaxi') && k % 3 === 2 ? 'taxi' : 'carro';
      const c = { obj: criarVeiculo(tipo, CORES_CARRO[(k * 3 + 1) % CORES_CARRO.length]), v: .5 + Math.random() * .25 };
      c.obj.scale.setScalar(.85); scene.add(c.obj); reposicionar(c); carrosLocais.push(c);
    }
    const avenida = lotesAvenida();
    carrosLocais.forEach(c => {
      if (c.manobra) { moverManobra(c, dt); return; }
      if (c.av) return; // está na avenida: anda com os carros de lá
      if (c.tile < 0 || !ehLocal(c.tile)) { reposicionar(c); return; }
      let passo = reduzido ? 0 : c.v * dt;
      if (s.mapa[c.tile].via === 'radar') passo *= .55;
      // não encosta no carro da frente no mesmo trajeto
      carrosLocais.forEach(o => { if (o !== c && o.tile === c.tile && o.ent === c.ent && o.s > c.s && o.s - c.s < .32) passo = 0; });
      if (c.s + passo >= c.tr.len) {
        const prox = vizinhoNa(c.tile, c.sai);
        if (!ehLocal(prox)) {
          if (!avenida.has(prox)) { reposicionar(c); return; }
          c.s = c.tr.len - .001; entrarNaAvenida(c, prox, dt); // PARE: espera um espaço e entra na avenida
          if (c.manobra) return;
          passo = 0;
        } else {
        const ent = (c.sai + 2) % 4, lp = s.mapa[prox], eixo = c.sai % 2 ? 'h' : 'v';
        const ocupado = carrosLocais.some(o => o !== c && o.tile === prox && (lp.via === 'rotatoria' || (o.ent === ent && o.s < .3)));
        const semaforo = temSemaforo(prox) && sinal[eixo] !== 'verde';
        const pedestre = lp.via === 'faixaPedestre' && travessia(prox, relogio()) >= 0;
        if (ocupado || semaforo || pedestre) passo = Math.max(0, c.tr.len - c.s - .001); // espera: preferência de quem está na rotatória / sinal fechado
        else { const resto = c.s + passo - c.tr.len; entrarNoLote(c, prox, ent); c.s = resto; passo = 0; c.pare = 0; }
        }
      }
      c.s += passo;
      const { pts, acum } = c.tr;
      let k = 1; while (k < pts.length - 1 && acum[k] < c.s) k++;
      const u = Math.max(0, Math.min(1, (c.s - acum[k - 1]) / ((acum[k] - acum[k - 1]) || 1)));
      const x = pts[k - 1][0] + (pts[k][0] - pts[k - 1][0]) * u, z = pts[k - 1][1] + (pts[k][1] - pts[k - 1][1]) * u;
      c.obj.position.set(posX(c.tile % LARGURA) + x, .013, posZ(Math.floor(c.tile / LARGURA)) + z);
      c.obj.rotation.y = Math.atan2(-(pts[k][1] - pts[k - 1][1]), pts[k][0] - pts[k - 1][0]);
      if (c.surgindo !== undefined) { c.surgindo = Math.min(1, c.surgindo + dt * 3); c.obj.scale.setScalar(.85 * c.surgindo); if (c.surgindo >= 1) delete c.surgindo; }
    });
  }

  /* ── Terreno ────────────────────────────────────────────────────────────── */
  function montarTerreno() {
    const matriz = new THREE.Object3D();
    const lotes = { grama: [], agua: [], rua: [], ponte: [] };
    s.mapa.forEach((l, i) => lotes[l && lotes[l.tipo] ? l.tipo : 'grama'].push(i));
    // curvas das avenidas: o lote recebe grama por baixo e o asfalto em arco por cima
    const curvasAv = lotes.rua.filter(i => { const d = ligacoesAvenida(i); return d.length === 2 && (d[0] + 2) % 4 !== d[1]; });
    lotes.rua = lotes.rua.filter(i => !curvasAv.includes(i)); lotes.grama.push(...curvasAv);

    // grama: uma só superfície com coordenadas de textura do mundo (sem repetição lote a lote);
    // barrancos de terra nas bordas da ilha e nas margens do rio
    const pos = [], nor = [], uv = [], idTopo = [], idLado = [];
    const quad = (pts, n, uvs, lista) => {
      const k = pos.length / 3;
      pts.forEach((p, j) => { pos.push(...p); nor.push(...n); uv.push(...uvs[j]); });
      lista.push(k, k + 1, k + 2, k, k + 2, k + 3);
    };
    const ehAgua = (r, c) => r >= 0 && r < ALTURA && c >= 0 && c < LARGURA && s.mapa[r * LARGURA + c] && ['agua', 'ponte'].includes(s.mapa[r * LARGURA + c].tipo);
    const fora = (r, c) => r < 0 || r >= ALTURA || c < 0 || c >= LARGURA;
    const E = 4; // unidades de mundo por repetição da textura de grama
    lotes.grama.forEach(i => {
      const r = Math.floor(i / LARGURA), c = i % LARGURA;
      const x0 = posX(c) - .5, x1 = x0 + 1, z0 = posZ(r) - .5, z1 = z0 + 1, b = -.1;
      quad([[x0, 0, z0], [x0, 0, z1], [x1, 0, z1], [x1, 0, z0]], [0, 1, 0], [[x0 / E, -z0 / E], [x0 / E, -z1 / E], [x1 / E, -z1 / E], [x1 / E, -z0 / E]], idTopo);
      const barranco = (rr, cc) => ehAgua(rr, cc) || fora(rr, cc);
      if (barranco(r + 1, c)) quad([[x0, 0, z1], [x0, b, z1], [x1, b, z1], [x1, 0, z1]], [0, 0, 1], [[x0, 0], [x0, -.05], [x1, -.05], [x1, 0]], idLado);
      if (barranco(r - 1, c)) quad([[x1, 0, z0], [x1, b, z0], [x0, b, z0], [x0, 0, z0]], [0, 0, -1], [[x1, 0], [x1, -.05], [x0, -.05], [x0, 0]], idLado);
      if (barranco(r, c + 1)) quad([[x1, 0, z1], [x1, b, z1], [x1, b, z0], [x1, 0, z0]], [1, 0, 0], [[z1, 0], [z1, -.05], [z0, -.05], [z0, 0]], idLado);
      if (barranco(r, c - 1)) quad([[x0, 0, z0], [x0, b, z0], [x0, b, z1], [x0, 0, z1]], [-1, 0, 0], [[z0, 0], [z0, -.05], [z1, -.05], [z1, 0]], idLado);
    });
    const geoGrama = new THREE.BufferGeometry();
    geoGrama.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geoGrama.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
    geoGrama.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    geoGrama.setIndex(idTopo.concat(idLado));
    geoGrama.addGroup(0, idTopo.length, 0); geoGrama.addGroup(idTopo.length, idLado.length, 1);
    matGrama = IMG.grama_cor ? pbr('grama', 1, 1, { color: '#FFFFFF', roughness: 1 }) : mat('#6FB14F');
    grama = new THREE.Mesh(geoGrama, [matGrama, IMG.terra_cor ? pbr('terra', 1, 1) : mat('#8A5A3B')]);
    grama.receiveShadow = true; scene.add(grama);

    // água: textura de ondas que desliza, com relevo e reflexo do céu
    const matAgua = IMG.agua_cor ? pbr('agua', 1, 1, { color: '#7FA9C2', transparent: true, opacity: .93, roughness: .1, metalness: .1 })
      : new THREE.MeshStandardMaterial({ color: '#3FA7DE', transparent: true, opacity: .9, roughness: .2 });
    texAgua = [matAgua.map, matAgua.normalMap].filter(Boolean);
    materiaisReflexo.push(matAgua);
    const agua = new THREE.InstancedMesh(new THREE.BoxGeometry(1, .08, 1), matAgua, lotes.agua.length + lotes.ponte.length);
    agua.receiveShadow = true;
    lotes.agua.concat(lotes.ponte).forEach((i, n) => {
      matriz.position.set(posX(i % LARGURA), -.1, posZ(Math.floor(i / LARGURA))); matriz.updateMatrix(); agua.setMatrixAt(n, matriz.matrix);
    });
    scene.add(agua);

    // ruas: asfalto, calçadas de piso, meio-fio e pintura; girada nos trechos verticais
    matRua = materialRua(false); matCruz = materialRua(true); matAvenida = materialRua(false, true);
    materiaisReflexo.push(matRua, matCruz, matAvenida);
    const cruzamentos = lotes.rua.filter(i => ligacoesAvenida(i).length >= 3);
    const ruas = lotes.rua.filter(i => !cruzamentos.includes(i));
    const rua = new THREE.InstancedMesh(new THREE.BoxGeometry(1, .1, 1), matAvenida, ruas.length);
    rua.receiveShadow = true;
    ruas.forEach((i, n) => {
      const r = Math.floor(i / LARGURA), d = ligacoesAvenida(i);
      matriz.position.set(posX(i % LARGURA), -.05, posZ(r)); matriz.rotation.set(0, d.includes(1) || d.includes(3) ? 0 : Math.PI / 2, 0); matriz.updateMatrix();
      rua.setMatrixAt(n, matriz.matrix);
    });
    scene.add(rua);
    cruzamentos.forEach(i => { const cruz = caixa(1, .1, 1, matCruz, posX(i % LARGURA), -.1, posZ(Math.floor(i / LARGURA))); cruz.castShadow = false; scene.add(cruz); });
    curvasAv.forEach(i => {
      const g = new THREE.Group(); curvaRua(g, ligacoesAvenida(i), true);
      g.position.set(posX(i % LARGURA), 0, posZ(Math.floor(i / LARGURA))); scene.add(g);
    });
    montarArredores(matAgua);

    // pontes de madeira com guarda-corpo
    lotes.ponte.forEach(i => {
      const r = Math.floor(i / LARGURA), c = i % LARGURA, g = new THREE.Group();
      const horizontal = r === LINHA_RUA;
      g.add(caixa(1, .08, .8, IMG.madeira_cor ? pbr('madeira', 1) : mat('#A0774F'), 0, -.04));
      g.add(caixa(1, .12, .04, '#7A5134', 0, .04, .42)); g.add(caixa(1, .12, .04, '#7A5134', 0, .04, -.42));
      g.position.set(posX(c), 0, posZ(r)); g.rotation.y = horizontal ? 0 : Math.PI / 2;
      scene.add(g);
    });

    // postes de luz ao longo das avenidas
    const lampada = new THREE.MeshStandardMaterial({ color: '#FFF6D0', emissive: '#FFD27A', emissiveIntensity: 0 });
    materiaisNoturnos.push(lampada); lampada.userData = { farol: true };
    const poste = (x, z) => {
      const g = new THREE.Group();
      g.add(cilindro(.015, .02, .55, '#4A5260', 0, 0, 0, 6));
      g.add(malha(new THREE.SphereGeometry(.045, 8, 6), lampada, 0, .57, 0));
      g.position.set(x, 0, z); scene.add(g); postes.push(g);
    };
    ['h', 'v'].forEach(e => caminhoAvenida(e).forEach((i, k) => {
      const d = ligacoesAvenida(i), horizontal = d.includes(1) && d.includes(3), vertical = d.includes(0) && d.includes(2);
      if (k % 3 !== 1 || s.mapa[i].tipo === 'ponte' || horizontal === vertical) return; // só em trecho reto
      poste(posX(i % LARGURA) + (vertical ? .46 : 0), posZ(Math.floor(i / LARGURA)) - (horizontal ? .46 : 0));
    }));

    // plano invisível para descobrir o lote clicado
    plano = new THREE.Mesh(new THREE.PlaneGeometry(LARGURA, ALTURA), new THREE.MeshBasicMaterial({ visible: false }));
    plano.rotation.x = -Math.PI / 2; scene.add(plano);
  }

  /* ── Arredores: campo, morros, plantações, rios e estradas além do mapa ─── */
  // A cidade não fica mais numa ilha solta no céu: o chão continua até a névoa do horizonte.
  function montarArredores(matAgua) {
    const R = 120, MX = LARGURA / 2, MZ = ALTURA / 2;
    const suave = (a, b, v) => { const t = Math.max(0, Math.min(1, (v - a) / (b - a))); return t * t * (3 - 2 * t); };
    const distMapa = (x, z) => Math.hypot(Math.max(Math.abs(x) - MX, 0), Math.max(Math.abs(z) - MZ, 0));
    // rios que entram e saem do mapa: [z da borda, sentido, x na borda, meandro]
    const canais = [
      [-MZ, -1, posX(CURSO_RIO[0]), t => 4 * Math.sin(t * .07)],
      [MZ, 1, posX(CURSO_RIO[ALTURA - 1]), t => 3 + 3 * Math.sin(t * .06 + .5)], // afasta-se da estrada do sul
      ...CORREGO.filter(([r]) => r === ALTURA - 1).slice(0, 1).map(([, c]) => [MZ, 1, posX(c), t => -3 * Math.sin(t * .08)]),
    ];
    const distCanal = (x, z) => Math.min(...canais.map(([z0, sentido, x0, meandro]) => {
      const t = (z - z0) * sentido;
      return t < 0 ? Infinity : Math.abs(x - (x0 + suave(0, 10, t) * meandro(t)));
    }));
    const saidas = saidasAvenidas();
    const distRua = (x, z) => Math.min(...saidas.map(o => {
      const t = (x - o.x) * o.dx + (z - o.z) * o.dz;
      return t < 0 ? Infinity : Math.abs((x - o.x) * o.dz - (z - o.z) * o.dx);
    }));
    const altura = (x, z) => {
      const morro = Math.max(0, 1.1 + Math.sin(x * .11 + 1.3) * Math.cos(z * .09 - .7) * 1.7 + Math.sin(x * .23 + z * .17) * .6);
      let h = -.004 + suave(6, 30, distMapa(x, z)) * morro * (1 + distMapa(x, z) * .03);
      h = -.004 + (h + .004) * suave(1.2, 5, distRua(x, z));
      return -.22 + (h + .22) * suave(.5, 1.2, distCanal(x, z));
    };

    // chão em grade de 1 unidade, com buraco no lugar do mapa; usa o mesmo material da grama (muda com as estações)
    const N = 2 * R + 1, pos = new Float32Array(N * N * 3), uv = new Float32Array(N * N * 2), idx = [];
    const E = 4;
    for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
      const x = i - R, z = j - R, k = j * N + i;
      pos.set([x, altura(x, z), z], k * 3); uv.set([x / E, -z / E], k * 2);
    }
    for (let j = 0; j < N - 1; j++) for (let i = 0; i < N - 1; i++) {
      const cx = i - R + .5, cz = j - R + .5;
      if (Math.abs(cx) < MX && Math.abs(cz) < MZ) continue;
      const a = j * N + i;
      idx.push(a, a + N, a + N + 1, a, a + N + 1, a + 1);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    geo.setIndex(idx); geo.computeVertexNormals();
    matCampo = matGrama.clone(); matCampo.color.multiplyScalar(.86);
    const chao = new THREE.Mesh(geo, matCampo); chao.receiveShadow = true; scene.add(chao);

    // água dos rios fora do mapa: quatro faixas em volta do mapa, abaixo do nível do campo
    [[0, -(R + MZ) / 2, 2 * R, R - MZ], [0, (R + MZ) / 2, 2 * R, R - MZ], [-(R + MX) / 2, 0, R - MX, 2 * MZ], [(R + MX) / 2, 0, R - MX, 2 * MZ]].forEach(([x, z, w, h]) => {
      const g = new THREE.PlaneGeometry(w, h), u = g.attributes.uv;
      for (let n = 0; n < u.count; n++) u.setXY(n, u.getX(n) * w, u.getY(n) * h);
      const m = new THREE.Mesh(g, matAgua); m.rotation.x = -Math.PI / 2; m.position.set(x, -.07, z); m.receiveShadow = true; scene.add(m);
    });

    // estradas: as avenidas seguem para fora da cidade
    const trechos = [];
    saidas.forEach(o => { for (let d = .5; d < R - 1 - MX; d++) trechos.push([o.x + o.dx * d, o.z + o.dz * d, o.dz !== 0 ? 1 : 0]); });
    const estrada = new THREE.InstancedMesh(new THREE.BoxGeometry(1, .1, 1), matAvenida, trechos.length);
    const o = new THREE.Object3D();
    trechos.forEach(([x, z, vert], n) => { o.position.set(x, -.045, z); o.rotation.set(0, vert ? Math.PI / 2 : 0, 0); o.updateMatrix(); estrada.setMatrixAt(n, o.matrix); });
    estrada.receiveShadow = true; scene.add(estrada);

    // plantações perto da cidade: faixas de cultivo em cores diferentes
    let semente = 7;
    const rand = () => (semente = (semente * 16807) % 2147483647) / 2147483647;
    const CULTIVOS = [['#6E9B3A', '#5C8530'], ['#C9B24A', '#B39A3A'], ['#8A6A4A', '#755A3E'], ['#7FAF45', '#6A9839']];
    const texCultivo = CULTIVOS.map(([a, b]) => canvasTex(64, 64, ctx => {
      for (let y = 0; y < 64; y += 8) { ctx.fillStyle = a; ctx.fillRect(0, y, 64, 5); ctx.fillStyle = b; ctx.fillRect(0, y + 5, 64, 3); }
    }));
    const matCultivo = texCultivo.map(t => { t.wrapS = t.wrapT = THREE.RepeatWrapping; return new THREE.MeshStandardMaterial({ map: t, roughness: 1, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }); });
    const ocupado = [];
    const livre = (x, z, folga) => distMapa(x, z) > folga && distCanal(x, z) > folga && distRua(x, z) > folga && ocupado.every(([ox, oz, or]) => Math.hypot(x - ox, z - oz) > or + folga);
    for (let n = 0, tent = 0; n < 22 && tent < 400; tent++) {
      const ang = rand() * Math.PI * 2, d = 2 + rand() * 6;
      const x = Math.round(Math.cos(ang) * (MX + d)), z = Math.round(Math.sin(ang) * (MZ + d)), w = 3 + Math.floor(rand() * 3), h = 2 + Math.floor(rand() * 3);
      if (![[x - w / 2, z - h / 2], [x + w / 2, z - h / 2], [x - w / 2, z + h / 2], [x + w / 2, z + h / 2], [x, z]].every(([a, b]) => livre(a, b, 1.2))) continue;
      const g = new THREE.PlaneGeometry(w - .3, h - .3), u = g.attributes.uv;
      for (let k = 0; k < u.count; k++) u.setXY(k, u.getX(k) * w / 2, u.getY(k) * h / 2);
      const m = new THREE.Mesh(g, matCultivo[n % matCultivo.length]);
      m.rotation.set(-Math.PI / 2, 0, rand() < .5 ? 0 : Math.PI / 2); m.position.set(x, -.002, z); m.receiveShadow = true;
      scene.add(m); ocupado.push([x, z, Math.hypot(w, h) / 2]); n++;
    }

    // matas e bosques: árvores instanciadas, mais densas nos morros
    const copas = [], pinhos = [];
    for (let tent = 0; tent < 9000 && copas.length + pinhos.length < 1400; tent++) {
      const x = (rand() * 2 - 1) * 80, z = (rand() * 2 - 1) * 80, d = distMapa(x, z);
      if (d < 1.5 || d > 62 || !livre(x, z, .8)) continue;
      const bosque = .5 + .5 * Math.sin(x * .19 + 2) * Math.sin(z * .21 - 1);
      if (rand() > .12 + bosque * .7 * suave(3, 12, d)) continue;
      (rand() < .35 + suave(10, 35, d) * .3 ? pinhos : copas).push([x, altura(x, z) - .02, z, .8 + rand() * .9, rand() * 6.3]);
    }
    const instanciar = (lista, geo, material) => {
      const im = new THREE.InstancedMesh(geo, material, lista.length);
      lista.forEach(([x, y, z, e, r], n) => { o.position.set(x, y, z); o.rotation.set(0, r, 0); o.scale.setScalar(e); o.updateMatrix(); im.setMatrixAt(n, o.matrix); });
      im.castShadow = true; scene.add(im);
    };
    const tronco = mat('#6D4C35');
    const geoTronco = new THREE.CylinderGeometry(.03, .045, .3, 6); geoTronco.translate(0, .15, 0);
    const geoCopa = new THREE.IcosahedronGeometry(.27, 1); geoCopa.translate(0, .45, 0);
    const geoPinho = new THREE.ConeGeometry(.22, .62, 8); geoPinho.translate(0, .5, 0);
    instanciar(copas.concat(pinhos), geoTronco, tronco);
    instanciar(copas, geoCopa, FOLHAS.copa);
    instanciar(pinhos, geoPinho, FOLHAS.pinho);
  }

  function materialRua(cruzamento, avenida = false) {
    const W = 1024, calc = 112, guia = 12;
    const faixas = (ctx, S, modo) => { // modo 'cor' pinta; 'relevo' marca a tinta como superfície lisa
      const k = S / W, liso = 'rgb(128,128,255)';
      const pinta = (cor, x, y, w, h) => { ctx.fillStyle = modo === 'cor' ? cor : liso; ctx.fillRect(x * k, y * k, w * k, h * k); };
      if (cruzamento) {
        for (let n = 0; n < 9; n++) {
          const p = 170 + n * 76;
          pinta('rgba(240,240,236,.92)', p, 20, 40, 120); pinta('rgba(240,240,236,.92)', p, W - 140, 40, 120);
          pinta('rgba(240,240,236,.92)', 20, p, 120, 40); pinta('rgba(240,240,236,.92)', W - 140, p, 120, 40);
        }
        return;
      }
      const branco = 'rgba(240,240,236,.9)';
      pinta(branco, 0, calc + guia + 14, W, 6); pinta(branco, 0, W - calc - guia - 20, W, 6);   // bordas da pista
      if (avenida) { // duas faixas em cada sentido, separadas por linha branca tracejada
        pinta('#E2B71A', 0, W / 2 - 16, W, 9); pinta('#E2B71A', 0, W / 2 + 7, W, 9);     // faixa dupla amarela: proibido ultrapassar
        for (let x = 40; x < W; x += 260) { pinta(branco, x, W / 2 - 199, 150, 8); pinta(branco, x, W / 2 + 191, 150, 8); }
      } else for (let x = 50; x < W; x += 230) pinta('#E2B71A', x, W / 2 - 5, 120, 10); // mão dupla: amarela tracejada
    };
    const cor = canvasTex(W, W, (ctx) => {
      if (!ladrilhar(ctx, 'asfalto', 'cor', 0, 0, W, W, 1)) { ctx.fillStyle = '#3A3D42'; ctx.fillRect(0, 0, W, W); }
      if (!cruzamento) {
        [[0, 0], [0, W - calc]].forEach(([x, y]) => {
          ctx.save(); ctx.beginPath(); ctx.rect(x, y, W, calc); ctx.clip();
          for (let px = 0; px < W; px += calc * 2) ladrilhar(ctx, 'piso', 'cor', px, y - calc / 2, calc * 2, calc * 2, 1);
          ctx.restore();
        });
        ctx.fillStyle = '#A8A6A0'; ctx.fillRect(0, calc, W, guia); ctx.fillRect(0, W - calc - guia, W, guia); // meio-fio
        ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.fillRect(0, calc + guia, W, 4); ctx.fillRect(0, W - calc - guia - 4, W, 4);
      }
      faixas(ctx, W, 'cor');
    });
    const relevo = canvasTex(512, 512, (ctx) => {
      if (!ladrilhar(ctx, 'asfalto', 'relevo', 0, 0, 512, 512, 1)) { ctx.fillStyle = 'rgb(128,128,255)'; ctx.fillRect(0, 0, 512, 512); }
      if (!cruzamento) {
        const c2 = calc / 2;
        [[0, 0], [0, 512 - c2]].forEach(([x, y]) => {
          ctx.save(); ctx.beginPath(); ctx.rect(x, y, 512, c2); ctx.clip();
          for (let px = 0; px < 512; px += c2 * 2) ladrilhar(ctx, 'piso', 'relevo', px, y - c2 / 2, c2 * 2, c2 * 2, 1);
          ctx.restore();
        });
      }
      faixas(ctx, 512, 'relevo');
    }, true);
    return new THREE.MeshStandardMaterial({ map: cor, normalMap: relevo, roughness: .92 });
  }

  /* ── Bairros bloqueados ─────────────────────────────────────────────────── */
  function placaBairro(b) {
    const tex = canvasTex(512, 200, (ctx) => {
      ctx.fillStyle = 'rgba(18,35,58,.88)';
      ctx.beginPath(); ctx.roundRect ? ctx.roundRect(8, 8, 496, 184, 36) : ctx.rect(8, 8, 496, 184); ctx.fill();
      ctx.strokeStyle = '#F2B705'; ctx.lineWidth = 8; ctx.stroke();
      ctx.fillStyle = '#FFFFFF'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.font = '700 58px Nunito, sans-serif'; ctx.fillText(`🔒 ${b.nome}`, 256, 72);
      ctx.fillStyle = '#FFD54A'; ctx.font = '800 50px Nunito, sans-serif'; ctx.fillText(`💰 ${b.preco.toLocaleString('pt-BR')}`, 256, 140);
    });
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthTest: false, transparent: true, toneMapped: false }));
    sp.layers.set(1);
    sp.renderOrder = 11;
    const w = Math.min(2.6, (b.c1 - b.c0 + 1) * .9 + .6);
    sp.scale.set(w, w * 200 / 512, 1);
    return sp;
  }
  function sincronizarBairros() {
    const chave = BAIRROS.map(b => s.bairros[b.id] ? 1 : 0).join('');
    if (chave === bairrosDesenhados) return;
    bairrosDesenhados = chave;
    BAIRROS.forEach(b => {
      const dono = s.bairros[b.id];
      if (dono && zonas[b.id]) { // comprado agora: some a sombra e parte da mata
        zonas[b.id].forEach(o => scene.remove(o)); delete zonas[b.id];
        for (let r = b.r0; r <= b.r1; r++) for (let c = b.c0; c <= b.c1; c++) {
          const i = r * LARGURA + c;
          if (enfeites[i] && enfeites[i].userData.mata) { scene.remove(enfeites[i]); enfeites[i] = null; }
        }
      }
      if (!dono && !zonas[b.id]) {
        const w = b.c1 - b.c0 + 1, h = b.r1 - b.r0 + 1, cx = posX(b.c0) + (w - 1) / 2, cz = posZ(b.r0) + (h - 1) / 2;
        const sombra = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: '#0E1A10', transparent: true, opacity: .2, depthWrite: false }));
        sombra.rotation.x = -Math.PI / 2; sombra.position.set(cx, .025, cz); sombra.renderOrder = 2;
        const borda = new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints([
          new THREE.Vector3(-w / 2, 0, -h / 2), new THREE.Vector3(w / 2, 0, -h / 2), new THREE.Vector3(w / 2, 0, h / 2), new THREE.Vector3(-w / 2, 0, h / 2)]),
          new THREE.LineDashedMaterial({ color: '#F2B705', dashSize: .25, gapSize: .15 }));
        borda.computeLineDistances(); borda.position.set(cx, .05, cz);
        const placa = placaBairro(b); placa.position.set(cx, 1.3, cz);
        zonas[b.id] = [sombra, borda, placa];
        zonas[b.id].forEach(o => scene.add(o));
      }
    });
  }

  /* ── Pedestres nas calçadas das avenidas ────────────────────────────────── */
  const CAMISAS = ['#E53935', '#1E88E5', '#FDD835', '#43A047', '#FB8C00', '#8E24AA', '#FFFFFF', '#00ACC1', '#F06292'];
  const PELES = ['#F1C27D', '#C68642', '#8D5524', '#E0AC69', '#FFDBAC'];
  const CABELOS = ['#2B1B10', '#5D4037', '#111111', '#C9A26B', '#8D6E63', '#E0E0E0'];
  function criarPessoa(n, crianca = false) {
    const g = new THREE.Group();
    const calca = mat(['#2B3A55', '#3E2723', '#37474F', '#1565C0'][n % 4]);
    // membros em cápsula, com o pivô no topo (quadril ou ombro) para balançar ao andar
    const membro = (r, h, cor, x, y) => {
      const geo = new THREE.CapsuleGeometry(r, h, 3, 8); geo.translate(0, -(h / 2 + r), 0);
      const m = malha(geo, typeof cor === 'string' ? mat(cor) : cor, x, y, 0); m.castShadow = false; g.add(m); return m;
    };
    const pe1 = membro(.009, .042, calca, -.011, .062), pe2 = membro(.009, .042, calca, .011, .062);
    const camisa = CAMISAS[n % CAMISAS.length], pele = mat(PELES[n % PELES.length]);
    const corpo = malha(new THREE.CapsuleGeometry(.024, .034, 3, 10), mat(camisa), 0, .094, 0); corpo.castShadow = false; g.add(corpo);
    const br1 = membro(.0075, .038, pele, -.033, .122), br2 = membro(.0075, .038, pele, .033, .122);
    const cabeca = malha(new THREE.SphereGeometry(.021, 14, 10), pele, 0, .152, 0); cabeca.castShadow = false; g.add(cabeca);
    const cabelo = malha(new THREE.SphereGeometry(.0225, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2.1), mat(CABELOS[n % CABELOS.length]), 0, .156, -.003); cabelo.castShadow = false; g.add(cabelo);
    if (n % 7 === 3) { const chapeu = cilindro(.027, .027, .01, '#F5DEB3', 0, .166, 0, 14); chapeu.castShadow = false; g.add(chapeu); }
    if (n % 5 === 2) { const bolsa = caixa(.022, .03, .012, ['#6D4C41', '#AD1457', '#263238'][n % 3], .03, .07, 0); bolsa.castShadow = false; g.add(bolsa); }
    if (crianca) g.scale.setScalar(.68);
    // área de clique invisível, maior que o boneco, para facilitar tocar nas pessoas
    const alvo = new THREE.Mesh(new THREE.BoxGeometry(.14, .26, .14), new THREE.MeshBasicMaterial({ visible: false }));
    alvo.position.y = .1; alvo.userData.alvoPessoa = true; g.add(alvo);
    g.userData = { pe1, pe2, br1, br2 };
    return g;
  }
  function animarPasso(obj, fase, andando) {
    const passo = andando && !reduzido ? Math.sin(fase) : 0;
    obj.userData.pe1.rotation.x = passo * .5; obj.userData.pe2.rotation.x = -passo * .5;
    obj.userData.br1.rotation.x = -passo * .45; obj.userData.br2.rotation.x = passo * .45;
    return passo;
  }
  // Frequentadores: quem passeia, espera ou brinca perto de cada tipo de prédio
  const FREQUENTADORES = {
    parque: { n: 5, criancas: 2, raio: .33 }, praca: { n: 3, raio: .28 }, escola: { n: 4, criancas: 4, raio: .44 },
    mercado: { n: 2, raio: .47 }, terminal: { n: 3, parados: true }, banco: { n: 3, fila: true }, inss: { n: 3, fila: true },
    pontoAcessivel: { n: 3, parados: true }, templo: { n: 2, raio: .47 }, cultura: { n: 3, raio: .47 }, condominio: { n: 2, raio: .47 }, saude: { n: 2, fila: true },
    lagoa: { n: 3, criancas: 1, raio: .47 }, pontoOnibus: { n: 2, parados: true }, iluminacao: { n: 2, raio: .33 },
  };
  function criarFrequentadores(g, tipo, semente) {
    const f = FREQUENTADORES[tipo];
    if (!f) return;
    g.userData.gente = [];
    for (let k = 0; k < f.n; k++) {
      const p = criarPessoa(semente + k * 3, k < (f.criancas || 0));
      const e = { obj: p, ang: (k / f.n) * Math.PI * 2, raio: f.raio || 0, v: (.5 + (k % 3) * .2) * (k % 2 ? 1 : -1), fase: k * 1.7 };
      if (f.fila) p.position.set(.12, .03, .4 + k * .07);
      if (f.parados) { p.position.set(-.3 + k * .14, .05, -.1); p.rotation.y = Math.PI / 2; }
      e.modo = f.fila ? 'fila' : f.parados ? 'parado' : 'roda';
      g.add(p); g.userData.gente.push(e);
    }
  }
  function moverFrequentadores(g, dt, t, luzes) {
    (g.userData.gente || []).forEach((e, k) => {
      e.obj.visible = !(luzes > .6 && k % 2);
      if (e.modo === 'roda') {
        if (!reduzido) e.ang += e.v * dt;
        e.obj.position.set(Math.cos(e.ang) * e.raio, .03, Math.sin(e.ang) * e.raio);
        e.obj.rotation.y = -e.ang + (e.v > 0 ? Math.PI : 0);
        e.obj.position.y = .03 + Math.abs(animarPasso(e.obj, t * 9 + e.fase, true)) * .005;
      } else {
        animarPasso(e.obj, 0, false);
        e.obj.rotation.z = reduzido ? 0 : Math.sin(t * 1.5 + e.fase) * .04; // balança parado
        if (e.modo === 'fila') e.obj.rotation.y = Math.PI;
      }
    });
  }

  function sincronizarPessoas() {
    const alvo = Math.min(40, 4 + Math.floor((s.pop || 0) / 5));
    while (pessoas.length > alvo) scene.remove(pessoas.pop().obj);
    while (pessoas.length < alvo) {
      const n = pessoas.length, horizontal = n % 2 === 0;
      const obj = n % 6 === 3 ? criarCadeirante(n) : criarPessoa(n * 5 + 1, n % 6 === 5); scene.add(obj);
      const [a, b] = trechoReto(horizontal ? 'h' : 'v'), centro = horizontal ? posX : posZ;
      const ini = centro(a) - .5, fim = centro(b) + .5;
      pessoas.push({ obj, horizontal, lado: n % 4 < 2 ? 1 : -1, sentido: Math.random() < .5 ? 1 : -1, ini, fim,
        p: ini + Math.random() * (fim - ini), v: .12 + Math.random() * .1, fase: Math.random() * 6 });
    }
  }
  function moverPessoas(dt, t, luzes) {
    pessoas.forEach((k, n) => {
      if (!reduzido) k.p += k.v * k.sentido * dt;
      if (k.p > k.fim) k.p = k.ini;
      if (k.p < k.ini) k.p = k.fim;
      const calcada = .445 * k.lado + (n % 3 - 1) * .015;
      if (k.horizontal) { k.obj.position.set(k.p, 0, posZ(LINHA_RUA) + calcada); k.obj.rotation.y = k.sentido > 0 ? -Math.PI / 2 : Math.PI / 2; }
      else { k.obj.position.set(posX(COLUNA_RUA) + calcada, 0, k.p); k.obj.rotation.y = k.sentido > 0 ? 0 : Math.PI; }
      const passo = k.obj.userData.cadeirante ? 0 : animarPasso(k.obj, t * 9 + k.fase, true);
      if (k.obj.userData.cadeirante && !reduzido) k.obj.userData.rodas.forEach(w => { w.children[0].rotation.z = t * 6 * k.sentido; });
      k.obj.position.y = Math.abs(passo) * .006;
      // à noite, metade das pessoas está em casa
      k.obj.visible = k.p > k.ini + .05 && k.p < k.fim - .05 && !(luzes > .6 && n % 2);
    });
  }

  /* ── Chuva ──────────────────────────────────────────────────────────────── */
  function montarChuva() {
    const n = 1400, pos = new Float32Array(n * 6);
    for (let k = 0; k < n; k++) {
      const x = (Math.random() - .5) * (LARGURA + 4), y = Math.random() * 9, z = (Math.random() - .5) * (ALTURA + 4);
      pos.set([x, y, z, x + .03, y + .28, z], k * 6);
    }
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    chuva = new THREE.LineSegments(geo, new THREE.LineBasicMaterial({ color: '#B8CDE6', transparent: true, opacity: .55 }));
    chuva.visible = false; chuva.frustumCulled = false; scene.add(chuva);
  }
  function moverChuva(dt) {
    chuva.visible = !!s.chuva;
    if (!chuva.visible || reduzido) return;
    const p = chuva.geometry.attributes.position.array;
    for (let k = 0; k < p.length; k += 6) {
      p[k + 1] -= 11 * dt; p[k + 4] -= 11 * dt;
      if (p[k + 1] < 0) { p[k + 1] += 9; p[k + 4] += 9; }
    }
    chuva.geometry.attributes.position.needsUpdate = true;
  }

  /* ── Céu, sol e lua ─────────────────────────────────────────────────────── */
  function montarCeu() {
    ceuMat = new THREE.ShaderMaterial({
      uniforms: { topo: { value: new THREE.Color('#3E8EDB') }, base: { value: new THREE.Color('#BFE3FA') } },
      vertexShader: 'varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
      fragmentShader: 'uniform vec3 topo; uniform vec3 base; varying vec3 vP; void main(){ float h = clamp(vP.y * 1.8 + .05, 0., 1.); gl_FragColor = vec4(mix(base, topo, pow(h, .7)), 1.);\n#include <encodings_fragment>\n}',
      side: THREE.BackSide, depthWrite: false, fog: false, toneMapped: false,
    });
    const ceu = new THREE.Mesh(new THREE.SphereGeometry(95, 32, 16), ceuMat);
    ceu.renderOrder = -1; scene.add(ceu);
    const disco = (desenhar) => {
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: canvasTex(128, 128, desenhar), fog: false, depthWrite: false, transparent: true, toneMapped: false }));
      sp.scale.set(9, 9, 1); scene.add(sp); return sp;
    };
    solDisco = disco((ctx) => {
      const g = ctx.createRadialGradient(64, 64, 4, 64, 64, 64);
      g.addColorStop(0, 'rgba(255,255,240,1)'); g.addColorStop(.25, 'rgba(255,240,180,1)'); g.addColorStop(.4, 'rgba(255,210,120,.35)'); g.addColorStop(1, 'rgba(255,200,100,0)');
      ctx.fillStyle = g; ctx.fillRect(0, 0, 128, 128);
    });
    luaDisco = disco((ctx) => {
      const g = ctx.createRadialGradient(64, 64, 18, 64, 64, 64);
      g.addColorStop(0, 'rgba(200,215,255,.25)'); g.addColorStop(1, 'rgba(200,215,255,0)');
      ctx.fillStyle = g; ctx.fillRect(0, 0, 128, 128);
      ctx.fillStyle = '#F2F0E0'; ctx.beginPath(); ctx.arc(64, 64, 20, 0, 7); ctx.fill();
      ctx.fillStyle = 'rgba(160,160,150,.5)'; [[58, 58, 5], [70, 68, 4], [62, 74, 3]].forEach(([x, y, r]) => { ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill(); });
    });
    luaDisco.scale.set(6, 6, 1);
  }

  // O céu atual vira mapa de ambiente: vidros, água e metais refletem o dia, o entardecer e a noite
  function atualizarAmbiente() {
    if (Math.abs(diaAtual - envDia) < .08 && envChuva === !!s.chuva) return;
    envDia = diaAtual; envChuva = !!s.chuva;
    if (!envCena) { envCena = new THREE.Scene(); envCena.add(new THREE.Mesh(new THREE.SphereGeometry(50, 32, 16), ceuMat)); }
    const novo = pmrem.fromScene(envCena, 0, .1, 100);
    if (envAlvo) envAlvo.dispose();
    envAlvo = novo;
    materiaisReflexo.forEach(m => { if (!m.envMap) m.needsUpdate = true; m.envMap = novo.texture; });
  }

  const lerpCor = (a, b, k) => new THREE.Color(a).lerp(new THREE.Color(b), k);
  const suave = x => x * x * (3 - 2 * x);
  // Ajusta toda a iluminação para a hora h (0–24)
  function aplicarHora(h) {
    const ang = (h - 6) / 13 * Math.PI;          // sol nasce às 6h e se põe às 19h
    const elev = Math.sin(ang);
    const dia = suave(Math.max(0, Math.min(1, (elev + .06) / .4)));
    diaAtual = dia;
    const crep = Math.max(0, 1 - Math.abs(elev) / .32) * (h > 4 && h < 21 ? 1 : 0);
    const nublado = s.chuva ? 1 : 0;
    if (matRua && matRua.userData.molhado !== nublado) {
      [matRua, matCruz, matAvenida, matAsfalto()].forEach(m => { m.roughness = nublado ? .28 : .92; m.metalness = nublado ? .15 : 0; m.userData.molhado = nublado; });
      if (matGrama) matGrama.roughness = nublado ? .7 : 1;
      if (matCampo) matCampo.roughness = matGrama.roughness;
    }
    const luzes = Math.max(0, Math.min(1, 1 - dia * (nublado ? 1.1 : 1.7)));

    const dirSol = new THREE.Vector3(Math.cos(ang) * 1, Math.max(elev, -.3), -.45).normalize();
    const dirLuz = new THREE.Vector3(Math.cos(ang), Math.max(elev, .3), -.45).normalize(); // sombra nunca rasante
    const centro = controls ? new THREE.Vector3(Math.round(controls.target.x), 0, Math.round(controls.target.z)) : new THREE.Vector3();
    sol.position.copy(centro).addScaledVector(dirLuz, 30); sol.target.position.copy(centro); sol.target.updateMatrixWorld(); sol.intensity = 1.7 * dia * (nublado ? .3 : 1);
    sol.color.copy(lerpCor('#FFF3DD', '#FF9A55', crep * .85));
    const dirLua = new THREE.Vector3(-Math.cos(ang), Math.max(-elev, .25), .35).normalize();
    lua.position.copy(dirLua).multiplyScalar(30); lua.intensity = .5 * (1 - dia);
    solDisco.position.copy(dirSol).multiplyScalar(80); solDisco.visible = elev > -.1;
    luaDisco.position.copy(dirLua).multiplyScalar(80); luaDisco.visible = dia < .6;

    const topo = lerpCor('#0A1430', '#3E8EDB', dia), base = lerpCor('#1A2A4F', '#BFE3FA', dia);
    base.lerp(new THREE.Color('#F59A5B'), crep * .75); topo.lerp(new THREE.Color('#4E5FA0'), crep * .4);
    if (nublado) { topo.lerp(new THREE.Color('#5F6B7A'), .65 * dia + .2); base.lerp(new THREE.Color('#8C97A3'), .6 * dia + .2); }
    solDisco.visible = solDisco.visible && !nublado;
    ceuMat.uniforms.topo.value.copy(topo); ceuMat.uniforms.base.value.copy(base);
    scene.fog.color.copy(base);
    hemi.intensity = .3 + .42 * dia;
    hemi.color.copy(lerpCor('#4A5E96', '#D6EEFF', dia)); hemi.groundColor.copy(lerpCor('#1A2233', '#5E7F45', dia));
    estrelas.material.opacity = 1 - dia;
    materiaisNoturnos.forEach(m => { m.emissiveIntensity = m.userData.farol ? luzes * 1.8 : luzes * .95; });
    nuvens.forEach(n => n.children.forEach(b => { b.material.color.copy(lerpCor('#3A4763', '#FFFFFF', dia)).lerp(new THREE.Color('#FFC59A'), crep * .5); b.material.opacity = .3 + .65 * dia; if (nublado) b.material.color.lerp(new THREE.Color('#6B7380'), .6); }));
    return luzes;
  }

  /* ── Placas (sprites com emoji) ─────────────────────────────────────────── */
  const cacheSprite = {};
  function spriteEmoji(emoji, fundo = 'rgba(255,255,255,.92)', borda = null) {
    const k = emoji + fundo + borda;
    if (!cacheSprite[k]) {
      const tex = canvasTex(128, 128, (ctx) => {
        ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.beginPath(); ctx.arc(66, 70, 52, 0, 7); ctx.fill();
        ctx.fillStyle = fundo; ctx.beginPath(); ctx.arc(64, 64, 52, 0, 7); ctx.fill();
        if (borda) { ctx.strokeStyle = borda; ctx.lineWidth = 8; ctx.stroke(); }
        ctx.font = '64px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif';
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(emoji, 64, 70);
      });
      cacheSprite[k] = new THREE.SpriteMaterial({ map: tex, depthTest: false, sizeAttenuation: false, toneMapped: false }); // tamanho fixo na tela
    }
    const sp = new THREE.Sprite(cacheSprite[k]);
    sp.layers.set(1);
    sp.renderOrder = 10;
    return sp;
  }

  /* ── Detalhes de fachada: letreiros e aparelhos de ar-condicionado ─────── */
  // [texto, largura, altura, x, y, z, fundo, cor do texto] — z é a face da frente de cada modelo
  const LETREIROS = {
    prefeitura: ['PREFEITURA', .5, .045, 0, .685, .332, '#1F3A5F', '#F2D20F'], escola: ['ESCOLA MUNICIPAL', .5, .06, 0, .47, .302, '#C0392B'],
    saude: ['POSTO DE SAÚDE', .46, .06, 0, .62, .352, '#C62828'], delegacia: ['POLÍCIA CIVIL', .5, .05, 0, .495, .362, '#FFFFFF', '#1B2E4B'],
    forum: ['FÓRUM', .3, .04, 0, .725, .352, '#5D4037'], camara: ['CÂMARA MUNICIPAL', .52, .055, 0, .49, .352, '#3A6EA5'],
    cartorio: ['CARTÓRIO', .36, .06, 0, .6, .302, '#5A2A1C'], banco: ['BANCO', .4, .07, 0, .7, .352, '#1F6F8B'],
    inss: ['INSS', .3, .07, 0, .47, .322, '#1F4E9A'], bombeiros: ['BOMBEIROS', .5, .05, 0, .41, .243, '#FFFFFF', '#B71C1C'],
    cultura: ['CENTRO CULTURAL', .58, .06, 0, .375, .482, '#C2185B'], fazenda: ['SEC. DA FAZENDA', .5, .06, 0, .8, .362, '#24493A'],
    mercado: ['MERCADO', .46, .13, 0, .59, .232, null], empresa: ['ESCRITÓRIOS', .5, .07, 0, .15, .432, '#263238'],
    terminal: ['TERMINAL', .5, .035, 0, .51, .282, '#0D7896'], estacaoAgua: ['ÁGUA', .28, .045, -.18, .27, -.128, '#1E88E5'],
    esgoto: ['ESGOTO', .24, .04, .24, .25, .382, '#6D8B3A'], condominio: ['RESIDENCIAL', .4, .05, 0, .09, .432, '#5D4037'],
    aluguel: ['EDIFÍCIO', .3, .04, 0, .27, .332, '#40536E'],
    cooperativa: ['COOPERATIVA', .4, .06, 0, .2, -.02, '#2E7D32'], galpao: ['LOGÍSTICA', .36, .06, 0, .29, .072, '#455A64'],
    pontoTaxi: ['TÁXI', .16, .05, -.28, .15, -.2, '#F9A825', '#212121'], posto: ['CONVENIÊNCIA', .24, .045, -.3, .17, .25, '#C62828'],
    estacaoTrem: ['ESTAÇÃO', .3, .05, 0, .17, .43, '#00897B'], aeroporto: ['AEROPORTO', .3, .04, -.16, .175, -.188, '#283593'],
  };
  const cacheLetreiro = {};
  function letreiro(g, tipo, n) {
    const L = LETREIROS[tipo];
    if (!L) return;
    const [texto, w, h, x, y, z, fundoBase, corTexto = '#FFFFFF'] = L;
    const fundo = fundoBase || ['#E07B2A', '#2E7D32', '#C62828', '#1565C0'][n % 4];
    const k = texto + fundo + corTexto;
    if (!cacheLetreiro[k]) {
      const W = 512, H = Math.max(48, Math.round(512 * h / w));
      cacheLetreiro[k] = new THREE.MeshStandardMaterial({ roughness: .6, map: canvasTex(W, H, (ctx) => {
        ctx.fillStyle = fundo; ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = 'rgba(255,255,255,.18)'; ctx.fillRect(0, 0, W, H * .12);
        ctx.fillStyle = corTexto; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        let fs = H * .62; ctx.font = `800 ${fs}px Nunito, "Segoe UI", sans-serif`;
        while (ctx.measureText(texto).width > W * .9 && fs > 10) { fs -= 2; ctx.font = `800 ${fs}px Nunito, "Segoe UI", sans-serif`; }
        ctx.fillText(texto, W / 2, H / 2 + 2);
      }) });
    }
    const placa = new THREE.Mesh(new THREE.PlaneGeometry(w, h), cacheLetreiro[k]);
    placa.position.set(x, y, z + .003); g.add(placa);
  }
  // [x da face lateral, z, alturas] dos aparelhos de ar-condicionado
  const APARELHOS = {
    aluguel: [.33, .12, [.32, .58, .84, 1.1, 1.36, 1.62]], condominio: [.11, -.2, [.35, .58, .82, 1.05, 1.28, 1.52, 1.75]],
    escola: [.43, -.1, [.2, .42]], saude: [.39, -.12, [.22, .46]], cartorio: [.31, -.1, [.2, .48]], fazenda: [.36, -.12, [.25, .5, .72]],
    camara: [.4, -.12, [.2, .42]], delegacia: [.38, -.12, [.2, .38]],
  };
  function aparelhos(g, tipo) {
    const A = APARELHOS[tipo];
    if (!A) return;
    A[2].forEach((y, k) => {
      const ap = caixa(.03, .035, .055, '#E8EAED', A[0] + .015, y, A[1] + (k % 2) * .18); ap.castShadow = false; g.add(ap);
      const grade = caixa(.002, .024, .04, '#9AA4AE', A[0] + .031, y + .005, A[1] + (k % 2) * .18); grade.castShadow = false; g.add(grade);
    });
  }

  /* ── Canteiro de obras (tapume, andaime e guindaste) antes do prédio subir ── */
  const obras = {};
  let matTapume;
  function criarObra() {
    const g = new THREE.Group();
    matTapume = matTapume || new THREE.MeshStandardMaterial({ map: canvasTex(256, 32, (ctx) => {
      ctx.fillStyle = '#1565C0'; ctx.fillRect(0, 0, 256, 32);
      ctx.fillStyle = '#FFFFFF'; ctx.font = '800 18px Nunito, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('OBRA DA PREFEITURA', 128, 17);
    }) });
    const terra = caixa(.9, .012, .9, '#8D6E63'); terra.castShadow = false; g.add(terra);
    [[0, .45, .9, .02], [0, -.45, .9, .02], [.45, 0, .02, .9], [-.45, 0, .02, .9]].forEach(([x, z, w, d]) => g.add(caixa(w, .14, d, matTapume, x, 0, z)));
    [[-.22, -.22], [.22, -.22], [-.22, .22], [.22, .22]].forEach(([x, z]) => g.add(cilindro(.008, .008, .5, '#B0BEC5', x, 0, z, 5)));
    [.18, .36].forEach(y => g.add(caixa(.48, .012, .48, IMG.madeira_cor ? pbr('madeira', 1) : mat('#A1887F'), 0, y)));
    const mastro = new THREE.Mesh(new THREE.CylinderGeometry(.03, .03, 1.5, 4, 8, true), new THREE.MeshBasicMaterial({ color: '#F9A825', wireframe: true }));
    mastro.position.set(-.33, .75, -.33); mastro.rotation.y = Math.PI / 4; g.add(mastro);
    const lanca = new THREE.Group(); lanca.position.set(-.33, 1.5, -.33);
    lanca.add(caixa(1, .035, .04, '#F9A825', .3, 0, 0)); lanca.add(caixa(.14, .08, .08, '#455A64', -.2, -.02, 0));
    lanca.add(cilindro(.003, .003, .55, '#263238', .62, -.55, 0, 4)); lanca.add(caixa(.05, .04, .05, '#E53935', .62, -.6, 0));
    g.add(lanca);
    for (let k = 0; k < 8; k++) g.add(caixa(.06, .03, .03, '#B5523B', .25 + (k % 4) * .035, .012 + Math.floor(k / 4) * .03, .32));
    g.userData.tick = tt => { lanca.rotation.y = Math.sin(tt * .8) * 1.2; };
    return g;
  }

  /* ── Sincronização com o estado do jogo ─────────────────────────────────── */
  let matSombraContato;
  function criarPredio(tipo, i) {
    const g = new THREE.Group(), corpo = new THREE.Group();
    const n = i * 7 + Math.floor(i / LARGURA);
    MODELOS[tipo](corpo, n, i);
    letreiro(corpo, tipo, n); aparelhos(corpo, tipo);
    const nivel = (s.mapa[i] && s.mapa[i].nivel) || 1;
    corpo.userData.escalaY = tipo === 'casa' ? 1 : 1 + .25 * (nivel - 1); // casa troca de modelo; os demais ganham andares
    corpo.scale.y = corpo.userData.escalaY;
    g.add(corpo);
    g.userData.corpo = corpo; g.userData.tick = corpo.userData.tick;
    g.userData.altura = (corpo.userData.altura || 1) * corpo.userData.escalaY;
    if (!['enfeite'].includes(PREDIOS[tipo].cat) && !ehDispositivo(tipo) && !['ruaLocal', 'ponteLocal', 'parque'].includes(tipo)) {
      matSombraContato = matSombraContato || new THREE.MeshBasicMaterial({ transparent: true, depthWrite: false, toneMapped: false,
        map: canvasTex(128, 128, (ctx) => {
          const gr = ctx.createRadialGradient(64, 64, 20, 64, 64, 64);
          gr.addColorStop(0, 'rgba(0,0,0,.5)'); gr.addColorStop(.6, 'rgba(0,0,0,.25)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
          ctx.fillStyle = gr; ctx.fillRect(0, 0, 128, 128);
        }) });
      const sombra = new THREE.Mesh(new THREE.PlaneGeometry(1.25, 1.25), matSombraContato);
      sombra.rotation.x = -Math.PI / 2; sombra.position.y = .006; sombra.renderOrder = 1; g.add(sombra);
    }
    criarFrequentadores(g, tipo, i);
    g.position.set(posX(i % LARGURA), 0, posZ(Math.floor(i / LARGURA)));
    g.rotation.y = (i * 13 % 4) * Math.PI / 2 * (tipo === 'casa' || tipo === 'arvore' ? 1 : 0); // casas viradas para lados diferentes
    g.userData.tile = i;
    if (PREDIOS[tipo].cat === 'enfeite') return g;
    const placa = spriteEmoji(PREDIOS[tipo].icone);
    placa.scale.set(.042, .042, 1); placa.position.y = (g.userData.altura || 1) + .22;
    placa.visible = mostrarPlacas; g.userData.placa = placa;
    g.add(placa);
    return g;
  }

  function atualizar() {
    if (!scene || !pronto) return;
    s.mapa.forEach((l, i) => {
      const tipo = l && MODELOS[l.tipo] ? l.tipo : null;
      const base = tipo === 'ruaLocal' ? tipo + conexoes(i).join('') : tipo === 'ponteLocal' ? tipo + orientacaoPonte(i) : tipo;
      const chave = base && base + ':' + ((l && l.nivel) || 1);
      if (tiposNoLote[i] === chave) return;
      if (predios[i]) { scene.remove(predios[i]); delete predios[i]; }
      if (obras[i]) { scene.remove(obras[i]); delete obras[i]; }
      if (tipo) {
        predios[i] = criarPredio(tipo, i); scene.add(predios[i]);
        if (enfeites[i]) { scene.remove(enfeites[i]); delete enfeites[i]; }
      }
      tiposNoLote[i] = chave;
    });
    // rotatórias, retornos e placas ficam sobre a rua (o desenho depende das ruas ligadas)
    s.mapa.forEach((l, i) => {
      const via = l && l.via && MODELOS[l.via] ? l.via : null, chave = via && via + conexoes(i).join('') + (VAGAS.includes(via) ? ':' + s.mes : '');
      if (viasNoLote[i] === chave) return;
      if (vias[i]) { scene.remove(vias[i]); delete vias[i]; }
      if (via) {
        const g = new THREE.Group(); MODELOS[via](g, i * 7, i);
        g.position.set(posX(i % LARGURA), .013, posZ(Math.floor(i / LARGURA))); g.userData.tile = i;
        scene.add(g); vias[i] = g;
      }
      viasNoLote[i] = chave;
    });
    s.mapa.forEach((l, i) => {
      const lista = l && l.acess ? l.acess.filter(k => MODELOS[k]) : [], chave = lista.length ? lista.join(',') + conexoes(i).join('') : null;
      if (acessosNoLote[i] === chave) return;
      if (acessos[i]) { scene.remove(acessos[i]); delete acessos[i]; }
      if (chave) {
        const g = new THREE.Group(), ticks = [];
        lista.forEach(k => { const sub = new THREE.Group(); MODELOS[k](sub, i * 7, i); if (sub.userData.tick) ticks.push(sub.userData.tick); g.add(sub); });
        g.userData.tick = t => ticks.forEach(f => f(t)); g.userData.altura = .5; g.userData.tile = i;
        g.position.set(posX(i % LARGURA), .014, posZ(Math.floor(i / LARGURA))); scene.add(g); acessos[i] = g;
      }
      acessosNoLote[i] = chave;
    });
    const avs = lotesAvenida();
    avs.forEach(i => {
      const l = s.mapa[i], lig = ligacoesAvenida(i), reto = lig.length === 2 && (lig[0] + 2) % 4 === lig[1];
      const lados = l && l.tipo === 'rua' && reto ? [0, 1, 2, 3].filter(d => { const j = vizinhoNa(i, d); return j >= 0 && !avs.has(j) && ehLocal(j); }) : [];
      const chave = lados.length ? lados.join('') : null;
      if (emendasNoLote[i] === chave) return;
      if (emendas[i]) { scene.remove(emendas[i]); delete emendas[i]; }
      if (chave) {
        const g = new THREE.Group();
        lados.forEach(d => { const [dx, dz] = DIRV[d]; const m = caixa(dx ? .13 : .78, .004, dz ? .13 : .78, matAsfalto(), dx * .445, 0, dz * .445); m.castShadow = false; g.add(m); });
        g.position.set(posX(i % LARGURA), .001, posZ(Math.floor(i / LARGURA))); scene.add(g); emendas[i] = g;
      }
      emendasNoLote[i] = chave;
    });
    // árvores decorativas em terrenos vazios; nos bairros ainda não comprados a mata é densa
    s.mapa.forEach((l, i) => {
      if (l || enfeites[i] !== undefined) return;
      const h = (i * 37 + 11) % 11, bloqueado = !s.bairros[bairroDe(i).id];
      if (h < 3 || (bloqueado && h < 7)) {
        const a = arvore(h % 5 === 4 ? 2 : h % 2, .8 + (i % 3) * .12);
        if (bloqueado && h >= 3) { a.userData.mata = true; const b = arvore(1, .7); b.position.set(.25, 0, -.2); a.add(b); }
        a.position.set(posX(i % LARGURA) + ((i * 7) % 5 - 2) * .08, 0, posZ(Math.floor(i / LARGURA)) + ((i * 3) % 5 - 2) * .08);
        scene.add(a); enfeites[i] = a;
      } else enfeites[i] = null;
    });
    sincronizarBairros();
    sincronizarSemaforos();
    if (visaoAtiva) desenharVisao();
    aplicarEstacao((s.mes - 1) % 12);
    // balões ❗ dos cidadãos
    const pend = new Set((s.pendentes || []).map(p => p.tile));
    const alvo = i => predios[i] || vias[i] || acessos[i];
    Object.keys(baloes).forEach(i => { if (!pend.has(+i) || !alvo(i)) { scene.remove(baloes[i]); delete baloes[i]; } });
    pend.forEach(i => {
      if (baloes[i] || !alvo(i)) return;
      const b = spriteEmoji('❗', '#FFFFFF', '#E53935');
      b.scale.set(.075, .075, 1); b.userData.base = (alvo(i).userData.altura || 1) + .55;
      b.position.set(alvo(i).position.x, b.userData.base, alvo(i).position.z);
      scene.add(b); baloes[i] = b;
    });
    Object.values(predios).forEach(g => { if (g.userData.placa) g.userData.placa.visible = mostrarPlacas && !pend.has(g.userData.tile); });
  }

  /* ── Visões de cobertura: alcance de cada serviço em volta dos prédios ──── */
  let visaoAtiva = null, malhaVisao = null;
  function desenharVisao() {
    if (malhaVisao) { scene.remove(malhaVisao); malhaVisao.geometry.dispose(); malhaVisao = null; }
    if (!visaoAtiva) return { raio: 0, semAtendimento: 0 };
    const fontes = [];
    s.mapa.forEach((l, i) => { if (l && PREDIOS[l.tipo] && PREDIOS[l.tipo].servico === visaoAtiva) fontes.push({ r: Math.floor(i / LARGURA), c: i % LARGURA, raio: 4 + (l.nivel || 1) }); });
    const lotes = s.mapa.map((l, i) => (!l || PREDIOS[l.tipo]) && s.bairros[bairroDe(i).id] ? i : -1).filter(i => i >= 0);
    const geo = new THREE.PlaneGeometry(.94, .94); geo.rotateX(-Math.PI / 2);
    malhaVisao = new THREE.InstancedMesh(geo, new THREE.MeshBasicMaterial({ transparent: true, opacity: .55, depthWrite: false, toneMapped: false }), lotes.length);
    const m = new THREE.Object3D(), verde = new THREE.Color('#2ECC71'), vermelho = new THREE.Color('#E74C3C'), cinza = new THREE.Color('#95A5A6'), c = new THREE.Color();
    let sem = 0;
    lotes.forEach((i, n) => {
      const r = Math.floor(i / LARGURA), col = i % LARGURA, l = s.mapa[i];
      const folga = fontes.reduce((b, f) => Math.max(b, f.raio - Math.hypot(f.r - r, f.c - col)), -1);
      const moradia = l && RESIDENCIAIS.includes(l.tipo);
      if (folga >= 0) c.copy(verde).lerp(new THREE.Color('#A3E4A0'), Math.max(0, 1 - folga / 3));
      else if (moradia) { c.copy(vermelho); sem++; } else c.copy(cinza);
      m.position.set(posX(col), .05, posZ(r)); m.updateMatrix(); malhaVisao.setMatrixAt(n, m.matrix); malhaVisao.setColorAt(n, c);
    });
    malhaVisao.renderOrder = 3; scene.add(malhaVisao);
    return { raio: 5, semAtendimento: sem };
  }

  /* ── Miniaturas 3D de cada prédio para o menu de construção ─────────────── */
  const miniaturas = {};
  function gerarMiniaturas() {
    let r2;
    try { r2 = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true }); } catch (e) { return; }
    r2.setPixelRatio(1); r2.setSize(120, 120); r2.outputEncoding = THREE.sRGBEncoding;
    r2.toneMapping = THREE.ACESFilmicToneMapping; r2.toneMappingExposure = 1.15;
    const cena = new THREE.Scene();
    cena.add(new THREE.HemisphereLight('#FFFFFF', '#8FA3B8', 1.1));
    const luz = new THREE.DirectionalLight('#FFF4E0', 1.7); luz.position.set(3, 5, 4); cena.add(luz);
    const cam = new THREE.PerspectiveCamera(28, 1, .1, 50);
    const tipos = Object.keys(MODELOS).filter(k => PREDIOS[k]);
    let k = 0;
    const passo = () => {
      for (let q = 0; q < 3 && k < tipos.length; q++, k++) {
        const tipo = tipos[k], g = new THREE.Group();
        try { MODELOS[tipo](g, 7, -1); letreiro(g, tipo, 7); } catch (e) { continue; }
        cena.add(g);
        const alt = Math.max(.45, Math.min(3, g.userData.altura || 1));
        const d = .95 + alt * .55;
        cam.position.set(d * .9, .5 + alt * .55, d * 1.1); cam.lookAt(0, alt * .36, 0);
        r2.render(cena, cam);
        miniaturas[tipo] = r2.domElement.toDataURL('image/png');
        cena.remove(g);
      }
      if (k < tipos.length) setTimeout(passo, 20);
      else { r2.dispose(); r2.forceContextLoss(); window.dispatchEvent(new Event('miniaturas-prontas')); }
    };
    passo();
  }

  function atualizarFantasma() {
    const sobreAgua = hover >= 0 && s.mapa[hover] && s.mapa[hover].tipo === 'agua';
    const ehVia = ehDispositivo(s.selecionado);
    const livre = hover >= 0 && !!s.bairros[bairroDe(hover).id] && (ehVia ? !validarVia(s.selecionado, hover) : s.selecionado === 'ponteLocal' ? sobreAgua : !s.mapa[hover]);
    const tipo = s.selecionado && livre ? s.selecionado : null;
    if (tipo !== fantasmaTipo) {
      if (fantasma) scene.remove(fantasma);
      fantasma = null; fantasmaTipo = tipo;
      if (tipo) {
        fantasma = criarPredio(tipo, hover);
        fantasma.traverse(o => {
          if (o.isMesh) {
            o.material = (Array.isArray(o.material) ? o.material : [o.material]).map(m => { const c = m.clone(); c.transparent = true; c.opacity = .55; return c; });
            o.castShadow = false;
          }
        });
        scene.add(fantasma);
      }
    }
    if (fantasma && fantasma.userData.placa) fantasma.userData.placa.visible = false;
    if (fantasma) fantasma.position.set(posX(hover % LARGURA), ehVia ? .013 : 0, posZ(Math.floor(hover / LARGURA)));
    const foco = hover >= 0 ? hover : cursor;
    destaque.visible = foco >= 0;
    if (foco >= 0) {
      destaque.position.set(posX(foco % LARGURA), .02, posZ(Math.floor(foco / LARGURA)));
      const l = s.mapa[foco];
      const travado = !s.bairros[bairroDe(foco).id];
      const podeAqui = ehDispositivo(s.selecionado) ? !validarVia(s.selecionado, foco) : s.selecionado === 'ponteLocal' ? l && l.tipo === 'agua' : !l;
      destaque.material.color.set(travado ? '#F2B705' : s.selecionado ? (podeAqui ? (beiraRua(foco) ? '#F2B705' : '#FFFFFF') : '#E53935') : '#FFFFFF');
      destaque.material.opacity = s.selecionado ? .55 : .35;
    }
  }

  /* ── Laço de animação ───────────────────────────────────────────────────── */
  let ultimo = performance.now();
  function quadro(agora) {
    requestAnimationFrame(quadro);
    const dt = Math.min(.05, (agora - ultimo) / 1000); ultimo = agora;
    const t = relogio();
    // relógio: o dia (6h–19h) dura ~2 min e a noite ~45 s; "Próximo mês" passa um dia inteiro em 3 s
    if (lapso) {
      const x = Math.min(1, (agora - lapso.ini) / 3000);
      hora = (lapso.de + 24 * suave(x)) % 24;
      if (x >= 1) lapso = null;
    } else if (!reduzido) {
      hora = (hora + dt * (hora >= 6 && hora < 19 ? 13 / 120 : 11 / 45)) % 24;
    }
    const luzes = aplicarHora(hora);
    atualizarAmbiente();
    const hh = Math.floor(hora), mm = Math.floor((hora % 1) * 60);
    relogioEl.textContent = `${hora >= 6 && hora < 19 ? '☀️' : '🌙'} ${String(hh).padStart(2, '0')}:${String(mm - mm % 10).padStart(2, '0')}`;

    const sinal = acenderSemaforos(t);
    sincronizarCarros(); moverCarros(dt, sinal); moverCarrosLocais(dt, sinal);
    sincronizarPessoas(); moverPessoas(dt, t, luzes);
    if (!reduzido) {
      texAgua.forEach((tx, k) => tx.offset.set(t * (k ? -.03 : .05), t * (k ? .04 : .03)));
      nuvens.forEach(n => { n.position.x += n.userData.v * dt; if (n.position.x > LARGURA) n.position.x = -LARGURA; });
    }
    Object.entries(predios).forEach(([i, g]) => {
      if (brotando[i] && agora < brotando[i]) { // ainda em obra
        g.userData.corpo.scale.set(1, .001, 1);
        if (obras[i]) obras[i].userData.tick(t);
      } else if (brotando[i]) {
        if (obras[i]) { scene.remove(obras[i]); delete obras[i]; }
        const x = Math.min(1, (agora - brotando[i]) / 600);
        const k = x >= 1 ? 1 : 1 + 2.2 * Math.pow(x - 1, 3) + 1.2 * Math.pow(x - 1, 2); // easeOutBack
        const corpo = g.userData.corpo, ey = corpo.userData.escalaY || 1;
        corpo.scale.set(1, Math.max(.02, k) * ey, 1);
        if (x >= 1) { delete brotando[i]; corpo.scale.set(1, ey, 1); }
      }
      if (g.userData.tick && !reduzido) g.userData.tick(t);
      if (g.userData.gente) moverFrequentadores(g, dt, t, luzes);
    });
    [...Object.values(vias), ...Object.values(acessos)].forEach(g => { if (g.userData.tick && !reduzido) g.userData.tick(t); });
    moverChuva(dt);
    moverBarcosEPassaros(dt, t);
    moverFolhas(dt, t);
    Object.values(baloes).forEach(b => { b.position.y = b.userData.base + (reduzido ? 0 : Math.abs(Math.sin(t * 4)) * .18); });
    atualizarFantasma();
    if (!mostrarPlacas) Object.values(predios).forEach(g => { if (g.userData.placa) g.userData.placa.visible = g.userData.tile === hover && !baloes[g.userData.tile]; });
    if (voo) { // câmera cinematográfica: desliza até o lote
      const x = Math.min(1, (agora - voo.ini) / 1000), e = suave(x);
      controls.target.lerpVectors(voo.t0, voo.t1, e); camera.position.lerpVectors(voo.p0, voo.p1, e);
      if (x >= 1) voo = null;
    }
    moverPorTeclado(dt);
    controls.update();
    // névoa acompanha o zoom: de perto o horizonte fica suave, de longe dá para ver a cidade inteira
    const distCam = camera.position.distanceTo(controls.target);
    scene.fog.far = Math.min(distCam * 1.8 + 45, 105); scene.fog.near = scene.fog.far * .42;
    desenhar(luzes, (agora - (quadro.anterior || agora)) / 1000); quadro.anterior = agora;
    atualizarRotulo();
  }

  function atualizarRotulo() {
    if (pessoaSobMouse >= 0) return; // o rótulo da pessoa é posicionado no movimento do mouse
    const foco = hover >= 0 ? hover : cursor;
    const l = foco >= 0 && s.mapa[foco];
    if (foco >= 0 && !s.bairros[bairroDe(foco).id]) {
      const b = bairroDe(foco), p = new THREE.Vector3(posX(foco % LARGURA), .4, posZ(Math.floor(foco / LARGURA))).project(camera);
      rotulo.hidden = false; rotulo.textContent = `🔒 ${b.nome} · clique para ver`;
      rotulo.style.left = ((p.x + 1) / 2 * cv.clientWidth) + 'px'; rotulo.style.top = ((1 - p.y) / 2 * cv.clientHeight) + 'px';
      return;
    }
    if (!l || !PREDIOS[l.tipo] || !predios[foco]) { rotulo.hidden = true; return; }
    const p = new THREE.Vector3(predios[foco].position.x, (predios[foco].userData.altura || 1) + .5, predios[foco].position.z).project(camera);
    rotulo.hidden = false;
    rotulo.textContent = `${PREDIOS[l.tipo].icone} ${PREDIOS[l.tipo].nome}`;
    rotulo.style.left = ((p.x + 1) / 2 * cv.clientWidth) + 'px';
    rotulo.style.top = ((1 - p.y) / 2 * cv.clientHeight) + 'px';
  }

  /* ── Câmera, tamanho e seleção ──────────────────────────────────────────── */
  // vista inicial: perto da Prefeitura, no cruzamento das avenidas
  const VISTA = { pos: new THREE.Vector3(4.5, 8.5, 10.5), alvo: new THREE.Vector3(-1.5, 0, -.8) };
  let composer = null, passoSSAO, passoBrilho, passoContorno, passoFinal, graficosAltos = false, escolhaDoUsuario = false;
  const medidor = { quadros: 0, tempo: 0 };
  function montarPosProcessamento() {
    if (!THREE.EffectComposer || !THREE.SSAOPass || !THREE.UnrealBloomPass) return;
    try {
      const flutuante = renderer.capabilities.isWebGL2 && renderer.extensions.has('EXT_color_buffer_float');
      const tipo = flutuante ? THREE.HalfFloatType : THREE.UnsignedByteType; // HDR antes dos tons de cinema
      const tam = renderer.getSize(new THREE.Vector2()), pr = renderer.getPixelRatio();
      composer = new THREE.EffectComposer(renderer, new THREE.WebGLRenderTarget(tam.x * pr, tam.y * pr, { type: tipo }));
      composer.setPixelRatio(pr);
      passoSSAO = new THREE.SSAOPass(scene, camera, tam.x, tam.y);
      passoSSAO.beautyRenderTarget.texture.type = tipo;
      passoSSAO.kernelRadius = .7; passoSSAO.minDistance = .0005; passoSSAO.maxDistance = .06;
      composer.addPass(passoSSAO);
      passoContorno = new THREE.OutlinePass(new THREE.Vector2(tam.x, tam.y), scene, camera);
      Object.assign(passoContorno, { edgeStrength: 4, edgeThickness: 1.4, edgeGlow: .2 });
      passoContorno.visibleEdgeColor.set('#FFD54A'); passoContorno.hiddenEdgeColor.set('#7A5C00');
      composer.addPass(passoContorno);
      passoBrilho = new THREE.UnrealBloomPass(new THREE.Vector2(tam.x, tam.y), .15, .45, .92);
      composer.addPass(passoBrilho);
      // passe final: efeito maquete (desfoque nas bordas de cima e de baixo), cores mais vivas,
      // vinheta suave, tons de cinema (ACES) e conversão sRGB
      passoFinal = new THREE.ShaderPass({
        uniforms: { tDiffuse: { value: null }, resolucao: { value: new THREE.Vector2(tam.x * pr, tam.y * pr) }, forca: { value: 3.2 * pr } },
        vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
        fragmentShader: [
          'uniform sampler2D tDiffuse; uniform vec2 resolucao; uniform float forca; varying vec2 vUv;',
          'void main(){',
          '  float d = smoothstep(.2, .55, abs(vUv.y - .55));',
          '  vec2 px = forca * d / resolucao;',
          '  vec4 c = texture2D(tDiffuse, vUv) * .2;',
          '  for (int k = 0; k < 8; k++) {',
          '    float a = float(k) * .785398;',
          '    vec2 o = vec2(cos(a), sin(a));',
          '    c += texture2D(tDiffuse, vUv + o * px) * .06 + texture2D(tDiffuse, vUv + o * px * 2.2) * .04;',
          '  }',
          '  vec3 cor = c.rgb;',
          '  float l = dot(cor, vec3(.2126, .7152, .0722));',
          '  cor = mix(vec3(l), cor, 1.14);',
          '  vec2 q = vUv - .5; cor *= 1.0 - dot(q, q) * .38;',
          '  gl_FragColor = vec4(cor, 1.0);',
          '#include <tonemapping_fragment>',
          '#include <encodings_fragment>',
          '}'].join('\n'),
      });
      composer.addPass(passoFinal);
      composer.setSize(tam.x, tam.y);
      let pref = null;
      try { pref = localStorage.getItem('cidade-legal-graficos'); } catch (e) { /* ignora */ }
      escolhaDoUsuario = !!pref;
      graficosAltos = pref ? pref === 'altos' : matchMedia('(pointer: fine)').matches && window.innerWidth >= 1000 && !reduzido;
    } catch (e) { composer = null; }
  }
  // Desenha a cena: com efeitos (camada 0) e depois as placas por cima (camada 1)
  function desenhar(luzes = 0, dt = 0) {
    // aparelho lento: se os efeitos derrubarem a fluidez, volta sozinho para os gráficos leves
    if (graficosAltos && !escolhaDoUsuario && dt) {
      medidor.quadros++; medidor.tempo += dt;
      if (medidor.quadros >= 45) {
        if (medidor.tempo / medidor.quadros > .045) { graficosAltos = false; document.getElementById('btn-graficos').classList.remove('ativo'); }
        medidor.quadros = 0; medidor.tempo = 0; escolhaDoUsuario = true; // mede só uma vez
      }
    }
    if (graficosAltos && composer) {
      passoBrilho.strength = .12 + .7 * luzes; passoBrilho.threshold = .92 - .25 * luzes;
      const foco = hover >= 0 ? hover : cursor;
      passoContorno.selectedObjects = foco >= 0 && predios[foco] && !s.selecionado ? [predios[foco].userData.corpo] : [];
      camera.layers.set(0); composer.render();
      camera.layers.set(1); renderer.autoClear = false; renderer.clearDepth(); renderer.render(scene, camera); renderer.autoClear = true;
      camera.layers.enableAll();
    } else { camera.layers.enableAll(); renderer.render(scene, camera); }
  }

  function redimensionar() {
    const W = cv.parentElement.clientWidth;
    if (!W) return;
    const estreito = W < 640;
    const H = cv.parentElement.clientHeight || Math.round(estreito ? Math.min(window.innerHeight * .62, W * 1.15) : Math.min(W * .62, Math.max(380, window.innerHeight * .74)));
    renderer.setSize(W, H, true);
    if (composer) {
      composer.setSize(W, H);
      const pr = renderer.getPixelRatio();
      passoFinal.uniforms.resolucao.value.set(W * pr, H * pr);
    }
    camera.aspect = W / H;
    camera.fov = estreito ? 52 : 40;
    camera.updateProjectionMatrix();
  }
  // Pedestre sob o ponteiro: devolve um número estável para escolher o morador
  function pessoaNoPonto(cx, cy) {
    if (!pronto) return -1;
    const b = cv.getBoundingClientRect();
    const ray = new THREE.Raycaster();
    ray.setFromCamera(new THREE.Vector2(((cx - b.left) / b.width) * 2 - 1, -((cy - b.top) / b.height) * 2 + 1), camera);
    const alvos = pessoas.filter(k => k.obj.visible).map(k => k.obj);
    Object.values(predios).forEach(g => (g.userData.gente || []).forEach(e => { if (e.obj.visible) alvos.push(e.obj); }));
    const hit = ray.intersectObjects(alvos, true).find(h => h.object.userData.alvoPessoa);
    if (!hit) return -1;
    const obj = hit.object.parent;
    const n = pessoas.findIndex(k => k.obj === obj);
    return n >= 0 ? n : 100 + alvos.indexOf(obj);
  }
  function loteNoPonto(cx, cy) {
    if (!pronto) return -1;
    const b = cv.getBoundingClientRect();
    const mouse = new THREE.Vector2(((cx - b.left) / b.width) * 2 - 1, -((cy - b.top) / b.height) * 2 + 1);
    const ray = new THREE.Raycaster(); ray.setFromCamera(mouse, camera);
    const alvos = Object.values(predios);
    const hit = ray.intersectObjects(alvos, true).find(h => !h.object.isSprite);
    if (hit) { let o = hit.object; while (o && o.userData.tile === undefined) o = o.parent; if (o) return o.userData.tile; }
    const chao = ray.intersectObject(plano)[0];
    if (!chao) return -1;
    const c = Math.floor(chao.point.x + LARGURA / 2), r = Math.floor(chao.point.z + ALTURA / 2);
    return r >= 0 && r < ALTURA && c >= 0 && c < LARGURA ? r * LARGURA + c : -1;
  }

  function init(canvas, clique, cliquePessoa) {
    try {
      renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    } catch (e) { return false; }
    cv = canvas; aoClicar = clique; aoClicarPessoa = cliquePessoa;
    reduzido = matchMedia('(prefers-reduced-motion: reduce)').matches;
    // placas: por padrão só aparecem quando importam (caso pendente ou prédio sob o mouse)
    mostrarPlacas = false;
    try { mostrarPlacas = localStorage.getItem('cidade-legal-placas') === 'todas'; } catch (e) { /* ignora */ }
    renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    THREE.ColorManagement.legacyMode = false;          // cores hex em sRGB, luz calculada em espaço linear
    renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1;

    scene = new THREE.Scene();
    scene.fog = new THREE.Fog('#BFE3FA', 28, 75);
    camera = new THREE.PerspectiveCamera(40, 1.6, .1, 200);
    camera.position.copy(VISTA.pos);

    hemi = new THREE.HemisphereLight('#DFF2FF', '#6A8F4E', .65); scene.add(hemi);
    lua = new THREE.DirectionalLight('#9DB7FF', .3); scene.add(lua);
    sol = new THREE.DirectionalLight('#FFF4E0', 1.05);
    sol.position.set(10, 18, 8); sol.castShadow = true;
    const movel = matchMedia('(max-width: 640px)').matches;
    sol.shadow.mapSize.set(movel ? 1024 : 2048, movel ? 1024 : 2048);
    Object.assign(sol.shadow.camera, { left: -14, right: 14, top: 12, bottom: -12, near: 1, far: 50 });
    sol.shadow.bias = -.0006; sol.shadow.normalBias = .04;
    scene.add(sol, sol.target);

    const geoE = new THREE.BufferGeometry(), pos = [];
    for (let k = 0; k < 400; k++) { const a = Math.random() * Math.PI * 2, e = Math.random() * .5 + .08; pos.push(Math.cos(a) * 80 * Math.cos(e), 80 * Math.sin(e), Math.sin(a) * 80 * Math.cos(e)); }
    geoE.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    estrelas = new THREE.Points(geoE, new THREE.PointsMaterial({ color: '#FFFFFF', size: .35, fog: false, transparent: true, depthWrite: false }));
    scene.add(estrelas);
    montarCeu();

    for (let k = 0; k < 6; k++) {
      const n = new THREE.Group();
      for (let j = 0; j < 4; j++) {
        const b = malha(new THREE.IcosahedronGeometry(.32 + Math.random() * .26, 1), new THREE.MeshStandardMaterial({ color: '#FFFFFF', flatShading: true, transparent: true, opacity: .95 }), j * .42 - .6, Math.random() * .18, Math.random() * .35);
        b.receiveShadow = false; n.add(b);
      }
      n.position.set(-LARGURA + k * 7, 7 + (k % 3) * .7, -ALTURA / 2 + (k * 5) % ALTURA);
      n.userData.v = .35 + (k % 3) * .12; nuvens.push(n); scene.add(n);
    }

    destaque = new THREE.Mesh(new THREE.BoxGeometry(.98, .02, .98), new THREE.MeshBasicMaterial({ color: '#FFFFFF', transparent: true, opacity: .35, depthWrite: false }));
    destaque.visible = false; scene.add(destaque);

    rotulo = document.createElement('div');
    rotulo.className = 'rotulo-3d'; rotulo.hidden = true;
    cv.parentElement.appendChild(rotulo);
    relogioEl = document.createElement('div');
    relogioEl.className = 'relogio-mapa'; relogioEl.setAttribute('aria-hidden', 'true');
    cv.parentElement.appendChild(relogioEl);

    controls = new THREE.OrbitControls(camera, cv);
    controls.target.copy(VISTA.alvo);
    controls.enableDamping = true; controls.dampingFactor = .08;
    controls.minDistance = 4; controls.maxDistance = 52;
    controls.maxPolarAngle = 1.32; controls.minPolarAngle = .25;
    controls.screenSpacePanning = false; controls.panSpeed = 1.1; controls.rotateSpeed = .8; controls.zoomSpeed = 1.2;
    // como num mapa: arrastar move a cidade; botão direito (ou dois dedos) gira
    controls.mouseButtons = { LEFT: THREE.MOUSE.PAN, MIDDLE: THREE.MOUSE.DOLLY, RIGHT: THREE.MOUSE.ROTATE };
    controls.touches = { ONE: THREE.TOUCH.PAN, TWO: THREE.TOUCH.DOLLY_ROTATE };
    controls.addEventListener('change', () => {
      controls.target.x = Math.max(-LARGURA / 2 - 4, Math.min(LARGURA / 2 + 4, controls.target.x));
      controls.target.z = Math.max(-ALTURA / 2 - 4, Math.min(ALTURA / 2 + 4, controls.target.z));
      controls.target.y = 0;
    });
    // teclado: W A S D movem, Q E giram (setas continuam escolhendo o lote para quem usa leitor de tela)
    const teclas = new Set();
    addEventListener('keydown', e => {
      if (/^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement && document.activeElement.tagName) || e.ctrlKey || e.metaKey || e.altKey) return;
      const k = e.key.toLowerCase();
      if ('wasdqe'.includes(k) && k.length === 1) { teclas.add(k); voo = null; }
    });
    addEventListener('keyup', e => teclas.delete(e.key.toLowerCase()));
    addEventListener('blur', () => teclas.clear());
    moverPorTeclado = dt => {
      if (!teclas.size) return;
      const dir = camera.position.clone().sub(controls.target);
      const frente = new THREE.Vector3(-dir.x, 0, -dir.z).normalize(), lado = new THREE.Vector3(-frente.z, 0, frente.x);
      const v = new THREE.Vector3(), passo = dt * (4 + dir.length() * .9);
      if (teclas.has('w')) v.add(frente); if (teclas.has('s')) v.sub(frente);
      if (teclas.has('d')) v.add(lado); if (teclas.has('a')) v.sub(lado);
      if (v.lengthSq()) { v.setLength(passo); controls.target.add(v); camera.position.add(v); }
      const giro = (teclas.has('q') ? 1 : 0) - (teclas.has('e') ? 1 : 0);
      if (giro) { dir.applyAxisAngle(new THREE.Vector3(0, 1, 0), giro * dt * 1.4); camera.position.copy(controls.target).add(dir); }
      controls.dispatchEvent({ type: 'change' });
    };

    new ResizeObserver(redimensionar).observe(cv.parentElement);
    redimensionar();
    montarPosProcessamento();

    // clique = apertar e soltar sem arrastar
    let ini = null;
    cv.addEventListener('pointerdown', e => { ini = { x: e.clientX, y: e.clientY, t: performance.now() }; voo = null; });
    cv.addEventListener('pointerup', e => {
      if (!ini || e.button > 0) { ini = null; return; }
      const parado = Math.hypot(e.clientX - ini.x, e.clientY - ini.y) < 7 && performance.now() - ini.t < 600;
      ini = null;
      if (!parado) return;
      const pessoa = aoClicarPessoa && !s.selecionado ? pessoaNoPonto(e.clientX, e.clientY) : -1;
      if (pessoa >= 0) { aoClicarPessoa(pessoa); return; }
      const i = loteNoPonto(e.clientX, e.clientY);
      if (i >= 0) { if (e.pointerType !== 'mouse') hover = i; aoClicar(i); }
    });
    cv.addEventListener('pointermove', e => {
      if (e.pointerType !== 'mouse' || ini) return;
      pessoaSobMouse = s.selecionado ? -1 : pessoaNoPonto(e.clientX, e.clientY);
      hover = pessoaSobMouse >= 0 ? -1 : loteNoPonto(e.clientX, e.clientY);
      cv.style.cursor = pessoaSobMouse >= 0 ? 'pointer' : '';
      if (pessoaSobMouse >= 0) { rotulo.hidden = false; rotulo.textContent = '👤 Clique para conhecer'; rotulo.style.left = (e.clientX - cv.getBoundingClientRect().left) + 'px'; rotulo.style.top = (e.clientY - cv.getBoundingClientRect().top - 12) + 'px'; }
    });
    cv.addEventListener('pointerleave', () => { hover = -1; });
    cv.addEventListener('contextmenu', e => e.preventDefault());

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

    anisoMax = Math.min(8, renderer.capabilities.getMaxAnisotropy());
    pmrem = new THREE.PMREMGenerator(renderer);
    const aviso = document.createElement('div');
    aviso.className = 'carregando-mapa'; aviso.textContent = 'Carregando texturas…';
    cv.parentElement.appendChild(aviso);
    // se as texturas demorarem (conexão ou aparelho lento), a cidade abre mesmo assim com cores lisas
    Promise.race([carregarImagens(), new Promise(ok => setTimeout(ok, 8000))]).then(() => {
      texturasBase();
      montarTerreno();
      montarChuva();
      montarBarcosEPassaros();
      montarFolhas();
      pronto = true;
      setTimeout(gerarMiniaturas, 400);
      aviso.remove();
      atualizar();
      requestAnimationFrame(quadro);
    });
    return true;
  }
  function anunciar() {
    if (cursor < 0) return;
    const l = s.mapa[cursor], r = Math.floor(cursor / LARGURA) + 1, c = cursor % LARGURA + 1;
    const nome = !l ? 'terreno vazio' : PREDIOS[l.tipo] ? PREDIOS[l.tipo].nome : { agua: 'rio', rua: 'rua', ponte: 'ponte' }[l.tipo];
    document.getElementById('anuncio').textContent = `Linha ${r}, coluna ${c}: ${nome}${(s.pendentes || []).some(p => p.tile === cursor) ? ', cidadão esperando' : ''}`;
  }

  return {
    init, atualizar,
    miniatura: tipo => miniaturas[tipo],
    visao(k) { visaoAtiva = k; return desenharVisao(); },
    focar(i, perto, distancia) {
      if (!pronto || i < 0) return;
      const alvo = new THREE.Vector3(posX(i % LARGURA), 0, posZ(Math.floor(i / LARGURA)));
      const dir = camera.position.clone().sub(controls.target);
      const dist = distancia || (perto ? 6.5 : Math.min(Math.max(dir.length(), 7), 11));
      const p1 = alvo.clone().add(dir.setLength(dist));
      if (reduzido) { controls.target.copy(alvo); camera.position.copy(p1); return; }
      voo = { ini: performance.now(), t0: controls.target.clone(), p0: camera.position.clone(), t1: alvo, p1 };
    },
    graficos(alternar) {
      if (!composer) return false;
      if (alternar) { graficosAltos = !graficosAltos; escolhaDoUsuario = true; try { localStorage.setItem('cidade-legal-graficos', graficosAltos ? 'altos' : 'leves'); } catch (e) { /* ignora */ } }
      return graficosAltos;
    },
    passeio() { controls.autoRotate = !controls.autoRotate; controls.autoRotateSpeed = .7; return controls.autoRotate; },
    foto(nome) {
      desenhar();
      const a = document.createElement('a');
      a.href = renderer.domElement.toDataURL('image/png'); a.download = nome || 'cidade.png';
      document.body.appendChild(a); a.click(); a.remove();
    },
    passarTempo() { if (!reduzido) lapso = { ini: performance.now(), de: hora }; },
    definirHora(h) { hora = h; lapso = null; },
    brotar(i) {
      const g = predios[i], l = s.mapa[i];
      const comObra = g && l && PREDIOS[l.tipo] && PREDIOS[l.tipo].cat !== 'enfeite' && !['ruaLocal', 'ponteLocal'].includes(l.tipo);
      if (comObra && !reduzido) {
        if (obras[i]) scene.remove(obras[i]);
        obras[i] = criarObra(); obras[i].position.copy(g.position); scene.add(obras[i]);
        brotando[i] = performance.now() + 1700; // o prédio sobe quando a obra termina
      } else brotando[i] = performance.now();
    },
    zoom(delta) {
      if (delta === 0) { camera.position.copy(VISTA.pos); controls.target.copy(VISTA.alvo); controls.update(); return; }
      const dir = camera.position.clone().sub(controls.target);
      const d = Math.max(controls.minDistance, Math.min(controls.maxDistance, dir.length() * (delta > 0 ? .72 : 1.38)));
      camera.position.copy(controls.target).add(dir.setLength(d));
    },
    alternarPlacas() {
      mostrarPlacas = !mostrarPlacas;
      try { localStorage.setItem('cidade-legal-placas', mostrarPlacas ? 'todas' : 'inteligentes'); } catch (e) { /* ignora */ }
      atualizar(); return mostrarPlacas;
    },
    placas: () => mostrarPlacas,
    posTela(i) {
      const b = cv.getBoundingClientRect(), g = predios[i];
      const p = new THREE.Vector3(posX(i % LARGURA), g ? (g.userData.altura || 1) : .3, posZ(Math.floor(i / LARGURA))).project(camera);
      return { x: b.left + (p.x + 1) / 2 * b.width, y: b.top + (1 - p.y) / 2 * b.height };
    },
  };
})();
