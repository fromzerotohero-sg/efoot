import {
  DEFAULT_FORMATION_NAME,
  DEFAULT_SLOT_POSITIONS
} from '../formations/defaults.js'
import {
  completeSlotPositions,
  isStarterSlotIndex
} from '../formations/service.js'

function hasSnapshot(formation, slotPositions) {
  return Boolean(
    String(formation || '').trim() &&
    slotPositions &&
    typeof slotPositions === 'object' &&
    !Array.isArray(slotPositions) &&
    Object.keys(slotPositions).length
  )
}

export async function syncFormationLayout(client, userId, options = {}) {
  const { slotIndex, formation, slot_positions: slotPositions } = options
  const now = options.now || new Date()
  if (hasSnapshot(formation, slotPositions)) {
    const { error } = await client.from('formation_layout').upsert({
      user_id: userId,
      formation: String(formation).trim(),
      slot_positions: completeSlotPositions(slotPositions),
      updated_at: now.toISOString()
    }, { onConflict: 'user_id' })
    if (error) throw error
    return { saved: true, source: 'snapshot' }
  }
  if (!isStarterSlotIndex(slotIndex)) {
    return { skipped: true, reason: 'no_snapshot_not_starter' }
  }
  const { data, error: readError } = await client
    .from('formation_layout')
    .select('formation')
    .eq('user_id', userId)
    .maybeSingle()
  if (readError) throw readError
  if (String(data?.formation || '').trim()) {
    return { skipped: true, reason: 'already_saved' }
  }
  const { error } = await client.from('formation_layout').upsert({
    user_id: userId,
    formation: DEFAULT_FORMATION_NAME,
    slot_positions: completeSlotPositions(DEFAULT_SLOT_POSITIONS),
    updated_at: now.toISOString()
  }, { onConflict: 'user_id' })
  if (error) throw error
  return { saved: true, source: 'default_bootstrap' }
}

export async function syncFormationLayoutBestEffort(client, userId, options = {}) {
  try {
    return await syncFormationLayout(client, userId, options)
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn('[formation-sync] non-blocking failure:', error?.message || error)
    }
    return { skipped: true, reason: 'sync_failed', error: error?.message || String(error) }
  }
}
