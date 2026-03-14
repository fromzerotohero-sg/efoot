# Stato Progetto eFootball AI Coach

**Data:** 2026-02-09  
**Scopo:** Documento tecnico per allineamento con sviluppatore.  
**Stato:** Sviluppo attivo - fix di sicurezza applicati.

---

## 1. Stack Tecnico

| Componente | Tecnologia | Note |
|------------|------------|------|
| Frontend | Next.js 14 (App Router), React 18 | Server Components + Client Components |
| Backend | Next.js API Routes | Serverless su Vercel |
| Database | Supabase (PostgreSQL + Auth) | RLS abilitato su tutte le tabelle |
| AI | OpenAI GPT-4o (Vision) | Estrazione dati da screenshot |
| Deploy | Vercel | Serverless, multi-istanza |
| Rate Limit | In-memory (Map) | **Limite noto:** non globale su multi-istanza |

---

## 2. Fix Applicati (2026-02-09)

### Sicurezza (P1)
- **Rate limiting** aggiunto a `/api/extract-player` (15 req/min) + endpoint Supabase principali
- **PII rimossi dai log** in produzione (`NODE_ENV !== 'production'`)
- **JSON error handling:** ritorna 400 invece di 500 per body malformato

### Correttezza Dati (P1-P2)
- **Crediti:** acquisti multipli ora sommano invece di sovrascrivere (`lib/creditService.js`)
- **AI Knowledge:** usa correttamente `overall_rating` invece di `overall`

---

## 3. Issue Aperti (Da Discutere)

### P1 - Critici per integrità dati

#### 3.1 RLS weekly_goals consente UPDATE da client
**File:** `migrations/create_weekly_goals_table.sql`  
**Problema:** Policy UPDATE permette all'utente di modificare qualsiasi campo dei propri goal, inclusi `current_value` e `status`.  
**Rischio:** Utente può falsare progressi obiettivi da client Supabase.  
**Soluzione proposta:** 
```sql
-- Rimuovere o limitare policy UPDATE
DROP POLICY IF EXISTS "Users can update own goals" ON weekly_goals;
-- Opzione A: solo backend (service_role) può aggiornare
-- Opzione B: policy che esclude current_value/status
```

#### 3.2 Task: assumono sempre team1 = utente
**File:** `lib/taskHelper.js:818-820`  
**Problema:** Calcolo gol subiti assume sempre che l'utente sia team1 (primo numero in "X-Y").  
**Rischio:** Se utente è in trasferta (team2), i task su gol subiti/vittorie sono errati.  
**Soluzione proposta:**
```sql
-- Aggiungere campo is_home_team alla tabella matches
ALTER TABLE matches ADD COLUMN is_home_team BOOLEAN DEFAULT true;
```
Modificare `calculateAvgGoalsConceded` per usare `is_home_team`.

### P2 - Stabilità

#### 3.3 Rate limiter in-memory non affidabile
**File:** `lib/rateLimiter.js`  
**Problema:** Su Vercel (multi-istanza) il `Map()` è per-istanza. Un utente può bypassare limiti distribuendo richieste su più istanze.  
**Soluzione proposta:** Implementare Redis/Upstash per rate limiting globale.

#### 3.4 response_format non standard in assistant-chat
**File:** `app/api/assistant-chat/route.js:844`  
**Problema:** `response_format: { type: 'text' }` non è documentato da OpenAI come standard.  
**Rischio:** Se OpenAI rimuove supporto, l'endpoint fallisce.  
**Nota:** Attualmente funziona, monitorare changelog OpenAI.

### P3 - Qualità

#### 3.5 Encoding mojibake
Alcuni file contengono caratteri corrotti (�). Salvare tutto in UTF-8.

#### 3.6 Chiavi i18n mancanti
~15 chiavi usate nei componenti ma non definite in `lib/i18n.js`.

---

## 4. Architettura Chiave

### 4.1 Pattern: Query Dirette vs API Routes

**Query Dirette (Frontend → Supabase):**
- Lettura dati con RLS
- Gratis, scalabile
- Esempio: `formation_layout`, `players`, `matches`

**API Routes (Frontend → Next.js API → Supabase):**
- Operazioni con logica business
- Chiamate OpenAI (server-only)
- Esempio: `extract-player`, `save-profile`, `assistant-chat`

### 4.2 Sistema Crediti

**Tabella:** `user_credit_usage` (user_id, period_key YYYY-MM, credits_used, credits_included)  
**Calcolo:** UTC per period_key (evita mismatch fusi orari)  
**Default:** 200 crediti/mese  
**Pesi:** chat=1, extract=2, countermeasures=3, analyze=4

