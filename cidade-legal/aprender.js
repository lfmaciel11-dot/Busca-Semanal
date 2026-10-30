/* ══════════════════════════════════════════════════════════════════════════
   CIDADE LEGAL — Jeitos de aprender
   Trilhas por público (Fundamental, Médio, Graduação, OAB), glossário clicável
   nos textos jurídicos e o modo campanha, com capítulos contados como história.
══════════════════════════════════════════════════════════════════════════ */

/* ── Trilhas por público ──────────────────────────────────────────────────── */
const TRILHAS = {
  fundamental: { nome: 'Ensino Fundamental', icone: '🎒', desc: 'Provas de 3 perguntas com 💡 dica que elimina uma alternativa errada.', n: 3, minimo: 2, dica: true, bonus: 20 },
  medio: { nome: 'Ensino Médio', icone: '📘', desc: 'O jogo padrão: 3 perguntas por prova, aprovação com 2 acertos.', n: 3, minimo: 2, dica: false, bonus: 20 },
  graduacao: { nome: 'Graduação em Direito', icone: '🎓', desc: 'Todas as perguntas da área; só pode errar uma. Licença vale +30 XP.', n: 9, erros: 1, dica: false, bonus: 30 },
  oab: { nome: 'Preparação para a OAB', icone: '⚖️', desc: 'Todas as perguntas, sem errar nenhuma. Licença vale +40 XP.', n: 9, erros: 0, dica: false, bonus: 40 },
};
const trilhaAtual = () => TRILHAS[s.trilha] ? s.trilha : 'medio';
function configProva(p) {
  const t = TRILHAS[trilhaAtual()], n = Math.min(t.n, p.licenca.length);
  return { n, minimo: t.erros !== undefined ? Math.max(1, n - t.erros) : Math.min(t.minimo, n), dica: t.dica, bonus: t.bonus };
}
// botão de dica (só na trilha Fundamental): elimina uma alternativa errada
function htmlDica(certa, chave) {
  if (certa === undefined || !TRILHAS[trilhaAtual()].dica) return '';
  return `<div class="botoes esquerda"><button class="btn pequeno btn-dica" data-dica="${certa}" data-chave="${chave}">💡 Dica: eliminar uma alternativa errada</button></div>`;
}
function htmlEscolhaTrilha(atual) {
  return `<div class="trilhas" role="radiogroup" aria-label="Trilha de estudo">${Object.entries(TRILHAS).map(([k, t]) =>
    `<label class="trilha"><input type="radio" name="trilha" value="${k}" ${k === atual ? 'checked' : ''}><span><b>${t.icone} ${t.nome}</b><small>${t.desc}</small></span></label>`).join('')}</div>`;
}
function abrirTrilhas() {
  abrirModal(`<div class="cab-modal" style="--cor:#7B40E8"><span class="icone-grande">🧭</span>
      <div><small>Do seu jeito</small><h2>Trilha de estudo</h2></div></div>
    <p class="nota">A trilha muda a dificuldade das provas de licença. Dá para trocar quando quiser; o que você já conquistou continua valendo.</p>
    ${htmlEscolhaTrilha(trilhaAtual())}
    <div class="botoes"><button class="btn primario" id="m-fechar">Pronto</button></div>`, cx => {
    cx.querySelectorAll('input[name="trilha"]').forEach(r => r.onchange = () => { s.trilha = r.value; salvar(); toast(`${TRILHAS[r.value].icone} Trilha: ${TRILHAS[r.value].nome}`); });
    cx.querySelector('#m-fechar').onclick = fecharModal;
  });
}

