# Analisi dei rischi

Auscultrix 5.1.1 · 7 novembre 2026

Auscultrix **non è un dispositivo medico** e non è soggetto alla norma ISO 14971. L'analisi ne segue comunque il metodo (ISO 14971:2019, con la guida ISO/TR 24971:2020) per due ragioni: lo strumento si rivolge a persone che possono stare male, e qualunque percorso futuro verso un uso sanitario partirebbe da qui. **Non è un fascicolo di gestione del rischio conforme alla norma**: le probabilità sono stime qualitative del gruppo di revisione, senza dati dal campo. Che cosa manca è elencato in fondo.

## 1. Uso previsto e uso prevedibile

**Uso previsto.** Una persona adulta scrive o indica come si sente e riceve una sessione di musica su YouTube che parte dal suo stato e si sposta gradualmente verso uno stato più calmo o più sereno, con proposte di libri, film e altri media e un accompagnamento visivo facoltativo. Uso domestico, volontario, non clinico.

**Uso prevedibile oltre quello previsto**, di cui l'analisi tiene conto:

- una persona in crisi, anche con ideazione suicidaria, scrive come sta;
- un minore usa l'estensione, con o senza dirlo;
- una persona con epilessia fotosensibile accende la Visione;
- una persona con depressione la usa al posto delle cure;
- un clinico la consiglia a un paziente come complemento;
- più persone condividono lo stesso profilo del browser.

## 2. Criteri

**Gravità del danno**

| Livello | Descrizione |
|---|---|
| S1 trascurabile | fastidio, perdita di tempo |
| S2 minore | disagio emotivo passeggero, perdita di fiducia, contenuto inadatto |
| S3 seria | peggioramento dell'umore che dura, esposizione di dati sullo stato d'animo |
| S4 critica | aiuto ritardato in una crisi, crisi fotosensibile |
| S5 catastrofica | morte o danno permanente |

**Probabilità** (stima qualitativa): P1 improbabile · P2 remota · P3 occasionale · P4 probabile · P5 frequente.

**Accettabilità**

| | P1 | P2 | P3 | P4 | P5 |
|---|---|---|---|---|---|
| **S5** | da ridurre | non accettabile | non accettabile | non accettabile | non accettabile |
| **S4** | accettabile | da ridurre | non accettabile | non accettabile | non accettabile |
| **S3** | accettabile | accettabile | da ridurre | non accettabile | non accettabile |
| **S2** | accettabile | accettabile | accettabile | da ridurre | da ridurre |
| **S1** | accettabile | accettabile | accettabile | accettabile | da ridurre |

«Da ridurre» vuol dire: il rischio resta solo se ogni ulteriore riduzione praticabile è stata fatta e il beneficio lo giustifica.

## 3. Pericoli, controlli e rischio residuo

Le colonne «prima» e «dopo» confrontano la 5.0 con la 5.1. I codici C- rimandano a `criticita.md`, quelli dei test a `docs/verifica/rapporto-test.md`, gli studi V- a `docs/scientifico/piano-di-validazione.md`.

### Sicurezza della persona

