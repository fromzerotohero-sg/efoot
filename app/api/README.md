# app/api — route reali

Quasi tutti gli endpoint utente richiedono `Authorization: Bearer`.  
Eccezioni: webhook accredito (`CREDITS_ACCREDIT_API_KEY`), status prelaunch/maintenance, alcune route catalogo/releases a seconda del file.

Rate limit in-memory (`lib/rateLimiter.js`): mitigante, non Redis.

## AI / Coach

- `assistant-chat` — Hero Chat (2 HP, gpt-5.2 → gpt-4o)
- `coach-feedback-chat`, `save-coach-feedback` — Palestra (2 HP)
- `refresh-diagnostic` — cache contesto
- `generate-countermeasures`, `analyze-match`
- `extract-player`, `extract-coach`, `extract-formation`, `extract-match-data`, `extract-game-analysis` (gpt-4o)

## Live Coach

- `live-coach/session`, `heartbeat`, `end`

## Rosa / catalogo

- `player-catalog/search`, `coach-catalog/search`, `playing-styles`
- `supabase/save-player`, `delete-player`, `assign-player-to-slot`, `remove-player-from-slot`
- `supabase/save-formation-layout`, `save-tactical-settings`
- `supabase/save-coach`, `set-active-coach`
- `formation`, `players/[id]`
- `build-coach/roster`, `build-coach/player/[id]`, `build-coach/repair-play-profile`
- `starter-pack/import`

## Partite / profilo / knowledge

- `matches`, `supabase/save-match`, `update-match`, `delete-match`, `save-opponent-formation`
- `supabase/save-profile`, `save-ai-info`
- `user/profile`, `dashboard`, `ai-knowledge`
- `tasks/list` (side effect generate/update), `tasks/generate`
- `admin/recalculate-patterns`

## Carte

- `card-advisor-lab/evaluate`, `deep-analysis` (2 HP), `releases`, `build-preview`, `image`
- `card-advisor-access/unlock`

## Economia / auth / gate

- `credits/usage`, `credits/transactions`, `credits/accredit`
- `daily-spin`, `daily-spin/stats`
- `auth/metalgate-callback`, `metalgate-sync`
- `prelaunch/*`, `maintenance/*`

## Quarantena

- `smart/chat`, `smart/context`, `smart/countermeasures`, `smart/extract-formation` — non reintrodurre come ingresso UX (`SMART_COACH_ENTRY` default false)
