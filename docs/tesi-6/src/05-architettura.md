# 5 | Architettura | Architecture

## 5.1 | Componenti | Components

IT: Auscultrix è un'estensione Manifest V3 composta da quattro parti. Il **pannello** (`sidepanel.html/.js`) è il diario: raccoglie l'umore, mostra l'analisi, la playlist, il paesaggio sonoro, i media che confortano e «Le tue cose». Il **service worker** (`background.js`) coordina la sessione d'ascolto: apre o riusa la scheda del player, serializza gli avanzamenti, gestisce la Visione e l'aggiornamento periodico dei cataloghi pubblici. I **content script** vivono nella sola scheda YouTube della sessione: uno preme *play*, uno segnala la fine del brano, uno disegna la Visione. Il **documento offscreen**, solo su Chrome, analizza l'audio della scheda per rendere la Visione reattiva.
EN: Auscultrix is a Manifest V3 extension made of four parts. The **panel** (`sidepanel.html/.js`) is the diary: it collects mood and shows the analysis, the playlist, the soundscape, the comforting media and "Your things". The **service worker** (`background.js`) coordinates the listening session: it opens or reuses the player tab, serialises advances, manages Vision and the periodic refresh of public catalogues. **Content scripts** live only in the session's YouTube tab: one presses *play*, one reports the end of the track, one draws Vision. The **offscreen document**, Chrome only, analyses the tab audio to make Vision reactive.

IT: La logica di dominio sta in moduli ES puri nella cartella `lib/`, senza dipendenze dal DOM e testabili in Node: lettura dell'umore (`mood.js`, `affect-lexicon.js`), sicurezza (`safety.js`), playlist ISO (`playlist.js`), provenienza delle coordinate (`affect-provenance.js`), modello utente (`user-model.js`), inventario dei dati (`data-inventory.js`), stato della sessione (`session-state.js`) e, nella 6.0, il paesaggio sonoro (`soundscape.js`), le misure audio (`audio-metrics.js`), l'esportazione WAV (`wav.js`) e il gemello Pure Data (`pd-patch.js`). La parte difficile da testare, l'interfaccia, è tenuta sottile; la parte importante da testare, le decisioni, è pura.
EN: Domain logic lives in pure ES modules in the `lib/` folder, with no DOM dependencies and testable in Node: mood reading (`mood.js`, `affect-lexicon.js`), safety (`safety.js`), ISO playlist (`playlist.js`), coordinate provenance (`affect-provenance.js`), user model (`user-model.js`), data inventory (`data-inventory.js`), session state (`session-state.js`) and, in 6.0, the soundscape (`soundscape.js`), audio measurement (`audio-metrics.js`), WAV export (`wav.js`) and the Pure Data twin (`pd-patch.js`). The hard-to-test part, the interface, is kept thin; the important-to-test part, the decisions, is pure.

IT: Il paesaggio sonoro è interamente nel pannello: non scambia messaggi con il service worker, non apre schede, non usa la rete. Il modello (`soundscape.js`) calcola la partitura; la sintesi (`soundscape-audio.js`) la suona con Web Audio, nello stesso codice per l'ascolto dal vivo e per il rendering offline.
EN: The soundscape lives entirely in the panel: it exchanges no messages with the service worker, opens no tabs, uses no network. The model (`soundscape.js`) computes the score; synthesis (`soundscape-audio.js`) plays it with Web Audio, with the same code for live listening and offline rendering.

## 5.2 | Ciclo di vita e stato | Life cycle and state

IT: In Manifest V3 il service worker può essere sospeso in qualunque momento, quindi nessuno stato di lunga durata vive in memoria. Ciò che deve sopravvivere a una sospensione ma non alla chiusura del browser (la scheda del player, la sessione attiva, il livello di sicurezza) sta in `chrome.storage.session`; ciò che deve restare tra un avvio e l'altro (preferenze, numeri delle ultime sessioni) sta in `chrome.storage.local`. Il testo scritto e la foto restano nella memoria del pannello o della sessione, mai su disco. Il test E2E-16 sospende il worker e verifica che sessione e scheda sopravvivano.
EN: In Manifest V3 the service worker may be suspended at any moment, so no long-lived state lives in memory. What must survive a suspension but not the closing of the browser (the player tab, the active session, the safety level) is kept in `chrome.storage.session`; what must persist across restarts (preferences, numbers of recent sessions) is kept in `chrome.storage.local`. Written text and photo stay in panel or session memory, never on disk. Test E2E-16 suspends the worker and checks that session and tab survive.

## 5.3 | Di chi è la scheda | Whose tab it is

IT: Un'estensione che apre YouTube deve decidere fin dove si spinge. La regola della 6.0, introdotta nella 5.1.1 dopo una segnalazione d'uso, è che **la scheda resta della persona**. Auscultrix agisce solo sulla scheda che ha aperto e solo sul video che vi ha messo. Ogni video che compare nella scheda viene classificato (`classifyPlayerVideo`): *della sessione* se è quello annotato; *in arrivo* se è un altro video mentre la navigazione di Auscultrix non è ancora arrivata (per esempio la raccomandazione mostrata per un attimo dall'autoplay di YouTube); *della persona* in tutti gli altri casi. In quest'ultimo caso la sessione va in pausa e YouTube prosegue con la propria riproduzione automatica. I test UT-OWN-01…05 e E2E-18…20 coprono questi casi.
EN: An extension that opens YouTube must decide how far it goes. The 6.0 rule, introduced in 5.1.1 after a usage report, is that **the tab stays the person's**. Auscultrix acts only on the tab it opened and only on the video it put there. Every video that appears in the tab is classified (`classifyPlayerVideo`): *the session's* if it is the annotated one; *incoming* if it is another video while Auscultrix's navigation has not yet arrived (for example the recommendation YouTube's autoplay shows for a moment); *the person's* in every other case. In that last case the session pauses and YouTube continues with its own autoplay. Tests UT-OWN-01…05 and E2E-18…20 cover these cases.

