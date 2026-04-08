import { createClient } from '@supabase/supabase-js'
import { getCoachPolicyLines, getCoachSharedCoreLines } from './coachPromptRules'
import { getRelevantSectionsForContext } from './ragHelper'

const DIAGNOSTIC_MAX_CHARS = 2600

function compact(value, maxLen = 220) {
  if (value == null) return ''
  const clean = String(value).replace(/\s+/g, ' ').trim()
  return clean.length > maxLen ? `${clean.slice(0, maxLen)}...` : clean
}

function compactList(values, maxItems = 4, maxLen = 160) {
  if (!Array.isArray(values) || values.length === 0) return ''
  return compact(values.filter(Boolean).map(v => String(v).trim()).filter(Boolean).slice(0, maxItems).join(', '), maxLen)
}

function compactJson(value, maxLen = 1400) {
  if (value == null) return ''
  try {
    return compact(JSON.stringify(value), maxLen)
  } catch {
    return ''
  }
}

function getTacticalStyle(tactics = {}) {
  return compact(tactics.team_playing_style || tactics.playing_style || tactics.tactical_style || '', 60)
}

function getPlayerStyleName(player, stylesLookup = {}) {
  return compact((player?.playing_style_id && stylesLookup[player.playing_style_id]) || player?.role || '', 30)
}

function getPlayerSkills(player) {
  return [
    ...(Array.isArray(player?.skills) ? player.skills : []),
    ...(Array.isArray(player?.com_skills) ? player.com_skills : [])
  ]
    .filter(Boolean)
    .map(s => compact(s, 24))
    .slice(0, 4)
}

function formatForm(form) {
  if (!form || typeof form !== 'string') return ''
  const value = String(form).toLowerCase().trim()
  if (value === 'a' || value.includes('incrollabile')) return 'forma↑'
  if (value === 'b' || value.includes('eccellente')) return 'forma↓'
  return ''
}

function formatStats(baseStats) {
  if (!baseStats || typeof baseStats !== 'object') return ''
  const atk = baseStats.attacking || {}
  const def = baseStats.defending || {}
  const ath = baseStats.athleticism || {}
  const parts = []
  if (atk.finishing != null) parts.push(`fin ${atk.finishing}`)
  if (atk.low_pass != null) parts.push(`pas ${atk.low_pass}`)
  else if (atk.lofted_pass != null) parts.push(`pas ${atk.lofted_pass}`)
  if (def.tackling != null) parts.push(`tac ${def.tackling}`)
  if (ath.speed != null) parts.push(`vel ${ath.speed}`)
  if (ath.acceleration != null) parts.push(`acc ${ath.acceleration}`)
  return parts.slice(0, 4).join(' ')
}

function buildPlayerLine(player, stylesLookup = {}) {
  if (!player) return null
  const name = compact(player.player_name || player.name, 40)
  if (!name) return null
  const styleName = getPlayerStyleName(player, stylesLookup)
  const skills = getPlayerSkills(player)
  const stats = formatStats(player.base_stats)
  const form = formatForm(player.form)
  const parts = [
    name,
    compact(player.position, 12),
    Number.isFinite(Number(player.overall_rating)) ? `OVR ${Number(player.overall_rating)}` : '',
    styleName,
    stats,
    form,
    skills.length ? skills.join(', ') : ''
  ].filter(Boolean)
  return parts.join(' | ')
}

function buildCoachCompetenceSummary(competence, lang = 'it') {
  if (!competence || typeof competence !== 'object') return ''
  const entries = Object.entries(competence)
    .map(([style, value]) => ({ style: compact(style, 24), value: parseInt(value, 10) || 0 }))
    .filter(({ style }) => style)
    .sort((a, b) => b.value - a.value)
  if (entries.length === 0) return ''
  const good = entries.filter(({ value }) => value >= 70).slice(0, 3).map(({ style, value }) => `${style}=${value}`)
  const weak = entries.filter(({ value }) => value < 70).slice(0, 3).map(({ style, value }) => `${style}=${value}`)
  const labelGood = lang === 'en' ? 'Coach styles OK' : 'Stili coach OK'
  const labelWeak = lang === 'en' ? 'Coach styles weak' : 'Stili coach deboli'
  const parts = []
  if (good.length) parts.push(`${labelGood}: ${good.join(', ')}`)
  if (weak.length) parts.push(`${labelWeak}: ${weak.join(', ')}`)
  return parts.join(' | ')
}

