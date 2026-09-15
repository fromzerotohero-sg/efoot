/**
 * Deduplica e filtra i CTA della coach: massimo 3, categorie diverse,
 * niente domande mascherate, tier list, uso app o nomi assenti dalla rosa.
 */

const FORBIDDEN = [
  /quale modulo/i,
  /which formation/i,
  /tier list/i,
  /meta generico/i,
  /perch[eé] ho perso/i,
  /why did i lose/i,
  /migliorare un giocatore/i,
  /improve a player/i,
  /\b(wizard|dashboard|menu|upload|tasto|pulsante|button)\b/i,
  /^\s*(come|perch[eé]|quale|cosa|what|why|which|how)\b/i
]

const STYLE_STOPWORDS = new Set([
  'hero', 'coach', 'pressing', 'possesso', 'contrattacco', 'formazione', 'fluida',
  'marcatura', 'difesa', 'attacco', 'rosa', 'partita', 'prossimo', 'titolari',
  'approfondisci', 'incrocia', 'prova', 'testa', 'allinea', 'sfrutta', 'variare',
  'explore', 'check', 'test', 'tell', 'dimmi', 'correzione', 'principale', 'attuale',
  'attuali', 'starters', 'match', 'next'
])

function normalizeMeaning(text = '') {
  return String(text || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

export function extractRosterNames(source) {
  if (Array.isArray(source)) {
    return source
      .map((item) => (typeof item === 'string' ? item : item?.player_name))
      .map((name) => String(name || '').trim())
      .filter(Boolean)
  }
  const names = []
  for (const line of String(source || '').split('\n')) {
    const match = line.match(/^\s+([A-ZÀ-Ü][^(|\n]{1,40})\s+\(/)
    if (match?.[1]) names.push(match[1].trim())
  }
  return names
}

export function mentionsUnknownPlayer(text, rosterNames = []) {
  if (!Array.isArray(rosterNames) || rosterNames.length === 0) return false
  const roster = rosterNames.map((name) => normalizeMeaning(name)).filter((name) => name.length >= 4)
  if (!roster.length) return false
  const proper = String(text || '').match(/\b[A-ZÀ-Ü][a-zà-ü]{3,}\b/g) || []
  for (let i = 0; i < proper.length; i += 1) {
    // First capitalized token is usually the imperative, not a player.
    if (i === 0) continue
    const key = normalizeMeaning(proper[i])
    if (key.length < 4 || STYLE_STOPWORDS.has(key)) continue
    const known = roster.some((name) => name.includes(key) || key.includes(name))
    if (!known) return true
  }
  return false
}

function classifySuggestion(text) {
  const n = normalizeMeaning(text)
  if (/(prossimo|next step|prova in partita|testa |check )/.test(n)) return 'next_test'
  if (/(rosa|titolar|panchina|sostitu|istruzione|formazione fluida|stile squadra)/.test(n)) return 'roster_match'
  return 'deepen'
}

export function refineCoachSuggestions(rawSuggestions = [], options = {}) {
  const {
    lang = 'it',
    rosterNames = [],
    max = 3,
    fallback = []
  } = options

  const seen = new Set()
  const byCategory = { deepen: [], roster_match: [], next_test: [] }
  const source = [...(Array.isArray(rawSuggestions) ? rawSuggestions : []), ...(Array.isArray(fallback) ? fallback : [])]

  for (const raw of source) {
    const text = String(raw || '').trim()
    if (text.length < 8 || text.length > 90) continue
    if (FORBIDDEN.some((re) => re.test(text))) continue
    if (mentionsUnknownPlayer(text, rosterNames)) continue
    const key = normalizeMeaning(text)
    if (!key || seen.has(key)) continue
    seen.add(key)
    byCategory[classifySuggestion(text)].push(text)
  }

  const picked = []
  for (const category of ['deepen', 'roster_match', 'next_test']) {
    if (byCategory[category][0]) picked.push(byCategory[category][0])
    if (picked.length >= max) break
  }
  if (picked.length < Math.min(2, max)) {
    for (const extra of [...byCategory.deepen, ...byCategory.roster_match, ...byCategory.next_test]) {
      if (!picked.includes(extra)) picked.push(extra)
      if (picked.length >= Math.min(max, 3)) break
    }
  }

  if (picked.length === 0) {
    return (Array.isArray(fallback) ? fallback : []).filter(Boolean).slice(0, max)
  }
  return picked.slice(0, max)
}

export function defaultCoachFallbacks(lang = 'it') {
  if (lang === 'en' || lang === 'es') {
    return [
      'Check this against your current starters',
      'Test the main correction in the next match',
      'Tell me what broke after you try it'
    ]
  }
  return [
    'Incrocia questo con i titolari attuali',
    'Prova la correzione principale nella prossima partita',
    'Dimmi cosa non ha tenuto dopo il test'
  ]
}

export function isExcludedFromTacticalHistory(message) {
  const kind = String(message?.kind || message?.payload?.kind || '')
  const workflowType = String(message?.workflowType || message?.payload?.workflowType || '')
  if (workflowType === 'feedback' || /feedback/i.test(kind)) return true
  if (kind.startsWith('workflow')) return true
  return false
}

export function buildTacticalHistory(messages, limit = 10) {
  return (Array.isArray(messages) ? messages : [])
    .filter((m) => !isExcludedFromTacticalHistory(m))
    .filter((m) => m.role === 'user' || ((m.role === 'hero' || m.role === 'assistant') && m.content))
    .slice(-limit)
    .map((m) => ({
      role: m.role === 'hero' || m.role === 'assistant' ? 'assistant' : 'user',
      content: m.content
    }))
}

export function formatTacticalFeedbackForPrompt(rows, lang = 'it') {
  if (!Array.isArray(rows) || !rows.length) return ''
  const isEn = lang === 'en' || lang === 'es'
  const lines = rows.slice(0, 5).map((row) => {
    const date = row?.created_at ? String(row.created_at).slice(0, 10) : '?'
    const outcome = row?.outcome ? String(row.outcome).trim() : ''
    const opp = row?.opponent_name ? String(row.opponent_name).trim() : ''
    const form = row?.formation_played ? String(row.formation_played).trim() : ''
    const style = row?.style_played ? String(row.style_played).trim() : ''
    const summary = String(row?.conversation_summary || '').replace(/\s+/g, ' ').trim().slice(0, 180)
    const insightsRaw = Array.isArray(row?.insights) ? row.insights : []
    const insights = insightsRaw
      .slice(0, 2)
      .map((item) => (typeof item === 'string' ? item : item?.issue || item?.text || ''))
      .map((item) => String(item).replace(/\s+/g, ' ').trim())
      .filter(Boolean)
      .join('; ')
    return `  ${date}${opp ? ` vs ${opp}` : ''}${outcome ? ` ${outcome}` : ''}${form ? ` form:${form}` : ''}${style ? ` stile:${style}` : ''}${summary ? ` — ${summary}` : ''}${insights ? ` [${insights}]` : ''}`
  })
  const header = isEn
    ? 'RECENT TACTICAL FEEDBACK (personal memory; do not quote this list back):'
    : 'FEEDBACK TATTICO RECENTE (memoria personale; non recitare l’elenco):'
  return `${header}\n${lines.join('\n')}`
}
