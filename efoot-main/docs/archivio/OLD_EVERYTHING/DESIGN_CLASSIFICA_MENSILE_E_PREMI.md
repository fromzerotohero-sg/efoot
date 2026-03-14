# Design: Classifica mensile e premi (gamification)

**Obiettivo:** classifica mensile tra tutti i giocatori, con premi (coach gratuito, crediti, biglietti partita, stampa 3D giocatore), evitando che si salga in classifica caricando “a vuoto” solo per il ranking.

---

## 0. Narrativa: From Zero to Hero

Il sito **From Zero to Hero** premia chi davvero usa l'app, completa gli obiettivi e **migliora**. La classifica mensile riflette tre pilastri:

| Pilastro | Cosa premia | In formula |
|----------|-------------|------------|
| **Utilizzo** | Chi usa l'app: partite complete, utilizzo IA (chat, analisi, contromisure), profilo curato. | P_partite, P_uso_IA, P_profilo |
| **Task** | Chi completa gli obiettivi settimanali (impegno coerente con gli obiettivi). | P_obiettivi |
| **Miglioramento** | Chi migliora di più: obiettivi "di crescita" completati, eventuale crescita Conoscenza IA nel mese. | P_miglioramento |

Così non vince solo chi "fa tanto", ma chi **usa**, **rispetta i task** e **migliora** (zero → hero).

---

## 1. Obiettivo e premi

| Premio | Idea | Note |
|--------|------|------|
| **Coach gratuito** | Abbonamento / periodo senza costo per il “coach” (funzioni IA o premium). | Da definire: 1 mese gratis, estensione abbonamento, ecc. |
| **Crediti omaggio** | Hero Points aggiuntivi per il mese successivo. | Es. +100 HP per il 1°, +50 per 2°–3°, +25 per 4°–10°. |
| **Biglietti partita** | Partner / sponsor: 1–2 biglietti per una partita reale. | Logistica esterna; in classifica si può indicare “Premio: biglietto partita” e gestire a parte. |
| **Stampa 3D giocatore** | Il cliente sceglie un giocatore dalla sua rosa; voi producite (o commissionate) stampa 3D. | Necessita: scelta giocatore (id/name), indirizzo spedizione, costo/logistica. |

La classifica è **mensile** (es. dal 1° al last day del mese); i premi si assegnano a fine mese (o all’inizio del mese successivo).

---

## 2. Metrica: “Punti Coach” mensili

Per evitare che basti “caricare tanto” per vincere, la metrica deve combinare **qualità**, **varietà** e **tetto per categoria**.

Proposta: **Punti Coach** = somma di sotto-componenti (con **cap per componente** e **soglie minime**).

**Ruolo dei task:** gli obiettivi settimanali (task) sono un **fattore importante** nella compilazione della classifica: riflettono impegno reale (partite giocate, miglioramenti tattici, uso consigli IA) e non sono sfruttabili a vuoto perché il completamento è calcolato server-side da dati partita/profilo. Dare loro un peso adeguato incentiva il giocatore a usare l'app in modo coerente con gli obiettivi (analisi, formazione, risultati) e non solo a caricare partite.

### 2.1 Componenti (tutte nel mese di riferimento)

| Componente | Cosa conta | Cap mensile | Anti-gaming |
|------------|------------|-------------|--------------|
| **Partite complete** | Partite con `data_completeness = 'complete'` e `match_date` nel mese. | Es. max **15** partite che contano (oltre non danno punti). | Chi carica 50 partite “complete” non ha vantaggio oltre le 15. |
| **Qualità partite** | Opzionale: partite con almeno 1 foto (`photos_uploaded >= 1`) o con `team_stats` valorizzato danno 1 punto in più. | Stesso tetto partite (es. 15). | Incentiva dati reali, non solo click “completa”. |
| **Obiettivi settimanali (task)** | Obiettivi con `status = 'completed'` e `completed_at` nel mese. Peso importante in classifica. | Max **5** obiettivi che contano (circa 1 a settimana). | Evita che qualcuno “sforni” solo task facili; 5 = circa 1 a settimana. |
| **Utilizzo IA (variegato)** | Utilizzi distinti: chat, analisi partita, contromisure, estrazione formazione/giocatore/coach. | Es. max **20** “azioni” che contano, con bonus se usa almeno 3 tipi diversi (chat + analisi + contromisure). | Non basta usare solo la chat 100 volte. |
| **Profilo e impegno** | Profilo completato (soglia es. `profile_completion_score >= 80`), oppure “attività in X giorni distinti nel mese”. | 1 volta (sì/no). | Entrare in classifica richiede un minimo di serietà. |
| **Miglioramento (Zero → Hero)** | Task "di crescita" completati; eventuale delta Conoscenza IA (vedi §2.3). | Cap 4 task crescita; delta AI max 15 pt. | Premia chi migliora davvero. |

