# Soluzione: il cliente deve vedere in UX ciò che salva

**Obiettivo:** dopo il salvataggio (e al caricamento), l’interfaccia mostri esattamente i dati salvati in Supabase (nome, cognome, squadra preferita, ecc.).

---

## 1. Cosa è stato implementato

### 1.1 Refetch dopo Salva (Impostazioni Profilo)

**File:** `app/impostazioni-profilo/page.jsx`  
**Comportamento:** Dopo una risposta 200 da `POST /api/supabase/save-profile`, la pagina:

1. Aggiorna subito lo stato con i dati restituiti dalla API (`data.profile`).
2. **Esegue un refetch** da `GET /api/user/profile` (stesso token, `cache: 'no-store'`, `?t=Date.now()`).
3. Sovrascrive `profileData` e `profile` con la risposta del GET.

**Effetto:** L’UX mostra ciò che il server restituisce come profilo (fonte di verità). Se il salvataggio è andato sulla riga corretta, nome, cognome e squadra preferita coincidono con quanto salvato.

### 1.2 Token e identità (già presenti)

- **authHelper:** MetalGate prima, poi Supabase → per il token MetalGate si usa sempre la riga con quel `metalgate_user_id`.
- **Pagina profilo e Palestra Coach:** con `metalgate_user` in localStorage non si usa `getSession()` se manca `auth_token` → si evita di inviare un token Supabase e di leggere/scrivere il profilo sbagliato.
- **GET profile:** `select('*')`, header `Cache-Control: no-store`, nessun uso di nome/cognome per identificare l’utente (solo `user_id` / `metalgate_user_id`).

---

## 2. Cosa fare se l’UX mostra ancora dati sbagliati

### 2.1 Correzione dati in Supabase (una tantum)

Se la riga collegata al tuo account MetalGate ha ancora nome/cognome (o altri campi) errati, vanno aggiornati in Supabase.

1. **Identificare la riga:**  
   In `user_profiles` cerca la riga con `metalgate_user_id` = ID restituito da MetalGate per il tuo account (es. `e55aed12-3a03-48fe-aa7c-dd6b9187de08`).  
   Oppure, da Supabase Dashboard: tabella `user_profiles`, filtra per `metalgate_user_id` = valore che usi in produzione.

2. **Aggiornare i campi:**  
   Esegui un UPDATE sui campi da correggere (es. `first_name`, `last_name`, `favorite_team`), solo su quella riga.

   Esempio (SQL Editor Supabase):

   ```sql
   UPDATE public.user_profiles
   SET
     first_name = 'Attilio',
     last_name = 'Mazzetti',
     favorite_team = 'Milan'  -- opzionale
   WHERE metalgate_user_id = 'e55aed12-3a03-48fe-aa7c-dd6b9187de08';
   ```

   Sostituisci `metalgate_user_id` e i valori con quelli corretti per il cliente.

3. **Verifica:**  
   Dopo la correzione, fai logout/login (o almeno ricarica e “Ricarica” profilo) e controlla che Impostazioni Profilo e Palestra Coach mostrino i dati aggiornati.

### 2.2 Checklist rapida

| Controllo | Azione |
|-----------|--------|
| Dopo click “Salva”, i campi restano quelli che ho scritto? | Sì → refetch dopo save (punto 1.1). Se no, verificare in Network: GET `/api/user/profile` dopo il POST e il body della risposta. |
| Vedo ancora il nome di un altro utente? | Verificare che il token inviato sia quello MetalGate (header `Authorization` nelle richieste). Se c’è `metalgate_user` in localStorage, non deve essere usato getSession() per le chiamate API. |
| La riga in Supabase è corretta ma l’app mostra valori vecchi? | Refetch dopo save + Cache-Control e `?t=` dovrebbero evitarlo. Controllare che non ci siano proxy/CDN che cachano la risposta GET profile. |
| Ho più account (MetalGate + Supabase) e voglio usare sempre quello MetalGate | Effettuare login da flusso MetalGate; in localStorage devono essere presenti `auth_token` e `metalgate_user`. Non fare login con email/password Supabase nello stesso browser se vuoi usare solo il profilo MetalGate. |

---

## 3. Riferimenti

- **Analisi cause:** `docs/ANALISI_ENTERPRISE_PERCHE_NON_FUNZIONA.md`
- **Funzionamento attuale:** `docs/FUNZIONAMENTO_PROFILO_E_PALESTRA_ATTUALE.md`
- **Bug e segnalazioni:** `docs/SEGNALAZIONI_BUG_PER_TOMMASO.md`
