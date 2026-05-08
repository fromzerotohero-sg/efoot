# Nuova Rosa - Implementazione V1

**Data:** 2026-05-08  
**Scope:** piano esecutivo per la prima versione production-safe di `Nuova Rosa`, coerente con `docs/NUOVA_ROSA_ENTERPRISE.md`.

---

## 1. Obiettivo V1

Consegnare una pagina nascosta realmente usabile, con:

- caricamento dati reali;
- campo formazione funzionante;
- selezione giocatore da catalogo;
- salvataggio in `players`;
- assegnazione allo slot;
- gestione riserve;
- warning duplicati e fuori ruolo;
- fallback manuale e starter pack;
- refresh side effects gia esistenti.

La V1 non deve essere perfetta su tutto, ma deve essere **migrabile**.

---

## 2. Route e perimetro

## 2.1 Route raccomandata

- `app/nuova-rosa-lab/page.jsx`

## 2.2 Accesso

La pagina deve essere:

- non linkata nella navigazione primaria;
- raggiungibile via URL diretto;
- autenticata come le altre pagine protette.

## 2.3 Vincolo

Non modificare ancora `app/gestione-formazione/page.jsx` come entry principale.

---

## 3. Scope V1 incluso

- loader aggregato rosa;
- hero di stato setup;
- rendering campo e slot;
- click slot vuoto;
- picker giocatore da catalogo;
- ricerca libera;
- suggeriti per ruolo slot;
- scelta libera anche fuori ruolo;
- creazione record in `players`;
- assegnazione slot;
- visualizzazione titolari e riserve;
- rimozione da slot;
- delete giocatore;
- starter pack;
- fallback manuale;
- accesso a edit rapido;
- refresh diagnostico e knowledge.

---

## 4. Scope V1 escluso o ridotto

- drag and drop avanzato completo del vecchio monolite, se non serve per la V1;
- rifinitura totale di tutti i casi upload foto;
- meta-target avanzati del catalogo;
- uso forte di `player_identities` come cardine;
- parity visual totale con tutte le micro-feature legacy.

Queste cose possono arrivare dopo, ma solo se i fallback esistono.

---

## 5. Architettura della pagina

## 5.1 Struttura top-level

La pagina dovrebbe essere composta da:

1. `NuovaRosaPage`
2. `NuovaRosaLayout`
3. `SetupHero`
4. `FormationWorkspace`
5. `RosterBench`
6. `RosterIntelligencePanel`
7. `CatalogPickerModal`
8. `PlayerQuickEditPanel`
9. `ManualEntryFallback`

## 5.2 Regola di composizione

Il top-level non deve contenere logica lunga di fetch, mapping e side effects.

Deve limitarsi a:

- leggere stato aggregato;
- orchestrare i pannelli;
- aprire/chiudere modal o panel;
- chiamare action hooks.

---

## 6. Hook / logica raccomandata

## 6.1 `useRosterWorkspace`

Responsabilita:

- fetch da `/api/formation`;
- normalizzazione `players`;
- split titolari/riserve;
- calcolo `setupStage`;
- indicatori di stato;
- esposizione stato pagina.

Output minimo:

- `layout`
- `players`
- `starters`
- `reserves`
- `activeCoach`
- `tacticalSettings`
- `setupStage`
- `loading`
- `error`
- `refetch`

## 6.2 `useRosterSideEffects`

Responsabilita:

- `refreshDiagnosticAfterSave`
- dispatch `knowledge-should-refresh`
- wrapper comune post-save

## 6.3 `useCatalogPicker`

Responsabilita:

- query catalogo;
- filtri;
- ricerca;
- suggeriti per slot;
- stato selezione;
- mapping card -> payload salvataggio.

Output minimo:

- `query`
- `filters`
- `results`
- `suggestedResults`
- `selectedCard`
- `setQuery`
- `setFilters`
- `selectCard`
- `clearSelection`

## 6.4 `useRosterPlayerActions`

Responsabilita:

- create/save player;
- assign slot;
- remove from slot;
- delete player;
- duplicate handling;
- out-of-role confirmation;
- handoff a quick edit.

