import { splitAdviceIntoTips } from '../../../../lib/chatReadiness.js'
import {
  buildTacticalHistory,
  defaultCoachFallbacks,
  extractRosterNames,
  refineCoachSuggestions
} from '../../../../lib/coachSuggestionEngine.js'

export const HERO_LIMITS = Object.freeze({
  message: 4000,
  historyMessages: 14,
  historyContent: 3000,
  currentPage: 500,
  personalContext: 18000,
  diagnosticAgeMs: 6 * 60 * 60 * 1000
})

export const API_ERRORS = Object.freeze({
  AUTH_REQUIRED: { it: 'Autenticazione richiesta.', en: 'Authentication required' },
  AUTH_INVALID: { it: 'Autenticazione non valida o scaduta.', en: 'Invalid or expired authentication' },
  BODY_INVALID: { it: 'Corpo della richiesta non valido.', en: 'Invalid request body.' },
  MESSAGE_REQUIRED: { it: 'Il messaggio è obbligatorio.', en: 'Message is required.' },
  MESSAGE_TOO_LONG: { it: 'Messaggio troppo lungo. Riduci il testo.', en: 'Message too long. Please shorten it.' },
  RATE_LIMIT: { it: 'Troppe richieste. Riprova tra poco.', en: 'Rate limit exceeded. Please try again later.' },
  OPENAI_ERROR: { it: 'Errore nel servizio di risposta. Riprova.', en: 'Error calling AI service. Please try again.' },
  GENERIC_ERROR: { it: 'Errore durante la generazione della risposta.', en: 'Error generating response.' }
})

export function normalizeLanguage(value, fallback = 'it') {
  return ['it', 'en', 'es'].includes(value) ? value : fallback
}

export function requestLanguage(request) {
  const value = String(request?.headers?.['accept-language'] || '').toLowerCase()
  if (value.startsWith('it') || value.includes('it')) return 'it'
  return 'en'
}

export function apiError(key, lang) {
  const language = lang === 'it' ? 'it' : 'en'
  return API_ERRORS[key]?.[language] || API_ERRORS.GENERIC_ERROR[language]
}

export function validateHeroInput(body = {}) {
  const lang = normalizeLanguage(body.language)
  if (!body.message || typeof body.message !== 'string' || !body.message.trim()) {
    const error = new Error(apiError('MESSAGE_REQUIRED', lang))
    error.statusCode = 400
    error.lang = lang
    throw error
  }
  const message = body.message.trim()
  if (message.length > HERO_LIMITS.message) {
    const error = new Error(apiError('MESSAGE_TOO_LONG', lang))
    error.statusCode = 400
    error.lang = lang
    throw error
  }
  const currentPage = typeof body.currentPage === 'string'
    ? body.currentPage.slice(0, HERO_LIMITS.currentPage)
    : ''
  const allowed = [
    'completingMatch',
    'viewingMatch',
    'managingFormation',
    'viewingDashboard',
    'uploadingPlayer'
  ]
  const appState = body.appState && typeof body.appState === 'object'
    ? Object.fromEntries(allowed
      .filter((key) => Object.prototype.hasOwnProperty.call(body.appState, key))
      .map((key) => [key, Boolean(body.appState[key])]))
    : {}
  const history = buildTacticalHistory(body.history, HERO_LIMITS.historyMessages)
    .map(({ role, content }) => ({
      role,
      content: String(content || '').trim().slice(0, HERO_LIMITS.historyContent)
    }))
    .filter(({ content }) => content)
  return { message, currentPage, appState, history, lang }
}

export function parseSuggestions(content) {
  const normalized = String(content || '').trim()
  const marker = normalized.match(/\b(SUGGERIMENTI|Suggerimenti|Domande per approfondire|SUGGESTIONS|Suggestions)\s*:?\s*/i)
  if (!marker) return { cleanContent: normalized, suggestions: [] }
  const index = normalized.indexOf(marker[0])
  const before = normalized.slice(0, index).trim()
  const blockStart = Math.max(before.lastIndexOf('---'), before.lastIndexOf('\n\n'))
  const cleanContent = blockStart >= 0 ? before.slice(0, blockStart).trim() : before
  const suggestions = normalized.slice(index + marker[0].length)
    .split(/\n/)
    .map((line) => line.match(/^\s*(?:[123][.)]|[-?])\s*(.+)$/)?.[1]?.trim())
    .filter((value) => value && value.length > 2 && value.length < 120)
    .slice(0, 3)
  return { cleanContent, suggestions }
}

export function sanitizeCoachOutput(content, lang = 'it') {
  const markers = lang === 'en'
    ? ['i analyzed', 'i have analyzed', 'i cross-checked', 'i have cross']
    : ['ho analizzato', 'ho incrociato', 'ho valutato']
  const sentences = String(content || '').match(/[^.!?]+[.!?]?/g) || []
  const cleaned = sentences.map((sentence) => {
    let value = sentence
    for (const marker of markers) {
      value = value.replace(new RegExp(`\\b${marker}\\b.*`, 'i'), '')
    }
    return value.trim()
  }).filter(Boolean).join(' ').trim()
  return cleaned || String(content || '').trim()
}

function extractLinkUp(summary) {
  const name = String(summary || '').match(/Connection:\s*([^\n.]+)\./i)?.[1]?.trim()
  if (!name) return null
  return {
    name,
    focal: String(summary).match(/Focal Point[^:]*:\s*([^\n.]+)\./i)?.[1]?.trim() || '',
    keyMan: String(summary).match(/Key Man[^:]*:\s*([^\n.]+)\./i)?.[1]?.trim() || ''
  }
}

function groundLinkUp(message, summary, content, lang) {
  if (!/link[- ]?up|linkup|collegamento/i.test(message)) return content
  const facts = extractLinkUp(summary)
  if (!facts) return content
  const value = String(content || '').trim()
  if (value.toLowerCase().includes(facts.name.toLowerCase()) &&
      !/non risulta|non lo vedo|vedo solo|not in your context|i don't see|i only see/i.test(value)) {
    return value
  }
  const prefix = lang === 'en' ? 'Your active Link-up is' : 'Il tuo Link-up attivo è'
  return [
    `${prefix} ${facts.name}.`,
    facts.focal ? `Focal Point: ${facts.focal}.` : '',
    facts.keyMan ? `Key Man: ${facts.keyMan}.` : ''
  ].filter(Boolean).join(' ')
}

export function finalizeHeroReply({ rawContent, message, summary, lang, rosterNames = [] }) {
  const parsed = parseSuggestions(rawContent)
  const response = groundLinkUp(
    message,
    summary,
    sanitizeCoachOutput(parsed.cleanContent, lang),
    lang
  )
  const suggestions = refineCoachSuggestions(parsed.suggestions, {
    lang,
    rosterNames,
    max: 3,
    fallback: defaultCoachFallbacks(lang)
  })
  const tips = splitAdviceIntoTips(response, 3)
  return {
    response,
    suggestions,
    tips: tips.length > 1 ? tips : undefined,
    cards: tips.length > 1
      ? tips.map((tip) => ({ type: 'tip', ...tip }))
      : undefined
  }
}

export { extractRosterNames }
