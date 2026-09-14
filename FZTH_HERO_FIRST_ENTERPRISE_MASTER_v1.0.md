# FROM ZERO TO HERO — HERO-FIRST EXPERIENCE
## Enterprise Product, AI, Security & Swarm Operating Specification

**Versione:** 1.0  
**Data:** 11 settembre 2026  
**Prodotto:** From Zero To Hero — eFootball AI Coach  
**Stato:** Specifica proposta per il refactoring del prodotto già in produzione  
**Obiettivo:** rifondare l’esperienza utente senza rifondare il motore produttivo  
**Destinatario operativo:** Kimi Swarm + owner + validator  

> **NORTH STAR**  
> Il giocatore non deve imparare From Zero To Hero. È Hero che deve imparare il giocatore, conoscere la sua squadra e guidarlo nel momento giusto con il minimo attrito possibile.

> **VINCOLO DI PRODUZIONE**  
> Il prodotto esiste già, ha utenti e dati reali. Questo documento non autorizza a riscrivere database, autenticazione, wallet, RAG, cataloghi o contratti API. La nuova esperienza deve appoggiarsi alle funzioni e ai dati esistenti, salvo interventi separati, esplicitamente approvati e testati.

---

# 1. Executive summary

From Zero To Hero evolve da piattaforma composta da molte funzioni visibili a **Coach personale eFootball centrato su Hero**.

L’obiettivo non è ridurre la capacità del prodotto. È nascondere la complessità tecnica dietro un’interfaccia estremamente semplice.

Il prodotto target espone principalmente:

- **Hero**, come punto di relazione e orchestrazione;
- **Rosa**, per squadra, formazione, panchina, allenatori e tattica essenziale;
- **Statistiche**, come lettura semplice dell’andamento del giocatore;
- **Profilo**, come account e area “cosa Hero sa di me”;
- **Notifiche**, come canale di richiamo utile, non come feed rumoroso;
- **Card Advisor**, come esperienza specialistica contestuale in cui la singola carta può essere approfondita con il Coach.

Contromisure, Live Coach, analisi partita, memoria, diagnostica, feedback e altre capacità non scompaiono: diventano **capacità di Hero** o strumenti contestuali richiamati quando servono.

La nuova promessa del servizio è:

> **“Hai un Coach personale eFootball. Gli parli, gli mostri ciò che serve, lui conosce la tua squadra, ricorda come giochi e ti guida prima, durante e dopo le partite.”**

---

# 2. Stato di partenza e fonte di verità

## 2.1 Prodotto già in produzione

Il refactoring parte da un prodotto attivo. Non è un greenfield.

Baseline tecnica verificata nello snapshot disponibile:

- Next.js 14 / React 18;
- Supabase;
- MetalGate per identità/crediti;
- OpenAI e motori AI esistenti;
- Vercel;
- RAG operativo basato su `info_rag.md` e `lib/ragHelper.js`;
- Hero Chat;
- Palestra/feedback Coach;
- Live Coach;
- Contromisure;
- Card Advisor;
- Rosa/formazione/allenatori;
- statistiche e match;
- memoria utente e diagnostica;
- Hero Points / tracking crediti.

## 2.2 Autorità delle fonti

Prima di ogni intervento, Kimi Swarm deve rispettare questo ordine:

1. **codice del branch/commit effettivamente deployato o autorizzato**;
2. **schema e dati Supabase reali verificati in sola lettura**;
3. **decisioni owner più recenti**;
4. **questo documento**;
5. **Master UX V2 v1.1 come Preservation Map**;
6. reference grafiche;
7. documentazione storica solo come supporto.

## 2.3 Prerequisito obbligatorio per Kimi Swarm

Kimi Swarm non deve iniziare dal solo documento.

Deve ricevere o poter leggere:

- repository/ZIP aggiornato del codice reale;
- branch autorizzato;
- HEAD SHA di partenza;
- questo Master;
- Master UX V2 v1.1;
- audit di documentazione/codice;
- eventuale accesso read-only ai contratti dati necessari.

