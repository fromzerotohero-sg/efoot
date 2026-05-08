# Nuova Rosa - Produzione e Migrazione

**Data:** 2026-05-08  
**Obiettivo:** definire una strategia production-safe per `Nuova Rosa`, tenendo conto di:

- ambiente gia in produzione;
- test iniziali su account nuovo controllato;
- utenti esistenti che hanno gia caricato la formazione;
- futuro collegamento tra `players` e `player_catalog`.

---

## 1. Executive Summary

La situazione piu sicura e questa:

1. creare `nuova-rosa-lab` come pagina nascosta;
2. testarla solo con account nuovo controllato;
3. non introdurre subito modifiche breaking alle tabelle usate dal live;
4. far leggere alla nuova pagina gli stessi dati reali di oggi;
5. introdurre il collegamento `players -> catalog card` in modo **opzionale e non bloccante**;
6. migrare gli utenti esistenti solo dopo avere una strategia chiara di linking retroattivo.

Conclusione pratica:

**per la V1 lab non e obbligatorio modificare la tabella `players`.**  
Per la migrazione finale e fortemente raccomandato introdurre un collegamento opzionale, ma in modo non breaking.

---

## 2. Cosa puoi fare subito senza rischiare produzione

Dato che inizialmente la pagina la vedrai solo tu e testerai con un account nuovo:

- puoi creare la nuova route lab;
- puoi usare gli stessi dati reali e le stesse API;
- puoi salvare player da catalogo dentro `players`;
- puoi tenere il legacy intatto;
- puoi validare UX, picker e flow senza toccare il comportamento della pagina live.

Questo e molto importante:

**se usi un account nuovo controllato, il rischio operativo per gli utenti gia attivi e quasi nullo**, finche:

- non tocchi la route live;
- non cambi la semantica delle API legacy;
- non fai migrazioni invasive o breaking.

---

## 3. Domanda chiave: serve modificare `players`?

## 3.1 Risposta breve

### Per la V1 lab

- **No, non e obbligatorio.**

### Per la migrazione finale pulita

- **Si, e consigliato introdurre un collegamento opzionale al catalogo.**

## 3.2 Perche nella V1 puoi evitare migrazione

Per il tuo account nuovo:

- il picker catalogo sceglie una carta;
- il sistema salva in `players` i dati gia pronti;
- la nuova pagina puo funzionare anche senza colonne nuove dedicate;
- puoi mettere il riferimento catalogo dentro `metadata` o `extracted_data`.

Questa scelta e ottima per partire in sicurezza.

## 3.3 Perche a regime conviene aggiungere un collegamento esplicito

Quando `Nuova Rosa` diventera la pagina vera per tutti, avrai due bisogni:

1. sapere da quale carta catalogo nasce un player;
2. provare a collegare retroattivamente i player gia esistenti alla carta corretta.

Se il collegamento resta solo dentro un JSON libero, la UI finale puo funzionare, ma:

- la query e piu fragile;
- il debug e peggiore;
- il backfill sugli utenti esistenti e piu difficile;
- il matching retroattivo e meno governabile.

Quindi a regime un link esplicito e meglio.

---

## 4. Strategia raccomandata in 2 fasi

## 4.1 Fase 1 - Nessuna migrazione obbligatoria

Per la V1 lab:

- usare `player_catalog.players_payload`;
- creare record in `players`;
- salvare il collegamento nel metadata.

Campi raccomandati nel metadata:

- `catalog_source`
- `catalog_source_player_id`
- `catalog_card_instance_key`
- `catalog_player_identity_key`
- `catalog_card_type`
- `catalog_pack_name`
- `catalog_link_method`
- `catalog_link_confidence`
- `catalog_linked_at`

### Vantaggi

- zero breaking changes;
- test rapido;
- nessun rischio sugli utenti live;
- massima compatibilita col sistema attuale.

## 4.2 Fase 2 - Migrazione opzionale ma consigliata

Quando la pagina lab e validata, introdurre in `players` colonne nullable e non breaking.

Campi raccomandati:

- `catalog_source`
- `catalog_source_player_id`
- `catalog_card_instance_key`
- `catalog_player_identity_id`
- `catalog_player_identity_key`
- `catalog_link_confidence`
- `catalog_link_method`
- `catalog_linked_at`
- `catalog_needs_review`

### Regola

Tutte queste colonne devono essere:

- opzionali;
- senza modificare i flussi legacy;
- senza cambiare la validita dei record esistenti.

---

## 5. Come leggera la formazione chi ha gia i dati

## 5.1 Risposta corretta

Quando `Nuova Rosa` diventera la pagina principale, chi ha gia la formazione caricata deve continuare a vedere:

- i suoi `players`
- il suo `formation_layout`
- le sue `riserve`
- le sue `tattiche`
- il suo `coach`

Quindi la pagina non deve dipendere dal fatto che ogni player sia gia collegato a una card di catalogo.

## 5.2 Regola enterprise fondamentale

La pagina deve funzionare in due modalita:

### Modalita A - Player gia collegato a catalogo

La UI puo mostrare:

- immagine carta;
- variante;
- pack;
- dati tecnici completi;
- edit card-aware.

### Modalita B - Player legacy non ancora collegato

La UI deve comunque mostrare:

- player name
- posizione
- overall
- stats presenti
- competenze
- boosters
- azioni normali di rosa

e in piu puo mostrare:

- `Carta non ancora collegata`
- `Collega carta`
- `Suggerimento carta compatibile`

### Decisione

Il linking catalogo deve essere un miglioramento, non un prerequisito per aprire la pagina.

---

## 6. Ragionamento inverso: dal legacy verso il catalogo

Questa e la parte che hai chiesto bene: ragionare anche al contrario.

## 6.1 Problema reale

Gli utenti esistenti hanno `players` salvati tramite:

- upload immagini;
- inserimento manuale;
- flussi misti;
- modifiche successive.

Quindi spesso i loro player:

- non hanno un riferimento alla carta catalogo;
- possono avere dati incompleti;
- possono avere `position` mutata dallo schieramento;
- possono avere nomi uguali ma carte diverse.

## 6.2 Cosa NON fare

Non fare mai:

- linking automatico hard per solo nome;
- linking automatico nome + posizione;
- overwrite silenzioso dei dati player esistenti;
- deduplicazione aggressiva su utenti gia attivi.

## 6.3 Cosa fare invece

Applicare un linking a livelli.

### Livello 1 - Strong match

Se esistono segnali forti:

- metadata preesistente;
- nome + card type + overall + role fortemente coerenti;
- pack o source noti;
- chiavi origine gia presenti

allora:

- colleghi automaticamente;
- salvi `catalog_link_confidence = high`.

### Livello 2 - Medium match

Se il match e probabile ma non certo:

- proponi una carta suggerita nella UI;
- non colleghi in modo irreversibile;
- salvi eventualmente solo suggerimento, non link definitivo.

### Livello 3 - No match

Se non sei sicuro:

- il player resta legacy;
- la pagina continua a funzionare;
- il cliente puo collegarlo in seguito.

## 6.4 Strategia di backfill

La strategia migliore non e fare subito una migrazione massiva cieca.

La strategia migliore e:

1. supportare player linked e unlinked nella nuova pagina;
2. fare linking lazy on read o lazy on edit;
3. raccogliere evidenza reale;
4. solo dopo fare un backfill piu intelligente.

---

## 7. Cosa vede un utente legacy nella Nuova Rosa

## Caso 1 - Player collegato

Vede:

- carta bella;
- immagine;
- tipo carta;
- dettagli tecnici;
- edit rapido card-aware.

## Caso 2 - Player non collegato

Vede comunque:

- il suo giocatore;
- il suo slot;
- i suoi dati;
- i pulsanti normali di edit/remove/delete;
- eventualmente una CTA `Collega carta`.

### Decisione UX

Nessun utente esistente deve percepire:

- formazione rotta;
- player spariti;
- necessità immediata di rifare la rosa;
- blocco perche il catalogo non conosce ancora il suo player.

---

## 8. Rischi reali quando la pagina diventa quella nuova

## 8.1 Rischio 1 - Utenti legacy senza card link

Mitigazione:

- supporto completo a player unlinked;
- UI ibrida;
- fallback grafico e dati locali.

## 8.2 Rischio 2 - Matching errato

Mitigazione:

- strong match only per auto-link;
- medium match come suggerimento;
- niente overwrite aggressivo.

## 8.3 Rischio 3 - Semantica ambigua di `players.position`

Mitigazione:

- nella V1 non cambiare il comportamento legacy;
- per il linking usare anche `original_positions`, overall, metadata e non solo `position`.

## 8.4 Rischio 4 - Breaking changes schema

Mitigazione:

- se aggiungi colonne in `players`, farle nullable e additive;
- nessun vincolo nuovo obbligatorio sul live;
- nessuna API legacy rotta.

---

## 9. Cose che possiamo fare subito in produzione

- creare `nuova-rosa-lab`;
- testarla con account nuovo controllato;
- usare picker catalogo su slot vuoto;
- salvare il link catalogo in metadata;
- non toccare la pagina live;
- non toccare il significato dei campi esistenti;
- non forzare il linking retroattivo.

---

## 10. Cose che non dobbiamo toccare nella V1 lab

- semantica corrente di `players.position` nel legacy;
- route live `gestione-formazione` come pagina principale;
- comportamento starter pack del live;
- API legacy in modo breaking;
- obbligo di card link per mostrare la rosa;
- migrazione cieca di tutti i `players` esistenti.

---

## 11. Strategia finale raccomandata

## Step 1

Costruire la nuova pagina lab con:

- account nuovo;
- nessuna migrazione obbligatoria;
- metadata catalog link;
- piena compatibilita con `players`.

## Step 2

Validare UX e stabilita.

## Step 3

Aggiungere, se serve, colonne nullable di linking in `players`.

## Step 4

Supportare utenti legacy linked e unlinked.

## Step 5

Introdurre linking retroattivo graduale e prudente.

## Step 6

Solo dopo, rendere `Nuova Rosa` la pagina principale.

---

## 12. Decisione finale

Risposta netta alla tua domanda:

### Dobbiamo modificare `players` subito?

- **No**, non per partire in sicurezza con la V1 lab.

### Dovremo probabilmente estenderla a regime?

- **Si**, ma con campi opzionali e additive migration, non breaking.

### Gli utenti che hanno gia la formazione la vedranno nella nuova pagina?

- **Si**, se progettiamo la pagina per leggere i `players` legacy anche senza card link.

### Dobbiamo ragionare anche in modo inverso?

- **Si**, ed e obbligatorio: il linking retroattivo deve essere progressivo, prudente e mai distruttivo.
