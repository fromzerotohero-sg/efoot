import {
  MAX_RESERVES,
  domainError,
  lookupPlayingStyle,
  toText
} from '../players/contracts.js'
import { buildPlayerInsert } from '../players/payloads.js'
import { buildSlotRoleAugments } from './slotRoles.js'
import { syncFormationLayoutBestEffort } from './formationSync.js'

function exactDuplicates(rows, player, excludedId) {
  const name = toText(player?.player_name)?.toLowerCase()
  if (!name) return []
  const age = player.age == null ? null : Number(player.age)
  return (Array.isArray(rows) ? rows : []).filter((row) => {
    if (row.id === excludedId || toText(row.player_name)?.toLowerCase() !== name) return false
    return age == null || (row.age != null && Number(row.age) === age)
  })
}

async function reserveCount(client, userId) {
  const { count, error } = await client
    .from('players')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .is('slot_index', null)
  if (error) throw domainError(error.message || 'Unable to count reserves', 500)
  return Number(count || 0)
}

async function formationSlotPosition(client, userId, slotIndex, snapshot) {
  if (snapshot?.slot_positions && typeof snapshot.slot_positions === 'object') {
    return snapshot.slot_positions[slotIndex]?.position ||
      snapshot.slot_positions[String(slotIndex)]?.position ||
      null
  }
  const { data, error } = await client
    .from('formation_layout')
    .select('slot_positions')
    .eq('user_id', userId)
    .maybeSingle()
  if (error) throw domainError(error.message || 'Unable to read formation', 500)
  return data?.slot_positions?.[slotIndex]?.position ||
    data?.slot_positions?.[String(slotIndex)]?.position ||
    null
}

async function findDuplicates(client, userId, player, { field, excludeId, excludeSlot } = {}) {
  let query = client
    .from('players')
    .select('id, player_name, age, slot_index')
    .eq('user_id', userId)
    .ilike('player_name', toText(player.player_name)?.toLowerCase())
  query = field ? query.not('slot_index', 'is', null) : query.is('slot_index', null)
  if (excludeId) query = query.neq('id', excludeId)
  if (excludeSlot != null && field) query = query.neq('slot_index', excludeSlot)
  const { data, error } = await query
  if (error) throw domainError(error.message || 'Unable to check duplicates', 500)
  return exactDuplicates(data, player, excludeId)
}

async function clearOccupiedSlot(client, userId, occupant) {
  const { error } = await client
    .from('players')
    .update({ slot_index: null })
    .eq('id', occupant.id)
    .eq('user_id', userId)
  if (error) throw domainError(error.message || 'Failed to clear slot', 500)
}

