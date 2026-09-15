**Versione**: 9.1.0 ENTERPRISE | **Data**: 15 Settembre 2026 | **Lingua**: Italiano
**Fonti**: Konami Version Info v6.0.0, Dream Team ufficiale, news Attack Trigger. Meta competitivo = community, mai legge di gioco.
**Verità canonica runtime**: `lib/efootballTruthLayer.js`

# DATABASE MECCANICHE eFootball ENTERPRISE - RAG System

## OBIETTIVO
Database RAG enterprise per consigli tattici basati su meccaniche ufficiali eFootball v6.0.0 (eFootball 2027).
**Principio fondamentale**: Distinguere sempre **fatti di gioco**, **meta competitiva** e **euristiche FZTH**. Non inventare numeri non ufficiali.

---

## CONTESTO VIDEOGIOCO (FONDAMENTALE)

### Cosa sono i Giocatori in eFootball
I giocatori sono **CARD DIGITALI**. Non sono persone reali: vietato parlare di "esperienza", "carriera", "maturità".
- **Abilità native** della card: fisse
- **Sviluppo**: Progression Points al level-up per alzare stats (Player Progression ufficiale)
- **Skill Training**: massimo **5 Additional Skills**
- **Position Training**: massimo **2** competenze posizione eleggibili; da v6.0.0 la posizione già registrata sulla card è esclusa
- **Stile giocatore**: può essere in attacco, in difesa, o entrambi (v6.0.0)
- In chat FZTH puoi consigliare chi schierare, dove, quali istruzioni, quale schema fluida e se vale la pena spendere Progression/Skill Training **solo se i dati della rosa lo mostrano**. Non inventare slider o skill aggiunte.

### Differenza CARD vs CONFIGURABILE vs SVILUPPO

| ELEMENTO | STATO | DESCRIZIONE |
|----------|-------|-------------|
| **Abilità native** | CARD | Nascita della card, non si cancellano |
| **Abilità aggiuntive** | CONFIGURAZIONE CARD | Si apprendono con Skill Training, max 5; sono distinte dai Progression Points |
| **Stili COM / IA** | CARD | Funambolo, Treno in corsa, Long Ranger, ecc. NON occupano gli slot Additional Skills |
| **Progression Points** | SVILUPPO | Slider stats dopo il level-up; non inventare la distribuzione se assente dai dati |
| **Stili di Gioco Giocatore** | CARD | Attacco e/o difesa; non modificabili dall'utente |
| **Forma Giocatore** | CARD | Incrollabile, Normale, ecc. |
| **Posizioni Originali** | CARD + SVILUPPO | Competenza nativa + max 2 Position Training |
| **Formazione / Formazione fluida** | CONFIGURABILE | Schema in possesso e schema senza palla (v6.0.0) |
| **Stile Squadra** | CONFIGURABILE | 6 voci: Possesso palla, Contropiede veloce, Contrattacco, Passaggio lungo, Vie laterali, Pressing totale |
| **Istruzioni Individuali** | CONFIGURABILE | Difensivo, Ancoraggio, Marcatura stretta, Marcatura uomo, Contropiede. **Offensivo** e **Linea bassa** rimossi in v6.0.0 |
| **Titolari vs Riserve** | CONFIGURABILE | Chi schierare |
| **Collegamento allenatore** | CARD ALLENATORE | 1 o 2 Link-up Plays; = Connection, non lag |

**REGOLA ORO per l'AI**: non inventare sviluppo. Se i dati mostrano Progression/Skill Training, puoi consigliarli. Se mancano, resta su chi schierare, dove, istruzioni e Formazione fluida. Mai percentuali di stamina non ufficiali.

---

## 1. STATISTICHE GIOCATORI

Le descrizioni riflettono le statistiche correnti di eFootball. I nomi inglesi evitano ambiguità tra client e database.

### 1.1 Attacco e tecnica
- **Comportamento offensivo (Attacking Awareness)**: rapidità con cui il giocatore reagisce e si posiziona nelle azioni offensive, inclusi gli scatti alle spalle della difesa.
- **Controllo palla (Ball Control)**: qualità del primo controllo, degli stop e delle finte preparatorie.
- **Dribbling / Vel. dribbling (Dribbling)**: controllo, rapidità e velocità durante la conduzione.
- **Possesso stretto (Tight Possession)**: capacità di girarsi e mantenere il controllo durante il dribbling lento in spazi stretti.
- **Passaggio rasoterra (Low Pass)**: precisione e velocità dei passaggi rasoterra.
- **Passaggio alto (Lofted Pass)**: precisione e velocità dei passaggi alti.
- **Finalizzazione (Finishing)**: precisione di tiro, compresi tiri di prima e conclusioni in equilibrio precario.
- **Colpo di testa (Heading)**: precisione ed efficacia dei colpi di testa in tiro, passaggio e rinvio.
- **Calci da fermo (Set Piece Taking)**: precisione sui calci piazzati, comprese punizioni e rigori.
- **Tiro a giro (Curl)**: quantità di effetto applicabile a tiri, passaggi e calci piazzati.

### 1.2 Difesa
- **Comportamento difensivo (Defensive Awareness)**: rapidità di reazione e posizionamento nelle situazioni difensive.
- **Contrasto (Tackling)**: portata ed efficacia dei contrasti in piedi e in scivolata.
- **Aggressività (Aggression)**: intensità con cui il giocatore pressa e contende il pallone.
- **Coinvolgimento difensivo (Defensive Engagement)**: propensione a partecipare alla difesa e a recuperare rapidamente la posizione.

### 1.3 Attributi fisici
- **Velocità (Speed)**: velocità di corsa; influisce anche sulla conduzione.
- **Accelerazione (Acceleration)**: rapidità nel raggiungere la velocità di punta; influisce anche sulla conduzione.
- **Potenza di tiro (Kicking Power)**: potenza applicabile a tiri, passaggi e calci piazzati.
- **Salto/Elevazione (Jumping)**: capacità di elevazione e contributo ai duelli aerei.
- **Contatto fisico (Physical Contact)**: capacità di resistere alla pressione fisica e proteggere il pallone.
- **Equilibrio (Balance)**: stabilità durante i contatti e nel mantenimento del controllo.
- **Resistenza (Stamina)**: capacità di sostenere lo sforzo durante la partita.

### 1.4 Portieri
- **Comportamento PT (GK Awareness)**: reazione, posizionamento e recupero del portiere.
- **Presa PT (GK Catching)**: capacità di bloccare e trattenere i tiri.
- **Parata PT (GK Parrying)**: capacità di deviare i tiri lontano da zone pericolose.
- **Riflessi PT (GK Reflexes)**: risposta ai tiri ravvicinati e agli uno contro uno.
- **Estensione PT (GK Reach)**: raggio di copertura nelle parate.

### 1.5 Caratteristiche
- **Frequenza piede debole (Weak Foot Usage)**: frequenza con cui viene usato il piede debole.
- **Precisione piede debole (Weak Foot Accuracy)**: precisione di passaggi e tiri col piede debole.
- **Forma (Form)**: variabilità della condizione; “Incrollabile/Unwavering” indica variazioni ridotte.
- **Resistenza infortuni (Injury Resistance)**: resistenza agli infortuni; “Alta” indica infortuni meno frequenti.

