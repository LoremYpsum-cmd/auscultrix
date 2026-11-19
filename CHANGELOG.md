# Changelog

## 6.0.2
- **Scheda degli store.** Nome per gli store descrittivo («Auscultrix: diario dell'umore, musica e paesaggio sonoro» / «Auscultrix: mood diary, music and generative soundscape», chiave `extStoreName`; il pannello continua a chiamarsi Auscultrix) e riassunto riscritto (≤ 132 caratteri). Testi della scheda e immagini nei formati del Chrome Web Store in `packaging/store-assets/chrome/`.

## 6.0.1
- **Ripresa della sessione dopo un altro video.** Quando la persona guarda un video suo nella scheda del player, la sessione resta in pausa come prima; ora il pannello mostra una barra con «Riprendi la sessione» e «Riprendi dal brano successivo», e da lì l'avanzamento automatico riparte. Corretto un difetto: riprendendo un brano che si apre con una ricerca su YouTube, il video che la persona stava guardando poteva essere «adottato» come video della sessione, che tornava subito in pausa (o avanzava al momento sbagliato). Test UT-OWN-06.
- **Media che confortano: revisione di sicurezza clinica** (`lib/care-safety.js`, `docs/scientifico/media-sicurezza-clinica.md`). Si propone solo ciò che è stato rivisto e approvato: 188 titoli su 363 curati; esclusi 175 con il motivo (30 per suicidio o autolesionismo rappresentato, secondo le linee guida OMS per i media), più i 755 film delle filmografie dei registi, mai rivisti. Giochi rivisti con criteri in più (nessuna violenza come meccanica, nessuna morte autoinflitta nemmeno comica, nessuna disperazione come esito). Niente temi di perdita sotto una valenza dichiarata di 0,40 o in crisi; in crisi solo titoli gentili. Le schede non promettono effetti, una nota segnala i temi di perdita, le note «via regista» sono riscritte; tolti il pulsante e la nota Cochrane inutilizzati. Test UT-CARE-01…06.

## 6.0.0
Versione per la tesi DASL08 (Sound Design – Generative Audio; Progettazione spazi sonori) e per l'App Store.
- **Paesaggio sonoro generativo** (`lib/soundscape.js`, `lib/soundscape-audio.js`, `lib/soundscape-panel.js`). Composizione algoritmica calcolata sul dispositivo con Web Audio, guidata dalla stessa traiettoria ISO delle playlist: bordone additivo (tonica, quinta, terza modale; sei armonici con inclinazione spettrale), tessiture procedurali di vento, mare e pioggia (rumore filtrato, gocce granulari), segnali a campana collocati nello spazio (HRTF, legge della distanza inversa, rapporto diretto/riverberato), riverbero per convoluzione con risposta all'impulso sintetica (RT60 di stanza, navata, campo aperto). Eventi come processo di Poisson non omogeneo (thinning), melodia come catena di Markov sui gradi del modo, modo con isteresi, cambi solo a fine frase. Ogni mappatura affetto → suono è dichiarata con tipo (one-to-one, many-to-one) e fonte (`MAPPING_TABLE`).
- **Sicurezza d'ascolto:** limiter, dissolvenze ≥ 8 s in entrata e ≥ 6 s in uscita, banda 40 Hz – 12 kHz, al massimo 24 eventi al minuto, modulazioni sotto 0,25 Hz. In crisi il paesaggio non parte da solo.
- **Esportazioni riproducibili:** 2 minuti in WAV 16 bit con dither TPDF, partitura JSON, gemello in Pure Data vanilla (`lib/pd-patch.js`) che si apre in Pd 0.56 senza errori.
- **Verifica acustica** sull'uscita del motore (`tests/acoustic/`, E2E-21): picco ≤ −9,2 dBFS, loudness −29…−25 LUFS (ITU-R BS.1770-4), onset F = 0,92 a ±50 ms, ρ di Spearman 0,98 tra brillantezza richiesta e centroide spettrale, rendering identico con lo stesso seme. Dati in `docs/verifica/misure-paesaggio.json`.
- **Mappa del diario:** le sessioni ricordate disegnate sul piano valenza–arousal, con tabella equivalente e testo alternativo; nessuna linea di tendenza, nessuna pretesa di misura della salute.
- **Valutazione statistica interna** (`tests/stats/internal-eval.mjs`): matrici di confusione, F1 macro, κ di Cohen, IC di Wilson e bootstrap (B = 5000), baseline e confronto McNemar con la 4.33, con le avvertenze sulla contaminazione del set di verifica.
- **Safari e App Store:** variante Safari (`node packaging/build.mjs safari`), progetto Xcode generato con `safari-web-extension-converter`, Privacy Manifest, icone vettoriali secondo le HIG, nessuna richiesta di donazione nella build App Store (Guideline 3.2.1). Procedura in `docs/pubblicare-apple.md`.
- Anteprima locale del pannello senza installare l'estensione: `node tools/preview/server.mjs`.

## 5.1.1
Correzione segnalata dall'utente il 7 novembre 2026: dopo un video scelto da lui nella scheda del player, Auscultrix proseguiva con la propria lista invece di lasciare l'autoplay a YouTube.
- **La scheda del player resta della persona.** Auscultrix agisce solo sul video che ha messo nella sua scheda. Se lì la persona sceglie un altro video (un consiglio di YouTube, una ricerca, un link), la sessione si mette in pausa: alla fine di quel video la playlist non avanza e YouTube prosegue con la sua riproduzione automatica. Il pannello dice che la playlist è in pausa e ▶ la riprende; tornando al video della sessione, la sessione riprende da sola.
- **Visione solo sul video della sessione.** L'overlay non compare più nelle altre schede YouTube né sui video scelti dalla persona: prima bastava che la Visione fosse attiva perché apparisse su qualunque pagina YouTube.
- Il video scelto dalla persona non diventa più il «brano corrente» della sessione (prima ne prendeva l'id e i colori).
- Mentre il brano successivo si carica, una raccomandazione mostrata per un attimo dall'autoplay di YouTube non viene scambiata per una scelta della persona.
- Test nuovi: UT-OWN-01…05, E2E-18, E2E-19, E2E-20.

## 5.1.0
Revisione completa (audit, correzioni, test, documentazione). Dettagli e motivazioni: `docs/verifica/` e `docs/rapporti/`.
- **Sicurezza delle persone.** L'estensione non prende più il controllo delle schede YouTube dell'utente: avanza solo la scheda che ha aperto lei, nella sessione in corso; gli id delle schede non restano più su disco dopo il riavvio. La Visione non si riaccende se l'utente l'ha spenta e non parte da sola con «riduci movimento». In crisi «Scegli per me» non apre nulla, il testo dell'analisi cambia, e non compare mai la richiesta di donazione (nemmeno ai minori). Per i minori niente film, serie o videogiochi senza classificazione d'età.
- **Principio ISO reale.** I brani senza coordinate emotive documentate (7.326 Emergente con valori segnaposto 0,45/0,50) non entrano più nel percorso calibrato; il seme MIR misurato (484 brani) torna nel catalogo anche offline; anche «Emergente» usa la traiettoria ISO; la vicinanza al punto della traiettoria è il termine principale (70 %); il percorso raggiunge il bersaglio in 25 minuti e poi lo mantiene; a fine playlist la sessione si chiude invece di ripartire dal primo brano; passo ISO limitato in distanza euclidea.
- **Privacy.** Il testo scritto e la foto non vengono più salvati su disco; «Dimentica tutto» cancella davvero tutto tranne i cataloghi pubblici; niente più ricerche di copertine su Apple e Deezer; testi delle canzoni da LRCLIB solo su consenso; la lettura a voce usa solo voci sul dispositivo, mai quelle online; permessi ridotti (via «tabs», da 48 a 9 siti).
- **Onestà scientifica.** Le coordinate del lessico sono dichiarate scelte a mano (non «calibrate» su NRC VAD e ANEW, confronto mai fatto); etichette di provenienza oneste; i numeri interni sono riportati come test di regressione, non come validazione.
- **Affidabilità.** Niente più osservatori accumulati su YouTube; tentativi di autoplay annullati al cambio brano; avanzamenti serializzati; registro sessioni senza perdite; protezione dai doppi clic.
- **Interfaccia.** Onboarding in tre passi, lista dei brani compatta, etichetta «scoperta» per i brani non calibrati, pagina opzioni nello stile del diario e tradotta.
- **Verifica.** Suite di test (unità, integrazione, end-to-end, accessibilità, prestazioni), validazione esterna del motore su EmoBank e VADER, screening WCAG dei lampeggiamenti.

## 5.0.0
- Motore affettivo riscritto (`lib/mood.js`, `lib/affect-lexicon.js`): tokenizzazione, negazione con portata, intensificatori, contrasto «ma», fusione con il cursore, passo ISO limitato a 0,3. Stessa interfaccia della 4.x.
- Valutazione (`tests/eval.mjs`): valenza 20% → 74% sul set di verifica (misurato prima dell'ampliamento del lessico), inversioni di polarità 2 → 1, casi ISO non sicuri 8 → 0.
- Sicurezza prima della raccomandazione (`lib/safety.js`): scheda di aiuto per crisi (Telefono Amico, 112, IASP) senza autoplay né finestre sovrapposte; scheda sostanze con Numero Verde Dipendenze ISS 800 94 07 89.
- Interfaccia «diario alla Apple» (`design-5.css`): modalità scura completa, tipografia di sistema per i controlli, serif per il diario, bersagli da 44 pt, contrasto elevato, colori forzati, movimento ridotto.
- Build multipiattaforma con cancelli di qualità (`packaging/build.mjs`); esclusi `.git`, `tests`, `.DS_Store` dai pacchetti (anche negli script PowerShell).
- Esperimento scartato: cataloghi come `JSON.parse` (apertura mediana 544 → 637 ms, memoria 30 → 44 MB).

## 4.32.2
- Kit professionale: README, store listing IT/EN, privacy policy, changelog.

## 4.32.1
- Pacchetti alleggeriti (GIF ottimizzate, dati compatti, docs escluse): 15,2 → 12,3 MB.

## 4.32.0
- Ogni regista a 25+ elementi collegati; 1118 schede totali, zero doppioni.

## 4.31.0
- Scorta media: libri 57, film 61 (TMDB verificati), serie 34, doc/podcast 38, giochi 37.

## 4.30.0
- 726 filmografie complete di 25 registi (TMDB verificati su Wikidata).

## 4.29.0
- Catalogo mondiale Bandcamp: 1023 brani verificati (luoghi + YouTube).

## 4.28.x
- Autoplay anti-oscillazione, sblocco al primo gesto, stato sotto il brano, banner Firefox.

## 4.27.0
- Pulsante «Altri risultati» per tutti i media.

## 4.26.x
- «Un'altra magia», link media qualificati, serie di qualità, videogiochi calmi, liste mai uguali.

## 4.25.0
- Reframing mediaterapia: «Media che confortano», icone su tutti i pulsanti.

## 4.24.x
- Compatibilità Android (sidebar desktop, scheda su mobile); ID Gecko stabile; permessi dati AMO.