**STOP:** se il codice disponibile non coincide con lo stato reale di produzione o non è possibile identificarne commit/branch, nessun refactoring deve partire.

---

# 3. Principi di prodotto non negoziabili

## 3.1 Semplicità fuori, intelligenza dentro

L’utente non deve vedere RAG, diagnostica, pattern, cache, motori, endpoint o moduli tecnici. Deve vedere pochi elementi chiari e ricevere consigli utili.

## 3.2 Hero è il punto di ingresso cognitivo

L’utente esprime un obiettivo in linguaggio naturale. Hero comprende l’intento, usa il contesto disponibile e richiama il motore corretto.

Hero non deve trasformarsi in un menu vocale. Se l’utente dice direttamente cosa vuole, il sistema deve capirlo senza imporre una selezione preventiva.

## 3.3 Hero usa prima ciò che sa già

Se un dato esiste già in Rosa, Profilo, Statistiche, Match, Feedback o memoria, Hero non deve chiederlo di nuovo.

## 3.4 Se non sa, domanda

Quando manca un dato rilevante o esiste una contraddizione, Hero deve chiedere conferma invece di inventare.

## 3.5 Se viene corretto, impara

Una correzione esplicita dell’utente deve poter aggiornare il contesto personale corretto, con consenso quando si tratta di memoria persistente.

## 3.6 L’incertezza è un comportamento corretto

Hero deve distinguere tra:

- fatto verificato;
- preferenza personale;
- dato importato;
- inferenza;
- ipotesi;
- informazione temporanea.

Non deve trasformare una singola frase in una “verità permanente” senza contesto.

## 3.7 La qualità minima di Hero non si degrada artificialmente

I piani commerciali possono limitare quantità, profondità o capacità premium. Non devono rendere volontariamente stupida la risposta di base.

---

# 4. Architettura dell’esperienza target

## 4.1 Shell principale

**Top bar**

- logo reale From Zero To Hero a sinistra;
- notifiche a destra;
- eventuali utility compatte autorizzate, senza trasformare l’header in dashboard.

**Home**

- superficie pulita;
- Hero al centro come azione primaria;
- voce e testo disponibili;
- suggerimenti minimi e dinamici, non menu permanenti;
- una sola informazione/azione realmente utile per stato, se necessario.

**Bottom navigation**

1. Profilo
2. Statistiche
3. Rosa

Hero non deve essere percepito come una quarta tab: è una presenza/azione centrale sempre disponibile.

## 4.2 Rosa

La direzione visuale approvata resta quella di una Rosa semplice e leggibile.

Deve includere:

- formazione e 11 titolari;
- panchina/riserve;
- allenatore attivo chiaramente visibile;
- accesso alla gestione allenatori;
- modulo;
- sintesi tattica essenziale;
- progressive disclosure per capacità avanzate.

Le capacità tecniche già esistenti non vanno eliminate per ottenere una UI più semplice.

## 4.3 Statistiche

La sezione Statistiche resta visuale e consultabile senza dover parlare con Hero.

Scopo:

- mostrare andamento reale;
- rendere leggibili punti forti e problemi;
- mostrare trend, match e progressi realmente disponibili;
- evitare numeri o insight inventati.

Le statistiche alimentano Hero, ma non diventano un’altra chat.

## 4.4 Profilo

La sezione Profilo deve unire due livelli distinti:

- **Account e preferenze**;
- **Cosa Hero sa di me**.

L’utente deve poter capire e correggere le informazioni persistenti realmente utilizzate dal Coach.

## 4.5 Card Advisor

Card Advisor resta una capacità specialistica riconoscibile.

All’interno della carta selezionata è prevista una CTA contestuale dedicata:

**“Chiedi al Coach”**

Questa CTA non va replicata indiscriminatamente nelle altre sezioni.

