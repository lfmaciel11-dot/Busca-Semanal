/* ══════════════════════════════════════════════════════════════════════════
   CIDADE LEGAL — Cidade viva
   Indicadores da cidade, desafios com prazo, medalhas, audiências no Fórum,
   licitação de obras públicas, orçamento participativo, crescimento dos bairros,
   revisão espaçada, turma (código de entrega, painel e competição) e
   acessibilidade do próprio jogo (narração, fonte grande, alto contraste, atalhos).
══════════════════════════════════════════════════════════════════════════ */

/* ── Indicadores (0 a 100) ────────────────────────────────────────────────── */
const INDICADORES = [
  ['mobilidade', '🚌', 'Mobilidade'], ['acessibilidade', '♿', 'Acessibilidade'], ['ambiente', '🌳', 'Meio ambiente'],
  ['seguranca', '🛡️', 'Segurança'], ['saude', '🏥', 'Saúde e saneamento'],
];
function indicadores() {
  const c = calcular(), n = k => conta(s, k), lim = v => Math.max(0, Math.min(100, Math.round(v))), falta = k => c.faltas.includes(k);
  const v = {
    mobilidade: lim(20 + n('terminal') * 12 + n('pontoAcessivel') * 8 + n('pontoOnibus') * 3 + n('ciclovia') * 5 + n('faixaOnibus') * 6 +
      n('estacaoTrem') * 15 + n('micromobilidade') * 8 + n('rotatoria') * 4 + n('ruaLocal') * .5 - Math.max(0, c.pop - 150) / 20),
    acessibilidade: lim(10 + n('rampa') * 8 + n('pisoTatil') * 6 + n('vagaPcd') * 6 + n('vagaIdoso') * 3 + n('semaforoSonoro') * 8 + n('pontoAcessivel') * 10 + n('semaforoPedestre') * 4),
    ambiente: lim(40 + n('parque') * 8 + n('arvore') * 1.5 + n('praca') * 3 + n('canteiro') + n('lagoa') * 3 + n('aterro') * 10 + n('ecoponto') * 8 + n('esgoto') * 8 + n('usina') * 6
      - n('industria') * 10 - n('fabrica') * 5 - n('pecuaria') * 2 - (falta('esgoto') ? 15 : 0)),
    seguranca: lim(20 + n('delegacia') * 15 + n('bombeiros') * 12 + n('iluminacao') * 10 + n('faixaPedestre') * 3 + n('semaforoPedestre') * 4 + n('radar') * 4 + n('lombada') * 2
      - (falta('seguranca') ? 15 : 0) - Math.max(0, c.pop - 100) / 15),
    saude: lim(25 + n('saude') * 15 + Math.min(n('estacaoAgua'), 3) * 10 + Math.min(n('esgoto'), 3) * 8 - ['saude', 'agua', 'esgoto'].filter(falta).length * 15),
  };
  v.geral = Math.round(INDICADORES.reduce((t, [k]) => t + v[k], 0) / INDICADORES.length);
  return v;
}
function htmlIndicadores(v = indicadores()) {
  const cor = x => x >= 70 ? 'bom' : x >= 45 ? 'medio' : 'fraco';
  return `<div class="painel-cidade"><h3>📊 Painel da cidade <small>índice geral <b>${v.geral}</b>/100</small></h3>
    ${INDICADORES.map(([k, ic, nome]) => `<div class="indicador"><span>${ic} ${nome}</span><span class="barra-pct ${cor(v[k])}"><i style="width:${v[k]}%"></i></span><b>${v[k]}</b></div>`).join('')}</div>`;
}

/* ── Desafios com prazo ───────────────────────────────────────────────────── */
const DESAFIOS = [
  { id: 'acessivel', icone: '♿', titulo: 'Bairro acessível', texto: 'Instale 3 rampas, 2 trechos de piso tátil e 1 ponto de ônibus acessível.', prazo: 12, xp: 60, din: 400,
    ok: () => conta(s, 'rampa') >= 3 && conta(s, 'pisoTatil') >= 2 && conta(s, 'pontoAcessivel') >= 1, lei: 'Acessibilidade é direito da pessoa com deficiência (Lei 13.146/2015, art. 53).' },
  { id: 'saneamento', icone: '🚰', titulo: 'Meta do saneamento', texto: 'Tenha 2 estações de água e 2 de esgoto, sem faltar esses serviços.', prazo: 18, xp: 60, din: 450,
    ok: () => conta(s, 'estacaoAgua') >= 2 && conta(s, 'esgoto') >= 2 && !calcular().faltas.some(f => ['agua', 'esgoto'].includes(f)),
    lei: 'O Novo Marco do Saneamento quer 99% da população com água e 90% com esgoto tratado até 2033 (Lei 14.026/2020).' },
  { id: 'transito', icone: '🚦', titulo: 'Trânsito seguro', texto: 'Instale 2 travessias (faixa ou semáforo de pedestres), 1 radar e 1 lombada.', prazo: 10, xp: 50, din: 300,
    ok: () => conta(s, 'faixaPedestre') + conta(s, 'semaforoPedestre') >= 2 && conta(s, 'radar') >= 1 && conta(s, 'lombada') >= 1,
    lei: 'O trânsito seguro é direito de todos e dever dos órgãos de trânsito (CTB, art. 1º, §2º).' },
  { id: 'verde', icone: '🌳', titulo: 'Cidade verde', texto: 'Leve o indicador de meio ambiente a 70 ou mais.', prazo: 12, xp: 60, din: 400,
    ok: () => indicadores().ambiente >= 70, lei: 'Todos têm direito ao meio ambiente ecologicamente equilibrado (CF, art. 225).' },
  { id: 'mobilidade', icone: '🚌', titulo: 'Mobilidade para todos', texto: 'Leve o indicador de mobilidade a 70 ou mais.', prazo: 15, xp: 60, din: 400,
    ok: () => indicadores().mobilidade >= 70, lei: 'A Política Nacional de Mobilidade Urbana prioriza o transporte coletivo e os modos não motorizados (Lei 12.587/2012).' },
];
function aceitarDesafio(id) {
  const d = DESAFIOS.find(x => x.id === id);
  s.desafio = { id, ate: s.mes + d.prazo };
  registrar(`🏁 Desafio aceito: <b>${d.icone} ${d.titulo}</b>, até ${nomeMes(s.desafio.ate)} do Ano ${anoDe(s.desafio.ate)}.`);
  toast(`🏁 Desafio aceito: ${d.titulo}. Prazo: ${d.prazo} meses.`);
  som('clique'); render();
}
function verificarDesafio(fimDoMes) {
  if (!s.desafio) return;
  const d = DESAFIOS.find(x => x.id === s.desafio.id);
  if (d.ok()) {
    s.desafiosFeitos = s.desafiosFeitos || {}; s.desafiosFeitos[d.id] = true; s.desafio = null;
    s.dinheiro += d.din; ganharXp(d.xp);
    registrar(`🏆 Desafio cumprido: <b>${d.icone} ${d.titulo}</b> (+${d.xp} XP, +${d.din} 💰). ${d.lei}`);
    setTimeout(() => { toast(`🏆 Desafio cumprido: ${d.titulo}!`, true); confete(80); som('nivel'); }, 300);
  } else if (fimDoMes && s.mes > s.desafio.ate) {
    s.desafio = null; s.reputacao = Math.max(-30, s.reputacao - 3);
    registrar(`⌛ O prazo do desafio <b>${d.titulo}</b> acabou. Dá para tentar de novo na aba Missões.`);
    toast(`⌛ O prazo do desafio "${d.titulo}" acabou.`);
  }
}
function htmlDesafios() {
  const feitos = s.desafiosFeitos || {}, ativo = s.desafio && DESAFIOS.find(x => x.id === s.desafio.id);
  let h = '<h3>🏁 Desafios com prazo</h3>';
  if (ativo) h += `<div class="desafio ativo"><b>${ativo.icone} ${ativo.titulo}</b><small>${ativo.texto}</small>
    <small>⏳ faltam <b>${Math.max(0, s.desafio.ate - s.mes)}</b> mês(es) · prêmio 📚 ${ativo.xp} XP e 💰 ${ativo.din}</small></div>`;
  h += '<ul class="lista-desafios">' + DESAFIOS.filter(d => d !== ativo).map(d => `<li class="${feitos[d.id] ? 'feita' : ''}">
    <span>${feitos[d.id] ? '🏆' : d.icone}</span><div><b>${d.titulo}</b><small>${d.texto} Prazo: ${d.prazo} meses.</small></div>
    ${feitos[d.id] ? '' : `<button class="btn pequeno" data-desafio="${d.id}" ${ativo ? 'disabled title="Termine o desafio atual primeiro"' : ''}>Aceitar</button>`}</li>`).join('') + '</ul>';
  return h;
}

