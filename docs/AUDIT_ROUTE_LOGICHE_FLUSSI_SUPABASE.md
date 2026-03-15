# Audit: route, logiche, flussi e allineamento Supabase

Verifica di tutte le API che usano autenticazione e scrivono/leggono da Supabase, con focus su **identità utente** (Supabase Auth vs MetalGate) e **allineamento** a `user_profiles` / `auth.users`.

---

## 1. Flusso identità (Auth)

### 1.1 Token e risoluzione user_id

- **Supabase (email/password):** `validateToken` → `auth.getUser(token)` → `user.id` è l’UUID in `auth.users` → usato direttamente come `user_id` nelle tabelle.
- **MetalGate (SSO):** `validateToken` → `POST /sso/verify` → risposta con `user.id` = MetalGate UUID. Questo id **non** è in `auth.users`. Le route devono:
  1. Cercare in `user_profiles` la riga con `metalgate_user_id = user.id`.
  2. Usare il `user_id` di quella riga (UUID Supabase) per tutte le query su `user_profiles`, `matches`, `players`, `tasks`, ecc.

Se una route non fa il passo 1–2 per gli utenti MetalGate, usa il MetalGate UUID come `user_id` → **dati su tabella sbagliata** (nessuna riga o riga di un altro utente).

### 1.2 Header `X-Metalgate-Session`

- **Profilo e salvataggio profilo:** le route `GET /api/user/profile` e `POST /api/supabase/save-profile` leggono l’header `X-Metalgate-Session: 1`. Se presente, chiamano `validateToken(..., { forbidSupabaseFallback: true })`. Così, in sessione MetalGate, non si usa mai il fallback Supabase (evita di restituire/salvare sul profilo di un altro utente).
- **Altre route:** al momento **non** usano `forbidSupabaseFallback`; si appoggiano al fatto che il client invii il token MetalGate e che il lookup `metalgate_user_id → user_id` sia fatto.

---

## 2. Elenco route e allineamento

Tutte le route sotto (tranne `auth/metalgate-callback` e `metalgate-sync`) usano `validateToken` + `extractBearerToken`.  
**Lookup MetalGate:** per ogni route si indica se, in caso di `user_metadata.is_metalgate_user`, viene fatto il lookup su `user_profiles` per ottenere `user_id` da usare nelle query.

| Route | Lookup MetalGate | Note |
|-------|------------------|------|
| `GET /api/user/profile` | Sì | Usa anche `X-Metalgate-Session` + `forbidSupabaseFallback`. |
| `POST /api/supabase/save-profile` | Sì | Usa anche `X-Metalgate-Session` + `forbidSupabaseFallback`. |
| `GET|POST /api/supabase/save-ai-info` | Sì | Nessun `forbidSupabaseFallback`. |
| `POST /api/auth/metalgate-callback` | N/A | Crea/aggiorna profilo e auth user; usa `metalgate_user_id` e `user_id` (auth). |
| `GET /api/tasks/list` | Sì | |
| `POST /api/tasks/generate` | Sì (corretto) | In precedenza mancava il lookup; ora allineato. |
| `DELETE /api/supabase/delete-match` | Sì | |
| `GET|POST /api/extract-game-analysis` | Sì | |
| `GET /api/leaderboard` | Sì | |
| `POST /api/supabase/save-formation-layout` | Sì | |
| `POST /api/supabase/save-tactical-settings` | Sì | |
| `POST /api/refresh-diagnostic` | Sì | |
| `POST /api/extract-player` | Sì | |
| `GET /api/formation` | Sì | |
| `POST /api/supabase/save-player` | Sì | |
| `GET /api/matches` | Sì | |
| `GET /api/dashboard` | Sì | |
| `POST /api/save-coach-feedback` | Sì | |

---

## 3. Flusso MetalGate (login/registrazione)

1. **Frontend** (`app/auth/callback/page.jsx`): dopo redirect SSO, legge il token e chiama `POST /api/auth/metalgate-callback` con `{ token, action: 'login' | 'register' }`.
2. **Backend** (`app/api/auth/metalgate-callback/route.js`):
   - Chiama MetalGate `POST /sso/user-info` con il token.
   - Cerca in `user_profiles` una riga con `metalgate_user_id = user.id`.
   - **Se esiste:** aggiorna `is_metalgate_user`, `metalgate_user_id`, `updated_at`; risponde con successo (frontend salva sessione).
   - **Se non esiste e `action === 'register'`:** crea utente in `auth.users` con `auth.admin.createUser`, poi crea riga in `user_profiles` con `user_id` = id dell’utente auth, `metalgate_user_id` = id MetalGate, `first_name`/`ai_name` da username/email.
   - **Se non esiste e `action === 'login'`:** risponde 404 con `details: 'user_not_found'` (il frontend può ritentare con `action: 'register'`).
3. **Allineamento Supabase:** una sola riga per utente MetalGate in `user_profiles`; `user_id` = UUID in `auth.users`; `metalgate_user_id` = id restituito da MetalGate. Tutte le altre API usano `user_id` (dopo lookup dove serve).

---

## 4. Tabelle Supabase coinvolte

- **auth.users:** utenti Supabase (email, id). Gli utenti MetalGate hanno una riga creata da `metalgate-callback` (register).
- **user_profiles:** profilo giocatore; chiave `user_id` (FK verso auth.users); per MetalGate anche `metalgate_user_id` (univoco).
- **matches, players, formation_layout, team_tactical_settings, coaches, team_tactical_patterns, user_game_analysis, user_tactical_feedback, tasks, leaderboard_snapshots, ecc.:** tutte legate a `user_id` (UUID Supabase), mai al MetalGate UUID.

Le route che risolvono l’identità MetalGate → `user_id` sono quindi allineate a questo schema.

---

## 5. Fix applicato in questa audit

- **`POST /api/tasks/generate`:** aggiunto lookup MetalGate (stesso blocco usato in `tasks/list`, `dashboard`, ecc.). Senza di esso, per utenti MetalGate veniva usato il MetalGate UUID come `user_id` e i task venivano creati/associati in modo errato.

---

## 6. Riepilogo sicurezza e coerenza

- **Token:** estratto da header `Authorization: Bearer <token>`; validato con `validateToken` (prima MetalGate `/sso/verify`, poi eventuale Supabase `getUser`).
- **Profilo / Save profile:** in sessione MetalGate il client può inviare `X-Metalgate-Session: 1` per forzare l’uso del solo percorso MetalGate (niente fallback Supabase).
- **Tutte le route che leggono/scrivono per utente** risolvono correttamente `user_id` per MetalGate tramite `user_profiles.metalgate_user_id`.
- **metalgate-callback** è l’unico ingresso che crea/aggiorna l’associazione MetalGate ↔ auth.users ↔ user_profiles; le altre API si limitano a leggere/scrivere per `user_id` già risolto.

---

*Documento creato il 15 marzo 2026. Ultima verifica route: 15 marzo 2026.*
