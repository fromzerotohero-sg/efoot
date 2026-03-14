# Audit trigger e flussi — Controllo completo

**Data:** 2026-02-14  
**Scopo:** Verifica di tutti i trigger DB, flussi API → tabelle, coerenza con FLUSSI_LOGICA_SUPABASE.md e punti critici (classifica, profilo, partite).

---

## 1. Trigger presenti in DB (public)

| Tabella | Trigger | Funzione | Timing | Eventi |
|---------|---------|----------|--------|--------|
| **coaches** | coaches_updated_at_trigger | update_coaches_updated_at | BEFORE | UPDATE |
| **matches** | after_match_save_refresh_performance | trg_refresh_player_performance | AFTER | INSERT, UPDATE |
| **matches** | trigger_update_matches_updated_at | update_matches_updated_at | BEFORE | UPDATE |
| **opponent_formations** | trigger_update_opponent_formations_updated_at | update_opponent_formations_updated_at | BEFORE | UPDATE |
| **players** | trigger_cleanup_individual_instructions | cleanup_orphan_individual_instructions | AFTER | DELETE |
| **players** | update_players_updated_at | update_updated_at_column | BEFORE | UPDATE |
| **team_tactical_settings** | update_team_tactical_settings_updated_at | update_team_tactical_settings_updated_at | BEFORE | UPDATE |
| **user_credit_usage** | trigger_user_credit_usage_updated_at | update_user_credit_usage_updated_at | BEFORE | UPDATE |
| **user_profiles** | trigger_calculate_profile_completion | calculate_profile_completion_score | BEFORE | INSERT, UPDATE |
| **user_profiles** | trigger_set_initial_division | set_initial_division | BEFORE | INSERT, UPDATE |
| **weekly_goals** | trigger_update_weekly_goals_updated_at | update_weekly_goals_updated_at | BEFORE | UPDATE |

**Nessun trigger** su: `leaderboard_snapshots`, `credit_transactions`, `formation_layout`, `user_tactical_feedback`, `user_diagnostic_cache`, `user_game_analysis`, `user_prizes`.

---

## 2. Flussi che scrivono in leaderboard_snapshots

La tabella **leaderboard_snapshots** non ha trigger. Scrittura solo da **codice applicativo**:

| Punto | File | Quando |
|-------|------|--------|
| GET /api/leaderboard (mese corrente) | `app/api/leaderboard/route.js` | Ogni richiesta: `computeLeaderboardForMonth` → `saveLeaderboardSnapshot` |
| GET /api/leaderboard (mese passato, utente non in snapshot) | idem | Ricalcolo retroattivo → `saveLeaderboardSnapshot` |
| POST /api/supabase/save-profile | `app/api/supabase/save-profile/route.js` | Dopo update profilo: async `computeLeaderboardForMonth` + `saveLeaderboardSnapshot` |

**Nessun** trigger su `user_profiles` o `matches` aggiorna la classifica. Il nickname in classifica viene letto da **user_profiles** al momento della risposta (join in API / RPC), non salvato nello snapshot.

---

## 3. Trigger critici — dettaglio

### 3.1 user_profiles — calculate_profile_completion_score (BEFORE INSERT/UPDATE)

- **Effetto:** Calcola `profile_completion_score` (0–100) e `profile_completion_level` (beginner/intermediate/complete) in base a 8 campi (first_name, last_name, current_division, favorite_team, team_name, ai_name, how_to_remember, hours_per_week). Imposta anche `updated_at`.
- **Non tocca:** nickname, leaderboard_consent, ai_knowledge_*.
- **Coerenza classifica:** Il punteggio profilo influisce sull’eleggibilità e sui punti (bonus profilo ≥80). Dopo save-profile, l’async recompute classifica usa il nuovo score.

### 3.2 user_profiles — set_initial_division (BEFORE INSERT/UPDATE)

- **Effetto:** Se `initial_division` è NULL e `current_division` è valorizzato, copia in `initial_division`.
- **Non tocca:** nickname, classifica.

