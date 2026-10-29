# 🏛️ Cidade Legal · um jogo do Educa Direito

<img src="marca/logo-roxo.png" alt="Educa Direito — Democratizando o Direito" width="260">


Jogo educativo de construção de cidade em que o jogador, como prefeito(a), aprende a legislação brasileira de forma simplificada.

**Como jogar:** abra `index.html` no navegador (não precisa de servidor nem instalação; funciona offline).

A cidade é em **3D** (Three.js, em `vendor/`): mapa de 32×24 lotes com duas avenidas, rio e pontes, sombras do sol, carros, nuvens e noite com janelas acesas no tema escuro. Arraste para mover o mapa, botão direito (ou dois dedos) para girar, role para zoom; W A S D também movem e Q E giram. Na aba Bairros, 📍 leva a câmera até cada bairro. Se o navegador não tiver WebGL, o jogo cai automaticamente para a versão isométrica 2.5D.

O tempo passa de verdade: o sol cruza o céu, entardece e anoitece (janelas e postes acendem), e cada "Próximo mês" mostra um dia acelerado. O calendário (Janeiro · Ano 1) define a estação: as árvores e a grama mudam de cor e os ipês florescem (roxos em junho/julho, amarelos em agosto/setembro). Pedestres caminham nas calçadas conforme a população cresce.

| Arquivo | Função |
|---|---|
| `dados.js` | Conteúdo jurídico: prédios, aulas, perguntas, casos, missões |
| `jogo.js` | Regras, economia, interface e salvamento |
| `cidade-viva.js` | Indicadores, desafios, Fórum, licitação, ocorrências, turma, minimapa, sons e acessibilidade |
| `cena3d.js` | Cidade em 3D (modelos dos prédios, câmera, trânsito, dia/noite) |
| `isometrico.js` | Versão 2.5D em canvas, usada quando não há WebGL |
| `texturas.js` | Texturas PBR (cor + relevo) embutidas, geradas por `ferramentas/gerar_texturas.py` |
| `texturas/` | As mesmas texturas em JPG: grama, asfalto, piso, tijolo, reboco, concreto, telha, madeira, pedra portuguesa, terra e água |
| `marca/` | Logos do Educa Direito: originais (azul, roxo e fundo roxo), versões com fundo transparente, versão para tema escuro e ícone do app |
| `vendor/` | Three.js r147, OrbitControls e pós-processamento — SSAO e Bloom (licença MIT) |

## Guia do primeiro acesso

Na primeira cidade, depois de "Começar mandato", um **tour guiado** (`guia.js`) destaca com um holofote cada parte da tela: a Prefeitura, os números da cidade, o painel de construção, o botão de passar o mês, os balões dos cidadãos, missões, bairros, controles do mapa, celular do prefeito, Minhas cidades e acessibilidade. Dá para usar Voltar, Próximo ou as setas, e pular com Esc. Para rever, clique no ícone do Educa Direito (janela Sobre) ou tecle **?**.

## Salvar o progresso

- **Salva sozinho** a cada ação; o topo mostra "✓ salvo" (neste aparelho) ou "☁️ salvo" (na conta).
- **☁️ Na página publicada no Claude**, o progresso vai para a conta da pessoa, num espaço privado só dela. Ao abrir o jogo em outro aparelho, ele pergunta "Continuar de onde parou?".
- **✏️ Alterar o nome da cidade**: no lápis ao lado do nome, no topo, ou em Minhas cidades. As placas das entradas, o cartão-postal e a lista de cidades acompanham o novo nome.
- **💾 Minhas cidades**: várias cidades guardadas; continuar qualquer uma, começar uma nova (a atual fica guardada) ou excluir.
- **📲 Levar para outro aparelho sem arquivo**: código curto e comprimido (começa com `CL2.`), botão Compartilhar (WhatsApp, e-mail) e, quando o jogo roda num site, link que já abre a cidade. Códigos antigos continuam valendo. O arquivo `.json` ficou em "Opções avançadas".

## Confiabilidade do conteúdo