/* ── Glossário clicável ───────────────────────────────────────────────────── */
const GLOSSARIO = {
  'Constituição': 'A lei mais importante do país (CF/1988). Nenhuma outra lei pode contrariá-la.',
  'inconstitucional': 'Que contraria a Constituição. Uma lei inconstitucional não deve ser aplicada e pode ser anulada pelo Judiciário.',
  'licitação': 'Disputa pública e aberta que a administração faz para escolher quem vai fazer uma obra ou vender um produto, buscando a proposta mais vantajosa (Lei 14.133/2021).',
  'impessoalidade': 'Princípio que obriga o governo a tratar todos igualmente, sem favorecer amigos e parentes nem promover a imagem pessoal do governante (CF, art. 37).',
  'improbidade': 'Desonestidade de quem cuida de dinheiro ou bens públicos, como desviar recursos ou enriquecer ilicitamente (Lei 8.429/1992).',
  'súmula': 'Resumo de um entendimento firme de um tribunal, que orienta como casos parecidos devem ser julgados.',
  'jurisprudência': 'Conjunto de decisões dos tribunais sobre um mesmo tema, que mostra como a lei vem sendo interpretada.',
  'trânsito em julgado': 'Momento em que uma decisão judicial não pode mais ser contestada por recurso.',
  'flagrante': 'Quando a pessoa é surpreendida cometendo o crime ou logo depois dele. Qualquer pessoa pode prender em flagrante (CPP, art. 301).',
  'audiência de custódia': 'Apresentação do preso a um juiz em até 24 horas, para verificar se a prisão foi legal e se houve maus-tratos.',
  'legítima defesa': 'Reagir a uma agressão injusta, atual ou iminente, usando moderadamente os meios necessários. Não é crime (CP, art. 25).',
  'inquérito': 'Investigação feita antes do processo para reunir provas. O inquérito policial é feito pela polícia; o inquérito civil, pelo Ministério Público.',
  'ação civil pública': 'Processo para proteger direitos de muitas pessoas ao mesmo tempo, como o meio ambiente e os consumidores (Lei 7.347/1985).',
  'ação penal pública': 'Processo criminal em que quem acusa é o Ministério Público, não a vítima.',
  'Ministério Público': 'Instituição que defende a sociedade: acusa nos crimes, protege direitos coletivos e fiscaliza o cumprimento da lei (CF, art. 127).',
  'Defensoria Pública': 'Instituição que dá orientação e defesa jurídica gratuita a quem não pode pagar advogado (CF, art. 134).',
  'Juizado Especial': 'Parte da Justiça que julga causas mais simples de forma rápida; em causas de até 20 salários mínimos, dá para entrar sem advogado (Lei 9.099/1995).',
  'gratuidade da justiça': 'Direito de processar ou se defender sem pagar custas, para quem não tem condições (CPC, art. 98).',
  'medida protetiva': 'Ordem urgente do juiz para proteger a vítima, como afastar o agressor do lar ou proibir que ele se aproxime (Lei Maria da Penha).',
  'Conselho Tutelar': 'Órgão do município, escolhido pela comunidade, que zela pelos direitos das crianças e adolescentes (ECA, art. 131).',
  'ECA': 'Estatuto da Criança e do Adolescente (Lei 8.069/1990): reúne os direitos de quem tem até 18 anos.',
  'CDC': 'Código de Defesa do Consumidor (Lei 8.078/1990): protege quem compra produtos e contrata serviços.',
  'fornecedor': 'Quem vende produtos ou presta serviços no mercado: fabricante, loja, banco, operadora etc. (CDC, art. 3º).',
  'venda casada': 'Obrigar o consumidor a levar um produto ou serviço para poder comprar outro. É proibida (CDC, art. 39, I).',
  'LGPD': 'Lei Geral de Proteção de Dados (Lei 13.709/2018): regras para coletar, usar e guardar dados pessoais.',
  'dados pessoais': 'Informações que identificam uma pessoa, como nome, CPF, endereço, foto e localização.',
  'usucapião': 'Forma de se tornar dono de um imóvel por morar nele por longo tempo, sem oposição, como se fosse dono (CC, arts. 1.238 a 1.242).',
  'IPTU': 'Imposto municipal sobre a propriedade de imóveis urbanos (CF, art. 156, I).',
  'ISS': 'Imposto municipal sobre serviços (CF, art. 156, III). Será substituído aos poucos pelo IBS até 2033.',
  'tributo': 'Valor que a lei obriga a pagar ao Estado, como impostos, taxas e contribuições (CTN, art. 3º).',
  'Plano Diretor': 'Lei municipal que organiza o crescimento da cidade; é obrigatória para cidades com mais de 20 mil habitantes (CF, art. 182).',
  'tombamento': 'Proteção legal de um bem de valor histórico ou cultural: ele não pode ser destruído nem descaracterizado.',
  'desapropriação': 'Quando o poder público toma um imóvel por necessidade ou interesse público, pagando indenização justa e prévia (CF, art. 5º, XXIV).',
  'prescrição': 'Perda do direito de cobrar ou de punir porque passou o prazo previsto em lei.',
  'pensão alimentícia': 'Valor pago para garantir o sustento de quem precisa, como filhos menores (CC, art. 1.694).',
  'guarda compartilhada': 'Quando pai e mãe dividem as decisões e responsabilidades sobre os filhos, mesmo separados (CC, art. 1.584).',
  'aviso prévio': 'Comunicação antecipada do fim do contrato de trabalho, de no mínimo 30 dias (CF, art. 7º, XXI).',
  'FGTS': 'Fundo de Garantia do Tempo de Serviço: depósito mensal de 8% do salário feito pelo empregador numa conta do trabalhador.',
  'CLT': 'Consolidação das Leis do Trabalho: reúne as regras dos empregos com carteira assinada.',
  'carência': 'Tempo mínimo de contribuição ou de contrato exigido antes de poder usar um benefício ou serviço.',
  'BPC': 'Benefício de Prestação Continuada: 1 salário mínimo por mês ao idoso a partir de 65 anos ou à pessoa com deficiência sem meios de se manter.',
  'CadÚnico': 'Cadastro Único do governo federal que identifica famílias de baixa renda para os programas sociais.',
  'cassação': 'Perda do registro de candidatura ou do mandato por decisão da Justiça Eleitoral ou do Legislativo.',
  'inelegível': 'Quem não pode se candidatar, por exemplo, por condenação prevista na Lei da Ficha Limpa.',
  'Ficha Limpa': 'Lei Complementar 135/2010: impede de se candidatar quem foi condenado por órgão colegiado em certos crimes ou atos de improbidade.',
  'veto': 'Recusa do chefe do Executivo (prefeito, governador ou presidente) em transformar um projeto aprovado em lei.',
  'sanção': 'No processo legislativo, é a concordância do chefe do Executivo com o projeto, que vira lei. Também pode significar punição.',
  'responsabilidade objetiva': 'Dever de indenizar que não depende de provar culpa: basta o dano e a ligação com a atividade.',
  'dano moral': 'Ofensa à honra, à imagem ou à dignidade da pessoa, que dá direito a indenização (CF, art. 5º, X).',
  'prontuário': 'Documento com todo o histórico de atendimento do paciente. É sigiloso e o paciente tem direito de acessá-lo.',
  'estelionato': 'Crime de obter vantagem enganando alguém (CP, art. 171). Pela internet, chama-se fraude eletrônica.',
  'reclusão': 'Pena de prisão para crimes mais graves, que pode começar no regime fechado.',
  'Tribunal de Contas': 'Órgão que fiscaliza como o dinheiro público é gasto e dá parecer sobre as contas do governante (CF, arts. 71 e 31).',
  'Lei de Responsabilidade Fiscal': 'LC 101/2000: obriga os governantes a planejar e equilibrar receitas e despesas.',
};
const TERMOS_GLOSSARIO = Object.keys(GLOSSARIO).sort((a, b) => b.length - a.length);
// sem lookbehind, que navegadores antigos (Safari antes do iOS 16.4) não entendem: o grupo 1 pega a letra anterior
let reGlossario = null;
try {
  reGlossario = new RegExp(`(^|[^\\p{L}\\d])(${TERMOS_GLOSSARIO.map(t => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})(?![\\p{L}\\d])`, 'iu');
} catch (e) { reGlossario = null; } // sem suporte: o jogo segue sem os termos sublinhados
const termoCanonico = achado => TERMOS_GLOSSARIO.find(t => t.toLowerCase() === achado.toLowerCase());
const BLOCOS_GLOSSARIO = '.aula-texto, .explicacao, .fala, .cartao-lei';

