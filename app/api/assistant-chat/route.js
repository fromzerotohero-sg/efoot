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
import { buildLegacyTacticalAiNotice } from '@/lib/efootballV6Rules'
import { buildFluidFormationState, buildHeroFluidPromptBlock, formatCoachLinkUpsForHeroPrompt, formatHeroFluidContext, prependLiveFluidOverride, prependLiveLinkUpOverride, startersForLinkUpVerification } from '@/lib/efootballV6TacticalModel'
import { formatDispositionRoles, formatStarterPlacementToken, getPlacementWarningLines, getPlacementWarningTitle } from '@/lib/playerFieldPlacement'

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

/** Messaggi errore API in tripla lingua (IT/EN/ES) */
const API_ERRORS = {
  AUTH_REQUIRED: { it: 'Autenticazione richiesta.', en: 'Authentication required', es: 'Autenticación requerida.' },
  AUTH_INVALID: { it: 'Autenticazione non valida o scaduta.', en: 'Invalid or expired authentication', es: 'Token no válido o expirado.' },
  BODY_INVALID: { it: 'Corpo della richiesta non valido.', en: 'Invalid request body.', es: 'Cuerpo de la solicitud no válido.' },
  MESSAGE_REQUIRED: { it: 'Il messaggio è obbligatorio.', en: 'Message is required.', es: 'Mensaje requerido.' },
  MESSAGE_TOO_LONG: { it: 'Messaggio troppo lungo. Riduci il testo.', en: 'Message too long. Please shorten it.', es: 'Mensaje demasiado largo. Acorta el texto.' },
  RATE_LIMIT: { it: 'Troppe richieste. Riprova tra poco.', en: 'Rate limit exceeded. Please try again later.', es: 'Demasiadas solicitudes. Inténtalo de nuevo más tarde.' },
  OPENAI_RATE_LIMIT: { it: 'Servizio AI momentaneamente saturo. Riprova tra 1 minuto.', en: 'AI service is temporarily busy. Try again in 1 minute.', es: 'El servicio de IA está saturado. Inténtalo de nuevo en 1 minuto.' },
  CONFIG_MISSING: { it: 'Configurazione mancante.', en: 'Supabase configuration missing.', es: 'Configuración faltante.' },
  OPENAI_KEY_MISSING: { it: 'Chiave API OpenAI non configurata.', en: 'OpenAI API key not configured.', es: 'Clave API de OpenAI no configurada.' },
  OPENAI_ERROR: { it: 'Errore nel servizio di risposta. Riprova.', en: 'Error calling AI service. Please try again.', es: 'Error en el servicio de respuesta. Inténtalo de nuevo.' },
  GENERIC_ERROR: { it: 'Errore durante la generazione della risposta.', en: 'Error generating response.', es: 'Error al generar la respuesta.' }
}

/**
 * Lingua preferita da richiesta (header Accept-Language). Usato quando il body non è ancora parsato (401, 429).
 * @param {Request} req
 * @returns {'it'|'en'|'es'}
 */
function getPreferredLanguageFromRequest(req) {
  const accept = req?.headers?.get?.('accept-language') || ''
  if (accept.toLowerCase().startsWith('es') || accept.includes('es')) return 'es'
  if (accept.toLowerCase().startsWith('it') || accept.includes('it')) return 'it'
  return 'en'
}

/**
 * Messaggio errore API in lingua (IT, EN o ES).
 * @param {string} key - Chiave in API_ERRORS (es. 'AUTH_REQUIRED', 'MESSAGE_REQUIRED')
 * @param {'it'|'en'|'es'} lang
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

/** Suggerimenti utili: analisi vs rosa, uso comandi/abilità, priorità concrete. Niente meta, niente "perché ho perso", niente "migliorare giocatore". */
function getDefaultSuggestions(lang, currentPage = '') {
  const page = (currentPage || '').toLowerCase()
  const it = [
    { page: 'gestione-formazione', q: ['Le mie statistiche di analisi sono adatte alla rosa che ho?', 'Uso passaggio e tiro in modo coerente con le abilità dei miei giocatori?', 'In base a rosa e partite, qual è la prima cosa su cui lavorare?'] },
    { page: 'match/new', q: ['Cosa preparare per la prossima partita con la mia rosa?', 'Quali priorità in difesa e attacco con i giocatori che schiero?', 'Come sfruttare al meglio le abilità della rosa in partita?'] },
    { page: 'match/', q: ['Cosa correggere dopo questa partita in base a come ho giocato?', 'Le mie statistiche (passaggio, tiro, difesa) vanno d\'accordo con la rosa?', 'Quali priorità per le prossime partite?'] },
    { page: 'contromisure', q: ['Come contrastare formazioni aggressive con la mia rosa?', 'Quali priorità in difesa e attacco?', 'Cosa preparare sui piazzati con i miei giocatori?'] },
    { page: 'allenatori', q: ['Quale stile abbinare al mio allenatore con la rosa?', 'Le mie statistiche di gioco sono adatte ai giocatori che ho?', 'Quali priorità con questo allenatore?'] },
    { page: '', q: ['Le mie statistiche di analisi sono adatte alla rosa che ho?', 'Uso i comandi (passaggio, tiro, difesa) in modo coerente con le abilità della rosa?', 'In base a partite e dati, su cosa mi conviene lavorare prima?'] }
  ]
  const en = [
    { page: 'gestione-formazione', q: ['Do my analysis stats match the roster I have?', 'Am I using passing and shooting in line with my players\' skills?', 'Based on roster and matches, what should I work on first?'] },
    { page: 'match/new', q: ['What to prepare for the next match with my roster?', 'What priorities in defence and attack with the players I use?', 'How to get the most from my roster\'s skills in a match?'] },
    { page: 'match/', q: ['What to fix after this match based on how I played?', 'Do my stats (passing, shot, defence) fit my roster?', 'What priorities for the next matches?'] },
    { page: 'contromisure', q: ['How to counter aggressive formations with my roster?', 'What priorities in defence and attack?', 'What to prepare on set pieces with my players?'] },
    { page: 'allenatori', q: ['What style fits my coach with my roster?', 'Do my game stats suit the players I have?', 'What priorities with this coach?'] },
    { page: '', q: ['Do my analysis stats match the roster I have?', 'Am I using commands (passing, shot, defence) in line with my roster\'s skills?', 'Based on matches and data, what should I work on first?'] }
  ]
  const es = [
    { page: 'gestione-formazione', q: ['¿Mis estadísticas de análisis se adaptan a mi plantilla?', '¿Uso pase y tiro de forma coherente con las habilidades de mis jugadores?', 'Según plantilla y partidos, ¿en qué debo trabajar primero?'] },
    { page: 'match/new', q: ['¿Qué preparar para el próximo partido con mi plantilla?', '¿Qué prioridades en defensa y ataque con los jugadores que alineo?', '¿Cómo aprovechar al máximo las habilidades de la plantilla en el partido?'] },
    { page: 'match/', q: ['¿Qué corregir tras este partido según cómo he jugado?', '¿Mis estadísticas (pase, tiro, defensa) van bien con la plantilla?', '¿Qué prioridades para los próximos partidos?'] },
    { page: 'contromisure', q: ['¿Cómo contrarrestar formaciones agresivas con mi plantilla?', '¿Qué prioridades en defensa y ataque?', '¿Qué preparar en las jugadas a balón parado con mis jugadores?'] },
    { page: 'allenatori', q: ['¿Qué estilo combinar con mi entrenador según la plantilla?', '¿Mis estadísticas de juego se adaptan a los jugadores que tengo?', '¿Qué prioridades con este entrenador?'] },
    { page: '', q: ['¿Mis estadísticas de análisis se adaptan a mi plantilla?', '¿Uso los comandos (pase, tiro, defensa) de forma coherente con las habilidades de la plantilla?', 'Según partidos y datos, ¿en qué me conviene trabajar primero?'] }
  ]
  const list = lang === 'en' ? en : lang === 'es' ? es : it
  for (const { page: p, q } of list) {
    if (p && page.includes(p)) return q
  }
  return (lang === 'en' ? en : lang === 'es' ? es : it).find(x => x.page === '').q
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
 * Light cleanup only: strips meta phrases like "ho analizzato / I analyzed".
 * Does NOT rewrite coach personality; tone comes from prompt verbalization rules.
 */
function sanitizeCoachOutput(content, lang = 'it') {
  if (!content || typeof content !== 'string') return content
  const markers = lang === 'en'
    ? ['i analyzed', 'i have analyzed', 'i cross-checked', 'i have cross']
    : lang === 'es'
      ? ['he analizado', 'he cruzado', 'he evaluado']
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
    missingFormation: s.includes('modulo salvato: mancante') || s.includes('saved formation: missing') || s.includes('formation: not set') || s.includes('formación guardada: ausente'),
    missingCoach: s.includes('allenatore attivo: mancante') || s.includes('active coach: missing') || s.includes('entrenador activo: ausente'),
    missingStats: s.includes('statistiche analisi efootball: mancanti') || s.includes('latest game-analysis stats: missing') || s.includes('game-analysis stats: missing') || s.includes('estadísticas de análisis efootball: faltantes')
  }
}

function getMicroReminderText(lang = 'it', summary = '') {
  const gaps = detectContextGaps(summary)
  if (gaps.missingFormation) {
    return lang === 'en'
      ? 'Quick reminder: complete your formation setup to get more precise coaching.'
      : lang === 'es'
        ? 'Recordatorio rápido: completa tu formación para recibir consejos mucho más precisos.'
        : 'Promemoria rapido: completa la formazione per avere consigli molto più precisi.'
  }
  if (gaps.missingCoach) {
    return lang === 'en'
      ? 'Quick reminder: set your active coach to align advice with your team style.'
      : lang === 'es'
        ? 'Recordatorio rápido: establece un entrenador activo para alinear mejor los consejos con tu estilo de equipo.'
        : 'Promemoria rapido: imposta un coach attivo per allineare meglio i consigli al tuo stile squadra.'
  }
  if (gaps.missingStats) {
    return lang === 'en'
      ? 'Quick reminder: updating game stats makes tactical corrections much more accurate.'
      : lang === 'es'
        ? 'Recordatorio rápido: actualizar las estadísticas hace que las correcciones tácticas sean mucho más precisas.'
        : 'Promemoria rapido: aggiornare le statistiche rende le correzioni tattiche molto più accurate.'
  }
  return ''
}

