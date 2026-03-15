# Documentazione modifiche – Flusso profilo (Impostazioni Profilo) efoot-main

**Obiettivo:** far funzionare correttamente lettura e salvataggio del profilo (nome/cognome ecc.), in particolare per utenti MetalGate, evitando che in UI resti visibile un profilo diverso (es. "Giovanni Guida" invece di "attilio" / "attilio campione") dopo save o refresh.

**Stato:** dopo le modifiche elencate il problema può persistere; questo documento serve per debug e per allineare chi interviene dopo.

---

## 1. File modificati e modifiche (in ordine logico)

### 1.1 `lib/authHelper.js`

| Modifica | Prima | Dopo | Motivo |
|----------|--------|------|--------|
| Ordine validazione token | Prima Supabase `getUser(token)`, poi fallback MetalGate `/sso/verify` | **Prima MetalGate `/sso/verify`**, poi fallback Supabase `getUser(token)` | Se il token è valido per Supabase (es. JWT Supabase), prima si restituiva l’utente Supabase e le API usavano `user_id` diretto (profilo "Giovanni"). Non si faceva il lookup per `metalgate_user_id`, quindi si leggeva/salvava il profilo sbagliato. Provando prima MetalGate si usa il profilo collegato a MetalGate quando il token è valido per MetalGate. |

**Riferimento:** `validateToken(token, supabaseUrl, anonKey)` – blocco try/catch con fetch a MetalGate spostato prima del blocco Supabase.

---

### 1.2 `app/api/user/profile/route.js` (GET profilo)

| Modifica | Prima | Dopo | Motivo |
|----------|--------|------|--------|
| Select colonne | Select esplicito di colonne (inclusa `user_metadata` in passate versioni, poi rimossa) | `.select('*')` | Evitare 500 se una colonna non esiste (es. `user_metadata` assente in `user_profiles`). |
| Risposta GET | `NextResponse.json(profile \|\| {})` | `NextResponse.json(profile \|\| {}, { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' } })` | Disabilitare cache browser sulla risposta del profilo. |

**Logica invariata:** token da header → `validateToken` → se `user_metadata?.is_metalgate_user` lookup `user_profiles` per `metalgate_user_id` e uso di quel `user_id` → query `user_profiles` per `user_id` → JSON profilo.

---

### 1.3 `app/api/supabase/save-profile/route.js` (POST salvataggio)

| Modifica | Prima | Dopo | Motivo |
|----------|--------|------|--------|
| Handler GET | Nessun handler GET (405 implicito da framework) | `export async function GET()` che restituisce `405` con body JSON `{ error: 'Method not allowed. Use POST to save profile.' }` e header `Allow: POST` | Dare risposta 405 esplicita e leggibile quando qualcosa invia GET su save-profile (es. redirect che trasforma POST in GET). |

**Logica invariata:** token → `validateToken` → se MetalGate lookup `user_id` da `metalgate_user_id` → rate limit → `req.json()` → validazione campi → `upsert` su `user_profiles` con `onConflict: 'user_id'` → risposta con `profile` aggiornato.

---

### 1.4 `app/impostazioni-profilo/page.jsx`

#### Token e fallback sessione

| Modifica | Prima | Dopo | Motivo |
|----------|--------|------|--------|
| Lettura token in `fetchProfile` | `token = localStorage.getItem('auth_token')`; se manca, `supabase.auth.getSession()` | Stesso, ma **se esiste `metalgate_user` in localStorage non si usa mai `getSession()`**: `const isMetalgateSession = !!localStorage.getItem('metalgate_user')`; fallback Supabase solo se `!isMetalgateSession` | Se l’utente ha fatto login MetalGate (`metalgate_user` presente) ma `auth_token` è assente, non usare la sessione Supabase (che può essere un altro account, es. Giovanni); si va a login. |
| Stessa logica in `handleSave` | Token da `auth_token` o `getSession()` | Stessa regola: con `metalgate_user` non si usa `getSession()` | Allineare il token usato per il salvataggio a quello che si vuole per il profilo MetalGate. |

