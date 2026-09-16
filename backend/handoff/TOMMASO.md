# Handoff Tommaso — MetalGate + backend spento

Data: 16 settembre 2026.  
**Niente traffico produzione, niente DNS, niente Vercel rewrite.** Il sito resta su Next.js `app/api`.

---

## Cosa gli dai

1. `backend/types/database.ts` — tipi DB produzione
2. `backend/types/routes.ts`, `backend/types/notifications.ts` — contratti HTTP
3. `backend/types/metalgate.ts` — identity + crediti (la sua superficie)
4. Questo file
5. `ACCORGIMENTI_PER_TOMMASO.md` — P0/P1 prima di qualsiasi cutover

Avvio verifica:

```bash
cd backend
npm install
npm test
npm run typecheck
npm run dev
curl http://127.0.0.1:4050/ready
curl http://127.0.0.1:4050/handoff/metalgate
```

Atteso: `dormant: true`, `metalgate: not-implemented`.

---

## Cosa abbiamo già fatto noi (backend)

| Area | Stato |
|------|--------|
| Estrazione Fastify dei domini con caller UX attivo | Fatto |
| Inventario vs ogni file `app/api` (`src/inventory.ts`) | Fatto |
| Guardia dormant (nessuna write/AI/credito reale) | Fatto |
| Test di parità + typecheck + build | Verdi |
| Runtime backend in **TypeScript** | Fatto |
| Allineamento post-migrazione Hero/Palestra/Card Advisor/memory | Fatto |
| Placeholder MetalGate a HTTP 501 | Voluto |

### Allineamenti post-migrazione (non perdere)

- Truth Layer Hero: ufficiali solo Super Cancel e Double Touch; Kick Cancel/Feint = community
- Alias Focal Point → Centerpiece
- Palestra: ultimi messaggi, non i primi; `common_problems` non sovrascrive alla cieca
- AI Knowledge: chat reali + divisioni eFootball corrette
- Card Advisor: limiti contesto production + RAG 5000
- Messaggi `system` Hero non persistiti
- Knowledge refresh con token utente
- Contratto crediti feedback = **2 HP**

---

## Suo perimetro (MetalGate) — cosa manca

| Pezzo | Dove / contratto |
|-------|------------------|
| Login SSO verify | `POST /sso/verify`, `POST /sso/user-info` |
| Saldo / scala / rimborso HP | `POST /internal/balance`, `/internal/deduct`, `/internal/accredit` |
| Accredito wallet dopo pagamento | `POST https://api.fromzerotohero.io/api/user/add` |
| Link utente | `user_profiles.metalgate_user_id` (UNIQUE) + `is_metalgate_user` |
| Storico locale | `credit_transactions`, `user_credit_usage`, `credit_error_logs` |
| Email → uuid (pagamenti) | RPC `get_user_id_by_email(user_email)` |

Nel backend nuovo sono **NOT IMPLEMENTED** di proposito:

- `MetalGateIdentityProvider`
- `MetalGateCreditProvider`
- route `auth.metalgate.*` e `credits.accredit` → HTTP 501

Header legacy da rispettare in transizione (usati da alcune route Next):  
`x-metalgate-session`, `x-metalgate-user-id`.

Dopo l’innesto: test e2e in **non-prod**. Il frontend continua su `app/api` fino a cutover separato e approvato.

---

## Sicurezza da chiudere con lui

1. Revocare `EXECUTE` su `get_user_id_by_email` al ruolo `anon` — deve restare service role / webhook pagamenti.
2. Il saldo HP **non** è colonna su `user_profiles` (è wallet MetalGate).
3. `user_profiles` **non** ha colonna `email` (email in `auth.users`).

---

## Non suo

- Hero chat, Contromisure, rosa, formazioni, partite, Card Advisor, Palestra (logica già estratta)
- Live Coach / Realtime (legacy, non si migra)
- Tasks UI, Starter Pack, Card Advisor evaluate/unlock, admin senza caller
- Qualunque route `legacy-do-not-migrate` in `src/inventory.ts`
- Attivare traffico / cutover senza fix P0 in `ACCORGIMENTI_PER_TOMMASO.md`

---

## Ordine consigliato

1. Provider MetalGate identity + wallet in staging
2. Sicurezza RPC email
3. Fix P0 cutover (bodyLimit, CORS, status 200 match, rate limit profilo)
4. Verifica RLS su ogni tabella scritta dal backend (JWT utente, non service-role)
5. Solo dopo: rewrite Next una route alla volta
