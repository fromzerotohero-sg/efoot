# Partite — contratto corrente

Pagine: `/match`, `/match/new`, `/match/[id]`. In UX V2 diventano strumento contestuale di Coach, le route restano.

## API

| Metodo | Route | Effetto |
|--------|-------|---------|
| POST | `/api/extract-match-data` | OCR/estrazione screenshot (gpt-4o), 2 HP |
| POST | `/api/supabase/save-match` | insert `matches` + pattern + knowledge + task progress |
| POST | `/api/supabase/update-match` | update + ricalcolo analogo |
| DELETE | `/api/supabase/delete-match` | delete; **non** ricalcola pattern come save (gap P2) |
| GET | `/api/matches` | lista |
| POST | `/api/analyze-match` | riassunto AI (gpt-4o), 2 HP |
| POST | `/api/extract-game-analysis` | stats di gioco, 2 HP × immagine |
| POST | `/api/extract-formation` | formazione avversaria |
| POST | `/api/supabase/save-opponent-formation` | salva modulo avversario |
| POST | `/api/generate-countermeasures` | pre-match, 2 HP |
| POST | `/api/admin/recalculate-patterns` | ricalcolo `team_tactical_patterns` |

Non esiste `lib/leaderboardHelper.js`. I match non alimentano una classifica in-app.

## Tabelle

`matches` → side effect su `team_tactical_patterns`, `user_profiles` (knowledge), `weekly_goals`.  
`user_game_analysis` è l’ultima analisi stats, non lo storico partite.
