**Versione**: 8.4.0 ENTERPRISE | **Data**: 10 Febbraio 2026 | **Lingua**: Italiano
**Fonti**: Manuale eFootball, Best Practices Community, Documentazione Tecnica Ufficiale

# DATABASE MECCANICHE eFootball ENTERPRISE - RAG System

## OBIETTIVO
Database RAG enterprise per consigli tattici basati su meccaniche ufficiali eFootball. 
**Principio fondamentale**: Distinguiere sempre tra CARATTERISTICHE FISSE (card) e ELEMENTI CONFIGURABILI (utente).

---

## CONTESTO VIDEOGIOCO (FONDAMENTALE)

### Cosa sono i Giocatori in eFootball
I giocatori in eFootball sono **CARD DIGITALI** con statistiche e caratteristiche **FISSE**:
- **Non sono persone reali** → NON hanno "esperienza", "carriera", "maturità"
- **Non crescono nel tempo** → Statistiche Overall, Velocità, Tiro sono FISSE sulla card
- **Non si allenano** → Non puoi "migliorare" un giocatore
- **Puoi solo scegliere** → Quale schierare, come posizionarlo, che istruzioni dare

### Differenza FISSO vs MODIFICABILE

| ELEMENTO | STATO | DESCRIZIONE |
|----------|-------|-------------|
| **Statistiche Giocatore** | FISSO | Overall, Velocità, Tiro, Resistenza, ecc. - Immutabili |
| **Stili di Gioco Giocatore** | ✅ FISSO | Opportunista, Collante, Box-to-Box, ecc. - Immutabili |
| **Abilità native** (dalla card) | ✅ FISSO | Tiro al Volo, Contrasto Aggressivo, ecc. - Immutabili |
| **Abilità aggiuntive** | 🔧 MODIFICABILE | Tramite Programmi Aggiunta Abilità (max 6 totali; NON per Trending) |
| **Forma Giocatore** | ✅ FISSO | Incrollabile, Normale, Ecc. - Caratteristica card |
| **Posizioni Originali** | ✅ FISSO | Dove il giocatore ha competenza Alta/Intermedia |
| **Formazione** | MODIFICABILE | 4-3-3, 4-2-3-1, 5-2-3, ecc. - Scelta utente |
| **Stile Squadra** | 🔧 MODIFICABILE | Possesso palla, Contropiede, ecc. - Scelta utente |
| **Istruzioni Individuali** | 🔧 MODIFICABILE | Offensivo, Difensivo, Marcatura, ecc. - Configurabili |
| **Titolari vs Riserve** | 🔧 MODIFICABILE | Chi schierare in campo - Decisione utente |
| **Competenza Posizione** | 🔧 PARZIALE | Alto/Intermedio fisso, ma si può aggiungere posizione (max 2) |

**REGOLA ORO per l'AI**: MAI suggerire di "potenziare", "migliorare", "far crescere" un giocatore. 
Puoi solo suggerire: chi usare, dove posizionarlo, che istruzioni dargli.

---

## 1. STATISTICHE GIOCATORI (UFFICIALI eFootball)

### 1.1 Statistiche Tecniche e Offensive
- **Colpo di testa**: Precisione nei colpi di testa
- **Calci da fermo**: Precisione in calci piazzati, rigori, punizioni
- **Tiro a giro**: Capacità di imprimere effetto al pallone
- **Velocità**: Velocità massima del giocatore
- **Accelerazione**: Rapidità nel raggiungere velocità massima
- **Potenza di tiro**: Forza del tiro
- **Finalizzazione**: Precisione nel tiro
- **Possesso stretto**: Abilità nel cambiare direzione durante dribbling a bassa velocità
- **Passaggio rasoterra**: Precisione nei passaggi rasoterra
- **Passaggio alto**: Precisione nei passaggi aerei
- **Dribbling**: Controllo di palla durante dribbling in velocità
- **Controllo palla**: Controllo generale, influenza stop e finte
- **Comportamento Offensivo**: Rapidità di risposta sul pallone in attacco

### 1.2 Statistiche Difensive
- **Comportamento difensivo**: Rapidità di risposta in fase difensiva
- **Contrasto**: Abilità nel vincere scontri con avversari
- **Aggressività**: Intensità nel cercare di recuperare il possesso
- **Coinvolgimento difensivo**: Inclinazione ad aiutare in fase difensiva

### 1.3 Statistiche Fisiche
- **Resistenza** (NON "Stamina"): Forma fisica e durata prestazione
- **Contatto fisico**: Capacità di contenere avversario e mantenere equilibrio
- **Controllo corpo**: Abilità nel resistere ai contrasti
- **Salto**: Altezza del salto
- **Equilibrio**: Stabilità del giocatore

### 1.4 Statistiche Portieri
- **Riflessi PT**: Capacità di bloccare tiri ravvicinati
- **Estensione PT**: Copertura area di porta
- **Comportamento PT**: Rapidità di risposta sul pallone
- **Presa PT**: Capacità di afferrare il pallone
- **Parata PT**: Abilità nel respingere pallone in zone sicure

### 1.5 Caratteristiche Speciali
- **Frequenza piede debole**: Frequenza utilizzo piede debole
- **Precisione piede debole**: Precisione tiri/passaggi con piede debole
- **Forma**: Variazione condizione fisica ("Incrollabile" = condizione stabile)
- **Resistenza infortuni**: Probabilità di subire infortuni (valore alto = minor probabilità)

### 1.6 Soglie indicative (parametri META)
Valori di riferimento per costruzione squadra. Le statistiche restano FISSE sulla card; questi numeri aiutano a scegliere quale card schierare.
- **Difensori centrali**: Velocità e Accelerazione min. 85 (contropiede dominante)
- **Terzini**: Velocità 90+ per recuperare su ali veloci
- **Ali e attaccanti**: Velocità 90+ per dominare 1v1
- **Centrocampisti**: 80+ per essere competitivi
- **Resistenza**: con valore basso, l'Accelerazione cala durante la partita; chi corre/pressa troppo nel primo tempo inizia stanco nel secondo.

---

## 2. STILI GIOCATORE - Caratteristica card (FISSI)

**≠ Stile squadra** (Possesso, Contropiede, ecc.): quello è in §4. Qui solo **caratteristiche FISSE della card**.

**IMPORTANTE**: Gli stili giocatore (Opportunista, Collante, Box-to-Box, ecc.) sono **CARATTERISTICHE FISSE** della card. NON si possono modificare.

### 2.1 Stili Senza Palla (Comportamento senza possesso)

