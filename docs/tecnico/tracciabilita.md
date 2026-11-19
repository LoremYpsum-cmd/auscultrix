# Matrice di tracciabilità requisiti → test

> Generata da `node tests/run-all.mjs` il 2026-11-19T10:15:37.951Z (versione 6.0.0) a partire da `tests/requirements.json` e dall'esecuzione reale dei test. Origine: RF/RNF = capitolo 4 della tesi; gli altri sono stati aggiunti nella revisione 5.0/5.1.

| Requisito | Origine | Descrizione | Test | Esito |
|---|---|---|---|---|
| REQ-F01 | RF1 | Mood input: free text, six labelled chips, energy slider 0–100, optional photo analysed on the device. | UT-MOOD-04, UT-MOOD-05, E2E-02, E2E-14 | non verificato (test saltati) |
| REQ-F02 | RF2 | Music database from documented sources; every track carries the provenance of its affective coordinates. | UT-PROV-01, UT-PROV-02, UT-PROV-03, UT-PROV-04 | verificato |
| REQ-F03 | RF3 | Playlist generated with the ISO principle: start on the declared state, shift gradually, only calibrated tracks on the mood-matched path. | UT-ISO-01, UT-ISO-02, UT-ISO-05, UT-ISO-06, UT-ISO-07, UT-ISO-08, UT-ISO-12, UT-ISO-13 | verificato |
| REQ-F04 | RF4 | Playback on YouTube in a tab opened by the extension. | E2E-02, E2E-07 | non verificato (test saltati) |
| REQ-F05 | RF5 | Auto-advance at the end of the track, only in the session's own player tab and only for the video Auscultrix put there: a video the person picks in that tab is theirs (no advance, YouTube's autoplay carries on, the panel shows the playlist paused, ▶ resumes). | E2E-08, E2E-06, UT-SEC-07, UT-OWN-02, UT-OWN-03, E2E-18, E2E-20 | non verificato (test saltati) |
| REQ-F06 | RF6 | Vision overlay at 3 fps with slow cross-fades and duration-linked zoom, only on the session's own video in its own tab (never in the person's other YouTube tabs or on a video they choose). | UT-PHOTO-01, UT-ZOOM-01, UT-OWN-05, E2E-18, E2E-19 | non verificato (test saltati) |
| REQ-F08 | RF8 | Interface in Italian and English with identical keys and placeholders. | UT-I18N-01, UT-I18N-02 | verificato |
| REQ-F09 | RF9 | Wellbeing notice at first run with help resources (IASP, 112, Telefono Amico) and «don't show again». | E2E-01, UT-SAFE-06 | non verificato (test saltati) |
| REQ-F11 | RF11 | Local user model: numbers and labels only, last 60 sessions, visible and erasable. | UT-UM-01, UT-UM-02, UT-UM-04, E2E-15 | non verificato (test saltati) |
| REQ-F12 | RF12–13 | Comforting media (books, films) proposed after the mood analysis. | E2E-02 | non verificato (test saltati) |
| REQ-F14 | RF14 | «Choose for me» disabled until there is mood input. | E2E-01 | non verificato (test saltati) |
| REQ-F15 | RF15 | Read-aloud of the analysis with a local voice (never throws). | E2E-02 | non verificato (test saltati) |
| REQ-F16 | 5.1 | At the end of the playlist the session closes; it never jumps back to the first track. | E2E-09 | non verificato (test saltati) |
| REQ-F17 | 5.1.1 | The player tab's video ids are read safely from every YouTube URL form; session video state is kept in memory only and cleared with the session. | UT-OWN-01, UT-OWN-04 | verificato |
| REQ-S01 | 5.0/5.1 | Crisis words: help first, no autoplay, nothing opened on the person's behalf, crisis-appropriate copy. | UT-SAFE-01, UT-SAFE-04, E2E-03 | non verificato (test saltati) |
| REQ-S02 | 5.0 | Substance words: national addiction line offered; music still available; its opening days are shown. | UT-SAFE-02, E2E-04 | non verificato (test saltati) |
| REQ-S03 | 5.1 | No request for donations after a session where help was shown, nor to minors. | E2E-03 | non verificato (test saltati) |
| REQ-S04 | 5.1 | Minors: no film, series or game without a verified age rating. | E2E-05, UT-AGE-01 | non verificato (test saltati) |
| REQ-S05 | RNF3 | Photosensitive safety: ≤ 3 flashes/s, no red flashes; in SAFE mode opacity × luminance step < 0.10. | UT-PHOTO-01, UT-PHOTO-02, UT-PHOTO-03, UT-I18N-04 | verificato |
| REQ-S06 | 5.1 | The person's own tabs are never navigated or driven by the extension, also after a browser restart. | E2E-06, E2E-07, UT-PRIV-06 | non verificato (test saltati) |
| REQ-S07 | 5.1 | Vision: an explicit «off» is respected; never switched on by itself with «reduce motion». | E2E-10, E2E-11 | non verificato (test saltati) |
| REQ-S08 | 5.0 | Everyday expressions do not raise false alarms. | UT-SAFE-03, UT-SAFE-05 | verificato |
| REQ-P01 | RNF1 | Typed text and photo never written to disk; crisis level kept in memory only. | UT-PRIV-01, UT-PRIV-03, UT-PRIV-05, E2E-02, E2E-03, E2E-14 | non verificato (test saltati) |
| REQ-P02 | RF11 | «Forget everything» removes every personal key and the session state. | UT-PRIV-02, E2E-15 | non verificato (test saltati) |
| REQ-P03 | RNF1 | No transmission of what the person writes; no Apple/Deezer lookups; no telemetry. | E2E-13, UT-SEC-05 | non verificato (test saltati) |
| REQ-P04 | 5.1 | Lyrics lookup (lrclib.net) only after explicit consent. | UT-LYR-02 | verificato |
| REQ-P05 | RNF5 | Minimal permissions and host permissions. | UT-SEC-01, UT-SEC-02, UT-SEC-08 | verificato |
| REQ-P06 | 5.1 | Every stored key is inventoried with its purpose. | UT-PRIV-04 | verificato |
| REQ-P07 | RNF1 / RF15 | Read-aloud uses only voices that run on the device; with none for the language it stays off and says why (a network voice would send the mood reading online). | UT-PRIV-07, E2E-02 | non verificato (test saltati) |
| REQ-NF01 | RNF6 | Works offline with the bundled catalogues; no error shown when services are unreachable. | E2E-13 | non verificato (test saltati) |
| REQ-NF02 | 5.1 | Playlist and settings persist across browser restarts. | E2E-14 | non verificato (test saltati) |
| REQ-NF03 | MV3 | Service-worker suspension does not lose the session nor the player tab. | E2E-16 | non verificato (test saltati) |
| REQ-NF04 | 5.1 | Rapid repeated actions do not duplicate sessions or corrupt state. | E2E-12, UT-UM-01, UT-REL-02 | non verificato (test saltati) |
| REQ-NF05 | RNF4 | Accessibility (WCAG 2.2 AA subset): names, alt text, contrast, target size ≥ 24 px, keyboard, dialogs. | E2E-A11Y-01 (light), E2E-A11Y-01 (dark), E2E-A11Y-02, E2E-01 | non verificato (test saltati) |
| REQ-NF06 | 5.1 | Performance budgets: panel ready < 3 s, session < 1.5 s, heap growth < 25 MB/20 sessions, storage < 5 MB. | E2E-PERF-01 | non verificato (test saltati) |
| REQ-NF07 | RNF5 | Security: CSP with packaged scripts only, no unsafe DOM sinks or dynamic code, no plain-http endpoints. | UT-SEC-03, UT-SEC-04, UT-SEC-05, UT-SEC-06 | verificato |
| REQ-NF08 | 5.1 | Release integrity: all code parses, versions consistent, Firefox manifest derived correctly. | UT-SEC-08, UT-SEC-09, UT-SEC-10 | verificato |
| REQ-NF09 | 4.26.5 | No accumulation of observers/intervals on YouTube single-page navigation. | UT-REL-01 | verificato |
| REQ-NF10 | RNF2 | No credential ships in the package: the build refuses Spotify client secrets, refresh tokens and key files. | UT-SEC-11 | verificato |
| REQ-SC01 | §7.4 | Energy formula as documented (worked example «Tutti» = 0.584; ordinal validity). | UT-EN-01, UT-EN-02, UT-EN-03, UT-EN-05 | verificato |
| REQ-SC02 | §9.4 | Vision zoom peaks at mid-track for any duration; symmetric; baseline at ends. | UT-ZOOM-01 | verificato |
| REQ-SC03 | §7.9 | Lyrics fusion bounded (≤ 35 % valence, ≤ 15 % energy), pure function. | UT-LYR-01 | verificato |
| REQ-SC04 | §7.2 | ISO target bounded (Euclidean ≤ 0.3) and never opposite to the start. | UT-MOOD-07 | verificato |
| REQ-SC05 | 5.0 | In-house regression gates for the affect engine (development and held-out sets). | UT-MOOD-01, UT-MOOD-02, UT-MOOD-03, UT-MOOD-06 | verificato |
| REQ-SC06 | §7.7 | Personalisation prior moves the declared state by at most 0.08. | UT-UM-03 | verificato |
| REQ-SC07 | §7.6/§7.8 | Variety: max 3 tracks per artist, novelty across sessions, empty places handled. | UT-ISO-09, UT-ISO-10, UT-ISO-11 | verificato |
| REQ-SC08 | 5.1 | Valence never inferred from popularity. | UT-EN-04 | verificato |
| REQ-SND-01 | 6.0 | Generative soundscape computed on the device, following the same ISO trajectory as the playlist (start on the declared state, shift, hold). | UT-SND-05, UT-SND-01 | verificato |
| REQ-SND-02 | 6.0 | Affect-to-sound mapping uses documented musical cues; every driven parameter is listed with its mapping type and source. | UT-SND-03, UT-SND-08, E2E-21 | non verificato (test saltati) |
| REQ-SND-03 | 6.0 | Hearing and comfort safety: bounded event rate, slow modulation, fades ≥ 6–8 s, 40 Hz–12 kHz band, limiter, peak ≤ −1 dBFS, quiet loudness at the default volume. | UT-SND-02, E2E-21 | non verificato (test saltati) |
| REQ-SND-04 | 6.0 | Stochastic structure: non-homogeneous Poisson events at the requested rate; stepwise Markov melody within the current mode; no mode flapping. | UT-SND-06, UT-SND-07, UT-SND-04 | verificato |
| REQ-SND-05 | 6.0 | Reproducible exports: 16-bit WAV with dither, JSON score, Pure Data vanilla twin that opens without errors. | UT-WAV-01, UT-PD-01, UT-PD-02, E2E-21 | non verificato (test saltati) |
| REQ-SND-06 | 6.0 | Measurement tools are correct on known signals (ITU-R BS.1770-4 loudness, spectral centroid, onset detection). | UT-AM-01, UT-AM-02 | verificato |
| REQ-SND-07 | 6.0 | Soundscape preferences are inventoried and erased by «Forget everything»; in a crisis the soundscape never starts by itself. | UT-PRIV-04, UT-SND-09 | verificato |
| REQ-VIS-01 | 6.0 | Diary map: past sessions drawn on the valence–arousal plane with a text and table alternative; no trend line, no health claim. | UT-CX-01 | verificato |

**26 requisiti verificati, 0 non soddisfatti, 29 incompleti o non verificati, su 55.**

Non verificabili automaticamente qui: funzionamento in Firefox e Safari reali, YouTube reale, prove con lettori di schermo, efficacia sul benessere (vedi `docs/scientifico/piano-di-validazione.md`).
