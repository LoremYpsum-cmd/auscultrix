# Scheda del Chrome Web Store — Auscultrix 6.0.2

Guida campo per campo per la [console sviluppatore](https://chrome.google.com/webstore/devconsole/052b1bec-1efe-4e47-a207-cbc046b99b9d/clehadjpcgbppijkflfedibhkpfgepad/edit). Chrome impedisce a qualunque estensione di leggere o compilare quella pagina, quindi i campi vanno incollati a mano. Tutti i testi e le immagini sono in questa cartella.

## Come funziona la ricerca nello store (perché questi testi)

1. **Nome** e **riassunto** pesano più di tutto: vengono dal pacchetto (`manifest.json` → `_locales/*/messages.json`), non dalla console. Per questo serve caricare il pacchetto **6.0.2**.
2. Poi conta la **descrizione dettagliata**, una per lingua: con la scheda localizzata in italiano e in inglese si compare nelle ricerche di entrambe.
3. Le regole di Google vietano il riempimento di parole chiave (*keyword spam*): niente elenchi di parole, niente nomi di altri prodotti. I testi qui sotto usano parole chiave in frasi vere (diario dell'umore, paesaggio sonoro, musica, suoni rilassanti, privacy, senza account).
4. Le immagini non vengono «lette» dalla ricerca, ma fanno aumentare installazioni e valutazioni, che invece contano. La piccola immagine promozionale (440×280) è necessaria per essere messi in evidenza.

## 1. Pacchetto

**Pacchetto → Carica nuovo pacchetto:** `packaging/auscultrix-6.0.2-chrome.zip`

Ne vengono automaticamente:

| Lingua | Nome nello store (≤ 75) | Riassunto (≤ 132) |
|---|---|---|
| Italiano | Auscultrix: diario dell'umore, musica e paesaggio sonoro | Scrivi come stai: musica, un paesaggio sonoro generato sul momento e media che confortano. Senza account, tutto resta sul computer. |
| English | Auscultrix: mood diary, music and generative soundscape | Say how you feel: music, a soundscape generated on the spot and comforting media. No account, and everything stays on your computer. |

## 2. Scheda dello store → Descrizione (italiano)

Copia tutto il blocco:

```
Auscultrix è un diario che ascolta. Scrivi due parole su come stai, scegli un'etichetta o sposta il cursore dell'energia: Auscultrix ti propone musica, un paesaggio sonoro generato sul momento e libri, film, serie, podcast e giochi calmi. Il percorso parte da come ti senti e, poco alla volta, si sposta verso uno stato più sereno (il principio ISO).

PAESAGGIO SONORO GENERATIVO
Una composizione creata sul tuo computer, senza rete e senza brani di altri: un bordone morbido, vento, mare o pioggia, e campane collocate nello spazio. Scegli lo spazio (stanza, navata, campo aperto), l'ambiente e la durata. Entra e si congeda sempre sfumando. Chi compone può esportarla in WAV, come partitura o come patch Pure Data.

MUSICA CHE TI ACCOMPAGNA
Una playlist su YouTube fatta di brani con coordinate emotive documentate: i primi sono vicini al tuo stato, poi il percorso cambia piano. Se nella scheda guardi un altro video, Auscultrix si fa da parte; quando vuoi, «Riprendi la sessione» la fa ripartire.

MEDIA CHE CONFORTANO
Libri, film, serie, documentari, podcast e videogiochi calmi, scelti per il tono. Ogni titolo è stato rivisto uno per uno: niente suicidio o autolesionismo, violenza, abusi o dipendenze.

LA TUA PRIVACY
• Quello che scrivi non viene salvato né inviato: la lettura avviene sul tuo computer.
• Nessun account, nessun server, nessuna statistica d'uso.
• «Le tue cose» mostra che cosa viene ricordato (solo numeri) e cancella tutto con un tocco.

SICUREZZA
Se scrivi parole di crisi, prima di qualsiasi musica trovi i numeri a cui chiedere aiuto, e nulla parte da solo. La Visione (paesaggi lenti sul video) è facoltativa e resta sotto le soglie WCAG di lampeggiamento.

ACCESSIBILITÀ
Carattere ad alta leggibilità, modalità scura, contrasto elevato, uso da tastiera, niente animazioni con «riduci movimento». Italiano e inglese.

Auscultrix è un'opera di arti digitali nata all'Accademia di Belle Arti di Catania. Non è un dispositivo medico e non sostituisce l'aiuto di un professionista. Se stai male, parlane con qualcuno di fiducia.

Gratis e open source (MIT): https://github.com/LoremYpsum-cmd/auscultrix
Documentazione e misure: https://loremypsum-cmd.github.io/auscultrix/
```

## 3. Scheda dello store → Descrizione (English)

Aggiungi la lingua inglese (**Aggiungi lingua → English**), poi incolla:

```
Auscultrix is a diary that listens. Write a few words about how you feel, pick a label or move the energy slider: Auscultrix offers music, a soundscape generated on the spot, and calm books, films, series, podcasts and games. The path starts from how you feel and, little by little, moves toward a calmer state (the ISO principle).

GENERATIVE SOUNDSCAPE
A composition created on your computer, with no network and no one else's tracks: a soft drone, wind, sea or rain, and bells placed in space. Choose the space (room, nave, open field), the surroundings and the length. It always fades in and fades out. Composers can export it as WAV, as a score or as a Pure Data patch.

MUSIC THAT KEEPS YOU COMPANY
A YouTube playlist made of tracks with documented emotional coordinates: the first ones are close to how you feel, then the path changes slowly. If you watch another video in the tab, Auscultrix steps aside; whenever you like, "Resume the session" starts it again.

COMFORTING MEDIA
Books, films, series, documentaries, podcasts and calm video games, chosen for their tone. Every title has been reviewed one by one: no suicide or self-harm, violence, abuse or addiction.

YOUR PRIVACY
• What you write is never saved or sent: the reading happens on your computer.
• No account, no server, no usage statistics.
• "Your things" shows what is remembered (numbers only) and erases everything with one tap.

SAFETY
If you write words of crisis, you see where to get help before any music, and nothing starts by itself. Vision (slow landscapes over the video) is optional and stays below the WCAG flash thresholds.

ACCESSIBILITY
Highly legible typeface, dark mode, high contrast, keyboard use, no animation with "reduce motion". Italian and English.

Auscultrix is a digital-arts work from the Accademia di Belle Arti di Catania. It is not a medical device and does not replace help from a professional. If you are struggling, talk to someone you trust.

Free and open source (MIT): https://github.com/LoremYpsum-cmd/auscultrix
Documentation and measurements: https://loremypsum-cmd.github.io/auscultrix/
```

## 4. Scheda dello store → altri campi

| Campo | Valore |
|---|---|
| Categoria | **Stile di vita → Benessere** (*Lifestyle → Well-being*); se non è disponibile, *Stile di vita* |
| Lingua principale | Italiano (con la scheda inglese aggiunta al punto 3) |
| Icona dello store | `store-icon-128x128.png` (disegno di 96×96 con margine trasparente di 16 px, come chiede Google) |
| Screenshot italiani (1280×800, in quest'ordine) | `it/screenshot-1-mood-…`, `it/screenshot-2-soundscape-…`, `it/screenshot-3-playlist-…`, `it/screenshot-4-media-…`, `it/screenshot-5-diary-…` |
| Screenshot inglesi | gli stessi file in `en/`, caricati nella scheda inglese |
| Immagine promozionale piccola (440×280) | `it/small-promo-tile-440x280.png` (inglese: `en/…`) |
| Immagine promozionale grande (1400×560) | `it/marquee-1400x560.png` (inglese: `en/…`) |
| Video promozionale YouTube | lascia vuoto, a meno di avere un video vero dell'estensione |
| URL della home page | `https://loremypsum-cmd.github.io/auscultrix/` |
| URL di assistenza | `https://github.com/LoremYpsum-cmd/auscultrix/issues` |
| Contenuti per adulti | No |

Gli screenshot mostrano l'interfaccia vera, con sessioni dimostrative (non dati di una persona).

## 5. Privacy

| Campo | Valore |
|---|---|
| Scopo unico | Proporre musica, un paesaggio sonoro generato sul dispositivo e media che confortano a partire da come la persona dice di sentirsi. Non è un dispositivo medico. |
| Giustificazione dei permessi | la tabella del punto 3 di `docs/pubblicare-chrome.md` |
| Codice remoto | No |
| Utilizzo dei dati | nessuna casella: lo sviluppatore non raccoglie dati |
| Le tre dichiarazioni (non vendere, non usare per altri scopi, non usare per il credito) | spuntale tutte |
| URL dell'informativa sulla privacy | `https://loremypsum-cmd.github.io/auscultrix/privacy-policy.html` |

## 6. Prima di inviare

1. **Salva la bozza** e guarda l'anteprima della scheda in entrambe le lingue.
2. Solo dopo, **Invia per la revisione**: è un'azione pubblica, la revisione dura di solito da 1 a 3 giorni lavorativi.
3. Per farti trovare anche fuori dallo store: aggiungi il sito a Google Search Console e invia `https://loremypsum-cmd.github.io/auscultrix/sitemap.xml`.

## Rigenerare le immagini

```sh
node tools/preview/server.mjs
python3 tools/store-assets/make_chrome_assets.py
```