### 3.3 matches — trg_refresh_player_performance (AFTER INSERT/UPDATE)

- **Effetto:** Se `user_id` e `player_ratings` sono valorizzati, chiama `refresh_player_performance_for_user(NEW.user_id)`.
- **refresh_player_performance_for_user:** Per ogni giocatore dell’utente, legge le ultime **20** partite con `player_ratings`, estrae i rating per nome giocatore, calcola media e trend (ultimi 10), fa UPSERT su **player_performance_aggregates**. (Migrazione `refresh_player_performance_limit_20_matches`: LIMIT 50 → 20.)
- **Non tocca:** leaderboard_snapshots, user_profiles, weekly_goals.

### 3.4 Altri trigger

- **updated_at:** coaches, matches, opponent_formations, players, team_tactical_settings, user_credit_usage, weekly_goals — solo aggiornamento `updated_at`.
- **players — cleanup_orphan_individual_instructions (AFTER DELETE):** pulizia `team_tactical_settings.individual_instructions` da riferimenti a giocatori eliminati.

---

## 4. Flussi documentati vs codice (verifica)

| Flusso | Doc (FLUSSI_LOGICA_SUPABASE.md) | Codice verificato |
|--------|----------------------------------|-------------------|
| save-match → leaderboard | Non aggiorna classifica | ✅ save-match non chiama leaderboardHelper |
| save-profile → leaderboard | Async compute + save snapshot | ✅ import dinamico leaderboardHelper, computeLeaderboardForMonth + saveLeaderboardSnapshot per mese corrente |
| GET leaderboard mese corrente | Compute + save + risposta da snapshot | ✅ route.js: isCurrentMonth → compute → saveLeaderboardSnapshot; poi rankings da snapshots + join user_profiles (nickname) |
| GET leaderboard mese passato | Lettura da leaderboard_snapshots (o RPC) | ✅ SELECT .eq('month', month) .order('rank'); se 0 righe → RPC get_leaderboard_for_month |
| Nickname in classifica | Da user_profiles al volo | ✅ API: .from('user_profiles').select('user_id, nickname').in('user_id', ...) → nicknameByUser; RPC: LEFT JOIN user_profiles, COALESCE(p.nickname, '—') |

---

## 5. RLS leaderboard_snapshots

- **Doc / migrazione:** `restrict_leaderboard_snapshots_rls.sql` prevede di **rimuovere** la policy "Allow read leaderboard_snapshots for API" così che solo **service_role** legga/scriva.
- **Stato attuale DB:** La policy **"Allow read leaderboard_snapshots for API"** è **presente**, con `roles = {anon, authenticated, service_role}`, `cmd = SELECT`, `qual = true`.
- **Migrazioni applicate:** In `list_migrations` **non** compare `restrict_leaderboard_snapshots_rls`. Risultato: la migrazione di restrizione **non è stata applicata** (o la policy è stata ripristinata da un’altra migrazione).
- **Rischio:** Con RLS attivo e policy SELECT per anon/authenticated, i client potrebbero leggere direttamente `leaderboard_snapshots` (inclusi `user_id`, `points_breakdown`) se usassero la anon/authenticated key invece dell’API. L’API usa service_role e quindi bypassa RLS; il comportamento dell’app resta corretto, ma l’esposizione diretta della tabella è superflua e non allineata alla doc.

**Azione consigliata:** Applicare la migrazione `restrict_leaderboard_snapshots_rls` (DROP della policy) oppure verificare se una migrazione successiva deve ripristinare la policy e aggiornare la documentazione.

---

## 6. Riepilogo

- **Trigger:** 11 trigger su 6 tabelle; nessun trigger su leaderboard_snapshots. Classifica aggiornata solo da GET /api/leaderboard e da save-profile (async).
- **Flussi:** Allineati alla doc; nickname in classifica sempre da `user_profiles` a tempo di lettura.
- **RLS leaderboard_snapshots:** Policy SELECT ancora attiva per anon/authenticated; migrazione di restrizione non applicata — da allineare a doc/sicurezza.

Fine audit.
