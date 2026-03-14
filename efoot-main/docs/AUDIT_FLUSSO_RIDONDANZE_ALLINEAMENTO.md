# Audit: flusso, ridondanze, codice morto, allineamento

**Solo considerazioni di flusso, ridondanza, codice morto e allineamento.** Nessuna lista di “cose da far sistemare al programmatore”.

---

## 1. Flusso

### 1.1 Eventi globali (window)

- **`credits-consumed`** — emesso da: AssistantChat, CoachFeedbackChat, contromisure, match/[id], match/new, gestione-formazione, giocatore/[id], allenatori. Ascoltato da: **CreditsBar** (e layout). Flusso: dopo una risposta API che consuma crediti, il componente emette l’evento → la barra crediti si aggiorna (refetch POST /api/credits/usage). Coerente: un solo consumatore (CreditsBar), molte sorgenti.
- **`leaderboard-updated`** — emesso da: **solo impostazioni-profilo** (dopo save profilo, setTimeout 1.5s). Ascoltato da: **page.jsx** (dashboard) e **gestione-profilo**. Flusso: salvataggio profilo → evento → dashboard e gestione-profilo rifanno fetch leaderboard. Coerenza: l’unica azione che emette è “ho salvato il profilo”; chi ascolta si aggiorna. Nota: la classifica si aggiorna anche perché save-profile lancia in async `computeLeaderboardForMonth` + `saveLeaderboardSnapshot`; l’evento serve a far sì che il frontend rilegga i dati.

### 1.2 Chi ricalcola la classifica

- **GET /api/leaderboard?month=corrente** → chiama `computeLeaderboardForMonth` e scrive snapshot.
- **POST /api/supabase/save-profile** → dopo il salvataggio (async, non-blocking) importa leaderboardHelper e chiama `computeLeaderboardForMonth(month)` + `saveLeaderboardSnapshot`. Stesso calcolo da due ingressi: richiesta classifica e salvataggio profilo. Se molti utenti salvano il profilo o aprono la classifica, lo stesso tipo di operazione pesante parte da due flussi diversi.

### 1.3 Lettura classifica / “mese corrente”

- **Formato mese (YYYY-MM):** Calcolato in due posti con la stessa logica: `app/classifica/page.jsx` (funzione locale `getCurrentMonth()`) e `app/api/leaderboard/route.js` (funzione locale `getCurrentMonth()`). Stessa formula (anno + mese a 2 cifre), nessuna funzione condivisa. `lib/leaderboardHelper.js` espone `getMonthBounds(month)` ma non “mese corrente”.
- **Gestione-profilo:** Chiama sia `GET /api/leaderboard` (senza query → mese corrente) sia `GET /api/leaderboard/me` (storico). La prima restituisce anche `currentUser` per il mese corrente; la seconda solo lo storico. Due chiamate con scopi diversi (lista mese corrente + posizione vs storico), flusso chiaro.

---

## 2. Ridondanze

### 2.1 Logica “mese corrente” (YYYY-MM)

- **Dove:** `app/classifica/page.jsx` (linee ~61–64) e `app/api/leaderboard/route.js` (linee ~24–28). Stesso calcolo in due file.
- **Allineamento:** Un’unica fonte di verità evita drift (es. uno che usa UTC e uno locale). Proposta: esportare da `lib/leaderboardHelper.js` una funzione `getCurrentMonth()` e usarla in entrambi i posti (e ovunque serva “mese corrente” per la classifica).

### 2.2 Ricalcolo classifica da due trigger

- **Trigger 1:** Qualsiasi GET /api/leaderboard per il mese corrente.
- **Trigger 2:** Salvataggio profilo (save-profile) in async.
- Effetto: la stessa operazione costosa (lettura profili, partite, goal, transazioni, loop utenti, delete + insert snapshot) può essere eseguita sia quando qualcuno apre la classifica/dashboard sia quando qualcuno salva il profilo. Non è ridondanza di codice ma ridondanza di *invocazione*: due flussi distinti portano allo stesso calcolo. Per allineamento architetturale si può decidere: un solo “owner” del ricalcolo (es. solo GET leaderboard, o solo un job) e gli altri si limitano a invalidare cache o a non ricalcolare.

