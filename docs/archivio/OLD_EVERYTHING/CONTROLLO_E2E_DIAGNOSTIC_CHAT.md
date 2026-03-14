# Controllo end-to-end: Diagnostic, Chat, Informazioni IA, Statistiche di gioco

**Data**: 2026-02-08  
**Scope**: Flussi completi, coerenza dati, sicurezza. Riferimento: `RIASSUNTO_E_NUOVE_INFORMAZIONI_CHAT.md`, `IMPLEMENTAZIONE_DIAGNOSTIC_CHAT.md`.

---

## 1. Autenticazione e sicurezza

| Endpoint | Auth | Filtro dati | Rate limit |
|----------|------|-------------|------------|
| **POST /api/supabase/save-player** | Bearer → `validateToken` → `userId` | Insert/update solo `user_id: userId`. Nessun `body.user_id`. | Config rateLimiter |
| **POST /api/refresh-diagnostic** | Bearer → `validateToken` → `userId` | Letture e upsert sempre `.eq('user_id', userId)`. | 2/min |
| **POST /api/assistant-chat** | Bearer → `validateToken` → `userId` | Cache e buildPersonalContext solo per `userId`. | RATE_LIMIT_CONFIG |
| **GET/POST /api/supabase/save-ai-info** | Bearer → `validateToken` → `userId` | GET/POST leggono e aggiornano solo il profilo dell’utente. Whitelist campi; nessun `user_id` da body. | — |
| **GET/POST /api/extract-game-analysis** | Bearer → `validateToken` → `userId` | Upsert su `user_game_analysis` con `user_id: userId`. Validazione immagini (max 2, max 10MB). | Config rateLimiter |

- **RLS**: `players`, `user_diagnostic_cache`, `user_profiles`, `user_game_analysis` con policy per `auth.uid() = user_id`. Le API usano service role ma **filtrano sempre per userId da token**; nessun dato cross-user.
- **Input**: save-ai-info usa whitelist campi e valori (select/textarea); extract-game-analysis valida `imageDataUrls` (array, base64, dimensione). Nessuna concatenazione di input utente in SQL o prompt non sanitizzati; diagnosticBuilder usa `sanitizeForPrompt` su tutti i testi da DB.

---

## 2. Flusso dati: ruolo e stile (Collante, ecc.)

- **save-player**: Lookup `playing_style_id` da `player.playing_style` o `player.role`; scrittura `role` + `playing_style_id`.
- **refresh-diagnostic**: Legge `players` (con `playing_style_id`, `role`) e `playing_styles`; diagnosticBuilder usa `stylesLookup` con fallback su `role`.
- **assistant-chat**: Se c’è cache diagnostic usa quella; altrimenti buildPersonalContext con stesso fallback ruolo/stile.

**Conclusione**: Coerente end-to-end (scrittura e lettura con fallback legacy).

---

## 3. Flusso: Informazioni IA → Riassunto → Chat

1. **Form "Informazioni IA"** (dashboard) → **POST /api/supabase/save-ai-info** → `user_profiles` (connection_quality, input_delay, pass_level, ai_weak_point, ai_learn_goals, ai_notes, ecc.). Nessuna chiamata a updateAIKnowledgeScore.
2. **Aggiorna analisi** (o dopo save-ai-info se la UI richiama refresh) → **POST /api/refresh-diagnostic** → legge `user_profiles` (inclusi campi Informazioni IA) → **diagnosticBuilder** sezione "Informazioni per l'IA" (solo campi valorizzati) → **user_diagnostic_cache**.
3. **Chat** → legge `user_diagnostic_cache.content` → blocco "RIASSUNTO ANALISI" nel prompt. System prompt: priorità a Punto debole / Cosa vuole imparare / Note; adattamento connessione/lag.

**Coerenza**: Campi whitelist in save-ai-info; diagnosticBuilder espone solo campi valorizzati; prompt non inventa dati.

---

## 4. Flusso: Statistiche di gioco (screenshot Analisi) → Riassunto → Chat

1. **Upload screenshot** (card "Statistiche di gioco") → **POST /api/extract-game-analysis** (vision estrae goal_types, shot_usage, passing, dribbling, defense, special_commands) → upsert **user_game_analysis** (un record per user; nuovo upload sovrascrive). Rate limit e crediti.
2. **Refresh diagnostic** → refresh-diagnostic legge **user_game_analysis** → diagnosticBuilder sezione "Statistiche di gioco (Analisi eFootball, ultime 10 partite)" → **user_diagnostic_cache**.
3. **Chat** → usa il riassunto; system prompt: usare Statistiche di gioco per consigli mirati; incrocio con Abilità in rosa (RAG §7.9). Se sezione assente e utente chiede "le mie statistiche", non inventare; suggerire upload dalla dashboard.

