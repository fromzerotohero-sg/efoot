# Audit: Chat Coach – ripetitività, contrattacco/sostituzioni, combinazioni di tasti

Data audit: 2026-02-07. Richiesta: la chat sembra consigliare sempre contrattacco e cambi; non si vogliono combinazioni di tasti ma solo **cosa fare**; ripete sempre le stesse cose.

---

## 1. Perché sembra consigliare sempre contrattacco e sostituzioni

### 1.1 Suggerimenti iniziali (UI) sempre uguali

In **`components/AssistantChat.jsx`** e **`app/api/assistant-chat/route.js`** (funzione `getDefaultSuggestions`) i **suggerimenti cliccabili** per pagina sono fissi:

- **Gestione formazione**: "Come usare meglio il contropiede in partita?" / "How to use counter-attack better in a match?"
- **Contromisure**: "Come usare il contrattacco in partita?" / "How to use counter-attack in a match?"
- **Allenatori**: "Come sfruttare lo stile in partita?" (spesso interpretato come stile squadra → contrattacco/contropiede)

L’utente vede sempre le stesse domande e clicca spesso su “contrattacco” o “contropiede” → il modello risponde spesso su quegli stessi temi. **Causa**: poca varietà nei suggerimenti (mancano pressing, possesso, linea difensiva, calci piazzati, modulo, solo formazione, ecc.).

### 1.2 System prompt che ripete sempre gli stessi temi

Nel **system prompt** (route `assistant-chat`) compaiono in modo ricorrente:

- "formazione, rosa, **modulo, sostituzioni**, stile"
- "1 GAMEPLAY: ... Come usare meglio il **contropiede/contrattacco** in partita?"
- Esempi di ragionamento tipo: "CAMBIA STILE" → Contrattacco; "Metti [Nome] al posto di [Nome]"
- Regole SUGGERIMENTI: "1 GAMEPLAY (es. Come usare meglio il contropiede/**contrattacco** in partita?)"

Il modello è quindi **spinto esplicitamente** verso contrattacco/contropiede e sostituzioni come esempi di “cosa consigliare”. Manca un’istruzione chiara a **variare** in base a: rosa, partite, problemi ricorrenti, situazione (difesa/attacco/calci piazzati), invece di dare sempre lo stesso tipo di consiglio.

### 1.3 Come dovrebbe comportarsi un vero coach (riferimento)

Da letteratura su comunicazione del coach:

- **Specifico e variato**: evitare consigli generici ripetuti; adattare il feedback alla situazione (avversario, partite recenti, punti deboli).
- **Variare tipo di consiglio**: non solo “cambia modulo / fai sostituzioni / usa contrattacco”, ma anche linea difensiva, pressing, possesso, transizioni, calci piazzati, istruzioni individuali.
- **Principi prima dei dettagli**: spiegare **cosa fare** (obiettivo, principio) e non solo “premi questo tasto”.

Nel nostro prompt non c’è una regola tipo: “Varia i consigli in base a rosa/partite/contesto; non proporre sempre contrattacco e sostituzioni”.

---

## 2. Perché menziona le combinazioni di tasti

### 2.1 Esempio esplicito nel prompt

Nel system message dettagliato (buildAssistantContext / prompt utente) c’è un **esempio** che dice letteralmente:

- *"Usa **Testa a Testa (⚪/B)** per seguire l'avversario e **Contrasto di Spalla (R1/RB)** quando corri affiancato. **Chiama Pressing (⚪/B)** ..."*

L’utente ha chiesto di **non** dire le combinazioni di tasti ma solo **cosa fare**. Quel esempio insegna al modello a rispondere con tasti/controller (⚪, B, R1, RB).

### 2.2 Istruzione SCOPE che invita ai “comandi”

Nel systemContent (breve) c’è:

- *"INCLUDE anche consigli sul GAMEPLAY ... **comandi (testa a testa, contrasto spalla, chiama pressing)**"*

E nella tabella RAG:

- *"Gameplay (come difendo, pressing, **comandi**, calci piazzati, skill) | ## 7 MECCANICHE ... **Comandi ufficiali (testa a testa, contrasto spalla, chiama pressing)**"*

Qui “comandi” è ambiguo: può essere interpretato come “cosa fare” oppure come “quali tasti premere”. Il RAG (**`info_rag.md`** sez. 7) contiene le **combinazioni letterali** (R1, L1+X, ⚪, B, ecc.). Quando il modello cerca in RAG per “come difendere” / “pressing”, recupera quella sezione e tende a ripetere i tasti.

### 2.3 Cosa serve

