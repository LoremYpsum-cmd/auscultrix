# 8 | La selezione musicale | Music selection

## 8.1 | Il principio ISO come geometria | The ISO principle as geometry

IT: Nel piano circomplesso il principio ISO diventa un percorso dal punto dichiarato P₀ = (v₀, a₀) al bersaglio P₁ = (v₁, a₁). Il problema computazionale è duplice: decidere *dove* deve trovarsi il percorso in ogni momento (la traiettoria) e scegliere, per ogni posto della playlist, il brano più vicino a quel punto senza ripetizioni e senza salti.
EN: In the circumplex plane the ISO principle becomes a path from the declared point P₀ = (v₀, a₀) to the target P₁ = (v₁, a₁). The computational problem is twofold: deciding *where* the path should be at each moment (the trajectory) and choosing, for each playlist slot, the track closest to that point without repetition and without jumps.

## 8.2 | La traiettoria nel tempo | The trajectory in time

IT: Fino alla 5.0 la traiettoria era misurata in brani: in una lista di 40 il bersaglio si raggiungeva dopo circa due ore e mezza, e il solo rispecchiamento durava quaranta minuti, troppo a lungo alla luce del rischio documentato da Garrido e Schubert (2015). Dalla 5.1 la traiettoria è misurata in **minuti d'ascolto**, calcolati dalla durata reale dei brani (210 s se ignota). Con t = minuti / F, dove F = 25 min è la finestra di spostamento, limitato a 1:
EN: Up to 5.0 the trajectory was measured in tracks: in a list of 40 the target was reached after about two and a half hours, and matching alone lasted forty minutes, too long in light of the risk documented by Garrido and Schubert (2015). Since 5.1 the trajectory is measured in **listening minutes**, computed from the real duration of tracks (210 s if unknown). With t = minutes / F, where F = 25 min is the shift window, capped at 1:

EQ: u(t) = 0,18 · t / 0,28 &nbsp; per t ≤ 0,28 &nbsp;&nbsp;&nbsp; u(t) = 0,18 + 0,82 · s²(3 − 2s), &nbsp; s = (t − 0,28)/0,72 &nbsp; per t > 0,28 || (8.1)

EQ: P(t) = P₀ + u(t) · (P₁ − P₀) || (8.2)

IT: Nel primo 28 % della finestra (7 minuti) il percorso si sposta al più del 18 %: è il **rispecchiamento**. Poi una curva *smoothstep* porta al bersaglio senza discontinuità nella velocità: è lo **spostamento**. Dopo 25 minuti il punto resta sul bersaglio: è il **mantenimento**, e a fine playlist la sessione si chiude invece di ricominciare. La stessa funzione, `isoWaypoint`, guida la playlist e il paesaggio sonoro. F = 25 min è un parametro di progetto, non un valore ottimizzato su dati.
EN: In the first 28 % of the window (7 minutes) the path moves by at most 18 %: this is **matching**. Then a *smoothstep* curve takes it to the target with no discontinuity in speed: this is **shifting**. After 25 minutes the point stays on the target: this is **holding**, and at the end of the playlist the session closes instead of starting again. The same function, `isoWaypoint`, drives both the playlist and the soundscape. F = 25 min is a design parameter, not a value optimised on data.

FIG: fig/iso-path.svg | Figura 8.1 — Avanzamento u lungo la traiettoria ISO in funzione dei minuti d'ascolto (equazione 8.1): rispecchiamento fino a 7 minuti, spostamento fino a 25, poi mantenimento. | Figure 8.1 — Progress u along the ISO trajectory as a function of listening minutes (equation 8.1): matching up to 7 minutes, shifting up to 25, then holding.

## 8.3 | La scelta dei brani | Choosing tracks

IT: Per ogni posto della playlist si sceglie, tra i brani non ancora usati, quello con il punteggio più alto. Il termine principale è la vicinanza al punto della traiettoria, con un nucleo gaussiano:
EN: For each playlist slot, the unused track with the highest score is chosen. The main term is closeness to the trajectory point, with a Gaussian kernel:

EQ: S = 0,7 · exp(−d² / 2σ²) + 0,3 · C + δ &nbsp;&nbsp;&nbsp; σ = 0,15 || (8.3)

IT: dove d è la distanza euclidea tra le coordinate del brano e P(t), C un termine di contesto in [0, 1] (generi coerenti con le parole, motivazione, nostalgia) e δ un insieme di piccoli termini dichiarati: priorità per provenienza (corpus musicoterapico +0,10, altri corpora annotati +0,04, misure audio +0,02, brani non fondati −0,06), novità (+0,06), variazione di sessione (≤ 0,07), penalità per il già proposto (−0,22) e per i salti oltre 0,35 dal brano calibrato precedente. Vincoli: al più tre brani per artista, un posto su tre a brani mai proposti, un posto su quattro al corpus musicoterapico se presente. Nella 5.0 la vicinanza pesava il 28 % e parte del contesto era ancorata al bersaglio, sicché i primi brani non rispecchiavano lo stato dichiarato.
EN: where d is the Euclidean distance between the track's coordinates and P(t), C a context term in [0, 1] (genres consistent with the words, motivation, nostalgia) and δ a set of small declared terms: provenance priority (music-therapy corpus +0.10, other annotated corpora +0.04, audio measurement +0.02, ungrounded tracks −0.06), novelty (+0.06), session variation (≤ 0.07), a penalty for what was already offered (−0.22) and for jumps beyond 0.35 from the previous calibrated track. Constraints: at most three tracks per artist, one slot in three for never-offered tracks, one in four for the music-therapy corpus when present. In 5.0 closeness weighed 28 % and part of the context was anchored to the target, so the first tracks did not mirror the declared state.

