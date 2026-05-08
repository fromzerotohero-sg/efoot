# Nuova Rosa - Slot Flow Enterprise

**Data:** 2026-05-08  
**Obiettivo:** definire in modo preciso il flusso utente e logico del click su slot nella `Nuova Rosa`, senza perdere nessuna funzione o regola di `gestione-formazione`.

---

## 1. Executive Summary

Il click sullo slot vuoto e il cuore della nuova esperienza.

La regola base e:

- il comportamento finale della rosa resta quello di `gestione-formazione`;
- cambia soprattutto il primo ingresso;
- il picker catalogo diventa il percorso principale;
- tutto il resto resta disponibile come fallback o azione secondaria.

Formula:

**click slot -> picker catalogo -> salvataggio in `players` -> assegnazione slot -> tutte le regole legacy ancora attive**

---

## 2. Principio guida

Questo flusso deve rispettare contemporaneamente 4 obiettivi:

1. essere piu facile del live attuale;
2. non perdere nessuna logica di dominio;
3. non rompere la compatibilita con produzione;
4. lasciare al cliente la liberta di scegliere anche male, con warning ma senza blocco rigido.

---

## 3. Stati iniziali possibili

Quando l utente clicca uno slot, il sistema deve sapere in quale contesto si trova.

## 3.1 Slot vuoto

Caso principale della nuova UX.

## 3.2 Slot occupato

Non apre il picker primario come prima scelta.

Deve aprire il pannello di gestione del giocatore gia presente:

- dettaglio;
- modifica;
- sostituzione;
- rimozione;
- delete.

## 3.3 Slot vuoto con rosa gia presente

Oltre al picker catalogo, il sistema puo offrire:

- `Scegli da riserve`
- `Inserimento manuale`
- `Carica da foto`

ma non come ingresso dominante.

---

## 4. Flow principale - slot vuoto

## Step 1 - Click slot

### Azione utente

- l utente clicca uno slot vuoto nel campo

### Comportamento sistema

- salva `selectedSlot`
- legge:
  - `slot_index`
  - `slot position`
  - contesto formazione attuale
- apre `CatalogPicker`

### Regole da preservare

- nessun salvataggio immediato;
- nessun cambio dati silenzioso;
- nessuna perdita del contesto slot.

---

## Step 2 - Apertura Catalog Picker

### Obiettivo

Ridurre il rumore e mostrare subito carte adatte.

### Cosa mostra la UI

- titolo slot target
- microcopy semplice
- ricerca libera
- suggeriti per questo slot
- tutti i risultati
- fallback manuale/upload

### Regole

- il picker e pre-orientato sul ruolo slot;
- il cliente puo comunque cercare qualunque carta;
- non va mostrata una lista infinita grezza all apertura.

### Filtri minimi attivi all apertura

- fonte: `pesdb`
- `catalog_ready = true`
- `needs_review = false`
- rilevanza per slot position

---

## Step 3 - Navigazione nel picker

### Azioni utente possibili

- scrivere nella ricerca
- filtrare per ruolo
- filtrare per card type
- cambiare tra suggeriti e tutti
- scegliere una carta
- aprire fallback manuale/upload

### Regole

- il cliente non deve essere costretto a scegliere solo carte perfette per quel ruolo;
- il cliente puo cercare per nome;
- il cliente puo scegliere anche un giocatore fuori ruolo.

### Funzioni da non perdere

- liberta di errore;
- chiarezza di ruolo slot;
- fallback sempre visibili.

---

## Step 4 - Selezione carta

### Azione utente

- l utente clicca una card nel picker

### Comportamento sistema

- memorizza la carta selezionata
- mostra preview / detail panel della carta

### Dati minimi da mostrare

- immagine carta
- nome
- ruolo
- overall
- card type
- stile
- compatibilita con slot

### Regole

- non salvare ancora;
- mostrare chiaramente se il fit e:
  - perfetto
  - adattabile
  - fuori ruolo

