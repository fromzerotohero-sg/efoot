# Flussi, logica e intersezioni Supabase — Controllo completo

**Data:** 2026-02-14  
**Scopo:** Mappatura sezione per sezione di pagine, API, tabelle Supabase, flussi e intersezioni. Verifica coerenza e punti di attenzione.

---

## 1. Riepilogo sezioni → Pagine → API → Tabelle

| Sezione | Pagine | API principali | Tabelle Supabase (lettura/scrittura) |
|--------|--------|-----------------|--------------------------------------|
| **Auth** | `/login`, `/forgot-password`, `/reset-password` | Supabase Auth (client) | `auth.users` (gestita da Supabase) |
| **Profilo** | `/gestione-profilo`, `/impostazioni-profilo` | `save-profile`, `save-ai-info` | `user_profiles` |
| **Partite** | `/`, `/match/new`, `/match/[id]` | `save-match`, `update-match`, `delete-match` | `matches`, `team_tactical_patterns`, `user_profiles`, `player_performance_aggregates` (trigger), `opponent_formations` (FK opzionale) |
| **Task (Obiettivi)** | Dashboard (TaskWidget), `/` | `tasks/list`, `tasks/generate` | `weekly_goals`; lettura: `matches`, `credit_transactions` (per use_ai_recommendations) |
| **Classifica** | `/classifica`, card su `/` e gestione-profilo | `leaderboard`, `leaderboard/me` | `user_profiles`, `matches`, `weekly_goals`, `credit_transactions`, `leaderboard_snapshots`; RPC: `get_leaderboard_for_month`, `get_leaderboard_current_user` |
| **AI Knowledge (barra)** | Dashboard (AIKnowledgeBar), dettaglio punteggio | `ai-knowledge` | Lettura: `user_profiles`, `players`, `formation_layout`, `matches`, `team_tactical_patterns`, `coaches`, `weekly_goals`, `user_tactical_feedback`. Scrittura: `user_profiles` (ai_knowledge_*, breakdown) |
| **Crediti** | CreditsBar (layout), gestione-profilo | `credits/usage`, `credits/transactions`, `credits/accredit` | `user_credit_usage`, `credit_transactions` |
| **Rosa / Formazione** | `/gestione-formazione`, `/giocatore/[id]`, `/lista-giocatori` | `save-player`, `assign-player-to-slot`, `remove-player-from-slot`, `save-formation-layout`, `save-tactical-settings`, `delete-player` | `players`, `formation_layout`, `team_tactical_settings`, `playing_styles`. **Vincolo:** 11 titolari (slot_index 0-10) + max 12 riserve (slot_index NULL); controllato in UI e in API (save-player, remove-player-from-slot). |
| **Allenatori** | `/allenatori` | `save-coach`, `set-active-coach`, `extract-coach` | `coaches` |
| **Palestra Coach** | Modal da dashboard | `coach-feedback-chat`, `save-coach-feedback` | Lettura: `user_profiles`, `matches`. Scrittura: `user_tactical_feedback`, `user_profiles` (campi AI info), `credit_transactions` |
| **Contromisure** | `/contromisure-pre-partita` | `extract-formation`, `save-opponent-formation`, `generate-countermeasures` | `opponent_formations` (opzionale salvataggio) |
| **Diagnostic / Chat** | Chat principale, refresh post-partita | `assistant-chat`, `refresh-diagnostic` | `user_diagnostic_cache` |
| **Analisi partita / Upload** | Modal analisi, upload giocatori/allenatori | `extract-game-analysis`, `extract-match-data`, `extract-player`, `extract-formation` | `user_game_analysis`, `matches` (in wizard), `players`, `coaches` |
| **Admin** | (solo API) | `admin/recalculate-patterns` | `team_tactical_patterns` (ricalcolo da `matches`) |
| **Mission Center** | Dashboard (`/`) | Nessuna API dedicata | Lettura: `user_profiles` (ai_weak_point, platform, current_division), `matches` e `players` (via dashboard: stats, recentMatches), `weekly_goals` via `tasks/list`. Ordine missioni: task attivo → rosa < 11 → prima partita → profilo senza ai_weak_point → analisi eFootball → completo. |

---

## 2. Flussi critici e catene

### 2.1 Salvataggio partita (save-match)

```
Client: POST /api/supabase/save-match (body: match data)
  → Insert matches
  → (async, non blocca risposta):
      1. calculateTacticalPatterns(admin, userId)  → scrive/aggiorna team_tactical_patterns
      2. updateAIKnowledgeScore(userId, ...)       → legge players, formation_layout, matches, team_tactical_patterns, coaches, weekly_goals, user_tactical_feedback → scrive user_profiles (ai_knowledge_*)
      3. updateTasksProgressAfterMatch(userId, ..., savedMatch) → legge weekly_goals (active), matches; scrive weekly_goals (current_value, status)
```

**Tabelle toccate in ordine:** `matches` (insert) → `team_tactical_patterns` (upsert) → `user_profiles` (update ai_knowledge_*) → `weekly_goals` (update).