// marca, em cada bloco, a primeira vez que cada termo aparece
function marcarGlossario(raiz) {
  if (!reGlossario || !raiz) return;
  raiz.querySelectorAll(BLOCOS_GLOSSARIO).forEach(bloco => {
    if (bloco.dataset.glossario) return;
    bloco.dataset.glossario = '1';
    const vistos = new Set(), nos = [];
    const w = document.createTreeWalker(bloco, NodeFilter.SHOW_TEXT, { acceptNode: n => n.parentElement.closest('button, a, .termo, .rodape-conteudo, small.base') ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT });
    while (w.nextNode()) nos.push(w.currentNode);
    nos.forEach(no => {
      let texto = no.nodeValue, m;
      const frag = document.createDocumentFragment();
      let mudou = false;
      while ((m = reGlossario.exec(texto))) {
        const inicio = m.index + m[1].length, fim = inicio + m[2].length, termo = termoCanonico(m[2]);
        if (vistos.has(termo)) { frag.append(texto.slice(0, fim)); texto = texto.slice(fim); continue; }
        vistos.add(termo); mudou = true;
        frag.append(texto.slice(0, inicio));
        const b = document.createElement('button');
        b.type = 'button'; b.className = 'termo'; b.dataset.termo = termo; b.textContent = m[2];
        b.setAttribute('aria-label', `${m[2]}: ver no glossário`);
        frag.append(b);
        texto = texto.slice(fim);
      }
      if (!mudou) return;
      frag.append(texto);
      no.replaceWith(frag);
    });
  });
}
function mostrarTermo(botao) {
  fecharTermo();
  const termo = botao.dataset.termo, pop = document.createElement('div');
  pop.id = 'pop-termo'; pop.className = 'pop-termo hud'; pop.setAttribute('role', 'dialog'); pop.setAttribute('aria-label', `Glossário: ${termo}`);
  pop.innerHTML = `<b>📚 ${esc(termo)}</b><p>${GLOSSARIO[termo]}</p><button class="btn pequeno" id="pop-termo-ok">Entendi</button>`;
  document.body.appendChild(pop);
  const r = botao.getBoundingClientRect(), W = innerWidth, H = innerHeight;
  const x = Math.min(Math.max(8, r.left + r.width / 2 - pop.offsetWidth / 2), W - pop.offsetWidth - 8);
  const y = r.bottom + 8 + pop.offsetHeight < H - 8 ? r.bottom + 8 : Math.max(8, r.top - 8 - pop.offsetHeight);
  Object.assign(pop.style, { left: x + 'px', top: y + 'px' });
  botao.setAttribute('aria-expanded', 'true');
  pop.querySelector('#pop-termo-ok').onclick = () => { fecharTermo(); botao.focus(); };
  pop.querySelector('#pop-termo-ok').focus();
  s.termosVistos = s.termosVistos || [];
  if (!s.termosVistos.includes(termo)) { s.termosVistos.push(termo); salvar(); }
}
function fecharTermo() {
  const p = document.getElementById('pop-termo'); if (p) p.remove();
  document.querySelectorAll('.termo[aria-expanded="true"]').forEach(b => b.setAttribute('aria-expanded', 'false'));
}
function htmlGlossario() {
  const vistos = s.termosVistos || [];
  return `<details class="glossario"><summary>📚 Glossário jurídico · ${Object.keys(GLOSSARIO).length} termos${vistos.length ? ` · você já consultou ${vistos.length}` : ''}</summary>
    <dl>${Object.keys(GLOSSARIO).sort((a, b) => a.localeCompare(b, 'pt')).map(t => `<dt>${vistos.includes(t) ? '✅ ' : ''}${esc(t)}</dt><dd>${GLOSSARIO[t]}</dd>`).join('')}</dl>
    <p class="nota">Nas aulas e nos casos, os termos <span class="termo exemplo">sublinhados</span> abrem a explicação com um clique.</p></details>`;
}

