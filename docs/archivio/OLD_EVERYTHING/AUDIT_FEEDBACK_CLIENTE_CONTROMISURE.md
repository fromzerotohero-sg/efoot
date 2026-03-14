# Audit feedback cliente – Contromisure e dati partite

**Data**: 10 Febbraio 2026  
**Tipo**: Audit (nessuna correzione applicata)  
**Fonte**: Feedback cliente ricevuto

---

## 1. Problemi di caricamento nei suggerimenti contromisure

**Feedback**: "Bisogna essere molto rapidi nel pad e nel capire tutti i suggerimenti in poco tempo. A volte si perde tempo con la foto che non carica e si perde altro tempo."

**Analisi**:
- **Flusso attuale**: Upload foto → `/api/extract-formation` → `/api/save-opponent-formation` → `/api/generate-countermeasures`. Ogni step è una chiamata API separata.
- **Latency**: Extract e Generate usano GPT-4o (vision + reasoning). Nessuna cache, nessun preload.
- **Foto**: `FileReader.readAsDataURL()` + validazione dimensione (max 10MB). Nessun feedback progressivo durante upload.
- **Codice**: `app/contromisure-live/page.jsx` – `handleImageSelect` → `handleExtractFormation` → `handleGenerateCountermeasures` (sequenziali).

**Possibili cause**: (1) Upload lento su connessioni deboli; (2) Extract formation lento (vision API); (3) Generate countermeasures lento (prompt grande, modello pesante); (4) Nessun loading state granulare per capire dove si blocca.

---

## 2. Linea di difesa bassa – cosa intende?

**Feedback**: "Quando suggerisce linea di difesa bassa cosa intende... una tacca blu? Abbassare i giocatori in campo? E si dove come collezione?"

**Analisi**:
- **Implementazione**: `linea_bassa` è un’istruzione individuale in `difesa_1` e `difesa_2` (`lib/tacticalInstructions.js`).
- **Validazione**: Non assegnabile a difensori (DC, TD, TS); solo CC e attaccanti.
- **Prompt contromisure**: "Linea bassa: NON assegnabile a difensori".
- **RAG** (`info_rag.md`, `ragHelper.js`): concetti generici ("linea bassa", "linea alta") ma nessuna spiegazione del mapping con l’UI eFootball (tacca blu, posizione giocatori, menu).

**Cosa manca**: Una guida operativa che chiarisca: (1) corrispondenza con la "tacca blu" nel menu; (2) se serve abbassare i giocatori sul campo; (3) dove impostarla e come collegarla alle altre impostazioni.

---

## 3. Pressing contenuto – cosa intende?

**Feedback**: "Pressing contenuto cosa intende, in quale zona del campo si deve evitare il pressing?"

**Analisi**:
- **RAG**: Cita "pressing alto", "pressing selettivo", "pressing coordinato", "contenimento difensivo" ma non "pressing contenuto" in modo esplicito.
- **Istruzioni individuali**: Nessuna voce legata al pressing (né pressing contenuto né zone).
- **`team_playing_style`**: Possesso palla, Contropiede veloce, Contrattacco, Passaggio lungo, Vie laterali. Niente stile "pressing contenuto".
- **Prompt contromisure**: "Linea difensiva più alta/bassa", "Squadra più stretta/compatta" – nessun riferimento a zone in cui evitare il pressing.

**Cosa manca**: Definizione chiara di "pressing contenuto" e in quali zone del campo va applicato/evitato. È probabile che sia un concetto di gameplay/strategia non ancora modellato nel sistema.

---

## 4. Scelta suggerimenti non tiene conto della forma (freccia)

**Feedback**: "Nella scelta dei suggerimenti non tiene conto della forma (freccia azzurra su o rossa giù ecc)."

**Analisi**:
- **Tabella `players`**: colonna `form` presente.
- **`generate-countermeasures`**: La query su `players` seleziona solo:  
  `id, player_name, position, overall_rating, base_stats, skills, com_skills, playing_style_id, slot_index, original_positions`  
  **`form` non viene selezionato**.
- **`countermeasuresHelper.js`**: rosterText per titolari/riserve non include `form`.
- **`assistant-chat`**: usa `formatFormForContext(p.form)` per la chat; le contromisure no.

