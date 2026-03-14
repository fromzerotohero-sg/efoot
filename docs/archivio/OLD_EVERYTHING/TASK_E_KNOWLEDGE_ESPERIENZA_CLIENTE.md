# Task e barra Conoscenza: esperienza cliente, scalabilità, fattibilità

Documento di prodotto: cosa succede quando il cliente completa un task, come si collega alla barra, scalabilità, fattibilità, varietà e gap da colmare per una piattaforma “perfetta”.

---

## 1. Quando completo un task, cosa succede?

### 1.1 Lato backend (automatico)

1. **Salvataggio partita** → l’API aggiorna il progresso di tutti i task attivi (settimana corrente + ultime 2 settimane).
2. Per ogni task, si ricalcola `current_value` in base ai dati (partite, credit_transactions, ecc.).
3. Se `current_value >= target_value` → il task viene segnato **completed** e si imposta `completed_at`.
4. Se almeno un task è passato a completed → viene chiamato **updateAIKnowledgeScore** (in background, non blocca la risposta).

### 1.2 Barra Conoscenza IA

- Lo score è composto da: **Profilo (20%)**, **Rosa (25%)**, **Partite (30%)**, **Pattern (15%)**, **Allenatore (10%)**, **Utilizzo (10%)**, **Successi (15%)**.
- La componente **Successi** (fino al 15%) include:
  - **Obiettivi settimanali completati**: fino a **5%** (1% per obiettivo, max 5 obiettivi).
  - Miglioramento divisione (5%), miglioramento performance ultime vs precedenti 10 partite (5%).
- Quindi: **completare task fa salire la barra Conoscenza** (fino a +5% sul totale). Il ricalcolo avviene dopo il salvataggio partita che ha completato il task.

### 1.3 Cosa vede il cliente in UI

- **TaskWidget**: dopo il salvataggio partita viene emesso l’evento `match-saved`; il widget ricarica i task dopo ~1,5 s. Il task completato appare **verde** con “Obiettivo completato” e data.
- **Barra Conoscenza**: ascolta `match-saved` e fa retry con backoff; quando il server ha aggiornato lo score, la barra si aggiorna (percentuale e breakdown).
- **Gap**: non c’è un messaggio esplicito tipo “Obiettivo completato! La barra Conoscenza IA è aumentata”. Il cliente deve collegare da solo task completato ↔ barra che sale.

---

## 2. Scalabilità

| Aspetto | Situazione attuale | Nota |
|--------|---------------------|------|
| **Generazione task** | Una volta per utente per settimana (solo se lista vuota). Fetch: profilo, 10 partite, pattern. | OK. |
| **Aggiornamento progresso** | A ogni salvataggio partita: fetch task attivi (2 settimane), ultime 20 partite, partite per settimana task; per `use_ai_recommendations` query su `credit_transactions` (user_id, type, description in whitelist, intervallo date). | Verificare indice su `credit_transactions(user_id, type, created_at)` per non degradare con molti dati. |
| **Calcolo AI Knowledge** | A ogni richiesta GET /api/ai-knowledge (con cache 5 min): fetch profilo, players, formation, matches (limit), patterns, coach, **weekly_goals (ultimi 20)**. | weekly_goals limit 20 è OK. |
| **Tabella weekly_goals** | Fino a ~5 righe per utente per settimana. | Scalabile. |
| **credit_transactions** | Cresce con ogni utilizzo (chat, analisi, contromisure). Query per task: filtro user_id + type + description + intervallo. | Indice (user_id, created_at) o (user_id, type, created_at) consigliato. |

**Raccomandazione**: verificare in Supabase che esista un indice adeguato su `credit_transactions` per (user_id, created_at) o (user_id, type, created_at).

---

## 3. Fattibilità (obiettivi raggiungibili?)

