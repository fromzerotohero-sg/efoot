# app/ — route Next.js App Router

Root layout: **solo** `app/layout.jsx` → `AppLayoutShell`. Non creare `app/layout.tsx`.

## Pagine attive

| Path | Note |
|------|------|
| `/` | Home Coach + Hero |
| `/gestione-formazione` | Rosa (re-export `nuova-rosa-lab`) |
| `/nuova-rosa-lab` | Motore Rosa |
| `/card-advisor-lab` | Carte |
| `/allenatori` | Allenatori |
| `/impostazioni-profilo` | Profilo, HP, notifiche, account |
| `/login`, `/auth/callback`, `/login-success` | SSO MetalGate |
| `/access`, `/maintenance` | Gate |
| `/forgot-password`, `/reset-password`, `/auth/magiclink-callback` | Legacy Supabase |

Partite, stats, Palestra e contromisure = workflow Hero, non pagine autonome.

API: [api/README.md](./api/README.md)  
Sistemi: [../docs/sistemi/](../docs/sistemi/)
