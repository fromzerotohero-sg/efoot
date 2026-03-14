# ODIT CODEX � Audit Enterprise Completo

**Ambito:** logica, flussi, scalabilit�, ridondanze, refusi, codice morto, pulizia, sicurezza, coerenza doc/codice.
**Stato:** audit completo (tutti i file). **Interventi in corso - vedi sezione 2 per stato.**

---

## 0) Stato interventi

**Legenda:**
- ✅ = Corretto e testato
- 🔄 = In corso / parziale
- ⏳ = Da fare

**Ultimo aggiornamento:** 2026-02-09

### Interventi completati (P0-P3)
| # | Punto | File | Stato |
|---|-------|------|-------|
| 1 | Rate limit `/api/extract-player` | `app/api/extract-player/route.js` | ✅ |
| 2 | Log PII rimossi in produzione | `save-player`, `save-coach`, `save-match`, `set-active-coach` | ✅ |
| 3 | Crediti: somma invece di sovrascrittura | `lib/creditService.js` | ✅ |
| 4 | AI Knowledge usa `overall_rating` | `lib/aiKnowledgeHelper.js` | ✅ |
| 5 | Rate limit endpoint Supabase | `save-profile`, `save-coach`, `set-active-coach` | 🔁 |
| 6 | JSON error handling (400 vs 500) | `save-profile`, `save-coach`, `set-active-coach`, `extract-player` | ✅ |
| 7 | 401 "Invalid or expired authentication" (token scaduto) | `lib/supabaseClient.js` (`getValidAccessToken`), CreditsBar, page.jsx, gestione-profilo | ✅ |
| 8 | CreditsBar fetch senza abort (setState su unmount) | `components/CreditsBar.jsx` | ✅ |
| 9 | Chiavi i18n mancanti (sez. 8.1) | `lib/i18n.js` (IT/EN) | ✅ |
| 10 | Allenatori: card chiusa e aperta rispettano lingua (IT/EN) | `lib/i18n.js`, `app/allenatori/page.jsx` | ✅ |
| 11 | Rate limit endpoint Supabase (save-player, save-ai-info, save-formation-layout, save-opponent-formation, assign-player-to-slot, remove-player-from-slot) | `app/api/supabase/*`, `lib/rateLimiter.js` | ✅ |
| 12 | Fetch client con AbortController (AssistantChat, TaskWidget, AIKnowledgeBar) | `components/AssistantChat.jsx`, `components/TaskWidget.jsx`, `components/AIKnowledgeBar.jsx` | ✅ |

**Coerenza flussi (verifica 2026-02):** Rate limit e fetch abort applicati. **Task team1 (P2)** fix applicato 2026-02: `lib/taskHelper.js` ora considera `match.is_home` in `calculateAvgGoalsConceded` e in vittorie/sconfitte (`isWinForUser` / `isLossForUser`). **RLS weekly_goals** lasciato invariato; da valutare con migration/trigger e test dedicati.

---

## 1) Executive summary (non-tecnico)
- **Costo/abuso:** un endpoint OpenAI non ha rate limit ? rischio costi eccessivi.
- **Integrit� dati:** alcune metriche (task, AI knowledge) possono risultare sbagliate per assunzioni errate o campo sbagliato.
- **Sicurezza:** log con dati personali (user_id, nomi) in produzione.
- **Scalabilit�:** rate limiter in-memory non � affidabile su pi� istanze (serverless).

---

## 2) Priorit� interventi (P0 ? P3)

### P0 � Critici (costo/abuso)
1) ✅ **Rate limit mancante su `/api/extract-player`**
   - Rischio: abuso OpenAI e costi imprevedibili.
   - File: `app/api/extract-player/route.js`
   - **Fix applicato:** Aggiunto `checkRateLimit` (15 req/min) + JSON error handling

### P1 � Sicurezza / Integrit� dati
2) **RLS weekly_goals consente UPDATE da client**
   - Rischio: utente pu� falsare progressi obiettivi.
   - File: `migrations/create_weekly_goals_table.sql`
3) ✅ **Log PII in produzione** (user_id, player_name, coach_name)
   - File:
     - `app/api/supabase/save-player/route.js` ✅
     - `app/api/supabase/save-coach/route.js` ✅
     - `app/api/supabase/set-active-coach/route.js` ✅
     - `app/api/supabase/save-match/route.js` ✅
   - **Fix applicato:** Log condizionati a `NODE_ENV !== 'production'`
4) ✅ **Crediti: acquisti multipli nello stesso mese sovrascrivono**
   - Rischio: perdita crediti precedenti.
   - File: `lib/creditService.js`
   - **Fix applicato:** `credits_included` ora somma: `(existing.credits_included || 0) + amount`

### P2 � Stabilit� / Logica
5) ✅ **Task: risultati assumono sempre team1 = utente**
   - Rischio: progressi errati se utente � team2/away.
   - File: `lib/taskHelper.js`
   - Fix (2026-02): calculateAvgGoalsConceded e increase_wins usano match.is_home; isWinForUser/isLossForUser.
6) ✅ **AI Knowledge: usa `overall` invece di `overall_rating`**
   - Rischio: score sottostimato.
   - File: `lib/aiKnowledgeHelper.js`
   - **Fix applicato:** Cambiato `player.overall` → `player.overall_rating`
7) **OpenAI `response_format: { type: 'text' }` non standard**
   - Rischio: errori runtime.
   - File: `app/api/assistant-chat/route.js`
8) **Rate limiter in-memory**
   - Rischio: bypass su pi� istanze (Vercel).
   - File: `lib/rateLimiter.js`

**Nota stato Rate limit Supabase:**  
Coperti: `save-profile`, `save-coach`, `set-active-coach`, `save-match`, `update-match`, `save-tactical-settings`, `delete-player`, `delete-match`, **e da 2026-02:** `save-player`, `save-formation-layout`, `save-opponent-formation`, `assign-player-to-slot`, `remove-player-from-slot`, `save-ai-info` (intervento #11).

### P3 � Qualit� / Pulizia / Coerenza
9) **Prompt molto grande (system+capsule+RAG+contesto)**
   - Rischio: risposte troppo corte o troncate.
   - File: `app/api/assistant-chat/route.js`
10) **Output sanitizzato pu� troncare risposte**
   - Rischio: risposte incoerenti.
   - File: `app/api/assistant-chat/route.js`
11) **Duplica copy suggerimenti (frontend + backend)**
   - Rischio: disallineamento testo.
   - File: `components/AssistantChat.jsx`, `app/api/assistant-chat/route.js`
12) ✅ **Fetch client senza abort**
   - Rischio: setState su unmounted + leak minori.
   - File: `components/AssistantChat.jsx`, `components/TaskWidget.jsx`, `components/AIKnowledgeBar.jsx`
   - **Fix applicato (2026-02):** AbortController in tutti e tre; signal passato alle fetch; cleanup e gestione AbortError (intervento #12).
13) **README vs codice: rate limit dichiarato ma non presente per extract-player**
   - File: `README.md`
14) **Node engines `>=18` (Vercel warning)**
   - Rischio: upgrade involontari major.
   - File: `package.json`
15) **Legacy task `use_recommended_formation` ancora in schema**
   - Rischio: codice morto/legacy.
   - File: `migrations/create_weekly_goals_table.sql`, `lib/taskHelper.js`

---

## 3) Dettaglio per sezioni

### 3.1 Assistant Chat + RAG + Diagnostic
- **Rischi:** `response_format` non standard; sanitizzazione aggressiva; prompt lungo; RAG condizionato da classify; parsing suggerimenti fragile.
- **File:** `app/api/assistant-chat/route.js`, `lib/ragHelper.js`, `lib/diagnosticBuilder.js`

### 3.2 Task (API + helper)
- **Rischi:** team1 assumption; settimana con timezone (toISOString) pu� slittare; log verbosi in produzione.
- **File:** `app/api/tasks/list/route.js`, `lib/taskHelper.js`