### 1.6 Indicazioni di costruzione squadra

Non esistono soglie ufficiali universali per Velocità, Accelerazione o Resistenza. Il valore necessario dipende da ruolo, stile, modulo, avversario, istruzioni e versione della card. Eventuali soglie META devono essere presentate come raccomandazioni community datate, non come fatti di gioco.

La perdita di Resistenza durante la partita può ridurre l'Accelerazione, ma non esiste una soglia pubblica ufficiale che determini quando avviene il calo.

---

## 2. STILI DI GIOCO DELLA CARD

**≠ Stile di gioco di squadra**: Possesso palla, Contropiede veloce, Contrattacco, Vie laterali, Passaggio lungo e Pressing totale sono comportamenti collettivi, non stili individuali della card.

**Da v6.0.0** gli stili individuali sono separati in **Stile di gioco in attacco** e **Stile di gioco in difesa**. Una card può avere uno solo dei due oppure entrambi. Esempio ufficiale Konami: Goal Poacher/Opportunista in attacco e Front Line Pressure in difesa.

La versione v6.0.0 comprende 20 stili offensivi e 13 stili difensivi. Non utilizzare la precedente classificazione unica da 21/22 stili.

### Sigle posizioni IT ↔ EN

| IT | EN | Significato |
|---|---|---|
| P | CF | Prima punta / Centravanti |
| SP | SS | Seconda punta |
| EDA | RWF | Esterno offensivo destro |
| ESA | LWF | Esterno offensivo sinistro |
| TRQ | AMF | Trequartista |
| CC | CMF | Centrocampista centrale |
| CLD | RMF | Esterno di centrocampo destro |
| CLS | LMF | Esterno di centrocampo sinistro |
| MED | DMF | Mediano |
| TD | RB | Terzino destro |
| TS | LB | Terzino sinistro |
| DC | CB | Difensore centrale |
| PT | GK | Portiere |

### Stili di gioco in attacco v6.0

| IT | EN | Posizioni attive |
|---|---|---|
| Opportunista | Goal Poacher | P/CF |
| Senza palla | Dummy Runner | P/CF, SP/SS, TRQ/AMF |
| Rapace d'area | Fox in the Box | P/CF |
| Fulcro di gioco | Target Man | P/CF |
| Specialista di cross | Cross Specialist | EDA/RWF, ESA/LWF, CLD/RMF, CLS/LMF |
| Classico n° 10 | Classic No. 10 | SP/SS, TRQ/AMF |
| Giocatore chiave | Hole Player | SP/SS, TRQ/AMF, CLD/RMF, CLS/LMF, CC/CMF |
| Attaccante di rientro | Deep-Lying Forward | P/CF, SP/SS |
| Regista creativo | Creative Playmaker | SP/SS, TRQ/AMF, EDA/RWF, ESA/LWF, CLD/RMF, CLS/LMF |
| Ala prolifica | Prolific Winger | EDA/RWF, ESA/LWF |
| Taglio al centro | Roaming Flank | EDA/RWF, ESA/LWF, CLD/RMF, CLS/LMF |
| Onnipresente | Box-to-Box | CLD/RMF, CLS/LMF, CC/CMF, MED/DMF |
| Collante | Anchor Man | MED/DMF |
| Tra le linee | Orchestrator | CC/CMF, MED/DMF |
| Sviluppo | Build Up | DC/CB |
| Frontale extra | Extra Frontman | DC/CB |
| Terzino offensivo | Attacking Full-back | TD/RB, TS/LB |
| Terzino difensivo | Defensive Full-back | TD/RB, TS/LB |
| Terzino mattatore | Full-back Finisher | TD/RB, TS/LB |
| Nome IT da verificare nel client | High Line GK | PT/GK |

### Stili di gioco in difesa v6.0

| EN canonico | Posizioni attive |
|---|---|
| Front Line Pressure | CF, SS, RWF, LWF |
| Front Line Poacher | CF, SS, RWF, LWF |
| Attack Outlet | CF, SS, RWF, LWF, AMF |
| All-action Defender | AMF, RMF, LMF, CMF, DMF |
| Pass Disruptor | AMF, RMF, LMF, CMF, DMF |
| Box-to-Box | RMF, LMF, CMF, DMF |
| Anchor Man | DMF |
| The Destroyer | CMF, DMF, RB, LB, CB |
| Covering Role | CMF, DMF, RB, LB, CB |
| High Line Master | RB, LB, CB |
| Attacking GK | GK |
| Defensive GK | GK |
| Sweeper GK | GK |

I nomi italiani dei nuovi stili v6 devono essere copiati dal client italiano corrente. Non presentare traduzioni community o di cataloghi terzi come denominazioni ufficiali.

**Alias**: Tra le linee = Orchestrator; Onnipresente = Box-to-Box. *Adv. Striker / Advanced Striker* è una vecchia localizzazione di Opportunista / Goal Poacher, non uno stile aggiuntivo. *Punta arretrata* è un nome legacy di Attaccante di rientro / Deep-Lying Forward.

### 2.1 Funzionamento

Gli stili offensivi determinano il comportamento del giocatore quando la sua squadra ha il possesso; quelli difensivi operano quando l'avversario ha il pallone. Fare riferimento alle due tabelle precedenti per le posizioni di attivazione.

Nota verificata: **Regista creativo/Creative Playmaker è attivo a SP/SS, TRQ/AMF, EDA/RWF, ESA/LWF, CLD/RMF e CLS/LMF. Non è attivo a CC/CMF.**

Da v6.0, Incontrista/The Destroyer e Portiere offensivo/difensivo appartengono alla categoria difensiva; non devono essere descritti come stili offensivi.

### 2.2 Attivazione stile e posizione

Ogni stile possiede un proprio elenco di posizioni compatibili. Lo stile si attiva quando il giocatore è schierato in una di tali posizioni.

La competenza del giocatore nella posizione e la compatibilità dello stile sono proprietà distinte. Una posizione può essere pienamente competente per la card ma non attivare lo stile: per esempio, un Regista creativo competente a CC/CMF non attiva Creative Playmaker in quella posizione.

Fuori dalle posizioni compatibili, il comportamento specifico dello stile non si attiva, ma il giocatore continua a essere regolato da statistiche, abilità, istruzioni e comportamento generale. Non è documentato alcun “bonus di posizionamento” numerico attribuito all'attivazione dello stile.

### 2.3 Stili di gioco COM/IA

Descrivono le preferenze quando l'IA controlla il giocatore in possesso. Non sono statistiche né Abilità giocatore e non è confermato che modifichino direttamente le azioni eseguite manualmente.

- **Funambolo (Trickster)**: tende a utilizzare finte e dribbling elaborati.
- **Serpentina (Mazing Run)**: tende ad avanzare con cambi di direzione e controllo stretto.
- **Treno in corsa (Speeding Bullet)**: tende ad avanzare rapidamente quando trova spazio.
- **Inserimento (Incisive Run)**: tende ad accentrarsi dalle zone laterali.
- **Esperto palle lunghe (Long Ball Expert)**: tende a tentare passaggi lunghi.
- **Crossatore (Early Crosser)**: tende a effettuare cross anticipati.
- **Tiratore (Long Ranger)**: tende a concludere dalla distanza.

