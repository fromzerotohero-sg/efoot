/**
 * Priorità stati Home Coach (Master §5.2):
 * NEW → ROSTER_INCOMPLETE → NO_COACH → POST_MATCH → READY_NO_STATS → OPERATIONAL.
 * POST_MATCH: ultimo match < 30 min (stessa semantica già usata in produzione).
 */
export function resolveHomeState({ stats, hasActiveCoach, gameAnalysisLastCapture, lastMatchMinutesAgo }) {
  if (!stats || stats.totalPlayers === 0) return 'NEW'
  if (stats.titolari < 11) return 'ROSTER_INCOMPLETE'
  if (!hasActiveCoach) return 'NO_COACH'
  if (lastMatchMinutesAgo !== null && lastMatchMinutesAgo < 30) return 'POST_MATCH'
  if (!gameAnalysisLastCapture) return 'READY_NO_STATS'
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