### 3.3 Crediti & Pagamenti
- **Rischi:** acquisti multipli sovrascrivono `credits_included`; idempotenza per user solo; log PII in errori.
- **File:** `app/api/credits/*`, `lib/creditService.js`

### 3.4 AI Knowledge
- **Rischi:** score rosa incompleto (campo sbagliato); usage stimato; performance score basato su dati parziali.
- **File:** `lib/aiKnowledgeHelper.js`, `app/api/ai-knowledge/route.js`

### 3.5 Supabase API (save/update)
- **Rischi:** log PII; alcuni endpoint senza rate limit; selezioni `*` ampie.
- **File:** `app/api/supabase/*`

### 3.6 Estrazioni OpenAI
- **Rischi:** rate limit assente su extract-player; hard-code modello; limiti dimensione immagine non uniformi.
- **File:** `app/api/extract-*.js`

### 3.7 Frontend
- **Rischi:** fetch senza abort; log client; duplicazione copy; retry senza backoff globale.
- **File:** `components/*`, `app/*`

### 3.8 Migrations / RLS
- **Rischi:** weekly_goals aggiornabile da client; legacy goal_type; policy ok su tabelle crediti.
- **File:** `migrations/*`

### 3.9 Config / Build / Docs
- **Rischi:** Node engines `>=18` (auto-upgrade); README inconsistente con rate limit; doc ridondanti.
- **File:** `package.json`, `README.md`, `docs/*`

---

## 4) Lista completa problemi (con file)
- ✅ Missing rate limit: `app/api/extract-player/route.js`
- ✅ PII logs: `app/api/supabase/save-player/route.js`, `app/api/supabase/save-coach/route.js`, `app/api/supabase/set-active-coach/route.js`, `app/api/supabase/save-match/route.js`
- RLS weekly_goals update: `migrations/create_weekly_goals_table.sql`
- ✅ Credits overwrite: `lib/creditService.js`
- Team1 assumption in tasks: `lib/taskHelper.js`
- AI Knowledge uses wrong field: `lib/aiKnowledgeHelper.js`
- response_format non standard: `app/api/assistant-chat/route.js`
- in-memory rate limiter: `lib/rateLimiter.js`
- Prompt length + sanitization: `app/api/assistant-chat/route.js`
- Duplicated suggestions: `components/AssistantChat.jsx`, `app/api/assistant-chat/route.js`
- Client fetch without abort: `components/AssistantChat.jsx`, `components/TaskWidget.jsx`, `components/AIKnowledgeBar.jsx`
- README mismatch: `README.md`
- Node engines warning: `package.json`
- Legacy task type: `migrations/create_weekly_goals_table.sql`, `lib/taskHelper.js`

---

## 5) Interventi consigliati (ordine operativo)
1) Mettere rate limit su `/api/extract-player` (coerente con altri endpoint OpenAI).
2) Rimuovere/limitare log PII in produzione (condizionarli a `NODE_ENV !== 'production'`).
3) Fix crediti: sommare `credits_included` su acquisti multipli nello stesso periodo.
4) Fix task: determinare lato utente (home/away) per risultati X-Y.
5) Fix AI Knowledge: usare `overall_rating`.
6) Rivedere `response_format` e gestione prompt size.
7) Stabilizzare rate limiter (Redis/DB).
8) Pulizia legacy: goal_type non pi� usato, duplicazioni copy.

---

## 6) Note finali
Questo documento � il riferimento unico per il piano interventi. Tutti i punti sopra sono stati rilevati nel codice attuale.


---

## 7) UX / UI / Disallineamenti (enterprise)

### 7.1 Disallineamenti copy/behaviour
- **TaskWidget dice �generati ogni domenica� ma in realt� i task si generano quando si apre la lista nella settimana corrente** (auto-gen on-demand). Disallineamento UX.
  - UI: `components/TaskWidget.jsx`
  - Logica: `app/api/tasks/list/route.js`

- **Suggerimenti duplicati frontend/back-end**: la stessa lista � hardcoded in `components/AssistantChat.jsx` e `app/api/assistant-chat/route.js` ? rischio testo incoerente nel tempo.

### 7.2 Encoding/UI refusi visivi
- **Caratteri mojibake/emoji corrotte** nel dettaglio partita (`match/[id]`) ? icone/etichette appaiono rotte (es. `⭐`, `📊`). Problema UX evidente.
  - File: `app/match/[id]/page.jsx`

### 7.3 Feedback e resilienza UX
- **Fetch client senza abort**: possibili setState su unmounted, soprattutto su dashboard, chat, task, AIKnowledge. Rischio UX instabile su navigazione rapida.
  - File: `components/AssistantChat.jsx`, `components/TaskWidget.jsx`, `components/AIKnowledgeBar.jsx`, `app/page.jsx`, `app/gestione-formazione/page.jsx`

- **Log client in produzione**: rumore console e possibili leak di stato utente (user_id nei log dashboard). 
  - File: `app/page.jsx`, `components/TaskWidget.jsx`, `components/AIKnowledgeBar.jsx`

- **Dashboard calcolo pattern �admin� senza feedback UI**: se fallisce, l�utente non vede motivo n� alternative (solo log). UX povera.
  - File: `app/page.jsx` + endpoint `app/api/admin/recalculate-patterns/route.js`

### 7.4 Accessibilit�
- **Molte aree cliccabili senza `aria` o `role` esplicito** (bottoni div cliccabili, header espandibili). Gap accessibilit� enterprise.
  - Esempio: `components/TaskWidget.jsx` header cliccabile

---

## 8) Traduzioni / i18n (copertura chiavi)

### 8.1 Chiavi usate ma mancanti in `lib/i18n.js` ✅ (2026-02)
Queste chiavi sono invocate da `t('...')` ma non risultavano definite nelle mappe i18n. **Fix (2026-02):** aggiunte in `lib/i18n.js` per IT e EN.

- **coach** — `app/contromisure-live/page.jsx` ✅
- **confirmAction** — `components/ConfirmModal.jsx` ✅
- **confirmDeletePlayer** — `app/gestione-formazione/page.jsx` ✅
- **confirmPositionChangeTitle** — `app/gestione-formazione/page.jsx` ✅
- **continue** — `app/gestione-formazione/page.jsx` ✅
- **delete** — `app/gestione-formazione/page.jsx`, `app/allenatori/page.jsx` ✅
- **deleteAndProceed** — `app/gestione-formazione/page.jsx` ✅
- **duplicateReserveTitle** — `app/gestione-formazione/page.jsx` ✅
- **historicalInsights** — `app/match/[id]/page.jsx` ✅
- **noPhotosSelected** — `app/gestione-formazione/page.jsx` ✅
- **photoSelected** / **photosSelected** — `app/gestione-formazione/page.jsx` ✅
- **playerName** — `app/gestione-formazione/page.jsx` ✅
- **replace** — `app/gestione-formazione/page.jsx` ✅
- **selectFormation** — `app/gestione-formazione/page.jsx` ✅
- **strengths** / **weaknesses** — `app/match/[id]/page.jsx` ✅

**Allenatori (2026-02):** Pagina Allenatori allineata a i18n: card chiusa (lista) e card aperta (modale) usano `t()` per titoli, pulsanti, sezioni e stili di gioco. Aggiunte in `lib/i18n.js` (IT) chiavi: coachesTitle, uploadCoach, noCoachesLoaded, activeCoach, activeCoachInfo, viewCoachDetails, setAsTitular, informations, playingStyleCompetence, trainingAffinity, statBoosters, connection, focalPoint, keyMan, counter_attack, wide, ball_possession, long_ball, quick_counter, finishing, defensive_behavior. EN già presente; stat_boosters in modale usano `t(booster.stat_name)`.

### 8.2 Impatto UX
- **Lingua EN incompleta**: molte stringhe restano in IT perch� esiste fallback locale nel JSX.
- **Incoerenza UI**: alcuni modali e CTA hanno label hardcoded, altri tradotti; con le chiavi 8.1 le label principali usano i18n.

---

## 9) Coerenza flussi / stabilita' operativa

