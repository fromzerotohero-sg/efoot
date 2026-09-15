import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { callOpenAIWithRetry } from '@/lib/openaiHelper'
import { checkRateLimit, RATE_LIMIT_CONFIG } from '@/lib/rateLimiter'
import { validateToken, extractBearerToken } from '@/lib/authHelper'
import { getRelevantSections, classifyQuestion } from '@/lib/ragHelper'
import { deductCredits, AI_COST, handleCreditOperationError } from '@/lib/creditService'
import { getCoachPoliciesText, getCoachSharedCoreText } from '@/lib/coachPromptRules'
import { getPlayerStyleDisplayName } from '@/lib/playingStyleResolve'
import { formatBuildCoachSnippet, formatBuildProgressionSection } from '@/lib/playerBuildCoachPrompt'
import { getPlayerDisplayStats } from '@/lib/playerEffectiveStats'
import { buildRosterSkillAdvisorySection, formatPlayerSkillContext } from '@/lib/rosterSkillsContext'
import { localizeSkillTermsInText } from '@/lib/playerSkillLabels.js'
import { buildCardAvailabilityBlock } from '@/lib/chatCardAvailability'
import { fieldPositionMatchesCardCompetences } from '@/lib/playerSlotRoleMetadata'
import { splitAdviceIntoTips } from '@/lib/chatReadiness'
import { formatCoachLinkUpsForPrompt, isRemovedIndividualInstruction } from '@/lib/efootballTruthLayer'
import {
  buildFluidFormationState,
  buildHeroFluidPromptBlock,
  formatCoachLinkUpsForHeroPrompt,
  formatHeroFluidContext,
  prependLiveFluidOverride,
  prependLiveLinkUpOverride,
  startersForLinkUpVerification
} from '@/lib/efootballV6TacticalModel'
import { getPlacementWarningLines, getPlacementWarningTitle } from '@/lib/playerFieldPlacement'
import {
  buildFallbackEnterpriseSubset,
  matchConnectionToRoster
} from '@/lib/diagnosticBuilder'
import { stripStaleDiagnosticSections } from '@/lib/diagnosticCacheSanitize'
import { buildMatchZonePromptBlock, formatCompactZonePair, resolveMatchAttackZones } from '@/lib/matchAttackZones'
import {
  buildTacticalHistory,
  defaultCoachFallbacks,
  extractRosterNames,
  formatTacticalFeedbackForPrompt,
  refineCoachSuggestions
} from '@/lib/coachSuggestionEngine'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** Limiti storia conversazione (sicurezza e token) */
const MAX_HISTORY_MESSAGES = 14
const MAX_HISTORY_CONTENT_LENGTH = 3000

/** Limite riassunto contesto personale (diagnostic da user_diagnostic_cache). Alzato a 18000 per evitare troncamento di build, sinergie, leve e skill advisory per utenti con rosa ampia. */
const MAX_PERSONAL_CONTEXT_CHARS = 18000

/** Limiti validazione input (sicurezza e token) */
const MAX_MESSAGE_LENGTH = 4000
const MAX_CURRENT_PAGE_LENGTH = 500
const DIAGNOSTIC_CACHE_MAX_AGE_MS = 6 * 60 * 60 * 1000

/** Messaggi errore API in doppia lingua (IT/EN) */
const API_ERRORS = {
  AUTH_REQUIRED: { it: 'Autenticazione richiesta.', en: 'Authentication required' },
  AUTH_INVALID: { it: 'Autenticazione non valida o scaduta.', en: 'Invalid or expired authentication' },
  BODY_INVALID: { it: 'Corpo della richiesta non valido.', en: 'Invalid request body.' },
  MESSAGE_REQUIRED: { it: 'Il messaggio è obbligatorio.', en: 'Message is required.' },
  MESSAGE_TOO_LONG: { it: 'Messaggio troppo lungo. Riduci il testo.', en: 'Message too long. Please shorten it.' },
  RATE_LIMIT: { it: 'Troppe richieste. Riprova tra poco.', en: 'Rate limit exceeded. Please try again later.' },
  CONFIG_MISSING: { it: 'Configurazione mancante.', en: 'Supabase configuration missing.' },
  OPENAI_KEY_MISSING: { it: 'Chiave API OpenAI non configurata.', en: 'OpenAI API key not configured.' },
  OPENAI_ERROR: { it: 'Errore nel servizio di risposta. Riprova.', en: 'Error calling AI service. Please try again.' },
  GENERIC_ERROR: { it: 'Errore durante la generazione della risposta.', en: 'Error generating response.' }
}

/**
 * Lingua preferita da richiesta (header Accept-Language). Usato quando il body non è ancora parsato (401, 429).
 * @param {Request} req
 * @returns {'it'|'en'}
 */
function getPreferredLanguageFromRequest(req) {
  const accept = req?.headers?.get?.('accept-language') || ''
  if (accept.toLowerCase().startsWith('it') || accept.includes('it')) return 'it'
  return 'en'
}

/**
 * Messaggio errore API in lingua (IT o EN).
 * @param {string} key - Chiave in API_ERRORS (es. 'AUTH_REQUIRED', 'MESSAGE_REQUIRED')
 * @param {'it'|'en'} lang
 * @returns {string}
 */
function getApiError(key, lang) {
  const entry = API_ERRORS[key]
  if (!entry) return API_ERRORS.GENERIC_ERROR[lang]
  return entry[lang] ?? entry.en
}

function sanitizeForPrompt(value, maxLen = 240) {
  if (value == null) return ''
  const s = String(value).replace(/\r\n|\r|\n/g, ' ').trim()
  return s.length > maxLen ? s.slice(0, maxLen) + '…' : s
}

/** CTA operative: niente domande, tier list o uso app. */
function getDefaultSuggestions(lang) {
  return defaultCoachFallbacks(lang)
}

/**
 * Estrae dal contenuto AI il blocco SUGGERIMENTI (3 consigli cliccabili) e restituisce testo pulito + array.
 * Parser robusto: accetta SUGGERIMENTI/Suggerimenti/Domande per approfondire, numerazione 1. 1) - ecc.
 * Rimuove dal testo visibile tutto dal marker in poi, così l'utente vede solo i 3 cliccabili.
 * @param {string} content - Testo completo risposta AI
 * @returns {{ cleanContent: string, suggestions: string[] }}
 */
function parseSuggestionsFromContent(content) {
  if (!content || typeof content !== 'string') return { cleanContent: (content || '').trim(), suggestions: [] }
  const normalized = content.trim()
  const suggMarkerMatch = normalized.match(/\b(SUGGERIMENTI|Suggerimenti|Domande per approfondire|SUGGESTIONS|Suggestions)\s*:?\s*/i)
  const idx = suggMarkerMatch ? normalized.indexOf(suggMarkerMatch[0]) + suggMarkerMatch[0].length : -1
  if (idx <= 0) return { cleanContent: normalized, suggestions: [] }
  const beforeMarker = normalized.slice(0, idx - (suggMarkerMatch ? suggMarkerMatch[0].length : 0)).trim()
  const blockStart = Math.max(beforeMarker.lastIndexOf('---'), beforeMarker.lastIndexOf('\n\n'))
  const head = blockStart >= 0 ? beforeMarker.slice(0, blockStart).trim() : beforeMarker
  const tail = normalized.slice(idx).trim()
  const lines = tail.split(/\n/).map(l => l.trim()).filter(Boolean)
  const suggestions = []
  for (const line of lines) {
    const m = line.match(/^\s*[123][.)]\s*(.+)$/) || line.match(/^\s*[-?]\s*(.+)$/)
    if (m) {
      const text = m[1].trim()
      if (text.length > 2 && text.length < 120) suggestions.push(text)
    }
    if (suggestions.length >= 3) break
  }
  return { cleanContent: head, suggestions: suggestions.slice(0, 3) }
}

/**
 * Enforce "final result only": remove explicit reasoning/explanations.
 * Keeps concise imperative output, strips causal clauses and questions.
 */
function sanitizeCoachOutput(content, lang = 'it') {
  if (!content || typeof content !== 'string') return content
  const markers = lang === 'en'
    ? ['i analyzed', 'i have analyzed', 'i cross-checked', 'i have cross']
    : ['ho analizzato', 'ho incrociato', 'ho valutato']

  const sentences = content.match(/[^.!?]+[.!?]?/g) || [content]
  const cleaned = []
  for (const s of sentences) {
    let out = s
    for (const m of markers) {
      const re = new RegExp(`\\b${m}\\b.*`, 'i')
      if (re.test(out)) out = out.replace(re, '')
    }
    out = out.trim()
    if (!out) continue
    cleaned.push(out)
  }
  const merged = cleaned.join(' ').trim()
  return merged.length > 0 ? merged : content.trim()
}

function detectContextGaps(summary = '') {
  const s = String(summary || '').toLowerCase()
  return {
    missingFormation: s.includes('modulo salvato: mancante') || s.includes('saved formation: missing') || s.includes('formation: not set'),
    missingCoach: s.includes('allenatore attivo: mancante') || s.includes('active coach: missing'),
    missingStats: s.includes('statistiche analisi efootball: mancanti') || s.includes('latest game-analysis stats: missing') || s.includes('game-analysis stats: missing')
  }
}

function getMicroReminderText(lang = 'it', summary = '') {
  const gaps = detectContextGaps(summary)
  if (gaps.missingFormation) {
    return lang === 'en'
      ? 'Quick reminder: complete your formation setup to get more precise coaching.'
      : 'Promemoria rapido: completa la formazione per avere consigli molto più precisi.'
  }
  if (gaps.missingCoach) {
    return lang === 'en'
      ? 'Quick reminder: set your active coach to align advice with your team style.'
      : 'Promemoria rapido: imposta un coach attivo per allineare meglio i consigli al tuo stile squadra.'
  }
  if (gaps.missingStats) {
    return lang === 'en'
      ? 'Quick reminder: updating game stats makes tactical corrections much more accurate.'
      : 'Promemoria rapido: aggiornare le statistiche rende le correzioni tattiche molto più accurate.'
  }
  return ''
}

function shouldAttachMicroReminder({ history = [], summary = '', message = '' }) {
  if (!summary) return false
  if (!getMicroReminderText('it', summary) && !getMicroReminderText('en', summary)) return false

  const userTurns = Array.isArray(history) ? history.filter(h => h?.role === 'user').length + 1 : 1
  const frequencyGate = userTurns > 1 && userTurns % 8 === 0
  if (!frequencyGate) return false

  const text = String(message || '').toLowerCase()
  if (!text) return true
  if (text.includes('promemoria') || text.includes('ricord') || text.includes('guide') || text.includes('mostrami come') || text.includes('help') || text.includes('how')) {
    return false
  }
  return true
}

function appendMicroReminder(content = '', reminder = '') {
  const base = String(content || '').trim()
  const tail = String(reminder || '').trim()
  if (!tail) return base
  if (!base) return tail
  if (base.toLowerCase().includes(tail.toLowerCase())) return base
  return `${base}\n\n${tail}`
}

function isLinkUpQuestion(message = '') {
  const s = String(message || '').toLowerCase()
  if (!s) return false
  return (
    s.includes('link-up') ||
    s.includes('link up') ||
    s.includes('linkup') ||
    s.includes('collegamento')
  )
}

function extractLinkUpFacts(summary = '') {
  const text = String(summary || '')
  if (!text) return null
  const nameMatch = text.match(/Connection:\s*([^\n.]+)\./i)
  if (!nameMatch?.[1]) return null

  const focalMatch = text.match(/Focal Point[^:]*:\s*([^\n.]+)\./i)
  const keyManMatch = text.match(/Key Man[^:]*:\s*([^\n.]+)\./i)

  return {
    name: String(nameMatch[1] || '').trim(),
    focal: String(focalMatch?.[1] || '').trim(),
    keyMan: String(keyManMatch?.[1] || '').trim()
  }
}

function buildLinkUpGroundedReply(lang = 'it', facts = null) {
  if (!facts?.name) return ''
  if (lang === 'en') {
    const focalLine = facts.focal ? `Focal Point: ${facts.focal}.` : ''
    const keyLine = facts.keyMan ? `Key Man: ${facts.keyMan}.` : ''
    return [
      `Your active Link-up is ${facts.name}.`,
      focalLine,
      keyLine
    ].filter(Boolean).join(' ')
  }
  const focalLine = facts.focal ? `Focal Point: ${facts.focal}.` : ''
  const keyLine = facts.keyMan ? `Key Man: ${facts.keyMan}.` : ''
  return [
    `Il tuo Link-up attivo è ${facts.name}.`,
    focalLine,
    keyLine
  ].filter(Boolean).join(' ')
}

function enforceLinkUpGrounding({ message = '', summary = '', content = '', lang = 'it' }) {
  if (!isLinkUpQuestion(message)) return String(content || '').trim()
  const facts = extractLinkUpFacts(summary)
  if (!facts?.name) return String(content || '').trim()

  const out = String(content || '').trim()
  const low = out.toLowerCase()
  const hasName = low.includes(String(facts.name).toLowerCase())
  const contradictsKnownData = (
    low.includes('non risulta') ||
    low.includes('non lo vedo') ||
    low.includes('vedo solo') ||
    low.includes('not in your context') ||
    low.includes("i don't see") ||
    low.includes('i only see')
  )

  if (contradictsKnownData || !hasName) {
    return buildLinkUpGroundedReply(lang, facts)
  }
  return out
}

