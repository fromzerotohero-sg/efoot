# Coerenza: save-tactical-settings

**Flusso**: Frontend (Gestione formazione) → POST `/api/supabase/save-tactical-settings` → Supabase `team_tactical_settings`.

## Allineamento logiche

| Punto | Frontend | API | DB |
|------|----------|-----|-----|
| **Titolari** | `titolari = players con slot_index !== null && 0–10` | `.not('slot_index', 'is', null)` (constraint DB = 0–10) | `players.slot_index` 0–10 o NULL |
| **Istruzioni senza player** | Invia `instruction` + `player_id: ''` se giocatore non più titolare (sanitize) | Non 400: istruzione **scartata**, salva il resto; `warning` in response | Solo coppie (player_id, instruction) valide in `individual_instructions` |
| **Player non più titolare** | `tacticalSettingsForPanel`: azzera `player_id` se non in `titolariIds` | Se `player_id` non in titolari: scarta, aggiunge a `droppedInstructions`, salva il resto | idem |
| **Validazione** | Dropdown solo titolari compatibili (filterPlayers) | `validateIndividualInstruction`: player in titolari, posizione compatibile, istruzione ammessa, regole linea_bassa/contropiede | — |
| **team_playing_style** | Select uno dei 5 stili | Whitelist `validStyles` | CHECK su `team_playing_style` |

## Comportamento attuale

1. **Istruzione con player_id vuoto**: API scarta quella voce, salva le altre, 200 + eventuale `warning`.
2. **Player_id non in titolari**: API scarta quella voce, salva le altre, 200 + `warning`.
3. **Entrambi presenti e player titolare**: validazione (posizione, linea_bassa, contropiede); se OK si salva.
4. **Frontend**: passa al panel `tacticalSettingsForPanel` con `player_id` azzerato dove il giocatore non è più in `titolari`, così non si invia istruzione “parziale” che prima causava 400.

## Riferimenti

- `app/api/supabase/save-tactical-settings/route.js`
- `app/gestione-formazione/page.jsx` (tacticalSettingsForPanel, handleSaveTacticalSettings)
- `components/TacticalSettingsPanel.jsx`
- `lib/tacticalInstructions.js` (validateIndividualInstruction, INDIVIDUAL_INSTRUCTIONS_CONFIG)
