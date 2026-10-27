/* ══════════════════════════════════════════════════════════════════════════
   CIDADE LEGAL — Motor do jogo
   Ciclo: estudar a aula → passar na licença → construir → avançar o mês →
   atender os cidadãos (balões ❗ no mapa) → ganhar conhecimento → novas áreas.
══════════════════════════════════════════════════════════════════════════ */

const LARGURA = 20, ALTURA = 14;
const CHAVE_SAVE = 'cidade-legal-v3';
const LINHA_RUA = 6, COLUNA_RUA = 8;   // avenidas horizontal e vertical
const CURSO_RIO = [15, 15, 14, 14, 14, 15, 15, 16, 16, 15, 15, 14, 14, 14]; // coluna do rio em cada linha
// córrego do Jardim Sul (deságua no rio) e lagoa natural do Bairro Oeste: [linha, coluna]
const CORREGO = [[13, 1], [13, 2], [12, 2], [12, 3], [12, 4], [11, 4], [11, 5], [11, 6], [11, 7], [11, 8], [11, 9], [12, 9], [12, 10], [12, 11], [13, 11], [13, 12], [13, 13]];
const LAGOA = [[8, 0], [8, 1], [9, 0], [9, 1], [7, 0]];
const SERVICOS = { educacao: '🏫 Educação', saude: '🏥 Saúde', seguranca: '🚓 Segurança', lazer: '🌳 Lazer', justica: '⚖️ Justiça',
  agua: '💧 Água', esgoto: '🚽 Esgoto', energia: '⚡ Energia' };
// água, esgoto e energia passam a fazer falta quando a cidade cresce; cada unidade atende mais gente
const INFRA_BASICA = { agua: 150, esgoto: 150, energia: 140 };
const MAX_PENDENTES = 3, PRAZO_CASO = 2;

let s;               // estado do jogo
let ultimoConstruido = null;
let categoriaAtual = 'todos';
let Mapa;           // Cena (3D) ou Iso (2.5D, se o navegador não tiver WebGL)

// Córrego e lagoa: só ocupam lotes vazios (jogos salvos antigos ganham as águas onde não há prédio)
function adicionarAguas(mapa) {
  CORREGO.concat(LAGOA).forEach(([r, c]) => {
    const i = r * LARGURA + c, l = mapa[i];
    if (!l) mapa[i] = { tipo: 'agua' };
    else if (l.tipo === 'rua') mapa[i] = { tipo: 'ponte' };
  });
}

function novoEstado(nome) {
  const mapa = Array(LARGURA * ALTURA).fill(null);
  for (let c = 0; c < LARGURA; c++) mapa[LINHA_RUA * LARGURA + c] = { tipo: 'rua' };
  for (let r = 0; r < ALTURA; r++) mapa[r * LARGURA + COLUNA_RUA] = { tipo: 'rua' };
  const rio = (r, c) => { const i = r * LARGURA + c; mapa[i] = { tipo: mapa[i] ? 'ponte' : 'agua' }; };
  CURSO_RIO.forEach((c, r) => { rio(r, c); if (r && CURSO_RIO[r - 1] !== c) rio(r, CURSO_RIO[r - 1]); });
  mapa[(LINHA_RUA - 1) * LARGURA + COLUNA_RUA - 1] = { tipo: 'prefeitura' };
  adicionarAguas(mapa);
  return {
    nome: nome || 'Cidade Legal', dinheiro: 600, xp: 0, mes: 1, reputacao: 0,
    pop: 0, felicidade: 50, mapa, licencas: { prefeitura: true },
    casosVistos: [], casosResolvidos: 0, acertos: 0, aprendidos: [],
    pendentes: [], sequencia: 0, melhorSequencia: 0,
    missoesFeitas: {}, diario: [], selecionado: null, som: true,
    bairros: { centro: true }, aguasV2: true,
  };
}

/* ── Persistência ─────────────────────────────────────────────────────────── */
function salvar() {
  try { localStorage.setItem(CHAVE_SAVE, JSON.stringify(s)); } catch (e) { /* sem storage: segue sem salvar */ }
}
function carregar() {
  try { const t = localStorage.getItem(CHAVE_SAVE); return t ? JSON.parse(t) : null; } catch (e) { return null; }
}

/* ── Utilidades ───────────────────────────────────────────────────────────── */
const $ = id => document.getElementById(id);
const fmt = n => Math.round(n).toLocaleString('pt-BR');
const embaralhar = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const esc = t => String(t).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const linha = i => Math.floor(i / LARGURA);
const ehRua = i => s.mapa[i] && ['rua', 'ponte', 'ruaLocal', 'ponteLocal'].includes(s.mapa[i].tipo);
const beiraRua = i => {
  const r = linha(i), c = i % LARGURA;
  return (r > 0 && ehRua(i - LARGURA)) || (r < ALTURA - 1 && ehRua(i + LARGURA)) ||
    (c > 0 && ehRua(i - 1)) || (c < LARGURA - 1 && ehRua(i + 1));
};
const liberado = i => !!s.bairros[bairroDe(i).id];
const nomeMes = (m, curto) => { const n = MESES[(m - 1) % 12]; return curto ? n.slice(0, 3) : n; };
const anoDe = m => Math.floor((m - 1) / 12) + 1;
const rostoFelicidade = f => f >= 80 ? '😄' : f >= 60 ? '🙂' : f >= 40 ? '😐' : f >= 20 ? '😟' : '😡';

function nivelAtual() {
  let n = 0;
  NIVEIS.forEach((v, i) => { if (s.xp >= v.xp) n = i; });
  return n;
}

function registrar(texto) {
  s.diario.unshift({ mes: s.mes, texto });
  s.diario = s.diario.slice(0, 30);
}

function toast(texto, grande) {
  const t = $('toast');
  t.textContent = texto;
  t.className = 'toast' + (grande ? ' grande' : '');
  clearTimeout(toast._t);
  toast._t = setTimeout(() => t.classList.add('oculto'), grande ? 3400 : 2600);
}

/* ── Efeitos: som, confete, números flutuantes ────────────────────────────── */
let audio;
function som(tipo) {
  if (!s || !s.som) return;
  try {
    audio = audio || new (window.AudioContext || window.webkitAudioContext)();
    const notas = {
      moeda: [[988, .05], [1319, .12]], certo: [[523, .08], [659, .08], [784, .16]],
      erro: [[330, .12], [247, .22]], construir: [[196, .06], [262, .1]],
      nivel: [[523, .1], [659, .1], [784, .1], [1047, .3]], clique: [[660, .04]],
      alerta: [[880, .07], [880, .07]],
    }[tipo] || [];
    let t = audio.currentTime;
    notas.forEach(([f, d]) => {
      const o = audio.createOscillator(), g = audio.createGain();
      o.type = tipo === 'erro' ? 'sawtooth' : 'triangle';
      o.frequency.value = f;
      g.gain.setValueAtTime(.12, t); g.gain.exponentialRampToValueAtTime(.001, t + d);
      o.connect(g).connect(audio.destination); o.start(t); o.stop(t + d);
      t += d * .9;
    });
  } catch (e) { /* navegador sem áudio */ }
}

function confete(qtd = 70) {
  const cores = ['#F2B705', '#E07B2A', '#3A80F0', '#0FA86A', '#C24B28', '#7B40E8', '#FF6FAE'];
  const camada = document.createElement('div');
  camada.className = 'confete';
  for (let k = 0; k < qtd; k++) {
    const p = document.createElement('i');
    p.style.left = Math.random() * 100 + 'vw';
    p.style.background = cores[k % cores.length];
    p.style.setProperty('--dx', (Math.random() * 200 - 100) + 'px');
    p.style.setProperty('--rot', (Math.random() * 900) + 'deg');
    p.style.animationDelay = (Math.random() * .4) + 's';
    p.style.animationDuration = (1.6 + Math.random() * 1.2) + 's';
    camada.appendChild(p);
  }
  document.body.appendChild(camada);
  setTimeout(() => camada.remove(), 3400);
}

function flutuar(i, texto, classe) {
  const pos = Mapa.posTela(i);
  const f = document.createElement('span');
  f.className = 'flutuante ' + (classe || '');
  f.textContent = texto;
  f.style.left = pos.x + 'px';
  f.style.top = pos.y + 'px';
  document.body.appendChild(f);
  setTimeout(() => f.remove(), 1500);
}

function animarNumero(el, valor, sufixo = '') {
  const de = +(el.dataset.v || 0);
  el.dataset.v = valor;
  if (de === valor) { el.textContent = fmt(valor) + sufixo; return; }
  el.parentElement.classList.remove('pulso'); void el.offsetWidth; el.parentElement.classList.add('pulso');
  const t0 = performance.now(), dur = 600;
  const passo = t => {
    const k = Math.min(1, (t - t0) / dur);
    el.textContent = fmt(de + (valor - de) * (1 - Math.pow(1 - k, 3))) + sufixo;
    if (k < 1) requestAnimationFrame(passo);
  };
  requestAnimationFrame(passo);
}

function ganharXp(qtd) {
  const antes = nivelAtual();
  s.xp += qtd;
  const depois = nivelAtual();
  if (depois > antes) {
    registrar(`🎓 Você agora é <b>${NIVEIS[depois].titulo}</b>! Novas áreas do Direito podem ter sido liberadas.`);
    setTimeout(() => { toast(`🎓 Novo título: ${NIVEIS[depois].titulo}!`, true); confete(110); som('nivel'); }, 300);
  }
}

/* ── Economia e indicadores ───────────────────────────────────────────────── */
// Prédios podem ser ampliados até o nível 3: cada nível soma 50% aos efeitos e 30% à manutenção
const MAX_NIVEL = 3;
const multNivel = l => 1 + .5 * (((l && l.nivel) || 1) - 1);
const multManut = l => 1 + .3 * (((l && l.nivel) || 1) - 1);
const ampliavel = tipo => PREDIOS[tipo] && PREDIOS[tipo].cat !== 'enfeite' && !['prefeitura', 'ruaLocal', 'ponteLocal', 'iluminacao'].includes(tipo);
const custoAmpliar = l => Math.round(PREDIOS[l.tipo].custo * .8 * (l.nivel || 1));

function rendaDoLote(i) {
  const p = PREDIOS[s.mapa[i].tipo];
  let r = p.efeito.renda * multNivel(s.mapa[i]) * (beiraRua(i) ? 1.2 : 1) * (1 + (s.bonusRenda || 0));
  if (conta(s, 'fazenda')) r *= 1.2;
  r *= fatorImposto(s.mapa[i].tipo);
  return r * (0.6 + s.felicidade / 125); // cidadãos felizes pagam em dia
}

function calcular() {
  let manut = 0, popCap = 0, felBonus = 0, felEnfeites = 0;
  const servicos = {};
  s.mapa.forEach(t => {
    if (!t || !PREDIOS[t.tipo]) return;
    const p = PREDIOS[t.tipo];
    const m = multNivel(t);
    manut += p.efeito.manutencao * multManut(t); popCap += p.efeito.pop * m;
    if (p.cat === 'enfeite') felEnfeites += p.efeito.felicidade; else felBonus += p.efeito.felicidade * m;
    if (p.servico) servicos[p.servico] = (servicos[p.servico] || 0) + m; // nível maior atende mais gente
  });
  // Serviços públicos insuficientes reduzem a felicidade (cada unidade atende ~60 pessoas)
  const faltas = [];
  for (const k in SERVICOS) {
    const basica = INFRA_BASICA[k];
    if (basica ? popCap > 60 && (servicos[k] || 0) * basica < popCap : popCap > 30 && (servicos[k] || 0) * 60 < popCap) faltas.push(k);
  }
  felBonus += Math.min(12, felEnfeites); // enfeites ajudam, mas até um limite
  felBonus += humorImpostos();           // imposto alto irrita, baixo agrada
  const fel = Math.round(Math.max(0, Math.min(100, 45 + felBonus + s.reputacao - faltas.length * 6)));
  const pop = Math.round(popCap * Math.min(1, 0.55 + fel / 100));
  s.felicidade = fel; s.pop = pop;
  let renda = 0;
  s.mapa.forEach((t, i) => { if (t && PREDIOS[t.tipo] && PREDIOS[t.tipo].efeito.renda) renda += rendaDoLote(i); });
  return { renda: Math.round(renda), manut: Math.round(manut), pop, fel, faltas };
}

