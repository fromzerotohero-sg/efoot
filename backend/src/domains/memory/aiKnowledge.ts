// @ts-nocheck
const WEIGHTS = {
  profile: 16,
  roster: 20,
  matches: 24,
  patterns: 12,
  coach: 8,
  usage: 4,
  success: 8,
  coach_training: 8
}
const BASE_FIELDS = [
  'first_name', 'last_name', 'current_division', 'favorite_team',
  'team_name', 'ai_name', 'how_to_remember', 'hours_per_week'
]
const AI_FIELDS = [
  'connection_quality', 'slow_opponent_connection_issues', 'input_delay',
  'pass_level', 'smart_assist', 'platform', 'ai_weak_point', 'ai_learn_goals'
]
const EMPTY_BREAKDOWN = Object.freeze({
  profile: 0,
  roster: 0,
  matches: 0,
  patterns: 0,
  coach: 0,
  usage: 0,
  success: 0,
  coach_training: 0
})

const round1 = (number) => Math.round((Number(number) || 0) * 10) / 10
const filled = (value) =>
  value !== null && value !== undefined &&
  (typeof value !== 'string' || value.trim() !== '') &&
  (!Array.isArray(value) || value.length > 0)
const countFilled = (row, fields) =>
  fields.reduce((count, field) => count + (filled(row?.[field]) ? 1 : 0), 0)

function arrayLength(value) {
  if (Array.isArray(value)) return value.length
  if (typeof value !== 'string' || !value.trim()) return 0
  try {
    const parsed = JSON.parse(value)
    return Array.isArray(parsed) ? parsed.length : 0
  } catch {
    return 0
  }
}

function division(value) {
  const digits = String(value || '').replace(/[^0-9]/g, '')
  return digits ? Number(digits) : null
}

function isWin(match) {
  const result = String(match?.result || '').toUpperCase()
  if (result.includes('W') || result.includes('WIN') || result.includes('VITTORIA')) return true
  if (!/^\d+-\d+$/.test(result)) return false
  const [ours, theirs] = result.split('-').map(Number)
  return ours > theirs
}

export function getAIKnowledgeLevel(score) {
  const value = Number(score)
  if (!Number.isFinite(value) || value < 31) return 'beginner'
  if (value < 61) return 'intermediate'
  if (value < 81) return 'advanced'
  return 'expert'
}

export function calculateAIKnowledgeBreakdown({
  profile = {},
  players = [],
  matches = [],
  patterns = {},
  activeCoach = null,
  weeklyGoals = [],
  coachFeedback = [],
  chatMessagesCount = 0
} = {}) {
  const base = (countFilled(profile, BASE_FIELDS) / BASE_FIELDS.length) * 12
  let aiFilled = countFilled(profile, AI_FIELDS)
  if (Array.isArray(profile.common_problems) && profile.common_problems.length) aiFilled += 1
  const profileScore = Math.min(WEIGHTS.profile, base + (Math.min(AI_FIELDS.length, aiFilled) / AI_FIELDS.length) * 4)

  const starters = players.filter((player) => {
    const slot = Number(player?.slot_index)
    return Number.isInteger(slot) && slot >= 0 && slot <= 10
  })
  const reserves = players.filter((player) => player?.slot_index === null)
  const complete = players.filter((player) =>
    player?.overall_rating !== null && player?.overall_rating !== undefined &&
    arrayLength(player?.original_positions) > 0
  )
  const roster = players.length
    ? Math.min(WEIGHTS.roster,
      Math.min(12, (starters.length / 11) * 12) +
      Math.min(4, (reserves.length / 10) * 4) +
      Math.min(4, (complete.length / players.length) * 4))
    : 0

  const hasPatternData =
    (patterns?.formation_usage && Object.keys(patterns.formation_usage).length) ||
    (patterns?.playing_style_usage && Object.keys(patterns.playing_style_usage).length) ||
    (Array.isArray(patterns?.recurring_issues) && patterns.recurring_issues.length)
  const patternsScore = Math.min(12,
    (hasPatternData ? 8 : 0) + (Number(patterns?.last_50_matches_count) >= 5 ? 4 : 0))

  const completed = weeklyGoals.filter((goal) => goal?.status === 'completed').length
  const interactions = players.length + matches.length + completed
  const chats = Math.max(0, Number(chatMessagesCount) || 0)
  const usage =
    (chats >= 100 ? 2 : chats >= 50 ? 1.2 : chats >= 10 ? 0.4 : 0) +
    (interactions >= 50 ? 2 : interactions >= 25 ? 1.2 : interactions >= 5 ? 0.4 : 0)

  const wins = matches.filter(isWin).length
  let success = completed >= 10 ? 2.5 : completed >= 5 ? 1.5 : completed >= 1 ? 0.5 : 0
  success += wins >= 20 ? 3 : wins >= 10 ? 2 : wins >= 3 ? 1 : 0
  const current = division(profile.current_division)
  const initial = division(profile.initial_division)
  if (current !== null && initial !== null) success += current < initial ? 2.5 : current === initial ? 1 : 0

  const feedbackCount = coachFeedback.length
  const coachTraining = feedbackCount >= 15 ? 8
    : feedbackCount >= 10 ? 6
      : feedbackCount >= 5 ? 4
        : feedbackCount >= 2 ? 2
          : feedbackCount ? 0.8 : 0

  return {
    profile: round1(profileScore),
    roster: round1(roster),
    matches: round1(Math.min(WEIGHTS.matches, matches.length * 2.4)),
    patterns: round1(patternsScore),
    coach: activeCoach ? WEIGHTS.coach : 0,
    usage: round1(Math.min(WEIGHTS.usage, usage)),
    success: round1(Math.min(WEIGHTS.success, success)),
    coach_training: round1(coachTraining)
  }
}

