import { stripStaleDiagnosticSections } from '../../../../lib/diagnosticCacheSanitize.js'
import {
  buildFluidFormationState,
  formatCoachLinkUpsForHeroPrompt,
  formatHeroFluidContext,
  prependLiveFluidOverride,
  prependLiveLinkUpOverride,
  startersForLinkUpVerification
} from '../../../../lib/efootballV6TacticalModel.js'
import { buildMatchZonePromptBlock } from '../../../../lib/matchAttackZones.js'
import { formatTacticalFeedbackForPrompt } from '../../../../lib/coachSuggestionEngine.js'
import { getPlacementWarningLines, getPlacementWarningTitle } from '../../../../lib/playerFieldPlacement.js'
import { buildDiagnostic } from '../../../../lib/diagnosticBuilder.js'
import { isRemovedIndividualInstruction } from '../../../../lib/efootballTruthLayer.js'
import { HERO_LIMITS, extractRosterNames } from './utils.js'

const PROFILE_FIELDS = [
  'first_name', 'last_name', 'team_name', 'common_problems', 'ai_name',
  'current_division', 'hours_per_week', 'connection_quality',
  'slow_opponent_connection_issues', 'input_delay', 'pass_level',
  'smart_assist', 'platform', 'favourite_player_name', 'how_to_remember',
  'ai_weak_point', 'ai_learn_goals', 'ai_notes'
].join(', ')
const PLAYER_FIELDS = [
  'id', 'player_name', 'position', 'overall_rating', 'playing_style_id',
  'role', 'slot_index', 'card_type', 'skills', 'com_skills', 'form',
  'base_stats', 'original_positions', 'metadata', 'development_points',
  'extracted_data', 'photo_slots', 'height', 'weight'
].join(', ')

function unwrap(result, fallback = null) {
  if (result?.error) throw new Error(result.error.message || 'Database context query failed')
  return result?.data ?? fallback
}

function trimContext(value) {
  const text = String(value || '').trim()
  return text.length > HERO_LIMITS.personalContext
    ? `${text.slice(0, HERO_LIMITS.personalContext)}\n... (riassunto troncato).`
    : text
}

function formatLatestPrematchPlan(row, lang) {
  const plan = row?.countermeasures?.customer_plan
  if (!plan) return ''
  const read = plan.opponent_read || {}
  const setup = Array.isArray(plan.setup_actions)
    ? plan.setup_actions
      .map((action) => `${action?.label || ''}: ${action?.value || ''}`.trim())
      .filter(Boolean)
      .slice(0, 5)
      .join('; ')
    : ''
  const playbook = plan.playbook || {}
  const planB = plan.plan_b || {}
  return [
    lang === 'en' ? 'LATEST PRE-MATCH PLAN:' : 'ULTIMO PIANO PRE-PARTITA:',
    `  Avversario: ${[read.formation, read.trait].filter(Boolean).join(' · ') || '?'}`,
    `  Decisione: ${plan.main_decision || plan.diagnosis || '?'}`,
    setup ? `  Setup: ${setup}` : '',
    playbook.with_ball ? `  Con palla: ${playbook.with_ball}` : '',
    playbook.without_ball ? `  Senza palla: ${playbook.without_ball}` : '',
    planB.action ? `  Piano B: se ${planB.trigger || 'cambia il contesto'} → ${planB.action}` : ''
  ].filter(Boolean).join('\n')
}

function formatLiveProfileOverlay(profile, lang) {
  const isEn = lang === 'en' || lang === 'es'
  const details = [
    profile?.connection_quality && `${isEn ? 'Connection quality' : 'Qualità connessione'}: ${profile.connection_quality}`,
    profile?.input_delay && `${isEn ? 'Input delay' : 'Ritardo input'}: ${profile.input_delay}`,
    profile?.pass_level && `${isEn ? 'Pass level' : 'Livello passaggi'}: ${profile.pass_level}`,
    profile?.smart_assist != null && `Smart Assist: ${profile.smart_assist}`,
    profile?.platform && `${isEn ? 'Platform' : 'Piattaforma'}: ${profile.platform}`
  ].filter(Boolean)
  return details.length
    ? `[${isEn ? 'LIVE PROFILE' : 'PROFILO LIVE'}] ${details.join(' · ')}`
    : ''
}

