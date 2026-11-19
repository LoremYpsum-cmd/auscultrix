# 1 | Introduzione | Introduction

## 1.1 | Contesto | Context

IT: Questa tesi nasce nel Diploma Accademico di Secondo Livello DASL08, Arti e Tecnologie Digitali, dell'Accademia di Belle Arti di Catania, dopo un Triennio in Cinema con indirizzo Regia (DAPL11). Si colloca all'incrocio di tre pratiche che il corso tiene insieme: il progetto di interfacce e prototipi, la composizione e la progettazione del suono, l'implementazione software. Non è un trattato clinico né la documentazione di un prodotto sanitario: è un lavoro di ricerca progettuale che si chiede come le arti digitali possano accompagnare il benessere emotivo quotidiano senza prendere in prestito il linguaggio della diagnosi.
EN: This thesis was developed within the second-level Academic Diploma DASL08, Arts and Digital Technologies, at the Accademia di Belle Arti di Catania, after a first-level diploma in Cinema and Film Directing (DAPL11). It sits at the crossing of three practices the programme holds together: interface and prototype design, sound composition and design, and software implementation. It is neither a clinical treatise nor the documentation of a health product: it is design research asking how the digital arts can keep people company in their daily emotional life without borrowing the language of diagnosis.

IT: La domanda è maturata osservando due ambienti molto diversi: il reparto di riabilitazione psicofisica dell'Ospedale Busacca di Scicli e il Teatro Coppola di Catania. In entrambi ricorre lo stesso bisogno: strumenti che si possano usare anche fuori da una seduta strutturata, che non richiedano competenze tecniche, che non espongano dati delicati a piattaforme opache e che non trasformino l'ascolto in sovrastimolazione.
EN: The question took shape while observing two very different settings: the psychophysical rehabilitation ward of the Busacca Hospital in Scicli and the Teatro Coppola in Catania. Both share the same need: tools that can be used outside a structured session, that require no technical skills, that do not expose sensitive data to opaque platforms and that do not turn listening into overstimulation.

IT: Il browser è il luogo in cui molte persone ascoltano già musica. Un'estensione vive accanto ai player che si usano ogni giorno, si installa da uno store ufficiale e non richiede un'applicazione separata. È anche un ambiente vincolato: Manifest V3 vieta il codice remoto, impone permessi dichiarati e un ciclo di vita che può interrompere il programma in qualunque momento. Questi vincoli, come si vedrà, sono diventati materiale di progetto.
EN: The browser is where many people already listen to music. An extension lives beside the players people use every day, installs from an official store and needs no separate application. It is also a constrained environment: Manifest V3 forbids remote code, requires declared permissions and has a life cycle that may suspend the program at any moment. These constraints, as will be seen, became design material.

## 1.2 | Domande di ricerca | Research questions

IT: Il lavoro risponde a tre domande, ciascuna legata a un ambito del corso.
EN: The work answers three questions, each tied to an area of the programme.

IT: - **D1, progettuale.** Come si progetta uno strumento quotidiano che permetta di dire come si sta, riceva in cambio musica, suono e media che confortano, e mantenga ogni dato sul dispositivo, senza diagnosi, senza account, senza server?
- **D2, sonora.** Si può comporre in tempo reale, nel browser, un paesaggio sonoro che segua lo stesso percorso graduale della musica, con regole dichiarate, e verificarne il comportamento misurando ciò che esce dagli altoparlanti?
- **D3, computazionale.** Con quale affidabilità, misurata su dati annotati da persone e con quali limiti, un motore trasparente può leggere valenza e arousal da un testo libero?
EN: - **Q1, design.** How is a daily tool designed that lets people say how they feel, receive music, sound and comforting media in return, and keep every piece of data on the device, with no diagnosis, no account and no server?
- **Q2, sound.** Can a soundscape that follows the same gradual path as the music be composed in real time, in the browser, with declared rules, and its behaviour verified by measuring what comes out of the speakers?
- **Q3, computational.** How reliably, as measured on human-annotated data and within what limits, can a transparent engine read valence and arousal from free text?

IT: Le tre domande sono deliberatamente non cliniche. Auscultrix non valuta patologie, non produce punteggi diagnostici e non sostituisce medici, psicologi o musicoterapeuti. Il suo perimetro è il benessere: rende esplicito ciò che le persone fanno già, scegliere musica e storie secondo come si sentono, e lo fa in modo ispezionabile.
EN: The three questions are deliberately non-clinical. Auscultrix does not assess conditions, produce diagnostic scores or replace doctors, psychologists or music therapists. Its scope is wellbeing: it makes explicit what people already do, choosing music and stories according to how they feel, and does so in an inspectable way.

