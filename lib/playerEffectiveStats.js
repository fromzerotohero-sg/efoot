/**
 * Stats shown in UI / Coach vs baseline used to recalculate PT builds.
 * After build-coach, effective stats live in base_stats and metadata.build_coach.after;
 * baseline (pre-PT) is kept in metadata.build_coach.before.base_stats.
 */

function hasStatKeys(stats) {
  return stats && typeof stats === 'object' && !Array.isArray(stats) && Object.keys(stats).length > 0
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

/** Stats the client and Coach should treat as "current" (built when available). */
export function getPlayerDisplayStats(player) {
  if (!player) return {}
  const effective = player.metadata?.build_coach?.after?.effective_base_stats
  if (hasStatKeys(effective)) return effective
  if (hasStatKeys(player.base_stats)) return player.base_stats
  return {}
}

/**
 * Pre-progression baseline for build-coach (PT sliders).
 * Never use players.base_stats when the catalog has level-1 base stats — the column
 * often holds built/effective values after commit 14011e3.
 */
export function getPlayerBaselineStats(player, catalogCard = null) {
  if (!player) return {}

  const before = player.metadata?.build_coach?.before?.base_stats
  if (hasStatKeys(before)) return before

  const catalogBase = pickCatalogBaseStats(catalogCard)
  if (catalogBase) return catalogBase

  // Build saved effective into base_stats but baseline missing — still try catalog only (handled above)
  if (hasStatKeys(player.metadata?.build_coach?.after?.effective_base_stats)) {
    return {}
  }

  if (hasStatKeys(player.base_stats)) return player.base_stats
  return {}
}
