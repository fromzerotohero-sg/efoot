# FROM ZERO TO HERO — NEW UX VISUAL / FIGMA HANDOFF
## Versione: UX V2 Visual Reset — Cursor Implementation Specification
## Data: 13 agosto 2026 (aggiornato 13 agosto 2026, sera)

> **DECISIONE OWNER PIÙ RECENTE (13 ago 2026, sera)**
>
> Il target visivo live **non** è più dark stadium navy.
> Owner ha scelto il sistema **MetalGate light** (carta crema `#F9F6F1`, inchiostro `#1D1D1F`, accent Coach `#00A8C8`).
>
> S2 Coach Home è implementata su `ux-redesign` HEAD `2e5e77a`.
> Prossimo lavoro: **sottopagine Coach (S10 presentation)** poi **Rosa (S7)** poi **Carte (S8)**.
> Non patchare di nuovo la Home Coach se non per regressioni.

> Decisione precedente (non più target visivo): la UX fino a `3aad7d9` e i pass dark HUD **non** sono approvati.

---

# 0. GERARCHIA DELLE FONTI

1. Codice reale del branch `ux-redesign`
2. `SOURCE_OF_TRUTH_MASTER_v1.1.md`
3. Decisione owner più recente contenuta in questo documento
4. Reference visuali:
   - `REFERENCE_A_3_PILLARS_COACH_MOBILE.png`
   - `REFERENCE_B_DESKTOP_WORKSPACES.png`
   - `REFERENCE_C_PRODUCT_STRATEGY.png`
5. Vecchia UX corrente solo come sorgente di funzioni/contratti, **NON come riferimento visuale**

### Regola fondamentale
Le reference definiscono **composizione, atmosfera, gerarchia e qualità**.
Non definiscono dati fake, nomi giocatori, risultati, statistiche o contenuti da inventare.

---

# 1. NORTH STAR

From Zero To Hero deve essere percepito come:

> **“Hero è il mio Coach eFootball. Conosce la mia squadra, capisce il mio contesto e mi porta direttamente alla decisione giusta.”**

NON deve più sembrare:
- una dashboard piena di widget;
- una collezione di 15 tool;
- una chat circondata da CTA duplicate;
- un tema neon applicato sopra la vecchia interfaccia.

Deve sembrare:
- premium;
- sport-tech;
- moderno;
- vivo;
- chiaro;
- decision-first;
- coerente tra desktop e mobile.

---

# 2. ARCHITETTURA UX — TRE PILASTRI

Navigazione primaria invariabile:

1. **COACH**
2. **ROSA**
3. **CARTE**

Tutto il resto è:
- utility;
- dettaglio;
- modalità contestuale;
- progressive disclosure.

## Coach contiene
- Hero conversation
- pre-match / contromisure
- post-match / feedback
- statistiche
- partite
- progressi
- Live Coach
- memoria/knowledge contestuale

## Rosa contiene
- formazione
- titolari
- panchina/riserve
- catalogo
- allenatore
- tattiche
- build/istruzioni avanzate in disclosure

## Carte contiene
- Card Advisor
- fit con rosa
- valutazione
- alternative
- deep analysis
- release/pack dove già supportati

## Utility globali
- HP / Wallet
- Account
- Memoria Hero
- Lingua
- Guida
- Tornei
- Logout

Le utility NON competono con i tre pilastri.

---

# 3. PRINCIPIO VISIVO GENERALE

## Direzione
Usare le reference B/C come base compositiva, ma con:
- più leggibilità;
- contrasto migliore;
- superfici leggermente più chiare;
- colori accent più presenti;
- maggior separazione tra card e background;
- più dinamismo tramite luce, immagine stadio e stati hover/focus;
- zero “neon casino”.

## Percezione desiderata
**MetalGate light + sport intelligence workspace**

La shell e la Home Coach sono carta crema, vetro bianco, accent cyan/blu/oro.
Dark è ammesso solo come oggetto di gioco (es. mini-campo onboarding), non come tema pagina.

Le reference A/B/C restano direzione di **composizione e gerarchia**, non della palette navy.

