# Partite — contratto corrente

Partite, statistiche e contromisure sono workflow della chat Hero. Non hanno pagine autonome.

## API

| Metodo | Route | Effetto |
|--------|-------|---------|
| POST | `/api/extract-match-data` | OCR/estrazione screenshot (gpt-4o), 2 HP |
| POST | `/api/supabase/save-match` | insert `matches` + pattern + knowledge + task progress |
| POST | `/api/extract-game-analysis` | stats di gioco, 2 HP × immagine |
| POST | `/api/extract-formation` | formazione avversaria |
| POST | `/api/supabase/save-opponent-formation` | salva modulo avversario |
| POST | `/api/generate-countermeasures` | pre-match, 2 HP |
| POST | `/api/admin/recalculate-patterns` | ricalcolo `team_tactical_patterns` |

Non esiste `lib/leaderboardHelper.js`. I match non alimentano una classifica in-app.

## Tabelle

`matches` → side effect su `team_tactical_patterns`, `user_profiles` (knowledge), `weekly_goals`.  
`user_game_analysis` è l’ultima analisi stats, non lo storico partite.