/* ── Medalhas por área do Direito ─────────────────────────────────────────── */
const NOMES_MEDALHA = { 'Direito do Consumidor': 'Defensor(a) do Consumidor', 'Direito Ambiental': 'Guardiã(o) do Meio Ambiente', 'Direito do Trabalho': 'Amigo(a) do Trabalhador',
  'Direito Penal e Processo Penal': 'Xerife da Legalidade', 'Direito Civil — Propriedade': 'Mestre da Propriedade', 'Direito Tributário': 'Fera dos Tributos' };
function medalhasGanhas() {
  return linhasDesempenho().filter(l => l.ok >= 4 && l.pct >= 70).map(l => ({ area: l.area, nome: NOMES_MEDALHA[l.area] || `Especialista em ${l.area}` }));
}
function verificarMedalhas() {
  s.medalhas = s.medalhas || [];
  medalhasGanhas().forEach(m => {
    if (s.medalhas.includes(m.area)) return;
    s.medalhas.push(m.area); ganharXp(20);
    registrar(`🥇 Medalha conquistada: <b>${m.nome}</b>.`);
    setTimeout(() => { toast(`🥇 Medalha: ${m.nome}!`, true); confete(40); }, 600);
  });
}
const htmlMedalhas = () => `<h3>🥇 Medalhas</h3>${(s.medalhas || []).length
  ? `<div class="medalhas">${medalhasGanhas().filter(m => s.medalhas.includes(m.area)).map(m => `<span class="medalha" title="${esc(m.area)}">🥇 ${esc(m.nome)}</span>`).join('')}</div>`
  : '<p class="nota">Acerte pelo menos 4 respostas numa área do Direito, com 70% de aproveitamento, para ganhar a medalha dela.</p>'}`;

/* ── Audiências no Fórum: o jogador ouve as duas partes e decide ─────────── */
const AUDIENCIAS = [
  { titulo: 'A geladeira que parou', area: 'Direito do Consumidor',
    autor: ['🙋‍♀️ Sra. Beatriz, consumidora', 'Comprei uma geladeira e ela parou com 20 dias. A loja diz que eu tenho que me virar com o fabricante.'],
    reu: ['🏬 Loja Eletrocasa', 'Nós só revendemos. O defeito é de fábrica, a responsabilidade é do fabricante.'],
    ops: ['A loja tem razão: só o fabricante responde', 'Loja e fabricante respondem juntos pelo defeito; se não consertarem em 30 dias, a consumidora escolhe troca, devolução do dinheiro ou abatimento', 'Ninguém responde, era uma promoção'], c: 1,
    exp: 'Pelo vício do produto respondem solidariamente todos os fornecedores da cadeia, inclusive o comerciante. Se o defeito não for sanado em 30 dias, a escolha é do consumidor.', base: 'CDC, art. 18, caput e §1º' },
  { titulo: 'Festa todo fim de semana', area: 'Direito Civil — Propriedade',
    autor: ['😴 Sr. Moacir, vizinho', 'Toda sexta e todo sábado tem som altíssimo até as 4 da manhã na casa ao lado. Ninguém consegue dormir.'],
    reu: ['🎉 Rafael, dono da casa', 'A casa é minha. Na minha propriedade eu faço o que eu quiser.'],
    ops: ['O dono pode tudo na própria casa', 'O vizinho pode exigir que pare: o uso que prejudica o sossego dos vizinhos é anormal e pode ser impedido', 'Só a polícia pode decidir, a Justiça não'], c: 1,
    exp: 'O direito de propriedade tem limites: o vizinho pode fazer cessar as interferências prejudiciais ao sossego, à saúde e à segurança.', base: 'Código Civil, art. 1.277' },
  { titulo: 'Dois anos sem carteira', area: 'Direito do Trabalho',
    autor: ['👩‍🍳 Dona Neusa, trabalhadora', 'Trabalhei dois anos na casa dele, de segunda a sexta, com salário todo mês, e nunca assinaram minha carteira.'],
    reu: ['🧔 Sr. Otávio, patrão', 'Ela me ajudava. Era um favor, não um emprego.'],
    ops: ['Era só ajuda, sem direitos', 'Há vínculo de emprego doméstico: trabalho contínuo, pessoal, subordinado e pago dá direito a registro, férias, 13º e FGTS', 'Ela só teria direito se tivesse contrato escrito'], c: 1,
    exp: 'O emprego doméstico existe quando o serviço é contínuo (mais de 2 dias por semana), pessoal, subordinado e remunerado, mesmo sem contrato escrito.', base: 'LC 150/2015, art. 1º; CLT, art. 3º' },
  { titulo: 'A pensão atrasada', area: 'Direito de Família',
    autor: ['👩‍👦 Juliana, mãe do Pedro', 'O pai do meu filho parou de pagar a pensão há três meses. Ele diz que perdeu o emprego.'],
    reu: ['👨 Marcos, pai do Pedro', 'Fiquei desempregado. Sem salário, parei de pagar e pronto.'],
    ops: ['Desempregado não deve pensão', 'A pensão continua devida até a Justiça mudar o valor; ele pode pedir revisão, mas não pode simplesmente parar, e a dívida pode até levar à prisão civil', 'Basta ele avisar a mãe'], c: 1,
    exp: 'Se a situação financeira muda, o devedor pode pedir a revisão do valor na Justiça. Enquanto isso, a pensão fixada continua valendo, e o atraso pode levar à prisão civil.', base: 'Código Civil, art. 1.699; CPC, art. 528; CF, art. 5º, LXVII' },
  { titulo: 'O rio contaminado', area: 'Direito Ambiental',
    autor: ['🎣 Associação de pescadores', 'A fábrica jogou resíduos no rio e os peixes morreram. Perdemos nosso sustento.'],
    reu: ['🏭 Indústria Química Delta', 'Nós temos licença ambiental. Se a prefeitura deixou funcionar, não temos culpa.'],
    ops: ['Com licença, a empresa não responde', 'A empresa responde mesmo com licença: a responsabilidade ambiental é objetiva, e ela deve reparar o rio e indenizar os pescadores', 'Só a prefeitura paga'], c: 1,
    exp: 'Ter licença não autoriza poluir nem afasta o dever de reparar: quem causa o dano ambiental responde independentemente de culpa.', base: 'Lei 6.938/1981, art. 14, §1º' },
];
function gerarAudiencia() {
  const forum = s.mapa.findIndex(l => l && l.tipo === 'forum');
  if (forum < 0 || s.pendentes.some(p => p.aud !== undefined)) return null;
  const vistas = s.audienciasVistas = s.audienciasVistas || [];
  let livres = AUDIENCIAS.map((_, k) => k).filter(k => !vistas.includes(k));
  if (!livres.length) { s.audienciasVistas = []; livres = AUDIENCIAS.map((_, k) => k); }
  const aud = livres[Math.floor(Math.random() * livres.length)];
  s.audienciasVistas.push(aud);
  const pend = { aud, tile: forum, expira: s.mes + PRAZO_CASO };
  s.pendentes.push(pend);
  setTimeout(() => { som('alerta'); toast('⚖️ Uma audiência foi marcada no Fórum. Clique no balão para ouvir as partes e decidir.'); }, 1400);
  return pend;
}
function abrirAudiencia(pend) {
  const a = AUDIENCIAS[pend.aud], ordem = embaralhar(a.ops.map((t, k) => ({ t, i: k })));
  const parte = ([quem, fala], lado) => `<div class="parte ${lado}"><span class="avatar">${quem.split(' ')[0]}</span>
    <blockquote class="fala"><b>${quem.split(' ').slice(1).join(' ')}</b>${fala}</blockquote></div>`;
  abrirModal(`<div class="cab-modal" style="--cor:#5D4037"><span class="icone-grande">⚖️</span>
      <div><small>Audiência no Fórum · ${a.area}</small><h2>${a.titulo}</h2></div></div>
    <div class="audiencia">${parte(a.autor, 'autor')}${parte(a.reu, 'reu')}</div>
    <p class="pergunta">Você é o(a) juiz(a). Qual é a decisão?</p>
    ${htmlOpcoes(ordem, 'k')}<div id="feedback"></div>
    <div class="botoes" id="m-depois-box"><button class="btn" id="m-depois">Decidir depois</button></div>`, cx => {
    cx.querySelector('#m-depois').onclick = fecharModal;
    cx.querySelectorAll('.opcao').forEach(b => b.onclick = () => {
      const certo = +b.dataset.k === a.c;
      s.casosResolvidos++; registrarDesempenho(a.area, 'caso', certo);
      s.pendentes = s.pendentes.filter(x => x !== pend);
      cx.querySelector('#m-depois-box').remove();
      cx.querySelectorAll('.opcao').forEach(o => { o.disabled = true; if (+o.dataset.k === a.c) o.classList.add('certa'); });
      if (certo) { s.acertos++; ganharXp(20); s.dinheiro += 60; s.reputacao = Math.min(30, s.reputacao + 3); som('certo'); registrar(`⚖️ Sentença justa em "<b>${a.titulo}</b>" (${a.base}).`); }
      else { b.classList.add('errada'); ganharXp(5); s.reputacao = Math.max(-30, s.reputacao - 3); som('erro'); agendarRevisao({ t: 'aud', k: pend.aud }); registrar(`⚖️ A sentença em "<b>${a.titulo}</b>" foi reformada pelo tribunal. Base: ${a.base}.`); }
      cx.querySelector('#feedback').innerHTML = `<div class="explicacao ${certo ? 'ok' : 'erro'}"><b>${certo ? '✅ Sentença correta! +20 XP, +60 💰' : '❌ Essa decisão seria reformada no recurso. +5 XP'}</b> ${a.exp}
        <small class="base">📌 ${a.base}</small></div><div class="botoes"><button class="btn primario" id="m-ok">Encerrar a audiência</button></div>`;
      cx.querySelector('#m-ok').onclick = () => { fecharModal(); verificarMissoes(); render(); };
    });
  });
}

