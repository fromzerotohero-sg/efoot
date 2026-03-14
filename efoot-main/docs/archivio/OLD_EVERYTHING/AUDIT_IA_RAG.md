# Audit IA (Chat Coach) e RAG – Report preciso

**Data**: 2026-02-08  
**Scope**: Flusso IA (assistant-chat), contenuto e retrieval RAG (info_rag.md + ragHelper), allineamento reciproco.  
**Escluso**: Nessuna modifica codice; solo analisi e raccomandazioni.

---

## 0. Risposte rapide (versione, conoscenza, chi ragiona)

**Con che versione risponde la chat?**  
Una sola: **system** = `buildSystemContent(lang)`, **user prompt** = `buildPersonalizedPrompt(...)`. Una sola versione (niente v1/v2). In documentazione: “prompt capsule” / “enterprise”.

**Prende tutta la conoscenza e fa i ragionamenti?**  
- **Conoscenza**: Sì, per la chat eFootball. Il RAG invia **tutto** info_rag.md via `getAllSectionsForChat()`: **OBIETTIVO** + **CONTESTO VIDEOGIOCO (FONDAMENTALE)** (regola oro) + sezioni 1–10 (incl. ESEMPI RISPOSTE in §10), ordine `CHAT_SECTION_TITLES`. Il contesto personale (rosa, partite, coach, pattern) è sempre inviato ma troncato a 6200 caratteri. Il modello vede “rilevanti” per la domanda + tutti i dati cliente disponibili nel budget.  
- **Ragionamenti**: Sì, ma li fa **il modello**. I micro-score (FIT, COACH_OK, SPD, PASS, WIN, AIR_DEF, AIR_ATK, SUB), il decision engine e il ragionamento inverso sono **istruzioni nella capsule**: noi non li calcoliamo nel backend. Il modello legge dati + capsule + RAG e applica la logica in modo interno. Se il modello non segue bene la capsule o il RAG è parziale, il ragionamento può essere incompleto.

**OpenAI non li fa già da sola?**  
Sì. Il ragionamento è **tutto lato OpenAI (gpt-4o)**. Noi forniamo: (a) i dati (rosa, partite, coach, sezioni RAG), (b) le istruzioni su come ragionare (capsule + system), (c) i vincoli. Il modello fa da solo: interpreta la capsule, “calcola” mentalmente i micro-score, sceglie la leva e produce la risposta. Non c’è un nostro motore che pre-calcola FIT/PASS/WIN ecc.: è il LLM che viene guidato a farlo. Per avere ragionamenti più deterministici bisognerebbe introdurre un feature extractor che calcoli i micro-score nel backend e li passi in chiaro nel contesto (next step opzionale in REFACTOR_PROMPT_CHAT_ENTERPRISE.md).

---

## 1. Executive summary

- **IA**: Flusso chiaro (contesto personale + RAG se eFootball + prompt capsule v2 + sanitizzazione). Prompt riferisce §3.4, §5, §7 senza numerazione interna; il RAG usa titoli `## 3. MODULI...` e sottosezioni `### 3.4`, `## 5`, `## 7`: interpretabile ma non univoco.
- **RAG**: Struttura allineata al prodotto (FISSO vs CONFIGURABILE, regola oro, 5 stili squadra, Riserva di lusso, NO Tattica su difensori, NO Tornante su Collante). Per la **chat**: RAG completo (OBIETTIVO + CONTESTO + 1–10) con regola oro e esempi §10; per analyze-match/countermeasures: retrieval keyword-based con `getRelevantSectionsForContext`.
- **Allineamento**: Vincoli hard duplicati (system prompt + capsule user + RAG §10/§8). Terminologia coerente (Riserva di lusso / Super riserva, Dominio palle alte ≠ Colpo di testa). Unico punto debole: riferimenti "§3.4", "§5", "§7" nel prompt non hanno corrispondenza testuale esatta nel RAG (il RAG usa "Sezione 5", "3.4 Limiti...").
- **Documentazione**: `REFACTOR_PROMPT_CHAT_ENTERPRISE.md` contiene **testo duplicato**: dopo la parte operativa (§1–7) è incollata la vecchia specifica "Da discutere (non implementato)". Va ripulito per evitare confusione.

