/**
 * Sanitizza stringa da DB per uso in prompt: evita newline/carriage return (prompt injection).
 * Tronca a maxLen caratteri se specificato.
 * @param {*} val - Valore (stringa o altro)
 * @param {number} [maxLen] - Lunghezza massima (opzionale)
 * @returns {string}
 */
function sanitizeForPrompt(val, maxLen = 200) {
  if (val == null) return ''
  const s = String(val).replace(/\r\n|\r|\n/g, ' ').trim()
  return maxLen > 0 && s.length > maxLen ? s.slice(0, maxLen) + '…' : s
}

/** Posizioni considerate "centrocampo" per match flessibile connection */
const MID_POSITIONS = new Set(['MED', 'CC', 'TRQ', 'TS', 'TD', 'ESA', 'EDA', 'CLD', 'CLS'])
/** Posizioni attacco per stat booster Finalizzazione */
const ATK_POSITIONS = new Set(['P', 'SP', 'ALA', 'AD', 'AS'])
/** Posizioni difesa per stat booster Comportamento difensivo */
const DEF_POSITIONS = new Set(['DC', 'TD', 'TS', 'MED', 'CC'])

function matchConnectionToRoster(connection, roster, stylesLookup) {
  if (!connection || !roster?.length) return { focal: [], keyMan: [], focalReq: null, keyManReq: null }
  const allPlayers = roster
  const styleMatch = (p, styleName, pos) => {
    const pStyle = (p.playing_style_id && stylesLookup[p.playing_style_id]) || (p.role ? String(p.role).trim() : '')
    const styleOk = !styleName || (pStyle && String(pStyle).toLowerCase() === String(styleName).toLowerCase())
    const posOk = !pos || p.position === pos || (pos === 'MED' && MID_POSITIONS.has(p.position)) || (pos === 'P' && ATK_POSITIONS.has(p.position))
    return styleOk && posOk
  }
  let focalReq = null
  let keyManReq = null
  if (connection.focal_point) {
    focalReq = `${connection.focal_point.playing_style || '?'} (${connection.focal_point.position || '?'})`
  }
  if (connection.key_man) {
    keyManReq = `${connection.key_man.playing_style || '?'} (${connection.key_man.position || '?'})`
  }
  const focal = connection.focal_point
    ? allPlayers.filter(p => styleMatch(p, connection.focal_point.playing_style, connection.focal_point.position))
    : []
  const keyMan = connection.key_man
    ? allPlayers.filter(p => styleMatch(p, connection.key_man.playing_style, connection.key_man.position))
    : []
  return { focal, keyMan, focalReq, keyManReq }
}

function statBoostersBeneficiaries(statBoosters, roster) {
  if (!Array.isArray(statBoosters) || statBoosters.length === 0 || !roster?.length) return []
  const lines = []
  for (const b of statBoosters.slice(0, 4)) {
    const name = (b && (b.stat_name || b.name)) ? String(b.stat_name || b.name) : ''
    if (!name) continue
    const nameLower = name.toLowerCase()
    let players = []
    if (nameLower.includes('finalizzazione') || nameLower.includes('finishing')) {
      players = roster.filter(p => p.position && ATK_POSITIONS.has(p.position)).map(p => sanitizeForPrompt(p.player_name, 25))
    } else if (nameLower.includes('comportamento difensivo') || nameLower.includes('defens') || nameLower.includes('difensiv')) {
      players = roster.filter(p => p.position && DEF_POSITIONS.has(p.position)).map(p => sanitizeForPrompt(p.player_name, 25))
    } else {
      players = roster.slice(0, 5).map(p => sanitizeForPrompt(p.player_name, 25))
    }
    if (players.length) lines.push(`${name}: ${players.slice(0, 5).join(', ')}`)
  }
  return lines
}

function coachAdvisableStyles(competence, lang) {
  if (!competence || typeof competence !== 'object') return { advisable: [], notAdvisable: [] }
  const entries = Object.entries(competence)
    .map(([k, v]) => ({ style: k, val: parseInt(v, 10) || 0 }))
    .filter(({ val }) => !Number.isNaN(val))
  const advisable = entries.filter(({ val }) => val >= 70).map(({ style }) => style)
  const notAdvisable = entries.filter(({ val }) => val < 70).map(({ style, val }) => `${style} (${val})`)
  return { advisable, notAdvisable }
}

function formationVsUsage(formation, formationUsage) {
  if (!formationUsage || typeof formationUsage !== 'object' || Object.keys(formationUsage).length === 0) return null
  const top = Object.entries(formationUsage)
    .sort((a, b) => (b[1]?.matches || 0) - (a[1]?.matches || 0))
    .slice(0, 2)
  const topFormations = top.map(([f]) => f).filter(Boolean)
  if (!formation || topFormations.length === 0) return null
  if (topFormations.includes(formation)) return null
  return { saved: formation, used: topFormations }
}

// Etichette leggibili per valori "Informazioni IA" (select) in diagnostic
const AI_INFO_VALUE_LABELS = {
  it: {
    connection_quality: { good: 'buona', unstable: 'a volte instabile', lag: 'spesso lag' },
    slow_opponent_connection_issues: { yes: 'sì', no: 'no', sometimes: 'a volte' },
    input_delay: { yes: 'sì', no: 'no', sometimes: 'a volte' },
    pass_level: { pa1: 'PA1', pa2: 'PA2', pa3: 'PA3' },
    smart_assist: { yes: 'sì', no: 'no' },
    platform: { console: 'Console', pc: 'PC', mobile: 'Mobile', other: 'Altro' },
    ai_weak_point: { defence: 'difesa', attack: 'attacco', set_pieces: 'piazzati', transitions: 'transizioni', final_minutes: 'finale partita' }
  },
  en: {
    connection_quality: { good: 'good', unstable: 'sometimes unstable', lag: 'often lag' },
    slow_opponent_connection_issues: { yes: 'yes', no: 'no', sometimes: 'sometimes' },
    input_delay: { yes: 'yes', no: 'no', sometimes: 'sometimes' },
    pass_level: { pa1: 'PA1', pa2: 'PA2', pa3: 'PA3' },
    smart_assist: { yes: 'yes', no: 'no' },
    platform: { console: 'Console', pc: 'PC', mobile: 'Mobile', other: 'Other' },
    ai_weak_point: { defence: 'defence', attack: 'attack', set_pieces: 'set pieces', transitions: 'transitions', final_minutes: 'final minutes' }
  }
}

