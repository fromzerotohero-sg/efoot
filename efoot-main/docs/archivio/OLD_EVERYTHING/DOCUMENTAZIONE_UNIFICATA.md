# Gattilio27 - Documentazione Unificata

**Ultimo aggiornamento:** 2026-02-10
**Stato:** Produzione stabile - Fix di sicurezza e correttezza completati

---

## 1. Panoramica

Applicazione web per allenatori eFootball che permette di:
- Estrarre dati giocatori da screenshot (OpenAI Vision)
- Tracciare partite e statistiche
- Ricevere consigli tattici personalizzati da AI
- Gestire obiettivi settimanali (gamification)

**URL produzione:** https://gattilio27.vercel.app

---

## 2. Stack Tecnico

| Componente | Tecnologia | Note |
|------------|------------|------|
| **Frontend** | Next.js 14 (App Router), React 18 | Server + Client Components |
| **Styling** | CSS Modules | `app/globals.css`, `app/page.module.css` |
| **Backend** | Next.js API Routes | Serverless su Vercel |
| **Database** | Supabase (PostgreSQL + Auth) | RLS abilitato su tutte le tabelle |
| **AI** | OpenAI GPT-4o (Vision) | Estrazione dati, chat, analisi |
| **Deploy** | Vercel | Serverless, multi-istanza |
| **Rate Limit** | In-memory Map | ⚠️ Limitazione: non globale su multi-istanza |

### Variabili d'ambiente richieste

```bash
# Supabase (pubbliche - ok in client)
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NEXT_PUBLIC_APP_URL=

# Supabase (server-only)
SUPABASE_SERVICE_ROLE_KEY=

# OpenAI (server-only)
OPENAI_API_KEY=

# Crediti (server-only)
CREDITS_ACCREDIT_API_KEY=
```

---

## 3. Architettura

### Pattern: Query Dirette vs API Routes

| Tipo | Quando usarlo | Esempi |
|------|---------------|--------|
| **Query Dirette** | Lettura dati con RLS | `players`, `matches`, `formation_layout` |
| **API Routes** | Logica business, OpenAI | `extract-player`, `save-profile`, `assistant-chat` |

### Flusso tipico

```
Utente → Frontend → Supabase (letture dirette)
              ↓
         API Routes (scritture complesse) → OpenAI/Supabase service_role
```

---

## 4. Stato Attuale (Febbraio 2026)

### ✅ Funzionalità operative

| Feature | Stato | Note |
|---------|-------|------|
| Autenticazione | ✅ | Supabase Auth con email/password |
| Estrazione giocatori | ✅ | OpenAI Vision, rate limit 15 req/min |
| Gestione formazione | ✅ | Drag & drop, 11 slot titolari |
| Upload partite | ✅ | 5-step wizard con analisi AI |
| Chat AI | ✅ | Contesto personalizzato, rate limit 30 req/min |
| Task settimanali | ✅ | Auto-generazione, progress tracking |
| AI Knowledge Score | ✅ | Barra progresso conoscenza IA |
| Sistema crediti | ✅ | 200 crediti/mese, tracking uso |
| Classifica mensile | ✅ | Punteggio based su attività |
| Allenatori | ✅ | Caricamento da screenshot, switch attivo |

### ⚠️ Limitazioni note

1. **Rate Limiter in-memory**: Su Vercel multi-istanza, ogni istanza ha il proprio `Map()`. Un utente può bypassare distribuendo richieste su più istanze.
   - *Mitigazione attuale*: limiti conservativi (10-30 req/min per endpoint)
   - *Soluzione futura*: Redis/Upstash per rate limiting globale

2. **Log client-side**: Non possiamo usare `process.env.NODE_ENV` nel browser (causa crash). I `console.log` rimangono visibili in produzione.

3. **Encoding**: Alcuni file contengono caratteri corrotti (�) da encoding non UTF-8.

---

## 5. Fix Applicati (2026-02-09)

### Sicurezza (P1)

| # | Problema | Fix | File |
|---|----------|-----|------|
| 1 | Rate limit mancante | Aggiunto 15 req/min | `app/api/extract-player/route.js` |
| 2 | PII nei log | Rimossi in produzione | `save-player`, `save-coach`, `save-match`, `set-active-coach` |
| 3 | RLS weekly_goals UPDATE | Policy rimossa | `migrations/create_weekly_goals_table.sql` |
| 4 | JSON error handling | Ritorna 400 invece di 500 | `extract-player`, `save-profile`, `save-coach`, `set-active-coach` |

### Correttezza Dati (P1-P2)

| # | Problema | Fix | File |
|---|----------|-----|------|
| 5 | Crediti sovrascritti | Ora somma: `(existing + amount)` | `lib/creditService.js` |
| 6 | AI Knowledge campo errato | `overall` → `overall_rating` | `lib/aiKnowledgeHelper.js` |
| 7 | Task: sempre team1 = utente | Ora usa `match.is_home` | `lib/taskHelper.js` |
| 8 | Encoding UTF-8 | Caratteri fissati | `app/api/assistant-chat/route.js` |

