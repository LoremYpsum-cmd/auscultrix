# Descrizione tecnica — Auscultrix 6.0.0

## 1. Che cos'è e a che cosa serve

Auscultrix è un'estensione per browser (Manifest V3) che accompagna il benessere emotivo quotidiano. La persona scrive come sta, oppure sceglie un'etichetta, sposta un cursore di energia o carica una foto. L'estensione propone musica, riprodotta su YouTube, e media che confortano (libri, film, serie, podcast, giochi calmi), ordinati secondo il principio ISO: si parte dallo stato dichiarato e ci si sposta gradualmente verso uno stato più sereno.

**Destinazione d'uso dichiarata (5.1).** Strumento di benessere per adulti e famiglie, non medico. Non diagnostica, non monitora disturbi, non misura esiti e non sostituisce cure. Le parole di crisi attivano soltanto un rinvio a servizi di aiuto. L'analisi regolatoria è in `docs/rapporti/regolatorio.md`.

**Piattaforme.**
- Chrome ≥ 116 (piattaforma primaria).
- Firefox ≥ 142, con una variante derivata automaticamente.
- Safari ≥ 17 (macOS 13+, iOS 17+), con una variante derivata e un progetto Xcode (`docs/pubblicare-apple.md`).

## 2. Architettura

```
┌──────────────────────── Pannello laterale (sidepanel.html/.js) ────────────────────────┐
│ diario → lib/mood.js (affetto) → lib/safety.js (aiuto) → lib/playlist.js (ISO)         │
│ media di cura (bibliotherapy, cinematherapy, care-media, videogames)                   │
│ «Le tue cose»: lib/user-model.js · lib/data-inventory.js                               │
└───────────────┬──────────────────────────────────────────────────────▲────────────────┘
       chrome.runtime.sendMessage                              PLAYLIST_ADVANCED / FINISHED
                │                                                       │ PLAYER_TAB_CLOSED
┌───────────────▼───────────── Service worker (background.js) ─────────┴────────────────┐
│ apre/riusa SOLO la propria scheda player (lib/session-state.js, storage.session)      │
│ avanzamento serializzato · autoplay con generazione · Visione · sincronizzazioni       │
└───────┬──────────────────────────┬───────────────────────────────┬────────────────────┘
        │ tabs.create/update        │ tabs.sendMessage               │ offscreen + tabCapture
┌───────▼───────── Scheda YouTube (content script) ────────────┐  ┌─▼ offscreen-audio.js ┐
│ player-bridge.js  → preme play, riferisce lo stato            │  │ AnalyserNode (Chrome) │
│ auto-advance.js   → fine brano → TRACK_ENDED (accettato solo  │  └──────────────────────┘
│                      dalla scheda della sessione)              │
│ vj-overlay.js     → Visione (3 fps, opacità limitata in SAFE)  │
└────────────────────────────────────────────────────────────────┘
```

La logica di dominio sta in moduli ES puri (`lib/`), testabili in Node senza browser. L'interfaccia è costruita solo con API DOM sicure (`textContent`, `createElement`): nessun `innerHTML`.

## 2bis. Paesaggio sonoro (6.0)

```
pannello ── lib/soundscape-panel.js ── buildScore(mood) ── lib/soundscape.js (modello puro, testato in Node)
                │                                   └── isoWaypoint (lib/playlist.js): stessa traiettoria delle playlist
                └── SoundscapePlayer ── lib/soundscape-audio.js (Web Audio: bordone, tessitura, segnali, riverbero, limiter)
                        └── esportazioni: WAV (lib/wav.js), partitura JSON, patch Pd (lib/pd-patch.js)
```

- Tutto nel pannello: nessun messaggio al service worker, nessuna rete, nessuna scheda aperta.
- «Inizia» suona il paesaggio invece di YouTube se la persona lo sceglie (`soundscapePrefsV1.useByDefault`); in crisi non parte da solo.
- Pianificazione «look-ahead»: un timer ogni 250 ms programma gli eventi del successivo 1,2 s sull'orologio audio.
- Modello, mappature, limiti e misure: `docs/scientifico/paesaggio-sonoro.md`.

## 3. Flussi principali