function buildInstructionsSummary(individualInstructions, players = [], lang = 'it') {
  if (!individualInstructions || typeof individualInstructions !== 'object') return ''
  const nameById = {}
  players.forEach(player => {
    if (player?.id) nameById[String(player.id)] = compact(player.player_name, 28)
  })
  const lines = Object.entries(individualInstructions)
    .map(([slot, value]) => ({ slot, value }))
    .filter(({ value }) => value && typeof value === 'object' && value.enabled === true && value.instruction)
    .slice(0, 5)
    .map(({ slot, value }) => {
      const playerName = value.player_id ? (nameById[String(value.player_id)] || compact(`player:${String(value.player_id).slice(0, 8)}`, 24)) : ''
      return `${slot}:${compact(value.instruction, 22)}${playerName ? `→${playerName}` : ''}`
    })
  if (lines.length === 0) return ''
  return `${lang === 'en' ? 'Active instructions' : 'Istruzioni attive'}: ${lines.join(' | ')}`
}

function buildPatternSummary(patterns = {}, lang = 'it') {
  const lines = []
  if (patterns.formation_usage && typeof patterns.formation_usage === 'object') {
    const topFormations = Object.entries(patterns.formation_usage)
      .sort((a, b) => (b[1]?.matches || 0) - (a[1]?.matches || 0))
      .slice(0, 3)
      .map(([formation, data]) => `${compact(formation, 18)} ${data?.matches || 0}m ${data?.win_rate != null ? Math.round(data.win_rate * 100) + '%' : ''}`.trim())
    if (topFormations.length) {
      lines.push(`${lang === 'en' ? 'Formation usage' : 'Uso moduli'}: ${topFormations.join(' | ')}`)
    }
  }
  if (patterns.playing_style_usage && typeof patterns.playing_style_usage === 'object') {
    const topStyles = Object.entries(patterns.playing_style_usage)
      .sort((a, b) => (b[1]?.matches || 0) - (a[1]?.matches || 0))
      .slice(0, 3)
      .map(([style, data]) => `${compact(style, 20)} ${data?.matches || 0}m`)
    if (topStyles.length) {
      lines.push(`${lang === 'en' ? 'Style usage' : 'Uso stili'}: ${topStyles.join(' | ')}`)
    }
  }
  if (Array.isArray(patterns.recurring_issues) && patterns.recurring_issues.length > 0) {
    const issues = patterns.recurring_issues
      .slice(0, 3)
      .map(item => compact(item?.issue ?? item, 60))
      .filter(Boolean)
    if (issues.length) {
      lines.push(`${lang === 'en' ? 'Recurring issues' : 'Problemi ricorrenti'}: ${issues.join(' | ')}`)
    }
  }
  if (patterns.attack_areas_avg && typeof patterns.attack_areas_avg === 'object' && Object.keys(patterns.attack_areas_avg).length > 0) {
    const attackZones = Object.entries(patterns.attack_areas_avg)
      .slice(0, 3)
      .map(([zone, value]) => `${compact(zone, 16)}:${value}`)
    if (attackZones.length) {
      lines.push(`${lang === 'en' ? 'Attack zones avg' : 'Zone attacco medie'}: ${attackZones.join(', ')}`)
    }
  }
  if (patterns.recovery_zones_avg) {
    const recovery = Array.isArray(patterns.recovery_zones_avg)
      ? `${patterns.recovery_zones_avg.length}`
      : typeof patterns.recovery_zones_avg === 'object'
        ? `${Object.keys(patterns.recovery_zones_avg).length}`
        : compact(patterns.recovery_zones_avg, 40)
    if (recovery) {
      lines.push(`${lang === 'en' ? 'Recovery zones avg' : 'Zone recupero medie'}: ${recovery}`)
    }
  }
  return lines.join('\n')
}