async function fallbackContext(client, userId, lang, profile) {
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
  const results = await Promise.all([
    client.from('formation_layout').select('formation, slot_positions').eq('user_id', userId).maybeSingle(),
    client.from('formation_variants').select('id, phase, formation, slot_positions, is_active').eq('user_id', userId).in('phase', ['attack', 'defense']).eq('is_active', true),
    client.from('players').select(PLAYER_FIELDS).eq('user_id', userId).order('slot_index', { ascending: true, nullsFirst: false }).limit(50),
    client.from('playing_styles').select('id, name'),
    client.from('matches').select('opponent_name, result, formation_played, playing_style_played, match_date, opponent_formation_id, player_ratings, attack_areas, team_stats, is_home, conceded_goal_zones, ball_recovery_zones').eq('user_id', userId).order('match_date', { ascending: false }).limit(20),
    client.from('team_tactical_settings').select('team_playing_style, individual_instructions').eq('user_id', userId).maybeSingle(),
    client.from('coaches').select('coach_name, playing_style_competence, stat_boosters, connection, extracted_data, metadata').eq('user_id', userId).eq('is_active', true).maybeSingle(),
    client.from('user_game_analysis').select('stats, captured_at').eq('user_id', userId).maybeSingle(),
    client.from('team_tactical_patterns').select('formation_usage, playing_style_usage, recurring_issues, attack_areas_avg, our_attack_areas_avg, opponent_attack_areas_avg, conceded_goal_zones_avg, recovery_zones_avg').eq('user_id', userId).maybeSingle(),
    client.from('user_tactical_feedback').select('insights, conversation_summary, formation_played, opponent_name, outcome, session_type, created_at').eq('user_id', userId).gte('created_at', since).order('created_at', { ascending: false }).limit(5),
    client.from('prematch_plans').select('countermeasures, created_at').eq('user_id', userId).eq('status', 'ready').order('created_at', { ascending: false }).limit(1).maybeSingle()
  ])
  const formationRow = unwrap(results[0], null)
  const variants = unwrap(results[1], [])
  const players = unwrap(results[2], [])
  const styles = unwrap(results[3], [])
  const matches = unwrap(results[4], [])
  const tactics = unwrap(results[5], null)
  const coach = unwrap(results[6], null)
  const gameAnalysis = unwrap(results[7], null)
  const patterns = unwrap(results[8], null)
  const feedback = unwrap(results[9], [])
  const prematch = unwrap(results[10], null)
  const opponentIds = [...new Set(matches.map((match) => match.opponent_formation_id).filter(Boolean))]
  const opponentRows = opponentIds.length
    ? unwrap(await client.from('opponent_formations')
      .select('id, formation_name, playing_style')
      .eq('user_id', userId)
      .in('id', opponentIds), [])
    : []
  const stylesLookup = Object.fromEntries(styles.map((style) => [style.id, style.name || '']))
  const individualInstructions = tactics?.individual_instructions &&
    typeof tactics.individual_instructions === 'object'
    ? tactics.individual_instructions
    : {}
  const activeInstructions = Object.values(individualInstructions)
    .filter((value) => value?.enabled === true && value?.instruction &&
      !isRemovedIndividualInstruction(value.instruction)).length
  const summary = buildDiagnostic(lang, {
    profile: profile || {},
    formation: formationRow?.formation || (lang === 'en' ? 'not set' : 'non impostata'),
    formationLayout: formationRow || null,
    variantRows: variants,
    roster: players,
    stylesLookup,
    matches,
    oppFormationsMap: Object.fromEntries(opponentRows.map((row) => [row.id, row])),
    teamStyle: tactics?.team_playing_style || (lang === 'en' ? 'not set' : 'non impostato'),
    numInstructions: activeInstructions,
    individualInstructions,
    coachRow: coach,
    patternsRow: patterns || {},
    gameAnalysisRow: gameAnalysis,
    feedbackRows: feedback
  })
  const latestPlan = formatLatestPrematchPlan(prematch, lang)
  const liveProfile = formatLiveProfileOverlay(profile, lang)
  return {
    summary: trimContext([liveProfile, latestPlan, summary].filter(Boolean).join('\n\n')),
    rosterNames: extractRosterNames(players),
    isDiagnostic: true
  }
}

