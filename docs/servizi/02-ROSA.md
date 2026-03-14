# Servizio: Gestione Rosa (Players)

**CRUD giocatori, formazione, statistiche**

---

## 1. Overview

| Aspect | Dettaglio |
|--------|-----------|
| **Entità** | Giocatori (players), Formazione (formation_layout) |
| **Titolari** | 11 slot (0-10) |
| **Riserve** | Fino a 12 (slot_index = NULL) |
| **Metodi aggiunta** | Upload foto AI, Manuale, Import JSON |

---

## 2. Flusso Dati

### 2.1 Aggiunta Giocatore (Upload Foto)
```
Utente → Seleziona slot → Upload 3 foto (card, stats, skills)
    ↓
POST /api/extract-player (Vision AI)
    ↓
Estrazione dati (nome, overall, posizioni, skills)
    ↓
POST /api/supabase/save-player
    ↓
INSERT INTO players
    ↓
UPDATE formation_layout (se slot specificato)
    ↓
Ricalcolo AI Knowledge Score (+25% quando rosa completa)
```

### 2.2 Formazione Tattica
```
Utente → Drag & drop giocatori nello slot
    ↓
POST /api/supabase/assign-player-to-slot
    ↓
UPDATE players SET slot_index = X WHERE id = player_id
    ↓
Aggiornamento campo 2D visivo
```

### 2.3 Modifica Statistiche
```
Utente → Click giocatore → Form modifica
    ↓
POST /api/supabase/save-player (update)
    ↓
UPDATE players SET overall_rating = X, skills = Y...
    ↓
Trigger: aggiorna player_performance_aggregates
```

---

## 3. Componenti

### 3.1 Frontend

#### FormationBuilder (`app/gestione-formazione/page.jsx`)
```javascript
// Drag & drop giocatori
// Campo 2D con posizioni (x,y) per modulo
// Selezione modulo (4-3-3, 4-2-3-1, etc.)

const modules = {
  '4-3-3': { defenders: 4, midfielders: 3, attackers: 3 },
  '4-2-3-1': { defenders: 4, midfielders: 2, attackers: 3, forward: 1 },
  // ... altri
}
```

#### PlayerCard (`components/PlayerCard.jsx`)
```javascript
export default function PlayerCard({ player, onClick, isStarter }) {
  return (
    <div className={`player-card ${isStarter ? 'starter' : 'reserve'}`}>
      <img src={player.card_image || '/placeholder.png'} />
      <div className="player-info">
        <span className="name">{player.player_name}</span>
        <span className="rating">{player.overall_rating}</span>
        <span className="position">{player.position}</span>
      </div>
    </div>
  )
}
```

#### ManualPlayerModal (`components/ManualPlayerModal.jsx`)
- Form inserimento manuale (senza AI)
- Campi: nome, posizione, overall, skills
- Gratuito (0 HP)

### 3.2 Backend

#### Estrazione AI (`app/api/extract-player/route.js`)
```javascript
export async function POST(req) {
  // 1. Riceve base64 immagini
  const { images } = await req.json()
  
  // 2. Chiama OpenAI Vision
  const response = await openai.chat.completions.create({
    model: 'gpt-4o-vision',
    messages: [{
      role: 'user',
      content: [
        { type: 'text', text: 'Estrai dati giocatore...' },
        { type: 'image_url', image_url: { url: images[0] } },
        { type: 'image_url', image_url: { url: images[1] } },
        { type: 'image_url', image_url: { url: images[2] } }
      ]
    }],
    response_format: { type: 'json_object' }
  })
  
  // 3. Ritorna JSON strutturato
  return NextResponse.json(JSON.parse(response.choices[0].message.content))
}
```

---

## 4. API Routes

| Route | Metodo | Scopo | Costo HP |
|-------|--------|-------|----------|
| `/api/extract-player` | POST | Estrazione dati da foto | 2 |
| `/api/supabase/save-player` | POST | Crea/aggiorna giocatore | 0 |
| `/api/supabase/assign-player-to-slot` | POST | Assegna a slot formazione | 0 |
| `/api/supabase/remove-player-from-slot` | POST | Rimuovi da slot | 0 |
| `/api/supabase/delete-player` | DELETE | Elimina giocatore | 0 |

---

## 5. Database

