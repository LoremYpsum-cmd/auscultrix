# Il paesaggio sonoro generativo di Auscultrix 6.0

Progetto, modello, verifica. Codice: `lib/soundscape.js` (modello), `lib/soundscape-audio.js` (sintesi), `lib/pd-patch.js` (gemello Pure Data), `lib/audio-metrics.js` (misure). Test: `tests/unit/soundscape.test.mjs`, `tests/acoustic/bench.mjs`, `tests/e2e/soundscape-acoustic.e2e.mjs`. Dati: `docs/verifica/misure-paesaggio.json`.

## 1. Domanda di progetto

Le playlist di Auscultrix dipendono da YouTube: brani altrui, rete, pubblicità, un'interfaccia che non si controlla. Il paesaggio sonoro risponde a una domanda diversa: **si può comporre, sul dispositivo e in tempo reale, un ambiente sonoro che segua lo stesso percorso graduale (principio ISO) e che sia progettato, non scelto?**

Livello di evidenza (scala in `docs/INDICE.md`):

- *funziona tecnicamente*: sì, misurato sull'uscita (§6);
- *scientificamente plausibile*: le singole regole di mappatura poggiano su studi di percezione (§3);
- *validato sperimentalmente*: **no**. Nessuno ha ancora misurato che cosa provano le persone che lo ascoltano. Lo studio V-7 (§8) lo propone.

## 2. Quadro teorico

### 2.1 Paesaggio sonoro e progettazione acustica

Schafer (1977) distingue tre figure del paesaggio sonoro: la **tonica** (*keynote*), lo sfondo continuo che non si ascolta ma su cui tutto si staglia; i **segnali**, suoni in primo piano che attirano l'attenzione; le **impronte sonore** (*soundmarks*), suoni che danno identità a un luogo. Il paesaggio di Auscultrix ha tre strati con questi ruoli:

| Strato | Figura di Schafer | Sintesi | Effetti sonori (Augoyard e Torgue, 1995) |
|---|---|---|---|
| bordone: tonica, quinta, terza del modo | tonica | additiva, 3 voci × 6 armonici | *bordone*; *metabole* (i parametri scivolano, costante di tempo 3 s) |
| vento, mare, pioggia | impronta | sottrattiva, rumore rosa filtrato; gocce granulari | *mascheramento* (copre i rumori della stanza); *filtraggio* |
| campane | segnali | additiva inarmonica (rapporti 1; 2,32; 4,25) | *ripetizione* (celle di tre note); *crénau* (entrate e uscite sfumate) |

Due effetti del repertorio sono **esclusi di proposito**: la *coupure* (taglio netto), perché un'interruzione brusca è l'opposto di ciò che il paesaggio deve fare; e il *sincronismo* con un impulso regolare, perché un pulsare stabile invita a sincronizzarsi (si veda il limite di 24 eventi al minuto, §5).

### 2.2 Spazio acustico simulato

Lo spazio è una delle tre scelte della persona: *stanza* (RT60 0,6 s), *navata* (2,8 s), *campo aperto* (nessun riverbero).

- **Riverbero.** Convoluzione con una risposta all'impulso sintetica: rumore con inviluppo esponenziale che scende di 60 dB in RT60 secondi, come nella definizione del tempo di riverberazione (ISO 3382-1:2009):

  h(t) = n(t) · exp(−ln(1000) · t / RT60), t ≥ pre-ritardo

  Un filtro passa-basso a un polo, sempre più chiuso nel tempo, imita l'assorbimento delle alte frequenze da parte dell'aria e delle pareti.
- **Distanza.** Ogni segnale ha un angolo θ e una distanza r (1–4 m). Il guadagno segue la legge della distanza inversa: g = r₀ / r, cioè −6 dB per ogni raddoppio della distanza, perché l'intensità decresce con il quadrato della distanza. In più, la parte inviata al riverbero cresce con r: il rapporto tra suono diretto e riverberato è l'indizio principale della distanza negli spazi chiusi (Blesser e Salter, 2007).
- **Spazializzazione.** In ascolto dal vivo: `PannerNode` con HRTF (pensato per le cuffie). Nei rendering e nelle misure: panning a potenza costante.

### 2.3 Sound design procedurale

