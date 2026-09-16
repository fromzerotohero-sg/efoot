import type { HttpError } from '../../types.js'
import type { Database, Json } from '../../types/database.js'
import {
  calculateDataCompleteness,
  calculateMissingSections,
  calculateSectionsPresent,
  type MatchDataCompleteness,
  type MatchSectionName,
  type MatchSectionSource
} from './match.js'

export type MatchRow = Database['public']['Tables']['matches']['Row']
export type MatchInsert = Database['public']['Tables']['matches']['Insert']
export type MatchUpdate = Database['public']['Tables']['matches']['Update']

// Widened to plain `string` on purpose: with a non-literal select the Supabase
// client returns the full row type instead of the type-level string parser.
export const MATCH_SELECT: string = `
  id, user_id, match_date, opponent_name, client_team_name, result, is_home,
  formation_played, playing_style_played, team_strength, opponent_formation_id,
  player_ratings, team_stats, attack_areas, ball_recovery_zones, goals_events,
  formation_discrepancies, extracted_data, ai_summary, photos_uploaded,
  missing_photos, data_completeness, credits_used, recommended_formation_used,
  created_at, updated_at
`

export const MATCH_SUMMARY_SELECT: string = `
  id, match_date, opponent_name, result, photos_uploaded, missing_photos,
  data_completeness, player_ratings, team_stats, attack_areas,
  ball_recovery_zones, formation_played, playing_style_played, team_strength
`

export const MATCH_SECTIONS: readonly string[] = Object.freeze([
  'player_ratings',
  'team_stats',
  'attack_areas',
  'ball_recovery_zones',
  'formation_style',
  'ai_summary'
])

export function domainError(message: string, statusCode = 500, extra: Record<string, unknown> = {}): HttpError {
  const error = new Error(message) as HttpError
  error.statusCode = statusCode
  Object.assign(error, extra)
  return error
}

export function toMatchInt(value: unknown): number | null {
  if (value == null) return null
  const number = Number(value)
  return Number.isFinite(number) ? Math.trunc(number) : null
}

export function toMatchText(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null
}

function objectOrNull(value: unknown): Json | null {
  return value && typeof value === 'object' && !Array.isArray(value) &&
    Object.keys(value).length ? (value as Json) : null
}

function arrayOrNull(value: unknown): Json | null {
  return Array.isArray(value) && value.length ? (value as Json) : null
}

export interface MatchSummarySource extends MatchSectionSource {
  id?: unknown
  match_date?: unknown
  opponent_name?: unknown
  result?: unknown
}

export interface MatchSummary {
  id: unknown
  match_date: unknown
  opponent_name: unknown
  result: unknown
  photos_uploaded: number
  missing_photos: MatchSectionName[] | null
  data_completeness: MatchDataCompleteness
}

export function normalizeMatchSummary(match: MatchSummarySource = {}): MatchSummary {
  const missing = calculateMissingSections(match)
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

export function validateMatchId(matchId: unknown): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    String(matchId || '')
  )
}

// Raw POST body for /v1/matches: user-controlled JSON, so most values are
// unknown until the toMatchInt/toMatchText normalizers run.
export interface MatchSaveInput extends MatchSectionSource {
  team_stats?: (Record<string, unknown> & { result?: unknown }) | null
  match_date?: string | number
  opponent_name?: unknown
  client_team_name?: unknown
  result?: unknown
  is_home?: unknown
  opponent_formation_id?: unknown
  goals_events?: unknown
  formation_discrepancies?: unknown
  extracted_data?: unknown
  recommended_formation_used?: unknown
  [key: string]: unknown
}

export function validateMatchForSave(matchData: unknown): asserts matchData is MatchSaveInput {
  if (!matchData || typeof matchData !== 'object' || Array.isArray(matchData)) {
    throw domainError('matchData is required', 400)
  }
  const candidate = matchData as MatchSaveInput
  if (JSON.stringify(candidate).length > 5 * 1024 * 1024) {
    throw domainError('Match data too large (max 5MB)', 400)
  }
  if (candidate.is_home !== undefined && typeof candidate.is_home !== 'boolean') {
    throw domainError('is_home must be a boolean', 400)
  }
  if (calculateSectionsPresent(candidate) === 0) {
    throw domainError('At least one section must have data', 400)
  }
  for (const field of [
    'opponent_name',
    'result',
    'formation_played',
    'playing_style_played'
  ]) {
    const text = toMatchText(candidate[field])
    if (text && text.length > 255) {
      throw domainError(`${field} exceeds maximum length (255 characters)`, 400)
    }
  }
}

// Precise variant of the matches Insert row: the metadata fields are always
// computed by buildMatchInsert, never left to database defaults.
export type MatchInsertPayload = Omit<
  MatchInsert,
  'ai_summary' | 'photos_uploaded' | 'missing_photos' | 'data_completeness' | 'credits_used'
> & {
  ai_summary: null
  photos_uploaded: number
  missing_photos: MatchSectionName[] | null
  data_completeness: MatchDataCompleteness
  credits_used: number
}

export interface MatchInsertOptions {
  clientTeamName?: unknown
  now?: Date
}

