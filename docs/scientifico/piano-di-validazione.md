# Piano di validazione scientifica

Versione 1 · 6 novembre 2026 · riferito ad Auscultrix 5.1.1

Questo piano descrive gli studi che servono per passare da «funziona e ha basi plausibili» a «è stato misurato su persone». Nessuno di questi studi è stato ancora svolto. I valori indicati come soglie sono **obiettivi decisi prima**, non risultati.

## 1. Da dove si parte

| Componente | Funziona tecnicamente | Plausibile | Validato sperimentalmente | Validato clinicamente |
|---|---|---|---|---|
| Lettura della valenza dal testo | sì | sì | in parte: 5 corpora inglesi non di dominio, r 0,20–0,52 | no |
| Lettura dell'arousal dal testo | sì | debole | no: r = 0,02 su EmoBank | no |
| Rilevazione di crisi e sostanze | sì | sì (elenco a frasi chiave) | no: solo casi di prova scritti dagli sviluppatori | no |
| Coordinate dei brani | sì | in parte: formula euristica, corpora annotati a mano | no | no |
| Traiettoria ISO della playlist | sì: la simulazione mostra che il percorso viene seguito | in parte: il principio è clinico, i parametri (25 min, σ = 0,15, passo 0,3) sono scelte di progetto | no | no |
| Effetto delle sessioni sull'umore | — | da dimostrare: Starcke e colleghi (2021) non trovano differenze tra percorso ISO e sola musica allegra | no | no |
| Usabilità | sì | — | no: questionario per il focus group pronto, non ancora somministrato | — |

## 2. Domande

- **D1. Lettura.** In italiano, la valenza e l'energia lette dal motore concordano con quelle che la persona dichiara di sé e con quelle di annotatori indipendenti?
- **D2. Sicurezza.** Il rilevatore riconosce le espressioni di crisi scritte in italiano, comprese quelle indirette, senza troppi falsi allarmi?
- **D3. Brani.** Le coordinate di energia e valenza dei brani corrispondono a come gli ascoltatori percepiscono quei brani?
- **D4. Usabilità e accettabilità.** Specialisti e utenti trovano lo strumento comprensibile, sicuro e utilizzabile?
- **D5. Fattibilità di uno studio sull'effetto.** È possibile reclutare, trattenere e misurare persone in uno studio pilota? Quanto varia la risposta? Ci sono peggioramenti dell'umore?

Ogni studio qui sotto risponde a una domanda.

## 3. Studi

### V-1 · Taratura del lessico sulle norme pubblicate (studio a tavolino, nessun partecipante)

- **Perché.** Le coordinate del lessico (`lib/affect-lexicon.js`) sono state scelte a mano. Il commento al codice e l'Appendice C della tesi dicevano «calibrate» sulle norme NRC VAD e ANEW italiano, ma nessun confronto numerico è stato fatto (corretto nel codice in 5.1).
- **Materiali.** NRC VAD Lexicon (Mohammad, 2018; uso libero per ricerca, verificare i termini); norme ANEW italiane (Montefinese et al., 2014; materiale supplementare, verificare i termini).
- **Procedura.** Per ogni radice e frase del lessico si cercano le parole corrispondenti nelle norme (forme flesse incluse). Si confrontano valenza e arousal del lessico con quelli delle norme, riportati su 0–1.
- **Misure.** Copertura (quante voci hanno una corrispondenza); Pearson e Spearman con IC al 95 %; errore assoluto medio; elenco delle voci che differiscono di più di 0,2.
- **Decisione.** Le voci in disaccordo si correggono **solo** se la differenza non è spiegata dal contesto d'uso (per esempio «stanco» come stato della persona e non come parola isolata). Ogni modifica va registrata e il set di verifica di V-2 resta chiuso fino alla fine.
- **Uscita.** Una tabella nel repository e la frase corretta per la tesi.

### V-2 · Corpus italiano di autodescrizioni