| ID | Situazione pericolosa | Danno | Prima | Controlli nella 5.1 | Verifica | Dopo | Esito e azioni |
|---|---|---|---|---|---|---|---|
| R-01 | Una persona in crisi scrive in modo indiretto («vorrei sparire») e il rilevatore non la riconosce: nessuna scheda d'aiuto, parte una playlist. | S5 | P3 | Elenco di espressioni IT/EN; scheda d'aiuto prima di tutto; in crisi niente autoplay né «Scegli per me»; il disclaimer con 112 e Telefono Amico è sempre nel pannello. | UT-SAFE-01…06, E2E-03 | P3 | **Non accettabile finché non è misurato.** La sensibilità sulle frasi indirette non è nota. Azione: studio V-3 con clinici; finché manca, nessuna affermazione di «rilevazione del rischio». |
| R-02 | Falso allarme: una frase comune («stanco morto», «drogheria») apre la scheda di crisi. | S2 | P3 | Elenco dei «falsi amici», tono della scheda non allarmante. | UT-SAFE-01…03 | P2 | Accettabile. |
| R-03 | Il numero d'aiuto mostrato è sbagliato, cambiato o non attivo in quel momento. | S4 | P2 | Numeri verificati il 6/11/2026 (`bibliografia.md`); il 112 compare sempre; giorni di apertura del Numero Verde ISS indicati. | revisione | P2 | **Da ridurre.** La scheda ora dice che il Numero Verde ISS risponde dal lunedì al venerdì (C-52). Azione: verificare i numeri e gli orari a ogni versione (lista di rilascio). |
| R-04 | Il rispecchiamento con musica triste dura troppo per chi tende a rimuginare (Garrido & Schubert, 2015). | S3 | P3 | Percorso temporale: bersaglio in 25 minuti, poi mantenuto; passo massimo 0,3 nel piano; la playlist finisce invece di tornare al primo brano. | UT-ISO-01/02, UT-MOOD-07, E2E-09 | P2 | Accettabile come progetto; parametri da validare (V-6). |
| R-05 | Il motore legge l'umore al contrario («non sto bene» → felicità) o porta più energia a uno stato agitato. | S3 | P4 (4.33) | Negazione, contrasto, intensità; il build si ferma se compare un caso ISO non sicuro sui set interni. | UT-MOOD-01…08, validazione esterna | P3 | **Da ridurre.** In italiano non è misurato (C-39). Azione: V-2. |
| R-06 | La Visione provoca una crisi fotosensibile. | S4 | P2 | Fotogrammi ≥ 330 ms, dissolvenze ≥ 2,8 s, modalità sicura predefinita con tetto di opacità (opacità × Δ < 0,08), «spento» ricordato, niente avvio automatico con «riduci movimento», avviso sul video sottostante. | UT-PHOTO-01…03, E2E-10, E2E-11, UT-I18N-04 | P1 | Accettabile per le immagini dell'estensione. **Resta fuori controllo il video di YouTube sotto l'overlay**, che può contenere lampi: il testo accanto all'interruttore della Visione ora lo dice (C-52). Lo screening non è una certificazione (PEAT o test di Harding). |
| R-07 | Un minore riceve film, serie o videogiochi per adulti, o testi espliciti. | S2 | P4 | Se il minore lo dice («ho 9 anni») vede solo musica e nessuna richiesta di donazione. | UT-AGE-01, E2E-05 | P3 | **Da ridurre.** L'età non si chiede e i cataloghi non hanno classificazioni (C-43). Azioni: classificazioni PEGI/VM o liste «calme» senza titoli per adulti. |
| R-08 | La persona usa lo strumento al posto delle cure. | S4 | P2 | «Non è un dispositivo medico» nel pannello, risorse d'aiuto sempre raggiungibili, nessuna parola di cura o terapia nell'interfaccia. | UT-I18N-03 | P2 | **Da ridurre.** Il titolo della tesi («musicoterapia digitale») e l'inquadramento Cochrane suggeriscono un'efficacia non dimostrata (T-16, T-17). |
| R-09 | Richiesta di donazione dopo una sessione difficile. | S2 | P4 | Mai dopo una crisi o una scheda sostanze, mai ai minori. | E2E-03 | P1 | Accettabile. |
| R-10 | Salti bruschi tra brani o volume improvviso. | S1 | P3 | Penalità per salti > 0,35; nessun ritorno al primo brano. | UT-ISO-06 | P2 | Accettabile. Le pubblicità di YouTube restano fuori controllo. |
| R-11 | Il brano trovato su YouTube non è quello voluto e ha contenuti inadatti. | S2 | P2 | I corpora hanno id YouTube verificati; per gli altri brani si usa la ricerca. | — | P2 | Accettabile; da monitorare con le segnalazioni. |

### Dati e sicurezza informatica