export function buildMatchInsert(userId: string, input: unknown, options: MatchInsertOptions = {}): MatchInsertPayload {
  validateMatchForSave(input)
  const matchData = structuredClone(input)
  let result = toMatchText(matchData.result)
  if (!result && matchData.team_stats?.result) result = toMatchText(matchData.team_stats.result)
  if (matchData.team_stats?.result) delete matchData.team_stats.result
  const missing = calculateMissingSections(matchData)
  const photos = calculateSectionsPresent(matchData)
  return {
    user_id: userId,
    match_date: matchData.match_date
      ? new Date(matchData.match_date).toISOString()
      : (options.now || new Date()).toISOString(),
    opponent_name: toMatchText(matchData.opponent_name),
    client_team_name: toMatchText(options.clientTeamName) ||
      toMatchText(matchData.client_team_name),
    result,
    is_home: typeof matchData.is_home === 'boolean' ? matchData.is_home : true,
    formation_played: toMatchText(matchData.formation_played),
    playing_style_played: toMatchText(matchData.playing_style_played),
    team_strength: toMatchInt(matchData.team_strength),
    opponent_formation_id: (matchData.opponent_formation_id || null) as string | null,
    player_ratings: objectOrNull(matchData.player_ratings),
    team_stats: objectOrNull(matchData.team_stats),
    attack_areas: objectOrNull(matchData.attack_areas),
    ball_recovery_zones: arrayOrNull(matchData.ball_recovery_zones),
    goals_events: arrayOrNull(matchData.goals_events),
    formation_discrepancies: arrayOrNull(matchData.formation_discrepancies),
    extracted_data: (matchData.extracted_data || {}) as Json,
    ai_summary: null,
    photos_uploaded: photos,
    missing_photos: missing.length ? missing : null,
    data_completeness: calculateDataCompleteness(matchData),
    credits_used: photos,
    recommended_formation_used: matchData.recommended_formation_used === true
  }
}

// Section payloads arrive in heterogeneous shapes (cliente/avversario maps,
// flat stats, zone arrays), so the merge works on loose records.
type LooseMatchData = Record<string, any>

export function mergeMatchData(existing: LooseMatchData | null | undefined, data: unknown, section: string): LooseMatchData {
  const next: LooseMatchData = structuredClone(existing || {})
  const incoming = (data && typeof data === 'object' ? structuredClone(data) : data) as any
  if (section === 'player_ratings' && incoming && typeof incoming === 'object') {
    next.player_ratings = incoming.cliente || incoming.avversario
      ? {
          cliente: { ...(next.player_ratings?.cliente || {}), ...(incoming.cliente || {}) },
          avversario: { ...(next.player_ratings?.avversario || {}), ...(incoming.avversario || {}) }
        }
      : { ...(next.player_ratings || {}), ...incoming }
  } else if (section === 'team_stats') {
    const stats = { ...(incoming || {}) }
    delete stats.result
    next.team_stats = { ...(next.team_stats || {}), ...stats }
  } else if (section === 'attack_areas') {
    next.attack_areas = { ...(next.attack_areas || {}), ...(incoming || {}) }
  } else if (section === 'ball_recovery_zones') {
    const zones = Array.isArray(incoming)
      ? incoming
      : Array.isArray(incoming?.ball_recovery_zones) ? incoming.ball_recovery_zones : []
    next.ball_recovery_zones = [...(next.ball_recovery_zones || []), ...zones]
  } else if (section === 'formation_style') {
    if (incoming?.formation_played) next.formation_played = toMatchText(incoming.formation_played)
    if (incoming?.playing_style_played) next.playing_style_played = toMatchText(incoming.playing_style_played)
    if (incoming?.team_strength !== undefined) next.team_strength = toMatchInt(incoming.team_strength)
  }
  next.extracted_data = {
    ...(next.extracted_data || {}),
    ...(incoming?.extracted_data || {}),
    [section]: incoming?.extracted_data?.[section] || incoming
  }
  return next
}

export function serializeAiSummary(value: unknown): string | null {
  if (!value) return null
  if (typeof value !== 'string') return JSON.stringify(value)
  try {
    JSON.parse(value)
    return value
  } catch {
    return JSON.stringify({
      analysis: { match_overview: value },
      confidence: 0,
      data_quality: 'low',
      warnings: ['Riassunto convertito da formato testo semplice']
    })
  }
}

export interface MatchSectionPatchInput {
  section: string
  data: any
  result?: unknown
  clientTeamName?: unknown
  now?: Date
}

export function buildMatchSectionPatch(
  existing: MatchRow,
  { section, data, result, clientTeamName, now = new Date() }: MatchSectionPatchInput
): MatchUpdate {
  if (!MATCH_SECTIONS.includes(section)) throw domainError('Invalid section', 400)
  if (section === 'ai_summary') {
    return { ai_summary: serializeAiSummary(data?.ai_summary), updated_at: now.toISOString() }
  }
  const merged = mergeMatchData(existing, data, section)
  let finalResult = existing.result
  if (section === 'team_stats') {
    finalResult = toMatchText(result) || toMatchText(data?.result) || existing.result
  }
  const missing = calculateMissingSections(merged)
  return {
    result: finalResult,
    client_team_name: toMatchText(clientTeamName) || existing.client_team_name || null,
    player_ratings: merged.player_ratings,
    team_stats: objectOrNull(merged.team_stats),
    attack_areas: objectOrNull(merged.attack_areas),
    ball_recovery_zones: arrayOrNull(merged.ball_recovery_zones),
    formation_played: toMatchText(merged.formation_played) || existing.formation_played,
    playing_style_played: toMatchText(merged.playing_style_played) || existing.playing_style_played,
    team_strength: toMatchInt(merged.team_strength) ?? existing.team_strength,
    extracted_data: merged.extracted_data || existing.extracted_data || {},
    ai_summary: existing.ai_summary || null,
    photos_uploaded: 5 - missing.length,
    missing_photos: missing.length ? missing : null,
    data_completeness: missing.length ? 'partial' : 'complete',
    updated_at: now.toISOString(),
    recommended_formation_used:
      data?.recommended_formation_used === true || existing.recommended_formation_used === true
  }
}
