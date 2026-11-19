# Documentazione di Auscultrix 6.0.1

## I consegnabili della revisione

| # | Consegnabile | Dove |
|---|---|---|
| 1–2 | Estensione migliorata e sorgenti aggiornati | la cartella del progetto (versione 5.1.1, `CHANGELOG.md`) |
| 3 | Versione caricabile in Chrome | `packaging/dist-chrome/` e `packaging/auscultrix-5.1.1-chrome.zip` (istruzioni nel `README.md`) |
| 4 | Suite di test funzionante | `tests/` · si esegue con `node tests/run-all.mjs` |
| 5 | Documentazione tecnica | [`tecnico/descrizione-tecnica.md`](tecnico/descrizione-tecnica.md) · [`tecnico/tracciabilita.md`](tecnico/tracciabilita.md) (requisiti ↔ test, generata) |
| 6 | Documentazione scientifica | [`scientifico/paesaggio-sonoro.md`](scientifico/paesaggio-sonoro.md) (6.0) · [`scientifico/media-sicurezza-clinica.md`](scientifico/media-sicurezza-clinica.md) (6.0.1) · [`scientifico/fondamenti-e-algoritmi.md`](scientifico/fondamenti-e-algoritmi.md) · [`scientifico/validazione-esterna.md`](scientifico/validazione-esterna.md) · [`scientifico/bibliografia.md`](scientifico/bibliografia.md) |
| 7 | Rapporto dei test | [`verifica/rapporto-test.md`](verifica/rapporto-test.md) (generato dall'ultima esecuzione; dati in `rapporto-test.json`, `misure-e2e.json`, `validazione-esterna.json`) · misure acustiche del paesaggio: `verifica/misure-paesaggio.json` · statistiche interne: `verifica/valutazione-interna.json` · validazione italiana: `verifica/validazione-esterna-italiano.json` |
| 8 | Rapporto delle criticità | [`rapporti/criticita.md`](rapporti/criticita.md) · [`rapporti/analisi-dei-rischi.md`](rapporti/analisi-dei-rischi.md) |
| 9 | Piano di validazione scientifica | [`scientifico/piano-di-validazione.md`](scientifico/piano-di-validazione.md) |
| 10 | Attività per un'eventuale approvazione regolatoria | [`rapporti/regolatorio.md`](rapporti/regolatorio.md), §8 |
| 11 | Confronto tra versione originale e migliorata | [`rapporti/confronto-versioni.md`](rapporti/confronto-versioni.md) |

## Altri documenti

| Documento | A che cosa serve |
|---|---|
| [`privacy-policy.md`](privacy-policy.md) | Informativa per gli store e per chi usa l'estensione (IT/EN), aggiornata ai flussi reali della 5.1 |
| [`store-listing.md`](store-listing.md) | Testi per le schede degli store, coerenti con l'uso dichiarato |
| [`pubblicare-chrome.md`](pubblicare-chrome.md) · [`pubblicare-firefox.md`](pubblicare-firefox.md) · [`pubblicare-apple.md`](pubblicare-apple.md) | Procedure di pubblicazione; per Apple, la verifica linea guida per linea guida e la build Xcode |

## Come leggere i livelli di evidenza

Ogni affermazione sulle prestazioni del prodotto in questi documenti è in una di quattro categorie:

1. **Funziona tecnicamente** — verificato da un test eseguito, con il risultato nel rapporto.
2. **Scientificamente plausibile** — coerente con la letteratura citata, ma non misurato su questo prodotto.
3. **Validato sperimentalmente** — misurato su dati annotati da persone, con intervalli di confidenza (oggi: solo la valenza del testo, su corpora inglesi).
4. **Validato clinicamente** — nessuna componente lo è.

Auscultrix non è certificato, approvato o dichiarato conforme ad alcuna norma.