/* ── Modo campanha: capítulos com história ────────────────────────────────── */
const CAPITULOS = [
  { titulo: 'O primeiro mandato', icone: '🏛️',
    historia: 'A cidade tem só uma Prefeitura e muita esperança. No discurso de posse, você prometeu moradia, escola e saúde para todos. A população está de olho: promessa de campanha é compromisso!',
    objetivos: [
      { texto: 'Construa 3 Casas', ok: s => conta(s, 'casa') >= 3 },
      { texto: 'Construa uma Escola', ok: s => conta(s, 'escola') >= 1 },
      { texto: 'Construa um Posto de Saúde', ok: s => conta(s, 'saude') >= 1 },
      { texto: 'Atenda 2 cidadãos', ok: s => s.casosResolvidos >= 2 },
    ], din: 200, xp: 30 },
  { titulo: 'A cidade cresce', icone: '🏘️',
    historia: 'A notícia se espalhou e novas famílias chegaram. O comércio quer abrir as portas e os moradores pedem mais espaço. Hora de planejar o crescimento, com o Plano Diretor na mão.',
    objetivos: [
      { texto: 'Compre um bairro novo', ok: s => Object.keys(s.bairros || {}).filter(k => k !== 'centro' && s.bairros[k]).length >= 1 },
      { texto: 'Construa um Mercado', ok: s => conta(s, 'mercado') >= 1 },
      { texto: 'Alcance 60 habitantes', ok: s => s.pop >= 60 },
      { texto: 'Tenha 6 licenças jurídicas', ok: s => Object.keys(s.licencas).length >= 6 },
    ], din: 300, xp: 40 },
  { titulo: 'A grande enchente', icone: '🌊', evento: 'temporal',
    historia: 'A Defesa Civil avisou: um temporal histórico se aproxima. Bairros inteiros podem alagar. A lei manda o município mapear as áreas de risco e ter um plano de contingência. Prepare a cidade!',
    objetivos: [
      { texto: 'Construa os Bombeiros', ok: s => conta(s, 'bombeiros') >= 1 },
      { texto: 'Construa um Piscinão', ok: s => conta(s, 'piscinao') >= 1 },
      { texto: 'Construa uma Estação de Esgoto', ok: s => conta(s, 'esgoto') >= 1 },
      { texto: 'Mantenha a felicidade em 50% ou mais', ok: s => s.felicidade >= 50 },
    ], din: 350, xp: 50 },
  { titulo: 'Justiça para todos', icone: '⚖️',
    historia: 'Depois da enchente, muita gente perdeu documentos, casas e empregos, e não sabe a quem recorrer. Uma vítima de violência doméstica não encontrou atendimento. A cidade precisa de uma rede de proteção.',
    objetivos: [
      { texto: 'Construa o Fórum', ok: s => conta(s, 'forum') >= 1 },
      { texto: 'Construa a Defensoria Pública', ok: s => conta(s, 'defensoria') >= 1 },
      { texto: 'Construa a Delegacia da Mulher', ok: s => conta(s, 'delegaciaMulher') >= 1 },
      { texto: 'Construa o Conselho Tutelar', ok: s => conta(s, 'conselhoTutelar') >= 1 },
    ], din: 400, xp: 60 },
  { titulo: 'Cidade conectada', icone: '📡',
    historia: 'A internet chegou a todos os bairros, e com ela vieram os golpes do Pix, o cyberbullying nas escolas e empresas querendo os dados dos moradores. Proteger a cidade agora é também proteger o mundo digital.',
    objetivos: [
      { texto: 'Construa uma Torre de Telecom', ok: s => conta(s, 'telecom') >= 1 },
      { texto: 'Construa o Centro de Dados', ok: s => conta(s, 'dados') >= 1 },
      { texto: 'Construa a Delegacia de Crimes Cibernéticos', ok: s => conta(s, 'direitoDigital') >= 1 },
      { texto: 'Consulte 5 termos no glossário', ok: s => (s.termosVistos || []).length >= 5 },
    ], din: 450, xp: 70 },
  { titulo: 'O povo decide', icone: '🗳️',
    historia: 'O mandato está chegando ao fim. Em agosto do ano eleitoral começa a campanha, e em outubro a população vai às urnas. Faça uma campanha limpa e mostre o que você construiu.',
    objetivos: [
      { texto: 'Chegue à campanha eleitoral (agosto do Ano 4)', ok: s => s.mes >= 44 },
      { texto: 'Faça a campanha sem irregularidades', ok: s => !!s.historia.campanhaLimpa },
      { texto: 'Vença a eleição', ok: s => (s.reeleicoes || 0) >= 1 },
    ], din: 600, xp: 100 },
];
function historiaAtiva() { return s.historia && s.historia.ativo && s.historia.cap < CAPITULOS.length; }
function ativarHistoria() {
  s.historia = s.historia || { cap: 0, feitos: [] };
  s.historia.ativo = true;
  salvar(); render();
  abrirCapitulo(true);
}
function abrirCapitulo(novo) {
  if (!s.historia) return;
  if (s.historia.cap >= CAPITULOS.length) {
    abrirModal(`<div class="resultado ok"><span class="icone-grande pulando">🏆</span><h2>Campanha concluída!</h2>
      <p>Você completou os ${CAPITULOS.length} capítulos de ${esc(s.nome)}. A cidade continua: há sempre mais leis para aprender!</p></div>
      <div class="botoes"><button class="btn primario" id="m-ok">Continuar</button></div>`, cx => { cx.querySelector('#m-ok').onclick = fecharModal; });
    return;
  }
  const c = CAPITULOS[s.historia.cap];
  abrirModal(`<div class="cab-modal" style="--cor:#00897B"><span class="icone-grande">${c.icone}</span>
      <div><small>Modo campanha · capítulo ${s.historia.cap + 1} de ${CAPITULOS.length}</small><h2>${c.titulo}</h2></div></div>
    <button class="btn pequeno ouvir" data-ler=".historia-texto" title="Ouvir a história">🔊 Ouvir</button>
    <blockquote class="fala historia-texto">${c.historia}</blockquote>
    ${htmlObjetivos(c)}
    <p class="nota">Recompensa do capítulo: 💰 ${c.din} · 📚 ${c.xp} XP</p>
    <div class="botoes">${novo ? '' : '<button class="btn" id="m-sair-hist">Sair do modo campanha</button>'}<button class="btn primario" id="m-ok">${novo ? 'Vamos lá! ▶' : 'Voltar à cidade'}</button></div>`, cx => {
    cx.querySelector('#m-ok').onclick = fecharModal;
    const sair = cx.querySelector('#m-sair-hist');
    if (sair) sair.onclick = () => { s.historia.ativo = false; salvar(); fecharModal(); render(); toast('📖 Modo campanha pausado. Retome pela aba Missões.'); };
  });
  if (novo && c.evento) s.historia.evento = c.evento; // o capítulo traz um acontecimento no próximo mês
}
function htmlObjetivos(c) {
  return `<ul class="objetivos">${c.objetivos.map(o => { const ok = o.ok(s); return `<li class="${ok ? 'feito' : ''}"><span>${ok ? '✅' : '⬜'}</span>${o.texto}</li>`; }).join('')}</ul>`;
}
function verificarHistoria() {
  if (!historiaAtiva()) return;
  const c = CAPITULOS[s.historia.cap];
  if (!c.objetivos.every(o => o.ok(s))) return;
  s.historia.feitos.push(s.historia.cap);
  s.dinheiro += c.din; ganharXp(c.xp);
  registrar(`📖 Capítulo concluído: <b>${c.titulo}</b>! +💰 ${c.din}, +${c.xp} XP.`);
  s.historia.cap++;
  confete(); som('nivel');
  setTimeout(() => { if ($('modal').classList.contains('oculto')) abrirCapitulo(true); else toast(`📖 Capítulo concluído: ${c.titulo}! O próximo já começou.`, true); }, 900);
}
function htmlHistoria() {
  if (!s.historia || !s.historia.ativo) {
    return `<div class="cartao-historia"><b>📖 Modo campanha</b><p>Jogue a história da cidade em ${CAPITULOS.length} capítulos, de "O primeiro mandato" à eleição, com objetivos e recompensas.</p>
      <button class="btn primario pequeno" id="btn-ativar-historia">${s.historia ? 'Retomar campanha' : 'Começar campanha'}</button></div>`;
  }
  if (s.historia.cap >= CAPITULOS.length) return '<div class="cartao-historia"><b>🏆 Campanha concluída!</b></div>';
  const c = CAPITULOS[s.historia.cap];
  return `<div class="cartao-historia ativo"><b>${c.icone} Capítulo ${s.historia.cap + 1}: ${c.titulo}</b>${htmlObjetivos(c)}
    <button class="btn pequeno" id="btn-ver-capitulo">📖 Ler a história</button></div>`;
}
function renderChipHistoria() {
  let chip = document.getElementById('chip-historia');
  if (!historiaAtiva()) { if (chip) chip.remove(); return; }
  if (!chip) {
    chip = document.createElement('button');
    chip.id = 'chip-historia'; chip.className = 'chip-historia hud';
    chip.onclick = () => { som('clique'); abrirCapitulo(false); };
    $('dica').after(chip);
  }
  const c = CAPITULOS[s.historia.cap], n = c.objetivos.filter(o => o.ok(s)).length;
  chip.innerHTML = `${c.icone} Cap. ${s.historia.cap + 1} · <b>${c.titulo}</b> · ${n}/${c.objetivos.length}`;
  chip.title = 'Ver o capítulo atual do modo campanha';
}

