# Analisi enterprise: perché il profilo “non funziona”

**Obiettivo:** capire in modo strutturato perché l’utente vede dati sbagliati (es. “Giovanni” invece di “attilio”, squadra preferita vuota o errata) e perché l’UX non riflette Supabase.

---

## 1. Catena dell’identità (end-to-end)

### 1.1 Da dove parte il token

| Fase | Dove | Cosa succede |
|------|------|--------------|
| **Login MetalGate** | Utente fa login su MetalGate → redirect a `/auth/callback?token=XXX` | Il `token` in query è **il token MetalGate** (opaco o JWT MetalGate), **non** un JWT Supabase. |
| **Callback frontend** | `app/auth/callback/page.jsx` | Chiama `POST /api/auth/metalgate-callback` con `{ token }`. Il backend usa MetalGate `/sso/user-info` per validare e poi crea/aggiorna la riga in `user_profiles` con `metalgate_user_id = user.id`. |
| **Storage** | Dopo 200 da metalgate-callback | `localStorage.setItem('auth_token', token)` e `localStorage.setItem('metalgate_user', JSON.stringify({ id, email, ... }))`. Quindi **auth_token = token MetalGate**. |

Conclusione: dopo login MetalGate, **auth_token** è sempre il **token MetalGate**. Il backend (profile, save-profile) riceve questo stesso token nell’header `Authorization: Bearer <auth_token>`.

---

### 1.2 Come il backend risolve l’identità

| Step | File | Comportamento |
|------|------|----------------|
| 1 | `extractBearerToken(request)` | Legge `Authorization: Bearer XXX` → token inviato dal frontend. |
| 2 | `validateToken(token, ...)` | **Prima** chiama MetalGate `POST .../sso/verify` con `{ token }`. Se `metalgateRes.ok` e `metalgateData.valid` → restituisce `userData.user.id = metalgateData.user.id` (UUID MetalGate) e `user_metadata.is_metalgate_user = true`. **Poi** (solo se MetalGate non ok) prova Supabase `getUser(token)`. |
| 3 | Profile/save-profile | Se `user_metadata?.is_metalgate_user` → query `user_profiles` con `.eq('metalgate_user_id', userId)` → ottiene `user_id` (UUID Supabase). Usa questo `user_id` per leggere/scrivere il profilo. |

Se il token è **sempre** quello MetalGate e MetalGate risponde ok, il backend usa **sempre** il profilo legato a `metalgate_user_id`. Quindi l’identità risolta è **una sola** per utente MetalGate: la riga in `user_profiles` con quel `metalgate_user_id`.

---

## 2. Perché può “non funzionare”: cause radice

### 2.1 (A) Token inviato non è quello MetalGate

**Scenario:** la richiesta `GET /api/user/profile` o `POST /api/supabase/save-profile` arriva con un token **diverso** da quello MetalGate (es. JWT Supabase).

- **Quando succede:**  
  - Se `localStorage.getItem('auth_token')` è vuoto/scaduto/cancellato e il frontend usa il **fallback** `supabase.auth.getSession()` e invia `session.session.access_token` (Supabase).  
  - Il backend allora valida con **Supabase** (MetalGate fallisce per un JWT Supabase) → `userData.user.id` = UUID Supabase (es. account “Giovanni”) → si legge/scrive la riga con quel `user_id`, **non** quella con `metalgate_user_id`.

- **Perché l’utente vede “Giovanni”:**  
  In Supabase esistono **più righe** con cognome “Guida”: una con `metalgate_user_id` (profilo collegato a MetalGate) e una o più con `metalgate_user_id` null (solo Supabase). Se il frontend invia il token Supabase, il backend restituisce/aggiorna la riga “solo Supabase” (es. Giovanni).

- **Cosa abbiamo fatto in codice:**  
  Con `isMetalgateSession` (presenza di `metalgate_user` in localStorage) **non** usiamo più `getSession()` se manca `auth_token`: andiamo a login. Così non inviamo più un token Supabase “al posto” del MetalGate. Resta il rischio se in qualche path (altro componente, altro flusso) si legge ancora il token da getSession() e si invia alle API.

---

### 2.2 (B) MetalGate non raggiungibile dal backend

**Scenario:** in esecuzione (es. su Vercel), la chiamata da backend a `NEXT_PUBLIC_METALGATE_API_URL/sso/verify` fallisce (rete, URL errato, timeout, 5xx).

- **Comportamento:**  
  `validateToken` va in catch o riceve `!metalgateRes.ok` → fa fallback a **Supabase** `getUser(token)`. Il token è MetalGate → Supabase lo rifiuta → si restituisce 401. Quindi **non** si restituisce un profilo “Giovanni” per questo motivo; si restituisce errore.

- **Eccezione:**  
  Se per qualche motivo il token inviato fosse un JWT Supabase (caso A), allora il fallback Supabase avrebbe successo e si vedrebbe il profilo Supabase (sbagliato). Quindi (B) diventa critico solo se combinato con (A) o con un token “ibrido”.

---

### 2.3 (C) Dati in Supabase già sbagliati (riga corretta, valori errati)

**Scenario:** il backend risolve correttamente l’identità (riga con `metalgate_user_id = e55aed12-...`, `user_id = 357c0b71-...`) ma in quella riga `first_name` / `last_name` (e magari `favorite_team`) sono già “Giovanni” / “Guida” / vuoti.

