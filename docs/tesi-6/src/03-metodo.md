# 3 | Metodo | Method

## 3.1 | Ricerca attraverso il progetto | Research through design

IT: Il lavoro segue le sei fasi della Design Science Research (Peffers et al., 2007): identificare il problema, definire gli obiettivi, progettare e sviluppare l'artefatto, dimostrarlo, valutarlo, comunicarlo. La valutazione non è un capitolo finale ma un ciclo: ogni versione del software è stata misurata, e le misure hanno cambiato il progetto. Alla cornice si aggiungono i principi del design centrato sulla persona (Norman, 2013; Sanders e Stappers, 2008): poca complessità visibile, riscontri chiari, azioni reversibili, linguaggio non tecnico.
EN: The work follows the six phases of Design Science Research (Peffers et al., 2007): identify the problem, define objectives, design and develop the artefact, demonstrate it, evaluate it, communicate it. Evaluation is not a final chapter but a cycle: every version of the software was measured, and the measurements changed the design. Human-centred design principles complement the framework (Norman, 2013; Sanders and Stappers, 2008): little visible complexity, clear feedback, reversible actions, non-technical language.

IT: Come ricerca artistica (Borgdorff, 2012), il software è anche un'opera: il diario come forma, la sessione come arco temporale, il suono come spazio. La formazione cinematografica di chi scrive si legge nelle scelte di tempo: la dissolvenza lenta, il montaggio a tre fotogrammi al secondo, lo zoom che respira con la durata del brano, il paesaggio sonoro che entra e si congeda con un *crénau*.
EN: As artistic research (Borgdorff, 2012), the software is also a work: the diary as form, the session as temporal arc, sound as space. The author's film training shows in the choices of time: the slow dissolve, three-frames-per-second editing, the zoom that breathes with the track's length, the soundscape that enters and takes its leave with a *crénau*.

## 3.2 | Livelli di evidenza | Levels of evidence

IT: Per non confondere ciò che il software fa con ciò che si spera produca, ogni affermazione è collocata su una scala a quattro livelli.
EN: To avoid confusing what the software does with what it is hoped to achieve, every claim is placed on a four-level scale.

TABLE: Tabella 3.1 — Livelli di evidenza usati in tutta la tesi. | Table 3.1 — Levels of evidence used throughout the thesis.
| Livello · Level | Significato | Meaning |
|---|---|---|
| A | Funziona tecnicamente: verificato da test automatici che passano | Works technically: verified by passing automated tests |
| B | Scientificamente plausibile: coerente con la letteratura, non misurato su questo prodotto | Scientifically plausible: consistent with the literature, not measured on this product |
| C | Validato sperimentalmente: confrontato con dati annotati da persone, mai visti in sviluppo, con intervalli di confidenza | Experimentally validated: compared with human-annotated data unseen during development, with confidence intervals |
| D | Validato clinicamente: effetti su benessere o salute misurati in uno studio con persone | Clinically validated: effects on wellbeing or health measured in a study with people |

IT: La Tabella 12.5 riassume dove si colloca ogni funzione. In sintesi: tutto raggiunge A; molto raggiunge B; solo la valenza letta dal testo inglese raggiunge, in parte, C; nulla raggiunge D.
EN: Table 12.5 summarises where each function stands. In short: everything reaches A; much reaches B; only valence read from English text partly reaches C; nothing reaches D.

## 3.3 | Revisione critica come metodo | Critical review as method

IT: Tra la 5.0 e la 6.0 il lavoro è stato sottoposto a una revisione sistematica: ogni affermazione della tesi è stata confrontata con il codice, con le misure e con le fonti primarie. Ne sono uscite trentacinque correzioni, dall'errata versione citata alle affermazioni non verificabili («supera web-ext lint»), dalle funzioni descritte ma inesistenti a una formula scritta in una forma diversa da quella implementata. L'Appendice B le elenca con il punto in cui questa edizione le recepisce. Il metodo è semplice e, per un lavoro che si misura con la fiducia delle persone, necessario: *dire esattamente che cosa è stato fatto e che cosa è stato misurato*.
EN: Between 5.0 and 6.0 the work underwent a systematic review: every claim in the thesis was compared with the code, the measurements and the primary sources. Thirty-five corrections came out of it, from a wrongly cited version to unverifiable claims ("passes web-ext lint"), from functions described but non-existent to a formula written in a form other than the implemented one. Appendix B lists them with the place where this edition takes them on board. The method is simple and, for a work that deals with people's trust, necessary: *say exactly what was done and what was measured*.

## 3.4 | Strumenti di verifica | Verification instruments