---

## 2. Audit IA (Chat Coach)

### 2.1 Flusso end-to-end

1. **Input**: `message`, `currentPage`, `appState`, `history` (max 10 messaggi, 2000 caratteri/messaggio).
2. **Classificazione**: `classifyQuestion(message)` → `efootball` | `platform`. Solo se `efootball` viene caricato il RAG: **tutto il RAG** (`getAllSectionsForChat()` – OBIETTIVO + CONTESTO [regola oro] + sezioni 1–10 [incl. esempi §10], ~56k caratteri).
3. **Contesto personale**: `buildPersonalContext(userId, lang)` sempre eseguito (rosa, partite, tattica, allenatore, pattern). Max 6200 caratteri.
4. **Prompt**: `buildPersonalizedPrompt(..., efootballKnowledge, personalContextSummary, hasHistory)` assembla: contesto utente, blocco ROSA E DATI, blocco RAG (se presente), capsule engine, regole suggerimenti, domanda cliente.
5. **System**: `buildSystemContent(lang)` fissa scope, divieto tasti/pulsanti, fonti, vincoli hard, formato output.
6. **Chiamata**: OpenAI `gpt-4o`, temperature 0.7, max_tokens 450.
7. **Post-processing**: `parseSuggestionsFromContent` estrae 3 suggerimenti; `sanitizeCoachOutput` rimuove frasi con marcatori di ragionamento (perché, dato che, ho analizzato, ecc.).

### 2.2 Punti di forza IA

- **Un solo percorso**: nessun branch v1/v2; una sola capsule e un solo system.
- **Contesto ricco**: titolari + riserve con position, stile, overall, stats (vel/acc/res/fin/pas/tac), forma, h/w, competenze, abilità (prime 5); partite con formation_played, playing_style_played, opponent_formation, result, attack_areas, voti cliente (solo cliente); coach con competenze stili; pattern (formation_usage, recurring_issues).
- **Label esplicite**: POSIZIONE vs COMPETENZE con istruzione a correggere mismatch; competenze stili con soglia 70 e distinzione contrattacco ≠ contropiede_veloce.
- **Sanitizzazione**: riduce rischio che il modello esponga ragionamento; marker IT/EN coprono le forme più comuni.

### 2.3 Rischio e limiti IA

- **Domande "platform"**: Se l’utente scrive solo termini platform (es. "dove trovo le impostazioni"), il RAG non viene caricato. Il system dice comunque di rispondere solo per consigli tattici e di non spiegare l’app. Comportamento coerente ma da tenere presente per metriche (es. "quante risposte senza RAG").
- **Capsule molto compressa**: Micro-score, decision engine e inverse reasoning sono istruzioni in linguaggio naturale; il modello deve "calcolarli" mentalmente. Variabilità possibile su roster complessi.
- **Riferimenti § nel prompt**: La capsule dice "istruzioni solo §5", "limiti moduli §3.4", "gameplay solo cosa fare da §7". Nel RAG le sezioni sono "## 5. ISTRUZIONI...", "### 3.4 Limiti di schieramento...", "## 7. MECCANICHE...". Il modello riceve il testo delle sezioni RAG senza i simboli "§5"/"§3.4"/"§7"; l’associazione è per titolo/numerazione. Funziona ma non è esplicita nel testo RAG (non c’è una riga "§5 = Istruzioni individuali").
- **max_tokens 450**: Su risposte lunghe con blocco SUGGERIMENTI il testo finale può essere troncato; 450 è comunque adeguato per "max 3 frasi + In sintesi + 3 suggerimenti".

### 2.4 Suggerimenti (parser e fallback)