**Quanto paghiamo i task:** vedi sezione **2.2** per le opzioni (flat 4 pt, per difficoltà, per goal_type) e la proposta operativa.

Formula di esempio (con flat 4 pt per task):

- **P_partite** = min(15, partite_complete_mese) × 2 punti  
  (+ 1 punto per partita se `photos_uploaded >= 1` o team_stats presente, sempre dentro il cap 15).
- **P_obiettivi** = min(5, obiettivi_completati_mese) × **4** punti (ruolo importante; vedi §2.2).
- **P_uso_IA** = min(20, utilizzi_totali_mese) × 0.5 punti, + bonus 5 se tipi_distinti >= 3.
- **P_profilo** = 5 se profile_completion_score >= 80, altrimenti 0.
- **P_miglioramento** = bonus task "di crescita" + eventuale delta Conoscenza IA (vedi §2.3).

**Il caricamento statistiche ci aiuta:** sì. (1) Le partite con `team_stats` valorizzato (possesso, gol segnati/subiti, tiri, ecc.) contribuiscono a `data_completeness = 'complete'` e quindi entrano nel conteggio partite. (2) Nella formula qualità, ogni partita con statistiche caricate (o con foto) dà **+1 punto** in più. (3) I task di crescita (`reduce_goals_conceded`, `improve_possession`) usano proprio quei dati: senza statistiche caricate il progresso non si aggiorna e non si completano i task "miglioramento". Quindi caricare le statistiche aiuta sia in **utilizzo** (partite complete + bonus qualità) sia in **miglioramento** (task di crescita).

**Punti Coach = P_partite + P_obiettivi + P_uso_IA + P_profilo + P_miglioramento** (poi si ordina per Punti Coach decrescente).

Così:
- **Utilizzo** premiato (partite, IA, profilo).
- **Task** premiati (fino a 20 pt con flat 4 pt).
- **Chi migliora di più** premiato (task di crescita + delta AI, vedi §2.3).
- Un minimo di profilo/qualità è richiesto per essere “in classifica”.

### 2.2 Quanto pagare i task (punti per obiettivo completato)

I task in `weekly_goals` hanno `goal_type` (es. `reduce_goals_conceded`, `increase_wins`, `improve_possession`, `complete_matches`, `use_ai_recommendations`, `improve_defense`) e opzionalmente `difficulty` (`easy`, `medium`, `hard`). Dobbiamo decidere **quanti Punti Coach** assegnare per ogni task completato nel mese.

| Opzione | Descrizione | Pro | Contro |
|--------|-------------|-----|--------|
| **A — Flat** | Ogni obiettivo completato (entro cap 5) vale **X** punti. | Semplice, nessuna disputa. | "Completa 2 partite" vale come "Riduci gol subiti 20%". |
| **B — Per difficoltà** | `easy` = 2 pt, `medium` = 4 pt, `hard` = 6 pt (es.), cap 5. | Incentiva obiettivi più impegnativi. | taskHelper deve valorizzare sempre `difficulty`. |
| **C — Per tipo (goal_type)** | Es. `complete_matches` = 2 pt, `increase_wins` = 4 pt, `reduce_goals_conceded` / `improve_*` = 5 pt. | Allineato al valore che date a quel tipo. | Più da mantenere e da spiegare in regolamento. |

**Proposta operativa (bilanciata con le partite):**

