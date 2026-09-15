function hasObjectData(value) {
  return value && typeof value === 'object' && !Array.isArray(value) && Object.keys(value).length > 0
}

export function getMissingMatchSections(match = {}) {
  const ratings = match.player_ratings
  const hasRatings = hasObjectData(ratings) && (
    hasObjectData(ratings.cliente) || hasObjectData(ratings.avversario) ||
    (!ratings.cliente && !ratings.avversario)
  )
  const missing = []
  if (!hasRatings) missing.push('player_ratings')
  if (!hasObjectData(match.team_stats)) missing.push('team_stats')
  if (!hasObjectData(match.attack_areas)) missing.push('attack_areas')
  if (!Array.isArray(match.ball_recovery_zones) || !match.ball_recovery_zones.length) missing.push('ball_recovery_zones')
  if (!match.formation_played && !match.playing_style_played && !match.team_strength) missing.push('formation_style')
  return missing
}

export function normalizeMatchSummary(match) {
  const missing = getMissingMatchSections(match)
  return {
    id: match.id,
    match_date: match.match_date,
    opponent_name: match.opponent_name,
    result: match.result,
    photos_uploaded: 5 - missing.length,
    missing_photos: missing.length ? missing : null,
    data_completeness: missing.length ? 'partial' : 'complete'
  }
}

async function queryData(query, fallback) {
  const { data, error } = await query
  if (error) throw Object.assign(new Error(error.message), { statusCode: 502 })
  return data ?? fallback
}

export function createDashboardDb(readProvider) {
  return {
    async readDashboard({ token, userId }) {
      const client = readProvider.forUser(token)
      const [layout, formationVariants, players, matches, patterns, coaches, profile, gameAnalysis] = await Promise.all([
        queryData(client.from('formation_layout').select('formation, slot_positions').eq('user_id', userId).maybeSingle(), null),
        queryData(client.from('formation_variants').select('phase, formation, slot_positions, is_active')
          .eq('user_id', userId).in('phase', ['attack', 'defense']).eq('is_active', true), []),
        queryData(client.from('players').select('id, player_name, overall_rating, position, slot_index')
          .eq('user_id', userId).order('overall_rating', { ascending: false, nullsLast: true }), []),
        queryData(client.from('matches')
          .select('id, match_date, opponent_name, result, photos_uploaded, missing_photos, data_completeness, player_ratings, team_stats, attack_areas, ball_recovery_zones, formation_played, playing_style_played, team_strength')
          .eq('user_id', userId).order('match_date', { ascending: false }).limit(10), []),
        queryData(client.from('team_tactical_patterns').select('formation_usage, playing_style_usage, recurring_issues')
          .eq('user_id', userId).maybeSingle(), null),
        queryData(client.from('coaches').select('id').eq('user_id', userId).eq('is_active', true).maybeSingle(), null),
        queryData(client.from('user_profiles')
          .select('id, user_id, metalgate_user_id, first_name, last_name, current_division, favorite_team, team_name, ai_name, how_to_remember, hours_per_week, common_problems, ai_knowledge_score, profile_completion_score, profile_completion_level, created_at, updated_at')
          .eq('user_id', userId).maybeSingle(), null),
        queryData(client.from('user_game_analysis').select('stats, captured_at').eq('user_id', userId).maybeSingle(), null)
      ])
      return {
        layout, formationVariants, players, matches, patterns,
        activeCoach: coaches || null, profile, gameAnalysis
      }
    }
  }
}

export function createDashboardService(db) {
  return {
    async read({ userId, token }) {
      const data = await db.readDashboard({ userId, token })
      return {
        layout: data.layout || null,
        formationVariants: data.formationVariants || [],
        players: data.players || [],
        matches: (data.matches || []).map(normalizeMatchSummary),
        patterns: data.patterns || null,
        hasActiveCoach: Boolean(data.activeCoach),
        profile: data.profile || null,
        gameAnalysis: data.gameAnalysis || null
      }
    }
  }
}

export function registerDashboardRoutes(app, { identity, service }) {
  app.get('/v1/dashboard/read', async (request, reply) => {
    try {
      const session = await identity.resolveUser(request)
      return reply.send(await service.read({ userId: session.userId, token: session.token }))
    } catch (error) {
      return reply.code(error.statusCode || 500).send({ error: error.message || 'Internal server error' })
    }
  })
}
