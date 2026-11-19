# Quadro regolatorio e attività per un'eventuale approvazione

Auscultrix 5.1.1 · fonti normative verificate il 6 novembre 2026

> **Avvertenza.** Questo documento è un'analisi tecnica, non un parere legale. Auscultrix **non è certificato, non è approvato, non ha marcatura CE e non è dichiarato conforme** ad alcuna delle norme citate. Prima di qualsiasi distribuzione con finalità sanitarie, o in caso di dubbio sulla qualificazione, serve il parere di un consulente regolatorio e di un legale esperto di protezione dei dati.

## 1. In sintesi

| Norma | Si applica oggi? | Perché | Che cosa fare |
|---|---|---|---|
| Regolamento dispositivi medici (UE) 2017/745 | **Probabilmente no**, se l'uso dichiarato resta il benessere | Il considerando 19 esclude il software «destinato a fini di stile di vita e benessere». Conta però ciò che il fabbricante dichiara, ovunque lo dichiari. | Togliere da titolo, store e materiali ogni riferimento a disturbi o terapie (§2). |
| AI Act, Regolamento (UE) 2024/1689 | **Probabilmente no** | Il motore è fatto di regole scritte a mano, che le linee guida della Commissione escludono dalla definizione di sistema di IA. Non riconosce emozioni da dati biometrici. | Non introdurre analisi del volto o della voce; rivalutare se si adotta un modello appreso dai dati (§3). |
| GDPR e Codice privacy | Sì, per i flussi verso terzi; marginalmente per il resto | I dati dell'umore restano sul dispositivo; l'estensione fa però contattare alcuni servizi dal browser della persona. | Informativa aggiornata (fatto in 5.1); parere sul ruolo dello sviluppatore (§4). |
| Legge 132/2025 sull'IA | Solo se Auscultrix fosse un sistema di IA | L'art. 4 c. 4 chiede il consenso dei genitori sotto i 14 anni per l'accesso alle tecnologie di IA. | Da rivalutare insieme all'AI Act. |
| Cyber Resilience Act, Regolamento (UE) 2024/2847 | Da verificare | Riguarda i prodotti messi a disposizione nell'ambito di un'attività commerciale; la richiesta di donazioni e gli store vanno valutati. | Parere legale se la distribuzione diventa commerciale (§5). |
| Regole degli store (Chrome Web Store, AMO) | Sì | Scopo unico, dati dichiarati, nessun codice remoto. | Dichiarazioni allineate all'informativa 5.1 (§7). |

## 2. È un dispositivo medico?

### Che cosa dice la norma

Un software è dispositivo medico se il **fabbricante** lo destina a una finalità medica: diagnosi, prevenzione, monitoraggio, previsione, prognosi, trattamento o attenuazione di una malattia (MDR, art. 2(1)). La destinazione d'uso si ricava da etichetta, istruzioni, materiale promozionale e dichiarazioni del fabbricante (art. 2(12)). Il considerando 19 precisa che il software «destinato a fini di stile di vita e benessere» non è un dispositivo medico. La guida MDCG 2019-11 (revisione 1, giugno 2025) propone un albero di decisione.

### L'albero di decisione applicato ad Auscultrix

| Domanda (MDCG 2019-11) | Risposta |
|---|---|
| È un software? | Sì. |
| Pilota o influenza un dispositivo medico? | No. |
| Elabora i dati oltre la semplice memorizzazione, comunicazione o ricerca? | Sì: legge l'umore dal testo e sceglie i media. |
| Lo fa a beneficio della singola persona? | Sì. |
| Ha una finalità medica (art. 2(1))? | **Dipende da come viene presentato.** |

### Dove la presentazione è a rischio

| Dove | Formulazione | Perché pesa |
|---|---|---|
| Titolo della tesi | «…attraverso la **musicoterapia digitale**…» | «Terapia» richiama un trattamento. |
| Tesi §1.3, §2.10, §10.1 | media «annotati con gli esiti Cochrane che dichiarano di servire (depressione, ansia, stato mentale…)» | Collega i media a esiti di malattie. |
| Codice (`lib/cochrane-evidence.js`) | etichette «depression», «anxiety»; una nota «Gli esiti della selezione seguono le review Cochrane» | Oggi la nota e il pulsante sono nascosti e mai mostrati; se fossero mostrati diventerebbero una dichiarazione rivolta all'utente. |
| Store e README | «opera di **mediaterapia** quotidiana» | Meno forte, accompagnato da «non una cura medica»; va tenuto sotto controllo. |
| Interfaccia | «Il tuo momento di cura» | In italiano «cura» vuol dire anche *care*; nessuna malattia nominata. |