## 6.5 `useQuickPlayerEdit`

Responsabilita:

- edit rapido di ruolo / competenze / boosters / overall;
- PATCH su `/api/players/[id]`;
- stato completezza;
- aggiornamento UI locale.

## 6.6 `useStarterPackActions`

Responsabilita:

- riuso import starter pack;
- gating `<= 5` giocatori;
- messaggistica;
- side effects post import.

---

## 7. Componenti V1

## 7.1 `SetupHero`

Deve mostrare:

- stato corrente della rosa;
- CTA primaria contestuale;
- eventuale secondaria minima;
- microcopy breve;
- readiness verso valore successivo.

Esempi:

- `Hai ancora il campo vuoto`
- `Hai gia una base: completiamo i ruoli mancanti`
- `Manca solo il coach per la lettura completa`

## 7.2 `FormationWorkspace`

Contiene:

- campo;
- slot;
- titolari renderizzati;
- empty slot clickable;
- stato selezione slot.

Azioni:

- click slot vuoto -> picker;
- click slot occupato -> quick panel;
- eventuale toggle edit mode.

## 7.3 `RosterBench`

Contiene:

- lista riserve;
- CTA aggiunta riserva;
- delete;
- quick open edit.

## 7.4 `RosterIntelligencePanel`

Mostra:

- ruoli mancanti;
- fuori ruolo;
- duplicati sospetti;
- giocatori incompleti;
- readiness advisor/coach.

V1 read-only.

## 7.5 `CatalogPickerModal`

Cuore UX V1.

Sezioni:

- header con slot target;
- ricerca;
- suggeriti per questo slot;
- tutti i risultati;
- card visive;
- dettaglio card selezionata;
- CTA `Aggiungi alla rosa`.

## 7.6 `PlayerQuickEditPanel`

Per giocatore salvato o appena scelto.

Mostra:

- hero carta;
- slot corrente;
- rischio ruolo;
- posizione / competenze;
- stato completezza;
- boosters;
- CTA rapide.

Azioni:

- modifica ruolo/competenze;
- sposta in riserva;
- rimuovi slot;
- elimina;
- apri edit esteso.

## 7.7 `ManualEntryFallback`

Deve restare disponibile:

- se il giocatore non si trova;
- se il catalogo non basta;
- se il cliente vuole correggere manualmente.

---

## 8. Query Supabase / API V1

## 8.1 Loader pagina

Usare:

- `GET /api/formation`

Per leggere:

- `players`
- `formation_layout`
- `playing_styles`
- `coaches`
- `team_tactical_settings`

## 8.2 Ricerca catalogo

Per V1 servira una route dedicata, raccomandata:

- `GET /api/player-catalog/search`

Input minimi:

- `q`
- `slot_position`
- `limit`
- `offset`
- `card_type`
- `source`

Output minimo:

- lista card catalogo pronta per UI;
- `players_payload`;
- indicatori qualità;
- info variante;
- immagine carta.

## 8.3 Salvataggio da catalogo

Riutilizzare:

- `POST /api/supabase/save-player`

con payload derivato da:

- `player_catalog.players_payload`
- slot target
- metadata origine catalogo

## 8.4 Assegnazione slot

Usare:

- `POST /api/supabase/assign-player-to-slot`

oppure salvare direttamente con `slot_index` se il flusso e coerente con `save-player`.

Scelta raccomandata V1:

- se la creazione del player nasce gia dallo slot, salvare direttamente con `slot_index`;
- mantenere `assign-player-to-slot` per player gia esistenti o per move successivi.

## 8.5 Edit rapido

Usare:

- `GET /api/players/[id]`
- `PATCH /api/players/[id]`

Per:

- `original_positions`
- `available_boosters`
- `photo_slots`
- campi modificabili di dettaglio.

## 8.6 Delete e remove

Usare:

- `POST /api/supabase/remove-player-from-slot`
- `DELETE /api/supabase/delete-player`

## 8.7 Starter pack

Usare:

- `POST /api/starter-pack/import`

---

## 9. Query catalogo raccomandata

## 9.1 Regola V1