La conversazione aperta da Card Advisor deve ricevere il contesto della carta corrente e della rosa reale del cliente, permettendo follow-up naturali, per esempio:

- “La metteresti titolare?”
- “Al posto di chi?”
- “E se cambio modulo?”
- “Vale la pena prenderla per come gioco io?”

---

# 5. Hero Experience

## 5.1 Modalità normale

Hero deve accettare:

- voce;
- testo;
- immagini quando richieste;
- follow-up naturali;
- correzioni dell’utente.

Apertura possibile, non obbligatoria:

> “Cosa facciamo oggi?”

Suggerimenti iniziali possono essere contestuali, ad esempio:

- Fammi una domanda
- Prepariamo una partita
- Guidami mentre gioco

Ma l’utente può ignorarli e parlare liberamente.

## 5.2 Conversazione continua

Hero deve mantenere continuità logica nella sessione.

Non deve costringere l’utente a riaprire funzioni separate per passare da:

- preparazione partita;
- contromisure;
- chiarimento;
- Live Coach;
- feedback post-partita.

La percezione deve essere: **sto sempre parlando con il mio Coach**.

## 5.3 Correzione e apprendimento

Esempio:

**Hero:** “Vedo Ronaldo utilizzato come esterno.”  
**Utente:** “Ma cosa dici? Io lo uso punta.”  
**Hero:** “Hai ragione. Correggo il mio contesto: per te Ronaldo va considerato punta. Vuoi che lo ricordi anche per le prossime analisi?”

La correzione deve essere registrata nel livello corretto, non in una memoria generica indistinta.

---

# 6. Immagini e flusso fotografico

## 6.1 Principio

La fotocamera non deve aprirsi automaticamente senza azione dell’utente.

La conversazione Hero deve avere un controllo semplice tipo ChatGPT:

- icona fotocamera/allegato;
- “Scatta foto”;
- “Scegli dalla galleria”.

## 6.2 Richiesta contestuale

Quando Hero necessita di un’immagine, lo dice chiaramente e la UI entra in uno stato di attesa.

Esempio:

> “Stai per giocare? Perfetto. Fammi vedere la formazione dell’avversario.”

La UI mostra l’azione fotografica e resta nello stesso flusso.

Dopo il caricamento:

> “Ottimo, foto ricevuta.”

Hero prosegue senza cambio pagina obbligatorio.

## 6.3 Contromisure

Il flusso target è:

1. utente chiede preparazione partita;
2. Hero richiede la foto dell’avversario;
3. utente scatta/carica;
4. il sistema usa i motori esistenti di estrazione/contromisure;
5. Hero restituisce un consiglio personalizzato sulla rosa reale;
6. l’utente può chiedere “perché?” e approfondire;
7. Hero può proporre continuità Live se utile.

Contromisure non devono necessariamente esistere come pagina primaria nella nuova UX.

---

# 7. Voice Experience — requisito core

La voce è un’interfaccia primaria, non un accessorio.

## 7.1 Requisiti

Hero deve essere:

- naturale;
- riconoscibile;
- rapido;
- interrompibile;
- coerente nel tempo;
- conciso durante il gioco;
- più esplicativo fuori dal Live;
- utilizzabile anche in testo quando l’ambiente non consente voce.

## 7.2 Due comportamenti, una sola identità

**Hero Coach**

- conversazione normale;
- spiegazioni;
- analisi;
- domande;
- memoria;
- gestione del contesto.

**Hero Live**

- stessa voce e personalità;
- frasi brevi;
- priorità operative;
- meno spiegazioni non richieste;
- capacità di interrompere/adattare il consiglio in partita.

L’utente non deve percepire due prodotti diversi.

## 7.3 Portabilità del motore voce

La nuova architettura non deve vincolare l’intero prodotto a un unico provider vocale.

La voce va astratta come capability, mantenendo separati:

- identità Hero;
- memoria;
- diagnosi;
- RAG;
- orchestrazione;
- provider realtime/TTS/STT.

