# Audit coerenza enterprise — eFootball AI Coach

**Data:** 2026-02-14  
**Obiettivo:** Prodotto coerente, una sola fonte di verità, nessuna contraddizione tra codice, DB, doc e copy utente.

---

## 1. Mappa intersezioni (dove si toccano i sistemi)

| Sistema A | Sistema B | Punto di intersezione | Fonte di verità |
|-----------|-----------|------------------------|------------------|
| **Classifica (Coach Points)** | **credit_transactions** | Punti "utilizzo IA" = tutte le righe `type=usage` nel mese | leaderboardHelper: nessun filtro su `description` |
| **Task use_ai_recommendations** | **credit_transactions** | Progresso task = righe `type=usage` con `description` IN whitelist | taskHelper: `AI_USAGE_DESCRIPTIONS_WHITELIST` |
| **Classifica** | **weekly_goals** | Task completati nel mese = `status=completed` AND `completed_at` in bounds mese | leaderboardHelper |
| **AI Knowledge** | **weekly_goals** | Successi = tutti i task completati (lifetime), max 5% | aiKnowledgeHelper: nessun filtro mese |
| **AI Knowledge** | **user_tactical_feedback** | Coach training = sessioni ultimi 30 gg (Palestra Coach) | aiKnowledgeHelper |
| **Classifica** | **user_profiles** | Eleggibilità: `profile_completion_score` ≥ 50; nickname in tabella | leaderboardHelper, API leaderboard |
| **Classifica** | **leaderboard_snapshots** | Snapshot mensile: chi è in classifica e con quali punti | API scrive con computeLeaderboardForMonth (no consent) |

---

## 2. Incoerenze critiche (da sistemare)

### 2.1 RPC Supabase ancora filtrano per `leaderboard_consent`

- **Dove:** Funzioni `get_leaderboard_for_month` e `get_leaderboard_current_user` in Supabase.
- **Cosa fanno:** `JOIN user_profiles ... AND p.leaderboard_consent = true` → restituiscono solo utenti con consenso.
- **Comportamento resto prodotto:** API route `leaderboard` per mese corrente usa `computeLeaderboardForMonth` (nessun filtro consenso). Per mesi passati legge da `leaderboard_snapshots` e fa join con `user_profiles` **senza** filtrare per consent. Quindi la classifica “normale” mostra tutti gli eleggibili.
- **Problema:** Quando si usa il fallback RPC (snapshot vuoti o lettura bloccata), la risposta è diversa: solo chi ha `leaderboard_consent = true`. Stesso endpoint, due risultati possibili.
- **Cosa fare:** Modificare le due RPC rimuovendo la condizione `leaderboard_consent = true` dal JOIN (allineamento a “tutti gli eleggibili in classifica”). Migrazione SQL da applicare.

### 2.2 Task “use_ai_recommendations” vs classifica: Palestra Coach conta solo in classifica

- **Dove:** `lib/taskHelper.js` → `AI_USAGE_DESCRIPTIONS_WHITELIST` include tutte le usage (inclusi extract-player, extract-coach, coach-feedback-chat, save-coach-feedback).
- **Stato:** Whitelist ora include anche `coach-feedback-chat`, `save-coach-feedback`, `extract-player`, `extract-coach` (vedi VERIFICA_COERENZA_HP_DEFALCATI.md §4).
- **Effetto:** Per il task “Usa AI X volte a settimana” non conta la Palestra Coach. In classifica invece tutte le `credit_transactions` type=usage del mese contano (inclusa Palestra).
- **Problema:** Stesso tipo di azione (uso IA) ha regole diverse nei due sistemi. Non enterprise.
- **Cosa fare:** Decidere: (A) includere `coach-feedback-chat` e `save-coach-feedback` nella whitelist del task (allineamento a classifica), oppure (B) documentare esplicitamente che “use_ai_recommendations” = solo chat/analisi/contromisure/estrazioni e non Palestra. Per coerenza si consiglia (A).

---

## 3. Incoerenze copy / i18n (messaggi utente sbagliati)

| Chiave | Testo attuale (IT/EN) | Problema |
|--------|------------------------|----------|
| `tourClassificaRankingsDesc` | "Per apparire servono consenso in Impostazioni profilo e almeno **3 partite** complete nel mese" | Consenso non usato; partite richieste sono **1**, non 3. |
| `entraInClassifica` | "… (profilo e **consenso attivi**)" | Consenso non è più richiesto. |

