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

## Riferimenti rapidi

| Bug | File principale | Stato |
|-----|-----------------|--------|
| Profile API 500 | `app/api/user/profile/route.js` | Risolto |
| Chat launcher touch null | `components/AssistantChat.jsx` | Risolto |
| Profilo UX ≠ Supabase (nome/squadra) | token + authHelper + profile/save-profile | Documentato / da verificare se persiste |
| Rate limit 429 refresh-diagnostic | `lib/rateLimiter.js`, `app/api/refresh-diagnostic/route.js` | Risolto |
| Callback MetalGate 404 / body stream | `app/auth/callback/page.jsx` | Risolto |

---

## Documentazione correlata

- **`docs/FUNZIONAMENTO_PROFILO_E_PALESTRA_ATTUALE.md`** — Funzionamento esatto del codice (token, API, Impostazioni Profilo, Palestra Coach).
- **`docs/MODIFICHE_FLUSSO_PROFILO_EFOOT.md`** — Elenco modifiche al flusso profilo e commit di riferimento.

---

*Ultimo aggiornamento: 14 marzo 2026.*
