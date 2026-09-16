# Hero Chat

UI: `components/hero-chat/HeroChat.jsx` (Home Coach).  
Motore: `POST /api/assistant-chat`. Persistenza thread: `/api/hero-chat`.

Costo: **2 HP**.

## Cosa fa

Coach tattico: usa rosa, coach, tattiche, partite, memoria, Truth Layer e RAG per rispondere. Non inventa dati mancanti.

## Contesto (ordine concettuale)

1. **Truth Layer** — `lib/efootballTruthLayer.js` + `coachPromptRules`
2. **Dati live utente** — rosa, coach, tattiche, partite, zone
3. **Memoria personale** — profilo, feedback Palestra, diagnostic
4. **RAG** — `info_rag.md` via `lib/ragHelper.js` (keyword, non vector)
5. **Meta / community** — solo come naming secondario
6. **LLM** — ragiona e verbalizza

## Memoria

- Cache: `user_diagnostic_cache` (fresca se ≤ ~6h)
- Overlay live su stilie/istruzioni/fluid/link-up/zone
- Feedback Palestra: in diagnostic e, se assente lì, append dedicato (senza duplicare)
- Messaggi `system` transitori UI **non** si salvano in cronologia

## Persistenza

| Route | Ruolo |
|-------|--------|
| `GET/POST /api/hero-chat` | Thread + messaggi (`user` / `hero`) |
| `GET/POST/PATCH /api/hero-chat/plans` | Piani contromisure |

Retention: ultimi 80 messaggi per thread.

## Modello

`OPENAI_MODEL` \|\| `gpt-5.2` → fallback `gpt-4o`. Dettaglio: [OPENAI_MODELLI.md](../OPENAI_MODELLI.md).

## Separazione da Palestra

| Motore | Ruolo |
|--------|--------|
| Hero (`assistant-chat`) | Ragiona e consiglia |
| Palestra (`coach-feedback-chat` / `save-coach-feedback`) | Ascolta, raccoglie, aggiorna conoscenza |

Non fondere i due backend.