/* ── Licitação das obras públicas ─────────────────────────────────────────── */
const OBRAS_PUBLICAS = ['escola', 'saude', 'delegacia', 'bombeiros', 'forum', 'camara', 'terminal', 'estacaoAgua', 'esgoto', 'usina', 'aterro', 'estacaoTrem', 'pontoAcessivel', 'fazenda', 'inss', 'rodoviaria'];
const precisaLicitacao = tipo => OBRAS_PUBLICAS.includes(tipo) && PREDIOS[tipo].custo >= 200;
function abrirLicitacao(tipo, i) {
  const p = PREDIOS[tipo], preco = f => Math.round(p.custo * f);
  const propostas = embaralhar([
    { id: 'certa', nome: '🏗️ Construtora Horizonte', txt: `Proposta de 💰 ${preco(.9)}. Apresentou todos os documentos de habilitação (certidões, capacidade técnica).`, custo: preco(.9) },
    { id: 'parente', nome: '👨‍👩‍👦 Construtora Irmãos Lima', txt: `Proposta de 💰 ${preco(.8)}. É do cunhado do prefeito.`, custo: p.custo },
    { id: 'semdoc', nome: '🧾 ObraFácil Ltda.', txt: `Proposta de 💰 ${preco(.7)}. Não apresentou as certidões nem a prova de capacidade técnica.`, custo: p.custo },
  ]);
  const EXP = { certa: 'Venceu a proposta de menor preço entre as empresas que cumpriram os requisitos de habilitação. Economia para a cidade!',
    parente: 'Não pode: a lei impede que dispute a licitação quem é parente, até o terceiro grau, de dirigente do órgão que contrata. Cunhado é parente por afinidade.',
    semdoc: 'Preço baixo não basta: a empresa precisa comprovar a habilitação jurídica, fiscal, técnica e econômica. Sem isso, a proposta é desclassificada.' };
  abrirModal(`<div class="cab-modal" style="--cor:#1F3A5F"><span class="icone-grande">📑</span>
      <div><small>Licitação · Lei 14.133/2021</small><h2>Obra: ${p.icone} ${p.nome}</h2></div></div>
    <p>Obra pública é contratada por licitação. Três empresas mandaram propostas. Qual deve vencer?</p>
    <div class="opcoes">${propostas.map(x => `<button class="opcao" data-prop="${x.id}"><span>${x.nome}<small>${x.txt}</small></span></button>`).join('')}</div>
    <div id="feedback"></div><div class="botoes" id="m-cancelar-box"><button class="btn" id="m-cancelar">Cancelar a obra</button></div>`, cx => {
    cx.querySelector('#m-cancelar').onclick = () => { fecharModal(); };
    cx.querySelectorAll('[data-prop]').forEach(b => b.onclick = () => {
      const x = propostas.find(q => q.id === b.dataset.prop), certo = x.id === 'certa';
      registrarDesempenho('Licitações e contratos', 'caso', certo);
      cx.querySelector('#m-cancelar-box').remove();
      cx.querySelectorAll('[data-prop]').forEach(o => { o.disabled = true; if (o.dataset.prop === 'certa') o.classList.add('certa'); });
      if (certo) { ganharXp(15); som('certo'); } else { b.classList.add('errada'); s.reputacao = Math.max(-30, s.reputacao - 4); som('erro'); agendarRevisao({ t: 'licitacao', k: tipo }); }
      cx.querySelector('#feedback').innerHTML = `<div class="explicacao ${certo ? 'ok' : 'erro'}"><b>${certo ? `✅ Licitação correta! A obra sai por 💰 ${x.custo} (+15 XP)` : '❌ O Tribunal de Contas apontou irregularidade: a licitação foi refeita e a obra saiu pelo preço cheio.'}</b>
        ${EXP[x.id]}<small class="base">📌 Lei 14.133/2021, arts. 14, IV, 33, 62 e 63; CF, art. 37, XXI</small></div>
        <div class="botoes"><button class="btn primario" id="m-ok">🏗️ Construir</button></div>`;
      cx.querySelector('#m-ok').onclick = () => { fecharModal(); s.selecionado = tipo; construirEm(i, certo ? x.custo : p.custo); };
    });
  });
}

