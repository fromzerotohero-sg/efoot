# Hero Chat — contratto corrente

UI: `components/AssistantChat.jsx` (popup montato da `AppLayoutShell`) e `/assistant`.  
Motore: `POST /api/assistant-chat`. Costo: **2 HP**.

## Modello

`OPENAI_MODEL` oppure default **gpt-5.2**. Se OpenAI rifiuta il modello → fallback **gpt-4o**.  
Estrazioni screenshot restano gpt-4o fisso. Mappa: [OPENAI_MODEL_GPT5.md](../02-FUNZIONALITA/OPENAI_MODEL_GPT5.md).

## RAG

Non è vector-RAG. `lib/ragHelper.js` legge `info_rag.md`, classifica la domanda, inserisce sezioni nel prompt. Non modificare `info_rag.md` in uno sprint UX.

## Memoria

Il context builder usa profilo, rosa, coach, cache diagnostica (`user_diagnostic_cache`).

**P1:** se la cache ha più di ~6 ore, il dettaglio `user_tactical_feedback` può non entrare nel prompt. Non promettere “Hero ricorda sempre” finché S4 non è fatto.

Refresh: `POST /api/refresh-diagnostic`.

## UX V2

Una sola identità Hero. Le domande tattiche restano su questo endpoint; il feedback strutturato va al motore Palestra. Non fondere i due backend nella prima slice.
