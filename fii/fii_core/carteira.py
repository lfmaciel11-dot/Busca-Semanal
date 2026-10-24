"""Cálculo de posição, preço médio, lucro realizado e IR sobre vendas de FII."""
import pandas as pd

ALIQUOTA_IR_FII = 0.20  # ganho de capital na venda de cotas de FII (sem isenção de R$ 20 mil)


def processa_operacoes(ops: pd.DataFrame):
    """Percorre as operações em ordem cronológica.

    Retorna (posicoes, vendas):
      posicoes: ticker, quantidade, preco_medio, custo_total
      vendas:   data, ticker, quantidade, preco, preco_medio, lucro
    O preço médio segue a regra da Receita: vendas não alteram o médio.
    """
    estado = {}
    vendas = []
    if ops.empty:
        return pd.DataFrame(columns=["ticker", "quantidade", "preco_medio", "custo_total"]), \
            pd.DataFrame(columns=["data", "ticker", "quantidade", "preco", "preco_medio", "lucro"])

    ordem = ops.assign(_o=ops["tipo"].map({"compra": 0, "venda": 1})).sort_values(["data", "_o"])
    for op in ordem.itertuples():
        qtd, custo = estado.get(op.ticker, (0.0, 0.0))
        if op.tipo == "compra":
            estado[op.ticker] = (qtd + op.quantidade, custo + op.quantidade * op.preco + getattr(op, "taxas", 0.0))
        else:
            medio = custo / qtd if qtd else 0.0
            vendida = min(op.quantidade, qtd)
            lucro = vendida * op.preco - vendida * medio - getattr(op, "taxas", 0.0)
            vendas.append({"data": op.data, "ticker": op.ticker, "quantidade": vendida,
                           "preco": op.preco, "preco_medio": medio, "lucro": lucro})
            estado[op.ticker] = (qtd - vendida, custo - vendida * medio)

    pos = pd.DataFrame([
        {"ticker": t, "quantidade": q, "preco_medio": c / q, "custo_total": c}
        for t, (q, c) in estado.items() if q > 1e-9
    ], columns=["ticker", "quantidade", "preco_medio", "custo_total"])
    return pos.sort_values("ticker").reset_index(drop=True), pd.DataFrame(
        vendas, columns=["data", "ticker", "quantidade", "preco", "preco_medio", "lucro"])


def apuracao_ir(vendas: pd.DataFrame) -> pd.DataFrame:
    """Apuração mensal: compensa prejuízo acumulado e calcula o DARF (código 6015)."""
    cols = ["mes", "lucro_mes", "prejuizo_compensado", "base_calculo", "ir_devido", "prejuizo_a_compensar"]
    if vendas.empty:
        return pd.DataFrame(columns=cols)
    mensal = vendas.groupby(vendas["data"].dt.to_period("M"))["lucro"].sum().sort_index()
    acumulado, linhas = 0.0, []
    for mes, lucro in mensal.items():
        compensado = 0.0
        if lucro > 0:
            compensado = min(lucro, acumulado)
            acumulado -= compensado
        else:
            acumulado += -lucro
        base = max(lucro - compensado, 0.0)
        linhas.append({"mes": str(mes), "lucro_mes": lucro, "prejuizo_compensado": compensado,
                       "base_calculo": base, "ir_devido": base * ALIQUOTA_IR_FII,
                       "prejuizo_a_compensar": acumulado})
    return pd.DataFrame(linhas, columns=cols)


def consolida(posicoes: pd.DataFrame, cotacoes: dict) -> pd.DataFrame:
    df = posicoes.copy()
    df["cotacao"] = df["ticker"].map(cotacoes)
    df["valor_atual"] = df["quantidade"] * df["cotacao"]
    df["resultado"] = df["valor_atual"] - df["custo_total"]
    df["resultado_pct"] = df["resultado"] / df["custo_total"] * 100
    total = df["valor_atual"].sum()
    df["peso_pct"] = df["valor_atual"] / total * 100 if total else 0.0
    return df