#### Redirect e gestione errori in `fetchProfile`

| Modifica | Prima | Dopo | Motivo |
|----------|--------|------|--------|
| Nessun token | Solo `setLoading(false)` e `return` | `setLoading(false)` + `router.push('/login')` + `return` | Non lasciare form vuoto senza redirect. |
| Risposta 401 | Throw generico | `setLoading(false)` + `router.push('/login')` + `return` | Reindirizzare a login su token non valido. |
| Risposta 404 | Throw generico | Impostare `setProfileData(null)` e `setProfile({ ... })` con valori vuoti, `setLoading(false)`, `return` | Profilo non trovato (es. MetalGate senza riga): mostrare form vuoto compilabile invece di errore generico. |

#### Cache e URL GET profilo

| Modifica | Prima | Dopo | Motivo |
|----------|--------|------|--------|
| Fetch GET profilo | `fetch('/api/user/profile', { headers: { Authorization: ... } })` | `fetch(\`/api/user/profile?t=${Date.now()}\`, { headers: { Authorization: ... }, cache: 'no-store' })` | Evitare che il browser riusi una risposta GET profilo cachata (es. di un altro account). |

#### Salvataggio (`handleSave`)

| Modifica | Prima | Dopo | Motivo |
|----------|--------|------|--------|
| Redirect 302/303 | Non gestito esplicitamente | Se `response.type === 'opaqueredirect'` o status 301–303 → `router.push('/login')` e return | Con `redirect: 'manual'` non seguire il redirect; in caso di redirect reindirizzare a login. |
| Risposta 401 | Solo messaggio di errore | `router.push('/login')` e return | Reindirizzare a login su token scaduto/non valido. |
| Opzioni fetch POST | Senza `redirect` | `redirect: 'manual'` | Evitare che un 302 trasformi la richiesta in GET (e quindi 405). |
| Messaggio 405 | Generico | Dedicato: "Salvataggio non disponibile con questo tipo di richiesta. Usa il pulsante Salva." | Messaggio chiaro se arriva 405. |

#### Caricamento iniziale e refetch

| Modifica | Prima | Dopo | Motivo |
|----------|--------|------|--------|
| `useEffect` che chiama `fetchProfile` | Dipendenze `[fetchProfile]` (quindi refetch quando cambia referenza di `fetchProfile`, es. per `t`) | `useEffect(() => { fetchProfile() }, [])` (solo al mount) con eslint-disable per exhaustive-deps | Evitare refetch dopo ogni re-render che cambia `fetchProfile`; altrimenti il refetch sovrascrive le modifiche non salvate (es. nome cambiato in "attilio" che torna "Giovanni"). |

#### Altri fix già presenti (per completezza)

- Input con `value={profile.xxx ?? ''}` per evitare componenti non controllati.
- Gestione errore in `handleSave`: `response.json()` in try/catch per risposte non JSON.
- i18n per etichetta "Divisione attuale" con `t('currentDivision')`.
- Pulsante "Ricarica" che chiama `fetchProfile()`.
- Loading full-page solo quando `loading && !profileData`.

---

## 2. Flusso attuale (sintesi)

1. **Lettura profilo (pagina / Ricarica)**  
   Token: `localStorage.auth_token`; se manca e **non** c’è `metalgate_user` → `getSession()`; se manca e c’è `metalgate_user` → redirect a login.  
   GET `/api/user/profile?t=...` con `cache: 'no-store'`.  
   Backend: `validateToken` (prima MetalGate, poi Supabase) → se MetalGate lookup `user_id` da `metalgate_user_id` → query `user_profiles` per `user_id` → JSON profilo.  
   Frontend: `setProfileData` e `setProfile` con la risposta.

