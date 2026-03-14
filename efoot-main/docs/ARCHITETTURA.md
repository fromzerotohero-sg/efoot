# Architettura Enterprise — From Zero to Hero

**Prodotto:** From Zero to Hero (eFootball AI Coach)  
**Documentazione Tecnica per Sviluppatori**  
**Versione:** 2.0 Enterprise  
**Data:** 14/02/2026  
**Destinatario:** Team Dev (Tommaso)

---

## 1. Stack Tecnologico

### Core
| Componente | Tecnologia | Versione | Note |
|------------|------------|----------|------|
| Framework | Next.js | 14.x | App Router, React Server Components |
| Runtime | Node.js | 18.x | LTS obbligatorio |
| Language | JavaScript | ES2022 | TypeScript in valutazione |
| Styling | CSS Variables + Tailwind | 3.4 | CSS native preferred per performance |
| Database | PostgreSQL | 15.x | Via Supabase |
| Auth | Supabase Auth | v2 | JWT, PKCE flow |
| AI | OpenAI API | GPT-4o | `response_format: { type: "json_object" }` per structured output |
| Hosting | Vercel | Edge | Serverless functions |

### Integrazioni
- **Stripe**: Pagamenti PCI-DSS compliant
- **Supabase Storage**: Assets (avatar, background)
- **Vercel Analytics**: Web vitals
- **Upstash Redis**: (Opzionale) Rate limiting distribuito

---

## 2. Struttura Progetto

*(Nome prodotto: **From Zero to Hero**. Cartella repo: `gattilio27-master`.)*

```
gattilio27-master/
├── app/                          # Next.js 14 App Router
│   ├── api/                      # API Routes (backend)
│   │   ├── assistant-chat/       # Chat AI principale (temperature 0.25)
│   │   ├── coach-feedback-chat/  # Chat Palestra Coach (blindata)
│   │   ├── save-coach-feedback/  # Persistenza feedback
│   │   ├── analyze-match/        # Analisi partita con AI
│   │   ├── generate-countermeasures/ # Contromisure tattiche (JSON strict)
│   │   ├── leaderboard/          # Classifica pubblica
│   │   ├── refresh-diagnostic/   # Ricalcolo riassunto AI
│   │   └── supabase/             # CRUD diretto tabelle
│   │       ├── save-match/
│   │       ├── save-player/
│   │       ├── save-profile/
│   │       └── ...
│   ├── (routes)/                 # Pagine applicazione
│   │   ├── classifica/
│   │   ├── gestione-formazione/
│   │   ├── giocatore/[id]/
│   │   └── allenatori/
│   ├── layout.jsx                # Root layout (Provider)
│   └── page.jsx                  # Dashboard
├── components/                   # React Components
│   ├── CoachFeedbackChat.jsx     # Palestra Coach (feature principale)
│   ├── AssistantChat.jsx         # Chat widget globale
│   ├── AIKnowledgeBar.jsx        # Barra Conoscenza AI (score %, livello, descrizione). Suggerimenti prioritari nel banner setup.
│   ├── TaskWidget.jsx            # Obiettivi settimanali
│   ├── ManualPlayerModal.jsx     # Inserimento manuale
│   └── ...
├── lib/                          # Business Logic & Helpers
│   ├── aiKnowledgeHelper.js      # Calcolo AI Score (0-100)
│   ├── diagnosticBuilder.js      # Costruzione riassunto contesto
│   ├── countermeasuresHelper.js  # Prompt contromisure (JSON strict)
│   ├── ragHelper.js              # Retrieval info_rag.md
│   ├── creditService.js          # Gestione Hero Points
│   ├── taskHelper.js             # Logica obiettivi
│   ├── i18n.js                   # Internazionalizzazione (IT/EN)
│   ├── authHelper.js             # Validazione JWT
│   ├── rateLimiter.js            # Rate limiting (da migliorare con Redis)
│   └── errorHelper.js            # Mapping errori user-friendly
├── migrations/                   # SQL Supabase
│   ├── create_user_profiles.sql
│   ├── create_matches.sql
│   ├── create_user_tactical_feedback.sql
│   └── ...
├── docs/                         # Documentazione
└── info_rag.md                   # Knowledge base eFootball (§1-9)
```

---

## 3. Database Schema

### Tabelle Core

#### `user_profiles` (Estensione auth.users)
```sql
user_id UUID PK REFERENCES auth.users
nickname VARCHAR(50)          -- Pubblico in classifica
first_name, last_name         -- Privati
email VARCHAR                 -- Duplicato per query rapide

-- Dati tecnici gioco
platform VARCHAR              -- console|pc|mobile
connection_quality VARCHAR    -- good|unstable|lag
pass_level VARCHAR            -- pa1|pa2|pa3
smart_assist BOOLEAN
input_delay VARCHAR           -- yes|no|sometimes
current_division VARCHAR
hours_per_week INT

-- AI Knowledge Score
ai_knowledge_score DECIMAL(5,2)  -- 0-100
ai_knowledge_level VARCHAR       -- beginner|intermediate|advanced|expert
ai_knowledge_breakdown JSONB     -- {profile: 15, roster: 25, ...}

-- Classifica
leaderboard_consent BOOLEAN      -- Deprecato per classifica (non usato); colonna mantenuta per eventuale uso futuro

-- Timestamp
created_at, updated_at TIMESTAMPTZ
```

