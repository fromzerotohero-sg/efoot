# Piano UX enterprise: guida il cliente, fiducia, responsività

**Obiettivo:** piattaforma enterprise che **guida** il cliente, spiega l’importanza della profilazione, rassicura su “ragionamenti e calcoli da conoscenza solida”, e resta intuitiva su **tutti i dispositivi**.

**Ruoli considerati:** web design, product manager, esperienza cliente (primo accesso, ritorno, power user).

---

## 0. Principi fondanti (non negoziabili)

- **Siamo una guida.** Siamo i primi al mondo in questo spazio: il prodotto deve **guidare** l’utente in ogni schermata. Ogni pagina deve rispondere a “dove sono?”, “cosa faccio qui?”, “qual è il prossimo passo?”. Nessuna schermata “muta”: sempre contesto, ordine consigliato e CTA chiare.
- **Responsività obbligatoria.** Ogni layout, componente e modale deve essere **responsivo** (mobile-first dove possibile). Breakpoint coerenti, touch target ≥ 44px su mobile, niente overflow orizzontale, priorità visiva corretta su small viewport. Vedi `docs/UX_RESPONSIVE_LINEE_GUIDA.md`.
- **UX allineata ovunque.** Stessi pattern (gerarchia, spaziatura, CTA, messaggi “perché”), stesse chiavi i18n, stesso tono (guida + fiducia). Una sola “voce” della piattaforma.

**Allineamento:** ogni nuova pagina o componente deve rispettare questi tre principi; le modifiche esistenti devono portare verso di essi senza eccezioni.

---

## 1. Cosa manca oggi (gap rispetto a “enterprise che guida”)

### 1.1 Messaggio “perché profilarsi”
- **Barra Conoscenza:** dice “0–100%” e “Completa profilo, rosa, partite” ma **non spiega in una riga perché** (es. “I consigli sono basati su questi dati: più sono completi, più sono su misura”).
- **AiInfoModal:** titolo “Informazioni IA”, descrizione “Completa per consigli più mirati. Tutto opzionale.” → **manca il legame esplicito** con “i ragionamenti dell’IA usano queste informazioni; senza, i consigli restano generici”.
- **Impostazioni profilo:** nessun blocco hero/intro che dica “Perché compilare il profilo” (divisione, squadra, punti deboli, obiettivi) **prima** dei form.
- **Banner setup:** “Più compili la barra, più i consigli sono su misura” è buono ma **non rassicura** su “da dove vengono” i consigli (dati tuoi + conoscenza eFootball).

### 1.2 Rassicurazione “conoscenza immensa / calcoli solidi”
- Non c’è copy che dica esplicitamente che:
  - i consigli **si basano su** profilo + rosa + partite + statistiche + regole eFootball (RAG / info_rag);
  - lo **score** è un calcolo trasparente (breakdown: profilo 20, rosa 25, partite 30, …);
  - **nessuna “scatola nera”**: l’utente può vedere da dove arriva il numero (dettagli barra) e cosa manca (CTA “manca profilo”, “manca rosa”, ecc.).
- La barra ha “Vedi dettagli” con i numeri ma **manca una frase di contesto**: “Questo punteggio viene calcolato dai dati che ci hai fornito; non usiamo dati esterni su di te.”

### 1.3 Gerarchia e “dove andare”
- Dashboard: barra + banner + task + classifica + grid (squadra, statistiche, navigazione, insights). Su **mobile** la colonna unica funziona ma:
  - i tre bottoni sopra la barra (Informazioni IA, Aggiorna analisi) possono andare in wrap e **rubare attenzione** al messaggio principale (la barra);
  - non c’è un **primo blocco “inizia da qui”** per i nuovi (es. “3 passi: Profilo → Rosa → Partite” con link).
- **Guida** è una pagina a parte: chi non clicca “Guida” non vede mai l’ordine consigliato; l’ordine è solo nel doc TUTORIAL e in parte nel banner a rotazione.

