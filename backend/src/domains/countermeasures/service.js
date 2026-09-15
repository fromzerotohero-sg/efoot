import { presentCountermeasuresForCustomer } from '../../../../lib/prematchCustomerPlan.js'
import { getRelevantSectionsForContext } from '../../../../lib/ragHelper.js'
import { getTruthLayerPromptBlock } from '../../../../lib/efootballTruthLayer.js'
import {
  enforcePlanCoherence as enforceSharedPlanCoherence,
  focusCountermeasuresOutput,
  generateCountermeasuresPrompt,
  normalizeCountermeasureTerminology,
  validateCountermeasuresOutput
} from '../../../../lib/countermeasuresHelper.js'
import {
  buildClientFormationSnapshot,
  activeTacticalInstructions,
  getSnapshotPlayerRole
} from '../../../../lib/clientFormationSnapshot.js'
import {
  validateStartingXISwap
} from '../../../../lib/formationDefenseRules.js'
import { validateIndividualInstruction } from '../../../../lib/tacticalInstructions.js'
import { enforceCoachTeamStyleOnOutput } from '../../../../lib/teamPlayingStyles.js'

export const COUNTERMEASURES_COST = 2
export const MAX_COUNTERMEASURES_PROMPT_SIZE = 180 * 1024
export const COUNTERMEASURES_MODELS = Object.freeze(['gpt-5.2', 'gpt-4o', 'gpt-4-turbo', 'gpt-4'])
const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const CORRECTED_FORMATION = /^\d+-\d+(?:-\d+){0,2}$/

function serviceError(message, statusCode = 500, type = 'server_error') {
  const error = new Error(message)
  error.statusCode = statusCode
  error.type = type
  return error
}

function assertLive(config) {
  if (config?.dormant || !config?.allowLive) {
    throw serviceError('Countermeasures writes, AI, and credit costs are disabled until live cutover', 403, 'dormant')
  }
}

function text(value) {
  if (typeof value === 'string') return value.trim()
  if (value && typeof value === 'object') return String(value.it || value.en || '').trim()
  return ''
}

function normalizeInstructionId(value) {
  const key = String(value || '').trim().toLowerCase().normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '').replace(/[-\s]+/g, '_')
  return ({
    marcatura_a_uomo: 'marcatura_uomo',
    man_marking: 'marcatura_uomo',
    tight_marking: 'marcatura_stretta',
    deep_line: 'linea_bassa',
    counter_target: 'contropiede',
    counterattack: 'contropiede',
    anchoring: 'ancoraggio',
    offensive: 'offensivo',
    defensive: 'difensivo'
  })[key] || key
}

function normalizeInstructionSlot(value) {
  const key = String(value || '').trim().toLowerCase().replace(/[-\s]+/g, '_')
  return ({
    attack_1: 'attacco_1', attack1: 'attacco_1', attacco1: 'attacco_1',
    attack_2: 'attacco_2', attack2: 'attacco_2', attacco2: 'attacco_2',
    defense_1: 'difesa_1', defence_1: 'difesa_1', defense1: 'difesa_1',
    defence1: 'difesa_1', difesa1: 'difesa_1',
    defense_2: 'difesa_2', defence_2: 'difesa_2', defense2: 'difesa_2',
    defence2: 'difesa_2', difesa2: 'difesa_2'
  })[key] || key
}

function photoOpponent(formation) {
  const extracted = formation?.extracted_data && typeof formation.extracted_data === 'object'
    ? formation.extracted_data
    : {}
  const profile = extracted.visual_tactical_profile && typeof extracted.visual_tactical_profile === 'object'
    ? extracted.visual_tactical_profile
    : {}
  return {
    id: formation.id,
    formation_name: formation.formation_name,
    playing_style: formation.playing_style,
    tactical_style: formation.tactical_style,
    overall_strength: formation.overall_strength,
    players: formation.players || extracted.players || [],
    visual_tactical_profile: {
      width_profile: profile.width_profile || 'unclear',
      central_density: profile.central_density || 'unclear',
      side_bias: profile.side_bias || 'unclear',
      isolated_striker: profile.isolated_striker === true,
      two_strikers: profile.two_strikers === true,
      attackable_zones: Array.isArray(profile.attackable_zones) ? profile.attackable_zones.slice(0, 4) : [],
      defensive_gaps: Array.isArray(profile.defensive_gaps) ? profile.defensive_gaps.slice(0, 4) : [],
      formation_confidence: Number(profile.formation_confidence) || 0
    }
  }
}

