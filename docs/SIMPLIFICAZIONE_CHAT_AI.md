# Semplificazione Chat AI - Log Modifiche

## 📅 Data: 15 Marzo 2026
## 🎯 Scope: SOLO rimozione duplicazioni (nessun comportamento modificato)

---

## ✅ Modifiche Effettuate

### File: `app/api/assistant-chat/route.js`

#### **1. Rimossa riga 568 (capsula italiana)**
```javascript
// CANCELLATA:
- HARD: solo nomi ROSA; solo 5 stili squadra configurabili; istruzioni solo max 5; limiti moduli §3.4; NO Tattica(astuzia) sui difensori; NO Tornante su MED Collante; Dominio palle alte = Colpo di testa.
```
**Motivo:** Duplica esattamente le regole in `COACH_AI_POLICIES_IT` (righe 622-632)

---

#### **2. Rimossa riga 578 (capsula inglese)**
```javascript
// CANCELLATA:
- HARD: only roster names; only 5 configurable team styles; instructions only max 5; formation limits §3.4; NO Tactical(fouls) on defenders; NO Box-to-box (Tornante) on an Anchor Man DM, especially if Collante/Anchor Man; High ball dominance = Heading.
```
**Motivo:** Duplica esattamente le regole in `COACH_AI_POLICIES_EN` (righe 634-644)

---

#### **3. Rimossa riga 666-667 (system prompt italiano finale)**
```javascript
// CANCELLATA:
VINCOLI: solo nomi in ROSA; team_playing_style configurabile SOLO 5 (Possesso palla, Contropiede veloce, Contrattacco, Passaggio lungo, Vie laterali); contrattacco → contropiede_veloce e serve competenza coach >=70 per consigliare; istruzioni individuali solo max 5; limiti moduli §3.4; NO Tattica(astuzia) sui difensori; NO Tornante su MED Collante; Dominio palle alte = Colpo di testa.
```
**Motivo:** Duplica esattamente le stesse regole già presenti in `COACH_AI_POLICIES_IT` e parzialmente nelle righe precedenti

---

## 📊 Risultato

| Metrica | Prima | Dopo |
|---------|-------|------|
| Righe totali rimosse | 0 | 3 righe duplicate |
| Contenuto modificato | No | No (stesse regole, dette una volta sola) |
| Comportamento AI | Invariato | Invariato |
| Rischio | - | Zero (solo deduplicazione) |

---

## 🔍 Verifica che le regole rimangono

Le seguenti regole **sono ancora presenti** in `COACH_AI_POLICIES_IT` (righe 622-632):

✅ `solo nomi in ROSA`  
✅ `team_playing_style configurabile SOLO 5`  
✅ `istruzioni individuali solo max 5`  
✅ `limiti moduli §3.4`  
✅ `NO Tattica(astuzia) sui difensori`  
✅ `NO Tornante su MED Collante`  
✅ `Dominio palle alte = Colpo di testa`  

**Nessuna regola è stata persa**, solo rimosse le ripetizioni.

---

## 🚀 Prossimi Step (facoltativi, futuri)

Se vuoi procedere oltre:
1. Rimuovere blocco ENGINE completo (capsule)
2. Rendere suggerimenti opzionali (non 3 obbligatori)
3. Semplificare DUE FONTI DATI

Per ora: **solo deduplicazione, zero rischio**.

---

**Commit:** `git add app/api/assistant-chat/route.js && git commit -m "chore: remove duplicate constraints from chat prompt"`  
**Stato:** Pronto per push
