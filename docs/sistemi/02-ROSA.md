# Rosa / Formazione / Allenatori

Motore UI: `app/nuova-rosa-lab/page.jsx`.  
`/gestione-formazione` lo re-esporta. Pagina dedicata allenatori: `/allenatori`.

## Contratti

| Pezzo | Dettaglio |
|-------|-----------|
| Catalogo giocatori | `GET /api/player-catalog/search` → tabella `player_catalog` |
| Slot | titolari `slot_index` 0–10; riserve `NULL` (max 12) |
| Assign / remove | `/api/supabase/assign-player-to-slot`, `remove-player-from-slot` |
| Save / delete player | `/api/supabase/save-player`, `delete-player` |
| Layout | `/api/supabase/save-formation-layout` |
| Fluid Formation | `/api/tactical/formation-variants` |
| Tattiche | `/api/supabase/save-tactical-settings` |
| Coach utente | `save-coach`, `set-active-coach`, `GET /api/coaches` |
| Catalogo coach | `/api/coach-catalog/search` |
| Extract | `extract-player`, `extract-coach` (2 HP, gpt-4o) |
| Build Coach | `/api/build-coach/roster`, `/api/build-coach/player/[id]` |
| Dettaglio | `GET /api/players/[id]` |
| Formazione live | `GET /api/formation` |

## Tabelle

`players`, `formation_layout`, `formation_variants`, `team_tactical_settings`, `playing_styles`, `player_catalog`, `coaches`, `coach_catalog`.

## Separazioni obbligatorie

- Skill native ≠ additional (max 5) ≠ COM/IA playstyles
- Posizione carta ≠ posizione slot in campo
- Stile attacco ≠ stile difesa (v6 dual)
- Contropiede veloce ≠ Contrattacco

## Legacy (non prodotto attivo)

- `POST /api/starter-pack/import` — nessuna UX attiva
- `POST /api/build-coach/repair-play-profile` — nessuna UX attiva
- `GET /api/playing-styles` — gli stili arrivano da `formation.read`

Import catalogo: [PLAYER_CATALOG_IMPORT.md](../PLAYER_CATALOG_IMPORT.md).
