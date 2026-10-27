# 🏛️ Cidade Legal

Jogo educativo de construção de cidade em que o jogador, como prefeito(a), aprende a legislação brasileira de forma simplificada.

**Como jogar:** abra `index.html` no navegador (não precisa de servidor nem instalação; funciona offline).

A cidade é em **3D** (Three.js, em `vendor/`): mapa de 20×14 lotes com duas avenidas, rio e pontes, sombras do sol, carros, nuvens e noite com janelas acesas no tema escuro. Arraste para girar, role para zoom, botão direito (ou dois dedos) para mover. Se o navegador não tiver WebGL, o jogo cai automaticamente para a versão isométrica 2.5D.

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
5. **Subir de título** (Estudante → Estagiário → Bacharel → Advogado → Juiz → Desembargador → Ministro do STF) e liberar áreas mais avançadas.

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

## Como adicionar conteúdo

Todo o conteúdo jurídico está em `dados.js`:

- **Perguntas de licença** → `PREDIOS.<prédio>.licenca`: `{ p, ops, c, exp }` (`c` = índice da alternativa correta).
- **Casos mensais** → `CASOS`: `{ predio, titulo, quem, texto, ops, c, exp, base }`.
- **Novo prédio** → nova chave em `PREDIOS` com `custo`, `nivel` (título mínimo), `efeito`, `aula` e `licenca`, mais um modelo em `MODELOS` (`cena3d.js`) e em `PREDIOS_ISO` (`isometrico.js`).

O progresso fica salvo no navegador (localStorage).

> Conteúdo educativo e simplificado — não substitui orientação jurídica profissional.