---

# 4. DESIGN TOKENS — SOURCE OF TRUTH VISUALE (LIVE)

Token live su `ux-redesign` (shell + Coach Home). Non ripristinare la palette navy senza decisione owner.

```css
--bg-root:        #F9F6F1;
--bg-workspace:   #F9F6F1;
--bg-sidebar:     #F9F6F1;
--surface-1:      #FFFFFF;
--surface-2:      #EFECE6;
--text-primary:   #1D1D1F;
--text-secondary: #6B6B6B;
--text-muted:     #9B9B9B;
--border-soft:    rgba(0, 0, 0, 0.08);
--coach-cyan:     #00A8C8;
--rosa-blue:      #2878E0;
--cards-purple:   #9A72E8;
--premium-gold:   #C99630;
--success:        #27A76A;
--radius-md:      14px;
--radius-lg:      18px;
```

## Contrasto
- testo principale quasi bianco, mai grigio spento;
- secondary text chiaramente leggibile;
- card almeno 1 livello più chiare del background;
- bordi visibili, non invisibili;
- accent usati per stato e significato, non come decorazione continua.

---

# 5. BACKGROUND E ATMOSFERA

Esiste già nel repository:

`public/backgrounds/stadium-night.png`

Usarlo come **ambient visual**, NON come wallpaper dominante.

## Desktop Coach
- stadio leggermente visibile nella zona hero superiore/centrale;
- overlay navy 82–90%;
- vignette scura laterale;
- lieve luce cyan dall’area Hero;
- nessuna griglia animata;
- nessuna pioggia di stelle;
- nessun radial viola globale.

## Rosa
- background più neutro;
- il campo è il protagonista;
- nessuna immagine stadio dietro il campo se riduce leggibilità.

## Carte
- background molto scuro;
- accenti gold/purple;
- profondità più “showcase”, ma sempre pulita.

---

# 6. SIDEBAR DESKTOP — SPEC FIGMA

### Larghezza
- 184–208 px a 1440+
- non 250+ px
- deve lasciare spazio al workspace

### Top
Logo compatto:
- simbolo/wordmark esistente
- altezza percepita 34–42 px
- niente logo gigante

### Primary nav
Tre voci soltanto visivamente dominanti:

- Coach
- Rosa
- Carte

Ogni voce:
- altezza 44–48 px
- icona 18–20 px
- label 14 px / semibold
- active state con:
  - background tint 10–14%
  - accent left border 2 px o glow interno leggero
  - NO grande box neon

### Footer sidebar
Avatar + nome utente + chevron.

Click apre menu utility:
- HP / Wallet
- Account
- Memoria Hero
- Lingua
- Guida
- Tornei
- Logout

**Regola:** queste utility non devono formare una seconda sidebar lunga.

---

# 7. COACH HOME — DESKTOP TARGET

Questa è la schermata più importante.

## Silhouette

```text
┌──────── Sidebar ────────┬──────────────────────────────────────────────────────────┐
│                         │  HERO COACH                                               │
│ Coach                   │  Ciao Attilio                                             │
│ Rosa                    │  copy breve                                               │
│ Carte                   │                                                          │
│                         │  ┌───────────────────────────────┐   ┌─────────────────┐  │
│                         │  │  HERO COMPOSER                │   │ NEXT CONTEXT    │  │
│                         │  │ "Chiedi qualsiasi cosa..."    │   │ match/insight   │  │
│                         │  └───────────────────────────────┘   └─────────────────┘  │
│                         │                                                          │
│                         │             SUGGERIMENTI PER TE                           │
│                         │  ┌───────────┐ ┌───────────┐ ┌───────────┐                │
│                         │  │ Analizza  │ │ Ho appena │ │ Prepara   │                │
│                         │  │ la rosa   │ │ giocato   │ │ partita   │                │
│                         │  └───────────┘ └───────────┘ └───────────┘                │
│                         │                                                          │
│                         │  [secondary/context area only if real/useful]             │
└─────────────────────────┴──────────────────────────────────────────────────────────┘
```

