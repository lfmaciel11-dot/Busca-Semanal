/* ══════════════════════════════════════════════════════════════════════════
   CIDADE LEGAL — Guia do primeiro acesso
   Um tour que destaca cada parte da tela com um holofote e um balão explicativo.
   Aparece depois de "Começar mandato" na primeira cidade; dá para pular e rever
   pela janela "Sobre" (ícone do Educa Direito) ou pelos atalhos (?).
══════════════════════════════════════════════════════════════════════════ */

const CHAVE_GUIA = 'cidade-legal-guia-visto';
const celularPequeno = () => matchMedia('(max-width: 760px)').matches;

// cada passo: alvo (seletor, função que devolve um retângulo, ou nada = centro), título, texto e ação ao entrar
const PASSOS_GUIA = [
  { titulo: '👋 Bem-vindo(a) ao Cidade Legal!', texto: 'Você é o(a) prefeito(a). Vou mostrar, em 1 minuto, onde fica cada coisa. Use <b>Próximo</b> ou as setas do teclado; <b>Pular</b> encerra o guia.' },
  { alvo: () => retanguloPrefeitura(), titulo: '🏛️ Comece pela Prefeitura', texto: 'Clique na <b>Prefeitura</b> para a primeira aula. Cada prédio da cidade ensina uma área do Direito.' },
  { alvo: '.stats', titulo: '📊 Os números da cidade', texto: '💰 <b>dinheiro</b> do caixa, 👥 <b>habitantes</b> (clique para conhecer os moradores), 😊 <b>felicidade</b> e 📚 <b>conhecimento</b>, que faz você subir de título até Ministro(a) do STF.' },
  { alvo: '#painel', abrirPainel: 'construir', titulo: '🏗️ Construir', texto: 'Escolha um prédio, leia a <b>aula</b> e faça a <b>prova da licença</b>. Aprovado(a), clique num terreno vazio do mapa. Na beira da rua, rende mais! As abas de cima separam moradia, economia, serviços, transporte, cultura, esporte…' },
  { alvo: '#btn-mes', titulo: '▶ Passar o mês', texto: 'Quando terminar de construir, avance o mês: entra o dinheiro dos impostos, sai a manutenção, e a cidade cresce.' },
  { titulo: '❗ Os cidadãos precisam de você', texto: 'A cada mês aparecem <b>balões ❗</b> sobre os prédios. Clique neles para resolver o caso aplicando a lei. Acertos dão dinheiro e conhecimento; demorar deixa a cidade insatisfeita.' },
  { alvo: '[data-aba="missoes"]', abrirPainel: 'missoes', titulo: '🎯 Missões e desafios', texto: 'Aqui ficam o <b>painel da cidade</b> (mobilidade, saúde, meio ambiente…), os <b>desafios com prazo</b>, as missões e as medalhas.' },
  { alvo: '[data-aba="bairros"]', abrirPainel: 'bairros', titulo: '🗺️ Bairros', texto: 'Junte dinheiro para <b>comprar novos bairros</b>. Cada compra ensina uma regra de Direito Urbanístico. O 📍 leva a câmera até o bairro.' },
  { alvo: '.controles-mapa', titulo: '🧭 Controles do mapa', texto: '<b>Arraste</b> para mover, <b>role</b> (ou use dois dedos) para zoom e gire com o botão direito. Aqui também estão o minimapa, as visões de cobertura, 🧨 <b>demolir</b> (volta metade do valor) e ↩️ <b>desfazer</b>.' },
  { alvo: '#btn-celular', titulo: '📱 Celular do prefeito', texto: 'A <b>Voz da cidade</b> e o <b>Diário Oficial</b>: o que os moradores pedem e tudo o que acontece na cidade.' },
  { alvo: '#btn-salvar', titulo: '💾 Minhas cidades', texto: 'O jogo <b>salva sozinho</b>. Aqui você troca de cidade, começa outra e leva o progresso para outro aparelho, sem precisar baixar arquivos.' },
  { alvo: '#btn-acess', titulo: '♿ Do seu jeito', texto: 'Letras maiores, alto contraste e menos animação. Nas aulas, o botão 🔊 <b>Ouvir</b> lê o texto em voz alta. O 🎓 ao lado é o <b>modo professor</b>.' },
  { titulo: '🚀 Pronto para governar!', texto: 'Comece clicando na <b>Prefeitura</b>. Se quiser rever este guia, clique no ícone do <b>Educa Direito</b> no canto do topo.', fim: true },
];

function retanguloPrefeitura() {
  const i = s.mapa.findIndex(l => l && l.tipo === 'prefeitura');
  if (i < 0 || !Mapa.posTela) return null;
  const p = Mapa.posTela(i);
  if (!p || p.x < 0 || p.y < 0 || p.x > innerWidth || p.y > innerHeight) return null;
  return { left: p.x - 60, top: p.y - 30, width: 120, height: 110 };
}

