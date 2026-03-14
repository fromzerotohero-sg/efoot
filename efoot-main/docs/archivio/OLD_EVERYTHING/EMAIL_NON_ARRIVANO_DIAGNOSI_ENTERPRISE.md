# Perché non arrivano le email (diagnosi enterprise)

Analisi basata su **log Auth Supabase** e configurazione: perché le email di recupero password (e conferma iscrizione) non arrivano e cosa fare.

---

## 1. Cosa dicono i log (verifica effettuata)

- **POST /recover** → **status 200**: Supabase accetta la richiesta di “Recupera password” e risponde OK.
- **Evento `mail.send`** presente nei log Auth:  
  `mail_from: noreply@mail.app.supabase.io`, `mail_to: <email>`, `mail_type: recovery`.  
  Quindi **Supabase invia davvero l’email** verso il provider (Gmail, Libero, ecc.).

**Conclusione:** il problema **non** è che l’app non chiama l’API o che Supabase rifiuta. Il problema è **deliverability**: l’email viene inviata ma **non arriva in inbox** (spam, blocco, reputazione mittente).

---

## 2. Cause probabili (in ordine)

| Priorità | Causa | Cosa fare |
|----------|--------|-----------|
| **1** | **Spam / posta indesiderata** | Controllare sempre spam, “Promozioni” (Gmail), “Altro”. Cercare “Supabase” o “Reset”. Segnalare “Non spam”. |
| **2** | **Mittente default Supabase** | `noreply@mail.app.supabase.io` ha reputazione condivisa; Gmail/Outlook/Libero spesso la mettono in spam o la ritardano. **Soluzione:** Custom SMTP con tuo dominio. |
| **3** | **Rate limit / anti-abuse** | Se l’utente ha cliccato “Invia link” più volte, Supabase può inviare solo la prima email (o throttling). Aspettare 10–15 minuti e riprovare una sola volta. |
| **4** | **Email utente errata** | Se in **Authentication → Users** l’email è diversa (es. .com vs .it), l’email va in un altro account. Verificare l’indirizzo esatto in Supabase. |
| **5** | **Template o SMTP disabilitati** | Template “Reset password” vuoto o SMTP non configurato correttamente. Verificare in Dashboard (vedi sotto). |

---

## 3. Checklist operativa (Supabase Dashboard)

Eseguire in ordine.

### 3.1 Authentication → URL Configuration

- **Site URL**: deve essere l’URL pubblico dell’app (es. `https://tuodominio.com`), **non** `http://localhost:3000` in produzione.
- **Redirect URLs**: devono essere presenti:
  - `https://tuodominio.com/reset-password`
  - `https://tuodominio.com/`  
  (e in dev, se serve, `http://localhost:3000/reset-password`).

### 3.2 Authentication → Email Templates

- Aprire **Reset password** (e, se usi conferma, **Confirm signup**).
- Verificare che il template **non sia vuoto** e che contenga il placeholder `{{ .ConfirmationURL }}` (o equivalente) per il link.
- Salvare eventuali modifiche.

### 3.3 Authentication → Providers → Email

- Verificare che il provider **Email** sia **abilitato**.
- Se usi conferma iscrizione: **Confirm email** attivo.

### 3.4 Project Settings → Auth → SMTP Settings

- Se **Custom SMTP** è **disattivato**: Supabase usa `noreply@mail.app.supabase.io`. È la causa più frequente di “non arrivano” (spam/blocco).
- **Soluzione enterprise:** attivare **Enable Custom SMTP** e configurare (vedi sotto).

---

## 4. Configurare Custom SMTP (soluzione enterprise)

Con Custom SMTP le email partono **dal tuo dominio** (o da un servizio con buona reputazione) e arrivano molto più spesso in inbox.

1. **Project Settings** → **Auth** → **SMTP Settings**.
2. **Enable Custom SMTP** = ON.
3. Compilare:
   - **Sender email**: es. `noreply@tuodominio.com` (o l’email fornita dal provider).
   - **Sender name**: es. `Gattilio27` o il nome dell’app.
   - **Host**: server SMTP (es. per SendGrid `smtp.sendgrid.net`, per Resend `smtp.resend.com`, per Gmail vedi sotto).
   - **Port**: di solito 587 (TLS) o 465 (SSL).
   - **Username / Password**: quelle fornite dal provider (es. API key come username per SendGrid/Resend).

**Provider comuni:**

- **Resend** (consigliato, semplice): [resend.com](https://resend.com) → API Key → in Supabase usare host `smtp.resend.com`, porta 587, username `resend`, password = API key.
- **SendGrid**: [sendgrid.com](https://sendgrid.com) → creare API Key → host `smtp.sendgrid.net`, porta 587, username `apikey`, password = API key.
- **Mailgun**: dominio verificato → SMTP credentials da Dashboard.
- **Gmail (solo test)**: account con “App password”, host `smtp.gmail.com`, porta 587; sconsigliato per produzione (limiti e rischio blocco).

Dopo aver salvato, **inviare una nuova richiesta** “Recupera password” e controllare di nuovo **inbox e spam**.

---

## 5. Verifica l’email dell’utente in Supabase

Se un utente specifico non riceve mai l’email:

1. **Authentication** → **Users** → cercare per nome o email.
2. Controllare che **Email** sia esattamente quella che l’utente inserisce in “Recupera password” (maiuscole/minuscole non contano, ma .com vs .it sì).
3. Se è sbagliata: correggere l’email in Supabase (o creare un nuovo utente e migrare i dati, a seconda della policy).

---

## 6. Riepilogo

- **Log:** Supabase risponde 200 a `/recover` e registra `mail.send` → le email **partono**.
- **Perché non arrivano:** soprattutto **spam** e **mittente default** (`noreply@mail.app.supabase.io`).
- **Cosa fare subito:** controllare spam; verificare Site URL e Redirect URLs; verificare template e che l’email in Users sia corretta.
- **Soluzione stabile:** **Custom SMTP** con dominio o servizio (Resend, SendGrid, Mailgun) e **NEXT_PUBLIC_APP_URL** in produzione.

---

## 7. Errore "Link non valido o scaduto" dopo il clic (log: One-time token not found)

Nei **log Auth** può comparire **"One-time token not found"** / **"403: Email link is invalid or has expired"** su **GET /verify**.

- **Cause:** il link è **monouso**: dopo il primo clic (o dopo aver impostato la nuova password) il token viene invalidato. Se l’utente clicca di nuovo sullo stesso link, Supabase risponde 403. Oppure il token è **scaduto** (validità tipica 1h).
- **Cosa fare:** mostrare il messaggio "Link non valido o scaduto. Richiedi un nuovo link dalla pagina Recupera password." e link a `/forgot-password`.

Inoltre, l’app deve **leggere il token dall’URL** quando l’utente arriva su `/reset-password` con il fragment (`#access_token=...&type=recovery`). In **`lib/supabaseClient.js`** deve essere impostato **`detectSessionInUrl: true`** (se è `false`, la sessione di recovery non viene mai creata e la pagina resta in caricamento o mostra "link non valido"). Con `detectSessionInUrl: true` il client Supabase processa l’hash e imposta la sessione; la pagina reset-password può poi mostrare il form per la nuova password.

Vedi anche: `docs/RECUPERO_PASSWORD.md`, `docs/AUTH_EMAIL_ENTERPRISE_E_REDIRECT.md`.
