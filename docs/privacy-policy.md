# Auscultrix — Informativa privacy / Privacy policy

Versione 5.1.1 · 7 novembre 2026

## Italiano

**In breve.** Auscultrix non ha server, non ha account e non raccoglie dati per lo sviluppatore. Ciò che scrivi nel diario, la foto e la lettura del tuo umore non lasciano il tuo computer. Per funzionare, l'estensione contatta alcuni servizi pubblici, elencati qui sotto.

### Che cosa resta sul tuo computer

| Dato | Dove | Per quanto |
|---|---|---|
| Il testo che scrivi in «Come stai, davvero?» | solo nella memoria del pannello | finché il pannello è aperto: **non viene mai salvato** |
| La foto dell'umore | memoria di sessione del browser | fino alla chiusura del browser |
| Energia, valenza, bersaglio e attività delle ultime sessioni (non il testo) | `chrome.storage.local` | fino a «Dimentica tutto di me» |
| Playlist corrente, brani già proposti, preferenze | `chrome.storage.local` | fino a «Dimentica tutto di me» |
| Valori ricavati dai testi delle canzoni (valenza, energia, temi; mai il testo), solo se attivi la funzione | `chrome.storage.local` | fino a «Dimentica tutto di me» |
| Preferenze del paesaggio sonoro (spazio, ambiente, durata, volume) | `chrome.storage.local` | fino a «Dimentica tutto di me» |

Il **paesaggio sonoro** è calcolato interamente sul tuo computer e non usa la rete. I file che esporti (audio WAV, partitura JSON, patch Pure Data) li salvi tu; contengono solo numeri (umore ed energia dichiarati, parametri del suono), mai quello che hai scritto.

«Dimentica tutto di me», in «Le tue cose», cancella tutto questo. Restano solo i cataloghi pubblici di brani e le impostazioni di sicurezza predefinite. I dati non vengono sincronizzati tra dispositivi.

### Quali servizi vengono contattati

| Servizio | Quando | Che cosa riceve |
|---|---|---|
| YouTube (www.youtube.com; i.ytimg.com) | quando avvii una sessione | i brani da riprodurre; con la Visione accesa, anche le miniature dei video, da cui l'estensione ricava i colori. Se hai effettuato l'accesso a YouTube, i brani finiscono nella tua cronologia di YouTube, come per qualunque ascolto. |
| Spotify (open.spotify.com) | al massimo ogni 6 ore | nessun dato tuo: l'estensione legge le pagine pubbliche del profilo del curatore, senza cookie. |
| Bandcamp (bandcamp.com e sottodomini) e il servizio oEmbed di YouTube | una volta al giorno e all'avvio | nessun dato tuo: l'estensione aggiorna il catalogo Emergente da pagine pubbliche e verifica gli id dei video. |
| LRCLIB (lrclib.net) | **solo se attivi** «Leggi i testi delle canzoni» | titolo e artista dei brani della playlist. |
| Siti aperti dai link (Open Library, Goodreads, TMDB, JustWatch, Wikiflix, itch.io, Steam, Apple Podcasts, Cochrane Library, social del curatore) | solo quando fai clic | la tua visita, come per qualunque link. |

Ogni servizio contattato vede, come sempre sul web, il tuo indirizzo IP e il tipo di browser.

### Che cosa Auscultrix non fa

- Non invia a nessuno ciò che scrivi, la foto o la lettura del tuo umore.
- Non usa voci di sintesi online: la lettura a voce funziona solo con le voci installate sul tuo computer, altrimenti resta spenta.
- Non ha telemetria, statistiche d'uso, pubblicità proprie o cookie propri.
- Non analizza volti né voci.

### Minori

Se dici di essere un bambino o un ragazzo, Auscultrix propone solo musica e non chiede donazioni. Non chiede l'età e non verifica chi lo usa.

### Contatti

Il recapito dello sviluppatore è indicato nella pagina dell'estensione sullo store.

## English

**In short.** Auscultrix has no servers and no accounts, and collects no data for the developer. What you write in the journal, the photo and the reading of your mood never leave your computer. To work, the extension contacts a few public services, listed below.

### What stays on your computer

| Data | Where | How long |
|---|---|---|
| The text you write in "How are you, really?" | panel memory only | while the panel is open: **never saved** |
| The mood photo | browser session memory | until the browser closes |
| Energy, valence, target and activity of recent sessions (not the text) | `chrome.storage.local` | until "Forget everything about me" |
| Current playlist, tracks already offered, preferences | `chrome.storage.local` | until "Forget everything about me" |
| Values derived from song lyrics (valence, energy, themes; never the text), only if you turn the feature on | `chrome.storage.local` | until "Forget everything about me" |
| Soundscape preferences (space, surroundings, length, volume) | `chrome.storage.local` | until "Forget everything about me" |

The **soundscape** is computed entirely on your computer and uses no network. Files you export (WAV audio, JSON score, Pure Data patch) are saved by you; they contain numbers only (declared mood and energy, sound parameters), never what you wrote.

"Forget everything about me", under "Your things", erases all of this. Only the public track catalogues and the default safety settings remain. Nothing is synced across devices.

### Which services are contacted

| Service | When | What it receives |
|---|---|---|
| YouTube (www.youtube.com; i.ytimg.com) | when you start a session | the tracks to play; with Vision on, also the video thumbnails, from which the extension takes the colours. If you are signed in to YouTube, the tracks go into your YouTube history, as with any listening. |
| Spotify (open.spotify.com) | at most every 6 hours | nothing of yours: the extension reads the curator's public profile pages, without cookies. |
| Bandcamp (bandcamp.com and subdomains) and YouTube's oEmbed service | once a day and at start-up | nothing of yours: the extension refreshes the Emergente catalogue from public pages and checks video ids. |
| LRCLIB (lrclib.net) | **only if you turn on** "Read song lyrics" | title and artist of the tracks in the playlist. |
| Sites opened from links (Open Library, Goodreads, TMDB, JustWatch, Wikiflix, itch.io, Steam, Apple Podcasts, Cochrane Library, the curator's social pages) | only when you click | your visit, as with any link. |

As always on the web, every service contacted sees your IP address and browser type.

### What Auscultrix does not do

- It sends nobody what you write, the photo or the reading of your mood.
- It uses no online speech voices: read-aloud only works with voices installed on your computer, otherwise it stays off.
- No telemetry, usage statistics, own ads or own cookies.
- It does not analyse faces or voices.

### Minors

If you say you are a child or a teenager, Auscultrix offers music only and never asks for donations. It does not ask for age and does not check who is using it.

### Contact

The developer's contact is on the extension's store page.
