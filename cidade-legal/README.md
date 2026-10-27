# 🏛️ Cidade Legal

Jogo educativo de construção de cidade em que o jogador, como prefeito(a), aprende a legislação brasileira de forma simplificada.

**Como jogar:** abra `index.html` no navegador (não precisa de servidor nem instalação; funciona offline).

A cidade é em **3D** (Three.js, em `vendor/`): mapa de 20×14 lotes com duas avenidas, rio e pontes, sombras do sol, carros, nuvens e noite com janelas acesas no tema escuro. Arraste para girar, role para zoom, botão direito (ou dois dedos) para mover. Se o navegador não tiver WebGL, o jogo cai automaticamente para a versão isométrica 2.5D.

O tempo passa de verdade: o sol cruza o céu, entardece e anoitece (janelas e postes acendem), e cada "Próximo mês" mostra um dia acelerado. O calendário (Janeiro · Ano 1) define a estação: as árvores e a grama mudam de cor e os ipês florescem (roxos em junho/julho, amarelos em agosto/setembro). Pedestres caminham nas calçadas conforme a população cresce.

| Arquivo | Função |
|---|---|
| `dados.js` | Conteúdo jurídico: prédios, aulas, perguntas, casos, missões |
| `jogo.js` | Regras, economia, interface e salvamento |
| `cena3d.js` | Cidade em 3D (modelos dos prédios, câmera, trânsito, dia/noite) |
| `isometrico.js` | Versão 2.5D em canvas, usada quando não há WebGL |
| `vendor/` | Three.js r147 e OrbitControls (licença MIT) |

## Ciclo do jogo

1. **Estudar** a aula de uma área do Direito (resumo, pontos-chave com artigo de lei e exemplo prático).
2. **Tirar a licença**: quiz de 3 perguntas (precisa acertar 2) para liberar o prédio.
3. **Construir** no mapa — cada prédio gera renda, população ou felicidade. Prédios colados em rua rendem +20%.
4. **Avançar o mês**: arrecadação, manutenção e um cidadão aparece com um balão ❗ sobre um prédio — clique para resolver o caso aplicando a lei.
5. **Expandir a cidade**: só o Centro começa liberado. Bairro Oeste (💰 600), Vila Norte (💰 900), Jardim Sul (💰 1.300) e Beira-Rio (💰 2.200) ficam bloqueados até o caixa juntar o valor — cada compra ensina Direito Urbanístico (Plano Diretor, desapropriação, loteamento, função social e IPTU progressivo).
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

Também há **enfeites** sem licença (🌳 árvore, 🌷 canteiro, ⛲ praça com calçadão de pedra portuguesa e 🛣️ rua — prédios colados em rua rendem +20%) e um menu de construção por categorias.

## Clima e eventos

Cada mês pode ser chuvoso (mais no verão, menos no inverno), com chuva visível na cidade. Eventos trazem uma dica de lei no Diário Oficial: Carnaval (fevereiro), Festa Junina (junho), eleições municipais (outubro, a cada 4 anos — reeleição se a aprovação for boa), temporais (os Bombeiros reduzem os estragos) e auditorias do Tribunal de Contas. No mapa, 🎥 liga o modo passeio e 📸 salva uma foto da cidade.

## Como adicionar conteúdo

Todo o conteúdo jurídico está em `dados.js`:

- **Perguntas de licença** → `PREDIOS.<prédio>.licenca`: `{ p, ops, c, exp }` (`c` = índice da alternativa correta).
- **Bairros** → `BAIRROS`: `{ id, nome, icone, preco, r0, r1, c0, c1, lei: { titulo, pontos, base } }`.
- **Eventos** → `EVENTOS` (`dados.js`), sorteados em `sortearClimaEEventos` (`jogo.js`).
- **Casos mensais** → `CASOS`: `{ predio, titulo, quem, texto, ops, c, exp, base }`.
- **Novo prédio** → nova chave em `PREDIOS` com `custo`, `nivel` (título mínimo), `efeito`, `aula` e `licenca`, mais um modelo em `MODELOS` (`cena3d.js`) e em `PREDIOS_ISO` (`isometrico.js`).

O progresso fica salvo no navegador (localStorage).

> Conteúdo educativo e simplificado — não substitui orientação jurídica profissional.
