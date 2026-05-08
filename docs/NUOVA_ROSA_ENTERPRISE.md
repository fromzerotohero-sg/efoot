# Nuova Rosa - Specifica Enterprise

**Data:** 2026-05-08  
**Obiettivo:** progettare una nuova esperienza rosa production-safe, bilingue, responsive e migrabile, senza perdere nessuna capability valida oggi presente in `app/gestione-formazione/page.jsx`.

---

## 1. Executive Summary

La pagina attuale `gestione-formazione` contiene logiche corrette e mature, ma soffre di un problema enterprise di struttura e funnel:

- concentra troppe responsabilita in un unico file;
- presenta troppo presto lavoro da fare invece di valore immediato;
- rende costoso evolvere UX, onboarding e caricamento rosa;
- mescola dominio, orchestrazione, side effects e rendering.

La soluzione raccomandata **non** e un refactor diretto della pagina live.

La soluzione raccomandata e:

1. creare una **nuova pagina nascosta** lab, separata dal flusso live;
2. riusare il dominio, le API e i side effects corretti gia esistenti;
3. introdurre una UX nuova centrata su selezione da catalogo, progressione guidata e liberta di errore;
4. validare il nuovo funnel con dati reali di Supabase;
5. migrare solo dopo conferma funzionale e UX.

Questa e la strategia piu sicura in produzione.

---

## 2. Decisione di prodotto

## 2.1 Decisione principale

Procedere con una nuova esperienza chiamata **Nuova Rosa**, inizialmente esposta come pagina nascosta in stile lab.

Nome tecnico raccomandato:

- route nascosta iniziale: `app/nuova-rosa-lab/page.jsx`

Nome prodotto mostrato in UI:

- IT: `Nuova Rosa`
- EN: `New Roster`

## 2.2 Decisione architetturale

La nuova pagina deve:

- leggere e scrivere sugli stessi dati reali della piattaforma;
- riusare le API stabili gia in uso;
- preservare i side effect critici gia presenti;
- introdurre un ingresso giocatore piu rapido tramite `player_catalog`;
- restare completamente compatibile con `players`, `formation_layout`, `team_tactical_settings` e `coaches`.

## 2.3 Decisione UX

Il nuovo paradigma non e:

- "compila tutto per usare il prodotto"

ma:

- "costruisci la rosa a step e sblocca valore progressivamente"

La pagina deve guidare, ma non bloccare. Deve suggerire, ma non imporre.

---

## 3. Obiettivi Enterprise

## 3.1 Obiettivi di business

- aumentare il numero di utenti che iniziano davvero la rosa;
- ridurre l attrito del primo inserimento giocatori;
- rendere piu facile arrivare a una formazione utile, non perfetta;
- aumentare il valore percepito della rosa come base per coach, advisor e insight;
- creare una base migrabile e maintainable.

## 3.2 Obiettivi di prodotto

- permettere di aggiungere un giocatore in pochi tocchi;
- valorizzare il catalogo carte come fonte di scelta visiva;
- lasciare al cliente la liberta di schierare anche un giocatore "sbagliato";
- mantenere la possibilita di correzione, modifica e fallback manuale;
- mostrare subito insight utili anche con rosa parziale.

## 3.3 Obiettivi tecnici

- separare dominio, orchestrazione e rendering;
- mantenere compatibilita con il sistema live;
- evitare regressioni nelle API e nei side effects esistenti;
- rendere piu semplice la futura migrazione dalla pagina lab alla pagina live.

---

## 4. Non Obiettivi

- non riscrivere subito l intera pagina live;
- non cambiare subito il modello dati principale in modo breaking;
- non eliminare i flussi esistenti di upload o inserimento manuale;
- non introdurre un sistema rigido che impedisce al cliente di usare giocatori fuori ruolo;
- non dipendere solo da `player_catalog` per ogni caso.

---

## 5. Fonte di verita e principio guida

La nuova esperienza deve rispettare questo principio:

**`player_catalog` serve per cercare, mostrare, suggerire e precompilare. `players` resta la fonte operativa personale della rosa utente.**

Quindi:

- il catalogo non sostituisce la rosa utente;
- la selezione da catalogo crea o aggiorna record in `players`;
- la rosa schierata resta in `players` + `formation_layout`;
- coach e tattiche restano dati utente, non dati di catalogo.

