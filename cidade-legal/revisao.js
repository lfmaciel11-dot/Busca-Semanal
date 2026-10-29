/* ══════════════════════════════════════════════════════════════════════════
   CIDADE LEGAL — Confiabilidade do conteúdo
   Data da última atualização do conteúdo, mudanças recentes nas leis e o
   botão "Reportar erro" em aulas, casos, audiências e ocorrências.
   Na página publicada no Claude, os reportes vão para uma caixa de sugestões
   que só o dono da página (e editores) leem; fora dele, ficam neste aparelho
   e podem ser copiados para o professor ou responsável.
══════════════════════════════════════════════════════════════════════════ */

const ATUALIZACAO_CONTEUDO = 'outubro de 2026';
const MUDANCAS_LEGAIS = [
  { ano: 2025, titulo: 'ECA Digital', texto: 'A Lei 15.211/2025 criou regras para proteger crianças e adolescentes em aplicativos, redes sociais e jogos, como verificação de idade e ferramentas de supervisão dos pais.' },
  { ano: 2024, titulo: 'Feminicídio virou crime autônomo', texto: 'A Lei 14.994/2024 transformou o feminicídio em crime próprio (Código Penal, art. 121-A), com pena de 20 a 40 anos, e endureceu a Lei Maria da Penha.' },
  { ano: 2024, titulo: 'Bullying e cyberbullying são crimes', texto: 'A Lei 14.811/2024 incluiu no Código Penal o crime de intimidação sistemática (art. 146-A); pela internet, a pena é de 2 a 4 anos de reclusão.' },
  { ano: 2025, titulo: 'Reforma Tributária em transição', texto: 'A EC 132/2023 e a LC 214/2025 criam o IBS e a CBS. O ISS (municipal) e o ICMS (estadual) serão extintos aos poucos até 2033. Durante a transição o ISS continua valendo, por isso o jogo ainda o ensina.' },
  { ano: 2023, titulo: 'Nova Lei de Licitações em vigor sozinha', texto: 'Desde 30/12/2023 só vale a Lei 14.133/2021; a antiga Lei 8.666/1993 foi revogada.' },
  { ano: 2023, titulo: 'Lei Geral do Esporte', texto: 'A Lei 14.597/2023 passou a reunir as regras do esporte e dos direitos do torcedor, que antes estavam no Estatuto do Torcedor.' },
  { ano: 2023, titulo: 'Injúria racial é racismo', texto: 'A Lei 14.532/2023 equiparou a injúria racial ao crime de racismo: inafiançável e imprescritível.' },
  { ano: 2023, titulo: 'Nova Lei dos Agrotóxicos', texto: 'A Lei 14.785/2023 substituiu a Lei 7.802/1989 nas regras de registro, venda e uso de agrotóxicos.' },
  { ano: 2022, titulo: 'Estatuto da Pessoa Idosa', texto: 'A Lei 14.423/2022 trocou o nome "Estatuto do Idoso" por "Estatuto da Pessoa Idosa" (Lei 10.741/2003).' },
];
const CHAVE_REPORTES = 'cidade-legal-reportes';
const TIPOS_REPORTE = ['A lei citada está errada ou desatualizada', 'A resposta considerada certa está errada', 'O texto está confuso ou difícil', 'Outro problema'];

function reportesLocais() { try { return JSON.parse(localStorage.getItem(CHAVE_REPORTES)) || []; } catch (e) { return []; } }
function guardarReporteLocal(r) { try { const l = reportesLocais(); l.unshift(r); localStorage.setItem(CHAVE_REPORTES, JSON.stringify(l.slice(0, 100))); } catch (e) { /* sem storage */ } }

// caixa de sugestões na conta (página publicada): cada pessoa grava os seus, o dono lê todos
const CaixaReportes = (() => {
  let col = null;
  async function iniciar() {
    if (!window.claude || !claude.use) return;
    try {
      const [db, u] = await Promise.all([claude.use('db'), claude.use('user')]);
      const uid = u && await u.id();
      if (db && uid) col = db.doc('reportes/' + uid).collection('itens');
    } catch (e) { col = null; }
  }
  async function enviar(r) {
    if (!col) return false;
    try { await col.doc(r.id).set(r); return true; } catch (e) { return false; }
  }
  return { iniciar, enviar, ativa: () => !!col };
})();

