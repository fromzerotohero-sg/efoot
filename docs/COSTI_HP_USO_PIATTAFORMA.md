# Costi HP (Hero Points) per uso piattaforma

**Riferimento codice:** `lib/creditService.js` (CREDIT_WEIGHTS, recordUsage, CREDITS_INCLUDED_DEFAULT).

---

## 1. Modello attuale

- **Periodo:** Mensile (YYYY-MM) in UTC. Ogni mese l’utente ha un “piano” (credits_included) e un consumo (credits_used).
- **Inclusi di default:** 200 HP/mese (variabile env `CREDITS_INCLUDED_DEFAULT` per override, es. test).
- **Cosa consuma HP:** Solo le operazioni che chiamano OpenAI (chat, estrazioni, analisi, contromisure). Salvataggio partita, profilo, formazione, classifica, task **non** consumano HP.
- **Overage:** Il codice non blocca l’uso oltre gli inclusi; `credits_used` può superare `credits_included` (addebito a consumo se collegato al sito pagamenti).

---

## 2. Costo per operazione (HP)

| Operazione | HP | Dove si usa |
|------------|-----|-------------|
| **assistant-chat** | 1 | Chat principale (messaggio utente → OpenAI → risposta) |
| **coach-feedback-chat** | 1 | Palestra Coach: messaggio chat |
| **save-coach-feedback** | 1 | Palestra Coach: salva feedback + insight (estrazione) |
| **extract-player** | 2 | Carica foto giocatore → estrazione dati |
| **extract-coach** | 2 | Carica foto allenatore → estrazione |
| **extract-match-data** | 2 | Wizard partita: estrazione da screenshot (una sezione) |
| **extract-formation** | 3 | Contromisure: upload formazione avversario |
| **extract-game-analysis** | 3 | Upload analisi partita (eFootball) |
| **generate-countermeasures** | 3 | Contromisure: generazione suggerimenti da OpenAI |
| **analyze-match** | 4 | Dettaglio partita: analisi AI sul match |

---

## 3. Stima utilizzo tipico (per ragionare)

- **Solo chat (assistente):** 1 HP a messaggio. 50 messaggi/mese ≈ 50 HP.
- **Una partita (wizard):** più screenshot → più chiamate extract-match-data (es. 4 sezioni × 2 = 8 HP) + eventuale analyze-match (4 HP) = fino a ~12 HP a partita “piena”.
- **Palestra Coach:** 1 HP a messaggio + 1 HP al save → una sessione (5 msg + save) ≈ 6 HP.
- **Contromisure:** extract-formation (3) + generate-countermeasures (3) = 6 HP a utilizzo.
- **200 HP/mese:** consentono ~50 chat + 2–3 partite complete + qualche contromisure + Palestra Coach, oppure mix diverso.

---

## 4. Punti su cui ragionare

1. **Piano incluso (200 HP):** È adeguato per “light user”? Vuoi aumentare/diminuire per acquisition o retention?
2. **Pesi:** Le estrazioni (2–3 HP) e analyze-match (4 HP) sono proporzionate al costo reale OpenAI (token/immagini)? Se un’estrazione costa molto di più, il peso potrebbe essere aumentato; se la chat è molto usata, si può lasciare 1 HP o introdurre tier (primi N msg gratis, poi 1 HP).
3. **Operazioni a 0 HP:** Oggi refresh-diagnostic, save-profile, save-match, generazione task non consumano. Va bene così (incentivano uso) o vuoi “monetizzare” qualcosa (es. task generati)?
4. **Trasparenza utente:** In UI (CreditsBar, gestione profilo) mostri “Usati / Inclusi” e “Overage”. Vuoi anche un riepilogo “per tipo” (es. “Chat: 45 HP, Estrazioni: 30 HP”) per chiarezza?
5. **Blocco a 0:** Oggi non si blocca quando credits_used >= credits_included. Preferisci bloccare le chiamate OpenAI quando i crediti sono esauriti (e mostrare CTA acquisto) o lasciare overage illimitato?

---

## 5. Riferimenti codice

- **Pesi e default:** `lib/creditService.js` (righe 12–31).
- **Registrazione uso:** `recordUsage(admin, userId, credits, operationType)` chiamata dalle route API dopo ogni operazione OpenAI (assistant-chat, extract-*, generate-countermeasures, analyze-match, coach-feedback-chat, save-coach-feedback).
- **Transazioni:** `credit_transactions` (type=usage, amount negativo) per storico; `user_credit_usage` per periodo (credits_used, credits_included).
- **Classifica:** Gli usage nel mese (credit_transactions type=usage) contano come “Utilizzo IA” nei punti classifica (leaderboardHelper).

Se vuoi, il passo successivo può essere: (A) proporre nuovi valori per CREDIT_WEIGHTS o CREDITS_INCLUDED_DEFAULT, (B) aggiungere un endpoint/UI “breakdown per tipo”, (C) introdurre blocco a 0 quando crediti esauriti.
