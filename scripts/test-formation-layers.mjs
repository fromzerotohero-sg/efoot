/**
 * Test nome modulo da layer verticali (Konami-style).
 * node scripts/test-formation-layers.mjs
 */
import { DEFAULT_SLOT_POSITIONS } from '../lib/formationDefaultSlots.js'
import { formationNameFromVerticalLayers } from '../lib/formationLayerName.js'
import { getFormationNameFromSlotPositions } from '../lib/validateFormationLimits.js'

function buildSlots(entries) {
  const slots = { 0: { x: 50, y: 90, position: 'PT' } }
  entries.forEach(({ slot, x, y, position }) => {
    slots[slot] = { x, y, position }
  })
  return slots
}

const cases = [
  {
    name: '4-2-1-3',
    expected: '4-2-1-3',
    slots: buildSlots([
      { slot: 1, x: 20, y: 70, position: 'TD' },
      { slot: 2, x: 40, y: 70, position: 'DC' },
      { slot: 3, x: 60, y: 70, position: 'DC' },
      { slot: 4, x: 80, y: 70, position: 'TS' },
      { slot: 5, x: 35, y: 54, position: 'MED' },
      { slot: 6, x: 65, y: 52, position: 'CC' },
      { slot: 7, x: 50, y: 45, position: 'TRQ' },
      { slot: 8, x: 25, y: 32, position: 'ESA' },
      { slot: 9, x: 50, y: 28, position: 'P' },
      { slot: 10, x: 75, y: 32, position: 'EDA' }
    ])
  },
  {
    name: '4-3-2-1',
    expected: '4-3-2-1',
    slots: buildSlots([
      { slot: 1, x: 20, y: 70, position: 'TD' },
      { slot: 2, x: 40, y: 70, position: 'DC' },
      { slot: 3, x: 60, y: 70, position: 'DC' },
      { slot: 4, x: 80, y: 70, position: 'TS' },
      { slot: 5, x: 30, y: 53, position: 'MED' },
      { slot: 6, x: 50, y: 55, position: 'CC' },
      { slot: 7, x: 70, y: 53, position: 'CC' },
      { slot: 8, x: 45, y: 41, position: 'TRQ' },
      { slot: 9, x: 55, y: 39, position: 'SP' },
      { slot: 10, x: 50, y: 28, position: 'P' }
    ])
  },
  {
    name: '4-3-1-2 (SP basso)',
    expected: '4-3-1-2',
    slots: buildSlots([
      { slot: 1, x: 20, y: 70, position: 'TD' },
      { slot: 2, x: 40, y: 70, position: 'DC' },
      { slot: 3, x: 60, y: 70, position: 'DC' },
      { slot: 4, x: 80, y: 70, position: 'TS' },
      { slot: 5, x: 30, y: 53, position: 'MED' },
      { slot: 6, x: 50, y: 55, position: 'CC' },
      { slot: 7, x: 70, y: 53, position: 'CC' },
      { slot: 8, x: 50, y: 44, position: 'TRQ' },
      { slot: 9, x: 40, y: 32, position: 'SP' },
      { slot: 10, x: 60, y: 28, position: 'P' }
    ])
  },
  {
    name: '3-2-3-2 (CC+MED)',
    expected: '3-2-3-2',
    slots: buildSlots([
      { slot: 1, x: 20, y: 68, position: 'DC' },
      { slot: 2, x: 50, y: 68, position: 'DC' },
      { slot: 3, x: 80, y: 68, position: 'DC' },
      { slot: 4, x: 35, y: 54, position: 'CC' },
      { slot: 5, x: 65, y: 52, position: 'MED' },
      { slot: 6, x: 50, y: 45, position: 'TRQ' },
      { slot: 7, x: 20, y: 46, position: 'CLS' },
      { slot: 8, x: 80, y: 46, position: 'CLD' },
      { slot: 9, x: 35, y: 28, position: 'P' },
      { slot: 10, x: 65, y: 30, position: 'SP' }
    ])
  },
  {
    name: '4-3-3',
    expected: '4-3-3',
    slots: buildSlots([
      { slot: 1, x: 20, y: 70, position: 'TS' },
      { slot: 2, x: 40, y: 70, position: 'DC' },
      { slot: 3, x: 60, y: 70, position: 'DC' },
      { slot: 4, x: 80, y: 70, position: 'TD' },
      { slot: 5, x: 30, y: 53, position: 'CC' },
      { slot: 6, x: 50, y: 58, position: 'MED' },
      { slot: 7, x: 70, y: 53, position: 'CC' },
      { slot: 8, x: 25, y: 34, position: 'ESA' },
      { slot: 9, x: 50, y: 28, position: 'P' },
      { slot: 10, x: 75, y: 34, position: 'EDA' }
    ])
  },
  {
    name: 'default builder 4-3-3',
    expected: '4-3-3',
    slots: DEFAULT_SLOT_POSITIONS
  }
]

let failed = 0

for (const testCase of cases) {
  const layer = formationNameFromVerticalLayers(testCase.slots)
  const finalName = getFormationNameFromSlotPositions(testCase.slots)
  if (layer !== testCase.expected || finalName !== testCase.expected) {
    console.error(`FAIL ${testCase.name}: layer=${layer || 'null'} final=${finalName} (expected ${testCase.expected})`)
    failed += 1
  }
}

// TRQ troppo basso → layer diverso (comportamento atteso Konami)
const trqLow = buildSlots([
  { slot: 1, x: 20, y: 68, position: 'DC' },
  { slot: 2, x: 50, y: 68, position: 'DC' },
  { slot: 3, x: 80, y: 68, position: 'DC' },
  { slot: 4, x: 35, y: 52, position: 'CC' },
  { slot: 5, x: 65, y: 52, position: 'MED' },
  { slot: 6, x: 50, y: 38, position: 'TRQ' },
  { slot: 7, x: 20, y: 50, position: 'CLS' },
  { slot: 8, x: 80, y: 50, position: 'CLD' },
  { slot: 9, x: 35, y: 28, position: 'P' },
  { slot: 10, x: 65, y: 28, position: 'SP' }
])
const trqLowName = formationNameFromVerticalLayers(trqLow)
if (trqLowName === '3-2-3-2') {
  console.error('FAIL TRQ basso: expected NOT 3-2-3-2, got', trqLowName)
  failed += 1
} else {
  console.log(`OK boundary: TRQ basso → ${trqLowName} (not 3-2-3-2)`)
}

if (failed === 0) {
  console.log(`OK: ${cases.length} Konami layer cases`)
} else {
  console.error(`FAILED: ${failed} test(s)`)
  process.exit(1)
}