- **Conteúdo atualizado em**: toda aula e toda explicação de resposta (provas, casos, projetos de lei, audiências e ocorrências) termina com a data da última revisão do conteúdo (`ATUALIZACAO_CONTEUDO` em `revisao.js`).
- **Mudanças recentes nas leis**: no alto da aba 📖 Leis, a lista `MUDANCAS_LEGAIS` explica o que mudou (Reforma Tributária, Lei 14.133, Lei Geral do Esporte, injúria racial, agrotóxicos, Estatuto da Pessoa Idosa).
- **⚠️ Reportar erro**: abre um formulário por cima da janela, sem perder a pergunta. O aviso fica no aparelho e aparece no 🎓 Modo professor → *Erros reportados*, com botão para copiar. Na página publicada no Claude, também vai para a caixa `reportes/<pessoa>` do banco da página, que só o dono lê (quem joga precisa de acesso de *Colaborador* para gravar).
- **Planilha de revisão jurídica**: `revisao/revisao-juridica.xlsx` lista os 803 textos jurídicos do jogo (aulas, provas, casos, projetos, audiências, ocorrências, bairros), com base legal, prioridade, alerta de lei possivelmente desatualizada e colunas para o revisor marcar status, correção, nome e data. A aba *Resumo* conta o andamento.

## Cidade viva (desafios, Fórum, licitação, turma e acessibilidade)

Tudo em `cidade-viva.js`:

- **📊 Painel da cidade** (aba Missões): mobilidade, acessibilidade, meio ambiente, segurança e saúde, de 0 a 100, e o índice geral.
- **🏁 Desafios com prazo**: bairro acessível, meta do saneamento, trânsito seguro, cidade verde e mobilidade para todos, cada um com prêmio e um ponto de lei.
- **🥇 Medalhas** por área do Direito (4 acertos ou mais, com 70% de aproveitamento).
- **⚖️ Audiências no Fórum**: o jogador ouve as duas partes e dá a sentença (consumidor, vizinhança, trabalho doméstico, pensão alimentícia e dano ambiental).
- **📑 Licitação** das obras públicas (Lei 14.133/2021): escolher entre a proposta habilitada, a do parente do prefeito e a sem documentos. A escolha certa barateia a obra.
- **🗳️ Orçamento participativo** a cada 6 meses (Estatuto da Cidade, art. 44): a população vota a prioridade e o prefeito assume um compromisso.
- **🏘️ Bairros que crescem**: com a cidade feliz e sem faltar serviços, as moradias sobem de nível sozinhas.
- **🔁 Revisão espaçada**: o que foi errado volta como pergunta semanas depois, até fixar.
- **🚨 Ocorrências**: incêndios e acidentes aparecem no mapa, com fogo e fumaça, carros batidos e triângulo de sinalização. Com Bombeiros, posto de saúde ou delegacia, o socorro chega de sirene ligada, os outros carros abrem a faixa da esquerda (CTB, art. 29, VII) e o veículo de emergência passa no vermelho. Sem eles, há prejuízo. Cada ocorrência traz uma pergunta (Lei Kiss, omissão de socorro, CTB arts. 46, 176, 178, 304 e 305).
- **🚗 Hora do rush** (7h–9h e 17h–19h) com mais carros, e madrugada quase vazia; o comércio fecha à noite; sem 💡 Iluminação Pública, os postes ficam quase apagados.
- **🗺️ Minimapa** clicável e **🖼️ cartão-postal** da cidade.
- **🔊 Sons ambientes**: trânsito (mais forte no rush e de perto), chuva, pássaros de dia, sirene nas emergências e o bipe do semáforo sonoro.
- **👩‍🏫 Turma** (Modo professor): o aluno copia um **código de entrega**; o professor cola os códigos no **Painel da turma** (ranking, medalhas e áreas que a turma mais erra). Na **Competição**, todos digitam a mesma semente e começam com a mesma cidade.
- **♿ Acessibilidade do jogo**: 🔊 Ouvir (leitura em voz alta de aulas, casos e ocorrências), letras maiores, alto contraste, menos animação e atalhos de teclado (**?** mostra a lista; **Shift+M** passa o mês).

## Ciclo do jogo

