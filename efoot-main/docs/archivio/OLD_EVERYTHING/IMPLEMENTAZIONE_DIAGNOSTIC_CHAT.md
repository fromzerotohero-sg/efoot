# Piano implementazione: Documento di analisi (diagnostic) + Chat + Suggerimenti

**Stato**: **Implementato** (2026-02-08). **E2E e sicurezza**: `CONTROLLO_E2E_DIAGNOSTIC_CHAT.md`. **Riassunto e nuove informazioni**: `RIASSUNTO_E_NUOVE_INFORMAZIONI_CHAT.md`. DB: `AUDIT_SUPABASE_TABELLE_E_ALLINEAMENTO.md`.

**Obiettivo**: introdurre il riassunto enterprise (diagnostic), il tasto “Aggiorna analisi” con rate limit, l’uso del diagnostic in chat al posto del blocco grezzo quando presente, e la formula suggerimenti.  
**Riferimenti**: `DIAGNOSTIC_DOCUMENTO_ANALISI_DIFFICOLTA.md`. Flussi e sicurezza: `CONTROLLO_E2E_DIAGNOSTIC_CHAT.md`.

---

## 1. Cosa rimuovere (non verrà più usato)

**Nessuna route, tabella o file da cancellare.** Si aggiunge solo logica e una tabella; il resto resta come fallback.

| Cosa | Si rimuove? | Note |
|------|-------------|------|
| **Route / API** | No | Nessuna route da eliminare. Si aggiunge solo `POST /api/refresh-diagnostic`. `POST /api/assistant-chat` resta e viene solo modificata. |
| **Tabelle Supabase** | No | Nessuna tabella da droppare. Si aggiunge solo `user_diagnostic_cache`. Profile, players, matches, coaches, team_tactical_patterns restano e sono la fonte dati. |
| **Chiamate** | Solo condizionale | Nella chat: **se** esiste un diagnostic in cache, **non** si chiama più `buildPersonalContext` per quel messaggio (si usa il testo in cache). La **chiamata** a `buildPersonalContext` resta nel codice come fallback quando diagnostic assente o vuoto. Quindi nessuna “chiamata da rimuovere” in senso definitivo. |
| **Prompt** | Sì (sostituire) | Stringhe **suggRules** (verticale + gameplay + meta) da sostituire con formula; getDefaultSuggestions: rimuovere domande meta / "perché ho perso" / "più efficaci" (vedi §1.1). Si aggiunge un **branch**: se c’è diagnostic → blocco “📊 RIASSUNTO ANALISI” con `content`; altrimenti → blocco “📊 ROSA E DATI” con output di `buildPersonalContext`. Stessa struttura prompt, contenuto diverso. |
| **Funzioni** | No | `buildPersonalContext` **non** si elimina: serve per fallback e può essere usata da altri flussi (es. in futuro da altri consumer). |

**Se in futuro si rende il diagnostic obbligatorio** (niente fallback “ROSA E DATI”): si può **rimuovere** il branch che chiama `buildPersonalContext` in `assistant-chat` e usare solo la lettura da `user_diagnostic_cache` (generando un diagnostic vuoto o minimo alla prima visita o al primo messaggio). In quel caso andrebbe in “Cosa rimuovere” la **chiamata** a `buildPersonalContext` dalla route `assistant-chat` (e, se nessun altro la usa, la funzione stessa). Per questa implementazione non è previsto.

### 1.1 Dettaglio: cosa togliere/sostituire nel codice

**File:** `app/api/assistant-chat/route.js`

#### Prompt – stringhe da rimuovere e sostituire

| Dove | Da rimuovere (non usare più) | Sostituire con |
|------|------------------------------|----------------|
| **suggRulesIt** / **suggRulesEn** | (obsoleto: verticale + gameplay + meta) | (1) Approfondimento stessa leva + dati utente, (2) gameplay legato alla risposta, (3) prossimo passo con rosa/partite/allenatore. Divieti: meta, "perché ho perso", "migliorare giocatore". |

