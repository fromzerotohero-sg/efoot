# Gattilio27 - Guida Backend

**Documentazione tecnica completa del backend (API, Database, Sicurezza)**

---

## INDICE

1. [Architettura](#1-architettura)
2. [API Routes](#2-api-routes)
3. [Lib Helpers](#3-lib-helpers)
4. [Database Schema](#4-database-schema)
5. [Sicurezza](#5-sicurezza)
6. [Flussi Backend Completi](#6-flussi-backend-completi)

---

## 1. ARCHITETTURA

### 1.1 Stack Backend

| Componente | Tecnologia | Descrizione |
|------------|------------|-------------|
| **Runtime** | Node.js 18+ | Server JavaScript |
| **Framework** | Next.js 14 API Routes | Serverless functions |
| **Database** | Supabase (PostgreSQL) | Database + Auth |
| **AI** | OpenAI GPT-4o Vision | Estrazione dati, analisi, chat |
| **Deploy** | Vercel | Serverless, multi-istanza |
| **Storage** | In-memory (Map) | Rate limiting (temporaneo) |

### 1.2 Struttura Cartelle

```
app/api/                    # API Routes (Next.js)
├── admin/                  # Endpoint admin
├── ai-knowledge/           # Score conoscenza IA
├── analyze-match/          # Analisi partita
├── assistant-chat/         # Chat AI
├── credits/                # Sistema crediti
├── extract-*/              # Estrazione dati (Vision)
├── generate-countermeasures/  # Contromisure
├── leaderboard/            # Classifica
├── refresh-diagnostic/     # Aggiorna contesto chat
├── supabase/               # Operazioni DB
│   ├── save-*/            # Salvataggi
│   ├── delete-*/          # Cancellazioni
│   ├── assign-player-to-slot/
│   └── ...
└── tasks/                  # Task settimanali

lib/                        # Helpers e utilities
├── supabaseClient.js       # Client Supabase
├── rateLimiter.js          # Rate limiting
├── openaiHelper.js         # Chiamate OpenAI
├── authHelper.js           # Validazione JWT
├── ragHelper.js            # Sistema RAG
├── aiKnowledgeHelper.js    # Calcolo score IA
├── taskHelper.js           # Gestione task
├── creditService.js        # Servizio crediti
└── ...

migrations/                 # SQL migrations
```

### 1.3 Pattern Request/Response

Tutte le API seguono questo pattern:

```javascript
// app/api/xyz/route.js
import { NextResponse } from 'next/server'
import { validateToken } from '@/lib/authHelper'
import { checkRateLimit } from '@/lib/rateLimiter'

export async function POST(req) {
  try {
    // 1. Validazione JSON body
    let body
    try {
      body = await req.json()
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
    }
    
    // 2. Autenticazione
    const { userId, error: authError } = await validateToken(req)
    if (authError) {
      return NextResponse.json({ error: authError }, { status: 401 })
    }
    
    // 3. Rate limiting
    const rateLimit = await checkRateLimit(userId, '/api/xyz', 10, 60000)
    if (!rateLimit.allowed) {
      return NextResponse.json({ error: 'Rate limit' }, { status: 429 })
    }
    
    // 4. Logica business
    const result = await doSomething(body)
    
    // 5. Risposta
    return NextResponse.json({ success: true, data: result })
    
  } catch (err) {
    console.error('[API] Error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
```

---

## 2. API ROUTES

### 2.1 Estrazione Dati (OpenAI Vision)

Tutte usano GPT-4o Vision per estrarre dati da screenshot.

#### `POST /api/extract-player`
**Descrizione:** Estrae dati giocatore da card screenshot

**Rate Limit:** 15 req/min

**Input:**
```javascript
{
  imageDataUrl: "data:image/jpeg;base64,..."
}
```

**Output:**
```javascript
{
  player_name: "M. Verratti",
  position: "CC",
  overall_rating: 85,
  base_stats: {
    velocita: 75,
    accelerazione: 78
  },
  skills: ["Passaggio filtrante", "Controllo palla"],
  playing_style: "Regista"
}
```

---

#### `POST /api/extract-coach`
**Descrizione:** Estrae dati allenatore da screenshot

**Rate Limit:** 5 req/min

---

#### `POST /api/extract-formation`
**Descrizione:** Estrae formazione avversaria da screenshot

**Rate Limit:** 10 req/min

---

#### `POST /api/extract-match-data`
**Descrizione:** Estrae dati partita da screenshot per sezione specifica

**Rate Limit:** 10 req/min

**Input:**
```javascript
{
  imageDataUrl: "...",
  section: "player_ratings",  // o "team_stats", "attack_areas", ecc.
  is_home: true
}
```

---

### 2.2 AI e Analisi

#### `POST /api/assistant-chat`
**Descrizione:** Chat con AI Coach

**Rate Limit:** 30 req/min

**Input:**
```javascript
{
  message: "Come miglioro la difesa?",
  page_context: "dashboard",
  history: [
    { role: "user", content: "..." },
    { role: "assistant", content: "..." }
  ],
  language: "it"
}
```

**Output:**
```javascript
{
  response: "Per migliorare la difesa...",
  suggestions: [
    "Come imposto il pressing?",
    "Quali istruzioni individuali usare?",
    "Come gestisco i cross?"
  ],
  credits_used: 1
}
```

**Flusso completo:**
```
1. Validazione input (max 4000 char, max 10 messaggi history)
2. Rate limiting
3. Classificazione domanda (RAG)
4. Recupero sezioni rilevanti da info_rag.md
5. Build contesto personale (rosa, partite, pattern, allenatore)
6. Chiamata OpenAI con system prompt + contesto
7. Parsing risposta (estrazione suggerimenti)
8. Sanitizzazione output (rimozione ragionamenti)
9. Registrazione crediti usati
10. Risposta client
```

---

#### `POST /api/analyze-match`
**Descrizione:** Genera riassunto analitico di una partita

**Rate Limit:** 20 req/min

**Input:**
```javascript
{ match_id: "uuid-della-partita" }
```

**Output:**
```javascript
{
  success: true,
  summary: {
    analysis: {
      match_overview: { it: "...", en: "..." },
      result_analysis: { it: "...", en: "..." },
      strengths: { it: [...], en: [...] },
      weaknesses: { it: [...], en: [...] }
    },
    tactical_analysis: { ... },
    player_performance: { ... },
    recommendations: [...]
  },
  confidence: 0.85,
  data_quality: "good"
}
```

---

#### `POST /api/generate-countermeasures`
**Descrizione:** Genera contromisure tattiche contro formazione avversaria

**Rate Limit:** 5 req/min

---

### 2.3 Sistema Crediti

#### `POST /api/credits/usage`
**Descrizione:** Restituisce utilizzo crediti del mese corrente

**Rate Limit:** 60 req/min

**Output:**
```javascript
{
  period_key: "2026-02",
  credits_used: 45,
  credits_included: 200,
  overage: 0,
  percent_used: 22.5,
  percent_used_raw: 22.5
}
```

**Flusso:**
```
1. Validazione token
2. getCurrentUsage(userId)
3. Query user_credit_usage per periodo corrente (YYYY-MM UTC)
4. Se nessuna riga → fallback al mese precedente
5. Calcolo percentuali
6. Risposta
```

---

#### `POST /api/credits/accredit`
**Descrizione:** Accredita crediti dopo acquisto (webhook)

**Auth:** API Key (`CREDITS_ACCREDIT_API_KEY`)

**Input:**
```javascript
{
  user_id: "uuid",
  amount: 100,
  order_id: "order-123",
  period_key: "2026-02"
}
```

---

### 2.4 Task Settimanali

#### `GET /api/tasks/list`
**Descrizione:** Restituisce task della settimana corrente (auto-genera se mancanti)

**Rate Limit:** 60 req/min

**Output:**
```javascript
{
  tasks: [
    {
      id: "uuid",
      goal_type: "increase_wins",
      goal_description: "Vinci 3 partite",
      target_value: 3,
      current_value: 1,
      status: "active",
      week_start_date: "2026-02-09",
      week_end_date: "2026-02-15"
    }
  ]
}
```

**Flusso:**
```
1. Calcola settimana corrente (lun-dom)
2. Cerca task esistenti per (user_id, week_start)
3. Se trovati → ritorna
4. Se non trovati → genera nuovi task
   4a. Recupera profilo, ultime 10 partite, pattern
   4b. Genera task basati sui dati
   4c. Salva nel DB
5. Ritorna task
```

---

### 2.5 Operazioni Database (Supabase)

Tutte le route in `/api/supabase/*` sono "passacarte" tra frontend e Supabase con logica business aggiuntiva.

#### `POST /api/supabase/save-match`
**Descrizione:** Salva una nuova partita

**Rate Limit:** 20 req/min

**Flusso:**
```
1. Validazione input
2. Rate limiting
3. Recupera profilo utente
4. Inserisce in matches
5. Aggiorna/calcola pattern tattici
6. Aggiorna task settimanali
7. Aggiorna AI Knowledge Score
8. Ritorna ID partita creata
```

**Side Effects:**
- Trigger: calcolo pattern tattici
- Trigger: aggiornamento task
- Trigger: aggiornamento AI Knowledge

---

#### `POST /api/supabase/save-player`
**Descrizione:** Salva un nuovo giocatore

**Flusso:**
```
1. Validazione dati
2. Rate limiting
3. Verifica duplicati (stesso nome, stessa età)
4. Inserisce in players
5. Aggiorna AI Knowledge Score
6. Ritorna giocatore creato
```

---

#### `POST /api/supabase/assign-player-to-slot`
**Descrizione:** Assegna un giocatore a uno slot della formazione

**Input:**
```javascript
{
  player_id: "uuid",
  slot_index: 5,
  position: "CC"
}
```

**Validazioni:**
- Slot 0-10 valido
- Giocatore esiste e appartiene all'utente
- Non più di 11 titolari
- Slot non già occupato

---

### 2.6 Admin

#### `POST /api/admin/recalculate-patterns`
**Descrizione:** Ricalcola pattern tattici da zero

**Flusso:**
```
1. Autenticazione
2. Recupera tutte le partite dell'utente
3. Analizza pattern:
   - Formazioni più usate
   - Stili di gioco
   - Problemi ricorrenti
4. Upsert in team_tactical_patterns
5. Ritorna pattern calcolati
```

---

## 3. LIB HELPERS

### 3.1 supabaseClient.js

**Scopo:** Client Supabase per browser (anon key)

```javascript
export const supabase = createClient(url, anonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true  // Per recovery password
  }
})
```

**Funzioni:**
- `getValidAccessToken()` - Refresh + restituisce token valido

---

### 3.2 rateLimiter.js

**Scopo:** Rate limiting in-memory per endpoint

**Attenzione:** Su Vercel multi-istanza, ogni istanza ha il proprio Map.

```javascript
// Uso
const rateLimit = await checkRateLimit(
  userId,
  '/api/extract-player',
  15,      // max requests
  60000    // window ms (1 minuto)
)

if (!rateLimit.allowed) {
  return NextResponse.json({ error: 'Rate limit' }, { status: 429 })
}
```

**Configurazione:** `RATE_LIMIT_CONFIG` contiene limiti per ogni endpoint.

---

### 3.3 openaiHelper.js

**Scopo:** Chiamate OpenAI con retry e timeout

```javascript
// Timeout 60s, max 2 retry
const response = await callOpenAIWithRetry(
  apiKey,
  requestBody,
  'extract-player'  // per logging
)

// Parse risposta JSON
const data = await parseOpenAIResponse(response, 'extract-player')
```

**Retry automatico per:**
- Rate limit (429) → attesa 5s
- Server error (500-503) → attesa 5s  
- Timeout → attesa 10s
- Network error → attesa 5s

---

### 3.4 authHelper.js

**Scopo:** Validazione JWT Bearer token

```javascript
// Estrae token da header
const token = extractBearerToken(req)  // "Bearer xxx" → "xxx"

// Valida token con Supabase
const { userData, error } = await validateToken(token, supabaseUrl, anonKey)
```

---

### 3.5 ragHelper.js

**Scopo:** Retrieval Augmented Generation - recupero contesto da info_rag.md

```javascript
// Classifica domanda
const classification = classifyQuestion("Come funziona il pressing?")
// → { type: 'instructions', keywords: ['pressing', 'istruzioni'] }

// Recupera sezioni rilevanti
const sections = getRelevantSections("Come funziona il pressing?", 18000)
// → [{ title: "5. ISTRUZIONI INDIVIDUALI", content: "...", score: 5 }]
```

---

### 3.6 taskHelper.js

**Scopo:** Generazione e aggiornamento task settimanali

**Funzioni principali:**
- `generateWeeklyTasksForUser(userId, week)` - Genera task per la settimana
- `calculateTaskProgress(match, tasks)` - Aggiorna progresso dopo partita

**Fix 2026-02:** Considera `match.is_home` per calcolo corretto:
```javascript
// Se away e risultato "2-1", gol subiti sono 2 (primo numero)
if (match.is_home === false) {
  conceded = parseInt(result.split('-')[0])  // 2
}
```

---

### 3.7 aiKnowledgeHelper.js

**Scopo:** Calcolo AI Knowledge Score (quanto l'IA conosce l'utente)

**Punteggio totale: 100%**
- Profilo: 20%
- Rosa: 25%
- Partite: 30% (max 10 partite)
- Pattern: 15%
- Allenatore: 10%
- Bonus: +25%

---

### 3.8 creditService.js

**Scopo:** Gestione crediti mensili

```javascript
// Registra utilizzo dopo operazione AI
await recordUsage(admin, userId, 2, 'extract-player')

// Legge utilizzo corrente
const usage = await getCurrentUsage(admin, userId)
// → { credits_used: 45, credits_included: 200, ... }
```

**Periodo:** YYYY-MM in UTC
**Default:** 200 crediti/mese
**Acquisti:** Sommano a crediti esistenti (non sovrascrivono)

---

## 4. DATABASE SCHEMA

### 4.1 Tabelle Principali

#### `auth.users` (Gestita da Supabase Auth)
- `id` (UUID, PK)
- `email`
- `created_at`

---

#### `user_profiles`
Dati profilo utente estesi.

```sql
- user_id (UUID, FK → auth.users, PK)
- first_name, last_name
- team_name
- current_division, initial_division
- favorite_team
- ai_name (come l'utente vuole essere chiamato)
- how_to_remember (note per l'AI)
- common_problems (JSON array)
- ai_knowledge_score (int, 0-100)
- ai_knowledge_level (enum: beginner/intermediate/advanced/expert)
- ai_knowledge_breakdown (JSON)
```

---

#### `players`
Giocatori della rosa.

```sql
- id (UUID, PK)
- user_id (UUID, FK)
- player_name
- position (DC, TS, CC, ECC...)
- overall_rating (40-110)
- base_stats (JSON: velocita, accelerazione, ...)
- skills (JSON array)
- com_skills (JSON array)
- playing_style_id (UUID, FK → playing_styles)
- slot_index (int, 0-10 = titolare, NULL = riserva)
- original_positions (JSON array)
- photo_slots (JSON: quali foto caricate)
```

---

#### `matches`
Partite giocate.

```sql
- id (UUID, PK)
- user_id (UUID, FK)
- opponent_name
- result (es. "2-1")
- is_home (boolean)
- match_date (date)
- player_ratings (JSON)
- team_stats (JSON)
- attack_areas (JSON)
- ball_recovery_zones (JSON)
- formation_played
- playing_style_played
- ai_summary (text)
- data_completeness (complete/partial)
- extracted_data (JSON backup)
```

**Indici importanti:**
```sql
CREATE INDEX idx_matches_user_date ON matches(user_id, match_date DESC);
```

---

#### `weekly_goals`
Task settimanali.

```sql
- id (UUID, PK)
- user_id (UUID, FK)
- goal_type (enum)
- goal_description
- target_value (int)
- current_value (int)
- status (active/completed/failed)
- week_start_date (date)
- week_end_date (date)
```

**Sicurezza:** UPDATE policy rimossa intenzionalmente (anti-cheating). Solo backend (service_role) può aggiornare `current_value` e `status`.

---

#### `user_credit_usage`
Tracking crediti mensili.

```sql
- id (UUID, PK)
- user_id (UUID, FK)
- period_key (YYYY-MM)
- credits_used (int)
- credits_included (int, default 200)
- UNIQUE(user_id, period_key)
```

---

#### `coaches`
Allenatori caricati.

```sql
- id (UUID, PK)
- user_id (UUID, FK)
- coach_name
- age
- nationality
- playing_style_competence (JSON)
- is_active (boolean, solo uno per utente)
```

---

#### `team_tactical_patterns`
Pattern tattici calcolati.

```sql
- id (UUID, PK)
- user_id (UUID, FK)
- formation_usage (JSON)
- playing_style_usage (JSON)
- recurring_issues (JSON array)
```

---

#### `opponent_formations`
Formazioni avversarie salvate.

```sql
- id (UUID, PK)
- user_id (UUID, FK)
- formation_name
- playing_style
- extracted_data (JSON)
- is_pre_match (boolean)
```

---

### 4.2 RLS (Row Level Security)

Tutte le tabelle hanno RLS abilitato.

**Pattern standard SELECT:**
```sql
CREATE POLICY "Users can read own data"
ON table_name FOR SELECT
USING (auth.uid() = user_id);
```

**Pattern standard INSERT:**
```sql
CREATE POLICY "Users can insert own data"
ON table_name FOR INSERT
WITH CHECK (auth.uid() = user_id);
```

**Eccezione - weekly_goals:**
UPDATE policy rimossa intenzionalmente (anti-cheating). Solo backend (service_role) può aggiornare.

---

### 4.3 Relazioni

```
auth.users (1)
  ├── user_profiles (1:1)
  ├── players (1:N)
  ├── matches (1:N)
  ├── weekly_goals (1:N)
  ├── user_credit_usage (1:N)
  ├── coaches (1:N)
  ├── team_tactical_patterns (1:1)
  └── opponent_formations (1:N)

players (N:1) → playing_styles
```

---

## 5. SICUREZZA

### 5.1 Autenticazione

- **JWT Bearer token** su tutte le API
- Token gestito da Supabase Auth
- Scadenza automatica + refresh

### 5.2 Autorizzazione

**RLS:** Ogni query filtra per `user_id = auth.uid()`

**Service Role:** Operazioni sensibili usano `SUPABASE_SERVICE_ROLE_KEY`:
- Aggiornamento task (anti-cheating)
- Calcolo pattern tattici
- Registrazione crediti

### 5.3 Rate Limiting

| Endpoint | Limite | Note |
|----------|--------|------|
| `/api/extract-*` | 5-15 req/min | Costosi (OpenAI) |
| `/api/assistant-chat` | 30 req/min | Chat frequente |
| `/api/supabase/save-*` | 20-30 req/min | Scritture DB |
| `/api/supabase/delete-*` | 5 req/min | Critici |

**Limitazione:** In-memory Map non condiviso tra istanze Vercel.

### 5.4 Variabili d'Ambiente

**Server-side only (mai esposte al client):**
```bash
SUPABASE_SERVICE_ROLE_KEY
OPENAI_API_KEY
CREDITS_ACCREDIT_API_KEY
```

**Pubbliche (ok in client):**
```bash
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
NEXT_PUBLIC_APP_URL
```

### 5.5 Validazione Input

Tutte le API validano:
1. JSON body valido (400 se malformato)
2. Token JWT valido (401 se assente/invalido)
3. Rate limit (429 se superato)
4. Campi richiesti (400 se mancanti)
5. Formati (UUID, email, etc.)

---

## 6. FLUSSI BACKEND COMPLETI

### 6.1 Salvataggio Partita (End-to-End)

```
[FRONTEND] match/new/page.jsx
     ↓
Utente completa wizard
     ↓
Click "Salva Partita"
     ↓
POST /api/supabase/save-match
     ↓
[BACKEND]
     ↓
1. Validazione token
2. Rate limiting
3. Validazione dati partita
4. Recupera profilo utente (Supabase service_role)
     ↓
INSERT INTO matches (...)
     ↓
Trigger automatici:
  ├── Aggiorna task settimanali
  │   └── taskHelper.calculateTaskProgress()
  │       └── UPDATE weekly_goals SET current_value = ...
  ├── Calcola pattern tattici
  │   └── calculateTacticalPatterns() (inline in save-match/route.js)
  │       └── UPSERT team_tactical_patterns
  └── Aggiorna AI Knowledge Score
      └── aiKnowledgeHelper.calculateScore()
          └── UPDATE user_profiles SET ai_knowledge_score = ...
     ↓
Risposta: { success: true, matchId: "..." }
     ↓
[FRONTEND] Redirect a dashboard
```

---

### 6.2 Chat AI (End-to-End)

```
[FRONTEND] AssistantChat.jsx
     ↓
Utente scrive messaggio
     ↓
POST /api/assistant-chat
     ↓
[BACKEND]
     ↓
1. Validazione input (max 4000 char, max 10 history)
2. Rate limiting (30 req/min)
3. getRelevantSections(message)
     └── ragHelper.js classifica domanda
     └── Carica sezioni da info_rag.md
4. Build contesto personale:
   ├── GET user_profiles
   ├── GET players (rosa)
   ├── GET matches (ultime 5)
   ├── GET team_tactical_patterns
   └── GET coaches (attivo)
     ↓
Costruisci prompt:
  - System prompt (istruzioni AI)
  - Contesto eFootball (sezioni RAG)
  - Dati personali utente
  - Messaggio utente
     ↓
callOpenAIWithRetry()
     ↓
Parse risposta (estrazione suggerimenti)
     ↓
Sanitizza output (rimuovi ragionamenti)
     ↓
recordUsage() (registra crediti)
     ↓
Risposta: { response, suggestions[], credits_used }
     ↓
[FRONTEND] Mostra risposta + suggerimenti cliccabili
```

---

### 6.3 Estrazione Giocatore (Vision)

```
[FRONTEND] gestione-formazione/page.jsx
     ↓
Upload screenshot giocatore
     ↓
POST /api/extract-player
     ↓
[BACKEND]
     ↓
1. Validazione immagine (max 10MB)
2. Rate limiting (15 req/min)
3. Costruisci prompt OpenAI:
   - System: "Estrai dati giocatore in formato JSON"
   - User: immagine base64
   - Schema output atteso
     ↓
callOpenAIWithRetry()
     ↓
parseOpenAIResponse()
     ↓
Validazione campi:
   - player_name presente
   - overall_rating numerico
   - position valida
     ↓
Risposta: { player_name, overall_rating, ... }
     ↓
[FRONTEND] Mostra preview → Click "Salva"
     ↓
POST /api/supabase/save-player
     ↓
INSERT INTO players (...)
     ↓
Aggiorna AI Knowledge Score
```

---

### 6.4 Generazione Task Settimanali

```
[FRONTEND] TaskWidget.jsx mount / refresh
     ↓
GET /api/tasks/list
     ↓
[BACKEND]
     ↓
1. Validazione token
2. Calcola settimana corrente (lun-dom)
3. Cerca task esistenti:
   SELECT * FROM weekly_goals
   WHERE user_id = ? AND week_start_date = ?
     ↓
Se trovati → ritorna
     ↓
Se NON trovati:
   ├── taskHelper.generateWeeklyTasksForUser()
   │   ├── Recupera profilo utente
   │   ├── Recupera ultime 10 partite
   │   ├── Recupera pattern tattici
   │   └── Genera task basati sui dati:
   │       - increase_wins (se ha vinto recentemente)
   │       - reduce_goals_conceded (se subisce molti gol)
   │       - complete_matches (sempre)
   │       - use_ai_recommendations (sempre)
   │
   └── INSERT INTO weekly_goals (...)
     ↓
Ritorna task generati
```

---

**Fine documentazione backend.**
