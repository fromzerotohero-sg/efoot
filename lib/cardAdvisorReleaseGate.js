/**
 * Gate Card Advisor: quali sezioni eFHUB sono pack valutabili.
 *
 * La home eFHUB è un feed (bonus, webstore, campagne, skill-up, manager…).
 * Card Advisor deve mostrare solo box/release che un utente valuta prima
 * di spendere coins — non tutto ciò che ha un <h2> e delle carte.
 *
 * Tenere allineato con scripts/card_advisor_release_gate.py
 */

const DENY_SUBSTRINGS = [
  'bonus',
  'reward',
  'rewards',
  'login',
  'advertisement',
  'starter set',
  'skill up',
  'skill-up',
  'step-up',
  'step up',
  'manager pack',
  'webstore',
  'campaign',
]

const ALLOW_SUBSTRINGS = [
  'selection',
  'highlight',
  'standout',
  'encore',
  'collaboration',
  'naruto',
  'transfer',
  'edition',
  'tactical',
  'international cup',
  'icons',
  'national stars',
  'national all stars',
  'rising stars',
  'monthly mvps',
  'toty',
  'gracias',
  'eric cantona',
]

const RELEASE_DATE_RE = /(\d{1,2}\s+[A-Za-z]{3,9}\s+'?\d{2})/

function normalizeReleaseName(name = '') {
  return String(name || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

export function extractReleaseDate(name = '') {
  const match = String(name || '').match(RELEASE_DATE_RE)
  return match ? match[1].replace(/\s+/g, ' ').trim() : null
}

export function categoryFromReleaseName(name = '') {
  const lower = normalizeReleaseName(name)
  if (lower.includes('naruto') || lower.includes('collaboration')) return 'Collaboration'
  if (lower.includes('standout')) return 'Standout'
  if (lower.includes('highlight')) return 'Highlight'
  if (lower.includes('selection')) return 'Selection'
  if (lower.includes('encore')) return 'Encore'
  if (lower.includes('transfer')) return 'Transfer'
  if (lower.includes('edition')) return 'Edition'
  if (lower.includes('tactical')) return 'Event'
  return 'Special'
}

export function isEvaluableCardAdvisorRelease(name = '') {
  const lower = normalizeReleaseName(name)
  if (!lower) return false
  if (DENY_SUBSTRINGS.some((needle) => lower.includes(needle))) return false
  if (ALLOW_SUBSTRINGS.some((needle) => lower.includes(needle))) return true
  if (RELEASE_DATE_RE.test(String(name || ''))) return true
  return false
}

export function filterEvaluableReleases(releases = [], nameKey = 'name') {
  return (Array.isArray(releases) ? releases : []).filter((release) => (
    isEvaluableCardAdvisorRelease(release?.[nameKey] || release?.release_name || release?.release || '')
  ))
}

export function intersectDbWithLive(dbReleases = [], liveReleases = []) {
  const liveIds = new Set(
    (liveReleases || []).map((release) => String(release?.id || '').trim()).filter(Boolean)
  )
  if (liveIds.size === 0) return dbReleases
  const matched = (dbReleases || []).filter((release) => liveIds.has(String(release?.id || '').trim()))
  return matched.length > 0 ? matched : dbReleases
}

export const CARD_ADVISOR_RELEASE_GATE = {
  DENY_SUBSTRINGS,
  ALLOW_SUBSTRINGS,
}
