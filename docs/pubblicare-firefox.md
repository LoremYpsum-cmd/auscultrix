# Pubblicare Auscultrix su Firefox (addons.mozilla.org)

Guida operativa in italiano. Firefox non supporta `background.service_worker`,
`chrome.sidePanel`, `chrome.tabCapture` né `chrome.offscreen`: la build
Firefox deriva automaticamente dai sorgenti Chrome con queste sostituzioni.

## 1. Cosa cambia nella build Firefox

| Chrome | Firefox (generato) |
|---|---|
| `background.service_worker` | `background.scripts: [background-firefox-loader.js]` — il loader carica `background.js` come modulo ES (stesso codice, stessi import) |
| Permessi `sidePanel`, `tabCapture`, `offscreen` | Rimossi (API non esistenti su Firefox) |
| Chiave `side_panel` | `sidebar_action` (`sidepanel.html` come pannello) + comando `_execute_sidebar_action` |
| Click toolbar → apre side panel | Click toolbar → apre la sidebar (via `sidebarAction`) |
| `lib/panel-open.js` | Stub `packaging/firefox/stubs/panel-open.js` (stessa interfaccia) |
| `lib/tab-audio-capture.js` | Stub no-op (stessa interfaccia) |
| `offscreen.html`, `offscreen-audio.js` | Esclusi dal pacchetto |
| + `browser_specific_settings.gecko` | `id: auscultrix@loremYpsum-cmd.github.io`, `strict_min_version: 142.0`, `data_collection_permissions: { required: ["none"] }` |
| `minimum_chrome_version` | Rimosso (chiave solo Chrome) |

**Differenze funzionali su Firefox (da dichiarare e testare):**

- La **Visione** funziona in modalità calma non reattiva: niente cattura
  audio della scheda (API assente), quindi paesaggi lenti a 3 fps guidati
  dall'avanzamento del brano, senza livelli bass/mid/treble live.
- Autoplay YouTube più rigido: Firefox blocca l'autoplay non mutato; il
  bridge apre con `mute=1`, avvia in muto e poi smuta con retry (già gestito).
- La sidebar di Firefox si apre dal menu laterale, dal click toolbar o con
  scorciatoia personalizzabile (`_execute_sidebar_action`).

⚠️ **Non cambiare mai il `gecko.id`** dopo la prima pubblicazione: gli
aggiornamenti smetterebbero di applicarsi alle installazioni esistenti.

## 2. Creare il pacchetto

Nella cartella dell'estensione, con Node 22 o successivo:

```sh
node packaging/build.mjs firefox
```

Produce `packaging/dist-firefox/` + `packaging/auscultrix-<versione>-firefox.zip`.
La build esegue prima i test di unità, **fallisce** se nel pacchetto restano
riferimenti ad API solo Chrome o una credenziale compilata, e valida JSON e
sintassi JS. La versione è letta da `manifest.json`: aumenta `"version"` lì
prima della release (lo stesso bump vale per Chrome e Firefox). Su Windows c'è
anche `packaging/build-firefox.ps1`, non provato nella revisione 5.1.

## 3. Lint locale (consigliato prima dell'upload)

```sh
npx web-ext lint --source-dir packaging/dist-firefox
```

**Nella revisione 5.1 il lint non è stato eseguito** (registro npm non
raggiungibile): va fatto prima dell'invio. Attesi: zero errori. Possono comparire avvisi su `browser_specific_settings`
o icone — accettabili. Se `web-ext lint` segnala `background.scripts`
deprecato o simili, leggi il messaggio: con MV3 + `scripts` è il percorso
supportato da Firefox (niente `service_worker`).

Test manuale rapido in Firefox (cartella, non zip):

1. `about:debugging` → «Questo Firefox» → «Carica componente aggiuntivo
   temporaneo» → seleziona `packaging/dist-firefox/manifest.json`.
2. Apri la sidebar dal menu / click toolbar: il pannello si carica in IT/EN.
3. Scrivi un umore → Inizia → si apre la scheda YouTube e parte il brano.
4. Tasto Avanti, Stop; chiudi la scheda player (nessun errore in console).
5. Attiva Visione: overlay calmo, nessun errore su cattura audio.
6. Una ricerca manuale su YouTube **non** deve auto-aprire alcun video.
7. `about:addons` → pagina Opzioni si apre.
8. Console del background (`about:debugging` → Ispeziona): nessun errore rosso.

## 4. Invio su AMO

1. Account su [addons.mozilla.org](https://addons.mozilla.org) (gratuito).
2. «Invia un nuovo componente aggiuntivo» → carica
   `packaging/auscultrix-<versione>-firefox.zip`.
3. Licenza: scegli (es. MPL-2.0 o Tutti i diritti riservati — decidi tu).
4. Note di versione: 2–3 righe su cosa cambia.
5. **Note per i revisori** (incolla, adattando la versione):

> MV3, codice sorgente leggibile non minificato, nessuna libreria
> impacchettata, nessun codice remoto (niente eval / script CDN /
> innerHTML). Nessun dato viene raccolto dallo sviluppatore: il testo e la
> foto sono elaborati solo sul dispositivo e non vengono salvati; energia,
> valenza, playlist e preferenze restano in storage.local. Permessi:
> storage (stato locale), scripting (rilevatore di fine brano e overlay
> solo sulla scheda YouTube aperta dall'estensione), alarms (aggiornamento
> del profilo pubblico del curatore e del catalogo). Host: YouTube e
> i.ytimg.com (riproduzione, miniature), open.spotify.com (pagine
> pubbliche del curatore, senza cookie), lrclib.net (testi, solo su
> consenso), bandcamp.com (catalogo Emergente). Differenze dalla versione
> Chrome: niente tabCapture/offscreen/sidePanel (API assenti su Firefox),
> sostituiti da stub interni con la stessa interfaccia; la Visione non
> reagisce all'audio. Build riproducibile con `node packaging/build.mjs
> firefox` dai sorgenti allegati.

6. Distribuzione: «Su questo sito» (listed, aggiornamenti automatici) oppure
   «Personale» (unlisted: AMO firma e ti dà il file da distribuire tu).
7. Revisione: da qualche giorno a 1–2 settimane per le nuove schede.

## 5. Firma per self-distribuzione / test (`web-ext sign`)

Serve una coppia di chiavi API da
[AMO → Strumenti → Gestione chiavi API](https://addons.mozilla.org/en-US/developers/addon/api/key/):

```sh
npx web-ext sign --source-dir packaging/dist-firefox --channel unlisted \
  --api-key "..." --api-secret "..."
```

Le chiavi API non vanno mai salvate nel repository.

## 6. Aggiornamenti

Stesso `gecko.id`, versione maggiore della precedente, ricarica lo zip
rigenerato. Gli utenti listed aggiornano in automatico. Se cambi
`strict_min_version`, fallo solo per reali necessità API.
