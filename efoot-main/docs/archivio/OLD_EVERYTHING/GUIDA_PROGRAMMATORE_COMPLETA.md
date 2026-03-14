# Gattilio27 - Guida Completa per Programmatori

**Documentazione tecnica completa di tutte le sezioni e logiche**

---

## INDICE

1. [Autenticazione](#1-autenticazione)
2. [Dashboard](#2-dashboard)
3. [Gestione Formazione](#3-gestione-formazione)
4. [Dettaglio Giocatore](#4-dettaglio-giocatore)
5. [Lista Giocatori](#5-lista-giocatori)
6. [Contromisure Live](#6-contromisure-live)
7. [Match - Nuova Partita](#7-match---nuova-partita)
8. [Match - Dettaglio](#8-match---dettaglio)
9. [Allenatori](#9-allenatori)
10. [Gestione Profilo](#10-gestione-profilo)
11. [Impostazioni Profilo](#11-impostazioni-profilo)
12. [Classifica](#12-classifica)
13. [Sistema RAG (AI Knowledge)](#13-sistema-rag-ai-knowledge)
14. [Generazione Riassunti Partita](#14-generazione-riassunti-partita)
15. [Sistema Task Settimanali](#15-sistema-task-settimanali)
16. [AI Knowledge Score](#16-ai-knowledge-score)
17. [Pattern Tattici](#17-pattern-tattici)
18. [Componenti Condivisi](#18-componenti-condivisi)
19. [API Endpoints](#19-api-endpoints)
20. [Autenticazione JWT](#20-autenticazione-jwt)
21. [Gestione Errori](#21-gestione-errori)
22. [I18N](#22-i18n)

---

## 1. AUTENTICAZIONE

### 1.1 Login (`/app/login/page.jsx`)

**Cosa fa:**
- Login esistente + Registrazione nuovo utente (toggle `mode`)
- Form email/password con validazione client
- Cooldown anti brute-force (60s dopo tentativi falliti)
- Redirect post-login alla dashboard

**Flusso dati:**
```
Utente → Supabase Auth (signInWithPassword / signUp)
     ↓
Session JWT → localStorage (gestita da supabaseClient)
     ↓
Redirect a / (dashboard)
```

**Punti chiave:**
- Usa `supabase.auth.signUp()` con `emailRedirectTo` per conferma email
- Password min 6 caratteri
- Gestione errori: messaggi tradotti via `t()`
- UI: stile "neon" con CSS inline (no Tailwind)

### 1.2 Forgot Password (`/app/forgot-password/page.jsx`)




**Cosa fa:**
- Legge token dalla query string (`?token=xxx`)
- Nuova password con confermat
- Validazione lunghezza

---

## 2. DASHBOARD (`/app/page.jsx`)

**Cosa fa:**
- Home page post-login
- Riepilogo dati utente (stats rosa, partite recenti)
- AI Knowledge Bar (quanto l'IA conosce l'utente)
- Task Widget (obiettivi settimanali)
- Banner setup (coach, rosa, statistiche)
- Pattern tattici (auto-calcolo se mancanti)
- Classifica (posizione mensile)

**Flusso dati:**
```
Dashboard → Supabase (query dirette):
  - formation_layout (modulo impostato)
  - players (tutti i giocatori)
  - matches (ultime 10 partite)
  - team_tactical_patterns (pattern tattici)
  - coaches (allenatore attivo)
     ↓
Se patterns mancanti → POST /api/admin/recalculate-patterns
     ↓
Rendering componenti
```

**Componenti usati:**
- `AIKnowledgeBar` - Barra progresso conoscenza IA
- `TaskWidget` - Task settimanali
- `GameAnalysisModal` - Upload statistiche gioco
- `AiInfoModal` - Info su come funziona l'IA

---

## 3. GESTIONE FORMAZIONE (`/app/gestione-formazione/page.jsx`)

**Cosa fa:**
- Campo da calcio 2D con 11 slot (0-10)
- Drag & drop giocatori tra slot e riserve
- Upload nuovi giocatori da screenshot
- Cambio modulo (4-3-3, 4-2-3-1, etc)
- Impostazioni tattiche (istruzioni individuali)
- Modalità edit posizioni custom

**Stato principale:**
```javascript
const [layout, setLayout] = useState(null)           // { formation, slot_positions }
const [titolari, setTitolari] = useState([])         // slot_index 0-10
const [riserve, setRiserve] = useState([])           // slot_index NULL
const [tacticalSettings, setTacticalSettings] = useState(null)
const [selectedSlot, setSelectedSlot] = useState(null)  // Per assegnazione
```

**Flusso operazioni:**

**A) Caricamento dati:**
```
GET formation_layout → modulo e posizioni slot
GET players → separa titolari/riserve
GET coaches (is_active = true) → allenatore
GET team_tactical_settings → istruzioni tattiche
```

**B) Upload nuovo giocatore:**
```
File immagine → FileReader (base64)
     ↓
POST /api/extract-player (OpenAI Vision)
     ↓
POST /api/supabase/save-player (con dati estratti)
     ↓
Aggiorna stato locale
```

**C) Assegna riserva a slot:**
```
Click slot vuoto → seleziona riserva
     ↓
POST /api/supabase/assign-player-to-slot
     ↓
Update stato locale (ottimistico)
```

**D) Sposta titolare ↔ riserve:**
```
Drag & drop o click
     ↓
POST /api/supabase/remove-player-from-slot (se sposta in riserve)
  oppure
POST /api/supabase/assign-player-to-slot (se sposta in campo)
```

**Modali usati:**
- `AssignModal` - Seleziona quale riserva mettere in campo
- `PositionSelectionModal` - Seleziona posizione originale del giocatore
- `MissingDataModal` - Dati mancanti nell'estrazione
- `ConfirmModal` - Conferma azioni (sostituisci, elimina, etc)
- `RosaTutorialModal` - Tutorial primo accesso

---

## 4. DETTAGLIO GIOCATORE (`/app/giocatore/[id]/page.jsx`)

**Cosa fa:**
- Visualizza dati completi di un giocatore
- Upload foto aggiuntive (stats, skills, booster)
- Mostra statistiche estratte dalle foto
- Gestione completamento dati

**Parametro URL:** `params.id` (UUID giocatore)

**Flusso:**
```
params.id → GET players WHERE id = params.id
     ↓
Se playing_style_id → GET playing_styles (nome stile)
     ↓
Visualizzazione
```

**Upload foto aggiuntive:**
- `type: 'stats'` → statistiche base (velocità, tiro, etc)
- `type: 'skills'` → abilità speciali
- `type: 'booster'` → booster applicati

Ogni upload → `POST /api/extract-player` → aggiorna dati esistenti

---

## 5. LISTA GIOCATORI (`/app/lista-giocatori/page.jsx`)

**Cosa fa:**
- Vista tabellare di tutti i giocatori
- Filtri per posizione, overall, stato
- Ricerca per nome
- Azioni rapide (elimina, modifica)

---

## 6. CONTROMISURE LIVE (`/app/contromisure-live/page.jsx`)

**Cosa fa:**
- Upload screenshot formazione avversaria
- Estrazione dati (modulo, stile, giocatori)
- Generazione contromisure tattiche via AI
- Visualizzazione analisi completa

**Flusso:**
```
Upload immagine formazione avversaria
     ↓
POST /api/extract-formation (OpenAI Vision)
     ↓
POST /api/supabase/save-opponent-formation
     ↓
POST /api/generate-countermeasures (AI)
     ↓
Visualizzazione risultati:
  - Analisi formazione avversaria
  - Contromisure tattiche (priorità alta/media/bassa)
  - Suggerimenti giocatori
  - Istruzioni individuali
  - Warnings
```

**Struttura risposta contromisure:**
```javascript
{
  analysis: {
    opponent_formation_analysis: "...",
    is_meta_formation: true,
    strengths: [...],
    weaknesses: [...]
  },
  countermeasures: {
    formation_adjustments: [...],
    tactical_adjustments: [...],
    player_suggestions: [...],
    individual_instructions: [...]
  },
  warnings: [...],
  confidence: 85
}
```

---

## 7. INSERIMENTO PARTITA (Match Wizard)

**File:** `/app/match/new/page.jsx`

### 7.1 Panoramica

Wizard 6 step per registrare una partita giocata. Ogni step può essere completato tramite:
- **Upload screenshot** → AI estrae dati automaticamente
- **Skip** → Salta lo step (dato opzionale)

**Persistenza:** Tutto viene salvato in `localStorage` (chiave: `match_wizard_progress`). Se l'utente ricarica la pagina, i dati non si perdono.

### 7.2 Gli 6 Step

| Step | ID | Icona | Descrizione | Obbligatorio |
|------|-----|-------|-------------|--------------|
| 1 | `home_away` | 🏠 | Casa / Fuori Casa | **Sì** |
| 2 | `player_ratings` | ⭐ | Voti giocatori | No |
| 3 | `team_stats` | 📊 | Statistiche squadra | No |
| 4 | `attack_areas` | ⚽ | Zone attacco | No |
| 5 | `ball_recovery_zones` | 🔄 | Zone recupero palla | No |
| 6 | `formation_style` | 🎯 | Modulo e stile giocato | No |

### 7.3 Stato del Componente

```javascript
const [currentStep, setCurrentStep] = useState(0)           // Step attivo
const [stepData, setStepData] = useState({})                // Dati estratti per step
const [stepImages, setStepImages] = useState({})            // Immagini caricate (base64)
const [opponentName, setOpponentName] = useState('')        // Nome avversario
const [isHome, setIsHome] = useState(true)                  // Casa (true) / Trasferta (false)
const [showSummary, setShowSummary] = useState(false)       // Modal riepilogo
```

**Struttura stepData:**
```javascript
{
  home_away: true,                    // boolean
  player_ratings: {                   // oggetto estratto da AI
    cliente: { "Player Name": 7.5, ... },
    avversario: { ... }
  },
  team_stats: {                       // oggetto estratto da AI
    result: "2-1",
    possession: "55%",
    shots: 12,
    ...
  },
  attack_areas: { ... },
  ball_recovery_zones: [...],
  formation_style: {
    formation_played: "4-3-3",
    playing_style_played: "Possesso",
    team_strength: 85
  },
  result: "2-1"                       // Estratto da qualsiasi step
}
```

### 7.4 Flusso Completo

#### A) Caricamento Iniziale
```
Mount componente
     ↓
Leggi localStorage (match_wizard_progress)
     ↓
Se dati salvati:
  - Ripristina stepData
  - Ripristina stepImages
  - Ripristina opponentName
  - Ripristina isHome
  - Calcola primo step vuoto → setCurrentStep()
     ↓
Render wizard
```

#### B) Selezione Casa/Fuori (Step 1)
```
Click "Casa" o "Fuori"
     ↓
setIsHome(true/false)
setStepData({ home_away: true })
     ↓
Avanza automaticamente a step 2
```

**Importante:** Il campo `is_home` è **obbligatorio** e influenza:
- Calcolo corretto gol subiti nei task
- Calcolo vittorie/sconfitte
- Analisi AI (contesto home/away)

#### C) Upload Screenshot (Steps 2-6)
```
Seleziona file immagine
     ↓
Validazione: tipo (image/*), dimensione (max 10MB)
     ↓
FileReader → base64 dataUrl
     ↓
Salva in stepImages[section]
     ↓
Click "Estrai Dati"
     ↓
POST /api/extract-match-data
  body: {
    imageDataUrl: "data:image/jpeg;base64,...",
    section: "player_ratings",  // o altro step id
    is_home: true/false
  }
     ↓
Risposta AI → Salva in stepData[section]
     ↓
Se estrazione OK:
  - Dispatch evento 'credits-consumed'
  - Avanza automaticamente allo step successivo (dopo 500ms)
```

#### D) Skip Step
```
Click "Salta"
     ↓
setStepData({ [section]: null })      // null = saltato intenzionalmente
setStepImages(prev => delete prev[section])
     ↓
Avanza a step successivo
```

#### E) Salvataggio Partita

**1. Apertura Modal Riepilogo:**
```
Click "Salva Partita"
     ↓
Verifica:
  - Almeno uno step foto completato (non saltato)
  - isHome definito (boolean)
     ↓
Mostra modal riepilogo
  - Mostra risultato estratto
  - Campo Casa/Fuori (modificabile)
  - Campo Nome Avversario (opzionale)
```

**2. Conferma Salvataggio:**
```
Click "Conferma" nel modal
     ↓
POST /api/supabase/save-match
  body: {
    matchData: {
      result: "2-1",                    // Da stepData.result o team_stats
      opponent_name: "Nome Avversario", // Opzionale
      is_home: true,                    // Casa/Fuori
      player_ratings: { ... },          // Da stepData
      team_stats: { ... },              // Senza campo 'result'
      attack_areas: { ... },
      ball_recovery_zones: [...],
      formation_played: "4-3-3",
      playing_style_played: "Possesso",
      team_strength: 85,
      extracted_data: {
        stepData: { ... },              // Backup completo
        stepImages: {                    // Solo indicatori "uploaded"
          player_ratings: "uploaded",
          team_stats: "uploaded"
        }
      }
    }
  }
     ↓
Se successo:
  - Dispatch evento 'match-saved'
  - POST /api/refresh-diagnostic (aggiorna contesto chat)
  - clearProgress() → rimuovi da localStorage
  - Redirect a / (dashboard) dopo 2s
```

### 7.5 Estrazione Dati AI (`/api/extract-match-data`)

**Input:**
- `imageDataUrl` - Screenshot in base64
- `section` - Quale step stiamo processando
- `is_home` - Contesto Casa/Trasferta

**Output per sezione:**

**player_ratings:**
```javascript
{
  cliente: { "Giocatore1": 7.5, "Giocatore2": 6.0, ... },
  avversario: { "Avv1": 7.0, ... }
}
```

**team_stats:**
```javascript
{
  result: "2-1",              // Estratto da qui o da altre sezioni
  possession: "55%",
  shots: 12,
  shots_on_target: 5,
  corners: 4,
  free_kicks: 8,
  passes: 450,
  pass_accuracy: "82%",
  crosses: 15,
  interceptions: 8,
  tackles: 12,
  saves: 3
}
```

**attack_areas:**
```javascript
{
  left: 35,
  center: 40,
  right: 25
}
```

**ball_recovery_zones:**
```javascript
[
  { zone: "difesa", count: 12 },
  { zone: "centrocampo", count: 8 },
  { zone: "attacco", count: 3 }
]
```

**formation_style:**
```javascript
{
  formation_played: "4-3-3",
  playing_style_played: "Possesso palla",
  team_strength: 85
}
```

### 7.6 Persistenza LocalStorage

**Chiave:** `match_wizard_progress`

**Struttura:**
```javascript
{
  stepData: {
    home_away: true,
    player_ratings: { ... },
    team_stats: { ... },
    // ...altri step
  },
  stepImages: {
    player_ratings: "data:image/jpeg;base64,...",
    // ...altre immagini
  },
  opponentName: "Nome Avversario",
  isHome: true,
  timestamp: 1707654321000
}
```

**Quando viene salvato:**
- Dopo ogni cambiamento (useEffect con debounce implicito)
- Dopo estrazione dati
- Dopo skip step
- Dopo cambio Casa/Fuori

**Quando viene pulito:**
- Dopo salvataggio riuscito
- All'unmount (opzionale)

### 7.7 Gestione Errori

**Errori specifici mappati:**
| Errore API | Messaggio Utente |
|------------|------------------|
| `quota` / `billing` | "Crediti esauriti" |
| `timeout` / `took too long` | "Timeout - riprova" |
| `too large` / `10MB` | "Immagine troppo grande" |
| `Unable to extract` / `No content` | "Screenshot non valido" |

### 7.8 Progresso Visualizzato

**Barra progresso:**
```
width = ((currentStep + 1) / STEPS.length) * 100%
```

**Contatore foto:**
```
photosUploaded / photoSteps.length
// photoSteps = STEPS senza home_away
```

**Step indicator:**
- 🔵 Azzurro = Step attivo
- 🟢 Verde = Step completato (dati estratti)
- ⚪ Grigio = Step saltato (null)
- ⚪ Trasparente = Non ancora raggiunto

### 7.9 Ottimizzazioni UX

1. **Auto-avanzamento:** Dopo estrazione dati OK, avanza automaticamente
2. **Click su step:** Puoi tornare a uno step precedente cliccandolo
3. **Risultato visibile:** Se estratto, mostra sempre il risultato in header
4. **Validazione salvataggio:** Non puoi salvare senza almeno uno step foto
5. **Retrocompatibilità:** Se caricamento vecchio formato, converte automaticamente

### 7.10 Dopo il Salvataggio

```
Partita salvata in matches
     ↓
Trigger:
  - Aggiornamento task settimanali
  - Calcolo pattern tattici
  - Aggiornamento AI Knowledge Score
  - Refresh contesto chat (/api/refresh-diagnostic)
     ↓
Redirect dashboard con router.refresh()
```

---

## 8. MATCH - DETTAGLIO (`/app/match/[id]/page.jsx`)

**Cosa fa:**
- Visualizza partita salvata
- Statistiche con grafici
- Voti giocatori
- Analisi AI
- Azioni: modifica, elimina, analizza

**Flusso:**
```
params.id → GET matches WHERE id = params.id
     ↓
Visualizzazione dati
     ↓
Azioni:
  - Modifica → redirect a /match/new?edit=[id]
  - Elimina → DELETE /api/supabase/delete-match
  - Analisi → POST /api/analyze-match
```

---

## 9. ALLENATORI (`/app/allenatori/page.jsx`)

**Cosa fa:**
- Lista allenatori caricati
- Visualizzazione competenze (stili di gioco)
- Switch allenatore attivo
- Upload nuovo allenatore da screenshot

**Flusso upload allenatore:**
```
Upload screenshot
     ↓
POST /api/extract-coach (OpenAI Vision)
     ↓
POST /api/supabase/save-coach
     ↓
Aggiorna lista
```

**Switch allenatore attivo:**
```
Click "Attiva" su un allenatore
     ↓
POST /api/supabase/set-active-coach
  body: { coach_id }
     ↓
Backend: setta is_active = true per questo, false per altri
```

---

## 10. GESTIONE PROFILO (`/app/gestione-profilo/page.jsx`)

**Cosa fa:**
- Visualizza profilo utente completo
- AI Knowledge Score (dettaglio)
- Breakdown conoscenza IA per categoria
- Task completati storico
- Classifica

**Componenti principali:**
- `AIKnowledgeBar` - Score principale
- Lista task completati
- Sezione premi/classifica

---

## 11. IMPOSTAZIONI PROFILO (`/app/impostazioni-profilo/page.jsx`)

**Cosa fa:**
- Modifica dati profilo
- Nome, cognome, squadra, divisione
- Squadra del cuore
- Primo setup obbligatorio per nuovi utenti

**Validazione:**
- Campi obbligatori: nome, squadra, divisione
- Redirect forzato a questa pagina se profilo incompleto

---

## 12. CLASSIFICA (`/app/classifica/page.jsx`)

**Cosa fa:**
- Classifica mensile "From Zero to Hero"
- Punteggio basato su: partite, task, utilizzo
- Posizione utente corrente
- Giorni rimanenti al termine mese

**Flusso:**
```
GET /api/leaderboard
     ↓
Rendering lista
```

---

## 13. SISTEMA RAG (AI Knowledge)

**File:** `lib/ragHelper.js`

### Cos'è il RAG
RAG = Retrieval Augmented Generation. L'AI non risponde solo con la sua conoscenza interna, ma recupera informazioni rilevanti da `info_rag.md` (documentazione eFootball) e le usa come contesto.

### Come funziona

**1. Il documento info_rag.md**
Contiene la knowledge base su eFootball:
- Statistiche giocatori (ufficiali)
- Stili giocatore (fissi)
- Moduli tattici
- Stili squadra
- Istruzioni individuali
- Calci piazzati
- Meccaniche di gioco
- Abilità giocatori
- Competenze e sviluppo

**2. Parsing delle sezioni**
```javascript
// Il file viene parsato in sezioni (## TITOLO)
parseSections(content) → [
  { title: "1. STATISTICHE GIOCATORI", content: "..." },
  { title: "2. STILI GIOCATORE", content: "..." },
  ...
]
```

**3. Keyword matching**
Ogni sezione ha un set di keyword associate (`SECTION_KEYWORDS`):
```javascript
'1. STATISTICHE GIOCATORI': [
  'statistiche', 'colpo di testa', 'velocità', 
  'accelerazione', 'tiro', ...
]
```

**4. Classificazione domanda**
```javascript
classifyQuestion(message) → {
  type: 'stats' | 'formation' | 'style' | 'instructions' | ...,
  keywords: ['parola1', 'parola2', ...]
}
```

**5. Recupero sezioni rilevanti**
```javascript
getRelevantSections(message, maxChars) → [
  { title: "...", content: "...", score: 3 },
  ...
]
```
- Scorizza ogni sezione in base a quante keyword matchano
- Ordina per score decrescente
- Prende sezioni fino a `maxChars` (default 18000)

### Uso nella chat
```javascript
// In /api/assistant-chat/route.js
const relevantSections = getRelevantSections(message, 18000)

// Costruisce il prompt con contesto
const systemPrompt = `
  Sei un coach esperto di eFootball.
  
  CONTESTO EFOOTBALL (usa solo se rilevante):
  ${relevantSections.map(s => s.content).join('\n---\n')}
  
  DATI UTENTE:
  - Rosa: ${roster}
  - Partite recenti: ${matches}
  - Pattern: ${patterns}
  
  ISTRUZIONI:
  - Rispondi in modo conciso
  - Non spiegare il ragionamento
  - Suggerimenti alla fine
`
```

---

## 14. GENERAZIONE RIASSUNTI PARTITA

**File:** `app/api/analyze-match/route.js`

**Cosa fa:**
Genera un riassunto analitico di una partita giocata usando AI.

### Flusso
```
Client → POST /api/analyze-match
  body: { match_id }
     ↓
Recupera dati partita da DB
     ↓
Verifica qualità dati (confidence score)
     ↓
Costruisce prompt con:
  - Dati partita (risultato, stats, voti)
  - Rosa utente
  - Pattern tattici
  - Sezioni RAG rilevanti
     ↓
Chiama OpenAI
     ↓
Normalizza output (bilingue IT/EN)
     ↓
Salva riassunto in matches.ai_summary
     ↓
Ritorna analisi al client
```

### Struttura output
```javascript
{
  success: true,
  summary: {
    analysis: {
      match_overview: { it: "...", en: "..." },
      result_analysis: { it: "...", en: "..." },
      key_highlights: { it: [...], en: [...] },
      strengths: { it: [...], en: [...] },
      weaknesses: { it: [...], en: [...] }
    },
    tactical_analysis: {
      what_worked: { it: "...", en: "..." },
      what_didnt_work: { it: "...", en: "..." },
      formation_effectiveness: { it: "...", en: "..." },
      suggestions: [...]
    },
    player_performance: {
      top_performers: [...],
      underperformers: [...],
      suggestions: [...]
    },
    recommendations: [...]
  },
  confidence: 0.85,
  data_quality: "good"
}
```

### Confidence Score
Calcolato in base a sezioni complete:
- Player ratings: 20%
- Team stats: 20%
- Attack areas: 20%
- Ball recovery: 20%
- Formation/style: 20%

Max 100%, min 0%.

---

## 15. SISTEMA TASK SETTIMANALI

**File:** `lib/taskHelper.js`

### Cos'è
Sistema di gamification con obiettivi settimanali generati automaticamente.

### Generazione Task
```javascript
generateWeeklyTasksForUser(userId, week) → [...]
```

**Dati usati:**
- Profilo utente
- Ultime 10 partite
- Pattern tattici

**Tipi di task generati:**
| Tipo | Descrizione | Come si calcola |
|------|-------------|-----------------|
| `increase_wins` | Vinci X partite | Conta vittorie in settimana |
| `reduce_goals_conceded` | Riduci gol subiti | Media gol subiti ultime 5 partite |
| `complete_matches` | Completa X partite | Conta partite complete salvate |
| `use_ai_recommendations` | Usa AI X volte | Conta transazioni crediti |

**Regola importante:** I task DEVONO essere calcolabili da dati oggettivi (partite, stats), mai da autodichiarazioni.

### Aggiornamento Progresso
```javascript
calculateTaskProgress(match, existingTasks) → updatedTasks
```

Trigger:
- Dopo salvataggio nuova partita
- Quando utente apre lista task

**Fix 2026-02:** Ora considera `match.is_home` per calcolo corretto:
- Gol subiti: se away, prende primo numero risultato
- Vittorie: se away e risultato "2-1", è sconfitta (perché team2 ha perso 1-2)

### Salvataggio
Tabella `weekly_goals`:
```sql
- user_id, goal_type, goal_description
- target_value (obiettivo)
- current_value (progresso attuale)
- status: 'active' | 'completed' | 'failed'
- week_start_date, week_end_date
```

⚠️ **Sicurezza:** UPDATE policy rimossa intenzionalmente (anti-cheating). Solo backend (service_role) può aggiornare `current_value` e `status`. Il client può solo leggere (SELECT), inserire (INSERT) e cancellare (DELETE) i propri task.

---

## 16. AI KNOWLEDGE SCORE

**File:** `lib/aiKnowledgeHelper.js`

### Cos'è
Punteggio 0-100% che indica quanto l'IA conosce l'utente.

### Componenti

| Componente | Peso | Criterio |
|------------|------|----------|
| **Profilo** | 20% | Campi compilati (nome, squadra, etc) |
| **Rosa** | 25% | 11 titolari + riserve + dati completi |
| **Partite** | 30% | Max 10 partite (3% ciascuna) |
| **Pattern** | 15% | Pattern tattici identificati |
| **Allenatore** | 10% | Allenatore attivo |
| **Bonus Utilizzo** | +10% | Interazioni chat |
| **Bonus Successi** | +15% | Task completati |

### Calcolo
```javascript
calculateAIKnowledgeScore({
  profile,
  players,
  formation,
  matches,
  tacticalPatterns,
  activeCoach,
  usageStats,
  completedTasks
}) → { score, level, breakdown }
```

**Livelli:**
- 0-30%: Beginner
- 31-60%: Intermediate
- 61-80%: Advanced
- 81-100%: Expert

### Aggiornamento
Trigger:
- Dopo salvataggio partita
- Dopo completamento task
- Su richiesta esplicita

---

## 17. PATTERN TATTICI

**File:** logica in `app/api/supabase/save-match/route.js`, `update-match/route.js` e `app/api/admin/recalculate-patterns/route.js` (funzione `calculateTacticalPatterns`); dati in tabella `team_tactical_patterns`

### Cos'è
Analisi automatica dello stile di gioco dell'utente basata sulle partite giocate.

### Pattern calcolati
```javascript
{
  formation_usage: {
    "4-3-3": 45%,
    "4-2-3-1": 30%,
    "altro": 25%
  },
  playing_style_usage: {
    "possesso": 60%,
    "contropiede": 40%
  },
  recurring_issues: [
    "Subisce gol su palla inattiva",
    "Difficoltà contro pressing alto"
  ]
}
```

### Calcolo
```
Ultime 50 partite
     ↓
Analizza per ogni partita:
  - Formazione usata
  - Stile di gioco
  - Risultato
  - Stats difensive/offensive
     ↓
Aggrega frequenze
Identifica pattern ricorrenti
     ↓
Salva in team_tactical_patterns
```

### Trigger
- Automatico dopo salvataggio partita
- Manuale via `/api/admin/recalculate-patterns`
- Retroattivo: se pattern mancanti ma ci sono partite, calcola on-demand

---

## 17b. PALESTRA COACH (Chat Feedback Dedicata)

**File:** `components/CoachFeedbackChat.jsx`, `app/api/coach-feedback-chat/route.js`, `app/api/save-coach-feedback/route.js`

### Cos'e
Chat dedicata che **sostituisce AiInfoModal**. Raccoglie info profilo (piattaforma, connessione, punto debole, ecc.) e feedback post-partita tramite conversazione con IA.

**BLINDATA**: la chat SOLO ascolta e raccoglie informazioni. Zero consigli tattici. Se l'utente chiede consigli, viene reindirizzato alla chat principale.

### 3 Modalita (automatiche)

| Modalita | Quando | Messaggio iniziale |
|----------|--------|-------------------|
| `profile_setup` | Profilo incompleto (<3 campi tecnici compilati) | "Parlami di te: piattaforma, connessione, PA level..." |
| `feedback` | Profilo completo + partita recente | "Hai giocato [formazione] vs [avversario] - [risultato]. Com'e andata?" |
| `update` | Profilo completo, nessuna partita recente | "C'e qualcosa di nuovo?" |

### Flusso completo
```
Dashboard: click "Palestra Coach"
     |
CoachFeedbackChat (modal fullscreen arancione)
     |
API /coach-feedback-chat (ogni messaggio, 1 credito)
  - Carica profilo + ultima partita come contesto
  - System prompt blindato (zero consigli)
     |
Utente clicca "Salva e chiudi"
     |
API /save-coach-feedback (1 call GPT estrazione, 1 credito)
  - Estrae profile_updates + tactical_insights dal JSON
  - Valida con WHITELIST (stessa di save-ai-info)
  - Salva profile_updates in user_profiles
  - Salva insights in user_tactical_feedback
  - Trigger refresh-diagnostic
     |
Diagnostic aggiornato: nuova sezione "ESPERIENZA COACH"
Chat principale la legge dal diagnostic cache
AI Knowledge Score: +coach_training (max 10%)
```

### Tabella: `user_tactical_feedback`
```sql
- id, user_id, match_id (nullable FK)
- session_type: 'profile_setup' | 'feedback' | 'update'
- formation_played, style_played, opponent_name, outcome
- conversation_summary, insights (JSONB), profile_fields_updated (JSONB)
- created_at
```

### Costo: ~5-6 crediti per sessione (4-5 messaggi + 1 estrazione)

---

## 18. COMPONENTI CONDIVISI

### 18.1 AssistantChat (`/components/AssistantChat.jsx`)

**Posizione:** Widget fisso in basso a destra (tutte le pagine)

**Cosa fa:**
- Chat con AI Coach
- Contesto personalizzato (rosa, partite, pattern)
- Suggerimenti rapidi (3 pillole cliccabili)
- Storia conversazione (max 10 messaggi)

**Flusso messaggio:**
```
Utente scrive messaggio
     ↓
POST /api/assistant-chat
  body: {
    message,
    page_context,  // "dashboard", "gestione-formazione", etc
    history,       // ultimi 10 messaggi
    language       // IT/EN
  }
     ↓
Risposta AI + 3 suggerimenti
```

### 18.2 CreditsBar (`/components/CreditsBar.jsx`)

**Posizione:** Header (tutte le pagine)

**Cosa fa:**
- Mostra crediti usati / inclusi (default 200/mese)
- Polling ogni 45s per aggiornamento
- Evento `credits-consumed` per refresh immediato

**Flusso:**
```
POST /api/credits/usage (con Bearer token)
     ↓
Risposta: { period_key, credits_used, credits_included, ... }
     ↓
Visualizzazione barra progresso
```

### 18.3 TaskWidget (`/components/TaskWidget.jsx`)

**Posizione:** Dashboard (e altre pagine se necessario)

**Cosa fa:**
- Mostra 3 task settimanali attivi
- Progress bar per ogni task
- Auto-generazione task se mancanti

**Flusso:**
```
GET /api/tasks/list
     ↓
Se non ci sono task attivi → generazione automatica
     ↓
Visualizzazione
```

---

## 19. API ENDPOINTS - REFERENCE

### 19.1 Estrazione Dati (OpenAI Vision)

| Endpoint | Input | Output |
|----------|-------|--------|
| `POST /api/extract-player` | `{ imageDataUrl }` | `{ player_name, position, overall_rating, base_stats, ... }` |
| `POST /api/extract-coach` | `{ imageDataUrl }` | `{ coach_name, age, nationality, playing_styles, ... }` |
| `POST /api/extract-formation` | `{ imageDataUrl }` | `{ formation, playing_style, players[], tactical_style, ... }` |
| `POST /api/extract-match-data` | `{ imageDataUrl, section }` | Dati specifici per sezione |

### 19.2 AI/Analisi

| Endpoint | Input | Output |
|----------|-------|--------|
| `POST /api/assistant-chat` | `{ message, page_context, history, language }` | `{ response, suggestions[], credits_used }` |
| `POST /api/analyze-match` | `{ match_id }` | `{ analysis, insights }` |
| `POST /api/generate-countermeasures` | `{ opponent_formation_id, language }` | `{ countermeasures, confidence }` |
| `POST /api/coach-feedback-chat` | `{ message, history, language }` | `{ response, matchId }` |
| `POST /api/save-coach-feedback` | `{ conversation[], session_type, match_id? }` | `{ success, profile_fields_updated[], insights_count }` |

### 19.3 Crediti

| Endpoint | Input | Output |
|----------|-------|--------|
| `GET /api/credits/usage` | Bearer token | `{ period_key, credits_used, credits_included, ... }` |

### 19.4 Task

| Endpoint | Input | Output |
|----------|-------|--------|
| `GET /api/tasks/list` | Bearer token | Lista task settimanali |

### 19.5 Operazioni DB (Supabase)

| Endpoint | Operazione |
|----------|------------|
| `POST /api/supabase/save-profile` | Upsert user_profiles |
| `POST /api/supabase/save-player` | Insert/Update players |
| `POST /api/supabase/save-coach` | Insert coaches |
| `POST /api/supabase/save-match` | Insert/Update matches |
| `POST /api/supabase/delete-player` | Delete + cleanup |
| `POST /api/supabase/delete-match` | Delete match |
| `POST /api/supabase/assign-player-to-slot` | Aggiorna slot_index |
| `POST /api/supabase/remove-player-from-slot` | Set slot_index = NULL |
| `POST /api/supabase/set-active-coach` | Cambia allenatore attivo |
| `POST /api/supabase/save-opponent-formation` | Salva formazione avversaria |
| `POST /api/supabase/save-tactical-settings` | Salva impostazioni tattiche |

### 19.6 Admin

| Endpoint | Operazione |
|----------|------------|
| `POST /api/admin/recalculate-patterns` | Ricalcola pattern tattici |

---

## 20. AUTENTICAZIONE JWT - PATTERN STANDARD

Ogni API richiede Bearer token:

```javascript
// Client-side pattern
const { data: session } = await supabase.auth.getSession()
const token = session?.session?.access_token

const res = await fetch('/api/xyz', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({ ... })
})
```

**Server-side validation:**
```javascript
// In ogni route.js
import { validateToken } from '@/lib/supabaseClient'

const { userId, error } = await validateToken(req)
if (error) return NextResponse.json({ error }, { status: 401 })
```

---

## 21. GESTIONE ERRORI - PATTERN STANDARD

```javascript
// Client-side
try {
  const res = await fetch('/api/xyz', { ... })
  if (!res.ok) {
    const data = await res.json()
    throw new Error(data.error || 'Errore generico')
  }
  const data = await res.json()
  // Successo
} catch (err) {
  setError(err.message)
} finally {
  setLoading(false)
}

// Server-side
if (error) {
  console.error('[Endpoint] Error:', error)
  return NextResponse.json({ error: error.message }, { status: 500 })
}
```

---

## 22. I18N - TRADUZIONI

Tutte le pagine usano:
```javascript
import { useTranslation } from '@/lib/i18n'
const { t, lang } = useTranslation()

// Uso
t('chiaveTraduzione')
t('chiaveConParametri', { nome: 'Mario' })
```

Le traduzioni sono in `lib/i18n.js` (oggetto con chiavi IT/EN).

---

**Fine guida.**
