# Incroci micro-variabili, tutela enterprise e posizionamento Booster

**Data**: 10 Febbraio 2026  
**Obiettivo**: Esempi concreti di incroci, meccanismi di tutela, e suggerimenti reali per contrastare squadra bloccata (frustrazioni community). L’app come **booster** per clienti esigenti e community preparata.

---

## 1. Esempi di incroci micro-variabili

### 1.1 Variabili disponibili (per giocatore)

| Variabile | Tipo | Dove | Uso incrocio |
|-----------|------|------|--------------|
| **position** | string | slot_positions, formation | Chi accanto a chi, ruolo nel modulo |
| **playing_style** | id→nome | playing_styles | Taglio (Ala prolifica + Regista), Compattezza (Collante) |
| **overall_rating** | int | players | Indicatore livello, non causa performance |
| **form** | string | A/B/C/D/E | Titolare vs riserva (freccia↑↓) |
| **base_stats** | jsonb | attacking/defending | fin, pas, tac, vel, acc, res, ecc. |
| **skills** + **com_skills** | array | players | Incrocio §7.9, movimenti §7.5 |
| **height** | int | players | Corner, palle alte, Fulcro di gioco |
| **weight** | int | players | Contatto fisico, fisicità (meta eFootball 2025) |
| **original_positions** | jsonb | players | Fit posizione, competenza |
| **card_type** | text | Trending/Epico/ecc. | Abilità aggiungibili sì/no |

### 1.2 Incroci a 2 variabili (esempi concreti)

| Situazione | Variabile A | Variabile B | Output consiglio |
|------------|--------------|--------------|-------------------|
| **Attacco bloccato** | stile punta (Opportunista vs Fulcro) | stile squadra (Contropiede vs Possesso) | Opportunista + Contropiede = fit; Fulcro + Passaggio lungo = fit |
| **Cross inefficaci** | abilità Cross preciso (sì/no) | posizione (EDA/ESA/TD/TS) | Chi mettere in fascia; chi manca abilità |
| **Transizione lenta** | vel + acc (soglia 85+) | stile (Giocatore chiave, Punta avanzata) | Chi far partire contropiede |
| **Centrocampo travolgibile** | stile (Collante vs Incontrista) | stat res (soglia 80) | Chi tiene, chi sostituire al 60' |
| **Corner persi** | height (185+ cm) | abilità (Colpo di testa, Superiorità aerea) | Chi sui pali; chi tira (Cross preciso) |
| **Difesa esposta** | stile terzino (Offensivo vs Difensivo) | istruzione Linea alta | Terzino offensivo + linea alta = rischio |
| **Recupero svantaggio** | abilità Riserva di lusso | posizione (P, SP, CC) | Chi far entrare al 60' |
| **Connection non attiva** | connection.focal_point | rosa (stile + posizione) | Chi manca; alternative da riserve |

### 1.3 Incroci a 3+ variabili (enterprise)

| Situazione | Variabili | Logica | Output |
|------------|-----------|--------|--------|
| **Taglio efficace** | Ala prolifica (A) + Regista creativo (B) + Passaggio filtrante (A o B) + vel 85+ (A) | Coppia crea+riceve + abilità passaggio + velocità | Nomi concreti da rosa; posizioni slot |
| **Sovrapposizione fascia** | Terzino offensivo (A) + Onnipresente/Specialista cross (B) + Scatto + Cross preciso | Chi fa corsa, chi passa, abilità | Suggerimento coppia TD–EDA |
| **Compattezza finale partita** | Incontrista/Collante + res 85+ + Rientro difensivo | Chi tiene in campo ultimi 15' | Non sostituire X, Y |
| **Contro difesa bassa** | Regista creativo + Passaggio filtrante + Trequartista + Possesso | Chi crea, chi taglia, stile squadra | Modulo + nomi |
| **Contro meta 4-3-3** | centrocampo numeroso (4-2-3-1 o 4-1-4-1) + ali veloci + difensori recupero | Contromisure RAG §14 | Formazione + istruzioni |

