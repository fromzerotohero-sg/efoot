# Segnalazioni bug per Tommaso (programmatore)

Documento di riepilogo bug segnalati / individuati, per intervento del programmatore.

---

## 1. API `/api/user/profile` — 500 e profilo non caricato (RISOLTO)

### Sintomo
- Dopo login MetalGate (token verificato con successo), la chiamata `GET /api/user/profile` risponde con **status 500**.
- In console: `Failed to load resource: the server responded with a status of 500`.
- Le pagine che dipendono dal profilo mostrano errore:
  - **Guida**: «Error loading profile» / «Failed to load profile»
  - **Impostazioni Profilo**: «Errore caricamento profilo»

### Causa
- File: **`app/api/user/profile/route.js`**.
- La query Supabase sulla tabella `user_profiles` include nel **`.select()`** la colonna **`user_metadata`**.
- La tabella **`user_profiles`** in Supabase **non ha** la colonna `user_metadata` (le colonne effettive sono: `id`, `user_id`, `first_name`, `last_name`, `current_division`, `favorite_team`, `team_name`, `ai_name`, `nickname`, `leaderboard_consent`, `is_metalgate_user`, `metalgate_user_id`, ecc.).
- Postgres/Supabase restituisce errore (es. colonna inesistente) → la route va in catch o in `if (error)` → risposta **500**.

### Impatto
- Utenti MetalGate (e chiunque usi quella route) non possono caricare il profilo: Guida e Impostazioni Profilo risultano in errore. Il resto dell’app può funzionare, ma tutto ciò che dipende dai dati profilo no.

### Fix applicato
- Rimossa la colonna **`user_metadata`** dalla `.select()` della route `GET` in `app/api/user/profile/route.js` (non presente in tabella `user_profiles`).
- Se in futuro serviranno metadati utente nel profilo, aggiungere prima una colonna (o struttura) nello schema di `user_profiles` e poi esporla in select.

### Ambiente
- Rilevato in **produzione** (deploy Vercel), con utenti **MetalGate**.

---

## 2. Chat launcher — TypeError su touch (mobile) (RISOLTO)

### Sintomo
- Su mobile, al **touch end** sul pulsante «Chiedi al Coach», in console:
  - `Uncaught TypeError: Cannot read properties of null (reading 'style')`
  - Stack: `setTimeout` → `onTouchEnd` (chunk 567-…).

### Causa
- In **`components/AssistantChat.jsx`**, l’handler **`onTouchEnd`** avvia un `setTimeout(..., 300)` per ripristinare dimensioni/stile del pulsante dopo l’espansione.
- Quando il callback del timeout viene eseguito (dopo 300 ms), a volte il pulsante **non è più nel DOM** (es. la chat si è aperta e il launcher è stato smontato/nascosto), quindi il riferimento usato (es. `e.currentTarget`) è `null` e l’accesso a `.style` genera il TypeError.

### Impatto
- Solo errore in console; la chat si apre correttamente. Nessun blocco per l’utente, ma log sporchi e possibili segnalazioni da tool di monitoraggio.

### Fix applicato
- Nel `setTimeout` di `onTouchEnd`:
  - conservare il riferimento all’elemento (`const el = e.currentTarget`) prima del timeout;
  - all’interno del timeout, prima di usare `.style`, verificare **`if (!el || !el.isConnected) return`**.
- In questo modo non si accede mai a `.style` su un elemento non più in pagina.

### Stato
- **Risolto** (modifica già presente in `AssistantChat.jsx`).

---

## Riferimenti rapidi

| Bug | File principale | Stato |
|-----|-----------------|--------|
| Profile API 500 | `app/api/user/profile/route.js` | Risolto |
| Chat launcher touch null | `components/AssistantChat.jsx` | Risolto |

---

*Ultimo aggiornamento: marzo 2026.*
