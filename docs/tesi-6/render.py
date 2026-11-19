#!/usr/bin/env python3
"""
Auscultrix — tesi, edizione 6.0 (bilingue a fronte).

  python3 render.py            → book.html
  python3 render.py --pdf      → book.html + ../tesi_Caccamo_Rosario_Orazio_v6.pdf (Chromium headless)

Source: src/*.md, read in name order. Block syntax (one block per paragraph):
  # N | Titolo | Title            chapter (N may be A, B… for appendices; '-' unnumbered)
  ## N.N | Titolo | Title         section
  ### Titolo | Title              subsection
  IT: testo…                      Italian paragraph (continues until a blank line)
  EN: text…                       English paragraph, paired with the previous IT:
  TABLE: didascalia | caption     markdown table follows (full width)
  EQ: formula | (n)               display formula (full width)
  FIG: fig/file.svg | didascalia | caption
  NOTE: text                      full-width boxed note (bilingual inside)
Inline: **bold**, *italic*, `code`, lines starting with "- " become lists.
"""
import glob, html, json, os, re, shutil, subprocess, sys

HERE = os.path.dirname(os.path.abspath(__file__))
OUT_PDF = os.path.join(HERE, '..', 'tesi_Caccamo_Rosario_Orazio_v6.pdf')

def inline(s):
    s = html.escape(s, quote=False)
    s = re.sub(r'`([^`]+)`', r'<code>\1</code>', s)
    s = re.sub(r'\*\*([^*]+)\*\*', r'<strong>\1</strong>', s)
    s = re.sub(r'(?<![\w*])\*([^*\n]+)\*(?![\w*])', r'<i>\1</i>', s)
    s = s.replace(' -- ', ' – ')
    return s

def para(text):
    lines = text.split('\n')
    out, items, buf = [], [], []
    def flush_buf():
        if buf:
            out.append('<p>' + inline(' '.join(buf)) + '</p>')
            buf.clear()
    def flush_items():
        if items:
            out.append('<ul class="bullets">' + ''.join(f'<li>{inline(i)}</li>' for i in items) + '</ul>')
            items.clear()
    for ln in lines:
        if ln.startswith('- '):
            flush_buf(); items.append(ln[2:])
        elif items and ln.startswith('  '):
            items[-1] += ' ' + ln.strip()
        else:
            flush_items(); buf.append(ln.strip())
    flush_buf(); flush_items()
    return ''.join(out)

def table(lines, cap_it, cap_en):
    rows = [l.strip().strip('|').split('|') for l in lines if l.strip().startswith('|')]
    rows = [[c.strip() for c in r] for r in rows if not re.match(r'^\s*:?-{2,}', r[0])]
    head, body = rows[0], rows[1:]
    h = '<tr>' + ''.join(f'<th>{inline(c)}</th>' for c in head) + '</tr>'
    b = ''.join('<tr>' + ''.join(f'<td>{inline(c)}</td>' for c in r) + '</tr>' for r in body)
    cap = f'<caption><span lang="it">{inline(cap_it)}</span><span lang="en">{inline(cap_en)}</span></caption>' if cap_it else ''
    return f'<table class="data">{cap}<thead>{h}</thead><tbody>{b}</tbody></table>'

def cited_text():
    return ' '.join(open(f, encoding='utf8').read() for f in glob.glob(os.path.join(HERE, 'src', '*.md')) if not f.endswith('99-bibliografia.md'))

def bibliography(path):
    """Entries of docs/scientifico/bibliografia.md whose first author (or body) is cited in the text."""
    text = cited_text()
    skip_sections = ('Numeri di aiuto',)
    out, section, items = [], None, []
    def flush():
        if section and items:
            out.append(f'<h3>{inline(section)}</h3><ul class="biblio">' + ''.join(f'<li>{x}</li>' for x in sorted(items, key=lambda h: re.sub('<[^>]+>', '', h).lower())) + '</ul>')
    for ln in open(path, encoding='utf8').read().split('\n'):
        if ln.startswith('## '):
            flush(); items = []
            section = ln[3:].strip()
            section = None if section.startswith(skip_sections) else re.sub(r'\s*\(6\.0\)', '', section)
            continue
        if section and ln.startswith('- '):
            e = ln[2:]
            e = re.sub(r'\s+—\s+(✓|libro|rapporto|norma|fonte).*$', '', e)
            e = re.sub(r'\s*\*\*\[[^\]]*\]\*\*', '', e).replace('**', '')
            key = re.split(r'[,(]', e)[0].strip()
            if 'non citato' in ln or (key not in text and key.split(' ')[0] not in text):
                continue
            items.append(inline(e))
    flush()
    return ''.join(out)