/* ── Renderização ─────────────────────────────────────────────────────────── */
function render() {
  const c = calcular();
  $('nome-cidade').textContent = s.nome;
  $('mes').textContent = `${nomeMes(s.mes)} · Ano ${anoDe(s.mes)}`;
  $('titulo').textContent = NIVEIS[nivelAtual()].titulo;
  animarNumero($('s-din'), s.dinheiro);
  $('s-din').parentElement.classList.toggle('negativo', s.dinheiro < 0);
  animarNumero($('s-pop'), s.pop);
  animarNumero($('s-fel'), s.felicidade, '%');
  $('rosto').textContent = rostoFelicidade(s.felicidade);
  animarNumero($('s-xp'), s.xp);
  const seq = $('s-seq');
  seq.classList.toggle('oculto', s.sequencia < 2);
  seq.querySelector('b').textContent = s.sequencia;
  $('btn-som').innerHTML = `<svg class="ico"><use href="#i-${s.som ? 'som' : 'mudo'}"/></svg>`;
  const nl = s.vozNaoLidas || 0;
  $('badge-celular').textContent = nl; $('badge-celular').classList.toggle('oculto', !nl);

  const n = nivelAtual(), prox = NIVEIS[n + 1];
  $('barra-xp').style.width = prox ? ((s.xp - NIVEIS[n].xp) / (prox.xp - NIVEIS[n].xp) * 100) + '%' : '100%';
  $('barra-xp-txt').textContent = prox ? `${fmt(prox.xp - s.xp)} XP para ${prox.titulo}` : 'Título máximo alcançado!';

  renderMapa();
  renderConstruir(c);
  renderBairros();
  renderMissoes();
  renderVade();
  renderDiario();
  renderDica(c);
  salvar();
}

function renderDica(c) {
  let h;
  if (s.selecionado) {
    const p = PREDIOS[s.selecionado];
    h = `Construindo <b>${p.icone} ${p.nome}</b> — clique num terreno vazio.${p.efeito.renda ? ' Ao lado da rua rende <b>+20%</b>!' : ''} <button class="link" id="cancelar-sel">Cancelar</button>`;
  } else if (s.pendentes.length) {
    const p = PREDIOS[s.mapa[s.pendentes[0].tile].tipo];
    h = `❗ <b>${s.pendentes.length} cidadão(s)</b> esperando atendimento — clique no balão sobre ${p.icone} ${p.nome}.`;
  } else if (c.faltas.length) {
    h = `⚠️ Faltam serviços públicos: ${c.faltas.map(k => SERVICOS[k]).join(', ')}.`;
  } else {
    h = 'Escolha um prédio no painel e clique num terreno vazio. Depois, avance o mês!';
  }
  $('dica').innerHTML = h;
  const cs = $('cancelar-sel');
  if (cs) cs.onclick = () => { s.selecionado = null; render(); };
}

function renderMapa() {
  Mapa.atualizar();
  if (ultimoConstruido !== null) { Mapa.brotar(ultimoConstruido); ultimoConstruido = null; }
  $('btn-placas').classList.toggle('ativo', Mapa.placas());
}

function clicarLote(i) {
  if (!liberado(i)) return abrirBairro(bairroDe(i));
  const t = s.mapa[i];
  if (!t || (t.tipo === 'agua' && s.selecionado === 'ponteLocal')) return construirEm(i);
  if (t.tipo === 'agua' && s.selecionado) { toast('🌊 Aqui é água: construa uma 🌉 Ponte ou escolha outro terreno.'); return; }
  if (!PREDIOS[t.tipo]) return;
  const pend = s.pendentes.find(p => p.tile === i);
  pend ? abrirCaso(pend) : abrirPredio(i);
}

function renderConstruir(c) {
  const n = nivelAtual();
  let h = `<div class="resumo-financas">
    <span>Receita: <b class="pos">+${fmt(c.renda)}</b>/mês</span>
    <span>Manutenção: <b class="neg">−${fmt(c.manut)}</b>/mês</span>
  </div><div class="categorias">${CATEGORIAS.map(g => `<button class="chip ${g.id === categoriaAtual ? 'ativo' : ''}" data-cat="${g.id}">${g.icone} ${g.nome}</button>`).join('')}</div><ul class="lista-predios">`;
  for (const k in PREDIOS) {
    if (k === 'prefeitura') continue;
    const p = PREDIOS[k];
    if (categoriaAtual !== 'todos' && p.cat !== categoriaAtual) continue;
    const bloqueado = p.nivel > n;
    const jaUnico = p.unico && conta(s, k) > 0;
    const temLicenca = !p.aula || !!s.licencas[k];
    const efeitos = [
      p.efeito.renda ? `<i class="ef pos">💰+${p.efeito.renda}</i>` : '',
      p.efeito.manutencao ? `<i class="ef neg">🔧−${p.efeito.manutencao}</i>` : '',
      p.efeito.pop ? `<i class="ef">👥+${p.efeito.pop}</i>` : '',
      p.efeito.felicidade ? `<i class="ef ${p.efeito.felicidade > 0 ? 'pos' : 'neg'}">😊${p.efeito.felicidade > 0 ? '+' : ''}${p.efeito.felicidade}</i>` : '',
    ].join('');
    let acao;
    if (bloqueado) acao = `<span class="selo">🔒 ${NIVEIS[p.nivel].titulo}</span>`;
    else if (jaUnico) acao = `<span class="selo ok">✔ Feito</span>`;
    else if (!temLicenca) acao = `<button class="btn pequeno licenca" data-licenca="${k}">📝 Licença</button>`;
    else acao = `<button class="btn pequeno primario" data-construir="${k}" ${s.dinheiro < p.custo ? 'disabled' : ''}>💰 ${p.custo}</button>`;
    h += `<li class="item-predio ${bloqueado ? 'bloqueado' : ''} ${s.selecionado === k ? 'sel' : ''}" style="--cor:${p.cor}">
      ${Mapa.miniatura && Mapa.miniatura(k) ? `<img class="miniatura" src="${Mapa.miniatura(k)}" alt="" loading="lazy">` : `<span class="item-icone">${p.icone}</span>`}
      <div class="item-info"><b>${p.nome}</b><small>${p.area}</small><span class="efeitos">${efeitos}</span>${p.bonus ? `<small>${p.bonus}</small>` : ''}</div>
      ${acao}</li>`;
  }
  h += '</ul>';
  const el = $('aba-construir');
  el.innerHTML = h;
  el.querySelectorAll('[data-cat]').forEach(b => b.onclick = () => { som('clique'); categoriaAtual = b.dataset.cat; render(); });
  el.querySelectorAll('[data-licenca]').forEach(b => b.onclick = () => { som('clique'); abrirAula(b.dataset.licenca, true); });
  el.querySelectorAll('[data-construir]').forEach(b => b.onclick = () => {
    som('clique');
    s.selecionado = s.selecionado === b.dataset.construir ? null : b.dataset.construir;
    render();
    if (s.selecionado && window.innerWidth < 900) $('mapa').scrollIntoView({ behavior: 'smooth', block: 'center' });
  });
}

function renderBairros() {
  let h = '<p class="intro-vade">Junte dinheiro no caixa para comprar novos bairros. Cada compra ensina uma regra de <b>Direito Urbanístico</b>.</p><ul class="lista-bairros">';
  BAIRROS.forEach(b => {
    const dono = s.bairros[b.id];
    const pct = dono ? 100 : Math.max(0, Math.min(100, s.dinheiro / b.preco * 100));
    const lotes = (b.r1 - b.r0 + 1) * (b.c1 - b.c0 + 1);
    h += `<li class="${dono ? 'comprado' : ''}">
      <span class="item-icone">${dono ? b.icone : '🔒'}</span>
      <div class="item-info"><b>${b.nome}</b>
        <small>${lotes} lotes${b.lei ? ' · ' + b.lei.titulo : ' · bairro inicial'}</small>
        ${dono ? '<small class="selo ok">✔ Faz parte da cidade</small>' : `<div class="barra-bairro"><div style="width:${pct}%"></div><span>💰 ${fmt(Math.max(0, s.dinheiro))} / ${fmt(b.preco)}</span></div>`}
      </div>
      ${dono ? '' : `<button class="btn pequeno ${s.dinheiro >= b.preco ? 'primario' : ''}" data-bairro="${b.id}">${s.dinheiro >= b.preco ? 'Comprar' : 'Ver'}</button>`}
    </li>`;
  });
  h += '</ul>';
  const el = $('aba-bairros');
  el.innerHTML = h;
  el.querySelectorAll('[data-bairro]').forEach(btn => btn.onclick = () => abrirBairro(BAIRROS.find(b => b.id === btn.dataset.bairro)));
}

function abrirBairro(b) {
  if (s.bairros[b.id]) return;
  const pode = s.dinheiro >= b.preco;
  const pct = Math.max(0, Math.min(100, s.dinheiro / b.preco * 100));
  som('clique');
  abrirModal(`<div class="cab-modal" style="--cor:#2E9E4F"><span class="icone-grande">${b.icone}</span>
      <div><small>Expansão urbana · ${b.lei.titulo}</small><h2>${b.nome}</h2></div></div>
    <p class="resumo">Para incorporar este bairro, a prefeitura precisa de <b>💰 ${fmt(b.preco)}</b> em caixa.</p>
    <div class="barra-bairro grande"><div style="width:${pct}%"></div><span>${pode ? 'Valor disponível!' : `Faltam 💰 ${fmt(b.preco - s.dinheiro)}`}</span></div>
    <h3 class="titulo-lei">📜 ${b.lei.titulo}</h3>
    <ul class="pontos">${b.lei.pontos.map(x => `<li>${x}</li>`).join('')}</ul>
    <p class="nota">📌 ${b.lei.base}</p>
    <div class="botoes">
      <button class="btn" id="m-fechar">${pode ? 'Agora não' : 'Fechar'}</button>
      ${pode ? `<button class="btn primario" id="m-comprar">🗺️ Comprar por 💰 ${fmt(b.preco)}</button>` : ''}
    </div>`, cx => {
    cx.querySelector('#m-fechar').onclick = fecharModal;
    const c = cx.querySelector('#m-comprar');
    if (c) c.onclick = () => {
      s.dinheiro -= b.preco;
      s.bairros[b.id] = true;
      ganharXp(15);
      registrar(`🗺️ A cidade cresceu: <b>${b.icone} ${b.nome}</b> foi incorporado (${b.lei.titulo} — ${b.lei.base}).`);
      fecharModal(); confete(90); som('nivel');
      toast(`🗺️ Novo bairro: ${b.nome}!`, true);
      verificarMissoes(); render();
    };
  });
}