---

## 3. MODULI TATTICI

### 3.1–3.3 Schemi di riferimento

Le sigle come 4-3-3, 4-2-3-1, 3-5-2 e 5-4-1 descrivono soltanto il numero di giocatori nelle linee difesa-centrocampo-attacco, portiere escluso. Non impongono automaticamente ruoli specifici, comportamenti o uno Stile di gioco di squadra.

Schemi comuni utilizzabili come base o disposizione personalizzata:
- **4 difensori**: 4-3-3, 4-2-3-1, 4-4-2, 4-1-2-3, 4-5-1, 4-4-1-1, 4-2-2-2
- **3 difensori**: 3-5-2, 3-4-3, 3-1-4-2, 3-4-1-2
- **5 difensori**: 5-3-2, 5-4-1, 5-2-3

Le descrizioni come “possesso”, “contropiede”, “offensivo” o “difesa solida” sono valutazioni tattiche, non proprietà garantite dal nome dello schema. Il comportamento effettivo dipende da Stile di gioco di squadra, Stili della card, competenza posizione, istruzioni e Formazione fluida.

### 3.4 Limiti dell’editor FZTH — NON regole ufficiali del gioco

Il validatore FZTH applica questi vincoli alle coordinate e ai ruoli salvati:
- **Attacco** (`y < 40`): 1-5 giocatori; massimo 2 P, 1 ESA e 1 EDA.
- **Centrocampo** (`40 ≤ y ≤ 62`): 1-6 giocatori; massimo 1 CLD e 1 CLS.
- **Difesa** (`63 ≤ y ≤ 80`): 2-5 giocatori; massimo 3 DC, 1 TD e 1 TS. Con 3 DC e almeno 4 difensori deve comparire almeno un TD o TS.
- **Portiere**: l’editor richiede esattamente 1 PT.

Questi sono vincoli applicativi di FZTH (`lib/validateFormationLimits.js`), non limiti ufficiali v6 verificati del Game Plan. Non applicarli ai giocatori in panchina: il validatore controlla soltanto gli undici slot dello schema.

### 3.5 Formazione fluida (v6.0.0)

La Formazione fluida permette di configurare una disposizione in attacco e una in difesa. Il gioco passa automaticamente dall’una all’altra in base al possesso; non occorre selezionarle manualmente a ogni transizione.

- La funzione Scelta automatica può compilare entrambe le disposizioni.
- Verificare competenza posizione e Stili di gioco offensivo/difensivo dei giocatori.
- Le distanze di transizione e le combinazioni 4-2-3-1/3-2-4-1 sono considerazioni community, non regole ufficiali.
- **FZTH dispone di un editor a due schemi e salva le varianti attacco/difesa, ma non sincronizza né applica automaticamente tali impostazioni dentro eFootball.**

**[COMMUNITY]** 4-2-3-1 senza palla e 3-2-4-1 in possesso è un punto di partenza diffuso. Per Pressing totale/Overload vengono spesso suggeriti 4-3-3 o 4-2-1-3 con copertura centrale e un’uscita sul lato debole; non è una prescrizione ufficiale.

### 3.6 Concetti di ruolo — NON voci del menu

**Mediano, mezzala, regista basso, ala tagliente e ala pura** possono essere usati come descrizioni calcistiche del compito assegnato. Non presentarli come Stili di gioco o istruzioni selezionabili, salvo che il nome coincida esattamente con una posizione o uno Stile mostrato sulla card.

---

## 4. STILI DI GIOCO DI SQUADRA

Sono distinti dagli Stili di gioco delle card. La v6.0.0 offre sei famiglie ufficiali:
- **Possesso palla** — EN: Possession Game
- **Contropiede veloce** — EN: Quick Counter
- **Contrattacco** — EN: Long Ball Counter
- **Passaggio lungo** — EN: Long Ball
- **Vie laterali** — EN: Out Wide
- **Pressing totale** — EN: Overload; ES: Superioridad

La competenza dell’allenatore nello stile scelto è un attributo ufficiale. Non inventare una soglia minima come meccanica universale.

### 4.1 Differenze operative

- **Possesso palla**: privilegia sostegno e circolazione del pallone.
- **Contropiede veloce / Quick Counter**: transizioni rapide, movimenti verticali e pressione più aggressiva; tende a comportare una linea più alta.
- **Contrattacco / Long Ball Counter**: stile distinto, con blocco generalmente più prudente e ripartenza diretta. Non tradurlo come Quick Counter.
- **Passaggio lungo / Long Ball**: ricerca diretta di un riferimento avanzato per superare il centrocampo e consolidare il possesso nella metà avversaria.
- **Vie laterali / Out Wide**: crea ampiezza e favorisce lo sviluppo sulle fasce.
- **Pressing totale / Overload**: concentra i giocatori sul lato della palla per ottenere superiorità numerica. Favorisce passaggi ravvicinati in possesso; senza palla mantiene una struttura compatta e chiude rapidamente sul portatore. In possesso nella metà avversaria può alzare la linea e applicare pressione alta.

Indicazioni come giocatori consigliati, Resistenza necessaria, lato debole scoperto o modulo ideale sono euristiche community, non effetti garantiti dal menu.

### 4.2 Concetti di gameplay — NON selezionabili come Stile di gioco di squadra

Attacco diretto, Cross e finalizzazione, Attacco centrale, Pressing alto, Difesa bassa, Pressing selettivo, Contenimento difensivo, Costruzione posizionale, Costruzione a triangoli, Gegenpressing, Tiki-taka, Catenaccio, Pressing costante, Esterni alti e Tagli interni possono descrivere comportamenti calcistici, ma non sono ulteriori voci del menu.

“Pressing alto” compare anche nella descrizione ufficiale di Pressing totale, ma resta un comportamento tattico e non un settimo Stile di gioco di squadra.

---

## 5. ISTRUZIONI INDIVIDUALI

Sono disponibili quattro slot: **Attacco 1, Attacco 2, Difesa 1 e Difesa 2**.

### Selezionabili in v6.0.0
Slot Attacco:
- **Difensivo**: limita gli avanzamenti del giocatore quando la squadra attacca.
- **Ancoraggio**: limita gli spostamenti orizzontali fuori dalla zona iniziale.

Slot Difesa:
- **Marcatura stretta**: assegna una maggiore attenzione collettiva a un avversario bersaglio.
- **Marcatura a uomo**: associa un proprio giocatore a uno specifico avversario.
- **Contropiede / Counter Target**: mantiene il giocatore più avanzato, riducendone il ripiegamento e il lavoro di pressione; può conservarne la Resistenza.

Le istruzioni di marcatura dipendono dalla presenza della formazione avversaria e possono essere impostate nel Game Plan prepartita/in partita.

### Rimosse in v6.0.0
- **Offensivo / Attacking**
- **Linea bassa / Deep Line**

Non consigliarle come opzioni correnti. La Formazione fluida può riprodurre alcune trasformazioni strutturali precedentemente ottenute con queste istruzioni, ma è una funzione separata e non una sostituzione identica uno-a-uno.

