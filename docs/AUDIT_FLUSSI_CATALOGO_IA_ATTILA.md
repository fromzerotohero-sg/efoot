# Audit: catalogo → Supabase → IA (“memoria Attila”)

**Obiettivo:** una sola catena semantica dal picker catalogo alla chat/contromisure/diagnostic.  
**Fonte di verità stili:** tabella Supabase `playing_styles` (`name` IT + `compatible_positions[]`).  
**Dizionario abilità:** `lib/playerSkillLabels.js` (preset EN + etichette IT per UI/persistenza).

---

## 1. Supabase (dominio)

| Tabella | Ruolo |
|---------|--------|
| `playing_styles` | Nomi ufficiali IT, posizioni compatibili per stile |
| `players` | Rosa utente: `position`, `playing_style_id`, `role`, `skills`, `metadata`, … |
| `player_catalog` | Carte globali; `playing_style` spesso **EN** (PESDB); **non** FK verso `playing_styles` |
| `formation_layout` | Modulo + `slot_positions` |
| `coaches` | `playing_style_competence`, `connection` (focal/key IT) |
| `team_tactical_settings` | Stile squadra + istruzioni |
| `user_diagnostic_cache` | Testo riassunto per chat/diagnostic |

---

## 2. Ingressi giocatore (flussi)

### A. Catalogo Nuova Rosa (`app/nuova-rosa-lab/page.jsx`)

- `buildPlayerPayloadFromCatalog(card)` → merge `players_payload` + `resolvePlayingStyleDbName()` su EN→IT dove mappato.
- Salvataggio principale: **`POST /api/supabase/save-player`**.

### B. Assegnazione slot senza passare da save-player

- **`PATCH /api/supabase/assign-player-to-slot`** con `player_data`: ora **allineato** a save-player (`playing_style_id`, `role` IT, skill normalizzate).

### C. Foto / estrazione AI

- **`POST /api/extract-player`** → normalizza numeri/struttura; output tipicamente va al client → **`save-player`**.
- Copia meno problema perché il modello tende a nomi più vicini all’IT o testo libero gestito dal lookup.

### D. Modale manuale

- **`ManualPlayerModal`** → `save-player`.

### E. Aggiornamenti incrementali

- **`PATCH /api/players/[id]`**: aggiorna campi consentiti; quando cambiano **`role`** o **`playing_style`** (body opzionale), **`lookupPlayingStyleId`** aggiorna **`playing_style_id`** e normalizza **`role`** in IT.

---

## 3. API routes rilevanti (lookup rosa / IA)

| Route | playing_styles | Note |
|-------|-----------------|------|
| `GET /api/formation` | `id`, `name` | Rosa + layout |
| `GET /api/playing-styles` | riga completa | UI picker |
| `POST /api/supabase/save-player` | Lookup nome EN/IT → FK | **Percorso catalogo principale** |
| `PATCH .../assign-player-to-slot` | Lookup | Creazione giocatore da slot |
| `PATCH /api/players/[id]` | Lookup su cambio ruolo/stile | Parità con save-player |
| `POST /api/assistant-chat` | `id`, `name`, `compatible_positions` | Contesto rosa + **FIT warnings** |
| `POST /api/refresh-diagnostic` | `id`, `name` | Testo diagnostic |
| `POST /api/generate-countermeasures` | lookup nomi | Prompt contromisure |
| Card Advisor evaluate/deep-analysis | `id`, `name` | Suggerimenti carta |

---

## 4. “Memoria Attila” (RAG + regole)

Non è un file DB separato nel repo corrente.

| Layer | File / origine | Contenuto |
|-------|----------------|-----------|
| **RAG statico** | `info_rag.md` | Meccaniche, §2 stili IT/posizioni, §4 stili squadra, … Caricato da `lib/ragHelper.js` |
| **Memoria modulare prompt** | `getRelevantSectionsForContext(...)` | Usato da `assistant-chat`, `analyze-match`, `countermeasuresHelper` |
| **Blocchi “Attila” espliciti** | `lib/countermeasuresHelper.js` | Testo guida + estratti RAG + roster (Collante/Giocatore chiave, connection) |
| **Politiche IA** | `lib/coachPromptRules.js` | `COACH_AI_POLICIES`, `COACH_SHARED_CORE` — sempre nel system prompt dove previsto |
| **Diagnostic testuale** | `lib/diagnosticBuilder.js` | Incrocio roster/coach/formazione per cache |

Documentazione storica (`docs/archivio/.../memoria_attila_definitiva_unificata.txt`) non è montata come RAG nel codice attuale; il sistema usa **`info_rag.md`** come dizionario tattico principale.

---

## 5. Helper di allineamento semantico

| Modulo | Funzione |
|--------|-----------|
| `lib/playingStyleResolve.js` | `resolvePlayingStyleDbName`, `lookupPlayingStyleId`, `getPlayerStyleDisplayName`, `playingStylesMatch` |
| `lib/playingStyleFitWarnings.js` | `position ∉ compatible_positions` → warning per prompt chat |
| `lib/playerSkillLabels.js` | Canon EN + IT UI; `normalizePlayerSkillsArray` su save/PATCH |

---

## 6. Regole anti-regression (prod)

1. Ogni creazione/aggiornamento giocatore che riceve **`playing_style` / `role` dal catalogo EN** deve passare dal **lookup Supabase** (come `save-player`).
2. **`players.role`** dovrebbe restare il **nome IT** di `playing_styles` quando il lookup ha successo.
3. **`playing_style_id`** deve essere valorizzato quando esiste una riga DB per quel stile.
4. IA: contesto chat include **FIT** quando posizione salvata ≠ `compatible_positions` (riduce errori tipo Collante/TRQ).

---

## 7. Gap risolti in questo audit (codice)

- `assign-player-to-slot` creazione giocatore: prima **senza** `playing_style_id` / skill normalizzate → **allineato a save-player**.
- `PATCH /api/players/[id]`: prima **`role`** senza aggiornamento FK → **lookup + normalizzazione**.

---

## 8. Checklist post-deploy produzione

1. Deploy codice sopra.
2. Opzionale: script SQL di backfill ruoli EN già migrati (già fatto in parte con migrazioni precedenti).
3. Far rigenerare **diagnostic** agli utenti critici dopo il deploy.
4. Monitorare `players` con `playing_style_id IS NULL` e `role` ~ `%Goal Poacher%` ecc.
