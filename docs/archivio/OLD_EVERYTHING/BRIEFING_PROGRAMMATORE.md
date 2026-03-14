# BRIEFING TECNICO - eFootball AI Coach

**Data:** 10 Febbraio 2026  
**Destinatario:** Programmatore  
**Scopo:** Spiegazione architettura, tecnologie e stato progetto

---

## 1. PANORAMICA DEL PROGETTO

### Cos'è
Un'applicazione web per coach di eFootball (gioco calcistico) che permette ai giocatori di:
- Caricare screenshot delle card giocatori e estrarre dati automaticamente con AI
- Gestire la rosa (formazione titolari e riserve)
- Analizzare partite e ricevere consigli tattici personalizzati
- Completare task settimanali generati dall'IA
- Monitorare il "livello di conoscenza" che l'IA ha del giocatore

### Per chi
Giocatori di eFootball che vogliono migliorare le proprie performance attraverso l'analisi dati e i consigli AI.

---

## 2. STACK TECNOLOGICO

### Frontend
- **Next.js 14** con App Router (React framework)
- **React 18** (libreria UI)
- **CSS vanilla** (no framework CSS, stili custom)
- **Lucide React** (icone)

### Backend
- **Next.js API Routes** (serverless, ogni file in `app/api/*` è un endpoint)
- **Supabase** (PostgreSQL + Auth)
- **OpenAI GPT-4o Vision** (estrazione dati da screenshot)

### Deploy
- **Vercel** (hosting Next.js, serverless)

### Database
- **PostgreSQL** via Supabase
- **RLS** (Row Level Security) abilitato su tutte le tabelle

---

## 3. STRUTTURA DEL PROGETTO

```
app/                          # Next.js App Router
├── page.jsx                  # Dashboard principale (home)
├── layout.jsx                # Layout globale con provider (JSX, non TSX per evitare conflitti)
├── api/                      # API Routes (backend)
│   ├── extract-player/       # Estrazione dati giocatore da screenshot
│   ├── extract-formation/    # Estrazione formazione avversaria
│   ├── extract-match-data/   # Estrazione dati partita
│   ├── assistant-chat/       # Chat AI con RAG
│   ├── analyze-match/        # Analisi post-partita
│   ├── credits/              # Gestione crediti
│   ├── leaderboard/          # Classifica mensile
│   └── supabase/             # Endpoint per operazioni DB
│       ├── save-player/
│       ├── save-match/
│       ├── save-profile/
│       └── ...
├── gestione-formazione/      # Pagina principale (campo 2D)
├── match/
│   ├── new/                  # Wizard upload partita
│   └── [id]/                 # Dettaglio partita
├── giocatore/[id]/           # Dettaglio giocatore
├── allenatori/               # Gestione allenatori
├── gestione-profilo/         # Profilo utente e premi
├── impostazioni-profilo/     # Impostazioni (sfondo, etc)
├── classifica/               # Classifica mensile
└── ... (altre pagine)

components/                   # Componenti React condivisi
├── AssistantChat.jsx         # Widget chat AI
├── CreditsBar.jsx            # Barra crediti in alto
├── AIKnowledgeBar.jsx        # Indicatore conoscenza IA
├── TaskWidget.jsx            # Widget task settimanali
└── ... (modali, etc)

**Nota:** Feature "sfondo personalizzabile" rimossa in data 10/02/2026 per problemi di caricamento.

lib/                          # Librerie e utility
├── supabaseClient.js         # Client Supabase (browser)
├── authHelper.js             # Helper autenticazione API
├── creditService.js          # Logica crediti
├── taskHelper.js             # Logica task
├── aiKnowledgeHelper.js      # Calcolo score conoscenza IA
├── rateLimiter.js            # Rate limiting in-memory
├── i18n.js                   # Traduzioni IT/EN
└── ragHelper.js              # RAG per chat AI

migrations/                   # Migrazioni SQL
├── create_weekly_goals_table.sql
├── create_user_credit_usage.sql
└── ...

public/                       # Asset statici
└── backgrounds/              # Sfondi app
```

---

## 4. FLUSSI PRINCIPALI

### 4.1 Onboarding Utente
1. **Login** (`/login`) → Supabase Auth
2. **Completa profilo** (`/impostazioni-profilo`) → Nome, squadra, divisione, etc.
3. **Aggiungi giocatori** (`/gestione-formazione`)
   - Upload screenshot card giocatore
   - AI estrae: nome, overall, posizione, stats, abilità
   - Salva in DB
4. **Dashboard** mostra: rosa, task, conoscenza IA, crediti

### 4.2 Upload Partita
1. **Wizard** (`/match/new`) in 5 step:
   - Casa/Trasferta
   - Info generali (avversario, risultato)
   - Foto statistiche
   - Foto giocatori (voti)
   - Analisi AI
2. Dati salvati in `matches`
3. Task aggiornati automaticamente
4. Pattern tattici calcolati

### 4.3 Chat AI
1. Utente scrive messaggio
2. Sistema recupera:
   - Contesto personale (rosa, partite, allenatore)
   - RAG (regole eFootball da `info_rag.md`)
3. Prompt inviato a OpenAI
4. Risposta mostrata con suggerimenti cliccabili

### 4.4 Crediti (Sistema "Hero Points")
- Ogni operazione AI costa crediti
- Default: 200 crediti/mese
- Acquistabili pacchetti aggiuntivi
- Tracciamento mensile per utente

---

## 5. TABELLE DATABASE PRINCIPALI

### `auth.users` (Supabase)
- Gestita da Supabase Auth
- Login email/password