### 1.4 Responsività
- **Già presente:** `clamp()`, `minWidth: 0`, `flexWrap`, `repeat(auto-fit, minmax(300px, 1fr))`, `maxWidth` sulle pagine. Buona base.
- **Da migliorare:**
  - Dashboard: su viewport stretta (es. &lt; 400px) la riga “Barra + Info + Aggiorna” diventa 2–3 righe; dare **priorità visiva** alla barra (full width) e mettere “Informazioni IA” e “Aggiorna analisi” sotto o in un menu “•••”.
  - Banner setup: su mobile il testo “Manca: [Allenatore]” può andare a capo; prevedere **due righe** (intro + link) senza sovrapposizioni.
  - Impostazioni profilo: `maxWidth: 600px` centrato ok; verificare che le card sezione (Profilazione, Personale, Gioco, IA) su mobile non abbiano padding eccessivo (già `padding: '16px'`).
  - Modali (AiInfo, GameAnalysis): `maxHeight: 90vh`, `padding: 16px` ok; assicurare che su tastiera mobile (input focus) il modal resti visibile (scroll interno, non body).

### 1.5 Accessibilità e fiducia
- Barra: `role="progressbar"`, `aria-valuenow/min/max` presenti; **manca** un `aria-describedby` o testo associato che riassuma “Lo score è calcolato da profilo, rosa, partite…” (anche per screen reader).
- Link “Informazioni IA” e “Aggiorna analisi”: titoli tooltip ok; **manca** un breve testo “Perché?” accanto (es. piccolo “?” con tooltip: “Qui inserisci dati di gioco e preferenze; l’IA li usa per i consigli”).

---

## 2. Cosa farei (piano operativo)

### 2.1 Copy e messaggi “fiducia + perché profilarsi” (single source i18n)

- **Nuove chiavi i18n** (IT/EN), da usare in più punti:
  - **`aiKnowledgeTrustIntro`** (sotto la barra o nel tooltip “Vedi dettagli”):  
    IT: “Questo punteggio è calcolato solo dai dati che ci fornisci (profilo, rosa, partite, statistiche). Più sono completi, più i consigli sono su misura. Non usiamo dati esterni su di te.”  
    EN: “This score is calculated only from the data you provide (profile, roster, matches, stats). The more complete they are, the more tailored the advice. We don’t use external data about you.”
  - **`whyProfileMatters`** (blocco hero Impostazioni profilo + eventuale prima riga AiInfoModal):  
    IT: “Profilo, rosa e partite alimentano i ragionamenti dell’IA. Consigli e analisi si basano su questa conoscenza: più completa è, più precisi sono.”  
    EN: “Profile, roster and matches feed the AI’s reasoning. Advice and analysis are based on this knowledge: the more complete it is, the more accurate they are.”
  - **`aiInfoWhyTitle`** (sottotitolo o prima riga in AiInfoModal):  
    IT: “Queste informazioni vengono usate dall’IA per adattare i consigli (connessione, divisione, punti deboli, obiettivi).”  
    EN: “This information is used by the AI to tailor advice (connection, division, weak points, goals).”

- **Dove usarli:**
  - Barra: sotto “Vedi dettagli” (o dentro il `<details>`) mostrare **una riga** con `aiKnowledgeTrustIntro`.
  - AiInfoModal: sotto il titolo “Informazioni IA” aggiungere **una riga** con `aiInfoWhyTitle`; in cima al form mantenere/rafforzare `aiInfoDescription` con riferimento a “ragionamenti su misura”.
  - Impostazioni profilo: **blocco hero** in cima (sopra la barra completamento), con icona Brain + `whyProfileMatters` + CTA “Compila le sezioni sotto”.
  - Banner setup (dashboard): lasciare “Più compili la barra…” come intro; opzionale seconda riga “I consigli si basano sui dati che inserisci” (chiave dedicata) per rinforzare.

### 2.2 Blocco “Da dove parto” (onboarding visivo) in dashboard

