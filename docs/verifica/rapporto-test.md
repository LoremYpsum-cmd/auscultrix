# Rapporto dei test — Auscultrix

> Generato automaticamente da `node tests/run-all.mjs` a partire dall'esecuzione reale. Non modificare a mano.

- Data: 2026-11-19T10:15:37.951Z
- Versione dell'estensione: 6.0.0
- Node: v26.13.0 · Sistema: darwin 25.5.0 arm64
- Chromium per i test end-to-end: non disponibile: test end-to-end saltati

**Esito: 91 superati, 0 falliti, 25 saltati, su 116.**

## Suite «unit» (91 test, 10 s)

| Esito | Test | Durata |
|---|---|---|
| superato | UT-I18N-01 Italian and English catalogues have the same keys and placeholders | 1 ms |
| superato | UT-I18N-02 every key used in HTML and in t('…') calls exists | 8 ms |
| superato | UT-I18N-03 no UI copy calls the product a therapy or a cure | 0 ms |
| superato | UT-I18N-04 no visible element falls back to its hard-coded text (an empty message would leave one language in the other UI) | 1 ms |
| superato | UT-PHOTO-01 Vision GIFs never change frame faster than 3 per second (delays ≥ 330 ms) | 12 ms |
| superato | UT-PHOTO-02 WCAG 2.3.1 screening of every GIF: ≤ 3 flashes/s, no red flashes (fixture from tools/photosensitivity_check.py) | 0 ms |
| superato | UT-PHOTO-03 SAFE mode caps keep every ambient layer below the WCAG flash definition (opacity × Δlum < 0.10) | 0 ms |
| superato | UT-ZOOM-01 thesis §9.4: peak 1.25 exactly at mid-track for 95–420 s, baseline at both ends, symmetric | 1 ms |
| superato | UT-LYR-01 thesis §7.9: sad Italian lyrics lower valence, joyful English raise it, short texts give no verdict, weights capped | 2 ms |
| superato | UT-LYR-02 lyrics lookup is opt-in (off unless the person enables it) | 0 ms |
| superato | UT-ISO-01 the path starts on the declared state and holds the target after the shift window | 1 ms |
| superato | UT-ISO-02 distance to the target never increases along the path; matching phase moves ≤ 18 % | 0 ms |
| superato | UT-ISO-03 legacy index-based waypoints still work (first = start, last = target) | 0 ms |
| superato | UT-ISO-04 unknown or absurd durations fall back to 3.5 min | 0 ms |
| superato | UT-ISO-05 every playlist is ISO-calibrated in both catalogues (6 moods × 2 modes) | 0 ms |
| superato | UT-ISO-06 «Varia»: mean distance track↔waypoint ≤ 0.15 and no consecutive jump > 0.4 | 0 ms |
| superato | UT-ISO-07 «Emergente»: continuity holds (≤ 1 jump > 0.4 per playlist); coverage gaps are measured, not hidden | 0 ms |
| superato | UT-ISO-08 no uncalibrated track inside the mood-matched arc; every uncalibrated track is labelled | 76 ms |
| superato | UT-ISO-09 at most 3 tracks per artist and no duplicates | 43 ms |
| superato | UT-ISO-10 novelty: different session seeds give different playlists; history lowers repeats | 75 ms |
| superato | UT-ISO-11 empty catalogue and an empty place give an empty playlist, never an error | 47 ms |
| superato | UT-ISO-12 too few calibrated tracks → honest discovery list (iso=false), not a fake ISO path | 0 ms |
| superato | UT-ISO-13 «Emergente» uses the same ISO engine (calibration metadata present) | 17 ms |
| superato | UT-SEC-01 permissions are the minimal set (no tabs, no cookies, no <all_urls>, no identity) | 1 ms |
| superato | UT-SEC-02 host permissions limited to the 9 hosts actually used | 0 ms |
| superato | UT-SEC-03 CSP: only packaged scripts, no remote code, no eval | 2619 ms |
| superato | UT-SEC-04 no unsafe DOM sinks or dynamic code in extension code | 44 ms |
| superato | UT-SEC-05 no plain-http endpoints, no telemetry/analytics SDKs | 17 ms |
| superato | UT-SEC-06 the worker no longer exposes the whole storage (GET_STATE removed) | 0 ms |
| superato | UT-SEC-07 end-of-track reports are accepted only from the session player tab | 0 ms |
| superato | UT-SEC-08 Firefox manifest derivation: Chrome-only keys removed, gecko id stable | 63 ms |
| superato | UT-SEC-09 version consistency: manifest = CHANGELOG head = README | 0 ms |
| superato | UT-SEC-10 all extension JS parses (node --check) | 3888 ms |
| superato | UT-REL-01 YouTube content scripts create their observers once per page (no accumulation at SPA navigations) | 0 ms |
| superato | UT-REL-02 the worker serialises playlist moves and cancels stale autoplay bursts | 0 ms |
| superato | UT-SEC-11 no Spotify secret or refresh token in shipped scripts; the build refuses to package one | 7 ms |
| superato | UT-MOOD-01 development set (n=102): valence ≥ 95 %, no polarity flip, no ISO-unsafe target | 9 ms |
| superato | UT-MOOD-02 held-out set (n=50, contaminated after 5.0 lexicon expansion): valence ≥ 90 %, ≤ 1 flip, no ISO-unsafe | 2 ms |
| superato | UT-MOOD-03 negation flips polarity (IT/EN) | 0 ms |
| superato | UT-MOOD-04 robustness: empty, whitespace, emoji only, 100k chars, markup, non-strings never throw and stay in [0,1] | 2 ms |
| superato | UT-MOOD-05 slider extremes and invalid energy are clamped | 0 ms |
| superato | UT-MOOD-06 deterministic: same input → same output | 0 ms |
| superato | UT-MOOD-07 ISO target never farther than ISO_MAX_STEP from the start | 1 ms |
| superato | UT-MOOD-08 the analysis keeps the raw text only in memory fields that the persistence layer strips | 1 ms |
| superato | UT-OWN-01 video ids are read from every YouTube URL form, and only from YouTube | 1 ms |
| superato | UT-OWN-02 a video in the player tab is the session's, adopted from its search, pending, or the person's | 0 ms |
| superato | UT-OWN-03 only the end of the session's own video advances the playlist | 0 ms |
| superato | UT-OWN-04 session video state: recorded, adopted, cleared with the session | 0 ms |
| superato | UT-OWN-05 the worker and the overlay follow the rule (no self-enabling Vision, no adopting any video) | 1 ms |
| superato | UT-PRIV-01 persistableMood strips every field that can contain the person's own words | 0 ms |
| superato | UT-PRIV-02 erase keeps only non-personal catalogue keys | 0 ms |
| superato | UT-PRIV-03 no code path writes the typed text or the photo to chrome.storage.local | 8 ms |
| superato | UT-PRIV-04 every chrome.storage.local key written by the code is inventoried | 46 ms |
| superato | UT-PRIV-05 session-only state: tab ids never in local storage | 1 ms |
| superato | UT-PRIV-06 player-host check accepts YouTube only | 0 ms |
| superato | UT-PRIV-07 read-aloud uses on-device voices only (a network voice would send the mood reading online) | 23 ms |
| superato | UT-SAFE-01 crisis phrases are recognised (recall = 100 % on the reference list) | 1 ms |
| superato | UT-SAFE-02 substance phrases are recognised | 0 ms |
| superato | UT-SAFE-03 everyday expressions do not raise an alarm | 0 ms |
| superato | UT-SAFE-04 crisis wins over substance in the same text | 0 ms |
| superato | UT-SAFE-05 non-string and huge inputs never throw | 1 ms |
| superato | UT-SAFE-06 help resources are the verified Italian numbers | 0 ms |
| superato | UT-SND-01 same mood, settings and seed give the same score; another seed gives another | 4 ms |
| superato | UT-SND-02 no input can exceed the safety limits | 4 ms |
| superato | UT-SND-03 mappings move in the documented direction | 0 ms |
| superato | UT-SND-04 mode has hysteresis: no flapping at a threshold | 0 ms |
| superato | UT-SND-05 the score follows the ISO path and changes mode only on phrase boundaries | 0 ms |
| superato | UT-SND-06 event rate matches the requested rate (Poisson by thinning) | 5 ms |
| superato | UT-SND-07 melodic motion is mostly stepwise (Markov chain) and stays in the mode | 4 ms |
| superato | UT-SND-08 every driven parameter is documented with its type and source | 0 ms |
| superato | UT-SND-09 stored preferences are sanitised | 0 ms |
| superato | UT-WAV-01 WAV export: valid RIFF header, exact length, dither within ±1 LSB | 2 ms |
| superato | UT-PD-01 the Pure Data twin is structurally valid for every soundmark | 1 ms |
| superato | UT-PD-02 the patch opens in Pure Data without errors (skipped when Pd is not installed) | 295 ms |
| superato | UT-AM-01 loudness meter follows ITU-R BS.1770-4 (1 kHz, 0 dBFS, one channel = −3.01 LKFS) | 31 ms |
| superato | UT-AM-02 spectral centroid and onset detector on known signals | 32 ms |
| superato | UT-CX-01 circumplex geometry and diary summary | 0 ms |
| superato | UT-EN-01 thesis §7.4 worked example: «Tutti» (99 BPM, −14.3 dB, D 0.467, A 0.333) → E = 0.584 | 0 ms |
| superato | UT-EN-02 normalisations: 60 BPM → 0, 180 BPM → 1; −45 dB → 0, −5 dB → 1 (clamped outside) | 0 ms |
| superato | UT-EN-03 ordinal validity: fast, loud, danceable, electric > slow, quiet, acoustic | 0 ms |
| superato | UT-EN-04 valence is never inferred from popularity (no measured input → neutral 0.5, marked unknown) | 0 ms |
| superato | UT-EN-05 the formula label is used only with measured inputs | 0 ms |
| superato | UT-PROV-01 annotated corpora and audio measurements are grounded; catalogue placeholders are not | 0 ms |
| superato | UT-PROV-02 Emergente catalogue: Italy/World Bandcamp placeholders (0.45/0.50) are flagged unannotated | 7 ms |
| superato | UT-PROV-03 measured seed features are re-attached to the curator catalogue offline (≥ 300 matches) | 19 ms |
| superato | UT-PROV-04 corpus annotations: coordinates in [0,1], unique ids, all four Russell quadrants covered | 2 ms |
| superato | UT-UM-01 concurrent writes are not lost (queue) | 1 ms |
| superato | UT-UM-02 only numbers and labels are stored; history capped at 60 | 4 ms |
| superato | UT-UM-03 personalisation prior moves the declared state by at most 0.08 | 2 ms |
| superato | UT-UM-04 erase waits for pending writes and leaves nothing | 0 ms |
| superato | UT-AGE-01 children are recognised (IT/EN), adults talking about years are not | 1 ms |

