# Media che confortano: revisione di sicurezza clinica

Versione 6.0.1 · revisione del 23 novembre 2026 · codice: `lib/care-safety.js` · test: `tests/unit/care-safety.test.mjs` (UT-CARE-01…06)

Questo documento è scritto perché un clinico possa **controllare, correggere e firmare** le scelte. Non è una validazione clinica: è una selezione editoriale prudente, con regole esplicite e un registro di ogni decisione.

## 1. Perché serviva

Fino alla 6.0 i cataloghi di libri, film, serie, documentari, podcast e giochi erano cresciuti per ampliamenti successivi. Le versioni 4.30–4.32, in particolare, avevano aggiunto 726 film da filmografie complete di registi e decine di titoli «affini». Una revisione titolo per titolo ha trovato, tra le proposte possibili:

- opere in cui il **suicidio** o l'autolesionismo è rappresentato o centrale (30 titoli: per esempio il gioco *The Static Speaks My Name*, i film *A Silent Voice*, *Dead Poets Society*, *Groundhog Day*, la serie *Hořící keř*);
- violenza grafica, crimine e guerra (41), abusi sessuali (10), danno o morte di bambini (11), dipendenze (16), atrocità (7), horror (7);
- monografie di registi, podcast di critica cinematografica, inchieste e politica (50): non sono media che confortano.

## 2. Regola: si propone solo ciò che è stato approvato

Un titolo può comparire **solo se è nell'elenco degli approvati** (`APPROVED_CARE_ITEMS`). Tutto il resto, compresi i 755 film delle filmografie dei registi e qualunque titolo aggiunto in futuro senza revisione, non viene mai proposto. Ogni titolo curato escluso è registrato con i suoi motivi (`EXCLUDED_CARE_ITEMS`). UT-CARE-01 fallisce se un titolo dei cataloghi curati non ha una decisione.

