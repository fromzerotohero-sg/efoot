# Coerenza task (Obiettivi settimanali) e dati cliente

**Scopo:** Verificare che ogni obiettivo sia generato e misurato usando **solo** dati che abbiamo realmente sul cliente, e che la logica di completamento sia coerente con il significato dell’obiettivo.

---

## 1. Dati che abbiamo sul cliente

| Fonte | Contenuto rilevante per i task |
|-------|---------------------------------|
| **matches** | `match_date`, `result`, `team_stats` (possession, goals_conceded), `data_completeness`, `formation_played`, `recommended_formation_used` |
| **credit_transactions** | `type = 'usage'`, `description` (assistant-chat, analyze-match, generate-countermeasures, extract-formation, extract-match-data, extract-game-analysis), `created_at` |
| **user_profiles** | `common_problems` (array, es. "difesa") – usato solo per decidere *se* generare il task improve_defense |

**Regola (già in taskHelper):** Ogni `goal_type` deve essere **calcolabile solo** da: (a) dati partita, (b) log credit_transactions, (c) profilo (solo per scelta generazione). Nessun dato autodichiarato usato come *misura* del progresso (es. `use_recommended_formation` non è più generato; i task esistenti restano nascosti in list).

---

## 2. Per ogni goal_type: generazione vs misura

### complete_matches
- **Generazione:** Sempre (task generico). Target 3. Descrizione: "Completa almeno 3 partite questa settimana".
- **Misura:** Conteggio partite nella **settimana del task** con `data_completeness === 'complete'`.
- **Dato usato:** `matches.data_completeness`, `matches.match_date`.
- **Coerenza:** ✅ Stesso concetto: “partite complete” = partite con completezza salvata.

### increase_wins
- **Generazione:** Sempre (generico o personalizzato se win rate < 50%). Target 3. "Vinci 3 partite".
- **Misura:** Conteggio partite nella settimana del task con `result` considerato vittoria (`isWin`: W, VITTORIA, WIN, o punteggio tipo X-Y con X > Y).
- **Dato usato:** `matches.result`, `matches.match_date`.
- **Coerenza:** ✅ Vittorie = risultato partita.

### use_ai_recommendations
- **Generazione:** Sempre. Target 2. "Usa chat/analisi/contromisure almeno 2 volte".
- **Misura:** Conteggio transazioni in **settimana del task** con `type = 'usage'` e `description` in whitelist (assistant-chat, analyze-match, generate-countermeasures, extract-formation, extract-match-data, extract-game-analysis).
- **Dato usato:** `credit_transactions.type`, `credit_transactions.description`, `credit_transactions.created_at`.
- **Coerenza:** ✅ Utilizzi IA = transazioni di utilizzo nelle stesse operazioni citate in descrizione.

### reduce_goals_conceded
- **Generazione:** Solo se media gol subiti (ultime 10 partite) > 2.0. Target = media × 0.8 (riduzione 20%). Descrizione "da X a Y per partita".
- **Misura:** Media gol subiti nelle partite della **settimana del task** (ultime 5 nella settimana). Fonte: `team_stats.goals_conceded` o parsing di `result` (es. "6-1" → 1 gol subito).
- **Completamento:** **Lower is better** → task completato quando `current_value <= target_value` (non quando current >= target). Corretto in taskHelper.
- **Dato usato:** `matches.team_stats`, `matches.result`, `matches.match_date`.
- **Coerenza:** ✅ Stessa metrica (media gol subiti); generazione su ultime 10, misura sulla settimana del task.

### improve_possession
- **Generazione:** Solo se possesso medio (ultime partite) < 50%. Target = media + 10% (max 100%). Descrizione "da X% a Y%".
- **Misura:** Media `team_stats.possession` nelle partite della settimana del task (ultime 5).
- **Dato usato:** `matches.team_stats.possession`, `matches.match_date`.
- **Coerenza:** ✅ Stesso indicatore (possesso %); target_value è la % obiettivo (es. 58), completamento quando current_value >= target.

### improve_defense
- **Generazione:** Solo se `profile.common_problems` contiene "difesa" (case-insensitive). Target 2. "Usa formazione più difensiva in almeno 2 partite".
- **Misura:** Conteggio partite nella settimana del task con `formation_played` in whitelist difensiva: 5-3-2, 5-4-1, 3-5-2, 4-1-4-1, 5-2-2-1, 3-4-2-1, 4-2-3-1, 4-4-1-1.
- **Dato usato:** Generazione = `user_profiles.common_problems`; misura = `matches.formation_played`, `matches.match_date`.
- **Coerenza:** ✅ Il profilo decide *se* proporre il task; il progresso è solo da dati partita (formazione giocata).

### use_recommended_formation (non più generato)
- **Visibilità:** Escluso dalla risposta di GET /api/tasks/list (`goal_type !== 'use_recommended_formation'`). Progresso ancora calcolato per task storici (da `matches.recommended_formation_used`).
- **Coerenza:** Dato autodichiarato; non usato per nuovi obiettivi.

---

## 3. Finestre temporali

| Fase | Finestra |
|------|----------|
| **Generazione** | Ultime **10** partite (per medie e win rate); profilo e patterns (questi ultimi oggi non usati nella logica di generazione). |
| **Misura** | Solo partite (e transazioni) nella **settimana del task** (week_start_date → week_end_date). |

Quindi: l’obiettivo è “in questa settimana raggiungi X”; il progresso conta solo ciò che succede in quella settimana. Coerente.

---

## 4. Cosa non usiamo (ma abbiamo)

- **team_tactical_patterns:** Recuperato in `generateWeeklyTasksForUser` ma **non** usato in `generateTasksBasedOnData`. Possibile uso futuro (es. task su formazione più usata, stile, ecc.) senza introdurre dati non misurabili.
- **recommended_formation_used:** Usato solo per task legacy `use_recommended_formation` (nascosti in list). Non usato per nuovi task.

---

## 5. Riepilogo coerenza

- Ogni obiettivo è **generato** e **misurato** con dati che abbiamo (partite, transazioni, profilo solo per scelta).
- Nessun obiettivo dipende da dati che non persistiamo o che non aggiorniamo.
- **reduce_goals_conceded:** completamento corretto (lower is better).
- **use_ai_recommendations:** aggiornato anche al caricamento lista (sync su GET /api/tasks/list per settimana corrente), non solo al save partita.

Documento di riferimento per estensioni future: ogni nuovo `goal_type` deve avere sorgente dati chiara (partite / credit_transactions / profilo) e logica di completamento coerente (higher vs lower is better).
