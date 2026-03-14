# Riepilogo Hero Points / Crediti: modifiche, da fare, coerenza, traduzioni, flusso, sicurezza

---

## 1. Modifiche già fatte

### Backend
| Componente | Cosa è stato fatto |
|------------|--------------------|
| **lib/creditService.js** | `recordUsage`, `recordTransaction`, `getCurrentUsage`, `getRecentTransactions`; `accreditPurchase` (accredito da sito pagamenti); `CREDITS_INCLUDED_DEFAULT` leggibile da env `CREDITS_INCLUDED_DEFAULT` (default 200, es. 10000 per test). |
| **app/api/credits/usage/route.js** | GET/POST: auth Bearer, `getCurrentUsage`, risposta con `credits_used`, `credits_included`, `balance_remaining`, `overage`; usa `CREDITS_INCLUDED_DEFAULT` (no 200 hardcoded). |
| **app/api/credits/transactions/route.js** | GET: auth Bearer, `getRecentTransactions(userId, limit)`; `limit` validato (max 50, default 20); `total_analyses` da tabella `matches`. |
| **app/api/credits/accredit/route.js** | POST: auth con `CREDITS_ACCREDIT_API_KEY` (Bearer o X-Webhook-Secret); body `user_id` (UUID) o `email`, `credits_amount`, `order_id`, opzionale `period_key`; validazione UUID; risoluzione email → user_id via RPC `get_user_id_by_email`; idempotenza su `order_id`. |
| **Route che consumano crediti** | Dopo successo OpenAI: `recordUsage(admin, userId, peso, operationType)` in assistant-chat, analyze-match, generate-countermeasures, extract-player, extract-match-data, extract-formation, extract-coach. |

### Database (Supabase, migration applicate)
| Elemento | Descrizione |
|----------|-------------|
| **user_credit_usage** | `user_id`, `period_key` (YYYY-MM), `credits_used`, `credits_included`; RLS SELECT propri record; insert/update solo service role. |
| **credit_transactions** | `user_id`, `amount`, `type` (purchase \| usage), `description`, `reference_id`, `created_at`; RLS SELECT propri record; insert solo service role. |
| **get_user_id_by_email** | Funzione `public.get_user_id_by_email(user_email)` per risolvere email → UUID (usata da API accredit). |

### Frontend
| Componente | Cosa è stato fatto |
|------------|--------------------|
| **app/gestione-profilo/page.jsx** | Pagina Gestione profilo: crediti residui, 4 card (Hero Points, Analisi totali, Rank, Membro dal), Attività recente (transazioni con data e HP), CTA Acquista crediti / Personalizza avatar; stato errore + Riprova; responsive e classi `.card`. |
| **app/page.jsx** | Pulsante “Hero Points” in dashboard che porta a `/gestione-profilo`. |
| **CreditsBar** | Già esistente: legge POST /api/credits/usage, ascolta evento `credits-consumed` per refresh dopo uso API. |
| **credits-consumed** | Dispatch dopo operazioni che consumano crediti (AssistantChat, match new/id, giocatore, gestione-formazione, contromisure-live, allenatori). |

### Traduzioni (lib/i18n.js)
| Chiave | IT | EN |
|--------|----|----|
| heroPoints, creditiResidui, acquista, gestioneProfilo, attivitaRecente | Hero Points, Crediti residui, Acquista, Gestione profilo, Attività recente | Hero Points, Remaining credits, Purchase, Profile management, Recent activity |
| analisiTotali, rankAttuale, membroDal, vediTutteTransazioni | Analisi totali, Rank attuale, Membro dal, Vedi tutte le transazioni | Total analyses, Current rank, Member since, See all transactions |
| acquistaCreditiCard, acquistaCreditiSubtitle, personalizzaAvatar, personalizzaAvatarSubtitle | Acquista crediti, Ottieni Hero Points…, Personalizza avatar, Sblocca avatar… | Purchase credits, Get Hero Points…, Customize avatar, Unlock exclusive avatars |
| acquistoCrediti, transactionUsage, noTransactionsYet, creditsLoading, errorLoadingUsage, retry | Acquisto crediti, Utilizzo, Nessuna transazione…, Caricamento utilizzo…, Errore caricamento…, Riprova | Credit purchase, Usage, No transactions yet., Loading usage…, Error loading credits., Retry |
| rankPlatinum, rankGold, rankSilver, rankBronze | PLATINUM, GOLD, SILVER, BRONZE | idem |
| transactionType* | Chat assistente, Estrazione giocatore, … (7 tipi per usage) | Assistant chat, Player extraction, … |

Tutte le stringhe usate in gestione-profilo sono tradotte (IT/EN); nessun testo hardcoded in UI.

### Documentazione
| File | Contenuto |
|------|-----------|
| **docs/INTEGRAZIONE_SITO_PAGAMENTI_HERO_POINTS.md** | Contratto per il programmatore: endpoint accredit, body, auth, risposte, idempotenza, test senza sito pagamenti (CREDITS_INCLUDED_DEFAULT, SQL, curl). |
| **.env.example** | Esempi `CREDITS_INCLUDED_DEFAULT`, `CREDITS_ACCREDIT_API_KEY`. |

---

## 2. Da fare (non ancora implementato)

