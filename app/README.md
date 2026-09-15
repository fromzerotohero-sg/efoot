# app/ — route Next.js App Router

Root layout: **solo** `app/layout.jsx`. Monta `AppLayoutShell`. Non creare `app/layout.tsx`.

## Pagine

| Path | File | Note |
|------|------|------|
| `/` | `page.jsx` | Home/dashboard attuale |
| `/gestione-formazione` | re-export `nuova-rosa-lab` | Motore Rosa |
| `/nuova-rosa-lab` | `nuova-rosa-lab/page.jsx` | Stesso motore |
| `/card-advisor-lab` | Card Advisor | Pilastro Carte |
| `/assistant` | Chat a pagina | Popup globale resta in shell |
| `/match`, `/match/new`, `/match/[id]` | Partite | |
| `/contromisure-pre-partita` | Contromisure | |
| `/allenatori` | Coach | |
| `/impostazioni-profilo` | Hub impostazioni app | Identita, HP, profilo di gioco, notifiche, preferenze, account |
| `/gestione-profilo` | Redirect | Rimanda a `/impostazioni-profilo` |
| `/login` | Redirect MetalGate | Non è form Supabase primario |
| `/auth/callback`, `/login-success` | SSO | |
| `/access` | Prelaunch | |
| `/maintenance` | Manutenzione | |

Redirect: `/lista-giocatori`, `/upload` → formazione.

Assenti: `/classifica`, `/palestra`.

API: [api/README.md](./api/README.md)