#### `user_tactical_feedback` (NUOVA - Feature Palestra Coach)
```sql
id UUID PK
user_id UUID FK -> auth.users ON DELETE CASCADE
match_id UUID FK -> matches ON DELETE SET NULL  -- Opzionale

session_type VARCHAR          -- profile_setup|feedback|update
formation_played VARCHAR      -- Cache formazione usata
style_played VARCHAR          -- Cache stile usato
opponent_name VARCHAR         -- Cache avversario
outcome VARCHAR               -- win|loss|draw

conversation_summary TEXT     -- Riassunto AI
insights JSONB                -- [{type: "weakness|strength|lesson", text: "..."}]
profile_fields_updated JSONB  -- ["platform", "pass_level", ...]

knowledge_points DECIMAL(3,1) -- 0.0-3.0 (per AI Score coach_training)
created_at TIMESTAMPTZ
```

#### `matches` (Partite giocate)
```sql
id UUID PK
user_id UUID FK
opponent_name VARCHAR
result VARCHAR                -- Formato: "2-1", "W", "L", "D"
match_date DATE
formation_played VARCHAR      -- "4-3-3", "4-2-3-1", etc.
playing_style_played VARCHAR  -- "Contrattacco", "Possesso", etc.
is_home BOOLEAN               -- Casa/Trasferta

-- Dati estratti da screenshot (opzionali ma consigliati)
player_ratings JSONB          -- {cliente: {...}, avversario: {...}}
team_stats JSONB              -- {possesso: 55, tiri: 12, ...}
attack_areas JSONB            -- {left: 30, center: 40, right: 30}
ball_recovery_zones JSONB     -- Array zone

-- AI generated
ai_summary TEXT               -- Riassunto AI della partita
created_at, updated_at TIMESTAMPTZ
```

#### `players` (Rosa)
```sql
id UUID PK
user_id UUID FK
player_name VARCHAR
position VARCHAR              -- Portiere, DC, DD, etc.
overall_rating INT
playing_style_id UUID FK -> playing_styles
slot_index INT                -- 0-10 titolari, NULL riserve (max 12 riserve per user)
skills JSONB                  -- Array abilità
com_skills JSONB              -- Abilità COM
form VARCHAR                  -- ↑ → ↓
base_stats JSONB              -- {vel: 85, tir: 78, ...}
original_positions JSONB      -- ["DC", "DCD"]

created_at, updated_at TIMESTAMPTZ
UNIQUE(user_id, slot_index) WHERE slot_index IS NOT NULL
```

### Indici Performance-Critici
```sql
-- Query frequenti
CREATE INDEX idx_matches_user_date ON matches(user_id, match_date DESC);
CREATE INDEX idx_players_user_slot ON players(user_id, slot_index);
CREATE INDEX idx_feedback_user_recent ON user_tactical_feedback(user_id, created_at DESC);
CREATE INDEX idx_leaderboard_month ON leaderboard_snapshots(month, rank);
```

---

## 4. Convenzioni Codice

### Naming
```javascript
// File/Componenti: PascalCase (React convention)
CoachFeedbackChat.jsx
AiKnowledgeBar.jsx

// Funzioni/Variabili: camelCase
const handleFormSubmit = () => {}
const userProfile = await getProfile()

// Database: snake_case
user_profiles, created_at, ai_knowledge_score

// Costanti: UPPER_SNAKE_CASE
const MAX_HISTORY_MESSAGES = 10
const RATE_LIMIT_CONFIG = {...}
```

### API Routes Pattern
```javascript
// File: app/api/nome-endpoint/route.js

import { NextResponse } from 'next/server'
import { validateToken, extractBearerToken } from '@/lib/authHelper'
import { checkRateLimit } from '@/lib/rateLimiter'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req) {
  // 1. Config check
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceKey) {
    return NextResponse.json({ error: 'Config missing' }, { status: 500 })
  }
  
  // 2. Auth (SEMPRE da token, MAI da body)
  const token = extractBearerToken(req)
  if (!token) return NextResponse.json({ error: 'Auth required' }, { status: 401 })
  
  const { userData, error: authError } = await validateToken(token, supabaseUrl, anonKey)
  if (authError || !userData?.user?.id) {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
  }
  const userId = userData.user.id  // CRITICO: Mai da req.body
  
  // 3. Rate limiting
  const rateLimit = await checkRateLimit(userId, endpoint, max, windowMs)
  if (!rateLimit.allowed) return NextResponse.json({ error: 'Rate limited' }, { status: 429 })
  
  // 4. Business logic
  try {
    // ...
    return NextResponse.json({ success: true, data })
  } catch (error) {
    // Log sicuro (no PII in produzione)
    if (process.env.NODE_ENV !== 'production') {
      console.error('[endpoint] Error:', error)
    }
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
```

