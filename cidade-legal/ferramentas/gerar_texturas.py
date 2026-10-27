"""Gera as texturas PBR (cor + relevo) da Cidade Legal e empacota em texturas.js.

Tudo é procedural e emenda sem costura (ruído periódico via FFT e Voronoi com
"wrap"), então nenhuma textura depende de download ou licença de terceiros.

Uso:  python3 ferramentas/gerar_texturas.py        (dentro de cidade-legal/)

Saída:
  texturas/<nome>_cor.jpg      cor (albedo), 1024 px
  texturas/<nome>_relevo.jpg   normal map (convenção OpenGL), 512 px
  texturas.js                  as mesmas imagens em data URI (o jogo funciona
                               abrindo o index.html direto do disco, sem servidor)

Para usar fotos reais (ex.: Poly Haven / ambientCG, CC0), basta substituir os
arquivos em texturas/ mantendo os nomes e rodar:  python3 ferramentas/gerar_texturas.py --so-empacotar
"""
import base64
import io
import os
import sys

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

N = 1024
RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PASTA = os.path.join(RAIZ, 'texturas')
rng = np.random.default_rng(7)


# ── Ruído periódico ─────────────────────────────────────────────────────────
def ruido(escala, n=N, semente=None):
    """Ruído suave e periódico: ruído branco filtrado por gaussiana no domínio da frequência.
    escala ~ tamanho das manchas em pixels."""
    g = np.random.default_rng(semente) if semente is not None else rng
    w = g.standard_normal((n, n))
    f = np.fft.fftfreq(n)
    fx, fy = np.meshgrid(f, f)
    filtro = np.exp(-(fx ** 2 + fy ** 2) * (np.pi * escala) ** 2 / 2)
    r = np.real(np.fft.ifft2(np.fft.fft2(w) * filtro))
    r -= r.min()
    return r / (r.max() + 1e-9)


def fbm(escalas, pesos, n=N):
    total = sum(p * ruido(e, n) for e, p in zip(escalas, pesos))
    total -= total.min()
    return total / total.max()


