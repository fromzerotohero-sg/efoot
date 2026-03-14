# Audit UX: Impostazioni profilo e Hero Points

Audit richiesto: migliorare UX impostazioni profilo, considerare Hero Points, allineamento; quando salvi non si capisce se ha preso o no. **Solo analisi, nessun codice.**

---

## 1. Cosa ho guardato

- **app/impostazioni-profilo/page.jsx** – Pagina “Impostazioni Profilo” (dati personali, gioco, preferenze IA, esperienza; barra profilazione; pulsanti Salva/Skip per sezione).
- **app/gestione-profilo/page.jsx** – Pagina “Gestione profilo” (Hero Points, analisi totali, rank, attività recente, CTA Acquista / Personalizza avatar).
- **app/api/supabase/save-profile/route.js** – API di salvataggio profilo e risposta.
- Uso di success/error e posizione messaggi; collegamento tra le due pagine e con la dashboard.

---

## 2. Problema principale: “Quando salvi non si capisce se ha preso o no”

### 2.1 Dove appare il feedback

- **Successo**: messaggio verde con CheckCircle2 e testo tipo “Dati personali salvato con successo!” (sectionName + `t('profileSectionSaved')`).
- **Errore**: messaggio rosso con AlertCircle e `error`.
- Entrambi sono **un solo blocco in cima alla pagina**, subito sotto l’header e la **barra Profilazione** (linee 275–310).

### 2.2 Perché non si capisce

1. **Feedback lontano dall’azione**  
   L’utente clicca “Salva” in basso a una sezione (es. “Dati Gioco” o “Preferenze IA”). Il messaggio di successo compare **sempre in alto**. Se la pagina è lunga o su mobile, la zona del bottone è fuori viewport: l’utente non vede il messaggio senza scrollare. Non c’è feedback **vicino al pulsante** o alla sezione appena salvata.

2. **Feedback breve e unico**  
   Il successo scompare dopo **3 secondi** (`setTimeout(() => setSuccess(null), 3000)`). Se l’utente sta ancora guardando un’altra sezione o il bottone, può perdere il messaggio. Un solo stato globale `success`/`error`: non si capisce **quale** sezione è stata salvata se non si legge il testo in quei 3 secondi.

3. **Bottone “Salvataggio...” poco evidente**  
   Durante il salvataggio il bottone passa a “Salvataggio...” e si disabilita (grigio). È coerente ma: (a) su mobile il pulsante può essere piccolo; (b) non c’è uno spinner/icona di caricamento chiara sul bottone; (c) se la richiesta è veloce, “Salvataggio...” appare e scompare in un attimo e l’utente può dubitare che sia successo qualcosa.

4. **Successo legato a `data.profile`**  
   Il messaggio di successo viene mostrato solo se `data.profile` esiste (dopo `response.ok`). L’API oggi restituisce sempre `profile` in caso di successo, ma se in futuro la risposta cambiasse e non includesse `profile`, il salvataggio sarebbe andato a buon fine ma **nessun messaggio** apparirebbe. L’utente non avrebbe alcun feedback positivo.

5. **Nessun feedback “salvato” persistente sulla sezione**  
   Dopo il save non c’è uno stato tipo “Salvato” sulla card/sezione (icona o badge). La barra Profilazione si aggiorna (percentuale e livello) ma è in alto: chi ha appena salvato “Esperienza Gioco” non ha un segnale visivo **sulla sezione** che confermi che è stata quella a essere salvata.

---

## 3. Allineamento e coerenza

### 3.1 Due pagine “profilo” non collegate

- **Impostazioni profilo** (`/impostazioni-profilo`): modifica nome, squadra, divisione, preferenze IA, problemi, ore di gioco; barra completamento profilo.
- **Gestione profilo** (`/gestione-profilo`): Hero Points, transazioni, rank, CTA Acquista / Personalizza avatar.

Dalla **dashboard** si va a:
- “Gestione profilo” (card/link) → `/gestione-profilo`
- “Impostazioni” (altro link) → `/impostazioni-profilo`

Problemi:
- In **impostazioni-profilo** non c’è **nessun riferimento a Hero Points** né link a “Gestione profilo” (crediti/transazioni). Chi vuole vedere il bilancio o acquistare crediti da lì non può.
- In **gestione-profilo** non c’è un link chiaro a “Impostazioni profilo” per modificare nome, squadra, ecc. L’utente può pensare che “Gestione profilo” sia il posto per tutto il profilo e non trovare dove cambiare i dati anagrafici.

Risultato: le due funzioni (dati profilo vs crediti/Hero Points) sono separate ma non collegate in modo esplicito; l’allineamento “profilo = impostazioni + gestione” non è guidato dall’interfaccia.

### 3.2 Pattern di feedback nel resto dell’app

- **gestione-formazione**: usa un **toast** (messaggio in overlay, tipicamente in basso o in un angolo) che appare in prossimità dell’azione e scompare dopo un po’. Il feedback è vicino al contesto (assegnazione giocatore, salvataggio formazione, impostazioni tattiche).
- **impostazioni-profilo**: usa un **banner in cima** unico per successo/errore. Pattern diverso e meno adatto a una pagina lunga con più sezioni e più pulsanti Salva.

Quindi: **mancato allineamento** con il pattern “feedback vicino all’azione” già usato in formazione.

### 3.3 Hero Points in impostazioni-profilo

- In **impostazioni-profilo** non compaiono crediti né Hero Points.
- Il prodotto oggi ha due “facce”: (1) completamento profilo e preferenze; (2) utilizzo crediti e acquisti. La pagina impostazioni copre solo (1). Per un’UX che “migliora anche in vista degli Hero Points” avrebbe senso:
  - mostrare almeno il **saldo corrente** (come in CreditsBar) e/o
  - un link “Vai a Gestione profilo” (Hero Points e attività) così l’utente collega profilo e crediti senza dover ricordare la dashboard.