**Cosa fare:** Aggiornare le stringhe in i18n (IT e EN) per: nessun riferimento al consenso; “almeno 1 partita completa nel mese” e profilo ≥50%.

---

## 4. Residui `leaderboard_consent` (coerenza prodotto)

- **DB:** Colonna `user_profiles.leaderboard_consent` esiste ancora.
- **API save-profile:** Accetta e persiste `leaderboard_consent`.
- **UI impostazioni-profilo:** Checkbox consenso rimosso (commento “Consenso classifica rimosso”); in stato si carica ancora `leaderboard_consent` dal profilo.
- **Classifica (route + computeLeaderboardForMonth):** Non usa il consenso.

**Problema:** La regola di business è “tutti gli eleggibili in classifica”, ma il dato consenso resta in DB e in API. Rischio confusione e incoerenza se in futuro qualcuno riusa il campo senza allineare RPC/doc.

**Cosa fare (scelta prodotto):**  
- **Opzione A:** Rimuovere l’uso ovunque: non inviare/aggiornare `leaderboard_consent` da UI; in doc/ARCHITETTURA indicare “colonna deprecata, da rimuovere in migrazione futura”.  
- **Opzione B:** Tenere colonna e API per uso futuro (es. T&C) e documentare in ARCHITETTURA: “Non usato per classifica; riservato a futura opt-out legale”.  
In entrambi i casi: i18n e RPC non devono più dire che il consenso è necessario per “apparire in classifica”.

---

## 5. Documentazione obsoleta

| File | Cosa dice | Realtà codice |
|------|-----------|----------------|
| `docs/servizi/06-CLASSIFICA.md` | “Filtra per leaderboard_consent=true (TODO: rimuovere)”; esempio con `.eq('leaderboard_consent', true)` | La route non filtra per consent; nickname da profiles senza filtro consent. |
| `docs/servizi/06-CLASSIFICA.md` | Esempio API che legge snapshot poi profiles con consent | Falso: nessun filtro consent. |
| `docs/ARCHITETTURA.md` | leaderboard_consent “DA RIMUOVERE” | Colonna ancora presente e salvata; RPC la usano ancora. |

**Cosa fare:** Allineare 06-CLASSIFICA.md e ARCHITETTURA.md alla logica attuale (eleggibilità senza consenso; RPC da aggiornare come da §2.1).

---

## 6. Coerenze verificate (nessun intervento)

- **Eleggibilità classifica:** Unica definizione in `lib/leaderboardHelper.js`: ≥1 partita completa nel mese, profile_completion_score ≥ 50, 0 task richiesti. Usata solo lì e in API leaderboard.
- **Conteggio task in classifica:** `weekly_goals` con `status=completed` e `completed_at` nel mese. Coerente con periodo mensile.
- **Nickname in classifica:** Sempre da `user_profiles.nickname` (join su user_id da snapshot). Una sola fonte.
- **Palestra Coach in classifica:** Conta come utilizzo IA (credit_transactions type=usage); nessun filtro su description. Coerente con resto usage.
- **AI Knowledge vs credit_transactions:** La barra non usa credit_transactions; usa user_tactical_feedback per coach_training e weekly_goals per successi. Nessun conflitto.
- **profile_completion_score:** Soglia 50 per eleggibilità, 80 per i 5 pt bonus in classifica. Coerente (due usi distinti).

---

## 7. Supabase – commento colonna

- **user_profiles.ai_knowledge_score:** Commento indica “Utilizzo (10%) + Successi (15%)” e totali non allineati al codice (Utilizzo 5%, Palestra 10%, Successi 10%). Solo documentale.
- **Cosa fare:** Aggiornare il commento della colonna (o tabella) con la formula reale usata in `aiKnowledgeHelper.js`.

---

## 8. Riepilogo azioni (applicate 2026-02-14)

1. **Fatto**  
   - RPC `get_leaderboard_for_month` e `get_leaderboard_current_user` aggiornate (migration `leaderboard_rpc_remove_consent_filter.sql`).  
   - i18n: `tourClassificaRankingsDesc` e `entraInClassifica` corrette (1 partita, profilo ≥50%, nessun consenso).  
   - `AI_USAGE_DESCRIPTIONS_WHITELIST` in taskHelper: aggiunti `coach-feedback-chat` e `save-coach-feedback`.  
   - Docs: 06-CLASSIFICA.md e ARCHITETTURA.md allineati (nessun filtro consenso; colonna deprecata per classifica).