### Altre impostazioni
- Le frecce modificano il **livello Attacco/Difesa** dell’intera squadra. Non sono uno slider diretto “linea alta/bassa” e non equivalgono alla rimossa Linea bassa.
- In Ruoli partita è possibile scegliere battitori e fino a tre **Giocatori che partecipano all’attacco** sui calci piazzati.
- Alcuni allenatori v6 dispongono di due **Collegamenti**. Ogni Collegamento ha condizioni proprie e coinvolge un **Punto focale** e un **Uomo chiave**; questi sono ruoli di attivazione, non i nomi dei due Collegamenti.

---

## 6. CALCI PIAZZATI

Distinguere:
- **Ruoli partita/Game Plan**: battitori e Giocatori che partecipano all’attacco.
- **Strategie sul calcio piazzato**: menu contestuale selezionato durante la punizione o il corner. FZTH non le configura automaticamente nel gioco.

### Giocatori che partecipano all’attacco

Esistono tre slot numerati. Non presentare come regola ufficiale una corrispondenza fissa “1 = primo palo, 2 = centro, 3 = secondo palo”: è un’osservazione community, non una garanzia documentata da Konami.

### 6.1 Punizioni indirette/crossate — strategie selezionabili
- **Scatto**
- **Sponda al centro**
- **Inserimento e attesa**
- **Palla all’ariete**

Non aggiungere “Equilibrato”. Evitare descrizioni dettagliate delle corse se non verificate direttamente nel client corrente.

### 6.2 Calci d’angolo — strategie normali
- **Scatto**
- **Area piccola**
- **Treno**
- **Palo lontano**

### 6.3 Calci d’angolo corto
- **Linea laterale**
- **Corsa da centrocampo**
- **Due ricevitori**
- **Corsa dal limite area**

“In diagonale”, “Da centrocampo” e la voce generica “Corner corto” non sono nomi corretti aggiuntivi.

### 6.4 Difesa sui calci piazzati/corner
- **Marcatura mista**
- **Marcatura a uomo**
- **Marcatura a zona**

“Palo lontano” non è una strategia difensiva separata: è una strategia offensiva per il corner.

---

## 7. MECCANICHE DI GIOCO AVANZATE

### 7.1 Difesa Manuale (azioni: SOLO cosa fare)
**Nota**: qui descriviamo SOLO **azioni** e principi. **Mai** tasti/pulsanti/controller.

**Testa a Testa**: Segui l’avversario a passetti (senza buttarti), resta in traiettoria tra lui e la porta e chiudi linee di tiro/passaggio. Usalo nei 1v1 e quando difendi in area per non farti saltare.

**Contrasto di Spalla**: Ingaggia spalla a spalla quando sei affiancato e in corsa: è l’opzione più “pulita” per rubare palla senza scivolate o contrasti rischiosi.

**Pressing coordinato**: Chiama un compagno a pressare per pochi secondi **solo** quando sei vicino al portatore e hai copertura dietro. Se lo fai da lontano o senza copertura, apri spazi.

**Protezione palla**: dalla v4.0.0 non esiste più un comando manuale “Protezione/Shield”: il giocatore tenta automaticamente di schermare la palla in base alla situazione. **Contatto fisico** più alto offre un vantaggio nei duelli fisici, ma non garantisce la riuscita.

**Marcature sui piazzati**: il gioco gestisce automaticamente assegnazioni e cambi di marcatura. Usa cambio cursore, Movimento/Testa a testa e le strategie sui calci piazzati disponibili nel menu; non presentare come selezionabile una scelta generale “uomo o zona”.

### 7.2 Comandi Offensivi Avanzati

**Uno-due in Avanti**: Dopo un passaggio, manda l’autore a scattare in profondità e restituisci subito palla nello spazio. È una base per superare linee compatte.

**Passaggio Sensazionale**: passaggio più rapido e incisivo, ma con preparazione più lunga rispetto al comando normale. Usalo quando il giocatore ha spazio e una linea di passaggio chiara; sotto pressione aumenta il rischio che venga chiuso prima del calcio.

**Tiro Sensazionale**: Tiro più potente. Rende di più con abilità tiro speciali (es. **Tiro a scendere** / **Tiro a salire**) e quando hai tempo per orientare il corpo.

**Volée dinamica (v6.0.0)**: su una palla in aria, indipendentemente dall’altezza, il comando Tiro sensazionale può produrre una volée potente. Anche su alcuni palloni alti ma bassi il giocatore può scegliere naturalmente una volée invece di un colpo di testa, secondo altezza e situazione.

**Tiro Calibrato**: Tiro più “piazzato” e delicato. Rende di più con abilità come **A giro da distante** o **Esterno a giro**, e quando vuoi privilegiare precisione rispetto alla potenza.

**Conduzione**: usa Dribbling normale o Dribbling di precisione per tocchi controllati e **Tocco deciso** per spingere più lontano la palla e accelerare. Il Tocco deciso espone maggiormente la palla e richiede spazio.

**Dribbling di precisione**: conduzione a tocchi fini, con il giocatore consapevole della direzione della porta. È utile negli spazi stretti e per reagire ai movimenti del difensore.

### 7.3 Finte e skill move

Usare esclusivamente nomi presenti nella Lista comandi corrente: **Finta di corpo, Doppio tocco, Marseille Turn, Draw and Open, Draw and Close, L Feint, Scotch Move, Out & In (Flip Flap), Scissors Feint, Step-over, Chop Turn e Rainbow Flick**. Il tipo di comando disponibile dipende dalla piattaforma e dall’impostazione Easy/Smart/Advanced.

**Tap Trick** non è un comando ufficiale corrente: non usarlo come nome di una tecnica. Non confondere inoltre le abilità della carta, come Double Touch, Sole Control o Flip Flap, con il nome del comando impartito.

### 7.4 Stop e ricezione

I comandi ufficialmente documentati sono **Stop/Traps**, **Voltati verso la porta avversaria**, **Finta di stop/Trap Feint** e **Sombrero**. Evitare nomi non presenti nella Lista comandi corrente, come “Finta con stop”, “Stop e alzata” o “Alzata di tacco”, salvo citarli esplicitamente come descrizioni community e non come comandi.

### 7.5 Movimenti collettivi
**Nota affidabilità**: i movimenti seguenti sono principi tattici/community, non comandi o bonus ufficiali. Moduli, stili e abilità citati sono esempi da verificare sulla rosa; non garantiscono automaticamente il movimento descritto.

- **Triangolazione**: Tre giocatori formano triangolo per possesso; movimento continuo per opzioni passaggio. **Quando serve**: zona fitta, mantenere possesso sotto pressing. **Rosa**: Regista creativo, Classico n° 10, Collante; Passaggio di prima, Passaggio filtrante. **Moduli**: 4-3-3, 4-2-3-1.
- **Sovrapposizione**: Giocatore supera compagno con palla; corsa oltre per ricevere o attirare marcatore. **Quando serve**: superiorità numerica su fascia, 1v1 su fascia. **Rosa**: Terzino offensivo, Onnipresente, Specialista cross; buona Velocità/Accelerazione, Cross calibrato. **Moduli**: 4-3-3, 3-5-2.
- **Taglio**: Movimento diagonale verso porta, corsa senza palla in spazio. **Quando serve**: ricevere passaggio filtrante, difesa schierata, spazio tra linee. **Rosa**: Ala prolifica + Regista creativo (chi taglia + chi passa); Passaggio filtrante; buona Velocità/Accelerazione. **Moduli**: 4-3-3, 4-2-3-1.
- **Ampiezza**: Giocatori si allargano per occupare campo; stirare difesa avversaria. **Quando serve**: creare spazi centrali, difesa compatta da aprire. **Rosa**: Specialista cross, Ala prolifica; moduli larghi (4-3-3, Vie laterali). **Moduli**: 4-3-3, 3-5-2.
- **Compattezza**: Squadra si stringe in zona ristretta; linee ravvicinate. **Quando serve**: fase difensiva, proteggere risultato. **Rosa**: Incontrista, Collante, Tornante; res alta, tac alto. **Moduli**: tutti (gestione vantaggio).