function domainError(message, statusCode = 500) {
  const error = new Error(message)
  error.statusCode = statusCode
  return error
}

export function createAIKnowledgeService({ readProvider, writeProvider, now = () => new Date() }) {
  async function calculate({ token, userId }) {
    const client = readProvider.forUser(token)
    const since = new Date(now().getTime() - 30 * 24 * 60 * 60 * 1000).toISOString()
    const results = await Promise.all([
      client.from('user_profiles').select('user_id, first_name, last_name, current_division, favorite_team, team_name, ai_name, how_to_remember, hours_per_week, common_problems, initial_division, connection_quality, slow_opponent_connection_issues, input_delay, pass_level, smart_assist, platform, ai_weak_point, ai_learn_goals').eq('user_id', userId).maybeSingle(),
      client.from('players').select('user_id, slot_index, overall_rating, original_positions').eq('user_id', userId),
      client.from('matches').select('id, result, match_date, team_stats, created_at').eq('user_id', userId).order('created_at', { ascending: false }).limit(30),
      client.from('team_tactical_patterns').select('formation_usage, playing_style_usage, recurring_issues, last_50_matches_count').eq('user_id', userId).maybeSingle(),
      client.from('coaches').select('id, coach_name, is_active').eq('user_id', userId).eq('is_active', true).limit(1),
      client.from('weekly_goals').select('id, status, week_start_date').eq('user_id', userId).order('week_start_date', { ascending: false }).limit(20),
      client.from('user_tactical_feedback').select('id, created_at').eq('user_id', userId).gte('created_at', since),
      client.from('hero_chat_messages').select('id', { count: 'exact', head: true }).eq('user_id', userId).eq('role', 'user')
    ])
    const failed = results.find((result) => result.error)
    if (failed) throw domainError(failed.error.message || 'Unable to calculate AI knowledge')
    const breakdown = calculateAIKnowledgeBreakdown({
      profile: results[0].data || {},
      players: results[1].data || [],
      matches: results[2].data || [],
      patterns: results[3].data || {},
      activeCoach: results[4].data?.[0] || null,
      weeklyGoals: results[5].data || [],
      coachFeedback: results[6].data || [],
      chatMessagesCount: results[7].count || 0
    })
    const score = Math.min(100, Math.round(Object.values(breakdown).reduce((sum, value) => sum + value, 0)))
    return { score, level: getAIKnowledgeLevel(score), breakdown }
  }

  return {
    async read({ token, userId, refresh = false }) {
      const client = readProvider.forUser(token)
      const cached = await client
        .from('user_profiles')
        .select('ai_knowledge_score, ai_knowledge_level, ai_knowledge_breakdown, ai_knowledge_last_calculated')
        .eq('user_id', userId)
        .maybeSingle()
      const profile = cached.data || {}
      const last = profile.ai_knowledge_last_calculated
        ? new Date(profile.ai_knowledge_last_calculated)
        : null
      const valid = !refresh && last && now() - last < 5 * 60 * 1000
      if (profile.ai_knowledge_score != null && valid) {
        return {
          score: profile.ai_knowledge_score,
          level: profile.ai_knowledge_level || getAIKnowledgeLevel(profile.ai_knowledge_score),
          breakdown: { ...(profile.ai_knowledge_breakdown || {}), coach_training: profile.ai_knowledge_breakdown?.coach_training ?? 0 },
          last_calculated: profile.ai_knowledge_last_calculated
        }
      }
      try {
        const result = await calculate({ token, userId })
        const timestamp = now().toISOString()
        const writer = writeProvider.forUser(token)
        const saved = await writer.from('user_profiles').update({
          ai_knowledge_score: result.score,
          ai_knowledge_level: result.level,
          ai_knowledge_breakdown: result.breakdown,
          ai_knowledge_last_calculated: timestamp
        }).eq('user_id', userId)
        if (saved.error) throw domainError(saved.error.message)
        return { ...result, last_calculated: timestamp }
      } catch (error) {
        if (profile.ai_knowledge_score != null) {
          return {
            score: profile.ai_knowledge_score,
            level: profile.ai_knowledge_level || getAIKnowledgeLevel(profile.ai_knowledge_score),
            breakdown: { ...(profile.ai_knowledge_breakdown || {}), coach_training: profile.ai_knowledge_breakdown?.coach_training ?? 0 },
            last_calculated: profile.ai_knowledge_last_calculated
          }
        }
        return {
          score: 0,
          level: 'beginner',
          breakdown: { ...EMPTY_BREAKDOWN },
          last_calculated: null
        }
      }
    },
    calculate
  }
}
