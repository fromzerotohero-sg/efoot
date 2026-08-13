# Costi Hero Points — unica fonte

Verificato in `lib/creditService.js` (`AI_COST = 2`) e `lib/liveCoachPricing.js`.
Non usare documenti storici con 1 HP o pesi variabili.

## Regole

- Default HP inclusi: **0** (`CREDITS_INCLUDED_DEFAULT`, override solo per test).
- Utenti MetalGate: saldo sul wallet MetalGate. eFootball tiene tracking in `user_credit_usage` / `credit_transactions`.
- 402 = crediti insufficienti: messaggio UX, non errore tecnico generico.
- Mostrare il costo prima dell’azione quando è noto.
- Non cambiare prezzi, refund o `creditService` in uno sprint UX senza prompt owner.

## Tariffario codice corrente

| Operazione | Codice | HP |
|------------|--------|----|
| Hero Chat `assistant-chat` | `AI_COST` | 2 |
| Palestra `coach-feedback-chat` | `AI_COST` | 2 |
| Save feedback `save-coach-feedback` | `AI_COST` | 2 |
| Extract player / coach / formation / match-data / game-analysis | `AI_COST` | 2 |
| Contromisure `generate-countermeasures` | `AI_COST` | 2 |
| Analisi partita `analyze-match` | `AI_COST` | 2 |
| Game analysis multi-image | 2 HP × immagine/URL | 2×N |
| Card Advisor deep analysis | `DEEP_ANALYSIS_COST` | 2 |
| Live Coach avvio | `LIVE_COACH_START_COST` | 2 |
| Live Coach minuto extra | `LIVE_COACH_MINUTE_COST` | 5 / minuto |

`CREDIT_WEIGHTS` in `creditService.js` è allineato a `AI_COST`; non reintrodurre pesi diversi senza decisione owner.

## Fuori tariffario AI

- Daily Spin: accredito bonus idempotente (`/api/daily-spin`), non un costo.
- Acquisto HP: MetalGate (`https://home.fromzerotohero.io/dashboard?usage`), non Stripe in-app.
- Webhook accredito: `POST /api/credits/accredit` protetto da `CREDITS_ACCREDIT_API_KEY`.
