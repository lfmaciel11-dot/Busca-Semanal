"""Fontes externas de dados: cotações (Yahoo Finance / brapi.dev) e indicadores (Fundamentus).

Todas as funções levantam FonteIndisponivel em caso de falha, para que a interface
possa avisar o usuário sem quebrar.
"""
import io
import os
import pandas as pd
import requests

from .util import num_br

HEADERS = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
                         "(KHTML, like Gecko) Chrome/126.0 Safari/537.36"}
TIMEOUT = 20


class FonteIndisponivel(RuntimeError):
    pass


def _get(url, **kw):
    try:
        r = requests.get(url, headers=HEADERS, timeout=TIMEOUT, **kw)
        r.raise_for_status()
        return r
    except requests.RequestException as e:
        status = getattr(e.response, "status_code", None)
        raise FonteIndisponivel(f"{url.split('/')[2]}: {status or type(e).__name__}") from e


# ---------------------------------------------------------------- Yahoo Finance
def yahoo_historico(ticker: str, periodo: str = "1y"):
    """Retorna (cotacao_atual, DataFrame de preços diários, DataFrame de proventos por cota)."""
    url = f"https://query1.finance.yahoo.com/v8/finance/chart/{ticker.upper()}.SA"
    dados = _get(url, params={"range": periodo, "interval": "1d", "events": "div"}).json()
    try:
        res = dados["chart"]["result"][0]
    except (KeyError, IndexError, TypeError) as e:
        raise FonteIndisponivel(f"Yahoo sem dados para {ticker}") from e

    precos = pd.DataFrame({
        "data": pd.to_datetime(res.get("timestamp", []), unit="s"),
        "fechamento": res.get("indicators", {}).get("quote", [{}])[0].get("close", []),
    }).dropna()
    divs = res.get("events", {}).get("dividends", {}) or {}
    proventos = pd.DataFrame(
        [{"data": pd.Timestamp(d["date"], unit="s"), "valor": d["amount"]} for d in divs.values()],
        columns=["data", "valor"]).sort_values("data")
    return res["meta"].get("regularMarketPrice"), precos, proventos


# ---------------------------------------------------------------- brapi.dev
def brapi_cotacoes(tickers):
    """Cotações via brapi.dev. Defina BRAPI_TOKEN (gratuito em brapi.dev) para todos os ativos."""
    token = os.environ.get("BRAPI_TOKEN")
    params = {"token": token} if token else {}
    out = {}
    for t in tickers:  # o plano gratuito aceita um ativo por requisição
        r = _get(f"https://brapi.dev/api/quote/{t}", params=params).json()
        for item in r.get("results", []):
            out[item["symbol"]] = item.get("regularMarketPrice")
    return out


def cotacoes(tickers) -> dict:
    """Cotação atual de cada ticker: tenta Yahoo e, se falhar, brapi.dev."""
    out, erros = {}, []
    for t in tickers:
        try:
            out[t] = yahoo_historico(t, "5d")[0]
        except FonteIndisponivel:
            erros.append(t)
    if erros:
        try:
            out.update(brapi_cotacoes(erros))
        except FonteIndisponivel:
            pass
    return out


# ---------------------------------------------------------------- Fundamentus
COLUNAS_FUNDAMENTUS = {
    "Papel": "ticker", "Segmento": "segmento", "Cotação": "cotacao", "FFO Yield": "ffo_yield",
    "Dividend Yield": "dy", "P/VP": "pvp", "Valor de Mercado": "valor_mercado", "Liquidez": "liquidez",
    "Qtd de imóveis": "qtd_imoveis", "Preço do m2": "preco_m2", "Aluguel por m2": "aluguel_m2",
    "Cap Rate": "cap_rate", "Vacância Média": "vacancia",
}


def fundamentus_fiis() -> pd.DataFrame:
    """Tabela de todos os FIIs do Fundamentus (DY 12m, P/VP, liquidez, vacância...)."""
    html = _get("https://www.fundamentus.com.br/fii_resultado.php").text
    return parse_fundamentus(html)


def parse_fundamentus(html: str) -> pd.DataFrame:
    tabela = pd.read_html(io.StringIO(html), attrs={"id": "tabelaResultado"}, thousands=None, decimal="#")[0]
    tabela = tabela.astype(str).rename(columns=COLUNAS_FUNDAMENTUS)
    for col in tabela.columns:
        if col not in ("ticker", "segmento"):
            tabela[col] = tabela[col].map(num_br)
    return tabela


# ---------------------------------------------------------------- Links de análise
SITES = {
    "Status Invest": "https://statusinvest.com.br/fundos-imobiliarios/{t}",
    "Funds Explorer": "https://www.fundsexplorer.com.br/funds/{t}",
    "FIIs.com.br": "https://fiis.com.br/{t}/",
    "Investidor10": "https://investidor10.com.br/fiis/{t}/",
    "Clube FII": "https://www.clubefii.com.br/fiis/{T}",
    "Fundamentus": "https://www.fundamentus.com.br/detalhes.php?papel={T}",
    "Fundos.NET (CVM/B3)": "https://fnet.bmfbovespa.com.br/fnet/publico/abrirGerenciadorDocumentosCVM?cnpjFundo=&palavraChave={T}",
}


def links_analise(ticker: str) -> dict:
    return {nome: url.format(t=ticker.lower(), T=ticker.upper()) for nome, url in SITES.items()}
