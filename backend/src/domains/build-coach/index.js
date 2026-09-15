import { assertDormantRead } from '../../dormant.js'
import {
  calculateGameplayBuild,
  resolveProgressionLevelCap
} from '../../../../lib/gameplayBuildCoach.js'
import {
  efhubStatsToPlayerBaseStats,
  normalizeStatsToEfhub
} from '../../../../lib/efootballBuildRules.js'
import {
  enrichCatalogCardForBuildCoach,
  fetchRosterContext as fetchProductionRosterContext,
  findCatalogCardForPlayer as findProductionCatalogCard,
  getEffectiveCardType,
  getNonProgressionReason,
  getSlotPosition,
  isNonProgressionCardType
} from '../../../../lib/buildCoachServerUtils.js'

export {
  getEffectiveCardType,
  getSlotPosition,
  isNonProgressionCardType
}

// Kept as a compatibility export for focused domain consumers. Endpoint
// execution uses the production fallback behavior below.
export function withBuildFallbacks(player, catalogCard, resolveLevelCap = resolveProgressionLevelCap) {
  return withProductionFallbacks(player, catalogCard, resolveLevelCap)
}

function error(message, statusCode) {
  return Object.assign(new Error(message), { statusCode })
}

async function result(query, fallback = []) {
  const { data, error: cause } = await query
  if (cause) throw error(cause.message, 502)
  return data ?? fallback
}

export function createBuildCoachDb({ readProvider, writeProvider }) {
  return {
    async readRosterContext({ token, userId }) {
      const client = readProvider.forUser(token)
      return fetchProductionRosterContext(client, userId)
    },
    async findCatalogCard({ token, player }) {
      const client = typeof readProvider.forServerCatalog === 'function'
        ? readProvider.forServerCatalog()
        : readProvider.forUser(token)
      const catalogCard = await findProductionCatalogCard(client, player)
      return enrichCatalogCardForBuildCoach(player, catalogCard)
    },
    async readPlayersWithBuildMetadata({ token, userId }) {
      const client = readProvider.forUser(token)
      return result(client.from('players').select('*').eq('user_id', userId).not('metadata', 'is', null))
    },
    async updatePlayerBuild({ token, userId, playerId, update }) {
      const client = writeProvider.forUser(token)
      const { error: cause } = await client.from('players').update(update)
        .eq('id', playerId).eq('user_id', userId)
      if (cause) throw error(cause.message, 502)
    }
  }
}

function withProductionFallbacks(player, catalogCard, resolveLevelCap = resolveProgressionLevelCap) {
  const next = { ...player }
  const estimated = []
  if ((!next.base_stats || Object.keys(next.base_stats || {}).length === 0) && catalogCard?.players_payload?.base_stats) {
    next.base_stats = catalogCard.players_payload.base_stats
    estimated.push('base_stats')
  } else if ((!next.base_stats || Object.keys(next.base_stats || {}).length === 0) && catalogCard?.base_stats) {
    next.base_stats = catalogCard.base_stats
    estimated.push('base_stats')
  }
  const resolvedLevelCap = resolveLevelCap(next, catalogCard)
  const currentLevelCap = Number(next.level_cap)
  if ((!Number.isFinite(currentLevelCap) || currentLevelCap <= 1) && resolvedLevelCap && resolvedLevelCap > 1) {
    next.level_cap = resolvedLevelCap
    estimated.push('level_cap')
  }
  if (!next.height) {
    next.height = catalogCard?.height || next.extracted_data?.height_cm || next.extracted_data?.height || 175
    estimated.push('height')
  }
  return { player: next, estimated }
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
          base_stats: baselineNested
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

export async function calculatePlayerBuild({ player, rosterContext, catalogCard = null }) {
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
  const fallback = withProductionFallbacks(player, catalogCard)
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
  return {
    ok: true,
    updatePayload: buildPlayerUpdatePayload({
      player: fallback.player,
      build,
      contextEstimated: fallback.estimated,
      catalogCard
    }),
    publicResult: {
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
}

export function createBuildCoachService({ config, db, calculator }) {
  const context = (userId, token) => db.readRosterContext({ userId, token })
  const calculate = async (userId, token, player, rosterContext) => {
    const catalogCard = typeof db.findCatalogCard === 'function'
      ? await db.findCatalogCard({ userId, token, player })
      : null
    const result = await calculator({ userId, token, player, rosterContext, catalogCard, save: false })
    if (result.ok) {
      await db.updatePlayerBuild({
        userId,
        ...(token === undefined ? {} : { token }),
        playerId: player.id,
        update: result.updatePayload
      })
    }
    return result.publicResult || result
  }
  return {
    async roster({ userId, token }) {
      assertDormantRead(config, 'build-coach.roster')
      const rosterContext = await context(userId, token)
      const results = []
      for (const player of rosterContext.players.filter((item) => item?.id && item?.player_name)) {
        try { results.push(await calculate(userId, token, player, rosterContext)) } catch (cause) {
          results.push({ ok: false, player_id: player.id, player_name: player.player_name, error: cause.message || 'build_failed' })
        }
      }
      return {
        ok: true,
        summary: {
          total: results.length,
          updated: results.filter((item) => item.ok).length,
          skipped: results.filter((item) => !item.ok).length,
          estimated: results.filter((item) => item.ok && item.estimated_fields?.length).length
        },
        results
      }
    },

    async player({ userId, token, playerId }) {
      assertDormantRead(config, 'build-coach.player')
      if (!playerId) throw error('Player ID is required', 400)
      const rosterContext = await context(userId, token)
      const player = rosterContext.players.find((item) => String(item.id) === String(playerId))
      if (!player) throw error('Player not found', 404)
      const result = await calculate(userId, token, player, rosterContext)
      if (!result.ok) {
        const messages = {
          max_level_one: 'Questa carta non ha punti crescita utilizzabili (livello massimo 1). Se in gioco si potenzia, imposta il livello massimo corretto nel profilo giocatore.',
          non_progression_card_type: 'Questo tipo di carta ha progressione fissa nel gioco e non può ricevere una build automatica.'
        }
        throw Object.assign(error(result.error || 'Build failed', 422), {
          responsePayload: {
            error: result.error,
            message: messages[result.error] || result.error,
            result
          }
        })
      }
      return { ok: true, result }
    }
  }
}

export function registerBuildCoachRoutes(app, { identity, service }) {
  const route = (action) => async (request, reply) => {
    try {
      const session = await identity.resolveUser(request)
      return reply.send(await action(request, session))
    } catch (cause) {
      return reply.code(cause.statusCode || 500).send(cause.responsePayload || { error: cause.message })
    }
  }
  app.post('/v1/buildCoach/roster', route((_request, session) => service.roster({ userId: session.userId, token: session.token })))
  app.post('/v1/buildCoach/player/:id', route((request, session) =>
    service.player({ userId: session.userId, token: session.token, playerId: request.params?.id })))
}
