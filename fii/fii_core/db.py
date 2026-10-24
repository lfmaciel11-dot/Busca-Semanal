"""Persistência local em SQLite (arquivo carteira.db ao lado do app)."""
import hashlib
import os
import sqlite3
from pathlib import Path

import pandas as pd

CAMINHO = Path(os.environ.get("FII_DB", Path(__file__).resolve().parent.parent / "carteira.db"))

ESQUEMA = """
CREATE TABLE IF NOT EXISTS operacoes (
    id TEXT PRIMARY KEY, data TEXT, ticker TEXT, tipo TEXT,
    quantidade REAL, preco REAL, taxas REAL DEFAULT 0, origem TEXT);
CREATE TABLE IF NOT EXISTS proventos (
    id TEXT PRIMARY KEY, data TEXT, ticker TEXT, tipo TEXT, quantidade REAL, valor REAL);
"""


def conectar(caminho=None):
    con = sqlite3.connect(caminho or CAMINHO)
    con.executescript(ESQUEMA)
    return con


def _id(*partes) -> str:
    return hashlib.sha1("|".join(map(str, partes)).encode()).hexdigest()


def _com_ids(df, colunas):
    """Gera id determinístico; linhas idênticas no mesmo arquivo recebem sufixo de ocorrência,
    assim reimportar o mesmo extrato não duplica, mas dois negócios iguais no dia não se perdem."""
    df = df.copy()
    df["data"] = pd.to_datetime(df["data"]).dt.strftime("%Y-%m-%d")
    ocorrencia = df.groupby(colunas).cumcount()
    df["id"] = [_id(*linha, n) for linha, n in zip(df[colunas].itertuples(index=False), ocorrencia)]
    return df


def salvar_operacoes(con, df: pd.DataFrame) -> int:
    df = _com_ids(df.assign(taxas=df.get("taxas", 0.0)),
                  ["data", "ticker", "tipo", "quantidade", "preco"])
    antes = con.total_changes
    con.executemany("INSERT OR IGNORE INTO operacoes VALUES (?,?,?,?,?,?,?,?)",
                    df[["id", "data", "ticker", "tipo", "quantidade", "preco", "taxas", "origem"]].values.tolist())
    con.commit()
    return con.total_changes - antes


def salvar_proventos(con, df: pd.DataFrame) -> int:
    df = _com_ids(df, ["data", "ticker", "tipo", "valor"])
    antes = con.total_changes
    con.executemany("INSERT OR IGNORE INTO proventos VALUES (?,?,?,?,?,?)",
                    df[["id", "data", "ticker", "tipo", "quantidade", "valor"]].values.tolist())
    con.commit()
    return con.total_changes - antes


def operacoes(con) -> pd.DataFrame:
    df = pd.read_sql("SELECT * FROM operacoes ORDER BY data", con)
    df["data"] = pd.to_datetime(df["data"])
    return df


def proventos(con) -> pd.DataFrame:
    df = pd.read_sql("SELECT * FROM proventos ORDER BY data", con)
    df["data"] = pd.to_datetime(df["data"])
    return df


def apagar(con, tabela: str, ids):
    assert tabela in ("operacoes", "proventos")
    con.executemany(f"DELETE FROM {tabela} WHERE id = ?", [(i,) for i in ids])
    con.commit()