2. **Opzionale (non fatto)**  
   - Commento DB su `user_profiles.ai_knowledge_score` (formula aggiornata).  
   - Rimozione colonna `leaderboard_consent` (scelta: mantenuta per eventuale uso futuro).

---

**Esito:** Coerenza enterprise applicata; nessuna modifica breaking.

---

## 9. Decisione di prodotto: Task e Classifica (vincolo “niente API partite”)

### 9.1 Vincolo strutturale

**Non abbiamo accesso ai dati partita dalle API ufficiali.** Tutto ciò che sappiamo su partite, risultati, gol subiti, possesso, clean sheet viene **solo da ciò che il cliente carica** (upload manuale, screenshot, form). Quindi:

- **Verificabile da noi:** utilizzo della piattaforma (credit_transactions type=usage), profilo (nickname, % completamento).
- **Non verificabile:** quali partite ha giocato davvero, risultati, statistiche. Un utente può caricare solo partite che “fanno comodo” o dichiarare dati incoerenti.

Questo non è un bug da fixare, è un **vincolo di prodotto**: la classifica non può essere un “ranking di merito sportivo verificato”, ma al massimo un “ranking di impegno/uso della piattaforma” con una componente self-reported (partite).

### 9.2 Cosa è manipolabile oggi

| Leva | Fonte dati | Manipolabile? | Come |
|------|------------|---------------|------|
| **Partite (numero + quality)** | Client: partite caricate | Sì | Carico solo 15 partite “belle” o inventate. |
| **Task completati** | Client: partite + weekly_goals | Sì | Task tipo “vittorie”, “clean sheet”, “gol subiti” dipendono dai dati partita che carico → posso caricare solo partite che soddisfano il task. |
| **Miglioramento (growth tasks)** | Come sopra | Sì | Stessa logica: reduce_goals_conceded, increase_wins, improve_possession, improve_defense, clean_sheet_matches sono tutti calcolati sulle partite caricate. |
| **Utilizzo IA** | Server: credit_transactions | No (da noi) | Ogni azione è registrata lato backend. Per “barare” dovrei usare davvero le funzioni. |
| **Profilo ≥80%** | Client + server | Parziale | Dati profilo sono self-reported; il punteggio % è calcolato da noi su campi che l’utente compila. |

Conclusione: **mettere i task in classifica significa premiare in classifica qualcosa che può essere ottenuto caricando (o dichiarando) solo partite ad hoc.** Doppio incentivo perverso: “completo il task” + “prendo punti classifica” → “carico solo le partite che servono al task”.

### 9.3 Vista Product Manager

- **Obiettivo:** Una classifica credibile e non facilmente giocabile, con messaggio chiaro per l’utente.
- **Scelta coerente con il vincolo:**
  1. **Task fuori dalla classifica.** I task restano solo per la **progressione** (barra AI Knowledge, gamification personale). La classifica non premia più il “completare task” derivati da dati partita, quindi non incentiviamo a caricare solo partite che rispecchiano i task.
  2. **Eventualmente togliere anche “miglioramento” (growth bonus)** dalla classifica, perché è ancora “task basati su partite”. Così la classifica = partite (conteggio + quality) + utilizzo IA + profilo. Il peso della parte “gameable” (partite) resta, ma non si somma l’incentivo “task”.
  3. **Trasparenza in copy e UI:** dichiarare esplicitamente che la classifica premia **l’uso della piattaforma** (partite caricate, utilizzo degli strumenti AI, profilo completo). Non “chi è più forte a eFootball” (quello non possiamo misurarlo senza API).
- **Alternativa (se si vogliono tenere i task in classifica):** accettare che la classifica sia più “gameable” e dirlo chiaramente; oppure introdurre attrito (es. limite partite, campi obbligatori, audit campione). Ma senza API partite la verifica resta limitata.

### 9.4 Vista Cliente

- **Preoccupazione:** “In cima potrebbero esserci chi carica solo partite che fanno comodo (solo vittorie, solo clean sheet) per fare task e prendere punti. Io carico tutto e sono svantaggiato.”
- **Risposta di prodotto:**  
  - Se **task fuori classifica**: il vantaggio di “caricare solo partite che rispecchiano i task” si limita alla barra personale (AI Knowledge), non ai punti classifica. La classifica premia “quanto usi la piattaforma” (azioni IA, profilo) e “quante partite carichi” (con cap), non “quali partite hai scelto per far completare i task”.  
  - Copy onesti: “Questa classifica premia l’impegno sulla piattaforma: partite caricate, uso degli strumenti AI e profilo. I task settimanali servono a far crescere quanto l’AI ti conosce (barra), non i punti classifica.”

