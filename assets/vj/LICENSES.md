# VJ landscape + ambient assets — licenses

All Vision media ships **inside** the extension (no remote hotlinks). Every still and derived GIF is **CC0 1.0** or **Public Domain**, or an original procedural overlay with an in-repo **CC0 1.0 dedication**. No Microsoft Bliss / Windows XP wallpaper; no uncleared stock.

Provenance rebuild: `scripts/generate_vj_landscapes.py` + `scripts/generate_vj_ambient_gifs.py`  
Source stills (CC0 downloads): `assets/vj/_sources/` (dev rebuild only; excluded from store ZIP).

## Mood → landscape map (3.6.4)

| Mood / energy bucket | Primary GIF | Ambient layers |
|----------------------|-------------|----------------|
| «sto alla grande» / joy + energy ≥ 72% | `landscape_sunflower` | `ambient_sunbeams` |
| happiness + mid energy | `landscape_golden` | sunbeams + light drizzle |
| happiness + low energy | `landscape_meadow` | drizzle + soft sunbeams |
| motivated / drive | `landscape_dawn` | drizzle + soft fog |
| relaxed / calm | `landscape_calm` | drizzle + soft fog |
| anxious / tension | `landscape_pastoral` (low energy → `mist`) | rain + fog + window |
| sadness / melancholy | `mist` / `dusk` / `meadow` by energy | rain + fog + night |
| tired / low motivation | `landscape_dusk` | fog + night |
| neutral high / mid / low | `dawn` / `day` / `calm` | drizzle (± fog) |

Loops: **8–12 frames @ 333 ms (3 FPS)**. Soft motion only — photosensitive-safe.

## Landscape GIFs + JPG fallbacks (CC0 Wikimedia stills → soft Ken Burns)

| Packaged file | Mood | License | Upstream still (Wikimedia Commons) |
|---------------|------|---------|--------------------------------------|
| `landscape_sunflower.gif` / `.jpg` | Joy + high energy — sunny sunflowers | **CC0 1.0** | [Sunflower field in late afternoon sun… Munich](https://commons.wikimedia.org/wiki/File:Sunflower_field_in_late_afternoon_sun_with_cloudy_sky_in_Munich,_Germany.jpg) |
| `landscape_golden.gif` / `.jpg` | Happy mid — golden sun against fields | **CC0 1.0** | [Ehrenbach, clouds over fields and forest against sun](https://commons.wikimedia.org/wiki/File:Ehrenbach,_clouds_over_fields_and_forest_against_sun.jpg) |
| `landscape_meadow.gif` / `.jpg` | Content / soft joy | **CC0 1.0** | [Meadow in Niederfinow 2021-07-17 03](https://commons.wikimedia.org/wiki/File:Meadow_in_Niederfinow_2021-07-17_03.jpg) |
| `landscape_day.gif` / `.jpg` | Neutral mid — green field / blue sky | **CC0 1.0** | [Lush Green Field Under Clear Blue Sky](https://commons.wikimedia.org/wiki/File:Lush_Green_Field_Under_Clear_Blue_Sky.jpg) |
| `landscape_calm.gif` / `.jpg` | Relaxed — cooler mountain / sky | **CC0 1.0** | [Green mountain under blue sky (Unsplash)](https://commons.wikimedia.org/wiki/File:Green_mountain_under_blue_sky_(Unsplash).jpg) |
| `landscape_dusk.gif` / `.jpg` | Low energy — dusk trees | **CC0 1.0** | [Sunset with layered trees](https://commons.wikimedia.org/wiki/File:Sunset_with_layered_trees.jpg) |
| `landscape_pastoral.gif` / `.jpg` | Anxious — clouded pastoral | **CC0 1.0** | [Ehrenbach, clouds over fields and forest](https://commons.wikimedia.org/wiki/File:Ehrenbach,_clouds_over_fields_and_forest.jpg) |
| `landscape_mist.gif` / `.jpg` | Sad — fog trees | **CC0 1.0** | [Trees in fog on Bornholm](https://commons.wikimedia.org/wiki/File:Trees_in_fog_on_Bornholm.jpg) |
| `landscape_dawn.gif` / `.jpg` | Motivated — dawn forest light | **CC0 1.0** | [Foggy morning dawn in the forest](https://commons.wikimedia.org/wiki/File:Foggy_morning_dawn_in_the_forest_(49072016353).jpg) |

Extra CC0 still kept for rebuild (sunny sunflowers alternate):  
`_sources/sunflower_blue_sky.jpg` ← [Sončnice na modrem nebu…](https://commons.wikimedia.org/wiki/File:Son%C4%8Dnice_na_modrem_nebu_-_Sunflowers_in_blue_sky_-_Helianthus_annuus_(1).JPG)

## Ambient overlays (procedural CC0)

| File | Use | License | Source |
|------|-----|---------|--------|
| `ambient_rain.gif` | Soft diagonal rain | **CC0 1.0** | Original procedural (`scripts/generate_vj_ambient_gifs.py`) — see `CC0-DEDICATION.md` |
| `ambient_drizzle.gif` | Light drizzle floor | **CC0 1.0** | Same |
| `ambient_fog.gif` | Soft drifting fog | **CC0 1.0** | Same |
| `ambient_window_rain.gif` | Rain-on-glass | **CC0 1.0** | Same |
| `ambient_night_window.gif` | Soft night window | **CC0 1.0** | Same |
| `ambient_sunbeams.gif` | Golden sunbeams (joy / sunflower) | **CC0 1.0** | Original procedural (`scripts/generate_vj_landscapes.py`) — see `CC0-DEDICATION.md` |

## Removed (3.6.4 license audit)

| Removed | Reason |
|---------|--------|
| `bliss_reference.png` | Bliss-named reference without verified Wikimedia CC0 URL — replaced by CC0 mountain/field stills |
| Prior generative “Bliss-like” grades without upstream URL | Replaced by documented CC0 Commons downloads |

## Attribution note

CC0 assets may be used without attribution. This file documents provenance for the thesis and Chrome Web Store review.
