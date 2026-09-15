import { createDisabledKnowledgeRefreshSideEffect } from '../memory/knowledgeRefresh.js'

export const COACH_PLAYSTYLES = [
  'possesso_palla',
  'contropiede_veloce',
  'contrattacco',
  'vie_laterali',
  'passaggio_lungo',
  'pressing_totale'
]

export const MAX_COACH_TEXT_LENGTH = 255

const PLAYSTYLE_ALIASES = {
  overload: 'pressing_totale',
  sovraccarico: 'pressing_totale',
  superioridad: 'pressing_totale',
  pressingtotale: 'pressing_totale',
  'pressing totale': 'pressing_totale'
}

export function toCoachInt(value) {
  if (value === null || value === undefined) return null
  const number = Number(value)
  return Number.isFinite(number) ? Math.trunc(number) : null
}

export function toCoachText(value) {
  return typeof value === 'string' && value.trim().length ? value.trim() : null
}

export function normalizeCoach(coach) {
  if (!coach || typeof coach !== 'object') return coach

  const normalized = { ...coach }

  if (normalized.age !== null && normalized.age !== undefined) {
    normalized.age = toCoachInt(normalized.age)
  }

  if (
    normalized.playing_style_competence &&
    typeof normalized.playing_style_competence === 'object'
  ) {
    const competence = normalized.playing_style_competence
    const normalizedCompetence = {}

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
    normalized.stat_boosters = normalized.stat_boosters
      .filter(
        (booster) =>
          booster &&
          typeof booster === 'object' &&
          booster.stat_name &&
          booster.bonus !== undefined
      )
      .map((booster) => ({
        stat_name: String(booster.stat_name || ''),
        bonus: toCoachInt(booster.bonus) || 0
      }))
      .slice(0, 10)
  }

  return normalized
}

export function validateCoachForSave(coach) {
  if (!coach || !coach.coach_name) {
    return { valid: false, error: 'Coach data is required' }
  }

  for (const field of ['coach_name', 'team', 'nationality']) {
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

export function buildCoachCreateData(userId, coach) {
  return {
    user_id: userId,
    coach_name: toCoachText(coach.coach_name),
    age: toCoachInt(coach.age),
    nationality: toCoachText(coach.nationality),
    team: toCoachText(coach.team),
    category: toCoachText(coach.category),
    pack_type: toCoachText(coach.pack_type),
    playing_style_competence:
      coach.playing_style_competence &&
      typeof coach.playing_style_competence === 'object'
        ? coach.playing_style_competence
        : {},
    training_affinity_description: toCoachText(
      coach.training_affinity_description
    ),
    stat_boosters: Array.isArray(coach.stat_boosters) ? coach.stat_boosters : [],
    connection:
      coach.connection && typeof coach.connection === 'object'
        ? coach.connection
        : null,
    photo_slots:
      coach.photo_slots && typeof coach.photo_slots === 'object'
        ? coach.photo_slots
        : {},
    extracted_data: coach,
    is_active: false
  }
}

export function validateCoachId(coachId) {
  return typeof coachId === 'string' && coachId.length > 0
}

function domainError(message, statusCode = 500) {
  const error = new Error(message)
  error.statusCode = statusCode
  return error
}

export function createCoachReadService(readOnlyProvider) {
  return {
    async list({ token, userId }) {
      const client = readOnlyProvider.forUser(token)
      const result = await client
        .from('coaches')
        .select('id, user_id, coach_name, team, extracted_data, is_active, created_at, updated_at, playing_style_competence, connection, stat_boosters, training_affinity_description')
        .eq('user_id', userId)
        .order('is_active', { ascending: false })
        .order('created_at', { ascending: false })
      if (result.error) throw domainError('Failed to fetch coaches')
      return result.data || []
    }
  }
}

export function createCoachWriteService(writeProvider, options = {}) {
  const knowledgeRefresh =
    options.knowledgeRefresh ||
    writeProvider?.knowledgeRefresh ||
    createDisabledKnowledgeRefreshSideEffect()
  const refresh = (userId, source) => {
    try {
      knowledgeRefresh.schedule({ userId, source })
    } catch {
      // Non-blocking by contract.
    }
  }

  return {
    async save({ token, userId, coach }) {
      const normalized = normalizeCoach(coach)
      const validation = validateCoachForSave(normalized)
      if (!validation.valid) throw domainError(validation.error, 400)
      const client = writeProvider.forUser(token)
      const result = await client
        .from('coaches')
        .insert(buildCoachCreateData(userId, normalized))
        .select('id, user_id, coach_name')
        .single()
      if (result.error) {
        throw domainError(`Failed to create coach: ${result.error.message}`)
      }
      refresh(userId, 'coaches.save')
      return { success: true, coach_id: result.data.id, is_new: true }
    },

    async setActive({ token, userId, coachId }) {
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
      refresh(userId, 'coaches.set-active')
      return { success: true, coach_id: coachId }
    },

    async delete({ token, userId, coachId }) {
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
      refresh(userId, 'coaches.delete')
      return { success: true }
    }
  }
}
