# Servizio: Chat AI (Assistant)

**Conversazione con AI specializzata eFootball**

---

## 1. Overview

| Aspect | Dettaglio |
|--------|-----------|
| **Modello** | OpenAI GPT-4o |
| **Temperatura** | 0.25 (bilanciato) |
| **Context** | Rosa, partite, pattern, profilo, RAG |
| **Max tokens** | 800 (risposta) |
| **Costo** | 1 HP per messaggio |

---

## 2. Flusso Conversazione

### 2.1 Invio Messaggio
```
Utente → Scrive in chat widget
    ↓
POST /api/assistant-chat
    ↓
Autenticazione JWT
    ↓
Build context:
  - Profilo utente
  - Rosa (11 titolari)
  - Ultime 5 partite
  - Pattern tattici
  - Diagnostic cache
    ↓
RAG: Query info_rag.md (sezioni pertinenti)
    ↓
Build prompt completo (system + context + history + message)
    ↓
OpenAI GPT-4o (temperature 0.25)
    ↓
Sanitizzazione output (rimuove "perché", limita a 2-4 frasi)
    ↓
Risposta utente + suggerimenti (3 domande)
    ↓
1 HP consumato
```

### 2.2 Struttura Prompt

```
SYSTEM (hardcoded constraints):
- Scope: solo consulenza tattica eFootball
- VIETATO suggerire cambio formazione (a meno che non richiesto)
- VIETATO "perché", spiegazioni causali
- Output: 2-4 frasi operative, nomi giocatori da rosa, no numeri grezzi
- SUGGERIMENTI: 3 domande cliccabili

CAPSULA ENGINE (vincoli operativi):
- Rosa: nomi reali, max 5 stili squadra, max 5 istruzioni
- Priorità: Istruzioni → Formazione → Stile squadra
- Sostituzioni: incrocio dati rosa + stats + stili

CONTEXT (dinamico):
- Profilo: connessione, punto debole, obiettivi
- Rosa: 11 titolari + caratteristiche
- Partite: ultime 5, risultati, formazioni
- Pattern: uso formazioni, win rate
- Coach: nome, competenze, connection
- Diagnostic: riassunto aggregato

RAG (selezionato da keywords):
- Sezioni 1-9 di info_rag.md
- Escluse: sezione 10 (policies, ora in system prompt)

HISTORY (ultimi 10 messaggi):
- Alternanza user/assistant

USER MESSAGE:
- Contenuto attuale
```

---

## 3. Componenti

### 3.1 Frontend

#### AssistantChat (`components/AssistantChat.jsx`)
```javascript
'use client'

export default function AssistantChat() {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  
  const sendMessage = async () => {
    setLoading(true)
    
    const res = await fetch('/api/assistant-chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: input,
        history: messages.slice(-10),
        currentPage: window.location.pathname
      })
    })
    
    const data = await res.json()
    setMessages(prev => [...prev, 
      { role: 'user', content: input },
      { role: 'assistant', content: data.response, suggestions: data.suggestions }
    ])
    setInput('')
    setLoading(false)
  }
  
  return (
    <div className="chat-widget">
      <div className="messages">
        {messages.map((m, i) => (
          <Message key={i} role={m.role} content={m.content} />
        ))}
      </div>
      <input 
        value={input} 
        onChange={e => setInput(e.target.value)}
        onKeyPress={e => e.key === 'Enter' && sendMessage()}
      />
      <button onClick={sendMessage} disabled={loading}>
        {loading ? '...' : 'Invia'}
      </button>
    </div>
  )
}
```

### 3.2 Backend

#### API Route (`app/api/assistant-chat/route.js`)
```javascript
import { buildPersonalContext } from '@/lib/contextBuilder'
import { getRelevantSections } from '@/lib/ragHelper'
import { callOpenAIWithRetry } from '@/lib/openaiHelper'
import { sanitizeCoachOutput } from '@/lib/outputHelper'

export async function POST(req) {
  // 1. Auth
  const { userId } = await authenticate(req)
  
  // 2. Rate limit
  await checkRateLimit(userId, '/api/assistant-chat', 30, 60000)
  
  // 3. Parse body
  const { message, history, currentPage } = await req.json()
  
  // 4. Build context personale
  const personalContext = await buildPersonalContext(userId, currentPage)
  
  // 5. RAG
  const relevantSections = getRelevantSections(message)
  
  // 6. Build messages per OpenAI
  const messages = [
    { role: 'system', content: buildSystemPrompt() },
    { role: 'user', content: buildContextBlock(personalContext, relevantSections) },
    ...history.map(h => ({ role: h.role, content: h.content })),
    { role: 'user', content: message }
  ]
  
  // 7. Call OpenAI
  const response = await callOpenAIWithRetry(process.env.OPENAI_API_KEY, {
    model: 'gpt-4o',
    messages,
    temperature: 0.25,
    max_tokens: 800
  })
  
  // 8. Parse e sanitizza
  const content = response.choices[0].message.content
  const { cleanContent, suggestions } = parseResponse(content)
  const sanitized = sanitizeCoachOutput(cleanContent, 'it')
  
  // 9. Consuma HP
  await recordUsage(userId, 1, 'chat-message')
  
  return NextResponse.json({ 
    response: sanitized, 
    suggestions 
  })
}
```

