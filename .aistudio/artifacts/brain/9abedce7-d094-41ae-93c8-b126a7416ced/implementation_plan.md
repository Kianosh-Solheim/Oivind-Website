# Musikkside med Songarkiv, Tekstredigering og Musikkspelar

Ei ny dedikert musikkside (`/musikk`) og individuelle songsider (`/musikk/:slug`) for Øivind H. Solheim, utforma i same nordiske, litterære og redaksjonelle stil som resten av nettstaden. Løysinga gjev besøkande eit søkbart og filtrerbart rutenett med songkort, direkte avspeling via ein gjennomgåande musikkspelar nederst på skjermen, eigen visningsside for songtekst og kommentarar, samt eit fullverdig publiserings- og opplastingsverktøy i kontrollpanelet.

## User Review & Critical Decisions

> [!IMPORTANT]
> Desse vala er stadfesta og lagt til grunn for gjennomføringa:

- **Tilgang og publisering**: Musikksida er offentleg tilgjengeleg i hovudmenyen (`MUSIKK` / `MUSIC`) for alle besøkande. Administrator kan lagre songar som **Utkast** (kun synleg for admin) eller **Publisert**.
- **Gjennomgåande musikkspelar**: Besøkande kan starte avspeling direkte frå kvart songkort i rutenettet eller inne på songsida. Ein fast, lydhøyr spelar nederst på skjermen held fram avspelinga når brukaren navigerer mellom rutenettet, songtekstar og andre sider, med støtte for neste/forrige song i køen, tidslinje, volum og valfri nedlasting.
- **Lydopplasting og formatstøtte**: Støttar opplasting av **MP3** (tilrådd standard for brei nettlesarstøtte), **M4A/AAC**, **Opus/Ogg** og **WAV**, i tillegg til eksterne lyd-URL-ar. Opplasting brukar **Firebase Storage** (opptil 50 MB per fil) med automatisk **Firestore chunk-lagring** som sømlaus reserve dersom Storage-reglar på `oivind-web` ikkje er opna enno.
- **Ekstra funksjonar**:
  - Kategorisering/sjangerfilter i tillegg til sanntids fritekstsøk (tittel, songtekst, sjanger).
  - Tospråkleg støtte (`Norsk`, `Engelsk` eller `Begge`) og side-ved-side omsetjingsmodus slik som på Artiklar og Dagbok.
  - Valfritt nedlastingsval per song (`Tillat nedlasting av lydfil`).
  - Kommentarseksjon og tekstmerking nederst på kvar songside, lik den på Refleksjonar.

---

## 1. Overview & Core Concept

- **What It Does**: Samlar Øivind H. Solheim sine songar, melodiar og tilhøyrande songtekstar på éin stad. Kvar song får eit visuelt kort med coverbilete, sjanger og direkte avspelingsknapp, samt ei eiga fordjuplingsside der lyttaren kan lese songteksten vers for vers medan musikken spelar.
- **Target Audience / Persona**: Lesarar og lyttarar som følgjer forfattarskapen på norsk og engelsk, samt administrator som ønskjer same intuitive redigeringsflyt for songtekstar og lydfiler som for blogg og dagbok.
- **Key Value**: Kombinerer litterær presentasjon av songtekstar med direkte lydavspeling utan at lyttaren mistar musikken når dei blar mellom songar.

---

## 2. User Experience & Visual Design

### Key User Flows

1. **Utforske og søkje i rutenettet (`/musikk`)**:
   - Øvst møter brukaren ei redaksjonell overskrift (*«Musikk & Songtekstar»* / *«Music & Lyrics»*), etterfølgd av eit søkjefelt og sjangerfilter.
   - Songane ligg i eit balansert 3-kolonners rutenett på desktop (2 på nettbrett, 1 på mobil). Kvart songkort har kvadratisk (`1:1`) coverbilete (eller eit stilsikkert typografisk vinyl-/notemotiv dersom bilete ikkje er valt), songtittel, sjanger/årstal som rein tekst med `·`-skiljeteikn, og ein direkte Play/Pause-knapp.