function renderMissoes() {
  const feitas = MISSOES.filter(m => s.missoesFeitas[m.id]).length;
  let h = `<div class="progresso-missoes"><div style="width:${feitas / MISSOES.length * 100}%"></div><span>${feitas}/${MISSOES.length} missões</span></div><ul class="lista-missoes">`;
  let proxima = true;
  MISSOES.forEach(m => {
    const feita = s.missoesFeitas[m.id];
    const atual = !feita && proxima;
    if (atual) proxima = false;
    h += `<li class="${feita ? 'feita' : ''} ${atual ? 'atual' : ''}"><span>${feita ? '✅' : atual ? '🎯' : '⬜'}</span><div><b>${m.texto}</b><small>Recompensa: 📚 ${m.xp} XP · 💰 ${m.din}</small></div></li>`;
  });
  h += '</ul>';
  const total = s.casosResolvidos;
  h += `<div class="placar">
    <div><b>${total}</b><small>casos</small></div>
    <div><b>${total ? Math.round(s.acertos / total * 100) : 0}%</b><small>acertos</small></div>
    <div><b>🔥 ${s.melhorSequencia}</b><small>melhor sequência</small></div></div>`;
  $('aba-missoes').innerHTML = h;
}

function renderVade() {
  const comAula = Object.keys(PREDIOS).filter(k => PREDIOS[k].aula);
  const n = comAula.filter(k => s.licencas[k]).length, total = comAula.length;
  let h = `<p class="intro-vade">Sua coleção de leis: <b>${n}/${total}</b> áreas liberadas. Tudo o que você aprendeu fica aqui para consulta.</p><div class="colecao">`;
  for (const k in PREDIOS) {
    const p = PREDIOS[k];
    if (!p.aula) continue;
    if (!s.licencas[k]) { h += `<div class="cartao-lei trancado"><span>❔</span> ${p.area}</div>`; continue; }
    h += `<details class="cartao-lei" style="--cor:${p.cor}"><summary><span>${p.icone}</span> ${p.area}</summary>
      <p class="resumo">${p.aula.resumo}</p><ul>${p.aula.pontos.map(x => `<li>${x}</li>`).join('')}</ul>
      <p class="pratica"><b>Na prática:</b> ${p.aula.pratica}</p></details>`;
  }
  h += '</div>';
  if (s.aprendidos.length) {
    h += `<h3>Casos que você resolveu (${s.aprendidos.length}/${CASOS.length})</h3><ul class="lista-casos">`;
    s.aprendidos.forEach(i => { const c = CASOS[i]; h += `<li><b>${c.titulo}</b><small>${c.base}</small></li>`; });
    h += '</ul>';
  }
  $('aba-vade').innerHTML = h;
}

function renderDiario() {
  renderVoz();
  document.querySelectorAll('#voz [data-cid]').forEach(b => b.onclick = () => abrirCidadao(+b.dataset.cid));
  $('diario').innerHTML = s.diario.slice(0, 12).map(d => `<li><span class="d-mes">${nomeMes(d.mes, true)}/${anoDe(d.mes)}</span> ${d.texto}</li>`).join('');
}

/* ── Modal ────────────────────────────────────────────────────────────────── */
function abrirModal(html, aoAbrir) {
  $('modal-caixa').innerHTML = html;
  $('modal').classList.remove('oculto');
  $('modal-caixa').classList.remove('entrar'); void $('modal-caixa').offsetWidth; $('modal-caixa').classList.add('entrar');
  if (aoAbrir) aoAbrir($('modal-caixa'));
  const foco = $('modal-caixa').querySelector('button');
  if (foco) foco.focus();
}
function fecharModal() { $('modal').classList.add('oculto'); }

/* ── Aula + licença ───────────────────────────────────────────────────────── */
function htmlAula(p) {
  return `<p class="resumo">${p.aula.resumo}</p>
    <ul class="pontos">${p.aula.pontos.map(x => `<li>${x}</li>`).join('')}</ul>
    <p class="pratica"><b>💡 Na prática:</b> ${p.aula.pratica}</p>`;
}

function abrirAula(tipo, comProva) {
  const p = PREDIOS[tipo];
  abrirModal(`<div class="cab-modal" style="--cor:${p.cor}"><span class="icone-grande">${p.icone}</span>
      <div><small>Aula · ${p.area}</small><h2>${p.nome}</h2></div></div>
    ${htmlAula(p)}
    <div class="botoes">
      <button class="btn" id="m-fechar">Fechar</button>
      ${comProva ? '<button class="btn primario" id="m-prova">📝 Fazer a prova da licença</button>' : ''}
    </div>`, cx => {
    cx.querySelector('#m-fechar').onclick = fecharModal;
    if (comProva) cx.querySelector('#m-prova').onclick = () => iniciarProva(tipo);
  });
}

function htmlOpcoes(ordem, chave) {
  const letras = 'ABCD';
  return `<div class="opcoes">${ordem.map((o, n) => `<button class="opcao" data-${chave}="${o.i}"><span class="letra">${letras[n]}</span><span>${esc(o.t)}</span></button>`).join('')}</div>`;
}

function iniciarProva(tipo) {
  const p = PREDIOS[tipo];
  const perguntas = embaralhar(p.licenca).slice(0, 3);
  const minimo = Math.min(2, perguntas.length);
  let idx = 0, acertos = 0;

  const mostrar = () => {
    const q = perguntas[idx];
    const ordem = embaralhar(q.ops.map((t, i) => ({ t, i })));
    abrirModal(`<div class="cab-modal" style="--cor:${p.cor}"><span class="icone-grande">📝</span>
        <div><small>Licença · ${p.area}</small><h2>${q.p}</h2></div></div>
      <div class="passos">${perguntas.map((_, k) => `<i class="${k < idx ? 'feito' : k === idx ? 'agora' : ''}"></i>`).join('')}</div>
      ${htmlOpcoes(ordem, 'i')}
      <div id="feedback"></div>`, cx => {
      cx.querySelectorAll('.opcao').forEach(b => b.onclick = () => {
        const certo = +b.dataset.i === q.c;
        if (certo) { acertos++; ganharXp(10); som('certo'); } else som('erro');
        registrarDesempenho(p.area, 'prova', certo);
        cx.querySelectorAll('.opcao').forEach(o => {
          o.disabled = true;
          if (+o.dataset.i === q.c) o.classList.add('certa');
        });
        if (!certo) b.classList.add('errada');
        const ultima = idx === perguntas.length - 1;
        cx.querySelector('#feedback').innerHTML = `<div class="explicacao ${certo ? 'ok' : 'erro'}">
          <b>${certo ? '✅ Correto! +10 XP' : '❌ Não é bem assim.'}</b> ${q.exp}</div>
          <div class="botoes"><button class="btn primario" id="m-prox">${ultima ? 'Ver resultado' : 'Próxima ▶'}</button></div>`;
        cx.querySelector('#m-prox').onclick = () => { idx++; idx < perguntas.length ? mostrar() : resultado(); };
        cx.querySelector('#m-prox').focus();
      });
    });
  };

  const resultado = () => {
    const passou = acertos >= minimo;
    if (passou) {
      s.licencas[tipo] = true;
      ganharXp(20);
      registrar(`📜 Licença concedida: <b>${p.area}</b> (${acertos}/${perguntas.length} acertos).`);
      confete(); som('nivel');
    } else som('erro');
    const estrelas = perguntas.map((_, k) => k < acertos ? '⭐' : '☆').join('');
    abrirModal(`<div class="resultado ${passou ? 'ok' : 'erro'}">
        <span class="icone-grande pulando">${passou ? '🏅' : '📚'}</span>
        <h2>${passou ? 'Licença aprovada!' : 'Ainda não foi desta vez'}</h2>
        <p class="estrelas">${estrelas}</p>
        <p>Você acertou <b>${acertos} de ${perguntas.length}</b>. ${passou
          ? `Agora você pode construir <b>${p.icone} ${p.nome}</b> na cidade.`
          : `É preciso acertar ${minimo}. Releia a aula e tente de novo!`}</p></div>
      <div class="botoes">
        ${passou ? `<button class="btn primario" id="m-ok">🏗️ Construir agora</button>` : `<button class="btn" id="m-aula">Rever a aula</button><button class="btn primario" id="m-denovo">Tentar de novo</button>`}
      </div>`, cx => {
      if (passou) cx.querySelector('#m-ok').onclick = () => { fecharModal(); if (s.dinheiro >= p.custo) s.selecionado = tipo; render(); };
      else {
        cx.querySelector('#m-aula').onclick = () => abrirAula(tipo, true);
        cx.querySelector('#m-denovo').onclick = () => iniciarProva(tipo);
      }
    });
    render();
  };

  mostrar();
}

/* ── Construção ───────────────────────────────────────────────────────────── */
function construirEm(i) {
  const tipo = s.selecionado;
  if (!tipo) { toast('Escolha primeiro um prédio no painel "Construir".'); return; }
  const p = PREDIOS[tipo];
  if (!liberado(i)) { abrirBairro(bairroDe(i)); return; }
  const naAgua = s.mapa[i] && s.mapa[i].tipo === 'agua';
  if (tipo === 'ponteLocal' && !naAgua) { toast('🌉 A ponte só pode ser construída sobre a água.'); return; }
  if (s.dinheiro < p.custo) { toast('💸 Orçamento insuficiente.'); s.selecionado = null; render(); return; }
  s.dinheiro -= p.custo;
  s.mapa[i] = { tipo };
  ultimoConstruido = i;
  som('construir');
  if (conta(s, tipo) === 1) {
    registrar(`🏗️ Inaugurado(a): <b>${p.icone} ${p.nome}</b>.`);
    if (p.aula) s.ultimaObra = `${p.icone} ${p.nome}`;
    if (Mapa.focar && p.cat !== 'enfeite') Mapa.focar(i); // câmera acompanha a primeira obra de cada tipo
  }
  if (p.unico || s.dinheiro < p.custo) s.selecionado = null;
  verificarMissoes();
  render();
  flutuar(i, `−${p.custo} 💰`, 'neg');
}