## Hero header
- overline: `HERO COACH`
- greeting personalizzato da dato reale se disponibile
- titolo 30–36 px desktop
- copy max 1 riga/2 righe
- non riempire con descrizioni generiche

## Composer — CTA DOMINANTE
Il composer è l’azione principale nello stato OPERATIONAL.

Dimensioni desktop:
- width 68–78% area centrale
- min-height 72–84 px
- border 1px coach-cyan 55–70%
- background surface-1 con lieve gradient verticale
- radius 14–16 px
- send icon cyan
- placeholder:
  `Chiedi qualsiasi cosa sulla tua squadra...`

Sotto:
`Esempi: tattiche, formazione, giocatori, carte, prossima partita...`

### Regola CTA
Quando il composer è la primary action:
- NON aggiungere un bottone “Chiedi a Hero”
- NON rendere tutta la bubble Hero un altro bottone
- NON aggiungere floating “Chiedi al Coach”
- NON aggiungere 4 pill che aprono tutte la chat

**Una sola porta principale alla conversazione.**

---

# 8. SUGGERIMENTI COACH — MAX 3

Sotto il composer:

### Stato OPERATIONAL
Mostrare massimo 3 card contestuali.

Target reference (live, owner 13 ago sera):
1. **Carica le nuove statistiche** → Data Lab / GameAnalysisModal
2. **Ho appena giocato** → feedback Palestra
3. **Prepara la prossima partita** → `/contromisure-pre-partita`

Lingua shell: selettore **IT | EN | ES** in TopBar (e drawer). Home Coach ha copy nativo it/en/es.

Queste NON sono tre CTA per la stessa chat.

Sono tre intenti distinti:
- Rosa → analisi/contesto squadra
- Post-match → feedback/match flow
- Pre-match → contromisure/piano partita

Ogni card deve aprire l'azione/motore corretto usando route/eventi esistenti.

## Card dimensione
Desktop:
- 210–260 px width
- 155–190 px height
- radius 16 px
- iconografia grande 44–56 px in alto
- titolo 15–17 px semibold/bold
- copy 12–13 px
- arrow/action icon in basso a destra

## Colore per intent
- Analizza rosa → cyan/blue
- Post-match → green/cyan
- Pre-match → gold

Background card resta navy scuro.
Accent solo bordo/iconografia/hover.

---

# 9. PROSSIMA AZIONE / PIANO COACH

Il Master richiede un solo concetto `Prossima azione`.

NON creare una seconda CTA che duplica il composer.

## Uso corretto
La Prossima azione cambia in base allo stato.

### NEW / NO ROSTER
Primary:
**Crea la tua rosa**

Hero composer può restare secondario o disponibile,
ma non deve competere.

### ROSTER INCOMPLETE
Primary:
**Completa la rosa**

### NO ACTIVE COACH
Primary:
**Scegli allenatore**

### READY / NO STATS
Primary:
**Parla con Hero**
Secondario contestuale:
`Aggiungi statistiche`

### OPERATIONAL
Primary:
**Composer Hero**
Le 3 card sono suggerimenti.

### POST MATCH
Primary:
**Raccontami com'è andata**
Idealmente apre/prefilla il flow feedback corretto.

### LOW HP
Solo se l'azione scelta costa realmente HP e saldo insufficiente.

---

# 10. RIGHT RAIL DESKTOP — CONTESTO, NON DASHBOARD

Desktop può avere una rail destra compatta 260–300 px.

Contenuti ammessi:
- prossimo match reale / ultimo match reale;
- insight reale;
- stato Knowledge molto compatto;
- contesto squadra reale.

### Priorità
1. prossimo/ultimo match
2. insight utile
3. “Quanto Hero ti conosce” come secondary

### Knowledge
NON deve dominare la Home.
NON usare il 63% come medaglia/status competitivo.

Visual:
- mini gauge 56–72 px oppure progress ring;
- copy: `Hero conosce meglio la tua squadra quando aggiorni rosa, partite e feedback.`
- tap → dettaglio/sheet.

---

# 11. COACH HOME — MOBILE TARGET

Mobile non è desktop impilato.

