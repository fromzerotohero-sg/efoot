# Gestione Rosa - Audit Enterprise

**Data:** 2026-05-08  
**Obiettivo:** fissare una mappa completa e production-safe di `app/gestione-formazione/page.jsx`, delle API collegate e delle logiche da preservare nella transizione verso `Nuova Rosa`.

---

## 1. Executive Summary

`gestione-formazione` oggi non e una semplice pagina frontend.

E un monolite operativo che contiene:

- logiche di caricamento dati;
- orchestrazione stato utente;
- regole di dominio della rosa;
- regole di assegnazione slot;
- gestione duplicati;
- gestione upload e manuale;
- salvataggi tattici e layout;
- side effects cross-sistema.

Il problema principale non e che la pagina "non funziona".

Il problema principale e che:

- il file concentra troppe responsabilita;
- il funnel di ingresso rosa e troppo pesante;
- diverse regole sono duplicate tra UI e API;
- alcune semantiche di dominio sono miste e fragile;
- ogni refactor diretto sulla pagina live aumenta il rischio di regressioni.

Conclusione enterprise:

**`gestione-formazione` va trattata come fonte di verita funzionale da auditare ed estrarre, non come pagina da semplificare superficialmente.**

---

## 2. Perimetro auditato

## 2.1 Frontend principale

- `app/gestione-formazione/page.jsx`

## 2.2 Componenti collegati

- `components/TacticalSettingsPanel.jsx`
- `components/RosaTutorialModal.jsx`
- `components/OnboardingFormation.jsx`
- `components/PositionSelectionModal.jsx`
- `components/MissingDataModal.jsx`
- `components/ConfirmModal.jsx`
- `components/ManualPlayerModal.jsx`
- `components/ManualBoostersModal.jsx`

## 2.3 API collegate principali

- `app/api/formation/route.js`
- `app/api/starter-pack/import/route.js`
- `app/api/supabase/save-player/route.js`
- `app/api/supabase/assign-player-to-slot/route.js`
- `app/api/supabase/remove-player-from-slot/route.js`
- `app/api/supabase/delete-player/route.js`
- `app/api/supabase/save-formation-layout/route.js`
- `app/api/supabase/save-tactical-settings/route.js`
- `app/api/players/[id]/route.js`
- `app/api/refresh-diagnostic/route.js`

---

## 3. Ruolo reale della pagina

La pagina `gestione-formazione` oggi copre contemporaneamente:

1. **Empty state / onboarding**
2. **Workspace campo e formazione**
3. **Lista riserve**
4. **Upload giocatore da immagini**
5. **Inserimento manuale**
6. **Editing competenze**
7. **Editing boosters**
8. **Gestione duplicati**
9. **Gestione modulo**
10. **Gestione posizioni custom**
11. **Gestione tattiche**
12. **Starter pack**
13. **Aggiornamento AI Knowledge / diagnostic side effects**

Questa ampiezza funzionale spiega sia la forza del file, sia il suo debito strutturale.

---

## 4. AS-IS architetturale

## 4.1 Strati oggi presenti nello stesso file

Nel file convivono nello stesso livello:

- auth/token handling;
- fetch iniziale;
- normalizzazione dati;
- utility geometriche del campo;
- toasts e modali;
- orchestrazione UX;
- regole di business;
- handler di salvataggio;
- componenti secondari di rendering;
- markup pagina finale.

## 4.2 Effetto sul sistema

Questo produce:

- forte accoppiamento;
- costo alto di manutenzione;
- difficile testabilita logica;
- rischio regressioni su modifiche piccole;
- difficolta di introdurre una UX nuova senza toccare logiche mature.

---

## 5. Mappa funzionale del monolite

## 5.1 Caricamento iniziale

`fetchData()`:

- recupera token utente;
- chiama `/api/formation`;
- riceve layout, playing styles, players, coach attivo e tactical settings;
- mappa i dati player;
- separa `titolari` e `riserve`;
- prepara lookup stile;
- imposta stato pagina;
- lancia `knowledge-should-refresh`.

### Valutazione

Punto forte:

- caricamento aggregato efficiente e unico.

Problema:

- fetch, mapping e side effects sono troppo uniti.

## 5.2 Gestione starter pack

La pagina mostra una CTA starter pack quando:

- non e in edit mode;
- non e stata dismissata;
- il totale giocatori e `<= 5`.

Import:

- usa `/api/starter-pack/import`;
- supporta `starter_full` e `starter_fill_missing`;
- ricarica dati;
- aggiorna diagnostic;
- aggiorna knowledge refresh event.

### Valutazione

Punto forte:

- regola onboarding buona e gia validata.

Problema:

- resta inglobata in una UX generale ancora pesante.

## 5.3 Assegnazione giocatore a slot

Flusso:

- selezione slot;
- apertura `AssignModal`;
- scelta da riserva, upload o manuale;
- controllo duplicati;
- warning fuori ruolo;
- chiamata `/api/supabase/assign-player-to-slot`;
- refetch completo;
- refresh diagnostico.

### Valutazione

Punto forte:

- flusso protetto e abbastanza robusto.

Problema:

- troppe responsabilita nell handler UI;
- dipendenza da refetch totale.

## 5.4 Salvataggio giocatore da upload

Flusso:

- raccolta immagini;
- chiamate a `/api/extract-player`;
- merge dei risultati;
- rilevamento dati mancanti;
- eventuale `PositionSelectionModal`;
- chiamata a `/api/supabase/save-player`.

### Valutazione

Punto forte:

- supporta dati parziali e merge progressivo.

Problema:

- come primo ingresso UX e troppo pesante;
- la pagina si porta addosso tutta la complessita del percorso.

## 5.5 Inserimento manuale

Esiste tramite `ManualPlayerModal`.

### Valutazione

Punto forte:

- fallback importante e da preservare.

Problema:

- oggi e ancora uno dei percorsi principali, mentre dovrebbe diventare fallback di secondo livello.

## 5.6 Gestione modulo e posizioni

Comportamenti:

- scelta modulo;
- salvataggio layout;
- preservazione slot nei cambi modulo;
- edit posizioni custom;
- calcolo ruolo da coordinate;
- clamp specifico portiere.

### Valutazione

Punto forte:

- dominio campo / layout molto ricco.

Problema:

- forte accoppiamento tra coordinate, ruolo slot e mutazione posizione player.

## 5.7 Gestione tattiche

Tramite `TacticalSettingsPanel` e `/api/supabase/save-tactical-settings`.

### Valutazione

Punto forte:

- il sistema lega gia rosa e tattica.

Problema:

- la pagina principale diventa ancora piu carica come responsabilita.

## 5.8 Gestione boosters e completezza

Comportamenti:

- apertura modal boosters;
- salvataggio booster su player;
- merge su `photo_slots`;
- indicatore di completezza profilo giocatore.

### Valutazione

Punto forte:

- buona profondita di dominio.

Problema:

- il flusso e utile ma disperso dentro un contenitore troppo grande.

---

## 6. Punti forti da preservare obbligatoriamente

## 6.1 Dominio reale gia maturo

La pagina gia sa gestire:

- titolari;
- riserve;
- slot 0-10;
- limiti riserve;
- competenze;
- boosters;
- dati incompleti;
- starter pack;
- tattiche;
- coach linkage indiretto;
- side effects AI Knowledge e diagnostic.

## 6.2 Pattern prodotto corretti

Da preservare:

- warning invece di blocchi rigidi nei casi fuori ruolo;
- conferma esplicita su casi sensibili;
- merge dati screenshot su player esistente;
- gestione duplicati con protezione lato UI e API;
- starter pack come scorciatoia controllata;
- side effects non bloccanti.

## 6.3 Pattern tecnici corretti

Da preservare:

- `/api/formation` come loader aggregato;
- API separate per save / assign / remove / delete;
- update AI Knowledge asincrono lato API;
- controllo auth e rate limit;
- supporto utenti Metalgate.

---

## 7. Criticita enterprise

## 7.1 Criticita 1 - Monolite orchestration-heavy

`gestione-formazione` non e troppo grande solo per numero di righe.

E troppo grande perche contiene:

- stato pagina;
- logica dominio;
- logica rete;
- logica UX;
- componenti secondari.

### Effetto

- alto costo cognitivo;
- difficile isolare bug;
- difficile estrarre una hidden page pulita direttamente dal file.

## 7.2 Criticita 2 - Semantica ambigua di `players.position`

Questo e il problema strutturale piu importante.

Oggi `players.position` viene usato talvolta come:

- posizione naturale del giocatore

e talvolta come:

- posizione di slot / schieramento attuale.

Evidenze:

- `assign-player-to-slot` aggiorna `position` con la posizione dello slot;
- `remove-player-from-slot` resetta `position` alla posizione originale;
- `save-formation-layout` sincronizza `position` dei titolari con i nuovi ruoli slot.