function buildGameAnalysisText(gameAnalysisRow, lang) {
  if (!gameAnalysisRow?.stats || typeof gameAnalysisRow.stats !== 'object') return ''
  const stats = gameAnalysisRow.stats
  const lines = []
  const fmt = (obj, prefix) => {
    if (!obj || typeof obj !== 'object') return
    const entries = Object.entries(obj)
      .filter(([, v]) => v != null && String(v).trim() !== '')
      .map(([k, v]) => `${sanitizeForPrompt(k, 40)}: ${sanitizeForPrompt(String(v), 20)}`)
    if (entries.length) lines.push(`${prefix}: ${entries.join(', ')}`)
  }
  fmt(stats.goal_types, lang === 'en' ? 'Goal types' : 'Tipo gol')
  fmt(stats.shot_usage, lang === 'en' ? 'Shot usage' : 'Tiro')
  fmt(stats.special_commands, lang === 'en' ? 'Special commands' : 'Comandi speciali')
  fmt(stats.passing, lang === 'en' ? 'Passing' : 'Passaggio')
  fmt(stats.dribbling, lang === 'en' ? 'Dribbling' : 'Dribbling')
  fmt(stats.defense, lang === 'en' ? 'Defense' : 'Difesa')
  return lines.length ? lines.join('. ') : ''
}

/**
 * Sintesi compatta da partite inserite manualmente: zone attacco (media), voti presenti, eventuali aggregate da pattern.
 * Non va in conflitto con "Statistiche di gioco" (screenshot Analisi eFootball): questa è "partite inserite nell'app".
 */
function buildMatchDerivedSection(matches, patternsRow, lang) {
  const lines = []
  const matchesWithData = (matches || []).filter(m => {
    const hasRatings = m.player_ratings && typeof m.player_ratings === 'object' && Object.keys(m.player_ratings).length > 0
    const hasAreas = m.attack_areas && typeof m.attack_areas === 'object' && Object.keys(m.attack_areas).length > 0
    return hasRatings || hasAreas
  })
  if (matchesWithData.length > 0) {
    const n = matchesWithData.length
    const withRatings = matchesWithData.filter(m => m.player_ratings && typeof m.player_ratings === 'object' && Object.keys(m.player_ratings).length > 0).length
    const withAreas = matchesWithData.filter(m => m.attack_areas && typeof m.attack_areas === 'object' && Object.keys(m.attack_areas).length > 0).length
    const parts = []
    if (withAreas > 0) {
      const sumAreas = {}
      let areaMatchCount = 0
      matchesWithData.forEach(m => {
        const areas = m.attack_areas
        if (!areas || typeof areas !== 'object') return
        const clientData = areas.cliente || areas.team1 || areas
        if (clientData && typeof clientData === 'object') {
          areaMatchCount++
          Object.entries(clientData).forEach(([k, v]) => {
            const num = typeof v === 'number' ? v : parseFloat(String(v))
            if (!Number.isNaN(num)) sumAreas[k] = (sumAreas[k] || 0) + num
          })
        }
      })
      if (Object.keys(sumAreas).length > 0 && areaMatchCount > 0) {
        const total = Object.values(sumAreas).reduce((a, b) => a + b, 0)
        const pct = total > 0 ? Object.entries(sumAreas).map(([k, v]) => `${sanitizeForPrompt(k, 15)} ${Math.round((v / total) * 100)}%`).join(', ') : ''
        if (pct) parts.push((lang === 'en' ? 'Attack zones (avg)' : 'Zone attacco (media)') + ': ' + pct)
      }
    }
    if (withRatings > 0) parts.push((lang === 'en' ? 'Player ratings present for' : 'Voti giocatori presenti per') + ` ${withRatings} ${lang === 'en' ? 'matches' : 'partite'}`)
    if (parts.length) lines.push(parts.join('. '))
  }
  const patterns = patternsRow || {}
  if (patterns.attack_areas_avg && typeof patterns.attack_areas_avg === 'object' && Object.keys(patterns.attack_areas_avg).length > 0 && lines.every(l => !l.includes('Zone attacco') && !l.includes('Attack zones'))) {
    const entries = Object.entries(patterns.attack_areas_avg)
      .filter(([, v]) => v != null)
      .map(([k, v]) => `${sanitizeForPrompt(k, 15)}: ${v}`)
    if (entries.length) lines.push((lang === 'en' ? 'Attack zones (pattern avg)' : 'Zone attacco (media pattern)') + ': ' + entries.join(', '))
  }
  if (patterns.recovery_zones_avg && (Array.isArray(patterns.recovery_zones_avg) ? patterns.recovery_zones_avg.length > 0 : typeof patterns.recovery_zones_avg === 'object' && Object.keys(patterns.recovery_zones_avg).length > 0)) {
    const rec = patterns.recovery_zones_avg
    const summary = Array.isArray(rec) ? `${rec.length} zone` : (typeof rec === 'object' ? Object.keys(rec).length + ' zone' : String(rec))
    lines.push((lang === 'en' ? 'Recovery zones (avg)' : 'Zone recupero palla (media)') + ': ' + summary)
  }
  return lines.length ? lines.join('. ') : ''
}

/**
 * Sezione Ultime sconfitte: per ogni sconfitta nelle ultime 10 partite, dati per analisi "perché ho perso".
 * Includi: data, avversario, risultato, formazione, formazione avversaria, team_stats (possesso, gol subiti), zone attacco, voti più bassi.
 * La chat legge il riassunto da user_diagnostic_cache; questi dati sono già disponibili per domande tipo "perché ho perso".
 */