### 7.6 Situazioni di gioco
- **Transizione positiva** (riconquista → attacco): accelerazione immediata e passaggio verticale prima che l’avversario ricompatti. **Rosa**: buona Velocità/Accelerazione, Passaggio filtrante; Opportunista, Giocatore chiave, Ala prolifica.
- **Transizione negativa** (perdita palla → difesa): pressione immediata solo se c’è copertura; altrimenti ripiegare. **Rosa**: tac alto, Tornante, Intercettazione, Incontrista; res alto.
- **Finalizzazione**: 1v1 portiere (spiazzamento o potenza); area affollata (tiro al volo o deviazione); fuori area (tiro potente piazzato). **Rosa**: Tiro di prima, fin alta; Tiro potente, Distanza per fuori area.
- **Gestione vantaggio**: abbassare ritmo, possesso sicuro e passaggi corti nelle fasi finali, in base a punteggio e Resistenza. **Rosa**: res alta, Tornante, Marcatore; Collante, Passaggio di prima; Compattezza.
- **Recupero svantaggio**: nelle fasi finali, se serve aumentare il rischio, alzare ritmo e pressione con copertura. **Rosa**: Giocatore chiave, Tiro potente, **Riserva di lusso**; far entrare game changer; Sovrapposizione, Ampiezza.
- **Superiorità numerica**: mantenere possesso, circolare palla, attendere varco.
- **Inferiorità numerica**: compattezza estrema, difesa zona, contropiede.

### 7.7 Matrice situazione × dati × movimenti (enterprise)
Per ogni situazione: quali dati usare dalla rosa, quali movimenti, output consiglio.

| Situazione | Dati rosa | Movimenti | Output |
|------------|-----------|-----------|--------|
| Transizione positiva | buona Velocità e Accelerazione, Passaggio filtrante, Opportunista/Giocatore chiave | Taglio, Passaggio filtrante | Chi mettere, chi dare palla |
| Transizione negativa | tac, Intercettazione, Tornante, Incontrista, res | Compattezza, Ripiegamento | Chi pressare, chi coprire |
| Corner attacco | Colpo di testa, Salto, Dominio palle alte, h alto | Strategia su calcio d’angolo disponibile, attacco del primo o secondo palo | Chi portare in area, chi batte |
| Punizione attacco | Calci da fermo, Specialista punizioni, Colpo di testa | Strategia su calcio piazzato disponibile, movimento verso la zona scelta | Chi tira, chi in area |
| Gestione vantaggio | res, Tornante, Marcatore, Collante | Compattezza, Possesso sicuro | Chi tenere, istruzioni |
| Recupero svantaggio | Giocatore chiave, Tiro potente, Riserva di lusso | Sovrapposizione, Ampiezza | Chi far entrare |
| Pressing alto | Resistenza adeguata al pressing richiesto, Incontrista, Intercettazione | Pressing coordinato | Chi pressare, quando |
| Difesa bassa | Regista creativo, Passaggio filtrante, Taglio | Triangolazione, Taglio | Chi crea, chi taglia |

**Affidabilità**: questa matrice è una guida community. Le associazioni tra valori, stili e movimenti sono criteri di selezione, non soglie o attivazioni ufficiali.

### 7.8 Principi tattici e best practices
- **Occupazione spazio**: mantenere larghezza, profondità e copertura preventiva; il numero di giocatori da portare avanti dipende da modulo, fase e rischio accettabile.
- **Supporto palla**: cercare più linee di passaggio senza imporre un numero fisso.
- **Compattezza difensiva**: mantenere distanze gestibili tra i reparti; non esiste una soglia ufficiale in metri.
- **Difesa e attacco**: preferire posizionamento e lettura al pressing cieco; alternare ritmo controllato e accelerazioni.
- **Costruzione squadra**: bilanciare compiti offensivi e difensivi e scegliere Resistenza coerente con l’intensità richiesta, senza soglie universali.
- **Sostituzioni**: decidere da barra Resistenza, forma, punteggio e compito; non esiste un minuto ottimale ufficiale.
- **Errori da evitare**: pressione e sprint continui, prevedibilità e perdita della copertura.

### 7.9 Incrocio Statistiche Analisi (uso comandi ultime 10 partite) con Rosa (abilità, posizioni, stili)

Quando nel RIASSUNTO ANALISI è presente la sezione **"Statistiche di gioco (Analisi eFootball, ultime 10 partite)"**, incrocia l’**uso comandi** (percentuali/conteggi) con la **Rosa** (Abilità in rosa, posizioni, stili) per dedurre se alcune statistiche sono **sottoutilizzate o sovrautilizzate rispetto al profilo squadra**.

**Mappatura comando (schermata Analisi) → cosa guardare in rosa**

| Categoria Analisi | Voce alta % / uso | Abilità / statistiche rilevanti in rosa | Se in rosa mancano → consiglio |
|------------------|-------------------|-----------------------------------------|--------------------------------|
| **Passaggio** | Passaggio filtrante rasoterra / alto frequente | **Passaggio filtrante**, Passaggio di prima, Passaggio calibrato; stat Passaggio rasoterra/alto | "Usi molto il passaggio filtrante; se in rosa pochi hanno Passaggio filtrante/Passaggio di prima, i passaggi in profondità possono essere imprecisi. Diversifica con passaggio rasoterra corto o schiera chi ha quelle abilità; oppure aggiungile con Programmi (se non Trending)." |
| **Passaggio** | Cross / Cross basso (basso %) | **Cross calibrato**, Specialista cross; stat Passaggio alto; ali/terzini con abilità cross | "Usi poco i cross; se hai ali/terzini con Cross calibrato o Colpo di testa in area, puoi sfruttarli di più con cross dalla fascia." |
| **Tiro** | Normale frequente e Tiro calibrato basso | **Tiro calibrato** rende con **A giro da distante**, **Esterno a giro** (§7.2); Finalizzazione; punte con abilità tiro | "Usi soprattutto tiro normale; se hai punte con Tiro a giro / A giro da distante, prova più spesso il Tiro calibrato per piazzare meglio." |
| **Tiro** | Pallonetto / Tiro sensazionale (basso %) | Pallonetto mirato; Tiro a scendere/Tiro a salire; portiere in uscita → pallonetto | "Pallonetto e tiro sensazionale poco usati; utili su portiere in uscita o da distanza con giocatori che hanno le abilità." |
| **Tipo di gol** | Passaggio filtrante rasoterra frequente | Come sopra: Passaggio filtrante, smarcamenti (stili Opportunista, Ala prolifica, Taglio al centro) | Coerente con uso passaggio; verifica che chi riceve abbia stile, posizione, Velocità/Accelerazione e Finalizzazione adatti agli inserimenti. |
| **Dribbling** | Scatta frequente | Stat **Velocità**, **Accelerazione**, **Controllo palla**, **Dribbling**; nessuna abilità “Scatto” | Se Velocità/Accelerazione basse in rosa, lo Scatta può portare a molte perdite palla; privilegia conduzione "Normale" o posizionamento. |
| **Dribbling** | Dribbling di precisione poco usato | **Controllo di suola**, **Doppio tocco**, Controllo palla e Dribbling; spazi stretti | Se hai giocatori tecnici, puoi provare più dribbling di precisione in 1v1, leggendo distanza e lato libero. |
| **Difesa** | Pressa / Movimento / Testa a testa | **Comportamento difensivo**, **Contrasto**, **Aggressività**; abilità Intercettazione, Muro, Marcatore | Uso bilanciato; se Pressa alta ma pochi in rosa con Aggressività/Intercettazione, il pressing può essere inefficace → consiglia più Movimento/posizionamento. |
| **Comandi speciali** | Chiama pressing poco usato | Centrocampisti/attaccanti con Coinvolgimento difensivo, Aggressività | "Usi poco Chiama pressing; se i tuoi centrocampisti hanno buona Aggressività/Coinvolgimento difensivo, puoi provare il pressing coordinato quando hai copertura." |
| **Comandi speciali** | Cambio cursore molto usato | — | È solo un’osservazione di difesa manuale: non prova da sola problemi di posizionamento o linea difensiva. |

