# Servizi al cliente – eFootball AI Coach – Descrizione completa

Documento descrittivo di ogni cartella e di ogni funzione, nominato e strutturato in base al **servizio offerto al cliente**. Descrizioni precise (non sommarie).

**Versione**: 1.0  
**Data**: Febbraio 2026

---

## 1. Servizio complessivo offerto al cliente

Il prodotto offre al cliente (giocatore eFootball):

1. **Consulenza tattica personalizzata** – Chat con coach AI che consiglia formazione, modulo, sostituzioni, stile squadra, istruzioni individuali e suggerimenti di gameplay in base a rosa, partite e allenatore caricati.
2. **Gestione rosa e formazione** – Campo 2D interattivo per schierare titolari e riserve, upload card giocatori con estrazione dati da screenshot (OpenAI Vision), istruzioni individuali per slot.
3. **Analisi partite** – Caricamento partite (wizard 5 step con screenshot), analisi AI post-partita (riassunto, pattern, suggerimenti).
4. **Contromisure pre-partita** – Caricamento formazione avversario da screenshot, generazione contromisure tattiche e istruzioni.
5. **Obiettivi settimanali** – Task generati automaticamente in base a profilo e partite, aggiornamento progresso dopo ogni partita.
6. **Barra conoscenza IA** – Indicatore 0–100% di quanto l’IA conosce il cliente (profilo, rosa, partite, pattern, allenatore, utilizzo, successi).
7. **Sistema crediti (Hero Points)** – Utilizzo mensile tracciato per operazioni AI (chat, estrazioni, analisi, contromisure); storico transazioni e attività recente.
8. **Autenticazione e profilo** – Login/registrazione Supabase, recupero password, profilo utente (nome, squadra, preferenze, problemi ricorrenti), gestione allenatori e stile attivo.
9. **Internazionalizzazione** – Interfaccia e messaggi in italiano e inglese; lingua preferita dall’utente.

Tutte le operazioni che consumano AI sono protette da autenticazione Bearer e (dove previsto) da rate limit e tracciamento crediti.

---

## 2. Struttura cartelle e ruolo

