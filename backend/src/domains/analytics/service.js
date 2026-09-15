import { calculateTacticalPatterns } from '../matches/patterns.js'
import { domainError } from '../matches/payloads.js'

export const PATTERN_MATCH_LIMIT = 20

export function createAnalyticsReadService(readOnlyProvider) {
  return {
    async getGameAnalysis({ token, userId }) {
      const client = readOnlyProvider.forUser(token)
      const result = await client
        .from('user_game_analysis')
        .select('captured_at, stats')
        .eq('user_id', userId)
        .maybeSingle()
      if (result.error) throw domainError(result.error.message || 'Unable to read game analysis')
      const stats = result.data?.stats
      const hasStats = stats && typeof stats === 'object' && Object.keys(stats).length > 0
      return {
        captured_at: result.data?.captured_at || null,
        has_stats: Boolean(hasStats),
        stats: hasStats ? stats : null
      }
    }
  }
}

export function createAnalyticsWriteService(writeProvider) {
  return {
    async recalculatePatterns({ token, userId, requestedUserId, now = new Date() }) {
      if (requestedUserId && requestedUserId !== userId) {
        throw domainError('Unauthorized: can only recalculate own patterns', 403)
      }
      const client = writeProvider.forUser(token)
      const matchesResult = await client
        .from('matches')
        .select('formation_played, playing_style_played, result, is_home, attack_areas, team_stats')
        .eq('user_id', userId)
        .order('match_date', { ascending: false })
        .limit(PATTERN_MATCH_LIMIT)
      if (matchesResult.error) {
        throw domainError(matchesResult.error.message || 'Error loading matches')
      }
      if (!matchesResult.data?.length) return null
      const patterns = calculateTacticalPatterns(matchesResult.data)
      const payload = {
        user_id: userId,
        ...patterns,
        last_updated: now.toISOString()
      }
      if (payload.total_goals_scored == null) delete payload.total_goals_scored
      if (payload.total_goals_conceded == null) delete payload.total_goals_conceded
      const saved = await client
        .from('team_tactical_patterns')
        .upsert(payload, { onConflict: 'user_id' })
      if (saved.error) throw domainError(saved.error.message || 'Error saving tactical patterns')
      return {
        formation_usage: patterns.formation_usage,
        playing_style_usage: patterns.playing_style_usage,
        recurring_issues: patterns.recurring_issues
      }
    },

    async saveGameAnalysis({ token, userId, stats, capturedAt = new Date() }) {
      if (!stats || typeof stats !== 'object' || Array.isArray(stats) ||
        Object.keys(stats).length === 0) {
        throw domainError('stats are required', 400)
      }
      const client = writeProvider.forUser(token)
      const timestamp = capturedAt instanceof Date ? capturedAt.toISOString() : capturedAt
      const result = await client
        .from('user_game_analysis')
        .upsert(
          { user_id: userId, stats, captured_at: timestamp },
          { onConflict: 'user_id' }
        )
      if (result.error) throw domainError(result.error.message || 'Error saving game analysis')
      return { success: true, captured_at: timestamp }
    }
  }
}

export function registerAnalyticsRoutes(app, {
  identity,
  analyticsReads,
  analyticsWrites
}) {
  const fail = (reply, error) =>
    reply.code(error.statusCode || 500).send({ error: error.message || 'Internal error' })

  app.post('/v1/analytics/recalculate-patterns', async (request, reply) => {
    try {
      const session = await identity.resolveUser(request)
      const patterns = await analyticsWrites.recalculatePatterns({
        token: session.token,
        userId: session.userId,
        requestedUserId: request.body?.user_id
      })
      if (!patterns) {
        return reply.code(404).send({
          success: false,
          message: 'No matches found or error calculating patterns'
        })
      }
      return { success: true, patterns, message: 'Tactical patterns calculated successfully' }
    } catch (error) {
      return fail(reply, error)
    }
  })

  app.get('/v1/analytics/game-analysis', async (request, reply) => {
    try {
      const session = await identity.resolveUser(request)
      return await analyticsReads.getGameAnalysis({
        token: session.token,
        userId: session.userId
      })
    } catch (error) {
      return fail(reply, error)
    }
  })

  app.put('/v1/analytics/game-analysis', async (request, reply) => {
    try {
      const session = await identity.resolveUser(request)
      return await analyticsWrites.saveGameAnalysis({
        token: session.token,
        userId: session.userId,
        stats: request.body?.stats,
        capturedAt: request.body?.captured_at || new Date()
      })
    } catch (error) {
      return fail(reply, error)
    }
  })
}