| Cosa | Priorità | Note |
|------|----------|------|
| **Check saldo prima di chiamare OpenAI** | Alta (enterprise) | Prima di ogni operazione a pagamento: leggere `getCurrentUsage`, se `balance_remaining < peso` rispondere 402 / messaggio “Crediti esauriti” e **non** chiamare OpenAI né `recordUsage`. Oggi si consuma dopo il successo ma non si blocca chi ha 0 crediti. |
| **Collegare pulsante “Acquista”** | Media | In gestione-profilo e CreditsBar: oggi `onClick` vuoto; collegare a pagina acquisto (sito pagamenti) o placeholder. |
| **“Vedi tutte le transazioni”** | Bassa | Pagina o modale con storico completo (oggi solo prime 10). |
| **“Personalizza avatar”** | Bassa | Collegare a feature o placeholder. |
| **“Membro dal”** | Bassa | Valorizzare da `auth.users.created_at` o profilo (oggi “—”). |
| **Sito pagamenti** | Esterno | Implementare chiamata a `POST /api/credits/accredit` dopo pagamento; configurare `CREDITS_ACCREDIT_API_KEY` in produzione. |
| **Back-office / supporto** | Opzionale | Vista admin su account utente + transazioni + eventuali correzioni (adjustment). |

---

## 3. Coerenza col codice

| Aspetto | Stato |
|---------|--------|
| **Unica fonte crediti** | Usage e saldo derivano da `user_credit_usage` + `getCurrentUsage`; default da `CREDITS_INCLUDED_DEFAULT` (env). |
| **Storico unico** | `credit_transactions` per purchase e usage; `reference_id` = order_id per acquisti; tipo e descrizione coerenti con `recordTransaction` e `getTransactionLabel` (i18n). |
| **Pesi operazioni** | `CREDIT_WEIGHTS` in creditService; stessi valori usati in tutte le route (assistant-chat 1, extract-* 2, generate-countermeasures 3, extract-formation 3, analyze-match 4). |
| **Periodo** | `period_key` YYYY-MM UTC ovunque (`getCurrentPeriodKey()`); accredit e usage usano lo stesso periodo. |
| **Refresh UI** | CreditsBar e gestione-profilo leggono da API; evento `credits-consumed` aggiorna la barra dopo ogni operazione che consuma. |
| **UX** | Gestione profilo usa `.card`, stile neon, responsive come il resto dell’app; link Hero Points in dashboard. |

---

## 4. Flusso end-to-end

### Utilizzo (consumo)
1. Utente fa un’azione che consuma crediti (chat, analisi, estrazione, ecc.).
2. Route API: valida Bearer → (da fare: controlla saldo) → chiama OpenAI → se OK → `recordUsage(admin, userId, peso, operationType)`.
3. `recordUsage`: upsert su `user_credit_usage` (incrementa `credits_used`), poi `recordTransaction(..., 'usage', ...)`.
4. Frontend: dispatch `credits-consumed` → CreditsBar rifà POST /api/credits/usage → aggiorna barra.
5. Gestione profilo: alla visita legge usage + transactions; le transazioni di tipo usage hanno amount negativo e descrizione tradotta (transactionType* o transactionUsage).

### Acquisto (accredito, quando il sito pagamenti è collegato)
1. Utente paga sul sito esterno; il sito chiama `POST /api/credits/accredit` con API key, `email` o `user_id`, `credits_amount`, `order_id`.
2. API accredit: verifica key, valida body, risolve user_id (se email via RPC), controlla idempotenza su `order_id`.
3. `accreditPurchase`: upsert `user_credit_usage` (imposta `credits_included` per il periodo), insert `credit_transactions` tipo purchase con `reference_id = order_id`.
4. Utente in Gattilio27: al prossimo refresh (o alla visita a Gestione profilo) vede il nuovo tetto e la transazione “Acquisto crediti” in Attività recente.

### Test senza sito pagamenti
- `.env.local`: `CREDITS_INCLUDED_DEFAULT=10000` → nuovi utenti/periodi hanno 10000 crediti.
- Per utenti già con riga: UPDATE su `user_credit_usage` in Supabase oppure chiamata a `/api/credits/accredit` con `CREDITS_ACCREDIT_API_KEY=test-segreto` (vedi doc integrazione).

---

## 5. Sicurezza

| Aspetto | Implementazione |
|---------|-----------------|
| **Auth utente (usage/transactions)** | `extractBearerToken` + `validateToken`; `userId` sempre dal token, mai dal body. |
| **Auth accredito** | Solo `CREDITS_ACCREDIT_API_KEY` (Bearer o X-Webhook-Secret); nessun token utente; endpoint non esposto al frontend. |
| **RLS** | `user_credit_usage` e `credit_transactions`: SELECT solo propri record (`auth.uid() = user_id`); INSERT/UPDATE solo da service role (backend). |
| **Input accredit** | `user_id` validato come UUID; `credits_amount` > 0; `order_id` obbligatorio; `email` usata solo per risolvere user_id via RPC. |
| **Idempotenza** | Stesso `order_id` per lo stesso utente → nessun doppio accredito; risposta 200. |
| **Dati in UI** | `description` transazioni da backend; React escapa il testo; nessun `dangerouslySetInnerHTML`. |
| **API key** | Non in codice; in env; .env.example senza valori reali. |

---

## 6. Riferimenti rapidi

- **Crediti default / test:** `CREDITS_INCLUDED_DEFAULT` in `.env.local` (es. 10000); `lib/creditService.js` → `getCreditsIncludedDefault()`.
- **Accredito da sito pagamenti:** `CREDITS_ACCREDIT_API_KEY`, `POST /api/credits/accredit`, `docs/INTEGRAZIONE_SITO_PAGAMENTI_HERO_POINTS.md`.
- **Migrazioni:** `create_user_credit_usage.sql`, `create_credit_transactions.sql`, `get_user_id_by_email.sql` (già applicate in Supabase).
- **Traduzioni Hero Points / Gestione profilo:** `lib/i18n.js` (chiavi sopra); gestione-profilo usa solo `t(...)`.