## 1.3 | Obiettivi | Objectives

IT: Dalle domande discendono otto obiettivi operativi:
- un'estensione Manifest V3 per Chrome, con varianti derivate automaticamente per Firefox e Safari;
- una lettura dell'umore trasparente, da testo, etichette, cursore dell'energia e, a scelta, una foto analizzata in locale;
- una playlist costruita con il principio ISO su brani con coordinate emotive documentate;
- un paesaggio sonoro generativo che segua la stessa traiettoria, con esportazioni riproducibili;
- media che confortano oltre la musica, con un inquadramento onesto delle prove disponibili;
- un livello di sicurezza che, davanti a parole di crisi, metta l'aiuto prima di tutto;
- privacy per progetto: inventario dei dati, nessun testo salvato, cancellazione totale;
- una verifica quantitativa riproducibile: test, misure acustiche, statistiche con intervalli di confidenza.
EN: Eight operational objectives follow from the questions:
- a Manifest V3 extension for Chrome, with variants derived automatically for Firefox and Safari;
- a transparent mood reading from text, labels, an energy slider and, optionally, a photo analysed locally;
- a playlist built with the ISO principle from tracks with documented emotional coordinates;
- a generative soundscape following the same trajectory, with reproducible exports;
- comforting media beyond music, with an honest account of the available evidence;
- a safety layer that, faced with words of crisis, puts help before anything else;
- privacy by design: a data inventory, no stored text, complete erasure;
- a reproducible quantitative verification: tests, acoustic measurements, statistics with confidence intervals.

## 1.4 | Contributi | Contributions

IT: Il contributo della tesi non è un singolo algoritmo, ma la coerenza tra domanda, gesto artistico, implementazione ed etica dichiarata, verificata con strumenti quantitativi. In concreto:
- **un'opera sonora generativa con le sue regole esplicite** (Capitolo 9): tre strati con i ruoli del paesaggio sonoro di Schafer, una mappatura affetto → suono fondata sugli studi sugli indizi musicali dell'emozione, una struttura stocastica descritta da processi di Poisson e catene di Markov, uno spazio acustico simulato con leggi fisiche esplicite;
- **un metodo di verifica sull'uscita** (Capitolo 12): il suono viene misurato con gli strumenti della radiodiffusione e del Music Information Retrieval, e la misura ha corretto il progetto;
- **una valutazione onesta del motore testuale**: su dati esterni, con intervalli di confidenza, confronti tra versioni e la dichiarazione di ciò che non funziona;
- **un esempio di privacy per architettura**: un'applicazione affettiva senza server, con un inventario dei dati verificato da un test.
EN: The contribution of the thesis is not a single algorithm but the coherence of question, artistic gesture, implementation and declared ethics, verified with quantitative tools. Concretely:
- **a generative sound work with explicit rules** (Chapter 9): three layers with the roles of Schafer's soundscape, an affect-to-sound mapping grounded in studies of the musical cues of emotion, a stochastic structure described by Poisson processes and Markov chains, a simulated acoustic space with explicit physical laws;
- **a verification method on the output** (Chapter 12): the sound is measured with broadcast and Music Information Retrieval tools, and the measurement corrected the design;
- **an honest evaluation of the text engine**: on external data, with confidence intervals, comparisons across versions and a statement of what does not work;
- **an example of privacy by architecture**: an affective application with no server, with a data inventory checked by a test.

## 1.5 | Il nome | The name

IT: *Auscultrix* è un nome d'agente femminile latino formato da *auscultare*, «ascoltare con attenzione», e dal suffisso *-trix*, lo stesso di *nutrix* e *victrix*: «colei che ascolta». Il nome descrive la funzione (un ascolto attento, non giudicante) e dichiara un genere grammaticale femminile, in contrasto con il neutro-maschile di default della tecnologia di consumo. Il verbo ha anche un senso medico, l'auscultazione; il progetto lo usa nel senso originario e più largo, quello dell'ascolto.
EN: *Auscultrix* is a Latin feminine agent noun formed from *auscultare*, "to listen attentively", and the suffix *-trix*, as in *nutrix* and *victrix*: "she who listens". The name describes the function (attentive, non-judging listening) and declares a feminine grammatical gender, against the default neutral-masculine of consumer technology. The verb also has a medical sense, auscultation; the project uses it in its original and broader sense, that of listening.

