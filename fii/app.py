"""Meus FIIs — painel pessoal de fundos imobiliários.

Execute com:  streamlit run app.py
"""
from datetime import date

import pandas as pd
import plotly.express as px
import streamlit as st

from fii_core import b3_import, carteira, db, fontes

st.set_page_config(page_title="Meus FIIs", page_icon="🏢", layout="wide")


def brl(v):
    if v is None or pd.isna(v):
        return "—"
    return f"R$ {v:,.2f}".replace(",", "X").replace(".", ",").replace("X", ".")


FORMATO_BRL = {"format": "R$ %.2f"}


# ------------------------------------------------------------------ cache das fontes
@st.cache_data(ttl=15 * 60, show_spinner="Buscando cotações...")
def cotacoes_cache(tickers: tuple):
    return fontes.cotacoes(tickers)


@st.cache_data(ttl=6 * 60 * 60, show_spinner="Baixando indicadores do Fundamentus...")
def fundamentus_cache():
    return fontes.fundamentus_fiis()


@st.cache_data(ttl=60 * 60, show_spinner="Buscando histórico...")
def historico_cache(ticker: str, periodo: str):
    return fontes.yahoo_historico(ticker, periodo)


def fundamentus_ou_none():
    try:
        return fundamentus_cache()
    except fontes.FonteIndisponivel as e:
        st.warning(f"Fundamentus indisponível no momento ({e}).")
        return None


con = db.conectar()
ops = db.operacoes(con)
provs = db.proventos(con)
posicoes, vendas = carteira.processa_operacoes(ops)

st.title("🏢 Meus FIIs")
if "aviso" in st.session_state:
    st.success(st.session_state.pop("aviso"))
st.caption("Carteira importada da B3 + indicadores de mercado (Fundamentus, Yahoo Finance, brapi.dev) "
           "+ atalhos para Status Invest, Funds Explorer, FIIs.com.br, Investidor10 e Clube FII.")

aba_cart, aba_prov, aba_ir, aba_screen, aba_fii, aba_imp = st.tabs(
    ["📊 Carteira", "💰 Proventos", "🧾 IR", "🔎 Screener", "📈 Analisar FII", "⬆️ Importar / Lançar"])

# ------------------------------------------------------------------ Carteira
with aba_cart:
    if posicoes.empty:
        st.info("Nenhuma posição ainda. Importe o extrato de **Negociação** da B3 na aba *Importar / Lançar*.")
    else:
        if st.button("🔄 Atualizar cotações"):
            cotacoes_cache.clear()
        cot = cotacoes_cache(tuple(posicoes["ticker"]))
        faltando = [t for t in posicoes["ticker"] if cot.get(t) is None]
        if faltando:
            st.warning("Sem cotação para: " + ", ".join(faltando) + ". Valores atuais desses ativos ficam em branco.")
        cons = carteira.consolida(posicoes, cot)

        doze_meses = provs[provs["data"] >= pd.Timestamp.today() - pd.DateOffset(months=12)]
        prov_12m = doze_meses["valor"].sum()
        c1, c2, c3, c4 = st.columns(4)
        c1.metric("Custo total", brl(cons["custo_total"].sum()))
        c2.metric("Valor de mercado", brl(cons["valor_atual"].sum()) if cons["valor_atual"].notna().any() else "—",
                  f"{cons['resultado'].sum() / cons['custo_total'].sum() * 100:+.2f}%" if cons["valor_atual"].notna().all() else None)
        c3.metric("Proventos 12m", brl(prov_12m))
        c4.metric("Yield on cost 12m", f"{prov_12m / cons['custo_total'].sum() * 100:.2f}%")

        fund = fundamentus_ou_none()
        if fund is not None:
            cons = cons.merge(fund[["ticker", "segmento", "dy", "pvp"]], on="ticker", how="left")

        st.dataframe(cons, hide_index=True, use_container_width=True, column_config={
            "ticker": "Ativo", "quantidade": st.column_config.NumberColumn("Qtd", format="%d"),
            "preco_medio": st.column_config.NumberColumn("Preço médio", **FORMATO_BRL),
            "custo_total": st.column_config.NumberColumn("Custo", **FORMATO_BRL),
            "cotacao": st.column_config.NumberColumn("Cotação", **FORMATO_BRL),
            "valor_atual": st.column_config.NumberColumn("Valor atual", **FORMATO_BRL),
            "resultado": st.column_config.NumberColumn("Resultado", **FORMATO_BRL),
            "resultado_pct": st.column_config.NumberColumn("Resultado %", format="%.2f%%"),
            "peso_pct": st.column_config.NumberColumn("Peso %", format="%.1f%%"),
            "segmento": "Segmento", "dy": st.column_config.NumberColumn("DY 12m", format="%.2f%%"),
            "pvp": st.column_config.NumberColumn("P/VP", format="%.2f"),
        })

        g1, g2 = st.columns(2)
        base = cons.dropna(subset=["valor_atual"])
        g1.plotly_chart(px.pie(base, names="ticker", values="valor_atual", title="Por ativo", hole=.45),
                        use_container_width=True)
        if "segmento" in base:
            g2.plotly_chart(px.pie(base.fillna({"segmento": "Sem dado"}), names="segmento", values="valor_atual",
                                   title="Por segmento", hole=.45), use_container_width=True)

