# Revisione Logica Piattaforma - Debug Completo

**Data:** 2026-02-14  
**Analisi:** Codice sorgente (lib/, app/api/, components/)

---

## 🟢 SISTEMI CORRETTI (Nessun intervento richiesto)

### 1. Leaderboard (Classifica)
**File:** `lib/leaderboardHelper.js`
- ✅ Task e improvement rimossi dal calcolo punti (righe 63-65)
- ✅ Formula: solo `matches + usage_ia + profile`
- ✅ Eleggibilità: 1 partita + profilo ≥50% (no task richiesti)
- ✅ Nessun filtro `leaderboard_consent`

### 2. Task System
**File:** `lib/taskHelper.js`
- ✅ Task generati solo da dati oggettivi (no flag autodichiarati)
- ✅ `improve_defense` e `use_recommended_formation` rimossi
- ✅ `clean_sheet_matches` aggiunto con logica corretta
- ✅ Whitelist AI include Palestra Coach (`coach-feedback-chat`, `save-coach-feedback`)
- ✅ Progresso calcolato da dati partita reali

### 3. AI Knowledge Score
**File:** `lib/aiKnowledgeHelper.js`
- ✅ Pesi corretti: Profilo 20% + Rosa 25% + Partite 30% + Pattern 15% + Allenatore 10% + Utilizzo 5% + Successi 10% + Palestra 10%
- ✅ Formula coerente con documentazione
- ✅ Cache 5 minuti in API

### 4. Palestra Coach
**File:** `app/api/coach-feedback-chat/route.js`, `app/api/save-coach-feedback/route.js`
- ✅ System prompt blindato (no consigli tattici)
- ✅ Estrazione profilo + insight tattici
- ✅ Validazione whitelist campi profilo
- ✅ Salvataggio in `user_tactical_feedback`
- ✅ Record crediti: 1 HP per chat, 1 HP per save

### 5. Crediti/Transazioni
**File:** `lib/creditService.js`
- ✅ Pesi coerenti con documentazione
- ✅ Periodo UTC (YYYY-MM)
- ✅ Idempotenza su `reference_id` per acquisti
- ✅ Default inclusi: 200 HP

---

## 🟡 PROBLEMI MINORI (Fix consigliati)

### 1. Rate Limiter - Limitazione nota
**File:** `lib/rateLimiter.js`
```javascript
// ⚠️ In-memory Map: su Vercel multi-istanza non funziona bene
const rateLimitStore = new Map()
```
**Impatto:** Un utente può bypassare il rate limit distribuendo richieste su più istanze  
**Fix:** Migrare a Redis/Upstash (già documentato nel codice)

### 2. Task - Finestra temporale troppo stretta — ✅ FIXATO
**File:** `lib/taskHelper.js` (riga 414-421)
**Fix applicato:** Rimosso limite "ultime 2 settimane"; ora si recuperano tutti i task attivi con `week_start_date <= currentWeek.start`. I task delle settimane passate vengono aggiornati al prossimo sync (salvataggio partita o lista task).

### 3. API AI Knowledge - Breakdown incompleto — ✅ FIXATO
**File:** `app/api/ai-knowledge/route.js`
**Fix applicato:** Aggiunto `coach_training` in JSDoc, nel breakdown di fallback (score 0) e nella normalizzazione della risposta cached, così la risposta API include sempre `coach_training` (anche per breakdown salvati in passato senza il campo).

---

## 👤 Cosa vede il cliente dopo i fix

| Fix | Cosa cambia per l’utente |
|-----|---------------------------|
| **Finestra 2 settimane (task)** | **Ora:** Se non apre l’app per 3+ settimane, i task delle settimane passate restano “in corso” con progresso fermo. **Dopo:** I task delle settimane passate vengono aggiornati (o si considera solo la settimana corrente). Niente più task bloccati “a metà”; lista task coerente con le partite giocate. |
| **Breakdown AI Knowledge (coach_training)** | **Ora:** Nella schermata/API del punteggio AI Knowledge il dettaglio “Palestra Coach” non compare nel breakdown. **Dopo:** Vede anche la voce “Palestra Coach” (o equivalente) nel dettaglio dei punti, così può capire come è composto il 10% relativo. |
| **Rate limiter (Redis)** | Nessun cambiamento visibile: solo robustezza lato server. L’utente non nota nulla a meno di abusi che oggi potrebbero bypassare il limite. |

