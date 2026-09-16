# Backend `efoot-backend` — Accorgimenti prima del cutover

Integra [TOMMASO.md](./TOMMASO.md).  
Stato: **dormiente, TypeScript, testato**. Produzione = Next.js `app/api`.

---

## 1. Stato verificato

- `npm test` — suite di parità verdi
- `npm run typecheck` / `npm run build` — verdi
- Boot: `/health` → `{ ok: true, dormant: true }`; `/ready` → writes blocked, credits mock, metalgate not-implemented
- Guardia dormant: write bloccate **prima** di identity/AI/DB/crediti
- Inventario: `src/inventory.ts` (non più `.js`)
- Entry: `src/app.ts`, `src/server.ts`

## 2. Perimetro MetalGate — invariato

Route deferred → **501 by design** finché Tommaso non collega i provider:

- `auth/metalgate-callback`, `auth/metalgate-verify`, `metalgate-sync`
- `credits/accredit`

Cosa serve:

1. Verify token server-to-server (`/sso/verify`)
2. Mapping `metalgate_user_id → user_profiles.user_id`
3. Wallet interno balance/deduct/accredit con idempotenza (`reference_id`) come `lib/creditService.js`
4. Header legacy `x-metalgate-session`, `x-metalgate-user-id` in transizione

Finché MetalGate non è collegato, in live mode i crediti mock non addebitano (`applied: false`) — corretto.

## 3. P0 — bloccanti per l’accensione

| # | Cosa | Dove | Azione |
|---|------|------|--------|
| 1 | `bodyLimit` troppo basso | `src/app.ts` | Screenshot base64 fino a ~5MB → `bodyLimit` ≥ 6MB (vision/matches) |
| 2 | CORS assente | `src/app.ts` | `@fastify/cors` + allowlist `CORS_ORIGINS` |
| 3 | Status match save | `domains/matches/routes.ts` | Backend 201 vs frontend atteso 200 — allineare |
| 4 | Rate limit profilo | `src/rateLimiter.ts` | Allineare a 20/min come `/api/supabase/save-ai-info` |

## 4. P1 — sicurezza / robustezza

| # | Cosa | Dettaglio |
|---|------|-----------|
| 5 | `/inventory` e `/handoff/metalgate` | Pubblici anche in live → chiudere o solo dormant |
| 6 | Rate limiter in-memory | Serve TTL / store condiviso multi-istanza |
| 7 | Scritture JWT+RLS | Backend più sicuro di service-role Next; **verificare RLS** su ogni tabella scritta prima del cutover |
| 8 | Error envelope | Uniformare a `{ error }` consumato dal frontend |

## 5. P2 — pulizia

- Registrar starter-pack non collegato → non esporre
- `credits.transactions` senza UX → legacy
- Drift guard: costanti test vs frontend — valutare condivisione

## 6. DB ancora aperto

Revocare `EXECUTE` anon su `get_user_id_by_email`.

## 7. Strategia cutover

1. MetalGate identity + wallet in staging  
2. Fix P0  
3. Frontend: rewrite Next **una route alla volta** (es. notifications)  
4. E2e non-prod + rollback = togliere rewrite  
5. Mai big-bang  

## 8. TypeScript

Il runtime backend è già TypeScript. I file in `backend/types/` restano **contratti** per Tommaso; non sono un secondo runtime.