function nameSet(formation) {
  return new Set((formation?.players || formation?.extracted_data?.players || [])
    .map((player) => String(player?.player_name || '').trim().toLowerCase())
    .filter((name) => name.length >= 3))
}

export function deriveCountermeasuresContext(raw) {
  const starters = raw.roster.filter((player) => {
    if (player.slot_index == null) return false
    const slot = Number(player.slot_index)
    return Number.isInteger(slot) && slot >= 0 && slot <= 10
  }).sort((a, b) => Number(a.slot_index) - Number(b.slot_index))
  const reserves = raw.roster.filter((player) => player.slot_index == null).slice(0, 12)
  const snapshot = buildClientFormationSnapshot({
    starters,
    baseLayout: raw.clientFormation,
    variantRows: raw.formationVariants
  })
  const tacticalSettings = raw.tacticalSettings
    ? {
        ...raw.tacticalSettings,
        individual_instructions: activeTacticalInstructions(raw.tacticalSettings, snapshot)
      }
    : null
  const historicById = Object.fromEntries(raw.historyOpponentFormations.map((row) => [row.id, row]))
  const currentNames = nameSet(raw.opponentFormation)
  const similarMatches = raw.matchHistory.filter((match) => {
    if (match.opponent_formation_id === raw.opponentFormation.id) return true
    const historic = historicById[match.opponent_formation_id]
    if (!historic || historic.formation_name !== raw.opponentFormation.formation_name) return false
    const historicNames = nameSet(historic)
    return [...currentNames].filter((name) => historicNames.has(name)).length >= 6
  })
  const playerPerformance = {}
  for (const match of similarMatches) {
    const ratings = match.player_ratings?.cliente || (
      match.player_ratings?.avversario ? {} : match.player_ratings
    ) || {}
    for (const [key, value] of Object.entries(ratings)) {
      const player = raw.roster.find((item) => item.id === key || item.player_name?.trim() === key.trim())
      const rating = Number(typeof value === 'object' ? value?.rating : value)
      if (!player || !Number.isFinite(rating) || rating <= 0) continue
      const entry = playerPerformance[player.id] ||= {
        playerName: player.player_name, matches: 0, totalRating: 0, ratings: []
      }
      entry.matches += 1
      entry.totalRating += rating
      entry.ratings.push(rating)
    }
  }
  const tacticalHabits = { preferredFormations: {}, preferredStyles: {}, winRateByFormation: {} }
  for (const match of raw.matchHistory) {
    const formation = match.formation_played || 'unknown'
    const style = match.playing_style_played || 'unknown'
    tacticalHabits.preferredFormations[formation] = (tacticalHabits.preferredFormations[formation] || 0) + 1
    tacticalHabits.preferredStyles[style] = (tacticalHabits.preferredStyles[style] || 0) + 1
    const stats = tacticalHabits.winRateByFormation[formation] ||= { wins: 0, losses: 0, draws: 0, total: 0 }
    stats.total += 1
    if (/W|Vittoria|Win/i.test(match.result || '')) stats.wins += 1
    else if (/L|Sconfitta|Loss/i.test(match.result || '')) stats.losses += 1
    else stats.draws += 1
  }
  return { ...raw, starters, reserves, snapshot, tacticalSettings, similarMatches, playerPerformance, tacticalHabits }
}

export async function loadCountermeasuresRag(lang = 'it') {
  const rag = getRelevantSectionsForContext('countermeasures', 22000)
  const truth = getTruthLayerPromptBlock(lang)
  return [truth, rag].filter(Boolean).join('\n\n')
}

