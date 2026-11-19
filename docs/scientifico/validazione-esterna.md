# Validazione esterna del motore di lettura dell'umore

Esecuzione del 6 novembre 2026. Dati grezzi in `docs/verifica/validazione-esterna.json`; script in `tests/external/eval-external.mjs`.

## Che cosa si misura

La domanda è una sola: **la valenza che il motore assegna a un testo concorda con quella data da persone, su testi che il motore non ha mai visto?** Il motore non è mai stato tarato su questi testi: le frasi sono state lette solo per questa misura e il lessico non è stato modificato dopo averne visto gli errori.

Che cosa questa misura **non** dice:

- per l'italiano c'è dal 19 novembre 2026 una prima misura su commenti annotati (MultiEmotions-It, §«Italiano»), ma non su autodescrizioni;
- non dice se legge bene il **modo in cui una persona descrive il proprio stato** («oggi sono a pezzi»): i testi sono frasi di narrativa e notizie, tweet, recensioni ed editoriali;
- non dice nulla sull'**effetto** delle playlist sull'umore, che richiede uno studio con persone (vedi `piano-di-validazione.md`).

## Dati

| Corpus | Frasi usate | Lingua | Annotazione umana | Licenza |
|---|---|---|---|---|
| EmoBank, solo split ufficiale di test (Buechel & Hahn, 2017) | 1.000 | inglese | valenza e arousal su scala 1–5, più annotatori per frase | CC BY-SA 4.0 |
| VADER ground truth, tweet (Hutto & Gilbert, 2014) | 4.200 | inglese | media di circa 20 valutazioni su −4…+4 | MIT |
| VADER, frammenti di recensioni di film | 10.605 | inglese | idem | MIT |
| VADER, frammenti di editoriali del New York Times | 5.190 | inglese | idem | MIT |
| VADER, frammenti di recensioni Amazon | 3.708 | inglese | idem | MIT |

**Italiano (19 novembre 2026).** MultiEmotions-It (Sprugnoli, 2020): 3.240 commenti italiani a video musicali e pubblicità su YouTube e Facebook, annotati a mano per polarità (POS, NEG; entrambe = misto; nessuna = neutro) ed emozioni. Licenza CC BY-NC-SA 4.0; il file non è ridistribuito (`<dati>/italian/multiemotions-it/MultiEmotions-It.tsv`). Si escludono i 175 commenti «non pertinenti»: restano 3.065, di cui 2.685 polarizzati (1.917 positivi, 768 negativi). Valore per le correlazioni: POS − NEG. FEEL-IT (Bianchi, Nozza & Hovy, 2021) si ottiene solo con un modulo di richiesta; lo script lo legge se presente (`<dati>/italian/feelit.csv`, colonne `text,label`).

## Metodo

- Ogni frase viene passata al motore come se la persona l'avesse scritta nel diario, con il cursore dell'energia fermo (0,5): `analyzeMoodHeuristic({ input: frase, energy: 0.5 })`.
- **Correlazione** tra la valenza del motore (0–1) e il giudizio umano: Pearson con intervallo di confidenza al 95 % (trasformazione z di Fisher) e Spearman.
- **Polarità.** Una frase è «polarizzata» se il giudizio umano è chiaramente positivo o negativo: EmoBank V ≥ 3,5 oppure ≤ 2,5; VADER ≥ +1 oppure ≤ −1. Il motore «decide» se la valenza è ≥ 0,55 (positiva) o ≤ 0,45 (negativa); altrimenti resta neutro.
  - *Accuratezza*: frasi polarizzate lette con la polarità giusta, sul totale delle frasi polarizzate. Il neutro conta come errore. Intervallo di Wilson al 95 %.
  - *Copertura*: frasi polarizzate su cui il motore decide.
  - *Accuratezza quando decide*: frasi giuste sul totale delle frasi su cui decide.
- **Confronto con la 4.33.** Lo stesso script esegue il motore della 4.33 (copia locale in `archive/_unpacked/4.33/`, (non pubblicato nel repository: il confronto con la 4.33 si rifà solo con una copia locale di quella versione)). Le due versioni sono confrontate frase per frase con il test di McNemar esatto a due code.

## Risultati

### Valenza

