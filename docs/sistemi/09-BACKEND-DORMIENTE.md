# Backend dormiente (`efoot-backend`)

Processo Node + Fastify **separato**. Produzione resta su Next.js `app/api` fino a cutover esplicito.

## Stato

| Voce | Valore |
|------|--------|
| Traffico | Nessuno (dormant) |
| Bind default | `127.0.0.1:4050` |
| Runtime | TypeScript (`backend/src/**/*.ts`) |
| Test | `cd backend && npm test` |
| Typecheck | `cd backend && npm run typecheck` |

## Cosa è già fatto (noi)

- Estrazione domini attivi dalla UX corrente
- Inventario completo vs `app/api` (`src/inventory.ts`)
- Guardia dormant: write / AI / crediti bloccati prima di side effect
- Parità testata su Hero, Palestra, Rosa, Contromisure, Card Advisor, vision, memory, …
- Conversione TypeScript del runtime backend
- Allineamento post-migrazione: Truth Layer comandi, Card Advisor limits, ultimi messaggi Palestra, AI Knowledge, token refresh, niente messaggi `system` in cronologia

## Cosa non migrare

Marcato `legacy-do-not-migrate` in inventory: Live Coach, Tasks UI, Starter Pack, Card Advisor evaluate/unlock, transactions history, repair endpoints, admin patterns HTTP, …

## MetalGate → Tommaso

Vedi [backend/handoff/TOMMASO.md](../../backend/handoff/TOMMASO.md).

## Cutover (futuro)

Solo dopo MetalGate + fix P0 in handoff. Rewrite Next **una route alla volta**. Mai big-bang.