Questo consente di ottimizzare qualità, latenza, costo e scalabilità senza rifare la UX.

---

# 8. Memoria Hero

## 8.1 Obiettivo

Hero deve conoscere progressivamente il cliente senza chiedere continuamente le stesse informazioni.

## 8.2 Tipi di memoria

| Tipo | Esempio | Regola |
|---|---|---|
| Profilo stabile | piattaforma, PA, input delay | persistente con contratto dati corretto |
| Preferenza personale | “uso Ronaldo punta” | persistente se utile e confermata |
| Esperienza partita | “soffro le fasce” | salvabile con evidenza/contesto |
| Correzione | “quel ruolo è sbagliato” | correggere fonte personale corretta |
| Pattern | problema ripetuto su più partite | derivato da evidenze multiple |
| Contesto temporaneo | “oggi sono stanco” | sessione, non memoria permanente |

## 8.3 Regola di consenso

Quando Hero individua una nuova informazione persistente non già presente in una fonte autorevole, deve poter chiedere:

> “Vuoi che lo ricordi?”

La UX deve evitare sia il salvataggio invisibile di tutto sia un popup per ogni frase.

## 8.4 Correzione della memoria

L’utente deve poter:

- correggere;
- cancellare;
- aggiornare;
- vedere ciò che Hero considera stabile.

Le correzioni devono prevalere sulle inferenze precedenti quando sono esplicite e compatibili con i contratti dati.

---

# 9. Living Diagnosis

## 9.1 Evoluzione

La diagnostica non deve essere un report statico che l’utente deve cercare.

Deve diventare il livello interno che aiuta Hero a capire:

- identità di gioco;
- situazione attuale;
- punti forti;
- problemi ricorrenti;
- cosa ha funzionato;
- cosa non ha funzionato;
- qualità/confidenza delle evidenze;
- dati mancanti o vecchi.

## 9.2 Regola anti-bias

Una diagnosi non deve cristallizzarsi.

Se nuove evidenze contraddicono un vecchio pattern, la confidenza deve diminuire o lo stato deve evolvere.

Hero non deve vedere ogni nuova partita attraverso un problema storico non più attuale.

## 9.3 Problema noto da risolvere

Nel sistema corrente la memoria tattica e la diagnosi non sono sempre incorporate in modo uniforme quando la cache diagnostica è stale. Il nuovo Hero non può promettere “ti ricordo sempre” finché questo contratto non è reso affidabile.

---

# 10. Preservation Contract — produzione

## 10.1 Regola generale

**REUSE FIRST → ADAPTER SECOND → REWRITE SOLO CON AUTORIZZAZIONE.**

## 10.2 Sistemi da preservare durante il refactoring UX

Salvo workstream dedicata e approvata, non modificare semanticamente:

- Supabase schema;
- RLS;
- trigger;
- RPC;
- autenticazione MetalGate;
- mapping utenti;
- wallet/crediti/HP;
- prezzi/refund;
- RAG `info_rag.md` e retrieval core;
- cataloghi e pipeline import;
- contratti API esistenti;
- Edge Functions legacy;
- service role e segreti;
- dati di produzione.

## 10.3 Motori esistenti da riutilizzare

Il codice disponibile contiene già, tra gli altri:

- `/api/assistant-chat`;
- `/api/coach-feedback-chat`;
- `/api/save-coach-feedback`;
- `/api/live-coach/*`;
- `/api/generate-countermeasures`;
- `/api/extract-game-analysis`;
- `/api/refresh-diagnostic`;
- Card Advisor evaluate/deep-analysis;
- Rosa/formazione/allenatori;
- profilo utente;
- memoria/feedback;
- statistiche e pattern;
- RAG eFootball.

La nuova esperienza deve orchestrare queste capacità prima di proporne la sostituzione.

---

# 11. Security by design

La sicurezza è requisito di rilascio, non controllo finale.

## 11.1 Regole

