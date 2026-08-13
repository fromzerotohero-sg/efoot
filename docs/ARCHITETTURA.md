# Architettura corrente

Verificato sul codice del 13 agosto 2026. Direzione prodotto: [UX_V2 Master](./UX_V2/FZTH_UX_V2_MASTER_OPERATING_SPECIFICATION_v1.1.md).

## Stack

| Layer | Tecnologia |
|-------|------------|
| App | Next.js 14 App Router, React 18, CSS proprio (nessun Tailwind/shadcn) |
| Auth | MetalGate SSO + mapping `user_profiles`; fallback Supabase Auth in `validateToken` |
| DB | Supabase PostgreSQL (progetto eFootball). Wallet/identità credito su MetalGate |
| AI | OpenAI via `lib/openaiHelper.js`. RAG keyword su `info_rag.md` |
| Hosting | Vercel |
| Pagamenti HP | MetalGate wallet API (non Stripe/PayPal nel codice) |

`package.json` ha ancora il nome interno `gattilio27`; il prodotto utente è From Zero To Hero.

## Shell globale

`app/layout.jsx` **non** monta sidebar/chat direttamente. Delega a `components/AppLayoutShell.jsx`:

- `SidebarNew`, `TopBar`, `BottomNavigation`
- `DailySpinWidget`, `InstallAppPrompt` (off su staging/preview)
- `LiveCoachLauncher`, `AssistantChat` popup
- `MaintenanceGate`, `PrelaunchGate`

Analytics (GA `G-X69T3QE3GG`, Clarity `wylmfczjap`) si caricano in production; su `NEXT_PUBLIC_APP_ENV=staging` o `VERCEL_ENV=preview` restano spenti.

## Route pagina (reali)

| Path | Ruolo |
|------|--------|
| `/` | Home/dashboard attuale (diventerà Coach Home in S2) |
| `/gestione-formazione` | Rosa: re-export di `nuova-rosa-lab` |
| `/card-advisor-lab` | Carte |
| `/assistant` | Chat a pagina intera (popup globale resta) |
| `/match`, `/match/new`, `/match/[id]` | Partite |
| `/contromisure-pre-partita` | Contromisure |
| `/allenatori` | Coach cards |
| `/impostazioni-profilo`, `/gestione-profilo` | Profilo / HP utility |
| `/login` | Redirect MetalGate |
| `/auth/callback`, `/login-success` | SSO |
| `/access` | Gate prelaunch |
| `/maintenance` | Manutenzione |
| `/guida` | Guida in-app |
| `/grafici-comparazione` | Grafici |

Assenti nel codice: `/classifica`, `/api/leaderboard`, `lib/leaderboardHelper.js`.

## Motori, non pagine

UX V2 unifica la percezione “Hero Coach”. I motori restano separati:

```
Hero UI
  domanda/consiglio  → POST /api/assistant-chat
  feedback/profilo   → POST /api/coach-feedback-chat
                       POST /api/save-coach-feedback
  live sessione      → /api/live-coach/* (billing temporale)
```

Smart Coach (`NEXT_PUBLIC_FF_SMART_COACH_ENTRY`) è in quarantena, default off.

## Cosa non riscrivere nello sprint UX

- Contratti API e schema `user_profiles`, slot rosa, `user_tactical_feedback`
- `creditService` / MetalGate wallet / prezzi HP
- `info_rag.md` e `ragHelper.js` (non è vector-RAG)
- Auth SSO e mapping MetalGate
- Edge Functions Supabase (quarantena: non collegare, non cancellare)
- Pagina `nuova-rosa-lab` come rewrite integrale (~9.8k righe)

Semplificare significa BYPASS UX (nascondere ingresso primario), non spegnere il motore.