#### getDefaultSuggestions – voci da rimuovere/sostituire

Domande che **non** devono più comparire (meta, "perché ho perso", generiche "più forti/più efficaci"):

| Pagina | IT – da rimuovere | EN – da rimuovere |
|--------|-------------------|--------------------|
| `''` (generica) | "Vuoi informazioni sul meta?" | "Want info on meta?" |
| `match/new` | "Quali formazioni sono più forti?" | "Which formations are strongest?" |
| `match/` | "Perché ho perso questa partita?" | "Why did I lose this match?" |
| `match/` | "Quali stili funzionano meglio?" | "Which styles work best?" |
| `contromisure` | "Quali contromisure sono più efficaci?" (se inteso come meta) | "Which countermeasures are most effective?" |
| `allenatori` | "Quali stili sono più efficaci?" | "Which styles are most effective?" |

Sostituire con domande **utili e legate ai dati** (es. analisi vs rosa, uso comandi/abilità, priorità): vedi `getDefaultSuggestions` in `assistant-chat/route.js` e `initialSuggestions` in `AssistantChat.jsx`.

#### Chiamate – quando non eseguire più

- **buildPersonalContext**: nel branch in cui esiste un diagnostic in cache (`user_diagnostic_cache.content` non vuoto), **non** chiamare `buildPersonalContext(userId, lang)`. Usare il `content` dalla cache come blocco contesto. La chiamata a `buildPersonalContext` resta nel ramo `else` (fallback).

#### Route / Node / Tabelle – nulla da cancellare

- **Route**: nessuna route da eliminare.
- **Node (file)**: nessun file da cancellare; `buildPersonalContext` e `buildPersonalizedPrompt` restano.
- **Tabelle**: nessuna tabella da droppare.

---

## 2. Riepilogo: cosa cancellare, modificare, scrivere

| Dove | Cancellare | Modificare | Scrivere |
|------|------------|------------|----------|
| **Supabase** | — | — | Tabella `user_diagnostic_cache` + migration |
| **Backend** | — | `assistant-chat/route.js` (uso diagnostic, suggerimenti); `rateLimiter.js` (config) | `api/refresh-diagnostic/route.js`; `lib/diagnosticBuilder.js` |
| **Frontend** | — | Dashboard (o chat): bottone + chiamata API + alert 429 | Bottone “Aggiorna analisi”, gestione 429 e messaggio “max 2/min” |
| **Documentazione** | Eventuali duplicati in altri doc (opzionale) | `AUDIT_IA_RAG.md`, `REFACTOR_PROMPT_CHAT_ENTERPRISE.md` (citare diagnostic) | Questo documento; aggiornare `DIAGNOSTIC_*` con “stato: da implementare → in implementazione” |

---

## 2. Supabase

### 2.1 Scrivere (nuovo)

**Tabella `user_diagnostic_cache`**

- **Scopo**: memorizzare l’ultimo riassunto (diagnostic) generato per ogni utente. La chat lo legge e lo invia nel prompt al posto del blocco “ROSA E DATI” grezzo (o in aggiunta, con priorità al diagnostic).
- **Schema**:
  - `user_id` (UUID, PK, FK → auth.users(id) ON DELETE CASCADE)
  - `content` (TEXT, NOT NULL) — testo completo del riassunto (profilo, rosa, fit stile–movimento, tattica, andamento, difficoltà, allenatore completo, connection match, stat boosters, build, abilità rilevanti, sinergie)
  - `generated_at` (TIMESTAMPTZ, NOT NULL, DEFAULT now())
  - `lang` (TEXT, opzionale) — lingua usata per generare (it/en), per rigenerare in altra lingua se serve in futuro
- **RLS**: abilitato; policy SELECT e INSERT/UPDATE solo per `auth.uid() = user_id` (ogni utente vede e aggiorna solo la propria riga).
- **Indice**: PK su `user_id` è sufficiente (una riga per utente).

**Migration**