function localizeCoachReplyText(text, lang = 'it') {
  if (lang !== 'it') return String(text || '')
  return localizeSkillTermsInText(String(text || ''), 'it')
}

function finalizeCoachSuggestions(parsed, lang, rosterNames) {
  return refineCoachSuggestions(parsed, {
    lang,
    rosterNames,
    max: 3,
    fallback: getDefaultSuggestions(lang)
  }).map((s) => localizeCoachReplyText(s, lang))
}

function finalizeCoachReply({ content = '', message = '', summary = '', lang = 'it', reminder = '' }) {
  const grounded = enforceLinkUpGrounding({ message, summary, content, lang })
  const localized = localizeCoachReplyText(grounded, lang)
  return appendMicroReminder(localized, reminder)
}

/**
 * Normalizza e valida history conversazione (enterprise: limiti e sanitizzazione).
 * @param {unknown} raw - Array da body (può essere undefined o non-array)
 * @returns {{ role: 'user'|'assistant', content: string }[]}
 */
function normalizeHistory(raw) {
  if (!Array.isArray(raw) || raw.length === 0) return []
  const tactical = buildTacticalHistory(raw, MAX_HISTORY_MESSAGES)
  const out = []
  for (const item of tactical) {
    const role = item.role === 'assistant' ? 'assistant' : item.role === 'user' ? 'user' : null
    if (!role) continue
    let content = typeof item.content === 'string' ? item.content.trim() : ''
    if (content.length > MAX_HISTORY_CONTENT_LENGTH) content = content.slice(0, MAX_HISTORY_CONTENT_LENGTH)
    if (content.length === 0) continue
    out.push({ role, content })
  }
  return out
}

function formatCompetencePositions(originalPositions) {
  if (!Array.isArray(originalPositions) || originalPositions.length === 0) return ''
  return originalPositions
    .map((p) => {
      if (typeof p === 'string') return p.trim()
      if (!p?.position) return ''
      return p.competence ? `${p.position} ${p.competence}` : p.position
    })
    .filter(Boolean)
    .join(', ')
}

function getOutOfPositionStarterLines(players, lang = 'it') {
  const starters = (Array.isArray(players) ? players : [])
    .filter(p => p?.slot_index != null && p.slot_index >= 0 && p.slot_index <= 10)
    .sort((a, b) => (Number(a.slot_index) || 0) - (Number(b.slot_index) || 0))

  const lines = []
  for (const p of starters) {
    const current = String(p?.position || '').trim().toUpperCase()
    const originals = Array.isArray(p?.original_positions) ? p.original_positions : []
    if (!current || originals.length === 0) continue
    if (fieldPositionMatchesCardCompetences(current, originals)) continue
    const comp = formatCompetencePositions(originals) || ((lang === 'en' || lang === 'es') ? 'not set' : 'non impostate')
    const slot = p.slot_index != null ? ` slot ${p.slot_index}` : ''
    lines.push(`- ${p.player_name || '?'}${slot}: in campo ${current}; competenze card ${comp}`)
  }
  return lines
}

/**
 * Costruisce contesto personale per AI
 */
async function buildAssistantContext(userId, currentPage, appState) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  
  if (!serviceKey || !supabaseUrl) return null
  
  try {
    const admin = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    })
    
    // Recupera profilo utente (nome, team, preferenze, Informazioni IA)
    const { data: profile } = await admin
      .from('user_profiles')
      .select('first_name, team_name, ai_name, how_to_remember, common_problems, ai_weak_point, ai_learn_goals, ai_notes')
      .eq('user_id', userId)
      .maybeSingle()
    
    return {
      profile: profile || {},
      currentPage: currentPage || '',
      appState: appState || {}
    }
  } catch (error) {
    console.error('[assistant-chat] Error building context:', error)
    return null
  }
}

/** Label contesto bilingue (IT/EN) - usate dall'IA per interpretare dati */
const CONTEXT_LABELS = {
  it: {
    formationNotSet: 'non impostata',
    reserves: 'Riserve',
    noMatches: 'Nessuna partita caricata.',
    starters: 'TITOLARI IN CAMPO (slot 0-10):',
    reservesNote: 'LE RISERVE sono in panchina: usale per sostituzioni. Consiglia solo giocatori di questo elenco e solo per ruoli compatibili con la loro position.',
    lastMatches: 'ULTIME PARTITE GIOCATE:',
    patternMatches: 'Pattern partite',
    partite: 'partite',
    vittorie: 'vittorie',
    recurringIssues: 'Problemi ricorrenti',
    skillsTitolari: 'SKILLS TITOLARI (per consigli abilità):',
    activeCoach: 'Allenatore attivo',
    coachNotSet: 'Nessun allenatore attivo impostato.',
    competenceHint: 'Competenze stili TATTICI (stili distinti: Contropiede veloce = Quick Counter ≠ Contrattacco = Long Ball Counter; chiave dati legacy "contrattacco" = valore storico di Contropiede veloce; solo >= 70 consigliabili):',
    boxTitle: 'CONTESTO PERSONALE CLIENTE - DATI REALI DELLA ROSA',
    boxSubtitle: 'USA QUESTI DATI - PERSONALIZZA - CITA NOMI REALI - NON GENERICO',
    positionNote: 'POSIZIONE: per ogni giocatore vedi "position" (ruolo assegnato in formazione) e "competenze" (posizioni ideali dalla card, es. CC Alta, MED Intermedia). Se position è diverso dalle competenze (es. competenze=CC Alta ma position=DC), CORREGGI: "X è centrocampista (CC) dalla card, non DC. Meglio schierarlo come CC o cambiare ruolo in Gestione Formazione." Siamo noi i coach: non assecondare l\'errore del cliente.',
    statsNote: 'STATS: vel, acc, res, fin, pas, tac (RAG §1). forma:↑=ottima, forma:↓=bassa. h/w=altezza/peso (duelli aerei). ABILITÀ: elencate. Usa stili+stats+abilità+forma+h/w per ragionamento. Ogni dato ha utilità.',
    teamStyle: 'Stile squadra',
    individualInstructions: 'Istruzioni individuali',
    instructionsActive: 'attive',
    advisableStyles: 'Consigliabili (>=70)',
    notAdvisableStyles: 'Non consigliabili (<70)',
    noneLabel: 'nessuno',
    dispositionInField: 'Disposizione in campo',
  },
  en: {
    formationNotSet: 'not set',
    reserves: 'Reserves',
    noMatches: 'No matches loaded.',
    starters: 'STARTERS (slot 0-10):',
    reservesNote: 'RESERVES are on the bench: use them for substitutions. Only recommend players from this list and only for roles compatible with their position.',
    lastMatches: 'LAST MATCHES PLAYED:',
    patternMatches: 'Match patterns',
    partite: 'matches',
    vittorie: 'wins',
    recurringIssues: 'Recurring issues',
    skillsTitolari: 'STARTER SKILLS (for ability advice):',
    activeCoach: 'Active coach',
    coachNotSet: 'No active coach set.',
    competenceHint: 'Style competences (distinct styles: Quick Counter (Contropiede veloce) ≠ Long Ball Counter (Contrattacco); legacy data key "contrattacco" = historical Quick Counter value; only >= 70 advisable):',
    boxTitle: 'PERSONAL CLIENT CONTEXT - REAL ROSA DATA',
    boxSubtitle: 'USE THIS DATA - PERSONALIZE - CITE REAL NAMES - NOT GENERIC',
    positionNote: 'POSITION: for each player see "position" (assigned role) and "competenze" (ideal positions from card, e.g. CM High, DM Intermediate). If position differs from competenze (e.g. competenze=CM High but position=CB), CORRECT: "X is midfielder (CM) from card, not CB. Better field him as CM or change role in Formation Manager." We are the coaches: do not indulge client errors.',
    statsNote: 'STATS (if present): vel=Speed, acc=Acceleration, res=Stamina (RAG §1), fin=Finishing, pas=Passing, tac=Tackling. SKILLS: listed in roster. Use styles + stats + skills for tactical reasoning.',
    teamStyle: 'Team style',
    individualInstructions: 'Individual instructions',
    instructionsActive: 'active',
    advisableStyles: 'Advisable (>=70)',
    notAdvisableStyles: 'Not advisable (<70)',
    noneLabel: 'none',
    dispositionInField: 'Lineup on pitch',
  }
}

/**
 * Costruisce riassunto contesto personale cliente (formazione, rosa, partite, tattica, allenatore).
 * Sempre invocato: la chat è solo consulenza tattica sul cliente. In errore restituisce ''.
 * @param {string} userId - user_id da token
 * @param {'it'|'en'} lang - lingua per label (default 'it')
 * @returns {Promise<string>} Testo compatto (max MAX_PERSONAL_CONTEXT_CHARS) o ''
 */