Esporre in UI solo record:

- `source = 'pesdb'`
- `catalog_ready = true`
- `needs_review = false`

## 9.2 Ordinamento raccomandato

Ordine per default:

1. compatibilita con slot
2. rilevanza query
3. overall piu alto
4. card type prioritario
5. player name

## 9.3 Card types da includere

Includere:

- `Epic`
- `Highlight`
- `Legendary`
- `Trending`
- eventuali altri non-Standard gia pronti

Escludere di default:

- record non pronti;
- staging `efootballhub` se non whitelisted;
- carte `Standard`.

## 9.4 Campi UI minimi dal catalogo

- `id`
- `source`
- `source_player_id`
- `card_instance_key`
- `player_name`
- `position`
- `card_type`
- `overall_level_1`
- `overall_max_level`
- `playing_style`
- `pack_name`
- `source_card_front_url`
- `players_payload`
- `catalog_ready`
- `data_quality`

---

## 10. Mapping catalogo -> players

## 10.1 Regola

La V1 deve usare `players_payload` come base primaria di creazione record.

## 10.2 Campi da trasferire

- `player_name`
- `position`
- `card_type`
- `team`
- `club_name`
- `nationality`
- `overall_rating`
- `age`
- `role`
- `base_stats`
- `skills`
- `com_skills`
- `original_positions`
- `photo_slots`
- `metadata`

## 10.3 Metadata aggiuntivi raccomandati

Dentro metadata o extracted data del player salvato mantenere:

- `catalog_source`
- `catalog_source_player_id`
- `catalog_card_instance_key`
- `catalog_card_type`
- `catalog_pack_name`
- `catalog_player_identity_key`

## 10.4 Regola anti-fragilita

Non basare mai la creazione su solo:

- nome
- nome + posizione
- nome + stile

---

## 11. Flusso utente V1

## 11.1 Aggiunta titolare da slot

1. utente apre `nuova-rosa-lab`
2. vede hero + campo
3. clicca slot vuoto
4. si apre picker
5. vede suggeriti per quello slot
6. puo cercare qualsiasi giocatore
7. seleziona carta
8. vede mini dettaglio
9. se fuori ruolo riceve warning
10. conferma
11. sistema crea record in `players`
12. giocatore appare nel campo
13. scattano side effects post-save

## 11.2 Aggiunta riserva

1. utente clicca `Aggiungi riserva`
2. si apre picker
3. seleziona carta
4. sistema salva `players` con `slot_index = null`
5. giocatore appare in bench

## 11.3 Edit rapido

1. utente clicca giocatore sul campo o panchina
2. si apre quick edit panel
3. modifica ruoli / competenze / boosters / azioni slot
4. conferma
5. PATCH su player
6. refresh stato e side effects

## 11.4 Fallback manuale

1. utente non trova la carta
2. clicca `Inserimento manuale`
3. usa flusso manuale esistente o integrato
4. il giocatore entra comunque nella rosa

---

## 12. Edge case da coprire

## 12.1 Duplicato in titolari

Se il giocatore esiste gia nei titolari:

- warning esplicito;
- opzione sostituzione;
- nessuna duplicazione silenziosa.

## 12.2 Duplicato in riserve

Se il giocatore esiste gia in riserva:

- proporre uso del record esistente;
- evitare doppio salvataggio incoerente.

## 12.3 Fuori ruolo volontario

Consentire il salvataggio con warning.

## 12.4 Limite riserve

Rispettare il limite attuale.

## 12.5 Dati catalogo incompleti

Se una carta ha dati sufficienti ma non perfetti:

- consentire il salvataggio solo se rientra nella whitelist V1;
- mostrare eventuale badge `da completare`.

## 12.6 Nessun risultato ricerca

Mostrare:

- manuale;
- upload foto;
- messaggio chiaro.

## 12.7 Slot occupato

Nel click sullo slot occupato aprire:

- quick panel;
- sostituzione;
- remove;
- edit.

## 12.8 Failure API

Gestire:

- save player fallita;
- assign fallito;
- patch fallita;
- refresh diagnostico non bloccante.

---

