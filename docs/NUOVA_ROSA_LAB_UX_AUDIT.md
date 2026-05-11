# Audit UX / coerenza — `app/nuova-rosa-lab/page.jsx`

Documento di revisione **solo sul codice della pagina lab** (ril. basata su analisi statica del repository).  
Scopo: priorità pulsanti, chiarezza dei flussi, incongruenze rispetto alla vecchia `gestione-formazione`, rischi per l’utente finale.

---

## 1. Scope e componenti coinvolti

| Superficie | Funzione / blocco | Ruolo |
|------------|-------------------|--------|
| Campo | `SlotCard` / `SlotPlayerCard` | Tap → pannello rapido |
| Overlay “leggero” | `QuickPlayerPanel` | Dettaglio giocatore + azioni rapide |
| Overlay “pesante” | `PremiumPlayerModal` | Editor completo (stats, skills, boosters, salva) |
| Catalogo | `CatalogPickerModal` | Scelta carta / riserve / ricerca |
| Altri | `EnterpriseBoostersModal`, `EnterprisePlayerEditorModal`, conferme | Flussi secondari |

---

## 2. Criticità alta (impatto su chiarezza / affidabilità)

### 2.1 Testo “solo OVR” vs editor reale nel `PremiumPlayerModal`

- Nella sezione **“Setup giocatore”** è mostrata una nota che dice (IT) che i dati base sono fissi e **“qui puoi modificare solo OVR”**.
- Nello **stesso modal**, subito sotto, sono presenti **tutte le statistiche** modificabili tramite `CompactStatInput` (attacco, difesa, atletismo, portiere), più **skills** e **boosters** editabili, e il pulsante **Salva giocatore** invia anche `base_stats`, `skills`, `available_boosters` (vedi `handlePremiumPlayerSave` → `PATCH /api/players/:id`).

**Valutazione:** la **copy non corrisponde al comportamento**. L’utente (e il PM) possono credere che solo l’OVR conti, mentre il form consente e salva molto di più. È la principale fonte di confusione rispetto al reclamo “tutto insieme nel modal” + percezione sbagliata dei permessi di modifica.

**Indicazione:** allineare messaggio a scelte prodotto:

- se **solo OVR** deve essere editabile qui → nascondere o disabilitare griglie stats / skills / boosters da questo modal; oppure  
- se **tutto** deve essere editabile → riformulare la nota (nessun “solo OVR”) e valutare gerarchia/sezioni (accordion, passi).

### 2.2 Un solo modal con obiettivi multipli (priorità concorrenti)

Nel `PremiumPlayerModal` compaiono in sequenza:

1. Hero + riepilogo  
2. Setup OVR + nota  
3. Barra: altra carta, sposta riserva, elimina  
4. **Scegli dalle riserve** (se titolare su slot)  
5. **Griglie statistiche** estese  
6. **Skills**  
7. **Boosters**  
8. Footer Annulla / Salva  

Confronto con la **vecchia** `AssignModal` (`gestione-formazione`): lì le stats sono in sola lettura in sezioni espandibili; competenze e boosters “forti” vanno su **altri modal**; lista riserve è un blocco dopo le sezioni informative.

**Valutazione:** non è un “errore di tasto” isolato, è un **modello informativo diverso**: più funzioni nella stessa vista → carico cognitivo alto (confermato dai feedback utente).

---

## 3. Priorità e stile dei pulsanti

### 3.1 `QuickPlayerPanel` (primo tap)

Ordine attuale (se giocatore titolare):

1. **Primario** (`nr-primary-button`): **Sposta in riserva**  
2. Secondari: **Modifica giocatore**, **Carica foto**  
3. Riga secondaria: **Scegli un’altra carta**, **Modifica boosters**, **Elimina definitivamente**

Confronto legacy: in `AssignModal` il CTA principale in basso tende a essere **“Completa profilo / Vai al giocatore”** (navigazione verso profilo), non lo spostamento in riserva come unico blu.