## Topbar
- logo 28–32 px
- HP pill compatta
- avatar/menu
- altezza 52–58 px

## Content
1. Hero Coach overline
2. greeting
3. composer
4. max 3 suggerimenti
5. eventuale context card compatta
6. bottom nav

### Composer
- 100% width
- min-height 68–76 px
- area tap chiara
- send icon separato

### Suggestions
Su 390 px:
- 3 righe card compatte
- icon 28–32 px
- titolo 13–14 px
- arrow a destra
- NO card giganti verticali

### Bottom nav
Solo:
Coach | Rosa | Carte

Height 60–64 px + safe area.
Active state pulito.
Non boxare l’intera tab.

---

# 12. COACH TOOLS / CONTROMISURE

Le funzioni non spariscono.

### Contromisure
Label UX preferita:
**Prepara la prossima partita**
Sub-label:
`Tattiche, avversario e piano partita`

Engine/route reale:
`/contromisure-pre-partita`
e `/api/generate-countermeasures`

NON metterla come tab primaria.
NON chiamarla genericamente “Prepara partita” in un gruppo di bottoni minuscoli.

Deve essere:
- una suggestion card quando contestuale;
- oppure Coach → strumenti/dettaglio.

### Progressi / Partite / Live Coach
Non devono formare una toolbar di 4 piccoli pulsanti sulla Home.

Scoperta:
- insight / ultimo match → Progressi
- post match → Partite
- Live Coach → modalità speciale in sheet/full-screen
- strumenti avanzati → menu/sheet “Strumenti Coach”

---

# 13. ROSA — DESKTOP TARGET

Reference B è direzione primaria.

## Layout
- sidebar compatta sinistra
- campo/formazione centrale dominante
- right rail per:
  - tattiche summary
  - coach attivo
  - gestione rosa
- panchina/riserve sotto il campo

## Gerarchia
1. Campo + titolari
2. Panchina
3. Allenatore/tattiche
4. strumenti avanzati

## Progressive disclosure
Non eliminare:
- build
- booster
- skill
- istruzioni individuali
- posizioni
- tattiche avanzate

Ma non mostrarle tutte contemporaneamente.

## Azioni
- click giocatore → detail drawer
- add/swap → catalog picker esistente
- tactical details → drawer
- coach → selector/detail

No riscrittura del motore `nuova-rosa-lab`.
Prima estrarre/avvolgere la presentazione.

---

# 14. ROSA — MOBILE TARGET

- topbar
- titolo `La mia rosa`
- segmented: Titolari / Riserve / Panchina
- modulo sopra il campo
- campo occupa la maggior parte viewport
- FAB `+` per add/swap contestuale
- bottom nav

Dettagli avanzati:
- sheet full-height
- mai pannelli desktop compressi.

---

# 15. CARTE / CARD ADVISOR — DESKTOP TARGET

Reference B è direzione primaria.

## Layout
- card selezionata grande a sinistra/centro
- verdict rapido a destra
- score fit reale
- pro/contro
- sinergia con rosa
- alternative consigliate
- azioni rapide

## Colore
- gold per premium/decisione
- purple per cards intelligence
- green solo esito positivo
- red solo criticità

Non degradare il contesto deep analysis.

---

# 16. CARTE — MOBILE

- selected card hero
- verdict score
- CTA principale `Analizza`
- pro/contro collassabili
- alternative carosello orizzontale
- bottom nav

No desktop panels compressi.

---

# 17. MOTION / DINAMISMO

La UX deve essere viva ma non rumorosa.

Consentito:
- hover translateY(-2px)
- border accent transition
- subtle icon scale 1.03
- card reveal 140–200 ms
- progress ring animation breve
- fade/slide 8–12 px
- stadium ambient parallax minimo SOLO desktop se già semplice

Vietato:
- glow pulsante continuo
- animazioni infinite su background
- shimmer continuo
- neon flicker
- movimenti che distraggono dalla decisione

`prefers-reduced-motion` deve disabilitare motion non essenziale.

---

# 18. TYPOGRAPHY

Usare font corrente se già coerente; non introdurre dependency solo per typography.

