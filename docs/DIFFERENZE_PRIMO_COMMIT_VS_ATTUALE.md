# Differenze: codice attuale vs codice madre (primo commit)

**Riferimento:** primo commit = `ff0d014` (Initial commit)  
**Data:** 2026-03-15

---

## 1. Supabase: cosa cambia tra primo commit e attuale

### 1.1 Schema tabella `user_profiles`

- **Lo schema della tabella** in Supabase (colonne, RLS, FK) **non è stato modificato** tra primo commit e oggi: il codice madre e quello attuale usano la stessa tabella `user_profiles` con `user_id`, `metalgate_user_id`, `first_name`, `last_name`, `favorite_team`, `team_name`, ecc.
- **Non esiste** la colonna `user_metadata` in `user_profiles` (né al primo commit né ora).

### 1.2 Cosa si aspettava il codice al primo commit (e il bug)

- In **`app/api/user/profile/route.js`** (primo commit) la query faceva:
  - `.select(\`id, user_id, metalgate_user_id, first_name, last_name, ..., user_metadata\`)`
- La colonna **`user_metadata`** **non esiste** in `user_profiles` → Postgres/Supabase restituiva errore → la route andava in **500**.
- **Oggi:** la stessa route usa `.select('*')`, quindi legge solo colonne realmente presenti e non dipende da `user_metadata` → niente 500 per quella causa.

### 1.3 Uso di Supabase oggi (invariato rispetto all’intento del primo commit)

- **GET profilo:** token → `validateToken` → se MetalGate, lookup su `user_profiles` per `metalgate_user_id` → poi query per `user_id` → risposta JSON. Stessa logica del primo commit; cambiano solo select (ora `*`) e header risposta (Cache-Control).
- **POST save-profile:** stesso flusso (token, validateToken, lookup MetalGate se necessario, upsert su `user_profiles` con `onConflict: 'user_id'`). Nel primo commit non c’era handler GET; oggi c’è un GET che risponde 405.
- **Tabelle coinvolte:** `user_profiles` (e, per altre funzionalità, `user_tactical_feedback`, `matches`, ecc.). Nessuna differenza di schema tra “primo commit” e “attuale” per queste tabelle.

In sintesi: **in Supabase** la differenza è solo **cosa il codice legge** (primo commit: select con `user_metadata` inesistente → 500; attuale: `select('*')` → ok). Schema e logica di lookup MetalGate restano allineati.

---

## 2. Codice: differenze per file (primo commit → attuale)

### 2.1 `lib/authHelper.js`

| Primo commit (ff0d014) | Attuale |
|------------------------|--------|
| **Prima** prova **Supabase** (`authClient.auth.getUser(token)`). | **Prima** prova **MetalGate** (`POST .../sso/verify` con `{ token }`). |
| **Poi**, solo se Supabase fallisce, prova MetalGate. | **Poi**, solo se MetalGate non è ok, prova Supabase. |
| Se il token è valido per Supabase, restituisce subito l’utente Supabase (rischio: profilo “altro” se stesso token vale per MetalGate). | Se il token è valido per MetalGate, restituisce subito l’utente MetalGate (stesso formato `user_metadata.is_metalgate_user`); così le API usano il profilo legato a `metalgate_user_id`. |
| `extractBearerToken`: uguale. | `extractBearerToken`: uguale. |

---

### 2.2 `app/api/user/profile/route.js` (GET)

| Primo commit (ff0d014) | Attuale |
|------------------------|--------|
| `.select(\`id, user_id, metalgate_user_id, first_name, last_name, nickname, current_division, favorite_team, team_name, ai_name, how_to_remember, hours_per_week, common_problems, leaderboard_consent, profile_completion_score, profile_completion_level, created_at, updated_at, **user_metadata**\`)` | `.select('*')` |
| **user_metadata** non esiste in tabella → **500**. | Nessuna colonna inesistente → nessun 500 per questo motivo. |
| Risposta: `NextResponse.json(profile \|\| {})` senza header. | Risposta: `NextResponse.json(profile \|\| {}, { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' } })` |
| Logica token e lookup MetalGate: identica. | Logica token e lookup MetalGate: identica. |

---

### 2.3 `app/api/supabase/save-profile/route.js` (POST)

| Primo commit (ff0d014) | Attuale |
|------------------------|--------|
| **Solo** `export async function POST(req) { ... }`. Nessun handler GET. | Aggiunto **`export async function GET()`** che restituisce **405** con body `{ error: 'Method not allowed. Use POST to save profile.' }` e header `Allow: POST`. |
| Una richiesta GET (es. dopo redirect) poteva dare 405 non gestito in modo chiaro. | GET gestito in modo esplicito; il frontend può mostrare un messaggio dedicato. |
| Logica POST (token, validateToken, lookup MetalGate, rate limit, upsert): identica. | Logica POST: identica. |

---

### 2.4 `app/impostazioni-profilo/page.jsx`