| Goal type | Cosa chiede | Fattibilità |
|-----------|-------------|-------------|
| **complete_matches** | Completa N partite (tutte le sezioni) nella settimana. | Media: richiede caricamento completo di N partite. |
| **increase_wins** | Vinci N partite nella settimana. | Dipende dal giocatore; 3 vittorie in 7 giorni può essere ambizioso. |
| **reduce_goals_conceded** | Abbassa la media gol subiti (target derivato dai dati). | Fattibile se gioca e carica le partite. |
| **improve_possession** | Aumenta il possesso (target derivato). | Fattibile. |
| **improve_defense** | Gioca N partite con formazione “difensiva” (whitelist fissa). | Fattibile se usa quelle formazioni. |
| **use_ai_recommendations** | Usa almeno N volte le funzioni IA (chat, analisi, contromisure) nella settimana. | Molto fattibile: basta usare l’app. |

**Rischio**: per utenti nuovi, “vinci 3 partite” + “completa 3 partite” nella stessa settimana può essere difficile; “usa 2 consigli IA” bilancia (facile). Valutare in futuro target adattivi (es. 2 partite complete, 2 vittorie) per la prima settimana.

---

## 4. Varietà task

- **Utenti con &lt; 3 partite**: sempre 3 task generici (completa 3 partite, vinci 3 partite, usa 2 consigli IA). Varietà bassa.
- **Utenti con ≥ 3 partite**: fino a 5 task tra reduce_goals_conceded, improve_possession, increase_wins, improve_defense (se profilo “Difesa”), use_ai_recommendations. Varietà buona.
- **Possibili estensioni (solo dati caricati)**: es. “Gioca almeno 2 partite con possesso &gt; 55%”, “Carica almeno 2 partite complete”, “Usa 3 funzioni IA diverse nella settimana”. Aumentano varietà senza introdurre dati autodichiarati.

---

## 5. Completamento barra Conoscenza

- La barra si completa (100%) con: profilo pieno, rosa piena, molte partite, pattern identificati, allenatore, utilizzo, **obiettivi completati e miglioramenti**.
- I task completati contribuiscono **solo alla fetta “Successi”** (max 5% su 15% di quella fetta). Per “completare” la barra servono soprattutto partite, rosa e profilo.
- Messaggio implicito: “Completare obiettivi settimanali aiuta l’IA a conoscerti meglio” è vero ma non è esposto in UI; il cliente potrebbe non capire il nesso.

---

## 6. Cosa manca per un’esperienza “perfetta” (raccomandazioni)

1. **Feedback esplicito al completamento task**  
   Quando un task passa a completed (es. dopo refetch post match-saved), mostrare un messaggio breve: “Obiettivo completato! Contribuisce alla barra Conoscenza IA.” (toast o testo sotto il task). Così il cliente capisce che c’è un beneficio concreto.

2. **Indice credit_transactions**  
   Verificare/aggiungere indice per (user_id, type, created_at) (o almeno user_id, created_at) per mantenere le query dei task veloci con molti dati.

3. **Fattibilità primi utenti**  
   Valutare target leggermente più bassi per la prima settimana (es. 2 partite complete, 2 vittorie) o almeno non mostrare solo obiettivi “difficili” insieme.

4. **Varietà utenti nuovi**  
   Valutare un terzo task generico alternativo (es. “Usa la chat o le contromisure almeno 1 volta”) in rotazione, per non avere sempre la stessa tripletta.

5. **Documentare in UI il nesso task → barra**  
   Nella barra Conoscenza o nel widget Task: una riga di testo tipo “Completare gli obiettivi aumenta la conoscenza che l’IA ha di te” per rendere esplicito il collegamento.

---

## 7. Riepilogo flusso “completo un task”

1. Cliente salva una partita che fa raggiungere il target (es. terza partita completa, terza vittoria, secondo utilizzo IA).
2. Backend aggiorna il task → status completed, completed_at; poi ricalcola AI Knowledge (incluso success = obiettivi completati).
3. Cliente torna in dashboard (o il widget ricarica dopo match-saved): vede il task verde con “Obiettivo completato” e data.
4. La barra Conoscenza si aggiorna (dopo retry): la fetta “Successi” può essere aumentata (fino a +1% per obiettivo, max 5%).
5. Oggi nessun messaggio esplicito che dice “questo obiettivo ha fatto salire la barra”; il nesso è implicito.

Fine documento.
