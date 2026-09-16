# Auth / MetalGate

Ingresso principale: **MetalGate SSO**. Supabase Auth resta fallback controllato, non il login primario.

## Flusso

```
/login → NEXT_PUBLIC_METALGATE_LOGIN_URL
      → /auth/callback
      → POST /api/auth/metalgate-callback
      → user_profiles.metalgate_user_id
      → localStorage metalgate_user + auth_token
      → /login-success → app
      → eventuale /access se PRELAUNCH_ACCESS_CODE è set
```

## Token API

`extractBearerToken` + `validateToken` (`lib/authHelper.js`):

1. `POST {NEXT_PUBLIC_METALGATE_API_URL}/sso/verify`
2. Se ok: user con metadata MetalGate
3. Altrimenti, salvo `forbidSupabaseFallback`, `supabase.auth.getUser(token)`

`user_id` nelle write API arriva dal token, non dal body.  
Eccezione: `POST /api/credits/accredit` (webhook, `CREDITS_ACCREDIT_API_KEY`).

## Route presenti

| Path / API | Ruolo |
|------------|--------|
| `/login`, `/auth/callback`, `/login-success` | SSO |
| `/forgot-password`, `/reset-password`, `/auth/magiclink-callback` | Legacy Supabase |
| `POST /api/auth/metalgate-callback` | Mapping profilo |
| `POST /api/auth/metalgate-verify` | Verify |
| `POST /api/metalgate-sync` | Sync MetalGate |

Nel backend dormiente queste route MetalGate sono **deferred** → HTTP 501 fino all’innesto di Tommaso.

## Non confondere

- Account (logout, lingua) ≠ Memoria Hero (dati di gioco su `user_profiles`)
- Email utente: in `auth.users`, **non** colonna su `user_profiles`
