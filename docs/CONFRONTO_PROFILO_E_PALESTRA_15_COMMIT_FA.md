# Confronto: Profilo e Palestra Coach – 15 commit fa vs oggi

**Commit di riferimento “15 fa”:** `7c130eb` (fix: AI Knowledge Bar mobile UX improvements)  
**Oggi:** HEAD attuale (dopo fix profilo, auth MetalGate-first, ecc.)

---

## 1. Dove vive “Il mio profilo di gioco” e “Ciao Giovanni!”

- **“Il mio profilo di gioco”** (form con Piattaforma, Connessione, Passaggi, Smart Assist, Punto debole, Divisione, Ore/sett, ecc.) e il saluto **“Ciao [nome]!”** sono nel componente **`components/CoachFeedbackChat.jsx`** (Palestra Coach).
- **Non** in `app/gestione-profilo/page.jsx`: quella pagina è Hero Points / crediti / classifica / transazioni.
- La Palestra Coach può essere aperta da dashboard o da impostazioni-profilo; riceve `userProfile` dal parent e, all’apertura, fa **GET `/api/user/profile`** per avere dati freschi. Il nome nel saluto è `userProfile.first_name` (cioè quello restituito da quell’API).

Quindi: se GET `/api/user/profile` restituisce il profilo di Giovanni, in Palestra Coach vedi “Ciao Giovanni!” e i dati del form sono quelli di Giovanni.

---

## 2. Impostazioni Profilo (`app/impostazioni-profilo/page.jsx`)

| Aspetto | 15 commit fa (7c130eb) | Oggi |
|--------|-------------------------|------|
| **Dove sta fetchProfile** | Dentro `useEffect`, non in useCallback | In `useCallback` con dipendenze `[t]` |
| **Dipendenze useEffect** | `[router]` | `[]` (solo al mount) – per evitare refetch che sovrascrivono le modifiche |
| **Token** | `auth_token`; se manca → `getSession()` | Stesso, ma se c’è `metalgate_user` **non** si usa `getSession()` (solo auth_token) |
| **Redirect se no token** | No, solo `setLoading(false)` e return | Sì, `router.push('/login')` |
| **Gestione 401/404** | No, solo throw su !res.ok | 401 → redirect login; 404 → form vuoto |
| **GET profile** | `fetch('/api/user/profile', { headers })` | `fetch(\`/api/user/profile?t=${Date.now()}\`, { headers, cache: 'no-store' })` |
| **handleSave** | POST senza `redirect: 'manual'` | POST con `redirect: 'manual'`; 301/302/303 e 401 → redirect login |
| **Pulsante Ricarica** | No | Sì, chiama `fetchProfile()` |

---

## 3. API GET profilo (`app/api/user/profile/route.js`)

| Aspetto | 15 commit fa (7c130eb) | Oggi |
|--------|-------------------------|------|
| **Select** | Lista esplicita di colonne incluso **`user_metadata`** (colonna inesistente in `user_profiles` → **500**) | `.select('*')` (nessun 500 per colonne mancanti) |
| **Risposta** | `NextResponse.json(profile \|\| {})` | Stesso + header `Cache-Control: no-store, no-cache, must-revalidate` |
| **Logica MetalGate** | Identica: se `is_metalgate_user` → lookup per `metalgate_user_id` → query per `user_id` | Identica |

---

## 4. Auth – `lib/authHelper.js` (validateToken)

| Aspetto | 15 commit fa (7c130eb) | Oggi |
|--------|-------------------------|------|
| **Ordine** | **Prima Supabase** `getUser(token)`, poi fallback **MetalGate** `/sso/verify` | **Prima MetalGate** `/sso/verify`, poi fallback **Supabase** `getUser(token)` |
| **Effetto** | Se il token è un JWT Supabase valido (es. stesso token usato dopo login MetalGate), si restituiva l’utente Supabase; per l’utente “Guida” poteva essere il profilo con first_name Giovanni invece che quello MetalGate (attilio). | Si preferisce l’identità MetalGate quando il token è valido per MetalGate; le route che fanno lookup per `metalgate_user_id` ricevono sempre quell’identità quando il token è MetalGate. |

---

## 5. Palestra Coach – `components/CoachFeedbackChat.jsx`

