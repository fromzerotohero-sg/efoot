# Aggiornamento Contromisure — Piano (da implementare)

**Stato:** pianificato, non ancora in codice  
**Data:** 2026-05-15  
**Collegamento:** estende [NEXT_UPGRADES_CONTROMISURE.md](../NEXT_UPGRADES_CONTROMISURE.md) (profilo visivo / estrazione foto)

---

## Obiettivo

Usare **tutti i dati già disponibili** (rosa cliente, 11 avversari dalla foto, storico, coach, pattern) per valutare quando proporre un **cambio modulo** contro l’avversario — **non solo formazioni meta** — senza rompere API, UI o formato JSON esistente.

---

## Diagnosi attuale

### Cosa funziona già

| Fonte | Uso nelle contromisure |
|--------|-------------------------|
| Rosa cliente (titolari/riserve, OVR, skills, posizioni) | Dettagliato nel prompt |
| Disposizione reale in campo | Sì (`formation_layout` + slot) |
| Coach + competenze stile (≥ 70) | Sì |
| Storico partite / formazioni simili | Sì |
| Performance giocatori vs avversari simili | Sì |
| Pattern, feedback Palestra, RAG | Parziale |
| Avversario: modulo, stile, forza, coach | Sì |

### Gap principali

| Fonte | Problema |
|--------|----------|
| **11 avversari** estratti dalla foto | Nel prompt compare solo *«N giocatori rilevati»*, non nome/ruolo/slot |
| **`player_catalog`** | Non collegato a `generate-countermeasures` |
| **`visual_tactical_profile`** | Previsto in upgrade estrazione, non ancora nel motore contromisure |
| **Prompt** | Modulo = *ultima risorsa* → il modello evita `formation_adjustments` |

### Evidenza produzione

- Smart Coach: **23** contromisure con `last_countermeasures`, **0** con `formation_adjustments` non vuoto.
- Il JSON e la UI supportano già `formation_change`; il vincolo è soprattutto **prompt + input sottoutilizzato**, non un filtro che cancella i cambi modulo.

### Cosa non è il problema

- Non serve rifare `contromisure-pre-partita` UI.
- Non serve cambiare schema Supabase per questa fase.
- Il catalogo può restare **fase 2** (gap rosa), non cuore della decisione modulo.

---

## Principi (enterprise, senza rompere codice)

1. **Solo additive:** nuove funzioni in `lib/countermeasuresHelper.js`, stesso contratto API/UI.
2. **Matchup deterministico prima dell’LLM:** segnali verificabili, poi sintesi operativa.
3. **Max 1 cambio modulo** per analisi, solo se mismatch strutturale + rosa/storico lo supportano.
4. **Default:** ottimizzare modulo attuale (istruzioni → sostituzioni → stile → modulo).
5. **Feature flag** per rollout e rollback: `COUNTERMEASURES_MATCHUP_V2=1`.

---

## Piano implementazione (3 strati)

### Strato 1 — Arricchire input prompt (basso rischio)

Nuove funzioni pure in `lib/countermeasuresHelper.js`:

| Funzione | Output |
|----------|--------|
| `buildOpponentRosterText(players)` | Fino a 11 righe: slot, ruolo, nome, OVR se presente |
| `buildOpponentShapeSummary(players)` | Conteggio PT / difesa / centrocampo / attacco |
| `buildVisualProfileText(extracted_data)` | Se esiste `visual_tactical_profile` (width, side_bias, isolated_striker, …) |

Sostituire nel blocco avversario la riga generica *«N giocatori rilevati»* con questi blocchi.

**File:** solo `lib/countermeasuresHelper.js`

---

### Strato 2 — Motore matchup leggero (deterministico)

Nuova funzione es. `buildFormationMatchupHints({ opponentFormation, titolari, clientFormation, tacticalHabits })`:

**Input:**

- Forma avversaria dai `players[]` (conteggio ruoli per fascia).
- Forma cliente dai titolari (già calcolabile).
- `tacticalHabits.winRateByFormation` per moduli alternativi vs match simili.
- Tabella contromisure community già presente nel prompt (4-3-3 → 3-5-2, ecc.) come hint interno.

**Output (blocco testo interno al prompt, non mostrato all’utente):**

