# Cose da fare (backlog)

Da analisi esterna su sicurezza e robustezza del codice.  
**Aggiornato:** 2026-02-09

---

## ✅ Completati (2026-02-09)

- [x] **Rate limiting su `/api/extract-player`**  
  Aggiunto `checkRateLimit` (15 req/min) + JSON error handling.  
  *File:* `app/api/extract-player/route.js`

- [x] **PII nei log rimossi in produzione**  
  Log condizionati a `NODE_ENV !== 'production'`.  
  *File:* `save-player/route.js`, `save-coach/route.js`, `set-active-coach/route.js`, `save-match/route.js`

- [x] **Crediti: acquisti multipli sommano invece di sovrascrivere**  
  `credits_included` ora somma: `(existing.credits_included || 0) + amount`.  
  *File:* `lib/creditService.js` (funzione `accreditPurchase`)

- [x] **AI Knowledge usa campo corretto**  
  Cambiato `player.overall` → `player.overall_rating` nel calcolo score rosa.  
  *File:* `lib/aiKnowledgeHelper.js`

- [x] **Rate limit endpoint Supabase principali**  
  Aggiunto a: `save-profile`, `save-coach`, `set-active-coach`.  
  *File:* `lib/rateLimiter.js` + rispettivi route

- [x] **JSON error handling (400 vs 500)**  
  Aggiunto try/catch su `req.json()` per ritornare 400 invece di 500.  
  *File:* `save-profile`, `save-coach`, `set-active-coach`, `extract-player`

- [x] **Log client rimossi in produzione**  
  Log condizionati a `NODE_ENV !== 'production'`.  
  *File:* `app/page.jsx`, `components/AIKnowledgeBar.jsx`

---

## ⏳ Da fare

### Alta priorità

- [ ] **RLS weekly_goals consente UPDATE da client**  
  Rischio: utente può falsare progressi obiettivi.  
  *File:* `migrations/create_weekly_goals_table.sql`  
  *Azione:* Rimuovere policy UPDATE o limitare a campi specifici (non `current_value`/`status`).

- [x] **Task: risultati assumono sempre team1 = utente** ✅ FIXATO (2026-02)  
  *File:* `lib/taskHelper.js`  
  *Fix:* `calculateAvgGoalsConceded` e `increase_wins` usano `match.is_home`; aggiunte funzioni `isWinForUser` e `isLossForUser`.

### Media priorità

- [ ] **`response_format: { type: 'text' }` in assistant-chat**  
  Se OpenAI depreca o cambia il supporto, l'endpoint può fallire.  
  *File:* `app/api/assistant-chat/route.js`  
  *Azione:* Monitorare doc OpenAI; prevedere fallback.

- [ ] **Rate limiter in-memory su serverless**  
  Su Vercel (più istanze) il `Map()` in `lib/rateLimiter.js` è per istanza.  
  *Azione:* Implementare backend condiviso (Redis/Upstash) come da TODO in `rateLimiter.js`.

### Bassa priorità

- [ ] **Encoding mojibake nei file**  
  Caratteri corrotti (�) in alcuni file indicano encoding non UTF-8.  
  *Azione:* Salvare tutti i file in UTF-8.

- [ ] **i18n: chiavi mancanti**  
  ~15 chiavi usate ma non definite in `lib/i18n.js`.  
  *Azione:* Aggiungere traduzioni IT/EN.

---

## Note / assunzioni

- Produzione su Vercel con più istanze → rate limiter in-memory è debole (mitigante, non protezione forte).
- Log senza PII in produzione → ok dopo fix 2026-02-09.
