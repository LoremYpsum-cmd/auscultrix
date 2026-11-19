# Fondamenti scientifici e algoritmi — Auscultrix 5.1.1

Questo documento descrive *che cosa calcola* l'estensione, *perché* e *quanto ne sappiamo*. Ogni parametro numerico ha una provenienza dichiarata: letteratura, misura o scelta di progetto. Le affermazioni sull'efficacia sono distinte dalle affermazioni sul funzionamento.

## 1. Livelli di evidenza

| Livello | Significato in questo documento |
|---|---|
| **A. Tecnicamente funzionante** | Fa quello che dichiara; verificato da test automatici che passano (`docs/verifica/rapporto-test.md`). |
| **B. Scientificamente plausibile** | Il razionale si appoggia a letteratura pertinente, ma l'implementazione non è stata confrontata con dati. |
| **C. Validato sperimentalmente** | Confrontato con dati annotati da persone che il sistema non ha visto durante lo sviluppo, con intervalli di confidenza. |
| **D. Validato clinicamente** | Effetti sul benessere o sulla salute misurati in uno studio su persone (protocollo, comitato etico, misure validate). |

| Funzione | A | B | C | D |
|---|---|---|---|---|
| Valenza dal testo (inglese) | sì | sì | **parziale**: r 0,20–0,52 su 4 corpora; copertura 19–40 % | no |
| Valenza dal testo (italiano) | sì | sì | **parziale**: r 0,31 su MultiEmotions-It (commenti); richiamo dei negativi 19 % | no |
| Arousal dal testo | sì | sì | **no**: r = 0,02 su EmoBank | no |
| Energia dichiarata con il cursore | sì | sì (autovalutazione, cfr. SAM: Bradley & Lang, 1994) | non applicabile (è un'autovalutazione) | no |
| Rilevazione di crisi e sostanze | sì | sì (rinvio ai servizi di aiuto) | **no**: elenco di riferimento interno | no |
| Traiettoria ISO della playlist | sì | sì: Altshuler (1948); evidenza sperimentale parziale (Starcke et al., 2021) | no | no |
| Coordinate dei brani: corpora annotati | sì | sì | no: annotazione dell'autore, non indipendente | no |
| Coordinate dei brani: MIR sulle anteprime | sì | sì: correlati dell'arousal | no: pesi non stimati su dati | no |
| Media di cura (libri, film…) | sì | **debole**: estrapolazione da revisioni Cochrane sulla musicoterapia | no | no |
| Visione, sicurezza fotosensibile | sì | sì (WCAG 2.3.1; Harding & Jeavons, 1994) | screening automatico, non certificazione | no |
| Effetto sul benessere | — | sì (letteratura sull'ascolto musicale) | no | **no** |

Nessuna funzione di Auscultrix è validata clinicamente, e il prodotto non lo dichiara.

## 2. Modello affettivo

Stato emotivo e brani sono punti nel **piano circomplesso** di Russell (1980): valenza (spiacevole → piacevole) per arousal o energia (quiete → attivazione), entrambi in [0, 1].

**Fonti dello stato dichiarato:**
1. il testo libero e le etichette;
2. il cursore di energia, che è un'autovalutazione diretta dell'attivazione;
3. la foto, opzionale: produce solo una frase descrittiva dai colori, senza riconoscere il contenuto.

## 3. Motore testuale (`lib/mood.js`, `lib/affect-lexicon.js`)

1. **Normalizzazione.** Minuscole, accenti tolti, contrazioni inglesi sciolte.
2. **Tokenizzazione.** Le proposizioni vengono separate e le congiunzioni avversative («ma», «però», *but*) aprono una nuova proposizione.
3. **Lessico.** 23 gruppi in 16 categorie, con 210 radici e 142 espressioni multiparola. A ogni gruppo è stato assegnato a mano, nella revisione 5.0, un punto (v, a), tenendo come riferimento qualitativo le norme NRC VAD (Mohammad, 2018) e ANEW italiano (Montefinese et al., 2014). Nessun confronto numerico con quelle norme è stato fatto: è lo studio V-1 del piano di validazione (C-49).
4. **Negazione.** 26 negatori aprono una portata di 4 parole, come in VADER (Hutto & Gilbert, 2014), interrotta dai confini di proposizione.
   - Una parola positiva negata diventa chiaramente negativa: v′ = 0,5 − 0,8·(v − 0,5), con arousal abbassato («non sto bene»).
   - Una parola negativa negata diventa appena positiva: v′ = 0,5 + 0,22·(0,5 − v) («non sono triste» non vuol dire «felice»).
   - «Mai così/più…» è trattato come superlativo, non come negazione: la distanza dal neutro viene moltiplicata per 1,3.
5. **Intensificatori e attenuatori.** 20 + 14 voci che scalano la distanza dal neutro.
6. **Contrasto.** Le voci dell'ultima proposizione pesano 1,5, quelle precedenti 0,5. **Salienza:** 0,5 + distanza da (0,5; 0,5).
7. **Fusione.** Con W la somma dei pesi:
   - v̂ = Σ wᵢvᵢ / W e ŝ = Σ wᵢaᵢ / W;
   - confidenza = 1 − e^(−W);
   - arousal = 0,5·ŝ + 0,5·cursore se il cursore è stato mosso, altrimenti confidenza·ŝ + (1 − confidenza)·cursore.
8. **Bersaglio ISO** (`isoTarget`):
   - ansia o rabbia: arousal → 0,32 e valenza → max(v + 0,25; 0,55);
   - tristezza o apatia: valenza → max(v + 0,25; 0,48), arousal sale al massimo fino a 0,5;
   - bisogno di calma: arousal ≤ 0,3;
   - stato buono: mantenimento.

   **Lo spostamento totale è limitato a 0,3 in distanza euclidea** (5.1; prima il limite era per asse). Il bersaglio non è mai opposto al punto di partenza.

**Validità misurata.** Vedi `validazione-esterna.md`:
- sui testi inglesi annotati da persone la valenza correla con il giudizio umano (r 0,20–0,52);
- quando il motore decide, la polarità è corretta nel 69–92 % dei casi, ma il motore resta neutro su più della metà delle frasi;
- l'arousal testuale non correla con il giudizio umano: per questo l'energia dichiarata con il cursore resta la fonte principale.

## 4. Rilevazione di crisi e sostanze (`lib/safety.js`)

Liste di frasi chiave in italiano e inglese, pensate per un richiamo alto: un falso allarme costa una scheda di aiuto, un mancato allarme costa molto di più. Prima del confronto vengono tolti i «falsi amici» («drogheria», «canna da pesca», «crack a joke»).

L'esito non è una diagnosi né una valutazione del rischio suicidario. Non sostituisce strumenti validati come la C-SSRS o la domanda 9 del PHQ-9, e attiva solo:
- la scheda con Telefono Amico, 112 e IASP (crisi);
- la scheda con il Numero Verde nazionale per le dipendenze dell'ISS (sostanze);
- l'assenza di autoplay, di aperture automatiche e di richieste di donazione.

**Livello di evidenza:** A (verificato sull'elenco di riferimento), non C.

## 5. Principio ISO e playlist (`lib/playlist.js`)

### 5.1 Razionale ed evidenza

Il principio ISO (Altshuler, 1948) propone di partire dallo stato attuale con musica che lo rispecchia e poi di spostarsi gradualmente verso lo stato desiderato. È un principio della pratica musicoterapica, descritto in studi di caso (Heiderscheit & Madson, 2015).

**Evidenza sperimentale (Starcke, Mayr & von Georgi, 2021).** Studio controllato su n = 107, dopo induzione di tristezza. La sequenza triste → allegra ha prodotto più affetto positivo delle sequenze triste → triste e allegra → triste. **Non** è risultata significativamente migliore della musica allegra soltanto. L'evidenza è quindi parziale e a breve termine (2 brani di circa 90 s).

La letteratura su musica e depressione segnala che chi tende a rimuginare può peggiorare con l'ascolto prolungato di musica triste (Garrido & Schubert, 2015). Per questo la 5.1 limita la durata della fase di rispecchiamento.

### 5.2 Traiettoria

Con t = (minuti ascoltati) / F, dove F è la finestra di spostamento (25 min), limitato a 1:

- u(t) = 0,18 · t / 0,28 per t ≤ 0,28 (rispecchiamento: ci si sposta al massimo del 18 %);
- u(t) = 0,18 + 0,82 · s²(3 − 2s), con s = (t − 0,28)/0,72, per t > 0,28 (spostamento);
- punto ISO = partenza + u · (bersaglio − partenza); per t ≥ 1 il punto **resta sul bersaglio** (mantenimento).

I minuti si calcolano dalla durata reale dei brani (210 s se ignota). La finestra **F = 25 min è un parametro di progetto**, non un valore ottimizzato su dati. Nella 5.0 il percorso era a indice: 40 brani, circa 2,5 ore per arrivare al bersaglio.

### 5.3 Scelta dei brani

Per ogni posto si sceglie il brano non ancora usato con il punteggio più alto:

- **Prossimità ISO:** exp(−d² / 2σ²), con d la distanza euclidea dal punto ISO e σ = 0,15. Pesa **0,7** del punteggio.
- **Contesto:** generi coerenti con le parole, motivazione, nostalgia… normalizzati in [0, 1]. Pesa 0,3.
- **Termini aggiuntivi:**
  - priorità alla provenienza (corpus musicoterapico +0,10, altri corpora annotati +0,04, MIR +0,02, non fondati −0,06);
  - novità (+0,06, +0,04 per l'underground);
  - variazione di sessione (fino a 0,07);
  - penalità per il già proposto (−0,22);
  - penalità per i salti oltre 0,35 dal brano calibrato precedente (0,8 × eccesso).
- **Vincoli:**
  - al massimo 3 brani per artista;
  - 1 posto su 3 riservato a brani mai proposti;
  - 1 posto su 4 al corpus musicoterapico, se presente.

Nella 5.0 la prossimità pesava il 28 % e parte del contesto era ancorata al bersaglio: i primi brani non rispecchiavano lo stato dichiarato.

**Calibrazione.** Nel percorso entrano **solo brani con coordinate documentate**, cioè annotate a mano nei corpora o misurate sull'audio (§6).
- I brani con coordinate segnaposto (7.326 nel catalogo Emergente) possono comparire solo nella fase di mantenimento, al massimo 1 posto su 4, e sono **etichettati come «scoperta»**.
- Con meno di 12 brani calibrati disponibili, per esempio con un luogo molto piccolo, la playlist è dichiarata «lista di scoperta» e non viene presentata come percorso ISO.

**Qualità misurata** (`tests/sim/iso-quality.mjs`, 6 umori × 2 cataloghi, 40 brani):
- catalogo Varia: distanza media brano ↔ punto ISO 0,05–0,13, salto massimo ≤ 0,33, nessun salto > 0,4;
- catalogo Emergente: 0,07–0,20, ma 0,46 per l'euforia, perché nel repertorio calibrato mancano brani euforici.

**Livello di evidenza:** A per la geometria; B per l'efficacia del principio.

## 6. Coordinate dei brani (`lib/track-energy.js`, `lib/affect-provenance.js`)

**Provenienza** (campo `energySource` / `valenceSource`):
- `therapy_corpus`: 80 brani; la «base» è una categoria (*relaxation-research*…), non una citazione per brano;
- `underground_corpus`: 77 brani, annotati a mano;
- `italian_corpus`: 47 brani, annotati a mano;
- `kids_corpus`;
- `mir_preview`: misura sulle anteprime di 30 s, 484 brani del seme;
- `mir_formula` con misure;
- `spotify_audio_features` / `csv`.

Tutto il resto (`unannotated`, `unknown`, `neutral_unknown`, `popularity_estimate`) è segnaposto e non entra nel percorso calibrato.

**Formula dell'energia.** Pesi euristici, non stimati su dati annotati:

E = 0,20·T + 0,35·L + 0,25·D + 0,20·(1 − A)

- T = (BPM − 60)/120;
- L = (dB + 45)/40;
- D = danceability;
- A = acousticness;
- tutti limitati in [0, 1], e i pesi vengono rinormalizzati sulle grandezze disponibili.

La tesi (§7.4) scrive l'ultimo termine come −0,20·A e definisce «equivalente» la forma 0,20·(1 − A). Le due forme differiscono per una costante +0,20: l'ordinamento è identico, i valori assoluti no. L'esempio «Tutti» (E = 0,584) usa la forma con 1 − A ed è riprodotto esattamente dal test UT-EN-01.

**Valenza.**
- Dalle misure: 0,35 + 0,35·D + 0,15·(1 − A), ±0,12 per il modo maggiore o minore.
- **Senza misure la valenza è ignota** (0,5, etichettata). Fino alla 5.0 veniva stimata dalla popolarità, relazione senza fondamento.

**Testi delle canzoni** (`lib/lyrics.js`, solo su consenso). Lessico di quattro famiglie di parole. Il testo incide al massimo per il 35 % della valenza e il 15 % dell'energia, in proporzione alla confidenza, perché l'arousal percepito dipende soprattutto dal segnale e la valenza di più dal contenuto semantico. Il lessico dei testi non è validato all'esterno (livello B).

## 7. Visione e sicurezza fotosensibile

- **Ritmo:** pittura e campionamento a 3 fps.
- **Dissolvenze:** ≥ 2,8 s.
- **Zoom:** parabolico Z(p) = 1 + 0,25·(1 − (2p − 1)²), con picco a metà brano (UT-ZOOM-01).

**Screening** (`tools/photosensitivity_check.py`, criterio WCAG 2.3.1 semplificato):
- per ogni GIF: luminanza relativa per blocchi di 1/16 del fotogramma e per il fotogramma intero;
- un lampo è una coppia di variazioni opposte ≥ 0,10, con lo stato più scuro sotto 0,80, entro qualunque finestra di 1 s; si contano anche le transizioni di rosso saturo;
- **risultato:** tutte le GIF ≤ 2 lampi/s (soglia 3) e nessun lampo rosso;
- **però** le pioggerelle hanno salti per blocco fino a 0,57.

In **modalità sicura** (predefinita) l'opacità di ogni strato è quindi limitata in modo che opacità × salto < 0,08: l'overlay non produce alcun «lampo» secondo la definizione WCAG.

È uno screening automatico, non una certificazione (per esempio Harding FPA o PEAT), e non valuta le transizioni tra immagini diverse, che sono comunque dissolvenze lente.

## 8. Media di cura

Ordinamento: 40 % rispecchiamento dello stato attuale, 35 % apertura verso il bersaglio, 15 % etichette tematiche, 10 % sovrapposizione con «esiti Cochrane» associati all'umore.

Le revisioni Cochrane citate (Aalbers et al., 2017; Geretsegger et al., 2017) riguardano la **musicoterapia condotta da un professionista**. Trasferire quegli esiti a libri, film, serie o podcast scelti da un algoritmo è un'estrapolazione **senza evidenza diretta**: è un'ispirazione progettuale, non un fondamento. La biblioterapia ha un'evidenza propria (Cuijpers, 1997; Gualano et al., 2017), ma per la biblioterapia guidata, non per un singolo titolo proposto.

Per i minori i cataloghi non hanno classificazioni d'età verificate: la 5.1 non propone loro film, serie e giochi.

**Livello di evidenza:** B debole.

## 9. Modello utente e personalizzazione

- **Contenuto:** le ultime 60 sessioni, con energia, valenza, bersaglio e attività scelta. Nessun punteggio di ansia o tristezza.
- **Prior:** sposta lo stato dichiarato verso la media storica di al più 0,08 (UT-UM-03), e solo dopo almeno 3 sessioni.
- **«Scegli per me»:** inclina del 15 % le probabilità verso le attività scelte di solito.

## 10. Limiti

- Il motore testuale è lessicale: non capisce l'ironia e conosce solo le parole del lessico. In italiano non è validato all'esterno.
- Le coordinate dei corpora sono annotazioni di una persona, non giudizi indipendenti, e i pesi della formula dell'energia sono scelte di progetto.
- La finestra ISO di 25 minuti e il nucleo σ = 0,15 sono parametri ragionevoli ma **non ottimizzati né validati**.
- Nessuna misura di esito: per scelta etica la 5.1 non registra come va la sessione.
- Il catalogo Emergente calibrato è piccolo (77 brani) e povero di repertorio euforico.