- **Cap task:** max **5** obiettivi che contano nel mese.
- **Punti per task:** tariffa **flat 4 punti** per obiettivo completato (Opzione A).
  - 5 task = **20 punti** max da task; 15 partite × 2 = 30 pt max → i task pesano bene ma non dominano.
- **Alternativa:** Opzione B con `easy = 3`, `medium = 4`, `hard = 5` (sempre cap 5) → max ~25 pt da task.

### 2.3 Premiare chi migliora di più (Zero → Hero)

Per allineare la classifica al nome **From Zero to Hero**, si premia esplicitamente **chi migliora** nel mese, non solo chi fa tanto.

**A) Bonus per task "di crescita" completati**

Alcuni `goal_type` richiedono miglioramento reale (risultati, possesso, difesa). Ogni task di questo tipo completato nel mese dà **punti base (4 pt)** già da §2.2, più un **bonus miglioramento**:

- **Task di crescita** (goal_type): `reduce_goals_conceded`, `increase_wins`, `improve_possession`, `improve_defense` → **+3 punti** per ciascuno (bonus), max **4** task che danno bonus → fino a **12 pt** da P_miglioramento (solo task).
- **Task "solo utilizzo"** (`complete_matches`, `use_ai_recommendations`): danno solo i 4 pt base, nessun bonus miglioramento.

Esempio: chi completa 2 task "reduce_goals_conceded" e 1 "improve_possession" nel mese ottiene 3×4 = 12 pt da P_obiettivi + 3×3 = 9 pt da P_miglioramento (bonus task crescita).

**B) Delta Conoscenza IA nel mese (opzionale)**

Se a inizio mese salvate lo score Conoscenza IA (es. in `leaderboard_snapshots` o tabella `ai_knowledge_snapshots`: `user_id`, `month`, `score_inizio_mese`), a fine mese potete calcolare:

- **Delta** = score_fine_mese − score_inizio_mese (solo se positivo).
- **P_miglioramento_AI** = min(15, floor(delta)) punti (es. +5 punti di crescita = 5 pt bonus).

Pro: molto "Zero → Hero". Contro: serve snapshot inizio mese (cron o salvataggio al 1° del mese).

**Formula P_miglioramento (proposta):**

- **P_miglioramento** = (min(4, count task_di_crescita_completati_mese) × 3) + (opzionale: min(15, delta_AI_mese)).
- Cap: max 12 pt da bonus task crescita + max 15 pt da delta AI = **max 27 pt** da miglioramento.

Riassunto tre pilastri in punti:

| Pilastro | Come si premia | Max punti (es.) |
|----------|----------------|------------------|
| **Utilizzo** | Partite, uso IA, profilo | ~35 (15×2 + 10 + 5 + bonus varietà) |
| **Task** | Obiettivi completati (4 pt/task, cap 5) | 20 |
| **Miglioramento** | Task crescita (+3 pt/task, cap 4) + delta AI (opz. max 15) | 12–27 |

---

## 3. Regole anti-gaming (sintesi)

1. **Tetti per categoria** (partite, obiettivi, utilizzi IA) come sopra.
2. **Solo partite “complete”** (e opzionalmente con foto/dati) per evitare 100 partite vuote.
3. **Solo obiettivi davvero completati** (stato `completed`); verificare che il calcolo del progresso sia server-side e non manipolabile dal client (ODIT segnala RLS su `weekly_goals`: evitare che l’utente possa fare UPDATE sui propri goal).
4. **Soglia di accesso alla classifica**: es. almeno 3 partite complete nel mese **e** almeno 1 obiettivo completato **e** profile_completion >= 50%. Così chi fa solo una cosa “a caso” non entra.
5. **Un solo account per persona** (regolamento): da far accettare in ToS; eventuale controllo a campione (stesso indirizzo, stesso pagamento, ecc.).
6. **Anomalie**: se in un mese un utente ha es. > 30 partite con stessa formazione e stesso risultato, si può escludere dalla classifica o segnalare (da implementare in seguito).

---

## 4. Premi: logistica e flussi

