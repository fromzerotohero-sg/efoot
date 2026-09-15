import { createDisabledKnowledgeRefreshSideEffect } from '../memory/knowledgeRefresh.js'

export const PROFILE_SELECT = [
  'id', 'user_id', 'first_name', 'last_name', 'current_division', 'favorite_team',
  'team_name', 'ai_name', 'how_to_remember', 'hours_per_week', 'common_problems',
  'profile_completion_score', 'profile_completion_level', 'platform',
  'connection_quality', 'slow_opponent_connection_issues', 'input_delay',
  'pass_level', 'smart_assist', 'ai_weak_point', 'ai_learn_goals', 'ai_notes',
  'favourite_player_name', 'created_at', 'updated_at'
].join(', ')

export const AI_INFO_SELECT = [
  'id', 'first_name', 'ai_name', 'current_division', 'hours_per_week',
  'connection_quality', 'slow_opponent_connection_issues', 'input_delay',
  'pass_level', 'smart_assist', 'platform', 'favourite_player_name',
  'ai_weak_point', 'ai_learn_goals', 'ai_notes'
].join(', ')

const TEXT_FIELDS = [
  'first_name', 'last_name', 'current_division', 'favorite_team', 'team_name', 'ai_name'
]
const AI_TEXT_FIELDS = ['first_name', 'ai_name', 'current_division', 'favourite_player_name', 'ai_learn_goals']
const WHITELIST = {
  connection_quality: ['good', 'unstable', 'lag'],
  slow_opponent_connection_issues: ['yes', 'no', 'sometimes'],
  input_delay: ['yes', 'no', 'sometimes'],
  pass_level: ['pa1', 'pa2', 'pa3'],
  smart_assist: ['yes', 'no'],
  platform: ['console', 'pc', 'mobile', 'other']
}
const WEAK_POINTS = {
  defence: 'Difesa',
  attack: 'Attacco',
  set_pieces: 'Piazzati',
  transitions: 'Transizioni',
  final_minutes: 'Finale partita'
}

function domainError(message, statusCode = 500) {
  const error = new Error(message)
  error.statusCode = statusCode
  return error
}

const toText = (value) =>
  typeof value === 'string' && value.trim().length ? value.trim() : null

const toInt = (value) => {
  if (value === null || value === undefined) return null
  const number = Number(value)
  return Number.isFinite(number) ? Math.trunc(number) : null
}

function assignText(update, body, field, maximum, message = `${field} is too long`) {
  if (body[field] === undefined) return
  const value = toText(body[field])
  if (value && value.length > maximum) throw domainError(message, 400)
  update[field] = value
}

export function buildProfileUpdate(userId, body = {}) {
  const update = { user_id: userId }
  for (const field of TEXT_FIELDS) assignText(update, body, field, 255)
  assignText(update, body, 'how_to_remember', 1000)
  if (body.hours_per_week !== undefined) {
    const value = toInt(body.hours_per_week)
    if (value !== null && (value < 0 || value > 168)) {
      throw domainError('Hours per week must be between 0 and 168.', 400)
    }
    update.hours_per_week = value
  }
  if (body.common_problems !== undefined) {
    update.common_problems = Array.isArray(body.common_problems)
      ? body.common_problems
        .filter((item) => typeof item === 'string' && item.trim())
        .map((item) => item.trim())
        .slice(0, 20)
      : null
  }
  return update
}

export function buildAiInfoUpdate(userId, body = {}) {
  const update = { user_id: userId }
  for (const field of AI_TEXT_FIELDS) assignText(update, body, field, 255, 'Text too long.')
  assignText(update, body, 'ai_notes', 500, 'Text too long.')

  if (body.hours_per_week !== undefined) {
    const value = toInt(body.hours_per_week)
    if (value !== null && (value < 0 || value > 168)) {
      throw domainError('Invalid value.', 400)
    }
    update.hours_per_week = value
  }

  for (const [field, allowed] of Object.entries(WHITELIST)) {
    if (body[field] === undefined) continue
    const value = body[field] === null || body[field] === ''
      ? null
      : String(body[field]).trim().toLowerCase()
    if (value && !allowed.includes(value)) throw domainError('Invalid value.', 400)
    update[field] = value
  }

  if (body.ai_weak_point !== undefined) {
    const raw = String(body.ai_weak_point || '').trim().toLowerCase()
    if (WEAK_POINTS[raw]) {
      update.ai_weak_point = raw
      update.common_problems = [WEAK_POINTS[raw]]
    } else {
      const value = toText(body.ai_weak_point)
      if (value && value.length > 255) throw domainError('Text too long.', 400)
      update.ai_weak_point = value
      update.common_problems = value ? [value] : []
    }
  }
  return update
}

export function createUserReadService(readOnlyProvider) {
  return {
    async profile({ token, userId }) {
      const result = await readOnlyProvider.forUser(token)
        .from('user_profiles')
        .select(PROFILE_SELECT)
        .eq('user_id', userId)
        .maybeSingle()
      if (result.error) throw domainError('Failed to fetch profile')
      return result.data || {}
    },

    async aiInfo({ token, userId }) {
      const result = await readOnlyProvider.forUser(token)
        .from('user_profiles')
        .select(AI_INFO_SELECT)
        .eq('user_id', userId)
        .maybeSingle()
      if (result.error) throw domainError('Error saving. Please try again.')
      return { profile: result.data || {} }
    }
  }
}

export function createUserWriteService(writeProvider, options = {}) {
  const knowledgeRefresh =
    options.knowledgeRefresh ||
    writeProvider?.knowledgeRefresh ||
    createDisabledKnowledgeRefreshSideEffect()
  const schedule = (userId, source) => {
    try {
      knowledgeRefresh.schedule({ userId, source })
    } catch {
      // Non-blocking by contract.
    }
  }

  return {
    async saveProfile({ token, userId, profile }) {
      const client = writeProvider.forUser(token)
      const result = await client
        .from('user_profiles')
        .upsert(buildProfileUpdate(userId, profile), { onConflict: 'user_id' })
        .select('id, profile_completion_score, profile_completion_level, first_name, last_name, current_division, favorite_team, team_name, ai_name, how_to_remember, hours_per_week, common_problems')
        .single()
      if (result.error) throw domainError('Unable to save profile. Please try again.')
      schedule(userId, 'users.profile.save')
      return { success: true, profile: result.data }
    },

    async saveAiInfo({ token, userId, aiInfo }) {
      const client = writeProvider.forUser(token)
      const result = await client
        .from('user_profiles')
        .upsert(buildAiInfoUpdate(userId, aiInfo), { onConflict: 'user_id' })
        .select(AI_INFO_SELECT)
        .single()
      if (result.error) throw domainError('Error saving. Please try again.')

      Promise.resolve(
        client.from('user_diagnostic_cache').delete().eq('user_id', userId)
      ).catch(() => {})
      schedule(userId, 'users.aiInfo.save')
      return { success: true, profile: result.data }
    }
  }
}