async function buildPersonalContext(userId, lang = 'it') {
  const L = CONTEXT_LABELS[(lang === 'en' || lang === 'es') ? 'en' : 'it']
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceKey || !supabaseUrl) return ''

  try {
    const admin = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    })

    // Batch delle query indipendenti: una sola Promise.all per ridurre la latenza pre-OpenAI.
    // Le query sulle formazioni avversarie restano dopo (dipendono dai match caricati).
    const [
      { data: formationRow },
      { data: variantRows },
      playersResult,
      { data: stylesData },
      { data: gameAnalysisRow },
      { data: matchesData },
      { data: tacticalRow },
      { data: coachRow },
      { data: patternsRow },
      { data: latestPrematchPlan }
    ] = await Promise.all([
      // Formation layout (base). Fluid phases live in formation_variants.
      admin
        .from('formation_layout')
        .select('formation, slot_positions')
        .eq('user_id', userId)
        .maybeSingle(),
      admin
        .from('formation_variants')
        .select('id, phase, formation, slot_positions, is_active')
        .eq('user_id', userId)
        .in('phase', ['attack', 'defense'])
        .eq('is_active', true),
      // Players (titolari + riserve) - include skills, forma, altezza/peso per ragionamento enterprise
      admin
        .from('players')
        .select('id, player_name, position, overall_rating, playing_style_id, role, slot_index, photo_slots, base_stats, original_positions, card_type, skills, com_skills, form, height, weight, extracted_data, metadata, development_points')
        .eq('user_id', userId)
        .order('slot_index', { ascending: true, nullsFirst: false })
        .limit(50),
      // Playing styles lookup
      admin.from('playing_styles').select('id, name'),
      // Game analysis (statistiche di gioco cliente)
      admin
        .from('user_game_analysis')
        .select('stats, captured_at')
        .eq('user_id', userId)
        .maybeSingle(),
      // Matches (ultime 10) - con formazione avversario, voti, zone attacco (enterprise)
      admin
        .from('matches')
        .select('opponent_name, result, formation_played, playing_style_played, match_date, opponent_formation_id, player_ratings, attack_areas, team_stats, is_home')
        .eq('user_id', userId)
        .order('match_date', { ascending: false })
        .limit(10),
      // Team tactical settings
      admin
        .from('team_tactical_settings')
        .select('team_playing_style, individual_instructions')
        .eq('user_id', userId)
        .maybeSingle(),
      // Allenatore attivo (con competenze stili per intreccio dati)
      admin
        .from('coaches')
        .select('coach_name, playing_style_competence, connection, extracted_data, metadata')
        .eq('user_id', userId)
        .eq('is_active', true)
        .maybeSingle(),
      // Pattern tattici (formation_usage, recurring_issues) - per intreccio consigli formazione/problemi
      admin
        .from('team_tactical_patterns')
        .select('formation_usage, playing_style_usage, recurring_issues, attack_areas_avg, our_attack_areas_avg, opponent_attack_areas_avg, conceded_goal_zones_avg, recovery_zones_avg')
        .eq('user_id', userId)
        .maybeSingle(),
      // Ultimo piano: rende contestuali i follow-up cliccabili della card.
      admin
        .from('prematch_plans')
        .select('countermeasures, created_at')
        .eq('user_id', userId)
        .eq('status', 'ready')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()
    ])
    const clientFluid = buildFluidFormationState(formationRow, variantRows || [])

    const { data: playersData, error: playersError } = playersResult
    if (playersError) {
      console.error('[assistant-chat] buildPersonalContext players error:', playersError.message)
      return ''
    }
    const roster = playersData || []

    // Lookup rapido player_id -> nome (per istruzioni individuali)
    const playerNameById = {}
    for (const p of roster) {
      if (p?.id) playerNameById[String(p.id)] = p.player_name || '?'
    }

    // Playing styles lookup (da batch iniziale)
    const stylesLookup = {}
    if (stylesData) {
      stylesData.forEach(s => { stylesLookup[s.id] = s.name || '' })
    }

    // Profilazione: card, statistiche, abilita/booster da photo_slots
    function getProfilazione(photoSlots) {
      if (!photoSlots || typeof photoSlots !== 'object') return 'incompleta (0-1/3)'
      const card = photoSlots.card === true || photoSlots.card === 'true'
      const stats = photoSlots.statistiche === true || photoSlots.statistiche === 'true'
      const skills = photoSlots.abilita === true || photoSlots.abilita === 'true' || photoSlots.booster === true || photoSlots.booster === 'true'
      const count = [card, stats, skills].filter(Boolean).length
      return count === 3 ? 'completa (3/3)' : count === 2 ? 'parziale (2/3)' : 'incompleta (0-1/3)'
    }
    function getCompetenze(originalPositions) {
      if (!Array.isArray(originalPositions) || originalPositions.length === 0) return 'non impostate'
      return originalPositions
        .map(p => (p.position && p.competence ? `${p.position} ${p.competence}` : null))
        .filter(Boolean)
        .join(', ') || 'non impostate'
    }

    /** Statistiche chiave per ragionamento tattico (RAG §1). Formato compatto. */
    function formatStatsForContext(baseStats) {
      if (!baseStats || typeof baseStats !== 'object') return ''
      const a = baseStats.athleticism || {}
      const atk = baseStats.attacking || {}
      const def = baseStats.defending || {}
      const parts = []
      if (a.speed != null) parts.push(`vel ${a.speed}`)
      if (a.acceleration != null) parts.push(`acc ${a.acceleration}`)
      if (a.stamina != null) parts.push(`res ${a.stamina}`)
      if (atk.finishing != null) parts.push(`fin ${atk.finishing}`)
      const pas = atk.low_pass ?? atk.lofted_pass
      if (pas != null) parts.push(`pas ${pas}`)
      if (def.tackling != null) parts.push(`tac ${def.tackling}`)
      return parts.length > 0 ? parts.join(' ') : ''
    }
    /** Forma (frecce): ↑=su, ↓=giù, -=neutro. Utile: scelta titolari/riserve. */
    function formatFormForContext(form) {
      if (!form || typeof form !== 'string') return ''
      const f = String(form).toLowerCase().trim()
      if (f === 'a' || f.includes('incrollabile')) return 'forma:↑'
      if (f === 'b' || f.includes('eccellente')) return 'forma:↓'
      return ''
    }
    /** Altezza/peso: utile duelli aerei, Colpo di testa. Compatto. */
    function formatPhysForContext(height, weight) {
      if (height == null && weight == null) return ''
      const parts = []
      if (height != null) parts.push(`h${height}`)
      if (weight != null) parts.push(`w${weight}`)
      return parts.length > 0 ? ` ${parts.join(' ')}` : ''
    }

    const titolari = roster
      .filter(p => p.slot_index != null && p.slot_index >= 0 && p.slot_index <= 10)
      .sort((a, b) => (Number(a.slot_index) || 0) - (Number(b.slot_index) || 0))
    const riserve = roster.filter(p => p.slot_index == null)

    let rosterLines = []
    const outOfPositionLines = getOutOfPositionStarterLines(titolari, lang)
    if (outOfPositionLines.length > 0) {
      rosterLines.push(lang === 'en'
        ? 'OUT OF POSITION STARTERS (fix FIT before other changes):'
        : 'TITOLARI FUORI POSIZIONE (correggi FIT prima di altri cambi):')
      rosterLines.push(...outOfPositionLines.map(line => `  ${line}`))
    }
    for (const p of titolari) {
      const styleName = getPlayerStyleDisplayName(p, stylesLookup) || (p.playing_style_id && stylesLookup[p.playing_style_id]) || (p.role ? String(p.role).trim() : '') || '-'
      const prof = getProfilazione(p.photo_slots)
      const comp = getCompetenze(p.original_positions)
      const statsStr = formatStatsForContext(getPlayerDisplayStats(p))
      const formStr = formatFormForContext(p.form)
      const physStr = formatPhysForContext(p.height, p.weight)
      const skillsStr = (() => {
        const ctx = formatPlayerSkillContext(p, lang)
        return ctx ? ` | ${ctx}` : ''
      })()
      const statsPart = statsStr ? ` | stats: ${statsStr}` : ''
      const extra = [formStr, physStr].filter(Boolean).join(' ')
      const buildSnip = formatBuildCoachSnippet(p, lang)
      rosterLines.push(`  ${p.player_name || '?'} (${p.position || '?'}, ${styleName}, ${p.overall_rating ?? '-'}${statsPart}${extra ? ' | ' + extra : ''} | profilazione: ${prof}, competenze: ${comp}${skillsStr}${buildSnip})`)
    }
    const reservesHeader = L.reserves + ':'
    rosterLines.push(reservesHeader)
    for (const p of riserve.slice(0, 15)) {
      const styleName = getPlayerStyleDisplayName(p, stylesLookup) || (p.playing_style_id && stylesLookup[p.playing_style_id]) || (p.role ? String(p.role).trim() : '') || '-'
      const prof = getProfilazione(p.photo_slots)
      const comp = getCompetenze(p.original_positions)
      const statsStr = formatStatsForContext(getPlayerDisplayStats(p))
      const formStr = formatFormForContext(p.form)
      const physStr = formatPhysForContext(p.height, p.weight)
      const skillsStr = (() => {
        const ctx = formatPlayerSkillContext(p, lang)
        return ctx ? ` | ${ctx}` : ''
      })()
      const statsPart = statsStr ? ` | stats: ${statsStr}` : ''
      const extra = [formStr, physStr].filter(Boolean).join(' ')
      const buildSnip = formatBuildCoachSnippet(p, lang)
      rosterLines.push(`  ${p.player_name || '?'} (${p.position || '?'}, ${styleName}, ${p.overall_rating ?? '-'}${statsPart}${extra ? ' | ' + extra : ''} | profilazione: ${prof}, competenze: ${comp}${skillsStr}${buildSnip})`)
    }
    if (riserve.length > 15) rosterLines.push(`  ... altri ${riserve.length - 15} riserve`)

    const buildProgressionBlock = formatBuildProgressionSection(roster, lang)

    const skillAdvisoryBlock = buildRosterSkillAdvisorySection(roster, gameAnalysisRow, lang)

    // Disposizione: preferisci formation_layout.formation se presente; altrimenti ricostruisci da titolari
    const positionsOrdered = titolari.map(p => (p.position || '?').trim() || '?').join(', ')
    const DEF = ['DC', 'TD', 'TS']
    const MID = ['MED', 'CC', 'TRQ', 'CLS', 'CLD']
    const FWD = ['P', 'SP', 'CF']
    const counts = { pt: 0, def: 0, mid: 0, fwd: 0 }
    titolari.forEach(p => {
      const pos = (p.position || '').toUpperCase().trim()
      if (pos === 'PT') counts.pt += 1
      else if (DEF.includes(pos)) counts.def += 1
      else if (MID.includes(pos)) counts.mid += 1
      else if (FWD.includes(pos)) counts.fwd += 1
    })
    const summaryParts = []
    if (counts.pt) summaryParts.push((lang === 'en' || lang === 'es') ? '1 GK' : '1 PT')
    if (counts.def) summaryParts.push((lang === 'en' || lang === 'es') ? `${counts.def} defenders` : `${counts.def} difensori`)
    if (counts.mid) summaryParts.push((lang === 'en' || lang === 'es') ? `${counts.mid} midfield` : `${counts.mid} centrocampo`)
    if (counts.fwd) summaryParts.push((lang === 'en' || lang === 'es') ? `${counts.fwd} forwards` : `${counts.fwd} attaccanti`)
    const dispositionSummary = summaryParts.length ? ` (${summaryParts.join(', ')})` : ''
    const baseFormationName = formationRow?.formation?.trim() || ''
    const dispositionLine = baseFormationName
      ? `${L.dispositionInField}: ${baseFormationName}${dispositionSummary}. Slot: ${positionsOrdered || L.formationNotSet}.`
      : `${L.dispositionInField}: ${positionsOrdered || L.formationNotSet}.${dispositionSummary}`

    // Matches (ultime 10, da batch iniziale) - con formazione avversario, voti, zone attacco (enterprise)
    const matches = matchesData || []
    // Fetch opponent formations for matches that have opponent_formation_id
    const oppIds = [...new Set(matches.map(m => m.opponent_formation_id).filter(Boolean))]
    let oppFormationsMap = {}
    if (oppIds.length > 0) {
      const { data: oppData } = await admin
        .from('opponent_formations')
        .select('id, formation_name, playing_style')
        .in('id', oppIds)
      if (oppData) oppData.forEach(o => { oppFormationsMap[o.id] = o })
    }
    const matchLines = matches.length === 0
      ? [L.noMatches]
      : matches.map(m => {
          const d = m.match_date ? (typeof m.match_date === 'string' ? m.match_date.slice(0, 10) : String(m.match_date).slice(0, 10)) : '?'
          const opp = oppFormationsMap[m.opponent_formation_id]
          const vsForm = opp?.formation_name ? ` vs ${opp.formation_name}${opp?.playing_style ? '/' + opp.playing_style : ''}` : ''
          let votiStr = ''
          const pr = m.player_ratings
          if (pr && typeof pr === 'object') {
            const cliente = pr.cliente || pr
            if (cliente && typeof cliente === 'object') {
              const entries = Object.entries(cliente).slice(0, 4).map(([n, v]) => `${n} ${v?.rating ?? v}`).filter(Boolean)
              if (entries.length) votiStr = ` [voti: ${entries.join(', ')}]`
            }
          }
          const split = resolveMatchAttackZones(m.attack_areas, m.is_home)
          const zonesStr = formatCompactZonePair(split.ours, split.theirs)
          return `  ${d} vs ${m.opponent_name || '?'} ${m.result || '-'} (form: ${m.formation_played || '-'}, stile: ${m.playing_style_played || '-'}${vsForm})${votiStr}${zonesStr}`
        })

    // Team tactical settings (da batch iniziale)
    const teamStyle = tacticalRow?.team_playing_style || L.formationNotSet
    const indInstr = tacticalRow?.individual_instructions
    const numInstructions = Array.isArray(indInstr) ? indInstr.length : (indInstr && typeof indInstr === 'object' ? Object.keys(indInstr).length : 0)

    // Dettaglio istruzioni individuali: necessario per rispondere quando l'utente chiede "quali istruzioni ho?"
    function formatIndividualInstructions(instr) {
      if (!instr || typeof instr !== 'object') return ''
      const entries = Object.entries(instr)
        .map(([slot, v]) => ({ slot, v }))
        .filter(({ v }) => v && typeof v === 'object' && v.enabled === true && v.instruction && !isRemovedIndividualInstruction(v.instruction))

      if (entries.length === 0) return ''
      const lines = entries.slice(0, 8).map(({ slot, v }) => {
        const pid = v.player_id ? String(v.player_id) : ''
        const pName = pid && playerNameById[pid] ? playerNameById[pid] : (pid ? `player:${pid.slice(0, 8)}` : '?')
        const instrName = String(v.instruction || '').trim()
        return `  - ${slot}: ${instrName} → ${pName}`
      })
      const more = entries.length > 8 ? `\n  ... +${entries.length - 8}` : ''
      return `\n${L.individualInstructions}:\n${lines.join('\n')}${more}`
    }

    const tacticsText = `${L.teamStyle}: ${teamStyle}. ${L.individualInstructions}: ${numInstructions} ${L.instructionsActive}.${formatIndividualInstructions(indInstr)}`

    const latestCustomerPlan = latestPrematchPlan?.countermeasures?.customer_plan || null
    const latestPrematchText = (() => {
      if (!latestCustomerPlan) return ''
      const read = latestCustomerPlan.opponent_read || {}
      const setupActions = Array.isArray(latestCustomerPlan.setup_actions)
        ? latestCustomerPlan.setup_actions
            .map((action) => `${action?.label || ''}: ${action?.value || ''}`.trim())
            .filter(Boolean)
            .slice(0, 5)
            .join('; ')
        : ''
      const playbook = latestCustomerPlan.playbook || {}
      const planB = latestCustomerPlan.plan_b || {}
      return [
        (lang === 'en' || lang === 'es') ? 'LATEST PRE-MATCH PLAN:' : 'ULTIMO PIANO PRE-PARTITA:',
        `  Avversario: ${[read.formation, read.trait].filter(Boolean).join(' · ') || '?'}`,
        `  Decisione: ${latestCustomerPlan.main_decision || latestCustomerPlan.diagnosis || '?'}`,
        setupActions ? `  Setup: ${setupActions}` : '',
        playbook.with_ball ? `  Con palla: ${playbook.with_ball}` : '',
        playbook.without_ball ? `  Senza palla: ${playbook.without_ball}` : '',
        planB.action ? `  Piano B: se ${planB.trigger || 'cambia il contesto'} → ${planB.action}` : '',
        '  Se la domanda del cliente è un follow-up sul piano, rispondi su QUESTO piano senza rigenerarlo o parlare in astratto.'
      ].filter(Boolean).join('\n')
    })()

    // Allenatore attivo (da batch iniziale, con competenze stili per intreccio dati)
    let coachText = coachRow?.coach_name ? `${L.activeCoach}: ${coachRow.coach_name}.` : L.coachNotSet
    if (coachRow?.playing_style_competence && typeof coachRow.playing_style_competence === 'object') {
      const entries = Object.entries(coachRow.playing_style_competence)
        .map(([style, val]) => ({ style, val: parseInt(val, 10) || 0 }))
        .filter(({ val }) => !Number.isNaN(val))
        .sort((a, b) => b.val - a.val)
        .slice(0, 8)
      if (entries.length > 0) {
        const ok = entries.filter(({ val }) => val >= 70).map(({ style, val }) => `${style}=${val}`)
        const no = entries.filter(({ val }) => val < 70).map(({ style, val }) => `${style}=${val}`)
        coachText += ` ${L.competenceHint} ${L.advisableStyles}: ${ok.length ? ok.join(', ') : L.noneLabel}. ${L.notAdvisableStyles}: ${no.length ? no.join(', ') : '-'}.`
      }
    }
    const linkUpLine = formatCoachLinkUpsForHeroPrompt({
      coach: coachRow,
      starters: startersForLinkUpVerification(titolari, clientFluid),
      stylesLookup,
      lang
    }) || formatCoachLinkUpsForPrompt(coachRow, lang)
    if (linkUpLine) coachText += ` ${linkUpLine}`
    const connMatch = coachRow?.connection
      ? matchConnectionToRoster(coachRow.connection, startersForLinkUpVerification(titolari, clientFluid), stylesLookup)
      : null
    if (connMatch) {
      const focalNames = (connMatch.focal || []).map((p) => p.player_name).filter(Boolean).slice(0, 3)
      const keyNames = (connMatch.keyMan || []).map((p) => p.player_name).filter(Boolean).slice(0, 3)
      if (focalNames.length) coachText += ` Focal Point compatibili: ${focalNames.join(', ')}.`
      else if (connMatch.focalReq) coachText += ` Focal Point richiesto (${connMatch.focalReq}): nessun match in rosa.`
      if (keyNames.length) coachText += ` Key Man compatibili: ${keyNames.join(', ')}.`
      else if (connMatch.keyManReq) coachText += ` Key Man richiesto (${connMatch.keyManReq}): nessun match in rosa.`
    }

    // Pattern tattici (da batch iniziale, formation_usage, playing_style_usage, recurring_issues)
    let patternText = ''
    if (patternsRow) {
      const formUsage = patternsRow.formation_usage && typeof patternsRow.formation_usage === 'object' && Object.keys(patternsRow.formation_usage).length > 0
      const styleUsage = patternsRow.playing_style_usage && typeof patternsRow.playing_style_usage === 'object' && Object.keys(patternsRow.playing_style_usage).length > 0
      const issues = Array.isArray(patternsRow.recurring_issues) && patternsRow.recurring_issues.length > 0
      if (formUsage) {
        const top = Object.entries(patternsRow.formation_usage)
          .sort((a, b) => (b[1]?.matches || 0) - (a[1]?.matches || 0))
          .slice(0, 2)
        patternText = top.map(([f, d]) => {
          const m = d?.matches || 0
          const wr = d?.win_rate != null ? Math.round(d.win_rate * 100) : '-'
          return `${f}: ${m} ${L.partite} (${wr}% ${L.vittorie})`
        }).join('; ')
        patternText = `${L.patternMatches}: ${patternText}.`
      }
      if (styleUsage) {
        const topStyles = Object.entries(patternsRow.playing_style_usage)
          .sort((a, b) => (b[1]?.matches || 0) - (a[1]?.matches || 0))
          .slice(0, 2)
          .map(([style, d]) => {
            const m = d?.matches || 0
            const wr = d?.win_rate != null ? Math.round(d.win_rate * 100) : '-'
            return `${style}: ${m} ${L.partite} (${wr}% ${L.vittorie})`
          })
          .join('; ')
        if (topStyles) {
          patternText += (patternText ? ' ' : '') + `${(lang === 'en' || lang === 'es') ? 'Style usage' : 'Uso stili'}: ${topStyles}.`
        }
      }
      if (issues) {
        const issueList = patternsRow.recurring_issues.slice(0, 3).map(i => i?.issue || i).filter(Boolean).join(', ')
        patternText += (patternText ? ' ' : '') + `${L.recurringIssues}: ${issueList}.`
      }
    }

    const reserveIdx = rosterLines.findIndex(l => l === reservesHeader)
    const starterLines = reserveIdx >= 0 ? rosterLines.slice(0, reserveIdx + 1) : rosterLines
    const benchLines = reserveIdx >= 0 ? rosterLines.slice(reserveIdx + 1) : []
    const fluidBlock = buildHeroFluidPromptBlock({
      fluid: clientFluid,
      starters: titolari,
      lang,
      evidence: {
        recurringIssues: patternsRow?.recurring_issues,
        gameAnalysis: gameAnalysisRow?.stats,
        attackAreas: (matches || []).map((m) => m.attack_areas).filter(Boolean).join(' ')
      }
    })

    const coreParts = [
      '======================================================================',
      L.boxTitle,
      L.boxSubtitle,
      '======================================================================',
      fluidBlock,
      dispositionLine,
      '',
      L.positionNote,
      '',
      L.statsNote,
      '',
      L.starters,
      ...starterLines,
      '',
      L.lastMatches,
      ...matchLines,
      '',
      tacticsText,
      coachText,
      latestPrematchText ? `\n${latestPrematchText}` : ''
    ]

    const optionalSections = [
      { label: 'bench', lines: benchLines.length > 0 ? ['', L.reservesNote, ...benchLines] : [] },
      { label: 'pattern', lines: patternText ? ['', patternText] : [] },
      {
        label: 'enterprise',
        lines: (() => {
          const subset = buildFallbackEnterpriseSubset({
            titolari,
            riserve,
            stylesLookup,
            formation: baseFormationName || '',
            teamStyle,
            coachRow,
            patternsRow,
            individualInstructions: indInstr,
            problems: [],
            matchesCount: matches.length,
            lang
          })
          return subset ? ['', subset] : []
        })()
      },
      {
        label: 'teamStats',
        lines: (() => {
          const withStats = matches.filter((m) => m.team_stats && typeof m.team_stats === 'object').slice(0, 3)
          if (!withStats.length) return []
          const lines = withStats.map((m) => {
            const d = m.match_date ? String(m.match_date).slice(0, 10) : '?'
            const ts = m.team_stats
            const poss = ts.possession ?? ts.Possession
            const shots = ts.shots ?? ts.Shots
            const passAcc = ts.pass_accuracy ?? ts.passAccuracy
            const bits = []
            if (poss != null) bits.push(`poss ${poss}`)
            if (shots != null) bits.push(`tiri ${shots}`)
            if (passAcc != null) bits.push(`pass ${passAcc}`)
            return `  ${d}: ${bits.join(', ') || 'stats present'}`
          })
          return ['', (lang === 'en' || lang === 'es') ? 'Match team stats (recent):' : 'Statistiche di gioco (ultime partite):', ...lines]
        })()
      },
      { label: 'build', lines: buildProgressionBlock ? ['', buildProgressionBlock] : [] },
      { label: 'skill', lines: skillAdvisoryBlock ? ['', skillAdvisoryBlock] : [] }
    ]

    let summary = coreParts.join('\n')
    for (const section of optionalSections) {
      if (section.lines.length === 0) continue
      const addition = section.lines.join('\n')
      if (summary.length + addition.length <= MAX_PERSONAL_CONTEXT_CHARS) {
        summary += addition
      }
    }
    if (summary.length > MAX_PERSONAL_CONTEXT_CHARS) {
      summary = summary.slice(0, MAX_PERSONAL_CONTEXT_CHARS) + '\n... (riassunto troncato).'
    }
    return summary
  } catch (err) {
    console.error('[assistant-chat] buildPersonalContext error:', err?.message || err)
    return ''
  }
}