- **Perché può essere successo:**  
  1. In passato il frontend ha inviato un token Supabase (caso A) e l’utente ha salvato → la riga aggiornata era quella “Supabase” (Giovanni).  
  2. Oppure in un altro momento il frontend ha caricato il profilo “Giovanni” (per A o per cache), l’utente ha modificato il form e ha cliccato Salva: il token in quel salvataggio era MetalGate → il backend ha fatto upsert sulla riga **MetalGate** (357c0b71-...) con i dati del form (**Giovanni Guida**) → sovrascrittura dei dati corretti (Attilio) su quella riga.

- **Risultato:**  
  Anche con flusso token/API corretto, GET profile restituisce **Giovanni** perché è ciò che c’è in DB su quella riga. L’UX “non funziona” perché riflette esattamente dati DB errati.

- **Fonte:**  
  Audit (`AUDIT_PRIMO_COMMIT_E_SUPABASE.md`): la riga con `user_id = 357c0b71-...` e `metalgate_user_id = e55aed12-...` in origine era Attilio Mazzetti; dopo aggiornamenti risulta **Giovanni Guida** (probabile salvataggio dall’app con form compilato come Giovanni).

---

### 2.4 (D) Cache (browser / CDN / intermediari)

**Scenario:** la risposta di `GET /api/user/profile` viene cachata e una richiesta successiva riceve una risposta vecchia (es. profilo “Giovanni” o vecchio stato).

- **Cosa abbiamo fatto:**  
  `?t=${Date.now()}` e `cache: 'no-store'` in frontend; header `Cache-Control: no-store, no-cache, must-revalidate` sulla risposta della route. Questo riduce il rischio ma non esclude proxy/CDN che ignorano no-store.

- **Impatto:**  
  Se una risposta cachata restituisce il profilo sbagliato, l’utente continua a vedere “Giovanni” finché non viene servita una risposta fresca (stesso token, identità corretta).

---

### 2.5 (E) Più righe “Guida” e ambiguità visiva

In Supabase ci sono più profili con cognome “Guida” e diversi `user_id` / `metalgate_user_id`. L’utente si aspetta “un solo” profilo (il proprio). Se il backend restituisce la riga sbagliata (per token sbagliato) o la riga giusta ma con dati già sovrascritti (C), l’UX mostra comunque “Giovanni” o dati incoerenti: **il sintomo è unico, le cause possono essere (A), (C) o (D)**.

---

## 3. Riepilogo cause e priorità

| Causa | Descrizione | Tipo | Azione |
|-------|-------------|------|--------|
| **A** | Frontend invia token Supabase invece di MetalGate (es. getSession quando auth_token manca) | Logica / integrazione | Verificare che **nessun** path usi getSession() per le API quando è attiva una sessione MetalGate; già mitigato con isMetalgateSession. Controllare tutti i punti che chiamano profile/save-profile. |
| **B** | MetalGate /sso/verify non raggiungibile dal backend | Infra / config | Verificare `NEXT_PUBLIC_METALGATE_API_URL` in produzione, connettività server→MetalGate, timeout; in caso di fallback Supabase con token MetalGate si ha 401, non profilo sbagliato. |
| **C** | Riga MetalGate (user_id 357c0b71-...) già contenente first_name/last_name (e/o favorite_team) errati | **Dati** | **Correzione dati:** aggiornare in Supabase la riga con `metalgate_user_id = e55aed12-...` impostando first_name/last_name (e altri campi) ai valori corretti (es. Attilio, Mazzetti). Senza questo, anche con codice e token corretti l’UX mostrerà “Giovanni”. |
| **D** | Risposta GET profile cachata | Rete / header | Confermare che nessun proxy/CDN sovrascriva Cache-Control; in dubbio, aggiungere anche no-cache e max-age=0; mantenere cache busting `?t=` lato client. |
| **E** | Più profili “Guida” in DB | Dati / prodotto | Non è di per sé un bug; diventa confusione se combinato con (A) o (C). Gestione: allineare sempre identità (MetalGate prima) e dati sulla riga MetalGate. |

---

## 4. Conclusione enterprise

- **Perché “non funziona”:**  
  L’UX mostra “Giovanni” (o dati non aggiornati) perché **almeno una** di queste è vera:  
  (1) il token inviato alle API non è quello MetalGate e il backend restituisce/aggiorna il profilo Supabase (causa **A**);  
  (2) la riga in Supabase collegata a MetalGate contiene già first_name/last_name (e/o altri campi) sbagliati per sovrascritture passate (causa **C**);  
  (3) il client riceve una risposta cachata con profilo vecchio (causa **D**).

- **Cosa fare per far “funzionare” in modo stabile:**  
  1. **Dati:** correggere in Supabase i valori della riga `user_id = 357c0b71-...` (metalgate_user_id = e55aed12-...) come da audit (first_name, last_name, eventualmente favorite_team, ecc.).  
  2. **Token:** assicurare che ovunque si chiami profile o save-profile si usi **solo** `auth_token` quando è presente `metalgate_user`, e non getSession(); verificare che non ci siano altri entry point (altre pagine, componenti, iframe) che inviano un token diverso.  
  3. **MetalGate:** verificare in produzione che il backend raggiunga MetalGate e che `/sso/verify` risponda ok per il token che il client invia.  
  4. **Cache:** mantenere no-store e cache busting; in produzione verificare che le risposte profile non siano cachate da intermediari.

Questa analisi descrive in modo enterprise il **perché** il comportamento attuale non è corretto e su quali leve agire (dati, token, backend MetalGate, cache) per farlo funzionare.