2. **Fordjuping i songtekst og lytting (`/musikk/:slug`)**:
   - Toppseksjonen viser coverbiletet side om side med tittel, sjanger, utgjevingsår, kort bakgrunnshistorie om songen, og ein integrert lydspelar med tidslinje, speletid (`tabular-nums`) og eventuell nedlastingsknapp.
   - Under følgjer sjølve songteksten formatert i seriff-typografi med god linjeavstand, etterfølgd av kommentarseksjonen.
3. **Skrive songtekst og laste opp lyd i Kontrollpanelet (`/admin?tab=music` & `/admin?compose_song=true`)**:
   - Eigen fane **Musikk** i kontrollpanelet med oversiktstabell, språk-/statusfilter og hurtigknappar for **Ny song**, **Omsett**, **Endre** og **Slett**.
   - Fullskjerms redigeringsmodus (identisk arbeidsflyt som *Artiklar* og *Dagbok*) med `RichTextEditor` for songtekst, `ImagePickerModal` for coverbilete (Mine bilde, Unsplash, Wikimedia), og eit dedikert **Lydopplastingspanel** med framdriftsindikator, formatrettleiing (MP3, M4A, Opus) og førehandslagring/førebuing av lyd.

### Visual Identity & Theme

- **Aesthetic Direction**: Nordisk litterær monografi og musikkarkiv. Reine flater, tydeleg typografisk hierarki og roleg rytme utan visuell støy.
- **Color Palette & Mood**:
  - **60% Nøytralt lerret**: Varm papirbakgrunn (`bg-brand-surface` / `#FBF9F5`) og kvite kortflater (`#FFFFFF`).
  - **30% Strukturelle flater**: Diskrete rammer (`border-brand-sand` / `#E8E2D5`), dempa tekst (`text-brand-muted`) og mørk typografi (`text-brand-dark` / `#1C1917`).
  - **10% Aksentfarge**: Varm rav/bronse (`brand-accent`) på aktiv avspeling, framdriftslinje i musikkspelaren og primære handlingsknappar.
- **Typography & Hierarchy**:
  - Overskrifter og songtitlar i klassisk seriff (`font-serif`), kombinert med geometrisk sans-serif (`font-sans`) for søk, filter og knappar.
  - Speletid, varigheit og spornummer bruker fast bredde (`font-mono tabular-nums`) slik at tala aldri hoppar under avspeling.
- **Interactive Feedback & Motion**:
  - Myke overgangar ved hover på coverbilete, synleg aktiv-indikator på songkortet som spelar no, og ein kompakt, fast spelar nederst på skjermen som glir opp når ein song blir starta.

---

## 3. Key Product Decisions & Trade-Offs

- **Decision 1: Hybrid lydlagring (Firebase Storage + Firestore Chunk Fallback + Ekstern URL)**
  - *Chosen Approach*: Ved opplasting av lydfil (`.mp3`, `.m4a`, `.opus`, `.ogg`, `.wav`) prøver systemet først direkte opplasting til Firebase Storage (`songs/{timestamp}_{filename}`). Dersom Firebase Storage på `oivind-web` avviser opplastinga pga. manglande Storage-reglar, deler opplastaren automatisk lydfila opp i komprimerte datablokker i Firestore (`song_audio_chunks`) og set saman ei spelbar lydkjelde (`Blob URL`) ved avspeling. I tillegg kan ein lime inn direkte lyd-URL.
  - *Why*: Sikrar at opplasting av MP3/M4A/Opus fungerer 100 % pålitelig med det same utan at du treng å konfigurere ekstra sky-innstillingar manuelt.
- **Decision 2: Gjennomgåande lydkontekst (`MusicPlayerContext`)**
  - *Chosen Approach*: Eit globalt React-context held styr på aktiv song, speleliste/kø, tidsposisjon og Play/Pause-status på tvers av både songrutenettet, songsida og den faste spelaren nederst.
  - *Why*: Hindrar at to lydspelarar spelar samtidig, og lar lyttaren opne og lese ulike songtekstar utan at musikken stoppar.
- **Decision 3: Sikkerheitskopi-integrasjon**
  - *Chosen Approach*: Utvidar eksisterande `BackupManager` til også å inkludere `songs`-samlinga ved eksport og gjenoppretting.
  - *Why*: Sikrar at alle songtekstar og metadata blir tekne vare på saman med bøker, artiklar og dagbok.