**Causa**: I dati di forma non vengono passati al prompt delle contromisure, quindi l’AI non può considerarli.

---

## 5. Suggerimento ripetuto di Neymar / van Dijk vs Ferdinand

**Feedback**: "In 6 test ha suggerito praticamente sempre Neymar pur suggerendo di essere più difensivo e di mettere van Dijk pure avendo già Rio Ferdinand (sembra un suggerimento strano)."

**Analisi**:
- **Bias del modello**: Possibile preferenza per giocatori molto famosi (Neymar).
- **Regole difensive**: Il prompt menziona "giocatori ideali per contromisura" e "Considera Overall, Skills, Stats" ma non privilegia esplicitamente difensori quando si suggerisce un approccio più difensivo.
- **van Dijk vs Ferdinand**: Nessuna regola che dica "se c’è già un DC di livello A, non suggerire un altro DC simile" o "preferisci Ferdinand a van Dijk se entrambi sono DC".
- **Form**: Vedi punto 4 – la forma non viene considerata, quindi nemmeno eventuali differenze tra Neymar e Ferdinand.

---

## 6. Offensivo in attacco – cosa intende?

**Feedback**: "Offensivo in attacco cosa intende? Mettere contropiede? Alzare una tacca su rossa o mettere il giocatore in posizione più alta?"

**Analisi**:
- **Istruzioni**: `attacco_1` e `attacco_2` hanno `offensivo` come opzione (`lib/tacticalInstructions.js`).
- **Traduzione**: `offensive` in i18n.
- **RAG**: Nessuna descrizione precisa che mappi "offensivo" a contropiede, tacca rossa o posizione più alta.

**Cosa manca**: Documentazione che spieghi cosa fa concretamente l’istruzione "offensivo" nell’UI eFootball (tacca, posizione, contropiede).

---

## 7. Neutralizza attacco centrale – marcatura con 2 punte + SP

**Feedback**: "Neutralizza attacco centrale marcatura se 2 punte c'è una SP quali? E marcati da quale nostro giocatore?"

**Analisi**:
- **Prompt**: Menziona "Marcatura stretta", "Marcatura uomo" come istruzioni individuali.
- **RAG**: "Marcatura a uomo: 1 contro 1 in area" – nessuna regola per 2 punte + SP.
- **Mancanza regole**: Non c’è logica che specifichi: (1) quale avversario marcare (P1, P2, SP); (2) quale nostro giocatore marca chi; (3) come gestire 2P+SP (es. priorità SP, poi punte).

---

## 8. Pagella finale con 5 cambi – seconda schermata

**Feedback**: "Nella pagella finale se si fanno i 5 cambi non si può fare la foto della seconda schermata e magari è proprio quello della schermata il giocatore che ha fatto la differenza con il voto a stella."

**Analisi**:
- **Wizard partita**: Un solo step `player_ratings` (`app/match/new/page.jsx`).
- **`extract-match-data`**: Accetta una singola immagine per `player_ratings`.
- **Merge**: `update-match` fa merge `player_ratings.cliente` e `player_ratings.avversario` ma non c’è supporto per "seconda schermata" o "upload multiplo" nello stesso step.

**Problema**: Con 5 cambi, eFootball può mostrare le pagelle su più schermate. Lo step attuale permette solo una foto; i giocatori sostituiti (anche con voto alto) possono restare fuori.

---

## 9. Suggerimento stile di gioco non posseduto (competenza 60)

**Feedback**: "Capita di suggerire uno stile di gioco che non si possiede... tipo contropiede veloce e l'allenatore ha in quello stile un valore molto basso tipo 60... (io ho messo ugualmente il suo suggerimento pur perdendo tanto overall e ho vinto!)."

**Analisi**:
- **Regole nel prompt** (`countermeasuresHelper.js`):  
  - "NON suggerire stili con competenza < 50"  
  - "usa SOLO stili con competenza >= 70"
- **Soglia 60**: Non è < 50, quindi non è esplicitamente vietato. La regola forte è "preferisci >= 70", non "vietato < 70".
- **Effetto**: Con 60 il modello può suggerire contropiede veloce; il cliente perde overall (penalità competenza) ma vince in termini tattici.

**Causa**: La forbice 50–70 è troppo permissiva. Con 60, l’allenatore non è "competente" ma il suggerimento non è bloccato.

