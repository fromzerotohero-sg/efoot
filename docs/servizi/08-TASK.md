# Servizio: Task Settimanali (Weekly Goals)

**Obiettivi gamification per engagement utente**

---

## 1. Overview

| Aspect | Dettaglio |
|--------|-----------|
| **Frequenza** | Settimanale (Lunedì-Domenica) |
| **Generazione** | Automatica all'inizio settimana |
| **Progresso** | Aggiornato automaticamente dopo ogni partita |
| **Reward** | +5-15 punti AI Knowledge Score per task completato |

---

## 2. Task Attivi

### Lista Task Validi

| # | Tipo | Descrizione | Difficoltà | Dati Richiesti |
|---|------|-------------|------------|----------------|
| 1 | `complete_matches` | Completa X partite | Easy | `data_completeness` |
| 2 | `increase_wins` | Vinci X partite | Hard | `result`, `is_home` |
| 3 | `reduce_goals_conceded` | Riduci gol subiti del 20% | Medium | `team_stats.goals_conceded` o `result` |
| 4 | `improve_possession` | Aumenta possesso del 10% | Medium | `team_stats.possession` |
| 5 | `clean_sheet_matches` | Clean sheet (0 gol subiti) | Medium | `team_stats` o `result` |
| 6 | `use_ai_recommendations` | Usa chat/analisi X volte | Easy | `credit_transactions` (whitelist in `taskHelper.js`) |

Per il task "usa IA X volte" contano tutte le operazioni in `AI_USAGE_DESCRIPTIONS_WHITELIST` (inclusi `extract-player`, `extract-coach`, chat, analisi, contromisure, estrazioni). Vedi [VERIFICA_COERENZA_HP_DEFALCATI.md](../VERIFICA_COERENZA_HP_DEFALCATI.md) §4.

### Task Deprecati/Rimossi

| Tipo | Motivo Rimozione |
|------|------------------|
| `improve_defense` | Richiedeva whitelist formazioni difensive, troppo complessa da gestire e manutentere |
| `use_recommended_formation` | Richiedeva flag autodichiarato `recommended_formation_used`, viola regola "solo dati oggettivi" |

---

## 3. Regola Fondamentale

**VIETATO** creare task che dipendono da:
- ✅ Flag autodichiarati dall'utente
- ✅ Whitelist di formazioni/tattiche (difficili da mantenere)
- ✅ Input manuale dell'utente su azioni compiute

**CONSENTITO** solo task calcolabili da:
- ✅ Dati partita caricati (`formation_played`, `result`, `team_stats`, `data_completeness`)
- ✅ Log di utilizzo (`credit_transactions`)
- ✅ Profilo utente compilato (`common_problems` ecc.)

---

## 4. Flusso Dati

### Generazione (Inizio Settimana)
```
Cron / Primo accesso utente
    ↓
GET /api/tasks/list
    ↓
Se non esistono task per questa settimana:
    ↓
generateWeeklyTasksForUser()
    ↓
Analisi ultime 10 partite
    ↓
Generazione task basati su dati
    ↓
INSERT INTO weekly_goals
```

### Aggiornamento Progresso

Il progresso viene aggiornato sia al **salvataggio** di una nuova partita (`POST /api/supabase/save-match`) sia alla **modifica** di una partita esistente (`POST /api/supabase/update-match`): entrambe le route chiamano `updateTasksProgressAfterMatch()`.

```
Utente salva o modifica partita
    ↓
save-match o update-match → updateTasksProgressAfterMatch()
    ↓
Per ogni task attivo:
    - Ricalcola current_value dai dati
    - Se target raggiunto: status = 'completed'
    ↓
UPDATE weekly_goals
    ↓
Se task completati: updateAIKnowledgeScore()
```

---

## 5. Componenti

### 5.1 Frontend

#### TaskWidget (`components/TaskWidget.jsx`)
```javascript
export default function TaskWidget() {
  const [tasks, setTasks] = useState([])
  
  useEffect(() => {
    fetch('/api/tasks/list')
      .then(res => res.json())
      .then(setTasks)
  }, [])
  
  return (
    <div className="task-widget">
      <h3>Obiettivi Settimanali</h3>
      {tasks.map(task => (
        <TaskItem 
          key={task.id}
          description={task.goal_description}
          current={task.current_value}
          target={task.target_value}
          status={task.status}
        />
      ))}
    </div>
  )
}
```

### 5.2 Backend

