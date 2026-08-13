# Auth — contratto corrente

Ingresso principale: **MetalGate SSO**. Supabase Auth resta fallback controllato, non il login primario.

## Flusso

```
/login → NEXT_PUBLIC_METALGATE_LOGIN_URL
      → /auth/callback
      → POST /api/auth/metalgate-callback
      → user_profiles.metalgate_user_id
      → localStorage metalgate_user + auth_token
      → /login-success → app
```

`POST /api/auth/metalgate-callback` chiama `{METALGATE_API}/sso/user-info` e mappa/crea il profilo locale con service role.

## Token API

`extractBearerToken` + `validateToken` (`lib/authHelper.js`):

1. `POST {NEXT_PUBLIC_METALGATE_API_URL}/sso/verify`
2. Se ok: user con `user_metadata.is_metalgate_user`
3. Altrimenti, salvo `forbidSupabaseFallback`, `supabase.auth.getUser(token)`

`user_id` nelle write API arriva dal token, non dal body. Eccezione: `POST /api/credits/accredit` (webhook, `CREDITS_ACCREDIT_API_KEY`).

## Route ancora presenti

- `/forgot-password`, `/reset-password`, `/auth/magiclink-callback` — legacy Supabase
- `/api/metalgate-sync` — sync/magic link lato MetalGate

Non cambiare SSO, storage token o mapping ID nello sprint UX senza prompt auth.

## UX V2

Profilo esce dalla nav primaria. Account (logout, lingua) ≠ Memoria Hero (`user_profiles` di gioco). I dati restano.