function buildRecentLossesSection(matches, oppFormationsMap, lang) {
  if (!matches || matches.length === 0) return ''
  const parseResult = (r) => {
    if (!r || typeof r !== 'string') return { ours: 0, theirs: 0, isLoss: false }
    const parts = String(r).trim().split('-').map(s => parseInt(s, 10))
    if (parts.length < 2 || Number.isNaN(parts[0]) || Number.isNaN(parts[1])) return { ours: 0, theirs: 0, isLoss: false }
    return { ours: parts[0], theirs: parts[1], isLoss: parts[0] < parts[1] }
  }
  const losses = matches.slice(0, 10).filter(m => parseResult(m.result).isLoss)
  if (losses.length === 0) return ''
  const lines = []
  const fmtDate = (d) => (d ? String(d).slice(0, 10) : '?')
  const oppForm = (oppId) => {
    const o = oppFormationsMap?.[oppId]
    return o?.formation_name ? sanitizeForPrompt(o.formation_name, 25) : null
  }
  for (const m of losses.slice(0, 4)) {
    const parts = []
    parts.push(`${fmtDate(m.match_date)} vs ${sanitizeForPrompt(m.opponent_name, 25) || '?'} ${m.result || '-'}`)
    const opp = oppForm(m.opponent_formation_id)
    const formStr = sanitizeForPrompt(m.formation_played, 15) || '-'
    parts.push(opp ? `(${formStr} vs ${opp})` : `(${formStr})`)
    const ts = m.team_stats
    if (ts && typeof ts === 'object') {
      const poss = ts.possession
      const gc = ts.goals_conceded
      if (poss != null) parts.push(`possesso ${poss}%`)
      if (gc != null) parts.push(`gol subiti ${gc}`)
    }
    const areas = m.attack_areas
    const clientAreas = areas?.cliente || areas?.team1 || areas
    if (clientAreas && typeof clientAreas === 'object' && Object.keys(clientAreas).length > 0) {
      const pct = Object.entries(clientAreas)
        .filter(([, v]) => v != null && !Number.isNaN(Number(v)))
        .map(([k, v]) => `${sanitizeForPrompt(k, 8)} ${Math.round(Number(v))}%`)
        .join(', ')
      if (pct) parts.push(`zone attacco: ${pct}`)
    }
    const pr = m.player_ratings?.cliente || m.player_ratings
    if (pr && typeof pr === 'object' && Object.keys(pr).length > 0) {
      const sorted = Object.entries(pr)
        .map(([n, v]) => ({ n, r: typeof v === 'object' ? v?.rating : v }))
        .filter(x => x.r != null && !Number.isNaN(Number(x.r)))
        .sort((a, b) => Number(a.r) - Number(b.r))
        .slice(0, 3)
      if (sorted.length) {
        const voti = sorted.map(x => `${sanitizeForPrompt(x.n, 18)} ${x.r}`).join(', ')
        parts.push(`voti bassi: ${voti}`)
      }
    }
    lines.push('- ' + parts.join('; '))
  }
  const title = lang === 'en' ? 'Recent losses (for "why did I lose?" analysis):' : 'Ultime sconfitte (per analisi "perché ho perso?"):'
  return `${title}\n${lines.join('\n')}`
}

/**
 * Sezione ESPERIENZA COACH: insight dalla Palestra Coach (ultimi 30 giorni).
 * Formato DIRETTIVO: dice all'IA cosa evitare, cosa rinforzare, cosa adattare.
 */
function buildCoachFeedbackSection(feedbackRows, lang) {
  if (!Array.isArray(feedbackRows) || feedbackRows.length === 0) return ''
  const isIt = lang !== 'en'

  const weaknesses = []
  const strengths = []
  const lessons = []

  for (const row of feedbackRows) {
    const insights = Array.isArray(row.insights) ? row.insights : []
    const ctx = []
    if (row.formation_played) ctx.push(row.formation_played)
    if (row.opponent_name) ctx.push(`vs ${sanitizeForPrompt(row.opponent_name, 25)}`)
    if (row.outcome) ctx.push(row.outcome)
    const ctxStr = ctx.length > 0 ? ` [${ctx.join(', ')}]` : ''

    for (const ins of insights) {
      if (!ins || !ins.text) continue
      const text = sanitizeForPrompt(ins.text, 150) + ctxStr
      if (ins.type === 'weakness') weaknesses.push(text)
      else if (ins.type === 'strength') strengths.push(text)
      else lessons.push(text)
    }

    // Se ci sono summary ma nessun insight, usa il summary come lezione
    if (insights.length === 0 && row.conversation_summary) {
      lessons.push(sanitizeForPrompt(row.conversation_summary, 120) + ctxStr)
    }
  }

  if (weaknesses.length === 0 && strengths.length === 0 && lessons.length === 0) return ''

  const parts = []
  const count = feedbackRows.length

  if (isIt) {
    parts.push(`${count} sessioni feedback negli ultimi 30 giorni.`)
    if (weaknesses.length > 0) {
      parts.push(`EVITA (il cliente ha segnalato problemi): ${weaknesses.join('; ')}`)
    }
    if (strengths.length > 0) {
      parts.push(`RINFORZA (ha funzionato bene): ${strengths.join('; ')}`)
    }
    if (lessons.length > 0) {
      parts.push(`ADATTA (lezioni apprese): ${lessons.join('; ')}`)
    }
  } else {
    parts.push(`${count} feedback sessions in last 30 days.`)
    if (weaknesses.length > 0) {
      parts.push(`AVOID (client reported issues): ${weaknesses.join('; ')}`)
    }
    if (strengths.length > 0) {
      parts.push(`REINFORCE (worked well): ${strengths.join('; ')}`)
    }
    if (lessons.length > 0) {
      parts.push(`ADAPT (lessons learned): ${lessons.join('; ')}`)
    }
  }

  return parts.join('\n')
}

function buildAiInfoLines(profile, lang) {
  const labels = AI_INFO_VALUE_LABELS[lang] || AI_INFO_VALUE_LABELS.en
  const lines = []
  const add = (label, val) => {
    if (val != null && String(val).trim() !== '') lines.push(`${label}: ${String(val).trim()}`)
  }
  const addSelect = (label, key, dbVal) => {
    const map = labels[key]
    if (dbVal != null && String(dbVal).trim() !== '') {
      const v = String(dbVal).trim().toLowerCase()
      lines.push(`${label}: ${(map && map[v]) || v}`)
    }
  }
  add(lang === 'en' ? 'Name' : 'Nome', profile.first_name)
  add(lang === 'en' ? 'Call AI' : 'Chiamare l\'IA', profile.ai_name)
  add(lang === 'en' ? 'Division' : 'Divisione', profile.current_division)
  if (profile.hours_per_week != null && profile.hours_per_week !== '') add(lang === 'en' ? 'Hours/week' : 'Ore/settimana', String(profile.hours_per_week))
  addSelect(lang === 'en' ? 'Connection' : 'Connessione', 'connection_quality', profile.connection_quality)
  addSelect(lang === 'en' ? 'Slow opponent connection issues' : 'Difficoltà con avversari lenti', 'slow_opponent_connection_issues', profile.slow_opponent_connection_issues)
  addSelect(lang === 'en' ? 'Input delay' : 'Ritardo input', 'input_delay', profile.input_delay)
  addSelect(lang === 'en' ? 'Pass level' : 'Livello passaggi', 'pass_level', profile.pass_level)
  addSelect(lang === 'en' ? 'Smart assist' : 'Smart assist', 'smart_assist', profile.smart_assist)
  addSelect(lang === 'en' ? 'Platform' : 'Piattaforma', 'platform', profile.platform)
  add(lang === 'en' ? 'Favourite player' : 'Giocatore preferito', profile.favourite_player_name)
  const weak = profile.ai_weak_point
  if (weak != null && String(weak).trim() !== '') {
    const v = String(weak).trim().toLowerCase()
    lines.push(`${lang === 'en' ? 'Weak point' : 'Punto debole'}: ${(labels.ai_weak_point && labels.ai_weak_point[v]) || sanitizeForPrompt(weak, 60)}`)
  }
  add(lang === 'en' ? 'Learn goals' : 'Cosa vuole imparare', profile.ai_learn_goals)
  add(lang === 'en' ? 'Notes for AI' : 'Note per l\'IA', profile.ai_notes)
  return lines
}