---

## 6. Stato attuale da preservare

Il monolite `app/gestione-formazione/page.jsx` contiene comportamenti che oggi funzionano e che **devono essere preservati**.

## 6.1 Capability da preservare obbligatoriamente

- caricamento aggregato da `/api/formation`;
- distinzione titolari e riserve;
- assegnazione giocatore a slot;
- rimozione da slot;
- delete giocatore;
- salvataggio layout formazione;
- salvataggio tattiche;
- starter pack;
- gestione duplicati;
- gestione warning fuori ruolo;
- gestione `original_positions`;
- gestione `photo_slots`;
- gestione `available_boosters`;
- modal conferma coerenti;
- input manuale;
- upload foto;
- selezione posizioni;
- gestione dati mancanti;
- refresh diagnostic post-save;
- evento `knowledge-should-refresh`.

## 6.2 Vincolo enterprise

La nuova pagina non puo essere una demo incompleta.  
Deve essere una nuova orchestrazione UX sopra lo stesso dominio, con compatibilita reale.

---

## 7. Nuovo modello prodotto

## 7.1 Setup progressivo

La rosa deve essere letta come stato progressivo:

- `empty`
- `starter_seeded`
- `partial`
- `formation_ready`
- `system_ready`

### Definizioni

- `empty`: nessun giocatore o quasi nessun dato utile.
- `starter_seeded`: base iniziale presente tramite starter pack o primi inserimenti.
- `partial`: esiste gia una rosa utile ma incompleta.
- `formation_ready`: 11 titolari e layout salvato.
- `system_ready`: formazione + coach + tattiche utili presenti.

## 7.2 Value gating

Ogni stato deve sbloccare valore progressivo:

- `empty`: onboarding e starter path;
- `starter_seeded`: suggerimenti base e copertura ruoli;
- `partial`: insight rosa, confronto ruoli, preparazione advisor;
- `formation_ready`: fit titolari e letture per modulo;
- `system_ready`: lettura completa con coach e tattiche.

---

## 8. UX della Nuova Rosa

## 8.1 Architettura UI ad alto livello

La pagina deve essere composta da 4 blocchi:

1. `Setup Hero`
2. `Formation Workspace`
3. `Bench / Roster List`
4. `Roster Intelligence`

## 8.2 Setup Hero

Deve mostrare una sola CTA primaria alla volta, in base allo stato:

- `Importa una formazione di test`
- `Aggiungi i primi giocatori`
- `Completa i titolari mancanti`
- `Salva il modulo`
- `Aggiungi coach e tattica`

La hero non deve mostrare troppe CTA concorrenti.

## 8.3 Formation Workspace

Il campo resta il centro visivo della pagina.

Comportamenti richiesti:

- click su slot vuoto;
- click su slot occupato;
- drag o riposizionamento futuro dove utile;
- edit mode separato dal mode di inserimento;
- compatibilita con mobile e desktop.

## 8.4 Bench / Roster List

La lista riserve deve restare disponibile e utile:

- giocatori non titolari;
- aggiunta rapida;
- delete;
- eventuale accesso a edit, boosters, dati mancanti.

## 8.5 Roster Intelligence

Pannello read-only iniziale con valore immediato:

- ruoli scoperti;
- doppioni sospetti;
- fuori ruolo;
- panchina sbilanciata;
- completezza dati rosa;
- stato readiness per Card Advisor / Coach.

Questo pannello e un elemento chiave per ridurre la sensazione di lavoro e aumentare la percezione di valore.

---

## 9. Flusso principale: scelta giocatore da catalogo

## 9.1 Nuovo ingresso principale

Quando il cliente clicca su uno slot vuoto:

1. si apre un picker giocatori;
2. il picker e pre-orientato sul ruolo dello slot;
3. il cliente puo comunque cercare qualsiasi giocatore;
4. la scelta genera un record personale in `players`;
5. il record viene assegnato allo slot.

## 9.2 Regola fondamentale

Lo slot **suggerisce** il ruolo corretto, ma **non lo impone**.

Se l utente clicca sullo slot trequartista:

- il sistema deve suggerire trequartisti e profili compatibili;
- ma deve permettere di scegliere anche un altro giocatore.

Il sistema deve lasciare libertà di errore, con warning intelligenti.

