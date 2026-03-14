# Check di coerenza: Supabase, Frontend, Backend, Sicurezza, Traduzioni

**Data**: 2026-02-08  
**Scope**: allineamento DB/codice, API/auth, sicurezza, i18n IT/EN.

---

## 1. Supabase

### 1.1 Tabelle public e RLS

| Tabella | RLS | Uso nel codice |
|---------|-----|----------------|
| `user_profiles` | ✅ | save-profile, save-ai-info, assistant-chat, refresh-diagnostic, ai-knowledge, taskHelper, analyze-match |
| `players` | ✅ | save-player, formation, assistant-chat, refresh-diagnostic, aiKnowledgeHelper, analyze-match |
| `formation_layout` | ✅ | save-formation-layout, assign-player-to-slot, dashboard, assistant-chat, refresh-diagnostic |
| `coaches` | ✅ | save-coach, set-active-coach, assistant-chat, refresh-diagnostic, aiKnowledgeHelper (con `is_active = true`) |
| `team_tactical_settings` | ✅ | save-tactical-settings, assistant-chat, refresh-diagnostic |
| `matches` | ✅ | save-match, update-match, delete-match, assistant-chat, refresh-diagnostic, taskHelper |
| `opponent_formations` | ✅ | save-opponent-formation, matches, generate-countermeasures |
| `team_tactical_patterns` | ✅ | refresh-diagnostic, taskHelper, aiKnowledgeHelper, admin/recalculate-patterns |
| `weekly_goals` | ✅ | tasks/list, tasks/generate, taskHelper |
| `user_credit_usage` | ✅ | creditService |
| `credit_transactions` | ✅ | creditService, taskHelper |
| `user_diagnostic_cache` | ✅ | refresh-diagnostic (scrittura), assistant-chat (lettura) |
| `user_game_analysis` | ✅ | extract-game-analysis, refresh-diagnostic (diagnosticBuilder) |
| `playing_styles` | ✅ | catalogo; players.playing_style_id FK |
| `player_performance_aggregates` | ✅ | trigger/aggregati da partite |

**Esito**: Tutte le tabelle public hanno RLS abilitato. Nessuna tabella usata dal codice risulta mancante in DB; schema allineato alle migration in `migrations/` (inclusa `create_user_diagnostic_cache`, `add_user_game_analysis_table`, `add_ai_info_columns_user_profiles`).

### 1.2 Migration applicate (Supabase) vs repo

Le migration elencate da Supabase includono le stesse presenti in `migrations/` (create_user_diagnostic_cache, add_user_game_analysis_table, add_ai_info_columns_user_profiles, backfill_players_playing_style_id_from_role, ecc.). **Coerente**.

### 1.3 Advisory sicurezza Supabase

