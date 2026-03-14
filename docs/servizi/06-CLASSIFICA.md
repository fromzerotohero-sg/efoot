# Servizio: Classifica Mensile (Leaderboard)

**Sistema competitivo "From Zero to Hero"**

---

## 1. Overview

| Aspect | Dettaglio |
|--------|-----------|
| **Nome** | "From Zero to Hero" |
| **Periodo** | Mensile (reset 1° del mese) |
| **Metrica** | Hero Points accumulati |
| **Partecipazione** | Automatica (con nickname impostato) |
| **Visibilità** | Pubblica (solo nickname, nessun dato personale) |

---

## 2. Flusso Dati

### 2.1 Calcolo Classifica (Automatico)
```
1° del mese / Evento trigger
    ↓
Cron job o API call
    ↓
Compute leaderboard for month
    ↓
Per ogni utente con nickname:
  - Somma HP guadagnati nel mese
  - Breakdown per categoria (partite, task, feedback, etc.)
  - Assegna rank
    ↓
INSERT INTO leaderboard_snapshots
    ↓
Notifica utenti (opzionale)
```

### 2.2 Visualizzazione
```
Utente visita /classifica
    ↓
GET /api/leaderboard?month=2026-02
    ↓
Mese corrente: computeLeaderboardForMonth (tutti eleggibili, nessun filtro consenso) → saveLeaderboardSnapshot
Mese passato: lettura leaderboard_snapshots
    ↓
Join user_profiles per nickname (nessun filtro leaderboard_consent)
    ↓
Return: rankings[], currentUser, daysLeftInMonth
```

---

## 3. Componenti

### 3.1 Frontend

#### ClassificaPage (`app/classifica/page.jsx`)
```javascript
export default function ClassificaPage() {
  const [data, setData] = useState({
    rankings: [],
    currentUser: null,
    month: '',
    daysLeftInMonth: 0
  })
  
  useEffect(() => {
    fetch('/api/leaderboard?' + new URLSearchParams({ month: getCurrentMonth() }))
      .then(res => res.json())
      .then(setData)
  }, [])
  
  return (
    <div>
      {/* Hero section con countdown */}
      <Countdown days={data.daysLeftInMonth} />
      
      {/* La tua posizione */}
      {data.currentUser && (
        <YourPosition 
          rank={data.currentUser.rank}
          points={data.currentUser.points}
          breakdown={data.currentUser.pointsBreakdown}
        />
      )}
      
      {/* Tabella classifica */}
      <LeaderboardTable rankings={data.rankings} />
      
      {/* CTA come salire */}
      <HowToClimb />
    </div>
  )
}
```

### 3.2 Backend

#### API (`app/api/leaderboard/route.js`)
```javascript
export async function GET(req) {
  const month = req.query.month || getCurrentMonth()
  
  // 1. Recupera snapshot
  const { data: snapshots } = await admin
    .from('leaderboard_snapshots')
    .select('*')
    .eq('month', month)
    .order('rank', { ascending: true })
  
  // 2. Recupera nicknames
  const userIds = snapshots.map(s => s.user_id)
  const { data: profiles } = await admin
    .from('user_profiles')
    .select('user_id, nickname')
    .in('user_id', userIds)
  
  // 3. Build rankings
  const nicknameMap = Object.fromEntries(
    profiles.map(p => [p.user_id, p.nickname])
  )
  
  const rankings = snapshots.map(s => ({
    rank: s.rank,
    nickname: nicknameMap[s.user_id] || '—',
    points: s.points
  }))
  
  // 4. Current user (se autenticato)
  const currentUser = await getCurrentUserRank(authUserId, month)
  
  return NextResponse.json({
    month,
    rankings,
    currentUser,
    daysLeftInMonth: calculateDaysLeft(month)
  })
}
```

