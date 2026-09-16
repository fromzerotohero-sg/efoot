# Deploy

Procedura reale. Nessuna migration Stripe, nessuna “pulizia Edge Functions” in questo flusso.

## Ambienti

| Ambiente | Uso |
|----------|-----|
| Locale | `npm run dev` porta 4031, `.env.local` |
| Vercel Preview | branch. Analytics/install prompt off se `VERCEL_ENV=preview` |
| Staging UX V2 | progetto/env con `NEXT_PUBLIC_APP_ENV=staging` |
| Production | `efootball.fromzerotohero.io`. `NEXT_PUBLIC_APP_ENV` omesso o `production` |
| Backend Fastify | Solo locale/test. **Mai** in DNS/Vercel finché cutover non approvato |

Branch feature → preview/staging → validazione → merge controllato.

## Variabili minime produzione

Obbligatorie:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` (chiave **anon**)
- `SUPABASE_SERVICE_ROLE_KEY`
- `OPENAI_API_KEY`
- `NEXT_PUBLIC_METALGATE_LOGIN_URL`
- `NEXT_PUBLIC_METALGATE_API_URL`
- `METALGATE_API_KEY`

Consigliate:

- `OPENAI_MODEL=gpt-5.2`
- `NEXT_PUBLIC_APP_URL=https://efootball.fromzerotohero.io`
- `NEXT_PUBLIC_APP_NAME=From Zero To Hero`
- `CREDITS_ACCREDIT_API_KEY` (solo se il webhook accredito è collegato)

Gate:

- `PRELAUNCH_ACCESS_CODE` — se presente, dopo login si passa da `/access`
- `MAINTENANCE_MODE` / `MAINTENANCE_BYPASS_KEY`

Staging:

- `NEXT_PUBLIC_APP_ENV=staging`

Lista completa senza segreti: `.env.example`.

## Checklist dopo deploy

1. Login MetalGate → callback → app (o `/access` se gate on).
2. Saldo HP visibile; una chat da 2 HP scala il wallet.
3. Rosa: catalog picker + save slot.
4. Preview/staging: niente GA/Clarity, niente install prompt.
5. Non promuovere un preview che punta al wallet MetalGate sbagliato.

## Cosa non fare

- Non cancellare `AppLayoutShell` “per pulire il layout”.
- Non applicare SQL RLS/Edge Function da documenti storici.
- Non duplicare il progetto Supabase solo per UX.
- Non committare `.env.local` o chiavi in markdown.
- Non attivare il backend dormiente in produzione senza handoff Tommaso + fix P0.

Rollback: Vercel → deployment precedente. I dati utente restano sul DB eFootball / MetalGate.
