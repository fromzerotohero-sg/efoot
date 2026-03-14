# Linee guida UX e responsività

**Principio:** siamo una **guida** (primi al mondo); l’esperienza deve essere **intuitiva e perfetta su ogni dispositivo**. Ogni schermata guida l’utente; ogni layout è responsivo.

---

## 1. Breakpoint e viewport (standard progetto)

| Nome       | Larghezza      | Uso |
|------------|----------------|-----|
| **Mobile S** | &lt; 400px    | Layout a colonna unica; barra/hero full width; bottoni sotto il contenuto principale; font e padding ridotti ma leggibili. |
| **Mobile**   | 400px – 599px | Come sopra; eventuale griglia 1 col; touch target ≥ 44px. |
| **Tablet**   | 600px – 899px | Grid 2 colonne dove ha senso; barra e azioni possono stare in riga se non si stringe. |
| **Desktop**  | ≥ 900px       | Grid multi-colonna, maxWidth contenuto (es. 1200–1400px) centrato. |

**Regola:** usare **clamp()** per font e spacing (es. `clamp(14px, 3vw, 16px)`), **minWidth: 0** su flex/grid children per evitare overflow, **flexWrap** dove ci sono più elementi in riga.

---

## 2. Regole responsività per componente

### 2.1 Pagine (layout principale)

- **Padding:** `clamp(12px, 3vw, 24px)` o `clamp(16px, 4vw, 32px)` ai lati; su mobile non meno di 12px.
- **MaxWidth contenuto:** di solito 600px (form) o 1200–1400px (dashboard); sempre `margin: 0 auto`.
- **Titoli:** `clamp(20px, 4vw, 28px)` (H1), `clamp(16px, 3vw, 20px)` (H2); niente testo che “esce” su small.
- **Grid card:** `grid-template-columns: repeat(auto-fit, minmax(260px, 1fr))` o `minmax(280px, 1fr)`; gap `clamp(12px, 2vw, 24px)`.

### 2.2 Barra Conoscenza e righe azione

- **Desktop:** barra `flex: 1 1 auto`, bottoni (Informazioni IA, Aggiorna analisi) in riga a destra.
- **Mobile (&lt; 480px):** barra **a tutta larghezza** (100%); sotto, una riga con i bottoni (stesso stile, compatti). Priorità visiva alla barra.
- **Banner setup:** `flex-wrap: wrap`, `minWidth: 0` sui figli; due righe ammesse (intro + “Manca: [link]”); niente overflow orizzontale.

### 2.3 Bottoni e CTA

- **Touch target:** minimo **44×44px** su mobile (area cliccabile); padding sufficiente (es. `padding: 12px 16px`).
- **Testo:** evitare “nowrap” su label lunghe su mobile; se necessario `whiteSpace: 'normal'` e due righe.
- **Righe di bottoni:** su mobile mettere in colonna (`flexDirection: 'column'`) o wrap con gap; mai stringere sotto ~320px.

### 2.4 Modali

- **Dimensioni:** `maxWidth: 560px` (o 90vw), `maxHeight: 90vh`; `overflowY: auto` sul contenuto interno.
- **Mobile:** padding `16px`; verificare che con tastiera aperta (input focus) il bottone “Salva” resti raggiungibile (scroll interno).
- **Focus trap:** focus resta dentro il modale; chiudi con Esc o click fuori (e bottone Chiudi).

### 2.5 Tabelle e liste

- **Tabelle:** su mobile considerare card stack (una riga = una card) o scroll orizzontale con `minWidth` sulla tabella; evitare font &lt; 12px.
- **Liste lunghe:** paginazione o virtualizzazione; altezza max con scroll dove appropriato.

### 2.6 Tour (driver.js / popover)

- **Posizione:** `side` e `align` per evitare che il popover esca dallo viewport; su mobile preferire `bottom`/`top` e testo breve.
- **Testo:** frasi concise; su small screen evitare blocchi lunghi.

### 2.7 Pattern espandibile (Mostra altro / Mostra meno)

