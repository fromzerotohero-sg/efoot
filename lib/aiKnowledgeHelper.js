import { createClient } from '@supabase/supabase-js'

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

const round1 = (n) => Math.round((Number(n) || 0) * 10) / 10

const isFilled = (value) => {
  if (value === null || value === undefined) return false
  if (typeof value === 'string') return value.trim() !== ''
  if (Array.isArray(value)) return value.length > 0
  return true
}

const countFilled = (obj, keys) => keys.reduce((acc, k) => acc + (isFilled(obj?.[k]) ? 1 : 0), 0)

const asJsonArrayLength = (value) => {
  if (Array.isArray(value)) return value.length
  if (typeof value === 'string') {
    const trimmed = value.trim()
    if (!trimmed) return 0
    try {
      const parsed = JSON.parse(trimmed)
      return Array.isArray(parsed) ? parsed.length : 0
    } catch {
      return 0
    }
  }
  return 0
}

const profileBaseFields = [
  'first_name', 'last_name', 'current_division', 'favorite_team',
  'team_name', 'ai_name', 'how_to_remember', 'hours_per_week'
]

const profileAiFields = [
  'connection_quality', 'slow_opponent_connection_issues', 'input_delay', 'pass_level',
  'smart_assist', 'platform', 'ai_weak_point', 'ai_learn_goals'
]

function calculateProfileScore(profile) {
  if (!profile) return 0
  const base = (countFilled(profile, profileBaseFields) / profileBaseFields.length) * 12
  let aiFill = countFilled(profile, profileAiFields)
  if (Array.isArray(profile.common_problems) && profile.common_problems.length > 0) aiFill += 1
  const ai = (Math.min(profileAiFields.length, aiFill) / profileAiFields.length) * 4
  return Math.min(WEIGHTS.profile, round1(base + ai))
}

function calculateRosterScore(players) {
  if (!Array.isArray(players) || players.length === 0) return 0

  const starters = players.filter((p) => {
    const slot = Number(p?.slot_index)
    return Number.isFinite(slot) && slot >= 0 && slot <= 10
  })
  const reserves = players.filter((p) => {
    const slot = Number(p?.slot_index)
    return !Number.isFinite(slot) || slot < 0 || slot > 10
  })
  const complete = players.filter((p) => {
    const hasOverall = p?.overall_rating !== null && p?.overall_rating !== undefined
    const hasPositions = asJsonArrayLength(p?.original_positions) > 0
    return hasOverall && hasPositions
  })

  const starterScore = Math.min(12, (starters.length / 11) * 12)
  const reserveScore = Math.min(4, (reserves.length / 10) * 4)
  const completeScore = Math.min(4, (complete.length / Math.max(1, players.length)) * 4)
  return Math.min(WEIGHTS.roster, round1(starterScore + reserveScore + completeScore))
}

function calculateMatchesScore(matches) {
  if (!Array.isArray(matches) || matches.length === 0) return 0
  return Math.min(WEIGHTS.matches, round1(matches.length * 2.4))
}

function calculatePatternsScore(patterns) {
  if (!patterns || typeof patterns !== 'object') return 0
  const hasUsage =
    (patterns.formation_usage && Object.keys(patterns.formation_usage).length > 0) ||
    (patterns.playing_style_usage && Object.keys(patterns.playing_style_usage).length > 0)
  const hasIssues = Array.isArray(patterns.recurring_issues) && patterns.recurring_issues.length > 0
  let score = hasUsage || hasIssues ? 8 : 0
  if ((Number(patterns.last_50_matches_count) || 0) >= 5) score += 4
  return Math.min(WEIGHTS.patterns, score)
}

function calculateCoachScore(activeCoach) {
  if (!activeCoach) return 0
  if (activeCoach.is_active === true || activeCoach.id || activeCoach.coach_name || activeCoach.name) {
    return WEIGHTS.coach
  }
  return 0
}

function calculateUsageScore({ playersCount, matchesCount, completedGoalsCount }) {
  const interactions = (playersCount || 0) + (matchesCount || 0) + (completedGoalsCount || 0)
  const chatMessages = Math.floor((matchesCount || 0) / 3)
  let score = 0
  if (chatMessages >= 100) score += 2
  else if (chatMessages >= 50) score += 1.2
  else if (chatMessages >= 10) score += 0.4

  if (interactions >= 50) score += 2
  else if (interactions >= 25) score += 1.2
  else if (interactions >= 5) score += 0.4
  return Math.min(WEIGHTS.usage, round1(score))
}

function extractDivisionNumber(value) {
  const str = String(value || '')
  const digits = str.replace(/[^0-9]/g, '')
  return digits ? Number(digits) : null
}

