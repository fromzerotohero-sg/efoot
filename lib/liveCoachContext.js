import { createClient } from '@supabase/supabase-js'
import { getCoachPolicyLines, getCoachSharedCoreLines } from './coachPromptRules'
import { getRelevantSections, getRelevantSectionsForContext } from './ragHelper'
import { getPlayerStyleDisplayName } from './playingStyleResolve'
import { getPlayerDisplayStats, getPlayerDisplayOverall } from './playerEffectiveStats'

const DIAGNOSTIC_MAX_CHARS = 2600
const EXTENDED_QUERY_TIMEOUT_MS = 650
const LIVE_RAG_MAX_CHARS = 14000
const LIVE_RAG_DYNAMIC_MAX_CHARS = 8000
const LIVE_RAG_PROMPT_SLICE = 12000

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
  return compact(getPlayerStyleDisplayName(player, stylesLookup), 30)
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
  const stats = formatStats(getPlayerDisplayStats(player))
  const parts = [
    name,
    compact(player.position, 12),
    (() => {
      const ovr = getPlayerDisplayOverall(player)
      return Number.isFinite(ovr) ? `OVR ${ovr}` : ''
    })(),
    styleName,
    stats,
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

function buildLiveRagDynamicQuery({
  liveState = null,
  opponentContext = null,
  patterns = {},
  diagnosticSummary = '',
  microLoop = null,
  lang = 'it'
}) {
  const minute = Number.parseInt(liveState?.minute, 10)
  const scoreFor = Number.parseInt(liveState?.scoreFor, 10)
  const scoreAgainst = Number.parseInt(liveState?.scoreAgainst, 10)
  const windowsLeft = Number.parseInt(liveState?.windowsLeft, 10)
  const subsLeft = Number.parseInt(liveState?.subsLeft, 10)
  const scoreDelta = Number.isFinite(scoreFor) && Number.isFinite(scoreAgainst) ? (scoreFor - scoreAgainst) : 0

  const parts = []
  parts.push(lang === 'en' ? 'live eFootball tactical correction' : 'correzione tattica live eFootball')

  if (Number.isFinite(minute)) {
    if (minute <= 20) parts.push(lang === 'en' ? 'early match setup and risk control' : 'inizio partita setup e controllo rischio')
    else if (minute <= 55) parts.push(lang === 'en' ? 'mid-game structure and transitions' : 'struttura meta partita e transizioni')
    else parts.push(lang === 'en' ? 'late game substitutions and score management' : 'finale partita cambi e gestione punteggio')
  }

  if (scoreDelta < 0) parts.push(lang === 'en' ? 'comeback logic without chaos' : 'rimonta senza caos tattico')
  else if (scoreDelta > 0) parts.push(lang === 'en' ? 'protect lead and safe tempo' : 'protezione vantaggio e ritmo sicuro')
  else parts.push(lang === 'en' ? 'balanced game state corrections' : 'correzioni in stato equilibrato')

  if (Number.isFinite(windowsLeft) && windowsLeft <= 1) parts.push(lang === 'en' ? 'substitution window conservation' : 'conservazione finestre sostituzione')
  if (Number.isFinite(subsLeft) && subsLeft <= 1) parts.push(lang === 'en' ? 'final substitution resource management' : 'gestione ultima risorsa cambi')

  const recurringIssues = Array.isArray(patterns?.recurring_issues)
    ? patterns.recurring_issues.slice(0, 2).map(item => compact(item?.issue ?? item, 50)).filter(Boolean)
    : []
  if (recurringIssues.length) {
    parts.push(`${lang === 'en' ? 'recurring issues' : 'problemi ricorrenti'} ${recurringIssues.join(' ')}`)
  }

  const opponentShape = compact(opponentContext?.formation || opponentContext?.formation_name || '', 24)
  if (opponentShape) parts.push(`${lang === 'en' ? 'opponent shape' : 'modulo avversario'} ${opponentShape}`)

  const diag = compact(diagnosticSummary || '', 180).toLowerCase()
  if (diag.includes('connessione') || diag.includes('input delay') || diag.includes('lag')) {
    parts.push(lang === 'en' ? 'connection-safe actions and low timing risk' : 'azioni safe per connessione e basso rischio timing')
  }

  const loop = normalizeMicroLoop(microLoop)
  if (loop?.lastCorrection) {
    parts.push(`${lang === 'en' ? 'previous correction' : 'correzione precedente'} ${loop.lastCorrection}`)
  }
  if (loop?.outcome === 'non_ok') {
    parts.push(lang === 'en' ? 'change lever class do not repeat same fix' : 'cambia famiglia di leva non ripetere la stessa correzione')
  }

  return compact(parts.join(' | '), 600)
}

function extractKnowledgeTitle(block = '') {
  const m = String(block).match(/^##\s+(.+)$/m)
  return m?.[1] ? m[1].trim() : ''
}

function mergeKnowledgeBlocks(baseKnowledge = '', dynamicKnowledge = '', maxChars = LIVE_RAG_MAX_CHARS) {
  const sections = []
  const seenTitles = new Set()

  const pushSections = (raw = '') => {
    if (!raw || typeof raw !== 'string') return
    const chunks = raw.split(/\n\n---\n\n/).map(s => s.trim()).filter(Boolean)
    for (const chunk of chunks) {
      const title = extractKnowledgeTitle(chunk)
      const key = title || chunk.slice(0, 80)
      if (seenTitles.has(key)) continue
      seenTitles.add(key)
      sections.push(chunk)
    }
  }

  pushSections(baseKnowledge)
  pushSections(dynamicKnowledge)

  let total = 0
  const out = []
  for (const section of sections) {
    const addition = (out.length > 0 ? '\n\n---\n\n' : '') + section
    if (total + addition.length > maxChars) break
    out.push(section)
    total += addition.length
  }
  return out.join('\n\n---\n\n')
}

async function withTimeout(promise, timeoutMs, fallback = null) {
  let handle = null
  const timeoutPromise = new Promise(resolve => {
    handle = setTimeout(() => resolve(fallback), timeoutMs)
  })
  try {
    return await Promise.race([promise, timeoutPromise])
  } catch {
    return fallback
  } finally {
    if (handle) clearTimeout(handle)
  }
}

function avg(values = []) {
  const clean = values.filter(v => Number.isFinite(Number(v))).map(Number)
  if (clean.length === 0) return null
  return clean.reduce((sum, v) => sum + v, 0) / clean.length
}

function getRatingTrendLabel(ratingTrend) {
  if (!Array.isArray(ratingTrend) || ratingTrend.length < 6) return ''
  const recent = avg(ratingTrend.slice(-3))
  const prev = avg(ratingTrend.slice(-6, -3))
  if (recent == null || prev == null) return ''
  if (recent <= prev - 0.4) return 'down'
  if (recent >= prev + 0.4) return 'up'
  return 'flat'
}

function getSubstitutionPatternRisk(substitutionPattern) {
  if (!substitutionPattern || typeof substitutionPattern !== 'object') return 0
  const avgSubMinute = Number(substitutionPattern.avg_sub_minute ?? substitutionPattern.avg_subbed_out_minute)
  const subbedOutCount = Number(substitutionPattern.subbed_out_count ?? substitutionPattern.times_subbed_out)
  let risk = 0
  if (Number.isFinite(avgSubMinute) && avgSubMinute > 0 && avgSubMinute <= 70) risk += 110
  if (Number.isFinite(subbedOutCount) && subbedOutCount >= 5) risk += 70
  return risk
}

function buildPlayerLoadSummary(players = [], performanceRows = [], liveState = null, lang = 'it') {
  if (!Array.isArray(players) || players.length === 0 || !Array.isArray(performanceRows) || performanceRows.length === 0) return ''
  const highRunPositions = new Set(['ESA', 'EDA', 'CLS', 'CLD', 'CC', 'MED', 'SP', 'P'])
  const minute = Number.parseInt(liveState?.minute, 10)
  const scoreFor = Number.parseInt(liveState?.scoreFor, 10)
  const scoreAgainst = Number.parseInt(liveState?.scoreAgainst, 10)
  const scoreDelta = Number.isFinite(scoreFor) && Number.isFinite(scoreAgainst) ? (scoreFor - scoreAgainst) : 0
  const lateGameBoost = Number.isFinite(minute) ? (minute >= 71 ? 170 : minute >= 56 ? 90 : 0) : 0
  const pressureBoost = scoreDelta < 0 ? Math.min(140, Math.abs(scoreDelta) * 45) : 0
  const byPlayerId = new Map()
  for (const row of performanceRows) {
    if (row?.player_id) byPlayerId.set(String(row.player_id), row)
  }
  const starters = players.filter(player => player?.slot_index != null && player.slot_index >= 0 && player.slot_index <= 10)
  const risky = starters
    .map(player => {
      const aggregate = byPlayerId.get(String(player.id))
      if (!aggregate) return null
      const minutes = Number(aggregate.total_minutes_played) || 0
      const pos = String(player.position || '').toUpperCase().trim()
      const trend = getRatingTrendLabel(aggregate.rating_trend)
      const hasHighRunRole = highRunPositions.has(pos)
      const substitutionRisk = getSubstitutionPatternRisk(aggregate.substitution_pattern)
      const score = minutes + (hasHighRunRole ? 250 : 0) + (trend === 'down' ? 180 : 0) + substitutionRisk + (hasHighRunRole ? lateGameBoost : Math.round(lateGameBoost * 0.35)) + pressureBoost
      return {
        name: compact(player.player_name, 24),
        pos: compact(player.position, 8),
        minutes,
        trend,
        score
      }
    })
    .filter(Boolean)
    .sort((a, b) => b.score - a.score)
    .slice(0, 4)
  if (risky.length === 0) return ''
  const label = lang === 'en' ? 'Potential fatigue/load' : 'Carico/stanchezza potenziale'
  const trendLabel = lang === 'en'
    ? { up: 'trend up', down: 'trend down', flat: 'trend flat' }
    : { up: 'trend su', down: 'trend giu', flat: 'trend stabile' }
  return `${label}: ${risky.map(item => `${item.name}(${item.pos}) min50=${item.minutes}${item.trend ? ` ${trendLabel[item.trend] || ''}` : ''}`.trim()).join(' | ')}`
}

function buildGameAnalysisSummary(gameAnalysisRow, lang = 'it') {
  const stats = gameAnalysisRow?.stats
  if (!stats || typeof stats !== 'object') return ''
  const label = lang === 'en' ? 'Latest eFootball analysis stats' : 'Ultime statistiche Analisi eFootball'
  return `${label}: ${compactJson(stats, 1200)}`
}

function buildLiveStateSummary(liveState, lang = 'it') {
  if (!liveState || typeof liveState !== 'object') return ''
  const minute = Number.parseInt(liveState.minute, 10)
  const scoreFor = Number.parseInt(liveState.scoreFor, 10)
  const scoreAgainst = Number.parseInt(liveState.scoreAgainst, 10)
  const subsLeft = Number.parseInt(liveState.subsLeft, 10)
  const windowsLeft = Number.parseInt(liveState.windowsLeft, 10)
  const phase = compact(liveState.phase || '', 24)
  const parts = []
  if (Number.isFinite(minute)) parts.push(`${lang === 'en' ? 'min' : 'minuto'}=${minute}`)
  if (Number.isFinite(scoreFor) && Number.isFinite(scoreAgainst)) parts.push(`${lang === 'en' ? 'score' : 'risultato'}=${scoreFor}-${scoreAgainst}`)
  if (Number.isFinite(subsLeft)) parts.push(`${lang === 'en' ? 'subs left' : 'cambi residui'}=${subsLeft}`)
  if (Number.isFinite(windowsLeft)) parts.push(`${lang === 'en' ? 'windows left' : 'finestre residue'}=${windowsLeft}`)
  if (phase) parts.push(`${lang === 'en' ? 'phase' : 'fase'}=${phase}`)
  if (parts.length === 0) return ''
  return `${lang === 'en' ? 'Live state' : 'Stato live'}: ${parts.join(' | ')}`
}

function getSessionMode(liveState, opponentContext) {
  const explicitPhase = String(liveState?.phase || '').toLowerCase().trim()
  if (explicitPhase.includes('pre')) return 'pre_game'
  if (explicitPhase.includes('in') || explicitPhase.includes('live') || explicitPhase.includes('game')) return 'in_game'

  const minute = Number.parseInt(liveState?.minute, 10)
  if (Number.isFinite(minute) && minute > 0) return 'in_game'

  const hasScore = Number.isFinite(Number.parseInt(liveState?.scoreFor, 10)) && Number.isFinite(Number.parseInt(liveState?.scoreAgainst, 10))
  if (hasScore) return 'in_game'

  const hasOpponentPlan = Boolean(
    opponentContext?.formation ||
    opponentContext?.formation_name ||
    (Array.isArray(opponentContext?.players) && opponentContext.players.length > 0)
  )
  if (hasOpponentPlan) return 'pre_game'

  return 'unknown'
}

function buildSessionModeSummary(liveState, opponentContext, lang = 'it') {
  const mode = getSessionMode(liveState, opponentContext)
  if (lang === 'en') {
    if (mode === 'pre_game') return 'Session mode detected: pre_game'
    if (mode === 'in_game') return 'Session mode detected: in_game'
    return 'Session mode detected: unknown'
  }
  if (mode === 'pre_game') return 'Modalita sessione rilevata: pre_partita'
  if (mode === 'in_game') return 'Modalita sessione rilevata: in_partita'
  return 'Modalita sessione rilevata: sconosciuta'
}

function normalizeMicroLoop(microLoop) {
  if (!microLoop || typeof microLoop !== 'object') return null
  const lastCorrection = compact(microLoop.lastCorrection || microLoop.last_correction || '', 180)
  const outcomeRaw = String(microLoop.outcome || microLoop.userOutcome || microLoop.user_outcome || '').toLowerCase().trim()
  const nextLever = compact(microLoop.nextLever || microLoop.next_lever || '', 140)
  const outcome = outcomeRaw === 'ok' || outcomeRaw === 'non_ok' ? outcomeRaw : ''
  if (!lastCorrection && !outcome && !nextLever) return null
  return { lastCorrection, outcome, nextLever }
}

function buildMicroLoopSummary(microLoop, lang = 'it') {
  const loop = normalizeMicroLoop(microLoop)
  if (!loop) return ''
  const outcomeLabel = loop.outcome
    ? (lang === 'en' ? (loop.outcome === 'ok' ? 'ok' : 'not_ok') : (loop.outcome === 'ok' ? 'ok' : 'non_ok'))
    : ''
  const parts = []
  if (loop.lastCorrection) parts.push(`${lang === 'en' ? 'Last correction' : 'Ultima correzione'}: ${loop.lastCorrection}`)
  if (outcomeLabel) parts.push(`${lang === 'en' ? 'Reported outcome' : 'Esito riferito'}: ${outcomeLabel}`)
  if (loop.nextLever) parts.push(`${lang === 'en' ? 'Next lever' : 'Prossima leva'}: ${loop.nextLever}`)
  if (parts.length === 0) return ''
  return `${lang === 'en' ? 'Session micro-loop (authoritative)' : 'Micro-loop sessione (autorevole)'}: ${parts.join(' | ')}`
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
  performanceRows = [],
  gameAnalysisRow = null,
  diagnosticSummary = '',
  opponentContext = null,
  liveState = null,
  efootballKnowledge = '',
  microLoop = null
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
  const playerLoadSummary = buildPlayerLoadSummary(players, performanceRows, liveState, lang)
  const gameAnalysisSummary = buildGameAnalysisSummary(gameAnalysisRow, lang)
  const liveStateSummary = buildLiveStateSummary(liveState, lang)
  const sessionModeSummary = buildSessionModeSummary(liveState, opponentContext, lang)
  const microLoopSummary = buildMicroLoopSummary(microLoop, lang)

  const engineBlockEn = `LIVE COACH ENGINE (MANDATORY):
0. Detect session mode first: pre_game, in_game, or unknown. If unknown, ask only one short question: "Are you in pre-game or already in-game?" and still give the safest immediate suggestion.
1. Start from the user's live problem, then cross-check it with DIAGNOSTIC SUMMARY, roster, team style, coach competence, client patterns, recent lessons, active instructions, and opponent context.
1b. If opponent context is missing, do not invent opponent lineup/matchups. Ask one targeted question on opponent shape or where danger starts, then give the safest non-matchup-specific correction.
2. Use correct eFootball terminology: player style != team style != skill != individual instruction. Stats, card traits, and player styles are fixed; only lineup, team style, and instructions are configurable.
3. Prefer these levers first when they fit the problem: match tempo, side to attack or close, build-up route, midfield density, line height, pressing timing, player role fit, switch of play, substitutions, shot/pass/cross choice, and connection-safe actions. Use an individual instruction only when it is clearly the best lever, when the user asks for it, or when an already active instruction is directly causing or solving the issue.
4. Pick 1 main lever and at most 1 secondary lever. If the safest fix is enough, do not add more.
4b. If mode is pre_game, build a setup plan: starting tactical setup, substitution ladder by minute windows, and trigger rules ("if X happens, then Y").
5. Apply minute-aware substitution logic: 0-55 no automatic changes, 56-70 main substitution window, 71-85 scoreline-driven changes, 86+ only situation control.
6. Use this mandatory decision flow in order: (A) classify dominant live problem, (B) validate with known data, (C) choose minimum effective lever, (D) assess risk/resource state, (E) issue action now, (F) define quick verification checkpoint.
6b. Dominant problem classes: build-up exit, defensive transitions, wing overload, central overload, low chance quality, connection/timing instability, or emotional tilt under pressure.
6c. Minimum-effective lever priority: structure/timing/gameplay first; then instruction tweak; substitution only when clearly superior to non-sub corrections.
6d. Use session micro-loop as memory: if last correction failed, change lever class first (do not repeat the same family of fix blindly).
7. Defenders are substituted rarely by default. Change a defender only with clear repeated mismatch, persistent duel loss, card risk, or structural collapse.
8. Keep substitutions coherent with scoreline and risk: if losing heavily, first stabilize defensive transitions and reduce chaos before adding extra attack risk.
9. For every answer, use this output order: "Now in-play", "Next break", and one tactical question only if decision-critical.
9b. Whenever possible, phrase the correction as an observable trigger: "if/when X happens, do Y". Prefer situations the player can actually recognize: free DM, winger coming inside, striker dropping, high fullback, central overload, bad first touch, or rushed build-up.
9c. In "Now in-play", include one concrete action, one recommended pass/play if relevant, and one thing to avoid. Example shape: trigger -> action now -> pass/play -> avoid.
9d. Use opponent player names only when they are present in known opponent context. Otherwise talk by role or zone: DM, AMF, winger, fullback, left side, central lane.
9e. End the correction with a quick check the player can verify after 2-3 actions: what should improve if the lever is correct.
10. When context is incomplete, ask ONE tactical question with high decision value and still give the safest correction now.
11. If recent feedback says a lever failed, do not repeat it blindly. If a lever worked recently, you may reinforce it.
12. Behave like a real coach partner: correct, ask, adapt, and verify. Questions must be tactical and specific: where danger starts, wide vs central, build-up vs final third, score/time, opponent shape, and if the fix changed flow.
12b. For advanced cancel/skill mechanics, follow RAG section 7.12: official names first (Super Cancel, Kick Cancel, Kick Feint, Double Touch), no exploit coaching, and no repetitive spam advice.
13. Speak in short natural voice sentences. Urgent moment: action first, then one short question only if needed.
14. If formation is missing, occasionally add one ultra-short reminder after the tactical fix. Never explain app menus or UI steps.
15. Live pacing is mandatory: avoid frenetic coaching. Give one correction, then let the user play before re-checking. Standard re-check window is about 30-45 seconds (or 2-3 actions), except clear emergency.
16. In a short 10-minute match, keep interventions compact (about 6-8 useful interventions total, max 2-3 verification questions). Do not ask a verification question every turn.
17. Mental coach behavior: preserve composure under pressure. Use calm grounded language, reduce cognitive load, and stabilize decisions before adding new tactical complexity.
18. Avoid repetitive praise and forced positivity. Do not keep saying "perfect" when execution is poor or scoreline is negative; acknowledge reality, correct, and keep confidence.
19. Use the client name sparingly. Never repeat the name in every answer; use it only when it helps focus in key moments.`

  const engineBlockIt = `MOTORE LIVE COACH (OBBLIGATORIO):
0. Rileva prima la modalita sessione: pre_partita, in_partita o sconosciuta. Se e sconosciuta, fai solo una domanda breve: "Sei in pre-partita o sei gia in partita?" e dai comunque il suggerimento piu sicuro.
1. Parti dal problema live del cliente, poi incrocialo con RIASSUNTO DIAGNOSTICO, rosa, stile squadra, competenze allenatore, pattern del cliente, lezioni recenti, istruzioni attive e contesto avversario.
1b. Se il contesto avversario manca, non inventare modulo o matchup avversari. Fai una sola domanda mirata su modulo o punto in cui nasce il pericolo e poi dai la correzione piu sicura non dipendente dal matchup.
2. Usa terminologia eFootball corretta: stile giocatore != stile squadra != abilita != istruzione individuale. Statistiche, caratteristiche card e stili giocatore sono fissi; configurabili solo formazione, stile squadra e istruzioni.
3. Privilegia prima queste leve quando sono adatte al problema: ritmo partita, lato da attaccare o chiudere, uscita palla, densita centrocampo, altezza linea, tempi di pressing, fit del ruolo, cambio gioco, sostituzioni, scelta tra tiro/passaggio/cross e azioni sicure per la connessione. Usa un istruzione individuale solo se e chiaramente la leva migliore, se il cliente la chiede, oppure se una istruzione gia attiva sta davvero causando o risolvendo il problema.
4. Scegli 1 leva principale e al massimo 1 leva secondaria. Se basta la correzione piu sicura, non aggiungere altro.
4b. Se la modalita e pre_partita, costruisci un piano di setup: assetto iniziale, scaletta cambi per finestre di minutaggio, e trigger chiari ("se succede X, fai Y").
5. Applica logica cambi con minutaggio: 0-55 niente cambi automatici, 56-70 finestra principale, 71-85 cambi guidati dal risultato, 86+ solo controllo situazione.
6. Usa questo flusso decisionale obbligatorio in ordine: (A) classifica il problema live dominante, (B) validalo con i dati noti, (C) scegli la leva minima efficace, (D) valuta stato rischio/risorse, (E) dai azione immediata, (F) definisci checkpoint rapido di verifica.
6b. Classi di problema dominante: uscita palla, transizioni difensive, sovraccarico lato, inferiorita centrale, bassa qualita occasioni, instabilita connessione/timing, o tilt emotivo sotto pressione.
6c. Priorita leva minima efficace: prima struttura/tempi/gameplay; poi ritocco istruzioni; sostituzione solo quando chiaramente superiore alla correzione senza cambi.
6d. Usa il micro-loop sessione come memoria: se l'ultima correzione non ha funzionato, cambia prima famiglia di leva (non ripetere in automatico la stessa).
7. I difensori si cambiano raramente per default. Cambia un difensore solo con mismatch ripetuto, duello perso cronico, rischio cartellino, o collasso strutturale.
8. Mantieni coerenza col punteggio e col rischio: se il cliente perde largo, prima stabilizza transizioni e struttura, poi aumenta il rischio offensivo.
9. In ogni risposta usa questo ordine: "Adesso in-play", "Prossima pausa", e una sola domanda tattica se davvero decisiva.
9b. Quando possibile, formula la correzione come trigger osservabile: "se/quando succede X, fai Y". Preferisci situazioni che il giocatore puo riconoscere da solo: mediano libero, ala che stringe, punta che viene incontro, terzino alto, sovraccarico centrale, uscita palla sporca.
9c. Dentro "Adesso in-play" inserisci una azione concreta, un passaggio/giocata consigliata se serve, e una cosa da evitare. Forma ideale: trigger -> azione -> passaggio/giocata -> evita.
9d. Usa nomi dei giocatori avversari solo se sono presenti nel contesto avversario noto. Se non sei sicuro, parla per ruolo o zona: mediano, trequartista, ala, terzino, fascia sinistra, corridoio centrale.
9e. Chiudi la correzione con un check rapido verificabile dopo 2-3 azioni: cosa dovrebbe migliorare se la leva e giusta.
10. Quando manca contesto, fai UNA domanda tattica ad alto valore decisionale ma dai comunque subito la correzione piu sicura.
11. Se i feedback recenti dicono che una leva ha fallito, non ripeterla in automatico. Se una leva ha funzionato di recente, puoi rinforzarla.
12. Comportati da vero coach partner: correggi, chiedi, adatta la leva successiva e verifica l effetto. Le domande devono essere tattiche e specifiche: da dove arriva il pericolo, largo o centrale, uscita palla o ultimo terzo, punteggio/minuto, modulo avversario, oppure se la correzione ha gia cambiato il flusso.
12b. Per le meccaniche cancel/skill avanzate, segui la sezione RAG 7.12: termini ufficiali prima (Super Cancel, Kick Cancel, Kick Feint, Double Touch), niente coaching exploit, niente consigli di spam ripetitivo.
13. Parla con frasi brevi e naturali. Se il momento e urgente: prima azione, poi una sola domanda breve se serve.
14. Se manca la formazione, ogni tanto aggiungi un micro-promemoria dopo la correzione tattica. Non spiegare menu o passaggi UI.
15. Ritmo live obbligatorio: evita coaching frenetico. Dai una correzione, poi lascia giocare prima della verifica. Finestra standard di verifica: circa 30-45 secondi (o 2-3 azioni), salvo emergenze chiare.
16. In una partita breve da 10 minuti, mantieni gli interventi compatti (circa 6-8 interventi utili totali, max 2-3 domande di verifica). Non fare verifica a ogni turno.
17. Comportamento da mental coach: proteggi la lucidita sotto pressione. Linguaggio calmo e centrato, riduci carico cognitivo, stabilizza la decisione prima di aggiungere nuova complessita tattica.
18. Evita complimenti ripetitivi o positivita forzata. Non dire sempre "perfetto" quando la correzione non sta funzionando o il risultato e negativo; riconosci la realta, correggi e mantieni fiducia.
19. Usa il nome del cliente con parsimonia. Non ripeterlo in ogni risposta; usalo solo quando aiuta davvero il focus nei momenti chiave.`

  const ragBlockEn = efootballKnowledge
    ? `EFOOTBALL KNOWLEDGE BASE:\n${efootballKnowledge.slice(0, LIVE_RAG_PROMPT_SLICE)}`
    : ''
  const ragBlockIt = efootballKnowledge
    ? `KNOWLEDGE BASE EFOOTBALL:\n${efootballKnowledge.slice(0, LIVE_RAG_PROMPT_SLICE)}`
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
        'Do not ask for verification too frequently: in live, let the user play before checking effect.',
        'Under pressure keep a mental-coach tone: calm, clear, and focused.',
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
        playerLoadSummary || 'Player load/fatigue clues: missing.',
        gameAnalysisSummary || 'Latest game-analysis stats: missing.',
        liveStateSummary || 'Live state: missing.',
        sessionModeSummary,
        microLoopSummary || 'Session micro-loop: missing.',
        diagnosticSummary ? `Diagnostic summary:\n${diagnosticSummary}` : 'Diagnostic summary: missing.',
        instructionsSummary || 'Active instructions: missing.',
        opponentSummary ? `Opponent context: ${opponentSummary}` : 'Opponent context: missing.',
        '',
        'TACTICAL RESPONSE RULES',
        'Use only player names that exist in the known roster.',
        'Do not invent formation, traits, match events, or off-ball action you did not receive.',
        'If opponent context is missing, avoid opponent-specific matchups and player-vs-player claims.',
        'For advanced cancel/skill tips, use official mechanic names first and avoid exploit/spam coaching.',
        'Do not suggest formation changes unless the user explicitly asks for them.',
        'Do not default to individual instructions if a broader live correction would solve the problem better.',
        'Run the mandatory decision flow every turn: dominant problem -> data validation -> minimum effective lever -> risk/resource check -> action now -> short verification checkpoint.',
        'When context allows, make the correction situational and concrete: trigger -> action -> recommended pass/play -> avoid -> quick check.',
        'Use opponent player names only if they are present in known opponent context. Otherwise use role or zone labels.',
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
        'Default: 3 short blocks: "Now in-play", "Next break", optional "Question".',
        'Inside "Now in-play", prefer one recognisable trigger, one action, one recommended pass/play, and one thing to avoid.',
        'Urgent: 1 direct action sentence first, then next-break plan.',
        'Every answer must include a tactical correction or a concrete next diagnostic step.',
        'Name usage: occasional only. Avoid repeating the client name each turn.',
        'Praise usage: avoid automatic "perfect"; calibrate feedback to actual match state.'
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
        'Non chiedere verifica troppo spesso: in live lascia giocare prima di controllare l effetto.',
        'Sotto pressione mantieni tono da mental coach: calmo, chiaro e centrato.',
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
        playerLoadSummary || 'Indizi carico/stanchezza giocatori: mancanti.',
        gameAnalysisSummary || 'Statistiche analisi eFootball: mancanti.',
        liveStateSummary || 'Stato live: mancante.',
        sessionModeSummary,
        microLoopSummary || 'Micro-loop sessione: mancante.',
        diagnosticSummary ? `Riassunto diagnostico:\n${diagnosticSummary}` : 'Riassunto diagnostico: mancante.',
        instructionsSummary || 'Istruzioni attive: mancanti.',
        opponentSummary ? `Contesto avversario: ${opponentSummary}` : 'Contesto avversario: mancante.',
        '',
        'REGOLE RISPOSTA TATTICA',
        'Usa solo nomi giocatore che esistono davvero nella rosa nota.',
        'Non inventare modulo, caratteristiche, eventi di partita o movimenti senza palla che non hai ricevuto.',
        'Se il contesto avversario manca, evita matchup specifici e confronti giocatore-vs-giocatore.',
        'Per i consigli cancel/skill avanzati usa prima nomi meccaniche ufficiali ed evita coaching exploit/spam.',
        'Non suggerire cambio modulo se il cliente non lo chiede esplicitamente.',
        'Non partire in automatico dalle istruzioni individuali se una correzione piu ampia di gameplay risolve meglio il problema.',
        'Esegui sempre il flusso decisionale obbligatorio: problema dominante -> validazione dati -> leva minima efficace -> check rischio/risorse -> azione immediata -> checkpoint di verifica breve.',
        'Quando il contesto lo permette, rendi la correzione situazionale e concreta: trigger -> azione -> passaggio/giocata consigliata -> evita -> check rapido.',
        'Usa nomi dei giocatori avversari solo se sono presenti nel contesto avversario noto. Altrimenti usa ruolo o zona.',
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
        'Standard: 3 blocchi brevi: "Adesso in-play", "Prossima pausa", eventuale "Domanda".',
        'Dentro "Adesso in-play", preferisci un trigger riconoscibile, una azione, un passaggio/giocata consigliata e una cosa da evitare.',
        'Urgenza: 1 frase diretta subito, poi piano per prossima pausa.',
        'Ogni risposta deve contenere una correzione tattica o il prossimo chiarimento diagnostico concreto.',
        'Uso nome: solo occasionale. Evita di ripetere il nome del cliente a ogni turno.',
        'Uso complimenti: evita "perfetto" automatico; calibra il feedback allo stato reale della partita.'
      ]

  return blocks.filter(Boolean).join('\n')
}

export async function buildLiveCoachContext({ userId, lang = 'it', opponentContext = null, liveState = null, microLoop = null }) {
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
    { data: stylesData }
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
      .select('id, player_name, position, overall_rating, playing_style_id, role, skills, com_skills, base_stats, slot_index')
      .eq('user_id', userId)
      .order('slot_index', { ascending: true, nullsFirst: false })
      .limit(24),
    admin.from('playing_styles')
      .select('id, name')
  ])

  const [
    patternsRow,
    feedbackRowsResp,
    diagnosticCache,
    performanceRowsResp,
    gameAnalysisRow
  ] = await Promise.all([
    withTimeout(
      admin.from('team_tactical_patterns')
        .select('formation_usage, playing_style_usage, recurring_issues, attack_areas_avg, recovery_zones_avg')
        .eq('user_id', userId)
        .maybeSingle(),
      EXTENDED_QUERY_TIMEOUT_MS,
      { data: null }
    ),
    withTimeout(
      admin.from('user_tactical_feedback')
        .select('insights, formation_played, opponent_name, outcome, created_at')
        .eq('user_id', userId)
        .gte('created_at', thirtyDaysAgo)
        .order('created_at', { ascending: false })
        .limit(5),
      EXTENDED_QUERY_TIMEOUT_MS,
      { data: [] }
    ),
    withTimeout(
      admin.from('user_diagnostic_cache')
        .select('content, generated_at, lang')
        .eq('user_id', userId)
        .maybeSingle(),
      EXTENDED_QUERY_TIMEOUT_MS,
      { data: null }
    ),
    withTimeout(
      admin.from('player_performance_aggregates')
        .select('player_id, total_minutes_played, rating_trend, substitution_pattern, average_rating')
        .eq('user_id', userId)
        .limit(30),
      EXTENDED_QUERY_TIMEOUT_MS,
      { data: [] }
    ),
    withTimeout(
      admin.from('user_game_analysis')
        .select('stats, captured_at')
        .eq('user_id', userId)
        .maybeSingle(),
      EXTENDED_QUERY_TIMEOUT_MS,
      { data: null }
    )
  ])

  const stylesLookup = {}
  ;(stylesData || []).forEach(style => {
    if (style?.id) stylesLookup[style.id] = style.name || ''
  })

  const diagnosticSummary = buildDiagnosticSummary(diagnosticCache?.data)

  const snapshot = {
    profile: profile || {},
    formation: formation || {},
    tactics: tactics || {},
    coach: coach || {},
    players: Array.isArray(players) ? players : [],
    stylesLookup,
    patterns: patternsRow?.data || {},
    feedbackRows: Array.isArray(feedbackRowsResp?.data) ? feedbackRowsResp.data : [],
    performanceRows: Array.isArray(performanceRowsResp?.data) ? performanceRowsResp.data : [],
    gameAnalysis: gameAnalysisRow?.data || null,
    liveState: liveState || null,
    microLoop: normalizeMicroLoop(microLoop),
    diagnosticSummary,
    opponent: opponentContext || null
  }

  let efootballKnowledge = ''
  try {
    const baseKnowledge = getRelevantSectionsForContext('analyze-match', LIVE_RAG_MAX_CHARS)
    const dynamicQuery = buildLiveRagDynamicQuery({
      liveState: snapshot.liveState,
      opponentContext,
      patterns: snapshot.patterns,
      diagnosticSummary: snapshot.diagnosticSummary,
      microLoop: snapshot.microLoop,
      lang
    })
    const dynamicKnowledge = dynamicQuery
      ? getRelevantSections(dynamicQuery, LIVE_RAG_DYNAMIC_MAX_CHARS)
      : ''
    efootballKnowledge = mergeKnowledgeBlocks(baseKnowledge, dynamicKnowledge, LIVE_RAG_MAX_CHARS)
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
      performanceRows: snapshot.performanceRows,
      gameAnalysisRow: snapshot.gameAnalysis,
      diagnosticSummary: snapshot.diagnosticSummary,
      opponentContext,
      liveState: snapshot.liveState,
      efootballKnowledge,
      microLoop: snapshot.microLoop
    }),
    snapshot
  }
}
