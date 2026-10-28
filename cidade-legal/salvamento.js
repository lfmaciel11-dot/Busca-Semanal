/* ══════════════════════════════════════════════════════════════════════════
   CIDADE LEGAL — Salvamento
   • Salva sozinho a cada ação, neste aparelho, e mostra "✓ salvo" no topo.
   • Minhas cidades: várias cidades guardadas; trocar, criar e excluir.
   • Na página publicada no Claude, salva também na conta da pessoa (espaço
     privado dela) e oferece "continuar de onde parou" em qualquer aparelho.
   • Levar para outro aparelho sem arquivo: código curto (comprimido) ou link.
══════════════════════════════════════════════════════════════════════════ */

const CHAVE_INDICE = 'cidade-legal-cidades', PREFIXO_SLOT = 'cidade-legal-slot:';
const novoIdCidade = () => 'c' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
const estadoParaSalvar = () => ({ ...s, selecionado: null });

/* ── Cidades guardadas neste aparelho ─────────────────────────────────────── */
function lerIndice() { try { return JSON.parse(localStorage.getItem(CHAVE_INDICE)) || {}; } catch (e) { return {}; } }
function resumoCidade(e) { return { nome: e.nome, mes: e.mes, pop: e.pop || 0, xp: e.xp || 0, atualizado: e.atualizado || 0 }; }
function guardarNoSlot() {
  if (!s || !s.idCidade) return;
  try {
    localStorage.setItem(PREFIXO_SLOT + s.idCidade, JSON.stringify(estadoParaSalvar()));
    const ind = lerIndice(); ind[s.idCidade] = resumoCidade(s);
    localStorage.setItem(CHAVE_INDICE, JSON.stringify(ind));
  } catch (e) { /* armazenamento cheio ou bloqueado: segue só com o salvamento principal */ }
}
function abrirCidadeGuardada(estado) {
  estado.selecionado = null;
  try { window.trocandoCidade = true; localStorage.setItem(CHAVE_SAVE, JSON.stringify(estado)); location.reload(); }
  catch (e) { window.trocandoCidade = false; s = estado; migrarEstado(); fecharModal(); render(); toast(`🏙️ ${estado.nome} aberta!`); }
}
function excluirCidadeLocal(id) {
  try { localStorage.removeItem(PREFIXO_SLOT + id); const ind = lerIndice(); delete ind[id]; localStorage.setItem(CHAVE_INDICE, JSON.stringify(ind)); } catch (e) { /* ignora */ }
}

/* ── Indicador "salvo" e gancho chamado por salvar() ──────────────────────── */
let estadoNuvem = 'local'; // local | salvando | nuvem | erro
function mostrarStatusSalvo() {
  const el = $('status-salvo');
  if (!el) return;
  const t = { local: ['✓ salvo', 'Salvo automaticamente neste aparelho'], salvando: ['☁️ salvando…', 'Salvando na sua conta'],
    nuvem: ['☁️ salvo', 'Salvo na sua conta: continue de qualquer aparelho'], erro: ['✓ salvo aqui', 'Salvo neste aparelho; não foi possível salvar na conta agora'] }[estadoNuvem];
  el.textContent = t[0]; el.title = t[1]; el.className = 'status-salvo ' + estadoNuvem;
}
function aoSalvar() {
  s.atualizado = Date.now();
  guardarNoSlot();
  Nuvem.agendar();
  mostrarStatusSalvo();
}