## 9.3 Struttura del picker

Il picker deve avere almeno:

- ricerca libera;
- sezione `Suggeriti per questo slot`;
- sezione `Tutti i giocatori`;
- filtri per ruolo, nome, card type, pack, source;
- visualizzazione tramite immagine carta;
- supporto mobile-first;
- fallback edit / manuale se il giocatore non viene trovato.

## 9.4 Regola UX fuori ruolo

Se il cliente seleziona un giocatore poco coerente con lo slot:

- non bloccare il salvataggio;
- mostrare un warning chiaro;
- dare un livello di rischio;
- lasciare confermare.

Livelli raccomandati:

- `Naturale`
- `Adattabile`
- `Fuori ruolo`
- `Rischio alto`

## 9.5 Regola editabilita

Dopo la scelta da catalogo il giocatore deve restare editabile:

- subito, se serve correggere posizione o dati;
- successivamente, come record normale in `players`.

Il catalogo accelera l ingresso, ma non deve togliere controllo al cliente.

---

## 10. Editing giocatore enterprise

## 10.1 Principio generale

La Nuova Rosa non deve limitarsi a "scegliere una carta e salvarla".

Deve offrire un editing giocatore bello, veloce e comprensibile, senza costringere il cliente a rientrare in flussi pesanti ogni volta che vuole correggere qualcosa.

Regola guida:

- la scelta da catalogo crea il giocatore;
- l editing rende il giocatore davvero "suo".

## 10.2 Due livelli di editing

### Livello 1 - Edit rapido

Disponibile subito dopo la scelta o dal click sul giocatore nel campo/lista.

Deve permettere di modificare rapidamente:

- posizione principale usata in rosa;
- competenze / `original_positions`;
- overall se serve correzione manuale;
- boosters disponibili;
- slot o uso come riserva;
- eventuale conferma fuori ruolo.

Questo edit rapido deve vivere in:

- side panel su desktop;
- bottom sheet o full-screen edit panel su mobile.

Per la hidden page lab evoluta, il livello 1 non deve piu essere un pannello povero di azioni.

Deve diventare un **player editor premium** con:

- hero carta;
- immagine grande;
- dati principali subito editabili;
- statistiche a sezioni;
- abilita editabili;
- booster e azioni rosa raggiungibili nello stesso spazio.

### Livello 2 - Edit esteso

Accessibile come azione secondaria:

- "Modifica dettagli"
- "Completa profilo"

Deve includere:

- statistiche base;
- skills;
- boosters;
- metadata;
- stato completezza;
- eventuale provenienza catalogo;
- correzione manuale di campi mancanti.

Questo livello puo riusare parti del dettaglio giocatore attuale e del dominio gia esistente.

## 10.3 Regola di sicurezza prodotto

L editing non deve rompere il legame con la carta sorgente.

Quindi:

- il cliente puo modificare il proprio record `players`;
- ma il sistema deve mantenere il riferimento origine catalogo in metadata / chiavi origine;
- il catalogo resta immutabile come fonte;
- `players` resta il livello personalizzato.

## 10.4 Stato di completezza giocatore

Per ogni giocatore la Nuova Rosa deve rendere leggibile il livello di completezza.

Livelli raccomandati:

- `Base`
- `Catalogo collegato`
- `Completo`
- `Da rivedere`

Segnali visivi possibili:

- bordo;
- pill status;
- progress state sintetico;
- alert leggero in edit panel.

## 10.5 Edit e warning fuori ruolo

Se un giocatore e usato in uno slot non naturale, l edit rapido deve mostrare:

- ruolo slot;
- ruolo carta;
- livello rischio;
- CTA `Conferma comunque` oppure `Modifica competenze`.

Questo e coerente con il comportamento libero che vuoi preservare.

---

## 11. UX visuale e qualitativa

## 11.1 Direzione UX raccomandata

La Nuova Rosa non deve avere una UX solo "gestionale".  
Deve essere una esperienza piacevole, leggibile e card-based, con una qualita percepita piu vicina a `card-advisor-lab`.

Elementi da prendere come riferimento dalla UX di `card-advisor-lab`:

- uso forte dell immagine carta;
- gerarchia chiara hero -> dettagli -> CTA;
- metriche sintetiche leggibili;
- pannelli con significato preciso;
- modal/detail panel puliti;
- CTA contestuali e non disperse.