/**
 * Costruisce il testo del riassunto enterprise (diagnostic) per la chat.
 * Solo template/regole, nessuna chiamata OpenAI. Usato da POST /api/refresh-diagnostic.
 * Riferimento: docs/DIAGNOSTIC_DOCUMENTO_ANALISI_DIFFICOLTA.md §10.3 e §11
 *
 * @param {'it'|'en'} lang - Lingua output
 * @param {object} data - Dati già letti dal DB (profile, formation, roster, matches, coach, patterns, ecc.)
 * @returns {string} Testo del diagnostic (profilo, rosa, tattica, andamento, difficoltà, allenatore, build, abilità, sinergie)
 */
/** Blocco ISTRUZIONI PER L'IA: guida il ragionamento, riduce inferenze errate. Sempre all'inizio. */
const INSTRUCTIONS_BLOCK_IT = `---
ISTRUZIONI (obbligatorie): Usa SOLO i dati sotto. Manca dato → non inventare. §10.15: dati=INDICATORI, vietato "X perché Y". Statistiche/abilità FISSE: mai "migliorare/allenare". Rosa: solo nomi elencati. Stile squadra: solo 5 (Possesso, Contropiede, Contrattacco, Passaggio lungo, Vie laterali). Riassunto generale: non analisi partita singola.
ESPERIENZA COACH (se presente): Questi sono feedback REALI del cliente sui tuoi consigli precedenti. DEVI tenerne conto: NON ripetere errori segnalati (Debolezza), RINFORZA ciò che ha funzionato (Forza), ADATTA i consigli in base alle lezioni apprese (Lezione). Se il cliente ha segnalato un problema con un giocatore/formazione, proponi alternative concrete dalla rosa.
---`

const INSTRUCTIONS_BLOCK_EN = `---
INSTRUCTIONS (required): Use ONLY the data below. Missing data → don't invent. §10.15: data=INDICATORS, never "X because Y". Stats/skills FIXED: never "improve/train". Roster: only names listed. Team style: only 5 (Possession, Quick Counter, Counter-attack, Long Ball, Out Wide). General summary: not single match analysis.
COACH EXPERIENCE (if present): These are REAL client feedback on your previous advice. You MUST account for them: DO NOT repeat reported errors (Weakness), REINFORCE what worked (Strength), ADAPT advice based on lessons learned (Lesson). If the client reported an issue with a player/formation, propose concrete alternatives from the roster.
---`

