# Gattilio27 - Guida per Programmatori

**Struttura completa delle sezioni e come sono gestite nel codice**

---

## 1. AUTENTICAZIONE

### 1.1 Login (`/app/login/page.jsx`)

**Cosa fa:**
- Login esistente + Registrazione nuovo utente (toggle `mode`)
- Form email/password con validazione client
- Cooldown anti brute-force (60s dopo tentativi falliti)
- Redirect post-login alla dashboard

**Flusso dati:**
```
Utente → Supabase Auth (signInWithPassword / signUp)
     ↓
Session JWT → localStorage (gestita da supabaseClient)
     ↓
Redirect a / (dashboard)
```

**Punti chiave:**
- Usa `supabase.auth.signUp()` con `emailRedirectTo` per conferma email
- Password min 6 caratteri
- Gestione errori: messaggi tradotti via `t()`
- UI: stile "neon" con CSS inline (no Tailwind)

### 1.2 Forgot Password (`/app/forgot-password/page.jsx`)

**Cosa fa:**
- Invio link reset password via Supabase Auth
- Cooldown 60s tra invii (anti-spam)
- Messaggio generico "Se l'email esiste..." (anti-enumerazione)

### 1.3 Reset Password (`/app/reset-password/page.jsx`)

**Cosa fa:**
- Legge token dalla query string (`?token=xxx`)
- Nuova password con conferma
- Validazione lunghezza

---

## 2. DASHBOARD (`/app/page.jsx`)

**Cosa fa:**
- Home page post-login
- Riepilogo dati utente (stats rosa, partite recenti)
- AI Knowledge Bar (quanto l'IA conosce l'utente)
- Task Widget (obiettivi settimanali)
- Banner setup (coach, rosa, statistiche)
- Pattern tattici (auto-calcolo se mancanti)
- Classifica (posizione mensile)

**Flusso dati:**
```
Dashboard → Supabase (query dirette):
  - formation_layout (modulo impostato)
  - players (tutti i giocatori)
  - matches (ultime 10 partite)
  - team_tactical_patterns (pattern tattici)
  - coaches (allenatore attivo)
     ↓
Se patterns mancanti → POST /api/admin/recalculate-patterns
     ↓
Rendering componenti
```

**Componenti usati:**
- `AIKnowledgeBar` - Barra progresso conoscenza IA
- `TaskWidget` - Task settimanali
- `GameAnalysisModal` - Upload statistiche gioco
- `AiInfoModal` - Info su come funziona l'IA

---

## 3. GESTIONE FORMAZIONE (`/app/gestione-formazione/page.jsx`)

**Cosa fa:**
- Campo da calcio 2D con 11 slot (0-10)
- Drag & drop giocatori tra slot e riserve
- Upload nuovi giocatori da screenshot
- Cambio modulo (4-3-3, 4-2-3-1, etc)
- Impostazioni tattiche (istruzioni individuali)
- Modalità edit posizioni custom

**Stato principale:**
```javascript
const [layout, setLayout] = useState(null)           // { formation, slot_positions }
const [titolari, setTitolari] = useState([])         // slot_index 0-10
const [riserve, setRiserve] = useState([])           // slot_index NULL
const [tacticalSettings, setTacticalSettings] = useState(null)
const [selectedSlot, setSelectedSlot] = useState(null)  // Per assegnazione
```

**Flusso operazioni:**

**A) Caricamento dati:**
```
GET formation_layout → modulo e posizioni slot
GET players → separa titolari/riserve
GET coaches (is_active = true) → allenatore
GET team_tactical_settings → istruzioni tattiche
```

**B) Upload nuovo giocatore:**
```
File immagine → FileReader (base64)
     ↓
POST /api/extract-player (OpenAI Vision)
     ↓
POST /api/supabase/save-player (con dati estratti)
     ↓
Aggiorna stato locale
```

**C) Assegna riserva a slot:**
```
Click slot vuoto → seleziona riserva
     ↓
POST /api/supabase/assign-player-to-slot
     ↓
Update stato locale (ottimistico)
```

