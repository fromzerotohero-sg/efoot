# Analisi enterprise: Barra Conoscenza AI

**Obiettivo**: far capire al cliente come funziona la barra, perché a volte non si aggiorna, cosa significano Pattern/Successi e come incentivare l’uso della piattaforma senza incoerenze.

---

## 1. Come funziona (in sintesi)

La barra **Conoscenza AI** (0–100%) indica **quanto l’IA “sa” del cliente** per dare consigli personalizzati. Non misura la qualità del gioco: misura **quanti dati strutturati** abbiamo (profilo, rosa, partite, pattern, allenatore, utilizzo, successi).

| Voce       | Max | Cosa significa |
|------------|-----|----------------|
| **Profilo** | 20  | Nome, squadra, divisione, ore a settimana, come ricordarti, problemi comuni, ecc. (campi impostazioni profilo). *Non* include i campi “Informazioni IA” (connessione, punto debole, cosa vuole imparare): quelli arricchiscono il **riassunto/chat** ma non questo score. |
| **Rosa**    | 25  | Titolari (11) + riserve + dati completi (overall, posizioni). Più rosa completa, più punti. |
| **Partite** | 30  | 1 partita = 3%, massimo 30% (10 partite). Solo numero di partite inserite. |
| **Pattern** | 15  | **Pattern tattici**: formazioni e stili usati nelle partite, problemi ricorrenti. Vengono **calcolati dal sistema** quando ci sono abbastanza partite; la tabella `team_tactical_patterns` si popola con l’API `recalculate-patterns` (es. dalla dashboard). Se non c’è ancora una riga o non ci sono abbastanza partite, Pattern resta 0/15. |
| **Allenatore** | 10 | Aver **impostato un allenatore attivo** (pagina Allenatori, “Attivo”). Se manca l’allenatore o non è segnato come attivo, 0/10. |
| **Utilizzo** | 10 | Stima uso piattaforma: messaggi chat (stimati da partite/3), interazioni (partite + giocatori + obiettivi completati). Non c’è tracking reale messaggi chat in DB. |
| **Successi** | 15 | Tre fonti: (1) **Miglioramento divisione** (5%): `initial_division` vs `current_division` (divisione più alta = numero più basso); (2) **Obiettivi settimanali completati** (5%): fino a 5 obiettivi = 5%; (3) **Miglioramento difesa** (5%): confronto gol subiti ultime 10 partite vs precedenti 10 (serve almeno 20 partite). Se non compili divisione iniziale, non completi obiettivi e non hai 20 partite, Successi resta 0/15. |

**Perché la barra non si aggiorna subito?**

1. **Cache 5 minuti**: l’API `/api/ai-knowledge` restituisce il valore salvato in `user_profiles` se calcolato da meno di 5 minuti (e non viene passato `?refresh=1`). Dopo una modifica, la barra si aggiorna solo se:
   - viene emesso l’evento **`knowledge-should-refresh`** (la barra chiama l’API con `?refresh=1`), oppure
   - viene emesso **`match-saved`** (dopo salvataggio partita), oppure
   - scade la cache (5 min) o il polling (60 s).
2. **Dove si emette `knowledge-should-refresh`**: impostazioni-profilo (dopo save), gestione-formazione (dopo fetch dati). **Non** viene emesso dopo salvataggio **Informazioni IA** (modale in dashboard): quindi compilare “Informazioni IA” non fa aggiornare la barra fino al prossimo refresh/polling.
3. **Allenatore**: lo score legge dalla tabella `coaches` **senza** filtrare per `is_active`. Se ci sono più allenatori, `.maybeSingle()` può restituire uno qualunque o fallire; se l’utente ha impostato “attivo” ma la query non filtra, il valore può essere incoerente. Va usato solo l’allenatore con `is_active = true`.

---

## 2. Cosa c’è di sbagliato / incoerenze

