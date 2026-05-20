import {
  applyProgression,
  clampOverallRating,
  computeOverallRating,
  computePlayProfileOverallRating,
  normalizeStatsToEfhub,
  resolveOverallRatingCap,
  resolveStatCaps
} from './efootballBuildRules.js'
import {
  applyFieldEffects,
  applyInGameEffects,
  getBuildSourceStats,
  inferBuildTargetPosition,
  sanitizeSliders
} from './gameplayBuildCoach.js'

function getWeakFootAccuracy(player = {}) {
  const direct = player.weak_foot_accuracy ?? player.weakFootAccuracy
  const metadata = player.metadata?.weak_foot_accuracy ?? player.metadata?.weakFootAccuracy
  const extracted = player.extracted_data?.weak_foot_accuracy ?? player.extracted_data?.weakFootAccuracy
  const parsed = Number(direct ?? metadata ?? extracted)
  return Number.isFinite(parsed) ? parsed : 2
}

function shouldUseFieldCoach(player, { slotPosition = null, coach = null } = {}) {
  if (!coach) return false
  const explicit = player?.metadata?.field_coach_active ?? player?.metadata?.build_coach?.field_coach_active
  if (typeof explicit === 'boolean') return explicit
  return Boolean(slotPosition)
}

/**
 * OVR profilo carta: baseline catalogo → PT (slider salvati) → booster attivo, con cap catalogo.
 */
export function computePlayerFieldOverall({
  player,
  catalogCard = null,
  slotPosition = null,
  coach = null,
  teamStyle = null,
  sliders = null
} = {}) {
  if (!player) return null

  const targetPosition = inferBuildTargetPosition(player, slotPosition)
  const sourceBase = getBuildSourceStats(player, catalogCard)
  const baseStats = normalizeStatsToEfhub(sourceBase)
  const height = Number(player.height || player.height_cm || catalogCard?.height || 170)
  const weakFootAccuracy = getWeakFootAccuracy(player)
  const cap = resolveOverallRatingCap({ catalogCard, player })
  const statCaps = resolveStatCaps(catalogCard)

  const rawSliders =
    sliders ??
    player.development_points?.build_coach?.sliders ??
    player.metadata?.build_coach?.sliders
  const safeSliders = sanitizeSliders(typeof rawSliders === 'object' && rawSliders !== null ? rawSliders : {})

  const afterProgression = applyProgression(baseStats, safeSliders, statCaps)
  const playStats = applyInGameEffects(afterProgression, { player, statCaps, catalogCard })
  const useFieldCoach = shouldUseFieldCoach(player, { slotPosition, coach })
  const fieldStats = applyFieldEffects(afterProgression, {
    player,
    coach: useFieldCoach ? coach : null,
    teamStyle: useFieldCoach ? teamStyle : null,
    statCaps,
    catalogCard
  })

  const progressionOverall = computePlayProfileOverallRating({
    position: targetPosition,
    height,
    weakFootAccuracy,
    stats: afterProgression
  })
  const playProfileOverall = computePlayProfileOverallRating({
    position: targetPosition,
    height,
    weakFootAccuracy,
    stats: playStats
  })
  const fieldOverallRaw = computeOverallRating({
    position: targetPosition,
    height,
    weakFootAccuracy,
    stats: fieldStats
  })

  return {
    targetPosition,
    overallCap: cap,
    progressionOverall: clampOverallRating(progressionOverall, cap),
    playProfileOverall: clampOverallRating(playProfileOverall, cap),
    inGameOverall: clampOverallRating(playProfileOverall, cap),
    fieldOverall: clampOverallRating(fieldOverallRaw, cap),
    afterOverall: clampOverallRating(Math.max(playProfileOverall, fieldOverallRaw), cap)
  }
}