export function buildDiagnostic(lang, data) {
  const L = lang === 'en' ? LABELS_EN : LABELS_IT
  const sections = []

  // 0. Blocco ISTRUZIONI PER L'IA (sempre per primo; guida ragionamento chat)
  sections.push(lang === 'en' ? INSTRUCTIONS_BLOCK_EN : INSTRUCTIONS_BLOCK_IT)

  // 1. Profilo (sanitizza campi da DB)
  const profile = data.profile || {}
  const firstName = sanitizeForPrompt(profile.first_name, 80) || (lang === 'en' ? 'User' : 'Utente')
  const teamName = sanitizeForPrompt(profile.team_name, 80) || (lang === 'en' ? 'your team' : 'il tuo team')
  const problems = Array.isArray(profile.common_problems)
    ? profile.common_problems.map(p => sanitizeForPrompt(p, 60)).filter(Boolean)
    : []
  sections.push(L.profileSection(firstName, teamName, problems))

  // 1b. Informazioni per l'IA (solo campi valorizzati; non usate per ai_knowledge_score)
  const aiInfoLines = buildAiInfoLines(profile, lang)
  if (aiInfoLines.length > 0) sections.push(L.aiInfoSection(aiInfoLines))

  // 1c. Statistiche di gioco (Analisi eFootball, ultime 10 partite) – se caricate dall'utente (sovrascrivono i dati precedenti)
  const gameAnalysisText = buildGameAnalysisText(data.gameAnalysisRow, lang)
  if (gameAnalysisText) sections.push(L.gameAnalysisSection(gameAnalysisText))

  // 1d. Esperienza Coach (feedback dalla Palestra Coach, ultimi 30 giorni)
  const feedbackText = buildCoachFeedbackSection(data.feedbackRows, lang)
  if (feedbackText) sections.push(L.coachFeedbackSection(feedbackText))

  // 2. Rosa (sintesi)
  const formation = data.formation || (lang === 'en' ? 'not set' : 'non impostata')
  const roster = data.roster || []
  const stylesLookup = data.stylesLookup || {}
  const titolari = roster.filter(p => p.slot_index != null && p.slot_index >= 0 && p.slot_index <= 10)
    .sort((a, b) => (Number(a.slot_index) || 0) - (Number(b.slot_index) || 0))
  const riserve = roster.filter(p => p.slot_index == null)
  const formLabel = (form) => {
    if (!form || typeof form !== 'string') return ''
    const f = String(form).toLowerCase()
    if (f.includes('incrollabile') || f.includes('a')) return ' forma↑'
    if (f.includes('ecc') || f.includes('b')) return ' forma↓'
    return ''
  }
  /** Stats compatte (fin, pas, tac) per incroci sostituzioni: es. "sbaglio a tirare" → riserva con fin alta */
  const statsSnippet = (baseStats) => {
    if (!baseStats || typeof baseStats !== 'object') return ''
    const atk = baseStats.attacking || {}
    const def = baseStats.defending || {}
    const fin = atk.finishing
    const pas = atk.low_pass ?? atk.lofted_pass
    const tac = def.tackling
    const parts = []
    if (fin != null) parts.push(`fin${fin}`)
    if (pas != null) parts.push(`pas${pas}`)
    if (tac != null) parts.push(`tac${tac}`)
    return parts.length ? ` ${parts.join(' ')}` : ''
  }
  /** Fino a 2 abilità per giocatore: per incrocio "compensare" (es. finalizzazione → Tiro calibrato in panchina) */
  const skillsSnippet = (p) => {
    const arr = [...(Array.isArray(p.skills) ? p.skills : []), ...(Array.isArray(p.com_skills) ? p.com_skills : [])]
      .filter(Boolean)
      .map(s => sanitizeForPrompt(s, 25))
      .slice(0, 2)
    return arr.length ? ` | ${arr.join(', ')}` : ''
  }
  const starterLines = titolari.map(p => {
    const styleName = (p.playing_style_id && stylesLookup[p.playing_style_id]) || sanitizeForPrompt(p.role, 30) || '-'
    const forma = formLabel(p.form)
    const stats = statsSnippet(p.base_stats)
    const skills = skillsSnippet(p)
    return `  ${sanitizeForPrompt(p.player_name, 50) || '?'} (${sanitizeForPrompt(p.position, 20) || '?'}, ${styleName}, ${p.overall_rating ?? '-'}${forma}${stats}${skills})`
  })
  const reserveLines = riserve.slice(0, 12).map(p => {
    const styleName = (p.playing_style_id && stylesLookup[p.playing_style_id]) || sanitizeForPrompt(p.role, 30) || '-'
    const forma = formLabel(p.form)
    const stats = statsSnippet(p.base_stats)
    const skills = skillsSnippet(p)
    return `  ${sanitizeForPrompt(p.player_name, 50) || '?'} (${sanitizeForPrompt(p.position, 20) || '?'}, ${styleName}, ${p.overall_rating ?? '-'}${forma}${stats}${skills})`
  })
  sections.push(L.rosterSection(formation, starterLines, reserveLines, riserve.length))

  // 3. Tattica (teamStyle = stile squadra da team_tactical_settings, NON formazione)
  const teamStyle = data.teamStyle && String(data.teamStyle).trim() && data.teamStyle !== 'non impostato' && data.teamStyle !== 'not set'
    ? data.teamStyle
    : (lang === 'en' ? 'not set' : 'non impostato')
  const numInstructions = data.numInstructions ?? 0
  sections.push(L.tacticsSection(teamStyle, numInstructions))

  // 4. Andamento (ultime partite + pattern)
  const matches = data.matches || []
  const oppMap = data.oppFormationsMap || {}
  const matchLines = matches.slice(0, 10).map(m => {
    const d = m.match_date ? String(m.match_date).slice(0, 10) : '?'
    const opp = oppMap[m.opponent_formation_id]
    const vs = opp?.formation_name ? ` vs ${sanitizeForPrompt(opp.formation_name, 30)}` : ''
    let votiStr = ''
    const pr = m.player_ratings
    if (pr && typeof pr === 'object') {
      const cliente = pr.cliente || pr
      if (cliente && typeof cliente === 'object') {
        const entries = Object.entries(cliente).slice(0, 5).map(([n, v]) => `${sanitizeForPrompt(n, 25)} ${v?.rating ?? v}`).filter(Boolean)
        if (entries.length) votiStr = ` [voti: ${entries.join(', ')}]`
      }
    }
    return `  ${d} vs ${sanitizeForPrompt(m.opponent_name, 40) || '?'} ${m.result || '-'} (${sanitizeForPrompt(m.formation_played, 20) || '-'}${vs})${votiStr}`
  })
  const patterns = data.patternsRow || {}
  const formUsage = patterns.formation_usage && typeof patterns.formation_usage === 'object'
  let patternText = ''
  if (formUsage && Object.keys(patterns.formation_usage).length > 0) {
    const top = Object.entries(patterns.formation_usage)
      .sort((a, b) => (b[1]?.matches || 0) - (a[1]?.matches || 0))
      .slice(0, 3)
    patternText = top.map(([f, d]) => `${f}: ${d?.matches || 0} ${L.matches} (${d?.win_rate != null ? Math.round(d.win_rate * 100) : '-'}%)`).join('; ')
  }
  sections.push(L.andamentoSection(matchLines, patternText, matches.length === 0))

  // 4b. Dati dalle partite inserite (zone attacco, voti giocatori, recupero) – complementari a "Statistiche di gioco" (screenshot)
  const matchDerivedText = buildMatchDerivedSection(matches, data.patternsRow, lang)
  if (matchDerivedText) sections.push(L.matchDerivedSection(matchDerivedText))

  // 4c. Ultime sconfitte: dati per analisi "perché ho perso?" (possesso, gol subiti, zone attacco, voti bassi)
  const recentLossesText = buildRecentLossesSection(matches, oppMap, lang)
  if (recentLossesText) sections.push(recentLossesText)

  // 5. Difficoltà
  const recurring = Array.isArray(patterns.recurring_issues)
    ? patterns.recurring_issues.slice(0, 3).map(i => sanitizeForPrompt(i?.issue ?? i, 60)).filter(Boolean)
    : []
  sections.push(L.difficoltaSection(problems, recurring))

  // 6. Allenatore (con connection ↔ rosa e stat boosters beneficiari)
  const coachRow = data.coachRow || null
  const allRoster = [...titolari, ...riserve]
  const connMatch = coachRow?.connection ? matchConnectionToRoster(coachRow.connection, allRoster, stylesLookup) : null
  const boosterLines = coachRow?.stat_boosters ? statBoostersBeneficiaries(coachRow.stat_boosters, allRoster) : []
  const { advisable: coachAdvisable, notAdvisable: coachNotAdvisable } = coachRow?.playing_style_competence
    ? coachAdvisableStyles(coachRow.playing_style_competence, lang)
    : { advisable: [], notAdvisable: [] }
  let coachText = coachRow?.coach_name
    ? L.coachSectionFull(
        sanitizeForPrompt(coachRow.coach_name, 60),
        coachRow.playing_style_competence || {},
        coachRow.connection,
        coachAdvisable,
        coachNotAdvisable,
        connMatch,
        boosterLines,
        lang
      )
    : L.noCoach
  sections.push(coachText)

  // 7. Build (sintesi: tipo rosa e come si muove in base agli stili)
  const buildSintesi = buildSintesiText(titolari, riserve, stylesLookup, formation, teamStyle, lang, L)
  sections.push(buildSintesi)

  // 8. Abilità rilevanti (sintesi)
  const allSkills = new Set()
  roster.forEach(p => {
    [...(Array.isArray(p.skills) ? p.skills : []), ...(Array.isArray(p.com_skills) ? p.com_skills : [])].forEach(s => allSkills.add(sanitizeForPrompt(s, 40)))
  })
  const skillsArr = [...allSkills].filter(Boolean).slice(0, 15)
  if (skillsArr.length > 0) sections.push(L.skillsSection(skillsArr))

  // 9. Sinergie e note derivate (allineamento coach-stile, disallineamento formazione, conflitti)
  const formVsUsage = formationVsUsage(formation, patterns.formation_usage)
  const individualInstructions = data.individualInstructions || {}
  const synergiesText = L.synergiesSection(
    teamStyle,
    coachAdvisable,
    formVsUsage,
    connMatch,
    individualInstructions,
    coachRow?.playing_style_competence,
    lang
  )
  if (synergiesText) sections.push(synergiesText)

  // 10. Leve possibili (ragionamenti inversi: sintomo → leva)
  const leveText = L.leveSection(problems, recurring, patterns.formation_usage, matches.length, lang)
  if (leveText) sections.push(leveText)

  return sections.filter(Boolean).join('\n\n')
}