/* ── Orçamento participativo (a cada 6 meses) ─────────────────────────────── */
function abrirOrcamentoParticipativo() {
  const v = indicadores(), [k, ic, nome] = INDICADORES.slice().sort((a, b) => v[a[0]] - v[b[0]])[0];
  const votos = INDICADORES.map(([kk, i2, n2]) => ({ n2, i2, votos: Math.round(100 - v[kk] + Math.random() * 20) })).sort((a, b) => b.votos - a.votos);
  abrirModal(`<div class="cab-modal" style="--cor:#2E7D32"><span class="icone-grande">🗳️</span>
      <div><small>Orçamento participativo · Estatuto da Cidade, arts. 43 e 44</small><h2>A população escolheu a prioridade</h2></div></div>
    <p>Nas audiências públicas sobre o orçamento, os moradores votaram no que a prefeitura deve melhorar:</p>
    <ul class="votacao">${votos.map(x => `<li><span>${x.i2} ${x.n2}</span><b>${x.votos} votos</b></li>`).join('')}</ul>
    <p class="pratica"><b>Compromisso:</b> melhorar <b>${ic} ${nome}</b> em pelo menos 10 pontos nos próximos 3 meses (hoje: ${v[k]}).</p>
    <p class="nota">A gestão orçamentária participativa, com debates, audiências e consultas públicas, é condição obrigatória para a Câmara aprovar o plano plurianual, a LDO e o orçamento anual (Estatuto da Cidade, art. 44).</p>
    <div class="botoes"><button class="btn primario" id="m-ok">🤝 Assumir o compromisso</button></div>`, cx => {
    cx.querySelector('#m-ok').onclick = () => { s.op = { area: k, base: v[k], ate: s.mes + 3 }; registrar(`🗳️ Orçamento participativo: prioridade para <b>${ic} ${nome}</b> até ${nomeMes(s.op.ate)}.`); fecharModal(); render(); };
  });
}
function verificarOrcamentoParticipativo() {
  if (!s.op) return;
  const v = indicadores(), [, ic, nome] = INDICADORES.find(x => x[0] === s.op.area);
  if (v[s.op.area] >= s.op.base + 10) {
    s.reputacao = Math.min(30, s.reputacao + 6); ganharXp(25); s.op = null;
    registrar(`🗳️ Compromisso cumprido: <b>${ic} ${nome}</b> melhorou como a população pediu (+25 XP).`); toast(`🗳️ Compromisso com a população cumprido: ${nome}!`, true); confete(40);
  } else if (s.mes > s.op.ate) {
    s.reputacao = Math.max(-30, s.reputacao - 6); s.op = null;
    registrar(`🗳️ O compromisso do orçamento participativo (<b>${nome}</b>) não foi cumprido. A população ficou decepcionada.`);
  }
}

/* ── Os bairros crescem sozinhos ──────────────────────────────────────────── */
function crescerBairros() {
  const c = calcular();
  if (c.fel < 60 || c.faltas.length) return;
  let n = 0;
  s.mapa.forEach((l, i) => {
    if (n >= 2 || !l || !RESIDENCIAIS.includes(l.tipo) || (l.nivel || 1) >= MAX_NIVEL || Math.random() > .08) return;
    l.nivel = (l.nivel || 1) + 1; n++;
    registrar(`🏘️ Os moradores ampliaram ${PREDIOS[l.tipo].icone} ${PREDIOS[l.tipo].nome} para o nível ${l.nivel}: a cidade está boa para viver, e o Plano Diretor permite construir mais ali.`);
  });
  if (n) toast(`🏘️ ${n} moradia(s) cresceram sozinhas: os bairros estão se valorizando.`);
}

/* ── Revisão espaçada: o que foi errado volta semanas depois ──────────────── */
function agendarRevisao(r) {
  s.revisar = s.revisar || [];
  if (s.revisar.some(x => x.t === r.t && x.k === r.k && x.q === r.q)) return;
  s.revisar.push({ ...r, quando: s.mes + 2 });
}
function perguntaDaRevisao(r) {
  if (r.t === 'prova') { const q = PREDIOS[r.k] && PREDIOS[r.k].licenca[r.q]; return q && { area: PREDIOS[r.k].area, p: q.p, ops: q.ops, c: q.c, exp: q.exp }; }
  if (r.t === 'caso') { const c = CASOS[r.k]; return c && { area: PREDIOS[c.predio].area, p: `${c.titulo}: ${c.texto}`, ops: c.ops, c: c.c, exp: `${c.exp} (${c.base})` }; }
  if (r.t === 'aud') { const a = AUDIENCIAS[r.k]; return a && { area: a.area, p: `${a.titulo}: ${a.autor[1]}`, ops: a.ops, c: a.c, exp: `${a.exp} (${a.base})` }; }
  if (r.t === 'licitacao') return { area: 'Licitações e contratos', p: 'Numa licitação, qual empresa deve vencer?', ops: ['A mais barata, mesmo sem documentos', 'A de menor preço entre as que cumpriram os requisitos de habilitação', 'A do parente do prefeito, que é de confiança'], c: 1, exp: 'Lei 14.133/2021: julgamento por menor preço entre as habilitadas; parentes de dirigentes ficam impedidos (art. 14, IV).' };
  return null;
}
function abrirRevisao() {
  const r = (s.revisar || []).find(x => x.quando <= s.mes), q = r && perguntaDaRevisao(r);
  if (!r) return;
  if (!q) { s.revisar = s.revisar.filter(x => x !== r); return; }
  const ordem = embaralhar(q.ops.map((t, i) => ({ t, i })));
  abrirModal(`<div class="cab-modal" style="--cor:#7B40E8"><span class="icone-grande">🔁</span>
      <div><small>Revisão · ${esc(q.area)}</small><h2>Lembra desta?</h2></div></div>
    <p class="pergunta">${esc(q.p)}</p>${htmlOpcoes(ordem, 'i')}<div id="feedback"></div>`, cx => {
    cx.querySelectorAll('.opcao').forEach(b => b.onclick = () => {
      const certo = +b.dataset.i === q.c;
      registrarDesempenho(q.area, 'caso', certo);
      cx.querySelectorAll('.opcao').forEach(o => { o.disabled = true; if (+o.dataset.i === q.c) o.classList.add('certa'); });
      if (certo) { s.revisar = s.revisar.filter(x => x !== r); ganharXp(10); som('certo'); }
      else { b.classList.add('errada'); r.quando = s.mes + 1; som('erro'); }
      cx.querySelector('#feedback').innerHTML = `<div class="explicacao ${certo ? 'ok' : 'erro'}"><b>${certo ? '✅ Agora fixou! +10 XP' : '❌ Ainda não. Ela volta no mês que vem.'}</b> ${esc(q.exp)}</div>
        <div class="botoes"><button class="btn primario" id="m-ok">Continuar</button></div>`;
      cx.querySelector('#m-ok').onclick = () => { fecharModal(); render(); };
    });
  });
}

