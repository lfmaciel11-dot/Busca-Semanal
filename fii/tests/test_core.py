import sqlite3
from pathlib import Path

import pandas as pd
import pytest

from fii_core import b3_import, carteira, db, fontes
from fii_core.util import extrai_ticker, num_br

EX = Path(__file__).resolve().parent.parent / "exemplos"


def test_num_br():
    assert num_br("1.234,56") == 1234.56
    assert num_br("R$ 10,50") == 10.5
    assert num_br("12,3%") == 12.3
    assert num_br("1.234.567") == 1234567
    assert num_br(3) == 3.0
    assert pd.isna(num_br("-"))


def test_extrai_ticker():
    assert extrai_ticker("MXRF11 - MAXI RENDA FII") == "MXRF11"
    assert extrai_ticker("KNRI11F") == "KNRI11"


def test_importa_negociacao_e_posicao():
    ops = b3_import.ler_negociacao(EX / "negociacao_exemplo.xlsx")
    assert len(ops) == 6 and set(ops["tipo"]) == {"compra", "venda"}
    pos, vendas = carteira.processa_operacoes(ops)
    mxrf = pos.set_index("ticker").loc["MXRF11"]
    assert mxrf.quantidade == 120
    assert mxrf.preco_medio == pytest.approx((1020 + 490) / 150)
    assert pos.set_index("ticker").loc["KNRI11"].quantidade == 3
    assert vendas["lucro"].round(2).tolist() == [pytest.approx(30 * (10.5 - 1510 / 150), abs=.01), -10.0]


def test_apuracao_ir_compensa_prejuizo():
    vendas = pd.DataFrame({"data": pd.to_datetime(["2025-01-10", "2025-02-10", "2025-03-10"]),
                           "lucro": [-100.0, 150.0, 50.0]})
    apur = carteira.apuracao_ir(vendas)
    assert apur["ir_devido"].tolist() == [0.0, pytest.approx(10.0), pytest.approx(10.0)]
    assert apur["prejuizo_a_compensar"].tolist() == [100.0, 0.0, 0.0]


def test_importa_movimentacao():
    provs = b3_import.ler_movimentacao(EX / "movimentacao_exemplo.xlsx")
    assert sorted(provs["tipo"].unique()) == ["amortizacao", "rendimento"]
    assert provs["valor"].sum() == pytest.approx(31.5)


def test_db_nao_duplica(tmp_path):
    con = db.conectar(tmp_path / "t.db")
    ops = b3_import.ler_negociacao(EX / "negociacao_exemplo.xlsx")
    assert db.salvar_operacoes(con, ops) == 6
    assert db.salvar_operacoes(con, ops) == 0
    assert len(db.operacoes(con)) == 6
    provs = b3_import.ler_movimentacao(EX / "movimentacao_exemplo.xlsx")
    assert db.salvar_proventos(con, provs) == 4
    assert db.salvar_proventos(con, provs) == 0


def test_parse_fundamentus():
    html = """<table id="tabelaResultado"><thead><tr><th>Papel</th><th>Segmento</th><th>Cotação</th>
    <th>Dividend Yield</th><th>P/VP</th><th>Liquidez</th><th>Vacância Média</th></tr></thead>
    <tbody><tr><td>MXRF11</td><td>Híbrido</td><td>9,85</td><td>12,40%</td><td>1,02</td>
    <td>12.345.678</td><td>0,00%</td></tr></tbody></table>"""
    df = fontes.parse_fundamentus(html)
    linha = df.iloc[0]
    assert linha.ticker == "MXRF11" and linha.cotacao == 9.85 and linha.dy == 12.4
    assert linha.pvp == 1.02 and linha.liquidez == 12345678


def test_links():
    links = fontes.links_analise("hglg11")
    assert links["Status Invest"].endswith("/hglg11")
    assert "papel=HGLG11" in links["Fundamentus"]