- nessun segreto AI, service role o chiave interna nel client;
- ogni azione persistente deve rispettare identità e ownership reali;
- Hero non modifica dati sensibili solo perché il modello “ha deciso” di farlo;
- azioni su profilo/memoria devono passare da contratti autorizzati;
- input immagine/testo è contenuto non fidato e non deve poter sovrascrivere istruzioni di sistema;
- sanitizzazione e validazione di payload/azioni;
- audit trail per operazioni AI che cambiano dati persistenti;
- rate limiting per endpoint costosi o abusabili;
- gestione esplicita di sessione scaduta e permessi;
- nessun test distruttivo su utenti reali.

## 11.2 Workstream sicurezza separata

Gli audit esistenti hanno già evidenziato finding P0/P1 su RLS, RPC `SECURITY DEFINER`, esposizioni potenziali e funzioni legacy.

Questi finding non devono essere “sistemati al volo” dentro il redesign. Devono avere una workstream sicurezza dedicata, con mappa chiamanti, test e rollback.

---

# 12. Performance e percezione di velocità

## 12.1 Principio

Hero deve sembrare immediato anche quando usa più motori sotto la superficie.

## 12.2 Target di prodotto proposti

- apertura Home e Rosa: interazione immediata, skeleton solo dove necessario;
- invio testo: feedback visivo istantaneo;
- voce: riconoscimento e segnale di ascolto immediati;
- prima risposta vocale: target operativo il più vicino possibile a 1 secondo e comunque senza pause percepite come “blocco”;
- foto: conferma ricezione immediata, analisi asincrona con stato chiaro;
- nessun caricamento della memoria completa se non serve;
- contesto AI compatto e selettivo;
- streaming delle risposte dove utile.

Questi sono acceptance target da misurare, non promesse commerciali finché non validati.

## 12.3 Regola di costo/performance

Non inviare a ogni turno:

- tutta la rosa completa in forma verbosa;
- tutto lo storico partite;
- tutto il RAG;
- tutta la memoria;
- tutta la diagnosi.

Usare solo il contesto necessario alla decisione corrente.

---

# 13. Scalabilità

## 13.1 Obiettivo

L’architettura deve poter crescere di un ordine di grandezza rispetto alla base attuale senza riprogettare il prodotto.

## 13.2 Principi

- separare sessione realtime da memoria persistente;
- nessuna API key diversa per ogni cliente;
- credenziali provider solo lato server o tramite token temporanei autorizzati;
- monitorare concurrency reale, non solo utenti registrati;
- budget per utente/piano;
- code/backpressure per analisi non realtime;
- timeout e fallback controllati;
- caching solo dove non compromette freschezza della memoria;
- telemetria su latenza, errori, token/minuti e costi;
- test di picco prima del rollout massivo.

## 13.3 Scenari di load test raccomandati

Validare almeno:

- 10 sessioni Hero contemporanee;
- 50 sessioni;
- 100 sessioni;
- scenario di crescita superiore definito prima del rollout finale.

Per ogni scenario misurare voce, richieste AI, DB, immagini e costi, non solo HTTP throughput.

---

# 14. Economia AI e abbonamenti

## 14.1 Regola fondamentale

Ogni capability AI deve avere:

- costo misurabile;
- metrica di utilizzo;
- budget mensile per piano;
- fallback previsto;
- soglia di abuso/power usage.

## 14.2 Non degradare deliberatamente la qualità

Un piano economico non deve trasformare Hero in un Coach mediocre.

La differenziazione deve avvenire tramite:

- minuti voce/realtime;
- numero di analisi fotografiche;
- quantità di contromisure avanzate;
- profondità delle analisi premium;
- frequenza/ampiezza dell’aggiornamento diagnostico;
- capacità Live;
- limiti mensili;
- eventuale consumo HP oltre quota.

## 14.3 Architettura dei piani — ipotesi da validare