function styleNameForPlayer(p, stylesLookup) {
  return (p.playing_style_id && stylesLookup[p.playing_style_id]) || sanitizeForPrompt(p.role, 30) || ''
}
function buildSintesiText(titolari, riserve, stylesLookup, formation, teamStyle, lang, L) {
  const styleNames = titolari.map(p => styleNameForPlayer(p, stylesLookup)).filter(Boolean)
  const uniqueStyles = [...new Set(styleNames)].slice(0, 6)
  const defStyles = titolari.filter(p => ['DC', 'TD', 'TS', 'MED'].includes(p.position)).map(p => styleNameForPlayer(p, stylesLookup)).filter(Boolean)
  const midStyles = titolari.filter(p => MID_POSITIONS.has(p.position)).map(p => styleNameForPlayer(p, stylesLookup)).filter(Boolean)
  const atkStyles = titolari.filter(p => p.position && ATK_POSITIONS.has(p.position)).map(p => styleNameForPlayer(p, stylesLookup)).filter(Boolean)
  return L.buildSectionRich(
    titolari.length,
    riserve.length,
    formation,
    teamStyle,
    uniqueStyles.length ? uniqueStyles.join(', ') : '-',
    defStyles.length ? [...new Set(defStyles)].join(', ') : '-',
    midStyles.length ? [...new Set(midStyles)].join(', ') : '-',
    atkStyles.length ? [...new Set(atkStyles)].join(', ') : '-',
    lang
  )
}

const LABELS_IT = {
  profileSection: (name, team, problems) =>
    `Profilo: ${name}, squadra ${team}.${problems.length ? ` Problemi dichiarati: ${problems.join(', ')}.` : ''}`,
  aiInfoSection: lines => `Informazioni per l'IA: ${lines.join('. ')}`,
  coachFeedbackSection: text => `Esperienza Coach (feedback Palestra Coach): ${text}`,
  gameAnalysisSection: text => `Statistiche di gioco (Analisi eFootball, ultime 10 partite): ${text}`,
  matchDerivedSection: text => `Dati dalle partite inserite (zone attacco, voti, recupero): ${text}`,
  rosterSection: (form, starters, reserves, totalReserves) =>
    `Rosa (per ogni giocatore: position, stile=stile giocatore card es. Punta avanzata/Regista/Collante, rating, forma, fin/pas/tac, abilità; usa per incroci con Statistiche di gioco, stile squadra, allenatore, RAG §2). Formazione: ${form}.\nTitolari:\n${starters.join('\n')}\nRiserve (${totalReserves}):\n${reserves.join('\n')}${totalReserves > 12 ? `\n... altri ${totalReserves - 12}` : ''}`,
  tacticsSection: (style, num) => `Tattica: stile squadra ${style}. Istruzioni individuali: ${num} attive.`,
  andamentoSection: (matchLines, patternText, noMatches) =>
    noMatches ? 'Andamento: nessuna partita caricata.' : `Andamento (ultime partite):\n${matchLines.join('\n')}${patternText ? `\nPattern: ${patternText}` : ''}`,
  difficoltaSection: (declared, recurring) =>
    `Difficoltà:${declared.length ? ` dichiarate: ${declared.join(', ')}.` : ''}${recurring.length ? ` Ricorrenti: ${recurring.join(', ')}.` : ' Nessun problema ricorrente in DB.'}`,
  noCoach: 'Allenatore: nessun allenatore attivo impostato.',
  coachSection: (name, competence, connection, statBoosters) => {
    let t = `Allenatore: ${name}. Competenze stili: `
    if (competence && typeof competence === 'object') {
      const entries = Object.entries(competence)
        .map(([k, v]) => ({ k, v: parseInt(v, 10) || 0 }))
        .filter(({ v }) => !Number.isNaN(v))
        .sort((a, b) => b.v - a.v)
        .slice(0, 5)
      t += entries.map(({ k, v }) => `${k}=${v}`).join(', ') + '.'
    } else t += 'non impostate.'
    if (connection) t += ` Connection: ${typeof connection === 'string' ? connection : (connection.name || '')}.`
    if (statBoosters && (Array.isArray(statBoosters) ? statBoosters.length : Object.keys(statBoosters || {}).length)) t += ' Stat boosters attivi.'
    return t
  },
  coachSectionFull: (name, competence, connection, advisable, notAdvisable, connMatch, boosterLines, lang) => {
    let t = `Allenatore: ${name}. `
    if (competence && typeof competence === 'object') {
      const entries = Object.entries(competence)
        .map(([k, v]) => ({ k, v: parseInt(v, 10) || 0 }))
        .filter(({ v }) => !Number.isNaN(v))
        .sort((a, b) => b.v - a.v)
        .slice(0, 5)
      t += `Competenze: ${entries.map(({ k, v }) => `${k}=${v}`).join(', ')}. `
      if (advisable?.length) t += `Consigliabili (≥70): ${advisable.join(', ')}. `
      if (notAdvisable?.length) t += `Sconsigliabili (<70): ${notAdvisable.slice(0, 3).join(', ')}. `
    }
    if (connection?.name) {
      t += `Connection: ${connection.name}. `
      if (connMatch) {
        const focalNames = connMatch.focal.map(p => sanitizeForPrompt(p.player_name, 20)).slice(0, 3)
        const keyNames = connMatch.keyMan.map(p => sanitizeForPrompt(p.player_name, 20)).slice(0, 3)
        if (focalNames.length) t += `Focal Point compatibili: ${focalNames.join(', ')}. `
        else if (connMatch.focalReq) t += `Focal Point richiesto (${connMatch.focalReq}): nessun match in rosa. `
        if (keyNames.length) t += `Key Man compatibili: ${keyNames.join(', ')}. `
        else if (connMatch.keyManReq) t += `Key Man richiesto (${connMatch.keyManReq}): nessun match in rosa. `
      }
    }
    if (boosterLines?.length) t += `Stat boosters beneficiari: ${boosterLines.join('; ')}. `
    return t.trim()
  },
  buildSection: (numStarters, numReserves, form, style) =>
    `Build: ${numStarters} titolari, ${numReserves} riserve. Formazione: ${form}. Stile squadra: ${style}.`,
  buildSectionRich: (numStarters, numReserves, form, style, uniqueStyles, defStyles, midStyles, atkStyles, lang) =>
    `Build: ${numStarters} titolari, ${numReserves} riserve. Formazione: ${form}, stile squadra: ${style}. Stili in rosa: ${uniqueStyles}. Difesa: ${defStyles}. Centrocampo: ${midStyles}. Attacco: ${atkStyles}. Usa questi stili per fit con modulo e connection.`,
  matches: 'partite',
  skillsSection: arr => `Abilità in rosa: ${arr.slice(0, 12).join(', ')}.`,
  synergiesSection: (teamStyle, coachAdvisable, formVsUsage, connMatch, individualInstructions, competence, lang) => {
    const parts = []
    if (teamStyle === 'non impostato' || teamStyle === 'not set') {
      if (coachAdvisable?.length) parts.push(`Stile squadra non impostato → consigliabile impostare uno tra: ${coachAdvisable.join(', ')} (coach forte su questi).`)
    } else if (coachAdvisable?.length && !coachAdvisable.some(s => teamStyle && String(teamStyle).toLowerCase().includes(s.toLowerCase()))) {
      const norm = String(teamStyle).toLowerCase().replace(/_/g, ' ')
      const match = coachAdvisable.find(s => norm.includes(s.toLowerCase()))
      if (!match) parts.push(`Stile squadra (${teamStyle}): verificare competenza coach; consigliabili con questo coach: ${coachAdvisable.join(', ')}.`)
    }
    if (formVsUsage) parts.push(`Disallineamento: formazione salvata ${formVsUsage.saved} vs moduli più usati in partita: ${formVsUsage.used.join(', ')}. Considerare moduli con miglior win rate.`)
    if (connMatch && (!connMatch.focal.length || !connMatch.keyMan.length)) {
      parts.push('Connection allenatore non pienamente attivabile: manca Focal Point o Key Man in rosa. Per attivarla servono giocatori con stile e posizione richiesti.')
    }
    const instr = individualInstructions && typeof individualInstructions === 'object' ? individualInstructions : {}
    const hasContropiedeOnDef = Object.entries(instr).some(([slot, o]) => {
      const s = (slot || '').toLowerCase()
      const inst = o?.instruction || o
      return (s.includes('difesa') || s.includes('def')) && (String(inst).toLowerCase().includes('contropiede') || String(inst).toLowerCase().includes('counter'))
    })
    if (hasContropiedeOnDef && competence) {
      const contropiedeVal = competence.contropiede_veloce ?? competence.contropiede
      const v = parseInt(contropiedeVal, 10)
      if (!Number.isNaN(v) && v < 70) parts.push('Nota: Contropiede attivo su difensori ma competenza coach Contropiede <70 — per contropiede sistematico preferire stile Contrattacco/Passaggio lungo o allenatore con Contropiede ≥70.')
    }
    return parts.length ? `Sinergie e note:\n${parts.map(p => `- ${p}`).join('\n')}` : ''
  },
  leveSection: (problems, recurring, formationUsage, matchesCount, lang) => {
    const leve = []
    if (problems.some(p => /difesa|defen|defens/i.test(String(p)))) leve.push('Difesa → leva: compattezza, istruzioni (linea bassa, marcatura, copertura), rinforzo centrale o terzini.')
    if (problems.some(p => /attacco|attack|goal|gol/i.test(String(p)))) leve.push('Attacco → leva: stile squadra adatto a verticalizzazione, punte da area, istruzioni su attaccanti (ancoraggio/contropiede dove consentito).')
    if (problems.some(p => /formazione|formation|modulo/i.test(String(p)))) leve.push('Formazione → leva: provare moduli con miglior win rate dai dati partite; allineare formazione salvata all\'uso reale.')
    if (recurring.length) leve.push(`Problemi ricorrenti (${recurring.slice(0, 2).join(', ')}) → agganciare una leva per volta: fix FIT, istruzioni §5, o cambio modulo/stile.`)
    if (matchesCount > 0 && formationUsage && typeof formationUsage === 'object') {
      const top = Object.entries(formationUsage).sort((a, b) => (b[1]?.win_rate || 0) - (a[1]?.win_rate || 0)).slice(0, 1)
      if (top.length && top[0][1]?.win_rate >= 0.6) leve.push(`Modulo con buon win rate: ${top[0][0]} (${Math.round((top[0][1].win_rate || 0) * 100)}%). Considerare per prossime partite.`)
    }
    return leve.length ? `Leve possibili (sintomo → leva):\n${leve.map(l => `- ${l}`).join('\n')}` : ''
  },
}

