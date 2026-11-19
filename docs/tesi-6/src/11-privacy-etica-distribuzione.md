# 11 | Privacy, etica, regole e distribuzione | Privacy, ethics, regulation and distribution

## 11.1 | Che cosa resta e che cosa esce | What stays and what leaves

IT: Il principio è semplice: ciò che la persona scrive, la foto e la lettura dell'umore non lasciano il computer. Il testo non viene nemmeno salvato: vive nella memoria del pannello finché è aperto. Su disco restano solo numeri, etichette, identificativi dei brani proposti e preferenze, e ogni chiave salvata è elencata con il suo scopo in `lib/data-inventory.js`. Il test UT-PRIV-04 legge il codice e fallisce se compare una chiave non inventariata; «Dimentica tutto di me» cancella tutto tranne i cataloghi pubblici (UT-PRIV-02).
EN: The principle is simple: what the person writes, the photo and the mood reading never leave the computer. The text is not even stored: it lives in panel memory while the panel is open. Only numbers, labels, ids of offered tracks and preferences remain on disk, and every stored key is listed with its purpose in `lib/data-inventory.js`. Test UT-PRIV-04 reads the code and fails if an uninventoried key appears; "Forget everything about me" erases everything except public catalogues (UT-PRIV-02).

TABLE: Tabella 11.1 — Servizi contattati (versione 6.0). Il paesaggio sonoro non usa la rete. | Table 11.1 — Services contacted (version 6.0). The soundscape uses no network.
| Destinazione · Destination | Quando · When | Che cosa riceve · What it receives |
|---|---|---|
| YouTube | quando si ascolta su YouTube · when listening on YouTube | il brano aperto, come in ogni visita · the opened track, as in any visit |
| i.ytimg.com | Visione accesa · Vision on | id del video (miniatura) · video id (thumbnail) |
| open.spotify.com | all'installazione, poi al più ogni 6 ore · at install, then at most every 6 h | richiesta delle pagine pubbliche del curatore · request for the curator's public pages |
| bandcamp.com, oEmbed YouTube | avvio e ogni 24 ore · start-up and every 24 h | richieste sul catalogo pubblico · public-catalogue requests |
| lrclib.net | solo se attivato · only if enabled | titolo e artista dei brani proposti · title and artist of offered tracks |
| sintesi vocale online · online speech | **mai** · **never** | — |

IT: La tabella sostituisce una frase della prima edizione: «il traffico di rete si limita a due letture di fonti pubbliche». Nella 4.33 l'estensione contattava anche Apple iTunes e Deezer con titolo e artista di ogni brano, per le copertine, e LRCLIB in automatico; la lettura a voce poteva usare voci online. Nella 5.1 iTunes e Deezer sono stati tolti, LRCLIB è su consenso e la lettura a voce usa solo voci locali (UT-PRIV-07). Non c'è telemetria (UT-SEC-05).
EN: The table replaces a sentence of the first edition: "network traffic is limited to two reads of public sources". In 4.33 the extension also contacted Apple iTunes and Deezer with the title and artist of every track, for cover art, and LRCLIB automatically; read-aloud could use online voices. In 5.1 iTunes and Deezer were removed, LRCLIB requires consent and read-aloud uses only local voices (UT-PRIV-07). There is no telemetry (UT-SEC-05).

## 11.2 | Etica del progetto | Ethics of the design

IT: Le scelte etiche sono scritte nel codice, non nelle dichiarazioni. Il livello di crisi resta in memoria e non raggiunge mai il disco. In crisi non parte nulla: né musica, né paesaggio sonoro, né richieste di donazione. Ai minori non si chiede denaro e non si propongono media senza classificazione d'età. Il modello utente non registra punteggi di sintomi. La mappa del diario non disegna tendenze. Il paesaggio sonoro non promette effetti sul corpo. La scheda del player resta della persona. Ognuna di queste regole ha un test.
EN: The ethical choices are written in code, not in statements. The crisis level stays in memory and never reaches disk. In a crisis nothing starts: no music, no soundscape, no donation request. Minors are never asked for money and are not offered media without age ratings. The user model records no symptom scores. The diary map draws no trends. The soundscape promises no bodily effects. The player tab stays the person's. Each of these rules has a test.

## 11.3 | Non è un dispositivo medico | Not a medical device

IT: Secondo il Regolamento (UE) 2017/745 (MDR), un software è dispositivo medico se il fabbricante lo destina a una finalità medica: diagnosi, prevenzione, monitoraggio, previsione, prognosi, trattamento o attenuazione di una malattia; la destinazione si ricava da etichetta, istruzioni, materiale promozionale e dichiarazioni. Il considerando 19 precisa che il software destinato a fini di stile di vita e benessere non lo è. Auscultrix è dichiarato come strumento di benessere per adulti e famiglie: non diagnostica, non monitora, non misura esiti, non sostituisce cure; le parole di crisi attivano solo un rinvio ai servizi di aiuto.
EN: Under Regulation (EU) 2017/745 (MDR), software is a medical device if the manufacturer intends it for a medical purpose: diagnosis, prevention, monitoring, prediction, prognosis, treatment or alleviation of disease; the intended purpose is derived from labelling, instructions, promotional material and statements. Recital 19 clarifies that software intended for lifestyle and wellbeing purposes is not. Auscultrix is declared as a wellbeing tool for adults and families: it does not diagnose, monitor, measure outcomes or replace care; words of crisis trigger only a referral to help services.

