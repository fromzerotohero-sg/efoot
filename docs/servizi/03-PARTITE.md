# Servizio: Gestione Partite (Matches)

**Salvataggio, analisi, pattern tattici**

---

## 1. Overview

| Aspect | Dettaglio |
|--------|-----------|
| **Entità** | Partite (matches), Pattern tattici (team_tactical_patterns) |
| **Dati raccolti** | Avversario, risultato, formazione, statistiche screenshot |
| **Analisi** | AI genera riassunto + consigli |
| **Trigger** | Salvataggio partita → aggiornamento pattern automatico |

---

## 2. Flusso Dati

### 2.1 Salvataggio Partita
```
Utente → Form (avversario, risultato, formazione)
    ↓
Upload screenshot (opzionale): voti, stats, zone attacco
    ↓
POST /api/supabase/save-match
    ↓
INSERT INTO matches
    ↓
TRIGGER: calculateTacticalPatterns()
    ↓
UPDATE team_tactical_patterns
    ↓
Ricalcolo AI Knowledge Score (+25% partite, +15% pattern)
    ↓
Evento: 'match-saved' → Frontend aggiorna AI Knowledge Bar
```

### 2.2 Analisi Partita
```
Utente → Click "Analizza" su partita salvata
    ↓
POST /api/analyze-match
    ↓
Build context: rosa + partita + pattern + RAG
    ↓
OpenAI GPT-4o (temperature 0.2)
    ↓
Generazione: punti di forza, debolezze, consigli
    ↓
UPDATE matches SET ai_summary = '...'
    ↓
Visualizzazione risultato
```

---

## 3. Componenti

### 3.1 Frontend

#### MatchForm (`app/match/new/page.jsx`)
```javascript
export default function NewMatchPage() {
  const [formData, setFormData] = useState({
    opponent_name: '',
    result: '',
    formation_played: '4-3-3',
    is_home: true,
    player_ratings: {},
    team_stats: {},
    attack_areas: {},
    ball_recovery_zones: []
  })
  
  const handleSave = async () => {
    await fetch('/api/supabase/save-match', {
      method: 'POST',
      body: JSON.stringify(formData)
    })
  }
}
```

#### MatchDetail (`app/match/[id]/page.jsx`)
- Visualizzazione dati partita
- Sezione "Analisi AI" (se generata)
- Bottone "Analizza con AI" (costo: 4 HP)

### 3.2 Backend

#### Salvataggio (`app/api/supabase/save-match/route.js`)
```javascript
export async function POST(req) {
  const { userId } = await authenticate(req)  // Da JWT
  const body = await req.json()
  
  // Validazione
  if (!body.opponent_name || !body.result) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }
  
  // Insert
  const { data: match, error } = await admin
    .from('matches')
    .insert({
      user_id: userId,
      opponent_name: body.opponent_name,
      result: body.result,
      formation_played: body.formation_played,
      playing_style_played: body.playing_style_played,
      is_home: body.is_home,
      player_ratings: body.player_ratings,
      team_stats: body.team_stats,
      attack_areas: body.attack_areas,
      ball_recovery_zones: body.ball_recovery_zones,
      data_completeness: calculateCompleteness(body)
    })
    .select()
    .single()
  
  // Trigger automatico aggiorna pattern
  
  return NextResponse.json({ success: true, match })
}
```

#### Calcolo Pattern (`lib/tacticalPatterns.js`)
```javascript
export async function calculateTacticalPatterns(userId, admin) {
  // Recupera ultime 20 partite (finestra per pattern)
  const { data: matches } = await admin
    .from('matches')
    .select('formation_played, playing_style_played, result')
    .eq('user_id', userId)
    .order('match_date', { ascending: false })
    .limit(20)
  
  // Aggregazione formazioni
  const formationUsage = {}
  matches.forEach(m => {
    if (!formationUsage[m.formation_played]) {
      formationUsage[m.formation_played] = { 
        matches: 0, wins: 0, losses: 0, draws: 0 
      }
    }
    formationUsage[m.formation_played].matches++
    
    if (isWin(m.result)) formationUsage[m.formation_played].wins++
    else if (isLoss(m.result)) formationUsage[m.formation_played].losses++
    else formationUsage[m.formation_played].draws++
  })
  
  // Calcolo win rate
  Object.keys(formationUsage).forEach(f => {
    const stats = formationUsage[f]
    stats.win_rate = stats.matches > 0 ? stats.wins / stats.matches : 0
  })
  
  // Upsert patterns
  await admin
    .from('team_tactical_patterns')
    .upsert({
      user_id: userId,
      formation_usage: formationUsage,
      playing_style_usage: styleUsage,
      last_50_matches_count: matches.length,
      last_updated: new Date().toISOString()
    })
}
```

