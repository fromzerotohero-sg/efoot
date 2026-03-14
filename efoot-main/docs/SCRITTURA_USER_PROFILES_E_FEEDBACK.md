# Come si scrivono user_profiles e user_tactical_feedback

**Scopo:** Dettaglio di dove e come vengono scritti i dati nelle tabelle `user_profiles` e `user_tactical_feedback`, per coerenza e per la classifica (nickname).

---

## 1. Tabella `user_profiles`

### 1.1 Chi scrive e come

| Campo | Scritto da | File / API | Dettaglio |
|-------|------------|------------|-----------|
| **nickname** | Solo save-profile | `app/api/supabase/save-profile/route.js` | Il body della richiesta può contenere `nickname` (stringa, max 255 caratteri). Se presente, viene fatto `upsert` su `user_profiles` con `profileUpdate.nickname = nickname`. **Nessun altro flusso scrive nickname** (né save-coach-feedback né save-ai-info). |
| **leaderboard_consent** | Solo save-profile | idem | Body: `leaderboard_consent` (boolean). |
| **first_name, last_name, team_name, current_division, favorite_team, ai_name, how_to_remember, hours_per_week, common_problems** | save-profile | idem | Inviati dal form Impostazioni profilo / Gestione profilo e scritti in `user_profiles` con upsert. |
| **ai_weak_point, ai_learn_goals, ai_notes, platform, connection_quality, pass_level, smart_assist, favourite_player_name, ecc.** | save-profile **oppure** save-coach-feedback **oppure** save-ai-info | save-profile, `app/api/save-coach-feedback/route.js`, `app/api/supabase/save-ai-info/route.js` | save-profile: se il form li invia. save-coach-feedback: l’AI estrae `profile_updates` dalla conversazione Palestra Coach; solo i campi in whitelist vengono applicati con `UPDATE user_profiles SET ... WHERE user_id = ?`. save-ai-info: aggiorna i campi AI da Impostazioni profilo (sezione AI). **In save-coach-feedback non c’è mai `nickname`** nella whitelist. |

### 1.2 Flusso del nickname (per la classifica)

1. **Frontend:** Solo la pagina **Impostazioni profilo** (`app/impostazioni-profilo/page.jsx`) ha il campo "Nickname" (stato `profile.nickname`, label `t('nickname')`, invio in `fetch('/api/supabase/save-profile', { body: { ...profile, nickname: profile.nickname } })`).
2. **API:** `POST /api/supabase/save-profile` riceve il body; se `profileData.nickname !== undefined`, normalizza con `toText(profileData.nickname)` e imposta `profileUpdate.nickname`; poi esegue `upsert` su `user_profiles`.
3. **Classifica:** L’API leaderboard legge i nickname con `select('user_id, nickname').in('user_id', ...)` da `user_profiles`. Se `nickname` è null, in classifica si mostra "—".

**Conclusione:** Per vedere un nome in classifica (invece di "—") l’utente deve andare in **Impostazioni profilo**, compilare il campo **Nickname** (quello per la classifica) e salvare. Il solo `first_name` (es. impostato in Palestra Coach) **non** viene usato in classifica; la classifica usa solo `user_profiles.nickname`.

---

## 2. Tabella `user_tactical_feedback`

### 2.1 Chi scrive e come

**Unica scrittura:** `POST /api/save-coach-feedback` (`app/api/save-coach-feedback/route.js`).

Flusso:

1. Il client invia la conversazione della Palestra Coach (+ `match_id`, `session_type`, `matchInfo` opzionale).
2. L’API chiama OpenAI per estrarre da quella conversazione un JSON con:
   - `profile_updates`: campi profilo menzionati dall’utente (solo whitelist: platform, connection_quality, ai_weak_point, first_name, ai_name, ai_notes, ecc. — **nessun nickname**).
   - `tactical_insights`: array di insight (weakness/strength/lesson).
   - `conversation_summary`: riassunto 1–2 frasi.
   - `outcome`: win/loss/draw se menzionato.
3. L’API applica `profile_updates` a `user_profiles` (UPDATE) e costruisce l’array `profile_fields_updated` con i **nomi dei campi** effettivamente aggiornati (es. `["first_name","ai_weak_point"]`).
4. Inserisce una riga in `user_tactical_feedback` con:
   - `user_id`, `match_id`, `session_type`, `formation_played`, `style_played`, `opponent_name`, `outcome`
   - `conversation_summary` (testo, max 500 caratteri)
   - `insights` (JSONB: array di `{ type, text }` validati)
   - `profile_fields_updated` (JSONB: array di stringhe, es. `["first_name","ai_weak_point"]`)

### 2.2 Significato di `profile_fields_updated`

Indica **quali campi di `user_profiles`** sono stati aggiornati in quella sessione di Palestra Coach. Esempi:

- `["first_name"]`: l’utente ha detto il suo nome in chat e l’AI l’ha estratto → aggiornato `user_profiles.first_name`.
- `["ai_weak_point","first_name","ai_name"]`: aggiornati punto debole, nome e nome dell’AI.
- `[]`: nessun campo profilo aggiornato (solo insight tattici).

**Non contiene mai `"nickname"`** perché il nickname non è nella whitelist di save-coach-feedback e non viene mai scritto da lì; il nickname si scrive solo da save-profile (Impostazioni profilo).

---

## 3. Riepilogo per la classifica

| Cosa | Dove si imposta | Dove si legge (classifica) |
|------|------------------|----------------------------|
| Nome in classifica | **user_profiles.nickname** | API leaderboard fa `select('user_id, nickname')` da `user_profiles` e mostra quello (o "—" se null). |
| Chi può apparire | Tutti gli eleggibili (nessun filtro su leaderboard_consent per il mese corrente). | - |
| Punti / ordine | Calcolati da partite, utilizzo IA, profilo; snapshot mensile per storico. | - |

Per avere la classifica sempre aggiornata sui nickname: l’API legge già i nickname freschi da `user_profiles` a ogni richiesta; il client usa cache-busting, refetch su visibility e su evento `leaderboard-updated` dopo il save del profilo.
