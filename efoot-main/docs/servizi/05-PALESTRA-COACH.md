# Servizio: Palestra Coach (Feedback & Training)

**Sistema di feedback per migliorare l'AI**

---

## 1. Overview

| Aspect | Dettaglio |
|--------|-----------|
| **Scopo** | Raccogliere feedback utente per adattare consigli AI |
| **Modalità** | Chat conversazionale + Form dati tecnici |
| **Trigger** | Post-partita, settimanale, o libero |
| **Reward** | +0.5-3.0 punti AI Knowledge Score (componente coach_training 10%) |
| **Costo** | 1 HP per messaggio, 1 HP per salvataggio |

---

## 2. Flusso Utente

### 2.1 Modalità "Prima Volta" (Profile Setup)
```
Utente apre Palestra Coach
    ↓
Form dati tecnici espanso (nessun dato precedente)
    ↓
Compila: Piattaforma, Connessione, PA, Smart Assist, Divisione, Punto debole
    ↓
Click "Salva dati"
    ↓
POST /api/supabase/save-ai-info
    ↓
Form si chiude, chat disponibile
    ↓
Chatta con AI (opzionale)
    ↓
Click "Salva e chiudi"
    ↓
POST /api/save-coach-feedback
    ↓
Trigger refresh-diagnostic
    ↓
+5 punti AI Knowledge Score (bonus setup)
```

### 2.2 Modalità "Post-Partita" (Feedback)
```
Utente finisce partita → Notifica "Aggiorna esperienza in Palestra Coach"
    ↓
Entra in Palestra Coach (auto-detect ultima partita)
    ↓
Header: "Vedo che hai giocato 4-3-3 vs [avversario] — [risultato]"
    ↓
Form dati (compresso, modifiche opzionali)
    ↓
Chat:
  AI: "Raccontami com'è andata!"
  Utente: "Ho seguito il tuo consiglio di pressing alto ma ho preso 3 gol"
  AI: "Capisco, il pressing alto con PA2 può essere rischioso..."
    ↓
Salvataggio
    ↓
Estrazione insight automatica: "4-3-3 pressing alto vs 4-2-3-1 = fallimento"
    ↓
+1-3 punti AI Knowledge Score
```

### 2.3 Modalità "Aggiornamento" (Update)
```
Utente vuole cambiare info profilo
    ↓
Palestra Coach → Form modificabile
    ↓
Aggiorna campi
    ↓
Salva
    ↓
Aggiornamento diagnostic immediato
```

---

## 3. Componenti

### 3.1 Frontend

#### CoachFeedbackChat (`components/CoachFeedbackChat.jsx`)
```javascript
'use client'

export default function CoachFeedbackChat({ 
  show, 
  onClose, 
  userProfile, 
  lastMatch 
}) {
  const [step, setStep] = useState('form') // 'form' | 'chat'
  const [formData, setFormData] = useState({})
  const [messages, setMessages] = useState([])
  
  // Determina modalità
  const sessionMode = useMemo(() => {
    const hasProfile = /* check campi profilo */
    if (!hasProfile) return 'profile_setup'
    if (lastMatch) return 'feedback'
    return 'update'
  }, [userProfile, lastMatch])
  
  // Step 1: Form dati tecnici
  const handleFormSave = async () => {
    await fetch('/api/supabase/save-ai-info', {
      method: 'POST',
      body: JSON.stringify(formData)
    })
    setStep('chat')
  }
  
  // Step 2: Chat
  const handleSendMessage = async (text) => {
    const res = await fetch('/api/coach-feedback-chat', {
      method: 'POST',
      body: JSON.stringify({ message: text, history: messages })
    })
    const data = await res.json()
    setMessages(prev => [...prev, 
      { role: 'user', content: text },
      { role: 'assistant', content: data.response }
    ])
  }
  
  // Salvataggio finale
  const handleSaveAndClose = async () => {
    await fetch('/api/save-coach-feedback', {
      method: 'POST',
      body: JSON.stringify({
        conversation: messages,
        session_type: sessionMode,
        match_id: lastMatch?.id
      })
    })
    onClose()
  }
  
  return (
    <Modal show={show} onClose={handleSaveAndClose}>
      {step === 'form' && (
        <TechnicalDataForm 
          data={formData} 
          onChange={setFormData}
          onSave={handleFormSave}
        />
      )}
      {step === 'chat' && (
        <ChatInterface
          messages={messages}
          onSend={handleSendMessage}
          onClose={handleSaveAndClose}
        />
      )}
    </Modal>
  )
}
```

