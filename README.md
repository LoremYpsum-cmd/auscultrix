# Auscultrix — ascolto, paesaggio sonoro generativo e media che confortano

**Versione 6.0.0** · Estensione Manifest V3 per Chrome, con varianti derivate per Firefox e Safari (macOS/iOS).
Sito e documentazione: **https://loremypsum-cmd.github.io/auscultrix/** · Tesi (PDF bilingue): [`docs/tesi_Caccamo_Rosario_Orazio_v6.pdf`](docs/tesi_Caccamo_Rosario_Orazio_v6.pdf)

*Listening, generative soundscape and comforting media: a browser extension that computes on the device. Italian and English.*

Auscultrix chiede alla persona come sta e le propone musica su YouTube, un **paesaggio sonoro generato sul momento** e media che confortano (libri, film, serie, podcast, giochi calmi). La proposta segue il principio ISO: parte dallo stato dichiarato e si sposta gradualmente verso uno stato più sereno. Tutto il calcolo avviene sul dispositivo: niente server, niente account, niente telemetria; il testo scritto non viene mai salvato.

Auscultrix **non è un dispositivo medico**: non diagnostica, non monitora e non tratta alcuna condizione, e non sostituisce l'aiuto di un professionista.

## Che cosa c'è nella 6.0

- **Paesaggio sonoro generativo** (Web Audio, offline): bordone additivo, tessiture procedurali di vento, mare e pioggia, segnali stocastici collocati nello spazio (Poisson + Markov, HRTF, legge della distanza inversa), riverbero per convoluzione con RT60 dichiarato. Mappatura affetto → suono documentata parametro per parametro. Esportazione in WAV, partitura JSON e **patch Pure Data**.
- **Verifica acustica sull'uscita**: loudness ITU-R BS.1770-4, onset (F = 0,92), centroide spettrale (ρ = 0,98), riproducibilità con seme. Dati: [`docs/verifica/misure-paesaggio.json`](docs/verifica/misure-paesaggio.json).
- **Validazione del motore di lettura dell'umore** su 24.703 frasi inglesi e 3.065 commenti italiani annotati da persone, con intervalli di confidenza, test di McNemar, bootstrap e baseline.
- **Mappa del diario** sul piano valenza–arousal, accessibile, senza linee di tendenza.
- **Safari / App Store**: variante Safari, progetto Xcode generato, Privacy Manifest, icone secondo le Human Interface Guidelines ([`docs/pubblicare-apple.md`](docs/pubblicare-apple.md)).

## Provare

```sh
node tools/preview/server.mjs        # anteprima del pannello senza installare: http://localhost:5178/preview/sidepanel.html
```

Chrome (≥ 116): `chrome://extensions` → Modalità sviluppatore → *Carica estensione non pacchettizzata* → questa cartella (o `packaging/dist-chrome` dopo la build). Firefox (≥ 142): `about:debugging` → *Carica componente aggiuntivo temporaneo* → `packaging/dist-firefox/manifest.json`. Safari (≥ 17): vedi [`docs/pubblicare-apple.md`](docs/pubblicare-apple.md).

## Test e build

```sh
node --test tests/unit/*.test.mjs   # 91 test di unità (Node 22+)
node tests/run-all.mjs              # tutte le suite; scrive docs/verifica/rapporto-test.md e la tracciabilità
node tests/stats/internal-eval.mjs  # statistiche sui set interni
node packaging/build.mjs            # pacchetti Chrome, Firefox, Safari (i test sono un cancello)
sh packaging/apple/make-xcode-project.sh && python3 packaging/apple/finish-xcode-project.py   # progetto Xcode
```

Validazione esterna (i dati non sono inclusi per licenza): `AUSCULTRIX_EXTERNAL_DATA=<cartella> node tests/run-all.mjs`, istruzioni in [`docs/scientifico/validazione-esterna.md`](docs/scientifico/validazione-esterna.md).

## Struttura

| Percorso | Contenuto |
|---|---|
| `background.js` | service worker: sessione, scheda del player, avanzamento |
| `sidepanel.html/.js`, `design-5.css` | il pannello (diario) |
| `content/` | script su YouTube: fine brano, Visione |
| `lib/` | moduli puri: lettura dell'umore, sicurezza, playlist ISO, paesaggio sonoro, misure audio, privacy |
| `tests/` | unità, end-to-end, banco acustico, statistiche, validazione esterna |
| `tools/` | anteprima locale, screening dei lampeggiamenti |
| `packaging/` | build Chrome/Firefox/Safari e progetto Xcode |
| `docs/` | documentazione (indice in [`docs/INDICE.md`](docs/INDICE.md)) e tesi |

Il repository pubblica solo la versione corrente; le versioni precedenti non sono incluse.

## Credenziali

`config/spotify.creator.local.js` resta con segreto e refresh token **vuoti**: la build si rifiuta di impacchettare se li trova compilati.

## Tesi

Tesi di Diploma Accademico di Secondo Livello, DASL08 Arti e Tecnologie Digitali, Accademia di Belle Arti di Catania. Candidato: Rosario Orazio Caccamo. Relatore: Prof. Lorenzo Di Silvestro. Correlatore: Prof. Stefano Zorzanello. Edizione 6.0 bilingue a fronte: [PDF](docs/tesi_Caccamo_Rosario_Orazio_v6.pdf) · [HTML](https://loremypsum-cmd.github.io/auscultrix/tesi-6/book.html) · sorgenti in [`docs/tesi-6/`](docs/tesi-6/README.md).

Per citare il lavoro usa il pulsante *Cite this repository* (file [`CITATION.cff`](CITATION.cff)).

## Licenza

Codice: MIT ([`LICENSE`](LICENSE)). I cataloghi e i corpora di terze parti mantengono le loro licenze; i dati di validazione esterna non sono ridistribuiti.
