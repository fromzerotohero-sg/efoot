# Funzionamento attuale: Profilo utente e Palestra Coach

**Data:** 2026-03-15  
**Scopo:** Documentazione esatta di come funziona il codice oggi (lettura/salvataggio profilo, token, Supabase, MetalGate).

---

## 1. Validazione token (`lib/authHelper.js`)

### `validateToken(token, supabaseUrl, anonKey)`

1. **Prima prova: MetalGate**  
   - Chiamata `POST` a `${NEXT_PUBLIC_METALGATE_API_URL}/sso/verify` con body `{ token }`.  
   - Se risposta `ok` e `metalgateData.valid && metalgateData.user`: costruisce un oggetto `userData` in formato “Supabase-like” con `user.id = metalgateData.user.id`, `user_metadata.is_metalgate_user = true`, e restituisce `{ userData, error: null }`.  
   - Se MetalGate fallisce (rete, non ok, dati mancanti): si ignora e si passa al fallback.

2. **Fallback: Supabase**  
   - `createClient(supabaseUrl, anonKey)` e `authClient.auth.getUser(token)`.  
   - Se nessun errore e `authResult.data?.user?.id`: restituisce `{ userData: authResult.data, error: null }`.  
   - Altrimenti restituisce `{ userData: null, error: ... }`.

**Ordine:** prima MetalGate, poi Supabase. Così, se il token è valido per entrambi, si usa l’identità MetalGate (e in API si risolve il profilo tramite `metalgate_user_id`).

### `extractBearerToken(req)`

- Legge header `Authorization` (case-insensitive).  
- Se il valore inizia con `"Bearer "`, restituisce la parte dopo "Bearer " (trim).  
- Altrimenti `null`.

---

## 2. GET profilo (`app/api/user/profile/route.js`)

1. Legge token con `extractBearerToken(request)`; se manca → **401**.  
2. Chiama `validateToken(token, ...)`; se errore o manca `userData.user.id` → **401**.  
3. `userId = userData.user.id` (può essere ID MetalGate o Supabase).  
4. Crea client Supabase con **service role**.  
5. **Se** `userData.user.user_metadata?.is_metalgate_user === true`:  
   - Query su `user_profiles` con `.eq('metalgate_user_id', userId)`, `.single()`, solo `user_id`.  
   - Se esiste una riga: `userId = existingProfile.user_id` (UUID Supabase).  
   - Se non esiste: risposta **404** “User profile not found”.  
6. Query profilo: `from('user_profiles').select('*').eq('user_id', userId).maybeSingle()`.  
7. In caso di errore query → **500**.  
8. Risposta: `NextResponse.json(profile || {}, { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' } })`.

**Export:** `dynamic = 'force-dynamic'` (route non cachata lato server).

---

## 3. POST salvataggio profilo (`app/api/supabase/save-profile/route.js`)

### GET (solo risposta 405)

- Qualsiasi richiesta **GET** su questa route risponde con **405**, body JSON `{ error: 'Method not allowed. Use POST to save profile.' }` e header `Allow: POST`.  
- Evita 405 poco chiari quando un redirect trasforma una POST in GET.

### POST

1. Token con `extractBearerToken(req)`; se manca → **401**.  
2. `validateToken(token, ...)`; se errore o manca `userData.user.id` → **401**.  
3. `userId = userData.user.id`.  
4. Client Supabase con **service role**.  
5. **Se** `userData.user.user_metadata?.is_metalgate_user`:  
   - Lookup come in GET profilo: `user_profiles` per `metalgate_user_id = userId`; se trovato, `userId = existingProfile.user_id`; se non trovato → **404**.  
6. Rate limit (config da `RATE_LIMIT_CONFIG['/api/supabase/save-profile']`).  
7. `req.json()` per leggere il body; validazione campi (lunghezze, tipi); costruzione `profileUpdate`.  
8. `upsert` su `user_profiles` con `onConflict: 'user_id'`.  
9. Risposta 200 con `{ success: true, profile: { id, profile_completion_score, profile_completion_level, first_name, last_name, ... } }` (campi restituiti come da `.select()` dopo l’upsert).

---

## 4. Pagina Impostazioni Profilo (`app/impostazioni-profilo/page.jsx`)

### Token in `fetchProfile` e `handleSave`

- `token = localStorage.getItem('auth_token')`.  
- `isMetalgateSession = !!localStorage.getItem('metalgate_user')`.  
- **Se** `!token && supabase && !isMetalgateSession`: si usa `supabase.auth.getSession()` e, se c’è sessione, `token = session.session.access_token`.  
- **Se** `metalgate_user` è presente e `auth_token` manca: **non** si usa `getSession()` (per non prendere un altro account Supabase); in `fetchProfile` si va in `if (!token)` → redirect a `/login`.  
- Se ancora `!token`: redirect a `/login` (in entrambi i flussi).

### Lettura profilo (`fetchProfile`)