#### Attaccanti e Centrocampisti Offensivi
- **Opportunista** (P): Gioca a contatto con ultimo difensore, scatta verso porta appena si presenta un'opportunità, sovraffolla l'area per creare caos e occasioni. **Quando serve**: squadre con passaggi filtranti, palle in profondità, gioco veloce e contropiede. **Perché**: sempre pronto ad anticipare i passaggi in profondità; stile diretto, adattabile a gameplay veloce. *(Poacher)*
- **Punta avanzata** (P/SP): Punta che si inserisce in profondità, corre negli spazi per creare occasioni. **Quando serve**: stili diretti, palle in profondità. *(Adv. Striker)*
- **Senza palla** (P/SP/TRQ): Attira difensori per creare spazi per inserimenti. **Quando serve**: squadre che cercano imprevedibilità; crea spazi per compagni. *(Dummy Runner)*
- **Rapace d'area** (P): Sempre in agguato in area di rigore per finalizzare; ottimo su cross e ribalzi. **Quando serve**: cross, attaccanti con centrocampisti/esterni che forniscono assist. *(Fox in the Box)*
- **Punta arretrata** (P/SP/TRQ): Arretra in mezzo al campo per impostare, contribuisce alla costruzione. **Quando serve**: possesso palla, squadre che costruiscono dal basso. **Perché**: idealmente abbinato a esterni veloci che corrono oltre i difensori. *(Deep-Lying Forward)*
- **Fulcro di gioco** (P): Protegge palla con fisico, riferimento offensivo. **Quando serve**: gioco aereo, sponde, attaccanti fisici. **Perché**: presenza fisica, crea spazio per esterni e trequartisti. *(Target Man)*
- **Specialista di cross** (EDA/ESA/CLD/CLS): Resta sulla fascia per crossare
- **Classico n° 10** (SP/TRQ): Playmaker, avvia attacchi con passaggi intelligenti, minimizza sforzo difensivo. **Quando serve**: gioco lento e ragionato, possesso palla, controllo partita. **Perché**: gestisce il ritmo, meno coinvolto in fase difensiva.
- **Regista creativo** (SP/EDA/ESA/TRQ/CLD/CLS): Si muove liberamente in fase offensiva, cerca spazi per ricevere palla e creare occasioni. **Quando serve**: imprevedibilità offensiva, disorganizzare la difesa avversaria. **Perché**: movimenti intelligenti di smarcamento.
- **Ala prolifica** (EDA/ESA): Si posiziona sulla fascia e taglia verso il centro per **ricevere** passaggi filtranti; efficace in 1v1. *(Prolific Winger)*
- **Taglio al centro**: Tende a tagliare verso interno per ricevere passaggi. **Quando serve**: esterni che convergono per tiri a giro o passaggi filtranti.

#### Centrocampisti e Difensori
- **Tra le linee** (CC/MED): Rimane arretrato, pronto a lanciare azioni offensive
- **Sviluppo** (DC): Difensore che arretra per impostare azione con lanci lunghi. **Quando serve**: costruzione dal basso, possesso palla. **Perché**: raggio di passaggio lungo da dietro. *(Build Up – solo DC)*
- **Frontale extra** (DC): Partecipa a manovra offensiva, si sovrappone. **Quando serve**: moduli che spingono la difesa in avanti; rischio: espone il dietro. *(Extra Frontman)*
- **Incontrista** (CC/MED/DC): Respinge attacchi con pressing aggressivo. **Quando serve**: contropiede veloce, tattiche aggressive orientate alla riconquista rapida. **Perché**: pressione alta, contrasti decisi. *(NON usare "Difensore distruttore" o "Destroyer": termini non ufficiali)*
- **Box-to-Box** (CC/MED): Corre da area a area, partecipa in fase difensiva e offensiva. **Quando serve**: moduli che richiedono centrocampisti completi, equilibrio e copertura totale. **Perché**: alta resistenza, versatilità; recupera palla e avvia attacchi, arriva tardi in area; utilizzabile in quasi tutti i moduli.
- **Onnipresente** (CLD/CLS/CC/MED): Corre su tutto il campo, copre ogni zona. *(Distinto da Box-to-Box)*
- **Collante** (MED): Centrocampista arretrato davanti difesa, utile difesa/attacco. **Quando serve**: scudo difensivo, opzione di passaggio sicura in costruzione. **Perché**: fondamentale per Vie laterali (Out Wide) per solidità difensiva. *(Anchor Man)*
- **Giocatore chiave** (SP/TRQ/CLD/CLS/CC): Fiuto del gol, sempre proiettato avanti; cerca spazi vuoti quando si passa da difesa ad attacco, corre verso porta prima della punta. **Quando serve**: contropiede veloce. **Perché**: bisogno di buona resistenza per ripetuti scatti; passaggi rasoterra precisi per le punte. *(Hole Player)*

#### Terzini e Portieri
- **Terzino offensivo** (TD/TS): Si unisce ad attacco, sovrapposizioni continue, spinta sulla fascia. **Quando serve**: ampiezza, cross, dominio territoriale. **Rischio**: lascia spazio dietro.
- **Terzino difensivo** (TD/TS): Rimane arretrato per proteggere difesa, copertura prioritaria. **Quando serve**: solidità difensiva, contro ali veloci avversarie.
- **Terzino mattatore** (TD/TS): Si inserisce in azioni offensive centrali. **Quando serve**: moduli che spingono i terzini in attacco centrale.
- **Portiere offensivo** (PT): Più avanzato, esce per anticipare; proattivo nelle uscite. **Quando serve**: linea alta, pressing, gioco aggressivo. **Rischio**: palloni scavalcati.
- **Portiere difensivo** (PT): Rimane vicino alla linea di porta, reattivo. **Quando serve**: gioco conservativo, contro squadre con tiri da lontano.

### 2.2 Attivazione stile e posizione (logica "passiva spenta se fuori ruolo")

**Terminologia community**: "Passiva spenta se fuori ruolo" = lo stile giocatore (comportamento automatico IA) **non si attiva** quando il giocatore è schierato **fuori dalla sua posizione di competenza**.

