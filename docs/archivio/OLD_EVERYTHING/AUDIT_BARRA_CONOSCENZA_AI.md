# Audit – Barra Conoscenza AI

**Data**: 2026-02-07  
**Scope**: componente `AIKnowledgeBar.jsx`, API `/api/ai-knowledge`, `lib/aiKnowledgeHelper.js`, i18n e sicurezza.

---

## 1. Riepilogo

La barra **Conoscenza AI** mostra uno score 0–100% basato su: Profilo (20), Rosa (25), Partite (30), Pattern (15), Allenatore (10), Utilizzo (10), Successi (15). Include livello testuale (Principiante → Esperto), breakdown espandibile e CTA se score < 50. L’audit conferma allineamento con dati di backend, i18n completo e sicurezza API; sono state applicate piccole correzioni di accessibilità.

---

## 2. Componente UI (`components/AIKnowledgeBar.jsx`)

### 2.1 Struttura e contenuti
- **Header**: titolo “Conoscenza AI” + percentuale (allineato con i18n: `aiKnowledge`).
- **Barra di progresso**: colore in base a fasce (0–30 arancione/rosso, 31–60 arancione, 61–80 blu, 81+ verde). Altezza 24px, `clamp` per font.
- **Livello e descrizione**: `getLevelText(level)` e `getDescriptionText(level)` con fallback IT; chiavi EN presenti in i18n.
- **Nesso obiettivi → score**: testo “Gli obiettivi completati contribuiscono a questo score.” (`goalsContributeToBar`) – presente e tradotto.
- **Dettagli (Vedi dettagli)**: breakdown Profilo/20, Rosa/25, Partite/30, Pattern/15, Allenatore/10, Utilizzo/10, Successi/15. Valori da `breakdown` con `Math.round(… || 0)`. Chiavi: `aiKnowledgeProfile`, `aiKnowledgeRoster`, ecc.
- **CTA**: mostrata solo se `score < 50`; messaggio `completeProfileToIncreaseKnowledge` (IT/EN).

### 2.2 Comportamento
- **Mount**: fetch `/api/ai-knowledge` solo lato client (evita hydration mismatch).
- **Evento `match-saved`**: retry con backoff 1s, 2s, 3s, 5s, 8s (max 5 tentativi); aggiornamento solo se score cambia (> 0.01).
- **Evento `knowledge-should-refresh`**: come match-saved ma la barra chiama l’API con **?refresh=1** per forzare ricalcolo (utile dopo salvataggio profilo o rosa). Emesso da: impostazioni-profilo (dopo save), gestione-formazione (dopo fetchData, es. aggiunta/rimozione giocatore, cambio formazione).
- **Polling**: refresh ogni 60 secondi.
- **401 / sessione assente**: redirect a `/login`.
- **Errori**: messaggio utente con `t('sessionExpired')` o messaggio errore; in dev log in console.

### 2.3 Accessibilità (correzioni applicate)
- **Barra di progresso**: aggiunti `role="progressbar"`, `aria-valuenow`, `aria-valuemin="0"`, `aria-valuemax="100"`, `aria-label` con testo che include la percentuale, così gli screen reader annunciano correttamente lo stato.

### 2.4 Dettaglio `<details>`
- Uso di `open={showDetails}` e `onToggle` per stato controllato. Con stato iniziale `false` il comportamento è stabile; in ambienti con quirk su `details` si può passare a controllo solo da React con `preventDefault` su `summary` e stato `open` derivato solo da state.

---

## 3. API `/api/ai-knowledge`

### 3.1 Sicurezza
- **Auth**: token Bearer obbligatorio; `validateToken` con Supabase; 401 se mancante o non valido.
- **Rate limit**: 20 richieste/minuto per utente (`lib/rateLimiter.js`); risposta 429 con header `X-RateLimit-*`.
- **Dati**: score calcolato per `userId` estratto dal token; nessun parametro path/query che permetta di interrogare altri utenti.

### 3.2 Logica
- **Cache**: se in `user_profiles` esistono `ai_knowledge_score` e `ai_knowledge_last_calculated` entro 5 minuti **e** non è presente il query param **?refresh=1**, si restituisce il valore cached (evita ricalcolo continuo).
- **Refresh forzato**: GET con `?refresh=1` o `?refresh=true` ignora la cache e ricalcola sempre (usato dalla UI dopo salvataggio profilo/rosa).
- **Calcolo**: `calculateAIKnowledgeScore(userId, …)` da `lib/aiKnowledgeHelper.js`; risultato scritto in `user_profiles` (ai_knowledge_score, ai_knowledge_level, ai_knowledge_breakdown, ai_knowledge_last_calculated).
- **Fallback**: in caso di errore di calcolo si restituisce cache scaduta se disponibile, altrimenti score 0 e breakdown a zero.

---

## 4. Calcolo score (`lib/aiKnowledgeHelper.js`)

### 4.1 Componenti e massimi
| Componente | Max | Fonte dati |
|------------|-----|------------|
| Profilo | 20 | user_profiles (campi compilati, common_problems) |
| Rosa | 25 | players + formation_layout (titolari, riserve, dati completi) |
| Partite | 30 | matches (1 partita = 3%, max 10 partite) |
| Pattern | 15 | team_tactical_patterns |
| Allenatore | 10 | coaches (presenza record) |
| Utilizzo | 10 | **Stima**: non esiste tracking messaggi chat in DB; `chat_messages` = floor(matches/3), `interactions` = matches + players + obiettivi completati. Per utilizzo “reale” servirebbe un event log dedicato. |
| Successi | 15 | profilo (miglioramento divisione 5%) + weekly_goals completati (5%) + miglioramento gol subiti ultime 10 vs precedenti 10 (5%) |

I massimi 20, 25, 30, 15, 10, 10, 15 sono coerenti con le etichette “/20”, “/25”, … nella UI.

### 4.2 Nesso obiettivi → score
- La voce **Successi** include gli obiettivi settimanali completati (fino a 5% per obiettivi completati).
- Il testo in UI “Gli obiettivi completati contribuiscono a questo score” è quindi corretto e riferito in particolare alla componente Successi del breakdown.

---

## 5. i18n

- Tutte le stringhe visibili usano `t('chiave')` con fallback in italiano.
- Chiavi verificate presenti sia per `it` che per `en`: `aiKnowledge`, livelli e descrizioni, voci del breakdown, `viewDetails`, `completeProfileToIncreaseKnowledge`, `goalsContributeToBar`, `loading`, `sessionExpired`.

---

## 6. Checklist audit

| Voce | Esito |
|------|--------|
| Score e breakdown allineati a aiKnowledgeHelper | ✅ |
| Sicurezza API (auth, rate limit, isolamento utente) | ✅ |
| i18n completo (IT/EN) | ✅ |
| Nesso obiettivi → score in UI e in logica (Successi) | ✅ |
| CTA e messaggi contestuali (score < 50) | ✅ |
| Accessibilità barra (ARIA progressbar) | ✅ (corretto in audit) |
| Gestione errori e redirect login | ✅ |
| Cache 5 min e fallback su errore | ✅ |

---

## 7. Correzioni applicate

1. **Accessibilità**: sulla barra di progresso (il div che rappresenta la percentuale) sono stati aggiunti:
   - `role="progressbar"`
   - `aria-valuenow={Math.round(score)}`
   - `aria-valuemin={0}` e `aria-valuemax={100}`
   - `aria-label` con testo tipo “Conoscenza AI: X%” (tradotto) per lettura da screen reader.

Nessuna modifica alla logica di business o alle API.