---

## 4. Vincoli AI (Hardcoded)

### System Prompt (estratti critici)
```
SCOPE: solo consulenza tattica eFootball basata su ROSA, PARTITE, ALLENATORE, TATTICA e RAG.

VIETATO:
- Suggerire cambio formazione/modulo a meno che il cliente non lo chieda esplicitamente
- Citare tasti/pulsanti/controller (gameplay solo "cosa fare")
- Usare "perché", "poiché", "dato che" (niente causalità)
- Citare overall numerici (usa: "Messi (Opportunista, forma ↑)" non "Messi (98)")
- Suggerire "potenziare" o "allenare" giocatori (non esiste in eFootball)

OUTPUT:
- 2-4 frasi operative
- Priorità: Istruzioni Individuali → Chi Schierare → Stile Squadra → Formazione
- Cita nomi giocatori dalla rosa
- SUGGERIMENTI: 3 domande cliccabili (approfondimento, gameplay, prossimo passo)
```

---

## 5. RAG (Retrieval Augmented Generation)

### File: `info_rag.md`
Sezioni:
1. Statistiche Giocatori
2. Stili Giocatore (Fissi)
3. Moduli Tattici
4. Stili Squadra (Configurabili)
5. Istruzioni Individuali
6. Calci Piazzati
7. Gameplay e Comandi
8. Abilità Giocatore
9. Competenza Allenatore

### Selezione Contenuto
```javascript
// lib/ragHelper.js
const SECTION_KEYWORDS = {
  '1. STATISTICHE GIOCATORI': ['statistiche', 'overall', 'velocità', 'tiro', 'passaggio'],
  '2. STILI GIOCATORE': ['stile', 'opportunista', 'regista', 'collante'],
  '3. MODULI TATTICI': ['modulo', 'formazione', '4-3-3', '4-2-3-1'],
  // ...
}

export function getRelevantSections(question) {
  const lower = question.toLowerCase()
  const sections = []
  
  for (const [section, keywords] of Object.entries(SECTION_KEYWORDS)) {
    if (keywords.some(k => lower.includes(k))) {
      sections.push(section)
    }
  }
  
  return sections.slice(0, 3)  // Max 3 sezioni
}
```

---

## 6. Sanitizzazione Output

### Rimozione Patterns Proibiti
```javascript
// lib/outputHelper.js
function sanitizeCoachOutput(content, lang = 'it') {
  const markers = lang === 'en'
    ? ['because', 'since', 'due to', 'based on', 'I analyzed']
    : ['poiché', 'dato che', 'in base a', 'ho analizzato', 'ho valutato']
  
  const sentences = content.match(/[^.!?]+[.!?]?/g) || [content]
  const cleaned = []
  
  for (const sentence of sentences) {
    let out = sentence
    for (const marker of markers) {
      const re = new RegExp(`\\b${marker}\\b.*`, 'i')
      out = out.replace(re, '')
    }
    out = out.trim()
    if (out && !out.includes('?')) cleaned.push(out)
  }
  
  return cleaned.join(' ').trim() || content.trim()
}
```

---

## 7. API

| Route | Metodo | Scopo | Costo |
|-------|--------|-------|-------|
| `/api/assistant-chat` | POST | Messaggio chat | 1 HP |

### Request
```json
{
  "message": "Come posso migliorare la difesa?",
  "history": [
    {"role": "user", "content": "..."},
    {"role": "assistant", "content": "..."}
  ],
  "currentPage": "/gestione-formazione"
}
```

### Response
```json
{
  "response": "Con la tua rosa, abbassa la linea difensiva e usa istruzioni 'Rientro Difensivo' per gli esterni. Prova con Messi (Opportunista) supportato da un MED Collante.",
  "suggestions": [
    "Come regolo il pressing con questa difesa?",
    "Quali istruzioni per i miei DC?",
    "Devo cambiare modulo per essere più solido?"
  ]
}
```

---

## 8. Integrazione Palestra Coach

La chat legge i feedback salvati in Palestra Coach per adattare i consigli:

```javascript
// Nel buildPersonalContext
const { data: feedback } = await admin
  .from('user_tactical_feedback')
  .select('insights')
  .eq('user_id', userId)
  .order('created_at', { ascending: false })
  .limit(5)

// Inserito nel prompt come:
// "FEEDBACK PRECEDENTI: L'utente ha segnalato che 4-2-3-1 vs pressing alto non funziona"
```

---

**Ultimo aggiornamento:** 14/02/2026