---

## 4. Dettaglio tecnico (senza scrivere codice)

### 4.1 Flusso di salvataggio (impostazioni-profilo)

1. `handleSave(sectionName)` viene chiamato con il nome della sezione (es. “Dati personali”).
2. `setSaving(true)`, `setError(null)`, `setSuccess(null)`.
3. `fetch('/api/supabase/save-profile', { method: 'POST', body: JSON.stringify(profile) })`.
4. Se `!response.ok`: si legge `error` dal JSON e si fa `setError(...)`; dopo 5 secondi si resetta l’errore.
5. Se `response.ok`: si fa `await response.json()`. Se esiste `data.profile`, si aggiorna `profileData` con `profile_completion_score` e `profile_completion_level`, si imposta `setSuccess(sectionName + ' ' + t('profileSectionSaved'))` e si programma `setSuccess(null)` dopo 3 secondi.
6. `finally`: `setSaving(false)`.

Punto critico: se la risposta è 200 ma senza `profile` (caso anomalo o API futura), l’utente non vede mai un messaggio di successo; vede solo il bottone che torna da “Salvataggio...” a “Salva”.

### 4.2 API save-profile

- Restituisce `{ success: true, profile: { id, profile_completion_score, profile_completion_level, ...campi profilo } }`.
- Il commento in route indica che un trigger DB calcola `profile_completion_score`; l’upsert fa `.select(...).single()` e restituisce il profilo aggiornato. Quindi in condizioni normali `data.profile` c’è sempre.
- **Bug (codice irraggiungibile)**: subito dopo il `return NextResponse.json(...)` (circa riga 196) c’è un blocco che importa e chiama `updateAIKnowledgeScore`. Quel codice non viene mai eseguito perché c’è già un return. L’aggiornamento dello AI Knowledge Score dopo il save profilo non avviene da qui (potrebbe avvenire da altro punto; da questa route no).

### 4.3 Barra Profilazione

- Legge `completionScore` e `completionLevel` da `profileData?.profile_completion_score` e `profileData?.profile_completion_level`.
- Dopo il save, `setProfileData` viene chiamato con un oggetto che ha **solo** queste due chiavi. Quindi la barra si aggiorna correttamente, ma `profileData` non contiene più i campi profilo (first_name, ecc.). Nel resto della pagina attuale non si usano altri campi di `profileData`, quindi non si creano bug visibili; è solo un’inconsistenza (oggetto “parziale” dopo il primo save).

---

## 5. Riepilogo problemi (cosa vedo)

| Problema | Dove | Impatto |
|----------|------|--------|
| Feedback successo/errore **solo in cima** alla pagina | impostazioni-profilo | Su pagina lunga/mobile l’utente non vede se il salvataggio è andato a buon fine senza scrollare. |
| Successo **scompare dopo 3 secondi** | impostazioni-profilo | Facile perdere il messaggio; nessun segno persistente “salvato” sulla sezione. |
| Successo mostrato **solo se** `data.profile` esiste | impostazioni-profilo | In caso di risposta 200 senza `profile`, nessun feedback positivo. |
| **Nessun link** da Impostazioni profilo a Gestione profilo (Hero Points) | impostazioni-profilo | L’utente non collega profilo e crediti; Hero Points “nascosti” da impostazioni. |
| **Nessun link** da Gestione profilo a Impostazioni profilo | gestione-profilo | Chi è in “Gestione profilo” non trova dove modificare nome/squadra/dati. |
| **Hero Points non visibili** in Impostazioni profilo | impostazioni-profilo | UX “migliorata per Hero Points” richiederebbe almeno saldo o link. |
| Pattern feedback **diverso** da gestione-formazione (toast) | impostazioni-profilo | Incoerenza: in formazione il feedback è vicino all’azione, in profilo è solo in alto. |
| **Codice morto** dopo return in save-profile (updateAIKnowledgeScore) | save-profile route | Lo score “conoscenza IA” non viene aggiornato da questa route dopo il save. |
| **CTA “Acquista” e “Vedi tutte transazioni”** con `onClick={() => {}}` | gestione-profilo | Pulsanti non fanno nulla; documentato altrove ma rilevante per allineamento UX. |

---

## 6. Cosa migliorerebbe l’UX (solo indicazioni)

- **Feedback vicino all’azione**: messaggio di successo/errore **per sezione** (sotto o accanto al pulsante Salva della sezione) oppure toast come in gestione-formazione, così l’utente vede subito l’esito senza guardare in alto.
- **Segnale “Salvato” persistente**: dopo un save riuscito, mostrare sulla sezione (es. icona + “Salvato”) per qualche secondo o fino al prossimo salvataggio, oltre al messaggio temporaneo.
- **Successo anche senza `profile`**: in caso di `response.ok`, mostrare almeno “Salvato” (o messaggio generico) anche se `data.profile` manca.
- **Collegare le due pagine**: in Impostazioni profilo aggiungere saldo Hero Points (o link “Vai a Gestione profilo”); in Gestione profilo aggiungere link “Modifica dati profilo” → impostazioni-profilo.
- **Allineare il pattern**: considerare toast (o feedback inline) anche in impostazioni-profilo per coerenza con gestione-formazione.
- **Bottone Salva**: opzionalmente spinner/icona di caricamento più evidente durante “Salvataggio...”.
- **Route save-profile**: spostare la chiamata a `updateAIKnowledgeScore` **prima** del return (o in un blocco eseguito prima del return) se si vuole che lo score si aggiorni dopo il save profilo.

Fine audit.