**Lettura.** Con l'uso dichiarato di oggi («accompagna con media che confortano… Non è un dispositivo medico e non sostituisce una cura») Auscultrix rientra plausibilmente nel benessere. Il rischio di qualificazione nasce dalle formulazioni che lo collegano a depressione, ansia o schizofrenia.

**Dichiarazione d'uso proposta** (da usare uguale in store, README, tesi e pannello):

> Auscultrix è un'estensione per il browser che propone musica, libri, film e paesaggi a partire da come la persona dice di sentirsi. È pensata per l'uso quotidiano e volontario di adulti. Non diagnostica, non monitora e non tratta alcuna condizione di salute, e non sostituisce l'aiuto di un professionista.

### Se un giorno si volesse un uso medico

- **Classe.** Con la regola 11 vigente (allegato VIII), un software che fornisce informazioni usate per prendere decisioni a fini diagnostici o terapeutici è almeno di classe IIa; un software che non fornisce tali informazioni ricade nella classe I. La classe dipenderebbe dalla formulazione esatta dell'uso previsto e andrebbe motivata con le guide MDCG 2019-11 e MDCG 2021-24.
- **Revisione in corso.** La proposta COM(2025) 1023 del 16 dicembre 2025 renderebbe la classe I il caso di base per il software, salendo solo in situazioni gravi o critiche. A ottobre 2026 aveva superato il voto delle commissioni IMCO e BUDG del Parlamento; il voto in plenaria è atteso nel primo trimestre 2027. **Non è legge**: fino all'adozione vale la regola 11 attuale.
- Anche la classe I comporta tutti gli obblighi del fabbricante: le attività sono elencate al §8.2.

## 3. AI Act

- **È un sistema di IA?** L'art. 3(1) definisce un sistema che, per obiettivi espliciti o impliciti, *deduce* dagli input come generare output. Le linee guida della Commissione sulla definizione (febbraio 2025), richiamando il considerando 12, escludono i sistemi basati su regole definite unicamente da persone fisiche. Il motore di Auscultrix è un lessico scritto a mano con regole fisse (negazione, intensità, contrasto) e una formula con pesi scelti a mano: **probabilmente non è un sistema di IA**. L'interpretazione va confermata, perché i confini indicati dalle linee guida non sono netti.
- **Riconoscimento delle emozioni.** Anche se lo fosse, non sarebbe un «sistema di riconoscimento delle emozioni» (art. 3(39)): quella definizione richiede **dati biometrici** (considerando 18). Auscultrix legge il testo e, dalla foto, solo colore e luminosità medi dell'intera immagine, senza individuare volti.
- **Da evitare.** Un'analisi delle espressioni del volto o della voce lo trasformerebbe in un sistema di riconoscimento delle emozioni: ad alto rischio (allegato III, punto 1, lettera c), con obblighi di trasparenza (art. 50(3)) e vietato nei luoghi di lavoro e negli istituti di istruzione salvo motivi medici o di sicurezza (art. 5(1)(f)).
- **Se in futuro si usasse un modello appreso dai dati** (per esempio un classificatore per l'italiano), Auscultrix diventerebbe un sistema di IA. Si applicherebbero l'alfabetizzazione in materia di IA (art. 4, attenuato dal *Digital Omnibus*) e, se fosse anche un dispositivo medico soggetto a organismo notificato, i requisiti per l'alto rischio (art. 6(1)).
- **Date.** Il *Digital Omnibus on AI* (GU L del 24 luglio 2026, in vigore dal 27 luglio 2026) ha spostato gli obblighi per l'alto rischio al 2 dicembre 2027 (allegato III) e al 2 agosto 2028 (allegato I, che comprende i dispositivi medici). Gli obblighi di trasparenza dell'art. 50 si applicano dal 2 agosto 2026.

## 4. Protezione dei dati

### Che cosa viene elaborato, e dove (5.1)

| Dato | Dove | Chi lo vede |
|---|---|---|
| Testo scritto nel diario | solo in memoria, mai su disco | nessuno |
| Foto dell'umore | memoria di sessione del browser, cancellata alla chiusura | nessuno |
| Livello di crisi | solo in memoria | nessuno |
| Energia, valenza, bersaglio e attività delle ultime sessioni | `chrome.storage.local` | chi usa lo stesso profilo del browser; cancellabile |
| Brani riprodotti | YouTube, nella scheda aperta | YouTube, e la cronologia dell'account YouTube se la persona ha effettuato l'accesso |
| Titolo e artista dei brani (solo se la persona attiva i testi) | LRCLIB | LRCLIB |
| Indirizzo IP e tipo di browser | YouTube, i.ytimg.com, open.spotify.com, Bandcamp, LRCLIB (se attivo), siti aperti dai link | quei servizi |

### Punti da valutare

- **Ruolo dello sviluppatore.** Chi distribuisce un software che elabora i dati solo sul dispositivo e non li riceve, secondo l'interpretazione prevalente, non è titolare di quel trattamento. Per le richieste che l'estensione fa partire verso terzi, la sentenza *Fashion ID* (C-40/17, 2019) ha riconosciuto la contitolarità di chi integra uno strumento che trasmette dati a un terzo; se il ragionamento si estenda a un'estensione è una **questione aperta** da sottoporre a un legale. La 5.1 riduce comunque i flussi al minimo e li elenca nell'informativa.
- **Dati sulla salute.** Ciò che una persona scrive sul proprio stato può rivelare informazioni sulla salute (art. 9 GDPR). Oggi non lascia il dispositivo e non viene salvato. Qualunque funzione che lo trasmettesse (sincronizzazione, analisi online, statistiche) richiederebbe una base giuridica dell'art. 9(2), quasi certamente il consenso esplicito, e una valutazione d'impatto (art. 35).
- **Memoria del dispositivo** (ePrivacy, art. 5(3)). Salvare dati sul dispositivo per una funzione chiesta dalla persona è «strettamente necessario» e non richiede consenso; la ricerca dei testi, che non lo è, è facoltativa e spenta in partenza.
- **Minori.** In Italia il consenso ai servizi della società dell'informazione vale dai 14 anni (art. 8 GDPR e art. 2-quinquies del Codice privacy): rileva solo se un titolare tratta dati in base al consenso, cosa che oggi non accade. La modalità per i minori resta prudente (solo musica, nessuna donazione).
- **Protezione fin dalla progettazione** (art. 25). Rispettata in sostanza: minimizzazione, conservazione limitata, cancellazione completa con un gesto, nessun account.
- **Studi di validazione** (`piano-di-validazione.md`). Lì un titolare c'è (l'Accademia o il gruppo di ricerca): servono informativa, consenso esplicito per i dati sulla salute, valutazione d'impatto, parere del comitato etico, conservazione limitata.

