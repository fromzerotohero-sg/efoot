# PANORAMICA GENERALE - eFootball AI Coach

**Guida discorsiva al codice e all'architettura**

---

## 1. L'ARCHITETTURA IN PILLOLE

### Come è organizzato il sistema

Immagina l'app come un **ristorante**:

- **La cucina (Backend/API)** → Prepara i dati, parla con il database, chiama OpenAI
- **La sala (Frontend)** → Mostra le informazioni, raccoglie input dell'utente
- **Il magazzino (Database)** → Conserva tutti i dati (giocatori, partite, profili)
- **Il fornitore esterno (OpenAI)** → Fornisce l'intelligenza artificiale

Tutto gira su **Vercel** (serverless), quindi non c'è un server sempre acceso: le API si "svegliano" solo quando servono.

---

## 2. IL FLUSSO DI UN UTENTE TIPICO

### Scenario: Mario si iscrive e usa l'app

**Step 1 - Registrazione** (`/login`)
- Mario inserisce email e password
- Supabase Auth crea l'account e gestisce la sessione
- Viene reindirizzato alla dashboard

**Step 2 - Primo setup** (`/impostazioni-profilo`)
- Compila nome, squadra, divisione
- Sistema salva in `user_profiles`
- Viene calcolato il primo "AI Knowledge Score" (quanto l'IA conosce Mario)

**Step 3 - Aggiunge giocatori** (`/gestione-formazione`)
- Carica screenshot della card di un giocatore
- Immagine va a OpenAI Vision → estrae nome, overall, posizione, stats
- Dati salvati in tabella `players`
- Ogni giocatore ha uno slot: 0-10 = titolare, NULL = riserva

**Step 4 - Gioca una partita**
- Dopo la partita, entra in `/match/new`
- Wizard in 5 step:
  1. Dice se era in casa o trasferta
  2. Scrive nome avversario e risultato
  3. Carica screenshot statistiche
  4. Carica screenshot voti giocatori
  5. Analisi AI genera riassunto

**Step 5 - Task aggiornati**
- Il sistema vede che ha giocato → aggiorna `weekly_goals`
- Se ha vinto e il task era "Vinci 3 partite" → progresso aumenta
- Quando task completato → notifica e aggiorna AI Knowledge Score

**Step 6 - Chiede consigli**
- Apre chat (`AssistantChat` widget in basso a destra)
- Chiede "Come miglioro la difesa?"
- Sistema recupera: rosa di Mario, ultime partite, pattern tattici
- Aggiunge contesto al prompt + regole eFootball da `info_rag.md`
- OpenAI risponde con consigli personalizzati

---

## 3. LE PAGINE UNA PER UNA

### 🏠 Dashboard (`app/page.jsx`)
**La "home" dell'app.**

Cosa fa:
- Carica statistiche riassuntive (quanti giocatori, formazione usata)
- Mostra ultime 10 partite
- Carica pattern tattici (se non esistono, li calcola automaticamente)
- Mostra classifica mensile posizione
- Ha bottoni rapidi per le azioni principali

Flusso dati:
```
Dashboard → Supabase (players, matches, patterns)
        → Se patterns mancanti → chiama API recalculate-patterns
        → Mostra tutto
```

**Nota tecnica:** C'è un timeout di 30s perché a volte Supabase è lento. Se impiega troppo, mostra errore ma non blocca l'utente.

---

### ⚽ Gestione Formazione (`app/gestione-formazione/page.jsx`)
**Il cuore dell'app.**

Cosa fa:
- Mostra campo da calcio 2D con 11 slot (0-10)
- I giocatori sono "card" cliccabili
- Drag & drop per spostare giocatori
- Pannello laterale con riserve
- Click su slot vuoto → apre modale per assegnare riserva

Componenti principali:
- `SlotCard` → Card giocatore titolare
- `ReserveCard` → Card giocatore in panchina
- `AssignModal` → Modale per scegliere chi mettere
- `FormationSelectorModal` → Cambia modulo (4-3-3, 4-2-3-1, etc)

Logica interessante:
- Ogni slot ha coordinate x,y sul campo
- Quando sposti un giocatore, calcola automaticamente la posizione (DC, TS, CC, etc)
- Validazione: non puoi mettere più di 11 titolari, o giocatori duplicati

---

### 🎮 Upload Partita Wizard (`app/match/new/page.jsx`)
**Flusso guidato per salvare una partita.**

Struttura:
- 5 step progressivi (stepper in alto)
- Ogni step ha il proprio pannello
- Dati salvati temporaneamente nello stato React
- Solo alla fine si salva tutto su database

Gli step:
1. **Casa/Trasferta** → Sceglie se era in casa (is_home: true) o no
2. **Info Generali** → Nome avversario, risultato, data
3. **Statistiche** → Upload screenshot con statistiche della partita (possesso, tiri, etc)
4. **Voti Giocatori** → Upload screenshot con i voti dei singoli giocatori
5. **Analisi** → AI genera riassunto, utente può modificare, poi salva

Tecnica:
- Ogni step è una "sezione" con ID univoco
- Usa `localStorage` per non perdere dati se ricarica la pagina
- Validazione: non puoi andare avanti se mancano dati obbligatori

---

### 📊 Dettaglio Partita (`app/match/[id]/page.jsx`)
**Visualizza una partita salvata.**

Cosa mostra:
- Info base (avversario, risultato, data)
- Statistiche (con grafici a barre)
- Voti giocatori (tabella)
- Analisi AI (testo del riassunto)
- Azioni: modifica, elimina, condividi

Se clicca "Modifica":
- Apre stesso wizard del new ma pre-popolato
- Permette di aggiungere foto mancanti
- Aggiorna i dati esistenti

---

### 👤 Gestione Profilo (`app/gestione-profilo/page.jsx`)
**Area personale dell'utente.**

Sezioni:
- **Info profilo** → Nome, squadra, divisione
- **Barra Conoscenza IA** → Quanto l'IA conosce l'utente (0-100%)
- **Breakdown Conoscenza** → Dettaglio per categoria (rosa, partite, pattern, etc)
- **Task completati** → Storico obiettivi settimanali
- **Classifica** → Posizione mensile attuale
- **Premi** → Eventuali premi vinti in classifica

Tecnica:
- Calcolo AI Knowledge Score fatto da `lib/aiKnowledgeHelper.js`
- Ogni componente (rosa, partite, etc) vale un punteggio
- Totale massimo 100%

---

### 🎯 Allenatori (`app/allenatori/page.jsx`)
**Gestisce gli allenatori della squadra.**

Cosa fa:
- Lista allenatori caricati
- Ogni allenatore ha: nome, età, nazionalità, competenze stili
- Allenatore attivo ha badge "Attivo"
- Può caricare nuovo allenatore da screenshot (AI estrae dati)
- Cambia allenatore attivo (solo uno alla volta)

Logica:
- Tabella `coaches` con `is_active` boolean
- Quando cambia allenatore attivo → disattiva tutti gli altri
- Competenze stili influenzano i consigli AI

---

### 🏆 Classifica (`app/classifica/page.jsx`)
**Classifica mensile "From Zero to Hero".**

Come funziona:
- Ogni mese nuova classifica
- Punti basati su: partite giocate, task completati, utilizzo app
- API `/api/leaderboard` calcola in tempo reale
- Salva snapshot in `leaderboard_snapshots`

Cosa mostra:
- Top 10 (o più) utenti
- Posizione dell'utente loggato (anche se fuori top 10)
- Giorni rimanenti al termine del mese
- Punti necessari per salire di posizione

---

### 💬 Chat AI (Widget - `components/AssistantChat.jsx`)
**Assistente virtuale sempre disponibile.**

Posizione:
- Widget in basso a destra su tutte le pagine
- Pulsante "Coach AI" apre pannello chat

Come funziona:
- Utente scrive domanda
- Sistema aggiunge contesto: rosa, partite, allenatore, tattica
- Aggiunge anche sezioni rilevanti da `info_rag.md` (regole eFootball)
- Manda tutto a OpenAI
- Mostra risposta + 3 suggerimenti cliccabili

Limitazioni:
- Max 10 messaggi di storia
- Max 800 token di risposta (per evitare troncature)
- Rate limit: 30 messaggi/minuto

---

## 4. LE API (La "cucina")

### Estrazione Dati (`/api/extract-*`)
Tutte usano OpenAI Vision:

- `extract-player` → Da screenshot card giocatore a JSON con dati
- `extract-formation` → Da screenshot formazione avversaria a JSON
- `extract-match-data` → Da screenshot stats partita a JSON
- `extract-coach` → Da screenshot allenatore a JSON

Flusso:
```
Immagine base64 → OpenAI Vision → JSON dati → Salva DB
```

Costo: ~$0.01-0.05 per immagine

---

### Chat (`/api/assistant-chat`)
Endpoint più complesso.

Input:
- Messaggio utente
- Pagina corrente (per contesto)
- Storia conversazione
- Lingua (IT/EN)

Processo:
1. Classifica la domanda (è su rosa? partite? tattica?)
2. Se riguarda eFootball → carica sezioni rilevanti da `info_rag.md`
3. Recupera dati personali utente (rosa, partite, allenatore)
4. Costruisce prompt enorme (system + contesto + domanda)
5. Chiama OpenAI
6. Estrae suggerimenti dalla risposta
7. Sanitizza output (rimuove ragionamenti)
8. Ritorna risposta + suggerimenti

---

### Operazioni DB (`/api/supabase/*`)
Endpoint "passacarte" tra frontend e Supabase.

Perché esistono:
- Alcune operazioni richiedono `service_role_key` (non esposta al client)
- Logica business (es. calcolo pattern dopo salvataggio partita)
- Rate limiting

Esempi:
- `save-player` → Salva giocatore + aggiorna AI Knowledge
- `save-match` → Salva partita + calcola pattern + aggiorna task
- `delete-player` → Elimina + pulisce istruzioni individuali

---

## 5. IL DATABASE (Il "magazzino")

### Tabella `players` (La rosa)
Ogni riga è un giocatore di un utente.

Campi importanti:
- `user_id` → A chi appartiene
- `player_name` → Nome giocatore
- `position` → Ruolo (DC, CC, etc)
- `overall_rating` → Valore totale (40-110)
- `slot_index` → 0-10 = titolare, NULL = riserva
- `base_stats` → JSON con statistiche (velocità, tiro, etc)
- `skills` → Array abilità speciali
- `photo_slots` → Traccia quali foto ha caricato (card, stats, skills)

### Tabella `matches` (Le partite)
Ogni riga è una partita giocata.

Campi:
- `user_id`, `opponent_name`, `result` (es. "2-1")
- `is_home` → Boolean (casa o trasferta)
- `match_date` → Data della partita
- `team_stats` → JSON con statistiche (possesso, tiri, passaggi, etc)
- `player_ratings` → JSON con voti giocatori
- `data_completeness` → 'complete' o 'partial'
- `ai_summary` → Riassunto generato dall'AI

### Tabella `weekly_goals` (I task)
Obiettivi settimanali per utente.

Campi:
- `user_id`, `goal_type` (es. 'increase_wins')
- `goal_description` → Testo leggibile
- `target_value` → Quanto deve raggiungere (es. 3)
- `current_value` → Quanto ha fatto (es. 1)
- `status` → 'active', 'completed', 'failed'
- `week_start_date`, `week_end_date` → Periodo validità

**Nota sicurezza:** UPDATE policy rimossa intenzionalmente (anti-cheating). Solo backend (service_role) può aggiornare `current_value` e `status`.

### Tabella `user_profiles` (Il profilo)
Dati utente estesi (oltre auth). I campi profilo vengono aggiornati sia dalla **Palestra Coach** (chat IA dedicata) che dall'API save-ai-info (legacy).

Campi principali:
- `user_id` → FK a auth.users
- `first_name`, `last_name`, `team_name`, `favorite_team`
- `current_division` → Divisione attuale (es. "Division 1")
- `initial_division` → Divisione al primo login (per tracciare miglioramento)
- `ai_knowledge_score` → 0-100%, `ai_knowledge_level`, `ai_knowledge_breakdown`
- Campi "Informazioni IA" (scritti dalla Palestra Coach): `platform`, `connection_quality`, `pass_level`, `smart_assist`, `input_delay`, `ai_weak_point`, `ai_learn_goals`, `ai_notes`

### Tabella `user_tactical_feedback` (Palestra Coach)
Sessioni di feedback raccolte dalla chat Palestra Coach. L'IA le usa per evitare errori e rinforzare cio che funziona.

Campi:
- `user_id`, `match_id` (FK nullable a matches)
- `session_type` → 'profile_setup', 'feedback', 'update'
- `formation_played`, `style_played`, `opponent_name`, `outcome`
- `insights` → JSON: `[{"type": "weakness|strength|lesson", "text": "..."}]`
- `profile_fields_updated` → JSON: campi profilo aggiornati in questa sessione

Letta da: `diagnosticBuilder.js` (sezione ESPERIENZA COACH), `aiKnowledgeHelper.js` (componente coach_training 10%).

Doc completa: `docs/02-FUNZIONALITA/PALESTRA_COACH_ARCHITETTURA.md`

---

## 6. I COMPONENTI CONDIVISI

### `CreditsBar.jsx`
**In alto a destra su tutte le pagine.**

Mostra:
- Icona crediti + numero usati/inclusi
- Clic → popover con dettaglio mese corrente
- Polling ogni 45s per aggiornare
- Quando esauriti → mostra avviso

Tecnica:
- Chiama `/api/credits/usage`
- Usa `AbortController` per cancellare fetch se utente cambia pagina

---

### `AIKnowledgeBar.jsx`
**Indicatore "quanto l'IA ti conosce".**

Mostra:
- Percentuale 0-100%
- Livello (Beginner → Expert)
- Clic → modale con breakdown dettagliato

Logica:
- Fetch da `/api/ai-knowledge`
- Se score cambia → animazione
- Retry fino a 3 volte se errore

---

### `TaskWidget.jsx`
**Widget task settimanali.**

Mostra:
- 3 task della settimana corrente
- Progresso visual (barra)
- Stato (active/completed)

Comportamento:
- GET `/api/tasks/list` → auto-genera task se mancanti
- Poll ogni 60s
- Quando task completato → animazione + notifica

---

## 7. LOGICHE COMPLESSE

### Calcolo AI Knowledge Score (`lib/aiKnowledgeHelper.js`)
**Quanto l'IA conosce l'utente?**

Punteggio totale: max 100%

Componenti:
1. **Profilo (20%)** → Campi compilati (nome, squadra, etc)
2. **Rosa (25%)** → 11 titolari + riserve + dati completi
3. **Partite (30%)** → Più partite = più conoscenza (max 10 partite)
4. **Pattern (15%)** → Ha identificato pattern tattici?
5. **Allenatore (10%)** → Ha allenatore attivo?
6. **Utilizzo (bonus 10%)** → Interazioni con chat, etc
7. **Successi (bonus 15%)** → Task completati, miglioramento divisione

Quando si aggiorna:
- Dopo ogni salvataggio partita
- Dopo completamento task
- Su richiesta esplicita

---

### Aggiornamento Task (`lib/taskHelper.js`)
**Come si aggiornano i progressi?**

Trigger:
- Utente salva nuova partita
- Utente apre lista task (sync)

Calcolo per tipo task:
- `increase_wins` → Conta vittorie in settimana (considera is_home!)
- `reduce_goals_conceded` → Media gol subiti ultime 5 partite
- `complete_matches` → Conta partite complete
- `use_ai_recommendations` → Conta transazioni crediti in settimana

Nota:
- Usa `is_home` per calcolo corretto!
- Se in trasferta e risultato "2-1", gol subiti sono 2 (primo numero), non 1

---

### Pattern Tattici (team_tactical_patterns)
**Cosa impara l'IA dall'utente?**

La logica di calcolo è nelle route API (non in un modulo lib dedicato):
- `formation_usage` → Quali formazioni usa più spesso
- `playing_style_usage` → Quali stili di gioco preferisce
- `recurring_issues` → Problemi ricorrenti (es. "subisce gol su palla inattiva")

Calcolato:
- Automaticamente dopo salvataggio partita: `app/api/supabase/save-match/route.js` e `update-match/route.js` (funzione `calculateTacticalPatterns`)
- Manualmente da API `/api/admin/recalculate-patterns`

---

## 8. SICUREZZA: COSA PROTEGGE COSA

### Autenticazione
- Bearer token obbligatorio su tutte le API
- Token gestito da Supabase Auth
- Scadenza automatica + refresh

### Autorizzazione (RLS)
Ogni tabella ha regole del tipo:
```sql
-- Solo il proprietario può vedere i propri dati
USING (auth.uid() = user_id)
```

Eccezione importante:
- `weekly_goals` → Nessuna policy UPDATE!
- Per aggiornare i task, serve chiamare API (che usa service_role)

### Rate Limiting
Ogni endpoint ha limiti:
- Estrazione dati (OpenAI): 10-15 req/min
- Chat: 30 req/min
- Salvataggi: 20-30 req/min

Implementazione:
- In-memory Map (per utente + endpoint)
- Reset ogni 60 secondi
- Limitazione: su Vercel multi-istanza, ogni istanza ha la sua Map

---

## 9. INTEGRAZIONE OPENAI

### Quando viene chiamata OpenAI?
1. **Estrazione screenshot** (Vision) → Ogni upload foto
2. **Analisi partita** → Dopo upload partita
3. **Chat** → Ogni messaggio utente
4. **Generazione task** (opzionale) → Per task personalizzati

### Costi approssimativi
- Estrazione immagine: $0.01-0.05
- Messaggio chat: $0.001-0.003
- Setup utente completo: ~$0.50-1.50

### Gestione errori
- Retry automatico (3 tentativi)
- Fallback a GPT-4o se modello non disponibile
- Timeout configurabile

---

## 10. COSA PUO' ANDARE STORTO (E COME LO GESTIAMO)

### "La dashboard non carica" (Loading infinito)
**Causa:** Supabase lento o errore
**Soluzione:** Timeout 30s + messaggio errore + retry manuale

### "I task non si aggiornano"
**Causa:** Calcolo asincrono in corso
**Soluzione:** Polling ogni 60s + notifica quando cambia

### "La chat non risponde"
**Causa:** Rate limit OpenAI o errore API
**Soluzione:** Retry 3x + messaggio errore specifico

### "Ho acquistato crediti ma non li vedo"
**Causa:** Race condition su aggiornamento
**Soluzione:** Sistema di somma (non sovrascrittura) + idempotenza su orderId

---

## 11. CHECKLIST PER NUOVO SVILUPPATORE

### Prima di toccare il codice
- [ ] Leggere `docs/ODIT_CODEX.md` per problematiche note
- [ ] Verificare `.env.local` abbia tutte le variabili
- [ ] Fare backup del branch prima di modifiche

### Quando aggiungi una feature
- [ ] Aggiungere rate limiting se è API
- [ ] Verificare RLS se è tabella nuova
- [ ] Non loggare PII in produzione
- [ ] Testare sia IT che EN

### Quando fai debug
- [ ] Console browser → vedi log (solo dev)
- [ ] Network tab → vedi chiamate API
- [ ] Supabase Dashboard → vedi dati reali
- [ ] Vercel Logs → vedi errori server

---

## 12. GLOSSARIO

| Termine | Significato |
|---------|-------------|
| **RLS** | Row Level Security (politiche accesso Supabase) |
| **Service Role** | Chiave Supabase con super-poteri (solo server) |
| **RAG** | Retrieval Augmented Generation (contesto per AI) |
| **is_home** | Boolean: utente era in casa o trasferta? |
| **slot_index** | Posizione giocatore: 0-10 titolare, NULL riserva |
| **Hero Points** | Nome "fantasy" dei crediti AI |
| **AI Knowledge** | Quanto l'IA conosce l'utente (0-100%) |
| **Mojibake** | Caratteri corrotti per encoding sbagliato |

---

**FINE PANORAMICA**

Per dettagli tecnici approfonditi, vedere `docs/BRIEFING_PROGRAMMATORE.md`.