- **Solo se** `ai_knowledge_score < 30` (o `profile_completion_score` basso): mostrare un **blocco compatto** sopra o sotto la barra:
  - Titolo: “Da dove iniziare” / “Where to start”.
  - Tre step con icona + label + link: (1) Profilo → Impostazioni profilo, (2) Rosa → Gestione formazione, (3) Partite → Aggiungi partita.
  - Una riga: “L’ordine consigliato per avere consigli su misura.”
- **Responsive:** su mobile i tre step in colonna (icona sopra, testo sotto, link); su desktop in riga. Dismissibile (es. “Non mostrare più” con `localStorage` o preferenza profilo) per non infastidire chi ha già completato.

### 2.3 Barra Conoscenza: priorità e “come viene calcolato”

- **Layout responsive:**
  - Desktop: barra (flex: 1) + bottone “Informazioni IA” + bottone “Aggiorna analisi” sulla stessa riga.
  - Mobile (es. `max-width: 480px` o container query): barra **a tutta larghezza**; sotto, una riga con “Informazioni IA” e “Aggiorna analisi” (due bottoni compatti o icona + testo corto).
- **Trasparenza calcolo:**
  - Nel `<details>` “Vedi dettagli” aggiungere **sopra** la riga dei numeri (Profilo 20, Rosa 25, …) la frase `aiKnowledgeTrustIntro` (o una variante breve “Calcolato solo dai tuoi dati”).
  - Opzionale: piccolo link “Come viene calcolato?” che apre un breve paragrafo (modale o espansione) con le 7 voci (profilo 20%, rosa 25%, …) e la rassicurazione “nessun dato esterno”.

### 2.4 Impostazioni profilo: hero “Perché il profilo”

- **Nuovo blocco** in cima alla pagina (dopo l’header con indietro/titolo):
  - Card con icona Brain/User, titolo “Perché il profilo conta” / “Why your profile matters”.
  - Testo: `whyProfileMatters`.
  - Una riga: “Compila le sezioni sotto per aumentare la barra Conoscenza in dashboard.”
- **Responsive:** stessa card su una colonna; su mobile padding coerente con il resto (es. 16px).

### 2.5 Banner setup: dismiss e messaggio “fiducia”

- **Dismissibile:** pulsante “Nascondi” (o icona X) che salva in `sessionStorage` (es. `setupBannerDismissed=true`) per la sessione; il banner non riappare fino al prossimo caricamento tab/sessione.
- **Testo:** mantenere intro “Più compili la barra…”; se c’è spazio, aggiungere una riga secondaria (es. “I consigli si basano sui dati che inserisci”) con chiave i18n.

### 2.6 Tour e Guida

- **Tour:** estendere a Classifica e Gestione profilo (come da ODIT §24); in dashboard aggiungere uno step esplicito per la card Classifica (id già in pagina).
- **Guida:** nella pagina Guida, in cima (hero “Cervello AI” / “Come funziona”), inserire **una riga** con `whyProfileMatters` o variante (“I consigli dipendono da profilo, rosa e partite”) così la Guida diventa il posto dove “si spiega tutto”, incluso il perché della profilazione.
- **Coerenza:** tutti i messaggi “perché profilarsi” e “da dove viene lo score” devono usare le stesse chiavi (o varianti brevi) per non creare disallineamento.

### 2.7 Responsività puntuale

- **Dashboard:**
  - Media query o container: sotto ~480px, mettere i due bottoni “Informazioni IA” e “Aggiorna analisi” sotto la barra in una riga orizzontale (stesso stile, dimensioni ridotte se necessario).
  - Grid card: `minmax(300px, 1fr)` può su schermi molto stretti creare una colonna; verificare che 280px sia il minimo accettabile o usare `minmax(260px, 1fr)` con font leggermente ridotti.
- **Banner:** su mobile permettere due righe (intro + “Manca: [link]”) con `flex-wrap` e `min-width: 0` sui figli; evitare overflow orizzontale.
- **Modali:** confermare scroll interno e che il focus resti dentro il modal (focus trap); su iOS/Android verificare che la tastiera non copra il bottone “Salva”.

