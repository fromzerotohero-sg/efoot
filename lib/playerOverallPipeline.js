import {
  applyProgression,
  clampOverallRating,
  computeOverallRating,
  normalizeStatsToEfhub,
  resolveOverallRatingCap
} from './efootballBuildRules.js'
import {
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

  const rawSliders =
    sliders ??
    player.development_points?.build_coach?.sliders ??
    player.metadata?.build_coach?.sliders
  const safeSliders = sanitizeSliders(typeof rawSliders === 'object' && rawSliders !== null ? rawSliders : {})

  const afterProgression = applyProgression(baseStats, safeSliders)
  const inGameStats = applyInGameEffects(afterProgression, { player })

  const progressionOverall = computeOverallRating({
    position: targetPosition,
    height,
    weakFootAccuracy,
    stats: afterProgression
  })
  const inGameOverall = computeOverallRating({
    position: targetPosition,
    height,
    weakFootAccuracy,
    stats: inGameStats
  })

  return {
    targetPosition,
    overallCap: cap,
    progressionOverall: clampOverallRating(progressionOverall, cap),
    inGameOverall: clampOverallRating(inGameOverall, cap),
    afterOverall: clampOverallRating(Math.max(progressionOverall, inGameOverall), cap)
  }
}