| Corpus | Versione | r [IC 95 %] | ρ | Accuratezza [IC 95 %] | Copertura | Accuratezza quando decide |
|---|---|---|---|---|---|---|
| EmoBank (n = 1.000; 180 polarizzate) | 4.33 | 0,039 [−0,023; 0,101] | 0,018 | 3,9 % [1,9; 7,8] | 6,7 % | 58,3 % |
| | **5.1** | **0,200 [0,140; 0,259]** | 0,161 | **15,0 % [10,5; 20,9]** | 18,9 % | 79,4 % |
| Tweet (n = 4.200; 2.667) | 4.33 | 0,288 [0,260; 0,316] | 0,292 | 11,2 % [10,1; 12,5] | 11,6 % | 96,8 % |
| | **5.1** | **0,523 [0,501; 0,545]** | 0,480 | **36,6 % [34,8; 38,4]** | 39,6 % | 92,3 % |
| Film (n = 10.605; 9.173) | 4.33 | 0,074 [0,055; 0,093] | 0,079 | 4,4 % [4,0; 4,9] | 7,0 % | 63,6 % |
| | **5.1** | **0,212 [0,193; 0,230]** | 0,211 | **19,3 % [18,5; 20,1]** | 27,9 % | 69,1 % |
| Editoriali NYT (n = 5.190; 1.554) | 4.33 | 0,074 [0,047; 0,101] | 0,057 | 3,2 % [2,4; 4,2] | 5,4 % | 59,5 % |
| | **5.1** | **0,220 [0,194; 0,246]** | 0,191 | **17,7 % [15,9; 19,7]** | 23,2 % | 76,4 % |
| Amazon (n = 3.708; 2.455) | 4.33 | 0,179 [0,147; 0,210] | 0,173 | 4,9 % [4,1; 5,9] | 5,3 % | 93,8 % |
| | **5.1** | **0,357 [0,329; 0,385]** | 0,340 | **25,2 % [23,5; 27,0]** | 29,9 % | 84,3 % |

Il motore della 5.1 è lo stesso della 5.0: la 5.1 non ha cambiato il lessico né le regole.

### Confronto frase per frase (frasi polarizzate)

| Corpus | Corrette solo con la 5.1 | Corrette solo con la 4.33 | McNemar, p |
|---|---|---|---|
| EmoBank | 23 | 3 | 8,8 × 10⁻⁵ |
| Tweet | 739 | 62 | 4,9 × 10⁻¹⁴⁸ |
| Film | 1.573 | 209 | 1,4 × 10⁻²⁵⁸ |
| Editoriali NYT | 244 | 19 | 5,9 × 10⁻⁵¹ |
| Amazon | 541 | 43 | 1,1 × 10⁻¹¹⁰ |

### Italiano: MultiEmotions-It

| Sottoinsieme | Versione | r [IC 95 %] | ρ | Accuratezza [IC 95 %] | Copertura | Accuratezza quando decide |
|---|---|---|---|---|---|---|
| Tutti (n = 3.065; 2.685 polarizzati) | 4.33 | 0,002 [−0,033; 0,038] | −0,026 | 9,1 % [8,1; 10,3] | 20,6 % | 44,4 % |
| | **6.0** | **0,310 [0,277; 0,341]** | 0,288 | **27,1 % [25,5; 28,8]** | 34,0 % | **79,8 % [77,1; 82,3]** |
| Video musicali (1.015; 920) | 6.0 | 0,210 [0,151; 0,268] | 0,204 | 33,2 % [30,2; 36,3] | 38,0 % | 87,1 % |
| Pubblicità (2.050; 1.765) | 6.0 | 0,304 [0,264; 0,343] | 0,278 | 24,0 % [22,0; 26,0] | 31,8 % | 75,3 % |
| Senza sarcasmo (3.020; 2.641) | 6.0 | 0,318 [0,285; 0,349] | 0,298 | 27,4 % [25,7; 29,1] | 33,8 % | 81,1 % |

Confronto appaiato 4.33 → 6.0 sulle frasi polarizzate: 573 corrette solo con la 6.0, 90 solo con la 4.33 (McNemar esatto, p = 6,4 × 10⁻⁸⁷).

Dettaglio (6.0, tutti): richiamo dei positivi 30,3 % [28,2; 32,3], dei negativi **19,3 % [16,6; 22,2]**; il motore resta neutro su 1.236 positivi e 537 negativi; inversioni: 101 positivi letti negativi, **83 negativi letti positivi** (3,1 % dei polarizzati). La baseline «sempre positivo» ottiene 71,4 % di accuratezza perché il neutro conta come errore per il motore e non per la baseline: il confronto onesto è l'accuratezza quando decide (79,8 %) insieme alla copertura (34 %). Dati: `docs/verifica/validazione-esterna-italiano.json`.

**Come leggerli.** Primo dato italiano esterno: la valenza correla con il giudizio umano (r = 0,31), nello stesso intervallo dei corpora inglesi, e la 4.33 non correlava affatto. Il motore decide su un terzo dei commenti e, quando decide, ha ragione quattro volte su cinque. Il punto debole sono i negativi: ne riconosce meno di uno su cinque, e il lessico, costruito sul vocabolario di chi descrive il proprio stato, copre poco il linguaggio della critica e dell'insulto dei commenti. Non è ancora la misura che serve (autodescrizioni in prima persona, V-2): i commenti sono un dominio diverso.

### Arousal (attivazione)

| Corpus | Versione | r [IC 95 %] | ρ |
|---|---|---|---|
| EmoBank | 4.33 | 0,079 [0,017; 0,141] | 0,012 |
| | 5.1 | 0,018 [−0,044; 0,080] | 0,006 |

## Come leggere questi numeri