### 9.5 Raccomandazione finale

- **Decisione:** **Task (e opzionalmente growth/miglioramento) fuori dal calcolo della classifica.**  
  Classifica = **partite** (conteggio + quality, cap 15) + **utilizzo IA** (con varietà) + **profilo** (bonus se ≥80%).  
  Task = solo **progressione / AI Knowledge** (barra, successi).
- **Implementazione:** In `leaderboardHelper.js` rimuovere dal punteggio le voci `tasks` e `improvement` (o solo `tasks` se si vuole mantenere il “miglioramento” come segnale di engagement; ma logicamente anche improvement è da partite/task).
- **Copy e UX:** Aggiornare testi (i18n, pagina classifica, tooltip) per spiegare: (1) da dove vengono i punti classifica; (2) che i task servono alla barra “quanto l’AI ti conosce”, non alla classifica.
- **Opzionale (fase successiva):** Ridurre ulteriormente il peso della componente “partite” (es. cap più basso o solo “partecipazione” 0/1) e dare più peso a utilizzo IA e profilo, per avvicinare la classifica a “cosa possiamo davvero osservare”. Da valutare in base al feedback utenti.

---

## 10. Barra Conoscenza IA e modello a consumo — "Non solo chi più spende"

### 10.1 Il rischio: gamification = chi più spende prima arriva

Con servizio **a consumo** (crediti per chat, analisi, contromisure, Palestra, ecc.) c'è il rischio che:
- **Classifica** = chi usa di più = chi spende di più → "vince chi paga".
- **Barra AI Knowledge** = chi usa di più = chi spende di più → "arrivi prima se paghi".

Se fosse **solo così**, la gamification sarebbe percepita come pay-to-win e scoraggerebbe chi non può o non vuole spendere tanto. Quindi **non può essere solo così**: servono leve che premiano **impegno, dati condivisi, costanza** senza essere proporzionali ai crediti spesi.

### 10.2 Come è fatta oggi la barra (pesi reali in aiKnowledgeHelper.js)

La barra "Quanto l'AI ti conosce" è **già** un mix voluto:

| Componente | Peso max | Legato ai crediti? | Cosa premia |
|------------|----------|--------------------|-------------|
| **Profilo** | 20% | No | Compilare nome, divisione, squadra, ore, come ricordarti, ecc. |
| **Rosa** | 25% | No | Inserire titolari, riserve, rating, posizioni. |
| **Partite** | 30% | No | Caricare storico partite (numero e completezza). |
| **Pattern tattici** | 15% | No | Derivato da partite/formazioni. |
| **Allenatore** | 10% | No | Aver salvato un allenatore. |
| **Utilizzo sistema** | 5% | Parziale (chat stima) | Interazioni: partite + giocatori + obiettivi; stima messaggi chat. |
| **Successi e obiettivi** | 10% | No | Task completati (lifetime), miglioramento divisione, miglioramenti performance. |
| **Coach training (Palestra)** | 10% | Sì | Sessioni Palestra ultimi 30 gg (consumo crediti). |

**Totale "non a consumo":** 20 + 25 + 30 + 15 + 10 + 10 = **110%** (poi lo score è cap 100). Quindi si può **riempire la barra anche senza spendere**: profilo + rosa + partite + pattern + allenatore + successi (task, divisione, performance) bastano. La parte davvero "a consumo" è solo **utilizzo 5%** (in parte) e **Palestra 10%** (max 4+ sessioni). In altre parole: **"chi più spende" incide al massimo per ~15% sulla barra**; il resto è "quanto mi fai conoscere" (dati) e "quanto ti impegni" (task, miglioramenti).

### 10.3 Intersezione barra, classifica, task

- **Barra AI Knowledge** = progressione **personale** e **lifetime**. Risponde a: "Quanto mi conosce l'AI?".
  - Qui i **task hanno senso**: sono "successi" che fanno crescere la barra (impegno, obiettivi settimanali). Non danno punti classifica (dopo la decisione §9), quindi non incentivano a caricare partite ad hoc per la competizione.
  - Messaggio: "Compila profilo, rosa, carica partite, completa i task, usa la Palestra: la barra sale. Non serve spendere di più per arrivare prima; serve dare dati e impegno."

