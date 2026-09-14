/**
 * Readiness del cliente per la chat-guida.
 * Nessun dato fake: solo gap reali (rosa, coach, stats mancanti/stale, post-match).
 */

export const STATS_STALE_DAYS = 7

export function daysSince(isoOrDate) {
  if (!isoOrDate) return null
  const d = isoOrDate instanceof Date ? isoOrDate : new Date(isoOrDate)
  if (Number.isNaN(d.getTime())) return null
  return Math.floor((Date.now() - d.getTime()) / (1000 * 60 * 60 * 24))
}

/**
 * @returns {{
 *   priority: string,
 *   gaps: string[],
 *   statsAgeDays: number|null,
 *   statsStale: boolean,
 *   starters: number,
 *   totalPlayers: number
 * }}
 */
export function buildChatReadiness({
  stats,
  hasActiveCoach,
  gameAnalysisLastCapture,
  lastMatchMinutesAgo
} = {}) {
  const starters = Number(stats?.titolari) || 0
  const totalPlayers = Number(stats?.totalPlayers) || 0
  const statsAgeDays = daysSince(gameAnalysisLastCapture)
  const statsMissing = !gameAnalysisLastCapture
  const statsStale = !statsMissing && statsAgeDays != null && statsAgeDays >= STATS_STALE_DAYS

  const gaps = []
  if (totalPlayers === 0) gaps.push('roster_empty')
  else if (starters < 11) gaps.push('roster_incomplete')
  if (!hasActiveCoach) gaps.push('no_coach')
  if (lastMatchMinutesAgo != null && lastMatchMinutesAgo < 30) gaps.push('post_match')
  if (statsMissing) gaps.push('stats_missing')
  else if (statsStale) gaps.push('stats_stale')

  let priority = 'ready'
  if (totalPlayers === 0) priority = 'roster_empty'
  else if (starters < 11) priority = 'roster_incomplete'
  else if (!hasActiveCoach) priority = 'no_coach'
  else if (lastMatchMinutesAgo != null && lastMatchMinutesAgo < 30) priority = 'post_match'
  else if (statsMissing) priority = 'stats_missing'
  else if (statsStale) priority = 'stats_stale'

  return {
    priority,
    gaps,
    statsAgeDays,
    statsStale,
    statsMissing,
    starters,
    totalPlayers
  }
}

/** Spezza una risposta coach lunga in tip card brevi (max 3). */
export function splitAdviceIntoTips(content = '', maxTips = 3) {
  const text = String(content || '').trim()
  if (!text) return []

  const chunks = text
    .split(/\n+|(?<=[.!?])\s+(?=[A-ZÀÁÈÉÌÍÒÓÙÚ0-9•\-–])/)
    .map((s) => s.replace(/^[-•*]\s*/, '').trim())
    .filter((s) => s.length >= 18)

  if (chunks.length <= 1) {
    // Se è un solo blocco lungo, taglia in frasi
    const sentences = text
      .split(/(?<=[.!?])\s+/)
      .map((s) => s.trim())
      .filter(Boolean)
    if (sentences.length > 1) {
      return sentences.slice(0, maxTips).map((body, i) => ({
        id: `tip-${i}`,
        title: i === 0 ? 'Priorità' : i === 1 ? 'Azione' : 'Dettaglio',
        body
      }))
    }
    return [{ id: 'tip-0', title: 'Consiglio', body: text }]
  }

  const titles = ['Priorità', 'Azione', 'Dettaglio', 'Extra']
  return chunks.slice(0, maxTips).map((body, i) => ({
    id: `tip-${i}`,
    title: titles[i] || `Punto ${i + 1}`,
    body: body.length > 220 ? `${body.slice(0, 217)}…` : body
  }))
}
