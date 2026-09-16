/**
 * Priorità stati Home Coach (percorso soft, non bloccante):
 * NEW → ROSTER_INCOMPLETE → NO_COACH → POST_MATCH → PROFILE_THIN → READY_NO_STATS → STALE_STATS → OPERATIONAL.
 * POST_MATCH: ultimo match < 30 min (urgente ma soft).
 * PROFILE_THIN: rosa+coach ok, ma manca segnale coaching sul profilo (dopo readiness squadra).
 * STALE_STATS: analisi eFootball presente ma più vecchia di 7 giorni.
 */
import { STATS_STALE_DAYS, daysSince } from '@/lib/chatReadiness'

/**
 * Profilo “minimo” per Hero: nome + qualcosa su come giochi
 * (punto debole / problemi / nota memoria), oppure score ≥ 50.
 */
export function isProfileThin(userProfile) {
  if (!userProfile || typeof userProfile !== 'object') return true
  const score = Number(userProfile.profile_completion_score)
  if (Number.isFinite(score) && score >= 50) return false

  const name = String(userProfile.first_name || '').trim()
  const weak = String(userProfile.ai_weak_point || '').trim()
  const remember = String(userProfile.how_to_remember || '').trim()
  const problems = userProfile.common_problems
  const hasProblems = Array.isArray(problems)
    ? problems.some((p) => String(p || '').trim())
    : Boolean(String(problems || '').trim())

  const hasPlaySignal = Boolean(weak) || hasProblems || Boolean(remember)
  return !(name && hasPlaySignal)
}

export function resolveHomeState({
  stats,
  hasActiveCoach,
  gameAnalysisLastCapture,
  lastMatchMinutesAgo,
  userProfile = null
}) {
  if (!stats || stats.totalPlayers === 0) return 'NEW'
  if (stats.titolari < 11) return 'ROSTER_INCOMPLETE'
  if (!hasActiveCoach) return 'NO_COACH'
  if (lastMatchMinutesAgo !== null && lastMatchMinutesAgo < 30) return 'POST_MATCH'
  if (isProfileThin(userProfile)) return 'PROFILE_THIN'
  if (!gameAnalysisLastCapture) return 'READY_NO_STATS'
  const age = daysSince(gameAnalysisLastCapture)
  if (age != null && age >= STATS_STALE_DAYS) return 'STALE_STATS'
  return 'OPERATIONAL'
}

export function formatMatchDate(rawDate, lang) {
  if (!rawDate) return null
  const d = new Date(rawDate)
  if (isNaN(d.getTime())) return null
  return d.toLocaleDateString(lang === 'en' ? 'en-GB' : lang === 'es' ? 'es-ES' : 'it-IT', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  })
}

export function resolveGreetingName(userProfile) {
  const first = String(userProfile?.first_name || '').trim()
  if (first) return first
  const user = String(userProfile?.username || '').trim()
  if (user) return user
  return 'Hero'
}