- Creare file in `migrations/` (es. `create_user_diagnostic_cache.sql`) con:
  - `CREATE TABLE user_diagnostic_cache (...);`
  - `ALTER TABLE ... ENABLE ROW LEVEL SECURITY;`
  - `CREATE POLICY ... ON user_diagnostic_cache FOR SELECT/USE/INSERT/UPDATE usando auth.uid() = user_id;`

### 2.2 Cancellare / modificare

- Nulla da cancellare. Nessuna modifica a tabelle esistenti obbligatoria (il diagnostic è solo cache; profile, players, matches, coaches, team_tactical_patterns restano la fonte).

---

## 3. Backend

### 3.1 Scrivere (nuovo)

**`app/api/refresh-diagnostic/route.js`**

- **Metodo**: POST.
- **Auth**: come `assistant-chat` (Bearer, validazione Supabase). Solo utente autenticato.
- **Rate limit**: 2 richieste per minuto per `user_id`. Usare `lib/rateLimiter.js` → `checkRateLimit(userId, '/api/refresh-diagnostic', 2, 60000)`. Se `allowed === false`:
  - Risposta **429** (Too Many Requests).
  - Header `Retry-After: <secondi>` (secondi fino a `resetAt`).
  - Body JSON: `{ error: 'RATE_LIMIT', message: "Puoi aggiornare l'analisi al massimo 2 volte al minuto. Riprova tra X secondi.", retryAfterSeconds: N }` (messaggio localizzato IT/EN in base a Accept-Language o query).
- **Logica**:
  1. Leggere da DB: profile, players (con playing_styles), formation_layout, team_tactical_settings, matches (ultime N), team_tactical_patterns, coaches (attivo con connection, stat_boosters, training_affinity).
  2. Chiamare `buildDiagnostic(userId, lang, data)` da `lib/diagnosticBuilder.js` (vedi sotto) per ottenere il testo.
  3. Upsert in `user_diagnostic_cache`: `user_id`, `content`, `generated_at`, `lang`.
  4. Risposta 200: `{ success: true, generated_at: ISO string }`.

**`lib/diagnosticBuilder.js`**

- **Scopo**: costruire il testo del riassunto enterprise a partire dai dati letti dal DB (e opzionalmente da RAG/parametri in codice).
- **Input**: `userId`, `lang`, oggetto con: profile, players (con stile nome da playing_styles), formation, team_tactical_settings, matches (ultime 50 o meno), team_tactical_patterns, coach attivo (con connection, stat_boosters).
- **Output**: stringa (testo) del diagnostic, sezioni come in `DIAGNOSTIC_DOCUMENTO_ANALISI_DIFFICOLTA.md` §10.3 e §11:
  - Profilo
  - Rosa (sintesi) + fit stile–movimento (usando “Quando serve” / “Perché” da RAG: si può incapsulare in mappa stile → frase tipo, letta da config o hardcoded da info_rag)
  - Tattica
  - Andamento (formation_usage, playing_style_usage, frasi sintetiche)
  - Statistiche (se disponibili, medie da team_stats)
  - Difficoltà (recurring_issues o euristiche + problemi dichiarati)
  - Allenatore completo: competenze, Connection (nome, focal_point, key_man), **match connection ↔ rosa** (quali giocatori matchano Focal/Key Man), Stat boosters (chi beneficia), training affinity
  - Build (sintesi)
  - Abilità rilevanti in rosa
  - Sinergie / note
- **Implementazione**: preferibilmente **solo regole/template** (nessuna chiamata OpenAI) per costo e determinismo. Si può estrarre da `info_rag.md` o da una mappa in codice le frasi “Quando serve” per stile/ruolo e comporre il testo. Se in seguito si vuole una generazione AI del riassunto, si potrà aggiungere un path opzionale che chiama l’API con structured data.

### 3.2 Modificare

**`app/api/assistant-chat/route.js`**