- **Classifica** = competizione **mensile**. Risponde a: "Chi si è impegnato di più nel mese?".
  - Partite (conteggio + quality) + utilizzo IA + profilo. L'**utilizzo** è a consumo, ma **partite** e **profilo** no. Quindi la posizione non è "solo chi spende": è chi gioca (e carica), chi usa gli strumenti (consumo), chi completa il profilo.
  - Messaggio: "La classifica premia l'impegno: partite caricate, uso degli strumenti, profilo. I crediti ti permettono di usare gli strumenti; la posizione dipende da come li usi e da quanto ti fai conoscere."

- **Task** = solo **barra**, non classifica. Coerente con §9 (niente incentivo a manipolare partite per la classifica) e con "non solo chi spende" (i task non costano crediti; costano impegno e dati partita che carichi).

### 10.4 Regola di prodotto da comunicare

- **Barra:** "Quanto l'AI ti conosce dipende soprattutto da ciò che **condividi** (profilo, rosa, partite) e dall'**impegno** (task, miglioramenti, Palestra). Solo una piccola parte dipende dall'uso a consumo. Puoi arrivare in alto anche senza spendere tanto."
- **Classifica:** "La classifica premia **l'impegno nel mese**: partite caricate, utilizzo degli strumenti AI, profilo completo. I task settimanali servono a far crescere la **barra**, non i punti classifica."
- **A consumo:** I crediti sbloccano **uso** (chat, analisi, contromisure, Palestra). L'uso conta in classifica (utilizzo IA) e un po' nella barra (utilizzo 5%, Palestra 10%). Ma **né la barra né la classifica sono "chi più spende vince"**: entrambe hanno leve forti non a consumo (profilo, partite, rosa, task sulla barra; partite e profilo in classifica).

### 10.5 Se in futuro si vuole rafforzare "non solo chi spende"

- **Barra:** tenere basso il peso di "utilizzo" (es. 5% come oggi) e di "Palestra" (10% con tetto 4+ sessioni), così la progressione resta dominata da dati e impegno.
- **Classifica:** esplicitare in UI il breakdown (es. "X pt da partite, Y da utilizzo, Z da profilo") e magari dare più peso a profilo/partite e meno al solo volume di utilizzo, se si vuole ridurre la percezione "chi spende di più vince".
- **Task:** mantenerli **solo** sulla barra (successi), non in classifica: così "arrivare prima" sulla barra passa da impegno/task, non da spesa.

---

## 11. Come procedere — Piano e consigli (con riferimenti)

### 11.1 Ordine consigliato (fasi)

**Fase 1 — Decisione e codice (impatto alto, rischio basso)**  
1. **Implementare la decisione §9:** togliere task (e opzionalmente improvement) dal calcolo classifica in `leaderboardHelper.js`.  
2. **Ricalcolare/aggiornare:** snapshot classifica mese corrente (se necessario) e verificare che l’API restituisca punteggi coerenti.  
3. **Test:** utente con molti task ma poche partite/usage deve vedere meno punti in classifica rispetto a prima (o uguali se improvement resta).

**Fase 2 — Trasparenza (fiducia utente)**  
4. **Copy e UI:** spiegare chiaramente come si calcolano i punti classifica e a cosa serve la barra (cf. best practice: "Explain how feedback directly influences rankings", titoli/regole chiare — Trophy.so, Leaderboarded, LM Arena FAQ).  
5. **i18n:** aggiungere/aggiornare chiavi per: (a) descrizione classifica ("Da dove vengono i punti: partite, utilizzo AI, profilo"); (b) tooltip barra ("La barra cresce con ciò che condividi e con i task; i task non danno punti classifica").  
6. **Opzionale:** in pagina classifica, sezione "Come funziona" con breakdown (es. "X pt partite, Y pt utilizzo, Z pt profilo") — aumenta percezione di fairness (ricerca: trasparenza metodologia = più fiducia).

**Fase 3 — Validazione e iterazione**  
7. **Metriche:** definire KPI (es. riduzione support "perché non salgo in classifica?", engagement barra/task).  
8. **Feedback:** raccogliere commenti su chiarezza e percezione "pay-to-win"; iterare su copy e eventualmente pesi (es. più peso a profilo/partite se serve).

### 11.2 Consigli da letteratura / web

