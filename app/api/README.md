# app/api — route reali

Quasi tutti gli endpoint utente richiedono `Authorization: Bearer`.  
Eccezioni: webhook accredito (`CREDITS_ACCREDIT_API_KEY`), status prelaunch/maintenance, alcune route catalogo/releases.

Rate limit: `lib/rateLimiter.js` in-memory (non Redis).

## Attive (UX corrente)

**Hero / memoria**

- `assistant-chat` — Hero (2 HP)
- `hero-chat`, `hero-chat/plans` — persistenza
- `coach-feedback-chat`, `save-coach-feedback` — Palestra (2 HP)
- `refresh-diagnostic`, `ai-knowledge`
- `generate-countermeasures` (2 HP)

**Vision**

- `extract-player`, `extract-coach`, `extract-formation`, `extract-match-data`, `extract-game-analysis` (gpt-4o, 2 HP)

**Rosa / coach / tattiche**

- `player-catalog/search`, `coach-catalog/search`
- `supabase/save-player`, `delete-player`, `assign-player-to-slot`, `remove-player-from-slot`
- `supabase/save-formation-layout`, `save-tactical-settings`, `save-coach`, `set-active-coach`
- `formation`, `players/[id]`, `coaches`
- `tactical/formation-variants`
- `build-coach/roster`, `build-coach/player/[id]`

**Partite**

- `supabase/save-match`, `save-opponent-formation`

**Carte**

- `card-advisor-lab/deep-analysis` (2 HP), `releases`, `build-preview`, `image`

**Profilo / economia / gate / notifiche**

- `user/profile`, `supabase/save-profile`, `save-ai-info`, `dashboard`
- `credits/usage`, `credits/accredit` (webhook)
- `auth/metalgate-*`, `metalgate-sync`
- `prelaunch/*`, `maintenance/*`
- `notifications`, `notifications/prefs`

## Legacy (presenti su disco, non prodotto attivo)

Non promuovere in UX / non migrare nel backend cutover senza decisione:

- `tasks/list`, `tasks/generate`
- `starter-pack/import`
- `card-advisor-lab/evaluate`, `card-advisor-access/unlock`
- `credits/transactions`
- `build-coach/repair-play-profile`
- `admin/recalculate-patterns`
- `playing-styles` (stili arrivano da formation.read)
- `prelaunch/session`

Inventario ufficiale backend: `backend/src/inventory.ts`.  
Doc sistemi: [../docs/sistemi/](../docs/sistemi/)