### 2.8 Accessibilità

- Barra: aggiungere un `id` al paragrafo che contiene “Questo punteggio è calcolato…” e `aria-describedby={id}` sul `progressbar`.
- “Informazioni IA”: aggiungere un piccolo “?” con `aria-label` e tooltip “Perché inserire queste informazioni” che riusa `aiInfoWhyTitle`.
- Banner: assicurare che il link “Manca: Allenatore” sia un vero link/bottone con testo chiaro (non solo “Allenatore” senza contesto per chi legge con screen reader: “Manca: Allenatore. Vai ad Allenatori.”).

---

## 3. Priorità suggerite

| Priorità | Intervento | Impatto |
|----------|------------|---------|
| **P0** | Copy fiducia (aiKnowledgeTrustIntro, whyProfileMatters, aiInfoWhyTitle) e loro posizionamento (barra, AiInfoModal, Impostazioni profilo) | Rassicurazione, riduzione abbandono profilazione |
| **P0** | Banner setup dismissibile (sessionStorage) | UX meno invadente, sensazione di controllo |
| **P1** | Blocco “Da dove iniziare” in dashboard (condizionato a score basso) | Guida esplicita, ordine chiaro |
| **P1** | Hero “Perché il profilo conta” in Impostazioni profilo | Spiega valore prima del form |
| **P2** | Responsività barra + bottoni (mobile: barra full width, bottoni sotto) | Migliore uso su smartphone |
| **P2** | Tour: classifica + gestione-profilo + step classifica in dashboard | Esperienza uniforme (ODIT) |
| **P3** | Accessibilità (aria-describedby barra, ? “Perché” Informazioni IA, label banner) | Inclusività e compliance |
| **P3** | Guida: aggiungere in hero la frase “I consigli dipendono da…” | Coerenza messaggio su tutta la piattaforma |

---

## 4. Riepilogo “da piattaforma enterprise”

- **Guida:** ordine chiaro (Profilo → Rosa → Partite), blocco “Da dove iniziare” per nuovi, tour completo, Guida come pagina di riferimento con “perché profilarsi”.
- **Fiducia:** copy esplicito che (1) lo score è calcolato solo dai dati forniti, (2) i consigli si basano su quella conoscenza, (3) “Informazioni IA” serve a far adattare i ragionamenti; trasparenza nel breakdown e opzionale “Come viene calcolato?”.
- **Profilazione:** spiegare l’importanza **prima** di chiedere dati (hero Impostazioni profilo, prima riga AiInfoModal); collegare sempre “più dati = consigli più precisi”.
- **Responsività:** barra e azioni primarie leggibili e usabili su mobile; banner e modali senza overflow; priorità visiva alla barra su schermi piccoli. **Ogni** layout deve seguire `docs/UX_RESPONSIVE_LINEE_GUIDA.md` (breakpoint, touch target, nessun overflow).
- **Intuitività:** un solo messaggio coerente (single source i18n), CTA chiare (link a Allenatori, Statistiche, Formazione), dismiss dove serve (banner), niente modali invasive al primo accesso.

Questo piano può essere implementato in modo incrementale (prima P0, poi P1, ecc.) senza stravolgere l’architettura esistente.

---

## 5. Allineamento: guida + responsività

- **Nuove pagine / componenti:** devono rispettare i principi §0 (guida, responsività, UX allineata) e la checklist in `docs/UX_RESPONSIVE_LINEE_GUIDA.md`.
- **Modifiche a pagine esistenti:** preservare o migliorare responsività (barra full width su mobile, bottoni sotto, grid con minmax); aggiungere o mantenere un elemento “guida” (titolo, intro, “prossimo passo”, ordine consigliato).
- **Verifica:** prima di considerare chiusa una feature UI, testare tra 320px e 1400px e verificare che ogni schermata “guidì” l’utente (contesto + CTA chiare).