1. **Inizia.**
   - L'analisi del testo e del cursore produce valenza, arousal e bersaglio ISO (`analyzeMoodHeuristic`).
   - Si valuta la sicurezza (`assessSafety`).
   - Si registra la sessione nel modello utente: numeri, non testo.
   - Si genera la playlist (`generatePlaylist` / `generateBandcampPlaylist`).
   - Fuori dalla crisi, si apre il primo brano.
2. **Crisi.**
   - La scheda di aiuto compare prima di tutto e non si apre nulla da solo.
   - Il livello «crisi» resta solo in `chrome.storage.session`.
   - Nessuna richiesta di donazione a fine sessione.
3. **Riproduzione.**
   - Il pannello manda `PLAY_TRACK`.
   - Il worker annota quale video sta per mettere nella scheda (`sessionVideo` in `chrome.storage.session`: l'id del video, oppure nessun id se il brano si apre con una ricerca su YouTube).
   - Riusa la propria scheda, se è ancora su YouTube, oppure ne crea una nuova.
   - Poi programma i tentativi di play: una nuova generazione annulla quelli precedenti.
4. **Di chi è il video nella scheda** (5.1.1, `classifyPlayerVideo` in `lib/session-state.js`). Ogni video che compare nella scheda della sessione è:
   - *della sessione*, se è quello annotato, oppure il primo raggiunto dalla ricerca aperta da Auscultrix (che viene adottato);
   - *in arrivo*, se è un altro video mentre la navigazione di Auscultrix non è ancora arrivata (per esempio la raccomandazione che l'autoplay di YouTube mostra per un attimo): non conta;
   - *della persona*, in tutti gli altri casi. La sessione va in pausa: niente più tentativi di play, Visione e cattura audio spente, il pannello mostra «In pausa… Premi ▶». Se la persona torna al video della sessione, la sessione riprende.
5. **Fine brano.** `auto-advance.js` manda `TRACK_ENDED` con l'URL della pagina. Il worker avanza solo se la sessione è attiva, il mittente è la scheda della sessione, la sessione non è in pausa e il video finito è quello della sessione (`decideTrackEnd`). Alla fine di un video della persona non fa nulla: YouTube prosegue con la sua riproduzione automatica. All'ultimo brano chiude la sessione (`PLAYLIST_FINISHED`).
6. **Stop o chiusura della scheda.** Si chiude la sessione, si ferma la cattura audio e si spegne la Visione. La richiesta di donazione compare dopo 14 s solo per un adulto e solo dopo una sessione senza aiuto mostrato.

## 4. Contratti dei messaggi

| Tipo | Da → a | Contenuto | Controlli |
|---|---|---|---|
| `PLAY_TRACK` | pannello → worker | `track`, `providerId` | serializzato con gli avanzamenti; segna la sessione attiva |
| `ADVANCE_PLAYLIST` | pannello → worker | `source` | serializzato; all'ultimo brano chiude la sessione |
| `TRACK_ENDED` | content → worker | `reason`, `url` | avanza solo da `sender.tab.id === playerTabId`, con sessione attiva e non in pausa, e solo se il video finito è quello della sessione |
| `STOP_SESSION` | pannello → worker | `reason` | chiude la sessione, ferma cattura e Visione |
| `SET_VJ_ENABLED` | pannello → worker | `enabled` | applicato solo alla scheda della sessione; l'accensione solo mentre mostra il video della sessione |
| `YOUTUBE_VIDEO_DETECTED` | content → worker | `videoId`; risposta `{ vision, owned }` | per la scheda della sessione stabilisce di chi è il video; la Visione solo sul video della sessione (risposta `vision: false` in tutte le altre schede) |
| `PLAYBACK_STATE` | content → worker | `playing`, `muted`, `blocked` | solo stato tecnico |
| `VJ_AUDIO_FRAME` | offscreen → worker | livelli bass/mid/treble | inoltrato alla scheda della sessione |
| `LIBRARY_SYNCED`, `PLAYLIST_ADVANCED`, `PLAYLIST_FINISHED`, `PLAYER_TAB_CLOSED`, `PLAYER_DETACHED`, `PLAYER_REATTACHED`, `EMERGENTE_CATALOG_REFRESHED` | worker → pannello | notifiche | il pannello può essere chiuso |
| `BRIDGE_AUTOPLAY`, `BRIDGE_PING`, `VJ_*` | worker → content | comandi | inviati solo alla scheda della sessione |

`GET_STATE`, che restituiva tutto lo storage, è stato rimosso nella 5.1.

## 5. Stato e persistenza

| Dove | Che cosa | Durata |
|---|---|---|
| Memoria del pannello | testo scritto, analisi completa, foto | finché il pannello è aperto |
| `chrome.storage.session` | scheda player e schede proprie, sessione attiva, video della sessione e pausa (5.1.1), livello di sicurezza, foto | fino alla chiusura del browser |
| `chrome.storage.local` | dati personali minimi e preferenze (inventario in `lib/data-inventory.js`) | fino a «Dimentica tutto» |
| Pacchetto | cataloghi, seme MIR, font, immagini | fisso |

**Inventario dei dati personali in `chrome.storage.local`.**
- `userModelV1`: ultime 60 sessioni con energia, valenza, bersaglio e attività.
- `mood`: ultima analisi senza testo.
- `playlist`, `playlistIndex`, `currentTrack`, `playedIds`.
- `recommendedHistoryV1` (≤ 400 id), `careHistoryV1` (≤ 200 id).
- `lyricsFeaturesV1`: numeri, ≤ 600.
- `vjPalette`, `vjCoverUrl`: stati della Visione.

**Preferenze:** lingua, Visione, rifiuto della Visione, catalogo, zona, lettura dei testi, avvisi nascosti, paesaggio sonoro (`soundscapePrefsV1`: spazio, ambiente, durata, volume, «Inizia» usa il paesaggio).

Il test UT-PRIV-04 legge il codice e fallisce se compare una chiave non inventariata.

**Ciclo di vita MV3.** Il service worker può essere sospeso in qualunque momento. Tutto ciò che deve sopravvivere sta nello storage; quello che riguarda la sessione del browser sta in `storage.session`. Il test E2E-16 sospende il worker e verifica che sessione e scheda restino.

## 6. Permessi

| Permesso | Perché serve |
|---|---|
| `storage` | dati locali e di sessione |
| `sidePanel` | il pannello laterale (Chrome) |
| `scripting` | iniettare i content script nella scheda YouTube della sessione quando manca il manifest (per esempio dopo un aggiornamento) e il play nel mondo MAIN |
| `tabCapture`, `offscreen` | audio-reattività della Visione (solo Chrome, solo con Visione attiva) |
| `alarms` | aggiornamento periodico dei cataloghi pubblici |

**Host:**
- `youtube.com` (4 host): player e content script;
- `i.ytimg.com`: miniature per i colori della Visione;
- `open.spotify.com`: playlist pubbliche del curatore;
- `lrclib.net`: testi delle canzoni, solo su consenso;
- `bandcamp.com`: aggiornamento del catalogo Emergente.

Rimossi nella 5.1: `tabs` (accesso agli URL di tutte le schede) e 39 host di servizi non usati.

## 7. Flussi di rete

| Destinazione | Quando | Che cosa riceve | Come evitarlo |
|---|---|---|---|
| YouTube (`www/m/music.youtube.com`) | quando si ascolta | il brano aperto (come in qualunque visita), IP, cookie YouTube del browser | non avviare la musica |
| `i.ytimg.com` | Visione attiva | id del video (miniatura) | spegnere la Visione |
| `open.spotify.com` | all'installazione, poi al massimo ogni 6 ore | richiesta delle pagine pubbliche del curatore; nessun dato della persona oltre a IP e user agent | — (catalogo pubblico) |
| `*.bandcamp.com`, `youtube.com/oembed` | all'installazione, all'avvio del browser, ogni 24 ore | richieste sul catalogo pubblico; nessun dato della persona oltre a IP e user agent | — |
| `lrclib.net` | solo se attivato in «Le tue cose» | titolo e artista dei brani proposti | lasciarlo spento (predefinito) |
| servizi di sintesi vocale online | **mai** | — | la lettura a voce usa solo voci con `localService === true` (`lib/tts-voice.js`, UT-PRIV-07); senza una voce locale resta spenta |

Ciò che la persona scrive e la foto non lasciano mai il computer. Non c'è telemetria (UT-SEC-05).

## 8. Sicurezza

- **CSP esplicita** (`script-src 'self'; object-src 'self'; base-uri 'none'`): nessuno script remoto o inline, nessun `eval` (UT-SEC-03/04).
- **Proprietà delle schede:** l'estensione guida solo le schede che ha aperto nella sessione del browser e solo finché sono su YouTube (UT-PRIV-06, E2E-06/07).
- **Messaggi:** nessun `externally_connectable`. I messaggi dai content script sono accettati solo dalla scheda della sessione.
- **Credenziali:** il canale con credenziali del curatore non è presente nei pacchetti dello store, perché `config/*.local.js` sono vuoti; la build si rifiuta di impacchettare se trova un segreto o un refresh token compilato (UT-SEC-11). Il deposito dei token (`token-vault.js`) è un offuscamento, dato che la chiave deriva dall'id pubblico dell'estensione: va trattato come tale.

## 9. Compatibilità

- **Chrome.** Versione minima 116 (`sidePanel.open`, `storage.session`).
- **Firefox.** `packaging/make-firefox-manifest.mjs`:
  - sostituisce il pannello con `sidebar_action` e il service worker con un caricatore di background;
  - toglie `sidePanel`, `tabCapture` e `offscreen`;
  - aggiunge l'id Gecko e `data_collection_permissions: none`.
  Il test UT-SEC-08 verifica questa trasformazione.
- **Safari.** `packaging/make-safari-manifest.mjs` toglie `sidePanel`, `tabCapture` e `offscreen`, usa una pagina di background non persistente con caricatore classico, apre il pannello in una scheda; `packaging/safari/build-flags.js` toglie la richiesta di donazione. Il progetto Xcode compila per macOS.
- **Non verificato in un browser reale:** Firefox e Safari. `web-ext lint` non è stato eseguito: il registro npm non era raggiungibile.

## 10. Comandi

| Comando | Effetto |
|---|---|
| `node tests/run-all.mjs` | tutti i test (unità, end-to-end se c'è Playwright, simulazione); scrive `docs/verifica/rapporto-test.md` e `docs/tecnico/tracciabilita.md` |
| `node --test tests/unit/*.test.mjs` | solo i test di unità (nessuna dipendenza) |
| `AUSCULTRIX_EXTERNAL_DATA=<dir> node tests/run-all.mjs` | ricalcola anche la validazione esterna (EmoBank, VADER) |
| `python3 tools/photosensitivity_check.py assets` | screening WCAG 2.3.1 delle GIF (serve Pillow) |
| `node packaging/build.mjs` | esegue la suite di unità e crea `packaging/auscultrix-<versione>-{chrome,firefox,safari}.zip` |
| `sh packaging/apple/make-xcode-project.sh && python3 packaging/apple/finish-xcode-project.py` | progetto Xcode per Safari (macOS, iOS) con icone e Privacy Manifest |
| `node tools/preview/server.mjs` | anteprima del pannello senza installare l'estensione; banco acustico in `/tests/acoustic/bench.html` |
| `node tests/stats/internal-eval.mjs` | statistiche del motore sui set interni (IC bootstrap, κ, baseline, McNemar) |

## 11. Cartelle

```
background.js  sidepanel.{html,js,css}  design-5.css  options.{html,js}  offscreen*
content/      player-bridge.js · auto-advance.js · vj-overlay.{js,css}
lib/          logica pura: mood, affect-lexicon, safety, playlist, affect-provenance,
              session-state, data-inventory, user-model, track-energy, lyrics, cataloghi…
data/         seme MIR del curatore, Liked Songs
assets/       font OFL, immagini e GIF CC0
_locales/     it, en
tests/        unit/, e2e/, sim/, external/, fixtures/, requirements.json, run-all.mjs
tools/        photosensitivity_check.py
docs/         tecnico/, scientifico/, rapporti/, verifica/, tesi
archive/      solo in locale: sorgenti originali 4.33.0 e 5.0.0 (non pubblicati né impacchettati)
packaging/    build.mjs, script PowerShell, variante Firefox
```
