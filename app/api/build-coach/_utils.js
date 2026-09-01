import { createClient } from '@supabase/supabase-js'
import { validateToken, extractBearerToken } from '@/lib/authHelper'
import { efhubStatsToPlayerBaseStats, normalizeStatsToEfhub } from '@/lib/efootballBuildRules'
import { calculateGameplayBuild, resolveProgressionLevelCap } from '@/lib/gameplayBuildCoach'
import {
  BUILD_COACH_CATALOG_SELECT,
  enrichCatalogCardForBuildCoach,
  getNonProgressionReason,
  getSlotPosition,
  withFallbacks
} from '@/lib/buildCoachServerUtils'

export async function resolveBuildCoachContext(req) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !anonKey || !serviceKey) {
    return { error: { message: 'Server configuration error', status: 500 } }
  }

  const token = extractBearerToken(req)
  if (!token) return { error: { message: 'Unauthorized', status: 401 } }

  const { userData, error: authError } = await validateToken(token, supabaseUrl, anonKey)
  if (authError || !userData?.user?.id) return { error: { message: 'Invalid token', status: 401 } }

  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  })

  let userId = userData.user.id
  if (userData.user.user_metadata?.is_metalgate_user) {
    const { data: existingProfile } = await admin
      .from('user_profiles')
      .select('user_id')
      .eq('metalgate_user_id', userId)
      .single()
    if (!existingProfile?.user_id) return { error: { message: 'User profile not found', status: 404 } }
    userId = existingProfile.user_id
  }

  return { admin, userId }
}

const PLAYER_SELECT = `
  id, user_id, player_name, position, card_type, team, overall_rating,
  base_stats, skills, com_skills, position_ratings, available_boosters,
  height, weight, age, nationality, club_name, form, role,
  playing_style_id, current_level, level_cap, active_booster_name,
  development_points, slot_index, metadata, extracted_data,
  created_at, updated_at, photo_slots, original_positions
`

export async function fetchRosterContext(admin, userId) {
  const [
    { data: players, error: playersError },
    { data: tacticalSettings },
    { data: activeCoach },
    { data: layout }
  ] = await Promise.all([
    admin.from('players').select(PLAYER_SELECT).eq('user_id', userId),
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

export function buildPlayerUpdatePayload({ player, build, contextEstimated = [], catalogCard = null }) {
  const now = new Date().toISOString()
  const previousMetadata = player.metadata && typeof player.metadata === 'object' ? player.metadata : {}
  const previousDevelopment = player.development_points && typeof player.development_points === 'object' ? player.development_points : {}
  const estimatedFields = Array.from(new Set([...(build.estimatedFields || []), ...contextEstimated]))
  const baselineNested = efhubStatsToPlayerBaseStats(normalizeStatsToEfhub(build.baseStats))
  const useFieldSnapshot = Boolean(build.coachConsidered || build.fieldBoostersConsidered)
  const effectiveEfhubStats =
    useFieldSnapshot && build.finalFieldStats ? build.finalFieldStats : build.finalInGameStats
  const effectiveNested = efhubStatsToPlayerBaseStats(normalizeStatsToEfhub(effectiveEfhubStats))
  const displayOverall =
    useFieldSnapshot && Number.isFinite(build.fieldOverall) ? build.fieldOverall : build.afterOverall
  const catalogOverallMax = catalogCard?.overall_max_level ?? catalogCard?.players_payload?.overall_max_level
  const beforeBaseStats = baselineNested

  return {
    base_stats: effectiveNested,
    overall_rating: displayOverall,
    level_cap: build.levelCap || resolveProgressionLevelCap(player, catalogCard) || player.level_cap,
    development_points: {
      ...previousDevelopment,
      build_coach: {
        method: build.method,
        mode: build.mode,
        target_position: build.targetPosition,
        points_available: build.pointsAvailable,
        points_used: build.pointsUsed,
        sliders: build.sliders,
        updated_at: now
      }
    },
    position_ratings: (() => {
      const ratings = {
        ...(player.position_ratings && typeof player.position_ratings === 'object' ? player.position_ratings : {}),
        [build.targetPosition]: displayOverall
      }
      const appPosition = String(player.position || '').trim().toUpperCase()
      if (appPosition) ratings[appPosition] = displayOverall
      return ratings
    })(),
    metadata: {
      ...previousMetadata,
      build_coach: {
        version: 'v1',
        mode: 'gameplay',
        method: build.method,
        target_position: build.targetPosition,
        points_available: build.pointsAvailable,
        points_used: build.pointsUsed,
        confidence: build.confidence,
        estimated_fields: estimatedFields,
        reasons: build.reasons,
        warnings: build.warnings,
        before: {
          overall_rating: player.overall_rating,
          base_stats: beforeBaseStats
        },
        after: {
          overall_rating: displayOverall,
          overall_decimal: build.afterOverallDecimal,
          play_profile_overall: build.inGameOverall ?? build.afterOverall,
          field_overall: build.fieldOverall ?? null,
          effective_base_stats: effectiveNested,
          overall_cap: build.overallCap ?? null
        },
        boosters_considered: Boolean(build.boostersConsidered),
        field_boosters_considered: Boolean(build.fieldBoostersConsidered),
        coach_stat_boosts_considered: Boolean(build.coachConsidered),
        created_at: now
      },
      ...(catalogOverallMax != null && Number.isFinite(Number(catalogOverallMax))
        ? { catalog_overall_max_level: Math.floor(Number(catalogOverallMax)) }
        : {})
    },
    updated_at: now
  }
}

export async function calculateAndPersistPlayerBuild({ admin, userId, player, rosterContext, save = true }) {
  const catalogCard = await enrichCatalogCardForBuildCoach(
    player,
    await findCatalogCardForPlayer(admin, player)
  )
  const nonProgression = getNonProgressionReason(player, catalogCard)
  if (nonProgression.blocked) {
    return {
      ok: false,
      player_id: player.id,
      player_name: player.player_name,
      error: nonProgression.reason,
      card_type: nonProgression.cardType,
      estimated_fields: []
    }
  }
  const fallback = withFallbacks(player, catalogCard)
  const slotPosition = getSlotPosition(fallback.player, rosterContext.layout)
  const build = calculateGameplayBuild({
    player: fallback.player,
    roster: rosterContext.players,
    teamStyle: rosterContext.tacticalSettings?.team_playing_style,
    coach: rosterContext.activeCoach,
    slotPosition,
    catalogCard
  })

  if (!build.ok) {
    return {
      ok: false,
      player_id: player.id,
      player_name: player.player_name,
      error: build.error,
      estimated_fields: fallback.estimated
    }
  }

  const updatePayload = buildPlayerUpdatePayload({
    player: fallback.player,
    build,
    contextEstimated: fallback.estimated,
    catalogCard
  })

  if (save) {
    const { error } = await admin
      .from('players')
      .update(updatePayload)
      .eq('id', player.id)
      .eq('user_id', userId)
    if (error) throw new Error(error.message)
  }

  return {
    ok: true,
    player_id: player.id,
    player_name: player.player_name,
    before_overall: player.overall_rating,
    after_overall: build.afterOverall,
    target_position: build.targetPosition,
    points_used: build.pointsUsed,
    sliders: build.sliders,
    reasons: build.reasons,
    estimated_fields: Array.from(new Set([...(build.estimatedFields || []), ...fallback.estimated]))
  }
}
