# Audit: Task (Obiettivi settimanali) – Vista cliente, salvataggio, route Supabase

**Data audit:** Febbraio 2026  
**Scope:** Come i task sono visti dal cliente, dove sono salvati, quali route/API e tabelle Supabase sono coinvolte. Verifica coerenza end-to-end.

---

## 1. Vista cliente (dove e cosa vede)

| Elemento | Dettaglio |
|----------|-----------|
| **Componente** | `TaskWidget` (`components/TaskWidget.jsx`) |
| **Dove appare** | Solo in **Dashboard** (`app/page.jsx`), sotto hero / sopra contenuto principale |
| **Fonte dati** | `GET /api/tasks/list?lang=it|en` con header `Authorization: Bearer <token>` |
| **Quando carica** | Al mount del widget; poi di nuovo dopo evento `match-saved` (con delay 1,5 s) |

**Cosa vede il cliente:**
- Titolo: "Obiettivi Settimanali" / "Weekly Goals" (i18n)
- Sottotitolo: "Completare gli obiettivi aumenta la conoscenza che l'IA ha di te"
- Per ogni task: **goal_description**, **current_value / target_value**, barra di progresso, **status** (active / completed / failed), **difficulty** (easy / medium / hard), **completed_at** (se completed)
- Toast al completamento: "Obiettivo completato! Contribuisce alla barra Conoscenza IA."
- Nessun selettore settimana: viene sempre mostrata la **settimana corrente** (lun–dom)

**Traduzioni (i18n):**  
Chiavi usate: `weeklyGoals`, `noGoalsThisWeek`, `goalsWillBeGenerated`, `goalCompleted`, `goalCompletedFeedback`, `goalFailed`, `goalsIncreaseKnowledge`, `goalDifficultyEasy/Medium/Hard`, `active`, `failedToFetchTasks`, `errorLoadingTasks`. Presenti in `lib/i18n.js` per `it` e `en`.

---

## 2. Dove vengono salvati i task

| Livello | Dettaglio |
|---------|-----------|
| **Tabella Supabase** | `public.weekly_goals` |
| **RLS** | Abilitato. Policy: SELECT/INSERT/UPDATE/DELETE solo dove `auth.uid() = user_id` |
| **Colonne** | `id`, `user_id`, `goal_type`, `goal_description`, `target_value`, `current_value`, `difficulty`, `week_start_date`, `week_end_date`, `status`, `completed_at`, `created_at`, `updated_at`, `created_by` |
| **Constraint** | `goal_type` IN (reduce_goals_conceded, increase_wins, improve_possession, use_recommended_formation, complete_matches, improve_defense, use_ai_recommendations, custom); `status` IN (active, completed, failed); `difficulty` IN (easy, medium, hard) |
| **Indici** | `idx_weekly_goals_user_week`, `idx_weekly_goals_status`, `idx_weekly_goals_active` (WHERE status = 'active') |

**Chi scrive in `weekly_goals`:**
- **INSERT:** solo da backend, tramite `lib/taskHelper.js` → `generateWeeklyTasksForUser()` che usa **Supabase Service Role** (admin client). Il cliente non inserisce mai task direttamente.
- **UPDATE:** solo da backend, in `updateTasksProgressAfterMatch()` (stesso helper), sempre con Service Role. Aggiorna `current_value`, `updated_at` e, al raggiungimento target, `status = 'completed'` e `completed_at`.

**Non esistono** route tipo `/api/supabase/save-task` o `/api/supabase/update-task`: lettura/scrittura task passano da API Next.js e da taskHelper con service key.

---

## 3. Route API coinvolte

| Route | Metodo | Scopo | Supabase |
|-------|--------|--------|----------|
| **/api/tasks/list** | GET | Restituisce task della settimana (default: corrente). Auto-genera task se settimana corrente vuota. | Lettura `weekly_goals` con **token utente** (RLS). In auto-generazione: scrittura con **service role** in taskHelper, poi eventuale fallback lettura con admin se RLS non restituisce i nuovi record |
| **/api/tasks/generate** | POST | Generazione manuale task per una settimana (body opzionale: `week_start_date`). Usato per test/manuale. | Scrittura `weekly_goals` solo tramite taskHelper con **service role** |

**Autenticazione:** entrambe le route richiedono Bearer token; `validateToken` + `userData.user.id` per identificare l’utente.

**Rate limit:**  
- `list`: `RATE_LIMIT_CONFIG['/api/tasks/list']` (60 req/min). Uso diretto di `rateLimitConfig.maxRequests` / `rateLimitConfig.windowMs` **senza** fallback `?.` / `??`: se la chiave viene rimossa, la route va in errore (vedi COSE_DA_FARE.md).  
- `generate`: `checkRateLimit(user_id, '/api/tasks/generate')` con default interni (5 req/min da config).

---

## 4. Coerenza dati: UI ↔ DB ↔ API

