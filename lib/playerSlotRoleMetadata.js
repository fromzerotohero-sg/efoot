/**
 * Metadata "ruolo campo vs competenze carta" dopo assegnazione titolare (slot 0–10).
 * Usato da assign-player-to-slot e PATCH /api/players/[id].
 */

/** Sigle IT/EN equivalenti (catalogo PSD, OCR, client). Allineato a info_rag §2 + extract-player. */
const POSITION_EQUIVALENCE_GROUPS = [
  ['PT', 'GK'],
  ['DC', 'CB'],
  ['TD'],
  ['TS'],
  ['MED', 'DMF', 'CDM', 'DM'],
  ['CC', 'CMF', 'CM'],
  ['TRQ', 'AMF', 'AM', 'CAM'],
  ['P', 'CF', 'ST'],
  ['SP', 'SS'],
  ['CLS', 'LWF', 'LW'],
  ['CLD', 'RWF', 'RW'],
  ['ESA', 'LMF'],
  ['EDA', 'EDE', 'RMF']
]

const POS_EQUIV_INDEX = (() => {
  const index = new Map()
  POSITION_EQUIVALENCE_GROUPS.forEach((group, groupId) => {
    for (const code of group) {
      const key = String(code || '').toUpperCase().trim()
      if (key) index.set(key, groupId)
    }
  })
  return index
})()

export function normPosCode(v) {
  return String(v || '').toUpperCase().trim()
}

/**
 * True se due sigle posizione rappresentano lo stesso ruolo (es. TRQ = AMF, CLS = LWF).
 */
export function positionsAreEquivalent(a, b) {
  const left = normPosCode(a)
  const right = normPosCode(b)
  if (!left || !right) return false
  if (left === right) return true
  const gLeft = POS_EQUIV_INDEX.get(left)
  const gRight = POS_EQUIV_INDEX.get(right)
  return gLeft != null && gLeft === gRight
}

/**
 * True se la posizione in campo compare tra le competenze carta (con alias IT/EN).
 */
export function fieldPositionMatchesCardCompetences(fieldPosition, originalPositions) {
  const field = normPosCode(fieldPosition)
  if (!field) return true
  if (!Array.isArray(originalPositions) || originalPositions.length === 0) return true
  return originalPositions.some((entry) => {
    const cardPos = typeof entry === 'string' ? entry : entry?.position
    return positionsAreEquivalent(field, cardPos)
  })
}

/** True se la posizione slot non compare tra le competenze carta. */
export function slotVsCardMismatch(slotPos, originalPositions) {
  const slot = normPosCode(slotPos)
  if (!slot) return false
  if (!Array.isArray(originalPositions) || originalPositions.length === 0) return false
  return !fieldPositionMatchesCardCompetences(slot, originalPositions)
}

/**
 * @param {object} opts
 * @param {object} [opts.playerRow] - riga players: position, original_positions, metadata
 * @param {string|null|undefined} opts.slotPosition - posizione modulo per lo slot (es. da formation_layout)
 * @param {object} [opts.metadataBase] - merge metadata esistente+body (PATCH); default playerRow.metadata
 * @returns {{ augments: { metadata?: object, original_positions?: Array<{position: string, competence: string}> } }}
 *   augments vuoto = non aggiornare quei campi
 */
export function buildSlotRoleAugmentsForStarter({ playerRow, slotPosition, metadataBase }) {
  const player = playerRow || {}
  const augments = {}

  let effectiveOriginalPositions =
    Array.isArray(player.original_positions) && player.original_positions.length > 0
      ? player.original_positions
      : null
  if (!effectiveOriginalPositions && player.position) {
    effectiveOriginalPositions = [{ position: String(player.position).trim(), competence: 'Alta' }]
    augments.original_positions = effectiveOriginalPositions
  }

  const existingMeta =
    metadataBase && typeof metadataBase === 'object'
      ? { ...metadataBase }
      : player.metadata && typeof player.metadata === 'object'
        ? { ...player.metadata }
        : {}

  const hadIntentionalSlotMeta = Boolean(
    existingMeta.intentional_slot_vs_card ||
      existingMeta.intentional_slot_position ||
      existingMeta.intentional_slot_vs_card_at
  )
  const mismatch = slotVsCardMismatch(slotPosition, effectiveOriginalPositions || [])
  if (mismatch) {
    existingMeta.intentional_slot_vs_card = true
    existingMeta.intentional_slot_position =
      normPosCode(slotPosition) || String(slotPosition || '').trim() || null
    existingMeta.intentional_slot_vs_card_at = new Date().toISOString()
    augments.metadata = existingMeta
  } else if (hadIntentionalSlotMeta) {
    delete existingMeta.intentional_slot_vs_card
    delete existingMeta.intentional_slot_position
    delete existingMeta.intentional_slot_vs_card_at
    augments.metadata = existingMeta
  }

  return { augments }
}

/** Riserva / slot_index null: togli flag slot se presenti. Ritorna metadata da scrivere o undefined se nulla da fare. */
export function metadataAfterMovingToReserves(mergedMetadata) {
  const base = mergedMetadata && typeof mergedMetadata === 'object' ? { ...mergedMetadata } : {}
  const had = Boolean(
    base.intentional_slot_vs_card || base.intentional_slot_position || base.intentional_slot_vs_card_at
  )
  if (!had) return undefined
  delete base.intentional_slot_vs_card
  delete base.intentional_slot_position
  delete base.intentional_slot_vs_card_at
  return base
}