### 2.3 Dati “posizione nel mese corrente” in gestione-profilo

- Gestione-profilo usa `leaderboardPayload.currentUser` da `/api/leaderboard` (mese corrente) e `leaderboardMePayload.history` da `/api/leaderboard/me`. Lo storico non è ridondante con la prima chiamata; la prima dà la lista del mese + currentUser. Nessuna ridondanza da tagliare qui, solo chiarezza: due endpoint con responsabilità diverse.

---

## 3. Codice morto / non usato

### 3.1 leaderboardHelper.js

- **Costanti non più usate nel calcolo:** `CAP_TASKS`, `PTS_PER_TASK`, `GROWTH_GOAL_TYPES`, `CAP_GROWTH_BONUS`, `PTS_PER_GROWTH_TASK`. Servivano al vecchio punteggio (task + improvement); ora `breakdown.tasks` e `breakdown.improvement` sono fissati a 0 e non entrano nel totale. Le costanti non sono più lette da nessuna parte nel calcolo. Restano solo come riferimento storico o andrebbero rimosse per chiarezza (allineamento codice ↔ comportamento reale).

### 3.2 i18n

- **Chiavi usate solo prima della modifica classifica:** `daObiettivi`, `daMiglioramento`. Erano usate nella pagina classifica nel breakdown punti; dopo la modifica la pagina mostra solo “Da partite”, “Da utilizzo IA”, “Da profilo”. Le chiavi `daObiettivi` e `daMiglioramento` non sono più referenziate da nessun componente. Codice morto (o riserva per tooltip/documentazione); per allineamento si possono rimuovere o lasciare commentate se si vuole riutilizzarle in futuro.

---

## 4. Allineamento

### 4.1 leaderboard_consent

- **Dove vive:** DB `user_profiles.leaderboard_consent`, API save-profile (accetta e persiste), impostazioni-profilo (form lo invia), risposta API (viene restituito nel profilo salvato).
- **Effetto reale:** La classifica (leaderboardHelper, API leaderboard, RPC) **non** filtra più per `leaderboard_consent`. La decisione di prodotto è “tutti gli eleggibili in classifica”.
- **Allineamento:** Il dato è ancora scritto e letto ma non guida nessun flusso (né classifica né altro). È un campo “vivente” nel DB/API ma “morto” nel flusso. Per allineamento si può: (a) documentare in ARCHITETTURA/audit che è “deprecato per classifica, riservato a uso futuro” e lasciare codice così, oppure (b) smettere di inviarlo dalla UI e di aggiornarlo in save-profile se non si prevede alcun uso.

### 4.2 Unica fonte per “mese corrente” classifica

- Oggi: due implementazioni locali di “current month” (classifica page + API leaderboard). Per evitare drift (formato, fuso, ecc.) conviene una sola funzione esportata (es. da leaderboardHelper) e usata da front e API.

### 4.3 Commento eleggibilità in leaderboardHelper

- Il commento sulla costante dice ancora “consenso” (linea 21: “profilo ≥ 50 + consenso”). La regola effettiva è “profilo ≥ 50”, nessun consenso. Allineamento doc/codice: aggiornare il commento a “profilo ≥ 50, nessun consenso”.

---

## 5. Riepilogo

| Tema              | Tipo        | Cosa |
|-------------------|------------|------|
| getCurrentMonth   | Ridondanza | Stessa logica in classifica page e API leaderboard → unificare in un unico helper. |
| Ricalcolo classifica | Flusso  | Due trigger (GET leaderboard + save-profile) → decidere un solo “owner” o cache. |
| CAP_TASKS, …      | Codice morto | Costanti in leaderboardHelper non usate nel calcolo → rimuovere o marcare “storico”. |
| daObiettivi, daMiglioramento | Codice morto | Chiavi i18n non più usate in UI → rimuovere o tenere per doc. |
| leaderboard_consent | Allineamento | Salvato e letto ma non usato in nessun flusso → documentare “deprecato” o smettere di aggiornarlo. |
| Commento eleggibilità | Allineamento | Testo “consenso” non più vero → aggiornare commento. |

Nessuna modifica obbligatoria; solo considerazioni per rendere flusso, ridondanze, codice morto e allineamento più chiari e coerenti.