1. **Estudar** a aula de uma área do Direito (resumo, pontos-chave com artigo de lei e exemplo prático).
2. **Tirar a licença**: quiz de 3 perguntas (precisa acertar 2) para liberar o prédio.
3. **Construir** no mapa — cada prédio gera renda, população ou felicidade. Prédios colados em rua rendem +20%.
4. **Avançar o mês**: arrecadação, manutenção e um cidadão aparece com um balão ❗ sobre um prédio — clique para resolver o caso aplicando a lei.
5. **Expandir a cidade**: só o Centro começa liberado. Bairro Oeste (💰 600), Vila Norte (💰 900), Jardim Sul (💰 1.300), Beira-Rio (💰 2.200), Chácaras do Oeste (💰 3.000), Serra Norte (💰 4.200), Distrito Industrial (💰 5.500) e Vila Esperança (💰 7.000) ficam bloqueados até o caixa juntar o valor — cada compra ensina Direito Urbanístico e Ambiental (Plano Diretor, desapropriação, loteamento, função social e IPTU progressivo, IPTU × ITR, áreas protegidas e mananciais, EIV e licenciamento, Reurb). Jogos salvos no mapa antigo (20×14) são levados para o meio do mapa novo.
6. **Subir de título** (Estudante → Estagiário → Bacharel → Advogado → Juiz → Desembargador → Ministro do STF) e liberar áreas mais avançadas.

## Áreas cobertas

| Prédio | Área do Direito |
|---|---|
| 🏛️ Prefeitura | Constitucional e Administrativo (federação, LIMPE, licitação, concurso) |
| 🏠 Casas | Civil — propriedade, registro, usucapião, vizinhança |
| 🏢 Prédio de Aluguel | Lei do Inquilinato (8.245/91) |
| 🏪 Mercado | Código de Defesa do Consumidor |
| 🏭 Fábrica | Trabalho (CF art. 7º e CLT) |
| 🏫 Escola | Educação e ECA |
| 🏥 Posto de Saúde | SUS (CF art. 196, Lei 8.080/90) |
| 🌳 Parque | Ambiental (CF art. 225, Código Florestal, Lei 9.605/98) |
| 🚓 Delegacia | Penal e Processo Penal |
| ⚖️ Fórum | Acesso à Justiça, Juizados Especiais, Defensoria |
| 🗳️ Câmara Municipal | Processo legislativo municipal |
| 📜 Cartório | Família e registros públicos |
| 💾 Centro de Dados | LGPD |
| 🚌 Terminal de Ônibus | Trânsito (CTB), Estatuto da Pessoa Idosa, LBI |
| 💰 Secretaria da Fazenda | Tributário e Responsabilidade Fiscal |
| 🏦 Banco | Bancário (Súmulas 297 e 479 do STJ, superendividamento) |
| 🧓 Agência do INSS | Previdenciário (EC 103/2019, BPC/LOAS, carência) |
| 🏙️ Condomínio | Condominial (multa de 2%, síndico, condômino antissocial, animais) |
| 🛐 Templo | Liberdade religiosa e Estado laico |
| 🏢 Escritórios | Empresarial (limitada, desconsideração, recuperação judicial) |
| 🚒 Bombeiros | Prevenção e Defesa Civil (Lei Kiss, Lei 12.608/2012, omissão de socorro) |
| ♻️ Ecoponto | Resíduos sólidos (logística reversa, cores da coleta seletiva) |
| 🎭 Centro Cultural | Direitos autorais (70 anos, ECAD, citação, paródia) |

| 💧 Estação de Água | Saneamento: Novo Marco (metas de 2033), titularidade municipal, serviço essencial |
| 🚽 Estação de Esgoto | Saneamento: ligação obrigatória à rede, fossas, poluição de rios |
| 🔆 Usina Solar | Energia: competência da União, ANEEL, geração distribuída (Lei 14.300/2022) |
| 💡 Iluminação Pública | Contribuição do art. 149-A e Súmula Vinculante 41 |
| 📡 Torre de Telecom | Marco Civil da Internet: neutralidade, registros de conexão, não suspensão |
| 🌀 Piscinão | Drenagem urbana (Lei 11.445/2007, art. 36) e APP de margens de rios |

A partir de 60 habitantes, a cidade precisa de **água, esgoto e energia** (cada estação atende cerca de 150 pessoas). O mapa tem rio, córrego e lagoa; o jogador pode construir 🌉 pontes sobre a água. Os cruzamentos ganham **semáforos** automáticos e os carros param no vermelho.

