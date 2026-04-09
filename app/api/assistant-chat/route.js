import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { callOpenAIWithRetry } from '@/lib/openaiHelper'
import { checkRateLimit, RATE_LIMIT_CONFIG } from '@/lib/rateLimiter'
import { validateToken, extractBearerToken } from '@/lib/authHelper'
import { getRelevantSections, classifyQuestion } from '@/lib/ragHelper'
import { deductCredits, AI_COST } from '@/lib/creditService'
import { getCoachPoliciesText, getCoachSharedCoreText } from '@/lib/coachPromptRules'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** Limiti storia conversazione (sicurezza e token) */
const MAX_HISTORY_MESSAGES = 10
const MAX_HISTORY_CONTENT_LENGTH = 2000

/** Limite riassunto contesto personale (diagnostic da user_diagnostic_cache). 7200: alcuni utenti hanno diagnostic 6500+; blocco ISTRUZIONI aggiunge ~280; margine per rosa/partite ampie. */
const MAX_PERSONAL_CONTEXT_CHARS = 7200

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
  const list = lang === 'en' ? en : it
  for (const { page: p, q } of list) {
    if (p && page.includes(p)) return q
  }
  return (lang === 'en' ? en : it).find(x => x.page === '').q
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
    ? ['because', 'since', 'due to', 'based on', 'as a result', 'i analyzed', 'i have analyzed', 'i cross', 'i have cross']
    : ['poiché', 'dato che', 'in base a', 'visto che', 'ho analizzato', 'ho incrociato', 'ho valutato'] // Rimosso 'perché' e 'quindi' per non troncare frasi utili

  const sentences = content.match(/[^.!?]+[.!?]?/g) || [content]
  const cleaned = []
  for (const s of sentences) {
    let out = s
    const hasQuestion = out.includes('?')
    for (const m of markers) {
      const re = new RegExp(`\\b${m}\\b.*`, 'i')
      if (re.test(out)) out = out.replace(re, '')
    }
    out = out.trim()
    if (!out) continue
    if (hasQuestion) continue
    cleaned.push(out)
  }
  const merged = cleaned.join(' ').trim()
  return merged.length > 0 ? merged : content.trim()
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
    competenceHint: 'Style competences (contrattacco → contropiede_veloce; only >= 70 advisable):',
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
  const L = CONTEXT_LABELS[lang === 'en' ? 'en' : 'it']
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceKey || !supabaseUrl) return ''

  try {
    const admin = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    })

    // Formation layout
    const { data: formationRow } = await admin
      .from('formation_layout')
      .select('formation, slot_positions')
      .eq('user_id', userId)
      .maybeSingle()
    // Players (titolari + riserve) - include skills, forma, altezza/peso per ragionamento enterprise
    const { data: playersData, error: playersError } = await admin
      .from('players')
      .select('id, player_name, position, overall_rating, playing_style_id, role, slot_index, photo_slots, base_stats, original_positions, card_type, skills, com_skills, form, height, weight')
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
    for (const p of titolari) {
      const styleName = (p.playing_style_id && stylesLookup[p.playing_style_id]) || (p.role ? String(p.role).trim() : '') || '-'
      const prof = getProfilazione(p.photo_slots)
      const comp = getCompetenze(p.original_positions)
      const statsStr = formatStatsForContext(p.base_stats)
      const formStr = formatFormForContext(p.form)
      const physStr = formatPhysForContext(p.height, p.weight)
      const skillsArr = [...(Array.isArray(p.skills) ? p.skills : []), ...(Array.isArray(p.com_skills) ? p.com_skills : [])].slice(0, 5)
      const skillsStr = skillsArr.length > 0 ? ` abilità: ${skillsArr.join(', ')}` : ''
      const statsPart = statsStr ? ` | stats: ${statsStr}` : ''
      const extra = [formStr, physStr].filter(Boolean).join(' ')
      rosterLines.push(`  ${p.player_name || '?'} (${p.position || '?'}, ${styleName}, ${p.overall_rating ?? '-'}${statsPart}${extra ? ' | ' + extra : ''} | profilazione: ${prof}, competenze: ${comp}${skillsStr})`)
    }
    const reservesHeader = L.reserves + ':'
    rosterLines.push(reservesHeader)
    for (const p of riserve.slice(0, 15)) {
      const styleName = (p.playing_style_id && stylesLookup[p.playing_style_id]) || (p.role ? String(p.role).trim() : '') || '-'
      const prof = getProfilazione(p.photo_slots)
      const comp = getCompetenze(p.original_positions)
      const statsStr = formatStatsForContext(p.base_stats)
      const formStr = formatFormForContext(p.form)
      const physStr = formatPhysForContext(p.height, p.weight)
      const skillsArr = [...(Array.isArray(p.skills) ? p.skills : []), ...(Array.isArray(p.com_skills) ? p.com_skills : [])].slice(0, 5)
      const skillsStr = skillsArr.length > 0 ? ` abilità: ${skillsArr.join(', ')}` : ''
      const statsPart = statsStr ? ` | stats: ${statsStr}` : ''
      const extra = [formStr, physStr].filter(Boolean).join(' ')
      rosterLines.push(`  ${p.player_name || '?'} (${p.position || '?'}, ${styleName}, ${p.overall_rating ?? '-'}${statsPart}${extra ? ' | ' + extra : ''} | profilazione: ${prof}, competenze: ${comp}${skillsStr})`)
    }
    if (riserve.length > 15) rosterLines.push(`  ... altri ${riserve.length - 15} riserve`)

    // Disposizione reale in campo (da titolari per slot), non dal nome modulo formation
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
    if (counts.pt) summaryParts.push(lang === 'en' ? '1 GK' : '1 PT')
    if (counts.def) summaryParts.push(lang === 'en' ? `${counts.def} defenders` : `${counts.def} difensori`)
    if (counts.mid) summaryParts.push(lang === 'en' ? `${counts.mid} midfield` : `${counts.mid} centrocampo`)
    if (counts.fwd) summaryParts.push(lang === 'en' ? `${counts.fwd} forwards` : `${counts.fwd} attaccanti`)
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

    // Allenatore attivo (con competenze stili per intreccio dati)
    const { data: coachRow } = await admin
      .from('coaches')
      .select('coach_name, playing_style_competence')
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

    const parts = [
      '????????????????????????????????????????????????????????????????????',
      `?  ${L.boxTitle}                                                       ?`,
      `?  ${L.boxSubtitle}                                                    ?`,
      '????????????????????????????????????????????????????????????????????',
      dispositionLine,
      '',
      L.positionNote,
      '',
      L.statsNote,
      '',
      L.starters,
      ...rosterLines.slice(0, rosterLines.findIndex(l => l === reservesHeader) + 1),
      ...rosterLines.slice(rosterLines.findIndex(l => l === reservesHeader) + 1),
      '',
      L.reservesNote,
      '',
      L.lastMatches,
      ...matchLines,
      '',
      tacticsText,
      coachText,
      ...(patternText ? ['', patternText] : [])
    ]
    let summary = parts.join('\n')
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
function buildPersonalizedPromptV2(userMessage, context, language = 'it', efootballKnowledge = '', personalContextSummary = '', hasHistory = false, contextBlockLabel = 'ROSA E DATI') {
  const { profile, currentPage, appState } = context || {}
  const firstName = sanitizeForPrompt(profile?.first_name || (language === 'en' ? 'friend' : 'amico'), 40)
  const teamName = sanitizeForPrompt(profile?.team_name || (language === 'en' ? 'your team' : 'il tuo team'), 60)
  const aiName = sanitizeForPrompt(profile?.ai_name || 'Coach AI', 40)
  const howToRemember = sanitizeForPrompt(profile?.how_to_remember || '', 240)
  const aiWeakPoint = sanitizeForPrompt(profile?.ai_weak_point || '', 60)
  const aiLearnGoals = sanitizeForPrompt(profile?.ai_learn_goals || '', 240)
  const aiNotes = sanitizeForPrompt(profile?.ai_notes || '', 280)
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
- MICRO-SCORE: FIT (position = competenze), COACH_OK(style>=70; contrattacco→contropiede_veloce), SPD (vel+acc+Scatto), PASS (pas+filtrante/di prima/dosato), WIN (tac+Intercettazione/Marcatura/Contrasto/Blocco), AIR_DEF (h/w+Dominio palle alte+Superiorità aerea), AIR_ATK (h/w+Colpo di testa), SUB (Riserva di lusso=Super riserva).
- DECISIONE: scegli 1 leva principale + max 2 secondarie: (1) Fix FIT, (2) Fix mismatch coach/stile squadra, (3) Aggancia top recurring_issue, (4) 1-2 cambi titolari/riserve (vedi SOSTITUZIONI sotto), (5) 1 istruzione max 5, (6) gameplay solo "cosa fare" da §7.
- VIETATO suggerire cambio formazione/modulo a meno che il cliente non lo chieda esplicitamente. Lavora sempre sulla formazione attuale salvata.
- SOSTITUZIONI (leva 4, incrocio enterprise): (1) Sintomo da Statistiche di gioco, recurring_issues, voti partite o domanda. (2) Ruolo da rafforzare: tiro=fin+abilita tiro; passaggio=pas+abilita passaggio; difesa=tac+WIN. (3) Titolari: chi è in quel ruolo, forma, voti, stile giocatore. (4) Riserve: chi ha fin/pas/tac, abilita che compensano e stile giocatore adatto (RAG §2: es. Punta avanzata/Opportunista per finalizzazione, Regista/Classico 10 per passaggio, Collante/Anchor per difesa); posizione compatibile; incrocia con stile squadra e competenza allenatore (riassunto Tattica e Allenatore). (5) Un solo cambio concreto: Far uscire [titolare], far entrare [riserva]: [motivo da dati]. Usa sempre riassunto (Rosa stile+fin/pas/tac+abilita, Statistiche di gioco, Andamento/voti, Tattica, Allenatore, Build, Sinergie, Leve) e RAG §2/§8 quando rilevante.
- INVERSE: sintomo?cause?leva: fasce (attack_areas wide)?esterni senza WIN/Rientro difensivo?copertura/istruzioni; attacco sterile?PASS basso o stile incoerente?regista/cambio stile/modulo; palle alte?AIR_DEF basso?DC/MED più forti+piazzati.
OUTPUT: 2-4 frasi operative, rispondi alla domanda specifica (es. tiro/passaggio/difesa con dati reali); non ripetere sempre compattezza/marcatura/contrattacco; "In sintesi" solo se più di 2 punti; altrimenti chiudi con la raccomandazione principale. Niente ragionamento visibile.`

  const capsuleEn = `ENGINE (REQUIRED, token-budget):
- INPUT: ROSTER (card style, stats spd/acc/sta/fin/pas/tac, skills, form ↑/↓, h/w, competences), MATCH/PATTERN (result, formation/style, opponent formation, attack_areas, client ratings, recurring_issues), COACH (style competence), TACTICS (team style + instructions), RAG (limits + movements/situations + community).
- MICRO-SCORES: FIT (position = competences), COACH_OK(style>=70; contrattacco→contropiede_veloce), SPD (spd+acc+Sprint), PASS (pas+Through ball/One-touch/Weighted), WIN (tac+Interception/Man marking/Aggressive tackle/Block), AIR_DEF (h/w+High ball dominance+Aerial superiority), AIR_ATK (h/w+Heading), SUB (Luxury sub=Super sub).
- DECISION: pick 1 main lever + max 2 secondary: (1) Fix FIT, (2) Fix coach/team-style mismatch, (3) Anchor top recurring_issue, (4) 1-2 lineup changes (see SUBSTITUTIONS below), (5) 1 instruction max 5, (6) gameplay "what to do" only from §7.
- FORBIDDEN to suggest formation/module changes unless explicitly asked. Always work with the current saved formation.
- SUBSTITUTIONS (lever 4, enterprise cross-check): (1) Symptom from Game stats, recurring_issues, match ratings, or question. (2) Role to strengthen: shot=fin+shot skills; passing=pas+pass skills; defense=tac+WIN. (3) Starters: who is in that role, form, ratings, player style. (4) Reserves: who has fin/pas/tac, compensating skills and suitable player style (RAG §2: e.g. Adv Striker/Goal Poacher for finishing, Orchestrator/Classic 10 for passing, Anchor Man for defense); compatible position; cross-check with team style and coach competence (summary Tactics and Coach). (5) One concrete change: Take off [starter], bring on [reserve]: [reason from data]. Always use summary (Roster style+fin/pas/tac+skills, Game stats, Form/ratings, Tactics, Coach, Build, Synergies, Levers) and RAG §2/§8 when relevant.
- INVERSE: symptom?cause?lever: wide threat (attack_areas wide)?wide players lack WIN/track back?coverage/instructions; stale attack?low PASS or mismatch style?add creator/change style/formation; aerial goals?low AIR_DEF?stronger CB/DM + set pieces.
OUTPUT: 2-4 imperative sentences; answer the specific question (e.g. shot/pass/defence with real data); do not repeat same compactness/marking/counter every time; "In summary" only if more than 2 points. No visible reasoning.`

  const capsule = language === 'en' ? capsuleEn : capsuleIt

  // La coach dà CONSIGLI; i 3 punti sono SUGGERIMENTI OPERATIVI della coach (cliccabili), non domande che il cliente deve fare.
  const suggRulesIt = `SUGGERIMENTI (3, obbligatori): sono CONSIGLI della coach su cosa approfondire o fare dopo (testi brevi cliccabili). (1) Un suggerimento operativo su quanto hai appena detto (es. approfondisci marcatura per i centrali, sfrutta Ibra e Nedvěd per i tiri). (2) Uno su gameplay/rosa/partite legato alla risposta. (3) Un prossimo passo concreto. Scrivi come inviti della coach: es. "Approfondisci la marcatura per Maldini e Nesta", "Variare i tiri con i tuoi finisher", "Prossimo passo: copertura". NON sono domande che il cliente deve porre: sei tu che consigli. VIETATO: "Quale modulo/formazione", meta, "perché ho perso", "migliorare un giocatore". Niente uso app, niente tasti.`
  const suggRulesEn = `SUGGESTIONS (3, required): these are the COACH'S recommendations on what to explore or do next (short clickable texts). (1) One operational suggestion on what you just said (e.g. deepen marking for your centre-backs, use your finishers for shot variety). (2) One on gameplay/roster/matches tied to your answer. (3) One concrete next step. Phrase as the coach's prompts: e.g. "Explore marking for Maldini and Nesta", "Vary shots with your finishers", "Next step: coverage". These are NOT questions the client should ask: you are giving advice. FORBIDDEN: "Which formation/module", meta, "why did I lose", "improve a player". No app usage, no buttons.`
  const suggRules = language === 'en' ? suggRulesEn : suggRulesIt

  // Solo dati da Informazioni IA: niente lista "Problemi" da citare; se togli la spunta, l'IA non vede più quel problema
  const profileLines = [
    `Profilo: ${firstName} | ${teamName}`,
    howToRemember ? `Memo: ${howToRemember}` : '',
    weakPointLabel ? (language === 'en' ? `Weak point (what makes you lose): ${weakPointLabel}` : `Punto debole (cosa ti fa perdere): ${weakPointLabel}`) : '',
    aiLearnGoals ? (language === 'en' ? `Learn goals: ${aiLearnGoals}` : `Cosa vuole imparare: ${aiLearnGoals}`) : '',
    aiNotes ? (language === 'en' ? `Notes for AI: ${aiNotes}` : `Note per l'IA: ${aiNotes}`) : ''
  ].filter(Boolean)
  const header = `CONTESTO: ${contestoAttuale}
${hasHistory ? `NOTA: Continua la conversazione già iniziata. NON salutare.` : ''}

${profileLines.join('\n')}`

  const blocks = [
    header,
    personalContextSummary ? `\n■ ${contextBlockLabel}:\n${personalContextSummary}` : '',
    efootballKnowledge ? `\n■ MECCANICHE eFootball (RAG):\n${efootballKnowledge}` : '',
    `\n${capsule}\n\nFORMATO RISPOSTA:\n[2-4 frasi operative con i TUOI consigli. "In sintesi" / "In summary" solo se utile; altrimenti chiudi con la raccomandazione principale.]\n\n---\nSUGGERIMENTI:\n1. [consiglio breve cliccabile]\n2. [consiglio breve cliccabile]\n3. [consiglio breve cliccabile]\n\n${suggRules}\n\nDOMANDA CLIENTE: "${userMessage}"\nRispondi come ${aiName} in ${language === 'it' ? 'italiano' : 'inglese'}.`
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

FONTI: Nomi/rosa/partite/allenatore/tattica = solo dal blocco contesto sotto (ROSA E DATI o RIASSUNTO ANALISI). Regole eFootball = solo dal blocco RAG. Se manca un dato, non inventare.
MECCANICHE CANCEL/SKILL AVANZATE: segui RAG §7.12. Usa prima i termini ufficiali (Super Cancel, Kick Cancel, Kick Feint, Double Touch) e tratta "tess/croqueta interrotta" solo come alias community tra parentesi.
ANTI-EXPLOIT: vietato coaching basato su macro/script/bug abuse; non suggerire spam continuo della stessa skill. Dai sempre una variante sicura se il timing non riesce.
INCROCI: Usa tutto il riassunto (Rosa con stile giocatore+fin/pas/tac+abilità, Statistiche di gioco, Andamento/voti, Tattica=stile squadra, Allenatore e competenze, Build, Sinergie, Leve) e RAG §2 (stili giocatore: quando serve quale, es. Punta avanzata per finalizzazione), §4 (stile squadra), §8 (abilità). Lo stile giocatore è molto importante per fit e sostituzioni.
Risposta CONCRETA: rispondi alla domanda specifica (es. "sbaglio a tirare?" → consigli su tiro e percentuali reali; "passaggi?" → passaggio e abilità in rosa). Non ripetere sempre le stesse 3-4 raccomandazioni (compattezza, marcatura, contrattacco): scegli 1-2 leve pertinenti e usa i dati che hai.
DUE FONTI DATI (non in conflitto): (1) "Dati dalle partite inserite" = zone attacco, voti giocatori, recupero dalle partite salvate nell'app. (2) "Statistiche di gioco (Analisi eFootball, ultime 10 partite)" = aggregate dalla schermata Analisi eFootball (screenshot). Usa entrambe: sono complementari (stesso giocatore da angolazioni o periodi diversi).
Se nel RIASSUNTO ANALISI è presente la sezione "Statistiche di gioco (Analisi eFootball, ultime 10 partite)" (tipo gol, tiro, passaggio, dribbling, difesa, comandi speciali), usala per consigli mirati: es. diversificare tipi di tiro, aumentare uso pressing/comandi, lavorare su passaggio o difesa in base alle percentuali reali. Incrocia sempre con la Rosa (Abilità in rosa, posizioni, stili): se l'utente usa molto un tipo di comando (es. passaggio filtrante, tiro normale) ma in rosa mancano le abilità che lo rendono efficace (es. Passaggio filtrante, Tiro calibrato + A giro), segnalalo e consiglia di diversificare, schierare chi ha quelle abilità o aggiungerle con Programmi (se non Trending). Usa la mappatura comando→abilità del RAG (§7.9 se presente). Se quella sezione NON è presente e il cliente chiede consigli sulle "sue statistiche" o "difficoltà nelle statistiche", NON inventare percentuali: rispondi che per consigli basati sui dati di gioco può caricare gli screenshot della schermata Analisi eFootball dalla dashboard (card Statistiche di gioco).
Se nel RIASSUNTO c'è Connessione/Input delay/Ritardo (es. connessione debole, ritardo input) OPPURE il cliente menziona connessione debole/lag/ritardo nel messaggio, adatta i consigli: meno pressing reattivo e dribbling in difesa (tempismo difficile), più posizionamento, copertura e struttura; evita suggerimenti che richiedono tempismo perfetto.
PRIORITÀ PROFILO: Se nel RIASSUNTO (sezione Informazioni per l'IA) sono presenti "Punto debole" e/o "Cosa vuole imparare" e/o "Note per l'IA", usali come priorità: orienta almeno un consiglio sul punto debole e sugli obiettivi di apprendimento quando rilevanti alla domanda; rispetta le note come focus quando possibile. NON citare mai al cliente l'elenco (es. "hai indicato che hai difficoltà in..."); usa il dato solo per orientare i consigli.

OUTPUT COACH: 2-4 frasi operative, rispondi alla domanda specifica; varia i consigli; "In sintesi" solo se utile.`

  const en = `You are Coach AI for eFootball.
RESPONSE LANGUAGE: YOU MUST STRICTLY REPLY IN ${lang === 'en' ? 'ENGLISH' : 'ITALIAN'} (UI language / app "language" parameter).

${policies}

${sharedCore}

SCOPE: only eFootball tactical advice based on ROSTER, MATCHES, COACH, TACTICS and RAG.
- Gameplay allowed only as "what to do" (actions). Never mention buttons/inputs/controller.
- App usage (wizard, clicks, menus, upload): do not explain. If asked, reply only: "I'm here only for tactical advice: formation, roster, module, substitutions, style. Explore the menu for other features."

SOURCES: Names/roster/matches/coach/tactics only from the context block below (ROSTER & DATA or ANALYSIS SUMMARY). eFootball rules only from the RAG block. If data is missing, do not invent.
CANCEL/SKILL ADVANCED MECHANICS: follow RAG §7.12. Use official names first (Super Cancel, Kick Cancel, Kick Feint, Double Touch) and treat "tess/croqueta interrupted" only as community aliases in parentheses.
ANTI-EXPLOIT: never coach macro/script/bug abuse, and do not recommend continuous spam of one skill. Always provide a safer fallback option if timing is unstable.
CROSS-CHECKS: Use the full summary (Roster with player style+fin/pas/tac+skills, Game stats, Form/ratings, Tactics=team style, Coach and competences, Build, Synergies, Levers) and RAG §2 (player styles: when to use which, e.g. Adv Striker for finishing), §4 (team style), §8 (skills). Player style is very important for fit and substitutions.
CONCRETE answer: answer the specific question (e.g. "am I shooting wrong?" → advice on shooting and real percentages; "passing?" → passing and roster skills). Do not repeat the same 3-4 recommendations every time (compactness, marking, counter): pick 1-2 relevant levers and use the data you have.
TWO DATA SOURCES (not in conflict): (1) "Data from entered matches" = attack zones, player ratings, recovery from matches saved in the app. (2) "Game stats (eFootball Analisi, last 10 matches)" = aggregates from the eFootball Analysis screen (screenshot). Use both: they are complementary (same player from different angles or time windows).
If the ANALYSIS SUMMARY includes "Game stats (eFootball Analisi, last 10 matches)" (goal types, shot, passing, dribbling, defense, special commands), use it for targeted advice: e.g. diversify shot types, increase pressing/command usage, work on passing or defense based on actual percentages. Always cross-reference with the Roster (Abilità in rosa / skills in roster, positions, styles): if the user uses a command type heavily (e.g. through ball, normal shot) but the roster lacks the skills that make it effective (e.g. Passaggio filtrante, Tiro calibrato + A giro), point it out and suggest diversifying, using players who have those skills, or adding skills via Programmi (if not Trending). Use the command→skill mapping from RAG (§7.9 when present). If that section is NOT present and the client asks for advice on "their stats" or "difficulties in stats", do NOT invent percentages: reply that for data-driven advice they can upload screenshots of the eFootball Analysis screen from the dashboard (Game stats card).
If the SUMMARY has Connection/Input delay/Lag (e.g. weak connection, input delay) OR the client mentions weak connection/lag/delay in the message, adapt advice: less reactive pressing and dribbling in defence (timing is harder), more positioning, coverage and structure; avoid suggestions that require perfect timing.
PROFILE PRIORITY: If the SUMMARY (Informazioni per l'IA / AI info section) includes "Punto debole" (Weak point) and/or "Cosa vuole imparare" (Learn goals) and/or "Note per l'IA" (Notes for AI), use them as priorities: steer at least one piece of advice toward the weak point and learning goals when relevant to the question; respect the notes as focus when possible. Never quote the list back to the client (e.g. "you indicated you have difficulties in..."); use the data only to steer advice.

CONSTRAINTS: only roster names; only 5 configurable team styles (Possession, Quick Counter, Long Ball Counter, Long Ball, Out Wide); contrattacco → contropiede_veloce and require coach competence >=70; individual instructions only max 5; formation limits §3.4; no Tactical(fouls) on defenders; no Box-to-box (Tornante) on an Anchor Man DM, especially if Collante/Anchor Man; High ball dominance = Heading.

COACH OUTPUT: 2-4 imperative sentences; answer the specific question; vary advice; "In summary" only when useful.`

  return lang === 'en' ? en : it
}

export async function POST(req) {
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
    const lang = (language === 'en' || language === 'it') ? language : 'it'

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
          personalContextSummary = raw.length > MAX_PERSONAL_CONTEXT_CHARS ? raw.slice(0, MAX_PERSONAL_CONTEXT_CHARS) + '\n... (riassunto troncato).' : raw
          contextBlockLabel = 'RIASSUNTO ANALISI'
          if (personalContextSummary) console.log('[assistant-chat] Diagnostic from cache used')
          // Tattica live: la cache può essere vecchia; l'IA deve vedere sempre stile/istruzioni salvati in Supabase
          const { data: tacticalRow } = await admin.from('team_tactical_settings').select('team_playing_style, individual_instructions').eq('user_id', userId).maybeSingle()
          const liveStyle = tacticalRow?.team_playing_style?.trim()
          const liveInstr = tacticalRow?.individual_instructions
          const numLive = (liveInstr && typeof liveInstr === 'object') ? Object.keys(liveInstr).length : 0
          // Risolvi nomi giocatori per istruzioni (serve quando l'utente chiede in chat)
          let instrLines = ''
          try {
            if (liveInstr && typeof liveInstr === 'object') {
              const { data: players } = await admin.from('players').select('id, player_name').eq('user_id', userId).limit(50)
              const map = {}
              ;(players || []).forEach(p => { if (p?.id) map[String(p.id)] = p.player_name || '?' })
              const entries = Object.entries(liveInstr)
                .map(([slot, v]) => ({ slot, v }))
                .filter(({ v }) => v && typeof v === 'object' && v.enabled === true && v.instruction)
              if (entries.length > 0) {
                const lines = entries.slice(0, 8).map(({ slot, v }) => {
                  const pid = v.player_id ? String(v.player_id) : ''
                  const pName = pid && map[pid] ? map[pid] : (pid ? `player:${pid.slice(0, 8)}` : '?')
                  return `  - ${slot}: ${String(v.instruction).trim()} → ${pName}`
                })
                instrLines = `\n${lang === 'en' ? 'Individual instructions' : 'Istruzioni individuali'}:\n${lines.join('\n')}\n`
              }
            }
          } catch (_) {}
          if (liveStyle || numLive > 0) {
            const liveLine = lang === 'en'
              ? `[LIVE] Team style: ${liveStyle || 'not set'}. Individual instructions: ${numLive} active.${instrLines}\n`
              : `[AGGIORNAMENTO LIVE] Stile squadra: ${liveStyle || 'non impostato'}. Istruzioni individuali: ${numLive} attive.${instrLines}\n`
            personalContextSummary = liveLine + personalContextSummary
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

    // Costruisci prompt personalizzato (con eventuali blocchi RAG eFootball e contesto personale)
    let prompt
    try {
      prompt = buildPersonalizedPromptV2(message, context, lang, efootballKnowledge, personalContextSummary, history.length > 0, contextBlockLabel)
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
            error: lang === 'en' ? 'Insufficient credits. Please recharge.' : 'Crediti insufficienti. Ricarica per continuare.',
            details: deduction.error 
          },
          { status: 402, headers: { 'Content-Language': lang } }
        )
      }
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
      temperature: 0.7,
      max_completion_tokens: 800 // gpt-5.2 richiede max_completion_tokens (max_tokens deprecato)
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
            const fallbackMsg = lang === 'en' ? "Sorry, I didn't get that. Can you repeat?" : 'Mi dispiace, non ho capito. Puoi ripetere?'
            const raw = fallbackData.choices?.[0]?.message?.content || fallbackMsg
            const { cleanContent: fc, suggestions: fs } = parseSuggestionsFromContent(raw)
            const sanitizedFallback = sanitizeCoachOutput(fc, lang)
            const finalSuggestions = (Array.isArray(fs) && fs.length > 0) ? fs : getDefaultSuggestions(lang, safeCurrentPage)
            if (process.env.NODE_ENV !== 'production') console.log('[assistant-chat] Success (fallback from model_not_found), model_used: gpt-4o')
            return NextResponse.json({
              response: sanitizedFallback,
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
                const fallbackMsg = lang === 'en' ? "Sorry, I didn't get that. Can you repeat?" : 'Mi dispiace, non ho capito. Puoi ripetere?'
                const raw = fallbackData.choices?.[0]?.message?.content || fallbackMsg
                const { cleanContent: fc, suggestions: fs } = parseSuggestionsFromContent(raw)
                const sanitizedFallback = sanitizeCoachOutput(fc, lang)
                const finalSuggestions = (Array.isArray(fs) && fs.length > 0) ? fs : getDefaultSuggestions(lang, safeCurrentPage)
                if (process.env.NODE_ENV !== 'production') console.log('[assistant-chat] Success (fallback from !response.ok), model_used: gpt-4o')
                return NextResponse.json({
                  response: sanitizedFallback,
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
    const fallbackReply = lang === 'en' ? "Sorry, I didn't get that. Can you repeat?" : 'Mi dispiace, non ho capito. Puoi ripetere?'
    const rawContent = data?.choices?.[0]?.message?.content ||
                       data?.choices?.[0]?.content ||
                       fallbackReply

    // Estrai 3 suggerimenti cliccabili dal blocco SUGGERIMENTI (se presente) e pulisci il testo mostrato
    const { cleanContent, suggestions } = parseSuggestionsFromContent(rawContent)
    const sanitizedContent = sanitizeCoachOutput(cleanContent, lang)
    
    // Validazione base: verifica che la risposta non contenga riferimenti a funzionalità inventate
    if (sanitizedContent.toLowerCase().includes('funzionalità non disponibile') || 
        sanitizedContent.toLowerCase().includes('non è ancora disponibile')) {
      if (process.env.NODE_ENV !== 'production') console.log('[assistant-chat] AI ha ammesso funzionalità non disponibile - comportamento corretto')
    }


    const finalSuggestions = (Array.isArray(suggestions) && suggestions.length > 0) ? suggestions : getDefaultSuggestions(lang, safeCurrentPage)
    if (process.env.NODE_ENV !== 'production') console.log(`[assistant-chat] Success, model_used: ${model}`)
    return NextResponse.json(
      {
        response: sanitizedContent,
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