# ------------------------------------------------------------------ Proventos
with aba_prov:
    if provs.empty:
        st.info("Importe o extrato de **Movimentação** da B3 para ver os rendimentos recebidos.")
    else:
        mensal = provs.assign(mes=provs["data"].dt.to_period("M").dt.to_timestamp()) \
            .groupby(["mes", "ticker"], as_index=False)["valor"].sum()
        st.plotly_chart(px.bar(mensal, x="mes", y="valor", color="ticker", title="Proventos por mês",
                               labels={"mes": "", "valor": "R$"}), use_container_width=True)
        c1, c2, c3 = st.columns(3)
        c1.metric("Total recebido", brl(provs["valor"].sum()))
        ultimos = mensal.groupby("mes")["valor"].sum().tail(12)
        c2.metric("Média mensal (últimos 12 meses c/ provento)", brl(ultimos.mean()))
        c3.metric("Último mês", brl(ultimos.iloc[-1]) if len(ultimos) else "—")
        por_ativo = provs.groupby("ticker", as_index=False)["valor"].sum().sort_values("valor", ascending=False)
        st.dataframe(por_ativo, hide_index=True, column_config={
            "ticker": "Ativo", "valor": st.column_config.NumberColumn("Total recebido", **FORMATO_BRL)})

# ------------------------------------------------------------------ IR
with aba_ir:
    st.markdown("Rendimentos de FII são **isentos** para pessoa física (cumpridos os requisitos legais). "
                "O **ganho na venda de cotas** é tributado em **20%**, sem isenção de R$ 20 mil, "
                "pago via DARF código **6015** até o último dia útil do mês seguinte. "
                "Prejuízos podem ser compensados com lucros futuros em FII.")
    apur = carteira.apuracao_ir(vendas)
    if apur.empty:
        st.info("Nenhuma venda registrada.")
    else:
        st.dataframe(apur, hide_index=True, use_container_width=True, column_config={
            c: st.column_config.NumberColumn(c.replace("_", " ").capitalize(), **FORMATO_BRL)
            for c in apur.columns if c != "mes"})
        with st.expander("Vendas detalhadas"):
            st.dataframe(vendas, hide_index=True, use_container_width=True)
    st.caption("Estimativa para conferência. Não considera IR retido (dedo-duro) nem custos não lançados; "
               "confira com um contador ou o programa da Receita.")