| ID | Situazione pericolosa | Danno | Prima | Controlli nella 5.1 | Verifica | Dopo | Esito e azioni |
|---|---|---|---|---|---|---|---|
| R-12 | Chi usa lo stesso computer legge il diario: testo e foto salvati su disco. | S3 | P3 | Testo mai su disco; foto solo in memoria di sessione; nessuna voce di ansia o tristezza nel modello; «Dimentica tutto» completo. | UT-PRIV-01…05, E2E-14, E2E-15 | P2 | Accettabile. Restano su disco energia, valenza e attività delle ultime sessioni, cancellabili. |
| R-13 | Lo stato d'animo arriva a terzi: copertine cercate su Apple e Deezer, testi a LRCLIB, lettura a voce con voci online. | S3 | P4 | Copertine solo da YouTube; LRCLIB su consenso; solo voci locali. | E2E-13, UT-LYR-02, UT-PRIV-07 | P2 | Accettabile. YouTube vede i brani ascoltati; tutti i siti contattati vedono indirizzo IP e browser. |
| R-14 | L'estensione prende il controllo di schede YouTube dell'utente, o dei video che sceglie nella scheda del player (segnalato dall'utente, C-53), o vi mostra la Visione senza che lo si aspetti (C-54). | S2 | P4 | Solo la scheda propria, nella sessione in corso, e solo il video che Auscultrix vi ha messo; un altro video mette la sessione in pausa; la Visione solo su quel video. | E2E-06…08, E2E-18…20, UT-SEC-07, UT-OWN-01…05 | P1 | Accettabile. Su YouTube reale l'autoplay del sito può cambiare: serve una prova periodica sul sito vero (R-20). |
| R-15 | Una pagina ostile manda messaggi falsi all'estensione. | S2 | P2 | Fine brano accettata solo dalla scheda del player; CSP senza codice remoto; nessun `innerHTML` né `eval`; `GET_STATE` rimosso. | UT-SEC-03…07 | P1 | Accettabile. |
| R-16 | Un aggiornamento malevolo pubblicato con un account dello store rubato. | S4 | P1 | Build riproducibile con impronte SHA-256. | — | P1 | Da ridurre a livello organizzativo: autenticazione a due fattori sugli account degli store, chiavi di firma custodite. |

### Uso e affidabilità

| ID | Situazione pericolosa | Danno | Prima | Controlli nella 5.1 | Verifica | Dopo | Esito e azioni |
|---|---|---|---|---|---|---|---|
| R-17 | Chi usa un lettore di schermo o vede poco non trova la scheda d'aiuto. | S4 | P2 | Scheda con `role="alert"`, contrasti corretti, navigazione da tastiera e dialoghi verificati. | E2E-A11Y-01/02 | P2 | **Da ridurre.** Nessuna prova con lettori di schermo reali (VoiceOver, NVDA). |
| R-18 | Doppi clic o azioni rapide avviano flussi paralleli, la sessione si confonde. | S1 | P3 | Guardie, operazioni serializzate, vince l'ultima richiesta. | E2E-12 | P1 | Accettabile. |
| R-19 | Il service worker viene sospeso e la sessione si interrompe. | S1 | P3 | Stato in `storage.session`, ripresa verificata dopo l'arresto forzato del worker. | E2E-16 | P2 | Accettabile. |
| R-20 | Un cambiamento del sito di YouTube rompe l'avanzamento. | S1 | P3 | — | YouTube simulato nei test | P3 | Accettabile; serve una prova periodica sul sito reale. |

## 4. Rischio residuo complessivo

Tre rischi non possono dirsi accettabili senza nuove misure: **R-01** (crisi non riconosciuta), **R-05** (lettura sbagliata in italiano) e, in misura minore, **R-03**, **R-07**, **R-08** e **R-17**. Per nessuno serve togliere funzioni: serve misurare (V-2, V-3) e completare alcuni testi e cataloghi. Il beneficio dichiarato (un ascolto più consapevole e graduale) non è ancora misurato (V-6), quindi un rapporto tra beneficio e rischio, nel senso della norma, non si può ancora scrivere.

## 5. Azioni, in ordine

1. V-3: misurare il rilevatore di crisi con i clinici. Fino ad allora, nessuna frase che presenti la scheda come «rilevazione del rischio».
2. Verificare numeri e orari delle linee d'aiuto a ogni versione (gli orari del Numero Verde ISS sono già indicati nella 5.1).
3. Classificazioni d'età nei cataloghi di film, serie e videogiochi, o liste «calme» senza titoli per adulti.
4. V-2: corpus italiano.
5. Prova con VoiceOver e NVDA dei percorsi critici (aiuto, cancellazione dei dati, spegnimento della Visione).
6. Allineare titolo e testi della tesi all'uso previsto non clinico (i testi dello store sono già allineati nella 5.1).

## 6. Che cosa manca per un fascicolo conforme a ISO 14971

- Un **piano di gestione del rischio** approvato, con responsabilità, criteri di accettabilità motivati e attività di verifica.
- Un **fabbricante** con un sistema di gestione della qualità (ISO 13485) a cui il fascicolo appartenga.
- **Probabilità fondate su dati**: studi (piano di validazione) e informazioni dal campo (segnalazioni, recensioni, incidenti).
- La **valutazione del rapporto tra beneficio e rischio**, che richiede prove di beneficio.
- La **sorveglianza dopo l'immissione sul mercato**: raccolta e analisi delle segnalazioni, revisione periodica dell'analisi.
- La **tracciabilità** completa tra pericoli, requisiti, controlli e verifiche, oggi parziale (`docs/tecnico/tracciabilita.md` copre requisiti e test).
- La **valutazione dell'usabilità** secondo IEC 62366-1 sugli scenari collegati ai rischi R-01, R-03, R-06, R-12, R-17.