/* ── Passagem do mês: todos os sistemas da cidade viva ────────────────────── */
function aoPassarMes() {
  encerrarOcorrencias();
  gerarOcorrencia();
  verificarDesafio(true);
  verificarOrcamentoParticipativo();
  crescerBairros();
  if (conta(s, 'forum') && Math.random() < .35) gerarAudiencia();
  if (s.mes % 6 === 0) setTimeout(() => { if ($('modal').classList.contains('oculto')) abrirOrcamentoParticipativo(); }, 1500);
  else if ((s.revisar || []).some(x => x.quando <= s.mes)) setTimeout(() => { if ($('modal').classList.contains('oculto')) abrirRevisao(); }, 1600);
}
function verificarExtras() { verificarDesafio(false); verificarMedalhas(); }

/* ── Turma: código de entrega, painel da turma e competição ───────────────── */
function codigoEntrega() {
  const v = indicadores(), ls = linhasDesempenho(), total = ls.reduce((t, l) => t + l.total, 0), ok = ls.reduce((t, l) => t + l.ok, 0);
  const dados = { v: 1, aluno: s.aluno || '', turma: s.turma || '', cidade: s.nome, mes: s.mes, xp: s.xp, titulo: NIVEIS[nivelAtual()].titulo, semente: s.semente || '',
    pct: total ? Math.round(ok / total * 100) : 0, respostas: total, indice: v.geral, ind: v, medalhas: (s.medalhas || []).length,
    areas: ls.map(l => [l.area, l.ok, l.total]) };
  return 'CL1-' + btoa(unescape(encodeURIComponent(JSON.stringify(dados))));
}
function lerEntrega(txt) {
  try { const t = txt.trim(); if (!t.startsWith('CL1-')) return null; return JSON.parse(decodeURIComponent(escape(atob(t.slice(4))))); } catch (e) { return null; }
}
function abrirPainelTurma() {
  abrirModal(`<div class="cab-modal" style="--cor:#7B40E8"><span class="icone-grande">👩‍🏫</span>
      <div><small>Modo professor</small><h2>Painel da turma</h2></div></div>
    <p>Cole aqui os códigos de entrega dos alunos (um por linha). O painel monta o ranking e mostra as áreas em que a turma mais erra.</p>
    <textarea id="m-codigos" rows="5" placeholder="CL1-..."></textarea>
    <div class="botoes"><button class="btn primario" id="m-montar">Montar painel</button><button class="btn" id="m-fechar">Fechar</button></div>
    <div id="m-painel"></div>`, cx => {
    cx.querySelector('#m-fechar').onclick = fecharModal;
    cx.querySelector('#m-montar').onclick = () => {
      const alunos = cx.querySelector('#m-codigos').value.split(/\s+/).map(lerEntrega).filter(Boolean);
      if (!alunos.length) { cx.querySelector('#m-painel').innerHTML = '<p class="nota">Nenhum código válido. Os códigos começam com CL1-.</p>'; return; }
      alunos.sort((a, b) => b.indice - a.indice || b.pct - a.pct);
      const areas = {};
      alunos.forEach(a => a.areas.forEach(([ar, ok, tot]) => { const x = areas[ar] = areas[ar] || { ok: 0, tot: 0 }; x.ok += ok; x.tot += tot; }));
      const fracas = Object.entries(areas).map(([ar, x]) => [ar, Math.round(x.ok / x.tot * 100)]).sort((a, b) => a[1] - b[1]).slice(0, 4);
      const sementes = [...new Set(alunos.map(a => a.semente).filter(Boolean))];
      cx.querySelector('#m-painel').innerHTML = `<div class="tabela-rolagem"><table class="tabela-desempenho"><thead><tr><th>#</th><th>Aluno(a)</th><th>Turma</th><th>Índice da cidade</th><th>Acertos</th><th>XP</th><th>Medalhas</th></tr></thead><tbody>
        ${alunos.map((a, n) => `<tr><td>${n === 0 ? '🥇' : n === 1 ? '🥈' : n === 2 ? '🥉' : n + 1}</td><td>${esc(a.aluno || '(sem nome)')}</td><td>${esc(a.turma)}</td><td>${a.indice}</td><td>${a.pct}% (${a.respostas})</td><td>${a.xp}</td><td>${a.medalhas}</td></tr>`).join('')}
        </tbody></table></div>
        ${fracas.length ? `<p class="pratica"><b>📌 A turma mais precisa revisar:</b> ${fracas.map(([ar, p]) => `${esc(ar)} (${p}%)`).join(', ')}.</p>` : ''}
        ${sementes.length ? `<p class="nota">Competição: ${sementes.map(x => `semente "${esc(x)}"`).join(', ')}. Mesma cidade inicial para todos; vence o maior índice.</p>` : ''}`;
    };
  });
}
// gerador pseudoaleatório com semente: a mesma semente monta a mesma cidade inicial para toda a turma
function geradorSemente(txt) {
  let h = 1779033703 ^ txt.length;
  for (let k = 0; k < txt.length; k++) { h = Math.imul(h ^ txt.charCodeAt(k), 3432918353); h = (h << 13) | (h >>> 19); }
  return () => { h = Math.imul(h ^ (h >>> 16), 2246822507); h = Math.imul(h ^ (h >>> 13), 3266489909); return ((h ^= h >>> 16) >>> 0) / 4294967296; };
}
function abrirCompeticao() {
  abrirModal(`<div class="cab-modal" style="--cor:#E65100"><span class="icone-grande">🏁</span>
      <div><small>Modo professor</small><h2>Competição da turma</h2></div></div>
    <p>Todos os alunos digitam a <b>mesma semente</b> e começam com a mesma cidade: mesmo caixa, mesmas casas e o mesmo primeiro caso. No fim, cada um entrega o código e o painel da turma faz o ranking pelo índice da cidade.</p>
    <label class="campo">Semente combinada pela turma<input id="m-semente" maxlength="30" placeholder="ex.: 9B-JUSTICA"></label>
    <p class="nota">⚠️ Começar a competição substitui a cidade atual. Se quiser guardar a atual, use 💾 Salvar antes.</p>
    <div class="botoes"><button class="btn" id="m-fechar">Cancelar</button><button class="btn primario" id="m-comecar-comp">Começar a cidade da competição</button></div>`, cx => {
    cx.querySelector('#m-fechar').onclick = fecharModal;
    cx.querySelector('#m-comecar-comp').onclick = () => {
      const semente = cx.querySelector('#m-semente').value.trim().toUpperCase();
      if (!semente) { toast('Digite a semente combinada com a turma.'); return; }
      const aluno = s.aluno, turma = s.turma, rnd = geradorSemente(semente);
      s = novoEstado(`Cidade ${semente}`);
      Object.assign(s, { aluno, turma, semente, dinheiro: 700 + Math.floor(rnd() * 6) * 50, licencas: { prefeitura: true, casa: true } });
      const centro = BAIRROS[0], livres = [];
      for (let r = centro.r0; r <= centro.r1; r++) for (let c = centro.c0; c <= centro.c1; c++) if (!s.mapa[r * LARGURA + c]) livres.push(r * LARGURA + c);
      for (let k = 0; k < 3; k++) { const j = Math.floor(rnd() * livres.length); s.mapa[livres.splice(j, 1)[0]] = { tipo: 'casa' }; }
      salvar(); fecharModal(); location.reload();
    };
  });
}