### Effetto

- confusione di dominio;
- rischio incoerenza su edit;
- warning fuori ruolo meno affidabili;
- difficolta nel collegare bene catalogo e rosa;
- difficolta nel distinguere dato anagrafico vs dato di schieramento.

### Decisione raccomandata

Nella `Nuova Rosa` questa ambiguita deve essere trattata come vincolo critico e resa esplicita.

## 7.3 Criticita 3 - Duplicazione logica duplicati

I controlli duplicati sono presenti:

- nel frontend;
- in `save-player`;
- in `assign-player-to-slot`;
- in `remove-player-from-slot`.

### Effetto

- protezione alta;
- ma rischio divergenza futura.

### Decisione raccomandata

Preservare la logica, ma centralizzarne la responsabilita nella nuova architettura.

## 7.4 Criticita 4 - UX ingresso troppo costosa

Gli ingressi principali oggi sono:

- upload foto;
- inserimento manuale;
- scelta da riserve.

Manca un ingresso forte basato su:

- catalogo;
- immagine;
- scelta rapida;
- salvataggio diretto.

### Effetto

- imbuto nel caricamento rosa;
- percezione di lavoro prima del valore.

## 7.5 Criticita 5 - Refetch totale troppo frequente

Molti handler fanno:

- write API;
- `fetchData()`;
- `refreshDiagnosticAfterSave()`.

### Effetto

- UX piu lenta del necessario;
- carico cognitivo piu alto;
- orchestrazione poco granulare.

## 7.6 Criticita 6 - Dominio disperso tra file e API

Le regole buone esistono, ma sono sparse tra:

- pagina;
- API;
- modal;
- componenti;
- helper.

### Effetto

- difficile sapere dove si trova la fonte di verita per una regola.

---

## 8. API audit

## 8.1 `/api/supabase/save-player`

### Cosa fa bene

- valida auth;
- valida input base;
- risolve `playing_style_id`;
- costruisce record player strutturato;
- supporta merge su slot gia occupato;
- mergea `photo_slots`, stats, skills, boosters, metadata;
- evita downgrade overall in alcuni casi;
- aggiorna AI Knowledge async.

### Criticita

- endpoint pensato soprattutto per screenshot/manuale;
- semantica catalog-first non nativa;
- contiene parte della logica duplicati;
- contribuisce alla semantica mista di `position`.

### Decisione

Riutilizzabile in V1, ma con payload ben disciplinato.

## 8.2 `/api/supabase/assign-player-to-slot`

### Cosa fa bene

- valida slot;
- controlla esistenza player;
- gestisce duplicati in campo e riserve;
- libera slot target;
- assegna player al nuovo slot;
- aggiorna AI Knowledge async.

### Criticita

- muta `position` sul player in base allo slot;
- unisce assegnazione e mutazione semantica del ruolo;
- contribuisce alla sovrapposizione tra dato di card e dato di schieramento.

### Decisione

Riutilizzabile, ma da considerare API di transizione e non modello ideale finale.

## 8.3 `/api/supabase/remove-player-from-slot`

### Cosa fa bene

- rispetta limite riserve;
- controlla duplicati riserve;
- resetta slot a `null`;
- ripristina posizione originale;
- aggiorna AI Knowledge async.

### Criticita

- conferma indiretta del problema semantico su `position`.

## 8.4 `/api/supabase/save-formation-layout`

### Cosa fa bene

- salva layout con upsert;
- preserva slot in certe transizioni;
- completa slot mancanti;
- valida dimensioni;
- aggiorna posizione giocatori titolari in base ai ruoli slot;
- aggiorna AI Knowledge async.

### Criticita

- rafforza l accoppiamento layout <-> `players.position`;
- la pagina dipende da questo comportamento.

---

## 9. UX audit

## 9.1 Cosa oggi comunica bene

- il campo e centrale;
- la rosa e percepita come spazio operativo;
- esistono tutorial e onboarding;
- esiste starter pack;
- esistono conferme coerenti.

## 9.2 Cosa oggi comunica male

- il primo passo e troppo faticoso;
- la pagina sembra chiedere setup prima di restituire valore;
- le azioni principali non hanno una gerarchia forte;
- il flusso non e abbastanza card-based e visivo;
- la scelta giocatore non e ancora una esperienza bella.

## 9.3 Giudizio UX

La pagina e forte come strumento per utenti gia dentro il sistema, ma debole come funnel di ingresso.