IT: La verifica usa quattro strumenti, tutti nel repository e tutti eseguibili da chi legge (Appendice C):
- **test di unità** (91, Node.js, nessuna dipendenza): logica pura del motore affettivo, della playlist, del paesaggio sonoro, della privacy e della sicurezza;
- **test end-to-end** (Chromium con Playwright, quando installato): l'estensione caricata in un browser vero, con servizi esterni simulati;
- **banco acustico**: il motore sonoro reso in un `OfflineAudioContext` e misurato sulla sua uscita (§12.4);
- **statistiche**: correlazioni con intervalli di Fisher, proporzioni con intervalli di Wilson, intervalli bootstrap di percentile (B = 5000, generatore con seme), test esatto di McNemar per confronti appaiati, κ di Cohen.
EN: Verification uses four instruments, all in the repository and all runnable by the reader (Appendix C):
- **unit tests** (91, Node.js, no dependencies): pure logic of the affective engine, playlist, soundscape, privacy and safety;
- **end-to-end tests** (Chromium with Playwright, when installed): the extension loaded in a real browser, with external services simulated;
- **acoustic bench**: the sound engine rendered in an `OfflineAudioContext` and measured on its output (§12.4);
- **statistics**: correlations with Fisher intervals, proportions with Wilson intervals, percentile bootstrap intervals (B = 5000, seeded generator), exact McNemar test for paired comparisons, Cohen's κ.

IT: Una regola vale per tutti: i set di verifica si guardano una volta sola, e se dopo averli guardati il sistema cambia, quel set non è più una stima indipendente e va dichiarato (§12.3). Il software di build si rifiuta di creare i pacchetti se un test di unità fallisce o se il motore affettivo scende sotto le soglie di regressione.
EN: One rule applies throughout: test sets are looked at only once, and if the system changes after looking at them, that set is no longer an independent estimate and must be declared as such (§12.3). The build software refuses to create the packages if a unit test fails or if the affective engine falls below the regression thresholds.

## 3.5 | Riproducibilità | Reproducibility

IT: Ogni numero della tesi è rigenerabile. Il motore sonoro usa un generatore pseudo-casuale con seme: stessa entrata, stesso seme, stesso audio (§12.4, A5). Le statistiche bootstrap usano a loro volta un seme fisso. I dati esterni non sono nel pacchetto per licenza e dimensione, ma gli script indicano dove scaricarli e producono gli stessi file di risultati. I rapporti dei test e la matrice di tracciabilità tra requisiti e test sono generati dall'esecuzione, non scritti a mano.
EN: Every number in the thesis can be regenerated. The sound engine uses a seeded pseudo-random generator: same input, same seed, same audio (§12.4, A5). Bootstrap statistics also use a fixed seed. External data are not in the package for licensing and size reasons, but the scripts say where to obtain them and produce the same result files. Test reports and the requirement-to-test traceability matrix are generated by the run, not written by hand.

## 3.6 | Vincoli etici come requisiti | Ethical constraints as requirements

IT: Quattro vincoli hanno la stessa autorità dei requisiti funzionali. **Nessun linguaggio diagnostico**: l'interfaccia chiede «come stai?», non somministra scale. **Nessun server**: l'elaborazione affettiva resta sul dispositivo. **Sicurezza sensoriale**: le immagini restano sotto le soglie di lampeggiamento, il suono sotto limiti di livello, densità e modulazione. **Trasparenza**: chi cura i cataloghi è identificabile, l'avvertenza è esplicita, le risorse di aiuto sono sempre raggiungibili. Ciò che è escluso lo è di conseguenza: la rilevazione *passiva* dell'umore (da comportamento, voce, volto o sensori), l'ascolto dell'ambiente con il microfono, i battimenti binaurali presentati come terapia.
EN: Four constraints carry the same authority as functional requirements. **No diagnostic language**: the interface asks "how are you?", it does not administer scales. **No server**: affective processing stays on the device. **Sensory safety**: images stay below flash thresholds, sound below limits of level, density and modulation. **Transparency**: whoever curates the catalogues is identifiable, the disclaimer is explicit, help resources are always reachable. What is excluded follows: *passive* mood detection (from behaviour, voice, face or sensors), listening to the environment through the microphone, binaural beats presented as therapy.

IT: Va precisato che l'umore viene comunque *stimato* dal software: dal testo che la persona sceglie di scrivere, dalle etichette, dal cursore e dai colori di una foto che sceglie di caricare. Ciò che è escluso è la stima a sua insaputa.
EN: It should be made clear that mood is still *estimated* by the software: from the text the person chooses to write, from the labels, the slider and the colours of a photo they choose to upload. What is excluded is estimation without their knowledge.