/* ── Acessibilidade do jogo: narração, fonte grande, alto contraste, atalhos ─ */
let falando = false;
function narrar(texto) {
  if (!('speechSynthesis' in window)) { toast('Este navegador não tem leitura em voz alta.'); return; }
  speechSynthesis.cancel();
  if (falando) { falando = false; return; }
  const u = new SpeechSynthesisUtterance(texto.replace(/\s+/g, ' ')), voz = speechSynthesis.getVoices().find(v => /pt[-_]BR/i.test(v.lang));
  u.lang = 'pt-BR'; if (voz) u.voice = voz; u.rate = 1;
  u.onend = () => { falando = false; };
  falando = true; speechSynthesis.speak(u);
}
const PREF_ACESS = 'cidade-legal-acessibilidade';
function prefsAcess() { try { return JSON.parse(localStorage.getItem(PREF_ACESS)) || {}; } catch (e) { return {}; } }
function aplicarAcess(p = prefsAcess()) {
  document.documentElement.classList.toggle('fonte-grande', !!p.fonte);
  document.documentElement.classList.toggle('alto-contraste', !!p.contraste);
  document.documentElement.classList.toggle('sem-animacao', !!p.calmo);
}
function abrirAcessibilidade() {
  const p = prefsAcess(), op = (k, t, d) => `<label class="opcao-acess"><input type="checkbox" data-pref="${k}" ${p[k] ? 'checked' : ''}><span><b>${t}</b><small>${d}</small></span></label>`;
  abrirModal(`<div class="cab-modal" style="--cor:#1565C0"><span class="icone-grande">♿</span>
      <div><small>Acessibilidade do jogo</small><h2>Do seu jeito</h2></div></div>
    ${op('fonte', 'Letras maiores', 'Aumenta textos, botões e janelas.')}
    ${op('contraste', 'Alto contraste', 'Cores fortes, bordas marcadas e fundo sólido.')}
    ${op('calmo', 'Menos animação', 'Desliga confetes e movimentos da interface.')}
    <p class="nota">🔊 Nas aulas e nos casos, o botão "Ouvir" lê o texto em voz alta. Tecle <b>?</b> a qualquer momento para ver os atalhos de teclado.</p>
    <div class="botoes"><button class="btn" id="m-atalhos">⌨️ Atalhos</button><button class="btn primario" id="m-fechar">Pronto</button></div>`, cx => {
    cx.querySelectorAll('[data-pref]').forEach(c => c.onchange = () => {
      const np = prefsAcess(); np[c.dataset.pref] = c.checked;
      try { localStorage.setItem(PREF_ACESS, JSON.stringify(np)); } catch (e) { /* sem storage */ }
      aplicarAcess(np);
    });
    cx.querySelector('#m-atalhos').onclick = abrirAtalhos;
    cx.querySelector('#m-fechar').onclick = fecharModal;
  });
}
function abrirAtalhos() {
  const t = [['W A S D', 'mover o mapa'], ['Q E', 'girar o mapa'], ['Tab até o mapa, depois setas', 'escolher um lote'], ['Enter ou espaço', 'agir no lote escolhido'],
    ['Shift + M', 'passar para o próximo mês'], ['Ctrl + Z', 'desfazer a última ação do mês'], ['Esc', 'fechar janela ou sair do modo demolir'], ['?', 'esta lista de atalhos']];
  abrirModal(`<div class="cab-modal" style="--cor:#1565C0"><span class="icone-grande">⌨️</span><div><small>Teclado</small><h2>Atalhos</h2></div></div>
    <table class="tabela-desempenho">${t.map(([k, d]) => `<tr><td><kbd>${k}</kbd></td><td>${d}</td></tr>`).join('')}</table>
    <div class="botoes"><button class="btn primario" id="m-fechar">Fechar</button></div>`, cx => { cx.querySelector('#m-fechar').onclick = fecharModal; });
}

document.addEventListener('DOMContentLoaded', () => {
  aplicarAcess();
  $('btn-minimapa').onclick = () => { som('clique'); document.querySelector('.app').classList.toggle('com-minimapa'); desenharMinimapa(); };
  $('btn-acess').onclick = () => { som('clique'); abrirAcessibilidade(); };
  // "Ouvir": lê em voz alta o bloco indicado
  $('modal-caixa').addEventListener('click', e => {
    const b = e.target.closest('[data-ler]');
    if (!b) return;
    const alvo = $('modal-caixa').querySelector(b.dataset.ler);
    if (alvo) narrar(alvo.innerText);
  });
  $('modal').addEventListener('click', e => { if (e.target.closest('#m-fechar, #m-ok, #m-depois')) { speechSynthesis && speechSynthesis.cancel(); falando = false; } });
  document.addEventListener('keydown', e => {
    if (/^(INPUT|TEXTAREA)$/.test(document.activeElement.tagName)) return;
    if (e.key === '?') { e.preventDefault(); abrirAtalhos(); }
    if (e.shiftKey && e.key.toUpperCase() === 'M' && $('modal').classList.contains('oculto')) { e.preventDefault(); proximoMes(); }
  });
  // painel da aba Missões: desafios
  $('aba-missoes').addEventListener('click', e => { const b = e.target.closest('[data-desafio]'); if (b) aceitarDesafio(b.dataset.desafio); });
});