#### TechnicalDataForm (sezione nel componente)
```javascript
// Form fields:
// - platform: select [Console, PC, Mobile]
// - connection_quality: select [Buona, Instabile, Lag]
// - pass_level: select [PA1, PA2, PA3]
// - smart_assist: select [Sì, No]
// - current_division: text
// - ai_weak_point: select [Difesa, Attacco, Piazzati, Transizioni, Finale]
// - hours_per_week: number (0-168)
// - ai_learn_goals: text (cosa vuole imparare)
// - ai_notes: text (note libere)
```

### 3.2 Backend

#### Chat API (`app/api/coach-feedback-chat/route.js`)
```javascript
export async function POST(req) {
  const { userId } = await authenticate(req)
  
  // Rate limit
  await checkRateLimit(userId, '/api/coach-feedback-chat', 30, 60000)
  
  const { message, history } = await req.json()
  
  // Build prompt "blindato" (solo ascolto, zero consigli tattici)
  const prompt = `
    Sei l'assistente della Palestra Coach. Il tuo ruolo è SOLO ASCOLTARE e Raccogliere informazioni.
    
    VIETATO:
    - Dare consigli tattici
    - Suggerire formazioni o stili
    - Analizzare partite
    
    CONSENTITO:
    - Fare domande di approfondimento
    - Riepilogare ciò che l'utente ha detto
    - Essere empatico e incoraggiante
    
    Contesto: L'utente sta dando feedback sulla sua esperienza di gioco.
    Scopo: Raccogliere dati per migliorare i consigli futuri dell'AI principale.
  `
  
  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      { role: 'system', content: prompt },
      ...history,
      { role: 'user', content: message }
    ],
    temperature: 0.7,  // Più caldo per conversazione naturale
    max_tokens: 500
  })
  
  // Consuma HP
  await recordUsage(userId, 1, 'coach-feedback-chat')
  
  return NextResponse.json({
    response: response.choices[0].message.content
  })
}
```

#### Salvataggio Feedback (`app/api/save-coach-feedback/route.js`)
```javascript
export async function POST(req) {
  const { userId } = await authenticate(req)
  const { conversation, session_type, match_id } = await req.json()
  
  // 1. Estrazione dati strutturati via AI
  const extraction = await extractInsights(conversation, match_id)
  
  // 2. Aggiorna profilo (campi identificati)
  if (extraction.profile_updates) {
    await updateProfile(userId, extraction.profile_updates)
  }
  
  // 3. Salva feedback tattico
  await admin.from('user_tactical_feedback').insert({
    user_id: userId,
    match_id: match_id,
    session_type: session_type,
    formation_played: matchInfo?.formation_played,
    outcome: extraction.outcome,
    conversation_summary: extraction.summary,
    insights: extraction.tactical_insights,
    profile_fields_updated: Object.keys(extraction.profile_updates || {})
  })
  
  // 4. Calcola knowledge points
  const points = calculateKnowledgePoints(extraction)
  // Formula: 0.5 base + 0.5 per campo dettagliato + 0.5 per outcome + 0.5 per insight
  
  // 5. Trigger aggiornamento diagnostic
  await fetch('/api/refresh-diagnostic', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` }
  })
  
  // 6. Consuma HP
  await recordUsage(userId, 1, 'save-coach-feedback')
  
  return NextResponse.json({
    success: true,
    insights_count: extraction.tactical_insights?.length || 0,
    knowledge_points: points
  })
}

