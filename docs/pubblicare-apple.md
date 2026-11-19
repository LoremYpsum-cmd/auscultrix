# Pubblicare Auscultrix su Safari (Mac App Store e App Store)

Versione 6.0.0. Questo documento dice come si costruisce l'app che contiene l'estensione, che cosa è stato verificato e come ogni regola di Apple è soddisfatta. Non è un'approvazione: l'approvazione la decide la revisione di Apple al momento dell'invio.

## 1. Costruire

```sh
node packaging/build.mjs safari                 # pacchetto dell'estensione (packaging/dist-safari)
sh packaging/apple/make-xcode-project.sh        # progetto Xcode (apple/Auscultrix) con safari-web-extension-converter
python3 packaging/apple/finish-xcode-project.py # icone, Privacy Manifest, categoria, versione
```

Prima dell'invio:

1. In `make-xcode-project.sh` sostituire `BUNDLE_ID` con un identificativo registrato nel proprio team Apple Developer (oppure `BUNDLE_ID=... sh packaging/apple/make-xcode-project.sh`).
2. In Xcode: *Signing & Capabilities* → scegliere il team per i quattro target.
3. *Product → Archive*, poi *Distribute App* verso App Store Connect.

## 2. Che cosa è stato verificato (19 novembre 2026)

| Verifica | Esito |
|---|---|
| `node packaging/build.mjs safari` (test di unità come cancello, nessuna API solo Chrome, nessuna credenziale, nessuna richiesta di donazione) | superata |
| Conversione con `safari-web-extension-converter` (Xcode, Safari 27.2) | superata; avviso informativo sulla chiave `persistent` (vedi §4) |
| `xcodebuild` macOS, Release, senza firma | **BUILD SUCCEEDED** |
| `xcodebuild` iOS (simulatore) | **non eseguita**: la piattaforma iOS 26.5 non è installata in Xcode su questo Mac (*Xcode → Settings → Components*) |
| Privacy Manifest presente nei quattro target | sì (`PrivacyInfo.xcprivacy` nel bundle dell'app e dell'estensione) |
| Prova dell'estensione dentro Safari | **da fare**: richiede di consentire le estensioni non firmate (*Safari → Impostazioni → Sviluppatore*), una scelta che spetta all'utente del Mac |

## 3. Differenze della variante Safari

| Funzione | Chrome | Safari |
|---|---|---|
| Pannello | pannello laterale (`sidePanel`) | scheda dedicata, aperta o ripresa dal pulsante nella barra (`packaging/safari/stubs/panel-open.js`) |
| Background | service worker modulo | pagina non persistente che carica `background.js` come modulo (`background-safari-loader.js`), come su Firefox |
| Visione audio-reattiva | `tabCapture` + documento offscreen | non disponibile: Visione in modalità calma, non reattiva |
| Paesaggio sonoro | Web Audio | identico (Web Audio) |
| Richiesta di donazione | sì, solo adulti fuori dalla crisi | **assente** (`packaging/safari/build-flags.js`) |

## 4. Rischi tecnici da provare in Safari

- **Risveglio del background.** Gli ascoltatori sono registrati dopo l'`import()` dinamico. Se Safari consegna un evento prima che il modulo sia caricato, quell'evento va perso. Da provare: fine brano → brano successivo dopo che il background è stato sospeso.
- **`scripting.executeScript` con `world: 'MAIN'`.** È usato per premere *play* su YouTube. Se Safari non lo accetta, il codice ricade sul content script: il primo play può richiedere un tocco della persona.
- **`persistent: false`.** Il convertitore lo segnala come chiave non supportata su macOS (la ignora) ma lo richiede su iOS. La chiave resta.

## 5. App Store Review Guidelines: punto per punto