---

## Step 5 - Conferma pre-salvataggio

### Caso A - Compatibilita buona

Se la carta e coerente con lo slot:

- CTA primaria: `Aggiungi allo slot`

### Caso B - Compatibilita dubbia o fuori ruolo

Se la carta non e coerente con lo slot:

- mostrare warning chiaro
- spiegare che il giocatore puo essere usato comunque
- CTA primaria resta disponibile
- la conferma finale deve essere esplicita

### Regole da preservare

- warning fuori ruolo, non blocco rigido;
- responsabilita al cliente;
- nessuna interruzione confusa del flusso.

---

## Step 6 - Creazione player da catalogo

### Comportamento sistema

Alla conferma:

- prende `players_payload` dal catalogo;
- prepara il payload per `save-player`;
- imposta `slot_index` dello slot cliccato;
- aggiunge metadata catalogo;
- salva in `players`.

### Regole

- il catalogo non entra direttamente nel campo;
- prima si crea il record utente in `players`;
- il player resta poi trattato come un normale player della rosa.

### Dati da salvare

- campi normali player
- `slot_index`
- `original_positions`
- `photo_slots`
- metadata catalogo

### Funzioni da preservare

- compatibilita con `save-player`
- merge comportamento attuale se necessario
- nessun bypass del contratto dati della rosa

---

## Step 7 - Gestione duplicati

### Regola fondamentale

Anche il player creato da catalogo deve passare le stesse protezioni attuali.

### Casi da coprire

- stesso player gia nei titolari
- stesso player gia nelle riserve
- slot gia occupato
- copia incoerente tra riserva e titolare

### Comportamento richiesto

- warning esplicito;
- conferma utente;
- eventuale sostituzione o delete della copia incoerente;
- nessuna duplicazione silenziosa.

### Decisione V1

Meglio mantenere la protezione ridondante UI + API che semplificare troppo presto.

---

## Step 8 - Assegnazione allo slot

### Caso 1 - Salvataggio gia con `slot_index`

Se il player viene creato gia con `slot_index`, appare subito nello slot.

### Caso 2 - Salvataggio player e poi assign separato

Se il flusso tecnico richiede:

- prima save player
- poi `assign-player-to-slot`

deve comunque risultare trasparente all utente.

### Regola

Il comportamento finale deve restare identico a oggi:

- player nello slot corretto
- logiche slot e posizione coerenti col legacy

---

## Step 9 - Post-save

### Comportamento sistema obbligatorio

Dopo il salvataggio:

- aggiornare UI locale
- chiudere picker
- mostrare feedback success
- ricaricare o riallineare stato pagina
- lanciare `refreshDiagnosticAfterSave`
- lanciare `knowledge-should-refresh`

### Regole da non perdere

- diagnostic refresh
- knowledge refresh
- feedback utente
- nessun stato zombie o slot vuoto dopo save riuscito

---

## 5. Flow slot occupato

Quando il cliente clicca uno slot gia occupato:

- non deve riaprire il picker come prima azione;
- deve aprirsi un **player editor premium**.

## 5.1 Azioni disponibili

- vedi dettaglio carta/player
- modifica competenze
- modifica boosters
- sposta in riserva
- sostituisci con altra carta
- elimina

### Decisione UX aggiornata

Il pannello giocatore non deve essere una lista povera di pulsanti.

Deve essere una superficie forte con:

- card hero;
- dati identita;
- statistiche editabili;
- abilita editabili;
- accesso booster;
- azioni rosa.

## 5.2 Sostituzione

Se il cliente sceglie `Sostituisci`:

- si apre il picker catalogo;
- lo slot resta target;
- valgono tutte le stesse regole del flusso slot vuoto.

---

## 6. Flow scelta da riserve

Questo flusso non va perso.

## 6.1 Quando deve essere disponibile

- dal picker come azione secondaria
- dal quick panel dello slot
- dal bench / riserve

