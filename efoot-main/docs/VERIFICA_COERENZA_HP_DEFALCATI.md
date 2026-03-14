# Verifica coerenza HP defalcati

**Controllo:** (1) Dove si spendono soldi (OpenAI) → viene sempre conteggiato? (2) Pesi in `CREDIT_WEIGHTS` vs importi usati in `recordUsage`. (3) Solo successo → addebito.

---

## 0. Dove spendi soldi e non viene conteggiato? → **Mai**

**Tutte le chiamate a OpenAI** passano da:
- `app/api/assistant-chat` → `recordUsage(..., 1, 'assistant-chat')`
- `app/api/coach-feedback-chat` → `recordUsage(..., 1, 'coach-feedback-chat')`
- `app/api/save-coach-feedback` → `recordUsage(..., 1, 'save-coach-feedback')`
- `app/api/extract-player` → `recordUsage(..., 2, 'extract-player')`
- `app/api/extract-coach` → `recordUsage(..., 2, 'extract-coach')`
- `app/api/extract-match-data` → `recordUsage(..., 2, 'extract-match-data')` (per sezione)
- `app/api/extract-formation` → `recordUsage(..., 3, 'extract-formation')`
- `app/api/extract-game-analysis` → `recordUsage(..., 3, 'extract-game-analysis')` (per upload)
- `app/api/generate-countermeasures` → `recordUsage(..., 3, 'generate-countermeasures')`
- `app/api/analyze-match` → `recordUsage(..., 4, 'analyze-match')`

Non esiste nessun altro punto nel codice che chiami l'API OpenAI (né `fetch` a api.openai.com né `callOpenAIWithRetry`).
**Conclusione: non c'è nessun posto in cui si spendano soldi (OpenAI) senza che venga registrato l'uso con `recordUsage`.**

---

## 1. Peso vs uso (tutto coerente)

| Operazione | CREDIT_WEIGHTS | recordUsage in API | File:riga |
|------------|----------------|---------------------|-----------|
| assistant-chat | 1 | 1 | assistant-chat/route.js:967 |
| coach-feedback-chat | 1 | 1 | coach-feedback-chat/route.js:253 |
| save-coach-feedback | 1 | 1 | save-coach-feedback/route.js:272 |
| extract-player | 2 | 2 | extract-player/route.js:372 |
| extract-coach | 2 | 2 | extract-coach/route.js:338 |
| extract-match-data | 2 | 2 (per singola sezione) | extract-match-data/route.js:613 |
| extract-formation | 3 | 3 | extract-formation/route.js:309 |
| extract-game-analysis | 3 | 3 (per upload, 1 o 2 immagini) | extract-game-analysis/route.js:233 |
| generate-countermeasures | 3 | 3 | generate-countermeasures/route.js:638 |
| analyze-match | 4 | 4 | analyze-match/route.js:1320 |

Ogni route che chiama OpenAI e fa `recordUsage` usa **esattamente** il valore definito in `CREDIT_WEIGHTS`. Nessuna route OpenAI chiama `recordUsage` con un peso diverso.

---

## 2. Addebito solo in caso di successo

- **assistant-chat:** `recordUsage` dopo risposta valida e sanitizedContent, prima del return. In caso di errore si va in catch → nessun addebito.
- **coach-feedback-chat:** `recordUsage` dopo `response.json()` e prima del return. Se `callOpenAIWithRetry` lancia → catch → nessun addebito.
- **save-coach-feedback:** `recordUsage` dopo insert in `user_tactical_feedback` (salvataggio riuscito). Se l'estrazione OpenAI fallisce si usa `extracted = {}` ma si procede al save; si addebita 1 HP quando il save va a buon fine (comportamento coerente: si paga per "salva feedback", non per la sola chiamata OpenAI).
- **extract-match-data:** `recordUsage` dopo normalizzazione, prima del return. In caso di errore OpenAI si fa return con errore (righe 559–561) → nessun addebito.
- **extract-player, extract-coach, extract-formation:** `recordUsage` solo dopo validazione/normalizzazione e prima del return. In caso di errore/return anticipato → nessun addebito.
- **extract-game-analysis:** `recordUsage` dopo upsert su DB. In caso di errore nel try (parse/merge) si fa return con errore → nessun addebito.
- **generate-countermeasures:** `recordUsage` dopo elaborazione contromisure, prima del return. In catch → nessun addebito.
- **analyze-match:** `recordUsage` dopo costruzione dello summary, prima del return. In catch → nessun addebito.

**Conclusione:** Gli HP vengono addebitati **solo quando l'operazione va a buon fine** (risposta utile e, dove previsto, salvataggio completato). Nessun addebito in caso di 4xx/5xx o errore OpenAI.

---

## 3. Route che non usano OpenAI (nessun addebito, corretto)

- **refresh-diagnostic:** Solo lettura DB + `buildDiagnostic`, nessuna chiamata OpenAI → nessun `recordUsage`. Corretto.
- **save-match, update-match, save-profile, save-formation-layout, tasks/list, tasks/generate, leaderboard, ai-knowledge, credits/usage, credits/transactions:** Nessuna chiamata OpenAI che consumi crediti → nessun `recordUsage`. Corretto.

---

## 4. Whitelist task "use_ai_recommendations" vs descrizioni transazioni

In `recordUsage` si chiama `recordTransaction(..., operationType, null)` quindi in `credit_transactions` la colonna `description` contiene esattamente il tipo operazione (es. `assistant-chat`, `extract-player`).

La whitelist in `lib/taskHelper.js` (`AI_USAGE_DESCRIPTIONS_WHITELIST`) include tutte le operazioni che consumano HP:

```js
['assistant-chat', 'analyze-match', 'generate-countermeasures', 'extract-formation', 'extract-match-data', 'extract-game-analysis', 'extract-player', 'extract-coach', 'coach-feedback-chat', 'save-coach-feedback']
```

**Nota:** `extract-player` e `extract-coach` sono in whitelist; ogni utilizzo IA conta per il task.

Quindi:
- **Classifica:** Tutte le transazioni `type = 'usage'` nel mese contano come "Utilizzo IA". Coerente.
- **Task "usa IA almeno N volte":** Contano tutte le operazioni nella whitelist sopra. Coerente.

---

## 5. Riepilogo

| Verifica | Esito |
|----------|--------|
| Pesi `CREDIT_WEIGHTS` = importi usati in `recordUsage` | Coerente |
| Addebito solo su successo (nessun addebito su errore) | Coerente |
| Nessuna route OpenAI senza `recordUsage` | Coerente |
| Nessuna route senza OpenAI con `recordUsage` | Coerente |
| Whitelist task vs description | Coerente; whitelist include extract-player e extract-coach |

**Conclusione:** Gli HP defalcati sono coerenti con i pesi definiti e con la logica "solo successo = addebito". La whitelist del task "use_ai_recommendations" include tutte le operazioni che consumano HP (inclusi extract-player e extract-coach).

---

## 6. Coerenza peso con costo reale OpenAI

I pesi (1 / 2 / 3 / 4 HP) sono unità di consumo, non 1:1 con €. In generale: 1 HP = chat testo (costo minore); 2 HP = una vision (un'immagine); 3 HP = vision multipla o generazione strutturata; 4 HP = analyze-match (contesto grande). La scala è coerente: dove si spende di più, peso più alto. Per ricalibrare sui costi reali serve il billing OpenAI (token/immagini per modello).