---

## 2. Come tutelarci (enterprise)

### 2.1 Regole anti-inferenza (obbligatorie)

- **Dati = indicatori**, non cause. Mai “X perché Y”.
- **Solo dati nel diagnostic**: se manca, non inventare.
- **Statistiche/abilità FISSE**: mai “migliorare”, “far crescere”, “allenare”.
- **Aggiornare solo RAG e prompt**: le regole restano valide anche con nuovi incroci.

### 2.2 Scoping esplicito per incrocio

Per ogni tipo di incrocio, definire:

1. **Input richiesti**: quali variabili servono (es. height per corner)
2. **Se manca un dato**: cosa fare (es. “Se height non presente, non menzionare altezza sui pali”)
3. **Output consentito**: descrizione + suggerimento, mai inferenza causale

### 2.3 Blocco ISTRUZIONI PER L’IA (nel diagnostic)

```
---
ISTRUZIONI (obbligatorie):
- Usa SOLO i dati sotto. Manca dato → non menzionare.
- §10.15: dati = INDICATORI. Vietato "X perché Y".
- Statistiche/abilità FISSE. Solo suggerire: chi, dove, che istruzioni.
- Rosa: solo nomi qui elencati.
- Team style: solo 5 configurabili (Possesso, Contropiede, Contrattacco, Passaggio lungo, Vie laterali).
---
```

### 2.4 Fallback per domande fuori scope

- **Scripting / esiti predeterminati**: “Non posso commentare meccaniche di engine. Posso aiutare su formazione, rosa, stile, sostituzioni.”
- **Dati mancanti**: “Per consigli su [X] serve [dato]. Caricalo da [dove].”
- **Inviti a “cercare” giocatori**: “Usa solo la rosa caricata. Indico chi, tra quelli che hai, risponde meglio.”

---

## 3. Squadra bloccata: frustrazioni community e booster

### 3.1 Frustrazioni reali (da community)

| Frustrazione | Cosa sentono | Cosa NON dire | Cosa dire (booster) |
|--------------|--------------|---------------|---------------------|
| **“Non riesco a segnare”** | Attacco bloccato, difesa avversaria impenetrabile | “È scripting” / “È normale” | Contromisure concrete: difesa bassa → possesso, trequartista creativo, ampiezza; verificare chi ha Passaggio filtrante + stili che tagliano |
| **“Perdo sempre contro 4-3-3”** | Sentono meta schiacciante | “Tutti usano quella formazione” | Contromisure §14: 4-2-3-1 o 4-1-4-1, sfruttare spazi centrali, profondità; verificare centrocampo e ali |
| **“I miei non corrono / restano fermi”** | IA compagna lenta o poco reattiva | “È un bug” | Stili + istruzioni: Giocatore chiave, Punta avanzata per corse; Offensivo su attaccanti; Contropiede su CC; verificare stile squadra (Possesso = meno corse) |
| **“Subisco sempre negli ultimi minuti”** | Gestione vantaggio | “È scripting” | Gestione vantaggio §7.6: compattezza, Collante, res alta, Rientro difensivo; sostituzioni 60–70'; non tenere chi ha res bassa |
| **“Non trovo spazio in attacco”** | Difesa avversaria compatta | “Cambia gioco” (vago) | Ampiezza §7.5, Vie laterali, sovrapposizione; terzino offensivo + esterno; passaggi lunghi per saltare centrocampo (§14 contro pressing) |
| **“Perdo palla subito dopo recupero”** | Transizione positiva mal gestita | — | vel 90+, Scatto, Passaggio filtrante; Opportunista/Giocatore chiave; passaggio verticale rapido entro 5 secondi |
| **“I cross non arrivano mai”** | Cross inefficienti | — | Cross preciso, Specialista cross; altezza attaccanti; Calci piazzati Primo/Secondo/Terzo attaccante; verificare chi ha Colpo di testa |
| **“Il contropiede non parte”** | Stile non adatto a ripartenze | — | Stile squadra Contropiede/Contrattacco; Competenza coach ≥70; Giocatore chiave, Punta avanzata, vel alta |

