# 🏢 Meus FIIs — painel pessoal de fundos imobiliários

Sisteminha local (Python + Streamlit) para acompanhar sua carteira de FIIs a partir dos
extratos da B3 e cruzar com indicadores de sites de análise.

## O que faz

| Aba | Conteúdo |
|---|---|
| 📊 Carteira | Posição, preço médio, cotação atual, resultado, peso, DY e P/VP de cada FII, gráficos por ativo e segmento |
| 💰 Proventos | Rendimentos recebidos mês a mês (do extrato da B3), total por fundo, yield on cost |
| 🧾 IR | Apuração mensal do ganho nas vendas (20%, DARF 6015) com compensação de prejuízo |
| 🔎 Screener | Todos os FIIs do Fundamentus filtráveis por DY, P/VP, liquidez, vacância e segmento |
| 📈 Analisar FII | Gráfico de cotação, histórico de proventos, DY calculado e links para Status Invest, Funds Explorer, FIIs.com.br, Investidor10, Clube FII, Fundamentus e Fundos.NET |
| ⬆️ Importar / Lançar | Importação dos extratos da B3, lançamento manual, exclusão e backup em CSV |

## Como rodar

```bash
cd fii
pip install -r requirements.txt
streamlit run app.py
```

Abre em http://localhost:8501. Os dados ficam no arquivo `carteira.db` (SQLite) nesta pasta
— só no seu computador.

## Integração com a B3

A B3 **não tem API gratuita para pessoa física** (a API da Área do Investidor é liberada só para
instituições credenciadas). Por isso a integração é pelos extratos oficiais:

1. Entre em <https://www.investidor.b3.com.br> → **Extratos**.
2. **Negociação** → escolha o período → baixe o Excel. Importe em *Importar / Lançar*.
3. **Movimentação** → escolha o período → baixe o Excel. Importe em *Importar / Lançar*.

Reimportar o mesmo arquivo não duplica nada. Em `exemplos/` há arquivos no mesmo formato
para testar.

## Fontes de dados de mercado

* **Yahoo Finance** — cotação e histórico de proventos (sem cadastro).
* **brapi.dev** — fallback de cotação. Crie um token grátis em brapi.dev e rode com
  `BRAPI_TOKEN=seu_token streamlit run app.py` para liberar todos os ativos.
* **Fundamentus** — DY 12m, P/VP, liquidez, vacância, cap rate, segmento de todos os FIIs.
* Status Invest, Funds Explorer, FIIs.com.br, Investidor10 e Clube FII entram como links
  diretos (eles não têm API pública e bloqueiam coleta automática).

Os dados são cacheados (cotações 15 min, Fundamentus 6 h). Se um site mudar o layout ou ficar
fora do ar, o app avisa e continua funcionando com o resto.

## Limitações

* Desdobramentos/grupamentos não são aplicados automaticamente — lance o ajuste manualmente.
* O cálculo de IR é uma estimativa para conferência; não considera o IR retido na fonte
  (0,005%). Confirme com um contador.
* Uso pessoal e educativo; não é recomendação de investimento.

## Testes

```bash
pip install pytest && python -m pytest tests
```
