#!/usr/bin/env python3
"""Figures of the thesis, drawn as SVG from the code's formulas and the measured data
(../verifica/misure-paesaggio.json). Run: python3 make_figures.py"""
import json, math, os

HERE = os.path.dirname(os.path.abspath(__file__))
INK, OCHRE, RED, GREY, HAIR = '#1f3354', '#96671f', '#b04a3f', '#8d877c', '#e3ddd0'
FONT = "font-family='Lexend, Helvetica, sans-serif'"

def svg(w, h, body):
    return f"<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 {w} {h}' width='{w}' height='{h}' {FONT} font-size='11'>{body}</svg>"

class Plot:
    def __init__(self, x0, y0, w, h, xr, yr, xlabel, ylabel, xticks, yticks, logy=False):
        self.x0, self.y0, self.w, self.h, self.xr, self.yr, self.logy = x0, y0, w, h, xr, yr, logy
        self.s = []
        self.s.append(f"<rect x='{x0}' y='{y0}' width='{w}' height='{h}' fill='none' stroke='{HAIR}'/>")
        for t in xticks:
            X = self.X(t)
            self.s.append(f"<line x1='{X}' y1='{y0+h}' x2='{X}' y2='{y0+h+4}' stroke='{GREY}'/><text x='{X}' y='{y0+h+16}' text-anchor='middle' fill='{GREY}'>{t:g}</text>")
        for t in yticks:
            Y = self.Y(t)
            self.s.append(f"<line x1='{x0}' y1='{Y}' x2='{x0+w}' y2='{Y}' stroke='{HAIR}' stroke-dasharray='2 3'/><text x='{x0-6}' y='{Y+4}' text-anchor='end' fill='{GREY}'>{t:g}</text>")
        self.s.append(f"<text x='{x0+w/2}' y='{y0+h+32}' text-anchor='middle' fill='{INK}'>{xlabel}</text>")
        self.s.append(f"<text x='{x0-38}' y='{y0+h/2}' text-anchor='middle' fill='{INK}' transform='rotate(-90 {x0-38} {y0+h/2})'>{ylabel}</text>")
    def X(self, v): return self.x0 + (v - self.xr[0]) / (self.xr[1] - self.xr[0]) * self.w
    def Y(self, v):
        if self.logy:
            v, lo, hi = math.log(v), math.log(self.yr[0]), math.log(self.yr[1])
        else:
            lo, hi = self.yr
        return self.y0 + self.h - (v - lo) / (hi - lo) * self.h
    def line(self, pts, color, width=2, dash=''):
        d = ' '.join(f"{'M' if i == 0 else 'L'}{self.X(x):.1f} {self.Y(y):.1f}" for i, (x, y) in enumerate(pts))
        self.s.append(f"<path d='{d}' fill='none' stroke='{color}' stroke-width='{width}' {('stroke-dasharray=%r' % dash) if dash else ''} stroke-linecap='round'/>")
    def dots(self, pts, color, r=4, hollow=False):
        for x, y in pts:
            self.s.append(f"<circle cx='{self.X(x):.1f}' cy='{self.Y(y):.1f}' r='{r}' fill='{'none' if hollow else color}' stroke='{color}' stroke-width='1.5'/>")
    def text(self, x, y, t, color=INK, anchor='start'):
        self.s.append(f"<text x='{self.X(x):.1f}' y='{self.Y(y):.1f}' fill='{color}' text-anchor='{anchor}'>{t}</text>")
    def out(self): return ''.join(self.s)

def iso_u(t):
    if t <= 0.28: return t / 0.28 * 0.18
    s = (t - 0.28) / 0.72
    return 0.18 + 0.82 * s * s * (3 - 2 * s)

def fig_iso():
    p = Plot(70, 20, 520, 230, (0, 35), (0, 1), 'minuti di ascolto · listening minutes', 'avanzamento u · progress u', [0, 5, 7, 10, 15, 20, 25, 30, 35], [0, 0.18, 0.5, 1])
    p.s.insert(1, f"<rect x='{p.X(0)}' y='20' width='{p.X(7)-p.X(0)}' height='230' fill='#f6f2ea'/>")
    p.s.insert(2, f"<rect x='{p.X(25)}' y='20' width='{p.X(35)-p.X(25)}' height='230' fill='#f6f2ea'/>")
    pts = [(m, iso_u(min(1, m / 25))) for m in [i * 0.25 for i in range(141)]]
    p.line(pts, INK, 2.5)
    p.text(3.5, 0.92, 'rispecchiamento', OCHRE, 'middle'); p.text(3.5, 0.85, 'matching', GREY, 'middle')
    p.text(16, 0.92, 'spostamento', OCHRE, 'middle'); p.text(16, 0.85, 'shifting', GREY, 'middle')
    p.text(30, 0.62, 'mantenimento', OCHRE, 'middle'); p.text(30, 0.55, 'holding', GREY, 'middle')
    return svg(620, 300, p.out())