/* ── Código curto (comprimido) ────────────────────────────────────────────── */
const b64url = bytes => { let t = ''; bytes.forEach(b => { t += String.fromCharCode(b); }); return btoa(t).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); };
const deB64url = txt => Uint8Array.from(atob(txt.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0));
async function comprimir(texto) {
  if (!window.CompressionStream) return null;
  const fluxo = new Blob([texto]).stream().pipeThrough(new CompressionStream('deflate-raw'));
  return new Uint8Array(await new Response(fluxo).arrayBuffer());
}
async function descomprimir(bytes) {
  const fluxo = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
  return new Response(fluxo).text();
}
async function gerarCodigo(estado = estadoParaSalvar()) {
  const json = JSON.stringify(estado), z = await comprimir(json).catch(() => null);
  return z ? 'CL2.' + b64url(z) : codigoCidade();
}
async function lerCodigo(txt) {
  txt = txt.trim().replace(/^.*#cidade=/, '');
  if (txt.startsWith('CL2.')) {
    const obj = JSON.parse(await descomprimir(deB64url(txt.slice(4).replace(/\s+/g, ''))));
    return lerCidade(JSON.stringify(obj));
  }
  return lerCidade(txt); // códigos antigos e arquivos .json
}

/* ── Conta na nuvem (só na página publicada no Claude) ───────────────────── */
const Nuvem = (() => {
  let db = null, col = null, timer = null, ultimoEnviado = '', ocupado = false;
  async function iniciar() {
    if (!window.claude || !claude.use) return false;
    try {
      const [d, u] = await Promise.all([claude.use('db'), claude.use('user')]);
      const uid = u && await u.id();
      if (!d || !uid) return false;
      db = d; col = db.doc('data/users/' + uid + '/conta').collection('cidades');
      return true;
    } catch (e) { return false; }
  }
  const ativa = () => !!col;
  function agendar() {
    if (!col) return;
    if (timer) return; // no máximo um envio a cada 4 s, mesmo com a tela redesenhando sem parar
    timer = setTimeout(() => { timer = null; enviar(); }, 4000);
  }
  async function enviar() {
    if (!col || !s || !s.idCidade || ocupado) return;
    if (window.jogoNovo && !s.mapa.some(l => l && PREDIOS[l.tipo] && l.tipo !== 'prefeitura') && !s.xp) return; // cidade ainda não começada
    const estado = await gerarCodigo().catch(() => null);
    if (!estado || estado === ultimoEnviado) return;
    if (estado.length > 240000) { estadoNuvem = 'erro'; mostrarStatusSalvo(); return; }
    ocupado = true; estadoNuvem = 'salvando'; mostrarStatusSalvo();
    try {
      await col.doc(s.idCidade).set({ v: 2, ...resumoCidade(s), estado });
      ultimoEnviado = estado; estadoNuvem = 'nuvem';
    } catch (e) {
      estadoNuvem = 'erro';
      if (e && e.code === 'unavailable') setTimeout(enviar, 3000 + Math.random() * 3000);
    }
    ocupado = false; mostrarStatusSalvo();
  }
  async function listar() {
    if (!col) return [];
    try { const q = await col.orderBy('atualizado', 'desc').limit(30).get(); return q.docs.map(d => ({ id: d.id, ...d.data() })); }
    catch (e) { return []; }
  }
  async function abrir(id) {
    const d = await col.doc(id).get();
    return d.exists ? lerCodigo(d.data().estado) : null;
  }
  async function excluir(id) { try { await col.doc(id).delete(); } catch (e) { /* ignora */ } }
  return { iniciar, ativa, agendar, enviar, listar, abrir, excluir };
})();

/* ── Minhas cidades ───────────────────────────────────────────────────────── */
async function abrirMinhasCidades() {
  guardarNoSlot();
  const locais = lerIndice(), nuvem = await Nuvem.listar();
  const todas = {};
  Object.entries(locais).forEach(([id, r]) => { todas[id] = { id, ...r, aqui: true }; });
  nuvem.forEach(r => { todas[r.id] = { ...(todas[r.id] || {}), ...resumoCidade(r), id: r.id, conta: true, aqui: !!(todas[r.id] && todas[r.id].aqui), atualizado: Math.max(r.atualizado || 0, (todas[r.id] || {}).atualizado || 0) }; });
  if (!todas[s.idCidade]) todas[s.idCidade] = { id: s.idCidade, ...resumoCidade(s), aqui: true };
  const lista = Object.values(todas).sort((a, b) => (b.id === s.idCidade) - (a.id === s.idCidade) || b.atualizado - a.atualizado);
  const quando = t => t ? new Date(t).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }) : '';
  const linkOk = /^https?:$/.test(location.protocol) && !window.claude;
  abrirModal(`<div class="cab-modal" style="--cor:#7C4DFF"><span class="icone-grande">🏙️</span>
      <div><small>${Nuvem.ativa() ? '☁️ Salvas na sua conta: abra de qualquer aparelho' : '💾 O jogo salva sozinho neste aparelho'}</small><h2>Minhas cidades</h2></div></div>
    <ul class="minhas-cidades">${lista.map(c => `<li class="${c.id === s.idCidade ? 'atual' : ''}">
      <span class="icone-cidade">${c.id === s.idCidade ? '⭐' : '🏙️'}</span>
      <div><b>${esc(c.nome || 'Cidade')}</b><small>${nomeMes(c.mes || 1)} do Ano ${anoDe(c.mes || 1)} · ${fmt(c.pop || 0)} hab. · ${fmt(c.xp || 0)} XP${c.atualizado ? ' · ' + quando(c.atualizado) : ''}${c.conta ? ' · ☁️' : ''}</small></div>
      ${c.id === s.idCidade ? '<button class="btn pequeno" id="m-renomear" title="Alterar o nome da cidade">✏️ Renomear</button><span class="selo ok">jogando</span>' : `<button class="btn pequeno primario" data-abrir="${c.id}">Continuar</button><button class="btn pequeno" data-excluir="${c.id}" title="Excluir esta cidade" aria-label="Excluir ${esc(c.nome || 'cidade')}">🗑️</button>`}
    </li>`).join('')}</ul>
    <div class="botoes esquerda"><button class="btn" id="m-nova">➕ Nova cidade</button></div>
    <details class="levar"><summary>📲 Levar para outro aparelho ${Nuvem.ativa() ? '(sem conta)' : ''}</summary>
      <p class="nota">${Nuvem.ativa() ? 'Com a mesma conta, basta abrir o jogo no outro aparelho. Para entregar a cidade a outra pessoa ou abrir fora do Claude, use o código.' : 'Copie o código e cole no outro aparelho, em "Abrir pelo código". Funciona por WhatsApp, e-mail ou na plataforma da escola.'}</p>
      <div class="botoes esquerda">
        <button class="btn primario" id="m-copiar">📋 Copiar código</button>
        ${navigator.share ? '<button class="btn" id="m-compartilhar">📤 Compartilhar</button>' : ''}
        ${linkOk ? '<button class="btn" id="m-link">🔗 Copiar link</button>' : ''}
      </div>
      <label class="campo">Abrir pelo código<textarea id="m-codigo" rows="2" placeholder="Cole aqui o código da cidade (começa com CL2.)"></textarea></label>
      <p class="nota" id="m-erro" role="alert"></p>
      <div class="botoes esquerda"><button class="btn" id="m-carregar">🏙️ Abrir cidade do código</button></div>
      <details class="avancado so-arquivo"><summary>Opções avançadas: arquivo</summary>
        <div class="botoes esquerda"><button class="btn" id="m-baixar">⬇️ Baixar arquivo</button></div>
        <label class="campo">Abrir arquivo (.json)<input type="file" id="m-arquivo" accept=".json,application/json"></label>
      </details>
    </details>
    <textarea id="m-texto" class="oculto" readonly></textarea>
    <div class="botoes"><button class="btn primario" id="m-fechar">Fechar</button></div>`, cx => {
    const erro = msg => { cx.querySelector('#m-erro').textContent = msg; };
    cx.querySelector('#m-fechar').onclick = fecharModal;
    cx.querySelectorAll('[data-abrir]').forEach(b => b.onclick = async () => {
      const id = b.dataset.abrir; b.disabled = true; b.textContent = 'Abrindo…';
      let estado = null;
      try { const local = localStorage.getItem(PREFIXO_SLOT + id); if (local) estado = JSON.parse(local); } catch (e) { /* ignora */ }
      const remoto = todas[id].conta && (!estado || (todas[id].atualizado || 0) > (estado.atualizado || 0)) ? await Nuvem.abrir(id).catch(() => null) : null;
      estado = remoto || estado;
      if (!estado) { b.disabled = false; b.textContent = 'Continuar'; toast('Não consegui abrir essa cidade agora. Tente de novo.'); return; }
      await Nuvem.enviar(); // garante que a cidade atual fique salva antes de trocar
      abrirCidadeGuardada(estado);
    });
    cx.querySelectorAll('[data-excluir]').forEach(b => b.onclick = () => {
      const c = todas[b.dataset.excluir];
      abrirModal(`<div class="resultado"><span class="icone-grande">🗑️</span><h2>Excluir ${esc(c.nome || 'a cidade')}?</h2>
        <p>A cidade some deste aparelho${c.conta ? ' e da sua conta' : ''}. Isso não pode ser desfeito.</p></div>
        <div class="botoes"><button class="btn" id="m-voltar">Cancelar</button><button class="btn perigo" id="m-sim">Excluir</button></div>`, cy => {
        cy.querySelector('#m-voltar').onclick = abrirMinhasCidades;
        cy.querySelector('#m-sim').onclick = async () => { excluirCidadeLocal(c.id); if (c.conta) await Nuvem.excluir(c.id); toast(`🗑️ ${c.nome || 'Cidade'} excluída.`); abrirMinhasCidades(); };
      });
    });
    cx.querySelector('#m-nova').onclick = novaCidade;
    cx.querySelector('#m-renomear').onclick = () => abrirRenomear(abrirMinhasCidades);
    cx.querySelector('#m-copiar').onclick = async () => copiarTexto(await gerarCodigo(), cx.querySelector('#m-texto'), '📋 Código copiado! Cole no outro aparelho, em "Abrir pelo código".');
    const comp = cx.querySelector('#m-compartilhar');
    if (comp) comp.onclick = async () => { try { await navigator.share({ title: `Minha cidade: ${s.nome}`, text: `Código da minha cidade no Cidade Legal (Educa Direito):\n${await gerarCodigo()}` }); } catch (e) { /* cancelado */ } };
    const link = cx.querySelector('#m-link');
    if (link) link.onclick = async () => copiarTexto(location.href.split('#')[0] + '#cidade=' + await gerarCodigo(), cx.querySelector('#m-texto'), '🔗 Link copiado! Abra no outro aparelho para continuar.');
    cx.querySelector('#m-carregar').onclick = async () => {
      const txt = cx.querySelector('#m-codigo').value;
      if (!txt.trim()) return erro('Cole o código da cidade.');
      try { const e = await lerCodigo(txt); e.idCidade = e.idCidade || novoIdCidade(); abrirCidadeGuardada(e); }
      catch (x) { erro('Esse código não é de uma cidade válida. Confira se copiou o código inteiro.'); }
    };
    cx.querySelector('#m-baixar').onclick = () => baixarArquivo(`${s.nome.replace(/[^\w\-]+/g, '-').toLowerCase() || 'cidade'}.cidadelegal.json`, JSON.stringify(estadoParaSalvar()), 'application/json');
    cx.querySelector('#m-arquivo').onchange = e => {
      const f = e.target.files[0]; if (!f) return;
      const leitor = new FileReader();
      leitor.onload = () => { try { const est = lerCidade(leitor.result); est.idCidade = est.idCidade || novoIdCidade(); abrirCidadeGuardada(est); } catch (x) { erro('Não consegui ler esse arquivo.'); } };
      leitor.readAsText(f);
    };
  });
}
// alterar o nome da cidade em jogo (placas das entradas, cartão-postal e Minhas cidades acompanham)
function abrirRenomear(aoTerminar) {
  abrirModal(`<div class="cab-modal" style="--cor:#7C4DFF"><span class="icone-grande">✏️</span>
      <div><small>${nomeMes(s.mes)} do Ano ${anoDe(s.mes)} · ${fmt(s.pop)} habitantes</small><h2>Alterar o nome da cidade</h2></div></div>
    <label class="campo">Novo nome<input id="m-novo-nome" maxlength="30" value="${esc(s.nome)}" autocomplete="off"></label>
    <p class="nota" id="m-erro" role="alert"></p>
    <div class="botoes"><button class="btn" id="m-cancelar">Cancelar</button><button class="btn primario" id="m-ok">Salvar nome</button></div>`, cx => {
    const campo = cx.querySelector('#m-novo-nome');
    campo.focus(); campo.select();
    const voltar = () => (aoTerminar ? aoTerminar() : fecharModal());
    const salvarNome = () => {
      const nome = campo.value.replace(/\s+/g, ' ').trim();
      if (!nome) { cx.querySelector('#m-erro').textContent = 'Digite um nome para a cidade.'; return; }
      if (nome !== s.nome) {
        registrar(`✏️ A cidade <b>${esc(s.nome)}</b> passou a se chamar <b>${esc(nome)}</b>.`);
        s.nome = nome; render(); toast(`✏️ Agora a cidade se chama ${nome}.`);
      }
      voltar();
    };
    cx.querySelector('#m-cancelar').onclick = voltar;
    cx.querySelector('#m-ok').onclick = salvarNome;
    campo.onkeydown = e => { if (e.key === 'Enter') { e.preventDefault(); salvarNome(); } };
  });
}
// nova cidade: a atual continua guardada em "Minhas cidades"
async function novaCidade() {
  guardarNoSlot(); await Nuvem.enviar();
  const { aluno, turma } = s, idCidade = novoIdCidade();
  try {
    window.trocandoCidade = true;
    localStorage.setItem('cidade-legal-nova', JSON.stringify({ aluno, turma, idCidade })); // a página recarrega como jogo novo
    localStorage.removeItem(CHAVE_SAVE); location.reload();
  } catch (e) { window.trocandoCidade = false; s = novoEstado(); Object.assign(s, { aluno, turma, idCidade }); fecharModal(); render(); boasVindas(); }
}