## 5. Sicurezza informatica

- **Cyber Resilience Act.** Gli obblighi di segnalazione delle vulnerabilità sfruttate si applicano dall'11 settembre 2026, gli obblighi principali dall'11 dicembre 2027. Il regolamento riguarda i prodotti messi a disposizione nell'ambito di un'attività commerciale; i dispositivi medici sono esclusi perché coperti dall'MDR. Se una distribuzione gratuita con richiesta di donazioni rientri nel suo campo va chiarito con un legale.
- **Buone pratiche già presenti:** nessuna dipendenza esterna nel codice eseguito, CSP che ammette solo script del pacchetto, nessuna funzione che esegua codice dinamico, permessi ridotti, build riproducibile con impronte SHA-256, blocco del build se compaiono credenziali (UT-SEC-11).
- **Da aggiungere:** un recapito pubblico per segnalare vulnerabilità e un registro delle versioni con le correzioni di sicurezza.

## 6. Accessibilità

L'Atto europeo sull'accessibilità (Direttiva (UE) 2019/882) riguarda categorie precise di prodotti e servizi e plausibilmente non un'estensione gratuita. Il riferimento di buona pratica resta WCAG 2.2 livello AA (ripreso da EN 301 549). Stato: nessuna violazione rilevata dai controlli automatici della 5.1 su nomi, alternative testuali, contrasto, dimensione dei bersagli (≥ 24 px), tastiera e dialoghi; mancano un controllo con axe-core e prove con lettori di schermo reali.

## 7. Regole degli store

- **Chrome Web Store:** scopo unico dichiarato; uso limitato dei dati; dichiarazione delle pratiche sui dati coerente con l'informativa; nessun codice remoto. Le affermazioni sulla salute nella scheda vanno evitate o sostenute da prove.
- **Firefox Add-ons (AMO):** il manifest Firefox dichiara `data_collection_permissions` «none». È coerente con la 5.1 per ciò che riguarda lo sviluppatore, che non riceve dati; va però ricontrollato con le categorie di Mozilla per la ricerca facoltativa dei testi su LRCLIB, che invia a un terzo titolo e artista dei brani. Prima dell'invio: `web-ext lint` (non eseguito in questa revisione, C-42).
- **Safari:** richiede la conversione con Xcode e la distribuzione tramite App Store, con le relative etichette sulla privacy.

