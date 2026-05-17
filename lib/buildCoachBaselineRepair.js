import {
  calculateGameplayBuild,
  inferBuildTargetPosition,
  nestedBaselineStatsFromGameplayPreview,
  nestedEffectiveStatsFromGameplayPreview,
  previewGameplayBuildFromSliders,
  sanitizeSliders
} from './gameplayBuildCoach.js'
import {
  clampOverallRating,
  computeOverallRatingDecimal,
  efhubStatsToPlayerBaseStats,
  normalizeStatsToEfhub,
  resolveOverallRatingCap
} from './efootballBuildRules.js'
import {
  BUILD_COACH_PLAYER_SELECT,
  fetchRosterContext,
  findCatalogCardForPlayer,
  getNonProgressionReason,
  getSlotPosition,
  withFallbacks
} from './buildCoachServerUtils.js'

function getWeakFootAccuracy(player = {}) {
  const parsed = Number(
    player.weak_foot_accuracy ??
      player.metadata?.weak_foot_accuracy ??
      player.extracted_data?.weak_foot_accuracy ??
      2
  )
  return Number.isFinite(parsed) ? parsed : 2
}

export async function repairSinglePlayerBuildCoachBaseline(admin, player, rosterContext, { dryRun = true } = {}) {
  const bc = player.metadata?.build_coach
  if (!bc || typeof bc !== 'object') return { ok: false, skip: 'no_build_coach', player_id: player.id }

  const catalogCard = await findCatalogCardForPlayer(admin, player)
  const nonProgression = getNonProgressionReason(player, catalogCard)
  if (nonProgression.blocked) return { ok: false, skip: nonProgression.reason, player_id: player.id }

  let baselineNested =
    bc.before?.base_stats && typeof bc.before.base_stats === 'object' && Object.keys(bc.before.base_stats).length > 0
      ? bc.before.base_stats
      : null

  if (!baselineNested) {
    baselineNested =
      (catalogCard?.players_payload?.base_stats && typeof catalogCard.players_payload.base_stats === 'object'
        ? catalogCard.players_payload.base_stats
        : null) ||
      (catalogCard?.base_stats && typeof catalogCard.base_stats === 'object' ? catalogCard.base_stats : null) ||
      null
  }

  if (!baselineNested || Object.keys(baselineNested).length === 0) {
    return { ok: false, skip: 'no_baseline_source', player_id: player.id }
  }

  const patchedPlayer = { ...player, base_stats: baselineNested }
  const fallback = withFallbacks(patchedPlayer, catalogCard)
  const slotPosition = getSlotPosition(fallback.player, rosterContext.layout)
  const coach = rosterContext.activeCoach
  const teamStyle = rosterContext.tacticalSettings?.team_playing_style
  const storedSliders = sanitizeSliders(player.development_points?.build_coach?.sliders || {})

  let preview = previewGameplayBuildFromSliders({
    player: fallback.player,
    sliders: storedSliders,
    slotPosition,
    catalogCard,
    coach,
    teamStyle
  })

  if (preview.error === 'missing_level_cap') return { ok: false, skip: 'missing_level_cap', player_id: player.id }

  let buildSource = 'saved_sliders'
  const lacksComputedStats =
    preview.baseStats === undefined ||
    preview.finalInGameStats === undefined ||
    preview.afterOverall === undefined

  if (lacksComputedStats) {
    const auto = calculateGameplayBuild({
      player: fallback.player,
      roster: rosterContext.players,
      teamStyle,
      coach,
      slotPosition,
      catalogCard
    })
    if (!auto.ok) return { ok: false, skip: auto.error || 'auto_build_failed', player_id: player.id }
    buildSource = 'auto_build'
    preview = {
      targetPosition: auto.targetPosition,
      afterOverall: auto.afterOverall,
      overallCap: auto.overallCap,
      baseStats: auto.baseStats,
      finalEfhubStats: auto.finalEfhubStats,
      finalInGameStats: auto.finalInGameStats
    }
  }

  const baselineCol =
    nestedBaselineStatsFromGameplayPreview({ baseStats: preview.baseStats }) ||
    efhubStatsToPlayerBaseStats(normalizeStatsToEfhub(preview.baseStats))

  const effectiveNested =
    nestedEffectiveStatsFromGameplayPreview({ finalInGameStats: preview.finalInGameStats }) ||
    efhubStatsToPlayerBaseStats(normalizeStatsToEfhub(preview.finalInGameStats))

  const resolvedPosition =
    preview.targetPosition || inferBuildTargetPosition(fallback.player, slotPosition)
  const height = Number(player.height || catalogCard?.height || 170)
  const weakFootAccuracy = getWeakFootAccuracy(player)
  const cap = preview.overallCap ?? resolveOverallRatingCap({ catalogCard, player })

  const afterOverallDecimal = Math.min(
    Math.max(
      computeOverallRatingDecimal({
        position: resolvedPosition,
        height,
        weakFootAccuracy,
        stats: preview.finalEfhubStats
      }),
      computeOverallRatingDecimal({
        position: resolvedPosition,
        height,
        weakFootAccuracy,
        stats: preview.finalInGameStats
      })
    ),
    cap
  )

  const afterOverall = clampOverallRating(preview.afterOverall, cap)
  const now = new Date().toISOString()

  const patch = {
    base_stats: effectiveNested,
    overall_rating: afterOverall,
    position_ratings: {
      ...(player.position_ratings && typeof player.position_ratings === 'object' ? player.position_ratings : {}),
      [resolvedPosition]: afterOverall
    },
    metadata: {
      ...(player.metadata && typeof player.metadata === 'object' ? player.metadata : {}),
      build_coach: {
        ...(typeof player.metadata?.build_coach === 'object' ? player.metadata.build_coach : {}),
        before: {
          ...(typeof player.metadata?.build_coach?.before === 'object' ? player.metadata.build_coach.before : {}),
          base_stats: baselineCol
        },
        after: {
          ...(typeof player.metadata?.build_coach?.after === 'object' ? player.metadata.build_coach.after : {}),
          overall_rating: afterOverall,
          overall_decimal: afterOverallDecimal,
          effective_base_stats: effectiveNested,
          overall_cap: cap
        }
      },
      ...(catalogCard?.overall_max_level != null
        ? { catalog_overall_max_level: Math.floor(Number(catalogCard.overall_max_level)) }
        : {})
    },
    updated_at: now
  }

  if (!dryRun) {
    const { error } = await admin.from('players').update(patch).eq('id', player.id).eq('user_id', player.user_id)
    if (error) return { ok: false, skip: error.message, player_id: player.id }
  }

  return {
    ok: true,
    player_id: player.id,
    player_name: player.player_name,
    dry_run: dryRun,
    build_source: buildSource,
    after_overall: afterOverall,
    overall_cap: cap
  }
}

export async function fetchPlayersWithBuildCoachMetadata(admin) {
  const { data, error } = await admin
    .from('players')
    .select(BUILD_COACH_PLAYER_SELECT)
    .not('metadata', 'is', null)
    .not('metadata->build_coach', 'is', null)

  if (error) throw new Error(error.message)
  return data || []
}

export { BUILD_COACH_PLAYER_SELECT, fetchRosterContext }