function buildFeedbackSummary(feedbackRows = [], lang = 'it') {
  if (!Array.isArray(feedbackRows) || feedbackRows.length === 0) return ''
  const strengths = []
  const weaknesses = []
  const lessons = []
  for (const row of feedbackRows.slice(0, 5)) {
    const contextBits = [compact(row?.formation_played, 20), compact(row?.opponent_name, 24), compact(row?.outcome, 12)]
      .filter(Boolean)
      .join(', ')
    const insights = Array.isArray(row?.insights) ? row.insights : []
    for (const insight of insights) {
      const text = compact(insight?.text || insight, 110)
      if (!text) continue
      const withContext = contextBits ? `${text} [${contextBits}]` : text
      if (insight?.type === 'strength') strengths.push(withContext)
      else if (insight?.type === 'lesson') lessons.push(withContext)
      else weaknesses.push(withContext)
    }
  }
  const lines = []
  if (strengths.length) lines.push(`${lang === 'en' ? 'What worked recently' : 'Cosa ha funzionato di recente'}: ${strengths.slice(0, 2).join(' | ')}`)
  if (weaknesses.length) lines.push(`${lang === 'en' ? 'Do not repeat' : 'Non ripetere'}: ${weaknesses.slice(0, 2).join(' | ')}`)
  if (lessons.length) lines.push(`${lang === 'en' ? 'Lessons learned' : 'Lezioni apprese'}: ${lessons.slice(0, 2).join(' | ')}`)
  return lines.join('\n')
}

function buildDiagnosticSummary(cacheRow) {
  if (!cacheRow?.content || typeof cacheRow.content !== 'string') return ''
  return compact(cacheRow.content.trim(), DIAGNOSTIC_MAX_CHARS)
}

function buildOpponentSummary(opponentContext) {
  if (!opponentContext) return ''
  return compactJson({
    formation: opponentContext.formation || opponentContext.formation_name || null,
    tactical_style: opponentContext.tactical_style || null,
    playing_style: opponentContext.playing_style || null,
    players: Array.isArray(opponentContext.players)
      ? opponentContext.players.slice(0, 11).map(player => ({
          name: player.player_name || player.name || null,
          position: player.position || null,
          overall_rating: player.overall_rating ?? null
        }))
      : []
  }, 1400)
}