// Estrazione via AI
async function extractInsights(conversation, matchInfo) {
  const prompt = `
    Analizza questa conversazione e estrai:
    1. Aggiornamenti profilo (piattaforma, connessione, ecc.)
    2. Insight tattici (type: weakness|strength|lesson, text: descrizione)
    3. Outcome partita (win|loss|draw|null)
    4. Riassunto conversazione
    
    Rispondi in JSON.
  `
  
  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [{ role: 'user', content: prompt }],
    response_format: { type: 'json_object' },
    temperature: 0.1  // Molto deterministico per JSON
  })
  
  return JSON.parse(response.choices[0].message.content)
}
```

---

## 4. Database

### 4.1 Tabella user_tactical_feedback
```sql
CREATE TABLE user_tactical_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  match_id UUID REFERENCES matches(id) ON DELETE SET NULL,
  
  -- Tipo sessione
  session_type VARCHAR(20) NOT NULL CHECK (session_type IN ('profile_setup', 'feedback', 'update')),
  
  -- Dati contesto
  formation_played VARCHAR(20),
  style_played VARCHAR(30),
  opponent_name VARCHAR(100),
  outcome VARCHAR(10) CHECK (outcome IN ('win', 'loss', 'draw', NULL)),
  
  -- Contenuto estratto
  conversation_summary TEXT,
  insights JSONB NOT NULL DEFAULT '[]'::jsonb,  -- [{type, text}]
  profile_fields_updated JSONB DEFAULT '[]'::jsonb,  -- ["platform", "pass_level"]
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indici
CREATE INDEX idx_feedback_user_recent ON user_tactical_feedback(user_id, created_at DESC);
CREATE INDEX idx_feedback_match ON user_tactical_feedback(match_id) WHERE match_id IS NOT NULL;
```

---

## 5. AI Knowledge Score Integration

### Calcolo Coach Training (10%)
```javascript
// lib/aiKnowledgeHelper.js
async function calculateCoachTrainingScore(userId, admin) {
  // Somma knowledge_points ultimi 30 giorni
  const { data: feedbacks } = await admin
    .from('user_tactical_feedback')
    .select('insights, created_at')
    .eq('user_id', userId)
    .gte('created_at', thirtyDaysAgo)
  
  // Calcolo punteggio
  let score = 0
  
  for (const f of feedbacks) {
    // Base: 0.5 per ogni feedback
    score += 0.5
    
    // Bonus: 0.5 per ogni insight strutturato
    score += (f.insights?.length || 0) * 0.5
    
    // Max 3.0 per singolo feedback
    score += Math.min(3.0, score)
  }
  
  // Max totale 10
  return Math.min(10, score)
}
```

### Utilizzo in Diagnostic
```javascript
// lib/diagnosticBuilder.js
function buildCoachFeedbackSection(feedbackRows, lang) {
  if (!feedbackRows?.length) return ''
  
  const lines = []
  for (const row of feedbackRows) {
    for (const insight of row.insights || []) {
      const typeLabel = insight.type === 'weakness' ? 'Debolezza' :
                       insight.type === 'strength' ? 'Forza' : 'Lezione'
      lines.push(`- ${typeLabel}: ${insight.text}`)
    }
  }
  
  return lines.length ? `ESPERIENZA COACH:\n${lines.join('\n')}` : ''
}
```

---

## 6. Sicurezza

### RLS
```sql
ALTER TABLE user_tactical_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own feedback"
  ON user_tactical_feedback FOR ALL
  USING ((SELECT auth.uid()) = user_id);
```

### Privacy
- **Conversation summary**: Memorizzato testo riassunto, NON conversazione completa
- **Insights**: Estratti strutturati, anonimizzati
- **Nessun dato sensitive**: No email, no nomi reali

---

## 7. Integrazione Chat Principale

La chat AI principale legge i feedback per adattare consigli:

```javascript
// In assistant-chat API
const { data: recentFeedback } = await admin
  .from('user_tactical_feedback')
  .select('insights')
  .eq('user_id', userId)
  .order('created_at', { ascending: false })
  .limit(5)

// Inserito nel context:
// "FEEDBACK RECENTI: L'utente ha segnalato che [insight.text]"
```

---

**Ultimo aggiornamento:** 14/02/2026