## 1.6 | Statuto epistemologico | Epistemological status

IT: È una tesi in Arti e Tecnologie Digitali e va valutata come tale: per la coerenza tra domanda, opera, implementazione ed etica. Il metodo unisce la Design Science Research (Peffers et al., 2007), che struttura la ricerca attraverso la costruzione e la valutazione di un artefatto, e la ricerca artistica (Borgdorff, 2012), per cui l'artefatto è insieme dimostrazione e opera.
EN: This is a thesis in Arts and Digital Technologies and should be assessed as such: by the coherence of question, work, implementation and ethics. The method combines Design Science Research (Peffers et al., 2007), which structures research through building and evaluating an artefact, and artistic research (Borgdorff, 2012), for which the artefact is both demonstration and work.

IT: Il concetto che regge il progetto è quello di **media che confortano**: la pratica volontaria, domestica e non clinica in cui musica, suoni, libri, film e paesaggi lenti accompagnano la regolazione dell'umore. Va distinto da due campi vicini. La musicoterapia è una disciplina clinica con terapeuta, repertori e protocolli: la tesi non la pratica e non la rivendica, e ne prende un solo meccanismo, il principio ISO, come regola di progetto. La psicologia dei media, con la teoria del *mood management* (Zillmann, 1988) e il concetto di *comfort media* (Grady, Eden e Wolfers, 2026), fornisce invece il quadro proprio: le persone scelgono attivamente i media per regolare l'umore.
EN: The concept behind the project is **comforting media**: the voluntary, domestic, non-clinical practice in which music, sounds, books, films and slow landscapes accompany mood regulation. It must be distinguished from two neighbouring fields. Music therapy is a clinical discipline with a therapist, repertoires and protocols: the thesis does not practise or claim it, and takes a single mechanism from it, the ISO principle, as a design rule. Media psychology, with *mood management* theory (Zillmann, 1988) and the concept of *comfort media* (Grady, Eden and Wolfers, 2026), provides the proper framework: people actively choose media to regulate their mood.

IT: Ogni affermazione sul prodotto è collocata su una scala a quattro livelli, introdotta nel Capitolo 3: funziona tecnicamente; è scientificamente plausibile; è validata sperimentalmente; è validata clinicamente. Nessuna funzione di Auscultrix raggiunge il quarto livello, e la tesi non lo dichiara.
EN: Every claim about the product is placed on a four-level scale introduced in Chapter 3: works technically; is scientifically plausible; is experimentally validated; is clinically validated. No Auscultrix function reaches the fourth level, and the thesis does not claim it.

## 1.7 | Struttura | Structure

IT: Il Capitolo 2 ricostruisce lo stato dell'arte: emozione e musica, principio ISO e sue prove, indizi musicali dell'emozione, paesaggio sonoro e progettazione acustica, audio generativo, analisi affettiva del testo, privacy dei dati affettivi. Il Capitolo 3 espone il metodo e i livelli di evidenza. Il Capitolo 4 formalizza i requisiti. I Capitoli 5 e 6 descrivono architettura e interfaccia. I Capitoli 7 e 8 trattano il modello affettivo e la selezione musicale. Il Capitolo 9 è dedicato al paesaggio sonoro generativo. Il Capitolo 10 riguarda riproduzione, Visione e media che confortano. Il Capitolo 11 affronta privacy, sicurezza, etica, regole e distribuzione, App Store compreso. Il Capitolo 12 riporta la verifica quantitativa e il piano di validazione; il Capitolo 13 conclude. Seguono il glossario, la corrispondenza con le correzioni, le istruzioni per riprodurre ogni risultato e la bibliografia.
EN: Chapter 2 reviews the state of the art: emotion and music, the ISO principle and its evidence, musical cues of emotion, soundscape and acoustic design, generative audio, affective text analysis, privacy of affective data. Chapter 3 sets out the method and the levels of evidence. Chapter 4 formalises the requirements. Chapters 5 and 6 describe architecture and interface. Chapters 7 and 8 cover the affective model and music selection. Chapter 9 is devoted to the generative soundscape. Chapter 10 covers playback, Vision and comforting media. Chapter 11 addresses privacy, safety, ethics, regulation and distribution, including the App Store. Chapter 12 reports the quantitative verification and the validation plan; Chapter 13 concludes. The glossary, the list of corrections, instructions to reproduce every result and the bibliography follow.
