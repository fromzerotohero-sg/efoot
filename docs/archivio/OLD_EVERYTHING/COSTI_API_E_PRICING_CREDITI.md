# Costi API e pricing crediti – Fase test (senza Stripe)

**Data:** 2026-02-03  
**Ultima verifica:** 2026-02 — verificare [OpenAI Pricing](https://platform.openai.com/docs/pricing) per cifre attuali prima di decisioni commerciali.  
**Obiettivo:** Mappare ogni punto del codice che genera costo (OpenAI), definire pesi in crediti e prezzo con ricarico. Nessuna integrazione Stripe in questa fase: solo contatori/test per capire.

**Vedi anche:** `docs/03-BUSINESS/VALUTAZIONE_ECONOMICA_PIATTAFORMA.md` per valutazione economica completa.

---

## 1. Dove nasce il costo (solo OpenAI)

Tutti i costi attuali vengono da **OpenAI Chat/Completions** (modello `gpt-4o`). Nessun altro servizio a consumo (Supabase ha piano, non pay-per-call).

| Route / file | Cosa fa | Chiamate OpenAI | max_tokens | Note |
|--------------|---------|-----------------|------------|------|
| **POST /api/assistant-chat** | Chat coach IA | 1 per messaggio | 450 | Prompt lungo (RAG + contesto + history). Input ~2k–8k token. |
| **POST /api/analyze-match** | Analisi partita (riassunto bilingue) | 1 | 3000 | Prompt molto lungo (match + RAG). Output fino a 3k token. |
| **POST /api/generate-countermeasures** | Contromisure vs formazione avversaria | 1 | 2000 | Prompt lungo (formazione + RAG). |
| **POST /api/extract-formation** | Estrazione formazione da screenshot | 1 | 4500 | Vision: immagine + prompt. Output fino a 4.5k. |
| **POST /api/extract-coach** | Estrazione allenatore da screenshot | 1 | 2000 | Vision: immagine + prompt. `fetch` diretto (non openaiHelper). |
| **POST /api/extract-match-data** | Estrazione dati partita (per sezione) | **1 per sezione** | 2000 | 5 sezioni: `player_ratings`, `team_stats`, `attack_areas`, `ball_recovery_zones`, `formation_style`. Wizard match = fino a 5 chiamate. |
| **POST /api/extract-player** | Estrazione giocatore da screenshot | 1 | 2500 | Vision: immagine + prompt. |
| **POST /api/coach-feedback-chat** | Palestra Coach: messaggio chat | 1 per messaggio | 400 | Prompt leggero (no RAG, no engine). Input ~1k-3k token. |
| **POST /api/save-coach-feedback** | Palestra Coach: estrazione duale al salvataggio | 1 | 800 | Estrae profile_updates + tactical_insights dalla conversazione. json_object mode. |

**Non generano costo OpenAI:**
- `/api/ai-knowledge` (GET) – solo Supabase
- `/api/tasks/generate` – solo taskHelper + Supabase
- `/api/tasks/list` – solo Supabase
- `/api/admin/recalculate-patterns` – solo Supabase
- Tutte le route sotto `/api/supabase/*` – solo Supabase

---

## 2. Stima costo per chiamata (OpenAI GPT-4o)

Fonte: [OpenAI Pricing](https://platform.openai.com/docs/pricing) – GPT-4o input ~$2.50/M token, output ~$10.00/M token. Vision: immagini conteggiate come token (detail high = più token).

Stime indicative **per singola chiamata** (in USD, ordine di grandezza):

| Azione | Input (token stimati) | Output (token max) | Costo stimato (USD) |
|--------|------------------------|---------------------|----------------------|
| assistant-chat | 3k–8k | ~200–400 | 0.015–0.05 |
| analyze-match | 4k–12k | fino a 3k | 0.05–0.15 |
| generate-countermeasures | 3k–10k | fino a 2k | 0.04–0.12 |
| extract-formation | 2k–5k (+ img) | fino a 4.5k | 0.05–0.12 |
| extract-coach | 1k–3k (+ img) | fino a 2k | 0.03–0.08 |
| extract-match-data (1 sezione) | 1k–4k (+ img) | fino a 2k | 0.03–0.07 |
| extract-player | 1k–4k (+ img) | fino a 2.5k | 0.03–0.08 |

**Partita completa (wizard 5 step):** 5 × extract-match-data ≈ 0.15–0.35 USD.

---

## 3. Pesi in crediti (unità astratte)

Unità base: **1 credito = circa 0.02–0.03 USD di costo** (per allineare i numeri). Ricarico lo applichi dopo (es. 3× o 4× sul “prezzo credito” al cliente).

| Azione | Costo stimato (USD) | Peso crediti (proposto) | Motivo |
|--------|----------------------|--------------------------|--------|
| assistant-chat (1 msg) | 0.02–0.05 | **1** | Unità base, uso frequente. |
| extract-player | 0.03–0.08 | **2** | Vision, output medio. |
| extract-coach | 0.03–0.08 | **2** | Come extract-player. |
| extract-match-data (1 sezione) | 0.03–0.07 | **2** | Una sezione = uno step wizard. |
| generate-countermeasures | 0.04–0.12 | **3** | Prompt + output lunghi. |
| extract-formation | 0.05–0.12 | **3** | Output fino a 4.5k. |
| analyze-match | 0.05–0.15 | **4** | Output fino a 3k, prompt pesante. |

**Partita completa (5 step):** 5 × 2 = **10 crediti**.  
**Match con analisi:** 10 (wizard) + 4 (analyze) = **14 crediti**.

---

## 4. Ricarico e pricing (tu: costo 1 → cliente 3)

- **Costo medio per credito (tuo):** ~0.03 USD (ordine di grandezza).
- **Ricarico 3×:** prezzo al cliente = 0.09 USD/credito (≈ 0.08 EUR/credito).
- **Ricarico 4×:** prezzo al cliente = 0.12 USD/credito (≈ 0.11 EUR/credito).

**Abbonamento 20 €/mese:**
- Con ricarico 3×: 20 / 0.08 ≈ **250 crediti inclusi** (numero tondo: **200–250**).
- Con ricarico 4×: 20 / 0.11 ≈ **180 crediti inclusi** (numero tondo: **150–200**).

**Overage (a consumo):** es. 0.10 €/credito oltre i crediti inclusi.

---

## 5. Strumenti per usage / billing (solo per capire, non da configurare ora)

- **Stripe Billing:** subscription ricorrente (20 €/mese) + **usage-based** (meter sugli eventi “crediti consumati”). Dopo la fase test puoi: inviare eventi “crediti” a Stripe e fatturare overage. Non serve configurarlo in fase test.
- **Stripe Metering:** [Subscription with overage](https://docs.stripe.com/billing/subscriptions/usage-based) – “included quota” + prezzo per unità oltre quota.
- **Contatore in-house (fase test):** tabella Supabase es. `usage_credits` (user_id, period_start, period_end, credits_used, [opzionale] cost_estimate_usd) e incremento in ogni route che chiama OpenAI. Così misuri uso reale senza Stripe.

---

## 6. Dove agganciare il contatore (fase test)

Per “capire” senza Stripe, in ogni route sotto puoi:

1. Dopo una chiamata OpenAI riuscita, chiamare una funzione es. `recordCredits(userId, operationType, weight)`.
2. `operationType` = `'assistant-chat' | 'analyze-match' | 'generate-countermeasures' | 'extract-formation' | 'extract-coach' | 'extract-match-data' | 'extract-player'`.
3. `weight` = peso in crediti dalla tabella sopra (1, 2, 3 o 4). Per `extract-match-data` passi weight 2 (una sezione = 2 crediti).

**Route da instrumentare:**

- `app/api/assistant-chat/route.js` – dopo `callOpenAIWithRetry` OK → 1 credito.
- `app/api/analyze-match/route.js` – dopo `callOpenAIWithRetry` OK → 4 crediti.
- `app/api/generate-countermeasures/route.js` – dopo `callOpenAIWithRetry` OK → 3 crediti.
- `app/api/extract-formation/route.js` – dopo `callOpenAIWithRetry` OK → 3 crediti.
- `app/api/extract-coach/route.js` – dopo `fetch` OpenAI OK → 2 crediti.
- `app/api/extract-match-data/route.js` – dopo `callOpenAIWithRetry` OK (per section) → 2 crediti.
- `app/api/extract-player/route.js` – dopo `callOpenAIWithRetry` OK → 2 crediti.

Nessuna integrazione Stripe in questa fase: solo log + (opzionale) scrittura su Supabase per sommare crediti per user/periodo e vedere totali in test.

---

## 7. Implementazione (stato attuale)

- **Tabella Supabase:** `user_credit_usage` (user_id, period_key YYYY-MM UTC, credits_used, credits_included). Migrazione: `migrations/create_user_credit_usage.sql`. RLS: SELECT solo propri record; INSERT/UPDATE solo service role.
- **Servizio:** `lib/creditService.js` – `getCurrentPeriodKey()` (UTC), `recordUsage()`, `getCurrentUsage()` (con fallback al mese precedente se periodo corrente senza riga).
- **API:** GET/POST `/api/credits/usage` – Bearer obbligatorio; restituisce period_key, credits_used, credits_included, overage. POST usato da CreditsBar per evitare cache.
- **UI:** `components/CreditsBar.jsx` in dashboard; fetch con cache: 'no-store'; i18n in `lib/i18n.js`.
- **Documentazione completa:** `docs/SISTEMA_CREDITI_AI.md`.
