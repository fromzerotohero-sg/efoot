# app/ — route Next.js App Router

Root layout: **solo** `app/layout.jsx`. Monta `AppLayoutShell`. Non creare `app/layout.tsx`.

## Pagine

| Path | File | Note |
|------|------|------|
| `/` | `page.jsx` | Home/dashboard attuale |
| `/gestione-formazione` | re-export `nuova-rosa-lab` | Motore Rosa |
| `/nuova-rosa-lab` | `nuova-rosa-lab/page.jsx` | Stesso motore |
| `/card-advisor-lab` | Card Advisor | Pilastro Carte |
| `/allenatori` | Coach | |
| `/impostazioni-profilo` | Hub impostazioni app | Identita, HP, profilo di gioco, notifiche, preferenze, account |
| `/login` | Redirect MetalGate | Non è form Supabase primario |
| `/auth/callback`, `/login-success` | SSO | |
| `/access` | Prelaunch | |
| `/maintenance` | Manutenzione | |

Partite, statistiche, Palestra e contromisure sono workflow interni a Hero Chat sulla Home, non pagine autonome.

API: [api/README.md](./api/README.md)
