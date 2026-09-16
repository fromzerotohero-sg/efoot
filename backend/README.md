# efoot-backend — cutover-ready, traffic disabled

Processo Node.js + Fastify **separato**. Produzione resta su Next.js `app/api`.

`dormant` = stato traffico, non completezza implementativa.

## Default: dormiente

- nessun traffico produzione
- nessun DNS / Vercel rewrite
- nessuna write reale, nessun addebito HP reale, nessun cron
- MetalGate identity/wallet = `NOT IMPLEMENTED` (Tommaso)
- Live Coach, Tasks UI, Starter Pack e altre API senza caller = non esposte

```bash
cd backend
npm install
npm test
npm run typecheck
npm run build
npm run dev
```

Ascolta `127.0.0.1:4050`. Non puntare il frontend qui.

## Endpoint di controllo

- `GET /health` `/ready` `/version` `/inventory` `/handoff/metalgate`

## Layout

| Path | Ruolo |
|------|--------|
| `src/` | Runtime TypeScript |
| `src/inventory.ts` | Catalogo route vs `app/api` |
| `src/domains/*` | Domini estratti |
| `types/` | Contratti per Tommaso |
| `handoff/` | TOMMASO.md + ACCORGIMENTI |
| `tests/` | Parità (ancora `.js`) |

## Documentazione prodotto

- [docs/sistemi/09-BACKEND-DORMIENTE.md](../docs/sistemi/09-BACKEND-DORMIENTE.md)
- [handoff/TOMMASO.md](./handoff/TOMMASO.md)