## 6.2 Regole da preservare

- duplicate check
- warning fuori ruolo
- assign allo slot
- refetch o riallineamento stato
- side effects post-save

### Decisione

La scelta da riserva non e il percorso principale, ma resta una funzione reale e importante.

---

## 7. Flow fallback manuale

## 7.1 Trigger

Dal picker il cliente puo cliccare:

- `Inserimento manuale`

## 7.2 Regola

Il flusso manuale deve restare compatibile con il legacy:

- salvataggio in `players`
- eventuale `slot_index`
- stesse logiche di dominio

## 7.3 Decisione

Non va rifatto da zero nella V1 se il modal esistente funziona gia bene.

---

## 8. Flow fallback upload

## 8.1 Trigger

Dal picker il cliente puo cliccare:

- `Carica da foto`

## 8.2 Regola

Il flusso upload resta fallback completo.

Va preservato:

- estrazione
- merge dati
- dati mancanti
- selezione posizioni
- save player

## 8.3 Decisione

Percorso secondario, ma non sacrificabile.

---

## 9. Flow edit rapido giocatore

Dopo che il giocatore e stato messo nello slot o in panchina:

- deve essere editabile come nel sistema attuale;
- preferibilmente in modo piu accessibile.

## 9.1 Azioni minime

- modifica competenze / `original_positions`
- modifica boosters
- rimuovi dallo slot
- elimina
- sposta in riserva

## 9.2 Regole da preservare

- stessa logica dati;
- stesso salvataggio player;
- stessi warning;
- stessi side effects.

---

## 10. Flow utenti legacy

Quando la pagina nuova verra usata da utenti che hanno gia `players` storici:

- il click su slot deve continuare a funzionare;
- i player legacy devono vedersi nel campo;
- il sistema non deve richiedere che siano gia collegati a una card.

## 10.1 Caso player linked

La UI puo mostrare:

- immagine carta
- card type
- metadata catalogo

## 10.2 Caso player unlinked

La UI deve mostrare comunque:

- nome
- posizione
- overall
- azioni normali

### Regola

La pagina nuova non deve rompere la rosa legacy solo perche il player non ha ancora il collegamento alla card.

---

## 11. Regole di produzione

## 11.1 V1 lab

La pagina sara vista solo da te con un account nuovo controllato.

Quindi:

- il rischio per utenti live e basso;
- ma il comportamento deve comunque restare compatibile;
- non vanno introdotte modifiche breaking al dominio.

## 11.2 Regole hard

- non cambiare la route live
- non cambiare in modo breaking `players`
- non cambiare in modo breaking `formation_layout`
- non cambiare semantica legacy per gli utenti attuali

---

## 12. Errori da evitare

- usare il catalogo direttamente nel campo senza creare `players`
- perdere duplicate check
- perdere warning fuori ruolo
- perdere fallback manuale/upload
- usare il picker come unico percorso possibile
- richiedere card link per vedere i player legacy
- cambiare il comportamento legacy di starter pack o tattiche nella V1

---

## 13. Checklist slot flow V1

Per considerare corretto il flow:

- click su slot vuoto apre picker catalogo
- picker gia guidato per ruolo slot
- ricerca libera disponibile
- fallback manuale/upload disponibili
- selezione carta mostra preview
- warning fuori ruolo presente
- salvataggio crea player reale in `players`
- duplicate handling attivo
- assegnazione slot corretta
- side effects post-save presenti
- click su slot occupato apre quick panel
- scelta da riserve non persa
- player legacy ancora compatibili

---

## 14. Decisione finale

Il flow corretto della `Nuova Rosa` non e:

- nuova UX che sostituisce tutta la rosa attuale

ma:

- **stessa logica rosa**
- **stesso dominio**
- **stessi fallback**
- **stesse regole**
- **nuovo primo ingresso tramite picker catalogo**

Questa e la definizione finale da seguire nella V1.