| Cartella | Ruolo rispetto al servizio al cliente |
|----------|--------------------------------------|
| **app/** | Pagine e layout: ogni sottocartella è una route (URL) che il cliente usa per accedere a un servizio (dashboard, formazione, partite, login, ecc.). |
| **app/api/** | Endpoint HTTP (backend): operazioni che il frontend invoca (estrazioni AI, salvataggio dati, chat, crediti, task). Tutti richiedono Bearer token. |
| **lib/** | Librerie e helper: funzioni riusate da più pagine o API (auth, crediti, RAG, i18n, validazione formazioni, OpenAI, ecc.). |
| **components/** | Componenti React riusabili: widget globali (chat, crediti, tour) e componenti per pagina (modali, pannelli tattici). |
| **migrations/** | Script SQL Supabase: definizione e aggiornamento tabelle e funzioni DB. |
| **scripts/** | Script di utilità (es. esecuzione migrazioni). |
| **public/** | Asset statici (immagini, favicon). |
| **docs/** | Documentazione progetto (auth, email, crediti, audit). |
| **info_rag.md** | Contenuto RAG (regole eFootball, stili, moduli, istruzioni, meccaniche) usato dalla chat e da analisi/contromisure. |

---

## 3. Cartella `app/` – Pagine e servizi all’utente

Ogni sottocartella corrisponde a un **path** e a un **servizio** che il cliente usa.

### 3.1 `app/page.jsx` (Dashboard – `/`)

- **Servizio**: Prima schermata dopo il login: panoramica squadra, ultime partite, barra conoscenza IA (AIKnowledgeBar), obiettivi settimanali (TaskWidget), link rapidi a formazione, aggiungi partita, contromisure, allenatori, guida.
- **Comportamento**: Carica profilo, formazione, partite recenti, pattern tattici, task della settimana; se non c’è formazione/rosa invita a completare; opzionalmente chiama `POST /api/admin/recalculate-patterns` per ricalcolo pattern retroattivo.
- **Layout**: Usa `CreditsBar`, `AssistantChat`, `GuideTour` (dal layout globale).

### 3.2 `app/layout.tsx`

- **Servizio**: Layout globale: avvolge tutte le pagine con `LanguageProviderWrapper`, `CreditsBar`, `AssistantChat`, `GuideTour`. Fornisce contesto lingua e widget sempre disponibili.

### 3.3 `app/gestione-formazione/page.jsx` (`/gestione-formazione`)

- **Servizio**: Campo 2D interattivo per gestire titolari (slot 0–10) e riserve; drag & drop giocatori; upload card giocatori (fino a 3 foto per giocatore: card, stats, skills) con estrazione AI; istruzioni individuali per ogni slot; scelta modulo e salvataggio layout posizioni.
- **Funzionalità cliente**: Visualizza formazione e riserve; assegna/rimuove giocatori agli slot; carica foto per estrazione dati giocatore; imposta istruzioni (difensivo/offensivo/ancoraggio, marcatura/contropiede/linea bassa); salva formazione e impostazioni tattiche.
- **API usate**: save-formation-layout, save-player, assign-player-to-slot, remove-player-from-slot, save-tactical-settings, extract-player, delete-player.

### 3.4 `app/giocatore/[id]/page.jsx` (`/giocatore/:id`)

- **Servizio**: Scheda dettaglio di un singolo giocatore: dati estratti (nome, squadra, posizione, overall, statistiche, abilità, stile), slot foto (card, stats, skills), possibilità di completare profilo con upload aggiuntivi.
- **Servizio al cliente**: Consultare tutte le informazioni sulla card e sulle foto caricate; caricare altre foto per completare dati.

### 3.5 `app/match/new/page.jsx` (`/match/new`)

- **Servizio**: Wizard in 5 step per caricare una partita: Casa/Fuori, poi 5 sezioni di upload (screenshot partita). Ogni step può invocare estrazione AI (extract-match-data). Al termine salva la partita e aggiorna progresso obiettivi settimanali.
- **Servizio al cliente**: Registrare una partita giocata caricando screenshot; ottenere dati strutturati (formazione usata, stile, risultato, ecc.) e salvarli per analisi successive.

### 3.6 `app/match/[id]/page.jsx` (`/match/:id`)

- **Servizio**: Dettaglio di una partita già caricata: dati partita, possibilità di lanciare analisi AI (POST /api/analyze-match) per ottenere riassunto bilingue, pattern e suggerimenti.
- **Servizio al cliente**: Rivedere la partita e ottenere un’analisi testuale (perché ha vinto/perso, cosa migliorare).

### 3.7 `app/contromisure-live/page.jsx` (`/contromisure-live`)

- **Servizio**: Caricamento formazione avversario (screenshot), estrazione dati formazione avversario, generazione contromisure tattiche (formazione consigliata, istruzioni, giocatori chiave) tramite AI.
- **Servizio al cliente**: Inserire uno screenshot della formazione avversaria e ricevere consigli tattici pre-partita (modulo, stile, cosa fare in campo).

### 3.8 `app/allenatori/page.jsx` (`/allenatori`)

- **Servizio**: Gestione allenatori: upload screenshot card allenatore, estrazione dati (extract-coach), salvataggio coach, selezione allenatore attivo. L’allenatore attivo e le sue competenze per stile influenzano i consigli della chat e le contromisure.
- **Servizio al cliente**: Aggiungere allenatori dalla card e scegliere chi usare; le competenze (es. Contrattacco 85) vengono usate dall’AI per consigliare lo stile squadra.

### 3.9 `app/gestione-profilo/page.jsx` (`/gestione-profilo`)

- **Servizio**: Visualizzazione e modifica profilo utente (nome, cognome, squadra, preferenze AI, come ricordarsi, problemi ricorrenti); storico crediti e transazioni; link a guida e acquisto crediti.
- **Servizio al cliente**: Personalizzare il proprio profilo e vedere utilizzo crediti e attività recente.

### 3.10 `app/impostazioni-profilo/page.jsx` (`/impostazioni-profilo`)

- **Servizio**: Pagina impostazioni profilo (dati anagrafici e preferenze). Salvataggio tramite API save-profile.
- **Servizio al cliente**: Modificare nome, squadra, preferenze senza passare dalla dashboard.

### 3.11 `app/guida/page.jsx` (`/guida`)

- **Servizio**: Guida testuale e link alle sezioni dell’app (formazione, partite, contromisure, allenatori, profilo); descrizione tour “Mostrami come” e pulsante cervello (chat).
- **Servizio al cliente**: Capire come usare l’app e dove trovare le funzioni.

### 3.12 `app/login/page.jsx` (`/login`)

- **Servizio**: Login e registrazione con email/password (Supabase Auth). Link a recupero password. Redirect dopo login alla dashboard.
- **Servizio al cliente**: Accedere all’account o crearne uno nuovo.

### 3.13 `app/forgot-password/page.jsx` (`/forgot-password`)

- **Servizio**: Inserimento email per invio link di recupero password (Supabase Auth `resetPasswordForEmail`). Messaggio generico di successo (non rivela se l’email esiste).
- **Servizio al cliente**: Richiedere il link per reimpostare la password.

### 3.14 `app/reset-password/page.jsx` (`/reset-password`)

- **Servizio**: Pagina raggiunta dal link email: lettura token da URL, form nuova password + conferma; aggiornamento password con Supabase Auth; redirect alla dashboard.
- **Servizio al cliente**: Impostare la nuova password dopo aver cliccato il link ricevuto per email.

### 3.15 `app/lista-giocatori/page.jsx` (`/lista-giocatori`)

- **Servizio**: Redirect a `/gestione-formazione`. Nessun servizio diretto aggiuntivo.
- **Servizio al cliente**: Shortcut alla gestione formazione.

### 3.16 `app/upload/page.jsx` (`/upload`)

- **Servizio**: Redirect a `/gestione-formazione`. Shortcut per coerenza URL.
- **Servizio al cliente**: Come sopra.

### 3.17 `app/not-found.tsx`

- **Servizio**: Pagina 404 con messaggio tradotto (i18n). Mostrata quando l’URL non corrisponde a nessuna route.
- **Servizio al cliente**: Messaggio chiaro in caso di link errato o pagina non trovata.

### 3.18 `app/globals.css`

- **Servizio**: Stili globali CSS (variabili, layout, componenti comuni). Non è un “servizio” funzionale ma supporta l’aspetto di tutte le pagine.

### 3.19 `app/favicon.ico/route.ts`

- **Servizio**: Route che serve il favicon. Nessun servizio business.

---

## 4. Cartella `app/api/` – Endpoint e servizio al cliente

Tutti gli endpoint richiedono **Authorization: Bearer &lt;token&gt;** (tranne dove indicato). Il token è il JWT Supabase (session.access_token).

### 4.1 Chat e consulenza tattica

#### `POST /api/assistant-chat`

- **Servizio al cliente**: Inviare un messaggio alla chat coach e ricevere una risposta personalizzata (formazione, modulo, sostituzioni, stile, gameplay) in base a rosa, partite, allenatore e RAG eFootball.
- **Body**: `{ message: string, currentPage?: string, appState?: object, language?: 'it'|'en', history?: Array<{ role, content }> }`.
- **Risposta**: `{ content: string, suggestions?: string[] }` (content = risposta AI; suggestions = fino a 3 domande suggerite cliccabili). Errori: 400 (messaggio mancante/troppo lungo), 401 (auth), 429 (rate limit), 500.
- **Limitazioni**: Rate limit (config in lib/rateLimiter.js); lunghezza messaggio max 4000 caratteri; storia limitata (max 10 messaggi, max 2000 caratteri per messaggio). Consumo crediti: 1 per richiesta (CREDIT_WEIGHTS['assistant-chat']).
- **Dettaglio**: Costruisce contesto personale (profilo, rosa, partite, pattern, allenatore, tattica) e prompt con RAG (getRelevantSections da info_rag.md); chiama OpenAI GPT-4o; restituisce risposta + blocco SUGGERIMENTI parsato; non deve citare tasti/pulsanti, solo “cosa fare”.

---

### 4.2 Estrazioni da screenshot (AI Vision)

#### `POST /api/extract-player`

- **Servizio al cliente**: Estrarre dati di un giocatore da uno screenshot di card (nome, squadra, posizione, overall, statistiche, abilità, stile, ecc.) per creare o aggiornare un giocatore in rosa.
- **Body**: `{ imageDataUrl: string }` (base64 data URL, max 10MB).
- **Risposta**: `{ player: object }` con campi estratti (player_name, team, position, overall, playing_style, stats, skills, ecc.). Errori: 400 (immagine mancante/invalida), 401, 500.
- **Consumo crediti**: 2 (CREDIT_WEIGHTS['extract-player']).

#### `POST /api/extract-formation`

- **Servizio al cliente**: Estrarre formazione e posizioni da uno screenshot (es. schermata formazione avversario o propria).
- **Body**: `{ imageDataUrl: string }`.
- **Risposta**: Oggetto con formazione e slot/posizioni estratti. Usato in contromisure e in contesti dove serve riconoscere un modulo da immagine.
- **Consumo crediti**: 3.

#### `POST /api/extract-match-data`

- **Servizio al cliente**: Estrarre dati di una partita da uno o più screenshot (wizard partita): formazione giocata, stile, risultato, goal, dettagli.
- **Body**: Contiene imageDataUrl e contesto step (es. quale sezione del wizard).
- **Risposta**: Dati strutturati partita per salvataggio in `matches` e per analisi successiva.
- **Consumo crediti**: 2.

#### `POST /api/extract-coach`

- **Servizio al cliente**: Estrarre dati di un allenatore da screenshot di card allenatore (nome, competenze per stile, ecc.) per salvarlo in `coaches` e usarlo nei consigli.
- **Body**: `{ imageDataUrl: string }`.
- **Risposta**: Oggetto coach con campi estratti.
- **Consumo crediti**: 2.

---

### 4.3 Analisi partita e contromisure

#### `POST /api/analyze-match`

- **Servizio al cliente**: Ottenere un’analisi AI di una partita già salvata: riassunto bilingue (IT/EN), pattern, suggerimenti tattici. Usa rosa, formazione, allenatore e RAG (getRelevantSectionsForContext('analyze-match')).
- **Body**: `{ matchId: string }` (e contesto utente da token).
- **Risposta**: Contenuto analisi (testo), eventuali campi strutturati per visualizzazione.
- **Consumo crediti**: 4.

#### `POST /api/generate-countermeasures`

- **Servizio al cliente**: Generare contromisure tattiche pre-partita a partire dalla formazione avversaria (già estratta e salvata o passata nel body): formazione consigliata, istruzioni, giocatori chiave, cosa fare in campo.
- **Body**: Include dati formazione avversario e opzionalmente contesto rosa/allenatore.
- **Risposta**: Contromisure (testo e/o strutturato) per visualizzazione nella pagina contromisure-live.
- **Consumo crediti**: 3.
- **Dettaglio**: Usa countermeasuresHelper (generateCountermeasuresPrompt, validateCountermeasuresOutput) e RAG contesto countermeasures.

---

### 4.4 Crediti e utilizzo

#### `GET /api/credits/usage`

- **Servizio al cliente**: Conoscere l’utilizzo crediti del periodo corrente (credits_used, credits_included, periodo).
- **Risposta**: `{ credits_used, credits_included, period_key }` (o struttura analoga). Auth: Bearer.
- **Nessun body**.

#### `POST /api/credits/usage`

- **Servizio al cliente**: Stesso dato del GET, esposto anche via POST per compatibilità. Body ignorato.
- **Risposta**: Come GET.

#### `GET /api/credits/transactions`

- **Servizio al cliente**: Elenco ultime transazioni Hero Points (attività recente: utilizzi e accrediti).
- **Query**: Opzionale `?limit=N`.
- **Risposta**: Array di transazioni (amount, type, description, created_at, ecc.).

#### `POST /api/credits/accredit`

- **Servizio al cliente**: Accredito crediti dopo acquisto (chiamato da backend/sito pagamenti, non dal frontend utente). Identifica utente per email e accredita un importo per un order_id.
- **Body**: `{ email: string, creditsAmount: number, orderId: string, periodKey?: string }`.
- **Sicurezza**: In produzione deve essere protetto (es. API key o webhook verificato). Doc: docs/INTEGRAZIONE_SITO_PAGAMENTI_HERO_POINTS.md.

---

### 4.5 Barra conoscenza IA

#### `GET /api/ai-knowledge`

- **Servizio al cliente**: Ottenere lo score di conoscenza IA (0–100) e il breakdown per componente (profilo, rosa, partite, pattern, allenatore, utilizzo, successi) per mostrare la barra sulla dashboard.
- **Risposta**: `{ score, level, breakdown }` (level = beginner | intermediate | advanced | expert). Auth: Bearer.
- **Dettaglio**: Usa aiKnowledgeHelper.calculateAIKnowledgeScore (o lettura da user_profiles se già cached).

---

### 4.6 Obiettivi settimanali (task)

#### `GET /api/tasks/list`

- **Servizio al cliente**: Elenco obiettivi settimanali per la settimana corrente (o per la data indicata).
- **Query**: `?week_start_date=YYYY-MM-DD` (opzionale).
- **Risposta**: Array di task (titolo, descrizione, completato, progresso, ecc.). Auth: Bearer.

#### `POST /api/tasks/generate`

- **Servizio al cliente**: Generare o rigenerare obiettivi settimanali per l’utente (settimana corrente o data nel body).
- **Body**: `{ week_start_date?: string }` (YYYY-MM-DD, opzionale).
- **Risposta**: Task generati. Usa taskHelper.generateWeeklyTasksForUser.

---

### 4.7 Admin / utilità

#### `POST /api/admin/recalculate-patterns`

- **Servizio al cliente**: Ricalcolare i pattern tattici (formation_usage, playing_style_usage, win_rate) dalle ultime 50 partite dell’utente. Usato dalla dashboard per aggiornare i dati dopo caricamento partite senza dover rifare analisi completa.
- **Body**: `{ user_id: string }`. Auth: Bearer (utente deve essere il proprietario).
- **Risposta**: `{ success, patterns }`.

---

### 4.8 Supabase CRUD (persistenza dati)

Tutti **POST**, auth Bearer, body JSON con i dati da salvare/aggiornare. Servizio al cliente: **persistenza e aggiornamento** dei dati che l’utente modifica nell’app.

#### `POST /api/supabase/save-player`

- **Servizio**: Salvare o aggiornare un giocatore nella rosa (tabella `players`). Crea/aggiorna anche record in `player_photo_slots` se ci sono photo_slots. Validazione: player_name obbligatorio; playing_style risolto su `playing_styles`; lunghezza campi testo max 255.
- **Body**: `{ player: object }` (player_name, team, position, overall, playing_style, role, stats, skills, photo_slots, slot_index, ecc.).

#### `POST /api/supabase/save-formation-layout`

- **Servizio**: Salvare il layout formazione (modulo e posizioni x,y per ogni slot 0–10). Un record per user in `formation_layout`.
- **Body**: `{ formation: string, slot_positions: object }`.

#### `POST /api/supabase/assign-player-to-slot`

- **Servizio**: Assegnare un giocatore a uno slot (0–10 = titolare). Aggiorna `players.slot_index` e gestisce duplicati/riserve.
- **Body**: `{ playerId, slotIndex }` (e user da token).

#### `POST /api/supabase/remove-player-from-slot`

- **Servizio**: Rimuovere un giocatore dallo slot (torna in riserva: slot_index = null).
- **Body**: `{ playerId }` (e user da token).

#### `POST /api/supabase/save-tactical-settings`

- **Servizio**: Salvare impostazioni tattiche (stile squadra, istruzioni individuali per slot). Tabella `tactical_settings` (o analoga).
- **Body**: Oggetto con team_playing_style e istruzioni per slot.

#### `POST /api/supabase/save-profile`

- **Servizio**: Salvare/aggiornare profilo utente (user_profiles): first_name, last_name, team_name, ai_name, how_to_remember, common_problems, ecc.
- **Body**: Campi profilo da aggiornare.

#### `POST /api/supabase/save-coach`

- **Servizio**: Salvare un allenatore (tabella `coaches`) con competenze per stile. Collegato a user_id.
- **Body**: Dati allenatore (nome, competenze stili, ecc.).

#### `POST /api/supabase/set-active-coach`

- **Servizio**: Impostare l’allenatore attivo per l’utente (un solo coach attivo; gli altri vengono disattivati).
- **Body**: `{ coachId: string }`.

#### `POST /api/supabase/save-match`

- **Servizio**: Inserire una nuova partita (tabella `matches`). Calcola e aggiorna pattern tattici (formation_usage, playing_style_usage). Chiama taskHelper.updateTasksProgressAfterMatch per aggiornare obiettivi settimanali.
- **Body**: Dati partita (match_date, formation_played, playing_style_played, result, ecc.).

#### `POST /api/supabase/update-match`

- **Servizio**: Aggiornare una partita esistente. Ricalcola pattern e aggiorna task se necessario.
- **Body**: `{ matchId, ...campi da aggiornare }`.

#### `POST /api/supabase/delete-match`

- **Servizio**: Eliminare una partita. Ricalcola pattern dopo la cancellazione.
- **Body**: `{ matchId }`.

#### `POST /api/supabase/delete-player`

- **Servizio**: Eliminare un giocatore dalla rosa. Gestisce riferimenti (tactical_settings, slot, photo_slots).
- **Body**: `{ playerId }`.

#### `POST /api/supabase/save-opponent-formation`

- **Servizio**: Salvare la formazione avversario estratta (per contromisure). Tabella dedicata (es. opponent_formations).
- **Body**: Dati formazione avversario.

---

## 5. Cartella `lib/` – Funzioni e servizio al cliente

Ogni file espone funzioni/constant usate dalle pagine o dalle API per erogare il servizio descritto.

### 5.1 `lib/supabaseClient.js`

- **Servizio**: Client Supabase per il frontend (browser). Usa anon key; RLS applicata. Usato per letture e per Auth (login, signUp, resetPasswordForEmail, getSession, onAuthStateChange).
- **Export**: `supabase` – istanza createClient con `detectSessionInUrl: true` (necessario per flusso reset password da link email).

### 5.2 `lib/authHelper.js`

- **Servizio**: Validazione token e estrazione Bearer per le API (sicurezza).
- **`validateToken(token, supabaseUrl, anonKey)`**: Restituisce `{ userData, error }`. userData contiene l’utente Supabase se il token è valido; altrimenti error.
- **`extractBearerToken(req)`**: Estrae il token dall’header `Authorization: Bearer <token>` (case-insensitive). Restituisce stringa o null.

### 5.3 `lib/creditService.js`

- **Servizio**: Tracciamento utilizzo crediti mensili e transazioni Hero Points (per storico e limiti).
- **`getCurrentPeriodKey()`**: Restituisce `YYYY-MM` (UTC) per il mese corrente.
- **`recordUsage(admin, userId, credits, operationType)`**: Upsert su `user_credit_usage` per il periodo corrente: incrementa `credits_used` di `credits`; scrive anche una riga in `credit_transactions` con amount negativo (uso). Non lancia in caso di errore (fire-and-forget).
- **`recordTransaction(admin, userId, amount, type, description, referenceId)`**: Inserisce una riga in `credit_transactions` (uso o accredito). Fire-and-forget.
- **`accreditPurchase(admin, userId, creditsAmount, orderId, periodKey)`**: Accredita crediti dopo acquisto: upsert su `user_credit_usage` (aumenta credits_included o credits_used in modo da riflettere il credito), inserisce transazione positiva. Evita duplicati per orderId.
- **`getRecentTransactions(admin, userId, limit)`**: Restituisce le ultime N transazioni per l’utente (attività recente).
- **`getCurrentUsage(admin, userId, opts)`**: Restituisce utilizzo periodo corrente (credits_used, credits_included, period_key). Opzionale currentPeriodOnly.
- **Costanti**: `CREDITS_INCLUDED_DEFAULT` (da env o 200), `CREDIT_WEIGHTS` (pesi per operazione: assistant-chat 1, extract-player 2, extract-coach 2, extract-match-data 2, generate-countermeasures 3, extract-formation 3, analyze-match 4).

### 5.4 `lib/aiKnowledgeHelper.js`

- **Servizio**: Calcolo dello score “quanto l’IA conosce il cliente” (0–100) e aggiornamento su user_profiles.
- **`getAIKnowledgeLevel(score)`**: Da score 0–100 restituisce 'beginner' | 'intermediate' | 'advanced' | 'expert' (soglie 31, 61, 81).
- **`calculateAIKnowledgeScore(userId, supabaseUrl, serviceKey)`**: Legge profilo, rosa, partite, pattern, allenatore, utilizzo, obiettivi e calcola score pesato (profilo 20%, rosa 25%, partite 30%, pattern 15%, allenatore 10%, utilizzo bonus 10%, successi 15%). Restituisce score e breakdown.
- **`updateAIKnowledgeScore(userId, supabaseUrl, serviceKey)`**: Ricalcola lo score e aggiorna `user_profiles` (ai_knowledge_score, ai_knowledge_level, ai_knowledge_breakdown).

### 5.5 `lib/ragHelper.js`

- **Servizio**: Recupero sezioni rilevanti da `info_rag.md` per contestualizzare le risposte della chat e le analisi (RAG).
- **`getRelevantSections(userMessage, maxChars)`**: Dato il messaggio utente, restituisce un blocco di testo (max 18000 caratteri) con sezioni di info_rag: (1) riserva sempre la sezione “10. NOTE CRITICHE PER L’IA”; (2) per il resto seleziona sezioni per punteggio (keyword nel messaggio); (3) bonus punteggio per la sezione 7 (MECCANICHE) se il messaggio sembra su gameplay. Per la sezione 2 (STILI GIOCATORE) può filtrare per ruolo (attaccanti/centrocampisti/difensori) in base al messaggio. Restituisce stringa con sezioni separate da `---`.
- **`getRelevantSectionsForContext(contextType, maxChars)`**: Per `contextType` 'analyze-match' o 'countermeasures' restituisce un blocco di sezioni in ordine fisso (1…10) fino a maxChars (default 12000). Usato da analyze-match e generate-countermeasures.
- **`classifyQuestion(message)`**: Classifica se il messaggio è pertinente a eFootball (per routing o filtri). Restituisce boolean o tipo.

### 5.6 `lib/openaiHelper.js`

- **Servizio**: Chiamate a OpenAI API con retry e gestione errori.
- **`callOpenAIWithRetry(apiKey, requestBody, operationType)`**: Invia requestBody (messages, model, temperature, ecc.) a OpenAI; retry in caso di errore temporaneo. Restituisce la Response fetch.
- **`parseOpenAIResponse(response, operationType)`**: Legge il body JSON della response e estrae il contenuto (es. choices[0].message.content). Gestisce errori e formati alternativi.

### 5.7 `lib/countermeasuresHelper.js`

- **Servizio**: Costruzione prompt e validazione output per le contromisure tattiche.
- **`identifyMetaFormation(formationName, playingStyle)`**: Mappa nome formazione e stile a un’etichetta “meta” per il prompt.
- **`generateCountermeasuresPrompt(...)`**: Costruisce il prompt per l’AI con formazione avversario, rosa cliente, allenatore, RAG. Restituisce stringa prompt.
- **`validateCountermeasuresOutput(output)`**: Valida che l’output generato rispetti formato e paletti (es. formazioni consentite, istruzioni dalla sezione 5).

### 5.8 `lib/taskHelper.js`

- **Servizio**: Generazione obiettivi settimanali e aggiornamento progresso dopo le partite.
- **`generateWeeklyTasksForUser(userId, supabaseUrl, serviceKey, week)`**: Recupera profilo, ultime partite e pattern; genera task settimanali (titolo, descrizione, tipo, target) e li inserisce in `weekly_goals`. week = { start: 'YYYY-MM-DD', end: 'YYYY-MM-DD' }. Se non ci sono dati sufficienti usa task generici.
- **`updateTasksProgressAfterMatch(userId, supabaseUrl, serviceKey, matchData)`**: Dopo il salvataggio di una partita, aggiorna il progresso dei task settimanali (es. “Vinci 2 partite” → incrementa contatore).
- **`getCurrentWeek()`**: Restituisce oggetto settimana corrente (start, end in YYYY-MM-DD).

### 5.9 `lib/i18n.js`

- **Servizio**: Traduzioni IT/EN e contesto lingua per l’interfaccia.
- **`translations`**: Oggetto { it: { key: string }, en: { key: string } } con tutte le chiavi (pagine, pulsanti, messaggi, formazioni, stili, ecc.).
- **`LanguageProvider({ children })`**: Componente React che fornisce il contesto lingua (stato e setter).
- **`getTranslation(key, lang)`**: Restituisce la stringa tradotta per la chiave e la lingua (lang = 'it' | 'en' | null; se null usa stato globale).
- **`useTranslation()`**: Hook che restituisce `{ t, lang, setLang }` (t(key) = traduzione nella lingua corrente).

### 5.10 `lib/guideTours.js`

- **Servizio**: Definizione step del tour “Mostrami come” per path.
- **`getTourSteps(pathname, t)`**: Dato il pathname (es. '/gestione-formazione') e la funzione di traduzione t, restituisce l’array di step del tour (id, target selector, titolo, contenuto).
- **`TOUR_IDS`**: Costanti identificativi tour (es. per dashboard, formazione, contromisure).

### 5.11 `lib/validateFormationLimits.js`

- **Servizio**: Validazione limiti formazione eFootball (ruoli e zone campo).
- **`validateFormationLimits(slotPositions)`**: Controlla che slot_positions rispetti: 1 portiere (PT); difesa 2–5 (max 3 DC, 1 TD, 1 TS); centrocampo 1–6 (max 1 CLD, 1 CLS); attacco 1–5 (max 2 P, 1 EDA/ESA). Restituisce `{ valid, errors[], warnings[], stats }`.

### 5.12 `lib/tacticalInstructions.js`

- **Servizio**: Configurazione e validazione istruzioni individuali (slot attacco 1/2, difesa 1/2).
- **`INDIVIDUAL_INSTRUCTIONS_CONFIG`**: Oggetto con per ogni categoria (attacco_1, attacco_2, difesa_1, difesa_2) nameKey, descriptionKey, filterPlayers, availableInstructions (difensivo, offensivo, ancoraggio, marcatura_stretta, marcatura_uomo, contropiede, linea_bassa).
- **`validateIndividualInstruction(category, playerId, instruction, titolari, formationLayout)`**: Verifica che il giocatore sia titolare, che la posizione sia compatibile con la categoria e che l’istruzione sia consentita (es. linea_bassa non a difensori; contropiede solo CC/attaccanti; ancoraggio max 2 in squadra). Restituisce `{ valid, error? }`.

### 5.13 `lib/playerPhotoTypes.js`

- **Servizio**: Configurazione tipi di foto giocatore (card, stats, skills) per UI e upload.
- **`PHOTO_TYPE_KEYS`**: `['card', 'stats', 'skills']`.
- **`getPhotoTypeStyle(key)`**: Restituisce stile (colore/icona) per il tipo.
- **`getPhotoTypeConfig(key)`**: Restituisce configurazione (label, descrizione) per il tipo.

### 5.14 `lib/rateLimiter.js`

- **Servizio**: Limitazione richieste per utente e endpoint (anti-abuso).
- **`checkRateLimit(userId, endpoint, maxRequests, windowMs)`**: Verifica se l’utente ha superato il numero di richieste consentite in finestra (windowMs). Restituisce `{ allowed, remaining, resetAt }`. Implementazione in memoria (o storage condiviso in produzione).
- **`RATE_LIMIT_CONFIG`**: Oggetto con per ogni path (es. '/api/assistant-chat') maxRequests e windowMs.

### 5.15 `lib/errorHelper.js`

- **Servizio**: Mappatura errori tecnici in messaggi utente.
- **`mapErrorToUserMessage(error, fallbackMessage)`**: Data un’eccezione o risposta errore, restituisce una stringa da mostrare all’utente (es. “Sessione scaduta”, “Riprova tra poco”). Fallback se il tipo di errore non è riconosciuto.

### 5.16 `lib/fetchHelper.js`

- **Servizio**: Lettura sicura della risposta JSON da fetch.
- **`safeJsonResponse(response, fallbackErrorMessage)`**: Legge response.json(); in caso di errore o body non JSON restituisce un oggetto con messaggio di errore (fallbackErrorMessage). Usato dal frontend per evitare crash su risposta malformata.

---

## 6. Cartella `components/` – Componenti e servizio al cliente

### 6.1 `AssistantChat.jsx`

- **Servizio al cliente**: Widget chat con il coach AI (icona cervello in basso a destra). Apre un pannello con messaggi, input e suggerimenti cliccabili; invia messaggi a POST /api/assistant-chat e mostra risposta e nuove domande suggerite. Suggerimenti iniziali dipendono dalla pagina corrente (gestione-formazione, match, contromisure, allenatori, dashboard). Gestisce lingua (i18n) e sessione (redirect a login se non autenticato).
- **Usato in**: Layout globale (tutte le pagine).

### 6.2 `CreditsBar.jsx`

- **Servizio al cliente**: Barra che mostra i crediti del periodo corrente (utilizzati / inclusi) e link ad acquisto o profilo. Si aggiorna dopo login e su evento auth (onAuthStateChange). Chiama GET o POST /api/credits/usage.
- **Usato in**: Layout globale.

### 6.3 `GuideTour.jsx`

- **Servizio al cliente**: Tour guidato “Mostrami come”: evidenzia elementi della pagina (selector) e mostra tooltip con titolo e descrizione. Step definiti in guideTours.getTourSteps(pathname). Pulsante bussola in alto per avviare il tour.
- **Usato in**: Layout globale.

### 6.4 `LanguageProviderWrapper.jsx`

- **Servizio al cliente**: Wrapper che fornisce il contesto lingua (LanguageProvider da i18n) a tutta l’app. I figli possono usare useTranslation() per t() e setLang.
- **Usato in**: layout.tsx (root).

### 6.5 `LanguageSwitch.jsx`

- **Servizio al cliente**: Toggle o dropdown per cambiare lingua (IT/EN). Aggiorna lo stato nel LanguageProvider.
- **Usato in**: Dove si espone la scelta lingua (es. header o profilo).

### 6.6 `AIKnowledgeBar.jsx`

- **Servizio al cliente**: Barra progresso 0–100% “Quanto l’IA ti conosce” con eventuale breakdown (profilo, rosa, partite, pattern, allenatore, utilizzo, successi). Chiama GET /api/ai-knowledge. Se sessione assente o 401 reindirizza a /login. Mostra livello (beginner/intermediate/advanced/expert).
- **Usato in**: Dashboard (app/page.jsx).

### 6.7 `TaskWidget.jsx`

- **Servizio al cliente**: Widget obiettivi settimanali: elenco task della settimana (GET /api/tasks/list), stato completamento, eventuale azione per aggiornare. Può mostrare progresso (es. “2/3 partite vinte”).
- **Usato in**: Dashboard.

### 6.8 `ConfirmModal.jsx`

- **Servizio al cliente**: Modale conferma azione (titolo, messaggio, pulsanti Annulla/Conferma). Usato per confermare eliminazione partita, giocatore, o altre azioni distruttive.
- **Usato in**: gestione-formazione, match, altre pagine con azioni confermabili.

### 6.9 `MissingDataModal.jsx`

- **Servizio al cliente**: Modale che avvisa l’utente che mancano dati (es. rosa vuota, formazione non impostata) e suggerisce dove andare (es. caricare formazione, giocatori).
- **Usato in**: gestione-formazione o contesti dove servono dati minimi.

### 6.10 `PositionSelectionModal.jsx`

- **Servizio al cliente**: Modale per scegliere la posizione/ruolo di un giocatore (es. quando si assegna a uno slot). Mostra le posizioni consentite (validateFormationLimits, tacticalInstructions) e salva la scelta.
- **Usato in**: gestione-formazione (assegnazione giocatore a slot).

### 6.11 `TacticalSettingsPanel.jsx`

- **Servizio al cliente**: Pannello per modificare stile squadra e istruzioni individuali per ogni slot (attacco 1/2, difesa 1/2). Usa INDIVIDUAL_INSTRUCTIONS_CONFIG e validateIndividualInstruction; salva tramite save-tactical-settings.
- **Usato in**: gestione-formazione.

---

## 7. Altre cartelle

### 7.1 `migrations/`

- **Servizio**: Script SQL per creare/aggiornare tabelle e funzioni Supabase (players, formation_layout, matches, user_profiles, coaches, user_credit_usage, credit_transactions, weekly_goals, team_tactical_patterns, opponent_formations, ecc.). Eseguiti con scripts/run-migration.js o da Supabase Dashboard. Non sono un “servizio” diretto al cliente ma abilitano la persistenza dei dati.

### 7.2 `scripts/run-migration.js`

- **Servizio**: Esegue un file di migrazione SQL contro il database Supabase (config da env). Uso: sviluppo o deploy per applicare schema.

### 7.3 `public/`

- **Servizio**: File statici (immagini, favicon) serviti come asset pubblici. Es. logo o immagini per la guida.

### 7.4 `docs/`

- **Servizio**: Documentazione progetto (auth, email, SMTP, crediti, audit chat, gestione rosa). Riferimento per sviluppatori e per configurazione produzione (es. SMTP, recupero password).

### 7.5 `info_rag.md`

- **Servizio**: Contenuto RAG: sezioni su statistiche, stili giocatore, moduli, stili squadra, istruzioni individuali, calci piazzati, meccaniche di gioco, abilità, competenze, note critiche per l’IA. Usato da ragHelper (getRelevantSections, getRelevantSectionsForContext) per contestualizzare chat, analisi partita e contromisure. Non è una “cartella” ma un file dati essenziale per il servizio di consulenza tattica.

---

## 8. Riepilogo flussi servizio

1. **Consulenza tattica**: Cliente apre chat (AssistantChat) → POST /api/assistant-chat con message e contesto → backend costruisce contesto (rosa, partite, allenatore, RAG) → OpenAI risponde → cliente vede risposta e suggerimenti. Crediti: 1 a richiesta.
2. **Aggiunta giocatore**: Cliente in gestione-formazione carica foto card → POST /api/extract-player → dati estratti → POST /api/supabase/save-player. Crediti: 2 per estrazione.
3. **Registrazione partita**: Cliente in match/new compila wizard (5 step, screenshot) → extract-match-data per ogni step → POST /api/supabase/save-match → updateTasksProgressAfterMatch. Crediti: 2 per estrazione match.
4. **Analisi partita**: Cliente in match/[id] avvia analisi → POST /api/analyze-match → riceve riassunto e suggerimenti. Crediti: 4.
5. **Contromisure**: Cliente in contromisure-live carica formazione avversario (estrazione) → POST /api/generate-countermeasures → riceve contromisure. Crediti: 3 per generazione.
6. **Obiettivi settimanali**: GET /api/tasks/list mostra task; dopo ogni partita salvata, updateTasksProgressAfterMatch aggiorna i progressi.
7. **Barra conoscenza**: GET /api/ai-knowledge → score e breakdown → AIKnowledgeBar sulla dashboard.
8. **Crediti**: Ogni operazione AI (chat, extract-*, analyze-match, generate-countermeasures) chiama recordUsage con il peso; GET /api/credits/usage mostra utilizzo; GET /api/credits/transactions mostra storico.

Fine documento.