/**
 * Costruisce prompt personalizzato e motivante.
 * @param {string} efootballKnowledge - Se presente, blocco RAG eFootball (opzionale).
 * @param {string} personalContextSummary - Se presente, blocco contesto personale (rosa/diagnostic).
 * @param {boolean} hasHistory - Se true, c'è già storia conversazione: non risalutare, continua naturalmente.
 * @param {string} [contextBlockLabel] - Etichetta blocco contesto: 'RIASSUNTO ANALISI' (diagnostic) o 'ROSA E DATI' (fallback).
 */
function buildPersonalizedPromptV2(userMessage, context, language = 'it', efootballKnowledge = '', personalContextSummary = '', hasHistory = false, contextBlockLabel = 'ROSA E DATI', cardAvailabilityBlock = '') {
  const { profile, currentPage, appState } = context || {}
  const firstName = sanitizeForPrompt(profile?.first_name || (language === 'en' ? 'friend' : 'amico'), 40)
  const teamName = sanitizeForPrompt(profile?.team_name || (language === 'en' ? 'your team' : 'il tuo team'), 60)
  const aiName = sanitizeForPrompt(profile?.ai_name || 'Coach AI', 40)
  const howToRemember = sanitizeForPrompt(profile?.how_to_remember || '', 240)
  const aiWeakPoint = sanitizeForPrompt(profile?.ai_weak_point || '', 60)
  const aiLearnGoals = sanitizeForPrompt(profile?.ai_learn_goals || '', 240)
  const aiNotes = sanitizeForPrompt(profile?.ai_notes || '', 280)
  const commonProblems = Array.isArray(profile?.common_problems)
    ? profile.common_problems.map((p) => sanitizeForPrompt(p, 40)).filter(Boolean).slice(0, 5)
    : []
  const WEAK_POINT_LABELS = language === 'en'
    ? { defence: 'Defence', attack: 'Attack', set_pieces: 'Set pieces', transitions: 'Transitions', final_minutes: 'Final minutes' }
    : { defence: 'Difesa', attack: 'Attacco', set_pieces: 'Piazzati', transitions: 'Transizioni', final_minutes: 'Finale partita' }
  const weakPointLabel = aiWeakPoint && WEAK_POINT_LABELS[aiWeakPoint] ? WEAK_POINT_LABELS[aiWeakPoint] : (aiWeakPoint || '')

  const domandaBreve = userMessage.length > 80 ? userMessage.slice(0, 80).trim() + '?' : userMessage
  const pagina = currentPage ? String(currentPage) : ''
  const contestoAttuale = [
    pagina || (language === 'en' ? 'Dashboard' : 'Dashboard'),
    `${language === 'en' ? 'Question' : 'Domanda'}: "${domandaBreve}"`
  ].join(' | ')

  // Capsule ultra-compatta: incroci + inverse reasoning, senza tasti/pulsanti, senza uso app.
  const capsuleIt = `ENGINE (OBBLIGATORIO, token-budget):
- INPUT: ROSA (stile card, stats vel/acc/res/fin/pas/tac, abilità, forma ↑/↓, h/w, competenze), MATCH/PATTERN (result, formation/stile, opponent formation, attack_areas, voti cliente, recurring_issues), COACH (competenze stile), TATTICA (stile squadra + istruzioni), RAG (limiti + movimenti/situazioni + community).
- MICRO-SCORE: FIT (position = competenze), COACH_OK(style>=70; Contropiede veloce ≠ Contrattacco, due stili distinti), SPD (velocità+accelerazione), PASS (pas+filtrante/di prima/calibrato), WIN (tac+Intercettazione/Tornante/Muro/Scivolata/Dominio palle alte), AIR_DEF (h/w+Dominio palle alte), AIR_ATK (h/w+Colpo di testa), SUB (Riserva di lusso).
- DECISIONE: scegli 1 leva principale + max 2 secondarie: (1) Fix FIT, (2) Fix mismatch coach/stile squadra, (3) Aggancia top recurring_issue, se presenti nei dati, (4) 1-2 cambi titolari/riserve (vedi SOSTITUZIONI sotto), (5) 1 istruzione valida (niente Offensivo/Linea bassa; Formazione fluida se alzare/abbassare), (6) gameplay solo "cosa fare" da §7.
- FORMAZIONE FLUIDA: se nel contesto è ATTIVA, riconoscila ("La Formazione fluida è già attiva") e valuta ATTACCO vs DIFESA separatamente usando i ruoli di fase (non player.position). NON dire "attiva la formazione fluida". Se è NON ATTIVA, puoi suggerire di VALUTARLA solo quando i dati reali (recurring_issues, analisi, pattern, feedback) mostrano un bisogno diverso tra attacco e difesa; motiva. Vietato "Attiva Fluid, è migliore." Se non c'è evidenza, NON suggerirla.
- SOSTITUZIONI (leva 4, incrocio enterprise): (1) Sintomo da Statistiche di gioco, recurring_issues, voti partite o domanda. (2) Ruolo da rafforzare: tiro=fin+abilita tiro; passaggio=pas+abilita passaggio; difesa=tac+WIN. (3) Titolari: chi è in quel ruolo, forma, voti, stile giocatore. (4) Riserve: chi ha fin/pas/tac, abilita che compensano e stile giocatore adatto (RAG §2: es. Opportunista/Rapace d'area per finalizzazione, Giocatore chiave per inserimenti, Regista/Classico 10 per passaggio, Collante per difesa); posizione compatibile; incrocia con stile squadra e competenza allenatore (riassunto Tattica e Allenatore). (5) Un solo cambio concreto: Far uscire [titolare], far entrare [riserva]: [motivo da dati]. Usa sempre riassunto (Rosa stile+fin/pas/tac+abilita, Statistiche di gioco, Andamento/voti, Tattica, Allenatore, Sintesi rosa, Sinergie, Leve) e RAG §2/§7/§8 quando rilevante.
- BUILD/META: consigli funzionali a movimenti e difficolta. Se chiede "build giuste/vanno bene": usa sezione Build progressione PT + Motivi app; non contraddire build generate dall app senza dati.
- INVERSE: sintomo?cause?leva: fasce (pressione avversaria wide, NON "zone attacco tue")?esterni senza WIN/Tornante?copertura/istruzioni; attacco sterile?PASS basso o stile incoerente?regista/cambio stile/modulo; palle alte?AIR_DEF basso?DC/MED più forti+piazzati.
- ZONE: attacco tuo ≠ attacco avversario/pressione concessa ≠ zone dei gol subiti. Se la pressione avversaria c'è, usala e NON chiedere di caricare partite. Se ZONE PARTITE dice che non ci sono partite o manca lo split avversario: dai comunque 1 consiglio da rosa/tattica, poi UNA richiesta concreta: mandare QUI lo screenshot della mappa attacco della partita (non Analisi 10 partite, non un'altra pagina, non "carica partite" generico). Vietato inventare il corridoio centrale.
- AVVERSARIO: usa nomi di giocatori avversari solo se sono presenti nei dati reali del contesto. Se non ci sono, parla per ruolo o zona: mediano, trequartista, ala, terzino, fascia, corridoio centrale.
OUTPUT e VERBALIZZAZIONE: segui le REGOLE CORE CONDIVISE sopra (1 leva principale, max 2 secondarie, 1 check; niente stats tra parentesi). 2-4 frasi in conversazione naturale.`

  const capsuleEn = `ENGINE (REQUIRED, token-budget):
- INPUT: ROSTER (card style, stats spd/acc/sta/fin/pas/tac, skills, form ↑/↓, h/w, competences), MATCH/PATTERN (result, formation/style, opponent formation, attack_areas, client ratings, recurring_issues), COACH (style competence), TACTICS (team style + instructions), RAG (limits + movements/situations + community).
- MICRO-SCORES: FIT (position = competences), COACH_OK(style>=70; Quick Counter ≠ Long Ball Counter, two distinct styles), SPD (speed+acceleration), PASS (pas+Through ball/One-touch/Weighted), WIN (tac+Interception/Track Back/Blocker/Sliding Tackle/Aerial Superiority), AIR_DEF (h/w+Aerial superiority), AIR_ATK (h/w+Heading), SUB (Luxury sub=Super sub).
- DECISION: pick 1 main lever + max 2 secondary: (1) Fix FIT, (2) Fix coach/team-style mismatch, (3) Anchor top recurring_issue, only if present in data, (4) 1-2 lineup changes (see SUBSTITUTIONS below), (5) 1 valid instruction (no Attacking/Deep Line; Fluid Formation to raise/drop), (6) gameplay "what to do" only from §7.
- FLUID FORMATION: if the context says it is ACTIVE, recognise it ("Fluid Formation is already active") and evaluate ATTACK vs DEFENCE separately using phase roles (not player.position). Do NOT say "turn Fluid on". If it is OFF, you MAY suggest evaluating it only when real data (recurring_issues, analysis, patterns, feedback) show a different attack vs defence need; motivate it. Forbidden: "Turn Fluid on, it is better." If there is no evidence, do not suggest it.
- SUBSTITUTIONS (lever 4, enterprise cross-check): (1) Symptom from Game stats, recurring_issues, match ratings, or question. (2) Role to strengthen: shot=fin+shot skills; passing=pas+pass skills; defense=tac+WIN. (3) Starters: who is in that role, form, ratings, player style. (4) Reserves: who has fin/pas/tac, compensating skills and suitable player style (RAG §2: e.g. Goal Poacher/Fox in the Box for finishing, Hole Player for runs, Orchestrator/Classic 10 for passing, Anchor Man for defense); compatible position; cross-check with team style and coach competence (summary Tactics and Coach). (5) One concrete change: Take off [starter], bring on [reserve]: [reason from data]. Always use summary (Roster style+fin/pas/tac+skills, Game stats, Form/ratings, Tactics, Coach, Roster summary, Synergies, Levers) and RAG §2/§7/§8 when relevant.
- BUILD/META: functional advice for movements and difficulties. If they ask builds ok/correct: use Progression builds section + app Why lines; do not contradict app-generated builds without data.
- INVERSE: symptom?cause?lever: wide threat (opponent attack/pressure wide, NOT "your attack zones")?wide players lack WIN/track back?coverage/instructions; stale attack?low PASS or mismatch style?add creator/change style/formation; aerial goals?low AIR_DEF?stronger CB/DM + set pieces.
- ZONES: your attack ≠ opponent attack/pressure conceded ≠ conceded-goal locations. If opponent pressure is present, use it and do NOT ask to upload matches. If MATCH ZONES says none saved or no opponent split: still give 1 roster/tactics stance, then ONE concrete ask: send the match attack-zone heatmap IN THIS CHAT (not the 10-match Analisi screen, not another page, not a generic "upload matches"). Forbidden: inventing a central corridor.
- OPPONENT DATA: use opponent player names only if they are present in real context data. Otherwise speak by role or zone: DM, AMF, winger, fullback, flank, central lane.
OUTPUT and VERBALIZATION: follow the SHARED CORE RULES above (1 main lever, max 2 secondary, 1 check; no stats in parentheses). 2-4 sentences in natural conversation.`

  const capsule = language === 'en' || language === 'es' ? capsuleEn : capsuleIt

  // I pulsanti sono richieste del cliente che aprono il prossimo passo della conversazione.
  // Hero ha già incrociato i dati: le CTA non devono chiedergli di rifare il lavoro interno.
  const suggRulesIt = `SUGGERIMENTI (2-3, solo se pertinenti): scrivi brevi richieste cliccabili in prima persona, legate ESPLICITAMENTE al consiglio appena dato. Devono aiutare il cliente a: (1) CAPIRE il significato tattico ("Fammi capire quando Mbappé deve attaccare la profondità"); (2) APPLICARE un dettaglio concreto ("Dimmi chi deve accompagnare l’azione"); (3) ALLENARE con un test semplice ("Dammi un esercizio per allenare questa uscita"). Hero deve già usare automaticamente rosa, tattica, allenatore e dati: VIETATO "incrocia i dati", "incrocia con i titolari", "approfondisci la risposta", "prova la correzione principale" o altre formule vaghe/interne. VIETATO anche: "Quale modulo", "tier list", "perché ho perso", nomi assenti dalla rosa, uso app. Se non hai 2 percorsi davvero utili, danne di meno.`
  const suggRulesEn = `SUGGESTIONS (2-3, only if relevant): write short first-person clickable requests tied EXPLICITLY to the advice just given. They must help the client: (1) UNDERSTAND the tactical meaning ("Help me understand when Mbappé should attack the space"); (2) APPLY one concrete detail ("Tell me who should support the move"); (3) TRAIN with a simple test ("Give me a drill to practise this build-up"). Hero must already use roster, tactics, coach and data automatically: FORBIDDEN "cross-check the data", "check against my starters", "expand the answer", "test the main correction", or other vague/internal wording. Also forbidden: "Which formation", "tier list", "why did I lose", names not in roster, app usage. If fewer than 2 paths are genuinely useful, give fewer.`
  const suggRules = language === 'en' || language === 'es' ? suggRulesEn : suggRulesIt

  // Solo dati da Informazioni IA: niente lista "Problemi" da citare; se togli la spunta, l'IA non vede più quel problema
  const profileLines = [
    `Profilo: ${firstName} | ${teamName}`,
    howToRemember ? `Memo: ${howToRemember}` : '',
    weakPointLabel ? (language === 'en' ? `Weak point (what makes you lose): ${weakPointLabel}` : `Punto debole (cosa ti fa perdere): ${weakPointLabel}`) : '',
    commonProblems.length
      ? (language === 'en' ? `Declared problems: ${commonProblems.join(', ')}` : `Problemi dichiarati: ${commonProblems.join(', ')}`)
      : '',
    aiLearnGoals ? (language === 'en' ? `Learn goals: ${aiLearnGoals}` : `Cosa vuole imparare: ${aiLearnGoals}`) : '',
    aiNotes ? (language === 'en' ? `Notes for AI: ${aiNotes}` : `Note per l'IA: ${aiNotes}`) : ''
  ].filter(Boolean)
  const header = `CONTESTO: ${contestoAttuale}
${hasHistory ? `NOTA: Continua la conversazione già iniziata. NON salutare.` : ''}

${profileLines.join('\n')}`

  const replyLanguage = language === 'es' ? 'spagnolo' : language === 'en' ? 'inglese' : 'italiano'
  const blocks = [
    header,
    personalContextSummary ? `\n■ ${contextBlockLabel}:\n${personalContextSummary}` : '',
    cardAvailabilityBlock ? `\n■ ${language === 'en' || language === 'es' ? 'CARD ADVISOR STATUS' : 'STATO CARD ADVISOR'}:\n${cardAvailabilityBlock}` : '',
    efootballKnowledge ? `\n■ MECCANICHE eFootball (RAG):\n${efootballKnowledge}` : '',
    `\n${capsule}\n\nFORMATO RISPOSTA:\n[1 posizione principale + max 2 leve + 1 prossimo check. 2-4 frasi. Una domanda solo se manca un dato decisivo.]\n\n---\nSUGGERIMENTI:\n1. [richiesta breve per capire]\n2. [richiesta breve per applicare]\n3. [richiesta breve per allenare, opzionale]\n\n${suggRules}\n\nDOMANDA CLIENTE: "${userMessage}"\nRispondi come ${aiName} in ${replyLanguage}.`
  ].filter(Boolean)

  return blocks.join('\n')
}

