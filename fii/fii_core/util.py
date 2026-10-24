"""Conversões de números e textos no formato brasileiro."""
import math
import re
import unicodedata

import pandas as pd


def num_br(valor):
    """Converte '1.234,56', 'R$ 10,50', '12,3%' ou números em float. '-' e vazio viram NaN."""
    if valor is None:
        return math.nan
    if isinstance(valor, (int, float)):
        return float(valor)
    texto = str(valor).strip().replace("R$", "").replace("%", "").replace("\xa0", "").strip()
    if texto in ("", "-", "--", "nan", "NaN"):
        return math.nan
    if "," in texto or re.fullmatch(r"-?\d{1,3}(\.\d{3})+", texto):
        texto = texto.replace(".", "").replace(",", ".")
    try:
        return float(texto)
    except ValueError:
        return math.nan


def sem_acento(texto: str) -> str:
    texto = unicodedata.normalize("NFKD", str(texto))
    return "".join(c for c in texto if not unicodedata.combining(c)).lower().strip()


def normaliza_colunas(df: pd.DataFrame) -> pd.DataFrame:
    df = df.copy()
    df.columns = [sem_acento(c) for c in df.columns]
    return df


def extrai_ticker(produto: str) -> str:
    """'MXRF11 - MAXI RENDA FII' -> 'MXRF11'. Remove o sufixo F do fracionário (MXRF11F -> MXRF11)."""
    m = re.match(r"\s*([A-Z]{4}\d{1,2})F?\b", str(produto).upper())
    return m.group(1) if m else str(produto).strip().upper()


def data_br(valor):
    return pd.to_datetime(valor, dayfirst=True, errors="coerce")
