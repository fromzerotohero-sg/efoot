# Backend `efoot-backend` — Note operative per Tommaso

Data: 2026-09 · Stato: **dormiente, testato, sicuro** · Autori audit: Kimi (verifica completa)

Questo documento integra `handoff/TOMMASO.md` con i risultati dell'audit tecnico eseguito sul backend (test eseguiti davvero, boot reale, confronto contratti 1:1 con il frontend Next).

---

## 1. Stato verificato (non dichiarato — testato)

- `npm test` → **132/132 test verdi** (22 suite, incluse parità per dominio)
- Boot reale senza env: `/health` → `{ ok: true, dormant: true }`; `/ready` → `writes: blocked, credits: mock, metalgate: not-implemented`
- Guardia dormiente: `POST /v1/matches` → **403 prima di qualsiasi side effect** (identità/AI/DB/crediti). Anche se qualcuno lo accende per errore, non scrive nulla
- Copertura route: tutte le ~61 route `app/api/` sono catalogate in `src/inventory.js` (test di inventario le diff-a dal filesystem)
- Sicurezza base: nessun secret hardcoded, nessun log di token, nessun CORS permissivo, dormant forza loopback anche con `HOST=0.0.0.0`

## 2. Il tuo perimetro (MetalGate) — invariato

Come da TOMMASO.md, manca l'integrazione MetalGate: oggi queste route rispondono **501 by design**:

- `auth/metalgate-callback`, `auth/metalgate-verify`, `metalgate-sync`
- `credits/accredit` (webhook accredito wallet)

Cosa serve dal lato MetalGate per completare:

1. **Verifica token**: endpoint `/sso/verify` (o equivalente) chiamabile server-to-server con il Bearer dell'utente → risposta con identità utente MetalGate
2. **Mapping identità**: il backend deve risolvere `metalgate_user_id → user_profiles.user_id` (il frontend oggi lo fa via service-role lookup su `user_profiles`; vedi `app/api/credits/usage/route.js:61-70` per il contratto attuale)
3. **Wallet**: endpoint interni `balance / deduct / accredit` server-to-server, con la stessa semantica di idempotenza del frontend (`reference_id` univoco per operazione — vedi `lib/creditService.js`, pattern `accreditPurchase`/`accreditBonus`)
4. Header legacy da rispettare in transizione: `x-metalgate-session`, `x-metalgate-user-id` (usati da `app/api/coach-feedback-chat/route.js:199-207`)

Fintanto che MetalGate non è collegato, il backend in modalità live **non addebita nulla** (credits mock `applied: false`) — comportamento corretto, non un bug.

## 3. Accorgimenti tecnici da applicare (prima del cutover)

### P0 — bloccanti per l'accensione

| # | Cosa | Dove | Dettaglio |
|---|------|------|-----------|
| 1 | **bodyLimit** troppo basso | `src/app.js:116` | Fastify default = 1MB. Le route vision/matches portano screenshot base64 fino a 5MB → impostare `bodyLimit: 6 * 1024 * 1024` (globale o per-route su vision + matches). Senza, gli upload falliscono con 413 |
| 2 | **CORS** assente | `src/app.js` | Nessun plugin CORS: sicuro ora, ma al cutover il browser blocca tutto. Aggiungere `@fastify/cors` con allowlist da env `CORS_ORIGINS` (frontend Vercel + eventuale dominio prod), `credentials: false` (auth via Bearer) |
| 3 | Status code diverso | `src/domains/matches/routes.js:14` | Backend risponde **201**, il frontend oggi si aspetta **200** da `POST /api/supabase/save-match`. Allineare a 200 (o adattare il frontend al cutover) |
| 4 | Rate limit diverso | `src/rateLimiter.js:33` | `users.profile.save` = 30/min; il frontend `/api/supabase/save-ai-info` è **20/min** (`lib/rateLimiter.js:188-190`). Allineare a 20 |

### P1 — sicurezza/robustezza

| # | Cosa | Dove | Dettaglio |
|---|------|------|-----------|
| 5 | **Endpoint interni pubblici** | `src/dormant.js:42`, `src/app.js:150-184` | `/inventory` e `/handoff/metalgate` descrivono l'architettura interna e restano pubblici **anche in live mode**. Chiuderli dietro auth admin o esporli solo in dormant |
| 6 | Rate limiter in-memory | `src/rateLimiter.js` | Mappa a livello di modulo senza sweep di scadenza: in un processo long-running cresce all'infinito. Aggiungere expiry/TTL (o `@fastify/rate-limit`) |
| 7 | **Modello di scrittura cambiato** | `src/readOnlySupabase.js:60-77` | Il backend scrive con **JWT utente + RLS**, il frontend oggi usa service-role. Più sicuro, MA: prima del cutover va fatta una **verifica RLS su ogni tabella scritta** — ogni policy mancante = una scrittura che oggi funziona e domani fallisce |
| 8 | Error envelope non uniforme | `dormant.js:63` vs `matches/routes.js:2` vs `hero-assistant/routes.js:25-29` | Tre forme diverse (`{ok:false,error}` / `{error}` / `{error,code,details}`). Il frontend consuma `{error}`: uniformare prima del cutover |

### P2 — pulizia

- `src/domains/roster/routes.js`: registrar starter-pack mai collegato → rimuovere o documentare
- `src/domains/credits/service.js: transactions()` senza route → idem
- **Drift guard**: le costanti dei test di parità sono copiate a mano dal frontend; se il frontend cambia (costi HP, limiti, prompt), i test backend non falliscono. Valutare costanti condivise o un diff in CI

### DB (da TOMMASO.md, ancora aperto)

- Revocare `EXECUTE` su `get_user_id_by_email` dal ruolo `anon`

## 4. Strategia di cutover consigliata (quando sarà il momento)

1. MetalGate identity + wallet attivi e testati in staging
2. Fix P0 applicati
3. Frontend: `rewrites` in `next.config.js` verso il backend **una route alla volta**, partendo da una a basso rischio (es. `/api/notifications`)
4. Test e2e in non-prod su ogni route migrata, poi rollback istantaneo = togliere la riga di rewrite
5. Mai big-bang

## 5. TypeScript

La conversione TS **non è nel tuo perimetro**: la gestiamo noi lato repo (fondamenta `tsconfig` + conversione progressiva dominio per dominio, usando `types/database.ts` già presente). Tu troverai il backend in JS puro: se vuoi lavorare in TS, coordiniamoci prima di toccare `src/` per non creare conflitti di conversione.