- **Function search_path mutable**: diverse funzioni (update_*_updated_at, atomic_slot_assignment, calculate_profile_completion_score, cleanup_orphan_individual_instructions, set_initial_division) hanno `search_path` non impostato. **Raccomandazione**: impostare `search_path = 'public'` (o lo schema corretto) nelle funzioni. [Remediation](https://supabase.com/docs/guides/database/database-linter?lint=0011_function_search_path_mutable).
- **Leaked password protection disabled**: protezione password compromesse (HaveIBeenPwned) disabilitata. **Raccomandazione**: abilitare in Auth settings per maggiore sicurezza. [Remediation](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection).

---

## 2. Backend (API)

### 2.1 Auth

Tutte le route che accedono a dati per utente usano:

1. `extractBearerToken(req)`
2. `validateToken(token, supabaseUrl, anonKey)`
3. `userId = userData.user.id` (mai da body, tranne casi documentati sotto)

**Route controllate**: ai-knowledge, extract-game-analysis, assistant-chat, refresh-diagnostic, save-ai-info, save-player, save-match, update-match, save-profile, save-formation-layout, save-coach, set-active-coach, save-tactical-settings, save-opponent-formation, assign-player-to-slot, remove-player-from-slot, delete-player, delete-match, tasks/list, tasks/generate, credits/usage, credits/transactions, analyze-match, extract-*, generate-countermeasures, admin/recalculate-patterns.

### 2.2 Isolamento dati (user_id)

- **Regola**: tutte le query/insert/update su tabelle per utente usano `.eq('user_id', userId)` con `userId` da token.
- **Eccezione 1 – POST /api/credits/accredit**: accetta `body.user_id` (o `body.email`) perché chiamata dal **sito pagamenti** (webhook). Protetta da **CREDITS_ACCREDIT_API_KEY** (Bearer o X-Webhook-Secret). Solo con API key valida si può accreditare; `user_id` serve per identificare l’utente che ha acquistato. **OK** (endpoint amministrativo, non utente finale).
- **Eccezione 2 – POST /api/admin/recalculate-patterns**: accetta `body.user_id` opzionale; se fornito, viene verificato `requestedUserId === userId` (token). Se diverso → 403. **OK**.

### 2.3 Rate limit

Configurato in `lib/rateLimiter.js` per: `/api/assistant-chat`, `/api/refresh-diagnostic` (2/min), `/api/ai-knowledge`, `/api/extract-game-analysis`, ecc. Rate limiter in-memory: in produzione con più istanze considerare Redis (come da TODO in rateLimiter.js).

---

## 3. Frontend

### 3.1 Chiamate API

- Le chiamate alle API usano `Authorization: Bearer ${session.session.access_token}` (da `supabase.auth.getSession()`).
- Nessun `user_id` inviato nel body dalle pagine/componenti verso le API utente (salvo recalculate-patterns che invia il proprio userId per coerenza, e il webhook accredit che non è UI).

### 3.2 Variabili esposte

- Solo `NEXT_PUBLIC_*` sono usate in client (NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, NEXT_PUBLIC_APP_URL, NEXT_PUBLIC_APP_NAME). Nessuna chiave service role o OpenAI esposta in frontend.

---

## 4. Sicurezza (sintesi)

| Aspetto | Stato |
|---------|--------|
| Auth su API dati utente | ✅ Token Bearer, validateToken, userId da token |
| RLS su tabelle user | ✅ Abilitato su tutte le tabelle public rilevanti |
| body.user_id nelle API utente | ✅ Non usato (solo accredit webhook + recalculate-patterns con check 403) |
| Input: save-ai-info | ✅ Whitelist campi e valori; MAX_TEXT, MAX_NOTES |
| Input: extract-game-analysis | ✅ Validazione immagini (max 2, max 10MB), array base64 |
| Input: assistant-chat | ✅ MAX_MESSAGE_LENGTH, MAX_HISTORY_*, sanitize/normalize |
| diagnosticBuilder | ✅ sanitizeForPrompt su testi da DB |
| Env: service role / OpenAI | ✅ Solo server-side, non in NEXT_PUBLIC_* |
| Advisory DB | ⚠️ search_path su funzioni; leaked password protection disabilitata (vedi §1.3) |

---

## 5. Traduzioni (i18n)

### 5.1 Struttura

- Un solo blocco `translations = { it: { ... }, en: { ... } }` in `lib/i18n.js`.
- Chiavi usate nei componenti (AIKnowledgeBar, AiInfoModal, GameAnalysisModal, AssistantChat, TaskWidget, TacticalSettingsPanel, PositionSelectionModal, MissingDataModal, GuideTour, ConfirmModal, CreditsBar) sono definite sia in `it` che in `en`.

### 5.2 Chiavi verificate (campione)

- Barra Conoscenza: `aiKnowledge`, `aiKnowledgeDescription*`, `aiKnowledgeProfile/Roster/Matches/Patterns/Coach/Usage/Success`, `viewDetails`, `goalsContributeToBar`, `completeProfileToIncreaseKnowledge`, `ctaNextStep*`, `aiKnowledgePatternsHint`, `aiKnowledgeSuccessHint` → presenti IT e EN.
- Task: `goalCompletedFeedback`, `goalsIncreaseKnowledge`, `noGoalsThisWeek`, `goalsWillBeGenerated`, `goalDifficultyEasy/Medium/Hard`, `goalCompleted`, `goalFailed`, `weeklyGoals`, `failedToFetchTasks`, `notAuthenticated`, `errorLoadingTasks` → presenti IT e EN.
- Chat: `openAssistant`, `yourCoach`, `closeAssistant`, `typeMessage`, `sendMessage` → presenti IT e EN.
- Altri: `aiInfo*`, `gameAnalysis*`, `credits*`, `tacticalSettings`, `tour*`, `confirmAction`, `cancel`, `confirm`, `saving`, `save`, `loading`, `close`, `sessionExpired`, `error` → presenti in entrambe le lingue.

### 5.3 CTA dinamica barra

- `getNextStepCtaKey()` restituisce chiavi: `ctaNextStepProfile`, `ctaNextStepRoster`, `ctaNextStepMatches`, `ctaNextStepPattern`, `ctaNextStepCoach`, `ctaNextStepUsage`, `ctaNextStepSuccess`, `completeProfileToIncreaseKnowledge`. Tutte definite in IT e EN.

### 5.4 Coerenza testi

- Fallback in componente: molti `t('key') || 'Testo italiano'` sono ridondanti se la chiave esiste sempre; utile per evitare UI vuota in caso di chiave mancante. Nessuna chiave usata risulta mancante in `en`.

**Esito**: Traduzioni coerenti e complete per le funzionalità verificate. Nessuna chiave solo IT o solo EN rilevata.

---

## 6. Riepilogo esito

| Area | Esito | Note |
|------|--------|------|
| Supabase tabelle / RLS / migration | ✅ | Allineato; RLS attivo ovunque |
| Backend auth e isolamento userId | ✅ | Token e filtro user_id; eccezioni documentate e protette |
| Rate limit | ✅ | Configurato; in prod valutare Redis |
| Frontend token e env | ✅ | Bearer da sessione; nessun secret in NEXT_PUBLIC_* |
| Sicurezza input e prompt | ✅ | Whitelist/limiti/sanitize dove previsto |
| Advisory Supabase | ⚠️ | search_path funzioni; leaked password protection |
| Traduzioni IT/EN | ✅ | Chiavi usate presenti in entrambe le lingue |

**Conclusione**: Coerenza Supabase, frontend, backend e sicurezza **positiva**. Traduzioni allineate. Unici miglioramenti raccomandati: impostare `search_path` sulle funzioni DB e abilitare la protezione password compromesse in Auth (Supabase Dashboard).
