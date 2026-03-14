# Audit RAG, Contromisure e Analisi Post-Partita

**Data**: 10 Febbraio 2026

---

## 1. RAG (info_rag.md)

**Fonti**: `lib/ragHelper.js`, `info_rag.md`

### Due funzioni distinte

| Funzione | Usato da | Logica | maxChars |
|----------|----------|--------|----------|
| `getRelevantSections(message, maxChars)` | **Assistant Chat** | Seleziona sezioni per **keyword nel messaggio** utente. Sezione 2 (Stili) può essere filtrata per ruolo. Include sempre §10 NOTE CRITICHE. | 18000 |
| `getRelevantSectionsForContext(contextType, maxChars)` | **Analyze-match**, **Countermeasures** | Usa **elenco fisso** di sezioni. Nessun messaggio. | 12000 |

### Sezioni info_rag (ordine 1–10)

1. Statistiche Giocatori
2. Stili Giocatore
3. Moduli Tattici
4. Stili Squadra
5. Istruzioni Individuali
6. Calci Piazzati
7. Meccaniche di Gioco Avanzate
8. Abilità Giocatori
9. Competenze e Sviluppo
10. Note Critiche per l'IA

### Differenza analyze-match vs countermeasures

**Attualmente nessuna**: `ANALYZE_MATCH_SECTION_TITLES` e `COUNTERMEASURES_SECTION_TITLES` sono **identici** (stesse 10 sezioni). Entrambi ricevono lo stesso blocco RAG.

---

## 2. Assistant Chat (Cervello AI)

**File**: `app/api/assistant-chat/route.js`

**Flusso**:
1. `classifyQuestion(message)` → `'efootball'` | `'platform'`
2. Se `'efootball'` → `getRelevantSections(message, 18000)` (RAG dinamico)
3. Se `'platform'` → RAG non caricato
4. `needsPersonalContext(message)` → `buildPersonalContext()` (riassunto analisi o rosa + partite + tattica + allenatore)
5. `buildPersonalizedPrompt()` → prompt con RAG + contesto personale

**Contesto personale**: Rosa (con `form`), partite, tattica, allenatore, riassunto diagnostic. Include `formatFormForContext(p.form)` per la forma.

---

## 3. Contromisure (Pre-partita)

**File**: `app/api/generate-countermeasures/route.js`, `lib/countermeasuresHelper.js`

**Flusso**:
1. Dati: formazione avversaria, rosa cliente, formazione, tattica, allenatore, storico partite, pattern
2. RAG: `getRelevantSectionsForContext('countermeasures', 12000)` → blocco fisso
3. Prompt: `generateCountermeasuresPrompt()` → inclusione RAG in `attilaMemoryAnalysis`
4. **Rosa**: query `players` **senza** `form` → la forma non arriva al prompt

**Dati passati al prompt**:
- Formazione avversaria
- Titolari/riserve (id, player_name, position, overall_rating, base_stats, skills, com_skills, playing_style_id, slot_index, original_positions)
- **NON** form

---

## 4. Analisi Post-Partita

**File**: `app/api/analyze-match/route.js`

**Flusso**:
1. Dati: match (player_ratings, team_stats, attack_areas, ball_recovery_zones, formation_style), rosa, formazione avversaria, storico, pattern, allenatore, tattica
2. RAG: `getRelevantSectionsForContext('analyze-match', 12000)` → blocco fisso
3. Prompt: `generateAnalysisPrompt()` → RAG in `attilaMemorySection`
4. Modalità conservativa se confidence < 0.7

**Dati passati**: match completo, `is_home` per identificare squadra cliente, `players_in_match`, recurring_issues.

---

## 5. Differenze sintetiche

| Aspetto | Chat | Contromisure | Analisi Partita |
|---------|------|--------------|-----------------|
| **RAG** | Dinamico (message) | Fisso (countermeasures) | Fisso (analyze-match) |
| **RAG maxChars** | 18000 | 12000 | 12000 |
| **Contenuto RAG** | Sezioni per keyword | Sezioni 1–10 fisse | Sezioni 1–10 fisse (identiche) |
| **Forma giocatori** | ✅ Inclusa | ❌ Non inclusa | Non rilevante (post-partita) |
| **Dati contesto** | Riassunto diagnostic / rosa | Rosa + formazione avversaria + storico | Dati match + rosa + storico |
| **Momento** | On-demand (domanda utente) | Pre-partita | Post-partita |

---

## 6. Come risolvere (feedback cliente)

### 6.1 Forma non considerata nelle contromisure

**Problema**: La query `players` in `generate-countermeasures` non seleziona `form`.

**Fix**: Aggiungere `form` alla select in `app/api/generate-countermeasures/route.js`:
```javascript
.select('id, player_name, position, overall_rating, base_stats, skills, com_skills, playing_style_id, slot_index, original_positions, form')
```
E in `countermeasuresHelper.js` includere la forma nel testo rosa per titolari/riserve (es. `forma: A` o `forma: ↑`).

### 6.2 Linea bassa, pressing contenuto, offensivo – chiarimenti

**Problema**: RAG ha concetti generici ma non il mapping con l’UI eFootball (tacca blu, zone pressing, tacca rossa).

**Fix**: Aggiungere in `info_rag.md` (es. §5 Istruzioni Individuali o nuova sezione) una sottosezione operativa:
- **Linea bassa**: corrispondenza con tacca blu nel menu; effetto sui giocatori; dove si imposta
- **Pressing contenuto**: definizione; zone in cui evitare il pressing
- **Offensivo (attacco)**: mappa con tacca rossa, contropiede, posizione più alta

### 6.3 Marcatura con 2 punte + SP

**Problema**: RAG non ha regole per “neutralizza attacco centrale” con 2P+SP (chi marcare, chi marca).

**Fix**: Estendere §5 o §7 in `info_rag.md` con regole tipo:
- Con 2 punte + SP: priorità marcatura SP; quale nostro giocatore marca quale avversario
- Esempi di allocazione (DC su P1, CC su SP, ecc.)

### 6.4 Differenziare RAG contromisure vs analisi (opzionale)

**Stato attuale**: Sezioni identiche.

**Opzione**: Definire `COUNTERMEASURES_SECTION_TITLES` con sezioni più orientate al pre-partita (es. escludere calci piazzati se non prioritari, aggiungere più peso a §3 Moduli e §5 Istruzioni). Oppure aumentare `maxChars` per contromisure (es. 15000) se serve più contesto su formazioni e contromisure.

---

## 7. Riepilogo azioni

| # | Azione | Priorità |
|---|--------|----------|
| 1 | Aggiungere `form` in query players e nel prompt contromisure | Alta |
| 2 | Estendere info_rag con: linea bassa (tacca blu), pressing contenuto (zone), offensivo (tacca/posizione) | Alta |
| 3 | Aggiungere regole RAG per marcatura 2P+SP | Media |
| 4 | Valutare differenziazione sezioni contromisure vs analisi | Bassa |