export async function buildCountermeasuresPrompt(context, _ragText, lang = 'it') {
  return generateCountermeasuresPrompt(
    context.opponentFormation,
    context.roster,
    context.clientFormation,
    context.tacticalSettings,
    context.activeCoach,
    context.matchHistory,
    context.tacticalPatterns,
    {
      similarFormationMatches: context.similarMatches,
      playerPerformanceAgainstSimilar: context.playerPerformance,
      tacticalHabits: context.tacticalHabits,
      titolari: context.starters,
      riserve: context.reserves,
      stylesLookup: context.stylesLookup || {},
      team_playing_style: context.tacticalSettings?.team_playing_style || null,
      coachFeedback: context.coachFeedback || [],
      userProfile: context.userProfile || null,
      gameAnalysis: context.gameAnalysis || null,
      clientFormationSnapshot: context.snapshot
    },
    lang
  )
}

function validateOutput(output) {
  if (!output || typeof output !== 'object') return 'Output must be an object'
  if (!output.analysis || typeof output.analysis !== 'object') return 'Missing or invalid analysis field'
  if (!output.countermeasures || typeof output.countermeasures !== 'object') return 'Missing or invalid countermeasures field'
  const suggestions = [
    ...(output.countermeasures.formation_adjustments || []),
    ...(output.countermeasures.tactical_adjustments || []),
    ...(output.countermeasures.player_suggestions || [])
  ]
  for (const suggestion of suggestions) {
    if (suggestion.priority && !['high', 'medium'].includes(suggestion.priority)) {
      return `Invalid priority: ${suggestion.priority}`
    }
    if (suggestion.reason == null || suggestion.reason === '') suggestion.reason = 'Setup consigliato'
    else if (typeof suggestion.reason !== 'string' && typeof suggestion.reason !== 'object') {
      return 'All suggestions must have a reason'
    }
  }
  return null
}

function priority(item) {
  return item?.priority === 'high' ? 0 : 1
}

const WIDE_DIRECTION = /\b(corsie?|fasc(?:ia|e)|lato debole|ampiezza|estern[oiae]|laterali|wide|flank)\b/i
const CENTRAL_DIRECTION = /\b(centro|central[ei]|vie centrali|tra le linee|centralmente|centrally|between the lines)\b/i
const SEQUENCE_LANGUAGE = /\b(prima|poi|quando|allora|solo dopo|dopo che|appena|alterna|se (?:il|la|salta|chiudono))\b/i
const ATTACK_INTENT = /\b(attacca|costruisci|sviluppa|verticalizza|cerca|scarico|ricevitore|imbucata|rifinisci|insisti|apri il gioco|apri (?:subito )?sulle)\b/i

function planDirection(value) {
  const copy = text(value)
  const wide = WIDE_DIRECTION.test(copy)
  const central = CENTRAL_DIRECTION.test(copy)
  if (wide && !central) return 'wide'
  if (central && !wide) return 'central'
  return null
}

function enforcePlanCoherence(output) {
  const direction = planDirection(output?.play_summary?.match_key)
  const tactical = output?.countermeasures?.tactical_adjustments
  if (!direction || !Array.isArray(tactical)) return
  const opposite = direction === 'wide' ? 'central' : 'wide'
  output.countermeasures.tactical_adjustments = tactical.filter((item) => {
    if (!item || typeof item !== 'object') return true
    const copy = `${text(item.suggestion)} ${text(item.reason)}`
    if (!ATTACK_INTENT.test(copy) || SEQUENCE_LANGUAGE.test(copy)) return true
    return planDirection(copy) !== opposite
  })
}

function capOutput(output) {
  const cm = output.countermeasures
  const starting = Array.isArray(output.starting_plan) ? output.starting_plan.map(text).filter(Boolean) : []
  const tactical = []
  for (const adjustment of Array.isArray(cm.tactical_adjustments) ? cm.tactical_adjustments : []) {
    if (adjustment?.type === 'match_plan') {
      const tip = text(adjustment.suggestion).replace(/^in partita\s*:\s*/i, '').trim()
      if (tip && starting.length < 3) starting.push(tip)
    } else if (adjustment && typeof adjustment === 'object') tactical.push(adjustment)
  }
  output.starting_plan = starting.slice(0, 3)
  cm.formation_adjustments = (cm.formation_adjustments || []).sort((a, b) => priority(a) - priority(b)).slice(0, 1)
  cm.tactical_adjustments = tactical.sort((a, b) => priority(a) - priority(b)).slice(0, 2)
  cm.player_suggestions = (cm.player_suggestions || []).sort((a, b) => priority(a) - priority(b)).slice(0, 1)
  cm.individual_instructions = (cm.individual_instructions || []).sort((a, b) => priority(a) - priority(b)).slice(0, 2)
  if (Array.isArray(output.analysis.strengths)) output.analysis.strengths = output.analysis.strengths.slice(0, 1)
  if (Array.isArray(output.analysis.weaknesses)) output.analysis.weaknesses = output.analysis.weaknesses.slice(0, 1)
}

