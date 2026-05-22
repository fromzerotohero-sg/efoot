import {
  DEFAULT_FORMATION_NAME,
  DEFAULT_SLOT_POSITIONS,
  completeSlotPositions,
  isStarterSlotIndex
} from '@/lib/formationDefaultSlots'

function hasFormationSnapshot(formation, slot_positions) {
  return (
    String(formation || '').trim().length > 0 &&
    slot_positions &&
    typeof slot_positions === 'object' &&
    !Array.isArray(slot_positions) &&
    Object.keys(slot_positions).length > 0
  )
}

/**
 * Salva la formazione inviata dal client (stato attuale in Rosa).
 * Se manca lo snapshot ma c'è un titolare, crea solo il default la prima volta.
 */
export async function syncFormationLayoutOnPlayerSave(admin, userId, options = {}) {
  if (!admin || !userId) return { skipped: true, reason: 'missing_args' }

  const { slotIndex, formation, slot_positions } = options

  if (hasFormationSnapshot(formation, slot_positions)) {
    const { error: upsertErr } = await admin
      .from('formation_layout')
      .upsert(
        {
          user_id: userId,
          formation: String(formation).trim(),
          slot_positions: completeSlotPositions(slot_positions),
          updated_at: new Date().toISOString()
        },
        { onConflict: 'user_id' }
      )
    if (upsertErr) throw upsertErr
    return { saved: true, source: 'snapshot' }
  }

  if (!isStarterSlotIndex(slotIndex)) {
    return { skipped: true, reason: 'no_snapshot_not_starter' }
  }

  const { data: existing, error: readErr } = await admin
    .from('formation_layout')
    .select('formation')
    .eq('user_id', userId)
    .maybeSingle()

  if (readErr) throw readErr
  if (String(existing?.formation || '').trim()) {
    return { skipped: true, reason: 'already_saved' }
  }

  const { error: upsertErr } = await admin
    .from('formation_layout')
    .upsert(
      {
        user_id: userId,
        formation: DEFAULT_FORMATION_NAME,
        slot_positions: completeSlotPositions(DEFAULT_SLOT_POSITIONS),
        updated_at: new Date().toISOString()
      },
      { onConflict: 'user_id' }
    )

  if (upsertErr) throw upsertErr
  return { saved: true, source: 'default_bootstrap' }
}