---

## 4. API Routes

| Route | Metodo | Scopo | Costo HP |
|-------|--------|-------|----------|
| `/api/supabase/save-match` | POST | Crea partita | 0 (base) / 2-10 (con screenshot) |
| `/api/supabase/update-match` | PATCH | Aggiorna partita | 0 |
| `/api/supabase/delete-match` | DELETE | Elimina partita | 0 |
| `/api/analyze-match` | POST | Analisi AI partita | 4 |
| `/api/extract-match-data` | POST | Estrazione dati da foto | 3 |

---

## 5. Database

### 5.1 Tabella Matches
```sql
CREATE TABLE matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Dati base
  opponent_name VARCHAR(100) NOT NULL,
  result VARCHAR(20) NOT NULL,           -- "2-1", "W", "L", "D"
  match_date DATE DEFAULT CURRENT_DATE,
  is_home BOOLEAN DEFAULT true,
  
  -- Formazione usata
  formation_played VARCHAR(20),
  playing_style_played VARCHAR(30),
  opponent_formation_id UUID REFERENCES opponent_formations(id),
  
  -- Dati estratti da screenshot (opzionali)
  player_ratings JSONB,                  -- {cliente: {...}, avversario: {...}}
  team_stats JSONB,                      -- {possesso: 55, tiri: 12, ...}
  attack_areas JSONB,                    -- {left: 30, center: 40, right: 30}
  ball_recovery_zones JSONB,             -- Array coordinate
  photos_uploaded INTEGER DEFAULT 0,     -- Numero sezioni caricate (0-5)
  data_completeness VARCHAR(20) DEFAULT 'partial', -- 'complete' | 'partial'
  
  -- AI generated
  ai_summary TEXT,                       -- Riassunto analisi AI
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indici
CREATE INDEX idx_matches_user_date ON matches(user_id, match_date DESC);
CREATE INDEX idx_matches_completeness ON matches(user_id, data_completeness);
```

### 5.2 Tabella Team Tactical Patterns
```sql
CREATE TABLE team_tactical_patterns (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Pattern calcolati automaticamente
  formation_usage JSONB DEFAULT '{}',      -- {"4-3-3": {matches: 10, wins: 6, ...}}
  playing_style_usage JSONB DEFAULT '{}',
  recurring_issues JSONB DEFAULT '[]',     -- Array issue identificate
  attack_areas_avg JSONB DEFAULT '{}',     -- Medie zone attacco
  recovery_zones_avg JSONB DEFAULT '{}',   -- Medie zone recupero
  
  last_50_matches_count INTEGER DEFAULT 0,  -- N partite considerate (max 20; nome colonna legacy)
  last_updated TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 6. Sicurezza

### 6.1 RLS
```sql
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users CRUD own matches"
  ON matches FOR ALL
  USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users view own patterns"
  ON team_tactical_patterns FOR ALL
  USING ((SELECT auth.uid()) = user_id);
```

### 6.2 Validazione Risultato
```javascript
function validateResult(result) {
  // Formati accettati: "2-1", "W", "L", "D", "Vittoria", "Sconfitta"
  const scorePattern = /^\d+-\d+$/
  const resultPattern = /^[WLDVSA]$/i
  
  return scorePattern.test(result) || resultPattern.test(result)
}
```

---

## 7. Integrazioni

### 7.1 Con Palestra Coach
Dopo ogni partita, l'utente può:
1. Andare in Palestra Coach
2. Dare feedback sui consigli seguiti
3. L'AI apprende per consigli futuri

### 7.2 Con AI Knowledge Score
```javascript
// Componenti score da partite
function calculateMatchesScore(matchesCount) {
  // Max 25% con ~20 partite
  return Math.min(25, (matchesCount / 20) * 25)
}

function calculatePatternsScore(patterns) {
  // Max 15% con pattern stabili
  const hasPatterns = patterns?.formation_usage && 
                     Object.keys(patterns.formation_usage).length > 0
  return hasPatterns ? 15 : 0
}
```

---

**Ultimo aggiornamento:** 14/02/2026