def voronoi(celula, n=N, semente=1):
    """Distâncias F1 e F2 (periódicas) e id da célula, com 1 ponto por célula da grade."""
    g = np.random.default_rng(semente)
    m = n // celula
    pts = (np.stack(np.meshgrid(np.arange(m), np.arange(m)), -1) + g.random((m, m, 2))) * celula
    yy, xx = np.mgrid[0:n, 0:n].astype(np.float32)
    cx, cy = (xx // celula).astype(int), (yy // celula).astype(int)
    f1 = np.full((n, n), 1e9, np.float32)
    f2 = np.full((n, n), 1e9, np.float32)
    ident = np.zeros((n, n), np.int32)
    for dy in (-1, 0, 1):
        for dx in (-1, 0, 1):
            gx, gy = cx + dx, cy + dy
            p = pts[gy % m, gx % m]
            px = p[..., 0] + (gx - gx % m) * celula
            py = p[..., 1] + (gy - gy % m) * celula
            d = np.hypot(xx - px, yy - py)
            novo = d < f1
            f2 = np.where(novo, f1, np.minimum(f2, d))
            ident = np.where(novo, (gy % m) * m + (gx % m), ident)
            f1 = np.where(novo, d, f1)
    return f1, f2, ident


def cor(hex_):
    hex_ = hex_.lstrip('#')
    return np.array([int(hex_[i:i + 2], 16) for i in (0, 2, 4)], np.float32) / 255


def misturar(a, b, t):
    t = t[..., None] if np.ndim(t) == 2 else t
    return a * (1 - t) + b * t


def normal_de(altura, forca, tamanho=512):
    h = np.array(Image.fromarray((altura * 255).astype(np.uint8)).resize((tamanho, tamanho), Image.BILINEAR), np.float32) / 255
    dx = (np.roll(h, -1, 1) - np.roll(h, 1, 1)) * forca
    dy = (np.roll(h, -1, 0) - np.roll(h, 1, 0)) * forca
    nrm = np.stack([-dx, dy, np.ones_like(h)], -1)
    nrm /= np.linalg.norm(nrm, axis=-1, keepdims=True)
    return ((nrm * .5 + .5) * 255).astype(np.uint8)


def salvar(nome, rgb, altura, forca):
    os.makedirs(PASTA, exist_ok=True)
    img = Image.fromarray((np.clip(rgb, 0, 1) * 255).astype(np.uint8))
    img.save(os.path.join(PASTA, f'{nome}_cor.jpg'), quality=86, optimize=True)
    Image.fromarray(normal_de(altura, forca)).save(os.path.join(PASTA, f'{nome}_relevo.jpg'), quality=90, optimize=True)
    print('  ', nome)


def tracos_periodicos(desenhar, n=N, modo='RGB', fundo=0):
    """Desenha numa tela 3x maior e recorta o centro somado às bordas: traços atravessam as emendas."""
    tela = Image.new(modo, (n, n), fundo)
    d = ImageDraw.Draw(tela)
    for ox in (-n, 0, n):
        for oy in (-n, 0, n):
            desenhar(d, ox, oy)
    return tela


# ── Materiais ───────────────────────────────────────────────────────────────
def grama():
    base = fbm([90, 30, 8], [.5, .3, .2])
    manchas = ruido(160)
    rgb = misturar(cor('#3E6B2A'), cor('#6E9A3A'), base)
    rgb = misturar(rgb, cor('#8A8F45'), np.clip((manchas - .62) * 3, 0, 1) * .55)  # manchas secas
    qtd = 40000  # folhas curtas e finas, vistas de cima
    pos = rng.random((qtd, 2)) * N
    ang = rng.uniform(0, np.pi * 2, qtd)
    comp = rng.uniform(2, 6, qtd)
    tons = rng.uniform(0, 1, qtd)

    def folhas(d, ox, oy):
        for (x, y), a, c, tt in zip(pos, ang, comp, tons):
            v = int(70 + tt * 120)
            d.line([(x + ox, y + oy), (x + ox + np.cos(a) * c, y + oy + np.sin(a) * c)], fill=(v, v, v), width=1)
    camada = np.array(tracos_periodicos(folhas).convert('L').filter(ImageFilter.GaussianBlur(.6)), np.float32) / 255
    mask = (camada > 0).astype(np.float32)
    rgb = misturar(rgb, misturar(cor('#355F22'), cor('#8DB650'), camada), mask * .55)
    altura = np.clip(base * .5 + camada * .5, 0, 1)
    salvar('grama', rgb, altura, 2.5)


def asfalto():
    base = fbm([60, 12, 3], [.3, .3, .4])
    rgb = misturar(cor('#2E3136'), cor('#4A4E55'), base)
    brita = rng.random((N, N))
    rgb = np.where((brita > .985)[..., None], cor('#8E9299'), rgb)
    rgb = np.where((brita < .01)[..., None], cor('#1C1E21'), rgb)
    rgb = misturar(rgb, cor('#24262A'), np.clip((ruido(120) - .65) * 4, 0, 1) * .5)  # manchas de óleo

    caminhos = []  # sorteados uma vez e desenhados nas 9 cópias, para emendar sem costura
    for _ in range(6):
        x, y = rng.random(2) * N
        a = rng.random() * 6.28
        pts = [(x, y)]
        for _ in range(40):
            a += rng.normal(0, .5)
            x, y = x + np.cos(a) * 9, y + np.sin(a) * 9
            pts.append((x, y))
        caminhos.append(pts)

    def rachas(d, ox, oy):
        for pts in caminhos:
            d.line([(x + ox, y + oy) for x, y in pts], fill=255, width=2)
    r1 = np.array(tracos_periodicos(rachas, modo='L'), np.float32) / 255
    rgb = misturar(rgb, cor('#17181A'), r1 * .85)
    altura = np.clip(base * .5 + (brita > .985) * .5 - r1 * .5 + .2, 0, 1)
    salvar('asfalto', rgb, altura, 5)


def piso():
    lado = N // 4
    yy, xx = np.mgrid[0:N, 0:N]
    junta = ((xx % lado < 6) | (yy % lado < 6)).astype(np.float32)
    ident = (yy // lado) * 4 + (xx // lado)
    var = rng.uniform(-.06, .06, 16)[ident]
    grao = fbm([2, 8, 40], [.4, .3, .3])
    rgb = cor('#B9B4AA')[None, None] + var[..., None] + (grao[..., None] - .5) * .12
    rgb = misturar(rgb, cor('#6F6A62'), junta)
    rgb = misturar(rgb, cor('#8C877E'), np.clip((ruido(90) - .7) * 3, 0, 1) * .4)
    altura = np.clip(.8 - junta * .7 + grao * .15, 0, 1)
    salvar('piso', rgb, altura, 4)


def tijolo():
    linhas, por_linha = 16, 4
    h, w = N // linhas, N // por_linha
    yy, xx = np.mgrid[0:N, 0:N]
    fila = yy // h
    xs = (xx + (fila % 2) * (w // 2)) % N
    col = xs // w
    rejunte = ((yy % h < 7) | (xs % w < 8)).astype(np.float32)
    ident = fila * por_linha + col
    tons = rng.random(linhas * por_linha)
    base_t = tons[ident]
    paleta = misturar(cor('#8E3B24')[None, None], cor('#B85A36')[None, None], base_t[..., None])
    paleta = misturar(paleta, cor('#6B2A1C'), (base_t > .85).astype(np.float32) * .6)
    grao = fbm([2, 6, 30], [.35, .35, .3])
    rgb = paleta + (grao[..., None] - .5) * .18
    lasca = np.clip((ruido(4) - .78) * 6, 0, 1) * (1 - rejunte)  # cantos lascados
    rgb = misturar(rgb, cor('#C9BFAF'), np.maximum(rejunte, lasca * .5))
    altura = np.clip(.85 - rejunte * .75 - lasca * .3 + grao * .1, 0, 1)
    salvar('tijolo', rgb, altura, 7)


def reboco():
    grao = fbm([1.5, 5, 25, 120], [.3, .3, .2, .2])
    rgb = cor('#ECE8E0')[None, None] + (grao[..., None] - .5) * .1
    escorrido = ruido(40) * np.clip(np.linspace(1, .2, N), 0, 1)[:, None]  # sujeira escorrida
    rgb = misturar(rgb, cor('#BDB6A8'), np.clip((escorrido - .5) * 2, 0, 1) * .35)
    salvar('reboco', rgb, grao, 3)


def concreto():
    grao = fbm([1.5, 6, 30, 150], [.35, .25, .2, .2])
    rgb = cor('#A7A6A2')[None, None] + (grao[..., None] - .5) * .16
    yy, xx = np.mgrid[0:N, 0:N]
    painel = ((xx % 512 < 3) | (yy % 256 < 3)).astype(np.float32)
    furos = (((xx % 128 - 64) ** 2 + (yy % 128 - 64) ** 2) < 30).astype(np.float32)
    rgb = misturar(rgb, cor('#6E6D69'), np.maximum(painel * .7, furos * .8))
    listras = ruido(6)[:, :1].repeat(N, 1).T * ruido(200)
    rgb = misturar(rgb, cor('#7D7B76'), np.clip((listras - .35) * 2, 0, 1) * .25)
    altura = np.clip(grao * .6 + .4 - painel * .4 - furos * .4, 0, 1)
    salvar('concreto', rgb, altura, 4)


def telha():
    fileiras, colunas = 8, 8  # divisores de N, para emendar sem costura
    h, w = N // fileiras, N // colunas
    yy, xx = np.mgrid[0:N, 0:N]
    fila = yy // h
    xs = (xx + (fila % 2) * (w // 2)) % N
    u = (xs % w) / w
    v = (yy % h) / h
    curva = np.sin(u * np.pi) ** .6                 # telha capa-canal arredondada
    sombra = np.clip(v * 1.4, 0, 1) ** 2            # sobreposição da fileira de cima
    ident = fila * colunas + xs // w
    var = rng.uniform(-.08, .08, fileiras * colunas)[ident]
    grao = fbm([2, 8], [.5, .5])
    beirada = np.clip((v - .82) / .18, 0, 1)        # borda da telha, que projeta sombra
    luz = .32 + .68 * curva - .35 * sombra * (1 - curva) - .45 * beirada + var + (grao - .5) * .08
    rgb = np.repeat(np.clip(luz, 0, 1)[..., None], 3, -1) * cor('#F7E9DC')
    musgo = np.clip((ruido(70) - .72) * 4, 0, 1) * sombra
    rgb = misturar(rgb, cor('#7F8A5A'), musgo * .5)
    altura = np.clip(curva * .75 + (1 - beirada) * .25, 0, 1)
    salvar('telha', rgb, altura, 8)


def madeira():
    tabuas = 8
    w = N // tabuas
    yy, xx = np.mgrid[0:N, 0:N].astype(np.float32)
    ident = (xx // w).astype(int)
    desloc = rng.uniform(0, 50, tabuas)[ident]
    torcao = ruido(60) * 40
    veios = np.sin((xx + torcao + desloc * 7) / 3.5 + ruido(8) * 3) * .5 + .5
    tons = rng.uniform(0, 1, tabuas)[ident]
    rgb = misturar(cor('#6B4426'), cor('#A87443'), (tons * .6 + veios * .4))
    fresta = (xx % w < 4).astype(np.float32)
    rgb = misturar(rgb, cor('#2A1A0E'), fresta)
    altura = np.clip(.8 - fresta * .7 + veios * .1, 0, 1)
    salvar('madeira', rgb, altura, 5)


def pedra_portuguesa():
    f1, f2, ident = voronoi(16)
    borda = np.clip((f2 - f1) / 4, 0, 1)            # rejunte entre as pedrinhas
    m = N // 16
    centros_y = (ident // m + .5) * 16
    centros_x = (ident % m + .5) * 16
    onda = np.sin(centros_x / N * 2 * np.pi * 2) * 70
    faixa = (((centros_y + onda) % 256) < 100).astype(np.float32)  # ondas de Copacabana
    var = rng.uniform(-.07, .07, m * m)[ident]
    clara = cor('#EDE8DD')[None, None] + var[..., None]
    escura = cor('#2A2A2C')[None, None] + var[..., None] * .5
    rgb = misturar(clara, escura, faixa)
    rgb = misturar(cor('#7B766C')[None, None].repeat(N, 0).repeat(N, 1), rgb, borda)
    altura = np.clip(borda * .9 + .1, 0, 1)
    salvar('pedra', rgb, altura, 6)


def terra():
    yy = np.mgrid[0:N, 0:N][0].astype(np.float32)
    camadas = np.sin(yy / N * 2 * np.pi * 5 + ruido(80) * 4) * .5 + .5
    base = fbm([3, 15, 60], [.3, .3, .4])
    rgb = misturar(cor('#5A3A22'), cor('#8C6239'), camadas * .6 + base * .4)
    f1, f2, _ = voronoi(64, semente=3)
    pedras = (f1 < 14).astype(np.float32) * (ruido(30) > .5)
    rgb = misturar(rgb, cor('#8F8A80'), pedras * .8)
    altura = np.clip(base * .6 + pedras * .4, 0, 1)
    salvar('terra', rgb, altura, 5)


def agua():
    ondas = fbm([20, 8, 3], [.5, .3, .2])
    rgb = misturar(cor('#1E5F86'), cor('#3B8FB8'), ondas)
    salvar('agua', rgb, ondas, 5)


# ── Empacotamento ───────────────────────────────────────────────────────────
NOMES = ['grama', 'asfalto', 'piso', 'tijolo', 'reboco', 'concreto', 'telha', 'madeira', 'pedra', 'terra', 'agua']


def empacotar():
    linhas = ['/* Gerado por ferramentas/gerar_texturas.py — não edite à mão. */', 'const TEXTURAS = {']
    for nome in NOMES:
        partes = []
        for tipo in ('cor', 'relevo'):
            with open(os.path.join(PASTA, f'{nome}_{tipo}.jpg'), 'rb') as f:
                partes.append(f"{tipo}: 'data:image/jpeg;base64,{base64.b64encode(f.read()).decode()}'")
        linhas.append(f'  {nome}: {{ {", ".join(partes)} }},')
    linhas.append('};')
    with open(os.path.join(RAIZ, 'texturas.js'), 'w') as f:
        f.write('\n'.join(linhas) + '\n')
    print('texturas.js:', round(os.path.getsize(os.path.join(RAIZ, 'texturas.js')) / 1e6, 2), 'MB')


if __name__ == '__main__':
    if '--so-empacotar' not in sys.argv:
        print('Gerando texturas…')
        for gerar in (grama, asfalto, piso, tijolo, reboco, concreto, telha, madeira, pedra_portuguesa, terra, agua):
            gerar()
    empacotar()
