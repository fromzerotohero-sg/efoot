import { createDisabledKnowledgeRefreshSideEffect } from '../memory/knowledgeRefresh.js'
import type { ReadOnlySupabaseProvider, UserSupabaseWriteProvider } from '../../readOnlySupabase.js'
import type { HttpError } from '../../types.js'
import type { Database, Json } from '../../types/database.js'

export type CoachRow = Database['public']['Tables']['coaches']['Row']
export type CoachInsert = Database['public']['Tables']['coaches']['Insert']

export const COACH_PLAYSTYLES = [
  'possesso_palla',
  'contropiede_veloce',
  'contrattacco',
  'vie_laterali',
  'passaggio_lungo',
  'pressing_totale'
] as const

export type CoachPlaystyle = (typeof COACH_PLAYSTYLES)[number]

export const MAX_COACH_TEXT_LENGTH = 255

const PLAYSTYLE_ALIASES: Record<string, CoachPlaystyle> = {
  overload: 'pressing_totale',
  sovraccarico: 'pressing_totale',
  superioridad: 'pressing_totale',
  pressingtotale: 'pressing_totale',
  'pressing totale': 'pressing_totale'
}

// Widened select so Supabase does not infer a narrow row from the string literal.
export const COACH_LIST_SELECT: string =
  'id, user_id, coach_name, team, extracted_data, is_active, created_at, updated_at, playing_style_competence, connection, stat_boosters, training_affinity_description'

export interface CoachStatBooster {
  stat_name: string
  bonus: number
}

// Incoming coach payload from vision / client; shape is validated at runtime.
export interface CoachInput {
  coach_name?: unknown
  age?: unknown
  nationality?: unknown
  team?: unknown
  category?: unknown
  pack_type?: unknown
  playing_style_competence?: unknown
  training_affinity_description?: unknown
  stat_boosters?: unknown
  connection?: unknown
  photo_slots?: unknown
  [key: string]: unknown
}

export interface KnowledgeRefreshSideEffect {
  schedule(input: { userId: string; source?: string }): unknown
}

type WriteProviderWithOptionalRefresh = UserSupabaseWriteProvider & {
  knowledgeRefresh?: KnowledgeRefreshSideEffect
}

export function toCoachInt(value: unknown): number | null {
  if (value === null || value === undefined) return null
  const number = Number(value)
  return Number.isFinite(number) ? Math.trunc(number) : null
}

export function toCoachText(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length ? value.trim() : null
}

export function normalizeCoach(coach: unknown): CoachInput | unknown {
  if (!coach || typeof coach !== 'object') return coach

  const normalized = { ...(coach as CoachInput) }

  if (normalized.age !== null && normalized.age !== undefined) {
    normalized.age = toCoachInt(normalized.age)
  }

  if (
    normalized.playing_style_competence &&
    typeof normalized.playing_style_competence === 'object'
  ) {
    const competence = normalized.playing_style_competence as Record<string, unknown>
    const normalizedCompetence: Record<string, number | null> = {}

    COACH_PLAYSTYLES.forEach((style) => {
      if (competence[style] !== null && competence[style] !== undefined) {
        normalizedCompetence[style] = toCoachInt(competence[style])
      }
    })
    Object.entries(competence).forEach(([rawKey, value]) => {
      const mapped = PLAYSTYLE_ALIASES[String(rawKey || '').toLowerCase().trim()]
      if (mapped && normalizedCompetence[mapped] == null && value != null) {
        normalizedCompetence[mapped] = toCoachInt(value)
      }
    })

    normalized.playing_style_competence = normalizedCompetence
  }

  if (Array.isArray(normalized.stat_boosters)) {
    normalized.stat_boosters = (normalized.stat_boosters as unknown[])
      .filter(
        (booster): booster is Record<string, unknown> =>
          Boolean(booster) &&
          typeof booster === 'object' &&
          Boolean((booster as Record<string, unknown>).stat_name) &&
          (booster as Record<string, unknown>).bonus !== undefined
      )
      .map((booster) => ({
        stat_name: String(booster.stat_name || ''),
        bonus: toCoachInt(booster.bonus) || 0
      }))
      .slice(0, 10)
  }

  return normalized
}

export function validateCoachForSave(coach: CoachInput | null | undefined): { valid: boolean; error: string | null } {
  if (!coach || !coach.coach_name) {
    return { valid: false, error: 'Coach data is required' }
  }

  for (const field of ['coach_name', 'team', 'nationality'] as const) {
    const text = toCoachText(coach[field])
    if (text && text.length > MAX_COACH_TEXT_LENGTH) {
      return {
        valid: false,
        error: `${field} exceeds maximum length (${MAX_COACH_TEXT_LENGTH} characters)`
      }
    }
  }

  return { valid: true, error: null }
}

