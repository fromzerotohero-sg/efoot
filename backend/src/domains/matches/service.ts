import type { BackendSupabaseClient, UserSupabaseWriteProvider } from '../../readOnlySupabase.js'
import type { Database, Json } from '../../types/database.js'
import {
  MATCH_SELECT,
  buildMatchInsert,
  domainError,
  type MatchRow
} from './payloads.js'
import type { MatchDataCompleteness, MatchSectionName } from './match.js'

type OpponentFormationRow = Database['public']['Tables']['opponent_formations']['Row']
type OpponentFormationInsert = Database['public']['Tables']['opponent_formations']['Insert']

async function resolveClientTeamName(client: BackendSupabaseClient, userId: string): Promise<string | null> {
  const profile = await client
    .from('user_profiles')
    .select('team_name')
    .eq('user_id', userId)
    .maybeSingle()
  if (profile.data?.team_name) return profile.data.team_name
  const coach = await client
    .from('coaches')
    .select('team')
    .eq('user_id', userId)
    .eq('is_active', true)
    .maybeSingle()
  return coach.data?.team || null
}

export interface SaveMatchParams {
  token: string
  userId: string
  matchData: unknown
  now?: Date
}

export interface MatchSaveResult {
  success: true
  match: MatchRow
  photos_uploaded: number
  missing_photos: MatchSectionName[]
  data_completeness: MatchDataCompleteness
  credits_used: number
}

// Raw POST body for /v1/matches/opponent-formations; extracted_data is the
// vision output and keeps its dynamic shape (validated at runtime below).
export interface OpponentFormationInput {
  extracted_data?: Record<string, any>
  formation_name?: unknown
  playing_style?: unknown
  is_pre_match?: unknown
  formation_image?: unknown
}

export interface SaveOpponentFormationParams {
  token: string
  userId: string
  formation: OpponentFormationInput
  now?: Date
}

export type OpponentFormationSummary = Pick<
  OpponentFormationRow,
  'id' | 'formation_name' | 'playing_style' | 'extracted_data' | 'is_pre_match'
>

export interface OpponentFormationSaveResult {
  success: true
  formation: OpponentFormationSummary
}

export interface MatchWriteService {
  save(params: SaveMatchParams): Promise<MatchSaveResult>
  saveOpponentFormation(params: SaveOpponentFormationParams): Promise<OpponentFormationSaveResult>
}

export interface MatchWriteOptions {
  afterSave?: (input: { token: string; userId: string; match: MatchRow }) => unknown
  logger?: { warn?: (message: string, error?: unknown) => void }
}

export function createMatchWriteService(
  writeProvider: UserSupabaseWriteProvider,
  options: MatchWriteOptions = {}
): MatchWriteService {
  const afterSave = typeof options.afterSave === 'function' ? options.afterSave : null
  return {
    async save({ token, userId, matchData, now }) {
      const client = writeProvider.forUser(token)
      const clientTeamName = await resolveClientTeamName(client, userId)
      const insert = buildMatchInsert(userId, matchData, { clientTeamName, now })
      const result = await client
        .from('matches')
        .insert(insert)
        .select(MATCH_SELECT)
        .single()
      if (result.error) throw domainError(result.error.message || 'Error saving match')
      // MATCH_SELECT is a widened string so the client cannot infer the row shape.
      const match = result.data as unknown as MatchRow | null
      if (!match) throw domainError('Error saving match')
      if (afterSave) {
        queueMicrotask(() => {
          Promise.resolve(afterSave({ token, userId, match }))
            .catch((error) => options.logger?.warn?.(
              '[matches] post-save refresh failed (non-blocking):',
              error?.message || error
            ))
        })
      }
      return {
        success: true,
        match,
        photos_uploaded: insert.photos_uploaded,
        missing_photos: insert.missing_photos || [],
        data_completeness: insert.data_completeness,
        credits_used: insert.credits_used
      }
    },

    async saveOpponentFormation({ token, userId, formation, now }) {
      if (!formation?.extracted_data || typeof formation.extracted_data !== 'object') {
        throw domainError('extracted_data is required', 400)
      }
      const client = writeProvider.forUser(token)
      const extracted = formation.extracted_data
      const payload: OpponentFormationInsert = {
        user_id: userId,
        formation_name: (formation.formation_name || extracted.formation || null) as string | null,
        playing_style: (formation.playing_style || extracted.playing_style || null) as string | null,
        tactical_style: extracted.tactical_style || null,
        overall_strength: extracted.overall_strength || null,
        players: Array.isArray(extracted.players) ? extracted.players : [],
        extracted_data: extracted as Json,
        is_pre_match: formation.is_pre_match === true,
        formation_image: (formation.formation_image || null) as string | null,
        match_date: formation.is_pre_match ? (now || new Date()).toISOString() : null,
        updated_at: (now || new Date()).toISOString()
      }
      const saved = await client
        .from('opponent_formations')
        .insert(payload)
        .select('id, formation_name, playing_style, extracted_data, is_pre_match')
        .single()
      if (saved.error) {
        throw domainError(`Failed to save opponent formation: ${saved.error.message}`)
      }
      return { success: true, formation: saved.data }
    }
  }
}
