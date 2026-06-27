/**
 * Titolare = slot_index 0-10 (esclusi null/undefined).
 * Riserva = null/undefined oppure slot fuori 0-10.
 * Non usare Number(slot_index) su null: in JS Number(null) === 0.
 */
export function parseSlotIndex(value) {
  if (value === null || value === undefined || value === '') return null
  const n = typeof value === 'string' ? parseInt(value, 10) : Number(value)
  return Number.isFinite(n) ? n : null
}

export function isStarterPlayer(playerOrSlot) {
  const slot = typeof playerOrSlot === 'object'
    ? parseSlotIndex(playerOrSlot?.slot_index)
    : parseSlotIndex(playerOrSlot)
  return slot !== null && slot >= 0 && slot <= 10
}

export function isReservePlayer(playerOrSlot) {
  const slot = typeof playerOrSlot === 'object'
    ? parseSlotIndex(playerOrSlot?.slot_index)
    : parseSlotIndex(playerOrSlot)
  return slot === null || slot < 0 || slot > 10
}
