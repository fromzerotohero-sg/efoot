/**
 * Stats shown in UI / Coach vs baseline used to recalculate PT builds.
 * After build-coach, effective stats live in base_stats and metadata.build_coach.after;
 * baseline (pre-PT) is kept in metadata.build_coach.before.base_stats.
 */

import { normalizeStatsToEfhub } from './efootballBuildRules.js'

function hasStatKeys(stats) {
  return stats && typeof stats === 'object' && !Array.isArray(stats) && Object.keys(stats).length > 0
}

export function looksLikeInflatedPreProgressionBaseline(beforeStats) {
  if (!hasStatKeys(beforeStats)) return false
  const flat = normalizeStatsToEfhub(beforeStats)
  const defensiveAwareness = Number(flat.defensiveAwareness) || 0
  const tackling = Number(flat.trackingBack) || 0
  return defensiveAwareness > 88 || tackling > 85
}

function pickCatalogBaseStats(catalogCard) {
  if (!catalogCard) return null
  if (catalogCard.players_payload?.base_stats && hasStatKeys(catalogCard.players_payload.base_stats)) {
    return catalogCard.players_payload.base_stats
  }
  if (catalogCard.base_stats && hasStatKeys(catalogCard.base_stats)) {
    return catalogCard.base_stats
  }
  return null
}

export { getPlayerDisplayStats, getPlayerDisplayOverall } from './playProfileDisplay.js'

/**
 * Pre-progression baseline for build-coach (PT sliders).
 * Never use players.base_stats when the catalog has level-1 base stats — the column
 * often holds built/effective values after commit 14011e3.
 */
export function getPlayerBaselineStats(player, catalogCard = null) {
  if (!player) return {}

  const catalogBase = pickCatalogBaseStats(catalogCard)
  if (catalogBase) return catalogBase

  const before = player.metadata?.build_coach?.before?.base_stats
  if (hasStatKeys(before) && !looksLikeInflatedPreProgressionBaseline(before)) return before

  if (hasStatKeys(player.metadata?.build_coach?.after?.effective_base_stats)) {
    return {}
  }

  if (hasStatKeys(player.base_stats) && !player.development_points?.build_coach?.sliders) {
    return player.base_stats
  }
  return {}
}