function filterApplyData(output, context) {
  const cm = output.countermeasures
  const starterMap = new Map(context.starters.map((player) => [player.id, player]))
  const reserveMap = new Map(context.reserves.map((player) => [player.id, player]))
  cm.player_suggestions = (cm.player_suggestions || []).filter((suggestion) => {
    if (suggestion.action !== 'add_to_starting_xi') return false
    const reserve = reserveMap.get(suggestion.player_id)
    const replaced = starterMap.get(suggestion.replace_player_id)
    if (!reserve || !replaced) return false
    const phases = context.snapshot?.enabled ? ['attack', 'defense'] : ['base']
    const valid = phases.every((phase) => validateStartingXISwap(
      context.starters,
      reserve,
      replaced.id,
      { getSlotRole: (player) => getSnapshotPlayerRole(context.snapshot, player, phase) }
    ).valid)
    if (!valid) return false
    suggestion.player_name = reserve.player_name
    suggestion.replace_player_name = replaced.player_name
    suggestion.replace_position ||= getSnapshotPlayerRole(context.snapshot, replaced, 'defense') || replaced.position
    suggestion.slot_role = suggestion.replace_position
    suggestion.reserve_card_position = reserve.position
    return true
  })
  const slots = new Set(['attacco_1', 'attacco_2', 'difesa_1', 'difesa_2'])
  cm.individual_instructions = (cm.individual_instructions || []).flatMap((item) => {
    const slot = normalizeInstructionSlot(item.slot)
    const instruction = normalizeInstructionId(item.instruction)
    if (!slots.has(slot) || !item.player_id || !instruction) return []
    const check = validateIndividualInstruction(slot, item.player_id, instruction, context.starters, context.snapshot)
    if (!check.valid) return []
    const current = context.tacticalSettings?.individual_instructions?.[slot]
    if (current?.enabled && current.player_id === item.player_id &&
      normalizeInstructionId(current.instruction) === instruction) return []
    const player = starterMap.get(item.player_id)
    return [{
      ...item,
      slot,
      instruction,
      player_name: player?.player_name || item.player_name || null,
      position: getSnapshotPlayerRole(context.snapshot, player, slot.startsWith('difesa_') ? 'defense' : 'attack') ||
        player?.position || item.position || null
    }]
  })
}

function bilingualize(output) {
  const bilingual = (value) => typeof value === 'string' ? { it: value, en: value } : value
  for (const key of ['diagnosis', 'fit_proof']) output[key] = bilingual(output[key])
  for (const key of ['with_ball', 'without_ball']) {
    if (Array.isArray(output[key])) output[key] = output[key].map(bilingual).slice(0, 2)
    else if (typeof output[key] === 'string') output[key] = [bilingual(output[key])]
  }
  for (const item of [
    ...(output.countermeasures.formation_adjustments || []),
    ...(output.countermeasures.tactical_adjustments || [])
  ]) {
    item.suggestion = bilingual(item.suggestion)
    item.reason = bilingual(item.reason)
    if ('application_hint' in item) item.application_hint = bilingual(item.application_hint)
  }
  for (const item of [
    ...(output.countermeasures.player_suggestions || []),
    ...(output.countermeasures.individual_instructions || [])
  ]) item.reason = bilingual(item.reason)
}

async function parseCompletion(response) {
  const data = await response.json()
  const content = data.choices?.[0]?.message?.content
  if (!content) throw serviceError('No content in response', 500, 'no_content')
  try {
    return { output: JSON.parse(content), model: data.model || 'unknown' }
  } catch {
    throw serviceError('Invalid response format from AI', 500, 'parse_error')
  }
}

