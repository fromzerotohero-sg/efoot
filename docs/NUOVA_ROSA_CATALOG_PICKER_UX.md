# Nuova Rosa - Catalog Picker UX

**Data:** 2026-05-08  
**Obiettivo:** progettare una UX chiara e bella per il picker catalogo della `Nuova Rosa`, tenendo conto della grande quantita di giocatori disponibili e del rischio di confondere il cliente.

---

## 1. Executive Summary

Il picker catalogo e il punto piu delicato della nuova pagina.

Se e troppo aperto:

- il cliente si perde;
- non trova il giocatore;
- percepisce il sistema come complesso.

Se e troppo chiuso:

- il cliente non trova il suo giocatore;
- non puo sbagliare liberamente;
- si sente bloccato.

La soluzione corretta e:

**guida forte + liberta totale**

Quindi:

- lo slot suggerisce;
- il sistema filtra bene;
- il cliente resta libero di cercare qualsiasi carta;
- la UI mostra fallback chiari.

---

## 2. Dato reale da considerare

Il catalogo pronto attuale `pesdb` contiene migliaia di carte.

Distribuzione reale osservata:

- `Highlight`: 2349
- `Trending`: 847
- `Epic`: 790
- `Legendary`: 239

Distribuzione posizioni:

- `P`: 798
- `DC`: 574
- `TRQ`: 485
- `CC`: 471
- `MED`: 353
- `PT`: 326
- `ESA`: 246
- `TD`: 221
- `EDA`: 212
- `TS`: 179
- `CLD`: 149
- `CLS`: 123
- `SP`: 98

### Conclusione

Il picker non puo essere:

- una lista infinita;
- una select semplice;
- una tabella piatta.

Serve una navigazione guidata.

---

## 3. Principi UX

## 3.1 Primo principio

Il cliente non deve decidere tutto da zero.

Quando clicca uno slot, il sistema deve gia capire:

- che ruolo si aspetta;
- quali carte suggerire per prime;
- come restringere il rumore.

## 3.2 Secondo principio

Il cliente deve comunque poter cercare tutto.

Non bisogna bloccarlo dentro un ruolo forzato.

## 3.3 Terzo principio

La carta deve essere il centro visivo della scelta.

Non una riga anonima, ma:

- immagine;
- nome;
- ruolo;
- overall;
- tipo carta;
- stile;
- pack o gruppo.

## 3.4 Quarto principio

I filtri devono aiutare, non appesantire.

Prima i filtri utili davvero.  
Poi gli altri come raffinamento.

---

## 4. Struttura raccomandata del picker

## 4.1 Header

Contiene:

- titolo slot target;
- microcopy breve;
- chiusura.

Copy raccomandato:

- IT: `Ti suggeriamo carte adatte a questo slot, ma puoi scegliere qualsiasi giocatore.`
- EN: `We suggest cards that fit this slot, but you can choose any player.`

## 4.2 Barra ricerca

Deve essere subito visibile.

Placeholder raccomandato:

- IT: `Cerca giocatore, ruolo o tipo carta`
- EN: `Search player, role, or card type`

## 4.3 Sezione suggeriti

Prima sezione mostrata.

Contiene:

- carte adatte allo slot;
- compatibilita alta o media;
- limite piccolo e leggibile.

Numero raccomandato iniziale:

- 6 su mobile
- 8-12 su desktop

## 4.4 Sezione tutti i risultati

Deve arrivare subito sotto i suggeriti.

Ordinamento:

1. compatibilita slot
2. rilevanza ricerca
3. overall
4. tipo carta

## 4.5 Footer azioni

Deve contenere fallback chiari:

- `Inserimento manuale`
- `Carica da foto`
- `Chiudi`

---

## 5. Filtri raccomandati

## 5.1 Filtri primari

Questi sono i filtri davvero utili nella V1:

- ricerca testo
- ruolo
- tipo carta
- solo suggeriti / tutte

## 5.2 Filtri secondari

Da mettere come raffinamento, non come blocco iniziale:

- pack
- source
- overall minimo
- stile

## 5.3 Filtri da NON rendere centrali nella V1

- troppe tassonomie meta;
- filtri troppo tecnici;
- troppi toggle contemporanei;
- filtri che richiedono conoscenza esperta.

---

## 6. Compatibilita slot

## 6.1 Regola

Ogni carta deve avere un indicatore di compatibilita con lo slot cliccato.

Livelli raccomandati:

- `Perfetto`
- `Adattabile`
- `Fuori ruolo`

## 6.2 Comportamento

- `Perfetto`: appare nei suggeriti in alto
- `Adattabile`: appare nei suggeriti piu in basso o all inizio di tutti
- `Fuori ruolo`: appare solo nella lista completa, o con badge warning

