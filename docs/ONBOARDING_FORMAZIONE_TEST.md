# Onboarding con Formazione di Test

**Data:** 2026-04-29  
**Scopo:** Ridurre l'attrito del caricamento rosa senza confondere il cliente, sporcare Supabase o rompere i flussi attuali.

---

## 1. Problema prodotto

Oggi il cliente percepisce il caricamento della rosa come un ostacolo iniziale:

- entra nell'app
- vede che per ottenere valore dovrebbe completare 11 titolari, allenatore e dati base
- rimanda il setup oppure abbandona

Il problema non e' la feature "Gestione formazione" in se', ma il fatto che il cliente incontra troppo presto una schermata che comunica lavoro da fare prima di vedere il valore del prodotto.

---

## 2. Obiettivo

Permettere al cliente di:

- usare l'app subito
- capire il valore del coach e dei flussi tattici
- sostituire gradualmente i giocatori con i propri

senza:

- far credere che la formazione di test sia la sua rosa reale
- sovrascrivere per errore una rosa gia' personalizzata
- far salire artificialmente la percezione di personalizzazione

---

## 3. Contesto codice attuale

### 3.1 Punto di ingresso

Il primo ingresso reale dell'utente autenticato e' la dashboard `/`:

- `app/page.jsx`
- fetch dashboard da `app/api/dashboard/route.js`

La dashboard oggi legge direttamente dati reali da Supabase:

- `formation_layout`
- `players`
- `matches`
- `team_tactical_patterns`
- `coaches`
- `user_profiles`
- `user_game_analysis`

Questi dati alimentano:

- setup banner
- Mission Center
- Assistant / Coach
- reminder di setup
- barra IA

### 3.2 Campo vuoto in gestione formazione

In `app/gestione-formazione/page.jsx` oggi esistono due stati:

- **nessun layout**: viene mostrato un card separato con CTA `createFormation`
- **layout presente**: viene mostrato il campo con tutti gli slot vuoti cliccabili

Il problema UX rilevato e' il secondo: quando il campo esiste ma la rosa e' a `0`, il cliente vede solo slot vuoti e micro-azioni invece di una singola scelta chiara per partire.

### 3.3 Rischio attuale

Se una formazione di test venisse importata direttamente in:

- `players`
- `formation_layout`

senza regole forti, il sistema potrebbe:

- far sparire i reminder "manca la rosa"
- far sembrare completata una rosa non reale
- orientare chat, coach e setup su dati finti
- sovrascrivere una rosa esistente con un click sbagliato

---

## 4. Decisione prodotto raccomandata

### Decisione principale

La "formazione di test" va trattata come una **scorciatoia onboarding esplicita** e non come un comportamento automatico di default.

### Decisione UX finale

La soluzione scelta e':

- **un solo tasto grande centrale dentro il campo**
- visibile **solo se la rosa totale ha 5 giocatori o meno**
- senza CTA secondari
- che **sparisce da 6 giocatori in poi**

Questa regola mantiene il tasto disponibile finche' il cliente e' ancora in onboarding reale, ma lo rimuove appena la rosa e' abbastanza avviata da essere piu' sensato completarla che riempirla automaticamente.

### Forma consigliata

Usare un CTA esplicito:

**Importa una formazione di test**

con una singola micro-spiegazione, non invasiva:

**Per provare subito l'app con una rosa gia' pronta.**

Quando l'utente ha gia' inserito alcuni elementi ma e' ancora sotto soglia (`<= 5`), il significato del bottone cambia:

- non "riparti da zero"
- ma **completa automaticamente quello che manca**

### Cosa NON fare

Non usare:

- import automatico silenzioso
- scelta nascosta nel login
- yes/no ambiguo
- sovrascrittura diretta senza protezione
- CTA multipli dentro il campo vuoto

---

## 5. Dove mostrare il CTA

### Raccomandazione

Il CTA va mostrato:

- **solo in `gestione-formazione`**
- **dentro il campo quando il layout esiste**
- **nel blocco iniziale quando non esiste ancora il layout e il cliente e' a 0**
- **solo quando la rosa totale ha 5 giocatori o meno**

### Non raccomandato

Non metterlo:

- nel login
- nel modal `Smart / Pro`
- in dashboard come CTA principale

