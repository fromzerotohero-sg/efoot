/**
 * Priorità stati Home Coach (Master §5.2 + stale stats community):
 * NEW → ROSTER_INCOMPLETE → NO_COACH → POST_MATCH → READY_NO_STATS → STALE_STATS → OPERATIONAL.
 * POST_MATCH: ultimo match < 30 min.
 * STALE_STATS: analisi eFootball presente ma più vecchia di 7 giorni.
 */
import { STATS_STALE_DAYS, daysSince } from '@/lib/chatReadiness'

export function resolveHomeState({ stats, hasActiveCoach, gameAnalysisLastCapture, lastMatchMinutesAgo }) {
  if (!stats || stats.totalPlayers === 0) return 'NEW'
  if (stats.titolari < 11) return 'ROSTER_INCOMPLETE'
  if (!hasActiveCoach) return 'NO_COACH'
  if (lastMatchMinutesAgo !== null && lastMatchMinutesAgo < 30) return 'POST_MATCH'
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