def parse():
    blocks = []
    for f in sorted(glob.glob(os.path.join(HERE, 'src', '*.md'))):
        lines = open(f, encoding='utf8').read().split('\n')
        i = 0
        while i < len(lines):
            ln = lines[i]
            if not ln.strip() or ln.startswith('<!--'):
                i += 1; continue
            m = re.match(r'^(#{1,3}) (.*)$', ln)
            if m:
                parts = [p.strip() for p in m.group(2).split('|')]
                blocks.append(('h%d' % len(m.group(1)), parts)); i += 1; continue
            if ln.startswith(('IT:', 'EN:', 'NOTE:')):
                tag, _, rest = ln.partition(':')
                buf = [rest.strip()]
                i += 1
                while i < len(lines) and lines[i].strip() and not re.match(r'^(IT|EN|NOTE|TABLE|EQ|FIG):|^#', lines[i]):
                    buf.append(lines[i]); i += 1
                blocks.append((tag, '\n'.join(buf))); continue
            if ln.startswith('TABLE:'):
                caps = [c.strip() for c in ln[6:].split('|')] + ['', '']
                i += 1; tl = []
                while i < len(lines) and lines[i].strip().startswith('|'):
                    tl.append(lines[i]); i += 1
                blocks.append(('TABLE', (tl, caps[0], caps[1]))); continue
            if ln.startswith('EQ:'):
                parts = [p.strip() for p in ln[3:].split(' || ')]
                blocks.append(('EQ', parts)); i += 1; continue
            if ln.startswith('BIB:'):
                blocks.append(('BIB', ln[4:].strip())); i += 1; continue
            if ln.startswith('FIG:'):
                parts = [p.strip() for p in ln[4:].split('|')]
                blocks.append(('FIG', parts)); i += 1; continue
            sys.exit(f'{f}:{i+1}: cannot parse: {ln[:80]}')
    return blocks

