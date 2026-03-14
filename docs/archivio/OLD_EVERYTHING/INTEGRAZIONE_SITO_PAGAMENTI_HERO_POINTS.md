# Integrazione sito pagamenti → Hero Points (Gattilio27)

Questo documento descrive come il **sito che gestisce i pagamenti** (esterno all’app) deve comunicare con Gattilio27 per **caricare gli Hero Point** in base al pacchetto acquistato. È il riferimento per il programmatore che implementa il flusso lato sito pagamenti.

---

## 1. Contesto

- **Sito pagamenti**: utente sceglie pacchetto, paga (es. €20 / €40 / €60) → pacchetto = 200 / 500 / 700 Hero Point.
- **Gattilio27**: non gestisce il checkout; deve solo **ricevere** la notifica “utente X ha acquistato il pacchetto → accredita N Hero Point” e aggiornare:
  - **Crediti disponibili** per il periodo (`user_credit_usage.credits_included`)
  - **Storico transazioni** (`credit_transactions` tipo `purchase`)

La barra crediti in app si consuma già in base all’utilizzo; la sola cosa che cambia è **da dove arriva** il tetto (credits_included): da questo accredito invece che dal default.

---

## 2. Endpoint da chiamare (lato sito pagamenti)

**URL:** `POST https://<dominio-gattilio27>/api/credits/accredit`

**Autenticazione:** solo chiamate da backend (sito pagamenti). Header obbligatorio:

- `Authorization: Bearer <API_KEY>`  
  oppure  
- `X-Webhook-Secret: <API_KEY>`

`API_KEY` è un segreto condiviso (es. variabile d’ambiente sul sito pagamenti e in Gattilio27 `CREDITS_ACCREDIT_API_KEY`). **Non** usare il token utente: questo endpoint non è per il frontend.

**Body (JSON):**

| Campo            | Tipo   | Obbligatorio | Descrizione |
|------------------|--------|--------------|-------------|
| `user_id`        | string (UUID) | Sì* | Id utente Supabase (`auth.users.id`). Se il sito ha solo l’email, usare `email` e lasciare `user_id` assente. |
| `email`          | string | Sì* | Email utente (usata se non si invia `user_id` per risalire all’utente in Supabase). |
| `credits_amount`| number | Sì | Hero Point da accreditare (es. 200, 500, 700). |
| `order_id`       | string | Sì | Id ordine lato sito pagamenti (per idempotenza e storico). |
| `period_key`     | string | No | Periodo di competenza `YYYY-MM` (es. `2026-02`). Se assente si usa il mese corrente (UTC). |

\* Almeno uno tra `user_id` e `email` obbligatorio. Se sono presenti entrambi, ha priorità `user_id`.

**Esempio body:**

```json
{
  "user_id": "550e8400-e29b-41d4-a716-446655440000",
  "credits_amount": 500,
  "order_id": "ORD-2026-001234"
}
```

oppure, identificando per email:

```json
{
  "email": "utente@esempio.it",
  "credits_amount": 700,
  "order_id": "ORD-2026-001235"
}
```

---

## 3. Risposte

- **200 OK** – Accredito eseguito (o già eseguito in precedenza con lo stesso `order_id`, idempotente).
- **400 Bad Request** – Body non valido (mancano campi, `credits_amount` non positivo, nessun `user_id`/`email`).
- **401 Unauthorized** – API key mancante o non valida.
- **404 Not Found** – Utente non trovato (email non presente in `auth.users`).
- **500 Internal Server Error** – Errore lato server (log per il supporto).

In caso di 200, il frontend Gattilio27 (CreditsBar, Gestione profilo) vedrà i nuovi crediti al prossimo refresh (o dopo evento di refresh se implementato).

---

## 4. Idempotenza

Se il sito pagamenti invia **due volte** la stessa richiesta (stesso `order_id` per lo stesso utente), Gattilio27 tratta la seconda come **già elaborata**: non raddoppia i crediti, risponde 200. Questo permette retry sicuri senza doppio accredito.

---

## 5. Cosa fa Gattilio27 quando riceve la richiesta

