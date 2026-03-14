/**
 * Helper classifica mensile (From Zero to Hero)
 * Calcolo Punti Coach: partite, utilizzo IA, profilo (task e miglioramento non contano — vedi AUDIT §9).
 * Uso IA: solo operazioni in whitelist (coerente con task use_ai_recommendations). Stessa lista di taskHelper.AI_USAGE_DESCRIPTIONS_WHITELIST.
 */
const USAGE_WHITELIST = ['assistant-chat', 'analyze-match', 'generate-countermeasures', 'extract-formation', 'extract-match-data', 'extract-game-analysis', 'extract-player', 'extract-coach', 'coach-feedback-chat', 'save-coach-feedback']

/** Nessun tetto partite: ogni partita complete nel mese dà punti (incentivo a caricare). */
const PTS_PER_MATCH = 2
const PTS_PER_MATCH_QUALITY = 1
const CAP_IA_ACTIONS = 20
const PTS_PER_IA_ACTION = 0.5
const BONUS_IA_VARIETY = 5
const IA_VARIETY_MIN_TYPES = 3
const PROFILE_PTS = 5
const PROFILE_THRESHOLD = 80
/** Eleggibilità: almeno 1 partita complete nel mese + profilo ≥ 50 + consenso. Nessun obbligo di task nel mese (coerenza: partite + profilo = entri). */
const MIN_MATCHES_ELIGIBILITY = 1
const MIN_TASKS_ELIGIBILITY = 0
const MIN_PROFILE_ELIGIBILITY = 50

/** Mese corrente in formato YYYY-MM (stesso formato ovunque: API, classifica, dashboard). */
export function getCurrentMonth() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

/**
 * Restituisce inizio e fine mese in ISO (UTC)
 * @param {string} month - "YYYY-MM"
 */
export function getMonthBounds(month) {
  const [y, m] = month.split('-').map(Number)
  if (!y || !m || m < 1 || m > 12) return null
  const start = new Date(Date.UTC(y, m - 1, 1, 0, 0, 0, 0))
  const end = new Date(Date.UTC(y, m, 0, 23, 59, 59, 999))
  return {
    start: start.toISOString(),
    end: end.toISOString()
  }
}

/**
 * Calcola Punti Coach per un singolo utente (dati già caricati)
 * @param {Object} params
 * @param {Array} params.matches - Partite del mese (complete)
 * @param {Array} params.tasksCompleted - Task completati nel mese ({ goal_type })
 * @param {Array} params.usageTransactions - credit_transactions type=usage nel mese (description)
 * @param {number} params.profileCompletionScore
 * @returns {{ points: number, breakdown: object }}
 */
export function calculateUserCoachPoints({ matches = [], tasksCompleted = [], usageTransactions = [], profileCompletionScore = 0 }) {
  const breakdown = { matches: 0, tasks: 0, usage_ia: 0, profile: 0, improvement: 0 }

  const completeInMonth = matches.filter(m => m.data_completeness === 'complete')
  let pMatches = completeInMonth.length * PTS_PER_MATCH
  for (let i = 0; i < completeInMonth.length; i++) {
    const m = completeInMonth[i]
    const hasQuality = (m.photos_uploaded && m.photos_uploaded >= 1) || (m.team_stats && typeof m.team_stats === 'object' && Object.keys(m.team_stats).length > 0)
    if (hasQuality) pMatches += PTS_PER_MATCH_QUALITY
  }
  breakdown.matches = Math.round(pMatches * 10) / 10

  // Task e improvement non contano più in classifica (decisione prodotto §9: evitare incentivo a manipolare partite)
  breakdown.tasks = 0
  breakdown.improvement = 0

  // Solo usage in whitelist (stessa logica di task use_ai_recommendations)
  const usageFiltered = usageTransactions.filter(t => t?.description && USAGE_WHITELIST.includes(t.description))
  const usageCount = Math.min(CAP_IA_ACTIONS, usageFiltered.length)
  const distinctTypes = new Set(usageFiltered.slice(0, CAP_IA_ACTIONS).map(t => t.description).filter(Boolean)).size
  let pUsage = usageCount * PTS_PER_IA_ACTION
  if (distinctTypes >= IA_VARIETY_MIN_TYPES) pUsage += BONUS_IA_VARIETY
  breakdown.usage_ia = Math.round(pUsage * 10) / 10

  const pProfile = (profileCompletionScore >= PROFILE_THRESHOLD) ? PROFILE_PTS : 0
  breakdown.profile = pProfile

  const points = Math.round((breakdown.matches + breakdown.usage_ia + breakdown.profile) * 10) / 10
  return { points, breakdown }
}

