/**
 * Due contesti (come in Play):
 * - Visual build stats: L1 + PT only.
 * Coach, team style and boosters remain available as context, but are not added
 * to the visual numbers the user copies into eFootball/PlayStation.
 */

import {
  buildPlayerForPlayProfilePreview,
  catalogCardFromPlayerSnapshot,
  nestedEffectiveStatsFromGameplayPreview,
  previewGameplayBuildFromSliders,
  sanitizeSliders
} from './gameplayBuildCoach.js'

function hasStatKeys(stats) {
  return stats && typeof stats === 'object' && !Array.isArray(stats) && Object.keys(stats).length > 0
}

function hasSavedBuildSliders(player) {
  const sliders = player?.development_points?.build_coach?.sliders
  return sliders && typeof sliders === 'object' && Object.keys(sliders).length > 0
}

function buildPreview(player, { slotPosition, catalogCard, coach, teamStyle } = {}) {
  if (!hasSavedBuildSliders(player)) return null
  const card = catalogCard || catalogCardFromPlayerSnapshot(player)
  const useFieldCoach = shouldUseFieldCoach(player, { slotPosition, coach })
  return previewGameplayBuildFromSliders({
    player: buildPlayerForPlayProfilePreview(player),
    sliders: sanitizeSliders(player.development_points.build_coach.sliders),
    slotPosition,
    catalogCard: card,
    coach: useFieldCoach ? coach : null,
    teamStyle: useFieldCoach ? teamStyle : null
  })
}

function shouldUseFieldCoach(player, { slotPosition = null, coach = null } = {}) {
  if (!coach) return false
  const explicit = player?.metadata?.field_coach_active ?? player?.metadata?.build_coach?.field_coach_active
  if (typeof explicit === 'boolean') return explicit
  return Boolean(slotPosition)
}

/**
 * Profilo carta Play (editor, confronto PT).
 */
export function resolvePlayProfileForPlayer(player, { slotPosition = null, catalogCard = null, coach = null, teamStyle = null } = {}) {
  if (!player) return { stats: {}, overall: null, fromPlayProfile: false }

  const preview = buildPreview(player, { slotPosition, catalogCard, coach, teamStyle })
  if (preview && Number.isFinite(preview.progressionOverall ?? preview.afterOverall)) {
    const stats = preview.finalBaseStats ||
      nestedEffectiveStatsFromGameplayPreview({ finalInGameStats: preview.finalEfhubStats }) ||
      {}
    const overall = preview.progressionOverall ?? preview.afterOverall
    if (hasStatKeys(stats) || overall != null) {
      return {
        stats,
        overall,
        fromPlayProfile: true,
        targetPosition: preview.targetPosition || null
      }
    }
  }

  if (hasStatKeys(player.base_stats)) {
    const parsed = Number(
      player.metadata?.build_coach?.after?.play_profile_overall ?? player.overall_rating
    )
    return {
      stats: player.base_stats,
      overall: Number.isFinite(parsed) ? parsed : null,
      fromPlayProfile: false
    }
  }

  const effective = player.metadata?.build_coach?.after?.effective_base_stats
  if (hasStatKeys(effective)) {
    const parsed = Number(
      player.metadata?.build_coach?.after?.play_profile_overall ??
        player.metadata?.build_coach?.after?.overall_rating ??
        player.overall_rating
    )
    return {
      stats: effective,
      overall: Number.isFinite(parsed) ? parsed : null,
      fromPlayProfile: false
    }
  }

  const parsed = Number(player.overall_rating)
  return { stats: {}, overall: Number.isFinite(parsed) ? parsed : null, fromPlayProfile: false }
}

/**
 * Visual rosa/formazione: PT only. In-game coach/booster deltas are intentionally
 * excluded from the numbers shown to the user.
 */
export function resolveFieldProfileForPlayer(
  player,
  { slotPosition = null, catalogCard = null, coach = null, teamStyle = null } = {}
) {
  if (!player) return { stats: {}, overall: null, fromField: false }

  const preview = buildPreview(player, { slotPosition, catalogCard, coach, teamStyle })
  if (preview && Number.isFinite(preview.progressionOverall ?? preview.afterOverall)) {
    const stats = preview.finalBaseStats ||
      nestedEffectiveStatsFromGameplayPreview({ finalInGameStats: preview.finalEfhubStats }) ||
      {}
    return {
      stats,
      overall: preview.progressionOverall ?? preview.afterOverall,
      fromField: true,
      targetPosition: preview.targetPosition || null
    }
  }

  const storedField = player.metadata?.build_coach?.after?.field_overall
  if (Number.isFinite(Number(storedField))) {
    return {
      stats: player.base_stats || {},
      overall: Number(storedField),
      fromField: false
    }
  }

  const parsed = Number(player.overall_rating)
  return {
    stats: player.base_stats || {},
    overall: Number.isFinite(parsed) ? parsed : null,
    fromField: false
  }
}

export function getPlayerDisplayStats(player, options = {}) {
  const context = options.context || (options.coach ? 'field' : 'play')
  if (context === 'field') {
    return resolveFieldProfileForPlayer(player, options).stats || {}
  }
  return resolvePlayProfileForPlayer(player, options).stats || {}
}

export function getPlayerDisplayOverall(player, options = {}) {
  const context = options.context || (options.coach ? 'field' : 'play')
  if (context === 'field') {
    const { overall } = resolveFieldProfileForPlayer(player, options)
    if (overall != null) return overall
  } else {
    const { overall } = resolvePlayProfileForPlayer(player, options)
    if (overall != null) return overall
  }
  const parsed = Number(player?.overall_rating)
  return Number.isFinite(parsed) ? parsed : null
}

/** Rosa/formazione: OVR in campo (coach + booster); non sovrascrive base_stats (restano profilo Play). */
export function enrichPlayersForFormation(players = [], { layout = null, activeCoach = null, tacticalSettings = null } = {}) {
  if (!Array.isArray(players) || players.length === 0) return players

  const teamStyle = tacticalSettings?.team_playing_style ?? null
  const slotByIndex = new Map()
  const rawSlots = layout?.slot_positions
  const slots = Array.isArray(rawSlots)
    ? rawSlots
    : rawSlots && typeof rawSlots === 'object'
      ? Object.entries(rawSlots).map(([slotIndex, value]) => ({
          ...(value && typeof value === 'object' ? value : {}),
          slot_index: Number(value?.slot_index ?? slotIndex)
        }))
      : []

  for (const slot of slots) {
    if (slot?.slot_index != null) slotByIndex.set(Number(slot.slot_index), slot)
  }

  return players.map((player) => {
    if (!player) return player
    const slot =
      player.slot_index != null && !Number.isNaN(Number(player.slot_index))
        ? slotByIndex.get(Number(player.slot_index))
        : null
    const field = resolveFieldProfileForPlayer(player, {
      slotPosition: slot?.position ?? null,
      coach: activeCoach,
      teamStyle
    })
    if (!field.fromField && field.overall == null) return player

    const appPosition = String(player.position || field.targetPosition || '').trim().toUpperCase()
    const nextRatings = {
      ...(player.position_ratings && typeof player.position_ratings === 'object' ? player.position_ratings : {})
    }
    if (field.overall != null) {
      if (appPosition) nextRatings[appPosition] = field.overall
      if (field.targetPosition) nextRatings[field.targetPosition] = field.overall
    }

    return {
      ...player,
      ...(field.overall != null ? { overall_rating: field.overall, position_ratings: nextRatings } : {})
    }
  })
}
