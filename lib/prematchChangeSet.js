/**
 * Traduce output contromisure in change-set deterministico (stile, istruzioni, cambi).
 * Nessuna scrittura DB qui — solo validazione/shape per apply-plan.
 */
import { canonicalizeTeamPlayingStyleId } from './teamPlayingStyles.js'
import { INDIVIDUAL_INSTRUCTIONS_CONFIG } from './tacticalInstructions.js'

const INSTRUCTION_IDS = new Set(
  Object.values(INDIVIDUAL_INSTRUCTIONS_CONFIG).flatMap((c) =>
    (c.availableInstructions || []).map((i) => i.id)
  )
)

function asText(val, lang = 'it') {
  if (val == null) return ''
  if (typeof val === 'string') return val.trim()
  if (typeof val === 'object') {
    return String(val[lang] || val.it || val.en || val.es || '').trim()
  }
  return String(val).trim()
}

function normalizeInstructionId(raw, lang = 'it') {
  const text = asText(raw, lang).toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '')
  if (!text) return null
  if (INSTRUCTION_IDS.has(text)) return text

  const map = [
    [/ancoragg|anchoring|anclaje/, 'ancoraggio'],
    [/difensiv|defensive/, 'difensivo'],
    [/marcatura.?stretta|tight.?mark/, 'marcatura_stretta'],
    [/marcatura.?uomo|man.?mark/, 'marcatura_uomo'],
    [/contropiede|counter.?target|obiettivo/, 'contropiede']
  ]
  for (const [re, id] of map) {
    if (re.test(text)) return id
  }
  return null
}

/**
 * @param {object} countermeasuresRoot - payload.countermeasures from generate API
 * @param {{ lang?: string }} opts
 */
export function buildPrematchChangeSet(countermeasuresRoot, opts = {}) {
  const lang = opts.lang === 'en' || opts.lang === 'es' ? opts.lang : 'it'
  const root = countermeasuresRoot?.countermeasures || countermeasuresRoot || {}
  const cm = root.countermeasures || root
  const playSummary = root.play_summary || countermeasuresRoot?.play_summary || null
  const analysis = root.analysis || countermeasuresRoot?.analysis || null

  const tactical = Array.isArray(cm.tactical_adjustments) ? cm.tactical_adjustments : []
  let teamPlayingStyle = null
  for (const adj of tactical) {
    if (adj?.type !== 'team_playing_style' && adj?.type !== 'playing_style_change') continue
    const id = canonicalizeTeamPlayingStyleId(asText(adj.suggestion, lang))
      || canonicalizeTeamPlayingStyleId(asText(adj.application_hint, lang))
    if (id) {
      teamPlayingStyle = id
      break
    }
  }

  const individualInstructions = {}
  const instructions = Array.isArray(cm.individual_instructions) ? cm.individual_instructions : []
  for (const row of instructions) {
    const slot = String(row?.slot || '').trim()
    if (!INDIVIDUAL_INSTRUCTIONS_CONFIG[slot]) continue
    const playerId = row?.player_id
    const instruction = normalizeInstructionId(row?.instruction, lang)
    if (!playerId || !instruction) continue
    individualInstructions[slot] = {
      player_id: playerId,
      instruction,
      enabled: true,
      player_name: row?.player_name || null,
      position: row?.position || null
    }
  }

  const substitutions = []
  const players = Array.isArray(cm.player_suggestions) ? cm.player_suggestions : []
  for (const sug of players) {
    if (!sug?.player_id || !sug?.replace_player_id) continue
    if (sug.action && sug.action !== 'add_to_starting_xi') continue
    substitutions.push({
      in_player_id: sug.player_id,
      in_player_name: sug.player_name || null,
      out_player_id: sug.replace_player_id,
      out_player_name: sug.replace_player_name || null,
      position: sug.position || sug.slot_role || sug.replace_position || null,
      reason: asText(sug.reason, lang),
      priority: sug.priority || 'medium'
    })
  }

  const warnings = []

  const customer = root.customer_plan || countermeasuresRoot?.customer_plan || null
  const startingPlan = Array.isArray(root.starting_plan || customer?.starting_plan)
    ? (root.starting_plan || customer.starting_plan).map((s) => asText(s, lang)).filter(Boolean).slice(0, 3)
    : []

  return {
    version: 1,
    team_playing_style: teamPlayingStyle,
    individual_instructions: individualInstructions,
    substitutions: substitutions.slice(0, 1),
    starting_plan: startingPlan,
    customer_plan: customer,
    play_summary: playSummary
      ? {
          match_key: asText(playSummary.match_key || customer?.diagnosis, lang),
          base_plan: asText(playSummary.base_plan || startingPlan[0], lang),
          attacking: asText(playSummary.attacking || startingPlan[1], lang),
          defending: asText(playSummary.defending || startingPlan[2], lang),
          avoid: asText(playSummary.avoid, lang)
        }
      : null,
    analysis_excerpt: analysis
      ? {
          strengths: (analysis.strengths || []).slice(0, 1).map((s) => asText(s, lang)),
          weaknesses: (analysis.weaknesses || []).slice(0, 1).map((s) => asText(s, lang))
        }
      : null,
    warnings,
    has_writes:
      Boolean(teamPlayingStyle)
      || Object.keys(individualInstructions).length > 0
      || substitutions.length > 0
  }
}
