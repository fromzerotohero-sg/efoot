# Piano Prossimi Sviluppi

**Data**: Febbraio 2025  
**Stato progetto**: Palestra Coach completato, ManualPlayerModal operativo, integrazione AI allineata

---

## 1. Prioritizzazione

| Priorità | Area | Impatto | Efforto |
|----------|------|---------|---------|
| Alta | ManualPlayerModal UX | Cliente vede "brutto", frustrazione inserimento | Medio |
| Alta | Logica completamento profilo | Indicatore fuorviante ("Completo" quando non lo è) | Basso |
| Media | Posizionamento CTA gestione formazione | Intuitività scelta caricamento vs manuale | Basso |
| Media | Grafica e colori modali | Coerenza visiva prodotto | Medio |
| Bassa | Estensioni future | Feature aggiuntive | Variabile |

---

## 2. Task dettagliati

### 2.1 ManualPlayerModal — Statistiche con slider (alta priorità)

**Problema**: Le statistiche usano `<input type="number">` con min/max 1–99. L’utente deve digitare i numeri; in eFootball le stat si usano tipicamente con slider.

**Obiettivo**: Sostituire gli input numerici con **slider (range)** 1–99, mostrando il valore corrente accanto.

**Modifiche**:
- In `components/ManualPlayerModal.jsx`, sezione Stats (linee ~406–424):
  - Per ogni stat: `<input type="range" min="1" max="99" value={form[stat.key] || 50} />` + label con valore
  - Stile coerente con tema scuro (track cyan/orange, thumb ben visibile)
- Mantenere la possibilità di non inserire stat (slider opzionale o stato “vuoto”)

**Criteri completamento**:
- [ ] Tutte le 7 statistiche usano slider
- [ ] Valore leggibile accanto allo slider
- [ ] Range 1–99, stile coerente con il resto dell’app

---

### 2.2 Logica completamento profilo (alta priorità)

**Problema**: Viene mostrato “Profilo Completo” anche quando molti dati mancano (es. solo card + poche stat).

**Obiettivo**: Calcolo più rigoroso basato su quanti dati effettivamente completi.

**Dove**:
- `app/giocatore/[id]/page.jsx` — calcolo `isProfileComplete` e `completedSections`
- `ManualPlayerModal.jsx` — come viene impostato `photo_slots` al salvataggio
- `app/gestione-formazione/page.jsx` — `getProfileBorderColor` e badge completamento

**Logica proposta**:
- **Profilo Completo** solo se:
  - Card presente (`photo_slots.card` o dati base)
  - Almeno 5–6 statistiche con valore reale (da `base_stats` nested)
  - Abilità o booster presenti (`skills.length > 0` o `available_boosters.length > 0`)
- **Percentuale completamento** (opzionale): barra che mostra X% in base a:
  - Card: 20%
  - Statistiche (es. 7 campi): fino a 40%
  - Abilità: 20%
  - Booster: 10%
  - Dettagli (altezza, età, ecc.): 10%

**Criteri completamento**:
- [ ] “Profilo Completo” visibile solo quando i criteri sono soddisfatti
- [ ] Nessun falso positivo (es. solo nome + overall non basta)
- [ ] Eventuale barra percentuale coerente con i dati disponibili

---

### 2.3 Posizionamento CTA “Manuale” vs “Carica” (media priorità)

**Stato attuale**:
- Sezione Riserve: “Carica Riserva” e “Manuale” già affiancati
- Slot vuoto (AssignModal): “Carica foto giocatore” e “Manuale” affiancati

**Obiettivo**: Rendere chiaro che sono alternative (caricamento foto vs inserimento manuale).

**Modifiche possibili**:
- Raggruppare visivamente con label tipo: “Aggiungi giocatore: [Carica foto] [Inserimento manuale]”
- Oppure: un unico blocco con due pulsanti della stessa dimensione/peso visivo
- Verificare che in tutte le entry point (riserve, slot vuoto, pagina giocatore “Modifica”) il flusso sia coerente

**Criteri completamento**:
- [ ] L’utente capisce subito che può scegliere tra foto e manuale
- [ ] Nessuna modifica breaking; layout già accettabile, miglioramenti marginali

---

### 2.4 Grafica e colori ManualPlayerModal (media priorità)

**Problema**: Colori e grafica del modal non allineati al resto del prodotto.

**Obiettivo**: Allineare al design system (neon-blue, neon-purple, dark theme) e alle altre modali (es. CoachFeedbackChat).

**Modifiche**:
- Header: gradient e bordi coerenti con `--neon-blue` / `--neon-purple`
- Sezioni espandibili: stessi colori di sezione (stats=cyan, skills=purple, details=orange) ma più curati
- Dropdown: stile coerente con CoachFeedbackChat (sfondo scuro, opzioni scure)
- Slider: track e thumb con colori di brand

**Criteri completamento**:
- [ ] Aspetto professionale e coerente
- [ ] Nessun contrasto bianco su bianco o elementi fuori tema

---

### 2.5 Estensioni future (bassa priorità)

- **Voice/Realtime**: integrazione GPT-Realtime per coach vocale (se richiesto)
- **Task e obiettivi**: verifiche periodiche di coerenza
- **Analisi costi**: aggiornare `VALUTAZIONE_ECONOMICA_PIATTAFORMA.md` in base ai dati reali
- **RAG**: ottimizzare budget e selezioni in `ragHelper.js` se necessario

---

## 3. Ordine di esecuzione consigliato

1. **Slider statistiche** (2.1) — miglioramento immediato dell’UX
2. **Logica completamento** (2.2) — corregge un bug di percezione importante
3. **Grafica ManualPlayerModal** (2.4) — insieme allo slider, chiude il pacchetto UX
4. **Posizionamento CTA** (2.3) — raffinamento

---

## 4. File coinvolti

| File | Modifiche |
|------|-----------|
| `components/ManualPlayerModal.jsx` | Slider stats, stili, `photo_slots` più conservativi |
| `app/giocatore/[id]/page.jsx` | Logica `isProfileComplete`, eventuale percentuale |
| `app/gestione-formazione/page.jsx` | `getProfileBorderColor`, eventuali CTA |
| `lib/i18n.js` | Eventuali nuove stringhe |

---

## 5. Note

- Nessuna modifica a API o DB per questi task
- Priorità: robustezza e UX, non refactor massicci
- Dopo ogni modifica: test manuale su riserve, slot vuoto, pagina giocatore
