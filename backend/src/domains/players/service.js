import {
  MAX_RESERVES,
  domainError,
  isCatalogPlayerSave,
  lookupPlayingStyle,
  normalizeOriginalPositions,
  normalizePlayerSkillsArray,
  omitClientFlags,
  toText
} from './contracts.js'
import {
  buildPlayerInsert,
  buildPlayerPatch,
  mergePlayerBaseStats
} from './payloads.js'
import {
  assignPlayerToSlot,
  removePlayerFromSlot
} from '../roster/service.js'
import { metadataAfterMovingToReserves } from '../roster/slotRoles.js'
import { syncFormationLayoutBestEffort } from '../roster/formationSync.js'
import { computePlayerFieldOverall } from './overall.js'
import { createDisabledKnowledgeRefreshSideEffect } from '../memory/knowledgeRefresh.js'

const PLAYER_SELECT = `
  id, user_id, player_name, position, card_type, team, overall_rating,
  base_stats, skills, com_skills, position_ratings, available_boosters,
  height, weight, age, nationality, club_name, form, role,
  playing_style_id, current_level, level_cap, active_booster_name,
  development_points, slot_index, metadata, extracted_data,
  created_at, updated_at, photo_slots, original_positions
`

export { mergePlayerBaseStats } from './payloads.js'

function exactDuplicate(rows, player, excludedSlot = null) {
  const name = toText(player.player_name)?.toLowerCase()
  const age = player.age == null ? null : Number(player.age)
  return (Array.isArray(rows) ? rows : []).find((row) => {
    if (excludedSlot != null && row.slot_index === excludedSlot) return false
    if (toText(row.player_name)?.toLowerCase() !== name) return false
    return age == null || (row.age != null && Number(row.age) === age)
  })
}

