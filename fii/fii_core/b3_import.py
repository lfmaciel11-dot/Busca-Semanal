"""Importação dos extratos exportados da Área do Investidor da B3.

A B3 não oferece API pública gratuita para pessoa física (a API da Área do
Investidor é restrita a instituições credenciadas). O caminho viável para uso
pessoal é exportar os extratos em investidor.b3.com.br > Extratos e importá-los:

* Negociação  -> compras e vendas (base do preço médio e do IR)
* Movimentação -> rendimentos, amortizações, desdobramentos etc.
"""
from pathlib import Path

import pandas as pd

from .util import data_br, extrai_ticker, normaliza_colunas, num_br, sem_acento


def _ler(arquivo) -> pd.DataFrame:
    nome = getattr(arquivo, "name", str(arquivo)).lower()
    if nome.endswith(".csv"):
        return pd.read_csv(arquivo, sep=None, engine="python", dtype=str)
    return pd.read_excel(arquivo, dtype=object)


def _coluna(df, *candidatas):
    for c in candidatas:
        if c in df.columns:
            return c
    raise ValueError(f"Coluna não encontrada. Esperava uma de {candidatas}; o arquivo tem {list(df.columns)}")


def ler_negociacao(arquivo) -> pd.DataFrame:
    """Extrato de Negociação -> DataFrame [data, ticker, tipo, quantidade, preco, origem]."""
    df = normaliza_colunas(_ler(arquivo))
    c_data = _coluna(df, "data do negocio", "data")
    c_tipo = _coluna(df, "tipo de movimentacao", "compra/venda", "tipo")
    c_ticker = _coluna(df, "codigo de negociacao", "codigo", "ticker")
    c_qtd = _coluna(df, "quantidade")
    c_preco = _coluna(df, "preco", "preco unitario")

    out = pd.DataFrame({
        "data": data_br(df[c_data]),
        "ticker": df[c_ticker].map(extrai_ticker),
        "tipo": df[c_tipo].astype(str).str.strip().str.lower().map(
            lambda t: "compra" if t.startswith("c") else "venda" if t.startswith("v") else t),
        "quantidade": df[c_qtd].map(num_br),
        "preco": df[c_preco].map(num_br),
    })
    out["origem"] = "B3 negociação"
    out = out.dropna(subset=["data", "quantidade", "preco"])
    return out[out["tipo"].isin(["compra", "venda"])].reset_index(drop=True)


# Tipos de movimentação da B3 tratados como provento em dinheiro.
PROVENTOS = {
    "rendimento": "rendimento",
    "dividendo": "dividendo",
    "juros sobre capital proprio": "jcp",
    "amortizacao": "amortizacao",
}


def ler_movimentacao(arquivo) -> pd.DataFrame:
    """Extrato de Movimentação -> proventos recebidos [data, ticker, tipo, quantidade, valor]."""
    df = normaliza_colunas(_ler(arquivo))
    c_es = _coluna(df, "entrada/saida")
    c_data = _coluna(df, "data")
    c_mov = _coluna(df, "movimentacao")
    c_prod = _coluna(df, "produto")
    c_qtd = _coluna(df, "quantidade")
    c_valor = _coluna(df, "valor da operacao", "valor")

    mov = df[c_mov].map(sem_acento)
    tipo = mov.map(lambda m: next((v for k, v in PROVENTOS.items() if m.startswith(k)), None))
    es = df[c_es].map(sem_acento)
    entrada = es.str.startswith("credito") | es.str.startswith("entrada")

    out = pd.DataFrame({
        "data": data_br(df[c_data]),
        "ticker": df[c_prod].map(extrai_ticker),
        "tipo": tipo,
        "quantidade": df[c_qtd].map(num_br),
        "valor": df[c_valor].map(num_br),
    })
    out = out[entrada & out["tipo"].notna()].dropna(subset=["data", "valor"])
    return out.reset_index(drop=True)


def exemplo_dir() -> Path:
    return Path(__file__).resolve().parent.parent / "exemplos"