- **Vietare esplicitamente** di citare tasti, pulsanti, R1/L1, ⚪/B, combinazioni controller/keyboard.
- **Prescrivere**: per il gameplay descrivere solo **l’azione** (cosa fare: “segui l’avversario a passetti”, “contrasto spalla a spalla”, “chiedi pressing ai compagni”) **senza** riferimenti a tasti o pulsanti.
- **Esempio corretto**: sostituire l’esempio “Testa a Testa (⚪/B) … R1/RB” con una versione solo “cosa fare”.

---

## 3. Perché “ripete sempre le stesse cose”

### 3.1 Schema fisso risposta + suggerimenti

Il formato obbligatorio è:

- Risposta (max 3 frasi) + "In sintesi: [azione]"
- **SUGGERIMENTI**: 1 verticale, **1 gameplay**, 1 meta/info

La “1 GAMEPLAY” è spesso generata su un sottoinsieme ristretto: “Come usare contropiede/contrattacco in partita?”, “Come difendere meglio?”, “Quali comandi per pressing?”. Essendo sempre lo stesso schema (1 verticale, 1 gameplay, 1 meta), e il gameplay spesso ancorato a contrattacco/difesa/pressing, le **prossime domande suggerite** sono molto simili → l’utente clicca di nuovo su temi simili → risposta ripetitiva.

### 3.2 Poca varietà nei suggerimenti iniziali

Vedi §1.1: stesse frasi per formazione, contromisure, allenatori. Manca rotazione con:

- pressing / compattezza / linea alta-bassa
- possesso / costruzione / triangolazioni
- calci piazzati (corner, punizioni)
- istruzioni individuali (ancoraggio, marcatura, contropiede su slot)
- “Quale istruzione abbinare a…?” invece di solo “Quale modulo?”

### 3.3 MODO COACH con esempi ripetitivi

La sezione “MODO COACH - RAGIONAMENTO” e “ESEMPI RAGIONAMENTO” contengono più volte:

- cambio stile → Contrattacco
- “Metti [Nome] al posto di [Nome]”
- “sostituzioni”, “modulo”

Manca una frase tipo: “Varia il tipo di consiglio: non limitarti a sostituzioni e contrattacco; includi linea, pressing, possesso, istruzioni, calci piazzati quando rilevanti.”

---

## 4. Riepilogo cause e azioni

| Problema | Causa principale | Azione |
|----------|------------------|--------|
| Sempre contrattacco/sostituzioni | Suggerimenti UI e prompt che spingono sempre su contrattacco/contropiede/sostituzioni; nessuna istruzione a variare | Variare suggerimenti default; aggiungere regola “varia consigli in base a contesto; non proporre sempre contrattacco e sostituzioni” |
| Combinazioni di tasti | Esempio con ⚪/B, R1/RB; RAG sez. 7 con tasti; assenza di divieto esplicito | Vietare tasti/pulsanti/combinazioni; riscrivere esempio solo “cosa fare”; opzionale filtrare/sintetizzare RAG sez. 7 in risposta senza tasti |
| Ripetitività | Schema fisso (1 verticale, 1 gameplay, 1 meta) e gameplay spesso uguale; esempi MODO COACH ripetitivi | Variare suggerimenti; istruzione a variare tipo di consiglio e domande suggerite in base a rosa/partite/contesto |

---

## 5. Riferimenti codice

- **Suggerimenti default**: `components/AssistantChat.jsx` (initialSuggestions), `app/api/assistant-chat/route.js` (`getDefaultSuggestions`)
- **System prompt lungo** (esempi, MODO COACH, regole suggerimenti): `app/api/assistant-chat/route.js` (buildAssistantContext → stringa prompt)
- **System breve** (SCOPE, vietati): `app/api/assistant-chat/route.js` (systemContent prima di openAIMessages)
- **RAG meccaniche/tasti**: `info_rag.md` sezione 7; `lib/ragHelper.js` (SECTION_KEYWORDS per sez. 7)

---

## 6. Modifiche applicate

- Vietare in prompt: mai citare tasti, pulsanti, R1/L1, ⚪/B, combinazioni; solo descrivere **cosa fare**.
- Esempio “Come difendo meglio?”: riscritto senza tasti (solo azioni).
- Suggerimenti default: variati (pressing, possesso, linea, calci piazzati, istruzioni) e ridotta presenza fissa di “contrattacco/contropiede”.
- Regola aggiunta: variare i consigli in base a rosa/partite/contesto; non proporre sempre contrattacco e sostituzioni; includere quando rilevante linea, pressing, possesso, istruzioni, calci piazzati.
- Tabella RAG sez. 7 e regole meccaniche: Gameplay = "Descrivi SOLO COSA FARE"; VIETATO tasti/pulsanti. Suggerimenti (3 domande): gameplay da variare (pressing, possesso, linea, calci piazzati). Suggerimenti default UI: "pressing e compattezza", "istruzioni individuali", "chiudere gli spazi", "calci piazzati", "linea alta/bassa", "costruzione e possesso" al posto di contrattacco/contropiede.