Também há **enfeites** sem licença (🌳 árvore, 🌷 canteiro, ⛲ praça com calçadão de pedra portuguesa, 🏞️ lagoa com patos e 🚏 ponto de ônibus; e, na infraestrutura, 🛣️ rua e 🌉 ponte — prédios colados em rua rendem +20%) e um menu de construção por categorias.

### Rede de proteção, justiça e cidadania digital

Nove prédios novos, cada um com aula, prova de licença, casos de cidadãos e modelo 3D com letreiro:

| Prédio | Categoria | O que ensina |
|---|---|---|
| 💜 Delegacia da Mulher | Serviços | Lei Maria da Penha: 5 formas de violência, medidas protetivas em 48 h, mesmo sem BO, Ligue 180 |
| 🧒 Conselho Tutelar | Social | ECA, prioridade absoluta, trabalho infantil, Lei Menino Bernardo, dever de comunicar maus-tratos |
| 🍼 Creche municipal | Social | Vaga em creche como direito exigível (STF, Tema 548), educação obrigatória dos 4 aos 17 |
| 🛡️ Defensoria Pública | Governo | Assistência jurídica gratuita, gratuidade da justiça, ação civil pública |
| 📜 Ministério Público | Governo | Ação penal pública, inquérito civil, independência funcional |
| 🧾 Procon | Social | Vício do produto (30 dias), prazos de reclamação, cobrança em dobro, sanções do CDC |
| 🤝 CRAS | Social | LOAS, BPC, Bolsa Família e CadÚnico |
| 🚑 Hospital e UPA 24h | Serviços | Cheque-caução é crime, classificação de risco, prontuário, acompanhante, carência de 24 h |
| 💻 Delegacia de Crimes Cibernéticos | Serviços | Cyberbullying, golpe do Pix e MED, invasão de dispositivo, foto íntima, LGPD e ECA Digital |

Missões m22 a m24 pedem a rede completa. Os casos novos ficam no fim de `CASOS` para não mudar os índices salvos.

### Eleição jogável

A cada 4 anos, em agosto, começa a **campanha eleitoral**: um balão na Prefeitura abre 4 decisões sorteadas entre 11 dilemas (outdoor, compra de votos, uso da máquina pública, inauguração e showmício, Ficha Limpa, brindes, deepfake, impulsionamento, doação de empresa, pesquisa sem registro, distribuição de bens no ano eleitoral). Escolhas legais rendem votos; as irregulares geram multa, e compra de votos ou uso da máquina levam à cassação do diploma. Em outubro sai a apuração, que soma felicidade, reputação e campanha. Depois de uma reeleição, o jogador coordena a campanha de um(a) sucessor(a), porque a Constituição só permite um mandato seguido.

### Zona rural, indústria, transporte, porto e aeroporto

| Construção | Área do Direito |
|---|---|
| 🌾 Lavoura | Agrário: função social da terra (CF, art. 186), reforma agrária, pequena propriedade impenhorável, agrotóxicos |
| 🐄 Fazenda de gado | Ambiental rural: Reserva Legal, APP, CAR e maus-tratos a animais |
| 🧺 Cooperativa agrícola | Cooperativas (Lei 5.764/1971), agricultura familiar e merenda escolar (PNAE) |
| 📦 Centro logístico | Transporte de cargas: descanso do motorista (CTB, art. 67-C; CLT), ANTT, excesso de peso |
| ⚙️ Indústria pesada | Responsabilidade ambiental objetiva, crime ambiental da empresa, dano ambiental imprescritível |
| 🗑️ Aterro sanitário | Resíduos sólidos: fim dos lixões, rejeitos, catadores (Lei 12.305/2010) |
| 🚕 Ponto de táxi | Mobilidade urbana, táxis e aplicativos (Lei 12.587/2012; ADPF 449) |
| 🅿️ Estacionamento | Responsabilidade por danos e furtos (Súmula 130 do STJ), vagas reservadas |
| ⛽ Posto de combustível | ANP, combustível adulterado, cartel |
| 🚆 Estação de VLT | Transporte como direito social (EC 90/2015), Plano de Mobilidade |
| ⚓ Porto fluvial | Portos e navegação (CF, art. 21, XII; Lei 12.815/2013; Capitania dos Portos); só na margem da água |
| ✈️ Aeroporto | ANAC, zonas de ruído, direitos do passageiro (Resolução ANAC 400/2016); longe das moradias |