- I suggerimenti sono estratti dal contenuto AI con parser che cerca "SUGGERIMENTI:" / "Suggerimenti:" e liste 1. 2. 3. o -.
- Se il modello non emette il blocco o il parser non trova 1–3 voci, si usano `getDefaultSuggestions(lang, currentPage)` per pagina (gestione-formazione, match/new, match/, contromisure, allenatori, default).
- La regola "1 verticale, 1 gameplay, 1 meta/info" è nella capsule ma non verificata server-side; dipende dal rispetto del modello.

---

## 3. Audit RAG

### 3.1 Struttura info_rag.md

- **Sezioni principali**: OBIETTIVO, CONTESTO VIDEOGIOCO, 1–10 (Statistiche, Stili giocatore, Moduli, Stili squadra, Istruzioni, Calci piazzati, Meccaniche, Abilità, Competenze, Note critiche). Changelog in coda.
- **Numerazione**: Titoli `## N. TITOLO`; sottosezioni `### N.M` (es. 3.4, 7.5, 7.6, 7.7). Coerente con i riferimenti § del prompt (§3.4 = sottosezione 3.4, §5 = sezione 5, §7 = sezione 7).
- **Contenuto §7**: 7.1–7.4 azioni "SOLO cosa fare", esplicitamente "Mai tasti/pulsanti/controller"; 7.5 Movimenti, 7.6 Situazioni, 7.7 Matrice; 7.8 Principi. Allineato all’obiettivo "gameplay solo cosa fare da §7".

### 3.2 Retrieval (ragHelper)

- **Parsing**: Il file è splittato per `^## (.+)$`; ogni blocco è `{ title, content }`. La sezione 10 (NOTE CRITICHE) è **sempre** selezionata per prima e non conta nel budget delle altre, così non viene mai esclusa da sezioni lunghe.
- **Scoring**: Per ogni sezione (tranne la 10) si conta quante keyword della sezione compaiono nel messaggio normalizzato (minuscolo, no accenti, spazi normalizzati). Bonus +3 per la sezione 7 se il messaggio contiene hint di gameplay (come difendere, pressing, partita, calci piazzati, ecc.).
- **Selezione**: Sezioni ordinate per score; si riempie il budget (default 18000 caratteri) con le sezioni a score più alto. Fallback: se dopo la 10 restano meno di 3 sezioni, si aggiungono fino a 4 sezioni dalla lista ordinata per score.
- **Filtro stili**: Per la sezione "2. STILI GIOCATORE" si applica `getStiliContentFilteredByRole`: se il messaggio riguarda un solo ruolo (attaccanti / centrocampisti / difensori) si restituisce solo il sotto-blocco #### corrispondente per ridurre token.

### 3.3 Keyword e copertura

- **SECTION_KEYWORDS**: Mappatura titolo → lista keyword. Es.: §8 include "super riserva", "riserva di lusso", "tattica", "tornante", "colpo di testa", "dominio palle alte", ecc. Adeguata per domande esplicite su abilità e ruoli.
- **Rischio**: Domande molto generiche ("consigliami", "come miglioro") possono matchare poche keyword e far entrare poche sezioni oltre la 10; la 10 comunque richiama regole globali (FISSO vs CONFIGURABILE, istruzioni solo §5, abilità solo §8, ecc.), quindi il minimo indispensabile c’è.
- **EFOOTBALL_TERMS** (classifyQuestion): Ampia lista IT/EN per stili, moduli, meccaniche, consigli. Se nessun termine eFootball e nessun termine platform → default `efootball`. Quindi in dubbio si carica il RAG.

### 3.4 Allineamento RAG con vincoli prodotto

