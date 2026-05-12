import { createClient } from '@supabase/supabase-js'
import { validateToken, extractBearerToken } from '@/lib/authHelper'
import { calculateGameplayBuild } from '@/lib/gameplayBuildCoach'

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

function getSlotPosition(player, layout) {
  if (player?.slot_index === null || player?.slot_index === undefined) return null
  const slots = Array.isArray(layout?.slot_positions) ? layout.slot_positions : []
  const slot = slots.find((entry) => Number(entry?.slot_index) === Number(player.slot_index))
  return slot?.position || null
}

export async function findCatalogCardForPlayer(admin, player) {
  const metadata = player?.metadata || {}
  const sourcePlayerId = metadata.catalog_source_player_id || metadata.source_player_id || metadata.sourcePlayerId
  if (!sourcePlayerId) return null
  const source = metadata.catalog_source || metadata.source || 'pesdb'
  const { data } = await admin
    .from('player_catalog')
    .select('id, source, source_player_id, player_name, position, max_level, height, base_stats, players_payload')
    .eq('source', source)
    .eq('source_player_id', String(sourcePlayerId))
    .limit(1)
    .maybeSingle()
  return data || null
}

function withFallbacks(player, catalogCard) {
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
    const fallbackLevel = catalogCard?.max_level || catalogCard?.players_payload?.level_cap || next.extracted_data?.level_cap || next.metadata?.level_cap || 30
    next.level_cap = fallbackLevel
    estimated.push('level_cap')
  }

  if (!next.height) {
    next.height = catalogCard?.height || next.extracted_data?.height_cm || next.extracted_data?.height || 175
    estimated.push('height')
  }

  return { player: next, estimated }
}

export function buildPlayerUpdatePayload({ player, build, contextEstimated = [] }) {
  const now = new Date().toISOString()
  const previousMetadata = player.metadata && typeof player.metadata === 'object' ? player.metadata : {}
  const previousDevelopment = player.development_points && typeof player.development_points === 'object' ? player.development_points : {}
  const estimatedFields = Array.from(new Set([...(build.estimatedFields || []), ...contextEstimated]))
  const originalBaseStats = previousMetadata?.build_coach?.before?.base_stats || build.sourceBaseStats || player.base_stats || {}

  return {
    base_stats: build.finalBaseStats,
    overall_rating: build.afterOverall,
    level_cap: build.levelCap || player.level_cap,
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
    position_ratings: {
      ...(player.position_ratings && typeof player.position_ratings === 'object' ? player.position_ratings : {}),
      [build.targetPosition]: build.afterOverall
    },
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
          base_stats: originalBaseStats
        },
        after: {
          overall_rating: build.afterOverall,
          overall_decimal: build.afterOverallDecimal
        },
        boosters_considered: false,
        coach_stat_boosts_considered: false,
        created_at: now
      }
    },
    updated_at: now
  }
}

export async function calculateAndPersistPlayerBuild({ admin, userId, player, rosterContext, save = true }) {
  const catalogCard = await findCatalogCardForPlayer(admin, player)
  const fallback = withFallbacks(player, catalogCard)
  const slotPosition = getSlotPosition(fallback.player, rosterContext.layout)
  const build = calculateGameplayBuild({
    player: fallback.player,
    roster: rosterContext.players,
    teamStyle: rosterContext.tacticalSettings?.team_playing_style,
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

  const updatePayload = buildPlayerUpdatePayload({ player: fallback.player, build, contextEstimated: fallback.estimated })

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