#### Calcolo Classifica (`lib/leaderboardHelper.js`)
```javascript
export async function computeLeaderboardForMonth(month, admin) {
  // Recupera tutti gli utenti attivi nel mese
  const { data: users } = await admin
    .from('user_profiles')
    .select('user_id, nickname')
    .not('nickname', 'is', null)  // Solo con nickname
  
  const rankings = []
  
  for (const user of users) {
    const points = await calculateUserPoints(user.user_id, month, admin)
    
    rankings.push({
      user_id: user.user_id,
      nickname: user.nickname,
      points: points.total,
      points_breakdown: points.breakdown
    })
  }
  
  // Ordina e assegna rank
  rankings.sort((a, b) => b.points - a.points)
  rankings.forEach((r, i) => r.rank = i + 1)
  
  return rankings
}

async function calculateUserPoints(userId, month, admin) {
  const [year, monthNum] = month.split('-')
  const startDate = `${month}-01`
  const endDate = `${month}-${lastDayOfMonth(month)}`
  
  // 1. Punti da partite
  const { data: matches } = await admin
    .from('matches')
    .select('result')
    .eq('user_id', userId)
    .gte('match_date', startDate)
    .lte('match_date', endDate)
  
  let matchPoints = 0
  for (const m of matches) {
    if (isWin(m.result)) matchPoints += 10
    else if (isDraw(m.result)) matchPoints += 5
    else matchPoints += 2
  }
  
  // 2. Punti da task
  const { data: tasks } = await admin
    .from('weekly_goals')
    .select('points_earned')
    .eq('user_id', userId)
    .eq('status', 'completed')
    .gte('week_start_date', startDate)
    .lte('week_end_date', endDate)
  
  const taskPoints = tasks.reduce((sum, t) => sum + (t.points_earned || 0), 0)
  
  // 3. Punti da feedback
  const { data: feedbacks } = await admin
    .from('user_tactical_feedback')
    .select('id')
    .eq('user_id', userId)
    .gte('created_at', startDate)
    .lte('created_at', endDate)
  
  const feedbackPoints = feedbacks.length * 2  // 2 punti per ogni feedback
  
  return {
    total: matchPoints + taskPoints + feedbackPoints,
    breakdown: {
      matches: matchPoints,
      tasks: taskPoints,
      feedback: feedbackPoints
    }
  }
}
```

---

## 4. Database

### 4.1 Tabella Leaderboard Snapshots
```sql
CREATE TABLE leaderboard_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  month VARCHAR(7) NOT NULL,  -- "2026-02"
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  rank INTEGER NOT NULL,
  points INTEGER NOT NULL DEFAULT 0,
  points_breakdown JSONB DEFAULT '{}',  -- {matches: 50, tasks: 30, ...}
  
  prize_claimed BOOLEAN DEFAULT false,
  prize_claimed_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(month, user_id)
);

-- Indici
CREATE INDEX idx_leaderboard_month_rank ON leaderboard_snapshots(month, rank);
CREATE INDEX idx_leaderboard_user ON leaderboard_snapshots(user_id, month);
```

---

## 5. Sistema Punteggi

### Fonti Punti

| Azione | Punti | Note |
|--------|-------|------|
| Vittoria | +10 | Da partite inserite |
| Pareggio | +5 | Da partite inserite |
| Sconfitta | +2 | Partecipazione |
| Task completato | +5-15 | In base a difficoltà |
| Feedback Palestra | +2 | Per ogni sessione |
| Profilo completo | +10 | Una tantum |
| Rosa completa | +15 | Una tantum |

### Categorie Breakdown
```json
{
  "matches": 50,
  "tasks": 30,
  "feedback": 10,
  "profile": 10,
  "roster": 15
}
```

---

## 6. Premi

### Struttura Premi (Esempio)

| Posizione | Premio | Valore indicativo |
|-----------|--------|-------------------|
| 1° | Badge "Campione" + Kit esclusivo | €50 |
| 2° | Badge "Vice-campione" + Maglietta | €30 |
| 3° | Badge "Podio" + Cappellino | €20 |
| 4-10 | Badge "Top 10" | - |

### Gestione Premi
```javascript
// Dopo calcolo classifica
async function assignPrizes(month, admin) {
  const { data: top3 } = await admin
    .from('leaderboard_snapshots')
    .select('*')
    .eq('month', month)
    .lte('rank', 3)
  
  for (const winner of top3) {
    // Inserisci in user_prizes
    await admin.from('user_prizes').insert({
      user_id: winner.user_id,
      month: month,
      rank: winner.rank,
      prize_type: getPrizeType(winner.rank),
      status: 'pending',  -- Attesa claim
      shipping_address: null
    })
    
    // Notifica utente
    await sendNotification(winner.user_id, 'Hai vinto un premio!')
  }
}
```

---

## 7. Sicurezza

### RLS
```sql
-- Leaderboard pubblica in lettura
CREATE POLICY "Leaderboard public read"
  ON leaderboard_snapshots FOR SELECT
  TO PUBLIC
  USING (true);

-- Solo admin in scrittura (o service role)
CREATE POLICY "Service role write leaderboard"
  ON leaderboard_snapshots FOR ALL
  USING (auth.role() = 'service_role');
```

### Anti-Cheat
- Verifica partite sospette (tempi troppo ravvicinati)
- Controllo account multipli (stesso IP, pattern simili)
- Sanzione: squalifica, ban account

---

## 8. Modifiche Richieste (TODO)

### leaderboard_consent (stato)
**Fatto:** Filtro `leaderboard_consent` rimosso da API route e da RPC (`get_leaderboard_for_month`, `get_leaderboard_current_user`). Tutti gli eleggibili (≥1 partita nel mese, profilo ≥50%) compaiono in classifica. Checkbox rimosso da Impostazioni profilo. La colonna in DB è mantenuta per eventuale uso futuro; non è usata per la classifica.

La colonna `leaderboard_consent` non viene usata per la classifica; non è stata rimossa da DB (eventuale uso futuro).

---

**Ultimo aggiornamento:** 14/02/2026