---

## 10. Risultati sbagliati – Antonio Camardi (Dr Nio Games YT)

**Feedback**: "Nelle partite salvate a volte da risultati sbagliati... io in 6 partite ne ho vinte 6 ma me ne da vinte di meno."

**Errore individuato**: eFootball mostra il punteggio sempre in ordine **Casa–Fuori** (Home–Away). Se il cliente gioca **fuori casa**, sullo schermo si vede Opponent–Cliente. Il codice salvava il risultato così com'è, senza convertirlo in Cliente–Opponent.

**Esempio**: partita 11/02/2026 18:17 – Fuori Casa. Schermo: "0-1" (casa 0, fuori 1) = cliente vince 1-0. Salvato come "0-1" (sconfitta).

**Correzione applicata**:
1. In `extract-match-data`, quando `is_home === false` e il risultato è in formato X-Y, viene invertito a Y-X prima di restituirlo.
2. Aggiornate le 2 partite di Antonio con "0-1" in trasferta → "1-0" (vittorie).

---

```javascript
function isWin(result) {
  if (!result || typeof result !== 'string') return false
  const upper = result.toUpperCase()
  return upper.includes('W') || upper.includes('VITTORIA') || upper.includes('WIN') || 
         /^\d+-\d+$/.test(result) && parseInt(result.split('-')[0]) > parseInt(result.split('-')[1])
}
```
- **Interpretazione**: `X-Y` con X > Y = vittoria. Si assume: X = gol cliente, Y = gol avversario.

### 10.2 Origine del risultato
- **Estrazione**: `extract-match-data` può estrarre `result` da qualsiasi sezione (player_ratings, team_stats, attack_areas, ball_recovery_zones, formation_style).
- **Priorità in update-match**: (1) `result` come parametro; (2) `data.result`; (3) `mergedData.team_stats.result`.
- **Merge**: Se più sezioni vengono estratte, l’ultima che imposta `result` sovrascrive le precedenti.

### 10.3 Possibili cause di risultati errati

| Causa | Spiegazione |
|-------|-------------|
| **Inversione squadre** | Il prompt dice "X = gol squadra utente, Y = gol avversario". Se l’AI sbaglia cliente/avversario, `2-1` può diventare `1-2` e la vittoria diventa sconfitta. |
| **Estrazione da sezione sbagliata** | Se una sezione non contiene il risultato o lo estrae male, e quella ha priorità nel merge, il risultato salvato è errato. |
| **Format non riconosciuto** | `isWin` usa regex `^\d+-\d+$`. Formati come `"2 - 1"`, `"2–1"` (en-dash), `"2:1"` non matchano. |
| **Aggiornamento parziale** | `update-match` con `section` fa merge; se `result` arriva vuoto o sbagliato in un update, può sovrascrivere quello corretto. |

### 10.4 Cosa verificare con lo screenshot
1. Valore esatto di `result` nel DB per le 6 partite.
2. Se c’è un pattern (es. tutte 2-1 ma salvate come 1-2).
3. Da quale sezione viene estratto il risultato in ciascun caso.
4. Se il `team_name` / `favorite_team` nel profilo è valorizzato correttamente (per l’identificazione squadra cliente).

---

## Riepilogo azioni raccomandate

| # | Priorità | Azione |
|---|----------|--------|
| 1 | Alta | Ottimizzare flusso contromisure: loading granulare, cache formazione, eventuale preload |
| 2 | Alta | Creare mini-guide operative per linea bassa, pressing contenuto, offensivo |
| 3 | Alta | Includere `form` nella query players e nel prompt contromisure |
| 4 | Media | Rafforzare regole: (a) preferenza difensori quando approccio difensivo; (b) evitare duplicati DC |
| 5 | Media | Inasprire regola allenatore: suggerire solo se competenza >= 70 (o avvisare se < 70) |
| 6 | Media | Valutare supporto a seconda schermata pagelle (upload multiplo o merge) |
| 7 | Media | Aggiungere regole RAG per marcatura con 2P+SP |
| 8 | Bassa | Audit estrazione risultato: log, validazione formato, priorità sezioni |

---

*Documento aggiornato dopo correzione bug risultato fuori casa (Antonio Camardi).*
