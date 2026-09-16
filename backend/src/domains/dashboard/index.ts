import type { FastifyInstance } from 'fastify'
import type { ReadOnlySupabaseProvider } from '../../readOnlySupabase.js'
import type { IdentityProvider } from '../../types.js'
import type { MatchSectionSource } from '../matches/match.js'
import type { MatchRow } from '../matches/payloads.js'

function hasObjectData(value: unknown): value is Record<string, unknown> {
  return value != null && typeof value === 'object' && !Array.isArray(value) && Object.keys(value as object).length > 0
}

export function getMissingMatchSections(match: MatchSectionSource = {}): string[] {
  const ratings = match.player_ratings
  const hasRatings = hasObjectData(ratings) && (
    hasObjectData(ratings.cliente) || hasObjectData(ratings.avversario) ||
    (!ratings.cliente && !ratings.avversario)
  )
  const missing: string[] = []
  if (!hasRatings) missing.push('player_ratings')
  if (!hasObjectData(match.team_stats)) missing.push('team_stats')
  if (!hasObjectData(match.attack_areas)) missing.push('attack_areas')
  if (!Array.isArray(match.ball_recovery_zones) || !match.ball_recovery_zones.length) missing.push('ball_recovery_zones')
  if (!match.formation_played && !match.playing_style_played && !match.team_strength) missing.push('formation_style')
  return missing
}

// Columns read by the dashboard matches query below.
export type DashboardMatchRow = Pick<
  MatchRow,
  | 'id' | 'match_date' | 'opponent_name' | 'result' | 'photos_uploaded'
  | 'missing_photos' | 'data_completeness' | 'player_ratings' | 'team_stats'
  | 'attack_areas' | 'ball_recovery_zones' | 'formation_played'
  | 'playing_style_played' | 'team_strength'
>

export interface DashboardMatchSummary {
  id: string
  match_date: string | null
  opponent_name: string | null
  result: string | null
  photos_uploaded: number
  missing_photos: string[] | null
  data_completeness: 'partial' | 'complete'
}

export function normalizeMatchSummary(match: DashboardMatchRow): DashboardMatchSummary {
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

// Structural supertype of the postgrest-js response union.
interface QueryOutcome<T> {
  data: T | null
  error: { message: string } | null
}

async function queryData<T>(query: PromiseLike<QueryOutcome<T>>, fallback: T): Promise<T> {
  const { data, error } = await query
  if (error) throw Object.assign(new Error(error.message), { statusCode: 502 })
  return data ?? fallback
}

export function createDashboardDb(readProvider: ReadOnlySupabaseProvider) {
  return {
    async readDashboard({ token, userId }: { token: string; userId: string }) {
      const client = readProvider.forUser(token)
      const [layout, formationVariants, players, matches, patterns, coaches, profile, gameAnalysis] = await Promise.all([
        queryData(client.from('formation_layout').select('formation, slot_positions').eq('user_id', userId).maybeSingle(), null),
        queryData(client.from('formation_variants').select('phase, formation, slot_positions, is_active')
          .eq('user_id', userId).in('phase', ['attack', 'defense']).eq('is_active', true), []),
        queryData(client.from('players').select('id, player_name, overall_rating, position, slot_index')
          .eq('user_id', userId).order('overall_rating', { ascending: false }), []),
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

export type DashboardDb = ReturnType<typeof createDashboardDb>
export type DashboardData = Awaited<ReturnType<DashboardDb['readDashboard']>>

export function createDashboardService(db: DashboardDb) {
  return {
    async read({ userId, token }: { userId: string; token: string }) {
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

export type DashboardService = ReturnType<typeof createDashboardService>

export function registerDashboardRoutes(
  app: FastifyInstance,
  { identity, service }: { identity: IdentityProvider; service: DashboardService }
): void {
  app.get('/v1/dashboard/read', async (request, reply) => {
    try {
      const session = await identity.resolveUser(request)
      return reply.send(await service.read({ userId: session.userId, token: session.token }))
    } catch (error) {
      const err = error as { statusCode?: number; message?: string }
      return reply.code(err.statusCode || 500).send({ error: err.message || 'Internal server error' })
    }
  })
}