| Premio | Chi assegna | Flusso possibile |
|--------|-------------|-------------------|
| **Coach gratuito** | Vostro backend / abbonamento. | A fine mese: flag “premio_mese_YYYY_MM” o estensione subscription; l’utente vede “Coach gratuito fino a …” in app. |
| **Crediti omaggio** | Vostro backend. | Chiamata a `accreditPurchase` (o funzione dedicata “premio classifica”) con amount per posizione (1°, 2°–3°, 4°–10°); messaggio in app “Hai vinto X Hero Points per la classifica di [mese]”. |
| **Biglietti partita** | Partner / voi. | Comunicazione al vincitore (email + in-app), link o form per scegliere partita/ritiro; nessun dato sensibile in classifica. |
| **Stampa 3D** | Voi / fornitore. | In app: “Scegli il giocatore da stampare” (lista rosa utente) → salvataggio scelta (player_id + user_id); poi flusso ordine/spedizione (email, indirizzo) fuori dalla classifica pubblica. |

I premi vanno citati nel **regolamento** della classifica (chi ha diritto, come si assegnano, esclusione per frode, un solo account per persona).

---

## 5. UX: accattivante, coinvolgente, creare buzz

La classifica deve essere **molto coinvolgente** e dare voglia di tornare e migliorare. Idee concrete:

**A) Countdown e urgenza**
- In dashboard e/o in pagina classifica: "La classifica di [mese] si chiude tra **X giorni**" (countdown al last day del mese).
- Messaggio tipo: "Mancano pochi giorni: ogni partita e ogni task contano."

**B) Progresso e motivazione**
- **Barra "Punti Coach questo mese"**: obiettivo visivo (es. "45 / ~80 pt possibili" o "Sei al 60% del tuo potenziale mese").
- **Distanza dal prossimo posto**: "A **5 punti** dal 10° posto" o "Sei **3°**: a 8 pt dal 2°".
- Messaggi contestuali: "Carica le statistiche della partita per +1 pt e per far contare i task di crescita."

**C) Badge e livelli (Zero → Hero)**
- Badge visibili in profilo e in classifica: "Nuovo in classifica", "Top 50", "Top 10", "Podio", "Hero del mese (1°)".
- Livelli narrativi: "Zero" → "In crescita" → "Competitor" → "Hero" (legati a posizione o a soglie di punti).
- Animazione / micro-celebrazione quando si sale di posizione (es. dopo refresh) o quando si entra in Top 10.

**D) Notifiche soft (in-app o email)**
- "Sei entrato in Top 20!" / "Sei a X pt dal 10° posto."
- A fine mese: "La classifica di [mese] è chiusa. Sei finito in **12°** con 48 pt. Vedi risultati e premi."
- Se ha vinto un premio: "Hai vinto un premio! Vai in Profilo → Premi per riscattare."

**E) Condivisione (opzionale, per buzz)**
- Pulsante "Condividi il mio risultato" (testo + link): "Sono **7°** nella classifica From Zero to Hero di febbraio. Prova anche tu."
- Solo se l’utente ha dato consenso; link a landing o app.

**F) Copy e tono**
- Linguaggio "From Zero to Hero": "Salite in classifica", "Il tuo percorso Hero", "Risultati ottenuti".
- Evitare solo numeri freddi: accompagnare con una frase breve motivazionale.

---

## 6. Ranking e risultati in profilo

Nel **Profilo** (gestione-profilo) l’utente deve vedere chiaramente **dove sta** e **cosa ha ottenuto**.

**A) Sezione "Classifica mensile" (in gestione-profilo)**
- **Questo mese**: posizione attuale (es. "12°"), Punti Coach del mese, piccola barra progresso (opzionale).
- Link evidente: "Vedi classifica completa" → pagina `/classifica` o `/leaderboard`.
- Se non in classifica (soglia non raggiunta): "Entra in classifica: completa almeno 3 partite e 1 obiettivo questo mese."

**B) Risultati ottenuti (storico)**
- Blocco "Risultati ottenuti" o "Storico classifica":
  - Elenco per mese: "**Gennaio 2026**: 15° con 42 pt", "**Febbraio 2026**: 3° con 68 pt".
  - Badge/trofeo per posizioni di rilievo: "Top 10 Febbraio 2026", "Podio Gennaio 2026".
- Così il profilo diventa il "trofeo" del percorso Zero → Hero.

