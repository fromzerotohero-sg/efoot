# Palestra Coach — Documentazione Enterprise

**Data:** 2026-02-13
**Stato:** Implementato e testato in produzione
**Versione:** 1.0

---

## 1. PANORAMICA

La Palestra Coach e una **chat IA dedicata** che sostituisce il form "Informazioni IA" (AiInfoModal). Raccoglie dati profilo e feedback post-partita tramite conversazione naturale, non form.

**Principio fondamentale:** La Palestra Coach ASCOLTA e RACCOGLIE. Non da mai consigli tattici — per quelli c'e la chat principale.

---

## 2. ARCHITETTURA

### 2.1 Componenti del sistema

```
Frontend                          Backend                         Database
---------                        ---------                        ---------
CoachFeedbackChat.jsx     →  /api/coach-feedback-chat    →  user_profiles (lettura)
  (modal arancione)              (1 credito/msg)               matches (lettura)
       │                                                        
       │ "Salva e chiudi"                                       
       ▼                                                        
  /api/save-coach-feedback  →  OpenAI (estrazione JSON)  →  user_profiles (scrittura)
       (1 credito)                                           user_tactical_feedback (insert)
       │                                                        
       ▼                                                        
  /api/refresh-diagnostic   →  diagnosticBuilder.js      →  user_diagnostic_cache (upsert)
       │                                                        
       ▼                                                        
  Chat principale (assistant-chat) legge il cache aggiornato
```

### 2.2 Flusso dati completo

```
1. Utente apre Palestra Coach (bottone arancione in dashboard)
2. Il componente carica il profilo da Supabase per determinare la modalita
3. L'IA apre la conversazione in base alla modalita (profilo/feedback/aggiornamento)
4. Ogni messaggio → POST /api/coach-feedback-chat → OpenAI → risposta (1 credito)
5. Utente clicca "Salva e chiudi"
6. Frontend invia tutta la conversazione a POST /api/save-coach-feedback
7. GPT estrae in un'unica chiamata:
   - profile_updates: campi profilo menzionati (con validazione whitelist)
   - tactical_insights: debolezze, punti di forza, lezioni apprese
   - conversation_summary: riassunto 1-2 frasi
   - outcome: win/loss/draw (se menzionato)
8. Backend salva:
   - profile_updates → UPDATE user_profiles (stessa whitelist di save-ai-info)
   - Tutto → INSERT user_tactical_feedback
9. Frontend chiama POST /api/refresh-diagnostic
10. Il diagnostic cache viene rigenerato con la sezione ESPERIENZA COACH
11. La chat principale legge il cache aggiornato alle prossime domande
12. AI Knowledge Score aggiornato: componente coach_training (max 10%)
```

---

## 3. LE 3 MODALITA

La chat determina automaticamente la modalita in base allo stato del profilo e delle partite.

### 3.1 Modo PROFILO (profile_setup)

**Quando:** Meno di 3 dei 6 campi tecnici compilati (platform, connection_quality, pass_level, smart_assist, input_delay, ai_weak_point).

**Messaggio apertura:** "Ciao! Sono l'assistente della Palestra Coach. Per conoscerti meglio, dimmi un po' di te: su che piattaforma giochi? Come va la connessione? Che livello di passaggio usi?"

**Obiettivo:** Raccogliere le info di base che prima venivano dal form AiInfoModal.

**Suggerimenti rapidi:** "Gioco su console", "Ho problemi in difesa", "Uso PA2"

### 3.2 Modo FEEDBACK (feedback)

**Quando:** Profilo completo (>=3 campi tecnici) + almeno una partita recente.

**Messaggio apertura:** "Ciao [nome]! Vedo che hai giocato [formazione] vs [avversario] — [risultato]. Raccontami com'e andata!"

**Obiettivo:** Raccogliere feedback tattici sulla partita per arricchire il coaching.

**Suggerimenti rapidi:** "E' andata bene", "Non ha funzionato", "Ho seguito il tuo consiglio"

### 3.3 Modo AGGIORNAMENTO (update)

**Quando:** Profilo completo, nessuna partita recente.

**Messaggio apertura:** "Ciao [nome]! C'e qualcosa di nuovo che vuoi dirmi? Hai cambiato qualcosa nel tuo gioco?"

**Obiettivo:** Raccogliere aggiornamenti generici (cambio stile, nuove difficolta, ecc.)

**Suggerimenti rapidi:** "Ho cambiato qualcosa nel mio gioco", "Ho difficolta con qualcosa", "Voglio aggiornare le mie info"