## 8.4 | Coordinate documentate | Documented coordinates

IT: Il percorso è buono quanto le coordinate dei brani. Ogni brano dichiara da dove vengono (`lib/affect-provenance.js`): annotate a mano in un corpus (musicoterapico, 80 brani; underground, 77; italiano, 47; per bambini), misurate sulle anteprime audio (484 brani del seme), oppure ignote. **Nel percorso calibrato entrano solo brani con coordinate documentate.** Nella 4.33, 7.326 brani del catalogo Emergente avevano coordinate segnaposto identiche (0,45; 0,50), e nel catalogo predefinito il principio ISO di fatto non operava. Dalla 5.1 quei brani compaiono solo nel mantenimento, al più uno su quattro, con l'etichetta «scoperta»; con meno di 12 brani calibrati la playlist si dichiara «lista di scoperta».
EN: The path is only as good as the tracks' coordinates. Each track declares where they come from (`lib/affect-provenance.js`): annotated by hand in a corpus (music therapy, 80 tracks; underground, 77; Italian, 47; children's), measured on audio previews (484 tracks of the seed), or unknown. **Only tracks with documented coordinates enter the calibrated path.** In 4.33, 7,326 tracks of the Emergente catalogue had identical placeholder coordinates (0.45; 0.50), and in the default catalogue the ISO principle effectively did not operate. Since 5.1 those tracks appear only during holding, at most one in four, labelled "discovery"; with fewer than 12 calibrated tracks the playlist declares itself a "discovery list".

IT: La «base» dei brani del corpus musicoterapico (*relaxation-research*, *clinical-repertoire*…) è una categoria, non il riferimento a uno studio. La 5.0 parlava di una selezione «scientificamente approvata»: nessuna approvazione esiste, e la frase corretta è che la selezione è *tracciabile*. Lo stesso vale per un brano spesso citato come «il più rilassante», per il quale non risulta una pubblicazione con revisione tra pari ma una ricerca commerciale riportata dalla stampa.
EN: The "basis" of tracks in the music-therapy corpus (*relaxation-research*, *clinical-repertoire*…) is a category, not a reference to a study. Edition 5.0 spoke of a "scientifically approved" selection: no approval exists, and the correct statement is that the selection is *traceable*. The same applies to a track often cited as "the most relaxing", for which no peer-reviewed publication was found, only commercial research reported by the press.

## 8.5 | La formula dell'energia | The energy formula

IT: Quando un brano ha misure audio ma non coordinate annotate, l'energia è una combinazione lineare con pesi scelti a mano, non stimati su dati:
EN: When a track has audio measurements but no annotated coordinates, energy is a linear combination with hand-chosen weights, not estimated from data:

EQ: E = 0,20 · T + 0,35 · L + 0,25 · D + 0,20 · (1 − A) || (8.4)

IT: con T = (BPM − 60)/120, L = (dB + 45)/40, D la *danceability*, A l'*acousticness*, tutti limitati in [0, 1] e con i pesi rinormalizzati sulle grandezze disponibili. La 5.0 scriveva l'ultimo termine come −0,20·A e lo diceva «equivalente»: le due forme ordinano i brani allo stesso modo ma differiscono di una costante 0,20, e le coordinate contano perché vengono confrontate con i punti della traiettoria. La formula scritta qui è quella implementata (UT-EN-01 riproduce l'esempio E = 0,584). Senza misure la valenza è dichiarata ignota (0,5): fino alla 5.0 veniva stimata dalla popolarità, una relazione senza fondamento.
EN: with T = (BPM − 60)/120, L = (dB + 45)/40, D *danceability*, A *acousticness*, all capped to [0, 1] and with weights renormalised over the available quantities. Edition 5.0 wrote the last term as −0.20·A and called it "equivalent": the two forms rank tracks the same way but differ by a constant 0.20, and coordinates matter because they are compared with trajectory points. The formula written here is the implemented one (UT-EN-01 reproduces the example E = 0.584). Without measurements valence is declared unknown (0.5): up to 5.0 it was estimated from popularity, a relationship without foundation.

## 8.6 | Qualità del percorso | Path quality

IT: Una simulazione (`tests/sim/iso-quality.mjs`) costruisce playlist da 40 brani per sei umori tipici su due cataloghi e misura la distanza media tra ogni brano e il suo punto della traiettoria e il salto massimo tra brani consecutivi. Catalogo «Le solite care»: distanza media 0,05–0,13, salto massimo ≤ 0,33. Catalogo «Emergente»: 0,07–0,20, ma 0,46 per l'euforia, perché nel repertorio calibrato mancano brani euforici. È una misura di geometria (livello A), non di efficacia.
EN: A simulation (`tests/sim/iso-quality.mjs`) builds 40-track playlists for six typical moods on two catalogues and measures the mean distance between each track and its trajectory point and the largest jump between consecutive tracks. "Old favourites" catalogue: mean distance 0.05–0.13, largest jump ≤ 0.33. "Emerging" catalogue: 0.07–0.20, but 0.46 for euphoria, because the calibrated repertoire lacks euphoric tracks. It is a measure of geometry (level A), not of efficacy.