/**
 * POLITICHE COACH AI – Vincoli comportamentali OBBLIGATORI.
 * Spostate da info_rag §10 al system prompt perché:
 * - Sono hard constraints, non "conoscenza contestuale" da recuperare
 * - Il RAG può escluderle (limite caratteri, ordine sezioni in getRelevantSectionsForContext)
 * - Devono applicarsi SEMPRE, indipendentemente dalla domanda
 */
function replyLanguageLabel(lang) {
  if (lang === 'es') return 'SPANISH'
  if (lang === 'en') return 'ENGLISH'
  return 'ITALIAN'
}

function buildSystemContentV2(lang) {
  const policies = getCoachPoliciesText(lang)
  const sharedCore = getCoachSharedCoreText(lang)
  const replyLang = replyLanguageLabel(lang)

  const it = `Sei Coach AI per eFootball.
LINGUA DI RISPOSTA: DEVI TASSATIVAMENTE RISPONDERE IN ${replyLang} (lingua UI/parametro "language" dell'app).

${policies}

${sharedCore}

SCOPE: solo consulenza tattica eFootball basata su ROSA, PARTITE, ALLENATORE, TATTICA e RAG.
- Gameplay consentito SOLO come "cosa fare" (azioni). VIETATO citare tasti/pulsanti/controller.
- Uso app (wizard, click, menu, upload): NON spiegare. Se chiesto, rispondi solo: "Sono qui solo per consigli tattici: formazione, rosa, modulo, sostituzioni, stile. Esplora il menu per le altre funzioni."
- MICRO-REMINDER consentito: se mancano dati critici (formazione/coach/statistiche), puoi aggiungere UNA frase breve di promemoria dopo il consiglio tattico. Non spiegare passaggi UI, non fare tutorial.

FONTI: Nomi/rosa/partite/allenatore/tattica = solo dal blocco contesto sotto (ROSA E DATI o RIASSUNTO ANALISI). Regole eFootball = Truth Layer (già incluso in questo system prompt); il blocco RAG è solo conoscenza descrittiva (meccaniche/community). Se manca un dato, non inventare.
GIOCATORE NON IN ROSA: se il cliente chiede di un giocatore che NON appare nel contesto sottostante, DEVI dire "Non ho [nome] nella tua rosa salvata" e NON inventare competenze, stile o attivazione. Puoi solo citare info generiche dal RAG (se presenti) dichiarando "in generale".
MAPPATURA TERMINI OBBLIGATORIA: "Link-up / Link up / linkup / Collegamento" = campo "Connection" dell'allenatore. Se nel RIASSUNTO è presente "Connection:", NON dire mai che manca: cita nome connection e, se presenti, Centerpiece e Key Man.
OVERALL/RATING FINALE: per qualunque domanda su overall, rating, valutazione totale o valore finale, se nel contesto del giocatore è presente una build PT/progressione, NON elencare l'overall/rating salvato come risposta principale e NON dire "rating 40/68/87" come valore finale. Rispondi così: "Per gli attaccanti vedo build e statistiche salvate, ma il numero overall finale va verificato direttamente in eFootball dopo aver applicato i punti." Poi cita build PT, ruolo e statistiche chiave aggiornate presenti nel contesto (es. "Ronaldo ha build da P con Tiro +11, Destrezza +8 e Forza arti inferiori +8").
ABILITÀ GIOCATORI: cita sempre i nomi italiani ufficiali come nel blocco rosa. Le skill native della carta, le max 5 aggiuntive dell'utente e gli stili COM/IA sono tre insiemi distinti. Conta slot liberi solo quando il contesto dichiara esplicitamente le aggiuntive; se la provenienza è "non classificata", non dedurla dal nome o dal numero totale. Le abilità si aggiungono con Programmi abilità, non con Progression Points. Gli stili attacco/difesa di una carta duale vanno letti nella rispettiva fase.
MECCANICHE CANCEL/SKILL AVANZATE: segui RAG §7.12. Comandi ufficiali: Super Cancel, Kick Cancel, Kick Feint e Double Touch. Tratta Tess Cancel, Double Touch cancel e "croqueta interrotta" solo come naming community, non come comandi autonomi.
ANTI-EXPLOIT: vietato coaching basato su macro/script/bug abuse; non suggerire spam continuo della stessa skill. Dai sempre una variante sicura se il timing non riesce.
INCROCI: Usa tutto il riassunto (Rosa, Statistiche di gioco, Andamento/voti, Tattica, Allenatore, Sintesi rosa, Sinergie, Leve) e RAG §2/§4/§7/§8. Build/meta: solo consigli funzionali a movimenti e difficolta del cliente (dati reali), mai tier list senza incrocio. Progressione PT (slider): non inventare; se assente, consiglio tattico su stili/stats card. Stile giocatore cruciale per fit e sostituzioni.
Risposta CONCRETA: rispondi alla domanda specifica (es. "sbaglio a tirare?" → consigli su tiro e percentuali reali; "passaggi?" → passaggio e abilità in rosa). Non ripetere sempre le stesse 3-4 raccomandazioni (compattezza, marcatura, contrattacco): scegli 1-2 leve pertinenti e usa i dati che hai.
Per consigli pratici in partita o di matchup, preferisci la forma: trigger -> azione -> passaggio/giocata consigliata -> evita. Usa nomi dei giocatori avversari solo se compaiono nel contesto reale; altrimenti usa ruolo o zona.
DUE FONTI DATI (non in conflitto): (1) "Dati dalle partite inserite" = attacco tuo, pressione avversaria (NON gol subiti), voti, recupero. (2) "Statistiche di gioco (Analisi eFootball, ultime 10 partite)" = come segni/giochi tu dalla schermata Analisi. Non sono zone dei gol subiti. Se la domanda è "mi segnano dal centro o dalla fascia", usa "Attacco avversario / pressione concessa" e dillo; non dire che manca se quel blocco c'è.
Se nel RIASSUNTO ANALISI è presente la sezione "Statistiche di gioco (Analisi eFootball, ultime 10 partite)" (tipo gol, tiro, passaggio, dribbling, difesa, comandi speciali), usala per consigli mirati: es. diversificare tipi di tiro, aumentare uso pressing/comandi, lavorare su passaggio o difesa in base alle percentuali reali. Incrocia sempre con la Rosa (Abilità in rosa, posizioni, stili): se l'utente usa molto un tipo di comando (es. passaggio filtrante, tiro normale) ma in rosa mancano le abilità che lo rendono efficace (es. Passaggio filtrante, Tiro calibrato + A giro), segnalalo e consiglia di diversificare, schierare chi ha quelle abilità o aggiungerle con Programmi (se non Trending). Usa la mappatura comando→abilità del RAG (§7.9 se presente). Se quella sezione NON è presente e il cliente chiede consigli sulle "sue statistiche" o "difficoltà nelle statistiche", NON inventare percentuali: rispondi che per consigli basati sui dati di gioco può caricare gli screenshot della schermata Analisi eFootball dalla dashboard (card Statistiche di gioco).
Se nel RIASSUNTO c'è Connessione/Input delay/Ritardo (es. connessione debole, ritardo input) OPPURE il cliente menziona connessione debole/lag/ritardo nel messaggio, adatta i consigli: meno pressing reattivo e dribbling in difesa (tempismo difficile), più posizionamento, copertura e struttura; evita suggerimenti che richiedono tempismo perfetto.
PRIORITÀ PROFILO: Per "Punto debole", "Cosa vuole imparare" e "Note per l'IA" usa SEMPRE i valori dal blocco PROFILO in testa al messaggio (sono live/aggiornati). Se il RIASSUNTO contiene valori diversi per gli stessi campi, IGNORA quelli del RIASSUNTO (possono essere stale). Orienta almeno un consiglio sul punto debole e sugli obiettivi di apprendimento quando rilevanti alla domanda. NON citare mai al cliente l'elenco (es. "hai indicato che hai difficoltà in..."); usa il dato solo per orientare i consigli.
- FORMAZIONE FLUIDA: se ATTIVA nel contesto, dillo e valuta ATTACCO/DIFESA con i ruoli di fase. Se NON ATTIVA, suggeriscila solo se i dati mostrano un bisogno diverso tra le due fasi, e motiva. Mai cambiare formation_layout o player.position.

CONSTRAINTS: solo nomi in rosa; solo 6 stili squadra configurabili (Possesso palla, Contropiede veloce, Contrattacco, Passaggio lungo, Vie laterali, Pressing totale / Overload); stili squadra distinti: Contropiede veloce (Quick Counter) ≠ Contrattacco (Long Ball Counter); soglia coach >=70 = policy FZTH, non meccanica universale Konami; solo istruzioni individuali valide (niente Offensivo/Linea bassa); Formazione fluida e due Collegamenti solo come consiglio; limiti formazione §3.4 = validatore FZTH; Attributi ≠ Player Skills ≠ abilità speciali ≠ stili COM/IA; Dominio palle alte = Aerial Superiority.

OUTPUT e VERBALIZZAZIONE: segui le REGOLE CORE CONDIVISE sopra (1 leva principale, max 2 secondarie, 1 check; niente stats tra parentesi).`

  const en = `You are Coach AI for eFootball.
RESPONSE LANGUAGE: YOU MUST STRICTLY REPLY IN ${replyLang} (UI language / app "language" parameter).

${policies}

${sharedCore}

SCOPE: only eFootball tactical advice based on ROSTER, MATCHES, COACH, TACTICS and RAG.
- Gameplay allowed only as "what to do" (actions). Never mention buttons/inputs/controller.
- App usage (wizard, clicks, menus, upload): do not explain. If asked, reply only: "I'm here only for tactical advice: formation, roster, module, substitutions, style. Explore the menu for other features."
- MICRO-REMINDER allowed: if critical data is missing (formation/coach/stats), you may add ONE short reminder sentence after tactical advice. Do not explain UI steps and do not provide tutorials.

SOURCES: Names/roster/matches/coach/tactics only from the context block below (ROSTER & DATA or ANALYSIS SUMMARY). eFootball rules = the Truth Layer (already included in this system prompt); the RAG block is descriptive knowledge only (mechanics/community). If data is missing, do not invent.
PLAYER NOT IN ROSTER: if the client asks about a player NOT listed in the context below, you MUST say "I don't have [name] in your saved roster" and NEVER invent competences, style, or activation. You may only cite generic info from RAG (if present) prefixed with "in general".
MANDATORY TERM MAPPING: "Link-up / Link up / linkup / Collegamento" = coach "Connection" field. If the SUMMARY contains "Connection:", never say it's missing: cite the connection name and, when available, Centerpiece and Key Man.
FINAL OVERALL/RATING: for any question about overall, rating, total value or final value, if the player's context includes a PT build/progression, do NOT list the saved overall/rating as the main answer and do NOT say "rating 40/68/87" as the final value. Answer like this: "For these forwards I can see saved builds and stats, but the final overall number should be checked directly in eFootball after applying the points." Then cite the PT build, role and key updated stats present in context (e.g. "Ronaldo has a CF build with Shooting +11, Dexterity +8 and Lower body +8").
PLAYER SKILLS: native card skills, the user's maximum five additional skills, and COM/AI playstyles are three separate sets. Count free slots only when additional-skill provenance is explicit; never infer it from a skill name or the total count. Additional skills use Skill Training Programs, not Progression Points. Read dual attack/defense styles in their corresponding phase.
CANCEL/SKILL ADVANCED MECHANICS: follow RAG §7.12. Official commands: Super Cancel, Kick Cancel, Kick Feint and Double Touch. Treat Tess Cancel, Double Touch cancel and "interrupted croqueta" only as community naming, not standalone commands.
ANTI-EXPLOIT: never coach macro/script/bug abuse, and do not recommend continuous spam of one skill. Always provide a safer fallback option if timing is unstable.
CROSS-CHECKS: Use the full summary and RAG §2/§4/§7/§8. Build/meta: functional for movements and client difficulties (real data), never tier list without cross-check. PT progression: do not invent; if missing, tactical advice on card styles/stats. Player style crucial for fit and substitutions.
CONCRETE answer: answer the specific question (e.g. "am I shooting wrong?" → advice on shooting and real percentages; "passing?" → passing and roster skills). Do not repeat the same 3-4 recommendations every time (compactness, marking, counter): pick 1-2 relevant levers and use the data you have.
For practical in-match or matchup advice, prefer: trigger -> action -> recommended pass/play -> avoid. Use opponent player names only if they appear in the real context; otherwise use role or zone labels.
TWO DATA SOURCES (not in conflict): (1) "Data from entered matches" = your attack, opponent pressure (NOT conceded goals), ratings, recovery. (2) "Game stats (eFootball Analisi, last 10 matches)" = how YOU score/play from the Analysis screen. Not conceded-goal zones. If asked whether they concede from centre or wing, use "Opponent attack / pressure conceded" and say so; do not claim the data is missing if that block is present.
If the ANALYSIS SUMMARY includes "Game stats (eFootball Analisi, last 10 matches)" (goal types, shot, passing, dribbling, defense, special commands), use it for targeted advice: e.g. diversify shot types, increase pressing/command usage, work on passing or defense based on actual percentages. Always cross-reference with the Roster (Abilità in rosa / skills in roster, positions, styles): if the user uses a command type heavily (e.g. through ball, normal shot) but the roster lacks the skills that make it effective (e.g. Passaggio filtrante, Tiro calibrato + A giro), point it out and suggest diversifying, using players who have those skills, or adding skills via Programmi (if not Trending). Use the command→skill mapping from RAG (§7.9 when present). If that section is NOT present and the client asks for advice on "their stats" or "difficulties in stats", do NOT invent percentages: reply that for data-driven advice they can upload screenshots of the eFootball Analysis screen from the dashboard (Game stats card).
If the SUMMARY has Connection/Input delay/Lag (e.g. weak connection, input delay) OR the client mentions weak connection/lag/delay in the message, adapt advice: less reactive pressing and dribbling in defence (timing is harder), more positioning, coverage and structure; avoid suggestions that require perfect timing.
PROFILE PRIORITY: For "Weak point", "Learn goals", and "Notes for AI" ALWAYS use the values from the PROFILE block at the top of the message (these are live/current). If the SUMMARY contains different values for the same fields, IGNORE those from the SUMMARY (they may be stale). Steer at least one piece of advice toward the weak point and learning goals when relevant to the question. Never quote the list back to the client (e.g. "you indicated you have difficulties in..."); use the data only to steer advice.

CONSTRAINTS: only roster names; only 6 configurable team styles (Possession Game, Quick Counter, Long Ball Counter, Long Ball, Out Wide, Overload / Pressing totale); distinct team styles: Quick Counter (Contropiede veloce) ≠ Long Ball Counter (Contrattacco); coach competence >=70 is an FZTH policy, not a universal Konami mechanic; valid individual instructions only (no Attacking/Deep Line); Fluid Formation and two Link-ups as advice only; formation limits §3.4 are FZTH validator constraints; Attributes ≠ Player Skills ≠ premium skills ≠ COM/AI styles; Aerial Superiority = Dominio palle alte.

OUTPUT and VERBALIZATION: follow the SHARED CORE RULES above (1 main lever, max 2 secondary, 1 check; no stats in parentheses).`

  return (lang === 'en' || lang === 'es') ? en : it
}