## 8. Attività ancora necessarie

### 8.1 Per restare un prodotto di benessere (scenario coerente con la tesi)

1. Adottare la dichiarazione d'uso del §2 ovunque: store, README, informativa, pannello, tesi.
2. Togliere dal titolo e dai testi le formulazioni che collegano il prodotto a disturbi o terapie (T-16, T-17), oppure spostarle esplicitamente nella discussione accademica, separata dalla descrizione del prodotto.
3. Tenere nascosto il riquadro Cochrane del pannello, o riformularlo come informazione di contesto senza promesse di esito.
4. Chiedere un parere legale breve su: qualificazione MDR, ruolo GDPR dello sviluppatore per i flussi verso terzi, campo di applicazione del CRA.
5. Pubblicare l'informativa 5.1 e allineare le dichiarazioni degli store.
6. Eseguire `web-ext lint` e la prova su Firefox reale; per Safari, la conversione con Xcode.
7. Completare gli studi V-2, V-3 e V-5 del piano di validazione, soprattutto per i rischi R-01 e R-05 (`analisi-dei-rischi.md`).
8. Aggiungere un recapito per le segnalazioni di sicurezza e verificare i numeri d'aiuto a ogni versione.

### 8.2 Se si volesse un dispositivo medico software

Sono attività di un **fabbricante** (una persona giuridica o fisica che si assume la responsabilità del prodotto), non di una tesi.

1. **Uso previsto e affermazioni cliniche** precise: popolazione, condizione, contesto d'uso, utilizzatori, controindicazioni.
2. **Qualificazione e classificazione** motivate (MDCG 2019-11 rev.1, MDCG 2021-24, regola 11), verificando l'esito della revisione dell'MDR.
3. **Sistema di gestione della qualità** conforme all'art. 10(9) MDR, di norma secondo ISO 13485:2016.
4. **Persona responsabile del rispetto della normativa** (art. 15).
5. **Ciclo di vita del software** secondo IEC 62304: piano di sviluppo, requisiti, architettura, verifica, rilascio, manutenzione, gestione dei problemi, gestione delle configurazioni, elenco dei componenti di terzi (qui: Chrome, YouTube, i cataloghi).
6. **Software per la salute** secondo IEC 82304-1: requisiti di prodotto, validazione, documenti di accompagnamento.
7. **Gestione del rischio** secondo ISO 14971, partendo da `analisi-dei-rischi.md`.
8. **Ingegneria dell'usabilità** secondo IEC 62366-1: specifica d'uso, scenari collegati ai rischi, valutazioni formative e sommativa.
9. **Sicurezza informatica** secondo l'allegato I, sezione 17 dell'MDR e la guida MDCG 2019-16.
10. **Valutazione clinica** (art. 61, allegato XIV; guida MDCG 2020-1 per il software): associazione clinica valida, prestazioni tecniche, prestazioni cliniche. Con molta probabilità servirebbe un'**indagine clinica** (art. 62 e seguenti, ISO 14155:2020) autorizzata secondo le procedure nazionali e con il parere di un comitato etico.
11. **Documentazione tecnica** (allegati II e III), istruzioni per l'uso ed etichettatura (allegato I, capo III).
12. **Sorveglianza post-commercializzazione** e vigilanza (art. 83–92): piano, rapporti periodici, segnalazione degli incidenti gravi.
13. **UDI e registrazione** in EUDAMED; adempimenti nazionali previsti dalla normativa italiana di adeguamento (D.Lgs. 137/2022).
14. **Valutazione della conformità**: autocertificazione per la classe I, **organismo notificato** dalla classe IIa; dichiarazione di conformità UE (allegato IV) e marcatura CE solo al termine.
15. **Protezione dei dati** come titolare: base giuridica per i dati sulla salute, valutazione d'impatto, contratti con i fornitori.
16. **AI Act**, se il motore usasse un modello appreso dai dati.
17. **Dipendenze di piattaforma.** Un dispositivo medico che dipende da YouTube (contenuti, pubblicità, cambi del sito) dovrebbe giustificare questi rischi o rinunciarvi.

## 9. Fonti

Riferimenti completi in `docs/scientifico/bibliografia.md`, sezione «Norme e fonti regolatorie». Le norme tecniche ISO e IEC sono citate per titolo: il loro testo non è stato consultato.