| Medium | Approvati | di cui con tema di perdita | Esclusi |
|---|---|---|---|
| Libri | 48 | 6 | 37 |
| Film | 46 | 11 | 15 (+ 755 film d'autore mai rivisti, esclusi) |
| Serie | 23 | 2 | 38 |
| Documentari | 21 | 0 | 28 |
| Podcast | 17 | 1 | 24 |
| Giochi | 33 | 6 | 33 |
| **Totale** | **188** | **26** | **175** |

## 3. Criteri di esclusione

| Codice | Criterio | Titoli | Fondamento |
|---|---|---|---|
| `suicide` | suicidio, tentativo o autolesionismo rappresentato o centrale nella trama | 30 | Le rappresentazioni mediatiche del suicidio si associano a comportamenti imitativi (effetto Werther: Niederkrotenthaler et al., 2010). Dopo l'uscita di *13 Reasons Why* i suicidi giovanili negli Stati Uniti sono aumentati (Niederkrotenthaler et al., 2019; Bridge et al., 2020). Le linee guida OMS per i media (WHO & IASP, 2017) chiedono di non rappresentarli. |
| `sexual_violence` | violenza o abuso sessuale | 10 | contenuto traumatizzante per chi ne ha esperienza |
| `child_harm` | abuso o morte di un bambino | 11 | idem |
| `graphic_violence` | violenza grafica, crimine, guerra | 41 | contrario al conforto (bassa attivazione, sicurezza: Grady et al., 2026) |
| `atrocity` | genocidio, Shoah, crimini di guerra | 7 | idem; opere importanti, ma non media di conforto |
| `horror` | horror | 7 | attivazione e paura |
| `substance` | dipendenze rappresentate | 16 | rischio per chi usa sostanze; coerenza con la scheda sostanze |
| `eating_disorder` | disturbi alimentari | 1 | contenuto a rischio noto |
| `heavy_theme` | lutto, malattia terminale o reparto psichiatrico come soggetto principale, senza delicatezza | 18 | il contenuto triste può alimentare la ruminazione (Garrido & Schubert, 2015) |
| `mature` | classificazione per adulti o contenuto sessuale | 10 | destinazione d'uso «adulti e famiglie»; App Store 1.4.1 |
| `low_valence` | tono complessivo non confortante (valenza < 0,5) | 2 | definizione di comfort media |
| `off_purpose` | non è un medium di conforto (monografie, critica, inchiesta, politica) | 50 | coerenza con lo scopo |

Un titolo può avere più motivi; il totale supera quindi il numero di titoli esclusi.

**Scelta prudente sul suicidio.** I racconti di chi ha superato una crisi possono proteggere («effetto Papageno»: Niederkrotenthaler et al., 2010). Un clinico può proporli a una persona che conosce. Uno strumento automatico, che non sa chi legge, non li propone: per questo sono esclusi anche titoli spesso consigliati (per esempio *Reasons to Stay Alive*, *Ted Lasso*). È la decisione più discutibile del documento, ed è la prima da sottoporre ai clinici.

### I videogiochi

I giochi chiedono più attenzione degli altri media: si giocano per ore, la persona agisce invece di guardare, e il catalogo affine conteneva giochi per adulti (*Red Dead Redemption 2*, *Kingdom Come*, *Sleeping Dogs*). Dei 66 giochi curati ne restano 33, scelti con tre requisiti in più:

- **nessuna violenza come meccanica principale**: niente sparatorie o combattimenti come scopo del gioco (esclusi, tra gli altri, *My Friend Pedro*, *Mafia*, *L.A. Noire*, *Monaco*);
- **nessun finale o scena di morte autoinflitta**, anche se comica: per questo esce *The Stanley Parable*, dove uno dei finali è una caduta volontaria; escono anche *What Remains of Edith Finch*, *Life Is Strange*, *SOMA* e *The Town of Light*;
- **nessuna disperazione come esito**: escono *The Plan*, *Gorogoa*, *Kentucky Route Zero*, *Inside*, *Papers, Please* e *This War of Mine*; ed esce *Stardew Valley*, molto amato, per una scena opzionale in cui un personaggio alcolista, sul bordo di una scogliera, lascia intendere pensieri suicidari.

Restano giochi senza sconfitta o con conflitto non violento: per esempio *Journey*, *A Short Hike*, *Unpacking*, *Monument Valley*, *Alba*, *Chicory*, *Toem*, *Lil Gator Game*, *Deltarune* (in cui si può finire ogni scontro senza far male a nessuno). Sei toccano la perdita con delicatezza (*GRIS*, *Spiritfarer*, *Venba*, *Dordogne*, *Old Man's Journey*, *Mutazione*) e seguono le regole del §4. Ai minori i giochi non vengono proposti finché ogni titolo non avrà la sua classificazione PEGI verificata (§6, punto 2).

## 4. Regole che dipendono dalla persona

| Situazione | Che cosa cambia |
|---|---|
| Valenza dichiarata < 0,40 | niente titoli con tema di perdita (si usa la valenza **dichiarata**, non quella avvicinata alla playlist) |
| Crisi o sostanze (livello di sicurezza della sessione) | solo titoli senza tema di perdita e con energia ≤ 0,45; la scheda d'aiuto resta prima di tutto |
| Minori | nessun film, serie o gioco (come dalla 5.1: i cataloghi non hanno classificazioni d'età verificate) |
| Titolo approvato con tema di perdita | la scheda mostra «Tocca il tema della perdita, con delicatezza.» |

UT-CARE-04 verifica queste regole su 15 stati d'animo × 8 contesti × 3 semi; UT-CARE-05 verifica che, fuori dalla crisi, ogni medium proponga sempre qualcosa.

## 5. Che cosa dicono le schede

- **Nessuna promessa di effetto.** Le note curate cominciavano spesso con «Utile per…» («Utile per ridimensionare l'ansia»). Il pannello mostra solo la parte descrittiva (`publicCareNote`), e UT-CARE-06 controlla che nessuna nota mostrata contenga parole come ansia, depressione, terapia, cura, guarire, sintomi. Sei note sono state riscritte a mano.
- **Coerenza.** Le note che passavano per un regista («Per i silenzi di Kitano: …») sono state riscritte come descrizioni dell'opera; un test impedisce che ritornino.
- **Trasparenza.** Sotto il titolo della sezione: «Scelti per il tono: vicini a come stai, poi un passo più sereno. Ogni titolo è stato rivisto: niente suicidio o autolesionismo, violenza, abusi o dipendenze. Sono compagnia, non una cura.»
- Il pulsante e la nota «Cochrane», non visibili ma ancora nel codice, sono stati tolti: suggerivano prove di efficacia che per questi media non esistono.

## 6. Che cosa resta da fare (per un'approvazione clinica vera)

1. **Doppia revisione indipendente.** Due clinici (per esempio uno psichiatra e uno psicologo dell'età adulta) rivedono i 188 approvati e i 175 esclusi, separatamente, con gli stessi criteri. Accordo con l'α di Krippendorff; i disaccordi si risolvono con un terzo revisore. Va dentro lo studio V-5 del piano di validazione.
2. **Fonti di classificazione.** Aggiungere per ogni film, serie e gioco la classificazione d'età ufficiale (per esempio PEGI, ESRB, BBFC) e i descrittori di contenuto, così che la revisione non dipenda dalla memoria di chi l'ha fatta.
3. **Decisione sull'effetto Papageno.** Stabilire con i clinici se e come proporre racconti di recupero, per esempio solo su richiesta esplicita della persona.
4. **Firma.** Registrare nel repository nome, ruolo e data dei revisori e la versione del catalogo approvata.

## Riferimenti

- Bridge, J. A., Greenhouse, J. B., Ruch, D., et al. (2020). Association between the release of Netflix's *13 Reasons Why* and suicide rates in the United States: An interrupted time series analysis. *Journal of the American Academy of Child & Adolescent Psychiatry*, 59(2), 236–243. https://doi.org/10.1016/j.jaac.2019.04.020
- Garrido, S., & Schubert, E. (2015). Music and people with tendencies to depression. *Music Perception*, 32(4), 313–321. https://doi.org/10.1525/mp.2015.32.4.313
- Grady, S. M., Eden, A., & Wolfers, L. N. (2026). Examining comfort media: A tool for self-regulation and refuge? *Mass Communication and Society*, 29(2), 245–268. https://doi.org/10.1080/15205436.2025.2519191
- Niederkrotenthaler, T., Voracek, M., Herberth, A., et al. (2010). Role of media reports in completed and prevented suicide: Werther v. Papageno effects. *British Journal of Psychiatry*, 197(3), 234–243. https://doi.org/10.1192/bjp.bp.109.074633
- Niederkrotenthaler, T., Stack, S., Till, B., et al. (2019). Association of increased youth suicides in the United States with the release of *13 Reasons Why*. *JAMA Psychiatry*, 76(9), 933–940. https://doi.org/10.1001/jamapsychiatry.2019.0922
- World Health Organization & International Association for Suicide Prevention (2017). *Preventing suicide: A resource for media professionals, update 2017*. Geneva: WHO.
