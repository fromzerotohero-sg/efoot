# Segnalazioni bug per Tommaso (programmatore)

Documento di riepilogo bug segnalati / individuati, per intervento del programmatore.

---

## 1. API `/api/user/profile` — 500 e profilo non caricato (RISOLTO)

### Sintomo
- Dopo login MetalGate (token verificato con successo), la chiamata `GET /api/user/profile` risponde con **status 500**.
- In console: `Failed to load resource: the server responded with a status of 500`.
- Le pagine che dipendono dal profilo mostrano errore:
  - **Guida**: «Error loading profile» / «Failed to load profile»
  - **Impostazioni Profilo**: «Errore caricamento profilo»

### Causa
- File: **`app/api/user/profile/route.js`**.
- La query Supabase sulla tabella `user_profiles` include nel **`.select()`** la colonna **`user_metadata`**.
- La tabella **`user_profiles`** in Supabase **non ha** la colonna `user_metadata` (le colonne effettive sono: `id`, `user_id`, `first_name`, `last_name`, `current_division`, `favorite_team`, `team_name`, `ai_name`, `nickname`, `leaderboard_consent`, `is_metalgate_user`, `metalgate_user_id`, ecc.).
- Postgres/Supabase restituisce errore (es. colonna inesistente) → la route va in catch o in `if (error)` → risposta **500**.

### Impatto
- Utenti MetalGate (e chiunque usi quella route) non possono caricare il profilo: Guida e Impostazioni Profilo risultano in errore. Il resto dell’app può funzionare, ma tutto ciò che dipende dai dati profilo no.

### Fix applicato
- Rimossa la colonna **`user_metadata`** dalla `.select()` della route `GET` in `app/api/user/profile/route.js` (non presente in tabella `user_profiles`).
- Se in futuro serviranno metadati utente nel profilo, aggiungere prima una colonna (o struttura) nello schema di `user_profiles` e poi esporla in select.

### Ambiente
- Rilevato in **produzione** (deploy Vercel), con utenti **MetalGate**.

---

## 2. Chat launcher — TypeError su touch (mobile) (RISOLTO)

### Sintomo
- Su mobile, al **touch end** sul pulsante «Chiedi al Coach», in console:
  - `Uncaught TypeError: Cannot read properties of null (reading 'style')`
  - Stack: `setTimeout` → `onTouchEnd` (chunk 567-…).

### Causa
- In **`components/AssistantChat.jsx`**, l’handler **`onTouchEnd`** avvia un `setTimeout(..., 300)` per ripristinare dimensioni/stile del pulsante dopo l’espansione.
- Quando il callback del timeout viene eseguito (dopo 300 ms), a volte il pulsante **non è più nel DOM** (es. la chat si è aperta e il launcher è stato smontato/nascosto), quindi il riferimento usato (es. `e.currentTarget`) è `null` e l’accesso a `.style` genera il TypeError.

### Impatto
- Solo errore in console; la chat si apre correttamente. Nessun blocco per l’utente, ma log sporchi e possibili segnalazioni da tool di monitoraggio.

### Fix applicato
- Nel `setTimeout` di `onTouchEnd`:
  - conservare il riferimento all’elemento (`const el = e.currentTarget`) prima del timeout;
  - all’interno del timeout, prima di usare `.style`, verificare **`if (!el || !el.isConnected) return`**.
- In questo modo non si accede mai a `.style` su un elemento non più in pagina.

### Stato
- **Risolto** (modifica già presente in `AssistantChat.jsx`).

---

## 3. Profilo in UX non allineato a Supabase (nome / squadra preferita)

### Sintomo
- In **Impostazioni Profilo** o nella **Palestra Coach** l’utente vede nome/cognome o **Squadra del cuore** diversi da quelli salvati in Supabase (es. "Giovanni Guida" invece di "attilio" / squadra vuota invece di "Milan").

### Possibili cause
- **Doppio profilo:** in `user_profiles` esistono più righe (es. una con `metalgate_user_id` e una senza); il token può essere validato prima da MetalGate o da Supabase e viene usato un `user_id` diverso → si legge/salva la riga sbagliata.
- **Token:** se l’utente ha fatto login MetalGate ma `auth_token` manca o non viene inviato, il frontend può usare `getSession()` e inviare un token Supabase (altro account) → le API restituiscono il profilo di quell’account.
- **Cache:** risposta GET profilo cachata dal browser (mitigata da `?t=Date.now()` e `Cache-Control: no-store`; se il problema persiste, verificare in Network che la richiesta non sia servita da cache).