Per questa decisione il punto piu chiaro e' il campo stesso, non un flusso esterno.

---

## 6. Regole di visibilita'

### Regola unica

Il CTA compare **solo** se:

- esiste il layout / il campo e' gia' visibile
- il numero totale di giocatori (`titolari + riserve`) e' `<= 5`

Appena l'utente arriva a **6 giocatori o piu'**:

- il CTA sparisce
- il resto della UX resta invariato

Questa e' la scelta piu pulita:

- il tasto resta disponibile finche' la rosa non e' davvero usabile
- da meta' squadra in poi l'utente viene spinto solo a completare il setup con i flussi gia' esistenti
- si evita il "limbo" in cui il cliente ha 1-2 giocatori ma non puo' piu' usare la scorciatoia starter

---

## 7. Gestione del rischio overwrite

Questo e' il punto piu delicato.

### Regola prodotto obbligatoria

La formazione di test **non deve mai poter sovrascrivere una rosa reale con un singolo click involontario**.

### Soluzione minima accettabile

Il CTA non viene mostrato se la rosa ha gia' superato la soglia onboarding (`>= 6` giocatori).

Questa scelta elimina il caso piu pericoloso:

- utente gia' attivo
- click sbagliato
- overwrite involontario

### Regola di comportamento

Il bottone non deve avere sempre lo stesso effetto:

- se la rosa e' a `0` -> **import completo starter pack**
- se la rosa e' tra `1` e `5` -> **completa solo quello che manca**

### Principio UX chiave

Se la rosa finale diventa "ibrida" (alcuni giocatori del cliente + alcuni giocatori starter), questo non e' un problema di prodotto purche':

- sia il risultato di una scelta esplicita del cliente
- il sistema mantenga i giocatori gia' inseriti
- il sistema completi solo i buchi mancanti

In questa logica l'ibrido non e' un errore del sistema: e' un aiuto volontario per far partire piu in fretta una rosa ancora incompleta.

Questo evita di cancellare i primi dati inseriti dal cliente e rende la scorciatoia ancora utile anche nei primi minuti di setup.

### Copy conferma raccomandato

**Hai gia' una rosa personalizzata.**  
Se continui, la formazione di test sostituira' la rosa attuale.

### Copy NON raccomandato

**Irreversibile** come messaggio principale non e' ideale:

- comunica pericolo e fragilita'
- abbassa la fiducia
- rende la funzione psicologicamente inutilizzabile

Meglio un warning serio ma professionale.

### Soluzione migliore

Se tecnicamente possibile, prevedere una rete di sicurezza:

- backup temporaneo
- ripristino della rosa precedente

Se non e' possibile, la funzione va mostrata solo in casi molto controllati.

---

## 8. CTA e microcopy raccomandati

### CTA principale per campo vuoto

**Importa una formazione di test**

Sottotesto:

**Per provare subito l'app con una rosa gia' pronta.**

### CTA quando la rosa e' parziale (`1-5` giocatori)

**Importa una formazione di test**

Sottotesto:

**Completiamo automaticamente solo quello che manca.**

### Nessun CTA secondario

Nel blocco centrale del campo vuoto non vanno aggiunti:

- `Carica la mia rosa`
- `Preferisco iniziare da zero`
- doppi pulsanti

Il resto della pagina e dei flussi gia' esistenti resta disponibile; il blocco centrale deve servire solo a sbloccare il vuoto iniziale.

---

## 9. Quando il messaggio deve sparire

Il messaggio non deve essere permanente.

### Deve sparire se:

- la rosa totale arriva a `6` giocatori o piu' (import, inserimento manuale o upload)

### Non deve restare visibile:

- alla terza / quarta visita di un cliente gia' personalizzato
- come CTA primaria per chi ha gia' dati reali

### Regola UX

La funzione e' un empty state del campo, non una funzione permanente della pagina.

---

## 10. Impatto su Supabase

### Starter pack raccomandato

La formazione di test non deve essere solo "11 giocatori". Se l'import esiste davvero, il pacchetto deve includere:

- `players` starter (11 titolari)
- `formation_layout` starter
- `coaches` starter (allenatore attivo)
- `team_tactical_settings` starter coerenti
- `user_game_analysis` starter, se si vuole evitare il vuoto anche nelle statistiche

