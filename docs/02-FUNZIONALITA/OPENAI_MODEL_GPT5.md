# Modelli OpenAI usati dal codice

Default chat: **`gpt-5.2`** (`OPENAI_MODEL`). L’alias `gpt-5` è deprecato da OpenAI: non usarlo in env.  
Fallback automatico su rifiuto modello: **`gpt-4o`**.

## Mappa reale

| Superficie | Modello |
|------------|---------|
| Hero Chat `assistant-chat` | `OPENAI_MODEL` \|\| `gpt-5.2` → fallback `gpt-4o` |
| Palestra `coach-feedback-chat` | idem |
| Save feedback `save-coach-feedback` | `OPENAI_MODEL` \|\| `gpt-5.2` |
| Contromisure `generate-countermeasures` | `OPENAI_MODEL` \|\| `gpt-5.2` → `gpt-4o` → `gpt-4-turbo` → `gpt-4` |
| Card Advisor deep | `CARD_ADVISOR_DEEP_MODEL` \|\| `gpt-5.2` → fallback `gpt-4o` |
| Extract player/coach/formation/match-data/game-analysis | **`gpt-4o` fisso** |

In chat, sotto la risposta compare `model_used`. Se vedi `gpt-4o` sulla Hero Chat, OpenAI ha rifiutato `gpt-5.2` (o il valore di `OPENAI_MODEL`).

## Env

- Locale: `OPENAI_API_KEY` in `.env.local` (obbligatoria). `OPENAI_MODEL` opzionale.
- Vercel: stesse variabili, poi Redeploy.
- Senza `OPENAI_API_KEY` la chat torna `OPENAI_KEY_MISSING`.

## Fallback

Il fallback `gpt-4o` scatta su `model_not_found` / modello non disponibile. Non scatta su 401, 429, 500.

Log: `[assistant-chat] OpenAI error: status=..., model requested=gpt-5.2`.