### React Components Pattern
```javascript
'use client'  // Solo se necessario (interattività, hooks)

import React, { useState, useCallback } from 'react'
import { useTranslation } from '@/lib/i18n'

// Props destructuring con defaults
export default function ComponentName({ 
  prop1, 
  prop2 = 'default',
  onAction 
}) {
  const { t, lang } = useTranslation()
  const [state, setState] = useState(null)
  
  // useCallback per funzioni passate a children
  const handleClick = useCallback(() => {
    onAction?.()
  }, [onAction])
  
  return (
    <div className="component-class">
      {/* JSX */}
    </div>
  )
}
```

---

## 5. Sicurezza (CRITICO)

### Autenticazione & Autorizzazione
- **Token JWT** da Supabase Auth
- **User ID** sempre estratto dal token, **MAI** dal body della request
- **Service Role Key** solo server-side (API routes), mai esposta client-side

### Row Level Security (RLS)
Tutte le tabelle devono avere RLS attivo:
```sql
ALTER TABLE table_name ENABLE ROW LEVEL SECURITY;

-- Pattern standard
CREATE POLICY "Users can CRUD own data"
  ON table_name
  FOR ALL
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);
```

### Rate Limiting
Attuale: In-memory (`lib/rateLimiter.js`) — **NON SCALABILE**

**TODO:** Migrare a Redis (Upstash) per produzione:
```javascript
// lib/rateLimiter.js - Versione Redis
import { Redis } from '@upstash/redis'

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN
})
```

### Input Validation
- Whitelist su campi select (connection_quality, pass_level, etc.)
- Max length su testi liberi (nickname: 50, notes: 500)
- Sanitizzazione XSS prima di salvare nel DB

### Logging
- **NO PII in produzione** (email, nomi, user_id nei log)
- Condizionare con `process.env.NODE_ENV !== 'production'`
- Audit log per operazioni sensibili (pagamenti, modifiche dati)

---

## 6. AI Integration

### Temperature Configuration
| Use Case | Temperature | Note |
|----------|-------------|------|
| Chat generica | 0.25 | Bilanciato, non troppo rigido |
| Countermeasures (JSON) | 0.1 | Strict deterministic |
| Match Analysis | 0.2 | Strutturato ma adattivo |
| Data Extraction | 0.0 | Assolutamente deterministico |

### Prompt Engineering
- **System prompt** con constraints hardcoded (mai in DB)
- **RAG** da `info_rag.md` (sezioni 1-9, esclusa 10)
- **Context window**: MAX 7200 chars per personal context
- **Output sanitization**: Rimuovere "perché", ragionamenti visibili

### Structured Output (Countermeasures)
```javascript
const requestBody = {
  model: 'gpt-4o',
  temperature: 0.1,
  response_format: { type: 'json_object' },  // JSON garantito
  messages: [...]
}
```

---

## 7. Performance

### Query Database
- **Indici** su tutte le foreign key e colonne frequentemente filtrate
- **Limit** su query liste (es. `limit(20)` su partite)
- **Select specifiche** (evitare `SELECT *`)

### Frontend
- **CSS Variables** per theming (più veloce di Tailwind puro)
- **Lazy loading** componenti pesanti (`dynamic` import)
- **Image optimization** con `next/image`

### API
- **Edge functions** per operazioni leggere (verifica)
- **Node.js runtime** per operazioni pesanti (AI, DB)
- **Caching** header appropriati (`Cache-Control: no-store` per dati utente)

---

## 8. Deploy & DevOps

### Environment Variables
```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...  # CRITICO: Server only

# OpenAI
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4o

# Stripe
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...

# App
NEXT_PUBLIC_APP_URL=https://tuo-dominio.com
```

### Checklist Deploy
- [ ] Variabili env configurate su Vercel
- [ ] Migrations eseguite su Supabase
- [ ] RLS attivo su tutte le tabelle
- [ ] Edge Functions obsolete rimosse
- [ ] Stripe webhook endpoint HTTPS valido
- [ ] Domain custom configurato
- [ ] SSL/TLS attivo (obbligatorio)

---

## 9. Testing (TODO)

Al momento **non ci sono test**. Da implementare:

```bash
# Unit tests
npm run test:unit

# E2E tests (Playwright)
npm run test:e2e

# Linting
npm run lint
```

---

## 10. Contatti & Riferimenti

- **Repo:** GitHub [link]
- **Staging:** [URL Vercel preview]
- **Produzione:** [URL dominio]
- **Supabase Dashboard:** https://supabase.com/dashboard/project/[ref]
- **Vercel Dashboard:** https://vercel.com/[team]/[project]

---

**Ultimo aggiornamento:** 14/02/2026  
**Prossima revisione:** [Data]