**C) Coerenza con Rank attuale**
- Oggi in profilo c’è il **Rank** (Platinum/Gold/Silver/Bronze) da balance Hero Points: è un concetto diverso (livello spesa/crediti).
- Mantenerlo e **affiancare** "Rank classifica" o "Posizione classifica [mese]" per non confondere: un box "Classifica" con posizione + link, e un box "Risultati ottenuti" con lo storico.

**D) Dati da mostrare (esempio)**
- Posizione corrente nel mese (e totale in classifica, es. "su 127 coach").
- Punti Coach del mese; in profilo puoi mostrare anche il **tuo** breakdown (da partite, da task, da miglioramento) — in classifica pubblica restano solo nick e punti (vedi §9).
- Ultimo aggiornamento: "Aggiornato dopo la tua ultima partita".

---

## 7. Riscatto premio

Flusso chiaro e rassicurante: l’utente deve **vedere** di aver vinto e **poter riscattare** senza dubbi.

**A) Notifica vittoria**
- A inizio mese (o a chiusura classifica): notifica in-app + eventuale email: "Hai vinto un premio per la classifica di [mese]: [nome premio]. Vai in Profilo → Premi per riscattare."

**B) Sezione "I miei premi" (in gestione-profilo)**
- Lista premi vinti: mese, premio (Coach gratuito / Crediti / Biglietto / Stampa 3D), **stato**: "Da riscattare" | "Riscattato il [data]".
- Per ogni premio "Da riscattare": pulsante **"Riscatta"** che apre il flusso specifico.

**C) Flussi di riscatto per tipo**
| Premio | Cosa fa "Riscatta" | Dopo il riscatto |
|--------|--------------------|-------------------|
| **Coach gratuito** | Conferma → backend attiva periodo gratuito; in UI: "Riscattato. Coach attivo fino al [data]." | Stato "Riscattato il [data]". |
| **Crediti omaggio** | Crediti già accreditati automaticamente a inizio mese; "Riscatta" = solo "Vedi dettaglio" / "Conferma ricezione". | Mostra "Già accreditati: +X HP" e stato "Riscattato". |
| **Biglietto partita** | Form o link esterno: scegli partita / ritiro; salvataggio scelta; email con istruzioni. | "Riscattato: riceverai istruzioni via email." |
| **Stampa 3D** | Scelta giocatore dalla rosa (lista + selezione) → form indirizzo spedizione → invio. | "Riscattato: ordine in elaborazione." |

**D) Persistenza**
- Tabella `user_prizes` (o in `leaderboard_snapshots`): `user_id`, `month`, `prize_type`, `position`, `status` ('pending_redemption' | 'redeemed'), `redeemed_at`, `metadata` (es. player_id per stampa 3D, indirizzo).
- Così in profilo si legge da DB quali premi ha e lo stato.

**E) Copy**
- "Hai vinto: [premio]. Clicca sotto per riscattare." / "Premio riscattato il [data]. Grazie per aver fatto parte di From Zero to Hero."

---

## 8. Dove mostrare cosa (mappa UX)

| Luogo | Cosa mostrare |
|-------|----------------|
| **Dashboard (home)** | Widget "Classifica [mese]": posizione + Punti Coach + "Vedi classifica"; opzionale countdown fine mese; se ha premio da riscattare: banner "Hai un premio da riscattare" → link a Profilo. |
| **Gestione profilo** | Sezione "Classifica mensile" (posizione + punti + link); sezione "Risultati ottenuti" (storico per mese + badge); sezione "I miei premi" (lista + Riscatta). |
| **Pagina dedicata `/classifica`** | Classifica completa (top N), "La tua posizione" (sempre visibile se in classifica), countdown, regolamento breve, CTA "Come salire" (partite, task, statistiche). |
| **Notifiche / email** | Fine mese: risultato (posizione + eventuale premio). Premio vinto: "Vai a riscattare". Durante il mese (opzionale): "Sei a X pt dal 10° posto." |

Riassunto: **accattivante** (countdown, barra, badge, messaggi); **risultati in profilo** (posizione + storico + premi); **riscatto premio** (sezione chiara + flussi per tipo); **buzz** (condivisione, notifiche, copy Zero → Hero).

