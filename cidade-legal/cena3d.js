/* ══════════════════════════════════════════════════════════════════════════
   CIDADE LEGAL — Cena 3D (Three.js r147, em vendor/)
   Cada lote mede 1×1 unidade. O chão, as ruas e a água usam InstancedMesh;
   cada prédio é um THREE.Group montado com primitivas (caixas, cilindros,
   cones, esferas) e fachadas com janelas desenhadas em canvas, que acendem
   à noite (tema escuro). Mesma interface pública do renderizador isométrico.
══════════════════════════════════════════════════════════════════════════ */

const Cena = (() => {
  let renderer, scene, camera, controls, cv, aoClicar;
  let sol, hemi, estrelas, plano, destaque, rotulo;
  let noite = null, mostrarPlacas = true, reduzido = false;
  const predios = {};      // lote → THREE.Group
  const tiposNoLote = {};  // lote → tipo desenhado (para detectar mudanças)
  const enfeites = {};     // lote → árvore decorativa
  const baloes = {};       // lote → sprite ❗
  const brotando = {};     // lote → instante da construção
  const carros = [], nuvens = [], postes = [];
  let fantasma = null, fantasmaTipo = null, hover = -1, cursor = -1;
  let texAgua;
  const relogio = () => performance.now() / 1000;

  const posX = c => c - LARGURA / 2 + .5;
  const posZ = r => r - ALTURA / 2 + .5;

  /* ── Materiais e texturas (com cache) ───────────────────────────────────── */
  const cacheMat = {};
  function mat(cor, extra = {}) {
    const k = cor + JSON.stringify(extra);
    return cacheMat[k] || (cacheMat[k] = new THREE.MeshStandardMaterial({ color: cor, roughness: .85, metalness: 0, ...extra }));
  }
  const materiaisNoturnos = []; // materiais que acendem à noite

  function canvasTex(w, h, desenhar) {
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    desenhar(c.getContext('2d'), w, h);
    const t = new THREE.CanvasTexture(c);
    t.anisotropy = 4;
    return t;
  }

  // Fachada: parede colorida com grade de janelas; o emissiveMap acende as janelas à noite
  const cacheFachada = {};
  function fachada(cor, cols, linhas, opc = {}) {
    const k = [cor, cols, linhas, opc.vidro, opc.portaVidro].join('|');
    if (cacheFachada[k]) return cacheFachada[k];
    const W = 128, H = 128;
    const janelas = (ctx, acesa) => {
      for (let i = 0; i < cols; i++) for (let j = 0; j < linhas; j++) {
        const x = W * (i + .22) / cols, y = H * (j + .2) / linhas, w = W * .56 / cols, h = H * .5 / linhas;
        if (acesa) { ctx.fillStyle = ((i * 7 + j * 5) % 4) ? '#FFD27A' : '#000'; ctx.fillRect(x, y, w, h); continue; }
        ctx.fillStyle = opc.vidro || '#9FD3F0'; ctx.fillRect(x, y, w, h);
        ctx.fillStyle = 'rgba(255,255,255,.45)'; ctx.fillRect(x, y, w * .35, h);
        ctx.fillStyle = 'rgba(0,0,0,.18)'; ctx.fillRect(x, y + h, w, Math.max(2, h * .08));
      }
    };
    const map = canvasTex(W, H, (ctx) => {
      ctx.fillStyle = cor; ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = 'rgba(0,0,0,.06)'; for (let y = 0; y < H; y += 8) ctx.fillRect(0, y, W, 1);
      janelas(ctx, false);
    });
    const emissiveMap = canvasTex(W, H, (ctx) => { ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H); janelas(ctx, true); });
    const lateral = new THREE.MeshStandardMaterial({ map, emissiveMap, emissive: 0x000000, roughness: .8 });
    materiaisNoturnos.push(lateral);
    const topo = mat(cor);
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
    return malha(geo, mat(cor), 0, y, 0);
  }
  function arvore(tipo = 0, esc = 1) {
    const g = new THREE.Group();
    g.add(cilindro(.03 * esc, .045 * esc, .22 * esc, '#7A5134', 0, 0, 0, 6));
    if (tipo === 1) g.add(malha(new THREE.ConeGeometry(.16 * esc, .46 * esc, 7), mat('#2E7D4F'), 0, .42 * esc, 0));
    else {
      g.add(malha(new THREE.IcosahedronGeometry(.18 * esc, 0), mat('#4FA64C', { flatShading: true }), 0, .34 * esc, 0));
      g.add(malha(new THREE.IcosahedronGeometry(.12 * esc, 0), mat('#66BF5C', { flatShading: true }), .07 * esc, .44 * esc, .04 * esc));
    }
    return g;
  }
  function calcada(g, tam = .94) { g.add(caixa(tam, .03, tam, '#D9D2C3')); }
  function porta(g, d, cor = '#6B4B32', y = .03) { g.add(caixa(.12, .2, .02, cor, 0, y, d / 2 + .005)); }
  function luzPiscante(cor) {
    const m = new THREE.MeshStandardMaterial({ color: cor, emissive: cor, emissiveIntensity: 1 });
    return m;
  }

  /* ── Prédios ────────────────────────────────────────────────────────────── */
  // Cada construtor devolve um Group; userData.tick(t) anima partes; userData.altura posiciona a placa
  const CORES_CASA = ['#F4E1C1', '#CDE7F0', '#F6D6D6', '#E2F0CB', '#FFF1B8'];
  const CORES_TELHA = ['#C9553F', '#3F6FB5', '#8E5A3C', '#5E8C4A'];
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
    casa(g, n) {
      calcada(g, .8);
      const cor = CORES_CASA[n % CORES_CASA.length], telha = CORES_TELHA[n % CORES_TELHA.length];
      g.add(caixa(.1, .32, .1, '#9C6B4E', .14, .42, -.12));
      g.add(caixa(.54, .4, .48, fachada(cor, 2, 1), 0, .03));
      porta(g, .48);
      g.add(duasAguas(.64, .3, .58, telha, .43));
      g.userData.altura = .8;
    },
    aluguel(g) {
      calcada(g);
      g.add(caixa(.66, 1.8, .66, fachada('#8FA7C7', 3, 7), 0, .03));
      g.add(caixa(.7, .06, .7, '#6F86A8', 0, 1.83));
      g.add(cilindro(.09, .09, .18, '#B9C4D2', -.15, 1.89, -.15, 10));
      porta(g, .66, '#40536E');
      g.userData.altura = 2.1;
    },
    mercado(g) {
      calcada(g);
      g.add(caixa(.8, .48, .72, fachada('#F7F1E3', 3, 1, { vidro: '#B8E2F5' }), 0, .03));
      const listras = canvasTex(64, 16, (ctx) => { for (let i = 0; i < 8; i++) { ctx.fillStyle = i % 2 ? '#FFFFFF' : '#E07B2A'; ctx.fillRect(i * 8, 0, 8, 16); } });
      const toldo = caixa(.84, .03, .22, new THREE.MeshStandardMaterial({ map: listras }), 0, .36, .44);
      toldo.rotation.x = .35; g.add(toldo);
      g.add(caixa(.5, .16, .06, '#E07B2A', 0, .51, .2));
      g.userData.altura = .8;
    },
    fabrica(g) {
      calcada(g);
      g.add(caixa(.84, .5, .6, fachada('#B98C6A', 4, 1), 0, .03, .1));
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
      g.add(caixa(.86, .52, .6, fachada('#F2C14E', 4, 2), 0, .03));
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
      g.add(caixa(.96, .04, .96, '#58B04F'));
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
      g.add(caixa(.76, .58, .7, fachada('#2F4E7E', 3, 2), 0, .03));
      g.add(caixa(.78, .07, .72, '#FFFFFF', 0, .46));
      porta(g, .7, '#1B2E4B');
      const r = luzPiscante('#FF3030'), a = luzPiscante('#2F6BFF');
      g.add(caixa(.14, .07, .1, r, -.08, .61)); g.add(caixa(.14, .07, .1, a, .08, .61));
      g.userData.tick = t => { const on = Math.floor(t * 3) % 2; r.emissiveIntensity = on ? 1.6 : .1; a.emissiveIntensity = on ? .1 : 1.6; };
      g.userData.altura = .9;
    },
    forum(g) {
      g.add(caixa(.94, .05, .94, '#C9C6BE')); g.add(caixa(.86, .05, .86, '#D8D5CD', 0, .05));
      g.add(caixa(.62, .6, .5, fachada('#E1DCD0', 3, 2), 0, .1, -.08));
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
      g.add(caixa(.62, .68, .6, fachada('#B5523B', 2, 2, { vidro: '#F4EAD8' }), 0, .03));
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
      g.add(caixa(.72, .9, .72, fachada('#3E7C59', 3, 4), 0, .03));
      porta(g, .72, '#24493A');
      const moeda = cilindro(.14, .14, .03, mat('#F2B705', { metalness: .6, roughness: .3, emissive: '#3A2A00' }), 0, 0, 0, 24);
      moeda.rotation.x = Math.PI / 2; moeda.position.set(0, 1.2, 0); g.add(moeda);
      g.userData.tick = t => { moeda.rotation.z = t * 2; moeda.position.y = 1.2 + Math.sin(t * 2) * .04; };
      g.userData.altura = 1.5;
    },
  };

  /* ── Veículos ───────────────────────────────────────────────────────────── */
  const CORES_CARRO = ['#E53935', '#1E88E5', '#FDD835', '#43A047', '#FB8C00', '#8E24AA', '#ECEFF1'];
  function criarVeiculo(tipo, cor = '#E53935') {
    const g = new THREE.Group();
    const roda = (x, z) => { const r = cilindro(.035, .035, .03, '#222222', x, 0, z, 10); r.rotation.x = Math.PI / 2; r.position.y = .04; g.add(r); };
    if (tipo === 'onibus') {
      g.add(caixa(.62, .22, .2, fachada('#F2B705', 5, 1, { vidro: '#CFE9F7' }), 0, .04));
      [-.2, .2].forEach(x => { roda(x, .1); roda(x, -.1); });
      return g;
    }
    g.add(caixa(.32, .09, .17, tipo === 'policia' ? '#F4F4F4' : cor, 0, .04));
    g.add(caixa(.17, .07, .15, tipo === 'policia' ? '#1E3A8A' : '#CFE8F5', -.02, .13));
    [-.1, .1].forEach(x => { roda(x, .09); roda(x, -.09); });
    if (tipo === 'policia') {
      const sir = luzPiscante('#FF3030'); g.add(caixa(.05, .03, .1, sir, -.02, .2)); g.userData.sirene = sir;
    }
    const farol = new THREE.MeshStandardMaterial({ color: '#FFF6C8', emissive: '#FFF0A0', emissiveIntensity: 0 });
    materiaisNoturnos.push(farol); farol.userData = { farol: true };
    g.add(caixa(.01, .03, .04, farol, .165, .07, .05)); g.add(caixa(.01, .03, .04, farol, .165, .07, -.05));
    return g;
  }
  function sincronizarCarros() {
    const desejado = [];
    const n = 2 + Math.min(8, Math.floor((s.pop || 0) / 20));
    for (let i = 0; i < n; i++) desejado.push('carro');
    if (conta(s, 'terminal')) desejado.push('onibus');
    if (conta(s, 'delegacia')) desejado.push('policia');
    while (carros.length > desejado.length) scene.remove(carros.pop().obj);
    desejado.forEach((tipo, i) => {
      if (carros[i] && carros[i].tipo === tipo) return;
      if (carros[i]) scene.remove(carros[i].obj);
      const horizontal = i % 2 === 0, sentido = i % 4 < 2 ? 1 : -1;
      const obj = criarVeiculo(tipo, CORES_CARRO[i % CORES_CARRO.length]);
      scene.add(obj);
      const lim = horizontal ? LARGURA / 2 : ALTURA / 2;
      carros[i] = { tipo, obj, horizontal, sentido, lim, p: (Math.random() * 2 - 1) * lim, v: (tipo === 'onibus' ? .6 : .9 + Math.random() * .6) };
    });
  }
  function moverCarros(dt) {
    carros.forEach(k => {
      if (!reduzido) k.p += k.v * k.sentido * dt;
      if (k.p > k.lim + .5) k.p = -k.lim - .5;
      if (k.p < -k.lim - .5) k.p = k.lim + .5;
      const faixa = .2 * k.sentido;
      if (k.horizontal) { k.obj.position.set(k.p, 0, posZ(LINHA_RUA) + faixa); k.obj.rotation.y = k.sentido > 0 ? 0 : Math.PI; }
      else { k.obj.position.set(posX(COLUNA_RUA) - faixa, 0, k.p); k.obj.rotation.y = k.sentido > 0 ? -Math.PI / 2 : Math.PI / 2; }
      k.obj.visible = Math.abs(k.p) < k.lim - .1;
      if (k.obj.userData.sirene) k.obj.userData.sirene.emissiveIntensity = Math.floor(relogio() * 4) % 2 ? 1.6 : .1;
    });
  }

  /* ── Terreno ────────────────────────────────────────────────────────────── */
  function montarTerreno() {
    // ilha: terra + borda de grama
    scene.add(caixa(LARGURA + .3, 1.2, ALTURA + .3, '#8A5A3B', 0, -1.32));
    scene.add(caixa(LARGURA + .3, .12, ALTURA + .3, '#5FA348', 0, -.2));
    const matriz = new THREE.Object3D();
    const lotes = { grama: [], agua: [], rua: [], ponte: [] };
    s.mapa.forEach((l, i) => lotes[l && lotes[l.tipo] ? l.tipo : 'grama'].push(i));

    // grama
    const grama = new THREE.InstancedMesh(new THREE.BoxGeometry(1, .1, 1), mat('#FFFFFF'), lotes.grama.length + lotes.agua.length);
    grama.receiveShadow = true;
    const c1 = new THREE.Color('#8FD16F'), c2 = new THREE.Color('#84C765');
    lotes.grama.concat(lotes.agua).forEach((i, n) => {
      const r = Math.floor(i / LARGURA), c = i % LARGURA;
      const agua = s.mapa[i] && s.mapa[i].tipo === 'agua';
      matriz.position.set(posX(c), agua ? -.2 : -.05, posZ(r)); matriz.updateMatrix();
      grama.setMatrixAt(n, matriz.matrix);
      grama.setColorAt(n, agua ? new THREE.Color('#C9B48A') : ((r + c) % 2 ? c1 : c2));
    });
    scene.add(grama);

    // água com textura de ondinhas que desliza
    texAgua = canvasTex(64, 64, (ctx) => {
      ctx.fillStyle = '#3FA7DE'; ctx.fillRect(0, 0, 64, 64);
      ctx.strokeStyle = 'rgba(255,255,255,.5)'; ctx.lineWidth = 2;
      [[8, 14], [36, 30], [14, 48]].forEach(([x, y]) => { ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x + 7, y - 4, x + 14, y); ctx.stroke(); });
    });
    texAgua.wrapS = texAgua.wrapT = THREE.RepeatWrapping;
    const agua = new THREE.InstancedMesh(new THREE.BoxGeometry(1, .08, 1),
      new THREE.MeshStandardMaterial({ map: texAgua, transparent: true, opacity: .9, roughness: .2, metalness: .1 }), lotes.agua.length + lotes.ponte.length);
    agua.receiveShadow = true;
    lotes.agua.concat(lotes.ponte).forEach((i, n) => {
      matriz.position.set(posX(i % LARGURA), -.1, posZ(Math.floor(i / LARGURA))); matriz.updateMatrix(); agua.setMatrixAt(n, matriz.matrix);
    });
    scene.add(agua);

    // ruas: faixa central tracejada, girada nos trechos verticais; cruzamento com faixa de pedestres
    const texRua = canvasTex(64, 64, (ctx) => {
      ctx.fillStyle = '#C9CDD3'; ctx.fillRect(0, 0, 64, 64);
      ctx.fillStyle = '#4E5663'; ctx.fillRect(0, 7, 64, 50);
      ctx.fillStyle = '#F4F4F4'; ctx.fillRect(8, 30, 22, 4); ctx.fillRect(40, 30, 22, 4);
    });
    const texCruz = canvasTex(64, 64, (ctx) => {
      ctx.fillStyle = '#4E5663'; ctx.fillRect(0, 0, 64, 64);
      ctx.fillStyle = '#F4F4F4'; for (let k = 0; k < 6; k++) { ctx.fillRect(10 + k * 8, 2, 4, 8); ctx.fillRect(10 + k * 8, 54, 4, 8); ctx.fillRect(2, 10 + k * 8, 8, 4); ctx.fillRect(54, 10 + k * 8, 8, 4); }
    });
    const ruas = lotes.rua.filter(i => !(Math.floor(i / LARGURA) === LINHA_RUA && i % LARGURA === COLUNA_RUA));
    const rua = new THREE.InstancedMesh(new THREE.BoxGeometry(1, .1, 1), new THREE.MeshStandardMaterial({ map: texRua, roughness: .9 }), ruas.length);
    rua.receiveShadow = true;
    ruas.forEach((i, n) => {
      const r = Math.floor(i / LARGURA);
      matriz.position.set(posX(i % LARGURA), -.05, posZ(r)); matriz.rotation.set(0, r === LINHA_RUA ? 0 : Math.PI / 2, 0); matriz.updateMatrix();
      rua.setMatrixAt(n, matriz.matrix);
    });
    scene.add(rua);
    const cruz = caixa(1, .1, 1, new THREE.MeshStandardMaterial({ map: texCruz }), posX(COLUNA_RUA), -.1, posZ(LINHA_RUA));
    cruz.castShadow = false; scene.add(cruz);

    // pontes de madeira com guarda-corpo
    lotes.ponte.forEach(i => {
      const r = Math.floor(i / LARGURA), c = i % LARGURA, g = new THREE.Group();
      const horizontal = r === LINHA_RUA;
      g.add(caixa(1, .08, .8, '#A0774F', 0, -.04));
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
    for (let c = 1; c < LARGURA; c += 3) if (c !== COLUNA_RUA && !(s.mapa[LINHA_RUA * LARGURA + c].tipo === 'ponte')) poste(posX(c), posZ(LINHA_RUA) - .46);
    for (let r = 1; r < ALTURA; r += 3) if (r !== LINHA_RUA) poste(posX(COLUNA_RUA) + .46, posZ(r));

    // plano invisível para descobrir o lote clicado
    plano = new THREE.Mesh(new THREE.PlaneGeometry(LARGURA, ALTURA), new THREE.MeshBasicMaterial({ visible: false }));
    plano.rotation.x = -Math.PI / 2; scene.add(plano);
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
      cacheSprite[k] = new THREE.SpriteMaterial({ map: tex, depthTest: false });
    }
    const sp = new THREE.Sprite(cacheSprite[k]);
    sp.renderOrder = 10;
    return sp;
  }

  /* ── Sincronização com o estado do jogo ─────────────────────────────────── */
  function criarPredio(tipo, i) {
    const g = new THREE.Group();
    MODELOS[tipo](g, i * 7 + Math.floor(i / LARGURA));
    g.position.set(posX(i % LARGURA), 0, posZ(Math.floor(i / LARGURA)));
    g.rotation.y = (i * 13 % 4) * Math.PI / 2 * (tipo === 'casa' ? 1 : 0); // casas viradas para lados diferentes
    g.userData.tile = i;
    const placa = spriteEmoji(PREDIOS[tipo].icone);
    placa.scale.set(.34, .34, 1); placa.position.y = (g.userData.altura || 1) + .22;
    placa.visible = mostrarPlacas; g.userData.placa = placa;
    g.add(placa);
    return g;
  }

  function atualizar() {
    if (!scene) return;
    s.mapa.forEach((l, i) => {
      const tipo = l && MODELOS[l.tipo] ? l.tipo : null;
      if (tiposNoLote[i] === tipo) return;
      if (predios[i]) { scene.remove(predios[i]); delete predios[i]; }
      if (tipo) {
        predios[i] = criarPredio(tipo, i); scene.add(predios[i]);
        if (enfeites[i]) { scene.remove(enfeites[i]); delete enfeites[i]; }
      }
      tiposNoLote[i] = tipo;
    });
    // árvores decorativas em terrenos vazios (só na montagem inicial do lote vazio)
    s.mapa.forEach((l, i) => {
      if (l || enfeites[i] !== undefined) return;
      const h = (i * 37 + 11) % 11;
      if (h < 3) {
        const a = arvore(h % 2, .8 + (i % 3) * .12);
        a.position.set(posX(i % LARGURA) + ((i * 7) % 5 - 2) * .08, 0, posZ(Math.floor(i / LARGURA)) + ((i * 3) % 5 - 2) * .08);
        scene.add(a); enfeites[i] = a;
      } else enfeites[i] = null;
    });
    // balões ❗ dos cidadãos
    const pend = new Set((s.pendentes || []).map(p => p.tile));
    Object.keys(baloes).forEach(i => { if (!pend.has(+i) || !predios[i]) { scene.remove(baloes[i]); delete baloes[i]; } });
    pend.forEach(i => {
      if (baloes[i] || !predios[i]) return;
      const b = spriteEmoji('❗', '#FFFFFF', '#E53935');
      b.scale.set(.5, .5, 1); b.userData.base = (predios[i].userData.altura || 1) + .55;
      b.position.set(predios[i].position.x, b.userData.base, predios[i].position.z);
      scene.add(b); baloes[i] = b;
    });
    Object.values(predios).forEach(g => { if (g.userData.placa) g.userData.placa.visible = mostrarPlacas && !pend.has(g.userData.tile); });
  }

  function atualizarFantasma() {
    const livre = hover >= 0 && !s.mapa[hover];
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
        fantasma.userData.placa.visible = false;
        scene.add(fantasma);
      }
    }
    if (fantasma) fantasma.position.set(posX(hover % LARGURA), 0, posZ(Math.floor(hover / LARGURA)));
    const foco = hover >= 0 ? hover : cursor;
    destaque.visible = foco >= 0;
    if (foco >= 0) {
      destaque.position.set(posX(foco % LARGURA), .02, posZ(Math.floor(foco / LARGURA)));
      const l = s.mapa[foco];
      destaque.material.color.set(s.selecionado ? (!l ? (beiraRua(foco) ? '#F2B705' : '#FFFFFF') : '#E53935') : '#FFFFFF');
      destaque.material.opacity = s.selecionado ? .55 : .35;
    }
  }

  /* ── Dia e noite ────────────────────────────────────────────────────────── */
  function aplicarPeriodo(ehNoite) {
    noite = ehNoite;
    const ceu = new THREE.Color(ehNoite ? '#0B1730' : '#9BD3F5');
    scene.background = ceu; scene.fog.color = ceu;
    sol.intensity = ehNoite ? .28 : 1.05; sol.color.set(ehNoite ? '#9DB7FF' : '#FFF4E0');
    hemi.intensity = ehNoite ? .25 : .65;
    hemi.color.set(ehNoite ? '#5A6E9A' : '#DFF2FF'); hemi.groundColor.set(ehNoite ? '#1A2233' : '#6A8F4E');
    estrelas.visible = ehNoite;
    materiaisNoturnos.forEach(m => {
      if (m.userData.farol) m.emissiveIntensity = ehNoite ? 1.4 : 0;
      else { m.emissive.set(ehNoite ? '#FFFFFF' : '#000000'); m.emissiveIntensity = ehNoite ? .9 : 0; }
    });
    nuvens.forEach(n => n.children.forEach(b => { b.material.color.set(ehNoite ? '#3A4763' : '#FFFFFF'); b.material.opacity = ehNoite ? .35 : .95; b.castShadow = !ehNoite; }));
  }

  /* ── Laço de animação ───────────────────────────────────────────────────── */
  let ultimo = performance.now();
  function quadro(agora) {
    requestAnimationFrame(quadro);
    const dt = Math.min(.05, (agora - ultimo) / 1000); ultimo = agora;
    const t = relogio();
    const ehNoite = document.documentElement.dataset.theme
      ? document.documentElement.dataset.theme === 'dark'
      : matchMedia('(prefers-color-scheme: dark)').matches;
    if (ehNoite !== noite) aplicarPeriodo(ehNoite);

    sincronizarCarros(); moverCarros(dt);
    if (!reduzido) {
      texAgua.offset.set(t * .05, t * .03);
      nuvens.forEach(n => { n.position.x += n.userData.v * dt; if (n.position.x > LARGURA) n.position.x = -LARGURA; });
    }
    Object.entries(predios).forEach(([i, g]) => {
      if (brotando[i]) {
        const x = Math.min(1, (agora - brotando[i]) / 600);
        const k = x >= 1 ? 1 : 1 + 2.2 * Math.pow(x - 1, 3) + 1.2 * Math.pow(x - 1, 2); // easeOutBack
        g.scale.set(1, Math.max(.02, k), 1);
        if (x >= 1) { delete brotando[i]; g.scale.set(1, 1, 1); }
      }
      if (g.userData.tick && !reduzido) g.userData.tick(t);
    });
    Object.values(baloes).forEach(b => { b.position.y = b.userData.base + (reduzido ? 0 : Math.abs(Math.sin(t * 4)) * .18); });
    atualizarFantasma();
    controls.update();
    renderer.render(scene, camera);
    atualizarRotulo();
  }

  function atualizarRotulo() {
    const foco = hover >= 0 ? hover : cursor;
    const l = foco >= 0 && s.mapa[foco];
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
  function redimensionar() {
    const W = cv.parentElement.clientWidth;
    if (!W) return;
    const estreito = W < 640;
    const H = Math.round(estreito ? Math.min(window.innerHeight * .62, W * 1.15) : Math.min(W * .62, Math.max(380, window.innerHeight * .74)));
    renderer.setSize(W, H, true);
    camera.aspect = W / H;
    camera.fov = estreito ? 52 : 40;
    camera.updateProjectionMatrix();
  }
  function loteNoPonto(cx, cy) {
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

  function init(canvas, clique) {
    try {
      renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    } catch (e) { return false; }
    cv = canvas; aoClicar = clique;
    reduzido = matchMedia('(prefers-reduced-motion: reduce)').matches;
    try { mostrarPlacas = localStorage.getItem('cidade-legal-placas') !== '0'; } catch (e) { /* ignora */ }
    renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    scene = new THREE.Scene();
    scene.fog = new THREE.Fog('#9BD3F5', 30, 70);
    camera = new THREE.PerspectiveCamera(40, 1.6, .1, 200);
    camera.position.copy(VISTA.pos);

    hemi = new THREE.HemisphereLight('#DFF2FF', '#6A8F4E', .65); scene.add(hemi);
    sol = new THREE.DirectionalLight('#FFF4E0', 1.05);
    sol.position.set(10, 18, 8); sol.castShadow = true;
    const movel = matchMedia('(max-width: 640px)').matches;
    sol.shadow.mapSize.set(movel ? 1024 : 2048, movel ? 1024 : 2048);
    Object.assign(sol.shadow.camera, { left: -14, right: 14, top: 12, bottom: -12, near: 1, far: 50 });
    sol.shadow.bias = -.0008; sol.shadow.normalBias = .02;
    scene.add(sol);

    const geoE = new THREE.BufferGeometry(), pos = [];
    for (let k = 0; k < 400; k++) { const a = Math.random() * Math.PI * 2, e = Math.random() * .5 + .08; pos.push(Math.cos(a) * 80 * Math.cos(e), 80 * Math.sin(e), Math.sin(a) * 80 * Math.cos(e)); }
    geoE.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    estrelas = new THREE.Points(geoE, new THREE.PointsMaterial({ color: '#FFFFFF', size: .35, fog: false }));
    scene.add(estrelas);

    for (let k = 0; k < 6; k++) {
      const n = new THREE.Group();
      for (let j = 0; j < 4; j++) {
        const b = malha(new THREE.IcosahedronGeometry(.32 + Math.random() * .26, 1), new THREE.MeshStandardMaterial({ color: '#FFFFFF', flatShading: true, transparent: true, opacity: .95 }), j * .42 - .6, Math.random() * .18, Math.random() * .35);
        b.receiveShadow = false; n.add(b);
      }
      n.position.set(-LARGURA + k * 7, 7 + (k % 3) * .7, -ALTURA / 2 + (k * 5) % ALTURA);
      n.userData.v = .35 + (k % 3) * .12; nuvens.push(n); scene.add(n);
    }

    montarTerreno();
    destaque = new THREE.Mesh(new THREE.BoxGeometry(.98, .02, .98), new THREE.MeshBasicMaterial({ color: '#FFFFFF', transparent: true, opacity: .35, depthWrite: false }));
    destaque.visible = false; scene.add(destaque);

    rotulo = document.createElement('div');
    rotulo.className = 'rotulo-3d'; rotulo.hidden = true;
    cv.parentElement.appendChild(rotulo);

    controls = new THREE.OrbitControls(camera, cv);
    controls.target.copy(VISTA.alvo);
    controls.enableDamping = true; controls.dampingFactor = .08;
    controls.minDistance = 4; controls.maxDistance = 34;
    controls.maxPolarAngle = 1.32; controls.minPolarAngle = .25;
    controls.screenSpacePanning = false;
    controls.touches = { ONE: THREE.TOUCH.ROTATE, TWO: THREE.TOUCH.DOLLY_PAN };
    controls.addEventListener('change', () => {
      controls.target.x = Math.max(-LARGURA / 2, Math.min(LARGURA / 2, controls.target.x));
      controls.target.z = Math.max(-ALTURA / 2, Math.min(ALTURA / 2, controls.target.z));
      controls.target.y = 0;
    });

    new ResizeObserver(redimensionar).observe(cv.parentElement);
    redimensionar();

    // clique = apertar e soltar sem arrastar
    let ini = null;
    cv.addEventListener('pointerdown', e => { ini = { x: e.clientX, y: e.clientY, t: performance.now() }; });
    cv.addEventListener('pointerup', e => {
      if (!ini || e.button > 0) { ini = null; return; }
      const parado = Math.hypot(e.clientX - ini.x, e.clientY - ini.y) < 7 && performance.now() - ini.t < 600;
      ini = null;
      if (!parado) return;
      const i = loteNoPonto(e.clientX, e.clientY);
      if (i >= 0) { if (e.pointerType !== 'mouse') hover = i; aoClicar(i); }
    });
    cv.addEventListener('pointermove', e => { if (e.pointerType === 'mouse' && !ini) hover = loteNoPonto(e.clientX, e.clientY); });
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

    atualizar();
    requestAnimationFrame(quadro);
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
    brotar(i) { brotando[i] = performance.now(); },
    zoom(delta) {
      if (delta === 0) { camera.position.copy(VISTA.pos); controls.target.copy(VISTA.alvo); controls.update(); return; }
      const dir = camera.position.clone().sub(controls.target);
      const d = Math.max(controls.minDistance, Math.min(controls.maxDistance, dir.length() * (delta > 0 ? .72 : 1.38)));
      camera.position.copy(controls.target).add(dir.setLength(d));
    },
    alternarPlacas() {
      mostrarPlacas = !mostrarPlacas;
      try { localStorage.setItem('cidade-legal-placas', mostrarPlacas ? '1' : '0'); } catch (e) { /* ignora */ }
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
