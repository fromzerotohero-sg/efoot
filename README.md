# From Zero To Hero — eFootball AI Coach

Coach tattico personale per eFootball. L’utente porta rosa, partite e feedback; Hero consiglia formazione, contromisure e carte.

**Source of truth:** codice corrente e [documentazione attiva](./docs/README.md).

## Stack

Next.js 14 (App Router) · React 18 · Supabase (PostgreSQL) · MetalGate (SSO + wallet HP) · OpenAI · Vercel  

Backend Fastify TypeScript in `backend/`: **dormiente**, zero traffico.

## Avvio locale

```bash
npm install
cp .env.example .env.local
npm run dev
```

Dev server: porta `4031`. Variabili: `.env.example`. Non copiare chiavi reali nei markdown.

## Architettura percepita

```
Coach (Home + Hero) · Rosa · Carte
Utility: Account, Memoria Hero, HP, lingua
```

Partite, statistiche, feedback e contromisure sono workflow della chat Hero.

## Sistemi (documenti)

| Sistema | Doc |
|---------|-----|
| Auth | [docs/sistemi/01-AUTH.md](./docs/sistemi/01-AUTH.md) |
| Rosa | [docs/sistemi/02-ROSA.md](./docs/sistemi/02-ROSA.md) |
| Partite | [docs/sistemi/03-PARTITE.md](./docs/sistemi/03-PARTITE.md) |
| Hero Chat | [docs/sistemi/04-HERO-CHAT.md](./docs/sistemi/04-HERO-CHAT.md) |
| Palestra | [docs/sistemi/05-PALESTRA-COACH.md](./docs/sistemi/05-PALESTRA-COACH.md) |
| Card Advisor | [docs/sistemi/06-CARD-ADVISOR.md](./docs/sistemi/06-CARD-ADVISOR.md) |
| Crediti | [docs/sistemi/07-CREDITI.md](./docs/sistemi/07-CREDITI.md) |
| Memoria | [docs/sistemi/08-MEMORIA.md](./docs/sistemi/08-MEMORIA.md) |
| Backend dormiente | [docs/sistemi/09-BACKEND-DORMIENTE.md](./docs/sistemi/09-BACKEND-DORMIENTE.md) |

## Contratti da non rompere

| Area | Dove |
|------|------|
| Auth | MetalGate SSO → `user_profiles.metalgate_user_id` |
| Rosa | slot 0–10, riserve NULL, catalogo ≠ rosa utente |
| Hero | `POST /api/assistant-chat` + RAG keyword `info_rag.md` |
| Palestra | feedback → `user_tactical_feedback` |
| HP | `AI_COST = 2` — wallet MetalGate |
| Zone | attacco ≠ pressione avversaria ≠ gol subiti |
| Backend | dormiente finché cutover non approvato |

`info_rag.md` è contenuto runtime: non trattarlo come doc da riscrivere in uno sprint UX.

## Costi HP

| Operazione | HP |
|------------|----|
| AI standard (chat, palestra, extract, contromisure) | 2 |
| Card Advisor deep analysis | 2 |

Dettaglio: [docs/COSTI_HP_USO_PIATTAFORMA.md](./docs/COSTI_HP_USO_PIATTAFORMA.md)

## Tommaso (MetalGate)

[backend/handoff/TOMMASO.md](./backend/handoff/TOMMASO.md)
