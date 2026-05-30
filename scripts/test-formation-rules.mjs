/**
 * Test riconoscimento moduli Konami da slot_positions.
 * node scripts/test-formation-rules.mjs
 */
import { DEFAULT_SLOT_POSITIONS } from '../lib/formationDefaultSlots.js'
import { FORMATION_PRESETS, resolveKonamiFormationName } from '../lib/formationRules.js'
import { getFormationNameFromSlotPositions } from '../lib/validateFormationLimits.js'

function slotsFromPreset(preset) {
  const slots = {}
  for (let i = 0; i <= 10; i++) {
    const position = preset.slots[i]
    if (!position) continue
    slots[i] = {
      x: 50,
      y: 50,
      position
    }
  }
  return slots
}

let failed = 0

for (const preset of FORMATION_PRESETS) {
  const slots = slotsFromPreset(preset)
  const name = resolveKonamiFormationName(slots)
  if (name !== preset.name) {
    console.error(`FAIL preset ${preset.name}: got ${name || 'null'}`)
    failed += 1
  }
}

const defaultName = resolveKonamiFormationName(DEFAULT_SLOT_POSITIONS)
if (defaultName !== '4-3-3') {
  console.error(`FAIL default 4-3-3: got ${defaultName}`)
  failed += 1
}

const slots3232 = slotsFromPreset(FORMATION_PRESETS.find((p) => p.name === '3-2-3-2'))
if (getFormationNameFromSlotPositions(slots3232) !== '3-2-3-2') {
  console.error(`FAIL 3-2-3-2 via getFormationName: got ${getFormationNameFromSlotPositions(slots3232)}`)
  failed += 1
}

if (failed === 0) {
  console.log(`OK: ${FORMATION_PRESETS.length} preset + default 4-3-3`)
} else {
  console.error(`FAILED: ${failed} test(s)`)
  process.exit(1)
}