### Cosa verificare (per Tommaso / debug)
1. **Network:** per la richiesta `GET /api/user/profile` controllare header `Authorization` (quale token) e il **body della risposta** (`first_name`, `last_name`, `favorite_team`). Se il body è corretto ma l’UI no, il bug è in frontend; se il body è sbagliato, il problema è lato backend (quale `user_id` viene usato dopo `validateToken`).
2. **localStorage:** in console `localStorage.getItem('auth_token')` e `localStorage.getItem('metalgate_user')`. Dopo login MetalGate entrambi devono essere valorizzati; se manca `auth_token`, con la logica attuale si va a login (se c’è `metalgate_user`) o si usa getSession (se non c’è metalgate_user).
3. **Supabase:** in `user_profiles` verificare quale riga ha `metalgate_user_id` uguale all’id restituito da MetalGate `/sso/verify` e che i campi di quella riga siano quelli attesi.

### Riferimento implementazione
- Flusso attuale (token, route, pagina profilo, Palestra Coach): **`docs/FUNZIONAMENTO_PROFILO_E_PALESTRA_ATTUALE.md`**.
- Modifiche applicate al flusso profilo: **`docs/MODIFICHE_FLUSSO_PROFILO_EFOOT.md`**.
- **Analisi enterprise cause radice (“perché non funziona”):** **`docs/ANALISI_ENTERPRISE_PERCHE_NON_FUNZIONA.md`**.

### Stato
- Comportamento documentato; fix applicati (MetalGate prima in `validateToken`, cache busting, `isMetalgateSession` per non usare getSession). Se il problema persiste in produzione, usare i punti sopra per il debug.

---

## 4. Rate limit 429 su `/api/refresh-diagnostic` (RISOLTO)

### Sintomo
- Dopo alcuni refresh della diagnostica, la chiamata a `/api/refresh-diagnostic` risponde **429 Too Many Requests**.

### Fix applicato
- Aumentato il limite in `lib/rateLimiter.js` (config per `/api/refresh-diagnostic`): `maxRequests` portato a 8 richieste per finestra. Route aggiornata per usare `RATE_LIMIT_CONFIG` e messaggio utente generico.

### Stato
- **Risolto.**

---

## 5. Callback MetalGate — 404 e "body stream already read" (RISOLTO)

### Sintomo
- Dopo login SSO MetalGate, in console:
  - `POST .../api/auth/metalgate-callback 404 (Not Found)`
  - `TypeError: Failed to execute 'json' on 'Response': body stream already read`
- Messaggio utente: «User not found. Please register first.»

### Cause
1. **404:** L’API `POST /api/auth/metalgate-callback` restituisce **404** con `details: 'user_not_found'` quando l’utente MetalGate non ha ancora un profilo in `user_profiles` (primo accesso).
2. **body stream already read:** In **`app/auth/callback/page.jsx`** si chiamava `response.json()` due volte (una per il successo, una nel branch errore) → il body della Response può essere letto una sola volta.

### Fix applicati
- **Un solo `response.json()`:** il body viene parsato una volta in `data` e usato sia per successo che per errore; in caso di risposta non JSON si gestisce con try/catch.
- **Gestione 404 user_not_found:** messaggio chiaro «User not found. Please register first.» (e per 404 generico «Login endpoint not available. Check deployment.»).
- **Auto-register:** se la prima chiamata è con `action: 'login'` e la risposta è 404 con `user_not_found`, la pagina ritenta automaticamente con `action: 'register'`; se la registrazione va a buon fine l’utente viene loggato senza passi aggiuntivi.

### File
- **`app/auth/callback/page.jsx`** — `handleMetalgateCallback`: parsing unico, gestione 404, retry con register.

### Stato
- **Risolto.**

---

## 6. Tasks generate — utenti MetalGate (RISOLTO)

### Sintomo
- Per utenti loggati con MetalGate, la route **`POST /api/tasks/generate`** usava l’id MetalGate come `user_id` invece dell’UUID Supabase. I task venivano creati/associati all’identità sbagliata (nessuna riga in `user_profiles` con quel id come `user_id`).

### Causa
- In **`app/api/tasks/generate/route.js`** mancava il **lookup MetalGate**: dopo `validateToken`, per gli utenti con `user_metadata.is_metalgate_user` non veniva risolto il `user_id` da `user_profiles` tramite `metalgate_user_id`.

### Fix applicato
- Aggiunto lo stesso blocco usato nelle altre route (profile, save-profile, tasks/list, dashboard, ecc.): creazione client admin, query su `user_profiles` con `.eq('metalgate_user_id', user_id)`, sostituzione di `user_id` con `existingProfile.user_id`; se profilo non trovato, 404.

### File
- **`app/api/tasks/generate/route.js`**

### Stato
- **Risolto.**

---

## 7. Dettaglio partita — 404 "Match not found" (utenti MetalGate)

### Sintomo
- Con login MetalGate (token verificato in console: "Metalgate token verified successfully"), aprendo il dettaglio di una partita dalla lista si ottiene:
  - **404** su `GET /api/matches?id=<match_id>`
  - In console: `[MatchDetail] Error: Error: Match not found`

