# Audit end-to-end: email recupero password (enterprise)

Audit completo del flusso “Recupera password” → email non arriva. Data audit: 2026-02-07.

---

## 1. Flusso end-to-end (come dovrebbe funzionare)

| Step | Attore | Azione | Risultato atteso |
|------|--------|--------|-------------------|
| 1 | Utente | Apre `/forgot-password`, inserisce email, clicca "Invia link" | Form invia richiesta |
| 2 | App (forgot-password) | Chiama `supabase.auth.resetPasswordForEmail(email, { redirectTo })` | Nessun errore, success: true |
| 3 | Supabase Auth | Riceve POST /recover, valida email, genera token, **invia email** | 200 OK, evento mail.send nei log |
| 4 | Provider email | Recapita messaggio a casella utente | Email in inbox (o spam) |
| 5 | Utente | Clicca link nell’email | Redirect a /reset-password con token in URL |
| 6 | App (reset-password) | Legge token (hash), imposta sessione, mostra form nuova password | Utente imposta password |

Punto critico per “non arriva mail”: **step 3** (Supabase invia?) e **step 4** (deliverability: inbox vs spam/blocco).

---

## 2. Evidenza dai log Auth Supabase (ultime 24h)

### 2.1 POST /recover

Tutte le richieste **POST /recover** restituiscono **status 200** (nessun errore lato API):

- **14:57:30** – 200 (ultima verificata)
- 14:46:27 – 200
- 14:41:27 – 200
- 14:33:34 – 200
- 14:27:25 – 200 (con `user_recovery_requested` per attiliomazzetti@gmail.com)
- 14:23:12 – 200
- 14:17:14 – 200

L’app e l’API Supabase sono quindi **allineate**: la richiesta di recupero viene accettata. Per **nessuna** delle richieste 14:33, 14:41, 14:46, 14:57 compare un evento **mail.send** → Supabase non sta inviando l’email (rate limit lato server).

### 2.2 Evento mail.send

Nei log compare **un solo** evento **mail.send**:

- **14:27:24** – `mail_from: noreply@mail.app.supabase.io`, `mail_to: attiliomazzetti@gmail.com`, `mail_type: recovery`

Per tutte le altre chiamate **/recover** (14:17, 14:23, 14:33, 14:41, 14:46) **non** c’è un corrispondente **mail.send**.

### 2.3 Conclusioni dai log

1. **Supabase non invia un’email per ogni POST /recover 200.**  
   Probabile **rate limiting / throttling** per indirizzo email: dopo la prima richiesta (o per un certo intervallo) le richieste successive vengono accettate (200) ma **non** generano un nuovo invio email. Quindi “la mail non arriva” può voler dire anche: “ho cliccato Invia link più volte e mi aspettavo più email” → solo la prima (o una ogni X tempo) viene effettivamente inviata.

2. **Quando Supabase invia (mail.send), il mittente è `noreply@mail.app.supabase.io`.**  
   Questo mittente è condiviso e spesso **filtrato o messo in spam** da Gmail, Outlook, Libero, ecc. Quindi anche l’unica email effettivamente inviata può **non arrivare in inbox** (spam, blocco, ritardo).

3. **Per altri indirizzi (es. zingaroniccolo98@gmail.com)** nei log non compare alcun **mail.send**.  
   Possibili cause: throttling (già inviata una recovery a quell’email di recente), o configurazione/limiti progetto. In ogni caso, **senza mail.send non parte nessuna email**.

---

## 3. Verifica codice (app)

### 3.1 forgot-password/page.jsx

- Chiamata: `supabase.auth.resetPasswordForEmail(trimmedEmail, { redirectTo })`.
- `redirectTo`: da `NEXT_PUBLIC_APP_URL` se impostata, altrimenti `window.location.origin`; suffisso `/reset-password`.  
- Comportamento: **corretto**. In produzione va impostato `NEXT_PUBLIC_APP_URL` (es. `https://gattilio27.vercel.app`) così il link nell’email non punta a localhost.

### 3.2 supabaseClient.js

- `detectSessionInUrl: true` → il token in hash su `/reset-password` viene letto e la sessione di recovery viene impostata.  
- Comportamento: **corretto** per il passo “clic sul link → form nuova password”.

### 3.3 reset-password/page.jsx

- Attende sessione (PASSWORD_RECOVERY / INITIAL_SESSION), timeout 8s, messaggio “link non valido o scaduto” in caso di fallimento.  
- Comportamento: **corretto**.

**Conclusione:** il problema “la mail non arriva” **non** è causato da bug nel flusso app (forgot-password → reset-password). La causa è lato **Supabase (invio effettivo + deliverability)**.

---

## 4. Perché la mail “continua a non arrivare” – cause (in ordine)