1. **Il miglioramento rispetto alla 4.33 è reale e non dovuto al caso.** In tutti e cinque i corpora la correlazione è salita (gli intervalli di confidenza non si sovrappongono) e il numero di frasi lette correttamente è aumentato, con p di McNemar sotto 10⁻⁴.
2. **L'accordo assoluto resta modesto.** r = 0,20–0,52 vuol dire che il motore coglie la direzione generale su molti testi, non che legge ogni frase. Sui testi generici resta neutro sul 60–81 % delle frasi polarizzate (C-38): il lessico copre il vocabolario dell'umore, non quello di una recensione o di un editoriale.
3. **Quando decide, di solito ha ragione** (69–92 %). Su tweet e recensioni Amazon la 4.33 era più precisa quando decideva (97 % e 94 %), ma decideva su un decimo delle frasi. È il compromesso atteso di un lessico più ampio.
4. **L'arousal stimato dal testo non ha validità misurabile** né nella 4.33 né nella 5.1 (C-37). Il valore di energia che guida la playlist dipende soprattutto dal cursore, quando la persona lo sposta (peso 50 %); se non lo sposta, l'energia letta dal testo pesa in proporzione alla confidenza. Prima di cambiare questi pesi serve una misura in italiano su autodescrizioni reali (V-2 del piano).
5. **Non è un confronto con lo stato dell'arte.** I numeri dicono quanto la 5.1 migliora la 4.33, non quanto si avvicina ai modelli pubblicati sugli stessi corpora.

## Set interni (verifica di regressione, non validazione)

| Set | Frasi | 4.33 | 5.1 | Nota |
|---|---|---|---|---|
| Sviluppo (`tests/mood-gold.tsv`) | 102 | 25,5 % | 99,0 % | Il motore è stato costruito su queste frasi. |
| Verifica (`tests/mood-heldout.tsv`) | 50 | 20,0 % | **74,0 %** alla prima esecuzione, poi 98,0 % | Dopo la prima esecuzione il lessico è stato ampliato con le parole mancanti: il 98 % non è più indipendente. |

Entrambi i set sono stati scritti e annotati da un solo annotatore, durante la revisione 5.0 svolta con un assistente IA (C-40). Il numero da citare come stima indipendente è **74 %**, su 50 frasi, con tutti i limiti di un campione così piccolo (IC di Wilson al 95 %: 60–84 %). I due set restano utili come test di regressione: il build si ferma se il motore scende sotto le soglie.

## Livello di evidenza raggiunto

| Livello | Stato |
|---|---|
| Funziona tecnicamente | Sì: test di unità e end-to-end superati (`docs/verifica/rapporto-test.md`). |
| Scientificamente plausibile | Sì per la valenza: modello circomplesso e regole di negazione e intensità documentate in letteratura. |
| Validato sperimentalmente | **In parte**: valenza su cinque corpora inglesi e un corpus italiano (MultiEmotions-It), tutti non di dominio. Nessuna validazione sulle autodescrizioni. Arousal dal testo non valido. |
| Validato clinicamente | **No.** Nessuno studio con persone. |

## Riprodurre la misura

```sh
# i dati non sono nel pacchetto (licenze e dimensioni)
git clone https://github.com/JULIELab/EmoBank   <dati>/emobank     # serve corpus/emobank.csv
# i quattro file *_GroundTruth.txt della cartella hutto_ICWSM_2014
# (risorse aggiuntive del progetto vaderSentiment) vanno in <dati>/vader_gt/hutto_ICWSM_2014/
node tests/external/eval-external.mjs <dati> --out docs/verifica/validazione-esterna.json
```

Con `AUSCULTRIX_EXTERNAL_DATA=<dati> node tests/run-all.mjs` la misura viene rifatta e inserita nel rapporto dei test; senza la variabile il rapporto riporta l'ultimo risultato salvato, con la sua data.

## Riferimenti

- Buechel, S., & Hahn, U. (2017). EmoBank: Studying the impact of annotation perspective and representation format on dimensional emotion analysis. *Proceedings of EACL 2017, Volume 2: Short Papers*, 578–585. https://aclanthology.org/E17-2092/
- Hutto, C. J., & Gilbert, E. (2014). VADER: A parsimonious rule-based model for sentiment analysis of social media text. *Proceedings of ICWSM*, 8(1), 216–225. https://doi.org/10.1609/icwsm.v8i1.14550
- Sprugnoli, R. (2020). MultiEmotions-It: A new dataset for opinion polarity and emotion analysis for Italian. In *Proceedings of the Seventh Italian Conference on Computational Linguistics (CLiC-it 2020)* (pp. 402–408). Accademia University Press. http://ceur-ws.org/Vol-2769/paper_08.pdf
- Bianchi, F., Nozza, D., & Hovy, D. (2021). FEEL-IT: Emotion and sentiment classification for the Italian language. *Proceedings of WASSA 2021*, 76–83. https://aclanthology.org/2021.wassa-1.8/