Riferimento: *App Store Review Guidelines* (Apple, versione in vigore al momento dell'invio; rileggerle prima di inviare).

| Linea guida | Che cosa chiede | Come Auscultrix la rispetta |
|---|---|---|
| **1.4.1** Salute (sicurezza fisica) | Le app che possono fornire dati o trattamenti medici inaccurati sono esaminate con più rigore; servono dati e metodi a sostegno di ogni affermazione sulla salute. | Nessuna affermazione medica. Testo d'apertura: «non è un dispositivo medico e non sostituisce una cura». Nessuna diagnosi, nessun monitoraggio, nessun esito misurato. La mappa del diario dice esplicitamente che i numeri «non sono una misura della salute». La parola «terapia» non compare nell'interfaccia. Le linee di aiuto (Telefono Amico, 112, IASP) sono un rinvio, non un servizio. |
| **1.4.1** Paesaggio sonoro | — | Nessuna promessa di effetto. I limiti di sicurezza d'ascolto sono tecnici (picco, dissolvenze, banda, modulazioni) e misurati (`docs/verifica/misure-paesaggio.json`). Niente battimenti binaurali (vedi `docs/scientifico/paesaggio-sonoro.md`). |
| **2.1** Completezza | L'app deve funzionare. | La parte nativa è il contenitore standard di Apple; tutta la logica è nell'estensione, coperta da 91 test di unità e dai test end-to-end. |
| **2.3** Metadati accurati | Descrizione e schermate devono corrispondere all'app. | Testi in `docs/store-listing.md` (sezione Apple). Dire che la Visione non è audio-reattiva su Safari. |
| **2.5.2** Codice autonomo | L'app non scarica né esegue codice. | CSP `script-src 'self'`; nessuno script remoto, nessun `eval` (UT-SEC-03/04). |
| **3.1.1 / 3.2.1(vi)** Pagamenti e donazioni | Le donazioni fuori dall'acquisto in-app sono consentite solo alle organizzazioni non profit approvate. | La build Safari non contiene la richiesta di donazione; la build si ferma se la trova (`packaging/build.mjs`). |
| **4.2** Funzionalità minima | Non basta un sito incapsulato. | L'estensione lavora dentro Safari (pannello, riproduzione, paesaggio sonoro generato in locale, esportazioni). |
| **5.1.1** Raccolta dati | Informativa sulla privacy; raccogliere solo il necessario; consenso. | Nessun dato raccolto da Auscultrix: niente server, niente telemetria. Informativa: `docs/privacy-policy.md` (va pubblicata a un URL e inserita in App Store Connect). |
| **5.1.1(v)** Cancellazione | Se ci sono account, devono potersi cancellare. | Nessun account. «Dimentica tutto di me» cancella ogni dato personale locale (UT-PRIV-02). |
| **5.1.2** Uso e condivisione | Nessuna condivisione senza consenso. | I testi delle canzoni (LRCLIB) partono solo con consenso esplicito, spento per impostazione predefinita. |
| **5.1.3** Salute e dati sanitari | Dati sanitari non usati per pubblicità né conservati in iCloud. | Nessun dato sanitario; l'umore dichiarato resta in `storage.local` del browser, mai in iCloud, mai trasmesso. |
| **Privacy Manifest** (requisito di App Store Connect dal 2024) | Dichiarare tracciamento, domini, dati raccolti e API con motivazione obbligatoria. | `PrivacyInfo.xcprivacy` in tutti i target: nessun tracciamento, nessun dominio, nessun dato raccolto, nessuna API a motivazione obbligatoria (il codice nativo è il modello di Apple e non usa `UserDefaults`, date di file né spazio disco). |

### Etichette della privacy in App Store Connect

Rispondere **«Data Not Collected»** (Dati non raccolti). Motivo: per Apple un dato è «raccolto» quando lascia il dispositivo in modo che lo sviluppatore o terzi possano accedervi per più tempo di quello necessario a servire la richiesta. Auscultrix non ha server. Le richieste a YouTube, Spotify (pagina pubblica), Bandcamp e, su consenso, LRCLIB sono avviate dalla persona per ottenere un contenuto pubblico; YouTube vede che cosa si ascolta come in qualunque visita, e l'informativa lo dice.

## 6. Human Interface Guidelines

| Area HIG | Scelta |
|---|---|
| Icona | Disegnata come vettore (`assets/icon-source/`): macOS sulla griglia di 824 px su 1024 con angoli continui e ombra; iOS a pieno formato, senza trasparenza (la maschera la applica il sistema). |
| Tipografia | Caratteri di sistema per i controlli (`-apple-system`), serif per la voce del diario, Lexend per la lettura lunga. |
| Bersagli | Controlli principali ≥ 44 pt; tutti ≥ 24 px (WCAG 2.2, 2.5.8). |
| Modalità scura e contrasto | Palette completa per la modalità scura; colori forzati; contrasto ≥ 4,5:1 sul testo. |
| Movimento | Nessuna animazione con «Riduci movimento»; la Visione non parte da sola. |
| Suono | Il paesaggio sonoro parte solo da un gesto della persona e sfuma sempre, in entrata e in uscita. |
| Accessibilità | Etichette accessibili su ogni controllo, `aria-live` per gli stati, alternativa testuale e tabellare delle mappe. |
