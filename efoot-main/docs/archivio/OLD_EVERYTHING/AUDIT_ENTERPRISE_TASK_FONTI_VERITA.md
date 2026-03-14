# Audit enterprise – Fonti di verità per “usa formazione” e “segue consigli IA”

**Data**: 2026-02-07  
**Richiesta**: coerenza con il discorso e i fix precedenti; come facciamo a sapere se l’utente usa la formazione consigliata o segue i consigli dell’IA.  
**Scope**: solo analisi e raccomandazioni; **nessun codice** (attesa conferma “vai” per eventuali fix).

---

## 1. Contesto e regola di coerenza

La regola adottata (doc **PIANO_ROLLBACK_E_ENTERPRISE_TASK_KNOWLEDGE.md**, punto 0.8 e **taskHelper.js** in testa) è:

- Ogni **goal_type** deve essere **calcolabile solo** da:
  - **(a)** dati partita caricati/salvati (formation_played, result, team_stats, data_completeness),
  - **(b)** log di utilizzo (credit_transactions),
  - **(c)** profilo utente (common_problems, ecc.).
- **Non** si generano task che dipendono da **flag autodichiarati** (es. “ho usato la formazione consigliata”).
- **use_recommended_formation** non viene più **generato**; la logica di progresso resta per task **già esistenti** in DB.

L’audit risponde a: **come sappiamo** (e con quali limiti) se l’utente “usa la formazione consigliata” e se “segue i consigli dell’IA”, e dove si perde coerenza con questa regola.

---

## 2. “Usa la formazione consigliata”

### 2.1 Come lo sappiamo oggi

- **Fonte unica**: il **client** invia il campo `recommended_formation_used` nel body di **save-match** o **update-match**.
- **Validazione**: le API accettano **solo** `matchData.recommended_formation_used === true` (boolean stretto); ogni altro valore (assente, null, stringa, numero) → viene salvato `false` (o default DB).
- **Persistenza**: colonna `matches.recommended_formation_used` (boolean). Migration applicata.
- **Progresso task**: in `calculateTaskProgress`, per `goal_type === 'use_recommended_formation'` si contano le partite nella settimana del task con `recommended_formation_used === true` (query su `matches` con `formation_played`, `recommended_formation_used`).

Quindi **sappiamo** che l’utente “ha usato la formazione consigliata” **solo perché il client ce lo dice** al momento del salvataggio partita. Non c’è alcun controllo server-side (es. confronto tra `formation_played` e una “formazione consigliata” salvata).

### 2.2 Limiti e coerenza

- **Dato autodichiarato (honor system)**  
  Un client malevolo può inviare `recommended_formation_used: true` senza aver giocato con la formazione consigliata → l’obiettivo si completa comunque. È una scelta di prodotto documentata (Piano 0.3): accettabile per gamification/engagement senza premi esterni critici.

- **Coerenza con la regola “solo dati caricati/loggati”**  
  La regola vieta di **generare** nuovi task basati su questo flag. In codice:
  - **Generazione**: `use_recommended_formation` **non** è più inserito in `generateTasksBasedOnData` né nei fallback (solo `complete_matches`, `increase_wins`, `use_ai_recommendations`, `improve_defense`, ecc.).
  - **Task già in DB**: se in `weekly_goals` esistono ancora record con `goal_type = 'use_recommended_formation'` (es. creati in passato o da seed), **vengono ancora mostrati in UI** e il loro progresso è calcolato con `recommended_formation_used`. Quindi:
    - **Coerenza logica**: non generiamo più quel tipo.
    - **Coerenza visiva**: l’utente può ancora vedere “Usa la formazione consigliata in almeno 1 partita” se quel task è presente in DB. È una **incoerenza di presentazione** rispetto all’intento “niente task autodichiarati in futuro”.

- **UI che invia il flag**  
  Se nel flusso di salvataggio partita **manca** un controllo (checkbox / toggle) che imposta `recommended_formation_used: true`, l’utente non può mai completare l’obiettivo in modo legittimo; il valore resterà sempre `false`. L’audit non verifica qui la presenza di tale UI (va verificata a parte).

---

## 3. “Segue i consigli dell’IA” / “Applica consigli IA”

### 3.1 Come lo sappiamo oggi

- **Fonte**: tabella **credit_transactions**.
- **Filtri** (in `taskHelper`, whitelist fissa nel codice, mai da request):
  - `user_id` = userId (da token),
  - `type === 'usage'`,
  - `description` in **AI_USAGE_DESCRIPTIONS_WHITELIST**:  
    `['assistant-chat', 'analyze-match', 'generate-countermeasures', 'extract-formation', 'extract-match-data']`.
- **Progresso task**: per `goal_type === 'use_ai_recommendations'` si conta il numero di transazioni in quella finestra (settimana del task). Ogni utilizzo di una di quelle funzionalità conta come “1”.