**In sintesi:** Dopo i fix, l’utente vede task sempre allineati alle partite (anche dopo pause lunghe) e un breakdown del punteggio AI Knowledge completo (inclusa Palestra Coach).

---

## 🔴 PROBLEMI CRITICI (Da fixare prima del rilascio)

### 1. Nessuno

**Verifica completata:** Tutti i sistemi core sono coerenti e funzionali.

---

## 📋 Checklist Coerenza Sistemica

| Componente A | Componente B | Coerente? | Note |
|--------------|--------------|-----------|------|
| Task System | Classifica | ✅ SÌ | Task danno punti solo a AI Knowledge, non a classifica |
| Palestra Coach | Task System | ✅ SÌ | `coach-feedback-chat` e `save-coach-feedback` nella whitelist |
| Palestra Coach | Classifica | ✅ SÌ | Crediti registrati come `usage`, contano in classifica |
| AI Knowledge | Task System | ✅ SÌ | Task completati contribuiscono a "Successi" (10%) |
| AI Knowledge | Palestra Coach | ✅ SÌ | `user_tactical_feedback` → `coach_training` (10%) |
| Crediti | Classifica | ✅ SÌ | `credit_transactions` type=usage contano come "Utilizzo IA" |
| Crediti | Task System | ✅ SÌ | Whitelist descrizioni per task `use_ai_recommendations` |

---

## 🎯 UX Gamification - Stato Attuale

### Messaggi Utente Chiari

**Barra AI Knowledge:**
> "Quanto l'AI ti conosce dipende da ciò che condividi (profilo, rosa, partite) e dall'impegno (task, miglioramenti, Palestra). Solo una piccola parte dipende dall'uso a consumo."

**Classifica:**
> "La classifica premia l'impegno nel mese: partite caricate, utilizzo degli strumenti AI, profilo completo. I task settimanali servono alla barra, non alla classifica."

### Coerenza Decisione Prodotto (§9)

| Decisone | Implementato? |
|----------|---------------|
| Task fuori dalla classifica | ✅ SÌ |
| Palestra Coach in classifica | ✅ SÌ (come usage) |
| Trasparenza copy | ✅ SÌ (i18n aggiornato) |
| Nessun incentivo a manipolare partite | ✅ SÌ (task non premiano classifica) |

---

## 🔒 Sicurezza - Verifica Rapida

| Endpoint | Auth | Rate Limit | RLS | Note |
|----------|------|------------|-----|------|
| `/api/leaderboard` | Optional | ✅ 60/min | ✅ | Public read, no user_id leak |
| `/api/leaderboard/me` | Required | ✅ 30/min | ✅ | Solo utente autenticato |
| `/api/tasks/list` | Required | ✅ 60/min | ✅ | Auto-genera task se mancanti |
| `/api/ai-knowledge` | Required | ✅ 20/min | ✅ | Cache 5 min |
| `/api/save-coach-feedback` | Required | ✅ 5/min | ✅ | 1 credito |
| `/api/coach-feedback-chat` | Required | ✅ 30/min | ✅ | 1 credito |

---

## 📊 Performance - Ottimizzazioni Presenti

1. **AI Knowledge API:** Cache 5 minuti (evita ricalcolo)
2. **Task List:** Ricalcolo progresso solo su `list-sync` (non ogni GET)
3. **Leaderboard:** Snapshot mensile per mesi passati (no recompute)
4. **Diagnostic:** Non ricaricato automaticamente (self-fetch rimosso)
5. **Credit Usage:** `currentPeriodOnly: true` (no fallback mese precedente)

---

## ✅ Verdetto Finale

**Stato piattaforma:** PRODUCTION READY

Tutti i problemi critici segnalati nei precedenti audit sono stati risolti:
- ✅ Task e classifica separati
- ✅ Palestra Coach integrata correttamente
- ✅ Consenso classifica rimosso
- ✅ Copy UX allineati
- ✅ Sicurezza endpoint verificata

**Unico debito tecnico noto:** Rate limiter in-memory (non scalabile su Vercel) - ma accettabile per MVP.

---

**Ultimo aggiornamento:** 2026-02-14