1. Verifica API key.
2. Valida il body e risolve `user_id` (da email se necessario).
3. Se esiste già una transazione di tipo `purchase` con `reference_id = order_id` per quell’utente → risponde 200 (idempotente).
4. Altrimenti:
   - **Upsert** su `user_credit_usage`: per `user_id` + `period_key` (o mese corrente) imposta `credits_included = credits_amount` e mantiene `credits_used` esistente (o 0 se nuova riga).
   - **Insert** in `credit_transactions`: tipo `purchase`, amount positivo, `reference_id = order_id`.
5. Risponde 200.

La barra crediti usa già `credits_included` e `credits_used` da `user_credit_usage`; nessuna modifica aggiuntiva lato UI per il consumo.

---

## 6. Variabili d’ambiente (Gattilio27)

Sul server dove gira Gattilio27 va configurata:

- `CREDITS_ACCREDIT_API_KEY` – segreto condiviso con il sito pagamenti per autorizzare le chiamate a `POST /api/credits/accredit`.

Senza questa variabile, l’endpoint risponde 503 (non configurato).

---

## 7. Tabella riepilogo per il programmatore (sito pagamenti)

| Cosa fare | Dettaglio |
|-----------|-----------|
| Dopo pagamento riuscito | Chiamare `POST /api/credits/accredit` con body JSON (user_id o email, credits_amount, order_id). |
| Header | `Authorization: Bearer <CREDITS_ACCREDIT_API_KEY>` (o `X-Webhook-Secret`). |
| Mapping pacchetto → crediti | Deciso lato sito (es. 20€→200, 40€→500, 60€→700). |
| Retry | In caso di 5xx o timeout, ritentare; stesso `order_id` garantisce idempotenza. |
| User id | Se il sito e Gattilio27 condividono Supabase Auth, inviare `user_id` (UUID). Altrimenti inviare `email` e Gattilio27 risale all’utente. |

---

## 8. Riferimenti tecnici nel codice

- **Endpoint:** `app/api/credits/accredit/route.js`
- **Servizio:** `lib/creditService.js` → `accreditPurchase(admin, userId, creditsAmount, orderId, periodKey?)`
- **Tabelle:** `user_credit_usage` (credits_included, credits_used, period_key), `credit_transactions` (type, amount, reference_id)
- **Risoluzione email → user_id:** funzione Supabase `public.get_user_id_by_email(user_email)` (migration `migrations/get_user_id_by_email.sql`). Applicata in Supabase se il sito invia `email` invece di `user_id`.

---

## 9. Test senza sito pagamenti (crediti di default)

Se il sito pagamenti **non è ancora collegato**, puoi testare la barra e il consumo così:

1. **Crediti di default alti (tutti i nuovi utenti)**  
   In `.env.local` imposta:
   ```bash
   CREDITS_INCLUDED_DEFAULT=10000
   ```
   Riavvia il server. I **nuovi** utenti (o il prossimo periodo mensile) avranno 10000 crediti. La barra si consumerà normalmente.

2. **Utenti che hanno già una riga questo mese**  
   Hanno ancora il vecchio tetto (es. 200). Per dargli 10000 puoi:
   - **Opzione A:** in Supabase → SQL Editor esegui (sostituisci `TUO_USER_ID`):
     ```sql
     UPDATE user_credit_usage SET credits_included = 10000 WHERE user_id = 'TUO_USER_ID' AND period_key = to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM');
     ```
   - **Opzione B:** chiamare l’endpoint accredito (così testi anche quel flusso). In `.env.local` imposta `CREDITS_ACCREDIT_API_KEY=test-segreto`. Poi da terminale:
     ```bash
     curl -X POST http://localhost:3000/api/credits/accredit -H "Content-Type: application/json" -H "Authorization: Bearer test-segreto" -d "{\"email\": \"tua@email.com\", \"credits_amount\": 10000, \"order_id\": \"test-1\"}"
     ```
     (sostituisci `tua@email.com` con la tua email utente in Gattilio27). Dopo aver ricevuto 200 OK, ricarica l’app: la barra mostrerà 10000.

3. **Quando colleghi il sito pagamenti**  
   Togli o commenta `CREDITS_INCLUDED_DEFAULT` (torna 200) e configura `CREDITS_ACCREDIT_API_KEY` con il segreto condiviso.