**Meccanica**:
- Gli stili sono **comportamenti passivi** (attivati dall'IA senza input diretti); governano movimenti senza palla (§2.1) e con palla (§2.3).
- Ogni stile ha **posizioni associate** (es. Opportunista → P; Box-to-Box → CC/MED; Sviluppo → solo DC).
- Se il giocatore è **in posizione di competenza** (Alto o Intermedio): lo stile si attiva → movimenti corretti, bonus di posizionamento.
- Se il giocatore è **fuori ruolo** (competenza Bassa o assente): lo stile **non si attiva** → posizionamento errato, movimenti meno efficaci, calo forza complessiva (§9.4).

**Quando citare**: Se l'utente chiede perché un giocatore "non rende" o "è lento", o se la rosa ha giocatori fuori ruolo, verificare se lo stile è compatibile con la posizione effettiva. Se fuori ruolo: "Schierando [X] fuori posizione, lo stile [Y] non si attiva; il giocatore perde il bonus di posizionamento e la forza complessiva scende. Prova a usarlo in [posizione corretta] o schiera un altro." Non usare "passiva spenta" nella risposta all'utente; usare "stile non si attiva" o "fuori ruolo penalizza".

### 2.3 Stili di Gioco IA (Con Palla)
Comportamento quando IA controlla giocatore in possesso:
- **Funambolo**: Esperto dribbling con doppio passo; controllo palla stretto sotto pressione
- **Serpentina**: Sfrutta dribbling e cambi direzione; spiazza difensori
- **Treno in corsa**: Veloce, attacca spazi, accelerazioni in profondità; ideale per contropiede
- **Inserimento**: Usa dribbling per accentrarsi e creare occasioni; taglio verso l'interno
- **Esperto palle lunghe**: Effettua spesso passaggi lunghi; costruzione da dietro
- **Crossatore**: Sfrutta spazi per crossare; ideale su fasce
- **Tiratore**: Specialista tiri da fuori area; tiene la difesa onesta

---

## 3. MODULI TATTICI (CONFIGURABILI)

### 3.1 Moduli con 4 Difensori
- **4-3-3**: Tre CC e tre attaccanti, possesso palla e ampiezza
- **4-2-3-1**: Due mediani copertura, tre trequartisti dietro punta
- **4-4-2**: Due linee da quattro, equilibrio difesa/attacco
- **4-1-2-3**: Un mediano, due mezzali, tre attaccanti
- **4-5-1**: Densità centrocampo, unica punta riferimento
- **4-4-1-1**: Variante 4-4-2 con trequartista dietro punta
- **4-2-2-2**: Due mediani, due trequartisti larghi, due punte

### 3.2 Moduli con 3 Difensori
- **3-5-2**: Due punte, CC folto, esterni supportano difesa
- **3-4-3**: Tre attaccanti, quattro CC, gioco offensivo
- **3-1-4-2**: Un mediano, quattro CC per dominare possesso
- **3-4-1-2**: Trequartista dietro due punte, creazione gioco

### 3.3 Moduli con 5 Difensori
- **5-3-2**: Difesa solida, tre CC, due attaccanti, contropiede
- **5-4-1**: Massima copertura difensiva, unica punta
- **5-2-3**: Variante offensiva, tre attaccanti, due mediani

### 3.4 Limiti di schieramento per ruolo (regole di gioco)
- **Attacco (A)**: 1-5 giocatori (max 2 P, max 1 EDA/ESA)
- **Centrocampo (C)**: 1-6 giocatori (max 1 CLD/CLS)
- **Difesa (D)**: 2-5 giocatori (max 3 DC, max 1 TD/TS)
- **Portiere (PT)**: posizione non modificabile

### 3.5 Ruoli e comportamenti tattici
**Mediano (MED)**: Davanti alla difesa, zona ristretta; interdizione e recupero palla. **Quando serve**: scudo difensivo, proteggere difesa contro trequartisti.
**Mezzala**: Movimento verticale, inserimenti in area. **Quando serve**: goal da centrocampo, superiorità numerica in area.
**Regista Basso**: Arretrato per costruzione, primo passaggio. **Quando serve**: gioco elaborato dal portiere, costruzione dal basso.
**Ala tagliente**: Rientra sul piede forte per tirare; taglio interno verso area. **Quando serve**: tiri a giro, piede invertito (destro a sinistra).
**Ala pura**: Rimane largo per cross; punta linea fondo. **Quando serve**: servire attaccanti centrali, attaccanti forti di testa.

---

## 4. STILI SQUADRA - Tattica (configurabili)

**≠ Stile giocatore** (Opportunista, Collante, ecc.): quello è in §2. Qui solo **stile tattico di squadra** (Possesso, Contropiede, ecc.).

**Definisce direzione tattica squadra. L'attitudine allenatore influenza competenza stile.**

**CONFIGURABILI IN APP (team_playing_style)**: solo questi 5 → Possesso palla, Contropiede veloce, Contrattacco, Passaggio lungo, Vie laterali. Gli altri stili sotto (Pressing Alto, Gegenpressing, Tiki-Taka, ecc.) sono concetti/gameplay, **non** selezionabili come team_playing_style.

### 4.1 Stili Base (5 Tipologie)
- **Possesso palla**: Gioco costruito con passaggi corti e pazienti. **Quando serve**: centrocampisti tecnici, trequartisti creativi. **Perché**: controllo partita, pazienza, circolazione palla.
- **Contropiede veloce**: Ripartenze veloci sfruttando spazi lasciati. **Quando serve**: attaccanti veloci, difensori con recupero rapido. **Perché**: velocità, passaggi verticali diretti.
- **Contrattacco**: Attacco diretto con passaggi verticali rapidi; difesa compatta, ripartenze organizzate.
- **Passaggio lungo**: Strategia basata su lanci lunghi. **Quando serve**: opportunisti, attaccanti fisici. **Perché**: verticalità, gioco aereo.
- **Vie laterali**: Attacco principalmente attraverso fasce; esterni restano larghi per allargare la difesa avversaria. **Quando serve**: esterni con cross, attaccanti completi (piedi + testa). **Perché**: equilibrio tra fasce e centro; non solo cross – costruzione anche centrale. Difesa si concentra al centro; utile contro attacchi centrali avversari.

### 4.2 Stili Offensivi
- **Attacco Diretto**: Passaggi verticali rapidi. **Quando serve**: velocità in attacco.
- **Cross e Finalizzazione**: Strategia basata su cross per attaccanti forti di testa. **Quando serve**: attaccanti con Colpo di testa, esterni con Cross preciso.
- **Attacco Centrale**: Costruzione con combinazioni corte centrali. **Quando serve**: trequartisti tecnici, possesso.

### 4.3 Stili Difensivi
- **Pressing Alto**: Difesa aggressiva per recuperare palla in zona avanzata. **Quando serve**: squadra con Resistenza alta; rischio: spazi dietro.
- **Difesa Bassa**: Linea difensiva arretrata per ridurre spazi. **Quando serve**: contro attaccanti veloci, in vantaggio.
- **Pressing Selettivo**: Intercettazione linee di passaggio. **Quando serve**: centrocampisti con Intercettazione.
- **Contenimento Difensivo**: Lasciare possesso e ripartire con contropiedi. **Quando serve**: contro possesso avversario.

### 4.4 Costruzione dal Basso
- **Costruzione Posizionale**: Manovra ragionata con passaggi corti. **Quando serve**: possesso palla, portiere con lancio corto.
- **Lancio Lungo**: Passaggi lunghi per scavalcare pressing. **Quando serve**: contro pressing alto, punta fisica per sponde.
- **Costruzione a Triangoli**: Passaggi tra CC per superare pressing. **Quando serve**: centrocampo tecnico.

### 4.5 Tattiche Speciali
- **Gegenpressing**: Recupero palla immediato dopo averla persa. **Quando serve**: squadra con Resistenza alta.
- **Tiki-Taka**: Passaggi corti continui per disorganizzare difesa. **Quando serve**: possesso, tecnica alta.
- **Catenaccio**: Difesa stretta e ripartenze rapide.
- **Pressing Costante**: Squadra sempre aggressiva. **Quando serve**: Resistenza 85+ per tutti.
- **Attacco con Esterni Alti**: Esterni rimangono larghi. **Quando serve**: ampiezza, cross.
- **Tagli Interni**: Esterni convergono verso centro. **Quando serve**: tiri a giro, spazio centrale.

---

## 5. ISTRUZIONI INDIVIDUALI (CONFIGURABILI)

**4 slot totali: 2 offensive (possesso palla), 2 difensive (senza possesso)**

### Slot Offensive (in possesso palla)
- **Difensivo**: Giocatore non si spinge troppo in avanti
- **Offensivo**: Giocatore si spinge in avanti, partecipa ad attacco
- **Ancoraggio (Anchoring)**: Resta ancorato in zona (es. mediano davanti difesa). **Regola di gioco: massimo 2 giocatori in squadra** possono avere Ancoraggio. Consigliare solo per 1-2 mediani davanti alla difesa; non assegnare a 5 giocatori.

### Slot Difensive (senza possesso palla)
- **Marcatura stretta**: Marca avversario da vicino, riduce spazio
- **Marcatura uomo**: Marca avversario specifico (man marking)
- **Contropiede**: Giocatore è riferimento per contropiede (solo CC e attaccanti)
- **Linea bassa (Deep line)**: Resta più arretrato (non assegnabile a difensori)

### Impostazioni Squadra
- **Linea alta/bassa**: Alzare/abbassare linea difensiva con frecce
- **Calci piazzati**: Primo/Secondo/Terzo attaccante per cross

---

## 6. CALCI PIAZZATI (CONFIGURABILI)

### Meccanica posizioni attaccanti (cross/corner)
- **Primo attaccante**: va sul primo palo
- **Secondo attaccante**: va al centro dell'area
- **Terzo attaccante**: va sul secondo palo

### 6.1 Punizioni Attacco
- **Scatta**: Giocatori schierati fianco a fianco prima corsa verso porta
- **Sponda al centro**: Corsa arcuata verso palo lontano
- **Scatta e mantieni**: Alcuni avanzano, altri in copertura
- **Palla all'ariete**: Strategia gioco aereo
- **Equilibrato**: Giocatori si adattano a situazione

### 6.2 Corner Attacco
- **Scatta**: Corsa dal palo lontano
- **Area piccola**: Schierati stretti vicino area rigore
- **Treno**: Disposti in verticale prima di attaccare
- **Da centrocampo**: Uno arretra leggermente dietro area
- **Due ricevitori**: Due vicino bandierina per passaggio
- **In diagonale**: Uno solo si avvicina lateralmente
- **Corner corto**: Tattiche per giocare corner corto
- **Linea laterale**: Compagno vicino bandierina per passaggio

### 6.3 Calci Piazzati Difesa
- **Marcatura a uomo**: 1 contro 1 in area
- **Marcatura a zona**: Difesa su aree designate
- **Equilibrato**: Mix tra uomo e zona
- **Palo lontano**: Forti di testa sul palo lontano

---

## 7. MECCANICHE DI GIOCO AVANZATE

### 7.1 Difesa Manuale (azioni: SOLO cosa fare)
**Nota**: qui descriviamo SOLO **azioni** e principi. **Mai** tasti/pulsanti/controller.

**Testa a Testa**: Segui l’avversario a passetti (senza buttarti), resta in traiettoria tra lui e la porta e chiudi linee di tiro/passaggio. Usalo nei 1v1 e quando difendi in area per non farti saltare.

**Contrasto di Spalla**: Ingaggia spalla a spalla quando sei affiancato e in corsa: è l’opzione più “pulita” per rubare palla senza scivolate o contrasti rischiosi.

**Pressing coordinato**: Chiama un compagno a pressare per pochi secondi **solo** quando sei vicino al portatore e hai copertura dietro. Se lo fai da lontano o senza copertura, apri spazi.

**Protezione**: Se ti pressano da dietro o di lato, usa il corpo per schermare palla e ruota per uscire dalla pressione. La riuscita aumenta se **Contatto fisico** è alto.

**Marcature**: Su piazzati difensivi scegli marcatura a uomo o a zona in base ai tuoi difensori (AerialDef, Marcatura, Intercettazione).

### 7.2 Comandi Offensivi Avanzati

**Uno-due in Avanti**: Dopo un passaggio, manda l’autore a scattare in profondità e restituisci subito palla nello spazio. È una base per superare linee compatte.

**Passaggio Sensazionale**: Passaggio più rapido e incisivo (rischio maggiore se sei chiuso). Usalo quando sei **smarcato** e hai una linea di passaggio chiara.

**Tiro Sensazionale**: Tiro più potente. Rende di più con abilità tiro speciali (es. **Tiro a scendere** / **Tiro a salire**) e quando hai tempo per orientare il corpo.

**Tiro Calibrato**: Tiro più “piazzato” e delicato. Rende di più con abilità come **A giro da distante** o **Esterno a giro**, e quando vuoi privilegiare precisione rispetto alla potenza.

**Controllo Tocco di Palla**: Alterna tocchi corti (controllo) e tocchi lunghi (cambio ritmo) per superare la pressione. Tocchi più lunghi espongono la palla: falli solo con spazio.

**Dribbling di Precisione**: Conduzione a tocchi stretti mantenendo il corpo orientato verso l’attacco. È più efficace in spazi stretti o 1v1 controllati.

### 7.3 Finte e Skill Moves

**Finte di Corpo**: Usa cambi di direzione e finte di corpo per sbilanciare il difensore prima dello scatto o del passaggio.

**Doppio Tocco**: Skill base per superare avversari.

**Elastico / Elastico inverso**: Cambio direzione rapido.

**Veronica**: Skill avanzata.

**Sombrero / Sombrero e tacco**: Passaggio alto a sé stessi.

**Svolta secca**: Cambio direzione immediato.

**Alzata di tacco**: Controllo palla avanzato.

### 7.4 Stop e Ricezione

**Voltati verso porta**: Stop orientato ad attaccare.

**Finta di stop**: Inganna difensore.

**Stop e alzata**: Controllo aereo.

**Finta con stop**: Cambio direzione dopo stop.

### 7.5 Movimenti collettivi
- **Triangolazione**: Tre giocatori formano triangolo per possesso; movimento continuo per opzioni passaggio. **Quando serve**: zona fitta, mantenere possesso sotto pressing. **Rosa**: Regista creativo, Classico n° 10, Collante; Passaggio di prima, Passaggio filtrante. **Moduli**: 4-3-3, 4-2-3-1.
- **Sovrapposizione**: Giocatore supera compagno con palla; corsa oltre per ricevere o attirare marcatore. **Quando serve**: superiorità numerica su fascia, 1v1 su fascia. **Rosa**: Terzino offensivo, Onnipresente, Specialista cross; Scatto, Cross preciso. **Moduli**: 4-3-3, 3-5-2.
- **Taglio**: Movimento diagonale verso porta, corsa senza palla in spazio. **Quando serve**: ricevere passaggio filtrante, difesa schierata, spazio tra linee. **Rosa**: Ala prolifica + Regista creativo (chi taglia + chi passa); Passaggio filtrante, Scatto; vel 85+. **Moduli**: 4-3-3, 4-2-3-1.
- **Ampiezza**: Giocatori si allargano per occupare campo; stirare difesa avversaria. **Quando serve**: creare spazi centrali, difesa compatta da aprire. **Rosa**: Specialista cross, Ala prolifica; moduli larghi (4-3-3, Vie laterali). **Moduli**: 4-3-3, 3-5-2.
- **Compattezza**: Squadra si stringe in zona ristretta; linee ravvicinate. **Quando serve**: fase difensiva, proteggere risultato. **Rosa**: Incontrista, Collante, Rientro difensivo; res alta, tac alto. **Moduli**: tutti (gestione vantaggio).

### 7.6 Situazioni di gioco
- **Transizione positiva** (riconquista → attacco): accelerazione immediata, passaggio verticale rapido; primi 5 secondi critici. **Rosa**: vel 90+, acc alto, Scatto, Passaggio filtrante; Opportunista, Punta avanzata, Giocatore chiave.
- **Transizione negativa** (perdita palla → difesa): ripiegamento immediato, pressione su portatore; primi 3 secondi per pressing, poi ripiegare. **Rosa**: tac alto, Rientro difensivo, Intercettazione, Incontrista; res alto.
- **Finalizzazione**: 1v1 portiere (spiazzamento o potenza); area affollata (tiro al volo o deviazione); fuori area (tiro potente piazzato). **Rosa**: Tiro al volo, fin alta; Tiro potente, Distanza per fuori area.
- **Gestione vantaggio**: abbassare ritmo, possesso sicuro, passaggi corti; ultimi 10-15 minuti. **Rosa**: res alta, Rientro difensivo, Marcatura; Collante, Passaggio di prima; Compattezza.
- **Recupero svantaggio**: aumentare ritmo, pressing alto, terzini alti; ultimi 10-20 minuti. **Rosa**: Giocatore chiave, Tiro potente, **Riserva di lusso (Super riserva)**; far entrare game changer; Sovrapposizione, Ampiezza.
- **Superiorità numerica**: mantenere possesso, circolare palla, attendere varco.
- **Inferiorità numerica**: compattezza estrema, difesa zona, contropiede.

### 7.7 Matrice situazione × dati × movimenti (enterprise)
Per ogni situazione: quali dati usare dalla rosa, quali movimenti, output consiglio.

| Situazione | Dati rosa | Movimenti | Output |
|------------|-----------|-----------|--------|
| Transizione positiva | vel 90+, acc, Scatto, Passaggio filtrante, Opportunista/Giocatore chiave | Taglio, Passaggio filtrante | Chi mettere, chi dare palla |
| Transizione negativa | tac, Intercettazione, Rientro difensivo, Incontrista, res | Compattezza, Ripiegamento | Chi pressare, chi coprire |
| Corner attacco | Colpo di testa, Salto, Superiorità aerea, h alto | Area piccola, Scatta, Primo/Secondo palo | Chi sui pali, chi tira (Cross preciso) |
| Punizione attacco | Calci da fermo, Specialista punizioni, Colpo di testa | Scatta, Sponda, Palla all'ariete | Chi tira, chi in area |
| Gestione vantaggio | res, Rientro difensivo, Marcatura, Collante | Compattezza, Possesso sicuro | Chi tenere, istruzioni |
| Recupero svantaggio | Giocatore chiave, Tiro potente, Riserva di lusso (Super riserva) | Sovrapposizione, Ampiezza | Chi far entrare |
| Pressing alto | res 85+, Incontrista, Intercettazione | Pressing coordinato | Chi pressare, quando |
| Difesa bassa | Regista creativo, Passaggio filtrante, Taglio | Triangolazione, Taglio | Chi crea, chi taglia |

### 7.8 Principi tattici e best practices
- **Occupazione spazio**: coprire larghezza e profondità campo; mai più di 4-5 giocatori in fase offensiva.
- **Supporto palla**: sempre 2-3 opzioni passaggio vicine.
- **Compattezza difensiva**: linee massimo 30-35 metri distanza.
- **Difesa**: marcatura passiva > pressing cieco; attacco: cambio ritmo > velocità costante.
- **Costruzione squadra**: bilanciamento offensivi/difensivi; complementarietà stili; Resistenza 85+ per 2-3 giocatori se pressing.
- **Sostituzioni**: 60-70 minuti ideale; prima che giocatori siano esausti.
- **Errori da evitare**: pressing sempre (scegliere momenti); sprint costante (esaurisce Resistenza); prevedibilità; zone scoperte.

### 7.9 Incrocio Statistiche Analisi (uso comandi ultime 10 partite) con Rosa (abilità, posizioni, stili)

Quando nel RIASSUNTO ANALISI è presente la sezione **"Statistiche di gioco (Analisi eFootball, ultime 10 partite)"**, incrocia l’**uso comandi** (percentuali/conteggi) con la **Rosa** (Abilità in rosa, posizioni, stili) per dedurre se alcune statistiche sono **sottoutilizzate o sovrautilizzate rispetto al profilo squadra**.

**Mappatura comando (schermata Analisi) → cosa guardare in rosa**

| Categoria Analisi | Voce alta % / uso | Abilità / statistiche rilevanti in rosa | Se in rosa mancano → consiglio |
|------------------|-------------------|-----------------------------------------|--------------------------------|
| **Passaggio** | Passaggio filtrante rasoterra / alto (es. 37%+ passaggio filtrante rasoterra) | **Passaggio filtrante**, Passaggio di prima, Passaggio dosato; stat Passaggio rasoterra/alto | "Usi molto il passaggio filtrante; se in rosa pochi hanno Passaggio filtrante/Passaggio di prima, i passaggi in profondità possono essere imprecisi. Diversifica con passaggio rasoterra corto o schiera chi ha quelle abilità; oppure aggiungile con Programmi (se non Trending)." |
| **Passaggio** | Cross / Cross basso (basso %) | **Cross preciso**, Specialista cross; stat Passaggio alto; ali/terzini con abilità cross | "Usi poco i cross; se hai ali/terzini con Cross preciso o Colpo di testa in area, puoi sfruttarli di più con cross dalla fascia." |
| **Tiro** | Normale (es. 83%+) e Tiro calibrato basso | **Tiro calibrato** rende con **A giro da distante**, **Esterno a giro** (§7.2); Finalizzazione; punte con abilità tiro | "Usi soprattutto tiro normale; se hai punte con Tiro a giro / A giro da distante, prova più spesso il Tiro calibrato per piazzare meglio." |
| **Tiro** | Pallonetto / Tiro sensazionale (basso %) | Controllo pallonetto; Tiro a scendere/Tiro a salire; portiere in uscita → pallonetto | "Pallonetto e tiro sensazionale poco usati; utili su portiere in uscita o da distanza con giocatori che hanno le abilità." |
| **Tipo di gol** | Passaggio filtrante rasoterra (es. 47% gol) | Come sopra: Passaggio filtrante, smarcamenti (stili Opportunista, Ala prolifica, Taglio al centro) | Coerente con uso passaggio; verifica che chi riceve abbia stili/abilità per gli inserimenti (Scatto, Finalizzazione). |
| **Dribbling** | Scatta (es. 62%) | Stat **Velocità**, **Accelerazione**, **Controllo palla**, **Dribbling**; abilità Scatto | Se Velocità/Accelerazione basse in rosa, lo Scatta può portare a molte perdite palla; privilegia conduzione "Normale" o posizionamento. |
| **Dribbling** | Dribbling di precisione (basso %) | **Controllo di suola**, **Doppio tocco**, Dribbling di precisione (§7.2); spazi stretti | Se hai giocatori tecnici (Controllo di suola, Doppio tocco) puoi usare di più il dribbling di precisione in 1v1. |
| **Difesa** | Pressa / Movimento / Testa a testa | **Comportamento difensivo**, **Contrasto**, **Aggressività**; abilità Intercettazione, Contrasto Aggressivo, Marcatura | Uso bilanciato; se Pressa alta ma pochi in rosa con Aggressività/Intercettazione, il pressing può essere inefficace → consiglia più Movimento/posizionamento. |
| **Comandi speciali** | Chiama pressing (basso, es. 1) | Centrocampisti/attaccanti con Coinvolgimento difensivo, Aggressività | "Usi poco Chiama pressing; se i tuoi centrocampisti hanno buona Aggressività/Coinvolgimento difensivo, puoi aumentare il pressing coordinato." |
| **Comandi speciali** | Cambio cursore (molto alto, es. 219) | — | Può indicare difesa molto manuale; verifica che non sia compensazione per posizionamento o linea difensiva (compattezza, istruzioni). |

**Regola per l’AI**: Non inventare percentuali; usa solo quelle presenti in "Statistiche di gioco". Se la sezione non c’è (utente non ha caricato screenshot), non dedurre dati dalla schermata Analisi. Quando incroci, cita **Abilità in rosa** (lista nel RIASSUNTO) e, se rilevante, posizioni/stili (es. "i tuoi registi/TrQ hanno Passaggio filtrante?"). Suggerisci sempre in modo costruttivo: diversificare uso comandi, schierare chi ha le abilità adatte, o aggiungere abilità con Programmi (se non Trending).

### 7.10 Consigli community Dream Team (Efootball Arena, creator)

Fonti: [Efootball Arena – How to Build a Competitive Dream Team](https://efootballarena.blog/how-to-build-a-competitive-efootball-dream-team/), creator (tipo Mattiotti: Analisi, Build, Voti). Adattati per **rosa esistente** e consiglio tattico.

**Spina dorsale (priorità costruzione)**: PT → DC → CC → A → Terzini. Una squadra competitiva si fonda su: portiere solido, difensori centrali, centrocampisti, attaccante di riferimento; i terzini completano.

**Formazioni meta e quando suggerirle**:
- **4-2-2-2**: Equilibrio perfetto per principianti; grande per bilanciamento attacco-difesa.
- **4-2-3-1**: Stabilità difensiva, focalizzato su contropiedi; compatto.
- **4-3-3 / 4-3-3 Narrow**: Dominio centrocampo, preferito dai professionisti; richiede terzini di qualità.
- **3-5-2**: Sovrapposizione centrocampo, rischioso ma potente; esterni supportano difesa.



**Allocazione per ruolo (quando suggerire chi schierare)**:
- Creatori (TrQ, registi): controllo palla e passaggio massimizzati; Passaggio filtrante, Passaggio di prima.
- Attaccanti: finalizzazione e velocità; mix tra velocità (Opportunista, Punta avanzata) e potenza (Fulcro, Rapace d'area).
- Centrocampisti: bilanciare difesa e creazione; mediani versatili (Collante, Box-to-Box).
- Difesa: almeno un MED/CDM solido davanti alla linea; mai trascurare i terzini.

**Link-Up Play** (Connection Focal Point + Key Man): migliora sinergia attaccanti; posizionamento 10-15 m durante costruzione. Verificare che Focal Point e Key Man siano presenti in rosa per attivare i bonus.

**Errori comuni da evitare** (community):
1. Trascurare la gestione della Resistenza (sostituzioni 60-70', non tenere chi ha res bassa negli ultimi 15').
2. Cambiare formazione troppo spesso.
3. Ignorare la difesa (sempre almeno un mediano solido).
4. Schierare stellari fuori posizione (competenza posizione influenza forza complessiva).
5. Squadra solo offensiva: serve equilibrio attacco-difesa.

**Adattamento al meta**: Se meta difensiva → 4-2-3-1; se meta contropiedi → 4-2-2-2; se meta possesso → 4-3-3 Narrow. Flessibilità chiave; consigliare sempre in base a rosa + competenza allenatore (≥70).

### 7.11 Squadra bloccata – Checklist e Smart Assist (frustrazioni community)

**Squadra bloccata (attacco sterile, sconfitte ripetute)**:
1. Stile squadra ↔ rosa: verificare fit (es. Opportunista + Contropiede; Fulcro + Passaggio lungo).
2. Formazione: dalla cronologia, quale formazione avversaria più comune? Applicare contromisure §14.
3. Connection: Focal Point e Key Man in campo?
4. Sostituzioni: Riserva di lusso in panchina? Chi far entrare al 60' per recupero svantaggio?
5. Abilità vs uso comandi: incrocio §7.9; suggerire schierare chi ha abilità adatte o diversificare comandi.
6. Difesa bassa avversaria: possesso paziente, Regista creativo, ampiezza; 4-3-3 o 4-2-3-1.
7. Gestione vantaggio: compattezza, Collante, res alta; non tenere chi ha res bassa negli ultimi 15'.

**Smart Assist** (molti giocatori sentono che penalizza chi non lo usa; Konami bandito dal competitivo 2025):
- Se l'utente lo lamenta: VALIDARE ("Capisco, molti nella community lo segnalano"), NON negare.
- Se smart_assist=no nel profilo: adattare i consigli (passaggi precisi, posizionamento, abilità Passaggio di prima/filtrante, formazione che riduce pressione sui passaggi difficili).
- NON discutere se "è giusto o sbagliato"; offrire sempre un passo concreto.

**Tone**: Empatia + azioni concrete. NON commentare scripting o meccaniche di engine.

---

## 8. ABILITÀ GIOCATORI (MISTE: NATIVE FISSE + AGGIUNGIBILI)

**REGOLA FONDAMENTALE**:
- **Abilità native**: FISSE (con cui nasce la card)
- **Abilità aggiuntive**: MODIFICABILI tramite "Programmi Aggiunta Abilità"
- **Max 6 slot abilità totali** per giocatore
- **NON modificabili per giocatori TRENDING**
- **Modificabili per**: In evidenza, In risalto, Epico, Leggendario, Standard

### 8.1 Abilità Tiro
- **Tiro al volo**: Tiri precisi di prima intenzione dopo stop. **Quando serve**: attaccanti, finalizzatori rapidi; letale in area su assist veloci.
- **Tiro a giro**: Tiri con effetto. **Quando serve**: angoli stretti, fin di palo.
- **Tiro Potente**: Tiri con maggiore potenza. **Quando serve**: fuori area, portiere in uscita.
- **Punta di Precisione**: Tiri precisi in area. **Quando serve**: finalizzatori.
- **Tiro a scendere**: Tiri con traiettoria discendente. **Quando serve**: tiri da distanza.
- **Tiro a salire**: Tiri con traiettoria ascendente. **Quando serve**: tiri speciali.
- **A giro da distante**: Tiri a giro da fuori area. **Quando serve**: centrocampisti offensivi.
- **Esterno a giro**: Tiri a giro con esterno piede. **Quando serve**: angolazioni particolari.
- **Colpo di testa**: Conclusioni di testa più accurate *in fase d'attacco* (tiro di testa verso porta). **Quando serve**: attaccanti fisici, cross; timing migliore su palloni aerei. **NOTA**: NON è abilità difensiva; per duelli aerei in difesa vedi Dominio palle alte (§8.4). Dare Colpo di testa al difensore che mandi *in avanti* sui corner.
- **Tiro acrobatico**: Tiri acrobatici (rovesciate, ecc.). **Quando serve**: area affollata, posizioni scomode.
- **Finalizzazione**: Precisione in conclusione. **Quando serve**: attaccanti, punte.
- **Distanza**: Tiri precisi da lontano. **Quando serve**: centrocampisti offensivi, tiri da fuori area.

### 8.2 Abilità Passaggio

**Statistiche vs Abilità (Comunità)**: La statistica Passaggio 90+ aumenta la *velocità di esecuzione* del passaggio; le abilità Passaggio di prima e/o Passaggio filtrante ne migliorano *accuratezza* e sbloccano un'*animazione migliore*. Un giocatore con 90+ in passaggio ma senza abilità di passaggio rende meno di uno con abilità corrette.

**Passaggio illuminante / Passaggio visionario** (Showtime): NON sostituiscono Passaggio filtrante, di prima o calibrato. Sono **cumulabili**; chi ha illuminante o visionario dovrebbe aggiungere (se non le ha) Passaggio di prima, Passaggio filtrante e Passaggio calibrato.

**A chi dare abilità di passaggio (Comunità)**:
- **Punte**: almeno Passaggio di prima (essenziale per scambi 1-2)
- **DC**: almeno Passaggio di prima (animazione giusta per smistare subito dopo intercetto; Passaggio a scavalcare migliora anche disimpegno)
- **MED e terzini**: obbligatorie tutte le abilità di passaggio; terzini offensivi aggiungere Cross calibrato
- **CC**: si può fare a meno di Passaggio calibrato (ne usufruiscono meglio i mediani); aggiungere Cross calibrato (onnipresenti si trovano in fascia in attacco)
- **TrQ e seconde punte**: come mediani, meglio se le hanno tutte (di prima, calibrato, a scavalcare, filtrante)

- **Passaggio di prima**: Passaggi rapidi e diretti di prima intenzione. **Quando serve**: triangolazioni veloci, gioco di prima, contro difese compatte.
- **Passaggio al volo**: Controllo e passaggio in un solo tocco. **Quando serve**: triangolazioni rapide, prima intenzione.
- **Passaggio filtrante**: Passaggi in profondità precisi. **Quando serve**: registi, creatori; fondamentale per smarcare attaccanti.
- **Lancio lungo preciso**: Passaggi lunghi accurati. **Quando serve**: costruzione dal basso, cambi gioco, contropiede.
- **Cross preciso**: Cross dalla fascia più precisi. **Quando serve**: esterni, terzini offensivi; cross normali meno efficaci.
- **Passaggio sensazionale**: Passaggi potenti e incisivi (più rischio se sei chiuso)
- **Passaggio senza guardare**: Passaggio senza guardare ricevente; spiazza avversari. **Quando serve**: creatori, gioco imprevedibile.
- **Passaggio dosato**: Passaggi lunghi/filtranti con backspin per migliore precisione. **Quando serve**: registi, cambi gioco.
- **Passaggio alto rasoterra**: Passaggio lungo con traiettoria bassa quando appropriato. **Quando serve**: costruzione, contropiede.
- **Rabona**: Esecuzione in rabona; passaggio o tiro imprevedibile. **Quando serve**: creatori tecnici.
- **Tocco di tacco**: Passaggio o tiro di tacco anche da posizioni scomode. **Quando serve**: assist improvvisi, finalizzatori.

### 8.3 Abilità Dribbling e Controllo
- **Doppio tocco**: Skill base cambio direzione. **Quando serve**: ali, dribblatori; efficace in 1v1.
- **Elastico**: Cambio direzione rapido con esterno. **Quando serve**: 1v1, spazi stretti.
- **Controllo di suola**: Controllo palla con suola. **Quando serve**: spazi stretti, protezione palla.
- **Doppio tocco speciale**: Combo Doppio tocco + Elastico + Controllo suola. **Quando serve**: dribblatori tecnici.
- **Stop acrobatico**: Controllo palla acrobatico. **Quando serve**: passaggi difficili, posizioni scomode.
- **Finta tiro**: Finta tiro per ingannare difensore. **Quando serve**: 1v1 in area.
- **Finta passaggio**: Finta passaggio. **Quando serve**: aprire linee di passaggio.
- **Tocco secco**: Spinta palla rapida in avanti per cambiare ritmo. **Quando serve**: spazio davanti, accelerazione improvvisa.
- **Protezione**: Proteggere palla con corpo. **Quando serve**: pressione alta, spalle alla porta.

### 8.4 Abilità Difensive
- **Contrasto Aggressivo**: Tackle aggressivi con minori falli
- **Intercettazione**: Intercettare passaggi più facilmente. **Quando serve**: difensori, mediani; prioritaria per recupero palla.
- **Marcatura**: Marcare avversario più efficacemente
- **Entrata aggressiva**: Contrasti più efficaci
- **Sliding tackle**: Tackle scorrevoli efficaci
- **Rientro difensivo**: Rientra rapidamente in fase difensiva dopo fase offensiva. **Quando serve**: centrocampisti, Box-to-Box, ali offensive.
- **Blocco**: Maggiore efficacia nel bloccare passaggi e tiri. **Quando serve**: difensori centrali, mediani.
- **Stoppaggio acrobatico**: Stoppate acrobatiche con i piedi. **Quando serve**: difensori, interventi di emergenza in area.
- **Superiorità aerea**: Maggiore probabilità di vincere duelli aerei. **Quando serve**: difensori centrali, attaccanti fisici, cross.
- **Dominio palle alte**: Abilità *difensiva* per duelli aerei; Colpo di testa (§8.1) è invece per tiro di testa in attacco. Su palla alta difensiva, con **posizionamento** e **timing** puoi anticipare l’avversario anche senza Dominio palle alte, ma l’abilità aumenta la probabilità di vincere il duello.

### 8.5 Abilità Portiere
- **Riflessi Felini**: Parate ravvicinate miracolose. **Quando serve**: portieri, 1v1.
- **Presa sicura**: Afferrare palla invece di respingere. **Quando serve**: ridurre ribalzi.
- **Uscita portiere**: Uscite più sicure. **Quando serve**: linea alta, passaggi filtranti.
- **Parata con piedi**: Parate con piedi su tiri bassi. **Quando serve**: tiri rasoterra.
- **Piazzamento**: Posizionamento ottimale in porta.
- **Estensione PT**: Copertura maggiore porta. **Quando serve**: tiri angolati.

### 8.6 Abilità Fisiche e Atletiche
- **Scatto**: Accelerazione esplosiva. **Quando serve**: attaccanti, ali, contropiede.
- **Resistenza superiore**: Maggiore resistenza alla fatica. **Quando serve**: Box-to-Box, terzini, pressing.
- **Forza fisica**: Maggiore potenza fisica. **Quando serve**: duelli, protezione palla.
- **Agilità superiore**: Maggiore agilità. **Quando serve**: dribblatori, 1v1.
- **Salto**: Salto più potente. **Quando serve**: difensori, attaccanti su cross.
- **Velocità**: Velocità massima superiore. **Quando serve**: ali, attaccanti veloci.

### 8.7 Abilità Speciali e Leadership
- **Leader**: Ispira compagni, riduce impatto fatica squadra. **Quando serve**: partite lunghe, giocatori chiave.
- **Specialista cross**: Cross più precisi e pericolosi. **Quando serve**: esterni, Vie laterali.
- **Specialista punizioni**: Punizioni più precise. **Quando serve**: tiratori punizioni.
- **Specialista rigori**: Rigori più sicuri. **Quando serve**: tiratori designati.
- **Tiratore**: Tiri da fuori area più precisi. **Quando serve**: centrocampisti offensivi, tiri da distanza.
- **Lancio lungo**: Maggiore ampiezza lancio dalle mani (laterali/portieri). **Quando serve**: rinvii rapidi.
- **Riserva di lusso** (Super riserva): Prestazioni migliorate quando subentra in corso partita. **Quando serve**: panchinari d’impatto, cambi tattici.
- **Spirito combattivo**: Prestazioni migliori sotto pressione e fatica. **Quando serve**: Box-to-Box, mediani, pressing. **Comunità**: ideale per tutti gli 11; fondamentale per DC, MED e TrQ (smistano palloni in spazi ridotti). I TrQ hanno spesso Resistenza bassa: anche se li sostituisci al 46', Spirito combattivo li aiuta già al primo tempo (intorno al 30' la Resistenza cala e influisce su lucidità e rapidità). Riduce impatto fatica, migliora anche gestione Resistenza.
- **Tattica** (astuzia): Maggiore probabilità di ottenere falli quando appropriato. **EVITARE su difensori**: Konami gestisce male l'abilità, effetto contrario – più falli a sfavore. Dare a centrocampisti/attaccanti se utile.

### 8.8 Programmi Aggiunta Abilità
- **Disponibile per**: In evidenza, In risalto, Epico, Leggendario, Standard
- **NON disponibile per**: Trending (già max livello)
- **Come funziona**: Usa programmi per far apprendere abilità al giocatore
- **Max slot**: 6 abilità totali (native + aggiunte)

### 8.9 Priorità abilità per ruolo (per consigli)
Quando si consigliano abilità da aggiungere (tramite Programmi, se non Trending): **Attaccanti** → Tiro al volo, Colpo di testa (se fisico), Tiro acrobatico, Controllo pallonetto; **Registi** → Passaggio filtrante, Passaggio di prima, Passaggio dosato; **Mediani** → Intercettazione, Contrasto Aggressivo, Rientro difensivo, Spirito combattivo; **Difensori** → Intercettazione, Marcatura, Colpo di testa, Superiorità aerea, Blocco; **Ali** → Doppio tocco, Cross preciso, Rientro difensivo; **Terzini** → Intercettazione, Cross preciso (se offensivi); **Riserve d'impatto** → **Riserva di lusso (Super riserva)**. Evitare abilità difensive su attaccanti puri; evitare abilità offensive su difensori centrali; max 2-3 abilità dribbling per giocatore.

### 8.10 Abilità obbligatorie per ruolo (Comunità)
Carta forte senza abilità corrette non renderà in game come dovrebbe. **Obbligatorie** per ruolo (il resto è di contorno):

**LINEA DIFENSIVA**: muro, marcatore, intercettazione, dominio palle alte, scivolata, spirito combattivo. Almeno uno in squadra con Leader. **EVITARE Tattica** (astuzia) sui difensori: Konami gestisce male, falli a sfavore.

**MEDIANA**: stesso blocco difesa + **Passaggio a scavalcare**. **EVITARE Tornante** su mediano centrale, soprattutto se Collante: lo trasforma in simil onnipresente, va a zonzo in zone non competenti.

**CENTROCAMPO**: tornante, dominio palle alte, intercettazione, muro, passaggio di prima, passaggio filtrante. Se CC difensivo (quasi mediano): aggiungere marcatore. Opzionale: cross calibrato (onnipresenti in fascia), colpo di testa, tiro; Controllo di suola migliora animazioni anche senza skill input.

**TREQUARTISTI e seconde punte**: passaggio di prima, passaggio filtrante, passaggio calibrato, tiro di prima, tiro dalla distanza, spirito combattivo. Opzionale: esterno a giro, A giro da distante (migliora uso piede forte), skill.

**ATTACCANTI**: passaggio di prima (essenziale 1-2), tiro di prima, tiro dalla distanza, colpo di testa, A giro da distante, dominio palle alte (per sponda su lanci lunghi da portiere/difensori). Opzionale: passaggio filtrante. **A giro da distante**: su ribattuta tira con piede forte sul secondo palo invece che debole al primo palo.

**SPIRITO COMBATTIVO**: ideale per tutti gli 11; fondamentale per DC, MED, TrQ (spazi ridotti; TrQ con Resistenza bassa calano già al 30' – Spirito combattivo aiuta anche se sostituiti al 46').

**RISERVA DI LUSSO (Super riserva)**: agisce già dal primo minuto del secondo tempo (non solo dal 60'). Massima efficacia su game changer: farli subentrare al secondo tempo è molto più impattante che schierarli titolari.

---

## 9. COMPETENZE E SVILUPPO

### Frecce forma
- **Freccia Su**: forma ottimale, prestazioni migliorate
- **Freccia Giù**: forma scarsa, prestazioni ridotte
- **Neutro**: forma normale
L'influenza sulle prestazioni è significativa; considerare le frecce quando si scelgono titolari.

### 9.1 Tipologie Giocatori (Squadra dei Sogni)
- **Trending**: Max livello, immediatamente schierabili
- **In evidenza**: Personalizzabili
- **In risalto**: Personalizzabili e potenziabili
- **Epico**: Alte potenzialità crescita
- **Leggendario**: Prestazioni elevate e costanti
- **Standard**: Giocatori base, personalizzabili

### 9.2 Competenza Posizione
**Livelli**:
- **Basso**: Nessun colore
- **Intermedio**: Verde sfumato
- **Alto**: Verde brillante

**Apprendimento**:
- Massimo 2 slot competenze posizione
- Programmi Aggiunta Posizione per acquisire nuove posizioni
- Portieri e campo non interscambiabili

**Impatto su stile (§2.2)**: Con competenza Bassa o assente, lo stile giocatore **non si attiva** (passiva spenta se fuori ruolo). La forza complessiva scende; il giocatore si posiziona peggio rispetto a quando è in ruolo. Priorità: preferire sempre giocatori in posizione di competenza; se inevitabile fuori ruolo, usare Istruzioni individuali per compensare (es. Deep Line, Anchoring).

### 9.3 Valore Giocatore (VG)
Valutazione massima 5 stelle (5★). Trending valutati su statistiche iniziali. Altri tipi su statistiche + potenziale.

### 9.4 Forza base e Forza complessiva
- **Forza base**: valutazione pura delle statistiche del giocatore (Overall, Velocità, Tiro, ecc.).
- **Forza complessiva**: tiene conto di forza base, alchimia di squadra, competenza nella posizione, compatibilità stile con allenatore. È il parametro più rappresentativo della prestazione effettiva in campo. Quando si consiglia formazione o sostituzioni, considerare la forza complessiva, non solo la base.

---

## 10. POLICY COACH AI (riferimento)

Le policy comportamentali per il Coach AI (errori da evitare, terminologia, anti-inferenza, esempi risposta) sono definite **nel system prompt** del route `app/api/assistant-chat/route.js` (costanti `COACH_AI_POLICIES_IT` / `COACH_AI_POLICIES_EN`).

**Motivo**: sono vincoli sempre attivi, non "conoscenza contestuale" da recuperare via RAG. Il RAG potrebbe escluderle per limite caratteri o ordine sezioni; nel system prompt sono garantite ad ogni richiesta chat.

**Contromisure** (`countermeasuresHelper.js`) e **analyze-match** hanno regole specifiche nei rispettivi prompt.

---

**Versione**: 8.5.0 ENTERPRISE | **Data**: 10 Febbraio 2026
**Principio**: FISSO vs CONFIGURABILE | **Terminologia**: Ufficiale eFootball
**Changelog 8.5**: §10 (NOTE CRITICHE) spostato da RAG a system prompt assistant-chat. Policy Coach AI ora in COACH_AI_POLICIES_* (sempre attive). RAG contiene solo meccaniche eFootball (§1-9).
**Changelog 8.4**: §2.2 Attivazione stile e posizione ("passiva spenta se fuori ruolo"): stile non si attiva fuori competenza; §9.2 cross-ref; regola 5 FUORI RUOLO in NOTE CRITICHE; esempi risposta su giocatore che non rende.
**Changelog 8.3**: §7.10 Consigli community Dream Team; §7.11 Squadra bloccata + Smart Assist.
**Changelog 8.2**: §7.5 Movimenti collegati a rosa (stili, abilità, moduli); §7.6 Situazioni collegati a rosa; §7.7 Matrice situazione×dati×movimenti enterprise; contesto buildPersonalContext: forma, h/w, avversario per partita, voti partita; output coach: solo soluzione, no ragionamento esposto.
**Changelog 8.1**: Integrazione consigli community: §8.2 Passaggi (statistiche vs abilità, cumulabilità illuminante/visionario, a chi dare per ruolo); §8.1 Colpo di testa vs §8.4 Dominio palle alte; §8.7 Spirito combattivo, Riserva di lusso (Super riserva), Tattica (astuzia – evitare su difensori); §8.10 Abilità obbligatorie per ruolo (linea difensiva, mediana, centrocampo, trq, attaccanti), avvertimenti Tornante NO mediano/collante.
**Changelog 8.0**: Descrizioni ricche §2 §4 §8; §1.6 Soglie/build; §9.4 Forza base/complessiva; §7.5-7.7 Movimenti, Situazioni; §8.9 Priorità abilità.
