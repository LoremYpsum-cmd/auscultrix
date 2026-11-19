#!/usr/bin/env python3
"""
Chrome Web Store images, made from the real panel (no mock-ups):
  - 5 screenshots 1280x800 per language (it, en)
  - small promo tile 440x280, marquee 1400x560 per language
  - store icon 128x128 (96x96 artwork, 16 px transparent margin)
Needs the local preview running:  node tools/preview/server.mjs   (port 5178)
Run:  python3 tools/store-assets/make_chrome_assets.py
Output: packaging/store-assets/chrome/<lang>/  (sessions shown are demonstration data)
"""
import glob, html, os, shutil, subprocess, sys, tempfile, urllib.parse

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
OUT = os.path.join(ROOT, 'packaging', 'store-assets', 'chrome')
RAW = os.path.join(OUT, '_raw')
BASE = 'http://localhost:5178/preview/sidepanel.html'
PANEL_W = 440  # a common side-panel width; the layout does not overflow here

def served(path):
    return 'http://localhost:5178/' + urllib.parse.quote(os.path.relpath(path, ROOT))

def chrome():
    c = glob.glob(os.path.expanduser('~/Library/Caches/ms-playwright/chromium-*/chrome-mac*/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'))
    c += ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome']
    for x in c:
        if os.path.exists(x): return x
    sys.exit('Chromium not found')

def shot(url, out, w, h, scale=1, budget=9000):
    prof = tempfile.mkdtemp()
    subprocess.run([chrome(), '--headless=new', '--disable-gpu', f'--user-data-dir={prof}', '--hide-scrollbars',
                    f'--force-device-scale-factor={scale}', f'--window-size={w},{h}', f'--virtual-time-budget={budget}',
                    '--default-background-color=00000000', f'--screenshot={out}', url], check=True, capture_output=True)
    shutil.rmtree(prof, ignore_errors=True)

COPY = {
  'it': {
    'mood': ('Scrivi come stai', 'Due parole, un\'etichetta o il cursore dell\'energia. La lettura avviene sul tuo computer: il testo non viene salvato né inviato.'),
    'soundscape': ('Un paesaggio sonoro generato per te', 'Bordone, vento, mare o pioggia e campane nello spazio: una composizione creata sul momento, senza rete, che parte da come stai e si sposta piano.'),
    'playlist': ('Musica che ti accompagna', 'Brani con coordinate emotive documentate: prima vicini al tuo stato, poi un passo alla volta verso uno più sereno.'),
    'media': ('Libri, film, serie e giochi calmi', 'Titoli rivisti uno per uno: niente suicidio, violenza, abusi o dipendenze. Compagnia, non una cura.'),
    'diary': ('I tuoi dati restano tuoi', 'Nessun account, nessun server, nessuna statistica d\'uso. Vedi che cosa è ricordato e cancelli tutto con un tocco.'),
    'tag': 'Diario dell\'umore, musica e paesaggio sonoro',
    'sub': 'Tutto sul tuo computer. Non è un dispositivo medico.',
    'mood_text': 'giornata pesante, sono stanco ma vorrei un po\' di calma',
  },
  'en': {
    'mood': ('Write how you feel', 'A few words, a label or the energy slider. The reading happens on your computer: the text is never saved or sent.'),
    'soundscape': ('A soundscape generated for you', 'A drone, wind, sea or rain, and bells in space: a composition created on the spot, with no network, starting from how you feel and moving slowly.'),
    'playlist': ('Music that keeps you company', 'Tracks with documented emotional coordinates: first close to your state, then one step at a time toward a calmer one.'),
    'media': ('Books, films, series and calm games', 'Every title reviewed one by one: no suicide, violence, abuse or addiction. Company, not a cure.'),
    'diary': ('Your data stays yours', 'No account, no server, no usage statistics. See what is remembered and erase everything with one tap.'),
    'tag': 'Mood diary, music and generative soundscape',
    'sub': 'Everything on your computer. Not a medical device.',
    'mood_text': 'heavy day, I am tired but I would like some calm',
  },
}

RAW_SHOTS = {
  'mood': ('', 820),
  'soundscape': ('&play=1&only=soundscape-section', 860),
  'playlist': ('&start=1&only=playlist-section', 860),
  'media': ('&start=1&only=therapy-media-section', 860),
  'diary': ('&only=your-data-heading', 860),
}