## 13. UX dettagliata del picker

## 13.1 Header

Contenuti:

- nome slot / ruolo target;
- microcopy: `Ti suggeriamo profili adatti, ma puoi scegliere qualsiasi carta.`

## 13.2 Ricerca

Placeholder raccomandato:

- IT: `Cerca giocatore, ruolo, pack o tipo carta`
- EN: `Search player, role, pack, or card type`

## 13.3 Sezione suggeriti

Mostrare le carte piu coerenti per:

- ruolo slot;
- compatibilita posizione;
- overall;
- tipo carta.

## 13.4 Sezione tutti

Lista completa filtrata.

## 13.5 Card visuale

Ogni item deve mostrare:

- immagine;
- nome;
- card type;
- overall;
- posizione;
- style;
- badge compatibilita.

## 13.6 Selezione

Click su card:

- apre preview laterale o inferiore;
- abilita CTA `Aggiungi`.

## 13.7 Footer CTA

CTA:

- `Aggiungi allo slot`
- `Aggiungi in riserva` se il picker e aperto fuori da uno slot
- `Inserimento manuale`
- `Chiudi`

---

## 14. UX dettagliata del quick edit

## 14.1 Blocchi

- hero giocatore
- stato ruolo
- stato completezza
- competenze / posizioni
- boosters
- azioni slot

## 14.2 Azioni rapide

- `Sposta in riserva`
- `Rimuovi dallo slot`
- `Modifica competenze`
- `Modifica boosters`
- `Elimina`
- `Apri dettagli`

## 14.3 Regola mobile

Su mobile il quick edit deve essere:

- full screen o bottom sheet grande;
- scrollabile;
- con CTA sticky dove necessario.

---

## 15. Ordine di sviluppo raccomandato

## Step 1

Creare route lab e shell pagina autenticata.

## Step 2

Estrarre loader aggregato e stato `setupStage`.

## Step 3

Renderizzare campo + bench + hero.

## Step 4

Creare route ricerca catalogo.

## Step 5

Costruire picker catalogo con ricerca e suggeriti.

## Step 6

Salvare da catalogo in `players`.

## Step 7

Gestire assign slot / riserve / remove / delete.

## Step 8

Inserire duplicate warning e fuori ruolo warning.

## Step 9

Aggiungere quick edit panel.

## Step 10

Integrare fallback manuale e starter pack.

## Step 11

Integrare `refreshDiagnosticAfterSave` e `knowledge-should-refresh`.

## Step 12

Hardening responsive + i18n + edge cases.

---

## 16. Definition of done V1

La V1 e pronta se:

- la pagina si apre su dati reali;
- il cliente puo riempire almeno 1 slot da catalogo;
- il player viene salvato in `players`;
- il player appare correttamente nel campo;
- il cliente puo aggiungere una riserva;
- il cliente puo modificare o rimuovere un player;
- starter pack continua a funzionare;
- duplicate e warning fuori ruolo non si perdono;
- i side effects post-save restano corretti;
- la UX e usabile su mobile e desktop;
- la pagina e bilingue.

---

## 17. Rischi principali

## 17.1 Rischio mapping catalogo

Mitigazione:

- usare `players_payload`;
- mantenere metadata origine;
- whitelist `pesdb`.

## 17.2 Rischio regressione side effects

Mitigazione:

- wrapper unico post-save;
- reuse esplicito del refresh esistente.

## 17.3 Rischio UX troppo pesante

Mitigazione:

- picker focalizzato;
- edit rapido separato;
- fallback legacy non dominante.

## 17.4 Rischio pagina lab troppo diversa dal dominio reale

Mitigazione:

- usare API e tabelle reali;
- evitare mock o stato separato.

---

## 18. Decisione finale V1

La V1 deve dimostrare una sola cosa in modo inequivocabile:

**aggiungere e gestire giocatori nella rosa puo diventare piu veloce, piu bello e piu chiaro senza rompere il sistema reale.**

Se questo obiettivo e raggiunto, la migrazione dalla pagina nascosta alla pagina principale diventa una decisione di rollout, non un salto nel vuoto.