def bright(v, a): return min(4000, max(200, 250 * 8 ** (0.65 * a + 0.35 * v)))
def events(a): return min(24, 2 + 22 * a * a)

def fig_mapping():
    p1 = Plot(70, 20, 240, 200, (0, 1), (200, 2200), 'arousal a', 'brillantezza · brightness (Hz)', [0, 0.5, 1], [250, 500, 1000, 2000], logy=True)
    for v, c, d in ((0.15, GREY, '4 3'), (0.5, OCHRE, ''), (0.85, INK, '')):
        p1.line([(a / 50, bright(v, a / 50)) for a in range(51)], c, 2, d)
    p1.text(0.04, 1700, 'v = 0,85', INK); p1.text(0.04, 1250, 'v = 0,50', OCHRE); p1.text(0.04, 930, 'v = 0,15', GREY)
    p2 = Plot(390, 20, 240, 200, (0, 1), (0, 25), 'arousal a', 'eventi al minuto · events per minute', [0, 0.5, 1], [0, 6, 12, 18, 24])
    p2.line([(a / 50, events(a / 50)) for a in range(51)], INK, 2.5)
    p2.line([(a / 50, events(a / 50) * 0.8) for a in range(51)], GREY, 1.5, '4 3')
    p2.text(0.05, 22, 'giorno · day', INK); p2.text(0.05, 19.5, 'notte · night (×0,8)', GREY)
    return svg(660, 270, p1.out() + p2.out())

def load():
    return json.load(open(os.path.join(HERE, '..', 'verifica', 'misure-paesaggio.json')))

def fig_a3(m):
    rows = m['rows']
    p = Plot(70, 20, 500, 230, (300, 1500), (200, 1200), 'brillantezza richiesta · requested brightness (Hz)', 'centroide misurato · measured centroid (Hz)', [400, 800, 1200], [200, 400, 600, 800, 1000, 1200])
    p.dots([(r['brightnessHz'], r['centroidHz']) for r in rows if r['soundmark'] == 'none'], INK)
    p.dots([(r['brightnessHz'], r['centroidHz']) for r in rows if r['soundmark'] == 'wind'], OCHRE, 4, True)
    p.text(320, 1130, f"● senza tessitura · no texture  ρ = {m['A3']['spearmanBrightnessCentroid']:.2f}".replace('.', ','), INK)
    p.text(320, 1060, f"○ con vento · with wind  ρ = {m['A3']['spearmanBrightnessCentroidWithTexture']:.2f}".replace('.', ','), OCHRE)
    return svg(600, 300, p.out())

def fig_a2(m):
    runs = m['A2']['runs']
    p = Plot(70, 20, 300, 260, (0, 20), (0, 20), 'eventi della partitura / min · score events / min', 'onset rilevati / min · detected onsets / min', [0, 5, 10, 15, 20], [0, 5, 10, 15, 20])
    p.line([(0, 0), (20, 20)], HAIR, 1.5)
    for a, c in ((0.15, GREY), (0.5, OCHRE), (0.85, INK)):
        p.dots([(r['perMinScore'], r['perMinDetected']) for r in runs if r['arousal'] == a], c)
    p.text(1, 18.5, f"F = {m['A2']['f']:.2f}  (P {m['A2']['precision']:.2f} · R {m['A2']['recall']:.2f}, ±50 ms)".replace('.', ','), INK)
    p.text(1, 16.8, 'a = 0,15 ● grigio · a = 0,50 ● ocra · a = 0,85 ● blu', GREY)
    return svg(420, 330, p.out())

