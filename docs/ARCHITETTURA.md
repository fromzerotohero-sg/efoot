# Architettura corrente

Verificato sul codice del 16 settembre 2026.

## Stack

| Layer | Tecnologia |
|-------|------------|
| App | Next.js 14 App Router, React 18, CSS proprio |
| Auth | MetalGate SSO + mapping `user_profiles`; fallback Supabase Auth |
| DB | Supabase PostgreSQL (progetto eFootball). Wallet su MetalGate |
| AI | OpenAI via `lib/openaiHelper.js`. RAG keyword su `info_rag.md` |
| Hosting | Vercel |
| Backend futuro | Fastify TypeScript in `backend/` — **dormiente**, zero traffico |

`package.json` ha ancora il nome interno `gattilio27`; il prodotto è From Zero To Hero.

## Shell globale

`app/layout.jsx` delega a `components/AppLayoutShell.jsx`:

- `SidebarNew`, `TopBar`, `BottomNavigation`, `NotificationBell`
- `InstallAppPrompt` (soft CTA; off su staging/preview)
- `MaintenanceGate`, `PrelaunchGate`

Analytics (GA, Clarity) solo in production.

## Pagine reali

| Path | Ruolo |
|------|--------|
| `/` | Coach Home + Hero Chat |
| `/gestione-formazione` | Rosa (re-export `nuova-rosa-lab`) |
| `/nuova-rosa-lab` | Stesso motore Rosa |
| `/card-advisor-lab` | Carte |
| `/allenatori` | Allenatori |
| `/impostazioni-profilo` | Profilo, HP, notifiche, account |
| `/login`, `/auth/callback`, `/login-success` | SSO |
| `/access` | Gate prelaunch |
| `/maintenance` | Manutenzione |
| `/forgot-password`, `/reset-password`, `/auth/magiclink-callback` | Legacy Supabase |

Assenti: `/classifica`, pagine Match autonome, Live Coach, Tasks UI.

## Nav percepita

```
Coach · Rosa · Carte
Utility: Account, Memoria Hero, HP, lingua
```

Partite, stats, feedback e contromisure = workflow dentro Hero.

## Motori (non confondere)

```
Hero UI
  consiglio tattico     → POST /api/assistant-chat
  feedback / profilo    → POST /api/coach-feedback-chat
                          POST /api/save-coach-feedback
  screenshot / stats    → extract-* + save-match
  contromisure          → POST /api/generate-countermeasures
  carte deep            → POST /api/card-advisor-lab/deep-analysis
```

## Cosa non riscrivere alla cieca

- Contratti API e schema `user_profiles`, slot rosa, `user_tactical_feedback`
- `creditService` / prezzi HP / MetalGate wallet
- `info_rag.md` e Truth Layer
- Auth SSO e mapping MetalGate
- Edge Functions Supabase in quarantena (non collegare, non cancellare)
- Rewrite integrale di `nuova-rosa-lab`
- Attivare il backend dormiente senza cutover approvato

Dettaglio sistemi: [README.md](./README.md).
