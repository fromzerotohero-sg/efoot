function databaseError(error, fallback) {
  const failure = new Error(error?.message || fallback)
  failure.statusCode = 502
  failure.type = 'database_error'
  return failure
}

function assertResult(result, fallback) {
  if (result?.error) throw databaseError(result.error, fallback)
  return result?.data ?? null
}

export function createCoachFeedbackDb({ readProvider, writeProvider, now = () => new Date() }) {
  if (!readProvider || !writeProvider) {
    throw new TypeError('readProvider and writeProvider are required')
  }

  return {
    async loadChatContext({ token, userId }) {
      const client = readProvider.forUser(token)
      const [profileResult, matchResult] = await Promise.all([
        client.from('user_profiles')
          .select('first_name, ai_name, current_division, hours_per_week, platform, connection_quality, pass_level, smart_assist, input_delay, ai_weak_point, ai_learn_goals, ai_notes, slow_opponent_connection_issues, favourite_player_name')
          .eq('user_id', userId)
          .maybeSingle(),
        client.from('matches')
          .select('id, opponent_name, result, formation_played, playing_style_played, match_date, is_home')
          .eq('user_id', userId)
          .order('match_date', { ascending: false })
          .limit(1)
          .maybeSingle()
      ])
      return {
        profile: assertResult(profileResult, 'Unable to load user profile'),
        match: assertResult(matchResult, 'Unable to load latest match')
      }
    },

    async loadOwnedMatch({ token, userId, matchId }) {
      if (!matchId) return null
      const result = await readProvider.forUser(token).from('matches')
        .select('id, opponent_name, result, formation_played, playing_style_played')
        .eq('id', matchId)
        .eq('user_id', userId)
        .maybeSingle()
      return assertResult(result, 'Unable to load match')
    },

    async saveFeedback({
      token,
      userId,
      match,
      sessionType,
      profileUpdates,
      profileFieldsUpdated,
      insights,
      summary,
      outcome
    }) {
      const client = writeProvider.forUser(token)
      if (profileFieldsUpdated.length > 0) {
        const result = await client.from('user_profiles')
          .update({
            ...profileUpdates,
            updated_at: now().toISOString()
          })
          .eq('user_id', userId)
        assertResult(result, 'Unable to update user profile')
      }

      const result = await client.from('user_tactical_feedback').insert({
        user_id: userId,
        match_id: match?.id || null,
        session_type: sessionType,
        formation_played: match?.formation_played || null,
        style_played: match?.playing_style_played || null,
        opponent_name: match?.opponent_name || null,
        outcome,
        conversation_summary: summary,
        insights,
        profile_fields_updated: profileFieldsUpdated
      })
      assertResult(result, 'Unable to save coach feedback')
    }
  }
}