```text
MATCHUP_ENGINE (uso interno):
- mismatch_centrocampo: alto|medio|basso
- modulo_attuale: 4-3-3
- alternative_plausibili: [{ module, reason_code, win_rate? }]
- rosa_supporta_alternativa: sì|no
- valuta_cambio_modulo: sì|no
```

**Regole conservative:**

- `valuta_cambio_modulo: sì` solo se:
  - mismatch strutturale (es. centrocampo avversario superiore), **e**
  - rosa copre ruoli minimi per l’alternativa, **e**
  - (storico favorevole **oppure** cookbook meta/formazione simile applicabile)
- Altrimenti `no`.

**File:** `lib/countermeasuresHelper.js`

---

### Strato 3 — Regole prompt (chirurgico)

Aggiornare sezione **PRIORITÀ LEVE** in `generateCountermeasuresPrompt`:

**Prima (effetto attuale):** modulo quasi mai suggerito.

**Dopo:**

```text
(4) CAMBIO FORMAZIONE
- Default: mantieni modulo attuale; ottimizza con istruzioni, sostituzioni, stile.
- Se MATCHUP_ENGINE indica valuta_cambio_modulo: sì E rosa_supporta_alternativa: sì:
  → inserisci ESATTAMENTE 1 voce in formation_adjustments
     (type: formation_change, priority: high).
- Altrimenti formation_adjustments = [].
- Mai più di 1 cambio modulo per analisi.
```

Allineamento opzionale (2–3 righe): `lib/smartCoachPrompts.js`.

**Non toccare:** `validateCountermeasuresOutput`, `app/contromisure-pre-partita/page.jsx`, schema JSON.

---

## Cosa non fare in questa fase

| Voce | Motivo |
|------|--------|
| Query `player_catalog` in generate-countermeasures | Latenza, complessità, rischio allucinazioni |
| Post-processing che inventa `formation_change` | Consigli non controllabili |
| Refactor `extract-formation` | I 11 giocatori ci sono già in `opponent_formations.players` |
| Cambiare formato output / UI | Già compatibili |

**Fase 2 (catalogo):** solo messaggi tipo *«in rosa hai pochi TD per un 5-3-2»* contando titolari/riserve per ruolo, senza import carte.

---

## File coinvolti (stima)

| File | Modifica |
|------|----------|
| `lib/countermeasuresHelper.js` | Funzioni strato 1–2 + prompt strato 3 (~80–120 righe) |
| `lib/smartCoachPrompts.js` | Opzionale, allineamento breve |
| `app/api/generate-countermeasures/route.js` | Opzionale: passaggio env flag |

**Nessun cambio obbligatorio** a estrazione, save opponent, UI, crediti.

---

## Rollout

1. Implementare dietro `COUNTERMEASURES_MATCHUP_V2=1`.
2. Log dev: `valuta_cambio_modulo`, presenza `formation_adjustments`.
3. Verifica manuale: avversario 4-2-3-1 / 4-3-3 con rosa e storico noti.
4. Attivazione in produzione quando stabile; rollback = flag off.

---

## Risultato atteso

| Scenario | Comportamento |
|----------|----------------|
| Matchup equilibrato, rosa ok col modulo attuale | Solo istruzioni / sostituzioni / stile |
| Mismatch strutturale + storico/cookbook + rosa ok | **1** `formation_change` (priority high) + altre leve |
| Rosa non supporta alternativa | Nessun cambio modulo; massimizzare modulo attuale |

---

## Note correlate (altri fix già fatti)

- **Ricerca catalogo picker:** bug UI (lista stale / race), non filtro Supabase — fix in `app/nuova-rosa-lab/page.jsx` (commit separati).
- **RPC ricerca catalogo:** rilevanza nomi in `rpc_player_catalog_search` (migration `20260515_improve_player_catalog_search_relevance.sql`).

Questi temi sono indipendenti da questo aggiornamento contromisure.

---

## Checklist implementazione

- [ ] Strato 1: `buildOpponentRosterText` + shape summary + visual profile
- [ ] Strato 2: `buildFormationMatchupHints`
- [ ] Strato 3: regole prompt + flag env
- [ ] Smoke test contromisure pre-partita (IT/EN)
- [ ] Verifica Smart Coach allineato (opzionale)
- [ ] Documentare flag in README interno / env example se esiste
