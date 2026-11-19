# 4 | Requisiti | Requirements

IT: I requisiti sono scritti nella forma in cui il software li implementa nella versione 6.0.0. Ognuno ha un identificativo e uno o più test che lo verificano; la matrice completa (55 requisiti) è generata a ogni esecuzione della suite in `docs/tecnico/tracciabilita.md`.
EN: Requirements are written in the form in which the software implements them in version 6.0.0. Each has an identifier and one or more tests that verify it; the complete matrix (55 requirements) is generated at every run of the suite in `docs/tecnico/tracciabilita.md`.

## 4.1 | Requisiti funzionali | Functional requirements

TABLE: Tabella 4.1 — Requisiti funzionali principali. | Table 4.1 — Main functional requirements.
| ID | Requisito | Requirement | Test |
|---|---|---|---|
| RF1 | Ingresso: testo libero, sei etichette, cursore dell'energia 0–100, foto facoltativa analizzata sul dispositivo | Input: free text, six labels, energy slider 0–100, optional photo analysed on the device | UT-MOOD-04/05, E2E-02/14 |
| RF2 | Catalogo da fonti documentate; ogni brano dichiara la provenienza delle sue coordinate | Catalogue from documented sources; every track declares the provenance of its coordinates | UT-PROV-01…04 |
| RF3 | Playlist con principio ISO: rispecchiamento, spostamento, mantenimento; nel percorso solo brani con coordinate documentate | ISO playlist: matching, shifting, holding; only tracks with documented coordinates on the path | UT-ISO-01…13 |
| RF4 | Riproduzione su YouTube in una scheda aperta dall'estensione, che resta della persona | Playback on YouTube in a tab opened by the extension, which stays the person's | E2E-02/07, UT-OWN-01…05 |
| RF5 | Avanzamento solo nella scheda della sessione e solo sul video della sessione | Advance only in the session tab and only on the session video | E2E-18…20 |
| RF6 | Visione facoltativa, 3 fps, sotto le soglie WCAG di lampeggiamento | Optional Vision, 3 fps, below WCAG flash thresholds | UT-PHOTO-01…03, UT-ZOOM-01, E2E-10/11 |
| RF7 | Media che confortano: libri, film, serie, podcast, giochi calmi, ordinati con la stessa logica | Comforting media: books, films, series, podcasts, calm games, ranked with the same logic | E2E-02 (solo funzionale · functional only) |
| RF8 | Sicurezza: parole di crisi → scheda di aiuto prima di tutto, nessuna apertura automatica | Safety: words of crisis → help card first, nothing opens automatically | UT-SAFE-01…06 |
| RF9 | Paesaggio sonoro generativo sulla traiettoria ISO, sul dispositivo (6.0) | Generative soundscape on the ISO trajectory, on the device (6.0) | UT-SND-01…09, E2E-21 |
| RF10 | Esportazioni riproducibili: WAV, partitura JSON, patch Pure Data (6.0) | Reproducible exports: WAV, JSON score, Pure Data patch (6.0) | UT-WAV-01, UT-PD-01/02 |
| RF11 | Mappa del diario sul piano valenza–arousal, con tabella equivalente (6.0) | Diary map on the valence–arousal plane, with an equivalent table (6.0) | UT-CX-01 |
| RF12 | Lingua dell'interfaccia italiano/inglese, scelta manuale | Interface language Italian/English, manual choice | UT-I18N-01…04 |

## 4.2 | Requisiti non funzionali | Non-functional requirements

TABLE: Tabella 4.2 — Requisiti non funzionali e loro verifica. | Table 4.2 — Non-functional requirements and how they are verified.
| ID | Requisito | Requirement | Verifica · Verification |
|---|---|---|---|
| RNF1 | Il testo scritto e la foto non lasciano il dispositivo e il testo non viene salvato | Written text and photo never leave the device and the text is never stored | UT-PRIV-01/03, UT-SEC-05 |
| RNF2 | Ogni chiave salvata è inventariata; «Dimentica tutto» cancella ogni dato personale | Every stored key is inventoried; "Forget everything" erases all personal data | UT-PRIV-02/04 |
| RNF3 | Nessun codice remoto, CSP esplicita, nessuna telemetria | No remote code, explicit CSP, no telemetry | UT-SEC-03/04/05 |
| RNF4 | Accessibilità WCAG 2.2: bersagli ≥ 24 px (principali ≥ 44 px), contrasto, tastiera, modalità scura e colori forzati | WCAG 2.2 accessibility: targets ≥ 24 px (main ≥ 44 px), contrast, keyboard, dark mode and forced colours | E2E a11y |
| RNF5 | Suono: picco ≤ −1 dBFS, dissolvenze ≥ 8/6 s, 40 Hz–12 kHz, ≤ 24 eventi/min, modulazioni ≤ 0,25 Hz | Sound: peak ≤ −1 dBFS, fades ≥ 8/6 s, 40 Hz–12 kHz, ≤ 24 events/min, modulations ≤ 0.25 Hz | UT-SND-02, E2E-21 |
| RNF6 | Prestazioni: pannello pronto in meno di 1 s (mediana), sessione costruita in meno di 100 ms | Performance: panel ready in under 1 s (median), session built in under 100 ms | E2E perf |
| RNF7 | Portabilità: Chrome ≥ 116, Firefox ≥ 142, Safari ≥ 17 da un'unica base di codice | Portability: Chrome ≥ 116, Firefox ≥ 142, Safari ≥ 17 from one code base | UT-SEC-08, build |
| RNF8 | Riproducibilità: stesso stato e stesso seme danno la stessa composizione | Reproducibility: same state and seed give the same composition | UT-SND-01, A5 |

## 4.3 | Non-obiettivi | Non-goals

IT: Auscultrix non è un dispositivo medico e non intende diventarlo: non diagnostica, non monitora disturbi, non misura esiti clinici, non sostituisce un percorso di cura. Non rileva l'umore passivamente, non usa il microfono, non registra come è andata una sessione, non ha account, non ha server, non raccoglie telemetria. Non promette effetti del suono sul corpo.
EN: Auscultrix is not a medical device and does not intend to become one: it does not diagnose, monitor conditions, measure clinical outcomes or replace care. It does not detect mood passively, does not use the microphone, does not record how a session went, has no accounts, no server and collects no telemetry. It promises no bodily effects of sound.
