# Sicurezza — stato reale

Questo documento descrive ciò che il codice e l’audit live mostrano, non una checklist “tutto a posto”.
I finding P0/P1 **non** si risolvono dentro lo sprint UX V2: workstream SECURITY dedicata.

## Auth

- Ingresso: MetalGate SSO (`NEXT_PUBLIC_METALGATE_LOGIN_URL`).
- API: Bearer token. `validateToken` verifica MetalGate `/sso/verify`, poi fallback Supabase Auth.
- Mapping locale: `user_profiles.metalgate_user_id`.
- Token in `localStorage` è debito noto; non migrare a cookie nello sprint UX.
- `SUPABASE_SERVICE_ROLE_KEY` solo server-side. `NEXT_PUBLIC_SUPABASE_ANON_KEY` deve essere la chiave **anon**, mai service_role.

**P0 docs:** `KEY_FIX.md` (rimosso) esponeva una service_role key in chiaro, anche come `NEXT_PUBLIC_SUPABASE_ANON_KEY`. Se quella chiave è ancora valida va **ruotata** su Supabase e su Vercel.

## Segreti

| Env | Visibilità |
|-----|------------|
| `NEXT_PUBLIC_*` | Browser |
| `SUPABASE_SERVICE_ROLE_KEY` | Solo server |
| `OPENAI_API_KEY` | Solo server |
| `METALGATE_API_KEY` | Solo server |
| `CREDITS_ACCREDIT_API_KEY` | Solo webhook accredito |
| `PRELAUNCH_ACCESS_CODE` / `MAINTENANCE_BYPASS_KEY` | Solo server |

## Rate limit

`lib/rateLimiter.js` è in-memory. Su Vercel multi-istanza non è una protezione forte. Non documentarlo come WAF/Redis.

## RLS / advisors (snapshot Master UX V2)

Non dichiarare “RLS su tutte le tabelle”.

**MetalGate (progetto separato)** — P0:

- RLS disabilitato su alcune tabelle public (`credentials`, `streamers`, …).
- RPC `add_credits` / `deduct_credits` / `process_referral_purchase` SECURITY DEFINER segnalate eseguibili da `anon`/`authenticated`.
- Colonna `password` su `credentials`: verificare formato e superficie.

**eFootball** — P0/P1:

- `atomic_slot_assignment` SECURITY DEFINER con `p_user_id` (non `auth.uid()` nel corpo letto).
- `get_user_id_by_email` SECURITY DEFINER.
- `card_advisor_*`: RLS enabled, nessuna policy; accesso previsto via route server.
- Leaked password protection Auth disabilitata (P1).

Non abilitare RLS “alla cieca”. Prima mappare chiamanti e policy.

## Edge Functions — quarantena

Rilevate ~12 Edge Functions eFootball con `verify_jwt=false`. Il Next.js corrente non le chiama per slug. Alcune usano tabelle legacy. **Non collegare, riscrivere o cancellare** durante UX V2.

## Analytics / cookie

Production carica Google Analytics e Microsoft Clarity da `app/layout.jsx` senza banner di consenso nel codice. Staging/preview li disattivano. Vedi [COOKIE.md](./COOKIE.md).

## Staging

- `NEXT_PUBLIC_APP_ENV=staging` o `VERCEL_ENV=preview`: no GA/Clarity, no install prompt, badge staging.
- Non puntare preview UX a wallet/RPC MetalGate di produzione senza decisione owner.
