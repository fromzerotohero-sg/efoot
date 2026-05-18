/**
 * Build-coach Supabase reads + fallbacks (shared by API and maintenance scripts).
 */

import { resolveProgressionLevelCap } from './gameplayBuildCoach.js'

export const BUILD_COACH_PLAYER_SELECT = `
  id, user_id, player_name, position, card_type, team, overall_rating,
  base_stats, skills, com_skills, position_ratings, available_boosters,
  height, weight, age, nationality, club_name, form, role,
  playing_style_id, current_level, level_cap, active_booster_name,
  development_points, slot_index, metadata, extracted_data,
  created_at, updated_at, photo_slots, original_positions
`

export function getSlotPosition(player, layout) {
  if (player?.slot_index === null || player?.slot_index === undefined) return null
  const rawSlots = layout?.slot_positions
  const slots = Array.isArray(rawSlots)
    ? rawSlots
    : rawSlots && typeof rawSlots === 'object'
      ? Object.entries(rawSlots).map(([slotIndex, value]) => ({
          ...(value && typeof value === 'object' ? value : {}),
          slot_index: Number(value?.slot_index ?? slotIndex)
        }))
      : []
  const slot = slots.find((entry) => Number(entry?.slot_index) === Number(player.slot_index))
  return slot?.position || null
}

export async function fetchRosterContext(admin, userId) {
  const [
    { data: players, error: playersError },
    { data: tacticalSettings },
    { data: activeCoach },
    { data: layout }
  ] = await Promise.all([
    admin.from('players').select(BUILD_COACH_PLAYER_SELECT).eq('user_id', userId),
    admin.from('team_tactical_settings').select('team_playing_style, individual_instructions').eq('user_id', userId).maybeSingle(),
    admin.from('coaches').select('id, coach_name, playing_style_competence, stat_boosters, is_active').eq('user_id', userId).eq('is_active', true).maybeSingle(),
    admin.from('formation_layout').select('formation, slot_positions').eq('user_id', userId).maybeSingle()
  ])

  if (playersError) throw new Error(playersError.message)
  return {
    players: players || [],
    tacticalSettings: tacticalSettings || null,
    activeCoach: activeCoach || null,
    layout: layout || null
  }
}

export const BUILD_COACH_CATALOG_SELECT =
  'id, source, source_player_id, player_name, position, card_type, card_category, max_level, level_cap, overall_level_1, overall_max_level, height, base_stats, max_stats, players_payload'

export async function findCatalogCardForPlayer(admin, player) {
  const metadata = player?.metadata || {}
  const sourcePlayerId = metadata.catalog_source_player_id || metadata.source_player_id || metadata.sourcePlayerId
  if (!sourcePlayerId) return null
  const source = metadata.catalog_source || metadata.source || 'pesdb'
  const { data } = await admin
    .from('player_catalog')
    .select(BUILD_COACH_CATALOG_SELECT)
    .eq('source', source)
    .eq('source_player_id', String(sourcePlayerId))
    .limit(1)
    .maybeSingle()
  return data || null
}

function normalizeCardType(value) {
  return String(value || '').toLowerCase().trim()
}

function isNonProgressionCardType(value) {
  const normalized = normalizeCardType(value)
  if (!normalized) return false
  return (
    normalized.includes('trending') ||
    normalized.includes('potw') ||
    normalized.includes('player of the week') ||
    normalized.includes('players of the week') ||
    normalized.includes('otw') ||
    normalized.includes('one to watch') ||
    normalized.includes('card strike arena')
  )
}

function getEffectiveCardType(player, catalogCard) {
  return (
    player?.metadata?.catalog_card_type ||
    player?.metadata?.card_category ||
    player?.card_type ||
    catalogCard?.card_type ||
    catalogCard?.card_category ||
    catalogCard?.players_payload?.card_type
  )
}

export function getNonProgressionReason(player, catalogCard) {
  const cardType = getEffectiveCardType(player, catalogCard)
  if (isNonProgressionCardType(cardType)) {
    return { blocked: true, reason: 'non_progression_card_type', cardType }
  }
  const levelCap = resolveProgressionLevelCap(player, catalogCard)
  if (levelCap == null || levelCap <= 1) {
    return { blocked: true, reason: 'max_level_one', cardType }
  }
  return { blocked: false, reason: null, cardType }
}

export function withFallbacks(player, catalogCard) {
  const next = { ...player }
  const estimated = []

  if ((!next.base_stats || Object.keys(next.base_stats || {}).length === 0) && catalogCard?.players_payload?.base_stats) {
    next.base_stats = catalogCard.players_payload.base_stats
    estimated.push('base_stats')
  } else if ((!next.base_stats || Object.keys(next.base_stats || {}).length === 0) && catalogCard?.base_stats) {
    next.base_stats = catalogCard.base_stats
    estimated.push('base_stats')
  }

  if (!next.level_cap) {
    const fallbackLevel = resolveProgressionLevelCap(next, catalogCard) || 30
    next.level_cap = fallbackLevel
    estimated.push('level_cap')
  }

  if (!next.height) {
    next.height = catalogCard?.height || next.extracted_data?.height_cm || next.extracted_data?.height || 175
    estimated.push('height')
  }

  return { player: next, estimated }
}