- **Perché.** È la misura che manca di più (C-39): il motore non è mai stato provato in italiano su testi scritti da altri.
- **Partecipanti.** Adulti volontari (≥ 18 anni) reclutati tra studenti e personale dell'Accademia e attraverso il focus group. Nessun criterio clinico.
- **Procedura.** Ogni partecipante scrive, in una pagina anonima, una o più risposte brevi a «Come stai, davvero?» e subito dopo si valuta con il Self-Assessment Manikin (Bradley & Lang, 1994) o la Affect Grid (Russell, Weiss & Mendelsohn, 1989): piacevolezza e attivazione su 9 punti. Nessun dato identificativo; istruzione esplicita a non scrivere nomi, luoghi o fatti riconoscibili.
- **Annotazione indipendente.** Tre annotatori, che non conoscono il motore né le valutazioni degli autori, valutano ogni testo con la stessa scala. Accordo con l'α di Krippendorff (Hayes & Krippendorff, 2007), intervallare. Soglie indicate da Krippendorff: 0,667 per conclusioni provvisorie, 0,800 per dati affidabili.
- **Separazione dei dati.** Il corpus si divide **prima** di guardare i risultati: sviluppo (circa 200 testi, usabile per correggere il lessico) e verifica (circa 250 testi, chiusa ed eseguita una sola volta). L'analisi e le soglie vanno pre-registrate (per esempio su OSF).
- **Dimensione.** Con 250 testi la correlazione si stima con un margine di ±0,10 circa quando r ≈ 0,5 (z di Fisher), e un'accuratezza dell'80 % con un margine di ±5 punti (Wilson). Per distinguere r = 0,3 da 0 (potenza 0,8, α = 0,05) bastano circa 85 testi.
- **Misure.** Pearson e Spearman tra motore e autovalutazione, e tra motore e media degli annotatori; accuratezza di polarità, copertura, accuratezza quando decide (stessa definizione di `validazione-esterna.md`); numero di **inversioni** (uno stato negativo letto come positivo); casi in cui il bersaglio ISO alzerebbe l'energia di uno stato negativo e agitato.
- **Obiettivi fissati prima.** Valenza: r ≥ 0,50 con limite inferiore dell'IC ≥ 0,40; accuratezza quando decide ≥ 80 %; inversioni ≤ 2 %. Arousal: se r < 0,30, ridurre il peso del testo nella fusione con il cursore e dirlo nell'interfaccia.
- **In parallelo.** Fatto il 19 novembre 2026 su MultiEmotions-It (r = 0,31; vedi `validazione-esterna.md`); FEEL-IT si aggiunge quando il corpus è ottenuto con il modulo di richiesta: lo script lo legge già. Il risultato indica la priorità per V-1: il lessico dei negativi (richiamo 19 %).

### V-3 · Rilevatore di crisi e sostanze, con clinici

- **Perché.** Oggi l'elenco di frasi è verificato solo su casi scritti da chi l'ha sviluppato.
- **Materiali.** Due o più clinici del dipartimento di salute mentale scrivono, dalla loro esperienza e **senza dati di pazienti reali**: (a) espressioni di ideazione suicidaria e autolesionismo, esplicite e indirette («non ce la faccio più», «vorrei sparire»), (b) espressioni d'uso di sostanze, (c) frasi che somigliano a queste ma non lo sono («stanco morto», «muoio dal ridere», «canna da pesca»).
- **Accordo.** Ogni frase è etichettata da due clinici in modo indipendente; si usano solo quelle con accordo, e si riporta l'α.
- **Misure.** Sensibilità e specificità con IC di Wilson, separatamente per frasi esplicite e indirette; esame qualitativo di ogni frase mancata.
- **Obiettivo.** Sensibilità ≥ 95 % sulle frasi esplicite con limite inferiore dell'IC ≥ 90 %. Sulle indirette l'obiettivo si decide con i clinici dopo aver visto la distribuzione: un elenco di frasi non può prometterne il riconoscimento completo, e la scheda d'aiuto resta sempre raggiungibile dal pannello.
- **Revisione dei testi.** I clinici rivedono anche le parole delle schede di aiuto, la loro posizione e la scelta di non avviare la musica in crisi.

### V-4 · Coordinate dei brani

- **Perché.** Il percorso ISO è buono quanto le coordinate dei brani. La formula dell'energia ha pesi euristici e i corpora sono annotati a mano.
- **V-4a, formula su un benchmark pubblico.** Calcolare l'energia con la stessa formula sugli estratti audio del dataset DEAM (Aljanaki, Yang & Soleymani, 2017), che riporta valutazioni di arousal e valenza date da ascoltatori. Misure: correlazione tra energia calcolata e arousal annotato. Questo confronto dice se i pesi hanno senso o vanno stimati sui dati.
- **V-4b, ascolto dei cataloghi.** Un campione stratificato di brani dai corpora (per esempio 15 per quadrante, 60 in tutto) viene valutato da 20–30 ascoltatori con il SAM, in ordine casuale e senza sapere la categoria. Misure: α tra ascoltatori, correlazione e errore medio rispetto alle coordinate del catalogo, quadrante corretto.
- **Decisione.** I brani con coordinate lontane dalla percezione media escono dal percorso calibrato o vengono ricollocati, con la provenienza aggiornata.

### V-5 · Usabilità e revisione degli specialisti

