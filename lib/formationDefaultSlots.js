/**
 * Posizioni slot 0–10 per rosa vuota e completamento formazione.
 * Difesa: TS + 2 DC + TD (regole eFootball: max 3 DC, 1 TS, 1 TD — non 4× DC).
 */
export const DEFAULT_FORMATION_NAME = '4-3-3'

export const DEFAULT_SLOT_POSITIONS = {
  0: { x: 50, y: 90, position: 'PT' },
  1: { x: 20, y: 65, position: 'TS' },
  2: { x: 40, y: 65, position: 'DC' },
  3: { x: 60, y: 65, position: 'DC' },
  4: { x: 80, y: 65, position: 'TD' },
  5: { x: 30, y: 52, position: 'CC' },
  6: { x: 50, y: 58, position: 'MED' },
  7: { x: 70, y: 52, position: 'CC' },
  8: { x: 25, y: 34, position: 'SP' },
  9: { x: 50, y: 28, position: 'P' },
  10: { x: 75, y: 34, position: 'SP' }
}

/** Completa slot 0–10 (stessa logica di save-formation-layout). */
export function completeSlotPositions(slots) {
  const complete = { ...(slots || {}) }
  for (let i = 0; i <= 10; i++) {
    if (!complete[i]) {
      complete[i] = DEFAULT_SLOT_POSITIONS[i] || { x: 50, y: 50, position: '?' }
    }
  }
  return complete
}

export function isStarterSlotIndex(slotIndex) {
  if (slotIndex === null || slotIndex === undefined) return false
  const n = Number(slotIndex)
  return Number.isFinite(n) && n >= 0 && n <= 10
}