**D) Sposta titolare ↔ riserve:**
```
Drag & drop o click
     ↓
POST /api/supabase/remove-player-from-slot (se sposta in riserve)
  oppure
POST /api/supabase/assign-player-to-slot (se sposta in campo)
```

**Modali usati:**
- `AssignModal` - Seleziona quale riserva mettere in campo
- `PositionSelectionModal` - Seleziona posizione originale del giocatore
- `MissingDataModal` - Dati mancanti nell'estrazione
- `ConfirmModal` - Conferma azioni (sostituisci, elimina, etc)
- `RosaTutorialModal` - Tutorial primo accesso

---

## 4. DETTAGLIO GIOCATORE (`/app/giocatore/[id]/page.jsx`)

**Cosa fa:**
- Visualizza dati completi di un giocatore
- Upload foto aggiuntive (stats, skills, booster)
- Mostra statistiche estratte dalle foto
- Gestione completamento dati

**Parametro URL:** `params.id` (UUID giocatore)

**Flusso:**
```
params.id → GET players WHERE id = params.id
     ↓
Se playing_style_id → GET playing_styles (nome stile)
     ↓
Visualizzazione
```

**Upload foto aggiuntive:**
- `type: 'stats'` → statistiche base (velocità, tiro, etc)
- `type: 'skills'` → abilità speciali
- `type: 'booster'` → booster applicati

Ogni upload → `POST /api/extract-player` → aggiorna dati esistenti

---

## 5. LISTA GIOCATORI (`/app/lista-giocatori/page.jsx`)

**Cosa fa:**
- Vista tabellare di tutti i giocatori
- Filtri per posizione, overall, stato
- Ricerca per nome
- Azioni rapide (elimina, modifica)

---

## 6. CONTROMISURE LIVE (`/app/contromisure-live/page.jsx`)

**Cosa fa:**
- Upload screenshot formazione avversaria
- Estrazione dati (modulo, stile, giocatori)
- Generazione contromisure tattiche via AI
- Visualizzazione analisi completa

**Flusso:**
```
Upload immagine formazione avversaria
     ↓
POST /api/extract-formation (OpenAI Vision)
     ↓
POST /api/supabase/save-opponent-formation
     ↓
POST /api/generate-countermeasures (AI)
     ↓
Visualizzazione risultati:
  - Analisi formazione avversaria
  - Contromisure tattiche (priorità alta/media/bassa)
  - Suggerimenti giocatori
  - Istruzioni individuali
  - Warnings
```

**Struttura risposta contromisure:**
```javascript
{
  analysis: {
    opponent_formation_analysis: "...",
    is_meta_formation: true,
    strengths: [...],
    weaknesses: [...]
  },
  countermeasures: {
    formation_adjustments: [...],
    tactical_adjustments: [...],
    player_suggestions: [...],
    individual_instructions: [...]
  },
  warnings: [...],
  confidence: 85
}
```

---

## 7. MATCH - NUOVA PARTITA (`/app/match/new/page.jsx`)

**Cosa fa:**
- Wizard 5 step per registrare una partita
- Persistenza in localStorage (non perde dati)
- Estrazione dati da screenshot per ogni step

**Steps:**
1. **Home/Away** - Casa o trasferta (`is_home` boolean)
2. **Player Ratings** - Voti giocatori
3. **Team Stats** - Statistiche squadra (possesso, tiri, etc)
4. **Attack Areas** - Zone attacco
5. **Ball Recovery Zones** - Zone recupero palla
6. **Formation/Style** - Modulo e stile usato

**Flusso step:**
```
Seleziona step → Upload screenshot
     ↓
POST /api/extract-match-data (sezione specifica)
     ↓
Salva in stepData[stepId]
     ↓
Prossimo step o Salva tutto
```

**Salvataggio finale:**
```
Tutti gli step completati
     ↓
POST /api/supabase/save-match
  body: {
    opponent_name,
    is_home,
    result,
    team_stats: { ... },
    player_ratings: { ... },
    match_date,
    extracted_data: { ... }
  }
     ↓
Redirect a /match/[id] (dettaglio)
```