### 5.1 Tabella Players
```sql
CREATE TABLE players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Dati anagrafici
  player_name VARCHAR(100) NOT NULL,
  position VARCHAR(20),           -- Portiere, DC, DD, etc.
  
  -- Statistiche
  overall_rating INTEGER CHECK (overall_rating BETWEEN 1 AND 99),
  playing_style_id UUID REFERENCES playing_styles(id),
  
  -- Formazione
  slot_index INTEGER CHECK (slot_index BETWEEN 0 AND 10),
  
  -- Abilità (JSON per flessibilità)
  skills JSONB DEFAULT '[]',       -- ["Tiro al volo", "Punizione", ...]
  com_skills JSONB DEFAULT '[]',   -- Abilità COM
  base_stats JSONB DEFAULT '{}',   -- {vel: 85, tir: 78, ...}
  
  -- Metadati
  card_image_url TEXT,
  original_positions JSONB,        -- ["DC", "DCD"] per compatibilità
  form VARCHAR(10) DEFAULT '→',    -- ↑ → ↓
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  UNIQUE(user_id, slot_index) WHERE slot_index IS NOT NULL
);

-- Indici
CREATE INDEX idx_players_user ON players(user_id);
CREATE INDEX idx_players_user_slot ON players(user_id, slot_index);
```

### 5.2 Tabella Formation Layout
```sql
CREATE TABLE formation_layout (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  formation VARCHAR(20) DEFAULT '4-3-3',  -- Modulo tattico
  slot_positions JSONB DEFAULT '{}',       -- {0: {x: 50, y: 90}, ...}
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 5.3 Tabella Playing Styles (lookup)
```sql
CREATE TABLE playing_styles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(50) NOT NULL UNIQUE,  -- "Opportunista", "Regista", ...
  category VARCHAR(30),              -- "Attaccante", "Centrocampista", ...
  description TEXT
);

-- Seed data
INSERT INTO playing_styles (name, category) VALUES
('Opportunista', 'Attaccante'),
('Regista', 'Centrocampista'),
('Anchor', 'Centrocampista'),
('Classic 10', 'Centrocampista'),
('Collante', 'Centrocampista');
```

---

## 6. Sicurezza

### 6.1 RLS
```sql
-- Players: utente vede/modifica solo propri giocatori
ALTER TABLE players ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users CRUD own players"
  ON players FOR ALL
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

-- Formation layout: stesso utente
CREATE POLICY "Users manage own formation"
  ON formation_layout FOR ALL
  USING ((SELECT auth.uid()) = user_id);
```

### 6.2 Validazione Upload
```javascript
// app/api/extract-player/route.js
const MAX_FILE_SIZE = 10 * 1024 * 1024  // 10MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png']

if (image.size > MAX_FILE_SIZE) {
  return NextResponse.json({ error: 'File too large' }, { status: 400 })
}

if (!ALLOWED_TYPES.includes(image.type)) {
  return NextResponse.json({ error: 'Invalid file type' }, { status: 400 })
}
```

---

## 7. AI Knowledge Score

La rosa contribuisce **25%** allo score:

```javascript
// lib/aiKnowledgeHelper.js
function calculateRosterScore(players, formation) {
  let score = 0
  
  // Base: 11 titolari = 15%
  const starters = players.filter(p => p.slot_index !== null)
  score += Math.min(15, (starters.length / 11) * 15)
  
  // Bonus: riserve = 5%
  const reserves = players.filter(p => p.slot_index === null)
  score += Math.min(5, (reserves.length / 10) * 5)
  
  // Bonus: dati completi = 5%
  const complete = players.filter(p => 
    p.overall_rating && 
    p.skills?.length > 0 &&
    p.base_stats
  )
  score += Math.min(5, (complete.length / 11) * 5)
  
  return Math.min(25, score)
}
```

---

## 8. Ottimizzazioni

### 8.1 Lazy Loading Immagini
```javascript
// Usare next/image per ottimizzazione automatica
import Image from 'next/image'

<Image 
  src={player.card_image_url}
  alt={player.player_name}
  width={100}
  height={150}
  loading="lazy"
/>
```

### 8.2 Caching Query
```javascript
// React Query per caching lato client
const { data: players } = useQuery({
  queryKey: ['players', userId],
  queryFn: fetchPlayers,
  staleTime: 5 * 60 * 1000  // 5 minuti
})
```

---

**Ultimo aggiornamento:** 14/02/2026
