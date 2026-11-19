# 7 | Il modello affettivo | The affective model

## 7.1 | Lo stato dichiarato | The declared state

IT: Lo stato della persona è un punto (v, a) nel piano circomplesso, con valenza v e arousal a in [0, 1]. Ha tre fonti, tutte scelte dalla persona: il **testo** libero e le etichette; il **cursore dell'energia**, che è un'autovalutazione diretta dell'attivazione, come nel Self-Assessment Manikin (Bradley e Lang, 1994); la **foto**, facoltativa, da cui si ricava solo una frase descrittiva dai colori, senza riconoscere che cosa ritrae.
EN: The person's state is a point (v, a) in the circumplex plane, with valence v and arousal a in [0, 1]. It has three sources, all chosen by the person: free **text** and labels; the **energy slider**, a direct self-rating of activation, as in the Self-Assessment Manikin (Bradley and Lang, 1994); the optional **photo**, from which only a descriptive sentence about colours is derived, without recognising what it depicts.

## 7.2 | Il motore testuale | The text engine

IT: Il motore (`lib/mood.js`, `lib/affect-lexicon.js`) è lessicale e a regole, e lavora in sette passi.
EN: The engine (`lib/mood.js`, `lib/affect-lexicon.js`) is lexical and rule-based, and works in seven steps.

IT: - **Normalizzazione**: minuscole, accenti tolti, contrazioni inglesi sciolte.
- **Proposizioni**: le avversative («ma», «però», *but*) aprono una nuova proposizione.
- **Lessico**: 23 gruppi in 16 categorie, 210 radici e 142 espressioni multiparola. A ogni gruppo è assegnato un punto (v, a) **scelto a mano**, tenendo come riferimento qualitativo le norme NRC VAD (Mohammad, 2018) e ANEW italiane (Montefinese et al., 2014). Nessun confronto numerico con quelle norme è stato fatto: è lo studio V-1 del piano (§12.6). La 5.0 diceva «calibrate»; la parola è stata corretta.
- **Negazione**: 26 negatori aprono una portata di 4 parole, come in VADER, interrotta dai confini di proposizione. Una parola positiva negata diventa chiaramente negativa; una negativa negata diventa appena positiva («non sono triste» non vuol dire «felice»).
- **Intensità**: 20 intensificatori e 14 attenuatori scalano la distanza dal neutro.
- **Contrasto**: le voci dell'ultima proposizione pesano 1,5, quelle precedenti 0,5 («sono stanca ma contenta» pende verso «contenta»).
- **Fusione** con il cursore (formule sotto).
EN: - **Normalisation**: lower case, accents removed, English contractions expanded.
- **Clauses**: adversatives ("ma", "però", *but*) open a new clause.
- **Lexicon**: 23 groups in 16 categories, 210 stems and 142 multi-word expressions. Each group is assigned a point (v, a) **chosen by hand**, using as a qualitative reference the NRC VAD norms (Mohammad, 2018) and the Italian ANEW norms (Montefinese et al., 2014). No numerical comparison with those norms has been made: it is study V-1 of the plan (§12.6). Edition 5.0 said "calibrated"; the word has been corrected.
- **Negation**: 26 negators open a 4-word scope, as in VADER, cut at clause boundaries. A negated positive word becomes clearly negative; a negated negative word becomes only slightly positive ("I'm not sad" does not mean "happy").
- **Intensity**: 20 intensifiers and 14 downtoners scale the distance from neutral.
- **Contrast**: entries in the last clause weigh 1.5, earlier ones 0.5 ("tired but happy" leans toward "happy").
- **Fusion** with the slider (formulas below).

EQ: v′ = 0,5 − 0,8 · (v − 0,5) &nbsp; (positiva negata) &nbsp;&nbsp;·&nbsp;&nbsp; v′ = 0,5 + 0,22 · (0,5 − v) &nbsp; (negativa negata) || (7.1)

IT: Con wᵢ il peso di ogni voce trovata (contrasto × salienza, dove la salienza è 0,5 più la distanza dal centro del piano) e W la loro somma:
EN: With wᵢ the weight of each matched entry (contrast × salience, where salience is 0.5 plus the distance from the centre of the plane) and W their sum:

EQ: v̂ = Σ wᵢ vᵢ / W &nbsp;&nbsp;&nbsp; â = Σ wᵢ aᵢ / W &nbsp;&nbsp;&nbsp; c = 1 − e<sup>−W</sup> || (7.2)

EQ: a = 0,5 · â + 0,5 · s &nbsp; se il cursore è stato mosso; &nbsp; altrimenti &nbsp; a = c · â + (1 − c) · s || (7.3)

