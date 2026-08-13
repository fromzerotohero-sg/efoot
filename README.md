# From Zero To Hero — eFootball AI Coach

Coach tattico personale per eFootball. L’utente porta rosa, partite e feedback; Hero consiglia formazione, contromisure e carte.

**Source of truth UX V2:** [docs/UX_V2/FZTH_UX_V2_MASTER_OPERATING_SPECIFICATION_v1.1.md](./docs/UX_V2/FZTH_UX_V2_MASTER_OPERATING_SPECIFICATION_v1.1.md)

Documentazione attiva: [docs/README.md](./docs/README.md)

## Stack

Next.js 14 (App Router) · React 18 · Supabase (PostgreSQL) · MetalGate (SSO + wallet HP) · OpenAI · Vercel

Non usa Stripe/PayPal nel codice corrente. L’accesso principale è MetalGate SSO, non un form Supabase Auth come ingresso primario.

## Avvio locale

```bash
npm install
cp .env.example .env.local
npm run dev
```

Dev server: porta `4031` (`package.json`).

Variabili: vedi `.env.example`. Non copiare chiavi reali nei markdown.

## Architettura percepita (target UX V2)

```
Coach (Home) · Rosa · Carte
Utility: Account, Memoria Hero, HP/Wallet, Daily reward, lingua, guida, tornei
```

Oggi la nav primaria è Coach · Rosa · Carte. Gli strumenti (partite, progressi, contromisure, Live Coach) restano sotto Coach.

## Contratti da non rompere

| Area | Dove vive |
|------|-----------|
| Auth | MetalGate SSO → `/auth/callback` → `user_profiles.metalgate_user_id`. Fallback Supabase controllato in `lib/authHelper.js`. |
| Rosa | `/gestione-formazione` re-esporta `nuova-rosa-lab`. Catalogo, slot 0–10, riserve, coach, tattiche. |
| Hero Chat | `POST /api/assistant-chat` + RAG keyword da `info_rag.md` (non vector-RAG). |
| Palestra | `POST /api/coach-feedback-chat` e `POST /api/save-coach-feedback` → `user_tactical_feedback`. |
| HP | `lib/creditService.js`: `AI_COST = 2`. Wallet MetalGate. Live Coach 2 HP + 5 HP/min. |
| Card Advisor | `/card-advisor-lab`, deep analysis 2 HP. |

`info_rag.md` è contenuto operativo letto dal runtime. Non trattarlo come documentazione da riscrivere.

## Costi HP (codice corrente)

| Operazione | HP |
|------------|----|
| AI standard (chat, palestra, extract, analyze, contromisure) | 2 |
| Card Advisor deep analysis | 2 |
| Live Coach avvio | 2 |
| Live Coach minuto extra | 5 |

Dettaglio: [docs/COSTI_HP_USO_PIATTAFORMA.md](./docs/COSTI_HP_USO_PIATTAFORMA.md)

## Sicurezza

Lo stato reale (RLS, SECURITY DEFINER, Edge Functions in quarantena) è in [docs/SICUREZZA.md](./docs/SICUREZZA.md). Non assumere “RLS ovunque”.