## Suite «e2e» (25 test, 0 s)

| Esito | Test | Durata |
|---|---|---|
| saltato | E2E-A11Y-01 (light) names, alt text, dialogs, target size ≥ 24 px, text contrast ≥ 4.5:1 (Playwright not installed) | 0 ms |
| saltato | E2E-A11Y-01 (dark) names, alt text, dialogs, target size ≥ 24 px, text contrast ≥ 4.5:1 (Playwright not installed) | 0 ms |
| saltato | E2E-A11Y-02 keyboard only: reach the diary, a label and «Begin», focus always visible (Playwright not installed) | 0 ms |
| saltato | E2E-PERF-01 budgets: panel ready < 3 s, session built < 1.5 s, heap growth < 25 MB over 20 sessions, storage < 5 MB (Playwright not installed) | 0 ms |
| saltato | E2E-01 first run: notice with onboarding steps, focus trapped, «don't show again» remembered (Playwright not installed) | 0 ms |
| saltato | E2E-02 a session: calibrated playlist, compact list, player opened, typed text never on disk (Playwright not installed) | 0 ms |
| saltato | E2E-03 crisis: help first — no player, no sheet, crisis copy, «choose for me» opens nothing, no donation ask (Playwright not installed) | 0 ms |
| saltato | E2E-04 substances: the national addiction line is offered, music still allowed (Playwright not installed) | 0 ms |
| saltato | E2E-05 children: only suitable music, no films, series or games (Playwright not installed) | 0 ms |
| saltato | E2E-12 rapid repeated actions: triple «Begin» = one session; six quick «Next» stay consistent (Playwright not installed) | 0 ms |
| saltato | E2E-13 no internet: every external request fails, the panel still works with no error shown (Playwright not installed) | 0 ms |
| saltato | E2E-14 restart: playlist and preferences persist; typed text and photo do not (Playwright not installed) | 0 ms |
| saltato | E2E-15 «Forget everything»: only public catalogues and safe defaults remain (Playwright not installed) | 0 ms |
| saltato | E2E-16 service worker suspended and restarted (MV3 idle): session state survives, player still owned (Playwright not installed) | 0 ms |
| saltato | E2E-17 options page: diary style, localised, no errors (Playwright not installed) | 0 ms |
| saltato | E2E-21 soundscape: safe levels, tempo and brightness follow the mapping, reproducible (A1–A5) (Playwright not installed) | 0 ms |
| saltato | E2E-06 a video ending in the person's own YouTube tab never moves that tab (no hijack) (Playwright not installed) | 0 ms |
| saltato | E2E-07 browser restart: no tab id survives on disk; the next session opens a new player tab (Playwright not installed) | 0 ms |
| saltato | E2E-08 auto-advance: the end of a track in the player tab opens the next one (Playwright not installed) | 0 ms |
| saltato | E2E-09 end of playlist: the session closes, it never jumps back to the first track (Playwright not installed) | 0 ms |
| saltato | E2E-10 Vision: an explicit «off» is respected on the next tracks (Playwright not installed) | 0 ms |
| saltato | E2E-11 Vision: with «reduce motion» it never switches on by itself (Playwright not installed) | 0 ms |
| saltato | E2E-18 a video the person picks in the player tab is theirs: it never advances the playlist, YouTube carries on, ▶ resumes (Playwright not installed) | 0 ms |
| saltato | E2E-19 Vision appears only on the session's own video, never in the person's other YouTube tabs (Playwright not installed) | 0 ms |
| saltato | E2E-20 a track opened through a YouTube search: the result becomes the session's video and its end advances (Playwright not installed) | 0 ms |

