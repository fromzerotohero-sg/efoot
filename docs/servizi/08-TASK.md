# Task / weekly goals — contratto corrente

Pagine: widget su Home (`TaskWidget`, `MissionCenter`, `HeroCoachJourney`).  
API: `GET /api/tasks/list`, `POST /api/tasks/generate`.  
Tabella: `weekly_goals`. Helper: `lib/taskHelper.js`.

## Side effect obbligatorio da conoscere

`GET /api/tasks/list` **può scrivere**:

1. genera task della settimana se mancano (`generateWeeklyTasksForUser`)
2. aggiorna progresso (`updateTasksProgressAfterMatch`)

Non trattarlo come GET innocuo. UX V2 può fare da façade (`Prossima azione` / `Piano Coach`) ma deve preservare questo comportamento finché non si sposta consapevolmente.

## Fallback

Se la generazione personalizzata fallisce, `taskHelper` inserisce task generici/hardcoded. È debito noto (L-04): non presentarli come obiettivi “calcolati su di te” senza distinzione UI.

## Progresso da partite

`save-match` / `update-match` chiamano `updateTasksProgressAfterMatch`.  
Task `use_ai_recommendations` legge `credit_transactions` (whitelist in `taskHelper.js`).

In UX V2 i widget concorrenti Mission/Journey/Suggestions bypassano come ingressi; i side effect restano.