### `user_profiles`
- `user_id` (FK auth.users)
- `first_name`, `last_name`
- `current_division`, `favorite_team`
- `ai_knowledge_score`, `ai_knowledge_level`
- `background_key` (sfondo app scelto)

### `players`
- `user_id`, `player_name`, `position`
- `overall_rating`, `base_stats` (JSON)
- `skills`, `com_skills`, `ai_playstyles`
- `slot_index` (0-10 titolare, NULL riserva)
- `photo_slots` (tracciamento foto caricate)

### `matches`
- `user_id`, `opponent_name`, `result`
- `match_date`, `is_home` (boolean)
- `team_stats` (possesso, tiri, etc)
- `data_completeness` (complete/partial)

### `weekly_goals`
- `user_id`, `goal_type`, `goal_description`
- `target_value`, `current_value`
- `status` (active/completed/failed)
- `week_start_date`, `week_end_date`

### `user_credit_usage`
- `user_id`, `period_key` (YYYY-MM)
- `credits_used`, `credits_included`

### `coaches`
- `user_id`, `coach_name`, `is_active`
- `playing_style_competence` (JSON)

### `formation_layout`
- `user_id`, `formation` (es. "4-3-3")
- `slot_positions` (coordinate x,y per slot)

---

## 6. SICUREZZA IMPLEMENTATA

### Autenticazione
- **Bearer token** su tutte le API
- **Supabase Auth** per sessioni
- **Service Role Key** solo server-side (mai esposta)

### Autorizzazione (RLS)
- Tutte le tabelle hanno RLS attivo
- Policy SELECT/INSERT/DELETE per propri dati
- **UPDATE rimossa da `weekly_goals`** (solo backend può aggiornare)

### Rate Limiting
- In-memory Map per endpoint
- Limiti: extract-player 15/min, chat 30/min, etc.
- **Nota:** Su Vercel multi-istanza è debole (accettabile per MVP)

### Protezione Dati
- Log PII condizionati a `NODE_ENV !== 'production'`
- Validazione input su tutte le API
- Dimensione immagini limitata (10MB)

---

## 7. INTEGRAZIONE OPENAI

### Endpoint che usano OpenAI
1. `/api/extract-player` - Estrazione dati da screenshot card
2. `/api/extract-formation` - Estrazione formazione avversaria
3. `/api/extract-match-data` - Estrazione stats partita
4. `/api/assistant-chat` - Chat con consigli
5. `/api/analyze-match` - Riassunto post-partita

### Costi
- ~$0.01-0.05 per immagine (Vision)
- ~$0.001 per messaggio chat
- Setup iniziale: ~$0.50-1.50 per utente

---

## 8. STATO ATTUALE (POST-FIX)

### ✅ Completato e Testato
| Funzionalità | Stato |
|--------------|-------|
| Autenticazione | ✅ Funzionante |
| Upload giocatori + AI | ✅ Funzionante |
| Gestione rosa (campo 2D) | ✅ Funzionante |
| Upload partite | ✅ Funzionante |
| Task settimanali | ✅ Funzionante (con is_home) |
| Chat AI | ✅ Funzionante |
| Crediti | ✅ Funzionante (somma corretta) |
| Classifica | ✅ Funzionante |
| Sfondo personalizzabile | ❌ Rimosso (problemi caricamento) |

### 🔧 Fix Applicati Recentemente
1. **Rate limiting** su tutti gli endpoint critici
2. **RLS weekly_goals** - Policy UPDATE rimossa
3. **Log PII** - Protetti in produzione
4. **Crediti** - Acquisti multipli sommano (non sovrascrivono)
5. **Task is_home** - Calcolo corretto per trasferta
6. **AI Knowledge** - Usa campo corretto `overall_rating`
7. **max_tokens** - Aumentato a 800 (no troncature)
8. **Encoding UTF-8** - Corretto in assistant-chat

### ⚠️ Note per Produzione
- Rate limiter in-memory: va bene per inizio, ma per scalare serve Redis
- Monitorare costi OpenAI (max_tokens aumentato)
- Verificare che email (recupero password) funzionino con SMTP configurato

---

## 9. COMANDI UTILI

```bash
# Sviluppo locale
npm run dev

# Build produzione
npm run build

# Linting
npm run lint
```

### Variabili d'ambiente richieste
```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
OPENAI_API_KEY=
NEXT_PUBLIC_APP_URL=
```

---

## 10. DOMANDE FREQUENTI PER IL PROGRAMMATORE

**Q: Perché Next.js 14 e non versione più recente?**
A: Stabilità. Next 15 ha cambiamenti significativi, meglio aspettare.

**Q: Perché rate limiter in-memory e non Redis?**
A: Per MVP è sufficiente. Redis richiede setup aggiuntivo (Upstash/Redis Cloud).

**Q: Come funziona il RAG nella chat AI?**
A: File `info_rag.md` caricato in memoria, sezioni rilevanti estratte per contesto.

**Q: Cosa succede se OpenAI cambia API?**
A: Monitorare changelog. response_format rimosso per compatibilità futura.

**Q: Posso modificare lo schema DB?**
A: Sì, crea migration in `migrations/` ed esegui su Supabase.

---

## 11. CONTATTI E RISORSE

- **Supabase Dashboard:** https://supabase.com/dashboard
- **Vercel Dashboard:** https://vercel.com/dashboard
- **OpenAI Platform:** https://platform.openai.com
- **Documentazione ODIT:** `docs/ODIT_CODEX.md`
- **Stato Progetto:** `docs/STATO_PROGETTO.md`

---

**FINE BRIEFING**

Per qualsiasi dubbio, consultare i documenti in `docs/` o il codice sorgente commentato.
