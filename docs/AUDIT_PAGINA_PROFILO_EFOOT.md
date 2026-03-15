# Audit pagina Profilo (Impostazioni Profilo) – efoot-main

**Data:** 2025-03  
**Scope:** `app/impostazioni-profilo/page.jsx`, `app/api/user/profile/route.js`, `app/api/supabase/save-profile/route.js`

---

## 1. Flusso caricamento (GET profilo)

| Riga / blocco | Controllo | Esito |
|---------------|-----------|--------|
| 46 | Token: `localStorage.getItem('auth_token')` poi fallback `supabase.auth.getSession()` | OK (MetalGate + Supabase) |
| 55–58 | Se nessun token: `setLoading(false)` e `return` | **BUG:** utente resta sulla pagina con form vuoto; nessun redirect a login |
| 60–62 | `fetch('/api/user/profile', { headers: { Authorization: Bearer } })` | OK, metodo GET implicito |
| 65–67 | Se `!res.ok`: throw | OK; **miglioramento:** su 401 → redirect login |
| 69–85 | `profileData = await res.json()`; se oggetto valido → `setProfileData` + `setProfile` | OK; risposta API è il profilo diretto (non annidato) |
| 86–90 | catch: setError, finally: setLoading(false) | OK |
| 95–99 | `useEffect(() => fetchProfile(), [])` | OK, solo al mount (evita refetch che sovrascrivono modifiche) |

---

## 2. Flusso salvataggio (POST save-profile)

| Riga / blocco | Controllo | Esito |
|---------------|-----------|--------|
| 109–118 | Token come in fetchProfile; se manca → `router.push('/login')` | OK |
| 121–129 | `fetch(POST, body: JSON.stringify(profile), redirect: 'manual')` | OK; `redirect: 'manual'` evita che un 302 trasformi la richiesta in GET |
| 131–135 | Se redirect (302/303) → `router.push('/login')` e return | OK |
| 136–147 | Se `!response.ok`: messaggio 405 dedicato, altrimenti `response.json()` per error | OK; **miglioramento:** su 401 → redirect login |
| 149–197 | Se `data.profile`: aggiorna `setProfileData` e `setProfile` con valori salvati | OK; la risposta API include first_name, last_name, ecc. |
| 206–215 | Dopo save: eventi `knowledge-should-refresh`, `leaderboard-updated`; refresh-diagnostic | OK |
| 222–226 | catch: setError, toast, setTimeout clear error; finally: setSaving(false) | OK |

---

## 3. API GET /api/user/profile

| Riga / blocco | Controllo | Esito |
|---------------|-----------|--------|
| 18–21 | Token da header; se manca → 401 | OK |
| 23–26 | `validateToken` (Supabase + fallback MetalGate) | OK |
| 35–47 | Se `is_metalgate_user`: lookup `user_profiles` per `metalgate_user_id` → `user_id`; se non trovato → 404 | OK; utente MetalGate deve avere già una riga (es. da metalgate-callback) |
| 50–54 | `select('*')`, `eq('user_id', userId)`, `maybeSingle()` | OK |
| 61 | `return NextResponse.json(profile \|\| {})` | OK; body = oggetto profilo (non wrappato) |

---

## 4. API POST /api/supabase/save-profile

| Riga / blocco | Controllo | Esito |
|---------------|-----------|--------|
| 77–86 | Token, validateToken, userId | OK |
| 94–109 | Se MetalGate: lookup `user_id` da `metalgate_user_id`; se non trovato → 404 | OK |
| 119–120 | `req.json()` in try/catch → 400 se JSON non valido | OK |
| 232–237 | upsert su `user_profiles` con `.select(... first_name, last_name, ...)` | OK |
| 274–291 | Risposta: `{ success: true, profile: { ...campi } }` | OK; frontend può aggiornare stato da qui |

---

## 5. Correzioni applicate (post-audit)

1. **fetchProfile:** se non c’è token → `router.push('/login')` e return (non lasciare form vuoto senza redirect).
2. **fetchProfile:** se `res.status === 401` → `router.push('/login')` e return.
3. **fetchProfile:** se `res.status === 404` → considera “profilo non trovato”: imposta stato con valori vuoti così il form è compilabile; opzionale messaggio “Completa il profilo”.
4. **handleSave:** se `response.status === 401` → `router.push('/login')` e return (non solo messaggio di errore).
5. Nessuna modifica alla logica di aggiornamento stato da `data.profile` (già corretta).

---

## 6. Riepilogo cause possibili “la pagina profilo non funziona”

- Token assente o scaduto: senza redirect l’utente vede form vuoto o errore generico.
- 401 non gestito: utente non reindirizzato al login.
- 404 da GET profile (es. MetalGate senza riga in `user_profiles`): errore in pagina; con la gestione 404 il form può essere mostrato vuoto e l’utente può provare a salvare (se il backend crea la riga al primo save, va verificato a parte).
- Refetch al mount con dipendenze sbagliate: già risolto con `useEffect(..., [])`.
- Payload save con valori vecchi: già mitigato con fetch solo al mount; input controllati con `value={... ?? ''}`.

---

## 7. File toccati

- `app/impostazioni-profilo/page.jsx`: redirect su assenza token, 401 e 404 in fetchProfile; redirect su 401 in handleSave.
