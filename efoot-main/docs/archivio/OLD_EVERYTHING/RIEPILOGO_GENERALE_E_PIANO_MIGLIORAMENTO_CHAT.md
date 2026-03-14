# Riepilogo generale e piano per migliorare coerenza e ridurre errori nella chat IA

**Data**: 10 Febbraio 2026  
**Obiettivo**: Strutturare il riassunto generale (diagnostic) e le conoscenze RAG affinché la chat IA ragioni in modo coerente e commetta meno errori.

---

## 1. Riepilogo ragionamenti completi

### 1.1 Architettura dati

| Dato | Dove | Chi scrive | Chi legge | Scopo |
|------|------|------------|-----------|-------|
| **ai_summary** (partita singola) | `matches.ai_summary` | `match/[id]` dopo analyze-match | Solo pagina partita | Riassunto AI di una partita specifica |
| **Riassunto generale (diagnostic)** | `user_diagnostic_cache.content` | `refresh-diagnostic` via `diagnosticBuilder` | Chat (`assistant-chat`) | Contesto generale per consigli tattici |
| **RAG (regole eFootball)** | `info_rag.md` | Statico | `analyze-match`, `countermeasuresHelper`, `assistant-chat` | Meccaniche, stili, abilità, regole IA |

La chat **non** legge `ai_summary`. Il diagnostic è il **solo** contesto strutturato che la chat usa. Va ottimizzato per guidare il ragionamento dell’IA.

### 1.2 Flusso allenatore

1. **analyze-match**: usa competenze coach (≥70 suggerisci, <50 no), Connection solo per nome, **nessun** incrocio connection ↔ rosa.
2. **countermeasuresHelper**: fa **incrocio** Connection (focal_point + key_man) con rosa → “Giocatori compatibili”.
3. **diagnosticBuilder**: usa `matchConnectionToRoster()` per connection ↔ roster.
4. **assistant-chat**: usa `user_diagnostic_cache.content` che include connection + match roster.

**Gap**: analyze-match non allinea il proprio flusso con countermeasures/diagnostic sul match connection ↔ rosa.

### 1.3 Regole anti-inferenza (RAG §10.15)

I dati sono **INDICATORI**, non cause. Vietato “X perché Y”.

| Tipo dato | ❌ SBAGLIATO | ✅ CORRETTO |
|-----------|--------------|-------------|
| Competenze coach | "Usa X perché coach ha 89" | "Allenatore ha X: 89. Suggerisci X." |
| Win rate | "Vincerai perché 60%" | "Win rate storico 60%. Suggerisci formazione." |
| Rating storico | "Giocherà male perché sempre 5.8" | "Rating storico 5.8. Considera alternativa." |
| Formazione avversaria | "Giocherà bene perché sfrutta 4-3-3" | "Avversario: 4-3-3. Suggerisci contromisure." |
| Attack areas / recovery | "Messi ha attaccato da sinistra" | "Squadra ha attaccato 46% da sinistra." |
| Palle inattive | "Gestione palle inattive da migliorare" | Non menzionare senza dati espliciti |

---

## 2. Verifiche internet e gap RAG

### 2.1 Link-Up Play (eFootball 2026)

- **Centrepiece** = hub, stabilisce condizioni e sblocca bonus passaggio (Regista creativo, Specialista cross, Orchestrator).
- **Key Man** = corre in profondità, attiva finestre offensive, riceve con primo tocco migliorato.
- Distanza ideale: 10–15 m durante costruzione.
- Formazioni adatte: 4-3-3, 4-2-3-1, 3-5-2.
- Connection nel DB mappa su Focal Point (≈ Centrepiece) + Key Man.

**Azione**: Integrare Link-Up Play in `info_rag.md` come estensione di Connection.

### 2.2 Best practice per ridurre allucinazioni (ricerca web)

- **Grounding esplicito**: usare prompt tipo “Rispondi secondo il contesto seguente”.
- **Struttura gerarchica**: sezioni chiare e ancorate a fonti.
- **Istruzioni semplici**: linguaggio diretto, formato output definito.
- **Evitare inferenze causali**: descrivere + suggerire, non “X perché Y”.

### 2.3 Gap già individuati da integrare nel RAG

1. **Leader + Capitano**: in rimonte nel secondo tempo, considerare Capitano con Leader.
2. **Rischio infortunio**: se indicato problema a gamba → sostituire subito.
3. **Giocatore chiave**: migliore con compagno che mantiene palla lontano dalla propria porta.
4. **Competenze posizione**: sovrascrittura (nuova competenza sostituisce precedente).
5. **Restrizione portieri**: portieri non possono apprendere posizioni da campo (e viceversa).
6. **Squadra Autentica vs Squadra dei Sogni**: breve nota di contesto.

