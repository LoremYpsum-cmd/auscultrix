# Tesi — edizione 6.0 (bilingue a fronte)

Riscritta per intero per Auscultrix 6.0.0. Ogni paragrafo è in italiano con il corrispettivo inglese a fianco.

```sh
python3 make_figures.py      # figure SVG dai dati (../verifica/misure-paesaggio.json) e dalle formule
python3 render.py --pdf      # book.html e ../tesi_Caccamo_Rosario_Orazio_v6.pdf (Chromium headless; indice con pagine via PDFKit su macOS)
```

- Testo: `src/*.md`, letti in ordine di nome. Sintassi in testa a `render.py` (`IT:`/`EN:` per i paragrafi, `TABLE:`, `EQ:`, `FIG:`, `BIB:`).
- Copertina: `meta.txt` (il titolo è una proposta da concordare con il relatore).
- Bibliografia: generata da `../scientifico/bibliografia.md`, solo le opere citate nel testo.
- Schermate del pannello in `fig/`: `node tools/preview/server.mjs`, poi `/preview/sidepanel.html?demo=1` (sessioni dimostrative, non dati reali).
