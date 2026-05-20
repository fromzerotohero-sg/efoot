/**
 * Verifica anchor confronto skill (modulo salvato vs scheda rosa).
 * node scripts/test-card-advisor-anchor.mjs
 */
import { pickComparisonAnchor } from '../lib/cardAdvisorPurchaseContext.js'

const formation = {
  formation: '3-3-4',
  slot_positions: {
    0: { position: 'PT' },
    1: { position: 'DC' },
    2: { position: 'DC' },
    3: { position: 'DC' },
    4: { position: 'SP' },
    5: { position: 'CC' },
    6: { position: 'MED' },
    7: { position: 'TRQ' },
    8: { position: 'P' },
    9: { position: 'SP' },
    10: { position: 'CLD' }
  }
}

const starters = [
  { player_name: 'Ruud Gullit', position: 'P', slot_index: 4 },
  { player_name: 'Gabriel Batistuta', position: 'P', slot_index: 8 },
  { player_name: 'Andriy Shevchenko', position: 'SP', slot_index: 9 },
  { player_name: 'Pavel Nedvěd', position: 'CLD', slot_index: 10 }
]

const anchor = pickComparisonAnchor(starters, 'EDA', 'Isaksen', formation)
console.log(JSON.stringify(anchor, null, 2))

if (anchor.player?.player_name !== 'Pavel Nedvěd') {
  console.error('FAIL: expected Nedvěd for EDA pack, got', anchor.player?.player_name)
  process.exit(1)
}
if (anchor.type !== 'same_wide_flank') {
  console.error('FAIL: expected same_wide_flank, got', anchor.type)
  process.exit(1)
}
console.log('OK: EDA → wide flank CLD (Nedvěd)')

const spAnchor = pickComparisonAnchor(starters, 'SP', 'Test SP', formation)
if (spAnchor.player?.player_name !== 'Ruud Gullit' || spAnchor.type !== 'same_field_role') {
  console.error('FAIL SP anchor', spAnchor)
  process.exit(1)
}
console.log('OK: SP → Gullit in campo (slot 4 SP)')