**Coerenza**: Dati estratti da vision in formato JSON; salvati in `user_game_analysis.stats`; diagnosticBuilder formatta in testo compatto; due fonti (partite inserite vs statistiche screenshot) non in conflitto (etichette distinte nel riassunto).

---

## 5. Flusso: Partite inserite (zone attacco, voti) → Riassunto → Chat

1. **Partite** salvate con **player_ratings**, **attack_areas**, **team_stats** (save-match/update-match) → **matches** e aggregati in **team_tactical_patterns** (formation_usage, recurring_issues; opzionale attack_areas_avg, recovery_zones_avg).
2. **Refresh diagnostic** → legge **matches** (con player_ratings, attack_areas, team_stats) e **team_tactical_patterns** (attack_areas_avg, recovery_zones_avg) → diagnosticBuilder **buildMatchDerivedSection** (media zone attacco, "voti presenti per N partite") → sezione "Dati dalle partite inserite (zone attacco, voti, recupero)" nel riassunto.
3. **Chat** → system prompt: due fonti (partite inserite vs Statistiche di gioco) complementari; usare entrambe.

**Coerenza**: Partite inserite e Statistiche di gioco hanno etichette diverse nel riassunto; nessuna sovrascrittura tra le due fonti.

---

## 6. Suggerimenti (3 domande) e coerenza

- **getDefaultSuggestions** (API) e **initialSuggestions** (AssistantChat.jsx): domande utili (analisi vs rosa, uso comandi/abilità, priorità concrete). Niente meta, "perché ho perso", "migliorare giocatore".
- **suggRules** nel prompt: (1) approfondimento stessa leva + dati utente, (2) gameplay legato alla risposta, (3) prossimo passo con rosa/partite/allenatore; divieti come sopra.
- **Parser**: parseSuggestionsFromContent estrae fino a 3 suggerimenti dalla risposta AI; fallback su getDefaultSuggestions se array vuoto.

---

## 7. RAG e incrocio Analisi–Rosa

- **RAG** (info_rag.md): getRelevantSections in base a keyword; sezione 7 include §7.9 Incrocio Statistiche Analisi con Rosa (comando → abilità). Keyword: analisi, statistiche uso, passaggi calibrati, incrocio rosa, ecc.
- **System prompt**: quando "Statistiche di gioco" è presente, incrociare con Rosa (Abilità in rosa, posizioni, stili); se uso comando alto ma abilità mancanti, segnalare e consigliare diversificare/schierare chi ha abilità/Programmi.

---

## 8. Validazioni e limiti

| Dove | Cosa |
|------|------|
| **diagnosticBuilder** | Blocco ISTRUZIONI PER L'IA all'inizio (~280 chr); sanitizeForPrompt su tutti i testi; nessun inject newline in prompt. |
| **assistant-chat** | MAX_PERSONAL_CONTEXT_CHARS (7200); troncamento contesto oltre limite; MAX_MESSAGE_LENGTH, MAX_HISTORY_* per sicurezza e token. |
| **user_diagnostic_cache** | 1 riga per user_id; content TEXT; Supabase: verificare LENGTH(content) su utenti attivi (tipico 3k–7k; sopra 7k rischia troncamento). |
| **save-ai-info** | Whitelist campi e valori (select); MAX_TEXT 255, MAX_NOTES 500. |
| **extract-game-analysis** | Max 2 immagini; max 10MB per immagine; body.imageDataUrls array. |
| **refresh-diagnostic** | Rate limit 2/min; userId da token. |

---

## 9. Riepilogo esito

| Area | Esito |
|------|--------|
| Auth e isolamento dati per utente | OK (tutti gli endpoint usano userId da token) |
| Flusso ruolo/stile (save-player → diagnostic → chat) | OK |
| Flusso Informazioni IA → riassunto → chat | OK (whitelist, nessun ai_knowledge da save-ai-info) |
| Flusso Statistiche di gioco → riassunto → chat | OK (upsert un record/user; etichetta distinta) |
| Flusso partite inserite (zone attacco, voti) → riassunto | OK (sezione "Dati dalle partite inserite"; complementare a statistiche screenshot) |
| Suggerimenti (utili, no meta) e parser | OK |
| RAG e incrocio analisi–rosa (comando/abilità) | OK (§7.9 e keyword; prompt che incrocia) |
| Validazioni input e limiti lunghezza | OK |
| Coerenza team_playing_style e vincoli prompt | OK |

Controllo end-to-end superato. Per dettaglio su cosa entra nel riassunto e come la chat lo usa: `RIASSUNTO_E_NUOVE_INFORMAZIONI_CHAT.md`. Per roadmap prodotto e coach: `ROADMAP_ENTERPRISE_COACH.md`.