## 11.2 Regole visuali

La pagina deve essere:

- pulita;
- leggibile;
- moderna ma non fragile;
- orientata alla carta e al ruolo;
- coerente con lo stile prodotto gia presente.

Da evitare:

- griglie confuse di micro-card tutte uguali;
- troppe CTA secondarie insieme;
- modal pieni di testo tecnico;
- editing distribuito in punti incoerenti;
- liste lunghe senza immagine o struttura visiva.

## 11.3 Picker come esperienza "bella"

Il picker giocatori deve sembrare un catalogo reale, non una select amministrativa.

Deve valorizzare:

- immagine carta;
- nome giocatore;
- posizione;
- stile;
- overall;
- tipo carta;
- pack o collezione.

La carta deve essere il centro della scelta, non una riga di tabella.

## 11.4 Detail panel carta / giocatore

Dopo la selezione o nel click sul giocatore schierato, la UI deve poter mostrare un pannello dettaglio ispirato al pattern di `card-advisor-lab`.

Blocchi raccomandati:

- hero carta;
- metriche principali;
- profilo tecnico sintetico;
- stato ruolo nello slot;
- completezza dati;
- azioni rapide: modifica, sposta, rimuovi, boosters.

## 11.5 Microcopy UX

La UX deve comunicare in modo chiaro:

- quando il sistema suggerisce;
- quando il cliente e libero;
- quando c e un rischio;
- quando il salvataggio e andato bene;
- cosa manca per migliorare la rosa.

Formula raccomandata:

- guida breve;
- warning chiari;
- niente tono accusatorio;
- niente messaggi troppo tecnici se non necessari.

---

## 12. Fallback e ingressi secondari

La Nuova Rosa non deve dipendere da un solo ingresso.

## 12.1 Ingressi da mantenere

- scelta da catalogo;
- inserimento manuale;
- upload foto giocatore;
- import starter pack;
- gestione riserva gia esistente.

## 12.2 Regola di priorita

Nuovo ordine di priorita UX:

1. scelta da catalogo
2. scegli da rosa/riserve
3. manuale
4. upload foto

I flussi legacy non devono sparire, ma devono diventare fallback, non ingresso primario.

---

## 13. Comportamenti del dominio da mantenere

## 13.1 Duplicati

La nuova pagina deve mantenere la logica di controllo duplicati gia presente:

- duplicato tra titolari;
- duplicato tra riserve;
- sostituzione coerente;
- conferma esplicita;
- delete della copia incoerente se necessario.

## 13.2 Posizioni originali

Il dominio `original_positions` va mantenuto:

- per warning fuori ruolo;
- per edit competenze;
- per personalizzazioni successive;
- per eventuale compatibilita col dettaglio giocatore.

## 13.3 Booster e completezza

Va mantenuta la distinzione tra:

- carta base salvata;
- skill / stats presenti;
- booster presenti;
- stato `photo_slots`;
- stato di completezza profilo giocatore.

## 13.4 Side effects obbligatori

Dopo i salvataggi che toccano rosa o formazione:

- trigger di refresh diagnostico;
- trigger `knowledge-should-refresh`;
- coerenza con AI Knowledge e sezioni derivate.

---

## 14. Responsive Design Enterprise

La Nuova Rosa deve essere responsive come requisito di primo livello, non come adattamento finale.

## 14.1 Mobile first

Su mobile la pagina deve:

- caricare rapidamente;
- evitare modal ingestibili;
- rendere i click sugli slot chiari;
- usare bottom sheet o full-screen sheet per picker e dettagli;
- evitare card minuscole o testo fitto;
- mantenere CTA primarie sempre leggibili.

## 14.2 Tablet

Su tablet:

- campo e bench devono convivere bene;
- modali e pannelli devono evitare sovrapposizioni ingestibili;
- il picker puo passare a layout 2 colonne.

## 14.3 Desktop

Su desktop:

- campo, bench e intelligence possono convivere nella stessa schermata;
- il picker puo usare griglia piu ampia;
- edit e dettagli possono vivere come side panel o modal piu largo.

## 14.4 Requisiti minimi responsive

