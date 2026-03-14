# Modello OpenAI (GPT-5) e fallback

## Cosa stai usando ora

| Dove | Modello |
|------|--------|
| **Chat assistente** (AssistantChat) | `OPENAI_MODEL` in env, oppure default **gpt-5.2** (alias `gpt-5` deprecato da OpenAI). Se non disponibile → fallback **gpt-4o**. |
| **Palestra Coach** (coach-feedback-chat) | Stesso: `OPENAI_MODEL` o **gpt-5.2**, fallback **gpt-4o**. |
| **Contromisure** (generate-countermeasures) | `OPENAI_MODEL` o **gpt-5.2**, poi fallback **gpt-4o** / gpt-4-turbo / gpt-4. |
| **Salvataggio feedback** (save-coach-feedback) | `OPENAI_MODEL` o **gpt-5.2**. |
| **Estrazione dati** (extract-player, extract-coach, extract-formation, extract-match-data, extract-game-analysis) | **gpt-4o** (fisso). |
| **Analisi partita** (analyze-match) | **gpt-4o** (fisso). |

In **chat** vedi sotto ogni risposta dell’assistente la riga «Modello: gpt-5.2» (o altro) o «Modello: gpt-4o»: così sai subito se sta usando GPT-5.2 o il fallback.

Per forzare un modello: in `.env` / Vercel imposta `OPENAI_MODEL=gpt-5.2` (consigliato), `OPENAI_MODEL=gpt-5.1`, oppure `OPENAI_MODEL=gpt-4o`. L'alias **gpt-5** è deprecato: usare **gpt-5.2** o **gpt-5.1**.

### Locale vs Vercel — cosa impostare

| Dove | Cosa serve |
|------|------------|
| **Locale** | Copia `.env.example` in `.env.local`. Imposta **`OPENAI_API_KEY`** (obbligatorio: senza non parte la chat, ritorna OPENAI_KEY_MISSING). Opzionale: **`OPENAI_MODEL=gpt-5.2`** (se non la metti, il codice usa già gpt-5.2). |
| **Vercel** | In **Settings → Environment Variables** imposta **`OPENAI_API_KEY`** (la chiave da OpenAI). Opzionale: **`OPENAI_MODEL=gpt-5.2`** (o lascia vuoto per il default). Dopo aver cambiato le variabili fai **Redeploy**. |

Se in locale la chat dà subito errore tipo "Chiave API OpenAI non configurata", manca `OPENAI_API_KEY` in `.env.local`. Se vedi «Modello: gpt-4o» in risposta, il modello richiesto (gpt-5.2 o quello in `OPENAI_MODEL`) è stato rifiutato da OpenAI e l’app ha usato il fallback; controlla i log (locale o Vercel) per il messaggio di errore OpenAI.

### Cosa fa il codice (assistant-chat)

1. Legge il modello: `model = (process.env.OPENAI_MODEL || 'gpt-5.2').trim()` → se la variabile non c’è o è vuota, usa **gpt-5**.
2. Invia a OpenAI la richiesta con `model: model` (es. gpt-5).
3. Se OpenAI risponde **404** o **400** con messaggio tipo “model not found” / “not available”, l’app **non** restituisce errore: riprova una sola volta con **gpt-4o** e restituisce quella risposta con `model_used: 'gpt-4o'`.
4. Se la prima richiesta (gpt-5.2) va a buon fine, restituisce la risposta con `model_used: model` (es. gpt-5).

Quindi **se vedi «Modello: gpt-4o»** significa che la richiesta con il modello scelto (gpt-5.2 o quanto in `OPENAI_MODEL`) è stata **rifiutata da OpenAI** e l’app ha usato il fallback. La causa è lato OpenAI (modello non disponibile per l’account, nome errato, billing).

---

## Perché GPT-5 potrebbe non funzionare

OpenAI a volte restituisce **400 Bad Request** (non 404) quando il modello non è disponibile per l’account; l’app ora tratta anche questi casi e fa fallback a gpt-4o.

Dopo il deploy, se la chat va ancora in errore con `gpt-5.2`, controlla i **log su Vercel** (Functions → assistant-chat → Logs). Troverai una riga tipo:

```text
[assistant-chat] OpenAI error: status=..., code=..., message=..., model requested=gpt-5.2
```

## Cause possibili

### 1. **Piano Free / modello non disponibile per il tuo tier**
Nella [documentazione OpenAI](https://platform.openai.com/docs/models/gpt-5), GPT-5 ha **"Free | Not supported"**: sul piano gratuito il modello non è disponibile. Serve un account a pagamento (Tier 1 o superiore).

- **Cosa fare:** vai su [Usage](https://platform.openai.com/usage), aggiungi un metodo di pagamento e assicurati di avere un tier che supporta GPT-5.

### 2. **Nome modello errato**
L’API accetta ad esempio (verifica su [OpenAI Models](https://platform.openai.com/docs/models)):
- **`gpt-5.2`** (consigliato, default in questo progetto; alias `gpt-5` deprecato)
- `gpt-5.1`, `gpt-5.2-chat-latest`, `gpt-5.2-pro`
- `gpt-5-mini`, `gpt-5-nano`, `gpt-5-chat-latest`
- Snapshot tipo `gpt-5-2025-08-07`

Se in `OPENAI_MODEL` hai un typo o usi `gpt-5` (deprecato), OpenAI risponde con `model_not_found` / 404. Imposta `OPENAI_MODEL=gpt-5.2` (o `gpt-5.1`) in Vercel e ridistribuisci.

### 3. **Errore diverso da “model not found”**
Se nei log vedi `status=429` → rate limit; `status=401` → chiave API non valida; `status=500` → problema lato OpenAI. In questi casi il fallback automatico a gpt-4o non viene usato (è solo per `model_not_found`).

## Come verificare

1. **Log Vercel:** Project → Logs (o Functions → assistant-chat) e cerca `OpenAI error:` per vedere `status`, `code`, `message` e `model requested`.
2. **Dashboard OpenAI:** [API keys](https://platform.openai.com/api-keys), [Usage](https://platform.openai.com/usage), [Models](https://platform.openai.com/docs/models) per tier e modelli disponibili.
3. **Test diretto:** da terminale (sostituisci `sk-...` con la tua chiave):
   ```bash
   curl -s https://api.openai.com/v1/chat/completions -H "Authorization: Bearer sk-..." -H "Content-Type: application/json" -d "{\"model\":\"gpt-5.2\",\"messages\":[{\"role\":\"user\",\"content\":\"hi\"}],\"max_tokens\":5}"
   ```
   La risposta JSON conterrà l’eventuale errore (es. `"code":"model_not_found"` o messaggio sul billing).

## Come sapere quale modello ha risposto

- **In chat (UI):** sotto ogni risposta dell’assistente compare una riga tipo «Modello: gpt-5» o «Modello: gpt-4o». Se vedi **gpt-4o** significa che è stato usato il fallback (es. gpt-5 non disponibile per l’account).
- **Nei log Vercel:** cerca `[assistant-chat] Success, model_used: gpt-5.2` oppure `Success (fallback ...), model_used: gpt-4o`.
- **Nella risposta API:** il JSON include il campo `model_used` (es. `"gpt-5.2"` o `"gpt-4o"`).

## Comportamento dell’app

- Se OpenAI risponde con **model not found** (404) o **400** con messaggio sul modello, l’app riprova automaticamente con **gpt-4o** e la chat funziona ugualmente; in quel caso vedrai «Modello: gpt-4o».
- Per usare davvero GPT-5 serve che il tuo account OpenAI abbia accesso al modello (tier e billing corretti).