**Zoneamento**: lavoura, gado e cooperativa rendem 30% a mais nas Chácaras do Oeste ou na Serra Norte; centro logístico e indústria, no Distrito Industrial; o porto, na Beira-Rio ou no Distrito Industrial. No trânsito aparecem táxis, ônibus, caminhões, ambulância, caminhão de bombeiros, coleta de lixo e trator, conforme o que a cidade tem. Com porto, um navio de carga sobe o rio; com aeroporto, um avião circula sobre a cidade.

### Avenidas, estacionamento e sinalização

As duas avenidas principais fazem **curvas** ao sair da cidade (Serra Norte, Vila Esperança, Chácaras e Distrito Industrial) e seguem como estradas até o horizonte; os carros acompanham as curvas. Jogos salvos ganham o novo traçado se os lotes estiverem livres; se não, as avenidas continuam retas.

A aba **🚸 Sinalização** reúne o que é instalado sobre as ruas:

| Item | Onde pode | O que ensina |
|---|---|---|
| 🚙 Zona Azul | Trecho reto, longe da esquina, fora da ponte; rende tarifa | Estacionamento rotativo (CTB, art. 24, X); esquina, ponte e cruzamento (art. 181, I, XII e XIV) |
| ♿ Vaga para pessoa com deficiência | Como a Zona Azul | 2% das vagas e credencial (Lei 13.146/2015, art. 47); infração gravíssima (CTB, art. 181, XX) |
| 👵 Vaga para idoso | Como a Zona Azul | 5% das vagas (Estatuto da Pessoa Idosa, art. 41) |
| ⛔ Proibido estacionar (R-6a) | Qualquer trecho | Diferença entre parar e estacionar (CTB, Anexo I; art. 181, XVIII) |
| ❌ Proibido parar e estacionar (R-6c) | Qualquer trecho | CTB, art. 181, XIX |
| 🚸 Faixa de pedestres | Trecho reto | Preferência do pedestre (CTB, arts. 70 e 214); os carros param quando alguém atravessa |
| 📸 Radar | Trecho reto | Limites de velocidade (CTB, art. 61) e infração pelo excesso (art. 218); os carros reduzem perto dele |
| 🚦 Semáforo de pedestres | Trecho reto, fora da ponte | Obedecer ao foco de pedestres (CTB, art. 69, III, "a"); quem não terminou a travessia tem preferência (art. 70, parágrafo único); sinal vermelho (art. 208). Os carros param no vermelho e os pedestres atravessam |
| 〰️ Lombada | Ruas locais, trecho reto | Só nos padrões do Contran (CTB, art. 94, parágrafo único; Resolução 600/2016); obra na via depende de permissão (art. 95). Os carros reduzem e sobem a lombada |

### Entrada da cidade e rodoviária

- Nas quatro estradas que chegam à cidade há uma placa **"Bem-vindo(a) a [nome da cidade]"** com o número de habitantes; do lado de dentro, "Obrigado pela visita · volte sempre". O **🏛️ Portal da cidade** troca as placas por pórticos iluminados, com canteiros e bandeiras (aula: símbolos municipais, CF art. 13, §2º; Lei Orgânica, art. 29; criação de municípios, art. 18, §4º).
- A **🚍 Rodoviária** (passa por licitação) recebe ônibus de viagem que chegam pelas estradas, param na plataforma e partem para outras cidades (aula: ANTT, gratuidade de idosos e jovens de baixa renda, passe livre e viagem de criança desacompanhada, ECA art. 83).

### Cultura e esporte