| Problema | Impatto | Fix |
|----------|---------|-----|
| **CTA sempre “Completa il profilo”** se score &lt; 50 | Con Profilo 20/20 il messaggio è fuorviante (“Completa il profilo” quando il profilo è già completo). Il cliente non sa su cosa agire. | CTA **dinamica**: in base al primo componente sotto il massimo suggerire “Aggiungi partite”, “Imposta l’allenatore”, “Completa gli obiettivi”, “Aggiungi partite per sbloccare i pattern”, ecc. |
| **Pattern 0/15 senza spiegazione** | Il cliente non capisce cosa sia “Pattern” e come portarlo a 15. | Testo breve in “Vedi dettagli” o tooltip: “Pattern tattici: formazioni e stili usati nelle partite, problemi ricorrenti (derivati dalle partite inserite). Si sbloccano con più partite.” |
| **Successi 0/15 senza spiegazione** | Sembra che “successi” sia sempre vuoto. | Spiegazione: “Obiettivi settimanali completati, miglioramento divisione e difesa (ultime vs precedenti 10 partite) contribuiscono qui.” |
| **Barra non si aggiorna dopo Informazioni IA** | L’utente compila connessione, punto debole, obiettivi e non vede la barra muoversi (anche se quei campi non entrano nello score Profilo; comunque la barra potrebbe ricalcolarsi per coerenza). | Emettere `knowledge-should-refresh` dopo salvataggio riuscito in **AiInfoModal** (save-ai-info). |
| **Allenatore 0/10 pur con allenatore attivo** | La query coach non filtra per `is_active` e usa `coach.name` mentre la colonna è `coach_name`. | In `aiKnowledgeHelper`: fetch coach con `.eq('is_active', true)`; in `calculateCoachScore` usare `coach.id || coach.coach_name`. |
| **Utilizzo solo stimato** | “Utilizzo” è stima (partite/3, partite+players+goals). Il cliente potrebbe aspettarsi che “usare la chat” faccia salire la barra. | Documentare in audit/questo doc; opzionale in UI: “L’utilizzo è stimato da partite e obiettivi.” |

---

## 3. Come gestirebbe l’enterprise (raccomandazioni)

1. **Rendere la barra “onesta” e orientata all’azione**
   - CTA **unica e contestuale**: non sempre “Completa il profilo”. Calcolare il **prossimo step** (prima voce del breakdown sotto il max) e mostrare un messaggio tipo: “Aggiungi partite per far crescere la conoscenza dell’IA” / “Imposta un allenatore attivo” / “Completa gli obiettivi settimanali” / “Aggiungi partite per sbloccare i pattern tattici”.
   - In “Vedi dettagli”, una riga di aiuto per **Pattern** e **Successi** (significato in 1 frase).

2. **Aggiornamento prevedibile**
   - Emettere **`knowledge-should-refresh`** dopo ogni azione che cambia dati usati dallo score: save profilo (già fatto), save rosa/formazione (già fatto), **save Informazioni IA** (da aggiungere). Opzionale: dopo “Aggiorna analisi” (refresh-diagnostic) per coerenza visiva (il diagnostic non entra nello score, ma l’utente potrebbe aspettarsi un refresh).

3. **Allineamento dati**
   - Coach: leggere solo `coaches` con `is_active = true` e usare `coach_name` nello score.
   - Lasciare che Profilo conti solo i campi “struttura” (nome, squadra, divisione, ore, ecc.). I campi “Informazioni IA” restano per il riassunto/chat; se in futuro si vuole farli pesare sulla barra, si può aggiungere una piccola quota (es. 2%) per “punto debole / obiettivi compilati”.

4. **Incentivare senza ingannare**
   - Messaggio tipo: “Più dati inserisci (profilo, rosa, partite, allenatore), più i consigli dell’IA sono su misura.”
   - Collegare esplicitamente **obiettivi settimanali** alla voce Successi: “Completare gli obiettivi aumenta questo score” (già presente; si può rafforzare in “Vedi dettagli” con la spiegazione di Pattern e Successi).

5. **Documentazione e manutenzione**
   - Tenere questo documento e `AUDIT_BARRA_CONOSCENZA_AI.md` allineati ai fix.
   - Dopo ogni modifica a `aiKnowledgeHelper` o all’API, verificare che gli eventi `match-saved` e `knowledge-should-refresh` siano emessi nei punti giusti.

---

## 4. Riepilogo fix implementabili

| # | Fix | File | Priorità |
|---|-----|------|----------|
| 1 | Coach: fetch con `is_active = true`; score con `coach.id \|\| coach.coach_name` | `lib/aiKnowledgeHelper.js` | Alta |
| 2 | CTA dinamica in base al primo componente sotto il max | `components/AIKnowledgeBar.jsx` | Alta |
| 3 | Emettere `knowledge-should-refresh` dopo save-ai-info | `components/AiInfoModal.jsx` | Media |
| 4 | Testi/tooltip per Pattern e Successi (significato) | `components/AIKnowledgeBar.jsx` + i18n | Media |
| 5 | (Opz.) In “Vedi dettagli” riga “Obiettivi completati e miglioramenti contribuiscono a Successi” | `components/AIKnowledgeBar.jsx` | Bassa |

**Stato**: Fix 1–4 applicati (coach is_active + coach_name, CTA dinamica, refresh dopo save-ai-info, hint Pattern/Successi in tooltip e i18n).

Fine documento.