def build():
    blocks = parse()
    out, toc = [], []
    meta = dict(re.findall(r'^(\w+): (.*)$', open(os.path.join(HERE, 'meta.txt'), encoding='utf8').read(), re.M))
    out.append(f'''<section class="cover">
  <div class="cover-margin"></div>
  <img class="cover-logo" src="logo-ink.png" alt="Accademia di Belle Arti di Catania">
  <div class="cover-main">
    <p class="cover-kicker">Tesi di Diploma Accademico di Secondo Livello · Second-level Academic Diploma thesis</p>
    <h1 class="cover-title">Auscultrix</h1>
    <p class="cover-sub">{inline(meta["title_it"])}</p>
    <p class="cover-sub en">{inline(meta["title_en"])}</p>
  </div>
  <dl class="cover-meta">
    <div><dt>Corso · Programme</dt><dd>{inline(meta["course"])}</dd></div>
    <div><dt>Candidato · Candidate</dt><dd>{inline(meta["candidate"])}</dd></div>
    <div><dt>Relatore · Supervisor</dt><dd>{inline(meta["supervisor"])}</dd></div>
    <div><dt>Correlatore · Co-supervisor</dt><dd>{inline(meta["cosupervisor"])}</dd></div>
  </dl>
  <p class="cover-year">{inline(meta["year"])}</p>
</section>''')
    toc_at = len(out); out.append('')
    in_ch = False
    pending_it = None
    chap_kind = ''
    def close_pending():
        nonlocal pending_it
        if pending_it is not None:
            out.append(f'<div class="pair"><div class="col" lang="it">{para(pending_it)}</div><div class="col" lang="en"></div></div>')
            pending_it = None
    for kind, val in blocks:
        if kind == 'EN':
            if pending_it is None:
                sys.exit('EN without IT: ' + val[:60])
            out.append(f'<div class="pair"><div class="col" lang="it">{para(pending_it)}</div><div class="col" lang="en">{para(val)}</div></div>')
            pending_it = None; continue
        close_pending()
        if kind == 'IT':
            pending_it = val
        elif kind == 'h1':
            num, it, en = (val + ['', '', ''])[:3]
            if in_ch: out.append('</section>')
            in_ch = True
            cid = 'ch-' + re.sub(r'\W', '', num or it)[:12]
            app = num.isalpha() and len(num) == 1
            unnum = num in ('-', '')
            cls = 'chapter' + (' front' if unnum else '') + (' appendix' if app else '')
            label = '' if unnum else ('Appendice · Appendix' if app else 'Capitolo · Chapter')
            if not unnum: toc.append((cid, num, it, en, app))
            out.append(f'<section class="{cls}" id="{cid}">')
            if unnum:
                out.append(f'<h1 class="front-title">{inline(it)}<span class="en">{inline(en)}</span></h1>')
            else:
                out.append(f'<header class="chapter-head"><span class="pdfmark">{"AUSCMARKAPP" if app else "AUSCMARKCH"}</span><p class="chapter-kind">{label}</p><p class="chapter-num">{html.escape(num)}</p>'
                           f'<h1 class="chapter-title">{inline(it)}</h1><p class="chapter-title-en">{inline(en)}</p></header>')
        elif kind == 'h2':
            num, it, en = (val + ['', '', ''])[:3]
            out.append(f'<h2 data-n="{html.escape(num)}">{inline(it)}<span class="en">{inline(en)}</span></h2>')
        elif kind == 'h3':
            it, en = (val + ['', ''])[:2]
            out.append(f'<h3>{inline(it)}<span class="en">{inline(en)}</span></h3>')
        elif kind == 'TABLE':
            out.append(table(*val))
        elif kind == 'EQ':
            f, n = (val + [''])[:2]
            out.append(f'<div class="eq"><span class="f">{f}</span><span class="n">{html.escape(n)}</span></div>')
        elif kind == 'FIG':
            src, it, en = (val + ['', '', ''])[:3]
            out.append(f'<figure class="fig"><img src="{src}" alt="{html.escape(it)}"><figcaption><span lang="it">{inline(it)}</span><span lang="en">{inline(en)}</span></figcaption></figure>')
        elif kind == 'BIB':
            out.append(bibliography(os.path.join(HERE, val)))
        elif kind == 'NOTE':
            out.append(f'<aside class="note">{para(val)}</aside>')
    close_pending()
    if in_ch: out.append('</section>')
    pages = json.load(open(os.path.join(HERE, 'toc_pages.json'))) if os.path.exists(os.path.join(HERE, 'toc_pages.json')) else {}
    chp, app = list(pages.get('chapters', [])), list(pages.get('appendices', []))
    def pg(is_app):
        lst = app if is_app else chp
        return str(lst.pop(0)) if lst else ''
    items = ''.join(f'<li class="{"app" if a else ""}"><a href="#{c}"><span class="n">{html.escape(n)}</span><span class="t">{inline(it)}<span class="en">{inline(en)}</span></span><span class="pg">{pg(a)}</span></a></li>' for c, n, it, en, a in toc)
    out[toc_at] = f'<section class="toc"><h1 class="front-title">Indice<span class="en">Contents</span></h1><ol>{items}</ol></section>'
    page = f'''<!doctype html><html lang="it"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Auscultrix — {html.escape(meta["title_it"])} (tesi DASL08, edizione 6.0)</title>
<meta name="description" content="{html.escape(meta["title_en"])}. Tesi bilingue (italiano/inglese), Accademia di Belle Arti di Catania, DASL08.">
<meta name="author" content="{html.escape(meta["candidate"])}">
<meta name="citation_title" content="Auscultrix. {html.escape(meta["title_it"])}">
<meta name="citation_author" content="Caccamo, Rosario Orazio">
<meta name="citation_publication_date" content="2026">
<meta name="citation_dissertation_institution" content="Accademia di Belle Arti di Catania">
<meta name="citation_pdf_url" content="https://loremypsum-cmd.github.io/auscultrix/tesi_Caccamo_Rosario_Orazio_v6.pdf">
<link rel="canonical" href="https://loremypsum-cmd.github.io/auscultrix/tesi-6/book.html">
<link rel="stylesheet" href="book.css"></head><body>{''.join(out)}</body></html>'''
    open(os.path.join(HERE, 'book.html'), 'w', encoding='utf8').write(page)
    print('book.html:', len(page) // 1024, 'KB,', len(toc), 'chapters')

def chromium():
    cands = glob.glob(os.path.expanduser('~/Library/Caches/ms-playwright/chromium-*/chrome-mac*/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'))
    cands += ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', shutil.which('chromium') or '', shutil.which('google-chrome') or '']
    for c in cands:
        if c and os.path.exists(c): return c
    sys.exit('no Chromium found')

def pdf():
    tmp = os.path.join(HERE, '.chrome-profile')
    subprocess.run([chromium(), '--headless=new', '--disable-gpu', f'--user-data-dir={tmp}', '--no-pdf-header-footer',
                    '--virtual-time-budget=8000', '--generate-pdf-document-outline', f'--print-to-pdf={OUT_PDF}', 'file://' + os.path.join(HERE, 'book.html')],
                   check=True, capture_output=True)
    shutil.rmtree(tmp, ignore_errors=True)
    print('pdf:', os.path.relpath(OUT_PDF, HERE), os.path.getsize(OUT_PDF) // 1024, 'KB')

def toc_pass():
    """Read chapter pages back from the PDF; re-render if they changed (macOS only)."""
    if not shutil.which('swiftc'):
        return False
    exe = os.path.join(HERE, '.build', 'tocpages')
    src = os.path.join(HERE, 'tocpages.swift')
    if not os.path.exists(exe) or os.path.getmtime(exe) < os.path.getmtime(src):
        os.makedirs(os.path.dirname(exe), exist_ok=True)
        subprocess.run(['swiftc', '-O', '-o', exe, src], check=True, capture_output=True)
    r = subprocess.run([exe, OUT_PDF], capture_output=True, text=True, timeout=120)
    if r.returncode != 0:
        print('toc pages: skipped', r.stderr[-200:]); return False
    new = json.loads(r.stdout)
    path = os.path.join(HERE, 'toc_pages.json')
    old = json.load(open(path)) if os.path.exists(path) else None
    json.dump(new, open(path, 'w'))
    return new != old

if __name__ == '__main__':
    build()
    if '--pdf' in sys.argv:
        pdf()
        for _ in range(2):
            if not toc_pass():
                break
            build(); pdf()