function shouldAttachMicroReminder({ history = [], summary = '', message = '' }) {
  if (!summary) return false
  if (!getMicroReminderText('it', summary) && !getMicroReminderText('en', summary) && !getMicroReminderText('es', summary)) return false

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
    s.includes('collegamento') ||
    s.includes('collegamenti') ||
    s.includes('punto focale') ||
    s.includes('uomo chiave') ||
    s.includes('focal point') ||
    s.includes('key man') ||
    /\ballenatore.{0,40}\blink\b/.test(s) ||
    /\bcoach.{0,40}\blink\b/.test(s) ||
    /\blink\b.{0,40}(?:allenatore|coach|entrenador)/.test(s)
  )
}

function extractLinkUpFacts(summary = '') {
  const text = String(summary || '')
  if (!text) return null

  const unavailable = /DATI COLLEGAMENTI ALLENATORE:\s*non disponibili|COACH LINK-UP DATA:\s*unavailable|DATOS LINK-UP DEL ENTRENADOR:\s*no disponibles/i.test(text)
  if (unavailable) return { unavailable: true, none: false, plays: [] }

  const noneSaved = /COLLEGAMENTI ALLENATORE:\s*(?:nessuno salvato|confermato che)|COACH LINK-UP PLAYS:\s*(?:none saved|confirmed none)|LINK-UP DEL ENTRENADOR:\s*(?:ninguno guardado|confirmado que)/i.test(text)
  if (noneSaved) return { none: true, plays: [] }

  const headerMatch = text.search(/COLLEGAMENTI ALLENATORE|COACH LINK-UP PLAYS|LINK-UP DEL ENTRENADOR/i)
  if (headerMatch >= 0) {
    const block = text.slice(headerMatch, headerMatch + 1800)
    const plays = []
    const playRe = /[-•]\s*\d+\.\s*([^:\n]+):\s*([^\n]+)/g
    let match
    while ((match = playRe.exec(block))) {
      const name = String(match[1] || '').trim()
      const status = String(match[2] || '').trim()
      if (name) plays.push({ name, status })
    }
    if (plays.length) return { none: false, plays }
  }

  const nameMatch = text.match(/Connection:\s*([^\n.]+)\./i)
  if (!nameMatch?.[1]) return null
  const focalMatch = text.match(/Focal Point[^:]*:\s*([^\n.]+)\./i)
  const keyManMatch = text.match(/Key Man[^:]*:\s*([^\n.]+)\./i)
  return {
    none: false,
    plays: [{
      name: String(nameMatch[1] || '').trim(),
      focal: String(focalMatch?.[1] || '').trim(),
      keyMan: String(keyManMatch?.[1] || '').trim()
    }]
  }
}

function buildLinkUpGroundedReply(lang = 'it', facts = null) {
  if (facts?.unavailable) {
    if (lang === 'en') {
      return 'The imported manager data do not include the Link-up requirements, so I cannot determine which Link-ups the card has or whether their requirements are met. Missing imported data do not mean the manager has no Link-up.'
    }
    if (lang === 'es') {
      return 'Los datos importados del entrenador no incluyen los requisitos de Link-up, así que no puedo determinar qué Link-up tiene la carta ni si cumple sus condiciones. La ausencia del dato importado no significa que el entrenador no tenga Link-up.'
    }
    return 'I dati importati dell’allenatore non includono i requisiti dei Link-up, quindi non posso stabilire quali possieda la carta né se le condizioni siano soddisfatte. Dato mancante non significa che l’allenatore non abbia Link-up.'
  }

  if (facts?.none) {
    if (lang === 'en') {
      return 'Your coach has no Link-up saved. Playing-style competence numbers (e.g. Quick Counter 90) are not a Link-up. Save the Link-up on the coach screen to evaluate Focal Point and Key Man.'
    }
    if (lang === 'es') {
      return 'Tu entrenador no tiene Link-up guardado. Los números de competencia de estilo (ej. Contraataque rápido 90) no son un Link-up. Guarda el Link-up en la pantalla del entrenador para evaluar Punto focal y Hombre clave.'
    }
    return 'Il tuo allenatore non ha un Collegamento salvato. I numeri di competenza stile (es. Contropiede veloce 90) non sono un Link-up. Salva il Collegamento dalla scheda allenatore per valutare Punto focale e Uomo chiave.'
  }

  const plays = Array.isArray(facts?.plays) ? facts.plays.filter((play) => play?.name) : []
  if (!plays.length && !facts?.name) return ''

  if (facts?.name && !plays.length) {
    plays.push({ name: facts.name, focal: facts.focal, keyMan: facts.keyMan })
  }

  if (lang === 'en') {
    return plays.map((play) => {
      const bits = [`Link-up: ${play.name}.`]
      if (play.status) bits.push(play.status)
      if (play.focal) bits.push(`Focal Point: ${play.focal}.`)
      if (play.keyMan) bits.push(`Key Man: ${play.keyMan}.`)
      return bits.filter(Boolean).join(' ')
    }).join(' ')
  }
  if (lang === 'es') {
    return plays.map((play) => {
      const bits = [`Link-up: ${play.name}.`]
      if (play.status) bits.push(play.status)
      if (play.focal) bits.push(`Punto focal: ${play.focal}.`)
      if (play.keyMan) bits.push(`Hombre clave: ${play.keyMan}.`)
      return bits.filter(Boolean).join(' ')
    }).join(' ')
  }
  return plays.map((play) => {
    const bits = [`Collegamento: ${play.name}.`]
    if (play.status) bits.push(play.status)
    if (play.focal) bits.push(`Punto focale: ${play.focal}.`)
    if (play.keyMan) bits.push(`Uomo chiave: ${play.keyMan}.`)
    return bits.filter(Boolean).join(' ')
  }).join(' ')
}

function replySaysLinkUpMissing(text = '') {
  const low = String(text || '').toLowerCase()
  return (
    low.includes('non è salvato') ||
    low.includes("non e' salvato") ||
    low.includes('nessun collegamento') ||
    low.includes('nessuno salvato') ||
    low.includes('non ha un collegamento') ||
    low.includes('none saved') ||
    low.includes('no link-up saved') ||
    low.includes('not saved') ||
    low.includes('ninguno guardado') ||
    low.includes('no está guardado') ||
    low.includes('no esta guardado')
  )
}

