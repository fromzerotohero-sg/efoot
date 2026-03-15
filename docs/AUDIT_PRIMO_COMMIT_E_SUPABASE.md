# Audit: codice al primo commit (ff0d014) e stato Supabase

**Data audit:** 2026-03-15  
**Primo commit:** `ff0d014` (Initial commit)  
**Scopo:** riferimento allo stato originario di codice e DB per profilo / auth / Palestra Coach.

---

## 1. Codice al primo commit (ff0d014)

### 1.1 `lib/authHelper.js` (originario)

- **Ordine validazione:** prima **Supabase** (`authClient.auth.getUser(token)`), poi **MetalGate** come fallback (solo se Supabase fallisce).
- Nessun tentativo MetalGate se il token è valido per Supabase.
- Commento: "Try validating with Metalgate SSO as fallback".

### 1.2 `app/api/user/profile/route.js` (originario)

- Token → `validateToken` → se `user_metadata?.is_metalgate_user` → lookup `user_profiles` per `metalgate_user_id` → `userId` = `existingProfile.user_id` (o 404).
- Select **esplicito** di colonne (include `user_metadata`).
- Risposta: `NextResponse.json(profile || {})` **senza** header Cache-Control.
- Logica MetalGate: invariata (lookup per metalgate_user_id).

### 1.3 `app/impostazioni-profilo/page.jsx` (originario)

- **Token:** `localStorage.getItem('auth_token')`; se c’è token e `metalgate_user` in localStorage → usa `userId` da metalgate_user; altrimenti `supabase.auth.getSession()`.
- **Fetch profilo:** `fetch('/api/user/profile', { headers: { Authorization } })` — **nessun** `?t=`, **nessun** `cache: 'no-store'`.
- **Caricamento:** un solo `useEffect` con `fetchProfile` dentro (nessun `useCallback` separato, nessun pulsante Ricarica).
- **Nessun** controllo `isMetalgateSession` per evitare getSession(); nessun redirect esplicito su 401/404.
- **CoachFeedbackChat:** `onClose={() => setShowCoachGym(false)}` — nessun refetch alla chiusura, nessun refetch on visibility.

### 1.4 `components/CoachFeedbackChat.jsx` (originario)

- **Token:** se c’è token legge `metalgate_user` da localStorage per `userId`; altrimenti `getSession()`. Richiede `token` **e** `userId` per fare il fetch (se manca userId con metalgate, non chiama l’API).
- **Fetch profilo:** `fetch('/api/user/profile', { headers })` — nessun cache busting.
- **Effetti:** form init e messaggi con deps `[show, userProfile]` — quindi al cambio di `userProfile` (es. dopo setLoadedProfile in save) si resettavano formSaved e messaggi.
- **Nessun** `isMetalgateSession`, nessun `cache: 'no-store'`.

---

## 2. Stato attuale del codice (dopo le fix)

- **authHelper:** MetalGate **prima**, Supabase fallback.
- **profile route:** `select('*')`, risposta con header `Cache-Control: no-store, no-cache, must-revalidate`.
- **impostazioni-profilo:** `isMetalgateSession`, fetch con `?t=` e `cache: 'no-store'`, refetch in `onClose` della modal e refetch on visibility (con modal chiusa).
- **CoachFeedbackChat:** token come Impostazioni Profilo, fetch con `?t=` e `cache: 'no-store'`, `formJustOpenedRef` / `messagesJustOpenedRef` per non resettare UX dopo save.
- **Banner profilo:** preview dati tecnici (platform, connection, pass, weak point).

---

## 3. Supabase – tabella `user_profiles`

### 3.1 Schema rilevante (da list_tables)

- `user_id` (UUID, UNIQUE, FK auth.users)
- `metalgate_user_id` (UUID, nullable) — usato dall’API per risolvere il profilo quando il token è MetalGate.
- `first_name`, `last_name`, e gli altri campi profilo (current_division, team_name, platform, connection_quality, pass_level, ai_weak_point, ecc.).