- **5 stili squadra**: In §4 è scritto esplicitamente che in app (team_playing_style) sono configurabili **solo** 5 (Possesso palla, Contropiede veloce, Contrattacco, Passaggio lungo, Vie laterali). Coerente con system e capsule.
- **Riserva di lusso**: In §8 e §7.7 usato "Riserva di lusso (Super riserva)"; in §8.10 e note "RISERVA DI LUSSO (Super riserva)". Prodotto IT = "Riserva di lusso"; alias RAG/dati = "Super riserva". Coerente.
- **Tattica (astuzia)**: §8 e §10 dicono di EVITARE su difensori (effetto contrario, falli a sfavore). Coerente con prompt.
- **Tornante / Box-to-Box su Collante**: §8.10 "EVITARE Tornante su mediano centrale, soprattutto se Collante". Prompt EN: "NO Box-to-box (Tornante) on an Anchor Man DM, especially if Collante/Anchor Man". Coerente.
- **Dominio palle alte ≠ Colpo di testa**: §8 distingue chiaramente (difesa vs attacco). Coerente con prompt.
- **Istruzioni individuali**: §5 elenca slot offensive/difensive e restrizioni (Linea bassa non ai difensori, Contropiede solo CC/ATT, Ancoraggio max 2). §10 ripete "SOLO quelle della sezione 5". Coerente.
- **Limiti moduli**: §3.4 "Limiti di schieramento per ruolo" (A 1–5, C 1–6, D 2–5, PT fisso, max 2 P, max 1 EDA/ESA, ecc.). Coerente con "limiti moduli §3.4" nel prompt.

### 3.5 Punti deboli RAG (senza codice)

- **Assenza riferimenti § nel testo**: Nel RAG non compare una legenda del tipo "§5 = Istruzioni individuali (questa sezione)". Il modello vede i titoli "## 5. ISTRUZIONI INDIVIDUALI" e "### 3.4 Limiti di schieramento"; la mappatura con "§5" e "§3.4" è implicita. Potrebbe aiutare una frase in cima a §10 o in OBIETTIVO: "Riferimenti usati nel prompt: §3.4 = sottosezione 3.4 Moduli, §5 = sezione 5 Istruzioni, §7 = sezione 7 Meccaniche."
- **Cache**: Contenuto e sezioni sono in cache in memoria; se info_rag.md viene aggiornato a runtime (es. deploy senza restart), la cache non si invalida. Comportamento da considerare in fase di release (di solito si riavvia il processo).
- **Budget 18000**: Con sezione 10 sempre inclusa e 2–4 sezioni aggiuntive, il totale può essere elevato; il contesto utente (max 6200) + RAG + capsule + messaggio restano comunque entro limiti ragionevoli per gpt-4o. Nessun problema rilevato.

---

## 4. Allineamento IA–RAG

### 4.1 Vincoli duplicati (intenzionale)

- **NO tasti/pulsanti**: System ("VIETATO citare tasti/pulsanti/controller"), capsule ("gameplay solo 'cosa fare'"), RAG §7.1 ("Mai tasti/pulsanti/controller"). Ridondanza voluta per massima priorità.
- **Solo 5 stili squadra**: System, capsule e RAG §4 / §10. Coerente.
- **NO Tattica su difensori, NO Tornante su MED Collante**: System, capsule (IT/EN), RAG §8 e §10. Coerente.
- **Dominio palle alte ≠ Colpo di testa**: System, capsule, RAG §8. Coerente.
- **Solo nomi in ROSA / solo dati dal blocco**: System e capsule; RAG §10 ("NON suggerire di cercare/filtrare... usa SOLO CONTESTO PERSONALE"). Coerente.

### 4.2 Terminologia

- **Resistenza**: RAG §1 usa "Resistenza (NON Stamina)" per output IT; prompt e contesto usano "res" e label "Resistenza". Coerente.
- **Riserva di lusso / Super riserva**: RAG e prompt usano entrambe le forme con chiarimento; ragHelper ha keyword "riserva di lusso" e "super riserva" per §8. Coerente.

### 4.3 Gap identificati