## Simulazione: qualità della traiettoria ISO sui cataloghi reali

Finestra di spostamento: 25 minuti. Brani calibrati nel catalogo «Varia»: 592.

| Umore | Catalogo | Brani | Calibrati | Distanza media dal punto ISO | Salto massimo | Salti > 0,4 |
|---|---|---|---|---|---|---|
| ansia | emergente | 40 | 80 % | 0.142 | 0.34 | 0/31 |
| ansia | varia | 40 | 80 % | 0.085 | 0.25 | 0/31 |
| tristezza | emergente | 40 | 80 % | 0.084 | 0.24 | 0/31 |
| tristezza | varia | 40 | 80 % | 0.075 | 0.27 | 0/31 |
| euforia | emergente | 40 | 80 % | 0.463 | 0.32 | 0/31 |
| euforia | varia | 40 | 80 % | 0.050 | 0.13 | 0/31 |
| rabbia | emergente | 40 | 80 % | 0.243 | 0.25 | 0/31 |
| rabbia | varia | 40 | 80 % | 0.134 | 0.29 | 0/31 |
| calma | emergente | 40 | 80 % | 0.199 | 0.32 | 0/31 |
| calma | varia | 40 | 80 % | 0.132 | 0.33 | 0/31 |
| apatia | emergente | 40 | 80 % | 0.070 | 0.25 | 0/31 |
| apatia | varia | 40 | 80 % | 0.060 | 0.16 | 0/31 |