## 6.3 Filosofia

Compatibilita alta non significa obbligo.

Serve a guidare, non a bloccare.

---

## 7. UX per grande quantita di giocatori

## 7.1 Problema

Con migliaia di carte, il rischio e che il cliente:

- non capisca da dove iniziare;
- cerchi a vuoto;
- veda troppe carte simili;
- si stanchi prima di scegliere.

## 7.2 Soluzione V1

### Step 1

Aprire il picker gia filtrato per ruolo slot.

### Step 2

Mostrare pochi suggeriti ad alta rilevanza.

### Step 3

Consentire ricerca libera immediata.

### Step 4

Mostrare risultati in card layout leggibile.

### Step 5

Dare fallback manuale/upload sempre visibili ma secondari.

## 7.3 Regola anti-overwhelm

All apertura non mostrare 500 risultati grezzi.

Mostrare:

- i migliori suggeriti;
- oppure risultati gia filtrati e limitati.

---

## 8. Come prendere spunto dal lab

`card-advisor-lab` insegna alcune cose utili:

- usare immagine carta come elemento principale;
- usare ricerca semplice ma subito visibile;
- usare subset guidati invece di pagine infinite;
- usare detail panel bello e leggibile;
- dare un feeling premium e non amministrativo.

## 8.1 Cosa prendere dal lab

- card visuale
- ricerca chiara
- dettaglio selezione
- metriche sintetiche
- CTA contestuale
- modal pulito

## 8.2 Cosa NON copiare direttamente

- logica per release e pack come filtro principale

Per la rosa, il cliente pensa prima a:

- ruolo
- nome giocatore
- carta desiderata

non a:

- quale release e aperta

---

## 9. Layout raccomandato

## 9.1 Mobile

Il picker su mobile deve essere full-screen o quasi.

Ordine:

1. header slot
2. search
3. chips filtri primari
4. suggeriti
5. tutti i risultati
6. fallback actions

## 9.2 Desktop

Su desktop:

- colonna sinistra risultati;
- colonna destra dettaglio selezionato.

Questo migliora la qualita percepita e riduce errori.

---

## 10. Dettaglio carta selezionata

Quando il cliente clicca una carta, prima del salvataggio deve vedere un mini dettaglio.

Blocchi raccomandati:

- immagine grande
- nome
- overall
- posizione
- tipo carta
- stile
- badge compatibilita
- CTA `Aggiungi allo slot`

Se fuori ruolo:

- warning breve;
- conferma successiva.

---

## 11. Ricerca libera

## 11.1 Cosa deve cercare

La ricerca V1 deve cercare almeno su:

- nome giocatore
- posizione
- tipo carta

Opzionale utile:

- pack name
- stile

## 11.2 Cosa non deve pretendere

Non deve obbligare il cliente a conoscere:

- id carta;
- source;
- tassonomie interne;
- meta-target tecnici.

---

## 12. Fallback quando il cliente non trova il giocatore

Questa parte e fondamentale.

Se il cliente non trova il giocatore:

- non deve sentirsi bloccato;
- non deve chiudere la pagina frustrato.

Quindi il picker deve sempre offrire:

- `Inserimento manuale`
- `Carica da foto`

Copy raccomandato:

- IT: `Non trovi la carta? Puoi aggiungerlo manualmente o caricarlo da foto.`
- EN: `Can't find the card? You can add the player manually or upload it from photos.`

---

## 13. Errori UX da evitare

- mostrare troppi risultati iniziali;
- usare pack come filtro primario;
- costringere il cliente a scegliere solo tra i suggeriti;
- nascondere il manuale/upload troppo in profondita;
- usare badge poco chiari;
- mescolare troppi stati e CTA nello stesso punto;
- usare una lista senza immagine carta.

---

## 14. Decisioni finali raccomandate

Per la V1 del picker catalogo:

1. usare `source = pesdb`, `catalog_ready = true`, `needs_review = false`
2. aprire il picker gia filtrato per ruolo slot
3. mostrare suggeriti prima di tutto
4. mantenere ricerca libera completa
5. usare card visuali con immagine
6. mostrare compatibilita slot
7. mantenere fallback manuale/upload sempre disponibili
8. usare detail panel o preview prima del salvataggio

---

## 15. Sintesi finale

Il problema della grande quantita di giocatori non si risolve mostrando tutto.

Si risolve cosi:

- il sistema restringe il rumore;
- il cliente resta libero;
- il picker guida senza bloccare;
- la UI resta bella e leggibile.

Questa e la direzione corretta per fare della `Nuova Rosa` una replica migliorata di `gestione-formazione`, non un catalogo ingestibile.
