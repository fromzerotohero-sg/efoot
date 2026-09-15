import { buildDiagnostic } from './builder.js'
import { domainError } from '../matches/payloads.js'

export const DIAGNOSTIC_MATCH_LIMIT = 20
export const DIAGNOSTIC_PLAYER_LIMIT = 50

export function createDiagnosticReadService(readOnlyProvider) {
  return {
    async loadSourceData({ token, userId, now = new Date() }) {
      const client = readOnlyProvider.forUser(token)
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString()
      const [
        profile,
        formation,
        variants,
        players,
        styles,
        matches,
        tactical,
        coach,
        patterns,
        gameAnalysis,
        feedback
      ] = await Promise.all([
        client.from('user_profiles').select('first_name, last_name, team_name, common_problems, ai_name, current_division, hours_per_week, connection_quality, slow_opponent_connection_issues, input_delay, pass_level, smart_assist, platform, favourite_player_name, ai_weak_point, ai_learn_goals, ai_notes').eq('user_id', userId).maybeSingle(),
        client.from('formation_layout').select('formation, slot_positions').eq('user_id', userId).maybeSingle(),
        client.from('formation_variants').select('id, phase, formation, slot_positions, is_active').eq('user_id', userId).in('phase', ['attack', 'defense']).eq('is_active', true),
        client.from('players').select('id, player_name, position, overall_rating, playing_style_id, role, slot_index, card_type, skills, com_skills, form, base_stats, original_positions, metadata, development_points, extracted_data').eq('user_id', userId).order('slot_index', { ascending: true, nullsFirst: false }).limit(DIAGNOSTIC_PLAYER_LIMIT),
        client.from('playing_styles').select('id, name'),
        client.from('matches').select('opponent_name, result, formation_played, playing_style_played, match_date, opponent_formation_id, player_ratings, attack_areas, team_stats, is_home').eq('user_id', userId).order('match_date', { ascending: false }).limit(DIAGNOSTIC_MATCH_LIMIT),
        client.from('team_tactical_settings').select('team_playing_style, individual_instructions').eq('user_id', userId).maybeSingle(),
        client.from('coaches').select('coach_name, playing_style_competence, connection, stat_boosters, extracted_data, metadata').eq('user_id', userId).eq('is_active', true).maybeSingle(),
        client.from('team_tactical_patterns').select('formation_usage, playing_style_usage, recurring_issues, attack_areas_avg, our_attack_areas_avg, opponent_attack_areas_avg, conceded_goal_zones_avg, recovery_zones_avg').eq('user_id', userId).maybeSingle(),
        client.from('user_game_analysis').select('stats, captured_at').eq('user_id', userId).maybeSingle(),
        client.from('user_tactical_feedback').select('insights, conversation_summary, formation_played, opponent_name, outcome, session_type, created_at').eq('user_id', userId).gte('created_at', thirtyDaysAgo).order('created_at', { ascending: false }).limit(5)
      ])
      const failed = [profile, formation, variants, players, styles, matches, tactical, coach, patterns, gameAnalysis, feedback]
        .find((result) => result.error)
      if (failed) throw domainError(failed.error.message || 'Unable to load diagnostic data')
      const matchRows = matches.data || []
      const opponentIds = [...new Set(matchRows
        .map((match) => match.opponent_formation_id)
        .filter(Boolean))]
      let opponentRows = []
      if (opponentIds.length) {
        const result = await client
          .from('opponent_formations')
          .select('id, formation_name, playing_style')
          .in('id', opponentIds)
        if (result.error) throw domainError(result.error.message || 'Unable to load opponent formations')
        opponentRows = result.data || []
      }
      const stylesLookup = Object.fromEntries((styles.data || [])
        .map((style) => [style.id, style.name || '']))
      const oppFormationsMap = Object.fromEntries(opponentRows
        .map((row) => [row.id, row]))
      const instructions = tactical.data?.individual_instructions
      return {
        profile: profile.data || {},
        formation: formation.data?.formation || null,
        formationLayout: formation.data || null,
        variantRows: variants.data || [],
        roster: players.data || [],
        stylesLookup,
        matches: matchRows,
        oppFormationsMap,
        teamStyle: tactical.data?.team_playing_style?.trim() || null,
        numInstructions: Array.isArray(instructions)
          ? instructions.length
          : instructions && typeof instructions === 'object'
            ? Object.keys(instructions).length
            : 0,
        individualInstructions: instructions || {},
        coachRow: coach.data || null,
        patternsRow: patterns.data || {},
        gameAnalysisRow: gameAnalysis.data || null,
        feedbackRows: feedback.data || []
      }
    }
  }
}

export function createDiagnosticWriteService(writeProvider, diagnosticReads) {
  return {
    async refresh({ token, userId, lang = 'it', now = new Date() }) {
      const source = await diagnosticReads.loadSourceData({ token, userId, now })
      const content = buildDiagnostic(lang, source).trim()
      if (!content) throw domainError('Could not build diagnostic')
      const client = writeProvider.forUser(token)
      const generatedAt = now.toISOString()
      const saved = await client
        .from('user_diagnostic_cache')
        .upsert(
          { user_id: userId, content, generated_at: generatedAt, lang },
          { onConflict: 'user_id' }
        )
      if (saved.error) throw domainError(saved.error.message || 'Error saving diagnostic')
      return { success: true, generated_at: generatedAt }
    }
  }
}

export function registerDiagnosticRoutes(app, { identity, diagnosticWrites }) {
  app.post('/v1/diagnostics/refresh', async (request, reply) => {
    const requested = String(request.headers?.['accept-language'] || '').toLowerCase()
    const lang = requested.startsWith('es') ? 'es' : requested.startsWith('en') ? 'en' : 'it'
    reply.header('Content-Language', lang)
    try {
      const session = await identity.resolveUser(request)
      return await diagnosticWrites.refresh({
        token: session.token,
        userId: session.userId,
        lang
      })
    } catch (error) {
      return reply.code(error.statusCode || 500).send({
        error: error.message || 'Internal error'
      })
    }
  })
}