- **Gamification a consumo:** "Player-first philosophy" prima della monetizzazione; "monetization breadth" (molte opzioni accessibili) meglio di "depth" (pochi must-have costosi). Premiare engagement e progressione con leve non solo a consumo (profilo, partite, task) — allineato a §10. (Fonti: Meta Horizon, Microsoft consumable ecosystems.)  
- **Leaderboard con dati self-reported:** Trasparenza sulla metodologia ("come si calcola il punteggio") e su cosa rappresenta la classifica ("impegno sulla piattaforma", non "merito sportivo verificato") riduce delusioni e accuse di manipolazione. (The Leaderboard Illusion, Chatbot Arena — selective reporting e trust.)  
- **Dual system (barra + classifica):** Progress bar + leaderboard insieme funzionano bene: la prima per progressione personale, la seconda per competizione. Offrire entrambe con regole chiare e distinte. (JMIR gamification education, Estha quiz guide — engagement e motivazione.)  
- **Implementazione:** Partire piccolo (una modifica alla volta), obiettivi e KPI chiari, integrare nella UX esistente senza sovraccaricare. (Gamification in software development, StriveCloud playbook.)

### 11.3 Checklist operativa (primo sprint) — applicata 2026-02-14

- [x] `leaderboardHelper.js`: rimosso contributo di `tasks` e `improvement` dal punteggio; breakdown.tasks e breakdown.improvement impostati a 0; punti = partite + usage_ia + profile.  
- [x] Commenti in leaderboardHelper aggiornati con formula attuale.  
- [x] i18n: aggiornati `comeSalireHint` (IT/EN), `tourClassificaYourPositionDesc`, `tourDashboardClassificaDesc` (partite, utilizzo IA, profilo; task servono alla barra).  
- [x] Pagina classifica: il "Dettaglio punti" mostra solo le tre voci che contano (partite, utilizzo IA, profilo).  
- [ ] (Opzionale) Tooltip su barra AI Knowledge con messaggio §10.4.  
- [ ] Verifica snapshot e API; test manuale con 1–2 utenti tipo.

---

## 12. Verifica sicurezza e coerenza (post-modifica §9)

### 12.1 Sicurezza

- **API leaderboard (GET /api/leaderboard):** La risposta espone **solo** `rank`, `nickname`, `points` nella lista `rankings`. Nessun `user_id` né `points_breakdown` per gli altri utenti. L’oggetto `currentUser` (con `pointsBreakdown`) è incluso **solo** per l’utente autenticato (authUserId). Coerente con `docs/SICUREZZA.md` (endpoint pubblico: rank, nickname, points; mai user_id né breakdown per altri).
- **Tabella leaderboard_snapshots:** RLS attivo; nessuna policy SELECT per anon/authenticated (`restrict_leaderboard_snapshots_rls.sql`). Solo il backend con service_role legge/scrive. I client non accedono mai alla tabella direttamente.
- **Calcolo punti:** Eseguito solo server-side in `leaderboardHelper.calculateUserCoachPoints`; nessun input utente nel calcolo (dati da DB). Nessun rischio di manipolazione client sui punti.
- **Rate limiting:** `/api/leaderboard` e `/api/leaderboard/me` hanno rate limit configurati in `lib/rateLimiter.js`.

### 12.2 Coerenza dopo rimozione task/improvement

- **Formula:** Punti = partite + utilizzo_ia + profilo. `breakdown.tasks` e `breakdown.improvement` sono 0 e non entrano nel totale. Il breakdown mostrato in UI (pagina classifica) contiene solo le tre voci che contano.
- **Snapshot:** Per il **mese corrente** la classifica è sempre ricalcolata con `computeLeaderboardForMonth` (nuova formula) e salvata. I **mesi passati** restano con gli snapshot già salvati (calcolo storico con vecchia formula). Opzionale: in futuro si può eseguire un recompute una tantum per mesi passati se si vuole uniformità; non obbligatorio.
- **RPC Supabase:** `get_leaderboard_for_month` e `get_leaderboard_current_user` leggono da `leaderboard_snapshots`. Quando il mese corrente viene scritto dal backend (dopo la modifica), i valori in snapshot sono già con la nuova formula. Il fallback RPC è quindi coerente.
- **i18n e copy:** Aggiornati `comeSalireHint`, `tourClassificaYourPositionDesc`, `tourDashboardClassificaDesc`, `guideClassificaDesc` (IT/EN): punti da partite, utilizzo IA e profilo; i task servono alla barra, non alla classifica.

### 12.3 Checklist coerenza (applicata)

- [x] Nessun punto classifica derivato da task/improvement nel codice.
- [x] Breakdown esposto all’utente contiene solo partite, utilizzo IA, profilo.
- [x] Copy (i18n e guida) allineati alla nuova formula.
- [x] API non espone user_id né breakdown per altri utenti.
- [x] RLS leaderboard_snapshots: nessun accesso client diretto.