# ------------------------------------------------------------------ Screener
with aba_screen:
    fund = fundamentus_ou_none()
    if fund is not None:
        f1, f2, f3, f4 = st.columns(4)
        dy_min, dy_max = f1.slider("DY 12m (%)", 0.0, 30.0, (8.0, 18.0), 0.5)
        pvp_min, pvp_max = f2.slider("P/VP", 0.0, 2.0, (0.6, 1.05), 0.01)
        liq_min = f3.number_input("Liquidez diária mínima (R$)", 0, value=500_000, step=100_000)
        vac_max = f4.slider("Vacância máx. (%)", 0.0, 100.0, 100.0, 1.0)
        segmentos = sorted(fund["segmento"].dropna().unique())
        escolha = st.multiselect("Segmentos", segmentos, placeholder="Todos")

        filtro = fund[fund["dy"].between(dy_min, dy_max) & fund["pvp"].between(pvp_min, pvp_max)
                      & (fund["liquidez"] >= liq_min) & (fund["vacancia"].fillna(0) <= vac_max)]
        if escolha:
            filtro = filtro[filtro["segmento"].isin(escolha)]
        filtro = filtro.assign(na_carteira=filtro["ticker"].isin(posicoes["ticker"]),
                               status_invest=filtro["ticker"].map(lambda t: fontes.links_analise(t)["Status Invest"]))
        st.write(f"**{len(filtro)}** de {len(fund)} FIIs")
        st.dataframe(filtro.sort_values("dy", ascending=False), hide_index=True, use_container_width=True,
                     column_config={
                         "dy": st.column_config.NumberColumn("DY 12m", format="%.2f%%"),
                         "ffo_yield": st.column_config.NumberColumn("FFO Yield", format="%.2f%%"),
                         "pvp": st.column_config.NumberColumn("P/VP", format="%.2f"),
                         "cotacao": st.column_config.NumberColumn("Cotação", **FORMATO_BRL),
                         "liquidez": st.column_config.NumberColumn("Liquidez", format="%.0f"),
                         "valor_mercado": st.column_config.NumberColumn("Valor de mercado", format="%.0f"),
                         "cap_rate": st.column_config.NumberColumn("Cap rate", format="%.2f%%"),
                         "vacancia": st.column_config.NumberColumn("Vacância", format="%.2f%%"),
                         "na_carteira": st.column_config.CheckboxColumn("Tenho"),
                         "status_invest": st.column_config.LinkColumn("Status Invest", display_text="abrir"),
                     })
        st.caption("Fonte: fundamentus.com.br — DY e P/VP calculados pelo site; FIIs de papel não têm vacância.")

# ------------------------------------------------------------------ Analisar FII
with aba_fii:
    c1, c2 = st.columns([1, 1])
    sugestao = posicoes["ticker"].iloc[0] if not posicoes.empty else "MXRF11"
    ticker = c1.text_input("Código do FII", sugestao).strip().upper()
    periodo = c2.selectbox("Período", ["6mo", "1y", "2y", "5y", "max"], index=1)
    if ticker:
        links = fontes.links_analise(ticker)
        st.markdown(" · ".join(f"[{nome}]({url})" for nome, url in links.items()))
        try:
            preco, hist, divs = historico_cache(ticker, periodo)
            dy_12m = divs[divs["data"] >= pd.Timestamp.today() - pd.DateOffset(months=12)]["valor"].sum()
            m1, m2, m3 = st.columns(3)
            m1.metric("Cotação", brl(preco))
            m2.metric("Proventos 12m por cota", brl(dy_12m))
            m3.metric("DY 12m (calc.)", f"{dy_12m / preco * 100:.2f}%" if preco else "—")
            st.plotly_chart(px.line(hist, x="data", y="fechamento", title=f"{ticker} — fechamento",
                                    labels={"data": "", "fechamento": "R$"}), use_container_width=True)
            if not divs.empty:
                st.plotly_chart(px.bar(divs, x="data", y="valor", title="Proventos por cota",
                                       labels={"data": "", "valor": "R$"}), use_container_width=True)
        except fontes.FonteIndisponivel as e:
            st.warning(f"Não foi possível obter o histórico ({e}).")

        fund = fundamentus_ou_none()
        if fund is not None:
            linha = fund[fund["ticker"] == ticker]
            if not linha.empty:
                st.subheader("Indicadores (Fundamentus)")
                st.dataframe(linha.T.rename(columns={linha.index[0]: ticker}), use_container_width=True)

        meus = provs[provs["ticker"] == ticker]
        if ticker in set(posicoes["ticker"]) or not meus.empty:
            st.subheader("Minha posição")
            st.dataframe(posicoes[posicoes["ticker"] == ticker], hide_index=True)
            st.write(f"Proventos recebidos: **{brl(meus['valor'].sum())}**")