IT: dove s è il valore del cursore e c la confidenza. Quando la persona sposta il cursore, la sua autovalutazione pesa metà dell'arousal finale. È una scelta motivata dalle misure: l'arousal letto dal testo non ha validità esterna (§12.2), mentre il cursore è un'autovalutazione.
EN: where s is the slider value and c the confidence. When the person moves the slider, their self-rating weighs half of the final arousal. The choice is motivated by measurement: arousal read from text has no external validity (§12.2), whereas the slider is a self-rating.

## 7.3 | Il bersaglio ISO | The ISO target

IT: Dallo stato si calcola un bersaglio (`isoTarget`): per ansia o rabbia l'arousal scende verso 0,32 e la valenza sale verso max(v + 0,25; 0,55); per tristezza o apatia la valenza sale verso max(v + 0,25; 0,48) e l'arousal sale al più fino a 0,5; con bisogno di calma l'arousal resta ≤ 0,3; uno stato buono si mantiene. Lo spostamento totale è limitato in distanza euclidea:
EN: From the state a target is computed (`isoTarget`): for anxiety or anger arousal falls toward 0.32 and valence rises toward max(v + 0.25; 0.55); for sadness or apathy valence rises toward max(v + 0.25; 0.48) and arousal rises at most to 0.5; with a need for calm arousal stays ≤ 0.3; a good state is maintained. The total displacement is bounded in Euclidean distance:

EQ: ‖(Δv, Δa)‖ ≤ 0,3 &nbsp;&nbsp; ⇒ &nbsp;&nbsp; se ‖Δ‖ > 0,3 allora Δ ← Δ · 0,3 / ‖Δ‖ || (7.4)

IT: Nella 5.0 il limite era per asse, così che in diagonale lo spostamento arrivava a 0,3·√2 ≈ 0,42. Il bersaglio non è mai opposto al punto di partenza: il percorso accompagna, non ribalta.
EN: In 5.0 the bound was per axis, so a diagonal move could reach 0.3·√2 ≈ 0.42. The target is never opposite to the starting point: the path accompanies, it does not overturn.

## 7.4 | Il livello di sicurezza | The safety layer

IT: Prima di qualunque raccomandazione il testo passa da `lib/safety.js`: liste di frasi in italiano e inglese per la crisi e per l'uso di sostanze, pensate per un richiamo alto (un falso allarme costa una scheda di aiuto, un mancato allarme molto di più), con l'esclusione dei «falsi amici» («drogheria», «canna da pesca», *crack a joke*). L'esito non è una valutazione del rischio e non sostituisce strumenti validati. Attiva soltanto: la scheda con Telefono Amico, 112 e le linee IASP, oppure quella con il Numero Verde nazionale per le dipendenze; l'assenza di avvii automatici, di musica, di paesaggio sonoro e di richieste di donazione. Il livello di crisi resta solo in memoria di sessione (UT-PRIV-05). La scheda indica anche quando le linee rispondono: il Numero Verde dell'ISS, per esempio, è attivo dal lunedì al venerdì. Il comportamento è verificato da sei test (UT-SAFE-01…06).
EN: Before any recommendation the text goes through `lib/safety.js`: Italian and English phrase lists for crisis and substance use, designed for high recall (a false alarm costs a help card, a missed one much more), excluding "false friends" ("drogheria", "canna da pesca", *crack a joke*). The outcome is not a risk assessment and does not replace validated instruments. It triggers only: the card with Telefono Amico, 112 and the IASP lines, or the one with the national addiction helpline; the absence of automatic starts, music, soundscape and donation requests. The crisis level stays only in session memory (UT-PRIV-05). The card also says when the lines answer: the ISS helpline, for instance, operates Monday to Friday. The behaviour is verified by six tests (UT-SAFE-01…06).

## 7.5 | Personalizzazione locale | Local personalisation

IT: Il modello utente conserva le ultime 60 sessioni come numeri: energia, valenza, bersaglio, attività scelta. Nessun punteggio di ansia o tristezza: una storia di «ansia» somiglierebbe a un monitoraggio di sintomi, che non serve allo scopo e non è proporzionato (GDPR, art. 5(1)(c)). Dopo almeno tre sessioni, lo stato dichiarato viene spostato verso la media personale di al più 0,08 (UT-UM-03): una spinta gentile, non una correzione.
EN: The user model keeps the last 60 sessions as numbers: energy, valence, target, chosen activity. No anxiety or sadness scores: a history of "anxiety" would resemble symptom monitoring, which the purpose does not need and is not proportionate (GDPR, art. 5(1)(c)). After at least three sessions, the declared state is moved toward the personal average by at most 0.08 (UT-UM-03): a gentle nudge, not a correction.

IT: **Livello di evidenza.** A per tutte le parti; B per la valenza (regole di negazione e intensità documentate in letteratura); C solo parziale, per la valenza su testi inglesi (§12.2); arousal dal testo senza validità misurabile.
EN: **Level of evidence.** A for all parts; B for valence (negation and intensity rules documented in the literature); only partial C, for valence on English texts (§12.2); arousal from text without measurable validity.