async function liveDiagnosticOverlay(client, userId, cached, lang, profile) {
  const results = await Promise.all([
    client.from('team_tactical_settings').select('team_playing_style, individual_instructions').eq('user_id', userId).maybeSingle(),
    client.from('formation_layout').select('formation, slot_positions').eq('user_id', userId).maybeSingle(),
    client.from('formation_variants').select('id, phase, formation, slot_positions, is_active').eq('user_id', userId).in('phase', ['attack', 'defense']).eq('is_active', true),
    client.from('coaches').select('coach_name, playing_style_competence, connection, extracted_data, metadata').eq('user_id', userId).eq('is_active', true).maybeSingle(),
    client.from('playing_styles').select('id, name'),
    client.from('matches').select('attack_areas, is_home').eq('user_id', userId).order('match_date', { ascending: false }).limit(10),
    client.from('players').select('id, player_name, position, slot_index, original_positions, playing_style_id').eq('user_id', userId).limit(50),
    client.from('prematch_plans').select('countermeasures, created_at').eq('user_id', userId).eq('status', 'ready').order('created_at', { ascending: false }).limit(1).maybeSingle()
  ])
  const [tactics, layout, variants, coach, styles, matches, players, prematch] = results.map((result, index) =>
    unwrap(result, [2, 4, 5, 6].includes(index) ? [] : null))
  const fluid = buildFluidFormationState(layout, variants)
  const starters = players.filter((player) => Number(player?.slot_index) >= 0 && Number(player?.slot_index) <= 10)
  const styleLookup = Object.fromEntries(styles.map((style) => [style.id, style.name || '']))
  const isEn = lang === 'en' || lang === 'es'
  const instructions = tactics?.individual_instructions
  const playerNames = Object.fromEntries(players.map((player) => [String(player.id), player.player_name || '?']))
  const instructionRows = instructions && typeof instructions === 'object'
    ? Object.entries(instructions)
      .filter(([, value]) => value?.enabled === true && value?.instruction &&
        !isRemovedIndividualInstruction(value.instruction))
    : []
  const activeInstructions = instructionRows.length
  const instructionDetail = instructionRows.length
    ? `\n${isEn ? 'Individual instructions' : 'Istruzioni individuali'}:\n${instructionRows
      .slice(0, 8)
      .map(([slot, value]) => `  - ${slot}: ${value.instruction} → ${playerNames[String(value.player_id)] || '?'}`)
      .join('\n')}`
    : ''
  let summary = stripStaleDiagnosticSections(cached, { stripAiInfo: true, stripMatchZones: true })
  const warnings = getPlacementWarningLines(starters, lang, fluid)
  const liveTactics = `[${isEn ? 'LIVE' : 'AGGIORNAMENTO LIVE'}] ${isEn ? 'Team style' : 'Stile squadra'}: ${tactics?.team_playing_style || (isEn ? 'not set' : 'non impostato')}. ${isEn ? 'Individual instructions' : 'Istruzioni individuali'}: ${activeInstructions} ${isEn ? 'active' : 'attive'}.${instructionDetail}`
  summary = `${liveTactics}${warnings.length ? `\n[${isEn ? 'LIVE' : 'AGGIORNAMENTO LIVE'}] ${getPlacementWarningTitle(lang)}\n${warnings.join('\n')}` : ''}\n${summary}`
  summary = prependLiveFluidOverride(summary, formatHeroFluidContext({ fluid, starters, lang }), lang)
  summary = prependLiveLinkUpOverride(summary, formatCoachLinkUpsForHeroPrompt({
    coach,
    starters: startersForLinkUpVerification(starters, fluid),
    stylesLookup: styleLookup,
    lang
  }), lang)
  const zones = buildMatchZonePromptBlock(matches, lang)
  const latestPlan = formatLatestPrematchPlan(prematch, lang)
  const liveProfile = formatLiveProfileOverlay(profile, lang)
  return {
    summary: trimContext([liveProfile, latestPlan, zones, summary].filter(Boolean).join('\n\n')),
    rosterNames: extractRosterNames(players),
    isDiagnostic: true
  }
}

async function appendTacticalFeedback(client, userId, summary, lang) {
  try {
    const feedbackRows = unwrap(await client.from('user_tactical_feedback')
      .select('conversation_summary, insights, formation_played, style_played, opponent_name, outcome, created_at')
      .eq('user_id', userId).order('created_at', { ascending: false }).limit(5), [])
    const feedback = formatTacticalFeedbackForPrompt(feedbackRows, lang)
    return feedback ? trimContext(`${feedback}\n\n${summary}`) : summary
  } catch {
    return summary
  }
}

export function createHeroContextBuilder({ readProvider, now = () => new Date() }) {
  return async function buildHeroContext({ token, userId, currentPage, appState, lang }) {
    const client = readProvider.forUser(token)
    const profileResult = await client.from('user_profiles').select(PROFILE_FIELDS).eq('user_id', userId).maybeSingle()
    const profile = unwrap(profileResult, {})
    let contextResult
    try {
      const cache = unwrap(await client
        .from('user_diagnostic_cache')
        .select('content, generated_at, lang')
        .eq('user_id', userId)
        .maybeSingle(), null)
      const generated = cache?.generated_at ? new Date(cache.generated_at).getTime() : 0
      const fresh = Number.isFinite(generated) && generated > 0 &&
        now().getTime() - generated <= HERO_LIMITS.diagnosticAgeMs
      const cacheLanguageMatches = !cache?.lang || cache.lang === lang
      contextResult = cache?.content && fresh && cacheLanguageMatches
        ? await liveDiagnosticOverlay(client, userId, String(cache.content), lang, profile)
        : await fallbackContext(client, userId, lang, profile)
    } catch {
      contextResult = await fallbackContext(client, userId, lang, profile)
    }
    const summary = await appendTacticalFeedback(client, userId, contextResult.summary, lang)

    return {
      context: { profile, currentPage, appState },
      personalContextSummary: summary,
      contextBlockLabel: contextResult.isDiagnostic ? 'RIASSUNTO ANALISI' : 'ROSA E DATI',
      rosterNames: contextResult.rosterNames
    }
  }
}