## Scale
Desktop:
- H1 greeting 30–36 / 800
- H2 section 18–22 / 700
- card title 15–17 / 700
- body 13–15 / 400–500
- meta 11–12 / 500
- overline 10–11 / 700, tracking +0.08em

Mobile:
- H1 24–28
- card title 14–15
- body 12.5–14

Mai compensare una gerarchia debole con più glow.

---

# 19. CARD TAXONOMY — NON UNA CARD UNICA

## Hero Composer
funzione: azione primaria conversazionale
surface: `surface-2`
border: coach cyan
radius: 16
shadow: medium

## Suggestion Card
funzione: intent / next useful action
surface: `surface-1`
border: intent accent 20–35%
radius: 16
hover: border + slight lift

## Context Card
funzione: informazione reale
surface: `surface-1`
border: soft
radius: 14
shadow: low

## Insight Card
funzione: pattern/evidenza
surface: `surface-2`
accent: cyan/green
radius: 14

## Premium/Card Card
funzione: Carte/HP
surface: darker
accent: gold/purple
radius: 16

## Error/Low HP
surface: dark
border: warning/danger
mai modal tecnico generico

---

# 20. CTA POLICY — NON NEGOZIABILE

Ogni viewport deve avere **una CTA dominante per stato**.

### Vietato sulla Home OPERATIONAL
- 4 pill che aprono tutte Hero
- bubble Hero cliccabile
- composer cliccabile
- pulsante `Chiedi a Hero`
- floating `Chiedi al Coach`

tutti contemporaneamente.

### Regola
**Composer = CTA Hero.**
Le suggestion card = intent distinti.

Se una card porta alla conversazione, deve farlo con messaggio/flow specifico,
non essere un duplicato `Apri chat`.

---

# 21. DATI REALI / NO FAKE

Le reference contengono:
- nomi giocatori;
- score;
- match;
- statistiche;
- immagini carte.

NON copiare se non provengono dai dati reali dell'utente.

Regola:
- dato reale → mostra;
- dato assente → empty state;
- dato parziale → partial state;
- errore → error state;
- mai filler fake.

---

# 22. DATA / EVENT CONTRACTS DA PRESERVARE

Preservare:
- `open-assistant-chat`
- `coach-feedback-visibility-change`
- `open-game-analysis-modal`
- `open-card-advisor-entry`
- `open-live-coach`
- `credits-consumed`
- `credits-accredited`
- `knowledge-should-refresh`
- `match-saved`
- `diagnostic-updated`
- `coach-profile-updated`

Preservare deep links/query:
- `openCoach`
- `openAssistantChat`
- `openGameAnalysis`
- `openCardAdvisor`

Prima di rimuovere componenti:
cercare `dispatchEvent`, `addEventListener`, provider, listener query param e consumer.

---

# 23. TASK / NEXT ACTION SIDE EFFECT

`/api/tasks/list` NON è read-only passiva.

Preservare:
- generazione weekly goals;
- update progress;
- listener match/diagnostic necessari.

La nuova UI può nascondere i vecchi widget,
ma NON può perdere i side effect.

Non presentare i 3 fallback statici come “Piano personalizzato”.

---

# 24. HP / ECONOMIA

NON modificare:
- creditService
- prezzi
- wallet
- refund
- MetalGate

Costo corrente:
- AI standard 2 HP
- Card Advisor deep 2 HP
- Live Coach start 2 HP
- extra minute 5 HP

Prima di un'azione paid:
mostrare costo quando noto.

LOW HP:
solo se l'azione scelta costa realmente HP.

---

# 25. IMPLEMENTAZIONE TECNICA — RESET PRESENTATION LAYER

## Decisione
NON continuare ad aggiungere patch CSS dentro il grande `CoachHomeV2.jsx`.

Preferire una nuova presentazione pulita.

### Struttura consigliata
```text
components/coach-v2/
  CoachWorkspace.jsx
  CoachWorkspace.module.css
  CoachComposer.jsx
  CoachSuggestionCard.jsx
  CoachContextRail.jsx
  CoachMobileSuggestions.jsx
```