function abrirPredio(i) {
  const tipo = s.mapa[i].tipo, p = PREDIOS[tipo];
  const extra = p.efeito.renda ? `<p class="nota">💰 Este prédio rende <b>${fmt(rendaDoLote(i))}</b>/mês${beiraRua(i) ? ' (inclui +20% por estar na beira da rua)' : ''}.</p>` : '';
  abrirModal(`<div class="cab-modal" style="--cor:${p.cor}"><span class="icone-grande">${p.icone}</span>
      <div><small>${p.area}</small><h2>${p.nome}</h2></div></div>
    ${ampliavel(tipo) ? `<div class="nivel-predio"><span>Nível ${'⭐'.repeat(s.mapa[i].nivel || 1)}${'☆'.repeat(MAX_NIVEL - (s.mapa[i].nivel || 1))}</span>
      <small>${(s.mapa[i].nivel || 1) < MAX_NIVEL ? 'Ampliar soma +50% aos efeitos (renda, moradores, felicidade e atendimento).' : 'Nível máximo.'}</small></div>` : ''}
    ${p.aula ? htmlAula(p) : `<p class="resumo">${p.cat === 'enfeite' ? 'Enfeites deixam a cidade mais agradável: cada um soma felicidade (até um limite de +12 no total).' : 'Obra de infraestrutura da cidade.'}${p.bonus ? ' ' + p.bonus : ''}</p>`}${extra}
    <div class="botoes">
      ${tipo !== 'prefeitura' ? `<button class="btn perigo" id="m-demolir">Demolir (+${Math.floor(p.custo / 2)})</button>` : ''}
      ${ampliavel(tipo) && (s.mapa[i].nivel || 1) < MAX_NIVEL ? `<button class="btn" id="m-ampliar" ${s.dinheiro < custoAmpliar(s.mapa[i]) ? 'disabled' : ''}>⬆️ Ampliar (💰 ${fmt(custoAmpliar(s.mapa[i]))})</button>` : ''}
      <button class="btn primario" id="m-fechar">Fechar</button>
    </div>`, cx => {
    cx.querySelector('#m-fechar').onclick = fecharModal;
    const amp = cx.querySelector('#m-ampliar');
    if (amp) amp.onclick = () => {
      const custo = custoAmpliar(s.mapa[i]);
      if (s.dinheiro < custo) return;
      s.dinheiro -= custo;
      s.mapa[i].nivel = (s.mapa[i].nivel || 1) + 1;
      if (Mapa.focar) Mapa.focar(i);
      ultimoConstruido = i;
      registrar(`⬆️ ${p.icone} ${p.nome} ampliado(a) para o nível ${s.mapa[i].nivel}.`);
      fecharModal(); som('construir'); confete(30); verificarMissoes(); render();
      flutuar(i, `−${fmt(custo)} 💰`, 'neg');
    };
    const d = cx.querySelector('#m-demolir');
    if (d) d.onclick = () => {
      s.mapa[i] = tipo === 'ponteLocal' ? { tipo: 'agua' } : null; s.dinheiro += Math.floor(p.custo / 2);
      s.pendentes = s.pendentes.filter(x => x.tile !== i);
      registrar(`🚧 Demolido(a): ${p.icone} ${p.nome}.`);
      fecharModal(); render();
    };
  });
}

/* ── Passagem do tempo ────────────────────────────────────────────────────── */
function proximoMes() {
  const c = calcular();
  const saldo = c.renda - c.manut;

  // dinheiro sobe de cada prédio que rende
  s.mapa.forEach((t, k) => {
    if (t && PREDIOS[t.tipo] && PREDIOS[t.tipo].efeito.renda) {
      setTimeout(() => flutuar(k, `+${fmt(rendaDoLote(k))}`, 'pos'), Math.random() * 400);
    }
  });
  som('moeda');

  s.dinheiro += saldo;
  s.mes++;
  if (Mapa.passarTempo) Mapa.passarTempo();
  aplicarImpostosPendentes();
  sincronizarCidadaos();
  const mesIdx = (s.mes - 1) % 12;
  sortearClimaEEventos(mesIdx);
  if (mesIdx === 0) registrar(`🎆 Feliz Ano ${anoDe(s.mes)}! Começa o verão na cidade.`);
  if (mesIdx === 5) registrar('🌸 Inverno chegando: os <b>ipês-roxos</b> começaram a florir.');
  if (mesIdx === 7) registrar('🌼 Agosto é época dos <b>ipês-amarelos</b> — repare nas árvores da cidade!');
  if (mesIdx === 8) registrar('🌷 Começa a primavera.');
  registrar(`📅 Balanço do mês: ${saldo >= 0 ? '+' : ''}${fmt(saldo)} · ${fmt(c.pop)} habitantes · ${c.fel}% de felicidade.`);
  if (s.dinheiro < 0) {
    registrar('⚠️ Contas no vermelho! A <b>Lei de Responsabilidade Fiscal (LC 101/2000)</b> exige equilíbrio entre receitas e despesas.');
    s.reputacao = Math.max(-30, s.reputacao - 3);
  }
  if (s.reputacao > 0) s.reputacao -= 0.5; // reputação volta lentamente ao neutro

  // cidadãos que esperaram demais vão embora insatisfeitos
  s.pendentes = s.pendentes.filter(p => {
    if (p.expira >= s.mes) return true;
    s.reputacao = Math.max(-30, s.reputacao - 5);
    s.sequencia = 0;
    if (p.lei) {
      const pl = PROJETOS_LEI.find(x => x.id === p.lei);
      s.leis[p.lei] = 'arquivado';
      registrar(`🗄️ O projeto "<b>${pl.titulo}</b>" ficou parado na mesa do prefeito e foi arquivado.`);
      return false;
    }
    registrar(`😤 Um cidadão desistiu de esperar no caso "<b>${CASOS[p.caso].titulo}</b>". A cidade ficou insatisfeita.`);
    return false;
  });

  const novo = Math.random() < 0.85 ? gerarCaso() : null;
  const projeto = conta(s, 'camara') && Math.random() < .45 ? gerarProjeto() : null;
  if (projeto) setTimeout(() => toast('📜 Um projeto de lei chegou da Câmara para você sancionar ou vetar.'), 1200);
  gerarVoz(c);
  verificarMissoes();
  render();
  const btn = $('btn-mes');
  btn.classList.remove('girar'); void btn.offsetWidth; btn.classList.add('girar');
  if (novo) {
    const p = PREDIOS[s.mapa[novo.tile].tipo];
    setTimeout(() => { som('alerta'); toast(`❗ Um cidadão precisa de ajuda em ${p.icone} ${p.nome}`); }, 500);
  }
}

function sortearClimaEEventos(mesIdx) {
  // chance de chuva conforme a estação (verão chuvoso, inverno seco)
  const chance = [11, 0, 1].includes(mesIdx) ? .5 : mesIdx <= 4 ? .3 : mesIdx <= 7 ? .12 : .35;
  s.chuva = Math.random() < chance;
  const ev = [];
  if (mesIdx === 1) ev.push('carnaval');
  if (mesIdx === 5) ev.push('junina');
  if (mesIdx === 9 && anoDe(s.mes) % 4 === 0) ev.push('eleicao');
  if (s.chuva && Math.random() < .4) ev.push('temporal');
  if (Math.random() < .08) ev.push('auditoria');
  ev.forEach(id => {
    const e = EVENTOS[id];
    let efeito = '';
    if (id === 'carnaval' || id === 'junina') { s.reputacao = Math.min(30, s.reputacao + 3); efeito = 'Felicidade +3.'; }
    if (id === 'eleicao') {
      const venceu = s.felicidade >= 55;
      if (venceu) { ganharXp(40); s.dinheiro += 200; efeito = `Com ${s.felicidade}% de aprovação, você foi <b>reeleito(a)</b>! +40 XP, +200 💰.`; }
      else { s.reputacao = Math.max(-30, s.reputacao - 3); efeito = `Com só ${s.felicidade}% de aprovação, você venceu por pouco. Cuide mais da cidade!`; }
    }
    if (id === 'temporal') {
      const temBombeiros = conta(s, 'bombeiros') > 0, temPiscinao = conta(s, 'piscinao') > 0;
      const custo = Math.max(10, 120 - (temBombeiros ? 70 : 0) - (temPiscinao ? 40 : 0));
      s.dinheiro -= custo;
      if (!temBombeiros && !temPiscinao) s.reputacao = Math.max(-30, s.reputacao - 4);
      const ajuda = [temBombeiros && 'os Bombeiros agiram rápido', temPiscinao && 'o Piscinão segurou a água'].filter(Boolean).join(' e ');
      efeito = ajuda ? `Ainda bem: ${ajuda}. Estragos de só 💰 ${custo}.` : `Sem Bombeiros nem Piscinão, os estragos custaram 💰 ${custo} e a população ficou insatisfeita.`;
    }
    if (id === 'auditoria') {
      const ok = s.dinheiro >= 0;
      s.reputacao = Math.max(-30, Math.min(30, s.reputacao + (ok ? 2 : -5)));
      efeito = ok ? 'Contas aprovadas! Felicidade +2.' : 'Contas no vermelho: parecer pela rejeição. Felicidade −5.';
    }
    registrar(`${e.titulo} ${e.texto} ${efeito} <i>⚖️ ${e.dica}</i>`);
    setTimeout(() => toast(e.titulo, true), 900);
  });
  if (s.chuva && !ev.includes('temporal')) registrar('🌧️ Mês chuvoso na cidade.');
}

function gerarProjeto() {
  s.leis = s.leis || {};
  if (s.pendentes.length >= MAX_PENDENTES || s.pendentes.some(p => p.lei)) return null;
  const restantes = PROJETOS_LEI.filter(pl => !s.leis[pl.id]);
  const tile = s.mapa.findIndex(l => l && l.tipo === 'camara');
  if (!restantes.length || tile < 0) return null;
  const pend = { lei: restantes[Math.floor(Math.random() * restantes.length)].id, tile, expira: s.mes + 3 };
  s.pendentes.push(pend);
  return pend;
}

function abrirProjeto(pend) {
  const pl = PROJETOS_LEI.find(x => x.id === pend.lei);
  som('clique');
  abrirModal(`<div class="cab-modal" style="--cor:#B8862B"><span class="icone-grande">📜</span>
      <div><small>Projeto de lei aprovado pela Câmara · autoria: ${pl.autor}</small><h2>${pl.titulo}</h2></div></div>
    <blockquote class="fala"><b>Art. 1º</b>${pl.texto}</blockquote>
    <p class="pergunta">Como prefeito(a), você sanciona ou veta? <small>Lembre-se: lei inconstitucional não deve ser sancionada.</small></p>
    <div class="botoes botoes-lei"><button class="btn" id="m-vetar">🚫 Vetar</button><button class="btn primario" id="m-sancionar">✍️ Sancionar</button></div>
    <div id="feedback"></div>`, cx => {
    const decidir = sancionou => {
      s.leis = s.leis || {};
      s.pendentes = s.pendentes.filter(x => x !== pend);
      s.leis[pl.id] = sancionou ? 'sancionada' : 'vetada';
      const certo = sancionou === pl.constitucional;
      registrarDesempenho('Processo Legislativo', 'caso', certo);
      let titulo;
      if (certo) {
        ganharXp(20); s.reputacao = Math.min(30, s.reputacao + 2);
        if (sancionou && pl.efeito) {
          if (pl.efeito.fel) s.reputacao = Math.min(30, s.reputacao + pl.efeito.fel);
          if (pl.efeito.renda) s.bonusRenda = (s.bonusRenda || 0) + pl.efeito.renda;
        }
        titulo = sancionou ? '✅ Lei sancionada e em vigor! +20 XP' : '✅ Veto correto: o projeto era inconstitucional. +20 XP';
        som('certo');
      } else if (sancionou) {
        s.leis[pl.id] = 'derrubada'; s.reputacao = Math.max(-30, s.reputacao - 4); ganharXp(5);
        titulo = '⚖️ A lei foi questionada e o STF a declarou inconstitucional. A cidade ficou mal na foto.';
        som('erro');
      } else {
        s.reputacao = Math.max(-30, s.reputacao - 2); ganharXp(5);
        titulo = '❌ O veto não tinha base: o projeto era constitucional e a cidade perdeu uma boa lei.';
        som('erro');
      }
      registrar(`📜 Projeto "<b>${pl.titulo}</b>": ${{ sancionada: 'sancionado', vetada: 'vetado', derrubada: 'sancionado e derrubado pelo STF' }[s.leis[pl.id]]}. <i>${pl.base}</i>`);
      cx.querySelector('.botoes-lei').remove();
      cx.querySelector('#feedback').innerHTML = `<div class="explicacao ${certo ? 'ok' : 'erro'}"><b>${titulo}</b> ${pl.exp}<small class="base">📌 ${pl.base}</small></div>
        <div class="botoes"><button class="btn primario" id="m-ok">Continuar</button></div>`;
      cx.querySelector('#m-ok').onclick = () => { fecharModal(); verificarMissoes(); render(); };
      cx.querySelector('#m-ok').focus();
    };
    cx.querySelector('#m-vetar').onclick = () => decidir(false);
    cx.querySelector('#m-sancionar').onclick = () => decidir(true);
  });
}