### 3.2 Snapshot dati (query 2026-03-15)

| user_id | metalgate_user_id | first_name | last_name |
|---------|-------------------|------------|-----------|
| 00a83248-... | d0a46af6-... | cawe | null |
| 08afc8ce-... | bbe6da60-... | tpa2 | null |
| 357c0b71-... | **e55aed12-3a03-48fe-aa7c-dd6b9187de08** | **Giovanni** | **Guida** |
| 50bed457-... | null | Giovanni | Guida |
| 66152cb2-... | null | attilio | null |
| 70d8cc9f-... | null | Giovanni | Guida |
| d921930c-... | null | attilio | mazzetti |
| ... | ... | ... | ... |

### 3.3 Problema attuale in Supabase

- L’id MetalGate **e55aed12-3a03-48fe-aa7c-dd6b9187de08** è collegato alla riga **user_id = 357c0b71-09fc-4aec-b0e6-7aac08107575**.
- In origine quella riga era **Attilio Mazzetti** (prima della correzione manuale).
- Dopo l’UPDATE che ha impostato `metalgate_user_id` su quella riga, **first_name/last_name** risultano **Giovanni Guida** (probabile salvataggio dall’app con form ancora compilato come Giovanni).
- **Risultato:** il login MetalGate restituisce correttamente il profilo collegato a quell’id, ma la riga mostra nome/cognome sbagliati (Giovanni Guida invece di Attilio Mazzetti).

### 3.4 Cosa fare in Supabase (correzione dati)

- Sulla riga **user_id = 357c0b71-09fc-4aec-b0e6-7aac08107575** (quella con `metalgate_user_id = e55aed12-...`):
  - Impostare **first_name = 'Attilio'** (o 'attilio' se coerente con il resto).
  - Impostare **last_name = 'Mazzetti'** (o 'mazzetti').
- Nessun altro cambio di `metalgate_user_id`: il collegamento MetalGate → profilo è corretto; va solo ripristinato il nome sulla riga.

---

## 4. Riepilogo differenze primo commit vs attuale

| Aspetto | Primo commit (ff0d014) | Attuale |
|--------|------------------------|--------|
| authHelper ordine | Supabase prima, MetalGate fallback | MetalGate prima, Supabase fallback |
| Profile API Cache-Control | No | Sì (no-store, no-cache, must-revalidate) |
| Profile API select | Colonne esplicite (incl. user_metadata) | select('*') |
| Pagina profilo: metalgate_user | No (solo userId da metalgate_user) | Sì (isMetalgateSession, no getSession se metalgate) |
| Pagina profilo: fetch | Senza ?t= e senza cache: 'no-store' | Con ?t= e cache: 'no-store' |
| Pagina profilo: onClose modal | Solo setShowCoachGym(false) | setShowCoachGym(false) + fetchProfile() |
| Pagina profilo: visibility refetch | No | Sì (con modal chiusa) |
| CoachFeedbackChat: token/userId | Richiede userId da metalgate o session | isMetalgateSession, no getSession se metalgate |
| CoachFeedbackChat: fetch | Senza cache busting | ?t= e cache: 'no-store' |
| CoachFeedbackChat: effetti dopo save | formSaved e messaggi resettati (deps userProfile) | formJustOpenedRef / messagesJustOpenedRef, no reset |
| Banner profilo: preview dati tecnici | No | Sì |

---

## 5. Migrazioni e schema `user_profiles`

- La migrazione **create_user_profiles_table.sql** non include `metalgate_user_id` (è stata aggiunta in seguito con add_ai_info o altra migrazione).
- In Supabase la tabella **user_profiles** ha le colonne `metalgate_user_id` e `is_metalgate_user` (da list_tables).
- RLS abilitato; FK `user_id` → `auth.users(id)`.

---

Fine audit.