#### Generazione (`lib/taskHelper.js`)
```javascript
export async function generateWeeklyTasksForUser(userId, supabaseUrl, serviceKey, week, lang) {
  // 1. Recupera dati
  const profile = await getProfile(userId)
  const matches = await getLast10Matches(userId)
  const patterns = await getTacticalPatterns(userId)
  
  // 2. Analizza performance
  const avgGoalsConceded = calculateAvgGoalsConceded(matches)
  const avgPossession = calculateAvgPossession(matches)
  const winRate = calculateWinRate(matches)
  
  // 3. Genera task basati su dati
  const tasks = []
  
  if (matches.length < 3) {
    // Utente nuovo: task generici
    tasks.push({ goal_type: 'complete_matches', target_value: 3 })
    tasks.push({ goal_type: 'increase_wins', target_value: 2 })
    tasks.push({ goal_type: 'use_ai_recommendations', target_value: 2 })
  } else {
    // Utente attivo: task personalizzati
    if (avgGoalsConceded > 2.0) {
      tasks.push({ 
        goal_type: 'reduce_goals_conceded', 
        target_value: avgGoalsConceded * 0.8 
      })
    }
    
    if (avgPossession < 50) {
      tasks.push({ 
        goal_type: 'improve_possession', 
        target_value: avgPossession + 10 
      })
    }
    
    // ... altri task basati sui dati
  }
  
  // 4. Salva
  await saveTasks(tasks)
  return tasks
}
```

#### Calcolo Progresso
```javascript
async function calculateTaskProgress(task, matches, newMatch) {
  switch (task.goal_type) {
    case 'reduce_goals_conceded':
      // Media gol subiti ultimi 5 match
      const recentMatches = matches.slice(0, 5)
      return calculateAvgGoalsConceded(recentMatches)
      
    case 'clean_sheet_matches':
      // Conta partite con 0 gol subiti
      return matches.filter(m => extractGoalsConceded(m) === 0).length
      
    case 'use_ai_recommendations':
      // Conta transazioni crediti per servizi AI
      const tx = await getCreditTransactions(userId, 'assistant-chat')
      return tx.length
      
    // ... altri case
  }
}
```

---

## 6. Database

```sql
CREATE TABLE weekly_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  goal_type VARCHAR(50) NOT NULL,
  goal_description TEXT NOT NULL,
  target_value DECIMAL(10,2) NOT NULL,
  current_value DECIMAL(10,2) DEFAULT 0,
  difficulty VARCHAR(20) CHECK (difficulty IN ('easy', 'medium', 'hard')),
  
  week_start_date DATE NOT NULL,
  week_end_date DATE NOT NULL,
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'completed', 'failed')),
  
  created_by VARCHAR(20) DEFAULT 'system',
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(user_id, week_start_date, goal_type)
);

-- Indici
CREATE INDEX idx_weekly_goals_user_week ON weekly_goals(user_id, week_start_date);
CREATE INDEX idx_weekly_goals_status ON weekly_goals(status) WHERE status = 'active';
```

---

## 7. API

| Route | Metodo | Scopo |
|-------|--------|-------|
| `/api/tasks/list` | GET | Lista task utente corrente (genera se mancanti) |
| `/api/tasks/generate` | POST | Forza rigenerazione task (admin) |

---

## 8. Sicurezza

### RLS
```sql
-- Solo propri task
CREATE POLICY "Users view own tasks"
  ON weekly_goals FOR SELECT
  USING ((SELECT auth.uid()) = user_id);

-- Solo system/background job in scrittura
CREATE POLICY "System writes tasks"
  ON weekly_goals FOR ALL
  USING (created_by = 'system' OR auth.role() = 'service_role');
```

### Validazione
- `target_value` deve essere > 0
- `current_value` non può essere negativo
- Solo task da whitelist `VALID_TASK_TYPES` possono essere creati

---

## 9. Fix Recenti (14/02/2026)

### Rimosso: `improve_defense`
**Problema:** Richiedeva whitelist formazioni difensive (`DEFENSIVE_FORMATIONS`) difficile da mantenere e aggiornare.

**Sostituito con:** `clean_sheet_matches`
- Più semplice: conta partite con 0 gol subiti
- Oggettivo: basato solo sui dati, non su interpretazioni
- Facile da calcolare: usa `extractGoalsConceded()` helper

### Rimosso: `use_recommended_formation`
**Problema:** Richiedeva flag autodichiarato `recommended_formation_used`.

**Decisione:** Non sostituito, rimosso definitivamente per rispettare la regola "no dati autodichiarati".

---

## 10. Aggiungere Nuovi Task

Per aggiungere un nuovo task:

1. **Aggiungi tipo in `generateTasksBasedOnData()`**
```javascript
if (condizioneBasataSuDati) {
  tasks.push({
    goal_type: 'nuovo_task',
    goal_description: translate('goalNuovoTask', lang, params),
    target_value: valoreCalcolato,
    difficulty: 'medium'
  })
}
```

2. **Aggiungi case in `calculateTaskProgress()`**
```javascript
case 'nuovo_task':
  currentValue = calcolaDaDati(matches)
  break
```

3. **Aggiungi traduzioni in `i18n.js`**
```javascript
goalNuovoTask: 'Descrizione task con {param}',
```

4. **Verifica:** Il task deve essere calcolabile SOLO da dati oggettivi, mai da input utente.

---

**Ultimo aggiornamento:** 14/02/2026