// ── Voz da cidade: comentários dos moradores conforme o que acontece ──
const PERFIS = ['@ana.souza', '@joao_pedro', '@tia.cida', '@marcos.bike', '@lu.santos', '@seu.ze', '@bia_estuda', '@dj.kaio', '@vovo.lurdes', '@rafa.motoboy'];
function gerarVoz(c) {
  const opcoes = [];
  const falta = { agua: 'Faltou água de novo aqui no bairro 😩 #CadêAÁgua', esgoto: 'Cheiro de esgoto na rua inteira... cadê a estação de tratamento? 🤢',
    energia: 'Mais um apagão! Precisamos de energia ⚡😡', educacao: 'Não tem vaga na escola pro meu filho 😞', saude: 'Fila enorme no posto de saúde hoje 🏥',
    seguranca: 'Tá faltando policiamento à noite 🚓', lazer: 'Queria um parque pra levar as crianças no fim de semana 🌳', justica: 'Precisava de um fórum mais perto pra resolver meu processo ⚖️' };
  c.faltas.forEach(k => opcoes.push(falta[k]));
  if (s.chuva) opcoes.push('Chuva o mês inteiro ☔ pelo menos as plantas agradecem');
  if (s.felicidade >= 75) opcoes.push(`Que cidade boa de morar! Amo ${s.nome} 💛`, 'Parabéns à prefeitura, a cidade tá linda 👏');
  if (s.felicidade < 35) opcoes.push('Tá difícil viver nessa cidade... 😤');
  if (s.dinheiro < 0) opcoes.push('Dizem que as contas da prefeitura estão no vermelho 👀 #LRF');
  if ([5, 6, 7, 8].includes((s.mes - 1) % 12)) opcoes.push('Os ipês floriram! Que lindo 🌸📸');
  if (aliquota('iptu') >= 2.25) opcoes.push(`Esse IPTU de ${fmtAliq(aliquota('iptu'))} tá pesado demais 😤💸`);
  if (aliquota('iss') <= 2.5) opcoes.push('Com o ISS mais baixo, abri meu pequeno negócio aqui! 🏪');
  if (s.ultimaObra) { opcoes.push(`Inauguraram ${s.ultimaObra} aqui perto! Finalmente 🎉`); s.ultimaObra = null; }
  if (s.pendentes.length) opcoes.push('Já faz tempo que estou esperando atendimento na prefeitura... ⏳');
  opcoes.push(`Bom dia, ${s.nome}! ☀️`, 'Alguém sabe se o ônibus passa no domingo? 🚌');
  const moradores = (s.cidadaos || []).filter(x => !x.atendido);
  const posts = embaralhar(opcoes).slice(0, 2).map(texto => {
    const m = moradores.length ? sorteio(moradores) : null;
    return m ? { quem: arroba(m), cid: m.id, texto } : { quem: PERFIS[Math.floor(Math.random() * PERFIS.length)], texto };
  });
  // um "Você sabia?" com um ponto de lei de uma área já liberada
  const areas = Object.keys(PREDIOS).filter(k => PREDIOS[k].aula && s.licencas[k]);
  if (areas.length) {
    const a = PREDIOS[areas[Math.floor(Math.random() * areas.length)]].aula;
    posts.push({ quem: '@prof.renata 📚', texto: 'Você sabia? ' + a.pontos[Math.floor(Math.random() * a.pontos.length)], dica: true });
  }
  s.voz = posts.concat(s.voz || []).slice(0, 6);
  if ($('celular').classList.contains('fechado')) s.vozNaoLidas = Math.min(9, (s.vozNaoLidas || 0) + posts.length);
}
function renderVoz() {
  const el = $('voz');
  if (!el) return;
  el.innerHTML = (s.voz || []).length ? s.voz.slice(0, 4).map(v => `<li class="${v.dica ? 'dica-lei' : ''}">${v.cid ? `<button class="link autor" data-cid="${v.cid}">${v.quem}</button>` : `<b>${v.quem}</b>`}<span>${v.texto}</span></li>`).join('')
    : '<li class="vazio">Os moradores vão comentar o que acontece na cidade a cada mês.</li>';
}

function gerarCaso() {
  if (s.pendentes.length >= MAX_PENDENTES) return null;
  const ocupados = new Set(s.pendentes.map(p => p.tile));
  const emAberto = new Set(s.pendentes.map(p => p.caso));
  const lotes = {};
  s.mapa.forEach((t, i) => { if (t && PREDIOS[t.tipo] && !ocupados.has(i)) (lotes[t.tipo] = lotes[t.tipo] || []).push(i); });
  const disponiveis = CASOS.map((c, i) => i).filter(i => lotes[CASOS[i].predio] && !emAberto.has(i));
  let novos = disponiveis.filter(i => !s.casosVistos.includes(i));
  if (!novos.length) {
    // todos os casos disponíveis já foram vistos: recomeça o ciclo
    s.casosVistos = s.casosVistos.filter(i => !disponiveis.includes(i));
    novos = disponiveis;
  }
  if (!novos.length) return null;
  const caso = novos[Math.floor(Math.random() * novos.length)];
  const opcoes = lotes[CASOS[caso].predio];
  const pend = { caso, tile: opcoes[Math.floor(Math.random() * opcoes.length)], expira: s.mes + PRAZO_CASO };
  s.casosVistos.push(caso);
  s.pendentes.push(pend);
  return pend;
}

function abrirCaso(pend) {
  if (Mapa.focar) Mapa.focar(pend.tile, true);
  if (pend.lei) return abrirProjeto(pend);
  const i = pend.caso, c = CASOS[i], p = PREDIOS[c.predio];
  const restam = pend.expira - s.mes;
  const ordem = embaralhar(c.ops.map((t, k) => ({ t, i: k })));
  som('clique');
  abrirModal(`<div class="cab-modal" style="--cor:${p.cor}"><span class="icone-grande">${p.icone}</span>
      <div><small>Caso da cidade · ${p.area}</small><h2>${c.titulo}</h2></div></div>
    <div class="cena"><span class="avatar">${c.quem.split(' ')[0]}</span>
      <blockquote class="fala"><b>${c.quem.split(' ').slice(1).join(' ')}</b>${c.texto}</blockquote></div>
    <p class="pergunta">O que você responde? <small>${restam > 0 ? `⏳ espera mais ${restam} mês(es)` : '⏳ último mês de espera!'}${s.sequencia >= 2 ? ` · 🔥 sequência de ${s.sequencia}` : ''}</small></p>
    ${htmlOpcoes(ordem, 'k')}
    <div id="feedback"></div>
    <div class="botoes" id="m-depois-box"><button class="btn" id="m-depois">Atender depois</button></div>`, cx => {
    cx.querySelector('#m-depois').onclick = fecharModal;
    cx.querySelectorAll('.opcao').forEach(b => b.onclick = () => {
      const certo = +b.dataset.k === c.c;
      s.casosResolvidos++;
      registrarDesempenho(p.area, 'caso', certo);
      registrarAtendimento(c, certo);
      s.pendentes = s.pendentes.filter(x => x !== pend && !(x.caso === pend.caso && x.tile === pend.tile));
      cx.querySelector('#m-depois-box').remove();
      cx.querySelectorAll('.opcao').forEach(o => { o.disabled = true; if (+o.dataset.k === c.c) o.classList.add('certa'); });
      let premio = '';
      if (certo) {
        s.sequencia++;
        s.melhorSequencia = Math.max(s.melhorSequencia, s.sequencia);
        const bonus = Math.min(s.sequencia - 1, 5) * 10;
        s.acertos++; ganharXp(15); s.dinheiro += 40 + bonus;
        s.reputacao = Math.min(30, s.reputacao + 3);
        premio = `+15 XP, +${40 + bonus} 💰${bonus ? ` (🔥 bônus de sequência ×${s.sequencia})` : ''}`;
        registrar(`✅ Caso "<b>${c.titulo}</b>" resolvido conforme a lei (${c.base}).`);
        som('certo');
        if (s.sequencia >= 3) confete(40);
      } else {
        b.classList.add('errada'); ganharXp(5); s.sequencia = 0;
        s.reputacao = Math.max(-30, s.reputacao - 4);
        registrar(`❌ Caso "<b>${c.titulo}</b>" mal resolvido — a cidade reclamou. Base: ${c.base}.`);
        som('erro');
        cx.querySelector('.opcoes').classList.add('tremer');
      }
      if (!s.aprendidos.includes(i)) s.aprendidos.push(i);
      cx.querySelector('#feedback').innerHTML = `<div class="explicacao ${certo ? 'ok' : 'erro'}">
          <b>${certo ? `✅ Decisão correta! ${premio}` : '❌ Decisão equivocada. +5 XP pelo aprendizado'}</b> ${c.exp}
          <small class="base">📌 ${c.base}</small></div>
        <div class="botoes"><button class="btn primario" id="m-ok">Continuar</button></div>`;
      cx.querySelector('#m-ok').onclick = () => { fecharModal(); verificarMissoes(); render(); };
      cx.querySelector('#m-ok').focus();
    });
  });
}

function verificarMissoes() {
  calcular();
  MISSOES.forEach(m => {
    if (!s.missoesFeitas[m.id] && m.ok(s)) {
      s.missoesFeitas[m.id] = true;
      s.dinheiro += m.din;
      ganharXp(m.xp);
      registrar(`🎯 Missão cumprida: <b>${m.texto}</b> (+${m.xp} XP, +${m.din} 💰).`);
      setTimeout(() => { toast(`🎯 Missão cumprida: ${m.texto}`, true); confete(50); som('certo'); }, 200);
    }
  });
}

/* ══ Orçamento e impostos ════════════════════════════════════════════════════
   IPTU incide sobre os imóveis residenciais e o ISS sobre as demais atividades.
   Imposto mais alto arrecada mais e irrita a população. Aumento só vale depois
   da anterioridade anual e nonagesimal; redução pode valer no mês seguinte. */
const aliquota = k => (s.impostos && s.impostos[k]) || IMPOSTOS[k].padrao;
const fatorImposto = tipo => RESIDENCIAIS.includes(tipo) ? aliquota('iptu') / IMPOSTOS.iptu.padrao : aliquota('iss') / IMPOSTOS.iss.padrao;
const humorImpostos = () => -Math.round((aliquota('iptu') - IMPOSTOS.iptu.padrao) * 5 + (aliquota('iss') - IMPOSTOS.iss.padrao) * 3);
const fmtAliq = v => v.toLocaleString('pt-BR', { minimumFractionDigits: v % 1 ? 1 : 0, maximumFractionDigits: 2 }) + '%';

function receitasPorImposto() {
  const r = { iptu: 0, iss: 0 };
  s.mapa.forEach((l, i) => { if (l && PREDIOS[l.tipo] && PREDIOS[l.tipo].efeito.renda) r[RESIDENCIAIS.includes(l.tipo) ? 'iptu' : 'iss'] += rendaDoLote(i); });
  return r;
}

function vigenciaDe(k, novo) {
  if (novo <= aliquota(k)) return s.mes + 1;                     // reduzir não tem anterioridade
  const proximoAno = anoDe(s.mes) * 12 + 1;                      // 1º de janeiro do ano seguinte
  return Math.max(proximoAno, s.mes + 3);                        // e ao menos 90 dias (noventena)
}

