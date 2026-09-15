# Handoff Tommaso — database in Type, backend spento

Questo è il pacchetto da dare a Tommaso. **Niente traffico produzione, niente DNS, niente Vercel.** Il sito resta su Next.js `app/api`.

## Cosa gli dai

1. `backend/types/database.ts` — tipi completi del DB produzione (snapshot 15 set 2026)
2. `backend/types/routes.ts` e `backend/types/notifications.ts` — contratti HTTP attivi
3. `backend/types/metalgate.ts` — solo identity + crediti (la sua superficie)
4. Questo file

## Suo perimetro (MetalGate)

| Pezzo | Dove |
|---|---|
| Login SSO | `POST /sso/verify`, `POST /sso/user-info` |
| Saldo / scala / rimborso HP | `POST /internal/balance`, `/internal/deduct`, `/internal/accredit` |
| Accredito wallet dopo pagamento | `POST https://api.fromzerotohero.io/api/user/add` |
| Link utente | `user_profiles.metalgate_user_id` (UNIQUE) + `is_metalgate_user` |
| Storico locale | `credit_transactions`, `user_credit_usage`, `credit_error_logs` |
| Email → uuid (pagamenti) | RPC `get_user_id_by_email(user_email)` |

Nel backend nuovo questi pezzi sono **NOT IMPLEMENTED** di proposito:

- `MetalGateIdentityProvider`
- `MetalGateCreditProvider`
- route `auth.metalgate.*` e `credits.accredit` → HTTP 501

La logica chiamata dalla UX attiva è estratta in JavaScript/Fastify e testata
in modalità dormant. Le route senza caller attivo sono catalogate
`legacy-do-not-migrate` e non sono esposte. Non vanno ricostruiti Live Coach,
Tasks, Starter Pack, Card Advisor evaluate/unlock o endpoint amministrativi
senza caller. Dopo l'innesto dei provider
MetalGate serviranno test end-to-end in ambiente non produttivo; il frontend
continuerà a usare `app/api` fino a un cutover separato e approvato.

## Non suo

- Hero chat, Contromisure, rosa, formazioni, partite, Card Advisor
- Live Coach / Realtime (legacy, non si migra)
- Qualunque route marcata `legacy-do-not-migrate` in `src/inventory.js`
- Riscrivere il runtime in TypeScript (i `.ts` qui sono contratti, non un secondo runtime)

## Sicurezza da chiudere con lui

`get_user_id_by_email` oggi è eseguibile anche da `anon` via REST. Va revocato `EXECUTE` ad anon: deve restare service role / webhook pagamenti.

Il saldo Hero Point **non** è una colonna su `user_profiles`. È il wallet MetalGate. `user_profiles` non ha colonna `email` (l’email sta in `auth.users`).

## Come verificare che è spento

```bash
curl http://127.0.0.1:4050/ready
curl http://127.0.0.1:4050/handoff/metalgate
```

Atteso: `dormant: true`, `metalgate: not-implemented`.
