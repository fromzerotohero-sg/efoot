# app/ – Pagine e route (Next.js App Router)

**Next.js 14 App Router**: ogni cartella = una route.

## Pagine principali

| Path | File | Cosa fa |
|------|------|---------|
| `/` | `page.jsx` | Dashboard: rosa, partite, barra conoscenza IA |
| `/gestione-formazione` | `gestione-formazione/page.jsx` | Campo 2D, upload giocatori |
| `/match/new` | `match/new/page.jsx` | Wizard 5 step caricamento partita |
| `/match/[id]` | `match/[id]/page.jsx` | Dettaglio partita, analisi AI |
| `/giocatore/[id]` | `giocatore/[id]/page.jsx` | Scheda giocatore |
| `/impostazioni-profilo` | `impostazioni-profilo/page.jsx` | Profilo utente |
| `/guida` | `guida/page.jsx` | Guida interattiva |
| `/contromisure-pre-partita` | `contromisure-pre-partita/page.jsx` | Contromisure pre-partita vs avversario |
| `/allenatori` | `allenatori/page.jsx` | Gestione allenatori |
| `/login` | `login/page.jsx` | Login Supabase Auth |

## Redirect e utilità

- `/lista-giocatori` → `/gestione-formazione` (`lista-giocatori/page.jsx`)
- `/upload` → `/gestione-formazione` (`upload/page.jsx`)
- `not-found.tsx` – Pagina 404 con i18n

## Layout

`layout.tsx`: LanguageProviderWrapper, CreditsBar, AssistantChat, GuideTour.

**Doc**: `docs/` (auth, crediti, gestione rosa, audit chat). API: `app/api/README.md`