### 9.1 Side-effect su GET (task)
- **`GET /api/tasks/list` genera task e aggiorna progressi** se settimana corrente ? richiesta GET con effetti collaterali (non idempotente) e potenziali duplicazioni/concorrenza in caso di refresh multipli.
  - File: `app/api/tasks/list/route.js`, `lib/taskHelper.js`

### 9.2 Rate limit incoerente su endpoint mutanti
- **Molti endpoint di salvataggio non hanno rate limit**, mentre altri simili lo hanno. Questo crea buchi di abuso e carico (specie su Vercel).
  - Esempi senza rate limit:  
    `app/api/supabase/save-profile/route.js`, `app/api/supabase/save-player/route.js`, `app/api/supabase/save-coach/route.js`,  
    `app/api/supabase/save-formation-layout/route.js`, `app/api/supabase/save-opponent-formation/route.js`,  
    `app/api/supabase/assign-player-to-slot/route.js`, `app/api/supabase/remove-player-from-slot/route.js`,  
    `app/api/supabase/set-active-coach/route.js`, `app/api/supabase/save-ai-info/route.js`

- **Altri endpoint senza rate limit** (anche se alcuni sono �read�, restano esposti ad abuso e costi log):
  - `app/api/extract-player/route.js` (OpenAI, costo diretto)
  - `app/api/admin/recalculate-patterns/route.js` (operazione pesante)
  - `app/api/credits/usage/route.js`, `app/api/credits/transactions/route.js` (potenziale scraping)
  - `app/api/credits/accredit/route.js` (webhook esterno: meglio limitare/limitare per IP)

### 9.3 Aggiornamenti asincroni non confermati
- **Calcolo pattern tattici avviato in background senza await**: se fallisce non c'e' retry/consistenza garantita, e lo stato puo' restare stale rispetto a match salvati/aggiornati.
  - File: `app/api/supabase/save-match/route.js`, `app/api/supabase/update-match/route.js`

### 9.4 Logging eccessivo in produzione
- **Log molto verbosi** in API critiche (task, match update, generate countermeasures, assistant). In produzione crea rumore, costi log e possibili leak di dati.
  - File: `app/api/tasks/list/route.js`, `app/api/supabase/update-match/route.js`, `app/api/generate-countermeasures/route.js`, `app/api/assistant-chat/route.js`

---

## 10) Encoding / compatibilita' build

### 10.1 Mojibake e file con encoding incoerente
- **Caratteri corrotti** in doc e commenti (es. �→�, �è�) indicano file non salvati in UTF-8.
  - File: `docs/COERENZA_SAVE_TACTICAL_SETTINGS.md`, `docs/COERENZA_TASK_DATI_CLIENTE.md`, `app/api/tasks/generate/route.js`