export function createCountermeasuresService({
  repository,
  openai,
  credits,
  config = {},
  promptBuilder = buildCountermeasuresPrompt,
  now = () => new Date()
}) {
  if (!repository || !openai || !credits) {
    throw new TypeError('repository, openai, and credits are required')
  }

  return {
    async generate(input) {
      assertLive(config)
      if (!UUID_V4.test(String(input.opponentFormationId || ''))) {
        throw serviceError(
          input.opponentFormationId ? 'Invalid opponent_formation_id format' : 'opponent_formation_id is required',
          400,
          'validation'
        )
      }
      const lang = input.language === 'en' ? 'en' : 'it'
      const raw = await repository.loadContext(input)
      if (!raw.opponentFormation?.formation_name) {
        throw serviceError('Opponent formation data is incomplete', 400, 'validation')
      }
      const corrected = typeof input.correctedFormation === 'string' ? input.correctedFormation.trim() : ''
      if (corrected && CORRECTED_FORMATION.test(corrected)) {
        const extractedData = {
          ...(raw.opponentFormation.extracted_data || {}),
          formation: corrected
        }
        await repository.persistCorrection({
          ...input,
          formation: corrected,
          extractedData,
          now: now()
        })
        raw.opponentFormation.formation_name = corrected
        raw.opponentFormation.extracted_data = extractedData
      }
      const context = deriveCountermeasuresContext(raw)
      const prompt = await promptBuilder(context, '', lang)
      if (prompt.length > MAX_COUNTERMEASURES_PROMPT_SIZE) {
        throw serviceError('Countermeasures data too large. Please reduce data size.', 413, 'payload_too_large')
      }

      const charge = {
        capability: 'generate-countermeasures',
        amount: COUNTERMEASURES_COST,
        userId: input.userId,
        idempotencyKey: input.idempotencyKey
      }
      const deduction = await credits.deduct(charge)
      if (!deduction?.ok) {
        throw serviceError(
          lang === 'it' ? 'Crediti insufficienti. Ricarica per continuare.' : 'Insufficient credits. Please recharge to continue.',
          402,
          'insufficient_credits'
        )
      }
      try {
        let completion
        let lastError
        const models = [...new Set([config.openAiModel || COUNTERMEASURES_MODELS[0], ...COUNTERMEASURES_MODELS.slice(1)])]
        for (const model of models) {
          try {
            completion = await openai.complete({
              model,
              messages: [{ role: 'user', content: prompt }],
              response_format: { type: 'json_object' },
              temperature: 0.25,
              max_completion_tokens: 3000
            }, 'generate-countermeasures')
            break
          } catch (error) {
            lastError = error
            if (error?.type !== 'model_not_found') throw error
          }
        }
        if (!completion) throw lastError || serviceError('Unable to generate countermeasures')
        const { output, model } = await parseCompletion(completion)
        normalizeCountermeasureTerminology(output)
        const validation = validateCountermeasuresOutput(output)
        if (!validation.valid) throw serviceError(`Invalid countermeasures format: ${validation.error}`)
        filterApplyData(output, context)
        enforceSharedPlanCoherence(output)
        enforceCoachTeamStyleOnOutput(output, {
          competence: context.activeCoach?.playing_style_competence,
          currentStyle: context.tacticalSettings?.team_playing_style,
          lang
        })
        focusCountermeasuresOutput(output)
        if (!text(output.diagnosis) && !text(output.play_summary?.match_key) &&
          !text(output.analysis?.opponent_formation_analysis)) {
          output.diagnosis = `Avversario in ${context.opponentFormation.formation_name}: mantieni la tua disposizione e chiudi le zone aperte.`
        }
        bilingualize(output)
        const presented = presentCountermeasuresForCustomer(output, {
          lang,
          opponentFormation: context.opponentFormation,
          roster: context.roster,
          currentTacticalSettings: context.tacticalSettings,
          clientFormation: context.clientFormation
        })
        return {
          success: true,
          countermeasures: presented,
          customer_plan: presented.customer_plan,
          model_used: model
        }
      } catch (error) {
        await credits.refund(charge)
        throw error
      }
    }
  }
}