/* ── Ocorrências: incêndios e acidentes, e o que a lei manda fazer ────────── */
const OCORRENCIAS = {
  incendio: [
    { titulo: 'Incêndio no prédio', quem: '🚒 Defesa Civil', texto: 'Um prédio da cidade pegou fogo. A vistoria mostrou que o alvará do Corpo de Bombeiros estava vencido havia dois anos. O que a lei diz?',
      ops: ['Nada, foi azar', 'Imóveis de uso coletivo precisam de licença dos Bombeiros em dia; a prefeitura deve fiscalizar e o dono responde pela irregularidade', 'Só os Bombeiros podem ser culpados'], c: 1,
      exp: 'A Lei Kiss obriga os municípios a exigir as medidas de prevenção e combate a incêndio, com aprovação do Corpo de Bombeiros, e a fiscalizar os estabelecimentos.', base: 'Lei 13.425/2017, arts. 2º e 3º' },
    { titulo: 'Quem ajuda?', quem: '🧯 Morador vizinho', texto: 'Vi o fogo começando e uma pessoa presa na janela, mas fiquei com medo e fui embora sem chamar ninguém. Fiz algo errado?',
      ops: ['Não, ninguém é obrigado a nada', 'Sim: deixar de prestar socorro, ou de pedir ajuda às autoridades quando é possível fazê-lo sem risco, é crime de omissão de socorro', 'Só os bombeiros precisam agir'], c: 1,
      exp: 'Ninguém precisa se arriscar, mas quem pode deve ao menos pedir socorro à autoridade pública (ligar 193). Não fazer nada é omissão de socorro.', base: 'Código Penal, art. 135' },
  ],
  acidente: [
    { titulo: 'Batida na avenida', quem: '🚓 Agente de trânsito', texto: 'Dois carros bateram sem feridos e os motoristas querem deixar os carros no meio da pista até a perícia chegar. Está certo?',
      ops: ['Sim, não se pode mexer em nada', 'Não: sem vítimas, os carros devem ser retirados da pista para liberar o trânsito, e o acidente é registrado depois', 'Só se for de noite'], c: 1,
      exp: 'Em acidente sem vítima, o condutor deve adotar providências para remover o veículo do local quando necessário para a segurança e a fluidez do trânsito.', base: 'CTB, art. 178' },
    { titulo: 'Fugiu do local', quem: '🚑 Socorrista', texto: 'Um motorista atropelou um ciclista e foi embora sem prestar socorro. O que ele fez?',
      ops: ['Nada demais, não era obrigado a parar', 'Cometeu crime: deixar de prestar socorro à vítima e fugir do local do acidente são crimes de trânsito', 'Só uma infração leve'], c: 1,
      exp: 'O condutor envolvido em acidente com vítima deve prestar socorro (ou pedir ajuda) e não pode fugir para escapar da responsabilidade.', base: 'CTB, arts. 176, 304 e 305' },
    { titulo: 'Sinalizar o acidente', quem: '🛻 Motorista envolvido', texto: 'Meu carro quebrou depois da batida e ficou parado na pista. Preciso fazer alguma coisa antes de o guincho chegar?',
      ops: ['Não, é só esperar', 'Sim: ligar o pisca-alerta e colocar o triângulo de sinalização a uma distância que avise quem vem atrás', 'Só sair do carro e ir embora'], c: 1,
      exp: 'O veículo imobilizado na via deve ser sinalizado com o pisca-alerta e o triângulo, para evitar novos acidentes.', base: 'CTB, arts. 40, V, e 46' },
  ],
};
function gerarOcorrencia() {
  if ((s.ocorrencias || []).length) return;
  const c = calcular(), v = indicadores();
  const predios = [], ruas = [];
  s.mapa.forEach((l, i) => {
    if (!l || !liberado(i)) return;
    if (PREDIOS[l.tipo] && PREDIOS[l.tipo].cat !== 'enfeite' && !PREDIOS[l.tipo].via && !['prefeitura', 'ruaLocal', 'ponteLocal', 'bombeiros'].includes(l.tipo)) predios.push(i);
    if (['rua', 'ruaLocal'].includes(l.tipo) && !l.via) ruas.push(i);
  });
  let tipo = null;
  if (predios.length >= 5 && Math.random() < .12 * (1.4 - v.seguranca / 100)) tipo = 'incendio';
  else if (c.pop >= 40 && ruas.length && Math.random() < .18 * (1.4 - v.seguranca / 100)) tipo = 'acidente';
  if (!tipo) return;
  const lista = tipo === 'incendio' ? predios : ruas, tile = lista[Math.floor(Math.random() * lista.length)];
  const q = Math.floor(Math.random() * OCORRENCIAS[tipo].length);
  s.ocorrencias = [{ tipo, tile, q, mes: s.mes }];
  s.pendentes = s.pendentes.filter(p => p.tile !== tile);
  s.pendentes.push({ oc: tipo, q, tile, expira: s.mes + 1 });
  const socorro = tipo === 'incendio' ? conta(s, 'bombeiros') : conta(s, 'saude') + conta(s, 'delegacia');
  registrar(tipo === 'incendio'
    ? `🔥 Incêndio em ${PREDIOS[s.mapa[tile].tipo].icone} ${PREDIOS[s.mapa[tile].tipo].nome}! ${socorro ? 'Os Bombeiros já estão no local.' : 'A cidade não tem Bombeiros: o prejuízo pode ser grande.'}`
    : `💥 Acidente de trânsito! ${socorro ? 'O socorro está a caminho, e os carros abrem passagem para a sirene.' : 'Sem posto de saúde nem delegacia, o socorro demora.'}`);
  setTimeout(() => { som('alerta'); toast(tipo === 'incendio' ? '🔥 Incêndio na cidade! Clique no balão para agir.' : '💥 Acidente de trânsito! Clique no balão para agir.', true); if (Mapa.focar) Mapa.focar(tile, true); }, 900);
}
function encerrarOcorrencias() {
  (s.ocorrencias || []).forEach(o => {
    if (o.tipo === 'incendio') {
      const l = s.mapa[o.tile];
      if (conta(s, 'bombeiros')) registrar('🚒 Os Bombeiros controlaram o incêndio. Ninguém se feriu.');
      else if (l && PREDIOS[l.tipo]) {
        const preju = Math.round(PREDIOS[l.tipo].custo * .4);
        s.dinheiro -= preju; s.reputacao = Math.max(-30, s.reputacao - 5);
        if ((l.nivel || 1) > 1) l.nivel--;
        registrar(`🔥 Sem Bombeiros na cidade, o incêndio causou prejuízo de 💰 ${fmt(preju)}. A Defesa Civil é dever do poder público (Lei 12.608/2012).`);
      }
    } else if (!(conta(s, 'saude') + conta(s, 'delegacia'))) { s.reputacao = Math.max(-30, s.reputacao - 3); registrar('🚑 O socorro ao acidente demorou: a cidade precisa de posto de saúde e delegacia.'); }
  });
  s.ocorrencias = [];
}
function abrirOcorrencia(pend) {
  const o = OCORRENCIAS[pend.oc][pend.q], ordem = embaralhar(o.ops.map((t, k) => ({ t, i: k })));
  abrirModal(`<div class="cab-modal" style="--cor:#C62828"><span class="icone-grande">${pend.oc === 'incendio' ? '🔥' : '💥'}</span>
      <div><small>Ocorrência · ${pend.oc === 'incendio' ? 'Defesa Civil' : 'Trânsito'}</small><h2>${o.titulo}</h2></div></div>
    <button class="btn pequeno ouvir" data-ler=".cena" title="Ouvir em voz alta">🔊 Ouvir</button>
    <div class="cena"><span class="avatar">${o.quem.split(' ')[0]}</span><blockquote class="fala"><b>${o.quem.split(' ').slice(1).join(' ')}</b>${o.texto}</blockquote></div>
    ${htmlOpcoes(ordem, 'k')}<div id="feedback"></div>`, cx => {
    cx.querySelectorAll('.opcao').forEach(b => b.onclick = () => {
      const certo = +b.dataset.k === o.c;
      registrarDesempenho(pend.oc === 'incendio' ? 'Defesa Civil e Direito Penal' : 'Trânsito (CTB)', 'caso', certo);
      s.pendentes = s.pendentes.filter(x => x !== pend);
      cx.querySelectorAll('.opcao').forEach(x => { x.disabled = true; if (+x.dataset.k === o.c) x.classList.add('certa'); });
      if (certo) { ganharXp(15); s.reputacao = Math.min(30, s.reputacao + 2); som('certo'); } else { b.classList.add('errada'); ganharXp(5); som('erro'); }
      cx.querySelector('#feedback').innerHTML = `<div class="explicacao ${certo ? 'ok' : 'erro'}"><b>${certo ? '✅ Isso mesmo! +15 XP' : '❌ Não é assim. +5 XP'}</b> ${o.exp}<small class="base">📌 ${o.base}</small></div>
        <div class="botoes"><button class="btn primario" id="m-ok">Continuar</button></div>`;
      cx.querySelector('#m-ok').onclick = () => { fecharModal(); verificarMissoes(); render(); };
    });
  });
}