export function buildCoachCreateData(userId: string, coach: CoachInput): CoachInsert {
  return {
    user_id: userId,
    coach_name: toCoachText(coach.coach_name) as string,
    age: toCoachInt(coach.age),
    nationality: toCoachText(coach.nationality),
    team: toCoachText(coach.team),
    category: toCoachText(coach.category),
    pack_type: toCoachText(coach.pack_type),
    playing_style_competence:
      coach.playing_style_competence &&
      typeof coach.playing_style_competence === 'object'
        ? coach.playing_style_competence as Json
        : {},
    training_affinity_description: toCoachText(
      coach.training_affinity_description
    ),
    stat_boosters: Array.isArray(coach.stat_boosters) ? coach.stat_boosters as Json : [],
    connection:
      coach.connection && typeof coach.connection === 'object'
        ? coach.connection as Json
        : null,
    photo_slots:
      coach.photo_slots && typeof coach.photo_slots === 'object'
        ? coach.photo_slots as Json
        : {},
    extracted_data: coach as Json,
    is_active: false
  }
}

export function validateCoachId(coachId: unknown): coachId is string {
  return typeof coachId === 'string' && coachId.length > 0
}

function domainError(message: string, statusCode = 500): HttpError {
  const error = new Error(message) as HttpError
  error.statusCode = statusCode
  return error
}

export function createCoachReadService(readOnlyProvider: ReadOnlySupabaseProvider) {
  return {
    async list({ token, userId }: { token: string; userId: string }) {
      const client = readOnlyProvider.forUser(token)
      const result = await client
        .from('coaches')
        .select(COACH_LIST_SELECT)
        .eq('user_id', userId)
        .order('is_active', { ascending: false })
        .order('created_at', { ascending: false })
      if (result.error) throw domainError('Failed to fetch coaches')
      return (result.data as unknown as CoachRow[]) || []
    }
  }
}

export function createCoachWriteService(
  writeProvider: WriteProviderWithOptionalRefresh,
  options: { knowledgeRefresh?: KnowledgeRefreshSideEffect } = {}
) {
  const knowledgeRefresh =
    options.knowledgeRefresh ||
    writeProvider?.knowledgeRefresh ||
    createDisabledKnowledgeRefreshSideEffect()
  const refresh = (userId: string, token: string, source: string) => {
    try {
      knowledgeRefresh.schedule({ userId, token, source })
    } catch {
      // Non-blocking by contract.
    }
  }

  return {
    async save({ token, userId, coach }: { token: string; userId: string; coach: unknown }) {
      const normalized = normalizeCoach(coach) as CoachInput
      const validation = validateCoachForSave(normalized)
      if (!validation.valid) throw domainError(validation.error as string, 400)
      const client = writeProvider.forUser(token)
      const result = await client
        .from('coaches')
        .insert(buildCoachCreateData(userId, normalized))
        .select('id, user_id, coach_name')
        .single()
      if (result.error) {
        throw domainError(`Failed to create coach: ${result.error.message}`)
      }
      refresh(userId, token, 'coaches.save')
      return { success: true as const, coach_id: result.data.id, is_new: true as const }
    },

    async setActive({ token, userId, coachId }: { token: string; userId: string; coachId: unknown }) {
      if (!validateCoachId(coachId)) throw domainError('coach_id is required', 400)
      const client = writeProvider.forUser(token)
      const found = await client
        .from('coaches')
        .select('id, user_id')
        .eq('id', coachId)
        .eq('user_id', userId)
        .maybeSingle()
      if (found.error) throw domainError(found.error.message || 'Unable to verify coach')
      if (!found.data) throw domainError('Coach not found or access denied', 404)

      const deactivated = await client
        .from('coaches')
        .update({ is_active: false })
        .eq('user_id', userId)
        .neq('id', coachId)
      if (deactivated.error) {
        throw domainError(`Failed to deactivate other coaches: ${deactivated.error.message}`)
      }
      const activated = await client
        .from('coaches')
        .update({ is_active: true })
        .eq('id', coachId)
        .eq('user_id', userId)
      if (activated.error) {
        throw domainError(`Failed to activate coach: ${activated.error.message}`)
      }
      refresh(userId, token, 'coaches.set-active')
      return { success: true as const, coach_id: coachId }
    },

    async delete({ token, userId, coachId }: { token: string; userId: string; coachId: unknown }) {
      if (!validateCoachId(coachId)) throw domainError('Coach ID is required', 400)
      const client = writeProvider.forUser(token)
      const found = await client
        .from('coaches')
        .select('id')
        .eq('id', coachId)
        .eq('user_id', userId)
        .maybeSingle()
      if (found.error) throw domainError(found.error.message || 'Unable to verify coach')
      if (!found.data) throw domainError('Coach not found', 404)
      const result = await client
        .from('coaches')
        .delete()
        .eq('id', coachId)
        .eq('user_id', userId)
      if (result.error) throw domainError('Failed to delete coach')
      refresh(userId, token, 'coaches.delete')
      return { success: true as const }
    }
  }
}