const LABELS_EN = {
  profileSection: (name, team, problems) =>
    `Profile: ${name}, team ${team}.${problems.length ? ` Declared issues: ${problems.join(', ')}.` : ''}`,
  aiInfoSection: lines => `Info for AI: ${lines.join('. ')}`,
  coachFeedbackSection: text => `Coach Experience (Coach Gym feedback): ${text}`,
  gameAnalysisSection: text => `Game stats (eFootball Analisi, last 10 matches): ${text}`,
  matchDerivedSection: text => `Data from entered matches (attack zones, ratings, recovery): ${text}`,
  rosterSection: (form, starters, reserves, totalReserves) =>
    `Roster (per player: position, style=player card style e.g. Adv Striker/Orchestrator/Anchor Man, rating, form, fin/pas/tac, skills; use for cross-checks with Game stats, team style, coach, RAG §2). Formation: ${form}.\nStarters:\n${starters.join('\n')}\nReserves (${totalReserves}):\n${reserves.join('\n')}${totalReserves > 12 ? `\n... ${totalReserves - 12} more` : ''}`,
  tacticsSection: (style, num) => `Tactics: team style ${style}. Individual instructions: ${num} active.`,
  andamentoSection: (matchLines, patternText, noMatches) =>
    noMatches ? 'Form: no matches loaded.' : `Form (last matches):\n${matchLines.join('\n')}${patternText ? `\nPattern: ${patternText}` : ''}`,
  difficoltaSection: (declared, recurring) =>
    `Difficulties:${declared.length ? ` declared: ${declared.join(', ')}.` : ''}${recurring.length ? ` Recurring: ${recurring.join(', ')}.` : ' No recurring issues in DB.'}`,
  noCoach: 'Coach: no active coach set.',
  coachSection: (name, competence, connection, statBoosters) => {
    let t = `Coach: ${name}. Style competence: `
    if (competence && typeof competence === 'object') {
      const entries = Object.entries(competence)
        .map(([k, v]) => ({ k, v: parseInt(v, 10) || 0 }))
        .filter(({ v }) => !Number.isNaN(v))
        .sort((a, b) => b.v - a.v)
        .slice(0, 5)
      t += entries.map(({ k, v }) => `${k}=${v}`).join(', ') + '.'
    } else t += 'not set.'
    if (connection) t += ` Connection: ${typeof connection === 'string' ? connection : (connection.name || '')}.`
    if (statBoosters && (Array.isArray(statBoosters) ? statBoosters.length : Object.keys(statBoosters || {}).length)) t += ' Stat boosters active.'
    return t
  },
  coachSectionFull: (name, competence, connection, advisable, notAdvisable, connMatch, boosterLines, lang) => {
    let t = `Coach: ${name}. `
    if (competence && typeof competence === 'object') {
      const entries = Object.entries(competence)
        .map(([k, v]) => ({ k, v: parseInt(v, 10) || 0 }))
        .filter(({ v }) => !Number.isNaN(v))
        .sort((a, b) => b.v - a.v)
        .slice(0, 5)
      t += `Competence: ${entries.map(({ k, v }) => `${k}=${v}`).join(', ')}. `
      if (advisable?.length) t += `Advisable (≥70): ${advisable.join(', ')}. `
      if (notAdvisable?.length) t += `Not advisable (<70): ${notAdvisable.slice(0, 3).join(', ')}. `
    }
    if (connection?.name) {
      t += `Connection: ${connection.name}. `
      if (connMatch) {
        const focalNames = connMatch.focal.map(p => sanitizeForPrompt(p.player_name, 20)).slice(0, 3)
        const keyNames = connMatch.keyMan.map(p => sanitizeForPrompt(p.player_name, 20)).slice(0, 3)
        if (focalNames.length) t += `Focal Point compatible: ${focalNames.join(', ')}. `
        else if (connMatch.focalReq) t += `Focal Point required (${connMatch.focalReq}): no match in roster. `
        if (keyNames.length) t += `Key Man compatible: ${keyNames.join(', ')}. `
        else if (connMatch.keyManReq) t += `Key Man required (${connMatch.keyManReq}): no match in roster. `
      }
    }
    if (boosterLines?.length) t += `Stat boosters beneficiaries: ${boosterLines.join('; ')}. `
    return t.trim()
  },
  buildSection: (numStarters, numReserves, form, style) =>
    `Build: ${numStarters} starters, ${numReserves} reserves. Formation: ${form}. Team style: ${style}.`,
  buildSectionRich: (numStarters, numReserves, form, style, uniqueStyles, defStyles, midStyles, atkStyles, lang) =>
    `Build: ${numStarters} starters, ${numReserves} reserves. Formation: ${form}, team style: ${style}. Styles in roster: ${uniqueStyles}. Defence: ${defStyles}. Midfield: ${midStyles}. Attack: ${atkStyles}. Use these for fit with formation and connection.`,
  matches: 'matches',
  skillsSection: arr => `Skills in roster: ${arr.slice(0, 12).join(', ')}.`,
  synergiesSection: (teamStyle, coachAdvisable, formVsUsage, connMatch, individualInstructions, competence, lang) => {
    const parts = []
    if (teamStyle === 'non impostato' || teamStyle === 'not set') {
      if (coachAdvisable?.length) parts.push(`Team style not set → advisable to set one of: ${coachAdvisable.join(', ')} (coach strong on these).`)
    } else if (coachAdvisable?.length && !coachAdvisable.some(s => teamStyle && String(teamStyle).toLowerCase().includes(s.toLowerCase()))) {
      const norm = String(teamStyle).toLowerCase().replace(/_/g, ' ')
      const match = coachAdvisable.find(s => norm.includes(s.toLowerCase()))
      if (!match) parts.push(`Team style (${teamStyle}): check coach competence; advisable with this coach: ${coachAdvisable.join(', ')}.`)
    }
    if (formVsUsage) parts.push(`Mismatch: saved formation ${formVsUsage.saved} vs most used in matches: ${formVsUsage.used.join(', ')}. Consider formations with better win rate.`)
    if (connMatch && (!connMatch.focal.length || !connMatch.keyMan.length)) {
      parts.push('Coach connection not fully activatable: missing Focal Point or Key Man in roster. Need players with required style and position.')
    }
    const instr = individualInstructions && typeof individualInstructions === 'object' ? individualInstructions : {}
    const hasContropiedeOnDef = Object.entries(instr).some(([slot, o]) => {
      const s = (slot || '').toLowerCase()
      const inst = o?.instruction || o
      return (s.includes('difesa') || s.includes('def')) && (String(inst).toLowerCase().includes('contropiede') || String(inst).toLowerCase().includes('counter'))
    })
    if (hasContropiedeOnDef && competence) {
      const contropiedeVal = competence.contropiede_veloce ?? competence.contropiede
      const v = parseInt(contropiedeVal, 10)
      if (!Number.isNaN(v) && v < 70) parts.push('Note: Counter on defenders but coach Quick Counter <70 — for systematic counter prefer Long Ball Counter/Passing or coach with Quick Counter ≥70.')
    }
    return parts.length ? `Synergies and notes:\n${parts.map(p => `- ${p}`).join('\n')}` : ''
  },
  leveSection: (problems, recurring, formationUsage, matchesCount, lang) => {
    const leve = []
    if (problems.some(p => /defen|defens/i.test(String(p)))) leve.push('Defence → lever: compactness, instructions (deep line, marking, cover), reinforce centre or full-backs.')
    if (problems.some(p => /attack|goal/i.test(String(p)))) leve.push('Attack → lever: team style suited to vertical play, strikers in box, instructions on forwards (anchor/counter where allowed).')
    if (problems.some(p => /formation|modul/i.test(String(p)))) leve.push('Formation → lever: try formations with better win rate from match data; align saved formation to actual usage.')
    if (recurring.length) leve.push(`Recurring issues (${recurring.slice(0, 2).join(', ')}) → anchor one lever at a time: fix FIT, §5 instructions, or change formation/style.`)
    if (matchesCount > 0 && formationUsage && typeof formationUsage === 'object') {
      const top = Object.entries(formationUsage).sort((a, b) => (b[1]?.win_rate || 0) - (a[1]?.win_rate || 0)).slice(0, 1)
      if (top.length && top[0][1]?.win_rate >= 0.6) leve.push(`Formation with good win rate: ${top[0][0]} (${Math.round((top[0][1].win_rate || 0) * 100)}%). Consider for next matches.`)
    }
    return leve.length ? `Possible levers (symptom → lever):\n${leve.map(l => `- ${l}`).join('\n')}` : ''
  },
}
