/**
 * Metadata "ruolo campo vs competenze carta" dopo assegnazione titolare (slot 0–10).
 * Usato da assign-player-to-slot e PATCH /api/players/[id].
 */

export function normPosCode(v) {
  return String(v || '').toUpperCase().trim()
}

/**
 * Codici modulo dalla carta (original_positions), ordine di apparizione, mai duplicati.
 * Usato dal coach contesto: whitelist esplicita oltre al testo "competenze: …".
 * @param {unknown} originalPositions
 * @returns {string[]}
 */
export function getCardSlotCodesFromOriginalPositions(originalPositions) {
  if (!Array.isArray(originalPositions) || originalPositions.length === 0) return []
  const seen = new Set()
  const out = []
  for (const entry of originalPositions) {
    const raw = typeof entry === 'string' ? entry : entry?.position
    const code = normPosCode(raw)
    if (!code || seen.has(code)) continue
    seen.add(code)
    out.push(code)
  }
  return out
}

/** True se la posizione slot non compare tra le competenze carta. */
export function slotVsCardMismatch(slotPos, originalPositions) {
  const slot = normPosCode(slotPos)
  if (!slot) return false
  if (!Array.isArray(originalPositions) || originalPositions.length === 0) return false
  return !originalPositions.some((entry) => {
    const p = typeof entry === 'string' ? entry : entry?.position
    return normPosCode(p) === slot
  })
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