function buildCompactCoachInstructions({
  lang = 'it',
  profile = {},
  formation = {},
  tactics = {},
  coach = {},
  players = [],
  stylesLookup = {},
  patterns = {},
  feedbackRows = [],
  diagnosticSummary = '',
  opponentContext = null,
  efootballKnowledge = ''
}) {
  const isEn = lang === 'en'
  const sharedPolicyLines = getCoachPolicyLines(lang)
  const sharedCoreLines = getCoachSharedCoreLines(lang)
  const firstName = compact(profile.first_name || '', 30)
  const aiName = compact(profile.ai_name || '', 30)
  const teamName = compact(profile.team_name || profile.favorite_team || '', 60)
  const favoritePlayer = compact(profile.favourite_player_name || '', 40)
  const weakPoint = compact(profile.ai_weak_point || compactList(profile.common_problems, 3, 120), 180)
  const learnGoals = compact(profile.ai_learn_goals || '', 180)
  const memoryNote = compact(profile.how_to_remember || '', 180)
  const aiNotes = compact(profile.ai_notes || '', 220)
  const connectionQuality = compact(profile.connection_quality || '', 50)
  const inputDelay = compact(profile.input_delay || '', 40)
  const platform = compact(profile.platform || '', 30)
  const passLevel = compact(profile.pass_level || '', 20)
  const smartAssist = compact(profile.smart_assist || '', 20)
  const formationName = compact(formation.formation || '', 30)
  const tacticalStyle = getTacticalStyle(tactics)
  const coachName = compact(coach.coach_name || coach.name || '', 40)
  const starters = players.filter(player => player?.slot_index != null && player.slot_index >= 0 && player.slot_index <= 10)
  const bench = players.filter(player => player?.slot_index == null)
  const playerLines = starters.concat(bench).slice(0, 16).map(player => buildPlayerLine(player, stylesLookup)).filter(Boolean)
  const coachCompetence = buildCoachCompetenceSummary(coach.playing_style_competence, lang)
  const instructionsSummary = buildInstructionsSummary(tactics.individual_instructions, players, lang)
  const patternSummary = buildPatternSummary(patterns, lang)
  const feedbackSummary = buildFeedbackSummary(feedbackRows, lang)
  const opponentSummary = buildOpponentSummary(opponentContext)

  const engineBlockEn = `LIVE COACH ENGINE (MANDATORY):
1. Start from the user's live problem, then cross-check it with DIAGNOSTIC SUMMARY, roster, team style, coach competence, client patterns, recent lessons, active instructions, and opponent context.
2. Use correct eFootball terminology: player style != team style != skill != individual instruction. Stats, card traits, and player styles are fixed; only lineup, team style, and instructions are configurable.
3. Prefer these levers first when they fit the problem: match tempo, side to attack or close, build-up route, midfield density, line height, pressing timing, player role fit, switch of play, substitutions, shot/pass/cross choice, and connection-safe actions. Use an individual instruction only when it is clearly the best lever, when the user asks for it, or when an already active instruction is directly causing or solving the issue.
4. Pick 1 main lever and at most 1 secondary lever. If the safest fix is enough, do not add more.
4. If recent feedback says something failed, do not repeat that mistake. If something worked, you may reinforce it.
5. For every answer, prefer practical in-match suggestions over configuration talk when possible: what to do now, where to move play, which duel to protect, which player to involve, when to slow down, when to go direct.
6. When context is incomplete, ask ONE tactical question with high decision value and still give the safest correction now.
7. Behave like a real coach partner: correct, ask, adapt, and verify. Your follow-up question must help choose the next adjustment.
8. Questions must be tactical and specific: where is the danger coming from, wide or central, build-up or final third, score/time, opponent shape, or whether the fix already changed the flow.
9. Speak in short natural voice sentences. Urgent moment: action first, then one short question only if needed.`

  const engineBlockIt = `MOTORE LIVE COACH (OBBLIGATORIO):
1. Parti dal problema live del cliente, poi incrocialo con RIASSUNTO DIAGNOSTICO, rosa, stile squadra, competenze allenatore, pattern del cliente, lezioni recenti, istruzioni attive e contesto avversario.
2. Usa terminologia eFootball corretta: stile giocatore != stile squadra != abilita != istruzione individuale. Statistiche, caratteristiche card e stili giocatore sono fissi; configurabili solo formazione, stile squadra e istruzioni.
3. Privilegia prima queste leve quando sono adatte al problema: ritmo partita, lato da attaccare o chiudere, uscita palla, densita centrocampo, altezza linea, tempi di pressing, fit del ruolo, cambio gioco, sostituzioni, scelta tra tiro/passaggio/cross e azioni sicure per la connessione. Usa un istruzione individuale solo se e chiaramente la leva migliore, se il cliente la chiede, oppure se una istruzione gia attiva sta davvero causando o risolvendo il problema.
4. Scegli 1 leva principale e al massimo 1 leva secondaria. Se basta la correzione piu sicura, non aggiungere altro.
4. Se i feedback recenti dicono che qualcosa ha fallito, non ripetere quell errore. Se qualcosa ha funzionato, puoi rinforzarlo.
5. In ogni risposta privilegia suggerimenti pratici da partita rispetto al parlare di configurazione: cosa fare adesso, dove portare il gioco, quale duello proteggere, quale giocatore coinvolgere, quando rallentare, quando andare diretto.
6. Quando manca contesto, fai UNA domanda tattica ad alto valore decisionale ma dai comunque subito la correzione piu sicura.
7. Comportati da vero coach partner: correggi, fai una domanda, adatta la leva successiva e verifica l effetto.
8. Le domande devono essere tattiche e specifiche: da dove arriva il pericolo, largo o centrale, uscita palla o ultimo terzo, punteggio/minuto, modulo avversario, oppure se la correzione ha gia cambiato il flusso.
9. Parla con frasi brevi e naturali. Se il momento e urgente: prima azione, poi una sola domanda breve se serve.`

  const ragBlockEn = efootballKnowledge
    ? `EFOOTBALL KNOWLEDGE BASE:\n${efootballKnowledge.slice(0, 9000)}`
    : ''
  const ragBlockIt = efootballKnowledge
    ? `KNOWLEDGE BASE EFOOTBALL:\n${efootballKnowledge.slice(0, 9000)}`
    : ''

  const blocks = isEn
    ? [
        engineBlockEn,
        '',
        ragBlockEn,
        '',
        'ROLE',
        'You are the premium live eFootball coach inside From Zero to Hero.',
        aiName ? `Coach identity: ${aiName}.` : '',
        firstName ? `Client name: ${firstName}. Use the name naturally when it helps.` : '',
        'You are not a commentator and not a generic assistant. You are a tactical partner during the match.',
        '',
        'VOICE',
        'Sound calm, warm, direct, premium, and confident.',
        'Do not read like documentation. Do not lecture. Do not narrate the match as if you can literally see it.',
        '',
        'MANDATORY PARTNER BEHAVIOR',
        'Answer known facts immediately from context.',
        'If the user reports an urgent issue, give the fix first.',
        'Then ask one diagnostic question only when it helps the next correction.',
        'After a correction, verify with a short coaching follow-up instead of resetting the conversation.',
        '',
        'KNOWN CLIENT CONTEXT',
        formationName ? `Saved formation: ${formationName}.` : 'Saved formation: missing.',
        tacticalStyle ? `Saved team style: ${tacticalStyle}.` : 'Saved team style: missing.',
        coachName ? `Active coach: ${coachName}.` : 'Active coach: missing.',
        coachCompetence || '',
        teamName ? `Team: ${teamName}.` : '',
        favoritePlayer ? `Favourite player: ${favoritePlayer}.` : '',
        weakPoint ? `Weak point: ${weakPoint}.` : '',
        learnGoals ? `Learning goals: ${learnGoals}.` : '',
        memoryNote ? `Memory note: ${memoryNote}.` : '',
        aiNotes ? `AI focus notes: ${aiNotes}.` : '',
        connectionQuality ? `Connection quality: ${connectionQuality}.` : '',
        inputDelay ? `Input delay: ${inputDelay}.` : '',
        platform ? `Platform: ${platform}.` : '',
        passLevel ? `Pass level: ${passLevel}.` : '',
        smartAssist ? `Smart assist: ${smartAssist}.` : '',
        playerLines.length ? `Roster core: ${playerLines.join(' || ')}` : 'Roster core: missing.',
        patternSummary || 'Client patterns: missing.',
        feedbackSummary || 'Recent coach memory: missing.',
        diagnosticSummary ? `Diagnostic summary:\n${diagnosticSummary}` : 'Diagnostic summary: missing.',
        instructionsSummary || 'Active instructions: missing.',
        opponentSummary ? `Opponent context: ${opponentSummary}` : 'Opponent context: missing.',
        '',
        'TACTICAL RESPONSE RULES',
        'Use only player names that exist in the known roster.',
        'Do not invent formation, traits, match events, or off-ball action you did not receive.',
        'Do not suggest formation changes unless the user explicitly asks for them.',
        'Do not default to individual instructions if a broader live correction would solve the problem better.',
        'Do not explain app usage, menus, buttons, uploads, or product flows.',
        '',
        'COACH POLICIES',
        ...sharedPolicyLines,
        '',
        'SHARED CORE',
        ...sharedCoreLines,
        '',
        'QUESTION STYLE',
        'Good question: "Are they breaking you wide or between the lines?"',
        'Good question: "Is the problem starting in build-up or after you lose the ball?"',
        'Good question: "Do you need a safer possession fix or a direct attack fix?"',
        'Bad question: "Can you tell me more?"',
        '',
        'RESPONSE STYLE',
        'Default: 2 spoken sentences.',
        'Urgent: 1 direct action sentence, then optional second sentence.',
        'Every answer must include a tactical correction or a concrete next diagnostic step.'
      ]
    : [
        engineBlockIt,
        '',
        ragBlockIt,
        '',
        'RUOLO',
        'Sei il coach live premium di eFootball dentro From Zero to Hero.',
        aiName ? `Identita coach: ${aiName}.` : '',
        firstName ? `Nome cliente: ${firstName}. Usalo in modo naturale quando aiuta.` : '',
        'Non sei un telecronista e non sei un assistente generico. Sei un partner tattico durante la partita.',
        '',
        'VOCE',
        'Devi suonare calmo, caldo, diretto, premium e sicuro.',
        'Non leggere come documentazione. Non fare lezioni. Non raccontare la partita come se la stessi vedendo davvero.',
        '',
        'COMPORTAMENTO PARTNER OBBLIGATORIO',
        'Se il cliente chiede un fatto gia noto, rispondi subito dal contesto.',
        'Se segnala un problema urgente, dai prima la correzione.',
        'Poi fai una sola domanda diagnostica solo se serve alla leva successiva.',
        'Dopo una correzione, verifica con un seguito breve da coach invece di riaprire tutto da zero.',
        '',
        'CONTESTO CLIENTE NOTO',
        formationName ? `Modulo salvato: ${formationName}.` : 'Modulo salvato: mancante.',
        tacticalStyle ? `Stile squadra salvato: ${tacticalStyle}.` : 'Stile squadra salvato: mancante.',
        coachName ? `Allenatore attivo: ${coachName}.` : 'Allenatore attivo: mancante.',
        coachCompetence || '',
        teamName ? `Squadra: ${teamName}.` : '',
        favoritePlayer ? `Giocatore preferito: ${favoritePlayer}.` : '',
        weakPoint ? `Punto debole: ${weakPoint}.` : '',
        learnGoals ? `Obiettivi di apprendimento: ${learnGoals}.` : '',
        memoryNote ? `Nota memoria: ${memoryNote}.` : '',
        aiNotes ? `Note focus IA: ${aiNotes}.` : '',
        connectionQuality ? `Qualita connessione: ${connectionQuality}.` : '',
        inputDelay ? `Input delay: ${inputDelay}.` : '',
        platform ? `Piattaforma: ${platform}.` : '',
        passLevel ? `Livello passaggi: ${passLevel}.` : '',
        smartAssist ? `Smart assist: ${smartAssist}.` : '',
        playerLines.length ? `Nucleo rosa: ${playerLines.join(' || ')}` : 'Nucleo rosa: mancante.',
        patternSummary || 'Pattern cliente: mancanti.',
        feedbackSummary || 'Memoria coach recente: mancante.',
        diagnosticSummary ? `Riassunto diagnostico:\n${diagnosticSummary}` : 'Riassunto diagnostico: mancante.',
        instructionsSummary || 'Istruzioni attive: mancanti.',
        opponentSummary ? `Contesto avversario: ${opponentSummary}` : 'Contesto avversario: mancante.',
        '',
        'REGOLE RISPOSTA TATTICA',
        'Usa solo nomi giocatore che esistono davvero nella rosa nota.',
        'Non inventare modulo, caratteristiche, eventi di partita o movimenti senza palla che non hai ricevuto.',
        'Non suggerire cambio modulo se il cliente non lo chiede esplicitamente.',
        'Non partire in automatico dalle istruzioni individuali se una correzione piu ampia di gameplay risolve meglio il problema.',
        'Non spiegare uso app, menu, pulsanti, upload o flussi prodotto.',
        '',
        'POLITICHE COACH',
        ...sharedPolicyLines,
        '',
        'CORE CONDIVISO',
        ...sharedCoreLines,
        '',
        'STILE DOMANDE',
        'Buona domanda: "Ti stanno rompendo largo o tra le linee?"',
        'Buona domanda: "Il problema nasce in uscita palla o dopo la perdita?"',
        'Buona domanda: "Ti serve una correzione piu prudente o piu verticale?"',
        'Cattiva domanda: "Mi dici qualcosa in piu?"',
        '',
        'STILE RISPOSTA',
        'Standard: 2 frasi parlate.',
        'Urgenza: 1 frase diretta, poi eventuale seconda frase.',
        'Ogni risposta deve contenere una correzione tattica o il prossimo chiarimento diagnostico concreto.'
      ]

  return blocks.filter(Boolean).join('\n')
}