function calculateSuccessScore(profile, weeklyGoals, matches) {
  let score = 0
  const completedGoals = (weeklyGoals || []).filter((g) => g?.status === 'completed').length
  if (completedGoals >= 10) score += 2.5
  else if (completedGoals >= 5) score += 1.5
  else if (completedGoals >= 1) score += 0.5

  const wins = (matches || []).filter((m) => {
    const r = String(m?.result || '').toUpperCase()
    if (r.includes('W') || r.includes('WIN') || r.includes('VITTORIA')) return true
    if (/^\d+-\d+$/.test(r)) {
      const [a, b] = r.split('-').map(Number)
      return a > b
    }
    return false
  }).length
  if (wins >= 20) score += 3
  else if (wins >= 10) score += 2
  else if (wins >= 3) score += 1

  const current = extractDivisionNumber(profile?.current_division)
  const initial = extractDivisionNumber(profile?.initial_division)
  if (current !== null && initial !== null && current > initial) score += 2.5
  else if (current !== null && initial !== null && current === initial) score += 1

  return Math.min(WEIGHTS.success, round1(score))
}

function calculateCoachTrainingScore(feedbackRows) {
  if (!Array.isArray(feedbackRows) || feedbackRows.length === 0) return 0
  if (feedbackRows.length >= 15) return 8
  if (feedbackRows.length >= 10) return 6
  if (feedbackRows.length >= 5) return 4
  if (feedbackRows.length >= 2) return 2
  return 0.8
}

export function getAIKnowledgeLevel(score) {
  const n = Number(score)
  if (!Number.isFinite(n)) return 'beginner'
  if (n >= 81) return 'expert'
  if (n >= 61) return 'advanced'
  if (n >= 31) return 'intermediate'
  return 'beginner'
}

export async function calculateAIKnowledgeScore(userId, supabaseUrl, serviceKey) {
  if (!userId || !supabaseUrl || !serviceKey) {
    throw new Error('Missing required parameters: userId, supabaseUrl, serviceKey')
  }

  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  })

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()

  const [
    { data: profile },
    { data: players },
    { data: matches },
    { data: tacticalPatterns },
    { data: coachRows },
    { data: weeklyGoals },
    { data: coachFeedback }
  ] = await Promise.all([
    admin.from('user_profiles')
      .select('user_id, first_name, last_name, current_division, favorite_team, team_name, ai_name, how_to_remember, hours_per_week, common_problems, initial_division, connection_quality, slow_opponent_connection_issues, input_delay, pass_level, smart_assist, platform, ai_weak_point, ai_learn_goals')
      .eq('user_id', userId).maybeSingle(),
    admin.from('players').select('user_id, slot_index, overall_rating, original_positions').eq('user_id', userId),
    admin.from('matches').select('id, result, match_date, team_stats, created_at').eq('user_id', userId).order('created_at', { ascending: false }).limit(30),
    admin.from('team_tactical_patterns').select('formation_usage, playing_style_usage, recurring_issues, last_50_matches_count').eq('user_id', userId).maybeSingle(),
    admin.from('coaches').select('id, coach_name, is_active').eq('user_id', userId).eq('is_active', true).limit(1),
    admin.from('weekly_goals').select('id, status, week_start_date').eq('user_id', userId).order('week_start_date', { ascending: false }).limit(20),
    admin.from('user_tactical_feedback').select('id, created_at').eq('user_id', userId).gte('created_at', thirtyDaysAgo)
  ])

  const completedGoalsCount = (weeklyGoals || []).filter((g) => g?.status === 'completed').length
  const activeCoach = Array.isArray(coachRows) && coachRows.length > 0 ? coachRows[0] : null

  const breakdown = {
    profile: round1(calculateProfileScore(profile || {})),
    roster: round1(calculateRosterScore(players || [])),
    matches: round1(calculateMatchesScore(matches || [])),
    patterns: round1(calculatePatternsScore(tacticalPatterns || {})),
    coach: round1(calculateCoachScore(activeCoach)),
    usage: round1(calculateUsageScore({
      playersCount: (players || []).length,
      matchesCount: (matches || []).length,
      completedGoalsCount
    })),
    success: round1(calculateSuccessScore(profile || {}, weeklyGoals || [], matches || [])),
    coach_training: round1(calculateCoachTrainingScore(coachFeedback || []))
  }

  const score = Math.min(100, Math.round(Object.values(breakdown).reduce((a, b) => a + (Number(b) || 0), 0)))

  return {
    score,
    level: getAIKnowledgeLevel(score),
    breakdown
  }
}

export async function updateAIKnowledgeScore(userId, supabaseUrl, serviceKey) {
  const result = await calculateAIKnowledgeScore(userId, supabaseUrl, serviceKey)
  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  })

  const { error } = await admin
    .from('user_profiles')
    .update({
      ai_knowledge_score: result.score,
      ai_knowledge_level: result.level,
      ai_knowledge_breakdown: result.breakdown,
      ai_knowledge_last_calculated: new Date().toISOString()
    })
    .eq('user_id', userId)

  if (error) throw error
  return result
}