async function duplicateRows(client, userId, player, reserves) {
  let query = client
    .from('players')
    .select('id, player_name, age, slot_index')
    .eq('user_id', userId)
    .ilike('player_name', toText(player.player_name)?.toLowerCase())
  query = reserves ? query.is('slot_index', null) : query.not('slot_index', 'is', null)
  const { data, error } = await query
  if (error) throw domainError(error.message || 'Unable to check player duplicates', 500)
  return data || []
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

async function currentSlotPosition(client, userId, slotIndex) {
  if (slotIndex == null) return null
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

async function applyDerivedOverall(client, userId, existing, body, update) {
  if (body.base_stats === undefined || body.overall_rating !== undefined || !update.base_stats) return

  const [{ data: activeCoach }, { data: tacticalSettings }] = await Promise.all([
    client
      .from('coaches')
      .select('id, coach_name, playing_style_competence, stat_boosters, is_active')
      .eq('user_id', userId)
      .eq('is_active', true)
      .maybeSingle(),
    client
      .from('team_tactical_settings')
      .select('team_playing_style')
      .eq('user_id', userId)
      .maybeSingle()
  ])
  const mergedPlayer = {
    ...existing,
    ...update,
    base_stats: update.base_stats,
    development_points: update.development_points ?? existing.development_points,
    available_boosters: update.available_boosters ?? existing.available_boosters,
    active_booster_name: update.active_booster_name ?? existing.active_booster_name
  }
  const computed = computePlayerFieldOverall({
    player: mergedPlayer,
    slotPosition: update.position || existing.position,
    coach: activeCoach,
    teamStyle: tacticalSettings?.team_playing_style
  })
  const squadOverall = computed?.fieldOverall ?? computed?.afterOverall
  if (squadOverall != null && Number.isFinite(squadOverall)) {
    update.overall_rating = squadOverall
    update.position_ratings = {
      ...(existing.position_ratings || {}),
      ...(update.position_ratings || {}),
      [computed.targetPosition]: squadOverall
    }
  }
}

export function createPlayerReadService(readOnlyProvider) {
  return {
    async getById({ token, userId, playerId }) {
      const client = readOnlyProvider.forUser(token)
      const { data: player, error } = await client
        .from('players')
        .select(PLAYER_SELECT)
        .eq('id', playerId)
        .eq('user_id', userId)
        .maybeSingle()

      if (error) {
        const failure = new Error(error.message || 'Unable to read player')
        failure.statusCode = 500
        throw failure
      }
      if (!player) return null

      let playingStyleName = null
      if (player.playing_style_id) {
        const { data: style, error: styleError } = await client
          .from('playing_styles')
          .select('name')
          .eq('id', player.playing_style_id)
          .maybeSingle()
        if (styleError) {
          const failure = new Error(styleError.message || 'Unable to read playing style')
          failure.statusCode = 500
          throw failure
        }
        playingStyleName = style?.name || null
      }

      return { player, playingStyleName }
    }
  }
}

export function createPlayerWriteService(writeProvider, options = {}) {
  const knowledgeRefresh =
    options.knowledgeRefresh ||
    writeProvider?.knowledgeRefresh ||
    createDisabledKnowledgeRefreshSideEffect()
  const scheduleKnowledgeRefresh = (userId, source) => {
    try {
      knowledgeRefresh.schedule({ userId, source })
    } catch (error) {
      if (process.env.NODE_ENV !== 'production') {
        console.warn(`[players] ${source} knowledge refresh scheduling failed:`, error?.message || error)
      }
    }
  }

  return {
    async save({ token, userId, player, formationLayout }) {
      const client = writeProvider.forUser(token)
      const style = await lookupPlayingStyle(
        client,
        player?.playing_style || player?.role || player?.extracted_data?.playing_style
      )
      const now = new Date()
      const playerData = buildPlayerInsert(player, {
        userId,
        styleId: style.id,
        styleName: style.name,
        now
      })
      const fromCatalog = isCatalogPlayerSave(player)

      if (playerData.slot_index != null) {
        const { data: existing, error } = await client
          .from('players')
          .select('id, player_name, overall_rating, photo_slots, base_stats, skills, com_skills, available_boosters, extracted_data, metadata, original_positions')
          .eq('user_id', userId)
          .eq('slot_index', playerData.slot_index)
          .maybeSingle()
        if (error) throw domainError(error.message || 'Unable to inspect player slot', 500)
        if (existing) {
          const hasStats = Object.keys(playerData.base_stats || {}).length > 0
          const existingOverall = existing.overall_rating == null ? null : Number(existing.overall_rating)
          const incomingOverall = playerData.overall_rating == null ? null : Number(playerData.overall_rating)
          const overall = existingOverall != null && incomingOverall != null
            ? Math.max(existingOverall, incomingOverall)
            : incomingOverall ?? existingOverall
          const refreshedPositions =
            (player.refresh_original_positions || fromCatalog) &&
            Array.isArray(player.original_positions) &&
            player.original_positions.length
              ? normalizeOriginalPositions(player.original_positions)
              : undefined
          const existingMetadata = refreshedPositions
            ? metadataAfterMovingToReserves(existing.metadata) || existing.metadata || {}
            : existing.metadata || {}
          const update = {
            player_name: playerData.player_name,
            position: playerData.position || undefined,
            card_type: playerData.card_type || undefined,
            team: playerData.team || undefined,
            overall_rating: overall,
            age: playerData.age ?? undefined,
            nationality: playerData.nationality || undefined,
            club_name: playerData.club_name || undefined,
            form: playerData.form || undefined,
            role: fromCatalog ? playerData.role : playerData.role || undefined,
            playing_style_id: fromCatalog ? playerData.playing_style_id : playerData.playing_style_id || undefined,
            height: playerData.height ?? undefined,
            weight: playerData.weight ?? undefined,
            current_level: playerData.current_level ?? undefined,
            level_cap: playerData.level_cap ?? undefined,
            active_booster_name: playerData.active_booster_name || undefined,
            ...(refreshedPositions ? { original_positions: refreshedPositions } : {}),
            photo_slots: Object.keys(playerData.photo_slots || {}).length
              ? { ...(existing.photo_slots || {}), ...playerData.photo_slots }
              : existing.photo_slots,
            base_stats: fromCatalog
              ? (hasStats ? playerData.base_stats : existing.base_stats || {})
              : hasStats
                ? mergePlayerBaseStats(existing.base_stats, playerData.base_stats)
                : existing.base_stats,
            skills: fromCatalog
              ? playerData.skills
              : normalizePlayerSkillsArray([...(existing.skills || []), ...playerData.skills]),
            com_skills: fromCatalog
              ? playerData.com_skills
              : normalizePlayerSkillsArray([...(existing.com_skills || []), ...playerData.com_skills]),
            available_boosters: playerData.available_boosters?.length
              ? playerData.available_boosters
              : existing.available_boosters,
            extracted_data: {
              ...(existing.extracted_data || {}),
              ...omitClientFlags(playerData.extracted_data || {})
            },
            metadata: {
              ...existingMetadata,
              ...(playerData.metadata || {}),
              saved_at: now.toISOString()
            },
            updated_at: now.toISOString()
          }
          Object.keys(update).forEach((key) => update[key] === undefined && delete update[key])
          const { data, error: updateError } = await client
            .from('players')
            .update(update)
            .eq('id', existing.id)
            .eq('user_id', userId)
            .select('id')
            .single()
          if (updateError) throw domainError(updateError.message || 'Failed to update player', 500)
          await syncFormationLayoutBestEffort(client, userId, {
            slotIndex: playerData.slot_index,
            formation: formationLayout?.formation,
            slot_positions: formationLayout?.slot_positions,
            now
          })
          scheduleKnowledgeRefresh(userId, 'players.save.updated')
          return { success: true, player_id: data.id, is_new: false, action: 'updated' }
        }
      }

      const fieldDuplicate = exactDuplicate(
        await duplicateRows(client, userId, playerData, false),
        playerData,
        playerData.slot_index
      )
      if (fieldDuplicate) {
        throw domainError(
          `Player "${playerData.player_name}" already in starting lineup at slot ${fieldDuplicate.slot_index}`,
          400,
          {
            duplicate_slot: fieldDuplicate.slot_index,
            duplicate_player_id: fieldDuplicate.id,
            is_field: true
          }
        )
      }
      const reserveDuplicate = exactDuplicate(
        await duplicateRows(client, userId, playerData, true),
        playerData
      )
      if (reserveDuplicate) {
        throw domainError(`Player "${playerData.player_name}" already exists in reserves`, 400, {
          duplicate_player_id: reserveDuplicate.id,
          is_reserve: true
        })
      }
      if (playerData.slot_index == null && await reserveCount(client, userId) >= MAX_RESERVES) {
        throw domainError('Maximum 12 reserves reached.', 400, { code: 'max_reserves' })
      }
      const { data, error } = await client
        .from('players')
        .insert(playerData)
        .select('id')
        .single()
      if (error) throw domainError(error.message || 'Failed to create player', 500)
      await syncFormationLayoutBestEffort(client, userId, {
        slotIndex: playerData.slot_index,
        formation: formationLayout?.formation,
        slot_positions: formationLayout?.slot_positions,
        now
      })
      Promise.resolve(
        client.from('user_diagnostic_cache').delete().eq('user_id', userId)
      ).catch(() => {})
      scheduleKnowledgeRefresh(userId, 'players.save.created')
      return { success: true, player_id: data.id, is_new: true }
    },

    async patchById({ token, userId, playerId, patch }) {
      const client = writeProvider.forUser(token)
      const { data: existing, error } = await client
        .from('players')
        .select('id, player_name, position, card_type, overall_rating, age, height, weight, nationality, club_name, role, playing_style_id, base_stats, skills, com_skills, available_boosters, active_booster_name, photo_slots, metadata, original_positions, level_cap, current_level, development_points, position_ratings, slot_index')
        .eq('id', playerId)
        .eq('user_id', userId)
        .maybeSingle()
      if (error) throw domainError(error.message || 'Unable to read player', 500)
      if (!existing) return null

      if (patch.slot_index === null && existing.slot_index != null && await reserveCount(client, userId) >= MAX_RESERVES) {
        throw domainError('Maximum 12 reserves reached. Remove a reserve first.', 400, {
          code: 'max_reserves'
        })
      }
      const styleHint = patch.playing_style || patch.role
      const style = styleHint ? await lookupPlayingStyle(client, styleHint) : {}
      const nextSlot =
        patch.slot_index !== undefined && patch.slot_index !== null && patch.slot_index !== ''
          ? Number(patch.slot_index)
          : patch.slot_index === undefined ? existing.slot_index : null
      const slotPosition = nextSlot != null
        ? await currentSlotPosition(client, userId, nextSlot)
        : null
      const update = buildPlayerPatch(existing, patch, {
        styleId: style.id,
        styleName: style.name,
        slotPosition
      })
      await applyDerivedOverall(client, userId, existing, patch, update)
      const { data, error: updateError } = await client
        .from('players')
        .update(update)
        .eq('id', playerId)
        .eq('user_id', userId)
        .select(PLAYER_SELECT)
        .single()
      if (updateError) throw domainError(updateError.message || 'Unable to update player', 500)
      scheduleKnowledgeRefresh(userId, 'players.patch')
      return { player: data }
    },

    async assignToSlot(input) {
      const client = writeProvider.forUser(input.token)
      const result = await assignPlayerToSlot(client, input)
      scheduleKnowledgeRefresh(input.userId, 'roster.assign-to-slot')
      return result
    },

    async removeFromSlot(input) {
      const client = writeProvider.forUser(input.token)
      const result = await removePlayerFromSlot(client, input)
      scheduleKnowledgeRefresh(input.userId, 'roster.remove-from-slot')
      return result
    },

    async deleteById({ token, userId, playerId }) {
      const client = writeProvider.forUser(token)
      const { data: existing, error: readError } = await client
        .from('players')
        .select('id, player_name')
        .eq('id', playerId)
        .eq('user_id', userId)
        .maybeSingle()
      if (readError) {
        const failure = new Error(readError.message || 'Unable to verify player')
        failure.statusCode = 500
        throw failure
      }
      if (!existing) return null

      // Keep parity with the legacy route. The DB trigger is the second safety net.
      const { data: settings } = await client
        .from('team_tactical_settings')
        .select('id, individual_instructions')
        .eq('user_id', userId)
        .maybeSingle()
      if (settings?.individual_instructions) {
        const cleaned = { ...settings.individual_instructions }
        let changed = false
        for (const category of ['attacco_1', 'attacco_2', 'difesa_1', 'difesa_2']) {
          if (cleaned[category]?.player_id === playerId) {
            delete cleaned[category]
            changed = true
          }
        }
        if (changed) {
          const { error: cleanupError } = await client
            .from('team_tactical_settings')
            .update({
              individual_instructions: cleaned,
              updated_at: new Date().toISOString()
            })
            .eq('id', settings.id)
            .eq('user_id', userId)
          // The production trigger still cleans orphan references if this best-effort step fails.
          if (cleanupError && process.env.NODE_ENV !== 'production') {
            console.warn('[players.delete] explicit instruction cleanup failed:', cleanupError.message)
          }
        }
      }

      const { error: deleteError } = await client
        .from('players')
        .delete()
        .eq('id', playerId)
        .eq('user_id', userId)
      if (deleteError) {
        const failure = new Error(deleteError.message || 'Unable to delete player')
        failure.statusCode = 500
        throw failure
      }
      scheduleKnowledgeRefresh(userId, 'players.delete')
      return { success: true, player_id: playerId, player_name: existing.player_name }
    }
  }
}

export function registerPlayerRoutes(app, { identity, playerReads, playerWrites }) {
  const sendFailure = (reply, error) => {
    const payload = { error: error.message || 'Internal error' }
    for (const key of [
      'code',
      'duplicate_slot',
      'duplicate_player_id',
      'duplicate_reserve_id',
      'duplicate_player_name',
      'duplicate_player_age',
      'is_field',
      'is_reserve'
    ]) {
      if (error[key] !== undefined) payload[key] = error[key]
    }
    return reply.code(error.statusCode || 500).send(payload)
  }

  app.post('/v1/players', async (request, reply) => {
    try {
      const body = request.body || {}
      const session = await identity.resolveUser(request)
      const result = await playerWrites.save({
        token: session.token,
        userId: session.userId,
        player: body.player,
        formationLayout: body.formation_layout
      })
      return reply.code(result.is_new ? 201 : 200).send(result)
    } catch (error) {
      return sendFailure(reply, error)
    }
  })

  app.get('/v1/players/:id', async (request, reply) => {
    const playerId = String(request.params?.id || '').trim()
    if (!playerId) return reply.code(400).send({ error: 'Player ID is required' })

    const session = await identity.resolveUser(request)
    const result = await playerReads.getById({
      token: session.token,
      userId: session.userId,
      playerId
    })
    if (!result) return reply.code(404).send({ error: 'Player not found' })
    return reply.send(result)
  })

  app.patch('/v1/players/:id', async (request, reply) => {
    try {
      const playerId = String(request.params?.id || '').trim()
      if (!playerId) return reply.code(400).send({ error: 'Player ID is required' })
      const session = await identity.resolveUser(request)
      const result = await playerWrites.patchById({
        token: session.token,
        userId: session.userId,
        playerId,
        patch: request.body || {}
      })
      if (!result) return reply.code(404).send({ error: 'Player not found' })
      return reply.send(result)
    } catch (error) {
      return sendFailure(reply, error)
    }
  })

  app.patch('/v1/roster/assign-to-slot', async (request, reply) => {
    try {
      const body = request.body || {}
      const session = await identity.resolveUser(request)
      const result = await playerWrites.assignToSlot({
        token: session.token,
        userId: session.userId,
        slotIndex: body.slot_index,
        playerId: body.player_id,
        playerData: body.player_data,
        formationLayout: body.formation_layout
      })
      return reply.send(result)
    } catch (error) {
      return sendFailure(reply, error)
    }
  })

  app.patch('/v1/roster/remove-from-slot', async (request, reply) => {
    try {
      const body = request.body || {}
      const session = await identity.resolveUser(request)
      const result = await playerWrites.removeFromSlot({
        token: session.token,
        userId: session.userId,
        playerId: body.player_id
      })
      return reply.send(result)
    } catch (error) {
      return sendFailure(reply, error)
    }
  })

  app.delete('/v1/players/:id', async (request, reply) => {
    const playerId = String(request.params?.id || '').trim()
    if (!playerId) return reply.code(400).send({ error: 'Player ID is required' })
    if (playerId.length < 30 || playerId.length > 40) {
      return reply.code(400).send({ error: 'Invalid player ID format' })
    }
    const session = await identity.resolveUser(request)
    const result = await playerWrites.deleteById({
      token: session.token,
      userId: session.userId,
      playerId
    })
    if (!result) return reply.code(404).send({ error: 'Player not found' })
    return reply.send(result)
  })
}