| Construção | O que ensina |
|---|---|
| 🛍️ Shopping center | Preço à vista (Lei 10.962/2004), arrependimento só fora da loja (CDC, art. 49), vício do produto (art. 18), estacionamento (Súmula 130 do STJ), aluguel em shopping (Lei 8.245/1991, art. 54) |
| 🎭 Teatro municipal | Liberdade artística e proibição da censura (CF, arts. 5º, IX, e 220), direitos culturais (art. 215), meia-entrada (Lei 12.933/2013), classificação indicativa (ECA, art. 74) |
| 🏺 Museu da cidade | Patrimônio cultural (CF, art. 216), tombamento (DL 25/1937), Estatuto de Museus, crime contra o patrimônio (Lei 9.605/1998, art. 62) |
| 📚 Biblioteca pública | Direito autoral (Lei 9.610/1998, arts. 29, 41 e 46), bibliotecas escolares (Lei 12.244/2010) |
| 🏟️ Estádio de futebol | Esporte como direito (CF, art. 217), torcedor consumidor, violência e cambismo (Lei Geral do Esporte, Lei 14.597/2023), lugares acessíveis |
| 🏀 Quadra de basquete | Lazer como direito social (CF, arts. 6º e 217, §3º), prioridade de crianças e adolescentes (ECA, arts. 4º e 59) |
| ⚽ Quadra de futsal | Paradesporto (Lei 13.146/2015, arts. 42 e 43), idoso (Estatuto, art. 20), racismo no esporte (Lei 7.716/1989) |
| 🏃 Pista de atletismo | Prioridade ao desporto educacional (CF, art. 217, II), Bolsa Atleta (Lei 10.891/2004), doping |
| 🤸 Academia ao ar livre | Aparelhos de ginástica para todas as idades |

As quadras, o estádio e a pista têm jogadores e corredores em movimento, e o estádio tem torcida e refletores que acendem à noite.

### Motos, bicicletas e patinetes

Motos (com capacete) circulam nas avenidas e ruas; bicicletas e patinetes elétricos andam no bordo da pista (CTB, art. 58), e os carros e ônibus que vêm atrás passam para a faixa da esquerda para ultrapassar com distância (art. 201). Duas construções ensinam as regras: 🛴 **Estação de bikes e patinetes** (Resolução Contran 996/2023, CTB art. 59, Lei 12.587/2012 art. 18, responsabilidade civil) e 🏍️ **Central de motofrete** (capacete, CTB arts. 54, 55 e 244; categoria A; Lei 12.009/2009).

### Demolir e desfazer

- **🧨 Demolir** (botão nos controles do mapa, ou na janela de cada prédio): clique no que quer tirar (prédio, rua, ponte ou itens instalados na rua) e volta para o caixa **metade de tudo o que foi investido** no lote, incluindo ampliações. O lote fica livre para reconstruir. A prefeitura e as avenidas principais não podem ser demolidas, só o que foi instalado nelas.
- **↩️ Desfazer** (ou Ctrl+Z): corrige a última ação do mês. Uma construção desfeita devolve o valor gasto; uma demolição desfeita reconstrói o que estava lá (e devolve o reembolso).

### Pistas, emendas e transporte coletivo acessível

- **Avenidas com duas faixas em cada sentido**: faixa dupla amarela no meio e linha branca tracejada entre as faixas. Ônibus e caminhões andam pela direita; os mais rápidos, pela esquerda (CTB, art. 29, IV). Onde há vagas, a baia de estacionamento funciona como uma terceira faixa, sem tirar espaço de quem circula.
- **Ruas locais de mão dupla**, com faixa amarela tracejada.
- **Emendas**: onde uma rua local chega à avenida, a calçada se abre e a rua ganha placa **PARE** (R-1) e linha de retenção. Os carros param e entram na avenida virando à direita (basta o sentido em que vão entrar estar livre) ou à esquerda (esperam os dois sentidos livres e entram na faixa da esquerda). Para sair por outra rua à esquerda, passam antes para a faixa da esquerda e cedem passagem a quem vem no sentido contrário (CTB, art. 38, II e parágrafo único). Semáforo fica só no cruzamento das avenidas e nos cruzamentos de ruas locais.
- **Ônibus acessíveis**: piso baixo, símbolo de acessibilidade e rampa na porta; param nos pontos e terminais à sua direita e baixam a rampa.

| Item | O que ensina |
|---|---|
| 🚌 Ponto de ônibus acessível (plataforma, piso tátil, abrigo, mapa em braile) | Transporte acessível (Lei 13.146/2015, art. 46; Lei 10.098/2000, art. 16), passe livre (Lei 8.899/1994), gratuidade para idosos |
| 🚍 Faixa exclusiva de ônibus (só em avenida) | Faixas da direita para os lentos (CTB, art. 29, IV), espaço exclusivo (Lei 12.587/2012, art. 23, IV), infração gravíssima (CTB, art. 184, III) |

### Acessibilidade