2. **Salvataggio (Salva)**  
   Stessa logica token (no fallback Supabase se c’è `metalgate_user`).  
   POST `/api/supabase/save-profile` con `body: JSON.stringify(profile)`, `redirect: 'manual'`.  
   Backend: stesso `validateToken` e stesso lookup MetalGate → `upsert` su `user_profiles` con `user_id` risolto → risposta con `profile` aggiornato.  
   Frontend: su 301/302/303 o 401 → redirect a login; su 200 → aggiornare stato da `data.profile`.

3. **Identità e profilo**  
   In Supabase esistono due profili con cognome "Guida": uno con `metalgate_user_id` (profilo MetalGate, es. first_name "attilio") e uno con `metalgate_user_id` null (profilo solo Supabase, es. first_name "Giovanni").  
   L’obiettivo delle modifiche è usare sempre il profilo MetalGate quando il token è valido per MetalGate (anche se valido anche per Supabase), tramite: (1) MetalGate prima in `validateToken`, (2) nessun fallback a `getSession()` quando è presente `metalgate_user`.

---

## 3. Cosa verificare se ancora non funziona

1. **Token effettivamente inviato**  
   In DevTools → Network: per GET `/api/user/profile` e POST `/api/supabase/save-profile` controllare che l’header `Authorization: Bearer <token>` sia presente e che il token non sia vuoto.

2. **Risposta GET profilo**  
   Sempre in Network: aprire la richiesta GET a `/api/user/profile` e controllare il **body della risposta** (es. `first_name`, `last_name`). Se lì compare ancora "Giovanni", il problema è lato backend (quale `user_id` viene usato dopo `validateToken` e lookup MetalGate).

3. **MetalGate verify**  
   Verificare che `NEXT_PUBLIC_METALGATE_API_URL` sia corretto e che l’endpoint `/sso/verify` risponda quando si invia il token usato dall’app (stesso token che vedi in Authorization). Se MetalGate non è raggiungibile o risponde non ok, `validateToken` usa il fallback Supabase e può restituire l’altro utente.

4. **localStorage**  
   In Console: `localStorage.getItem('auth_token')` e `localStorage.getItem('metalgate_user')`. Se dopo login MetalGate uno dei due manca, il flusso può usare la sessione Supabase (se consentita) e mostrare l’altro profilo.

5. **Riga corretta in Supabase**  
   In `user_profiles` verificare quale riga ha `metalgate_user_id` uguale all’id restituito da MetalGate verify e che `first_name`/`last_name` in quella riga siano quelli attesi dopo un save.

---

## 4. File toccati (elenco)

- `lib/authHelper.js` – ordine MetalGate prima di Supabase in `validateToken`
- `app/api/user/profile/route.js` – `select('*')`, header `Cache-Control`
- `app/api/supabase/save-profile/route.js` – handler GET 405
- `app/impostazioni-profilo/page.jsx` – token/metalgate_user, redirect, cache busting, redirect manual, useEffect `[]`, gestione 401/404, messaggio 405, ecc.

Documenti di supporto:

- `docs/AUDIT_PAGINA_PROFILO_EFOOT.md` – audit iniziale e correzioni
- `docs/MODIFICHE_FLUSSO_PROFILO_EFOOT.md` – questo documento
- **`docs/FUNZIONAMENTO_PROFILO_E_PALESTRA_ATTUALE.md`** – descrizione esatta del funzionamento attuale del codice (token, route, pagina profilo, Palestra Coach)

---

## 5. Commit di riferimento (per git blame / storia)

- fix(profilo): fetch solo al mount per non sovrascrivere modifiche non salvate  
- fix(profilo): handler GET save-profile 405 + redirect manuale per evitare POST->GET  
- fix(profilo): redirect su no-token/401, gestione 404 + audit doc  
- fix(profilo): no cache GET profile, prefer auth_token se metalgate_user (evita profilo sbagliato)  
- fix(auth): validateToken prova MetalGate prima di Supabase (profilo corretto dopo login)

(Eventuali altri commit su rate limit refresh-diagnostic, input `?? ''`, i18n, ecc. sono in cronologia git.)