- nessuna CTA primaria fuori viewport;
- nessun modal non scrollabile;
- nessun testo chiave troncato in modo ambiguo;
- nessuna card selezionabile troppo piccola;
- nessuna dipendenza da hover per azioni essenziali;
- compatibilita con campo compatto mobile.

---

## 15. Bilinguismo Enterprise

La Nuova Rosa deve nascere bilingue nativamente.

## 15.1 Lingue obbligatorie

- Italiano
- Inglese

## 15.2 Regola di implementazione

Nessuna stringa hardcoded nuova deve entrare nella pagina.

Devono essere localizzati:

- titoli;
- CTA;
- warning fuori ruolo;
- livelli di rischio;
- empty state;
- messaggi duplicati;
- copy starter pack;
- microcopy picker;
- messaggi di completamento;
- messaggi errore e fallback.

## 15.3 Requisiti UX bilingue

- la versione EN non deve essere una traduzione compressa male;
- i titoli devono restare brevi;
- le CTA devono stare nei layout mobile;
- le frasi di warning devono essere chiare e non ridondanti.

---

## 16. Supabase - Tabelle da collegare

## 16.1 Tabelle core obbligatorie

### `players`

Ruolo:

- fonte operativa personale della rosa utente.

Uso nella Nuova Rosa:

- insert record giocatore scelto;
- update giocatore;
- assign slot;
- remove da slot;
- delete;
- gestione boosters, positions, metadata utente.

### `formation_layout`

Ruolo:

- modulo e coordinate slot.

Uso nella Nuova Rosa:

- render campo;
- salvataggio layout;
- lettura posizioni;
- assegnazione coerente per modulo.

### `team_tactical_settings`

Ruolo:

- stile squadra e istruzioni individuali.

Uso nella Nuova Rosa:

- stato setup;
- pannello tattico;
- readiness `system_ready`;
- future insight.

### `coaches`

Ruolo:

- coach attivo e competenze.

Uso nella Nuova Rosa:

- readiness sistema;
- suggerimenti futuri;
- link con advisor/coach.

### `playing_styles`

Ruolo:

- lookup style name / style id.

Uso nella Nuova Rosa:

- mapping player data;
- display e salvataggio coerente in `players`.

## 16.2 Tabelle catalogo obbligatorie

### `player_catalog`

Ruolo:

- catalogo carte sorgente per scelta visiva e precompilazione.

Uso nella Nuova Rosa:

- picker giocatori;
- ricerca;
- filtri;
- prefill dati tecnici;
- deduzione variante carta;
- suggerimenti per slot;
- eventuale qualità dati.

Campi chiave da sfruttare:

- `source`
- `source_player_id`
- `card_type`
- `player_name`
- `position`
- `overall_level_1`
- `overall_max_level`
- `playing_style`
- `player_skills`
- `base_stats`
- `max_stats`
- `position_compatibility`
- `source_card_front_url`
- `pack_name`
- `card_category`
- `catalog_ready`
- `needs_review`
- `data_quality`
- `completeness_score`
- `card_instance_key`
- `player_identity_id`
- `player_identity_key`

### `player_identities`

Ruolo:

- layer identitario cross-variant.

Uso nella Nuova Rosa:

- utile per evoluzione futura di ricerca, raggruppamento e riconoscimento.

Nota:

- non e ancora popolata in modo esteso, quindi non va usata come unico cardine della V1.

### `player_catalog_meta_targets`

Ruolo:

- tassonomia meta / target.

Uso nella Nuova Rosa:

- opzionale per evoluzione futura di suggerimenti meta e slot suitability.

Nota:

- non deve bloccare la V1.

## 16.3 Tabelle collegate indirettamente

### `user_profiles`

Uso:

- AI Knowledge;
- stato generale utente;
- eventuali indicatori di progressione.

### `user_diagnostic_cache`

Uso:

- refresh diagnostico post salvataggi.

### `user_game_analysis`

Uso:

- opzionale per insight futuri e readiness sistema.

### `team_tactical_patterns`

Uso:

- opzionale per insight futuri e collegamento con coach/analisi.

---

## 17. Contratto dati raccomandato per la Nuova Rosa

La pagina deve lavorare su un contratto unico di dominio, non su dati grezzi dispersi.

## 17.1 Stato aggregato raccomandato

Il loader della pagina deve esporre:

- `players`
- `starters`
- `reserves`
- `layout`
- `activeCoach`
- `tacticalSettings`
- `setupStage`
- `totalPlayers`
- `missingCriticalData`
- `showStarterPackCta`
- `canUseCatalogPicker`
- `readinessForAdvisor`

## 17.2 Contratto card picker raccomandato

Per ogni card del picker servono almeno:

- id carta catalogo
- immagine
- nome
- ruolo
- card type
- overall
- pack
- style
- source
- quality flags
- livello di compatibilita con lo slot

## 17.3 Contratto salvataggio raccomandato

Quando una carta viene scelta, il sistema deve creare o aggiornare `players` con:

- dati visuali e tecnici minimi necessari;
- legame alla carta origine;
- `slot_index` se selezionata da uno slot;
- `original_positions` coerenti;
- eventuale metadata di provenienza.

## 17.4 Contratto edit giocatore raccomandato

Per ogni giocatore salvato la UI deve poter leggere e mostrare:

- identita giocatore;
- variante carta scelta;
- stato completezza;
- posizione slot;
- compatibilita ruoli;
- boosters;
- origine catalogo;
- campi modificati manualmente;
- dati mancanti.

---

## 18. Matching e salvataggio da catalogo

## 18.1 Regola principale

La scelta da catalogo non deve usare solo il nome come identificazione forte.

Ordine raccomandato di affidabilita:

1. `source + source_player_id`
2. `card_instance_key`
3. `player_name + card_type + position`
4. fallback: `normalized_name + position`

## 18.2 Regola di whitelist V1

Per la V1 enterprise, il picker deve preferire:

- `source = 'pesdb'`
- `catalog_ready = true`
- `needs_review = false`

Le altre fonti possono esistere come fallback o staging, ma non devono essere la base primaria del flusso.

## 18.3 Persistenza minima raccomandata in `players`

Quando il giocatore viene salvato, la Nuova Rosa deve mantenere un legame chiaro con la carta sorgente.

Minimo raccomandato a livello di dominio:

- source
- source player id
- card instance key / variante
- metadata origine catalogo

Questo e necessario per:

- debug;
- deduplicazione futura;
- sync migliorativo;
- collegamento con advisor e dettagli carta.

## 18.4 Uso raccomandato di `players_payload`

`player_catalog.players_payload` e gia un ponte importante tra catalogo e rosa.

Va sfruttato come base di creazione del record `players`, perche contiene gia:

- `player_name`
- `position`
- `card_type`
- `team`
- `club_name`
- `nationality`
- `overall_rating`
- `age`
- `role`
- `playing_style`
- `base_stats`
- `skills`
- `com_skills`
- `original_positions`
- `photo_slots`
- `metadata`

Questo riduce attrito e rischio di mapping incoerente.

---

## 19. API e side effects da riusare

## 19.1 API da riusare nella V1

- `GET /api/formation`
- `POST /api/starter-pack/import`
- `POST /api/supabase/save-player`
- `POST /api/supabase/assign-player-to-slot`
- `POST /api/supabase/remove-player-from-slot`
- `DELETE /api/supabase/delete-player`
- `POST /api/supabase/save-formation-layout`
- `POST /api/supabase/save-tactical-settings`
- `GET/PATCH /api/players/[id]`
- `POST /api/refresh-diagnostic`

## 19.2 Side effects da riusare

- `refreshDiagnosticAfterSave`
- `knowledge-should-refresh`
- toasts esistenti o equivalenti coerenti
- controllo sessione e token

---

## 20. Hidden Page Strategy

## 20.1 Decisione

Implementare la Nuova Rosa prima come pagina nascosta.

## 20.2 Vantaggi

- zero rischio immediato sul funnel live;
- test su dati reali;
- confronto diretto con la pagina attuale;
- migrazione futura piu sicura;
- possibilita di rollout graduale.

## 20.3 Regola operativa

La pagina nascosta deve essere:

- reale;
- compatibile;
- pronta a diventare pagina principale;
- non una demo separata dal dominio.

---

## 21. Piano di rilascio raccomandato

## Fase 0 - Documento e perimetro

- allineare naming;
- definire route lab;
- definire contratto loader;
- definire scope V1.

## Fase 1 - Lab MVP production-safe