Non è obbligatorio usare esattamente questi nomi,
ma la responsabilità deve essere separata.

### Regola importante
- CSS Module o CSS scoped prevedibile.
- evitare `<style jsx>` enorme da centinaia di righe;
- evitare JSX pre-costruito fuori dallo scope che perde classi/stile;
- evitare modifiche globali a `body` per aggiustare una singola pagina;
- `globals.css` solo token/shell realmente globali.

### Dati
Riusa:
- state resolver già costruito;
- props reali;
- action callbacks;
- existing route/events.

Non creare un secondo sistema di dati.

---

# 26. S2 RECOVERY — COSA IMPLEMENTARE ORA

S2 deve chiudersi con una Home Coach reale e semplice.

## Implementare
- nuova shell Coach visuale;
- Hero greeting;
- composer dominante;
- stato Home reale;
- max 3 suggestion cards;
- right context rail desktop;
- mobile chat-first;
- Prossima azione senza CTA duplicate;
- Contromisure come pre-match suggestion quando utile;
- Knowledge secondario;
- responsive.

## NON implementare ora
- vera unified conversation backend S3;
- memory consent S5;
- deep Rosa refactor S7;
- Card Advisor redesign S8;
- wallet redesign S9;
- full Coach tools redesign S10.

La reference finale guida la forma,
ma ogni capacità entra nella sua slice.

---

# 27. RESPONSIVE ACCEPTANCE

Obbligatori:
- 360×800
- 375×812
- 390×844
- 430×932
- 768×1024
- 1024×1366
- 1280
- 1366
- 1440
- 1728

### Desktop
- nessun vuoto enorme;
- composer visibile;
- 3 suggestion card above fold;
- right rail leggibile;
- sidebar non domina.

### Mobile
- composer above fold;
- suggerimenti subito dopo;
- no dashboard lunga;
- no overlap con bottom nav;
- safe-area preservata.

---

# 28. ACCESSIBILITY

- focus-visible coerente
- contrasto AA dove possibile
- target tap >=44 px per azioni principali
- aria-label su icon button
- keyboard per drawer/sheet
- ESC close
- focus trap nei dialog
- `prefers-reduced-motion`
- safe-area mobile

---

# 29. NON TOCCARE

- migrations
- schema
- RLS
- trigger
- RPC
- authHelper
- MetalGate SSO/callback/token mapping
- creditService
- wallet/pricing/refund
- RAG corpus
- ragHelper
- AI core prompt
- service role/env secrets
- Edge Functions legacy
- catalog/import pipeline
- API contracts
- production data cleanup
- main branch

---

# 30. PRE-FLIGHT CURSOR

Prima di modificare:

```bash
git status --short --branch
git branch --show-current
git rev-parse HEAD
git fetch origin
git rev-parse origin/ux-redesign
```

Branch autorizzato:
`ux-redesign`

Se sei su `main`: STOP.

Baseline prevista al momento della stesura:
`3aad7d904864f26f3b295d11d9bd0b66dbe06a18`

Se remote è cambiato:
STOP e riporta SHA prima di procedere.

---

# 31. STOP CONDITIONS

STOP se:
- servono modifiche DB/auth/wallet/RAG;
- per seguire la reference devi inventare dati;
- un consumer/event contract non è chiaro;
- current branch non è `ux-redesign`;
- baseline build è rotta;
- serve una dependency nuova;
- la UI richiede consumare HP reali per test non autorizzati;
- la modifica diventerebbe refactor backend.

---

# 32. QUALITY GATE

Obbligatorio:

```bash
npm run build
git diff --check
git status --short
git diff --stat
```

Visual QA:
- screenshot desktop 1440
- screenshot mobile 390×844
- confronto fianco a fianco con REFERENCE A/B/C

Non dichiarare PASS solo perché compila.

---

# 33. ACCEPTANCE VISUALE — PASS / FAIL