export async function POST(req) {
  let creditChargeContext = null
  try {
    // Autenticazione
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    
    const reqLang = getPreferredLanguageFromRequest(req)
    if (!supabaseUrl || !anonKey || !serviceKey) {
      return NextResponse.json(
        { error: getApiError('CONFIG_MISSING', reqLang) },
        { status: 500, headers: { 'Content-Language': reqLang } }
      )
    }
    
    const token = extractBearerToken(req)
    if (!token) {
      return NextResponse.json(
        { error: getApiError('AUTH_REQUIRED', reqLang) },
        { status: 401, headers: { 'Content-Language': reqLang } }
      )
    }
    
    const { userData, error: authError } = await validateToken(token, supabaseUrl, anonKey)
    if (authError || !userData?.user?.id) {
      return NextResponse.json(
        { error: getApiError('AUTH_INVALID', reqLang) },
        { status: 401, headers: { 'Content-Language': reqLang } }
      )
    }
    let userId = userData.user.id

    const admin = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    })

    // Metalgate ID lookup
    if (userData.user.user_metadata?.is_metalgate_user) {
      const { data: existingProfile } = await admin
        .from('user_profiles')
        .select('user_id')
        .eq('metalgate_user_id', userId)
        .single()
      
      if (existingProfile?.user_id) {
        userId = existingProfile.user_id
      } else {
        return NextResponse.json({ error: 'User profile not found' }, { status: 404 })
      }
    }

    // Rate limiting (config in lib/rateLimiter.js, coerente con altri endpoint)
    const rateLimitConfig = RATE_LIMIT_CONFIG['/api/assistant-chat']
    const rateLimit = await checkRateLimit(
      userId,
      '/api/assistant-chat',
      rateLimitConfig?.maxRequests ?? 30,
      rateLimitConfig?.windowMs ?? 60000
    )
    
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { 
          error: getApiError('RATE_LIMIT', reqLang), 
          resetAt: rateLimit.resetAt 
        },
        { 
          status: 429,
          headers: {
            'Content-Language': reqLang,
            'X-RateLimit-Limit': String(rateLimitConfig?.maxRequests ?? 30),
            'X-RateLimit-Remaining': String(rateLimit.remaining),
            'X-RateLimit-Reset': String(rateLimit.resetAt)
          }
        }
      )
    }
    
    // Parse request
    let body
    try {
      body = await req.json()
    } catch (parseError) {
      return NextResponse.json(
        { error: getApiError('BODY_INVALID', reqLang) },
        { status: 400, headers: { 'Content-Language': reqLang } }
      )
    }
    
    const { message: rawMessage, currentPage, appState, language = 'it', history: rawHistory } = body
    const lang = (language === 'en' || language === 'it' || language === 'es') ? language : 'it'

    if (!rawMessage || typeof rawMessage !== 'string') {
      return NextResponse.json(
        { error: getApiError('MESSAGE_REQUIRED', lang) },
        { status: 400, headers: { 'Content-Language': lang } }
      )
    }
    const message = rawMessage.trim()
    if (message.length === 0) {
      return NextResponse.json(
        { error: getApiError('MESSAGE_REQUIRED', lang) },
        { status: 400, headers: { 'Content-Language': lang } }
      )
    }
    if (message.length > MAX_MESSAGE_LENGTH) {
      return NextResponse.json(
        { error: getApiError('MESSAGE_TOO_LONG', lang) },
        { status: 400, headers: { 'Content-Language': lang } }
      )
    }

    const safeCurrentPage = typeof currentPage === 'string' && currentPage.length > MAX_CURRENT_PAGE_LENGTH
      ? currentPage.slice(0, MAX_CURRENT_PAGE_LENGTH)
      : (currentPage || '')

    // appState: solo chiavi ammesse (sicurezza, evita payload enormi)
    const allowedAppStateKeys = ['completingMatch', 'viewingMatch', 'managingFormation', 'viewingDashboard', 'uploadingPlayer']
    const safeAppState = appState && typeof appState === 'object'
      ? Object.fromEntries(
          allowedAppStateKeys
            .filter(k => Object.prototype.hasOwnProperty.call(appState, k))
            .map(k => [k, !!appState[k]])
        )
      : {}

    const history = normalizeHistory(rawHistory)
    let rosterNames = []
    
    // Costruisci contesto personale
    let context
    try {
      context = await buildAssistantContext(userId, safeCurrentPage, safeAppState)
      if (!context) {
        console.warn('[assistant-chat] Context building returned null, using empty context')
        context = { profile: {}, currentPage: currentPage || '', appState: safeAppState }
      }
    } catch (contextError) {
      console.error('[assistant-chat] Error building context:', contextError)
      context = { profile: {}, currentPage: currentPage || '', appState: safeAppState }
    }

    // RAG eFootball: se la domanda riguarda eFootball, carica sezioni rilevanti da info_rag
    let efootballKnowledge = ''
    if (classifyQuestion(message) === 'efootball') {
      try {
        efootballKnowledge = getRelevantSections(message, 18000)
        if (efootballKnowledge && process.env.NODE_ENV !== 'production') console.log('[assistant-chat] RAG eFootball: loaded sections')
      } catch (ragError) {
        console.error('[assistant-chat] RAG error (non-blocking):', ragError.message)
      }
    }

    // Contesto personale: se esiste diagnostic in cache usalo (RIASSUNTO ANALISI), altrimenti fallback buildPersonalContext (ROSA E DATI)
    let personalContextSummary = ''
    let contextBlockLabel = 'ROSA E DATI'
    try {
      if (serviceKey && supabaseUrl) {
        const admin = createClient(supabaseUrl, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } })
        const { data: cacheRow } = await admin
          .from('user_diagnostic_cache')
          .select('content, generated_at')
          .eq('user_id', userId)
          .maybeSingle()

        const cacheGeneratedAtMs = cacheRow?.generated_at ? new Date(cacheRow.generated_at).getTime() : 0
        const cacheIsFresh = Number.isFinite(cacheGeneratedAtMs) && cacheGeneratedAtMs > 0 && (Date.now() - cacheGeneratedAtMs) <= DIAGNOSTIC_CACHE_MAX_AGE_MS

        if (cacheRow?.content && String(cacheRow.content).trim().length > 0 && cacheIsFresh) {
          let raw = String(cacheRow.content).trim()
          // Live overlays replace Fluid/tactics/FIT and PROFILE header replaces AI info — strip stale copies
          raw = stripStaleDiagnosticSections(raw, { stripAiInfo: true, stripMatchZones: true })
          personalContextSummary = raw.length > MAX_PERSONAL_CONTEXT_CHARS ? raw.slice(0, MAX_PERSONAL_CONTEXT_CHARS) + '\n... (riassunto troncato).' : raw
          contextBlockLabel = 'RIASSUNTO ANALISI'
          if (personalContextSummary) console.log('[assistant-chat] Diagnostic from cache used')
          // Tattica + Fluida live: la cache può essere vecchia; l'IA deve vedere sempre lo stato salvato
          const [{ data: tacticalRow }, { data: liveLayout }, { data: liveVariants }, { data: liveCoach }, { data: stylesData }, { data: liveMatches }] = await Promise.all([
            admin.from('team_tactical_settings').select('team_playing_style, individual_instructions').eq('user_id', userId).maybeSingle(),
            admin.from('formation_layout').select('formation, slot_positions').eq('user_id', userId).maybeSingle(),
            admin.from('formation_variants').select('id, phase, formation, slot_positions, is_active').eq('user_id', userId).in('phase', ['attack', 'defense']).eq('is_active', true),
            admin.from('coaches').select('coach_name, playing_style_competence, connection, extracted_data, metadata').eq('user_id', userId).eq('is_active', true).maybeSingle(),
            admin.from('playing_styles').select('id, name'),
            admin.from('matches').select('attack_areas, is_home').eq('user_id', userId).order('match_date', { ascending: false }).limit(10)
          ])
          const liveStyle = tacticalRow?.team_playing_style?.trim()
          const liveInstr = tacticalRow?.individual_instructions
          const numLive = (liveInstr && typeof liveInstr === 'object') ? Object.keys(liveInstr).length : 0
          const liveFluid = buildFluidFormationState(liveLayout, liveVariants || [])
          // Risolvi nomi giocatori per istruzioni, Fluida e avvisi competenza
          let instrLines = ''
          let fitLines = ''
          let livePlayers = []
          try {
            const { data: players } = await admin
              .from('players')
              .select('id, player_name, position, slot_index, original_positions, playing_style_id')
              .eq('user_id', userId)
              .limit(23)
            livePlayers = players || []
            rosterNames = extractRosterNames(livePlayers)
            if (liveInstr && typeof liveInstr === 'object') {
              const map = {}
              livePlayers.forEach(p => { if (p?.id) map[String(p.id)] = p.player_name || '?' })
              const entries = Object.entries(liveInstr)
                .map(([slot, v]) => ({ slot, v }))
                .filter(({ v }) => v && typeof v === 'object' && v.enabled === true && v.instruction && !isRemovedIndividualInstruction(v.instruction))
              if (entries.length > 0) {
                const lines = entries.slice(0, 8).map(({ slot, v }) => {
                  const pid = v.player_id ? String(v.player_id) : ''
                  const pName = pid && map[pid] ? map[pid] : (pid ? `player:${pid.slice(0, 8)}` : '?')
                  return `  - ${slot}: ${String(v.instruction).trim()} → ${pName}`
                })
                instrLines = `\n${(lang === 'en' || lang === 'es') ? 'Individual instructions' : 'Istruzioni individuali'}:\n${lines.join('\n')}\n`
              }
            }
          } catch (_) {}
          const liveStarters = livePlayers.filter((player) => player?.slot_index != null && Number(player.slot_index) >= 0 && Number(player.slot_index) <= 10)
          const liveFluidText = formatHeroFluidContext({
            fluid: liveFluid,
            starters: liveStarters,
            lang
          })
          const placementWarn = getPlacementWarningLines(liveStarters, lang, liveFluid)
          if (placementWarn.length > 0) {
            const liveTag = lang === 'en' ? '[LIVE]' : '[AGGIORNAMENTO LIVE]'
            fitLines = `\n${liveTag} ${getPlacementWarningTitle(lang)}\n${placementWarn.join('\n')}\n`
          } else {
            const outOfPosition = getOutOfPositionStarterLines(livePlayers, lang)
            if (outOfPosition.length > 0) {
              fitLines = lang === 'en'
                ? `\n[LIVE] Out-of-position starters (fix FIT first):\n${outOfPosition.join('\n')}\n`
                : `\n[AGGIORNAMENTO LIVE] Titolari fuori posizione (correggi FIT prima):\n${outOfPosition.join('\n')}\n`
            }
          }
          if (liveStyle || numLive > 0) {
            const liveLine = lang === 'en'
              ? `[LIVE] Team style: ${liveStyle || 'not set'}. Individual instructions: ${numLive} active.${instrLines}\n`
              : `[AGGIORNAMENTO LIVE] Stile squadra: ${liveStyle || 'non impostato'}. Istruzioni individuali: ${numLive} attive.${instrLines}\n`
            personalContextSummary = liveLine + fitLines + personalContextSummary
          } else if (fitLines) {
            personalContextSummary = fitLines + personalContextSummary
          }
          personalContextSummary = prependLiveFluidOverride(personalContextSummary, liveFluidText, lang)
          const liveStylesLookup = {}
          ;(stylesData || []).forEach((style) => { liveStylesLookup[style.id] = style.name || '' })
          const liveLinkUpText = formatCoachLinkUpsForHeroPrompt({
            coach: liveCoach,
            starters: startersForLinkUpVerification(liveStarters, liveFluid),
            stylesLookup: liveStylesLookup,
            lang
          })
          personalContextSummary = prependLiveLinkUpOverride(personalContextSummary, liveLinkUpText, lang)
          const liveZoneText = buildMatchZonePromptBlock(liveMatches || [], lang)
          if (liveZoneText) {
            personalContextSummary = `${liveZoneText}\n\n${personalContextSummary}`
          }
          if (personalContextSummary.length > MAX_PERSONAL_CONTEXT_CHARS) {
            personalContextSummary = personalContextSummary.slice(0, MAX_PERSONAL_CONTEXT_CHARS) + '\n... (riassunto troncato).'
          }
        } else if (cacheRow?.content && !cacheIsFresh && process.env.NODE_ENV !== 'production') {
          console.log('[assistant-chat] Diagnostic cache stale: using live context fallback')
        }
      }
      if (!personalContextSummary) {
        personalContextSummary = await buildPersonalContext(userId, lang)
        if (personalContextSummary && process.env.NODE_ENV !== 'production') console.log('[assistant-chat] Personal context (fallback) loaded')
      }
      if (serviceKey && supabaseUrl) {
        try {
          const memoryAdmin = createClient(supabaseUrl, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } })
          if (!rosterNames.length) {
            const { data: nameRows } = await memoryAdmin
              .from('players')
              .select('player_name')
              .eq('user_id', userId)
              .limit(50)
            rosterNames = extractRosterNames(nameRows || [])
          }
          const { data: feedbackRows } = await memoryAdmin
            .from('user_tactical_feedback')
            .select('conversation_summary, insights, formation_played, style_played, opponent_name, outcome, created_at')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .limit(5)
          const feedbackBlock = formatTacticalFeedbackForPrompt(feedbackRows || [], lang)
          if (feedbackBlock) {
            personalContextSummary = `${feedbackBlock}\n\n${personalContextSummary}`
            if (personalContextSummary.length > MAX_PERSONAL_CONTEXT_CHARS) {
              personalContextSummary = personalContextSummary.slice(0, MAX_PERSONAL_CONTEXT_CHARS) + '\n... (riassunto troncato).'
            }
          }
        } catch (memoryError) {
          console.warn('[assistant-chat] personal memory append failed (non-blocking):', memoryError?.message || memoryError)
        }
      }
    } catch (pcError) {
      console.error('[assistant-chat] Context/diagnostic error (non-blocking):', pcError?.message)
      try {
        personalContextSummary = await buildPersonalContext(userId, lang)
        if (personalContextSummary && process.env.NODE_ENV !== 'production') console.log('[assistant-chat] Personal context fallback after error')
      } catch (fallbackError) {
        console.error('[assistant-chat] buildPersonalContext fallback error:', fallbackError?.message)
      }
    }

    const microReminder =
      shouldAttachMicroReminder({ history, summary: personalContextSummary, message })
        ? getMicroReminderText(lang, personalContextSummary)
        : ''

    // Card Advisor availability: se il messaggio sembra chiedere compra/scarta su una carta,
    // controlla in tempo reale quali nomi citati sono effettivamente in release attive.
    // Si appoggia ad un admin client temporaneo solo per questa lookup (read-only).
    let cardAvailabilityBlock = ''
    try {
      if (supabaseUrl && serviceKey) {
        const cardAdmin = createClient(supabaseUrl, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } })
        cardAvailabilityBlock = await buildCardAvailabilityBlock({ admin: cardAdmin, message, lang })
      }
    } catch (caError) {
      console.warn('[assistant-chat] card availability lookup failed (non-blocking):', caError?.message || caError)
    }

    // Costruisci prompt personalizzato (con eventuali blocchi RAG eFootball e contesto personale)
    let prompt
    try {
      prompt = buildPersonalizedPromptV2(message, context, lang, efootballKnowledge, personalContextSummary, history.length > 0, contextBlockLabel, cardAvailabilityBlock)
      if (!prompt || prompt.trim().length === 0) {
        throw new Error('Empty prompt generated')
      }
    } catch (promptError) {
      console.error('[assistant-chat] Error building prompt:', promptError)
      throw new Error('Error building AI prompt')
    }

    // Chiama OpenAI
    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) {
      return NextResponse.json(
        { error: getApiError('OPENAI_KEY_MISSING', lang) },
        { status: 500, headers: { 'Content-Language': lang } }
      )
    }

    // VERIFICA E DEDUZIONE CREDITI (Bloccante)
    // Se fallisce (es. credito insufficiente su Metalgate), blocca la richiesta.
    if (supabaseUrl && serviceKey) {
      const admin = createClient(supabaseUrl, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } })
      const deduction = await deductCredits(admin, userId, token, AI_COST, 'assistant-chat')
      
      if (!deduction.success) {
        console.warn(`[assistant-chat] Credit deduction failed for user ${userId}: ${deduction.error}`)
        return NextResponse.json(
          {
            error:
              lang === 'en'
                ? 'Hero Points balance empty. Top up to keep chatting with your Coach.'
                : 'Hero Points esauriti. Ricarica per continuare a chattare con il Coach.',
            code: 'insufficient_credits',
            details: deduction.error
          },
          { status: 402, headers: { 'Content-Language': lang } }
        )
      }
      creditChargeContext = { admin, userId, cost: AI_COST, operationType: 'assistant-chat', functionName: 'assistant-chat:POST' }
    }
    
    // Modello: OPENAI_MODEL in env (es. gpt-5.2, gpt-5.1) oppure default gpt-5.2 (alias gpt-5 deprecato da OpenAI).
    // Se OpenAI rifiuta (model not found / non disponibile per l'account), fallback automatico a gpt-4o.
    const rawModel = (process.env.OPENAI_MODEL || 'gpt-5.2').trim()
    const model = rawModel || 'gpt-5.2'
    if (process.env.NODE_ENV !== 'production') console.log('[assistant-chat] Request model:', model, '(OPENAI_MODEL=' + (process.env.OPENAI_MODEL ? 'set' : 'unset') + ')')
    
    const systemContent = buildSystemContentV2(lang)

    const openAIMessages = [
      { role: 'system', content: systemContent },
      ...history.map(({ role, content }) => ({ role, content })),
      { role: 'user', content: prompt }
    ]

    const requestBody = {
      model: model,
      messages: openAIMessages,
      temperature: 0.5,
      max_completion_tokens: 1200
    }
    
    // Chiama OpenAI con retry (gestisce anche fallback GPT-4o se GPT-5 non disponibile)
    let response
    try {
      response = await callOpenAIWithRetry(apiKey, requestBody, 'assistant-chat')
      
      // callOpenAIWithRetry può lanciare errore invece di restituire Response
      if (!response || typeof response.ok === 'undefined') {
        throw new Error('Invalid response from OpenAI API')
      }
    } catch (retryError) {
      console.error('[assistant-chat] callOpenAIWithRetry error:', retryError)
      // Se il modello non è disponibile (es. gpt-5 non abilitato), riprova con gpt-4o
      if (retryError?.type === 'model_not_found') {
        try {
          requestBody.model = 'gpt-4o'
          const fallbackResponse = await callOpenAIWithRetry(apiKey, requestBody, 'assistant-chat')
          if (fallbackResponse?.ok) {
            const fallbackData = await fallbackResponse.json().catch(() => ({}))
            const fallbackMsg = (lang === 'en' || lang === 'es') ? "Sorry, I didn't get that. Can you repeat?" : 'Mi dispiace, non ho capito. Puoi ripetere?'
            const raw = fallbackData.choices?.[0]?.message?.content || fallbackMsg
            const { cleanContent: fc, suggestions: fs } = parseSuggestionsFromContent(raw)
            const sanitizedFallback = sanitizeCoachOutput(fc, lang)
            const responseWithReminder = finalizeCoachReply({
              content: sanitizedFallback,
              message,
              summary: personalContextSummary,
              lang,
              reminder: microReminder
            })
            const finalSuggestions = finalizeCoachSuggestions(fs, lang, rosterNames)
            if (process.env.NODE_ENV !== 'production') console.log('[assistant-chat] Success (fallback from model_not_found), model_used: gpt-4o')
            return NextResponse.json({
              response: responseWithReminder,
              suggestions: finalSuggestions,
              remaining: rateLimit.remaining,
              resetAt: rateLimit.resetAt,
              model_used: 'gpt-4o'
            })
          }
        } catch (fallbackErr) {
          console.error('[assistant-chat] Fallback gpt-4o error:', fallbackErr)
        }
      }
      const errorMsg = retryError?.message || retryError?.type || 'Error calling OpenAI API'
      throw new Error(errorMsg)
    }
    
    // Verifica che response sia valida
    if (!response || !response.ok) {
      let errorMessage = 'OpenAI API error'
      try {
        if (response) {
          const errorData = await response.json().catch(() => ({ error: { message: 'Unknown error' } }))
          
          // Se il modello configurato non è disponibile, fallback a GPT-4o
          if (errorData.error?.code === 'model_not_found') {
            if (process.env.NODE_ENV !== 'production') console.log(`[assistant-chat] Model ${model} not available, fallback to gpt-4o`)
            requestBody.model = 'gpt-4o'
            try {
              const fallbackResponse = await callOpenAIWithRetry(apiKey, requestBody, 'assistant-chat')
              if (fallbackResponse && fallbackResponse.ok) {
                const fallbackData = await fallbackResponse.json().catch(() => ({}))
                const fallbackMsg = (lang === 'en' || lang === 'es') ? "Sorry, I didn't get that. Can you repeat?" : 'Mi dispiace, non ho capito. Puoi ripetere?'
                const raw = fallbackData.choices?.[0]?.message?.content || fallbackMsg
                const { cleanContent: fc, suggestions: fs } = parseSuggestionsFromContent(raw)
                const sanitizedFallback = sanitizeCoachOutput(fc, lang)
                const responseWithReminder = finalizeCoachReply({
                  content: sanitizedFallback,
                  message,
                  summary: personalContextSummary,
                  lang,
                  reminder: microReminder
                })
                const finalSuggestions = finalizeCoachSuggestions(fs, lang, rosterNames)
                if (process.env.NODE_ENV !== 'production') console.log('[assistant-chat] Success (fallback from !response.ok), model_used: gpt-4o')
                return NextResponse.json({
                  response: responseWithReminder,
                  suggestions: finalSuggestions,
                  remaining: rateLimit.remaining,
                  resetAt: rateLimit.resetAt,
                  model_used: 'gpt-4o'
                })
              }
            } catch (fallbackError) {
              console.error('[assistant-chat] Fallback error:', fallbackError)
            }
          }

          errorMessage = errorData.error?.message || errorMessage
        }
      } catch (parseError) {
        console.error('[assistant-chat] Error parsing error response:', parseError)
      }
      throw new Error(errorMessage)
    }
    
    // Parse risposta JSON con gestione errori
    let data
    try {
      data = await response.json()
    } catch (jsonError) {
      console.error('[assistant-chat] JSON parse error:', jsonError)
      throw new Error('Invalid response from OpenAI API')
    }
    
    // Estrai contenuto con fallback sicuro (doppia lingua)
    const fallbackReply = (lang === 'en' || lang === 'es') ? "Sorry, I didn't get that. Can you repeat?" : 'Mi dispiace, non ho capito. Puoi ripetere?'
    const rawContent = data?.choices?.[0]?.message?.content ||
                       data?.choices?.[0]?.content ||
                       fallbackReply

    // Estrai 3 suggerimenti cliccabili dal blocco SUGGERIMENTI (se presente) e pulisci il testo mostrato
    const { cleanContent, suggestions } = parseSuggestionsFromContent(rawContent)
    const sanitizedContent = sanitizeCoachOutput(cleanContent, lang)
    const responseWithReminder = finalizeCoachReply({
      content: sanitizedContent,
      message,
      summary: personalContextSummary,
      lang,
      reminder: microReminder
    })
    
    // Validazione base: verifica che la risposta non contenga riferimenti a funzionalità inventate
    if (sanitizedContent.toLowerCase().includes('funzionalità non disponibile') || 
        sanitizedContent.toLowerCase().includes('non è ancora disponibile')) {
      if (process.env.NODE_ENV !== 'production') console.log('[assistant-chat] AI ha ammesso funzionalità non disponibile - comportamento corretto')
    }


    const finalSuggestions = finalizeCoachSuggestions(suggestions, lang, rosterNames)
    const tipCards = splitAdviceIntoTips(responseWithReminder, 3)
    if (process.env.NODE_ENV !== 'production') console.log(`[assistant-chat] Success, model_used: ${model}`)
    return NextResponse.json(
      {
        response: responseWithReminder,
        suggestions: finalSuggestions,
        tips: tipCards.length > 1 ? tipCards : undefined,
        cards: tipCards.length > 1
          ? tipCards.map((t) => ({ type: 'tip', id: t.id, title: t.title, body: t.body }))
          : undefined,
        remaining: rateLimit.remaining,
        resetAt: rateLimit.resetAt,
        model_used: model
      },
      { headers: { 'Content-Language': lang } }
    )
    
  } catch (error) {
    const errLang = getPreferredLanguageFromRequest(req)
    const msg = (error && error.message) ? String(error.message) : ''
    const errType = error && error.type
    console.error('[assistant-chat] Error:', errType || msg || error)
    if (error && error.stack) console.error('[assistant-chat] Stack:', error.stack)

    if (creditChargeContext?.admin && creditChargeContext?.userId) {
      await handleCreditOperationError(creditChargeContext.admin, {
        userId: creditChargeContext.userId,
        cost: creditChargeContext.cost,
        operationType: creditChargeContext.operationType,
        functionName: creditChargeContext.functionName,
        error,
        errorType: errType || null,
        metadata: { endpoint: '/api/assistant-chat' }
      })
    }

    if (errType === 'rate_limit' || /rate limit|429/i.test(msg)) {
      return NextResponse.json(
        { error: getApiError('RATE_LIMIT', errLang) },
        { status: 429, headers: { 'Content-Language': errLang } }
      )
    }
    if (errType === 'timeout' || errType === 'network_error' || errType === 'server_error' || /timeout|openai|api key|invalid key|service.*unavailable|unable to complete/i.test(msg)) {
      return NextResponse.json(
        { error: getApiError('OPENAI_ERROR', errLang) },
        { status: 503, headers: { 'Content-Language': errLang } }
      )
    }
    const detail = (typeof process !== 'undefined' && process.env?.NODE_ENV === 'development' && msg) ? { detail: msg } : {}
    const code = (!detail.detail && msg) ? (msg.includes('prompt') ? 'prompt_fail' : msg.includes('Invalid response') || msg.includes('JSON') ? 'openai_parse' : 'server_error') : undefined
    return NextResponse.json(
      { error: getApiError('GENERIC_ERROR', errLang), ...(code ? { code } : {}), ...detail },
      { status: 500, headers: { 'Content-Language': errLang, ...(code ? { 'X-Error-Code': code } : {}) } }
    )
  }
}