| Primo commit (ff0d014) | Attuale |
|------------------------|--------|
| `fetchProfile` **dentro** un unico `useEffect`, dipendenze `[router]`. Nessun `useCallback`. | `fetchProfile` in **`useCallback`** (dipendenze `[t]`); **`useEffect(() => { fetchProfile() }, [])`** — fetch **solo al mount** per non sovrascrivere modifiche non salvate. |
| Token: `auth_token`; se c’è token e `metalgate_user`, legge `userId` da lì; **altrimenti** sempre **getSession()**. | Token: `auth_token`; **se c’è `metalgate_user`** (`isMetalgateSession`) **non** si usa getSession() se manca token → si va a redirect login. Se non metalgate, getSession() come fallback. |
| Nessun redirect esplicito su 401/404. | **401** → `router.push('/login')`. **404** → form azzerato (profilo non trovato), nessun throw. |
| Fetch: `fetch('/api/user/profile', { headers })` — nessun cache busting. | Fetch: `fetch(\`/api/user/profile?t=${Date.now()}\`, { headers, cache: 'no-store' })`. |
| Nessun pulsante “Ricarica”. | Pulsante **“Ricarica”** che chiama `fetchProfile()`. |
| `handleSave`: fetch POST **senza** `redirect: 'manual'`; gestione errori generica. | `handleSave`: **`redirect: 'manual'`**; se 301/302/303 o 401 → redirect a login; se **405** → messaggio “Salvataggio non disponibile con questo tipo di richiesta. Usa il pulsante Salva.” |
| Nessun refetch al ritorno su tab. | **Refetch on visibility** quando la tab diventa visibile e la modal Palestra Coach è chiusa. |
| Input: alcuni `value` senza `?? ''`. | Input con **`value={profile.xxx ?? ''}`** (o equivalente) per evitare input non controllati. |

---

### 2.5 `components/CoachFeedbackChat.jsx`

| Primo commit (ff0d014) | Attuale |
|------------------------|--------|
| Token: se c’è `auth_token` legge `userId` da `metalgate_user`; **altrimenti** sempre **getSession()**. Richiede **token e userId** per chiamare l’API (senza userId MetalGate non fa fetch). | Stessa logica ma con **isMetalgateSession**: se c’è `metalgate_user` **non** si usa getSession() se manca token; si usa solo `externalProfile` se passato. |
| Fetch: `fetch('/api/user/profile', { headers })` — nessun cache busting. | Fetch: **`/api/user/profile?t=${Date.now()}`** e **`cache: 'no-store'`**. |
| Effetti dopo apertura: dipendenze che potevano resettare form/messaggi al cambio di `userProfile`. | Uso di **`formJustOpenedRef`** (e simili) per non resettare formSaved/messaggi quando il profilo si aggiorna dopo un save. |

---

## 3. Riepilogo a colpo d’occhio

| Aspetto | Primo commit (ff0d014) | Codice attuale |
|---------|------------------------|----------------|
| **Supabase – profile API** | Select con **user_metadata** (colonna inesistente) → **500** | **select('*')** → nessun 500; header **Cache-Control** no-store |
| **Supabase – save-profile** | Solo POST; GET non gestito | GET → **405** esplicito; POST invariato |
| **authHelper** | **Supabase prima**, MetalGate fallback | **MetalGate prima**, Supabase fallback |
| **Pagina profilo – token** | getSession() sempre se manca auth_token | Con **metalgate_user** non si usa getSession() se manca token → login |
| **Pagina profilo – fetch** | Senza ?t= e senza cache: 'no-store' | **?t=Date.now()** e **cache: 'no-store'** |
| **Pagina profilo – quando fetch** | Solo in useEffect con [router] | **Solo al mount** + Ricarica + **refetch on visibility** (modal chiusa) |
| **Pagina profilo – save** | Senza redirect: 'manual'; errori generici | **redirect: 'manual'**; 301/302/303/401 → login; **405** → messaggio dedicato |
| **Palestra Coach – token** | getSession() se non token; richiede userId | **isMetalgateSession**; stesso criterio della pagina profilo |
| **Palestra Coach – fetch** | Senza cache busting | **?t=** e **cache: 'no-store'** |
| **Palestra Coach – UX dopo save** | Possibile reset form/messaggi | **formJustOpenedRef** per evitare reset |

---

## 4. Riferimenti

- **Sintesi Prima/Dopo:** `docs/DIFFERENZE_PRIMA_DOPO.md`
- **Stato codice al primo commit e Supabase:** `docs/AUDIT_PRIMO_COMMIT_E_SUPABASE.md`
- **Funzionamento attuale dettagliato:** `docs/FUNZIONAMENTO_PROFILO_E_PALESTRA_ATTUALE.md`
- **Modifiche applicate al flusso profilo:** `docs/MODIFICHE_FLUSSO_PROFILO_EFOOT.md`