# ------------------------------------------------------------------ Importar / Lançar
with aba_imp:
    st.markdown("""
**Como exportar da B3:** acesse [investidor.b3.com.br](https://www.investidor.b3.com.br) → *Extratos*.
* **Negociação** → filtre o período → *Baixar* (Excel). Traz compras e vendas.
* **Movimentação** → filtre o período → *Baixar* (Excel). Traz rendimentos, amortizações etc.

Pode reimportar o mesmo arquivo sem medo: lançamentos repetidos são ignorados.
""")
    c1, c2 = st.columns(2)
    arq_neg = c1.file_uploader("Extrato de Negociação (.xlsx / .csv)", type=["xlsx", "xls", "csv"], key="neg")
    if arq_neg is not None and c1.button("Importar negociações"):
        try:
            novos = db.salvar_operacoes(con, b3_import.ler_negociacao(arq_neg))
            st.session_state["aviso"] = f"{novos} operação(ões) nova(s) importada(s)."
            st.rerun()
        except ValueError as e:
            c1.error(str(e))
    arq_mov = c2.file_uploader("Extrato de Movimentação (.xlsx / .csv)", type=["xlsx", "xls", "csv"], key="mov")
    if arq_mov is not None and c2.button("Importar proventos"):
        try:
            novos = db.salvar_proventos(con, b3_import.ler_movimentacao(arq_mov))
            st.session_state["aviso"] = f"{novos} provento(s) novo(s) importado(s)."
            st.rerun()
        except ValueError as e:
            c2.error(str(e))

    st.divider()
    st.subheader("Lançamento manual")
    with st.form("manual", clear_on_submit=True):
        m1, m2, m3, m4, m5, m6 = st.columns(6)
        data_op = m1.date_input("Data", date.today(), format="DD/MM/YYYY")
        tk = m2.text_input("Ativo").strip().upper()
        tipo = m3.selectbox("Tipo", ["compra", "venda"])
        qtd = m4.number_input("Quantidade", min_value=1, step=1)
        preco = m5.number_input("Preço", min_value=0.0, step=0.01, format="%.2f")
        taxas = m6.number_input("Taxas", min_value=0.0, step=0.01, format="%.2f")
        if st.form_submit_button("Adicionar") and tk:
            db.salvar_operacoes(con, pd.DataFrame([{
                "data": pd.Timestamp(data_op), "ticker": tk, "tipo": tipo, "quantidade": float(qtd),
                "preco": preco, "taxas": taxas, "origem": "manual"}]))
            st.rerun()

    st.divider()
    st.subheader("Operações registradas")
    if not ops.empty:
        tabela = ops.assign(apagar=False)
        editado = st.data_editor(tabela, hide_index=True, use_container_width=True,
                                 disabled=[c for c in tabela.columns if c != "apagar"],
                                 column_config={"id": None})
        marcados = editado.loc[editado["apagar"], "id"].tolist()
        b1, b2, b3 = st.columns(3)
        if marcados and b1.button(f"🗑️ Apagar {len(marcados)} operação(ões)"):
            db.apagar(con, "operacoes", marcados)
            st.rerun()
        b2.download_button("⬇️ Backup operações (CSV)", ops.to_csv(index=False).encode(), "operacoes.csv")
        if not provs.empty:
            b3.download_button("⬇️ Backup proventos (CSV)", provs.to_csv(index=False).encode(), "proventos.csv")
