/* ══════════════════════════════════════════════════════════════════════════
   CIDADE LEGAL — Motor do jogo
   Ciclo: estudar a aula → passar na licença → construir → avançar o mês →
   resolver casos dos cidadãos → ganhar conhecimento → liberar novas áreas.
══════════════════════════════════════════════════════════════════════════ */

const LARGURA = 12, ALTURA = 8;
const CHAVE_SAVE = 'cidade-legal-v1';
const RIO = [9, 21, 33, 44, 56, 67, 79, 91]; // terrenos de água (não construíveis)
const SERVICOS = { educacao: '🏫 Educação', saude: '🏥 Saúde', seguranca: '🚓 Segurança', lazer: '🌳 Lazer', justica: '⚖️ Justiça' };

let s; // estado do jogo

function novoEstado(nome) {
  const mapa = Array(LARGURA * ALTURA).fill(null);
  RIO.forEach(i => { mapa[i] = { tipo: 'agua' }; });
  mapa[3 * LARGURA + 4] = { tipo: 'prefeitura' };
  return {
    nome: nome || 'Cidade Legal', dinheiro: 600, xp: 0, mes: 1, reputacao: 0,
    pop: 0, felicidade: 50, mapa, licencas: { prefeitura: true },
    casosVistos: [], casosResolvidos: 0, acertos: 0, aprendidos: [],
    missoesFeitas: {}, diario: [], selecionado: null,
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

function nivelAtual() {
  let n = 0;
  NIVEIS.forEach((v, i) => { if (s.xp >= v.xp) n = i; });
  return n;
}

function registrar(texto) {
  s.diario.unshift({ mes: s.mes, texto });
  s.diario = s.diario.slice(0, 30);
}

function toast(texto) {
  const t = $('toast');
  t.textContent = texto;
  t.classList.remove('oculto');
  clearTimeout(toast._t);
  toast._t = setTimeout(() => t.classList.add('oculto'), 2600);
}

function ganharXp(qtd) {
  const antes = nivelAtual();
  s.xp += qtd;
  const depois = nivelAtual();
  if (depois > antes) {
    registrar(`🎓 Você agora é <b>${NIVEIS[depois].titulo}</b>! Novas áreas do Direito podem ter sido liberadas.`);
    toast(`🎓 Novo título: ${NIVEIS[depois].titulo}`);
  }
}

/* ── Economia e indicadores ───────────────────────────────────────────────── */
function calcular() {
  let renda = 0, manut = 0, popCap = 0, felBonus = 0;
  const servicos = {};
  for (const t of s.mapa) {
    if (!t || !PREDIOS[t.tipo]) continue;
    const p = PREDIOS[t.tipo];
    renda += p.efeito.renda; manut += p.efeito.manutencao;
    popCap += p.efeito.pop; felBonus += p.efeito.felicidade;
    if (p.servico) servicos[p.servico] = (servicos[p.servico] || 0) + 1;
  }
  // Serviços públicos insuficientes reduzem a felicidade (cada unidade atende ~60 pessoas)
  const faltas = [];
  for (const k in SERVICOS) {
    if (popCap > 30 && (servicos[k] || 0) * 60 < popCap) faltas.push(k);
  }
  const fel = Math.max(0, Math.min(100, 45 + felBonus + s.reputacao - faltas.length * 6));
  const pop = Math.round(popCap * Math.min(1, 0.55 + fel / 100));
  if (conta(s, 'fazenda')) renda *= 1.2;
  renda *= 0.6 + fel / 125; // cidadãos felizes pagam em dia
  return { renda: Math.round(renda), manut, pop, fel: Math.round(fel), faltas };
}

function atualizarIndicadores() {
  const c = calcular();
  s.pop = c.pop; s.felicidade = c.fel;
  return c;
}

/* ── Renderização ─────────────────────────────────────────────────────────── */
function render() {
  const c = atualizarIndicadores();
  $('nome-cidade').textContent = s.nome;
  $('mes').textContent = s.mes;
  $('titulo').textContent = NIVEIS[nivelAtual()].titulo;
  $('s-din').textContent = fmt(s.dinheiro);
  $('s-din').parentElement.classList.toggle('negativo', s.dinheiro < 0);
  $('s-pop').textContent = fmt(s.pop);
  $('s-fel').textContent = s.felicidade + '%';
  $('s-xp').textContent = fmt(s.xp);

  const n = nivelAtual(), prox = NIVEIS[n + 1];
  $('barra-xp').style.width = prox ? ((s.xp - NIVEIS[n].xp) / (prox.xp - NIVEIS[n].xp) * 100) + '%' : '100%';

  renderMapa();
  renderConstruir(c);
  renderMissoes();
  renderVade();
  renderDiario();
  $('dica').innerHTML = s.selecionado
    ? `Construindo <b>${PREDIOS[s.selecionado].icone} ${PREDIOS[s.selecionado].nome}</b> — clique num terreno vazio. <button class="link" id="cancelar-sel">Cancelar</button>`
    : (c.faltas.length ? `⚠️ Faltam serviços públicos: ${c.faltas.map(k => SERVICOS[k]).join(', ')}.` : 'Escolha um prédio no painel e clique num terreno vazio para construir.');
  const cs = $('cancelar-sel');
  if (cs) cs.onclick = () => { s.selecionado = null; render(); };
  salvar();
}

function renderMapa() {
  const m = $('mapa');
  m.innerHTML = '';
  s.mapa.forEach((t, i) => {
    const b = document.createElement('button');
    b.className = 'lote';
    b.setAttribute('role', 'gridcell');
    if (!t) {
      b.classList.add('vazio');
      if (s.selecionado) b.classList.add('alvo');
      b.setAttribute('aria-label', 'Terreno vazio');
      b.onclick = () => construirEm(i);
    } else if (t.tipo === 'agua') {
      b.classList.add('agua'); b.textContent = '🌊'; b.disabled = true;
      b.setAttribute('aria-label', 'Rio');
    } else {
      const p = PREDIOS[t.tipo];
      b.classList.add('predio');
      b.style.setProperty('--cor', p.cor);
      b.textContent = p.icone;
      b.title = `${p.nome} — ${p.area}`;
      b.setAttribute('aria-label', p.nome);
      b.onclick = () => abrirPredio(i);
    }
    m.appendChild(b);
  });
}

function renderConstruir(c) {
  const n = nivelAtual();
  let h = `<div class="resumo-financas">
    <span>Receita/mês: <b class="pos">+${fmt(c.renda)}</b></span>
    <span>Manutenção/mês: <b class="neg">−${fmt(c.manut)}</b></span>
  </div><ul class="lista-predios">`;
  for (const k in PREDIOS) {
    if (k === 'prefeitura') continue;
    const p = PREDIOS[k];
    const bloqueado = p.nivel > n;
    const jaUnico = p.unico && conta(s, k) > 0;
    const temLicenca = !!s.licencas[k];
    const efeitos = [
      p.efeito.renda ? `💰+${p.efeito.renda}` : '',
      p.efeito.manutencao ? `🔧−${p.efeito.manutencao}` : '',
      p.efeito.pop ? `👥+${p.efeito.pop}` : '',
      p.efeito.felicidade ? `😊${p.efeito.felicidade > 0 ? '+' : ''}${p.efeito.felicidade}` : '',
    ].filter(Boolean).join(' ');
    let acao;
    if (bloqueado) acao = `<span class="selo">🔒 ${NIVEIS[p.nivel].titulo}</span>`;
    else if (jaUnico) acao = `<span class="selo">✔ Construído</span>`;
    else if (!temLicenca) acao = `<button class="btn pequeno" data-licenca="${k}">📝 Licença</button>`;
    else acao = `<button class="btn pequeno primario" data-construir="${k}" ${s.dinheiro < p.custo ? 'disabled' : ''}>💰 ${p.custo}</button>`;
    h += `<li class="item-predio ${bloqueado ? 'bloqueado' : ''} ${s.selecionado === k ? 'sel' : ''}" style="--cor:${p.cor}">
      <span class="item-icone">${p.icone}</span>
      <div class="item-info"><b>${p.nome}</b><small>${p.area}</small><small class="efeitos">${efeitos}${p.bonus ? ' · ' + p.bonus : ''}</small></div>
      ${acao}</li>`;
  }
  h += '</ul>';
  const el = $('aba-construir');
  el.innerHTML = h;
  el.querySelectorAll('[data-licenca]').forEach(b => b.onclick = () => abrirAula(b.dataset.licenca, true));
  el.querySelectorAll('[data-construir]').forEach(b => b.onclick = () => {
    s.selecionado = s.selecionado === b.dataset.construir ? null : b.dataset.construir;
    render();
    if (s.selecionado && window.innerWidth < 900) $('mapa').scrollIntoView({ behavior: 'smooth', block: 'center' });
  });
}

function renderMissoes() {
  let h = '<ul class="lista-missoes">';
  MISSOES.forEach(m => {
    const feita = s.missoesFeitas[m.id];
    h += `<li class="${feita ? 'feita' : ''}"><span>${feita ? '✅' : '⬜'}</span><div><b>${m.texto}</b><small>Recompensa: 📚 ${m.xp} XP · 💰 ${m.din}</small></div></li>`;
  });
  h += '</ul>';
  const total = s.casosResolvidos;
  h += `<p class="placar">Casos resolvidos: <b>${total}</b> · Acertos: <b>${s.acertos}</b>${total ? ` (${Math.round(s.acertos / total * 100)}%)` : ''}</p>`;
  $('aba-missoes').innerHTML = h;
}

function renderVade() {
  let h = '<p class="intro-vade">Tudo o que você aprendeu fica guardado aqui para consulta.</p>';
  for (const k in PREDIOS) {
    const p = PREDIOS[k];
    if (!s.licencas[k]) { h += `<div class="cartao-lei trancado"><span>🔒</span> ${p.area}</div>`; continue; }
    h += `<details class="cartao-lei" style="--cor:${p.cor}"><summary>${p.icone} ${p.area}</summary>
      <p class="resumo">${p.aula.resumo}</p><ul>${p.aula.pontos.map(x => `<li>${x}</li>`).join('')}</ul>
      <p class="pratica"><b>Na prática:</b> ${p.aula.pratica}</p></details>`;
  }
  if (s.aprendidos.length) {
    h += '<h3>Casos que você resolveu</h3><ul class="lista-casos">';
    s.aprendidos.forEach(i => { const c = CASOS[i]; h += `<li><b>${c.titulo}</b><small>${c.base}</small></li>`; });
    h += '</ul>';
  }
  $('aba-vade').innerHTML = h;
}

function renderDiario() {
  $('diario').innerHTML = s.diario.slice(0, 12).map(d => `<li><span class="d-mes">Mês ${d.mes}</span> ${d.texto}</li>`).join('');
}

/* ── Modal ────────────────────────────────────────────────────────────────── */
function abrirModal(html, aoAbrir) {
  $('modal-caixa').innerHTML = html;
  $('modal').classList.remove('oculto');
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

function iniciarProva(tipo) {
  const p = PREDIOS[tipo];
  const perguntas = embaralhar(p.licenca).slice(0, 3);
  const minimo = Math.min(2, perguntas.length);
  let idx = 0, acertos = 0;

  const mostrar = () => {
    const q = perguntas[idx];
    const ordem = embaralhar(q.ops.map((t, i) => ({ t, i })));
    abrirModal(`<div class="cab-modal" style="--cor:${p.cor}"><span class="icone-grande">📝</span>
        <div><small>Licença · ${p.area} · Pergunta ${idx + 1} de ${perguntas.length}</small><h2>${q.p}</h2></div></div>
      <div class="opcoes">${ordem.map(o => `<button class="opcao" data-i="${o.i}">${esc(o.t)}</button>`).join('')}</div>
      <div id="feedback"></div>`, cx => {
      cx.querySelectorAll('.opcao').forEach(b => b.onclick = () => {
        const certo = +b.dataset.i === q.c;
        if (certo) { acertos++; ganharXp(10); }
        cx.querySelectorAll('.opcao').forEach(o => {
          o.disabled = true;
          if (+o.dataset.i === q.c) o.classList.add('certa');
        });
        if (!certo) b.classList.add('errada');
        const ultima = idx === perguntas.length - 1;
        cx.querySelector('#feedback').innerHTML = `<div class="explicacao ${certo ? 'ok' : 'erro'}">
          <b>${certo ? '✅ Correto!' : '❌ Não é bem assim.'}</b> ${q.exp}</div>
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
    }
    abrirModal(`<div class="resultado ${passou ? 'ok' : 'erro'}">
        <span class="icone-grande">${passou ? '🏅' : '📚'}</span>
        <h2>${passou ? 'Licença aprovada!' : 'Ainda não foi desta vez'}</h2>
        <p>Você acertou <b>${acertos} de ${perguntas.length}</b>. ${passou
          ? `Agora você pode construir <b>${p.nome}</b> na cidade.`
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
  if (s.dinheiro < p.custo) { toast('💸 Orçamento insuficiente.'); s.selecionado = null; render(); return; }
  s.dinheiro -= p.custo;
  s.mapa[i] = { tipo };
  if (conta(s, tipo) === 1) registrar(`🏗️ Inaugurado(a): <b>${p.icone} ${p.nome}</b>.`);
  if (p.unico || s.dinheiro < p.custo) s.selecionado = null;
  verificarMissoes();
  render();
}

function abrirPredio(i) {
  const p = PREDIOS[s.mapa[i].tipo];
  const tipo = s.mapa[i].tipo;
  abrirModal(`<div class="cab-modal" style="--cor:${p.cor}"><span class="icone-grande">${p.icone}</span>
      <div><small>${p.area}</small><h2>${p.nome}</h2></div></div>
    ${htmlAula(p)}
    <div class="botoes">
      ${tipo !== 'prefeitura' ? `<button class="btn perigo" id="m-demolir">Demolir (+${Math.floor(p.custo / 2)})</button>` : ''}
      <button class="btn primario" id="m-fechar">Fechar</button>
    </div>`, cx => {
    cx.querySelector('#m-fechar').onclick = fecharModal;
    const d = cx.querySelector('#m-demolir');
    if (d) d.onclick = () => {
      s.mapa[i] = null; s.dinheiro += Math.floor(p.custo / 2);
      registrar(`🚧 Demolido(a): ${p.icone} ${p.nome}.`);
      fecharModal(); render();
    };
  });
}

/* ── Passagem do tempo ────────────────────────────────────────────────────── */
function proximoMes() {
  const c = atualizarIndicadores();
  const saldo = c.renda - c.manut;
  s.dinheiro += saldo;
  s.mes++;
  registrar(`📅 Balanço do mês: ${saldo >= 0 ? '+' : ''}${fmt(saldo)} · ${fmt(c.pop)} habitantes · ${c.fel}% de felicidade.`);
  if (s.dinheiro < 0) {
    registrar('⚠️ Contas no vermelho! A <b>Lei de Responsabilidade Fiscal (LC 101/2000)</b> exige equilíbrio entre receitas e despesas.');
    s.reputacao = Math.max(-30, s.reputacao - 3);
  }
  // reputação volta lentamente ao neutro
  if (s.reputacao > 0) s.reputacao -= 0.5;
  verificarMissoes();
  render();
  if (Math.random() < 0.8) setTimeout(sortearCaso, 250);
}

function sortearCaso() {
  const presentes = new Set(s.mapa.filter(t => t && PREDIOS[t.tipo]).map(t => t.tipo));
  let disponiveis = CASOS.map((c, i) => i).filter(i => presentes.has(CASOS[i].predio));
  let novos = disponiveis.filter(i => !s.casosVistos.includes(i));
  if (!novos.length) {
    // todos os casos disponíveis já foram vistos: recomeça o ciclo
    s.casosVistos = s.casosVistos.filter(i => !disponiveis.includes(i));
    novos = disponiveis;
  }
  if (!novos.length) return;
  abrirCaso(novos[Math.floor(Math.random() * novos.length)]);
}

function abrirCaso(i) {
  const c = CASOS[i], p = PREDIOS[c.predio];
  s.casosVistos.push(i);
  const ordem = embaralhar(c.ops.map((t, k) => ({ t, k })));
  abrirModal(`<div class="cab-modal" style="--cor:${p.cor}"><span class="icone-grande">${p.icone}</span>
      <div><small>Caso da cidade · ${p.area}</small><h2>${c.titulo}</h2></div></div>
    <blockquote class="fala"><b>${c.quem}:</b> “${c.texto}”</blockquote>
    <p class="pergunta">O que você responde?</p>
    <div class="opcoes">${ordem.map(o => `<button class="opcao" data-k="${o.k}">${esc(o.t)}</button>`).join('')}</div>
    <div id="feedback"></div>`, cx => {
    cx.querySelectorAll('.opcao').forEach(b => b.onclick = () => {
      const certo = +b.dataset.k === c.c;
      s.casosResolvidos++;
      cx.querySelectorAll('.opcao').forEach(o => { o.disabled = true; if (+o.dataset.k === c.c) o.classList.add('certa'); });
      if (certo) {
        s.acertos++; ganharXp(15); s.dinheiro += 40;
        s.reputacao = Math.min(30, s.reputacao + 3);
        registrar(`✅ Caso "<b>${c.titulo}</b>" resolvido conforme a lei (${c.base}).`);
      } else {
        b.classList.add('errada'); ganharXp(5);
        s.reputacao = Math.max(-30, s.reputacao - 4);
        registrar(`❌ Caso "<b>${c.titulo}</b>" mal resolvido — a cidade reclamou. Base: ${c.base}.`);
      }
      if (!s.aprendidos.includes(i)) s.aprendidos.push(i);
      cx.querySelector('#feedback').innerHTML = `<div class="explicacao ${certo ? 'ok' : 'erro'}">
          <b>${certo ? '✅ Decisão correta! +15 XP, +40 💰' : '❌ Decisão equivocada. +5 XP pelo aprendizado'}</b> ${c.exp}
          <small class="base">📌 ${c.base}</small></div>
        <div class="botoes"><button class="btn primario" id="m-ok">Continuar</button></div>`;
      cx.querySelector('#m-ok').onclick = () => { fecharModal(); verificarMissoes(); render(); };
      cx.querySelector('#m-ok').focus();
    });
  });
}

function verificarMissoes() {
  atualizarIndicadores();
  MISSOES.forEach(m => {
    if (!s.missoesFeitas[m.id] && m.ok(s)) {
      s.missoesFeitas[m.id] = true;
      s.dinheiro += m.din;
      ganharXp(m.xp);
      registrar(`🎯 Missão cumprida: <b>${m.texto}</b> (+${m.xp} XP, +${m.din} 💰).`);
      toast(`🎯 Missão cumprida: ${m.texto}`);
    }
  });
}

/* ── Início ───────────────────────────────────────────────────────────────── */
function boasVindas() {
  abrirModal(`<div class="resultado"><span class="icone-grande">🏛️</span>
      <h2>Bem-vindo(a), Prefeito(a)!</h2>
      <p>Você vai administrar uma cidade e, ao mesmo tempo, aprender como funciona a legislação brasileira.</p></div>
    <ol class="como-jogar">
      <li><b>Estude</b> a aula de cada área do Direito e <b>tire a licença</b> para liberar o prédio.</li>
      <li><b>Construa</b> casas, mercados, escolas, fóruns… cada um gera renda, população ou felicidade.</li>
      <li><b>Avance os meses</b> e resolva os <b>casos dos cidadãos</b> aplicando a lei.</li>
      <li>Ganhe <b>conhecimento</b>, suba de título (de Estudante a Ministro do STF) e libere novas áreas.</li>
    </ol>
    <label class="campo">Nome da sua cidade<input id="m-nome" maxlength="30" value="Cidade Legal"></label>
    <div class="botoes"><button class="btn primario" id="m-comecar">Começar mandato ▶</button></div>`, cx => {
    cx.querySelector('#m-comecar').onclick = () => {
      s.nome = cx.querySelector('#m-nome').value.trim() || 'Cidade Legal';
      registrar(`🏛️ Fundação de <b>${esc(s.nome)}</b>. A Prefeitura abre as portas — clique nela para a primeira aula.`);
      fecharModal(); render();
    };
  });
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
  s.selecionado = null;
  render();
  if (!salvo) boasVindas();

  $('btn-mes').onclick = proximoMes;
  $('btn-tema').onclick = () => {
    const escuro = document.documentElement.dataset.theme
      ? document.documentElement.dataset.theme === 'dark'
      : matchMedia('(prefers-color-scheme: dark)').matches;
    const novo = escuro ? 'light' : 'dark';
    aplicarTema(novo);
    try { localStorage.setItem('cidade-legal-tema', novo); } catch (e) { /* ignora */ }
  };
  $('btn-reiniciar').onclick = () => {
    if (!confirm('Reiniciar o jogo? Todo o progresso será perdido.')) return;
    s = novoEstado(); render(); boasVindas();
  };
  document.querySelectorAll('.aba').forEach(a => a.onclick = () => {
    document.querySelectorAll('.aba').forEach(x => x.classList.toggle('ativa', x === a));
    document.querySelectorAll('.conteudo-aba').forEach(x => x.classList.toggle('oculto', x.id !== 'aba-' + a.dataset.aba));
  });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      // casos e provas não podem ser pulados com Esc; só aulas/informações
      if (!$('modal').classList.contains('oculto') && $('modal-caixa').querySelector('#m-fechar')) fecharModal();
      else if (s.selecionado) { s.selecionado = null; render(); }
    }
  });
});