function enforceLinkUpGrounding({ message = '', summary = '', content = '', lang = 'it' }) {
  if (!isLinkUpQuestion(message)) return String(content || '').trim()
  const facts = extractLinkUpFacts(summary)
  const out = String(content || '').trim()
  if (!facts) return out

  if (facts.unavailable) {
    return buildLinkUpGroundedReply(lang, facts)
  }

  if (facts.none) {
    return replySaysLinkUpMissing(out) ? out : buildLinkUpGroundedReply(lang, facts)
  }

  const plays = Array.isArray(facts.plays) ? facts.plays : []
  const firstName = plays[0]?.name || facts.name
  if (!firstName) return out

  const low = out.toLowerCase()
  const hasName = plays.some((play) => play?.name && low.includes(String(play.name).toLowerCase())) || low.includes(String(firstName).toLowerCase())
  const contradictsKnownData = (
    low.includes('non risulta') ||
    low.includes('non lo vedo') ||
    low.includes('vedo solo') ||
    low.includes('not in your context') ||
    low.includes("i don't see") ||
    low.includes('i only see') ||
    replySaysLinkUpMissing(out)
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
  const out = []
  for (let i = 0; i < Math.min(raw.length, MAX_HISTORY_MESSAGES); i++) {
    const item = raw[i]
    if (!item || typeof item !== 'object') continue
    const role = item.role === 'assistant' ? 'assistant' : item.role === 'user' ? 'user' : null
    if (!role) continue
    let content = typeof item.content === 'string' ? item.content.trim() : ''
    if (content.length > MAX_HISTORY_CONTENT_LENGTH) content = content.slice(0, MAX_HISTORY_CONTENT_LENGTH)
    if (content.length === 0) continue
    out.push({ role, content })
  }
  return out
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
    competenceHint: 'Competenze stili TATTICI (chiavi distinte: contrattacco → contropiede_veloce; solo >= 70 consigliabili):',
    boxTitle: 'CONTESTO PERSONALE CLIENTE - DATI REALI DELLA ROSA',
    boxSubtitle: 'USA QUESTI DATI - PERSONALIZZA - CITA NOMI REALI - NON GENERICO',
    positionNote: 'POSIZIONE: lo slot in cui il cliente ha messo il giocatore è dove STA (riga roster; con Fluida: attacco/difesa). "competenze" sono i ruoli della carta. NON correggere lo schieramento come se fosse un errore. Se manca competenza Alta, sottolinea il compromesso e puoi suggerire il ruolo naturale. Con Fluida, se in attacco è CC non è "un difensore" in questo momento (la difesa è l\'altra fase).',
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
    competenceHint: 'Style competences (contrattacco → contropiede_veloce; only >= 70 advisable):',
    boxTitle: 'PERSONAL CLIENT CONTEXT - REAL ROSA DATA',
    boxSubtitle: 'USE THIS DATA - PERSONALIZE - CITE REAL NAMES - NOT GENERIC',
    positionNote: 'POSITION: the slot where the client fielded the player is where he IS (roster line; with Fluid: attack/defence). "competenze" are card roles. Do NOT correct the placement as if it were a mistake. If High competence is missing, underline the trade-off and you may suggest the natural card role. With Fluid, if he is CMF in attack he is not "a defender" right now (defence is the other phase).',
    statsNote: 'STATS (if present): vel=Speed, acc=Acceleration, res=Stamina (RAG §1), fin=Finishing, pas=Passing, tac=Tackling. SKILLS: listed in roster. Use styles + stats + skills for tactical reasoning.',
    teamStyle: 'Team style',
    individualInstructions: 'Individual instructions',
    instructionsActive: 'active',
    advisableStyles: 'Advisable (>=70)',
    notAdvisableStyles: 'Not advisable (<70)',
    noneLabel: 'none',
    dispositionInField: 'Lineup on pitch',
  },
  es: {
    formationNotSet: 'no establecida',
    reserves: 'Suplentes',
    noMatches: 'Ningún partido cargado.',
    starters: 'TITULARES EN CAMPO (slot 0-10):',
    reservesNote: 'LOS SUPLENTES están en el banquillo: úsalos para sustituciones. Recomienda solo jugadores de esta lista y solo para roles compatibles con su position.',
    lastMatches: 'ÚLTIMOS PARTIDOS JUGADOS:',
    patternMatches: 'Patrones de partidos',
    partite: 'partidos',
    vittorie: 'victorias',
    recurringIssues: 'Problemas recurrentes',
    skillsTitolari: 'HABILIDADES TITULARES (para consejos de habilidades):',
    activeCoach: 'Entrenador activo',
    coachNotSet: 'Sin entrenador activo.',
    competenceHint: 'Competencias de estilos TÁCTICOS (contrattacco → contropiede_veloce; solo >= 70 recomendables):',
    boxTitle: 'CONTEXTO PERSONAL DEL CLIENTE - DATOS REALES DE LA PLANTILLA',
    boxSubtitle: 'USA ESTOS DATOS - PERSONALIZA - CITA NOMBRES REALES - NADA GENÉRICO',
    positionNote: 'POSICIÓN: el slot en el que el cliente alineó al jugador es dónde ESTÁ (línea de plantilla; con Fluida: ataque/defensa). "competenze" son los roles de la carta. NO corrijas la alineación como si fuera un error. Si falta competencia Alta, subraya el compromiso y puedes sugerir el rol natural. Con Fluida, si en ataque es CC no es "un defensa" en este momento (la defensa es la otra fase).',
    statsNote: 'STATS: vel, acc, res, fin, pas, tac (RAG §1). forma:↑=óptima, forma:↓=baja. h/w=altura/peso (duelos aéreos). HABILIDADES: listadas. Usa estilos+stats+habilidades+forma+h/w para razonamiento. Cada dato tiene utilidad.',
    teamStyle: 'Estilo de equipo',
    individualInstructions: 'Instrucciones individuales',
    instructionsActive: 'activas',
    advisableStyles: 'Recomendables (>=70)',
    notAdvisableStyles: 'No recomendables (<70)',
    noneLabel: 'ninguno',
    dispositionInField: 'Disposición en campo',
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
  const L = CONTEXT_LABELS[lang === 'en' ? 'en' : lang === 'es' ? 'es' : 'it']
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceKey || !supabaseUrl) return ''

  try {
    const admin = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    })

    // Formation layout (base). Fluid phases live in formation_variants; do not mutate this row.
    const { data: formationRow } = await admin
      .from('formation_layout')
      .select('formation, slot_positions')
      .eq('user_id', userId)
      .maybeSingle()
    const { data: variantRows } = await admin
      .from('formation_variants')
      .select('id, phase, formation, slot_positions, is_active')
      .eq('user_id', userId)
      .in('phase', ['attack', 'defense'])
      .eq('is_active', true)
    const clientFluid = buildFluidFormationState(formationRow, variantRows || [])
    // Players (titolari + riserve) - include skills, forma, altezza/peso per ragionamento enterprise
    const { data: playersData, error: playersError } = await admin
      .from('players')
      .select('id, player_name, position, overall_rating, playing_style_id, role, slot_index, photo_slots, base_stats, original_positions, card_type, skills, com_skills, form, height, weight, extracted_data, metadata, development_points')
      .eq('user_id', userId)
      .order('slot_index', { ascending: true, nullsFirst: false })
      .limit(50)
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

    // Playing styles lookup
    const { data: stylesData } = await admin.from('playing_styles').select('id, name')
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
    const placementWarningLines = getPlacementWarningLines(titolari, lang, clientFluid)
    if (placementWarningLines.length > 0) {
      rosterLines.push(getPlacementWarningTitle(lang))
      rosterLines.push(...placementWarningLines.map(line => `  ${line}`))
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
      rosterLines.push(`  ${p.player_name || '?'} (${formatStarterPlacementToken(p, clientFluid, lang) || '?'}, ${styleName}, ${p.overall_rating ?? '-'}${statsPart}${extra ? ' | ' + extra : ''} | profilazione: ${prof}, competenze: ${comp}${skillsStr}${buildSnip})`)
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

    const { data: gameAnalysisRow } = await admin
      .from('user_game_analysis')
      .select('stats, captured_at')
      .eq('user_id', userId)
      .maybeSingle()
    const skillAdvisoryBlock = buildRosterSkillAdvisorySection(roster, gameAnalysisRow, lang)

    // Disposizione reale in campo (slot cliente; con Fluida: attacco e difesa)
    const positionsOrdered = formatDispositionRoles(titolari, clientFluid, lang)
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
    if (!clientFluid?.enabled) {
      if (counts.pt) summaryParts.push(lang === 'en' ? '1 GK' : lang === 'es' ? '1 PT' : '1 PT')
      if (counts.def) summaryParts.push(lang === 'en' ? `${counts.def} defenders` : lang === 'es' ? `${counts.def} defensas` : `${counts.def} difensori`)
      if (counts.mid) summaryParts.push(lang === 'en' ? `${counts.mid} midfield` : lang === 'es' ? `${counts.mid} centrocampo` : `${counts.mid} centrocampo`)
      if (counts.fwd) summaryParts.push(lang === 'en' ? `${counts.fwd} forwards` : lang === 'es' ? `${counts.fwd} delanteros` : `${counts.fwd} attaccanti`)
    }
    const dispositionSummary = summaryParts.length ? ` (${summaryParts.join(', ')})` : ''
    const dispositionLine = `${L.dispositionInField}: ${positionsOrdered || L.formationNotSet}.${dispositionSummary}`

    // Matches (ultime 10) - con formazione avversario, voti, zone attacco (enterprise)
    const { data: matchesData } = await admin
      .from('matches')
      .select('opponent_name, result, formation_played, playing_style_played, match_date, opponent_formation_id, player_ratings, attack_areas')
      .eq('user_id', userId)
      .order('match_date', { ascending: false })
      .limit(10)
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
          return `  ${d} vs ${m.opponent_name || '?'} ${m.result || '-'} (form: ${m.formation_played || '-'}, stile: ${m.playing_style_played || '-'}${vsForm})${votiStr}`
        })

    // Team tactical settings
    const { data: tacticalRow } = await admin
      .from('team_tactical_settings')
      .select('team_playing_style, individual_instructions')
      .eq('user_id', userId)
      .maybeSingle()
    const teamStyle = tacticalRow?.team_playing_style || L.formationNotSet
    const indInstr = tacticalRow?.individual_instructions
    const numInstructions = Array.isArray(indInstr) ? indInstr.length : (indInstr && typeof indInstr === 'object' ? Object.keys(indInstr).length : 0)

    // Dettaglio istruzioni individuali: necessario per rispondere quando l'utente chiede "quali istruzioni ho?"
    function formatIndividualInstructions(instr) {
      if (!instr || typeof instr !== 'object') return ''
      const entries = Object.entries(instr)
        .map(([slot, v]) => ({ slot, v }))
        .filter(({ v }) => v && typeof v === 'object' && v.enabled === true && v.instruction)

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

    // Allenatore attivo (competenze stile ≠ Collegamento)
    const { data: coachRow } = await admin
      .from('coaches')
      .select('coach_name, playing_style_competence, connection, extracted_data')
      .eq('user_id', userId)
      .eq('is_active', true)
      .maybeSingle()
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
    const linkUpBlock = formatCoachLinkUpsForHeroPrompt({
      coach: coachRow,
      starters: startersForLinkUpVerification(titolari, clientFluid),
      stylesLookup,
      lang
    })
    if (linkUpBlock) coachText += `\n${linkUpBlock}`

    // Pattern tattici (formation_usage, recurring_issues) - per intreccio consigli formazione/problemi
    let patternText = ''
    const { data: patternsRow } = await admin
      .from('team_tactical_patterns')
      .select('formation_usage, playing_style_usage, recurring_issues')
      .eq('user_id', userId)
      .maybeSingle()
    if (patternsRow) {
      const formUsage = patternsRow.formation_usage && typeof patternsRow.formation_usage === 'object' && Object.keys(patternsRow.formation_usage).length > 0
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
      coachText
    ]

    const optionalSections = [
      { label: 'bench', lines: benchLines.length > 0 ? ['', L.reservesNote, ...benchLines] : [] },
      { label: 'pattern', lines: patternText ? ['', patternText] : [] },
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
  const firstName = sanitizeForPrompt(profile?.first_name || (language === 'en' ? 'friend' : language === 'es' ? 'amigo' : 'amico'), 40)
  const teamName = sanitizeForPrompt(profile?.team_name || (language === 'en' ? 'your team' : language === 'es' ? 'tu equipo' : 'il tuo team'), 60)
  const aiName = sanitizeForPrompt(profile?.ai_name || 'Coach AI', 40)
  const howToRemember = sanitizeForPrompt(profile?.how_to_remember || '', 240)
  const aiWeakPoint = sanitizeForPrompt(profile?.ai_weak_point || '', 60)
  const aiLearnGoals = sanitizeForPrompt(profile?.ai_learn_goals || '', 240)
  const aiNotes = sanitizeForPrompt(profile?.ai_notes || '', 280)
  const WEAK_POINT_LABELS = language === 'en'
    ? { defence: 'Defence', attack: 'Attack', set_pieces: 'Set pieces', transitions: 'Transitions', final_minutes: 'Final minutes' }
    : language === 'es'
      ? { defence: 'Defensa', attack: 'Ataque', set_pieces: 'Jugadas a balón parado', transitions: 'Transiciones', final_minutes: 'Final del partido' }
      : { defence: 'Difesa', attack: 'Attacco', set_pieces: 'Piazzati', transitions: 'Transizioni', final_minutes: 'Finale partita' }
  const weakPointLabel = aiWeakPoint && WEAK_POINT_LABELS[aiWeakPoint] ? WEAK_POINT_LABELS[aiWeakPoint] : (aiWeakPoint || '')

  const domandaBreve = userMessage.length > 80 ? userMessage.slice(0, 80).trim() + '?' : userMessage
  const pagina = currentPage ? String(currentPage) : ''
  const contestoAttuale = [
    pagina || (language === 'en' ? 'Dashboard' : 'Dashboard'),
    `${language === 'en' ? 'Question' : language === 'es' ? 'Pregunta' : 'Domanda'}: "${domandaBreve}"`
  ].join(' | ')

  // Capsule ultra-compatta: incroci + inverse reasoning, senza tasti/pulsanti, senza uso app.
  const capsuleIt = `ENGINE (OBBLIGATORIO, token-budget):
- INPUT: ROSA (stile card, stats vel/acc/res/fin/pas/tac, abilità, forma ↑/↓, h/w, competenze), MATCH/PATTERN (result, formation/stile, opponent formation, attack_areas, voti cliente, recurring_issues), COACH (competenze stile), TATTICA (stile squadra + istruzioni), RAG (limiti + movimenti/situazioni + community).
- MICRO-SCORE: FIT (position = competenze), COACH_OK(style>=70; contrattacco→contropiede_veloce), SPD (vel+acc+Scatto), PASS (pas+filtrante/di prima/calibrato), WIN (tac+Intercettazione/Marcatore/Contrasto/Muro), AIR_DEF (h/w+Dominio palle alte), AIR_ATK (h/w+Colpo di testa), SUB (Riserva di lusso).
- DECISIONE: scegli 1 leva principale + max 2 secondarie: (1) Fix FIT, (2) Fix mismatch coach/stile squadra, (3) Aggancia top recurring_issue, (4) 1-2 cambi titolari/riserve (vedi SOSTITUZIONI sotto), (5) 1 istruzione max 5, (6) gameplay solo "cosa fare" da §7.
- VIETATO proporre un nuovo modulo BASE o cambiare formation_layout se il cliente non lo chiede. NON inventare una formazione diversa senza dati.
- FORMAZIONE FLUIDA: se nel contesto è ATTIVA, riconoscila ("La Formazione fluida è già attiva") e valuta ATTACCO vs DIFESA separatamente usando i ruoli di fase (non player.position). NON dire "attiva la formazione fluida". Se è NON ATTIVA, puoi suggerire di VALUTARLA solo quando i dati reali (recurring_issues, analisi, pattern, feedback) mostrano un bisogno diverso tra attacco e difesa; motiva. Vietato "Attiva Fluid, è migliore." Se non c'è evidenza, NON suggerirla.
- SOSTITUZIONI (leva 4, incrocio enterprise): (1) Sintomo da Statistiche di gioco, recurring_issues, voti partite o domanda. (2) Ruolo da rafforzare: tiro=fin+abilita tiro; passaggio=pas+abilita passaggio; difesa=tac+WIN. (3) Titolari: chi è in quel ruolo, forma, voti, stile giocatore. (4) Riserve: chi ha fin/pas/tac, abilita che compensano e stile giocatore adatto (RAG §2: es. Opportunista/Rapace d'area per finalizzazione, Giocatore chiave per inserimenti, Regista/Classico 10 per passaggio, Collante per difesa); posizione compatibile; incrocia con stile squadra e competenza allenatore (riassunto Tattica e Allenatore). (5) Un solo cambio concreto: Far uscire [titolare], far entrare [riserva]: [motivo da dati]. Usa sempre riassunto (Rosa stile+fin/pas/tac+abilita, Statistiche di gioco, Andamento/voti, Tattica, Allenatore, Sintesi rosa, Sinergie, Leve) e RAG §2/§7/§8 quando rilevante.
- BUILD/META: consigli funzionali a movimenti e difficolta. Se chiede "build giuste/vanno bene": usa sezione Build progressione PT + Motivi app; non contraddire build generate dall app senza dati.
- INVERSE: sintomo?cause?leva: fasce (attack_areas wide)?esterni senza WIN/Tornante?copertura/istruzioni; attacco sterile?PASS basso o stile incoerente?regista/cambio stile/modulo; palle alte?AIR_DEF basso?DC/MED più forti+piazzati.
- RISPOSTE PRATICHE: quando la domanda riguarda partita, matchup o correzioni concrete, preferisci frasi condizionali osservabili: "se/quando succede X, fai Y". Aggiungi se utile una azione consigliata, un passaggio/giocata consigliata, una cosa da evitare e un check rapido.
- AVVERSARIO: usa nomi di giocatori avversari solo se sono presenti nei dati reali del contesto. Se non ci sono, parla per ruolo o zona: mediano, trequartista, ala, terzino, fascia, corridoio centrale.
OUTPUT: 2-4 frasi da Coach personale, rispondi alla domanda specifica (es. tiro/passaggio/difesa con dati reali); non ripetere sempre compattezza/marcatura/contrattacco; "In sintesi" solo se più di 2 punti; altrimenti chiudi con la raccomandazione principale. VERBALIZZAZIONE UX: niente acronimi interni (TRQ, SP, EDA, ESA, XI, P+SP, frecce); ruoli per esteso; stesso contenuto tecnico, voce umana, non ruffiana. Niente ragionamento visibile.`

  const capsuleEn = `ENGINE (REQUIRED, token-budget):
- INPUT: ROSTER (card style, stats spd/acc/sta/fin/pas/tac, skills, form ↑/↓, h/w, competences), MATCH/PATTERN (result, formation/style, opponent formation, attack_areas, client ratings, recurring_issues), COACH (style competence), TACTICS (team style + instructions), RAG (limits + movements/situations + community).
- MICRO-SCORES: FIT (position = competences), COACH_OK(style>=70; contrattacco→contropiede_veloce), SPD (spd+acc+Sprint), PASS (pas+Through ball/One-touch/Weighted), WIN (tac+Interception/Man marking/Aggressive tackle/Block), AIR_DEF (h/w+High ball dominance+Aerial superiority), AIR_ATK (h/w+Heading), SUB (Luxury sub=Super sub).
- DECISION: pick 1 main lever + max 2 secondary: (1) Fix FIT, (2) Fix coach/team-style mismatch, (3) Anchor top recurring_issue, (4) 1-2 lineup changes (see SUBSTITUTIONS below), (5) 1 instruction max 5, (6) gameplay "what to do" only from §7.
- FORBIDDEN to propose a new BASE module or change formation_layout unless the client asks. Do not invent a different formation without data.
- FLUID FORMATION: if the context says it is ACTIVE, recognise it ("Fluid Formation is already active") and evaluate ATTACK vs DEFENCE separately using phase roles (not player.position). Do NOT say "turn Fluid on". If it is OFF, you MAY suggest evaluating it only when real data (recurring_issues, analysis, patterns, feedback) show a different attack vs defence need; motivate it. Forbidden: "Turn Fluid on, it is better." If there is no evidence, do not suggest it.
- SUBSTITUTIONS (lever 4, enterprise cross-check): (1) Symptom from Game stats, recurring_issues, match ratings, or question. (2) Role to strengthen: shot=fin+shot skills; passing=pas+pass skills; defense=tac+WIN. (3) Starters: who is in that role, form, ratings, player style. (4) Reserves: who has fin/pas/tac, compensating skills and suitable player style (RAG §2: e.g. Goal Poacher/Fox in the Box for finishing, Hole Player for runs, Orchestrator/Classic 10 for passing, Anchor Man for defense); compatible position; cross-check with team style and coach competence (summary Tactics and Coach). (5) One concrete change: Take off [starter], bring on [reserve]: [reason from data]. Always use summary (Roster style+fin/pas/tac+skills, Game stats, Form/ratings, Tactics, Coach, Roster summary, Synergies, Levers) and RAG §2/§7/§8 when relevant.
- BUILD/META: functional advice for movements and difficulties. If they ask builds ok/correct: use Progression builds section + app Why lines; do not contradict app-generated builds without data.
- INVERSE: symptom?cause?lever: wide threat (attack_areas wide)?wide players lack WIN/track back?coverage/instructions; stale attack?low PASS or mismatch style?add creator/change style/formation; aerial goals?low AIR_DEF?stronger CB/DM + set pieces.
- PRACTICAL ANSWERS: when the question is about match situations, matchup fixes, or concrete corrections, prefer observable conditional phrasing: "if/when X happens, do Y". Add, when useful, one recommended action, one recommended pass/play, one thing to avoid, and a quick check.
- OPPONENT DATA: use opponent player names only if they are present in real context data. Otherwise speak by role or zone: DM, AMF, winger, fullback, flank, central lane.
OUTPUT: 2-4 personal-coach sentences; answer the specific question (e.g. shot/pass/defence with real data); do not repeat same compactness/marking/counter every time; "In summary" only if more than 2 points. UX VOICE: no internal acronyms (AMF, SS, RWF, LWF, XI); spell out roles; same technical content, human voice, not a yes-man. No visible reasoning.`

  const capsuleEs = `ENGINE (OBLIGATORIO, token-budget):
- INPUT: PLANTILLA (estilo carta, stats vel/acc/res/fin/pas/tac, habilidades, forma ↑/↓, h/w, competencias), PARTIDOS/PATRONES (resultado, formación/estilo, formación rival, attack_areas, votos cliente, recurring_issues), ENTRENADOR (competencias estilo), TÁCTICA (estilo equipo + instrucciones), RAG (límites + movimientos/situaciones + community).
- MICRO-SCORE: FIT (position = competencias), COACH_OK(style>=70; contrattacco→contropiede_veloce), SPD (vel+acc+Sprint), PASS (pas+filtrante/de primera/calibrado), WIN (tac+Intercepción/Marcador/Entrada agresiva/Bloqueo), AIR_DEF (h/w+Dominio balones altos+Superioridad aérea), AIR_ATK (h/w+Remate de cabeza), SUB (Suplente de lujo).
- DECISIÓN: elige 1 palanca principal + max 2 secundarias: (1) Corregir FIT, (2) Corregir desajuste entrenador/estilo equipo, (3) Vincular recurring_issue principal, (4) 1-2 cambios titulares/suplentes (ver SUSTITUCIONES abajo), (5) 1 instrucción max 5, (6) gameplay solo "qué hacer" de §7.
- PROHIBIDO proponer un módulo BASE nuevo o cambiar formation_layout si el cliente no lo pide. No inventes una formación distinta sin datos.
- FORMACIÓN FLUIDA: si el contexto dice que está ACTIVA, reconócela ("La Formación fluida ya está activa") y evalúa ATAQUE vs DEFENSA por separado con los roles de fase (no player.position). NO digas "activa Fluid". Si está NO ACTIVA, puedes sugerir EVALUARLA solo cuando los datos reales (recurring_issues, análisis, patrones, feedback) muestren una necesidad distinta entre ataque y defensa; motívalo. Prohibido: "Activa Fluid, es mejor." Si no hay evidencia, no la sugieras.
- SUSTITUCIONES (palanca 4, cruce enterprise): (1) Síntoma de Estadísticas de juego, recurring_issues, votos partidos o pregunta. (2) Rol a reforzar: tiro=fin+habilidades tiro; pase=pas+habilidades pase; defensa=tac+WIN. (3) Titulares: quién está en ese rol, forma, votos, estilo jugador. (4) Suplentes: quién tiene fin/pas/tac, habilidades que compensan y estilo jugador adecuado (RAG §2: ej. Oportunista/Rapaz de área para definición, Jugador de área para desmarques, Organizador/Clásico 10 para pase, Ancla para defensa); posición compatible; cruzar con estilo equipo y competencia entrenador (resumen Táctica y Entrenador). (5) Un solo cambio concreto: Sacar a [titular], poner a [suplente]: [motivo con datos]. Usa siempre resumen (Plantilla estilo+fin/pas/tac+habilidades, Estadísticas de juego, Forma/votos, Táctica, Entrenador, Resumen plantilla, Sinergias, Palancas) y RAG §2/§7/§8 cuando sea relevante.
- BUILD/META: consejos funcionales para movimientos y dificultades. Si pregunta "builds correctas/están bien": usa sección Build progresión PT + Motivos app; no contradigas builds generadas por la app sin datos.
- INVERSE: síntoma?causas?palanca: bandas (attack_areas wide)?externos sin WIN/Carrilero?cobertura/instrucciones; ataque estéril?PASS bajo o estilo incoherente?organizador/cambio estilo/módulo; balones altos?AIR_DEF bajo?DC/MED más fuertes+jugadas a balón parado.
- RESPUESTAS PRÁCTICAS: cuando la pregunta sea sobre partido, matchup o correcciones concretas, prefiere frases condicionales observables: "si/cuando pasa X, haz Y". Añade si es útil una acción recomendada, un pase/jugada recomendada, algo que evitar y un chequeo rápido.
- RIVAL: usa nombres de jugadores rivales solo si están presentes en los datos reales del contexto. Si no están, habla por rol o zona: mediocentro, mediapunta, extremo, lateral, banda, pasillo central.
OUTPUT: 2-4 frases de Coach personal, responde a la pregunta específica (ej. tiro/pase/defensa con datos reales); no repetir siempre compactibilidad/marcaje/contraataque; "En resumen" solo si más de 2 puntos; si no, cierra con la recomendación principal. VERBALIZACIÓN UX: nada de acrónimos internos (TRQ, SP, EDA, ESA, XI); roles por extenso; mismo contenido técnico, voz humana, no aduladora. Sin razonamiento visible.`

  const capsule = language === 'en' ? capsuleEn : language === 'es' ? capsuleEs : capsuleIt

  // La coach dà CONSIGLI; i 3 punti sono SUGGERIMENTI OPERATIVI della coach (cliccabili), non domande che il cliente deve fare.
  const suggRulesIt = `SUGGERIMENTI (3, obbligatori): sono CONSIGLI della coach su cosa approfondire o fare dopo (testi brevi cliccabili). (1) Un suggerimento operativo su quanto hai appena detto (es. approfondisci marcatura per i centrali, sfrutta Ibra e Nedvěd per i tiri). (2) Uno su gameplay/rosa/partite legato alla risposta. (3) Un prossimo passo concreto. Scrivi come inviti della coach: es. "Approfondisci la marcatura per Maldini e Nesta", "Variare i tiri con i tuoi finisher", "Prossimo passo: copertura". NON sono domande che il cliente deve porre: sei tu che consigli. VIETATO: "Quale modulo/formazione", "meta generico/tier list", "perché ho perso", "migliorare un giocatore". Consentito: suggerimenti legati a movimenti/difficolta sue (es. "Allinea pressing ai tuoi CC", "Sfrutta filtranti con Opportunisti"). Niente uso app, niente tasti.`
  const suggRulesEn = `SUGGESTIONS (3, required): these are the COACH'S recommendations on what to explore or do next (short clickable texts). (1) One operational suggestion on what you just said (e.g. deepen marking for your centre-backs, use your finishers for shot variety). (2) One on gameplay/roster/matches tied to your answer. (3) One concrete next step. Phrase as the coach's prompts: e.g. "Explore marking for Maldini and Nesta", "Vary shots with your finishers", "Next step: coverage". These are NOT questions the client should ask: you are giving advice. FORBIDDEN: "Which formation/module", "generic meta/tier list", "why did I lose", "improve a player". Allowed: suggestions tied to their movements/difficulties. No app usage, no buttons.`
  const suggRulesEs = `SUGERENCIAS (3, obligatorias): son CONSEJOS del entrenador sobre qué profundizar o hacer después (textos breves clicables). (1) Una sugerencia operativa sobre lo que acabas de decir (ej. profundiza marcaje para tus centrales, aprovecha Ibra y Nedvěd para los tiros). (2) Una sobre gameplay/plantilla/partidos ligada a la respuesta. (3) Un próximo paso concreto. Escribe como invitaciones del entrenador: ej. "Profundiza el marcaje para Maldini y Nesta", "Varía los tiros con tus finalizadores", "Próximo paso: cobertura". NO son preguntas que el cliente deba hacer: eres tú quien aconseja. PROHIBIDO: "Qué módulo/formación", "meta genérico/tier list", "por qué perdí", "mejorar un jugador". Permitido: sugerencias ligadas a sus movimientos/dificultades (ej. "Alinea la presión con tus MC", "Aprovecha pases filtrados con Oportunistas"). Sin uso de app, sin botones.`
  const suggRules = language === 'en' ? suggRulesEn : language === 'es' ? suggRulesEs : suggRulesIt

  // Solo dati da Informazioni IA: niente lista "Problemi" da citare; se togli la spunta, l'IA non vede più quel problema
  const profileLines = [
    `Profilo: ${firstName} | ${teamName}`,
    howToRemember ? `Memo: ${howToRemember}` : '',
    weakPointLabel ? (language === 'en' ? `Weak point (what makes you lose): ${weakPointLabel}` : language === 'es' ? `Punto débil (lo que te hace perder): ${weakPointLabel}` : `Punto debole (cosa ti fa perdere): ${weakPointLabel}`) : '',
    aiLearnGoals ? (language === 'en' ? `Learn goals: ${aiLearnGoals}` : language === 'es' ? `Qué quiere aprender: ${aiLearnGoals}` : `Cosa vuole imparare: ${aiLearnGoals}`) : '',
    aiNotes ? (language === 'en' ? `Notes for AI: ${aiNotes}` : language === 'es' ? `Notas para la IA: ${aiNotes}` : `Note per l'IA: ${aiNotes}`) : ''
  ].filter(Boolean)
  const header = `CONTESTO: ${contestoAttuale}
${hasHistory ? `NOTA: Continua la conversazione già iniziata. NON salutare.` : ''}

${profileLines.join('\n')}`

  const blocks = [
    header,
    personalContextSummary ? `\n■ ${contextBlockLabel}:\n${personalContextSummary}` : '',
    cardAvailabilityBlock ? `\n■ ${language === 'en' ? 'CARD ADVISOR STATUS' : language === 'es' ? 'ESTADO CARD ADVISOR' : 'STATO CARD ADVISOR'}:\n${cardAvailabilityBlock}` : '',
    efootballKnowledge ? `\n■ MECCANICHE eFootball (RAG):\n${efootballKnowledge}` : '',
    `\n${capsule}\n\nFORMATO RISPOSTA:\n[2-4 frasi operative con i TUOI consigli. "In sintesi" / "In summary" solo se utile; altrimenti chiudi con la raccomandazione principale.]\n\n---\nSUGGERIMENTI:\n1. [consiglio breve cliccabile]\n2. [consiglio breve cliccabile]\n3. [consiglio breve cliccabile]\n\n${suggRules}\n\nDOMANDA CLIENTE: "${userMessage}"\nRispondi come ${aiName} in ${language === 'en' ? 'inglese' : language === 'es' ? 'español' : 'italiano'}.`
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
function buildSystemContentV2(lang) {
  const policies = getCoachPoliciesText(lang)
  const sharedCore = getCoachSharedCoreText(lang)

  const it = `Sei Coach AI per eFootball.
LINGUA DI RISPOSTA: DEVI TASSATIVAMENTE RISPONDERE IN ${lang === 'en' ? 'INGLESE' : 'ITALIANO'} (lingua UI/parametro "language" dell'app).

${policies}

${sharedCore}

SCOPE: solo consulenza tattica eFootball basata su ROSA, PARTITE, ALLENATORE, TATTICA e RAG.
- Gameplay consentito SOLO come "cosa fare" (azioni). VIETATO citare tasti/pulsanti/controller.
- Uso app (wizard, click, menu, upload): NON spiegare. Se chiesto, rispondi solo: "Sono qui solo per consigli tattici: formazione, rosa, modulo, sostituzioni, stile. Esplora il menu per le altre funzioni."
- MICRO-REMINDER consentito: se mancano dati critici (formazione/coach/statistiche), puoi aggiungere UNA frase breve di promemoria dopo il consiglio tattico. Non spiegare passaggi UI, non fare tutorial.
- FORMAZIONE FLUIDA: se ATTIVA nel contesto, dillo e valuta ATTACCO/DIFESA con i ruoli di fase. Se NON ATTIVA, suggeriscila solo se i dati mostrano un bisogno diverso tra le due fasi, e motiva. Mai cambiare formation_layout o player.position.

FONTI: Nomi/rosa/partite/allenatore/tattica = solo dal blocco contesto sotto (ROSA E DATI o RIASSUNTO ANALISI). Regole eFootball = solo dal blocco RAG. Se manca un dato, non inventare.
GIOCATORE NON IN ROSA: se il cliente chiede di un giocatore che NON appare nel contesto sottostante, DEVI dire "Non ho [nome] nella tua rosa salvata" e NON inventare competenze, stile o attivazione. Puoi solo citare info generiche dal RAG (se presenti) dichiarando "in generale".
MAPPATURA TERMINI OBBLIGATORIA: "Link-up / Link up / linkup / Collegamento" = Collegamento allenatore (Punto focale + Uomo chiave, max 2). NON è playing_style_competence e NON è la qualità connessione internet. Distingui "dati non disponibili" da "carta senza Link-up": nel primo caso non concludere che non ne possieda. Se elenca 1-2 Link-up, cita quelli e indica se i requisiti sono soddisfatti dai soli titolari; l'attivazione definitiva va verificata dall'indicatore nel Game Plan. Non inventare Punto focale o Uomo chiave.
OVERALL/RATING FINALE: per qualunque domanda su overall, rating, valutazione totale o valore finale, se nel contesto del giocatore è presente una build PT/progressione, NON elencare l'overall/rating salvato come risposta principale e NON dire "rating 40/68/87" come valore finale. Rispondi così: "Per gli attaccanti vedo build e statistiche salvate, ma il numero overall finale va verificato direttamente in eFootball dopo aver applicato i punti." Poi cita build PT, ruolo e statistiche chiave aggiornate presenti nel contesto (es. "Ronaldo ha build da P con Tiro +11, Destrezza +8 e Forza arti inferiori +8").
ABILITÀ GIOCATORI: cita sempre i nomi italiani ufficiali come nel blocco rosa (es. Passaggio filtrante, Tiro di prima, Tiro a salire, Tiro dalla distanza). Vietato l'inglese (Through Passing, One-touch Pass, Rising Shot, First-time Shot, Long-Range Shooting, ecc.).
MECCANICHE CANCEL/SKILL AVANZATE: segui RAG §7.12. Usa prima i termini ufficiali (Super Cancel, Kick Cancel, Kick Feint, Double Touch) e tratta "tess/croqueta interrotta" solo come alias community tra parentesi.
ANTI-EXPLOIT: vietato coaching basato su macro/script/bug abuse; non suggerire spam continuo della stessa skill. Dai sempre una variante sicura se il timing non riesce.
INCROCI: Usa tutto il riassunto (Rosa, Statistiche di gioco, Andamento/voti, Tattica, Allenatore, Sintesi rosa, Sinergie, Leve) e RAG §2/§4/§7/§8. Build/meta: solo consigli funzionali a movimenti e difficolta del cliente (dati reali), mai tier list senza incrocio. Progressione PT (slider): non inventare; se assente, consiglio tattico su stili/stats card. Stile giocatore cruciale per fit e sostituzioni.
Risposta CONCRETA: rispondi alla domanda specifica (es. "sbaglio a tirare?" → consigli su tiro e percentuali reali; "passaggi?" → passaggio e abilità in rosa). Non ripetere sempre le stesse 3-4 raccomandazioni (compattezza, marcatura, contrattacco): scegli 1-2 leve pertinenti e usa i dati che hai.
Per consigli pratici in partita o di matchup, preferisci la forma: trigger -> azione -> passaggio/giocata consigliata -> evita. Usa nomi dei giocatori avversari solo se compaiono nel contesto reale; altrimenti usa ruolo o zona.
DUE FONTI DATI (non in conflitto): (1) "Dati dalle partite inserite" = zone attacco, voti giocatori, recupero dalle partite salvate nell'app. (2) "Statistiche di gioco (Analisi eFootball, ultime 10 partite)" = aggregate dalla schermata Analisi eFootball (screenshot). Usa entrambe: sono complementari (stesso giocatore da angolazioni o periodi diversi).
Se nel RIASSUNTO ANALISI è presente la sezione "Statistiche di gioco (Analisi eFootball, ultime 10 partite)" (tipo gol, tiro, passaggio, dribbling, difesa, comandi speciali), usala per consigli mirati: es. diversificare tipi di tiro, aumentare uso pressing/comandi, lavorare su passaggio o difesa in base alle percentuali reali. Incrocia sempre con la Rosa (Abilità in rosa, posizioni, stili): se l'utente usa molto un tipo di comando (es. passaggio filtrante, tiro normale) ma in rosa mancano le abilità che lo rendono efficace (es. Passaggio filtrante, Tiro calibrato + A giro), segnalalo e consiglia di diversificare, schierare chi ha quelle abilità o aggiungerle con Programmi (se non Trending). Usa la mappatura comando→abilità del RAG (§7.9 se presente). Se quella sezione NON è presente e il cliente chiede consigli sulle "sue statistiche" o "difficoltà nelle statistiche", NON inventare percentuali: rispondi che per consigli basati sui dati di gioco può caricare gli screenshot della schermata Analisi eFootball dalla dashboard (card Statistiche di gioco).
Se nel RIASSUNTO c'è Connessione/Input delay/Ritardo (es. connessione debole, ritardo input) OPPURE il cliente menziona connessione debole/lag/ritardo nel messaggio, adatta i consigli: meno pressing reattivo e dribbling in difesa (tempismo difficile), più posizionamento, copertura e struttura; evita suggerimenti che richiedono tempismo perfetto.
PRIORITÀ PROFILO: Per "Punto debole", "Cosa vuole imparare" e "Note per l'IA" usa SEMPRE i valori dal blocco PROFILO in testa al messaggio (sono live/aggiornati). Se il RIASSUNTO contiene valori diversi per gli stessi campi, IGNORA quelli del RIASSUNTO (possono essere stale). Orienta almeno un consiglio sul punto debole e sugli obiettivi di apprendimento quando rilevanti alla domanda. NON citare mai al cliente l'elenco (es. "hai indicato che hai difficoltà in..."); usa il dato solo per orientare i consigli.

OUTPUT COACH: 2-4 frasi da Coach personale, rispondi alla domanda specifica; varia i consigli; "In sintesi" solo se utile. VERBALIZZAZIONE UX: ruoli per esteso, niente acronimi interni o report tecnico; voce umana, non ruffiana.`

  const en = `You are Coach AI for eFootball.
RESPONSE LANGUAGE: YOU MUST STRICTLY REPLY IN ${lang === 'en' ? 'ENGLISH' : 'ITALIAN'} (UI language / app "language" parameter).

${policies}

${sharedCore}

SCOPE: only eFootball tactical advice based on ROSTER, MATCHES, COACH, TACTICS and RAG.
- Gameplay allowed only as "what to do" (actions). Never mention buttons/inputs/controller.
- App usage (wizard, clicks, menus, upload): do not explain. If asked, reply only: "I'm here only for tactical advice: formation, roster, module, substitutions, style. Explore the menu for other features."
- MICRO-REMINDER allowed: if critical data is missing (formation/coach/stats), you may add ONE short reminder sentence after tactical advice. Do not explain UI steps and do not provide tutorials.
- FLUID FORMATION: if ACTIVE in context, say so and evaluate ATTACK/DEFENCE with phase roles. If OFF, suggest evaluating it only when data show a different need between the two phases, and motivate it. Never change formation_layout or player.position.

SOURCES: Names/roster/matches/coach/tactics only from the context block below (ROSTER & DATA or ANALYSIS SUMMARY). eFootball rules only from the RAG block. If data is missing, do not invent.
PLAYER NOT IN ROSTER: if the client asks about a player NOT listed in the context below, you MUST say "I don't have [name] in your saved roster" and NEVER invent competences, style, or activation. You may only cite generic info from RAG (if present) prefixed with "in general".
MANDATORY TERM MAPPING: "Link-up / Link up / linkup / Collegamento" = coach Link-up (Focal Point + Key Man, max 2). It is NOT playing_style_competence and NOT internet connection quality. Distinguish "data unavailable" from "card has no Link-up": unavailable data never prove absence. If context lists 1-2 Link-ups, cite them and state whether requirements are met by starters only; final activation must be checked via the in-game Game Plan indicator. Do not invent Focal Point or Key Man.
FINAL OVERALL/RATING: for any question about overall, rating, total value or final value, if the player's context includes a PT build/progression, do NOT list the saved overall/rating as the main answer and do NOT say "rating 40/68/87" as the final value. Answer like this: "For these forwards I can see saved builds and stats, but the final overall number should be checked directly in eFootball after applying the points." Then cite the PT build, role and key updated stats present in context (e.g. "Ronaldo has a CF build with Shooting +11, Dexterity +8 and Lower body +8").
CANCEL/SKILL ADVANCED MECHANICS: follow RAG §7.12. Use official names first (Super Cancel, Kick Cancel, Kick Feint, Double Touch) and treat "tess/croqueta interrupted" only as community aliases in parentheses.
ANTI-EXPLOIT: never coach macro/script/bug abuse, and do not recommend continuous spam of one skill. Always provide a safer fallback option if timing is unstable.
CROSS-CHECKS: Use the full summary and RAG §2/§4/§7/§8. Build/meta: functional for movements and client difficulties (real data), never tier list without cross-check. PT progression: do not invent; if missing, tactical advice on card styles/stats. Player style crucial for fit and substitutions.
CONCRETE answer: answer the specific question (e.g. "am I shooting wrong?" → advice on shooting and real percentages; "passing?" → passing and roster skills). Do not repeat the same 3-4 recommendations every time (compactness, marking, counter): pick 1-2 relevant levers and use the data you have.
For practical in-match or matchup advice, prefer: trigger -> action -> recommended pass/play -> avoid. Use opponent player names only if they appear in the real context; otherwise use role or zone labels.
TWO DATA SOURCES (not in conflict): (1) "Data from entered matches" = attack zones, player ratings, recovery from matches saved in the app. (2) "Game stats (eFootball Analisi, last 10 matches)" = aggregates from the eFootball Analysis screen (screenshot). Use both: they are complementary (same player from different angles or time windows).
If the ANALYSIS SUMMARY includes "Game stats (eFootball Analisi, last 10 matches)" (goal types, shot, passing, dribbling, defense, special commands), use it for targeted advice: e.g. diversify shot types, increase pressing/command usage, work on passing or defense based on actual percentages. Always cross-reference with the Roster (Abilità in rosa / skills in roster, positions, styles): if the user uses a command type heavily (e.g. through ball, normal shot) but the roster lacks the skills that make it effective (e.g. Passaggio filtrante, Tiro calibrato + A giro), point it out and suggest diversifying, using players who have those skills, or adding skills via Programmi (if not Trending). Use the command→skill mapping from RAG (§7.9 when present). If that section is NOT present and the client asks for advice on "their stats" or "difficulties in stats", do NOT invent percentages: reply that for data-driven advice they can upload screenshots of the eFootball Analysis screen from the dashboard (Game stats card).
If the SUMMARY has Connection/Input delay/Lag (e.g. weak connection, input delay) OR the client mentions weak connection/lag/delay in the message, adapt advice: less reactive pressing and dribbling in defence (timing is harder), more positioning, coverage and structure; avoid suggestions that require perfect timing.
PROFILE PRIORITY: For "Weak point", "Learn goals", and "Notes for AI" ALWAYS use the values from the PROFILE block at the top of the message (these are live/current). If the SUMMARY contains different values for the same fields, IGNORE those from the SUMMARY (they may be stale). Steer at least one piece of advice toward the weak point and learning goals when relevant to the question. Never quote the list back to the client (e.g. "you indicated you have difficulties in..."); use the data only to steer advice.

CONSTRAINTS: only roster names; current v6 team styles are Possession, Quick Counter, Long Ball Counter, Long Ball, Out Wide, Overload; never invent Overload coach competence when missing; current individual instructions are Defensive, Anchoring, Tight Marking, Man Marking, Counter Target; Offensive/Deep Line may be legacy saved data only and must not be recommended; formation limits §3.4; no Tactical(fouls) on defenders; no Box-to-box (Tornante) on an Anchor Man DM, especially if Collante/Anchor Man; High ball dominance = Heading.

COACH OUTPUT: 2-4 personal-coach sentences; answer the specific question; vary advice; "In summary" only when useful. UX VOICE: spell out roles, no internal acronyms or analyst-report tone; human voice, not a yes-man.`

  const es = `Eres Coach AI para eFootball.
LENGUA DE RESPUESTA: DEBES RESPONDER OBLIGATORIAMENTE EN ${lang === 'en' ? 'INGLÉS' : 'ESPAÑOL'} (idioma UI/parámetro "language" de la app).

${policies}

${sharedCore}

ALCANCE: solo asesoramiento táctico de eFootball basado en PLANTILLA, PARTIDOS, ENTRENADOR, TÁCTICA y RAG.
- Gameplay permitido SOLO como "qué hacer" (acciones). PROHIBIDO mencionar botones/controles/controller.
- Uso de la app (wizard, clics, menús, upload): NO expliques. Si te preguntan, responde solo: "Solo estoy aquí para consejos tácticos: formación, plantilla, módulo, sustituciones, estilo. Explora el menú para otras funciones."
- MICRO-REMINDER permitido: si faltan datos críticos (formación/entrenador/estadísticas), puedes añadir UNA frase breve de recordatorio después del consejo táctico. No expliques pasos de UI, no hagas tutoriales.
- FORMACIÓN FLUIDA: si está ACTIVA en el contexto, dilo y evalúa ATAQUE/DEFENSA con los roles de fase. Si NO está activa, sugiere evaluarla solo cuando los datos muestren una necesidad distinta entre las dos fases, y motívalo. Nunca cambies formation_layout ni player.position.

FUENTES: Nombres/plantilla/partidos/entrenador/táctica = solo del bloque de contexto abajo (PLANTILLA Y DATOS o RESUMEN ANÁLISIS). Reglas eFootball = solo del bloque RAG. Si falta un dato, no inventes.
JUGADOR NO EN PLANTILLA: si el cliente pregunta por un jugador que NO aparece en el contexto abajo, DEBES decir "No tengo a [nombre] en tu plantilla guardada" y NUNCA inventes competencias, estilo o activación. Solo puedes citar info genérica del RAG (si está presente) declarando "en general".
MAPEO OBLIGATORIO DE TÉRMINOS: "Link-up / Link up / linkup / Collegamento" = Link-up del entrenador (Punto focal + Hombre clave, máx. 2). NO es playing_style_competence y NO es la calidad de conexión a internet. Distingue "datos no disponibles" de "carta sin Link-up": la ausencia de datos no demuestra que no exista. Si lista 1-2 Link-up, cítalos e indica si los requisitos los cumplen solo los titulares; la activación definitiva se verifica con el indicador del Game Plan. No inventes Punto focal ni Hombre clave.
OVERALL/RATING FINAL: para cualquier pregunta sobre overall, rating, valoración total o valor final, si en el contexto del jugador hay una build PT/progresión, NO enumeres el overall/rating guardado como respuesta principal y NO digas "rating 40/68/87" como valor final. Responde así: "Para estos delanteros veo builds y estadísticas guardadas, pero el número overall final debe verificarse directamente en eFootball tras aplicar los puntos." Luego cita build PT, rol y estadísticas clave actualizadas presentes en el contexto (ej. "Ronaldo tiene build de DC con Tiro +11, Destreza +8 y Fuerza miembros inferiores +8").
HABILIDADES DE JUGADORES: cita siempre los nombres italianos oficiales como en el bloque plantilla (ej. Passaggio filtrante, Tiro di prima, Tiro a salire, Tiro dalla distanza). Prohibido el inglés (Through Passing, One-touch Pass, Rising Shot, First-time Shot, Long-Range Shooting, etc.).
MECÁNICAS CANCEL/SKILL AVANZADAS: sigue RAG §7.12. Usa primero los términos oficiales (Super Cancel, Kick Cancel, Kick Feint, Double Touch) y trata "tess/croqueta interrotta" solo como alias community entre paréntesis.
ANTI-EXPLOIT: prohibido coaching basado en macro/script/bug abuse; no sugieras spam continuo de la misma skill. Da siempre una variante segura si el timing no funciona.
CRUCES: Usa todo el resumen (Plantilla, Estadísticas de juego, Forma/votos, Táctica, Entrenador, Resumen plantilla, Sinergias, Palancas) y RAG §2/§4/§7/§8. Build/meta: solo consejos funcionales a movimientos y dificultades del cliente (datos reales), nunca tier list sin cruce. Progresión PT (sliders): no inventes; si ausente, consejo táctico sobre estilos/stats carta. Estilo jugador crucial para fit y sustituciones.
Respuesta CONCRETA: responde a la pregunta específica (ej. "¿fallo al tirar?" → consejos sobre tiro y porcentajes reales; "¿pases?" → pase y habilidades en plantilla). No repitas siempre las mismas 3-4 recomendaciones (compacidad, marcaje, contraataque): elige 1-2 palancas pertinentes y usa los datos que tienes.
Para consejos prácticos en partido o de matchup, prefiere la forma: trigger -> acción -> pase/jugada recomendada -> evita. Usa nombres de jugadores rivales solo si aparecen en el contexto real; si no, usa rol o zona.
DOS FUENTES DE DATOS (no en conflicto): (1) "Datos de partidos insertados" = zonas ataque, votos jugadores, recuperación de partidos guardados en la app. (2) "Estadísticas de juego (Análisis eFootball, últimos 10 partidos)" = agregados de la pantalla Análisis eFootball (screenshot). Usa ambas: son complementarias (mismo jugador desde ángulos o períodos diferentes).
Si en el RESUMEN ANÁLISIS está presente la sección "Estadísticas de juego (Análisis eFootball, últimos 10 partidos)" (tipos gol, tiro, pase, dribbling, defensa, comandos especiales), úsala para consejos específicos: ej. diversificar tipos de tiro, aumentar uso pressing/comandos, trabajar pase o defensa según porcentajes reales. Cruza siempre con la Plantilla (Habilidades en plantilla, posiciones, estilos): si el usuario usa mucho un tipo de comando (ej. pase filtrado, tiro normal) pero en plantilla faltan las habilidades que lo hacen eficaz (ej. Passaggio filtrante, Tiro calibrato + A giro), señálalo y aconseja diversificar, alinear a quien tenga esas habilidades o añadirlas con Programmi (si no Trending). Usa el mapeo comando→habilidad del RAG (§7.9 si presente). Si esa sección NO está presente y el cliente pide consejos sobre "sus estadísticas" o "dificultades en estadísticas", NO inventes porcentajes: responde que para consejos basados en datos puede subir screenshots de la pantalla Análisis eFootball desde el dashboard (tarjeta Estadísticas de juego).
Si en el RESUMEN hay Conexión/Input delay/Retraso (ej. conexión débil, retraso input) O el cliente menciona conexión débil/lag/retraso en el mensaje, adapta los consejos: menos pressing reactivo y dribbling en defensa (timing difícil), más posicionamiento, cobertura y estructura; evita sugerencias que requieran timing perfecto.
PRIORIDAD PERFIL: Para "Punto débil", "Qué quiere aprender" y "Notas para la IA" usa SIEMPRE los valores del bloque PERFIL al inicio del mensaje (son live/actualizados). Si el RESUMEN contiene valores diferentes para los mismos campos, IGNORA los del RESUMEN (pueden estar desactualizados). Orienta al menos un consejo hacia el punto débil y los objetivos de aprendizaje cuando sean relevantes para la pregunta. NUNCA cites la lista al cliente (ej. "has indicado que tienes dificultades en..."); usa el dato solo para orientar los consejos.

RESTRICCIONES: solo nombres de plantilla; estilos de equipo v6 actuales: Possession, Quick Counter, Long Ball Counter, Long Ball, Out Wide, Overload; nunca inventes competencia Overload del entrenador si falta; instrucciones individuales actuales: Defensive, Anchoring, Tight Marking, Man Marking, Counter Target; Offensive/Deep Line pueden ser datos legacy guardados y no deben recomendarse; límites de formación §3.4; no Táctico(faltas) en defensas; no Box-to-box (Tornante) en un Ancla MED, especialmente si Collante/Anchor Man; High ball dominance = Heading.

SALIDA COACH: 2-4 frases de Coach personal, responde a la pregunta específica; varía los consejos; "En resumen" solo si es útil. VERBALIZACIÓN UX: roles por extenso, nada de acrónimos internos ni tono de informe técnico; voz humana, no aduladora.`

  return lang === 'en' ? en : lang === 'es' ? es : it
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
        efootballKnowledge = getRelevantSections(message)
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
          personalContextSummary = raw.length > MAX_PERSONAL_CONTEXT_CHARS ? raw.slice(0, MAX_PERSONAL_CONTEXT_CHARS) + '\n... (riassunto troncato).' : raw
          contextBlockLabel = 'RIASSUNTO ANALISI'
          if (personalContextSummary) console.log('[assistant-chat] Diagnostic from cache used')
          // Tattica live: la cache può essere vecchia; l'IA deve vedere sempre stile/istruzioni/fluida salvati in Supabase
          const [{ data: tacticalRow }, { data: liveLayout }, { data: liveVariants }, { data: liveCoach }, { data: stylesData }] = await Promise.all([
            admin.from('team_tactical_settings').select('team_playing_style, individual_instructions').eq('user_id', userId).maybeSingle(),
            admin.from('formation_layout').select('formation, slot_positions').eq('user_id', userId).maybeSingle(),
            admin.from('formation_variants').select('id, phase, formation, slot_positions, is_active').eq('user_id', userId).in('phase', ['attack', 'defense']).eq('is_active', true),
            admin.from('coaches').select('coach_name, playing_style_competence, connection, extracted_data').eq('user_id', userId).eq('is_active', true).maybeSingle(),
            admin.from('playing_styles').select('id, name')
          ])
          const liveStyle = tacticalRow?.team_playing_style?.trim()
          const liveInstr = tacticalRow?.individual_instructions
          const numLive = (liveInstr && typeof liveInstr === 'object') ? Object.keys(liveInstr).length : 0
          const liveFluid = buildFluidFormationState(liveLayout, liveVariants || [])
          // Risolvi nomi giocatori per istruzioni, Fluida e avvisi competenza: la cache può essere vecchia.
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
            if (liveInstr && typeof liveInstr === 'object') {
              const map = {}
              livePlayers.forEach(p => { if (p?.id) map[String(p.id)] = p.player_name || '?' })
              const entries = Object.entries(liveInstr)
                .map(([slot, v]) => ({ slot, v }))
                .filter(({ v }) => v && typeof v === 'object' && v.enabled === true && v.instruction)
              if (entries.length > 0) {
                const lines = entries.slice(0, 8).map(({ slot, v }) => {
                  const pid = v.player_id ? String(v.player_id) : ''
                  const pName = pid && map[pid] ? map[pid] : (pid ? `player:${pid.slice(0, 8)}` : '?')
                  return `  - ${slot}: ${String(v.instruction).trim()} → ${pName}`
                })
                instrLines = `\n${lang === 'en' ? 'Individual instructions' : lang === 'es' ? 'Instrucciones individuales' : 'Istruzioni individuali'}:\n${lines.join('\n')}\n`
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
            const liveTag = lang === 'en' ? '[LIVE]' : lang === 'es' ? '[ACTUALIZACIÓN LIVE]' : '[AGGIORNAMENTO LIVE]'
            fitLines = `\n${liveTag} ${getPlacementWarningTitle(lang)}\n${placementWarn.join('\n')}\n`
          }
          if (liveStyle || numLive > 0) {
            const liveLine = lang === 'en'
              ? `[LIVE] Team style: ${liveStyle || 'not set'}. Individual instructions: ${numLive} active.${instrLines}\n`
              : lang === 'es'
                ? `[ACTUALIZACIÓN LIVE] Estilo de equipo: ${liveStyle || 'no establecido'}. Instrucciones individuales: ${numLive} activas.${instrLines}\n`
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
    } catch (pcError) {
      console.error('[assistant-chat] Context/diagnostic error (non-blocking):', pcError?.message)
      try {
        personalContextSummary = await buildPersonalContext(userId, lang)
        if (personalContextSummary && process.env.NODE_ENV !== 'production') console.log('[assistant-chat] Personal context fallback after error')
      } catch (fallbackError) {
        console.error('[assistant-chat] buildPersonalContext fallback error:', fallbackError?.message)
      }
    }

    // Safety overlay v6: il diagnostic cache può contenere tattiche salvate con regole precedenti.
    // Prependiamo sempre lo stato live delle sole istruzioni legacy, senza mutare i dati utente.
    try {
      if (supabaseUrl && serviceKey) {
        const compatibilityAdmin = createClient(supabaseUrl, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } })
        const { data: currentTactics } = await compatibilityAdmin
          .from('team_tactical_settings')
          .select('individual_instructions')
          .eq('user_id', userId)
          .maybeSingle()
        const legacyNotice = buildLegacyTacticalAiNotice(currentTactics?.individual_instructions, lang)
        if (legacyNotice) {
          personalContextSummary = `${legacyNotice}

${personalContextSummary || ''}`.trim()
          if (personalContextSummary.length > MAX_PERSONAL_CONTEXT_CHARS) {
            personalContextSummary = personalContextSummary.slice(0, MAX_PERSONAL_CONTEXT_CHARS) + '\n... (riassunto troncato).'
          }
        }
      }
    } catch (compatError) {
      console.warn('[assistant-chat] v6 compatibility context warning:', compatError?.message || compatError)
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
                : lang === 'es'
                  ? 'Hero Points agotados. Recarga para seguir chateando con el Coach.'
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
            const fallbackMsg = lang === 'en' ? "Sorry, I didn't get that. Can you repeat?" : lang === 'es' ? 'Lo siento, no lo he entendido. ¿Puedes repetir?' : 'Mi dispiace, non ho capito. Puoi ripetere?'
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
            const finalSuggestions = (Array.isArray(fs) && fs.length > 0) ? fs : getDefaultSuggestions(lang, safeCurrentPage)
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
                const fallbackMsg = lang === 'en' ? "Sorry, I didn't get that. Can you repeat?" : lang === 'es' ? 'Lo siento, no lo he entendido. ¿Puedes repetir?' : 'Mi dispiace, non ho capito. Puoi ripetere?'
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
                const finalSuggestions = (Array.isArray(fs) && fs.length > 0) ? fs : getDefaultSuggestions(lang, safeCurrentPage)
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
    
    // Estrai contenuto con fallback sicuro (tripla lingua)
    const fallbackReply = lang === 'en' ? "Sorry, I didn't get that. Can you repeat?" : lang === 'es' ? 'Lo siento, no lo he entendido. ¿Puedes repetir?' : 'Mi dispiace, non ho capito. Puoi ripetere?'
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


    const rawSuggestions = (Array.isArray(suggestions) && suggestions.length > 0) ? suggestions : getDefaultSuggestions(lang, safeCurrentPage)
    const finalSuggestions = rawSuggestions.map((s) => localizeCoachReplyText(s, lang))
    if (process.env.NODE_ENV !== 'production') console.log(`[assistant-chat] Success, model_used: ${model}`)
    return NextResponse.json(
      {
        response: responseWithReminder,
        suggestions: finalSuggestions,
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
        { error: getApiError('OPENAI_RATE_LIMIT', errLang), code: 'openai_rate_limit' },
        { status: 503, headers: { 'Content-Language': errLang } }
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