function aplicarImpostosPendentes() {
  (s.impostosPendentes || []).filter(p => p.vigencia <= s.mes).forEach(p => {
    s.impostos = s.impostos || {};
    s.impostos[p.k] = p.valor;
    registrar(`🧾 Entrou em vigor a nova alíquota do <b>${IMPOSTOS[p.k].nome}</b>: ${fmtAliq(p.valor)}.`);
  });
  s.impostosPendentes = (s.impostosPendentes || []).filter(p => p.vigencia > s.mes);
}

function abrirOrcamento() {
  const c = calcular(), rec = receitasPorImposto(), temCamara = conta(s, 'camara') > 0;
  const novo = { iptu: aliquota('iptu'), iss: aliquota('iss') };
  (s.impostosPendentes || []).forEach(p => { novo[p.k] = p.valor; });
  const linha = k => {
    const imp = IMPOSTOS[k], pend = (s.impostosPendentes || []).find(p => p.k === k);
    return `<div class="imposto">
      <div class="imposto-cab"><b>${imp.nome}</b><span>em vigor: <b>${fmtAliq(aliquota(k))}</b>${pend ? ` · aprovado ${fmtAliq(pend.valor)} a partir de ${nomeMes(pend.vigencia)}/${anoDe(pend.vigencia)}` : ''}</span></div>
      <small>${imp.descricao}</small>
      <label class="faixa"><input type="range" id="m-${k}" min="${imp.min}" max="${imp.max}" step="${imp.passo}" value="${novo[k]}"><output id="m-${k}-v">${fmtAliq(novo[k])}</output></label>
    </div>`;
  };
  abrirModal(`<div class="cab-modal" style="--cor:#9A7208"><span class="icone-grande">📊</span>
      <div><small>Orçamento de ${esc(s.nome)} · ${nomeMes(s.mes)} · Ano ${anoDe(s.mes)}</small><h2>Orçamento e impostos</h2></div></div>
    <div class="orcamento">
      <div><small>Receita de IPTU</small><b class="pos">+${fmt(rec.iptu)}</b></div>
      <div><small>Receita de ISS</small><b class="pos">+${fmt(rec.iss)}</b></div>
      <div><small>Manutenção</small><b class="neg">−${fmt(c.manut)}</b></div>
      <div><small>Saldo do mês</small><b class="${c.renda - c.manut >= 0 ? 'pos' : 'neg'}">${c.renda - c.manut >= 0 ? '+' : ''}${fmt(c.renda - c.manut)}</b></div>
    </div>
    ${linha('iptu')}${linha('iss')}
    <p class="nota" id="m-previsao"></p>
    <ul class="pontos regras-imposto">
      <li>Nenhum tributo pode ser criado ou aumentado sem lei (CF, art. 150, I): a mudança vai para a Câmara Municipal.</li>
      <li>Aumento só vale no ano seguinte e depois de 90 dias da lei — anterioridade anual e nonagesimal (CF, art. 150, III, "b" e "c"). Redução pode valer logo.</li>
      <li>O ISS municipal tem alíquota mínima de 2% e máxima de 5% (LC 116/2003, arts. 8º e 8º-A). O IPTU pode ser progressivo conforme o valor do imóvel (CF, art. 156, §1º).</li>
      <li>Tributo não pode ter efeito de confisco (CF, art. 150, IV).</li>
    </ul>
    <div class="botoes">
      <button class="btn" id="m-fechar">Fechar</button>
      <button class="btn primario" id="m-enviar" ${temCamara ? '' : 'disabled title="Construa a Câmara Municipal"'}>📜 Enviar projeto à Câmara</button>
    </div>
    ${temCamara ? '' : '<p class="nota">🗳️ Para mudar impostos é preciso lei: construa a <b>Câmara Municipal</b>.</p>'}`, cx => {
    const previa = () => {
      const v = { iptu: +cx.querySelector('#m-iptu').value, iss: +cx.querySelector('#m-iss').value };
      ['iptu', 'iss'].forEach(k => { cx.querySelector(`#m-${k}-v`).textContent = fmtAliq(v[k]); });
      const novaRec = rec.iptu * v.iptu / aliquota('iptu') + rec.iss * v.iss / aliquota('iss');
      const humor = -Math.round((v.iptu - IMPOSTOS.iptu.padrao) * 5 + (v.iss - IMPOSTOS.iss.padrao) * 3) - humorImpostos();
      const datas = ['iptu', 'iss'].filter(k => v[k] !== aliquota(k)).map(k => `${IMPOSTOS[k].nome} a partir de ${nomeMes(vigenciaDe(k, v[k]))}/${anoDe(vigenciaDe(k, v[k]))}`);
      cx.querySelector('#m-previsao').innerHTML = datas.length
        ? `Previsão: arrecadação de <b>${fmt(novaRec)}</b>/mês (hoje ${fmt(rec.iptu + rec.iss)}) e felicidade <b>${humor >= 0 ? '+' : ''}${humor}</b>. Vigência: ${datas.join('; ')}.`
        : 'Mova as barras para simular novas alíquotas.';
    };
    ['iptu', 'iss'].forEach(k => { cx.querySelector(`#m-${k}`).oninput = previa; });
    previa();
    cx.querySelector('#m-fechar').onclick = fecharModal;
    cx.querySelector('#m-enviar').onclick = () => {
      const mudou = [];
      ['iptu', 'iss'].forEach(k => {
        const v = +cx.querySelector(`#m-${k}`).value;
        s.impostosPendentes = (s.impostosPendentes || []).filter(p => p.k !== k);
        if (v === aliquota(k)) return;
        const vigencia = vigenciaDe(k, v);
        s.impostosPendentes.push({ k, valor: v, vigencia });
        mudou.push(`${IMPOSTOS[k].nome} ${fmtAliq(aliquota(k))} → ${fmtAliq(v)} (vigora em ${nomeMes(vigencia)}/${anoDe(vigencia)})`);
      });
      if (mudou.length) {
        registrar(`🗳️ A Câmara aprovou a lei tributária: ${mudou.join('; ')}.`);
        toast('📜 Lei aprovada! As novas alíquotas valem a partir da data de vigência.');
        ganharXp(10);
      }
      fecharModal(); render();
    };
  });
}

/* ══ Cidadãos com nome e história ════════════════════════════════════════════ */
const sorteio = lista => lista[Math.floor(Math.random() * lista.length)];
function novoCidadao(casas) {
  const mulher = Math.random() < .5;
  const idade = Math.random() < .2 ? 5 + Math.floor(Math.random() * 13) : Math.random() < .2 ? 60 + Math.floor(Math.random() * 28) : 18 + Math.floor(Math.random() * 42);
  const ocupacao = idade < 18 ? (idade < 15 ? 'estudante do ensino fundamental' : 'estudante do ensino médio') : idade >= 65 ? 'aposentado(a)' : sorteio(PROFISSOES);
  const emoji = idade < 12 ? (mulher ? '👧' : '👦') : idade >= 60 ? (mulher ? '👵' : '👴') : (mulher ? sorteio(['👩', '👩‍🦱', '👩‍🦰', '👱‍♀️']) : sorteio(['👨', '👨‍🦱', '🧔', '👱‍♂️']));
  return { id: (s.proxCidadao = (s.proxCidadao || 0) + 1), nome: `${sorteio(mulher ? NOMES_F : NOMES_M)} ${sorteio(SOBRENOMES)}`, idade, ocupacao, emoji,
    casa: sorteio(casas), desde: s.mes, gosto: sorteio(['futebol', 'novela', 'pescar no rio', 'samba', 'ler no parque', 'cozinhar', 'cuidar das plantas', 'jogar videogame', 'andar de bicicleta']), historico: [] };
}
function sincronizarCidadaos() {
  s.cidadaos = s.cidadaos || [];
  const casas = s.mapa.map((l, i) => l && RESIDENCIAIS.includes(l.tipo) ? i : -1).filter(i => i >= 0);
  if (!casas.length) return;
  s.cidadaos.forEach(c => { if (c.casa >= 0 && !(s.mapa[c.casa] && RESIDENCIAIS.includes(s.mapa[c.casa].tipo))) c.casa = sorteio(casas); }); // mudou de casa
  const alvo = Math.min(40, Math.ceil(s.pop / 4));
  while (s.cidadaos.filter(c => !c.atendido).length < alvo) s.cidadaos.push(novoCidadao(casas));
}
const arroba = c => '@' + c.nome.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z]+/g, '.').replace(/^\.|\.$/g, '');
function humorCidadao(c) {
  const faltas = calcular().faltas;
  const pessoal = (c.id * 37) % 21 - 10;
  const nota = Math.max(0, Math.min(100, s.felicidade + pessoal));
  const pedidos = {
    agua: 'quer água tratada chegando em casa', esgoto: 'reclama do cheiro de esgoto na rua', energia: 'está cansado(a) das quedas de energia',
    educacao: c.idade < 18 ? 'precisa de vaga numa escola perto de casa' : 'quer mais escolas para as crianças do bairro',
    saude: c.idade >= 60 ? 'precisa de um posto de saúde perto para as consultas' : 'acha o posto de saúde muito cheio',
    seguranca: 'tem medo de voltar para casa à noite', lazer: 'sente falta de praças e parques', justica: 'quer um fórum mais perto para resolver um problema',
  };
  const falta = faltas.find(k => pedidos[k]);
  const fala = falta ? pedidos[falta] : nota >= 70 ? `adora morar em ${s.nome}` : nota >= 45 ? 'acha que a cidade está melhorando aos poucos' : 'está pensando em se mudar de cidade';
  return { nota, rosto: rostoFelicidade(nota), fala };
}
function abrirCidadao(id) {
  const c = (s.cidadaos || []).find(x => x.id === id);
  if (!c) return;
  const h = humorCidadao(c);
  const casa = c.casa >= 0 && s.mapa[c.casa] ? `${PREDIOS[s.mapa[c.casa].tipo].icone} ${PREDIOS[s.mapa[c.casa].tipo].nome} · linha ${Math.floor(c.casa / LARGURA) + 1}, coluna ${c.casa % LARGURA + 1}` : 'endereço não informado';
  const direito = c.idade !== undefined ? DIREITOS_PERFIL.find(d => c.idade <= d.ate) : null;
  som('clique');
  abrirModal(`<div class="cab-modal" style="--cor:#3A80F0"><span class="icone-grande">${c.emoji}</span>
      <div><small>Ficha de morador(a)${c.idade !== undefined ? ` · ${c.idade} anos` : ''}</small><h2>${esc(c.nome)}</h2></div></div>
    <dl class="ficha">
      <dt>Ocupação</dt><dd>${esc(c.ocupacao)}</dd>
      <dt>Mora em</dt><dd>${casa}</dd>
      <dt>Na cidade desde</dt><dd>${nomeMes(c.desde)} do Ano ${anoDe(c.desde)}</dd>
      ${c.gosto ? `<dt>Gosta de</dt><dd>${c.gosto}</dd>` : ''}
      <dt>Humor</dt><dd>${h.rosto} ${h.nota}% · ${h.fala}</dd>
    </dl>
    ${direito ? `<p class="pratica"><b>⚖️ Direito de ${esc(c.nome.split(' ')[0])}:</b> ${direito.texto}</p>` : ''}
    <h3 class="titulo-lei">Histórico com a prefeitura</h3>
    ${c.historico.length ? `<ul class="lista-casos">${c.historico.slice(-6).reverse().map(x => `<li><b>${x.certo ? '✅' : '❌'} ${esc(x.titulo)}</b><small>${nomeMes(x.mes, true)}/${anoDe(x.mes)} · ${esc(x.base)}</small></li>`).join('')}</ul>` : '<p class="nota">Ainda não precisou da prefeitura.</p>'}
    <div class="botoes"><button class="btn" id="m-todos">👥 Todos os moradores</button><button class="btn primario" id="m-fechar">Fechar</button></div>`, cx => {
    cx.querySelector('#m-fechar').onclick = fecharModal;
    cx.querySelector('#m-todos').onclick = abrirCidadaos;
  });
}
function abrirCidadaos() {
  sincronizarCidadaos();
  const lista = (s.cidadaos || []).slice().sort((a, b) => b.historico.length - a.historico.length || a.nome.localeCompare(b.nome));
  abrirModal(`<div class="cab-modal" style="--cor:#3A80F0"><span class="icone-grande">👥</span>
      <div><small>${fmt(s.pop)} habitantes · ${lista.length} com ficha</small><h2>Moradores de ${esc(s.nome)}</h2></div></div>
    ${lista.length ? `<ul class="moradores">${lista.map(c => {
      const h = humorCidadao(c);
      return `<li><button class="morador" data-cid="${c.id}"><span class="m-emoji">${c.emoji}</span><span class="m-info"><b>${esc(c.nome)}</b><small>${c.idade !== undefined ? c.idade + ' anos · ' : ''}${esc(c.ocupacao)}</small></span><span class="m-humor" title="Humor">${h.rosto}</span></button></li>`;
    }).join('')}</ul>` : '<p class="nota">Construa casas, prédios de aluguel ou condomínios para a cidade ganhar moradores.</p>'}
    <p class="nota">Dica: clique numa pessoa andando na cidade para ver a ficha dela.</p>
    <div class="botoes"><button class="btn primario" id="m-fechar">Fechar</button></div>`, cx => {
    cx.querySelector('#m-fechar').onclick = fecharModal;
    cx.querySelectorAll('[data-cid]').forEach(b => b.onclick = () => abrirCidadao(+b.dataset.cid));
  });
}
function clicarPessoa(n) {
  sincronizarCidadaos();
  const moradores = (s.cidadaos || []).filter(c => !c.atendido);
  if (moradores.length) abrirCidadao(moradores[n % moradores.length].id);
  else toast('Construa moradias para conhecer os moradores da cidade.');
}
// quem trouxe um caso entra no cadastro, com o histórico do atendimento
function registrarAtendimento(caso, certo) {
  s.cidadaos = s.cidadaos || [];
  const partes = caso.quem.split(' '), emoji = partes[0], resto = partes.slice(1).join(' ');
  const [nome, detalhe] = resto.split(',').map(x => x.trim());
  let c = s.cidadaos.find(x => x.nome === nome);
  if (!c) {
    const idade = detalhe && /(\d+) anos/.test(detalhe) ? +detalhe.match(/(\d+) anos/)[1] : undefined;
    c = { id: (s.proxCidadao = (s.proxCidadao || 0) + 1), nome, emoji, idade, ocupacao: detalhe && !/anos/.test(detalhe) ? detalhe : 'morador(a) atendido(a) pela prefeitura',
      casa: -1, desde: s.mes, historico: [], atendido: true };
    s.cidadaos.push(c);
  }
  c.historico.push({ mes: s.mes, titulo: caso.titulo, certo, base: caso.base });
}