- **Lettura diagnostic**: prima di chiamare `buildPersonalContext`, fare una query a `user_diagnostic_cache` per `user_id`. Se esiste una riga con `content` non vuoto, usare `content` come blocco “contesto” nel prompt (es. come `personalContextSummary`), **al posto di** `buildPersonalContext` per quel messaggio. Se non esiste o content vuoto, usare come oggi `buildPersonalContext` (fallback).
- **Prompt**: il blocco contesto può essere etichettato “📊 RIASSUNTO ANALISI” (se diagnostic) oppure “📊 ROSA E DATI” (se fallback), così il modello capisce che è il quadro del cliente. Adattare `buildPersonalizedPrompt` se serve un parametro aggiuntivo `diagnosticSummary` vs `personalContextSummary` (o un unico `contextBlock` che può essere l’uno o l’altro).
- **Suggerimenti**:  
  - **suggRules**: sostituire le stringhe attuali (verticale + gameplay + meta) con la formula in `FORMULA_SUGGERIMENTI_CHAT.md`: (1) approfondimento stessa leva + suoi dati, (2) gameplay legato a formazione/stile/risposta, (3) prossimo passo con rosa/partite/allenatore; divieto esplicito meta / “perché ho perso” / “migliorare giocatore”.  
  - **getDefaultSuggestions**: aggiornare gli array IT/EN per pagina con le frasi della formula (concrete, actionable, nessuna “più forte/meta”); es. page `''`: “Quale modulo per la mia rosa?”, “Quali istruzioni con la formazione che uso?”, “Come organizzare pressing e compattezza con la mia rosa?”.

**`lib/rateLimiter.js`**

- Aggiungere in `RATE_LIMIT_CONFIG`:
  - `'/api/refresh-diagnostic': { maxRequests: 2, windowMs: 60000 }`.

### 3.3 Cancellare

- Nulla da cancellare. `buildPersonalContext` resta per fallback e per altri eventuali consumatori (es. analyze-match / countermeasures usano i propri flussi).

---

## 4. Frontend

### 4.1 Scrivere / modificare

- **Bottone “Aggiorna analisi”**: posizione consigliata vicino alla **barra Conoscenza AI** (dashboard, `app/page.jsx`) oppure nell’header della chat se la chat è in una pagina dedicata. Testo: “Aggiorna analisi” (IT) / “Refresh analysis” (EN); tooltip o testo secondario: “Aggiorna il riassunto che l’IA usa per i consigli” (opzionale).
- **Chiamata**: al click, `POST /api/refresh-diagnostic` con Bearer token. Se **200**: mostrare breve feedback (es. toast “Analisi aggiornata”) e opzionalmente invalidare/aggiornare stato locale se la chat è già aperta. Se **429**: leggere `retryAfterSeconds` (o header `Retry-After`) e mostrare **alert** (o toast di errore): “Puoi aggiornare l’analisi al massimo 2 volte al minuto. Riprova tra X secondi.” (localizzato).
- **i18n**: aggiungere chiavi per bottone, messaggio success, messaggio rate limit (IT/EN) in `lib/i18n.js`.

### 4.2 Cancellare

- Nulla.

---

## 5. Documentazione

### 5.1 Modificare

- **`docs/AUDIT_IA_RAG.md`**: nella sezione sul flusso chat, citare che se è presente un diagnostic in `user_diagnostic_cache` la chat usa quello come blocco contesto principale, altrimenti il blocco “ROSA E DATI” da `buildPersonalContext`.
- **`docs/REFACTOR_PROMPT_CHAT_ENTERPRISE.md`**: in “Stato implementazione”, aggiungere punto: “Diagnostic: tasto Aggiorna analisi (rate limit 2/min), tabella user_diagnostic_cache, chat usa diagnostic quando presente”.
- **`docs/DIAGNOSTIC_DOCUMENTO_ANALISI_DIFFICOLTA.md`**: in cima o in “Stato”, indicare: “Implementazione: vedi IMPLEMENTAZIONE_DIAGNOSTIC_CHAT.md”.

### 5.2 Scrivere