/* ── Continuar de onde parou (outro aparelho) ─────────────────────────────── */
async function ofertarContinuar(semJogoLocal) {
  const nuvem = await Nuvem.listar();
  const mais = nuvem.filter(c => c.id !== s.idCidade || (c.atualizado || 0) > (s.atualizado || 0) + 60000);
  if (!mais.length) return;
  if (!semJogoLocal && !mais.some(c => c.id === s.idCidade)) return; // já jogando aqui: as outras ficam em "Minhas cidades"
  const c = mais[0];
  abrirModal(`<div class="resultado"><span class="icone-grande">☁️</span><h2>Continuar de onde parou?</h2>
      <p>Encontrei <b>${esc(c.nome)}</b> salva na sua conta: ${nomeMes(c.mes)} do Ano ${anoDe(c.mes)}, ${fmt(c.pop || 0)} habitantes.</p></div>
    <div class="botoes"><button class="btn" id="m-nao">${semJogoLocal ? 'Começar uma cidade nova' : 'Continuar a deste aparelho'}</button>
      <button class="btn primario" id="m-sim">▶ Continuar ${esc(c.nome)}</button></div>`, cx => {
    cx.querySelector('#m-nao').onclick = () => { fecharModal(); if (semJogoLocal) boasVindas(); };
    cx.querySelector('#m-sim').onclick = async () => { cx.querySelector('#m-sim').disabled = true; const e = await Nuvem.abrir(c.id).catch(() => null); if (e) abrirCidadeGuardada(e); else toast('Não consegui abrir agora. Tente pelo botão 💾.'); };
  });
}

