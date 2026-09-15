import { DEFAULT_SLOT_POSITIONS } from './defaults.js'
import {
  normalizePhase,
  normalizeSlotPositions,
  sanitizeFormationName,
  validateFormationLimits
} from './validators.js'
import { buildSlotRoleAugments } from '../roster/slotRoles.js'
import { createDisabledKnowledgeRefreshSideEffect } from '../memory/knowledgeRefresh.js'
import { enrichPlayersForFormation as enrichProductionFormationPlayers } from '../../../../lib/playProfileDisplay.js'

const PLAYER_SELECT = `
  id, user_id, player_name, position, card_type, team, overall_rating,
  base_stats, skills, com_skills, position_ratings, available_boosters,
  height, weight, age, nationality, club_name, form, role,
  playing_style_id, current_level, level_cap, active_booster_name,
  development_points, slot_index, metadata, extracted_data,
  created_at, updated_at, photo_slots, original_positions
`

function domainError(message, statusCode = 400) {
  const error = new Error(message)
  error.statusCode = statusCode
  return error
}

function throwQueryError(error, message) {
  if (error) throw domainError(`${message}: ${error.message || error}`, 500)
}

function scheduleRefresh(sideEffect, userId, source) {
  try {
    sideEffect.schedule({ userId, source })
  } catch {
    // Knowledge refresh is deliberately best effort.
  }
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

/**
 * Deriva il nome formazione (es. "4-3-3", "3-4-3") dalle posizioni negli slot.
 */
export function getFormationNameFromSlotPositions(slotPositions) {
  if (!slotPositions || typeof slotPositions !== 'object') return '1-1-1'
  let def = 0
  let mid = 0
  let fwd = 0
  Object.values(slotPositions).forEach((p) => {
    if (!p) return
    const pos = String(p.position || '').trim().toUpperCase()
    const y = p.y != null ? Number(p.y) : null
    if (!pos || pos === 'PT') return
    if (y == null || !Number.isFinite(y)) return

    if (y >= 63) def++
    else if (y >= 40) mid++
    else fwd++
  })
  if (def === 0 && mid === 0 && fwd === 0) return '1-1-1'
  return `${def}-${mid}-${fwd}`
}

export function normalizeFormationVariant(row) {
  if (!row) return null
  const phase = normalizePhase(row.phase)
  const formation = sanitizeFormationName(row.formation)
  const slotPositions = normalizeSlotPositions(row.slot_positions)
  if (!phase || !formation || !slotPositions) return null
  return {
    id: row.id || null,
    phase,
    formation,
    slot_positions: slotPositions,
    is_active: row.is_active !== false,
    source_version: row.source_version || 'v6.0.0',
    updated_at: row.updated_at || null
  }
}

export function buildFluidFormationState(baseLayout, rows = []) {
  const byPhase = { attack: null, defense: null }
  for (const row of Array.isArray(rows) ? rows : []) {
    const normalized = normalizeFormationVariant(row)
    if (!normalized) continue
    byPhase[normalized.phase] = normalized
  }
  const enabled = Boolean(byPhase.attack?.is_active && byPhase.defense?.is_active)
  return {
    enabled,
    base: baseLayout ? {
      formation: baseLayout.formation || null,
      slot_positions: baseLayout.slot_positions || null
    } : null,
    attack: byPhase.attack,
    defense: byPhase.defense
  }
}

export function enrichPlayersForFormation(
  players = [],
  { layout = null, activeCoach = null, tacticalSettings = null } = {}
) {
  return enrichProductionFormationPlayers(players, { layout, activeCoach, tacticalSettings })
}

async function loadFormationState(client, userId) {
  const [baseResult, variantsResult] = await Promise.all([
    client
      .from('formation_layout')
      .select('id, formation, slot_positions, updated_at')
      .eq('user_id', userId)
      .maybeSingle(),
    client
      .from('formation_variants')
      .select('id, phase, formation, slot_positions, is_active, source_version, updated_at')
      .eq('user_id', userId)
      .order('phase', { ascending: true })
  ])
  throwQueryError(baseResult.error, 'Failed to load base formation')
  throwQueryError(variantsResult.error, 'Failed to load formation variants')
  return buildFluidFormationState(baseResult.data, variantsResult.data || [])
}

export function createFormationReadService(readOnlyProvider) {
  return {
    async getFormation({ token, userId }) {
      const client = readOnlyProvider.forUser(token)
      const [layoutResult, stylesResult, playersResult, coachResult, tacticsResult] =
        await Promise.all([
          client.from('formation_layout')
            .select('id, formation, slot_positions')
            .eq('user_id', userId)
            .maybeSingle(),
          client.from('playing_styles').select('id, name'),
          client.from('players')
            .select(PLAYER_SELECT)
            .eq('user_id', userId)
            .order('created_at', { ascending: false }),
          client.from('coaches')
            .select('id, user_id, coach_name, team, category, pack_type, playing_style_competence, stat_boosters, connection, photo_slots, extracted_data, is_active, created_at, updated_at')
            .eq('user_id', userId)
            .eq('is_active', true)
            .maybeSingle(),
          client.from('team_tactical_settings')
            .select('id, user_id, team_playing_style, individual_instructions, created_at, updated_at')
            .eq('user_id', userId)
            .maybeSingle()
        ])
      throwQueryError(layoutResult.error, 'Layout error')
      throwQueryError(stylesResult.error, 'Playing styles error')
      throwQueryError(playersResult.error, 'Players error')
      throwQueryError(coachResult.error, 'Coach error')
      throwQueryError(tacticsResult.error, 'Tactical settings error')
      return {
        layout: layoutResult.data || null,
        playingStyles: stylesResult.data || [],
        players: enrichPlayersForFormation(playersResult.data || [], {
          layout: layoutResult.data,
          activeCoach: coachResult.data,
          tacticalSettings: tacticsResult.data
        }),
        activeCoach: coachResult.data || null,
        tacticalSettings: tacticsResult.data || null
      }
    },

    async getVariants({ token, userId }) {
      return loadFormationState(readOnlyProvider.forUser(token), userId)
    }
  }
}

export function createFormationWriteService(writeProvider, options = {}) {
  const knowledgeRefresh =
    options.knowledgeRefresh ||
    writeProvider?.knowledgeRefresh ||
    createDisabledKnowledgeRefreshSideEffect()

  return {
    async saveLayout({ token, userId, formation, slotPositions, preserveSlots }) {
      const name = sanitizeFormationName(formation)
      if (!name) {
        throw domainError(
          formation ? 'formation exceeds maximum length (50 characters)' : 'formation is required'
        )
      }
      if (slotPositions !== undefined) {
        let serialized
        try {
          serialized = JSON.stringify(slotPositions)
        } catch {
          throw domainError('slot_positions must be valid JSON')
        }
        if (serialized.length > 500 * 1024) {
          throw domainError('slot_positions exceeds maximum size (500KB)')
        }
      }
      const client = writeProvider.forUser(token)
      const completeSlots = completeSlotPositions(slotPositions)
      // Legacy parity: invalid role layouts warn but remain saveable.
      const validation = validateFormationLimits(completeSlots)
      const allStarterSlots = Array.from({ length: 11 }, (_, index) => index)
      const keep = Array.isArray(preserveSlots)
        ? new Set(preserveSlots.map(Number).filter(isStarterSlotIndex))
        : new Set()
      const slotsToFree = allStarterSlots.filter((slot) => !keep.has(slot))
      if (slotsToFree.length) {
        const cleared = await client
          .from('players')
          .update({ slot_index: null, updated_at: new Date().toISOString() })
          .eq('user_id', userId)
          .in('slot_index', slotsToFree)
        throwQueryError(cleared.error, 'Failed to clear old starters')
      }

      const now = new Date()
      const saved = await client
        .from('formation_layout')
        .upsert({
          user_id: userId,
          formation: name,
          slot_positions: completeSlots,
          updated_at: now.toISOString()
        }, { onConflict: 'user_id' })
        .select('id, formation, slot_positions')
        .single()
      throwQueryError(saved.error, 'Failed to save layout')

      const starters = await client
        .from('players')
        .select('id, slot_index, position, original_positions, metadata')
        .eq('user_id', userId)
        .gte('slot_index', 0)
        .lte('slot_index', 10)
      throwQueryError(starters.error, 'Failed to load starters for position sync')
      for (const starter of starters.data || []) {
        const slotIndex = Number(starter.slot_index)
        const slot = completeSlots[slotIndex]
        if (!slot?.position || !isStarterSlotIndex(slotIndex)) continue
        const update = await client
          .from('players')
          .update({
            position: slot.position,
            updated_at: now.toISOString(),
            ...buildSlotRoleAugments({
              player: starter,
              slotPosition: slot.position,
              now
            })
          })
          .eq('id', starter.id)
          .eq('user_id', userId)
        throwQueryError(update.error, `Failed to update player position for slot ${slotIndex}`)
      }
      scheduleRefresh(knowledgeRefresh, userId, 'formations.save-layout')
      return {
        success: true,
        layout: saved.data,
        validation
      }
    },

    async saveVariants({ token, userId, enabled, attack, defense }) {
      const client = writeProvider.forUser(token)
      if (enabled !== true) {
        const disabled = await client
          .from('formation_variants')
          .update({ is_active: false, updated_at: new Date().toISOString() })
          .eq('user_id', userId)
        throwQueryError(disabled.error, 'Unable to disable Fluid Formation')
        return loadFormationState(client, userId)
      }

      const attackFormation = sanitizeFormationName(attack?.formation)
      const defenseFormation = sanitizeFormationName(defense?.formation)
      const attackSlots = normalizeSlotPositions(attack?.slot_positions)
      const defenseSlots = normalizeSlotPositions(defense?.slot_positions)
      if (!attackFormation || !defenseFormation || !attackSlots || !defenseSlots) {
        throw domainError(
          'Attack and defence formations require a valid formation name and all 11 slot positions.'
        )
      }
      const now = new Date().toISOString()
      const result = await client.from('formation_variants').upsert([
        {
          user_id: userId,
          phase: 'attack',
          formation: attackFormation,
          slot_positions: attackSlots,
          is_active: true,
          source_version: 'v6.0.0',
          updated_at: now
        },
        {
          user_id: userId,
          phase: 'defense',
          formation: defenseFormation,
          slot_positions: defenseSlots,
          is_active: true,
          source_version: 'v6.0.0',
          updated_at: now
        }
      ], { onConflict: 'user_id,phase' })
      throwQueryError(result.error, 'Unable to save Fluid Formation')
      scheduleRefresh(knowledgeRefresh, userId, 'formations.save-variants')
      return loadFormationState(client, userId)
    }
  }
}