- **`docs/IMPLEMENTAZIONE_DIAGNOSTIC_CHAT.md`**: questo file (piano completo).

### 5.3 Cancellare

- Opzionale: rimuovere duplicati o sezioni obsolete in altri doc (es. vecchie descrizioni “solo ROSA E DATI” senza diagnostic) man mano che si implementa.

---

## 6. Ordine di implementazione consigliato

1. **Supabase**: migration `user_diagnostic_cache` + RLS. Applicare migration.
2. **Backend**: `lib/diagnosticBuilder.js` (logica di costruzione del testo; prima versione anche solo con sezioni principali senza tutte le euristiche).
3. **Backend**: `app/api/refresh-diagnostic/route.js` (auth, rate limit, lettura dati, chiamata builder, upsert).
4. **Backend**: `lib/rateLimiter.js` — aggiungere config `/api/refresh-diagnostic`.
5. **Backend**: `assistant-chat/route.js` — lettura diagnostic da `user_diagnostic_cache`, uso nel prompt; aggiornare suggRules e getDefaultSuggestions.
6. **Frontend**: bottone, chiamata API, gestione 200/429, i18n.
7. **Documentazione**: aggiornare AUDIT, REFACTOR, DIAGNOSTIC come sopra.

---

## 7. Scalabilità: il metodo diventa poco scalabile?

**In breve: no, se si tengono alcuni accorgimenti.** Il disegno è scalabile; i punti da controllare sono il rate limiter in produzione e la dimensione dei dati in ingresso al builder.

**Perché scala bene**

- **Un rigo per utente**: la tabella `user_diagnostic_cache` ha una riga per `user_id`. 100k utenti = 100k righe e una SELECT per chiave primaria a ogni messaggio chat è banale per Postgres.
- **Refresh on demand**: il diagnostic si ricalcola solo quando l’utente clicca “Aggiorna analisi” (max 2/min per utente). Non c’è cron che rigenera per tutti: carico proporzionale agli utenti attivi che usano il tasto, non al totale utenti.
- **Chat**: a ogni messaggio si fa una sola SELECT su `user_diagnostic_cache` per quel `user_id` e si usa il testo nel prompt. Niente N+1, niente aggregazioni pesanti in chat.
- **Builder senza OpenAI**: se `diagnosticBuilder.js` è solo logica/template (nessuna chiamata API), il refresh ha costo e latenza limitati (letture DB + CPU). La crescita è lineare con il numero di refresh concorrenti, gestibili con più istanze serverless.

**Dove stare attenti**

1. **Rate limit in memoria**: `rateLimiter.js` oggi usa una `Map` in memoria. Su Vercel (o più istanze) ogni istanza ha la propria memoria, quindi il limite “2/min” è per istanza, non globale. Per **produzione con più istanze** conviene spostare il rate limit su **Redis** (o su DB) come già indicato nel TODO del rateLimiter. Senza questo, sotto carico il limite è “circa 2/min per istanza” (comportamento ancora accettabile, ma non perfetto).
2. **Dati in ingresso al builder**: mantenere **limiti fissi** (es. ultime 50 partite, max 30 giocatori in sintesi rosa, pattern già aggregati in `team_tactical_patterns`) così ogni refresh fa un lavoro a tempo e dimensione limitati. Evitare di leggere centinaia di partite o di costruire testi enormi.
3. **Dimensione `content`**: il diagnostic è testo (es. 400–1000 parole). Anche 50 KB per utente × 100k utenti = pochi GB totali; Postgres gestisce bene. Se in futuro il testo diventasse molto più grande, si può valutare compressione o solo ultime sezioni in cache; per ora non è un problema.

**Se un giorno servisse ancora più scala**

- **Refresh in coda**: invece di rigenerare il diagnostic nella richiesta POST, si può accodare un job (es. Vercel queue, Redis + worker). L’utente riceve subito “Aggiornamento in corso” e la chat usa il diagnostic precedente fino al completamento. Così i picchi di “Aggiorna analisi” non impattano la latenza della richiesta HTTP.
- **Cache lettura**: la chat già “legge una volta per messaggio”; se si introducesse un layer di cache (es. Redis) sulla lettura del diagnostic per `user_id`, si ridurrebbe ulteriormente il carico su DB per utenti che inviano molti messaggi in pochi secondi. Opzionale e solo se necessario.