**Trigger DB (da migrazioni):** dopo insert/update su `matches` esistono trigger per `player_performance_aggregates` e (storicamente) per performance; `team_tactical_patterns` è aggiornato dal codice (calculateTacticalPatterns in save-match/update-match), non da trigger.

### 2.2 Modifica partita (update-match)

```
Client: POST /api/supabase/update-match
  → Update matches
  → (async): calculateTacticalPatterns → updateAIKnowledgeScore
  → NON chiama updateTasksProgressAfterMatch
```

**Fix applicato:** Dopo `updateAIKnowledgeScore` viene chiamato `updateTasksProgressAfterMatch(userId, ..., updatedMatch)`, come in save-match. Modifica partita aggiorna quindi anche il progresso task.

### 2.3 Salvataggio profilo (save-profile)

```
Client: POST /api/supabase/save-profile
  → Update user_profiles (nome, squadra, divisione, nickname, profile_completion_score, ecc.)
  → (async): computeLeaderboardForMonth + saveLeaderboardSnapshot  → leaderboard_snapshots
  → (async): updateAIKnowledgeScore (in alcuni flussi documentati)
```

**Tabelle:** `user_profiles` (update) → `leaderboard_snapshots` (delete + insert per mese). Evento `leaderboard-updated` lato client per refresh UI.

### 2.4 Classifica mensile (GET leaderboard)

```
Client: GET /api/leaderboard?month=YYYY-MM
  → Mese corrente: computeLeaderboardForMonth(month, admin) → saveLeaderboardSnapshot(month, rankings, admin)
  → Lettura risultati: da snapshot appena scritto o da RPC get_leaderboard_for_month / get_leaderboard_current_user
  → Risposta: rankings (rank, nickname, points), currentUser (con pointsBreakdown), daysLeftInMonth
```

**Tabelle lette da computeLeaderboardForMonth:** `user_profiles`, `matches`, `weekly_goals` (completed nel mese), `credit_transactions` (type=usage nel mese). **Scrittura:** `leaderboard_snapshots`. Punti calcolati solo da partite + usage_ia + profilo (task/improvement = 0).

**Nome mostrato in classifica (rankings[].nickname):** unica fonte è `user_profiles`:
- **Scrittura:** solo `POST /api/supabase/save-profile` aggiorna `user_profiles.nickname`. La pagina Impostazioni profilo (sezione "Classifica mensile") invia `profile.nickname` nel body e dopo il save emette `leaderboard-updated`.
- **Lettura:** `computeLeaderboardForMonth` legge `user_profiles` (user_id, nickname, first_name, profile_completion_score). Il nome esposto è `nickname` se valorizzato, altrimenti `first_name`, altrimenti "—". Per il mese corrente la risposta usa direttamente l’array computed (nessuna seconda fetch su profili). Mesi passati: nickname/first_name da `user_profiles` in base ai user_id negli snapshot.
- **Nessun’altra tabella** contiene il nickname per la classifica (es. `leaderboard_snapshots` non ha nickname). Nessun trigger su user_profiles modifica il nickname; RPC get_leaderboard_for_month fa JOIN user_profiles con fallback nickname → first_name → "—".

### 2.5 Task (lista e generazione)

```
GET /api/tasks/list?lang=it|en
  → Legge weekly_goals (per user + week); se settimana corrente e ci sono task, chiama updateTasksProgressAfterMatch(..., { id: 'list-sync' }) per ricalcolare progresso senza nuova partita
  → Risposta: tasks con status/current_value/target_value

POST /api/tasks/generate (cron o interno)
  → generateWeeklyTasksForUser → insert weekly_goals (solo se non esistono per quella settimana)
```

**Intersezione:** `updateTasksProgressAfterMatch` legge `matches` (ultime 20 + per settimana task) e `credit_transactions` (per goal_type use_ai_recommendations). Scrive `weekly_goals` (current_value, status completed/failed).

### 2.6 Crediti

```
Utilizzo: ogni route che usa OpenAI chiama recordUsage(admin, userId, credits, operationType)
  → Upsert user_credit_usage (period_key = YYYY-MM, credits_used += credits)
  → recordTransaction(admin, userId, -credits, 'usage', description, reference_id)  → insert credit_transactions

Acquisto: POST /api/credits/accredit (webhook, API key)
  → accreditPurchase → user_credit_usage (credits_included o nuova riga) + credit_transactions (type=purchase)
```

**Tabelle:** `user_credit_usage`, `credit_transactions`. Periodo in UTC (YYYY-MM). Classifica usa `credit_transactions` (usage nel mese) per il conteggio “Utilizzo IA”.

### 2.7 AI Knowledge (GET ai-knowledge)

```
GET /api/ai-knowledge (optional ?refresh=1)
  → Se cache valida (< 5 min): ritorna user_profiles.ai_knowledge_score, ai_knowledge_level, ai_knowledge_breakdown
  → Altrimenti: calculateAIKnowledgeScore(userId, ...) che legge:
       user_profiles, players, formation_layout, matches (ultime 30), team_tactical_patterns, coaches, weekly_goals (ultimi 20), user_tactical_feedback (ultimi 30 gg)
  → Scrive user_profiles (ai_knowledge_*, ai_knowledge_breakdown, ai_knowledge_last_calculated)
  → Breakdown include: profile, roster, matches, patterns, coach, usage, success, coach_training
```