/* ── Minimapa ─────────────────────────────────────────────────────────────── */
const CORES_MINI = { agua: '#3FA7DE', ponte: '#8D6E63', rua: '#5B6474', ruaLocal: '#7A8394', ponteLocal: '#8D6E63', arvore: '#2E7D32', parque: '#43A047', praca: '#9CCC65', canteiro: '#AED581', lagoa: '#4FC3F7' };
function corMini(l) {
  if (!l) return null;
  if (CORES_MINI[l.tipo]) return CORES_MINI[l.tipo];
  const p = PREDIOS[l.tipo];
  return p ? (RESIDENCIAIS.includes(l.tipo) ? '#F4A261' : p.cat === 'rural' ? '#C9B24A' : p.cat === 'industria' ? '#90A4AE' : p.cor || '#FFFFFF') : null;
}
function desenharMinimapa() {
  const cv = $('minimapa');
  if (!cv || cv.offsetParent === null) return;
  const E = 5, ctx = cv.getContext('2d');
  ctx.fillStyle = '#6FB14F'; ctx.fillRect(0, 0, cv.width, cv.height);
  s.mapa.forEach((l, i) => {
    const r = Math.floor(i / LARGURA), c = i % LARGURA, cor = corMini(l);
    if (!s.bairros[bairroDe(i).id]) { ctx.fillStyle = 'rgba(14,26,16,.35)'; ctx.fillRect(c * E, r * E, E, E); }
    if (cor) { ctx.fillStyle = cor; ctx.fillRect(c * E, r * E, E, E); }
  });
  (s.pendentes || []).forEach(p => { ctx.fillStyle = '#E53935'; ctx.beginPath(); ctx.arc((p.tile % LARGURA + .5) * E, (Math.floor(p.tile / LARGURA) + .5) * E, 3, 0, Math.PI * 2); ctx.fill(); });
  const a = Mapa.alvoCamera && Mapa.alvoCamera();
  if (a) { const w = Math.min(cv.width, a.dist * 1.6 * E), h = w * .7; ctx.strokeStyle = '#FFFFFF'; ctx.lineWidth = 2; ctx.strokeRect((a.x + .5) * E - w / 2, (a.z + .5) * E - h / 2, w, h); }
}

/* ── Cartão-postal ────────────────────────────────────────────────────────── */
function abrirCartaoPostal() {
  if (!Mapa.imagem) return;
  const img = new Image(), v = indicadores();
  img.onload = () => {
    const W = 1200, H = Math.round(W * img.height / img.width) + 120, cv = document.createElement('canvas'); cv.width = W; cv.height = H;
    const ctx = cv.getContext('2d');
    ctx.fillStyle = '#FFFDF6'; ctx.fillRect(0, 0, W, H);
    ctx.drawImage(img, 24, 24, W - 48, H - 144);
    ctx.fillStyle = '#12233A'; ctx.font = '700 44px Fredoka, Nunito, sans-serif'; ctx.fillText(`Lembranças de ${s.nome}`, 32, H - 66);
    ctx.font = '500 24px Nunito, sans-serif'; ctx.fillStyle = '#50698A';
    ctx.fillText(`${fmt(s.pop)} habitantes · índice da cidade ${v.geral}/100 · ${nomeMes(s.mes)} do Ano ${anoDe(s.mes)}${s.aluno ? ' · prefeito(a) ' + s.aluno : ''}`, 32, H - 28);
    const url = cv.toDataURL('image/jpeg', .9);
    abrirModal(`<div class="cab-modal" style="--cor:#F2B705"><span class="icone-grande">🖼️</span><div><small>Cartão-postal</small><h2>${esc(s.nome)}</h2></div></div>
      <img class="cartao-postal" src="${url}" alt="Cartão-postal da cidade ${esc(s.nome)}">
      <p class="nota">Toque e segure (ou clique com o botão direito) na imagem para salvar ou compartilhar.</p>
      <div class="botoes"><a class="btn so-arquivo" download="${esc(s.nome.replace(/[^\w\-]+/g, '-').toLowerCase() || 'cidade')}.jpg" href="${url}">⬇️ Baixar</a><button class="btn primario" id="m-fechar">Fechar</button></div>`,
      cx => { cx.querySelector('#m-fechar').onclick = fecharModal; });
  };
  img.src = Mapa.imagem();
}

/* ── Sons ambientes da cidade ─────────────────────────────────────────────── */
const Ambiente = (() => {
  let ctx = null, ruido = null, transito = null, chuva = null, ultimoPassaro = 0, ultimaSirene = 0, ultimoBipe = 0;
  function iniciar() {
    if (ctx) return;
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    const buf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate), d = buf.getChannelData(0);
    let ult = 0; for (let k = 0; k < d.length; k++) { const b = Math.random() * 2 - 1; ult = (ult + .02 * b) / 1.02; d[k] = ult * 3.5; } // ruído marrom
    const fonte = (freq, tipo) => {
      const src = ctx.createBufferSource(); src.buffer = buf; src.loop = true;
      const f = ctx.createBiquadFilter(); f.type = tipo; f.frequency.value = freq;
      const g = ctx.createGain(); g.gain.value = 0; src.connect(f).connect(g).connect(ctx.destination); src.start(); return g;
    };
    transito = fonte(320, 'lowpass'); chuva = fonte(2600, 'highpass');
  }
  function bip(freq, dur, vol = .05, tipo = 'sine', glide) {
    const t = ctx.currentTime, o = ctx.createOscillator(), g = ctx.createGain();
    o.type = tipo; o.frequency.setValueAtTime(freq, t); if (glide) o.frequency.linearRampToValueAtTime(glide, t + dur);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(.0005, t + dur);
    o.connect(g).connect(ctx.destination); o.start(t); o.stop(t + dur);
  }
  function atualizar() {
    if (!ctx) return;
    const ligado = s && s.som && document.visibilityState === 'visible' && Mapa.hora;
    if (!ligado) { transito.gain.value = 0; chuva.gain.value = 0; return; }
    if (ctx.state === 'suspended') ctx.resume();
    const h = Mapa.hora(), rush = (h >= 7 && h < 9) || (h >= 17 && h < 19), noite = h >= 22 || h < 5;
    const dist = (Mapa.alvoCamera() || { dist: 15 }).dist, perto = Math.max(.25, 1.4 - dist / 30);
    transito.gain.setTargetAtTime(Math.min(.09, (.012 + (s.pop || 0) / 9000) * (rush ? 1.8 : noite ? .3 : 1) * perto), ctx.currentTime, .5);
    chuva.gain.setTargetAtTime(s.chuva ? .05 : 0, ctx.currentTime, .8);
    const agora = performance.now();
    if (h >= 6 && h < 18 && !s.chuva && agora - ultimoPassaro > 4000 + Math.random() * 6000) { ultimoPassaro = agora; [0, 140, 260].forEach(ms => setTimeout(() => bip(2400 + Math.random() * 900, .09, .025, 'sine', 3000), ms)); }
    if (Mapa.emergencia && Mapa.emergencia() && agora - ultimaSirene > 3000) { ultimaSirene = agora; bip(700, 1.4, .03, 'triangle', 1100); setTimeout(() => bip(1100, 1.4, .03, 'triangle', 700), 1400); }
    if (conta(s, 'semaforoSonoro') && dist < 9 && agora - ultimoBipe > 1000) { ultimoBipe = agora; bip(1800, .06, .02, 'square'); }
  }
  return { iniciar, atualizar };
})();

document.addEventListener('DOMContentLoaded', () => {
  const cv = $('minimapa');
  if (cv) {
    cv.addEventListener('click', e => {
      const b = cv.getBoundingClientRect(), c = Math.floor((e.clientX - b.left) / b.width * LARGURA), r = Math.floor((e.clientY - b.top) / b.height * ALTURA);
      if (Mapa.focar) Mapa.focar(r * LARGURA + c);
    });
    setInterval(desenharMinimapa, 500);
  }
  if (Mapa.imagem) $('btn-foto').onclick = () => { som('clique'); abrirCartaoPostal(); };
  const comecar = () => { try { Ambiente.iniciar(); } catch (e) { /* sem áudio */ } };
  addEventListener('pointerdown', comecar, { once: true }); addEventListener('keydown', comecar, { once: true });
  setInterval(() => { try { Ambiente.atualizar(); } catch (e) { /* sem áudio */ } }, 1000);
});
