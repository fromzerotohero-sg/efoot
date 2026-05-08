# Gestione Rosa -> Nuova Rosa Matrix

**Data:** 2026-05-08  
**Obiettivo:** mantenere il focus corretto della migrazione: replicare `gestione-formazione` nel medesimo modo, migliorando il punto di ingresso tramite precompilato da catalogo senza perdere logiche, funzioni e fallback.

---

## 1. Principio guida

La `Nuova Rosa` **non** deve essere una riscrittura concettuale della rosa.

Deve essere:

- `gestione-formazione` quasi 1:1;
- con le stesse logiche reali;
- con gli stessi salvataggi e side effects;
- con lo stesso dominio dati;
- ma con un ingresso principale migliore:
  - click slot vuoto
  - apertura picker catalogo
  - scelta carta precompilata
  - salvataggio in `players`

Formula corretta:

**stessa rosa, stesso comportamento, ingresso migliore**

---

## 2. Legenda

- **Replica uguale**: va mantenuto con lo stesso comportamento.
- **Replica + picker davanti**: stesso comportamento finale, ma il primo step diventa il picker catalogo.
- **Migliora senza rompere**: stessa funzione, UX o struttura migliore.
- **Fallback obbligatorio**: non e percorso primario, ma deve restare disponibile.

---

## 3. Matrix funzione per funzione

## 3.1 Caricamento stato pagina

### Funzione attuale

- caricamento da `/api/formation`
- mapping `players`
- split titolari/riserve
- coach attivo
- tactical settings
- dispatch `knowledge-should-refresh`

### Destinazione Nuova Rosa

- **Replica uguale**

### Decisione

Non cambiare il contratto di caricamento nella V1.

La nuova pagina deve leggere gli stessi dati reali e ricostruire:

- `layout`
- `titolari`
- `riserve`
- `activeCoach`
- `tacticalSettings`

### Nota

Si puo migliorare la struttura del codice, ma non il comportamento percepito.

---

## 3.2 Campo formazione

### Funzione attuale

- render campo
- slot vuoti cliccabili
- slot occupati cliccabili
- gestione compatta mobile

### Destinazione Nuova Rosa

- **Replica uguale**

### Decisione

Il campo resta il centro UX della pagina.

Non va sostituito con una lista o con un flow alternativo.

---

## 3.3 Click su slot vuoto

### Funzione attuale

- apre `AssignModal`
- il cliente sceglie tra:
  - riserva
  - upload
  - manuale

### Destinazione Nuova Rosa

- **Replica + picker davanti**

### Decisione

Nuovo comportamento:

1. click su slot vuoto
2. si apre picker catalogo
3. il cliente puo scegliere una carta
4. se non trova o non vuole usare il catalogo:
   - usa manuale
   - usa upload
   - usa eventuale scelta da riserva

### Regola

L assign modal attuale non sparisce come concetto, ma viene riorganizzato:

- il picker catalogo diventa il primo ingresso;
- manuale/upload/resto diventano fallback.

---

## 3.4 Scelta da riserva

### Funzione attuale

- scelta di un player gia presente in `riserve`
- check duplicati
- warning fuori ruolo
- assign slot

### Destinazione Nuova Rosa

- **Replica uguale**

### Decisione

Il comportamento deve restare lo stesso.

Differenza UX:

- la scelta da riserva non e piu il primo ingresso naturale per uno slot vuoto;
- resta un percorso interno quando la rosa e gia popolata.

---

## 3.5 Upload foto giocatore

### Funzione attuale

- apertura upload modal
- estrazione immagini
- merge dati
- gestione dati mancanti
- save in `players`

### Destinazione Nuova Rosa

- **Fallback obbligatorio**

### Decisione

Non deve sparire.

Ma non deve essere piu il percorso principale del primo inserimento.

### Regola

Il cliente deve poter arrivare all upload da:

- picker catalogo -> `Non trovi il giocatore? Caricalo`
- quick actions secondarie

---

## 3.6 Inserimento manuale

### Funzione attuale

- `ManualPlayerModal`
- save con `slot_index` o null

### Destinazione Nuova Rosa

- **Fallback obbligatorio**

### Decisione

Deve restare sempre disponibile.

Ma come fallback controllato, non come ingresso dominante.

---

## 3.7 Salvataggio player in `players`

### Funzione attuale

- save tramite `/api/supabase/save-player`
- supporto slot o riserva
- merge dati
- supporto duplicati

### Destinazione Nuova Rosa

- **Replica uguale**

### Decisione

Il player scelto da catalogo deve finire in `players` esattamente come gli altri.

Questa e la regola più importante di tutta la migrazione.

### Implicazione

Il catalogo non deve essere usato direttamente nel campo.  
Deve creare record utente reali in `players`.

---

## 3.8 Assign player to slot

### Funzione attuale

- `/api/supabase/assign-player-to-slot`
- duplicati
- clear slot
- update position/slot

### Destinazione Nuova Rosa

- **Replica uguale**

### Decisione

Va mantenuta la logica attuale nella V1.

Se in futuro si vorra correggere il problema semantico di `position`, si fara in una fase successiva e controllata.

---

## 3.9 Remove from slot

### Funzione attuale

- sposta giocatore in riserva
- controlla limite riserve
- controlla duplicati riserve
- resetta posizione originale

### Destinazione Nuova Rosa

- **Replica uguale**

### Decisione

Deve restare identico nella logica.

---

## 3.10 Delete player

### Funzione attuale

- elimina player
- toglie da rosa
- refresh stato

### Destinazione Nuova Rosa

- **Replica uguale**

### Decisione

Nessuna variazione di dominio.

---

## 3.11 Duplicati

### Funzione attuale

- check lato UI
- check lato API
- conferme
- delete copie incoerenti in alcuni flussi