**Regola per l’AI**: Non inventare percentuali; usa solo quelle presenti in "Statistiche di gioco". Se la sezione non c’è (utente non ha caricato screenshot), non dedurre dati dalla schermata Analisi. Quando incroci, cita **Abilità in rosa** (lista nel RIASSUNTO) e, se rilevante, posizioni/stili. Le relazioni tra frequenza dei comandi e caratteristiche della rosa sono ipotesi diagnostiche community, non causalità ufficiali: formula domande o prove da effettuare, non conclusioni certe.

### 7.10 Consigli community Dream Team

**Fonti**: usare soltanto guide ancora accessibili, datate e riferite alla versione corrente. Etichettare sempre formazioni, build e priorità di mercato come opinioni community; non attribuirle a Konami.

**Regola per l’AI**: incrociare rosa, stili, statistiche, abilità, manager, Link-up Play, Fluid Formation e problemi osservati. Non usare soglie arbitrarie di competenza manager e non dichiarare un modulo “meta”, “perfetto” o “preferito dai professionisti” senza fonte datata.

**Costruzione rosa**: dare priorità ai ruoli che producono il problema osservato. La sequenza PT → DC → CC → A → Terzini è una possibile euristica community, non una regola universale.

**Formazioni**:
- **4-2-3-1**: possibile base equilibrata o prudente; rischio di isolare la punta.
- **4-2-2-2**: può favorire gioco verticale e due punte, ma può perdere ampiezza.
- **4-3-3 / 4-2-1-3**: può offrire ampiezza e triangoli, con rischio negli spazi ai lati o davanti al mediano.
- **Difesa a tre**: richiede copertura degli esterni e gestione attenta delle transizioni.

Dalla v6.0.0 considerare anche **Fluid Formation**, che permette assetti diversi in possesso e non possesso. Suggerire un modulo solo come prova motivata dai dati del cliente.

**Link-up Play**: si attiva quando il manager possiede il relativo Link-up Play e i due giocatori indicati come **Centrepiece** e **Key Man** soddisfano le posizioni e gli Stili di gioco richiesti. I potenziamenti avvengono nei momenti specificati dalla descrizione del Link-up Play; Konami non documenta una regola generale di distanza.

### 7.11 Squadra bloccata – Checklist e Smart Assist (frustrazioni community)

**Squadra bloccata (attacco sterile, sconfitte ripetute)**:
1. Verificare che Stili di gioco, posizioni e compiti producano i movimenti desiderati; non assumere abbinamenti obbligatori tra uno stile giocatore e uno stile squadra.
2. Confrontare la formazione usata con i problemi osservati e, dalla v6.0.0, valutare separatamente assetto offensivo e difensivo tramite Fluid Formation.
3. Se è presente un Link-up Play, controllare Centrepiece, Key Man e tutte le condizioni mostrate in gioco.
4. Valutare i cambi da Resistenza, forma, punteggio e abilità Riserva di lusso, senza imporre il 60º minuto.
5. Usare §7.9 come ipotesi diagnostica.
6. Contro un blocco basso provare ampiezza, circolazione e cambi di ritmo se coerenti con la rosa.
7. In vantaggio privilegiare copertura e scelte semplici, sostituendo chi non regge più il compito assegnato.

**Smart Assist**: Konami lo documenta come assistenza automatica a dribbling, selezione/tipo di passaggio, potenza/traiettoria del tiro, rinvii e posizionamento durante Testa a testa. È disponibile in molte modalità, ma può essere disabilitato in determinati Eventi e nelle competizioni eSports ufficiali; evitare la frase generale “bandito dal competitivo 2025”.

- Se l’utente riferisce uno svantaggio, distinguere il fatto verificabile dalla percezione community: “Capisco la frustrazione; alcuni giocatori lo segnalano, ma Konami non dichiara che penalizzi chi lo disattiva”.
- Se `smart_assist=no`, proporre scelte coerenti con il controllo manuale senza promettere che abilità o moduli compensino automaticamente l’assistenza.

**Tone**: Empatia + azioni concrete. NON commentare scripting o meccaniche di engine.

### 7.12 Meccaniche avanzate "cancel" e skill trick (Enterprise)

Obiettivo: usare tecniche avanzate in modo professionale, ripetibile e coerente con il contesto partita, senza coaching "exploit-only".

**Tassonomia affidabilità termini**:
- **Comandi ufficiali**: Super Cancel, Kick Cancel, Kick Feint, Double Touch.
- **Tecniche community**: Tess Cancel e Double Touch cancel.
- **Varianti community di animazione**: “controlled/special Double Touch” o “Neymar ball roll”.

**Mappatura**:
- **Super Cancel**: comando ufficiale di annullamento/override; gli usi per liberare corse o correggere traiettorie sono applicazioni community.
- **Kick Cancel**: annulla un comando di calcio prima del contatto con la palla.
- **Kick Feint**: annulla il calcio producendo una finta.
- **Double Touch**: finta ufficialmente documentata.
- **Tess Cancel / Double Touch cancel**: concatenazioni community che combinano una finta e un annullamento; non sono comandi autonomi documentati da Konami.

Non chiamare il normale Double Touch “croqueta interrotta”. La community associa spesso:
- **Double Touch + Sole Control** a una variante controllata;
- **Double Touch + Sole Control + Flip Flap** a una variante speciale/ball roll.

Queste associazioni sono osservazioni community, possono dipendere dal Player ID e non costituiscono requisiti ufficiali pubblicati da Konami.