## PASS
- a colpo d'occhio sembra la nuova UX delle reference;
- più luminosa e contrastata delle reference senza diventare neon;
- Hero è il centro;
- 3 pilastri chiarissimi;
- una sola CTA dominante;
- max 3 suggerimenti;
- nessun widget old-dashboard concorrente;
- card system differenziato;
- desktop pieno ma ordinato;
- mobile compatto e utile;
- Contromisure/Partite/Progressi restano scopribili;
- nessun dato fake;
- nessuna regressione motore.

## FAIL
- Home vuota con una bolla in mezzo;
- 4+ CTA verso la stessa chat;
- nero piatto senza profondità;
- cyan/neon dominante;
- sidebar piena di utility;
- card tutte identiche;
- right rail HTML/un-styled;
- mobile = desktop impilato;
- floating CTA che copre contenuto;
- patch su patch in globals.css;
- “sembra la vecchia app recolorata”.

---

# 34. COMMIT STRATEGY

Questa è una recovery visiva S2, non S3.

Commit dedicato suggerito:

`fix(ux-v2): rebuild coach workspace presentation`

Push:
`origin/ux-redesign`

NO main.
NO merge.
NO rebase.
NO force push.

---

# 35. OUTPUT CURSOR

Restituire:

```text
# S2 COACH WORKSPACE RECOVERY REPORT

Baseline:
Final SHA:
Commit:
Push:

## Files changed
...

## Presentation architecture
...

## Existing contracts reused
...

## CTA map
...

## Desktop 1440
- screenshot path
- visual notes

## Mobile 390x844
- screenshot path
- visual notes

## Functional states
NEW:
ROSTER_INCOMPLETE:
NO_COACH:
READY_NO_STATS:
OPERATIONAL:
POST_MATCH:
LOW_HP:
ERROR/PARTIAL:

## Preserved
...

## Not implemented because later slice
S3:
S5:
S7:
S8:
S9:
S10:

## Tests
Build:
diff-check:
console:

READY FOR CHATGPT VALIDATION:
YES / NO
```

---

# 36. DECISIONE FINALE DI DESIGN

Il target non è “fare una chat più bella”.

Il target è creare **un nuovo spazio di lavoro Hero Coach**, con:

- Hero come router cognitivo;
- Rosa e Carte come due pilastri reali;
- strumenti avanzati disponibili solo quando utili;
- UI sport-premium, contrastata, dinamica;
- una sola decisione principale per volta.

**Meno rumore. Più decisione. Più identità.**

---

# 36. STATO LIVE — 13 agosto 2026 sera

Branch: `ux-redesign`  
HEAD documentato: `2e5e77a`

| Slice | Stato | Note |
|---|---|---|
| S0 Safety/Staging | fatto | preview guards, badge STAGING |
| S1 Shell | fatto | 3 pilastri, TopBar light, IT/EN/ES, HP chip cream |
| S2 Coach Home | fatto | `components/coach-v2/*`, CTA per stato, prima card = carica stats |
| S3 Conversation | non ora | motori chat invariati |
| S4–S5 Memory | non ora | |
| S6 Onboarding | parziale | journey rosa/allenatore in Home |
| **S10 Coach tools (presentation)** | **in corso** | Partite, Progressi, Contromisure: stesso MetalGate light, motori invariati |
| S7 Rosa | dopo S10 tools | `nuova-rosa-lab` presentation only |
| S8 Carte | dopo S7 | Card Advisor presentation only |
| S9 Utilities | dopo | Account/HP UI, non wallet MetalGate |

## CTA map Home (live)

| Stato | Dominante | Card 1 |
|---|---|---|
| NEW / ROSTER_INCOMPLETE / NO_COACH | Crea rosa / Scegli allenatore | — |
| READY_NO_STATS / OPERATIONAL | Composer Hero | Carica le nuove statistiche |
| POST_MATCH | Raccontami com’è andata | — |

## Sottopagine Coach da allineare (S10)

Route esistenti, solo presentazione:

- `/match`, `/match/new`, `/match/[id]`
- `/grafici-comparazione`
- `/contromisure-pre-partita`
- Live Coach launcher (già globale)
- GameAnalysisModal (Data Lab)

NON toccare API, OCR, billing Live Coach, slot rosa, Card Advisor engine.