---

## 4. Technical Architecture & Data Strategy *(Technical Reference)*

### Architecture & Component Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                             App & Routing                               │
│  Header (Nav: MUSIKK)  ───►  /musikk (Musikk.tsx)                       │
│                        ───►  /musikk/:slug (SongView.tsx)               │
│                        ───►  /admin?tab=music & ?compose_song=true      │
└──────────────────┬───────────────────────────────────┬──────────────────┘
                   │                                   │
                   ▼                                   ▼
┌──────────────────────────────────────┐ ┌────────────────────────────────┐
│         MusicPlayerContext           │ │     Admin Song Composer        │
│ - currentSong, queue, isPlaying      │ │ - Title, Slug, Genre, Year     │
│ - playSong(), togglePlay(), seek()   │ │ - Cover ImagePickerModal       │
│ - nextSong(), prevSong(), volume     │ │ - AudioUploader (MP3/M4A/Opus) │
│ - Persistent GlobalMusicPlayer bar   │ │ - RichTextEditor (Lyrics)      │
└──────────────────┬───────────────────┘ └──────────────┬─────────────────┘
                   │                                    │
                   ▼                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                    Firebase Persistence Layer                           │
│  Firestore: `songs` collection (metadata, lyrics, coverUrl, audioUrl)   │
│  Audio Storage: Firebase Storage (`songs/*`) + `song_audio_chunks`      │
│  Comments: `comments` collection (linked by songId)                     │
└─────────────────────────────────────────────────────────────────────────┘
```

### Data Model & State (`Song` entity)

- `id`: Dokument-ID i Firestore (`songs`-samlinga, med automatisk reserve til `stats` dersom nødvendig, pluss oppdaterte `firestore.rules`).
- `title`: Songtittel.
- `slug`: Lesbar nettadresse (`/musikk/tittel-pa-song`).
- `lyrics`: Songtekst (rik HTML eller vers/strofer frå `RichTextEditor`).
- `description`: Valfri kort omtale eller bakgrunnshistorie om songen.
- `genre`: Sjanger/kategori (t.d. *Viser*, *Ballade*, *Pop/Rock*, *Instrumentalt*).
- `releaseYear`: Utgjevingsår.
- `coverImageUrl` & `coverImageCaption`: Coverbilete valt frå bildearkivet/Unsplash/Wikimedia.
- `audioUrl`: URL til lydfila (Firebase Storage URL, ekstern URL, eller `chunked:{songId}` for Firestore-lagra lyd).
- `audioFormat`: Lydformat (`mp3`, `m4a`, `opus`, `wav`).
- `durationSeconds`: Speletid i sekund (blir automatisk lese ut frå lydfila ved opplasting).
- `allowDownload`: Boolean for om besøkande kan laste ned lydfila.
- `published`: Boolean (`true` = offentleg, `false` = utkast).
- `language`: `'no' | 'en' | 'both'`.
- `translationId`: Lenkje mellom norsk og engelsk versjon av songen.

### Interactive Component & State Mapping

- **Søkje- og filterlinje på `/musikk`**: Filtrerer songrutenettet momentant på tittel, utdrag frå songtekst og sjanger, samt valt språk (`NO` / `EN`).
- **Songkort (`SongCard`)**: Klikk på Play-knappen på kortet startar/pausar songen i `MusicPlayerContext`. Klikk på sjølve kortet eller tittelen opnar `/musikk/:slug`.
- **Innebygd spelar på `/musikk/:slug` + Global spelar**: Begge er synkroniserte mot same `HTMLAudioElement` i `MusicPlayerContext`, slik at tidslinje, spoleknappar, volum og Play/Pause alltid viser nøyaktig same posisjon.
- **Lydopplasting i Admin**: Validerer filtype (`.mp3`, `.m4a`, `.aac`, `.opus`, `.ogg`, `.wav`), les automatisk av varigheit (`durationSeconds`) via nettlesaren sitt Audio-API, og viser tydelige tips om tilrådd format (MP3 som tryggaste standard, M4A/AAC og Opus for høg kvalitet ved mindre filstørrelse).