/* ══ Modo professor: desempenho por área do Direito ══════════════════════════ */
function registrarDesempenho(area, tipo, certo) {
  s.desempenho = s.desempenho || {};
  const d = s.desempenho[area] = s.desempenho[area] || { prova: 0, provaOk: 0, caso: 0, casoOk: 0 };
  d[tipo]++; if (certo) d[tipo + 'Ok']++;
}
function linhasDesempenho() {
  return Object.entries(s.desempenho || {}).map(([area, d]) => {
    const total = d.prova + d.caso, ok = d.provaOk + d.casoOk;
    return { area, ...d, total, ok, pct: total ? Math.round(ok / total * 100) : 0 };
  }).sort((a, b) => a.pct - b.pct || b.total - a.total);
}
function relatorioTexto() {
  const ls = linhasDesempenho(), total = ls.reduce((n, l) => n + l.total, 0), ok = ls.reduce((n, l) => n + l.ok, 0);
  return [`Cidade Legal — relatório de desempenho`, `Aluno(a): ${s.aluno || '(sem nome)'} · Turma: ${s.turma || '(sem turma)'}`,
    `Cidade: ${s.nome} · ${nomeMes(s.mes)} do Ano ${anoDe(s.mes)} · Título: ${NIVEIS[nivelAtual()].titulo} · ${fmt(s.xp)} XP`,
    `Aproveitamento geral: ${total ? Math.round(ok / total * 100) : 0}% (${ok} de ${total} respostas)`, '',
    ...ls.map(l => `${l.area}: ${l.pct}% — provas ${l.provaOk}/${l.prova}, casos ${l.casoOk}/${l.caso}`)].join('\n');
}
function relatorioCSV() {
  const q = v => `"${String(v).replace(/"/g, '""')}"`;
  return ['aluno;turma;area;provas_certas;provas;casos_certos;casos;aproveitamento_%',
    ...linhasDesempenho().map(l => [s.aluno || '', s.turma || '', l.area, l.provaOk, l.prova, l.casoOk, l.caso, l.pct].map(q).join(';'))].join('\n');
}
function abrirProfessor() {
  const ls = linhasDesempenho(), total = ls.reduce((n, l) => n + l.total, 0), ok = ls.reduce((n, l) => n + l.ok, 0);
  const atencao = ls.filter(l => l.total >= 2 && l.pct < 60);
  abrirModal(`<div class="cab-modal" style="--cor:#7B40E8"><span class="icone-grande">🎓</span>
      <div><small>Modo professor</small><h2>Desempenho por área do Direito</h2></div></div>
    <div class="campos-aluno">
      <label class="campo">Nome do(a) aluno(a)<input id="m-aluno" maxlength="60" value="${esc(s.aluno || '')}" autocomplete="name"></label>
      <label class="campo">Turma<input id="m-turma" maxlength="30" value="${esc(s.turma || '')}" placeholder="ex.: 9ºB-2026"></label>
    </div>
    <div class="orcamento">
      <div><small>Aproveitamento</small><b>${total ? Math.round(ok / total * 100) : 0}%</b></div>
      <div><small>Respostas</small><b>${total}</b></div>
      <div><small>Áreas estudadas</small><b>${ls.length}</b></div>
      <div><small>Título</small><b class="pequeno">${NIVEIS[nivelAtual()].titulo}</b></div>
    </div>
    ${ls.length ? `<div class="tabela-rolagem"><table class="tabela-desempenho"><thead><tr><th>Área</th><th>Provas</th><th>Casos</th><th>Aproveitamento</th></tr></thead><tbody>
      ${ls.map(l => `<tr><td>${esc(l.area)}</td><td>${l.provaOk}/${l.prova}</td><td>${l.casoOk}/${l.caso}</td>
        <td><span class="barra-pct ${l.pct >= 80 ? 'bom' : l.pct >= 60 ? 'medio' : 'fraco'}"><i style="width:${l.pct}%"></i></span> ${l.pct}%</td></tr>`).join('')}
    </tbody></table></div>` : '<p class="nota">Ainda não há respostas. As provas de licença, os casos dos cidadãos e os projetos de lei entram aqui automaticamente.</p>'}
    ${atencao.length ? `<p class="pratica"><b>📌 Para revisar:</b> ${atencao.map(l => esc(l.area)).join(', ')}.</p>` : ''}
    <div class="botoes">
      <button class="btn" id="m-copiar">📋 Copiar relatório</button>
      <button class="btn so-arquivo" id="m-csv">⬇️ Baixar planilha (CSV)</button>
      <button class="btn primario" id="m-fechar">Fechar</button>
    </div>
    <textarea id="m-texto" class="oculto" readonly></textarea>`, cx => {
    cx.querySelector('#m-aluno').oninput = e => { s.aluno = e.target.value.trim(); salvar(); };
    cx.querySelector('#m-turma').oninput = e => { s.turma = e.target.value.trim(); salvar(); };
    cx.querySelector('#m-fechar').onclick = fecharModal;
    cx.querySelector('#m-copiar').onclick = () => copiarTexto(relatorioTexto(), cx.querySelector('#m-texto'), 'Relatório copiado! Cole no e-mail ou na plataforma da turma.');
    cx.querySelector('#m-csv').onclick = () => baixarArquivo(`desempenho-${(s.aluno || 'aluno').replace(/\s+/g, '-').toLowerCase()}.csv`, '﻿' + relatorioCSV(), 'text/csv');
  });
}