- GET `/api/user/profile?t=${Date.now()}` con header `Authorization: Bearer ${token}` e `cache: 'no-store'`.  
- **401:** `setLoading(false)`, `router.push('/login')`, return.  
- **404:** si azzerano `profileData` e `profile` (form vuoto), `setLoading(false)`, return.  
- **!res.ok** (altri errori): throw con messaggio da i18n.  
- Risposta OK: `setProfileData` e `setProfile` con i dati ricevuti (con fallback `|| ''` / `|| null` / `|| []` dove serve).

### Quando si chiama `fetchProfile`

- **Al mount:** `useEffect(() => { fetchProfile() }, [])` (solo una volta, per non sovrascrivere modifiche non salvate).  
- **Ricarica manuale:** pulsante “Ricarica” che chiama `fetchProfile()`.  
- **Visibility:** quando `document.visibilityState === 'visible'` e c’è `auth_token` e la modal Palestra Coach è **chiusa** (`refetchOnVisibleRef.current === true`), si chiama `fetchProfile()` (per riallineare dopo ritorno su tab).

### Salvataggio (`handleSave`)

- POST a `/api/supabase/save-profile` con `body: JSON.stringify(profile)`, `redirect: 'manual'`.  
- Se `response.type === 'opaqueredirect'` o status 301/302/303 → `router.push('/login')`, return.  
- Se status **401** → `router.push('/login')`, return.  
- Se **405** → messaggio dedicato “Salvataggio non disponibile con questo tipo di richiesta. Usa il pulsante Salva.”  
- Altri errori: messaggio da body JSON se presente, altrimenti generico; throw.  
- 200: aggiornamento di `profileData` e `profile` con i campi restituiti in `data.profile`, toast di successo.

### Input e stato

- Tutti i campi del form sono controllati con `value={profile.xxx ?? ''}` (o equivalente) per evitare input non controllati.  
- Dopo il save, lo stato viene aggiornato con i valori restituiti dall’API (`data.profile`).

---

## 5. Palestra Coach (`components/CoachFeedbackChat.jsx`)

### Token e caricamento profilo (ad ogni apertura, `show === true`)

- Stessa logica token della pagina Profilo: `auth_token`; se manca e **non** c’è `metalgate_user` → `getSession()`; se manca e c’è `metalgate_user` → nessun getSession, quindi `!token` e si usa solo `externalProfile` se passato.  
- GET `/api/user/profile?t=${Date.now()}` con `Authorization: Bearer ${token}` e `cache: 'no-store'`.  
- Se `res.ok`: `setLoadedProfile(data)`.  
- Se non ok o errore: si usa `externalProfile` (profilo passato dalla pagina) se disponibile.

### Profilo usato nella chat

- `userProfile = loadedProfile || externalProfile` (profilo da API ha priorità su quello passato da props).  
- Il saluto e i dati mostrati (nome, squadra preferita, ecc.) derivano da `userProfile`.  
- Form dati tecnici (platform, connection_quality, pass_level, ecc.) e salvataggio tramite stessa API save-profile (stesso token e stesso flusso backend).

### Effetti dopo apertura

- `formJustOpenedRef` usato per inizializzare il form alla prima apertura senza resettare inutilmente `formSaved` quando `userProfile` cambia (es. dopo un save).

---

## 6. Riepilogo flusso dati

| Dove       | Token usato                    | GET profile              | POST save-profile        |
|-----------|---------------------------------|--------------------------|---------------------------|
| Backend   | Header `Authorization: Bearer`  | validateToken → MetalGate prima → lookup `metalgate_user_id` → select('*') → JSON + no-cache | Stesso token e stesso lookup → upsert → 200 + profile |
| Impostazioni Profilo | `auth_token` o getSession (solo se non metalgate) | `?t=...` + `cache: 'no-store'`; 401→login, 404→form vuoto | `redirect: 'manual'`; 301/302/303/401→login; 405→messaggio dedicato |
| Palestra Coach | Come sopra                     | `?t=...` + `cache: 'no-store'`; fallback a `externalProfile` | Stesso endpoint e stesso token |

---

## 7. Modifiche principali rispetto allo stato “primo commit”

- **authHelper:** ordine invertito: prima MetalGate, poi Supabase.  
- **Profile API:** `select('*')` (niente colonne inesistenti tipo `user_metadata`), header `Cache-Control: no-store, no-cache, must-revalidate`.  
- **save-profile:** handler GET esplicito che restituisce 405.  
- **Impostazioni Profilo:** `isMetalgateSession` per non usare getSession quando c’è metalgate; cache busting e `cache: 'no-store'`; redirect su 401/404; `redirect: 'manual'` su POST; messaggio 405 dedicato; fetch solo al mount + Ricarica + refetch on visibility (con modal chiusa).  
- **CoachFeedbackChat:** stessa logica token e stesso GET con cache busting; `formJustOpenedRef` per non resettare UX dopo save.

Per elenco puntuale delle modifiche e commit si veda `docs/MODIFICHE_FLUSSO_PROFILO_EFOOT.md` e `docs/AUDIT_PRIMO_COMMIT_E_SUPABASE.md`.
