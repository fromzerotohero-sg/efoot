# Crediti / Hero Points — contratto corrente

Niente Stripe, PayPal o pagina `/crediti` nel codice. Wallet: **MetalGate**. Tracking locale eFootball.

## Codice

- `lib/creditService.js` — `AI_COST = 2`, deduct/refund/accredito, chiamata MetalGate con `METALGATE_API_KEY`
- `lib/liveCoachPricing.js` — 2 + 5/min
- Tariffario: [COSTI_HP_USO_PIATTAFORMA.md](../COSTI_HP_USO_PIATTAFORMA.md)

## API

| Route | Auth | Ruolo |
|-------|------|--------|
| `GET /api/credits/usage` | Bearer | Saldo/usage periodo |
| `GET /api/credits/transactions` | Bearer | Log |
| `POST /api/credits/accredit` | `CREDITS_ACCREDIT_API_KEY` | Webhook accredito |
| `GET/POST /api/daily-spin` | Bearer | Daily reward idempotente |

UI: `CreditsBar` / TopBar. Acquisto: `https://home.fromzerotohero.io/dashboard?usage`.

## Tabelle locali

`user_credit_usage`, `credit_transactions`, `credit_error_logs`.  
Per utenti SSO il saldo mostrato deve riflettere MetalGate, non un “piano mensile 200 HP”.

Default `CREDITS_INCLUDED_DEFAULT` = 0.

UX V2: HP è utility globale, non tab primario. Non toccare prezzi/refund nello sprint UI.