### Destinazione Nuova Rosa

- **Replica uguale**

### Decisione

Non semplificare questa parte nella V1.

Meglio ridondanza controllata che regressione.

### Nota

Si puo migliorare la centralizzazione in seguito, ma non cambiare il comportamento ora.

---

## 3.12 Warning fuori ruolo

### Funzione attuale

- confronto slot vs `original_positions`
- warning
- conferma utente

### Destinazione Nuova Rosa

- **Replica uguale**

### Decisione

Stessa regola:

- il cliente puo sbagliare;
- il sistema avvisa;
- il sistema non blocca rigidamente.

### Miglioria concessa

Migliorare il wording e la leggibilita del warning.

---

## 3.13 `original_positions`

### Funzione attuale

- usate per warning fuori ruolo
- usate per editing competenze
- salvate nel player

### Destinazione Nuova Rosa

- **Replica uguale**

### Decisione

Non perdere questa struttura.

Il picker catalogo deve precompilarle quando possibile.

---

## 3.14 Boosters

### Funzione attuale

- modal dedicata
- save boosters
- merge `photo_slots.booster`

### Destinazione Nuova Rosa

- **Replica uguale**

### Decisione

Deve restare disponibile.

### Miglioria concessa

Renderlo più accessibile dal quick edit del giocatore.

---

## 3.15 `photo_slots` e completezza giocatore

### Funzione attuale

- tracking foto caricate
- supporto completezza profilo player

### Destinazione Nuova Rosa

- **Replica uguale**

### Decisione

Va mantenuto, anche se il player arriva da catalogo.

Nel caso catalogo, il sistema puo valorizzare direttamente uno stato piu completo.

---

## 3.16 Starter pack

### Funzione attuale

- CTA visibile fino a `<= 5` giocatori
- import full o fill missing

### Destinazione Nuova Rosa

- **Replica uguale**

### Decisione

Stessa regola, stesso gating, stesso comportamento.

### Miglioria concessa

Migliorare la presentazione visiva dentro la nuova UX.

---

## 3.17 Formazione / layout

### Funzione attuale

- scelta modulo
- save layout
- preserve slots
- posizioni slot

### Destinazione Nuova Rosa

- **Replica uguale**

### Decisione

Non cambiare la logica di dominio nella V1.

---

## 3.18 Posizioni custom nel campo

### Funzione attuale

- edit mode
- drag e coordinate custom
- calcolo ruolo
- clamp portiere

### Destinazione Nuova Rosa

- **Migliora senza rompere**

### Decisione

Se il tempo/ambito lo consentono, replicare anche questo.

Se e troppo costoso per la prima V1, puo restare come seconda ondata **solo se**:

- il resto della gestione formazione resta completo;
- il cambio non blocca la pagina come sostituto del live.

### Raccomandazione

Meglio segnalarlo come `phase 1.5`, non ignorarlo.

---

## 3.19 Tactical settings

### Funzione attuale

- panel tattico
- save settings
- refetch dati

### Destinazione Nuova Rosa

- **Replica uguale**

### Decisione

La nuova pagina deve continuare a gestire anche tattiche, non solo giocatori.

---

## 3.20 Tutorial / onboarding

### Funzione attuale

- tutorial modal
- listener query `?tutorial=1`
- onboarding formation

### Destinazione Nuova Rosa

- **Migliora senza rompere**

### Decisione

Preservare il comportamento, ma integrarlo meglio nel nuovo ingresso catalogo.

---

## 3.21 Confirm modal

### Funzione attuale

- wrapper `showConfirmSafe`
- confirm modal al posto di `window.confirm`

### Destinazione Nuova Rosa

- **Replica uguale**

### Decisione

Va riusato il pattern esistente.

---

## 3.22 Toast e gestione errori

### Funzione attuale

- `showToast`
- `mapErrorToUserMessage`

### Destinazione Nuova Rosa

- **Replica uguale**

### Decisione

Stesso pattern di feedback utente.

---

## 3.23 Refresh diagnostico

### Funzione attuale

- `refreshDiagnosticAfterSave`

### Destinazione Nuova Rosa

- **Replica uguale**

### Decisione

Obbligatorio.

Non va perso in nessun salvataggio che modifica rosa, modulo o tattiche.

---

## 3.24 `knowledge-should-refresh`

### Funzione attuale

- event dispatch dopo fetch e after-save path

### Destinazione Nuova Rosa

- **Replica uguale**

### Decisione

Obbligatorio.

---

## 4. Flusso nuovo corretto

## 4.1 Prima

Click slot -> assign modal -> riserva/upload/manuale

## 4.2 Dopo

Click slot -> picker catalogo -> save in `players` -> slot

con fallback sempre disponibili:

- riserva
- manuale
- upload

### Regola

Tutto il resto della pagina resta il piu possibile coerente con `gestione-formazione`.

---

## 5. Decisione implementativa V1

La V1 della `Nuova Rosa` deve essere letta come:

**replica di `gestione-formazione` con catalog picker come nuovo ingresso primario**

non come:

**nuovo prodotto rosa con logica diversa**

---

## 6. Cose da non perdere assolutamente

- nessuna logica duplicati
- nessun warning fuori ruolo
- nessun fallback manuale/upload
- nessun side effect post-save
- nessuna gestione tattiche
- nessun comportamento starter pack
- nessuna gestione boosters
- nessuna struttura `original_positions`

---

## 7. Decisione finale

Da questo punto in poi, ogni scelta progettuale sulla `Nuova Rosa` va valutata con questa domanda:

**replica il comportamento reale di `gestione-formazione` e migliora solo l ingresso catalogo, oppure sta deviando dal focus?**

Se devia, non e prioritaria per la V1.