**Conclusione**: il metodo **non è intrinsecamente poco scalabile**. Con rate limit su Redis in produzione, builder con dati limitati (ultime N partite, rosa sintetica) e un rigo per utente in DB, si scala bene. La coda per il refresh è un’evoluzione possibile se i click su “Aggiorna analisi” diventassero molto frequenti.

---

## 8. Livello di difficoltà

**Complessità complessiva: MEDIA–ALTA (7/10).**

- **Supabase**: **Bassa**. Una tabella, una migration, RLS standard.
- **API refresh-diagnostic**: **Media**. Auth e rate limit già in uso altrove; logica nuova è “leggi tutto, chiama builder, scrivi in cache”.
- **diagnosticBuilder.js**: **Alta**. È il cuore: aggregare molti dati (profile, players+stili, formation, tactics, matches, patterns, coach+connection+boosters), applicare regole “Quando serve” / “Perché” (da RAG o da mappa), match connection↔rosa, beneficiari booster, build, abilità rilevanti, sinergie. Molte sezioni e molti edge case (dati mancanti, connection senza match, rosa vuota, ecc.). Consiglio: prima versione “minima” (profilo, rosa sintetica, formazione, andamento, allenatore con connection match, una riga build/sinergie) e poi estendere.
- **assistant-chat**: **Media**. Una query in più e uno switch diagnostic vs buildPersonalContext; suggerimenti = sostituire stringhe e array (chiaro dalla formula).
- **Frontend**: **Bassa**. Un bottone, una fetch, gestione 429 e messaggio.

La parte più delicata è il **diagnosticBuilder** (completezza, coerenza con RAG, gestione casi limite). Il resto è integrazione e configurazione.

---

## 9. Checklist finale

- [x] Migration `user_diagnostic_cache` creata e applicata
- [x] RLS attivo su `user_diagnostic_cache`
- [x] `lib/diagnosticBuilder.js` implementato (sezioni principali, connection, boosters, sinergie, leve, fallback role)
- [x] `app/api/refresh-diagnostic/route.js` implementato (auth, rate limit 2/min, 429 + Retry-After)
- [x] `RATE_LIMIT_CONFIG['/api/refresh-diagnostic']` aggiunto
- [x] `assistant-chat`: lettura cache diagnostic, uso nel prompt; fallback a buildPersonalContext
- [x] suggRules e getDefaultSuggestions aggiornati secondo FORMULA_SUGGERIMENTI_CHAT
- [x] Bottone “Aggiorna analisi” in UI (dashboard)
- [x] Gestione 429 con messaggio “max 2 volte al minuto”
- [x] Chiavi i18n per bottone e messaggi
- [x] Doc AUDIT, REFACTOR, DIAGNOSTIC aggiornate
- [x] save-player: lookup `playing_style_id` da `role`; backfill migration per righe già salvate

---

## Appendice A: SQL migration `user_diagnostic_cache`

Creare file `migrations/create_user_diagnostic_cache.sql`:

```sql
-- ============================================
-- Migration: Cache riassunto analisi (diagnostic) per chat
-- Data: 2026-02
-- ============================================

CREATE TABLE IF NOT EXISTS user_diagnostic_cache (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL DEFAULT '',
  generated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  lang TEXT
);

COMMENT ON TABLE user_diagnostic_cache IS 'Ultimo riassunto enterprise (diagnostic) generato per utente. Usato dalla chat al posto del blocco ROSA E DATI quando presente.';

ALTER TABLE user_diagnostic_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own diagnostic"
  ON user_diagnostic_cache FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own diagnostic"
  ON user_diagnostic_cache FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own diagnostic"
  ON user_diagnostic_cache FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
```