**Policy anti-exploit (obbligatorie)**:
1. Non suggerire spam continuo della stessa skill ("fai sempre croqueta/tess").
2. Non suggerire macro, script, automazioni input, o abuso di bug.
3. Non presentare tecnica community come "migliore sempre": va condizionata a contesto, livello utente e tipo giocatore.
4. Se una tecnica e controversa nel meta, dichiarare trade-off (rischio perdita palla, prevedibilita, transizione negativa scoperta).

**Gating decisionale prima di suggerire cancel trick**:
- Verificare fit giocatore: statistiche e abilità coerenti; per varianti speciali, trattare i requisiti indicati dalla community come non ufficiali.
- Verificare scenario: 1v1 laterale, rifinitura stretta, uscita pressing, non in zona a rischio palla persa centrale.
- Verificare stato partita: se in vantaggio e minuto alto, preferire sicurezza (protezione, passaggio semplice) rispetto a trick ad alto rischio.
- Verificare connessione/input delay: con lag alto ridurre consigli su timing stretto.

**Template risposta coach su meccaniche avanzate**:
- 1) **Adesso**: una singola azione concreta (esecuzione breve, no teoria lunga).
- 2) **Se fallisce**: piano B sicuro (passaggio/uscita pressione).
- 3) **Prossima pausa**: micro-aggiustamento coerente (stile, ruolo, cambio uomo tecnico).

**Esempi enterprise (brevi)**:
- "Usa Double Touch solo in 1v1 laterale; se il difensore non abbocca, proteggi e scarica corto."
- “Kick Cancel annulla un calcio non più desiderato; usarlo come micro-finta è un’applicazione tattica community.”
- “Super Cancel è un comando ufficiale; usarlo per correggere una corsa difensiva o chiudere una linea è coaching community, non un effetto garantito.”

---

## 8. ABILITÀ GIOCATORE, ABILITÀ SPECIALI E STILI COM/IA

- **Abilità native**: abilità incluse nella specifica carta.
- **Abilità aggiuntive**: gli Skill Training Programs possono aggiungere un massimo di **5 Additional Skills** ai giocatori eleggibili. Le abilità aggiuntive possono essere eliminate o trasferite tramite le funzioni previste dal gioco.
- **Abilità speciali / Show Time**: abilità native di specifiche versioni di carta; non fanno parte del normale pool Skill Training.
- **Stili COM/IA**: tendenze usate quando l'IA controlla il giocatore in possesso; non sono Player Skills e non occupano slot Additional Skills.
- **Attributi**: valori numerici quali Finalizzazione, Tiro a giro, Velocità, Accelerazione, Resistenza e statistiche PT. Non sono Player Skills.
- **Trending**: sviluppo non disponibile.
- **Epic, Legendary, Highlight, Featured e Standard**: sviluppo disponibile secondo le opzioni mostrate sulla singola carta.
- Non dedurre quali abilità siano native o aggiuntive da un array privo di provenienza.

**Nomi**: usare l'inglese canonico della carta/database. Usare un nome italiano come “ufficiale” soltanto quando verificato nel client italiano corrente o in una pagina Konami italiana; non tradurre creativamente i nomi recenti.

### 8.1 Abilità di tiro

**Standard/addestrabili**: Heading, Long-Range Curler, Chip Shot Control, Knuckle Shot, Dipping Shot, Rising Shot, Long-Range Shooting, Acrobatic Finishing, Heel Trick, First-time Shot.

**Speciali native di specifiche carte**: Bullet Header, Blitz Curler, Low Screamer, Snap Strike, Phenomenal Finishing, Willpower.

- **Snap Strike**: riduce il tempo di preparazione di uno Stunning Shot.
- **Phenomenal Finishing**: riduce l’errore e migliora la precisione da posizioni del corpo difficili o atipiche; non presentarlo come aumento generale garantito della potenza.

**Non sono Player Skills**: Finishing e Curl sono attributi; Power Shot è un’etichetta legacy/non corrente; Pinpoint Shooter non è una Player Skill corrente.

### 8.2 Abilità Passaggio

**Standard/addestrabili**: One-touch Pass, Through Passing, Weighted Pass, Pinpoint Crossing, Outside Curler, Rabona, No Look Pass, Low Lofted Pass.

**Speciali native di specifiche carte**: Edged Crossing, Game-changing Pass, Visionary Pass, Phenomenal Pass, Attack Trigger.

- **Low Lofted Pass**: produce passaggi alti lunghi con una traiettoria più bassa e diretta. Non è un passaggio rasoterra.
- **Phenomenal Pass**: aumenta potenza e precisione dei passaggi eseguiti da posizioni del corpo difficili o atipiche. “Phenomenal Passing” è un alias dati da normalizzare.
- **Attivatore d’attacco / Attack Trigger**: aumenta il Comportamento offensivo degli altri compagni quando il possessore dell’abilità ha palla; il possessore non è incluso.

**Non sono Player Skills**: Volleyed Pass e Long Lofted Pass non sono voci correnti; Long Ball Expert è uno Stile COM/IA.

### 8.3 Abilità Dribbling e Controllo

**Standard/addestrabili**: Scissors Feint, Double Touch, Flip Flap, Marseille Turn, Sombrero, Chop Turn, Cut Behind & Turn, Scotch Move, Sole Control.

**Speciali native di specifiche carte**: Tap Trick, Momentum Dribbling, Acceleration Burst, Magnetic Feet.

Cut Behind & Turn è un’abilità distinta, non una combinazione di Double Touch, Flip Flap e Sole Control. Non inventare parametri numerici nascosti per Magnetic Feet.

**Non sono Player Skills**: Acrobatic Trap, Feint Shot, Feint Pass, Burst Touch e Shielding. Trickster è uno Stile COM/IA.

### 8.4 Abilità Difensive

**Standard/addestrabili**: Man Marking, Track Back, Interception, Blocker, Aerial Superiority, Sliding Tackle, Acrobatic Clearance.

**Speciali native di specifiche carte**: Long-reach Tackle, Fortress, Aerial Fort, Shadow Hunt.

- **Shadow Hunt**: quando il giocatore è schierato come MED/TD/TS/DC e un avversario invia un passaggio alle sue spalle, aumenta le capacità legate alla velocità durante il recupero. È automatica e nativa della carta.
- Long-reach Tackle e Shadow Hunt sono abilità distinte.
- Per Fortress, conservare il canonico inglese e trattare “Fortezza/Caposaldo” come alias non certificati finché il client italiano v6 non li conferma.

**Non sono Player Skills**: Aggressive Defence, Aggressive Pressing e Anchor. Anchor Man/Collante è uno Stile di gioco della card.

### 8.5 Abilità Portiere

**Standard/addestrabili**: GK Low Punt, GK High Punt, GK Long Throw, GK Penalty Saver.

**Speciali native di specifiche carte**: GK Directing Defence, GK Spirit Roar.

GK Awareness, GK Catching, GK Parrying, GK Reflexes e GK Reach sono attributi, non abilità.

### 8.6 Altre abilità standard

Captaincy, Long Throw, Super-sub, Fighting Spirit, Penalty Specialist e Gamesmanship sono abilità standard/addestrabili. Fighting Spirit non aumenta l’attributo Resistenza. Non esiste evidenza affidabile che Gamesmanship produca più falli contro quando assegnata a un difensore.