document.addEventListener('DOMContentLoaded', () => {
  const cx = $('modal-caixa');
  new MutationObserver(() => marcarGlossario(cx)).observe(cx, { childList: true, subtree: true });
  new MutationObserver(() => marcarGlossario($('aba-vade'))).observe($('aba-vade'), { childList: true });
  document.addEventListener('click', e => {
    const t = e.target.closest('.termo:not(.exemplo)');
    if (t) { e.preventDefault(); e.stopPropagation(); return mostrarTermo(t); }
    if (!e.target.closest('#pop-termo')) fecharTermo();
    const d = e.target.closest('[data-dica]');
    if (d) {
      const chave = d.dataset.chave, erradas = [...cx.querySelectorAll('.opcao:not([disabled])')].filter(o => o.dataset[chave] !== d.dataset.dica);
      if (erradas.length > 1) { const o = erradas[Math.floor(Math.random() * erradas.length)]; o.disabled = true; o.classList.add('eliminada'); }
      d.closest('.botoes').remove();
    }
    if (e.target.id === 'btn-ativar-historia') ativarHistoria();
    if (e.target.id === 'btn-ver-capitulo') abrirCapitulo(false);
  }, true);
  addEventListener('keydown', e => { if (e.key === 'Escape' && document.getElementById('pop-termo')) { e.stopPropagation(); fecharTermo(); } }, true);
});