### Stabilità (P2-P3)

| # | Problema | Fix | File |
|---|----------|-----|------|
| 9 | Fetch senza abort | Aggiunto AbortController | `CreditsBar`, `AssistantChat`, `TaskWidget`, `AIKnowledgeBar` |
| 10 | BackgroundLoader loop | Componente rimosso | `layout.jsx`, `globals.css` |
| 11 | response_format non standard | Rimosso parametro | `app/api/assistant-chat/route.js` |
| 12 | max_tokens troppo basso | Aumentato 450 → 800 | `app/api/assistant-chat/route.js` |

---

## 6. Database - Schema Chiave

### Tabelle principali

#### `players` (Rosa)
```sql
- user_id (FK → auth.users)
- player_name, position, overall_rating
- slot_index (0-10 = titolare, NULL = riserva)
- base_stats (JSON), skills (JSON)
- photo_slots (JSON) -- traccia foto caricate
```

#### `matches` (Partite)
```sql
- user_id, opponent_name, result (es. "2-1")
- is_home (BOOLEAN) -- casa o trasferta
- match_date, team_stats (JSON), player_ratings (JSON)
- ai_summary, data_completeness
```

#### `weekly_goals` (Task)
```sql
- user_id, goal_type, goal_description
- target_value, current_value, status
- week_start_date, week_end_date
```
⚠️ **Importante**: UPDATE policy rimossa intenzionalmente (anti-cheating). Solo backend (service_role) può aggiornare.

#### `user_credit_usage` (Crediti)
```sql
- user_id, period_key (YYYY-MM UTC)
- credits_used, credits_included (default 200)
- UNIQUE(user_id, period_key)
```

#### `user_tactical_feedback` (Palestra Coach)
```sql
- user_id, match_id (FK nullable)
- session_type: 'profile_setup' | 'feedback' | 'update'
- insights (JSONB), profile_fields_updated (JSONB)
- conversation_summary, outcome, created_at
```
Sessioni Palestra Coach. Letta da diagnosticBuilder (ESPERIENZA COACH) e aiKnowledgeHelper (coach_training 10%). Doc: `PALESTRA_COACH_ARCHITETTURA.md`.

---

## 7. API Endpoints

### Estrazione Dati (Vision)

| Endpoint | Rate Limit | Costo crediti |
|----------|------------|---------------|
| `POST /api/extract-player` | 15 req/min | 2 |
| `POST /api/extract-coach` | 10 req/min | 2 |
| `POST /api/extract-formation` | 10 req/min | 3 |
| `POST /api/extract-match-data` | 15 req/min | 2 |

### Chat e Analisi

| Endpoint | Rate Limit | Costo crediti |
|----------|------------|---------------|
| `POST /api/assistant-chat` | 30 req/min | 1 |
| `POST /api/coach-feedback-chat` | 30 req/min | 1 |
| `POST /api/save-coach-feedback` | 5 req/min | 1 |
| `POST /api/analyze-match` | 10 req/min | 4 |
| `POST /api/generate-countermeasures` | 10 req/min | 3 |

### Operazioni DB

| Endpoint | Rate Limit | Note |
|----------|------------|------|
| `POST /api/supabase/save-profile` | 20 req/min | - |
| `POST /api/supabase/save-player` | 20 req/min | - |
| `POST /api/supabase/save-coach` | 20 req/min | - |
| `POST /api/supabase/save-match` | 20 req/min | - |
| `POST /api/supabase/set-active-coach` | 20 req/min | - |
| `POST /api/supabase/delete-player` | 20 req/min | - |
| `POST /api/supabase/delete-match` | 20 req/min | - |

---

## 8. Logiche Business

### 8.1 AI Knowledge Score (`lib/aiKnowledgeHelper.js`)

Punteggio massimo: 100%

| Componente | Peso | Criterio |
|------------|------|----------|
| Profilo | 20% | Campi compilati |
| Rosa | 25% | 11 titolari + riserve complete |
| Partite | 30% | Max 10 partite |
| Pattern | 15% | Pattern tattici identificati |
| Allenatore | 10% | Allenatore attivo |
| Bonus utilizzo | +10% | Interazioni chat |
| Bonus successi | +15% | Task completati |

### 8.2 Task Helper (`lib/taskHelper.js`)

Calcola progresso task settimanali:
- `increase_wins` → Conta vittorie (usa `is_home`!)
- `reduce_goals_conceded` → Media gol subiti ultime 5 partite
- `complete_matches` → Conta partite complete

**Fix 2026-02**: Ora considera `match.is_home` per determinare correttamente:
- Gol subiti (se away, prende primo numero del risultato)
- Vittorie/sconfitte (invertite se away)

### 8.3 Credit Service (`lib/creditService.js`)