// o formulário abre por cima da própria janela (aula, prova ou caso), sem perder o que estava nela
function abrirReporte(contexto) {
  const cx = $('modal-caixa');
  if (cx.querySelector('.painel-reporte')) return;
  const antes = [...cx.children];
  antes.forEach(el => el.classList.add('oculto-reporte'));
  const pn = document.createElement('div');
  pn.className = 'painel-reporte';
  pn.innerHTML = `<div class="cab-modal" style="--cor:#E65100"><span class="icone-grande">⚠️</span>
      <div><small>Reportar erro no conteúdo</small><h2>${esc(contexto.titulo)}</h2></div></div>
    <p class="nota">Obrigado por ajudar! O conteúdo é revisado por pessoas, e seu aviso entra na fila de revisão.</p>
    <div class="opcoes-reporte">${TIPOS_REPORTE.map((t, k) => `<label><input type="radio" name="tipo-rep" value="${k}" ${k === 0 ? 'checked' : ''}> ${t}</label>`).join('')}</div>
    <label class="campo">O que está errado? (se souber, diga a lei ou o artigo certo)<textarea id="m-rep-texto" rows="3" maxlength="800" placeholder="Ex.: o prazo certo é de 30 dias, conforme o CDC, art. 18."></textarea></label>
    <p class="nota" id="m-rep-erro" role="alert"></p>
    <div class="botoes"><button class="btn" id="m-rep-cancelar">Voltar</button><button class="btn primario" id="m-rep-enviar">Enviar aviso</button></div>`;
  cx.appendChild(pn);
  cx.scrollTop = 0;
  const fechar = () => { pn.remove(); antes.forEach(el => el.classList.remove('oculto-reporte')); };
  pn.querySelector('#m-rep-cancelar').onclick = fechar;
  pn.querySelector('#m-rep-enviar').onclick = async () => {
    const texto = pn.querySelector('#m-rep-texto').value.trim();
    const tipo = TIPOS_REPORTE[+pn.querySelector('input[name="tipo-rep"]:checked').value];
    if (!texto && tipo === TIPOS_REPORTE[3]) { pn.querySelector('#m-rep-erro').textContent = 'Conte em poucas palavras qual é o problema.'; return; }
    const r = { id: 'r' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5), quando: new Date().toISOString(), onde: contexto.titulo, area: contexto.area || '',
      trecho: (contexto.trecho || '').slice(0, 600), tipo, texto, cidade: s.nome, conteudo: ATUALIZACAO_CONTEUDO };
    guardarReporteLocal(r);
    fechar(); som('certo');
    const naConta = await CaixaReportes.enviar(r);
    toast(naConta ? '⚠️ Aviso enviado aos responsáveis pelo conteúdo. Obrigado!' : '⚠️ Aviso guardado neste aparelho. Para enviá-lo, use 🎓 Modo professor → Erros reportados → Copiar.');
  };
  pn.querySelector('input').focus();
}

// texto que acompanha o reporte: título da janela e o trecho mais próximo do link
function contextoDoReporte(link) {
  const cx = $('modal-caixa');
  const titulo = (cx.querySelector('.cab-modal h2') || {}).innerText || 'Conteúdo do jogo';
  const area = (cx.querySelector('.cab-modal small') || {}).innerText || '';
  const bloco = link.closest('.explicacao, .aula-texto') || cx;
  if (!cx.querySelector('.cab-modal h2')) return { titulo: 'Conteúdo do jogo', area: '', trecho: bloco.innerText };
  const pergunta = (cx.querySelector('.pergunta, .fala') || {}).innerText || '';
  return { titulo, area, trecho: [pergunta, bloco.innerText.replace(/⚠️ Reportar erro.*$/s, '')].filter(Boolean).join(' | ') };
}
function rodapeConteudo() {
  const a = document.createElement('p');
  a.className = 'rodape-conteudo';
  a.innerHTML = `📅 Conteúdo atualizado em ${ATUALIZACAO_CONTEUDO} · <button class="link" data-reportar>⚠️ Reportar erro</button>`;
  return a;
}
// coloca o rodapé em toda aula e toda explicação de resposta que aparecer nas janelas
function marcarConteudo() {
  $('modal-caixa').querySelectorAll('.aula-texto, .explicacao').forEach(b => {
    if (b.querySelector('.rodape-conteudo')) return;
    b.appendChild(rodapeConteudo());
  });
}

function htmlMudancasLegais() {
  return `<details class="mudancas-legais"><summary>📅 Conteúdo atualizado em <b>${ATUALIZACAO_CONTEUDO}</b> · mudanças recentes nas leis</summary>
    <ul>${MUDANCAS_LEGAIS.map(m => `<li><b>${m.ano} · ${m.titulo}.</b> ${m.texto}</li>`).join('')}</ul>
    <p class="nota">Achou algo desatualizado? Use ⚠️ Reportar erro nas aulas e nos casos.</p></details>`;
}
function htmlReportesProfessor() {
  const l = reportesLocais();
  return `<h3>⚠️ Erros reportados ${l.length ? `(${l.length})` : ''}</h3>${l.length
    ? `<ul class="lista-reportes">${l.slice(0, 20).map(r => `<li><b>${esc(r.onde)}</b> · ${esc(r.tipo)}<small>${esc(r.texto || '(sem comentário)')} · ${new Date(r.quando).toLocaleDateString('pt-BR')}</small></li>`).join('')}</ul>
       <div class="botoes esquerda"><button class="btn" id="m-copiar-reportes">📋 Copiar erros reportados</button></div>`
    : '<p class="nota">Nenhum erro reportado neste aparelho. O botão ⚠️ Reportar erro aparece no fim de cada aula e de cada explicação.</p>'}
    ${CaixaReportes.ativa() ? '<p class="nota">Na página publicada, os avisos também vão para a caixa de sugestões que só o dono da página lê.</p>' : ''}`;
}
const textoReportes = () => reportesLocais().map(r => `• ${r.onde} (${r.area}) — ${r.tipo}\n  ${r.texto || '(sem comentário)'}\n  Trecho: ${r.trecho}\n  ${new Date(r.quando).toLocaleString('pt-BR')} · cidade ${r.cidade} · conteúdo de ${r.conteudo}`).join('\n\n');

document.addEventListener('DOMContentLoaded', () => {
  new MutationObserver(marcarConteudo).observe($('modal-caixa'), { childList: true, subtree: true });
  $('modal-caixa').addEventListener('click', e => {
    const b = e.target.closest('[data-reportar]');
    if (b) { e.preventDefault(); abrirReporte(contextoDoReporte(b)); }
    if (e.target.id === 'm-copiar-reportes') copiarTexto(textoReportes(), $('modal-caixa').querySelector('#m-texto') || document.createElement('textarea'), '📋 Erros copiados! Envie ao responsável pelo conteúdo.');
  });
  CaixaReportes.iniciar();
});