---

## 4. SYSTEM PROMPT (BLINDATURA)

La chat e blindata con divieti assoluti:

```
DIVIETI ASSOLUTI (non violare MAI):
- NON dare consigli tattici, suggerimenti di formazione, o raccomandazioni di gioco
- NON suggerire cambi di giocatori, stili, o strategie
- NON rispondere a domande tattiche: rispondi "Per consigli tattici usa la chat principale"
- NON fare analisi: il tuo ruolo e solo raccogliere dati dal cliente
```

**Se l'utente chiede consigli:** "Ottima domanda! Chiedilo nella chat principale, li posso aiutarti con consigli tattici personalizzati."

**Nessun materiale tattico caricato:** La chat NON ha accesso a RAG (info_rag.md), COACH_AI_POLICIES, engine capsule, o suggestion rules. Non ha nemmeno il materiale per dare consigli.

---

## 5. ESTRAZIONE DUALE (save-coach-feedback)

Quando l'utente chiude la chat, l'intera conversazione viene inviata a GPT per un'estrazione strutturata.

### 5.1 Prompt di estrazione

GPT riceve la conversazione completa + contesto partita e produce JSON con:

```json
{
  "profile_updates": {
    "platform": "console",
    "ai_weak_point": "defence"
  },
  "tactical_insights": [
    {"type": "weakness", "text": "Ronaldo inattivo nel 4-2-1-3 — troppo isolato in attacco"},
    {"type": "strength", "text": "Contropiede con Mbappe efficace in transizione"}
  ],
  "conversation_summary": "Attilio ha vinto 6-1 ma Ronaldo era fermo. Attaccanti efficaci.",
  "outcome": "win"
}
```

### 5.2 Validazione whitelist (backend)

I `profile_updates` vengono validati con la stessa WHITELIST di `save-ai-info`:

```javascript
{
  connection_quality: ['good', 'unstable', 'lag'],
  slow_opponent_connection_issues: ['yes', 'no', 'sometimes'],
  input_delay: ['yes', 'no', 'sometimes'],
  pass_level: ['pa1', 'pa2', 'pa3'],
  smart_assist: ['yes', 'no'],
  platform: ['console', 'pc', 'mobile', 'other'],
  ai_weak_point: ['defence', 'attack', 'set_pieces', 'transitions', 'final_minutes']
}
```

Se GPT produce un valore non valido (es. `"piattaforma": "playstation"`), viene **scartato silenziosamente**. Per `ai_weak_point` e accettato anche testo libero (max 60 char).

### 5.3 Insight azionabili

Il prompt istruisce GPT a produrre insight specifici e collegati a giocatori/formazione:
- BUONO: "Ronaldo inattivo nel 4-2-1-3 — troppo isolato in attacco"
- CATTIVO: "non funzionava" (troppo vago)

---

## 6. COME L'IA USA I FEEDBACK

### 6.1 Nel diagnostic (blocco ISTRUZIONI)

Il diagnostic cache contiene un blocco ISTRUZIONI letto dall'IA a ogni conversazione:

```
ESPERIENZA COACH (se presente): Questi sono feedback REALI del cliente
sui tuoi consigli precedenti. DEVI tenerne conto: NON ripetere errori
segnalati (Debolezza), RINFORZA cio che ha funzionato (Forza), ADATTA
i consigli in base alle lezioni apprese (Lezione). Se il cliente ha
segnalato un problema con un giocatore/formazione, proponi alternative
concrete dalla rosa.
```

### 6.2 Nella sezione ESPERIENZA COACH (formato direttivo)

La sezione non lista passivamente, ma comanda:

```
Esperienza Coach (feedback Palestra Coach): 3 sessioni feedback negli ultimi 30 giorni.
EVITA (il cliente ha segnalato problemi): Ronaldo inattivo nel 4-2-1-3 [4-2-1-3, vs Cairo, win]
RINFORZA (ha funzionato bene): Attaccanti efficaci in transizione [4-2-1-3, vs Cairo, win]
ADATTA (lezioni apprese): 4-3-3 meglio del 4-2-1-3 vs pressing alto
```

### 6.3 Impatto sulla chat principale

Quando l'utente chiede "Come schiero Ronaldo?", l'IA:
1. Legge "EVITA: Ronaldo inattivo nel 4-2-1-3"
2. Legge le istruzioni "proponi alternative concrete dalla rosa"
3. Risponde con alternative specifiche dalla rosa reale, evitando il 4-2-1-3 per Ronaldo