### Possibili cause
- **Token:** le pagine **lista partite** (`app/match/page.jsx`) e **dettaglio partita** (`app/match/[id]/page.jsx`) usano `auth_token` e, se assente, il fallback `supabase.auth.getSession()`. Per un utente MetalGate, se per qualche motivo viene inviato il token Supabase invece di quello MetalGate, il backend risolve un altro `user_id` e la query `.eq('user_id', userId).eq('id', id)` non trova la partita (salvata con il `user_id` del profilo MetalGate).
- **Coerenza identità:** la route `GET /api/matches` fa già il lookup MetalGate (metalgate_user_id → user_id); non usa l’header `X-Metalgate-Session` / `forbidSupabaseFallback`. Se `validateToken` fa fallback su Supabase, l’identità usata per le query è diversa da quella con cui le partite sono state create.
- **Dati:** la partita con quell’id potrebbe essere stata creata con un altro account (es. prima del passaggio a MetalGate) e quindi avere un `user_id` diverso; in quel caso il 404 è coerente (la partita non appartiene all’utente corrente).

### Cosa verificare (per Tommaso / debug)
1. **Network:** per `GET /api/matches?id=<id>` controllare l’header `Authorization` e, in risposta, se si riceve 404. Verificare in Supabase nella tabella `matches` che la riga con quell’`id` esista e quale `user_id` ha; confrontare con il `user_id` che il backend usa dopo il lookup MetalGate (vedi `user_profiles` per `metalgate_user_id` → `user_id`).
2. **Frontend:** in sessione MetalGate verificare che le pagine match non usino `getSession()` al posto di `auth_token` (per non inviare per sbaglio il token Supabase). Valutare l’invio di `X-Metalgate-Session: 1` e l’uso di `forbidSupabaseFallback` in `app/api/matches/route.js` e `app/api/dashboard/route.js` per allineamento al flusso profilo.

### File coinvolti
- **`app/match/[id]/page.jsx`** — fetch dettaglio partita.
- **`app/match/page.jsx`** — fetch lista (dashboard).
- **`app/api/matches/route.js`** — GET singola partita / lista.
- **`app/api/dashboard/route.js`** — dati dashboard (include matches).

### Stato
- **Segnalato / da risolvere.**

---

## Modifiche recenti (stato codice)

- **Profilo / MetalGate:** `GET /api/user/profile` e `POST /api/supabase/save-profile` leggono l’header `X-Metalgate-Session` e usano `forbidSupabaseFallback` per evitare il fallback Supabase in sessione MetalGate. Frontend (Impostazioni Profilo, chat, Palestra Coach) invia l’header quando è presente `metalgate_user` in localStorage.
- **Callback MetalGate:** parsing unico di `response.json()`, gestione 404 `user_not_found`, retry automatico con `action: 'register'` al primo accesso.
- **Tasks generate:** aggiunto lookup MetalGate in `POST /api/tasks/generate`.
- **Audit route:** tutte le API che usano `validateToken` e leggono/scrivono per utente fanno il lookup `metalgate_user_id` → `user_id` (vedi **`docs/AUDIT_ROUTE_LOGICHE_FLUSSI_SUPABASE.md`**).

---

## Riferimenti rapidi

| Bug | File principale | Stato |
|-----|-----------------|--------|
| Profile API 500 | `app/api/user/profile/route.js` | Risolto |
| Chat launcher touch null | `components/AssistantChat.jsx` | Risolto |
| Profilo UX ≠ Supabase (nome/squadra) | token + authHelper + profile/save-profile | Documentato / da verificare se persiste |
| Rate limit 429 refresh-diagnostic | `lib/rateLimiter.js`, `app/api/refresh-diagnostic/route.js` | Risolto |
| Callback MetalGate 404 / body stream | `app/auth/callback/page.jsx` | Risolto |
| Tasks generate MetalGate | `app/api/tasks/generate/route.js` | Risolto |
| Match not found 404 (MetalGate) | `app/match/[id]/page.jsx`, `app/api/matches/route.js` | Segnalato |

---

## Documentazione correlata

- **`docs/FUNZIONAMENTO_PROFILO_E_PALESTRA_ATTUALE.md`** — Funzionamento esatto del codice (token, API, Impostazioni Profilo, Palestra Coach).
- **`docs/MODIFICHE_FLUSSO_PROFILO_EFOOT.md`** — Elenco modifiche al flusso profilo e commit di riferimento.
- **`docs/AUDIT_ROUTE_LOGICHE_FLUSSI_SUPABASE.md`** — Audit route, logiche, flussi e allineamento Supabase (identità MetalGate, lookup user_id).
- **`docs/CONFRONTO_SUPABASE_UX_INFO_ATTILA_LAB.md`** — Confronto dati Supabase vs UX per il profilo info@attila-lab.net.

---

*Ultimo aggiornamento: 15 marzo 2026.*
