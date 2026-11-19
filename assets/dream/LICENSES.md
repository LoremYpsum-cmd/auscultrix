# Dreamcore assets — licenses

All ambient GIFs and fonts ship **inside** the extension (no remote hotlinks). Suitable for Chrome Web Store packaging.

## GIFs (`mist.gif`, `orbs.gif`, `stars.gif`)

| File | Description | License | Source |
|------|-------------|---------|--------|
| `mist.gif` | Soft liminal fog wash (unisex, abstract) | **CC0 1.0** | Original generative loops created for Auscultrix (Pillow), 2026 — see `assets/vj/CC0-DEDICATION.md` |
| `orbs.gif` | Floating soft light orbs | **CC0 1.0** | Same |
| `stars.gif` | Soft twinkling stars on mist | **CC0 1.0** | Same |

No gendered characters, logos, or trademarked imagery. Abstract atmosphere only.

## Still (`hill_calm.jpg`)

| File | Description | License | Source |
|------|-------------|---------|--------|
| `hill_calm.jpg` | Calm green mountain / blue sky (side-panel still) | **CC0 1.0** | Graded from Vision pack `landscape_calm.jpg`, itself from Wikimedia Commons [Green mountain under blue sky (Unsplash)](https://commons.wikimedia.org/wiki/File:Green_mountain_under_blue_sky_(Unsplash).jpg) |

**Removed in 3.6.4:** `bliss_hill.jpg` (Bliss-named file without verified public-domain upstream URL).

## Fonts (`fonts/*.woff2`)

| Family | Files | License | Upstream |
|--------|-------|---------|----------|
| **Cormorant Garamond** | `cormorant-garamond-v16-latin-regular.woff2`, `…-600.woff2` | **SIL Open Font License 1.1** | [Google Fonts / Cormorant Garamond](https://fonts.google.com/specimen/Cormorant+Garamond) via Fontsource |
| **Lexend** | `lexend-latin-400.woff2`, `lexend-latin-500.woff2`, `lexend-latin-ext-400.woff2`, `lexend-latin-ext-500.woff2` | **SIL Open Font License 1.1** | [Google Fonts / Lexend](https://fonts.google.com/specimen/Lexend) via Fontsource — dyslexia-/reading-proficiency body UI (3.6.9+) |
| **Outfit** | `outfit-latin-400.woff2`, `outfit-latin-500.woff2` | **SIL Open Font License 1.1** | [Google Fonts / Outfit](https://fonts.google.com/specimen/Outfit) via Fontsource (retained; body UI prefers Lexend) |

Bundled locally because Manifest V3 extension pages default to a strict CSP that blocks remote font/CSS hosts.

## Attribution note

CC0 assets may be used without attribution; OFL fonts retain their copyright notices in the font binaries. This file documents provenance for the thesis and store review.