A aba **♿ Acessibilidade** traz itens que podem ficar no mesmo trecho que a sinalização (por exemplo, rampa junto da faixa de pedestres, ou semáforo sonoro no cruzamento):

| Item | Onde pode | O que ensina |
|---|---|---|
| 🚲 Ciclofaixa | Trecho reto, fora da ponte; não junto de vagas | Bicicleta como veículo (CTB, arts. 58 e 59), 1,5 m na ultrapassagem (art. 201) |
| ♿ Rampa de acessibilidade | Cruzamento ou faixa de pedestres | Acessibilidade como direito (Lei 13.146/2015, art. 53; Lei 10.098/2000; Decreto 5.296/2004, art. 15) |
| 🦯 Piso tátil | Trecho reto | Piso direcional e de alerta, rotas acessíveis (Estatuto da Cidade, art. 41, §3º), cão-guia (Lei 11.126/2005) |
| 🔊 Semáforo sonoro | Cruzamento com semáforo | Lei 10.098/2000, art. 9º |

Bicicletas circulam nas ciclofaixas, e há pedestres cadeirantes nas calçadas.

### Ruas, rotatórias e retornos

As ruas locais (🛣️) mudam de forma sozinhas conforme as ruas vizinhas: reta, **curva**, T, cruzamento ou **balão de retorno** na rua sem saída. Carros circulam por elas, fazem as curvas, param no sinal vermelho e dão a volta no balão.

| Dispositivo | Onde pode | O que ensina |
|---|---|---|
| 🔄 Rotatória | Cruzamento de 3 ou 4 ruas (substitui o semáforo) | Preferência de quem já circula na rotatória (CTB, art. 29, III, "b"); seta antes de sair (art. 35) |
| ↩️ Retorno permitido | Trecho reto de rua | Retorno só em local sinalizado e seguro (CTB, art. 39) |
| 🚫 Placa "Proibido retornar" | Qualquer trecho de rua | Placa R-5a |

O jogo recusa o retorno onde o CTB proíbe e explica o motivo: em ponte ou viaduto e em curva (art. 206, II), e em cruzamento, entrando na contramão (art. 206, IV). Na rotatória, os carros contornam a ilha central e esperam quem já está circulando; no retorno, alguns fazem a meia-volta quando a outra faixa está livre.

## Mais jeitos de jogar

- **Ampliar prédios** (nível 1 a 3): cada nível soma 50% aos efeitos e deixa o prédio mais alto.
- **Projetos de lei**: com a Câmara Municipal construída, chegam projetos para sancionar ou vetar (horário do comércio, fila no banco, aplicativos de transporte, IPTU Verde, Lei do Silêncio...). Lei inconstitucional sancionada acaba derrubada no STF.
- **Voz da cidade**: os moradores comentam o que falta, o que melhorou e postam um "Você sabia?" com um ponto de lei.
- **Barcos no rio e pássaros** cruzando o céu.
- **📊 Orçamento e impostos**: ajuste o IPTU (0,5% a 3%) e o ISS (2% a 5%, como na LC 116/2003). Imposto alto arrecada mais e irrita a população. A mudança precisa de lei da Câmara; aumento só vale no ano seguinte e após 90 dias (anterioridade), redução vale no mês seguinte.
- **👥 Moradores com nome e história**: clique numa pessoa andando na cidade (ou no número de habitantes) para ver a ficha — idade, profissão, onde mora, humor, o que pede à prefeitura e um direito ligado à fase da vida. Quem traz um caso entra no cadastro com o histórico do atendimento, e os moradores assinam os posts da Voz da cidade.
- **🎓 Modo professor**: aproveitamento por área do Direito (provas de licença, casos e projetos de lei), áreas para revisar, nome do aluno e turma, relatório para copiar e planilha CSV.
- **💾 Salvar e carregar**: baixe a cidade em arquivo `.json` ou copie um código de texto, e carregue em outro aparelho.

## Visual

O estilo mistura **maquete realista** (texturas PBR, sombras, reflexos) com **miniatura estilizada**: desfoque de "tilt-shift" nas bordas, cores mais vivas e vinheta, como se a cidade fosse uma maquete fotografada de perto.