---

## 7. TABELLA DATABASE

### user_tactical_feedback

```sql
CREATE TABLE user_tactical_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  match_id UUID REFERENCES matches(id) ON DELETE SET NULL,
  session_type TEXT NOT NULL DEFAULT 'feedback'
    CHECK (session_type IN ('profile_setup', 'feedback', 'update')),
  formation_played TEXT,
  style_played TEXT,
  opponent_name TEXT,
  outcome TEXT CHECK (outcome IS NULL OR outcome IN ('win', 'loss', 'draw')),
  conversation_summary TEXT,
  insights JSONB NOT NULL DEFAULT '[]'::jsonb,
  profile_fields_updated JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**RLS:** SELECT, INSERT, DELETE per `(SELECT auth.uid()) = user_id`. Niente UPDATE (i feedback sono immutabili).

**Indici:**
- `idx_user_tactical_feedback_user_recent` su `(user_id, created_at DESC)` — per query ultimi 30gg nel diagnostic
- `idx_user_tactical_feedback_match` su `(match_id) WHERE match_id IS NOT NULL` — per join con matches

**Relazioni:**
- `user_id` → `auth.users(id)` ON DELETE CASCADE
- `match_id` → `matches(id)` ON DELETE SET NULL (feedback sopravvive alla cancellazione partita)

---

## 8. AI KNOWLEDGE SCORE — COMPONENTE coach_training

### 8.1 Peso: max 10%

Aggiunto ribilanciando i pesi esistenti:
- `usage`: 10% → 5% (-5%)
- `success`: 15% → 10% (-5%)
- `coach_training`: 0% → 10% (+10%)
- Pool totale: 125% (invariato, cap a 100)

### 8.2 Calcolo

```javascript
function calculateCoachTrainingScore(feedbackRows) {
  const count = feedbackRows.length // ultimi 30 giorni
  if (count === 0) return 0
  if (count === 1) return 3
  if (count === 2) return 5
  if (count === 3) return 7
  return 10 // 4+ sessioni
}
```

### 8.3 Breakdown esempio

```json
{
  "profile": 20,
  "roster": 22.5,
  "matches": 3,
  "patterns": 15,
  "coach": 10,
  "usage": 0.5,
  "success": 0,
  "coach_training": 5
}
```

---

## 9. COSTI

| Azione | Crediti | Note |
|--------|---------|------|
| Messaggio chat Palestra Coach | 1 | Stesso peso di assistant-chat |
| Estrazione al salvataggio | 1 | 1 sola chiamata GPT per estrarre tutto |
| **Sessione tipica (4-5 msg + save)** | **5-6** | **~3% del budget mensile (200)** |

Credit weights in `lib/creditService.js`:
```javascript
'coach-feedback-chat': 1,
'save-coach-feedback': 1
```

---

## 10. FILE DEL SISTEMA

### 10.1 Creati

| File | Scopo |
|------|-------|
| `components/CoachFeedbackChat.jsx` | Componente chat modal (fork di AssistantChat, stile arancione) |
| `app/api/coach-feedback-chat/route.js` | API messaggi chat (system prompt blindato, carica profilo + partita) |
| `app/api/save-coach-feedback/route.js` | API salvataggio (estrazione duale, whitelist, save, refresh diagnostic) |
| `migrations/create_user_tactical_feedback.sql` | Migration tabella |

### 10.2 Modificati

| File | Modifica |
|------|----------|
| `app/page.jsx` | Bottone "Palestra Coach" sostituisce "Informazioni IA", mount componente |
| `lib/diagnosticBuilder.js` | Sezione ESPERIENZA COACH direttiva (EVITA/RINFORZA/ADATTA) + istruzioni nel blocco regole |
| `app/api/refresh-diagnostic/route.js` | Query user_tactical_feedback nel Promise.all |
| `lib/aiKnowledgeHelper.js` | Componente coach_training (max 10%), ribilanciamento pesi |
| `lib/creditService.js` | +2 credit weights |
| `lib/rateLimiter.js` | +2 rate limit configs |
| `lib/i18n.js` | Traduzioni IT/EN Palestra Coach |

### 10.3 Non modificati (ma collegati)

| File | Relazione |
|------|-----------|
| `app/api/assistant-chat/route.js` | Legge il diagnostic cache (che ora contiene ESPERIENZA COACH) — nessuna modifica necessaria |
| `app/api/generate-countermeasures/route.js` | Non impattato — non legge feedback |
| `app/api/analyze-match/route.js` | Non impattato — non legge feedback |
| `components/AiInfoModal.jsx` | Mantenuto nel codebase come fallback, non piu montato in dashboard |
| `app/api/supabase/save-ai-info/route.js` | Mantenuto come fallback API, nessuna UI |

---

## 11. SICUREZZA

| Aspetto | Implementazione |
|---------|-----------------|
| Autenticazione | Bearer JWT via validateToken (identico a tutte le altre route) |
| Rate limit | 30 req/min (chat), 5 req/min (save) |
| RLS | SELECT, INSERT, DELETE per owner. Niente UPDATE (immutabile). |
| Validazione profilo | Stessa WHITELIST di save-ai-info — valori non validi scartati |
| Blindatura consigli | System prompt con DIVIETI ASSOLUTI, nessun materiale tattico (RAG, policies) |
| Crediti | 1 credito/messaggio + 1 estrazione — tracciato in credit_transactions |

---

## 12. QUANDO SI AGGIORNA IL DIAGNOSTIC

| Evento | Chi chiama refresh-diagnostic |
|--------|-------------------------------|
| Salvataggio partita | match/new/page.jsx (frontend) |
| Cancellazione partita | app/page.jsx (frontend) |
| Modifica nome avversario | app/page.jsx (frontend) |
| **Salvataggio Palestra Coach** | **CoachFeedbackChat.jsx (frontend)** |

**Nota:** Il diagnostic NON si aggiorna automaticamente quando cambiano rosa, allenatore, o impostazioni tattiche. Per questo la chat principale legge le tattiche LIVE da team_tactical_settings a ogni messaggio (bypass cache).

---

## 13. ALLINEAMENTO TRA I 3 SISTEMI IA

Tutti e 3 i sistemi IA leggono i feedback della Palestra Coach per garantire coerenza:

```
                        user_tactical_feedback
                               │
            ┌──────────────────┼──────────────────┐
            ▼                  ▼                  ▼
     CHAT PRINCIPALE     CONTROMISURE        ANALYZE-MATCH
     (assistant-chat)    (generate-          (analyze-match)
                          countermeasures)
     
     Legge via:          Legge via:          Legge via:
     diagnostic cache    query diretta       query diretta
     (sezione            (sezione            (iniettato in
      ESPERIENZA COACH)   ESPERIENZA UTENTE)  historyAnalysis)
     
     Formato:            Formato:            Formato:
     EVITA/RINFORZA/     EVITA/RINFORZA/     EVITA/RINFORZA
     ADATTA              ADATTA + profilo    
                         IA + game stats