| Aspetto | Stato | Note |
|---------|--------|------|
| **Campi widget ↔ tabella** | ✅ | Il widget usa `id`, `goal_description`, `target_value`, `current_value`, `status`, `difficulty`, `completed_at`. Tutti presenti in `weekly_goals` e restituiti da `tasks/list` con `select('*')`. |
| **Validazione lato client** | ✅ | TaskWidget filtra task con `id`, `goal_description`, `target_value > 0`, `current_value === null \|\| current_value >= 0`. Task malformati non vengono mostrati. |
| **Settimana mostrata** | ✅ | Il client **non** invia `week_start_date`; la list usa `getCurrentWeek().start` (o query param se presente). Il cliente vede sempre la settimana corrente, coerente con "Obiettivi Settimanali". |
| **Task nascosti (use_recommended_formation)** | ✅ | In `tasks/list` i task con `goal_type === 'use_recommended_formation'` sono esclusi dalla risposta (`visibleTasks`). Coerente con AUDIT_ENTERPRISE_TASK_FONTI_VERITA: non si mostrano obiettivi basati solo su dato autodichiarato. |
| **Aggiornamento progresso** | ✅ | Dopo salvataggio partita: `POST /api/supabase/save-match` → in background chiama `updateTasksProgressAfterMatch(userId, ..., savedMatch)`. Il client riceve la risposta del save, poi da `match/new` viene emesso `match-saved`; TaskWidget (e AIKnowledgeBar) ascoltano e aggiornano. |
| **Lingua generazione** | ⚠️ | `tasks/list` quando auto-genera passa `lang` a `generateWeeklyTasksForUser`. `tasks/generate` **non** accetta `lang` nel body e usa default `'it'`. Coerenza parziale: generazione manuale sempre in italiano. |

---

## 5. Flusso end-to-end (riepilogo)

1. **Dashboard:** utente apre la app → viene renderizzato TaskWidget → `GET /api/tasks/list?lang=...` con Bearer → API valida token, opzionalmente auto-genera per settimana corrente → risposta `{ success, tasks, week_start_date, count }` → widget mostra lista (e eventuale toast al completamento dopo refetch).
2. **Dopo una partita:** utente salva partita da `match/new` → `POST /api/supabase/save-match` → match salvato in `matches` → in background: pattern tattici, poi `updateAIKnowledgeScore`, poi `updateTasksProgressAfterMatch` (aggiorna `weekly_goals.current_value` e status) → response 200 → client emette `match-saved` → TaskWidget (dopo 1,5 s) richiama `GET /api/tasks/list` e aggiorna la lista.
3. **Barra Conoscenza:** i task completati pesano nel calcolo AI Knowledge (`lib/aiKnowledgeHelper.js`: conta `weekly_goals` con `status = 'completed'`). Dopo match-saved anche la barra si aggiorna (evento condiviso).

---

## 6. Dipendenze Supabase e tabelle correlate

| Tabella / concetto | Uso per i task |
|--------------------|-----------------|
| **weekly_goals** | Unica tabella di persistenza dei task. |
| **matches** | Usata da `updateTasksProgressAfterMatch` e da `generateWeeklyTasksForUser` (conteggi vittorie, partite complete, possesso, gol subiti, formazione difensiva, `recommended_formation_used`). |
| **credit_transactions** | Per `goal_type = 'use_ai_recommendations'`: conta transazioni `type = 'usage'` con `description` in whitelist (assistant-chat, analyze-match, ecc.) nella finestra della settimana del task. |
| **user_profiles** | Per generazione task personalizzati (es. `common_problems` → "Migliora difesa"). |
| **team_tactical_patterns** | Usata in generazione (analisi pattern). |

---

## 7. Punti di attenzione e raccomandazioni

| Punto | Priorità | Azione suggerita |
|-------|----------|-------------------|
| **tasks/list** usa `rateLimitConfig.maxRequests` senza fallback | Bassa | Usare `rateLimitConfig?.maxRequests ?? 60` (e analogo per `windowMs`) come in COSE_DA_FARE.md. |
| **tasks/generate** non riceve `lang` | Bassa | Se si vuole generazione manuale in lingua utente, accettare `lang` nel body e passarlo a `generateWeeklyTasksForUser`. |
| **RLS dopo auto-generazione** | Info | Se la prima SELECT con token utente non restituisce i task appena inseriti (race/cache), la list usa già un fallback con admin e restituisce comunque i task. Comportamento accettabile. |
| **Evento match-saved** | ✅ | Emesso solo da `match/new` dopo save partita. TaskWidget e AIKnowledgeBar sono allineati. |

---

## 8. Conclusioni

- **Vista cliente:** coerente con il modello dati; traduzioni e messaggi (incluso toast completamento) allineati a i18n.
- **Salvataggio:** tutti i task vivono in `weekly_goals`; nessuna route Supabase diretta per task; scritture solo da backend con service role.
- **Route:** solo `GET /api/tasks/list` e `POST /api/tasks/generate`; autenticazione e rate limit presenti; unica incoerenza minore: `lang` non passato in generate.
- **Aggiornamento progresso:** correttamente agganciato a `save-match` e evento `match-saved`; nessuna doppia scrittura da client.
- **Sicurezza:** RLS su `weekly_goals`; il cliente legge solo i propri task; scrittura solo server-side con service key.

Audit completato; nessuna incoerenza bloccante tra vista cliente, salvataggio e route Supabase per i task.