### 2.4 Memoria Attila vs RAG

- **Memoria Attila** (`memoria_attila_definitiva_unificata.txt`): documento di riferimento utente, non usato come RAG.
- **CC/MED per Sviluppo**: in memoria Attila indicato CC/MED; in RAG e fonti ufficiali → **solo DC**.

---

## 3. Struttura proposta per il riassunto generale (diagnostic)

Obiettivo: rendere il diagnostic **più leggibile dall’IA** e allineato alle regole, con blocchi espliciti che riducono inferenze errate.

### 3.1 Blocco iniziale: ISTRUZIONI PER L’IA

Da inserire **all’inizio** del diagnostic, prima di Profilo e Rosa:

```
---
ISTRUZIONI PER L'IA (obbligatorie):
- Usa SOLO i dati sotto. Se manca un dato, non inventare.
- RAG §10.15: NON INFERIRE CAUSE. Dati = INDICATORI. Usa: descrivi + suggerisci. Vietato "X perché Y".
- Regola oro: statistiche/abilità giocatori = FISSE. MAI "migliorare", "far crescere", "allenare".
- Rosa: usa per incroci con stile squadra, connection, sostituzioni. Solo nomi qui elencati.
- Stile squadra configurabile: solo 5 (Possesso, Contropiede, Contrattacco, Passaggio lungo, Vie laterali).
- NON parlare di partita singola: questo riassunto è generale. Per analisi partita vedi pagina partita.
---
```

### 3.2 Sezioni con etichette “uso”

Ogni sezione può avere una riga esplicita su come usarla:

| Sezione | Etichetta uso |
|---------|---------------|
| Profilo | Identificazione utente. Problemi = prioritizzare consigli. |
| Informazioni per l’IA | Punto debole, obiettivi, note → orientare risposta. |
| Statistiche di gioco | Percentuali reali (tipo gol, tiro, passaggio). Incrociare con abilità in rosa. |
| Rosa | Incroci con stile squadra, connection, sostituzioni. Stili = §2 RAG. |
| Tattica | Stile squadra + istruzioni individuali. |
| Andamento | Win rate, formazioni usate = INDICATORI, non cause. |
| Difficoltà | Sintomo → leva. Dichiarate + ricorrenti. |
| Allenatore | Competenze (≥70 suggerisci), Connection + compatibili in rosa. |
| Build | Sintesi stili per zona. Fit con modulo. |
| Abilità in rosa | Incroci con Statistiche di gioco, sostituzioni. |
| Sinergie e note | Disallineamenti, Connection non attivabile. |
| Leve possibili | Sintomo → azione suggerita. Priorità consiglio. |

### 3.3 Leve: sintesi operativa

Le leve sono già presenti. Si può migliorare con:

- Mappatura esplicita **sintomo → leva** (es. “Difesa → compattezza, linea bassa, marcatura”).
- Riferimento a **RAG §14** per contromisure formazione vs formazione.

---

## 4. Piano di implementazione

### Fase 1: RAG (`info_rag.md`)

1. Aggiungere sezione **Link-Up Play** (Connection = Centrepiece + Key Man).
2. Integrare gap: Leader+Capitano, rischio infortunio, Giocatore chiave, competenze posizione, restrizioni portieri, Squadra Autentica/Sogni.

### Fase 2: Diagnostic (`diagnosticBuilder.js`)

1. Aggiungere blocco **ISTRUZIONI PER L’IA** all’inizio di `buildDiagnostic()`.
2. Aggiungere righe “Uso” nelle LABELS (IT/EN) dove utile.
3. (Opzionale) Rafforzare `leveSection` con collegamenti a RAG §14.

### Fase 3: Allineamento analyze-match (opzionale)

1. Aggiungere match connection ↔ rosa come in countermeasures (coerenza flusso allenatore).

### Fase 4: Validazione

1. Testare chat con diagnostic aggiornato.
2. Verificare che non compaiano inferenze causali né invenzioni di dati.

---

## 5. Come procedere

**Proposta operativa**:

1. **Immediato**: modificare `diagnosticBuilder.js` aggiungendo il blocco ISTRUZIONI PER L’IA all’inizio del diagnostic.
2. **Breve**: aggiornare `info_rag.md` con Link-Up Play e gli altri gap.
3. **Successivo**: valutare l’aggiunta delle etichette “uso” per sezione e l’allineamento analyze-match.

Preferisci che parta subito dal blocco ISTRUZIONI PER L’IA nel diagnostic o che prima prepari le modifiche a `info_rag.md`?
