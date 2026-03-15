# Differenze: Prima e Dopo

**Prima** = codice al primo commit (`ff0d014` – Initial commit)  
**Dopo** = codice attuale  
**Data:** 2026-03-15

---

## Supabase

| Aspetto | Prima | Dopo |
|--------|--------|------|
| **Schema `user_profiles`** | Invariato (nessuna colonna `user_metadata`) | Invariato |
| **Profile API – select** | `.select(..., user_metadata)` → colonna inesistente → **500** | `.select('*')` → nessun 500 |
| **Profile API – risposta** | `NextResponse.json(profile \|\| {})` senza header | Stessa risposta + header `Cache-Control: no-store, no-cache, must-revalidate` |
| **Save-profile – GET** | Nessun handler GET (405 implicito) | Handler GET esplicito → 405 con messaggio e `Allow: POST` |
| **Logica lookup MetalGate** | Identica (metalgate_user_id → user_id) | Identica |

---

## `lib/authHelper.js`

| Aspetto | Prima | Dopo |
|--------|--------|------|
| **Ordine validazione** | Prima **Supabase** (`getUser(token)`), poi **MetalGate** (`/sso/verify`) | Prima **MetalGate**, poi **Supabase** |
| **Token valido per entrambi** | Si restituiva l’utente Supabase → rischio profilo “altro” (es. Giovanni) | Si restituisce l’utente MetalGate → profilo legato a `metalgate_user_id` (es. attilio) |
| **extractBearerToken** | Uguale | Uguale |

---

## `app/api/user/profile/route.js` (GET)

| Aspetto | Prima | Dopo |
|--------|--------|------|
| **Select** | Colonne esplicite incluso **user_metadata** (inesistente) → **500** | **`.select('*')`** → ok |
| **Risposta** | Solo body JSON | Body JSON + **Cache-Control** no-store |
| **Token e lookup MetalGate** | Uguale | Uguale |

---

## `app/api/supabase/save-profile/route.js`

| Aspetto | Prima | Dopo |
|--------|--------|------|
| **GET** | Non gestito | **GET()** → 405 con messaggio e header `Allow: POST` |
| **POST** | Uguale (token, validateToken, lookup, rate limit, upsert) | Uguale |

---

## `app/impostazioni-profilo/page.jsx`

| Aspetto | Prima | Dopo |
|--------|--------|------|
| **fetchProfile** | Dentro un solo `useEffect`, deps `[router]`; nessun useCallback | **useCallback**; **useEffect** solo al mount `[]` → niente refetch che sovrascrive modifiche |
| **Token** | `auth_token`; altrimenti sempre **getSession()** | `auth_token`; se **metalgate_user** presente **non** si usa getSession() se manca token → redirect login |
| **401 / 404** | Nessun redirect; throw generico | **401** → `router.push('/login')`; **404** → form azzerato |
| **URL e cache GET profilo** | `fetch('/api/user/profile', { headers })` | `fetch(\`/api/user/profile?t=${Date.now()}\`, { headers, cache: 'no-store' })` |
| **Ricarica** | Nessun pulsante | Pulsante **Ricarica** che chiama `fetchProfile()` |
| **handleSave** | POST senza `redirect`; errori generici | **redirect: 'manual'**; 301/302/303/401 → login; **405** → messaggio dedicato |
| **Refetch al ritorno su tab** | No | **Sì** on visibility (con modal Palestra chiusa) |
| **Input** | Alcuni senza `?? ''` | **value={profile.xxx ?? ''}** (o equivalente) |

---

## `components/CoachFeedbackChat.jsx`

| Aspetto | Prima | Dopo |
|--------|--------|------|
| **Token** | getSession() se non c’è token; richiede token **e** userId per fetch | **isMetalgateSession**: con metalgate_user non getSession() se manca token; fallback a externalProfile |
| **Fetch profilo** | `fetch('/api/user/profile', { headers })` | `fetch(\`/api/user/profile?t=${Date.now()}\`, { headers, cache: 'no-store' })` |
| **Dopo save / cambio profilo** | Dipendenze potevano resettare form e messaggi | **formJustOpenedRef** (e simili) per non resettare |

---

## Riepilogo unico: Prima → Dopo

| # | Prima | Dopo |
|---|--------|------|
| 1 | Profile API: select con **user_metadata** → **500** | **select('*')** + Cache-Control → ok |
| 2 | authHelper: **Supabase prima** → profilo “altro” con login MetalGate | **MetalGate prima** → profilo MetalGate |
| 3 | Save-profile: GET non gestito | GET → **405** esplicito |
| 4 | Pagina profilo: getSession() sempre se manca token | Con metalgate **no** getSession() → login |
| 5 | Pagina profilo: nessun cache busting | **?t=** + **cache: 'no-store'** |
| 6 | Pagina profilo: fetch in useEffect([router]) | Fetch **solo al mount** + Ricarica + refetch on visibility |
| 7 | Pagina profilo: save senza redirect manuale | **redirect: 'manual'**; 401/405 gestiti |
| 8 | Palestra Coach: come sopra (token, fetch) | **isMetalgateSession** + cache busting + **formJustOpenedRef** |

---

## Riferimenti

- Dettaglio per file: **`docs/DIFFERENZE_PRIMO_COMMIT_VS_ATTUALE.md`**
- Stato primo commit e Supabase: **`docs/AUDIT_PRIMO_COMMIT_E_SUPABASE.md`**
- Funzionamento attuale: **`docs/FUNZIONAMENTO_PROFILO_E_PALESTRA_ATTUALE.md`**