def fig_a4(m):
    w = m['A4']['windows']
    norm = lambda xs: [(x - min(xs)) / (max(xs) - min(xs) or 1) for x in xs]
    ts = [x['t'] + 7.5 for x in w]
    p = Plot(70, 20, 480, 220, (15, 165), (0, 1), 'tempo della sessione compressa (s) · compressed-session time (s)', 'valore normalizzato · normalised value', [15, 45, 75, 105, 135, 165], [0, 0.5, 1])
    for key, c, d, lab in (('brightnessHz', INK, '', 'brillantezza richiesta · requested brightness'), ('droneCentroidHz', OCHRE, '', f"centroide del bordone · drone centroid (ρ {m['A4']['spearmanDrone']:.2f})".replace('.', ',')), ('mixCentroidHz', RED, '4 3', f"centroide del mix · mix centroid (ρ {m['A4']['spearmanMix']:.2f})".replace('.', ','))):
        p.line(list(zip(ts, norm([x[key] for x in w]))), c, 2, d)
    p.s.append(f"<text x='560' y='40' fill='{INK}'>brillantezza richiesta</text><text x='560' y='54' fill='{GREY}'>requested brightness</text>")
    p.s.append(f"<text x='560' y='84' fill='{OCHRE}'>centroide bordone ρ {m['A4']['spearmanDrone']:.2f}</text>".replace('.', ',', 1))
    p.s.append(f"<text x='560' y='112' fill='{RED}'>centroide mix ρ {m['A4']['spearmanMix']:.2f}</text>".replace('.', ',', 1))
    return svg(760, 290, p.out())

def box(x, y, w, h, t1, t2='', fill='#fbf8f1', stroke=INK):
    s = f"<rect x='{x}' y='{y}' width='{w}' height='{h}' rx='8' fill='{fill}' stroke='{stroke}' stroke-width='1.3'/>"
    s += f"<text x='{x+w/2}' y='{y+h/2-(6 if t2 else -4)}' text-anchor='middle' fill='{INK}' font-weight='600'>{t1}</text>"
    if t2: s += f"<text x='{x+w/2}' y='{y+h/2+11}' text-anchor='middle' fill='{GREY}' font-size='10'>{t2}</text>"
    return s

def arrow(x1, y1, x2, y2):
    return f"<line x1='{x1}' y1='{y1}' x2='{x2}' y2='{y2}' stroke='{GREY}' stroke-width='1.3' marker-end='url(#ah)'/>"

def fig_flow():
    s = f"<defs><marker id='ah' viewBox='0 0 10 10' refX='9' refY='5' markerWidth='7' markerHeight='7' orient='auto'><path d='M0 0L10 5L0 10z' fill='{GREY}'/></marker></defs>"
    s += box(10, 20, 170, 54, 'stato dichiarato', 'declared state (v, a)')
    s += box(10, 100, 170, 54, 'traiettoria ISO', 'ISO trajectory, 25 min')
    s += box(10, 180, 170, 54, 'ora · spazio · ambiente', 'hour · space · soundmark')
    s += arrow(95, 74, 95, 100)
    s += box(230, 100, 160, 54, 'mappatura', 'MAPPING_TABLE')
    s += arrow(180, 127, 230, 127); s += arrow(180, 207, 230, 140)
    s += box(440, 10, 190, 54, 'bordone · keynote', 'additiva 3×6 armonici')
    s += box(440, 80, 190, 54, 'tessitura · soundmark', 'rumore filtrato, gocce')
    s += box(440, 150, 190, 54, 'segnali · signals', 'Poisson + Markov, HRTF')
    s += box(440, 222, 190, 40, 'partitura con seme', 'seeded score (JSON)')
    for y in (37, 107, 177): s += arrow(390, 127, 440, y)
    s += arrow(390, 140, 440, 242)
    s += box(680, 80, 150, 54, 'riverbero RT60', 'convoluzione · D/R')
    s += box(680, 160, 150, 54, 'volume · crénau', 'fade ≥ 8 s / ≥ 6 s')
    s += box(680, 240, 150, 46, 'limiter −6 dBFS', 'uscita · output')
    s += arrow(630, 37, 680, 100); s += arrow(630, 107, 680, 107); s += arrow(630, 177, 680, 120)
    s += arrow(755, 134, 755, 160); s += arrow(755, 214, 755, 240)
    s += arrow(535, 262, 680, 280)
    s += f"<text x='560' y='300' fill='{GREY}' font-size='10'>WAV · patch Pd · partitura JSON</text>"
    return svg(840, 310, s)

def main():
    os.makedirs(os.path.join(HERE, 'fig'), exist_ok=True)
    m = load()
    for name, content in (('iso-path', fig_iso()), ('mapping', fig_mapping()), ('a3-centroid', fig_a3(m)), ('a2-onsets', fig_a2(m)), ('a4-iso', fig_a4(m)), ('flow', fig_flow())):
        open(os.path.join(HERE, 'fig', name + '.svg'), 'w').write(content)
        print('fig/' + name + '.svg')

if __name__ == '__main__':
    main()
