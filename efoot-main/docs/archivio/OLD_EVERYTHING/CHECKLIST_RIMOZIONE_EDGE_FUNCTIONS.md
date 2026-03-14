# ✅ Checklist Rimozione Edge Functions

**Assegnatario:** Tommaso  
**Data verifica:** ___________  
**Stato:** [ ] Da verificare / [ ] Completato

---

## 🔍 Procedura di Verifica

### 1. Accesso Dashboard Supabase
- [ ] Accedi a https://supabase.com/dashboard
- [ ] Seleziona il progetto eFootball AI Coach
- [ ] Vai su **Edge Functions** nel menu laterale

### 2. Lista Funzioni da Rimuovere (12 totali)

Verifica che **NESSUNA** di queste sia presente:

| # | Nome Funzione | Stato |
|---|---------------|-------|
| 1 | `voice-coaching-gpt` | [ ] Rimossa |
| 2 | `realtime-proxy` | [ ] Rimossa |
| 3 | `process-screenshot` | [ ] Rimossa |
| 4 | `process-screenshot-gpt` | [ ] Rimossa |
| 5 | `analyze-rosa` | [ ] Rimossa |
| 6 | `analyze-heatmap-screenshot-gpt` | [ ] Rimossa |
| 7 | `analyze-squad-formation-gpt` | [ ] Rimossa |
| 8 | `analyze-player-ratings-gpt` | [ ] Rimossa |
| 9 | `import-players-from-drive` | [ ] Rimossa |
| 10 | `import-players-json` | [ ] Rimossa |
| 11 | `scrape-players` | [ ] Rimossa |
| 12 | `test-efootballhub` | [ ] Rimossa |

### 3. Screenshot Evidenza
- [ ] Screenshot della pagina Edge Functions (vuota o con solo funzioni autorizzate)
- [ ] Allegare a questo documento

### 4. Verifica via CLI (opzionale ma consigliata)

```bash
# Installa Supabase CLI se non presente
npm install -g supabase

# Login
supabase login

# Lista funzioni (dovrebbe restituire array vuoto o solo funzioni valide)
supabase functions list
```

**Output atteso:**
```
No edge functions found in project.
```

Oppure se ci sono funzioni valide:
```
FUNCTION ID    NAME           STATUS   URL
...
```

### 5. Verifica Chiamate Codice

Nel codebase non devono esserci riferimenti a queste funzioni:

```bash
# Comandi per cercare riferimenti

# Cerca import o chiamate a funzioni edge
grep -r "supabase.functions" --include="*.js" --include="*.jsx" --include="*.ts" --include="*.tsx"

# Cerca URL edge functions
grep -r "functions.supabase.co" --include="*.js" --include="*.jsx" --include="*.ts" --include="*.tsx"
```

**Risultato atteso:** Nessun risultato (o solo riferimenti commentati/documentazione)

---

## 📋 Firma Verifica

**Verificatore:** ___________________ (Tommaso)

**Data:** ___________

**Esito:**
- [ ] Tutte le 12 Edge Functions rimosse
- [ ] Screenshot allegato
- [ ] Nessun riferimento nel codice
- [ ] OK per produzione

**Note eventuali:**
_______________________________________________
_______________________________________________

---

## ⚠️ Importante

Se **anche una sola** di queste funzioni è ancora attiva:
1. Clicca sui tre puntini (⋮) a destra della funzione
2. Seleziona "Delete function"
3. Conferma l'eliminazione
4. Verifica che sia scomparsa dalla lista

**Rischio se non rimosse:** Chiamate non autenticate possibili, costi OpenAI imprevisti, esposizione dati.