### Dati da NON importare

Devono restare fuori:

- `user_profiles`
- `matches`
- `user_tactical_feedback`
- memoria / storico personale

Motivo:

lo starter pack deve creare **contesto funzionale iniziale**, non simulare la storia reale del cliente.

### Regola pratica

Se la formazione di test viene salvata davvero nelle tabelle reali, bisogna considerarla un'azione sensibile, ma in questa proposta il rischio viene abbattuto dal gating:

- CTA visibile solo a `<= 5` giocatori
- nessuna visibilita' nel resto della vita della rosa

### Modalita' di import

#### Modalita' A — `starter_full`

Da usare se il cliente ha `0` giocatori.

Importa:

- `formation_layout`
- tutti i `players` starter (titolari + riserve)
- `coaches` starter
- `team_tactical_settings`
- `user_game_analysis`

#### Modalita' B — `starter_fill_missing`

Da usare se il cliente ha tra `1` e `5` giocatori.

Regole:

- non toccare slot gia' occupati
- non toccare giocatori gia' presenti
- riempire solo gli slot titolari vuoti
- aggiungere riserve starter solo se mancanti
- importare coach solo se non esiste coach attivo
- importare tattica starter solo se mancante
- importare statistiche starter solo se mancanti

Questa modalita' protegge i primi dati inseriti dal cliente e mantiene coerente la promessa UX: aiutarti a partire, non cancellare cio' che hai gia' fatto.

### Significato prodotto di `starter_fill_missing`

Quando il cliente ha gia' inserito 1-5 elementi, il bottone non significa:

- "riparti da zero"
- "sostituisci la mia rosa"

Significa:

- **mantieni quello che ho gia' scelto**
- **completa automaticamente il resto**

Questo rende la funzione coerente anche per utenti che hanno gia' iniziato a configurare la rosa ma non hanno ancora una base davvero usabile.

---

## 11. Soluzione raccomandata finale

### Sintesi

La soluzione piu equilibrata e' questa:

1. CTA esplicito `Importa una formazione di test`
2. mostrato nel campo solo se la rosa totale ha `<= 5` giocatori
3. nessun CTA secondario
4. sparisce da `6` giocatori in poi
5. import di uno starter pack completo: formazione + 11 titolari + coach + tattica base + statistiche starter
6. se la rosa e' a `0`: **import completo**
7. se la rosa e' tra `1` e `5`: **completa solo cio' che manca**
8. se la rosa e' a `6+`: **nessun bottone, solo flusso standard di completamento**
9. niente profilo, niente partite, niente palestra coach

### Motivazione

Questa soluzione:

- riduce l'attrito iniziale
- non richiede di toccare login o dashboard
- non cambia la UX dopo che la rosa e' davvero avviata
- limita moltissimo il rischio di overwrite
- rispetta i primi inserimenti del cliente
- rende accettabile una rosa ibrida perche' nasce da una scelta volontaria
- rende il prodotto subito "vivo" senza fingere una storia personale

---

## 12. Criteri di accettazione prodotto

La soluzione e' considerata corretta se:

- un utente nuovo capisce subito che puo' provare l'app senza caricare tutta la rosa
- il CTA appare solo con `<= 5` giocatori totali
- il CTA sparisce con `>= 6` giocatori
- un utente gia' attivo non vede mai questa scorciatoia nel flusso normale
- un utente con `1-5` giocatori non perde i dati gia' inseriti
- un utente con `1-5` giocatori capisce che il sistema completera' solo il mancante
- il copy non fa sembrare lo starter pack una storia personale reale del cliente
- coach e statistiche starter rendono l'app usabile subito, senza importare profilo o partite

---

## 13. Decisione operativa

**Procedere con un solo tasto centrale dentro il campo, visibile solo con `<= 5` giocatori.**

**Non usare login, dashboard o modal Smart/Pro come punto di scelta.**

**Trattare l'import come starter pack funzionale (formazione + coach + stats), non come profilo personale del cliente.**

**Usare due comportamenti: import completo a `0`, completamento del mancante tra `1` e `5`.**

**Da `6+` giocatori in poi, nessuna scorciatoia starter: il cliente prosegue solo con il flusso normale di completamento della rosa.**
