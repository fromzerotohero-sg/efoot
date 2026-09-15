const OPPONENT_SELECT = [
  'id', 'user_id', 'formation_name', 'playing_style', 'tactical_style',
  'overall_strength', 'players', 'extracted_data', 'is_pre_match',
  'formation_image', 'match_date', 'created_at', 'updated_at'
].join(', ')

function databaseError(error, fallback = 'Database operation failed') {
  const failure = new Error(error?.message || fallback)
  failure.statusCode = 502
  failure.type = 'database_error'
  return failure
}

async function required(result, message) {
  if (result.error || !result.data) {
    const error = new Error(message)
    error.statusCode = 404
    error.type = 'not_found'
    throw error
  }
  return result.data
}

async function optional(result) {
  if (result.error) throw databaseError(result.error)
  return result.data || null
}

async function list(result) {
  if (result.error) throw databaseError(result.error)
  return result.data || []
}

export function createCountermeasuresRepository({ readProvider, writeProvider }) {
  if (!readProvider || !writeProvider) {
    throw new TypeError('readProvider and writeProvider are required')
  }

  return {
    async loadContext({ token, userId, opponentFormationId }) {
      const client = readProvider.forUser(token)
      const opponentFormation = await required(
        await client.from('opponent_formations').select(OPPONENT_SELECT)
          .eq('id', opponentFormationId).eq('user_id', userId).single(),
        'Opponent formation not found or access denied'
      )

      const roster = await list(await client.from('players')
        .select('id, player_name, position, overall_rating, base_stats, skills, com_skills, playing_style_id, slot_index, original_positions, photo_slots')
        .eq('user_id', userId).order('overall_rating', { ascending: false }))
      const playingStyles = await list(await client.from('playing_styles').select('id, name'))
      const stylesLookup = Object.fromEntries(
        playingStyles.filter((style) => style?.id && style?.name)
          .map((style) => [style.id, style.name])
      )
      const clientFormation = await optional(await client.from('formation_layout')
        .select('formation, slot_positions').eq('user_id', userId).maybeSingle())
      const formationVariants = await list(await client.from('formation_variants')
        .select('id, phase, formation, slot_positions, is_active, source_version, updated_at')
        .eq('user_id', userId).in('phase', ['attack', 'defense']).eq('is_active', true))
      const tacticalSettings = await optional(await client.from('team_tactical_settings')
        .select('team_playing_style, individual_instructions').eq('user_id', userId).maybeSingle())
      const activeCoach = await optional(await client.from('coaches')
        .select('coach_name, playing_style_competence, stat_boosters, connection')
        .eq('user_id', userId).eq('is_active', true).maybeSingle())
      const matchHistory = await list(await client.from('matches')
        .select('id, opponent_name, result, formation_played, playing_style_played, opponent_formation_id, player_ratings, team_stats, attack_areas, match_date')
        .eq('user_id', userId).order('match_date', { ascending: false }).limit(20))

      const historyOpponentIds = [...new Set(matchHistory
        .map((match) => match.opponent_formation_id)
        .filter(Boolean))]
      const historyOpponentFormations = historyOpponentIds.length
        ? await list(await client.from('opponent_formations')
          .select('id, formation_name, playing_style, players, extracted_data')
          .eq('user_id', userId).in('id', historyOpponentIds))
        : []

      const tacticalPatterns = await optional(await client.from('team_tactical_patterns')
        .select('formation_usage, playing_style_usage, recurring_issues, attack_areas_avg, our_attack_areas_avg, opponent_attack_areas_avg, conceded_goal_zones_avg, recovery_zones_avg')
        .eq('user_id', userId).maybeSingle())
      const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
      const coachFeedback = await list(await client.from('user_tactical_feedback')
        .select('insights, formation_played, opponent_name, outcome, created_at')
        .eq('user_id', userId).gte('created_at', since)
        .order('created_at', { ascending: false }).limit(5))
      const userProfile = await optional(await client.from('user_profiles')
        .select('first_name, connection_quality, input_delay, pass_level, ai_weak_point, ai_learn_goals, platform')
        .eq('user_id', userId).maybeSingle())
      const gameAnalysis = await optional(await client.from('user_game_analysis')
        .select('stats').eq('user_id', userId).maybeSingle())

      return {
        opponentFormation,
        roster,
        stylesLookup,
        clientFormation,
        formationVariants,
        tacticalSettings,
        activeCoach,
        matchHistory,
        historyOpponentFormations,
        tacticalPatterns,
        coachFeedback,
        userProfile,
        gameAnalysis: gameAnalysis?.stats || null
      }
    },

    async persistCorrection({ token, userId, opponentFormationId, formation, extractedData, now }) {
      const client = writeProvider.forUser(token)
      const result = await client.from('opponent_formations').update({
        formation_name: formation,
        extracted_data: extractedData,
        updated_at: now.toISOString()
      }).eq('id', opponentFormationId).eq('user_id', userId)
      if (result.error) throw databaseError(result.error, 'Could not persist corrected formation')
    }
  }
}