```

**Risultato:** Se l'utente dice nella Palestra Coach "il 4-3-3 non funziona vs pressing", tutti e 3 i sistemi ne tengono conto:
- La chat non suggerisce 4-3-3 vs pressing
- Le contromisure evitano 4-3-3 come consiglio vs pressing
- L'analisi partita nota la coerenza/incoerenza con il feedback precedente

### Dati aggiuntivi letti dalle contromisure (non dalla chat)

Le contromisure leggono anche:
- `user_profiles` (connessione, input delay, pass level, punto debole) — per adattare i suggerimenti allo stile reale del giocatore
- `user_game_analysis` (statistiche di gioco) — per capire come gioca realmente (es. 47% gol da filtrante = suggerire formazioni con trequartista)

---

## 14. LIMITAZIONI CONOSCIUTE

1. **Qualita insight dipende dalla conversazione:** Se l'utente da risposte brevi, gli insight estratti saranno vaghi. Il prompt di estrazione incentiva insight specifici con esempi, ma non puo garantirlo.

2. **Nessun tracking "consiglio dato → feedback ricevuto":** Il sistema non sa quale consiglio specifico della chat principale l'utente sta commentando nella Palestra Coach. Questo richiederebbe persistenza della storia chat (non implementata).

3. **Limite 5 feedback nel diagnostic:** Il diagnostic include solo gli ultimi 5 feedback (30 giorni). Feedback piu vecchi non vengono letti dall'IA ma restano in tabella.

4. **Costo crediti:** Ogni sessione Palestra Coach costa 5-6 crediti. Su un budget di 200/mese, un utente attivo (8 sessioni/mese) usa ~48 crediti (24% del budget).

5. **Analyze-match e manuale:** Il riassunto partita (4 crediti) NON si genera automaticamente. L'utente deve cliccare "Analizza" nella pagina dettaglio partita. La chat principale puo dare la stessa analisi on-demand gratuitamente (1 credito per messaggio).