- **Riferimento § esplicito**: Il prompt dice "§5", "§3.4", "§7" ma nel RAG non c’è una riga che dica "questa sezione è la §5". Gap minore ma migliorabile con una frase in info_rag (es. in §10 o OBIETTIVO).
- **Sezione 10 sempre presente**: Garantisce che le note critiche e i divieti siano sempre in contesto; nessun gap.
- **Classificazione platform**: Con domanda classificata platform, RAG = ''; il system invita comunque a rispondere solo per tattica e a non spiegare l’app. Comportamento coerente; l’unico “gap” è che per domande ibride (es. "dove carico la partita e che modulo mi consigli") la classificazione è binaria (efootball vs platform) e potrebbe prevalere platform → nessun RAG. Da tenere presente per eventuali log o metriche.

---

## 5. Documentazione

### 5.1 REFACTOR_PROMPT_CHAT_ENTERPRISE.md

- **Contenuto attuale**: Da riga 1 a circa 109 è la **documentazione operativa** (Stato attivo, obiettivo, fonti dati, motore decisionale, output contract, coerenza suggerimenti, stato implementazione, next step). Da circa riga 110 in poi è incollata la **vecchia specifica** ("Stato: Da discutere (non implementato)", "Refactoring del prompt", ecc.) con sezioni 1–8 della specifica estesa.
- **Problema**: Due “documenti” in uno: il primo descrive lo stato reale; il secondo descrive uno stato “da discutere” e piani di refactoring. Chi legge può confondersi su cosa sia implementato e cosa no.
- **Raccomandazione**: Rimuovere tutto il blocco dalla riga che inizia con "# Prompt Chat – Specifica Enterprise (Motore Decisionale + Refactoring)" fino alla fine del file, lasciando solo la parte operativa (§1–7). Eventualmente archiviare la specifica lunga in un secondo file (es. `docs/SPEC_PROMPT_ENTERPRISE_ESTESA.md`) se serve conservarla come riferimento.

### 5.2 Coerenza doc vs codice

- La doc operativa cita correttamente: prompt capsule v2, sanitizeCoachOutput, RAG senza tasti, ragHelper con "riserva di lusso", micro-score non calcolati server-side. Coerente con route.js e ragHelper.

---

## 6. Raccomandazioni (senza codice)

1. **Pulizia REFACTOR_PROMPT_CHAT_ENTERPRISE.md**: Eliminare la parte “vecchia specifica” dal file corrente (o spostarla in un file separato) per avere un solo documento “stato reale” del prompt engine.
2. **Riferimenti § nel RAG**: Aggiungere in info_rag.md (in OBIETTIVO o all’inizio di §10) una frase unica che mappi esplicitamente: §3.4 = limiti moduli (sottosezione 3.4), §5 = Istruzioni individuali (sezione 5), §7 = Meccaniche di gioco (sezione 7). Così il modello ha un ancoraggio testuale se il prompt usa "§5"/"§3.4"/"§7".
3. **Metriche (opzionale)**: Loggare se la risposta è stata generata con RAG vuoto (classifyQuestion = platform) per monitorare quante risposte “senza conoscenza RAG” si hanno.
4. **Cache RAG**: Documentare in README o in doc che il contenuto di info_rag.md è in cache in memoria e che modifiche al file richiedono restart del processo (o chiarire se in produzione il file non viene mai modificato a caldo).
5. **Suggerimenti**: La regola “1 verticale, 1 gameplay, 1 meta” non è verificabile server-side; eventuale estensione futura potrebbe prevedere un controllo di coerenza (es. keyword) o lasciare come è con consapevolezza che dipende dal modello.

---

## 7. Conclusioni

- **IA**: Architettura solida, un solo flusso, contesto ricco, sanitizzazione efficace. Rischio principale è la variabilità del modello sui micro-score (non calcolati) e il riferimento § implicito rispetto al RAG.
- **RAG**: Struttura e contenuto allineati al prodotto; retrieval keyword-based con sezione 10 sempre inclusa; terminologia e vincoli hard coerenti con il prompt. Migliorabile con legenda § e documentazione cache.
- **Insieme**: Allineamento IA–RAG buono; vincoli duplicati sono intenzionali. Unico intervento consigliato a breve è la pulizia del file di documentazione e, se si vuole, la frase esplicita sui § in info_rag.