### 3.2 Checklist “Squadra bloccata” (per l’IA)

Quando l’utente dice che non segna / non vince / si sente bloccato:

1. **Stile squadra** vs rosa: Possesso con punte Opportuniste = fit; Contropiede con Punta arretrata = mismatch?
2. **Formazione** vs avversario tipico: dalla cronologia partite, formazione più usata contro di te?
3. **Connection** attivabile? Focal + Key Man in campo?
4. **Sostituzioni**: Riserva di lusso in panchina? Chi far entrare al 60'?
5. **Istruzioni**: Offensivo sugli attaccanti? Contropiede su chi può? Linea alta/bassa coerente?
6. **Abilità**: Statistiche di gioco §7.9 — usi passaggio filtrante ma pochi ce l’hanno? Usi tiro normale ma hai A giro da distante?
7. **Difesa bloccata**: Regista creativo + Passaggio filtrante per smarcare; ampiezza per aprire.

### 3.3 Risposte booster (tone)

- **Empatia**: “Capisco la frustrazione.”
- **Niente scripting**: non commentare engine/predeterminazione.
- **Azioni concrete**: 1–3 leve precise (formazione, sostituzione, istruzione, stile).
- **Dati**: citare rosa, formazione, win rate quando utile.
- **Prossimo passo**: “Prova X nella prossima partita e vediamo.”

---

## 4. Implementazione incroci (dove aggiungere dati)

| Incrocio | Dato da aggiungere al diagnostic | Rischio | Priorità |
|----------|----------------------------------|---------|----------|
| Corner / palle alte | height per giocatore (se valorizzato) | Basso | Media |
| Compagno × compagno | slot_positions → “vicini” (opzionale) | Medio | Bassa |
| Statistiche §7.9 | già presente (Statistiche di gioco) | Nessuno | — |
| Connection ↔ rosa | già presente | Nessuno | — |
| Recupero svantaggio | Riserva di lusso in rosa | Basso | Alta (checklist) |

---

## 5. RAG: sezione “Squadra bloccata” ( proposta)

Aggiungere in `info_rag.md` una sezione tipo:

```markdown
### 7.10 Squadra bloccata – Checklist e contromisure (frustrazioni community)

Quando l’utente segnala attacco bloccato, sconfitte ripetute o “non riesco a vincere”:
1. **Stile squadra ↔ rosa**: verifica fit (es. Opportunista + Contropiede; Fulcro + Passaggio lungo).
2. **Formazione**: dalla cronologia, quale formazione avversaria più comune? Applica contromisure §14.
3. **Connection**: Focal Point e Key Man in campo?
4. **Sostituzioni**: Riserva di lusso? Chi far entrare al 60' per recupero svantaggio?
5. **Abilità vs uso comandi**: incrocio §7.9; suggerire schierare chi ha abilità adatte o diversificare comandi.
6. **Difesa bassa avversaria**: possesso paziente, Regista creativo, ampiezza; 4-3-3 o 4-2-3-1.
7. **Gestione vantaggio**: compattezza, Collante, res alta; non tenere chi ha res bassa negli ultimi 15'.

**Tone**: Empatia + azioni concrete. NON commentare scripting o meccaniche di engine.
```

---

## 6. Sintesi

| Elemento | Azione |
|----------|--------|
| **Incroci micro** | Usare variabili: posizione, stile, stats, skills, height, form, connection |
| **Tutela** | §10.15, blocco istruzioni, fallback scope, “manca dato → non menzionare” |
| **Booster** | Checklist squadra bloccata; contromisure tattiche reali; tono empatico + concreto |
| **RAG** | Aggiungere §7.10 Squadra bloccata; estendere §14 se serve |
| **Diagnostic** | Valutare height; blocco ISTRUZIONI; nessuna modifica invasiva |
