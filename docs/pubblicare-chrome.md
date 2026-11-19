# Pubblicare Auscultrix sul Chrome Web Store

Guida operativa in italiano. Il pacchetto Chrome corrisponde all'albero
sorgente così com'è (Manifest V3, service worker `background.js`).

## 1. Prerequisiti

- Account sviluppatore Chrome Web Store (costo una tantum ~5 $, carta richiesta).
- Il pacchetto zip generato dallo script (vedi punto 2). **Non** zippare a mano
  la cartella: dentro lo zip deve esserci `manifest.json` alla radice,
  non una sottocartella.
- 1–2 screenshot (1280×800 o 640×400) e un'icona 128 px (già in `icons/`).
- Testo per la scheda (nome, descrizione breve ≤132 caratteri, descrizione
  estesa): i testi pronti sono in `docs/store-listing.md`.

## 2. Creare il pacchetto

Nella cartella dell'estensione, su qualsiasi sistema con Node 22 o successivo:

```sh
node packaging/build.mjs chrome
```

Produce:

- `packaging/dist-chrome/` — contenuto verificato (JSON valido, sintassi JS ok).
- `packaging/auscultrix-<versione>-chrome.zip` — il file da caricare.

La build esegue prima i test di unità e si ferma se uno fallisce. Esclude
`packaging/`, `docs/`, `tests/`, `tools/`, `archive/`, `.git` e i file di
sistema, e si rifiuta di impacchettare se trova una credenziale Spotify
compilata (`config/spotify.creator.local.js` deve avere segreto e refresh
token vuoti). Su Windows c'è anche `packaging/build-chrome.ps1`, con le stesse
regole ma non provato nella revisione 5.1.

Prima di ogni release aumenta `"version"` in `manifest.json`
(formato `MAJOR.MINOR.PATCH`) e aggiungi la voce in `CHANGELOG.md`: il Web Store
rifiuta versioni già usate e un test controlla che le due coincidano.

## 3. Permessi dichiarati — come giustificarli nella scheda

Nella sezione «Privacy» dichiara **nessuna raccolta di dati da parte dello
sviluppatore**: il testo e la foto vengono elaborati solo sul dispositivo e non
vengono salvati né trasmessi; energia, valenza, playlist e preferenze restano in
`chrome.storage.local`; nessuna analytics, nessun server. Testo completo:
`docs/privacy-policy.md`.

| Permesso | Uso reale (per i revisori) |
|---|---|
| `storage` | Preferenze, playlist, storico locale delle sessioni (senza testo), stato della sessione in memoria |
| `sidePanel` | Aprire il pannello laterale dal clic sulla barra degli strumenti |
| `scripting` | Iniettare su YouTube il rilevatore di fine brano e l'overlay della Visione, solo nella scheda aperta dall'estensione |
| `tabCapture`, `offscreen` | Analisi audio **locale** della scheda del player (AnalyserNode) per la Visione reattiva; l'audio non lascia il dispositivo |
| `alarms` | Aggiornamento periodico del profilo pubblico del curatore e del catalogo Emergente |
| `www.youtube.com`, `youtube.com`, `m.youtube.com`, `music.youtube.com` | Riproduzione e avanzamento dei brani |
| `i.ytimg.com` | Miniature dei video, usate come copertine e per i colori della Visione |
| `open.spotify.com` | Lettura delle pagine pubbliche del profilo del curatore (senza cookie) |
| `lrclib.net` | Testi delle canzoni, solo se la persona attiva la funzione |
| `bandcamp.com`, `*.bandcamp.com` | Aggiornamento del catalogo Emergente da pagine pubbliche |

Il permesso `tabs` non serve più dalla 5.1: l'estensione usa solo gli id delle
schede che apre lei.

Scopo unico: «Proporre musica, libri, film e paesaggi calmi a partire da come
la persona dice di sentirsi, con il calcolo sul dispositivo. Non è un
dispositivo medico.»

## 4. Caricamento

1. Apri la [Developer Dashboard](https://chrome.google.com/webstore/devconsole).
2. «Nuovo elemento» → carica `packaging/auscultrix-<versione>-chrome.zip`.
3. Compila scheda store (descrizione, categoria: *Lifestyle* o *Musica*,
   lingua: italiano + inglese), screenshot, icona.
4. Privacy: «nessun dato raccolto dallo sviluppatore» + giustificazioni dei permessi (tabella sopra). Niente affermazioni sulla salute nella scheda (vedi `docs/rapporti/regolatorio.md`).
5. Distribuzione: visibilità Pubblica; mercati: tutti (o seleziona IT + EN).
6. Invia per la revisione (di solito 1–3 giorni lavorativi).

## 5. Motivi frequenti di rifiuto (e come siamo già a posto)

- **Codice offuscato/minificato senza sorgenti**: il codice è leggibile,
  non minificato, senza bundler. ✅
- **Codice remoto** (`eval`, script da CDN, `innerHTML` con dati remoti):
  assenti — verificato via grep (`eval\(`, `new Function`, `innerHTML`
  non compaiono nel codice). ✅
- **Permessi eccessivi**: ognuno è usato (tabella sopra). ✅
- **Crypto miner / analytics nascoste**: assenti. ✅

## 6. Aggiornamenti

Aumenta la versione, rigenera lo zip, caricalo sulla stessa scheda
(«Pacchetto» → upload). Gli utenti ricevono l'update in automatico.
Non cambiare mai `name` né la struttura delle chiavi `storage` senza
migrazione (il pannello migra già `vjEnabled` e zona geo).