Quindi **sappiamo** che l’utente ha **usato** le funzionalità IA (chat, analisi partita, contromisure, estrazione formazione/dati). Non sappiamo se ha **applicato** un consiglio tattico in campo (es. cambiato formazione come suggerito).

### 3.2 Limiti e coerenza

- **Proxy, non “applicazione”**  
  Il task in UI dice tipicamente “Applica almeno 2 consigli dell’IA”. Il progresso misura **“quante volte hai usato funzionalità IA”** (crediti usage con descrizioni in whitelist), non “quante volte hai messo in pratica un suggerimento”.  
  **Gap di comunicazione**: l’utente può intendere “applicare” come “seguire il consiglio in partita”; noi misuriamo “aver usato il sistema”. È coerente con la regola (dato da log), ma il **messaggio** può essere fuorviante.

- **Coerenza con la regola**  
  Il dato è **derivato da log** (credit_transactions), quindi è **conforme** alla regola “solo dati caricati/loggati”. La whitelist è server-side e fissa; non ci sono input utente che alterano la logica.

---

## 4. Riepilogo fonti di verità

| Obiettivo / domanda | Fonte dati | Dove si calcola | Verificabile server-side? | Coerente con regola “solo dati caricati/loggati”? |
|---------------------|------------|------------------|----------------------------|---------------------------------------------------|
| “Usa la formazione consigliata” | Client invia `recommended_formation_used` in save/update match → `matches.recommended_formation_used` | `calculateTaskProgress` (conteggio partite in settimana con flag true) | No (autodichiarato) | Generazione: sì (non lo generiamo). Task esistenti: mostrati ancora, dato resta autodichiarato. |
| “Applica consigli IA” | `credit_transactions` (type usage, description in whitelist) | `calculateTaskProgress` (conteggio transazioni in settimana) | Sì (log di utilizzo) | Sì (solo log). Attenzione: testo “applica” vs “usa funzionalità IA”. |

---

## 5. Raccomandazioni (senza codice)

1. **Formazione consigliata**
   - **Opzione A (coerenza massima)**: non mostrare più in UI i task con `goal_type === 'use_recommended_formation'` (filtrarli in API tasks/list o in frontend). Così l’utente non vede obiettivi basati su un unico dato autodichiarato.
   - **Opzione B (mantenere come honor system)**: lasciare che i task esistenti restino visibili e documentare chiaramente (anche in UI/help) che “Usa la formazione consigliata” si basa sulla tua dichiarazione al salvataggio partita. Verificare che esista un controllo (checkbox/toggle) in fase di salvataggio partita che imposti `recommended_formation_used: true`.
   - **Opzione C (futuro)**: se servisse verifica server-side, si potrebbe (solo server) confrontare `formation_played` con una “formazione consigliata” salvata (es. da contromisure/analisi). Richiede design e storage dedicati.

2. **Consigli IA**
   - Allineare **testo obiettivo** al dato reale: ad es. “Usa le funzionalità IA almeno X volte” (chat, analisi partita, contromisure, ecc.) invece di “Applica almeno X consigli dell’IA”, per evitare l’equivoco “applicare = mettere in pratica in partita”.
   - Oppure mantenere “Applica consigli” ma aggiungere una breve spiegazione (tooltip o riga sotto) che chiarisce: “Si conta l’utilizzo di chat, analisi partita e contromisure”.

3. **Audit e fix precedenti**
   - Rivedere che in **tutta** la generazione task (inclusi fallback e task “generici”) **nessun** nuovo `use_recommended_formation` venga mai inserito.
   - Verificare che le API save-match e update-match continuino a validare `recommended_formation_used` solo con `=== true` e a non fidarsi di altri tipi.

---

## 6. Checklist audit (stato attuale)

| Voce | Stato |
|------|--------|
| use_recommended_formation non generato in taskHelper | OK (non in generateTasksBasedOnData né fallback) |
| Progresso use_recommended_formation da matches.recommended_formation_used | OK (con boolean strict) |
| Progresso use_ai_recommendations da credit_transactions (whitelist fissa) | OK |
| recommended_formation_used in save/update-match: solo boolean strict | OK |
| Fonte “formazione consigliata” = autodichiarata (honor system) | Documentato |
| Fonte “consigli IA” = log utilizzo (proxy di “applicazione”) | Documentato |
| Task “formazione” ancora visibili se presenti in DB | Incoerenza visiva possibile (raccomandazione 1) |
| Testo “Applica consigli” vs dato reale (utilizzi) | Gap comunicazione (raccomandazione 2) |

---

**Implementazione (2026-02-07)**:
- **Filtro use_recommended_formation**: in `GET /api/tasks/list` i task con `goal_type === 'use_recommended_formation'` sono esclusi dalla risposta; l’utente non vede più obiettivi basati sul solo dato autodichiarato.
- **Testo use_ai_recommendations**: chiave `goalUseAIRecommendations` aggiornata in i18n (IT/EN) per riflettere l’utilizzo delle funzionalità (“Usa almeno X volte chat, analisi partita o contromisure”) invece di “Applica X consigli”.