/**
 * Verifica se l'utente è eleggibile per la classifica (soglie minime)
 */
export function isEligibleForLeaderboard({ matchCount, tasksCompletedCount, profileCompletionScore }) {
  const score = Number(profileCompletionScore) || 0
  return matchCount >= MIN_MATCHES_ELIGIBILITY &&
    tasksCompletedCount >= MIN_TASKS_ELIGIBILITY &&
    score >= MIN_PROFILE_ELIGIBILITY
}

/**
 * Calcola classifica per un mese (tutti gli utenti con consenso che rispettano soglie)
 * Usa solo admin (service role). Restituisce array ordinato con rank; breakdown solo per uso interno.
 * @param {string} month - "YYYY-MM"
 * @param {object} admin - Supabase client con service role
 * @returns {Promise<Array<{ user_id: string, nickname: string|null, points: number, rank: number, points_breakdown: object }>>}
 */
export async function computeLeaderboardForMonth(month, admin) {
  const bounds = getMonthBounds(month)
  if (!bounds) return []

  // Tutti i profili (nessun filtro consenso: tutti gli eleggibili entrano in classifica). first_name come fallback se nickname vuoto.
  const { data: profiles } = await admin
    .from('user_profiles')
    .select('user_id, nickname, first_name, profile_completion_score')

  if (!profiles?.length) return []

  const userIds = profiles.map(p => p.user_id)
  const profileScoreByUser = {}
  profiles.forEach(p => {
    profileScoreByUser[p.user_id] = Number(p.profile_completion_score) || 0
  })

  const [matchesRes, goalsRes, txRes] = await Promise.all([
    admin.from('matches').select('user_id, data_completeness, photos_uploaded, team_stats').gte('match_date', bounds.start).lte('match_date', bounds.end),
    admin.from('weekly_goals').select('user_id, goal_type, status, completed_at').eq('status', 'completed').gte('completed_at', bounds.start).lte('completed_at', bounds.end),
    admin.from('credit_transactions').select('user_id, description').eq('type', 'usage').gte('created_at', bounds.start).lte('created_at', bounds.end)
  ])

  const matchesByUser = {}
  ;(matchesRes?.data || []).forEach(m => {
    if (!matchesByUser[m.user_id]) matchesByUser[m.user_id] = []
    matchesByUser[m.user_id].push(m)
  })
  const tasksByUser = {}
  ;(goalsRes?.data || []).forEach(g => {
    if (!tasksByUser[g.user_id]) tasksByUser[g.user_id] = []
    tasksByUser[g.user_id].push({ goal_type: g.goal_type })
  })
  const usageByUser = {}
  ;(txRes?.data || []).forEach(t => {
    if (!usageByUser[t.user_id]) usageByUser[t.user_id] = []
    usageByUser[t.user_id].push({ description: t.description })
  })

  const results = []
  for (const uid of userIds) {
    const matches = matchesByUser[uid] || []
    const tasksCompleted = tasksByUser[uid] || []
    const usageTransactions = usageByUser[uid] || []
    const profileCompletionScore = profileScoreByUser[uid] || 0

    const completeInMonth = matches.filter(m => m.data_completeness === 'complete')
    if (!isEligibleForLeaderboard({
      matchCount: completeInMonth.length,
      tasksCompletedCount: tasksCompleted.length,
      profileCompletionScore
    })) continue

    const { points, breakdown } = calculateUserCoachPoints({
      matches,
      tasksCompleted,
      usageTransactions,
      profileCompletionScore
    })

    const p = profiles.find(pr => pr.user_id === uid)
    const displayName = (p?.nickname && p.nickname.trim()) || (p?.first_name && p.first_name.trim()) || null
    results.push({
      user_id: uid,
      nickname: displayName,
      points,
      points_breakdown: breakdown
    })
  }

  results.sort((a, b) => b.points - a.points)
  results.forEach((r, i) => { r.rank = i + 1 })
  return results
}

/**
 * Sostituisce lo snapshot classifica per il mese (solo server).
 * Elimina le righe esistenti per il mese e inserisce la lista computed, così la classifica
 * è sempre coerente (retroattiva: chi ha consenso e ≥1 partita entra; chi revoca esce).
 */
export async function saveLeaderboardSnapshot(month, rankings, admin) {
  await admin.from('leaderboard_snapshots').delete().eq('month', month)
  if (!rankings?.length) return
  const rows = rankings.map(r => ({
    month,
    user_id: r.user_id,
    points: Math.round(Number(r.points)) || 0,
    rank: r.rank,
    points_breakdown: r.points_breakdown || {}
  }))
  await admin.from('leaderboard_snapshots').insert(rows)
}
