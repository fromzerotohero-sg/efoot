const TEAM_STYLE_ALIASES = [
  ['possesso_palla', ['possesso palla', 'possession game', 'ball possession', 'posesion']],
  ['contropiede_veloce', ['contropiede veloce', 'quick counter']],
  ['contrattacco', ['contrattacco', 'long ball counter', 'lbc']],
  ['passaggio_lungo', ['passaggio lungo', 'long ball', 'lancio lungo']],
  ['vie_laterali', ['vie laterali', 'out wide', 'wing play']],
  ['pressing_totale', [
    'pressing totale', 'pressione totale', 'overload', 'sovraccarico',
    'superioridad', 'presion total', 'total pressing'
  ]]
]

const INSTRUCTION_SLOTS = new Set(['attacco_1', 'attacco_2', 'difesa_1', 'difesa_2'])

function normalizeText(value = '') {
  return String(value || '').toLowerCase().normalize('NFD')
    .replace(/\p{Diacritic}/gu, '').replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ').trim()
}

function canonicalizeTeamPlayingStyleId(value) {
  const normalized = normalizeText(value)
  if (!normalized) return null
  for (const [id, aliases] of TEAM_STYLE_ALIASES) {
    if (normalized === id.replace(/_/g, ' ')) return id
    const matches = aliases.map(normalizeText)
      .filter((alias) => alias.length >= 5 || alias === id.replace(/_/g, ' '))
    if (matches.some((alias) => normalized === alias || normalized.includes(alias))) return id
  }
  return null
}

function asText(value, lang = 'it') {
  if (value == null) return ''
  if (typeof value === 'string') return value.trim()
  if (typeof value === 'object') {
    return String(value[lang] || value.it || value.en || value.es || '').trim()
  }
  return String(value).trim()
}

function normalizeInstructionId(raw, lang = 'it') {
  const text = normalizeText(asText(raw, lang))
  if (!text) return null
  if ([
    'ancoraggio', 'difensivo', 'marcatura stretta', 'marcatura uomo', 'contropiede'
  ].includes(text)) return text.replace(/ /g, '_')

  const aliases = [
    [/ancoragg|anchoring|anclaje/, 'ancoraggio'],
    [/difensiv|defensive/, 'difensivo'],
    [/marcatura.?stretta|tight.?mark/, 'marcatura_stretta'],
    [/marcatura.?uomo|man.?mark/, 'marcatura_uomo'],
    [/contropiede|counter.?target|obiettivo/, 'contropiede']
  ]
  return aliases.find(([pattern]) => pattern.test(text))?.[1] || null
}

export function buildPrematchChangeSet(countermeasuresRoot, options = {}) {
  const lang = options.lang === 'en' || options.lang === 'es' ? options.lang : 'it'
  const root = countermeasuresRoot?.countermeasures || countermeasuresRoot || {}
  const countermeasures = root.countermeasures || root
  const playSummary = root.play_summary || countermeasuresRoot?.play_summary || null
  const analysis = root.analysis || countermeasuresRoot?.analysis || null

  let teamPlayingStyle = null
  const tactical = Array.isArray(countermeasures.tactical_adjustments)
    ? countermeasures.tactical_adjustments
    : []
  for (const adjustment of tactical) {
    if (adjustment?.type !== 'team_playing_style' &&
        adjustment?.type !== 'playing_style_change') continue
    const id = canonicalizeTeamPlayingStyleId(asText(adjustment.suggestion, lang)) ||
      canonicalizeTeamPlayingStyleId(asText(adjustment.application_hint, lang))
    if (id) {
      teamPlayingStyle = id
      break
    }
  }

  const individualInstructions = {}
  const instructions = Array.isArray(countermeasures.individual_instructions)
    ? countermeasures.individual_instructions
    : []
  for (const row of instructions) {
    const slot = String(row?.slot || '').trim()
    if (!INSTRUCTION_SLOTS.has(slot)) continue
    const instruction = normalizeInstructionId(row?.instruction, lang)
    if (!row?.player_id || !instruction) continue
    individualInstructions[slot] = {
      player_id: row.player_id,
      instruction,
      enabled: true,
      player_name: row.player_name || null,
      position: row.position || null
    }
  }

  const substitutions = []
  const players = Array.isArray(countermeasures.player_suggestions)
    ? countermeasures.player_suggestions
    : []
  for (const suggestion of players) {
    if (!suggestion?.player_id || !suggestion?.replace_player_id) continue
    if (suggestion.action && suggestion.action !== 'add_to_starting_xi') continue
    substitutions.push({
      in_player_id: suggestion.player_id,
      in_player_name: suggestion.player_name || null,
      out_player_id: suggestion.replace_player_id,
      out_player_name: suggestion.replace_player_name || null,
      position: suggestion.position || suggestion.slot_role || suggestion.replace_position || null,
      reason: asText(suggestion.reason, lang),
      priority: suggestion.priority || 'medium'
    })
  }

  const customer = root.customer_plan || countermeasuresRoot?.customer_plan || null
  const rawStartingPlan = root.starting_plan || customer?.starting_plan
  const startingPlan = Array.isArray(rawStartingPlan)
    ? rawStartingPlan.map((step) => asText(step, lang)).filter(Boolean).slice(0, 3)
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
          strengths: (analysis.strengths || []).slice(0, 1).map((item) => asText(item, lang)),
          weaknesses: (analysis.weaknesses || []).slice(0, 1).map((item) => asText(item, lang))
        }
      : null,
    warnings: [],
    has_writes: Boolean(teamPlayingStyle) ||
      Object.keys(individualInstructions).length > 0 ||
      substitutions.length > 0
  }
}
