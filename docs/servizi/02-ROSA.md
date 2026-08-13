# Rosa — contratto corrente

Motore reale: `app/nuova-rosa-lab/page.jsx`.  
`/gestione-formazione` e alias (`/lista-giocatori`, `/upload`) lo re-esportano o redirigono lì.

Non riscrivere la pagina intera nello sprint UX. Progressive disclosure: campo + 11 titolari in evidenza; build/booster/skill dietro dettaglio.

## Contratti da preservare

| Pezzo | Dettaglio |
|-------|-----------|
| Catalog picker | `GET /api/player-catalog/search` — carte da `player_catalog`, non da `players` |
| Slot | titolari `slot_index` 0–10; riserve NULL |
| Assign/remove | `/api/supabase/assign-player-to-slot`, `remove-player-from-slot` |
| Save player | `/api/supabase/save-player` |
| Layout | `/api/supabase/save-formation-layout` |
| Tattiche | `/api/supabase/save-tactical-settings` |
| Coach | `save-coach`, `set-active-coach`, `extract-coach`, catalog `/api/coach-catalog/search` |
| Dettaglio | `/giocatore/[id]`, `/api/players/[id]` |
| Build Coach | `/api/build-coach/*` |

## Tabelle

`players`, `formation_layout`, `team_tactical_settings`, `playing_styles`, `player_catalog`, `coaches`.

## Import catalogo

Regole e tool: [PLAYER_CATALOG_IMPORT.md](../PLAYER_CATALOG_IMPORT.md).  
`players` è la rosa del cliente: gli import catalogo non devono sovrascriverla se non via backfill esplicito.