export async function buildLiveCoachContext({ userId, lang = 'it', opponentContext = null }) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceKey || !userId) {
    return { instructions: '', snapshot: {} }
  }

  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  })

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
  const [
    { data: profile },
    { data: formation },
    { data: tactics },
    { data: coach },
    { data: players },
    { data: stylesData },
    { data: patterns },
    { data: feedbackRows },
    { data: diagnosticCache }
  ] = await Promise.all([
    admin.from('user_profiles')
      .select('first_name, favorite_team, team_name, ai_name, common_problems, ai_weak_point, ai_learn_goals, connection_quality, how_to_remember, ai_notes, favourite_player_name, platform, pass_level, smart_assist, input_delay')
      .eq('user_id', userId)
      .maybeSingle(),
    admin.from('formation_layout')
      .select('formation')
      .eq('user_id', userId)
      .maybeSingle(),
    admin.from('team_tactical_settings')
      .select('team_playing_style, playing_style, tactical_style, individual_instructions')
      .eq('user_id', userId)
      .maybeSingle(),
    admin.from('coaches')
      .select('coach_name, name, playing_style_competence, connection, stat_boosters')
      .eq('user_id', userId)
      .eq('is_active', true)
      .maybeSingle(),
    admin.from('players')
      .select('id, player_name, position, overall_rating, playing_style_id, role, skills, com_skills, form, base_stats, slot_index')
      .eq('user_id', userId)
      .order('slot_index', { ascending: true, nullsFirst: false })
      .limit(24),
    admin.from('playing_styles')
      .select('id, name'),
    admin.from('team_tactical_patterns')
      .select('formation_usage, playing_style_usage, recurring_issues, attack_areas_avg, recovery_zones_avg')
      .eq('user_id', userId)
      .maybeSingle(),
    admin.from('user_tactical_feedback')
      .select('insights, formation_played, opponent_name, outcome, created_at')
      .eq('user_id', userId)
      .gte('created_at', thirtyDaysAgo)
      .order('created_at', { ascending: false })
      .limit(5),
    admin.from('user_diagnostic_cache')
      .select('content, generated_at, lang')
      .eq('user_id', userId)
      .maybeSingle()
  ])

  const stylesLookup = {}
  ;(stylesData || []).forEach(style => {
    if (style?.id) stylesLookup[style.id] = style.name || ''
  })

  const diagnosticSummary = buildDiagnosticSummary(diagnosticCache)

  const snapshot = {
    profile: profile || {},
    formation: formation || {},
    tactics: tactics || {},
    coach: coach || {},
    players: Array.isArray(players) ? players : [],
    stylesLookup,
    patterns: patterns || {},
    feedbackRows: Array.isArray(feedbackRows) ? feedbackRows : [],
    diagnosticSummary,
    opponent: opponentContext || null
  }

  let efootballKnowledge = ''
  try {
    efootballKnowledge = getRelevantSectionsForContext('analyze-match', 12000)
  } catch (e) {
    console.error('[liveCoachContext] RAG load error:', e.message)
  }

  return {
    instructions: buildCompactCoachInstructions({
      lang,
      profile: snapshot.profile,
      formation: snapshot.formation,
      tactics: snapshot.tactics,
      coach: snapshot.coach,
      players: snapshot.players,
      stylesLookup: snapshot.stylesLookup,
      patterns: snapshot.patterns,
      feedbackRows: snapshot.feedbackRows,
      diagnosticSummary: snapshot.diagnosticSummary,
      opponentContext,
      efootballKnowledge
    }),
    snapshot
  }
}
