# Audit Enterprise - Barra Conoscenza IA

Data: 2026-04-18  
Stato: operativo in produzione  
Ambito: affidabilita` calcolo e allineamento UX (nessun redesign UI)

---

## 1) Obiettivo prodotto

La barra deve rappresentare in modo affidabile "quanto l'IA conosce il cliente" e aggiornarsi in modo coerente dopo azioni che modificano i dati sorgente (profilo, rosa, partite, coach, feedback, obiettivi).

Vincoli richiesti:
- mantenere UX attuale;
- evitare refactor invasivi;
- minimizzare rischio regressioni in produzione.

---

## 2) Architettura attuale (sintesi)

### 2.1 Frontend
- Componente: `components/AIKnowledgeBar.jsx`
- Caricamento iniziale: `GET /api/ai-knowledge`
- Refresh:
  - evento `match-saved`
  - evento `knowledge-should-refresh`
  - polling periodico (1 minuto)

### 2.2 Backend/API
- Endpoint lettura barra: `app/api/ai-knowledge/route.js`
- Helper calcolo score: `lib/aiKnowledgeHelper.js`
- Persistenza score: `user_profiles.ai_knowledge_*`

### 2.3 Dati sorgente coinvolti
- `user_profiles`
- `players`
- `matches`
- `team_tactical_patterns`
- `coaches`
- `weekly_goals`
- `user_tactical_feedback`

---

## 3) Punti critici rilevati

### Critico A - Trigger mancante nel flusso player PATCH
- Endpoint: `app/api/players/[id]/route.js` (metodo PATCH)
- Problema: aggiorna campi che impattano direttamente lo score (`slot_index`, `original_positions`) ma non avviava il ricalcolo della barra.
- Effetto: utente completa/riorganizza la rosa, ma `ai_knowledge_score` puo` restare stale.

### Critico B - Ricalcoli non sempre garantiti in alcuni flussi
- In varie route il ricalcolo e` non bloccante (best effort).
- In caso di fallimento o interruzione processo, i dati restano corretti ma lo score puo` non essere riallineato subito.

### Critico C - Disallineamento percepito in UX
- La UI continua a leggere uno score persistito che puo` essere vecchio.
- L'utente interpreta il problema come "la barra non funziona", anche se il salvataggio dati e` andato a buon fine.

---

## 4) Modifica applicata oggi (low risk)

File modificato:
- `app/api/players/[id]/route.js`

Modifica:
- Dopo update player riuscito, viene eseguito `updateAIKnowledgeScore(userId, supabaseUrl, serviceKey)` con `await`.
- Se il ricalcolo fallisce, non blocca la risposta del PATCH (log warning server-side).

Motivazione:
- Questo endpoint e` uno dei percorsi principali usati in gestione rosa.
- Coprire questo trigger chiude il gap piu` impattante senza toccare UX/formula.

Impatto atteso:
- Miglior allineamento barra dopo modifiche rosa.
- Riduzione casi "barra ferma" su utenti attivi.

---

## 5) Modifiche raccomandate (non ancora applicate)

### Priorita` P1
1. Allineare mapping Metalgate nel `DELETE /api/coaches` per evitare ricalcoli su user id non coerenti.
2. Standardizzare la policy ricalcolo post-write nei principali endpoint che impattano lo score.

### Priorita` P2
3. Introdurre check di coerenza periodico (job) per identificare profili stale/mismatch.
4. Definire KPI operativi ufficiali:
   - mismatch score >= 5 sotto soglia target
   - stale oltre soglia target
   - tasso errori ricalcolo

---

## 6) Piano rollback (pronto in caso di rottura)

Obiettivo rollback: ripristinare immediatamente il comportamento precedente senza perdita dati business.

Passi:
1. Revert della modifica su `app/api/players/[id]/route.js` (singolo file).
2. Deploy rollback.
3. Verifica rapida endpoint PATCH player (status, tempi, assenza errori).
4. Se necessario, riallineamento score via ricalcolo manuale utenti impattati.

Nota:
- Il rollback non tocca tabelle, non richiede migrazioni, non modifica UX.

---

## 7) Verifica post-rilascio consigliata

Checklist:
1. Aggiornare `slot_index` di un player.
2. Verificare update riuscito del player.
3. Verificare aggiornamento `ai_knowledge_last_calculated`.
4. Verificare variazione coerente di `ai_knowledge_breakdown.roster`.
5. Confermare visualizzazione barra aggiornata in dashboard.

---

## 8) Conclusione

La correzione applicata e` coerente con il focus prodotto:
- mantiene UX invariata;
- riduce il rischio operativo;
- migliora l'affidabilita` reale della barra nei flussi ad alta frequenza.

Approccio consigliato: patch incrementali, controllo KPI, eventuale hardening successivo senza refactor invasivo.

