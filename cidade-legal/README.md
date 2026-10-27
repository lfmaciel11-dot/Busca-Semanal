# 🏛️ Cidade Legal

Jogo educativo de construção de cidade em que o jogador, como prefeito(a), aprende a legislação brasileira de forma simplificada.

**Como jogar:** abra `index.html` no navegador (não precisa de servidor nem instalação).

## Ciclo do jogo

1. **Estudar** a aula de uma área do Direito (resumo, pontos-chave com artigo de lei e exemplo prático).
2. **Tirar a licença**: quiz de 3 perguntas (precisa acertar 2) para liberar o prédio.
3. **Construir** no mapa — cada prédio gera renda, população ou felicidade.
4. **Avançar o mês**: arrecadação, manutenção e um **caso de cidadão** para resolver aplicando a lei.
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
- **Novo prédio** → nova chave em `PREDIOS` com `custo`, `nivel` (título mínimo), `efeito`, `aula` e `licenca`.

O progresso fica salvo no navegador (localStorage).

> Conteúdo educativo e simplificado — não substitui orientação jurídica profissional.