IT: La destinazione d'uso dipende anche dalle parole. È per questo che la tesi propone di togliere «musicoterapia digitale» dal titolo, che l'interfaccia non usa mai la parola «terapia», che la mappa del diario dice di non essere una misura della salute e che il paesaggio sonoro non promette di abbassare frequenza cardiaca o ansia. L'analisi completa, con l'AI Act e il GDPR, è in `docs/rapporti/regolatorio.md`.
EN: The intended purpose also depends on words. This is why the thesis proposes removing "digital music therapy" from the title, why the interface never uses the word "therapy", why the diary map says it is not a measure of health and why the soundscape does not promise to lower heart rate or anxiety. The full analysis, including the AI Act and the GDPR, is in `docs/rapporti/regolatorio.md`.

## 11.4 | Accessibilità come etica | Accessibility as ethics

IT: L'accessibilità è trattata come un requisito, non come una rifinitura: misurata nei due temi (§6.3), con alternative testuali per ogni figura del pannello, colori forzati, nessun movimento con «riduci movimento», lettura a voce con voci locali. Per il suono valgono regole analoghe: niente parte senza un gesto, tutto sfuma, il volume è sempre a portata di mano.
EN: Accessibility is treated as a requirement, not a finish: measured in both themes (§6.3), with text alternatives for every figure in the panel, forced colours, no motion with "reduce motion", read-aloud with local voices. Similar rules apply to sound: nothing starts without a gesture, everything fades, the volume is always at hand.

## 11.5 | Chrome Web Store e Firefox | Chrome Web Store and Firefox

IT: Per il Chrome Web Store la dichiarazione sulle pratiche relative ai dati è: nessun dato raccolto dallo sviluppatore. Ogni permesso è giustificato (Tabella 5.1). La variante Firefox dichiara `data_collection_permissions: none`, formalizzando ciò che l'architettura già garantisce. Prima dell'invio ad AMO va eseguito `web-ext lint` e allegato il suo rapporto.
EN: For the Chrome Web Store the data-practices declaration is: no data collected by the developer. Every permission is justified (Table 5.1). The Firefox variant declares `data_collection_permissions: none`, formalising what the architecture already guarantees. Before submission to AMO, `web-ext lint` must be run and its report attached.

## 11.6 | Safari e App Store | Safari and the App Store

IT: La 6.0 prepara la distribuzione su Safari per macOS e iOS. La variante si costruisce con `node packaging/build.mjs safari`; il convertitore di Apple genera il progetto Xcode; uno script aggiunge le icone e il **Privacy Manifest** (`PrivacyInfo.xcprivacy`) in tutti e quattro i target: nessun tracciamento, nessun dominio di tracciamento, nessun dato raccolto, nessuna API con motivazione obbligatoria. In App Store Connect l'etichetta della privacy corretta è «Dati non raccolti».
EN: Edition 6.0 prepares distribution on Safari for macOS and iOS. The variant is built with `node packaging/build.mjs safari`; Apple's converter generates the Xcode project; a script adds the icons and the **Privacy Manifest** (`PrivacyInfo.xcprivacy`) in all four targets: no tracking, no tracking domains, no collected data, no required-reason APIs. In App Store Connect the correct privacy label is "Data Not Collected".

TABLE: Tabella 11.2 — Linee guida dell'App Store più rilevanti e come sono soddisfatte. | Table 11.2 — The most relevant App Store guidelines and how they are met.
| Linea guida · Guideline | Requisito · Requirement | Auscultrix |
|---|---|---|
| 1.4.1 Salute · Health | rigore sulle affermazioni sanitarie · rigour on health claims | nessuna affermazione medica; avvertenza esplicita · no medical claim; explicit disclaimer |
| 2.5.2 Codice · Code | nessun codice scaricato · no downloaded code | CSP `script-src 'self'` |
| 3.2.1(vi) Donazioni · Donations | solo per non profit approvate · approved nonprofits only | nessuna richiesta di donazione nella build Safari; la build si ferma se la trova · none in the Safari build; the build stops if found |
| 4.2 Funzionalità · Functionality | non un sito incapsulato · not a wrapped website | estensione completa, paesaggio sonoro locale · full extension, local soundscape |
| 5.1.1 Dati · Data | informativa, minimizzazione · policy, minimisation | nessun dato raccolto; informativa IT/EN · no data collected; IT/EN policy |
| 5.1.3 Salute · Health data | niente pubblicità, niente iCloud · no ads, no iCloud | nessun dato sanitario, nulla in iCloud · no health data, nothing in iCloud |

IT: Che cosa è stato verificato e che cosa no va detto con la stessa precisione. Il progetto compila per macOS con `xcodebuild` (*BUILD SUCCEEDED*). La compilazione per iOS non è stata eseguita, perché la piattaforma iOS non era installata in Xcode sul computer di lavoro. L'estensione non è ancora stata provata dentro Safari: serve consentire le estensioni non firmate nelle impostazioni dello sviluppatore, una scelta che spetta a chi usa quel Mac. Due rischi tecnici sono documentati in `docs/pubblicare-apple.md`: il risveglio del background (gli ascoltatori sono registrati dopo un `import()` dinamico) e il supporto di `scripting.executeScript` nel mondo della pagina. L'approvazione, infine, la decide Apple al momento dell'invio: la tesi documenta la conformità, non la garantisce.
EN: What was verified and what was not must be said with the same precision. The project builds for macOS with `xcodebuild` (*BUILD SUCCEEDED*). The iOS build was not run, because the iOS platform was not installed in Xcode on the work computer. The extension has not yet been tested inside Safari: unsigned extensions must be allowed in the developer settings, a choice for whoever uses that Mac. Two technical risks are documented in `docs/pubblicare-apple.md`: background wake-up (listeners are registered after a dynamic `import()`) and support for `scripting.executeScript` in the page world. Finally, approval is decided by Apple at submission: the thesis documents compliance, it does not guarantee it.