- **Arredores**: a cidade não flutua no céu. Em volta do mapa há campo com morros, plantações, matas, os rios seguindo o curso e as avenidas virando estradas, até sumirem na névoa do horizonte.
- **Tela cheia**: o mapa ocupa a tela toda e a interface flutua por cima em painéis de vidro, com ícones próprios em SVG. No celular, o menu de construção vira uma gaveta que sobe de baixo.
- **📱 Celular do prefeito**: a Voz da cidade e o Diário Oficial ficam numa gaveta lateral, com um contador de mensagens não lidas.
- **Cartões de construção com miniatura 3D** de cada prédio, geradas na hora.
- **Prédios mais ricos**: casas em três estilos (telhado de duas águas com chaminé, telhado de quatro águas, moderna com laje e caixa-d'água). No nível 2 ganham garagem e no nível 3 piscina e cerca. Há letreiros nas fachadas, aparelhos de ar-condicionado, toldos de cores variadas e vapor saindo da estação de esgoto.
- **Árvores, pessoas e carros** com formas arredondadas: copas em tufos, pinheiros em camadas, pessoas com chapéu ou bolsa e carros com rodas, faróis e lanternas. As viaturas da polícia têm faixa e sirene.
- **Vida na cidade**: cada prédio novo passa por um canteiro de obras (tapume, andaime e guindaste girando). No outono caem folhas, na chuva as ruas ficam molhadas e refletem as luzes, e a câmera voa até o prédio do caso ou até a primeira construção de cada tipo.
- **Placas inteligentes**: a placa aparece só no prédio sob o mouse, e o prédio ganha um contorno amarelo. O botão 🏷️ alterna para mostrar todas as placas.
- **Visões de cobertura** (botão de camadas): água, esgoto, energia, educação, saúde, segurança, lazer e justiça. O mapa pinta de verde as moradias atendidas, de vermelho as que estão sem atendimento e de cinza o que fica fora do alcance.

## Texturas

No mapa, ✨ liga os **gráficos realistas**: sombras de contato nos cantos (SSAO) e brilho das luzes à noite (bloom), com tons de cinema; em aparelho lento eles se desligam sozinhos. As fachadas têm desgaste (sujeira junto ao chão e escorridos sob as janelas).

As texturas são geradas por computador (`python3 ferramentas/gerar_texturas.py`), em 1024 px, emendam sem costura e têm mapa de relevo. Para usar **fotos reais** (por exemplo, do Poly Haven ou ambientCG, ambos CC0), substitua os arquivos em `texturas/` mantendo os nomes (`<nome>_cor.jpg` e `<nome>_relevo.jpg`, normal map no padrão OpenGL) e rode `python3 ferramentas/gerar_texturas.py --so-empacotar`.

## Clima e eventos

Cada mês pode ser chuvoso (mais no verão, menos no inverno), com chuva visível na cidade. Eventos trazem uma dica de lei no Diário Oficial: Carnaval (fevereiro), Festa Junina (junho), eleições municipais (outubro, a cada 4 anos — reeleição se a aprovação for boa), temporais (os Bombeiros reduzem os estragos) e auditorias do Tribunal de Contas. No mapa, 🎥 liga o modo passeio e 📸 salva uma foto da cidade.

## Como adicionar conteúdo

Todo o conteúdo jurídico está em `dados.js`:

- **Perguntas de licença** → `PREDIOS.<prédio>.licenca`: `{ p, ops, c, exp }` (`c` = índice da alternativa correta).
- **Bairros** → `BAIRROS`: `{ id, nome, icone, preco, r0, r1, c0, c1, lei: { titulo, pontos, base } }`.
- **Projetos de lei** → `PROJETOS_LEI`: `{ id, titulo, autor, texto, constitucional, efeito, exp, base }`.
- **Eventos** → `EVENTOS` (`dados.js`), sorteados em `sortearClimaEEventos` (`jogo.js`).
- **Casos mensais** → `CASOS`: `{ predio, titulo, quem, texto, ops, c, exp, base }`.
- **Novo prédio** → nova chave em `PREDIOS` com `custo`, `nivel` (título mínimo), `efeito`, `aula` e `licenca`, mais um modelo em `MODELOS` (`cena3d.js`) e em `PREDIOS_ISO` (`isometrico.js`).

O progresso fica salvo no navegador (localStorage).

> Conteúdo educativo e simplificado — não substitui orientação jurídica profissional.