---

## 10. Responsive audit

Esistono gia segnali positivi:

- modal dedicate;
- gestione `isCompactFieldMobile`;
- attenzione specifica al campo mobile.

Ma il monolite non nasce da una composizione mobile-first pulita.

### Rischi attuali

- troppe modali e transizioni;
- flussi lunghi da mobile;
- rischio sovrapposizione concettuale tra assign, upload, manuale, edit.

### Decisione

La `Nuova Rosa` deve nascere con:

- picker full-screen o bottom sheet;
- quick edit panel chiaro;
- hero semplice;
- riduzione delle decisioni simultanee.

---

## 11. Bilinguismo audit

La pagina e gia dentro l ecosistema i18n del progetto.

### Punto forte

- molte stringhe passano da `t()`;
- modali e copy principali sono gia strutturati.

### Rischio

- la complessita dei flussi aumenta il numero di microcopy da mantenere;
- nel nuovo sistema bisogna evitare regressioni e nuove stringhe hardcoded.

### Decisione

La Nuova Rosa deve nascere con i18n completo fin da subito.

---

## 12. Impatto su Nuova Rosa

## 12.1 Cosa va riusato

- `/api/formation`
- `save-player`
- `assign-player-to-slot`
- `remove-player-from-slot`
- `delete-player`
- `save-formation-layout`
- `save-tactical-settings`
- starter pack
- quick refresh side effects
- duplicate and confirm patterns

## 12.2 Cosa va estratto, non copiato

- `fetchData()` e mapping stato;
- build duplicate guidance;
- warning fuori ruolo;
- side effects post-save;
- gestione token / sessione;
- regole quick edit.

## 12.3 Cosa non va portato come ingresso primario

- upload foto come primo percorso;
- assign modal come hub principale di tutte le scelte;
- orchestrazione unica nella pagina;
- refetch totale come unica strategia di sincronizzazione percepita.

---

## 13. Decisioni raccomandate

## 13.1 Decisione principale

Non rifattorizzare direttamente `gestione-formazione` come primo step.

## 13.2 Decisione di estrazione

Usare il monolite come:

- checklist funzionale;
- fonte di verita del dominio;
- catalogo dei side effects critici.

## 13.3 Decisione di prodotto

Costruire `Nuova Rosa` come:

- nuova orchestrazione;
- nuova UX;
- stessi dati reali;
- compatibilita col dominio esistente.

## 13.4 Decisione tecnica

Nel lavoro sulla `Nuova Rosa`, marcare esplicitamente come **vincolo critico** il problema:

- `players.position` = dato naturale vs dato di schieramento.

Questo punto deve essere tracciato in ogni decisione implementativa.

---

## 14. Checklist di preservazione

Nella migrazione alla `Nuova Rosa` non devono essere persi:

- caricamento aggregato rosa;
- starter pack;
- split titolari / riserve;
- assegnazione slot;
- rimozione slot;
- delete player;
- gestione duplicati;
- warning fuori ruolo;
- `original_positions`;
- `photo_slots`;
- boosters;
- tattiche;
- layout;
- refresh diagnostic;
- `knowledge-should-refresh`;
- supporto manuale;
- supporto upload;
- supporto modale conferma.

---

## 15. Giudizio finale

`gestione-formazione` oggi e:

- **forte come dominio**
- **debole come funnel**
- **utile come fonte di verita**
- **costosa come base diretta di evoluzione**

La valutazione enterprise finale e:

**non distruggere il monolite, non ignorarlo, non rifinirlo cosmeticamente. Estrarne il dominio e usarlo come base di migrazione verso una nuova esperienza nascosta e più forte.**

---

## 16. Riferimenti

- `app/gestione-formazione/page.jsx`
- `app/api/formation/route.js`
- `app/api/starter-pack/import/route.js`
- `app/api/supabase/save-player/route.js`
- `app/api/supabase/assign-player-to-slot/route.js`
- `app/api/supabase/remove-player-from-slot/route.js`
- `app/api/supabase/delete-player/route.js`
- `app/api/supabase/save-formation-layout/route.js`
- `app/api/supabase/save-tactical-settings/route.js`
- `docs/NUOVA_ROSA_ENTERPRISE.md`
- `docs/NUOVA_ROSA_IMPLEMENTAZIONE_V1.md`
- `docs/TODO_GESTIONE_ROSA.md`
- `docs/ONBOARDING_FORMAZIONE_TEST.md`