---

## 3. Tabelle Supabase e utilizzo

| Tabella | Scrittura da (API/trigger) | Lettura da |
|---------|----------------------------|------------|
| `user_profiles` | save-profile, save-ai-info, save-coach-feedback, aiKnowledgeHelper (updateAIKnowledgeScore) | leaderboardHelper, aiKnowledgeHelper, tasks/generate (profilo), coach-feedback-chat, assistant-chat |
| `matches` | save-match, update-match, delete-match, extract-match-data (wizard) | leaderboardHelper (per mese), taskHelper (ultime 20 + per week), aiKnowledgeHelper (ultime 30), save-coach-feedback (ultima partita) |
| `weekly_goals` | taskHelper (update progress + status), tasks/generate (insert) | taskHelper, leaderboardHelper (completed nel mese), aiKnowledgeHelper (ultimi 20 per success) |
| `team_tactical_patterns` | save-match, update-match, recalculate-patterns (admin) | aiKnowledgeHelper |
| `credit_transactions` | creditService (recordTransaction, accreditPurchase), save-coach-feedback, route OpenAI (recordUsage) | leaderboardHelper (usage nel mese), taskHelper (use_ai_recommendations nella settimana) |
| `user_credit_usage` | creditService (recordUsage, accreditPurchase) | credits/usage, credits/transactions |
| `leaderboard_snapshots` | leaderboard route (saveLeaderboardSnapshot), save-profile (async) | leaderboard route (RPC o lettura diretta), leaderboard/me |
| `players` | save-player, assign/remove slot, extract-player | aiKnowledgeHelper (roster) |
| `formation_layout` | save-formation-layout | aiKnowledgeHelper |
| `coaches` | save-coach, set-active-coach, extract-coach | aiKnowledgeHelper (is_active), save-match (per pattern?) |
| `user_tactical_feedback` | save-coach-feedback | aiKnowledgeHelper (coach_training), refresh-diagnostic / diagnosticBuilder |
| `user_diagnostic_cache` | refresh-diagnostic | assistant-chat (contesto) |
| `opponent_formations` | save-opponent-formation, save-match (opponent_formation_id) | contromisure, matches (FK) |
| `player_performance_aggregates` | Trigger DB dopo match | (futuro: dettaglio giocatore) |
| `user_game_analysis` | extract-game-analysis | (analisi partita / dashboard) |

---

## 4. RPC e funzioni DB

- **get_leaderboard_for_month(month_param):** usata da API leaderboard per restituire la classifica (rank, nickname, points). Coerenza: migrazione `leaderboard_rpc_remove_consent_filter` allinea RPC a “nessun filtro consenso”.
- **get_leaderboard_current_user(month_param, user_id_param):** posizione e breakdown utente loggato.
- **get_user_id_by_email:** crediti accredit (webhook) per risolvere user_id da email.

---

## 5. Punti di attenzione e coerenza

| Punto | Stato | Azione |
|-------|--------|--------|
| **update-match non aggiorna task** | Fixato | Aggiunto `updateTasksProgressAfterMatch(..., updatedMatch)` dopo `updateAIKnowledgeScore` in update-match. |
| **Mese classifica** | OK | Client e API usano YYYY-MM (getCurrentMonth() lato client; getMonthBounds UTC lato server). |
| **Eleggibilità classifica** | OK | 1 partita completa + profilo ≥ 50; nessun consenso; task non contano nei punti. |
| **Task ↔ classifica** | OK | Task non danno punti; contribuiscono solo a AI Knowledge (success + barra). |
| **Crediti ↔ classifica** | OK | credit_transactions type=usage nel mese → conteggio “Utilizzo IA” in leaderboardHelper. |
| **Crediti ↔ task** | OK | task use_ai_recommendations legge credit_transactions (whitelist description) nella settimana del task. |
| **Palestra Coach** | OK | user_tactical_feedback → coach_training in AI Knowledge; save-coach-feedback registra crediti (coach-feedback-chat, save-coach-feedback) e transazioni. |
| **RLS leaderboard_snapshots** | Verificato in FLUSSI.md | Solo service_role legge snapshot; policy SELECT per anon/authenticated rimossa con migrazione. |

---

## 6. Riferimenti codice

- **Flussi utente:** `docs/FLUSSI.md`
- **Audit classifica/task:** `docs/AUDIT_COERENZA_ENTERPRISE.md`
- **Revisione logica:** `docs/REVISIONE_LOGICA_PIATTAFORMA.md`
- **Confronto dashboard:** `docs/CONFRONTO_DASHBOARD.md`
- **Auth:** `lib/authHelper.js`; API: `extractBearerToken` + `validateToken`; user_id sempre da token (eccezione: credits/accredit con API key).

Fine documento.