---

## 9. Privacy e visibilità classifica

- **Cosa si vede in classifica (pubblico):** solo **posizione (rank)**, **nickname** e **punti totali**. Non si mostra come l’utente ha ottenuto i punti (nessun breakdown: da partite, da task, da miglioramento). La classifica è una tabella semplice: # | Nickname | Punti.
- **Breakdown punti:** il dettaglio “come hai ottenuto i punti” è **solo per l’utente stesso** in Profilo (es. “I tuoi punti: 12 da partite, 16 da task, 9 da miglioramento”). In classifica pubblica e nelle righe degli altri non appare mai.
- **Nickname / nome visibile:** in classifica mostrare solo nickname o “Coach [nickname]” (o first_name se l’utente acconsente). Evitare email e dati sensibili.
- **Consenso:** prima di includere un utente in classifica, mostrare un breve testo (“La tua posizione e nickname potrebbero essere visibili nella classifica mensile”) e checkbox/consenso esplicito; salvare in `user_profiles` (es. `leaderboard_consent = true`).
- **Opt-out:** chi non acconsente non appare in classifica (ma può comunque accumulare punti per uso interno o per premi “anonimi” se decidete così).

---

## 10. Cosa serve in prodotto / tecnico

- **Periodo fisso:** mese calendario (es. `YYYY-MM`); stessa chiave che usate per i crediti (`period_key`) dove utile.
- **Calcolo Punti Coach:**  
  - Query su `matches` (filter `match_date` nel mese, `data_completeness = 'complete'`),  
  - su `weekly_goals` (filter `completed_at` nel mese, `status = 'completed'`),  
  - su `credit_transactions` (filter `created_at` nel mese, `type = 'usage'`, raggruppamento per `description`),  
  - su `user_profiles` (profile_completion_score, leaderboard_consent).  
  Applicare tetti e formula; ordinare; restituire top N (es. 50 o 100).
- **API:** es. `GET /api/leaderboard?month=2026-02` (solo lettura, pubblica o con auth leggera) che restituisce per la **classifica pubblica** solo `{ month, rankings: [{ rank, nickname, points }] }` — niente `userId` in chiaro per gli altri, niente breakdown. Per l’utente loggato si può restituire anche `currentUser: { rank, points, pointsBreakdown }` (il breakdown solo per sé). L’utente corrente può vedere la propria posizione anche se fuori dalla top N.
- **Storage:** opzionale tabella `leaderboard_snapshots` (month, user_id, points, rank, component_breakdown) per storico e per assegnazione premi; il `component_breakdown` resta interno (backend / profilo utente), non esposto in classifica.
- **Assegnazione premi:** job o script a inizio mese che: calcola classifica del mese precedente; per ogni posizione premio chiama accredit/estensioni e (se previsto) invia email “Hai vinto …”; per stampa 3D salva scelta giocatore e trigger per logistica.

---

## 11. Passi successivi (ordine suggerito)

1. **Definire formula finale** (pesi, tetti, soglie minime) e regolamento (premi, esclusioni, un account per persona).
2. **Implementare calcolo Punti Coach** (funzione o API interna) e verificare che i dati usati siano “puliti” (RLS, no UPDATE obiettivi da client).
3. **Aggiungere consenso classifica** in profilo e in signup/flusso primo accesso.
4. **API leaderboard** e una pagina “Classifica mensile” (top N + “La tua posizione”).
5. **Profilo:** sezione Classifica (posizione + punti + link), Risultati ottenuti (storico), I miei premi (Riscatta).
6. **Flussi riscatto** e tabella `user_prizes`; notifiche "Hai vinto" / "Premio da riscattare".
7. **Automatizzare assegnazione premi** (crediti, coach, biglietti, stampa 3D).
8. **UX coinvolgente:** widget dashboard, countdown, barra punti, badge (vedi §5 e §8).

Se vuoi, il prossimo passo può essere: (a) fissare i numeri della formula (tetti, punti per partita/obiettivo/utilizzo) e (b) abbozzare lo schema della tabella `leaderboard_snapshots` e la signature dell’API `GET /api/leaderboard`.
