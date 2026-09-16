# Partite / Vision / Contromisure

Non esistono pagine Match autonome. Partite, screenshot e contromisure sono workflow di Hero Chat sulla Home Coach.

## API attive

| Metodo | Route | Effetto | HP |
|--------|-------|---------|----|
| POST | `/api/extract-match-data` | Estrazione screenshot partita (gpt-4o) | 2 |
| POST | `/api/supabase/save-match` | Insert `matches` + side effect | — |
| POST | `/api/extract-game-analysis` | Stats di gioco (gpt-4o) | 2 × immagine |
| POST | `/api/extract-formation` | Formazione avversaria | 2 |
| POST | `/api/supabase/save-opponent-formation` | Salva modulo avversario | — |
| POST | `/api/generate-countermeasures` | Piano pre-match | 2 |
| GET/POST | `/api/hero-chat/plans` | Persistenza piani pre-match | — |

## Side effect di `save-match`

1. Aggiorna `team_tactical_patterns`
2. Ricalcola AI Knowledge
3. Può aggiornare progresso `weekly_goals` (tabella legacy; UI Task assente)

## Zone — contratto da non rompere

Attacco utente ≠ attacco avversario / pressione concessa ≠ zone dei gol subiti.  
Helper: `lib/matchAttackZones.js`. Migration additiva: `migrations/20260915_add_match_zone_contract.sql`.

## Tabelle

`matches`, `team_tactical_patterns`, `user_game_analysis`, `opponent_formations`, `prematch_plans`, `hero_chat_threads`, `hero_chat_messages`.

## Legacy

- `POST /api/admin/recalculate-patterns` — nessun caller HTTP attivo; il ricalcolo resta side effect interno di save-match
- Live Coach / pagine Match storiche — rimosse, non migrare