Cross Specialist è uno Stile offensivo della card; Set Piece Specialist non è una Player Skill corrente.

### 8.7 Skill Training e consigli

- Massimo **5 Additional Skills**.
- Trending: sviluppo non disponibile.
- Le abilità speciali e gli Stili COM/IA sono fuori dal normale pool Skill Training.
- Prima di consigliare un’abilità, sottrarre quelle già presenti e verificare che la carta sia eleggibile.

Le priorità per ruolo sono **euristiche community**, non requisiti universali. Valutare skill native, posizione, stile, compito, build e problema osservato. Esempi: finalizzazione per chi conclude, passaggio per chi rifinisce, Interception/Blocker/Man Marking per chi protegge zone, Pinpoint Crossing per chi arriva realmente al cross, Super-sub per un cambio del secondo tempo.

Non prescrivere pacchetti fissi, quantità arbitrarie di abilità dribbling o abilità inesistenti. Super-sub opera quando il giocatore entra nel secondo tempo; non imporre il minuto 60.

### 8.8 Stili COM/IA — tassonomia separata

La lista canonica è: **Trickster, Mazing Run, Speeding Bullet, Incisive Run, Long Ball Expert, Early Crosser, Long Ranger**.

- Long Ranger non è Long-Range Shooting.
- Long Ball Expert non è una Player Skill di passaggio.
- Early Crosser non è Pinpoint Crossing.
- Trickster non è una skill move manuale.

### 8.9 Alias e provenienza

Normalizzare soltanto alias noti senza inventare traduzioni. Esempi: `Phenomenal Passing` → **Phenomenal Pass**; `Penalty Saver` → **GK Penalty Saver**; `GK Directing Defense` → **GK Directing Defence**. Conservare il nome inglese per abilità recenti se l’italiano non è verificato nel client v6.

Tra le abilità speciali recenti figurano anche **Snap Strike** e **Attacking Surge**. Attacking Surge accelera automaticamente le corse offensive senza palla nella metà avversaria mentre un compagno è in possesso; il nome italiano esatto resta da verificare nel client.

---

## 9. COMPETENZE E SVILUPPO

### Frecce forma
- **Freccia su**: Current Condition favorevole.
- **Freccia giù**: Current Condition sfavorevole.
- **Neutro**: Current Condition normale.

Considerare le frecce nella scelta dei titolari senza inventare effetti numerici.

### 9.1 Tipologie Giocatori (Squadra dei Sogni)
- **Epic**: celebra una stagione significativa di un giocatore e ha un tetto di sviluppo superiore a Legendary.
- **Legendary**: rappresenta una specifica stagione di alto rendimento.
- **Trending**: rappresenta una partita o settimana recente; sviluppo non disponibile.
- **Highlight**: giocatore selezionato della stagione corrente, con tetto di sviluppo superiore a Featured.
- **Featured**: giocatore selezionato in base alle prestazioni della stagione corrente.
- **Standard**: giocatore basato sulla stagione corrente.

### 9.2 Competenza Posizione
**Livelli**:
- **Basso**: Nessun colore
- **Intermedio**: Verde sfumato
- **Alto**: Verde brillante

**Apprendimento**:
- Massimo 2 slot competenze posizione
- Programmi Aggiunta Posizione per acquisire nuove posizioni
- Portieri e campo non interscambiabili

Ogni risultato di Position Training aumenta di un livello una competenza eleggibile scelta casualmente. Da v6.0.0 la posizione registrata sulla carta è esclusa dai risultati apprendibili.

Lo Stile di gioco si attiva soltanto nelle posizioni compatibili con quello stile. La competenza posizione e la compatibilità dello stile sono controlli distinti: non affermare che la sola competenza Bassa disattivi automaticamente lo stile.

### 9.3 Valore Giocatore (VG)
Valutazione massima 5 stelle (5★). Trending valutati su statistiche iniziali. Altri tipi su statistiche + potenziale.

### 9.4 Overall Rating e Team Strength

L'Overall Rating mostrato nel Game Plan è una valutazione riassuntiva dipendente dalla posizione e non costituisce un moltiplicatore autonomo delle prestazioni. Team Strength riassume la rosa. Dal v3.0.0 i giocatori non possiedono più Team Playstyle Proficiency e le loro abilità non aumentano o diminuiscono in base a tale valore.

---

## 10. POLICY COACH AI (riferimento)

Le policy comportamentali per il Coach AI (errori da evitare, terminologia, anti-inferenza, esempi risposta) sono definite in `lib/coachPromptRules.js` e iniettate nel system prompt di Hero.

**Motivo**: sono vincoli sempre attivi, non "conoscenza contestuale" da recuperare via RAG. Il RAG potrebbe escluderle per limite caratteri o ordine sezioni; nel system prompt sono garantite ad ogni richiesta chat.

**Contromisure** (`countermeasuresHelper.js`) e **analyze-match** hanno regole specifiche nei rispettivi prompt.

---

## 11. PROVENIENZA CATALOGO

Le carte importate (rosa, catalogo, Card Advisor, Hub) possono venire da patch diverse:

- **v5.4 / dump Hub vecchi** — dati legacy
- **v6.0.0 / eFootball 2027** — dati allineati alla patch corrente

**Contratto dati FZTH:**
- Nel catalogo PSDB, `player_skills` / `players_payload.skills` sono le abilità **native di quella specifica carta**.
- `players_payload.com_skills` / `ai_playstyles` sono stili COM/IA e non consumano slot aggiuntivi.
- `players_payload.playing_styles` può contenere `attack` e `defense`: il secondo stile non va perso né fuso col primo.
- Le abilità aggiuntive appartengono alla configurazione della carta dell'utente. Non si deducono contando o sottraendo genericamente le skill: servono provenienza esplicita o confronto con l'esatta carta catalogo.
- `player_catalog` (PSDB) e `card_advisor_cards` (EFHub) sono fonti distinte: non associare due versioni soltanto per nome se manca un'identità carta affidabile.

**Regola AI (obbligatoria):**
- Non chiamare una carta "**attuale**" / "**current**" se manca `source_version` o se non è `v6.0.0` / `eFootball 2027`.
- Se la provenienza manca, di che i dati sono della **rosa/catalogo salvato**, non che sono la patch più recente.
- Non inventare overall, skill o stili "meta di oggi" basandoti sul nome della carta: usa solo i dati salvati nel contesto.

Questa regola è anche nel truth layer runtime (`lib/efootballTruthLayer.js`).

---

**Versione**: 9.1.0 ENTERPRISE | **Data**: 15 Settembre 2026
**Principio**: fatti ufficiali vs meta community vs euristiche FZTH | **Terminologia**: Ufficiale eFootball v6.0.0
**Changelog 9.1.0**: revisione riga per riga con fonti Konami v3.0.0–v6.0.0 e fonti specialistiche correnti. Separate statistiche, Player Skills standard, abilità speciali native, Stili COM/IA, Stili offensivi/difensivi v6 ed euristiche community. Rimossi soglie numeriche inventate, comandi obsoleti, tassonomie legacy, fonti non disponibili e affermazioni non verificabili. Allineati Formazione fluida FZTH, calci piazzati, Smart Assist, Link-up Play, cancel e sviluppo.
