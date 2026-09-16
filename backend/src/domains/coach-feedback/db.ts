import type { ReadOnlySupabaseProvider, UserSupabaseWriteProvider } from '../../readOnlySupabase.js'
import type { Database, Json } from '../../types/database.js'
import type { HttpError } from '../../types.js'

export type UserProfileRow = Database['public']['Tables']['user_profiles']['Row']
export type MatchRow = Database['public']['Tables']['matches']['Row']

export type ChatProfile = Pick<
  UserProfileRow,
  | 'first_name' | 'ai_name' | 'current_division' | 'hours_per_week' | 'platform'
  | 'connection_quality' | 'pass_level' | 'smart_assist' | 'input_delay'
  | 'ai_weak_point' | 'ai_learn_goals' | 'ai_notes' | 'slow_opponent_connection_issues'
  | 'favourite_player_name'
>

export type ChatMatch = Pick<
  MatchRow,
  'id' | 'opponent_name' | 'result' | 'formation_played' | 'playing_style_played' | 'match_date' | 'is_home'
>

export type OwnedMatch = Pick<
  MatchRow,
  'id' | 'opponent_name' | 'result' | 'formation_played' | 'playing_style_played'
>

interface DatabaseError extends HttpError {
  type: 'database_error'
}

function databaseError(error: { message?: string } | null | undefined, fallback: string): DatabaseError {
  const failure = new Error(error?.message || fallback) as DatabaseError
  failure.statusCode = 502
  failure.type = 'database_error'
  return failure
}

function assertResult<T>(result: { data: T | null; error: { message?: string } | null } | null | undefined, fallback: string): T | null {
  if (result?.error) throw databaseError(result.error, fallback)
  return result?.data ?? null
}

export function createCoachFeedbackDb({
  readProvider,
  writeProvider,
  now = () => new Date()
}: {
  readProvider: ReadOnlySupabaseProvider
  writeProvider: UserSupabaseWriteProvider
  now?: () => Date
}) {
  if (!readProvider || !writeProvider) {
    throw new TypeError('readProvider and writeProvider are required')
  }

  return {
    async loadChatContext({ token, userId }: { token: string; userId: string }) {
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
        profile: assertResult(profileResult, 'Unable to load user profile') as ChatProfile | null,
        match: assertResult(matchResult, 'Unable to load latest match') as ChatMatch | null
      }
    },

    async loadOwnedMatch({ token, userId, matchId }: { token: string; userId: string; matchId?: string | null }) {
      if (!matchId) return null
      const result = await readProvider.forUser(token).from('matches')
        .select('id, opponent_name, result, formation_played, playing_style_played')
        .eq('id', matchId)
        .eq('user_id', userId)
        .maybeSingle()
      return assertResult(result, 'Unable to load match') as OwnedMatch | null
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
    }: {
      token: string
      userId: string
      match: OwnedMatch | ChatMatch | null
      sessionType: string
      profileUpdates: Record<string, unknown>
      profileFieldsUpdated: string[]
      insights: unknown
      summary: string
      outcome: string | null
    }) {
      const client = writeProvider.forUser(token)
      if (profileFieldsUpdated.length > 0) {
        const update = { ...profileUpdates }
        if (Array.isArray(update.common_problems)) {
          try {
            const current = await readProvider.forUser(token)
              .from('user_profiles')
              .select('common_problems')
              .eq('user_id', userId)
              .maybeSingle()
            if (!current.error) {
              const previous = Array.isArray(current.data?.common_problems)
                ? current.data.common_problems
                : []
              update.common_problems = [...new Set([...previous, ...update.common_problems])]
                .slice(0, 10)
            } else {
              delete update.common_problems
            }
          } catch {
            // Do not risk replacing existing declared problems if the read is unavailable.
            delete update.common_problems
          }
        }
        const result = await client.from('user_profiles')
          .update({
            ...update,
            updated_at: now().toISOString()
          } as Database['public']['Tables']['user_profiles']['Update'])
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
        insights: insights as Json,
        profile_fields_updated: profileFieldsUpdated as unknown as Json
      })
      assertResult(result, 'Unable to save coach feedback')
    }
  }
}