---

## 8. MATCH - DETTAGLIO (`/app/match/[id]/page.jsx`)

**Cosa fa:**
- Visualizza partita salvata
- Statistiche con grafici
- Voti giocatori
- Analisi AI
- Azioni: modifica, elimina, analizza

**Flusso:**
```
params.id → GET matches WHERE id = params.id
     ↓
Visualizzazione dati
     ↓
Azioni:
  - Modifica → redirect a /match/new?edit=[id]
  - Elimina → DELETE /api/supabase/delete-match
  - Analisi → POST /api/analyze-match
```

---

## 9. ALLENATORI (`/app/allenatori/page.jsx`)

**Cosa fa:**
- Lista allenatori caricati
- Visualizzazione competenze (stili di gioco)
- Switch allenatore attivo
- Upload nuovo allenatore da screenshot

**Flusso upload allenatore:**
```
Upload screenshot
     ↓
POST /api/extract-coach (OpenAI Vision)
     ↓
POST /api/supabase/save-coach
     ↓
Aggiorna lista
```

**Switch allenatore attivo:**
```
Click "Attiva" su un allenatore
     ↓
POST /api/supabase/set-active-coach
  body: { coach_id }
     ↓
Backend: setta is_active = true per questo, false per altri
```

---

## 10. GESTIONE PROFILO (`/app/gestione-profilo/page.jsx`)

**Cosa fa:**
- Visualizza profilo utente completo
- AI Knowledge Score (dettaglio)
- Breakdown conoscenza IA per categoria
- Task completati storico
- Classifica

**Componenti principali:**
- `AIKnowledgeBar` - Score principale
- Lista task completati
- Sezione premi/classifica

---

## 11. IMPOSTAZIONI PROFILO (`/app/impostazioni-profilo/page.jsx`)

**Cosa fa:**
- Modifica dati profilo
- Nome, cognome, squadra, divisione
- Squadra del cuore
- Primo setup obbligatorio per nuovi utenti

**Validazione:**
- Campi obbligatori: nome, squadra, divisione
- Redirect forzato a questa pagina se profilo incompleto

---

## 12. CLASSIFICA (`/app/classifica/page.jsx`)

**Cosa fa:**
- Classifica mensile "From Zero to Hero"
- Punteggio basato su: partite, task, utilizzo
- Posizione utente corrente
- Giorni rimanenti al termine mese

**Flusso:**
```
GET /api/leaderboard
     ↓
Rendering lista
```

---

## 13. GUIDA (`/app/guida/page.jsx`)

**Cosa fa:**
- Documentazione utente integrata
- Spiegazione funzionalità
- FAQ
- Tutorial interattivi

---

## 14. COMPONENTI CONDIVISI GLOBALI

### 14.1 AssistantChat (`/components/AssistantChat.jsx`)

**Posizione:** Widget fisso in basso a destra (tutte le pagine)

**Cosa fa:**
- Chat con AI Coach
- Contesto personalizzato (rosa, partite, pattern)
- Suggerimenti rapidi (3 pillole cliccabili)
- Storia conversazione (max 10 messaggi)

**Flusso messaggio:**
```
Utente scrive messaggio
     ↓
POST /api/assistant-chat
  body: {
    message,
    page_context,  // "dashboard", "gestione-formazione", etc
    history,       // ultimi 10 messaggi
    language       // IT/EN
  }
     ↓
Risposta AI + 3 suggerimenti
```

### 14.2 CreditsBar (`/components/CreditsBar.jsx`)

**Posizione:** Header (tutte le pagine)

**Cosa fa:**
- Mostra crediti usati / inclusi (default 200/mese)
- Polling ogni 45s per aggiornamento
- Evento `credits-consumed` per refresh immediato

**Flusso:**
```
POST /api/credits/usage (con Bearer token)
     ↓
Risposta: { period_key, credits_used, credits_included, ... }
     ↓
Visualizzazione barra progresso
```

### 14.3 TaskWidget (`/components/TaskWidget.jsx`)

**Posizione:** Dashboard (e altre pagine se necessario)