document.addEventListener('DOMContentLoaded', async () => {
  let semJogoLocal = !!window.jogoNovo;
  try { // "Nova cidade" pedida no jogo anterior: mantém aluno e turma, e não oferece outra cidade da conta
    const nova = JSON.parse(localStorage.getItem('cidade-legal-nova'));
    if (nova) { Object.assign(s, nova); localStorage.removeItem('cidade-legal-nova'); semJogoLocal = false; }
  } catch (e) { /* ignora */ }
  if (!s.idCidade) { s.idCidade = novoIdCidade(); }
  $('btn-renomear').onclick = () => { som('clique'); abrirRenomear(); };
  guardarNoSlot(); mostrarStatusSalvo();
  // link com código (#cidade=...): oferece abrir a cidade recebida
  if (location.hash.startsWith('#cidade=')) {
    try {
      const e = await lerCodigo(decodeURIComponent(location.hash));
      history.replaceState(null, '', location.pathname + location.search);
      abrirModal(`<div class="resultado"><span class="icone-grande">🔗</span><h2>Abrir a cidade do link?</h2>
          <p><b>${esc(e.nome)}</b> · ${nomeMes(e.mes)} do Ano ${anoDe(e.mes)}. A cidade atual continua guardada em "Minhas cidades".</p></div>
        <div class="botoes"><button class="btn" id="m-nao">Agora não</button><button class="btn primario" id="m-sim">Abrir</button></div>`, cx => {
        cx.querySelector('#m-nao').onclick = fecharModal;
        cx.querySelector('#m-sim').onclick = () => { e.idCidade = e.idCidade || novoIdCidade(); abrirCidadeGuardada(e); };
      });
    } catch (x) { toast('O link não tem uma cidade válida.'); }
  }
  addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') Nuvem.enviar(); });
  if (await Nuvem.iniciar()) {
    estadoNuvem = 'nuvem'; mostrarStatusSalvo();
    Nuvem.agendar();
    if (!location.hash) ofertarContinuar(semJogoLocal);
  }
});