## Validazione esterna del motore testuale

Fonte dei numeri: stored result of 2026-11-06T19:46:50.896Z. Dati annotati da persone, mai usati per tarare il motore.

| Corpus | Versione | n | r di Pearson [IC 95 %] | Accuratezza di polarità [IC 95 %] | Copertura |
|---|---|---|---|---|---|
| emobank_valence | v4.33 | 1000 | 0.039 [-0.023, 0.101] | 0.039 [0.019, 0.078] | 0.07 |
| emobank_arousal | v4.33 | 1000 | 0.079 [0.017, 0.141] | — | — |
| vader_tweets | v4.33 | 4200 | 0.288 [0.260, 0.316] | 0.112 [0.101, 0.125] | 0.12 |
| vader_movieReviewSnippets | v4.33 | 10605 | 0.074 [0.055, 0.093] | 0.044 [0.040, 0.049] | 0.07 |
| vader_nytEditorialSnippets | v4.33 | 5190 | 0.074 [0.047, 0.101] | 0.032 [0.024, 0.042] | 0.05 |
| vader_amazonReviewSnippets | v4.33 | 3708 | 0.179 [0.147, 0.210] | 0.049 [0.041, 0.059] | 0.05 |
| emobank_valence | current | 1000 | 0.200 [0.140, 0.259] | 0.150 [0.105, 0.209] | 0.19 |
| emobank_arousal | current | 1000 | 0.018 [-0.044, 0.080] | — | — |
| vader_tweets | current | 4200 | 0.523 [0.501, 0.545] | 0.366 [0.348, 0.384] | 0.40 |
| vader_movieReviewSnippets | current | 10605 | 0.212 [0.193, 0.230] | 0.193 [0.185, 0.201] | 0.28 |
| vader_nytEditorialSnippets | current | 5190 | 0.220 [0.194, 0.246] | 0.177 [0.159, 0.197] | 0.23 |
| vader_amazonReviewSnippets | current | 3708 | 0.357 [0.329, 0.385] | 0.252 [0.235, 0.270] | 0.30 |

## Prestazioni misurate (end-to-end)

- Pannello pronto: mediana 467 ms, massimo 1062 ms (5 aperture)
- Costruzione della sessione (analisi + playlist + resa): mediana 68 ms, 95° percentile 85 ms (20 sessioni)
- Crescita della memoria JS dopo 20 sessioni: 1 MB
- Spazio occupato in chrome.storage.local: 35 KB
- Misurato il: 2026-11-07T11:28:46.614Z

## Cosa questi test non coprono

- Firefox e Safari reali: i test girano su Chromium. La variante Firefox è verificata solo staticamente (manifest derivato, assenza di API Chrome-only).
- YouTube reale: le pagine YouTube sono simulate in locale (stesso URL, elemento video reale); i cambiamenti del sito YouTube non sono coperti.
- Accessibilità: controlli automatici scritti sui criteri WCAG 2.2 (nomi, alternative testuali, contrasto, dimensione dei bersagli, tastiera, dialoghi); axe-core e prove con lettori di schermo non sono stati eseguiti.
- Validità del motore in italiano: nessun corpus italiano annotato da persone era raggiungibile; vedi il piano di validazione.