export async function assignPlayerToSlot(client, {
  userId,
  slotIndex,
  playerId,
  playerData,
  formationLayout,
  now = new Date()
}) {
  const slot = Number(slotIndex)
  if (!Number.isInteger(slot) || slot < 0 || slot > 10) {
    throw domainError('slot_index must be between 0 and 10')
  }
  if (!playerId && !playerData) {
    throw domainError('Either player_id or player_data is required')
  }
  const slotPosition = await formationSlotPosition(client, userId, slot, formationLayout)
  const { data: occupant, error: occupantError } = await client
    .from('players')
    .select('id, user_id, player_name, age, position, original_positions, metadata, slot_index')
    .eq('user_id', userId)
    .eq('slot_index', slot)
    .maybeSingle()
  if (occupantError) throw domainError(occupantError.message || 'Unable to inspect slot', 500)

  let player = null
  if (playerId) {
    const { data, error } = await client
      .from('players')
      .select('id, user_id, player_name, age, position, original_positions, metadata, slot_index')
      .eq('id', playerId)
      .eq('user_id', userId)
      .maybeSingle()
    if (error) throw domainError(error.message || 'Unable to read player', 500)
    if (!data) throw domainError('Player not found or unauthorized', 404)
    player = data
  } else {
    player = playerData
  }

  const fieldDuplicates = await findDuplicates(client, userId, player, {
    field: true,
    excludeId: playerId,
    excludeSlot: slot
  })
  if (fieldDuplicates.length) {
    const duplicate = fieldDuplicates[0]
    throw domainError(
      `Player "${player.player_name}" already in starting lineup at slot ${duplicate.slot_index}`,
      400,
      { duplicate_slot: duplicate.slot_index, duplicate_player_id: duplicate.id }
    )
  }
  const reserveDuplicates = await findDuplicates(client, userId, player, {
    field: false,
    excludeId: playerId
  })

  const occupantWillBecomeReserve = occupant && occupant.id !== playerId
  const duplicateDeletes = reserveDuplicates.filter((row) => row.id !== occupant?.id)

  for (const duplicate of duplicateDeletes) {
    const { error } = await client
      .from('players')
      .delete()
      .eq('id', duplicate.id)
      .eq('user_id', userId)
    if (error) throw domainError(error.message || 'Unable to remove duplicate reserve', 500)
  }
  if (occupantWillBecomeReserve) await clearOccupiedSlot(client, userId, occupant)

  let resultId = playerId
  let action = 'assigned_existing'
  if (playerId) {
    const augments = buildSlotRoleAugments({ player, slotPosition, now })
    const { error } = await client
      .from('players')
      .update({
        slot_index: slot,
        position: slotPosition || player.position,
        ...augments,
        updated_at: now.toISOString()
      })
      .eq('id', playerId)
      .eq('user_id', userId)
    if (error) throw domainError(error.message || 'Failed to assign player', 500)
  } else {
    const styleRaw = playerData.playing_style || playerData.role
    const style = await lookupPlayingStyle(client, styleRaw)
    const insert = buildPlayerInsert({
      ...playerData,
      slot_index: slot,
      position: slotPosition || playerData.position
    }, { userId, styleId: style.id, styleName: style.name, now })
    insert.original_positions =
      Array.isArray(playerData.original_positions) && playerData.original_positions.length
        ? playerData.original_positions
        : playerData.position
          ? [{ position: playerData.position, competence: 'Alta' }]
          : []
    Object.assign(insert, buildSlotRoleAugments({
      player: { ...insert, position: playerData.position || insert.position },
      slotPosition,
      now
    }))
    const { data, error } = await client
      .from('players')
      .insert(insert)
      .select('id')
      .single()
    if (error) throw domainError(error.message || 'Failed to create player', 500)
    resultId = data.id
    action = 'created_new'
  }

  await syncFormationLayoutBestEffort(client, userId, {
    slotIndex: slot,
    formation: formationLayout?.formation,
    slot_positions: formationLayout?.slot_positions,
    now
  })
  return { success: true, player_id: resultId, slot_index: slot, action }
}

export async function removePlayerFromSlot(client, {
  userId,
  playerId,
  now = new Date()
}) {
  if (!toText(playerId)) throw domainError('player_id is required')
  const { data: player, error } = await client
    .from('players')
    .select('id, user_id, player_name, age, slot_index, original_positions, position, metadata')
    .eq('id', playerId)
    .eq('user_id', userId)
    .maybeSingle()
  if (error) throw domainError(error.message || 'Unable to read player', 500)
  if (!player) throw domainError('Player not found or access denied', 404)
  if (await reserveCount(client, userId) >= MAX_RESERVES) {
    throw domainError('Maximum 12 reserves reached. Remove a reserve first.', 400, {
      code: 'max_reserves'
    })
  }
  const duplicates = await findDuplicates(client, userId, player, {
    field: false,
    excludeId: playerId
  })
  if (duplicates.length) {
    throw domainError(`Player "${player.player_name}" already exists in reserves`, 400, {
      duplicate_reserve_id: duplicates[0].id,
      duplicate_player_name: player.player_name,
      duplicate_player_age: player.age == null ? null : Number(player.age)
    })
  }
  const naturalPosition =
    Array.isArray(player.original_positions) && player.original_positions.length
      ? player.original_positions[0]?.position
      : player.position
  const { error: updateError } = await client
    .from('players')
    .update({
      slot_index: null,
      position: naturalPosition,
      updated_at: now.toISOString()
    })
    .eq('id', playerId)
    .eq('user_id', userId)
  if (updateError) throw domainError(updateError.message || 'Failed to remove player from slot', 500)
  return {
    success: true,
    player_id: playerId,
    player_name: player.player_name,
    action: 'removed_from_slot'
  }
}
