# Task / weekly goals — contratto corrente

Nessuna superficie utente attiva. Il sottosistema resta solo per compatibilità dati e side effect.
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

`save-match` chiama `updateTasksProgressAfterMatch`.
Task `use_ai_recommendations` legge `credit_transactions` (whitelist in `taskHelper.js`).

I widget concorrenti non sono montati; i side effect restano.