- **Strumenti.** Il questionario Google Moduli per il focus group, già preparato, con: System Usability Scale (Brooke, 1996; media di riferimento circa 68 secondo Lewis, 2018), domande sul linguaggio, sulle schede di aiuto e sui rischi percepiti, domande aperte. Per una valutazione più completa della qualità si può aggiungere la Mobile App Rating Scale (Stoyanov et al., 2015), adattata all'estensione.
- **Formativa.** Sessioni «a voce alta» con 5–8 persone per ciclo, su compiti precisi: primo avvio, scrivere come si sta, capire perché la playlist è fatta così, spegnere la Visione, trovare l'aiuto, cancellare i dati. Si annotano errori e incomprensioni, si corregge e si ripete.
- **Sommativa.** Solo se lo scopo dichiarato cambiasse verso un uso sanitario: valutazione di usabilità secondo IEC 62366-1 sugli scenari collegati ai rischi (vedi `docs/rapporti/analisi-dei-rischi.md`).
- **Specialisti.** 6–12 professionisti della salute mentale. Le loro risposte sono pareri esperti: non misurano l'efficacia.

### V-6 · Studio pilota di fattibilità

- **Disegno.** Pilota randomizzato a tre bracci, riportato secondo l'estensione CONSORT per studi pilota (Eldridge et al., 2016). Sessione di 25 minuti in laboratorio silenzioso, con cuffie.
  - A: playlist ISO di Auscultrix;
  - B: gli stessi brani calibrati del catalogo, in ordine casuale;
  - C: brani del catalogo già vicini al bersaglio, senza percorso (il confronto suggerito da Starcke et al., 2021).
- **Partecipanti.** Adulti senza criteri clinici. Criteri di esclusione e di interruzione decisi con i clinici; una persona di riferimento presente; la scheda di aiuto consegnata a tutti.
- **Misure.** Fattibilità (reclutamento, completamento, dati mancanti); Affect Grid prima, a metà e dopo; PANAS (Watson, Clark & Tellegen, 1988) prima e dopo; eventi avversi, in particolare **peggioramento dell'umore** (Garrido e Schubert, 2015, riportano che l'ascolto di musica triste può aumentare l'umore depresso in chi tende a rimuginare).
- **Dimensione.** 12 persone per braccio (Julious, 2005), più il 20 % per gli abbandoni: circa 45 persone. Lo scopo è stimare la variabilità e la fattibilità, **non** dimostrare un effetto.
- **Prima di iniziare.** Parere del comitato etico competente, consenso informato scritto, valutazione d'impatto sulla protezione dei dati: le valutazioni dell'umore raccolte in uno studio sono dati sulla salute ai sensi dell'art. 9 del GDPR.

### V-7 · Indagine clinica (solo se lo scopo diventasse medico)

Se Auscultrix venisse dichiarato utile a prevenire, alleviare o trattare un disturbo, servirebbe un'indagine clinica secondo il Regolamento (UE) 2017/745 e la norma ISO 14155:2020, condotta da un fabbricante con un sistema di gestione della qualità. È fuori dallo scopo di una tesi; le attività sono elencate in `docs/rapporti/regolatorio.md`.

## 4. Regole comuni

- **Dati separati.** Nessun dato di verifica serve a tarare. Se un set viene «guardato» per correggere il motore, da quel momento diventa di sviluppo e va dichiarato (come è successo al set interno, 74 % → 98 %).
- **Pre-registrazione** di ipotesi, misure, soglie e analisi prima della raccolta.
- **Script nel repository.** Le analisi riusano `tests/external/eval-external.mjs`, che calcola già correlazioni con IC, Wilson e McNemar.
- **Tutto viene riportato,** anche i risultati sfavorevoli.
- **Dati minimi:** nessun testo associato a un'identità; conservazione limitata alla durata dello studio; corpus pubblicato solo se il consenso lo prevede.

## 5. Ordine consigliato

| Ordine | Studio | Serve | Dipende da |
|---|---|---|---|
| 1 | V-1 lessico sulle norme | ore di lavoro, nessun partecipante | accesso ai file delle norme |
| 2 | V-5 focus group con gli specialisti | il questionario esiste | data con il dipartimento |
| 3 | V-3 rilevatore di crisi | 2 clinici | — |
| 4 | V-2 corpus italiano | 3 annotatori, ~100 volontari | V-1 concluso |
| 5 | V-4 coordinate dei brani | DEAM; 20–30 ascoltatori | — |
| 6 | V-6 pilota | comitato etico, clinici | V-2, V-3, V-4 |

## Riferimenti

Tutti i riferimenti sono verificati: vedi `docs/scientifico/bibliografia.md`.