Seguendo Farnell (2010), i suoni d'ambiente non sono campioni registrati ma processi: il vento è rumore filtrato da un passa-banda il cui centro (250–950 Hz) compie una passeggiata aleatoria più rapida quando l'arousal è alto; il mare è rumore filtrato con un inviluppo d'ampiezza lento (0,06–0,12 Hz, cioè un'onda ogni 8–16 s); la pioggia è un fruscio passa-alto più gocce granulari (cinguettii discendenti di 30 ms, da 4 a 18 al secondo).

### 2.4 Dove si colloca rispetto alla musica generativa

Il paesaggio è **generativo** nel senso del corso di Sound Design – Generative Audio: regole e processi stocastici producono un suono sempre diverso a partire da ingressi esterni. Dipende dalla **persona** (lo stato dichiarato, le scelte di spazio e ambiente) e dal **contesto** (l'ora del giorno: di notte il suono è più scuro e più rado). Non è un sistema *ecosistemico* nel senso di Di Scipio (2003): non ascolta l'ambiente con un microfono e non se ne lascia modificare. È una scelta di privacy (nessun microfono) e un limite dichiarato; uno sviluppo possibile è in §9.

## 3. Mappatura affetto → suono

Ingressi: valenza v e arousal a in [0, 1], letti in ogni momento sulla traiettoria ISO (`isoWaypoint`, stesso codice delle playlist), più l'ora del giorno.

| Parametro | Da | Tipo | Formula | Indizio musicale | Fonte |
|---|---|---|---|---|---|
| modo | v | one-to-one | minore se v < 0,38; maggiore se v > 0,60; sospeso in mezzo; isteresi 0,04 | modo | Gagnon e Peretz (2003); Eerola, Friberg e Bresin (2013) |
| registro dei segnali | v | one-to-one | 1 + 2v ottave sopra la tonica | altezza | Eerola et al. (2013); Juslin e Laukka (2003) |
| ampiezza stereo | v | one-to-one | ±(30 + 40v)° | — | scelta di progetto |
| densità degli eventi | a | one-to-one | λ = 2 + 22a² eventi/min (×0,8 di notte), ≤ 24 | tempo | Gagnon e Peretz (2003); Juslin e Laukka (2003) |
| attacco | a | one-to-one | 4 + 60(1 − a) ms | articolazione | Juslin e Laukka (2003) |
| decadimento | a | one-to-one | 2,5 + 3,5(1 − a) s | legato | Juslin e Laukka (2003) |
| livello del bordone | a | one-to-one | −20 + 4a dB | intensità | Juslin e Laukka (2003) |
| livello della tessitura | a | one-to-one | −28 + 8a dB | mascheramento | Augoyard e Torgue (1995) |
| moto della tessitura | a | one-to-one | 0,2 + 0,8a | — | Farnell (2010) |
| respiro (inviluppo lento) | a | one-to-one | 0,10 Hz se a ≤ 0,45, poi fino a 0,20 Hz; profondità 3 dB | — | Lehrer e Gevirtz (2014): plausibile, non misurato qui |
| ripetizione di celle | a | one-to-one | probabilità 0,15 + 0,35(1 − a) | prevedibilità | Huron (2006) |
| brillantezza | v, a | **many-to-one** | B = 250 · 8^(0,65a + 0,35v) Hz (×0,85 di notte) | timbro | Eerola et al. (2013) |
| inclinazione spettrale | v, a | **many-to-one** | ampiezza dell'armonico h ∝ h^−(1,6 − 0,4a − 0,4v) | timbro | Eerola et al. (2013) |
| notte (21–6) | ora | **one-to-many** | brillantezza × 0,85, densità × 0,8 | — | scelta di progetto |

Nel complesso la mappatura è *many-to-many*: ogni ingresso guida più parametri e due parametri dipendono da entrambi gli ingressi. I pesi della brillantezza (0,65 per l'arousal, 0,35 per la valenza) riflettono il fatto che negli studi la brillantezza è legata soprattutto all'attivazione (Eerola et al., 2013); sono **scelti a mano**, non stimati.

L'intonazione è giusta (rapporti 6/5, 5/4, 4/3, 3/2, 5/3, 9/5, 16/9, 9/8). Le scale hanno cinque note, così che le campane che si sovrappongono nel riverbero non producano semitoni.

## 4. Struttura stocastica

- **Eventi.** Processo di Poisson non omogeneo con intensità λ(t), campionato per *thinning* (Lewis e Shedler, 1979): si generano candidati con l'intensità massima λ_max = 24/min e si accetta ciascuno con probabilità λ(t)/λ_max. Il test UT-SND-06 verifica che, su due ore, il numero di eventi resti entro quattro deviazioni standard dal valore atteso e che il coefficiente di variazione degli intervalli sia vicino a 1, come deve essere per un processo di Poisson.
- **Altezze.** Catena di Markov del primo ordine sui gradi del modo: passi 0 (p = 0,18), ±1 (0,25 ciascuno), ±2 (0,10), ±3 (0,05), +4 (0,02). Con la probabilità di ripetizione si ripete l'ultima cella di tre note. Il moto per gradi congiunti prevale (UT-SND-07).
- **Forma.** Il modo cambia solo al confine di una frase (ogni 60 s) e con isteresi, così da non oscillare quando la valenza sta vicino a una soglia (UT-SND-04). Ogni parametro scivola verso il nuovo valore con costante di tempo di 3 s.
- **Riproducibilità.** Un generatore pseudo-casuale con seme (mulberry32) rende la composizione deterministica: stesso stato, stesse scelte, stesso seme → stessa partitura (UT-SND-01) e stesso audio (§6, A5).

## 5. Sicurezza d'ascolto e comfort

| Vincolo | Valore | Perché |
|---|---|---|
| limiter sul master | soglia −6 dBFS, rapporto 20:1 | nessun picco inatteso |
| dissolvenza in entrata / in uscita | ≥ 8 s / ≥ 6 s | nessun suono comincia o finisce di colpo |
| banda | 40 Hz – 12 kHz | niente rimbombo sugli altoparlanti dei portatili, niente asprezza |
| densità | ≤ 24 eventi/min | nessun impulso regolare a cui sincronizzarsi |
| modulazioni | ≤ 0,25 Hz | niente tremolo |
| crisi | il paesaggio non parte da solo | prima l'aiuto |

**Battimenti binaurali: esclusi.** Una meta-analisi (Garcia-Argibay, Santed e Reales, 2019) trova effetti piccoli e molto eterogenei su ansia, attenzione e memoria, con studi di qualità variabile. Promettere un effetto da una frequenza di battimento non è sostenibile; il paesaggio non lo fa.

Il livello di ascolto in dB SPL dipende dal volume del computer e dalle cuffie, che Auscultrix non conosce. Il software controlla il livello digitale (§6, A1). Per l'ascolto prolungato valgono le raccomandazioni OMS–ITU sull'ascolto sicuro (WHO, 2019).

## 6. Verifica acustica (19 novembre 2026)

Il motore viene eseguito in un `OfflineAudioContext` (lo stesso grafo che si ascolta) in Chromium 156 a 48 kHz e **si misura la sua uscita**. Griglia: v, a ∈ {0,15; 0,50; 0,85}, 100 s per stato, con e senza tessitura; misure sulla parte centrale (dopo la dissolvenza in entrata e prima di quella in uscita).

| Domanda | Misura | Risultato | Esito |
|---|---|---|---|
| A1 Sicurezza | picco campione; offset DC; loudness integrata ITU-R BS.1770-4 al volume predefinito | picco massimo **−9,2 dBFS**; DC 0; **−29,0 … −25,3 LUFS** | superata (soglie: ≤ −1 dBFS; −34…−16 LUFS) |
| A2 Arousal → tempo | onset rilevati sulla traccia dei soli segnali (flusso spettrale logaritmico) confrontati con gli eventi della partitura, tolleranza ±50 ms (come nella valutazione MIREX) | precisione **0,90**, richiamo **0,94**, F **0,92**; ρ di Spearman arousal–onset al minuto **0,95** | superata |
| A3 Brillantezza | centroide spettrale contro la brillantezza richiesta, sulla griglia | ρ **0,98** senza tessitura, **0,97** con il vento | superata |
| A4 ISO nel suono | sessione compressa (da v 0,20 / a 0,85 a v 0,50 / a 0,55 in 120 s), finestre di 15 s | traccia del bordone: ρ **0,97**; **mix completo: ρ −0,49** | vedi sotto |
| A5 Riproducibilità | due rendering con lo stesso seme | differenza massima 2,2 × 10⁻⁸ (≈ −153 dBFS, sotto la risoluzione di 16 bit) | superata |

**Correzioni nate dalla misura.** La prima esecuzione ha trovato due difetti, poi corretti:

1. Il filtro di brillantezza non toccava quasi il bordone: la frequenza di taglio (500–4000 Hz) stava sopra gli armonici del bordone (≤ 880 Hz), e il centroide del mix si muoveva al contrario di quanto voluto (ρ −0,52). Correzione: sei armonici invece di quattro, intervallo di taglio 250–2000 Hz, stesso filtro (×2,5) anche sulle campane.
2. Il primo rilevatore di onset contava le fluttuazioni delle code di riverbero (fino a 372 «onset» al minuto contro 7,5 eventi). Correzione: flusso su magnitudini compresse logaritmicamente, soglia relativa al massimo e misura sulla sola traccia dei segnali (*stem*).

**Il risultato negativo che resta (A4, mix completo).** Nel percorso da «teso» a «più sereno» l'arousal scende (la brillantezza deve scendere) mentre la valenza sale (il registro delle campane sale). I due indizi spingono il centroide in direzioni opposte e nel mix vince il registro. Il bordone segue la brillantezza (ρ 0,97), ma il suo centroide varia poco (309–319 Hz). È un conflitto tra indizi che la letteratura conosce (Eerola et al., 2013, trovano effetti in gran parte additivi, quindi anche sottrattivi quando i segni sono opposti): va dichiarato, e va deciso se la brillantezza percepita debba prevalere (per esempio legando il registro anche all'arousal). Lo studio V-7 può dire quale delle due scelte le persone percepiscono come «più calma».

## 7. Gemello in Pure Data

`lib/pd-patch.js` scrive una patch di Pd vanilla con lo stesso bordone (3 voci × 6 armonici, inclinazione spettrale), lo stesso filtro, lo stesso respiro, la stessa tessitura e segnali tratti dalla stessa scala (tabella `scale`). Differenze dichiarate nella patch: niente riverbero, niente HRTF, segnali a ritmo regolare con variazione casuale invece che di Poisson. La patch si apre in Pd 0.56 senza errori (UT-PD-02). Serve a studiare e modificare la composizione con gli strumenti del corso (Bianchi, Cipriani e Giri, 2017).

## 8. Studio proposto (V-7)

Disegno entro i soggetti, adulti volontari (n stimato 40 per un effetto medio d = 0,45 con α = 0,05 e potenza 0,80, test t appaiati). Tre condizioni di 10 minuti in ordine bilanciato: paesaggio ISO; paesaggio fisso sul bersaglio; silenzio. Misure prima e dopo: Self-Assessment Manikin (Bradley e Lang, 1994) per valenza e arousal; gradimento. Analisi: modello misto con condizione e ordine come effetti fissi e persona come effetto casuale. Domanda secondaria: brillantezza contro registro (A4). Lo studio richiede l'approvazione di un comitato etico e il consenso informato; non riguarda pazienti.

## 9. Limiti e sviluppi

- L'effetto sulle persone non è misurato (§8).
- La mappatura usa indizi studiati soprattutto con musica occidentale tonale e ascoltatori occidentali.
- L'arousal letto dal testo non ha validità esterna (`validazione-esterna.md`): il paesaggio usa anche il cursore dell'energia, che la persona sceglie.
- Il paesaggio dipende dal contesto solo attraverso l'ora. Un ascolto dell'ambiente (microfono, livello di rumore della stanza per regolare il mascheramento) lo renderebbe ecosistemico, ma porterebbe un sensore nel diario: va valutato con la stessa cura usata per la foto.
- Misure su Chromium; Safari e Firefox hanno implementazioni Web Audio diverse (HRTF, compressore) e vanno misurati a parte.

## Riferimenti

Si veda `bibliografia.md`, sezione «Suono e paesaggio sonoro».