**Valutazione:** **priorità discutibile** per l’uso più frequente “voglio vedere / sistemare il giocatore”:

- Dare **primario** a “Sposta in riserva” può spingere errori (tap involontario) e mette un’azione semidistruttiva prima di “modifica” più innocua.  
- Proposta prodotto tipica: primario = **Modifica / Apri editor** o **Continua**, oppure mantenere gerarchia più vicina alla vecchia (profilo o editor secondario senza enfatizzare lo spostamento).

### 3.2 `PremiumPlayerModal`

- La barra (`nr-premium-toolbar-row`) è tutta **secondary** tranne **Elimina** (danger) — coerente per “area strumenti”.
- Il CTA strutturale è il **Salva giocatore** in footer (primario) — coerente per un form.

**Valutazione OK** per un form, a patto di risolvere la nota “solo OVR” (sezione 2.1).

### 3.3 `CatalogPickerModal`

- **Primario**: Assegna allo slot / Aggiungi in riserva (corretto).  
- **Secondari**: manuale per slot, caricamento foto — coerenti.

Nella colonna risultati, in modalità slot, **“Scegli dalle riserve”** sta **prima** dei suggeriti — buona priorità per sostituzione rapida.

---

## 4. Incoerenze tecniche / manutenzione

### 4.1 Prop `onOpenBoosters` su `PremiumPlayerModal`

Il parent passa `onOpenBoosters` al `PremiumPlayerModal`, ma la funzione **non dichiara né usa** questa prop nei parametri destrutturati. In pratica:

- **Non c’è pulsante** “Modifica boosters” delegato al modal dedicato dentro l’editor premium; i boosters si gestiscono **inline** nella stessa vista.
- La callback passata dal parent è **inutilizzata** (silenziosa in React).

Il `QuickPlayerPanel` invece usa correttamente **“Modifica boosters”** → `EnterpriseBoostersModal`.

**Valutazione:** incoerenza **flusso Quick vs Premium**; codice morto lato prop; da ripulire o collegare esplicitamente alla UX scelta (solo inline vs solo modal separato).

---

## 5. Confronto sintetico lab vs vecchia gestione

| Aspetto | Vecchia `AssignModal` | Lab oggi (`PremiumPlayerModal` + `QuickPlayerPanel`) |
|--------|----------------------|------------------------------------------------------|
| Lettura stats | Accordion, principalmente **read-only** | Input su tutte le sezioni nel premium |
| Competenze / boosters “forti” | Bottone in header → **altro modal** | Skills/boosters nello stesso modal premium |
| Lista riserve per swap | Dopo le sezioni info, box dedicato | Anche in premium + già in catalog picker (slot) |
| CTA forte in fondo | Profilo / completezza | Premium: Salva; Quick: Sposta in riserva (primario) |

---

## 6. Sintesi per stakeholder (PM)

1. **Messaggio “solo OVR”** vs form completo: va **deciso a livello prodotto** e allineato (testo + UI), altrimenti l’utente non sa cosa è “ufficiale”.
2. **Un solo modal mega-editor** è coerente col codice ma **non** con la UX della vecchia rosa: priorità e riduzione carico = intervento strutturato (non solo “un altro bottone”).
3. **Quick panel**: rivedere chi deve essere il **primario** (probabilmente non “Sposta in riserva” per tutti i contesti).
4. **Pulizia**: rimuovere o usare la prop `onOpenBoosters` su `PremiumPlayerModal` per non ingannare chi mantiene il codice.

---

## 7. Possibili prossimi passi (solo proposta)

- Allineamento **copy ↔ permessi di modifica** (minimo indispensable).  
- Ripartizione **consultazione vs modifica**: es. accordion read-only + un solo punto “Modifica statistiche”.  
- Allineamento **priorità pulsanti Quick** alla vecchia o a ricerca UX (card sorting).  
- Tab o step dedicati solo se il team accetta refactor più ampio.

---

*Generato da audit sul codice sorgente; non include test E2E né feedback analytics.*