**Cosa fa:**
- Mostra 3 task settimanali attivi
- Progress bar per ogni task
- Auto-generazione task se mancanti

**Flusso:**
```
GET /api/tasks/list
     ↓
Se non ci sono task attivi → generazione automatica
     ↓
Visualizzazione
```

---

## 15. API ENDPOINTS - REFERENCE

### 15.1 Estrazione Dati (OpenAI Vision)

| Endpoint | Input | Output |
|----------|-------|--------|
| `POST /api/extract-player` | `{ imageDataUrl }` | `{ player_name, position, overall_rating, base_stats, ... }` |
| `POST /api/extract-coach` | `{ imageDataUrl }` | `{ coach_name, age, nationality, playing_styles, ... }` |
| `POST /api/extract-formation` | `{ imageDataUrl }` | `{ formation, playing_style, players[], tactical_style, ... }` |
| `POST /api/extract-match-data` | `{ imageDataUrl, section }` | Dati specifici per sezione |

### 15.2 AI/Analisi

| Endpoint | Input | Output |
|----------|-------|--------|
| `POST /api/assistant-chat` | `{ message, page_context, history, language }` | `{ response, suggestions[], credits_used }` |
| `POST /api/analyze-match` | `{ match_id }` | `{ analysis, insights }` |
| `POST /api/generate-countermeasures` | `{ opponent_formation_id, language }` | `{ countermeasures, confidence }` |

### 15.3 Crediti

| Endpoint | Input | Output |
|----------|-------|--------|
| `GET /api/credits/usage` | Bearer token | `{ period_key, credits_used, credits_included, ... }` |

### 15.4 Operazioni DB (Supabase)

| Endpoint | Operazione |
|----------|------------|
| `POST /api/supabase/save-profile` | Upsert user_profiles |
| `POST /api/supabase/save-player` | Insert/Update players |
| `POST /api/supabase/save-coach` | Insert coaches |
| `POST /api/supabase/save-match` | Insert/Update matches |
| `POST /api/supabase/delete-player` | Delete + cleanup |
| `POST /api/supabase/delete-match` | Delete match |
| `POST /api/supabase/assign-player-to-slot` | Aggiorna slot_index |
| `POST /api/supabase/remove-player-from-slot` | Set slot_index = NULL |
| `POST /api/supabase/set-active-coach` | Cambia allenatore attivo |
| `POST /api/supabase/save-opponent-formation` | Salva formazione avversaria |
| `POST /api/supabase/save-tactical-settings` | Salva impostazioni tattiche |

---

## 16. AUTENTICAZIONE JWT - PATTERN STANDARD

Ogni API richiede Bearer token:

```javascript
// Client-side pattern
const { data: session } = await supabase.auth.getSession()
const token = session?.session?.access_token

const res = await fetch('/api/xyz', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({ ... })
})
```

**Server-side validation:**
```javascript
// In ogni route.js
import { validateToken } from '@/lib/supabaseClient'

const { userId, error } = await validateToken(req)
if (error) return NextResponse.json({ error }, { status: 401 })
```

---

## 17. GESTIONE ERRORI - PATTERN STANDARD

```javascript
// Client-side
try {
  const res = await fetch('/api/xyz', { ... })
  if (!res.ok) {
    const data = await res.json()
    throw new Error(data.error || 'Errore generico')
  }
  const data = await res.json()
  // Successo
} catch (err) {
  setError(err.message)
} finally {
  setLoading(false)
}

// Server-side
if (error) {
  console.error('[Endpoint] Error:', error)
  return NextResponse.json({ error: error.message }, { status: 500 })
}
```

---

## 18. I18N - TRADUZIONI

Tutte le pagine usano:
```javascript
import { useTranslation } from '@/lib/i18n'
const { t, lang } = useTranslation()

// Uso
t('chiaveTraduzione')
t('chiaveConParametri', { nome: 'Mario' })
```

Le traduzioni sono in `lib/i18n.js` (oggetto con chiavi IT/EN).

---

**Fine guida.** Per dettagli implementativi specifici, vedere il codice sorgente dei file indicati.
