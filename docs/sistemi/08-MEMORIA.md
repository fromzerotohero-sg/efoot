# Memoria / “Quanto ti conosce”

## Cosa significa

Punteggio di **conoscenza utile e affidabile** sull’utente — non “quanto usa l’app”.

Codice production: `lib/aiKnowledgeHelper.js`  
API: `GET /api/ai-knowledge`  
Backend: `backend/src/domains/memory/aiKnowledge.ts`

## Dimensioni

Profilo · rosa · partite · pattern · coach attivo · usage · success · coach training (feedback Palestra).

## Regole attuali (post-allineamento)

- Chat usage: conta messaggi utente reali in `hero_chat_messages`, **non** `matches / 3`
- Divisioni eFootball: Divisione 1 è migliore di 2 → progresso = numero **più basso**
- Cache score ~5 minuti su `user_profiles`

## Diagnostic

| Pezzo | Ruolo |
|-------|--------|
| `POST /api/refresh-diagnostic` | Rigenera `user_diagnostic_cache` |
| `lib/diagnosticBuilder.js` | Testo contesto Hero |
| `lib/diagnosticCacheSanitize.js` | Rimuove sezioni stale sostituite dal live |

## Provenienza (concettuale)

| Tipo | Esempio |
|------|---------|
| USER_STATED | Dichiarato in profilo / Palestra |
| MEASURED_DATA | Match, pattern, zone reali |
| AI_INFERENCE | Insight Palestra / ipotesi Hero |
| USER_CONFIRMED | Dichiarazione confermata dopo |

Oggi la distinzione è soprattutto nel **modo in cui il prompt prepara il contesto**, non in tabelle separate. Non inventare migration solo per “pulizia architetturale”.

## Side effect refresh

Dopo save rosa / coach / tattiche / profilo / partite: refresh AI Knowledge (best effort). Nel backend dormiente il refresh passa il token utente.