| Piano | Qualità base Hero | Voce | Foto/Contromisure | Live | Analisi profonde |
|---|---|---|---|---|---|
| Core | buona | quota contenuta | quota contenuta | limitato | selettive |
| Pro | alta | quota ampia | ampia | incluso con limiti | frequenti |
| Elite | alta | priorità/alta quota | alta quota | quota elevata | massima profondità autorizzata |

**Prezzi non fissati in questo documento.** Devono essere determinati con telemetria reale dei costi per utente.

## 14.4 HP come valvola di overage

Gli HP esistenti possono essere valutati come meccanismo di consumo oltre quota, evitando di degradare Hero quando l’utente supera il piano.

Esempio concettuale:

- quota mensile inclusa;
- superata la quota: attendi rinnovo / usa HP / upgrade;
- mai risposta volutamente peggiore per “spingere” l’upgrade.

---

# 15. Notifiche

Le notifiche devono essere poche e utili.

Hero può notificare solo quando esiste un motivo concreto, ad esempio:

- memoria/diagnosi da aggiornare;
- nuova informazione rilevante collegata alla Rosa/Card Advisor;
- azione lasciata incompleta;
- insight realmente utile derivato dai dati disponibili.

Non usare notifiche per riempire la Home o creare engagement artificiale.

---

# 16. Kimi Swarm — Operating Model

## 16.1 Principio

Lo Swarm può parallelizzare **analisi e verifica**. Non deve parallelizzare modifiche concorrenti sugli stessi contratti senza coordinamento.

## 16.2 Ruoli raccomandati

**Agent A — Code & Dependency Mapper**

- mappa route, componenti, eventi, API, side effect;
- non modifica codice.

**Agent B — Data Contract Auditor**

- mappa tabelle, ownership, chiamanti, scritture;
- read-only.

**Agent C — UX Shell / Navigation**

- implementa solo shell autorizzata.

**Agent D — Hero Orchestration / Memory**

- lavora sul contratto Hero e memoria in slice dedicate.

**Agent E — Voice / Multimodal**

- gestisce realtime, foto e continuità conversazionale senza alterare wallet/auth.

**Agent F — Security / Performance Reviewer**

- review indipendente;
- nessun refactor opportunistico.

**Agent G — Regression Validator**

- verifica diff, build, flussi reali e regressioni.

## 16.3 Regola di concorrenza

Se due agenti devono toccare:

- stesso file;
- stessa route;
- stesso contratto DB;
- stessa memoria;
- stessa shell globale;

le scritture devono essere serializzate oppure separate da adapter chiaramente definiti.

## 16.4 Vietato

Kimi Swarm non deve:

- partire da zero ignorando il codice;
- creare un nuovo database parallelo per comodità;
- cambiare auth/MetalGate autonomamente;
- sostituire RAG senza autorizzazione;
- introdurre un secondo wallet;
- cancellare vecchie route solo perché non sono più visibili;
- inventare dati demo presentati come reali;
- modificare main o produzione senza autorizzazione owner.

---

# 17. Roadmap per slice

## S0 — Baseline, freeze e sicurezza operativa

- ottenere codice reale aggiornato;
- verificare branch/HEAD;
- snapshot e rollback;
- mappa dipendenze;
- disabilitare rischi staging già noti;
- nessun cambiamento prodotto.

## S1 — Shell Hero-first

- top bar logo/notifiche;
- bottom nav Profilo / Statistiche / Rosa;
- Home minimale;
- Hero action centrale;
- preservare route/deep link/eventi esistenti.

## S2 — Hero façade

- unificare percezione Hero senza fondere brutalmente motori esistenti;
- testo prima;
- routing interno verso assistant/feedback/azioni esistenti;
- nessuna modifica memoria profonda ancora.

## S3 — Memory Context + Living Diagnosis

- eliminare inconsistenze note tra memoria e cache stale;
- introdurre contratto memoria strutturata;
- correzione utente;
- consenso;
- confidenza/evidenze.