## 5.4 | Permessi e sicurezza | Permissions and security

TABLE: Tabella 5.1 — Permessi della versione Chrome e loro motivazione. | Table 5.1 — Permissions of the Chrome version and their rationale.
| Permesso · Permission | Perché | Why |
|---|---|---|
| `storage` | dati locali e di sessione | local and session data |
| `sidePanel` | il pannello laterale | the side panel |
| `scripting` | reiniettare i content script nella scheda della sessione e premere *play* | re-inject content scripts into the session tab and press *play* |
| `tabCapture`, `offscreen` | Visione audio-reattiva, solo se accesa | audio-reactive Vision, only when on |
| `alarms` | aggiornamento periodico dei cataloghi pubblici | periodic refresh of public catalogues |
| 9 host | YouTube (4), miniature, pagina pubblica Spotify, LRCLIB (solo su consenso), Bandcamp (2) | YouTube (4), thumbnails, public Spotify page, LRCLIB (consent only), Bandcamp (2) |

IT: Nella 5.1 sono stati tolti il permesso `tabs`, che dava accesso agli URL di tutte le schede, e 39 host di servizi non usati. La Content Security Policy è esplicita (`script-src 'self'; object-src 'self'; base-uri 'none'`): nessuno script remoto o in linea, nessun `eval`. Nessun messaggio esterno è accettato, e i messaggi dei content script valgono solo se arrivano dalla scheda della sessione. Il pacchetto non contiene credenziali: la build si rifiuta di impacchettare se ne trova una (UT-SEC-11).
EN: In 5.1 the `tabs` permission, which exposed the URLs of every tab, and 39 hosts of unused services were removed. The Content Security Policy is explicit (`script-src 'self'; object-src 'self'; base-uri 'none'`): no remote or inline scripts, no `eval`. No external message is accepted, and content-script messages count only if they come from the session tab. The package contains no credentials: the build refuses to package if it finds one (UT-SEC-11).

## 5.5 | Tre browser da un'unica base | Three browsers from one code base

IT: La disciplina descritta sopra (logica pura, API del browser dietro contratti minimi, capacità che degradano con eleganza) permette di derivare le altre varianti da quella Chrome con una trasformazione del manifest e la sostituzione di due moduli, senza un fork.
EN: The discipline described above (pure logic, browser APIs behind minimal contracts, capabilities that degrade gracefully) makes it possible to derive the other variants from the Chrome one with a manifest transformation and the replacement of two modules, without a fork.

TABLE: Tabella 5.2 — Differenze tra le varianti. | Table 5.2 — Differences between variants.
| Funzione · Function | Chrome | Firefox | Safari (6.0) |
|---|---|---|---|
| Pannello · Panel | `sidePanel` | `sidebar_action` | scheda dedicata · dedicated tab |
| Background | service worker (modulo) | pagina evento + caricatore · event page + loader | pagina non persistente + caricatore · non-persistent page + loader |
| Visione · Vision | audio-reattiva · audio-reactive | calma, non reattiva · calm, non-reactive | calma, non reattiva · calm, non-reactive |
| Paesaggio sonoro · Soundscape | Web Audio | Web Audio | Web Audio |
| Donazione · Donation | sì (solo adulti, fuori crisi) · yes (adults, outside crisis) | sì · yes | no (App Store 3.2.1) |
| Pacchetto · Package | zip, Chrome Web Store | zip, AMO | app macOS/iOS, Xcode |

IT: Per Safari, il convertitore di Apple (`safari-web-extension-converter`) genera dal pacchetto un progetto Xcode con un'app contenitore e l'estensione; uno script aggiunge le icone disegnate come vettori secondo le griglie delle Human Interface Guidelines e il Privacy Manifest in tutti i target. Il progetto compila per macOS (`xcodebuild`, *BUILD SUCCEEDED*); la compilazione per iOS e la prova dentro Safari restano da fare (§11.6).
EN: For Safari, Apple's converter (`safari-web-extension-converter`) generates from the package an Xcode project with a container app and the extension; a script adds icons drawn as vectors on the Human Interface Guidelines grids and the Privacy Manifest in every target. The project builds for macOS (`xcodebuild`, *BUILD SUCCEEDED*); the iOS build and the test inside Safari remain to be done (§11.6).

IT: La variante Firefox è verificata solo staticamente, così come la Safari: la tesi non dichiara prove in quei browser che non sono state fatte. In particolare la 5.0 affermava che il pacchetto Firefox «supera web-ext lint senza errori»; nessun rapporto di lint era allegato, e l'affermazione è stata tolta finché non verrà eseguito.
EN: The Firefox variant is verified only statically, as is the Safari one: the thesis claims no tests in those browsers that were not run. In particular 5.0 stated that the Firefox package "passes web-ext lint without errors"; no lint report was attached, and the claim has been withdrawn until it is run.