/* ══ Salvar e carregar a cidade ══════════════════════════════════════════════ */
function copiarTexto(texto, area, aviso) {
  const mostrar = () => { area.value = texto; area.classList.remove('oculto'); area.focus(); area.select(); toast('Selecionei o texto: copie com Ctrl+C (ou toque e segure).'); };
  try {
    navigator.clipboard.writeText(texto).then(() => toast(aviso), mostrar);
  } catch (e) { mostrar(); }
}
function baixarArquivo(nome, conteudo, tipo) {
  const url = URL.createObjectURL(new Blob([conteudo], { type: tipo }));
  const a = document.createElement('a');
  a.href = url; a.download = nome; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
const codigoCidade = () => btoa(unescape(encodeURIComponent(JSON.stringify({ ...s, selecionado: null }))));
function lerCidade(texto) {
  texto = texto.trim();
  const obj = JSON.parse(texto.startsWith('{') ? texto : decodeURIComponent(escape(atob(texto.replace(/\s+/g, '')))));
  if (!obj || !Array.isArray(obj.mapa) || obj.mapa.length !== LARGURA * ALTURA || typeof obj.licencas !== 'object') throw new Error('arquivo inválido');
  return obj;
}
function carregarCidade(obj) {
  obj.selecionado = null;
  try {
    localStorage.setItem(CHAVE_SAVE, JSON.stringify(obj));
    location.reload();
  } catch (e) { // sem armazenamento: carrega na hora mesmo
    s = obj; migrarEstado(); fecharModal(); render(); toast('🏙️ Cidade carregada!');
  }
}
function abrirSalvar() {
  abrirModal(`<div class="cab-modal" style="--cor:#0D7896"><span class="icone-grande">💾</span>
      <div><small>${esc(s.nome)} · ${nomeMes(s.mes)} do Ano ${anoDe(s.mes)}</small><h2>Salvar e carregar a cidade</h2></div></div>
    <p>O jogo já salva sozinho neste navegador. Para continuar em outro aparelho ou entregar ao professor, guarde a cidade num arquivo ou num código.</p>
    <div class="botoes esquerda">
      <button class="btn primario so-arquivo" id="m-baixar">⬇️ Baixar arquivo da cidade</button>
      <button class="btn" id="m-copiar">📋 Copiar código da cidade</button>
    </div>
    <textarea id="m-texto" class="oculto" readonly></textarea>
    <h3 class="titulo-lei">Carregar uma cidade</h3>
    <label class="campo so-arquivo-entrada">Arquivo da cidade (.json)<input type="file" id="m-arquivo" accept=".json,application/json"></label>
    <label class="campo">Ou cole o código da cidade<textarea id="m-codigo" rows="3" placeholder="Cole aqui o código copiado"></textarea></label>
    <p class="nota" id="m-erro" role="alert"></p>
    <div class="botoes"><button class="btn" id="m-fechar">Fechar</button><button class="btn primario" id="m-carregar">🏙️ Carregar cidade</button></div>`, cx => {
    const erro = msg => { cx.querySelector('#m-erro').textContent = msg; };
    cx.querySelector('#m-fechar').onclick = fecharModal;
    cx.querySelector('#m-baixar').onclick = () => baixarArquivo(`${s.nome.replace(/[^\w\-]+/g, '-').toLowerCase() || 'cidade'}.cidadelegal.json`, JSON.stringify({ ...s, selecionado: null }), 'application/json');
    cx.querySelector('#m-copiar').onclick = () => copiarTexto(codigoCidade(), cx.querySelector('#m-texto'), '📋 Código copiado! Guarde-o para carregar a cidade depois.');
    cx.querySelector('#m-arquivo').onchange = e => {
      const f = e.target.files[0];
      if (!f) return;
      const leitor = new FileReader();
      leitor.onload = () => { try { carregarCidade(lerCidade(leitor.result)); } catch (x) { erro('Não consegui ler esse arquivo. Escolha um arquivo .json salvo pelo Cidade Legal.'); } };
      leitor.readAsText(f);
    };
    cx.querySelector('#m-carregar').onclick = () => {
      const txt = cx.querySelector('#m-codigo').value;
      if (!txt.trim()) return erro('Cole o código da cidade ou escolha um arquivo.');
      try { carregarCidade(lerCidade(txt)); } catch (x) { erro('Esse código não é de uma cidade válida. Confira se copiou o código inteiro.'); }
    };
  });
}

/* ── Início ───────────────────────────────────────────────────────────────── */
function boasVindas() {
  abrirModal(`<div class="resultado"><span class="icone-grande pulando">🏛️</span>
      <h2>Bem-vindo(a), Prefeito(a)!</h2>
      <p>Construa sua cidade e aprenda, na prática, como funciona a legislação brasileira.</p></div>
    <ol class="como-jogar">
      <li><span>📖</span><div><b>Estude</b> a aula de uma área do Direito e <b>tire a licença</b> para liberar o prédio.</div></li>
      <li><span>🏗️</span><div><b>Construa</b> casas, mercados, escolas, fóruns… Na beira da rua, rendem mais!</div></li>
      <li><span>❗</span><div><b>Avance os meses</b> e clique nos balões para <b>atender os cidadãos</b> aplicando a lei.</div></li>
      <li><span>🎓</span><div>Ganhe <b>conhecimento</b> e suba de título — de Estudante a <b>Ministro(a) do STF</b>.</div></li>
    </ol>
    <label class="campo">Nome da sua cidade<input id="m-nome" maxlength="30" value="Cidade Legal"></label>
    <div class="botoes"><button class="btn primario grande" id="m-comecar">Começar mandato ▶</button></div>`, cx => {
    cx.querySelector('#m-comecar').onclick = () => {
      s.nome = cx.querySelector('#m-nome').value.trim() || 'Cidade Legal';
      registrar(`🏛️ Fundação de <b>${esc(s.nome)}</b>. A Prefeitura abre as portas — clique nela para a primeira aula.`);
      fecharModal(); confete(60); som('nivel'); render();
    };
  });
}

// Atualiza jogos salvos em versões anteriores
function migrarEstado() {
  if (!s.aguasV2) { adicionarAguas(s.mapa); s.aguasV2 = true; }
  if (!s.bairros) { // jogos salvos antes dos bairros: libera o Centro e onde já houver prédios
    s.bairros = { centro: true };
    s.mapa.forEach((l, i) => { if (l && PREDIOS[l.tipo]) s.bairros[bairroDe(i).id] = true; });
  }
  s.selecionado = null;
}

function aplicarTema(t) {
  if (t) document.documentElement.dataset.theme = t;
}

document.addEventListener('DOMContentLoaded', () => {
  let tema = null;
  try { tema = localStorage.getItem('cidade-legal-tema'); } catch (e) { /* ignora */ }
  aplicarTema(tema);

  const salvo = carregar();
  s = salvo || novoEstado();
  migrarEstado();
  if (window.THREE && Cena.init($('mapa'), clicarLote, clicarPessoa)) Mapa = Cena;
  else {
    // sem WebGL: troca por um canvas novo (o antigo pode ter tentado um contexto WebGL) e usa o isométrico
    const novo = $('mapa').cloneNode(true);
    $('mapa').replaceWith(novo);
    Iso.init(novo, clicarLote); Mapa = Iso;
    document.querySelector('.ajuda-mapa').hidden = true;
  }
  render();
  if (!salvo) boasVindas();

  $('btn-mes').onclick = proximoMes;
  window.addEventListener('miniaturas-prontas', () => render()); // o menu ganha as miniaturas 3D
  $('btn-orcamento').onclick = abrirOrcamento;
  $('btn-salvar').onclick = abrirSalvar;
  $('btn-professor').onclick = abrirProfessor;
  $('stat-pop').onclick = abrirCidadaos;
  $('btn-som').onclick = () => { s.som = !s.som; som('clique'); render(); };
  $('btn-tema').onclick = () => {
    const escuro = document.documentElement.dataset.theme
      ? document.documentElement.dataset.theme === 'dark'
      : matchMedia('(prefers-color-scheme: dark)').matches;
    const novo = escuro ? 'light' : 'dark';
    aplicarTema(novo);
    try { localStorage.setItem('cidade-legal-tema', novo); } catch (e) { /* ignora */ }
  };
  // confirmação dentro do jogo (confirm() é bloqueado quando a página roda embutida)
  $('btn-reiniciar').onclick = () => abrirModal(`<div class="resultado"><span class="icone-grande">🔄</span>
      <h2>Reiniciar o jogo?</h2><p>Todo o progresso de <b>${esc(s.nome)}</b> será perdido.</p></div>
    <div class="botoes"><button class="btn" id="m-fechar">Cancelar</button><button class="btn perigo" id="m-reiniciar">Reiniciar</button></div>`, cx => {
    cx.querySelector('#m-fechar').onclick = fecharModal;
    cx.querySelector('#m-reiniciar').onclick = () => { s = novoEstado(); render(); boasVindas(); };
  });
  // ── interface em tela cheia: topo medido, painel recolhível, celular e visões ──
  const topo = document.querySelector('.topo');
  new ResizeObserver(() => document.documentElement.style.setProperty('--topo-h', topo.offsetHeight + 'px')).observe(topo);
  const recolherPainel = fechar => {
    $('painel').classList.toggle('recolhido', fechar);
    document.querySelector('.app').classList.toggle('painel-fechado', fechar);
    $('btn-painel').setAttribute('aria-expanded', String(!fechar));
  };
  recolherPainel(matchMedia('(max-width: 760px)').matches); // no celular a cidade começa à vista
  $('btn-painel').onclick = () => { som('clique'); recolherPainel(!$('painel').classList.contains('recolhido')); };
  const abrirCelular = abrir => {
    $('celular').classList.toggle('fechado', !abrir);
    if (abrir) { s.vozNaoLidas = 0; render(); }
  };
  $('btn-celular').onclick = () => { som('clique'); abrirCelular($('celular').classList.contains('fechado')); };
  $('btn-fechar-celular').onclick = () => abrirCelular(false);
  if (Mapa.visao) {
    const VISOES = [['', 'Nenhuma', '🏙️'], ['agua', 'Água', '💧'], ['esgoto', 'Esgoto', '🚽'], ['energia', 'Energia', '⚡'], ['educacao', 'Educação', '🏫'],
      ['saude', 'Saúde', '🏥'], ['seguranca', 'Segurança', '🚓'], ['lazer', 'Lazer', '🌳'], ['justica', 'Justiça', '⚖️']];
    let visaoAtual = '';
    const desenharVisoes = () => {
      $('visoes').innerHTML = VISOES.map(([k, nome, ic]) => `<button class="chip ${k === visaoAtual ? 'ativo' : ''}" data-visao="${k}">${ic} ${nome}</button>`).join('');
      $('visoes').querySelectorAll('[data-visao]').forEach(b => b.onclick = () => {
        visaoAtual = b.dataset.visao; som('clique');
        const leg = Mapa.visao(visaoAtual || null);
        $('btn-visoes').classList.toggle('ativo', !!visaoAtual);
        $('legenda-visao').classList.toggle('oculto', !visaoAtual);
        document.querySelector('.app').classList.toggle('com-visao', !!visaoAtual);
        if (visaoAtual) $('legenda-visao').innerHTML = `<b>${VISOES.find(v => v[0] === visaoAtual)[2]} Cobertura de ${VISOES.find(v => v[0] === visaoAtual)[1].toLowerCase()}</b>
          Alcance de ${leg.raio} quadras a partir de cada prédio que presta o serviço.
          <div class="cores"><span><i style="background:#2ECC71"></i>atendido</span><span><i style="background:#E74C3C"></i>moradia sem atendimento</span><span><i style="background:#95A5A6"></i>fora do alcance</span></div>
          ${leg.semAtendimento ? `<small>${leg.semAtendimento} moradia(s) fora do alcance.</small>` : '<small>Todas as moradias estão no alcance. 👏</small>'}`;
        desenharVisoes();
      });
    };
    desenharVisoes();
    $('btn-visoes').onclick = () => { som('clique'); $('visoes').classList.toggle('oculto'); };
  } else $('btn-visoes').hidden = true;

  document.querySelectorAll('.aba').forEach(a => a.onclick = () => {
    som('clique');
    document.querySelectorAll('.aba').forEach(x => x.classList.toggle('ativa', x === a));
    document.querySelectorAll('.conteudo-aba').forEach(x => x.classList.toggle('oculto', x.id !== 'aba-' + a.dataset.aba));
  });
  $('btn-zoom-mais').onclick = () => Mapa.zoom(.5);
  $('btn-zoom-menos').onclick = () => Mapa.zoom(-.5);
  $('btn-zoom-reset').onclick = () => Mapa.zoom(0);
  $('btn-placas').onclick = () => { const todas = Mapa.alternarPlacas(); renderMapa(); toast(todas ? '🏷️ Mostrando as placas de todos os prédios' : '🏷️ Placas só quando importa (casos, obras e mouse)'); };
  if (Mapa.passeio) {
    $('btn-passeio').onclick = () => { const on = Mapa.passeio(); $('btn-passeio').classList.toggle('ativo', on); };
    $('btn-foto').onclick = () => { som('moeda'); Mapa.foto(`${s.nome.replace(/[^\w\-]+/g, '-').toLowerCase() || 'cidade'}.png`); toast('📸 Foto da cidade salva!'); };
  } else { $('btn-passeio').hidden = true; $('btn-foto').hidden = true; }
  if (Mapa.graficos) {
    $('btn-graficos').classList.toggle('ativo', Mapa.graficos());
    $('btn-graficos').onclick = () => {
      const on = Mapa.graficos(true);
      $('btn-graficos').classList.toggle('ativo', on);
      toast(on ? '✨ Gráficos realistas ligados' : '⚡ Gráficos leves (mais rápido)');
    };
  } else $('btn-graficos').hidden = true;
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      // provas não podem ser puladas com Esc; aulas, informações e casos ainda não respondidos sim
      const cx = $('modal-caixa');
      const fechar = cx.querySelector('#m-fechar') || cx.querySelector('#m-depois');
      if (!$('modal').classList.contains('oculto') && fechar) fecharModal();
      else if (s.selecionado) { s.selecionado = null; render(); }
    }
  });
});