**Funzioni:** `lib/creditService.js`
- `recordUsage()` - incrementa credits_used (fire-and-forget)
- `accreditPurchase()` - somma credits_included (idempotente su orderId)
- `getCurrentUsage()` - lettura con fallback al mese precedente

### 4.3 Autenticazione

**Flusso:**
1. Client ottiene sessione Supabase (`supabaseClient.js`)
2. API riceve Bearer token
3. `validateToken()` verifica con Supabase Auth
4. Estrazione `userId` dal token

**Sicurezza:**
- Service Role Key solo server-side (mai esposto)
- RLS su tutte le tabelle
- Rate limit per endpoint

---

## 5. Database Schema (Tabelle Principali)

```sql
-- Utenti e profili
auth.users (managed by Supabase)
user_profiles (user_id PK, first_name, last_name, current_division, ai_knowledge_score, ...)

-- Rosa e formazione
players (id, user_id, player_name, position, overall_rating, slot_index, photo_slots, ...)
formation_layout (user_id UNIQUE, formation, slot_positions)

-- Partite
matches (id, user_id, opponent_name, result, match_date, team_stats, formation_played, ...)

-- Task
weekly_goals (id, user_id, goal_type, target_value, current_value, status, week_start_date)

-- Crediti
user_credit_usage (id, user_id, period_key, credits_used, credits_included)
credit_transactions (id, user_id, amount, type, description, reference_id)

-- Allenatori
coaches (id, user_id, coach_name, is_active, ...)

-- Tattica
team_tactical_settings (user_id, team_playing_style, individual_instructions)
team_tactical_patterns (user_id, formation_usage, recurring_issues, ...)

-- Classifica
leaderboard_snapshots (month, user_id, points, rank, points_breakdown)
user_prizes (user_id, month, prize_type, status, redeemed_at)
```

---

## 6. Endpoint API (Stato)

| Endpoint | Rate Limit | Auth | Note |
|----------|------------|------|------|
| `/api/extract-player` | 15/min | Bearer | ✅ Fixato (P0) |
| `/api/extract-formation` | 10/min | Bearer | Ok |
| `/api/extract-match-data` | 10/min | Bearer | Ok |
| `/api/assistant-chat` | 30/min | Bearer | Ok (monitorare response_format) |
| `/api/analyze-match` | 20/min | Bearer | Ok |
| `/api/supabase/save-profile` | 30/min | Bearer | ✅ Fixato |
| `/api/supabase/save-player` | - | Bearer | Da aggiungere rate limit |
| `/api/supabase/save-match` | 20/min | Bearer | Ok |
| `/api/tasks/list` | 60/min | Bearer | Ok |
| `/api/credits/usage` | - | Bearer | Ok |
| `/api/ai-knowledge` | 20/min | Bearer | Ok |
| `/api/leaderboard` | 60/min | Opzionale | Ok |

---

## 7. Da Fare Prossimi

**Priorità immediata (prima del rilascio):**
1. Fix RLS weekly_goals (P1) - evita manipolazione progressi
2. Decidere se implementare `is_home_team` per task (P1) o rimuovere task che dipendono dal risultato

**Priorità media:**
3. Valutare Redis per rate limiting (P2)
4. Verificare encoding file (P3)
5. Completare i18n (P3)

**Non bloccante:**
6. Monitorare `response_format` OpenAI (P2)

---

## 8. Riferimenti Documentazione

| Documento | Scopo | Stato |
|-----------|-------|-------|
| `ODIT_CODEX.md` | Audit completo con stato fix | Aggiornato |
| `SICUREZZA.md` | Checklist sicurezza e env | Valido |
| `SISTEMA_CREDITI_AI.md` | Flusso crediti e tabella | Valido |
| `GESTIONE_ROSA_FUNZIONI.md` | Documentazione funzioni rosa | Valido |
| `COSE_DA_FARE.md` | Backlog con priorità | Aggiornato |
| `DESIGN_CLASSIFICA_MENSILE_E_PREMI.md` | Specifica classifica | Valido |
| `RECUPERO_PASSWORD.md` | Flusso auth email | Valido |

---

## 9. Note per Sviluppatore

**Ambienti:**
- Sviluppo: `localhost:3000`
- Produzione: Vercel (variabili env in dashboard Vercel)

**Test critici da fare:**
1. Verificare che task si aggiornino correttamente dopo salvataggio partita
2. Verificare che crediti si accumulino correttamente su acquisti multipli
3. Verificare che utente non possa modificare `weekly_goals` da client Supabase

**Comandi utili:**
```bash
npm run dev        # Sviluppo locale
npm run build      # Build produzione (verifica errori)
```

**Variabili env richieste:**
```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
OPENAI_API_KEY=
NEXT_PUBLIC_APP_URL=
```