| Aspetto | 15 commit fa (7c130eb) | Oggi (da verificare in repo) |
|--------|-------------------------|------------------------------|
| **Profilo mostrato** | `userProfile = loadedProfile \|\| externalProfile`; `loadedProfile` da GET `/api/user/profile` all’apertura (`show`). | Stessa logica: all’apertura fa GET profile; il nome nel saluto è quello restituito da quell’API. |
| **Token per GET profile** | `auth_token`; se manca → `getSession()`. Nessun “se metalgate_user non usare getSession”. | Se il componente non è stato aggiornato, usa ancora lo stesso schema (auth_token + getSession). Quindi può ancora inviare token Supabase e ricevere il profilo “Giovanni”. |
| **Salvataggio form “Il mio profilo di gioco”** | **POST `/api/supabase/save-ai-info`** (campi piattaforma, connessione, pass_level, smart_assist, input_delay, ai_weak_point, ore, ai_learn_goals, ai_notes). **Non** save-profile. | Stesso: i dati tecnici di gioco (palestra) si salvano con save-ai-info. |

Quindi:
- **Impostazioni Profilo** (nome, cognome, divisione, squadra, nickname, ecc.) → **save-profile** + GET **user/profile**.
- **Palestra Coach** (Il mio profilo di gioco: piattaforma, connessione, PA, smart assist, punto debole, ecc.) → **save-ai-info** + GET **user/profile** (per mostrare nome e precompilare il form).

In entrambi i casi il **nome nel saluto** (“Ciao Giovanni!”) viene da **GET `/api/user/profile`**: chi risponde a quella chiamata (identità risolta da `validateToken` + lookup MetalGate) determina quale riga di `user_profiles` si legge e quindi quale `first_name` si vede.

---

## 6. Save-profile (`app/api/supabase/save-profile/route.js`)

| Aspetto | 15 commit fa (7c130eb) | Oggi |
|--------|-------------------------|------|
| **GET** | Nessun handler (405 implicito) | Handler GET esplicito che restituisce 405 + body JSON |
| **POST** | Invariato (validateToken, MetalGate lookup, upsert) | Invariato; ma validateToken ora prova prima MetalGate |

---

## 7. Riepilogo differenze utili per il debug

1. **15 commit fa** la GET profilo poteva andare in **500** per la select con `user_metadata`; oggi si usa `select('*')`.
2. **15 commit fa** in **validateToken** si usava prima Supabase: con un token Supabase (stesso browser/sessione) poteva tornare il profilo “Giovanni” (stesso cognome, altro account). **Oggi** si prova prima MetalGate, così con token MetalGate si dovrebbe ottenere sempre il profilo collegato a MetalGate (attilio).
3. **Palestra Coach** continua a basarsi su **GET `/api/user/profile`** per nome e dati form; non ha la logica “se c’è metalgate_user non usare getSession()”. Se da quella pagina parte una chiamata con token preso da `getSession()` (es. auth_token assente), l’API potrebbe ancora restituire il profilo Supabase (Giovanni).
4. **Impostazioni Profilo** oggi evita il fallback getSession quando c’è `metalgate_user`; **CoachFeedbackChat** andrebbe allineato (stessa regola token) così che anche “Il mio profilo di gioco” e il saluto usino sempre lo stesso profilo (MetalGate se hai fatto login MetalGate).

---

## 8. File da controllare / allineare

- **`components/CoachFeedbackChat.jsx`**  
  Dove si prende il token per GET `/api/user/profile` (e eventualmente per save-ai-info): applicare la stessa logica di impostazioni-profilo (se `metalgate_user` presente, non usare `getSession()`, usare solo `auth_token`; se manca token → non chiamare l’API o mostrare messaggio di login).
- **`app/api/user/profile/route.js`**  
  Già aggiornata (select('*'), Cache-Control); dipende da **validateToken** (già MetalGate-first) per quale profilo restituire.
- **`lib/authHelper.js`**  
  Già MetalGate-first; usata da user/profile e save-profile (e da save-ai-info se usa validateToken).

Se dopo queste modifiche vedi ancora “Ciao Giovanni!” in Palestra Coach, controllare in Network la richiesta GET `/api/user/profile` (header Authorization e body della risposta: quale `first_name` arriva). Se arriva ancora Giovanni, il token inviato sta ancora risolvendo sull’altro account (es. token Supabase o endpoint MetalGate non raggiunto/fallito).