- campo e stato setup;
- picker da catalogo;
- salvataggio in `players`;
- assign slot;
- riserve;
- delete / remove;
- starter pack;
- duplicate warning;
- fuori ruolo warning;
- refresh diagnostico.

## Fase 2 - Hardening

- fallback manuale e upload ben integrati;
- editing posizioni e boosters;
- pannello `Roster Intelligence`;
- miglioramenti responsive;
- rifinitura i18n.

## Fase 3 - Confronto e validazione

- uso interno;
- test con utenti selezionati;
- confronto con pagina legacy;
- correzione edge case.

## Fase 4 - Migrazione

Opzioni:

1. feature flag
2. swap route progressivo
3. sostituzione completa del path legacy

Raccomandazione:

- prima feature flag o accesso controllato;
- poi switch graduale;
- solo dopo deprecazione del vecchio monolite.

---

## 22. Criteri di accettazione enterprise

La Nuova Rosa e corretta se:

- un utente riesce ad aggiungere un giocatore da catalogo in pochi passaggi;
- la pagina non rompe nessuna capability critica del dominio attuale;
- i side effects post-save restano coerenti;
- il cliente puo scegliere anche un giocatore fuori ruolo;
- il sistema avvisa, ma non blocca in modo rigido;
- il cliente puo correggere o editare dopo il salvataggio;
- la UI e leggibile e usabile su mobile, tablet e desktop;
- la UI e completa in italiano e inglese;
- il catalogo accelera il caricamento senza sostituire la logica utente in `players`;
- la pagina nascosta e pronta a diventare pagina principale senza rifare il dominio.

Ulteriori criteri UX:

- il picker carte e percepito come esperienza premium e non come select amministrativa;
- l editing rapido del giocatore e accessibile e non dispersivo;
- il cliente capisce sempre se sta scegliendo, modificando o confermando un rischio;
- la pagina mantiene la qualita percepita del pattern visivo di `card-advisor-lab`.

---

## 23. Checklist operativa

## 23.1 Da preservare obbligatoriamente

- dominio `players` / `formation_layout` / `team_tactical_settings` / `coaches`
- starter pack
- duplicate management
- out-of-role warnings
- `original_positions`
- `photo_slots`
- boosters
- diagnostic refresh
- `knowledge-should-refresh`
- tattiche
- layout save
- delete / remove / assign

## 23.2 Da migliorare nella Nuova Rosa

- ingresso principale giocatori;
- picker da catalogo;
- editing rapido giocatore;
- valore mostrato prima del setup completo;
- gerarchia CTA;
- uso mobile;
- chiarezza del flusso;
- mapping progressivo dello stato setup;
- qualita visuale card-based.

## 23.3 Da poter rimandare solo se accessibile come fallback

- parte piu avanzata di upload guidato;
- raffinamenti visual secondari;
- evoluzioni meta-target avanzate;
- ricerca basata pienamente su identity layer.

---

## 24. Decisione finale raccomandata

Procedere con **Nuova Rosa** come:

1. pagina nascosta;
2. UX nuova centrata su catalogo e progressione;
3. compatibile con il dominio reale attuale;
4. production-safe;
5. responsive;
6. bilingue;
7. pronta a migrazione futura.

La priorita non e "spezzare il file lungo".

La priorita enterprise e:

- costruire un nuovo ingresso piu forte;
- preservare il dominio che gia funziona;
- testare su dati reali;
- migrare solo quando il nuovo flusso ha dimostrato di essere migliore.

---

## 25. Riferimenti

- `app/gestione-formazione/page.jsx`
- `app/api/formation/route.js`
- `app/api/starter-pack/import/route.js`
- `app/card-advisor-lab/page.jsx`
- `app/api/card-advisor-lab/evaluate/route.js`
- `docs/PLAYER_CATALOG_IMPORT.md`
- `scripts/efootballhub_bigtime_batch1.json`
- `scripts/import_efootballhub_catalog.py`
- `scripts/parse_efootballhub_player.py`
- `docs/CARD_ADVISOR_AUDIT_ENTERPRISE.md`
- `docs/TODO_GESTIONE_ROSA.md`
- `docs/ONBOARDING_FORMAZIONE_TEST.md`
- `docs/FLUSSI.md`
- `docs/FLUSSI_LOGICA_SUPABASE.md`
- `docs/AUDIT_COERENZA_ENTERPRISE.md`