- **Comportamento unico:** tutte le sezioni espandibili (Ultime partite, Obiettivi settimanali, Guide per pagina in Guida, breakdown classifica, ecc.) usano lo **stesso pattern**:
  - **Header cliccabile:** `role="button"`, `tabIndex={0}`, `aria-expanded`, `aria-label` con testo esplicito (es. "Mostra ultime partite" / "Nascondi partite", "Mostra obiettivi settimanali" / "Nascondi obiettivi", "Espandi guida: Dashboard" / "Comprimi guida").
  - **Tastiera:** `onKeyDown` con Enter e Space per toggle.
  - **Touch target:** area cliccabile con `minHeight: 44px` e padding `clamp(16px, 4vw, 20px)`.
  - **Icona stato:** ChevronDown (chiuso) / ChevronUp (aperto) con `aria-hidden` (l'etichetta è in `aria-label`).
- **i18n:** usare le chiavi `expandSection`, `collapseSection` o quelle specifiche (`expandSectionMatches`, `collapseSectionGoals`, `expandGuideCard`, `collapseGuideCard`) per coerenza IT/EN.
- **Responsive:** font e padding con `clamp()`; su mobile la riga titolo + chevron non deve andare in overflow (flex con `minWidth: 0` sul testo).

### 2.8 Guida (link e pagina)

- **Link "Guida":** in dashboard e in navigazione usare la stessa label (es. "Guida Completa" / "Complete Guide", chiave `guideLink`). Il link porta sempre a `/guida`.
- **Pagina Guida:** Hero con titolo e sottotitolo; **Guide per pagina** in grid `repeat(auto-fit, minmax(min(100%, 280px), 1fr))`; ogni card espandibile (pattern §2.7); CTA "Vai alla Pagina" con `minHeight: 44px` e `aria-label`. Tour "Mostrami come" disponibile.
- **Coerenza:** stessa voce (ordine consigliato + passi operativi + link alle pagine).

---

## 3. UX “siamo una guida”

### 3.1 Ogni pagina deve avere

- **Contesto:** titolo chiaro (H1) + eventuale sottotitolo (“Cosa fa questa pagina”).
- **Prossimo passo:** CTA evidente (es. “Salva”, “Aggiungi partita”, “Vai a Gestione formazione”); link testuali con contesto (“Manca: Allenatore” → “Vai ad Allenatori”).
- **Ordine consigliato:** dove serve (dashboard, impostazioni), blocco “Da dove iniziare” o “Ordine consigliato” con 1–2–3 e link.

### 3.2 Messaggi e copy

- **Single source:** tutti i testi “perché profilarsi”, “come viene calcolato lo score”, “da dove vengono i consigli” da i18n (stesse chiavi in barra, modale, impostazioni, guida).
- **Tono:** guida, rassicurante, conciso; evitare gergo tecnico in UI.

### 3.3 Gerarchia visiva

- **Prima** il messaggio principale (es. barra Conoscenza, titolo pagina).
- **Poi** azioni primarie (un bottone principale per sezione).
- **Poi** azioni secondarie e link.
- Su mobile: **una colonna**, ordine dall’alto in basso coerente con questa gerarchia.

---

## 4. Checklist pre-release (per pagina o feature)

- [ ] Layout verificato da **320px** a **1400px** (Chrome DevTools o real device).
- [ ] Nessun **overflow orizzontale** (scroll orizzontale indesiderato).
- [ ] **Touch target** ≥ 44px per bottoni/link interattivi su mobile.
- [ ] **Font** leggibili (min 12px per corpo, 14px preferibile); titoli con clamp.
- [ ] **Barra / hero / CTA** hanno priorità visiva corretta su mobile (es. barra full width, bottoni sotto).
- [ ] **Modali:** scroll interno, focus trap, tastiera mobile non copre CTA.
- [ ] **Testi guida:** titolo/intro presente; “prossimo passo” chiaro; i18n usato.
- [ ] **Accessibilità:** label per screen reader dove serve (link “Manca: X” con contesto); `aria-describedby` su elementi critici (es. barra Conoscenza).

---

## 5. Riferimenti in codice

- **Breakpoint:** dove serve media query, usare `480px` e `900px` come riferimento (o CSS container queries se introdotte).
- **Spacing:** preferire `clamp(8px, 2vw, 12px)` per gap piccoli, `clamp(16px, 4vw, 24px)` per gap tra sezioni.
- **Pagine di riferimento (già con buon uso di clamp/flex):** `app/page.jsx`, `app/gestione-formazione/page.jsx`, `app/classifica/page.jsx`, `app/contromisure-live/page.jsx`.

---

**In sintesi:** responsivo ovunque, guida in ogni schermata, UX allineata. Ogni modifica deve rispettare queste linee guida.