- **Periodo**: YYYY-MM in UTC
- **Default**: 200 crediti/mese
- **Acquisti**: Somma a crediti esistenti (non sovrascrive)
- **Fallback**: Se nessuna riga mese corrente, mostra mese precedente

---

## 9. Sicurezza

### RLS (Row Level Security)

Tutte le tabelle hanno RLS abilitato. Pattern standard:
```sql
-- Lettura: solo proprietario
CREATE POLICY "Users can read own data" ON table_name
  FOR SELECT USING (auth.uid() = user_id);

-- Scrittura: solo proprietario (se permesso)
CREATE POLICY "Users can insert own data" ON table_name
  FOR INSERT WITH CHECK (auth.uid() = user_id);
```

Eccezione: `weekly_goals` - UPDATE policy rimossa intenzionalmente (anti-cheating, solo backend service_role).

### Rate Limiting

```javascript
// Implementazione attuale (in-memory)
const rateLimitStore = new Map()

// Chiave: `${userId}:${endpoint}`
// Valore: { count, resetAt }
```

⚠️ **Limitazione**: Non affidabile su multi-istanza Vercel.

### Variabili d'ambiente

| Variabile | Dove | Sicuro? |
|-----------|------|---------|
| `NEXT_PUBLIC_*` | Client + Server | ✅ Solo URL/anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Server only | ✅ Segreto |
| `OPENAI_API_KEY` | Server only | ✅ Segreto |
| `CREDITS_ACCREDIT_API_KEY` | Server only | ✅ Segreto |

---

## 10. Issue Aperti (Backlog)

### Alta priorità

- [ ] **Rate limiter globale**: Implementare Redis/Upstash per produzione scale
- [ ] **i18n chiavi mancanti**: ~15 chiavi usate ma non definite in `lib/i18n.js`

### Media priorità

- [ ] **Encoding file**: Normalizzare tutto in UTF-8 (alcuni file hanno �)
- [ ] **Function search_path**: Fissare `search_path` nelle funzioni PostgreSQL (avviso Supabase)

### Bassa priorità

- [ ] **Leaked password protection**: Abilitare in Supabase Auth (opzionale)
- [ ] **Custom SMTP**: Configurare per deliverability email

---

## 11. Troubleshooting

### "Loading infinito" sulla dashboard
**Causa**: Supabase lento o errore
**Fix**: Timeout 30s + retry manuale

### "I task non si aggiornano"
**Causa**: Calcolo asincrono in corso
**Fix**: Polling ogni 60s (già implementato)

### "La chat non risponde"
**Causa**: Rate limit OpenAI o errore API
**Fix**: Retry 3x + messaggio errore specifico

### "Crediti non visibili dopo acquisto"
**Causa**: Cache del componente
**Fix**: Evento `credits-consumed` forza refresh

---

## 12. Checklist Sviluppo

### Prima di modificare codice
- [ ] Verificare `.env.local` completo
- [ ] Leggere questa documentazione
- [ ] Fare backup branch

### Quando aggiungi API
- [ ] Aggiungere rate limiting
- [ ] Non loggare PII in produzione
- [ ] Testare errori JSON (400 vs 500)
- [ ] Usare AbortController per fetch client

### Quando modifichi database
- [ ] Abilitare RLS
- [ ] Creare policies appropriate
- [ ] Aggiungere migration in `migrations/`
- [ ] Testare con utente non autenticato (deve fallire)

---

## 13. Glossario

| Termine | Significato |
|---------|-------------|
| **RLS** | Row Level Security (politiche accesso Supabase) |
| **Service Role** | Chiave Supabase con super-poteri (solo server) |
| **RAG** | Retrieval Augmented Generation (contesto per AI) |
| **is_home** | Boolean: utente era in casa o trasferta? |
| **slot_index** | Posizione giocatore: 0-10 titolare, NULL riserva |
| **Hero Points** | Nome "fantasy" dei crediti AI |
| **AI Knowledge** | Quanto l'IA conosce l'utente (0-100%) |
| **Mojibake** | Caratteri corrotti per encoding sbagliato |

---

## 14. Riferimenti

- **Panoramica discorsiva**: `docs/PANORAMICA_PROGETTO.md`
- **Sistema crediti dettagliato**: `docs/SISTEMA_CREDITI_AI.md`
- **Sicurezza**: `docs/SICUREZZA.md`

---

*Questa documentazione sostituisce e unifica i seguenti documenti obsoleti:*
- `ODIT_CODEX.md` (audit superato dai fix)
- `STATO_PROGETTO.md` (stato consolidato qui)
- `COSE_DA_FARE.md` (task migrati qui)
- `BRIEFING_PROGRAMMATORE.md` (contenuto in PANORAMICA)
- Tutti i file `AUDIT_*.md` (fix applicati)
- `ANALISI_*.md` (analisi superate)
- `CHECK_*.md` (checklist integrate)