CSS = '''
@font-face { font-family: Lexend; src: url("/assets/dream/fonts/lexend-latin-400.woff2"); }
@font-face { font-family: Lexend; font-weight: 600; src: url("/assets/dream/fonts/lexend-latin-500.woff2"); }
@font-face { font-family: Corm; font-weight: 600; src: url("/assets/dream/fonts/cormorant-garamond-v16-latin-600.woff2"); }
html, body { margin: 0; }
body { background: #f4efe4; font-family: Lexend, -apple-system, sans-serif; color: #1d1b17; overflow: hidden; }
.grid { position: absolute; inset: 0; background-image: linear-gradient(rgba(60,50,30,.06) 1px, transparent 1px), linear-gradient(90deg, rgba(60,50,30,.06) 1px, transparent 1px); background-size: 28px 28px; }
.margin { position: absolute; top: 0; bottom: 0; width: 2px; background: #b04a3f; opacity: .45; }
h1 { font-family: Corm, Georgia, serif; font-weight: 600; letter-spacing: -.01em; margin: 0; }
p { margin: 0; }
.brand { display: flex; align-items: center; gap: 14px; }
.brand img { border-radius: 22%; box-shadow: 0 6px 18px -8px rgba(40,32,20,.35); }
.panel { position: absolute; border-radius: 22px; overflow: hidden; background: #fbf8f2; box-shadow: 0 30px 60px -30px rgba(31,51,84,.45), 0 0 0 1px rgba(40,32,20,.08); }
.panel img { display: block; width: 100%; }
'''

def page(body, w, h):
    return f'<!doctype html><meta charset="utf-8"><style>{CSS} body{{width:{w}px;height:{h}px}}</style><div class="grid"></div>{body}'

def screenshot_html(lang, key, raw):
    title, text = COPY[lang][key]
    return page(f'''<div class="margin" style="left:86px"></div>
<div style="position:absolute;left:130px;top:150px;width:520px">
  <div class="brand"><img src="/icons/app_icon_128.png" width="56" height="56"><span style="font:600 26px Corm,serif">Auscultrix</span></div>
  <h1 style="font-size:56px;line-height:1.05;margin-top:56px">{html.escape(title)}</h1>
  <p style="font-size:21px;line-height:1.55;color:rgba(29,27,23,.72);margin-top:26px">{html.escape(text)}</p>
</div>
<div class="panel" style="left:740px;top:40px;width:440px;height:720px"><img src="../{raw}"></div>''', 1280, 800)

def tile_html(lang, w, h):
    big = w > 1000
    return page(f'''<div class="margin" style="left:{int(w*.06)}px"></div>
<div style="position:absolute;left:{int(w*.1)}px;top:0;bottom:0;display:flex;align-items:center;gap:{40 if big else 22}px;right:{int(w*.06)}px">
  <img src="/icons/app_icon_128.png" width="{150 if big else 76}" height="{150 if big else 76}" style="border-radius:22%;box-shadow:0 10px 30px -12px rgba(40,32,20,.45)">
  <div style="flex:1;min-width:0">
    <h1 style="font-size:{86 if big else 40}px;line-height:1">Auscultrix</h1>
    <p style="font-size:{30 if big else 15}px;line-height:1.3;margin-top:{16 if big else 8}px;color:#1f3354">{html.escape(COPY[lang]['tag'])}</p>
    {f'<p style="font-size:19px;margin-top:12px;color:rgba(29,27,23,.6)">{html.escape(COPY[lang]["sub"])}</p>' if big else ''}
  </div>
</div>''', w, h)

def main():
    os.makedirs(RAW, exist_ok=True)
    # compose pages live next to the images and are served by the preview
    # server, so fonts and images load from one origin
    work = os.path.join(OUT, '_work')
    os.makedirs(work, exist_ok=True)
    for lang in ('it', 'en'):
        dst = os.path.join(OUT, lang)
        os.makedirs(dst, exist_ok=True)
        for n, key in enumerate(['mood', 'soundscape', 'playlist', 'media', 'diary'], 1):
            q, hh = RAW_SHOTS[key]
            mood = urllib.parse.quote(COPY[lang]['mood_text'])
            raw = os.path.join(RAW, f'{lang}-{key}.png')
            shot(f'{BASE}?demo=1&lang={lang}&mood={mood}{q}', raw, PANEL_W, hh, scale=2, budget=12000)
            f = os.path.join(work, f'{lang}-{key}.html')
            open(f, 'w').write(screenshot_html(lang, key, f'_raw/{lang}-{key}.png'))
            shot(served(f), os.path.join(dst, f'screenshot-{n}-{key}-1280x800.png'), 1280, 800)
        for w, h, name in ((440, 280, 'small-promo-tile-440x280.png'), (1400, 560, 'marquee-1400x560.png')):
            f = os.path.join(work, f'{lang}-{name}.html')
            open(f, 'w').write(tile_html(lang, w, h))
            shot(served(f), os.path.join(dst, name), w, h)
    # store icon: 96x96 artwork centred on a 128x128 transparent canvas.
    # Rendered at 4x (384 in 512) and reduced with sips: headless Chrome does
    # not honour very small window sizes.
    f = os.path.join(work, 'icon.html')
    open(f, 'w').write('<!doctype html><style>html,body{margin:0;background:transparent}</style>'
                       '<img src="/assets/icon-source/icon-ios.svg" style="position:absolute;left:64px;top:64px;width:384px;height:384px;border-radius:88px">')
    big = os.path.join(work, 'icon-512.png')
    shot(served(f), big, 512, 512)
    subprocess.run(['sips', '-z', '128', '128', big, '--out', os.path.join(OUT, 'store-icon-128x128.png')], check=True, capture_output=True)
    shutil.rmtree(work, ignore_errors=True)
    print('done:', OUT)

if __name__ == '__main__':
    main()
