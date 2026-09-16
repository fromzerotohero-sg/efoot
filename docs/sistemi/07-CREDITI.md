# Crediti / Hero Points

Niente Stripe o PayPal in questa app. Wallet: **MetalGate**. Tracking locale eFootball.

## Codice

- `lib/creditService.js` — `AI_COST = 2`, deduct / refund / accredito
- Tariffario unico: [COSTI_HP_USO_PIATTAFORMA.md](../COSTI_HP_USO_PIATTAFORMA.md)

## API

| Route | Auth | Ruolo | Stato prodotto |
|-------|------|--------|----------------|
| `GET/POST /api/credits/usage` | Bearer | Saldo / usage periodo | Attivo |
| `GET /api/credits/transactions` | Bearer | Log | Legacy (nessuna UX attiva) |
| `POST /api/credits/accredit` | `CREDITS_ACCREDIT_API_KEY` | Webhook accredito | MetalGate / Tommaso |

UI: `CreditsBar` / TopBar. Acquisto: `https://home.fromzerotohero.io/dashboard?usage`.

## Tabelle locali

`user_credit_usage`, `credit_transactions`, `credit_error_logs`.

Il saldo Hero Point **non** è una colonna su `user_profiles`: è il wallet MetalGate.

Default `CREDITS_INCLUDED_DEFAULT` = 0.

## Backend dormiente

Finché MetalGate non è innestato: `MockCreditProvider` (`applied: false`). Route accredito → 501.