## S4 — Foto + Contromisure dentro Hero

- icona camera/allegato;
- stato “attendo foto”;
- riuso pipeline esistente;
- risposta conversazionale;
- follow-up “perché?”.

## S5 — Voice Realtime

- esperienza voce premium;
- interruption handling;
- latenza;
- continuità sessione;
- fallback testo;
- telemetria costi/minuti.

## S6 — Continuità Contromisure → Live

- Hero porta con sé piano e contesto pertinente;
- nessun “salto prodotto” percepito;
- billing Live preservato.

## S7 — Card Advisor conversazionale

- CTA “Chiedi al Coach” solo nel contesto Card Advisor;
- carta selezionata come context object;
- follow-up naturali;
- motore deep esistente preservato.

## S8 — Profilo / Statistiche / Notifiche

- semplificazione visuale;
- “Cosa Hero sa di me”;
- correzioni controllate;
- notifiche utili.

## S9 — Rosa refinement

- mantenere direzione UI approvata;
- allenatore visibile;
- progressive disclosure;
- nessuna riscrittura dei contratti slot/formazione/catalogo.

## S10 — Security, performance, load & cost gate

- regression completa;
- security review;
- test concorrenza;
- latenza;
- costo per sessione/utente;
- budget per piano;
- rollback testato.

## S11 — Rollout controllato

- cohort test;
- monitoraggio;
- confronto metriche;
- incremento progressivo;
- main/production solo dopo PASS owner + validator.

---

# 18. Acceptance criteria

## 18.1 Prodotto

PASS se:

- l’utente capisce cosa fare senza conoscere le vecchie funzioni;
- Hero è il punto principale ma non blocca accesso a Rosa/Statistiche/Profilo;
- nessuna capacità critica viene persa solo perché non è più una pagina.

## 18.2 Hero

PASS se:

- usa dati esistenti prima di chiedere;
- chiede quando manca informazione importante;
- dichiara incertezza;
- non inventa rosa/statistiche;
- può essere corretto;
- la correzione viene usata successivamente quando autorizzato.

## 18.3 Foto/Contromisure

PASS se:

- la foto può essere scattata o scelta senza uscire dal flusso;
- Hero sa perché ha chiesto l’immagine;
- non serve ri-selezionare manualmente il tipo di analisi quando il contesto è già chiaro;
- il consiglio usa la rosa reale.

## 18.4 Voice

PASS se:

- voce naturale e coerente;
- interrompibile;
- latenza misurata e accettabile;
- stessa identità in Coach e Live;
- fallback testo completo.

## 18.5 Produzione

PASS se:

- nessun contratto dati non autorizzato è cambiato;
- auth, wallet e RAG restano coerenti;
- build passa;
- nessuna regressione critica;
- rollback è possibile;
- staging non altera utenti reali in modo distruttivo.

---

# 19. KPI da misurare

## Esperienza

- tempo alla prima risposta utile;
- tempo alla prima azione completata;
- numero medio di navigazioni prima di ottenere un consiglio;
- percentuale di task completati direttamente tramite Hero;
- utilizzo voce vs testo;
- tasso di follow-up dopo un consiglio;
- tasso di correzione memoria.

## Qualità

- percentuale di risposte che usano correttamente dati reali;
- errori su rosa/ruoli/allenatore;
- richieste ripetute di informazioni già note;
- correzioni che restano coerenti nel tempo;
- feedback positivo/negativo sul consiglio.

## Performance

- latenza voce;
- latenza testo;
- tempo analisi foto;
- error rate;
- timeout rate;
- picco sessioni concorrenti.

## Economia

- costo AI per MAU;
- costo per ora voce;
- costo per contromisura;
- costo medio foto;
- costo power user;
- margine per piano;
- percentuale utenti che superano quota.

---

# 20. Stop conditions obbligatorie

Kimi Swarm deve fermarsi e riportare prima di procedere se:

- il codice di partenza non è verificabile;
- è su `main` quando non autorizzato;
- serve cambiare DB/schema/RLS/RPC/trigger;
- serve cambiare auth/MetalGate;
- serve cambiare wallet/prezzi/HP;
- serve modificare RAG core;
- una nuova UX richiede dati che non esistono;
- una funzione esistente ha side effect non compresi;
- un test richiede scritture distruttive su produzione;
- viene trovato un finding sicurezza P0 correlato alla slice;
- il costo previsto supera il budget del piano senza fallback definito;
- la latenza realtime non rispetta l’esperienza accettabile.

---

# 21. Output obbligatorio di ogni slice

Ogni agente che implementa deve produrre:

1. branch + HEAD iniziale;
2. scope esatto;
3. file modificati;
4. contratti preservati;
5. API/dati/eventi toccati;
6. test eseguiti;
7. performance rilevata;
8. impatto costi AI se applicabile;
9. rischi residui;
10. diff/commit;
11. esito: PASS / PASS CON WARNING / FIX REQUIRED / BLOCKED.

Nessuna descrizione narrativa di Kimi sostituisce la lettura del diff reale.

---

# 22. Decisioni ancora aperte

Da chiudere prima del rollout commerciale definitivo:

- provider/architettura voce definitiva;
- prezzo dei piani;
- quote voce per piano;
- quote foto/contromisure;
- ruolo futuro degli HP come overage;
- regole precise per memoria automatica vs consenso;
- policy notifiche;
- soglia di latenza voice accettabile dopo test reali;
- modalità di migrazione degli utenti esistenti alla nuova shell;
- eventuale naming commerciale della nuova esperienza Hero.

---

# 23. Verdetto esecutivo

Il refactoring è **fattibile** senza ricostruire From Zero To Hero da zero.

La strategia corretta è trasformare Hero nel livello di orchestrazione sopra il motore produttivo esistente, preservando dati, API, RAG, auth, wallet e logiche di dominio già funzionanti.

Il valore del nuovo servizio non deriva dall’aggiungere nuove pagine. Deriva dal rendere invisibile la complessità già costruita e far percepire all’utente un solo rapporto:

> **“Parlo con il mio Coach. Lui conosce me, la mia squadra e il gioco. Se non sa, mi chiede. Se lo correggo, impara. Se sto per giocare, mi prepara. Se voglio, mi segue durante la partita.”**

La metrica guida non è il numero di funzioni visibili, ma la capacità di arrivare al consiglio utile con meno attrito, maggiore memoria, maggiore fiducia e costi sostenibili.

---

# Appendix A — Contratti e rischi noti da ereditare

- `user_profiles` è un hub dati critico e non va banalizzato.
- `user_tactical_feedback` alimenta più motori e deve restare coerente.
- `user_diagnostic_cache` non è una source of truth assoluta.
- Rosa/formazione/slot hanno contratti persistenti da preservare.
- `weekly_goals` / task possono avere side effect anche in lettura.
- Live Coach ha lifecycle e billing specifici.
- Card Advisor deep usa un contesto cliente ricco e non va degradato.
- MetalGate/HP sono infrastruttura economica, non semplice UI.
- la documentazione storica contiene elementi obsoleti e non deve guidare lo Swarm senza verifica.

# Appendix B — Pacchetto da consegnare a Kimi Swarm

1. repository o ZIP aggiornato;
2. branch autorizzato e HEAD SHA;
3. questo file `FZTH_HERO_FIRST_ENTERPRISE_MASTER_v1.0.md`;
4. `FZTH_UX_V2_MASTER_OPERATING_SPECIFICATION_v1.1.md`;
5. `FZTH_AUDIT_DOCUMENTAZIONE_CODICE_v1.md`;
6. eventuali audit sicurezza correnti;
7. reference visuali approvate;
8. accessi read-only necessari per verificare i contratti dati;
9. lista esplicita di aree NON autorizzate alla modifica;
10. account test dedicato per staging.