| # | Causa | Spiegazione | Azione |
|---|--------|-------------|--------|
| 1 | **Rate limiting Supabase** | Una sola email di recovery per indirizzo in un intervallo (es. 1h). Richieste successive = 200 ma **nessun nuovo mail.send**. | Aspettare 1h (o il tempo indicato in dashboard), poi **una sola** richiesta “Invia link” per quell’email. |
| 2 | **Spam / filtro provider** | Email da `noreply@mail.app.supabase.io` spesso finisce in spam (Gmail, Libero, Outlook). | Controllare **spam**, “Promozioni”, “Altro”; cercare “Supabase” o “Reset”; segnalare “Non spam”. |
| 3 | **Mittente default Supabase** | Reputazione condivisa, blocchi o ritardi da parte dei provider. | Passare a **Custom SMTP** (dominio proprio o Resend/SendGrid/Mailgun). |
| 4 | **Email errata / utente inesistente** | Se l’email non è in Auth Users, Supabase può rispondere 200 ma non inviare (comportamento anti-enumerazione). | Verificare in **Authentication → Users** che l’email sia esatta (es. .com vs .it). |
| 5 | **Redirect URLs / Site URL** | Site URL o Redirect URLs sbagliati possono influire sul link nell’email (es. localhost). | In **Authentication → URL Configuration** impostare Site URL e Redirect URLs di produzione. |

---

## 5. Checklist operativa (cosa fare ora)

### In Supabase Dashboard

- [ ] **Authentication → URL Configuration**  
  Site URL = `https://gattilio27.vercel.app` (o tuo dominio).  
  Redirect URLs includono: `https://gattilio27.vercel.app/reset-password`, `https://gattilio27.vercel.app/`.

- [ ] **Authentication → Email Templates → Reset password**  
  Template non vuoto, con link (es. `{{ .ConfirmationURL }}`).

- [ ] **Authentication → Providers → Email**  
  Provider Email abilitato.

- [ ] **Project Settings → Auth → SMTP Settings**  
  Se **Custom SMTP** è disattivato: le email partono da `noreply@mail.app.supabase.io` (alta probabilità spam/blocco).  
  **Soluzione:** abilitare **Custom SMTP** e configurare (es. Resend, SendGrid) con dominio o mittente del servizio.

### In app / ambiente

- [ ] **Produzione (Vercel):** variabile **NEXT_PUBLIC_APP_URL** = `https://gattilio27.vercel.app` (o tuo dominio), così il link nell’email non è mai localhost.

### Comportamento utente

- [ ] Richiedere il link **una sola volta** e attendere almeno **5–10 minuti** (e controllare spam).
- [ ] Se si è già cliccato “Invia link” più volte: aspettare **~1 ora** e riprovare **una volta** con la stessa email; verificare prima in **Users** che l’email sia corretta.

---

## 6. Soluzione stabile (enterprise)

1. **Custom SMTP** in **Project Settings → Auth → SMTP** (Resend, SendGrid o Mailgun, con dominio/mittente dedicato).
2. **NEXT_PUBLIC_APP_URL** in produzione impostata al dominio reale.
3. **Un solo** “Invia link” per richiesta di recupero; spiegare all’utente di controllare spam e di attendere qualche minuto.

Dopo aver configurato il Custom SMTP, le nuove email di recupero partiranno dal tuo mittente e avranno molta più probabilità di arrivare in inbox.

---

## 7. Cosa controllare in Supabase Dashboard (adesso)

1. **Authentication → Logs**  
   Dopo aver cliccato “Invia link”, cerca negli ultimi log:
   - una riga **POST /recover** con status 200 (c’è sempre);
   - una riga **mail.send** con `mail_type: recovery` e la tua email.  
   Se **manca** la riga mail.send, Supabase non ha inviato l’email (rate limit o policy del progetto).

2. **Project Settings → Auth → SMTP**  
   Se **Custom SMTP** è disattivato, le email (quando partono) usano `noreply@mail.app.supabase.io` e spesso finiscono in spam. Attiva Custom SMTP (Resend, SendGrid, ecc.) per migliorare la deliverability.

3. **Authentication → Email Templates → Reset password**  
   Verifica che il template non sia vuoto e contenga il link (es. `{{ .ConfirmationURL }}`).

4. **Authentication → URL Configuration**  
   **Site URL** = URL di produzione (es. `https://gattilio27.vercel.app`). **Redirect URLs** includano `https://.../reset-password`.

**Errori/warning nei log Auth:** ERROR (`apiworker is exiting`, `config reloader`, `prometheus shut down`) e WARNING su `GOTRUE_JWT_ADMIN_GROUP_NAME` / `GOTRUE_JWT_DEFAULT_GROUP_NAME` sono interni/deprecation; l’app non usa quei JWT group → nessuna azione richiesta.

Supabase **non espone** in Dashboard un’opzione per disabilitare il rate limit sulle recovery email. Se per lo stesso indirizzo hai già richiesto il link di recente, bisogna **aspettare** (es. 1 ora) e riprovare **una sola volta**; in alternativa contattare il supporto Supabase per i limiti del progetto.

---

## 8. Riferimenti

- `docs/EMAIL_NON_ARRIVANO_DIAGNOSI_ENTERPRISE.md` – diagnosi e Custom SMTP
- `docs/RECUPERO_PASSWORD.md` – flusso e sicurezza
- `docs/AUTH_EMAIL_ENTERPRISE_E_REDIRECT.md` – redirect e NEXT_PUBLIC_APP_URL
- Supabase Dashboard: **Authentication → Logs** per verificare in tempo reale **mail.send** e **POST /recover**