- **Rischio build**: Vercel puo' fallire con �stream did not contain valid UTF-8� se un file non e' UTF-8 (gia' successo su `app/api/assistant-chat/route.js` in build log).

---

## 11) TODO tecnici rimasti nel codice
- **Helper mancante per performance giocatori**: TODO esplicito, funzionalita' lasciata in sospeso.
  - File: `app/api/supabase/save-match/route.js`, `app/api/supabase/update-match/route.js`

---

## 12) Error handling / validazione input

### 12.1 JSON non valido = 500 (non 400)
Molte route fanno `await req.json()` dentro un `try` generale senza catch specifico: JSON malformato genera 500 e non 400. In produzione questo e' incoerente con altri endpoint che rispondono 400.
- Esempi:  
  `app/api/supabase/save-player/route.js`, `app/api/supabase/save-coach/route.js`, `app/api/supabase/save-profile/route.js`,  
  `app/api/supabase/save-formation-layout/route.js`, `app/api/supabase/save-opponent-formation/route.js`,  
  `app/api/supabase/assign-player-to-slot/route.js`, `app/api/supabase/remove-player-from-slot/route.js`,  
  `app/api/supabase/set-active-coach/route.js`, `app/api/supabase/save-tactical-settings/route.js`

### 12.2 Errori Supabase ritornati "raw"
In molte route si ritorna `error.message` direttamente al client (es. update/insert). Questo espone dettagli interni (schema, constraint).
- Esempi: `app/api/supabase/save-player/route.js`, `app/api/supabase/save-coach/route.js`, `app/api/supabase/save-match/route.js`

---

## 13) Limiti payload incoerenti (UX + stabilita')

- **Limiti immagini diversi**: alcuni endpoint accettano 10MB, altri 5MB. L'utente non ha feedback unico e i flussi non sono coerenti.
  - 10MB: `app/api/extract-player/route.js`, `app/api/extract-formation/route.js`, `app/api/extract-match-data/route.js`, `app/api/extract-game-analysis/route.js`, `app/api/extract-coach/route.js`
  - 5MB: `app/api/supabase/save-match/route.js`

- **Limiti JSONB rimossi con assunzione** (�Supabase gestisce automaticamente�) senza controllo lato API.
  - File: `app/api/supabase/save-player/route.js`
  - Rischio: upload grandi falliscono in DB con errori non gestiti e UX confusa.

---

## 14) Infra-as-code / RLS drift

- **Policy RLS non versionate in repo**: nelle migration non risultano definizioni policy per la maggior parte delle tabelle (tranne `weekly_goals`).  
  Se le policy sono state create via dashboard, c'e' rischio drift tra ambienti (dev/stage/prod) e assenza di tracciamento.
  - Indizio: migrazioni con poche/nessuna `CREATE POLICY` oltre a `weekly_goals`.

---

## 15) Gap design ? implementazione (Classifica mensile)

### 15.1 Feature non implementata
Il documento `docs/DESIGN_CLASSIFICA_MENSILE_E_PREMI.md` definisce API, tabelle e flussi (leaderboard, snapshots, consenso) ma **non esiste alcuna implementazione** nel codice.
- Manca `GET /api/leaderboard` e storage `leaderboard_snapshots`.
- Manca gestione `leaderboard_consent` in profilo.
- Manca job/cron per assegnazione premi.

### 15.2 Rischio su premi crediti
Il design suggerisce di usare `accreditPurchase` per premi in classifica, ma l'implementazione attuale **sovrascrive** `credits_included` nel periodo (non somma).  
Questo puo' cancellare crediti pre-esistenti dell'utente se ha gia' acquistato.
- File: `lib/creditService.js`

### 15.3 Privacy e compliance non tracciate
Il design richiede consenso esplicito per rendere pubblica la posizione/nickname. Non c'e' schema o UI per raccogliere/registrare il consenso.  
Rischio privacy e compliance se la feature viene esposta senza opt-in.

---

## 16) Codice/commenti inutili o ridondanti

### 16.1 Log/console eccessivi (rumore in produzione)
Molti `console.log`/`console.warn` sono rumorosi e non controllati da `NODE_ENV`. In produzione creano costi log e possibili leak di contesto.
- **Backend**: `lib/taskHelper.js`, `lib/openaiHelper.js`, `lib/ragHelper.js`, `app/api/tasks/list/route.js`, `app/api/generate-countermeasures/route.js`,  
  `app/api/supabase/save-match/route.js`, `app/api/supabase/update-match/route.js`, `app/api/supabase/save-player/route.js`, `app/api/supabase/save-coach/route.js`
- **Frontend**: `components/TaskWidget.jsx`, `components/AIKnowledgeBar.jsx`, `app/page.jsx`, `app/match/new/page.jsx`, `app/gestione-formazione/page.jsx`

### 16.2 Commenti �FIX� storici non piu' necessari
Commenti tipo �FIX: ...� o �? FIX: ...� sono storici e non aggiungono contesto operativo oggi.  
Rischio: codice percepito instabile e rumore nel mantenimento.
- Esempi:  
  `app/gestione-formazione/page.jsx` (molti `// FIX RC-002`),  
  `app/api/analyze-match/route.js` (serie di `// ? FIX`),  
  `app/api/supabase/save-player/route.js` (FIX su merge/overall),  
  `app/api/supabase/save-match/route.js`, `app/api/supabase/update-match/route.js`

### 16.3 TODO rimasti (codice morto potenziale)
- `lib/rateLimiter.js`: TODO Redis/DB in produzione.
- `app/api/supabase/save-match/route.js`, `app/api/supabase/update-match/route.js`: TODO `playerPerformanceHelper` non implementato.

### 16.4 Docs ridondanti
Molti file in `docs/` ripetono concetti gia' presenti (audit, coerenza, sicurezza).  
Rischio: disallineamento tra documenti e perdita di �single source of truth�.

### 16.5 Componenti non usati
- **`LanguageProviderWrapper` non importato da nessuna parte**: presente solo in definizione.  
  File: `components/LanguageProviderWrapper.jsx`

---

## 17) Gestione rosa (audit mirato)

### 17.1 Semantica dati �original_positions� alterata
Quando l�utente salva posizioni personalizzate fuori ruolo, il client **aggiorna `original_positions`** aggiungendo il nuovo ruolo con competenza �Intermedia�.  
Questo trasforma un dato �da card� in un dato �modificato dall�utente�, creando drift semantico.
- File: `app/gestione-formazione/page.jsx`

---

## 18) Allenatori / Match / Contromisure (audit mirato)

### 18.1 Allenatori (app/allenatori)
- **Upload senza limite dimensione file lato UI**: valida solo tipo immagine, non size (a differenza di altri flussi). UX incoerente e rischio upload troppo pesante.
- **`select('*')` senza paginazione** su `coaches`: payload cresce con storico coach.
- **Azioni con `window.location.reload()`** dopo save/delete/set-active ? UX brusca e perdita stato.
- **Parsing JSON non protetto** su `extract-coach`: `await extractRes.json()` senza try/catch ? errore non gestito se response non-JSON.

### 18.2 Match new (app/match/new)
- **Persistenza localStorage con base64**: `stepImages` (dataUrl) viene salvato in localStorage ? rischio superare limite storage e fallire silenziosamente (gi� catch, ma UX perde salvataggi).
- **Emoji/icone mojibake** nei label degli step e pulsanti (�??�, �?�, ecc. corrotti) ? refuso visivo/encoding.
- **Salvataggio condizionato su `Object.keys(stepData).length === STEPS.length`**: se `stepData` include chiavi extra (es. `result`), la condizione non scatta ? pulsante �Salva� pu� non apparire se non sei all�ultimo step. UX incoerente.

### 18.3 Match detail (app/match/[id])
- **Mojibake gi� presente** (icone/emoji corrotte) ? UX degradata. (Gi� segnalato in �7.2, qui ribadito per match flow.)

### 18.4 Contromisure live (app/contromisure-live)
- **Nessun limite di dimensione lato UI oltre 10MB** ok, ma non c�� feedback per formati non supportati oltre �non immagine�.
- **Nessun cleanup delle formazioni avversarie salvate**: ogni estrazione salva una riga nuova (`save-opponent-formation`) senza politiche di pulizia ? crescita DB nel tempo.
- **Nessun abort su fetch** (estrazione/generazione): se l�utente cambia pagina, possibile setState su unmounted.

---

## 19) Leaderboard (classifica mensile)

### 19.1 Bug di sintassi bloccante
In `app/api/leaderboard/route.js` manca una graffa di chiusura dopo `if (snapshots?.length) { ... }` ? **errore di build**.
- **Verificato (2026-02):** nel codice attuale la sintassi è corretta; blocchi `if (snapshotsToUse?.length)` e `else` sono chiusi correttamente.

### 19.2 Side-effect su GET
`GET /api/leaderboard` calcola e **scrive snapshot** se mancanti. � un side-effect non idempotente su GET (pu� essere invocato da bot/crawler).

### 19.3 Timezone incoerente
`getCurrentMonth()` usa time locale, ma i bounds in `leaderboardHelper` sono UTC. Possibile mismatch in cambio mese.
- File: `app/api/leaderboard/route.js`, `lib/leaderboardHelper.js`

### 19.4 Consenso revocato non rispettato ✅
Se un utente revoca `leaderboard_consent` dopo il salvataggio snapshot, la classifica continua a mostrarlo perch� i snapshot non vengono filtrati per consenso.
- **Fix (2026-02):** in `app/api/leaderboard/route.js` i `rankings` sono costruiti solo da utenti con `leaderboard_consent = true` (query profili con `.eq('leaderboard_consent', true)` e filtro su `consentedIds`). Chi revoca non compare più; `currentUser` è allineato alla stessa lista filtrata. In `lib/leaderboardHelper.js` i punti sono salvati come intero (`Math.round`) in `saveLeaderboardSnapshot` per coerenza con la colonna `points` (integer) in DB.

### 19.5 Performance N^2
In `computeLeaderboardForMonth` viene usato `profiles.find(...)` per ogni utente (loop O(n^2)).  
Con molti utenti, peggiora in modo significativo. Serve mappa per nickname.

### 19.6 Error handling mancante ✅ (parziale: leaderboard route)
Le query Supabase non verificano `error` (snapshots, profiles, matches, goals, tx). In caso di errore restituisce liste vuote senza segnali.
- **Fix (2026-02):** in `app/api/leaderboard/route.js` sono verificati `snapError` e `profError`; in caso di errore l'API risponde con 500 e `_debug: { step, message }`. Le query in `computeLeaderboardForMonth` (leaderboardHelper) restano senza check error.

### 19.7 Encoding mojibake
Stringa `—` usata come default nickname: indica file non UTF-8.

### 19.8 Audit end-to-end Classifica (enterprise) – attiliomazzetti@gmail.com (2026-02-09)

**Obiettivo:** capire perché in dashboard la card Classifica mostra "From Zero to Hero" (currentUser null) pur avendo consenso e snapshot in DB.

**Stato Supabase (progetto `zliuuorrwdetylollrua`):**
- **auth.users:** utente presente, `id = 357c0b71-09fc-4aec-b0e6-7aac08107575`.
- **user_profiles:** `leaderboard_consent = true`, `nickname = 'Attilio'`.
- **leaderboard_snapshots:** 1 riga per `month = 2026-02`, stesso `user_id`, `rank = 1`, `points = 28`.
- **matches (feb 2026):** 1 partita `data_completeness = 'complete'` (soglia eleggibilità in `leaderboardHelper`: `MIN_MATCHES_ELIGIBILITY = 3`; al prossimo recompute da zero l’utente verrebbe escluso finché non ha ≥3 partite complete nel mese; lo snapshot attuale è stato scritto in precedenza, es. dopo save-profile).

**Flusso end-to-end:**
1. **Dashboard** (`app/page.jsx`): effect con deps `[loading, supabase]` chiama `getSession()` e poi `GET /api/leaderboard` con `Authorization: Bearer <token>`. Se `payload.rankings` è truthy, imposta `leaderboardData.currentUser = payload.currentUser`.
2. **API** (`app/api/leaderboard/route.js`): con token valido ricava `authUserId`; legge `leaderboard_snapshots` per il mese (service role, nessuna RLS su `leaderboard_snapshots`); se ci sono snapshot, costruisce `rankings` e per l’utente loggato cerca la riga in snapshot e imposta `currentUser`.
3. **Risultato atteso:** con snapshot presente per l’utente, l’API deve restituire `currentUser: { rank, points, pointsBreakdown }`.

**Cause probabili di currentUser null in UI:**
- **Timing:** l’effect leaderboard gira quando `loading` diventa false; `getSession()` potrebbe non essere ancora popolato (reidratazione da storage) e la richiesta parte senza token → API restituisce senza `currentUser`.
- **Env:** se l’app in produzione usa un altro progetto Supabase (env diversi), gli snapshot letti sarebbero quelli dell’altro progetto (eventualmente vuoti).

**Fix applicato (dashboard):**
- Fetch classifica effettuato **dentro `fetchData`** subito dopo aver ottenuto la session valida, usando lo stesso `session.session.access_token` già usato per le altre chiamate. Lo stato `leaderboardData` viene aggiornato con la risposta di `/api/leaderboard`. L’effect separato resta per refetch su evento `leaderboard-updated` e come fallback quando `loading` diventa false (es. se il fetch in fetchData fallisce).

**Fix 401 / token scaduto (2026-02):** Il client ora usa `getValidAccessToken()` (refreshSession + getSession) in `lib/supabaseClient.js` prima delle chiamate a `/api/credits/usage`, `/api/extract-game-analysis`, `/api/refresh-diagnostic` e in gestione-profilo; riduce gli errori 401 "Invalid or expired authentication" quando il JWT in cache è scaduto.

**Raccomandazioni:**
- Verificare che in produzione (Vercel) le variabili `NEXT_PUBLIC_SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY` puntino allo stesso progetto usato in sviluppo (dove è presente lo snapshot).
- Per evitare che un utente con consenso e snapshot venga rimosso al prossimo recompute: o eseguire il recompute solo quando l’utente ha ≥3 partite complete nel mese, o mantenere in snapshot gli utenti già presenti anche se sotto soglia (policy di business da definire). Vedi `lib/leaderboardHelper.js` `isEligibleForLeaderboard` e `MIN_MATCHES_ELIGIBILITY`.

### 19.9 ODIT flussi – Perché la classifica è ancora a 0 (attiliomazzetti@gmail.com)

**Stato verificato nel progetto Supabase `zliuuorrwdetylollrua` (stesso di `.env.local`):**
- **auth.users:** `attiliomazzetti@gmail.com` → `user_id = 357c0b71-09fc-4aec-b0e6-7aac08107575`.
- **user_profiles:** `leaderboard_consent = true`, `nickname = 'Attilio'`, `profile_completion_score = 100`.
- **leaderboard_snapshots (2026-02):** 3 righe; prima riga = questo utente, **rank 1, 28 punti**.
- **matches (feb 2026):** 1 partita `data_completeness = 'complete'`.

Quindi **nel DB collegato a questo progetto i dati sono corretti**: l'utente è in classifica con 28 punti.

**Flusso end-to-end (dove può rompersi):**

1. **Frontend (dashboard o pagina Classifica)**  
   Chiama `GET /api/leaderboard` con header `Authorization: Bearer <token>`. Se non c'è sessione, l'API non può associare `currentUser` ma può restituire `rankings`.

2. **API `/api/leaderboard`**  
   Legge `process.env.NEXT_PUBLIC_SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY` dall'**ambiente server** (dove gira Next.js: Vercel o `next dev`). Crea client admin con quella URL. Se **quel** progetto ha righe in `leaderboard_snapshots` per il mese → `rankings` e `currentUser` vengono compilati. Se **quel** progetto è diverso o vuoto → `rankings = []`, `currentUser = null` → in UI: classifica a 0.

3. **Conclusione:**  
   La classifica è ancora a 0 perché l'ambiente in cui giri l'app (o il deploy) **non** usa il progetto `zliuuorrwdetylollrua` dove i dati sono stati verificati. Es.: Vercel con env che puntano a un altro progetto; oppure locale senza `.env.local` corretto.

**Checklist:** (1) Dove vedi "classifica a 0"? (localhost / Vercel). (2) In quell'ambiente verificare che `NEXT_PUBLIC_SUPABASE_URL` sia `https://zliuuorrwdetylollrua.supabase.co` e che `SUPABASE_SERVICE_ROLE_KEY` sia dello stesso progetto. (3) Su Vercel: Settings → Environment Variables per Production/Preview.

**Riepilogo:** Non è un bug di logica. I dati per attiliomazzetti@gmail.com nel progetto corretto ci sono. Allineare le env al progetto `zliuuorrwdetylollrua` risolve.

### 19.10 Log Vercel e Supabase – dove controllare (2026-02-09)

**Log Vercel (nessun accesso da qui):**  
I log di Vercel si vedono solo dalla dashboard: **Vercel → progetto → Logs** (o **Deployments → [ultimo deploy] → Functions → View logs**). Cercare richieste a `/api/leaderboard`: se ci sono, controllare eventuali errori 500 o stack trace. Se non compaiono richieste a `/api/leaderboard`, il frontend potrebbe non chiamare l’endpoint (o chiamare un altro dominio).

**Log Supabase API (progetto `zliuuorrwdetylollrua`):**  
Supabase → Logs → API. Le chiamate alla classifica passano dalla **route Next.js** (`/api/leaderboard`), che usa il **client server** (service role) per leggere `leaderboard_snapshots` e `user_profiles`. Quindi da Supabase si vedono richieste **GET /rest/v1/leaderboard_snapshots** e **GET /rest/v1/user_profiles** con filtri, provenienti dagli IP del server Next (es. Vercel AWS).  
**Verifica 2026-02-09:** nelle ultime 24 ore **non** risulta alcuna richiesta a `leaderboard_snapshots` nei log API del progetto. Questo può significare: (1) l’app in uso non chiama `/api/leaderboard`, oppure (2) l’API leaderboard gira su un deploy (es. Vercel) che usa **un altro progetto Supabase** (le chiamate andrebbero quindi ai log dell’altro progetto).

**Route `app/api/leaderboard/route.js`:**  
- Controllo errori su snapshot e profili; 500 con `_debug` in caso di errore.  
- Se `rankings.length === 0` la risposta include `_debug`: `month`, `snapshotsFound`, `profilesWithConsent` (se applicabile), `supabaseProject`, `expectedProject: 'zliuuorrwdetylollrua'`.  
- Riferimento: `docs/CLASSIFICA_AUDIT.md`.

---

## 20) Classifica UI (app/classifica)

### 20.1 Mojibake/emoji corrotte
Icone nei podi e separatore �·� indicano encoding non UTF-8 nel file.
- File: `app/classifica/page.jsx`

### 20.2 i18n incoerente
`formatMonth()` forza locale `it-IT` anche quando lingua UI e' EN.  
Rischio: mese mostrato in italiano per utenti EN.
- File: `app/classifica/page.jsx`

### 20.3 Messaggi errore riusano chiave sbagliata ✅
Per leaderboard usa `t('errorLoadingUsage')` (chiave crediti/usage) ? copy errata.
- **Verificato (2026-02):** in `app/classifica/page.jsx` la pagina usa `t('errorLoadingLeaderboard')` (righe 34 e 49), non `errorLoadingUsage`. Corretto.

### 20.4 Evidenziazione �sei tu� non affidabile
`isYou` viene determinato da `rank` e `points` uguali a `currentUser`. Con parita' o duplicati puo' evidenziare l'utente sbagliato.
- File: `app/classifica/page.jsx`

### 20.5 Nessun abort su fetch ✅
Se l�utente cambia pagina durante `fetchLeaderboard`, possibile setState su unmounted.
- **Verificato (2026-02):** in `app/classifica/page.jsx` è usato `AbortController`; `fetchLeaderboard(ac.signal)` e cleanup `ac.abort()` nell'effect. Fetch con `signal` e check `signal?.aborted` prima di setState.

---

## 21) Gestione profilo (app/gestione-profilo)

### 21.1 Dipendenze API non garantite
La pagina chiama `/api/leaderboard/me` ma l�endpoint non risulta documentato negli audit precedenti; se assente -> 404 e UI parziale.

### 21.2 Tabelle non presenti in migration
Usa `user_prizes` via Supabase client, ma non ci sono migrazioni per questa tabella nel repo.  
Rischio: ambiente prod senza tabella o RLS corrette.

### 21.3 Stringhe hardcoded non i18n
Tipi premio mostrati con testo italiano hardcoded (�Coach gratuito�, �Crediti omaggio�, ecc.).  
Incoerenza per lingua EN.

### 21.4 CTA �vuote�
Pi� bottoni con `onClick={() => {}}` (Acquista, Vedi tutte transazioni, Personalizza avatar).  
UX: call-to-action senza azione.

### 21.5 Placeholder/mancanza dati
Campo �Membro dal� mostra sempre ��� (nessun dato caricato).  
Rischio: sezione inutile/confusa.

### 21.6 Nessun abort su fetch
Fetch paralleli (usage/transactions/leaderboard) senza abort ? possibile setState su unmounted.

### 21.7 Error handling parziale
`leaderboardRes.json()` e `leaderboardMeRes.json()` senza controllo `ok` o messaggio fallback ? errori silenziosi.

### 21.8 Encoding mojibake
Placeholder �—� e �° ·� in UI indicano file non UTF-8.

---

## 22) Impostazioni profilo / Login / Recovery / Guida

### 22.1 Impostazioni profilo (app/impostazioni-profilo)
- **`select('*')` su user_profiles**: payload completo senza projection; rischio dati inutili/esposti.
- **Stringhe hardcoded non i18n**: es. "Divisione attuale", placeholder "Il tuo nome".
- **Nessun abort su fetch**: `fetchProfile` e `handleSave` senza abort ? possibile setState su unmounted.
- **CTA �Completa profilo�** fa `handleSave` e redirect con timeout fisso (2s) senza attendere esito reale.

### 22.2 Login (app/login)
- **Anti-brute-force solo client-side** (cooldown locale). Non blocca tentativi server-side.
- **Nessun rate limit server** per auth (dipende da Supabase) ? ok, ma il client non informa bene se throttling remoto.
- **Redirect post-signup** immediato senza verificare email confirm.

### 22.3 Forgot/Reset password
- **Reset link**: gestione ok, ma `resetPasswordForEmail` non espone rate limit lato UI (anti-abuso assente).
- **Reset password**: timeout fisso 8s per sessione recovery pu� fallire in reti lente; UX �link scaduto� anche se valido.

### 22.4 Guida (app/guida)
- **`select('*')` su user_profiles** in client.
- **Copy duplicata in molte stringhe**: rischio disallineamento e traduzioni non complete.
- **Molto inline style** e logica UI complessa in singolo file ? manutenzione difficile.

---

## 23) Lib helpers / shared utilities

### 23.1 errorHelper non i18n
`lib/errorHelper.js` ritorna messaggi fissi in italiano, ignorando la lingua UI.

### 23.2 Mapping errori troppo generico
Pattern come `"token"` o `"missing"` possono matchare errori non correlati e produrre messaggi fuorvianti.
- File: `lib/errorHelper.js`

### 23.3 fetchHelper: messaggi fissi
`safeJsonResponse` usa fallback in italiano e stringhe hardcoded. Non coerente con i18n.
- File: `lib/fetchHelper.js`

---

## 24) Tour e copertura pagine

### 24.1 Tour coverage incompleta
`components/GuideTour.jsx` limita le pagine con tour a una lista statica.  
Pagine attive non incluse (es. `/classifica`, `/gestione-profilo`, `/match/[id]`) ? esperienza non uniforme.

### 24.2 Encoding mojibake in Guida
Testi in `app/guida/page.jsx` contengono caratteri corrotti (es. �Più�, �Ti guiderà�) ? file non UTF-8.
### 17.2 Logica duplicata di estrazione giocatore
La logica di upload/estrazione foto � **duplicata** per titolari e riserve (stesso flusso: loop immagini, merge, errori).  
Rischio: bug divergenti e manutenzione costosa.
- File: `app/gestione-formazione/page.jsx` (due blocchi distinti di upload)

### 17.3 Formazioni hardcoded gigantesche in pagina
L�elenco formazioni e slot_positions � **hardcoded dentro la pagina** (migliaia di righe).  
Rischi: bundle grande, manutenzione difficile, assenza di fonte unica.
- File: `app/gestione-formazione/page.jsx`

### 17.4 Select �*� e payload pesanti
Caricamento giocatori con `.select('*')` senza paginazione o projection.  
Rischio: payload grandi, latenza e costi maggiori con rose estese.
- File: `app/gestione-formazione/page.jsx`

### 17.5 Messaggi multi-linea in ConfirmModal
Messaggi costruiti con `\n` e inseriti in `ConfirmModal`. Se il modal non renderizza line-break, l�alert perde leggibilit� (diverso da `window.confirm`).
- File: `app/gestione-formazione/page.jsx`

## 25) Components audit (UI/UX/robustezza)

### 25.1 CreditsBar polling aggressivo
Polling ogni 45s senza backoff o stop quando la tab non � attiva. Potenziale carico eccessivo.
- File: `components/CreditsBar.jsx`

### 25.2 CreditsBar senza abort ✅
Fetch senza abort controller ? rischio setState dopo unmount.
- File: `components/CreditsBar.jsx`
- **Fix (2026-02):** `fetchUsage(signal)` con `AbortController` nell'effect; cleanup `ac.abort()`; fetch con `signal`; ignorati `AbortError` e setState se `signal.aborted`.

### 25.3 AIKnowledgeBar retry e log / fetch abort ✅
Retry 3x con delay fisso e log in produzione; assenza di backoff o stop su tab hidden.
- File: `components/AIKnowledgeBar.jsx`
- **Fix fetch abort (2026-02):** `fetchAIKnowledge(signal)` e fetch in `attemptRefresh` con `ac.signal`; cleanup `ac.abort()`; gestione `AbortError` (intervento #12).

### 25.4 AssistantChat error handling non uniforme
`res.json()` usato anche in errore senza safeJsonResponse, rischio throw su body non JSON.
- File: `components/AssistantChat.jsx`

### 25.5 AssistantChat senza abort ✅
Chat fetch senza abort su unmount e senza cancella streaming ? rischio leak UX.
- File: `components/AssistantChat.jsx`
- **Fix (2026-02):** `sendAbortRef` + AbortController in `handleSend`; fetch con `signal`; cleanup su unmount; gestione `AbortError` (intervento #12).

### 25.6 TaskWidget timeout fisso / fetch abort ✅
Timeout fisso lato client senza gestione retry/backoff. UX non guidata se timeout ricorre.
- File: `components/TaskWidget.jsx`
- **Fix fetch abort (2026-02):** `fetchTasks(signal)` con AbortController nel useEffect; cleanup `ac.abort()`; gestione `AbortError` (intervento #12). Il punto "timeout fisso" resta aperto.

### 25.7 AiInfoModal setTimeout post-unmount
Uso di `setTimeout` per chiusura modal senza cleanup ? rischio setState dopo unmount.
- File: `components/AiInfoModal.jsx`

### 25.8 ConfirmModal accessibilit�
Modal privo di focus trap e attributi ARIA espliciti; labels hardcoded IT come fallback.
- File: `components/ConfirmModal.jsx`

---

## 26) Lib audit (logica e coerenza dati)

### 26.1 aiKnowledgeHelper select `*` estesi
Query con `select('*')` su match, statistics e rose; payload pesanti e costi Supabase.
- File: `lib/aiKnowledgeHelper.js`

### 26.2 aiKnowledgeHelper usage stimato
`estimatedMonthlyUsage` � stimato da match_count, non da uso reale; rischia metriche fuorvianti.
- File: `lib/aiKnowledgeHelper.js`

### 26.3 aiKnowledgeHelper log sensibili
Log con match_count e player_count lato server; in produzione pu� esporre pattern utente.
- File: `lib/aiKnowledgeHelper.js`

---

## 27) API audit aggiuntivo (stabilit�, sicurezza, coerenza)

### 27.1 refresh-diagnostic: error handling incompleto
Query Supabase in `Promise.all` senza gestione `error` per ogni response: in caso di errore dati �vuoti� e diagnosi potenzialmente fuorviante senza segnalarlo.
- File: `app/api/refresh-diagnostic/route.js`

### 27.2 refresh-diagnostic: encoding e commenti mojibake
Commenti e stringhe con caratteri corrotti (`→`) indicano file non UTF-8.
- File: `app/api/refresh-diagnostic/route.js`

### 27.3 tasks/generate: endpoint �manuale� esposto
Endpoint di generazione task �per test/manuale� accessibile in produzione; permette rigenerazioni per qualunque settimana nel range consentito.
- File: `app/api/tasks/generate/route.js`

### 27.4 tasks/generate: normalizzazione weekStart fragile
Normalizzazione �assicurati che sia luned� usa `getDay()` con timezone locale; pu� slittare con input UTC o date borderline.
- File: `app/api/tasks/generate/route.js`

### 27.5 analyze-match: rate limit config non protetto
Accesso diretto a `RATE_LIMIT_CONFIG['/api/analyze-match']` senza fallback; se chiave manca ? crash runtime.
- File: `app/api/analyze-match/route.js`

### 27.6 analyze-match: parsing risultato match fragile
Win/Loss basato su stringhe (`W`, `Vittoria`, `Win`). Se risultato � �2-1�, �X�, �Draw� ? classifica errata.
- File: `app/api/analyze-match/route.js`

### 27.7 analyze-match: prompt enorme e dati non limitati
`player_ratings`, `ball_recovery_zones`, `team_stats` passati senza slicing profondo; rischio prompt oversize e costi.
- File: `app/api/analyze-match/route.js`

### 27.8 analyze-match: stima costi/crediti fissa
`recordUsage` registra costo fisso (4) indipendente da tokens reali; metrica non accurata.
- File: `app/api/analyze-match/route.js`, `lib/creditService.js`

### 27.9 leaderboard/me: error handling supabase assente
Nessun check su `error` per query snapshots; in caso di errore restituisce history vuota come se fosse valido.
- File: `app/api/leaderboard/me/route.js`

### 27.10 leaderboard: bucket rate limit condiviso per token invalidi
Se token presente ma invalido, la chiave rate limit � �auth� condivisa ? rischio DoS fra utenti anonimi con token malformati.
- File: `app/api/leaderboard/route.js`

---

## 28) Pagina giocatore + upload (giocatore/[id])

### 28.1 select `*` e payload eccessivo
Recupera il giocatore con `.select('*')` senza projection; dati inutili e payload pesanti.
- File: `app/giocatore/[id]/page.jsx`

### 28.2 Nessun abort su fetch
Caricamento giocatore e upload senza abort controller ? rischio setState su unmounted e leak UX.
- File: `app/giocatore/[id]/page.jsx`

### 28.3 Upload base64 senza limite dimensione
Nessun controllo dimensione file prima di convertire in dataURL; rischio upload enormi e memory spike.
- File: `app/giocatore/[id]/page.jsx`

### 28.4 Validazione mismatch solo client
Confronto nome/squadra/ruolo/et� solo client-side; server non valida coerenza con record ? rischio aggiornamenti errati.
- File: `app/giocatore/[id]/page.jsx`, `app/api/extract-player/route.js`

### 28.5 Encoding mojibake diffuso
Stringhe con `�`/`�` in UI e commenti; esperienza utente degradata.
- File: `app/giocatore/[id]/page.jsx`

### 28.6 Accessibilit� modale conferma
Modal custom senza focus trap/ARIA; click fuori chiude senza gestione tastiera.
- File: `app/giocatore/[id]/page.jsx`

---

## 29) Altri componenti non auditati prima

### 29.1 GameAnalysisModal: no abort e setTimeout senza cleanup
Fetch su `/api/extract-game-analysis` e `/api/refresh-diagnostic` senza abort; `setTimeout` per chiusura senza cleanup.
- File: `components/GameAnalysisModal.jsx`

### 29.2 GameAnalysisModal: stringhe non i18n
Usa stringhe hardcoded (es. �No image selected�) fuori da `t()`.
- File: `components/GameAnalysisModal.jsx`

### 29.3 MissingDataModal: validazione minima
Input manuali senza validazione semantica (range/format) e senza i18n completa; rischio dati incoerenti.
- File: `components/MissingDataModal.jsx`

### 29.4 PositionSelectionModal: labels hardcoded IT
Etichette posizioni e livelli competenza hardcoded in IT; parziale in EN.
- File: `components/PositionSelectionModal.jsx`

### 29.5 PositionSelectionModal: accessibilit�
Clickables senza ruolo/ARIA e senza focus trap; modale non navigabile da tastiera.
- File: `components/PositionSelectionModal.jsx`

### 29.6 TacticalSettingsPanel: header cliccabile senza ruolo
Header collassabile � un div cliccabile senza ruolo e aria-expanded; accessibilit� non conforme.
- File: `components/TacticalSettingsPanel.jsx`

### 29.7 LanguageSwitch: non � un button
Componente cliccabile senza `button`, `role`, `aria-label` e senza gestione keyboard.
- File: `components/LanguageSwitch.jsx`

---

## 30) Lib audit aggiuntivo

### 30.1 ragHelper: dipendenza da file locale e console log
Carica `info_rag.md` via filesystem; su serverless/edge pu� fallire o risultare vuoto. Log in produzione con lunghezza file.
- File: `lib/ragHelper.js`

### 30.2 ragHelper: keyword enormi + encoding mojibake
Liste keyword molto grandi con caratteri corrotti (`�`, `→`) ? potenziali falsi positivi e UX incoerente.
- File: `lib/ragHelper.js`

### 30.3 openaiHelper: retry senza jitter/backoff reale
Retry con delay fisso; possibile �thundering herd� in caso di rate limit globale.
- File: `lib/openaiHelper.js`

### 30.4 openaiHelper: log in produzione
`console.log` su rate limit/timeout in produzione; rischio noise/log cost.
- File: `lib/openaiHelper.js`

### 30.5 validateFormationLimits: mismatch sigle EDA/EDE
Validazione usa `EDA` in attacco ma `positionCounts` contiene `EDE` ? limite non applicato correttamente.
- File: `lib/validateFormationLimits.js`

### 30.6 validateFormationLimits: dipendenza da coordinate y
Regole ruolo basate su `y` coordinate senza fallback; se y mancante o non normalizzata, validation errata.
- File: `lib/validateFormationLimits.js`

### 30.7 authHelper: createClient per ogni richiesta
`createClient` istanziato ad ogni validazione token senza caching; overhead su alta frequenza.
- File: `lib/authHelper.js`

### 30.8 playerPhotoTypes: encoding mojibake
Commenti e descrizioni con `Abilità` e simboli corrotti.
- File: `lib/playerPhotoTypes.js`

---

## 31) Migrations / RLS audit aggiuntivo

### 31.1 leaderboard_snapshots senza policy
RLS attivata ma nessuna policy: accesso solo service_role. Serve garantire che nessun client usi anon key su questa tabella (altrimenti blocco totale o leak se policy future errate).
- File: `migrations/create_leaderboard_snapshots_and_user_prizes.sql`

### 31.2 user_prizes UPDATE troppo permissivo
Policy UPDATE consente all�utente di modificare qualsiasi campo, non solo `status`/`redeemed_at`. Rischio manipolazione metadata o prize_type.
- File: `migrations/create_leaderboard_snapshots_and_user_prizes.sql`

---

## 32) API e logica aggiuntiva (admin + game analysis)

### 32.1 recalculate-patterns senza rate limit
Endpoint admin non rate-limited: rischio abuso (calcoli pesanti su DB).
- File: `app/api/admin/recalculate-patterns/route.js`

### 32.2 recalculate-patterns log PII
`console.log` include userId in produzione.
- File: `app/api/admin/recalculate-patterns/route.js`

### 32.3 recalculate-patterns parsing risultato fragile
Win/Loss basato su stringhe e regex; per risultati non standard potrebbe essere errato.
- File: `app/api/admin/recalculate-patterns/route.js`

### 32.4 extract-game-analysis: error handling supabase parziale
GET non controlla `error` sulla select; POST non gestisce errore recordUsage.
- File: `app/api/extract-game-analysis/route.js`

### 32.5 extract-game-analysis: prompt solo IT
Prompt e chiavi richieste in italiano anche in UI EN; rischio mismatch aspettative utente.
- File: `app/api/extract-game-analysis/route.js`

---

## 33) Difficolt� e possibili rotture (macro-sezioni)

> **Legenda**  
> **Difficolt�**: Bassa / Media / Alta  
> **Possibili rotture**: cosa pu� rompersi se modifichi quella sezione senza test.

### 33.1 Sezione 1 (Rischi critici P0/P1)
- **Difficolt�:** Alta  
- **Possibili rotture:** login/permessi, blocchi API, crediti errati, output AI incoerente, rate limit non funzionante.

### 33.2 Sezione 2 (Rischi medi P2)
- **Difficolt�:** Media  
- **Possibili rotture:** UX errata, dati incompleti, regressioni su flussi secondari.

### 33.3 Sezione 3 (Macro-aree sistema)
- **Difficolt�:** Media  
- **Possibili rotture:** break a catena (API/DB/UI), dipendenze trasversali non evidenti.

### 33.4 Sezione 4 (Lista completa problemi)
- **Difficolt�:** Alta  
- **Possibili rotture:** dipende dal punto; molti sono �core flow� (upload, credits, AI, rate limit).

### 33.5 Sezione 5 (Interventi consigliati)
- **Difficolt�:** Alta  
- **Possibili rotture:** tocca aree centrali (billing/AI/security). Serve test end-to-end.

### 33.6 Sezione 6 (Note finali)
- **Difficolt�:** Bassa  
- **Possibili rotture:** nessuna diretta, solo governance.

### 33.7 Sezione 7 (UX/UI/Disallineamenti)
- **Difficolt�:** Media  
- **Possibili rotture:** UI incoerente, rottura layout, regressioni su navigazione rapida.

### 33.8 Sezione 8 (Traduzioni/i18n)
- **Difficolt�:** Bassa-Media  
- **Possibili rotture:** stringhe mancanti, fallback errati, UI mista IT/EN.

### 33.9 Sezione 9 (Coerenza flussi)
- **Difficolt�:** Alta  
- **Possibili rotture:** doppie scritture DB, race condition, task duplicati, carico eccessivo.

### 33.10 Sezione 10 (Task: dati cliente)
- **Difficolt�:** Media  
- **Possibili rotture:** task non generati o dati errati in dashboard.

### 33.11 Sezione 11 (Assistente Chat)
- **Difficolt�:** Alta  
- **Possibili rotture:** output AI non JSON, blocchi OpenAI, uso crediti sbagliato.

### 33.12 Sezione 12 (AI Knowledge / Knowledge Bar)
- **Difficolt�:** Media  
- **Possibili rotture:** indicatori errati, calcolo score sbagliato, performance lente.

### 33.13 Sezione 13 (Diagnostica / cache)
- **Difficolt�:** Media  
- **Possibili rotture:** cache non aggiornata, diagnostica vuota o incoerente.

### 33.14 Sezione 14 (Upload Match / Wizard)
- **Difficolt�:** Alta  
- **Possibili rotture:** estrazioni OpenAI fallite, dati partita corrotti.

### 33.15 Sezione 15 (Contromisure / AI)
- **Difficolt�:** Alta  
- **Possibili rotture:** suggerimenti fuori contesto, prompt troppo lungo, rate limit.

### 33.16 Sezione 16 (Gestione formazione / rosa)
- **Difficolt�:** Alta  
- **Possibili rotture:** slot sbagliati, perdita dati, layout campo rotto.

### 33.17 Sezione 17 (Formazione: duplicazioni e select)
- **Difficolt�:** Media  
- **Possibili rotture:** upload duplicato, regressioni su performance.

### 33.18 Sezione 18 (Allenatori / Match new / Contromisure live)
- **Difficolt�:** Media  
- **Possibili rotture:** save incompleti, duplicazioni, UX incoerente.

### 33.19 Sezione 19 (Leaderboard API)
- **Difficolt�:** Alta  
- **Possibili rotture:** classifica errata, calcolo rank sbagliato, privacy leak.

### 33.20 Sezione 20 (Classifica page)
- **Difficolt�:** Media  
- **Possibili rotture:** UI rotta, dati incoerenti, errori silenziosi.

### 33.21 Sezione 21 (Gestione profilo)
- **Difficolt�:** Media  
- **Possibili rotture:** profilo incompleto, premi non visualizzati, UX bloccata.

### 33.22 Sezione 22 (Impostazioni profilo / Login / Recovery / Guida)
- **Difficolt�:** Media  
- **Possibili rotture:** login flow, redirect errati, guida non aggiornata.

### 33.23 Sezione 23 (Lib helpers)
- **Difficolt�:** Media  
- **Possibili rotture:** errori non localizzati, fallback sbagliati, UX incoerente.

### 33.24 Sezione 24 (Tour)
- **Difficolt�:** Bassa  
- **Possibili rotture:** tour non appare o appare su pagine sbagliate.

### 33.25 Sezione 25 (Components audit)
- **Difficolt�:** Media  
- **Possibili rotture:** UI instabile, polling eccessivo, leak di memoria.

### 33.26 Sezione 26 (Lib audit)
- **Difficolt�:** Media  
- **Possibili rotture:** calcoli errati, metriche sbagliate, costi DB.

### 33.27 Sezione 27 (API audit aggiuntivo)
- **Difficolt�:** Alta  
- **Possibili rotture:** API crash, rate limit non applicato, risultati errati.

### 33.28 Sezione 28 (Pagina giocatore)
- **Difficolt�:** Media-Alta  
- **Possibili rotture:** update giocatore errato, upload foto non valido.

### 33.29 Sezione 29 (Componenti extra)
- **Difficolt�:** Bassa-Media  
- **Possibili rotture:** modali non chiudono, errori UI non gestiti.

### 33.30 Sezione 30 (Lib aggiuntive)
- **Difficolt�:** Media  
- **Possibili rotture:** RAG non carica, classificazione errata, validazioni sbagliate.

### 33.31 Sezione 31 (Migrations/RLS)
- **Difficolt�:** Alta  
- **Possibili rotture:** permessi errati, impossibilit� di lettura/scrittura, leak dati.

### 33.32 Sezione 32 (Admin + game analysis)
- **Difficolt�:** Media-Alta  
- **Possibili rotture:** analisi non salvata, overload DB, incoerenze dati.

---

## 34) RAG + risposta chat (valutazione prompt)

### 34.1 Struttura prompt: buona ma molto lunga
Prompt ben strutturato (system + history + user prompt + RAG), ma rischio superare budget token in produzione.
- File: `app/api/assistant-chat/route.js`

### 34.2 RAG da file locale
`info_rag.md` letto da filesystem: su serverless pu� risultare vuoto ? risposte pi� generiche.
- File: `lib/ragHelper.js`

### 34.3 response_format text + parsing suggerimenti
`response_format: { type: 'text' }` ok, ma l�estrazione suggerimenti � fragile se l�AI non rispetta il blocco �SUGGERIMENTI�.
- File: `app/api/assistant-chat/route.js`

### 34.4 max_tokens limitato
`max_tokens: 450` pu� troncare output quando prompt+RAG � lungo ? risposta incompleta o senza suggerimenti.
- File: `app/api/assistant-chat/route.js`

### 34.5 sanitizeCoachOutput aggressivo
Rimuove frasi con �perch�/in base a�: pu� tagliare parti utili e rendere frasi spezzate.
- File: `app/api/assistant-chat/route.js`

### 34.6 Encoding nei testi del prompt
Caratteri corrotti (`?`, `�`, `�`) nel prompt/label riducono qualit� e chiarezza della risposta AI.
- File: `app/api/assistant-chat/route.js`, `lib/ragHelper.js`

### 34.7 Raccomandazione enterprise: chiavi �client-centric�
La classificazione deve attivare RAG anche se il cliente non scrive �eFootball�.  
Suggerite chiavi soft (cliente-centriche):  
- **Rosa/giocatori:** rosa, squadra, lineup, schierare, titolari, riserve, �migliore per la rosa�, �chi metto�.  
- **Ruoli/posizioni:** ruolo, posizione, mediano, regista, trequartista, esterno, centravanti, DC/TS/TD/CC/AMF/CF.  
- **Tattica/strategie:** stile di gioco, contropiede, possesso, pressione, difesa alta/bassa, �come attacco/difendo�.  
- **Prestazioni:** rendimento, performance, forma, �perch� perdo�, �cosa correggere�.  
Obiettivo: ridurre casi in cui il cliente fa una domanda tattica ma il RAG non parte.









---