let guiaPasso = -1;
function iniciarGuia() {
  if (guiaPasso >= 0) return;
  fecharModal();
  const pref = s.mapa.findIndex(l => l && l.tipo === 'prefeitura');
  if (Mapa.focar && pref >= 0) Mapa.focar(pref, false, 9);
  const el = document.createElement('div');
  el.id = 'guia'; el.className = 'guia';
  el.innerHTML = `<div class="guia-holofote"></div>
    <div class="guia-balao hud" role="dialog" aria-modal="true" aria-labelledby="guia-titulo">
      <div class="guia-passos"></div><h3 id="guia-titulo"></h3><p class="guia-texto"></p>
      <div class="botoes"><button class="btn link" id="guia-pular">Pular</button><span class="espaco"></span>
        <button class="btn" id="guia-voltar">◀ Voltar</button><button class="btn primario" id="guia-prox">Próximo ▶</button></div>
    </div>`;
  document.body.appendChild(el);
  el.querySelector('#guia-pular').onclick = () => fecharGuia();
  el.querySelector('#guia-voltar').onclick = () => irPasso(guiaPasso - 1);
  el.querySelector('#guia-prox').onclick = () => (guiaPasso >= PASSOS_GUIA.length - 1 ? fecharGuia() : irPasso(guiaPasso + 1));
  addEventListener('keydown', teclasGuia, true);
  addEventListener('resize', posicionarGuia);
  irPasso(0);
}
function teclasGuia(e) {
  if (guiaPasso < 0) return;
  if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); fecharGuia(); }
  else if (e.key === 'ArrowRight' || e.key === 'Enter') { e.preventDefault(); e.stopPropagation(); document.getElementById('guia-prox').click(); }
  else if (e.key === 'ArrowLeft') { e.preventDefault(); e.stopPropagation(); if (guiaPasso > 0) irPasso(guiaPasso - 1); }
}
function irPasso(n) {
  const p = PASSOS_GUIA[n], el = document.getElementById('guia');
  if (!p || !el) return;
  guiaPasso = n;
  if (p.abrirPainel) {
    if (typeof recolherPainel === 'function' && (!celularPequeno() || p.abrirPainel === 'construir')) recolherPainel(false);
    const aba = document.querySelector(`[data-aba="${p.abrirPainel}"]`); if (aba) aba.click();
  } else if (celularPequeno() && typeof recolherPainel === 'function') recolherPainel(true);
  el.querySelector('#guia-titulo').innerHTML = p.titulo;
  el.querySelector('.guia-texto').innerHTML = p.texto;
  el.querySelector('.guia-passos').innerHTML = PASSOS_GUIA.map((_, k) => `<i class="${k < n ? 'feito' : k === n ? 'agora' : ''}"></i>`).join('');
  el.querySelector('#guia-voltar').disabled = n === 0;
  el.querySelector('#guia-prox').textContent = p.fim ? 'Começar a jogar 🚀' : 'Próximo ▶';
  [30, 400, 800].forEach(ms => setTimeout(posicionarGuia, ms)); // remede enquanto o painel e os controles terminam de se mover
  el.querySelector('#guia-prox').focus();
}
function retanguloDoPasso(p) {
  if (!p.alvo) return null;
  if (typeof p.alvo === 'function') return p.alvo();
  const alvo = document.querySelector(p.alvo);
  if (!alvo || alvo.offsetParent === null && getComputedStyle(alvo).position !== 'fixed') return null;
  const r = alvo.getBoundingClientRect();
  return r.width && r.height ? r : null;
}
function posicionarGuia() {
  const el = document.getElementById('guia');
  if (!el || guiaPasso < 0) return;
  const p = PASSOS_GUIA[guiaPasso], luz = el.querySelector('.guia-holofote'), balao = el.querySelector('.guia-balao');
  const r = retanguloDoPasso(p), M = 8, W = innerWidth, H = innerHeight;
  if (!r) { // sem alvo: holofote zerado no centro e balão centralizado
    Object.assign(luz.style, { left: W / 2 + 'px', top: H / 2 + 'px', width: '0px', height: '0px' });
    Object.assign(balao.style, { left: Math.max(12, (W - balao.offsetWidth) / 2) + 'px', top: Math.max(12, (H - balao.offsetHeight) / 2) + 'px' });
    return;
  }
  const L = Math.max(4, r.left - M), T = Math.max(4, r.top - M), R = Math.min(W - 4, r.left + r.width + M), B = Math.min(H - 4, r.top + r.height + M);
  Object.assign(luz.style, { left: L + 'px', top: T + 'px', width: R - L + 'px', height: B - T + 'px' });
  // balão abaixo do alvo; se não couber, acima; se não couber, ao lado
  const bw = balao.offsetWidth, bh = balao.offsetHeight;
  let x = Math.min(Math.max(12, (L + R) / 2 - bw / 2), W - bw - 12), y;
  if (B + 14 + bh < H - 8) y = B + 14;
  else if (T - 14 - bh > 8) y = T - 14 - bh;
  else { y = Math.min(Math.max(12, (T + B) / 2 - bh / 2), H - bh - 12); x = L - bw - 14 > 8 ? L - bw - 14 : Math.min(R + 14, W - bw - 12); }
  Object.assign(balao.style, { left: x + 'px', top: y + 'px' });
}
function fecharGuia() {
  const el = document.getElementById('guia');
  if (el) el.remove();
  guiaPasso = -1;
  removeEventListener('keydown', teclasGuia, true);
  removeEventListener('resize', posicionarGuia);
  try { localStorage.setItem(CHAVE_GUIA, '1'); } catch (e) { /* sem storage */ }
  if (celularPequeno() && typeof recolherPainel === 'function') recolherPainel(true);
  const aba = document.querySelector('[data-aba="construir"]'); if (aba) aba.click();
  if (typeof render === 'function') render();
}
const guiaJaVisto = () => { try { return localStorage.getItem(CHAVE_GUIA) === '1'; } catch (e) { return false; } };
